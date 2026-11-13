import { useRouter } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { toMascotSkin } from '../domain/mascot';
import { Button } from '../presentation/components/Button';
import { Mascot } from '../presentation/components/Mascot';
import { useProfile, useTasks } from '../presentation/state/queries';
import { strings } from '../strings/pt-BR';

/** Target of `unscroll://blocked` (Android block screen button, iOS notification tap). */
export default function BlockedScreen() {
  const router = useRouter();
  const profile = useProfile();
  const tasks = useTasks();
  const pending = (tasks.data ?? []).filter((t) => t.status === 'pending');

  return (
    <SafeAreaView className="flex-1 bg-neutral-50">
      <ScrollView contentContainerClassName="items-center gap-4 p-6">
        <Mascot
          skin={toMascotSkin(profile.data?.activeMascotSkin ?? 'default')}
          mood="sleepy"
          size={140}
        />
        <Text accessibilityRole="header" className="text-2xl font-bold text-neutral-900">
          {strings.blocked.title}
        </Text>
        <Text className="text-center text-neutral-600">{strings.blocked.body}</Text>
        <View className="w-full gap-3">
          {pending.length === 0 ? (
            <>
              <Text className="text-center text-neutral-600">{strings.blocked.noTasks}</Text>
              <Button
                label={strings.blocked.createTask}
                onPress={() => router.replace('/new-task')}
              />
            </>
          ) : (
            pending.map((t) => (
              <Button
                key={t.id}
                label={t.title}
                onPress={() =>
                  router.replace({ pathname: '/proof/[taskId]', params: { taskId: t.id } })
                }
              />
            ))
          )}
          <Button
            label={strings.common.close}
            variant="ghost"
            onPress={() => router.replace('/')}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
