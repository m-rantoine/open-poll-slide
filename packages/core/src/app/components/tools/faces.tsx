import { type CSSProperties, type ReactNode, useEffect, useState } from 'react';
import type { ClockSkin, TimerSkin } from '../../lib/tools-store';

const INK = 'var(--osd-text, #0f172a)';
const ACCENT = 'var(--osd-accent, #2563eb)';
const BG = 'var(--osd-bg, #ffffff)';
const ALERT = '#dc2626';
const FONT = 'var(--osd-font-display, var(--osd-font-body, system-ui, sans-serif))';
const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';

export const URGENT_MS = 10_000;

const KEYFRAMES =
  '@keyframes osd-tool-pulse{0%,100%{opacity:1}50%{opacity:.45}}@keyframes osd-tool-flash{0%,100%{opacity:1}50%{opacity:.15}}@media(prefers-reduced-motion:reduce){[data-osd-tool-anim]{animation:none!important}}';

export function ToolStyles() {
  return <style>{KEYFRAMES}</style>;
}

export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function formatTimer(ms: number): { text: string; parts: string[] } {
  const total = Math.ceil(Math.max(0, ms) / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const two = (n: number) => String(n).padStart(2, '0');
  const parts = h > 0 ? [two(h), two(m), two(s)] : [two(m), two(s)];
  return { text: parts.join(':'), parts };
}

const fill: CSSProperties = {
  width: '100%',
  height: '100%',
  containerType: 'size',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxSizing: 'border-box',
  color: INK,
  fontFamily: FONT,
};

function FlipCard({ char, urgent }: { char: string; urgent?: boolean }) {
  return (
    <span
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '0.72em',
        height: '1.05em',
        margin: '0 0.04em',
        borderRadius: '0.12em',
        background: `color-mix(in srgb, ${INK} 88%, ${BG})`,
        color: urgent ? ALERT : BG,
        fontFamily: FONT,
        fontWeight: 700,
        fontVariantNumeric: 'tabular-nums',
        boxShadow: '0 0.04em 0.1em rgba(0,0,0,0.3)',
      }}
    >
      {char}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: '50%',
          height: '0.02em',
          background: `color-mix(in srgb, ${BG} 55%, transparent)`,
        }}
      />
    </span>
  );
}

function FlipDigits({ parts, urgent }: { parts: string[]; urgent?: boolean }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center' }}>
      {parts.map((part, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: positions are fixed (hours, minutes, seconds)
        <span key={i} style={{ display: 'inline-flex', alignItems: 'center' }}>
          {i > 0 && <span style={{ margin: '0 0.12em', opacity: 0.7 }}>:</span>}
          {part.split('').map((c, j) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: digit slots are fixed
            <FlipCard key={j} char={c} urgent={urgent} />
          ))}
        </span>
      ))}
    </span>
  );
}

export type TimerFaceProps = {
  skin: TimerSkin;
  remainingMs: number;
  totalMs: number;
  /** Shown instead of the numbers' caption once the timer reaches zero. */
  doneText?: ReactNode;
  caption?: ReactNode;
  style?: CSSProperties;
};

