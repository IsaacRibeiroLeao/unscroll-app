import { createClient } from '@supabase/supabase-js';
import { callGemini } from './gemini.ts';
import type { Deps, RpcRewardRow, TaskRow, ProfileRow } from './types.ts';

function requireEnv(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

/** Real implementation (service_role). Logs never contain user ids, paths or feedback text. */
export function createSupabaseDeps(): Deps {
  const admin = createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const apiKey = requireEnv('GEMINI_API_KEY');
  const model = Deno.env.get('GEMINI_MODEL') ?? 'gemini-2.5-flash';
  const log = (event: Record<string, unknown>) => console.log(JSON.stringify(event));

  const must = <T>(res: { data: T; error: { message: string } | null }, what: string): T => {
    if (res.error) throw new Error(`${what}: ${res.error.message}`);
    return res.data;
  };

  return {
    now: () => new Date(),
    allowedOrigin: Deno.env.get('ALLOWED_ORIGIN') ?? '*',
    log,

    async verifyJwt(token) {
      const { data, error } = await admin.auth.getUser(token);
      return error ? null : (data.user?.id ?? null);
    },

    storage: {
      async download(path) {
        const { data, error } = await admin.storage.from('proofs').download(path);
        if (error || !data) return null;
        return new Uint8Array(await data.arrayBuffer());
      },
      async remove(path) {
        const { error } = await admin.storage.from('proofs').remove([path]);
        if (error) throw new Error('storage_remove');
      },
    },

    gemini: (image, task) => callGemini({ apiKey, model, log }, image, task),

    db: {
      async getTask(taskId) {
        const res = await admin
          .from('tasks')
          .select('id,user_id,title,description,status')
          .eq('id', taskId)
          .maybeSingle();
        return must(res, 'getTask') as TaskRow | null;
      },
      async getProfile(userId) {
        const res = await admin
          .from('profiles')
          .select('timezone,is_pro')
          .eq('id', userId)
          .maybeSingle();
        return must(res, 'getProfile') as ProfileRow | null;
      },
      async hasCompletion(taskId, localDate) {
        const res = await admin
          .from('task_completions')
          .select('id', { count: 'exact', head: true })
          .eq('task_id', taskId)
          .eq('local_date', localDate);
        must(res, 'hasCompletion');
        return (res.count ?? 0) > 0;
      },
      async countCompletions(userId, localDate) {
        const res = await admin
          .from('task_completions')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('local_date', localDate);
        must(res, 'countCompletions');
        return res.count ?? 0;
      },
      async countFailedAttempts(taskId, localDate) {
        const res = await admin
          .from('task_verifications')
          .select('id', { count: 'exact', head: true })
          .eq('task_id', taskId)
          .eq('local_date', localDate)
          .in('code', ['REJECTED', 'LOW_QUALITY']);
        must(res, 'countFailedAttempts');
        return res.count ?? 0;
      },
      async hasApprovedHash(userId, hash) {
        const res = await admin
          .from('task_verifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('image_hash', hash)
          .eq('approved', true);
        must(res, 'hasApprovedHash');
        return (res.count ?? 0) > 0;
      },
      async lockTask(taskId, staleBeforeIso, nowIso) {
        const fresh = must(
          await admin
            .from('tasks')
            .update({ status: 'verifying' })
            .eq('id', taskId)
            .eq('status', 'pending')
            .select('id'),
          'lockTask',
        );
        if (fresh && fresh.length > 0) return 'locked';

        // Take over a stale lock (a previous run died while verifying).
        const stale = must(
          await admin
            .from('tasks')
            .update({ status: 'verifying', verifying_since: nowIso })
            .eq('id', taskId)
            .eq('status', 'verifying')
            .lt('verifying_since', staleBeforeIso)
            .select('id'),
          'lockTaskStale',
        );
        if (stale && stale.length > 0) return 'locked';

        const t = must(
          await admin.from('tasks').select('status').eq('id', taskId).maybeSingle(),
          'lockTaskRead',
        );
        return (t as { status?: string } | null)?.status === 'completed' ? 'completed' : 'busy';
      },
      async unlockTask(taskId) {
        must(
          await admin
            .from('tasks')
            .update({ status: 'pending' })
            .eq('id', taskId)
            .eq('status', 'verifying')
            .select('id'),
          'unlockTask',
        );
      },
      async completeTask(taskId, userId) {
        const { data, error } = await admin.rpc('complete_task_and_reward', {
          p_task_id: taskId,
          p_user_id: userId,
        });
        if (error) return { ok: false, error: error.message };
        const row = (Array.isArray(data) ? data[0] : data) as RpcRewardRow | undefined;
        if (!row) return { ok: false, error: 'EMPTY_RPC_RESULT' };
        return { ok: true, row };
      },
      async insertVerification(row) {
        must(await admin.from('task_verifications').insert(row), 'insertVerification');
      },
    },
  };
}
