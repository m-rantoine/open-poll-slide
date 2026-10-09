import type { ComponentType } from 'react';
import type { DesignSystem } from './design.ts';
import type { SlideTransition } from './transition.ts';

export type Page = ComponentType & { transition?: SlideTransition };

export type SlideMeta = {
  title?: string;
  theme?: string;
  /** ISO 8601 timestamp. Set once at scaffold time; used to sort the slide list. */
  createdAt?: string;
};

export type QuestionOption = { id: string; label: string };

type QuestionBase = {
  id: string;
  question: string;
  /**
   * Whether answers count toward the score. Defaults to true for multiple choice and false for
   * word clouds. Answers without a grade (no correct answer set, or not marked yet) never count.
   */
  scored?: boolean;
  /** Host-paced sessions: start with the padlock down. Default true. */
  startLocked?: boolean;
  /** Reveal correctness to participants once the answer period ends. Default false. */
  showResults?: boolean;
};

export type MultipleChoiceQuestion = QuestionBase & {
  type: 'multiple_choice';
  options: QuestionOption[];
  /**
   * Ids of correct options. Omit to let the host mark them live. Stripped from the browser
   * bundle; `open-slide live keys` uploads it to the database.
   */
  correct?: string[];
};

export type WordCloudQuestion = QuestionBase & {
  type: 'word_cloud';
  /**
   * Accepted answers (compared ignoring case and extra spaces). Omit to mark words live.
   * Stripped from the browser bundle like multiple-choice keys.
   */
  correct?: string[];
  /** Longest accepted answer, 1 to 60 characters. Default 60. */
  maxLength?: number;
};

export type InteractiveQuestion = MultipleChoiceQuestion | WordCloudQuestion;

export const isMultipleChoice = (q: InteractiveQuestion): q is MultipleChoiceQuestion =>
  q.type === 'multiple_choice';

export type SlideModule = {
  default: Page[];
  meta?: SlideMeta;
  design?: DesignSystem;
  // Index-aligned with `default`.
  notes?: (string | undefined)[];
  questions?: Record<string, InteractiveQuestion>;
  transition?: SlideTransition;
};

export type FolderIcon = { type: 'emoji'; value: string } | { type: 'color'; value: string };

export type Folder = {
  id: string;
  name: string;
  icon: FolderIcon;
};

export type FoldersManifest = {
  folders: Folder[];
  assignments: Record<string, string>;
};

export const CANVAS_WIDTH = 1920;
export const CANVAS_HEIGHT = 1080;
