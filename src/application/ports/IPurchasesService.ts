// Subscription purchase flow (RevenueCat). The client only STARTS purchases; Pro status is written
// by the RevenueCat webhook into profiles.is_pro and read back through IBackendApi.getProfile().

export interface PaywallPlan {
  id: string;
  title: string;
  /** Localized price from the store, e.g. "R$ 24,90". */
  priceLabel: string;
  period: 'monthly' | 'annual';
}

export type PurchaseOutcome = 'purchased' | 'cancelled';

export class PurchasesError extends Error {
  readonly code: 'NOT_CONFIGURED' | 'NO_OFFERING' | 'FAILED';
  constructor(code: 'NOT_CONFIGURED' | 'NO_OFFERING' | 'FAILED', message?: string) {
    super(message ?? code);
    this.name = 'PurchasesError';
    this.code = code;
  }
}

export interface IPurchasesService {
  /** Ties store purchases to the Supabase user id (the webhook uses it as app_user_id). */
  identify(userId: string): Promise<void>;
  getPlans(): Promise<PaywallPlan[]>;
  purchase(planId: string): Promise<PurchaseOutcome>;
  restore(): Promise<void>;
}
