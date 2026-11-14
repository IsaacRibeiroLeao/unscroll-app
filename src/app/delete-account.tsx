import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../presentation/components/Button';
import { Enter } from '../presentation/motion';
import { auth } from '../presentation/state/container';
import { Text } from '../presentation/ui';
import { strings } from '../strings/pt-BR';

/** Irreversible: needs the user to type the confirmation word. On success the auth listener
 *  returns the app to the sign-in screen. */
export default function DeleteAccountScreen() {
  const router = useRouter();
  const t = strings.deleteAccount;
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const confirmed = typed.trim().toUpperCase() === t.confirmWord;

  const submit = async () => {
    if (!confirmed || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      await auth.deleteAccount();
    } catch {
      setMessage(t.failed);
      setBusy(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-nevoa">
      <ScrollView contentContainerClassName="gap-4 p-5" keyboardShouldPersistTaps="handled">
        <Enter index={0}>
          <Text accessibilityRole="header" className="font-display-bold text-2xl text-tinta">
            {t.title}
          </Text>
        </Enter>
        <Enter index={1} className="gap-2 rounded-2xl bg-folha p-4">
          <Text className="text-base text-tinta">{t.warning}</Text>
          <Text className="text-sm text-tinta/70">{t.keep}</Text>
        </Enter>
        <Enter index={2} className="gap-2">
          <Text className="font-display-bold text-base text-tinta">{t.confirmLabel}</Text>
          <TextInput
            value={typed}
            onChangeText={setTyped}
            editable={!busy}
            autoCapitalize="characters"
            autoCorrect={false}
            placeholder={t.confirmWord}
            placeholderTextColor="#8A978E"
            className="min-h-14 rounded-2xl border border-fio bg-folha px-4 py-3 text-base text-tinta"
          />
        </Enter>
        {message ? (
          <Text accessibilityRole="alert" className="text-center text-sm text-red-700">
            {message}
          </Text>
        ) : null}
        <Enter index={3} className="gap-2">
          <Button
            label={t.submit}
            variant="primary"
            onPress={() => void submit()}
            disabled={!confirmed}
            loading={busy}
          />
          <Button
            variant="ghost"
            label={strings.common.cancel}
            disabled={busy}
            onPress={() => router.back()}
          />
        </Enter>
      </ScrollView>
    </SafeAreaView>
  );
}
