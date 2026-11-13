// supabase-js stores the session as one big JSON string; SecureStore/Keychain values are best kept
// small, so the value is split into chunks. The store is injected (SecureStore in the app).

export interface KeyValueStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

export interface AsyncStorageLike {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

const COUNT_SUFFIX = '.n';

export function createChunkedStorage(store: KeyValueStore, chunkSize = 1500): AsyncStorageLike {
  const chunkKey = (key: string, i: number) => `${key}.${i}`;

  async function removeItem(key: string): Promise<void> {
    const n = Number(await store.get(key + COUNT_SUFFIX));
    if (Number.isInteger(n) && n > 0) {
      for (let i = 0; i < n; i += 1) await store.remove(chunkKey(key, i));
    }
    await store.remove(key + COUNT_SUFFIX);
  }

  return {
    async getItem(key) {
      const n = Number(await store.get(key + COUNT_SUFFIX));
      if (!Number.isInteger(n) || n <= 0) return null;
      let out = '';
      for (let i = 0; i < n; i += 1) {
        const part = await store.get(chunkKey(key, i));
        if (part === null) return null; // torn write: treat as signed out
        out += part;
      }
      return out;
    },
    async setItem(key, value) {
      await removeItem(key);
      const chunks: string[] = [];
      for (let i = 0; i < value.length; i += chunkSize) chunks.push(value.slice(i, i + chunkSize));
      for (let i = 0; i < chunks.length; i += 1) await store.set(chunkKey(key, i), chunks[i] ?? '');
      // The count is written last: a crash before this line leaves the old (removed) state.
      await store.set(key + COUNT_SUFFIX, String(chunks.length));
    },
    removeItem,
  };
}
