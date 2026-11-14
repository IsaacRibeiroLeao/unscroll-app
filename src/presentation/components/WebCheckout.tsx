import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Linking, View } from 'react-native';
import { awaitPro } from '../../application/awaitPro';
import { errorMessage } from '../../application/errorMessages';
import type { WebPlan, WebPlanId } from '../../application/ports/IBackendApi';
import { strings } from '../../strings/pt-BR';
import { fill, formatBRL } from '../format';
import { Enter, Pop, PressableScale } from '../motion';
import { backend, errorTexts } from '../state/container';
import { Text, colors } from '../ui';
import { Button } from './Button';
import { CrownIcon } from './art';
import { CheckIcon } from './Icons';

/** Pix / card checkout (Mercado Pago) used when store billing is not configured. */
export function WebCheckout({ onActivated }: { onActivated: () => void }) {
  const t = strings.webCheckout;
  const [plans, setPlans] = useState<WebPlan[] | null>(null);
  const [selected, setSelected] = useState<WebPlanId>('annual');
  const [busy, setBusy] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const checking = useRef(false);

  useEffect(() => {
    let cancelled = false;
    backend
      .listWebPlans()
      .then((p) => !cancelled && setPlans(p))
      .catch(() => !cancelled && setMessage(t.loadFailed));
    return () => {
      cancelled = true;
    };
  }, [t.loadFailed]);

  const checkPaid = async () => {
    if (checking.current) return;
    checking.current = true;
    try {
      if (await awaitPro({ backend })) onActivated();
    } catch {
      // keep waiting; the user can tap "Já paguei" again
    } finally {
      checking.current = false;
    }
  };

  // After the browser, coming back to the app re-checks the plan.
  useEffect(() => {
    if (!waiting) return;
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void checkPaid();
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waiting]);

  const pay = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const url = await backend.createCheckout(selected);
      await Linking.openURL(url);
      setWaiting(true);
    } catch (error) {
      setMessage(
        error instanceof Error && 'code' in error
          ? errorMessage(error, errorTexts)
          : t.checkoutFailed,
      );
    } finally {
      setBusy(false);
    }
  };

  if (!plans) {
    return message ? (
      <Text accessibilityRole="alert" className="text-tinta/80">
        {message}
      </Text>
    ) : (
      <ActivityIndicator color={colors.musgo} />
    );
  }

  return (
    <View className="gap-3">
      {plans.map((plan, i) => {
        const on = plan.id === selected;
        return (
          <Enter key={plan.id} index={i}>
            <PressableScale
              accessibilityRole="radio"
              accessibilityState={{ selected: on, disabled: !plan.available }}
              disabled={!plan.available}
              onPress={() => setSelected(plan.id)}
              className={`min-h-16 flex-row items-center justify-between rounded-2xl border-2 px-4 py-2 ${on ? 'border-floresta bg-folha' : 'border-transparent bg-[#EDEAD9]'} ${plan.available ? '' : 'opacity-50'}`}
            >
              <View className="flex-1 pr-2">
                <Text className="font-display-bold text-lg text-tinta">{t.plans[plan.id]}</Text>
                <Text className="text-xs text-tinta/65">
                  {plan.available
                    ? plan.remaining !== null
                      ? `${t.planHint[plan.id]} · ${fill(t.founderLeft, { count: plan.remaining })}`
                      : t.planHint[plan.id]
                    : t.soldOut}
                </Text>
              </View>
              <View className="flex-row items-center gap-2">
                <Text className="font-display-bold text-lg text-tinta">
                  {formatBRL(plan.priceCents)}
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
      {waiting ? (
        <Text accessibilityLiveRegion="polite" className="text-center text-sm text-tinta/80">
          {t.waiting}
        </Text>
      ) : null}

      <Button
        label={busy ? t.opening : t.cta}
        variant="sun"
        icon={<CrownIcon size={22} />}
        onPress={() => void pay()}
        loading={busy}
        disabled={!plans.find((p) => p.id === selected)?.available}
      />
      {waiting ? <Button variant="ghost" label={t.iPaid} onPress={() => void checkPaid()} /> : null}
      <Text className="text-xs text-tinta/65">{t.terms}</Text>
    </View>
  );
}
