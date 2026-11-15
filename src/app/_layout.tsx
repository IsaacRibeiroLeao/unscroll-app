import '../global.css';
import {
  Nunito_400Regular,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  Nunito_900Black,
} from '@expo-google-fonts/nunito';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, View } from 'react-native';
import { APK_URL } from '../config/site';
import { useUpdate } from '../presentation/state/useUpdate';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ScreenBlockerHost from '../infra/native/ScreenBlockerHost';
import { Button } from '../presentation/components/Button';
import { AuthScreen } from '../presentation/screens/AuthScreen';
import { WelcomeScreen } from '../presentation/screens/WelcomeScreen';
import { NewPasswordScreen } from '../presentation/screens/NewPasswordScreen';
import { auth, queryClient } from '../presentation/state/container';
import {
  useBlockScreenInfoSync,
  useBootstrap,
  useForegroundSync,
  useNotificationRouting,
  useRecoveryLink,
} from '../presentation/state/useAppRuntime';
import { strings } from '../strings/pt-BR';
import { Text } from '../presentation/ui';
import { useTheme, usePrefs } from '../presentation/theme';
import { resolveLocale, setLocale } from '../strings/locale';

function Shell() {
  const { colors } = useTheme();
  const { state, retry } = useBootstrap();
  const [fontsLoaded, fontError] = useFonts({
    Nunito_400Regular,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    Nunito_900Black,
  });
  const [recovery, setRecovery] = useState<'form' | 'invalid' | null>(null);
  // 'welcome' is the first screen for a signed-out visitor; either button leads to the form.
  const [entry, setEntry] = useState<'welcome' | 'signUp' | 'signIn'>('welcome');
  const onRecoveryLink = useCallback((url: string) => {
    auth
      .completeRecovery(url)
      .then(() => setRecovery('form'))
      .catch(() => setRecovery('invalid'));
  }, []);
  useRecoveryLink(onRecoveryLink);
  const update = useUpdate(state === 'ready');
  const ready = state === 'ready' && recovery === null;
  useForegroundSync(ready);
  useBlockScreenInfoSync(ready);
  useNotificationRouting(ready);

  if (state === 'loading' || (!fontsLoaded && !fontError)) {
    return (
      <View className="flex-1 items-center justify-center bg-nevoa">
        <ActivityIndicator accessibilityLabel={strings.common.loading} color={colors.musgo} />
      </View>
    );
  }
  if (recovery === 'form') {
    return (
      <NewPasswordScreen
        onDone={() => {
          setRecovery(null);
          retry();
        }}
      />
    );
  }
  if (state === 'signedOut' && recovery === null && entry === 'welcome') {
    return <WelcomeScreen onStart={() => setEntry('signUp')} onSignIn={() => setEntry('signIn')} />;
  }
  if (state === 'signedOut' || recovery === 'invalid') {
    return (
      <AuthScreen
        initialMode={entry === 'signIn' ? 'signIn' : 'signUp'}
        onBack={entry !== 'welcome' && recovery === null ? () => setEntry('welcome') : undefined}
        notice={recovery === 'invalid' ? strings.auth.linkInvalid : null}
        onDone={() => {
          setRecovery(null);
          retry();
        }}
      />
    );
  }
  if (update?.decision === 'required') {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-nevoa px-8">
        <Text className="text-xl font-display-bold text-tinta">{strings.update.requiredTitle}</Text>
        <Text className="mb-2 text-center text-tinta/70">{strings.update.requiredBody}</Text>
        <Button label={strings.update.action} onPress={() => void Linking.openURL(APK_URL)} />
      </View>
    );
  }
  if (state === 'error') {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-nevoa px-8">
        <Text className="text-xl font-display-bold text-tinta">{strings.bootstrap.errorTitle}</Text>
        <Text className="mb-2 text-center text-tinta/70">{strings.bootstrap.errorBody}</Text>
        <Button label={strings.common.retry} onPress={retry} />
      </View>
    );
  }
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        animationDuration: 300,
        contentStyle: { backgroundColor: colors.nevoa },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
      <Stack.Screen
        name="new-task"
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="proof/[taskId]"
        options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="celebration"
        options={{ gestureEnabled: false, animation: 'fade_from_bottom', animationDuration: 380 }}
      />
      <Stack.Screen
        name="paywall"
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="permissions-help"
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="delete-account"
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen name="blocked" options={{ animation: 'fade' }} />
      <Stack.Screen name="blocked-apps" />
      <Stack.Screen name="streak" />
      <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const ready = usePrefs((s) => s.ready);
  const load = usePrefs((s) => s.load);
  const { scheme, vars, colors } = useTheme();
  const language = usePrefs((s) => s.language);
  const locale = resolveLocale(language);
  setLocale(locale);
  useEffect(() => {
    void load();
  }, [load]);
  if (!ready) return <View style={{ flex: 1, backgroundColor: colors.nevoa }} />;
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <View key={locale} className="flex-1" style={vars}>
          <Shell />
          <ScreenBlockerHost />
        </View>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
