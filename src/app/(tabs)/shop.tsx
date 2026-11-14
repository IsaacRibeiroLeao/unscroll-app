import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { errorMessage } from '../../application/errorMessages';
import type { ShopItem } from '../../application/ports/IBackendApi';
import { purchaseShopItem } from '../../application/purchaseShopItem';
import { toMascotSkin } from '../../domain/mascot';
import { Button } from '../../presentation/components/Button';
import { ClockArt, CrownIcon, GradientView, ShieldArt } from '../../presentation/components/art';
import { GemIcon } from '../../presentation/components/Icons';
import { Mascot } from '../../presentation/components/Mascot';
import { fill } from '../../presentation/format';
import { Enter, Float, PressableScale } from '../../presentation/motion';
import { backend, blocker, errorTexts } from '../../presentation/state/container';
import { keys, useProfile, useShop } from '../../presentation/state/queries';
import { Text } from '../../presentation/ui';
import { strings } from '../../strings/pt-BR';

type Copy = { name: string; description: string };
const copyFor = (sku: string): Copy =>
  (strings.shop.items as Record<string, Copy | undefined>)[sku] ?? { name: sku, description: '' };

function PricePill({ gems, enough }: { gems: number; enough: boolean }) {
  return (
    <View
      accessible
      accessibilityLabel={fill(strings.shop.price, { price: gems })}
      className={`min-h-9 flex-row items-center gap-1 rounded-full bg-[#FBEFC4] px-3 ${enough ? '' : 'opacity-60'}`}
    >
      <GemIcon size={16} color="#3FA46A" />
      <Text className="font-display-bold text-base text-tinta">{gems}</Text>
    </View>
  );
}

