import { type ReactNode, useCallback, useMemo, useRef, useState } from 'react';
import type { InteractiveQuestion } from '../lib/sdk';
import { useLocale } from '../lib/use-locale';
import { getClient, liveConfigured } from './client';
import { normalizeAnswer } from './derive';
import { errorText } from './errors';
import { LiveProvider } from './live-context';
import type { MyAnswer, MyPlacement, MyScore, QuestionStateRow, SessionRow } from './types';
import type { LiveActions, LiveData } from './use-live-session';

type Check = { correct?: unknown; total?: unknown; items?: unknown };

const PRACTICE_SESSION: SessionRow = {
  code: '',
  created_at: '',
  current_index: 0,
  current_step: 0,
  deck_id: '',
  deck_title: null,
  ended_at: null,
  host_id: '',
  id: 'practice',
  mode: 'self',
  page_count: 0,
  paused_at: null,
  questions: {},
  site: null,
  status: 'active',
};

const SCORED_BY_DEFAULT = new Set([
  'multiple_choice',
  'drag_drop',
  'association',
  'ranking',
  'number',
]);

function isScored(q: InteractiveQuestion): boolean {
  if (q.scored !== undefined) return q.scored;
  const hasKey = q.hasKey || ('correct' in q && q.correct !== undefined);
  return SCORED_BY_DEFAULT.has(q.type) || (q.type === 'word_cloud' && Boolean(hasKey));
}

const noop = async () => {};

function usePracticeData(deckId: string, questions: Record<string, InteractiveQuestion>): LiveData {
  const t = useLocale();
  const [mine, setMine] = useState<Record<string, MyAnswer>>({});
  const [myPlacements, setMyPlacements] = useState<Record<string, MyPlacement[]>>({});
  const [units, setUnits] = useState<Record<string, { correct: number; graded: number }>>({});
  const placementsRef = useRef(myPlacements);
  placementsRef.current = myPlacements;

  const check = useCallback(
    async (questionId: string, value: Record<string, unknown>): Promise<Check | null> => {
      const q = questions[questionId];
      if (!q || !isScored(q)) return null;
      const { data, error } = await getClient().rpc('check_answer', {
        p_deck: deckId,
        p_question: questionId,
        p_type: q.type,
        // biome-ignore lint/suspicious/noExplicitAny: arbitrary JSON payload
        p_value: value as any,
      });
      if (error) {
        const text = errorText(error);
        if (text === 'no_answer_key') return null;
        throw new Error(text === 'not_signed_in' ? t.live.practiceSignIn : text);
      }
      return data as Check;
    },
    [deckId, questions, t],
  );

  const actions = useMemo<LiveActions>(() => {
    const record = (questionId: string, answer: MyAnswer, graded: number, correct: number) => {
      setMine((cur) => ({ ...cur, [questionId]: answer }));
      setUnits((cur) => ({ ...cur, [questionId]: { correct, graded } }));
    };
    const single = async (
      questionId: string,
      optionId: string,
      value: Record<string, unknown>,
      answerText?: string,
    ) => {
      const result = await check(questionId, value);
      const isCorrect = result ? result.correct === true : null;
      const answer: MyAnswer = {
        option_id: optionId,
        is_correct: isCorrect,
        show_results: true,
        ...(answerText !== undefined && { answer_text: answerText }),
      };
      record(questionId, answer, isCorrect === null ? 0 : 1, isCorrect ? 1 : 0);
      return answer;
    };
    return {
      setPosition: noop,
      questionAction: noop,
      setShowResults: noop,
      toggleCorrect: noop,
      markAnswer: noop,
      setScored: noop,
      endSession: noop,
      pauseSession: noop,
      resumeSession: noop,
      setMode: noop,
      submitAnswer: (questionId, optionId) => single(questionId, optionId, { option: optionId }),
      async submitTextAnswer(questionId, text) {
        const clean = text.trim();
        const q = questions[questionId];
        if (q?.type === 'number') {
          return single(questionId, clean, { text: clean, tolerance: q.tolerance ?? 0 }, clean);
        }
        return single(questionId, normalizeAnswer(clean), { text: clean }, clean);
      },
      async placeTile(questionId, itemId, zoneId, options) {
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
      },
      async setPlacements(questionId, values) {
        setMyPlacements((cur) => ({
          ...cur,
          [questionId]: Object.entries(values).map(([item_id, zone_id]) => ({
            item_id,
            zone_id,
            is_correct: null,
          })),
        }));
      },
      async submitPlacements(questionId) {
        const placed = placementsRef.current[questionId] ?? [];
        const result = await check(questionId, {
          values: Object.fromEntries(placed.map((p) => [p.item_id, p.zone_id])),
        });
        const answer: MyAnswer = { option_id: 'submitted', is_correct: null, show_results: true };
        if (result && typeof result.items === 'object' && result.items) {
          const items = result.items as Record<string, boolean>;
          const correct = Number(result.correct);
          const total = Number(result.total);
          answer.points = { correct, total };
          setMyPlacements((cur) => ({
            ...cur,
            [questionId]: (cur[questionId] ?? []).map((p) => ({
              ...p,
              is_correct: items[p.item_id] ?? false,
            })),
          }));
          record(questionId, answer, total, correct);
        } else {
          record(questionId, answer, 0, 0);
        }
      },
    };
  }, [check, questions]);

  const states = useMemo(() => {
    const out: Record<string, QuestionStateRow> = {};
    for (const [id, q] of Object.entries(questions)) {
      out[id] = {
        ends_at: null,
        key_version: 0,
        paused_remaining_ms: null,
        question_id: id,
        scored: isScored(q),
        session_id: PRACTICE_SESSION.id,
        show_results: true,
        state: 'open',
      };
    }
    return out;
  }, [questions]);

  const score = useMemo<MyScore | null>(() => {
    let correct = 0;
    let graded = 0;
    for (const u of Object.values(units)) {
      correct += u.correct;
      graded += u.graded;
    }
    return graded > 0 ? { correct, graded, class_average: null } : null;
  }, [units]);

  return useMemo(
    () => ({
      loading: false,
      error: null,
      session: PRACTICE_SESSION,
      participants: [],
      states,
      keys: {},
      incorrect: {},
      answers: [],
      placements: [],
      myPlacements,
      mine,
      score,
      selfIndex: null,
      serverOffset: 0,
      actions,
    }),
    [states, myPlacements, mine, score, actions],
  );
}

function Session({
  deckId,
  questions,
  children,
}: {
  deckId: string;
  questions: Record<string, InteractiveQuestion>;
  children: ReactNode;
}) {
  const data = usePracticeData(deckId, questions);
  return (
    <LiveProvider view="participant" practice data={data} deckId={deckId}>
      {children}
    </LiveProvider>
  );
}

export function PracticeProvider({
  deckId,
  questions,
  children,
}: {
  deckId?: string;
  questions?: Record<string, InteractiveQuestion>;
  children: ReactNode;
}) {
  if (!liveConfigured || !deckId || !questions || Object.keys(questions).length === 0) {
    return children;
  }
  return (
    <Session deckId={deckId} questions={questions}>
      {children}
    </Session>
  );
}
