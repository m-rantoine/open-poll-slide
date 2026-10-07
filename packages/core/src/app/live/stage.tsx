import { useCallback, useRef, useState } from 'react';
import type { StepAggregate } from '../lib/step-context';
import type { LiveData } from './use-live-session';

export function clampIndex(i: number, total: number): number {
  return Math.max(0, Math.min(Math.max(0, total - 1), i));
}

export function useHostNavigation(data: LiveData, total: number) {
  const session = data.session;
  const [stepCount, setStepCount] = useState(0);
  const onAggregate = useCallback((a: StepAggregate) => setStepCount(a.stepCount), []);

  const index = clampIndex(session?.current_index ?? 0, total);
  const step = session?.current_step ?? 0;
  const { setPosition } = data.actions;

  // Rapid key presses must build on the previous press, not on the last row
  // the server has echoed back.
  const positionRef = useRef({ index, step });
  positionRef.current = { index, step };
  const stepCountRef = useRef(stepCount);
  stepCountRef.current = stepCount;

  const move = useCallback(
    (nextIndex: number, nextStep: number) => {
      positionRef.current = { index: nextIndex, step: nextStep };
      void setPosition(nextIndex, nextStep).catch(() => {});
    },
    [setPosition],
  );

  const next = useCallback(() => {
    const cur = positionRef.current;
    if (cur.step < stepCountRef.current) move(cur.index, cur.step + 1);
    else if (cur.index < total - 1) move(cur.index + 1, 0);
  }, [move, total]);
  const prev = useCallback(() => {
    const cur = positionRef.current;
    if (cur.step > 0) move(cur.index, cur.step - 1);
    else if (cur.index > 0) move(cur.index - 1, 0);
  }, [move]);
  const goTo = useCallback((i: number) => move(clampIndex(i, total), 0), [move, total]);

  return { index, step, stepCount, next, prev, goTo, onAggregate };
}
