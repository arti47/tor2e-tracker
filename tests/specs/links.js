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
      const wasStarted = char.saga.started; char.saga.started = true;
      openNavGroup('play'); renderPlay();
      const fight = !!document.querySelector('#play-fight #encounter-card-wrap') && !!document.querySelector('#play-fight #stance-card') && !document.getElementById('play-fight').hidden;
      char.encounter = { active: false, round: 1, foes: [], weaponIdx: 0, adv: {} }; renderPlay();
      const home = !!document.querySelector('#panel-combat #encounter-card-wrap') && document.getElementById('play-fight').hidden;
      char.saga.started = wasStarted;
      char.journey = { active: true, totalHexes: 9, currentHex: 2, events: [], roles: {}, perilEventsRemaining: 1 }; char.saga.step = 'journey';
      const road = _playChoices().map(c => c.fn);
      char.journey = { active: false }; char.saga.step = 'haven';
      char.pendingRewards = 1; char.pendingVirtues = 1; char.boutDue = true;
      const owed = _playChoices().map(c => c.fn);
      char.pendingRewards = 0; char.pendingVirtues = 0; char.boutDue = false; saveCharacter();
      return { fight, home, peril: road.includes('playPeril()'), owed: owed.slice(0, 3) };`);
    checks.push({ ok: !lead.err && lead.fight && lead.home, msg: `with a foe standing, the fight (Stance + Encounter) is run inside ▶ Play, and goes back to the Combat tab when it ends (${JSON.stringify(lead)})` });
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
      const on = document.getElementById('panel-play').classList.contains('active') && !!document.querySelector('#play-fight #encounter-card-wrap');
      document.querySelectorAll('.menu-overlay.show').forEach(o => o.classList.remove('show'));
      char.encounter = { active: false, round: 1, foes: [], weaponIdx: 0, adv: {} }; saveCharacter(); render(); return { on };`);
    checks.push({ ok: !hand.err && hand.on, msg: `a foe picked from ▶ Play's "Something attacks" starts the fight right there on ▶ Play (${JSON.stringify(hand)})` });

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
      pickCouncilKind('endeavour'); startSkillEndeavour(); char.skillEndeavour.resistance = 99; char.skillEndeavour.timeLimit = 10; char.skillEndeavour.riskLevel = 'standard'; rollSkillEndeavourAttempt('Athletics'); rollSkillEndeavourAttempt('Awe');
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
      char.journey.region = 'dark'; char.journey.pendingScene = null; char.endCur = 1; const easy = suggestFoes({ pool: 'bandits' }).tier;
      char.endCur = keepEnd; char.journey = JSON.parse(keepJ); saveCharacter();
      return { missing, story, moria, freeTrolls: 'trolls' in freeW, hard, easy };`);
    checks.push({ ok: !fs.err && !fs.missing.length && fs.story === 'servants' && fs.moria === 'goblins' && !fs.freeTrolls && fs.hard === 2 && fs.easy === 0,
      msg: `"Pick a foe for me" follows the story, the land and the hero: event names the foe, Moria means goblins, no trolls in the Free Lands, a dire Dark-Land fight is deadly, a hurt hero in the Dark Lands gets an ordinary one (${JSON.stringify(fs)})` });

    const fui = await safe(`
      openNavGroup('play'); char.encounter = JSON.parse(JSON.stringify(DEFAULT_CHARACTER.encounter)); saveCharacter();
      await playFight();
      const rnd = Math.random; Math.random = () => 0.99;   // a 6 on the count die: ordinary Orcs bring company
      try { renderFoeSuggest({ pool: 'orcs', tier: 0 }); } finally { Math.random = rnd; }
      await new Promise(r => setTimeout(r, 80));
      const card = document.querySelector('#bestiary-overlay.show .foe-sug');
      const btn = card && [...card.querySelectorAll('button')].find(b => /^Fight (it|them)$/.test(b.textContent.trim()));
      const want = window._foeSug ? 1 + window._foeSug.minions.length : -1;
      btn && btn.click(); await new Promise(r => setTimeout(r, 120));
      document.querySelectorAll('.menu-overlay.show').forEach(o => o.classList.remove('show'));
      const out = { shown: !!card, btn: !!btn, want, got: enc().foes.length, panel: document.querySelector('.panel.active').id,
        closed: !document.getElementById('bestiary-overlay').classList.contains('show') };
      char.encounter = JSON.parse(JSON.stringify(DEFAULT_CHARACTER.encounter)); saveCharacter(); render();
      return out;`);
    checks.push({ ok: !fui.err && fui.shown && fui.btn && fui.want > 1 && fui.got === fui.want && fui.panel === 'panel-play' && fui.closed,
      msg: `"Something attacks!" opens with a suggested foe at the top; one tap on Fight brings it into the fight on ▶ Play (${JSON.stringify(fui)})` });

    const ob = await safe(`
      const keepAlert = window.alert; window.alert = () => {};
      const out = {};
      try {
        for (const [k, L] of [['eye', ORC_BAND_LEADER.eye], ['rune', ORC_BAND_LEADER.rune], ['six', ORC_BAND_LEADER[6]]]) {
          char.encounter = JSON.parse(JSON.stringify(DEFAULT_CHARACTER.encounter));
          window._lastOrcBand = { leader: L, tally: { '2 Orc Soldiers': 1, '1 Orc Guard + 1 Goblin Archer': 1 }, n: 2 };
          try { orcBandToEncounter(); out[k] = enc().foes.map(f => f.name).join(','); } catch (e) { out[k] = 'THREW ' + e.message; }
        }
        char.moriaMode = true; char.encounter = JSON.parse(JSON.stringify(DEFAULT_CHARACTER.encounter));
        const sg = suggestFoes({ pool: 'goblins' });
        out.moria = { band: !!sg.band, why: sg.why.join(' '), n: 1 + sg.minions.length };
      } finally { window.alert = keepAlert; char.moriaMode = false; char.encounter = JSON.parse(JSON.stringify(DEFAULT_CHARACTER.encounter)); saveCharacter(); render(); }
      return out;`);
    const want = 'Orc Soldier,Orc Soldier,Orc Guard,Goblin Archer';
    checks.push({ ok: !ob.err && ob.six === 'Orc-chieftain,' + want && ob.rune === 'Orc-chieftain,' + want && ob.eye === 'Great Orc Chief,' + want,
      msg: `a rolled Orc-Band enters the fight whole: "2 Orc Soldiers" is two, "1 Orc Guard + 1 Goblin Archer" is both, the ᚱ leader no longer throws, the 👁 leader is a Great Orc Chief (${JSON.stringify(ob)})` });
    checks.push({ ok: !ob.err && ob.moria && ob.moria.band && /Orc-Band table/.test(ob.moria.why) && ob.moria.n >= 2,
      msg: `in Moria, a suggested Orc or goblin fight is rolled on the Moria Orc-Band table (${JSON.stringify(ob.moria)})` });

    const words = await safe(`
      openNavGroup('play'); playClearFeed();
      char.saga = Object.assign({}, char.saga, { started: true, step: 'location' });
      const keepRoll = _doInlineRoll, keepModal = showModal;
      const out = {};
      try {
        window.showModal = async () => 'Stealth';
        window._doInlineRoll = () => ({ total: 5, outcome: 'FAIL', icons: 0, featSpecial: null, featValue: 3 });
        await playAttempt();
        out.fail = [...document.querySelectorAll('#play-body .play-feed p')].map(p => p.textContent).filter(t => /Move unseen/.test(t)).pop() || '';
        window._doInlineRoll = () => ({ total: 18, outcome: 'SUCCESS', icons: 1, featSpecial: null, featValue: 9 });
        await playAttempt();
        out.ok = [...document.querySelectorAll('#play-body .play-feed p')].map(p => p.textContent).filter(t => /Move unseen/.test(t)).pop() || '';
      } finally { window._doInlineRoll = keepRoll; window.showModal = keepModal; }
      out.noVague = !/it works|it doesn.t/i.test(out.fail + out.ok);
      return out;`);
    checks.push({ ok: !words.err && /You are noticed/.test(words.fail) && /slip by unseen/.test(words.ok) && /great success/i.test(words.ok) && words.noVague,
      msg: `a Play attempt says what happened to THAT attempt ("You are noticed…" / "You slip by unseen…"), not "it works" / "it doesn't" (${JSON.stringify(words)})` });

    const rw = await safe(`
      const out = {};
      rollFromSheet('Stealth'); await new Promise(r => setTimeout(r, 60));
      const b = document.getElementById('roll-banner');
      const okRoll = /Success/.test((b.querySelector('.rb-ribbon') || {}).textContent || '');
      out.said = (b.querySelector('.rb-said') || {}).textContent || '';
      out.saidRight = out.said === (okRoll ? ROLL_MEANING.Stealth[0] : ROLL_MEANING.Stealth[1]);
      rollFromSheet('Swords'); await new Promise(r => setTimeout(r, 60));
      out.attack = (document.querySelector('#roll-banner .rb-said') || {}).textContent || '';
      out.history = [...document.querySelectorAll('.hl-out')].slice(0, 3).map(e => e.textContent).join(' | ');
      out.words = [outcomeWords('SUCCESS (Rune!)'), outcomeWords('FAIL (Miserable + Eye)'), outcomeWords('FAIL'), outcomeWords('SUCCESS')];
      return out;`);
    checks.push({ ok: !rw.err && rw.saidRight && /^You (hit|miss)\.$/.test(rw.attack) && !/SUCCESS|FAIL/.test(rw.history) && /Success|Failure/.test(rw.history)
        && rw.words.join('|') === 'Success — the Rune|Failure — the Eye, while Miserable|Failure|Success',
      msg: `every Dice-tab roll says what it means for that skill ("You are noticed." / "You hit."), and no roll shows the raw SUCCESS / FAIL codes (${JSON.stringify(rw)})` });

    // A foe card shows its abilities as names; the rule text opens one at a time on a tap.
    const fc = await safe(`
      const all = allBestiary(); const i = all.findIndex(x => x.name === 'Great Orc Bodyguard');
      addFoeFromBestiary(i); document.querySelectorAll('.menu-overlay.show').forEach(o => o.classList.remove('show'));
      renderEncounter();
      const card = () => [...document.querySelectorAll('.foe-card')].find(c => /Great Orc Bodyguard/.test(c.textContent));
      const out = { chips: [...card().querySelectorAll('.fell-chip')].map(b => b.textContent),
        before: /Unaffected by unarmed attacks/.test(card().textContent), words: (card().querySelector('.foe-words') || {}).textContent || '' };
      const chip = [...card().querySelectorAll('.fell-chip')].find(b => b.textContent === 'Hideous Toughness');
      chip && chip.click();
      out.after = /Unaffected by unarmed attacks/.test((card().querySelector('.fell-desc') || {}).textContent || '');
      out.trait = foeTraits('Hatred (Dwarves). Sunlight-averse.');
      return out;`);
    checks.push({ ok: !fc.err && fc.chips.join('|') === 'Hate Sunlight|Denizen of the Dark|Hideous Toughness' && !fc.before && fc.after && /Fierce, Wary/.test(fc.words)
        && fc.trait.abilities[0].name === 'Hatred' && fc.trait.words[0] === 'Sunlight-averse',
      msg: `a foe card lists its abilities as names and opens one's rule text on a tap, instead of printing every ability in full (${JSON.stringify(fc)})` });

    // "Skip my attack this turn" always moves the fight on — even with no foe engaged.
    const hp = await safe(`
      char.encounter = JSON.parse(JSON.stringify(DEFAULT_CHARACTER.encounter));
      const all = allBestiary(); ['Orc-chieftain', 'Orc Soldier'].forEach(n => addFoeFromBestiary(all.findIndex(x => x.name === n)));
      document.querySelectorAll('.menu-overlay.show').forEach(o => o.classList.remove('show'));
      const out = {};
      await encHeroPass(); out.t1 = enc().turn;
      await encFoesHold(); out.r1 = enc().round;
      enc().foes.forEach(f => { f.engaged = false; });
      await encHeroPass(); out.r2 = enc().round; out.t2 = enc().turn;
      document.querySelectorAll('.menu-overlay.show').forEach(o => o.classList.remove('show'));
      char.encounter = JSON.parse(JSON.stringify(DEFAULT_CHARACTER.encounter)); saveCharacter(); render();
      return out;`);
    checks.push({ ok: !hp.err && hp.t1 === 'foes' && hp.r2 === hp.r1 + 1 && hp.t2 === 'hero',
      msg: `"Skip my attack this turn" hands the turn to the foes, and with no foe engaged it passes the round instead of doing nothing (${JSON.stringify(hp)})` });

    // After you act, the screen says the foes attack now; old results are marked; stale toasts drop.
    const tv = await safe(`
      char.encounter = JSON.parse(JSON.stringify(DEFAULT_CHARACTER.encounter));
      const all = allBestiary(); ['Orc-chieftain', 'Orc Soldier'].forEach(n => addFoeFromBestiary(all.findIndex(x => x.name === n)));
      document.querySelectorAll('.menu-overlay.show').forEach(o => o.classList.remove('show'));
      const out = {};
      const f0 = enc().foes[0]; _encStash(f0.id, 'line', null, '<b>It misses you</b>');
      await encHeroPass();
      const over = document.querySelector('.hero-fight-card .hero-turn-over');
      out.over = !!over && /Now the foes attack/.test(over.textContent) && getComputedStyle(over).opacity === '1';
      out.fresh = !document.querySelector('.foe-said.old');
      await encFoesHold();
      out.old = /Last round/.test((document.querySelector('.foe-said.old') || {}).textContent || '');
      document.querySelectorAll('#toast-wrap .toast').forEach(t => t.remove());
      showToast('Round 3 — your turn'); showToast('Round 4 — your turn'); showToast('Round 5 — your turn');
      out.queued = [...document.querySelectorAll('#toast-wrap .toast.queued')].map(t => t.textContent);
      document.querySelectorAll('.menu-overlay.show').forEach(o => o.classList.remove('show'));
      char.encounter = JSON.parse(JSON.stringify(DEFAULT_CHARACTER.encounter)); saveCharacter(); render();
      return out;`);
    checks.push({ ok: !tv.err && tv.over && tv.fresh && tv.old && tv.queued.length === 1 && /Round 5/.test(tv.queued[0]),
      msg: `after your turn the hero card says the foes attack now, last round's results are marked "Last round", and a stale "Round 3" toast never waits behind "Round 5" (${JSON.stringify(tv)})` });

    // The Chronicle can be cleared as a whole, keeps its date, and Undo brings it back.
    const cc = await safe(`
      setStriderMode && !isSolo() && setStriderMode(true);
      pushBlock('prose', 'note', 'We reached the ford at dusk.', 'manual');
      const before = journal.entries.length, clock = JSON.stringify(journal.clock);
      openNavGroup(navGroupOf('chronicle').id); document.querySelector('.tab[data-tab="chronicle"]').click(); renderChronicle();
      const btn = document.getElementById('ch-clear-btn');
      const out = { before, shown: !!btn && btn.checkVisibility() };
      btn.click(); await new Promise(r => setTimeout(r, 150));
      const yes = [...document.querySelectorAll('.menu-overlay.show button')].find(b => /Clear the Chronicle/.test(b.textContent));
      yes && yes.click(); await new Promise(r => setTimeout(r, 150));
      out.after = journal.entries.length; out.scenes = journal.scenes.length;
      out.clock = JSON.stringify(journal.clock) === clock;
      out.stored = JSON.parse(localStorage.getItem(journalKey())).entries.length;
      out.hidden = document.getElementById('ch-clear-btn').hidden;
      const undo = [...document.querySelectorAll('#toast-wrap .toast-action')].find(b => b.textContent === 'Undo');
      undo && undo.click();
      out.undone = journal.entries.length === before;
      return out;`);
    checks.push({ ok: !cc.err && cc.before > 0 && cc.shown && cc.after === 0 && cc.scenes === 0 && cc.stored === 0 && cc.clock && cc.hidden && cc.undone,
      msg: `"Clear the Chronicle" empties the journal (and its saved copy), keeps the date, hides itself when empty, and Undo restores it (${JSON.stringify(cc)})` });

    // Moria: setting out asks for the Band and the mission first, and can do both on the spot.
    const mb = await safe(`
      const was = char.moriaMode; char.moriaMode = true;
      char.band.allies = []; char.mission.active = false; saveCharacter();
      const press = async re => { await new Promise(r => setTimeout(r, 120)); const b = [...document.querySelectorAll('.menu-overlay.show button')].find(x => re.test(x.textContent)); if (b) b.click(); return !!b; };
      const out = {};
      out.choice = (_playStepChoices ? '' : '');
      playSetOut();
      out.askedBand = await press(/Roll my Band of six/);
      out.allies = char.band.allies.length;
      out.askedPlan = await press(/Use a standard plan/);
      out.planned = !!char.mission.active;
      out.toWhere = await press(/Cancel/);
      // Ready now: the Journey tab starts without asking again.
      char.journey.active = false; document.getElementById('j-totalHexes').value = 4;
      await startJourney();
      out.started = !!char.journey.active;
      document.querySelectorAll('.menu-overlay.show').forEach(o => o.classList.remove('show'));
      char.journey.active = false; char.moriaMode = was; saveCharacter(); render();
      return out;`);
    checks.push({ ok: !mb.err && mb.askedBand && mb.allies === 6 && mb.askedPlan && mb.planned && mb.started,
      msg: `in Moria, setting out first gathers the Band and plans the mission, then the journey starts without asking again (${JSON.stringify(mb)})` });

    // Moria on ▶ Play: a location is explored chamber by chamber, and orcs come as an Orc-band.
    const mch = await safe(`
      const was = char.moriaMode; char.moriaMode = true;
      if (!char.saga.started) { char.saga.started = true; char.saga.premise = 'Reclaim the halls'; }
      char.journey.destination = 'the Twenty-first Hall'; char.journey.active = false;
      sagaState().step = 'location'; delete sagaState().chamber;
      char.encounter = JSON.parse(JSON.stringify(DEFAULT_CHARACTER.encounter)); saveCharacter();
      openNavGroup('play'); renderPlay();
      const btn = q => document.querySelector('#panel-play button[onclick="' + q + '"]');
      const out = { explore: !!btn('playExploreChamber()') };
      const real = genChamber;
      genChamber = () => ({ appr: 'Shunned', type: 'Orc-nest', cond: 'Held by foes', chal: 'Combat' });
      btn('playExploreChamber()').click();
      out.band = !!(sagaState().chamber && sagaState().chamber.band);
      out.fightBtn = !!btn('playChamberFight()');
      out.said = /Orc-band/.test(document.getElementById('panel-play').textContent);
      btn('playChamberFight()').click();
      out.foes = enc().foes.length;
      out.fightOnPlay = !!document.querySelector('#play-fight #encounter-card-wrap');
      char.encounter = JSON.parse(JSON.stringify(DEFAULT_CHARACTER.encounter)); saveCharacter();
      openNavGroup('play'); renderPlay();
      genChamber = () => ({ appr: 'Ancient', type: 'Stairs', cond: 'Blocked', chal: 'Athletics' });
      btn('playExploreChamber()').click();
      out.meet = !!btn('playChamberChallenge()');
      btn('playChamberChallenge()').click();
      out.met = !!sagaState().chamber.met && !!btn('playExploreChamber()');
      genChamber = real;
      char.encounter = JSON.parse(JSON.stringify(DEFAULT_CHARACTER.encounter)); char.moriaMode = was; delete sagaState().chamber; saveCharacter(); render();
      return out;`);
    checks.push({ ok: !mch.err && mch.explore && mch.band && mch.fightBtn && mch.said && mch.foes >= 2 && mch.fightOnPlay && mch.meet && mch.met,
      msg: `in Moria, ▶ Play explores a location chamber by chamber; a Combat chamber rolls an Orc-band that can be fought, a skill chamber is rolled in place (${JSON.stringify(mch)})` });

    // A chamber reads as a sentence: no "test your Token of hope", no stray capitals mid-name.
    const cl = await safe(`return { hope: chamberLine({ appr: 'Austere', type: 'Guard Post or Armoury', cond: 'Shattered by earthquake', chal: 'Token of hope' }),
      skill: chamberLine({ appr: 'Ancient', type: 'Great Hall', cond: 'Mostly intact', chal: 'Lore' }) };`);
    checks.push({ ok: !cl.err && /guard post or armoury/.test(cl.hope) && !/test your Token/i.test(cl.hope) && /token of hope/.test(cl.hope) && /great hall/.test(cl.skill) && /test your Lore/.test(cl.skill),
      msg: `a chamber reads as a sentence — a token of hope is not a test, and the room type is lower case (${JSON.stringify(cl)})` });

    // Fleeing: getting clear of every foe ends the encounter; clear of one of two does not.
    const fl = await safe(`
      const foe = (id, n) => ({ id, name: n, endMax: 12, endCur: 12, parry: 3, armour: 1, might: 0, hateMax: 2, hateCur: 2, atkTN: 14,
        attacks: [{ name: 'sword', dice: 2, dmg: 4, inj: 14 }], fell: '', engaged: true, wounded: false, slain: false });
      const realRoll = window._doInlineRoll, realModal = window.showModal, realAlert = window.alert;
      window._doInlineRoll = () => ({ total: 20, outcome: 'SUCCESS', icons: 0, featValue: 10, featSpecial: null });
      window.showModal = async () => 'defensive'; window.alert = () => {};
      const out = {};
      char.encounter = JSON.parse(JSON.stringify(DEFAULT_CHARACTER.encounter)); char.encounter.active = true;
      char.encounter.foes = [foe('a', 'Orc'), foe('b', 'Goblin')]; saveCharacter();
      await flyYouFools();
      out.twoLeft = char.encounter.foes.length === 2 && char.encounter.active === true;
      char.encounter.foes = [foe('c', 'Orc')]; saveCharacter();
      await flyYouFools();
      out.oneEnded = !(char.encounter.foes || []).length;
      window._doInlineRoll = realRoll; window.showModal = realModal; window.alert = realAlert;
      return out;`);
    checks.push({ ok: !fl.err && fl.twoLeft && fl.oneEnded,
      msg: `a successful escape from every foe ends the encounter; getting clear of one while another is still on you does not (${JSON.stringify(fl)})` });

    // Moria: the Band shows on the hero sheet only once a Band exists, and only in Moria.
    const sb = await safe(`
      const was = char.moriaMode, wasBand = JSON.parse(JSON.stringify(char.band));
      const out = {};
      char.moriaMode = false; char.band.allies = [{ id: 'x1', name: 'Fundin', gift: 'Stout', injury: 'moderate', fatigue: '' }]; render();
      out.offMoria = !document.getElementById('sheet-band');
      char.moriaMode = true; char.band.allies = []; render();
      out.noBand = !document.getElementById('sheet-band');
      char.band.allies = [{ id: 'x1', name: 'Fundin', gift: 'Stout', injury: 'moderate', fatigue: '' }, { id: 'x2', name: 'Thrór', gift: 'Keen', outOfAction: true }];
      char.band.readiness = 4; render();
      const el = document.getElementById('sheet-band');
      const t = el ? el.textContent : '';
      out.shown = !!el && /Fundin/.test(t) && /Stout/.test(t) && /moderate injury/.test(t) && /Out of action/.test(t) && /Readiness\s*4/.test(t) && /Rally/.test(t) && t.includes('1/2');
      out.link = !!(el && el.querySelector('button[onclick*="band"]'));
      char.moriaMode = was; char.band = wasBand; saveCharacter(); render();
      return out;`);
    checks.push({ ok: !sb.err && sb.offMoria && sb.noBand && sb.shown && sb.link,
      msg: `the hero sheet shows the Band only in Moria and only once a Band is rolled — Readiness, Dispositions, each dwarf's Gift and state, and a link to the Band tab (${JSON.stringify(sb)})` });

    // Build is in the Hero group only while the hero is not built; afterwards it is reached on purpose.
    const bt = await safe(`
      const save = JSON.stringify(char);
      const vis = () => { const t = document.querySelector('.tab[data-tab="build"]'); return !!t && t.style.display !== 'none'; };
      const out = {};
      document.querySelector('.tab[data-tab="character"]').click();
      char.culture = ''; render(); refreshNav();
      out.blank = vis();
      char.culture = 'Bardings'; char.saga = Object.assign({}, char.saga || {}, { started: true }); render(); refreshNav();
      out.builtHidden = !vis();
      out.inMenu = !!document.querySelector('#menu-overlay button[onclick="openBuild()"]') && !!document.querySelector('#edit-build-row');
      openBuild();
      out.opens = document.querySelector('.tab.active') && document.querySelector('.tab.active').dataset.tab === 'build' && vis();
      document.querySelector('.tab[data-tab="character"]').click();
      out.leaves = !vis();
      Object.assign(char, JSON.parse(save)); saveCharacter(); render(); refreshNav();
      return out;`);
    checks.push({ ok: !bt.err && bt.blank && bt.builtHidden && bt.inMenu && bt.opens && bt.leaves,
      msg: `Build sits in the Hero group only until the hero is built; then Menu → Creation steps or Edit opens it, and it leaves the bar again afterwards (${JSON.stringify(bt)})` });

    // Moria: a planned mission is shown once applied — Band tab, hero sheet and Play — and can be ended with an outcome.
    const mi = await safe(`
      const save = JSON.stringify({ moria: char.moriaMode, band: char.band, mission: char.mission, saga: char.saga, ea: char.eyeAwareness, hm: char.huntMod, hr: char.huntRegion });
      const realModal = window.showModal;
      const out = {};
      char.moriaMode = true;
      char.band.allies = [{ id: 'y1', name: 'Nár', gift: 'Stout' }, { id: 'y2', name: 'Frár', gift: 'Keen' }];
      char.mission = { active: false, objective: 'Reclaim an important landmark', size: 'small', warGear: 'gearedForWar', specialisation: 'sentinels', prevOutcome: '', fpDuration: 'brief', roster: [] };
      render(); renderBand();
      out.before = !document.getElementById('mission-now');
      applyMissionSetup(true); renderBand();
      const cur = document.getElementById('m-current');
      out.band = !!cur && /Reclaim an important landmark/.test(cur.textContent) && /Small party, geared for war, Sentinels/.test(cur.textContent) && /2 dwarves/.test(cur.textContent);
      const sheet = document.getElementById('sheet-band');
      out.sheet = !!sheet && /Reclaim an important landmark/.test(sheet.textContent);
      char.saga = Object.assign({}, char.saga || {}, { started: true, ended: false }); renderPlay();
      const pm = document.querySelector('#panel-play .play-mission');
      out.play = !!pm && /Reclaim an important landmark/.test(pm.textContent);
      window.showModal = async () => 'qualified';
      await endMission();
      window.showModal = realModal;
      out.ended = char.mission.active === false && char.mission.prevOutcome === 'qualified' && !document.getElementById('mission-now');
      const o = JSON.parse(save);
      char.moriaMode = o.moria; char.band = o.band; char.mission = o.mission; char.saga = o.saga; char.eyeAwareness = o.ea; char.huntMod = o.hm; char.huntRegion = o.hr;
      saveCharacter(); render();
      return out;`);
    checks.push({ ok: !mi.err && mi.before && mi.band && mi.sheet && mi.play && mi.ended,
      msg: `a planned Moria mission shows once applied — objective, party and Band on the Band tab, the hero sheet and Play — and ending it records the outcome for the next plan (${JSON.stringify(mi)})` });

    // ▶ Play is the one screen: the tray rolls a skill or a Band Disposition in place, asks only about Hope / a Gift,
    // and tells the result in the story — the drawer stays shut until Details.
    const tr = await safe(`
      const save = JSON.stringify({ moria: char.moriaMode, band: char.band, saga: char.saga, hope: char.hopeCur });
      const realModal = window.showModal;
      const out = {};
      char.saga = Object.assign({}, char.saga || {}, { started: true, ended: false, step: 'haven' });
      char.hopeCur = 3; playClearFeed(); closeRollDrawer();
      document.querySelector('.bn-item[data-group="play"]').click(); renderPlay();
      out.tray = !!document.getElementById('play-tray') && document.querySelectorAll('#play-tray .pt-cols .pt-roll').length === 18;
      window.showModal = async (o) => { const b = document.getElementById('styled-modal-body'); b.innerHTML = o.message || ''; const h = document.getElementById('rp-hope'); if (h) h.checked = true; return true; };
      await playTrayRoll('Awareness');
      out.hopeSpent = char.hopeCur === 2;
      const feed = document.querySelector('#panel-play .play-feed');
      out.inFeed = !!feed && /Awareness/.test(feed.textContent) && !!feed.querySelector('.roll-pill') && !!feed.querySelector('.pt-details');
      out.drawerShut = !document.getElementById('roll-drawer').classList.contains('open');
      char.moriaMode = true; char.band.allies = [{ id: 'z1', name: 'Grór', gift: 'Stout' }]; char.band.dispositions = { expertise: 2, manoeuvre: 2, rally: 2, vigilance: 2, war: 3 };
      renderPlay(); setTraySide('band');
      out.bandSide = document.querySelectorAll('#play-tray .pt-disp').length === 5;
      await playBandRoll('war');
      out.bandFeed = /Band War/.test(document.querySelector('#panel-play .play-feed').textContent);
      window.showModal = async () => 'painful';
      await playBandTest('endurance');
      out.endFeed = /Endurance test/.test(document.querySelector('#panel-play .play-feed').textContent);
      window.showModal = realModal;
      const o = JSON.parse(save); char.moriaMode = o.moria; char.band = o.band; char.saga = o.saga; char.hopeCur = o.hope;
      _traySide = 'hero'; saveCharacter(); render();
      return out;`);
    checks.push({ ok: !tr.err && tr.tray && tr.hopeSpent && tr.inFeed && tr.drawerShut && tr.bandSide && tr.bandFeed && tr.endFeed,
      msg: `▶ Play's roll tray rolls a skill (with an optional Hope spend) and the Band's Dispositions and tests in place, and tells each result in the story (${JSON.stringify(tr)})` });

    // Look things up without leaving Play: the header name opens the hero sheet over the page, the Band chip the Band;
    // a skill tapped there rolls into Play's story.
    const pk = await safe(`
      const save = JSON.stringify({ moria: char.moriaMode, band: char.band, saga: char.saga, hope: char.hopeCur });
      const out = {};
      char.saga = Object.assign({}, char.saga || {}, { started: true, ended: false, step: 'haven' });
      char.hopeCur = 0; playClearFeed(); closeRollDrawer();
      char.moriaMode = true; char.band.allies = [{ id: 'q1', name: 'Bofri', gift: 'Stout' }]; saveCharacter(); render();
      document.querySelector('.bn-item[data-group="play"]').click(); renderPlay();
      window.scrollTo(0, 0); if (typeof setSlimHeader === 'function') setSlimHeader(false);
      document.getElementById('char-name').click();
      const ov = document.getElementById('peek-overlay');
      out.hero = ov.classList.contains('show') && document.querySelectorAll('#peek-body .s-skill').length >= 18;
      out.stillPlay = document.querySelector('.tab.active').dataset.tab === 'play';
      const pill = document.getElementById('band-pill');
      out.pill = !!pill && !pill.hidden && pill.textContent.includes('1/1');
      [...document.querySelectorAll('#peek-body .s-skill')].find(b => /Awareness/.test(b.textContent)).click();
      await new Promise(r => setTimeout(r, 50));
      out.closed = !ov.classList.contains('show');
      out.rolledIntoPlay = /Awareness/.test((document.querySelector('#panel-play .play-feed') || {}).textContent || '');
      out.drawerShut = !document.getElementById('roll-drawer').classList.contains('open');
      pill.click();
      out.band = ov.classList.contains('show') && /Bofri/.test(document.getElementById('peek-body').textContent);
      closePeek();
      const o = JSON.parse(save); char.moriaMode = o.moria; char.band = o.band; char.saga = o.saga; char.hopeCur = o.hope; saveCharacter(); render();
      out.pillGone = document.getElementById('band-pill').hidden === !(o.moria && (o.band.allies || []).length);
      return out;`);
    checks.push({ ok: !pk.err && pk.hero && pk.stillPlay && pk.pill && pk.closed && pk.rolledIntoPlay && pk.drawerShut && pk.band && pk.pillGone,
      msg: `the header name opens the hero sheet over Play (a skill tapped there rolls into the story), and in Moria a Band chip opens the Band (${JSON.stringify(pk)})` });

    // A Moria Battle is led from ▶ Play too, and its card goes home when the battle is over.
    const bat = await safe(`
      const save = JSON.stringify({ moria: char.moriaMode, battle: char.battle, saga: char.saga });
      const out = {};
      char.moriaMode = true; char.saga = Object.assign({}, char.saga || {}, { started: true, ended: false });
      char.battle = Object.assign({}, char.battle || {}, { active: true, foeResistance: 9, foeResMax: 9, foeMight: 2, round: 1, log: [], advantages: [], complications: [] });
      saveCharacter(); render(); openNavGroup('play'); renderPlay();
      out.onPlay = !!document.querySelector('#play-fight #battle-active-card') && /A battle/.test(document.querySelector('#play-body').textContent);
      document.querySelector('.tab[data-tab="battle"]') && (document.querySelector('.tab[data-tab="battle"]').style.display = '');
      document.querySelector('.tab[data-tab="battle"]').click();
      out.homeOnTab = !!document.querySelector('#panel-battle #battle-active-card');
      openNavGroup('play'); renderPlay();
      char.battle.active = false; renderBattle(); await new Promise(r => setTimeout(r, 30));
      out.backToStory = !document.querySelector('#play-fight #battle-active-card') && !!document.querySelector('#play-body .play-scene');
      const o = JSON.parse(save); char.moriaMode = o.moria; char.battle = o.battle; char.saga = o.saga; saveCharacter(); render();
      return out;`);
    checks.push({ ok: !bat.err && bat.onPlay && bat.homeOnTab && bat.backToStory,
      msg: `a Moria Battle is led from ▶ Play; the Battle tab still has it when opened, and the story comes back when it ends (${JSON.stringify(bat)})` });

    // Councils, Skill Endeavours and the Fellowship Phase are scenes on ▶ Play: set up, rolled and finished there.
    const scn = await safe(`
      const save = JSON.stringify({ council: char.council, se: char.skillEndeavour, saga: char.saga, moria: char.moriaMode, fpw: char.fpWizardState });
      const out = {};
      char.saga = Object.assign({}, char.saga || {}, { started: true, ended: false, step: 'location', scene: null });
      char.council = JSON.parse(JSON.stringify(DEFAULT_CHARACTER.council)); saveCharacter(); render();
      openNavGroup('play'); renderPlay();
      playCouncil('council');
      out.setupOnPlay = document.querySelector('.tab.active').dataset.tab === 'play' && !!document.querySelector('#play-fight #council-setup-card') && document.getElementById('council-setup-card').style.display !== 'none';
      document.getElementById('c-topic').value = 'Ask the warden for a guide';
      startCouncil(); renderPlay();
      out.activeOnPlay = !!document.querySelector('#play-fight #council-active-card') && document.getElementById('council-active-card').style.display !== 'none';
      finalizeCouncil('success'); renderPlay(); await new Promise(r => setTimeout(r, 20));
      const back = [...document.querySelectorAll('#play-body button')].find(b => /^Back to the story$/.test(b.textContent.trim()));
      out.back = !!back; back && back.click();
      out.home = !!document.querySelector('#panel-council #council-active-card') && !!document.querySelector('#play-body .play-scene');
      // the Fellowship Phase opens on Play, not as a pop-up
      char.moriaMode = false; char.fpWizardState = null; saveCharacter();
      await playFellowship();
      out.fpOnPlay = !!document.querySelector('#play-fight #fp-wizard-box') && !document.getElementById('fp-wizard-overlay').classList.contains('show');
      fpClose(); renderPlay();
      out.fpHome = !!document.querySelector('#fp-wizard-overlay #fp-wizard-box') && !(char.saga.scene);
      const o = JSON.parse(save); char.council = o.council; char.skillEndeavour = o.se; char.saga = o.saga; char.moriaMode = o.moria; char.fpWizardState = o.fpw; saveCharacter(); render();
      return out;`);
    checks.push({ ok: !scn.err && scn.setupOnPlay && scn.activeOnPlay && scn.back && scn.home && scn.fpOnPlay && scn.fpHome,
      msg: `a Council is set up, rolled and finished on ▶ Play and then the story comes back; the Fellowship Phase opens on Play, not as a pop-up (${JSON.stringify(scn)})` });

    // The setup tabs say when what they hold is being played on ▶ Play, and take you back there.
    const opb = await safe(`
      const save = JSON.stringify({ enc: char.encounter, saga: char.saga });
      const out = {};
      char.saga = Object.assign({}, char.saga || {}, { started: true, ended: false, scene: null });
      char.encounter = { active: true, round: 1, foes: [{ id: 'b1', name: 'Orc', endCur: 8, endMax: 8, hateCur: 2, hateMax: 2, parry: 2, armour: 1, slain: false, engaged: true, attacks: [] }], weaponIdx: 0, adv: {} };
      saveCharacter(); render(); openNavGroup('adventure'); document.querySelector('.tab[data-tab="combat"]').click();
      const ban = document.querySelector('#panel-combat > .on-play');
      out.banner = !!ban && /▶ Play/.test(ban.textContent) && !!document.querySelector('#panel-combat #encounter-card-wrap');
      ban && ban.querySelector('button').click();
      out.back = document.querySelector('.tab.active').dataset.tab === 'play' && !!document.querySelector('#play-fight #encounter-card-wrap');
      const o = JSON.parse(save); char.encounter = o.enc; char.saga = o.saga; saveCharacter(); render();
      document.querySelector('.tab[data-tab="combat"]').click();
      out.goneWhenOver = !document.querySelector('#panel-combat > .on-play');
      return out;`);
    checks.push({ ok: !opb.err && opb.banner && opb.back && opb.goneWhenOver,
      msg: `the Combat tab says a fight is being fought on ▶ Play and takes you back there; the note goes when the fight is over (${JSON.stringify(opb)})` });

    // RAW: at 0 Endurance a hero drops unconscious — no attack, no flight; a foe hits automatically and
    // only a Protection test stands between them and a Wound. A second Wound makes them Dying; a HEALING
    // roll saves them; otherwise they come round at 1 Endurance.
    const ko = await safe(`
      const save = JSON.stringify(char);
      const realRoll = window._doInlineRoll, realProt = window._protectionRoll, realSev = window.rollWoundSeverity, realAlert = window.alert, realModal = window.showModal;
      window.alert = () => {}; window.showModal = async () => true;
      const foe = { id: 'k1', name: 'Orc', endMax: 12, endCur: 12, parry: 2, armour: 1, might: 0, hateMax: 2, hateCur: 2, atkTN: 14,
        attacks: [{ name: 'scimitar', dice: 2, dmg: 4, inj: 16 }], fell: '', engaged: true, wounded: false, slain: false };
      char.saga = Object.assign({}, char.saga || {}, { started: true, ended: false });
      char.encounter = { active: true, round: 1, turn: 'hero', foes: [foe], weaponIdx: 0, adv: {} };
      char.endCur = 0; char.wounded = false; char.dying = false; saveCharacter(); render();
      const out = {};
      await heroAttackFoe('k1');
      out.noAttack = enc().foes[0].endCur === 12;
      const before = char.flyPending;
      await flyYouFools(); out.noFlee = (char.encounter.foes || []).length === 1;
      let rolled = 0; window._doInlineRoll = (...a) => { rolled++; return realRoll(...a); };
      window._protectionRoll = () => ({ total: 3, outcome: 'FAIL', isAutoSuccess: false, isAutoFail: false });
      window.rollWoundSeverity = () => ({ label: 'Severe Injury', detail: '3 days', days: 3, kind: 'severe' });
      enc().turn = 'foes';
      await foeAttackHero('k1', 0);
      out.autoHit = rolled === 0 && char.wounded === true && !char.dying;
      enc().foes[0].acted = false; enc().turn = 'foes';
      await foeAttackHero('k1', 0);
      out.secondWoundDying = char.dying === true && heroDying();
      renderPlay();
      out.dyingChoices = !!document.querySelector('#panel-play button[onclick="playFirstAid()"]') && !!document.querySelector('#panel-play button[onclick="sagaEnd()"]');
      window._doInlineRoll = () => ({ total: 20, outcome: 'SUCCESS', icons: 0, featValue: 10, featSpecial: null });
      await playFirstAid();
      out.saved = !char.dying && char.endCur === 1 && char.wounded === true;
      char.endCur = 0; char.dying = false; char.encounter = JSON.parse(JSON.stringify(DEFAULT_CHARACTER.encounter)); saveCharacter(); renderPlay();
      out.comeRoundOffered = !!document.querySelector('#panel-play button[onclick="heroComeRound()"]');
      heroComeRound(); out.cameRound = char.endCur === 1;
      window._doInlineRoll = realRoll; window._protectionRoll = realProt; window.rollWoundSeverity = realSev; window.alert = realAlert; window.showModal = realModal;
      Object.assign(char, JSON.parse(save)); saveCharacter(); render();
      return out;`);
    checks.push({ ok: !ko.err && ko.noAttack && ko.noFlee && ko.autoHit && ko.secondWoundDying && ko.dyingChoices && ko.saved && ko.comeRoundOffered && ko.cameRound,
      msg: `at 0 Endurance the hero is unconscious: cannot attack or flee, a foe hits without a roll (Protection decides the Wound), a second Wound is Dying, HEALING saves them, otherwise they come round at 1 Endurance (${JSON.stringify(ko)})` });

    // RAW: an adversary reads the Feat die the other way round — the Eye is its best (automatic success,
    // a Piercing Blow), the Rune counts 0.
    const fd = await safe(`
      const real = window.rollFeatOnce; let next = null;
      window.rollFeatOnce = () => next;
      next = { label: '👁', value: 0, special: 'eye' }; const eye = _doInlineRoll(0, 'normal', 30, null, { foe: true });
      next = { label: 'ᚱ', value: 11, special: 'rune' }; const rune = _doInlineRoll(0, 'normal', 1, null, { foe: true });
      next = { label: 'ᚱ', value: 11, special: 'rune' }; const heroRune = _doInlineRoll(0, 'normal', 30, null);
      next = { label: '👁', value: 0, special: 'eye' }; const prot = _foeProtectionRoll({ armour: 0 }, 30);
      window.rollFeatOnce = real;
      return { eyeWins: eye.outcome.startsWith('SUCCESS'), runeZero: rune.total === 0 && rune.outcome === 'FAIL', heroRuneWins: heroRune.outcome.startsWith('SUCCESS'), protEye: prot.outcome.startsWith('SUCCESS') };`);
    checks.push({ ok: !fd.err && fd.eyeWins && fd.runeZero && fd.heroRuneWins && fd.protEye,
      msg: `a foe's Eye is its automatic success and its Rune counts 0 (a hero's Rune still wins); a foe's Protection succeeds on the Eye (${JSON.stringify(fd)})` });

    // Fatigue: any night somewhere sheltered and safe off the road lifts 1; a Fellowship Phase lifts all.
    const fat = await safe(`
      const save = JSON.stringify({ fat: char.fatigue, saga: char.saga, j: char.journey, end: char.endCur });
      const realModal = window.showModal, realAlert = window.alert; window.alert = () => {};
      char.saga = Object.assign({}, char.saga || {}, { started: true, ended: false, step: 'location' });
      char.journey = Object.assign({}, char.journey || {}, { active: false });
      char.fatigue = 3; saveCharacter();
      let asked = '';
      window.showModal = async (o) => { asked = (o.buttons || []).map(b => b.label).join('|'); return 'haven'; };
      await playRest();
      const out = { inn: char.fatigue === 2 && /sheltered and safe/i.test(asked) };
      char.fatigue = 4; saveCharacter();
      out.fpLabel = /Fellowship Phase clears it all/.test(hintRow('Fatigue')[1] || '');
      const realConf = window.confirmStyled; window.confirmStyled = async () => true;
      const wasMoria = char.moriaMode; char.moriaMode = false; char.fpWizardState = null;
      openFPWizard(true); fpState.recoveryApplied = true; fpState.selectedUndertakings = [];
      await fpComplete();
      out.fpClears = (parseInt(char.fatigue) || 0) === 0;
      window.confirmStyled = realConf; char.moriaMode = wasMoria;
      document.getElementById('fp-wizard-overlay').classList.remove('show');
      window.showModal = realModal; window.alert = realAlert;
      const o = JSON.parse(save); char.fatigue = o.fat; char.saga = o.saga; char.journey = o.j; char.endCur = o.end; saveCharacter(); render();
      return out;`);
    checks.push({ ok: !fat.err && fat.inn && fat.fpLabel && fat.fpClears,
      msg: `a night somewhere sheltered and safe off the road (not only a Safe Haven) lifts 1 Fatigue, and finishing a Fellowship Phase clears it all (${JSON.stringify(fat)})` });

    checks.push({ ok: errors.length === 0, msg: `0 page errors (got ${errors.length}${errors.length ? ': ' + errors[0] : ''})` });
    await context.close();
    return { checks };
  }
};
