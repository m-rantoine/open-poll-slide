import {
  type CSSProperties,
  createContext,
  type HTMLAttributes,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { LanguageScope, type PollLanguage } from '../lib/locale-store';
import type { DragDropQuestion } from '../lib/sdk';
import { useIsActivePage } from '../lib/step-context';
import { format, useLocale } from '../lib/use-locale';
import { answeredCount, expectedCount, formatClock, zoneTiles } from './derive';
import { liveErrorMessage } from './errors';
import { useLive, useRegisterQuestion } from './live-context';
import { useLockHotkey } from './lock-hotkey';
import {
  ControlButton,
  Countdown,
  Footer,
  HostBar,
  Padlock,
  ProgressBar,
  rootStyle,
} from './question-chrome';
import { ACCENT, BAD, FONT, GOOD, INK } from './question-style';
import type { LiveData } from './use-live-session';

const POOL = '__pool__';
const MIN_FONT_PX = 8;

type Placed = Record<string, string>;

type Ctx = {
  question: DragDropQuestion;
  /** Participant can move tiles. */
  interactive: boolean;
  /** Read-only participant view (phone portrait, locked, ended, submitted). */
  participant: boolean;
  state: string;
  /** Tiles the participant has placed, by tile id. */
  placed: Placed;
  /** Results: tiles per zone, most often placed first. */
  results: ReturnType<typeof zoneTiles> | null;
  correctPairs: string[];
  showMarks: boolean;
  engine: Engine;
  previewKey: Record<string, string> | undefined;
  /** Participants' grading per tile after results are shown. */
  tileOk: Record<string, boolean | null>;
};

const DragDropContext = createContext<Ctx | null>(null);

type Engine = {
  hover: string | null;
  selected: string | null;
  tileProps: (itemId: string, label: string) => HTMLAttributes<HTMLElement>;
  targetProps: (target: string) => HTMLAttributes<HTMLElement> & {
    'data-dd-target': string;
    'data-dd-question': string;
  };
  ghost: ReactNode;
};

const tileStyle = (extra?: CSSProperties): CSSProperties => ({
  display: 'inline-block',
  boxSizing: 'border-box',
  maxWidth: '100%',
  margin: '0.12em',
  padding: '0.2em 0.6em',
  fontFamily: FONT,
  fontSize: 'inherit',
  lineHeight: 1.25,
  color: INK,
  background: `color-mix(in srgb, ${ACCENT} 14%, transparent)`,
  border: `0.07em solid color-mix(in srgb, ${INK} 28%, transparent)`,
  borderRadius: 'var(--osd-radius, 0.5em)',
  textAlign: 'left',
  userSelect: 'none',
  ...extra,
});

function useDragEngine(
  question: DragDropQuestion,
  enabled: boolean,
  onDrop: (itemId: string, zoneId: string | null) => void,
): Engine {
  const [drag, setDrag] = useState<{
    itemId: string;
    label: string;
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const press = useRef<{
    itemId: string;
    label: string;
    x: number;
    y: number;
    w: number;
    h: number;
    moved: boolean;
  } | null>(null);

  const targetAt = useCallback(
    (x: number, y: number): string | null => {
      for (const el of document.elementsFromPoint(x, y)) {
        const t = (el as HTMLElement).dataset?.ddTarget;
        if (t && (el as HTMLElement).dataset.ddQuestion === question.id) return t;
      }
      return null;
    },
    [question.id],
  );

  const drop = (itemId: string, target: string | null) => {
    if (target === null) return;
    onDrop(itemId, target === POOL ? null : target);
  };

  const tileProps = (itemId: string, label: string): HTMLAttributes<HTMLElement> => ({
    onPointerDown: (e: ReactPointerEvent<HTMLElement>) => {
      if (!enabled || e.button !== 0) return;
      const rect = e.currentTarget.getBoundingClientRect();
      e.currentTarget.setPointerCapture(e.pointerId);
      press.current = {
        itemId,
        label,
        x: e.clientX,
        y: e.clientY,
        w: rect.width,
        h: rect.height,
        moved: false,
      };
    },
    onPointerMove: (e: ReactPointerEvent<HTMLElement>) => {
      const p = press.current;
      if (!p) return;
      if (!p.moved && Math.hypot(e.clientX - p.x, e.clientY - p.y) < 5) return;
      p.moved = true;
      setDrag({ itemId: p.itemId, label: p.label, x: e.clientX, y: e.clientY, w: p.w, h: p.h });
      setHover(targetAt(e.clientX, e.clientY));
    },
    onPointerUp: (e: ReactPointerEvent<HTMLElement>) => {
      const p = press.current;
      press.current = null;
      if (!p) return;
      if (p.moved) {
        drop(p.itemId, targetAt(e.clientX, e.clientY));
        setSelected(null);
      } else {
        setSelected((cur) => (cur === p.itemId ? null : p.itemId));
      }
      setDrag(null);
      setHover(null);
    },
    onPointerCancel: () => {
      press.current = null;
      setDrag(null);
      setHover(null);
    },
    // The press handlers already select; a click must not also reach the zone or pool below.
    onClick: (e) => e.stopPropagation(),
    onKeyDown: (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setSelected((cur) => (cur === itemId ? null : itemId));
      }
    },
  });

  const targetProps = (target: string) => ({
    'data-dd-target': target,
    'data-dd-question': question.id,
    onClick: () => {
      if (!enabled || !selected) return;
      drop(selected, target);
      setSelected(null);
    },
  });

  const ghost =
    drag && typeof document !== 'undefined'
      ? createPortal(
          <div
            style={{
              position: 'fixed',
              left: drag.x - drag.w / 2,
              top: drag.y - drag.h / 2,
              width: drag.w,
              pointerEvents: 'none',
              zIndex: 2147483000,
              fontSize: 16,
              boxShadow: '0 6px 18px rgba(0,0,0,0.25)',
              ...tileStyle({
                width: drag.w,
                background: `color-mix(in srgb, ${ACCENT} 30%, white)`,
              }),
            }}
          >
            {drag.label}
          </div>,
          document.body,
        )
      : null;

  return { hover, selected, tileProps, targetProps, ghost };
}

/** Shrinks the font until the content fits its parent (`all`) or its first tile is fully visible. */
function useFit(ref: RefObject<HTMLElement | null>, mode: 'all' | 'first') {
  useLayoutEffect(() => {
    const el = ref.current;
    const box = el?.parentElement;
    if (!el || !box) return;
    const overflows = () => {
      if (mode === 'all') {
        return el.scrollHeight > box.clientHeight + 1 || el.scrollWidth > box.clientWidth + 1;
      }
      const first = el.firstElementChild as HTMLElement | null;
      if (!first) return false;
      return (
        first.offsetTop + first.offsetHeight > box.clientHeight + 1 ||
        first.offsetLeft + first.offsetWidth > box.clientWidth + 1
      );
    };
    const fit = () => {
      el.style.removeProperty('--osd-fit');
      const base = Number.parseFloat(getComputedStyle(el).fontSize);
      let factor = 1;
      while (overflows() && base * factor > MIN_FONT_PX) {
        factor *= 0.94;
        el.style.setProperty('--osd-fit', String(factor));
      }
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(box);
    return () => observer.disconnect();
  });
}

function usePlaced(data: LiveData | undefined, question: DragDropQuestion) {
  const mine = data?.myPlacements[question.id] ?? [];
  const placed: Placed = {};
  const ok: Record<string, boolean | null> = {};
  for (const m of mine) {
    placed[m.item_id] = m.zone_id;
    ok[m.item_id] = m.is_correct;
  }
  return { placed, ok };
}

const zoneLabel = (q: DragDropQuestion, id: string) =>
  q.zones.find((z) => z.id === id)?.label ?? id;
const itemLabel = (q: DragDropQuestion, id: string) =>
  q.items.find((i) => i.id === id)?.label ?? id;

function Tile({
  label,
  itemId,
  count,
  tone,
  interactive,
  selected,
  engine,
}: {
  label: string;
  itemId: string;
  count?: number;
  tone?: 'good' | 'bad' | null;
  interactive?: boolean;
  selected?: boolean;
  engine?: Engine;
}) {
  const colour = tone === 'good' ? GOOD : tone === 'bad' ? BAD : null;
  const style = tileStyle({
    borderColor: colour ?? (selected ? ACCENT : undefined),
    boxShadow: selected ? `0 0 0 0.08em ${ACCENT}` : undefined,
    background: colour ? `color-mix(in srgb, ${colour} 16%, transparent)` : undefined,
  });
  const body = (
    <>
      {label}
      {count !== undefined && (
        <span style={{ opacity: 0.6, fontSize: '0.7em', marginLeft: '0.5em' }}>×{count}</span>
      )}
    </>
  );
  if (!interactive || !engine) return <span style={style}>{body}</span>;
  return (
    <button
      type="button"
      {...engine.tileProps(itemId, label)}
      style={{ ...style, cursor: 'grab', touchAction: 'none' }}
      aria-pressed={selected}
    >
      {body}
    </button>
  );
}

export type DropZoneProps = {
  /** The zone id from the question's `zones`. */
  zone: string;
  /** Hide the zone's label. */
  hideLabel?: boolean;
} & Omit<HTMLAttributes<HTMLDivElement>, 'children'>;

export function DropZone({ zone, hideLabel, style, ...rest }: DropZoneProps) {
  const ctx = useContext(DragDropContext);
  const ref = useRef<HTMLDivElement>(null);
  const isResults = Boolean(ctx?.results);
  useFit(ref, isResults ? 'first' : 'all');
  if (!ctx) return <div {...rest} style={style} />;
  const { question, interactive, placed, results, engine, correctPairs, showMarks, previewKey } =
    ctx;

  let tiles: ReactNode;
  if (results) {
    tiles = (results[zone] ?? []).map((t) => {
      const known = correctPairs.length > 0 && showMarks;
      const good = known ? correctPairs.includes(`${t.itemId}>${zone}`) : null;
      return (
        <Tile
          key={t.itemId}
          itemId={t.itemId}
          label={itemLabel(question, t.itemId)}
          count={t.count}
          tone={good === null ? null : good ? 'good' : 'bad'}
        />
      );
    });
  } else if (ctx.participant) {
    tiles = question.items
      .filter((i) => placed[i.id] === zone)
      .map((i) => (
        <Tile
          key={i.id}
          itemId={i.id}
          label={i.label}
          interactive={interactive}
          selected={engine.selected === i.id}
          engine={engine}
          tone={
            ctx.tileOk[i.id] === undefined || ctx.tileOk[i.id] === null
              ? null
              : ctx.tileOk[i.id]
                ? 'good'
                : 'bad'
          }
        />
      ));
  } else if (previewKey) {
    tiles = question.items
      .filter((i) => previewKey[i.id] === zone)
      .map((i) => <Tile key={i.id} itemId={i.id} label={i.label} />);
  }

  const over = engine.hover === zone;
  return (
    <div
      {...rest}
      {...(interactive ? engine.targetProps(zone) : {})}
      title={zoneLabel(question, zone)}
      style={{
        position: 'relative',
        boxSizing: 'border-box',
        containerType: 'size',
        overflow: 'hidden',
        padding: '0.4em',
        fontFamily: FONT,
        color: INK,
        border: `0.12em dashed ${over ? ACCENT : `color-mix(in srgb, ${INK} 35%, transparent)`}`,
        background: over ? `color-mix(in srgb, ${ACCENT} 10%, transparent)` : 'transparent',
        borderRadius: 'var(--osd-radius, 16px)',
        cursor: interactive && engine.selected ? 'copy' : undefined,
        ...style,
      }}
    >
      <div
        ref={ref}
        style={{
          fontSize: 'calc(min(40px, 14cqh) * var(--osd-fit, 1))',
          lineHeight: 1.2,
        }}
      >
        {!hideLabel && (
          <div
            style={{ fontWeight: 700, opacity: 0.75, fontSize: '0.8em', margin: '0 0.15em 0.2em' }}
          >
            {zoneLabel(question, zone)}
          </div>
        )}
        {tiles}
      </div>
    </div>
  );
}

export type ItemPoolProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'>;

export function ItemPool({ style, ...rest }: ItemPoolProps) {
  const ctx = useContext(DragDropContext);
  const ref = useRef<HTMLDivElement>(null);
  useFit(ref, 'all');
  if (!ctx) return <div {...rest} style={style} />;
  const { question, interactive, placed, engine, results, previewKey, participant } = ctx;

  let items = question.items;
  if (results) items = [];
  else if (participant) items = items.filter((i) => !placed[i.id]);
  else if (previewKey) items = items.filter((i) => !previewKey[i.id]);

  const over = engine.hover === POOL;
  return (
    <div
      {...rest}
      {...(interactive ? engine.targetProps(POOL) : {})}
      style={{
        boxSizing: 'border-box',
        containerType: 'size',
        overflow: 'hidden',
        padding: '0.4em',
        fontFamily: FONT,
        color: INK,
        borderRadius: 'var(--osd-radius, 16px)',
        background: over
          ? `color-mix(in srgb, ${ACCENT} 10%, transparent)`
          : `color-mix(in srgb, ${INK} 5%, transparent)`,
        ...style,
      }}
    >
      <div
        ref={ref}
        style={{
          fontSize: 'calc(min(40px, 14cqh) * var(--osd-fit, 1))',
          lineHeight: 1.2,
        }}
      >
        {items.map((i) => (
          <Tile
            key={i.id}
            itemId={i.id}
            label={i.label}
            interactive={interactive}
            selected={engine.selected === i.id}
            engine={engine}
          />
        ))}
      </div>
    </div>
  );
}

/** The sorting interface for the phone layout, where the slide is too small to drag on. */
export function useDragDropParticipant(question: DragDropQuestion) {
  const live = useLive();
  const t = useLocale();
  const [failure, setFailure] = useState<string | null>(null);
  const data = live?.data;
  const { placed, ok } = usePlaced(data, question);
  const state = data?.states[question.id]?.state ?? 'locked';
  const submitted = Boolean(data?.mine[question.id]);
  const interactive = Boolean(live) && state === 'open' && !submitted;
  const engine = useDragEngine(question, interactive, (itemId, zoneId) => {
    setFailure(null);
    data?.actions
      .placeTile(question.id, itemId, zoneId)
      .catch((e: unknown) => setFailure(liveErrorMessage(t, e)));
  });
  const submit = () => {
    setFailure(null);
    data?.actions
      .submitPlacements(question.id)
      .catch((e: unknown) => setFailure(liveErrorMessage(t, e)));
  };
  return { state, placed, ok, submitted, interactive, engine, submit, failure };
}

export type DragDropProps = {
  question: DragDropQuestion;
  /** Lay out `<DropZone zone="…" />` and `<ItemPool />` here. */
  children?: ReactNode;
  /** Interface language for this component. Defaults to the app language. */
  language?: PollLanguage;
} & Omit<HTMLAttributes<HTMLDivElement>, 'children'>;

function DragDropInner({ question, children, style, ...rest }: DragDropProps) {
  const live = useLive();
  const t = useLocale();
  useRegisterQuestion(question.id);
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
  const me = useDragDropParticipant(question);

  const noop = () => {};
  const view = live?.view;
  const compact = Boolean(live?.compact);
  const isParticipant = view === 'participant';
  const data = live?.data;
  const st = data?.states[question.id];
  const state = st?.state ?? 'locked';
  const controls = view === 'screen' && !live?.mirror;
  const run = (fn: () => Promise<unknown>) => {
    setFailure(null);
    fn().catch((e: unknown) => setFailure(liveErrorMessage(t, e)));
  };

  const previewKey = !live ? question.correct : undefined;
  const showResultsView = Boolean(live) && !isParticipant && state === 'ended';
  const results =
    showResultsView && data
      ? zoneTiles(
          data.placements,
          question.id,
          question.items.map((i) => i.id),
        )
      : null;
  const correctPairs = (data?.keys[question.id] ?? []).filter((p) => p.includes('>'));

  const ctx: Ctx = {
    question,
    interactive: isParticipant && !compact && me.interactive,
    participant: isParticipant,
    state,
    placed: me.placed,
    results,
    correctPairs,
    showMarks: Boolean(st?.show_results),
    engine: me.engine,
    previewKey,
    tileOk: st?.show_results ? me.ok : {},
  };

  const remaining = st?.ends_at && live ? new Date(st.ends_at).getTime() - live.now : null;
  const countdown =
    state === 'open' && remaining !== null && remaining > 0 ? formatClock(remaining) : null;
  const total =
    live && data ? expectedCount(data.participants, data.answers, question.id, live.now) : 0;
  const answered = data ? answeredCount(data.answers, question.id) : 0;
  const progress = <ProgressBar answered={answered} total={total} large={controls} />;

  let overlay: ReactNode = null;
  if (live && state === 'locked') {
    overlay = (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4cqh',
          zIndex: 5,
          background: 'color-mix(in srgb, var(--osd-bg, #fff) 92%, transparent)',
        }}
      >
        <Padlock
          hint={
            controls
              ? t.live.clickToUnlock
              : isParticipant
                ? t.live.waitingForHostToOpen
                : t.live.locked
          }
          onClick={
            controls
              ? () =>
                  run(
                    () => data?.actions.questionAction(question.id, 'unlock') ?? Promise.resolve(),
                  )
              : undefined
          }
        />
        {controls && (
          <ControlButton
            label={t.live.showAnswers}
            onClick={() =>
              run(async () => {
                await data?.actions.questionAction(question.id, 'end');
                await data?.actions.setShowResults(question.id, true);
              })
            }
          >
            {t.live.showAnswers}
          </ControlButton>
        )}
      </div>
    );
  }

  let footer: ReactNode;
  if (!live) {
    footer = import.meta.env.DEV ? (
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
    );
  } else if (isParticipant) {
    const placedCount = Object.keys(me.placed).length;
    footer = compact ? null : (
      <Footer style={{ gap: 28 }}>
        {countdown && !me.submitted && <Countdown remaining={remaining} size={44} />}
        {state === 'open' && !me.submitted && (
          <>
            <button
              type="button"
              onClick={me.submit}
              style={{
                padding: '14px 30px',
                fontSize: 30,
                fontFamily: FONT,
                fontWeight: 600,
                color: 'var(--osd-bg, #fff)',
                background: ACCENT,
                border: 0,
                borderRadius: 14,
                cursor: 'pointer',
              }}
            >
              {t.live.submitSorting}
            </button>
            <span style={{ fontSize: 26, opacity: 0.7 }}>
              {format(t.live.placedOf, { placed: placedCount, total: question.items.length })}
            </span>
          </>
        )}
        {me.submitted && (
          <span style={{ fontSize: 30, opacity: 0.8 }}>✓ {t.live.submittedSorting}</span>
        )}
        {state === 'ended' && !me.submitted && (
          <span style={{ fontSize: 30, opacity: 0.7 }}>{t.live.answerPeriodEnded}</span>
        )}
        {me.failure && <span style={{ fontSize: 24, color: BAD }}>{me.failure}</span>}
      </Footer>
    );
  } else if (state === 'open') {
    footer = controls ? (
      <HostBar
        remaining={remaining}
        progress={progress}
        onLock={() =>
          run(() => data?.actions.questionAction(question.id, 'lock') ?? Promise.resolve())
        }
        onAddTime={(sec) =>
          run(() => data?.actions.questionAction(question.id, 'add_time', sec) ?? Promise.resolve())
        }
        onStop={() =>
          run(() => data?.actions.questionAction(question.id, 'end') ?? Promise.resolve())
        }
      />
    ) : (
      <Footer style={{ gap: 28 }}>
        {countdown && <Countdown remaining={remaining} size={56} />}
        {progress}
      </Footer>
    );
  } else if (state === 'ended') {
    footer = (
      <Footer>
        {controls && !st?.show_results && (
          <ControlButton
            label={t.live.showResults}
            tone="accent"
            onClick={() =>
              run(() => data?.actions.setShowResults(question.id, true) ?? Promise.resolve())
            }
          >
            {t.live.showResults}
          </ControlButton>
        )}
      </Footer>
    );
  } else {
    footer = <Footer />;
  }

  return (
    <DragDropContext.Provider value={ctx}>
      <div {...rest} style={{ ...rootStyle, gap: 0, ...style }}>
        <div style={{ position: 'relative', flex: '1 1 0', minHeight: 0, containerType: 'size' }}>
          {children}
          {overlay}
        </div>
        {footer}
        {failure && <div style={{ fontSize: 'min(30px, 4cqh)', color: BAD }}>{failure}</div>}
        {me.engine.ghost}
      </div>
    </DragDropContext.Provider>
  );
}

