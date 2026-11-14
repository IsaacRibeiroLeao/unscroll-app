import type { ReactNode } from 'react';
import { View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

export const softShadow = {
  shadowColor: '#16372A',
  shadowOpacity: 0.09,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
} as const;

interface Props {
  children: ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
  accessible?: boolean;
  accessibilityLabel?: string;
}

/** White rounded card with the soft shadow used across the app. */
export function Card({ children, className, style, accessible, accessibilityLabel }: Props) {
  return (
    <View
      accessible={accessible}
      accessibilityLabel={accessibilityLabel}
      className={`rounded-3xl bg-folha ${className ?? ''}`}
      style={[softShadow, style]}
    >
      {children}
    </View>
  );
}
