import { Lock, LockOpen, Square } from 'lucide-react';
import { type CSSProperties, type ReactNode, useState } from 'react';
import type { MultipleChoiceQuestion } from '../lib/sdk';
import { answeredCount, optionCounts } from './derive';
import { useLive, useRegisterQuestion } from './live-context';

const INK = 'var(--osd-text, #0f172a)';
const BG = 'var(--osd-bg, #ffffff)';
const ACCENT = 'var(--osd-accent, #2563eb)';
const GOOD = '#16a34a';
const BAD = '#dc2626';
const FONT = 'var(--osd-font-body, system-ui, sans-serif)';
const DISPLAY = 'var(--osd-font-display, var(--osd-font-body, system-ui, sans-serif))';

const frame: CSSProperties = {
  width: '100%',
  height: '100%',
  boxSizing: 'border-box',
  padding: '96px 128px',
  display: 'flex',
  flexDirection: 'column',
  gap: 48,
  background: BG,
  color: INK,
  fontFamily: FONT,
};

function optionStyle(extra?: CSSProperties): CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 24,
    width: '100%',
    boxSizing: 'border-box',
    padding: '28px 40px',
    fontSize: 40,
    fontFamily: FONT,
    textAlign: 'left',
    color: INK,
    background: 'transparent',
    border: `4px solid color-mix(in srgb, ${INK} 22%, transparent)`,
    borderRadius: 'var(--osd-radius, 20px)',
    cursor: 'default',
    ...extra,
  };
}

function ControlButton({
  children,
  onClick,
  label,
  tone = 'ink',
}: {
  children: ReactNode;
  onClick: () => void;
  label: string;
  tone?: 'ink' | 'accent' | 'danger';
}) {
  const bg = tone === 'accent' ? ACCENT : tone === 'danger' ? BAD : INK;
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 12,
        padding: '16px 28px',
        fontSize: 30,
        fontFamily: FONT,
        fontWeight: 600,
        color: BG,
        background: bg,
        border: 0,
        borderRadius: 14,
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}

function formatClock(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function Padlock({ onClick, hint }: { onClick?: () => void; hint: string }) {
  const content = (
    <>
      <Lock size={260} strokeWidth={1.5} />
      <span style={{ fontSize: 40, opacity: 0.7 }}>{hint}</span>
    </>
  );
  const style: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 32,
    color: INK,
    background: 'transparent',
    border: 0,
    fontFamily: FONT,
  };
  return onClick ? (
    <button type="button" onClick={onClick} style={{ ...style, cursor: 'pointer' }}>
      {content}
    </button>
  ) : (
    <div style={style}>{content}</div>
  );
}

