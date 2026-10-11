import type { AnswerRow, ParticipantRow, PlacementRow } from './types';
import { INACTIVE_AFTER_MS } from './types';

export function optionCounts(answers: AnswerRow[], questionId: string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const a of answers) {
    if (a.question_id === questionId) counts[a.option_id] = (counts[a.option_id] ?? 0) + 1;
  }
  return counts;
}

/** Mirrors `normalize_answer` in the database. */
export function normalizeAnswer(text: string): string {
  return text.trim().replace(/\s+/g, ' ').toLowerCase();
}

export type WordCount = {
  key: string;
  /** The spelling used most often, for display. */
  text: string;
  count: number;
  mark: 'correct' | 'incorrect' | null;
  userIds: string[];
};

export function wordCounts(
  answers: AnswerRow[],
  questionId: string,
  correct: string[] = [],
  incorrect: string[] = [],
): WordCount[] {
  const byKey = new Map<string, { forms: Map<string, number>; userIds: string[] }>();
  for (const a of answers) {
    if (a.question_id !== questionId) continue;
    const entry = byKey.get(a.option_id) ?? { forms: new Map<string, number>(), userIds: [] };
    const form = a.answer_text ?? a.option_id;
    entry.forms.set(form, (entry.forms.get(form) ?? 0) + 1);
    entry.userIds.push(a.user_id);
    byKey.set(a.option_id, entry);
  }
  return [...byKey.entries()]
    .map(([key, { forms, userIds }]) => ({
      key,
      text: [...forms.entries()].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))[0][0],
      count: userIds.length,
      mark: correct.includes(key)
        ? ('correct' as const)
        : incorrect.includes(key)
          ? ('incorrect' as const)
          : null,
      userIds,
    }))
    .sort((x, y) => y.count - x.count || x.key.localeCompare(y.key));
}

export function answeredCount(answers: AnswerRow[], questionId: string): number {
  let n = 0;
  for (const a of answers) if (a.question_id === questionId) n++;
  return n;
}

export function isParticipantConnected(p: ParticipantRow, now: number): boolean {
  return now - new Date(p.last_seen).getTime() < INACTIVE_AFTER_MS;
}

export function isParticipantActive(p: ParticipantRow, now: number): boolean {
  return p.status === 'active' && isParticipantConnected(p, now);
}

/** Mirrors `presence_gap` in the database; ended sessions have no open interval left. */
export function inactiveSeconds(p: ParticipantRow, now: number): number {
  let openMs = 0;
  if (p.status === 'inactive') {
    if (p.inactive_since) openMs = now - new Date(p.inactive_since).getTime();
  } else if (!isParticipantConnected(p, now)) {
    openMs = now - new Date(p.last_seen).getTime();
  }
  return p.inactive_total_seconds + Math.floor(Math.max(0, openMs) / 1000);
}

/** Students a question is waiting on: still connected, or already answered it. */
export function expectedCount(
  participants: ParticipantRow[],
  answers: AnswerRow[],
  questionId: string,
  now: number,
): number {
  const answered = new Set(
    answers.filter((a) => a.question_id === questionId).map((a) => a.user_id),
  );
  return participants.filter((p) => answered.has(p.user_id) || isParticipantConnected(p, now))
    .length;
}

export type StudentResult = {
  userId: string;
  correct: number;
  graded: number;
  answered: number;
};

export type PlacementScores = Map<string, { graded: number; correct: number }>;

/**
 * Points from sorting questions, mirroring `score_units`: one point per key tile, earned for each
 * tile sitting in its right zone, for anyone who placed a tile or submitted. Unscored questions and
 * questions without a key are worth nothing.
 */
export function placementScores(
  placements: PlacementRow[],
  answers: AnswerRow[],
  keys: Record<string, string[]>,
  states: Record<string, { scored: boolean }>,
): PlacementScores {
  const scores: PlacementScores = new Map();
  const participants = new Map<string, Set<string>>();
  const add = (questionId: string, userId: string) => {
    const users = participants.get(questionId) ?? new Set<string>();
    users.add(userId);
    participants.set(questionId, users);
  };
  for (const p of placements) add(p.question_id, p.user_id);
  for (const a of answers) if (a.option_id === 'submitted') add(a.question_id, a.user_id);
  for (const [questionId, users] of participants) {
    const key = keys[questionId] ?? [];
    if (key.length === 0 || !(states[questionId]?.scored ?? true)) continue;
    for (const userId of users) {
      const earned = placements.filter(
        (p) => p.question_id === questionId && p.user_id === userId && p.is_correct === true,
      ).length;
      const cur = scores.get(userId) ?? { graded: 0, correct: 0 };
      scores.set(userId, { graded: cur.graded + key.length, correct: cur.correct + earned });
    }
  }
  return scores;
}

export type ZoneTile = { itemId: string; count: number };

/** The tiles placed in each zone, most often placed first; ties keep the author's tile order. */
export function zoneTiles(
  placements: PlacementRow[],
  questionId: string,
  itemOrder: string[],
): Record<string, ZoneTile[]> {
  const counts = new Map<string, Map<string, number>>();
  for (const p of placements) {
    if (p.question_id !== questionId) continue;
    const zone = counts.get(p.zone_id) ?? new Map<string, number>();
    zone.set(p.item_id, (zone.get(p.item_id) ?? 0) + 1);
    counts.set(p.zone_id, zone);
  }
  const out: Record<string, ZoneTile[]> = {};
  for (const [zoneId, zone] of counts) {
    out[zoneId] = [...zone.entries()]
      .map(([itemId, count]) => ({ itemId, count }))
      .sort(
        (a, b) => b.count - a.count || itemOrder.indexOf(a.itemId) - itemOrder.indexOf(b.itemId),
      );
  }
  return out;
}

