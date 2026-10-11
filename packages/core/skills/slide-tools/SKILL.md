---
name: slide-tools
description: Use this skill when the user wants a worked-solution math slide with step-by-step reveals, a break or countdown timer slide, a clock slide, or asks about the clock/timer overlay shortcuts (T and C) in this open-slide repo. Triggers on "show how to solve this equation", "step-by-step math", "break slide", "countdown", "timer slide", "clock slide".
---

# Math, timer and clock slides

These are ready-made components imported from `@open-slide/core`. Follow `create-slide` for the deck itself and read `slide-authoring` before writing code. You still write only under `slides/<id>/`.

## Worked equation: `<SolveSteps>`

Shows how an equation is solved, one line per press. The first line is visible at once; each later line appears on the next press and the previous lines fade back so the audience follows the newest. Equals signs line up down the page; the optional `note` explains each move.

```tsx
import { SolveSteps, type Page } from '@open-slide/core';

export default [
  () => (
    <SolveSteps
      title="Solve 2x + 3 = 11"
      steps={[
        { tex: '2x + 3 = 11', note: 'Start with the equation' },
        { tex: '2x + 3 \\color{#c8102e}{- 3} = 11 \\color{#c8102e}{- 3}', note: 'Subtract 3 from both sides' },
        { tex: '2x = 8', note: 'Simplify' },
        { tex: 'x = 4', note: 'Divide both sides by 2' },
      ]}
    />
  ),
] satisfies Page[];
```

- `tex` is LaTeX (rendered as MathML by Temml): fractions `\frac{a}{b}`, powers `x^2`, roots `\sqrt{x}`, `\text{or}`, `\quad` for spacing. Remember to double the backslashes inside a normal JS string.
- Colour the part that changed with `\color{#c8102e}{…}` so the eye lands on it.
- Keep each line to one idea. Four to six steps fit a page; split longer working across pages.
- `size` (default 76) sets the equation size in pixels.

## Break and countdown timer: `<CountdownTimer>`

A full-page countdown that starts when the slide appears and chimes at zero. Click it to pause or resume.

```tsx
<CountdownTimer title="Break" subtitle="Back at 10:45" duration="10:00" skin="ring" />
```

- `duration`: seconds, or `'m:ss'` / `'h:mm:ss'`.
- `skin`: `digital` (default, glowing digits), `ring` (circular progress), `bar` (progress bar), `flip` (flip cards). Pick one per deck for consistency.
- The last ten seconds turn red and pulse; at zero it flashes. `sound={false}` silences the chime; `autoStart={false}` waits for a click.

## Clock: `<ClockSlide>`

```tsx
<ClockSlide title="We start at 9:00" skin="analog" showDate />
```

`skin`: `analog` (default), `digital`, `flip`, `minimal`. `timeZone="America/Toronto"` shows another zone; `showDate` adds today's date.

## The clock and timer overlay (nothing to author)

Every Present view, host Screen and Presenter view has a small clock-and-timer menu, and these shortcuts:

- **C** shows or hides a clock over the slide.
- **T** shows or hides a timer over the slide (presets of 1, 5, 10 and 15 minutes or any number of minutes, start, pause, reset, sound).
- The palette button on each card cycles the look. The presenter window and the projection window share one timer.

Mention these shortcuts when handing off a deck that has breaks.
