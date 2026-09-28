// table — group play at a real table: several "phones" (browser contexts) in one campaign,
// relayed through tests/fakefb.js. Every check drives the UI the way a player or Loremaster does.
const { createFakeDb } = require('../fakefb');

async function device(browser, baseUrl, db, uid, errors) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  if (db) await db.attach(context, uid);
  else await context.route(/firebasejs/, r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await context.addInitScript(() => { try { localStorage.setItem('tor2e-tutorial', JSON.stringify({ offered: true })); sessionStorage.setItem('tor2e-splashed', '1'); } catch (e) {} });
  await context.route('**/sw.js', r => r.abort());
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(uid + ': ' + e));
  await page.goto(baseUrl + '/character-tracker.html', { waitUntil: 'load' });
  await page.waitForFunction(() => typeof window.renderReference === 'function', { timeout: 8000 }).catch(() => {});
  if (db) await page.waitForFunction(() => Sync.uid, { timeout: 5000 }).catch(() => {});
  return { context, page };
}
const closeModals = page => page.evaluate(() => document.querySelectorAll('.menu-overlay.show').forEach(o => o.classList.remove('show')));
// Press a dialog button by its visible words (GOTCHA 17).
// Returns false (rather than throwing) when no such button appears, so a check can name the failure.
async function press(page, text) {
  try { await page.waitForFunction(t => [...document.querySelectorAll('#styled-modal-buttons button')].some(b => b.textContent.includes(t)), text, { timeout: 3000 }); }
  catch (e) { return false; }
  await page.evaluate(t => [...document.querySelectorAll('#styled-modal-buttons button')].find(b => b.textContent.includes(t)).click(), text);
  return true;
}
const openPlay = page => page.evaluate(() => { openNavGroup('play'); });

