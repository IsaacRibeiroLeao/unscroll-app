// mercadopago-webhook — the ONLY writer of web-purchased Pro (via apply_web_payment).
// Mercado Pago dashboard: Your integrations > Webhooks > URL = <project>/functions/v1/mercadopago-webhook,
// event "Payments". Secrets: MP_ACCESS_TOKEN, MP_WEBHOOK_SECRET. Deploy with verify_jwt OFF.
import { createClient } from '@supabase/supabase-js';
import { handle } from './handler.ts';

function requireEnv(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

const admin = createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { persistSession: false, autoRefreshToken: false },
});
const mpToken = requireEnv('MP_ACCESS_TOKEN');

Deno.serve((req) =>
  handle(req, {
    secret: requireEnv('MP_WEBHOOK_SECRET'),
    log: (e) => console.log(JSON.stringify(e)),
    async fetchPayment(id) {
      const res = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
        headers: { Authorization: `Bearer ${mpToken}` },
      });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`mp_${res.status}`);
      return await res.json();
    },
    async applyPayment({ userId, plan, paymentId, amountCents }) {
      const { data, error } = await admin.rpc('apply_web_payment', {
        p_user_id: userId,
        p_plan: plan,
        p_provider_payment_id: paymentId,
        p_amount_cents: amountCents,
      });
      if (error) throw new Error(error.message);
      return data === true;
    },
    async revokePayment(paymentId) {
      const { data, error } = await admin.rpc('revoke_web_payment', {
        p_provider_payment_id: paymentId,
      });
      if (error) throw new Error(error.message);
      return data === true;
    },
  }),
);
