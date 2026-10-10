import {
  type DesignSystem,
  type InteractiveQuestion,
  NumberAnswer,
  OpenText,
  type Page,
  Points,
  Ranking,
  Scale,
  type SlideMeta,
} from '@open-slide/core';

export const meta: SlideMeta = {
  title: 'More question types',
  createdAt: '2026-10-11T00:00:00.000Z',
};

export const design: DesignSystem = {
  palette: { bg: '#fffaf0', text: '#1f2937', accent: '#c8102e' },
  fonts: {
    display: 'system-ui, -apple-system, sans-serif',
    body: 'system-ui, -apple-system, sans-serif',
  },
  typeScale: { hero: 160, body: 40 },
  radius: 16,
};

export const questions = {
  confidence: {
    id: 'confidence',
    type: 'scale',
    question: 'How confident do you feel about each topic?',
    min: 1,
    max: 5,
    minLabel: 'Not at all',
    maxLabel: 'Very confident',
    items: [
      { id: 'fractions', label: 'Fractions' },
      { id: 'decimals', label: 'Decimals' },
      { id: 'percent', label: 'Percentages' },
    ],
    startLocked: true,
    showResults: true,
  },
  planets: {
    id: 'planets',
    type: 'ranking',
    question: 'Put these planets in order from the Sun.',
    items: [
      { id: 'earth', label: 'Earth' },
      { id: 'mars', label: 'Mars' },
      { id: 'mercury', label: 'Mercury' },
      { id: 'venus', label: 'Venus' },
    ],
    correct: ['mercury', 'venus', 'earth', 'mars'],
    startLocked: true,
    showResults: true,
  },
  budget: {
    id: 'budget',
    type: 'points',
    question: 'You have 100 points. Spend them on what matters most for the trip.',
    total: 100,
    items: [
      { id: 'food', label: 'Food' },
      { id: 'sights', label: 'Sights' },
      { id: 'hotel', label: 'Hotel' },
    ],
    startLocked: true,
    showResults: true,
  },
  howmany: {
    id: 'howmany',
    type: 'number',
    question: 'How many provinces and territories does Canada have?',
    correct: 13,
    startLocked: true,
    showResults: true,
  },
  why: {
    id: 'why',
    type: 'open_text',
    question: 'In a sentence: what is one thing you want to remember from today?',
    startLocked: true,
    showResults: true,
  },
} satisfies Record<string, InteractiveQuestion>;

export default [
  () => (
    <div
      style={{
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        padding: '80px 128px',
        gap: 48,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--osd-bg)',
        color: 'var(--osd-text)',
        fontFamily: 'var(--osd-font-body)',
      }}
    >
      <h1
        style={{
          margin: 0,
          fontFamily: 'var(--osd-font-display)',
          fontSize: 64,
          lineHeight: 1.1,
          fontWeight: 700,
          letterSpacing: '-0.01em',
        }}
      >
        {questions.confidence.question}
      </h1>
      <Scale question={questions.confidence} />
    </div>
  ),
  () => (
    <div
      style={{
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        padding: '80px 128px',
        gap: 48,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--osd-bg)',
        color: 'var(--osd-text)',
        fontFamily: 'var(--osd-font-body)',
      }}
    >
      <h1
        style={{
          margin: 0,
          fontFamily: 'var(--osd-font-display)',
          fontSize: 64,
          lineHeight: 1.1,
          fontWeight: 700,
          letterSpacing: '-0.01em',
        }}
      >
        {questions.planets.question}
      </h1>
      <Ranking question={questions.planets} />
    </div>
  ),
  () => (
    <div
      style={{
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        padding: '80px 128px',
        gap: 48,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--osd-bg)',
        color: 'var(--osd-text)',
        fontFamily: 'var(--osd-font-body)',
      }}
    >
      <h1
        style={{
          margin: 0,
          fontFamily: 'var(--osd-font-display)',
          fontSize: 64,
          lineHeight: 1.1,
          fontWeight: 700,
          letterSpacing: '-0.01em',
        }}
      >
        {questions.budget.question}
      </h1>
      <Points question={questions.budget} />
    </div>
  ),
  () => (
    <div
      style={{
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        padding: '80px 128px',
        gap: 48,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--osd-bg)',
        color: 'var(--osd-text)',
        fontFamily: 'var(--osd-font-body)',
      }}
    >
      <h1
        style={{
          margin: 0,
          fontFamily: 'var(--osd-font-display)',
          fontSize: 64,
          lineHeight: 1.1,
          fontWeight: 700,
          letterSpacing: '-0.01em',
        }}
      >
        {questions.howmany.question}
      </h1>
      <NumberAnswer question={questions.howmany} />
    </div>
  ),
  () => (
    <div
      style={{
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        padding: '80px 128px',
        gap: 48,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--osd-bg)',
        color: 'var(--osd-text)',
        fontFamily: 'var(--osd-font-body)',
      }}
    >
      <h1
        style={{
          margin: 0,
          fontFamily: 'var(--osd-font-display)',
          fontSize: 64,
          lineHeight: 1.1,
          fontWeight: 700,
          letterSpacing: '-0.01em',
        }}
      >
        {questions.why.question}
      </h1>
      <OpenText question={questions.why} />
    </div>
  ),
] satisfies Page[];
