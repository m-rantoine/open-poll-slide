import type { AnswerRow, ParticipantRow } from './types';
import { INACTIVE_AFTER_MS } from './types';

export function optionCounts(answers: AnswerRow[], questionId: string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const a of answers) {
    if (a.question_id === questionId) counts[a.option_id] = (counts[a.option_id] ?? 0) + 1;
  }
  return counts;
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

export function studentResults(
  participants: ParticipantRow[],
  answers: AnswerRow[],
): StudentResult[] {
  return participants.map((p) => {
    let correct = 0;
    let graded = 0;
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
