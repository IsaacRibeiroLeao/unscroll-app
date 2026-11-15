import { useState } from 'react';
import { Img } from './Img';
import type { UiAsset } from '../uiAssets';
import { useTheme } from '../theme';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import type { ColorValue, StyleProp, ViewStyle } from 'react-native';
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient,
  Path,
  Rect,
  RadialGradient,
  Stop,
} from 'react-native-svg';

/** Decorative SVG art. Everything here is hidden from screen readers. */
const hidden = {
  accessibilityElementsHidden: true,
  importantForAccessibility: 'no-hide-descendants',
} as const;

interface GradientProps {
  /** top → bottom stops */
  stops: [string, string];
  id: string;
  style?: StyleProp<ViewStyle>;
  className?: string;
  children?: ReactNode;
}

/** A view with a vertical gradient background (no native gradient dependency). */
export function GradientView({ stops, id, style, className, children }: GradientProps) {
  // Measured in px: percentage-sized SVGs can stay at their first (animated) size on Android.
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  return (
    <View
      style={[{ overflow: 'hidden' }, style]}
      className={className}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setSize((prev) =>
          prev && prev.w === width && prev.h === height ? prev : { w: width, h: height },
        );
      }}
    >
      {size ? (
        <Svg
          style={StyleSheet.absoluteFill}
          width={size.w}
          height={size.h}
          viewBox={`0 0 ${size.w} ${size.h}`}
          {...hidden}
        >
          <Defs>
            <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={stops[0]} />
              <Stop offset="1" stopColor={stops[1]} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width={size.w} height={size.h} fill={`url(#${id})`} />
        </Svg>
      ) : null}
      {children}
    </View>
  );
}

/** Rolling hills along the bottom edge. */
export function Hills({
  height = 150,
  tone = 'light',
}: {
  height?: number;
  tone?: 'light' | 'dark';
}) {
  const dark = useTheme().scheme === 'dark';
  const c =
    tone === 'light' && !dark
      ? { a: '#D9E8A8', b: '#A9CF7E', c: '#74B35F' }
      : { a: '#2C7A4F', b: '#1E6440', c: '#17533A' };
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
      <Svg
        width="100%"
        height={height}
        viewBox="0 0 400 150"
        preserveAspectRatio="none"
        {...hidden}
      >
        <Path d="M0 70 C80 20 160 30 240 62 C310 90 360 60 400 36 V150 H0 Z" fill={c.a} />
        <Path d="M0 100 C70 70 140 80 210 104 C290 130 350 96 400 80 V150 H0 Z" fill={c.b} />
        <Path d="M0 128 C90 108 170 118 250 132 C320 144 370 128 400 118 V150 H0 Z" fill={c.c} />
      </Svg>
    </View>
  );
}

function star(cx: number, cy: number, r: number) {
  const k = r * 0.22;
  return `M${cx} ${cy - r} Q${cx + k} ${cy - k} ${cx + r} ${cy} Q${cx + k} ${cy + k} ${cx} ${cy + r} Q${cx - k} ${cy + k} ${cx - r} ${cy} Q${cx - k} ${cy - k} ${cx} ${cy - r} Z`;
}

/** A few scattered four-point sparkles. */
export function Sparkles({
  color = '#FFC72C',
  style,
}: {
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" {...hidden}>
        <Path d={star(14, 22, 3.2)} fill={color} />
        <Path d={star(88, 14, 2.4)} fill={color} opacity={0.8} />
        <Path d={star(80, 52, 3)} fill={color} opacity={0.9} />
        <Path d={star(8, 60, 2)} fill={color} opacity={0.7} />
      </Svg>
    </View>
  );
}

/** Sunburst rays + confetti for the celebration screen. */
export function Burst() {
  const rays = Array.from({ length: 16 }, (_, i) => i);
  const dots: [number, number, string][] = [
    [18, 22, '#E8503A'],
    [82, 18, '#2E9A5B'],
    [10, 48, '#2E9A5B'],
    [90, 44, '#E8503A'],
    [26, 70, '#FFFFFF'],
    [76, 74, '#FFFFFF'],
    [50, 8, '#E8503A'],
    [34, 12, '#2E9A5B'],
    [66, 30, '#E8503A'],
    [14, 36, '#E8503A'],
    [88, 62, '#2E9A5B'],
  ];
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMin slice"
        {...hidden}
      >
        <Defs>
          <RadialGradient id="burst" cx="50%" cy="28%" r="70%">
            <Stop offset="0" stopColor="#FFF3B0" />
            <Stop offset="0.55" stopColor="#FFD54A" />
            <Stop offset="1" stopColor="#FFB81C" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100" height="100" fill="url(#burst)" />
        <G origin="50, 28" opacity={0.22}>
          {rays.map((i) => (
            <Path
              key={i}
              d="M50 28 L44 -40 L56 -40 Z"
              fill="#FFFFFF"
              rotation={i * 22.5}
              origin="50, 28"
            />
          ))}
        </G>
        {dots.map(([x, y, c]) => (
          <Rect
            key={`${x}-${y}`}
            x={x}
            y={y}
            width={2.2}
            height={4}
            rx={0.6}
            fill={c}
            rotation={x * 3}
            origin={`${x}, ${y}`}
          />
        ))}
      </Svg>
    </View>
  );
}

