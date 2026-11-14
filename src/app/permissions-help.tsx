import { useRouter } from 'expo-router';
import { Linking, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../presentation/components/Button';
import { Enter } from '../presentation/motion';
import { Text } from '../presentation/ui';
import { strings } from '../strings/pt-BR';

/** Walks the user through Android's "Allow restricted settings" for sideloaded installs. */
export default function PermissionsHelpScreen() {
  const router = useRouter();
  const t = strings.permissionsHelp;

  return (
    <SafeAreaView className="flex-1 bg-nevoa">
      <ScrollView contentContainerClassName="gap-4 p-5">
        <Enter index={0} className="gap-2">
          <Text accessibilityRole="header" className="font-display-bold text-2xl text-tinta">
            {t.title}
          </Text>
          <Text className="text-base text-tinta/80">{t.intro}</Text>
        </Enter>

        {t.steps.map((step, i) => (
          <Enter
            key={step}
            index={i + 1}
            className="flex-row items-start gap-3 rounded-2xl bg-folha p-4"
          >
            <View className="h-8 w-8 items-center justify-center rounded-full bg-tinta">
              <Text className="font-display-bold text-base text-nevoa">{i + 1}</Text>
            </View>
            <Text className="flex-1 text-base text-tinta">{step}</Text>
          </Enter>
        ))}

        <Enter index={t.steps.length + 1} className="gap-1 rounded-2xl bg-[#E6EDE0] p-4">
          <Text className="font-display-bold text-base text-tinta">{t.noMenuTitle}</Text>
          <Text className="text-sm text-tinta/75">{t.noMenuBody}</Text>
        </Enter>

        <Enter index={t.steps.length + 2} className="gap-2">
          <Button label={t.openSettings} onPress={() => void Linking.openSettings()} />
          <Button variant="ghost" label={t.back} onPress={() => router.back()} />
        </Enter>
      </ScrollView>
    </SafeAreaView>
  );
}
