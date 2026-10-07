// End-to-end check of a host-paced session in real browsers.
// Needs a running demo (pnpm dev in apps/demo with SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY set) and three
// confirmed users: e2e-host@example.test (listed in public.hosts), e2e-s1@ and e2e-s2@mon-avenir.ca, all with
// password E2e-test-pass-1. Run from packages/core: node supabase/tests/live-flow.e2e.mjs
// Env: BASE_URL (default http://localhost:5173), CHROMIUM_PATH (optional), SHOT_DIR (default ./e2e-shots).
import { mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';

const B = process.env.BASE_URL ?? 'http://localhost:5173';
const SHOT_DIR = process.env.SHOT_DIR ?? './e2e-shots';
mkdirSync(SHOT_DIR, { recursive: true });
const PASS = 'E2e-test-pass-1';
const b = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH,
  args: ['--no-sandbox'],
});
let failures = 0;
const ok = (c, m) => {
  console.log((c ? 'PASS ' : 'FAIL ') + m);
  if (!c) failures++;
};
const T = { timeout: 15000 };
async function page(name, email) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log(`${name} pageerror: ${e.message}`));
  p.on(
    'console',
    (m) => m.type() === 'error' && console.log(`${name} console: ${m.text().slice(0, 200)}`),
  );
  return { ctx, p, email, name };
}
async function signIn(p, email, url) {
  await p.goto(B + url);
  await p.locator('input[type=email]').fill(email);
  await p.locator('input[type=password]').fill(PASS);
  await p.getByRole('button', { name: 'Sign in' }).click();
}
const shot = (p, n) => p.screenshot({ path: `${SHOT_DIR}/${n}.png` });

const host = await page('HOST', 'e2e-host@example.test');
const s1 = await page('S1', 'e2e-s1@mon-avenir.ca');
const s2 = await page('S2', 'e2e-s2@mon-avenir.ca');

try {
  await host.p.goto(B + '/sessions');
  await host.p.locator('input[type=email]').fill(host.email);
  await host.p.locator('input[type=password]').fill(PASS);
  await host.p.getByRole('button', { name: 'Sign in' }).click();
  await host.p.locator('h1', { hasText: 'Active sessions' }).waitFor(T);
  await host.p.goto(B + '/s/live-quiz-demo');
  await host.p.locator('button[aria-label="Present options"]').click();
  await host.p.getByText('Start host-paced session').click();
  await host.p.waitForURL(/\/screen\?session=/, T);
  const sessionId = new URL(host.p.url()).searchParams.get('session');
  ok(!!sessionId, 'host-paced session started, screen opened');
  const code = (await host.p.locator('.font-mono.text-2xl').first().innerText(T)).trim();
  ok(/^[A-Z2-9]{6}$/.test(code), `session code shown in corner: ${code}`);
  await shot(host.p, 's-lobby');

  for (const s of [s1, s2]) {
    await signIn(s.p, s.email, '/join/' + code);
    await s.p.waitForURL(/\/play\//, T);
    await s.p.getByText("You're in!").waitFor(T);
  }
  ok(true, 'both students joined via /join/<code>');
  await host.p.getByText('2 students in the lobby').waitFor(T);
  ok(true, 'screen lobby shows 2 students (realtime)');
  await shot(s1.p, 's1-lobby');

  const presenter = await host.ctx.newPage();
  presenter.on('pageerror', (e) => console.log('PRES pageerror: ' + e.message));
  await presenter.goto(`${B}/s/live-quiz-demo/presenter?session=${sessionId}`);
  await presenter.getByText('Students · 2').waitFor(T);
  ok(true, 'presenter view lists 2 students');
  await shot(presenter, 'presenter-lobby');

  await host.p.keyboard.press('ArrowRight');
  await host.p.keyboard.press('ArrowRight');
  await host.p.getByText('What is the capital of Canada?').waitFor(T);
  await host.p.getByText('Click to let participants answer').waitFor(T);
  ok(true, 'host-paced nav to Q1; screen shows padlock');
  await s1.p.getByText('What is the capital of Canada?').waitFor(T);
  await s1.p.getByText('Waiting for your host to open this question').waitFor(T);
  ok(true, 'student follows host to Q1; sees padlock');
  await presenter.getByText('What is the capital of Canada?').first().waitFor(T);
  ok(true, 'presenter shows question panel');

  await host.p.getByText('Click to let participants answer').click();
  await s1.p.getByRole('button', { name: 'Toronto' }).waitFor(T);
  await s2.p.getByRole('button', { name: 'Ottawa' }).waitFor(T);
  ok(true, 'unlock reaches students in realtime');
  await shot(host.p, 's-open');
  await shot(s1.p, 's1-open');

  await s1.p.getByRole('button', { name: 'Toronto' }).click();
  await s1.p.getByText('Thanks for your answer!').waitFor(T);
  ok(true, 's1 sees thanks + choice');
  await host.p.getByText('1 / 2').waitFor(T);
  ok(true, 'screen progress bar 1/2');
  await s2.p.getByRole('button', { name: 'Ottawa' }).click();
  await s2.p.getByText('✓ Correct').waitFor(T);
  await s1.p.getByText('✗ Not quite').waitFor(T);
  ok(true, 'auto-ended when all answered; correctness shown to students');
  await host.p.getByText('Ottawa').first().waitFor(T);
  await shot(host.p, 's-results');
  await shot(s1.p, 's1-results');
  await shot(presenter, 'presenter-results');

  // Q10 has no key: mark one correct from the screen
  for (let i = 0; i < 9; i++) await host.p.keyboard.press('ArrowRight');
  await host.p.getByText('Which season do you like best?').waitFor(T);
  await host.p.getByText('Click to let participants answer').click();
  await s1.p.getByRole('button', { name: 'Winter' }).click();
  await s2.p.getByRole('button', { name: 'Summer' }).click();
  await host.p.getByText('Winter').first().waitFor(T);
  await host.p.getByRole('button', { name: /Winter/ }).click();
  await s1.p.getByText('✓ Correct').waitFor(T);
  await s2.p.getByText('✗ Not quite').waitFor(T);
  ok(true, 'host marks correct answer live; all devices regraded');

  await host.p.keyboard.press('ArrowRight');
  await s1.p.getByText('Your score').waitFor(T);
  ok(true, 'class results page: participant sees score');
  await shot(s1.p, 's1-final');
  await shot(host.p, 's-final');

  await host.p.goto(`${B}/results/${sessionId}`);
  await host.p.getByRole('button', { name: 'By student' }).click();
  await host.p.getByText('e2e-s1').first().waitFor(T);
  ok(true, 'results dashboard by student');
  await shot(host.p, 'results-student');
  await host.p.getByRole('button', { name: 'By question' }).click();
  await shot(host.p, 'results-question');

  await host.p.goto(B + '/sessions');
  await host.p.getByText('Live quiz demo').first().waitFor(T);
  ok(true, 'active sessions tab lists the session');
} catch (e) {
  failures++;
  console.log('ERROR ' + e.message.split('\n').slice(0, 4).join(' | '));
  for (const x of [host, s1, s2]) await shot(x.p, 'fail-' + x.name).catch(() => {});
}
await b.close();
console.log(failures ? `${failures} FAILURE(S)` : 'ALL PASSED');

process.exit(failures ? 1 : 0);
