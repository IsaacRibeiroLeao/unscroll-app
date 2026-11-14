// Android implementation of IScreenBlockerService.
// Native work (UsageStats polling, overlay, balance ledger) lives in modules/screen-blocker and keeps
// running with the JS runtime dead. This class only talks to it through AndroidNativePort, so it
// has no native imports and can be unit-tested in Node.
// NOTE: relative imports use explicit .ts extensions so Node can run the tests directly.

import type {
  BlockedApp,
  BlockScreenInfo,
  IScreenBlockerService,
  PermissionKey,
  PermissionStatus,
  PickAppsResult,
  Unsubscribe,
  UsageReport,
} from '../../../application/ports/IScreenBlockerService.ts';
import { ScreenBlockerError } from '../../../application/ports/IScreenBlockerService.ts';

export interface AndroidInstalledApp {
  packageName: string;
  label: string;
  iconBase64: string;
}

export interface AndroidPermissionFlags {
  usageAccess: boolean;
  overlay: boolean;
  notifications: boolean;
  batteryOptimizationIgnored: boolean;
}

export type AndroidSettingsTarget = 'usageAccess' | 'overlay' | 'notifications' | 'batteryOptimization';

export interface AndroidNativePort {
  getPermissionStatus(): AndroidPermissionFlags;
  openSettings(target: AndroidSettingsTarget): boolean;
  getInstalledApps(): Promise<AndroidInstalledApp[]>;
  getBlockedPackages(): string[];
  setBlockedPackages(packages: string[]): void;
  getBalance(): number;
  setBalanceFromServer(seconds: number): number;
  grant(seconds: number): number;
  getUnreportedUsage(): { eventId: string; seconds: number } | null;
  markUsageReported(eventId: string): void;
  setBlockScreenInfo(info: BlockScreenInfo): void;
  startService(): boolean;
  stopService(): void;
  addBalanceListener(listener: (seconds: number) => void): { remove(): void };
  addBlockedAppListener(listener: (packageName: string) => void): { remove(): void };
}

export interface AppPickerRequest {
  apps: AndroidInstalledApp[];
  selected: string[];
}

/** Resolves with the new selection, or null when the user cancelled. */
export interface AppPickerPort {
  pick(request: AppPickerRequest): Promise<string[] | null>;
}

/** Permissions the blocker cannot work without, in the order they are requested. */
const REQUIRED: readonly (keyof AndroidPermissionFlags & PermissionKey)[] = [
  'usageAccess',
  'overlay',
  'notifications',
];

const isSettingsTarget = (key: PermissionKey): key is AndroidSettingsTarget => key !== 'screenTime';

const sanitize = (seconds: number): number =>
  Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;

export class AndroidScreenBlockerService implements IScreenBlockerService {
  private readonly deps: { native: AndroidNativePort; picker: AppPickerPort };

  constructor(deps: { native: AndroidNativePort; picker: AppPickerPort }) {
    this.deps = deps;
  }

  // ------------------------------------------------------------------ permissions
  async getPermissionStatus(): Promise<PermissionStatus> {
    const flags = this.deps.native.getPermissionStatus();
    const missing: PermissionKey[] = REQUIRED.filter((key) => !flags[key]);
    const granted = missing.length === 0;
    // Battery optimization is recommended (OEM task killers), not required: it is reported in
    // `missing` for the UI but does not affect `granted`.
    if (!flags.batteryOptimizationIgnored) missing.push('batteryOptimization');
    return { state: granted ? 'granted' : 'denied', granted, missing };
  }

  /**
   * Android permissions are granted in system Settings screens, one at a time. This opens the next
   * missing one and returns the CURRENT status; call it again (e.g. when the app returns to the
   * foreground) to move to the following one.
   */
  async requestPermissions(): Promise<PermissionStatus> {
    const status = await this.getPermissionStatus();
    const next = status.missing.find(isSettingsTarget);
    if (next) {
      const opened = this.deps.native.openSettings(next);
      if (!opened) {
        throw new ScreenBlockerError('NATIVE_FAILURE', `could not open settings for ${next}`);
      }
    }
    return status;
  }

