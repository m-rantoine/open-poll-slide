import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { hasModifier, isShortcutControlTarget, isTypingTarget } from '@/lib/keys';
import { useLocale } from '@/lib/use-locale';
import { liveErrorMessage } from './errors';
import type { QuestionStateRow } from './types';
import type { LiveData } from './use-live-session';

export function lockToggleAction(state: QuestionStateRow['state'] | undefined) {
  if (state === 'open') return 'lock';
  if (state === 'locked') return 'unlock';
  return null;
}

// Enter flips a question between locked and open. A stopped (ended) question is left alone.
export function useLockHotkey(
  data: LiveData | undefined,
  questionId: string | undefined,
  enabled: boolean,
) {
  const t = useLocale();
  const latest = useRef({ data, t });
  latest.current = { data, t };
  // Back-to-back presses must toggle from what the previous press asked for, not from the last
  // state the server echoed back.
  const requested = useRef<{
    state: 'open' | 'locked';
    from: QuestionStateRow['state'] | undefined;
    until: number;
  } | null>(null);

  useEffect(() => {
    if (!enabled || !questionId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.repeat || e.defaultPrevented || hasModifier(e)) return;
      if (isTypingTarget(e.target) || isShortcutControlTarget(e.target)) return;
      const { data: live, t: locale } = latest.current;
      if (!live) return;
      const actual = live.states[questionId]?.state;
      const pending = requested.current;
      // Trust the previous press only while the real state is still what it was or what it asked for.
      const followsPending =
        pending &&
        Date.now() < pending.until &&
        (actual === pending.from || actual === pending.state);
      const state = followsPending ? pending.state : actual;
      const action = lockToggleAction(state);
      if (!action) return;
      e.preventDefault();
      requested.current = {
        state: action === 'lock' ? 'locked' : 'open',
        from: state,
        until: Date.now() + 2500,
      };
      live.actions.questionAction(questionId, action).catch((err: unknown) => {
        requested.current = null;
        toast.error(liveErrorMessage(locale, err));
      });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled, questionId]);
}
