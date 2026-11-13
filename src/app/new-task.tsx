import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { errorMessage } from '../application/errorMessages';
import type { TaskRecurrence } from '../application/ports/IBackendApi';
import { Button } from '../presentation/components/Button';
import { backend, errorTexts } from '../presentation/state/container';
import { keys } from '../presentation/state/queries';
import { strings } from '../strings/pt-BR';

export default function NewTaskScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [recurrence, setRecurrence] = useState<TaskRecurrence>('once');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = title.trim().length > 0;

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      await backend.createTask({ title, description, recurrence });
      await qc.invalidateQueries({ queryKey: keys.tasks });
      router.back();
    } catch (e) {
      setError(errorMessage(e, errorTexts));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50">
      <View className="gap-4 p-4">
        <Text accessibilityRole="header" className="text-2xl font-bold text-neutral-900">
          {strings.newTask.title}
        </Text>

        <Text className="text-sm font-semibold text-neutral-700">{strings.newTask.titleLabel}</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          maxLength={80}
          placeholder={strings.newTask.titlePlaceholder}
          accessibilityLabel={strings.newTask.titleLabel}
          className="min-h-12 rounded-2xl bg-white px-4 text-base text-neutral-900"
        />

        <Text className="text-sm font-semibold text-neutral-700">
          {strings.newTask.descriptionLabel}
        </Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          maxLength={280}
          multiline
          placeholder={strings.newTask.descriptionPlaceholder}
          accessibilityLabel={strings.newTask.descriptionLabel}
          className="min-h-24 rounded-2xl bg-white px-4 py-3 text-base text-neutral-900"
        />

        <Text className="text-sm font-semibold text-neutral-700">
          {strings.newTask.recurrenceLabel}
        </Text>
        <View className="flex-row gap-3">
          {(['once', 'daily'] as const).map((value) => {
            const selected = recurrence === value;
            return (
              <Pressable
                key={value}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => setRecurrence(value)}
                className={`min-h-12 flex-1 items-center justify-center rounded-2xl ${selected ? 'bg-brand' : 'bg-white'}`}
              >
                <Text className={selected ? 'font-semibold text-white' : 'text-neutral-800'}>
                  {strings.newTask[value]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {error ? (
          <Text accessibilityRole="alert" className="text-sm text-red-600">
            {error}
          </Text>
        ) : null}

        <Button
          label={strings.newTask.create}
          onPress={() => void create()}
          disabled={!valid}
          loading={busy}
        />
        <Button label={strings.common.cancel} variant="ghost" onPress={() => router.back()} />
      </View>
    </SafeAreaView>
  );
}