  // ------------------------------------------------------------------ app selection
  async pickApps(): Promise<PickAppsResult> {
    const { native, picker } = this.deps;
    const apps = await native.getInstalledApps();
    const selected = native.getBlockedPackages();
    const result = await picker.pick({ apps, selected });
    if (result === null) return { selectedCount: selected.length, unchanged: true };

    const installed = new Set(apps.map((a) => a.packageName));
    const next = [...new Set(result)].filter((p) => installed.has(p)).sort();
    const unchanged = next.length === selected.length && next.every((p) => selected.includes(p));
    if (!unchanged) native.setBlockedPackages(next);
    return { selectedCount: next.length, unchanged };
  }

  async getSelectedAppsCount(): Promise<number> {
    return this.deps.native.getBlockedPackages().length;
  }

  async listBlockedApps(): Promise<BlockedApp[]> {
    const { native } = this.deps;
    const blocked = new Set(native.getBlockedPackages());
    if (blocked.size === 0) return [];
    const apps = await native.getInstalledApps();
    return apps
      .filter((a) => blocked.has(a.packageName))
      .map((a) => ({ id: a.packageName, label: a.label, iconBase64: a.iconBase64 || null }));
  }

  async setAppBlocked(id: string, blocked: boolean): Promise<number> {
    const { native } = this.deps;
    const current = new Set(native.getBlockedPackages());
    if (blocked) current.add(id);
    else current.delete(id);
    const next = [...current].sort();
    native.setBlockedPackages(next);
    return next.length;
  }

  // ------------------------------------------------------------------ balance
  async syncBalance(seconds: number): Promise<void> {
    // Native subtracts usage not yet reported, so the server value stays authoritative.
    this.deps.native.setBalanceFromServer(sanitize(seconds));
    this.ensureServiceIfPossible();
  }

  async grantTime(seconds: number): Promise<void> {
    this.deps.native.grant(sanitize(seconds));
    this.ensureServiceIfPossible();
  }

  async getBalanceSeconds(): Promise<number> {
    return this.deps.native.getBalance();
  }

  // ------------------------------------------------------------------ enforcement
  async blockNow(): Promise<void> {
    await this.requireSelection();
    this.deps.native.setBalanceFromServer(0);
    this.startOrThrow();
  }

  async startMonitoring(): Promise<void> {
    const status = await this.getPermissionStatus();
    if (!status.granted) {
      throw new ScreenBlockerError('NOT_AUTHORIZED', `missing: ${status.missing.join(',')}`);
    }
    await this.requireSelection();
    this.startOrThrow();
  }

  async stopMonitoring(): Promise<void> {
    this.deps.native.stopService();
  }

  // ------------------------------------------------------------------ usage
  async getUnreportedUsage(): Promise<UsageReport[]> {
    const usage = this.deps.native.getUnreportedUsage();
    return usage && usage.seconds > 0 ? [{ eventId: usage.eventId, seconds: usage.seconds }] : [];
  }

  async markUsageReported(eventId: string): Promise<void> {
    this.deps.native.markUsageReported(eventId);
  }

  // ------------------------------------------------------------------ block screen + events
  async setBlockScreenInfo(info: BlockScreenInfo): Promise<void> {
    this.deps.native.setBlockScreenInfo(info);
  }

  onBlockedAppOpened(listener: () => void): Unsubscribe {
    const sub = this.deps.native.addBlockedAppListener(() => listener());
    return () => sub.remove();
  }

  onBalanceChanged(listener: (seconds: number) => void): Unsubscribe {
    const sub = this.deps.native.addBalanceListener(listener);
    return () => sub.remove();
  }

  // ------------------------------------------------------------------ helpers
  private async requireSelection(): Promise<void> {
    if (this.deps.native.getBlockedPackages().length === 0) {
      throw new ScreenBlockerError('NO_SELECTION');
    }
  }

  private startOrThrow(): void {
    if (!this.deps.native.startService()) {
      throw new ScreenBlockerError(
        'NATIVE_FAILURE',
        'foreground service refused to start (app must be in the foreground)',
      );
    }
  }

  /** Best effort: used after balance changes, when the app may be in the background. */
  private ensureServiceIfPossible(): void {
    const { native } = this.deps;
    if (native.getBlockedPackages().length === 0) return;
    const flags = native.getPermissionStatus();
    if (!flags.usageAccess || !flags.overlay) return;
    native.startService();
  }
}
