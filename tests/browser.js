// Headless Chromium launcher for the harness.
//
// Resolution order for playwright-core (so the harness runs in this repo OR a sibling dev setup):
//   1) tor2e's own node_modules (after `npm install`) — the committed/CI path.
//   2) a sibling project's node_modules (dev convenience on this machine).
// Resolution for the browser binary: playwright-core's own bundled resolution (chromium.launch
// with no executablePath) — works when the matching ms-playwright build is cached. An optional
// CHROMIUM_BIN env var overrides it.
const path = require('path');
const fs = require('fs');
const os = require('os');

// Find a Chromium binary already in the Playwright cache, even if its build number doesn't
// match the installed playwright-core (common on dev machines). Returns a path or null.
function findCachedChromium() {
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || path.join(os.homedir(), 'Library/Caches/ms-playwright');
  let dirs = [];
  try { dirs = fs.readdirSync(base); } catch (_) { return null; }
  const order = dirs.filter(d => d.startsWith('chromium-')).concat(dirs.filter(d => d.startsWith('chromium_headless_shell-')));
  const rel = [
    'chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
    'chrome-mac/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
    'chrome-headless-shell-mac-arm64/chrome-headless-shell',
    'chrome-headless-shell-mac/chrome-headless-shell',
    'chrome-linux/chrome',
    'chrome-linux/headless_shell'
  ];
  for (const d of order) {
    for (const r of rel) {
      const p = path.join(base, d, r);
      if (fs.existsSync(p)) return p;
    }
  }
  return null;
}

function loadPlaywright() {
  try { return require('playwright-core'); } catch (_) {}
  // Dev fallback: a sibling project on this machine may have it installed.
  const siblings = [
    path.resolve(__dirname, '../../dragonbane-player-main/node_modules/playwright-core')
  ];
  for (const p of siblings) {
    try { return require(p); } catch (_) {}
  }
  throw new Error('playwright-core not found. Run `npm install` in this folder first.');
}

async function launch() {
  const { chromium } = loadPlaywright();
  const base = { headless: true, args: ['--no-sandbox'] };
  // 1) explicit override → 2) a binary already in the Playwright cache → 3) playwright's own default.
  const explicit = process.env.CHROMIUM_BIN || findCachedChromium();
  if (explicit) {
    try { return await chromium.launch({ ...base, executablePath: explicit }); } catch (_) { /* fall through to default */ }
  }
  return chromium.launch(base);
}

// Open a fresh page (isolated context), wire up error capture, and block the service worker
// so tests never run against a stale cached shell. Returns { context, page, errors }.
async function newPage(browser, url) {
  const context = await browser.newContext({ serviceWorkers: 'block' });
  // Suppress the first-run tutorial offer so its modal can't intercept test clicks.
  await context.addInitScript(() => { try { localStorage.setItem('tor2e-tutorial', JSON.stringify({ offered: true })); } catch (e) {} });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
  // Belt-and-braces: never fetch the SW or Firebase (Firebase isn't used today, but future-proof).
  await context.route('**/sw.js', r => r.abort());
  await context.route('**/*firebasejs*', r => r.abort());
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => typeof window.renderReference === 'function', { timeout: 8000 }).catch(() => {});
  return { context, page, errors };
}

module.exports = { launch, newPage };
