// Row/response validation (zod) and error mapping for the Supabase adapter. Pure: no client import.
import { z } from 'zod';
import { BackendError } from '../../application/ports/IBackendApi.ts';
import type {
  BackendErrorCode,
  ProofOutcome,
  Profile,
  PurchaseResult,
  ShopItem,
  Task,
} from '../../application/ports/IBackendApi.ts';

const profileRow = z.object({
  id: z.string(),
  display_name: z.string().nullable(),
  timezone: z.string(),
  balance_seconds: z.number().int(),
  xp: z.number().int(),
  gems: z.number().int(),
  streak_days: z.number().int(),
  streak_freeze_count: z.number().int(),
  is_pro: z.boolean(),
  active_mascot_skin: z.string(),
});
export const PROFILE_COLUMNS =
  'id, display_name, timezone, balance_seconds, xp, gems, streak_days, streak_freeze_count, is_pro, active_mascot_skin';

export function toProfile(row: unknown): Profile {
  const r = profileRow.parse(row);
  return {
    id: r.id,
    displayName: r.display_name,
    timezone: r.timezone,
    balanceSeconds: r.balance_seconds,
    xp: r.xp,
    gems: r.gems,
    streakDays: r.streak_days,
    streakFreezeCount: r.streak_freeze_count,
    isPro: r.is_pro,
    activeMascotSkin: r.active_mascot_skin,
  };
}

const taskRow = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  recurrence: z.enum(['once', 'daily']),
  status: z.enum(['pending', 'verifying', 'completed']),
  reward_minutes: z.number().int(),
  reward_xp: z.number().int(),
  reward_gems: z.number().int(),
});
export const TASK_COLUMNS =
  'id, title, description, recurrence, status, reward_minutes, reward_xp, reward_gems';

export function toTask(row: unknown): Task {
  const r = taskRow.parse(row);
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    recurrence: r.recurrence,
    status: r.status,
    rewardMinutes: r.reward_minutes,
    rewardXp: r.reward_xp,
    rewardGems: r.reward_gems,
  };
}

const shopRow = z.object({
  sku: z.string(),
  kind: z.enum(['streak_freeze', 'free_pass', 'mascot_skin']),
  price_gems: z.number().int(),
  grant_seconds: z.number().int().nullable(),
});
export const SHOP_COLUMNS = 'sku, kind, price_gems, grant_seconds';

export function toShopItem(row: unknown): ShopItem {
  const r = shopRow.parse(row);
  return { sku: r.sku, kind: r.kind, priceGems: r.price_gems, grantSeconds: r.grant_seconds };
}

const purchaseRow = z.object({
  new_gems: z.number().int(),
  new_balance_seconds: z.number().int(),
  new_streak_freeze_count: z.number().int(),
  sku: z.string(),
});

export function toPurchaseResult(data: unknown): PurchaseResult {
  const r = purchaseRow.parse(Array.isArray(data) ? data[0] : data);
  return {
    sku: r.sku,
    newGems: r.new_gems,
    newBalanceSeconds: r.new_balance_seconds,
    newStreakFreezeCount: r.new_streak_freeze_count,
  };
}

const proofResponse = z.object({
  approved: z.boolean(),
  confidence: z.number(),
  feedback: z.string(),
  code: z.enum([
    'APPROVED',
    'REJECTED',
    'LOW_QUALITY',
    'AI_UNAVAILABLE',
    'DAILY_LIMIT',
    'ALREADY_COMPLETED',
  ]),
  rewards: z
    .object({
      minutes: z.number(),
      xp: z.number(),
      gems: z.number(),
      new_streak: z.number(),
      streak_incremented: z.boolean(),
      new_balance_seconds: z.number(),
      new_xp: z.number(),
      new_gems: z.number(),
    })
    .nullable(),
});

export function toProofOutcome(data: unknown): ProofOutcome {
  const r = proofResponse.parse(data);
  return {
    approved: r.approved,
    code: r.code,
    confidence: r.confidence,
    feedback: r.feedback,
    rewards: r.rewards && {
      minutes: r.rewards.minutes,
      xp: r.rewards.xp,
      gems: r.rewards.gems,
      newStreak: r.rewards.new_streak,
      streakIncremented: r.rewards.streak_incremented,
      newBalanceSeconds: r.rewards.new_balance_seconds,
      newXp: r.rewards.new_xp,
      newGems: r.rewards.new_gems,
    },
  };
}

const KNOWN: readonly BackendErrorCode[] = [
  'UNAUTHORIZED',
  'TASK_BUSY',
  'TASK_NOT_FOUND',
  'INSUFFICIENT_GEMS',
  'ALREADY_OWNED',
  'FREEZE_LIMIT',
  'BALANCE_CAP',
  'ITEM_NOT_FOUND',
  'SKIN_NOT_OWNED',
  'TASK_CREATE_LIMIT',
  'IMAGE_TOO_LARGE',
];

/** Postgres `raise exception 'CODE'` surfaces as the error message; Edge Function errors carry `code`. */
export function toBackendError(
  source: string | { code?: unknown; message?: unknown },
): BackendError {
  const text =
    typeof source === 'string'
      ? source
      : `${typeof source.code === 'string' ? source.code : ''} ${typeof source.message === 'string' ? source.message : ''}`;
  const found = KNOWN.find((code) => text.includes(code));
  return new BackendError(found ?? 'UNKNOWN', found ? undefined : text.slice(0, 200));
}
