import type { CSSProperties } from 'react';
import { useLocale } from '../lib/use-locale';
import { classAverage, pct, studentResults } from './derive';
import { useLive, useQuestionRegistryFlag } from './live-context';

const frame: CSSProperties = {
  width: '100%',
  height: '100%',
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 36,
  textAlign: 'center',
  background: 'var(--osd-bg, #ffffff)',
  color: 'var(--osd-text, #0f172a)',
  fontFamily: 'var(--osd-font-body, system-ui, sans-serif)',
};

const big: CSSProperties = {
  fontSize: 260,
  fontWeight: 800,
  lineHeight: 1,
  color: 'var(--osd-accent, #2563eb)',
};

export function ClassResults({ title: titleProp }: { title?: string }) {
  const live = useLive();
  const t = useLocale();
  useQuestionRegistryFlag('results');
  const title = titleProp ?? t.live.results;

  if (!live) {
    return (
      <div style={frame}>
        <h1 style={{ margin: 0, fontSize: 120 }}>{title}</h1>
        <div style={{ fontSize: 44, opacity: 0.6 }}>{t.live.classResultsPlaceholder}</div>
      </div>
    );
  }

  const { data, view } = live;

  if (view === 'participant') {
    const mine = data.score;
    return (
      <div style={frame}>
        <h1 style={{ margin: 0, fontSize: 96 }}>{title}</h1>
        <div style={big}>{mine && mine.graded > 0 ? `${mine.correct}/${mine.graded}` : '—'}</div>
        <div style={{ fontSize: 44, opacity: 0.7 }}>{t.live.yourScore}</div>
        <div style={{ fontSize: 52 }}>
          {t.live.classAverage} · {pct(mine?.class_average ?? null)}
        </div>
      </div>
    );
  }

  const average = classAverage(studentResults(data.participants, data.answers));
  return (
    <div style={frame}>
      <h1 style={{ margin: 0, fontSize: 96 }}>{title}</h1>
      <div style={big}>{pct(average)}</div>
      <div style={{ fontSize: 52, opacity: 0.7 }}>{t.live.classAverage}</div>
    </div>
  );
}
