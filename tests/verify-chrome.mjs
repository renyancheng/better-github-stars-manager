#!/usr/bin/env node
/**
 * REAL Chrome (MV3) end-to-end verification via Puppeteer.
 *
 * Loads the built dist/ extension into a real Chromium, drives the Options page
 * to save a PAT (from process.env.GH_TOKEN — never logged), then opens the real
 * stars page and asserts the injected ManagerPanel actually renders star rows
 * from a real /user/starred sync.
 *
 * Usage (token MUST come from the environment, never the command line):
 *   GH_TOKEN=<pat> node tests/verify-chrome.mjs
 *   echo <pat> | GH_TOKEN=$(cat) node tests/verify-chrome.mjs   # if you prefer
 *
 * Requires: pnpm build has produced dist/.
 */
import puppeteer from 'puppeteer';
import { existsSync } from 'node:fs';
import path from 'node:path';

const TOKEN = process.env.GH_TOKEN;
if (!TOKEN) {
  console.error('❌ Set GH_TOKEN env var (do NOT pass it on the command line):');
  console.error('   GH_TOKEN=<pat> node tests/verify-chrome.mjs');
  process.exit(1);
}

const DIST = path.resolve(process.cwd(), 'dist');
if (!existsSync(path.join(DIST, 'manifest.json'))) {
  console.error(`❌ No dist/manifest.json found at ${DIST}. Run "pnpm build" first.`);
  process.exit(1);
}

const STARS_URL = `https://github.com/${process.env.GH_USER ?? 'YOUR_USERNAME'}?tab=stars`;
const STEP = (n, s) => console.log(`${n}) ${s}`);

function assert(cond, msg) {
  if (!cond) {
    console.error(`\n❌ ASSERT FAILED: ${msg}`);
    process.exit(1);
  }
}

const browser = await puppeteer.launch({
  // Extensions can ONLY load in headed mode — Chrome refuses --load-extension
  // under headless. So headless:false is mandatory here, not optional.
  headless: false,
  // Use the system Chrome (puppeteer's bundled download may be a different
  // build of the same major and refuse to launch). Falls back to default.
  executablePath:
    process.env.PUPPETEER_EXECUTABLE_PATH ||
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: [
    `--disable-extensions-except=${DIST}`,
    `--load-extension=${DIST}`,
    '--no-first-run',
    '--no-default-browser-check',
  ],
});

