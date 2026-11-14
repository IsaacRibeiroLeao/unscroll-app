import { useQueryClient } from '@tanstack/react-query';
import { Redirect, useRouter } from 'expo-router';
import { Alert, RefreshControl, ScrollView, View } from 'react-native';
import { errorMessage } from '../application/errorMessages';
import { BalanceHero } from '../presentation/components/BalanceHero';
import { Button } from '../presentation/components/Button';
import { TaskRow } from '../presentation/components/TaskRow';
import { useAppStore } from '../presentation/state/appStore';
import { backend, errorTexts } from '../presentation/state/container';
import { keys, useProfile, useTasks } from '../presentation/state/queries';
import { Text, colors } from '../presentation/ui';
import { strings } from '../strings/pt-BR';

export default function HomeScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const onboarded = useAppStore((s) => s.onboarded);
  const profile = useProfile();
  const tasks = useTasks();

  if (onboarded === false) return <Redirect href="/onboarding" />;

  const refresh = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: keys.profile }),
      qc.invalidateQueries({ queryKey: keys.tasks }),
    ]);
  };

  const confirmDelete = (id: string) =>
    Alert.alert(strings.home.deleteTask, undefined, [
      { text: strings.common.cancel, style: 'cancel' },
      {
        text: strings.home.deleteTask,
        style: 'destructive',
        onPress: () => {
          backend
            .deleteTask(id)
            .then(() => qc.invalidateQueries({ queryKey: keys.tasks }))
            .catch((e: unknown) => Alert.alert(errorMessage(e, errorTexts)));
        },
      },
    ]);

  const list = tasks.data ?? [];
  const firstPendingId = list.find((t) => t.status === 'pending')?.id;

  return (
    <View className="flex-1 bg-nevoa">
      <ScrollView
        contentContainerClassName="pb-10"
        refreshControl={
          <RefreshControl
            refreshing={profile.isRefetching || tasks.isRefetching}
            onRefresh={() => void refresh()}
            tintColor={colors.musgo}
          />
        }
      >
        {profile.data ? (
          <BalanceHero
            profile={profile.data}
            onShop={() => router.push('/shop')}
            onPro={() => router.push('/paywall')}
          />
        ) : null}

        <View className="px-5 pt-7">
          <Text accessibilityRole="header" className="font-display text-2xl text-tinta">
            {strings.home.tasksTitle}
          </Text>

          {tasks.isError ? (
            <View className="mt-4 gap-3">
              <Text className="text-tinta/80">{errorMessage(tasks.error, errorTexts)}</Text>
              <Button
                label={strings.common.retry}
                variant="secondary"
                onPress={() => void tasks.refetch()}
              />
            </View>
          ) : null}

          {tasks.isSuccess && list.length === 0 ? (
            <View className="mt-4 gap-1 border-y border-fio py-8">
              <Text className="font-display-bold text-lg text-tinta">
                {strings.home.emptyTitle}
              </Text>
              <Text className="text-base text-tinta/70">{strings.home.emptyBody}</Text>
            </View>
          ) : null}

          <View className="mt-2">
            {list.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                primary={task.id === firstPendingId}
                onProve={() =>
                  router.push({ pathname: '/proof/[taskId]', params: { taskId: task.id } })
                }
                onDelete={() => confirmDelete(task.id)}
              />
            ))}
          </View>

          <View className="mt-6">
            <Button label={strings.home.addTask} onPress={() => router.push('/new-task')} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
