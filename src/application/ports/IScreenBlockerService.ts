// Platform-independent contract for system-level app blocking.
// iOS: FamilyControls / ManagedSettings / DeviceActivity.  Android: UsageStats + overlay (Phase 4B).
// No React Native or native imports are allowed in this file.

export type PermissionState = 'granted' | 'denied' | 'undetermined' | 'unsupported';

/** Permissions the blocker may need. iOS only uses `screenTime`. */
export type PermissionKey =
  'screenTime' | 'usageAccess' | 'overlay' | 'notifications' | 'batteryOptimization';

export interface PermissionStatus {
  state: PermissionState;
  granted: boolean;
  missing: PermissionKey[];
}

export interface PickAppsResult {
  /** Number of selected apps + categories + web domains. */
  selectedCount: number;
  /** True when the user did not change the selection (cancelled / unsupported). */
  unchanged: boolean;
}

/** Usage consumed natively (app killed or alive) that the server has not been told about yet. */
export interface UsageReport {
  /** Stable id, used as `client_event_id` so retries are idempotent on the server. */
  eventId: string;
  seconds: number;
}

export type Unsubscribe = () => void;

export type ScreenBlockerErrorCode =
  'NOT_AUTHORIZED' | 'NO_SELECTION' | 'UNSUPPORTED' | 'NATIVE_FAILURE';

export class ScreenBlockerError extends Error {
  readonly code: ScreenBlockerErrorCode;
  constructor(code: ScreenBlockerErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'ScreenBlockerError';
    this.code = code;
  }
}

export interface IScreenBlockerService {
  getPermissionStatus(): Promise<PermissionStatus>;
  requestPermissions(): Promise<PermissionStatus>;

  /** Opens the native app picker and persists the selection. */
  pickApps(): Promise<PickAppsResult>;
  getSelectedAppsCount(): Promise<number>;

  /**
   * Makes `seconds` the authoritative balance: > 0 unblocks and arms native consumption,
   * <= 0 blocks. Call it with the SERVER balance, after reporting pending usage.
   */
  syncBalance(seconds: number): Promise<void>;
  /** Adds `seconds` to the local balance (capped) and unblocks. */
  grantTime(seconds: number): Promise<void>;
  /** Balance as known locally (derived from native usage events). */
  getBalanceSeconds(): Promise<number>;

  /** Applies the block immediately and disarms consumption. */
  blockNow(): Promise<void>;
  /** Re-arms enforcement from persisted state (call on app start). Fails closed. */
  startMonitoring(): Promise<void>;
  /** Disables enforcement completely (unblocks). Pending usage is kept for reporting. */
  stopMonitoring(): Promise<void>;

  /** Usage consumed since the last report. */
  getUnreportedUsage(): Promise<UsageReport[]>;
  markUsageReported(eventId: string): Promise<void>;

  /** Fires when a blocked app is opened (best effort; not available on iOS). */
  onBlockedAppOpened(listener: () => void): Unsubscribe;
  /** Fires when the local balance changes (JS alive only). */
  onBalanceChanged(listener: (seconds: number) => void): Unsubscribe;
}
