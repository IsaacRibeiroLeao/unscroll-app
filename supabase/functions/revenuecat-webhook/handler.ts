import { decide, parseEvent, resolveUserId, secretsMatch } from './logic.ts';

export interface Deps {
  /** Shared secret configured as the Authorization header value in the RevenueCat dashboard. */
  secret: string;
  now: () => number;
  /** Calls apply_pro_status; resolves to whether the row was updated. */
  applyProStatus(userId: string, isPro: boolean, eventAtIso: string): Promise<boolean>;
  log: (event: Record<string, unknown>) => void;
}

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export async function handle(req: Request, deps: Deps): Promise<Response> {
  if (req.method !== 'POST') return json({ code: 'METHOD_NOT_ALLOWED' }, 405);
  if (!secretsMatch(req.headers.get('Authorization'), deps.secret)) {
    return json({ code: 'UNAUTHORIZED' }, 401);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ code: 'INVALID_REQUEST' }, 400);
  }
  const event = parseEvent(body);
  if (!event) return json({ code: 'INVALID_REQUEST' }, 400);

  const now = deps.now();
  const decision = decide(event, now);
  if (decision.action === 'ignore') {
    deps.log({ event: 'rc_ignored', type: event.type });
    return json({ ok: true, applied: false }, 200);
  }

  const userId = resolveUserId(event);
  if (!userId) {
    // Not one of our users (anonymous RevenueCat id): acknowledge so RevenueCat stops retrying.
    deps.log({ event: 'rc_no_user', type: event.type });
    return json({ ok: true, applied: false }, 200);
  }

  try {
    const at = new Date(event.event_timestamp_ms ?? now).toISOString();
    const applied = await deps.applyProStatus(userId, decision.isPro, at);
    deps.log({ event: 'rc_applied', type: event.type, isPro: decision.isPro, applied });
    return json({ ok: true, applied }, 200);
  } catch {
    deps.log({ event: 'rc_error', type: event.type });
    return json({ code: 'INTERNAL' }, 500); // non-2xx: RevenueCat retries
  }
}
