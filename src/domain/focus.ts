// Reading/study focus timer. Pure: all clock reads are passed in, so it is trivially testable.

export const FOCUS_MINUTES = [15, 30, 45, 60] as const;
export const DEFAULT_FOCUS_MINUTES = 30;

export interface FocusSession {
  taskId: string;
  book: string;
  chapter: string;
  /** Epoch ms when the timer started. */
  startedAt: number;
  minutes: number;
  /** True when every blocked app is locked until the timer ends. */
  lockApps: boolean;
}

export function endsAt(s: FocusSession): number {
  return s.startedAt + s.minutes * 60_000;
}

/** Whole seconds left, never negative; a clock set back before the start counts as the full length. */
export function remainingSeconds(s: FocusSession, now: number): number {
  const total = s.minutes * 60;
  const elapsed = Math.max(0, Math.floor((now - s.startedAt) / 1000));
  return Math.max(0, total - elapsed);
}

export function isFinished(s: FocusSession, now: number): boolean {
  return remainingSeconds(s, now) <= 0;
}

/** 0..1 */
export function progress(s: FocusSession, now: number): number {
  const total = s.minutes * 60;
  return total <= 0 ? 1 : Math.min(1, Math.max(0, 1 - remainingSeconds(s, now) / total));
}

export function isValidMinutes(m: number): boolean {
  return (FOCUS_MINUTES as readonly number[]).includes(m);
}

/** Parses a stored session defensively; anything odd becomes null. */
export function parseSession(raw: string | null): FocusSession | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as Partial<FocusSession>;
    if (
      typeof o.taskId !== 'string' ||
      typeof o.startedAt !== 'number' ||
      typeof o.minutes !== 'number' ||
      !isValidMinutes(o.minutes)
    ) {
      return null;
    }
    return {
      taskId: o.taskId,
      book: typeof o.book === 'string' ? o.book : '',
      chapter: typeof o.chapter === 'string' ? o.chapter : '',
      startedAt: o.startedAt,
      minutes: o.minutes,
      lockApps: o.lockApps === true,
    };
  } catch {
    return null;
  }
}
