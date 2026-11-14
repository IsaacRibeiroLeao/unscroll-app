import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { levelFromXp, xpToReachLevel } from '../../domain/progression';
import { Card } from '../../presentation/components/Card';
import { FlameIcon, GemIcon, StarIcon } from '../../presentation/components/Icons';
import { fill } from '../../presentation/format';
import { AnimatedFill, Enter } from '../../presentation/motion';
import { useProfile, useTasks } from '../../presentation/state/queries';
import { Text } from '../../presentation/ui';
import { strings } from '../../strings/pt-BR';

function Stat({
  icon,
  label,
  value,
  index,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  index: number;
}) {
  return (
    <Enter index={index} className="min-w-[46%] flex-1">
      <Card accessible accessibilityLabel={`${label}: ${value}`} className="gap-1 p-4">
        {icon}
        <Text className="mt-1 font-display text-3xl text-tinta">{value}</Text>
        <Text className="text-sm text-tinta/65">{label}</Text>
      </Card>
    </Enter>
  );
}

const WEEK = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

/** Last 7 days ending today; a day is lit when it falls inside the current streak. */
function WeekStreak({ streakDays }: { streakDays: number }) {
  const today = new Date().getDay();
  return (
    <Card className="gap-3 p-4">
      <Text className="font-display-bold text-base text-tinta">{strings.stats.week}</Text>
      <View className="flex-row items-end justify-between">
        {WEEK.map((_, i) => {
          const ago = 6 - i;
          const on = ago < streakDays;
          return (
            <View key={ago} className="items-center gap-2">
              <View className={`w-7 rounded-full ${on ? 'h-14 bg-floresta' : 'h-6 bg-fio'}`} />
              <Text className="font-body-semibold text-xs text-tinta/65">
                {WEEK[(today - ago + 7) % 7]}
              </Text>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

/** Read-only numbers straight from the server profile; no invented metrics. */
export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const profile = useProfile();
  const tasks = useTasks();
  const p = profile.data;
  const lvl = p ? levelFromXp(p.xp) : null;
  const done = (tasks.data ?? []).filter((t) => t.status === 'completed').length;

  return (
    <ScrollView
      className="flex-1 bg-nevoa"
      contentContainerClassName="gap-4 px-4 pb-8"
      contentContainerStyle={{ paddingTop: insets.top + 12 }}
    >
      <Enter index={0}>
        <Text accessibilityRole="header" className="font-display text-3xl text-tinta">
          {strings.stats.title}
        </Text>
      </Enter>
      {p && lvl ? (
        <>
          <Enter index={1} className="gap-2 rounded-3xl bg-floresta p-5">
            <Text className="text-sm text-white/75">{strings.stats.level}</Text>
            <Text className="font-display text-white" style={{ fontSize: 56, lineHeight: 60 }}>
              {lvl.level}
            </Text>
            <View className="h-3 overflow-hidden rounded-full bg-black/25">
              <AnimatedFill className="h-3 rounded-full bg-sol" progress={lvl.progress} />
            </View>
            <Text className="text-sm text-white/80">
              {fill(strings.stats.nextLevel, {
                xp: xpToReachLevel(lvl.level + 1) - p.xp,
                level: lvl.level + 1,
              })}
            </Text>
          </Enter>
          <Enter index={2}>
            <WeekStreak streakDays={p.streakDays} />
          </Enter>
          <View className="flex-row flex-wrap gap-3">
            <Stat
              icon={<StarIcon size={26} />}
              index={2}
              label={strings.stats.totalXp}
              value={String(p.xp)}
            />
            <Stat
              icon={<FlameIcon size={26} color="#FF8A1F" />}
              index={3}
              label={strings.stats.streak}
              value={fill(strings.stats.streakValue, { days: p.streakDays })}
            />
            <Stat
              icon={<GemIcon size={26} color="#3FA8E8" />}
              index={4}
              label={strings.stats.gems}
              value={String(p.gems)}
            />
            <Stat icon={null} index={5} label={strings.stats.tasksDone} value={String(done)} />
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}
