import type { IBackendApi } from './ports/IBackendApi.ts';

/**
 * After a store purchase the RevenueCat webhook flips profiles.is_pro a moment later. Polls the
 * profile a few times; returns whether Pro was seen. (If not, the webhook is only delayed: the
 * next profile refresh picks it up.)
 */
export async function awaitPro(deps: {
  backend: Pick<IBackendApi, 'getProfile'>;
  sleep?: (ms: number) => Promise<void>;
  attempts?: number;
  intervalMs?: number;
}): Promise<boolean> {
  const sleep = deps.sleep ?? ((ms) => new Promise<void>((r) => setTimeout(r, ms)));
  const attempts = deps.attempts ?? 6;
  for (let i = 0; i < attempts; i += 1) {
    if ((await deps.backend.getProfile()).isPro) return true;
    if (i < attempts - 1) await sleep(deps.intervalMs ?? 2000);
  }
  return false;
}
