import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState, Platform, ScrollView, View } from 'react-native';
import { Text } from '../presentation/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { PermissionKey, PermissionStatus } from '../application/ports/IScreenBlockerService';
import { Button } from '../presentation/components/Button';
import { GradientView, HourglassArt, Sparkles } from '../presentation/components/art';
import { Mascot } from '../presentation/components/Mascot';
import { fill } from '../presentation/format';
import { useAppStore } from '../presentation/state/appStore';
import { blocker } from '../presentation/state/container';
import { setOnboarded } from '../infra/storage/onboardingFlag';
import { strings } from '../strings/pt-BR';

type Step = 'welcome' | 'how' | 'permissions' | 'pick' | 'notifications';
const STEPS: Step[] = ['welcome', 'how', 'permissions', 'pick', 'notifications'];

const PERMISSION_KEYS: PermissionKey[] =
  Platform.OS === 'ios'
    ? ['screenTime']
    : ['usageAccess', 'overlay', 'notifications', 'batteryOptimization'];

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const setOnboardedState = useAppStore((s) => s.setOnboarded);
  const [index, setIndex] = useState(0);
  const [perms, setPerms] = useState<PermissionStatus | null>(null);
  const [pickedCount, setPickedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const step = STEPS[index] ?? 'welcome';

  // Android grants happen in system Settings: re-check whenever the app comes back.
  useEffect(() => {
    let cancelled = false;
    const load = () => {
      void blocker.getPermissionStatus().then((p) => {
        if (!cancelled) setPerms(p);
      });
    };
    load();
    void blocker.getSelectedAppsCount().then((n) => {
      if (!cancelled) setPickedCount(n);
    });
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') load();
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  const next = () => {
    setError(null);
    setIndex((i) => Math.min(i + 1, STEPS.length - 1));
  };

  const grant = async () => {
    setBusy(true);
    setError(null);
    try {
      setPerms(await blocker.requestPermissions());
    } catch {
      setError(strings.errors.UNKNOWN);
    } finally {
      setBusy(false);
    }
  };

  const pick = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await blocker.pickApps();
      setPickedCount(r.selectedCount);
    } catch {
      setError(strings.onboarding.pickError);
    } finally {
      setBusy(false);
    }
  };

  const finish = async (askNotifications: boolean) => {
    setBusy(true);
    try {
      if (askNotifications) await Notifications.requestPermissionsAsync().catch(() => {});
      await setOnboarded(true);
      setOnboardedState(true); // triggers the foreground sync, which arms the blocker
      router.replace('/');
    } finally {
      setBusy(false);
    }
  };

  const permsOk = perms?.granted ?? false;

  return (
    <GradientView id="onb" stops={['#1F6B43', '#0F3F29']} className="flex-1">
      <Sparkles />
      <View className="items-center justify-end" style={{ height: 250, paddingTop: insets.top }}>
        <View className="absolute left-8 top-16 opacity-90" style={{ top: insets.top + 24 }}>
          <HourglassArt size={34} />
        </View>
        <Mascot skin="default" mood="peek" size={190} />
      </View>
      <ScrollView
        className="flex-1 bg-nevoa"
        style={{ borderTopLeftRadius: 36, borderTopRightRadius: 36 }}
        contentContainerClassName="gap-4 p-6"
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      >
        {step === 'welcome' ? (
          <>
            <Text
              accessibilityRole="header"
              className="text-center font-display text-3xl text-tinta"
            >
              {strings.onboarding.welcomeTitle}
            </Text>
            <Text className="text-center text-base text-tinta/70">
              {strings.onboarding.welcomeBody}
            </Text>
            <Button label={`${strings.onboarding.next} →`} onPress={next} />
          </>
        ) : null}

        {step === 'how' ? (
          <>
            <Text accessibilityRole="header" className="text-2xl font-display-bold text-tinta">
              {strings.onboarding.howTitle}
            </Text>
            {strings.onboarding.howSteps.map((s, i) => (
              <Text key={s} className="text-base text-tinta">
                {i + 1}. {s}
              </Text>
            ))}
            <Button label={strings.onboarding.next} onPress={next} />
          </>
        ) : null}

        {step === 'permissions' ? (
          <>
            <Text accessibilityRole="header" className="text-2xl font-display-bold text-tinta">
              {strings.onboarding.permissionsTitle}
            </Text>
            <Text className="text-base text-tinta/80">
              {Platform.OS === 'ios'
                ? strings.onboarding.permissionsBodyIos
                : strings.onboarding.permissionsBodyAndroid}
            </Text>
            {PERMISSION_KEYS.map((key) => {
              const missing = perms?.missing.includes(key) ?? true;
              return (
                <View
                  key={key}
                  accessible
                  accessibilityLabel={`${strings.onboarding.perm[key]}: ${missing ? strings.onboarding.permMissing : strings.onboarding.permGranted}`}
                  className="flex-row items-center justify-between border-b border-fio py-3"
                >
                  <Text className="flex-1 pr-2 text-base text-tinta">
                    {strings.onboarding.perm[key]}
                  </Text>
                  <Text className={missing ? 'text-pimenta' : 'text-musgo'}>
                    {missing
                      ? strings.onboarding.permMissing
                      : `✓ ${strings.onboarding.permGranted}`}
                  </Text>
                </View>
              );
            })}
            {error ? <Text className="text-sm text-pimenta">{error}</Text> : null}
            {!permsOk || (perms?.missing.length ?? 0) > 0 ? (
              <Button
                label={strings.onboarding.grant}
                onPress={() => void grant()}
                loading={busy}
              />
            ) : null}
            <Button label={strings.onboarding.next} onPress={next} disabled={!permsOk} />
          </>
        ) : null}

        {step === 'pick' ? (
          <>
            <Text accessibilityRole="header" className="text-2xl font-display-bold text-tinta">
              {strings.onboarding.pickTitle}
            </Text>
            <Text className="text-base text-tinta/80">{strings.onboarding.pickBody}</Text>
            <Text className="text-sm text-tinta/70">
              {fill(strings.onboarding.pickedCount, { count: pickedCount })}
            </Text>
            {error ? <Text className="text-sm text-pimenta">{error}</Text> : null}
            <Button
              label={strings.onboarding.pickAction}
              variant="secondary"
              onPress={() => void pick()}
              loading={busy}
            />
            <Button label={strings.onboarding.next} onPress={next} disabled={pickedCount === 0} />
          </>
        ) : null}

        {step === 'notifications' ? (
          <>
            <Text accessibilityRole="header" className="text-2xl font-display-bold text-tinta">
              {strings.onboarding.notificationsTitle}
            </Text>
            <Text className="text-base text-tinta/80">{strings.onboarding.notificationsBody}</Text>
            <Button
              label={strings.onboarding.notificationsAction}
              onPress={() => void finish(true)}
              loading={busy}
            />
            <Button
              label={strings.onboarding.skip}
              variant="ghost"
              onPress={() => void finish(false)}
              disabled={busy}
            />
          </>
        ) : null}
      </ScrollView>
    </GradientView>
  );
}
