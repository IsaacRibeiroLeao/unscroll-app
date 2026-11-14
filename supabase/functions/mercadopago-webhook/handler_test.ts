import { assertEquals } from '@std/assert';
import { handle } from './handler.ts';
import type { Deps } from './handler.ts';
import { decide, parseReference, verifySignature } from './logic.ts';
import type { MpPayment } from './logic.ts';

const UID = '11111111-1111-4111-8111-111111111111';
const SECRET = 'whsec';
const REF = `${UID}:monthly:2490:nonce`;

const payment = (over: Partial<MpPayment> = {}): MpPayment => ({
  status: 'approved',
  currency_id: 'BRL',
  transaction_amount: 24.9,
  external_reference: REF,
  ...over,
});

async function sign(dataId: string, requestId: string, ts: string, secret = SECRET) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(manifest));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function make(over: Partial<Deps> = {}) {
  const applied: unknown[] = [];
  const revoked: string[] = [];
  const deps: Deps = {
    secret: SECRET,
    log: () => {},
    fetchPayment: async () => payment(),
    applyPayment: async (a) => {
      applied.push(a);
      return true;
    },
    revokePayment: async (id) => {
      revoked.push(id);
      return true;
    },
    ...over,
  };
  return { deps, applied, revoked };
}

async function notify(opts: { dataId?: string; type?: string; badSig?: boolean; noSig?: boolean } = {}) {
  const dataId = opts.dataId ?? '123456';
  const ts = '1700000000';
  const v1 = opts.badSig ? 'deadbeef' : await sign(dataId, 'req-1', ts);
  const headers: Record<string, string> = { 'x-request-id': 'req-1' };
  if (!opts.noSig) headers['x-signature'] = `ts=${ts},v1=${v1}`;
  return new Request(`https://x/f?data.id=${dataId}&type=${opts.type ?? 'payment'}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ type: opts.type ?? 'payment', data: { id: dataId } }),
  });
}

Deno.test('rejects missing or wrong signatures', async () => {
  const { deps, applied } = make();
  assertEquals((await handle(await notify({ noSig: true }), deps)).status, 401);
  assertEquals((await handle(await notify({ badSig: true }), deps)).status, 401);
  assertEquals(applied.length, 0);
});

Deno.test('rejects a signature made with another secret', async () => {
  const { deps } = make({ secret: 'other' });
  assertEquals((await handle(await notify(), deps)).status, 401);
});

Deno.test('non-POST is 405', async () => {
  const { deps } = make();
  assertEquals((await handle(new Request('https://x/f'), deps)).status, 405);
});

Deno.test('approved payment grants Pro using the fetched payment, not the notification', async () => {
  const { deps, applied } = make();
  const res = await handle(await notify(), deps);
  assertEquals(res.status, 200);
  assertEquals(await res.json(), { ok: true, applied: true });
  assertEquals(applied, [{ userId: UID, plan: 'monthly', paymentId: '123456', amountCents: 2490 }]);
});

Deno.test('duplicate delivery is acknowledged without a second grant', async () => {
  const { deps } = make({ applyPayment: async () => false });
  const res = await handle(await notify(), deps);
  assertEquals(res.status, 200);
  assertEquals(await res.json(), { ok: true, applied: false });
});

Deno.test('other event types and bad ids are ignored with 200', async () => {
  const { deps, applied } = make();
  assertEquals((await handle(await notify({ type: 'merchant_order' }), deps)).status, 200);
  assertEquals((await handle(await notify({ dataId: 'abc' }), deps)).status, 200);
  assertEquals(applied.length, 0);
});

Deno.test('pending / rejected payments grant nothing', async () => {
  for (const status of ['pending', 'rejected', 'cancelled', 'in_process']) {
    const { deps, applied } = make({ fetchPayment: async () => payment({ status }) });
    assertEquals((await handle(await notify(), deps)).status, 200);
    assertEquals(applied.length, 0, status);
  }
});

Deno.test('refund and chargeback revoke the payment', async () => {
  for (const status of ['refunded', 'charged_back']) {
    const { deps, revoked } = make({ fetchPayment: async () => payment({ status }) });
    assertEquals((await handle(await notify(), deps)).status, 200);
    assertEquals(revoked, ['123456'], status);
  }
});

Deno.test('unknown payment id is acknowledged', async () => {
  const { deps, applied } = make({ fetchPayment: async () => null });
  assertEquals((await handle(await notify(), deps)).status, 200);
  assertEquals(applied.length, 0);
});

Deno.test('transient failures return 500 so Mercado Pago retries', async () => {
  const a = make({
    fetchPayment: async () => {
      throw new Error('mp_503');
    },
  });
  assertEquals((await handle(await notify(), a.deps)).status, 500);
  const b = make({
    applyPayment: async () => {
      throw new Error('db down');
    },
  });
  assertEquals((await handle(await notify(), b.deps)).status, 500);
});

Deno.test('decide validates reference, currency and amount', () => {
  assertEquals(decide(payment()).action, 'grant');
  assertEquals(decide(payment({ external_reference: null })).action, 'ignore');
  assertEquals(decide(payment({ external_reference: 'garbage' })).action, 'ignore');
  assertEquals(decide(payment({ currency_id: 'USD' })).action, 'ignore');
  assertEquals(decide(payment({ transaction_amount: 1 })).action, 'ignore');
  assertEquals(decide(payment({ transaction_amount: 24.90000001 })).action, 'grant');
});

Deno.test('parseReference', () => {
  assertEquals(parseReference(REF), { userId: UID, plan: 'monthly', amountCents: 2490 });
  assertEquals(parseReference(`${UID}:gold:2490:n`), null);
  assertEquals(parseReference(`${UID}:annual:0:n`), null);
  assertEquals(parseReference(`not-a-uuid:annual:100:n`), null);
  assertEquals(parseReference(null), null);
});

Deno.test('verifySignature handles malformed headers', async () => {
  const base = { requestId: 'r', dataId: '1', secret: SECRET };
  assertEquals(await verifySignature({ ...base, signatureHeader: null }), false);
  assertEquals(await verifySignature({ ...base, signatureHeader: 'garbage' }), false);
  assertEquals(await verifySignature({ ...base, signatureHeader: 'ts=1' }), false);
  const v1 = await sign('abc', 'r', '9');
  assertEquals(
    await verifySignature({ ...base, dataId: 'ABC', signatureHeader: `ts=9,v1=${v1}` }),
    true,
  );
});
