import { TEXT_PROOF_LIMITS } from './ports/IBackendApi.ts';
import type { TextProof } from './ports/IBackendApi.ts';

export interface TextProofDraft {
  book: string;
  chapter: string;
  summary: string;
  insight: string;
}

/** Client-side mirror of the server limits, only to enable the button (the server decides). */
export function isTextProofValid(d: TextProofDraft): boolean {
  const L = TEXT_PROOF_LIMITS;
  return (
    d.book.trim().length >= L.book.min &&
    d.chapter.trim().length <= L.chapter.max &&
    d.summary.trim().length >= L.summary.min &&
    d.insight.trim().length >= L.insight.min
  );
}

export function toTextProof(d: TextProofDraft): TextProof {
  return {
    book: d.book.trim(),
    chapter: d.chapter.trim() || undefined,
    summary: d.summary.trim(),
    insight: d.insight.trim(),
  };
}
