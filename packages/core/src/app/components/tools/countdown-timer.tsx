import { type HTMLAttributes, type ReactNode, useEffect, useRef, useState } from 'react';
import { playChime } from '../../lib/chime';
import { parseDuration } from '../../lib/duration';
import { useIsActivePage } from '../../lib/step-context';
import type { TimerSkin } from '../../lib/tools-store';
import { useLocale } from '../../lib/use-locale';
import { TimerFace, useNow } from './faces';

export type CountdownTimerProps = {
  /** Seconds, or `'m:ss'` / `'h:mm:ss'`. */
  duration: number | string;
  /** Look of the timer: `digital`, `ring`, `bar` or `flip`. Default `digital`. */
  skin?: TimerSkin;
  /** Heading above the timer, for example "Break". */
  title?: ReactNode;
  /** Line under the timer, for example "Back at 10:45". */
  subtitle?: ReactNode;
  /** Start when the slide appears. Default true. Click the timer to pause or resume. */
  autoStart?: boolean;
  /** Play a chime at zero. Default true. */
  sound?: boolean;
} & Omit<HTMLAttributes<HTMLDivElement>, 'title'>;

export function CountdownTimer({
  duration,
  skin = 'digital',
  title,
  subtitle,
  autoStart = true,
  sound = true,
  style,
  ...rest
}: CountdownTimerProps) {
  const t = useLocale();
  const active = useIsActivePage();
  const total = parseDuration(duration);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [pausedMs, setPausedMs] = useState<number | null>(null);
  const now = useNow(250);
  const chimed = useRef(false);

  // Each visit starts over; leaving the slide stops it.
  useEffect(() => {
    chimed.current = false;
    if (active && autoStart) {
      setEndsAt(Date.now() + total);
      setPausedMs(null);
    } else {
      setEndsAt(null);
      setPausedMs(null);
    }
  }, [active, autoStart, total]);

  const remaining = endsAt !== null ? Math.max(0, endsAt - now) : (pausedMs ?? total);
  const running = endsAt !== null && remaining > 0;

  useEffect(() => {
    if (active && sound && endsAt !== null && remaining <= 0 && !chimed.current) {
      chimed.current = true;
      playChime();
    }
  }, [active, sound, endsAt, remaining]);

  const toggle = () => {
    if (!active) return;
    if (running) {
      setPausedMs(Math.max(0, (endsAt ?? 0) - Date.now()));
      setEndsAt(null);
    } else if (remaining > 0) {
      setEndsAt(Date.now() + remaining);
      setPausedMs(null);
    } else {
      chimed.current = false;
      setEndsAt(Date.now() + total);
    }
  };

  return (
    <div
      {...rest}
      style={{
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        padding: '80px 128px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 32,
        background: 'var(--osd-bg, #fff)',
        color: 'var(--osd-text, #0f172a)',
        fontFamily: 'var(--osd-font-body, system-ui, sans-serif)',
        ...style,
      }}
    >
      {title && (
        <h1
          style={{
            margin: 0,
            fontFamily: 'var(--osd-font-display, inherit)',
            fontSize: 96,
            lineHeight: 1.1,
            fontWeight: 800,
            letterSpacing: '-0.01em',
          }}
        >
          {title}
        </h1>
      )}
      <button
        type="button"
        onClick={toggle}
        aria-label={running ? t.tools.timerPause : t.tools.timerStart}
        style={{
          flex: '1 1 0',
          minHeight: 0,
          width: '100%',
          padding: 0,
          border: 0,
          background: 'transparent',
          color: 'inherit',
          font: 'inherit',
          cursor: active ? 'pointer' : 'default',
        }}
      >
        <TimerFace skin={skin} remainingMs={remaining} totalMs={total} doneText={t.tools.timesUp} />
      </button>
      {subtitle && <div style={{ fontSize: 44, opacity: 0.75 }}>{subtitle}</div>}
    </div>
  );
}
