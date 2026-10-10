import { type HTMLAttributes, type ReactNode, useState } from 'react';
import { LanguageScope, type PollLanguage } from '../lib/locale-store';
import type { InteractiveQuestion } from '../lib/sdk';
import { useIsActivePage } from '../lib/step-context';
import { useLocale } from '../lib/use-locale';
import { answeredCount, expectedCount, formatClock } from './derive';
import { liveErrorMessage } from './errors';
import { useLive, useRegisterQuestion } from './live-context';
import { useLockHotkey } from './lock-hotkey';
import {
  ControlButton,
  Countdown,
  Footer,
  HostBar,
  Padlock,
  ProgressBar,
  rootStyle,
} from './question-chrome';
import { ACCENT, BAD, FONT } from './question-style';
import type { LiveData } from './use-live-session';

export type FrameMode = 'preview' | 'participant' | 'collecting' | 'results';

export type FrameCtx = {
  mode: FrameMode;
  /** A participant can still change their answer. */
  interactive: boolean;
  submitted: boolean;
  state: string;
  showMarks: boolean;
  data: LiveData | undefined;
  fail: (e: unknown) => void;
};

export type QuestionFrameProps = {
  question: InteractiveQuestion;
  /** Placement questions have a Submit button; text questions send from their own field. */
  needsSubmit?: boolean;
  /** Runs before Submit, for example to save a default order. */
  beforeSubmit?: () => Promise<void>;
  /** Interface language for this component. Defaults to the app language. */
  language?: PollLanguage;
  children: (ctx: FrameCtx) => ReactNode;
} & Omit<HTMLAttributes<HTMLDivElement>, 'children'>;

