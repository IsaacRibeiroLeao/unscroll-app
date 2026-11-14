import Svg, { Circle, Ellipse, G, Path, Text as SvgText } from 'react-native-svg';
import type { MascotMood, MascotSkin } from '../../domain/mascot';

const BODY: Record<MascotSkin, { body: string; belly: string; ear: string }> = {
  default: { body: '#FFBE1F', belly: '#FFE08A', ear: '#E8A200' },
  mascot_skin_fire: { body: '#E8503A', belly: '#F9A593', ear: '#B93A27' },
  mascot_skin_zen: { body: '#5FB38A', belly: '#BFE6D2', ear: '#3F8E68' },
};
const INK = '#16241C';

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
      <Circle cx={24} cy={30} r={13} fill={c.ear} />
      <Circle cx={76} cy={30} r={13} fill={c.ear} />
      <Circle cx={24} cy={30} r={7} fill={c.body} />
      <Circle cx={76} cy={30} r={7} fill={c.body} />
      <Ellipse cx={50} cy={58} rx={40} ry={37} fill={c.body} />
      <Ellipse cx={50} cy={70} rx={21} ry={16} fill={c.belly} />
      <Ellipse cx={50} cy={64} rx={5.5} ry={4} fill={INK} />
      {mood === 'sleepy' ? (
        <G stroke={INK} strokeWidth={3.2} strokeLinecap="round" fill="none">
          <Path d="M27 50 Q34 56 41 50" />
          <Path d="M59 50 Q66 56 73 50" />
          <Path d="M45 76 Q50 79 55 76" />
        </G>
      ) : (
        <G>
          <Circle cx={34} cy={50} r={5} fill={INK} />
          <Circle cx={66} cy={50} r={5} fill={INK} />
          <Circle cx={35.6} cy={48.4} r={1.6} fill="#FFFFFF" />
          <Circle cx={67.6} cy={48.4} r={1.6} fill="#FFFFFF" />
          <Path
            d={mood === 'proud' ? 'M40 74 Q50 86 60 74' : 'M43 75 Q50 81 57 75'}
            stroke={INK}
            strokeWidth={3.2}
            strokeLinecap="round"
            fill="none"
          />
          {mood === 'proud' ? <Ellipse cx={50} cy={80} rx={6} ry={3.5} fill="#E8503A" /> : null}
        </G>
      )}
      {mood === 'sleepy' ? (
        <SvgText x={84} y={14} fontSize={13} fontWeight="bold" fill="#8A9A8F">
          z
        </SvgText>
      ) : null}
      {mood === 'sleepy' ? (
        <SvgText x={91} y={7} fontSize={9} fontWeight="bold" fill="#8A9A8F">
          z
        </SvgText>
      ) : null}
      {mood === 'proud' ? (
        <SvgText x={82} y={16} fontSize={15} fill="#255A41">
          ✦
        </SvgText>
      ) : null}
    </Svg>
  );
}