try {
  // --- 1. Find the extension's options page URL from its origin ---
  STEP(1, 'Locating extension options page …');
  // puppeteer's first about:blank tab won't have the extension ID; open the
  // options page via chrome://extensions is fragile. Instead, derive the ID by
  // navigating to an extension page and reading the URL.
  const page = await browser.newPage();
  // Trigger options_ui open through the management API isn't available without
  // permissions; use the well-known options page path once we know the ID.
  // We get the ID from any extension-originated target.
  const targets = await browser.waitForTarget(
    (t) => t.url().startsWith('chrome-extension://'),
    { timeout: 10_000 },
  ).catch(() => null);
  // The service worker is an extension target; harvest its URL for the ID.
  const swTarget = await browser.waitForTarget(
    (t) => t.type() === 'service_worker',
    { timeout: 10_000 },
  ).catch(() => null);
  const extId = (swTarget?.url() || targets?.url() || '').match(/chrome-extension:\/\/([a-z]+)/i)?.[1];
  assert(extId, 'could not determine extension ID — extension failed to load');
  console.log(`   ✓ extension id = ${extId}`);

  // --- 2. Open Options page, paste token, save ---
  STEP(2, 'Opening Options page and saving PAT …');
  // Capture any extension console errors for diagnosis.
  page.on('console', (m) => {
    if (m.type() === 'error') console.error(`   [options console.error] ${m.text()}`);
  });
  page.on('pageerror', (e) => console.error(`   [options pageerror] ${e.message}`));
  await page.goto(`chrome-extension://${extId}/src/options/index.html`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('textarea', { timeout: 10_000 });
  await page.type('textarea', TOKEN);
  // Click the "Save & verify" button by its label (not just the first button).
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')];
    const save = btns.find((b) => /save|verify/i.test(b.textContent || ''));
    if (!save) throw new Error('no Save button found');
    save.click();
  });

  // Wait for the "Authenticated as @username" confirmation.
  await page.waitForFunction(
    () => document.body.innerText.includes('Authenticated as @'),
    { timeout: 20_000 },
  );
  const optsText = await page.evaluate(() => document.body.innerText);
  const userMatch = optsText.match(/Authenticated as @(\S+)/);
  assert(userMatch, 'Options page did not confirm authentication');
  console.log(`   ✓ token saved & verified — authenticated as @${userMatch[1]}`);

  // --- 3. Navigate to the real stars page ---
  STEP(3, `Opening ${STARS_URL} …`);
  const stars = await browser.newPage();
  stars.on('console', (m) => {
    if (m.type() === 'error') console.error(`   [stars console.error] ${m.text()}`);
  });
  stars.on('pageerror', (e) => console.error(`   [stars pageerror] ${e.message}`));
  await stars.goto(STARS_URL, { waitUntil: 'domcontentloaded', timeout: 45_000 });

  // --- 4. Wait for the injected ManagerPanel overlay ---
  STEP(4, 'Waiting for injected #gsm-manager-root overlay …');
  await stars.waitForSelector('#gsm-manager-root', { timeout: 20_000 });
  console.log('   ✓ ManagerPanel injected into stars page');

  // --- 5. Wait for star rows to render (sync triggered on mount) ---
  // The panel mounts → auto-syncs → virtual list renders rows. Each row renders
  // full_name as <a href="https://github.com/owner/repo">owner/repo</a>. We count
  // those <a> tags directly (more robust than guessing innerText line breaks).
  STEP(5, 'Waiting for star rows to render after auto-sync …');
  await stars.waitForFunction(
    () => {
      const root = document.getElementById('gsm-manager-root');
      if (!root) return false;
      // Each star row's name cell is an <a> pointing at a github.com repo URL.
      const links = root.querySelectorAll('a[href^="https://github.com/"][href*="/"][target="_blank"]');
      return links.length > 0;
    },
    { timeout: 60_000 },
  );
  const rowCount = await stars.evaluate(() => {
    const root = document.getElementById('gsm-manager-root');
    const links = root.querySelectorAll('a[href^="https://github.com/"][href*="/"][target="_blank"]');
    return links.length;
  });
  assert(rowCount > 0, 'no star rows rendered in the panel');
  console.log(`   ✓ ${rowCount} star row(s) visible in the panel (virtual viewport)`);

  // Sample the actual rendered names for the report.
  const sampleNames = await stars.evaluate(() => {
    const root = document.getElementById('gsm-manager-root');
    const links = [...root.querySelectorAll('a[href^="https://github.com/"][href*="/"][target="_blank"]')];
    return links.slice(0, 5).map((a) => a.textContent.trim());
  });

  // --- 6. Grab the header counter (total / grandTotal) ---
  STEP(6, 'Reading the panel header counter …');
  const counter = await stars.evaluate(() => {
    const root = document.getElementById('gsm-manager-root');
    // The toolbar shows "N / M" — find it.
    const m = (root.innerText || '').match(/(\d+)\s*\/\s*(\d+)/);
    return m ? { filtered: m[1], total: m[2] } : null;
  });
  assert(counter, 'could not find the N / M counter in the panel');
  console.log(`   ✓ header shows ${counter.filtered} / ${counter.total} (filtered / grandTotal)`);

  console.log('\n✅ CHROME END-TO-END VERIFIED:');
  console.log('   extension loaded → PAT saved via real Options page → stars page opened →');
  console.log('   ManagerPanel injected → auto-sync ran → star rows rendered from real API.');
  console.log(`   grandTotal=${counter.total} | visible rows in viewport=${rowCount}`);
  console.log('\n   Sample rendered rows:');
  for (const name of sampleNames) {
    console.log(`     • ${name}`);
  }
} catch (e) {
  console.error(`\n❌ verification failed: ${e instanceof Error ? e.message : String(e)}`);
  // Dump any panel/console errors for diagnosis.
  try {
    const pages = await browser.pages();
    for (const p of pages) {
      const url = p.url();
      const text = await p.evaluate(() => document.body?.innerText?.slice(0, 300)).catch(() => null);
      if (text) console.error(`   [page ${url}]: ${text.replace(/\n/g, ' ').slice(0, 200)}`);
    }
  } catch {}
  process.exit(1);
} finally {
  await browser.close();
}
