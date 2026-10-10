import { type FormEvent, type HTMLAttributes, type ReactNode, useRef, useState } from 'react';
import { LanguageScope, type PollLanguage } from '../lib/locale-store';
import type { WordCloudQuestion } from '../lib/sdk';
import { useIsActivePage } from '../lib/step-context';
import { format, useLocale } from '../lib/use-locale';
import { answeredCount, expectedCount, formatClock, wordCounts } from './derive';
import { liveErrorMessage } from './errors';
import { useLive, useRegisterQuestion } from './live-context';
import { useLockHotkey } from './lock-hotkey';
import {
  ControlButton,
  Countdown,
  Fit,
  Footer,
  HostBar,
  Padlock,
  ProgressBar,
  rootStyle,
  useShrinkToFit,
} from './question-chrome';
import { ACCENT, BAD, FONT, GOOD, INK } from './question-style';
import { useParticipantQuestion } from './use-participant-question';

const MAX_LENGTH = 60;

export function WordForm({
  maxLength,
  disabled,
  onSubmit,
  fontSize,
  padding,
}: {
  maxLength?: number;
  disabled: boolean;
  onSubmit: (text: string) => void;
  fontSize: string | number;
  padding: string;
}) {
  const t = useLocale();
  const [text, setText] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const clean = text.trim();
    if (clean) onSubmit(clean);
  };
  const field = {
    boxSizing: 'border-box' as const,
    width: '100%',
    padding,
    fontSize,
    fontFamily: FONT,
    color: INK,
    background: 'transparent',
    border: `0.1em solid color-mix(in srgb, ${INK} 22%, transparent)`,
    borderRadius: 'var(--osd-radius, 16px)',
  };
  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '0.6em' }}>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={Math.min(MAX_LENGTH, maxLength ?? MAX_LENGTH)}
        placeholder={t.live.wordPlaceholder}
        aria-label={t.live.wordPlaceholder}
        autoComplete="off"
        disabled={disabled}
        style={field}
      />
      <button
        type="submit"
        disabled={disabled || !text.trim()}
        style={{
          ...field,
          width: 'auto',
          alignSelf: 'flex-start',
          cursor: disabled || !text.trim() ? 'default' : 'pointer',
          opacity: disabled || !text.trim() ? 0.5 : 1,
          color: 'var(--osd-bg, #fff)',
          background: ACCENT,
          border: 0,
          fontWeight: 600,
        }}
      >
        {t.live.sendWord}
      </button>
    </form>
  );
}

function Cloud({
  words,
  showMarks,
  onMark,
}: {
  words: ReturnType<typeof wordCounts>;
  showMarks: boolean;
  onMark?: (key: string, next: 'correct' | 'incorrect' | 'clear') => void;
}) {
  const t = useLocale();
  const ref = useRef<HTMLDivElement>(null);
  useShrinkToFit(ref, 'parent');
  const max = Math.max(1, ...words.map((w) => w.count));
  return (
    <div
      ref={ref}
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.15em 0.5em',
        width: '100%',
        fontSize: 'calc(min(110px, 16cqh) * var(--osd-fit, 1))',
        lineHeight: 1.1,
      }}
    >
      {words.length === 0 && (
        <span style={{ fontSize: '0.4em', opacity: 0.6 }}>{t.live.noAnswersYet}</span>
      )}
      {words.map((w, i) => {
        const mark = showMarks ? w.mark : null;
        const next = w.mark === null ? 'correct' : w.mark === 'correct' ? 'incorrect' : 'clear';
        return (
          <button
            key={w.key}
            type="button"
            disabled={!onMark}
            title={onMark ? t.live.toggleCorrect : undefined}
            onClick={() => onMark?.(w.key, next)}
            style={{
              fontSize: `${0.35 + 0.65 * (w.count / max)}em`,
              fontFamily: FONT,
              fontWeight: 700,
              padding: 0,
              border: 0,
              background: 'transparent',
              cursor: onMark ? 'pointer' : 'default',
              color:
                mark === 'correct' ? GOOD : mark === 'incorrect' ? BAD : i === 0 ? ACCENT : INK,
              textDecoration: mark === 'incorrect' ? 'line-through' : 'none',
              opacity: mark === 'incorrect' ? 0.7 : 1,
            }}
          >
            {w.text}
          </button>
        );
      })}
    </div>
  );
}