export function TimerFace({
  skin,
  remainingMs,
  totalMs,
  doneText,
  caption,
  style,
}: TimerFaceProps) {
  const done = remainingMs <= 0;
  const urgent = !done && remainingMs <= URGENT_MS;
  const { text, parts } = formatTimer(remainingMs);
  const colour = done || urgent ? ALERT : undefined;
  const anim = done
    ? 'osd-tool-flash 1s ease-in-out infinite'
    : urgent
      ? 'osd-tool-pulse 1s ease-in-out infinite'
      : undefined;
  const fraction = totalMs > 0 ? Math.min(1, Math.max(0, remainingMs / totalMs)) : 0;
  const note = done ? (doneText ?? caption) : caption;
  const noteEl = note ? (
    <div style={{ fontSize: 'min(5cqw, 9cqh)', opacity: 0.7, marginTop: '2cqh' }}>{note}</div>
  ) : null;

  if (skin === 'ring') {
    const r = 46;
    const c = 2 * Math.PI * r;
    return (
      <div style={{ ...fill, ...style }}>
        <ToolStyles />
        <div style={{ position: 'relative', height: '100%', aspectRatio: '1', maxWidth: '100%' }}>
          <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }} role="img">
            <title>{text}</title>
            <circle
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke={`color-mix(in srgb, ${INK} 14%, transparent)`}
              strokeWidth="5"
            />
            <circle
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke={colour ?? ACCENT}
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={c * (1 - fraction)}
              transform="rotate(-90 50 50)"
              style={{ transition: 'stroke-dashoffset 400ms linear' }}
            />
          </svg>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              data-osd-tool-anim
              style={{
                fontFamily: MONO,
                fontWeight: 700,
                fontVariantNumeric: 'tabular-nums',
                fontSize: 'min(24cqw, 24cqh)',
                color: colour,
                animation: anim,
              }}
            >
              {text}
            </div>
            {noteEl}
          </div>
        </div>
      </div>
    );
  }

  if (skin === 'bar') {
    return (
      <div style={{ ...fill, flexDirection: 'column', gap: '6cqh', ...style }}>
        <ToolStyles />
        <div
          data-osd-tool-anim
          style={{
            fontWeight: 800,
            fontVariantNumeric: 'tabular-nums',
            fontSize: 'min(26cqw, 48cqh)',
            lineHeight: 1,
            color: colour,
            animation: anim,
          }}
        >
          {text}
        </div>
        <div
          style={{
            width: '86%',
            height: '8cqh',
            borderRadius: 999,
            overflow: 'hidden',
            background: `color-mix(in srgb, ${INK} 14%, transparent)`,
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${fraction * 100}%`,
              background: colour ?? ACCENT,
              transition: 'width 400ms linear',
            }}
          />
        </div>
        {noteEl}
      </div>
    );
  }

  if (skin === 'flip') {
    return (
      <div style={{ ...fill, flexDirection: 'column', ...style }}>
        <ToolStyles />
        <div
          data-osd-tool-anim
          style={{
            fontSize: 'min(24cqw, 52cqh)',
            lineHeight: 1,
            animation: anim,
          }}
        >
          <FlipDigits parts={parts} urgent={urgent || done} />
        </div>
        {noteEl}
      </div>
    );
  }

  return (
    <div style={{ ...fill, flexDirection: 'column', ...style }}>
      <ToolStyles />
      <div
        data-osd-tool-anim
        style={{
          fontFamily: MONO,
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          fontSize: 'min(28cqw, 60cqh)',
          lineHeight: 1,
          color: colour ?? INK,
          textShadow: colour
            ? undefined
            : `0 0 0.35em color-mix(in srgb, ${ACCENT} 45%, transparent)`,
          animation: anim,
        }}
      >
        {text}
      </div>
      {noteEl}
    </div>
  );
}

export type ClockFaceProps = {
  skin: ClockSkin;
  now: number;
  timeZone?: string;
  showDate?: boolean;
  style?: CSSProperties;
};

function zoned(now: number, timeZone?: string) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(now));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return { h: get('hour'), m: get('minute'), s: get('second') };
}

export function ClockFace({ skin, now, timeZone, showDate, style }: ClockFaceProps) {
  const { h, m, s } = zoned(now, timeZone);
  const two = (n: number) => String(n).padStart(2, '0');
  const date = showDate
    ? new Intl.DateTimeFormat(undefined, {
        timeZone,
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      }).format(new Date(now))
    : null;
  const dateEl = date ? (
    <div style={{ fontSize: 'min(5cqw, 9cqh)', opacity: 0.7, marginTop: '3cqh' }}>{date}</div>
  ) : null;

  if (skin === 'analog') {
    const hourAngle = ((h % 12) + m / 60) * 30;
    const minuteAngle = (m + s / 60) * 6;
    const secondAngle = s * 6;
    const ticks = Array.from({ length: 60 }, (_, i) => i);
    return (
      <div style={{ ...fill, flexDirection: 'column', ...style }}>
        <div style={{ height: date ? '82%' : '100%', aspectRatio: '1', maxWidth: '100%' }}>
          <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }} role="img">
            <title>{`${two(h)}:${two(m)}:${two(s)}`}</title>
            <circle
              cx="50"
              cy="50"
              r="47"
              fill={`color-mix(in srgb, ${INK} 4%, ${BG})`}
              stroke={INK}
              strokeWidth="1.6"
            />
            {ticks.map((i) => {
              const major = i % 5 === 0;
              return (
                <line
                  key={i}
                  x1="50"
                  y1={major ? 6 : 8}
                  x2="50"
                  y2={major ? 12 : 10}
                  stroke={INK}
                  strokeWidth={major ? 1.4 : 0.5}
                  transform={`rotate(${i * 6} 50 50)`}
                />
              );
            })}
            {[12, 3, 6, 9].map((n) => {
              const angle = ((n % 12) * 30 * Math.PI) / 180;
              return (
                <text
                  key={n}
                  x={50 + Math.sin(angle) * 33}
                  y={50 - Math.cos(angle) * 33 + 3.6}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="700"
                  fill={INK}
                  fontFamily={FONT}
                >
                  {n}
                </text>
              );
            })}
            <line
              x1="50"
              y1="50"
              x2="50"
              y2="28"
              stroke={INK}
              strokeWidth="3.4"
              strokeLinecap="round"
              transform={`rotate(${hourAngle} 50 50)`}
            />
            <line
              x1="50"
              y1="50"
              x2="50"
              y2="16"
              stroke={INK}
              strokeWidth="2.2"
              strokeLinecap="round"
              transform={`rotate(${minuteAngle} 50 50)`}
            />
            <line
              x1="50"
              y1="58"
              x2="50"
              y2="12"
              stroke={ACCENT}
              strokeWidth="1"
              strokeLinecap="round"
              transform={`rotate(${secondAngle} 50 50)`}
            />
            <circle cx="50" cy="50" r="2.4" fill={ACCENT} />
          </svg>
        </div>
        {dateEl}
      </div>
    );
  }

  if (skin === 'flip') {
    return (
      <div style={{ ...fill, flexDirection: 'column', ...style }}>
        <div style={{ fontSize: 'min(24cqw, 52cqh)', lineHeight: 1 }}>
          <FlipDigits parts={[two(h), two(m)]} />
        </div>
        {dateEl}
      </div>
    );
  }

  if (skin === 'minimal') {
    return (
      <div style={{ ...fill, flexDirection: 'column', ...style }}>
        <div
          style={{
            fontWeight: 200,
            letterSpacing: '0.02em',
            fontVariantNumeric: 'tabular-nums',
            fontSize: 'min(30cqw, 56cqh)',
            lineHeight: 1,
          }}
        >
          {two(h)}
          <span style={{ opacity: 0.45 }}>:</span>
          {two(m)}
        </div>
        {dateEl}
      </div>
    );
  }

  return (
    <div style={{ ...fill, flexDirection: 'column', ...style }}>
      <div
        style={{
          fontFamily: MONO,
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          fontSize: 'min(24cqw, 52cqh)',
          lineHeight: 1,
          textShadow: `0 0 0.35em color-mix(in srgb, ${ACCENT} 45%, transparent)`,
        }}
      >
        {two(h)}:{two(m)}
        <span style={{ fontSize: '0.5em', opacity: 0.6 }}>:{two(s)}</span>
      </div>
      {dateEl}
    </div>
  );
}
