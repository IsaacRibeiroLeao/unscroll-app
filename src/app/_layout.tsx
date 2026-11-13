import '../global.css';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import ScreenBlockerHost from '../infra/native/ScreenBlockerHost';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }} />
      <ScreenBlockerHost />
    </>
  );
}
