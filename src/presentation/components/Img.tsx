import { Image } from 'expo-image';
import type { StyleProp, ImageStyle } from 'react-native';
import { UI_ASSETS, type UiAsset } from '../uiAssets';

interface Props {
  name: UiAsset;
  /** Height-limited box: the picture keeps its own aspect ratio inside `size` x `size`. */
  size: number;
  style?: StyleProp<ImageStyle>;
}

/** A piece of the illustrated set (assets/ui). Decorative: hidden from screen readers. */
export function Img({ name, size, style }: Props) {
  return (
    <Image
      source={UI_ASSETS[name]}
      contentFit="contain"
      style={[{ width: size, height: size }, style]}
      accessible={false}
    />
  );
}
