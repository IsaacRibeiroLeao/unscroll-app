import type { ExpoConfig, ConfigContext } from 'expo/config';

// app.config.ts (instead of app.json) so the Apple Team ID and bundle ids can be
// read from the build environment (EAS env vars) without committing them.
const APP_ID = 'com.unscroll.app'; // provisional, change before the first store build
const APP_GROUP = `group.${APP_ID}`;
const APPLE_TEAM_ID = process.env.APPLE_TEAM_ID;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Unscroll',
  slug: 'unscroll-app',
  scheme: 'unscroll',
  version: '0.3.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: APP_ID,
    appleTeamId: APPLE_TEAM_ID,
    supportsTablet: false,
    infoPlist: {
      NSCameraUsageDescription:
        'O Unscroll usa a câmera para registrar a prova de que você concluiu sua tarefa.',
    },
    entitlements: {
      // Dev entitlement works with a paid Apple Developer account on a physical device.
      // Distribution (TestFlight/App Store) needs Apple's approval of Family Controls.
      'com.apple.developer.family-controls': true,
      'com.apple.security.application-groups': [APP_GROUP],
    },
  },
  android: {
    package: APP_ID,
    versionCode: 3,
    adaptiveIcon: {
      backgroundColor: '#0F3F29',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    permissions: [
      'android.permission.CAMERA',
      'android.permission.PACKAGE_USAGE_STATS',
      'android.permission.SYSTEM_ALERT_WINDOW',
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_SPECIAL_USE',
      'android.permission.POST_NOTIFICATIONS',
      'android.permission.RECEIVE_BOOT_COMPLETED',
    ],
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    [
      'expo-splash-screen',
      { backgroundColor: '#F7F4E9', image: './assets/images/splash-icon.png', imageWidth: 170 },
    ],
    [
      'expo-camera',
      {
        cameraPermission:
          'O Unscroll usa a câmera para registrar a prova de que você concluiu sua tarefa.',
        recordAudioAndroid: false,
      },
    ],
    [
      'expo-build-properties',
      {
        ios: { deploymentTarget: '16.4' },
        android: { minSdkVersion: 26 },
      },
    ],
    // Creates the iOS extensions (ActivityMonitor, ShieldAction, ShieldConfiguration)
    // and adds the Family Controls entitlement + App Group. See README of the library.
    ['react-native-device-activity', { appleTeamId: APPLE_TEAM_ID, appGroup: APP_GROUP }],
  ],
  experiments: { typedRoutes: true, reactCompiler: true },
  extra: { eas: { projectId: undefined } }, // filled by `eas init` / `eas build:configure`
});
