import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { strings } from '../../strings/pt-BR';
import { CrownIcon, GradientView, Sparkles } from '../components/art';
import { Button } from '../components/Button';
import { Mascot } from '../components/Mascot';
import { Enter, Float } from '../motion';
import { Text } from '../ui';

interface Props {
  onStart: () => void;
  onSignIn: () => void;
}

/** First screen for someone who is not signed in: dark green, big bear, two ways in. */
export function WelcomeScreen({ onStart, onSignIn }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <GradientView id="welcome" stops={['#16573A', '#082B1B']} className="flex-1">
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Svg width="100%" height="100%" viewBox="0 0 400 800" preserveAspectRatio="none">
          <Path d="M0 330 C90 250 170 290 260 330 C330 360 370 330 400 300 V800 H0 Z" fill="#1F6B43" opacity={0.35} />
          <Path d="M0 470 C80 410 180 440 270 480 C340 510 380 480 400 450 V800 H0 Z" fill="#0F4A2E" opacity={0.55} />
        </Svg>
      </View>
      <Sparkles />
      <View className="flex-1 justify-between px-8" style={{ paddingTop: insets.top + 36, paddingBottom: insets.bottom + 24 }}>
        <Enter index={0} className="items-center gap-2">
          <View className="flex-row items-center gap-2">
            <CrownIcon size={40} />
            <Text accessibilityRole="header" className="font-display text-[38px] text-white">
              {strings.app.name}
            </Text>
          </View>
          <Text className="text-lg text-white/90">{strings.welcome.tagline}</Text>
        </Enter>

        <Enter index={1} className="items-center">
          <Float amplitude={6} duration={1700}>
            <Mascot skin="default" mood="phone" size={290} />
          </Float>
        </Enter>

        <Enter index={2} className="gap-4">
          <Text className="text-center font-display-bold text-xl leading-7 text-white">
            {strings.welcome.pitch}
          </Text>
          <Button label={strings.welcome.start} variant="sun" onPress={onStart} />
          <Button label={strings.welcome.haveAccount} variant="ghostLight" onPress={onSignIn} />
        </Enter>
      </View>
    </GradientView>
  );
}
