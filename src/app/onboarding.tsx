import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState, Platform, ScrollView, View } from 'react-native';
import { Text } from '../presentation/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { PermissionKey, PermissionStatus } from '../application/ports/IScreenBlockerService';
import { Button } from '../presentation/components/Button';
import { Hills, PhoneLockArt, Sparkles, TrophyArt } from '../presentation/components/art';
import { Card } from '../presentation/components/Card';
import { CheckIcon } from '../presentation/components/Icons';
import { Mascot } from '../presentation/components/Mascot';
import { fill } from '../presentation/format';
import { Float, StepView } from '../presentation/motion';
import { useAppStore } from '../presentation/state/appStore';
import { blocker } from '../presentation/state/container';
import { setOnboarded } from '../infra/storage/onboardingFlag';
import { strings } from '../strings/pt-BR';

type Step = 'slide0' | 'slide1' | 'slide2' | 'permissions' | 'pick' | 'notifications';
const STEPS: Step[] = ['slide0', 'slide1', 'slide2', 'permissions', 'pick', 'notifications'];
const SLIDE_COUNT = 3;
const SETUP_START = SLIDE_COUNT;

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
  const step = STEPS[index] ?? 'slide0';

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
  const slide = index < SLIDE_COUNT ? strings.onboarding.slides[index] : undefined;
  const setupNumber = index - SETUP_START + 1;
  const setupTotal = STEPS.length - SETUP_START;

  if (slide) {
    const last = index === SLIDE_COUNT - 1;
    return (
      <View className="flex-1 bg-nevoa" style={{ paddingTop: insets.top }}>
        <Hills height={120} />
        <View className="flex-1 items-center justify-center">
          <Sparkles />
          <StepView key={index}>
            <Float amplitude={5} duration={1600}>
              {index === 0 ? <Mascot skin="default" mood="wink" size={250} /> : null}
              {index === 1 ? <PhoneLockArt size={250} /> : null}
              {index === 2 ? <TrophyArt size={250} /> : null}
            </Float>
          </StepView>
        </View>
        <View className="items-center gap-3 px-8" style={{ paddingBottom: insets.bottom + 28 }}>
          <StepView key={`t${index}`}>
            <Text
              accessibilityRole="header"
              className="text-center font-display text-[32px] leading-10 text-tinta"
            >
              {slide.title}
            </Text>
            <Text className="mt-2 text-center text-lg text-tinta/70">{slide.body}</Text>
          </StepView>
          <View
            accessible
            accessibilityLabel={fill(strings.onboarding.stepOf, { n: index + 1, total: SLIDE_COUNT })}
            className="my-3 flex-row items-center gap-2"
          >
            {Array.from({ length: SLIDE_COUNT }, (_, i) => (
              <View
                key={i}
                className={`h-2.5 rounded-full ${i === index ? 'w-6 bg-tinta' : 'w-2.5 bg-floresta/35'}`}
              />
            ))}
          </View>
          <View className="w-full gap-1">
            <Button
              label={last ? strings.onboarding.letsGo : strings.onboarding.next}
              variant={last ? 'sun' : 'primary'}
              onPress={next}
            />
            {last ? null : (
              <Button
                label={strings.onboarding.skip}
                variant="ghost"
                onPress={() => {
                  setError(null);
                  setIndex(SETUP_START);
                }}
              />
            )}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-nevoa">
      <Hills height={110} />
      <ScrollView
        contentContainerClassName="gap-4 px-6"
        contentContainerStyle={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 40 }}
      >
        <View className="flex-row items-center gap-3">
          <Mascot skin="default" mood="happy" size={64} crop="head" />
          <Text className="font-body-semibold text-sm text-tinta/60">
            {fill(strings.onboarding.stepOf, { n: setupNumber, total: setupTotal })}
          </Text>
        </View>

        {step === 'permissions' ? (
          <StepView>
            <Text accessibilityRole="header" className="text-3xl font-display text-tinta">
              {strings.onboarding.permissionsTitle}
            </Text>
            <Text className="mt-2 text-base text-tinta/75">
              {Platform.OS === 'ios'
                ? strings.onboarding.permissionsBodyIos
                : strings.onboarding.permissionsBodyAndroid}
            </Text>
            <Card className="mt-4 px-4">
              {PERMISSION_KEYS.map((key, i) => {
                const missing = perms?.missing.includes(key) ?? true;
                return (
                  <View
                    key={key}
                    accessible
                    accessibilityLabel={`${strings.onboarding.perm[key]}: ${missing ? strings.onboarding.permMissing : strings.onboarding.permGranted}`}
                    className={`flex-row items-center gap-3 py-3.5 ${i > 0 ? 'border-t border-fio' : ''}`}
                  >
                    <View
                      className={`h-7 w-7 items-center justify-center rounded-full ${missing ? 'bg-fio' : 'bg-floresta/15'}`}
                    >
                      {missing ? null : <CheckIcon size={16} />}
                    </View>
                    <Text className="flex-1 text-base text-tinta">{strings.onboarding.perm[key]}</Text>
                    <Text
                      className={`font-body-semibold text-sm ${missing ? 'text-pimenta' : 'text-floresta'}`}
                    >
                      {missing ? strings.onboarding.permMissing : strings.onboarding.permGranted}
                    </Text>
                  </View>
                );
              })}
            </Card>
            {error ? <Text className="mt-3 text-sm text-pimenta">{error}</Text> : null}
            <View className="mt-4 gap-2">
              {!permsOk || (perms?.missing.length ?? 0) > 0 ? (
                <Button
                  label={strings.onboarding.grant}
                  variant="sun"
                  onPress={() => void grant()}
                  loading={busy}
                />
              ) : null}
              {Platform.OS === 'android' && (perms?.missing.length ?? 0) > 0 ? (
                <Button
                  variant="ghost"
                  label={strings.onboarding.permHelpLink}
                  onPress={() => router.push('/permissions-help')}
                />
              ) : null}
              <Button
                label={strings.onboarding.next}
                variant="forest"
                onPress={next}
                disabled={!permsOk}
              />
            </View>
          </StepView>
        ) : null}

        {step === 'pick' ? (
          <StepView>
            <Text accessibilityRole="header" className="text-3xl font-display text-tinta">
              {strings.onboarding.pickTitle}
            </Text>
            <Text className="mt-2 text-base text-tinta/75">{strings.onboarding.pickBody}</Text>
            <Card className="mt-4 flex-row items-center justify-between p-4">
              <Text className="font-display-bold text-lg text-tinta">
                {fill(strings.onboarding.pickedCount, { count: pickedCount })}
              </Text>
            </Card>
            {error ? <Text className="mt-3 text-sm text-pimenta">{error}</Text> : null}
            <View className="mt-4 gap-2">
              <Button
                label={strings.onboarding.pickAction}
                variant="sun"
                onPress={() => void pick()}
                loading={busy}
              />
              <Button
                label={strings.onboarding.next}
                variant="forest"
                onPress={next}
                disabled={pickedCount === 0}
              />
            </View>
          </StepView>
        ) : null}

        {step === 'notifications' ? (
          <StepView>
            <Text accessibilityRole="header" className="text-3xl font-display text-tinta">
              {strings.onboarding.notificationsTitle}
            </Text>
            <Text className="mt-2 text-base text-tinta/75">{strings.onboarding.notificationsBody}</Text>
            <View className="mt-4 gap-2">
              <Button
                label={strings.onboarding.notificationsAction}
                variant="forest"
                onPress={() => void finish(true)}
                loading={busy}
              />
              <Button
                label={strings.onboarding.skip}
                variant="ghost"
                onPress={() => void finish(false)}
                disabled={busy}
              />
            </View>
          </StepView>
        ) : null}
      </ScrollView>
    </View>
  );
}
