import { useQueryClient } from '@tanstack/react-query';
import { useNavigation, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Keyboard, Pressable, ScrollView, TextInput, View } from 'react-native';
import { Text } from '../presentation/ui';
import { errorMessage } from '../application/errorMessages';
import { withNewTask } from '../application/taskList';
import type { Task, TaskCategory, TaskRecurrence } from '../application/ports/IBackendApi';
import { Button } from '../presentation/components/Button';
import { Hills } from '../presentation/components/art';
import { AppIcon } from '../presentation/components/AppIcon';
import { PlusIcon, SearchIcon } from '../presentation/components/Icons';
import { ScreenHeader } from '../presentation/components/ScreenHeader';
import { Enter, PressableScale } from '../presentation/motion';
import { backend, errorTexts } from '../presentation/state/container';
import { keys, useBlockedApps } from '../presentation/state/queries';
import { fill } from '../presentation/format';
import { strings } from '../strings/pt-BR';

const CATEGORIES = ['home', 'exercise', 'reading', 'study'] as const;

export default function NewTaskScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const submitting = useRef(false);
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [recurrence, setRecurrence] = useState<TaskRecurrence>('once');
  const [category, setCategory] = useState<TaskCategory>('home');
  const blocked = useBlockedApps();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = title.trim().length > 0;

  // While saving, the swipe-down / back gesture must not dismiss the screen mid-request.
  useEffect(() => {
    navigation.setOptions({ gestureEnabled: !busy });
  }, [navigation, busy]);

  const create = async () => {
    // A ref (not state) so two quick taps in the same frame cannot both pass.
    if (submitting.current || !valid) return;
    submitting.current = true;
    Keyboard.dismiss();
    setBusy(true);
    setError(null);
    try {
      const created = await backend.createTask({ title, description, recurrence, category });
      // Show the new task right away; the refetch only reconciles in the background.
      qc.setQueryData<Task[]>(keys.tasks, (old) => withNewTask(old, created));
      void qc.invalidateQueries({ queryKey: keys.tasks });
      router.back();
    } catch (e) {
      setError(errorMessage(e, errorTexts));
      setBusy(false);
      submitting.current = false;
    }
  };

  const field =
    'min-h-14 rounded-2xl border border-fio bg-folha px-4 text-base text-tinta';
  const shownApps = blocked.data?.apps.slice(0, 4) ?? [];

  return (
    <View className="flex-1 bg-nevoa">
      <Hills height={150} />
      <ScreenHeader title={strings.newTask.title} onBack={() => router.back()} />
      <ScrollView
        contentContainerClassName="gap-5 px-5 pb-10 pt-2"
        keyboardShouldPersistTaps="handled"
      >
        <Enter index={1} className="gap-2">
          <Text className="font-display-bold text-lg text-tinta">{strings.newTask.titleLabel}</Text>
          <View className="justify-center">
            <TextInput
              editable={!busy}
              value={title}
              onChangeText={setTitle}
              maxLength={80}
              placeholder={strings.newTask.titlePlaceholder}
              accessibilityLabel={strings.newTask.titleLabel}
              className={`${field} pl-12`}
              placeholderTextColor="#8A978E"
            />
            <View className="absolute left-4" pointerEvents="none">
              <SearchIcon size={20} />
            </View>
          </View>
        </Enter>

        <Enter index={2} className="gap-2">
          <Text className="font-display-bold text-base text-tinta">
            {strings.newTask.categoryLabel}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {CATEGORIES.map((value) => {
              const selected = category === value;
              return (
                <PressableScale
                  key={value}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`${strings.categories[value]}. ${strings.categories[`${value}Hint`]}`}
                  disabled={busy}
                  onPress={() => setCategory(value)}
                  className={`min-h-11 justify-center rounded-full px-4 ${selected ? 'bg-tinta' : 'border border-fio bg-folha'}`}
                >
                  <Text
                    className={`font-display-bold text-[15px] ${selected ? 'text-nevoa' : 'text-tinta'}`}
                  >
                    {strings.categories[value]}
                  </Text>
                </PressableScale>
              );
            })}
          </View>
          <Text className="text-xs text-tinta/60">{strings.categories[`${category}Hint`]}</Text>
        </Enter>

        <Enter index={3} className="gap-2">
          <Text className="font-display-bold text-base text-tinta">
            {strings.newTask.descriptionLabel}
          </Text>
          <TextInput
            editable={!busy}
            value={description}
            onChangeText={setDescription}
            maxLength={280}
            multiline
            placeholder={strings.newTask.descriptionPlaceholder}
            accessibilityLabel={strings.newTask.descriptionLabel}
            className={`${field} min-h-24 py-3`}
            placeholderTextColor="#8A978E"
            textAlignVertical="top"
          />
        </Enter>

        <Enter index={4} className="gap-2">
          <Text className="font-display-bold text-base text-tinta">
            {strings.newTask.blockedAppsLabel}
          </Text>
          <View className="flex-row items-start gap-4">
            {shownApps.map((app) => (
              <View key={app.id} className="w-14 items-center gap-1">
                <AppIcon app={app} size={52} />
                <Text className="text-[11px] text-tinta/70" numberOfLines={1}>
                  {app.label}
                </Text>
              </View>
            ))}
            {blocked.data && blocked.data.apps.length === 0 && blocked.data.count > 0 ? (
              <Text className="flex-1 pt-3 text-sm text-tinta/70">
                {fill(strings.blockedApps.iosCount, { count: blocked.data.count })}
              </Text>
            ) : null}
            {blocked.data && blocked.data.count === 0 ? (
              <Text className="flex-1 pt-3 text-sm text-tinta/70">
                {strings.newTask.noBlockedApps}
              </Text>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={strings.newTask.moreApps}
              onPress={() => router.push('/blocked-apps')}
              className="w-14 items-center gap-1 active:opacity-60"
            >
              <View className="h-[52px] w-[52px] items-center justify-center rounded-2xl border border-fio bg-folha">
                <PlusIcon size={22} color="#16372A" />
              </View>
              <Text className="text-[11px] text-tinta/70" numberOfLines={1}>
                {strings.newTask.moreApps}
              </Text>
            </Pressable>
          </View>
        </Enter>

        <Enter index={5} className="gap-2">
          <Text className="font-display-bold text-base text-tinta">
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
                  disabled={busy}
                  onPress={() => setRecurrence(value)}
                  className={`min-h-12 items-center justify-center rounded-2xl ${selected ? 'bg-tinta' : 'border border-fio bg-folha'}`}
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

        <Enter index={6} className="gap-1">
          <Button
            label={strings.newTask.create}
            variant="forest"
            onPress={() => void create()}
            disabled={!valid}
            loading={busy}
          />
          <Button
            label={strings.common.cancel}
            variant="ghost"
            disabled={busy}
            onPress={() => router.back()}
          />
        </Enter>
      </ScrollView>
    </View>
  );
}
