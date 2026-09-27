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
    checks.push({ ok: nav.heroActive === 'hero' && nav.heroTabs.join() === 'character,skills,gear,build', msg: `Hero group shows only its own sub-tabs (${nav.heroTabs.join(',')})` });
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
      document.querySelector('.tab[data-tab="skills"]').click();
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

    checks.push({ ok: errors.length === 0, msg: `0 page errors (got ${errors.length}${errors.length ? ': ' + errors[0] : ''})` });
    await context.close();
    return { checks };
  }
};
