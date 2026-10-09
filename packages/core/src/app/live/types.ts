import type { Database } from './database.types';

type Tables = Database['public']['Tables'];

export type SessionRow = Tables['sessions']['Row'];
export type ParticipantRow = Tables['session_participants']['Row'];
export type QuestionStateRow = Tables['session_question_state']['Row'];
export type AnswerRow = Tables['answers']['Row'];
export type PresenceEventRow = Tables['presence_events']['Row'];

export type LiveView = 'static' | 'screen' | 'presenter' | 'participant';

export type MyAnswer = {
  option_id: string;
  is_correct: boolean | null;
  show_results: boolean;
  /** What the participant typed, for word-cloud questions. */
  answer_text?: string | null;
};

export type MyScore = { correct: number; graded: number; class_average: number | null };

export const INACTIVE_AFTER_MS = 60_000;
