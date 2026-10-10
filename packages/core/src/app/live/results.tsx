import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useDocumentTitle } from '@/lib/use-document-title';
import { format, plural, useLocale } from '@/lib/use-locale';
import { cn } from '@/lib/utils';
import type { Locale } from '../../locale/types';
import { type InteractiveQuestion, isMultipleChoice, isWordCloud } from '../lib/sdk';
import { useSlideModule } from '../lib/use-slide-module';
import { LiveMessage, LoadingLine, RequireHost } from './auth';
import { getClient } from './client';
import {
  answeredCount,
  classAverage,
  formatDuration,
  inactiveSeconds,
  optionCounts,
  pct,
  placementScores,
  studentResults,
} from './derive';
import { EndSessionButton } from './end-session';
import { liveErrorMessage } from './errors';
import { PauseSessionButton } from './pause-session';
import { WordList, ZoneSummary } from './presenter-panels';
import { SlideThumb } from './slide-thumb';
import type { AnswerRow, SessionRow } from './types';
import { useLiveSession } from './use-live-session';

function statusLabel(t: Locale, status: SessionRow['status']) {
  if (status === 'active') return t.live.statusActive;
  return status === 'paused' ? t.live.statusPaused : t.live.statusEnded;
}

export function ResultsListPage() {
  const t = useLocale();
  useDocumentTitle(t.live.results);
  return (
    <RequireHost>
      <ResultsList />
    </RequireHost>
  );
}

type Summary = { students: number; class_average: number | null };

