import { NativeModule, requireNativeModule } from 'expo';
import type {
  InstalledApp,
  NativeBlockScreenInfo,
  NativePermissionStatus,
  NativeUsage,
  ScreenBlockerEvents,
  SettingsTarget,
} from './ScreenBlocker.types';

declare class ScreenBlockerModule extends NativeModule<ScreenBlockerEvents> {
  getPermissionStatus(): NativePermissionStatus;
  openSettings(target: SettingsTarget): boolean;
  getInstalledApps(): Promise<InstalledApp[]>;
  getBlockedPackages(): string[];
  setBlockedPackages(packages: string[]): void;
  getBalance(): number;
  setBalanceFromServer(seconds: number): number;
  grant(seconds: number): number;
  getUnreportedUsage(): NativeUsage | null;
  markUsageReported(eventId: string): void;
  setBlockScreenInfo(info: NativeBlockScreenInfo): void;
  startService(): boolean;
  stopService(): void;
  isServiceRunning(): boolean;
}

// Android-only module (expo-module.config.json). Import it only from *.android.ts files.
export default requireNativeModule<ScreenBlockerModule>('ScreenBlocker');