/** Green hexagonal badge with a check (celebration hero). */
export function CheckBadge({ size = 130 }: { size?: number }) {
  return <Img name="check" size={size} />;
}

/** Golden shield with a star (streak protection). */
export function ShieldArt({ size = 64 }: { size?: number }) {
  return <Img name="shield_crown" size={size} />;
}

/** Blue clock (extra screen time). */
export function ClockArt({ size = 54 }: { size?: number }) {
  return <Img name="stopwatch" size={size} />;
}

/** Round category badge (house / dumbbell / book / graduation cap) used on task cards. */
export function CategoryArt({ size = 56, category, done = false }: { size?: number; category: 'home' | 'exercise' | 'reading' | 'study'; done?: boolean }) {
  return <Img name={{ home: 'clipboard', exercise: 'bear_power', reading: 'book', study: 'medal' }[category] as UiAsset} size={size} style={done ? { opacity: 0.4 } : undefined} />;
}

/** Generic "task done in real life" illustration (clipboard with check). */
export function TaskArt({ size = 54, done = false }: { size?: number; done?: boolean }) {
  return <Img name="clipboard" size={size} style={done ? { opacity: 0.4 } : undefined} />;
}

export function CrownIcon({ size = 32 }: { size?: number }) {
  return <Img name="crown" size={size} />;
}

export function LockIcon({ size = 22 }: { size?: number; color?: string }) {
  return <Img name="lock" size={size} />;
}

export function SparkleIcon({ size = 20 }: { size?: number }) {
  return <Img name="sparkles" size={size} />;
}

export function PhoneArt({ size = 220 }: { size?: number }) {
  return <Img name="phone" size={size} />;
}

export function HourglassArt({ size = 46 }: { size?: number }) {
  return <Img name="stopwatch" size={size} />;
}

// ---- Tab bar icons (stroke style) ----
type TabIconProps = { size?: number; color: ColorValue };
const stroke = {
  fill: 'none',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

export function HomeTabIcon({ size = 26, color }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...hidden}>
      <Path
        d="M3 11 L12 3 L21 11 V20 a1 1 0 0 1 -1 1 H15 V14 H9 V21 H4 a1 1 0 0 1 -1 -1 Z"
        fill={color}
      />
    </Svg>
  );
}
export function ShopTabIcon({ size = 26, color }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...hidden}>
      <Path d="M5 8 H19 L20 21 H4 Z" stroke={color} {...stroke} />
      <Path d="M9 8 V6 a3 3 0 0 1 6 0 V8" stroke={color} {...stroke} />
    </Svg>
  );
}
export function StatsTabIcon({ size = 26, color }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...hidden}>
      <Rect x={4} y={12} width={4} height={8} rx={1} fill={color} />
      <Rect x={10} y={5} width={4} height={15} rx={1} fill={color} />
      <Rect x={16} y={9} width={4} height={11} rx={1} fill={color} />
    </Svg>
  );
}
export function ProfileTabIcon({ size = 26, color }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...hidden}>
      <Circle cx={12} cy={8} r={4} stroke={color} {...stroke} />
      <Path d="M4 21 c0 -4.5 3.6 -7 8 -7 s8 2.5 8 7" stroke={color} {...stroke} />
    </Svg>
  );
}

/** Translucent generic "distracting app" bubbles (no real brand marks) for the dark screens. */
export function FloatingApps() {
  const bubble = (left: string, top: number, size: number, glyph: ReactNode) => (
    <View
      key={left}
      className="absolute items-center justify-center rounded-full bg-white/10"
      style={{ left: left as `${number}%`, top, width: size, height: size }}
    >
      <Svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" {...hidden}>
        {glyph}
      </Svg>
    </View>
  );
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {bubble(
        '8%',
        70,
        64,
        <G stroke="#FFFFFF" strokeOpacity={0.45} strokeWidth={2} fill="none">
          <Rect x={4} y={4} width={16} height={16} rx={5} />
          <Circle cx={12} cy={12} r={3.6} />
        </G>,
      )}
      {bubble('74%', 110, 58, <Path d="M8 5 L19 12 L8 19 Z" fill="#FFFFFF" fillOpacity={0.4} />)}
      {bubble(
        '2%',
        190,
        50,
        <Path
          d="M10 4 V15.5 a3 3 0 1 1 -2 -2.8 V4 Z M10 4 L17 6"
          fill="#FFFFFF"
          fillOpacity={0.4}
        />,
      )}
    </View>
  );
}

/** Phone locked behind a padlock, with generic app tiles and leaves (onboarding slide 2). */
export function PhoneLockArt({ size = 230 }: { size?: number }) {
  return <Img name="bear_shield" size={size} />;
}

/** Golden trophy with gems and leaves (onboarding slide 3). */
export function TrophyArt({ size = 230 }: { size?: number }) {
  return <Img name="chest" size={size} />;
}
