import * as Haptics from 'expo-haptics';
import { Redirect, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { toMascotSkin } from '../domain/mascot';
import { Button } from '../presentation/components/Button';
import { FlameIcon, GemIcon } from '../presentation/components/Icons';
import { Mascot } from '../presentation/components/Mascot';
import { fill } from '../presentation/format';
import { useAppStore } from '../presentation/state/appStore';
import { useProfile } from '../presentation/state/queries';
import { Text } from '../presentation/ui';
import { strings } from '../strings/pt-BR';

/** The single big motion moment of the app: the earned minutes land with a spring. */
export default function CelebrationScreen() {
  const router = useRouter();
  const proof = useAppStore((s) => s.lastProof);
  const setLastProof = useAppStore((s) => s.setLastProof);
  const profile = useProfile();
  const scale = useSharedValue(0.4);

  useEffect(() => {
    scale.value = withSequence(withSpring(1.12, { damping: 9 }), withSpring(1));
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, [scale]);

  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  if (!proof?.outcome.rewards) return <Redirect href="/" />;
  const r = proof.outcome.rewards;

  const finish = () => {
    setLastProof(null);
    router.replace('/');
  };

  return (
    <SafeAreaView className="flex-1 bg-sol" style={{ paddingHorizontal: 24, paddingBottom: 16 }}>
      <View className="flex-1 justify-center">
        <Animated.View
          style={[animated, { transformOrigin: 'left center' }]}
          className="items-start"
        >
          <View className="h-36 w-36 items-center justify-center rounded-full bg-musgo">
            <Mascot
              skin={toMascotSkin(profile.data?.activeMascotSkin ?? 'default')}
              mood="proud"
              size={112}
            />
          </View>
          <Text accessibilityRole="header" className="mt-4 font-display-bold text-2xl text-tinta">
            {strings.celebration.title}
          </Text>
          <Text
            className="font-display text-tinta"
            style={{ fontSize: 132, lineHeight: 128, letterSpacing: -5 }}
            accessibilityLabel={`${fill(strings.celebration.minutesBig, { minutes: r.minutes })} ${strings.celebration.minutesUnit}`}
          >
            {fill(strings.celebration.minutesBig, { minutes: r.minutes })}
          </Text>
          <Text className="font-display-bold text-2xl text-tinta">
            {strings.celebration.minutesUnit}
          </Text>
        </Animated.View>

        <View className="mt-8 flex-row items-center gap-6">
          <Text className="font-display-bold text-lg text-tinta">
            {fill(strings.celebration.xp, { xp: r.xp })}
          </Text>
          <View className="flex-row items-center gap-1.5">
            <GemIcon size={18} color="#16241C" />
            <Text className="font-display-bold text-lg text-tinta">+{r.gems}</Text>
          </View>
          <View className="flex-row items-center gap-1.5">
            <FlameIcon size={20} color="#16241C" />
            <Text className="font-display-bold text-lg text-tinta">{r.newStreak}</Text>
          </View>
        </View>
        <Text className="mt-2 text-base text-tinta/75">
          {fill(strings.celebration.streak, { days: r.newStreak })}
        </Text>

        {proof.blockerFailed ? (
          <Text className="mt-4 text-sm text-tinta/80">{strings.celebration.blockerWarning}</Text>
        ) : null}
      </View>
      <Button label={strings.celebration.done} onPress={finish} />
    </SafeAreaView>
  );
}
