import {
  corsHeaders,
  dailyLimit,
  decide,
  isJpeg,
  json,
  localDateIn,
  MAX_FAILED_ATTEMPTS_PER_TASK_DAY,
  MAX_IMAGE_BYTES,
  MESSAGES,
  outcome,
  parseRequest,
  parseTextRequest,
  proofKindFor,
  sanitizeFeedback,
  sha256Hex,
  STALE_LOCK_MS,
  textProofHash,
} from './logic.ts';
import type { Deps, ResultCode, TextProof, VerifyResponse } from './types.ts';

type Input =
  | { kind: 'photo'; imagePath: string }
  | {
      kind: 'text';
      text: TextProof;
    };

const errorBody = (error: string, code: string) => ({ error, code });

interface State {
  locked: boolean;
  completed: boolean;
}

export async function handle(req: Request, deps: Deps): Promise<Response> {
  const origin = deps.allowedOrigin;
  const started = Date.now();

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }
  if (req.method !== 'POST') {
    return json(errorBody('Method not allowed', 'METHOD_NOT_ALLOWED'), 405, origin);
  }

  const auth = req.headers.get('Authorization') ?? '';
  const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
  const uid = token ? await deps.verifyJwt(token) : null;
  if (!uid) return json(errorBody('Unauthorized', 'UNAUTHORIZED'), 401, origin);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json(errorBody('Invalid JSON body', 'INVALID_REQUEST'), 400, origin);
  }
  const isText = typeof body === 'object' && body !== null && 'text' in body;
  let taskId: string;
  let input: Input;
  if (isText) {
    const parsed = parseTextRequest(body);
    if (!parsed.ok) {
      return json(errorBody('Invalid request', parsed.code), 400, origin);
    }
    taskId = parsed.value.taskId;
    input = { kind: 'text', text: parsed.value.text };
  } else {
    const parsed = parseRequest(body, uid);
    if (!parsed.ok) {
      const status = parsed.code === 'FORBIDDEN_PATH' ? 403 : 400;
      return json(errorBody('Invalid request', parsed.code), status, origin);
    }
    taskId = parsed.value.taskId;
    input = { kind: 'photo', imagePath: parsed.value.imagePath };
  }

  const state: State = { locked: false, completed: false };
  try {
    const res = await process(deps, uid, taskId, input, state, origin);
    deps.log({
      event: 'verify_done',
      status: res.status,
      ms: Date.now() - started,
    });
    return res;
  } catch (e) {
    deps.log({
      event: 'verify_error',
      name: e instanceof Error ? e.name : 'unknown',
    });
    return json(errorBody('Internal error', 'INTERNAL'), 500, origin);
  } finally {
    if (state.locked && !state.completed) {
      await deps.db.unlockTask(taskId).catch(() => deps.log({ event: 'unlock_failed' }));
    }
    // The photo is deleted after every decision (privacy / LGPD). The client re-uploads on retry.
    if (input.kind === 'photo') {
      await deps.storage
        .remove(input.imagePath)
        .catch(() => deps.log({ event: 'photo_remove_failed' }));
    }
  }
}

