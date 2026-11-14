import { assertEquals } from '@std/assert';
import { handle } from './handler.ts';
import type { Deps } from './handler.ts';

function make(over: Partial<Deps> = {}) {
  const order: string[] = [];
  const deps: Deps = {
    getUserId: async () => 'u1',
    deleteProofs: async (id) => {
      order.push(`proofs:${id}`);
    },
    deleteUser: async (id) => {
      order.push(`user:${id}`);
    },
    log: () => {},
    ...over,
  };
  return { deps, order };
}
const post = () => new Request('https://x/f', { method: 'POST', headers: { Authorization: 'Bearer t' } });

Deno.test('deletes photos then the user, only for the caller', async () => {
  const { deps, order } = make();
  const res = await handle(post(), deps);
  assertEquals(res.status, 200);
  assertEquals(order, ['proofs:u1', 'user:u1']);
});

Deno.test('requires POST and a valid token', async () => {
  const a = make({ getUserId: async () => null });
  assertEquals((await handle(post(), a.deps)).status, 401);
  assertEquals(a.order, []);
  assertEquals((await handle(new Request('https://x/f'), make().deps)).status, 405);
});

Deno.test('a failed photo cleanup keeps the account so the user can retry', async () => {
  const { deps, order } = make({
    deleteProofs: async () => {
      throw new Error('storage down');
    },
  });
  const res = await handle(post(), deps);
  assertEquals(res.status, 500);
  assertEquals(await res.json(), { code: 'INTERNAL' });
  assertEquals(order, []);
});

Deno.test('a failed user deletion is a 500 without leaking details', async () => {
  const { deps } = make({
    deleteUser: async () => {
      throw new Error('secret db detail');
    },
  });
  const res = await handle(post(), deps);
  assertEquals(res.status, 500);
  assertEquals(await res.json(), { code: 'INTERNAL' });
});
