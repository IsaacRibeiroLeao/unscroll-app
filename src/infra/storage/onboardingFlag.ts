import * as SecureStore from 'expo-secure-store';

const KEY = 'unscroll.onboarded';

export async function getOnboarded(): Promise<boolean> {
  return (await SecureStore.getItemAsync(KEY)) === '1';
}

export async function setOnboarded(value: boolean): Promise<void> {
  if (value) await SecureStore.setItemAsync(KEY, '1');
  else await SecureStore.deleteItemAsync(KEY);
}
