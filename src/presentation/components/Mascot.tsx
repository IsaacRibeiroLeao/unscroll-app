import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import type { MascotMood, MascotSkin } from '../../domain/mascot';

export interface Palette {
  fur: [string, string];
  hood: [string, string];
  muzzle: string;
  earInner: string;
}

export const PALETTES: Record<MascotSkin, Palette> = {
  default: {
    fur: ['#E6AC66', '#BC7A3B'],
    hood: ['#2E7D4F', '#195234'],
    muzzle: '#F8E4C0',
    earInner: '#EEC596',
  },
  mascot_skin_fire: {
    fur: ['#EE9163', '#C45830'],
    hood: ['#E8552F', '#AE321A'],
    muzzle: '#FAE0C8',
    earInner: '#F3B496',
  },
  mascot_skin_zen: {
    fur: ['#DCCFAB', '#B4A47A'],
    hood: ['#5DB09C', '#34806E'],
    muzzle: '#F6EFD8',
    earInner: '#E8DDBB',
  },
};

const INK = '#2A1A12';

interface Props {
  skin: MascotSkin;
  mood: MascotMood;
  size?: number;
  /** 'head' crops to the face (shop thumbnails). */
  crop?: 'full' | 'head';
}

/**
 * Original bear mascot (SVG). Decorative: hidden from screen readers.
 * Poses: happy = thumbs up, proud = arms up + medal, sleepy, peek = head over a ledge, royal = crown.
 */
