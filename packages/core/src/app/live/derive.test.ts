import { describe, expect, it } from 'vitest';
import {
  answeredCount,
  classAverage,
  expectedCount,
  formatClock,
  formatDuration,
  inactiveSeconds,
  isParticipantActive,
  normalizeAnswer,
  optionCounts,
  pct,
  placementScores,
  studentResults,
  wordCounts,
  zoneTiles,
} from './derive';
import type { AnswerRow, ParticipantRow, PlacementRow } from './types';

const NOW = Date.parse('2026-10-07T12:00:00Z');
const ago = (s: number) => new Date(NOW - s * 1000).toISOString();

function participant(over: Partial<ParticipantRow> = {}): ParticipantRow {
  return {
    session_id: 's',
    user_id: 'u1',
    display_name: 'U1',
    email: 'u1@example.test',
    joined_at: ago(600),
    last_seen: ago(5),
    status: 'active',
    inactive_since: null,
    inactive_total_seconds: 0,
    self_index: 0,
    ...over,
  };
}

function answer(over: Partial<AnswerRow> = {}): AnswerRow {
  return {
    id: crypto.randomUUID(),
    session_id: 's',
    question_id: 'q',
    user_id: 'u1',
    option_id: 'a',
    is_correct: null,
    answer_text: null,
    submitted_at: ago(1),
    ...over,
  };
}

describe('presence', () => {
  it('treats a stale heartbeat as inactive', () => {
    expect(isParticipantActive(participant(), NOW)).toBe(true);
    expect(isParticipantActive(participant({ last_seen: ago(120) }), NOW)).toBe(false);
  });

  it('adds the open inactive interval to the saved total', () => {
    const p = participant({
      status: 'inactive',
      inactive_since: ago(30),
      inactive_total_seconds: 10,
    });
    expect(inactiveSeconds(p, NOW)).toBe(40);
  });

  it('counts a stale active participant from their last heartbeat', () => {
    expect(inactiveSeconds(participant({ last_seen: ago(90) }), NOW)).toBe(90);
  });

  it('stops counting once the session closed the interval', () => {
    const p = participant({ status: 'inactive', inactive_since: null, inactive_total_seconds: 25 });
    expect(inactiveSeconds(p, NOW)).toBe(25);
    expect(inactiveSeconds(p, NOW + 3_600_000)).toBe(25);
  });
});

describe('answers', () => {
  const answers = [
    answer({ user_id: 'u1', option_id: 'a', is_correct: true }),
    answer({ user_id: 'u2', option_id: 'b', is_correct: false }),
    answer({ user_id: 'u2', question_id: 'other', option_id: 'a', is_correct: true }),
  ];

  it('counts options and answers per question', () => {
    expect(optionCounts(answers, 'q')).toEqual({ a: 1, b: 1 });
    expect(answeredCount(answers, 'q')).toBe(2);
  });

  it('expects connected students plus anyone who already answered', () => {
    const ps = [
      participant({ user_id: 'u1', last_seen: ago(300) }),
      participant({ user_id: 'u2' }),
      participant({ user_id: 'u3', last_seen: ago(300) }),
    ];
    expect(expectedCount(ps, answers, 'q', NOW)).toBe(2);
  });

  it('averages per-student scores over graded students only', () => {
    const ps = [
      participant({ user_id: 'u1' }),
      participant({ user_id: 'u2' }),
      participant({ user_id: 'u3' }),
    ];
    const results = studentResults(ps, answers);
    expect(results.map((r) => [r.correct, r.graded, r.answered])).toEqual([
      [1, 1, 1],
      [1, 2, 2],
      [0, 0, 0],
    ]);
    expect(classAverage(results)).toBe(0.75);
    expect(classAverage([])).toBeNull();
  });
});