function FrameInner({
  question,
  needsSubmit,
  beforeSubmit,
  children,
  style,
  ...rest
}: Omit<QuestionFrameProps, 'language'>) {
  const live = useLive();
  const t = useLocale();
  useRegisterQuestion(question.id);
  const [failure, setFailure] = useState<string | null>(null);
  const onScreen = useIsActivePage();
  useLockHotkey(
    live?.data,
    question.id,
    Boolean(live) &&
      live?.view === 'screen' &&
      !live.mirror &&
      onScreen &&
      live.data.session?.status === 'active',
  );
  const fail = (e: unknown) => setFailure(liveErrorMessage(t, e));
  const run = (fn: () => Promise<unknown>) => {
    setFailure(null);
    fn().catch(fail);
  };
  const root = (body: ReactNode) => (
    <div {...rest} style={{ ...rootStyle, gap: 0, ...style }}>
      {body}
    </div>
  );
  const noop = () => {};

  if (!live) {
    return root(
      <>
        <div style={{ position: 'relative', flex: '1 1 0', minHeight: 0, containerType: 'size' }}>
          {children({
            mode: 'preview',
            interactive: false,
            submitted: false,
            state: 'open',
            showMarks: false,
            data: undefined,
            fail,
          })}
        </div>
        {import.meta.env.DEV ? (
          <div style={{ opacity: 0.45, pointerEvents: 'none' }}>
            <HostBar
              ghost
              remaining={null}
              progress={<ProgressBar answered={0} total={0} large />}
              onLock={noop}
              onAddTime={noop}
              onStop={noop}
            />
          </div>
        ) : (
          <Footer />
        )}
      </>,
    );
  }

  const { view, mirror, compact, data, now } = live;
  if (view === 'participant' && compact) return root(null);

  const st = data.states[question.id];
  const state = st?.state ?? 'locked';
  const isParticipant = view === 'participant';
  const controls = view === 'screen' && !mirror;
  const submitted = Boolean(data.mine[question.id]);
  const remaining = st?.ends_at ? new Date(st.ends_at).getTime() - now : null;
  const countdown =
    state === 'open' && remaining !== null && remaining > 0 ? formatClock(remaining) : null;
  const total = expectedCount(data.participants, data.answers, question.id, now);
  const answered = answeredCount(data.answers, question.id);
  const progress = <ProgressBar answered={answered} total={total} large={controls} />;

  const mode: FrameMode = isParticipant
    ? 'participant'
    : state === 'ended'
      ? 'results'
      : 'collecting';
  const ctx: FrameCtx = {
    mode,
    interactive: isParticipant && state === 'open' && !submitted,
    submitted,
    state,
    showMarks: Boolean(st?.show_results),
    data,
    fail,
  };

  const overlay =
    state === 'locked' ? (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4cqh',
          zIndex: 5,
          background: 'color-mix(in srgb, var(--osd-bg, #fff) 92%, transparent)',
        }}
      >
        <Padlock
          hint={
            controls
              ? t.live.clickToUnlock
              : isParticipant
                ? t.live.waitingForHostToOpen
                : t.live.locked
          }
          onClick={
            controls
              ? () => run(() => data.actions.questionAction(question.id, 'unlock'))
              : undefined
          }
        />
        {controls && (
          <ControlButton
            label={t.live.showAnswers}
            onClick={() =>
              run(async () => {
                await data.actions.questionAction(question.id, 'end');
                await data.actions.setShowResults(question.id, true);
              })
            }
          >
            {t.live.showAnswers}
          </ControlButton>
        )}
      </div>
    ) : null;

  const submit = () =>
    run(async () => {
      await beforeSubmit?.();
      await data.actions.submitPlacements(question.id);
    });

  let footer: ReactNode;
  if (isParticipant) {
    footer = (
      <Footer style={{ gap: 28 }}>
        {countdown && !submitted && <Countdown remaining={remaining} size={44} />}
        {needsSubmit && state === 'open' && !submitted && (
          <button
            type="button"
            onClick={submit}
            style={{
              padding: '14px 30px',
              fontSize: 30,
              fontFamily: FONT,
              fontWeight: 600,
              color: 'var(--osd-bg, #fff)',
              background: ACCENT,
              border: 0,
              borderRadius: 14,
              cursor: 'pointer',
            }}
          >
            {t.live.submitSorting}
          </button>
        )}
        {submitted && (
          <span style={{ fontSize: 30, opacity: 0.8 }}>✓ {t.live.submittedSorting}</span>
        )}
        {state === 'ended' && !submitted && (
          <span style={{ fontSize: 30, opacity: 0.7 }}>{t.live.answerPeriodEnded}</span>
        )}
      </Footer>
    );
  } else if (state === 'open') {
    footer = controls ? (
      <HostBar
        remaining={remaining}
        progress={progress}
        onLock={() => run(() => data.actions.questionAction(question.id, 'lock'))}
        onAddTime={(sec) => run(() => data.actions.questionAction(question.id, 'add_time', sec))}
        onStop={() => run(() => data.actions.questionAction(question.id, 'end'))}
      />
    ) : (
      <Footer style={{ gap: 28 }}>
        {countdown && <Countdown remaining={remaining} size={56} />}
        {progress}
      </Footer>
    );
  } else if (state === 'ended') {
    footer = (
      <Footer>
        {controls && !st?.show_results && (
          <ControlButton
            label={t.live.showResults}
            tone="accent"
            onClick={() => run(() => data.actions.setShowResults(question.id, true))}
          >
            {t.live.showResults}
          </ControlButton>
        )}
      </Footer>
    );
  } else {
    footer = <Footer />;
  }

  return root(
    <>
      <div style={{ position: 'relative', flex: '1 1 0', minHeight: 0, containerType: 'size' }}>
        {state !== 'locked' && children(ctx)}
        {overlay}
      </div>
      {footer}
      {failure && <div style={{ fontSize: 'min(30px, 4cqh)', color: BAD }}>{failure}</div>}
    </>,
  );
}

export function QuestionFrame({ language, ...props }: QuestionFrameProps) {
  return (
    <LanguageScope language={language}>
      <FrameInner {...props} data-poll-language={language ?? 'en'} />
    </LanguageScope>
  );
}
