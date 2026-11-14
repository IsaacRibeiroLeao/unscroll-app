import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { syncScreenTime } from '../../application/syncScreenTime';
import { buildBlockScreenInfo } from '../../application/blockScreenInfo';
import { currentUserId } from '../../infra/supabase/session';
import { getOnboarded } from '../../infra/storage/onboardingFlag';
import { strings } from '../../strings/pt-BR';
import { useAppStore } from './appStore';
import {
  backend,
  blocker,
  BLOCKED_DEEP_LINK,
  purchases,
  queryClient,
  screenTimeApi,
  supabase,
} from './container';
import { keys, useProfile } from './queries';

export type BootState = 'loading' | 'signedOut' | 'ready' | 'error';

/** Session + persisted flags. Runs once; `retry` re-runs it after a failure. */
export function useBootstrap(): { state: BootState; retry: () => void } {
  const [state, setState] = useState<BootState>('loading');
  const [attempt, setAttempt] = useState(0);
  const setUserId = useAppStore((s) => s.setUserId);
  const setOnboarded = useAppStore((s) => s.setOnboarded);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const userId = await currentUserId(supabase);
        if (cancelled) return;
        if (!userId) {
          setUserId(null);
          setState('signedOut');
          return;
        }
        const onboarded = await getOnboarded();
        if (cancelled) return;
        setUserId(userId);
        setOnboarded(onboarded);
        setState('ready');
        // Best effort, never blocks the UI.
        purchases.identify(userId).catch(() => {});
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (tz) backend.setTimezone(tz).catch(() => {});
      } catch {
        if (!cancelled) setState('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attempt, setUserId, setOnboarded]);

  // Signing out (profile screen, or the session being revoked) returns to the login screen.
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event !== 'SIGNED_OUT') return;
      queryClient.clear();
      setUserId(null);
      setState('signedOut');
    });
    return () => data.subscription.unsubscribe();
  }, [setUserId]);

  return {
    state,
    retry: () => {
      setState('loading');
      setAttempt((n) => n + 1);
    },
  };
}

/**
 * While ready: report native usage + sync the server balance to the blocker on start and every
 * time the app returns to the foreground; re-arm enforcement once onboarding is done.
 */
export function useForegroundSync(enabled: boolean): { syncFailed: boolean } {
  const userId = useAppStore((s) => s.userId);
  const onboarded = useAppStore((s) => s.onboarded);
  const [syncFailed, setSyncFailed] = useState(false);
  const running = useRef(false);

  useEffect(() => {
    if (!enabled || !userId) return;
    const run = async () => {
      if (running.current) return;
      running.current = true;
      try {
        const r = await syncScreenTime({ blocker, screenTimeApi, backend, userId });
        queryClient.setQueryData(keys.profile, r.profile);
        setSyncFailed(r.reportError !== null || r.blockerError !== null);
        if (onboarded) await blocker.startMonitoring().catch(() => {});
      } catch {
        setSyncFailed(true);
      } finally {
        running.current = false;
      }
    };
    void run();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void run();
    });
    return () => sub.remove();
  }, [enabled, userId, onboarded]);

  return { syncFailed };
}

/** Keeps the native block screen (Android) in sync with streak and equipped skin. */
export function useBlockScreenInfoSync(enabled: boolean): void {
  const { data: profile } = useProfile();
  const streak = profile?.streakDays;
  const skin = profile?.activeMascotSkin;
  useEffect(() => {
    if (!enabled || streak === undefined || skin === undefined) return;
    void blocker
      .setBlockScreenInfo(
        buildBlockScreenInfo(
          { streakDays: streak, activeMascotSkin: skin },
          strings.blockScreen,
          BLOCKED_DEEP_LINK,
        ),
      )
      .catch(() => {});
  }, [enabled, streak, skin]);
}

/** Tapping any Unscroll notification (iOS Shield reminder) opens the "earn time" screen. */
export function useNotificationRouting(enabled: boolean): void {
  const router = useRouter();
  useEffect(() => {
    if (!enabled) return;
    const last = Notifications.getLastNotificationResponse();
    if (last) router.push('/blocked');
    const sub = Notifications.addNotificationResponseReceivedListener(() =>
      router.push('/blocked'),
    );
    return () => sub.remove();
  }, [enabled, router]);
}
