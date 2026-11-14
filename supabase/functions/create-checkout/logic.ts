// Pure rules for the web checkout: plan catalogue, reference encoding and Mercado Pago payload.

export type PlanId = 'monthly' | 'annual' | 'lifetime';

export interface Plan {
  id: PlanId;
  priceCents: number;
  title: string;
}

/** Founder lifetime is capped so the offer stays a real early-supporter deal. */
export const FOUNDER_LIMIT = 100;

export const PLANS: Record<PlanId, Plan> = {
  monthly: { id: 'monthly', priceCents: 2490, title: 'Unscroll Pro - 30 dias' },
  annual: { id: 'annual', priceCents: 14990, title: 'Unscroll Pro - 1 ano' },
  lifetime: { id: 'lifetime', priceCents: 7900, title: 'Unscroll Pro - Fundador (vitalício)' },
};

export function isPlanId(value: unknown): value is PlanId {
  return value === 'monthly' || value === 'annual' || value === 'lifetime';
}

export interface PublicPlan {
  id: PlanId;
  priceCents: number;
  available: boolean;
  /** Only set for the founder plan: how many spots are left. */
  remaining: number | null;
}

export function listPlans(founderCount: number): PublicPlan[] {
  const remaining = Math.max(0, FOUNDER_LIMIT - founderCount);
  return [
    { id: 'monthly', priceCents: PLANS.monthly.priceCents, available: true, remaining: null },
    { id: 'annual', priceCents: PLANS.annual.priceCents, available: true, remaining: null },
    { id: 'lifetime', priceCents: PLANS.lifetime.priceCents, available: remaining > 0, remaining },
  ];
}

/** `userId:plan:amountCents:nonce` — read back by the webhook after Mercado Pago confirms it. */
export function buildReference(userId: string, plan: PlanId, nonce: string): string {
  return `${userId}:${plan}:${PLANS[plan].priceCents}:${nonce}`;
}

export function buildPreference(args: {
  userId: string;
  email: string | null;
  plan: PlanId;
  nonce: string;
  notificationUrl: string;
}): Record<string, unknown> {
  const plan = PLANS[args.plan];
  return {
    items: [
      {
        id: plan.id,
        title: plan.title,
        quantity: 1,
        currency_id: 'BRL',
        unit_price: plan.priceCents / 100,
      },
    ],
    external_reference: buildReference(args.userId, args.plan, args.nonce),
    notification_url: args.notificationUrl,
    statement_descriptor: 'UNSCROLL',
    // Approve or reject right away: no pending states to reconcile.
    binary_mode: true,
    // Boleto takes days to clear; keep Pix and cards.
    payment_methods: { excluded_payment_types: [{ id: 'ticket' }] },
    ...(args.email ? { payer: { email: args.email } } : {}),
  };
}
