import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { decideUpdate, parseVersionInfo } from '../../application/updateCheck';
import type { UpdateDecision, VersionInfo } from '../../application/updateCheck';
import { VERSION_URL } from '../../config/site';

export interface UpdateStatus {
  decision: UpdateDecision;
  info: VersionInfo;
}

/** Android sideload builds only; best effort (offline or a bad file means "no update"). */
export async function checkForUpdate(): Promise<UpdateStatus | null> {
  if (Platform.OS !== 'android') return null;
  const current = Constants.expoConfig?.version;
  if (!current) return null;
  try {
    const res = await fetch(VERSION_URL, { cache: 'no-store' });
    if (!res.ok) return null;
    const info = parseVersionInfo(await res.json());
    if (!info) return null;
    const decision = decideUpdate(current, info);
    return decision === 'none' ? null : { decision, info };
  } catch {
    return null;
  }
}
