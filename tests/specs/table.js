// table — group play at a real table: several "phones" (browser contexts) in one campaign,
// relayed through tests/fakefb.js. Every check drives the UI the way a player or Loremaster does.
const { createFakeDb } = require('../fakefb');

async function device(browser, baseUrl, db, uid, errors, viewport) {
  const context = await browser.newContext({ viewport: viewport || { width: 390, height: 844 }, serviceWorkers: 'block' });
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
    await pl.page.waitForFunction(() => tableActive(), null, { timeout: 4000 }).catch(() => {}); await closeModals(pl.page);
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
    const until = (page, fn, arg) => page.waitForFunction(fn, arg, { timeout: 6000 }).then(() => true, () => false);
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
    const dbg = (alphaFirst && fightOn && ordered && plTurn && pl2Waits) ? '' : await gm.page.evaluate(() => JSON.stringify({ li: [...document.querySelectorAll('#tbl-flive .tbl-order li')].map(x => x.textContent.replace(/\s+/g, ' ').trim()), party: Object.values(Table.party).map(m => [m.role, (m.vitals || {}).name, (m.vitals || {}).stance, m.turnDone]), round: enc().round }));
    checks.push({ ok: alphaFirst && fightOn && ordered && plTurn && pl2Waits, msg: `heroes act in stance order, Forward before Rearward, and the phone says whose turn it is (${alphaFirst}/${fightOn}/${ordered}/${plTurn}/${pl2Waits}) ${dbg}` });

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
    await until(gm.page, () => { const row = [...document.querySelectorAll('#tbl-flive .tbl-foerow')].find(r => /New foe/.test(r.textContent)); return !!row && [...row.querySelectorAll('option')].some(o => /Geira/.test(o.textContent)); });
    await gm.page.evaluate(() => { const row = [...document.querySelectorAll('#tbl-flive .tbl-foerow')].find(r => /New foe/.test(r.textContent)); if (!row) return; const sel = row.querySelector('select'); const o = [...sel.options].find(x => /Geira/.test(x.textContent)); if (!o) return; sel.value = o.value; sel.dispatchEvent(new Event('change')); row.querySelector('button').click(); });
    const struck = await until(pl.page, e => parseInt(char.endCur) === e - 4, end1);
    const closed = await until(gm.page, () => Object.values(Table.calls).some(c => c.kind === 'foe-attack' && c.closed));
    checks.push({ ok: struck && closed, msg: `a foe's attack is rolled against the target's own Parry on their phone and lands on their Endurance (${end1} → ${await pl.page.evaluate(() => char.endCur)}, closed ${closed})` });

    // Next round: everyone acts again.
    await gmClick('#panel-play button', 'Next round');
    const round2 = await until(pl.page, () => /round 2/.test((document.querySelector('#panel-play .tbl-fight .card-title') || {}).textContent || '') && /Your turn/.test((document.querySelector('#panel-play .tbl-turn') || {}).textContent || ''));
    checks.push({ ok: round2, msg: 'the next round starts the turn order again' });

    // ---- Stage 5: the Fellowship Phase, the Company's pool, and first-time explanations. ----
    await closeModals(pl.page); await closeModals(gm.page);
    await gm.page.evaluate(() => { document.getElementById('tfp-kind').value = 'yule'; document.getElementById('tfp-shadow').value = '2'; });
    await gmClick('#panel-play button', 'Begin the Fellowship Phase');
    const fpCard = await until(pl.page, () => [...document.querySelectorAll('#panel-play button')].some(b => /Start my Fellowship Phase/.test(b.textContent)));
    await pl.page.evaluate(() => { const b = [...document.querySelectorAll('#panel-play button')].find(x => /Start my Fellowship Phase/.test(x.textContent)); if (b) b.click(); });
    const preset = await pl.page.evaluate(() => ({ open: document.getElementById('fp-wizard-overlay').classList.contains('show'), yule: fpState && fpState.phaseType === 'yule', shadow: (document.querySelector('input[name="fp-shadow-rm"]:checked') || {}).value }));
    checks.push({ ok: fpCard && preset.open && preset.yule && preset.shadow === '2', msg: `the Loremaster opens the Fellowship Phase and each phone's wizard starts with those choices (${JSON.stringify(preset)})` });
    await pl.page.evaluate(async () => { confirmStyled = async () => true; try { await fpComplete(); } catch (e) {} document.querySelectorAll('.menu-overlay.show').forEach(o => o.classList.remove('show')); });
    const fpDone = await until(gm.page, () => { const li = [...document.querySelectorAll('#tbl-fplive li')]; return li.some(x => /Geira/.test(x.textContent) && /done/.test(x.textContent)) && li.some(x => /resting/.test(x.textContent)); });
    checks.push({ ok: fpDone, msg: "finishing the phase on a player's phone shows as done on the Loremaster's console, the others as resting" });

    // The Company's Fellowship pool: one shared number, spent for Hope.
    await gm.page.evaluate(() => { const b = [...document.querySelectorAll('#tbl-pool button')].find(x => /Refill/.test(x.textContent)); if (b) b.click(); });
    const refilled = await until(pl.page, () => Table.pool === 2);
    const h0 = await pl.page.evaluate(() => { char.hopeCur = Math.max(0, parseInt(char.hopeMax) - 3); saveCharacter(); render(); return parseInt(char.hopeCur); });
    await pl.page.evaluate(() => { const b = [...document.querySelectorAll('#panel-play .tbl-pool-card button')].find(x => /Spend 1/.test(x.textContent)); if (b) b.click(); });
    const spent = await until(pl2.page, () => Table.pool === 1);
    const h1 = await pl.page.evaluate(() => parseInt(char.hopeCur));
    await gm.page.evaluate(() => tableAdjPool(-1));
    await until(pl.page, () => Table.pool === 0);
    await pl.page.evaluate(() => { spendFPforHope(); });   // it answers with a dialog; do not wait on it
    await pl.page.waitForTimeout(300);
    const h2 = await pl.page.evaluate(() => parseInt(char.hopeCur));
    await closeModals(pl.page);
    checks.push({ ok: refilled && spent && h1 === h0 + 1 && h2 === h1, msg: `the Company's Fellowship pool is shared: a spend lowers it on every phone and gives +1 Hope, and an empty pool gives nothing (${h0}→${h1}→${h2})` });

    // First-time explanations: shown once per hero, then never again for the same thing.
    const lessonCount = await pl.page.evaluate(async () => { let n = 0; for (let i = 0; i < 20; i++) { const b = document.querySelector('#panel-play .tbl-learn button'); if (!b) break; b.click(); n++; await new Promise(r => setTimeout(r, 30)); } return n; });
    await gmClick('#tbl-phases button', 'Story'); await pl.page.waitForTimeout(400);
    await gmClick('#tbl-phases button', 'Fellowship Phase');
    await until(pl.page, () => /Fellowship Phase/.test((document.querySelector('#panel-play .tbl-phase .card-title') || {}).textContent || ''));
    const again = await pl.page.evaluate(() => !!document.querySelector('#panel-play .tbl-learn'));
    await gmClick('#tbl-phases button', 'A council');
    const fresh = await until(pl.page, () => /A council/.test((document.querySelector('#panel-play .tbl-learn') || {}).textContent || ''));
    checks.push({ ok: lessonCount >= 3 && !again && fresh, msg: `first-time explanations appear once per hero and not again (${lessonCount} seen, repeat ${again}, new one ${fresh})` });

    // ---- UX round (2026-09-28): the big screen, joining, the console, the player's sheet ----
    await closeModals(pl.page); await closeModals(gm.page);
    // The big screen always has a way back: it was reported "stuck" — its only Close sat under an
    // iPhone's status bar in app mode, where a tap does not reach the page.
    const tv = await pl.page.evaluate(async () => {
      const wait = ms => new Promise(r => setTimeout(r, ms));
      const hit = el => { const r = el.getBoundingClientRect(); const e = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return r.width > 0 && (e === el || el.contains(e)); };
      const ov = document.getElementById('table-mode-overlay');
      openTableMode(); await wait(300);
      const backs = [...ov.querySelectorAll('.tv-back')];
      const allHit = backs.length === 2 && backs.every(hit);
      const bottomFixed = backs[1] && getComputedStyle(backs[1]).position === 'fixed';
      const rule = [...document.styleSheets].flatMap(x => { try { return [...x.cssRules]; } catch (e) { return []; } }).find(r => r.selectorText === '.bigscreen .tv-wrap');
      const clearsStatusBar = !!rule && /padding:\s*calc\(var\(--safe-top\)/.test(rule.cssText);
      window.history.back(); await wait(300);
      const phoneBack = !ov.classList.contains('show');
      openTableMode(); await wait(100);
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await wait(150);
      const escape = !ov.classList.contains('show');
      openTableMode(); await wait(100);
      if (backs[1]) backs[1].click();
      const bottomButton = !ov.classList.contains('show') && _tableModeTimer === null;
      await wait(300);
      return { allHit, bottomFixed, clearsStatusBar, phoneBack, escape, bottomButton };
    });
    checks.push({ ok: Object.values(tv).every(v => v === true), msg: `the big screen always has a way back — two tappable Back buttons clear of the status bar, Escape and the phone's own Back (${JSON.stringify(tv)})` });
    const tvc = await gm.page.evaluate(async () => { openTableMode(); await new Promise(r => setTimeout(r, 250)); const t = document.getElementById('table-mode-body').textContent; const heroCard = [...document.querySelectorAll('#table-mode-body .tv-hero .tv-name')].some(n => /Geira/.test(n.textContent)); closeTableMode(); await new Promise(r => setTimeout(r, 250)); return { phase: /A council/.test(t), hero: heroCard, code: t.includes(campaignInfo().code) }; });
    checks.push({ ok: tvc.phase && tvc.hero && tvc.code, msg: `at a table the big screen shows the phase, the heroes and the join code (${JSON.stringify(tvc)})` });

    // A Loremaster plays no hero: the header names the table; the GM tab drops this device's roster.
    const lm = await gm.page.evaluate(async () => {
      const vis = el => !!el && el.checkVisibility();
      openNavGroup('adventure'); document.querySelector('.tab[data-tab="gm"]').click(); await new Promise(r => setTimeout(r, 200));
      const out = { isLm: document.body.classList.contains('is-lm'), title: vis(document.getElementById('lm-title')) ? document.getElementById('lm-title-text').textContent : null,
        hud: vis(document.getElementById('hud')), heroName: vis(document.getElementById('char-name')), localCards: document.getElementById('gm-party-body').children.length,
        eye: vis(document.getElementById('gm-eye-card')), duplicateBroadcast: !!document.getElementById('gm-bcast-text'), toConsole: [...document.querySelectorAll('#gm-campaign-body button')].some(b => /Go to the table console/.test(b.textContent)) };
      openNavGroup('play'); return out;
    });
    checks.push({ ok: lm.isLm && lm.title === 'Table' && !lm.hud && !lm.heroName && lm.localCards === 0 && !lm.eye && !lm.duplicateBroadcast && lm.toConsole, msg: `the Loremaster's header names the table, and the GM tab at a table drops the local roster, the solo Eye and the duplicate broadcast box (${JSON.stringify(lm)})` });

    // Saying something to the table reaches every phone as a toast, not only the phase card.
    await gm.page.evaluate(() => { document.getElementById('tbl-note').value = 'A cold wind from the north'; });
    await gmClick('#panel-play button', 'Show it on every phone');
    const toasted = await until(pl.page, () => [...document.querySelectorAll('#toast-wrap .toast')].some(t => /A cold wind/.test(t.textContent)));
    checks.push({ ok: toasted, msg: "what the Loremaster says to the table pops up on the player's phone" });

    // The player's sheet: skills with no ranks fold away; a lost connection says so.
    await openPlay(pl.page); await pl.page.waitForTimeout(300);
    const fold = await pl.page.evaluate(() => {
      const d = document.querySelector('#panel-play .tbl-more');
      const inside = d ? [...d.querySelectorAll('.tbl-roll strong')].map(x => x.textContent) : [];
      const zero = Object.keys(char.skills).filter(k => !(parseInt(char.skills[k].rating) > 0) && !char.skills[k].favoured);
      return { folded: !!d && !d.open, zero: zero.length, match: zero.length > 0 && inside.length === zero.length && zero.every(z => inside.some(t => t.startsWith(z))) };
    });
    checks.push({ ok: fold.folded && fold.match, msg: `skills a hero has no ranks in fold away under one line on the table sheet (${JSON.stringify(fold)})` });
    const offline = await pl.page.evaluate(() => { Table._connCb({ val: () => false }); const shown = !!document.querySelector('#panel-play .tbl-offline'); Table._connCb({ val: () => true }); return shown && !document.querySelector('#panel-play .tbl-offline'); });
    checks.push({ ok: offline, msg: "a phone that loses the table says so, and the notice goes when it is back" });

    // Tapping the dim backdrop closes a sheet — but never a question waiting for an answer.
    const bd = await pl.page.evaluate(() => {
      openCampaign(); const ov = document.getElementById('campaign-overlay');
      ov.dispatchEvent(new MouseEvent('click', { bubbles: true })); const closed = !ov.classList.contains('show');
      showModal({ title: 'Q', message: 'q', buttons: [{ label: 'Answer', value: 1 }] }); const m = document.getElementById('styled-modal-overlay');
      m.dispatchEvent(new MouseEvent('click', { bubbles: true })); const kept = m.classList.contains('show');
      m.querySelector('button').click(); return { closed, kept };
    });
    checks.push({ ok: bd.closed && bd.kept, msg: `tapping the backdrop closes a sheet but not a pending question (${JSON.stringify(bd)})` });

    // Joining by the invite link / QR, with the code typed any old way; no dialog in the way.
    const pl3 = await device(browser, baseUrl, db, 'pl3', errors);
    await pl3.page.evaluate(() => { loadPregen(3); }); await closeModals(pl3.page);
    await pl3.page.evaluate(c => { location.hash = 'join=' + encodeURIComponent(c.toLowerCase().replace(/-/g, ' ')); }, code);
    const linkOpens = await until(pl3.page, c => { const ov = document.getElementById('campaign-overlay'); const inp = document.getElementById('camp-code'); return ov.classList.contains('show') && !!inp && inp.value === c && !document.getElementById('camp-form-pl').hidden; }, code);
    await pl3.page.evaluate(() => { const b = document.getElementById('camp-join-btn'); if (b) b.click(); });
    const joined3 = await until(pl3.page, () => tableActive() && document.getElementById('panel-play').classList.contains('active') && !document.getElementById('campaign-overlay').classList.contains('show'));
    const noDialog = await pl3.page.evaluate(() => !document.getElementById('styled-modal-overlay').classList.contains('show'));
    checks.push({ ok: linkOpens && joined3 && noDialog, msg: `an invite link opens the join step with the code filled in, and joining lands on the table with no dialog (${linkOpens}/${joined3}/${noDialog})` });

    // A player at a table does not get the solo Journey and Council tabs; leaving brings them back.
    const tabs = await pl3.page.evaluate(async () => {
      const vis = id => document.querySelector(`.tab[data-tab="${id}"]`).style.display !== 'none';
      const at = [vis('journey'), vis('council'), vis('combat')];
      Sync.leaveCampaign(); await new Promise(r => setTimeout(r, 150));
      return { at, after: [vis('journey'), vis('council')] };
    });
    checks.push({ ok: !tabs.at[0] && !tabs.at[1] && tabs.at[2] && tabs.after[0] && tabs.after[1], msg: `a player at a table has no solo Journey or Council tab, and gets them back on leaving (${JSON.stringify(tabs)})` });

    // Starting a table from the sheet lands on the console with the invite showing; on a tablet
    // the console reads in two columns.
    const gm3 = await device(browser, baseUrl, db, 'gm3', errors, { width: 1024, height: 1366 });
    await gm3.page.evaluate(() => { openCampaign(); campStep('lm'); document.getElementById('camp-name').value = 'Weathertop'; document.getElementById('camp-create-btn').click(); });
    const invite = await until(gm3.page, () => { const i = document.querySelector('#tbl-invite .tbl-invite'); return !!i && document.getElementById('panel-play').classList.contains('active') && !!i.querySelector('#tbl-invite-qr img, #tbl-invite-qr canvas') && i.textContent.includes(campaignInfo().code) && !document.getElementById('styled-modal-overlay').classList.contains('show'); });
    const cols = await gm3.page.evaluate(() => { const m = document.querySelector('.tbl-gm-main').getBoundingClientRect(), sd = document.querySelector('.tbl-gm-side').getBoundingClientRect(); return { two: sd.left >= m.right - 1, main: Math.round(m.width), side: Math.round(sd.width) }; });
    const noInviteWithPlayers = await gm.page.evaluate(() => !document.querySelector('#tbl-invite .tbl-invite'));
    checks.push({ ok: invite && noInviteWithPlayers, msg: `starting a table goes straight to the console with the code and a QR to show; it steps aside once players are in (${invite}/${noInviteWithPlayers})` });
    checks.push({ ok: cols.two && cols.main > 320 && cols.side > 320, msg: `on a tablet the console reads in two columns (${JSON.stringify(cols)})` });

    checks.push({ ok: errors.length === 0, msg: `no page errors across the table devices (${errors.slice(0, 3).join(' | ')})` });
    for (const d of [gm, pl, pl2, solo, pl3, gm3]) await d.context.close();
    return { checks };
  }
};
