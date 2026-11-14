// Formatting helpers for the screen-time balance. Pure, locale-independent.

/** Balance cap in seconds (2 h). Keep in sync with private.max_balance_seconds() in SQL. */
export const BALANCE_CAP_SECONDS = 7200;

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

/** "1h 20min", "45min", "0min": the headline form of the balance (no seconds). */
export function formatBalanceLong(seconds: number): string {
  const s = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${pad(m)}min` : `${m}min`;
}

export type DayPart = 'morning' | 'afternoon' | 'evening';

/** Greeting bucket from the local hour (0-23): morning until 11:59, afternoon until 17:59. */
export function dayPart(hour: number): DayPart {
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}
