import { assert, assertEquals } from '@std/assert';
import { handle } from './handler.ts';
import type {
  CompleteResult,
  Deps,
  GeminiResult,
  TaskCategory,
  TaskRow,
  VerificationInsert,
} from './types.ts';

const UID = '11111111-1111-4111-8111-111111111111';
const TASK = '22222222-2222-4222-8222-222222222222';
const PATH = `${UID}/p1.jpg`;
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);

interface Opts {
  task?: TaskRow | null;
  isPro?: boolean;
  completionsToday?: number;
  hasCompletion?: boolean;
  failedAttempts?: number;
  lock?: 'locked' | 'completed' | 'busy';
  image?: Uint8Array | null;
  approvedHash?: boolean;
  ai?: GeminiResult;
  complete?: CompleteResult;
  now?: string;
  throwOnComplete?: boolean;
  category?: TaskCategory;
}

function make(o: Opts = {}) {
  const calls = {
    gemini: 0,
    geminiText: 0,
    lock: 0,
    unlock: 0,
    removed: [] as string[],
    inserts: [] as VerificationInsert[],
    dates: [] as string[],
  };
  const task: TaskRow | null =
    o.task === undefined
      ? {
          id: TASK,
          user_id: UID,
          title: 'Lavar a louça',
          description: null,
          status: 'pending',
          category: o.category ?? 'home',
        }
      : o.task;
  const deps: Deps = {
    now: () => new Date(o.now ?? '2026-03-10T15:00:00Z'),
    allowedOrigin: '*',
    log: () => {},
    verifyJwt: (t) => Promise.resolve(t === 'good' ? UID : null),
    storage: {
      download: () => Promise.resolve(o.image === undefined ? JPEG : o.image),
      remove: (p) => {
        calls.removed.push(p);
        return Promise.resolve();
      },
    },
    gemini: () => {
      calls.gemini++;
      return Promise.resolve(
        o.ai ?? {
          kind: 'ok',
          approved: true,
          confidence: 0.9,
          qualityOk: true,
          feedback: 'Boa!',
        },
      );
    },
    geminiText: () => {
      calls.geminiText++;
      return Promise.resolve(
        o.ai ?? {
          kind: 'ok',
          approved: true,
          confidence: 0.9,
          qualityOk: true,
          feedback: 'Boa!',
        },
      );
    },
    db: {
      getTask: () => Promise.resolve(task),
      getProfile: () =>
        Promise.resolve({
          timezone: 'America/Sao_Paulo',
          is_pro: o.isPro ?? false,
        }),
      hasCompletion: (_t, d) => {
        calls.dates.push(d);
        return Promise.resolve(o.hasCompletion ?? false);
      },
      countCompletions: () => Promise.resolve(o.completionsToday ?? 0),
      countFailedAttempts: () => Promise.resolve(o.failedAttempts ?? 0),
      hasApprovedHash: () => Promise.resolve(o.approvedHash ?? false),
      lockTask: () => {
        calls.lock++;
        return Promise.resolve(o.lock ?? 'locked');
      },
      unlockTask: () => {
        calls.unlock++;
        return Promise.resolve();
      },
      completeTask: () => {
        if (o.throwOnComplete) return Promise.reject(new Error('boom'));
        return Promise.resolve(
          o.complete ?? {
            ok: true,
            row: {
              new_balance_seconds: 1200,
              new_xp: 50,
              new_gems: 25,
              new_streak_days: 1,
              streak_incremented: true,
              minutes_awarded: 20,
              xp_awarded: 50,
              gems_awarded: 25,
            },
          },
        );
      },
      insertVerification: (r) => {
        calls.inserts.push(r);
        return Promise.resolve();
      },
    },
  };
  return { deps, calls };
}

const req = (body: unknown, opts: { token?: string; method?: string } = {}) =>
  new Request('http://x/verify', {
    method: opts.method ?? 'POST',
    headers: {
      Authorization: `Bearer ${opts.token ?? 'good'}`,
      'Content-Type': 'application/json',
    },
    body: opts.method === 'GET' ? undefined : JSON.stringify(body),
  });
const valid = { taskId: TASK, imagePath: PATH };

Deno.test('CORS preflight, method and auth checks', async () => {
  const { deps } = make();
  const pre = await handle(new Request('http://x', { method: 'OPTIONS' }), deps);
  assertEquals(pre.status, 204);
  assert(pre.headers.get('Access-Control-Allow-Headers')!.includes('authorization'));
  assertEquals((await handle(req(valid, { method: 'GET' }), deps)).status, 405);
  const noAuth = await handle(req(valid, { token: 'bad' }), deps);
  assertEquals(noAuth.status, 401);
  assertEquals((await noAuth.json()).code, 'UNAUTHORIZED');
});

