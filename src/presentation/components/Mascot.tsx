import { Image, View } from 'react-native';
import type { MascotMood, MascotSkin } from '../../domain/mascot';
import { SPRITES } from './mascotSprites';
import type { Sprite } from './mascotSprites';

const POSE: Record<MascotMood, Sprite> = {
  happy: 'cheer',
  wink: 'wink',
  proud: 'thumbs',
  royal: 'trophy',
  peek: 'peek',
  phone: 'phone',
  sad: 'cry',
  sleepy: 'sleepy',
  clock: 'clock',
  gems: 'gems',
  love: 'love',
  think: 'think',
  surprised: 'surprised',
  laptop: 'laptop',
  celebrate: 'celebrate',
  cool: 'cool',
};

interface Props {
  skin: MascotSkin;
  mood: MascotMood;
  size?: number;
  /** 'head' crops to the face (shop thumbnails). */
  crop?: 'full' | 'head';
}

/** The Unscroll bear (illustrated sprites per pose and skin). Decorative: hidden from screen readers. */
export function Mascot({ skin, mood, size = 120, crop = 'full' }: Props) {
  const source = SPRITES[skin][POSE[mood]];
  const hidden = {
    accessibilityElementsHidden: true,
    importantForAccessibility: 'no-hide-descendants',
  } as const;
  if (crop === 'head') {
    // Zoom into the upper part, where the face is, and clip the rest.
    const big = size * 1.9;
    return (
      <View style={{ width: size, height: size, overflow: 'hidden' }} {...hidden}>
        <Image
          source={source}
          resizeMode="contain"
          style={{ width: big, height: big, marginLeft: -(big - size) / 2, marginTop: -big * 0.12 }}
        />
      </View>
    );
  }
  return (
    <Image source={source} resizeMode="contain" style={{ width: size, height: size }} {...hidden} />
  );
}
