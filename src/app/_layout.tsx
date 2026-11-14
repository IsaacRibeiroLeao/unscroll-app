import '../global.css';
import {
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
} from '@expo-google-fonts/bricolage-grotesque';
import {
  InstrumentSans_400Regular,
  InstrumentSans_600SemiBold,
} from '@expo-google-fonts/instrument-sans';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
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
import { Text, colors } from '../presentation/ui';

function Shell() {
  const { state, retry } = useBootstrap();
  const [fontsLoaded, fontError] = useFonts({
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
    InstrumentSans_400Regular,
    InstrumentSans_600SemiBold,
  });
  const ready = state === 'ready';
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
