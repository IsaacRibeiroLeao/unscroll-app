import { BackendError } from './ports/IBackendApi.ts';
import type { BackendErrorCode, ProofCode } from './ports/IBackendApi.ts';

export interface ErrorTexts {
  errors: Record<BackendErrorCode, string>;
  proof: Record<Exclude<ProofCode, 'APPROVED'>, string>;
}

/** Maps any thrown value to a user-facing pt-BR message (never leaks raw server text). */
export function errorMessage(error: unknown, texts: ErrorTexts): string {
  if (error instanceof BackendError) return texts.errors[error.code];
  return texts.errors.UNKNOWN;
}

/**
 * Server feedback for a rejected photo is Gemini-written and may be long; the app shows the fixed
 * message for the code and only appends the server feedback when it is short and non-empty.
 */
export function proofMessage(
  code: Exclude<ProofCode, 'APPROVED'>,
  feedback: string,
  texts: ErrorTexts,
): string {
  const base = texts.proof[code];
  const extra = feedback.trim();
  return code === 'REJECTED' && extra.length > 0 && extra.length <= 160 ? `${base} ${extra}` : base;
}
