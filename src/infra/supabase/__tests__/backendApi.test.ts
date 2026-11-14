import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { BackendError } from '../../../application/ports/IBackendApi.ts';
import { createBackendApi } from '../backendApi.ts';
import { currentUserId, ensureSession } from '../session.ts';
import { createScreenTimeApi } from '../screenTimeApi.ts';

type Result = { data?: unknown; error?: { message: string } | null };

const taskRow = {
  id: 't1',
  title: 'Lavar',
  description: null,
  recurrence: 'once',
  category: 'home',
  status: 'pending',
  reward_minutes: 20,
  reward_xp: 50,
  reward_gems: 25,
};
const profileRow = {
  id: 'u1',
  display_name: null,
  timezone: 'America/Sao_Paulo',
  balance_seconds: 0,
  xp: 0,
  gems: 0,
  streak_days: 0,
  streak_freeze_count: 0,
  is_pro: false,
  active_mascot_skin: 'default',
};

/** Chainable query builder: every method returns itself; awaiting resolves to `result`. */
function builder(result: Result, log: unknown[][]) {
  const b: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'order', 'insert', 'delete']) {
    b[m] = (...args: unknown[]) => {
      log.push([m, ...args]);
      return b;
    };
  }
  b.single = async () => result;
  b.then = (resolve: (r: Result) => unknown) => resolve(result);
  return b;
}

function fakeClient(opts: {
  tables?: Record<string, Result>;
  rpc?: Result;
  invoke?: Result;
  upload?: Result;
  session?: boolean;
  log?: unknown[][];
}) {
  const log = opts.log ?? [];
  return {
    auth: {
      getSession: async () => ({
        data: { session: opts.session === false ? null : { user: { id: 'u1' } } },
      }),
    },
    from: (table: string) => {
      log.push(['from', table]);
      return builder(opts.tables?.[table] ?? { data: [], error: null }, log);
    },
    rpc: async (fn: string, args: unknown) => {
      log.push(['rpc', fn, args]);
      return opts.rpc ?? { data: null, error: null };
    },
    storage: {
      from: () => ({
        upload: async (path: string) => {
          log.push(['upload', path]);
          return opts.upload ?? { error: null };
        },
      }),
    },
    functions: {
      invoke: async (name: string, o: unknown) => {
        log.push(['invoke', name, o]);
        return opts.invoke ?? { data: null, error: null };
      },
    },
  } as unknown as SupabaseClient;
}

const api = (client: SupabaseClient) =>
  createBackendApi(client, { preparePhoto: async () => new ArrayBuffer(4), now: () => 123 });

test('getProfile / listTasks / listShopItems / listOwnedSkus map rows', async () => {
  const client = fakeClient({
    tables: {
      profiles: { data: profileRow, error: null },
      tasks: { data: [taskRow], error: null },
      shop_items: {
        data: [{ sku: 'a', kind: 'streak_freeze', price_gems: 200, grant_seconds: null }],
        error: null,
      },
      shop_purchases: { data: [{ sku: 'skin1' }], error: null },
    },
  });
  const b = api(client);
  assert.equal((await b.getProfile()).id, 'u1');
  assert.equal((await b.listTasks())[0]?.category, 'home');
  assert.equal((await b.listShopItems())[0]?.priceGems, 200);
  assert.deepEqual(await b.listOwnedSkus(), ['skin1']);
});

test('read errors become BackendError codes', async () => {
  const b = api(fakeClient({ tables: { tasks: { data: null, error: { message: 'TASK_BUSY' } } } }));
  await assert.rejects(
    b.listTasks(),
    (e: unknown) => e instanceof BackendError && e.code === 'TASK_BUSY',
  );
});

test('createTask sends trimmed fields and the category', async () => {
  const log: unknown[][] = [];
  const b = api(fakeClient({ log, tables: { tasks: { data: taskRow, error: null } } }));
  await b.createTask({
    title: '  Ler  ',
    description: '  ',
    recurrence: 'daily',
    category: 'reading',
  });
  const insert = log.find((l) => l[0] === 'insert');
  assert.deepEqual(insert?.[1], {
    title: 'Ler',
    description: null,
    recurrence: 'daily',
    category: 'reading',
  });
});

test('deleteTask surfaces errors and succeeds otherwise', async () => {
  await api(fakeClient({})).deleteTask('t1');
  const bad = api(fakeClient({ tables: { tasks: { error: { message: 'x' } } } }));
  await assert.rejects(bad.deleteTask('t1'));
});

test('verifyTaskProof uploads under the uid folder then invokes the function', async () => {
  const log: unknown[][] = [];
  const outcome = { approved: false, confidence: 0, feedback: '', code: 'REJECTED', rewards: null };
  const b = api(fakeClient({ log, invoke: { data: outcome, error: null } }));
  const r = await b.verifyTaskProof('t1', 'file://p.jpg');
  assert.equal(r.code, 'REJECTED');
  assert.deepEqual(
    log.find((l) => l[0] === 'upload'),
    ['upload', 'u1/t1-123.jpg'],
  );
  const inv = log.find((l) => l[0] === 'invoke');
  assert.deepEqual((inv?.[2] as { body: unknown }).body, {
    taskId: 't1',
    imagePath: 'u1/t1-123.jpg',
  });
});

