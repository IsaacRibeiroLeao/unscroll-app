import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, Platform, ScrollView, Switch, View } from 'react-native';
import { errorMessage } from '../application/errorMessages';
import { AppIcon } from '../presentation/components/AppIcon';
import { Hills } from '../presentation/components/art';
import { Button } from '../presentation/components/Button';
import { Card } from '../presentation/components/Card';
import { PlusIcon } from '../presentation/components/Icons';
import { ScreenHeader } from '../presentation/components/ScreenHeader';
import { fill } from '../presentation/format';
import { Enter } from '../presentation/motion';
import { blocker, errorTexts } from '../presentation/state/container';
import { keys, useBlockedApps } from '../presentation/state/queries';
import { Text } from '../presentation/ui';
import { strings } from '../strings/pt-BR';

/** Apps that stay locked until the player earns screen time, with one switch per app (Android). */
export default function BlockedAppsScreen() {
  const qc = useQueryClient();
  const blocked = useBlockedApps();
  // Apps the player just switched off stay listed (so they can switch them back on) until the list reloads.
  const [off, setOff] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const apps = blocked.data?.apps ?? [];
  const count = blocked.data?.count ?? 0;
  const activeCount = apps.filter((a) => !off.has(a.id)).length;
  const isIos = Platform.OS === 'ios';

  const toggle = async (id: string, on: boolean) => {
    try {
      await blocker.setAppBlocked(id, on);
      setOff((prev) => {
        const next = new Set(prev);
        if (on) next.delete(id);
        else next.add(id);
        return next;
      });
      void qc.invalidateQueries({ queryKey: keys.blockedApps, refetchType: 'none' });
    } catch (e) {
      Alert.alert(errorMessage(e, errorTexts));
    }
  };

  const add = async () => {
    setBusy(true);
    try {
      await blocker.pickApps();
      setOff(new Set());
      await qc.invalidateQueries({ queryKey: keys.blockedApps });
    } catch {
      Alert.alert(strings.onboarding.pickError);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className="flex-1 bg-nevoa">
      <Hills height={130} />
      <ScreenHeader title={strings.blockedApps.title} />
      <ScrollView contentContainerClassName="gap-4 px-5 pb-10 pt-1">
        <Text className="text-base text-tinta/70">{strings.blockedApps.intro}</Text>

        {blocked.isError ? (
          <Text className="text-sm text-pimenta">{strings.blockedApps.loadError}</Text>
        ) : null}

        {apps.length > 0 ? (
          <Enter index={1}>
            <Card className="px-4">
              {apps.map((app, i) => {
                const on = !off.has(app.id);
                return (
                  <View
                    key={app.id}
                    className={`min-h-16 flex-row items-center gap-3 py-2.5 ${i > 0 ? 'border-t border-fio' : ''}`}
                  >
                    <AppIcon app={app} size={44} />
                    <Text className="flex-1 font-display-bold text-base text-tinta" numberOfLines={1}>
                      {app.label}
                    </Text>
                    <Switch
                      value={on}
                      onValueChange={(v) => void toggle(app.id, v)}
                      accessibilityLabel={fill(strings.blockedApps.toggleA11y, { app: app.label })}
                      trackColor={{ false: '#D7D3C2', true: '#2E9A5B' }}
                      thumbColor="#FFFFFF"
                    />
                  </View>
                );
              })}
            </Card>
          </Enter>
        ) : null}

        {blocked.isSuccess && apps.length === 0 && count > 0 ? (
          <Card className="gap-1 p-4">
            <Text className="font-display-bold text-base text-tinta">
              {fill(strings.blockedApps.iosCount, { count })}
            </Text>
            {isIos ? (
              <Text className="text-sm text-tinta/65">{strings.blockedApps.iosNote}</Text>
            ) : null}
          </Card>
        ) : null}

        {blocked.isSuccess && count === 0 ? (
          <Card className="p-4">
            <Text className="text-base text-tinta/75">{strings.blockedApps.empty}</Text>
          </Card>
        ) : null}

        {blocked.isSuccess && apps.length > 0 && activeCount === 0 ? (
          <Text accessibilityLiveRegion="polite" className="text-sm text-pimenta">
            {strings.blockedApps.lastWarning}
          </Text>
        ) : null}

        <Button
          label={strings.blockedApps.add}
          variant="forest"
          icon={<PlusIcon size={20} color="#FFFFFF" />}
          loading={busy}
          onPress={() => void add()}
        />
      </ScrollView>
    </View>
  );
}
