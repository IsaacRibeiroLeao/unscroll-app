import { useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { toMascotSkin } from '../domain/mascot';
import { Button } from '../presentation/components/Button';
import { CameraIcon } from '../presentation/components/Icons';
import { FloatingApps, GradientView, HourglassArt, Hills } from '../presentation/components/art';
import { Mascot } from '../presentation/components/Mascot';
import { Enter, Float } from '../presentation/motion';
import { useProfile, useTasks } from '../presentation/state/queries';
import { Text } from '../presentation/ui';
import { strings } from '../strings/pt-BR';

/** Target of `unscroll://blocked` (Android block screen button, iOS notification tap). */
export default function BlockedScreen() {
  const router = useRouter();
  const profile = useProfile();
  const tasks = useTasks();
  const pending = (tasks.data ?? []).filter((t) => t.status === 'pending');

  return (
    <GradientView id="blocked" stops={['#1F6B43', '#0C3322']} className="flex-1">
      <FloatingApps />
      <Hills tone="dark" height={160} />
      <SafeAreaView className="flex-1">
        <ScrollView contentContainerClassName="items-center gap-3 px-6 pb-6 pt-4">
          <Float amplitude={4} duration={1400}>
            <HourglassArt size={34} />
          </Float>
          <Float amplitude={7}>
            <Mascot
              skin={toMascotSkin(profile.data?.activeMascotSkin ?? 'default')}
              mood="proud"
              size={230}
            />
          </Float>
          <Enter index={1}>
            <Text
              accessibilityRole="header"
              className="text-center font-display text-4xl text-white"
            >
              {strings.blocked.title}
            </Text>
          </Enter>
          <Enter index={2}>
            <Text className="mb-3 text-center text-base text-white/85">{strings.blocked.body}</Text>
          </Enter>
          <View className="w-full gap-3">
            {pending.length === 0 ? (
              <>
                <Text className="text-center text-white/80">{strings.blocked.noTasks}</Text>
                <Button
                  label={strings.blocked.createTask}
                  variant="sun"
                  onPress={() => router.replace('/new-task')}
                />
              </>
            ) : (
              pending.map((t, i) => (
                <Enter key={t.id} index={3 + i}>
                  <Button
                    label={t.title}
                    variant={i === 0 ? 'sun' : 'outlineSun'}
                    icon={i === 0 ? <CameraIcon size={20} /> : undefined}
                    onPress={() =>
                      router.replace({ pathname: '/proof/[taskId]', params: { taskId: t.id } })
                    }
                  />
                </Enter>
              ))
            )}
            <Button
              label={strings.common.close}
              variant="ghostLight"
              onPress={() => router.replace('/')}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </GradientView>
  );
}
