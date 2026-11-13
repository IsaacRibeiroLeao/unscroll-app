// Formatting helpers for the screen-time balance. Pure, locale-independent.

const pad = (n: number): string => String(n).padStart(2, '0');

/** "19:05" under one hour, "1h 05min" from one hour up. Negative/NaN count as zero. */
export function formatBalance(seconds: number): string {
  const s = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${pad(m)}min`;
  return `${pad(m)}:${pad(s % 60)}`;
}

/** Whole minutes, rounded down ("amount shown next to a reward"). */
export function wholeMinutes(seconds: number): number {
  return Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds / 60)) : 0;
}
