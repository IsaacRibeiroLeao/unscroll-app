import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { Text } from '../presentation/ui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { errorMessage } from '../application/errorMessages';
import type { ShopItem } from '../application/ports/IBackendApi';
import { purchaseShopItem } from '../application/purchaseShopItem';
import { Button } from '../presentation/components/Button';
import { Mascot } from '../presentation/components/Mascot';
import { toMascotSkin } from '../domain/mascot';
import { fill } from '../presentation/format';
import { backend, blocker, errorTexts } from '../presentation/state/container';
import { keys, useProfile, useShop } from '../presentation/state/queries';
import { strings } from '../strings/pt-BR';

type Copy = { name: string; description: string };
const copyFor = (sku: string): Copy =>
  (strings.shop.items as Record<string, Copy | undefined>)[sku] ?? { name: sku, description: '' };

export default function ShopScreen() {
  const router = useRouter();
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

  return (
    <SafeAreaView className="flex-1 bg-nevoa">
      <ScrollView contentContainerClassName="gap-4 p-4">
        <Text accessibilityRole="header" className="text-2xl font-display-bold text-tinta">
          {strings.shop.title}
        </Text>
        {profile.data ? (
          <View className="flex-row items-center justify-between border-b border-fio pb-5">
            <View className="gap-1">
              <Text
                className="font-display text-tinta"
                style={{ fontSize: 52, lineHeight: 54, letterSpacing: -1 }}
              >
                {profile.data.gems}
              </Text>
              <Text className="text-base text-tinta/70">
                {fill(strings.shop.freezeCount, { count: profile.data.streakFreezeCount })}
              </Text>
            </View>
            <Mascot skin={toMascotSkin(active)} mood="happy" size={84} />
          </View>
        ) : null}

        <View className="gap-3 border-b border-fio pb-4 pt-1">
          <Text className="text-base font-body-semibold text-tinta">
            {strings.shop.defaultSkin}
          </Text>
          <Button
            label={active === 'default' ? strings.shop.equipped : strings.shop.equip}
            variant="secondary"
            disabled={active === 'default'}
            loading={busySku === 'default'}
            onPress={() => void equip('default')}
          />
        </View>

        {shop.isError ? (
          <View className="gap-2 border-b border-fio pb-4 pt-1">
            <Text className="text-tinta/80">{errorMessage(shop.error, errorTexts)}</Text>
            <Button label={strings.common.retry} onPress={() => void shop.refetch()} />
          </View>
        ) : null}

        {shop.data?.items.map((item) => {
          const copy = copyFor(item.sku);
          const isSkin = item.kind === 'mascot_skin';
          const has = isSkin && owned.has(item.sku);
          const label = has
            ? active === item.sku
              ? strings.shop.equipped
              : strings.shop.equip
            : `${strings.shop.buy} · ${fill(strings.shop.price, { price: item.priceGems })}`;
          return (
            <View key={item.sku} className="gap-2 border-b border-fio pb-4 pt-1">
              <Text className="text-base font-body-semibold text-tinta">{copy.name}</Text>
              <Text className="text-sm text-tinta/70">{copy.description}</Text>
              <Button
                label={label}
                variant={has ? 'secondary' : 'sun'}
                loading={busySku === item.sku}
                // UI hint only: the server enforces gems, limits and ownership.
                disabled={has ? active === item.sku : (profile.data?.gems ?? 0) < item.priceGems}
                onPress={() => void (has ? equip(item.sku) : buy(item))}
              />
            </View>
          );
        })}

        <Button label={strings.common.close} variant="ghost" onPress={() => router.back()} />
      </ScrollView>
    </SafeAreaView>
  );
}
