export type { ImagePlaceholderProps } from './app/components/image-placeholder.tsx';
export { ImagePlaceholder } from './app/components/image-placeholder.tsx';
export type { MorphElementProps } from './app/components/morph-element.tsx';
export { MorphElement } from './app/components/morph-element.tsx';
export type {
  DesignFonts,
  DesignPalette,
  DesignSystem,
  DesignTypeScale,
} from './app/lib/design.ts';
export { cssVarsToString, defaultDesign, designToCssVars } from './app/lib/design.ts';
export { useSlidePageNumber } from './app/lib/page-context.tsx';
export type {
  MultipleChoiceQuestion,
  Page,
  QuestionOption,
  SlideMeta,
  SlideModule,
} from './app/lib/sdk.ts';
export { CANVAS_HEIGHT, CANVAS_WIDTH } from './app/lib/sdk.ts';
export type { StepProps, StepsProps } from './app/lib/step-context.tsx';
export { Step, Steps, useIsActivePage } from './app/lib/step-context.tsx';
export type {
  MorphTransition,
  SlideTransition,
  TransitionPhase,
} from './app/lib/transition.ts';
export { ClassResults } from './app/live/class-results.tsx';
export { Lobby } from './app/live/lobby.tsx';
export type { MultipleChoiceProps } from './app/live/multiple-choice.tsx';
export { MultipleChoice } from './app/live/multiple-choice.tsx';
export type { OpenSlideConfig, OpenSlideLiveConfig } from './config.ts';
export type { Locale, Plural } from './locale/types.ts';