module.exports = {
  name: 'table',
  async run({ browser, baseUrl }) {
    const checks = [];
    const errors = [];
    const db = createFakeDb();

    // The Loremaster's phone creates the campaign; a player's phone joins it through the menu.
    const gm = await device(browser, baseUrl, db, 'gm1', errors);
    const code = await gm.page.evaluate(async () => { loadPregen(1); document.querySelectorAll('.menu-overlay.show').forEach(o => o.classList.remove('show')); return (await Sync.createCampaign('Table', 'loremaster')).code; });
    const pl = await device(browser, baseUrl, db, 'pl1', errors);
    await pl.page.evaluate(() => loadPregen(0)); await closeModals(pl.page);
    await pl.page.evaluate(c => { openCampaign(); document.getElementById('camp-code').value = c; document.getElementById('camp-role').value = 'player'; campaignJoin(); }, code);
    await press(pl.page, 'Got it'); await closeModals(pl.page);
    await openPlay(pl.page); await pl.page.waitForTimeout(300);

    const sheet = await pl.page.evaluate(() => {
      const p = document.getElementById('panel-play');
      const intro = p.querySelector('.tab-intro');
      return {
        tableMode: p.classList.contains('table-mode'),
        introHidden: !intro || !intro.checkVisibility(),
        rolls: [...p.querySelectorAll('.tbl-roll')].map(b => b.textContent),
        storyChoices: !!p.querySelector('.play-choices'),
        phase: (p.querySelector('.tbl-phase .card-title') || {}).textContent,
        name: (p.querySelector('.tbl-hero .card-title') || {}).textContent
      };
    });
    const all18 = ['Awe', 'Stealth', 'Riddle', 'Healing', 'Scan', 'Battle'].every(s => sheet.rolls.some(t => t.startsWith(s)));
    checks.push({ ok: sheet.tableMode && sheet.introHidden && !sheet.storyChoices && sheet.phase === 'Story' && /Geira/.test(sheet.name || ''),
      msg: `a player at a table sees the table sheet, not the solo story (${JSON.stringify({ t: sheet.tableMode, i: sheet.introHidden, c: sheet.storyChoices, ph: sheet.phase, n: sheet.name })})` });
    checks.push({ ok: all18 && sheet.rolls.length >= 20 && sheet.rolls.some(t => t.startsWith('Valour')) && sheet.rolls.some(t => t.startsWith('Wisdom')),
      msg: `the table sheet offers every skill plus Valour and Wisdom as big roll buttons (${sheet.rolls.length})` });

    const rolled = await pl.page.evaluate(() => {
      const before = history.length;
      const b = [...document.querySelectorAll('#panel-play .tbl-roll')].find(x => x.textContent.startsWith('Stealth'));
      if (b) b.click();
      return { grew: history.length === before + 1, label: history[0] && history[0].label };
    });
    checks.push({ ok: rolled.grew && /Stealth/.test(rolled.label || ''), msg: `tapping a roll button on the table sheet rolls that skill (${rolled.label})` });

    // The Loremaster's Play tab is the table console, listing the player's hero live.
    await openPlay(gm.page); await gm.page.waitForTimeout(1800);
    const con = await gm.page.evaluate(() => { renderPlay(); const c = document.querySelector('#panel-play .tbl-console'); return { has: !!c, text: c ? c.textContent : '', rolls: document.querySelectorAll('#panel-play .tbl-roll').length }; });
    checks.push({ ok: con.has && /Geira/.test(con.text) && con.rolls === 0, msg: `the Loremaster's Play tab is the table console and lists the players (${con.text.slice(0, 80)})` });

    // Out of a campaign, ▶ Play is the solo story exactly as before.
    const solo = await device(browser, baseUrl, null, 'solo', errors);
    await solo.page.evaluate(() => loadPregen(0)); await closeModals(solo.page); await openPlay(solo.page);
    const soloPlay = await solo.page.evaluate(() => ({ table: !!document.querySelector('#panel-play .tbl-rollcard'), mode: document.getElementById('panel-play').classList.contains('table-mode') }));
    checks.push({ ok: !soloPlay.table && !soloPlay.mode, msg: 'out of a campaign ▶ Play is unchanged (no table sheet)' });

    // One hero, clean switch: solo rules on and off again put back exactly what they changed,
    // and keep what was earned in between.
    const sw = await solo.page.evaluate(() => {
      const snap = () => ({ fr: char.fellowshipRating, xp: char.experienceMode, feat: String(char.features || ''), str: char.strTN, hrt: char.hrtTN, wit: char.witTN });
      char.fellowshipRating = 1; char.experienceMode = 'session'; saveCharacter();
      const before = snap();
      setStriderMode(true);
      const on = snap();
      char.skillPoints = (parseInt(char.skillPoints) || 0) + 5;   // earned while solo
      const sp = char.skillPoints;
      setStriderMode(false);
      const off = snap();
      setStriderMode(true); setStriderMode(false);
      const twice = snap();
      return { before, on, off, twice, spKept: char.skillPoints === sp };
    });
    const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    checks.push({ ok: sw.on.str === sw.before.str - 2 && sw.on.fr === 3 && sw.on.xp === 'milestone' && /Strider —/.test(sw.on.feat),
      msg: `solo rules apply on the way in (TN ${sw.before.str}→${sw.on.str}, Fellowship ${sw.before.fr}→${sw.on.fr}, ${sw.on.xp})` });
    checks.push({ ok: same(sw.off, sw.before) && same(sw.twice, sw.before) && sw.spKept,
      msg: `switching back restores exactly what solo changed and keeps what was earned (${JSON.stringify(sw.off)} vs ${JSON.stringify(sw.before)})` });

    // A player who joins with a hero set up for solo play is offered table rules — by words.
    const pl2 = await device(browser, baseUrl, db, 'pl2', errors);
    await pl2.page.evaluate(() => { loadPregen(2); }); await closeModals(pl2.page);
    await pl2.page.evaluate(() => setStriderMode(true));
    await pl2.page.evaluate(c => { openCampaign(); document.getElementById('camp-code').value = c; document.getElementById('camp-role').value = 'player'; campaignJoin(); }, code);
    await press(pl2.page, 'Got it');
    const offered = await press(pl2.page, 'Use table rules');
    await pl2.page.waitForTimeout(200);
    const joined = await pl2.page.evaluate(() => ({ strider: !!char.striderMode, feat: String(char.features || '') }));
    checks.push({ ok: offered && !joined.strider && !/Strider —/.test(joined.feat), msg: 'joining a table with a solo hero offers table rules, and accepting switches cleanly' });

    checks.push({ ok: errors.length === 0, msg: `no page errors across the table devices (${errors.slice(0, 3).join(' | ')})` });
    for (const d of [gm, pl, pl2, solo]) await d.context.close();
    return { checks };
  }
};
