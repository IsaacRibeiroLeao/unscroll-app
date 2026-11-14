import { Pressable, View } from 'react-native';
import type { Task } from '../../application/ports/IBackendApi';
import { strings } from '../../strings/pt-BR';
import { fill } from '../format';
import { Text } from '../ui';
import { TaskArt } from './art';
import { Button } from './Button';
import { CameraIcon, CheckIcon, PlusIcon } from './Icons';
import { proofKindFor } from '../../application/ports/IBackendApi';

interface Props {
  task: Task;
  /** The first pending task gets the full-width gold button; the others a compact one. */
  primary: boolean;
  onProve: () => void;
  onDelete: () => void;
}

const cardShadow = {
  shadowColor: '#16372A',
  shadowOpacity: 0.08,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 3 },
  elevation: 2,
} as const;

export function TaskRow({ task, primary, onProve, onDelete }: Props) {
  const done = task.status === 'completed';
  const verifying = task.status === 'verifying';
  const label = verifying ? strings.home.verifying : strings.home.startTask;
  const reward = fill(strings.home.reward, {
    minutes: task.rewardMinutes,
    xp: task.rewardXp,
    gems: task.rewardGems,
  });
  const fullWidth = primary && !done;
  const isText = proofKindFor(task.category) === 'text';

  return (
    <View
      className={`rounded-3xl p-4 ${done ? 'bg-folha/60' : 'bg-folha'}`}
      style={done ? undefined : cardShadow}
    >
      <View className="flex-row items-center gap-3">
        <View className="h-16 w-16 items-center justify-center rounded-2xl bg-nevoa">
          <TaskArt size={50} done={done} />
        </View>
        <View className="flex-1 gap-0.5">
          <Text
            className={`font-display-bold text-lg leading-6 ${done ? 'text-tinta/50' : 'text-tinta'}`}
          >
            {task.title}
          </Text>
          {task.description ? (
            <Text className="text-sm text-tinta/60" numberOfLines={1}>
              {task.description}
            </Text>
          ) : null}
          <Text
            className={`font-body-semibold text-xs ${done ? 'text-tinta/45' : 'text-floresta'}`}
          >
            {strings.categories[task.category]} · {reward}
          </Text>
        </View>

        {done ? (
          <View
            accessible
            accessibilityLabel={strings.home.completed}
            className="h-10 w-10 items-center justify-center rounded-full bg-floresta/15"
          >
            <CheckIcon size={22} />
          </View>
        ) : !fullWidth ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${label}: ${task.title}`}
            accessibilityState={{ disabled: verifying }}
            disabled={verifying}
            onPress={onProve}
            className={`min-h-12 items-center justify-center rounded-full border-2 border-fio px-5 active:opacity-80 ${verifying ? 'opacity-40' : ''}`}
          >
            <Text className="font-display-bold text-base text-tinta">{label}</Text>
          </Pressable>
        ) : null}
      </View>

      {fullWidth ? (
        <View className="mt-3">
          <Button
            label={label}
            variant="sun"
            icon={isText ? <PlusIcon size={20} /> : <CameraIcon size={20} />}
            disabled={verifying}
            onPress={onProve}
          />
        </View>
      ) : null}

      {!done ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={strings.home.deleteTask}
          onPress={onDelete}
          hitSlop={{ top: 8, bottom: 12, left: 10, right: 30 }}
          className="mt-2 self-start"
        >
          <Text className="text-xs text-tinta/45 underline">{strings.home.deleteTask}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
