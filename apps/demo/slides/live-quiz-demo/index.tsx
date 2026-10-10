import {
  ClassResults,
  type DesignSystem,
  DragDrop,
  DropZone,
  type InteractiveQuestion,
  ItemPool,
  Lobby,
  MultipleChoice,
  type Page,
  type SlideMeta,
  WordCloud,
} from '@open-slide/core';

export const meta: SlideMeta = { title: 'Live quiz demo', createdAt: '2026-10-07T00:00:00.000Z' };

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
      {
        id: 'toronto',
        label:
          'ABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZ',
      },
      { id: 'ottawa', label: 'Ottawa' },
      { id: 'montr-al', label: 'Montréal' },
      { id: 'vancouver', label: 'Vancouver' },
    ],
    correct: ['ottawa'],
    startLocked: true,
    showResults: true,
  },
  planets: {
    id: 'planets',
    type: 'multiple_choice',
    question: 'Which planet is closest to the Sun?',
    options: [
      { id: 'venus', label: 'Venus' },
      { id: 'earth', label: 'Earth' },
      { id: 'mercury', label: 'Mercury' },
      { id: 'mars', label: 'Mars' },
    ],
    correct: ['mercury'],
    startLocked: true,
    showResults: true,
  },
  water: {
    id: 'water',
    type: 'multiple_choice',
    question: 'What is the chemical symbol for water?',
    options: [
      { id: 'h2o', label: 'H2O' },
      { id: 'co2', label: 'CO2' },
      { id: 'o2', label: 'O2' },
      { id: 'nacl', label: 'NaCl' },
    ],
    correct: ['h2o'],
    startLocked: true,
    showResults: true,
  },
  ocean: {
    id: 'ocean',
    type: 'multiple_choice',
    question: 'Which is the largest ocean on Earth?',
    options: [
      { id: 'atlantic', label: 'Atlantic' },
      { id: 'indian', label: 'Indian' },
      { id: 'arctic', label: 'Arctic' },
      { id: 'pacific', label: 'Pacific' },
    ],
    correct: ['pacific'],
    startLocked: true,
    showResults: true,
  },
  math: {
    id: 'math',
    type: 'multiple_choice',
    question: 'What is 12 × 12?',
    options: [
      { id: '122', label: '122' },
      { id: '144', label: '144' },
      { id: '124', label: '124' },
      { id: '148', label: '148' },
    ],
    correct: ['144'],
    startLocked: true,
    showResults: true,
  },
  author: {
    id: 'author',
    type: 'multiple_choice',
    question: 'Who wrote “Romeo and Juliet”?',
    options: [
      { id: 'charles-dickens', label: 'Charles Dickens' },
      { id: 'jane-austen', label: 'Jane Austen' },
      { id: 'william-shakespeare', label: 'William Shakespeare' },
      { id: 'mark-twain', label: 'Mark Twain' },
    ],
    correct: ['william-shakespeare'],
    startLocked: true,
    showResults: true,
  },
  bones: {
    id: 'bones',
    type: 'multiple_choice',
    question: 'How many bones are in the adult human body?',
    options: [
      { id: '186', label: '186' },
      { id: '206', label: '206' },
      { id: '226', label: '226' },
      { id: '256', label: '256' },
    ],
    correct: ['206'],
    startLocked: true,
    showResults: true,
  },
  lang: {
    id: 'lang',
    type: 'multiple_choice',
    question: 'Which language is spoken most widely as a first language?',
    options: [
      { id: 'english', label: 'English' },
      { id: 'spanish', label: 'Spanish' },
      { id: 'mandarin-chinese', label: 'Mandarin Chinese' },
      { id: 'hindi', label: 'Hindi' },
    ],
    correct: ['mandarin-chinese'],
    startLocked: true,
    showResults: true,
  },
  year: {
    id: 'year',
    type: 'multiple_choice',
    question: 'In which year did humans first land on the Moon?',
    options: [
      { id: '1959', label: '1959' },
      { id: '1965', label: '1965' },
      { id: '1969', label: '1969' },
      { id: '1975', label: '1975' },
    ],
    correct: ['1969'],
    startLocked: true,
    showResults: true,
  },
  season: {
    id: 'season',
    type: 'multiple_choice',
    question: 'Which season do you like best? (no right answer)',
    options: [
      { id: 'winter', label: 'Winter' },
      { id: 'spring', label: 'Spring' },
      { id: 'summer', label: 'Summer' },
      { id: 'autumn', label: 'Autumn' },
    ],
    startLocked: true,
    showResults: true,
  },
  winter: {
    id: 'winter',
    type: 'word_cloud',
    question: 'In one word, what comes to mind when you think of winter?',
    startLocked: true,
    showResults: true,
  },
  colour: {
    id: 'colour',
    type: 'word_cloud',
    question: 'Name one primary colour.',
    correct: ['red', 'blue', 'yellow'],
    scored: true,
    startLocked: true,
    showResults: true,
  },
  animals: {
    id: 'animals',
    type: 'drag_drop',
    question: 'Sort the animals into their groups.',
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
      { id: 'oak', label: 'Oak tree (not an animal)' },
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
  capitals: {
    id: 'capitals',
    type: 'association',
    question: 'Match each country to its capital.',
    zones: [
      { id: 'canada', label: 'Canada' },
      { id: 'france', label: 'France' },
      { id: 'japan', label: 'Japan' },
      { id: 'egypt', label: 'Egypt' },
    ],
    items: [
      { id: 'ottawa', label: 'Ottawa' },
      { id: 'paris', label: 'Paris' },
      { id: 'tokyo', label: 'Tokyo' },
      { id: 'cairo', label: 'Cairo' },
      { id: 'sydney', label: 'Sydney' },
    ],
    correct: { ottawa: 'canada', paris: 'france', tokyo: 'japan', cairo: 'egypt' },
    startLocked: true,
    showResults: true,
  },
} satisfies Record<string, InteractiveQuestion>;

