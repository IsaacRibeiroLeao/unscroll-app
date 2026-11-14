// iOS implementation of IScreenBlockerService.
// All native access goes through DeviceActivityPort (wired to react-native-device-activity in
// ScreenBlocker.ios.ts), so this class has no native imports and can be unit-tested in Node.
// NOTE: relative imports use explicit .ts extensions so Node can run the tests directly.

import type {
  IScreenBlockerService,
  PermissionStatus,
  PickAppsResult,
  Unsubscribe,
  UsageReport,
} from '../../../application/ports/IScreenBlockerService.ts';
import { ScreenBlockerError } from '../../../application/ports/IScreenBlockerService.ts';
import {
  buildUsagePlan,
  clampBalance,
  consumedSeconds,
  intervalEnded,
  parseUsageEventId,
  toDateComponents,
  usageEventId,
} from './usagePlan.ts';
import type { DateComponentsLite, RecordedEvent } from './usagePlan.ts';

export const SELECTION_ID = 'unscroll-blocked-apps';
const STATE_KEY = 'unscroll.ios.state';

export type AuthStatus = 0 | 1 | 2; // notDetermined | denied | approved (library values)

export interface DeviceActivityPort {
  getAuthorizationStatus(): AuthStatus;
  requestAuthorization(): Promise<void>;
  getSelectionToken(selectionId: string): string | undefined;
  setSelection(selectionId: string, token: string): void;
  block(selectionId: string, triggeredBy: string): void;
  unblock(selectionId: string, triggeredBy: string): void;
  startMonitoring(
    activityName: string,
    schedule: { start: DateComponentsLite; end: DateComponentsLite },
    events: { eventName: string; token: string; threshold: DateComponentsLite }[],
  ): Promise<void>;
  stopMonitoring(activityNames: string[]): void;
  getActivities(): string[];
  /** Registers an action list, executed by the Monitor extension, that blocks `selectionId`. */
  configureBlockActions(p: {
    activityName: string;
    callbackName: 'eventDidReachThreshold' | 'intervalDidEnd';
    eventName?: string;
    selectionId: string;
  }): void;
  cleanUpActivity(activityName: string): void;
  getEvents(activityName?: string): RecordedEvent[];
  configureShield(): void;
  storeGet<T>(key: string): T | undefined;
  storeSet(key: string, value: unknown): void;
  onMonitorEvent(listener: (callbackName: string) => void): { remove(): void };
}

export interface PickedSelection {
  token: string | null;
  count: number;
}

export interface SelectionPickerPort {
  pick(currentToken: string | null): Promise<PickedSelection | null>;
}

export interface IosDeps {
  api: DeviceActivityPort;
  picker: SelectionPickerPort;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

interface UsageWindow {
  activityName: string;
  grantedSeconds: number;
  startedAtMs: number;
  endsAtMs: number;
  reportedSeconds: number;
}

interface PersistedState {
  window: UsageWindow | null;
  pending: UsageReport[];
  selectionCount: number;
}

const EMPTY_STATE: PersistedState = { window: null, pending: [], selectionCount: 0 };

export class IosScreenBlockerService implements IScreenBlockerService {
  private readonly api: DeviceActivityPort;
  private readonly picker: SelectionPickerPort;
  private readonly now: () => number;
  private readonly sleep: (ms: number) => Promise<void>;
  private chain: Promise<unknown> = Promise.resolve();
  private readonly balanceListeners = new Set<(seconds: number) => void>();
  private monitorSub: { remove(): void } | null = null;

  constructor(deps: IosDeps) {
    this.api = deps.api;
    this.picker = deps.picker;
    this.now = deps.now ?? (() => Date.now());
    this.sleep = deps.sleep ?? ((ms) => new Promise<void>((r) => setTimeout(r, ms)));
  }

  // ------------------------------------------------------------------ permissions
  async getPermissionStatus(): Promise<PermissionStatus> {
    return this.mapStatus(this.api.getAuthorizationStatus());
  }

  async requestPermissions(): Promise<PermissionStatus> {
    try {
      await this.api.requestAuthorization(); // .individual (own device)
    } catch {
      // The library rejects when the user cancels/denies; the status below tells the story.
    }
    // The native status can lag behind the user's choice (see library README): poll briefly.
    let status = this.api.getAuthorizationStatus();
    for (let i = 0; i < 5 && status === 0; i++) {
      await this.sleep(300);
      status = this.api.getAuthorizationStatus();
    }
    return this.mapStatus(status);
  }

  private mapStatus(status: AuthStatus): PermissionStatus {
    if (status === 2) return { state: 'granted', granted: true, missing: [] };
    return {
      state: status === 1 ? 'denied' : 'undetermined',
      granted: false,
      missing: ['screenTime'],
    };
  }

