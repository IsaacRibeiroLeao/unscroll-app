import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { BackendError } from '../../application/ports/IBackendApi';
import type { IBackendApi, NewTask } from '../../application/ports/IBackendApi';
import { ensureSession } from './session';
import {
  PROFILE_COLUMNS,
  SHOP_COLUMNS,
  TASK_COLUMNS,
  toBackendError,
  toProfile,
  toProofOutcome,
  toPurchaseResult,
  toShopItem,
  toTask,
} from './mappers';

export interface BackendDeps {
  /** Reads + downscales the photo; injected so this file has no expo-file-system import. */
  preparePhoto: (uri: string) => Promise<ArrayBuffer>;
  now?: () => number;
}

export function createBackendApi(client: SupabaseClient, deps: BackendDeps): IBackendApi {
  const now = deps.now ?? Date.now;

  const uid = () => ensureSession(client);

  function fail(error: { message: string } | null): never {
    throw toBackendError(error?.message ?? 'unknown');
  }

  return {
    async getProfile() {
      const id = await uid();
      const { data, error } = await client
        .from('profiles')
        .select(PROFILE_COLUMNS)
        .eq('id', id)
        .single();
      if (error) fail(error);
      return toProfile(data);
    },

    async listTasks() {
      const id = await uid();
      const { data, error } = await client
        .from('tasks')
        .select(TASK_COLUMNS)
        .eq('user_id', id)
        .order('created_at', { ascending: false });
      if (error) fail(error);
      return (data ?? []).map(toTask);
    },

    async createTask(task: NewTask) {
      const { data, error } = await client
        .from('tasks')
        .insert({
          title: task.title.trim(),
          description: task.description?.trim() || null,
          recurrence: task.recurrence,
        })
        .select(TASK_COLUMNS)
        .single();
      if (error) fail(error);
      return toTask(data);
    },

    async deleteTask(taskId) {
      const { error } = await client.from('tasks').delete().eq('id', taskId);
      if (error) fail(error);
    },

    async verifyTaskProof(taskId, photoUri) {
      const id = await uid();
      const bytes = await deps.preparePhoto(photoUri);
      // Path convention enforced by Storage RLS and the Edge Function: {uid}/{file}.jpg
      const imagePath = `${id}/${taskId}-${now()}.jpg`;
      const up = await client.storage
        .from('proofs')
        .upload(imagePath, bytes, { contentType: 'image/jpeg', upsert: false });
      if (up.error) fail(up.error);

      const res = await client.functions.invoke('verify-task-proof', {
        body: { taskId, imagePath },
      });
      if (res.error) {
        if (res.error instanceof FunctionsHttpError) {
          const body: unknown = await res.error.context.json().catch(() => null);
          throw toBackendError(
            body && typeof body === 'object' ? (body as { code?: unknown }) : 'unknown',
          );
        }
        if (res.error instanceof FunctionsFetchError || res.error instanceof FunctionsRelayError) {
          throw new BackendError('NETWORK');
        }
        throw new BackendError('UNKNOWN', String(res.error));
      }
      return toProofOutcome(res.data);
    },

    async listShopItems() {
      const { data, error } = await client
        .from('shop_items')
        .select(SHOP_COLUMNS)
        .order('price_gems', { ascending: true });
      if (error) fail(error);
      return (data ?? []).map(toShopItem);
    },

    async listOwnedSkus() {
      const { data, error } = await client
        .from('shop_purchases')
        .select('sku')
        .eq('kind', 'mascot_skin');
      if (error) fail(error);
      return (data ?? []).map((r) => String((r as { sku: unknown }).sku));
    },

    async purchaseItem(sku) {
      const id = await uid();
      const { data, error } = await client.rpc('purchase_shop_item', {
        p_user_id: id,
        p_item_sku: sku,
      });
      if (error) fail(error);
      return toPurchaseResult(data);
    },

    async setActiveSkin(skin) {
      const id = await uid();
      const { error } = await client.rpc('set_active_mascot_skin', {
        p_user_id: id,
        p_skin: skin,
      });
      if (error) fail(error);
    },

    async setTimezone(timezone) {
      const id = await uid();
      const { error } = await client.rpc('set_profile_timezone', {
        p_user_id: id,
        p_timezone: timezone,
      });
      if (error) fail(error);
    },
  };
}