const Intro: Page = () => (
  <div
    style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      gap: 24,
      padding: '0 160px',
      background: 'var(--osd-bg)',
      color: 'var(--osd-text)',
      fontFamily: 'var(--osd-font-body)',
    }}
  >
    <h1
      style={{ margin: 0, fontSize: 'var(--osd-size-hero)', fontFamily: 'var(--osd-font-display)' }}
    >
      Ten-question quiz
    </h1>
    <p style={{ margin: 0, fontSize: 48, opacity: 0.6 }}>
      Nine with right answers, one just for fun. Ready?
    </p>
  </div>
);

export default [
  () => (
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
      <Lobby title="Live quiz demo" />
    </div>
  ),
  Intro,
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
        {questions.capital.question}
      </h1>
      <MultipleChoice question={questions.capital} />
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
      <MultipleChoice question={questions.planets} />
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
        {questions.water.question}
      </h1>
      <MultipleChoice question={questions.water} />
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
        {questions.ocean.question}
      </h1>
      <MultipleChoice question={questions.ocean} />
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
        {questions.math.question}
      </h1>
      <MultipleChoice question={questions.math} />
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
        {questions.author.question}
      </h1>
      <MultipleChoice question={questions.author} />
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
        {questions.bones.question}
      </h1>
      <MultipleChoice question={questions.bones} />
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
        {questions.lang.question}
      </h1>
      <MultipleChoice question={questions.lang} />
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
        {questions.year.question}
      </h1>
      <MultipleChoice question={questions.year} />
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
        {questions.season.question}
      </h1>
      <MultipleChoice question={questions.season} />
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
        {questions.season.question}
      </h1>
      <MultipleChoice question={questions.season} />
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
        {questions.winter.question}
      </h1>
      <WordCloud question={questions.winter} />
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
        {questions.colour.question}
      </h1>
      <WordCloud question={questions.colour} />
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
        {questions.animals.question}
      </h1>
      <DragDrop question={questions.animals}>
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
        {questions.capitals.question}
      </h1>
      <DragDrop question={questions.capitals}>
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
          <p style={{ margin: 0 }}>
            The capital of Egypt is <DropZone zone="egypt" />.
          </p>
          <ItemPool style={{ marginTop: 'auto', height: 150 }} />
        </div>
      </DragDrop>
    </div>
  ),
  () => (
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
      <ClassResults />
    </div>
  ),
] satisfies Page[];
