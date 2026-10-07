import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MultipleChoiceQuestion } from '../lib/sdk';
import { format, useLocale } from '../lib/use-locale';
import { useParticipantQuestion } from './use-participant-question';

export function ParticipantQuestionCard({ question }: { question: MultipleChoiceQuestion }) {
  const t = useLocale();
  const q = useParticipantQuestion(question);
  if (!q) return null;
  const { state, mine, chosen, revealed, countdown, score, pending, failure, submit } = q;

  return (
    <section
      aria-label={question.question}
      className="rounded-[12px] border border-border bg-card p-4"
    >
      <h2 className="font-heading text-[17px] leading-snug font-semibold">{question.question}</h2>
      {countdown && !mine && (
        <div className="mt-2 font-mono text-[15px] tabular-nums text-muted-foreground">
          ⏱ {countdown}
        </div>
      )}
      {mine ? (
        <div className="mt-3 space-y-1.5">
          <p className="text-[14px]">{t.live.thanksForAnswer}</p>
          <p className="text-[13px] text-muted-foreground">
            {t.live.youChose}{' '}
            <strong className="text-foreground">{chosen?.label ?? mine.option_id}</strong>
          </p>
          {revealed && mine.is_correct !== null && (
            <p
              className={cn(
                'pt-1 text-[20px] font-semibold',
                mine.is_correct ? 'text-emerald-400' : 'text-red-400',
              )}
            >
              {mine.is_correct ? t.live.correct : t.live.notQuite}
              {score && score.graded > 0 && (
                <span className="ml-3 text-[13px] font-medium text-muted-foreground">
                  {format(t.live.score, { correct: score.correct, graded: score.graded })}
                </span>
              )}
            </p>
          )}
        </div>
      ) : state === 'locked' ? (
        <div className="mt-4 flex flex-col items-center gap-2 py-4 text-muted-foreground">
          <Lock className="size-10" strokeWidth={1.5} />
          <span className="text-[13px]">{t.live.waitingForHostToOpen}</span>
        </div>
      ) : state === 'ended' ? (
        <p className="mt-3 text-[14px] text-muted-foreground">{t.live.answerPeriodEnded}</p>
      ) : (
        <div className="mt-3 flex flex-col gap-2.5">
          {question.options.map((o) => (
            <button
              key={o.id}
              type="button"
              disabled={pending !== null}
              onClick={() => submit(o.id)}
              className={cn(
                'min-h-14 w-full rounded-[10px] border border-border bg-background px-4 py-3 text-left text-[16px]',
                'active:bg-muted disabled:opacity-50',
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
      {failure && <p className="mt-2 text-[12.5px] text-destructive">{failure}</p>}
    </section>
  );
}
