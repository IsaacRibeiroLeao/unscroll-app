import { assertEquals } from '@std/assert';
import { handle } from './handler.ts';
import type { Deps } from './handler.ts';
import { buildPreference, buildReference, FOUNDER_LIMIT, listPlans } from './logic.ts';

const UID = '11111111-1111-4111-8111-111111111111';

function make(over: Partial<Deps> = {}) {
  const prefs: Record<string, unknown>[] = [];
  const deps: Deps = {
    getUser: async () => ({ id: UID, email: 'a@b.co' }),
    founderCount: async () => 0,
    hasLifetime: async () => false,
    createPreference: async (b) => {
      prefs.push(b);
      return 'https://mp/checkout/1';
    },
    notificationUrl: 'https://proj/functions/v1/mercadopago-webhook',
    nonce: () => 'n1',
    log: () => {},
    ...over,
  };
  return { deps, prefs };
}

const post = (body: unknown) =>
  new Request('https://x/f', { method: 'POST', headers: { Authorization: 'Bearer t' }, body: JSON.stringify(body) });

Deno.test('requires a signed-in user and POST', async () => {
  const { deps } = make({ getUser: async () => null });
  assertEquals((await handle(post({ plan: 'monthly' }), deps)).status, 401);
  assertEquals((await handle(new Request('https://x/f'), make().deps)).status, 405);
});

Deno.test('plans lists prices and founder spots', async () => {
  const { deps } = make({ founderCount: async () => 40 });
  const body = await (await handle(post({ action: 'plans' }), deps)).json();
  assertEquals(body.plans.map((p: { id: string }) => p.id), ['monthly', 'annual', 'lifetime']);
  assertEquals(body.plans[2].remaining, FOUNDER_LIMIT - 40);
  assertEquals(body.plans[0].priceCents, 2490);
});

Deno.test('creates a preference with server-side price, reference and webhook url', async () => {
  const { deps, prefs } = make();
  const res = await handle(post({ plan: 'annual', price: 1 }), deps);
  assertEquals(res.status, 200);
  assertEquals(await res.json(), { url: 'https://mp/checkout/1' });
  const p = prefs[0] as { items: { unit_price: number }[]; external_reference: string; notification_url: string; binary_mode: boolean };
  assertEquals(p.items[0].unit_price, 149.9);
  assertEquals(p.external_reference, `${UID}:annual:14990:n1`);
  assertEquals(p.notification_url, 'https://proj/functions/v1/mercadopago-webhook');
  assertEquals(p.binary_mode, true);
});

Deno.test('rejects unknown plans and bad json', async () => {
  const { deps } = make();
  assertEquals((await handle(post({ plan: 'gold' }), deps)).status, 400);
  assertEquals((await handle(post({}), deps)).status, 400);
  const bad = new Request('https://x/f', { method: 'POST', body: '{' });
  assertEquals((await handle(bad, deps)).status, 400);
});

Deno.test('founder plan: sold out and already owned are refused', async () => {
  const soldOut = make({ founderCount: async () => FOUNDER_LIMIT });
  assertEquals((await handle(post({ plan: 'lifetime' }), soldOut.deps)).status, 409);
  assertEquals(soldOut.prefs.length, 0);
  const owned = make({ hasLifetime: async () => true });
  const res = await handle(post({ plan: 'lifetime' }), owned.deps);
  assertEquals(res.status, 409);
  assertEquals((await res.json()).code, 'ALREADY_LIFETIME');
  const ok = make({ founderCount: async () => FOUNDER_LIMIT - 1 });
  assertEquals((await handle(post({ plan: 'lifetime' }), ok.deps)).status, 200);
});

Deno.test('provider failure becomes 500 without leaking details', async () => {
  const { deps } = make({
    createPreference: async () => {
      throw new Error('mp_401 secret detail');
    },
  });
  const res = await handle(post({ plan: 'monthly' }), deps);
  assertEquals(res.status, 500);
  assertEquals(await res.json(), { code: 'INTERNAL' });
});

Deno.test('logic helpers', () => {
  assertEquals(listPlans(FOUNDER_LIMIT + 5)[2].available, false);
  assertEquals(buildReference(UID, 'lifetime', 'z'), `${UID}:lifetime:7900:z`);
  assertEquals('payer' in buildPreference({ userId: UID, plan: 'monthly', nonce: 'a', notificationUrl: 'u' }), false);
});
