import * as Haptics from 'expo-haptics';
import { Redirect, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { toMascotSkin } from '../domain/mascot';
import { Button } from '../presentation/components/Button';
import { Mascot } from '../presentation/components/Mascot';
import { fill } from '../presentation/format';
import { useAppStore } from '../presentation/state/appStore';
import { useProfile } from '../presentation/state/queries';
import { strings } from '../strings/pt-BR';

export default function CelebrationScreen() {
  const router = useRouter();
  const proof = useAppStore((s) => s.lastProof);
  const setLastProof = useAppStore((s) => s.setLastProof);
  const profile = useProfile();
  const scale = useSharedValue(0.6);

  useEffect(() => {
    scale.value = withSequence(withSpring(1.15), withSpring(1));
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
    <SafeAreaView className="flex-1 items-center justify-center gap-4 bg-brand px-8">
      <Animated.View style={animated}>
        <Mascot
          skin={toMascotSkin(profile.data?.activeMascotSkin ?? 'default')}
          mood="proud"
          size={160}
        />
      </Animated.View>
      <Text accessibilityRole="header" className="text-3xl font-extrabold text-white">
        {strings.celebration.title}
      </Text>
      <View className="items-center gap-1">
        <Text className="text-xl font-bold text-white">
          {fill(strings.celebration.minutes, { minutes: r.minutes })}
        </Text>
        <Text className="text-lg text-white">{fill(strings.celebration.xp, { xp: r.xp })}</Text>
        <Text className="text-lg text-white">
          {fill(strings.celebration.gems, { gems: r.gems })}
        </Text>
        <Text className="mt-2 text-base font-semibold text-amber-200">
          🔥 {r.streakIncremented ? strings.celebration.streakUp : ''}{' '}
          {fill(strings.celebration.streak, { days: r.newStreak })}
        </Text>
      </View>
      {proof.blockerFailed ? (
        <Text className="text-center text-sm text-white/90">
          {strings.celebration.blockerWarning}
        </Text>
      ) : null}
      <View className="w-full pt-4">
        <Button label={strings.celebration.done} variant="secondary" onPress={finish} />
      </View>
    </SafeAreaView>
  );
}
