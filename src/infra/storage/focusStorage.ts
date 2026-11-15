import * as SecureStore from 'expo-secure-store';
import { parseSession, type FocusSession } from '../../domain/focus';

const KEY = 'unscroll.focus';

export async function loadFocus(taskId: string): Promise<FocusSession | null> {
  try {
    const s = parseSession(await SecureStore.getItemAsync(KEY));
    return s && s.taskId === taskId ? s : null;
  } catch {
    return null;
  }
}

export async function saveFocus(session: FocusSession): Promise<void> {
  try {
    await SecureStore.setItemAsync(KEY, JSON.stringify(session));
  } catch {
    // Non-fatal: the timer just will not survive a restart.
  }
}

export async function clearFocus(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(KEY);
  } catch {
    // ignore
  }
}
