import Svg, { Circle, Path, Rect } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
}

const base = { viewBox: '0 0 24 24', fill: 'none' } as const;

export function FlameIcon({ size = 18, color = '#FFBE1F' }: IconProps) {
  return (
    <Svg width={size} height={size} {...base} accessibilityElementsHidden>
      <Path
        d="M12 2c.6 3.2 3.8 4.9 5 8 1.3 3.4-.4 8-5 8-3.7 0-6-2.8-6-5.7 0-1.9.9-3.3 2-4.4.3 1.2 1 1.9 1.8 2.1C9.4 7.5 10.6 4.2 12 2Z"
        fill={color}
      />
    </Svg>
  );
}

export function GemIcon({ size = 18, color = '#FFFFFF' }: IconProps) {
  return (
    <Svg width={size} height={size} {...base} accessibilityElementsHidden>
      <Path d="M6 3h12l4 6-10 12L2 9l4-6Z" fill={color} />
      <Path
        d="M2 9h20M9 3l3 6 3-6M12 21 9 9m3 12 3-12"
        stroke="#16241C"
        strokeOpacity={0.35}
        strokeWidth={1.2}
      />
    </Svg>
  );
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

export function CloseIcon({ size = 18, color = '#16241C' }: IconProps) {
  return (
    <Svg width={size} height={size} {...base} accessibilityElementsHidden>
      <Path d="m6 6 12 12M18 6 6 18" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function StarIcon({ size = 16, color = '#FFBE1F' }: IconProps) {
  return (
    <Svg width={size} height={size} {...base} accessibilityElementsHidden>
      <Path
        d="m12 3 2.7 5.6 6.1.8-4.5 4.2 1.1 6-5.4-3-5.4 3 1.1-6L3.2 9.4l6.1-.8L12 3Z"
        fill={color}
      />
    </Svg>
  );
}

export function PlusIcon({ size = 20, color = '#F7F4E9' }: IconProps) {
  return (
    <Svg width={size} height={size} {...base} accessibilityElementsHidden>
      <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth={3} strokeLinecap="round" />
    </Svg>
  );
}

export function ArrowLeftIcon({ size = 24, color = '#16241C' }: IconProps) {
  return (
    <Svg width={size} height={size} {...base} accessibilityElementsHidden>
      <Path
        d="M19 12H5M11 6l-6 6 6 6"
        stroke={color}
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

export function ChevronRightIcon({ size = 20, color = '#16241C' }: IconProps) {
  return (
    <Svg width={size} height={size} {...base} accessibilityElementsHidden>
      <Path
        d="M9 5l7 7-7 7"
        stroke={color}
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

export function SearchIcon({ size = 20, color = '#7C8B80' }: IconProps) {
  return (
    <Svg width={size} height={size} {...base} accessibilityElementsHidden>
      <Circle cx={11} cy={11} r={6.5} stroke={color} strokeWidth={2.4} fill="none" />
      <Path d="M16 16l4.5 4.5" stroke={color} strokeWidth={2.4} strokeLinecap="round" />
    </Svg>
  );
}

export function WarningIcon({ size = 26, color = '#F08A1F' }: IconProps) {
  return (
    <Svg width={size} height={size} {...base} accessibilityElementsHidden>
      <Path
        d="M12 3.2 22 20.5H2L12 3.2Z"
        stroke={color}
        strokeWidth={2.2}
        strokeLinejoin="round"
        fill={color}
        fillOpacity={0.18}
      />
      <Path d="M12 9.6v5M12 17.4v.2" stroke={color} strokeWidth={2.4} strokeLinecap="round" />
    </Svg>
  );
}

export function PhoneIcon({ size = 24, color = '#FFFFFF' }: IconProps) {
  return (
    <Svg width={size} height={size} {...base} accessibilityElementsHidden>
      <Rect x={7} y={2.5} width={10} height={19} rx={2.4} stroke={color} strokeWidth={2} fill="none" />
      <Path d="M10.5 18.5h3" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function CircleXIcon({ size = 22, color = '#FFFFFF' }: IconProps) {
  return (
    <Svg width={size} height={size} {...base} accessibilityElementsHidden>
      <Circle cx={12} cy={12} r={9.5} stroke={color} strokeWidth={2.2} fill="none" />
      <Path d="M8.5 8.5l7 7M15.5 8.5l-7 7" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
    </Svg>
  );
}
