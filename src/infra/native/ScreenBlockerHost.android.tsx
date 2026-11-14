import { useEffect, useMemo, useState } from 'react';
import { FlatList, Image, Modal, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { strings } from '../../strings/pt-BR';
import { appPickerBridge } from './android/appPickerBridge';
import type { PickerHostRequest } from './android/appPickerBridge';

/** Hosts the installed-apps picker modal. Mount once in the root layout. */
export default function ScreenBlockerHost() {
  const [request, setRequest] = useState<PickerHostRequest | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(
    () =>
      appPickerBridge.subscribe((r) => {
        setSelected(new Set(r.selected));
        setRequest(r);
      }),
    [],
  );

  const count = useMemo(
    () => strings.appPicker.selectedCount.replace('{count}', String(selected.size)),
    [selected],
  );

  const close = (result: string[] | null) => {
    request?.resolve(result);
    setRequest(null);
  };

  const toggle = (pkg: string, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(pkg);
      else next.delete(pkg);
      return next;
    });

  return (
    <Modal
      visible={request !== null}
      animationType="slide"
      onRequestClose={() => close(null)}
      statusBarTranslucent
    >
      <View style={styles.screen}>
        <Text accessibilityRole="header" style={styles.title}>
          {strings.appPicker.title}
        </Text>
        <Text style={styles.hint}>{strings.appPicker.hint}</Text>
        <FlatList
          data={request?.apps ?? []}
          keyExtractor={(item) => item.packageName}
          style={styles.list}
          initialNumToRender={20}
          renderItem={({ item }) => {
            const on = selected.has(item.packageName);
            return (
              <Pressable
                accessibilityRole="switch"
                accessibilityState={{ checked: on }}
                accessibilityLabel={item.label}
                onPress={() => toggle(item.packageName, !on)}
                style={styles.row}
              >
                <Image
                  source={{ uri: `data:image/png;base64,${item.iconBase64}` }}
                  style={styles.icon}
                  accessibilityIgnoresInvertColors
                />
                <Text style={styles.label} numberOfLines={1}>
                  {item.label}
                </Text>
                <Switch
                  value={on}
                  onValueChange={(v) => toggle(item.packageName, v)}
                  accessible={false}
                />
              </Pressable>
            );
          }}
        />
        <Text style={styles.count}>{count}</Text>
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={() => close(null)}
            style={[styles.button, styles.secondary]}
          >
            <Text style={styles.secondaryText}>{strings.appPicker.cancel}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => close([...selected])}
            style={[styles.button, styles.primary]}
          >
            <Text style={styles.primaryText}>{strings.appPicker.confirm}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#16241C', paddingTop: 48, paddingHorizontal: 16 },
  title: { color: '#F8FAFC', fontSize: 22, fontWeight: '700' },
  hint: { color: '#CBD5E1', fontSize: 14, marginTop: 4, marginBottom: 12 },
  list: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 56, gap: 12 },
  icon: { width: 36, height: 36, borderRadius: 8 },
  label: { flex: 1, color: '#F8FAFC', fontSize: 16 },
  count: { color: '#94A3B8', textAlign: 'center', marginVertical: 8 },
  actions: { flexDirection: 'row', gap: 12, paddingBottom: 24 },
  button: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: '#FFBE1F' },
  secondary: { backgroundColor: '#24362C' },
  primaryText: { color: '#16241C', fontWeight: '700', fontSize: 16 },
  secondaryText: { color: '#E2E8F0', fontWeight: '600', fontSize: 16 },
});
