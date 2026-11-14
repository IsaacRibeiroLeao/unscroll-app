import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Profile } from '../../application/ports/IBackendApi';
import { moodFor, toMascotSkin } from '../../domain/mascot';
import { levelFromXp } from '../../domain/progression';
import { formatBalance } from '../../domain/time';
import { strings } from '../../strings/pt-BR';
import { fill } from '../format';
import { Text } from '../ui';
import { CrownIcon, GradientView } from './art';
import { GemIcon } from './Icons';
import { Mascot } from './Mascot';
import { AnimatedFill, Float, PressableScale } from '../motion';

interface Props {
  profile: Profile;
  onShop: () => void;
  onPro: () => void;
}

/** Green hero: the balance as huge numerals, the bear beside it, XP bar below. */
export function BalanceHero({ profile, onShop, onPro }: Props) {
  const insets = useSafeAreaInsets();
  const lvl = levelFromXp(profile.xp);
  const time = formatBalance(profile.balanceSeconds);
  const skin = toMascotSkin(profile.activeMascotSkin);

  return (
    <GradientView
      id="hero"
      stops={['#1F6B43', '#0F3F29']}
      style={{ borderBottomLeftRadius: 36, borderBottomRightRadius: 36 }}
    >
      <View className="px-5 pb-6" style={{ paddingTop: insets.top + 12 }}>
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Mascot skin={skin} mood="happy" size={38} crop="head" />
            <Text className="font-display text-2xl text-nevoa">{strings.app.name}</Text>
          </View>
          <View className="flex-row items-center gap-2">
            {profile.isPro ? (
              <View className="min-h-9 flex-row items-center gap-1 rounded-full bg-sol px-3">
                <CrownIcon size={18} />
                <Text className="font-display-bold text-sm text-tinta">{strings.home.pro}</Text>
              </View>
            ) : (
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel={strings.home.pro}
                onPress={onPro}
                className="min-h-11 flex-row items-center gap-1 rounded-full bg-sol px-3"
              >
                <CrownIcon size={18} />
                <Text className="font-display-bold text-sm text-tinta">{strings.home.pro}</Text>
              </PressableScale>
            )}
            <View
              accessible
              accessibilityLabel={fill(strings.home.level, { level: lvl.level })}
              className="min-h-9 justify-center rounded-full border border-sol px-3"
            >
              <View className="flex-row items-center gap-1">
                <CrownIcon size={16} />
                <Text className="font-display-bold text-sm text-sol">
                  {fill(strings.home.level, { level: lvl.level })}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View className="-mb-2 mt-2 flex-row items-end justify-between">
          <View
            accessible
            accessibilityLabel={`${strings.home.balanceLabel}: ${time}`}
            className="flex-1 pb-2"
          >
            <Text
              className="font-display text-white"
              style={{ fontSize: 80, lineHeight: 84, letterSpacing: -2 }}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {time}
            </Text>
            <Text className="font-body-semibold text-base text-white/90">
              {strings.home.balanceLabel}
            </Text>
          </View>
          <Float amplitude={5} duration={1600}>
            <Mascot
              skin={skin}
              mood={moodFor(profile.balanceSeconds, profile.streakDays)}
              size={132}
            />
          </Float>
        </View>

        <View className="mt-1">
          <View
            accessibilityRole="progressbar"
            accessibilityLabel={fill(strings.home.xpProgress, {
              current: lvl.xpIntoLevel,
              total: lvl.xpForNext,
            })}
            accessibilityValue={{ min: 0, max: lvl.xpForNext, now: lvl.xpIntoLevel }}
            className="h-4 overflow-hidden rounded-full bg-black/25"
          >
            <AnimatedFill className="h-4 rounded-full bg-sol" progress={lvl.progress} />
          </View>
          <View className="mt-2 flex-row items-center justify-between">
            <Text className="font-display text-lg text-sol">
              {fill(strings.home.xpLabel, { current: lvl.xpIntoLevel, total: lvl.xpForNext })}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${strings.home.shop}, ${fill(strings.home.gemsA11y, { gems: profile.gems })}`}
              onPress={onShop}
              hitSlop={8}
              className="min-h-11 flex-row items-center gap-1.5 active:opacity-70"
            >
              <GemIcon size={22} color="#5CC8FF" />
              <Text className="font-display text-xl text-white">{profile.gems}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </GradientView>
  );
}
