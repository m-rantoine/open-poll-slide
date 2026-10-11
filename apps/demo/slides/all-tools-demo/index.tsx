import {
  ClassResults,
  ClockSlide,
  CountdownTimer,
  type DesignSystem,
  DragDrop,
  DropZone,
  type InteractiveQuestion,
  ItemPool,
  Lobby,
  MultipleChoice,
  NumberAnswer,
  OpenText,
  type Page,
  Points,
  Ranking,
  Scale,
  type SlideMeta,
  SolveSteps,
  WordCloud,
} from '@open-slide/core';
import type { ReactNode } from 'react';

export const meta: SlideMeta = {
  title: 'Every tool, one per slide',
  createdAt: '2026-10-10T00:00:00.000Z',
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
  mc: {
    id: 'mc',
    type: 'multiple_choice',
    question: 'Multiple choice: what is the capital of Canada?',
    options: [
      { id: 'toronto', label: 'Toronto' },
      { id: 'ottawa', label: 'Ottawa' },
      { id: 'montreal', label: 'Montréal' },
      { id: 'vancouver', label: 'Vancouver' },
    ],
    correct: ['ottawa'],
    startLocked: true,
    showResults: true,
  },
  cloud: {
    id: 'cloud',
    type: 'word_cloud',
    question: 'Word cloud: in one word, what comes to mind when you think of winter?',
    startLocked: true,
    showResults: true,
  },
  sorting: {
    id: 'sorting',
    type: 'drag_drop',
    question: 'Sorting: put each animal in its group.',
    zones: [
      { id: 'mammals', label: 'Mammals' },
      { id: 'birds', label: 'Birds' },
      { id: 'fish', label: 'Fish' },
    ],
    items: [
      { id: 'dolphin', label: 'Dolphin' },
      { id: 'eagle', label: 'Eagle' },
      { id: 'salmon', label: 'Salmon' },
      { id: 'bat', label: 'Bat' },
      { id: 'penguin', label: 'Penguin' },
      { id: 'shark', label: 'Shark' },
    ],
    correct: {
      dolphin: 'mammals',
      bat: 'mammals',
      eagle: 'birds',
      penguin: 'birds',
      salmon: 'fish',
      shark: 'fish',
    },
    startLocked: true,
    showResults: true,
  },
  association: {
    id: 'association',
    type: 'association',
    question: 'Association: match each country to its capital.',
    zones: [
      { id: 'canada', label: 'Canada' },
      { id: 'france', label: 'France' },
      { id: 'japan', label: 'Japan' },
    ],
    items: [
      { id: 'ottawa', label: 'Ottawa' },
      { id: 'paris', label: 'Paris' },
      { id: 'tokyo', label: 'Tokyo' },
      { id: 'sydney', label: 'Sydney' },
    ],
    correct: { ottawa: 'canada', paris: 'france', tokyo: 'japan' },
    startLocked: true,
    showResults: true,
  },
  scale: {
    id: 'scale',
    type: 'scale',
    question: 'Scale: how confident do you feel about each topic?',
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
  ranking: {
    id: 'ranking',
    type: 'ranking',
    question: 'Ranking: put these planets in order from the Sun.',
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
  points: {
    id: 'points',
    type: 'points',
    question: 'Points: spend 100 points on what matters most for the trip.',
    total: 100,
    items: [
      { id: 'food', label: 'Food' },
      { id: 'sights', label: 'Sights' },
      { id: 'hotel', label: 'Hotel' },
    ],
    startLocked: true,
    showResults: true,
  },
  number: {
    id: 'number',
    type: 'number',
    question: 'Number: how many provinces and territories does Canada have?',
    correct: 13,
    startLocked: true,
    showResults: true,
  },
  text: {
    id: 'text',
    type: 'open_text',
    question: 'Open text: what is one thing you want to remember from today?',
    startLocked: true,
    showResults: true,
  },
} satisfies Record<string, InteractiveQuestion>;

const Slide = ({ title, children }: { title: string; children: ReactNode }) => (
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
      {title}
    </h1>
    {children}
  </div>
);

const Full = ({ children }: { children: ReactNode }) => (
  <div
    style={{
      width: '100%',
      height: '100%',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--osd-bg)',
      color: 'var(--osd-text)',
      fontFamily: 'var(--osd-font-body)',
    }}
  >
    {children}
  </div>
);

export default [
  () => (
    <Full>
      <Lobby title="Every tool, one per slide" />
    </Full>
  ),
  () => (
    <Slide title={questions.mc.question}>
      <MultipleChoice question={questions.mc} />
    </Slide>
  ),
  () => (
    <Slide title={questions.cloud.question}>
      <WordCloud question={questions.cloud} />
    </Slide>
  ),
  () => (
    <Slide title={questions.sorting.question}>
      <DragDrop question={questions.sorting}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gridTemplateRows: '1fr 0.55fr',
            gap: 32,
          }}
        >
          <DropZone zone="mammals" />
          <DropZone zone="birds" />
          <DropZone zone="fish" />
          <ItemPool style={{ gridColumn: '1 / -1' }} />
        </div>
      </DragDrop>
    </Slide>
  ),
  () => (
    <Slide title={questions.association.question}>
      <DragDrop question={questions.association}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 28,
            fontSize: 44,
            lineHeight: 1.3,
          }}
        >
          <p style={{ margin: 0 }}>
            The capital of Canada is <DropZone zone="canada" />.
          </p>
          <p style={{ margin: 0 }}>
            The capital of France is <DropZone zone="france" />.
          </p>
          <p style={{ margin: 0 }}>
            The capital of Japan is <DropZone zone="japan" />.
          </p>
          <ItemPool style={{ marginTop: 'auto', height: 150 }} />
        </div>
      </DragDrop>
    </Slide>
  ),
  () => (
    <Slide title={questions.scale.question}>
      <Scale question={questions.scale} />
    </Slide>
  ),
  () => (
    <Slide title={questions.ranking.question}>
      <Ranking question={questions.ranking} />
    </Slide>
  ),
  () => (
    <Slide title={questions.points.question}>
      <Points question={questions.points} />
    </Slide>
  ),
  () => (
    <Slide title={questions.number.question}>
      <NumberAnswer question={questions.number} />
    </Slide>
  ),
  () => (
    <Slide title={questions.text.question}>
      <OpenText question={questions.text} />
    </Slide>
  ),
  () => (
    <SolveSteps
      title="Equation steps: solve 2x + 3 = 11"
      steps={[
        { tex: '2x + 3 = 11', note: 'Start with the equation' },
        {
          tex: '2x + 3 \\color{#c8102e}{- 3} = 11 \\color{#c8102e}{- 3}',
          note: 'Subtract 3 from both sides',
        },
        { tex: '2x = 8', note: 'Simplify' },
        {
          tex: '\\frac{2x}{\\color{#c8102e}{2}} = \\frac{8}{\\color{#c8102e}{2}}',
          note: 'Divide both sides by 2',
        },
        { tex: 'x = 4', note: 'The solution' },
      ]}
    />
  ),
  () => (
    <CountdownTimer
      skin="flip"
      autoStart={false}
      title="Countdown timer"
      subtitle="Break, 30 seconds"
      duration="0:30"
    />
  ),
  () => <ClockSlide title="Clock" showDate />,
  () => (
    <Full>
      <ClassResults />
    </Full>
  ),
] satisfies Page[];
