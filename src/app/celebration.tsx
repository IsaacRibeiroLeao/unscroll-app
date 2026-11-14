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
import { Button } from '../presentation/components/Button';
import { Burst, CheckBadge } from '../presentation/components/art';
import { FlameIcon, GemIcon, StarIcon } from '../presentation/components/Icons';
import { fill } from '../presentation/format';
import { Enter, Pop } from '../presentation/motion';
import { useAppStore } from '../presentation/state/appStore';
import { Text } from '../presentation/ui';
import { strings } from '../strings/pt-BR';

/** The single big motion moment of the app: the earned minutes land with a spring. */
export default function CelebrationScreen() {
  const router = useRouter();
  const proof = useAppStore((s) => s.lastProof);
  const setLastProof = useAppStore((s) => s.setLastProof);
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
    <View className="flex-1">
      <Burst />
      <SafeAreaView className="flex-1 px-6 pb-4">
        <View className="flex-1 items-center justify-center">
          <Animated.View style={animated} className="items-center">
            <Pop delay={120}>
              <CheckBadge size={150} />
            </Pop>
            <Text
              accessibilityRole="header"
              className="mt-2 text-center font-display text-4xl text-tinta"
            >
              {strings.celebration.title}
            </Text>
            <Text
              className="font-display text-tinta"
              style={{ fontSize: 112, lineHeight: 116, letterSpacing: -3 }}
              accessibilityLabel={`${fill(strings.celebration.minutesBig, { minutes: r.minutes })} ${strings.celebration.minutesUnit}`}
            >
              {fill(strings.celebration.minutesBig, { minutes: r.minutes })}
            </Text>
            <Text className="font-display-bold text-2xl text-tinta">
              {strings.celebration.minutesUnit}
            </Text>
          </Animated.View>

          <Enter index={4} className="mt-6 w-full rounded-3xl bg-white/55 p-4">
            <View className="flex-row items-center justify-around">
              <View className="flex-row items-center gap-1.5">
                <StarIcon size={22} />
                <Text className="font-display text-xl text-tinta">
                  {fill(strings.celebration.xp, { xp: r.xp })}
                </Text>
              </View>
              <View className="flex-row items-center gap-1.5">
                <GemIcon size={22} color="#3FA8E8" />
                <Text className="font-display text-xl text-tinta">+{r.gems}</Text>
              </View>
              <View className="flex-row items-center gap-1.5">
                <FlameIcon size={24} color="#FF8A1F" />
                <Text className="font-display text-xl text-tinta">{r.newStreak}</Text>
              </View>
            </View>
            <Text className="mt-2 text-center text-base text-tinta/75">
              {fill(strings.celebration.streak, { days: r.newStreak })}
            </Text>
          </Enter>

          {proof.blockerFailed ? (
            <Text className="mt-3 text-center text-sm text-tinta/80">
              {strings.celebration.blockerWarning}
            </Text>
          ) : null}
        </View>
        <Enter index={6}>
          <Button label={strings.celebration.done} onPress={finish} />
        </Enter>
      </SafeAreaView>
    </View>
  );
}
