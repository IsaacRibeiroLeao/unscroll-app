import { Text, View } from 'react-native';
import { strings } from '@/strings/pt-BR';

export default function HomeScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white px-6">
      <Text className="text-3xl font-bold text-brand">{strings.app.name}</Text>
      <Text className="mt-2 text-center text-base text-neutral-700">{strings.app.tagline}</Text>
      <Text className="mt-6 text-center text-sm text-neutral-500">
        {strings.home.scaffoldNotice}
      </Text>
    </View>
  );
}
