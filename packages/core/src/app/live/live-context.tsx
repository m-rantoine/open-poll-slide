import {
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
  data: LiveData;
  now: number;
  deckId: string;
};

const LiveContext = createContext<LiveContextValue | null>(null);

export function LiveProvider({
  view,
  mirror = false,
  data,
  deckId,
  children,
}: {
  view: LiveContextValue['view'];
  mirror?: boolean;
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
    () => ({ view, mirror, data, now, deckId }),
    [view, mirror, data, now, deckId],
  );
  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
}

export function useLive(): LiveContextValue | null {
  return useContext(LiveContext);
}

type Registry = { add: (id: string) => void; remove: (id: string) => void };
const RegistryContext = createContext<Registry | null>(null);

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
