export interface ConsumeResult {
  newBalanceSeconds: number;
  appliedSeconds: number;
  duplicate: boolean;
}

/** Server side of screen-time accounting (Supabase RPC `consume_screen_time`). */
export interface IScreenTimeApi {
  consumeScreenTime(userId: string, seconds: number, clientEventId: string): Promise<ConsumeResult>;
}
