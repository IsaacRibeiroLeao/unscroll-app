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

export interface Task {
  id: string;
  title: string;
  description: string | null;
  recurrence: TaskRecurrence;
  status: TaskStatus;
  rewardMinutes: number;
  rewardXp: number;
  rewardGems: number;
}

export interface NewTask {
  title: string;
  description?: string;
  recurrence: TaskRecurrence;
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
  listShopItems(): Promise<ShopItem[]>;
  listOwnedSkus(): Promise<string[]>;
  purchaseItem(sku: string): Promise<PurchaseResult>;
  setActiveSkin(skin: string): Promise<void>;
  setTimezone(timezone: string): Promise<void>;
}
