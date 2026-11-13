import { ActivityIndicator, Pressable, Text } from 'react-native';

interface Props {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
}

const BG = {
  primary: 'bg-brand',
  secondary: 'bg-neutral-200',
  ghost: 'bg-transparent',
} as const;
const FG = {
  primary: 'text-white',
  secondary: 'text-neutral-900',
  ghost: 'text-brand',
} as const;

/** 48dp minimum touch target. */
export function Button({ label, onPress, variant = 'primary', disabled, loading }: Props) {
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      disabled={off}
      onPress={onPress}
      className={`min-h-12 items-center justify-center rounded-2xl px-5 ${BG[variant]} ${off ? 'opacity-50' : ''}`}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#fff' : '#208AEF'} />
      ) : (
        <Text className={`text-base font-semibold ${FG[variant]}`}>{label}</Text>
      )}
    </Pressable>
  );
}