export function Mascot({ skin, mood, size = 120, crop = 'full' }: Props) {
  const p = PALETTES[skin];
  const k = skin;
  const fur = `url(#fur-${k})`;
  const hood = `url(#hood-${k})`;
  const peek = mood === 'peek';
  const dy = peek ? 22 : 0; // head sits lower when peeking
  const closedEyes = mood === 'sleepy' || mood === 'proud' || mood === 'royal';
  const crowned = mood === 'royal' || mood === 'phone';
  const thumbs = mood === 'happy' || mood === 'wink';
  const sad = mood === 'sad';

  return (
    <Svg
      width={size}
      height={size}
      viewBox={crop === 'head' ? '30 14 140 140' : '0 0 200 200'}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Defs>
        <LinearGradient id={`fur-${k}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={p.fur[0]} />
          <Stop offset="1" stopColor={p.fur[1]} />
        </LinearGradient>
        <LinearGradient id={`hood-${k}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={p.hood[0]} />
          <Stop offset="1" stopColor={p.hood[1]} />
        </LinearGradient>
        <LinearGradient id="gold-m" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFE07A" />
          <Stop offset="1" stopColor="#F0A500" />
        </LinearGradient>
      </Defs>

      {mood === 'royal' ? (
        <Path d="M30 200 C34 150 62 128 100 128 C138 128 166 150 170 200 Z" fill="#164A2E" />
      ) : null}

      {mood === 'phone' || mood === 'wink' ? (
        <G>
          <Path d="M138 150 C170 144 182 168 178 200 H140 Z" fill="#1B5E3A" />
          <Path d="M146 160 C162 158 170 172 168 190" stroke="#0F3F29" strokeWidth={3} fill="none" />
        </G>
      ) : null}

      {!peek ? (
        <G>
          <Path d="M46 200 C46 160 68 138 100 138 C132 138 154 160 154 200 Z" fill={hood} />
          <Ellipse cx={100} cy={140} rx={42} ry={13} fill={p.hood[1]} />
          <Path
            d="M92 150 L90 170 M108 150 L110 170"
            stroke="#F4EBD6"
            strokeWidth={2.6}
            strokeLinecap="round"
          />
          <Path
            d="M74 188 Q100 178 126 188"
            stroke="#000"
            strokeOpacity={0.15}
            strokeWidth={2.5}
            fill="none"
          />
        </G>
      ) : null}

      {thumbs ? (
        <G>
          <Ellipse cx={46} cy={172} rx={13} ry={26} fill={hood} rotation={12} origin="46,172" />
          <Ellipse cx={158} cy={152} rx={13} ry={25} fill={hood} rotation={-28} origin="158,152" />
          <Circle cx={172} cy={128} r={14} fill={fur} />
          <Ellipse cx={172} cy={111} rx={6} ry={11} fill={fur} />
          <Path
            d="M163 126 H181 M164 133 H180"
            stroke="#000"
            strokeOpacity={0.18}
            strokeWidth={2}
            strokeLinecap="round"
          />
        </G>
      ) : null}

      {mood === 'phone' ? (
        <G>
          <Ellipse cx={154} cy={176} rx={13} ry={24} fill={hood} rotation={-10} origin="154,176" />
          <Ellipse cx={52} cy={158} rx={13} ry={24} fill={hood} rotation={-38} origin="52,158" />
          <Path d="M20 132 L46 124 L58 176 L32 184 Z" fill="#26323A" />
          <Path d="M24 134 L43 128 L53 172 L34 178 Z" fill="#6FB5E6" opacity={0.55} />
          <Circle cx={50} cy={168} r={12} fill={fur} />
        </G>
      ) : null}

      {mood === 'sad' ? (
        <G>
          <Ellipse cx={44} cy={176} rx={13} ry={24} fill={hood} rotation={8} origin="44,176" />
          <Ellipse cx={156} cy={176} rx={13} ry={24} fill={hood} rotation={-8} origin="156,176" />
        </G>
      ) : null}

      {mood === 'proud' ? (
        <G>
          <Ellipse cx={44} cy={134} rx={13} ry={26} fill={hood} rotation={-30} origin="44,134" />
          <Ellipse cx={156} cy={134} rx={13} ry={26} fill={hood} rotation={30} origin="156,134" />
          <Circle cx={30} cy={100} r={14} fill={fur} />
          <Circle cx={170} cy={100} r={14} fill={fur} />
          <Path d="M88 140 L100 166 L112 140" fill="#C98A00" />
          <Circle cx={100} cy={170} r={13} fill="url(#gold-m)" />
          <Path
            d="m100 163 2.4 5 5.4.7-4 3.7 1 5.3-4.8-2.7-4.8 2.7 1-5.3-4-3.7 5.4-.7Z"
            fill="#C98A00"
          />
        </G>
      ) : null}

      {mood === 'sleepy' ? (
        <Ellipse cx={46} cy={174} rx={13} ry={26} fill={hood} rotation={10} origin="46,174" />
      ) : null}
      {mood === 'sleepy' ? (
        <Ellipse cx={154} cy={174} rx={13} ry={26} fill={hood} rotation={-10} origin="154,174" />
      ) : null}

      {mood === 'royal' ? (
        <G>
          <Circle cx={88} cy={168} r={12} fill={fur} />
          <Circle cx={112} cy={168} r={12} fill={fur} />
        </G>
      ) : null}

      {/* head */}
      <G translateY={dy} rotation={mood === 'sleepy' ? -5 : 0} origin="100,130">
        <Circle cx={56} cy={48} r={19} fill={fur} />
        <Circle cx={144} cy={48} r={19} fill={fur} />
        <Circle cx={56} cy={48} r={10.5} fill={p.earInner} />
        <Circle cx={144} cy={48} r={10.5} fill={p.earInner} />
        <Ellipse cx={100} cy={92} rx={57} ry={51} fill={fur} />
        <Ellipse cx={100} cy={64} rx={26} ry={9} fill="#FFFFFF" opacity={0.12} />
        <Ellipse cx={100} cy={108} rx={26} ry={20} fill={p.muzzle} />
        <Ellipse cx={100} cy={98} rx={8.5} ry={6} fill={INK} />
        <Ellipse cx={97.5} cy={96} rx={2.6} ry={1.6} fill="#FFFFFF" opacity={0.6} />
        <Circle cx={66} cy={102} r={8.5} fill="#F08A7E" opacity={0.42} />
        <Circle cx={134} cy={102} r={8.5} fill="#F08A7E" opacity={0.42} />

        {closedEyes ? (
          <G stroke={INK} strokeWidth={3.6} strokeLinecap="round" fill="none">
            {mood === 'sleepy' ? (
              <G>
                <Path d="M69 88 Q78 96 87 88" />
                <Path d="M113 88 Q122 96 131 88" />
              </G>
            ) : (
              <G>
                <Path d="M69 90 Q78 80 87 90" />
                <Path d="M113 90 Q122 80 131 90" />
              </G>
            )}
          </G>
        ) : (
          <G>
            {mood === 'wink' ? (
              <Path
                d="M69 88 Q78 80 87 88"
                stroke={INK}
                strokeWidth={3.6}
                strokeLinecap="round"
                fill="none"
              />
            ) : (
              <G>
                <Ellipse cx={78} cy={86} rx={7.5} ry={9.5} fill={INK} />
                <Circle cx={80.5} cy={82} r={2.8} fill="#FFFFFF" />
                <Circle cx={75.5} cy={90} r={1.4} fill="#FFFFFF" />
              </G>
            )}
            <Ellipse cx={122} cy={86} rx={7.5} ry={9.5} fill={INK} />
            <Circle cx={124.5} cy={82} r={2.8} fill="#FFFFFF" />
            <Circle cx={119.5} cy={90} r={1.4} fill="#FFFFFF" />
            {sad ? (
              <G stroke={INK} strokeWidth={3.2} strokeLinecap="round" fill="none">
                <Path d="M66 70 L88 76" />
                <Path d="M134 70 L112 76" />
              </G>
            ) : null}
          </G>
        )}

        {mood === 'sleepy' ? (
          <Path
            d="M93 114 Q100 119 107 114"
            stroke={INK}
            strokeWidth={3.2}
            strokeLinecap="round"
            fill="none"
          />
        ) : sad ? (
          <G>
            <Path
              d="M89 120 Q100 108 111 120"
              stroke={INK}
              strokeWidth={3.2}
              strokeLinecap="round"
              fill="none"
            />
            <Path d="M100 104 V110" stroke={INK} strokeWidth={2.8} strokeLinecap="round" />
            <Path d="M70 100 Q66 112 70 118 Q76 112 70 100 Z" fill="#7EC8F0" />
          </G>
        ) : mood === 'royal' ? (
          <Path
            d="M90 112 Q100 122 110 112"
            stroke={INK}
            strokeWidth={3.2}
            strokeLinecap="round"
            fill="none"
          />
        ) : (
          <G>
            <Path d="M100 104 V110" stroke={INK} strokeWidth={2.8} strokeLinecap="round" />
            <Path d="M86 111 Q100 134 114 111 Z" fill="#8C3A3A" />
            <Ellipse cx={100} cy={124} rx={8} ry={4.6} fill="#E96B73" />
          </G>
        )}

        {crowned ? (
          <G>
            <Path d="M70 50 L78 20 L91 38 L100 12 L109 38 L122 20 L130 50 Z" fill="url(#gold-m)" />
            <Circle cx={100} cy={40} r={4.5} fill="#E8503A" />
            <Circle cx={80} cy={42} r={3.2} fill="#3F8FE0" />
            <Circle cx={120} cy={42} r={3.2} fill="#3F8FE0" />
          </G>
        ) : null}
      </G>

      {peek ? (
        <G>
          <Circle cx={60} cy={184} r={18} fill={fur} />
          <Circle cx={140} cy={184} r={18} fill={fur} />
          <Path
            d="M52 176 V184 M60 174 V184 M68 176 V184 M132 176 V184 M140 174 V184 M148 176 V184"
            stroke="#000"
            strokeOpacity={0.2}
            strokeWidth={2.4}
            strokeLinecap="round"
          />
        </G>
      ) : null}

      {mood === 'sleepy' ? (
        <G fill="#8FB3A0">
          <SvgText x={150} y={44} fontSize={24} fontWeight="bold">
            Z
          </SvgText>
          <SvgText x={170} y={24} fontSize={16} fontWeight="bold">
            z
          </SvgText>
        </G>
      ) : null}
    </Svg>
  );
}
