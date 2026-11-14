import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { Text, colors } from '../presentation/ui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { awaitPro } from '../application/awaitPro';
import type { PaywallPlan } from '../application/ports/IPurchasesService';
import { Button } from '../presentation/components/Button';
import { backend, purchases } from '../presentation/state/container';
import { keys, useProfile } from '../presentation/state/queries';
import { strings } from '../strings/pt-BR';

export default function PaywallScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const profile = useProfile();
  const [plans, setPlans] = useState<PaywallPlan[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    purchases
      .getPlans()
      .then((p) => {
        if (cancelled) return;
        setPlans(p);
        setSelected((p.find((x) => x.period === 'annual') ?? p[0])?.id ?? null);
      })
      .catch(() => !cancelled && setUnavailable(true));
    return () => {
      cancelled = true;
    };
  }, []);

  const finishActivation = async () => {
    setMessage(strings.paywall.activating);
    const pro = await awaitPro({ backend });
    await qc.invalidateQueries({ queryKey: keys.profile });
    if (pro) router.back();
    else setMessage(strings.paywall.delayed);
  };

  const buy = async () => {
    if (!selected) return;
    setBusy(true);
    setMessage(null);
    try {
      if ((await purchases.purchase(selected)) === 'purchased') await finishActivation();
    } catch {
      setMessage(strings.paywall.failed);
    } finally {
      setBusy(false);
    }
  };

  const restore = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await purchases.restore();
      await finishActivation();
    } catch {
      setMessage(strings.paywall.failed);
    } finally {
      setBusy(false);
    }
  };

  if (profile.data?.isPro) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center gap-4 bg-nevoa px-8">
        <Text className="text-xl font-display-bold text-tinta">{strings.paywall.alreadyPro}</Text>
        <Button label={strings.common.close} onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-nevoa">
      <View className="gap-4 p-4">
        <Text accessibilityRole="header" className="text-3xl font-display text-tinta">
          {strings.paywall.title}
        </Text>
        <Text className="text-base text-tinta/80">{strings.paywall.subtitle}</Text>
        <View className="gap-2">
          {strings.paywall.benefits.map((b) => (
            <Text key={b} className="text-base text-tinta">
              ✓ {b}
            </Text>
          ))}
        </View>

        {unavailable ? (
          <Text accessibilityRole="alert" className="text-tinta/80">
            {strings.paywall.unavailable}
          </Text>
        ) : null}
        {!plans && !unavailable ? <ActivityIndicator color={colors.musgo} /> : null}

        {plans?.map((plan) => {
          const on = plan.id === selected;
          return (
            <Pressable
              key={plan.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              onPress={() => setSelected(plan.id)}
              className={`min-h-14 flex-row items-center justify-between rounded-2xl border-2 bg-folha px-4 ${on ? 'border-tinta' : 'border-transparent'}`}
            >
              <Text className="text-base font-body-semibold text-tinta">
                {plan.period === 'annual' ? strings.paywall.annual : strings.paywall.monthly}
              </Text>
              <Text className="text-base text-tinta">{plan.priceLabel}</Text>
            </Pressable>
          );
        })}

        {message ? (
          <Text accessibilityRole="alert" className="text-center text-sm text-tinta/80">
            {message}
          </Text>
        ) : null}

        <Button
          label={strings.paywall.cta}
          variant="sun"
          onPress={() => void buy()}
          disabled={!selected}
          loading={busy}
        />
        <Button
          label={strings.paywall.restore}
          variant="ghost"
          onPress={() => void restore()}
          disabled={busy}
        />
        <Text className="text-center text-xs text-tinta/55">{strings.paywall.terms}</Text>
        <Button label={strings.common.close} variant="ghost" onPress={() => router.back()} />
      </View>
    </SafeAreaView>
  );
}
