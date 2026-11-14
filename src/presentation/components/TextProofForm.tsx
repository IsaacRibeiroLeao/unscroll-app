import { useState } from 'react';
import { ActivityIndicator, ScrollTextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TEXT_PROOF_LIMITS } from '../../application/ports/IBackendApi';
import { isTextProofValid, toTextProof } from '../../application/textProof';
import type { TaskCategory, TextProof } from '../../application/ports/IBackendApi';
import { strings } from '../../strings/pt-BR';
import { fill } from '../format';
import { Enter, Pop } from '../motion';
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
  const draft = { book, chapter, summary, insight };
  const valid = isTextProofValid(draft);

  return (
    <SafeAreaView className="flex-1 bg-nevoa">
      <ScrollView contentContainerClassName="gap-3 p-5" keyboardShouldPersistTaps="handled">
        <Enter index={0}>
          <Text accessibilityRole="header" className="font-display-bold text-2xl text-tinta">
            {study ? t.titleStudy : t.titleReading}
          </Text>
        </Enter>

        <Enter index={1} className="gap-3">
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
        </Enter>

        <Enter index={2} className="gap-3">
          <Text className="font-display-bold text-base text-tinta">{t.chapterLabel}</Text>
          <TextInput
            value={chapter}
            onChangeText={setChapter}
            maxLength={L.chapter.max}
            placeholder={t.chapterPlaceholder}
            placeholderTextColor="#8A978E"
            className={`min-h-14 ${inputClass}`}
          />
        </Enter>

        <Enter index={3} className="gap-3">
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
        </Enter>

        <Enter index={4} className="gap-3">
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
        </Enter>

        {message ? (
          <Enter key={message}>
            <Text
              accessibilityRole="alert"
              className="rounded-2xl bg-folha p-3 text-sm text-pimenta"
            >
              {message}
            </Text>
          </Enter>
        ) : null}

        {busy ? (
          <Pop style={{ alignItems: 'center', gap: 8, paddingVertical: 8 }}>
            <ActivityIndicator />
            <Text className="text-sm text-tinta/70">{t.sending}</Text>
          </Pop>
        ) : (
          <Button
            label={message ? t.tryAgain : t.send}
            variant="sun"
            disabled={!valid}
            onPress={() => onSubmit(toTextProof(draft))}
          />
        )}
        <Button label={strings.common.close} variant="ghost" onPress={onClose} />
      </ScrollView>
    </SafeAreaView>
  );
}
