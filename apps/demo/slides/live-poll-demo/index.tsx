import {
  ClassResults,
  type DesignSystem,
  Lobby,
  MultipleChoice,
  type MultipleChoiceQuestion,
  type Page,
  type SlideMeta,
} from '@open-slide/core';

export const meta: SlideMeta = { title: 'Live poll demo', createdAt: '2026-10-07T00:00:00.000Z' };

export const design: DesignSystem = {
  palette: { bg: '#ffffff', text: '#0f172a', accent: '#2563eb' },
  fonts: {
    display: 'system-ui, -apple-system, "Segoe UI", sans-serif',
    body: 'system-ui, -apple-system, "Segoe UI", sans-serif',
  },
  typeScale: { hero: 140, body: 36 },
  radius: 16,
};

export const questions = {
  capital: {
    id: 'capital',
    type: 'multiple_choice',
    question: 'What is the capital of Canada?',
    options: [
      { id: 'toronto', label: 'Toronto' },
      { id: 'ottawa', label: 'Ottawa' },
      { id: 'montreal', label: 'Montréal' },
    ],
    correct: ['ottawa'],
    startLocked: true,
    showResults: true,
  },
  favourite: {
    id: 'favourite',
    type: 'multiple_choice',
    question: 'Which season do you like best?',
    options: [
      { id: 'winter', label: 'Winter' },
      { id: 'summer', label: 'Summer' },
      { id: 'autumn', label: 'Autumn' },
    ],
    startLocked: true,
    showResults: true,
  },
} satisfies Record<string, MultipleChoiceQuestion>;

const Cover: Page = () => (
  <div
    style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      padding: '0 160px',
      gap: 24,
      background: 'var(--osd-bg)',
      color: 'var(--osd-text)',
      fontFamily: 'var(--osd-font-body)',
    }}
  >
    <h1
      style={{ margin: 0, fontSize: 'var(--osd-size-hero)', fontFamily: 'var(--osd-font-display)' }}
    >
      Live poll demo
    </h1>
    <p style={{ margin: 0, fontSize: 48, opacity: 0.6 }}>Interactive questions, Pear Deck style.</p>
  </div>
);

export default [
  () => <Lobby title="Live poll demo" />,
  Cover,
  () => <MultipleChoice question={questions.capital} />,
  () => <MultipleChoice question={questions.favourite} />,
  () => <ClassResults />,
] satisfies Page[];
