# Live sessions

Pear Deck–style sessions on top of open-slide. A host runs a deck, participants join with a code and answer multiple-choice, word-cloud or drag-and-drop sorting questions, and hosts review results afterwards. The build stays a static site; state lives in your own Supabase project (Auth, Postgres with RLS, Realtime).

## Setup

Start a project with `pnpm dlx @rantoine/open-poll-slide-cli init my-slide` (see the README), or add the fork to an existing one with `pnpm add @open-slide/core@npm:@rantoine/open-poll-slide-core`.

You need a Supabase project and the [Supabase CLI](https://supabase.com/docs/guides/cli), logged in (`supabase login`).

**1. Create the tables.** From your open-slide workspace:

```bash
export SUPABASE_DB_PASSWORD=<your database password>
pnpm exec open-slide live init \
  --project-ref <ref> \
  --host you@example.com \
  --domain school.example \
  --site-url http://localhost:5173 https://slides.example.com
```

This copies the migrations into `supabase/migrations/`, links the project, applies the schema, whitelists the host email(s), sets the allowed participant sign-up domain(s), sets the site URL and redirect list, and turns on the sign-up domain hook with email confirmation off, so signing up logs the participant straight in and no emails are sent (through the Management API, using your CLI login or `SUPABASE_ACCESS_TOKEN`). It also uploads the answer keys from your slide sources (see **Answer keys** below). It is safe to re-run. Add more hosts later by re-running with `--host`, or with SQL: `insert into public.hosts (email) values ('someone@example.com');` (lowercase).

**Allowed domains.** Only addresses on the `--domain` list (plus hosts) can sign up; every other domain is rejected. With no domains set, only hosts can sign up. Each `--domain` run replaces the whole list; leave the flag out to keep the current list. You can also edit it in SQL: `update public.app_settings set value = '["school.example"]' where key = 'allowed_email_domains';`.

If the hook step reports a missing token, set it in the dashboard: Authentication → Hooks → Before User Created → Postgres function → `public.hook_restrict_signup_domain`.

**2. Provide the keys.** Put these in the environment or a `.env.local` next to `open-slide.config.ts` (gitignored):

```bash
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_PUBLISHABLE_KEY=<Project Settings → API Keys → publishable key>
# optional, display only; the database enforces the real list
OPEN_SLIDE_ALLOWED_EMAIL_DOMAINS=school.example
```

Only the publishable key is read; it is meant for browsers. Never put the service-role or secret key here. (You can alternatively set `live: { supabaseUrl, supabaseKey }` in `open-slide.config.ts`.) Without these variables the live features stay hidden and everything else works as before.

**3. Run it.** `pnpm dev`, open the `live-quiz-demo` deck, and choose Present ▾ → *Start host-paced session*.

## Using it

- **Authoring:** use the `/create-poll-slide` skill, or write `export const questions`, `<Lobby />`, `<MultipleChoice question={questions.x} />` and `<ClassResults />` by hand (see `apps/demo/slides/live-quiz-demo`, ten questions).
- **Question types:** multiple choice (`<MultipleChoice>`) and word cloud (`<WordCloud>`, participants type a word or short phrase; the Screen and Presenter show a word cloud once the answer period ends, and the host marks words correct or incorrect from the Presenter panel, the results page, or by clicking a word on the Screen).
- **Sorting questions:** `<DragDrop>` with `<DropZone>` and `<ItemPool>` placed on the slide. Participants drag tiles into zones (saved as they drop, changeable until they press Submit); each tile in its right zone is worth one point. The Screen and Presenter show, per zone, the tiles placed there from most to least often.
- **Association questions:** fill-in-the-blank matching with `type: 'association'`: small inline `<DropZone>` blanks (in a sentence, a table or around a diagram) that each hold one tile (a new tile replaces or swaps with the old one). Keep every blank the same size so the layout does not reveal the answer; tiles shrink to fit.
- **Scoring:** each question is scored or not (`scored`, default on for multiple choice and off for word clouds; hosts can flip it live in the Presenter panel or results page). Only scored answers that have a grade count toward scores, so a question with no correct answer set, or a word the host has not marked, is left out of the total instead of counting as wrong.
- **Hosts** sign in, then on a deck choose **Present ▾ → Start host-paced / self-paced session**.
  - Host-paced opens `/s/<deck>/screen` (projector). Hover the bottom-left to open the presenter view (`/s/<deck>/presenter?session=<id>`) on the host's own computer. Arrow keys / space move everyone.
  - Self-paced opens the session overview at `/results/<id>`; participants move through the deck themselves.
- **Participants** go to `/join` or `/join/<code>`, sign up (approved domains only, no confirmation email) and are placed in the session. Closing the window makes them inactive; they can rejoin and keep their answers. The sidebar **Active sessions** tab lists running sessions.
- **Results:** the sidebar **Results** tab (hosts only) and `/results/<id>` show summary, by-question and by-student views. Click an option on the screen, presenter panel or results page to mark or unmark it as correct; all existing and future answers are re-graded automatically, and the choice is remembered for later sessions of the same deck.
- **Enter** on the host screen or presenter view locks or unlocks the question on the current slide. A stopped question is left alone, and Enter does nothing while the session is paused.
- **Pause and resume:** hosts can pause from the host screen, presenter view or results page. A paused session keeps its slide, step, answers and running timers (their remaining time is saved); participants see a paused screen and cannot answer, and paused time is not counted as inactive time. It stays in the **Active sessions** tab, where hosts resume it with **Resume** (host-paced sessions reopen the host screen at the same slide). Participants who return while it is paused wait on the paused screen and continue when the host resumes. Ending a paused session works as usual.
- **Rejoining:** `/join` lists the sessions you are already in, with a **Rejoin** button for each, so a closed tab or phone is one tap from being back with your answers intact.
- **Themes:** once live sessions are configured, the Themes tab (sidebar, mobile menu and command menu) is shown to hosts only. Signed-out visitors and participants do not see it; without live sessions everyone does.
- **Language:** pick Français (Canada) or another language from the language menu; live-session screens follow it.
- Every live view (host screen, participants, presenter preview) renders through the standard Player, so a deck's `transition` and step reveals behave as in **Present**. The host screen also gets the Present control bar (overview, blackout, laser, fullscreen) and keyboard shortcuts; participants in a host-paced session cannot navigate.
- Plain **Present** never touches the database; questions render inert.

## Answer keys

`correct` in a question is never sent to browsers. The build blanks it out of slide sources, so participants cannot find it in the page, and session rows only store the questions without their keys. Keys live in the host-only `deck_answer_keys` table:

```bash
pnpm exec open-slide live keys   # upload every `correct` in slides/ (run after adding or changing one)
```

`correct` must be an array of string literals for the command to read it. Keys marked live from the app are saved to the same table; running `live keys` again overwrites them with the values in your sources. Participants learn whether they were right only from the server: `submit_answer` returns the grade, and the participant screens show it once the host reveals results (`showResults`).

## Private decks

Decks are public by default. A deck becomes private in either of two ways, and its own setting wins:

1. In the deck: `export const isPrivate = true;` (or `false`) in `slides/<id>/index.tsx`. It must be a literal `true` or `false`.
2. For every deck without that export: set `SLIDES_DEFAULT_AS_PRIVATE=true` (also `1` or `yes`) in the environment or an `.env` file when you run or build. Unset means public. The demo app sets it in `apps/demo/.env.production`, so its built site is private by default.

Private decks are hidden from everyone except signed-in hosts: they do not appear on any homepage tab, in the command menu, in the deck switcher or in theme listings, and opening `/s/<id>` shows the same "Page not found" as an unknown deck. They do appear in **Active sessions** while a session is running, and participants play them through the session (`/join`) as usual. Hosts see a **Private** label on their cards. If live sessions are not configured, nobody is a host, so private decks are hidden from everybody.

This is a visibility rule, not access control: the deck's code is part of the site you publish, so someone who knows the file's address can still download it. Keep anything secret out of decks, or host the site behind your own login.

## Security model

All rules are enforced in Postgres, not in routes. Participants can only write through `submit_answer` (membership, open state, timer, one answer per question) and read their own answers through `my_answers` / `my_score`, which hide correctness until the host turns on `show_results`. Answer keys (per session and per deck) and other students' answers are host-only. The sign-up hook rejects emails outside the allowed domains unless the address is a host. `supabase/tests/live_sessions.sql` (in the core package) checks these rules: it creates its own users inside one transaction and always rolls back (`supabase db query --linked -f supabase/tests/live_sessions.sql`; the last line reads `ALL CHECKS PASSED`). `supabase/tests/live-flow.e2e.mjs` drives a full host-paced session (host, presenter, two students) in real browsers with Playwright, and `live-extras.e2e.mjs` covers timers, inactive tracking, self-paced mode and a phone viewport; their headers list the setup.

## Notes

- With email confirmation off, the domain check only proves the *typed* address is on an allowed domain, not that the person owns it. Someone could register another student's address first. Turn confirmation back on (Authentication → Providers → Email) if that matters.
- A student whose heartbeat has stopped for a minute (closed tab, sleeping phone) no longer counts toward "everyone answered" or the lobby count.
- The participant view chooses its layout from the screen shape, not its width. When the screen is portrait, meaning its width is at most 0.75x its height (a phone upright, or a tall tablet), the slide sits in a fixed spot near the top and the answer buttons are drawn below it at a readable size. Otherwise the whole question is drawn inside the slide, as on the host screen.
- Session codes are listed to any signed-in user on the Active sessions tab.
