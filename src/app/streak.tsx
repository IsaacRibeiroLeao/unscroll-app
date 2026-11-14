import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { MAX_STREAK_FREEZES } from '../domain/progression';
import { GradientView, Hills, ShieldArt, Sparkles } from '../presentation/components/art';
import { Button } from '../presentation/components/Button';
import { Card } from '../presentation/components/Card';
import { FlameIcon } from '../presentation/components/Icons';
import { Mascot } from '../presentation/components/Mascot';
import { ScreenHeader } from '../presentation/components/ScreenHeader';
import { fill } from '../presentation/format';
import { Enter, Float } from '../presentation/motion';
import { useProfile } from '../presentation/state/queries';
import { Text } from '../presentation/ui';
import { strings } from '../strings/pt-BR';
import { toMascotSkin } from '../domain/mascot';

/** Streak details: the current streak and how many protections can save it. */
export default function StreakScreen() {
  const router = useRouter();
  const profile = useProfile();
  const [details, setDetails] = useState(false);
  const p = profile.data;
  const protectedNow = (p?.streakFreezeCount ?? 0) > 0;
  const canBuy = (p?.streakFreezeCount ?? 0) < MAX_STREAK_FREEZES;
  const t = strings.streak;

  return (
    <View className="flex-1 bg-nevoa">
      <Hills height={170} />
      <ScreenHeader title={t.title} />
      <ScrollView contentContainerClassName="gap-4 px-5 pb-12 pt-1">
        <Enter index={1}>
          <GradientView id="streak-card" stops={['#E3F1D2', '#C9E4B4']} style={{ borderRadius: 28 }}>
            <Sparkles color="#FFC72C" />
            <View className="items-center gap-2 px-6 py-7">
              <Float amplitude={4}>
                <ShieldArt size={104} />
              </Float>
              <Text
                accessibilityRole="header"
                className="mt-1 text-center font-display text-[28px] text-tinta"
              >
                {protectedNow ? t.protectedTitle : t.unprotectedTitle}
              </Text>
              <Text className="mb-1 text-center text-base text-tinta/75">
                {protectedNow ? t.protectedBody : t.unprotectedBody}
              </Text>
              <View className="w-full pt-1">
                <Button
                  label={details ? strings.home.seeLess : t.details}
                  variant="primary"
                  onPress={() => setDetails((v) => !v)}
                />
              </View>
            </View>
          </GradientView>
        </Enter>

        {details && p ? (
          <Enter index={0}>
            <Card className="gap-3 p-4">
              <View className="flex-row items-center gap-3">
                <FlameIcon size={34} color="#FF8A1F" />
                <View className="flex-1">
                  <Text className="text-sm text-tinta/65">{t.current}</Text>
                  <Text className="font-display text-xl text-tinta">
                    {fill(t.days, { days: p.streakDays })}
                  </Text>
                </View>
              </View>
              <Text className="font-display-bold text-base text-tinta">
                {fill(t.freezes, { count: p.streakFreezeCount, max: MAX_STREAK_FREEZES })}
              </Text>
              <Text className="font-display-bold text-base text-tinta">{t.howTitle}</Text>
              <Text className="text-sm text-tinta/75">{fill(t.how, { max: MAX_STREAK_FREEZES })}</Text>
            </Card>
          </Enter>
        ) : null}

        {canBuy ? (
          <Button
            label={t.goShop}
            variant="sun"
            onPress={() => router.replace('/shop')}
          />
        ) : null}

        <View className="items-center pt-2">
          <Float amplitude={5}>
            <Mascot skin={toMascotSkin(p?.activeMascotSkin ?? 'default')} mood="royal" size={150} />
          </Float>
        </View>
      </ScrollView>
    </View>
  );
}
