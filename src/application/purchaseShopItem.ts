import type { IBackendApi, PurchaseResult } from './ports/IBackendApi.ts';
import type { IScreenBlockerService } from './ports/IScreenBlockerService.ts';

/** Buys an item with gems; a free pass changes the balance, so the blocker is re-synced. */
export async function purchaseShopItem(deps: {
  backend: Pick<IBackendApi, 'purchaseItem'>;
  blocker: Pick<IScreenBlockerService, 'syncBalance'>;
  sku: string;
  previousBalanceSeconds: number;
}): Promise<{ result: PurchaseResult; blockerError: unknown | null }> {
  const result = await deps.backend.purchaseItem(deps.sku);
  let blockerError: unknown | null = null;
  if (result.newBalanceSeconds !== deps.previousBalanceSeconds) {
    try {
      await deps.blocker.syncBalance(result.newBalanceSeconds);
    } catch (e) {
      blockerError = e;
    }
  }
  return { result, blockerError };
}
