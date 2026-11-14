import type { SupabaseClient } from '@supabase/supabase-js';
import { BackendError } from '../../application/ports/IBackendApi.ts';

/** Signed-in user id, or null when nobody is signed in (reads the locally persisted session). */
export async function currentUserId(client: SupabaseClient): Promise<string | null> {
  const { data } = await client.auth.getSession();
  return data.session?.user.id ?? null;
}

/** Signed-in user id; throws UNAUTHORIZED when the session is gone (e.g. signed out elsewhere). */
export async function ensureSession(client: SupabaseClient): Promise<string> {
  const id = await currentUserId(client);
  if (!id) throw new BackendError('UNAUTHORIZED');
  return id;
}
