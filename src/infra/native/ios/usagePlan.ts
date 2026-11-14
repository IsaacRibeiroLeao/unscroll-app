// Pure helpers for the iOS "consume by real usage" strategy (decision D1). No native imports.
//
// Strategy: every time the balance is (re)synced we start a NEW DeviceActivity monitor whose
// schedule begins "now" and whose events are cumulative usage thresholds of the blocked apps
// (u-300, u-600, ..., u-<balance>). The last event re-applies the Shield from the Monitor
// extension, so it works with the app killed. The intermediate events only exist to be counted.
//
// IMPORTANT: react-native-device-activity parses event keys with key.split('_'), so activity and
// event names must NOT contain underscores. We use '-' as separator.

export const MAX_BALANCE_SECONDS = 7200; // keep in sync with private.max_balance_seconds() in SQL
export const USAGE_STEP_SECONDS = 300; // granularity of progress events (TODO(verificar) on device)
export const WINDOW_MS = 24 * 60 * 60 * 1000;
export const ACTIVITY_PREFIX = 'unscroll-usage-';
export const EVENT_PREFIX = 'u-';

export interface DateComponentsLite {
  year?: number;
  month?: number;
  day?: number;
  hour?: number;
  minute?: number;
  second?: number;
}

export interface PlannedEvent {
  eventName: string;
  seconds: number;
  threshold: DateComponentsLite;
}

export interface UsagePlan {
  activityName: string;
  startsAtMs: number;
  endsAtMs: number;
  events: PlannedEvent[];
  finalEventName: string;
}

export function secondsToThreshold(total: number): DateComponentsLite {
  return {
    hour: Math.floor(total / 3600),
    minute: Math.floor((total % 3600) / 60),
    second: total % 60,
  };
}

export function eventNameFor(seconds: number): string {
  return `${EVENT_PREFIX}${seconds}`;
}

export function activityNameFor(nowMs: number): string {
  return `${ACTIVITY_PREFIX}${nowMs}`;
}

export function clampBalance(seconds: number): number {
  if (!Number.isFinite(seconds) || seconds <= 0) return 0;
  return Math.min(MAX_BALANCE_SECONDS, Math.floor(seconds));
}

export function toDateComponents(ms: number): DateComponentsLite {
  const d = new Date(ms);
  return {
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate(),
    hour: d.getHours(),
    minute: d.getMinutes(),
    second: d.getSeconds(),
  };
}

/** Builds the monitor plan for `balanceSeconds` (must be > 0). */
export function buildUsagePlan(
  balanceSeconds: number,
  nowMs: number,
  stepSeconds: number = USAGE_STEP_SECONDS,
): UsagePlan {
  const total = clampBalance(balanceSeconds);
  if (total <= 0) throw new Error('buildUsagePlan requires a positive balance');
  const step = Math.max(60, Math.floor(stepSeconds));

  const seconds: number[] = [];
  for (let s = step; s < total; s += step) seconds.push(s);
  seconds.push(total);

  return {
    activityName: activityNameFor(nowMs),
    startsAtMs: nowMs,
    endsAtMs: nowMs + WINDOW_MS,
    events: seconds.map((s) => ({
      eventName: eventNameFor(s),
      seconds: s,
      threshold: secondsToThreshold(s),
    })),
    finalEventName: eventNameFor(total),
  };
}

export interface RecordedEvent {
  activityName: string;
  callbackName: string;
  eventName?: string;
}

/** Cumulative seconds consumed in a window = the largest u-<n> threshold recorded (capped). */
export function consumedSeconds(
  events: readonly RecordedEvent[],
  activityName: string,
  grantedSeconds: number,
): number {
  let max = 0;
  for (const e of events) {
    if (e.activityName !== activityName || e.callbackName !== 'eventDidReachThreshold') continue;
    if (!e.eventName?.startsWith(EVENT_PREFIX)) continue;
    const n = Number(e.eventName.slice(EVENT_PREFIX.length));
    if (Number.isInteger(n) && n > max) max = n;
  }
  return Math.min(max, grantedSeconds);
}

export function intervalEnded(
  events: readonly RecordedEvent[],
  activityName: string,
  endsAtMs: number,
  nowMs: number,
): boolean {
  if (nowMs >= endsAtMs) return true;
  return events.some((e) => e.activityName === activityName && e.callbackName === 'intervalDidEnd');
}

export function usageEventId(activityName: string, cumulativeSeconds: number): string {
  return `${activityName}:${cumulativeSeconds}`;
}

export function parseUsageEventId(
  eventId: string,
): { activityName: string; cumulativeSeconds: number } | null {
  const i = eventId.lastIndexOf(':');
  if (i <= 0) return null;
  const n = Number(eventId.slice(i + 1));
  return Number.isInteger(n) && n >= 0 ? { activityName: eventId.slice(0, i), cumulativeSeconds: n } : null;
}