Deno.test('validation: bad body 400, foreign path 403, foreign task 404', async () => {
  const { deps } = make();
  assertEquals((await handle(req({ taskId: 'x', imagePath: PATH }), deps)).status, 400);
  const foreign = await handle(
    req({
      taskId: TASK,
      imagePath: `99999999-9999-4999-8999-999999999999/p.jpg`,
    }),
    deps,
  );
  assertEquals(foreign.status, 403);

  const m = make({
    task: {
      id: TASK,
      user_id: '99999999-9999-4999-8999-999999999999',
      title: 't',
      description: null,
      status: 'pending',
      category: 'home',
    },
  });
  const r = await handle(req(valid), m.deps);
  assertEquals(r.status, 404);
  assertEquals((await r.json()).code, 'TASK_NOT_FOUND');
  assertEquals(m.calls.gemini, 0);
  assertEquals(m.calls.removed, [PATH], 'own photo removed even on error');
});

Deno.test(
  'approved: rewards returned, photo deleted, task stays completed (no unlock)',
  async () => {
    const { deps, calls } = make();
    const r = await handle(req(valid), deps);
    assertEquals(r.status, 200);
    const b = await r.json();
    assertEquals([b.approved, b.code], [true, 'APPROVED']);
    assertEquals(b.rewards, {
      minutes: 20,
      xp: 50,
      gems: 25,
      new_streak: 1,
      streak_incremented: true,
      new_balance_seconds: 1200,
      new_xp: 50,
      new_gems: 25,
    });
    assertEquals(calls.removed, [PATH]);
    assertEquals(calls.unlock, 0);
    assertEquals(calls.inserts.length, 1);
    assertEquals(calls.inserts[0]!.code, 'APPROVED');
    assertEquals(calls.inserts[0]!.image_hash.length, 64);
  },
);

Deno.test('rejected / low confidence / low quality: unlock, no rewards, counted', async () => {
  for (const [ai, code] of [
    [
      {
        kind: 'ok',
        approved: false,
        confidence: 0.9,
        qualityOk: true,
        feedback: 'Mostre a pia limpa.',
      },
      'REJECTED',
    ],
    [
      {
        kind: 'ok',
        approved: true,
        confidence: 0.5,
        qualityOk: true,
        feedback: '',
      },
      'REJECTED',
    ],
    [
      {
        kind: 'ok',
        approved: true,
        confidence: 0.95,
        qualityOk: false,
        feedback: 'Foto escura.',
      },
      'LOW_QUALITY',
    ],
  ] as [GeminiResult, string][]) {
    const { deps, calls } = make({ ai });
    const b = await (await handle(req(valid), deps)).json();
    assertEquals([b.approved, b.code, b.rewards], [false, code, null]);
    assert(b.feedback.length > 0);
    assertEquals(calls.unlock, 1);
    assertEquals(calls.inserts[0]!.code, code);
    assertEquals(calls.removed, [PATH]);
  }
});

Deno.test('AI unavailable: unlock, not penalized (recorded as AI_UNAVAILABLE)', async () => {
  const { deps, calls } = make({ ai: { kind: 'unavailable' } });
  const b = await (await handle(req(valid), deps)).json();
  assertEquals([b.approved, b.code], [false, 'AI_UNAVAILABLE']);
  assertEquals(calls.unlock, 1);
  assertEquals(calls.inserts[0]!.code, 'AI_UNAVAILABLE');
  assertEquals(calls.removed, [PATH]);
});

Deno.test(
  'daily limit (Free 1 / Pro 5) and already completed short-circuit before the lock and the AI',
  async () => {
    const free = make({ completionsToday: 1 });
    assertEquals((await (await handle(req(valid), free.deps)).json()).code, 'DAILY_LIMIT');
    assertEquals([free.calls.lock, free.calls.gemini], [0, 0]);

    const proOk = make({ completionsToday: 4, isPro: true });
    assertEquals((await (await handle(req(valid), proOk.deps)).json()).code, 'APPROVED');
    const proFull = make({ completionsToday: 5, isPro: true });
    assertEquals((await (await handle(req(valid), proFull.deps)).json()).code, 'DAILY_LIMIT');

    const done = make({ hasCompletion: true });
    assertEquals((await (await handle(req(valid), done.deps)).json()).code, 'ALREADY_COMPLETED');
    assertEquals(done.calls.gemini, 0);
    assertEquals(done.calls.removed, [PATH]);
  },
);

Deno.test('local date comes from the user timezone', async () => {
  const { deps, calls } = make({
    now: '2026-03-11T02:30:00Z',
    hasCompletion: true,
  });
  await handle(req(valid), deps);
  assertEquals(calls.dates, ['2026-03-10']);
});

Deno.test(
  'too many failed attempts -> 429; busy lock -> 409; stale/completed lock results',
  async () => {
    const many = make({ failedAttempts: 5 });
    const r1 = await handle(req(valid), many.deps);
    assertEquals([r1.status, (await r1.json()).code], [429, 'TOO_MANY_ATTEMPTS']);
    assertEquals(many.calls.gemini, 0);

    const busy = make({ lock: 'busy' });
    const r2 = await handle(req(valid), busy.deps);
    assertEquals([r2.status, (await r2.json()).code], [409, 'TASK_BUSY']);
    assertEquals([busy.calls.gemini, busy.calls.unlock], [0, 0]); // we do not own the lock
    assertEquals(busy.calls.removed, [PATH]);

    const completed = make({ lock: 'completed' });
    assertEquals(
      (await (await handle(req(valid), completed.deps)).json()).code,
      'ALREADY_COMPLETED',
    );
  },
);

