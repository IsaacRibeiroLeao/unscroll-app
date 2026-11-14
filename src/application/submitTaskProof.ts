import type { IBackendApi, ProofOutcome, TextProof } from './ports/IBackendApi.ts';
import type { IScreenBlockerService } from './ports/IScreenBlockerService.ts';

export interface SubmitProofResult {
  outcome: ProofOutcome;
  /** Set when approved but the native balance could not be updated (the server already has it). */
  blockerError: unknown | null;
}

/** Sends the proof (photo or text) for verification; on approval pushes the new server balance. */
export async function submitTaskProof(deps: {
  backend: Pick<IBackendApi, 'verifyTaskProof' | 'verifyTextProof'>;
  blocker: Pick<IScreenBlockerService, 'syncBalance'>;
  taskId: string;
  photoUri?: string;
  text?: TextProof;
}): Promise<SubmitProofResult> {
  const outcome = deps.text
    ? await deps.backend.verifyTextProof(deps.taskId, deps.text)
    : await deps.backend.verifyTaskProof(deps.taskId, deps.photoUri ?? '');
  let blockerError: unknown | null = null;
  if (outcome.approved && outcome.rewards) {
    try {
      await deps.blocker.syncBalance(outcome.rewards.newBalanceSeconds);
    } catch (e) {
      blockerError = e;
    }
  }
  return { outcome, blockerError };
}
