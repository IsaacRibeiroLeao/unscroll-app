import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  DEFAULT_FOCUS_MINUTES,
  endsAt,
  isFinished,
  parseSession,
  progress,
  remainingSeconds,
  type FocusSession,
} from '../focus.ts';
import { partitionApps } from '../distractingApps.ts';
import { moodFor, toMascotSkin } from '../mascot.ts';
import { levelFromXp, xpToReachLevel } from '../progression.ts';
import { dayPart, formatBalance, formatBalanceLong, wholeMinutes } from '../time.ts';

test('level thresholds follow 100*n per level', () => {
  assert.equal(xpToReachLevel(1), 0);
  assert.equal(xpToReachLevel(2), 100);
  assert.equal(xpToReachLevel(3), 300);
  assert.equal(xpToReachLevel(4), 600);
});

test('levelFromXp handles boundaries and bad input', () => {
  assert.deepEqual(levelFromXp(0), { level: 1, xpIntoLevel: 0, xpForNext: 100, progress: 0 });
  assert.equal(levelFromXp(99).level, 1);
  assert.equal(levelFromXp(100).level, 2);
  assert.deepEqual(levelFromXp(250), {
    level: 2,
    xpIntoLevel: 150,
    xpForNext: 200,
    progress: 0.75,
  });
  assert.equal(levelFromXp(299).level, 2);
  assert.equal(levelFromXp(300).level, 3);
  assert.equal(levelFromXp(-5).level, 1);
  assert.equal(levelFromXp(Number.NaN).level, 1);
  const big = levelFromXp(1_000_000);
  assert.ok(xpToReachLevel(big.level) <= 1_000_000 && xpToReachLevel(big.level + 1) > 1_000_000);
});

test('formatBalance', () => {
  assert.equal(formatBalance(0), '00:00');
  assert.equal(formatBalance(1145), '19:05');
  assert.equal(formatBalance(3600), '1h 00min');
  assert.equal(formatBalance(7200), '2h 00min');
  assert.equal(formatBalance(3900), '1h 05min');
  assert.equal(formatBalance(-1), '00:00');
  assert.equal(wholeMinutes(119), 1);
});

test('mascot helpers', () => {
  assert.equal(toMascotSkin('mascot_skin_fire'), 'mascot_skin_fire');
  assert.equal(toMascotSkin('future_skin'), 'default');
  assert.equal(moodFor(0, 30), 'sleepy');
  assert.equal(moodFor(60, 3), 'happy');
  assert.equal(moodFor(60, 7), 'proud');
});

test('formatBalanceLong drops seconds', () => {
  assert.equal(formatBalanceLong(0), '0min');
  assert.equal(formatBalanceLong(59), '0min');
  assert.equal(formatBalanceLong(45 * 60 + 30), '45min');
  assert.equal(formatBalanceLong(80 * 60), '1h 20min');
  assert.equal(formatBalanceLong(Number.NaN), '0min');
});

test('dayPart buckets the local hour', () => {
  assert.equal(dayPart(5), 'morning');
  assert.equal(dayPart(11), 'morning');
  assert.equal(dayPart(12), 'afternoon');
  assert.equal(dayPart(17), 'afternoon');
  assert.equal(dayPart(18), 'evening');
  assert.equal(dayPart(23), 'evening');
});

test('partitionApps puts known doom-scroll apps first, in catalog order', () => {
  const apps = [
    { packageName: 'com.calc' },
    { packageName: 'com.zhiliaoapp.musically' },
    { packageName: 'com.instagram.android' },
    { packageName: 'com.maps' },
  ];
  const { suggested, others } = partitionApps(apps);
  assert.deepEqual(
    suggested.map((a) => a.packageName),
    ['com.instagram.android', 'com.zhiliaoapp.musically'],
  );
  assert.deepEqual(
    others.map((a) => a.packageName),
    ['com.calc', 'com.maps'],
  );
});

const session: FocusSession = { taskId: 't', book: 'b', chapter: 'c', startedAt: 1_000_000, minutes: 30, lockApps: true };

test('focus: default is 30 minutes', () => assert.equal(DEFAULT_FOCUS_MINUTES, 30));
test('focus: counts down and finishes', () => {
  assert.equal(remainingSeconds(session, session.startedAt), 1800);
  assert.equal(remainingSeconds(session, session.startedAt + 60_000), 1740);
  assert.equal(isFinished(session, endsAt(session) - 1000), false);
  assert.equal(isFinished(session, endsAt(session)), true);
  assert.equal(remainingSeconds(session, endsAt(session) + 99_999), 0);
});
test('focus: a clock set back cannot extend the timer', () => {
  assert.equal(remainingSeconds(session, session.startedAt - 5_000_000), 1800);
});
test('focus: progress is clamped', () => {
  assert.equal(progress(session, session.startedAt), 0);
  assert.equal(progress(session, endsAt(session) + 1), 1);
});
test('focus: parseSession round-trips and rejects junk', () => {
  assert.deepEqual(parseSession(JSON.stringify(session)), session);
  assert.equal(parseSession('nope'), null);
  assert.equal(parseSession(JSON.stringify({ ...session, minutes: 7 })), null);
  assert.equal(parseSession(null), null);
});
