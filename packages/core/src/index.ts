export type { ImagePlaceholderProps } from './app/components/image-placeholder.tsx';
export { ImagePlaceholder } from './app/components/image-placeholder.tsx';
export type { MorphElementProps } from './app/components/morph-element.tsx';
export { MorphElement } from './app/components/morph-element.tsx';
export type { ClockSlideProps } from './app/components/tools/clock-slide.tsx';
export { ClockSlide } from './app/components/tools/clock-slide.tsx';
export type { CountdownTimerProps } from './app/components/tools/countdown-timer.tsx';
export { CountdownTimer } from './app/components/tools/countdown-timer.tsx';
export type { SolveStep, SolveStepsProps } from './app/components/tools/solve-steps.tsx';
export { SolveSteps } from './app/components/tools/solve-steps.tsx';
export type {
  DesignFonts,
  DesignPalette,
  DesignSystem,
  DesignTypeScale,
} from './app/lib/design.ts';
export { cssVarsToString, defaultDesign, designToCssVars } from './app/lib/design.ts';
export type { PollLanguage } from './app/lib/locale-store.tsx';
export { useSlidePageNumber } from './app/lib/page-context.tsx';
export type {
  AssociationQuestion,
  DragDropQuestion,
  InteractiveQuestion,
  MultipleChoiceQuestion,
  Page,
  QuestionOption,
  SlideMeta,
  SlideModule,
  SortingQuestion,
  WordCloudQuestion,
} from './app/lib/sdk.ts';
export { CANVAS_HEIGHT, CANVAS_WIDTH } from './app/lib/sdk.ts';
export type { StepProps, StepsProps } from './app/lib/step-context.tsx';
export { Step, Steps, useIsActivePage } from './app/lib/step-context.tsx';
export type { ClockSkin, TimerSkin } from './app/lib/tools-store.ts';
export type {
  MorphTransition,
  SlideTransition,
  TransitionPhase,
} from './app/lib/transition.ts';
export type { ClassResultsProps } from './app/live/class-results.tsx';
export { ClassResults } from './app/live/class-results.tsx';
export type { DragDropProps, DropZoneProps, ItemPoolProps } from './app/live/drag-drop.tsx';
export { DragDrop, DropZone, ItemPool } from './app/live/drag-drop.tsx';
export type { LobbyProps } from './app/live/lobby.tsx';
export { Lobby } from './app/live/lobby.tsx';
export type { MultipleChoiceProps } from './app/live/multiple-choice.tsx';
export { MultipleChoice } from './app/live/multiple-choice.tsx';
export type { WordCloudProps } from './app/live/word-cloud.tsx';
export { WordCloud } from './app/live/word-cloud.tsx';
export type { OpenSlideConfig, OpenSlideLiveConfig } from './config.ts';
export type { Locale, Plural } from './locale/types.ts';
