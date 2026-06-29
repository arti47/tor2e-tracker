#!/usr/bin/env node
// TOR2E test harness orchestrator (Phase P1).
//   node tests/run.js            — run all specs
//   node tests/run.js smoke ux   — run only the named specs
// Boots the app headless (served by serve.js), runs each spec, prints a per-spec
// pass/fail summary, and exits non-zero on any failure.
const { startServer } = require('./serve');
const { launch, newPage } = require('./browser');

const ALL_SPECS = ['smoke', 'adversaries', 'ux', 'spillage'];

async function main() {
  const filter = process.argv.slice(2);
  const specNames = filter.length ? filter : ALL_SPECS;

  const { server, port } = await startServer();
  const baseUrl = `http://127.0.0.1:${port}`;
  let browser;
  try {
    browser = await launch();
  } catch (e) {
    console.error('\n✖ Could not launch Chromium:', e.message);
    console.error('  Run `npm install` here (downloads playwright-core), or set CHROMIUM_BIN to a Chrome/Chromium binary.\n');
    server.close();
    process.exit(2);
  }

  let totalPass = 0, totalFail = 0;
  const failures = [];
  for (const name of specNames) {
    let spec;
    try { spec = require(`./specs/${name}.js`); }
    catch (e) { console.error(`✖ cannot load spec "${name}": ${e.message}`); totalFail++; failures.push(name); continue; }
    let result;
    try { result = await spec.run({ browser, baseUrl, newPage }); }
    catch (e) { console.error(`✖ [${name}] threw: ${e.message}`); totalFail++; failures.push(name); continue; }
    const checks = result.checks || [];
    const pass = checks.filter(c => c.ok).length;
    const fail = checks.length - pass;
    totalPass += pass; totalFail += fail;
    console.log(`\n[${name}] ${pass} passed / ${fail} failed`);
    checks.forEach(c => { if (!c.ok) console.log(`   ✖ ${c.msg}`); });
    if (fail) failures.push(name);
  }

  await browser.close();
  server.close();

  console.log(`\n${'='.repeat(48)}`);
  console.log(`TOTAL: ${totalPass} passed / ${totalFail} failed`);
  if (totalFail) { console.log(`FAILED specs: ${[...new Set(failures)].join(', ')}`); process.exit(1); }
  console.log('ALL GREEN ✓');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
