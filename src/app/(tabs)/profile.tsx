import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { toMascotSkin } from '../../domain/mascot';
import { Button } from '../../presentation/components/Button';
import { CrownIcon, LockIcon } from '../../presentation/components/art';
import { Mascot } from '../../presentation/components/Mascot';
import { fill } from '../../presentation/format';
import { Enter, Float } from '../../presentation/motion';
import { auth } from '../../presentation/state/container';
import { useProfile } from '../../presentation/state/queries';
import { Text } from '../../presentation/ui';
import { strings } from '../../strings/pt-BR';

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const p = useProfile().data;
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => {
    void auth
      .currentEmail()
      .then(setEmail)
      .catch(() => {});
  }, []);

  const confirmSignOut = () =>
    Alert.alert(strings.auth.signOutTitle, strings.auth.signOutBody, [
      { text: strings.common.cancel, style: 'cancel' },
      {
        text: strings.auth.signOut,
        style: 'destructive',
        onPress: () => void auth.signOut().catch(() => {}),
      },
    ]);

  return (
    <ScrollView
      className="flex-1 bg-nevoa"
      contentContainerClassName="gap-4 px-4 pb-8"
      contentContainerStyle={{ paddingTop: insets.top + 12 }}
    >
      <Enter index={0}>
        <Text accessibilityRole="header" className="font-display text-3xl text-tinta">
          {strings.profile.title}
        </Text>
      </Enter>
      {p ? (
        <>
          <Enter index={1} className="items-center rounded-3xl bg-folha p-5">
            <Float amplitude={5}>
              <Mascot
                skin={toMascotSkin(p.activeMascotSkin)}
                mood={p.isPro ? 'royal' : 'happy'}
                size={150}
              />
            </Float>
            <View className="mt-2 flex-row items-center gap-2">
              {p.isPro ? <CrownIcon size={24} /> : null}
              <Text className="font-display text-2xl text-tinta">
                {strings.profile.plan}:{' '}
                {p.isPro ? strings.profile.planPro : strings.profile.planFree}
              </Text>
            </View>
            <Text className="mt-1 text-sm text-tinta/65">
              {fill(strings.shop.freezeCount, { count: p.streakFreezeCount })}
            </Text>
          </Enter>
          {!p.isPro ? (
            <Enter index={2}>
              <Button
                label={strings.profile.upgrade}
                variant="sun"
                icon={<CrownIcon size={22} />}
                onPress={() => router.push('/paywall')}
              />
            </Enter>
          ) : null}
          <Enter index={3} className="flex-row items-start gap-3 rounded-3xl bg-[#E6EDE0] p-4">
            <LockIcon />
            <View className="flex-1">
              <Text className="font-display-bold text-base text-tinta">
                {strings.profile.privacyTitle}
              </Text>
              <Text className="text-sm text-tinta/70">{strings.profile.privacyBody}</Text>
            </View>
          </Enter>
          <Enter index={4} className="gap-2 rounded-3xl bg-folha p-4">
            <Text className="font-display-bold text-base text-tinta">
              {strings.auth.accountTitle}
            </Text>
            {email ? (
              <Text className="text-sm text-tinta/70" selectable>
                {strings.profile.emailLabel}: {email}
              </Text>
            ) : null}
            <Button variant="secondary" label={strings.auth.signOut} onPress={confirmSignOut} />
          </Enter>
        </>
      ) : null}
    </ScrollView>
  );
}
