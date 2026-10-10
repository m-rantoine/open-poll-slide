import { type CSSProperties, type HTMLAttributes, type ReactNode, useRef, useState } from 'react';
import { LanguageScope, type PollLanguage } from '../lib/locale-store';
import type { MultipleChoiceQuestion } from '../lib/sdk';
import { useIsActivePage } from '../lib/step-context';
import { format, useLocale } from '../lib/use-locale';
import { answeredCount, expectedCount, formatClock, optionCounts } from './derive';
import { liveErrorMessage } from './errors';
import { useLive, useRegisterQuestion } from './live-context';
import { useLockHotkey } from './lock-hotkey';
import {
  ControlButton,
  Countdown,
  Fit,
  FitBox,
  Footer,
  HostBar,
  Padlock,
  ProgressBar,
  rootStyle,
  rowFont,
  useShrinkToFit,
} from './question-chrome';
import { ACCENT, BAD, FONT, GOOD, INK } from './question-style';
import { useParticipantQuestion } from './use-participant-question';

function optionStyle(n: number, extra?: CSSProperties): CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6em',
    width: '100%',
    boxSizing: 'border-box',
    padding: '0.6em 1em',
    fontSize: rowFont(n, 40),
    lineHeight: 1.2,
    minHeight: 0,
    overflow: 'hidden',
    fontFamily: FONT,
    textAlign: 'left',
    color: INK,
    background: 'transparent',
    border: `0.1em solid color-mix(in srgb, ${INK} 22%, transparent)`,
    borderRadius: 'var(--osd-radius, 20px)',
    cursor: 'default',
    ...extra,
  };
}

