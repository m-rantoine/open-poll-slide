import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { cp, mkdir, readdir, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import chalk from 'chalk';
import fg from 'fast-glob';
import { findAnswerKeys } from '../vite/answer-keys-plugin.ts';
import { loadUserConfig } from '../vite/open-slide-plugin.ts';
import { glyph } from './ui.ts';

export interface LiveInitFlags {
  projectRef?: string;
  host?: string[];
  domain?: string[];
  skipHook?: boolean;
  siteUrl?: string[];
}

const EMAIL_RE = /^[^\s@'";]+@[^\s@'";]+\.[^\s@'";]+$/;
const DOMAIN_RE = /^[a-z0-9]([a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$/;
const HOOK_URI = 'pg-functions://postgres/public/hook_restrict_signup_domain';

export interface LiveKeysFlags {
  projectRef?: string;
}

function say(message: string) {
  process.stdout.write(`  ${chalk.green('✓')} ${message}\n`);
}

function warn(message: string) {
  process.stdout.write(`  ${chalk.yellow(glyph.warn)} ${message}\n`);
}

function sqlLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function supabase(args: string[], opts: { capture?: boolean } = {}): string {
  const res = spawnSync('supabase', args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: opts.capture ? ['inherit', 'pipe', 'pipe'] : 'inherit',
  });
  if (res.error) {
    throw new Error(
      'The Supabase CLI was not found on PATH. Install it from https://supabase.com/docs/guides/cli',
    );
  }
  if (res.status !== 0) {
    throw new Error(
      `supabase ${args.slice(0, 2).join(' ')} failed${opts.capture ? `:\n${res.stderr || res.stdout}` : ''}`,
    );
  }
  return res.stdout ?? '';
}

function bundledMigrationsDir(): string {
  let dir = path.dirname(fileURLToPath(import.meta.url));
  while (!existsSync(path.join(dir, 'package.json'))) {
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return path.join(dir, 'supabase', 'migrations');
}

function accessToken(): string | null {
  if (process.env.SUPABASE_ACCESS_TOKEN) return process.env.SUPABASE_ACCESS_TOKEN;
  try {
    return readFileSync(path.join(os.homedir(), '.supabase', 'access-token'), 'utf8').trim();
  } catch {
    return null;
  }
}

// Same upward search the Supabase CLI does, so a workspace nested in a linked repo works.
function linkedRef(): string | null {
  let dir = process.cwd();
  for (;;) {
    const file = path.join(dir, 'supabase', '.temp', 'project-ref');
    if (existsSync(file)) return readFileSync(file, 'utf8').trim();
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

async function configureAuth(ref: string, siteUrls: string[]): Promise<boolean> {
  const token = accessToken();
  if (!token) return false;
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      hook_before_user_created_enabled: true,
      hook_before_user_created_uri: HOOK_URI,
      mailer_autoconfirm: true,
      ...(siteUrls.length > 0 ? { site_url: siteUrls[0], uri_allow_list: siteUrls.join(',') } : {}),
    }),
  });
  return res.ok;
}

function ensureLinked(projectRef: string | undefined): string {
  const ref = projectRef ?? process.env.SUPABASE_PROJECT_REF ?? linkedRef();
  if (!ref) {
    throw new Error(
      'No Supabase project is linked. Pass --project-ref <ref> (or set SUPABASE_PROJECT_REF), or run `supabase link` first.',
    );
  }
  if (linkedRef() !== ref) {
    supabase(['link', '--project-ref', ref], { capture: true });
    say(`Linked project ${ref}`);
  }
  return ref;
}

type DeckKey = { deck: string; question: string; correct: string[] };

async function collectAnswerKeys(): Promise<DeckKey[]> {
  const cwd = process.cwd();
  const config = await loadUserConfig(cwd);
  const slidesRoot = path.resolve(cwd, config.slidesDir ?? 'slides');
  const files = await fg('*/**/*.{tsx,ts,jsx,js}', {
    cwd: slidesRoot,
    ignore: ['**/node_modules/**', '**/*.d.ts', '**/*.test.*'],
  });
  const keys: DeckKey[] = [];
  for (const file of files.sort()) {
    const deck = file.split('/')[0];
    for (const key of findAnswerKeys(await readFile(path.join(slidesRoot, file), 'utf8'))) {
      if (!key.questionId || !key.correct) {
        warn(
          `Skipped a question in ${file}: \`id\` and \`correct\` must be string literals to be uploaded.`,
        );
        continue;
      }
      keys.push({ deck, question: key.questionId, correct: key.correct });
    }
  }
  return keys;
}

async function uploadAnswerKeys(): Promise<void> {
  const keys = await collectAnswerKeys();
  if (keys.length === 0) {
    say('No answer keys found in slide sources');
    return;
  }
  const rows = JSON.stringify(keys.map((k) => ({ d: k.deck, q: k.question, c: k.correct })));
  supabase(
    [
      'db',
      'query',
      '--linked',
      `insert into public.deck_answer_keys (deck_id, question_id, correct_option_ids)
select x.d, x.q, array(select jsonb_array_elements_text(x.c))
from jsonb_to_recordset(${sqlLiteral(rows)}::jsonb) as x(d text, q text, c jsonb)
on conflict (deck_id, question_id) do update
  set correct_option_ids = excluded.correct_option_ids, updated_at = now();`,
    ],
    { capture: true },
  );
  const decks = new Set(keys.map((k) => k.deck));
  say(`Uploaded ${keys.length} answer key(s) from ${decks.size} deck(s)`);
}

export async function liveKeys(flags: LiveKeysFlags): Promise<void> {
  ensureLinked(flags.projectRef);
  await uploadAnswerKeys();
}

export async function liveInit(flags: LiveInitFlags): Promise<void> {
  const hosts = (flags.host ?? []).map((h) => h.trim().toLowerCase());
  const domains = (flags.domain ?? []).map((d) => d.trim().toLowerCase());
  const siteUrls = (flags.siteUrl ?? []).map((u) => u.trim().replace(/\/$/, ''));
  for (const u of siteUrls) new URL(u);
  for (const h of hosts) if (!EMAIL_RE.test(h)) throw new Error(`Invalid host email: ${h}`);
  for (const d of domains) if (!DOMAIN_RE.test(d)) throw new Error(`Invalid domain: ${d}`);

  const source = bundledMigrationsDir();
  if (!existsSync(source)) throw new Error(`Bundled migrations not found at ${source}.`);

  const cwd = process.cwd();
  if (!existsSync(path.join(cwd, 'supabase', 'config.toml'))) {
    supabase(['init', '--force'], { capture: true });
    say('Created supabase/config.toml');
  }

  const target = path.join(cwd, 'supabase', 'migrations');
  await mkdir(target, { recursive: true });
  const existing = new Set(await readdir(target));
  let copied = 0;
  for (const file of (await readdir(source)).filter((f) => f.endsWith('.sql')).sort()) {
    if (existing.has(file)) continue;
    await cp(path.join(source, file), path.join(target, file));
    copied++;
  }
  say(
    copied > 0
      ? `Copied ${copied} migration file(s) to supabase/migrations`
      : 'Migrations already present',
  );

  const ref = ensureLinked(flags.projectRef);

  supabase(['db', 'push', '--yes'], { capture: true });
  say('Applied database schema');

  const statements: string[] = [];
  for (const h of hosts) {
    statements.push(`insert into public.hosts (email) values ('${h}') on conflict do nothing;`);
  }
  if (domains.length > 0) {
    statements.push(
      `update public.app_settings set value = '${JSON.stringify(domains)}'::jsonb where key = 'allowed_email_domains';`,
    );
  }
  if (statements.length > 0) {
    supabase(['db', 'query', '--linked', statements.join('\n')], { capture: true });
    if (hosts.length > 0) say(`Whitelisted host(s): ${hosts.join(', ')}`);
    if (domains.length > 0) say(`Allowed sign-up domain(s): ${domains.join(', ')}`);
  }
  if (domains.length === 0) {
    warn(
      'No --domain given, so the allowed sign-up domains were left as they were. With none set, only hosts can sign up.',
    );
  }

  await uploadAnswerKeys();

  if (!flags.skipHook) {
    if (await configureAuth(ref, siteUrls)) {
      say('Enabled the sign-up domain hook (email confirmation off: sign-up signs in immediately)');
      if (siteUrls.length > 0) say(`Set site URL / redirects: ${siteUrls.join(', ')}`);
    } else {
      warn(
        'Could not enable the sign-up hook automatically (no access token).\n' +
          '    Run `supabase login` and re-run this command, or in the dashboard go to\n' +
          '    Authentication → Hooks → Before User Created → Postgres function → public.hook_restrict_signup_domain.',
      );
    }
  }

  process.stdout.write(
    `\n  Next: put your project URL and publishable key in the environment (or .env.local):\n\n` +
      `    SUPABASE_URL=https://${ref}.supabase.co\n` +
      `    SUPABASE_PUBLISHABLE_KEY=<Project Settings → API Keys → publishable>\n\n`,
  );
}
