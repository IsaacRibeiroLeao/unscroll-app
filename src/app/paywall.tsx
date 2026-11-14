import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { Text, colors } from '../presentation/ui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { awaitPro } from '../application/awaitPro';
import type { PaywallPlan } from '../application/ports/IPurchasesService';
import { Button } from '../presentation/components/Button';
import { CrownIcon, LockIcon, Hills } from '../presentation/components/art';
import { CheckIcon } from '../presentation/components/Icons';
import { Mascot } from '../presentation/components/Mascot';
import { WebCheckout } from '../presentation/components/WebCheckout';
import { toMascotSkin } from '../domain/mascot';
import { backend, purchases } from '../presentation/state/container';
import { keys, useProfile } from '../presentation/state/queries';
import { Enter, Float, Pop, PressableScale } from '../presentation/motion';
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
      <Hills height={190} />
      <ScrollView contentContainerClassName="gap-4 px-5 pb-6 pt-3">
        <Enter index={0} className="flex-row items-center gap-2">
          <Float amplitude={3} duration={1300}>
            <CrownIcon size={44} />
          </Float>
          <Text accessibilityRole="header" className="font-display text-4xl text-tinta">
            {strings.paywall.title}
          </Text>
        </Enter>
        <Enter index={1}>
          <Text className="text-base text-tinta/80">{strings.paywall.subtitle}</Text>
        </Enter>
        <View className="gap-3">
          {(unavailable ? strings.paywall.webBenefits : strings.paywall.benefits).map((b, i) => (
            <Enter key={b} index={2 + i} className="flex-row items-center gap-3">
              <Pop delay={(2 + i) * 70 + 150}>
                <View className="h-7 w-7 items-center justify-center rounded-full bg-floresta">
                  <CheckIcon size={16} color="#FFFFFF" />
                </View>
              </Pop>
              <Text className="flex-1 text-base text-tinta">{b}</Text>
            </Enter>
          ))}
        </View>

        {unavailable ? (
          <WebCheckout
            onActivated={() => {
              void qc.invalidateQueries({ queryKey: keys.profile });
              router.back();
            }}
          />
        ) : (
          <>
            {!plans && !unavailable ? <ActivityIndicator color={colors.musgo} /> : null}

            {plans?.map((plan, pi) => {
              const on = plan.id === selected;
              const annual = plan.period === 'annual';
              return (
                <Enter key={plan.id} index={6 + pi}>
                  <PressableScale
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    onPress={() => setSelected(plan.id)}
                    className={`min-h-16 flex-row items-center justify-between rounded-2xl border-2 px-4 ${on ? 'border-floresta bg-folha' : 'border-transparent bg-[#EDEAD9]'}`}
                  >
                    <View className="flex-row items-center gap-2">
                      <Text className="font-display-bold text-lg text-tinta">
                        {annual ? strings.paywall.annual : strings.paywall.monthly}
                      </Text>
                      {annual ? (
                        <View className="rounded-full bg-floresta px-2.5 py-1">
                          <Text className="font-display-bold text-xs text-white">
                            {strings.paywall.bestOffer}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <View className="flex-row items-center gap-2">
                      <Text className="font-display-bold text-lg text-tinta">
                        {plan.priceLabel}
                      </Text>
                      {on ? (
                        <Pop>
                          <View className="h-6 w-6 items-center justify-center rounded-full bg-floresta">
                            <CheckIcon size={14} color="#FFFFFF" />
                          </View>
                        </Pop>
                      ) : null}
                    </View>
                  </PressableScale>
                </Enter>
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
              icon={<CrownIcon size={22} />}
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
            <View className="flex-row items-center gap-3 rounded-2xl bg-[#E6EDE0] p-3">
              <LockIcon />
              <Text className="flex-1 text-xs text-tinta/70">{strings.paywall.terms}</Text>
            </View>
          </>
        )}
        <Button label={strings.common.close} variant="ghost" onPress={() => router.back()} />
        <View className="items-center">
          <Float amplitude={7}>
            <Mascot
              skin={toMascotSkin(profile.data?.activeMascotSkin ?? 'default')}
              mood="royal"
              size={230}
            />
          </Float>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
