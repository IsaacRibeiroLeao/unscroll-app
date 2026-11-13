import { Platform } from 'react-native';
import Purchases from 'react-native-purchases';
import type { PurchasesPackage } from 'react-native-purchases';
import { PurchasesError } from '../../application/ports/IPurchasesService';
import type {
  IPurchasesService,
  PaywallPlan,
  PurchaseOutcome,
} from '../../application/ports/IPurchasesService';

// Public SDK keys (safe to embed). Set them in .env; see .env.example.
const API_KEY =
  Platform.OS === 'ios'
    ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY
    : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;

let configured = false;
const packages = new Map<string, PurchasesPackage>();

function ensureConfigured(): void {
  if (configured) return;
  if (!API_KEY) throw new PurchasesError('NOT_CONFIGURED', 'RevenueCat key missing');
  Purchases.configure({ apiKey: API_KEY });
  configured = true;
}

export const purchasesService: IPurchasesService = {
  async identify(userId) {
    ensureConfigured();
    // The webhook receives this id as app_user_id and maps it to profiles.id.
    await Purchases.logIn(userId);
  },

  async getPlans() {
    ensureConfigured();
    const offerings = await Purchases.getOfferings();
    const current = offerings.current;
    if (!current) throw new PurchasesError('NO_OFFERING');
    const plans: PaywallPlan[] = [];
    packages.clear();
    for (const [pkg, period] of [
      [current.monthly, 'monthly'],
      [current.annual, 'annual'],
    ] as const) {
      if (!pkg) continue;
      packages.set(pkg.identifier, pkg);
      plans.push({
        id: pkg.identifier,
        title: pkg.product.title,
        priceLabel: pkg.product.priceString,
        period,
      });
    }
    if (plans.length === 0) throw new PurchasesError('NO_OFFERING');
    return plans;
  },

  async purchase(planId): Promise<PurchaseOutcome> {
    ensureConfigured();
    const pkg = packages.get(planId);
    if (!pkg) throw new PurchasesError('NO_OFFERING', 'plan not loaded');
    try {
      await Purchases.purchasePackage(pkg);
      return 'purchased';
    } catch (e) {
      if ((e as { userCancelled?: boolean | null }).userCancelled) return 'cancelled';
      throw new PurchasesError('FAILED', e instanceof Error ? e.message : undefined);
    }
  },

  async restore() {
    ensureConfigured();
    await Purchases.restorePurchases();
  },
};
