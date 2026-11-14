import type { ResultCode, TaskCategory, TextProof, VerifyResponse } from './types.ts';

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
export const MAX_FAILED_ATTEMPTS_PER_TASK_DAY = 5;
export const MIN_CONFIDENCE = 0.7;
export const STALE_LOCK_MS = 2 * 60 * 1000;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FILE_RE = /^[A-Za-z0-9._-]{1,100}$/;

export interface ParsedRequest {
  taskId: string;
  /** Object path inside the private `proofs` bucket: `{uid}/{file}` */
  imagePath: string;
}

/**
 * Accepts `{uid}/{file}` or `proofs/{uid}/{file}`. The folder MUST be the caller's uid.
 * Returns an error code instead of throwing so the handler can map it to HTTP.
 */
export function parseRequest(
  body: unknown,
  uid: string,
):
  | { ok: true; value: ParsedRequest }
  | {
      ok: false;
      code: 'INVALID_REQUEST' | 'FORBIDDEN_PATH';
    } {
  if (typeof body !== 'object' || body === null) {
    return { ok: false, code: 'INVALID_REQUEST' };
  }
  const { taskId, imagePath } = body as Record<string, unknown>;
  if (typeof taskId !== 'string' || !UUID_RE.test(taskId)) {
    return { ok: false, code: 'INVALID_REQUEST' };
  }
  if (typeof imagePath !== 'string' || imagePath.length > 200) {
    return { ok: false, code: 'INVALID_REQUEST' };
  }

  const stripped = imagePath.startsWith('proofs/') ? imagePath.slice('proofs/'.length) : imagePath;
  const parts = stripped.split('/');
  if (parts.length !== 2) return { ok: false, code: 'FORBIDDEN_PATH' };
  const [folder, file] = parts as [string, string];
  if (
    folder.toLowerCase() !== uid.toLowerCase() ||
    !FILE_RE.test(file) ||
    file === '.' ||
    file === '..'
  ) {
    return { ok: false, code: 'FORBIDDEN_PATH' };
  }
  return {
    ok: true,
    value: { taskId: taskId.toLowerCase(), imagePath: `${folder}/${file}` },
  };
}

/** YYYY-MM-DD of `now` in the user's timezone (never UTC unless that is the user's zone). */
export function localDateIn(timeZone: string, now: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function dailyLimit(isPro: boolean): number {
  return isPro ? 5 : 1;
}

export function isJpeg(bytes: Uint8Array): boolean {
  return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes as BufferSource);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

export function sanitizeFeedback(text: string, fallback: string): string {
  // deno-lint-ignore no-control-regex
  const cleaned = text
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (cleaned.length === 0) return fallback;
  return cleaned.length > 220 ? `${cleaned.slice(0, 217)}...` : cleaned;
}

export type ModelVerdict = 'APPROVED' | 'REJECTED' | 'LOW_QUALITY';

export function decide(r: {
  approved: boolean;
  confidence: number;
  qualityOk: boolean;
}): ModelVerdict {
  if (!r.qualityOk) return 'LOW_QUALITY';
  if (r.approved && r.confidence >= MIN_CONFIDENCE) return 'APPROVED';
  return 'REJECTED';
}

export const MESSAGES: Record<Exclude<ResultCode, 'APPROVED'>, string> = {
  REJECTED: 'Não consegui ver a tarefa na foto. Tente mostrar o resultado com mais clareza.',
  LOW_QUALITY: 'A foto ficou escura ou borrada. Tente de novo com mais luz e foco.',
  AI_UNAVAILABLE:
    'Nosso avaliador está fora do ar agora. Tente de novo em instantes, sem perder nada.',
  DAILY_LIMIT: 'Você já atingiu o limite de recompensas de hoje. Volte amanhã!',
  ALREADY_COMPLETED: 'Essa tarefa já foi concluída hoje.',
};

export function outcome(
  code: ResultCode,
  confidence: number,
  feedback: string,
  rewards: VerifyResponse['rewards'] = null,
): VerifyResponse {
  return { approved: code === 'APPROVED', confidence, feedback, code, rewards };
}

export function corsHeaders(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

export function json(body: unknown, status: number, origin: string): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(origin),
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}

export const TEXT_LIMITS = {
  book: { min: 2, max: 120 },
  chapter: { max: 80 },
  summary: { min: 200, max: 1500 },
  insight: { min: 20, max: 400 },
} as const;

export function proofKindFor(category: TaskCategory): 'photo' | 'text' {
  return category === 'reading' || category === 'study' ? 'text' : 'photo';
}

const clean = (v: unknown): string => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '');

/** Text proof request: `{ taskId, text: { book, chapter?, summary, insight } }`. */
export function parseTextRequest(body: unknown):
  | { ok: true; value: { taskId: string; text: TextProof } }
  | {
      ok: false;
      code: 'INVALID_REQUEST';
    } {
  const bad = { ok: false, code: 'INVALID_REQUEST' } as const;
  if (typeof body !== 'object' || body === null) return bad;
  const { taskId, text } = body as Record<string, unknown>;
  if (typeof taskId !== 'string' || !UUID_RE.test(taskId)) return bad;
  if (typeof text !== 'object' || text === null) return bad;
  const t = text as Record<string, unknown>;
  const book = clean(t.book);
  const chapter = clean(t.chapter);
  const summary = clean(t.summary);
  const insight = clean(t.insight);
  const L = TEXT_LIMITS;
  if (book.length < L.book.min || book.length > L.book.max) return bad;
  if (chapter.length > L.chapter.max) return bad;
  if (summary.length < L.summary.min || summary.length > L.summary.max) {
    return bad;
  }
  if (insight.length < L.insight.min || insight.length > L.insight.max) {
    return bad;
  }
  return {
    ok: true,
    value: {
      taskId: taskId.toLowerCase(),
      text: { book, chapter: chapter || null, summary, insight },
    },
  };
}

/** Same book + chapter can only ever be rewarded once per user. */
export async function textProofHash(proof: TextProof): Promise<string> {
  const key = `${proof.book}|${proof.chapter ?? ''}`.toLowerCase().normalize('NFKD');
  return sha256Hex(new TextEncoder().encode(`text:${key}`));
}
