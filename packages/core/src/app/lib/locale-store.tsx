import config from 'virtual:open-slide/config';
import { createContext, type ReactNode, useContext, useSyncExternalStore } from 'react';
import { en } from '../../locale/en';
import { frCA } from '../../locale/fr-ca';
import { ja } from '../../locale/ja';
import type { Locale } from '../../locale/types';
import { zhCN } from '../../locale/zh-cn';
import { zhTW } from '../../locale/zh-tw';

export type LocaleId = Locale['id'];

const LOCALES: Record<LocaleId, Locale> = {
  en,
  'fr-CA': frCA,
  'zh-TW': zhTW,
  'zh-CN': zhCN,
  ja,
};

export const LOCALE_OPTIONS: ReadonlyArray<{ id: LocaleId; label: string }> = [
  { id: 'en', label: 'English' },
  { id: 'fr-CA', label: 'Français (Canada)' },
  { id: 'zh-TW', label: '繁體中文' },
  { id: 'zh-CN', label: '简体中文' },
  { id: 'ja', label: '日本語' },
];

const STORAGE_KEY = 'open-slide:locale';
const configLocale = config.locale as Locale | undefined;

function isLocaleId(value: string | null): value is LocaleId {
  return value !== null && Object.hasOwn(LOCALES, value);
}

function readStored(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isLocaleId(stored)) return LOCALES[stored];
  } catch {}
  return configLocale ?? en;
}

// A module-level store (rather than React context) so every React root the
// runtime mounts — the app shell plus the standalone roots used for HTML/PDF
// export — shares one locale without needing a provider above each of them.
// It lives on globalThis because slides import live components from the
// published build, which carries its own copy of this module.
const STORE_KEY = '__open_slide_locale_store__';
type Store = { current: Locale; listeners: Set<() => void> };
const g = globalThis as typeof globalThis & { [STORE_KEY]?: Store };
g[STORE_KEY] ??= { current: readStored(), listeners: new Set() };
const store = g[STORE_KEY];

function subscribe(listener: () => void): () => void {
  store.listeners.add(listener);
  return () => {
    store.listeners.delete(listener);
  };
}

function getSnapshot(): Locale {
  return store.current;
}

export function setLocale(id: LocaleId): void {
  store.current = LOCALES[id];
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {}
  for (const listener of store.listeners) listener();
}

const ScopedLocale = createContext<Locale | null>(null);

export type PollLanguage = 'en' | 'fr';

const POLL_LANGUAGES: Record<PollLanguage, Locale> = { en, fr: frCA };

export function LanguageScope({
  language,
  children,
}: {
  language?: PollLanguage;
  children: ReactNode;
}) {
  const locale = language ? (POLL_LANGUAGES[language] ?? null) : null;
  return <ScopedLocale.Provider value={locale}>{children}</ScopedLocale.Provider>;
}

export function useLocaleValue(): Locale {
  const scoped = useContext(ScopedLocale);
  const global = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return scoped ?? global;
}
