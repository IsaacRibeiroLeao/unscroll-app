import { useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { toMascotSkin } from '../../domain/mascot';
import { Button } from '../../presentation/components/Button';
import { CrownIcon, LockIcon } from '../../presentation/components/art';
import { Mascot } from '../../presentation/components/Mascot';
import { fill } from '../../presentation/format';
import { Enter, Float } from '../../presentation/motion';
import { useProfile } from '../../presentation/state/queries';
import { Text } from '../../presentation/ui';
import { strings } from '../../strings/pt-BR';

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const p = useProfile().data;

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
        </>
      ) : null}
    </ScrollView>
  );
}
