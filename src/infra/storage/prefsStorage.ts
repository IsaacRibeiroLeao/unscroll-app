import * as SecureStore from 'expo-secure-store';

const KEY = 'unscroll.prefs';

export interface StoredPrefs {
  theme: 'system' | 'light' | 'dark';
  language: 'auto' | 'pt-BR' | 'en' | 'es';
}

export const DEFAULT_PREFS: StoredPrefs = { theme: 'system', language: 'auto' };

export async function loadPrefs(): Promise<StoredPrefs> {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    if (!raw) return DEFAULT_PREFS;
    const p = JSON.parse(raw) as Partial<StoredPrefs>;
    return {
      theme: p.theme === 'light' || p.theme === 'dark' ? p.theme : 'system',
      language: p.language === 'pt-BR' || p.language === 'en' || p.language === 'es' ? p.language : 'auto',
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export async function savePrefs(prefs: StoredPrefs): Promise<void> {
  try {
    await SecureStore.setItemAsync(KEY, JSON.stringify(prefs));
  } catch {
    // Non-fatal: the choice just will not survive a restart.
  }
}
