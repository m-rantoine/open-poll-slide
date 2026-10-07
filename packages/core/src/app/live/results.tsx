import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useDocumentTitle } from '@/lib/use-document-title';
import { cn } from '@/lib/utils';
import type { MultipleChoiceQuestion } from '../lib/sdk';
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
  studentResults,
} from './derive';
import { SlideThumb } from './slide-thumb';
import type { AnswerRow, ParticipantRow, SessionRow } from './types';
import { useLiveSession } from './use-live-session';

export function ResultsListPage() {
  useDocumentTitle('Results');
  return (
    <RequireHost>
      <ResultsList />
    </RequireHost>
  );
}

function ResultsList() {
  const [sessions, setSessions] = useState<SessionRow[] | null>(null);
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [answers, setAnswers] = useState<AnswerRow[]>([]);

  useEffect(() => {
    const supabase = getClient();
    (async () => {
      const { data } = await supabase
        .from('sessions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      const list = data ?? [];
      setSessions(list);
      const ids = list.map((s) => s.id);
      if (ids.length === 0) return;
      const [p, a] = await Promise.all([
        supabase.from('session_participants').select('*').in('session_id', ids),
        supabase.from('answers').select('*').in('session_id', ids),
      ]);
      setParticipants(p.data ?? []);
      setAnswers(a.data ?? []);
    })();
  }, []);

  if (!sessions) return <LiveMessage title="Loading results…" />;
  return (
    <>
      <header className="mb-6">
        <h1 className="font-heading text-[21px] font-semibold tracking-[-0.015em]">Results</h1>
      </header>
      {sessions.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">No sessions yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {sessions.map((s) => {
            const ps = participants.filter((p) => p.session_id === s.id);
            const avg = classAverage(
              studentResults(
                ps,
                answers.filter((a) => a.session_id === s.id),
              ),
            );
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
                      {new Date(s.created_at).toLocaleString()} ·{' '}
                      {s.mode === 'host' ? 'host-paced' : 'self-paced'} · {s.code} · {s.status}
                    </div>
                  </div>
                  <div className="text-right font-mono text-[12px] tabular-nums">
                    <div>{ps.length} students</div>
                    <div className="text-muted-foreground">avg {pct(avg)}</div>
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
  const data = useLiveSession(sessionId, true);
  const [tab, setTab] = useState<Tab>('summary');
  const session = data.session;
  const { slide } = useSlideModule(session?.deck_id ?? '');
  useDocumentTitle(session?.deck_title ?? 'Results');

  const questions = useMemo(
    () =>
      Object.values({
        ...(slide?.questions ?? {}),
        ...((session?.questions ?? {}) as Record<string, MultipleChoiceQuestion>),
      }),
    [slide, session],
  );
  const results = useMemo(
    () => studentResults(data.participants, data.answers),
    [data.participants, data.answers],
  );

  if (data.loading) return <LoadingLine />;
  if (data.error || !session)
    return <LiveMessage title="Session not found" body={data.error ?? ''} />;

  const now = Date.now() + data.serverOffset;
  const byUser = new Map(data.participants.map((p) => [p.user_id, p]));
  const label = (q: MultipleChoiceQuestion, id: string) =>
    q.options.find((o) => o.id === id)?.label ?? id;

  return (
    <>
      <header className="mb-6 flex flex-wrap items-center gap-4">
        <SlideThumb slideId={session.deck_id} width={96} />
        <div className="min-w-0 flex-1">
          <h1 className="font-heading text-[21px] font-semibold tracking-[-0.015em]">
            {session.deck_title ?? session.deck_id}
          </h1>
          <div className="font-mono text-[11.5px] text-muted-foreground">
            {new Date(session.created_at).toLocaleString()} ·{' '}
            {session.mode === 'host' ? 'host-paced' : 'self-paced'} · {session.code} ·{' '}
            {session.status}
          </div>
        </div>
        {session.status === 'active' && session.mode === 'host' && (
          <Button
            variant="outline"
            onClick={() =>
              navigate(`/s/${encodeURIComponent(session.deck_id)}/screen?session=${session.id}`)
            }
          >
            Open screen
          </Button>
        )}
        {session.status === 'active' && (
          <Button variant="outline" onClick={() => void data.actions.endSession()}>
            End session
          </Button>
        )}
      </header>

      <nav className="mb-5 flex gap-1 border-b border-hairline">
        {(['summary', 'question', 'student'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              '-mb-px border-b-2 px-3 py-2 text-[12.5px] capitalize',
              tab === t
                ? 'border-foreground font-medium'
                : 'border-transparent text-muted-foreground',
            )}
          >
            {t === 'summary' ? 'Summary' : t === 'question' ? 'By question' : 'By student'}
          </button>
        ))}
      </nav>

      {tab === 'summary' && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            ['Students', String(data.participants.length)],
            ['Class average', pct(classAverage(results))],
            ['Questions', String(questions.length)],
            ['Answers', String(data.answers.length)],
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
            return (
              <section key={q.id} className="rounded-[8px] border border-hairline bg-card/40 p-4">
                <div className="flex items-baseline justify-between gap-4">
                  <h2 className="text-[14px] font-medium">{q.question}</h2>
                  <span className="font-mono text-[11.5px] text-muted-foreground">
                    {n}/{data.participants.length} answered
                    {key.length > 0 && ` · ${pct(n ? correctN / n : null)} correct`}
                  </span>
                </div>
                <div className="mt-3 flex flex-col gap-1.5">
                  {q.options.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      title="Toggle as correct answer"
                      onClick={() => void data.actions.toggleCorrect(q.id, o.id)}
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
                      <span className="text-right font-mono tabular-nums">{counts[o.id] ?? 0}</span>
                    </button>
                  ))}
                </div>
                <details className="mt-3 text-[12px]">
                  <summary className="cursor-pointer text-muted-foreground">
                    Who answered what
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
                            {label(q, a.option_id)}{' '}
                            {a.is_correct === null ? '' : a.is_correct ? '✓' : '✗'}
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
                <th className="px-3 py-2 font-medium">Student</th>
                <th className="px-3 py-2 font-medium">Answered</th>
                <th className="px-3 py-2 font-medium">Score</th>
                <th className="px-3 py-2 font-medium">Inactive time</th>
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
                              {label(q, a.option_id)}{' '}
                              {a.is_correct === null ? '' : a.is_correct ? '✓' : '✗'}
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
