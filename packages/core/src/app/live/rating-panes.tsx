import { ArrowDown, ArrowUp, Minus, Plus } from 'lucide-react';
import { type CSSProperties, Fragment, useLayoutEffect, useRef } from 'react';
import type { PointsQuestion, RankingQuestion, ScaleQuestion } from '../lib/sdk';
import { format, useLocale } from '../lib/use-locale';
import { ACCENT, FONT, INK } from './question-style';

// These panes size everything in em, so the same pane fills a slide (large font) or a phone card
// (small font) just by changing the font size of its container.

const round = (extra?: CSSProperties): CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: '2em',
  height: '2em',
  padding: '0 0.4em',
  boxSizing: 'border-box',
  fontFamily: FONT,
  fontSize: 'inherit',
  fontWeight: 600,
  color: INK,
  background: 'transparent',
  border: `0.1em solid color-mix(in srgb, ${INK} 28%, transparent)`,
  borderRadius: '0.5em',
  cursor: 'pointer',
  ...extra,
});

const SLIDE_MS = 380;
const ROW_BORDER = `color-mix(in srgb, ${INK} 22%, transparent)`;

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.8em',
  minWidth: 0,
};

export function ScalePane({
  question,
  values,
  onChange,
  disabled,
}: {
  question: ScaleQuestion;
  /** Rating per statement id. */
  values: Record<string, string>;
  onChange: (values: Record<string, string>) => void;
  disabled?: boolean;
}) {
  const min = question.min ?? 1;
  const max = question.max ?? 5;
  const steps = Array.from({ length: Math.max(1, max - min + 1) }, (_, i) => min + i);
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) auto',
        columnGap: '0.8em',
        rowGap: '0.9em',
        alignItems: 'center',
        fontFamily: FONT,
        color: INK,
      }}
    >
      {(question.minLabel || question.maxLabel) && (
        <>
          <span />
          <span
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: '1em',
              fontSize: '0.7em',
              opacity: 0.65,
              whiteSpace: 'nowrap',
            }}
          >
            <span>{question.minLabel}</span>
            <span>{question.maxLabel}</span>
          </span>
        </>
      )}
      {question.items.map((item) => (
        <Fragment key={item.id}>
          <span style={{ minWidth: 0 }}>{item.label}</span>
          <span style={{ display: 'inline-flex', gap: '0.35em' }}>
            {steps.map((n) => {
              const on = values[item.id] === String(n);
              return (
                <button
                  key={n}
                  type="button"
                  disabled={disabled}
                  aria-pressed={on}
                  onClick={() => onChange({ ...values, [item.id]: String(n) })}
                  style={round({
                    minWidth: '2.2em',
                    background: on ? ACCENT : 'transparent',
                    color: on ? 'var(--osd-bg, #fff)' : INK,
                    borderColor: on ? ACCENT : undefined,
                    opacity: disabled && !on ? 0.5 : 1,
                  })}
                >
                  {n}
                </button>
              );
            })}
          </span>
        </Fragment>
      ))}
    </div>
  );
}

