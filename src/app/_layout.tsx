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
import { useCallback, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ScreenBlockerHost from '../infra/native/ScreenBlockerHost';
import { Button } from '../presentation/components/Button';
import { AuthScreen } from '../presentation/screens/AuthScreen';
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
import { Text, colors } from '../presentation/ui';

function Shell() {
  const { state, retry } = useBootstrap();
  const [fontsLoaded, fontError] = useFonts({
    Nunito_400Regular,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    Nunito_900Black,
  });
  const [recovery, setRecovery] = useState<'form' | 'invalid' | null>(null);
  const onRecoveryLink = useCallback((url: string) => {
    auth
      .completeRecovery(url)
      .then(() => setRecovery('form'))
      .catch(() => setRecovery('invalid'));
  }, []);
  useRecoveryLink(onRecoveryLink);
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
  if (state === 'signedOut' || recovery === 'invalid') {
    return (
      <AuthScreen
        notice={recovery === 'invalid' ? strings.auth.linkInvalid : null}
        onDone={() => {
          setRecovery(null);
          retry();
        }}
      />
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
      <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="auto" />
        <Shell />
        <ScreenBlockerHost />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
