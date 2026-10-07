# Live sessions

Pear Deck–style sessions on top of open-slide. A host runs a deck, participants join with a code and answer multiple-choice questions, and hosts review results afterwards. The build stays a static site; state lives in your own Supabase project (Auth, Postgres with RLS, Realtime).

## Setup

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

This copies the migrations into `supabase/migrations/`, links the project, applies the schema, whitelists the host email(s), sets the allowed participant sign-up domain(s), sets the site URL and redirect list, and turns on the sign-up domain hook with email confirmation off, so signing up logs the participant straight in and no emails are sent (through the Management API, using your CLI login or `SUPABASE_ACCESS_TOKEN`). It is safe to re-run. Add more hosts later by re-running with `--host`, or with SQL: `insert into public.hosts (email) values ('someone@example.com');` (lowercase).

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
- **Hosts** sign in, then on a deck choose **Present ▾ → Start host-paced / self-paced session**.
  - Host-paced opens `/s/<deck>/screen` (projector). Hover the bottom-left to open the presenter view (`/s/<deck>/presenter?session=<id>`) on the host's own computer. Arrow keys / space move everyone.
  - Self-paced opens the session overview at `/results/<id>`; participants move through the deck themselves.
- **Participants** go to `/join` or `/join/<code>`, sign up (approved domains only, no confirmation email) and are placed in the session. Closing the window makes them inactive; they can rejoin and keep their answers. The sidebar **Active sessions** tab lists running sessions.
- **Results:** the sidebar **Results** tab (hosts only) and `/results/<id>` show summary, by-question and by-student views. If a question has no saved correct answer, click an option on the screen, presenter panel or results page to mark it correct; all existing and future answers are re-graded automatically.
- Plain **Present** never touches the database; questions render inert.

## Security model

All rules are enforced in Postgres, not in routes. Participants can only write through `submit_answer` (membership, open state, timer, one answer per question) and read their own answers through `my_answers` / `my_score`, which hide correctness until the host turns on `show_results`. Answer keys and other students' answers are host-only. The sign-up hook rejects emails outside the allowed domains unless the address is a host. `supabase/tests/live_sessions.sql` (in the core package) checks these rules against a project with three confirmed test users and rolls back. `supabase/tests/live-flow.e2e.mjs` drives a full host-paced session (host, presenter, two students) in real browsers with Playwright, and `live-extras.e2e.mjs` covers timers, inactive tracking, self-paced mode and a phone viewport; their headers list the setup.

## Notes

- With email confirmation off, the domain check only proves the *typed* address is on an allowed domain, not that the person owns it. Someone could register another student's address first. Turn confirmation back on (Authentication → Providers → Email) if that matters.
- UI strings for live sessions are English only.
- On phones (under 768px wide) the participant view shows the slide at the top and a native answer card with large tap targets below it.
- Session codes are listed to any signed-in user on the Active sessions tab.
