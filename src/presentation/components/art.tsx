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
  return (
    <View style={[{ overflow: 'hidden' }, style]} className={className}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" {...hidden}>
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={stops[0]} />
            <Stop offset="1" stopColor={stops[1]} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
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
  const c =
    tone === 'light'
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
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" {...hidden}>
      <Defs>
        <LinearGradient id="badge" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#46C071" />
          <Stop offset="1" stopColor="#1E8A4C" />
        </LinearGradient>
      </Defs>
      <Path
        d="M60 8 L100 28 Q110 33 110 44 V76 Q110 87 100 92 L60 112 L20 92 Q10 87 10 76 V44 Q10 33 20 28 Z"
        fill="url(#badge)"
        stroke="#0F6B38"
        strokeWidth={3}
        strokeLinejoin="round"
      />
      <Path
        d="M36 62 L53 79 L86 44"
        stroke="#FFFFFF"
        strokeWidth={13}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

/** Golden shield with a star (streak protection). */
export function ShieldArt({ size = 64 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" {...hidden}>
      <Defs>
        <LinearGradient id="shield" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFE585" />
          <Stop offset="1" stopColor="#F2A900" />
        </LinearGradient>
        <LinearGradient id="shieldIn" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#3FA46A" />
          <Stop offset="1" stopColor="#1B6B43" />
        </LinearGradient>
      </Defs>
      <Path d="M50 4 L90 18 V50 C90 74 72 90 50 98 C28 90 10 74 10 50 V18 Z" fill="url(#shield)" />
      <Path
        d="M50 12 L82 23 V50 C82 69 67 82 50 89 C33 82 18 69 18 50 V23 Z"
        fill="url(#shieldIn)"
      />
      <Path
        d="m50 28 6.6 13.6 15 2-11 10.4 2.8 14.8L50 61.6 36.6 68.8l2.8-14.8-11-10.4 15-2Z"
        fill="#FFD23F"
        stroke="#F2A900"
        strokeWidth={2}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Blue clock (extra screen time). */
export function ClockArt({ size = 54 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" {...hidden}>
      <Circle cx={50} cy={50} r={44} fill="#2F7FE0" />
      <Circle cx={50} cy={50} r={35} fill="#FFFFFF" />
      <Path
        d="M50 28 V52 L66 62"
        stroke="#1D4F9E"
        strokeWidth={7}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Circle cx={50} cy={50} r={4} fill="#1D4F9E" />
    </Svg>
  );
}

/** Generic "task done in real life" illustration (clipboard with check). */
export function TaskArt({ size = 54, done = false }: { size?: number; done?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" {...hidden}>
      <Rect x={22} y={14} width={56} height={74} rx={10} fill={done ? '#D8D8D0' : '#F4E3B8'} />
      <Rect x={38} y={8} width={24} height={14} rx={6} fill={done ? '#B8B8B0' : '#C98A3B'} />
      <Path
        d="M36 50 L47 61 L66 38"
        stroke={done ? '#9A9A92' : '#2E9A5B'}
        strokeWidth={9}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d="M34 76 H66"
        stroke={done ? '#B8B8B0' : '#D9B876'}
        strokeWidth={5}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function CrownIcon({ size = 32 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" {...hidden}>
      <Defs>
        <LinearGradient id="crown" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFE585" />
          <Stop offset="1" stopColor="#F2A900" />
        </LinearGradient>
      </Defs>
      <Path
        d="M6 22 L20 34 L32 12 L44 34 L58 22 L52 52 H12 Z"
        fill="url(#crown)"
        stroke="#D18B00"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <Circle cx={6} cy={22} r={4} fill="#FFD23F" />
      <Circle cx={32} cy={12} r={4} fill="#FFD23F" />
      <Circle cx={58} cy={22} r={4} fill="#FFD23F" />
      <Rect x={12} y={46} width={40} height={6} rx={2} fill="#D18B00" opacity={0.35} />
    </Svg>
  );
}

export function LockIcon({ size = 22, color = '#5E7A6A' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...hidden}>
      <Rect x={5} y={10.5} width={14} height={10} rx={2.5} fill={color} />
      <Path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" stroke={color} strokeWidth={2} fill="none" />
    </Svg>
  );
}

export function SparkleIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...hidden}>
      <Path d={star(9, 12, 7.5)} fill="#2E9A5B" />
      <Path d={star(18, 6, 4)} fill="#FFC72C" />
      <Path d={star(18, 18, 3.4)} fill="#3F8FE0" />
    </Svg>
  );
}

export function PhoneArt({ size = 220 }: { size?: number }) {
  return (
    <Svg width={size} height={size * 1.1} viewBox="0 0 200 220" {...hidden}>
      <Path
        d="M30 150 C20 100 60 60 100 70 C150 60 190 100 170 150 C160 190 60 200 30 150 Z"
        fill="#EAF2D8"
      />
      <Rect x={62} y={14} width={84} height={160} rx={16} fill="#183A2B" />
      <Rect x={68} y={22} width={72} height={144} rx={10} fill="#A8D8B8" />
      <Rect x={92} y={26} width={24} height={5} rx={2.5} fill="#183A2B" />
      <Circle cx={146} cy={96} r={24} fill="#2E9A5B" stroke="#FFFFFF" strokeWidth={4} />
      <Path
        d="M135 96 L143 104 L158 87"
        stroke="#FFFFFF"
        strokeWidth={6}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Path d={star(34, 60, 9)} fill="#FFC72C" />
      <Path d={star(176, 40, 8)} fill="#FFC72C" />
      <Path d={star(28, 130, 5)} fill="#FFC72C" />
    </Svg>
  );
}

export function HourglassArt({ size = 46 }: { size?: number }) {
  return (
    <Svg width={size} height={size * 1.4} viewBox="0 0 50 70" {...hidden}>
      <Rect x={6} y={2} width={38} height={7} rx={3} fill="#E0A21B" />
      <Rect x={6} y={61} width={38} height={7} rx={3} fill="#E0A21B" />
      <Path
        d="M11 9 H39 C39 24 30 29 28 35 C30 41 39 46 39 61 H11 C11 46 20 41 22 35 C20 29 11 24 11 9 Z"
        fill="#FFF3C9"
        stroke="#E0A21B"
        strokeWidth={2}
      />
      <Path d="M17 14 H33 C32 22 27 26 25 30 C23 26 18 22 17 14 Z" fill="#FFC72C" />
      <Path d="M16 56 H34 C32 50 28 46 25 44 C22 46 18 50 16 56 Z" fill="#FFC72C" />
    </Svg>
  );
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
