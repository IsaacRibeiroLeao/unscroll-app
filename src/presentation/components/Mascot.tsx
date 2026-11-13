import Svg, { Circle, G, Path, Text as SvgText } from 'react-native-svg';
import type { MascotMood, MascotSkin } from '../../domain/mascot';

const BODY: Record<MascotSkin, { body: string; belly: string }> = {
  default: { body: '#F59E0B', belly: '#FDE68A' },
  mascot_skin_fire: { body: '#EF4444', belly: '#FCA5A5' },
  mascot_skin_zen: { body: '#10B981', belly: '#A7F3D0' },
};
const INK = '#1F2937';

interface Props {
  skin: MascotSkin;
  mood: MascotMood;
  size?: number;
}

/** Original mascot drawn with SVG primitives. Decorative: hidden from screen readers. */
export function Mascot({ skin, mood, size = 96 }: Props) {
  const c = BODY[skin];
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Circle cx={26} cy={26} r={13} fill={c.body} />
      <Circle cx={74} cy={26} r={13} fill={c.body} />
      <Circle cx={50} cy={56} r={38} fill={c.body} />
      <Circle cx={50} cy={68} r={22} fill={c.belly} />
      {mood === 'sleepy' ? (
        <G stroke={INK} strokeWidth={3} strokeLinecap="round" fill="none">
          <Path d="M32 52 Q38 58 44 52" />
          <Path d="M56 52 Q62 58 68 52" />
          <Path d="M44 70 Q50 74 56 70" />
        </G>
      ) : (
        <G>
          <Circle cx={38} cy={52} r={5} fill={INK} />
          <Circle cx={62} cy={52} r={5} fill={INK} />
          <Path
            d={mood === 'proud' ? 'M38 68 Q50 82 62 68' : 'M42 70 Q50 77 58 70'}
            stroke={INK}
            strokeWidth={3}
            strokeLinecap="round"
            fill="none"
          />
        </G>
      )}
      {mood === 'sleepy' ? (
        <SvgText x={78} y={22} fontSize={14} fontWeight="bold" fill="#94A3B8">
          Zz
        </SvgText>
      ) : null}
      {mood === 'proud' ? (
        <SvgText x={78} y={22} fontSize={16} fill="#FBBF24">
          ✦
        </SvgText>
      ) : null}
    </Svg>
  );
}
