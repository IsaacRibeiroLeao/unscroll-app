import { useRef, useState } from 'react';
import type { ComponentRef } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { validateCredentials } from '../../application/auth';
import { AuthError } from '../../application/ports/IAuthService';
import { strings } from '../../strings/pt-BR';
import { fill } from '../format';
import { Button } from '../components/Button';
import { Mascot } from '../components/Mascot';
import { Enter, Float } from '../motion';
import { auth } from '../state/container';
import { Text } from '../ui';

type Mode = 'signUp' | 'signIn' | 'confirm';

const inputClass = 'min-h-14 rounded-2xl border border-fio bg-folha px-4 py-3 text-base text-tinta';

function messageFor(error: unknown): string {
  const code = error instanceof AuthError ? error.code : 'UNKNOWN';
  return strings.auth.errors[code];
}

/** Email + password account screen shown while nobody is signed in. */
export function AuthScreen({ onDone }: { onDone: () => void }) {
  const t = strings.auth;
  const [mode, setMode] = useState<Mode>('signUp');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const passwordRef = useRef<ComponentRef<typeof TextInput>>(null);
  const signUp = mode === 'signUp';

  async function submit() {
    if (busy) return;
    const issue = validateCredentials(email, password);
    if (issue) {
      setMessage(t.issues[issue]);
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      if (signUp) {
        const result = await auth.signUp(email, password);
        if (result === 'confirmEmail') {
          setMode('confirm');
          return;
        }
      } else {
        await auth.signIn(email, password);
      }
      onDone();
    } catch (error) {
      setMessage(messageFor(error));
    } finally {
      setBusy(false);
    }
  }

  if (mode === 'confirm') {
    return (
      <SafeAreaView className="flex-1 bg-nevoa">
        <View className="flex-1 items-center justify-center gap-3 px-8">
          <Enter index={0}>
            <Float amplitude={5}>
              <Mascot skin="default" mood="happy" size={130} />
            </Float>
          </Enter>
          <Enter index={1} className="items-center gap-2">
            <Text accessibilityRole="header" className="font-display text-2xl text-tinta">
              {t.confirmTitle}
            </Text>
            <Text className="text-center text-tinta/70">
              {fill(t.confirmBody, { email: email.trim() })}
            </Text>
          </Enter>
          <Enter index={2} className="mt-2 w-full">
            <Button
              label={t.confirmDone}
              onPress={() => {
                setMode('signIn');
                setMessage(null);
              }}
            />
          </Enter>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-nevoa">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerClassName="grow justify-center gap-4 px-6 py-8"
          keyboardShouldPersistTaps="handled"
        >
          <Enter index={0} className="items-center">
            <Float amplitude={5}>
              <Mascot skin="default" mood="happy" size={120} />
            </Float>
          </Enter>
          <Enter index={1} className="gap-1">
            <Text
              accessibilityRole="header"
              className="text-center font-display text-3xl text-tinta"
            >
              {signUp ? t.titleSignUp : t.titleSignIn}
            </Text>
            <Text className="text-center text-tinta/70">
              {signUp ? t.subtitleSignUp : t.subtitleSignIn}
            </Text>
          </Enter>

          <Enter index={2} className="gap-2">
            <Text className="font-display-bold text-base text-tinta">{t.emailLabel}</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              editable={!busy}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              placeholder={t.emailPlaceholder}
              placeholderTextColor="#8A978E"
              className={inputClass}
            />
          </Enter>

          <Enter index={3} className="gap-2">
            <Text className="font-display-bold text-base text-tinta">{t.passwordLabel}</Text>
            <View className="justify-center">
              <TextInput
                ref={passwordRef}
                value={password}
                onChangeText={setPassword}
                editable={!busy}
                secureTextEntry={!reveal}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete={signUp ? 'new-password' : 'current-password'}
                textContentType={signUp ? 'newPassword' : 'password'}
                returnKeyType="go"
                onSubmitEditing={() => void submit()}
                placeholder={t.passwordPlaceholder}
                placeholderTextColor="#8A978E"
                className={`${inputClass} pr-24`}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={reveal ? t.hidePassword : t.showPassword}
                onPress={() => setReveal((v) => !v)}
                hitSlop={8}
                className="absolute right-4"
              >
                <Text className="font-display-bold text-sm text-tinta underline">
                  {reveal ? t.hidePassword.split(' ')[0] : t.showPassword.split(' ')[0]}
                </Text>
              </Pressable>
            </View>
          </Enter>

          {message ? (
            <Text accessibilityLiveRegion="polite" className="text-center text-sm text-red-700">
              {message}
            </Text>
          ) : null}

          <Enter index={4} className="mt-1 gap-2">
            {busy ? (
              <View className="h-14 items-center justify-center">
                <ActivityIndicator accessibilityLabel={strings.common.loading} />
              </View>
            ) : (
              <Button
                label={signUp ? t.submitSignUp : t.submitSignIn}
                onPress={() => void submit()}
              />
            )}
            <Button
              variant="ghost"
              label={signUp ? t.switchToSignIn : t.switchToSignUp}
              disabled={busy}
              onPress={() => {
                setMode(signUp ? 'signIn' : 'signUp');
                setMessage(null);
              }}
            />
          </Enter>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