function ResultsChart({
  question,
  counts,
  correct,
  total,
  onToggle,
  toggleLabel,
}: {
  question: MultipleChoiceQuestion;
  counts: Record<string, number>;
  correct: string[];
  total: number;
  onToggle?: (optionId: string) => void;
  toggleLabel: string;
}) {
  const max = Math.max(1, ...Object.values(counts));
  const ref = useRef<HTMLDivElement>(null);
  useShrinkToFit(ref, 'parent');
  return (
    <div
      ref={ref}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '2cqh',
        width: '100%',
        fontSize: rowFont(question.options.length, 36),
      }}
    >
      {question.options.map((o) => {
        const n = counts[o.id] ?? 0;
        const isCorrect = correct.includes(o.id);
        return (
          <button
            key={o.id}
            type="button"
            disabled={!onToggle}
            title={onToggle ? toggleLabel : undefined}
            aria-pressed={onToggle ? isCorrect : undefined}
            onClick={() => onToggle?.(o.id)}
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 30%) minmax(0, 1fr) 3.5em',
              alignItems: 'center',
              gap: '0.8em',
              padding: 0,
              background: 'transparent',
              border: 0,
              fontFamily: FONT,
              fontSize: 'inherit',
              lineHeight: 1.2,
              color: INK,
              textAlign: 'left',
              cursor: onToggle ? 'pointer' : 'default',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ color: GOOD, width: '1.1em', fontSize: '1.2em', fontWeight: 700 }}>
                {isCorrect ? '✓' : ''}
              </span>
              {o.label}
            </span>
            <span
              style={{
                height: '1.5em',
                borderRadius: 12,
                background: `color-mix(in srgb, ${INK} 8%, transparent)`,
                overflow: 'hidden',
              }}
            >
              <span
                style={{
                  display: 'block',
                  height: '100%',
                  width: `${(n / max) * 100}%`,
                  background: isCorrect ? GOOD : ACCENT,
                  transition: 'width 300ms ease',
                }}
              />
            </span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>
              {n}
              <span style={{ opacity: 0.5, fontSize: '0.8em' }}>
                {total > 0 ? ` · ${Math.round((n / total) * 100)}%` : ''}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export type MultipleChoiceProps = {
  question: MultipleChoiceQuestion;
  /** Number of option columns. Default 1. */
  columns?: number;
  /** Interface language for this component. Defaults to the app language. */
  language?: PollLanguage;
} & Omit<HTMLAttributes<HTMLDivElement>, 'children'>;

function MultipleChoiceInner({ question, columns, style, ...rest }: MultipleChoiceProps) {
  const live = useLive();
  const t = useLocale();
  useRegisterQuestion(question.id);
  const participant = useParticipantQuestion(question);
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

  const cols = Math.max(1, Math.min(6, Math.round(columns ?? 1)));
  const rows = Math.ceil(question.options.length / cols);
  const n = rows;
  const noop = () => {};
  const progress = (answered: number, total: number, controls: boolean) => (
    <ProgressBar answered={answered} total={total} large={controls} />
  );
  const root = (children: ReactNode) => (
    <div {...rest} data-quiz-columns={cols} style={{ ...rootStyle, ...style }}>
      {children}
    </div>
  );
  const optionList = (children: (o: MultipleChoiceQuestion['options'][number]) => ReactNode) => (
    <Fit>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
          gap: '2cqh 2cqw',
          height: '100%',
          minHeight: 0,
        }}
      >
        {question.options.map(children)}
      </div>
    </Fit>
  );

  if (!live) {
    return root(
      <>
        {optionList((o) => (
          <FitBox key={o.id} style={optionStyle(n)}>
            {o.label}
          </FitBox>
        ))}
        {import.meta.env.DEV ? (
          <div style={{ opacity: 0.45, pointerEvents: 'none' }}>
            <HostBar
              ghost
              remaining={null}
              progress={progress(0, 0, true)}
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
  const st = data.states[question.id];
  const state = st?.state ?? 'locked';
  const remaining = st?.ends_at ? new Date(st.ends_at).getTime() - now : null;
  const countdown =
    state === 'open' && remaining !== null && remaining > 0 ? formatClock(remaining) : null;
  const run = (fn: () => Promise<unknown>) => {
    setFailure(null);
    fn().catch((e: unknown) => setFailure(liveErrorMessage(t, e)));
  };

  if (view === 'participant' && compact) {
    return root(null);
  }

  if (view === 'participant' && participant) {
    const { mine, chosen, revealed, score, pending, submit } = participant;
    let body: ReactNode;
    if (mine) {
      body = (
        <Fit>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3cqh' }}>
            <div style={{ fontSize: 'min(44px, 7cqh)' }}>
              {t.live.thanksForAnswer}
              <div style={{ opacity: 0.7, marginTop: '1.5cqh' }}>
                {t.live.youChose} <strong>{chosen?.label ?? mine.option_id}</strong>
              </div>
            </div>
            {revealed && mine.is_correct !== null && (
              <div
                style={{
                  fontSize: 'min(64px, 10cqh)',
                  fontWeight: 700,
                  color: mine.is_correct ? GOOD : BAD,
                }}
              >
                {mine.is_correct ? t.live.correct : t.live.notQuite}
                {score && score.graded > 0 && (
                  <span
                    style={{ fontSize: '0.62em', color: INK, opacity: 0.7, marginLeft: '0.5em' }}
                  >
                    {format(t.live.score, { correct: score.correct, graded: score.graded })}
                  </span>
                )}
              </div>
            )}
          </div>
        </Fit>
      );
    } else if (state === 'locked') {
      body = (
        <Fit style={{ alignItems: 'center', justifyContent: 'center' }}>
          <Padlock hint={t.live.waitingForHostToOpen} />
        </Fit>
      );
    } else if (state === 'ended') {
      body = (
        <Fit>
          <div style={{ fontSize: 'min(48px, 8cqh)', opacity: 0.7 }}>
            {t.live.answerPeriodEnded}
          </div>
        </Fit>
      );
    } else {
      body = optionList((o) => (
        <FitBox
          as="button"
          key={o.id}
          type="button"
          disabled={pending !== null}
          onClick={() => submit(o.id)}
          style={optionStyle(n, {
            cursor: 'pointer',
            opacity: pending && pending !== o.id ? 0.5 : 1,
          })}
        >
          {o.label}
        </FitBox>
      ));
    }
    return root(
      <>
        {countdown && !mine && (
          <div style={{ fontSize: 'min(44px, 6cqh)', fontVariantNumeric: 'tabular-nums' }}>
            ⏱ {countdown}
          </div>
        )}
        {body}
        {participant.failure && (
          <div style={{ fontSize: 'min(30px, 4cqh)', color: BAD }}>{participant.failure}</div>
        )}
      </>,
    );
  }

  const controls = view === 'screen' && !mirror;
  const total = expectedCount(data.participants, data.answers, question.id, now);
  const answered = answeredCount(data.answers, question.id);
  const counts = optionCounts(data.answers, question.id);
  const correct = data.keys[question.id] ?? [];
  const toggle = controls
    ? (id: string) => run(() => data.actions.toggleCorrect(question.id, id))
    : undefined;

  let body: ReactNode;
  if (state === 'locked') {
    body = (
      <Fit style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4cqh' }}
        >
          <Padlock
            hint={controls ? t.live.clickToUnlock : t.live.locked}
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
      </Fit>
    );
  } else if (state === 'open') {
    body = (
      <>
        {optionList((o) => (
          <FitBox key={o.id} style={optionStyle(n)}>
            {o.label}
          </FitBox>
        ))}
        {controls ? (
          <HostBar
            remaining={remaining}
            progress={progress(answered, total, true)}
            onLock={() => run(() => data.actions.questionAction(question.id, 'lock'))}
            onAddTime={(sec) =>
              run(() => data.actions.questionAction(question.id, 'add_time', sec))
            }
            onStop={() => run(() => data.actions.questionAction(question.id, 'end'))}
          />
        ) : (
          <Footer style={{ gap: 28 }}>
            {countdown && <Countdown remaining={remaining} size={56} />}
            {progress(answered, total, false)}
          </Footer>
        )}
      </>
    );
  } else if (st?.show_results) {
    body = (
      <Fit>
        <ResultsChart
          question={question}
          counts={counts}
          correct={correct}
          total={answered}
          onToggle={toggle}
          toggleLabel={t.live.toggleCorrect}
        />
      </Fit>
    );
  } else {
    body = (
      <Fit style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4cqh' }}
        >
          <div style={{ fontSize: 'min(48px, 8cqh)', opacity: 0.7 }}>
            {format(t.live.answersClosed, { answered, total })}
          </div>
          {controls && (
            <ControlButton
              label={t.live.showResults}
              tone="accent"
              onClick={() => run(() => data.actions.setShowResults(question.id, true))}
            >
              {t.live.showResults}
            </ControlButton>
          )}
        </div>
      </Fit>
    );
  }

  return root(
    <>
      {body}
      {failure && <div style={{ fontSize: 'min(30px, 4cqh)', color: BAD }}>{failure}</div>}
    </>,
  );
}

export function MultipleChoice({ language, ...props }: MultipleChoiceProps) {
  return (
    <LanguageScope language={language}>
      <MultipleChoiceInner {...props} data-poll-language={language ?? 'en'} />
    </LanguageScope>
  );
}
