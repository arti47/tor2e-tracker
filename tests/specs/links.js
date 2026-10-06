// links — the linkage + rules pass (2026-10-06): Play, the Journey tab, the Chronicle calendar,
// the Dice history, Combat and the Council are one game, not separate tabs that disagree. Every
// check asserts the outcome a player sees (GOTCHA 20) and was proven to fail with its fix reverted.
module.exports = {
  name: 'links',
  async run({ browser, baseUrl, newPage }) {
    const checks = [];
    const { context, page, errors } = await newPage(browser, baseUrl + '/character-tracker.html');
    await page.setViewportSize({ width: 390, height: 844 });
    const safe = fn => page.evaluate(async src => { try { return await (new Function('return (async()=>{' + src + '})()'))(); } catch (e) { return { err: String(e && e.message || e) }; } }, fn);
    const reset = `
      loadPregen(0); document.querySelectorAll('.menu-overlay.show').forEach(o => o.classList.remove('show'));
      char.striderMode = true; char.saga = Object.assign(char.saga || {}, { started: true, premise: 'Orcs on the East Road.', step: 'haven' });
      char.journey = { active: false }; char.encounter = { active: false, round: 1, foes: [], weaponIdx: 0, adv: {} };
      char.endCur = char.endMax; char.fatigue = 0; char.weary = false; char.miserable = false; char.shadow = 0; char.scars = 0;
      char.pendingRewards = 0; char.pendingVirtues = 0; char.boutDue = false; char.eyeAwareness = 0; char.magicalItems = [];
      saveCharacter(); render(); refreshStriderUI();`;
    await safe(reset + ' return 1;');
    // A deterministic Feat die: stub the one function every roll uses.
    const stubFeat = (o) => `window._realFeat = window._realFeat || rollFeatOnce; rollFeatOnce = () => (${JSON.stringify(o)});`;
    const unstub = `if (window._realFeat) rollFeatOnce = window._realFeat; if (window._realRand) { Math.random = window._realRand; }`;

    // ---- One calendar: a day passed on the road turns the month in the Tale of Years ----
    const cal = await safe(`
      journal.clock.year = 2965; journal.clock.month = SHIRE_MONTHS[3]; journal.clock.day = 30;
      const dc = parseInt(char.dayCount) || 1; advanceDays(1);
      return { month: journal.clock.month, day: journal.clock.day, want: SHIRE_MONTHS[4], dc: char.dayCount - dc };`);
    checks.push({ ok: !cal.err && cal.month === cal.want && cal.day === 1 && cal.dc === 1, msg: `a day passing rolls the Chronicle into the next month and counts on the hero (${JSON.stringify(cal)})` });

    // ---- The journey travels in the calendar's season ----
    const sea = await safe(`
      journal.clock.month = SHIRE_MONTHS[10]; journal.clock.day = 30;
      char.journey = { active: true, season: 'Autumn', totalHexes: 9, currentHex: 2, events: [], roles: {} };
      advanceDays(1); const s = char.journey.season; char.journey = { active: false }; return { s, month: journal.clock.month };`);
    checks.push({ ok: !sea.err && sea.s === 'Winter', msg: `crossing into Foreyule on the road turns the journey's season to Winter (${JSON.stringify(sea)})` });

    // ---- A journey begun on the Journey tab moves ▶ Play onto the road ----
    const jt = await safe(`
      document.getElementById('j-totalHexes').value = 9; document.getElementById('j-destination').value = 'Weathertop';
      char.saga.step = 'haven'; startJourney(); const a = char.saga.step;
      char.journey.active = false; char.saga.step = 'location'; startJourney(); const b = char.saga.step;
      char.journey = { active: false }; saveCharacter(); return { a, b };`);
    checks.push({ ok: !jt.err && jt.a === 'journey' && jt.b === 'home', msg: `the Journey tab's Set out moves Play to the road (out: journey, back: home) (${JSON.stringify(jt)})` });

    // ---- Camping on the road does not lift lingering Fatigue; a Safe Haven does ----
    const rest = await safe(`
      char.journey = { active: true, totalHexes: 9, currentHex: 2, events: [], roles: {} }; char.saga.step = 'journey'; char.fatigue = 2;
      await playRest(); const road = char.fatigue;
      char.journey = { active: false }; char.saga.step = 'haven';
      await playRest(); const haven = char.fatigue; char.fatigue = 0; saveCharacter(); return { road, haven };`);
    checks.push({ ok: !rest.err && rest.road === 2 && rest.haven === 1, msg: `a night on the road keeps Fatigue, a night in a Safe Haven clears 1 (${JSON.stringify(rest)})` });

    // ---- Play leads with whatever is running elsewhere: a fight, a Peril, owed rewards ----
    const lead = await safe(`
      char.encounter = { active: true, round: 1, foes: [{ id: 'f1', name: 'Orc', endCur: 8, endMax: 8, slain: false, attacks: [] }], weaponIdx: 0, adv: {} };
      const fight = _playChoices().map(c => c.fn);
      char.encounter = { active: false, round: 1, foes: [], weaponIdx: 0, adv: {} };
      char.journey = { active: true, totalHexes: 9, currentHex: 2, events: [], roles: {}, perilEventsRemaining: 1 }; char.saga.step = 'journey';
      const road = _playChoices().map(c => c.fn);
      char.journey = { active: false }; char.saga.step = 'haven';
      char.pendingRewards = 1; char.pendingVirtues = 1; char.boutDue = true;
      const owed = _playChoices().map(c => c.fn);
      char.pendingRewards = 0; char.pendingVirtues = 0; char.boutDue = false; saveCharacter();
      return { fight: fight[0], peril: road.includes('playPeril()'), owed: owed.slice(0, 3) };`);
    checks.push({ ok: !lead.err && lead.fight === "playGoTab('combat')", msg: `with a foe standing, ▶ Play leads with "Back to the fight" (${JSON.stringify(lead)})` });
    checks.push({ ok: !lead.err && lead.peril, msg: `a perilous area on the road is offered on ▶ Play (${JSON.stringify(lead)})` });
    checks.push({ ok: !lead.err && ['triggerBoutNow()', 'openNewReward()', 'openNewVirtue()'].every(f => (lead.owed || []).includes(f)), msg: `an owed Bout, Reward and Virtue lead ▶ Play (${JSON.stringify(lead)})` });

    // ---- The hero sheet shows them too, visibly, without opening Edit ----
    const sheet = await safe(`
      char.pendingRewards = 1; saveCharacter(); setCharEditing(false); renderHeroSheet();
      openNavGroup(navGroupOf('character').id); document.querySelector('.tab[data-tab="character"]').click();
      await new Promise(r => setTimeout(r, 480));
      const b = [...document.querySelectorAll('#hero-sheet button')].find(x => x.getAttribute('onclick') === 'openNewReward()');
      const vis = !!(b && b.checkVisibility()); char.pendingRewards = 0; saveCharacter(); renderHeroSheet(); return { vis };`);
    checks.push({ ok: !sheet.err && sheet.vis, msg: `an owed Reward has a visible button on the hero sheet (${JSON.stringify(sheet)})` });

    // ---- A Revelation due in solo leads ▶ Play ----
    const rev = await safe(`
      char.eyeAwareness = huntThreshold(char); const f = _playChoices().map(c => c.fn); char.eyeAwareness = 0; saveCharacter();
      return { has: f.includes('rollRevelationEpisode()') };`);
    checks.push({ ok: !rev.err && rev.has, msg: `Eye Awareness at the Hunt offers the Revelation on ▶ Play (${JSON.stringify(rev)})` });

    // ---- The fight hand-off: picking a foe from Play opens the Combat tab ----
    const hand = await safe(`
      openNavGroup(navGroupOf('play').id); document.querySelector('.tab[data-tab="play"]').click();
      await playFight(); addFoeFromBestiary(0);
      await new Promise(r => setTimeout(r, 300));
      const on = document.getElementById('panel-combat').classList.contains('active');
      document.querySelectorAll('.menu-overlay.show').forEach(o => o.classList.remove('show'));
      char.encounter = { active: false, round: 1, foes: [], weaponIdx: 0, adv: {} }; saveCharacter(); render(); return { on };`);
    checks.push({ ok: !hand.err && hand.on, msg: `a foe picked from ▶ Play's "Something attacks" opens the Combat tab (${JSON.stringify(hand)})` });

    // ---- Every roll on every tab reaches the Dice history ----
    const hist = await safe(`
      const n = history.length; _doInlineRoll(2, 'normal', 14, 'Travel · Marching Test');
      return { grew: history.length === Math.min(30, n + 1), label: history[0] && history[0].label };`);
    checks.push({ ok: !hist.err && hist.grew && hist.label === 'Travel · Marching Test', msg: `an inline roll (Journey/Play/Council) is recorded in the Dice history (${JSON.stringify(hist)})` });

    // ---- RULES: an Eye is 0, not a failure, unless the hero is Miserable ----
    const eye = await safe(`
      ${stubFeat({ label: '👁', value: 0, special: 'eye' })} window._realRand = window._realRand || Math.random; Math.random = () => 0.99;
      char.miserable = false; const a = _doInlineRoll(3, 'normal', 10).outcome;
      char.miserable = true; const b = _doInlineRoll(3, 'normal', 10).outcome; char.miserable = false;
      const c = _doInlineRoll(3, 'normal', 10, null, { foe: true }).outcome;
      ${unstub} saveCharacter(); return { a, b, c };`);
    checks.push({ ok: !eye.err && eye.a === 'SUCCESS' && eye.b === 'FAIL (Eye)', msg: `an Eye on an inline roll fails only a Miserable hero (${JSON.stringify(eye)})` });

    // ---- RULES: Weary zeroes Success dice of 1–3 on inline rolls too ----
    const wy = await safe(`
      ${stubFeat({ label: '5', value: 5 })} window._realRand = window._realRand || Math.random; Math.random = () => 0;
      char.weary = false; const fresh = _doInlineRoll(3, 'normal', 30).total;
      char.weary = true; const tired = _doInlineRoll(3, 'normal', 30).total; char.weary = false;
      ${unstub} saveCharacter(); return { fresh, tired };`);
    checks.push({ ok: !wy.err && wy.fresh === 8 && wy.tired === 5, msg: `a Weary hero's 1–3 Success dice count 0 on inline rolls (${JSON.stringify(wy)})` });

    // ---- RULES: a foe's dice ignore the hero's Despair ----
    const dsp = await safe(`
      let calls = 0; window._realFeat = window._realFeat || rollFeatOnce; rollFeatOnce = () => { calls++; return { label: '5', value: 5 }; };
      char.shadow = char.hopeMax; _doInlineRoll(2, 'normal', 30, null, { foe: true }); const foe = calls;
      calls = 0; _doInlineRoll(2, 'normal', 30); const hero = calls;
      char.shadow = 0; ${unstub} saveCharacter(); return { foe, hero };`);
    checks.push({ ok: !dsp.err && dsp.foe === 1 && dsp.hero === 2, msg: `Despair makes the hero's Feat die Ill-Favoured, never the foe's (${JSON.stringify(dsp)})` });

    // ---- RULES: gear dice count on inline skill rolls ----
    const gear = await safe(`
      const base = parseInt((char.skills.Awareness || {}).rating) || 0;
      char.magicalItems = [{ type: 'Marvellous Artefact', name: 'Seeing-glass', blessings: ['Awareness'] }];
      const r = _heroSkill('Awareness').rating; char.magicalItems = []; saveCharacter(); return { base, r };`);
    checks.push({ ok: !gear.err && gear.r === gear.base + 2, msg: `a Blessing adds its +2d to the Journey/Play/Council skill roll (${JSON.stringify(gear)})` });

    checks.push({ ok: errors.length === 0, msg: `0 page errors (got ${errors.length}${errors.length ? ': ' + errors[0] : ''})` });
    await context.close();
    return { checks };
  }
};
