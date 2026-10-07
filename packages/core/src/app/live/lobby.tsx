import type { CSSProperties } from 'react';
import { useLive, useQuestionRegistryFlag } from './live-context';

const frame: CSSProperties = {
  width: '100%',
  height: '100%',
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 40,
  textAlign: 'center',
  background: 'var(--osd-bg, #ffffff)',
  color: 'var(--osd-text, #0f172a)',
  fontFamily: 'var(--osd-font-body, system-ui, sans-serif)',
};

export function joinUrl(): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${window.location.origin}${base}/join`;
}

export function Lobby({ title = 'Welcome' }: { title?: string }) {
  const live = useLive();
  useQuestionRegistryFlag('lobby');

  if (!live) {
    return (
      <div style={frame}>
        <h1 style={{ margin: 0, fontSize: 120 }}>{title}</h1>
        <div style={{ fontSize: 44, opacity: 0.6 }}>Lobby — appears during live sessions</div>
      </div>
    );
  }

  const { data, view } = live;
  const code = data.session?.code ?? '';

  if (view === 'participant') {
    return (
      <div style={frame}>
        <h1 style={{ margin: 0, fontSize: 96 }}>You're in!</h1>
        <div style={{ fontSize: 44, opacity: 0.7 }}>
          {data.session?.mode === 'self'
            ? 'Use the arrows to move through the slides at your own pace.'
            : 'Waiting for your host to begin…'}
        </div>
        <div style={{ fontSize: 56, fontWeight: 700, letterSpacing: '0.2em' }}>{code}</div>
      </div>
    );
  }

  return (
    <div style={frame}>
      <h1 style={{ margin: 0, fontSize: 120, fontFamily: 'var(--osd-font-display, inherit)' }}>
        {title}
      </h1>
      <div style={{ fontSize: 52 }}>
        Go to <strong>{joinUrl().replace(/^https?:\/\//, '')}</strong> and enter
      </div>
      <div
        style={{
          fontSize: 220,
          fontWeight: 800,
          letterSpacing: '0.18em',
          paddingLeft: '0.18em',
          color: 'var(--osd-accent, #2563eb)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {code}
      </div>
      <div style={{ fontSize: 56 }}>
        {data.participants.length} {data.participants.length === 1 ? 'student' : 'students'} in the
        lobby
      </div>
    </div>
  );
}