const numeric = (v: string) => Number(v);

function respondents(placements: PlacementRow[], questionId: string): Set<string> {
  return new Set(placements.filter((p) => p.question_id === questionId).map((p) => p.user_id));
}

export type ScaleStat = {
  itemId: string;
  count: number;
  average: number | null;
  /** How many gave each rating, from `min` to `max`. */
  distribution: number[];
};

export function scaleStats(
  placements: PlacementRow[],
  questionId: string,
  itemIds: string[],
  min: number,
  max: number,
): ScaleStat[] {
  return itemIds.map((itemId) => {
    const distribution = new Array<number>(Math.max(1, max - min + 1)).fill(0);
    let sum = 0;
    let count = 0;
    for (const p of placements) {
      if (p.question_id !== questionId || p.item_id !== itemId) continue;
      const v = numeric(p.zone_id);
      if (Number.isNaN(v) || v < min || v > max) continue;
      distribution[v - min]++;
      sum += v;
      count++;
    }
    return { itemId, count, average: count ? sum / count : null, distribution };
  });
}

export type RankStat = { itemId: string; average: number | null; count: number };

/** Items with their average position (1 is first), best first; unranked items go last. */
export function rankStats(
  placements: PlacementRow[],
  questionId: string,
  itemIds: string[],
): RankStat[] {
  const stats = itemIds.map((itemId) => {
    const rows = placements.filter((p) => p.question_id === questionId && p.item_id === itemId);
    const sum = rows.reduce((n, p) => n + numeric(p.zone_id), 0);
    return { itemId, count: rows.length, average: rows.length ? sum / rows.length : null };
  });
  return stats.sort(
    (a, b) =>
      (a.average ?? Number.POSITIVE_INFINITY) - (b.average ?? Number.POSITIVE_INFINITY) ||
      itemIds.indexOf(a.itemId) - itemIds.indexOf(b.itemId),
  );
}

export type PointsStat = { itemId: string; average: number; total: number };

/** Average points per option over everyone who answered, most points first. */
export function pointsStats(
  placements: PlacementRow[],
  questionId: string,
  itemIds: string[],
): PointsStat[] {
  const people = respondents(placements, questionId).size;
  return itemIds
    .map((itemId) => {
      const total = placements
        .filter((p) => p.question_id === questionId && p.item_id === itemId)
        .reduce((n, p) => n + numeric(p.zone_id), 0);
      return { itemId, total, average: people ? total / people : 0 };
    })
    .sort((a, b) => b.average - a.average || itemIds.indexOf(a.itemId) - itemIds.indexOf(b.itemId));
}

export type NumberSummary = {
  count: number;
  mean: number | null;
  median: number | null;
  min: number | null;
  max: number | null;
  bins: { from: number; to: number; count: number }[];
};

export function numberSummary(
  answers: AnswerRow[],
  questionId: string,
  binCount = 8,
): NumberSummary {
  const values = answers
    .filter((a) => a.question_id === questionId)
    .map((a) => numeric(a.option_id))
    .filter((v) => !Number.isNaN(v))
    .sort((a, b) => a - b);
  if (values.length === 0) {
    return { count: 0, mean: null, median: null, min: null, max: null, bins: [] };
  }
  const min = values[0];
  const max = values[values.length - 1];
  const mid = Math.floor(values.length / 2);
  const median = values.length % 2 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
  const mean = values.reduce((n, v) => n + v, 0) / values.length;
  const n = max === min ? 1 : binCount;
  const width = max === min ? 1 : (max - min) / n;
  const bins = Array.from({ length: n }, (_, i) => ({
    from: min + i * width,
    to: min + (i + 1) * width,
    count: 0,
  }));
  for (const v of values) {
    const i = max === min ? 0 : Math.min(n - 1, Math.floor((v - min) / width));
    bins[i].count++;
  }
  return { count: values.length, mean, median, min, max, bins };
}

export function studentResults(
  participants: ParticipantRow[],
  answers: AnswerRow[],
  extra?: PlacementScores,
): StudentResult[] {
  return participants.map((p) => {
    const bonus = extra?.get(p.user_id);
    let correct = bonus?.correct ?? 0;
    let graded = bonus?.graded ?? 0;
    let answered = 0;
    for (const a of answers) {
      if (a.user_id !== p.user_id) continue;
      answered++;
      if (a.is_correct !== null) {
        graded++;
        if (a.is_correct) correct++;
      }
    }
    return { userId: p.user_id, correct, graded, answered };
  });
}

export function classAverage(results: StudentResult[]): number | null {
  const scored = results.filter((r) => r.graded > 0);
  if (scored.length === 0) return null;
  return scored.reduce((sum, r) => sum + r.correct / r.graded, 0) / scored.length;
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${String(s % 60).padStart(2, '0')}s` : `${s}s`;
}

export function formatClock(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function pct(value: number | null): string {
  return value === null ? '—' : `${Math.round(value * 100)}%`;
}
