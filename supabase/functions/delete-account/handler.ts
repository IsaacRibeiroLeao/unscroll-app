export interface Deps {
  /** Resolves the caller from the Authorization header; null when the token is invalid. */
  getUserId(req: Request): Promise<string | null>;
  /** Removes every proof photo under `{userId}/` in the private bucket. */
  deleteProofs(userId: string): Promise<void>;
  /** Deletes the auth user; FKs cascade profile, tasks, verifications, logs and purchases. */
  deleteUser(userId: string): Promise<void>;
  log: (event: Record<string, unknown>) => void;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export async function handle(req: Request, deps: Deps): Promise<Response> {
  if (req.method !== 'POST') return json({ code: 'METHOD_NOT_ALLOWED' }, 405);
  const userId = await deps.getUserId(req);
  if (!userId) return json({ code: 'UNAUTHORIZED' }, 401);
  try {
    // Photos first: if this fails nothing is lost and the user can retry; the reverse order
    // would orphan files nobody can reach.
    await deps.deleteProofs(userId);
    await deps.deleteUser(userId);
    deps.log({ event: 'account_deleted' });
    return json({ ok: true });
  } catch {
    deps.log({ event: 'account_delete_error' });
    return json({ code: 'INTERNAL' }, 500);
  }
}