Deno.test('image checks: missing 404, oversize 413, not jpeg 400 (all unlock)', async () => {
  const missing = make({ image: null });
  assertEquals((await handle(req(valid), missing.deps)).status, 404);
  assertEquals(missing.calls.unlock, 1);

  const big = make({ image: new Uint8Array(2 * 1024 * 1024 + 1).fill(0xff) });
  assertEquals((await handle(req(valid), big.deps)).status, 413);
  assertEquals(big.calls.unlock, 1);

  const png = make({ image: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0]) });
  assertEquals((await handle(req(valid), png.deps)).status, 400);
  assertEquals(png.calls.gemini, 0);
});

Deno.test('duplicate approved hash is rejected without calling the AI', async () => {
  const { deps, calls } = make({ approvedHash: true });
  const b = await (await handle(req(valid), deps)).json();
  assertEquals([b.code, b.approved], ['REJECTED', false]);
  assertEquals(calls.gemini, 0);
  assertEquals(calls.unlock, 1);
});

Deno.test('RPC race (DAILY_LIMIT) maps to a 200 with that code and unlocks', async () => {
  const { deps, calls } = make({
    complete: { ok: false, error: 'DAILY_LIMIT' },
  });
  const b = await (await handle(req(valid), deps)).json();
  assertEquals([b.code, b.approved, b.rewards], ['DAILY_LIMIT', false, null]);
  assertEquals(calls.unlock, 1);
});

Deno.test(
  'unexpected errors -> 500, lock released, photo removed, no internals leaked',
  async () => {
    const { deps, calls } = make({ throwOnComplete: true });
    const r = await handle(req(valid), deps);
    assertEquals(r.status, 500);
    assertEquals(await r.json(), { error: 'Internal error', code: 'INTERNAL' });
    assertEquals(calls.unlock, 1);
    assertEquals(calls.removed, [PATH]);

    const bad = make({ complete: { ok: false, error: 'SOMETHING_ELSE' } });
    assertEquals((await handle(req(valid), bad.deps)).status, 500);
    assertEquals(bad.calls.unlock, 1);
  },
);

const textBody = (over: Record<string, unknown> = {}) => ({
  taskId: TASK,
  text: {
    book: 'O Hobbit',
    chapter: 'Capítulo 2',
    summary:
      'Bilbo é surpreendido por treze anões e Gandalf em sua toca. Eles o convencem a participar da jornada até a Montanha Solitária, e Bilbo, hesitante, acaba aceitando depois de ouvir a canção sobre o ouro e o dragão Smaug.',
    insight: 'Me fez pensar em como a coragem aparece quando a gente menos espera.',
    ...over,
  },
});

Deno.test(
  'text proof: reading task is approved without storage, with proof_kind text',
  async () => {
    const m = make({ category: 'reading' });
    const r = await handle(req(textBody()), m.deps);
    assertEquals(r.status, 200);
    const body = await r.json();
    assertEquals(body.code, 'APPROVED');
    assertEquals(m.calls.geminiText, 1);
    assertEquals(m.calls.gemini, 0);
    assertEquals(m.calls.removed, [], 'no storage object for text proofs');
    assertEquals(m.calls.inserts[0]?.proof_kind, 'text');
    assertEquals(m.calls.inserts[0]?.image_path, 'text');
  },
);

Deno.test('text proof: wrong proof kind for the category is a 400 (both directions)', async () => {
  const photoTask = make({ category: 'home' });
  const a = await handle(req(textBody()), photoTask.deps);
  assertEquals(a.status, 400);
  assertEquals((await a.json()).code, 'WRONG_PROOF_KIND');
  assertEquals(photoTask.calls.geminiText, 0);

  const textTask = make({ category: 'study' });
  const b = await handle(req(valid), textTask.deps);
  assertEquals(b.status, 400);
  assertEquals((await b.json()).code, 'WRONG_PROOF_KIND');
  assertEquals(textTask.calls.gemini, 0);
});

Deno.test('text proof: too-short summary is rejected before any work', async () => {
  const m = make({ category: 'reading' });
  const r = await handle(req(textBody({ summary: 'curto demais' })), m.deps);
  assertEquals(r.status, 400);
  assertEquals((await r.json()).code, 'INVALID_REQUEST');
  assertEquals(m.calls.lock, 0);
});

Deno.test('text proof: same book+chapter already rewarded is rejected without the AI', async () => {
  const m = make({ category: 'reading', approvedHash: true });
  const r = await handle(req(textBody()), m.deps);
  const body = await r.json();
  assertEquals(body.code, 'REJECTED');
  assertEquals(m.calls.geminiText, 0);
  assertEquals(m.calls.unlock, 1);
});
