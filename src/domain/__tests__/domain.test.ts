import assert from 'node:assert/strict';
import { test } from 'node:test';
import { moodFor, toMascotSkin } from '../mascot.ts';
import { levelFromXp, xpToReachLevel } from '../progression.ts';
import { formatBalance, wholeMinutes } from '../time.ts';

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
