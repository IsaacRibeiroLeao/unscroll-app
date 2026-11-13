// Wires AndroidScreenBlockerService to the local Expo module (modules/screen-blocker).
import ScreenBlockerModule from '../../../modules/screen-blocker';
import { AndroidScreenBlockerService } from './android/AndroidScreenBlockerService';
import type { AndroidNativePort } from './android/AndroidScreenBlockerService';
import { appPickerBridge } from './android/appPickerBridge';
import type { IScreenBlockerService } from '../../application/ports/IScreenBlockerService';

export {
  ScreenBlockerError,
  type BlockScreenInfo,
  type IScreenBlockerService,
  type PermissionKey,
  type PermissionState,
  type PermissionStatus,
  type PickAppsResult,
  type ScreenBlockerErrorCode,
  type Unsubscribe,
  type UsageReport,
} from '../../application/ports/IScreenBlockerService';

const native: AndroidNativePort = {
  getPermissionStatus: () => ScreenBlockerModule.getPermissionStatus(),
  openSettings: (target) => ScreenBlockerModule.openSettings(target),
  getInstalledApps: () => ScreenBlockerModule.getInstalledApps(),
  getBlockedPackages: () => ScreenBlockerModule.getBlockedPackages(),
  setBlockedPackages: (packages) => ScreenBlockerModule.setBlockedPackages(packages),
  getBalance: () => ScreenBlockerModule.getBalance(),
  setBalanceFromServer: (seconds) => ScreenBlockerModule.setBalanceFromServer(seconds),
  grant: (seconds) => ScreenBlockerModule.grant(seconds),
  getUnreportedUsage: () => ScreenBlockerModule.getUnreportedUsage(),
  markUsageReported: (eventId) => ScreenBlockerModule.markUsageReported(eventId),
  setBlockScreenInfo: (info) => ScreenBlockerModule.setBlockScreenInfo(info),
  startService: () => ScreenBlockerModule.startService(),
  stopService: () => ScreenBlockerModule.stopService(),
  addBalanceListener: (listener) =>
    ScreenBlockerModule.addListener('onBalanceChanged', (e) => listener(e.seconds)),
  addBlockedAppListener: (listener) =>
    ScreenBlockerModule.addListener('onBlockedAppOpened', (e) => listener(e.packageName)),
};

export function createPlatformScreenBlocker(): IScreenBlockerService {
  return new AndroidScreenBlockerService({ native, picker: appPickerBridge });
}
