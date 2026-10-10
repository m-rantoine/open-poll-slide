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
- Four question types exist: `type: 'multiple_choice'` (`<MultipleChoice>`), `type: 'word_cloud'` (`<WordCloud>`), `type: 'drag_drop'` (sorting) and `type: 'association'` (matching); the last two both use `<DragDrop>` with `<DropZone>` and `<ItemPool>`.
- `scored` (optional, any type): whether answers count toward the score. Default `true` for multiple choice, sorting and association, `false` for word clouds. An answer that has no grade (no `correct` set, or a word the host has not marked) never counts, and is never treated as wrong.

### Drag-and-drop sorting

Participants drag tiles (inline blocks) from a pool into drop zones you place on the slide. Dropping saves immediately and can be changed until the participant presses Submit (or the host stops the question); Submit is what the "everyone has answered" auto-stop counts. Each tile in its right zone is worth one point. When the question ends, each zone on the Screen and Presenter lists the tiles placed in it, most often placed first, with a count; a zone shows at least its first tile and hides the rest if they do not fit.

```tsx
export const questions = {
  animals: {
    id: 'animals',
    type: 'drag_drop',
    question: 'Sort the animals into their groups.',
    zones: [
      { id: 'mammals', label: 'Mammals' },
      { id: 'birds', label: 'Birds' },
    ],
    items: [
      { id: 'dolphin', label: 'Dolphin' },
      { id: 'eagle', label: 'Eagle' },
      { id: 'oak', label: 'Oak tree (decoy)' },
    ],
    correct: { dolphin: 'mammals', eagle: 'birds' }, // leave a tile out to make it a decoy
  },
} satisfies Record<string, InteractiveQuestion>;
```

```tsx
<DragDrop question={questions.animals}>
  <div style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 0.5fr', gap: 32 }}>
    <DropZone zone="mammals" />
    <DropZone zone="birds" />
    <ItemPool style={{ gridColumn: '1 / -1' }} />
  </div>
</DragDrop>
```

- Lay the zones and pool out inside `<DragDrop>` however the slide needs; give every `<DropZone>` and the `<ItemPool>` a definite width and height (grid cells, `position: absolute`, or explicit sizes), because tiles shrink to fit the box.
- In the editor preview the tiles sit in their correct zones (from `correct`) so you can judge how big each zone must be; decoys stay in the pool. `correct` is stripped from production builds, so there the preview shows an empty zone. Run `open-slide live keys` after changing it.
- On phones the slide is too small to drag on, so participants get a larger list of zones under the slide (drag, or tap a tile and then a zone).

### Association (matching)

Same components and same `items` / `zones` / `correct` shape as sorting, with `type: 'association'`, but **each zone holds exactly one tile**: dropping a tile on an occupied zone sends the old tile back to the pool, or swaps the two when the dragged tile came from another zone. Scoring is one point per correct pair.

```tsx
capitals: {
  id: 'capitals',
  type: 'association',
  question: 'Match each country to its capital.',
  zones: [{ id: 'canada', label: 'Canada' }, { id: 'france', label: 'France' }],
  items: [{ id: 'ottawa', label: 'Ottawa' }, { id: 'paris', label: 'Paris' }, { id: 'sydney', label: 'Sydney' }],
  correct: { ottawa: 'canada', paris: 'france' },
},
```

- **Make every zone exactly the same size** (equal grid cells or one shared `style`). Never size a zone to its answer: a zone that is bigger or smaller than its neighbours gives the answer away.
- Tiles shrink their text to fit the zone, so size the zones for the longest tile. In the editor preview a red note appears on any zone whose tile has to shrink below 90%; enlarge all the zones together until the notes disappear.
- Zones stay a fixed size when a tile lands in them; nothing grows or shrinks.

### Word cloud

Participants type one word or short phrase (up to 60 characters). While the question is open the Screen shows only the answer count; when the host stops it (or everyone has answered) the Screen and Presenter show a word cloud, sized by how often each word was given. Words are matched ignoring case and extra spaces. The host marks words correct or incorrect in the Presenter panel or the results page (or by clicking a word on the Screen).

```tsx
export const questions = {
  winter: {
    id: 'winter',
    type: 'word_cloud',
    question: 'In one word, what comes to mind when you think of winter?',
    startLocked: true,
    showResults: true,
  },
  colour: {
    id: 'colour',
    type: 'word_cloud',
    question: 'Name one primary colour.',
    correct: ['red', 'blue', 'yellow'], // optional accepted answers
    scored: true,
  },
} satisfies Record<string, InteractiveQuestion>;
```

Place it like a multiple-choice page (`<h1>` plus `<WordCloud question={questions.winter} />`). Import `WordCloud` and `type InteractiveQuestion` from `@open-slide/core`. `correct` here is stripped from the bundle like multiple-choice keys; run `open-slide live keys` after changing it.

## Page structure

- Every page is a normal `Page` whose root is a full-size `<div>`; `<Lobby />`, `<MultipleChoice />`, `<WordCloud />`, `<DragDrop />` (with its `<DropZone />` and `<ItemPool />` children) and `<ClassResults />` are components placed inside it. The build tags them with `data-slide-loc` and they forward it and `style` to their root element, so the inspector can select and edit them like any element. Keep it that way: pass `style`/`className` through, never wrap a question component in a custom component that drops those props, and size and position each `<DropZone>` and `<ItemPool>` with `style` so they stay editable.
- **First page: `<Lobby />`** for decks meant to be run live. It shows the join URL, session code and student count on the Screen, a waiting message on participant devices, and a student list in the Presenter view. Outside a session it renders a harmless placeholder.
- **Question pages** — a full-size column `<div>` containing `<h1>{questions.x.question}</h1>` followed by `<MultipleChoice question={questions.x} />`. `MultipleChoice` renders only the options/controls and fills the remaining space, shrinking its type to fit; it does not render the question. Use `columns={2}` for a multi-column option grid (also editable in the inspector). Give the `<h1>` an explicit font size and keep padding on the page `<div>`.
- **Last page: `<ClassResults />`** to show the class average (and each participant's own score on their device).
- Normal content pages work as usual and are shown in full on Screen and participant views.

In a regular "Present" (no session) all of these render inertly: options are visible but nothing responds. Do not add your own click handlers.

## Self-review additions

- Every `<MultipleChoice>` receives an object from `questions`, never an inline literal.
- `questions` keys, `id` fields and option ids are unique and kebab/snake-case slugs.
- Option labels are short enough to fit one or two lines at the component's 40px size (about 50 characters).
- Hand-off: tell the user to run a session from the slide's **Present ▾ → Start host-paced / self-paced session** (hosts only), that participants join at `/join` with the session code, that `open-slide live keys` must be run after adding or changing `correct`, and that correct answers left unset can be marked live (marking is remembered for the deck). If sessions are not set up yet, point them to `LIVE-SESSIONS.md` (`open-slide live init`, then `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`).
