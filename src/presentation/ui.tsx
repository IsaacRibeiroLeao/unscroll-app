import { Text as RNText } from 'react-native';
import type { TextProps } from 'react-native';

export const colors = {
  nevoa: '#F7F4E9',
  folha: '#FFFFFF',
  tinta: '#16372A',
  musgo: '#12452E',
  floresta: '#1F6B43',
  sol: '#FFC72C',
  pimenta: '#D6392B',
  fio: '#E5E0CC',
} as const;

/** Text with the body font by default (custom fonts need an explicit family per weight). */
export function Text({ className, ...props }: TextProps & { className?: string }) {
  const hasFont = className?.includes('font-') ?? false;
  return <RNText {...props} className={`${hasFont ? '' : 'font-body '}${className ?? ''}`} />;
}
