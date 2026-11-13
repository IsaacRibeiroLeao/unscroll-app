// Display-only progression math. The server owns XP; this only turns the server's XP total into
// "level N, x / y". Rule: going from level n to n+1 costs 100 * n XP (so reaching level L needs
// 50 * L * (L - 1) XP in total).

export interface LevelInfo {
  level: number;
  /** XP accumulated inside the current level. */
  xpIntoLevel: number;
  /** XP needed to finish the current level (100 * level). */
  xpForNext: number;
  /** 0..1 */
  progress: number;
}

/** Total XP needed to reach `level` (level 1 = 0 XP). */
export function xpToReachLevel(level: number): number {
  const l = Math.max(1, Math.floor(level));
  return 50 * l * (l - 1);
}

export function levelFromXp(xp: number): LevelInfo {
  const safe = Number.isFinite(xp) ? Math.max(0, Math.floor(xp)) : 0;
  let level = Math.max(1, Math.floor((1 + Math.sqrt(1 + (4 * safe) / 50)) / 2));
  // Guard against floating point error at the exact boundaries.
  while (xpToReachLevel(level) > safe) level -= 1;
  while (xpToReachLevel(level + 1) <= safe) level += 1;
  const xpIntoLevel = safe - xpToReachLevel(level);
  const xpForNext = 100 * level;
  return { level, xpIntoLevel, xpForNext, progress: xpIntoLevel / xpForNext };
}
