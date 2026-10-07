# Live sessions

Pear Deck–style sessions on top of open-slide: a host runs a deck, participants join with a code and answer multiple-choice questions, and hosts review results afterwards. The build stays static; state lives in Supabase (Auth, Postgres with RLS, Realtime).

## Setup

1. Create a Supabase project and link it: `supabase link --project-ref <ref>`.
2. Apply the schema and auth config: `supabase db push` then `supabase config push` (enables the sign-up domain hook and email confirmation). Set `site_url` / `additional_redirect_urls` in `supabase/config.toml` to your deployed URL first.
3. Whitelist hosts: `insert into public.hosts (email) values ('you@example.com');` (lowercase). Hosts can sign up with any domain; everyone else needs an address on a domain listed in `app_settings` (`allowed_email_domains`, default `mon-avenir.ca`).
4. Add the project URL and publishable key to `open-slide.config.ts`:

```ts
live: {
  supabaseUrl: 'https://<ref>.supabase.co',
  supabaseKey: '<publishable key>',
  allowedEmailDomains: ['mon-avenir.ca'], // display only; enforced in the database
},
```

## Using it

- Author decks with the `/create-poll-slide` skill: `export const questions`, `<Lobby />`, `<MultipleChoice question={…} />`, `<ClassResults />`.
- Hosts: sign in, open a deck, **Present ▾ → Start host-paced / self-paced session**. Host-paced opens `/s/<deck>/screen`; the presenter view (`/s/<deck>/presenter?session=<id>`) is opened from the screen's hover toolbar. Self-paced goes to the session overview at `/results/<id>`.
- Participants: `/join` or `/join/<code>`. The sidebar **Active sessions** tab lists running sessions; hosts also get **Results**.
- Plain **Present** never touches the database; questions render inert.

## Security model

All rules are enforced in Postgres, not in routes. Participants can only write through `submit_answer` (membership, open state, timer, one answer per question) and read their own answers through `my_answers` / `my_score`, which hide correctness until the host turns on `show_results`. Answer keys and other students' answers are host-only. Run `supabase/tests/live_sessions.sql` against a project with three test users to check these rules (it rolls back).
