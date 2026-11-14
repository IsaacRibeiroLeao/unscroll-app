import { Image, View } from 'react-native';
import type { BlockedApp } from '../../application/ports/IScreenBlockerService';
import { Text } from '../ui';

/** App icon from the base64 PNG the native module reads; a lettered tile when there is none. */
export function AppIcon({ app, size = 52 }: { app: BlockedApp; size?: number }) {
  if (app.iconBase64) {
    return (
      <Image
        accessibilityIgnoresInvertColors
        source={{ uri: `data:image/png;base64,${app.iconBase64}` }}
        style={{ width: size, height: size, borderRadius: size * 0.24 }}
      />
    );
  }
  return (
    <View
      className="items-center justify-center bg-floresta/15"
      style={{ width: size, height: size, borderRadius: size * 0.24 }}
    >
      <Text className="font-display-bold text-tinta" style={{ fontSize: size * 0.42 }}>
        {app.label.slice(0, 1).toUpperCase()}
      </Text>
    </View>
  );
}
