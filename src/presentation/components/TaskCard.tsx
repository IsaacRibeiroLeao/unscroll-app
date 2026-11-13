import { Pressable, Text, View } from 'react-native';
import { strings } from '../../strings/pt-BR';
import { fill } from '../format';
import type { Task } from '../../application/ports/IBackendApi';
import { Button } from './Button';

interface Props {
  task: Task;
  onProve: () => void;
  onDelete: () => void;
}

export function TaskCard({ task, onProve, onDelete }: Props) {
  const done = task.status === 'completed';
  const verifying = task.status === 'verifying';
  return (
    <View className="gap-3 rounded-2xl bg-white p-4 shadow-sm">
      <View className="flex-row items-start justify-between gap-2">
        <View className="flex-1">
          <Text className="text-base font-semibold text-neutral-900">{task.title}</Text>
          {task.description ? (
            <Text className="mt-1 text-sm text-neutral-600">{task.description}</Text>
          ) : null}
          <Text className="mt-2 text-xs text-neutral-500">
            {fill(strings.home.reward, {
              minutes: task.rewardMinutes,
              xp: task.rewardXp,
              gems: task.rewardGems,
            })}
          </Text>
        </View>
        {!done ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={strings.home.deleteTask}
            onPress={onDelete}
            hitSlop={12}
            className="h-10 w-10 items-center justify-center"
          >
            <Text className="text-lg text-neutral-400">✕</Text>
          </Pressable>
        ) : null}
      </View>
      {done ? (
        <Text className="text-sm font-semibold text-emerald-600">✓ {strings.home.completed}</Text>
      ) : (
        <Button
          label={verifying ? strings.home.verifying : strings.home.startTask}
          onPress={onProve}
          disabled={verifying}
        />
      )}
    </View>
  );
}
