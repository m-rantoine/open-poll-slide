import {
  type Context,
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { LiveView } from './types';
import type { LiveData } from './use-live-session';

export type LiveContextValue = {
  view: Exclude<LiveView, 'static'>;
  /** Presenter canvases mirror the screen without its host controls. */
  mirror: boolean;
  /** Phone layout: answers live in a native card below the slide, so slide questions show only their heading. */
  compact: boolean;
  data: LiveData;
  now: number;
  deckId: string;
};

type Registry = { add: (id: string) => void; remove: (id: string) => void };

// Stored on globalThis so the app (src) and slides importing the published
// build (dist) share one context instance; otherwise slide components never
// see the provider.
const LIVE_KEY = '__open_slide_live_context__';
const REGISTRY_KEY = '__open_slide_live_registry_context__';
type GlobalWithCtx = typeof globalThis & {
  [LIVE_KEY]?: Context<LiveContextValue | null>;
  [REGISTRY_KEY]?: Context<Registry | null>;
};
const g = globalThis as GlobalWithCtx;
g[LIVE_KEY] ??= createContext<LiveContextValue | null>(null);
g[REGISTRY_KEY] ??= createContext<Registry | null>(null);
const LiveContext = g[LIVE_KEY];
const RegistryContext = g[REGISTRY_KEY];

export function LiveProvider({
  view,
  mirror = false,
  compact = false,
  data,
  deckId,
  children,
}: {
  view: LiveContextValue['view'];
  mirror?: boolean;
  compact?: boolean;
  data: LiveData;
  deckId: string;
  children: ReactNode;
}) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 500);
    return () => window.clearInterval(id);
  }, []);
  const now = Date.now() + data.serverOffset;
  const value = useMemo(
    () => ({ view, mirror, compact, data, now, deckId }),
    [view, mirror, compact, data, now, deckId],
  );
  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
}

export function useLive(): LiveContextValue | null {
  return useContext(LiveContext);
}

export function useQuestionRegistry(): {
  ids: string[];
  Provider: (p: { children: ReactNode }) => ReactNode;
} {
  const [ids, setIds] = useState<string[]>([]);
  const registry = useMemo<Registry>(
    () => ({
      add: (id) => setIds((cur) => (cur.includes(id) ? cur : [...cur, id])),
      remove: (id) => setIds((cur) => cur.filter((x) => x !== id)),
    }),
    [],
  );
  const Provider = useCallback(
    ({ children }: { children: ReactNode }) => (
      <RegistryContext.Provider value={registry}>{children}</RegistryContext.Provider>
    ),
    [registry],
  );
  return { ids, Provider };
}

export function useRegisterQuestion(id: string) {
  const registry = useContext(RegistryContext);
  useEffect(() => {
    registry?.add(id);
    return () => registry?.remove(id);
  }, [registry, id]);
}

export function useQuestionRegistryFlag(flag: 'lobby' | 'results') {
  useRegisterQuestion(`__${flag}__`);
}