function ResultsChart({
  question,
  counts,
  correct,
  total,
  onToggle,
}: {
  question: MultipleChoiceQuestion;
  counts: Record<string, number>;
  correct: string[];
  total: number;
  onToggle?: (optionId: string) => void;
}) {
  const max = Math.max(1, ...Object.values(counts));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, width: '100%' }}>
      {question.options.map((o) => {
        const n = counts[o.id] ?? 0;
        const isCorrect = correct.includes(o.id);
        return (
          <button
            key={o.id}
            type="button"
            disabled={!onToggle}
            onClick={() => onToggle?.(o.id)}
            style={{
              display: 'grid',
              gridTemplateColumns: '560px 1fr 120px',
              alignItems: 'center',
              gap: 28,
              padding: 0,
              background: 'transparent',
              border: 0,
              fontFamily: FONT,
              fontSize: 36,
              color: INK,
              textAlign: 'left',
              cursor: onToggle ? 'pointer' : 'default',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ color: GOOD, width: 40, fontSize: 44, fontWeight: 700 }}>
                {isCorrect ? '✓' : ''}
              </span>
              {o.label}
            </span>
            <span
              style={{
                height: 56,
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
              <span style={{ opacity: 0.5, fontSize: 28 }}>
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
};

export function MultipleChoice({ question }: MultipleChoiceProps) {
  const live = useLive();
  useRegisterQuestion(question.id);
  const [pending, setPending] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const heading = (
    <h2
      style={{
        margin: 0,
        fontFamily: DISPLAY,
        fontSize: 72,
        lineHeight: 1.1,
        fontWeight: 700,
        letterSpacing: '-0.01em',
      }}
    >
      {question.question}
    </h2>
  );

  if (!live) {
    return (
      <div style={frame}>
        {heading}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {question.options.map((o) => (
            <button key={o.id} type="button" tabIndex={-1} style={optionStyle()}>
              {o.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const { view, mirror, data, now } = live;
  const st = data.states[question.id];
  const state = st?.state ?? 'locked';
  const isSelf = data.session?.mode === 'self';
  const remaining = st?.ends_at ? new Date(st.ends_at).getTime() - now : null;
  const countdown =
    state === 'open' && remaining !== null && remaining > 0 ? formatClock(remaining) : null;
  const run = (fn: () => Promise<unknown>) => {
    setFailure(null);
    fn().catch((e: Error) => setFailure(e.message));
  };

  if (view === 'participant') {
    const mine = data.mine[question.id];
    const revealed = Boolean(mine?.show_results) && (isSelf || state === 'ended');
    const chosen = question.options.find((o) => o.id === mine?.option_id);
    let body: ReactNode;
    if (mine) {
      body = (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          <div style={{ fontSize: 44 }}>
            Thanks for your answer!
            <div style={{ opacity: 0.7, marginTop: 12 }}>
              You chose: <strong>{chosen?.label ?? mine.option_id}</strong>
            </div>
          </div>
          {revealed && mine.is_correct !== null && (
            <div
              style={{
                fontSize: 64,
                fontWeight: 700,
                color: mine.is_correct ? GOOD : BAD,
              }}
            >
              {mine.is_correct ? '✓ Correct' : '✗ Not quite'}
              {data.score && data.score.graded > 0 && (
                <span style={{ fontSize: 40, color: INK, opacity: 0.7, marginLeft: 32 }}>
                  Score {data.score.correct}/{data.score.graded}
                </span>
              )}
            </div>
          )}
        </div>
      );
    } else if (state === 'locked') {
      body = <Padlock hint="Waiting for your host to open this question" />;
    } else if (state === 'ended') {
      body = <div style={{ fontSize: 48, opacity: 0.7 }}>The answer period has ended.</div>;
    } else {
      body = (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {question.options.map((o) => (
            <button
              key={o.id}
              type="button"
              disabled={pending !== null}
              onClick={() => {
                setPending(o.id);
                run(() =>
                  data.actions.submitAnswer(question.id, o.id).finally(() => setPending(null)),
                );
              }}
              style={optionStyle({
                cursor: 'pointer',
                opacity: pending && pending !== o.id ? 0.5 : 1,
              })}
            >
              {o.label}
            </button>
          ))}
        </div>
      );
    }
    return (
      <div style={frame}>
        {heading}
        {countdown && !mine && (
          <div style={{ fontSize: 44, fontVariantNumeric: 'tabular-nums' }}>⏱ {countdown}</div>
        )}
        {body}
        {failure && <div style={{ fontSize: 30, color: BAD }}>{failure}</div>}
      </div>
    );
  }

  const controls = view === 'screen' && !mirror;
  const total = data.participants.length;
  const answered = answeredCount(data.answers, question.id);
  const counts = optionCounts(data.answers, question.id);
  const correct = data.keys[question.id] ?? [];
  const toggle =
    controls && correct.length === 0
      ? (id: string) => run(() => data.actions.toggleCorrect(question.id, id))
      : undefined;

  let body: ReactNode;
  if (state === 'locked') {
    body = (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 40 }}>
        <Padlock
          hint={controls ? 'Click to let participants answer' : 'Locked'}
          onClick={
            controls
              ? () => run(() => data.actions.questionAction(question.id, 'unlock'))
              : undefined
          }
        />
        {controls && (
          <ControlButton
            label="Show answers"
            onClick={() =>
              run(async () => {
                await data.actions.questionAction(question.id, 'end');
                await data.actions.setShowResults(question.id, true);
              })
            }
          >
            Show answers
          </ControlButton>
        )}
      </div>
    );
  } else if (state === 'open') {
    body = (
      <>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {question.options.map((o) => (
            <div key={o.id} style={optionStyle()}>
              {o.label}
            </div>
          ))}
        </div>
        {controls && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <ControlButton
              label="Lock question"
              onClick={() => run(() => data.actions.questionAction(question.id, 'lock'))}
            >
              <LockOpen size={32} />
            </ControlButton>
            {[15, 30, 60].map((s) => (
              <ControlButton
                key={s}
                label={`Add ${s} seconds`}
                tone="accent"
                onClick={() => run(() => data.actions.questionAction(question.id, 'add_time', s))}
              >
                +{s}s
              </ControlButton>
            ))}
            {countdown && (
              <span style={{ fontSize: 56, fontVariantNumeric: 'tabular-nums', marginLeft: 16 }}>
                {countdown}
              </span>
            )}
          </div>
        )}
        {countdown && !controls && (
          <div style={{ fontSize: 56, fontVariantNumeric: 'tabular-nums' }}>{countdown}</div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 28, marginTop: 'auto' }}>
          <div
            style={{
              flex: 1,
              height: 40,
              borderRadius: 20,
              overflow: 'hidden',
              background: `color-mix(in srgb, ${INK} 10%, transparent)`,
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${total > 0 ? Math.min(100, (answered / total) * 100) : 0}%`,
                background: ACCENT,
                transition: 'width 300ms ease',
              }}
            />
          </div>
          <span style={{ fontSize: 36, fontVariantNumeric: 'tabular-nums' }}>
            {answered} / {total}
          </span>
          {controls && (
            <ControlButton
              label="Stop answering"
              tone="danger"
              onClick={() => run(() => data.actions.questionAction(question.id, 'end'))}
            >
              <Square size={28} fill="currentColor" />
              Stop
            </ControlButton>
          )}
        </div>
      </>
    );
  } else if (st?.show_results) {
    body = (
      <ResultsChart
        question={question}
        counts={counts}
        correct={correct}
        total={answered}
        onToggle={toggle}
      />
    );
  } else {
    body = (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32 }}>
        <div style={{ fontSize: 48, opacity: 0.7 }}>
          Answers are closed · {answered} of {total} responded
        </div>
        {controls && (
          <ControlButton
            label="Show results"
            tone="accent"
            onClick={() => run(() => data.actions.setShowResults(question.id, true))}
          >
            Show results
          </ControlButton>
        )}
      </div>
    );
  }

  return (
    <div style={frame}>
      {heading}
      {body}
      {failure && <div style={{ fontSize: 30, color: BAD }}>{failure}</div>}
    </div>
  );
}
