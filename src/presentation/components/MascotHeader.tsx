import { Text, View } from 'react-native';
import { toMascotSkin, moodFor } from '../../domain/mascot';
import { levelFromXp } from '../../domain/progression';
import { strings } from '../../strings/pt-BR';
import { fill } from '../format';
import type { Profile } from '../../application/ports/IBackendApi';
import { Mascot } from './Mascot';

/** Mascot + level/XP bar + streak + gems. Shows server values only. */
export function MascotHeader({ profile }: { profile: Profile }) {
  const lvl = levelFromXp(profile.xp);
  return (
    <View className="flex-row items-center gap-4 rounded-3xl bg-white p-4 shadow-sm">
      <Mascot
        skin={toMascotSkin(profile.activeMascotSkin)}
        mood={moodFor(profile.balanceSeconds, profile.streakDays)}
        size={84}
      />
      <View className="flex-1 gap-2">
        <View className="flex-row items-center justify-between">
          <Text className="text-lg font-bold text-neutral-900">
            {fill(strings.home.level, { level: lvl.level })}
          </Text>
          {profile.isPro ? (
            <Text className="rounded-full bg-amber-300 px-2 py-0.5 text-xs font-bold text-neutral-900">
              {strings.home.pro}
            </Text>
          ) : null}
        </View>
        <View
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: lvl.xpForNext, now: lvl.xpIntoLevel }}
          className="h-3 overflow-hidden rounded-full bg-neutral-200"
        >
          <View className="h-3 rounded-full bg-brand" style={{ width: `${lvl.progress * 100}%` }} />
        </View>
        <Text className="text-xs text-neutral-600">
          {fill(strings.home.xpProgress, { current: lvl.xpIntoLevel, total: lvl.xpForNext })}
        </Text>
        <View className="flex-row gap-4">
          <Text
            accessibilityLabel={fill(strings.home.streakA11y, { days: profile.streakDays })}
            className="text-sm font-semibold text-neutral-800"
          >
            🔥 {fill(strings.home.streak, { days: profile.streakDays })}
          </Text>
          <Text
            accessibilityLabel={fill(strings.home.gemsA11y, { gems: profile.gems })}
            className="text-sm font-semibold text-neutral-800"
          >
            💎 {profile.gems}
          </Text>
        </View>
      </View>
    </View>
  );
}
