import { useQueryClient } from '@tanstack/react-query';
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { errorMessage } from '../../application/errorMessages';
import { UpdateBanner } from '../../presentation/components/UpdateBanner';
import { useUpdate } from '../../presentation/state/useUpdate';
import { BrandBar, Greeting, LevelRow, TimeCard } from '../../presentation/components/HomeHeader';
import { Button } from '../../presentation/components/Button';
import { TaskRow } from '../../presentation/components/TaskRow';
import { useAppStore } from '../../presentation/state/appStore';
import { backend, errorTexts } from '../../presentation/state/container';
import { keys, useProfile, useTasks } from '../../presentation/state/queries';
import { fill } from '../../presentation/format';
import { Enter, PressableScale } from '../../presentation/motion';
import { Text, colors } from '../../presentation/ui';
import { ChevronRightIcon, FlameIcon, PlusIcon } from '../../presentation/components/Icons';
import { strings } from '../../strings/pt-BR';

const VISIBLE = 3;

export default function HomeScreen() {
  const [showAll, setShowAll] = useState(false);
  const router = useRouter();
  const qc = useQueryClient();
  const onboarded = useAppStore((s) => s.onboarded);
  const profile = useProfile();
  const tasks = useTasks();
  const update = useUpdate(true);

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
  const shown = showAll ? list : list.slice(0, VISIBLE);

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
        <BrandBar />
        <Greeting name={profile.data?.displayName ?? null} hour={new Date().getHours()} />
        {profile.data ? (
          <>
            <TimeCard profile={profile.data} onApps={() => router.push('/blocked-apps')} />
            <LevelRow profile={profile.data} />
          </>
        ) : null}

        <View className="px-5 pt-4">
          {update ? <UpdateBanner status={update} /> : null}
          {profile.data ? (
            <Enter index={1}>
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel={fill(strings.home.streakA11y, {
                  days: profile.data.streakDays,
                })}
                onPress={() => router.push('/streak')}
                className="flex-row items-center gap-3 rounded-3xl bg-[#FBEFCF] px-4 py-3"
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
                <ChevronRightIcon size={20} color={colors.tinta} />
              </PressableScale>
            </Enter>
          ) : null}

          <Enter index={2}>
            <View className="mt-6 flex-row items-center justify-between">
              <Text accessibilityRole="header" className="font-display text-[22px] text-tinta">
                {strings.home.tasksToday}
              </Text>
              {list.length > VISIBLE ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setShowAll((v) => !v)}
                  hitSlop={10}
                  className="min-h-11 flex-row items-center justify-center gap-1 active:opacity-60"
                >
                  <Text className="font-display-bold text-sm text-floresta">
                    {showAll ? strings.home.seeLess : strings.home.seeAll}
                  </Text>
                  <ChevronRightIcon size={14} color={colors.floresta} />
                </Pressable>
              ) : null}
            </View>
          </Enter>

          {tasks.isError ? (
            <Enter className="mt-4 gap-3">
              <Text className="text-tinta/80">{errorMessage(tasks.error, errorTexts)}</Text>
              <Button
                label={strings.common.retry}
                variant="secondary"
                onPress={() => void tasks.refetch()}
              />
            </Enter>
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
            {shown.map((task, i) => (
              <Enter key={task.id} index={3 + i} list>
                <TaskRow
                  task={task}
                  onProve={() =>
                    router.push({ pathname: '/proof/[taskId]', params: { taskId: task.id } })
                  }
                  onDelete={() => confirmDelete(task.id)}
                />
              </Enter>
            ))}
          </View>

          <Enter index={4 + shown.length} className="mt-6">
            <Button
              label={strings.home.addTask}
              variant="forest"
              icon={<PlusIcon size={20} color="#FFFFFF" />}
              onPress={() => router.push('/new-task')}
            />
          </Enter>
        </View>
      </ScrollView>
    </View>
  );
}
