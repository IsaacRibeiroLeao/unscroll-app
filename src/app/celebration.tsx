import * as Haptics from 'expo-haptics';
import { Redirect, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../presentation/components/Button';
import { Burst } from '../presentation/components/art';
import { Card } from '../presentation/components/Card';
import { Mascot } from '../presentation/components/Mascot';
import { toMascotSkin } from '../domain/mascot';
import { useProfile } from '../presentation/state/queries';
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
  const skin = useProfile().data?.activeMascotSkin ?? 'default';
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
        <ScrollView
          contentContainerClassName="flex-grow items-center justify-center gap-3 py-4"
          showsVerticalScrollIndicator={false}
        >
          <Pop delay={120}>
            <Mascot skin={toMascotSkin(skin)} mood="happy" size={170} />
          </Pop>
          <Text
            accessibilityRole="header"
            className="text-center font-display text-4xl leading-[44px] text-tinta"
          >
            {strings.celebration.title}
          </Text>
          <Animated.View style={animated} className="items-center pt-1">
            <Text className="font-display-bold text-xl leading-7 text-tinta">
              {strings.celebration.youEarned}
            </Text>
            <Text
              className="font-display text-floresta"
              style={{ fontSize: 88, lineHeight: 92, letterSpacing: -2 }}
              accessibilityLabel={`${fill(strings.celebration.minutesBig, { minutes: r.minutes })} ${strings.celebration.minutesUnit}`}
            >
              {fill(strings.celebration.minutesBig, { minutes: r.minutes })}
            </Text>
            <Text className="font-display-bold text-2xl text-tinta">
              {strings.celebration.minutesUnit}
            </Text>
          </Animated.View>

          <Enter index={4} className="mt-2 w-full">
            <Card className="gap-2 p-4">
              <View className="flex-row items-center justify-around">
                <View className="flex-row items-center gap-1.5">
                  <StarIcon size={22} />
                  <Text className="font-display text-lg text-tinta">
                    {fill(strings.celebration.xp, { xp: r.xp })}
                  </Text>
                </View>
                <View className="flex-row items-center gap-1.5">
                  <GemIcon size={22} color="#3FA8E8" />
                  <Text className="font-display text-lg text-tinta">+{r.gems}</Text>
                </View>
                <View className="flex-row items-center gap-1.5">
                  <FlameIcon size={24} color="#FF8A1F" />
                  <Text className="font-display text-lg text-tinta">{r.newStreak}</Text>
                </View>
              </View>
              <Text className="text-center text-sm text-tinta/75">
                {fill(strings.celebration.streak, { days: r.newStreak })}
              </Text>
            </Card>
          </Enter>

          {proof.blockerFailed ? (
            <Text className="text-center text-sm text-tinta/80">
              {strings.celebration.blockerWarning}
            </Text>
          ) : null}
        </ScrollView>
        <Enter index={6} className="gap-2">
          <Button label={strings.celebration.useNow} variant="forest" onPress={finish} />
          <Button
            label={strings.celebration.viewBalance}
            variant="secondary"
            onPress={() => {
              setLastProof(null);
              router.replace('/blocked-apps');
            }}
          />
        </Enter>
      </SafeAreaView>
    </View>
  );
}