async function process(
  deps: Deps,
  uid: string,
  taskId: string,
  input: Input,
  state: State,
  origin: string,
): Promise<Response> {
  const ok = (r: VerifyResponse) => json(r, 200, origin);
  const early = (code: Exclude<ResultCode, 'APPROVED'>) => ok(outcome(code, 0, MESSAGES[code]));

  const task = await deps.db.getTask(taskId);
  if (!task || task.user_id !== uid) {
    return json(errorBody('Task not found', 'TASK_NOT_FOUND'), 404, origin);
  }
  const profile = await deps.db.getProfile(uid);
  if (!profile) {
    return json(errorBody('Profile not found', 'PROFILE_NOT_FOUND'), 404, origin);
  }

  if (proofKindFor(task.category ?? 'home') !== input.kind) {
    return json(errorBody('Wrong proof type for this task', 'WRONG_PROOF_KIND'), 400, origin);
  }

  const now = deps.now();
  const localDate = localDateIn(profile.timezone, now);

  if (await deps.db.hasCompletion(taskId, localDate)) {
    return early('ALREADY_COMPLETED');
  }
  if ((await deps.db.countCompletions(uid, localDate)) >= dailyLimit(profile.is_pro)) {
    return early('DAILY_LIMIT');
  }
  if ((await deps.db.countFailedAttempts(taskId, localDate)) >= MAX_FAILED_ATTEMPTS_PER_TASK_DAY) {
    return json(
      errorBody('Too many attempts for this task today', 'TOO_MANY_ATTEMPTS'),
      429,
      origin,
    );
  }

  // Atomic pending -> verifying (blocks double submit). A stale lock (crashed run) can be taken over.
  const lock = await deps.db.lockTask(
    taskId,
    new Date(now.getTime() - STALE_LOCK_MS).toISOString(),
    now.toISOString(),
  );
  if (lock === 'completed') return early('ALREADY_COMPLETED');
  if (lock === 'busy') {
    return json(errorBody('Task is being verified', 'TASK_BUSY'), 409, origin);
  }
  state.locked = true;

  let image: Uint8Array | null = null;
  let imageHash: string;
  if (input.kind === 'photo') {
    image = await deps.storage.download(input.imagePath);
    if (!image) {
      return json(errorBody('Image not found', 'IMAGE_NOT_FOUND'), 404, origin);
    }
    if (image.byteLength > MAX_IMAGE_BYTES) {
      return json(errorBody('Image too large', 'IMAGE_TOO_LARGE'), 413, origin);
    }
    if (!isJpeg(image)) {
      return json(errorBody('Image must be JPEG', 'INVALID_IMAGE'), 400, origin);
    }
    imageHash = await sha256Hex(image);
  } else {
    imageHash = await textProofHash(input.text);
  }
  const record = async (code: ResultCode, confidence: number | null, feedback: string | null) => {
    try {
      await deps.db.insertVerification({
        task_id: taskId,
        user_id: uid,
        image_path: input.kind === 'photo' ? input.imagePath : 'text',
        image_hash: imageHash,
        proof_kind: input.kind,
        approved: code === 'APPROVED',
        confidence,
        code,
        feedback,
      });
    } catch {
      deps.log({ event: 'verification_insert_failed', code });
    }
  };

  if (await deps.db.hasApprovedHash(uid, imageHash)) {
    const feedback =
      input.kind === 'photo'
        ? 'Essa foto já foi usada antes. Tire uma foto nova da tarefa.'
        : 'Você já ganhou recompensa por esse livro e capítulo. Escolha outro trecho.';
    await record('REJECTED', 0, feedback);
    return ok(outcome('REJECTED', 0, feedback));
  }

  const taskInfo = { title: task.title, description: task.description };
  const ai =
    input.kind === 'photo' && image
      ? await deps.gemini(image, taskInfo)
      : input.kind === 'text'
        ? await deps.geminiText(input.text, taskInfo)
        : ({ kind: 'unavailable' } as const);

  if (ai.kind === 'unavailable') {
    await record('AI_UNAVAILABLE', null, null); // not counted as a failed attempt
    return ok(outcome('AI_UNAVAILABLE', 0, MESSAGES.AI_UNAVAILABLE));
  }
  if (ai.kind === 'blocked') {
    await record('REJECTED', 0, MESSAGES.REJECTED);
    return ok(outcome('REJECTED', 0, MESSAGES.REJECTED));
  }

  const verdict = decide(ai);
  if (verdict !== 'APPROVED') {
    const feedback = sanitizeFeedback(ai.feedback, MESSAGES[verdict]);
    await record(verdict, ai.confidence, feedback);
    return ok(outcome(verdict, ai.confidence, feedback));
  }

  const result = await deps.db.completeTask(taskId, uid);
  if (!result.ok) {
    if (result.error === 'ALREADY_COMPLETED' || result.error === 'DAILY_LIMIT') {
      await record(result.error, ai.confidence, null);
      return ok(outcome(result.error, ai.confidence, MESSAGES[result.error]));
    }
    throw new Error(`rpc_failed:${result.error}`);
  }
  state.completed = true;

  const r = result.row;
  const feedback = sanitizeFeedback(ai.feedback, 'Mandou bem! Tarefa comprovada.');
  await record('APPROVED', ai.confidence, feedback);
  return ok(
    outcome('APPROVED', ai.confidence, feedback, {
      minutes: r.minutes_awarded,
      xp: r.xp_awarded,
      gems: r.gems_awarded,
      new_streak: r.new_streak_days,
      streak_incremented: r.streak_incremented,
      new_balance_seconds: r.new_balance_seconds,
      new_xp: r.new_xp,
      new_gems: r.new_gems,
    }),
  );
}
