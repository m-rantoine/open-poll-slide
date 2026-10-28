<img width="1280" height="640" alt="open-slide github cover" src="https://github.com/user-attachments/assets/da535284-f7a9-4834-b281-f9ac6fe416e8" />

<br />
<br />
<a href="https://vercel.com/open-source-program">
  <img alt="Vercel OSS Program" src="https://vercel.com/oss/program-badge-2026.svg" />
</a>

# open-slide

[![GitHub stars](https://img.shields.io/github/stars/open-slide/open-slide?style=for-the-badge)](https://github.com/open-slide/open-slide/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/open-slide/open-slide?style=for-the-badge)](https://github.com/open-slide/open-slide/network/members)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

**The slide framework built for agents.** Describe your deck in natural language — your coding agent writes the React. open-slide handles the canvas, scaling, navigation, hot reload, and present mode so the agent can focus on content.

Every slide renders into a fixed **1920 × 1080** canvas. Pages are arbitrary React components, not a constrained DSL.

> **open-poll-slide** is a fork of [open-slide](https://github.com/open-slide/open-slide) that adds live, Pear Deck–style polling sessions. The fork is published as `@rantoine/open-poll-slide-core` and `@rantoine/open-poll-slide-cli`.

## Install via the open-poll-slide CLI

```bash
pnpm dlx @rantoine/open-poll-slide-cli init my-slide
cd my-slide
pnpm install
pnpm dev
```

This scaffolds a workspace with a starter deck, the agent skills (including `/create-poll-slide`) and a `package.json` that installs the fork under the original name through an alias:

```json
"@open-slide/core": "npm:@rantoine/open-poll-slide-core@^0.1.0"
```

Your slides keep importing from `@open-slide/core`, and the `open-slide` command (also available as `open-poll-slide`) works as documented below. You can't install the original `@open-slide/core` in the same project.

To turn on live sessions, create a Supabase project, set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` in `.env.local`, and run `pnpm exec open-slide live init`. See [LIVE-SESSIONS.md](LIVE-SESSIONS.md).

To add the fork to an existing project instead:

```bash
pnpm add @open-slide/core@npm:@rantoine/open-poll-slide-core
```

## Upgrade an existing project

Projects made with an older release need the new package and, if they use live sessions, the new database migrations.

1. **Update the packages.** The fork is installed under an alias with a `^0.x` range, and a caret on `0.x` never crosses a minor version, so re-add it instead of running `pnpm update`:

   ```bash
   pnpm add @open-slide/core@npm:@rantoine/open-poll-slide-core@latest
   ```

2. **Apply the migrations** (only if live sessions are set up). From the project root, with the same Supabase project as before:

   ```bash
   export SUPABASE_DB_PASSWORD=<your database password>
   pnpm exec open-slide live init --project-ref <ref>
   ```

   This copies the new files into `supabase/migrations/` and applies the ones that are missing. It is safe to re-run, and leaving out `--host` and `--domain` keeps your current hosts and allowed domains. This release adds `20261019000100_check_answer.sql`, which creates `check_answer`.

3. **Upload the answer keys** so practice mode can grade:

   ```bash
   pnpm exec open-slide live keys
   ```

4. **Restart `pnpm dev`** and rebuild your deployed site.

What changes for your decks:

- **Practice mode.** In plain **Present**, signed-in users can now answer every question type (multiple choice, word cloud, sorting, association, scale, ranking, points, number, open text) and see right or wrong. The answer is checked by the database against the deck's key and is never stored. Signed-out users, and projects without Supabase, see questions as inert, as before.
- **Word clouds** split answers into single words and ignore punctuation and case.
- Without step 2, answering in Present shows a database error because `check_answer` does not exist yet. Everything else keeps working.

## Why open-slide

Slides are visual code. Agents are great at writing code. open-slide is the missing runtime that turns "make slides about X" into a polished, presentable deck — without you ever leaving the chat.

## Highlights

### 🤖 Agent-native authoring

Works with any coding agent (Claude Code, Codex, Cursor, …). The scaffolder ships with built-in skills:

- **`/create-slide`** — drafts a deck end-to-end. Asks four scoping questions (topic & aesthetic, page count, text density, motion vs. static), picks an id, plans the structure, and writes the pages.
- **`/slide-authoring`** — the technical reference for the 1920 × 1080 canvas, type scale, palette, and layout rules. The agent reads this before writing.

From a one-line prompt to a polished deck, no boilerplate.

### 🎯 In-browser inspector

Switch the dev server toolbar to comment mode, then click any element or drag across a region and leave a note — *"make this red"*, *"change to 'Open Slide Rocks'"*, *"shrink the headline"*. Each comment floats as a pin beside its target and is persisted as an `@slide-comment` marker in source. Run `/apply-comments` and the agent applies every pending edit, then clears the markers.

The loop: present → comment → `/apply-comments` → repeat.

### 🧑‍💻 In-app agent panel

Connect your locally installed Claude Code or Codex once and the whole loop moves into the browser: draft a deck, answer the scoping questions as option cards, apply comments with one click, and edit the selected element by describing the change. Without a connected agent the dev server keeps the terminal-driven flow above.

### 🖼️ Assets manager + svgl logo search

Manage images, videos, and fonts per deck through a built-in assets panel. Search and drop in any brand logo via the integrated [svgl](https://svgl.app/) catalogue — no more hunting for SVGs.

### 🎬 Professional present mode

Fullscreen playback with keyboard navigation, plus a **presenter mode** with current/next slide preview, speaker notes, and a timer. Built for the stage, not just the browser tab.

### 🙋 Live sessions (open-poll-slide fork)

Run decks as Pear Deck–style live sessions: lobby, multiple-choice questions with lock/timer controls, host-paced or self-paced, per-student results and a host dashboard, backed by your own Supabase project. Create the tables with one command, `open-slide live init`, and provide `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`. See [LIVE-SESSIONS.md](LIVE-SESSIONS.md) for setup, and `apps/demo/slides/live-quiz-demo` for a ten-question example. The `/create-poll-slide` skill authors question decks.

### 📦 Export to static HTML, PDF & PPTX

One command exports your deck as a self-contained static HTML site, a print-ready PDF, or an editable PowerPoint file. The PPTX export runs entirely in the browser and turns each page into native text boxes, shapes, and images — no server, no headless browser.

### 📁 Slide manager

Organise decks into folders with custom emoji and drag-and-drop to reorder. Useful once you've built more than three decks and need to find anything.

### 🚀 Deploy-friendly

Outputs a plain static build — one-click deploy to Vercel, Cloudflare Pages, Zeabur, Netlify, or any static host. No server, no runtime, no lock-in.

## Get started

```bash
npx @open-slide/cli init my-slide
cd my-slide
pnpm dev
```

The scaffolded workspace ships with agent skills preconfigured for Claude Code. From there you drive the deck through your agent — or edit `slides/<id>/index.tsx` directly. See [CLAUDE.md](CLAUDE.md) for the hard rules.

## Repo layout

This repo is a pnpm + Turbo monorepo.

| Path | Description |
| --- | --- |
| [packages/core](packages/core) | `@open-slide/core` — runtime (home page, slide viewer, present mode, inspector), Vite plugin, and the `open-slide` dev/build/preview CLI. |
| [packages/cli](packages/cli) | `@open-slide/cli` — `npx @open-slide/cli init` scaffolder. Generates a minimal workspace where Vite/React/tsconfig stay hidden inside core. |
| [apps/demo](apps/demo) | Example workspace that consumes `@open-slide/core` via `workspace:*`. Used for local development of the framework. |

## Development

```bash
pnpm install
pnpm dev      # runs the demo against the local @open-slide/core
pnpm build    # builds all packages
pnpm check    # type-checks all packages
pnpm lint     # lints via biome
```

## Support

If open-slide has been useful to you, consider supporting development:

<a href="https://buymeacoffee.com/1weiho"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me a Coffee" height="40"></a>

## License

MIT © [Yiwei Ho](https://github.com/1weiho)
