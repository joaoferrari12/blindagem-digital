// Accessibility and end-to-end check of the built site.
//
// Serves `dist/` with `vite preview`, walks the whole flow in Chromium at phone
// and desktop widths (home → 14 questions → result, in both languages), runs
// axe-core on every screen, checks for horizontal overflow, and fails on any
// violation. Prints a measured summary for the README.
//
// Usage: npm run build && npm run a11y

import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';

const PORT = 4173;
const BASE = `http://localhost:${PORT}/blindagem-digital/`;

function startPreview() {
  // Run vite's own entry point (not through npx) so `child.kill()` reaches the server itself.
  const child = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort'], {
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('vite preview did not start in 20s')), 20000);
    child.stdout.on('data', (d) => {
      if (String(d).includes('localhost')) {
        clearTimeout(timer);
        resolve(child);
      }
    });
    child.on('exit', (code) => reject(new Error(`vite preview exited with ${code}`)));
  });
}

// Pwned Passwords is stubbed so the check never depends on the network in CI.
async function stubPwned(page) {
  await page.route('https://api.pwnedpasswords.com/range/*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/plain',
      // SHA-1("password") suffix with a count, plus a padding row.
      body: '1E4C9B93F3F0682250B6CF8331B7EE68FD8:3861493\r\nFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF:0\r\n',
    }),
  );
}

async function axe(page, label, report) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice']).analyze();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  report.screens++;
  if (results.violations.length) {
    report.violations.push({ label, violations: results.violations });
    for (const v of results.violations) {
      console.log(`✗ ${label}: ${v.id} (${v.impact}) — ${v.help}`);
      for (const n of v.nodes.slice(0, 3)) console.log(`    ${n.target.join(' ')}`);
    }
  }
  if (overflow) {
    report.overflow.push(label);
    console.log(`✗ ${label}: horizontal overflow`);
  }
}

async function walk(browser, { width, height, label }, report) {
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  await stubPwned(page);
  page.on('pageerror', (e) => report.errors.push(`${label}: ${e.message}`));

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await axe(page, `${label} home pt`, report);

  // Switch to English and back to prove the toggle re-renders.
  await page.getByRole('button', { name: 'EN' }).click();
  await axe(page, `${label} home en`, report);
  await page.getByRole('button', { name: 'PT' }).click();

  await page.getByRole('link', { name: /Começar o check-up/ }).click();

  for (let i = 1; i <= 14; i++) {
    await page.waitForURL(`**/#/perguntas/${i}`);
    await page.locator(`form[data-index="${i - 1}"]`).waitFor(); // the router renders right after the hash changes
    const radios = page.locator('input[type=radio]');
    if ((await radios.count()) > 0) {
      // Pick the first option with the keyboard to prove the radios are reachable.
      await radios.first().focus();
      await page.keyboard.press('Space');
    } else {
      // Leak-test step: check a known-leaked password, then continue.
      await page.fill('#pw', 'password');
      await page.getByRole('button', { name: /Verificar/ }).click();
      await page.getByRole('status').getByText(/vazou/).waitFor();
      await axe(page, `${label} pergunta ${i} (resultado do teste)`, report);
    }
    await axe(page, `${label} pergunta ${i}`, report);
    await page.getByRole('button', { name: /Continuar|Ver meu resultado/ }).click();
  }

  await page.waitForURL('**/#/resultado');
  await page.getByRole('heading', { level: 1 }).waitFor();
  await axe(page, `${label} resultado pt`, report);
  const score = await page.locator('.score-number span').textContent();
  report.scores.push(`${label}: ${score}`);
  await page.getByRole('button', { name: 'EN' }).click();
  await axe(page, `${label} result en`, report);

  await context.close();
}

const preview = await startPreview();
const browser = await chromium.launch();
const report = { screens: 0, violations: [], overflow: [], errors: [], scores: [] };
try {
  await walk(browser, { width: 375, height: 812, label: 'phone' }, report);
  await walk(browser, { width: 1280, height: 900, label: 'desktop' }, report);
} finally {
  await browser.close();
  preview.kill();
}

console.log(`\naxe-core: ${report.screens} screens checked, ${report.violations.length} with violations`);
console.log(`horizontal overflow: ${report.overflow.length} screens`);
console.log(`page errors: ${report.errors.length}`);
console.log(`scores after answering the first option everywhere: ${report.scores.join(', ')}`);
if (report.violations.length || report.overflow.length || report.errors.length) {
  for (const e of report.errors) console.log(e);
  process.exit(1);
}
