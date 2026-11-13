import { reconcileScreenTime } from './reconcileScreenTime.ts';
import type { IBackendApi, Profile } from './ports/IBackendApi.ts';
import type { IScreenBlockerService } from './ports/IScreenBlockerService.ts';
import type { IScreenTimeApi } from './ports/IScreenTimeApi.ts';

export interface SyncResult {
  profile: Profile;
  /** Usage report failed (offline?). The profile is still fetched; native keeps the pending usage. */
  reportError: unknown | null;
  /** The blocker could not be updated (permissions revoked, service refused...). */
  blockerError: unknown | null;
}

/**
 * App-foreground routine: report native usage -> read the server profile -> push the server
 * balance to the blocker. Order matters: reporting first keeps the server balance authoritative.
 */
export async function syncScreenTime(deps: {
  blocker: IScreenBlockerService;
  screenTimeApi: IScreenTimeApi;
  backend: Pick<IBackendApi, 'getProfile'>;
  userId: string;
}): Promise<SyncResult> {
  const report = await reconcileScreenTime({
    blocker: deps.blocker,
    api: deps.screenTimeApi,
    userId: deps.userId,
  });
  const profile = await deps.backend.getProfile();
  let blockerError: unknown | null = null;
  // If the report failed, do NOT overwrite the native balance with a stale server value:
  // the pending usage would be lost from the local ledger view.
  if (report.ok) {
    try {
      await deps.blocker.syncBalance(profile.balanceSeconds);
    } catch (e) {
      blockerError = e;
    }
  }
  return { profile, reportError: report.ok ? null : report.error, blockerError };
}