export type WordCloudProps = {
  question: WordCloudQuestion;
  /** Interface language for this component. Defaults to the app language. */
  language?: PollLanguage;
} & Omit<HTMLAttributes<HTMLDivElement>, 'children'>;

function WordCloudInner({ question, style, ...rest }: WordCloudProps) {
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

  const noop = () => {};
  const root = (children: ReactNode) => (
    <div {...rest} style={{ ...rootStyle, ...style }}>
      {children}
    </div>
  );

  if (!live) {
    return root(
      <>
        <Fit style={{ justifyContent: 'center' }}>
          <WordForm disabled onSubmit={noop} fontSize="min(44px, 7cqh)" padding="0.5em 0.8em" />
        </Fit>
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
  const st = data.states[question.id];
  const state = st?.state ?? 'locked';
  const remaining = st?.ends_at ? new Date(st.ends_at).getTime() - now : null;
  const countdown =
    state === 'open' && remaining !== null && remaining > 0 ? formatClock(remaining) : null;
  const run = (fn: () => Promise<unknown>) => {
    setFailure(null);
    fn().catch((e: unknown) => setFailure(liveErrorMessage(t, e)));
  };

  if (view === 'participant' && compact) return root(null);

  if (view === 'participant' && participant) {
    const { mine, revealed, score, pending, submitText } = participant;
    let body: ReactNode;
    if (mine) {
      body = (
        <Fit>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3cqh' }}>
            <div style={{ fontSize: 'min(44px, 7cqh)' }}>
              {t.live.thanksForAnswer}
              <div style={{ opacity: 0.7, marginTop: '1.5cqh' }}>
                {t.live.youWrote} <strong>{mine.answer_text ?? mine.option_id}</strong>
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
      body = (
        <Fit style={{ justifyContent: 'center' }}>
          <WordForm
            maxLength={question.maxLength}
            disabled={pending !== null}
            onSubmit={submitText}
            fontSize="min(44px, 7cqh)"
            padding="0.5em 0.8em"
          />
        </Fit>
      );
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
  const words = wordCounts(
    data.answers,
    question.id,
    data.keys[question.id],
    data.incorrect[question.id],
  );
  const progress = <ProgressBar answered={answered} total={total} large={controls} />;

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
        <Fit style={{ alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: 'min(56px, 9cqh)', opacity: 0.7 }}>
            {t.live.collectingAnswers}
          </div>
        </Fit>
        {controls ? (
          <HostBar
            remaining={remaining}
            progress={progress}
            onLock={() => run(() => data.actions.questionAction(question.id, 'lock'))}
            onAddTime={(sec) =>
              run(() => data.actions.questionAction(question.id, 'add_time', sec))
            }
            onStop={() => run(() => data.actions.questionAction(question.id, 'end'))}
          />
        ) : (
          <Footer style={{ gap: 28 }}>
            {countdown && <Countdown remaining={remaining} size={56} />}
            {progress}
          </Footer>
        )}
      </>
    );
  } else {
    body = (
      <>
        <Fit style={{ alignItems: 'center', justifyContent: 'center' }}>
          <Cloud
            words={words}
            showMarks={Boolean(st?.show_results)}
            onMark={
              controls
                ? (key, next) => run(() => data.actions.markAnswer(question.id, key, next))
                : undefined
            }
          />
        </Fit>
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
      </>
    );
  }

  return root(
    <>
      {body}
      {failure && <div style={{ fontSize: 'min(30px, 4cqh)', color: BAD }}>{failure}</div>}
    </>,
  );
}

export function WordCloud({ language, ...props }: WordCloudProps) {
  return (
    <LanguageScope language={language}>
      <WordCloudInner {...props} data-poll-language={language ?? 'en'} />
    </LanguageScope>
  );
}
