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

## Why open-slide

Slides are visual code. Agents are great at writing code. open-slide is the missing runtime that turns "make slides about X" into a polished, presentable deck — without you ever leaving the chat.

## Highlights

### 🤖 Agent-native authoring

Works with any coding agent (Claude Code, Codex, Cursor, …). The scaffolder ships with built-in skills:

- **`/create-slide`** — drafts a deck end-to-end. Asks four scoping questions (topic & aesthetic, page count, text density, motion vs. static), picks an id, plans the structure, and writes the pages.
- **`/slide-authoring`** — the technical reference for the 1920 × 1080 canvas, type scale, palette, and layout rules. The agent reads this before writing.

From a one-line prompt to a polished deck, no boilerplate.

### 🎯 In-browser inspector

Click any element in the dev server and attach a comment — *"make this red"*, *"change to 'Open Slide Rocks'"*, *"shrink the headline"*. Comments are persisted as `@slide-comment` markers in source. Run `/apply-comments` and the agent applies every pending edit, then clears the markers.

The loop: present → click to comment → `/apply-comments` → repeat.

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
