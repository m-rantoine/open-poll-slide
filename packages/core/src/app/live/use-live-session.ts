import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getClient } from './client';
import { normalizeAnswer } from './derive';
import { errorText } from './errors';
import type {
  AnswerRow,
  MyAnswer,
  MyPlacement,
  MyScore,
  ParticipantRow,
  PlacementRow,
  QuestionStateRow,
  SessionRow,
} from './types';

export type AnswerMark = 'correct' | 'incorrect' | 'clear';

export type QuestionAction = 'lock' | 'unlock' | 'add_time' | 'end' | 'expire';

export type LiveActions = {
  setPosition: (index: number, step?: number) => Promise<void>;
  questionAction: (questionId: string, action: QuestionAction, seconds?: number) => Promise<void>;
  setShowResults: (questionId: string, value: boolean) => Promise<void>;
  toggleCorrect: (questionId: string, optionId: string) => Promise<void>;
  submitAnswer: (questionId: string, optionId: string) => Promise<MyAnswer>;
  submitTextAnswer: (questionId: string, text: string) => Promise<MyAnswer>;
  markAnswer: (questionId: string, key: string, mark: AnswerMark) => Promise<void>;
  setScored: (questionId: string, value: boolean) => Promise<void>;
  /** Put a tile in a zone, or back in the pool when `zoneId` is null. */
  placeTile: (
    questionId: string,
    itemId: string,
    zoneId: string | null,
    /** The zone holds one tile: whatever was there goes back to the pool. */
    options?: { single?: boolean },
  ) => Promise<void>;
  /** Replace this participant's whole set of item-to-value placements (scale, ranking, points). */
  setPlacements: (questionId: string, values: Record<string, string>) => Promise<void>;
  submitPlacements: (questionId: string) => Promise<void>;
  endSession: () => Promise<void>;
  pauseSession: () => Promise<void>;
  resumeSession: () => Promise<void>;
};

export type LiveData = {
  loading: boolean;
  error: string | null;
  session: SessionRow | null;
  participants: ParticipantRow[];
  states: Record<string, QuestionStateRow>;
  keys: Record<string, string[]>;
  /** Word-cloud words the host marked incorrect. */
  incorrect: Record<string, string[]>;
  answers: AnswerRow[];
  /** Every participant's placed tiles (hosts only). */
  placements: PlacementRow[];
  /** This participant's placed tiles by question. */
  myPlacements: Record<string, MyPlacement[]>;
  mine: Record<string, MyAnswer>;
  score: MyScore | null;
  /** The participant's own saved slide in a self-paced session. */
  selfIndex: number | null;
  /** Add to Date.now() to get server time. */
  serverOffset: number;
  actions: LiveActions;
};

// Matches PostgREST's default max_rows, so a short page means the end.
const PAGE_SIZE = 1000;

