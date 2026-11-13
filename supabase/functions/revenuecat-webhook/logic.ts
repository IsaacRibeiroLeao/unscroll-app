// Pure rules for turning a RevenueCat webhook event into a Pro on/off decision.

export interface RcEvent {
  id: string;
  type: string;
  app_user_id?: string;
  original_app_user_id?: string;
  aliases?: string[];
  expiration_at_ms?: number | null;
  event_timestamp_ms?: number;
}

export type Decision = { action: 'set'; isPro: boolean } | { action: 'ignore'; reason: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Events that (re)grant access until `expiration_at_ms`.
const GRANT = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'PRODUCT_CHANGE',
  'UNCANCELLATION',
  'NON_RENEWING_PURCHASE',
  'SUBSCRIPTION_EXTENDED',
  'TEMPORARY_ENTITLEMENT_GRANT',
]);

export function parseEvent(body: unknown): RcEvent | null {
  if (typeof body !== 'object' || body === null) return null;
  const e = (body as { event?: unknown }).event;
  if (typeof e !== 'object' || e === null) return null;
  const ev = e as Record<string, unknown>;
  if (typeof ev.id !== 'string' || typeof ev.type !== 'string') return null;
  return {
    id: ev.id,
    type: ev.type,
    app_user_id: typeof ev.app_user_id === 'string' ? ev.app_user_id : undefined,
    original_app_user_id:
      typeof ev.original_app_user_id === 'string' ? ev.original_app_user_id : undefined,
    aliases: Array.isArray(ev.aliases)
      ? ev.aliases.filter((a): a is string => typeof a === 'string')
      : undefined,
    expiration_at_ms: typeof ev.expiration_at_ms === 'number' ? ev.expiration_at_ms : null,
    event_timestamp_ms:
      typeof ev.event_timestamp_ms === 'number' ? ev.event_timestamp_ms : undefined,
  };
}

/** The app logs in to RevenueCat with the Supabase user id; anonymous ids ($RCAnonymousID...) are skipped. */
export function resolveUserId(e: RcEvent): string | null {
  const candidates = [e.app_user_id, e.original_app_user_id, ...(e.aliases ?? [])];
  const found = candidates.find((c): c is string => typeof c === 'string' && UUID_RE.test(c));
  return found ? found.toLowerCase() : null;
}

/**
 * CANCELLATION / BILLING_ISSUE keep access until the period ends (EXPIRATION arrives later), so
 * they are ignored. A refund-cancellation therefore revokes at the next EXPIRATION event.
 */
export function decide(e: RcEvent, nowMs: number): Decision {
  if (GRANT.has(e.type)) {
    const exp = e.expiration_at_ms;
    return { action: 'set', isPro: exp == null ? true : exp > nowMs };
  }
  if (e.type === 'EXPIRATION') return { action: 'set', isPro: false };
  return { action: 'ignore', reason: e.type };
}

/** Constant-time comparison for the shared secret. */
export function secretsMatch(provided: string | null, expected: string): boolean {
  if (provided === null) return false;
  const a = new TextEncoder().encode(provided);
  const b = new TextEncoder().encode(expected);
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}
