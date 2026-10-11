import { type ReactNode, useRef } from 'react';
import type {
  InteractiveQuestion,
  NumberQuestion,
  OpenTextQuestion,
  PointsQuestion,
  RankingQuestion,
  ScaleQuestion,
} from '../lib/sdk';
import { format, useLocale } from '../lib/use-locale';
import { numberSummary, pointsStats, rankStats, scaleStats } from './derive';
import { useShrinkToFit } from './question-chrome';
import { ACCENT, FONT, GOOD, INK } from './question-style';
import type { LiveData } from './use-live-session';

type ResultsProps = { data: LiveData; showMarks: boolean };

/** Scales the content down until it fits its box, so a long list never spills off the slide. */
function Shrink({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useShrinkToFit(ref, 'parent');
  return (
    <div
      style={{
        flex: '1 1 0',
        minHeight: 0,
        overflow: 'hidden',
        containerType: 'size',
        width: '100%',
        height: '100%',
      }}
    >
      <div
        ref={ref}
        style={{
          fontSize: 'calc(min(36px, 5.5cqh) * var(--osd-fit, 1))',
          fontFamily: FONT,
          color: INK,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.6em',
          width: '100%',
        }}
      >
        {children}
      </div>
    </div>
  );
}

const track = {
  height: '1.2em',
  borderRadius: '0.6em',
  background: `color-mix(in srgb, ${INK} 8%, transparent)`,
  overflow: 'hidden',
} as const;

function Bar({ fraction, colour = ACCENT }: { fraction: number; colour?: string }) {
  return (
    <span style={{ ...track, display: 'block' }}>
      <span
        style={{
          display: 'block',
          height: '100%',
          width: `${Math.max(0, Math.min(1, fraction)) * 100}%`,
          background: colour,
          transition: 'width 300ms ease',
        }}
      />
    </span>
  );
}

const labelOf = (items: { id: string; label: string }[], id: string) =>
  items.find((i) => i.id === id)?.label ?? id;

function ScaleResults({ question, data }: { question: ScaleQuestion } & ResultsProps) {
  const t = useLocale();
  const min = question.min ?? 1;
  const max = question.max ?? 5;
  const stats = scaleStats(
    data.placements,
    question.id,
    question.items.map((i) => i.id),
    min,
    max,
  );
  return (
    <Shrink>
      {stats.map((s) => {
        const peak = Math.max(1, ...s.distribution);
        return (
          <div
            key={s.itemId}
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0,30%) minmax(0,1fr) 4em',
              gap: '0.8em',
              alignItems: 'center',
            }}
          >
            <span>{labelOf(question.items, s.itemId)}</span>
            <span
              style={{ display: 'flex', alignItems: 'flex-end', gap: '0.25em', height: '2.6em' }}
            >
              {s.distribution
                .map((c, i) => ({ rating: min + i, c }))
                .map(({ rating, c }) => (
                  <span
                    key={rating}
                    title={`${rating}: ${c}`}
                    style={{ flex: 1, textAlign: 'center', fontSize: '0.5em' }}
                  >
                    <span
                      style={{
                        display: 'block',
                        height: `${(c / peak) * 2.2}em`,
                        minHeight: c ? '0.2em' : 0,
                        background: ACCENT,
                        borderRadius: '0.2em 0.2em 0 0',
                      }}
                    />
                    {rating}
                  </span>
                ))}
            </span>
            <span
              style={{ fontWeight: 700, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
            >
              {s.average === null ? '—' : s.average.toFixed(1)}
              <span style={{ display: 'block', fontSize: '0.45em', fontWeight: 400, opacity: 0.6 }}>
                {format(t.live.averageShort, { value: '' }).trim()} · {s.count}
              </span>
            </span>
          </div>
        );
      })}
    </Shrink>
  );
}

