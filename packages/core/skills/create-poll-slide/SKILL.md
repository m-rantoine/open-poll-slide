---
name: create-poll-slide
description: Use this skill when the user wants slides with interactive questions, polls, quizzes, a lobby, or class results for live sessions (host-paced or self-paced) in this open-slide repo. Triggers on "make an interactive deck", "add a poll / quiz / multiple-choice question", "live session slides", "Pear Deck style", "add a lobby", "class results page". It extends `create-slide`; for decks without questions use `create-slide` alone.
---

# Create a poll slide

This skill augments **`create-slide`**. Follow `create-slide` end to end (theme, the four scoping questions, id, structure, visual direction, self-review) and **read `slide-authoring`** before writing code. This file only adds the question-specific steps. You still write only under `slides/<id>/`.

## Extra scoping questions

Ask these in one `AskUserQuestion` call, together with or right after the `create-slide` questions. Skip any the user already answered.

1. **Questions** — how many, and the question text with options. If the user gave a topic only, draft the questions yourself and show them for confirmation.
2. **Correct answers** — known now, or leave unset so the host marks them live (clicking an option on the Screen or Presenter view while results are showing)?
3. **Pacing default** — `startLocked` per question: `true` (host opens each question, default) or `false` (open as soon as the slide appears). This only affects host-paced sessions.
4. **Show results** — `showResults` per question: reveal correctness to participants once answers close, or keep hidden until the host flips it (default `false`).

## The question contract

Declare every question once, in a top-level `export const questions`, and pass the object to the component. The framework snapshots `questions` when a session starts, so the Presenter view and the `/results` dashboard can show text and options for pages that are not on screen.

```tsx
import {
  ClassResults,
  Lobby,
  MultipleChoice,
  type MultipleChoiceQuestion,
  type Page,
} from '@open-slide/core';

export const questions = {
  capital: {
    id: 'capital',
    type: 'multiple_choice',
    question: 'What is the capital of Canada?',
    options: [
      { id: 'toronto', label: 'Toronto' },
      { id: 'ottawa', label: 'Ottawa' },
    ],
    correct: ['ottawa'], // omit to let the host mark it live
    startLocked: true,
    showResults: true,
  },
} satisfies Record<string, MultipleChoiceQuestion>;

export default [
  () => <Lobby title="Welcome" />,
  // ...content pages...
  () => <MultipleChoice question={questions.capital} />,
  () => <ClassResults />,
] satisfies Page[];
```

Rules:

- `id` must equal its key in `questions`, and be unique within the deck. Option `id`s are stable slugs (`ottawa`), never positions — answers are stored by option id, so reordering or rewording later does not corrupt past results.
- `correct` is an array of string literal option ids; omit it entirely when unknown. Several correct options are allowed. It never reaches the browser: the build strips it, and `open-slide live keys` uploads it to the database, so tell the user to run that command after adding or changing answer keys.
- One question per page. The component fills the whole 1920×1080 page itself (it brings its own frame, heading and options), so do not wrap it in a padded container. It uses `--osd-*` design variables when the deck exports `design`, so declare `design` as `create-slide` recommends.
- Optional: `export const isPrivate = true;` hides the deck from non-hosts (it then only opens through a session). Without it the deck follows `SLIDES_DEFAULT_AS_PRIVATE` (public when unset).
- Only multiple choice exists today (`type: 'multiple_choice'`).

## Page structure

- **First page: `<Lobby />`** for decks meant to be run live. It shows the join URL, session code and student count on the Screen, a waiting message on participant devices, and a student list in the Presenter view. Outside a session it renders a harmless placeholder.
- **Question pages** — `<MultipleChoice question={questions.x} />`. Put an explanatory content page before a question when the audience needs context; do not add a heading above the question.
- **Last page: `<ClassResults />`** to show the class average (and each participant's own score on their device).
- Normal content pages work as usual and are shown in full on Screen and participant views.

In a regular "Present" (no session) all of these render inertly: options are visible but nothing responds. Do not add your own click handlers.

## Self-review additions

- Every `<MultipleChoice>` receives an object from `questions`, never an inline literal.
- `questions` keys, `id` fields and option ids are unique and kebab/snake-case slugs.
- Option labels are short enough to fit one or two lines at the component's 40px size (about 50 characters).
- Hand-off: tell the user to run a session from the slide's **Present ▾ → Start host-paced / self-paced session** (hosts only), that participants join at `/join` with the session code, that `open-slide live keys` must be run after adding or changing `correct`, and that correct answers left unset can be marked live (marking is remembered for the deck). If sessions are not set up yet, point them to `LIVE-SESSIONS.md` (`open-slide live init`, then `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`).
