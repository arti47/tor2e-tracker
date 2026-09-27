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
      const card = document.querySelector('.foe-card');
      const you = card && card.querySelector('button[onclick^="heroAttackFoe"]');
      const them = card && card.querySelector('button[onclick^="foeAttackHero"]');
      const r = { you: you && you.textContent.trim(), youPrimary: you && !you.classList.contains('btn-secondary'), themSecondary: them && them.classList.contains('btn-secondary'),
                  label: card && /attacks you/i.test(card.innerText) };
      endEncounter && (char.encounter = JSON.parse(JSON.stringify(DEFAULT_CHARACTER.encounter))); saveCharacter(); render();
      return r;
    });
    checks.push({ ok: /^⚔ You attack/.test(foe.you || '') && foe.youPrimary && foe.themSecondary && foe.label, msg: `"You attack X" is primary; the foe's attacks sit under "attacks you" (${foe.you})` });

    // ---- Play: road strip + roll pills ----
    const road = await page.evaluate(() => {
      char.saga = Object.assign(char.saga || {}, { started: true, premise: 'x', step: 'journey' });
      char.journey = Object.assign(char.journey || {}, { active: true, totalHexes: 9, currentHex: 3, nextEventHex: 5 });
      saveCharacter(); openNavGroup('play');
      _playFeed.push({ text: 'Hard going. (Travel roll 6 vs 15 — failure.) Two stretches.' }); renderPlay();
      const r = { here: document.querySelectorAll('#play-body .road-track i.here').length, pill: !!document.querySelector('#play-body .roll-pill.fail') };
      _playFeed.pop(); char.journey.active = false; saveCharacter(); renderPlay();
      return r;
    });
    checks.push({ ok: road.here === 1 && road.pill, msg: 'on the road, Play draws the road with your marker and shows rolls as dice pills' });

    // ---- Jump bar on the long tabs ----
    const jump = await page.evaluate(() => {
      char.moriaMode = true; saveCharacter(); refreshStriderUI();
      openNavGroup('adventure'); document.querySelector('.tab[data-tab="band"]').click();
      const chips = [...document.querySelectorAll('#panel-band .jump-bar .jump-chip')].map(c => c.textContent);
      char.moriaMode = false; saveCharacter(); refreshStriderUI();
      return chips;
    });
    checks.push({ ok: jump.length >= 5 && jump.some(c => /Tests/.test(c)), msg: `Band has a jump bar (${jump.join(' · ')})` });

    checks.push({ ok: errors.length === 0, msg: `0 page errors (got ${errors.length}${errors.length ? ': ' + errors[0] : ''})` });
    await context.close();
    return { checks };
  }
};
