import type { HTMLAttributes, ReactNode } from 'react';
import type { ClockSkin } from '../../lib/tools-store';
import { ClockFace, useNow } from './faces';

export type ClockSlideProps = {
  /** Look of the clock: `analog`, `digital`, `flip` or `minimal`. Default `analog`. */
  skin?: ClockSkin;
  /** Heading above the clock, for example "Back at 10:45". */
  title?: ReactNode;
  /** An IANA zone such as `America/Toronto`. Defaults to the device's zone. */
  timeZone?: string;
  /** Show today's date under the clock. */
  showDate?: boolean;
} & Omit<HTMLAttributes<HTMLDivElement>, 'title'>;

export function ClockSlide({
  skin = 'analog',
  title,
  timeZone,
  showDate,
  style,
  ...rest
}: ClockSlideProps) {
  const now = useNow(1000);
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
      <div style={{ flex: '1 1 0', minHeight: 0, width: '100%' }}>
        <ClockFace skin={skin} now={now} timeZone={timeZone} showDate={showDate} />
      </div>
    </div>
  );
}