export default function ShopScreen() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const profile = useProfile();
  const shop = useShop();
  const [busySku, setBusySku] = useState<string | null>(null);

  const refresh = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: keys.profile }),
      qc.invalidateQueries({ queryKey: keys.shop }),
    ]);

  const buy = async (item: ShopItem) => {
    if (!profile.data) return;
    setBusySku(item.sku);
    try {
      await purchaseShopItem({
        backend,
        blocker,
        sku: item.sku,
        previousBalanceSeconds: profile.data.balanceSeconds,
      });
      await refresh();
      Alert.alert(strings.shop.purchased);
    } catch (e) {
      Alert.alert(errorMessage(e, errorTexts));
    } finally {
      setBusySku(null);
    }
  };

  const equip = async (skin: string) => {
    setBusySku(skin);
    try {
      await backend.setActiveSkin(skin);
      await refresh();
    } catch (e) {
      Alert.alert(errorMessage(e, errorTexts));
    } finally {
      setBusySku(null);
    }
  };

  const owned = new Set(shop.data?.owned ?? []);
  const active = profile.data?.activeMascotSkin ?? 'default';
  const gems = profile.data?.gems ?? 0;
  const freeze = shop.data?.items.find((i) => i.sku === 'streak_freeze');
  const others = (shop.data?.items ?? []).filter((i) => i.sku !== 'streak_freeze');

  return (
    <ScrollView
      className="flex-1 bg-nevoa"
      contentContainerClassName="gap-4 px-4 pb-8"
      contentContainerStyle={{ paddingTop: insets.top + 12 }}
    >
      <Enter index={0} className="flex-row items-center justify-between">
        <Text accessibilityRole="header" className="font-display text-3xl text-tinta">
          {strings.shop.title}
        </Text>
        <View
          accessible
          accessibilityLabel={fill(strings.home.gemsA11y, { gems })}
          className="min-h-10 flex-row items-center gap-1.5 rounded-full bg-folha px-4"
        >
          <GemIcon size={20} color="#3FA8E8" />
          <Text className="font-display text-xl text-tinta">{gems}</Text>
        </View>
      </Enter>

      {shop.isError ? (
        <View className="gap-2 rounded-3xl bg-folha p-4">
          <Text className="text-tinta/80">{errorMessage(shop.error, errorTexts)}</Text>
          <Button label={strings.common.retry} onPress={() => void shop.refetch()} />
        </View>
      ) : null}

      {freeze ? (
        <Enter index={1}>
          <GradientView id="shopBanner" stops={['#1F6B43', '#0F3F29']} style={{ borderRadius: 28 }}>
            <View className="flex-row items-center gap-3 p-5">
              <View className="flex-1 gap-1">
                <View className="flex-row items-center gap-1">
                  <CrownIcon size={20} />
                  <Text className="font-display-bold text-sm text-sol">{strings.shop.title}</Text>
                </View>
                <Text className="font-display text-2xl leading-7 text-white">
                  {strings.shop.bannerTitle}
                </Text>
                <Text className="text-sm text-white/80">{strings.shop.bannerBody}</Text>
                <Text className="font-body-semibold text-xs text-white/70">
                  {fill(strings.shop.freezeCount, { count: profile.data?.streakFreezeCount ?? 0 })}
                </Text>
              </View>
              <Float amplitude={5} duration={1500}>
                <ShieldArt size={112} />
              </Float>
            </View>
            <View className="px-5 pb-5">
              <Button
                label={fill(strings.shop.buyFor, { price: freeze.priceGems })}
                variant="sun"
                loading={busySku === freeze.sku}
                // UI hint only: the server enforces gems, limits and ownership.
                disabled={gems < freeze.priceGems}
                onPress={() => void buy(freeze)}
              />
            </View>
          </GradientView>
        </Enter>
      ) : null}

      <Enter index={2}>
        <Text accessibilityRole="header" className="mt-2 font-display text-xl text-tinta">
          {strings.shop.itemsTitle}
        </Text>
      </Enter>

      <View className="gap-3">
        <ItemCard
          index={3}
          art={<Mascot skin="default" mood="happy" size={56} crop="head" />}
          name={strings.shop.defaultSkin}
          description=""
          right={
            <Button
              label={active === 'default' ? strings.shop.equipped : strings.shop.equip}
              variant="secondary"
              disabled={active === 'default'}
              loading={busySku === 'default'}
              onPress={() => void equip('default')}
            />
          }
        />
        {others.map((item, i) => {
          const copy = copyFor(item.sku);
          const isSkin = item.kind === 'mascot_skin';
          const has = isSkin && owned.has(item.sku);
          const art = isSkin ? (
            <Mascot skin={toMascotSkin(item.sku)} mood="happy" size={56} crop="head" />
          ) : (
            <ClockArt size={52} />
          );
          return (
            <ItemCard
              key={item.sku}
              index={4 + i}
              art={art}
              name={copy.name}
              description={copy.description}
              right={
                has ? (
                  <Button
                    label={active === item.sku ? strings.shop.equipped : strings.shop.equip}
                    variant="secondary"
                    disabled={active === item.sku}
                    loading={busySku === item.sku}
                    onPress={() => void equip(item.sku)}
                  />
                ) : (
                  <BuyPill
                    item={item}
                    enough={gems >= item.priceGems}
                    busy={busySku === item.sku}
                    onPress={() => void buy(item)}
                  />
                )
              }
            />
          );
        })}
      </View>
    </ScrollView>
  );
}

function BuyPill({
  item,
  enough,
  busy,
  onPress,
}: {
  item: ShopItem;
  enough: boolean;
  busy: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${strings.shop.buy}: ${fill(strings.shop.price, { price: item.priceGems })}`}
      accessibilityState={{ disabled: !enough || busy, busy }}
      disabled={!enough || busy}
      onPress={onPress}
      className="min-h-12 min-w-[84px] items-center justify-center"
    >
      <PricePill gems={item.priceGems} enough={enough} />
    </PressableScale>
  );
}

function ItemCard({
  art,
  name,
  description,
  right,
  index,
}: {
  index: number;
  art: React.ReactNode;
  name: string;
  description: string;
  right: React.ReactNode;
}) {
  return (
    <Enter index={index} className="flex-row items-center gap-3 rounded-3xl bg-folha p-3">
      <View className="h-16 w-16 items-center justify-center">{art}</View>
      <View className="flex-1">
        <Text className="font-display-bold text-base text-tinta">{name}</Text>
        {description ? <Text className="text-sm text-tinta/65">{description}</Text> : null}
      </View>
      <View>{right}</View>
    </Enter>
  );
}
