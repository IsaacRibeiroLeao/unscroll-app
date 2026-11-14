import { Pressable, View } from 'react-native';
import type { Task } from '../../application/ports/IBackendApi';
import { strings } from '../../strings/pt-BR';
import { fill } from '../format';
import { Text } from '../ui';
import { CameraIcon, CheckIcon } from './Icons';

interface Props {
  task: Task;
  /** The first pending task gets the filled sun button; the others are outlined. */
  primary: boolean;
  onProve: () => void;
  onDelete: () => void;
}

/** A hairline-separated row (not a card): tasks are a list, not a grid of objects. */
export function TaskRow({ task, primary, onProve, onDelete }: Props) {
  const done = task.status === 'completed';
  const verifying = task.status === 'verifying';
  return (
    <View className="flex-row items-center gap-4 border-b border-fio py-4">
      <View className="flex-1 gap-1">
        <Text
          className={`font-display-bold text-lg leading-6 ${done ? 'text-tinta/45' : 'text-tinta'}`}
        >
          {task.title}
        </Text>
        {task.description ? (
          <Text className="text-sm text-tinta/65">{task.description}</Text>
        ) : null}
        <Text className={`font-body-semibold text-sm ${done ? 'text-tinta/45' : 'text-musgo'}`}>
          {fill(strings.home.reward, {
            minutes: task.rewardMinutes,
            xp: task.rewardXp,
            gems: task.rewardGems,
          })}
        </Text>
        {!done ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={strings.home.deleteTask}
            onPress={onDelete}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 20 }}
          >
            <Text className="mt-1 text-xs text-tinta/50 underline">{strings.home.deleteTask}</Text>
          </Pressable>
        ) : null}
      </View>

      {done ? (
        <View
          accessible
          accessibilityLabel={strings.home.completed}
          className="h-11 w-11 items-center justify-center rounded-full bg-musgo/10"
        >
          <CheckIcon size={22} />
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${verifying ? strings.home.verifying : strings.home.startTask}: ${task.title}`}
          accessibilityState={{ disabled: verifying }}
          disabled={verifying}
          onPress={onProve}
          className={`min-h-12 flex-row items-center gap-2 rounded-full px-5 active:opacity-80 ${
            primary ? 'bg-sol' : 'border-2 border-tinta'
          } ${verifying ? 'opacity-40' : ''}`}
        >
          <CameraIcon size={18} />
          <Text className="font-display-bold text-base text-tinta">
            {verifying ? strings.home.verifying : strings.home.startTask}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
