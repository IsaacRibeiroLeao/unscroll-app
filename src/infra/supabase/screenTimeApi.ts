import { z } from 'zod';
import type { ConsumeResult, IScreenTimeApi } from '../../application/ports/IScreenTimeApi.ts';

/** Shape of `supabase.rpc.bind(supabase)`; kept structural so this file has no client dependency. */
export type RpcCaller = (
  fn: string,
  args: Record<string, unknown>,
) => PromiseLike<{ data: unknown; error: { message: string } | null }>;

const rowSchema = z.object({
  new_balance_seconds: z.number().int().nonnegative(),
  applied_seconds: z.number().int().nonnegative(),
  duplicate: z.boolean(),
});

export function createScreenTimeApi(rpc: RpcCaller): IScreenTimeApi {
  return {
    async consumeScreenTime(userId, seconds, clientEventId): Promise<ConsumeResult> {
      const { data, error } = await rpc('consume_screen_time', {
        p_user_id: userId,
        p_seconds: seconds,
        p_client_event_id: clientEventId,
      });
      if (error) throw new Error(error.message);
      const row = rowSchema.parse(Array.isArray(data) ? data[0] : data);
      return {
        newBalanceSeconds: row.new_balance_seconds,
        appliedSeconds: row.applied_seconds,
        duplicate: row.duplicate,
      };
    },
  };
}
