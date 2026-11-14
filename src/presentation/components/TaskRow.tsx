import { Pressable, View } from 'react-native';
import { Pop, PressableScale } from '../motion';
import type { Task } from '../../application/ports/IBackendApi';
import { proofKindFor } from '../../application/ports/IBackendApi';
import { strings } from '../../strings/pt-BR';
import { fill } from '../format';
import { Text } from '../ui';
import { CategoryArt } from './art';
import { Card } from './Card';
import { CameraIcon, CheckIcon, PlusIcon } from './Icons';

interface Props {
  task: Task;
  onProve: () => void;
  onDelete: () => void;
}

export function TaskRow({ task, onProve, onDelete }: Props) {
  const done = task.status === 'completed';
  const verifying = task.status === 'verifying';
  const label = verifying ? strings.home.verifying : strings.home.startTask;
  const reward = fill(strings.home.reward, {
    minutes: task.rewardMinutes,
    xp: task.rewardXp,
    gems: task.rewardGems,
  });
  const isText = proofKindFor(task.category) === 'text';

  return (
    <Card className={`p-3.5 ${done ? 'opacity-70' : ''}`}>
      <View className="flex-row items-center gap-3">
        {done ? (
          <Pop>
            <CategoryArt size={58} category={task.category} done />
          </Pop>
        ) : (
          <CategoryArt size={58} category={task.category} />
        )}
        <View className="flex-1 gap-0.5">
          <Text
            className={`font-display-bold text-lg leading-6 ${done ? 'text-tinta/50' : 'text-tinta'}`}
            numberOfLines={2}
          >
            {task.title}
          </Text>
          <Text
            className={`font-body-semibold text-xs ${done ? 'text-tinta/45' : 'text-floresta'}`}
            numberOfLines={1}
          >
            {reward}
          </Text>
        </View>

        {done ? (
          <View
            accessible
            accessibilityLabel={strings.home.completed}
            className="h-9 w-9 items-center justify-center rounded-full bg-floresta/15"
          >
            <CheckIcon size={20} />
          </View>
        ) : (
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={`${label}: ${task.title}`}
            accessibilityState={{ disabled: verifying }}
            disabled={verifying}
            onPress={onProve}
            className={`min-h-11 flex-row items-center gap-1.5 rounded-full bg-floresta px-4 ${verifying ? 'opacity-40' : ''}`}
          >
            {isText ? <PlusIcon size={16} color="#FFFFFF" /> : <CameraIcon size={16} color="#FFFFFF" />}
            <Text className="font-display-bold text-[15px] text-white">{label}</Text>
          </PressableScale>
        )}
      </View>

      {!done ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={strings.home.deleteTask}
          onPress={onDelete}
          hitSlop={{ top: 8, bottom: 12, left: 10, right: 30 }}
          className="mt-2 self-start pl-1"
        >
          <Text className="text-xs text-tinta/45 underline">{strings.home.deleteTask}</Text>
        </Pressable>
      ) : null}
    </Card>
  );
}
