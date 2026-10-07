import { type MutableRefObject, type ReactNode, useCallback, useRef, useState } from 'react';
import { SlideCanvas } from '../components/slide-canvas';
import { SlidePageProvider } from '../lib/page-context';
import type { SlideModule } from '../lib/sdk';
import { type StepAggregate, type StepController, StepHost } from '../lib/step-context';
import type { LiveData } from './use-live-session';

export function LiveStage({
  slide,
  index,
  step,
  active = true,
  controllerRef,
  onAggregate,
  freezeMotion,
  wrap,
}: {
  slide: SlideModule;
  index: number;
  /** Controlled step count; leave undefined to let the controller drive reveals. */
  step?: number;
  active?: boolean;
  controllerRef: MutableRefObject<StepController | null>;
  onAggregate?: (a: StepAggregate) => void;
  freezeMotion?: boolean;
  wrap?: (children: ReactNode) => ReactNode;
}) {
  const pages = slide.default;
  const Page = pages[index];
  if (!Page) return null;
  const inner = (
    <SlidePageProvider index={index} total={pages.length}>
      <StepHost
        key={index}
        isActivePage={active}
        entryDirection="jump"
        controllerRef={controllerRef}
        controlledRevealed={step}
        onAggregateChange={onAggregate}
      >
        <Page />
      </StepHost>
    </SlidePageProvider>
  );
  return (
    <SlideCanvas flat design={slide.design} freezeMotion={freezeMotion}>
      {wrap ? wrap(inner) : inner}
    </SlideCanvas>
  );
}

export function clampIndex(i: number, total: number): number {
  return Math.max(0, Math.min(Math.max(0, total - 1), i));
}

export function useHostNavigation(data: LiveData, total: number) {
  const session = data.session;
  const [stepCount, setStepCount] = useState(0);
  const controllerRef = useRef<StepController | null>(null);
  const onAggregate = useCallback((a: StepAggregate) => setStepCount(a.stepCount), []);

  const index = clampIndex(session?.current_index ?? 0, total);
  const step = session?.current_step ?? 0;
  const { setPosition } = data.actions;

  const next = useCallback(() => {
    if (step < stepCount) void setPosition(index, step + 1);
    else if (index < total - 1) void setPosition(index + 1, 0);
  }, [step, stepCount, index, total, setPosition]);
  const prev = useCallback(() => {
    if (step > 0) void setPosition(index, step - 1);
    else if (index > 0) void setPosition(index - 1, 0);
  }, [step, index, setPosition]);
  const goTo = useCallback(
    (i: number) => void setPosition(clampIndex(i, total), 0),
    [setPosition, total],
  );

  return { index, step, stepCount, next, prev, goTo, controllerRef, onAggregate };
}
