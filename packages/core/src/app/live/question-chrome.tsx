import { Lock, LockOpen, Square } from 'lucide-react';
import {
  type ButtonHTMLAttributes,
  type CSSProperties,
  type ReactNode,
  type RefObject,
  useLayoutEffect,
  useRef,
} from 'react';
import { format, useLocale } from '../lib/use-locale';
import { formatClock } from './derive';
import { ACCENT, BAD, BG, FONT, INK } from './question-style';

export const rootStyle: CSSProperties = {
  flex: '1 1 0',
  width: '100%',
  height: '100%',
  minHeight: 0,
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  gap: '3cqh',
  color: INK,
  fontFamily: FONT,
  containerType: 'size',
  overflow: 'hidden',
};

export const fitStyle: CSSProperties = {
  flex: '1 1 0',
  minHeight: 0,
  minWidth: 0,
  containerType: 'size',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};

export function Fit({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ ...fitStyle, ...style }}>{children}</div>;
}

export const rowFont = (n: number, max: number) =>
  `calc(min(${max}px, ${30 / Math.max(1, n)}cqh) * var(--osd-fit, 1))`;

const MIN_FONT_PX = 8;

export function useShrinkToFit(ref: RefObject<HTMLElement | null>, bound: 'self' | 'parent') {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const container = bound === 'parent' ? el.parentElement : el;
    if (!container) return;
    const overflows = () =>
      bound === 'parent'
        ? el.offsetHeight > container.clientHeight + 1 || el.scrollWidth > container.clientWidth + 1
        : el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1;
    const fit = () => {
      el.style.removeProperty('--osd-fit');
      const base = parseFloat(getComputedStyle(el).fontSize);
      let factor = 1;
      while (overflows() && base * factor > MIN_FONT_PX) {
        factor *= 0.94;
        el.style.setProperty('--osd-fit', String(factor));
      }
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(container);
    return () => observer.disconnect();
  });
}

export function FitBox({
  as: Tag = 'div',
  ...props
}: { as?: 'div' | 'button' } & ButtonHTMLAttributes<HTMLElement>) {
  const ref = useRef<HTMLElement>(null);
  useShrinkToFit(ref, 'self');
  // biome-ignore lint/suspicious/noExplicitAny: shared ref for div and button
  return <Tag {...(props as any)} ref={ref as any} />;
}

export function ControlButton({
  children,
  onClick,
  label,
  tone = 'ink',
  ghost,
}: {
  children: ReactNode;
  onClick: () => void;
  label: string;
  tone?: 'ink' | 'accent' | 'danger';
  ghost?: boolean;
}) {
  const bg = tone === 'accent' ? ACCENT : tone === 'danger' ? BAD : INK;
  const Tag = ghost ? 'span' : 'button';
  return (
    <Tag
      {...(ghost ? { 'aria-hidden': true } : { type: 'button', 'aria-label': label, onClick })}
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
    </Tag>
  );
}

const FOOTER_H = 88;

export function Footer({ children, style }: { children?: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        height: FOOTER_H,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 20,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function HostBar({
  remaining,
  progress,
  onLock,
  onAddTime,
  onStop,
  ghost,
}: {
  ghost?: boolean;
  remaining: number | null;
  progress: ReactNode;
  onLock: () => void;
  onAddTime: (seconds: number) => void;
  onStop: () => void;
}) {
  const t = useLocale();
  return (
    <Footer>
      <ControlButton ghost={ghost} label={t.live.lockQuestion} onClick={onLock}>
        <LockOpen size={32} />
      </ControlButton>
      {[15, 30, 60].map((s) => (
        <ControlButton
          key={s}
          ghost={ghost}
          label={format(t.live.addSeconds, { n: s })}
          tone="accent"
          onClick={() => onAddTime(s)}
        >
          +{s}s
        </ControlButton>
      ))}
      <Countdown remaining={remaining} size={56} style={{ marginLeft: 8 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1, minWidth: 0 }}>
        {progress}
        <ControlButton ghost={ghost} label={t.live.stopAnswering} tone="danger" onClick={onStop}>
          <Square size={28} fill="currentColor" />
          {t.live.stop}
        </ControlButton>
      </div>
    </Footer>
  );
}

const URGENT_MS = 10_000;

export function Countdown({
  remaining,
  size,
  style,
}: {
  remaining: number | null;
  size: number;
  style?: CSSProperties;
}) {
  const shown = remaining !== null && remaining > 0;
  const urgent = shown && remaining <= URGENT_MS;
  return (
    <span
      aria-hidden={!shown}
      style={{
        display: 'inline-block',
        minWidth: '5ch',
        textAlign: 'right',
        fontSize: size,
        fontVariantNumeric: 'tabular-nums',
        visibility: shown ? 'visible' : 'hidden',
        color: urgent ? BAD : undefined,
        animation: urgent ? 'osd-countdown-pulse 1s ease-in-out infinite' : undefined,
        ...style,
      }}
    >
      <style>
        {
          '@keyframes osd-countdown-pulse{0%,100%{opacity:1}50%{opacity:.45}}@media(prefers-reduced-motion:reduce){[style*="osd-countdown-pulse"]{animation:none!important}}'
        }
      </style>
      {shown ? formatClock(remaining) : '0:00'}
    </span>
  );
}

export function Padlock({ onClick, hint }: { onClick?: () => void; hint: string }) {
  const content = (
    <>
      <Lock strokeWidth={1.5} style={{ width: 'min(260px, 40cqh)', height: 'min(260px, 40cqh)' }} />
      <span style={{ fontSize: 'min(40px, 6cqh)', opacity: 0.7 }}>{hint}</span>
    </>
  );
  const style: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '3cqh',
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

export function ProgressBar({
  answered,
  total,
  large,
}: {
  answered: number;
  total: number;
  large: boolean;
}) {
  return (
    <>
      <div
        style={{
          flex: 1,
          minWidth: 60,
          height: large ? 20 : 40,
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
      <span style={{ fontSize: large ? 32 : 36, fontVariantNumeric: 'tabular-nums' }}>
        {answered} / {total}
      </span>
    </>
  );
}