  // ------------------------------------------------------------------ app selection
  async pickApps(): Promise<PickAppsResult> {
    return this.serialize(async () => {
      const state = this.load();
      const currentToken = this.token(state);
      const picked = await this.picker.pick(currentToken);
      if (!picked) return { selectedCount: state.selectionCount, unchanged: true };

      const localBalance = this.localBalance(state);
      // Release the OLD selection first (the id will point to the new token afterwards).
      if (currentToken) this.api.unblock(SELECTION_ID, 'pickApps:release-old');

      if (!picked.token || picked.count <= 0) {
        const next = this.finalize(state);
        next.selectionCount = 0;
        this.save(next);
        this.emit(0);
        return { selectedCount: 0, unchanged: false };
      }

      this.api.setSelection(SELECTION_ID, picked.token);
      this.save({ ...state, selectionCount: picked.count });
      await this.applyBalance(localBalance, 'pickApps');
      return { selectedCount: picked.count, unchanged: false };
    });
  }

  async getSelectedAppsCount(): Promise<number> {
    const state = this.load();
    return this.token(state) ? state.selectionCount : 0;
  }

  /** The FamilyControls selection is an opaque token: names and icons are not readable. */
  async listBlockedApps(): Promise<never[]> {
    return [];
  }

  async setAppBlocked(): Promise<number> {
    throw new ScreenBlockerError('UNSUPPORTED', 'iOS apps are chosen in the system picker');
  }

  // ------------------------------------------------------------------ balance
  async syncBalance(seconds: number): Promise<void> {
    return this.serialize(() => this.applyBalance(seconds, 'syncBalance'));
  }

  async grantTime(seconds: number): Promise<void> {
    return this.serialize(() => {
      const add = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
      return this.applyBalance(this.localBalance(this.load()) + add, 'grantTime');
    });
  }

  async getBalanceSeconds(): Promise<number> {
    return this.localBalance(this.load());
  }

  async blockNow(): Promise<void> {
    return this.serialize(async () => {
      const state = this.finalize(this.load());
      this.save(state);
      if (this.token(state)) this.requireAuthorized();
      if (this.token(state)) this.api.block(SELECTION_ID, 'blockNow');
      this.emit(0);
    });
  }

  // ------------------------------------------------------------------ enforcement lifecycle
  async startMonitoring(): Promise<void> {
    return this.serialize(async () => {
      const state = this.load();
      if (!this.token(state)) return; // nothing selected, nothing to enforce
      this.requireAuthorized();
      this.api.configureShield();

      const w = state.window;
      if (w) {
        const balance = this.localBalance(state);
        if (balance > 0) {
          if (!this.api.getActivities().includes(w.activityName)) {
            await this.applyBalance(balance, 'startMonitoring:rearm'); // monitor was lost
          } else {
            this.ensureListening();
            this.emit(balance);
          }
          return;
        }
      }
      // No valid window (never granted, exhausted, interval ended): fail closed.
      const next = this.finalize(state);
      this.save(next);
      this.api.block(SELECTION_ID, 'startMonitoring:fail-closed');
      this.emit(0);
    });
  }

  async stopMonitoring(): Promise<void> {
    return this.serialize(async () => {
      const state = this.finalize(this.load());
      this.save(state);
      if (this.token(state)) this.api.unblock(SELECTION_ID, 'stopMonitoring');
      this.emit(0);
    });
  }

  // ------------------------------------------------------------------ usage reporting
  async getUnreportedUsage(): Promise<UsageReport[]> {
    const state = this.load();
    const out = [...state.pending];
    const w = state.window;
    if (w) {
      const consumed = this.consumed(w);
      if (consumed > w.reportedSeconds) {
        out.push({
          eventId: usageEventId(w.activityName, consumed),
          seconds: consumed - w.reportedSeconds,
        });
      }
    }
    return out;
  }

  async markUsageReported(eventId: string): Promise<void> {
    return this.serialize(async () => {
      const state = this.load();
      const pending = state.pending.filter((p) => p.eventId !== eventId);
      let window = state.window;
      const parsed = parseUsageEventId(eventId);
      if (window && parsed && parsed.activityName === window.activityName) {
        window = {
          ...window,
          reportedSeconds: Math.max(window.reportedSeconds, parsed.cumulativeSeconds),
        };
      }
      this.save({ ...state, pending, window });
    });
  }

  // ------------------------------------------------------------------ listeners
  async setBlockScreenInfo(): Promise<void> {
    // The iOS Shield is configured once through configureShield(); nothing to update.
  }

  onBlockedAppOpened(_listener: () => void): Unsubscribe {
    // TODO(verificar): the ShieldAction extension cannot call into JS. The library's `openApp`
    // action opens a hardcoded `device-activity://` URL, so the shield instead sends a local
    // notification (see ScreenBlocker.ios.ts). Wire notification-tap -> this event in Phase 5.
    return () => {};
  }

