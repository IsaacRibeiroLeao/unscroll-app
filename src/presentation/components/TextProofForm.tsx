import { useState } from 'react';
import { ActivityIndicator, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TEXT_PROOF_LIMITS } from '../../application/ports/IBackendApi';
import type { TaskCategory, TextProof } from '../../application/ports/IBackendApi';
import { strings } from '../../strings/pt-BR';
import { fill } from '../format';
import { Text } from '../ui';
import { Button } from './Button';

interface Props {
  category: TaskCategory;
  busy: boolean;
  message: string | null;
  onSubmit: (proof: TextProof) => void;
  onClose: () => void;
}

const inputClass = 'rounded-2xl border border-fio bg-folha px-4 py-3 text-base text-tinta';

export function TextProofForm({ category, busy, message, onSubmit, onClose }: Props) {
  const [book, setBook] = useState('');
  const [chapter, setChapter] = useState('');
  const [summary, setSummary] = useState('');
  const [insight, setInsight] = useState('');
  const L = TEXT_PROOF_LIMITS;
  const t = strings.textProof;
  const study = category === 'study';

  const summaryLen = summary.trim().length;
  const valid =
    book.trim().length >= L.book.min &&
    summaryLen >= L.summary.min &&
    insight.trim().length >= L.insight.min;

  return (
    <SafeAreaView className="flex-1 bg-nevoa">
      <ScrollView contentContainerClassName="gap-3 p-5" keyboardShouldPersistTaps="handled">
        <Text accessibilityRole="header" className="font-display-bold text-2xl text-tinta">
          {study ? t.titleStudy : t.titleReading}
        </Text>

        <Text className="font-display-bold text-base text-tinta">
          {study ? t.bookLabelStudy : t.bookLabelReading}
        </Text>
        <TextInput
          value={book}
          onChangeText={setBook}
          maxLength={L.book.max}
          placeholder={t.bookPlaceholder}
          placeholderTextColor="#8A978E"
          className={`min-h-14 ${inputClass}`}
        />

        <Text className="font-display-bold text-base text-tinta">{t.chapterLabel}</Text>
        <TextInput
          value={chapter}
          onChangeText={setChapter}
          maxLength={L.chapter.max}
          placeholder={t.chapterPlaceholder}
          placeholderTextColor="#8A978E"
          className={`min-h-14 ${inputClass}`}
        />

        <Text className="font-display-bold text-base text-tinta">{t.summaryLabel}</Text>
        <TextInput
          value={summary}
          onChangeText={setSummary}
          maxLength={L.summary.max}
          multiline
          placeholder={t.summaryPlaceholder}
          placeholderTextColor="#8A978E"
          textAlignVertical="top"
          className={`min-h-40 ${inputClass}`}
        />
        <Text className="text-xs text-tinta/60">
          {fill(t.summaryCount, { count: summaryLen, min: L.summary.min })}
        </Text>

        <Text className="font-display-bold text-base text-tinta">{t.insightLabel}</Text>
        <TextInput
          value={insight}
          onChangeText={setInsight}
          maxLength={L.insight.max}
          multiline
          placeholder={t.insightPlaceholder}
          placeholderTextColor="#8A978E"
          textAlignVertical="top"
          className={`min-h-24 ${inputClass}`}
        />

        {message ? (
          <Text accessibilityRole="alert" className="rounded-2xl bg-folha p-3 text-sm text-pimenta">
            {message}
          </Text>
        ) : null}

        {busy ? (
          <View className="items-center gap-2 py-2">
            <ActivityIndicator />
            <Text className="text-sm text-tinta/70">{t.sending}</Text>
          </View>
        ) : (
          <Button
            label={message ? t.tryAgain : t.send}
            variant="sun"
            disabled={!valid}
            onPress={() =>
              onSubmit({
                book: book.trim(),
                chapter: chapter.trim() || undefined,
                summary: summary.trim(),
                insight: insight.trim(),
              })
            }
          />
        )}
        <Button label={strings.common.close} variant="ghost" onPress={onClose} />
      </ScrollView>
    </SafeAreaView>
  );
}
