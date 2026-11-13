// revenuecat-webhook — the ONLY writer of profiles.is_pro.
// RevenueCat dashboard: Integrations > Webhooks > URL = <project>/functions/v1/revenuecat-webhook,
// Authorization header value = the REVENUECAT_WEBHOOK_SECRET secret. Deploy with --no-verify-jwt.
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

Deno.serve((req) =>
  handle(req, {
    secret: requireEnv('REVENUECAT_WEBHOOK_SECRET'),
    now: () => Date.now(),
    log: (e) => console.log(JSON.stringify(e)),
    async applyProStatus(userId, isPro, eventAtIso) {
      const { data, error } = await admin.rpc('apply_pro_status', {
        p_user_id: userId,
        p_is_pro: isPro,
        p_event_at: eventAtIso,
      });
      if (error) throw new Error(error.message);
      return data === true;
    },
  }),
);
