import type { CSSProperties, HTMLAttributes } from 'react';
import { LanguageScope, type PollLanguage } from '../lib/locale-store';
import { useLocale } from '../lib/use-locale';
import { classAverage, pct, placementScores, studentResults } from './derive';
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
  gap: u(36),
  textAlign: 'center',
  containerType: 'size',
  background: 'var(--osd-bg, #ffffff)',
  color: 'var(--osd-text, #0f172a)',
  fontFamily: 'var(--osd-font-body, system-ui, sans-serif)',
};

const big: CSSProperties = {
  fontSize: u(260),
  fontWeight: 800,
  lineHeight: 1,
  color: 'var(--osd-accent, #2563eb)',
};

export type ClassResultsProps = { title?: string; language?: PollLanguage } & Omit<
  HTMLAttributes<HTMLDivElement>,
  'title' | 'children'
>;

function ClassResultsInner({ title: titleProp, style, ...rest }: ClassResultsProps) {
  const live = useLive();
  const t = useLocale();
  useQuestionRegistryFlag('results');
  const title = titleProp ?? t.live.results;

  if (!live) {
    return (
      <div {...rest} style={{ ...frame, ...style }}>
        <h1 style={{ margin: 0, fontSize: u(120) }}>{title}</h1>
        <div style={{ fontSize: u(44), opacity: 0.6 }}>{t.live.classResultsPlaceholder}</div>
      </div>
    );
  }

  const { data, view } = live;

  if (view === 'participant') {
    const mine = data.score;
    return (
      <div {...rest} style={{ ...frame, ...style }}>
        <h1 style={{ margin: 0, fontSize: u(96) }}>{title}</h1>
        <div style={big}>{mine && mine.graded > 0 ? `${mine.correct}/${mine.graded}` : '—'}</div>
        <div style={{ fontSize: u(44), opacity: 0.7 }}>{t.live.yourScore}</div>
        <div style={{ fontSize: u(52) }}>
          {t.live.classAverage} · {pct(mine?.class_average ?? null)}
        </div>
      </div>
    );
  }

  const average = classAverage(
    studentResults(
      data.participants,
      data.answers,
      placementScores(data.placements, data.answers, data.keys, data.states),
    ),
  );
  return (
    <div {...rest} style={{ ...frame, ...style }}>
      <h1 style={{ margin: 0, fontSize: u(96) }}>{title}</h1>
      <div style={big}>{pct(average)}</div>
      <div style={{ fontSize: u(52), opacity: 0.7 }}>{t.live.classAverage}</div>
    </div>
  );
}

export function ClassResults({ language, ...props }: ClassResultsProps) {
  return (
    <LanguageScope language={language}>
      <ClassResultsInner {...props} data-poll-language={language ?? 'en'} />
    </LanguageScope>
  );
}