function RankingResults({
  question,
  data,
  showMarks,
}: { question: RankingQuestion } & ResultsProps) {
  const t = useLocale();
  const ids = question.items.map((i) => i.id);
  const stats = rankStats(data.placements, question.id, ids);
  const n = ids.length;
  const key = (data.keys[question.id] ?? [])
    .map((p) => p.split('>'))
    .sort((a, b) => Number(a[1]) - Number(b[1]))
    .map(([id]) => id);
  return (
    <Shrink>
      {stats.map((s, i) => {
        const right = showMarks && key.length > 0 && key[i] === s.itemId;
        return (
          <div
            key={s.itemId}
            style={{
              display: 'grid',
              gridTemplateColumns: '1.4em minmax(0,30%) minmax(0,1fr) 3.5em',
              gap: '0.8em',
              alignItems: 'center',
            }}
          >
            <span style={{ fontWeight: 700, color: right ? GOOD : ACCENT }}>
              {right ? '✓' : i + 1}
            </span>
            <span>{labelOf(question.items, s.itemId)}</span>
            <Bar
              fraction={s.average === null ? 0 : (n + 1 - s.average) / n}
              colour={right ? GOOD : ACCENT}
            />
            <span style={{ fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>
              {s.average === null ? '—' : s.average.toFixed(1)}
            </span>
          </div>
        );
      })}
      {showMarks && key.length > 0 && (
        <div style={{ fontSize: '0.7em', opacity: 0.75 }}>
          {t.live.correctOrder}: {key.map((id) => labelOf(question.items, id)).join(' › ')}
        </div>
      )}
    </Shrink>
  );
}

function PointsResults({ question, data }: { question: PointsQuestion } & ResultsProps) {
  const total = question.total ?? 100;
  const stats = pointsStats(
    data.placements,
    question.id,
    question.items.map((i) => i.id),
  );
  return (
    <Shrink>
      {stats.map((s) => (
        <div
          key={s.itemId}
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0,30%) minmax(0,1fr) 3.5em',
            gap: '0.8em',
            alignItems: 'center',
          }}
        >
          <span>{labelOf(question.items, s.itemId)}</span>
          <Bar fraction={s.average / total} />
          <span style={{ fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>
            {Math.round(s.average)}
          </span>
        </div>
      ))}
    </Shrink>
  );
}

const fmt = (v: number | null) =>
  v === null ? '—' : Number.isInteger(v) ? String(v) : v.toFixed(1);

function NumberResults({ question, data, showMarks }: { question: NumberQuestion } & ResultsProps) {
  const t = useLocale();
  const sum = numberSummary(data.answers, question.id);
  const peak = Math.max(1, ...sum.bins.map((b) => b.count));
  const key = (data.keys[question.id] ?? [])[0];
  const unit = question.unit ? ` ${question.unit}` : '';
  return (
    <Shrink>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.3em', height: '5em' }}>
        {sum.bins.map((b) => (
          <span
            key={b.from}
            title={`${fmt(b.from)}–${fmt(b.to)}: ${b.count}`}
            style={{ flex: 1, textAlign: 'center', fontSize: '0.5em' }}
          >
            <span
              style={{
                display: 'block',
                height: `${(b.count / peak) * 4}em`,
                minHeight: b.count ? '0.2em' : 0,
                background: ACCENT,
                borderRadius: '0.2em 0.2em 0 0',
              }}
            />
            {fmt(b.from)}
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '1.4em', fontSize: '0.7em', flexWrap: 'wrap' }}>
        <span>{format(t.live.responseCount.other, { count: sum.count })}</span>
        <span>
          {t.live.statMean}: {fmt(sum.mean)}
          {unit}
        </span>
        <span>
          {t.live.statMedian}: {fmt(sum.median)}
          {unit}
        </span>
        <span>
          {t.live.statRange}: {fmt(sum.min)}–{fmt(sum.max)}
        </span>
      </div>
      {showMarks && key && (
        <div style={{ fontSize: '0.8em', color: GOOD, fontWeight: 700 }}>
          {format(t.live.correctValue, {
            value: `${key}${unit}${question.tolerance ? ` (±${question.tolerance})` : ''}`,
          })}
        </div>
      )}
    </Shrink>
  );
}

function OpenTextResults({ question, data }: { question: OpenTextQuestion } & ResultsProps) {
  const t = useLocale();
  const rows = data.answers
    .filter((a) => a.question_id === question.id)
    .sort((a, b) => b.submitted_at.localeCompare(a.submitted_at));
  return (
    <div
      style={{
        height: '100%',
        overflow: 'hidden',
        fontFamily: FONT,
        color: INK,
        fontSize: 'min(30px, 4.6cqh)',
      }}
    >
      {rows.length === 0 && <span style={{ opacity: 0.6 }}>{t.live.noAnswersYet}</span>}
      <div style={{ columns: '16em', columnGap: '0.8em' }}>
        {rows.map((a) => (
          <div
            key={a.id}
            style={{
              breakInside: 'avoid',
              marginBottom: '0.6em',
              padding: '0.5em 0.7em',
              border: `0.08em solid color-mix(in srgb, ${INK} 22%, transparent)`,
              borderRadius: 'var(--osd-radius, 0.6em)',
              background: `color-mix(in srgb, ${ACCENT} 8%, transparent)`,
              overflowWrap: 'anywhere',
            }}
          >
            {a.answer_text ?? a.option_id}
          </div>
        ))}
      </div>
    </div>
  );
}

/** The results of a scale, ranking, points, number or open-text question. */
export function QuestionResults({
  question,
  data,
  showMarks,
}: { question: InteractiveQuestion } & ResultsProps) {
  switch (question.type) {
    case 'scale':
      return <ScaleResults question={question} data={data} showMarks={showMarks} />;
    case 'ranking':
      return <RankingResults question={question} data={data} showMarks={showMarks} />;
    case 'points':
      return <PointsResults question={question} data={data} showMarks={showMarks} />;
    case 'number':
      return <NumberResults question={question} data={data} showMarks={showMarks} />;
    case 'open_text':
      return <OpenTextResults question={question} data={data} showMarks={showMarks} />;
    default:
      return null;
  }
}

/** The same results in a fixed-height box, for the presenter panel and the results page. */
export function QuestionResultsBox({
  question,
  data,
  height = 280,
}: {
  question: InteractiveQuestion;
  data: LiveData;
  height?: number;
}) {
  return (
    <div
      style={
        {
          height,
          marginTop: 12,
          containerType: 'size',
          position: 'relative',
          '--osd-text': 'var(--foreground, #e5e7eb)',
          '--osd-bg': 'var(--background, #0f172a)',
          '--osd-accent': 'var(--brand, #60a5fa)',
        } as React.CSSProperties
      }
    >
      <QuestionResults
        question={question}
        data={data}
        showMarks={Boolean(data.states[question.id]?.show_results)}
      />
    </div>
  );
}
