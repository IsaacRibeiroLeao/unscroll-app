import { Img } from './Img';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useColors } from '../theme';

interface IconProps {
  size?: number;
  color?: string;
}

const base = { viewBox: '0 0 24 24', fill: 'none' } as const;

export function FlameIcon({ size = 18 }: IconProps) {
  return <Img name="fire" size={size} />;
}

export function GemIcon({ size = 18 }: IconProps) {
  return <Img name="gem" size={size} />;
}

export function CameraIcon({ size = 20, color = '#16241C' }: IconProps) {
  return (
    <Svg width={size} height={size} {...base} accessibilityElementsHidden>
      <Path
        d="M4 8h3l1.5-2.5h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <Circle cx={12} cy={13} r={3.4} stroke={color} strokeWidth={1.8} />
    </Svg>
  );
}

export function CheckIcon({ size = 18, color = '#255A41' }: IconProps) {
  return (
    <Svg width={size} height={size} {...base} accessibilityElementsHidden>
      <Path
        d="m5 12.5 4.5 4.5L19 7.5"
        stroke={color}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function CloseIcon({ size = 18, color }: IconProps) {
  const palette = useColors();
  const c = color ?? palette.tinta;
  return (
    <Svg width={size} height={size} {...base} accessibilityElementsHidden>
      <Path d="m6 6 12 12M18 6 6 18" stroke={c} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function StarIcon({ size = 16 }: IconProps) {
  return <Img name="star" size={size} />;
}

export function PlusIcon({ size = 20, color = '#F7F4E9' }: IconProps) {
  return (
    <Svg width={size} height={size} {...base} accessibilityElementsHidden>
      <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth={3} strokeLinecap="round" />
    </Svg>
  );
}

export function ArrowLeftIcon({ size = 24, color }: IconProps) {
  const palette = useColors();
  const c = color ?? palette.tinta;
  return (
    <Svg width={size} height={size} {...base} accessibilityElementsHidden>
      <Path
        d="M19 12H5M11 6l-6 6 6 6"
        stroke={c}
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

export function ChevronRightIcon({ size = 20, color }: IconProps) {
  const palette = useColors();
  const c = color ?? palette.tinta;
  return (
    <Svg width={size} height={size} {...base} accessibilityElementsHidden>
      <Path
        d="M9 5l7 7-7 7"
        stroke={c}
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

export function SearchIcon({ size = 20, color }: IconProps) {
  const palette = useColors();
  const c = color ?? palette.muted;
  return (
    <Svg width={size} height={size} {...base} accessibilityElementsHidden>
      <Circle cx={11} cy={11} r={6.5} stroke={c} strokeWidth={2.4} fill="none" />
      <Path d="M16 16l4.5 4.5" stroke={c} strokeWidth={2.4} strokeLinecap="round" />
    </Svg>
  );
}

export function WarningIcon({ size = 26 }: IconProps) {
  return <Img name="warn" size={size} />;
}

export function PhoneIcon({ size = 24, color = '#FFFFFF' }: IconProps) {
  return (
    <Svg width={size} height={size} {...base} accessibilityElementsHidden>
      <Rect x={7} y={2.5} width={10} height={19} rx={2.4} stroke={color} strokeWidth={2} fill="none" />
      <Path d="M10.5 18.5h3" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function CircleXIcon({ size = 22 }: IconProps) {
  return <Img name="no" size={size} />;
}
