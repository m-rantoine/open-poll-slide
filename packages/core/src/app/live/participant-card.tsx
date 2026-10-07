import { Lock } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { MultipleChoiceQuestion } from '../lib/sdk';
import { format, useLocale } from '../lib/use-locale';
import { BAD, DISPLAY, FONT, GOOD, INK } from './question-style';
import { useParticipantQuestion } from './use-participant-question';

// Same look as the question drawn on the slide (see multiple-choice.tsx), at phone scale.
const optionStyle: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '18px 20px',
  fontSize: 20,
  fontFamily: FONT,
  textAlign: 'left',
  color: INK,
  background: 'transparent',
  border: `3px solid color-mix(in srgb, ${INK} 22%, transparent)`,
  borderRadius: 'var(--osd-radius, 16px)',
  cursor: 'pointer',
};

export function ParticipantQuestionCard({ question }: { question: MultipleChoiceQuestion }) {
  const t = useLocale();
  const q = useParticipantQuestion(question);
  if (!q) return null;
  const { state, mine, chosen, revealed, countdown, score, pending, failure, submit } = q;

  return (
    <section
      aria-label={question.question}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 28,
        color: INK,
        fontFamily: FONT,
      }}
    >
      <h2
        style={{
          margin: 0,
          fontFamily: DISPLAY,
          fontSize: 30,
          lineHeight: 1.15,
          fontWeight: 700,
          letterSpacing: '-0.01em',
        }}
      >
        {question.question}
      </h2>
      {countdown && !mine && (
        <div style={{ fontSize: 22, fontVariantNumeric: 'tabular-nums' }}>⏱ {countdown}</div>
      )}
      {mine ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ fontSize: 22 }}>
            {t.live.thanksForAnswer}
            <div style={{ opacity: 0.7, marginTop: 8, fontSize: 18 }}>
              {t.live.youChose} <strong>{chosen?.label ?? mine.option_id}</strong>
            </div>
          </div>
          {revealed && mine.is_correct !== null && (
            <div
              style={{
                fontSize: 34,
                fontWeight: 700,
                color: mine.is_correct ? GOOD : BAD,
              }}
            >
              {mine.is_correct ? t.live.correct : t.live.notQuite}
              {score && score.graded > 0 && (
                <div style={{ fontSize: 20, color: INK, opacity: 0.7, fontWeight: 500 }}>
                  {format(t.live.score, { correct: score.correct, graded: score.graded })}
                </div>
              )}
            </div>
          )}
        </div>
      ) : state === 'locked' ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 16,
            padding: '24px 0',
            opacity: 0.7,
          }}
        >
          <Lock size={96} strokeWidth={1.5} />
          <span style={{ fontSize: 18, textAlign: 'center' }}>{t.live.waitingForHostToOpen}</span>
        </div>
      ) : state === 'ended' ? (
        <div style={{ fontSize: 22, opacity: 0.7 }}>{t.live.answerPeriodEnded}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {question.options.map((o) => (
            <button
              key={o.id}
              type="button"
              disabled={pending !== null}
              onClick={() => submit(o.id)}
              style={{ ...optionStyle, opacity: pending && pending !== o.id ? 0.5 : 1 }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
      {failure && <div style={{ fontSize: 16, color: BAD }}>{failure}</div>}
    </section>
  );
}
