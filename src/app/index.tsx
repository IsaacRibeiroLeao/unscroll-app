import { useQueryClient } from '@tanstack/react-query';
import { Redirect, useRouter } from 'expo-router';
import { Alert, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { errorMessage } from '../application/errorMessages';
import { formatBalance } from '../domain/time';
import { Button } from '../presentation/components/Button';
import { MascotHeader } from '../presentation/components/MascotHeader';
import { TaskCard } from '../presentation/components/TaskCard';
import { backend, errorTexts } from '../presentation/state/container';
import { useAppStore } from '../presentation/state/appStore';
import { keys, useProfile, useTasks } from '../presentation/state/queries';
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
  return (
    <SafeAreaView className="flex-1 bg-neutral-50">
      <ScrollView
        contentContainerClassName="gap-4 p-4"
        refreshControl={
          <RefreshControl
            refreshing={profile.isRefetching || tasks.isRefetching}
            onRefresh={() => void refresh()}
          />
        }
      >
        {profile.data ? <MascotHeader profile={profile.data} /> : null}

        {profile.data ? (
          <View
            accessible
            accessibilityLabel={`${strings.home.balanceLabel}: ${formatBalance(profile.data.balanceSeconds)}`}
            className="items-center rounded-3xl bg-brand p-6"
          >
            <Text className="text-sm text-white/80">{strings.home.balanceLabel}</Text>
            <Text className="text-5xl font-extrabold text-white">
              {formatBalance(profile.data.balanceSeconds)}
            </Text>
          </View>
        ) : null}

        <View className="flex-row gap-3">
          <View className="flex-1">
            <Button
              label={strings.home.shop}
              variant="secondary"
              onPress={() => router.push('/shop')}
            />
          </View>
          {profile.data && !profile.data.isPro ? (
            <View className="flex-1">
              <Button label={`⭐ ${strings.home.pro}`} onPress={() => router.push('/paywall')} />
            </View>
          ) : null}
        </View>

        <Text className="mt-2 text-lg font-bold text-neutral-900">{strings.home.tasksTitle}</Text>

        {tasks.isError ? (
          <View className="gap-2 rounded-2xl bg-white p-4">
            <Text className="text-neutral-700">{errorMessage(tasks.error, errorTexts)}</Text>
            <Button label={strings.common.retry} onPress={() => void tasks.refetch()} />
          </View>
        ) : null}

        {tasks.isSuccess && list.length === 0 ? (
          <View className="items-center gap-1 rounded-2xl bg-white p-6">
            <Text className="text-base font-semibold text-neutral-900">
              {strings.home.emptyTitle}
            </Text>
            <Text className="text-center text-sm text-neutral-600">{strings.home.emptyBody}</Text>
          </View>
        ) : null}

        {list.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onProve={() =>
              router.push({ pathname: '/proof/[taskId]', params: { taskId: task.id } })
            }
            onDelete={() => confirmDelete(task.id)}
          />
        ))}

        <Button label={strings.home.addTask} onPress={() => router.push('/new-task')} />
      </ScrollView>
    </SafeAreaView>
  );
}
