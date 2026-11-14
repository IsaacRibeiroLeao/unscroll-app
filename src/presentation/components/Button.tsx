import { ActivityIndicator, Pressable } from 'react-native';
import { Text, colors } from '../ui';

interface Props {
  label: string;
  onPress: () => void;
  /** primary: ink · sun: earn/reward actions · secondary: outline · ghost: text link */
  variant?: 'primary' | 'sun' | 'secondary' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
}

const BOX = {
  primary: 'bg-tinta',
  sun: 'bg-sol',
  secondary: 'border-2 border-tinta',
  ghost: '',
} as const;
const TEXT = {
  primary: 'text-nevoa',
  sun: 'text-tinta',
  secondary: 'text-tinta',
  ghost: 'text-tinta underline',
} as const;

/** 52dp tall (above the 48dp minimum touch target), fully round. */
export function Button({ label, onPress, variant = 'primary', disabled, loading }: Props) {
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      disabled={off}
      onPress={onPress}
      className={`min-h-[52px] items-center justify-center rounded-full px-6 active:opacity-80 ${BOX[variant]} ${off ? 'opacity-40' : ''}`}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.nevoa : colors.tinta} />
      ) : (
        <Text className={`font-display-bold text-base ${TEXT[variant]}`}>{label}</Text>
      )}
    </Pressable>
  );
}