async function fetchAll<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (;;) {
    const { data, error } = await page(rows.length, rows.length + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}

type Slice = 'session' | 'states' | 'participants' | 'answers' | 'keys' | 'placements';

function upsertBy<T>(list: T[], row: T, same: (a: T) => boolean): T[] {
  const i = list.findIndex(same);
  if (i === -1) return [...list, row];
  const next = list.slice();
  next[i] = row;
  return next;
}

export function useLiveSession(sessionId: string | undefined, asHost: boolean): LiveData {
  const [session, setSession] = useState<SessionRow | null>(null);
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [states, setStates] = useState<Record<string, QuestionStateRow>>({});
  const [keys, setKeys] = useState<Record<string, string[]>>({});
  const [incorrect, setIncorrect] = useState<Record<string, string[]>>({});
  const [placements, setPlacements] = useState<PlacementRow[]>([]);
  const [myPlacements, setMyPlacements] = useState<Record<string, MyPlacement[]>>({});
  // Bumped on every local drop so a slower server read cannot roll a drop back.
  const placementEdits = useRef(0);
  const [answers, setAnswers] = useState<AnswerRow[]>([]);
  const [mine, setMine] = useState<Record<string, MyAnswer>>({});
  const [score, setScore] = useState<MyScore | null>(null);
  const [selfIndex, setSelfIndex] = useState<number | null>(null);
  const [serverOffset, setServerOffset] = useState(0);
  const [loading, setLoading] = useState(Boolean(sessionId));
  const [error, setError] = useState<string | null>(null);

  const loadMine = useCallback(async () => {
    if (!sessionId) return;
    const supabase = getClient();
    const edits = placementEdits.current;
    const [answersRes, scoreRes, placementsRes] = await Promise.all([
      supabase.rpc('my_answers', { p_session: sessionId }),
      supabase.rpc('my_score', { p_session: sessionId }),
      supabase.rpc('my_placements', { p_session: sessionId }),
    ]);
    if (placementEdits.current === edits && placementsRes.data) {
      const byQuestion: Record<string, MyPlacement[]> = {};
      for (const pl of placementsRes.data) {
        const list = byQuestion[pl.question_id] ?? [];
        list.push({
          item_id: pl.item_id,
          zone_id: pl.zone_id,
          is_correct: pl.is_correct,
        });
        byQuestion[pl.question_id] = list;
      }
      setMyPlacements(byQuestion);
    }
    const next: Record<string, MyAnswer> = {};
    for (const a of answersRes.data ?? []) {
      next[a.question_id] = {
        option_id: a.option_id,
        is_correct: a.is_correct,
        show_results: a.show_results,
        answer_text: a.answer_text,
      };
    }
    setMine(next);
    const s = scoreRes.data?.[0];
    setScore(s ? { correct: s.correct, graded: s.graded, class_average: s.class_average } : null);
  }, [sessionId]);

  // A background reload must not overwrite a slice that a realtime event or an
  // optimistic write has touched since the reload started.
  const versions = useRef<Record<Slice, number>>({
    session: 0,
    states: 0,
    participants: 0,
    answers: 0,
    keys: 0,
    placements: 0,
  });
  const bump = useCallback((slice: Slice) => {
    versions.current[slice]++;
  }, []);
  // Echoes of the host's own older position writes must not roll the screen back while a
  // newer write is pending; remote changes are accepted again once the newest echo arrives.
  const expectedPosition = useRef<{ index: number; step: number; until: number } | null>(null);
  const generation = useRef(0);
  const inFlight = useRef<number | null>(null);
  const loaded = useRef(false);

  const loadAll = useCallback(async () => {
    const gen = generation.current;
    if (!sessionId || inFlight.current === gen) return;
    inFlight.current = gen;
    const start = { ...versions.current };
    const fresh = (slice: Slice) =>
      generation.current === gen && versions.current[slice] === start[slice];
    const supabase = getClient();
    try {
      const sent = Date.now();
      const [sessionRes, stateRes, timeRes] = await Promise.all([
        supabase.from('sessions').select('*').eq('id', sessionId).maybeSingle(),
        supabase.from('session_question_state').select('*').eq('session_id', sessionId),
        supabase.rpc('server_time'),
      ]);
      if (sessionRes.error || !sessionRes.data) {
        if (!loaded.current) setError(sessionRes.error?.message ?? 'session_not_found');
        return;
      }
      if (fresh('session')) setSession(sessionRes.data);
      if (fresh('states') && stateRes.data) {
        setStates(Object.fromEntries(stateRes.data.map((r) => [r.question_id, r])));
      }
      if (typeof timeRes.data === 'string') {
        const rtt = Date.now() - sent;
        setServerOffset(new Date(timeRes.data).getTime() + rtt / 2 - Date.now());
      }
      if (asHost) {
        const [pRows, aRows, kRes, plRows] = await Promise.all([
          fetchAll<ParticipantRow>((from, to) =>
            supabase
              .from('session_participants')
              .select('*')
              .eq('session_id', sessionId)
              .order('user_id')
              .range(from, to),
          ),
          fetchAll<AnswerRow>((from, to) =>
            supabase
              .from('answers')
              .select('*')
              .eq('session_id', sessionId)
              .order('id')
              .range(from, to),
          ),
          supabase.from('answer_keys').select('*').eq('session_id', sessionId),
          fetchAll<PlacementRow>((from, to) =>
            supabase
              .from('placements')
              .select('*')
              .eq('session_id', sessionId)
              .order('question_id')
              .order('user_id')
              .order('item_id')
              .range(from, to),
          ),
        ]);
        if (fresh('participants')) setParticipants(pRows);
        if (fresh('answers')) setAnswers(aRows);
        if (fresh('placements')) setPlacements(plRows);
        if (fresh('keys') && kRes.data) {
          setKeys(Object.fromEntries(kRes.data.map((r) => [r.question_id, r.correct_option_ids])));
          setIncorrect(
            Object.fromEntries(kRes.data.map((r) => [r.question_id, r.incorrect_option_ids])),
          );
        }
      } else {
        if (!loaded.current && sessionRes.data.mode === 'self') {
          const { data: auth } = await supabase.auth.getSession();
          const userId = auth.session?.user.id;
          if (userId) {
            const { data: me } = await supabase
              .from('session_participants')
              .select('self_index')
              .eq('session_id', sessionId)
              .eq('user_id', userId)
              .maybeSingle();
            setSelfIndex(me?.self_index ?? null);
          }
        }
        await loadMine();
      }
      loaded.current = true;
      setError(null);
    } catch (e) {
      if (!loaded.current) setError(errorText(e));
    } finally {
      if (inFlight.current === gen) inFlight.current = null;
      if (generation.current === gen) setLoading(false);
    }
  }, [sessionId, asHost, loadMine]);

  const loadMineRef = useRef(loadMine);
  loadMineRef.current = loadMine;

  useEffect(() => {
    if (!sessionId) return;
    generation.current++;
    loaded.current = false;
    setLoading(true);
    const supabase = getClient();
    const channel = supabase
      .channel(
        `live:${sessionId}:${asHost ? 'host' : 'participant'}:${Math.random().toString(36).slice(2)}`,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sessions', filter: `id=eq.${sessionId}` },
        (p) => {
          if (p.eventType === 'DELETE') return;
          bump('session');
          const row = p.new as SessionRow;
          const expected = expectedPosition.current;
          if (asHost && expected && Date.now() < expected.until) {
            if (row.current_index === expected.index && row.current_step === expected.step) {
              expectedPosition.current = null;
            } else {
              setSession((cur) =>
                cur
                  ? { ...row, current_index: cur.current_index, current_step: cur.current_step }
                  : row,
              );
              return;
            }
          }
          setSession(row);
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'session_question_state',
          filter: `session_id=eq.${sessionId}`,
        },
        (p) => {
          if (p.eventType === 'DELETE') return;
          bump('states');
          const row = p.new as QuestionStateRow;
          setStates((cur) => ({ ...cur, [row.question_id]: row }));
          if (!asHost) void loadMineRef.current();
        },
      );

    if (asHost) {
      channel
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'session_participants',
            filter: `session_id=eq.${sessionId}`,
          },
          (p) => {
            if (p.eventType === 'DELETE') return;
            bump('participants');
            const row = p.new as ParticipantRow;
            setParticipants((cur) => upsertBy(cur, row, (x) => x.user_id === row.user_id));
          },
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'answers', filter: `session_id=eq.${sessionId}` },
          (p) => {
            bump('answers');
            if (p.eventType === 'DELETE') {
              const id = (p.old as { id?: string }).id;
              setAnswers((cur) => cur.filter((a) => a.id !== id));
              return;
            }
            const row = p.new as AnswerRow;
            setAnswers((cur) => upsertBy(cur, row, (x) => x.id === row.id));
          },
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'placements',
            filter: `session_id=eq.${sessionId}`,
          },
          (p) => {
            bump('placements');
            const same = (r: PlacementRow, k: Partial<PlacementRow>) =>
              r.question_id === k.question_id && r.user_id === k.user_id && r.item_id === k.item_id;
            if (p.eventType === 'DELETE') {
              const old = p.old as Partial<PlacementRow>;
              setPlacements((cur) => cur.filter((r) => !same(r, old)));
              return;
            }
            const row = p.new as PlacementRow;
            setPlacements((cur) => upsertBy(cur, row, (x) => same(x, row)));
          },
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'answer_keys',
            filter: `session_id=eq.${sessionId}`,
          },
          (p) => {
            if (p.eventType === 'DELETE') return;
            bump('keys');
            const row = p.new as {
              question_id: string;
              correct_option_ids: string[];
              incorrect_option_ids: string[];
            };
            setKeys((cur) => ({ ...cur, [row.question_id]: row.correct_option_ids }));
            setIncorrect((cur) => ({ ...cur, [row.question_id]: row.incorrect_option_ids }));
          },
        );
    }

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') void loadAll();
    });
    // Safety net for events dropped during reconnects.
    const resync = window.setInterval(() => void loadAll(), 8000);
    return () => {
      window.clearInterval(resync);
      void supabase.removeChannel(channel);
    };
  }, [sessionId, asHost, loadAll, bump]);

  const positionQueue = useRef<{
    busy: boolean;
    sending: { index: number; step: number } | null;
    next: { index: number; step: number } | null;
  }>({ busy: false, sending: null, next: null });
  const offsetRef = useRef(serverOffset);
  offsetRef.current = serverOffset;
  const statesRef = useRef(states);
  statesRef.current = states;

  const questionAction = useCallback<LiveActions['questionAction']>(
    async (questionId, action, seconds = 0) => {
      if (!sessionId) return;
      const { data, error: err } = await getClient().rpc('host_question_action', {
        p_session: sessionId,
        p_question: questionId,
        p_action: action,
        p_seconds: seconds,
      });
      if (err) throw err;
      if (data) {
        bump('states');
        setStates((cur) => ({ ...cur, [questionId]: data }));
      }
    },
    [sessionId, bump],
  );

  useEffect(() => {
    if (!asHost) return;
    const timers: number[] = [];
    for (const st of Object.values(states)) {
      if (st.state !== 'open' || !st.ends_at) continue;
      const wait = new Date(st.ends_at).getTime() - (Date.now() + offsetRef.current) + 400;
      timers.push(
        window.setTimeout(
          () => {
            void questionAction(st.question_id, 'expire').catch(() => {});
          },
          Math.max(0, wait),
        ),
      );
    }
    return () => {
      for (const t of timers) window.clearTimeout(t);
    };
  }, [asHost, states, questionAction]);

  const actions = useMemo<LiveActions>(
    () => ({
      async setPosition(index, step = 0) {
        if (!sessionId) return;
        const queue = positionQueue.current;
        const pending = queue.next ?? (queue.busy ? queue.sending : null);
        if (pending && pending.index === index && pending.step === step) return;
        bump('session');
        expectedPosition.current = { index, step, until: Date.now() + 3000 };
        setSession((cur) => (cur ? { ...cur, current_index: index, current_step: step } : cur));
        // Concurrent requests can be applied out of order by Postgres, leaving
        // the database behind the host's screen. Send one at a time, latest only.
        positionQueue.current.next = { index, step };
        if (positionQueue.current.busy) return;
        positionQueue.current.busy = true;
        try {
          while (positionQueue.current.next) {
            const target = positionQueue.current.next;
            positionQueue.current.next = null;
            positionQueue.current.sending = target;
            const { error: err } = await getClient().rpc('set_position', {
              p_session: sessionId,
              p_index: target.index,
              p_step: target.step,
            });
            if (err) throw err;
          }
        } finally {
          positionQueue.current.busy = false;
        }
      },
      questionAction,
      async setShowResults(questionId, value) {
        if (!sessionId) return;
        const { error: err } = await getClient().rpc('set_show_results', {
          p_session: sessionId,
          p_question: questionId,
          p_value: value,
        });
        if (err) throw err;
        bump('states');
        setStates((cur) =>
          cur[questionId]
            ? { ...cur, [questionId]: { ...cur[questionId], show_results: value } }
            : cur,
        );
      },
      async toggleCorrect(questionId, optionId) {
        if (!sessionId) return;
        const { data, error: err } = await getClient().rpc('toggle_correct_option', {
          p_session: sessionId,
          p_question: questionId,
          p_option: optionId,
        });
        if (err) throw err;
        if (data) {
          bump('keys');
          setKeys((cur) => ({ ...cur, [questionId]: data }));
        }
      },
      async submitAnswer(questionId, optionId) {
        if (!sessionId) throw new Error('No session');
        const { data, error: err } = await getClient().rpc('submit_answer', {
          p_session: sessionId,
          p_question: questionId,
          p_option: optionId,
        });
        if (err) throw err;
        const st = statesRef.current[questionId];
        const answer: MyAnswer = {
          option_id: data.option_id,
          is_correct: st?.show_results ? data.is_correct : null,
          show_results: Boolean(st?.show_results),
        };
        setMine((cur) => ({ ...cur, [questionId]: answer }));
        void loadMineRef.current();
        return answer;
      },
      async submitTextAnswer(questionId, text) {
        if (!sessionId) throw new Error('No session');
        const { data, error: err } = await getClient().rpc('submit_text_answer', {
          p_session: sessionId,
          p_question: questionId,
          p_text: text,
        });
        if (err) throw err;
        const st = statesRef.current[questionId];
        const answer: MyAnswer = {
          option_id: data.option_id,
          is_correct: st?.show_results ? data.is_correct : null,
          show_results: Boolean(st?.show_results),
          answer_text: data.answer_text,
        };
        setMine((cur) => ({ ...cur, [questionId]: answer }));
        void loadMineRef.current();
        return answer;
      },
      async markAnswer(questionId, key, mark) {
        if (!sessionId) return;
        const { error: err } = await getClient().rpc('mark_answer', {
          p_session: sessionId,
          p_question: questionId,
          p_key: key,
          p_mark: mark,
        });
        if (err) throw err;
        const k = normalizeAnswer(key);
        const without = (list: string[] | undefined) => (list ?? []).filter((w) => w !== k);
        bump('keys');
        setKeys((cur) => ({
          ...cur,
          [questionId]:
            mark === 'correct' ? [...without(cur[questionId]), k] : without(cur[questionId]),
        }));
        setIncorrect((cur) => ({
          ...cur,
          [questionId]:
            mark === 'incorrect' ? [...without(cur[questionId]), k] : without(cur[questionId]),
        }));
      },
      async placeTile(questionId, itemId, zoneId, options) {
        if (!sessionId) return;
        placementEdits.current++;
        setMyPlacements((cur) => {
          const rest = (cur[questionId] ?? []).filter(
            (x) => x.item_id !== itemId && !(options?.single && zoneId && x.zone_id === zoneId),
          );
          return {
            ...cur,
            [questionId]: zoneId
              ? [...rest, { item_id: itemId, zone_id: zoneId, is_correct: null }]
              : rest,
          };
        });
        const { error: err } = await getClient().rpc('place_tile', {
          p_session: sessionId,
          p_question: questionId,
          p_item: itemId,
          p_zone: zoneId,
        });
        if (err) {
          placementEdits.current++;
          void loadMineRef.current();
          throw err;
        }
      },
      async setPlacements(questionId, values) {
        if (!sessionId) return;
        placementEdits.current++;
        setMyPlacements((cur) => ({
          ...cur,
          [questionId]: Object.entries(values).map(([item_id, zone_id]) => ({
            item_id,
            zone_id,
            is_correct: null,
          })),
        }));
        const { error: err } = await getClient().rpc('set_placements', {
          p_session: sessionId,
          p_question: questionId,
          p_values: values,
        });
        if (err) {
          placementEdits.current++;
          void loadMineRef.current();
          throw err;
        }
      },
      async submitPlacements(questionId) {
        if (!sessionId) return;
        const { data, error: err } = await getClient().rpc('submit_placements', {
          p_session: sessionId,
          p_question: questionId,
        });
        if (err) throw err;
        const st = statesRef.current[questionId];
        setMine((cur) => ({
          ...cur,
          [questionId]: {
            option_id: data.option_id,
            is_correct: null,
            show_results: Boolean(st?.show_results),
            answer_text: null,
          },
        }));
        void loadMineRef.current();
      },
      async setScored(questionId, value) {
        if (!sessionId) return;
        const { error: err } = await getClient().rpc('set_question_scored', {
          p_session: sessionId,
          p_question: questionId,
          p_value: value,
        });
        if (err) throw err;
        bump('states');
        setStates((cur) =>
          cur[questionId] ? { ...cur, [questionId]: { ...cur[questionId], scored: value } } : cur,
        );
      },
      async endSession() {
        if (!sessionId) return;
        const { error: err } = await getClient().rpc('end_session', { p_session: sessionId });
        if (err) throw err;
      },
      async pauseSession() {
        if (!sessionId) return;
        const { error: err } = await getClient().rpc('pause_session', { p_session: sessionId });
        if (err) throw err;
        bump('session');
        setSession((cur) => (cur ? { ...cur, status: 'paused' } : cur));
      },
      async resumeSession() {
        if (!sessionId) return;
        const { error: err } = await getClient().rpc('resume_session', { p_session: sessionId });
        if (err) throw err;
        bump('session');
        setSession((cur) => (cur ? { ...cur, status: 'active' } : cur));
        void loadAll();
      },
    }),
    [sessionId, questionAction, bump, loadAll],
  );

  return {
    loading,
    error,
    session,
    participants,
    states,
    keys,
    incorrect,
    answers,
    placements,
    myPlacements,
    mine,
    score,
    selfIndex,
    serverOffset,
    actions,
  };
}

export function useParticipantPresence(sessionId: string | undefined, enabled: boolean) {
  useEffect(() => {
    if (!sessionId || !enabled) return;
    const supabase = getClient();
    let last: boolean | null = null;
    // rpc() is lazy: the request only goes out once the builder is awaited.
    const send = async (active: boolean) => {
      await supabase.rpc('set_presence', { p_session: sessionId, p_active: active });
    };
    const report = (force = false) => {
      const active = document.visibilityState === 'visible' && document.hasFocus();
      if (!force && active === last) return;
      last = active;
      void send(active);
    };
    report(true);
    const heartbeat = window.setInterval(() => report(true), 20_000);
    const onChange = () => report();
    const onHide = () => {
      last = false;
      void send(false);
    };
    document.addEventListener('visibilitychange', onChange);
    window.addEventListener('focus', onChange);
    window.addEventListener('blur', onChange);
    window.addEventListener('pagehide', onHide);
    return () => {
      window.clearInterval(heartbeat);
      document.removeEventListener('visibilitychange', onChange);
      window.removeEventListener('focus', onChange);
      window.removeEventListener('blur', onChange);
      window.removeEventListener('pagehide', onHide);
    };
  }, [sessionId, enabled]);
}
