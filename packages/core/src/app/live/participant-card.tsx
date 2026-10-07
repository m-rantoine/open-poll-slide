import { Lock } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { MultipleChoiceQuestion } from '../lib/sdk';
import { useLive } from './live-context';

function clock(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function ParticipantQuestionCard({ question }: { question: MultipleChoiceQuestion }) {
  const live = useLive();
  const [pending, setPending] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  if (!live) return null;

  const { data, now } = live;
  const st = data.states[question.id];
  const state = st?.state ?? 'locked';
  const isSelf = data.session?.mode === 'self';
  const mine = data.mine[question.id];
  const revealed = Boolean(mine?.show_results) && (isSelf || state === 'ended');
  const remaining = st?.ends_at ? new Date(st.ends_at).getTime() - now : null;
  const countdown =
    state === 'open' && remaining !== null && remaining > 0 ? clock(remaining) : null;
  const chosen = question.options.find((o) => o.id === mine?.option_id);

  const submit = (optionId: string) => {
    setPending(optionId);
    setFailure(null);
    data.actions
      .submitAnswer(question.id, optionId)
      .catch((e: Error) => setFailure(e.message))
      .finally(() => setPending(null));
  };

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
          <p className="text-[14px]">Thanks for your answer!</p>
          <p className="text-[13px] text-muted-foreground">
            You chose:{' '}
            <strong className="text-foreground">{chosen?.label ?? mine.option_id}</strong>
          </p>
          {revealed && mine.is_correct !== null && (
            <p
              className={cn(
                'pt-1 text-[20px] font-semibold',
                mine.is_correct ? 'text-emerald-400' : 'text-red-400',
              )}
            >
              {mine.is_correct ? '✓ Correct' : '✗ Not quite'}
              {data.score && data.score.graded > 0 && (
                <span className="ml-3 text-[13px] font-medium text-muted-foreground">
                  Score {data.score.correct}/{data.score.graded}
                </span>
              )}
            </p>
          )}
        </div>
      ) : state === 'locked' ? (
        <div className="mt-4 flex flex-col items-center gap-2 py-4 text-muted-foreground">
          <Lock className="size-10" strokeWidth={1.5} />
          <span className="text-[13px]">Waiting for your host to open this question</span>
        </div>
      ) : state === 'ended' ? (
        <p className="mt-3 text-[14px] text-muted-foreground">The answer period has ended.</p>
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
