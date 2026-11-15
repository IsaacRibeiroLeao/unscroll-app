import { en } from './en.ts';
import { es } from './es.ts';
import { strings } from './pt-BR.ts';

/** Same shape as the pt-BR strings, but with plain `string` leaves. */
export type Widen<T> = T extends string
  ? string
  : T extends readonly (infer U)[]
    ? Widen<U>[]
    : T extends object
      ? { -readonly [K in keyof T]: Widen<T[K]> }
      : T;

export type Locale = 'pt-BR' | 'en' | 'es';
export type LanguagePref = Locale | 'auto';

type Tree = { [key: string]: unknown };

const PT: Tree = JSON.parse(JSON.stringify(strings)) as Tree;
const SOURCES: Record<Locale, Tree> = {
  'pt-BR': PT,
  en: en as unknown as Tree,
  es: es as unknown as Tree,
};

/** Copies `source` over `target` in place, so references held elsewhere (error maps) stay valid. */
function apply(target: Tree, source: Tree): void {
  for (const key of Object.keys(source)) {
    const value = source[key];
    if (typeof value === 'string') target[key] = value;
    else if (value && typeof value === 'object') apply(target[key] as Tree, value as Tree);
  }
}

export function deviceLocale(): Locale {
  let tag = 'en';
  try {
    tag = Intl.DateTimeFormat().resolvedOptions().locale || 'en';
  } catch {
    // keep default
  }
  const lang = tag.toLowerCase();
  if (lang.startsWith('pt')) return 'pt-BR';
  if (lang.startsWith('es')) return 'es';
  return 'en';
}

export const resolveLocale = (pref: LanguagePref): Locale =>
  pref === 'auto' ? deviceLocale() : pref;

let current: Locale = 'pt-BR';

/** Switches the text the whole app reads from `strings`. Idempotent. */
export function setLocale(locale: Locale): void {
  if (locale === current) return;
  apply(strings as unknown as Tree, SOURCES[locale]);
  current = locale;
}

export const currentLocale = (): Locale => current;
