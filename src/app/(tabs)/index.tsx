import { useQueryClient } from '@tanstack/react-query';
import { Redirect, useRouter } from 'expo-router';
import { Alert, RefreshControl, ScrollView, View } from 'react-native';
import { errorMessage } from '../../application/errorMessages';
import { BalanceHero } from '../../presentation/components/BalanceHero';
import { Button } from '../../presentation/components/Button';
import { TaskRow } from '../../presentation/components/TaskRow';
import { useAppStore } from '../../presentation/state/appStore';
import { backend, errorTexts } from '../../presentation/state/container';
import { keys, useProfile, useTasks } from '../../presentation/state/queries';
import { fill } from '../../presentation/format';
import { Enter, PressableScale } from '../../presentation/motion';
import { Text, colors } from '../../presentation/ui';
import { FlameIcon, PlusIcon } from '../../presentation/components/Icons';
import { strings } from '../../strings/pt-BR';

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

        <View className="px-5 pt-5">
          {profile.data ? (
            <Enter index={1}>
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel={fill(strings.home.streakA11y, {
                  days: profile.data.streakDays,
                })}
                onPress={() => router.push('/stats')}
                className="flex-row items-center gap-3 rounded-3xl bg-[#F3EBC6] px-4 py-3"
              >
                <FlameIcon size={40} color="#FF8A1F" />
                <View className="flex-1">
                  <Text className="font-display text-xl text-tinta">
                    {fill(strings.home.streak, { days: profile.data.streakDays })}
                  </Text>
                  <Text className="text-sm text-tinta/70">
                    {profile.data.streakDays > 0
                      ? strings.home.streakActive
                      : strings.home.streakNone}
                  </Text>
                </View>
                <Text className="font-display text-2xl text-tinta/60">›</Text>
              </PressableScale>
            </Enter>
          ) : null}

          <Enter index={2}>
            <Text accessibilityRole="header" className="mt-6 font-display text-2xl text-tinta">
              {strings.home.tasksTitle}
            </Text>
          </Enter>

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
            <Enter index={3} className="mt-4 gap-1 rounded-3xl bg-folha p-5">
              <Text className="font-display-bold text-lg text-tinta">
                {strings.home.emptyTitle}
              </Text>
              <Text className="text-base text-tinta/70">{strings.home.emptyBody}</Text>
            </Enter>
          ) : null}

          <View className="mt-3 gap-3">
            {list.map((task, i) => (
              <Enter key={task.id} index={3 + i} list>
                <TaskRow
                  task={task}
                  primary={task.id === firstPendingId}
                  onProve={() =>
                    router.push({ pathname: '/proof/[taskId]', params: { taskId: task.id } })
                  }
                  onDelete={() => confirmDelete(task.id)}
                />
              </Enter>
            ))}
          </View>

          <Enter index={4 + list.length} className="mt-6">
            <Button
              label={strings.home.addTask}
              icon={<PlusIcon size={20} />}
              onPress={() => router.push('/new-task')}
            />
          </Enter>
        </View>
      </ScrollView>
    </View>
  );
}
