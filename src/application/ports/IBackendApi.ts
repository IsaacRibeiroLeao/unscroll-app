// Everything the UI needs from the backend. Values are the SERVER's: the UI never computes XP,
// gems, balance or limits.

export interface Profile {
  id: string;
  displayName: string | null;
  timezone: string;
  balanceSeconds: number;
  xp: number;
  gems: number;
  streakDays: number;
  streakFreezeCount: number;
  isPro: boolean;
  activeMascotSkin: string;
}

export type TaskStatus = 'pending' | 'verifying' | 'completed';
export type TaskRecurrence = 'once' | 'daily';
export type TaskCategory = 'home' | 'exercise' | 'reading' | 'study';
export type ProofKind = 'photo' | 'text';

/** Reading/study tasks are proven with text, the others with a photo. Mirrors the Edge Function. */
export function proofKindFor(category: TaskCategory): ProofKind {
  return category === 'reading' || category === 'study' ? 'text' : 'photo';
}

export interface TextProof {
  book: string;
  chapter?: string;
  summary: string;
  insight: string;
}

/** Client-side hints only (the server enforces the same limits). */
export const TEXT_PROOF_LIMITS = {
  book: { min: 2, max: 120 },
  chapter: { max: 80 },
  summary: { min: 200, max: 1500 },
  insight: { min: 20, max: 400 },
} as const;

export interface Task {
  id: string;
  title: string;
  description: string | null;
  recurrence: TaskRecurrence;
  category: TaskCategory;
  status: TaskStatus;
  rewardMinutes: number;
  rewardXp: number;
  rewardGems: number;
}

export interface NewTask {
  title: string;
  description?: string;
  recurrence: TaskRecurrence;
  category: TaskCategory;
}

export type ProofCode =
  'APPROVED' | 'REJECTED' | 'LOW_QUALITY' | 'AI_UNAVAILABLE' | 'DAILY_LIMIT' | 'ALREADY_COMPLETED';

export interface ProofRewards {
  minutes: number;
  xp: number;
  gems: number;
  newStreak: number;
  streakIncremented: boolean;
  newBalanceSeconds: number;
  newXp: number;
  newGems: number;
}

export interface ProofOutcome {
  approved: boolean;
  code: ProofCode;
  confidence: number;
  feedback: string;
  rewards: ProofRewards | null;
}

export interface ShopItem {
  sku: string;
  kind: 'streak_freeze' | 'free_pass' | 'mascot_skin';
  priceGems: number;
  grantSeconds: number | null;
}

export interface PurchaseResult {
  sku: string;
  newGems: number;
  newBalanceSeconds: number;
  newStreakFreezeCount: number;
}

export type WebPlanId = 'monthly' | 'annual' | 'lifetime';

/** A Pro plan sold through web checkout; price and availability come from the server. */
export interface WebPlan {
  id: WebPlanId;
  priceCents: number;
  available: boolean;
  /** Founder plan only: spots left. */
  remaining: number | null;
}

export type BackendErrorCode =
  | 'NETWORK'
  | 'UNAUTHORIZED'
  | 'TASK_BUSY'
  | 'TASK_NOT_FOUND'
  | 'INSUFFICIENT_GEMS'
  | 'ALREADY_OWNED'
  | 'FREEZE_LIMIT'
  | 'BALANCE_CAP'
  | 'ITEM_NOT_FOUND'
  | 'SKIN_NOT_OWNED'
  | 'TASK_CREATE_LIMIT'
  | 'IMAGE_TOO_LARGE'
  | 'WRONG_PROOF_KIND'
  | 'INVALID_REQUEST'
  | 'ALREADY_LIFETIME'
  | 'SOLD_OUT'
  | 'UNKNOWN';

export class BackendError extends Error {
  readonly code: BackendErrorCode;
  constructor(code: BackendErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'BackendError';
    this.code = code;
  }
}

export interface IBackendApi {
  getProfile(): Promise<Profile>;
  listTasks(): Promise<Task[]>;
  createTask(task: NewTask): Promise<Task>;
  deleteTask(taskId: string): Promise<void>;
  /** Uploads the photo to the private bucket and asks the Edge Function to verify it. */
  verifyTaskProof(taskId: string, photoUri: string): Promise<ProofOutcome>;
  /** Sends a reading/study summary for verification (no upload). */
  verifyTextProof(taskId: string, text: TextProof): Promise<ProofOutcome>;
  listShopItems(): Promise<ShopItem[]>;
  listOwnedSkus(): Promise<string[]>;
  purchaseItem(sku: string): Promise<PurchaseResult>;
  setActiveSkin(skin: string): Promise<void>;
  setTimezone(timezone: string): Promise<void>;
  listWebPlans(): Promise<WebPlan[]>;
  /** Creates a Pix/card checkout and returns the URL to open in the browser. */
  createCheckout(plan: WebPlanId): Promise<string>;
}
