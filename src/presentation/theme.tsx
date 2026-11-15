import { vars } from 'nativewind';
import { useColorScheme } from 'react-native';
import { create } from 'zustand';
import { DEFAULT_PREFS, loadPrefs, savePrefs } from '../infra/storage/prefsStorage';
import type { StoredPrefs } from '../infra/storage/prefsStorage';

export type ThemePref = StoredPrefs['theme'];
export type LanguagePref = StoredPrefs['language'];

/** Palette per scheme: hex for JS (icons, native views) and "r g b" triplets for the Tailwind CSS variables. */
const LIGHT = {
  nevoa: '#F7F4E9',
  folha: '#FFFFFF',
  tinta: '#16372A',
  musgo: '#12452E',
  floresta: '#1F6B43',
  sol: '#FFC72C',
  pimenta: '#D6392B',
  fio: '#E5E0CC',
  sage: '#E6EDE0',
  crema: '#FBEFC4',
  muted: '#7C8B80',
  placeholder: '#8A978E',
} as const;

const DARK: Record<keyof typeof LIGHT, string> = {
  nevoa: '#0E1A14',
  folha: '#18291F',
  tinta: '#EEF0E4',
  musgo: '#134029',
  floresta: '#2F8F5B',
  sol: '#FFC72C',
  pimenta: '#F0604F',
  fio: '#2B4035',
  sage: '#1D3328',
  crema: '#3A3418',
  muted: '#8FA297',
  placeholder: '#7E9186',
};

export type Palette = Record<keyof typeof LIGHT, string>;
export type Scheme = 'light' | 'dark';

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(' ');

function cssVars(p: Palette) {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(p)) out[`--c-${k}`] = rgb(v);
  return vars(out);
}

const VARS = { light: cssVars(LIGHT), dark: cssVars(DARK) };
export const PALETTES: Record<Scheme, Palette> = { light: LIGHT, dark: DARK };

interface PrefsState extends StoredPrefs {
  ready: boolean;
  load: () => Promise<void>;
  setTheme: (theme: ThemePref) => void;
  setLanguage: (language: LanguagePref) => void;
}

export const usePrefs = create<PrefsState>((set, get) => ({
  ...DEFAULT_PREFS,
  ready: false,
  load: async () => set({ ...(await loadPrefs()), ready: true }),
  setTheme: (theme) => {
    set({ theme });
    void savePrefs({ theme, language: get().language });
  },
  setLanguage: (language) => {
    set({ language });
    void savePrefs({ theme: get().theme, language });
  },
}));

export function useTheme(): { scheme: Scheme; colors: Palette; vars: ReturnType<typeof vars> } {
  const pref = usePrefs((s) => s.theme);
  const system = useColorScheme();
  const scheme: Scheme = pref === 'system' ? (system === 'dark' ? 'dark' : 'light') : pref;
  return { scheme, colors: PALETTES[scheme], vars: VARS[scheme] };
}

export const useColors = (): Palette => useTheme().colors;
