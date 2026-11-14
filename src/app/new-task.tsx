import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { Text } from '../presentation/ui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { errorMessage } from '../application/errorMessages';
import type { TaskCategory, TaskRecurrence } from '../application/ports/IBackendApi';
import { Button } from '../presentation/components/Button';
import { Hills, SparkleIcon } from '../presentation/components/art';
import { Enter, PressableScale } from '../presentation/motion';
import { backend, errorTexts } from '../presentation/state/container';
import { keys } from '../presentation/state/queries';
import { strings } from '../strings/pt-BR';

const CATEGORIES = ['home', 'exercise', 'reading', 'study'] as const;

export default function NewTaskScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [recurrence, setRecurrence] = useState<TaskRecurrence>('once');
  const [category, setCategory] = useState<TaskCategory>('home');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = title.trim().length > 0;

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      await backend.createTask({ title, description, recurrence, category });
      await qc.invalidateQueries({ queryKey: keys.tasks });
      router.back();
    } catch (e) {
      setError(errorMessage(e, errorTexts));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-nevoa">
      <Hills height={170} />
      <View className="gap-3 p-5">
        <Enter index={0}>
          <Text accessibilityRole="header" className="text-2xl font-display-bold text-tinta">
            {strings.newTask.title}
          </Text>
        </Enter>

        <Enter index={1} className="gap-3">
          <Text className="text-base font-display-bold text-tinta">
            {strings.newTask.categoryLabel}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {CATEGORIES.map((value) => {
              const selected = category === value;
              return (
                <PressableScale
                  key={value}
                  wrapperClassName="min-w-[47%] flex-1"
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`${strings.categories[value]}. ${strings.categories[`${value}Hint`]}`}
                  onPress={() => setCategory(value)}
                  className={`min-h-12 justify-center rounded-2xl px-4 py-2 ${selected ? 'bg-tinta' : 'border-2 border-fio bg-folha'}`}
                >
                  <Text
                    className={`font-display-bold text-base ${selected ? 'text-nevoa' : 'text-tinta'}`}
                  >
                    {strings.categories[value]}
                  </Text>
                  <Text className={`text-xs ${selected ? 'text-nevoa/80' : 'text-tinta/60'}`}>
                    {strings.categories[`${value}Hint`]}
                  </Text>
                </PressableScale>
              );
            })}
          </View>
        </Enter>

        <Enter index={2} className="gap-3">
          <Text className="text-lg font-display-bold text-tinta">{strings.newTask.titleLabel}</Text>
          <View className="justify-center">
            <TextInput
              value={title}
              onChangeText={setTitle}
              maxLength={80}
              placeholder={strings.newTask.titlePlaceholder}
              accessibilityLabel={strings.newTask.titleLabel}
              className="min-h-14 rounded-2xl border border-fio bg-folha pl-12 pr-4 text-base text-tinta"
              placeholderTextColor="#8A978E"
            />
            <View className="absolute left-4" pointerEvents="none">
              <SparkleIcon size={20} />
            </View>
          </View>
        </Enter>

        <Enter index={3} className="gap-3">
          <Text className="text-base font-display-bold text-tinta">
            {strings.newTask.descriptionLabel}
          </Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            maxLength={280}
            multiline
            placeholder={strings.newTask.descriptionPlaceholder}
            accessibilityLabel={strings.newTask.descriptionLabel}
            className="min-h-28 rounded-2xl border border-fio bg-folha px-4 py-3 text-base text-tinta"
            placeholderTextColor="#8A978E"
            textAlignVertical="top"
          />
        </Enter>

        <Enter index={4} className="gap-3">
          <Text className="text-base font-display-bold text-tinta">
            {strings.newTask.recurrenceLabel}
          </Text>
          <View className="flex-row gap-3">
            {(['once', 'daily'] as const).map((value) => {
              const selected = recurrence === value;
              return (
                <PressableScale
                  key={value}
                  wrapperClassName="flex-1"
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => setRecurrence(value)}
                  className={`min-h-12 items-center justify-center rounded-full ${selected ? 'bg-tinta' : 'border-2 border-tinta'}`}
                >
                  <Text
                    className={
                      selected ? 'font-display-bold text-nevoa' : 'font-display-bold text-tinta'
                    }
                  >
                    {strings.newTask[value]}
                  </Text>
                </PressableScale>
              );
            })}
          </View>
        </Enter>

        {error ? (
          <Enter key={error}>
            <Text accessibilityRole="alert" className="text-sm text-pimenta">
              {error}
            </Text>
          </Enter>
        ) : null}

        <Enter index={5} className="gap-3">
          <Button
            label={strings.newTask.create}
            icon={<SparkleIcon size={20} />}
            onPress={() => void create()}
            disabled={!valid}
            loading={busy}
          />
          <Button label={strings.common.cancel} variant="ghost" onPress={() => router.back()} />
        </Enter>
      </View>
    </SafeAreaView>
  );
}
