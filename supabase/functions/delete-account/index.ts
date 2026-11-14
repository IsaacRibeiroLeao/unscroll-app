// delete-account — permanently deletes the signed-in user's account, photos and data (LGPD).
// JWT verification stays ON. Uses the service role only for the caller's own id.
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
    log: (e) => console.log(JSON.stringify(e)),
    async getUserId(r) {
      const token = r.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
      if (!token) return null;
      const { data, error } = await admin.auth.getUser(token);
      return error || !data.user ? null : data.user.id;
    },
    async deleteProofs(userId) {
      const bucket = admin.storage.from('proofs');
      for (;;) {
        const { data, error } = await bucket.list(userId, { limit: 100 });
        if (error) throw new Error(error.message);
        if (!data || data.length === 0) return;
        const { error: rmError } = await bucket.remove(data.map((f) => `${userId}/${f.name}`));
        if (rmError) throw new Error(rmError.message);
      }
    },
    async deleteUser(userId) {
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) throw new Error(error.message);
    },
  }),
);
