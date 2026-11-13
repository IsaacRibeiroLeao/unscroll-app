import assert from 'node:assert/strict';
import { test } from 'node:test';
import { reconcileScreenTime } from '../reconcileScreenTime.ts';
import type { UsageReport } from '../ports/IScreenBlockerService.ts';

function make(reports: UsageReport[], failOn?: string) {
  const marked: string[] = [];
  const calls: [string, number, string][] = [];
  return {
    marked,
    calls,
    deps: {
      userId: 'u1',
      blocker: {
        getUnreportedUsage: async () => reports,
        markUsageReported: async (id: string) => void marked.push(id),
      },
      api: {
        consumeScreenTime: async (userId: string, seconds: number, eventId: string) => {
          calls.push([userId, seconds, eventId]);
          if (eventId === failOn) throw new Error('network');
          return {
            newBalanceSeconds: 1000 - calls.length * 100,
            appliedSeconds: seconds,
            duplicate: false,
          };
        },
      },
    },
  };
}

test('reports each usage idempotently, marks it and returns the last server balance', async () => {
  const m = make([
    { eventId: 'a:300', seconds: 300 },
    { eventId: 'b:600', seconds: 600 },
  ]);
  const res = await reconcileScreenTime(m.deps);
  assert.deepEqual(res, { ok: true, reported: 2, serverBalanceSeconds: 800 });
  assert.deepEqual(m.marked, ['a:300', 'b:600']);
  assert.deepEqual(m.calls[0], ['u1', 300, 'a:300']);
});

test('nothing to report -> null balance', async () => {
  const res = await reconcileScreenTime(make([]).deps);
  assert.deepEqual(res, { ok: true, reported: 0, serverBalanceSeconds: null });
});

test('stops at the first failure and keeps the failed one unmarked (retry is idempotent)', async () => {
  const m = make(
    [
      { eventId: 'a:300', seconds: 300 },
      { eventId: 'b:600', seconds: 600 },
    ],
    'b:600',
  );
  const res = await reconcileScreenTime(m.deps);
  assert.equal(res.ok, false);
  assert.equal(res.reported, 1);
  assert.deepEqual(m.marked, ['a:300']);
});
