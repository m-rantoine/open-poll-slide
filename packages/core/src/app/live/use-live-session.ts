import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getClient } from './client';
import type {
  AnswerRow,
  MyAnswer,
  MyScore,
  ParticipantRow,
  QuestionStateRow,
  SessionRow,
} from './types';

export type QuestionAction = 'lock' | 'unlock' | 'add_time' | 'end' | 'expire';

export type LiveActions = {
  setPosition: (index: number, step?: number) => Promise<void>;
  questionAction: (questionId: string, action: QuestionAction, seconds?: number) => Promise<void>;
  setShowResults: (questionId: string, value: boolean) => Promise<void>;
  toggleCorrect: (questionId: string, optionId: string) => Promise<void>;
  submitAnswer: (questionId: string, optionId: string) => Promise<MyAnswer>;
  endSession: () => Promise<void>;
};

export type LiveData = {
  loading: boolean;
  error: string | null;
  session: SessionRow | null;
  participants: ParticipantRow[];
  states: Record<string, QuestionStateRow>;
  keys: Record<string, string[]>;
  answers: AnswerRow[];
  mine: Record<string, MyAnswer>;
  score: MyScore | null;
  /** Add to Date.now() to get server time. */
  serverOffset: number;
  actions: LiveActions;
};

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
  const [answers, setAnswers] = useState<AnswerRow[]>([]);
  const [mine, setMine] = useState<Record<string, MyAnswer>>({});
  const [score, setScore] = useState<MyScore | null>(null);
  const [serverOffset, setServerOffset] = useState(0);
  const [loading, setLoading] = useState(Boolean(sessionId));
  const [error, setError] = useState<string | null>(null);

  const loadMine = useCallback(async () => {
    if (!sessionId) return;
    const supabase = getClient();
    const [answersRes, scoreRes] = await Promise.all([
      supabase.rpc('my_answers', { p_session: sessionId }),
      supabase.rpc('my_score', { p_session: sessionId }),
    ]);
    const next: Record<string, MyAnswer> = {};
    for (const a of answersRes.data ?? []) {
      next[a.question_id] = {
        option_id: a.option_id,
        is_correct: a.is_correct,
        show_results: a.show_results,
      };
    }
    setMine(next);
    const s = scoreRes.data?.[0];
    setScore(s ? { correct: s.correct, graded: s.graded, class_average: s.class_average } : null);
  }, [sessionId]);

  const loadAll = useCallback(async () => {
    if (!sessionId) return;
    const supabase = getClient();
    const sent = Date.now();
    const [sessionRes, stateRes, timeRes] = await Promise.all([
      supabase.from('sessions').select('*').eq('id', sessionId).maybeSingle(),
      supabase.from('session_question_state').select('*').eq('session_id', sessionId),
      supabase.rpc('server_time'),
    ]);
    if (sessionRes.error || !sessionRes.data) {
      setError(sessionRes.error?.message ?? 'Session not found');
      setLoading(false);
      return;
    }
    setSession(sessionRes.data);
    setStates(Object.fromEntries((stateRes.data ?? []).map((r) => [r.question_id, r])));
    if (typeof timeRes.data === 'string') {
      const rtt = Date.now() - sent;
      setServerOffset(new Date(timeRes.data).getTime() + rtt / 2 - Date.now());
    }
    if (asHost) {
      const [pRes, aRes, kRes] = await Promise.all([
        supabase.from('session_participants').select('*').eq('session_id', sessionId),
        supabase.from('answers').select('*').eq('session_id', sessionId),
        supabase.from('answer_keys').select('*').eq('session_id', sessionId),
      ]);
      setParticipants(pRes.data ?? []);
      setAnswers(aRes.data ?? []);
      setKeys(
        Object.fromEntries((kRes.data ?? []).map((r) => [r.question_id, r.correct_option_ids])),
      );
    } else {
      await loadMine();
    }
    setError(null);
    setLoading(false);
  }, [sessionId, asHost, loadMine]);

  const loadMineRef = useRef(loadMine);
  loadMineRef.current = loadMine;

  useEffect(() => {
    if (!sessionId) return;
    setLoading(true);
    const supabase = getClient();
    const channel = supabase
      .channel(`live:${sessionId}:${asHost ? 'host' : 'participant'}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sessions', filter: `id=eq.${sessionId}` },
        (p) => {
          if (p.eventType !== 'DELETE') setSession(p.new as SessionRow);
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
            const row = p.new as ParticipantRow;
            setParticipants((cur) => upsertBy(cur, row, (x) => x.user_id === row.user_id));
          },
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'answers', filter: `session_id=eq.${sessionId}` },
          (p) => {
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
            table: 'answer_keys',
            filter: `session_id=eq.${sessionId}`,
          },
          (p) => {
            if (p.eventType === 'DELETE') return;
            const row = p.new as { question_id: string; correct_option_ids: string[] };
            setKeys((cur) => ({ ...cur, [row.question_id]: row.correct_option_ids }));
          },
        );
    }

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') void loadAll();
    });
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [sessionId, asHost, loadAll]);

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
      if (data) setStates((cur) => ({ ...cur, [questionId]: data }));
    },
    [sessionId],
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
        const { error: err } = await getClient().rpc('set_position', {
          p_session: sessionId,
          p_index: index,
          p_step: step,
        });
        if (err) throw err;
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
        if (data) setKeys((cur) => ({ ...cur, [questionId]: data }));
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
      async endSession() {
        if (!sessionId) return;
        const { error: err } = await getClient().rpc('end_session', { p_session: sessionId });
        if (err) throw err;
      },
    }),
    [sessionId, questionAction],
  );

  return {
    loading,
    error,
    session,
    participants,
    states,
    keys,
    answers,
    mine,
    score,
    serverOffset,
    actions,
  };
}

export function useParticipantPresence(sessionId: string | undefined, enabled: boolean) {
  useEffect(() => {
    if (!sessionId || !enabled) return;
    const supabase = getClient();
    let last: boolean | null = null;
    const report = (force = false) => {
      const active = document.visibilityState === 'visible' && document.hasFocus();
      if (!force && active === last) return;
      last = active;
      void supabase.rpc('set_presence', { p_session: sessionId, p_active: active });
    };
    report(true);
    const heartbeat = window.setInterval(() => report(true), 20_000);
    const onChange = () => report();
    const onHide = () => {
      last = false;
      void supabase.rpc('set_presence', { p_session: sessionId, p_active: false });
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