describe('word clouds', () => {
  const words = [
    answer({ user_id: 'u1', question_id: 'w', option_id: 'ottawa', answer_text: 'Ottawa' }),
    answer({ user_id: 'u2', question_id: 'w', option_id: 'ottawa', answer_text: 'ottawa' }),
    answer({ user_id: 'u3', question_id: 'w', option_id: 'ottawa', answer_text: 'Ottawa' }),
    answer({ user_id: 'u4', question_id: 'w', option_id: 'toronto', answer_text: 'Toronto' }),
    answer({ user_id: 'u5', question_id: 'other', option_id: 'x', answer_text: 'X' }),
  ];

  it('normalises like the database', () => {
    expect(normalizeAnswer('  Hello   World ')).toBe('hello world');
  });

  it('groups answers by word, most common first, with the commonest spelling', () => {
    const counts = wordCounts(words, 'w');
    expect(counts.map((c) => [c.key, c.text, c.count])).toEqual([
      ['ottawa', 'Ottawa', 3],
      ['toronto', 'Toronto', 1],
    ]);
    expect(counts[0].userIds).toEqual(['u1', 'u2', 'u3']);
  });

  it('reports the host mark per word and leaves unmarked words null', () => {
    const counts = wordCounts(words, 'w', ['ottawa'], ['toronto']);
    expect(counts.map((c) => c.mark)).toEqual(['correct', 'incorrect']);
    expect(wordCounts(words, 'w').map((c) => c.mark)).toEqual([null, null]);
  });

  it('does not count ungraded answers toward a score', () => {
    const ps = [participant({ user_id: 'u1' })];
    const results = studentResults(ps, [
      answer({ user_id: 'u1', question_id: 'a', is_correct: null }),
      answer({ user_id: 'u1', question_id: 'b', is_correct: true }),
    ]);
    expect([results[0].correct, results[0].graded, results[0].answered]).toEqual([1, 1, 2]);
    expect(classAverage(results)).toBe(1);
  });
});

describe('sorting questions', () => {
  const pl = (user: string, item: string, zone: string, ok: boolean | null): PlacementRow => ({
    session_id: 's',
    question_id: 'sort',
    user_id: user,
    item_id: item,
    zone_id: zone,
    is_correct: ok,
    placed_at: ago(1),
  });
  const placements = [
    pl('u1', 'cat', 'mammals', true),
    pl('u1', 'eel', 'fish', true),
    pl('u2', 'cat', 'mammals', true),
    pl('u2', 'eel', 'mammals', false),
    pl('u3', 'eel', 'mammals', false),
  ];

  it('lists each zone most often placed first', () => {
    const zones = zoneTiles(placements, 'sort', ['cat', 'eel']);
    expect(zones.mammals).toEqual(
      [
        { itemId: 'eel', count: 2 },
        { itemId: 'cat', count: 2 },
      ].sort((a, b) => ['cat', 'eel'].indexOf(a.itemId) - ['cat', 'eel'].indexOf(b.itemId)),
    );
    expect(zones.fish).toEqual([{ itemId: 'eel', count: 1 }]);
    expect(zoneTiles(placements, 'other', ['cat'])).toEqual({});
  });

  it('is worth one point per key tile, for anyone who placed or submitted', () => {
    const key = { sort: ['cat>mammals', 'eel>fish'] };
    const submitted = answer({ user_id: 'u4', question_id: 'sort', option_id: 'submitted' });
    const scores = placementScores(placements, [submitted], key, { sort: { scored: true } });
    expect(scores.get('u1')).toEqual({ graded: 2, correct: 2 });
    expect(scores.get('u2')).toEqual({ graded: 2, correct: 1 });
    expect(scores.get('u3')).toEqual({ graded: 2, correct: 0 });
    expect(scores.get('u4')).toEqual({ graded: 2, correct: 0 });
  });

  it('leaves unscored or keyless questions out', () => {
    expect(placementScores(placements, [], { sort: [] }, { sort: { scored: true } }).size).toBe(0);
    expect(
      placementScores(placements, [], { sort: ['cat>mammals'] }, { sort: { scored: false } }).size,
    ).toBe(0);
  });

  it('adds sorting points to the student total', () => {
    const extra = new Map([['u1', { graded: 2, correct: 1 }]]);
    const [r] = studentResults([participant({ user_id: 'u1' })], [], extra);
    expect([r.correct, r.graded]).toEqual([1, 2]);
  });
});

describe('formatting', () => {
  it('formats clocks, durations and percentages', () => {
    expect(formatClock(61_200)).toBe('1:02');
    expect(formatClock(-5)).toBe('0:00');
    expect(formatDuration(75)).toBe('1m 15s');
    expect(formatDuration(9)).toBe('9s');
    expect(pct(0.756)).toBe('76%');
    expect(pct(null)).toBe('—');
  });
});
