// design — the 2026-09-27 UX/UI redesign. Every check asserts what a player SEES or can DO
// (GOTCHA 20), not the mechanism: which controls are on screen, what a tap changes, what text
// a dialog button carries. Each was proven to fail with its fix reverted.
module.exports = {
  name: 'design',
  async run({ browser, baseUrl, newPage }) {
    const checks = [];
    const { context, page, errors } = await newPage(browser, baseUrl + '/character-tracker.html');
    await page.setViewportSize({ width: 390, height: 844 });

    const hero = () => page.evaluate(() => {
      char = JSON.parse(JSON.stringify(DEFAULT_CHARACTER));
      Object.assign(char, { culture: 'Bardings', calling: 'Warden', strRating: 5, strTN: 15,
        hrtRating: 4, hrtTN: 16, witRating: 3, witTN: 17, endMax: 25, endCur: 20, parry: 3,
        hopeMax: 10, hopeCur: 8, shadow: 2, name: 'Beran', safeHaven: 'Lake-town', valour: 1, wisdom: 1,
        skills: { Travel: { rating: 2 }, Awareness: { rating: 2 } }, profs: { Swords: 2, Bows: 0, Axes: 0, Spears: 0 } });
      saveCharacter(); render(); refreshStriderUI();
    });
    await hero();

    // ---- Navigation: five groups, a tab lives inside its group ----
    const nav = await page.evaluate(() => {
      const vis = el => !!(el.offsetWidth || el.offsetHeight);
      const groups = [...document.querySelectorAll('.bn-item')].filter(vis).length;
      const topTabsOnPlay = [...document.querySelectorAll('.tab')].filter(vis).length;
      document.querySelector('.bn-item[data-group="hero"]').click();
      const heroTabs = [...document.querySelectorAll('.tab')].filter(vis).map(t => t.dataset.tab);
      const heroActive = document.querySelector('.bn-item.active')?.dataset.group;
      const journalLabel = document.querySelector('.bn-item[data-group="journal"]').innerText.trim();
      return { groups, topTabsOnPlay, heroTabs, heroActive, journalLabel };
    });
    checks.push({ ok: nav.groups === 5, msg: `bottom bar shows 5 groups, not 14 tabs (got ${nav.groups})` });
    checks.push({ ok: nav.topTabsOnPlay === 0, msg: `Play shows no sub-tab strip (got ${nav.topTabsOnPlay})` });
    checks.push({ ok: nav.heroActive === 'hero' && nav.heroTabs.join() === 'character,gear,build', msg: `Hero group shows only its own sub-tabs (${nav.heroTabs.join(',')})` });
    checks.push({ ok: nav.journalLabel === 'Rules', msg: `Journal group reads "Rules" when there is no Chronicle (got "${nav.journalLabel}")` });

    // ---- Vitals bar: on every tab, true numbers, tap to adjust through adj() ----
    const hud = await page.evaluate(() => {
      document.querySelector('.bn-item[data-group="roll"]').click();
      const shown = document.getElementById('hud').offsetHeight > 0;
      const endTxt = document.getElementById('hud-end').innerText.replace(/\s+/g, ' ');
      const chips = document.getElementById('hud-chips').innerText;
      document.querySelector('.hud-main').click();
      const sheetOpen = document.getElementById('vitals-overlay').classList.contains('show');
      const upBtn = document.querySelector('#vitals-body button[aria-label="Endurance up"]');
      const before = char.endCur; upBtn.click();
      const after = char.endCur;
      const shownNow = document.querySelector('#vitals-body .v-num').innerText;
      closeVitals();
      return { shown, endTxt, chips, sheetOpen, before, after, shownNow };
    });
    checks.push({ ok: hud.shown && /20\s*\/\s*25/.test(hud.endTxt), msg: `vitals bar shows Endurance 20/25 on the Roll tab (got "${hud.endTxt}")` });
    checks.push({ ok: /Shadow 2/.test(hud.chips), msg: `vitals bar shows Shadow (got "${hud.chips}")` });
    checks.push({ ok: hud.sheetOpen && hud.after === hud.before + 1 && /^21/.test(hud.shownNow), msg: `tapping the bar opens a sheet whose + raises Endurance (${hud.before}→${hud.after}, shows ${hud.shownNow})` });
    const blankHud = await page.evaluate(() => {
      const keep = char; char = JSON.parse(JSON.stringify(DEFAULT_CHARACTER)); render();
      const h = document.getElementById('hud').offsetHeight; char = keep; saveCharacter(); render(); return h;
    });
    checks.push({ ok: blankHud === 0, msg: 'vitals bar stays hidden until a hero exists' });

    // ---- Hand-edit mode: Valour cannot be bumped by accident ----
    const adjm = await page.evaluate(() => {
      document.querySelector('.bn-item[data-group="hero"]').click();
      document.querySelector('.tab[data-tab="character"]').click();
      const b = document.querySelector('button[onclick="adj(\'valour\',1)"]');
      const hiddenByDefault = getComputedStyle(b).display === 'none';
      document.querySelector('.adjust-toggle').click();
      const shownInMode = getComputedStyle(b).display !== 'none';
      document.querySelector('.tab[data-tab="gear"]').click();
      const offAfterLeaving = getComputedStyle(b).display === 'none';
      return { hiddenByDefault, shownInMode, offAfterLeaving };
    });
    checks.push({ ok: adjm.hiddenByDefault, msg: 'Valour +/− is hidden unless "Fix a number by hand" is on' });
    checks.push({ ok: adjm.shownInMode && adjm.offAfterLeaving, msg: 'hand-edit mode reveals the raw counters and switches off on leaving the tab' });

    // ---- Dialogs say what they do ----
    const dlg = await page.evaluate(async () => {
      const read = () => [...document.querySelectorAll('#styled-modal-buttons button')].map(b => b.textContent);
      const p1 = confirmStyled('Test?'); await new Promise(r => setTimeout(r, 30));
      const generic = read(); document.querySelector('#styled-modal-buttons button:last-child').click(); await p1;
      // A real call site: abandoning a journey.
      char.journey = Object.assign(char.journey || {}, { active: true, totalHexes: 4, currentHex: 1 });
      const fnName = typeof endJourney === 'function' ? 'endJourney' : null;
      let site = [];
      if (fnName) { const p = window[fnName](); await new Promise(r => setTimeout(r, 30)); site = read(); document.querySelector('#styled-modal-buttons button:last-child').click(); await p; }
      return { generic, site };
    }).catch(e => ({ generic: [], site: [], err: e.message }));
    checks.push({ ok: dlg.generic.length === 2 && !dlg.generic.some(l => /^(OK|Cancel)$/.test(l)), msg: `a confirmation never offers bare OK/Cancel (got ${dlg.generic.join(' | ')})` });
    checks.push({ ok: dlg.site.some(l => /Abandon journey/.test(l)) && dlg.site.some(l => /Keep travelling/.test(l)), msg: `abandoning a journey offers "Abandon journey" / "Keep travelling" (got ${dlg.site.join(' | ') || dlg.err})` });

    // ---- Short rest just happens, with Undo ----
    const rest = await page.evaluate(async () => {
      char.endCur = 10; char.wounded = false; char.shortRestUsedToday = false; saveCharacter(); render();
      let dialogs = 0; const om = window.showModal; window.showModal = async () => { dialogs++; return false; };
      await takeShortRest(); window.showModal = om;
      const after = char.endCur;
      const undo = [...document.querySelectorAll('.toast-action')].pop();
      const hasUndo = !!undo && /Undo/.test(undo.textContent);
      if (undo) undo.click();
      return { dialogs, after, hasUndo, undone: char.endCur };
    });
    checks.push({ ok: rest.dialogs === 0 && rest.after === 15, msg: `Short Rest applies without a dialog (dialogs ${rest.dialogs}, End ${rest.after})` });
    checks.push({ ok: rest.hasUndo && rest.undone === 10, msg: `…and its toast's Undo puts it back (End ${rest.undone})` });

    // ---- One-time tips ----
    const tips = await page.evaluate(() => {
      localStorage.removeItem('tor2e-tips'); initTips();
      const intro = document.querySelector('#panel-dice .tab-intro');
      intro.querySelector('.tip-dismiss').click();
      const hidden = getComputedStyle(intro).display === 'none';
      const stored = !!(JSON.parse(localStorage.getItem('tor2e-tips') || '{}')['panel-dice']);
      return { hidden, stored };
    });
    await page.reload(); await page.waitForTimeout(600);
    const tipsAfter = await page.evaluate(() => {
      const a = getComputedStyle(document.querySelector('#panel-dice .tab-intro')).display === 'none';
      resetTips();
      const b = getComputedStyle(document.querySelector('#panel-dice .tab-intro')).display !== 'none';
      return { staysHidden: a, resetShows: b, introCount: document.querySelectorAll('.panel .tab-intro').length };
    });
    checks.push({ ok: tips.hidden && tips.stored && tipsAfter.staysHidden, msg: '"Got it" hides a tab tip and it stays hidden after a reload' });
    checks.push({ ok: tipsAfter.resetShows, msg: '"Show the tips again" brings them back' });
    await hero();

    // ---- Menu: short, plain, no developer text ----
    const menu = await page.evaluate(() => {
      toggleMenu();
      const m = document.querySelector('#menu-overlay .menu');
      // checkVisibility, not offsetWidth: children of a closed <details> keep a layout box in
      // Chromium (content-visibility:hidden) yet are not on screen.
      const vis = el => el.checkVisibility ? el.checkVisibility() : !!(el.offsetWidth || el.offsetHeight);
      const topLevel = [...m.querySelectorAll(':scope > button')].filter(vis).length;
      const visible = [...m.querySelectorAll('button')].filter(vis).length;
      const text = m.innerText;
      toggleMenu();
      return { topLevel, visible, firebase: /Firebase|file:\/\//.test(text), emoji: /[\u{1F300}-\u{1FAFF}]/u.test(text) };
    });
    checks.push({ ok: menu.visible <= 8, msg: `menu opens with ≤ 8 visible buttons (got ${menu.visible})` });
    checks.push({ ok: !menu.firebase, msg: 'menu shows no developer text (Firebase / file://)' });
    checks.push({ ok: !menu.emoji, msg: 'menu rows carry no emoji' });

    // ---- No rulebook page citations in what a player reads ----
    const cites = await page.evaluate(() => {
      const bad = [];
      document.querySelectorAll('.panel:not(#panel-reference)').forEach(p => {
        const m = p.textContent.match(/(RAW p\.\s?\d+|Core Rules p\.\s?\d+|\(RAW\))/);
        if (m) bad.push(p.id + ': ' + m[0]);
      });
      return bad;
    });
    checks.push({ ok: cites.length === 0, msg: `no "RAW p.NN"/"Core Rules p.NN" on any tab (found: ${cites.join('; ') || 'none'})` });

    // ---- Build wizard ----
    const bw = await page.evaluate(() => {
      localStorage.removeItem('tor2e-buildall');
      document.querySelector('.tab[data-tab="build"]').click(); buildGoStep(0);
      const vis = id => { const c = document.getElementById(id); return !!c && getComputedStyle(c).display !== 'none'; };
      const step1 = vis('quick-build-card') && !vis('favoured-card') && !vis('virtues-card');
      [...document.querySelectorAll('#build-step-nav button')].find(b => /Next/.test(b.textContent)).click();
      const step2 = vis('combat-profs-card') && !vis('quick-build-card');
      requireStep('x', 'build', 'virtues-card', 't');
      const jumped = vis('virtues-card');
      document.querySelectorAll('#styled-modal-overlay.show #styled-modal-buttons button').forEach(b => b.click());
      toggleBuildShowAll();
      const all = vis('quick-build-card') && vis('favoured-card') && vis('virtues-card');
      toggleBuildShowAll();
      return { step1, step2, jumped, all };
    });
    checks.push({ ok: bw.step1 && bw.step2, msg: 'Build shows one step at a time and Next moves on' });
    checks.push({ ok: bw.all, msg: '"Show every step" restores the long Build page' });

    // ---- Reference collapsed by default; a search opens matches ----
    const ref = await page.evaluate(() => {
      document.querySelector('.tab[data-tab="reference"]').click();
      document.getElementById('ref-filter').value = ''; renderReference();
      const closed = [...document.querySelectorAll('#reference-body details')].every(d => !d.open);
      document.getElementById('ref-filter').value = 'weary'; renderReference();
      const opened = /Weary/.test(document.getElementById('reference-body').innerText);
      document.getElementById('ref-filter').value = ''; renderReference();
      return { closed, opened };
    });
    checks.push({ ok: ref.closed && ref.opened, msg: 'Reference groups start collapsed and a search opens the matches' });

    // ---- Lifepath "lower a TN" survives a recompute (it used to write the TN directly) ----
    const tn = await page.evaluate(async () => {
      char.tnAdjust = { str: 0, hrt: 0, wit: 0 }; recomputeAttrTNs(); saveCharacter();
      const before = char.witTN;
      const om = window.showModal, oc = window.confirmStyled;
      window.showModal = async () => 'wit'; window.confirmStyled = async () => true;
      await applyMajorEvent(3);               // 'grim': Heart TN +1, lower another TN by 1 → Wits
      window.showModal = om; window.confirmStyled = oc;
      recomputeAttrTNs();                     // what any later toggle / attribute change does
      return { before, after: char.witTN, applied: true, adj: char.tnAdjust && char.tnAdjust.wit };
    });
    checks.push({ ok: tn.after === tn.before - 1 && tn.adj === -1, msg: `a Lifepath "lower a TN" survives the next recompute (TN ${tn.before}→${tn.after}, adjust ${tn.adj}, driven: ${tn.applied})` });

    // ---- Attribute TN is not clipped; the display font is loaded ----
    const look = await page.evaluate(async () => {
      document.querySelector('.tab[data-tab="character"]').click();
      const i = document.querySelector('input[data-field="strTN"]');
      await document.fonts.ready;
      return { fits: i.scrollWidth <= i.clientWidth + 1, font: document.fonts.check('600 20px "EB Garamond"') };
    });
    checks.push({ ok: look.fits, msg: 'Attribute TN fits its box (a two-digit TN used to render as "1")' });
    checks.push({ ok: look.font, msg: 'the display face (EB Garamond) loads from the bundled file' });

    // ---- Dice feel ----
    const dice = await page.evaluate(() => {
      document.querySelector('.tab[data-tab="dice"]').click();
      diceState.success = 2; rollDice('Travel');
      const r = document.getElementById('roll-result');
      return { tumble: document.getElementById('result-dice').classList.contains('dice-tumble'),
               tinted: r.classList.contains('res-success') || r.classList.contains('res-fail') };
    });
    checks.push({ ok: dice.tumble && dice.tinted, msg: 'a roll animates its dice and tints the result by outcome' });

    // ---- Only the stance-matching Combat Task is offered ----
    const ct = await page.evaluate(() => {
      char.stance = 'forward'; renderCombatTasks();
      const vis = [...document.querySelectorAll('#combat-tasks-card button[data-task]')].filter(b => b.style.display !== 'none');
      return vis.map(b => b.dataset.stanceReq);
    });
    checks.push({ ok: ct.length === 1 && ct[0] === 'forward', msg: `only the task your stance allows is shown (got ${ct.join(',')})` });

    // ---- Tablet: hero-at-a-glance beside Play ----
    await page.setViewportSize({ width: 1180, height: 820 });
    const wide = await page.evaluate(() => {
      char.saga = Object.assign(char.saga || {}, { started: true, premise: 'x' }); saveCharacter();
      openNavGroup('play'); renderPlay();
      const a = document.getElementById('play-aside');
      return { shown: a.offsetWidth > 0, hasTN: /TN 15/.test(a.innerText), rail: getComputedStyle(document.getElementById('bottom-nav')).flexDirection };
    });
    await page.setViewportSize({ width: 390, height: 844 });
    const narrow = await page.evaluate(() => document.getElementById('play-aside').offsetWidth);
    checks.push({ ok: wide.shown && wide.hasTN && narrow === 0, msg: 'on a tablet, Play shows the hero at a glance (hidden on phones)' });
    checks.push({ ok: wide.rail === 'column', msg: `on a tablet the nav is a side rail (flex-direction ${wide.rail})` });

    // ================= ROUND 2 (audit 2) =================
    await hero();
    // ---- Pickers: no text squeezed into a sliver (the leaked .menu flex rule did exactly this) ----
    const squeeze = await page.evaluate(async () => {
      const bad = [];
      const scan = (name) => {
        const m = [...document.querySelectorAll('.menu-overlay.show .menu')].pop(); if (!m) { bad.push(name + ': not open'); return; }
        m.querySelectorAll('strong, span, small, b').forEach(el => {
          const t = (el.textContent || '').trim(); if (t.length < 14 || !el.checkVisibility()) return;
          if (el.closest('svg')) return;
          const w = el.getBoundingClientRect().width;
          if (w > 0 && w < 70) bad.push(`${name}: "${t.slice(0, 24)}" is ${Math.round(w)}px wide`);
        });
        document.querySelectorAll('.menu-overlay.show').forEach(o => o.classList.remove('show'));
      };
      openPregens(); scan('pregens');
      openRoster(); scan('roster');
      openBestiary(); scan('bestiary');
      char.advPts = 12; openSpendXP('adv'); scan('spend-xp');
      openWeaponPicker(); scan('weapons');
      return bad;
    });
    checks.push({ ok: squeeze.length === 0, msg: `no picker squeezes its text into a sliver (${squeeze.slice(0, 3).join('; ') || 'none'})` });

    // ---- Contrast: primary buttons and body text clear 4.5:1 in every theme ----
    const contrast = await page.evaluate(() => {
      const lum = c => { const m = c.match(/[\d.]+/g).map(Number); const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(m[0]) + .7152 * f(m[1]) + .0722 * f(m[2]); };
      const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
      const probe = document.createElement('div'); document.body.appendChild(probe);
      probe.innerHTML = '<button class="btn">Go</button><div class="card"><span class="t1">ink</span><span class="t2">muted</span></div>';
      const out = {};
      for (const th of ['light', 'dark', 'sepia', 'hc']) {
        if (th === 'light') localStorage.removeItem('tor2e-theme'); else localStorage.setItem('tor2e-theme', th);
        document.body.classList.remove('dark', 'theme-sepia', 'theme-hc'); if (typeof applyTheme === 'function') applyTheme();
        if (th === 'light') document.body.classList.remove('dark');
        const b = probe.querySelector('.btn'), card = probe.querySelector('.card');
        const cs = getComputedStyle(b), cc = getComputedStyle(card);
        out[th] = { btn: +ratio(cs.color, cs.backgroundColor).toFixed(2),
                    ink: +ratio(getComputedStyle(probe.querySelector('.t1')).color, cc.backgroundColor).toFixed(2) };
        probe.querySelector('.t2').style.color = 'var(--text-muted)';
        out[th].muted = +ratio(getComputedStyle(probe.querySelector('.t2')).color, cc.backgroundColor).toFixed(2);
      }
      probe.remove(); localStorage.removeItem('tor2e-theme'); document.body.classList.remove('dark', 'theme-sepia', 'theme-hc'); applyTheme();
      return out;
    });
    const lowC = Object.entries(contrast).filter(([, v]) => v.btn < 4.5 || v.ink < 4.5 || v.muted < 4.5).map(([k, v]) => `${k} ${JSON.stringify(v)}`);
    checks.push({ ok: lowC.length === 0, msg: `buttons, body and muted text clear 4.5:1 in all four themes (${lowC.join('; ') || JSON.stringify(contrast.dark)})` });

    // ---- Hero sheet: one screen of read-only values; Edit opens the form, Done closes it ----
    const sheet = await page.evaluate(() => {
      document.querySelector('.bn-item[data-group="hero"]').click();
      document.querySelector('.tab[data-tab="character"]').click();
      const hs = document.getElementById('hero-sheet'), form = document.getElementById('char-edit');
      const r = { crest: !!hs.querySelector('svg.crest'), tn: /TN 15/.test(hs.innerText), skills: hs.querySelectorAll('.s-skill').length,
                  formHidden: getComputedStyle(form).display === 'none', sheetInputs: hs.querySelectorAll('input, textarea, select').length };
      const edit = [...hs.querySelectorAll('button')].find(b => /^Edit$/.test(b.textContent.trim()));
      if (edit) edit.click();
      r.editShowsForm = !!edit && getComputedStyle(form).display !== 'none' && getComputedStyle(hs).display === 'none';
      const done = form.querySelector('.edit-bar button'); if (done) done.click();
      r.doneReturns = !!done && getComputedStyle(form).display === 'none';
      return r;
    });
    checks.push({ ok: sheet.crest && sheet.tn && sheet.skills === 22 && sheet.sheetInputs === 0, msg: `Character opens on a read-only sheet: crest, TNs, 18 skills + 4 profs, no inputs (${JSON.stringify(sheet)})` });
    checks.push({ ok: sheet.formHidden && sheet.editShowsForm && sheet.doneReturns, msg: 'Edit reveals the form and Done returns to the sheet' });

    // ---- Crests: eleven distinct devices ----
    const crests = await page.evaluate(() => {
      // compare the drawn DEVICE (the <g> inside the shield), not the whole SVG — field colours alone differ
      const set = new Set(Object.keys(CULTURES).map(c => (cultureCrest(c, 32).match(/<g [^>]*>.*<\/g>/) || [''])[0]));
      return { cultures: Object.keys(CULTURES).length, distinct: set.size, header: !!document.querySelector('#hdr-monogram svg.crest') };
    });
    checks.push({ ok: crests.distinct === crests.cultures && crests.cultures === 11 && crests.header, msg: `each of the 11 cultures has its own crest, and the header shows it (${crests.distinct}/${crests.cultures})` });

    // ---- A roll from any tab opens the result drawer ----
    const drawer = await page.evaluate(() => {
      closeRollDrawer(); openNavGroup('play');
      diceState.success = 2; rollDice('Awe');
      const d = document.getElementById('roll-drawer');
      const r = d.getBoundingClientRect();
      return { open: d.classList.contains('open'), onScreen: r.top < innerHeight && r.bottom > 0, hasResult: !!d.querySelector('#roll-result .result-total'),
               notOverlay: !d.classList.contains('menu-overlay') };
    });
    await page.waitForTimeout(400);
    const drawerVisible = await page.evaluate(() => { const r = document.getElementById('roll-drawer').getBoundingClientRect(); closeRollDrawer(); return r.top < innerHeight - 60; });
    checks.push({ ok: drawer.open && drawer.hasResult && drawerVisible && drawer.notOverlay, msg: 'a roll from Play slides the result up in the drawer (and the drawer never counts as a dialog)' });

    // ---- Vitals sheet: conditions work through the real toggle; moved actions are there ----
    const vit = await page.evaluate(async () => {
      char.weary = false; char.wounded = false; saveCharacter(); render();
      openVitals();
      const before = !!char.weary;
      document.querySelector('#vitals-body .v-cond').click();
      await new Promise(r => setTimeout(r, 120));
      const acts = [...document.querySelectorAll('#vitals-body .v-act strong')].map(x => x.textContent);
      closeVitals();
      return { toggled: !before && !!char.weary, acts };
    });
    checks.push({ ok: vit.toggled, msg: 'Weary can be set from the vitals sheet (through the real condition toggle)' });
    checks.push({ ok: ['Support an ally', 'Fellowship Phase'].every(a => vit.acts.includes(a)) && vit.acts.some(a => /session|milestone/i.test(a)), msg: `in-play actions live in the vitals sheet (${vit.acts.join(', ')})` });

    // ---- Combat: your attack and theirs look different ----
    const foe = await page.evaluate(() => {
      openNavGroup('adventure'); document.querySelector('.tab[data-tab="combat"]').click();
      addFoeFromBestiary(0);
      // Turns (2026-10-06): your attacks are on YOUR card on your turn; the foe's are on its card on its turn.
      const hero = document.querySelector('.hero-fight-card');
      const you = hero && hero.querySelector('button[onclick^="heroAttackFoe"]');
      const r = { you: you && you.textContent.trim(), youPrimary: you && !you.classList.contains('btn-secondary') };
      encHeroPass();
      const card = document.querySelector('.foe-card');
      const them = card && card.querySelector('button[onclick^="foeAttackHero"]');
      r.themSecondary = !!them && !document.querySelector('.hero-fight-card button[onclick^="heroAttackFoe"]');
      r.label = !!card && /attacks you/i.test(card.innerText);
      endEncounter && (char.encounter = JSON.parse(JSON.stringify(DEFAULT_CHARACTER.encounter))); saveCharacter(); render();
      return r;
    });
    checks.push({ ok: /^(⚔ )?Attack /.test(foe.you || '') && foe.youPrimary && foe.themSecondary && foe.label, msg: `"Attack X" is primary on your card; the foe's attacks come on its turn, under "attacks you" (${foe.you})` });

    // ---- Play: road strip + roll pills ----
    const road = await page.evaluate(() => {
      char.saga = Object.assign(char.saga || {}, { started: true, premise: 'x', step: 'journey' });
      char.journey = Object.assign(char.journey || {}, { active: true, totalHexes: 9, currentHex: 3, nextEventHex: 5 });
      saveCharacter(); openNavGroup('play');
      _playFeed.push({ text: 'Hard going. (Travel roll 6 vs 15 — failure.) Two stretches.' }); renderPlay();
      const r = { here: document.querySelectorAll('#play-body .route .route-here').length, pill: !!document.querySelector('#play-body .roll-pill.fail') };
      _playFeed.pop(); char.journey.active = false; saveCharacter(); renderPlay();
      return r;
    });
    checks.push({ ok: road.here === 1 && road.pill, msg: 'on the road, Play draws the inked route map with your marker and shows rolls as dice pills' });

    // ---- Jump bar on the long tabs ----
    const jump = await page.evaluate(() => {
      char.moriaMode = true; saveCharacter(); refreshStriderUI();
      openNavGroup('adventure'); document.querySelector('.tab[data-tab="band"]').click();
      const chips = [...document.querySelectorAll('#panel-band .jump-bar .jump-chip')].map(c => c.textContent);
      char.moriaMode = false; saveCharacter(); refreshStriderUI();
      return chips;
    });
    checks.push({ ok: jump.length >= 5 && jump.some(c => /Tests/.test(c)), msg: `Band has a jump bar (${jump.join(' · ')})` });

    // =================== ROUND 3 ===================
    const tab3 = (g, t) => page.evaluate(([g, t]) => { openNavGroup(g); const b = document.querySelector(`.tab[data-tab="${t}"]`); if (b) b.click(); }, [g, t]);
    const vis3 = sel => page.evaluate(s => [...document.querySelectorAll(s)].filter(e => e.checkVisibility()).length, sel);

    // ---- Band never widens the phone page, even with its Fellowship Phase step open ----
    const band = await page.evaluate(async () => {
      char.moriaMode = true; saveCharacter(); refreshStriderUI();
      openNavGroup('adventure'); document.querySelector('.tab[data-tab="band"]').click();
      const fp = [...document.querySelectorAll('#panel-band > .card')].find(c => /^Fellowship Phase/.test((c.querySelector(':scope > .card-title') || {}).textContent || ''));
      if (!fp) return { w: 9999, open: -1 };
      openCard(fp); await new Promise(r => setTimeout(r, 60));
      // widest thing on the tab (the page itself may clip, so measure the elements, not scrollWidth);
      // the jump bar is a horizontal scroller by design and is excluded.
      const w = Math.max(document.documentElement.scrollWidth, ...[...document.querySelectorAll('#panel-band *')]
        .filter(e => e.checkVisibility() && !e.closest('.jump-bar')).map(e => Math.round(e.getBoundingClientRect().right)));
      // accordion: opening Fellowship Phase closed every other step
      const open = [...document.querySelectorAll('#panel-band > .card:not(.tab-intro)')].filter(c => c.dataset.ckey && !c.classList.contains('collapsed') && c.style.display !== 'none').length;
      char.moriaMode = false; saveCharacter(); refreshStriderUI();
      return { w, open };
    });
    checks.push({ ok: band.w <= 390, msg: `Band's Fellowship Phase step fits a 390px phone (page ${band.w}px)` });
    checks.push({ ok: band.open === 1, msg: `Band is an accordion — one step open at a time (open ${band.open})` });

    // ---- Quiet help: first full sentence, "More" for the rest; never a mid-word cut ----
    const qh = await page.evaluate(async () => {
      openNavGroup('adventure'); document.querySelector('.tab[data-tab="journey"]').click(); clampLongHints();
      const h = [...document.querySelectorAll('.panel.active .hint-clamp')].find(e => e.checkVisibility());
      if (!h) return { found: false };
      const rest = h.querySelector('.hint-rest'), more = h.querySelector('.hint-more');
      const firstVisible = [...h.childNodes].filter(n => n !== rest && n !== more).map(n => n.textContent).join('').trim();
      const restHidden = !rest.checkVisibility();
      h.click(); await new Promise(r => setTimeout(r, 30));
      const restShown = rest.checkVisibility();
      h.click();
      return { found: true, endsSentence: /[.!?]$/.test(firstVisible), restHidden, restShown, more: !!more && more.checkVisibility() };
    });
    checks.push({ ok: qh.found && qh.endsSentence && qh.restHidden && qh.more && qh.restShown, msg: 'a long hint shows its first full sentence + "More"; tapping reveals the rest' });

    // ---- A card title explains itself when you tap the words; no (?) circle beside it ----
    const tt = await page.evaluate(async () => {
      openNavGroup('adventure'); document.querySelector('.tab[data-tab="combat"]').click(); initHintButtons();
      const term = document.querySelector('#panel-combat .title-term'); if (!term) return { found: false };
      const q = term.querySelector('.hint-q');
      const invisible = getComputedStyle(q).opacity === '0';
      const card = term.closest('.card'); const r = term.getBoundingClientRect();
      document.elementFromPoint(r.left + 8, r.top + r.height / 2).click();
      await new Promise(r => setTimeout(r, 80));
      const opened = document.getElementById('styled-modal-overlay').classList.contains('show');
      const ok = document.querySelector('#styled-modal-buttons button'); if (ok) ok.click();
      return { found: true, invisible, opened, stillOpen: !card.classList.contains('collapsed') };
    });
    checks.push({ ok: tt.found && tt.invisible && tt.opened && tt.stillOpen, msg: 'tapping a card title’s words opens its explanation (no visible ? circle, card stays open)' });

    // ---- One tip per session ----
    const tips1 = await page.evaluate(() => {
      localStorage.removeItem('tor2e-tips'); sessionStorage.removeItem('tor2e-tip-session');
      const shown = [];
      [['adventure', 'journey'], ['adventure', 'council'], ['roll', 'dice']].forEach(([g, t]) => {
        document.querySelector(`.tab[data-tab="${t}"]`).click();
        const i = document.querySelector('#panel-' + t + ' .tab-intro'); if (i && i.checkVisibility()) shown.push(t);
      });
      return shown;
    });
    checks.push({ ok: tips1.length === 1, msg: `at most one tab tip per session (shown: ${tips1.join(', ') || 'none'})` });

    // ---- Tiered: one primary per screen; the gilt frame only on the hero, scene, result ----
    const tier = await page.evaluate(() => {
      const red = t => [...document.querySelectorAll('#panel-' + t + ' button')].filter(e => {
        if (!e.checkVisibility()) return false; const m = getComputedStyle(e).backgroundColor.match(/\d+/g).map(Number);
        return m[0] > 110 && m[1] < 80 && m[2] < 80 && !e.classList.contains('bs-dot'); }).length;
      const out = {};
      [['adventure', 'journey'], ['roll', 'dice'], ['roll', 'oracle'], ['hero', 'gear']].forEach(([g, t]) => { openNavGroup(g); document.querySelector(`.tab[data-tab="${t}"]`).click(); out[t] = red(t); });
      const framed = [...document.querySelectorAll('.panel .card')].filter(c => getComputedStyle(c, '::before').backgroundImage.includes('svg') && !c.classList.contains('ornate')).length;
      return { out, framed };
    });
    checks.push({ ok: Object.values(tier.out).every(n => n <= 1), msg: `one primary (red) button per screen (${JSON.stringify(tier.out)})` });
    checks.push({ ok: tier.framed === 0, msg: `the gilt frame is reserved for ornate cards (tool cards framed: ${tier.framed})` });

    // ---- Buttons carry drawn icons, not emoji ----
    const emo = await page.evaluate(async () => {
      await new Promise(r => requestAnimationFrame(() => setTimeout(r, 30)));
      const re = /^\s*\p{Extended_Pictographic}/u, keep = /^\s*[⚔✦★▶↺✓✗×↩↶]/;
      return [...document.querySelectorAll('.panel button, .menu button')].filter(b => re.test(b.textContent) && !keep.test(b.textContent)).map(b => b.textContent.trim().slice(0, 20)).slice(0, 4);
    });
    checks.push({ ok: emo.length === 0, msg: `no button leads with an emoji (${emo.join(' | ') || 'none'})` });

    // ---- Skills live on the sheet: tap one to roll ----
    const tap = await page.evaluate(async () => {
      openNavGroup('hero'); document.querySelector('.tab[data-tab="character"]').click(); setCharEditing(false);
      const before = history.length;
      const row = [...document.querySelectorAll('#hero-sheet button.s-skill')].find(b => /Travel/.test(b.textContent));
      if (row) row.click(); await new Promise(r => setTimeout(r, 120));
      const drawer = document.getElementById('roll-drawer').classList.contains('open');
      closeRollDrawer();
      return { row: !!row, rolled: history.length > before, drawer, skillsTab: !!document.querySelector('.tab[data-tab="skills"]') };
    });
    checks.push({ ok: tap.row && tap.rolled && tap.drawer && !tap.skillsTab, msg: 'tapping a skill on the hero sheet rolls it (and there is no separate Skills tab)' });

    // ---- Pickers: the whole choice is shown, and choosing drives the real select ----
    const pick = await page.evaluate(async () => {
      // round 4: the Journey's region became chips; the history filter is still a picker
      openNavGroup('roll'); document.querySelector('.tab[data-tab="dice"]').click();
      await new Promise(r => requestAnimationFrame(() => setTimeout(r, 30)));
      const sel = document.getElementById('history-outcome'), btn = sel && sel._pickBtn;
      if (!btn) return { found: false };
      const v = btn.querySelector('.pick-val');
      const whole = v.scrollWidth <= v.clientWidth + 1 && v.textContent === sel.options[sel.selectedIndex].textContent.trim();
      let fired = 0; const h = () => fired++; sel.addEventListener('change', h);
      btn.click();
      const opts = [...document.querySelectorAll('#pick-list .pick-opt')];
      const target = opts.find(o => !o.classList.contains('on'));
      const want = target.textContent; target.click();
      await new Promise(r => requestAnimationFrame(() => setTimeout(r, 30)));
      sel.removeEventListener('change', h);
      return { found: true, whole, native: getComputedStyle(sel).opacity === '0', fired, changed: sel.options[sel.selectedIndex].textContent.trim() === want, label: v.textContent === want };
    });
    checks.push({ ok: pick.found && pick.whole && pick.native && pick.fired === 1 && pick.changed && pick.label, msg: 'a select is a tap-to-pick button showing the whole choice; picking drives the real select' });

    // ---- Steppers ----
    const step3 = await page.evaluate(() => {
      const inp = document.getElementById('j-totalHexes'); inp.value = '';
      const plus = inp.parentNode.querySelector('.step-btn:last-child');
      if (!plus) return { found: false };
      plus.click(); const a = inp.value; plus.click(); const b = inp.value;
      inp.parentNode.querySelector('.step-btn:first-child').click(); inp.parentNode.querySelector('.step-btn:first-child').click();
      return { found: true, a, b, floor: inp.value };
    });
    checks.push({ ok: step3.found && step3.a === '1' && step3.b === '2' && step3.floor === '1', msg: `number boxes have − / + steppers that respect min (1 → 2 → floor ${step3.floor})` });

    // ---- Menu search finds and runs an action ----
    const ms = await page.evaluate(async () => {
      toggleMenu(); const s = document.getElementById('menu-search'); s.value = 'stealth'; menuSearch('stealth');
      const hits = [...document.querySelectorAll('#menu-search-results .menu-hit')].map(b => b.textContent);
      const hidden = [...document.querySelectorAll('.main-menu > details')].every(d => !d.checkVisibility());
      const before = history.length;
      const hit = document.querySelector('#menu-search-results .menu-hit'); if (hit) hit.click();
      await new Promise(r => setTimeout(r, 150)); closeRollDrawer();
      return { hits, hidden, rolled: history.length > before, closed: !document.getElementById('menu-overlay').classList.contains('show') };
    });
    checks.push({ ok: ms.hits[0] === 'Roll Stealth' && ms.hidden && ms.rolled && ms.closed, msg: `menu search finds "Roll Stealth" and running it rolls (${ms.hits.join(', ')})` });

    // ---- Play: pinned quick rolls, with "Again" for the last roll ----
    const qr = await page.evaluate(() => {
      char.saga = Object.assign(char.saga || {}, { started: true, premise: 'x', step: 'haven' }); saveCharacter();
      openNavGroup('play'); renderPlay();
      const again = document.querySelector('#play-tray .pt-again');
      return { again: again ? again.textContent : '', skills: document.querySelectorAll('#play-tray .pt-cols .pt-roll').length };
    });
    checks.push({ ok: /^Again: /.test(qr.again) && qr.skills === 18, msg: `Play's roll tray holds every skill and "Again" for the last roll (${JSON.stringify(qr)})` });

    // ---- Spend XP buttons say what they buy; FP phase type is a ticked choice ----
    const xp = await page.evaluate(() => {
      char.advPts = 10; saveCharacter(); openSpendXP('adv'); renderSpendXP('adv');
      const t = [...document.querySelectorAll('#spend-xp-list .xp-buy')].map(b => b.textContent);
      closeSpendXP && closeSpendXP();
      openFPWizard(); fpSetPhaseType('yule');
      const y = document.getElementById('fp-type-yule').getAttribute('aria-pressed'), o = document.getElementById('fp-type-ord').getAttribute('aria-pressed');
      fpClose();
      return { t, y, o };
    });
    checks.push({ ok: xp.t.some(x => /^Raise to \d+ · \d+ pts$/.test(x)), msg: `Spend XP buttons say what they buy ("${xp.t[0]}")` });
    checks.push({ ok: xp.y === 'true' && xp.o === 'false', msg: 'Fellowship Phase: the chosen phase type is marked, the other is not' });

    // ---- Engraved dice ----
    const dice3 = await page.evaluate(async () => {
      rollFromSheet('Travel'); await new Promise(r => setTimeout(r, 100));
      const f = document.querySelector('#roll-result .feat-die');
      const s = document.querySelector('#roll-result .success-die');
      const out = { feat: f ? getComputedStyle(f).backgroundImage : '', succ: s ? getComputedStyle(s).backgroundImage : '' };
      closeRollDrawer(); return out;
    });
    checks.push({ ok: /polygon/.test(dice3.feat) && /gradient/.test(dice3.succ), msg: 'the Feat die is a drawn d12 face and Success dice are engraved bone faces' });

    // ---- Scene art: a vignette that fits the place; the silhouette on the sheet ----
    const art = await page.evaluate(() => {
      const s = sagaState(); s.step = 'haven'; saveCharacter(); openNavGroup('play'); renderPlay();
      const cls = () => (document.querySelector('#play-body .scene-art') || {}).className || 'none';
      const haven = cls();
      s.step = 'journey'; char.journey = Object.assign(char.journey || {}, { active: true, totalHexes: 6, currentHex: 1, destination: 'the eaves of Mirkwood', region: 'wild' });
      saveCharacter(); renderPlay();
      const road = cls();
      char.journey.active = false; s.step = 'haven'; saveCharacter(); renderPlay();
      openNavGroup('hero'); document.querySelector('.tab[data-tab="character"]').click();
      return { haven, road, sil: !!document.querySelector('#hero-sheet .silhouette') };
    });
    checks.push({ ok: /t-haven/.test(art.haven) && /t-forest/.test(art.road), msg: `Play draws the place: a Safe Haven at home, a forest on the road to Mirkwood (${art.haven} / ${art.road})` });
    checks.push({ ok: art.sil, msg: 'the hero sheet carries the culture’s drawn silhouette' });

    // ---- Oracle Ask box: a written answer slip, logged like any oracle roll ----
    const ask = await page.evaluate(() => {
      char.striderMode = true; saveCharacter(); refreshStriderUI();
      openNavGroup('roll'); document.querySelector('.tab[data-tab="oracle"]').click();
      const before = (typeof oracleHistory !== 'undefined' ? oracleHistory.length : JSON.parse(localStorage.getItem('tor2e-oracle-history') || '[]').length);
      document.getElementById('ask-q').value = 'Is the gate guarded?'; askYesNo();
      const slip = document.getElementById('ask-slip');
      const after = (typeof oracleHistory !== 'undefined' ? oracleHistory.length : JSON.parse(localStorage.getItem('tor2e-oracle-history') || '[]').length);
      const a = slip.querySelector('.slip-a') ? slip.querySelector('.slip-a').textContent : '';
      askWords(); const words = slip.querySelectorAll('.slip-words span').length;
      char.striderMode = false; saveCharacter(); refreshStriderUI();
      return { shown: !slip.hidden, a, logged: after > before, words };
    });
    checks.push({ ok: ask.shown && /^(Yes|No)$/.test(ask.a) && ask.logged && ask.words >= 3, msg: `Ask the Oracle writes the answer on a slip (${ask.a}; ${ask.words} words) and logs it` });

    // ---- Sound is off unless asked for ----
    const snd = await page.evaluate(() => {
      localStorage.removeItem('tor2e-sound'); refreshSoundLabel();
      const off = document.getElementById('sound-btn').textContent;
      return { off: /Off/.test(off), quiet: !soundOn() };
    });
    checks.push({ ok: snd.off && snd.quiet, msg: 'sound effects are off by default and say so in the menu' });

    // ---- Wayfinding colour follows the group ----
    const acc = await page.evaluate(async () => {
      const wait = () => new Promise(r => setTimeout(r, 450));   // let the colour transition finish
      openNavGroup('hero'); await wait(); const a = getComputedStyle(document.querySelector('.bn-item.active')).color;
      openNavGroup('adventure'); await wait(); const b = getComputedStyle(document.querySelector('.bn-item.active')).color;
      return { a, b };
    });
    checks.push({ ok: acc.a !== acc.b, msg: `each nav group has its own accent (${acc.a} vs ${acc.b})` });

    // ---- Tablet: Play in two panes ----
    await page.setViewportSize({ width: 1180, height: 820 });
    const two = await page.evaluate(async () => {
      openNavGroup('play'); renderPlay(); await new Promise(r => setTimeout(r, 60));
      const sc = document.querySelector('#play-body .play-scene').getBoundingClientRect();
      const ch = document.querySelector('#play-body .play-choices').getBoundingClientRect();
      return { side: ch.left >= sc.right - 1, top: Math.abs(ch.top - sc.top) < 40 };
    });
    await page.setViewportSize({ width: 390, height: 844 });
    checks.push({ ok: two.side && two.top, msg: 'on a tablet, Play shows the story and the choices side by side' });

    // ================= Round 4 (2026-09-27) =================
    const tick = () => page.evaluate(() => new Promise(r => requestAnimationFrame(() => setTimeout(r, 40))));
    const safe = fn => page.evaluate(async src => { try { return await (new Function('return (async()=>{' + src + '})()'))(); } catch (e) { return { err: String(e && e.message || e) }; } }, fn);
    await hero();

    // ---- No blank buttons, and no colour emoji left in the interface's own words ----
    const emo4 = await safe(`
      const tabs = ['play','character','gear','build','journey','council','combat','dice','reference','chronicle','oracle'];
      char.striderMode = true; saveCharacter(); refreshStriderUI();
      // a foe and a written scene put the small glyph buttons (edit, rename, describe) on screen
      addFoeFromBestiary(allBestiary().findIndex(b => b.name === 'Orc Soldier'));
      if (typeof loadSampleChronicle === 'function') { loadSampleChronicle(); renderChronicle(); }
      await new Promise(r => setTimeout(r, 30));
      const blanks = new Set(), left = new Set();
      const pic = /\\p{Extended_Pictographic}/u;
      const scan = () => {
        document.querySelectorAll('button').forEach(b => { if (!b.checkVisibility()) return;
          if (!b.textContent.trim() && !b.querySelector('svg,img,.pipset') && !b.getAttribute('aria-label')) blanks.add((b.getAttribute('onclick') || b.className || '?').slice(0, 30)); });
        const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n;
        while ((n = tw.nextNode())) { const e = n.parentElement; if (!e || e.closest(_ICON_SKIP) || !e.checkVisibility()) continue;
          for (const ch of n.nodeValue.match(/\\p{Extended_Pictographic}/gu) || []) if (!_EMOJI_KEEP.has(ch)) left.add(ch); }
      };
      for (const t of tabs) { const el = document.querySelector('.tab[data-tab="' + t + '"]'); if (el && el.style.display !== 'none') { openNavGroup(navGroupOf(t).id); el.click(); await new Promise(r => setTimeout(r, 40)); scan(); } }
      toggleMenu(); await new Promise(r => setTimeout(r, 40)); scan(); toggleMenu();
      char.striderMode = false; char.encounter = JSON.parse(JSON.stringify(DEFAULT_CHARACTER.encounter)); saveCharacter(); refreshStriderUI(); render();
      return { blanks: [...blanks], left: [...left] };`);
    checks.push({ ok: !emo4.err && emo4.blanks.length === 0 && emo4.left.length === 0, msg: `every button shows something and no colour emoji remain in the interface (${JSON.stringify(emo4)})` });

    // ---- Council: choose first, one setup and one primary at a time ----
    const cc = await safe(`
      openNavGroup('adventure'); document.querySelector('.tab[data-tab="council"]').click(); await new Promise(r => setTimeout(r, 30));
      _councilKind = null; renderCouncil(); renderSkillEndeavour();
      const vis = id => document.getElementById(id).checkVisibility();
      const before = { chooser: vis('council-chooser'), c: vis('council-setup-card'), e: vis('se-setup-card') };
      document.getElementById('pick-council').click();
      const after = { c: vis('council-setup-card'), e: vis('se-setup-card') };
      const prim = [...document.querySelectorAll('#panel-council .add-row-btn.primary, #panel-council .btn:not(.btn-secondary):not(.btn-quiet)')].filter(b => b.checkVisibility()).length;
      return { before, after, prim };`);
    checks.push({ ok: !cc.err && cc.before.chooser && !cc.before.c && !cc.before.e && cc.after.c && !cc.after.e && cc.prim === 1, msg: `Council opens on a chooser; picking shows only that setup, with one primary (${JSON.stringify(cc)})` });

    // ---- Header: the name opens your heroes, it is not a text box ----
    const hn = await safe(`
      const n = document.getElementById('char-name');
      const isBtn = n.tagName === 'BUTTON' && !document.querySelector('.header input');
      // a folded (slim) header answers a tap by unfolding, by design — start from the full header
      window.scrollTo(0, 0); if (typeof setSlimHeader === 'function') setSlimHeader(false);
      n.click(); const peek = document.getElementById('peek-overlay').classList.contains('show');
      const sw = [...document.querySelectorAll('#peek-body button')].find(b => /Switch or add a hero/.test(b.textContent)); if (sw) sw.click();
      const open = document.getElementById('roster-overlay').classList.contains('show'); closeRoster && closeRoster();
      document.getElementById('roster-overlay').classList.remove('show');
      return { isBtn, peek, open, text: document.getElementById('char-name-text').textContent };`);
    checks.push({ ok: !hn.err && hn.isBtn && hn.peek && hn.open && /Beran/.test(hn.text), msg: `the header name is a button that opens the hero sheet over the page, which leads on to Your heroes (${JSON.stringify(hn)})` });

    // ---- Number boxes keep a placeholder that fits; the words move to the label ----
    const ph = await safe(`const i = document.getElementById('prot-dice'); return { ph: i.getAttribute('placeholder'), al: i.getAttribute('aria-label') };`);
    checks.push({ ok: !ph.err && ph.ph.length <= 4 && /armour/.test(ph.al || ''), msg: `stepper placeholders fit the box (${JSON.stringify(ph)})` });

    // ---- The five odds sit on one row ----
    const od = await safe(`
      char.striderMode = true; saveCharacter(); refreshStriderUI();
      openNavGroup('roll'); document.querySelector('.tab[data-tab="oracle"]').click(); await new Promise(r => setTimeout(r, 450));   // let the page turn settle
      const tops = [...document.querySelectorAll('#ask-odds .seg-btn')].map(b => Math.round(b.getBoundingClientRect().top));
      const chips = [...document.querySelectorAll('#panel-oracle .jump-chip')].map(b => b.textContent);
      char.striderMode = false; saveCharacter(); refreshStriderUI();
      return { rows: new Set(tops).size, n: tops.length, chips };`);
    checks.push({ ok: !od.err && od.n === 5 && od.rows === 1, msg: `the Oracle's five odds sit on one row (${JSON.stringify(od)})` });
    checks.push({ ok: !od.err && !od.chips.some(c => /Ask/.test(c)) && !od.chips.some(c => /Table$/.test(c)), msg: `the Oracle's jump chips skip the card already on screen and read short (${od.chips && od.chips.join(' | ')})` });

    // ---- First run: no dialog; the tutorial is offered on Play's first screen ----
    const fr = await safe(`
      localStorage.removeItem('tor2e-tutorial');
      char = JSON.parse(JSON.stringify(DEFAULT_CHARACTER)); saveCharacter(); render();
      openNavGroup('play'); renderPlay(); await new Promise(r => setTimeout(r, 900));
      const dialog = !!document.querySelector('.menu-overlay.show');
      const tut = [...document.querySelectorAll('#play-body button')].some(b => /tutorial/i.test(b.textContent) && b.checkVisibility());
      const box = document.getElementById('campaign-box').checkVisibility();
      localStorage.setItem('tor2e-tutorial', JSON.stringify({ offered: true }));
      return { dialog, tut, box };`);
    checks.push({ ok: !fr.err && !fr.dialog && fr.tut && !fr.box, msg: `first run opens no dialog; Play offers the tutorial and hides the empty campaign box (${JSON.stringify(fr)})` });
    await hero();

    // ---- Solo vitals: no ally to support; the session ends through the saga ----
    const sv = await safe(`
      char.striderMode = true; char.saga = Object.assign(char.saga || {}, { started: true, premise: 'x' }); saveCharacter(); refreshStriderUI();
      openVitals(); const acts = [...document.querySelectorAll('#vitals-body .v-act')].map(b => b.textContent + '|' + b.getAttribute('onclick'));
      closeVitals(); char.striderMode = false; char.saga.started = false; saveCharacter(); refreshStriderUI();
      return { support: acts.some(a => /Support an ally/.test(a)), end: acts.some(a => /End the session/.test(a) && /sagaEndSession/.test(a)) };`);
    checks.push({ ok: !sv.err && !sv.support && sv.end, msg: `in solo the vitals sheet offers no "Support an ally" and ends the session through the saga (${JSON.stringify(sv)})` });

    // ---- Sheet: no stray Eye line; Spend with nothing to spend explains itself ----
    const sp = await safe(`
      char.striderMode = true; char.skillPts = 0; char.advPts = 3; saveCharacter(); refreshStriderUI();
      openNavGroup('hero'); document.querySelector('.tab[data-tab="character"]').click(); setCharEditing(false); renderHeroSheet();
      const hs = document.getElementById('hero-sheet');
      const eye = /Eye of Mordor/.test(hs.innerText);
      const empty = [...hs.querySelectorAll('button')].find(b => /No Skill points yet/.test(b.textContent));
      const full = [...hs.querySelectorAll('button')].find(b => /Spend Adventure points · 3/.test(b.textContent));
      let explained = false; const orig = window.alertStyled; window.alertStyled = m => { explained = /earn/i.test(m); };
      if (empty) empty.click(); window.alertStyled = orig;
      char.striderMode = false; saveCharacter(); refreshStriderUI();
      return { eye, empty: !!empty && !empty.disabled, full: !!full, explained };`);
    checks.push({ ok: !sp.err && !sp.eye && sp.empty && sp.full && sp.explained, msg: `the sheet has no stray Eye line; a Spend button at 0 says how points are earned (${JSON.stringify(sp)})` });

    // ---- Edit: a short menu of sections, each one screen; play actions are not in it ----
    const ed = await safe(`
      openNavGroup('hero'); document.querySelector('.tab[data-tab="character"]').click();
      setCharEditing(true); await new Promise(r => setTimeout(r, 20));
      const rows = [...document.querySelectorAll('#edit-menu .edit-row[onclick^="setEditSection"]')].filter(b => b.checkVisibility()).length;
      const cardVis = t => [...document.querySelectorAll('#char-edit .card-title')].some(h => h.textContent.trim().startsWith(t) && h.checkVisibility());
      const menuHidesCards = !cardVis('Attributes') && !cardVis('Name');
      [...document.querySelectorAll('#edit-menu .edit-row')].find(b => /Numbers/.test(b.textContent)).click();
      const numbers = cardVis('Attributes') && cardVis('Endurance') && !cardVis('Name') && !cardVis('History');
      const rest = [...document.querySelectorAll('#char-edit button')].some(b => /Short Rest|Award Session XP|Open Fellowship Phase/i.test(b.textContent) && b.checkVisibility());
      document.querySelector('#char-edit .edit-back').click();
      const back = document.getElementById('edit-menu').checkVisibility();
      setCharEditing(false);
      return { rows, menuHidesCards, numbers, rest, back };`);
    checks.push({ ok: !ed.err && ed.rows === 5 && ed.menuHidesCards && ed.numbers && !ed.rest && ed.back, msg: `Edit opens five short sections; Numbers shows only its cards; play actions are not in Edit (${JSON.stringify(ed)})` });

    // ---- Gear: read-only item cards with numbers in words and Reward badges ----
    const gr = await safe(`
      char.weapons = [{ name: 'Long Sword', dmg: '5', inj: '16', inj1h: '16', inj2h: '18', grip: '1h', load: '3', prof: 'Swords', picked: true, rewards: ['Fell'] }];
      char.armourProt = 3; char.armourLoad = 10; char.armourNotes = 'Mail-shirt'; saveCharacter(); render();
      openEquipment(); await new Promise(r => setTimeout(r, 30));
      const card = document.querySelector('#weapon-tbody .item-card');
      const inputs = [...document.querySelectorAll('#weapon-tbody input, #armour-items input')].filter(i => i.checkVisibility()).length;
      const words = card && /Damage 5 · Injury 16 · Load 3/.test(card.textContent), badge = !!(card && card.querySelector('.item-badge'));
      const armour = /Protection 3 dice/.test(document.getElementById('armour-items').textContent);
      card.querySelector('[aria-label^="Edit"]').click();
      const editOpens = [...document.querySelectorAll('#weapon-tbody input')].some(i => i.checkVisibility());
      toggleGearEdit('w0'); char.weapons = []; saveCharacter(); render();
      return { words, badge, inputs, armour, editOpens };`);
    checks.push({ ok: !gr.err && gr.words && gr.badge && gr.inputs === 0 && gr.armour && gr.editOpens, msg: `gear shows read-only item cards (numbers in words, Reward badge), fields only behind the pencil (${JSON.stringify(gr)})` });

    // ---- Journey: three questions drive the real setup ----
    const jq = await safe(`
      openNavGroup('adventure'); document.querySelector('.tab[data-tab="journey"]').click(); await new Promise(r => setTimeout(r, 30));
      document.querySelector('#j-dist [data-hex="9"]').click();
      document.querySelector('#j-travel [data-mode="mounted"]').click();
      document.querySelector('#j-region-chips [data-v="Shadow"]').click();
      return { hex: document.getElementById('j-totalHexes').value, mounted: document.getElementById('j-mounted').checked,
        vigour: document.getElementById('j-vigour-row').checkVisibility(), region: document.getElementById('j-region').value,
        pressed: document.querySelector('#j-dist [data-hex="9"]').getAttribute('aria-pressed') };`);
    checks.push({ ok: !jq.err && jq.hex === '9' && jq.mounted && jq.vigour && jq.region === 'Shadow' && jq.pressed === 'true', msg: `the journey's three questions set distance, mount and lands (${JSON.stringify(jq)})` });

    // ---- Fellowship Phase: Next on the Rest step rests, no "are you sure" ----
    const fp4 = await safe(`
      char.hopeCur = 2; char.hopeMax = 10; char.fpWizardState = null; saveCharacter();
      let asked = false; const oc = window.confirmStyled; window.confirmStyled = async () => { asked = true; return true; };
      openFPWizard(true); fpSetPhaseType('ordinary'); await fpNextStep();
      const label = document.getElementById('fp-next-btn').textContent;
      await fpNextStep();
      window.confirmStyled = oc;
      const out = { asked, label, hope: char.hopeCur, step: fpState.step };
      fpClose(); char.fpWizardState = null; saveCharacter();
      return out;`);
    checks.push({ ok: !fp4.err && !fp4.asked && /Rest/.test(fp4.label) && fp4.hope > 2 && fp4.step === 3, msg: `the Fellowship Phase rests on Next, without asking (${JSON.stringify(fp4)})` });

    // ---- Checkboxes read as switches, radios as option rows ----
    const sw = await safe(`const c = document.getElementById('hoard-tainted'); const cs = getComputedStyle(c); const r = getComputedStyle(document.querySelector('input[name="fp-shadow-rm"]').parentElement);
      return { app: cs.appearance || cs.webkitAppearance, w: cs.width, rowBorder: r.borderTopStyle };`);
    checks.push({ ok: !sw.err && sw.app === 'none' && sw.w === '36px' && sw.rowBorder === 'solid', msg: `checkboxes are switches and radios are option rows (${JSON.stringify(sw)})` });

    // ---- Plain words: no clipped abbreviations on Battle ----
    const jg = await safe(`const t = document.getElementById('panel-battle').textContent; return { bad: (t.match(/Resist\\.|Labor\\.|Daunt\\.|Overw\\.|Aggr\\.|Guard\\.|M\\+1 R\\+3/g) || []) };`);
    checks.push({ ok: !jg.err && jg.bad.length === 0, msg: `the Battle tab spells its words out (${JSON.stringify(jg)})` });

    // ---- Combat: one "You attack" is primary ----
    const fa = await safe(`
      char.encounter = JSON.parse(JSON.stringify(DEFAULT_CHARACTER.encounter)); saveCharacter();
      addFoeFromBestiary(allBestiary().findIndex(b => b.name === 'Orc Soldier')); addFoeFromBestiary(allBestiary().findIndex(b => b.name === 'Warg'));
      openNavGroup('adventure'); document.querySelector('.tab[data-tab="combat"]').click(); await new Promise(r => setTimeout(r, 30));
      const you = [...document.querySelectorAll('.foe-you')];
      const kinds = [...document.querySelectorAll('.foe-card .foe-sil')].map(s => [...s.classList].find(c => c.startsWith('k-')));
      const out = { n: you.length, prim: you.filter(b => !b.classList.contains('btn-secondary')).length, kinds };
      char.encounter = JSON.parse(JSON.stringify(DEFAULT_CHARACTER.encounter)); saveCharacter(); render();
      return out;`);
    checks.push({ ok: !fa.err && fa.n === 2 && fa.prim === 1, msg: `with two foes, only one "You attack" is primary (${JSON.stringify(fa)})` });
    checks.push({ ok: !fa.err && fa.kinds && fa.kinds[0] === 'k-orc' && fa.kinds[1] === 'k-wolf', msg: `each foe card carries a silhouette of its kind (${fa.kinds})` });

    // ---- Header folds while scrolling down, returns on the way up ----
    const sl = await safe(`
      openNavGroup('reference'); document.querySelector('.tab[data-tab="reference"]').click(); await new Promise(r => setTimeout(r, 60));
      document.querySelectorAll('#panel-reference details').forEach(d => d.open = true);
      const h0 = document.querySelector('.header').offsetHeight;
      window.scrollTo(0, 50); await new Promise(r => setTimeout(r, 320)); window.scrollTo(0, 900); await new Promise(r => setTimeout(r, 120));
      const slim = document.body.classList.contains('hdr-slim'), h1 = document.querySelector('.header').offsetHeight;
      const tabsHidden = !document.querySelector('.header nav.tabs').checkVisibility();
      await new Promise(r => setTimeout(r, 320)); window.scrollTo(0, 500); await new Promise(r => setTimeout(r, 120));
      const back = !document.body.classList.contains('hdr-slim');
      window.scrollTo(0, 0); setSlimHeader(false);
      return { slim, shorter: h1 < h0, tabsHidden, back };`);
    checks.push({ ok: !sl.err && sl.slim && sl.shorter && sl.tabsHidden && sl.back, msg: `the header folds to one line while scrolling down and returns on the way up (${JSON.stringify(sl)})` });

    // ---- Pickers describe what a choice means ----
    const pd = await safe(`
      char.striderMode = true; saveCharacter(); refreshStriderUI();
      openNavGroup('hero'); document.querySelector('.tab[data-tab="character"]').click(); setCharEditing(true, 'numbers');
      openPicker(document.getElementById('eye-region-pick'));
      const txt = [...document.querySelectorAll('#pick-list .pick-opt')].map(b => b.textContent);
      closePicker(); setCharEditing(false); char.striderMode = false; saveCharacter(); refreshStriderUI();
      return { txt };`);
    checks.push({ ok: !pd.err && pd.txt.some(t => /Wild lands.*hunts you at 16/.test(t)), msg: `a picker option says what it means (${pd.txt && pd.txt[2]})` });

    // ---- The roll result leads with a banner: the verdict and why ----
    const rb = await safe(`
      rollFromSheet('Awe'); await new Promise(r => setTimeout(r, 60));
      const b = document.getElementById('roll-banner'); const word = b.querySelector('.rb-ribbon').textContent, why = b.querySelector('.rb-why').textContent;
      const verdict = /SUCCESS/.test(document.querySelector('#result-summary .rs-head').textContent);
      closeRollDrawer();
      return { shown: !b.hidden && b.checkVisibility(), word, why, agrees: verdict === /uccess/.test(word) };`);
    checks.push({ ok: !rb.err && rb.shown && /^(Success|Great success|Extraordinary success|Failure)$/.test(rb.word) && /(vs TN|Rune|Eye)/.test(rb.why) && rb.agrees, msg: `a roll opens on a ribbon with the verdict and why (${rb.word}: ${rb.why})` });

    // ---- The route map marks camps, past events and the day ----
    const rm = await safe(`
      const h = routeMap(9, 18, 12, 'Bree', 'Rivendell', 'road', { days: 6, log: [{ hex: 3, day: 2, text: 'Marching Test' }, { hex: 6, day: 4, text: 'Marching Test' }, { hex: 6, day: 4, text: 'Mishap' }] });
      const d = document.createElement('div'); d.innerHTML = h;
      return { camps: d.querySelectorAll('.rm-camp').length, past: d.querySelectorAll('.rm-past').length, day: /Day 6/.test(d.textContent) };`);
    checks.push({ ok: !rm.err && rm.camps === 2 && rm.past === 1 && rm.day, msg: `the route map marks camps, past events and the day (${JSON.stringify(rm)})` });

    // ---- Moving to another group turns the page ----
    const pt = await safe(`
      openNavGroup('hero'); await new Promise(r => setTimeout(r, 500));
      openNavGroup('journal'); const p = document.querySelector('.panel.active'); const turned = p.classList.contains('turn-fwd');
      openNavGroup('play'); const q = document.querySelector('.panel.active'); const back = q.classList.contains('turn-back');
      return { turned, back };`);
    checks.push({ ok: !pt.err && pt.turned && pt.back, msg: `moving between groups turns the page forward or back (${JSON.stringify(pt)})` });

    // ---- Old map theme ----
    const om4 = await safe(`
      localStorage.setItem('tor2e-theme', 'sepia'); applyTheme();
      const bg = getComputedStyle(document.body).getPropertyValue('--bg').trim(), label = THEME_LABELS.sepia;
      const contours = getComputedStyle(document.body).getPropertyValue('--contours');
      localStorage.removeItem('tor2e-theme'); applyTheme();
      return { bg, label, strong: /stroke-opacity=%27\\.2%27/.test(contours) };`);
    checks.push({ ok: !om4.err && om4.label === 'Old map' && om4.bg === '#d7c095' && om4.strong, msg: `the Old map theme: deep tan paper and strong contours (${JSON.stringify(om4)})` });
    await hero();


    // ================= The Middle-earth map =================
    const mp = await safe(`
      const out = {};
      out.size = MAP_DATA.terrain.length === MAP_DATA.rows * MAP_DATA.cols;
      out.areas = new Set(MAP_DATA.peril.map(p => p[3])).size;
      out.badPlaces = MAP_DATA.places.filter(([n, r, c]) => !HexMap.passable(r, c)).map(p => p[0]);
      const P = n => { const h = mapFindPlace(n)[0]; return [h[1], h[2]]; };
      const R = HexMap.route([P('Bree'), P('Rivendell')]);
      out.hexes = R && R.hexes; out.counted = R && R.path.length - 1 === R.hexes;
      const X = HexMap.route([P('Rivendell'), P("Beorn's House")]);   // over the Misty Mountains: must find a pass
      out.clean = R && X && [...R.path, ...X.path].every(([r, c]) => HexMap.passable(r, c));
      out.steps = R && R.path.every((p, i) => !i || HexMap.neighbours(...R.path[i - 1]).some(q => q[0] === p[0] && q[1] === p[1]));
      return out;`);
    checks.push({ ok: !mp.err && mp.size && mp.areas >= 40 && mp.badPlaces.length === 0 && mp.hexes >= 12 && mp.hexes <= 20 && mp.counted && mp.clean && mp.steps,
      msg: `the map knows its hexes, 40 perilous areas and its places; Bree → Rivendell is ${mp.hexes} hexes of passable, adjacent steps (${JSON.stringify(mp)})` });

    const pk = await safe(`
      localStorage.removeItem('tor2e-map-fixes'); HexMap._fixes = null;
      Object.assign(MapPick, { from: null, to: null, via: null });
      char.safeHaven = 'Bree'; char.journey = Object.assign({}, char.journey || {}, { active: false }); saveCharacter();
      openNavGroup('adventure'); document.querySelector('.tab[data-tab="journey"]').click(); await new Promise(r => setTimeout(r, 450));
      document.querySelector('#j-dist [data-hex="map"]').click();
      const open = document.getElementById('map-overlay').classList.contains('show');
      const fromGuess = document.getElementById('map-from').value;
      const to = document.getElementById('map-to'); to.value = 'riv'; to.dispatchEvent(new Event('input'));
      const sug = [...document.querySelectorAll('#map-sug .map-sug-row')].map(b => b.textContent);
      document.querySelector('#map-sug .map-sug-row').click();
      const sum = document.getElementById('map-summary').innerText;
      const useOn = !document.getElementById('map-use').disabled;
      document.getElementById('map-use').click();
      const f = id => document.getElementById(id).value;
      const filled = { o: f('j-origin'), d: f('j-destination'), h: f('j-totalHexes'), note: !document.getElementById('j-map-note').hidden, card: document.querySelector('#j-dist [data-hex="map"]').getAttribute('aria-pressed') };
      startJourney();
      const route = (char.journey.route || []).length;
      return { open, fromGuess, sug, sum: /\\d+ hexes/.test(sum), useOn, filled, route, closed: !document.getElementById('map-overlay').classList.contains('show') };`);
    checks.push({ ok: !pk.err && pk.open && pk.fromGuess === 'Bree' && pk.sug[0] === 'Rivendell' && pk.sum && pk.useOn && pk.closed && pk.filled.o === 'Bree' && pk.filled.d === 'Rivendell' && +pk.filled.h > 0 && pk.filled.note && pk.filled.card === 'true' && pk.route === +pk.filled.h + 1,
      msg: `Pick on the map: starts from your Safe Haven, finds a place as you type, and fills the journey — which keeps its route (${JSON.stringify(pk)})` });

    const ev = await safe(`
      const j = char.journey; j.routeLands = 'l'.repeat(4) + 'd'.repeat(j.route.length - 4); j.nextEventHex = j.route.length - 2; j.currentHex = j.nextEventHex; j.active = true; saveCharacter();
      const early = journeyRegionNow(j, 2), late = journeyRegionNow(j, j.route.length - 2);
      const n = j.events.length; resolveJourneyEvent(); await new Promise(r => setTimeout(r, 30));
      const txt = String((j.events[n] || {}).text || '');
      document.querySelectorAll('.menu-overlay.show').forEach(o => o.classList.remove('show'));
      return { early, late, txt: /Dark Land/.test(txt) };`);
    checks.push({ ok: !ev.err && ev.early === 'Wild' && ev.late === 'Dark' && ev.txt, msg: `each Journey Event uses the land of the hex it strikes in (${JSON.stringify(ev)})` });

    const lv = await safe(`
      char.saga = Object.assign(char.saga || {}, { started: true, premise: 'x', step: 'journey' }); char.journey.currentHex = 5; saveCharacter();
      openNavGroup('play'); renderPlay(); await new Promise(r => setTimeout(r, 450));
      const m = document.querySelector('#play-body .live-map');
      const out = { map: !!m, here: !!(m && m.querySelector('.lm-here')), cap: m ? /5 of \\d+ hexes/.test(m.textContent) : false };
      if (m) m.click(); out.view = document.getElementById('map-overlay').classList.contains('view-only') && document.getElementById('map-overlay').classList.contains('show');
      closeMapPicker(); char.journey.active = false; saveCharacter();
      return out;`);
    checks.push({ ok: !lv.err && lv.map && lv.here && lv.cap && lv.view, msg: `during a journey planned on the map, Play shows the real map with you on it (${JSON.stringify(lv)})` });

    const fx = await safe(`
      Object.assign(MapPick, { from: null, to: null, via: null });
      const P = n => { const h = mapFindPlace(n)[0]; return [h[1], h[2]]; };
      const destPeril = HexMap.route([P('Bree'), P('Barrow-downs')]).destPeril;
      const R0 = HexMap.route([P('Bree'), P('Rivendell')]); const mid = R0.path[Math.floor(R0.path.length / 2)];
      openHexFix(mid); hexFixLand('m'); saveHexFix();
      const R1 = HexMap.route([P('Bree'), P('Rivendell')]);
      const avoided = !R1.path.some(p => p[0] === mid[0] && p[1] === mid[1]);
      const saved = /"land":"m"/.test(localStorage.getItem('tor2e-map-fixes') || '');
      openHexFix(mid); resetHexFix(); closeMapPicker();
      const back = HexMap.route([P('Bree'), P('Rivendell')]).hexes === R0.hexes;
      return { destPeril, avoided, saved, back };`);
    checks.push({ ok: !fx.err && fx.destPeril === 3 && fx.avoided && fx.saved && fx.back, msg: `a perilous destination sets the Peril; correcting a hex reroutes, is saved on the device, and undoes (${JSON.stringify(fx)})` });

    const mo = await safe(`
      char.moriaMode = true; saveCharacter(); refreshStriderUI(); jSyncGuided();
      const hidden = document.querySelector('#j-dist [data-hex="map"]').hidden;
      char.moriaMode = false; saveCharacter(); refreshStriderUI(); jSyncGuided();
      return { hidden, back: !document.querySelector('#j-dist [data-hex="map"]').hidden };`);
    checks.push({ ok: !mo.err && mo.hidden && mo.back, msg: `Moria (abstract distances) hides Pick on the map (${JSON.stringify(mo)})` });

    // A real tap chooses the hex under the finger — also after the map has changed shape
    // (the summary grows under it once a route exists; a tablet turns). Taps go through the
    // mouse, i.e. pointer + click events, never through a function call.
    // the screen point of a passable hex near a spot on the visible map
    const tapInfo = async (fx, fy) => page.evaluate(([fx, fy]) => {
      const svg = document.getElementById('map-svg'), b = svg.getBoundingClientRect(), m = svg.getScreenCTM();
      for (let k = 0; k < 40; k++) {
        const p = Object.assign(svg.createSVGPoint(), { x: b.left + b.width * (fx + (k % 7) * 0.03), y: b.top + b.height * (fy + Math.floor(k / 7) * 0.03) }).matrixTransform(m.inverse());
        const h = HexMap.at(p.x, p.y); if (!h || !HexMap.passable(...h)) continue;
        const [hx, hy] = HexMap.center(...h), q = Object.assign(svg.createSVGPoint(), { x: hx, y: hy }).matrixTransform(m);
        return { x: q.x, y: q.y, hex: h };
      }
      return null;
    }, [fx, fy]);
    const offBy = async (pt) => page.evaluate((hex) => MapPick.to ? Math.hypot(MapPick.to[0] - hex[0], MapPick.to[1] - hex[1]) : 999, pt.hex);
    const tp = {};
    try {
      const vp = page.viewportSize();
      await page.evaluate(() => { Object.assign(MapPick, { from: null, to: null, via: null }); closeMapPicker(); char.safeHaven = 'Bree'; saveCharacter(); openMapPicker(); });
      await page.waitForTimeout(300);
      let pt = await tapInfo(0.62, 0.4); await page.mouse.click(pt.x, pt.y); await page.waitForTimeout(250);
      tp.first = +(await offBy(pt)).toFixed(2);
      await page.setViewportSize({ width: 820, height: 1180 }); await page.waitForTimeout(300);
      pt = await tapInfo(0.35, 0.3); await page.mouse.click(pt.x, pt.y); await page.waitForTimeout(250);
      tp.turned = +(await offBy(pt)).toFixed(2);
      const before = await page.evaluate(() => JSON.stringify(MapPick.to));
      await page.mouse.move(pt.x, pt.y); await page.mouse.down(); await page.mouse.move(pt.x + 80, pt.y + 40, { steps: 6 }); await page.mouse.up(); await page.waitForTimeout(200);
      tp.dragKeeps = before === await page.evaluate(() => JSON.stringify(MapPick.to));
      tp.route = await page.evaluate(() => !!MapPick.result && !document.getElementById('map-use').disabled);
      await page.evaluate(() => closeMapPicker());
      await page.setViewportSize(vp); await page.waitForTimeout(200);
    } catch (e) { tp.err = String(e); }
    checks.push({ ok: !tp.err && tp.first < 0.5 && tp.turned < 0.5 && tp.dragKeeps && tp.route,
      msg: `tapping the map chooses the hex under the finger, after it changes shape too, and a drag chooses nothing (${JSON.stringify(tp)})` });

    // The picture the map draws is the one the data was read from: it loads at its full size, and
    // every town's printed dot is dark where the data says it is (a swapped image with other framing fails).
    const im = await safe(`
      const img = new Image(); img.src = MAP_DATA.img; await img.decode();
      const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
      const g = c.getContext('2d'); g.drawImage(img, 0, 0); const d = g.getImageData(0, 0, c.width, c.height).data;
      const s = img.naturalWidth / MAP_DATA.W, lum = (x, y) => { const i = 4 * (y * c.width + x); return d[i] * .3 + d[i + 1] * .59 + d[i + 2] * .11; };
      const light = MAP_DATA.places.filter(p => p.length > 4).filter(([n, r, cc, x, y]) => { let m = 999; for (let j = -2; j <= 2; j++) for (let k = -2; k <= 2; k++) m = Math.min(m, lum(Math.round(x * s) + j, Math.round(y * s) + k)); return m > 60; }).map(p => p[0]);
      const onMap = document.querySelector('#map-svg image').getAttribute('href') === MAP_DATA.img;
      return { w: img.naturalWidth, h: img.naturalHeight, ratio: +(img.naturalHeight / img.naturalWidth / (MAP_DATA.H / MAP_DATA.W)).toFixed(4), light, onMap };`);
    checks.push({ ok: !im.err && im.w === 2576 && Math.abs(im.ratio - 1) < 0.002 && !im.light.length && im.onMap,
      msg: `the map picture loads at full size, keeps the data's framing, and every town's dot is where the data says (${JSON.stringify(im)})` });

    // Tapping a town's printed dot chooses that town by name — a fingertip off the dot still counts,
    // an empty spot names nothing. Zoom stops where the picture turns to blur; names stay vector.
    const td = {};
    const vp2 = page.viewportSize();
    try {
      await page.setViewportSize({ width: 1180, height: 820 }); await page.waitForTimeout(200);   // a tablet: the zoom cap bites
      await page.evaluate(() => { Object.assign(MapPick, { from: null, to: null, via: null }); closeMapPicker(); char.safeHaven = 'Bree'; saveCharacter(); openMapPicker(); _mapSetVB(700, 300, 700); });
      await page.waitForTimeout(250);
      const scr = (x, y) => page.evaluate(([x, y]) => { const svg = document.getElementById('map-svg'); const q = Object.assign(svg.createSVGPoint(), { x, y }).matrixTransform(svg.getScreenCTM()); return [q.x, q.y]; }, [x, y]);
      const riv = await page.evaluate(() => MAP_DATA.places.find(p => p[0] === 'Rivendell'));
      let [x, y] = await scr(riv[3], riv[4]); await page.mouse.click(x + 7, y + 5); await page.waitForTimeout(200);
      td.town = await page.evaluate(() => [MapPick.toName, document.getElementById('map-to').value]);
      // a spot at least 3 hexes from every printed dot
      const empty = await page.evaluate(() => { const v = MapPick.vb; for (let x = v.x + v.w * .2; x < v.x + v.w * .8; x += 9) for (let y = v.y + v.h * .3; y < v.y + v.h * .8; y += 9) { if (MAP_DATA.places.every(p => p.length < 5 || Math.hypot(p[3] - x, p[4] - y) > 62)) { const h = HexMap.at(x, y); if (h && HexMap.passable(...h) && !HexMap.placeAt(...h)) return [x, y]; } } return null; });
      [x, y] = await scr(...empty); await page.mouse.click(x, y); await page.waitForTimeout(200);
      td.spot = await page.evaluate(() => MapPick.toName);
      for (let k = 0; k < 12; k++) await page.evaluate(() => mapZoom(0.7));
      td.maxScale = +(await page.evaluate(() => _mapScale())).toFixed(2);
      td.names = await page.evaluate(() => [...document.querySelectorAll('#map-places text')].filter(t => t.checkVisibility()).length);
      td.dots = await page.evaluate(() => MAP_DATA.places.filter(p => p.length > 4).length);
      td.dotsInHex = await page.evaluate(() => MAP_DATA.places.filter(p => p.length > 4 && Math.hypot(p[3] - HexMap.center(p[1], p[2])[0], p[4] - HexMap.center(p[1], p[2])[1]) > MAP_DATA.grid.w * 1.6).map(p => p[0]));
      await page.evaluate(() => closeMapPicker());
    } catch (e) { td.err = String(e); }
    await page.setViewportSize(vp2); await page.waitForTimeout(150);
    checks.push({ ok: !td.err && td.town[0] === 'Rivendell' && td.town[1] === 'Rivendell' && td.spot === 'a spot on the map' && td.maxScale <= 1.66 && td.names > 0 && td.dots >= 50 && !td.dotsInHex.length,
      msg: `tapping near a town's printed dot chooses the town; an empty spot names nothing; zoom stops at ~1.6x the picture with names drawn sharp (${JSON.stringify(td)})` });
    await hero();


    checks.push({ ok: errors.length === 0, msg: `0 page errors (got ${errors.length}${errors.length ? ': ' + errors[0] : ''})` });
    await context.close();
    return { checks };
  }
};
