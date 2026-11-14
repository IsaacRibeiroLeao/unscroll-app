import { useRef, useState } from 'react';
import type { ComponentRef } from 'react';
import {
  ActivityIndicator,
  Linking,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PASSWORD_MIN_LENGTH, validateCredentials } from '../../application/auth';
import { AuthError } from '../../application/ports/IAuthService';
import { strings } from '../../strings/pt-BR';
import { PRIVACY_URL, TERMS_URL } from '../../config/site';
import { fill } from '../format';
import { Button } from '../components/Button';
import { ScreenHeader } from '../components/ScreenHeader';
import { ArrowLeftIcon } from '../components/Icons';
import { Mascot } from '../components/Mascot';
import { Enter, Float } from '../motion';
import { auth } from '../state/container';
import { Text } from '../ui';

type Mode = 'signUp' | 'signIn' | 'confirm' | 'forgot' | 'forgotSent';

const inputClass = 'min-h-14 rounded-2xl border border-fio bg-folha px-4 py-3 text-base text-tinta';
const FIELD_SHADOW = { shadowColor: '#16372A', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1 } as const;

function messageFor(error: unknown): string {
  const code = error instanceof AuthError ? error.code : 'UNKNOWN';
  return strings.auth.errors[code];
}

/** Email + password account screen shown while nobody is signed in. */
export function AuthScreen({
  onDone,
  notice,
  initialMode = 'signUp',
  onBack,
}: {
  onDone: () => void;
  notice?: string | null;
  initialMode?: 'signUp' | 'signIn';
  /** Back to the welcome screen; omitted when there is nowhere to go back to. */
  onBack?: () => void;
}) {
  const t = strings.auth;
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(notice ?? null);
  const passwordRef = useRef<ComponentRef<typeof TextInput>>(null);
  const signUp = mode === 'signUp';
  const forgot = mode === 'forgot';

  async function submit() {
    if (busy) return;
    if (forgot) {
      if (validateCredentials(email, 'x'.repeat(PASSWORD_MIN_LENGTH)) === 'EMAIL_INVALID') {
        setMessage(t.issues.EMAIL_INVALID);
        return;
      }
      setBusy(true);
      setMessage(null);
      try {
        await auth.requestPasswordReset(email);
        setMode('forgotSent');
      } catch (error) {
        setMessage(messageFor(error));
      } finally {
        setBusy(false);
      }
      return;
    }
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

  if (mode === 'confirm' || mode === 'forgotSent') {
    const sent = mode === 'forgotSent';
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
              {sent ? t.forgotSentTitle : t.confirmTitle}
            </Text>
            <Text className="text-center text-tinta/70">
              {fill(sent ? t.forgotSentBody : t.confirmBody, { email: email.trim() })}
            </Text>
          </Enter>
          <Enter index={2} className="mt-2 w-full">
            <Button
              label={sent ? t.backToSignIn : t.confirmDone}
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

  if (forgot) {
    return (
      <View className="flex-1 bg-nevoa">
        <ScreenHeader
          title={t.forgotTitle}
          onBack={() => {
            setMode('signIn');
            setMessage(null);
          }}
        />
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerClassName="gap-4 px-6 pt-4" keyboardShouldPersistTaps="handled">
            <Enter index={0}>
              <Text className="text-base text-tinta/70">{t.forgotSubtitle}</Text>
            </Enter>
            <Enter index={1} className="gap-2">
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
                returnKeyType="go"
                onSubmitEditing={() => void submit()}
                placeholder={t.emailPlaceholder}
                placeholderTextColor="#8A978E"
                className={inputClass}
                style={FIELD_SHADOW}
              />
            </Enter>
            {message ? (
              <Text accessibilityLiveRegion="polite" className="text-sm text-red-700">
                {message}
              </Text>
            ) : null}
            <Enter index={2} className="mt-2 gap-2">
              {busy ? (
                <View className="h-14 items-center justify-center">
                  <ActivityIndicator accessibilityLabel={strings.common.loading} />
                </View>
              ) : (
                <Button label={t.forgotSubmit} variant="forest" onPress={() => void submit()} />
              )}
              <Button
                variant="ghost"
                label={t.backToSignIn}
                disabled={busy}
                onPress={() => {
                  setMode('signIn');
                  setMessage(null);
                }}
              />
            </Enter>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-nevoa">
      {onBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={strings.common.back}
          onPress={onBack}
          hitSlop={10}
          className="ml-4 mt-2 h-11 w-11 items-center justify-center rounded-full active:opacity-60"
        >
          <ArrowLeftIcon size={26} color="#16372A" />
        </Pressable>
      ) : null}
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
              <Mascot skin="default" mood="wink" size={130} />
            </Float>
          </Enter>
          <Enter index={1} className="gap-1">
            <Text
              accessibilityRole="header"
              className="text-center font-display text-3xl text-tinta"
            >
              {forgot ? t.forgotTitle : signUp ? t.titleSignUp : t.titleSignIn}
            </Text>
            <Text className="text-center text-tinta/70">
              {forgot ? t.forgotSubtitle : signUp ? t.subtitleSignUp : t.subtitleSignIn}
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
              style={FIELD_SHADOW}
            />
          </Enter>

          {forgot ? null : (
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
                  style={FIELD_SHADOW}
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
          )}

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
                label={forgot ? t.forgotSubmit : signUp ? t.submitSignUp : t.submitSignIn}
                variant="forest"
                onPress={() => void submit()}
              />
            )}
            {signUp ? (
              <Text className="text-center text-xs text-tinta/65">
                {strings.legal.acceptNotice}{' '}
                <Text
                  className="text-xs text-tinta underline"
                  onPress={() => void Linking.openURL(TERMS_URL)}
                >
                  {strings.legal.terms}
                </Text>
                {' · '}
                <Text
                  className="text-xs text-tinta underline"
                  onPress={() => void Linking.openURL(PRIVACY_URL)}
                >
                  {strings.legal.privacy}
                </Text>
              </Text>
            ) : null}
            {mode === 'signIn' ? (
              <Button
                variant="ghost"
                label={t.forgotLink}
                disabled={busy}
                onPress={() => {
                  setMode('forgot');
                  setMessage(null);
                }}
              />
            ) : null}
            <Button
              variant="ghost"
              label={forgot ? t.backToSignIn : signUp ? t.switchToSignIn : t.switchToSignUp}
              disabled={busy}
              onPress={() => {
                setMode(forgot || !signUp ? (forgot ? 'signIn' : 'signUp') : 'signIn');
                setMessage(null);
              }}
            />
          </Enter>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
