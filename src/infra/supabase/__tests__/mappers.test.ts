import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  toBackendError,
  toProfile,
  toProofOutcome,
  toPurchaseResult,
  toShopItem,
  toTask,
} from '../mappers.ts';

const taskRow = {
  id: 't1',
  title: 'Ler',
  description: null,
  recurrence: 'daily',
  category: 'reading',
  status: 'pending',
  reward_minutes: 20,
  reward_xp: 75,
  reward_gems: 40,
};

test('toTask maps snake_case rows including the category', () => {
  assert.deepEqual(toTask(taskRow), {
    id: 't1',
    title: 'Ler',
    description: null,
    recurrence: 'daily',
    category: 'reading',
    status: 'pending',
    rewardMinutes: 20,
    rewardXp: 75,
    rewardGems: 40,
  });
});

test('toTask rejects unknown categories and statuses', () => {
  assert.throws(() => toTask({ ...taskRow, category: 'gaming' }));
  assert.throws(() => toTask({ ...taskRow, status: 'weird' }));
  assert.throws(() => toTask({ ...taskRow, reward_gems: 1.5 }));
});

test('toShopItem and toPurchaseResult map rows (array or object)', () => {
  assert.deepEqual(
    toShopItem({ sku: 'free_pass_30m', kind: 'free_pass', price_gems: 350, grant_seconds: 1800 }),
    { sku: 'free_pass_30m', kind: 'free_pass', priceGems: 350, grantSeconds: 1800 },
  );
  const row = { sku: 's', new_gems: 5, new_balance_seconds: 60, new_streak_freeze_count: 2 };
  const expected = { sku: 's', newGems: 5, newBalanceSeconds: 60, newStreakFreezeCount: 2 };
  assert.deepEqual(toPurchaseResult(row), expected);
  assert.deepEqual(toPurchaseResult([row]), expected);
  assert.throws(() => toShopItem({ sku: 'x', kind: 'nope', price_gems: 1, grant_seconds: null }));
});

test('toProofOutcome maps rewards and null rewards', () => {
  const base = { approved: false, confidence: 0.2, feedback: 'f', code: 'REJECTED', rewards: null };
  assert.equal(toProofOutcome(base).rewards, null);
  const ok = toProofOutcome({
    ...base,
    approved: true,
    code: 'APPROVED',
    rewards: {
      minutes: 20,
      xp: 75,
      gems: 40,
      new_streak: 3,
      streak_incremented: true,
      new_balance_seconds: 1200,
      new_xp: 100,
      new_gems: 90,
    },
  });
  assert.equal(ok.rewards?.newGems, 90);
  assert.equal(ok.rewards?.streakIncremented, true);
  assert.throws(() => toProofOutcome({ ...base, code: 'HACKED' }));
});

test('toProfile requires every field', () => {
  assert.throws(() => toProfile({ id: 'u' }));
});

test('toBackendError finds known codes in strings, code and message', () => {
  assert.equal(toBackendError('P0001: INSUFFICIENT_GEMS').code, 'INSUFFICIENT_GEMS');
  assert.equal(toBackendError({ code: 'TASK_BUSY' }).code, 'TASK_BUSY');
  assert.equal(toBackendError({ message: 'raise BALANCE_CAP' }).code, 'BALANCE_CAP');
  assert.equal(toBackendError({ code: 'INVALID_REQUEST' }).code, 'INVALID_REQUEST');
  const unknown = toBackendError('boom'.repeat(100));
  assert.equal(unknown.code, 'UNKNOWN');
  assert.equal(unknown.message.length, 200);
});
