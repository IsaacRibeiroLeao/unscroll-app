// create-checkout — builds a Mercado Pago Checkout Pro link (Pix / card) for the signed-in user.
// Secrets: MP_ACCESS_TOKEN. JWT verification stays ON (only signed-in users can start a checkout).
import { createClient } from '@supabase/supabase-js';
import { handle } from './handler.ts';

function requireEnv(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

const url = requireEnv('SUPABASE_URL');
const admin = createClient(url, requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { persistSession: false, autoRefreshToken: false },
});
const mpToken = requireEnv('MP_ACCESS_TOKEN');

Deno.serve((req) =>
  handle(req, {
    notificationUrl: `${url}/functions/v1/mercadopago-webhook`,
    nonce: () => crypto.randomUUID(),
    log: (e) => console.log(JSON.stringify(e)),
    async getUser(r) {
      const token = r.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
      if (!token) return null;
      const { data, error } = await admin.auth.getUser(token);
      if (error || !data.user) return null;
      return { id: data.user.id, email: data.user.email ?? null };
    },
    async founderCount() {
      const { count, error } = await admin
        .from('payments')
        .select('id', { count: 'exact', head: true })
        .eq('plan', 'lifetime')
        .eq('status', 'approved');
      if (error) throw new Error(error.message);
      return count ?? 0;
    },
    async hasLifetime(userId) {
      const { data, error } = await admin
        .from('profiles')
        .select('pro_lifetime')
        .eq('id', userId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data?.pro_lifetime === true;
    },
    async createPreference(body) {
      const res = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: { Authorization: `Bearer ${mpToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`mp_${res.status}`);
      const out = (await res.json()) as { init_point?: string };
      if (!out.init_point) throw new Error('mp_no_init_point');
      return out.init_point;
    },
  }),
);
