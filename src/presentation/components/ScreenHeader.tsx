import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { strings } from '../../strings/pt-BR';
import { Text, colors } from '../ui';
import { ArrowLeftIcon } from './Icons';

interface Props {
  title: string;
  onBack?: () => void;
  /** Light text and arrow, for headers placed over a dark background. */
  light?: boolean;
}

/** Back arrow + title, used by the stacked (non-tab) screens. */
export function ScreenHeader({ title, onBack, light }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const color = light ? '#FFFFFF' : colors.tinta;
  return (
    <View className="flex-row items-center gap-3 px-5 pb-3" style={{ paddingTop: insets.top + 12 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={strings.common.back}
        hitSlop={10}
        onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))}
        className="h-11 w-11 items-center justify-center rounded-full active:opacity-60"
      >
        <ArrowLeftIcon size={26} color={color} />
      </Pressable>
      <Text accessibilityRole="header" className="font-display-bold text-2xl" style={{ color }}>
        {title}
      </Text>
    </View>
  );
}
