import { Check, Lock, LockOpen, Square } from 'lucide-react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { format, useLocale } from '@/lib/use-locale';
import { cn } from '@/lib/utils';
import type { MultipleChoiceQuestion } from '../lib/sdk';
import {
  answeredCount,
  classAverage,
  expectedCount,
  formatClock,
  formatDuration,
  inactiveSeconds,
  isParticipantActive,
  optionCounts,
  pct,
  studentResults,
} from './derive';
import { liveErrorMessage } from './errors';
import { useLive } from './live-context';

function Section({
  title,
  children,
  aside,
}: {
  title: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section className="rounded-[8px] border border-hairline bg-card/40 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="eyebrow text-white/45">{title}</span>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function QuestionPanel({ question }: { question: MultipleChoiceQuestion }) {
  const live = useLive();
  const t = useLocale();
  if (!live) return null;
  const { data, now } = live;
  const st = data.states[question.id];
  const state = st?.state ?? 'locked';
  const total = expectedCount(data.participants, data.answers, question.id, now);
  const answered = answeredCount(data.answers, question.id);
  const counts = optionCounts(data.answers, question.id);
  const correct = data.keys[question.id] ?? [];
  const remaining = st?.ends_at ? new Date(st.ends_at).getTime() - now : null;
  const act = (fn: () => Promise<unknown>) =>
    void fn().catch((e: unknown) => toast.error(liveErrorMessage(t, e)));
  const stateLabel = {
    locked: t.live.stateLocked,
    open: t.live.stateOpen,
    ended: t.live.stateEnded,
  }[state];
  const max = Math.max(1, ...Object.values(counts));
  const byUser = new Map(data.participants.map((p) => [p.user_id, p]));
  const rows = data.answers
    .filter((a) => a.question_id === question.id)
    .map((a) => ({ a, p: byUser.get(a.user_id) }))
    .sort((x, y) => x.a.submitted_at.localeCompare(y.a.submitted_at));
  const answeredIds = new Set(rows.map((r) => r.a.user_id));
  const waiting = data.participants.filter((p) => !answeredIds.has(p.user_id));
  const label = (id: string) => question.options.find((o) => o.id === id)?.label ?? id;

  return (
    <Section
      title={question.question}
      aside={
        <span className="font-mono text-[11px] text-muted-foreground uppercase">{stateLabel}</span>
      }
    >
      <div className="flex flex-col gap-1.5">
        {question.options.map((o) => {
          const isCorrect = correct.includes(o.id);
          return (
            <button
              key={o.id}
              type="button"
              title={t.live.toggleCorrect}
              aria-pressed={isCorrect}
              onClick={() => act(() => data.actions.toggleCorrect(question.id, o.id))}
              className={cn(
                'flex items-center gap-2 rounded-[6px] border px-2.5 py-1.5 text-left text-[12.5px]',
                isCorrect
                  ? 'border-emerald-400/50 bg-emerald-400/10'
                  : 'border-border hover:bg-muted/50',
              )}
            >
              <Check className={cn('size-4', isCorrect ? 'text-emerald-400' : 'opacity-0')} />
              {o.label}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {state === 'open' ? (
          <Button
            variant="outline"
            onClick={() => act(() => data.actions.questionAction(question.id, 'lock'))}
          >
            <LockOpen /> {t.live.lock}
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={() => act(() => data.actions.questionAction(question.id, 'unlock'))}
          >
            <Lock /> {t.live.unlock}
          </Button>
        )}
        {[15, 30, 60].map((s) => (
          <Button
            key={s}
            variant="outline"
            aria-label={format(t.live.addSeconds, { n: s })}
            onClick={() => act(() => data.actions.questionAction(question.id, 'add_time', s))}
          >
            +{s}s
          </Button>
        ))}
        {state === 'open' && remaining !== null && remaining > 0 && (
          <span className="font-mono text-[15px] tabular-nums">{formatClock(remaining)}</span>
        )}
        <Button
          variant="outline"
          disabled={state === 'ended'}
          onClick={() => act(() => data.actions.questionAction(question.id, 'end'))}
        >
          <Square className="fill-current" /> {t.live.stop}
        </Button>
        <Button
          variant={st?.show_results ? 'default' : 'outline'}
          onClick={() => act(() => data.actions.setShowResults(question.id, !st?.show_results))}
        >
          {st?.show_results ? t.live.resultsShown : t.live.showResults}
        </Button>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-brand transition-[width]"
            style={{ width: `${total ? Math.min(100, (answered / total) * 100) : 0}%` }}
          />
        </div>
        <span className="font-mono text-[11.5px] tabular-nums">
          {answered}/{total}
        </span>
      </div>

      <div className="mt-3 flex flex-col gap-1">
        {question.options.map((o) => (
          <div key={o.id} className="grid grid-cols-[1fr_2fr_2rem] items-center gap-2 text-[12px]">
            <span className="truncate">{o.label}</span>
            <span className="h-3 overflow-hidden rounded-[3px] bg-muted">
              <span
                className={cn(
                  'block h-full',
                  correct.includes(o.id) ? 'bg-emerald-400' : 'bg-brand',
                )}
                style={{ width: `${((counts[o.id] ?? 0) / max) * 100}%` }}
              />
            </span>
            <span className="text-right font-mono tabular-nums">{counts[o.id] ?? 0}</span>
          </div>
        ))}
      </div>

      <div className="mt-3 max-h-56 overflow-y-auto rounded-[6px] border border-hairline">
        <table className="w-full text-[11.5px]">
          <thead className="sticky top-0 bg-card text-left text-muted-foreground">
            <tr>
              <th className="px-2 py-1 font-medium">{t.live.student}</th>
              <th className="px-2 py-1 font-medium">{t.live.answer}</th>
              <th className="px-2 py-1 font-medium">{t.live.result}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ a, p }) => (
              <tr key={a.id} className="border-t border-hairline">
                <td className="px-2 py-1">{p?.display_name ?? a.user_id.slice(0, 6)}</td>
                <td className="px-2 py-1">{label(a.option_id)}</td>
                <td className="px-2 py-1">
                  {a.is_correct === null ? '—' : a.is_correct ? '✓' : '✗'}
                </td>
              </tr>
            ))}
            {waiting.map((p) => (
              <tr key={p.user_id} className="border-t border-hairline text-muted-foreground">
                <td className="px-2 py-1">{p.display_name}</td>
                <td className="px-2 py-1" colSpan={2}>
                  {t.live.waiting}
                  {isParticipantActive(p, now) ? '' : ` · ${t.live.inactive}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

export function StudentsPanel() {
  const live = useLive();
  const t = useLocale();
  if (!live) return null;
  const { data, now } = live;
  const active = data.participants.filter((p) => isParticipantActive(p, now));
  const inactive = data.participants.filter((p) => !isParticipantActive(p, now));
  const tile = (p: (typeof data.participants)[number], isActive: boolean) => (
    <span
      key={p.user_id}
      title={p.email}
      className={cn(
        'rounded-[5px] border px-2 py-1 text-[11.5px]',
        isActive
          ? 'border-emerald-400/40 bg-emerald-400/10'
          : 'border-amber-300/30 bg-amber-300/10',
      )}
    >
      {p.display_name}
      {!isActive && (
        <span className="ml-1.5 font-mono text-[10px] opacity-70">
          {formatDuration(inactiveSeconds(p, now))}
        </span>
      )}
    </span>
  );
  return (
    <Section title={`${t.live.students} · ${data.participants.length}`}>
      <div className="mb-1 text-[11px] text-muted-foreground">
        {format(t.live.activeCount, { count: active.length })}
      </div>
      <div className="mb-3 flex flex-wrap gap-1.5">{active.map((p) => tile(p, true))}</div>
      <div className="mb-1 text-[11px] text-muted-foreground">
        {format(t.live.inactiveCount, { count: inactive.length })}
      </div>
      <div className="flex flex-wrap gap-1.5">{inactive.map((p) => tile(p, false))}</div>
    </Section>
  );
}

export function ResultsPanel() {
  const live = useLive();
  const t = useLocale();
  if (!live) return null;
  const { data } = live;
  const results = studentResults(data.participants, data.answers);
  const byUser = new Map(results.map((r) => [r.userId, r]));
  return (
    <Section title={`${t.live.classAverage} · ${pct(classAverage(results))}`}>
      <table className="w-full text-[11.5px]">
        <tbody>
          {data.participants.map((p) => {
            const r = byUser.get(p.user_id);
            return (
              <tr key={p.user_id} className="border-t border-hairline first:border-0">
                <td className="px-2 py-1">{p.display_name}</td>
                <td className="px-2 py-1 text-right font-mono tabular-nums">
                  {r ? `${r.correct}/${r.graded}` : '—'}
                </td>
                <td className="px-2 py-1 text-right font-mono tabular-nums">
                  {r && r.graded > 0 ? pct(r.correct / r.graded) : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Section>
  );
}