  onBalanceChanged(listener: (seconds: number) => void): Unsubscribe {
    this.balanceListeners.add(listener);
    this.ensureListening();
    return () => {
      this.balanceListeners.delete(listener);
      if (this.balanceListeners.size === 0 && this.monitorSub) {
        this.monitorSub.remove();
        this.monitorSub = null;
      }
    };
  }

  // ------------------------------------------------------------------ internals
  private ensureListening(): void {
    if (this.monitorSub || this.balanceListeners.size === 0) return;
    this.monitorSub = this.api.onMonitorEvent((callbackName) => {
      if (callbackName === 'eventDidReachThreshold' || callbackName === 'intervalDidEnd') {
        this.emit(this.localBalance(this.load()));
      }
    });
  }

  private emit(seconds: number): void {
    for (const l of this.balanceListeners) l(seconds);
  }

  private serialize<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.chain.then(fn);
    this.chain = run.catch(() => undefined);
    return run;
  }

  private load(): PersistedState {
    return this.api.storeGet<PersistedState>(STATE_KEY) ?? { ...EMPTY_STATE, pending: [] };
  }

  private save(state: PersistedState): void {
    this.api.storeSet(STATE_KEY, state);
  }

  private token(state: PersistedState): string | null {
    if (state.selectionCount <= 0) return null;
    return this.api.getSelectionToken(SELECTION_ID) ?? null;
  }

  private requireAuthorized(): void {
    if (this.api.getAuthorizationStatus() !== 2) throw new ScreenBlockerError('NOT_AUTHORIZED');
  }

  private events(w: UsageWindow): RecordedEvent[] {
    return this.api.getEvents(w.activityName);
  }

  private consumed(w: UsageWindow): number {
    return consumedSeconds(this.events(w), w.activityName, w.grantedSeconds);
  }

  private localBalance(state: PersistedState): number {
    const w = state.window;
    if (!w) return 0;
    if (intervalEnded(this.events(w), w.activityName, w.endsAtMs, this.now())) return 0;
    return Math.max(0, w.grantedSeconds - this.consumed(w));
  }

  /** Closes the current window: remembers unreported usage, stops and cleans the monitor. */
  private finalize(state: PersistedState): PersistedState {
    const w = state.window;
    if (!w) return state;
    const consumed = this.consumed(w);
    const pending = [...state.pending];
    if (consumed > w.reportedSeconds) {
      pending.push({
        eventId: usageEventId(w.activityName, consumed),
        seconds: consumed - w.reportedSeconds,
      });
    }
    this.api.stopMonitoring([w.activityName]);
    this.api.cleanUpActivity(w.activityName);
    return { ...state, window: null, pending };
  }

  /**
   * Fail-closed order: close old window -> register block actions -> start monitor -> only then
   * lift the Shield. If anything before the unblock throws, the apps stay blocked.
   */
  private async applyBalance(seconds: number, reason: string): Promise<void> {
    const target = clampBalance(seconds);
    let state = this.load();
    const token = this.token(state);

    if (!token) {
      if (target > 0) throw new ScreenBlockerError('NO_SELECTION');
      state = this.finalize(state);
      this.save(state);
      this.emit(0);
      return;
    }
    this.requireAuthorized();

    state = this.finalize(state);
    this.save(state);

    if (target <= 0) {
      this.api.block(SELECTION_ID, `${reason}:zero`);
      this.emit(0);
      return;
    }

    const plan = buildUsagePlan(target, this.now());
    this.api.configureBlockActions({
      activityName: plan.activityName,
      callbackName: 'eventDidReachThreshold',
      eventName: plan.finalEventName,
      selectionId: SELECTION_ID,
    });
    this.api.configureBlockActions({
      activityName: plan.activityName,
      callbackName: 'intervalDidEnd',
      selectionId: SELECTION_ID,
    });

    try {
      await this.api.startMonitoring(
        plan.activityName,
        { start: toDateComponents(plan.startsAtMs), end: toDateComponents(plan.endsAtMs) },
        plan.events.map((e) => ({ eventName: e.eventName, token, threshold: e.threshold })),
      );
    } catch (cause) {
      this.api.block(SELECTION_ID, `${reason}:monitor-failed`);
      this.emit(0);
      throw new ScreenBlockerError(
        'NATIVE_FAILURE',
        cause instanceof Error ? cause.message : 'startMonitoring failed',
      );
    }

    this.api.unblock(SELECTION_ID, `${reason}:grant`);
    this.save({
      ...state,
      window: {
        activityName: plan.activityName,
        grantedSeconds: target,
        startedAtMs: plan.startsAtMs,
        endsAtMs: plan.endsAtMs,
        reportedSeconds: 0,
      },
    });
    this.ensureListening();
    this.emit(target);
  }
}
