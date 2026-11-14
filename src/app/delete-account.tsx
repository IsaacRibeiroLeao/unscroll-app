import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { Button } from '../presentation/components/Button';
import { Card } from '../presentation/components/Card';
import { Mascot } from '../presentation/components/Mascot';
import { ScreenHeader } from '../presentation/components/ScreenHeader';
import { WarningIcon } from '../presentation/components/Icons';
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
    <View className="flex-1 bg-nevoa">
      <ScreenHeader title={t.title} />
      <ScrollView contentContainerClassName="gap-4 p-5" keyboardShouldPersistTaps="handled">
        <Enter index={0} className="items-center">
          <Mascot skin="default" mood="sad" size={150} />
        </Enter>
        <Enter index={1}>
          <Card className="flex-row items-start gap-3 p-4">
            <WarningIcon size={26} color="#D6392B" />
            <View className="flex-1 gap-2">
              <Text className="text-base text-tinta">{t.warning}</Text>
              <Text className="text-sm text-tinta/70">{t.keep}</Text>
            </View>
          </Card>
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
            variant="danger"
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
    </View>
  );
}