test('verifyTaskProof stops when the upload fails', async () => {
  const b = api(fakeClient({ upload: { error: { message: 'IMAGE_TOO_LARGE' } } }));
  await assert.rejects(
    b.verifyTaskProof('t1', 'x'),
    (e: unknown) => e instanceof BackendError && e.code === 'IMAGE_TOO_LARGE',
  );
});

test('verifyTextProof sends the text body with an empty chapter default', async () => {
  const log: unknown[][] = [];
  const outcome = { approved: false, confidence: 0, feedback: '', code: 'REJECTED', rewards: null };
  const b = api(fakeClient({ log, invoke: { data: outcome, error: null } }));
  await b.verifyTextProof('t1', { book: 'B', summary: 's', insight: 'i' });
  const inv = log.find((l) => l[0] === 'invoke');
  assert.deepEqual((inv?.[2] as { body: unknown }).body, {
    taskId: 't1',
    text: { book: 'B', chapter: '', summary: 's', insight: 'i' },
  });
  assert.equal(
    log.some((l) => l[0] === 'upload'),
    false,
  );
});

test('function errors map by type: HTTP code, network, relay, other', async () => {
  const http = new FunctionsHttpError(
    new Response(JSON.stringify({ code: 'WRONG_PROOF_KIND' }), { status: 400 }),
  );
  await assert.rejects(
    api(fakeClient({ invoke: { error: http as never } })).verifyTextProof('t', {
      book: 'b',
      summary: 's',
      insight: 'i',
    }),
    (e: unknown) => e instanceof BackendError && e.code === 'WRONG_PROOF_KIND',
  );
  const httpBad = new FunctionsHttpError(new Response('not json', { status: 500 }));
  await assert.rejects(
    api(fakeClient({ invoke: { error: httpBad as never } })).verifyTextProof('t', {
      book: 'b',
      summary: 's',
      insight: 'i',
    }),
    (e: unknown) => e instanceof BackendError && e.code === 'UNKNOWN',
  );
  for (const err of [new FunctionsFetchError({}), new FunctionsRelayError({})]) {
    await assert.rejects(
      api(fakeClient({ invoke: { error: err as never } })).verifyTextProof('t', {
        book: 'b',
        summary: 's',
        insight: 'i',
      }),
      (e: unknown) => e instanceof BackendError && e.code === 'NETWORK',
    );
  }
  await assert.rejects(
    api(fakeClient({ invoke: { error: new Error('boom') as never } })).verifyTextProof('t', {
      book: 'b',
      summary: 's',
      insight: 'i',
    }),
    (e: unknown) => e instanceof BackendError && e.code === 'UNKNOWN',
  );
});

test('purchaseItem, setActiveSkin and setTimezone call the right RPCs', async () => {
  const log: unknown[][] = [];
  const b = api(
    fakeClient({
      log,
      rpc: {
        data: [{ sku: 's', new_gems: 1, new_balance_seconds: 2, new_streak_freeze_count: 3 }],
        error: null,
      },
    }),
  );
  assert.equal((await b.purchaseItem('s')).newGems, 1);
  await b.setActiveSkin('fire');
  await b.setTimezone('America/Sao_Paulo');
  assert.deepEqual(
    log.filter((l) => l[0] === 'rpc').map((l) => l[1]),
    ['purchase_shop_item', 'set_active_mascot_skin', 'set_profile_timezone'],
  );
});

test('rpc errors throw BackendError', async () => {
  const b = api(fakeClient({ rpc: { error: { message: 'INSUFFICIENT_GEMS' } } }));
  await assert.rejects(
    b.purchaseItem('s'),
    (e: unknown) => e instanceof BackendError && e.code === 'INSUFFICIENT_GEMS',
  );
  await assert.rejects(b.setActiveSkin('x'));
  await assert.rejects(b.setTimezone('x'));
});

test('ensureSession returns the session user and never signs in anonymously', async () => {
  assert.equal(await ensureSession(fakeClient({})), 'u1');
  assert.equal(await currentUserId(fakeClient({ session: false })), null);
  await assert.rejects(
    ensureSession(fakeClient({ session: false })),
    (e: unknown) => e instanceof BackendError && e.code === 'UNAUTHORIZED',
  );
});

test('screen time api maps the RPC row and propagates errors', async () => {
  const ok = createScreenTimeApi(async () => ({
    data: [{ new_balance_seconds: 10, applied_seconds: 5, duplicate: false }],
    error: null,
  }));
  assert.deepEqual(await ok.consumeScreenTime('u', 5, 'e1'), {
    newBalanceSeconds: 10,
    appliedSeconds: 5,
    duplicate: false,
  });
  const bad = createScreenTimeApi(async () => ({ data: null, error: { message: 'nope' } }));
  await assert.rejects(bad.consumeScreenTime('u', 5, 'e1'), /nope/);
  const malformed = createScreenTimeApi(async () => ({ data: { x: 1 }, error: null }));
  await assert.rejects(malformed.consumeScreenTime('u', 5, 'e1'));
});
