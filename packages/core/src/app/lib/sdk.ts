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

export type MultipleChoiceQuestion = {
  id: string;
  type: 'multiple_choice';
  question: string;
  options: QuestionOption[];
  /**
   * Ids of correct options. Omit to let the host mark them live. Stripped from the browser
   * bundle; `open-slide live keys` uploads it to the database.
   */
  correct?: string[];
  /** Host-paced sessions: start with the padlock down. Default true. */
  startLocked?: boolean;
  /** Reveal correctness to participants once the answer period ends. Default false. */
  showResults?: boolean;
};

export type SlideModule = {
  default: Page[];
  meta?: SlideMeta;
  design?: DesignSystem;
  // Index-aligned with `default`.
  notes?: (string | undefined)[];
  questions?: Record<string, MultipleChoiceQuestion>;
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
