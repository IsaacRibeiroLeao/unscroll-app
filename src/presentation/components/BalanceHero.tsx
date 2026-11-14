import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Profile } from '../../application/ports/IBackendApi';
import { moodFor, toMascotSkin } from '../../domain/mascot';
import { levelFromXp } from '../../domain/progression';
import { formatBalance } from '../../domain/time';
import { strings } from '../../strings/pt-BR';
import { fill } from '../format';
import { Text } from '../ui';
import { FlameIcon, GemIcon, StarIcon } from './Icons';
import { Mascot } from './Mascot';

// The balance cap is a server rule (2 h); the ruler only visualizes it.
const CAP_SECONDS = 7200;
const TICKS = [0.25, 0.5, 0.75];

interface Props {
  profile: Profile;
  onShop: () => void;
  onPro: () => void;
}

/** The memorable element: the balance as huge numerals over a 0–2 h ruler. */
export function BalanceHero({ profile, onShop, onPro }: Props) {
  const insets = useSafeAreaInsets();
  const lvl = levelFromXp(profile.xp);
  const fillPct = Math.min(1, Math.max(0, profile.balanceSeconds / CAP_SECONDS));
  const time = formatBalance(profile.balanceSeconds);

  return (
    <View
      className="bg-musgo px-5 pb-7"
      style={{
        paddingTop: insets.top + 16,
        borderBottomLeftRadius: 44,
        borderBottomRightRadius: 12,
      }}
    >
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-1 gap-1.5">
          <Text className="font-display-bold text-base text-nevoa">
            {fill(strings.home.level, { level: lvl.level })}
          </Text>
          <View
            accessibilityRole="progressbar"
            accessibilityLabel={fill(strings.home.xpProgress, {
              current: lvl.xpIntoLevel,
              total: lvl.xpForNext,
            })}
            accessibilityValue={{ min: 0, max: lvl.xpForNext, now: lvl.xpIntoLevel }}
            className="h-1.5 w-28 overflow-hidden rounded-full bg-white/20"
          >
            <View
              className="h-1.5 rounded-full bg-nevoa"
              style={{ width: `${lvl.progress * 100}%` }}
            />
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${strings.home.shop}, ${fill(strings.home.gemsA11y, { gems: profile.gems })}`}
          onPress={onShop}
          className="min-h-11 flex-row items-center gap-2 rounded-full bg-white/15 px-4 active:opacity-70"
        >
          <GemIcon size={18} color="#EAEFE8" />
          <Text className="font-display-bold text-base text-nevoa">{profile.gems}</Text>
          <Text className="text-sm text-nevoa/80">{strings.home.shop}</Text>
        </Pressable>
        {profile.isPro ? (
          <View className="min-h-11 flex-row items-center gap-1 rounded-full bg-sol px-3">
            <StarIcon size={14} color="#16241C" />
            <Text className="font-display-bold text-sm text-tinta">{strings.home.pro}</Text>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={strings.home.pro}
            onPress={onPro}
            className="min-h-11 flex-row items-center gap-1 rounded-full bg-sol px-3 active:opacity-80"
          >
            <StarIcon size={14} color="#16241C" />
            <Text className="font-display-bold text-sm text-tinta">{strings.home.pro}</Text>
          </Pressable>
        )}
      </View>

      <View className="mt-6 flex-row items-end justify-between">
        <View
          accessible
          accessibilityLabel={`${strings.home.balanceLabel}: ${time}`}
          className="flex-1"
        >
          <Text
            className="font-display text-nevoa"
            style={{ fontSize: 76, lineHeight: 78, letterSpacing: -2 }}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {time}
          </Text>
          <Text className="mt-1 text-base text-nevoa/80">{strings.home.balanceLabel}</Text>
        </View>
        <Mascot
          skin={toMascotSkin(profile.activeMascotSkin)}
          mood={moodFor(profile.balanceSeconds, profile.streakDays)}
          size={92}
        />
      </View>

      <View className="mt-5">
        <View className="h-3 rounded-full bg-white/20">
          <View className="h-3 rounded-full bg-sol" style={{ width: `${fillPct * 100}%` }} />
          {TICKS.map((t) => (
            <View
              key={t}
              className="absolute top-0 h-3 w-0.5 bg-musgo"
              style={{ left: `${t * 100}%` }}
            />
          ))}
        </View>
        <View className="mt-1.5 flex-row justify-between">
          <Text className="text-xs text-nevoa/70">0</Text>
          <Text className="text-xs text-nevoa/70">1 h</Text>
          <Text className="text-xs text-nevoa/70">2 h</Text>
        </View>
      </View>

      <View
        accessible
        accessibilityLabel={fill(strings.home.streakA11y, { days: profile.streakDays })}
        className="mt-4 flex-row items-center gap-1.5"
      >
        <FlameIcon size={18} />
        <Text className="font-display-bold text-base text-nevoa">
          {fill(strings.home.streak, { days: profile.streakDays })}
        </Text>
      </View>
    </View>
  );
}
