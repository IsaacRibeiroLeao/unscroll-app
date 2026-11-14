import type { ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { PressableScale } from '../motion';
import { Text, colors } from '../ui';
import { GradientView } from './art';

interface Props {
  label: string;
  onPress: () => void;
  /**
   * primary: deep green · forest: green gradient (main action on light) · sun: gold, earn/reward actions · secondary: outline on light ·
   * outlineSun: gold outline on dark · ghost / ghostLight: text link on light / dark
   */
  variant?: 'primary' | 'forest' | 'sun' | 'danger' | 'secondary' | 'outlineSun' | 'ghost' | 'ghostLight';
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  /** Shown after the label (e.g. a chevron). */
  trailing?: ReactNode;
}

const BOX = {
  primary: 'bg-tinta',
  forest: '',
  sun: '',
  danger: 'bg-pimenta',
  secondary: 'border-2 border-tinta bg-folha/60',
  outlineSun: 'border-2 border-sol',
  ghost: '',
  ghostLight: '',
} as const;
const TEXT = {
  primary: 'text-nevoa',
  forest: 'text-white',
  sun: 'text-tinta',
  danger: 'text-white',
  secondary: 'text-tinta',
  outlineSun: 'text-nevoa',
  ghost: 'text-tinta underline',
  ghostLight: 'text-nevoa underline',
} as const;

const GRADIENT = {
  sun: ['#FFD84D', '#FFB703'],
  forest: ['#25805A', '#145A3E'],
} as const;

/** 54dp tall (above the 48dp minimum touch target), fully round. */
export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  icon,
  trailing,
}: Props) {
  const off = disabled || loading;
  const link = variant === 'ghost' || variant === 'ghostLight';
  const gradient = variant === 'sun' || variant === 'forest' ? GRADIENT[variant] : null;
  const dark = variant === 'primary' || variant === 'outlineSun' || variant === 'forest' || variant === 'danger';

  const content = loading ? (
    <ActivityIndicator color={dark ? colors.nevoa : colors.tinta} />
  ) : (
    <View className="flex-row items-center gap-2">
      {icon}
      <Text className={`font-display-bold text-[17px] ${TEXT[variant]}`}>{label}</Text>
      {trailing}
    </View>
  );

  return (
    <PressableScale
      scaleTo={link ? 0.98 : 0.95}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      disabled={off}
      onPress={onPress}
      className={`rounded-full active:opacity-80 ${off ? 'opacity-45' : ''}`}
      style={
        gradient
          ? {
              shadowColor: variant === 'sun' ? '#B27A00' : '#0E3F2B',
              shadowOpacity: 0.28,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 4 },
              elevation: 3,
            }
          : undefined
      }
    >
      {gradient ? (
        <GradientView
          id={`btn-${variant}`}
          stops={[gradient[0], gradient[1]]}
          style={{ borderRadius: 999 }}
          className="min-h-[54px] items-center justify-center px-6"
        >
          {content}
        </GradientView>
      ) : (
        <View
          className={`items-center justify-center rounded-full px-6 ${link ? 'min-h-12' : 'min-h-[54px]'} ${BOX[variant]}`}
        >
          {content}
        </View>
      )}
    </PressableScale>
  );
}
