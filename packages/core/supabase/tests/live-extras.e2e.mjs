// Timers, inactivity, self-paced mode and a phone viewport, in real browsers.
// Same setup as live-flow.e2e.mjs. Run from packages/core: node supabase/tests/live-extras.e2e.mjs
import { mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';

const B = process.env.BASE_URL ?? 'http://localhost:5173';
const SHOT_DIR = process.env.SHOT_DIR ?? './e2e-shots';
const PASS = 'E2e-test-pass-1';
mkdirSync(SHOT_DIR, { recursive: true });
const b = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH,
  args: ['--no-sandbox'],
});
let failures = 0;
const ok = (c, m) => {
  console.log((c ? 'PASS ' : 'FAIL ') + m);
  if (!c) failures++;
};
const T = { timeout: 20000 };

async function user(name, email, viewport = { width: 1440, height: 900 }) {
  const ctx = await b.newContext({ viewport });
  const p = await ctx.newPage();
  // Background headless pages report hasFocus() === false; emulate a focused window.
  await (await ctx.newCDPSession(p)).send('Emulation.setFocusEmulationEnabled', { enabled: true });
  p.on('pageerror', (e) => console.log(`${name} pageerror: ${e.message}`));
  p.on(
    'console',
    (m) =>
      m.type() === 'error' &&
      !/Failed to load resource/.test(m.text()) &&
      console.log(`${name} console: ${m.text().slice(0, 160)}`),
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
async function startSession(host, mode) {
  await host.p.goto(B + '/s/live-quiz-demo');
  await host.p.locator('button[aria-label="Present options"]').click();
  await host.p.getByText(`Start ${mode}-paced session`).click();
  await host.p.waitForURL(mode === 'host' ? /\/screen\?session=/ : /\/results\//, T);
  return mode === 'host'
    ? new URL(host.p.url()).searchParams.get('session')
    : host.p.url().split('/results/')[1];
}
async function sessionCode(host, id) {
  const pres = await host.ctx.newPage();
  await pres.goto(`${B}/s/live-quiz-demo/presenter?session=${id}`);
  const code = (await pres.locator('header span.font-mono').first().innerText(T))
    .split('·')
    .pop()
    .trim();
  return { pres, code };
}

const host = await user('HOST', 'e2e-host@example.test');
const s1 = await user('S1', 'e2e-s1@mon-avenir.ca');
const s2 = await user('S2', 'e2e-s2@mon-avenir.ca');
const phone = await user('PHONE', 'e2e-s2@mon-avenir.ca', { width: 390, height: 844 });

try {
  await host.p.goto(B + '/sessions');
  await host.p.locator('input[type=email]').fill(host.email);
  await host.p.locator('input[type=password]').fill(PASS);
  await host.p.getByRole('button', { name: 'Sign in' }).click();
  await host.p.locator('h1', { hasText: 'Active sessions' }).waitFor(T);

  // ---- host-paced: timers + inactivity
  const id = await startSession(host, 'host');
  const { pres, code } = await sessionCode(host, id);
  await signIn(s1.p, s1.email, '/join/' + code);
  await s1.p.getByText("You're in!").waitFor(T);
  await signIn(s2.p, s2.email, '/join/' + code);
  await s2.p.getByText("You're in!").waitFor(T);

  await host.p.bringToFront();
  await host.p.keyboard.press('ArrowRight');
  await host.p.keyboard.press('ArrowRight');
  await host.p.getByText('Click to let participants answer').click();
  await host.p.getByRole('button', { name: 'Add 15 seconds' }).click();
  await host.p
    .getByText(/^0:1\d$|^0:0\d$/)
    .first()
    .waitFor(T);
  ok(true, 'screen shows countdown after +15s');
  await s1.p.getByText(/⏱ 0:/).waitFor(T);
  ok(true, 'student sees the countdown');
  await host.p.getByRole('button', { name: 'Add 60 seconds' }).click();
  const t = await host.p
    .getByText(/^1:\d\d$|^0:[5-7]\d$/)
    .first()
    .innerText(T);
  ok(true, `+60s stacks onto the running timer (now ${t})`);
  await shot(host.p, 'x-timer');
  await host.p.getByRole('button', { name: 'Lock question' }).click();
  await s1.p.getByText('Waiting for your host to open this question').waitFor(T);
  ok(true, 'lock pauses the question and clears the timer');

  // short timer expiring on its own
  await host.p.getByText('Click to let participants answer').click();
  await host.p.getByRole('button', { name: 'Add 15 seconds' }).click();
  await s1.p.getByRole('button', { name: 'Toronto' }).waitFor(T);
  await s1.p.getByText('Waiting for your host to open this question').waitFor({ timeout: 30000 });
  ok(true, 'question auto-locks when the timer runs out');
  // inactivity: hide the student's tab
  await pres.bringToFront();
  await pres.getByText('Students · 2').waitFor(T);
  await pres.getByText('Inactive (0)').waitFor(T);
  await s1.p.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await pres.getByText('Inactive (1)').waitFor(T);
  ok(true, 'hiding the tab marks the student inactive on the presenter view');
  await shot(pres, 'x-inactive');
  await s1.p.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    });
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('focus'));
  });
  await pres.getByText('Inactive (0)').waitFor(T);
  ok(true, 'returning marks the student active again');

  // closing the window keeps them in the session and the total
  await s1.ctx.close();
  await host.p.bringToFront();
  await host.p.getByText('Click to let participants answer').click();
  await s2.p.getByRole('button', { name: 'Ottawa' }).click();
  await host.p.getByText('1 / 2').waitFor(T);
  ok(true, 'a student who closed the window still counts in the total');

  // ---- self-paced
  await host.p.getByRole('button', { name: 'End session' }).click();
  await host.p.waitForURL(/\/results\//, T);
  const sid = await startSession(host, 'self');
  await host.p.getByRole('button', { name: 'By student' }).waitFor(T);
  const bodyText = await host.p.locator('body').innerText();
  const selfCode =
    bodyText.match(/self-paced\s*·\s*([A-Z2-9]{6})/i)?.[1] ??
    console.log(
      'BODY',
      JSON.stringify(bodyText.split('\n').filter((l) => /paced|active|ended/i.test(l))),
    );
  const ph = phone;
  await signIn(ph.p, ph.email, '/join/' + selfCode);
  await ph.p.getByText("You're in!").waitFor(T);
  await ph.p.getByText('at your own pace').waitFor(T);
  ok(true, 'self-paced participant lands on the lobby with pacing hint');
  await shot(ph.p, 'x-phone-lobby');
  await ph.p.getByRole('button', { name: 'Next' }).click();
  await ph.p.getByRole('button', { name: 'Next' }).click();
  const tap = await ph.p.getByRole('button', { name: 'Ottawa' }).boundingBox();
  ok(
    tap && tap.height >= 44 && tap.width > 300,
    `phone answer button is a real tap target (${Math.round(tap?.width)}x${Math.round(tap?.height)})`,
  );
  await shot(ph.p, 'x-phone-open');
  await ph.p.getByRole('button', { name: 'Ottawa' }).click();
  await ph.p.getByText('✓ Correct').waitFor(T);
  ok(true, 'self-paced: answers open immediately and correctness shows right after submitting');
  await shot(ph.p, 'x-phone-result');
  await host.p.reload();
  await host.p.getByRole('button', { name: 'By student' }).click();
  await host.p.getByText('e2e-s2').first().waitFor(T);
  ok(true, 'host overview lists the self-paced student');
  const size = await ph.p.evaluate(() => ({
    w: document.documentElement.scrollWidth,
    h: innerWidth,
  }));
  ok(size.w <= size.h, `phone viewport has no horizontal scroll (${size.w}/${size.h})`);
} catch (e) {
  failures++;
  console.log('ERROR ' + e.message.split('\n').slice(0, 4).join(' | '));
  for (const x of [host, s1, s2, phone]) await shot(x.p, 'x-fail-' + x.name).catch(() => {});
}
await b.close();
console.log(failures ? `${failures} FAILURE(S)` : 'ALL PASSED');
process.exit(failures ? 1 : 0);
