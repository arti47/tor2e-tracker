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
    const con = await gm.page.evaluate(() => { renderPlay(); const c = document.getElementById('tbl-party'); return { has: !!c, text: c ? c.textContent : '', rolls: document.querySelectorAll('#panel-play .tbl-roll').length }; });
    checks.push({ ok: con.has && /Geira/.test(con.text) && con.rolls === 0, msg: `the Loremaster's Play tab is the table console and lists the players (${con.text.slice(0, 80)})` });

    // ---- Stage 2: the Loremaster sets the phase, calls rolls and hands things out. ----
    const gmClick = (sel, text) => gm.page.evaluate(([q, t]) => { const b = [...document.querySelectorAll(q)].find(x => x.textContent.trim().startsWith(t)); if (b) b.click(); return !!b; }, [sel, text]);
    const until = (page, fn, arg) => page.waitForFunction(fn, arg, { timeout: 4000 }).then(() => true, () => false);
    await gmClick('#tbl-phases button', 'Combat');
    await gm.page.evaluate(() => { document.getElementById('tbl-note').value = 'Orcs at the ford'; });
    await gmClick('#panel-play button', 'Show it on every phone');
    const phaseSeen = await until(pl.page, () => { const c = document.querySelector('#panel-play .tbl-phase'); return c && /Combat/.test(c.textContent) && /Orcs at the ford/.test(c.textContent); });
    checks.push({ ok: phaseSeen, msg: "the Loremaster's phase and note appear on the player's phone" });

    // A roll call for everyone pops a big button; pressing it answers the call in the shared feed.
    await gm.page.evaluate(() => { document.getElementById('tbl-call-skill').value = 'Awareness'; document.getElementById('tbl-call-who').value = 'all'; document.getElementById('tbl-call-note').value = 'Something moves in the reeds'; });
    await gmClick('#panel-play button', 'Ask for the roll');
    const popped = await until(pl.page, () => [...document.querySelectorAll('#panel-play .tbl-call-btn')].some(b => /Roll Awareness/.test(b.textContent)));
    await pl.page.evaluate(() => { const b = [...document.querySelectorAll('#panel-play .tbl-call-btn')].find(x => /Awareness/.test(x.textContent)); if (b) b.click(); });
    const answered = await until(gm.page, () => { const c = document.getElementById('tbl-calls'); return c && /Geira/.test(c.textContent) && /vs/.test(c.textContent); });
    const cleared = await until(pl.page, () => !document.querySelector('#panel-play .tbl-call-btn'));
    checks.push({ ok: popped && answered && cleared, msg: `a roll call pops on the player's phone, and the answer reaches the Loremaster (${popped}/${answered}/${cleared})` });

    // Rolling the same skill from the sheet also answers an open call for it.
    await gm.page.evaluate(() => { document.getElementById('tbl-call-skill').value = 'Athletics'; document.getElementById('tbl-call-who').value = Object.keys(Table.party).find(u => Table.party[u].role === 'player'); });
    await gmClick('#panel-play button', 'Ask for the roll');
    await until(pl.page, () => !!document.querySelector('#panel-play .tbl-call-btn'));
    await pl.page.evaluate(() => { const b = [...document.querySelectorAll('#panel-play .tbl-roll')].find(x => x.textContent.startsWith('Athletics')); if (b) b.click(); });
    const viaSheet = await until(gm.page, () => { const call = Object.keys(Table.calls).find(id => Table.calls[id].skill === 'Athletics'); return call && Table.feed.some(f => f.callId === call); });
    checks.push({ ok: viaSheet, msg: 'rolling the called skill from the sheet answers the call too' });

    // Hand-outs land on the hero's own phone through the normal rules, exactly once.
    const end0 = await pl.page.evaluate(() => parseInt(char.endCur));
    await gm.page.evaluate(() => { const u = Object.keys(Table.party).find(k => Table.party[k].role === 'player'); document.getElementById('tbl-ho-who').value = u; document.getElementById('tbl-ho-kind').value = 'damage'; document.getElementById('tbl-ho-amt').value = '3'; });
    await gmClick('#panel-play button', 'Hand it out');
    const hit = await until(pl.page, e => parseInt(char.endCur) === e - 3, end0);
    const pluid = await pl.page.evaluate(() => Sync.uid);
    await pl.page.waitForTimeout(300);
    const gone = !db.get('campaigns/' + (await gm.page.evaluate(() => Sync.currentCampaign())) + '/handouts/' + pluid);
    // The same hand-out delivered again (a remove that failed) must not apply twice.
    const cid = await gm.page.evaluate(() => Sync.currentCampaign());
    const doneId = await pl.page.evaluate(() => (JSON.parse(localStorage.getItem('tor2e-handouts-done')) || []).slice(-1)[0]);
    await db.set(`campaigns/${cid}/handouts/${pluid}/${doneId}`, { kind: 'damage', amount: 3, ts: 1, from: 'x' });
    await pl.page.waitForTimeout(500);
    const endAfter = await pl.page.evaluate(() => parseInt(char.endCur));
    checks.push({ ok: hit && gone && endAfter === end0 - 3, msg: `a hand-out applies itself once on the hero's phone and is removed (${end0}→${endAfter}, removed ${gone})` });

    // Shadow goes through adj(): its cap (Shadow + Scars ≤ Max Hope) still holds.
    await gm.page.evaluate(() => { document.getElementById('tbl-ho-kind').value = 'shadow'; document.getElementById('tbl-ho-amt').value = '30'; });
    await gmClick('#panel-play button', 'Hand it out');
    const capped = await until(pl.page, () => (parseInt(char.shadow) || 0) > 0);
    const shadow = await pl.page.evaluate(() => ({ s: (parseInt(char.shadow) || 0) + (parseInt(char.scars) || 0), max: parseInt(char.hopeMax) }));
    checks.push({ ok: capped && shadow.s <= shadow.max && shadow.s > 0, msg: `a Shadow hand-out keeps the rules' cap (${shadow.s} ≤ ${shadow.max})` });

    // ---- Stage 3: the journey. The Loremaster picks the road on the map; every phone sees it. ----
    await gm.page.evaluate(() => { openMapPicker(); mapChoosePlace('from', 26, 42, 'Bree'); mapChoosePlace('to', 26, 57, 'Rivendell'); useMapRoute(); });
    const form = await gm.page.evaluate(() => ({ from: document.getElementById('tj-from').value, to: document.getElementById('tj-to').value, hexes: +document.getElementById('tj-hexes').value }));
    await gmClick('#panel-play button', 'Set out with the Company');
    const mapOnPhone = await until(pl.page, () => !!document.querySelector('#panel-play .tbl-journey .live-map') && /Bree/.test(document.querySelector('#panel-play .tbl-journey').textContent));
    checks.push({ ok: form.from === 'Bree' && form.to === 'Rivendell' && form.hexes > 10 && mapOnPhone, msg: `a road picked on the Loremaster's map fills the journey and shows on the player's phone (${JSON.stringify(form)}, map ${mapOnPhone})` });
    // Start over with a short road typed by hand, so one march reaches the end.
    await gm.page.evaluate(() => { confirmStyled = async () => true; });
    await gmClick('#panel-play button', 'Abandon the journey');
    await until(gm.page, () => document.getElementById('tbl-jsetup').style.display !== 'none');
    await gm.page.evaluate(() => { document.getElementById('tj-from').value = 'Bree'; document.getElementById('tj-to').value = 'Archet'; document.getElementById('tj-hexes').value = '3'; });
    await gmClick('#panel-play button', 'Set out with the Company');

    // The player picks a role; the Loremaster sees who covers it.
    await until(pl.page, () => !!document.querySelector('#panel-play .tbl-role'));
    await pl.page.evaluate(() => [...document.querySelectorAll('#panel-play .tbl-role')].filter(b => /Guide|Look-out/.test(b.textContent)).forEach(b => b.click()));
    const rolesSeen = await until(gm.page, () => { const r = document.querySelector('#tbl-jlive .tbl-roles'); return r && /Guide\s*Geira/.test(r.textContent) && /Look-out\s*Geira/.test(r.textContent); });
    checks.push({ ok: rolesSeen, msg: "journey roles picked on a player's phone show on the Loremaster's console" });

    // Marching Test: a call to the Guide; the answer moves the Company along.
    const answer = async (rnd) => {
      await until(pl.page, () => !!document.querySelector('#panel-play .tbl-call-btn'));
      await pl.page.evaluate(x => { const R = Math.random; Math.random = () => x; try { const b = document.querySelector('#panel-play .tbl-call-btn'); if (b) b.click(); } finally { Math.random = R; } }, rnd);
    };
    await gmClick('#panel-play button', 'Marching Test');
    const marchCall = await until(pl.page, () => [...document.querySelectorAll('#panel-play .tbl-call-btn')].some(b => /Roll Travel/.test(b.textContent)));
    await answer(0.99);   // a Gandalf rune: an automatic success
    const marched = await until(gm.page, () => _tj().currentHex === 3 && !_tj().pending);
    const due = await until(gm.page, () => [...document.querySelectorAll('#tbl-jlive button')].some(b => /Something happens/.test(b.textContent)));
    checks.push({ ok: marchCall && marched && due, msg: `the Marching Test is called to the Guide and its answer moves the Company (${marchCall}/${marched}/${due})` });

    // A journey event: the Eye on the event die is Terrible Misfortune; the player's failed roll wounds them.
    await gm.page.evaluate(() => { const D = _doInlineRoll; _doInlineRoll = (a, b, c) => Object.assign(D(a, b, c), { featSpecial: 'eye', featValue: 11 }); window._restoreDIR = () => { _doInlineRoll = D; }; });
    await gmClick('#panel-play button', 'Something happens');
    await gm.page.evaluate(() => window._restoreDIR());
    const evCall = await until(pl.page, () => [...document.querySelectorAll('#panel-play .tbl-call')].some(c => /Terrible Misfortune/.test(c.textContent)));
    await answer(0.01);   // the lowest dice: a failure
    const wounded = await until(pl.page, () => !!char.wounded);
    const tf = await gm.page.evaluate(() => _tj().travelFatigue);
    checks.push({ ok: evCall && wounded && tf >= 3, msg: `a journey event calls the role's roll, and its failure lands on that hero (wounded ${wounded}, Travel Fatigue ${tf})` });

    // Arrival: every hero rolls Travel; what the road cost lingers on their own Fatigue.
    await gm.page.evaluate(() => document.querySelectorAll('.menu-overlay.show').forEach(o => o.classList.remove('show')));
    await pl.page.evaluate(() => document.querySelectorAll('.menu-overlay.show').forEach(o => o.classList.remove('show')));
    const fat0 = await pl.page.evaluate(() => parseInt(char.fatigue) || 0);
    await until(gm.page, () => [...document.querySelectorAll('#tbl-jlive button')].some(b => /We have arrived/.test(b.textContent)));
    await gmClick('#panel-play button', 'We have arrived');
    await answer(0.01);
    const lingered = await until(pl.page, ([f0, t]) => (parseInt(char.fatigue) || 0) === f0 + t, [fat0, tf]);
    checks.push({ ok: lingered, msg: `on arrival each hero's Travel roll decides how much of the road's ${tf} Fatigue stays (${fat0} → ${await pl.page.evaluate(() => char.fatigue)})` });
    await gmClick('#tbl-phases button', 'Story');

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

    // ---- Stage 4: combat rounds. Stances order the heroes; each acts once; then the foes attack. ----
    await closeModals(pl.page); await closeModals(pl2.page);
    await gmClick('#tbl-phases button', 'Combat');
    await gm.page.evaluate(() => { addCustomFoe(); document.querySelectorAll('.menu-overlay.show').forEach(o => o.classList.remove('show')); });
    await openPlay(pl2.page);
    const fightOn = await until(pl.page, () => /New foe/.test((document.querySelector('#panel-play .tbl-fight') || {}).textContent || ''));
    const stance = (page, name) => page.evaluate(n => { const b = [...document.querySelectorAll('#panel-play .tbl-fight .tbl-role')].find(x => x.textContent.startsWith(n)); if (b) b.click(); return !!b; }, name);
    // Names alone would put the second player first (alphabetical); stance must win.
    await stance(pl.page, 'Forward'); await until(pl2.page, () => !!document.querySelector('#panel-play .tbl-fight')); await stance(pl2.page, 'Rearward');
    const n2 = await pl2.page.evaluate(() => heroLabel(char));
    const alphaFirst = n2.localeCompare('Geira') < 0;
    const ordered = await until(gm.page, n => { const li = [...document.querySelectorAll('#tbl-flive .tbl-order li')].map(x => x.textContent); return li.length === 2 && /Geira/.test(li[0]) && /Forward/.test(li[0]) && li[1].includes(n) && /Rearward/.test(li[1]); }, n2);
    const plTurn = await until(pl.page, () => /Your turn/.test((document.querySelector('#panel-play .tbl-turn') || {}).textContent || ''));
    const pl2Waits = await until(pl2.page, () => /Waiting for\s*Geira/.test((document.querySelector('#panel-play .tbl-turn') || {}).textContent || ''));
    checks.push({ ok: alphaFirst && fightOn && ordered && plTurn && pl2Waits, msg: `heroes act in stance order, Forward before Rearward, and the phone says whose turn it is (${alphaFirst}/${fightOn}/${ordered}/${plTurn}/${pl2Waits})` });

    // An attack is the hero's one action: it ends their turn and the next hero's phone lights up.
    await pl.page.evaluate(() => { const b = [...document.querySelectorAll('#panel-play .tbl-turn button')].find(x => /Attack New foe/.test(x.textContent)); if (b) b.click(); });
    const passed = await until(pl2.page, () => /Your turn/.test((document.querySelector('#panel-play .tbl-turn') || {}).textContent || ''));
    const fed = await until(gm.page, () => Table.feed.some(f => /New foe/.test(f.text || '') && /vs/.test(f.text || '')));
    checks.push({ ok: passed && fed, msg: `attacking ends a hero's turn, the next hero is up, and the blow shows in the table feed (${passed}/${fed})` });

    // The Loremaster can skip a hero; the skipped phone knows, and it is the foes' turn.
    await gm.page.evaluate(() => { const b = [...document.querySelectorAll('#tbl-flive .tbl-order button')].find(x => /Skip/.test(x.textContent)); if (b) b.click(); });
    const foesTurn = await until(gm.page, () => /the foes attack/.test((document.querySelector('#tbl-flive .tbl-round') || {}).textContent || ''));
    const skippedKnows = await until(pl2.page, () => /foes attack/.test((document.querySelector('#panel-play .tbl-turn') || {}).textContent || ''));
    checks.push({ ok: foesTurn && skippedKnows, msg: `once every hero has acted or been skipped, it is the foes' turn on every phone (${foesTurn}/${skippedKnows})` });

    // A foe's attack runs on the target's own phone: its Parry, its Endurance.
    await pl.page.evaluate(() => { const D = _doInlineRoll; _doInlineRoll = (a, b, c) => Object.assign(D(a, b, c), { featSpecial: null, featValue: 5, total: 40, outcome: 'SUCCESS', icons: 0 }); });
    const end1 = await pl.page.evaluate(() => parseInt(char.endCur));
    await gm.page.evaluate(() => { const row = [...document.querySelectorAll('#tbl-flive .tbl-foerow')].find(r => /New foe/.test(r.textContent)); const sel = row.querySelector('select'); sel.value = [...sel.options].find(o => /Geira/.test(o.textContent)).value; sel.dispatchEvent(new Event('change')); row.querySelector('button').click(); });
    const struck = await until(pl.page, e => parseInt(char.endCur) === e - 4, end1);
    const closed = await until(gm.page, () => Object.values(Table.calls).some(c => c.kind === 'foe-attack' && c.closed));
    checks.push({ ok: struck && closed, msg: `a foe's attack is rolled against the target's own Parry on their phone and lands on their Endurance (${end1} → ${await pl.page.evaluate(() => char.endCur)}, closed ${closed})` });

    // Next round: everyone acts again.
    await gmClick('#panel-play button', 'Next round');
    const round2 = await until(pl.page, () => /round 2/.test((document.querySelector('#panel-play .tbl-fight .card-title') || {}).textContent || '') && /Your turn/.test((document.querySelector('#panel-play .tbl-turn') || {}).textContent || ''));
    checks.push({ ok: round2, msg: 'the next round starts the turn order again' });

    checks.push({ ok: errors.length === 0, msg: `no page errors across the table devices (${errors.slice(0, 3).join(' | ')})` });
    for (const d of [gm, pl, pl2, solo]) await d.context.close();
    return { checks };
  }
};
