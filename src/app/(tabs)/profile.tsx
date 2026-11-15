import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Linking, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { toMascotSkin } from '../../domain/mascot';
import { Button } from '../../presentation/components/Button';
import { CrownIcon, LockIcon } from '../../presentation/components/art';
import { Card } from '../../presentation/components/Card';
import { usePrefs } from '../../presentation/theme';
import { ChevronRightIcon } from '../../presentation/components/Icons';
import { Mascot } from '../../presentation/components/Mascot';
import { fill } from '../../presentation/format';
import { Enter, Float, PressableScale } from '../../presentation/motion';
import { auth } from '../../presentation/state/container';
import { useProfile } from '../../presentation/state/queries';
import { Text } from '../../presentation/ui';
import { PRIVACY_URL, TERMS_URL } from '../../config/site';
import { strings } from '../../strings/pt-BR';

export default function ProfileScreen() {
  const theme = usePrefs((st) => st.theme);
  const language = usePrefs((st) => st.language);
  const setTheme = usePrefs((st) => st.setTheme);
  const setLanguage = usePrefs((st) => st.setLanguage);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const p = useProfile().data;
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => {
    void auth
      .currentEmail()
      .then(setEmail)
      .catch(() => {});
  }, []);

  const confirmSignOut = () =>
    Alert.alert(strings.auth.signOutTitle, strings.auth.signOutBody, [
      { text: strings.common.cancel, style: 'cancel' },
      {
        text: strings.auth.signOut,
        style: 'destructive',
        onPress: () => void auth.signOut().catch(() => {}),
      },
    ]);

  return (
    <ScrollView
      className="flex-1 bg-nevoa"
      contentContainerClassName="gap-4 px-4 pb-8"
      contentContainerStyle={{ paddingTop: insets.top + 12 }}
    >
      <Enter index={0}>
        <Text accessibilityRole="header" className="font-display text-3xl text-tinta">
          {strings.profile.title}
        </Text>
      </Enter>
      {p ? (
        <>
          <Enter index={1}>
            <Card className="items-center p-5">
              <Float amplitude={5}>
                <Mascot
                  skin={toMascotSkin(p.activeMascotSkin)}
                  mood={p.isPro ? 'royal' : 'happy'}
                  size={150}
                />
              </Float>
              <View className="mt-2 flex-row items-center gap-2">
                {p.isPro ? <CrownIcon size={24} /> : null}
                <Text className="font-display text-2xl text-tinta">
                  {strings.profile.plan}:{' '}
                  {p.isPro ? strings.profile.planPro : strings.profile.planFree}
                </Text>
              </View>
              <Text className="mt-1 text-sm text-tinta/65">
                {fill(strings.shop.freezeCount, { count: p.streakFreezeCount })}
              </Text>
            </Card>
          </Enter>
          {!p.isPro ? (
            <Enter index={2}>
              <Button
                label={strings.profile.upgrade}
                variant="forest"
                icon={<CrownIcon size={22} />}
                onPress={() => router.push('/paywall')}
              />
            </Enter>
          ) : null}
          <Enter index={3} className="flex-row items-start gap-3 rounded-3xl bg-sage p-4">
            <LockIcon />
            <View className="flex-1">
              <Text className="font-display-bold text-base text-tinta">
                {strings.profile.privacyTitle}
              </Text>
              <Text className="text-sm text-tinta/70">{strings.profile.privacyBody}</Text>
            </View>
          </Enter>
          <Enter index={4}>
            <Card className="gap-3 p-4">
              <Text className="font-display-bold text-base text-tinta">
                {strings.settings.appearanceTitle}
              </Text>
              <Segmented
                label={strings.settings.themeLabel}
                value={theme}
                onChange={setTheme}
                options={[
                  { value: 'system', label: strings.settings.themeSystem },
                  { value: 'light', label: strings.settings.themeLight },
                  { value: 'dark', label: strings.settings.themeDark },
                ]}
              />
              <Segmented
                label={strings.settings.languageLabel}
                value={language}
                onChange={setLanguage}
                options={[
                  { value: 'auto', label: strings.settings.languageAuto },
                  { value: 'pt-BR', label: 'Português' },
                  { value: 'en', label: 'English' },
                  { value: 'es', label: 'Español' },
                ]}
              />
            </Card>
          </Enter>
          <Enter index={5}>
            <Card className="gap-1 p-4">
              <Text className="font-display-bold text-base text-tinta">
                {strings.auth.accountTitle}
              </Text>
              {email ? (
                <Text className="text-sm text-tinta/70" selectable>
                  {strings.profile.emailLabel}: {email}
                </Text>
              ) : null}
              {Platform.OS === 'android' ? (
                <Row
                  label={strings.permissionsHelp.title}
                  onPress={() => router.push('/permissions-help')}
                />
              ) : null}
              <Button variant="secondary" label={strings.auth.signOut} onPress={confirmSignOut} />
              <Row
                label={strings.legal.privacy}
                onPress={() => void Linking.openURL(PRIVACY_URL)}
              />
              <Row label={strings.legal.terms} onPress={() => void Linking.openURL(TERMS_URL)} />
              <Row
                label={strings.deleteAccount.link}
                onPress={() => router.push('/delete-account')}
              />
            </Card>
          </Enter>
        </>
      ) : null}
    </ScrollView>
  );
}

function Row({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="min-h-12 flex-row items-center justify-between border-t border-fio"
    >
      <Text className="flex-1 font-body-semibold text-base text-tinta">{label}</Text>
      <ChevronRightIcon size={20} />
    </PressableScale>
  );
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <View className="gap-2">
      <Text className="text-sm text-tinta/70">{label}</Text>
      <View className="flex-row flex-wrap gap-2">
        {options.map((o) => {
          const on = o.value === value;
          return (
            <PressableScale
              key={o.value}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={o.label}
              onPress={() => onChange(o.value)}
              className={`min-h-11 justify-center rounded-full border-2 px-4 ${on ? 'border-floresta bg-floresta' : 'border-fio bg-folha'}`}
            >
              <Text className={`font-display-bold text-sm ${on ? 'text-white' : 'text-tinta'}`}>
                {o.label}
              </Text>
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}
