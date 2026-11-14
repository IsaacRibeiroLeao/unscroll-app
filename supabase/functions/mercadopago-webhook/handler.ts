import { decide, verifySignature } from './logic.ts';
import type { MpPayment } from './logic.ts';

export interface Deps {
  /** Webhook secret from the Mercado Pago dashboard (Your integrations > Webhooks). */
  secret: string;
  /** GET /v1/payments/{id} with our access token; null when the payment does not exist. */
  fetchPayment(id: string): Promise<MpPayment | null>;
  /** apply_web_payment; resolves to false for an already-recorded payment. */
  applyPayment(args: {
    userId: string;
    plan: string;
    paymentId: string;
    amountCents: number;
  }): Promise<boolean>;
  /** revoke_web_payment; resolves to whether something was revoked. */
  revokePayment(paymentId: string): Promise<boolean>;
  log: (event: Record<string, unknown>) => void;
}

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export async function handle(req: Request, deps: Deps): Promise<Response> {
  if (req.method !== 'POST') return json({ code: 'METHOD_NOT_ALLOWED' }, 405);

  const url = new URL(req.url);
  let body: { type?: unknown; data?: { id?: unknown } } = {};
  try {
    body = await req.json();
  } catch {
    // Some notifications carry everything in the query string.
  }
  const bodyId = body.data?.id;
  const dataId = url.searchParams.get('data.id') ?? (bodyId !== undefined ? String(bodyId) : null);
  const type = url.searchParams.get('type') ?? (typeof body.type === 'string' ? body.type : null);

  const valid = await verifySignature({
    signatureHeader: req.headers.get('x-signature'),
    requestId: req.headers.get('x-request-id'),
    dataId: url.searchParams.get('data.id'),
    secret: deps.secret,
  });
  if (!valid) return json({ code: 'UNAUTHORIZED' }, 401);

  if (type !== 'payment' || !dataId || !/^\d+$/.test(dataId)) {
    return json({ ok: true, applied: false }, 200);
  }

  try {
    const payment = await deps.fetchPayment(dataId);
    if (!payment) {
      deps.log({ event: 'mp_not_found' });
      return json({ ok: true, applied: false }, 200);
    }
    const decision = decide(payment);
    if (decision.action === 'ignore') {
      deps.log({ event: 'mp_ignored', reason: decision.reason, status: payment.status });
      return json({ ok: true, applied: false }, 200);
    }
    if (decision.action === 'revoke') {
      const revoked = await deps.revokePayment(dataId);
      deps.log({ event: 'mp_revoked', revoked });
      return json({ ok: true, applied: revoked }, 200);
    }
    const applied = await deps.applyPayment({
      userId: decision.ref.userId,
      plan: decision.ref.plan,
      paymentId: dataId,
      amountCents: decision.amountCents,
    });
    deps.log({ event: 'mp_applied', plan: decision.ref.plan, applied });
    return json({ ok: true, applied }, 200);
  } catch {
    deps.log({ event: 'mp_error' });
    return json({ code: 'INTERNAL' }, 500); // non-2xx: Mercado Pago retries
  }
}
