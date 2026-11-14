import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { validatePassword } from '../../application/auth';
import { AuthError } from '../../application/ports/IAuthService';
import { strings } from '../../strings/pt-BR';
import { Button } from '../components/Button';
import { Mascot } from '../components/Mascot';
import { Enter, Float } from '../motion';
import { auth } from '../state/container';
import { Text } from '../ui';

/** Shown after the user opens the reset link: sets the new password on the recovery session. */
export function NewPasswordScreen({ onDone }: { onDone: () => void }) {
  const t = strings.auth;
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit() {
    if (busy) return;
    if (validatePassword(password)) {
      setMessage(t.issues.PASSWORD_SHORT);
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await auth.updatePassword(password);
      onDone();
    } catch (error) {
      setMessage(t.errors[error instanceof AuthError ? error.code : 'UNKNOWN']);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-nevoa">
      <KeyboardAvoidingView
        className="flex-1"
        behavior="padding"
      >
        <ScrollView
          contentContainerClassName="grow justify-center gap-4 px-6 py-8"
          keyboardShouldPersistTaps="handled"
        >
          <Enter index={0} className="items-center">
            <Float amplitude={5}>
              <Mascot skin="default" mood="happy" size={110} />
            </Float>
          </Enter>
          <Enter index={1} className="gap-1">
            <Text
              accessibilityRole="header"
              className="text-center font-display text-3xl text-tinta"
            >
              {t.newPasswordTitle}
            </Text>
            <Text className="text-center text-tinta/70">{t.newPasswordSubtitle}</Text>
          </Enter>
          <Enter index={2} className="gap-2">
            <Text className="font-display-bold text-base text-tinta">{t.passwordLabel}</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              editable={!busy}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="go"
              onSubmitEditing={() => void submit()}
              placeholder={t.passwordPlaceholder}
              placeholderTextColor="#8A978E"
              className="min-h-14 rounded-2xl border border-fio bg-folha px-4 py-3 text-base text-tinta"
            />
          </Enter>
          {message ? (
            <Text accessibilityLiveRegion="polite" className="text-center text-sm text-red-700">
              {message}
            </Text>
          ) : null}
          <Enter index={3}>
            {busy ? (
              <View className="h-14 items-center justify-center">
                <ActivityIndicator accessibilityLabel={strings.common.loading} />
              </View>
            ) : (
              <Button label={t.newPasswordSubmit} onPress={() => void submit()} />
            )}
          </Enter>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
