// Pure rules for Mercado Pago payment notifications.

export interface MpPayment {
  status: string;
  currency_id: string;
  transaction_amount: number;
  external_reference: string | null;
}

export interface Reference {
  userId: string;
  plan: 'monthly' | 'annual' | 'lifetime';
  amountCents: number;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Parses `userId:plan:amountCents:nonce` (written by create-checkout). */
export function parseReference(ref: string | null): Reference | null {
  if (!ref) return null;
  const [userId, plan, amount] = ref.split(':');
  if (!userId || !UUID_RE.test(userId)) return null;
  if (plan !== 'monthly' && plan !== 'annual' && plan !== 'lifetime') return null;
  const amountCents = Number(amount);
  if (!Number.isInteger(amountCents) || amountCents <= 0) return null;
  return { userId, plan, amountCents };
}

export type Decision =
  | { action: 'grant'; ref: Reference; amountCents: number }
  | { action: 'revoke' }
  | { action: 'ignore'; reason: string };

/** Decides from the payment fetched straight from Mercado Pago (never from the notification body). */
export function decide(payment: MpPayment): Decision {
  if (payment.status === 'refunded' || payment.status === 'charged_back') {
    return { action: 'revoke' };
  }
  if (payment.status !== 'approved') return { action: 'ignore', reason: 'not_approved' };
  const ref = parseReference(payment.external_reference);
  if (!ref) return { action: 'ignore', reason: 'bad_reference' };
  if (payment.currency_id !== 'BRL') return { action: 'ignore', reason: 'bad_currency' };
  const amountCents = Math.round(payment.transaction_amount * 100);
  if (amountCents !== ref.amountCents) return { action: 'ignore', reason: 'amount_mismatch' };
  return { action: 'grant', ref, amountCents };
}

function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Validates the `x-signature` header (`ts=...,v1=...`): HMAC-SHA256 of
 * `id:<data.id>;request-id:<x-request-id>;ts:<ts>;` keyed with the webhook secret.
 */
export async function verifySignature(args: {
  signatureHeader: string | null;
  requestId: string | null;
  dataId: string | null;
  secret: string;
}): Promise<boolean> {
  if (!args.signatureHeader) return false;
  const parts = Object.fromEntries(
    args.signatureHeader.split(',').map((kv) => {
      const [k, ...v] = kv.trim().split('=');
      return [k, v.join('=')];
    }),
  );
  const ts = parts['ts'];
  const v1 = parts['v1'];
  if (!ts || !v1) return false;

  let manifest = '';
  if (args.dataId) manifest += `id:${args.dataId.toLowerCase()};`;
  if (args.requestId) manifest += `request-id:${args.requestId};`;
  manifest += `ts:${ts};`;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(args.secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const expected = toHex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(manifest)));
  return timingSafeEqual(expected, v1.toLowerCase());
}
