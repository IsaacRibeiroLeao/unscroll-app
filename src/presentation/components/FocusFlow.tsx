import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Switch, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  DEFAULT_FOCUS_MINUTES,
  FOCUS_MINUTES,
  isFinished,
  progress,
  remainingSeconds,
  type FocusSession,
} from '../../domain/focus';
import { formatBalance } from '../../domain/time';
import { TEXT_PROOF_LIMITS } from '../../application/ports/IBackendApi';
import type { TaskCategory } from '../../application/ports/IBackendApi';
import { strings } from '../../strings/pt-BR';
import { fill } from '../format';
import { Enter, Float, Pop } from '../motion';
import { useColors } from '../theme';
import { Text } from '../ui';
import { Button } from './Button';
import { Img } from './Img';

interface Props {
  taskId: string;
  category: TaskCategory;
  session: FocusSession | null;
  onStart: (s: FocusSession) => void;
  onCancel: () => void;
  /** Go straight to the summary form (timer done, or the person chose to skip it). */
  onWrite: () => void;
  onClose: () => void;
}

const inputClass = 'min-h-14 rounded-2xl border border-fio bg-folha px-4 py-3 text-base text-tinta';

/** Setup -> running timer -> "time is up". The summary form itself lives in TextProofForm. */
export function FocusFlow({ taskId, category, session, onStart, onCancel, onWrite, onClose }: Props) {
  const colors = useColors();
  const f = strings.focus;
  const t = strings.textProof;
  const L = TEXT_PROOF_LIMITS;
  const [book, setBook] = useState('');
  const [chapter, setChapter] = useState('');
  const [minutes, setMinutes] = useState<number>(DEFAULT_FOCUS_MINUTES);
  const [lock, setLock] = useState(true);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!session) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [session]);

  if (session) {
    const done = isFinished(session, now);
    const left = remainingSeconds(session, now);
    const pct = progress(session, now);
    const what = [session.book, session.chapter].filter(Boolean).join(' · ');
    return (
      <SafeAreaView className="flex-1 bg-nevoa">
        <ScrollView contentContainerClassName="flex-grow items-center justify-center gap-5 p-6">
          <Pop>
            {done ? (
              <Img name="bear_power" size={200} />
            ) : (
              <Float>
                <Img name="timer" size={150} />
              </Float>
            )}
          </Pop>
          <Text accessibilityRole="header" className="text-center font-display-bold text-2xl text-tinta">
            {done ? f.doneTitle : f.runningTitle}
          </Text>
          {done ? (
            <Text className="text-center text-base text-tinta/80">{f.doneBody}</Text>
          ) : (
            <>
              <Text className="text-sm text-tinta/70">{f.left}</Text>
              <Text
                accessibilityLabel={formatBalance(left)}
                className="font-display-bold text-6xl text-tinta"
                style={{ fontVariant: ['tabular-nums'] }}
              >
                {formatBalance(left)}
              </Text>
              <View className="h-3 w-full overflow-hidden rounded-full bg-fio">
                <View
                  className="h-3 rounded-full"
                  style={{ width: `${Math.round(pct * 100)}%`, backgroundColor: colors.floresta }}
                />
              </View>
              <Text className="text-center text-sm text-tinta/70">{f.waitHint}</Text>
            </>
          )}
          {what ? (
            <Text className="text-center text-base text-tinta">{fill(f.reading, { what })}</Text>
          ) : null}
          <View className="flex-row items-center gap-2">
            <Img name={session.lockApps ? 'lock' : 'unlock'} size={22} />
            <Text className="text-sm text-tinta/70">{session.lockApps ? f.lockOn : f.lockOff}</Text>
          </View>
          <View className="w-full gap-3 pt-2">
            {done ? (
              <Button label={f.write} variant="sun" onPress={onWrite} />
            ) : (
              <Button label={f.stop} variant="secondary" onPress={onCancel} />
            )}
            <Button label={strings.common.close} variant="ghost" onPress={onClose} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const study = category === 'study';
  const ready = book.trim().length >= 1;
  return (
    <SafeAreaView className="flex-1 bg-nevoa">
      <ScrollView contentContainerClassName="gap-4 p-5" keyboardShouldPersistTaps="handled">
        <Enter index={0} className="items-center gap-2">
          <Img name="book" size={96} />
          <Text accessibilityRole="header" className="text-center font-display-bold text-2xl text-tinta">
            {f.title}
          </Text>
          <Text className="text-center text-base text-tinta/80">{f.intro}</Text>
        </Enter>

        <Enter index={1} className="gap-2">
          <Text className="font-display-bold text-base text-tinta">
            {study ? t.bookLabelStudy : t.bookLabelReading}
          </Text>
          <TextInput
            value={book}
            onChangeText={setBook}
            maxLength={L.book.max}
            placeholder={t.bookPlaceholder}
            placeholderTextColor={colors.placeholder}
            className={inputClass}
          />
          <Text className="font-display-bold text-base text-tinta">{t.chapterLabel}</Text>
          <TextInput
            value={chapter}
            onChangeText={setChapter}
            maxLength={L.chapter.max}
            placeholder={t.chapterPlaceholder}
            placeholderTextColor={colors.placeholder}
            className={inputClass}
          />
        </Enter>

        <Enter index={2} className="gap-2">
          <Text className="font-display-bold text-base text-tinta">{f.minutesLabel}</Text>
          <View className="flex-row gap-2">
            {FOCUS_MINUTES.map((m) => {
              const on = m === minutes;
              return (
                <Pressable
                  key={m}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  onPress={() => setMinutes(m)}
                  className={`min-h-12 flex-1 items-center justify-center rounded-full border-2 ${on ? 'border-floresta bg-floresta' : 'border-fio bg-folha'}`}
                >
                  <Text className={`font-display-bold text-base ${on ? 'text-white' : 'text-tinta'}`}>
                    {fill(f.minutesOption, { n: m })}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Enter>

        <Enter index={3}>
          <View className="flex-row items-center gap-3 rounded-2xl bg-folha p-4">
            <Img name="lock" size={34} />
            <View className="flex-1">
              <Text className="font-display-bold text-base text-tinta">{f.lockLabel}</Text>
              <Text className="text-sm text-tinta/70">{f.lockHint}</Text>
            </View>
            <Switch value={lock} onValueChange={setLock} />
          </View>
        </Enter>

        <Button
          label={f.start}
          variant="sun"
          disabled={!ready}
          onPress={() =>
            onStart({
              taskId,
              book: book.trim(),
              chapter: chapter.trim(),
              startedAt: Date.now(),
              minutes,
              lockApps: lock,
            })
          }
        />
        <Button label={f.skip} variant="secondary" onPress={onWrite} />
        <Button label={strings.common.close} variant="ghost" onPress={onClose} />
      </ScrollView>
    </SafeAreaView>
  );
}
