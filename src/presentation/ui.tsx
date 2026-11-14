import { Text as RNText } from 'react-native';
import type { TextProps } from 'react-native';

export const colors = {
  nevoa: '#EAEFE8',
  folha: '#F6F8F4',
  tinta: '#16241C',
  musgo: '#255A41',
  sol: '#FFBE1F',
  pimenta: '#D6392B',
  fio: '#C5D0C6',
} as const;

/** Text with the body font by default (custom fonts need an explicit family per weight). */
export function Text({ className, ...props }: TextProps & { className?: string }) {
  const hasFont = className?.includes('font-') ?? false;
  return <RNText {...props} className={`${hasFont ? '' : 'font-body '}${className ?? ''}`} />;
}
