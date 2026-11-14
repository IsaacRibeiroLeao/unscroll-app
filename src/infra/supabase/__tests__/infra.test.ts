import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createChunkedStorage } from '../chunkedStorage.ts';
import type { KeyValueStore } from '../chunkedStorage.ts';
import { toBackendError, toProfile, toProofOutcome, toPurchaseResult } from '../mappers.ts';

function memoryStore(): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    get: async (k) => data.get(k) ?? null,
    set: async (k, v) => void data.set(k, v),
    remove: async (k) => void data.delete(k),
  };
}

test('chunked storage round-trips long values and cleans up', async () => {
  const mem = memoryStore();
  const s = createChunkedStorage(mem, 10);
  const value = 'x'.repeat(95) + '{"a":1}';
  await s.setItem('sb-token', value);
  assert.equal(await s.getItem('sb-token'), value);
  await s.setItem('sb-token', 'short'); // shrinking must drop old chunks
  assert.equal(await s.getItem('sb-token'), 'short');
  assert.equal([...mem.data.keys()].filter((k) => k.startsWith('sb-token')).length, 2);
  await s.removeItem('sb-token');
  assert.equal(mem.data.size, 0);
  assert.equal(await s.getItem('sb-token'), null);
});

test('chunked storage treats a torn write as signed out', async () => {
  const mem = memoryStore();
  const s = createChunkedStorage(mem, 4);
  await s.setItem('k', 'abcdefghij');
  mem.data.delete('k.1');
  assert.equal(await s.getItem('k'), null);
});

test('toProfile maps snake_case rows and rejects malformed ones', () => {
  const p = toProfile({
    id: 'u',
    display_name: null,
    timezone: 'America/Sao_Paulo',
    balance_seconds: 60,
    xp: 150,
    gems: 25,
    streak_days: 2,
    streak_freeze_count: 1,
    is_pro: true,
    active_mascot_skin: 'default',
  });
  assert.equal(p.balanceSeconds, 60);
  assert.equal(p.isPro, true);
  assert.throws(() => toProfile({ id: 'u' }));
});

test('toProofOutcome maps rewards (and null rewards)', () => {
  const ok = toProofOutcome({
    approved: true,
    confidence: 0.9,
    feedback: 'ok',
    code: 'APPROVED',
    rewards: {
      minutes: 20,
      xp: 50,
      gems: 25,
      new_streak: 3,
      streak_incremented: true,
      new_balance_seconds: 1200,
      new_xp: 50,
      new_gems: 25,
    },
  });
  assert.equal(ok.rewards?.newBalanceSeconds, 1200);
  const no = toProofOutcome({
    approved: false,
    confidence: 0.1,
    feedback: 'no',
    code: 'REJECTED',
    rewards: null,
  });
  assert.equal(no.rewards, null);
  assert.throws(() => toProofOutcome({ approved: true }));
});

test('toPurchaseResult accepts array or object rows', () => {
  const row = { new_gems: 1, new_balance_seconds: 2, new_streak_freeze_count: 3, sku: 'x' };
  assert.equal(toPurchaseResult([row]).newGems, 1);
  assert.equal(toPurchaseResult(row).newStreakFreezeCount, 3);
});

test('toBackendError recognises raised codes and Edge Function codes', () => {
  assert.equal(toBackendError('INSUFFICIENT_GEMS').code, 'INSUFFICIENT_GEMS');
  assert.equal(
    toBackendError({ code: 'TASK_BUSY', message: 'Task is being verified' }).code,
    'TASK_BUSY',
  );
  assert.equal(toBackendError({ message: 'P0001: BALANCE_CAP' }).code, 'BALANCE_CAP');
  assert.equal(toBackendError('boom').code, 'UNKNOWN');
});

test('proofKindFor maps categories to proof kinds and WRONG_PROOF_KIND is a known error', async () => {
  const { proofKindFor } = await import('../../../application/ports/IBackendApi.ts');
  assert.equal(proofKindFor('home'), 'photo');
  assert.equal(proofKindFor('exercise'), 'photo');
  assert.equal(proofKindFor('reading'), 'text');
  assert.equal(proofKindFor('study'), 'text');
  assert.equal(toBackendError({ code: 'WRONG_PROOF_KIND' }).code, 'WRONG_PROOF_KIND');
});