export function RankingPane({
  question,
  order,
  onChange,
  disabled,
}: {
  question: RankingQuestion;
  /** Item ids, first place first. */
  order: string[];
  onChange: (order: string[]) => void;
  disabled?: boolean;
}) {
  const t = useLocale();
  const listRef = useRef<HTMLOListElement>(null);
  const tops = useRef(new Map<string, number>());
  const moved = useRef<string | null>(null);
  const move = (from: number, to: number) => {
    if (to < 0 || to >= order.length) return;
    const next = order.slice();
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    moved.current = item;
    onChange(next);
  };

  // Rows slide from where they were. Layout offsets (not screen pixels) are used because the slide
  // canvas is scaled, and a transform is scaled with it.
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs after each reorder
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const next = new Map<string, number>();
    for (const el of Array.from(list.children) as HTMLElement[]) {
      const id = el.dataset.rankId;
      if (!id) continue;
      next.set(id, el.offsetTop);
      const before = tops.current.get(id);
      if (before === undefined || reduce || typeof el.animate !== 'function') continue;
      const dy = before - el.offsetTop;
      if (dy !== 0) {
        el.animate([{ transform: `translateY(${dy}px)` }, { transform: 'translateY(0)' }], {
          duration: SLIDE_MS,
          easing: 'cubic-bezier(0.2, 0, 0, 1)',
        });
      }
      if (id === moved.current) {
        el.animate(
          [
            {
              zIndex: 1,
              backgroundColor: `color-mix(in srgb, ${ACCENT} 32%, transparent)`,
              borderColor: ACCENT,
            },
            { zIndex: 1, backgroundColor: 'transparent', borderColor: ROW_BORDER },
          ],
          { duration: SLIDE_MS, easing: 'ease-out' },
        );
      }
    }
    tops.current = next;
    moved.current = null;
  }, [order]);

  return (
    <ol
      ref={listRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5em',
        margin: 0,
        padding: 0,
        listStyle: 'none',
        fontFamily: FONT,
        color: INK,
      }}
    >
      {order.map((id, i) => (
        <li
          key={id}
          data-rank-id={id}
          style={{
            ...rowStyle,
            position: 'relative',
            padding: '0.4em 0.7em',
            border: `0.1em solid ${ROW_BORDER}`,
            borderRadius: 'var(--osd-radius, 0.6em)',
          }}
        >
          <span
            style={{
              width: '1.6em',
              fontWeight: 700,
              color: ACCENT,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {i + 1}
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            {question.items.find((x) => x.id === id)?.label ?? id}
          </span>
          <button
            type="button"
            disabled={disabled || i === 0}
            aria-label={t.live.moveUp}
            title={t.live.moveUp}
            onClick={() => move(i, i - 1)}
            style={round({ opacity: disabled || i === 0 ? 0.35 : 1 })}
          >
            <ArrowUp size="1em" />
          </button>
          <button
            type="button"
            disabled={disabled || i === order.length - 1}
            aria-label={t.live.moveDown}
            title={t.live.moveDown}
            onClick={() => move(i, i + 1)}
            style={round({ opacity: disabled || i === order.length - 1 ? 0.35 : 1 })}
          >
            <ArrowDown size="1em" />
          </button>
        </li>
      ))}
    </ol>
  );
}

export function PointsPane({
  question,
  values,
  onChange,
  disabled,
}: {
  question: PointsQuestion;
  values: Record<string, string>;
  onChange: (values: Record<string, string>) => void;
  disabled?: boolean;
}) {
  const t = useLocale();
  const total = question.total ?? 100;
  const step = total >= 50 ? 5 : 1;
  const used = question.items.reduce((n, i) => n + Number(values[i.id] ?? 0), 0);
  const left = total - used;
  const set = (id: string, next: number) =>
    onChange({
      ...Object.fromEntries(question.items.map((i) => [i.id, values[i.id] ?? '0'])),
      [id]: String(Math.max(0, next)),
    });
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.6em',
        fontFamily: FONT,
        color: INK,
      }}
    >
      <div style={{ fontSize: '0.75em', opacity: 0.7 }}>
        {format(t.live.pointsLeft, { n: left })}
      </div>
      {question.items.map((item) => {
        const v = Number(values[item.id] ?? 0);
        return (
          <div key={item.id} style={rowStyle}>
            <span style={{ flex: 1, minWidth: 0 }}>{item.label}</span>
            <button
              type="button"
              disabled={disabled || v <= 0}
              aria-label={t.live.fewerPoints}
              title={t.live.fewerPoints}
              onClick={() => set(item.id, v - step)}
              style={round({ opacity: disabled || v <= 0 ? 0.35 : 1 })}
            >
              <Minus size="1em" />
            </button>
            <span
              style={{
                minWidth: '2.4em',
                textAlign: 'center',
                fontWeight: 700,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {v}
            </span>
            <button
              type="button"
              disabled={disabled || left <= 0}
              aria-label={t.live.morePoints}
              title={t.live.morePoints}
              onClick={() => set(item.id, v + Math.min(step, left))}
              style={round({ opacity: disabled || left <= 0 ? 0.35 : 1 })}
            >
              <Plus size="1em" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
