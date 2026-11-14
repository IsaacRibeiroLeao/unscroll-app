export type ResultCode =
  'APPROVED' | 'REJECTED' | 'LOW_QUALITY' | 'AI_UNAVAILABLE' | 'DAILY_LIMIT' | 'ALREADY_COMPLETED';

export interface Rewards {
  minutes: number;
  xp: number;
  gems: number;
  new_streak: number;
  streak_incremented: boolean;
  // Extra (superset of the contract): totals the client needs to sync the native balance / UI.
  new_balance_seconds: number;
  new_xp: number;
  new_gems: number;
}

export interface VerifyResponse {
  approved: boolean;
  confidence: number;
  feedback: string;
  code: ResultCode;
  rewards: Rewards | null;
}

export type TaskCategory = 'home' | 'exercise' | 'reading' | 'study';

export interface TextProof {
  book: string;
  chapter: string | null;
  summary: string;
  insight: string;
}

export interface TaskRow {
  id: string;
  category: TaskCategory;
  user_id: string;
  title: string;
  description: string | null;
  status: 'pending' | 'verifying' | 'completed';
}

export interface ProfileRow {
  timezone: string;
  is_pro: boolean;
}

export interface RpcRewardRow {
  new_balance_seconds: number;
  new_xp: number;
  new_gems: number;
  new_streak_days: number;
  streak_incremented: boolean;
  minutes_awarded: number;
  xp_awarded: number;
  gems_awarded: number;
}

export type CompleteResult =
  | { ok: true; row: RpcRewardRow }
  | {
      ok: false;
      error: string;
    };

export interface VerificationInsert {
  task_id: string;
  user_id: string;
  image_path: string;
  image_hash: string;
  proof_kind: 'photo' | 'text';
  approved: boolean;
  confidence: number | null;
  code: ResultCode;
  feedback: string | null;
}

export type GeminiResult =
  | {
      kind: 'ok';
      approved: boolean;
      confidence: number;
      qualityOk: boolean;
      feedback: string;
    }
  | { kind: 'blocked' }
  | { kind: 'unavailable' };

export interface DbPort {
  getTask(taskId: string): Promise<TaskRow | null>;
  getProfile(userId: string): Promise<ProfileRow | null>;
  hasCompletion(taskId: string, localDate: string): Promise<boolean>;
  countCompletions(userId: string, localDate: string): Promise<number>;
  /** Attempts that count against the limit: REJECTED and LOW_QUALITY only. */
  countFailedAttempts(taskId: string, localDate: string): Promise<number>;
  hasApprovedHash(userId: string, hash: string): Promise<boolean>;
  /** Atomic pending -> verifying. 'completed'/'busy' when the lock was not obtained. */
  lockTask(
    taskId: string,
    staleBeforeIso: string,
    nowIso: string,
  ): Promise<'locked' | 'completed' | 'busy'>;
  unlockTask(taskId: string): Promise<void>;
  completeTask(taskId: string, userId: string): Promise<CompleteResult>;
  insertVerification(row: VerificationInsert): Promise<void>;
}

export interface Deps {
  now(): Date;
  /** Returns the user id for a valid JWT, otherwise null. */
  verifyJwt(token: string): Promise<string | null>;
  db: DbPort;
  storage: {
    download(path: string): Promise<Uint8Array | null>;
    remove(path: string): Promise<void>;
  };
  gemini(
    image: Uint8Array,
    task: { title: string; description: string | null },
  ): Promise<GeminiResult>;
  geminiText(
    proof: TextProof,
    task: { title: string; description: string | null },
  ): Promise<GeminiResult>;
  log(event: Record<string, unknown>): void;
  allowedOrigin: string;
}
