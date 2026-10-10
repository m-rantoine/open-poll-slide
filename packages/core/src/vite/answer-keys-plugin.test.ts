import { describe, expect, it } from 'vitest';
import { answerKeysPlugin, findAnswerKeys, stripAnswerKeys } from './answer-keys-plugin.ts';

const deck = `export const questions = {
  capital: {
    id: 'capital',
    type: 'multiple_choice',
    question: 'Capital?',
    options: [{ id: 'ottawa', label: 'Ottawa' }],
    correct: ['ottawa'],
    showResults: true,
  },
  open: { id: 'open', question: 'Fav?', options: [], correct: ['a', 'b'] },
  computed: { id: 'computed', question: 'Q', options: [], correct: KEY },
  words: { id: 'words', type: 'word_cloud', question: 'Capital?', correct: ['Gatineau'], scored: true },
  cloud: { id: 'cloud', type: 'word_cloud', question: 'Ideas?' },
  sort: {
    id: 'sort',
    type: 'drag_drop',
    question: 'Sort',
    items: [],
    zones: [],
    correct: { cat: 'mammals', eel: 'fish' },
  },
  pair: {
    id: 'pair',
    type: 'association',
    question: 'Match',
    items: [],
    zones: [],
    correct: { ottawa: 'canada' },
  },
};
const other = { correct: ['not-a-question'] };
export default [() => <div />];
`;

describe('findAnswerKeys', () => {
  it('finds keys on question objects only', () => {
    const keys = findAnswerKeys(deck);
    expect(keys.map((k) => [k.questionId, k.correct])).toEqual([
      ['capital', ['ottawa']],
      ['open', ['a', 'b']],
      ['computed', null],
      ['words', ['Gatineau']],
      ['sort', ['cat>mammals', 'eel>fish']],
      ['pair', ['ottawa>canada']],
    ]);
  });
});

describe('stripAnswerKeys', () => {
  it('removes every key and keeps offsets and lines', () => {
    const out = stripAnswerKeys(deck);
    if (out === null) throw new Error('expected a transform');
    expect(out).toHaveLength(deck.length);
    expect(out.split('\n')).toHaveLength(deck.split('\n').length);
    expect(out).not.toContain("'ottawa']");
    expect(out).not.toContain('KEY');
    expect(out).not.toContain('Gatineau');
    expect(out).toContain('scored: true');
    expect(out).toContain("{ correct: ['not-a-question'] }");
    expect(out.indexOf('showResults')).toBe(deck.indexOf('showResults'));
  });

  it('leaves sources without keys alone', () => {
    expect(stripAnswerKeys('export default [() => <div />];')).toBeNull();
  });
});

describe('drag-and-drop keys', () => {
  it('are stripped from builds but kept for the dev preview', () => {
    const built = stripAnswerKeys(deck);
    expect(built).not.toContain('mammals');
    const dev = stripAnswerKeys(deck, { keepDragDrop: true });
    expect(dev).toContain("{ cat: 'mammals', eel: 'fish' }");
    expect(dev).not.toContain("'ottawa']");
  });
});

describe('answerKeysPlugin', () => {
  const transform = answerKeysPlugin({ userCwd: '/repo' }).transform;
  if (typeof transform !== 'function') throw new Error('expected transform function');
  const run = (id: string, ssr = false) =>
    transform.call({} as never, deck, id, { ssr, moduleType: 'tsx' }) as { code: string } | null;

  it('strips slide sources for the browser', () => {
    expect(run('/repo/slides/quiz/index.tsx')?.code).not.toContain("'ottawa']");
    expect(run('/repo/slides/quiz/questions.ts')?.code).not.toContain("'ottawa']");
  });

  it('skips SSR and files outside the slides folder', () => {
    expect(run('/repo/slides/quiz/index.tsx', true)).toBeNull();
    expect(run('/repo/src/app.tsx')).toBeNull();
  });
});
