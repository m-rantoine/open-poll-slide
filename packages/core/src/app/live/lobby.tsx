import type { CSSProperties, HTMLAttributes } from 'react';
import { LanguageScope, type PollLanguage } from '../lib/locale-store';
import { format, plural, useLocale } from '../lib/use-locale';
import { isParticipantConnected } from './derive';
import { useLive, useQuestionRegistryFlag } from './live-context';

const u = (px: number) => `${(px / 10.8).toFixed(2)}cqmin`;

const frame: CSSProperties = {
  width: '100%',
  height: '100%',
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: u(40),
  textAlign: 'center',
  containerType: 'size',
  background: 'var(--osd-bg, #ffffff)',
  color: 'var(--osd-text, #0f172a)',
  fontFamily: 'var(--osd-font-body, system-ui, sans-serif)',
};

export function joinUrl(): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${window.location.origin}${base}/join`;
}

export type LobbyProps = { title?: string; language?: PollLanguage } & Omit<
  HTMLAttributes<HTMLDivElement>,
  'title' | 'children'
>;

function LobbyInner({ title: titleProp, style, ...rest }: LobbyProps) {
  const live = useLive();
  const t = useLocale();
  useQuestionRegistryFlag('lobby');
  const title = titleProp ?? t.live.welcome;

  if (!live) {
    return (
      <div {...rest} style={{ ...frame, ...style }}>
        <h1 style={{ margin: 0, fontSize: u(120) }}>{title}</h1>
        <div style={{ fontSize: u(44), opacity: 0.6 }}>{t.live.lobbyPlaceholder}</div>
      </div>
    );
  }

  const { data, view, now } = live;
  const code = data.session?.code ?? '';
  const present = data.participants.filter((p) => isParticipantConnected(p, now)).length;

  if (view === 'participant') {
    return (
      <div {...rest} style={{ ...frame, ...style }}>
        <h1 style={{ margin: 0, fontSize: u(96) }}>{t.live.youreIn}</h1>
        <div style={{ fontSize: u(44), opacity: 0.7 }}>
          {data.session?.mode === 'self' ? t.live.selfPacedHint : t.live.waitingForHostToBegin}
        </div>
        <div style={{ fontSize: u(56), fontWeight: 700, letterSpacing: '0.2em' }}>{code}</div>
      </div>
    );
  }

  return (
    <div {...rest} style={{ ...frame, ...style }}>
      <h1 style={{ margin: 0, fontSize: u(120), fontFamily: 'var(--osd-font-display, inherit)' }}>
        {title}
      </h1>
      <div style={{ fontSize: u(52) }}>
        {t.live.goToPrefix}
        <strong>{joinUrl().replace(/^https?:\/\//, '')}</strong>
        {t.live.goToSuffix}
      </div>
      <div
        style={{
          fontSize: u(220),
          fontWeight: 800,
          letterSpacing: '0.18em',
          paddingLeft: '0.18em',
          color: 'var(--osd-accent, #2563eb)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {code}
      </div>
      <div style={{ fontSize: u(56) }}>
        {format(plural(present, t.live.studentsInLobby), { count: present })}
      </div>
    </div>
  );
}

export function Lobby({ language, ...props }: LobbyProps) {
  return (
    <LanguageScope language={language}>
      <LobbyInner {...props} data-poll-language={language ?? 'en'} />
    </LanguageScope>
  );
}
