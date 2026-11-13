import { assertEquals } from '@std/assert';
import { handle } from './handler.ts';
import type { Deps } from './handler.ts';
import { decide, resolveUserId, secretsMatch } from './logic.ts';

const UID = '11111111-1111-4111-8111-111111111111';
const NOW = 1_800_000_000_000;

function make(over: Partial<Deps> = {}) {
  const calls: { userId: string; isPro: boolean; at: string }[] = [];
  const deps: Deps = {
    secret: 's3cret',
    now: () => NOW,
    log: () => {},
    applyProStatus: async (userId, isPro, at) => {
      calls.push({ userId, isPro, at });
      return true;
    },
    ...over,
  };
  return { deps, calls };
}

const post = (body: unknown, auth: string | null = 's3cret') =>
  new Request('https://x/f', {
    method: 'POST',
    headers: auth === null ? {} : { Authorization: auth },
    body: JSON.stringify(body),
  });

const ev = (over: Record<string, unknown>) => ({
  event: {
    id: 'e1',
    type: 'INITIAL_PURCHASE',
    app_user_id: UID,
    expiration_at_ms: NOW + 1000,
    ...over,
  },
});

Deno.test('rejects wrong method, missing or wrong secret', async () => {
  const { deps } = make();
  assertEquals((await handle(new Request('https://x/f'), deps)).status, 405);
  assertEquals((await handle(post(ev({}), null), deps)).status, 401);
  assertEquals((await handle(post(ev({}), 'nope'), deps)).status, 401);
});

Deno.test('rejects malformed bodies', async () => {
  const { deps } = make();
  assertEquals((await handle(post({ foo: 1 }), deps)).status, 400);
  const bad = new Request('https://x/f', {
    method: 'POST',
    headers: { Authorization: 's3cret' },
    body: '{not json',
  });
  assertEquals((await handle(bad, deps)).status, 400);
});

Deno.test('purchase grants Pro using the event timestamp', async () => {
  const { deps, calls } = make();
  const res = await handle(post(ev({ event_timestamp_ms: NOW - 5000 })), deps);
  assertEquals(res.status, 200);
  assertEquals(calls, [{ userId: UID, isPro: true, at: new Date(NOW - 5000).toISOString() }]);
});

Deno.test('expired purchase (expiration in the past) does not grant', async () => {
  const { deps, calls } = make();
  await handle(post(ev({ type: 'RENEWAL', expiration_at_ms: NOW - 1 })), deps);
  assertEquals(calls[0]?.isPro, false);
});

Deno.test('EXPIRATION revokes; CANCELLATION and unknown types are ignored', async () => {
  const { deps, calls } = make();
  await handle(post(ev({ type: 'EXPIRATION' })), deps);
  assertEquals(calls.length, 1);
  assertEquals(calls[0]?.isPro, false);
  await handle(post(ev({ type: 'CANCELLATION' })), deps);
  await handle(post(ev({ type: 'TEST' })), deps);
  assertEquals(calls.length, 1);
});

Deno.test('anonymous RevenueCat ids are acknowledged without writing', async () => {
  const { deps, calls } = make();
  const res = await handle(post(ev({ app_user_id: '$RCAnonymousID:abc', aliases: ['x'] })), deps);
  assertEquals(res.status, 200);
  assertEquals(calls.length, 0);
});

Deno.test('user id can come from aliases', () => {
  assertEquals(
    resolveUserId({
      id: 'e',
      type: 'RENEWAL',
      app_user_id: '$RCAnonymousID:a',
      aliases: [UID.toUpperCase()],
    }),
    UID,
  );
});

Deno.test('database failure returns 500 so RevenueCat retries', async () => {
  const { deps } = make({
    applyProStatus: () => Promise.reject(new Error('db down')),
  });
  assertEquals((await handle(post(ev({})), deps)).status, 500);
});

Deno.test('decide / secretsMatch basics', () => {
  assertEquals(decide({ id: 'e', type: 'UNCANCELLATION' }, NOW), { action: 'set', isPro: true });
  assertEquals(secretsMatch('a', 'a'), true);
  assertEquals(secretsMatch('a', 'ab'), false);
  assertEquals(secretsMatch(null, 'a'), false);
});
