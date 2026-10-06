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

    // ===== Clarity pass (2026-10-06): results read as a picture and a sentence, not a rules dump =====
    const ev = await safe(`
      ${reset.replace(/\n/g, ' ')}
      char.moriaMode = true; char.saga.step = 'journey'; saveCharacter(); refreshStriderUI();
      char.journey = { active: true, origin: 'Moria — First Hall', destination: 'Third hall', totalHexes: 18, currentHex: 2, hardTerrainHexes: 0,
        season: 'Spring', region: 'Dark', daysElapsed: 2, travelFatigue: 0, events: [{ day: 1, hex: 1, text: '🚶 Marching Test — x' }], nextEventHex: 2, roles: {} };
      saveCharacter(); playClearFeed();
      openNavGroup(navGroupOf('play').id); document.querySelector('.tab[data-tab="play"]').click();
      window._realFeat = window._realFeat || rollFeatOnce; rollFeatOnce = () => ({ label: '8', value: 8 });
      await playEvent();
      ${unstub}
      renderPlay();
      const card = document.querySelector('#play-body .jev');
      const body = document.getElementById('play-body').innerText;
      return { card: !!card, name: card && card.querySelector('.jev-name').textContent.trim(),
               find: !!(card && card.querySelector('.jev-find')), stakes: !!(card && card.querySelector('.jev-stakes li.bad')),
               chips: card ? card.querySelectorAll('.jev-chip').length : 0,
               junk: card ? /Sub-event roll|Feat 8|Dark Land|Either way|▶/.test(card.textContent) : true,
               rc: (document.querySelector('#play-body .route-count')||{}).textContent, stretches: (body.match(/of 18 stretches/g) || []).length, camp: /· 1 camp$/.test(((document.querySelector('#play-body .route-count')||{}).textContent||'').trim()),
               asks: /asks something of you/.test(body) };`);
    checks.push({ ok: !ev.err && ev.card && /Branching Stairs/.test(ev.name || '') && ev.find && ev.stakes && ev.chips >= 2 && !ev.junk,
      msg: `a journey event on Play is one card — name, what you find, what failing costs, what to roll — with no dice/table arithmetic (${JSON.stringify(ev)})` });
    checks.push({ ok: !ev.err && ev.stretches === 1 && ev.camp && !ev.asks,
      msg: `Play says where you are on the road once (the map), "1 camp" not "1 camps", and does not repeat the roll the button offers (${JSON.stringify(ev)})` });

    const res = await safe(`
      const pend = char.journey.pendingEventRoll;
      window._realRand = window._realRand || Math.random; Math.random = () => 0;
      window._realFeat = window._realFeat || rollFeatOnce; rollFeatOnce = () => ({ label: '1', value: 1 });
      await playEventRoll();
      ${unstub}
      renderPlay();
      const ps = [...document.querySelectorAll('#play-body .play-feed p')]; const last = ps[ps.length - 1];
      openNavGroup(navGroupOf('journey').id); document.querySelector('.tab[data-tab="journey"]').click(); renderJourney();
      const log = document.getElementById('j-event-log');
      const out = { pend: !!pend, pill: !!(last && last.querySelector('.roll-pill')), arrows: last ? /→|\\(👁/.test(last.textContent) : true,
        logCard: !!log.querySelector('.jev'), logPill: !!log.querySelector('.jev-res .roll-pill'),
        logJunk: /Sub-event roll|Feat \\d|Dark Land/.test(log.textContent) };
      char.moriaMode = false; char.journey = { active: false }; saveCharacter(); refreshStriderUI();
      return out;`);
    checks.push({ ok: !res.err && res.pend && res.pill && !res.arrows,
      msg: `the event roll's result is a dice pill and a sentence, without running totals (${JSON.stringify(res)})` });
    checks.push({ ok: !res.err && res.logCard && res.logPill && !res.logJunk,
      msg: `the Journey log draws the same card and result lines as Play (${JSON.stringify(res)})` });

    const foe = await safe(`
      ensureEncounterActive();
      enc().foes.push({ id: 'cf1', name: 'Test Orc', source: 'T', endMax: 10, endCur: 10, might: 1, hateMax: 2, hateCur: 2, parry: 2, armour: 0, atkTN: 14,
        attacks: [{ name: 'Blade', dice: 2, dmg: 3, inj: 0, special: '' }], engaged: true, wounded: false, slain: false });
      openNavGroup(navGroupOf('combat').id); document.querySelector('.tab[data-tab="combat"]').click();
      await heroAttackFoe('cf1');
      const said = document.querySelector('#encounter-card .foe-said');
      const out = { pill: !!(said && said.querySelector('.roll-pill')), junk: said ? /Str \\+ Parry|vs TN|→ (FAIL|SUCCESS)/.test(said.textContent) : true,
                    log: /Str \\+ Parry/.test(_encResults['cf1'] || '') };
      char.encounter = JSON.parse(JSON.stringify(DEFAULT_CHARACTER.encounter)); saveCharacter(); render();
      return out;`);
    checks.push({ ok: !foe.err && foe.pill && !foe.junk && foe.log,
      msg: `a foe card shows your attack as a pill and a sentence; the TN arithmetic stays in the log (${JSON.stringify(foe)})` });

    const slog = await safe(`
      openNavGroup(navGroupOf('council').id); document.querySelector('.tab[data-tab="council"]').click();
      pickCouncilKind('endeavour'); startSkillEndeavour(); rollSkillEndeavourAttempt('Athletics'); rollSkillEndeavourAttempt('Awe');
      const log = document.getElementById('se-roll-log');
      const out = { rows: log.querySelectorAll('.slog-row .roll-pill').length, junk: /STR TN|HRT TN|WIT TN|Feat \\d|No contribution/.test(log.textContent) };
      char.skillEndeavour.active = false; saveCharacter(); render();
      return out;`);
    checks.push({ ok: !slog.err && slog.rows === 2 && !slog.junk,
      msg: `Council/Endeavour log rows are a pill and a phrase, not "Feat 6, total 11 vs STR TN 15, 0 ✦. No contribution. FAIL" (${JSON.stringify(slog)})` });

    const ch = await safe(`
      openNavGroup(navGroupOf('chronicle').id); document.querySelector('.tab[data-tab="chronicle"]').click();
      if (typeof ensureActiveScene === 'function') ensureActiveScene();
      pushBlock('auto', 'note', 'A test line.', 'play'); renderChronicle();
      await new Promise(r => setTimeout(r, 50));
      const row = [...document.querySelectorAll('#panel-chronicle .ch-row')].pop();
      const tools = row && row.querySelector('.blk-tools'); const before = !!(tools && tools.checkVisibility());
      row && row.querySelector('.blk-more').click();
      const after = !!(tools && tools.checkVisibility());
      return { before, after };`);
    checks.push({ ok: !ch.err && ch.before === false && ch.after === true,
      msg: `Chronicle line tools (▲ ▼ describe edit ×) sit behind one ⋯ until tapped (${JSON.stringify(ch)})` });

    const misc = await safe(`
      _tellingResult('', 'middling');
      const lab = (oracleHistory[0] || {}).label || '';
      openNavGroup(navGroupOf('oracle').id); document.querySelector('.tab[data-tab="oracle"]').click();
      rollChamber(); const cr = document.getElementById('chamber-result').textContent;
      return { lab, quotes: /""/.test(lab), chamberTyped: /Type:|Appearance:/.test(cr) };`);
    checks.push({ ok: !misc.err && !misc.quotes && !misc.chamberTyped,
      msg: `no empty "" in Oracle history for an unasked question; a chamber reads as one sentence (${JSON.stringify(misc)})` });

    // ---- 2026-10-06 report: healing, noteworthy, arrival, combat turns, scroll, first tap ----
    const heal = await safe(`
      openNavGroup('play');
      const keep = _doInlineRoll;
      Object.assign(char, { wounded: true, injury: 'Severe Injury — 2 days', injuryDays: 2, injuryKind: 'severe', firstAidUsed: false });
      window._doInlineRoll = () => ({ total: 20, outcome: 'SUCCESS', icons: 1, featSpecial: null, featValue: 10 });
      try { await playFirstAid(); } finally { window._doInlineRoll = keep; }
      const afterAid = char.wounded;
      Object.assign(char, { wounded: true, injuryDays: 1, injuryKind: 'severe', firstAidUsed: false });
      advanceDays(1);
      return { afterAid, afterDays: char.wounded };`);
    checks.push({ ok: !heal.err && heal.afterAid === false && heal.afterDays === false,
      msg: `a successful First Aid (or the days running out) mends a Severe Injury and clears Wounded (${JSON.stringify(heal)})` });

    const nw = await safe(`
      openNavGroup('play');
      char.striderMode = true; char.moriaMode = false;
      char.saga = Object.assign({}, char.saga, { started: true, step: 'journey', premise: 'x' });
      char.journey = Object.assign(JSON.parse(JSON.stringify(DEFAULT_CHARACTER.journey)), { active: true, origin: 'Bree', destination: 'Rivendell', totalHexes: 9, currentHex: 3, nextEventHex: 3, region: 'wild', season: 'spring', events: [] });
      const all = Object.values(SOLO_EVENT_DETAILS).flat(); const nwRec = all.find(d => d.outcome === 'Noteworthy Encounter');
      const saved = {}; Object.keys(SOLO_EVENT_DETAILS).forEach(k => { saved[k] = SOLO_EVENT_DETAILS[k]; SOLO_EVENT_DETAILS[k] = Array(6).fill(nwRec); });
      try { await playEvent(); } finally { Object.assign(SOLO_EVENT_DETAILS, saved); }
      const j = char.journey;
      const labels = _playChoices().map(c => c.label);
      const card = [...document.querySelectorAll('#play-body .play-feed .jev')].pop();
      const out = { scene: !!j.pendingScene, roll: !!j.pendingEventRoll, labels, fails: !!(card && /If it fails/.test(card.textContent)) };
      meetScene('pass'); out.cleared = !char.journey.pendingScene;
      return out;`);
    checks.push({ ok: !nw.err && nw.scene && !nw.roll && !nw.fails && nw.labels.some(l => /Fight it out/.test(l)) && nw.labels.some(l => /Talk your way/.test(l)) && nw.cleared,
      msg: `a Noteworthy Encounter offers how to meet it (fight / talk / overcome) instead of an "If it fails" with nothing to roll (${JSON.stringify(nw)})` });

    const arr = await safe(`
      char.journey.currentHex = char.journey.totalHexes; char.journey.nextEventHex = null; char.journey.pendingEventRoll = null;
      char.saga.step = 'journey'; saveCharacter();
      const labels = _playChoices().map(c => c.label);
      char.saga.step = 'home'; const home = _playChoices().map(c => c.label);
      char.journey.active = false; char.saga.step = 'haven'; saveCharacter(); render();
      return { first: labels[0], onward: labels.some(l => /Travel onward/.test(l)), homeOnward: home.some(l => /Travel onward/.test(l)) };`);
    checks.push({ ok: !arr.err && /arrived/.test(arr.first) && !arr.onward && !arr.homeOnward,
      msg: `at the end of the road Play leads with arriving, not "Travel onward" (${JSON.stringify(arr)})` });

    const turn = await safe(`
      openNavGroup('adventure'); document.querySelector('.tab[data-tab="combat"]').click();
      char.encounter = JSON.parse(JSON.stringify(DEFAULT_CHARACTER.encounter)); char.stance = 'open';
      addFoeFromBestiary(0);
      const keep = _doInlineRoll;
      window._doInlineRoll = () => ({ total: 9, outcome: 'FAIL', icons: 0, featSpecial: 'eye', featValue: 0, featLabel: '👁' });
      const out = {};
      try {
        const e = enc();
        out.r1 = e.round; out.t0 = e.turn || 'hero';
        out.heroOn = !!document.querySelector('.hero-fight-card.turn-on button[onclick^="heroAttackFoe"]');
        const fid = e.foes[0].id;
        await heroAttackFoe(fid);
        out.t1 = enc().turn;
        out.pill = (document.querySelector('.foe-card .foe-said .roll-pill') || {}).textContent || '';
        out.heroOff = !!document.querySelector('.hero-fight-card.turn-off') && !document.querySelector('.hero-fight-card button[onclick^="heroAttackFoe"]');
        out.foeOn = !!document.querySelector('.foe-card.turn-on button[onclick^="foeAttackHero"]');
        out.head = !!document.querySelector('.foe-card .foe-said .fs-head b');
        await foeAttackHero(fid, 0);
        out.r2 = enc().round; out.t2 = enc().turn;
      } finally { window._doInlineRoll = keep; }
      document.querySelectorAll('.menu-overlay.show').forEach(o => o.classList.remove('show'));
      char.encounter = JSON.parse(JSON.stringify(DEFAULT_CHARACTER.encounter)); saveCharacter(); render();
      return out;`);
    checks.push({ ok: !turn.err && turn.t0 === 'hero' && turn.heroOn && turn.t1 === 'foes' && turn.heroOff && turn.foeOn && turn.r2 === turn.r1 + 1 && turn.t2 === 'hero',
      msg: `a fight runs in turns: your card is live on your turn, the foe's on its turn, and the round advances by itself (${JSON.stringify(turn)})` });
    checks.push({ ok: !turn.err && /9/.test(turn.pill) && !/\b0\b/.test(turn.pill) && turn.head,
      msg: `an Eye on your attack shows the real total, not 0, under a bold one-word result (${JSON.stringify(turn.pill)})` });

    const scr = await safe(`
      openNavGroup('play'); playClearFeed();
      char.saga.step = 'haven';
      for (let i = 0; i < 14; i++) playSay('Line ' + i + ' of the story, long enough to take some room on a phone screen.');
      renderPlay(); await new Promise(r => setTimeout(r, 60));
      window.scrollTo(0, 300); await new Promise(r => setTimeout(r, 60));
      const y0 = window.scrollY;
      playSay('The newest line.'); renderPlay(); await new Promise(r => setTimeout(r, 60));
      const fd = document.querySelector('#play-body .play-feed');
      const last = fd && fd.lastElementChild; const rc = last && last.getBoundingClientRect(); const fr = fd.getBoundingClientRect();
      const visible = !!rc && rc.bottom <= Math.min(window.innerHeight, fr.bottom) + 2 && rc.top >= Math.max(0, fr.top) - 2;
      return { y0, y1: window.scrollY, visible, text: last && last.textContent };`);
    checks.push({ ok: !scr.err && scr.y0 > 0 && scr.y1 > 0 && scr.visible && /newest/.test(scr.text),
      msg: `a new line on Play keeps your place on the page and is scrolled into view (${JSON.stringify(scr)})` });

    const tap = await safe(`
      openNavGroup('play'); document.body.classList.add('hdr-slim');
      document.querySelector('.bn-item[data-group="roll"]').click();
      await new Promise(r => setTimeout(r, 450));
      const g = document.querySelector('.panel.active').id; openNavGroup('play');
      return { panel: g, slim: document.body.classList.contains('hdr-slim') };`);
    checks.push({ ok: !tap.err && tap.panel !== 'panel-play' && !tap.slim,
      msg: `one tap on a nav button works while the header is folded (it used to only unfold it) (${JSON.stringify(tap)})` });

    // ---- Pick a foe for me ----
    const fs = await safe(`
      const missing = []; Object.values(FOE_POOLS).forEach(P => P.t.flat().forEach(n => { if (!_foeExists(n)) missing.push(n); }));
      const top = w => Object.entries(w).sort((a, b) => b[1] - a[1])[0][0];
      const story = top(_foePoolWeights({ terrain: 'forest', land: 'wild', story: 'Servants of the Enemy — Terrible Misfortune', place: '' }));
      const moria = top(_foePoolWeights({ terrain: 'moria', land: 'dark', story: '', place: '' }));
      const freeW = _foePoolWeights({ terrain: 'road', land: 'free', story: '', place: '' });
      const keepEnd = char.endCur, keepJ = JSON.stringify(char.journey);
      char.journey = Object.assign(JSON.parse(JSON.stringify(DEFAULT_CHARACTER.journey)), { active: true, region: 'dark', totalHexes: 9, currentHex: 2, events: [], pendingScene: { name: 'Despair', detail: 'Dire confrontation' } });
      char.endCur = char.endMax; const hard = suggestFoes({ pool: 'orcs' }).tier;
      char.journey.region = 'free'; char.journey.pendingScene = null; char.endCur = 1; const easy = suggestFoes({ pool: 'bandits' }).tier;
      char.endCur = keepEnd; char.journey = JSON.parse(keepJ); saveCharacter();
      return { missing, story, moria, freeTrolls: 'trolls' in freeW, hard, easy };`);
    checks.push({ ok: !fs.err && !fs.missing.length && fs.story === 'servants' && fs.moria === 'goblins' && !fs.freeTrolls && fs.hard === 2 && fs.easy === 0,
      msg: `"Pick a foe for me" follows the story, the land and the hero: event names the foe, Moria means goblins, no trolls in the Free Lands, a dire Dark-Land fight is deadly, a hurt hero gets an ordinary one (${JSON.stringify(fs)})` });

    const fui = await safe(`
      openNavGroup('play'); char.encounter = JSON.parse(JSON.stringify(DEFAULT_CHARACTER.encounter)); saveCharacter();
      await playFight(); await new Promise(r => setTimeout(r, 80));
      const card = document.querySelector('#bestiary-overlay.show .foe-sug');
      const btn = card && [...card.querySelectorAll('button')].find(b => /^Fight (it|them)$/.test(b.textContent.trim()));
      const want = window._foeSug ? 1 + window._foeSug.minions.length : -1;
      btn && btn.click(); await new Promise(r => setTimeout(r, 120));
      document.querySelectorAll('.menu-overlay.show').forEach(o => o.classList.remove('show'));
      const out = { shown: !!card, btn: !!btn, want, got: enc().foes.length, panel: document.querySelector('.panel.active').id,
        closed: !document.getElementById('bestiary-overlay').classList.contains('show') };
      char.encounter = JSON.parse(JSON.stringify(DEFAULT_CHARACTER.encounter)); saveCharacter(); render();
      return out;`);
    checks.push({ ok: !fui.err && fui.shown && fui.btn && fui.want > 0 && fui.got === fui.want && fui.panel === 'panel-combat' && fui.closed,
      msg: `"Something attacks!" opens with a suggested foe at the top; one tap on Fight brings it into the fight on the Combat tab (${JSON.stringify(fui)})` });

    checks.push({ ok: errors.length === 0, msg: `0 page errors (got ${errors.length}${errors.length ? ': ' + errors[0] : ''})` });
    await context.close();
    return { checks };
  }
};
