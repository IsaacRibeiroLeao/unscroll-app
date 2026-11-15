import { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { partitionApps } from '../../domain/distractingApps';
import { useTheme } from '../../presentation/theme';
import type { Palette } from '../../presentation/theme';
import { strings } from '../../strings/pt-BR';
import { appPickerBridge } from './android/appPickerBridge';
import type { PickerHostRequest } from './android/appPickerBridge';

type App = PickerHostRequest['apps'][number];
type Row =
  | { kind: 'header'; key: string; title: string; action?: { label: string; onPress: () => void } }
  | { kind: 'app'; key: string; app: App }
  | { kind: 'empty'; key: string };

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Hosts the installed-apps picker modal. Mount once in the root layout. */
export default function ScreenBlockerHost() {
  const [request, setRequest] = useState<PickerHostRequest | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  useEffect(
    () =>
      appPickerBridge.subscribe((r) => {
        setSelected(new Set(r.selected));
        setQuery('');
        setRequest(r);
      }),
    [],
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

  const rows = useMemo<Row[]>(() => {
    const q = norm(query.trim());
    const apps = (request?.apps ?? []).filter((a) => !q || norm(a.label).includes(q));
    const { suggested, others } = partitionApps(apps);
    const out: Row[] = [];
    if (suggested.length > 0) {
      const allOn = suggested.every((a) => selected.has(a.packageName));
      out.push({
        kind: 'header',
        key: 'h-suggested',
        title: strings.appPicker.suggested,
        action: {
          label: allOn ? strings.appPicker.clearSuggested : strings.appPicker.selectSuggested,
          onPress: () =>
            setSelected((prev) => {
              const next = new Set(prev);
              for (const a of suggested) {
                if (allOn) next.delete(a.packageName);
                else next.add(a.packageName);
              }
              return next;
            }),
        },
      });
      for (const app of suggested) out.push({ kind: 'app', key: app.packageName, app });
    }
    if (others.length > 0) {
      out.push({ kind: 'header', key: 'h-all', title: strings.appPicker.allApps });
      for (const app of others) out.push({ kind: 'app', key: app.packageName, app });
    }
    if (out.length === 0) out.push({ kind: 'empty', key: 'empty' });
    return out;
  }, [request, query, selected]);

  const count = strings.appPicker.selectedCount.replace('{count}', String(selected.size));

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
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={strings.appPicker.search}
          placeholderTextColor={colors.placeholder}
          accessibilityLabel={strings.appPicker.search}
          autoCorrect={false}
          style={styles.search}
        />
        <FlatList
          data={rows}
          keyExtractor={(r) => r.key}
          style={styles.list}
          initialNumToRender={20}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            if (item.kind === 'header') {
              return (
                <View style={styles.header}>
                  <Text style={styles.headerText}>{item.title}</Text>
                  {item.action ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={item.action.onPress}
                      hitSlop={8}
                      style={styles.headerAction}
                    >
                      <Text style={styles.headerActionText}>{item.action.label}</Text>
                    </Pressable>
                  ) : null}
                </View>
              );
            }
            if (item.kind === 'empty') {
              return <Text style={styles.empty}>{strings.appPicker.noResults}</Text>;
            }
            const { app } = item;
            const on = selected.has(app.packageName);
            return (
              <Pressable
                accessibilityRole="switch"
                accessibilityState={{ checked: on }}
                accessibilityLabel={app.label}
                onPress={() => toggle(app.packageName, !on)}
                style={styles.row}
              >
                <Image
                  source={{ uri: `data:image/png;base64,${app.iconBase64}` }}
                  style={styles.icon}
                  accessibilityIgnoresInvertColors
                />
                <Text style={styles.label} numberOfLines={1}>
                  {app.label}
                </Text>
                <Switch
                  value={on}
                  onValueChange={(v) => toggle(app.packageName, v)}
                  accessible={false}
                  trackColor={{ false: colors.fio, true: '#2E9A5B' }}
                  thumbColor="#FFFFFF"
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

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.nevoa, paddingTop: 48, paddingHorizontal: 20 },
    title: { color: c.tinta, fontSize: 26, fontFamily: 'Nunito_900Black' },
    hint: { color: c.tinta, opacity: 0.7, fontSize: 15, marginTop: 4, marginBottom: 12 },
    search: {
      minHeight: 48,
      borderRadius: 24,
      backgroundColor: c.folha,
      borderWidth: 1,
      borderColor: c.fio,
      paddingHorizontal: 18,
      color: c.tinta,
      fontSize: 16,
      marginBottom: 6,
    },
    list: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      paddingTop: 16,
      paddingBottom: 6,
    },
    headerText: { flex: 1, color: c.tinta, fontSize: 15, fontFamily: 'Nunito_800ExtraBold' },
    headerAction: { minHeight: 36, justifyContent: 'center' },
    headerActionText: { color: c.floresta, fontSize: 14, fontFamily: 'Nunito_800ExtraBold' },
    row: { flexDirection: 'row', alignItems: 'center', minHeight: 60, gap: 12 },
    icon: { width: 40, height: 40, borderRadius: 10 },
    label: { flex: 1, color: c.tinta, fontSize: 16, fontFamily: 'Nunito_700Bold' },
    empty: { color: c.tinta, opacity: 0.6, textAlign: 'center', paddingVertical: 32 },
    count: { color: c.tinta, opacity: 0.6, textAlign: 'center', marginVertical: 8 },
    actions: { flexDirection: 'row', gap: 12, paddingBottom: 24 },
    button: {
      flex: 1,
      minHeight: 54,
      borderRadius: 27,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primary: { backgroundColor: c.floresta },
    secondary: { backgroundColor: c.folha, borderWidth: 2, borderColor: c.tinta },
    primaryText: { color: '#FFFFFF', fontSize: 17, fontFamily: 'Nunito_800ExtraBold' },
    secondaryText: { color: c.tinta, fontSize: 17, fontFamily: 'Nunito_800ExtraBold' },
  });
