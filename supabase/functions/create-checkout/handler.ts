import { buildPreference, isPlanId, listPlans } from './logic.ts';

export interface Deps {
  /** Resolves the caller from the Authorization header; null when the token is invalid. */
  getUser(req: Request): Promise<{ id: string; email: string | null } | null>;
  founderCount(): Promise<number>;
  hasLifetime(userId: string): Promise<boolean>;
  /** Creates a Mercado Pago preference and returns its checkout URL. */
  createPreference(body: Record<string, unknown>): Promise<string>;
  notificationUrl: string;
  nonce: () => string;
  log: (event: Record<string, unknown>) => void;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export async function handle(req: Request, deps: Deps): Promise<Response> {
  if (req.method !== 'POST') return json({ code: 'METHOD_NOT_ALLOWED' }, 405);
  const user = await deps.getUser(req);
  if (!user) return json({ code: 'UNAUTHORIZED' }, 401);

  let body: { action?: unknown; plan?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ code: 'INVALID_REQUEST' }, 400);
  }

  try {
    if (body.action === 'plans') {
      return json({ plans: listPlans(await deps.founderCount()) });
    }
    if (!isPlanId(body.plan)) return json({ code: 'INVALID_REQUEST' }, 400);

    if (body.plan === 'lifetime') {
      if (await deps.hasLifetime(user.id)) return json({ code: 'ALREADY_LIFETIME' }, 409);
      const plan = listPlans(await deps.founderCount()).find((p) => p.id === 'lifetime');
      if (!plan?.available) return json({ code: 'SOLD_OUT' }, 409);
    }

    const url = await deps.createPreference(
      buildPreference({
        userId: user.id,
        email: user.email,
        plan: body.plan,
        nonce: deps.nonce(),
        notificationUrl: deps.notificationUrl,
      }),
    );
    deps.log({ event: 'checkout_created', plan: body.plan });
    return json({ url });
  } catch {
    deps.log({ event: 'checkout_error' });
    return json({ code: 'INTERNAL' }, 500);
  }
}
