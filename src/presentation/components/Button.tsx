import type { ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { PressableScale } from '../motion';
import { Text, colors } from '../ui';

interface Props {
  label: string;
  onPress: () => void;
  /**
   * primary: deep green · sun: gold, earn/reward actions · secondary: outline on light ·
   * outlineSun: gold outline on dark · ghost / ghostLight: text link on light / dark
   */
  variant?: 'primary' | 'sun' | 'secondary' | 'outlineSun' | 'ghost' | 'ghostLight';
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
}

const BOX = {
  primary: 'bg-tinta',
  sun: 'bg-sol',
  secondary: 'border-2 border-tinta bg-folha/60',
  outlineSun: 'border-2 border-sol',
  ghost: '',
  ghostLight: '',
} as const;
const TEXT = {
  primary: 'text-nevoa',
  sun: 'text-tinta',
  secondary: 'text-tinta',
  outlineSun: 'text-nevoa',
  ghost: 'text-tinta underline',
  ghostLight: 'text-nevoa underline',
} as const;

/** 54dp tall (above the 48dp minimum touch target), fully round. */
export function Button({ label, onPress, variant = 'primary', disabled, loading, icon }: Props) {
  const off = disabled || loading;
  const link = variant === 'ghost' || variant === 'ghostLight';
  return (
    <PressableScale
      scaleTo={link ? 0.98 : 0.95}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      disabled={off}
      onPress={onPress}
      className={`items-center justify-center rounded-full px-6 active:opacity-80 ${link ? 'min-h-12' : 'min-h-[54px]'} ${BOX[variant]} ${off ? 'opacity-45' : ''}`}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' || variant === 'outlineSun' ? colors.nevoa : colors.tinta}
        />
      ) : (
        <View className="flex-row items-center gap-2">
          {icon}
          <Text className={`font-display-bold text-[17px] ${TEXT[variant]}`}>{label}</Text>
        </View>
      )}
    </PressableScale>
  );
}
