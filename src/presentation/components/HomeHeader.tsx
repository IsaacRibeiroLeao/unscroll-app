import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Profile } from '../../application/ports/IBackendApi';
import { toMascotSkin } from '../../domain/mascot';
import { levelFromXp } from '../../domain/progression';
import { BALANCE_CAP_SECONDS, dayPart, formatBalanceLong } from '../../domain/time';
import { strings } from '../../strings/pt-BR';
import { fill } from '../format';
import { AnimatedFill, Enter } from '../motion';
import { Text } from '../ui';
import { CrownIcon, GradientView } from './art';
import { Button } from './Button';
import { Card } from './Card';
import { PhoneIcon } from './Icons';
import { Mascot } from './Mascot';

/** First name only, so "Isaac Ribeiro" greets as "Isaac". */
function firstName(name: string | null): string | null {
  const first = name?.trim().split(/\s+/)[0];
  return first ? first : null;
}

export function BrandBar() {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-row items-center gap-2 px-5" style={{ paddingTop: insets.top + 14 }}>
      <CrownIcon size={34} />
      <Text className="font-display text-[26px] text-tinta">{strings.app.name}</Text>
    </View>
  );
}

export function Greeting({ name, hour }: { name: string | null; hour: number }) {
  const who = firstName(name);
  const salute = strings.home.greeting[dayPart(hour)];
  return (
    <View className="px-5 pt-5">
      <Text accessibilityRole="header" className="font-display text-[26px] text-tinta">
        {who ? `${salute}, ${who}!` : `${salute}!`}
      </Text>
      <Text className="mt-1 text-base text-tinta/60">{strings.home.tagline}</Text>
    </View>
  );
}

const RING = 84;
const STROKE = 9;

function TimeRing({ progress }: { progress: number }) {
  const r = (RING - STROKE) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.min(1, Math.max(0, progress));
  return (
    <View style={{ width: RING, height: RING }} className="items-center justify-center">
      <Svg width={RING} height={RING} accessibilityElementsHidden>
        <Circle cx={RING / 2} cy={RING / 2} r={r} stroke="rgba(255,255,255,0.16)" strokeWidth={STROKE} fill="none" />
        <Circle
          cx={RING / 2}
          cy={RING / 2}
          r={r}
          stroke="#7ED957"
          strokeWidth={STROKE}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${c * p} ${c}`}
          rotation={-90}
          origin={`${RING / 2},${RING / 2}`}
        />
      </Svg>
      <View className="absolute">
        <PhoneIcon size={30} color="#FFFFFF" />
      </View>
    </View>
  );
}

export function TimeCard({ profile, onApps }: { profile: Profile; onApps: () => void }) {
  const time = formatBalanceLong(profile.balanceSeconds);
  return (
    <View className="px-5 pt-5">
      <GradientView
        id="timecard"
        stops={['#1F6B43', '#0F3F29']}
        style={{ borderRadius: 26 }}
      >
        <View className="p-5">
          <Text className="font-body-semibold text-base text-white/90">{strings.home.timeCardTitle}</Text>
          <View className="mt-1 flex-row items-center justify-between">
            <View
              accessible
              accessibilityLabel={`${strings.home.timeCardTitle}: ${time}. ${strings.home.timeAvailable}`}
              className="flex-1"
            >
              <Text
                className="font-display text-white"
                style={{ fontSize: 54, lineHeight: 60, letterSpacing: -1 }}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {time}
              </Text>
              <Text className="font-body-semibold text-sm text-white/80">{strings.home.timeAvailable}</Text>
            </View>
            <TimeRing progress={profile.balanceSeconds / BALANCE_CAP_SECONDS} />
          </View>
          <View className="mt-4">
            <Button label={strings.home.viewApps} variant="sun" onPress={onApps} />
          </View>
        </View>
      </GradientView>
    </View>
  );
}

export function LevelRow({ profile }: { profile: Profile }) {
  const lvl = levelFromXp(profile.xp);
  return (
    <View className="px-5 pt-4">
      <Card className="flex-row items-center gap-3 p-3">
        <Mascot skin={toMascotSkin(profile.activeMascotSkin)} mood="happy" size={44} crop="head" />
        <View
          className="flex-1"
          accessible
          accessibilityLabel={`${fill(strings.home.levelRow, { level: lvl.level })}, ${fill(strings.home.xpProgress, { current: lvl.xpIntoLevel, total: lvl.xpForNext })}`}
        >
          <View className="flex-row items-center justify-between">
            <Text className="font-display-bold text-base text-tinta">
              {fill(strings.home.levelRow, { level: lvl.level })}
            </Text>
            <Text className="font-body-semibold text-sm text-tinta/70">
              {lvl.xpIntoLevel} / {lvl.xpForNext} XP
            </Text>
          </View>
          <View
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: lvl.xpForNext, now: lvl.xpIntoLevel }}
            className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-fio"
          >
            <AnimatedFill className="h-2.5 rounded-full bg-floresta" progress={lvl.progress} />
          </View>
        </View>
      </Card>
    </View>
  );
}

export { Enter };
