import '../global.css';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ScreenBlockerHost from '../infra/native/ScreenBlockerHost';
import { Button } from '../presentation/components/Button';
import { queryClient } from '../presentation/state/container';
import {
  useBlockScreenInfoSync,
  useBootstrap,
  useForegroundSync,
  useNotificationRouting,
} from '../presentation/state/useAppRuntime';
import { strings } from '../strings/pt-BR';

function Shell() {
  const { state, retry } = useBootstrap();
  const ready = state === 'ready';
  useForegroundSync(ready);
  useBlockScreenInfoSync(ready);
  useNotificationRouting(ready);

  if (state === 'loading') {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-50">
        <ActivityIndicator accessibilityLabel={strings.common.loading} color="#208AEF" />
      </View>
    );
  }
  if (state === 'error') {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-neutral-50 px-8">
        <Text className="text-xl font-bold text-neutral-900">{strings.bootstrap.errorTitle}</Text>
        <Text className="mb-2 text-center text-neutral-600">{strings.bootstrap.errorBody}</Text>
        <Button label={strings.common.retry} onPress={retry} />
      </View>
    );
  }
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="new-task" options={{ presentation: 'modal' }} />
      <Stack.Screen name="proof/[taskId]" options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="celebration" options={{ gestureEnabled: false }} />
      <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
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
