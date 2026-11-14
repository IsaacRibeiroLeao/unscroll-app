import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  MAX_BALANCE_SECONDS,
  WINDOW_MS,
  buildUsagePlan,
  clampBalance,
  consumedSeconds,
  intervalEnded,
  parseUsageEventId,
  secondsToThreshold,
  usageEventId,
} from '../usagePlan.ts';

test('secondsToThreshold splits hours/minutes/seconds', () => {
  assert.deepEqual(secondsToThreshold(300), { hour: 0, minute: 5, second: 0 });
  assert.deepEqual(secondsToThreshold(3725), { hour: 1, minute: 2, second: 5 });
  assert.deepEqual(secondsToThreshold(7200), { hour: 2, minute: 0, second: 0 });
});

test('clampBalance floors, caps at 120 min and rejects junk', () => {
  assert.equal(clampBalance(1200.9), 1200);
  assert.equal(clampBalance(99999), MAX_BALANCE_SECONDS);
  for (const bad of [0, -5, Number.NaN, Number.POSITIVE_INFINITY * -1]) assert.equal(clampBalance(bad), 0);
});

test('buildUsagePlan: step events + exact final event, no underscores in names', () => {
  const plan = buildUsagePlan(1200, 1_700_000_000_000, 300);
  assert.deepEqual(plan.events.map((e) => e.seconds), [300, 600, 900, 1200]);
  assert.equal(plan.finalEventName, 'u-1200');
  assert.equal(plan.endsAtMs - plan.startsAtMs, WINDOW_MS);
  assert.ok(!plan.activityName.includes('_'));
  for (const e of plan.events) assert.ok(!e.eventName.includes('_'));
});

test('buildUsagePlan: non-multiple balance gets an exact last threshold', () => {
  const plan = buildUsagePlan(1190, 1, 300);
  assert.deepEqual(plan.events.map((e) => e.seconds), [300, 600, 900, 1190]);
  assert.equal(plan.finalEventName, 'u-1190');
});

test('buildUsagePlan: max balance stays within 25 events with the default step', () => {
  const plan = buildUsagePlan(99999, 1);
  assert.equal(plan.events.at(-1)?.seconds, 7200);
  assert.ok(plan.events.length <= 25);
  assert.throws(() => buildUsagePlan(0, 1));
});

test('consumedSeconds uses the largest threshold of THIS activity, capped at the grant', () => {
  const ev = [
    { activityName: 'a', callbackName: 'eventDidReachThreshold', eventName: 'u-300' },
    { activityName: 'a', callbackName: 'eventDidReachThreshold', eventName: 'u-900' },
    { activityName: 'a', callbackName: 'intervalDidStart' },
    { activityName: 'b', callbackName: 'eventDidReachThreshold', eventName: 'u-1200' },
    { activityName: 'a', callbackName: 'eventDidReachThreshold', eventName: 'weird' },
  ];
  assert.equal(consumedSeconds(ev, 'a', 1200), 900);
  assert.equal(consumedSeconds(ev, 'a', 600), 600);
  assert.equal(consumedSeconds([], 'a', 600), 0);
});

test('intervalEnded by recorded event or by clock (clock moved forward fails closed)', () => {
  const ended = [{ activityName: 'a', callbackName: 'intervalDidEnd' }];
  assert.equal(intervalEnded(ended, 'a', 1000, 10), true);
  assert.equal(intervalEnded([], 'a', 1000, 999), false);
  assert.equal(intervalEnded([], 'a', 1000, 1000), true);
});

test('usage event ids round-trip', () => {
  const id = usageEventId('unscroll-usage-123', 600);
  assert.deepEqual(parseUsageEventId(id), { activityName: 'unscroll-usage-123', cumulativeSeconds: 600 });
  assert.equal(parseUsageEventId('nope'), null);
});
