import type { SupabaseClient } from '@supabase/supabase-js';
import { BackendError } from '../../application/ports/IBackendApi.ts';

/** Returns the signed-in user id, creating an anonymous session on first launch. */
export async function ensureSession(client: SupabaseClient): Promise<string> {
  const { data } = await client.auth.getSession();
  if (data.session) return data.session.user.id;
  const res = await client.auth.signInAnonymously();
  const id = res.data.user?.id;
  if (res.error || !id) {
    throw new BackendError('UNAUTHORIZED', res.error?.message);
  }
  return id;
}
