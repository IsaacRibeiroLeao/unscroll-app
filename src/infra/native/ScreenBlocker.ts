// Single import point for blocker types + the platform implementation.
// Metro picks ScreenBlocker.ios.ts / ScreenBlocker.android.ts at build time; this file is the
// fallback (web, or a platform without an implementation yet) and what TypeScript resolves.
import {
  ScreenBlockerError,
  type IScreenBlockerService,
  type PermissionStatus,
} from '../../application/ports/IScreenBlockerService';

export { ScreenBlockerError };
export type {
  IScreenBlockerService,
  PermissionKey,
  PermissionState,
  PermissionStatus,
  PickAppsResult,
  ScreenBlockerErrorCode,
  BlockScreenInfo,
  Unsubscribe,
  UsageReport,
} from '../../application/ports/IScreenBlockerService';

const unsupported: PermissionStatus = { state: 'unsupported', granted: false, missing: [] };

export function createPlatformScreenBlocker(): IScreenBlockerService {
  const fail = (): never => {
    throw new ScreenBlockerError(
      'UNSUPPORTED',
      'Screen blocking is not supported on this platform',
    );
  };
  return {
    getPermissionStatus: async () => unsupported,
    requestPermissions: async () => unsupported,
    pickApps: async () => ({ selectedCount: 0, unchanged: true }),
    getSelectedAppsCount: async () => 0,
    syncBalance: async () => {},
    grantTime: async () => {},
    getBalanceSeconds: async () => 0,
    blockNow: async () => fail(),
    startMonitoring: async () => {},
    stopMonitoring: async () => {},
    getUnreportedUsage: async () => [],
    markUsageReported: async () => {},
    setBlockScreenInfo: async () => {},
    onBlockedAppOpened: () => () => {},
    onBalanceChanged: () => () => {},
  };
}
