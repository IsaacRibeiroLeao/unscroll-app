export interface InstalledApp {
  packageName: string;
  label: string;
  /** Base64 PNG (72px), without the data: prefix. */
  iconBase64: string;
}

export type SettingsTarget = 'usageAccess' | 'overlay' | 'notifications' | 'batteryOptimization';

export interface NativePermissionStatus {
  usageAccess: boolean;
  overlay: boolean;
  notifications: boolean;
  batteryOptimizationIgnored: boolean;
}

export interface NativeUsage {
  eventId: string;
  seconds: number;
}

export interface NativeBlockScreenInfo {
  title: string;
  subtitle: string;
  primaryLabel: string;
  secondaryLabel: string;
  streakLabel: string;
  streakDays: number;
  mascotSkin: string;
  deepLink: string;
  notificationTitle: string;
  notificationText: string;
}

export type ScreenBlockerEvents = {
  onBalanceChanged: (event: { seconds: number }) => void;
  onBlockedAppOpened: (event: { packageName: string }) => void;
};
