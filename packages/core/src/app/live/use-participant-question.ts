import { useState } from 'react';
import type { MultipleChoiceQuestion } from '../lib/sdk';
import { useLocale } from '../lib/use-locale';
import { formatClock } from './derive';
import { liveErrorMessage } from './errors';
import { useLive } from './live-context';

export function useParticipantQuestion(question: MultipleChoiceQuestion) {
  const live = useLive();
  const t = useLocale();
  const [pending, setPending] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  if (!live) return null;

  const { data, now } = live;
  const st = data.states[question.id];
  const state = st?.state ?? 'locked';
  const mine = data.mine[question.id];
  const remaining = st?.ends_at ? new Date(st.ends_at).getTime() - now : null;

  const submit = (optionId: string) => {
    setPending(optionId);
    setFailure(null);
    data.actions
      .submitAnswer(question.id, optionId)
      .catch((e: unknown) => setFailure(liveErrorMessage(t, e)))
      .finally(() => setPending(null));
  };

  return {
    state,
    mine,
    chosen: question.options.find((o) => o.id === mine?.option_id),
    revealed: Boolean(mine?.show_results) && (data.session?.mode === 'self' || state === 'ended'),
    countdown:
      state === 'open' && remaining !== null && remaining > 0 ? formatClock(remaining) : null,
    score: data.score,
    pending,
    failure,
    submit,
  };
}