export function DragDrop({ language, ...props }: DragDropProps) {
  return (
    <LanguageScope language={language}>
      <DragDropInner {...props} data-poll-language={language ?? 'en'} />
    </LanguageScope>
  );
}

/** The sorting interface for the phone layout, where the slide itself is too small to drag on. */
export function DragDropCard({ question }: { question: DragDropQuestion }) {
  const live = useLive();
  const t = useLocale();
  const me = useDragDropParticipant(question);
  if (!live) return null;
  const st = live.data.states[question.id];
  const ctx: Ctx = {
    question,
    interactive: me.interactive,
    participant: true,
    state: me.state,
    placed: me.placed,
    results: null,
    correctPairs: [],
    showMarks: Boolean(st?.show_results),
    engine: me.engine,
    previewKey: undefined,
    tileOk: st?.show_results ? me.ok : {},
  };
  const placedCount = Object.keys(me.placed).length;
  return (
    <DragDropContext.Provider value={ctx}>
      <section
        aria-label={question.question}
        style={{ display: 'flex', flexDirection: 'column', gap: 16, color: INK, fontFamily: FONT }}
      >
        {me.state === 'locked' ? (
          <div style={{ opacity: 0.7, fontSize: 18, textAlign: 'center', padding: '24px 0' }}>
            {t.live.waitingForHostToOpen}
          </div>
        ) : (
          <>
            {me.interactive && (
              <div style={{ fontSize: 15, opacity: 0.7 }}>{t.live.sortingHint}</div>
            )}
            {me.interactive && <ItemPool style={{ height: 110 }} />}
            {question.zones.map((z) => (
              <DropZone key={z.id} zone={z.id} style={{ height: 120 }} />
            ))}
            {me.interactive && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <button
                  type="button"
                  onClick={me.submit}
                  style={{
                    padding: '14px 26px',
                    fontSize: 20,
                    fontFamily: FONT,
                    fontWeight: 600,
                    color: 'var(--osd-bg, #fff)',
                    background: ACCENT,
                    border: 0,
                    borderRadius: 12,
                  }}
                >
                  {t.live.submitSorting}
                </button>
                <span style={{ opacity: 0.7, fontSize: 16 }}>
                  {format(t.live.placedOf, { placed: placedCount, total: question.items.length })}
                </span>
              </div>
            )}
            {me.submitted && (
              <div style={{ fontSize: 20, opacity: 0.8 }}>✓ {t.live.submittedSorting}</div>
            )}
          </>
        )}
        {me.failure && <div style={{ fontSize: 16, color: BAD }}>{me.failure}</div>}
        {me.engine.ghost}
      </section>
    </DragDropContext.Provider>
  );
}
