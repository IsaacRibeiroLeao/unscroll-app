import { useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { toMascotSkin } from '../domain/mascot';
import { GradientView, Hills, HourglassArt, SleepyClockArt, Sparkles } from '../presentation/components/art';
import { Button } from '../presentation/components/Button';
import { ChevronRightIcon, CircleXIcon } from '../presentation/components/Icons';
import { Enter, Float } from '../presentation/motion';
import { useProfile, useTasks } from '../presentation/state/queries';
import { Text } from '../presentation/ui';
import { strings } from '../strings/pt-BR';

/** Target of `unscroll://blocked` (Android block screen button, iOS notification tap). */
export default function BlockedScreen() {
  const router = useRouter();
  const profile = useProfile();
  const tasks = useTasks();
  const firstPending = (tasks.data ?? []).find((t) => t.status === 'pending');

  // "Tempo esgotado": the last word picks up the accent color.
  const words = strings.blocked.title.split(' ');
  const accent = words.pop() ?? '';
  const lead = words.join(' ');

  const earn = () =>
    firstPending
      ? router.replace({ pathname: '/proof/[taskId]', params: { taskId: firstPending.id } })
      : router.replace('/new-task');

  return (
    <GradientView id="blocked" stops={['#1B6B43', '#0A2E1D']} className="flex-1">
      <Sparkles />
      <Hills tone="dark" height={150} />
      <SafeAreaView className="flex-1">
        <ScrollView contentContainerClassName="grow items-center justify-center gap-3 px-6 pb-8 pt-4">
          <Float amplitude={6}>
            <SleepyClockArt
              size={290}
              skin={toMascotSkin(profile.data?.activeMascotSkin ?? 'default')}
            />
          </Float>
          <Enter index={1}>
            <Text
              accessibilityRole="header"
              className="text-center font-display text-[40px] leading-[48px] text-white"
            >
              {lead ? `${lead} ` : ''}
              <Text className="font-display text-[40px] leading-[48px] text-sol">{accent}</Text>
            </Text>
          </Enter>
          <Enter index={2}>
            <Text className="mb-4 text-center text-lg text-white/90">{strings.blocked.body}</Text>
          </Enter>
          <View className="w-full gap-3">
            <Enter index={3}>
              <Button
                label={strings.blocked.earn}
                variant="sun"
                icon={<HourglassArt size={22} />}
                trailing={<ChevronRightIcon size={18} color="#16372A" />}
                onPress={earn}
              />
            </Enter>
            <Enter index={4}>
              <Button
                label={strings.blocked.notNow}
                variant="outlineSun"
                icon={<CircleXIcon size={22} />}
                onPress={() => router.replace('/')}
              />
            </Enter>
          </View>
        </ScrollView>
      </SafeAreaView>
    </GradientView>
  );
}
