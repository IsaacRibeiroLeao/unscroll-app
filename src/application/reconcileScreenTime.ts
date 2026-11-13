import type { IScreenBlockerService } from './ports/IScreenBlockerService.ts';
import type { IScreenTimeApi } from './ports/IScreenTimeApi.ts';

export type ReconcileResult =
  | { ok: true; reported: number; serverBalanceSeconds: number | null }
  | { ok: false; reported: number; error: unknown };

/**
 * Reports natively consumed usage to the server (idempotent by eventId) and marks it as reported.
 * Run it when the app opens/foregrounds, BEFORE syncing the server balance back to the blocker.
 * `serverBalanceSeconds` is null when there was nothing to report (fetch the profile instead).
 */
export async function reconcileScreenTime(deps: {
  blocker: Pick<IScreenBlockerService, 'getUnreportedUsage' | 'markUsageReported'>;
  api: IScreenTimeApi;
  userId: string;
}): Promise<ReconcileResult> {
  const reports = await deps.blocker.getUnreportedUsage();
  let reported = 0;
  let serverBalanceSeconds: number | null = null;
  for (const r of reports) {
    try {
      const res = await deps.api.consumeScreenTime(deps.userId, r.seconds, r.eventId);
      await deps.blocker.markUsageReported(r.eventId);
      serverBalanceSeconds = res.newBalanceSeconds;
      reported += 1;
    } catch (error) {
      return { ok: false, reported, error };
    }
  }
  return { ok: true, reported, serverBalanceSeconds };
}