function ResultsList() {
  const t = useLocale();
  const [sessions, setSessions] = useState<SessionRow[] | null>(null);
  const [summaries, setSummaries] = useState<Record<string, Summary>>({});

  useEffect(() => {
    const supabase = getClient();
    let cancelled = false;
    (async () => {
      const [list, sums] = await Promise.all([
        supabase.from('sessions').select('*').order('created_at', { ascending: false }).limit(100),
        supabase.rpc('session_summaries', { p_limit: 100 }),
      ]);
      if (cancelled) return;
      if (list.error) toast.error(liveErrorMessage(t, list.error));
      setSessions(list.data ?? []);
      setSummaries(
        Object.fromEntries(
          (sums.data ?? []).map((r) => [
            r.session_id,
            { students: r.students, class_average: r.class_average },
          ]),
        ),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  if (!sessions) return <LiveMessage title={t.live.loadingResults} />;
  return (
    <>
      <header className="mb-6">
        <h1 className="font-heading text-[21px] font-semibold tracking-[-0.015em]">
          {t.live.results}
        </h1>
      </header>
      {sessions.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">{t.live.noSessionsYet}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {sessions.map((s) => {
            const sum = summaries[s.id];
            const students = sum?.students ?? 0;
            return (
              <li key={s.id}>
                <Link
                  to={`/results/${s.id}`}
                  className="flex items-center gap-4 rounded-[8px] border border-hairline bg-card/40 p-3 hover:bg-muted/40"
                >
                  <SlideThumb slideId={s.deck_id} width={96} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13.5px] font-medium">
                      {s.deck_title ?? s.deck_id}
                    </div>
                    <div className="font-mono text-[11.5px] text-muted-foreground">
                      {new Date(s.created_at).toLocaleString(t.id)} ·{' '}
                      {s.mode === 'host' ? t.live.hostPaced : t.live.selfPaced} · {s.code} ·{' '}
                      {statusLabel(t, s.status)}
                    </div>
                  </div>
                  <div className="text-right font-mono text-[12px] tabular-nums">
                    <div>{format(plural(students, t.live.studentCount), { count: students })}</div>
                    <div className="text-muted-foreground">
                      {format(t.live.averageShort, { value: pct(sum?.class_average ?? null) })}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

export function ResultsDetailPage() {
  return (
    <RequireHost>
      <ResultsDetail />
    </RequireHost>
  );
}

type Tab = 'summary' | 'question' | 'student';

function ResultsDetail() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const t = useLocale();
  const data = useLiveSession(sessionId, true);
  const [tab, setTab] = useState<Tab>('summary');
  const session = data.session;
  const { slide } = useSlideModule(session?.deck_id ?? '');
  useDocumentTitle(session?.deck_title ?? t.live.results);

  const questions = useMemo(
    () =>
      Object.values({
        ...(slide?.questions ?? {}),
        ...((session?.questions ?? {}) as Record<string, InteractiveQuestion>),
      }),
    [slide, session],
  );
  const results = useMemo(
    () =>
      studentResults(
        data.participants,
        data.answers,
        placementScores(data.placements, data.answers, data.keys, data.states),
      ),
    [data.participants, data.answers, data.placements, data.keys, data.states],
  );

  if (data.loading) return <LoadingLine />;
  if (data.error || !session) {
    return (
      <LiveMessage
        title={t.live.sessionNotFound}
        body={data.error ? liveErrorMessage(t, data.error) : ''}
      />
    );
  }

  const now = Date.now() + data.serverOffset;
  const byUser = new Map(data.participants.map((p) => [p.user_id, p]));
  const label = (q: InteractiveQuestion, a: AnswerRow) =>
    isMultipleChoice(q)
      ? (q.options.find((o) => o.id === a.option_id)?.label ?? a.option_id)
      : isWordCloud(q)
        ? (a.answer_text ?? a.option_id)
        : t.live.submittedSorting;
  const toggle = (questionId: string, optionId: string) =>
    void data.actions
      .toggleCorrect(questionId, optionId)
      .catch((e: unknown) => toast.error(liveErrorMessage(t, e)));
  const tabLabels: Record<Tab, string> = {
    summary: t.live.tabSummary,
    question: t.live.tabByQuestion,
    student: t.live.tabByStudent,
  };

  return (
    <>
      <header className="mb-6 flex flex-wrap items-center gap-4">
        <SlideThumb slideId={session.deck_id} width={96} />
        <div className="min-w-0 flex-1">
          <h1 className="font-heading text-[21px] font-semibold tracking-[-0.015em]">
            {session.deck_title ?? session.deck_id}
          </h1>
          <div className="font-mono text-[11.5px] text-muted-foreground">
            {new Date(session.created_at).toLocaleString(t.id)} ·{' '}
            {session.mode === 'host' ? t.live.hostPaced : t.live.selfPaced} · {session.code} ·{' '}
            {statusLabel(t, session.status)}
          </div>
        </div>
        {session.status !== 'ended' && session.mode === 'host' && (
          <Button
            variant="outline"
            onClick={() =>
              navigate(`/s/${encodeURIComponent(session.deck_id)}/screen?session=${session.id}`)
            }
          >
            {t.live.openScreen}
          </Button>
        )}
        <PauseSessionButton data={data} />
        {session.status !== 'ended' && <EndSessionButton data={data} />}
      </header>

      <nav className="mb-5 flex gap-1 border-b border-hairline">
        {(['summary', 'question', 'student'] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              '-mb-px border-b-2 px-3 py-2 text-[12.5px]',
              tab === key
                ? 'border-foreground font-medium'
                : 'border-transparent text-muted-foreground',
            )}
          >
            {tabLabels[key]}
          </button>
        ))}
      </nav>

      {tab === 'summary' && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            [t.live.students, String(data.participants.length)],
            [t.live.classAverage, pct(classAverage(results))],
            [t.live.questions, String(questions.length)],
            [t.live.answers, String(data.answers.length)],
          ].map(([k, v]) => (
            <div key={k} className="rounded-[8px] border border-hairline bg-card/40 p-4">
              <div className="eyebrow">{k}</div>
              <div className="mt-1 font-heading text-2xl font-semibold tabular-nums">{v}</div>
            </div>
          ))}
        </div>
      )}

      {tab === 'question' && (
        <div className="flex flex-col gap-5">
          {questions.map((q) => {
            const counts = optionCounts(data.answers, q.id);
            const key = data.keys[q.id] ?? [];
            const n = answeredCount(data.answers, q.id);
            const max = Math.max(1, ...Object.values(counts));
            const correctN = data.answers.filter(
              (a) => a.question_id === q.id && a.is_correct,
            ).length;
            const gradedN = data.answers.filter(
              (a) => a.question_id === q.id && a.is_correct !== null,
            ).length;
            const scored = data.states[q.id]?.scored ?? true;
            return (
              <section key={q.id} className="rounded-[8px] border border-hairline bg-card/40 p-4">
                <div className="flex items-baseline justify-between gap-4">
                  <h2 className="text-[14px] font-medium">{q.question}</h2>
                  <span className="font-mono text-[11.5px] text-muted-foreground">
                    {format(t.live.answeredOf, { answered: n, total: data.participants.length })}
                    {scored &&
                      gradedN > 0 &&
                      ` · ${format(t.live.percentCorrect, { value: pct(correctN / gradedN) })}`}
                    <button
                      type="button"
                      title={t.live.scoredHint}
                      aria-pressed={scored}
                      onClick={() =>
                        void data.actions
                          .setScored(q.id, !scored)
                          .catch((e: unknown) => toast.error(liveErrorMessage(t, e)))
                      }
                      className={cn(
                        'ml-3 rounded-[4px] border px-1.5 py-0.5 text-[11px]',
                        scored
                          ? 'border-brand/50 text-foreground'
                          : 'border-border text-muted-foreground',
                      )}
                    >
                      {scored ? t.live.scored : t.live.notScored}
                    </button>
                  </span>
                </div>
                {isMultipleChoice(q) ? (
                  <div className="mt-3 flex flex-col gap-1.5">
                    {q.options.map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        title={t.live.toggleCorrect}
                        aria-pressed={key.includes(o.id)}
                        onClick={() => toggle(q.id, o.id)}
                        className="grid grid-cols-[1.5rem_1fr_2fr_2rem] items-center gap-2 text-left text-[12.5px]"
                      >
                        <span className="text-emerald-400">{key.includes(o.id) ? '✓' : ''}</span>
                        <span className="truncate">{o.label}</span>
                        <span className="h-3 overflow-hidden rounded-[3px] bg-muted">
                          <span
                            className={cn(
                              'block h-full',
                              key.includes(o.id) ? 'bg-emerald-400' : 'bg-brand',
                            )}
                            style={{ width: `${((counts[o.id] ?? 0) / max) * 100}%` }}
                          />
                        </span>
                        <span className="text-right font-mono tabular-nums">
                          {counts[o.id] ?? 0}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : isWordCloud(q) ? (
                  <WordList question={q} data={data} />
                ) : (
                  <ZoneSummary question={q} data={data} />
                )}
                <details className="mt-3 text-[12px]">
                  <summary className="cursor-pointer text-muted-foreground">
                    {t.live.whoAnsweredWhat}
                  </summary>
                  <ul className="mt-2 grid gap-1 md:grid-cols-2">
                    {data.answers
                      .filter((a) => a.question_id === q.id)
                      .map((a) => (
                        <li key={a.id} className="flex justify-between gap-3">
                          <span>
                            {byUser.get(a.user_id)?.display_name ?? a.user_id.slice(0, 6)}
                          </span>
                          <span className="text-muted-foreground">
                            {label(q, a)} {a.is_correct === null ? '' : a.is_correct ? '✓' : '✗'}
                          </span>
                        </li>
                      ))}
                  </ul>
                </details>
              </section>
            );
          })}
        </div>
      )}

      {tab === 'student' && (
        <div className="overflow-x-auto rounded-[8px] border border-hairline">
          <table className="w-full text-[12px]">
            <thead className="bg-card/60 text-left text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">{t.live.student}</th>
                <th className="px-3 py-2 font-medium">{t.live.answered}</th>
                <th className="px-3 py-2 font-medium">{t.live.scoreColumn}</th>
                <th className="px-3 py-2 font-medium">{t.live.inactiveTime}</th>
                {questions.map((q) => (
                  <th
                    key={q.id}
                    className="max-w-40 truncate px-3 py-2 font-medium"
                    title={q.question}
                  >
                    {q.question}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.participants.map((p) => {
                const r = results.find((x) => x.userId === p.user_id);
                return (
                  <tr key={p.user_id} className="border-t border-hairline">
                    <td className="px-3 py-2">
                      {p.display_name}
                      <div className="text-[10.5px] text-muted-foreground">{p.email}</div>
                    </td>
                    <td className="px-3 py-2 font-mono tabular-nums">
                      {r?.answered ?? 0}/{questions.length}
                    </td>
                    <td className="px-3 py-2 font-mono tabular-nums">
                      {r && r.graded > 0
                        ? `${r.correct}/${r.graded} · ${pct(r.correct / r.graded)}`
                        : '—'}
                    </td>
                    <td className="px-3 py-2 font-mono tabular-nums">
                      {formatDuration(inactiveSeconds(p, now))}
                    </td>
                    {questions.map((q) => {
                      const a = data.answers.find(
                        (x) => x.question_id === q.id && x.user_id === p.user_id,
                      );
                      return (
                        <td key={q.id} className="max-w-40 truncate px-3 py-2">
                          {a ? (
                            <span className={a.is_correct === false ? 'text-destructive' : ''}>
                              {label(q, a)} {a.is_correct === null ? '' : a.is_correct ? '✓' : '✗'}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
