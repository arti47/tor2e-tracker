// ux — guards this session's UX features: themes (U10), text size (U9), Reference (U5/6/8),
// roll stats (U13), and remember-last-tab (U4).
module.exports = {
  name: 'ux',
  async run({ browser, baseUrl, newPage }) {
    const checks = [];
    const { context, page, errors } = await newPage(browser, baseUrl + '/character-tracker.html');

    // U10 — theme cycle visits all 5, each with the right body class.
    const themeRun = await page.evaluate(() => {
      localStorage.removeItem('tor2e-theme'); applyTheme();
      const seen = [];
      for (let i = 0; i < 5; i++) {
        const pref = localStorage.getItem('tor2e-theme') || 'auto';
        const cls = document.body.className.split(' ').filter(c => c === 'dark' || c.startsWith('theme-')).join(',') || 'light';
        seen.push(pref + ':' + cls);
        cycleTheme();
      }
      localStorage.removeItem('tor2e-theme'); applyTheme();
      return seen;
    });
    checks.push({ ok: themeRun.length === 5 && themeRun.some(s => s.startsWith('sepia:theme-sepia')) && themeRun.some(s => s.startsWith('hc:theme-hc')) && themeRun.some(s => s.startsWith('dark:dark')) && themeRun.some(s => s.startsWith('light:light')), msg: `themes cycle Auto/Light/Dark/Sepia/HC (${themeRun.join(' · ')})` });

    // U9 — text size classes.
    const sizeRun = await page.evaluate(() => {
      const out = {};
      localStorage.setItem('tor2e-textsize', 'small'); applyTextSize(); out.small = document.body.classList.contains('text-small');
      localStorage.setItem('tor2e-textsize', 'large'); applyTextSize(); out.large = document.body.classList.contains('text-large');
      localStorage.removeItem('tor2e-textsize'); applyTextSize(); out.normal = !document.body.classList.contains('text-small') && !document.body.classList.contains('text-large');
      return out;
    });
    checks.push({ ok: sizeRun.small && sizeRun.large && sizeRun.normal, msg: 'text-size applies text-small / text-large / clears' });

    // U5/6/8 — Reference tab renders groups + filter.
    const ref = await page.evaluate(() => {
      document.querySelector('.tab[data-tab="reference"]').click();
      const all = document.getElementById('reference-body').innerText;
      const groups = (document.getElementById('reference-body').innerHTML.match(/<h3/g) || []).length;
      document.getElementById('ref-filter').value = 'stealth'; renderReference();
      const filtered = document.getElementById('reference-body').innerText;
      document.getElementById('ref-filter').value = ''; renderReference();
      return { groups, hasWeary: all.includes('Weary'), hasStealth: all.includes('Stealth'), filterShowsStealth: filtered.includes('Stealth'), filterHidesWeary: !filtered.includes('Weary'),
               hasSolo: all.includes('Playing Solo'), hasLoop: all.includes('How a solo session runs'), hasFavoured: all.includes('Ill-Favoured') };
    });
    checks.push({ ok: ref.groups === 7, msg: `Reference renders 7 groups (got ${ref.groups})` });
    // Onboarding C: the Reference tab must carry solo-play guidance, not just group-play terms.
    checks.push({ ok: ref.hasSolo && ref.hasLoop, msg: 'Reference has a Playing Solo group incl. the session walkthrough' });
    checks.push({ ok: ref.hasFavoured, msg: 'Reference defines Favoured/Ill-Favoured (Dice-tab jargon)' });
    checks.push({ ok: ref.hasWeary && ref.hasStealth, msg: 'Reference includes Conditions (Weary) + Skills (Stealth)' });
    checks.push({ ok: ref.filterShowsStealth && ref.filterHidesWeary, msg: 'Reference search filters (stealth shows, Weary hidden)' });

    // U13 — roll stats math.
    const stats = await page.evaluate(() => {
      const saved = history.slice(); history.length = 0;
      history.push({ label: 'A', total: 16, tn: 15, outcome: 'SUCCESS', icons: 2, time: 'now' });
      history.push({ label: 'B', total: 9, tn: 15, outcome: 'FAIL', icons: 0, time: 'now' });
      history.push({ label: 'C', total: 18, tn: 14, outcome: 'SUCCESS', icons: 1, time: 'now' });
      renderHistory();
      const txt = document.getElementById('roll-stats').innerText.replace(/\s+/g, ' ').trim();
      history.length = 0; saved.forEach(h => history.push(h)); renderHistory();
      return txt;
    });
    checks.push({ ok: /3 rolls/.test(stats) && /67%/.test(stats) && /🌟 1/.test(stats), msg: `roll stats math correct ("${stats}")` });

    // U4 — restoreLastTab respects hidden tabs.
    const tab = await page.evaluate(() => {
      const active = () => document.querySelector('.tab.active')?.dataset.tab;
      document.querySelector('.tab[data-tab="character"]').click();
      localStorage.setItem('tor2e-lasttab', 'dice'); restoreLastTab(); const restored = active();
      document.querySelector('.tab[data-tab="character"]').click();
      localStorage.setItem('tor2e-lasttab', 'oracle'); restoreLastTab(); const afterHidden = active();
      localStorage.removeItem('tor2e-lasttab'); document.querySelector('.tab[data-tab="character"]').click();
      return { restored, afterHidden };
    });
    checks.push({ ok: tab.restored === 'dice' && tab.afterHidden === 'character', msg: 'restoreLastTab reopens visible tab, skips hidden (oracle)' });

    // U12 — auto-backup ring buffer + restore-points UI.
    const backup = await page.evaluate(() => {
      localStorage.removeItem('tor2e-backups');
      const first = snapshotHero(activeCharId, 'test');           // creates a snapshot
      const dupe = snapshotHero(activeCharId, 'test');            // identical → skipped
      // mutate the slot, snapshot again → a 2nd entry
      const raw = JSON.parse(localStorage.getItem(CHAR_PREFIX + activeCharId) || '{}');
      raw.safeHaven = 'Backup Test ' + Date.now();
      localStorage.setItem(CHAR_PREFIX + activeCharId, JSON.stringify(raw));
      const second = snapshotHero(activeCharId, 'test');
      const count = (loadBackups()[activeCharId] || []).length;
      openRestorePoints();
      const overlayShown = document.getElementById('restore-points-overlay').classList.contains('show');
      const rows = document.querySelectorAll('#restore-points-body button[onclick^="restoreSnapshot"]').length;
      closeRestorePoints();
      localStorage.removeItem('tor2e-backups');
      return { first, dupe, second, count, overlayShown, rows };
    });
    checks.push({ ok: backup.first === true && backup.dupe === false && backup.second === true && backup.count === 2, msg: `auto-backup: snapshot + dedupe + 2nd entry (count ${backup.count})` });
    checks.push({ ok: backup.overlayShown && backup.rows === 2, msg: `restore-points UI lists snapshots (${backup.rows} rows)` });

    // U11 — big-screen Table Mode: full-screen dashboard of heroes + active encounter foes.
    const tm = await page.evaluate(() => {
      openTableMode();
      const shown = document.getElementById('table-mode-overlay').classList.contains('show');
      const heroCards = document.querySelectorAll('#table-mode-body div[style*="border:3px solid #d4a635"]').length;
      ensureEncounterActive();
      enc().foes.push({ id: 'tmf', name: 'TM Foe', source: 'T', endMax: 10, endCur: 7, might: 1, hateMax: 2, hateCur: 2, parry: 1, armour: 0, atkTN: 14, attacks: [{ name: 'a', dice: 2, dmg: 3, inj: 0, special: '' }], engaged: true, wounded: false, slain: false });
      renderTableMode();
      const foeShown = document.getElementById('table-mode-body').innerText.includes('TM Foe');
      const timerOn = !!_tableModeTimer;
      closeTableMode();
      const hidden = !document.getElementById('table-mode-overlay').classList.contains('show');
      const timerOff = !_tableModeTimer;
      char.encounter = JSON.parse(JSON.stringify(DEFAULT_CHARACTER.encounter)); saveCharacter();
      return { shown, heroCards, foeShown, timerOn, hidden, timerOff };
    });
    checks.push({ ok: tm.shown && tm.heroCards >= 1 && tm.foeShown, msg: `Table Mode shows ${tm.heroCards} hero card(s) + encounter foe` });
    checks.push({ ok: tm.timerOn && tm.hidden && tm.timerOff, msg: 'Table Mode auto-refresh timer starts on open, clears on close' });

    // U15 — campaign timeline: funnel logging via adj (Shadow) + the viewer.
    const tl = await page.evaluate(() => {
      char.timeline = [];
      logTimeline('xp', 'Test session XP');           // direct
      const before = char.shadow;
      adj('shadow', 2);                               // funnel: should log a Shadow beat
      adj('shadow', -2);                              // recovery: should NOT log
      const len = (char.timeline || []).length;       // expect 2 (xp + shadow gain)
      const types = (char.timeline || []).map(e => e.type);
      openTimeline();
      const shown = document.getElementById('timeline-overlay').classList.contains('show');
      const rows = document.querySelectorAll('#timeline-body div').length;
      closeTimeline();
      char.timeline = []; char.shadow = before; saveCharacter();
      return { len, types, shown, rows };
    });
    checks.push({ ok: tl.len === 2 && tl.types.includes('shadow') && tl.types.includes('xp'), msg: `timeline logs xp + Shadow-gain via adj, skips recovery (len ${tl.len}, types ${tl.types.join('/')})` });
    checks.push({ ok: tl.shown && tl.rows === 2, msg: `timeline viewer lists entries (${tl.rows} rows)` });

    // U4-swipe — synthetic touch swipe left switches to the next visible tab.
    const swipe = await page.evaluate(() => {
      document.querySelector('.tab[data-tab="character"]').click();
      const panel = document.querySelector('.panel.active');
      const mk = (x, y) => new Touch({ identifier: 1, target: panel, clientX: x, clientY: y });
      panel.dispatchEvent(new TouchEvent('touchstart', { touches: [mk(300, 300)], changedTouches: [mk(300, 300)], bubbles: true }));
      panel.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [mk(120, 310)], bubbles: true }));
      const after = document.querySelector('.tab.active')?.dataset.tab;
      document.querySelector('.tab[data-tab="character"]').click();
      return { after };
    });
    checks.push({ ok: swipe.after === 'skills', msg: `swipe left advances to next visible tab (got ${swipe.after})` });

    // U3-collapse — tap a card title toggles + persists; aria-expanded flips.
    const col = await page.evaluate(() => {
      localStorage.removeItem('tor2e-collapsed');
      const h = document.querySelector('#panel-character .card h3.card-title.collapsible, #panel-character .card h2.collapsible');
      if (!h) return { found: false };
      const card = h.closest('.card');
      h.click();
      const collapsed = card.classList.contains('collapsed');
      const savedAfter = Object.keys(JSON.parse(localStorage.getItem('tor2e-collapsed') || '{}')).length;
      const ariaCollapsed = h.getAttribute('aria-expanded');
      h.click();
      const expanded = !card.classList.contains('collapsed');
      const savedCleared = Object.keys(JSON.parse(localStorage.getItem('tor2e-collapsed') || '{}')).length;
      return { found: true, collapsed, savedAfter, ariaCollapsed, expanded, savedCleared };
    });
    checks.push({ ok: col.found && col.collapsed && col.savedAfter === 1 && col.ariaCollapsed === 'false' && col.expanded && col.savedCleared === 0, msg: 'collapsible card toggles, persists, aria-expanded flips' });

    // U7-hints — (?) buttons injected; tapping one opens the styled modal with the term.
    const hint = await page.evaluate(async () => {
      const btns = document.querySelectorAll('#panel-character .hint-q');
      if (!btns.length) return { count: 0 };
      btns[0].click();
      await new Promise(r => setTimeout(r, 80));
      const ov = document.getElementById('styled-modal-overlay');
      const shown = ov.classList.contains('show');
      const body = document.getElementById('styled-modal-body').textContent;
      const ok = document.querySelector('#styled-modal-buttons button'); if (ok) ok.click();
      await new Promise(r => setTimeout(r, 50));
      return { count: btns.length, shown, hasText: body.length > 20 };
    });
    checks.push({ ok: hint.count >= 5 && hint.shown && hint.hasText, msg: `hint (?) buttons injected (${hint.count}) and open a styled explanation` });

    // U14-nudge — 14-day threshold fires once, then throttles; fresh install just stamps a baseline.
    const nudge = await page.evaluate(() => {
      localStorage.removeItem('tor2e-lastexport'); localStorage.removeItem('tor2e-lastnudge');
      const fresh = maybeBackupNudge();                                   // stamps baseline, no toast
      const stamped = !!localStorage.getItem('tor2e-lastexport');
      localStorage.setItem('tor2e-lastexport', String(Date.now() - 20 * 86400000));
      const fires = maybeBackupNudge();
      const throttled = maybeBackupNudge();
      const toast = !!document.querySelector('#toast-wrap div');
      localStorage.removeItem('tor2e-lastexport'); localStorage.removeItem('tor2e-lastnudge');
      return { fresh, stamped, fires, throttled, toast };
    });
    checks.push({ ok: nudge.fresh === false && nudge.stamped && nudge.fires === true && nudge.throttled === false && nudge.toast, msg: 'backup nudge: baseline on fresh, fires at 14d, throttles, toasts' });

    // P8-minor — generated weapon reorder/remove buttons carry aria-labels.
    const wAria = await page.evaluate(() => {
      char.weapons = [{ name: 'Spear', dmg: '4', inj: '14', picked: true }];
      renderWeapons();
      const btns = Array.from(document.querySelectorAll('#weapon-tbody button'));
      const ok = btns.length >= 3 && btns.every(b => (b.getAttribute('aria-label') || '').includes('Spear'));
      char.weapons = []; saveCharacter(); renderWeapons();
      return ok;
    });
    checks.push({ ok: wAria, msg: 'weapon ▲▼× buttons carry aria-labels' });

    // Dice-tab QoL (2026-07-02): quick-roll grid sits right above the Roll button (result is
    // right below it), and roll history is deletable (per-row × + clear-all).
    const diceQol = await page.evaluate(async () => {
      const out = {};
      const qs = document.getElementById('quick-skills');
      const rollBtn = document.querySelector('#panel-dice .roll-btn');
      const result = document.getElementById('roll-result');
      // DOM order: quick-skills → roll button → result
      out.gridAboveBtn = !!(qs.compareDocumentPosition(rollBtn) & Node.DOCUMENT_POSITION_FOLLOWING);
      out.btnAboveResult = !!(rollBtn.compareDocumentPosition(result) & Node.DOCUMENT_POSITION_FOLLOWING);
      // History delete: seed 3 fake rolls, delete one by index, then clear all (confirm stubbed).
      history.length = 0;
      history.push({ label: 'A', total: 10, tn: 14, outcome: 'FAIL', icons: 0, time: '1:00' },
                   { label: 'B', total: 18, tn: 14, outcome: 'SUCCESS', icons: 1, time: '1:01' },
                   { label: 'C', total: 12, tn: 14, outcome: 'FAIL', icons: 0, time: '1:02' });
      saveHistory(); renderHistory();
      out.rowDeleteBtns = document.querySelectorAll('#roll-history .history-item button').length === 3;
      deleteRollAt(1);
      out.afterRowDelete = history.length === 2 && history.every(h => h.label !== 'B');
      const origConfirm = window.confirmStyled; window.confirmStyled = async () => true;
      await clearRollHistory();
      window.confirmStyled = origConfirm;
      out.afterClear = history.length === 0 && /No rolls yet/.test(document.getElementById('roll-history').innerHTML);
      return out;
    });
    checks.push({ ok: diceQol.gridAboveBtn && diceQol.btnAboveResult, msg: 'dice tab order: quick-roll grid → Roll button → result' });
    checks.push({ ok: diceQol.rowDeleteBtns && diceQol.afterRowDelete && diceQol.afterClear, msg: 'roll history: per-row × deletes, 🗑 clear-all empties' });

    // 2026-07-02: skill name leads the visible result summary; oracle history is deletable.
    const oracleDice = await page.evaluate(async () => {
      const out = {};
      // Quick-roll Valour (meta — always in the grid) and check the summary names it.
      renderQuickSkills();
      document.querySelector('#quick-skills .quick-skill').click();
      out.nameInSummary = /Valour/.test(document.getElementById('result-summary').innerHTML);
      history.length = 0; saveHistory(); renderHistory();   // leave dice history clean
      // Oracle history: seed two rolls, per-row × the newest, then clear-all (confirm stubbed).
      oracleHistory.length = 0;
      logOracleRoll('T1', 'YES'); logOracleRoll('T2', 'NO');
      out.rowBtns = document.querySelectorAll('#oracle-history button[aria-label="Delete this oracle roll"]').length === 2;
      deleteOracleRollAt(0);   // newest first (unshift) → removes T2
      out.afterDelete = oracleHistory.length === 1 && oracleHistory[0].label === 'T1';
      const orig = window.confirmStyled; window.confirmStyled = async () => true;
      await clearOracleHistory();
      window.confirmStyled = orig;
      out.afterClear = oracleHistory.length === 0 && /No rolls yet/.test(document.getElementById('oracle-history').innerHTML);
      return out;
    });
    checks.push({ ok: oracleDice.nameInSummary, msg: 'roll result summary leads with the skill name (quick roll)' });
    checks.push({ ok: oracleDice.rowBtns && oracleDice.afterDelete && oracleDice.afterClear, msg: 'oracle history: per-row × deletes, 🗑 clear-all empties' });

    // ---- Onboarding pass (A/B/D/E/F): a newcomer must never hit a blank wall ----
    const onboard = await page.evaluate(async () => {
      const out = {};
      // A: the 'start here' banner shows while the hero has no culture, and hides once built.
      window._newcomerDismissed = false;
      char.culture = ''; renderNewcomerBanner();
      const host = document.getElementById('newcomer-banner');
      out.bannerWhenBlank = host.style.display !== 'none' && /Start here/i.test(host.innerText);
      out.bannerLinksBuild = /Build my hero/.test(host.innerText);
      char.culture = 'Bardings'; renderNewcomerBanner();
      out.bannerHiddenWhenBuilt = host.style.display === 'none';
      char.culture = '';                                   // restore blank for the E check below

      // B: data-hint elements get a (?) that resolves to real Reference text.
      initHintButtons();
      out.hintBtns = document.querySelectorAll('[data-hint] .hint-q').length;
      out.hintResolves = !!hintRow('Ill-Favoured') && !!hintRow('The Oracle') && !!hintRow('Resistance');
      out.hintIdempotent = (initHintButtons(), document.querySelectorAll('[data-hint] .hint-q').length) === out.hintBtns;

      // D: every tab opens with an explanation — all 14, not just the 5 that were bare.
      const ALL_TABS = ['character','skills','combat','journey','council','gear','dice','reference','oracle','band','battle','chronicle','build','gm'];
      out.intros = ['character','combat','journey','dice','chronicle']
        .filter(t => document.querySelector('#panel-' + t + ' .tab-intro')).length;
      out.introsAll = ALL_TABS.filter(t => {
        const p = document.querySelector('#panel-' + t);
        // reference/skills/etc. explain themselves via their own leading .hint; accept either.
        return p && (p.querySelector('.tab-intro') || (p.querySelector('.card .hint') && p.querySelector('.card .hint').innerText.trim().length > 80));
      }).length;
      // B (deep pass): the jargon-dense solo tabs must carry hints, not just the Character tab.
      out.hintsByTab = {};
      ALL_TABS.forEach(t => {
        const p = document.querySelector('#panel-' + t);
        out.hintsByTab[t] = p ? p.querySelectorAll('[data-hint]').length : 0;
      });
      out.tabsWithHints = Object.values(out.hintsByTab).filter(n => n > 0).length;
      // every data-hint in the document must resolve to real text (no dead (?) buttons)
      out.deadHints = [...document.querySelectorAll('[data-hint]')].map(e => e.dataset.hint).filter(t => !hintRow(t));

      // E: rolling with no hero warns once, then never again.
      let seen = 0; const origAlert = window.alertStyled;
      window.alertStyled = async () => { seen++; };
      window._blankRollWarned = false;
      rollDice(); rollDice();
      window.alertStyled = origAlert;
      out.blankWarnOnce = seen === 1;

      // F: the menu is grouped and the solo entry says what it means.
      out.menuGroups = document.querySelectorAll('#menu-overlay .menu-group').length;
      out.soloLabel = /Solo Play/.test(document.getElementById('strider-mode-btn').textContent);
      return out;
    });
    checks.push({ ok: onboard.bannerWhenBlank && onboard.bannerLinksBuild, msg: 'newcomer banner shows on a blank hero and points at Build' });
    checks.push({ ok: onboard.bannerHiddenWhenBuilt, msg: 'newcomer banner hides once a culture is applied' });
    checks.push({ ok: onboard.hintBtns >= 8, msg: `data-hint (?) buttons attach app-wide (got ${onboard.hintBtns})` });
    checks.push({ ok: onboard.hintResolves, msg: 'hint lookup resolves terms/solo/council vocabulary' });
    checks.push({ ok: onboard.hintIdempotent, msg: 'initHintButtons is idempotent (no duplicate ? buttons)' });
    checks.push({ ok: onboard.intros === 5, msg: `the 5 bare tabs gained an intro card (got ${onboard.intros})` });
    checks.push({ ok: onboard.introsAll === 14, msg: `all 14 tabs open with an explanation (got ${onboard.introsAll})` });
    checks.push({ ok: onboard.tabsWithHints >= 13, msg: `(?) hints reach 13+ of 14 tabs (got ${onboard.tabsWithHints})` });
    checks.push({ ok: onboard.hintsByTab.band >= 10 && onboard.hintsByTab.battle >= 8, msg: `Moria Band/Battle jargon is hinted (band ${onboard.hintsByTab.band}, battle ${onboard.hintsByTab.battle})` });
    checks.push({ ok: onboard.deadHints.length === 0, msg: `no data-hint points at missing text (dead: ${onboard.deadHints.join(', ') || 'none'})` });
    checks.push({ ok: onboard.blankWarnOnce, msg: 'rolling with no hero built warns exactly once' });
    checks.push({ ok: onboard.menuGroups >= 6, msg: `menu is grouped into sections (got ${onboard.menuGroups})` });
    checks.push({ ok: onboard.soloLabel, msg: 'solo toggle is labelled in plain language (Solo Play)' });

    // ---- Sequence-of-play ordering (2026-08-20) ----
    const seq = await page.evaluate(async () => {
      const out = {};
      char.striderMode = true; char.moriaMode = true; saveCharacter(); refreshStriderUI(); render();
      const titles = t => [...document.querySelectorAll('#panel-' + t + ' .card .card-title')].map(e => e.innerText.trim());

      // Band reads in play order: recruit -> plan -> state -> act, numbered on screen.
      const band = titles('band');
      out.bandOrder = /^1 · Allies/.test(band[0]) && /^2 ·/.test(band[1]) && /^3 ·/.test(band[2]) && /^4 · Dispositions/.test(band[3]);

      // Oracle: the two you reach for lead; reactive tables sit below the generators.
      const orc = titles('oracle').join('|');
      out.oracleOrder = orc.indexOf('Telling') < orc.indexOf('Chamber') && orc.indexOf('Chamber') < orc.indexOf('Fortune Table');

      // Chronicle: write first, clock demoted, date still visible up top.
      const chr = titles('chronicle');
      out.clockLast = /Tale of Years/.test(chr[chr.length - 1]);
      out.dateTop = /\d/.test(document.getElementById('ch-date-top').textContent || '');

      // Character: the Eye sits beside Hope, not under Advancement; header pill live in solo.
      const ch = titles('character');
      // card titles are CSS-uppercased, so match case-insensitively
      out.eyeAfterHope = ch.findIndex(t => /eye of mordor/i.test(t)) === ch.findIndex(t => /^hope/i.test(t)) + 1;
      out.eyePill = document.getElementById('eye-pill').style.display !== 'none'
                    && /^👁 \d+\/\d+/.test(document.getElementById('eye-pill').textContent);

      // One XP scheme live at a time; one Fellowship Phase route at a time.
      char.experienceMode = 'session'; refreshXpMode();
      const sOn = document.getElementById('xp-session-btn').style.display !== 'none'
               && document.getElementById('xp-milestone-btn').style.display === 'none';
      char.experienceMode = 'milestone'; refreshXpMode();
      const mOn = document.getElementById('xp-milestone-btn').style.display !== 'none'
               && document.getElementById('xp-session-btn').style.display === 'none';
      out.xpExclusive = sOn && mOn;
      refreshFpEntry();
      out.fpMoria = document.getElementById('fp-wizard-btn').style.display === 'none'
                 && document.getElementById('fp-moria-note').style.display !== 'none';
      char.moriaMode = false; refreshFpEntry();
      out.fpCore = document.getElementById('fp-wizard-btn').style.display !== 'none';

      // Guards offer the trip rather than dead-ending.
      char.moriaMode = true; char.band.allies = [];
      let modalText = '';
      const orig = window.showModal;
      window.showModal = async (o) => { modalText = o.message; return null; };
      await enduranceTest();
      window.showModal = orig;
      out.guardOffersJump = /Band/.test(modalText) && /1 · Allies/.test(modalText);
      // eye pill hides outside solo
      char.striderMode = false; char.moriaMode = false; refreshEyeOfMordor();
      out.eyePillHidden = document.getElementById('eye-pill').style.display === 'none';
      return out;
    });
    checks.push({ ok: seq.bandOrder, msg: 'Band tab reads in play order, numbered 1-4' });
    checks.push({ ok: seq.oracleOrder, msg: 'Oracle: active tables lead, reactive tables demoted below generators' });
    checks.push({ ok: seq.clockLast && seq.dateTop, msg: 'Chronicle: write first, clock last, date stamped at top' });
    checks.push({ ok: seq.eyeAfterHope, msg: 'Eye of Mordor card sits directly after Hope' });
    checks.push({ ok: seq.eyePill, msg: 'Eye header pill shows EA/threshold in solo' });
    checks.push({ ok: seq.eyePillHidden, msg: 'Eye header pill hides outside solo modes' });
    checks.push({ ok: seq.xpExclusive, msg: 'only one XP scheme is live at a time' });
    checks.push({ ok: seq.fpMoria && seq.fpCore, msg: 'Fellowship Phase: Moria hides the core wizard, non-Moria restores it' });
    checks.push({ ok: seq.guardOffersJump, msg: 'sequence guard names the step and offers to go there' });

    // ---- Sequence pass 2: the non-solo tabs (2026-08-20) ----
    const seq2 = await page.evaluate(() => {
      const out = {};
      const titles = t => [...document.querySelectorAll('#panel-' + t + ' .card .card-title')].map(e => e.innerText.trim());

      // Build is the creation sequence: checklist leads, then numbered steps 1..9.
      const b = titles('build');
      out.buildChecklistFirst = /progress/i.test(b[0]);
      out.buildNumbered = /^1 ·/.test(b[1]) && b.filter(t => /^[1-9] ·/.test(t)).length === 9;
      out.lifepathOptional = b.some(t => /^optional ·/i.test(t));
      // the in-play Patron Quest roller moved off Build onto the Oracle tab
      out.pqMoved = !document.querySelector('#panel-build [onclick="rollPatronQuest()"]')
                 && !!document.querySelector('#panel-oracle [onclick="rollPatronQuest()"]');

      // Advancement reads earn -> pools -> spend -> end of phase.
      const card = [...document.querySelectorAll('#panel-character .card')]
        .find(c => /Advancement/i.test((c.querySelector('.card-title') || {}).innerText || ''));
      const steps = [...card.querySelectorAll('.adv-step')].map(e => e.innerText);
      out.advSteps = steps.length === 4 && /earn/i.test(steps[0]) && /pools/i.test(steps[1])
                  && /spend/i.test(steps[2]) && /adventuring phase/i.test(steps[3]);
      const html = card.innerHTML;
      out.earnBeforeSpend = html.indexOf('xp-session-btn') < html.indexOf("openSpendXP('skill')");

      // Dice: quick-roll grid leads, manual controls fold behind a <details>.
      const dice = document.getElementById('panel-dice').innerHTML;
      out.quickBeforeManual = dice.indexOf('quick-skills') < dice.indexOf('dice-manual');
      const dm = document.getElementById('dice-manual');
      out.manualFolds = dm && dm.tagName === 'DETAILS' && !!dm.querySelector('.dice-controls');
      // the manual controls must still be reachable + wired
      out.manualIntact = !!dm.querySelector('#success-count') && !!dm.querySelector('#fav-pick') && !!dm.querySelector('#tn-pick');

      // GM: party dashboard above the occasional group test.
      const gm = document.getElementById('panel-gm').innerHTML;
      out.gmPartyFirst = gm.indexOf('gm-party-body') < gm.indexOf('Group Shadow Test');
      return out;
    });
    checks.push({ ok: seq2.buildChecklistFirst, msg: 'Build leads with the progress checklist' });
    checks.push({ ok: seq2.buildNumbered, msg: 'Build creation steps are numbered 1-9 in order' });
    checks.push({ ok: seq2.lifepathOptional, msg: 'Lifepath is marked an optional side-path, not a step' });
    checks.push({ ok: seq2.pqMoved, msg: 'Patron Quest moved off Build to the Oracle tab' });
    checks.push({ ok: seq2.advSteps, msg: 'Advancement is split earn → pools → spend → end phase' });
    checks.push({ ok: seq2.earnBeforeSpend, msg: 'Award XP sits above the Spend buttons' });
    checks.push({ ok: seq2.quickBeforeManual, msg: 'Dice tab leads with quick-rolls, manual controls below' });
    checks.push({ ok: seq2.manualFolds && seq2.manualIntact, msg: 'manual dice controls fold away but stay intact' });
    checks.push({ ok: seq2.gmPartyFirst, msg: 'GM tab leads with the party dashboard' });

    // ---- Idiot-proofing sweep 2: no dead-end guards, no unexplained modal notation ----
    const sweep = await page.evaluate(async () => {
      const out = {};
      char.culture = 'Bardings'; char.calling = 'Warden'; char.weapons = []; char.wounded = false;
      char.journey = { active: true, totalHexes: 6, currentHex: 0, nextEventHex: null, events: [], roles: {} };
      saveCharacter();

      // Every one of these guards must go through requireStep (a modal that offers the trip),
      // never a bare alert that names a place and abandons you there.
      const seen = [];
      const origModal = window.showModal, origAlert = window.alert;
      window.showModal = async (o) => { seen.push({ via: 'modal', msg: o.message, btns: (o.buttons || []).map(b => b.label) }); return null; };
      window.alert = (m) => seen.push({ via: 'alert', msg: String(m) });

      addFoeFromBestiary(0);
      await heroAttackFoe(enc().foes[0].id);   // no weapon equipped
      resolveJourneyEvent();                   // no event scheduled
      rollFirstAid();                          // not Wounded

      window.showModal = origModal; window.alert = origAlert;
      out.guardCount = seen.length;
      out.allViaModal = seen.length > 0 && seen.every(x => x.via === 'modal');
      out.allOfferJump = seen.every(x => (x.btns || []).some(b => /take me there/i.test(b)) || /tap|scroll|card/i.test(x.msg));
      out.noBareAlert = !seen.some(x => x.via === 'alert');

      // Picker modals must define their own notation.
      openWeaponPicker();
      out.weaponLegend = /Dmg/.test(document.getElementById('weapon-list').innerText)
                      && /Endurance taken off/.test(document.getElementById('weapon-list').innerText);
      openArmourPicker();
      out.armourLegend = /Protection dice/.test(document.getElementById('armour-list').innerText);
      openBestiary();
      out.bestiaryLegend = /how monstrous|Might/.test(document.getElementById('bestiary-list').innerText)
                        && /Damage 5, Injury 16/.test(document.getElementById('bestiary-list').innerText);
      document.querySelectorAll('.menu-overlay.show').forEach(o => o.classList.remove('show'));

      // Every overlay must have a visible way out (not just Escape).
      out.noTrap = [...document.querySelectorAll('.menu-overlay')].filter(o => o.id !== 'styled-modal-overlay')
        .every(o => [...o.querySelectorAll('button')].some(b => /close|cancel|skip|done|back|×/i.test(b.textContent || '')));

      out.setupDefaults = ['c-resistance-pick', 'c-attitude-pick', 'se-resistance-pick', 'se-time-pick', 'se-risk-pick']
        .map(id => document.getElementById(id))
        .filter(Boolean)
        .every(row => !!row.querySelector('.seg-btn.active'));

      // The notation terms must resolve for the (?) system too.
      out.termsResolve = ['Damage', 'Injury', 'Protection', 'Might', 'Hate', 'Adversary stat line']
        .every(t => !!hintRow(t));
      return out;
    });
    checks.push({ ok: sweep.guardCount === 3, msg: `sequence guards fire on wrong-order actions (got ${sweep.guardCount})` });
    // Council/Endeavour can't be started unconfigured at all — their setup rows ship with a
    // selected default, so the guard is unreachable. That is the stronger property; pin it.
    checks.push({ ok: sweep.setupDefaults, msg: 'Council + Endeavour setup rows have safe defaults (cannot start unconfigured)' });
    checks.push({ ok: sweep.allViaModal && sweep.noBareAlert, msg: 'no guard falls back to a bare alert()' });
    checks.push({ ok: sweep.allOfferJump, msg: 'every guard names the next step or offers the trip' });
    checks.push({ ok: sweep.weaponLegend, msg: 'weapon picker explains Dmg / Inj / Load' });
    checks.push({ ok: sweep.armourLegend, msg: 'armour picker explains Protection dice' });
    checks.push({ ok: sweep.bestiaryLegend, msg: 'bestiary explains the adversary stat line' });
    checks.push({ ok: sweep.noTrap, msg: 'no overlay traps the user without a visible exit' });
    checks.push({ ok: sweep.termsResolve, msg: 'combat notation terms resolve in the (?) vocabulary' });

    // ---- Dead-hint guard + Combat/GM hint parity ----
    // _attachHint renders NOTHING for a term hintRow() can't resolve, so a typo (or a lookup that
    // is case-sensitive when the markup isn't) silently removes the (?) with no error anywhere.
    // This caught data-hint="Stance" resolving to nothing because STANCE_INFO is keyed lowercase.
    const hints = await page.evaluate(() => {
      char.striderMode = true; char.moriaMode = true;
      localStorage.setItem('tor2e-gm', '1');
      saveCharacter(); refreshStriderUI();
      if (window.refreshGmUI) refreshGmUI();
      render(); initHintButtons();
      const all = [...document.querySelectorAll('[data-hint]')];
      const dead = all.map(e => e.dataset.hint).filter(t => !hintRow(t));
      const rendered = t => document.querySelectorAll('#panel-' + t + ' .hint-q').length;
      return {
        total: all.length,
        dead,
        // every data-hint element must actually carry a rendered (?) button
        allRendered: all.every(e => !!e.querySelector('.hint-q')),
        combat: rendered('combat'), gm: rendered('gm'),
        thinTabs: ['character','skills','combat','journey','council','dice','oracle','band','battle','chronicle','build','gm']
          .filter(t => rendered(t) === 0),
        stanceResolves: !!hintRow('Stance') && !!hintRow('Forward') && !!hintRow('forward')
      };
    });
    checks.push({ ok: hints.dead.length === 0, msg: `every data-hint resolves to real text (dead: ${hints.dead.join(', ') || 'none'})` });
    checks.push({ ok: hints.allRendered, msg: 'every data-hint element renders a (?) button' });
    checks.push({ ok: hints.stanceResolves, msg: 'stance lookup works for Stance/Forward/forward (case-insensitive)' });
    checks.push({ ok: hints.combat >= 8, msg: `Combat tab has point-of-use hints (got ${hints.combat})` });
    checks.push({ ok: hints.gm >= 4, msg: `GM tab has point-of-use hints (got ${hints.gm})` });
    // Every jargon-carrying tab must have at least one (?); Reference IS the glossary, Gear is
    // free text, so those two are exempt by design.
    checks.push({ ok: hints.thinTabs.length === 0, msg: `no jargon tab left without a (?) (thin: ${hints.thinTabs.join(', ') || 'none'})` });
    checks.push({ ok: hints.total >= 24, msg: `data-hint coverage held (got ${hints.total})` });

    // ---- Tutorial integrity + sandbox recovery ----
    const tut = await page.evaluate(() => {
      const out = {};
      // Every lesson step must point at a real tab and a resolvable selector, and carry copy.
      out.lessons = TUTORIAL_LESSONS.length;
      out.steps = TUTORIAL_LESSONS.reduce((n, L) => n + L.steps.length, 0);
      const bad = [];
      TUTORIAL_LESSONS.forEach(L => L.steps.forEach((st, i) => {
        if (st.tab && !document.getElementById('panel-' + st.tab)) bad.push(L.id + '#' + i + ' tab');
        if (st.sel) { try { if (!document.querySelector(st.sel)) bad.push(L.id + '#' + i + ' sel'); } catch (e) { bad.push(L.id + '#' + i + ' badsel'); } }
        if (!st.body || st.body.length < 20) bad.push(L.id + '#' + i + ' body');
      }));
      out.bad = bad;
      // The sandbox must be persisted, so closing the app mid-lesson can be unwound.
      char.name = 'RealHero'; saveCharacter();
      const realId = activeCharId;
      openTutorial();
      out.persisted = !!localStorage.getItem('tor2e-tut-sandbox');
      out.swapped = activeCharId !== realId;
      const sb = JSON.parse(localStorage.getItem('tor2e-tut-sandbox') || '{}');
      out.remembersReal = sb.prevActiveId === realId;
      // …and cleared once the tutorial is properly exited.
      const origConfirm = window.confirmStyled;
      window.confirmStyled = async () => false;          // "discard the practice hero"
      return { out, cleanup: true, origSet: true };
    });
    // finish the exit outside the first evaluate so the async dialog can resolve
    const tut2 = await page.evaluate(async () => {
      await _tutExitSandbox();
      return { cleared: !localStorage.getItem('tor2e-tut-sandbox'), back: char.name };
    });
    checks.push({ ok: tut.out.lessons === 10 && tut.out.steps === 57, msg: `tutorial has 10 lessons / 57 steps (got ${tut.out.lessons}/${tut.out.steps})` });
    checks.push({ ok: tut.out.bad.length === 0, msg: `every tutorial step resolves its tab+selector and has copy (bad: ${tut.out.bad.slice(0, 4).join(', ') || 'none'})` });
    checks.push({ ok: tut.out.persisted && tut.out.swapped && tut.out.remembersReal, msg: 'tutorial sandbox is persisted and remembers the real hero' });
    checks.push({ ok: tut2.cleared, msg: 'exiting the tutorial clears the persisted sandbox' });
    checks.push({ ok: tut2.back === 'RealHero', msg: 'discarding the practice hero restores the real one' });

    // ---- Build progress is real, and dice say what they are ----
    const build = await page.evaluate(() => {
      const out = {};
      const txt = () => document.getElementById('build-checklist').innerText;
      // blank hero: nothing ticked (DEFAULT_CHARACTER carries placeholder ratings, which must NOT count)
      char = JSON.parse(JSON.stringify(DEFAULT_CHARACTER)); saveCharacter(); render();
      out.blankTicks = (txt().match(/✓/g) || []).length;
      out.blankShowsTotal = /0 of \d+ done/.test(txt());
      out.hasJumpLinks = /Combat tab|Character tab/.test(txt());
      // fully built hero: everything ticked + the done message
      Object.assign(char, { culture: 'Bardings', calling: 'Warden', strRating: 5, hrtRating: 4, witRating: 3,
        name: 'Beran', age: 32, safeHaven: 'Lake-town', features: 'Bold', standard: 'Common',
        weapons: [{ name: 'Sword', dmg: 4 }], armourProt: 2, usefulItems: ['Rope'], skills: { Athletics: 2 } });
      saveCharacter(); render();
      const t = txt();
      out.allTicked = /(\d+) of \1 done/.test(t.replace(/(\d+) of (\d+) done/, (m,a,bb) => a===bb ? '9 of 9 done' : m)) || /11 of 11 done/.test(t);
      out.readyMsg = /hero is ready/i.test(t);
      // dice must name themselves (a newcomer sees three coloured boxes otherwise)
      diceState.success = 2; rollDice('Athletics');
      const dice = [...document.querySelectorAll('#result-dice > div')];
      out.diceCount = dice.length;
      out.allLabelled = dice.every(d => /^(Feat|Success) die/.test(d.getAttribute('aria-label') || ''));
      out.featCarriesValue = /Feat die.*\d|Eye of Sauron|Gandalf rune/.test(dice[0].getAttribute('aria-label') || '');
      out.titlesToo = dice.every(d => !!d.getAttribute('title'));
      return out;
    });
    checks.push({ ok: build.blankTicks === 0 && build.blankShowsTotal, msg: 'build checklist ticks nothing on a blank hero' });
    checks.push({ ok: build.hasJumpLinks, msg: 'build checklist links to the tabs that satisfy each item' });
    checks.push({ ok: build.allTicked && build.readyMsg, msg: 'build checklist completes and says the hero is ready' });
    checks.push({ ok: build.diceCount === 3 && build.allLabelled, msg: 'every rendered die is labelled Feat/Success' });
    checks.push({ ok: build.featCarriesValue && build.titlesToo, msg: 'die labels carry the rolled value (title + aria-label)' });

    // ---- No silent refusals: a tapped button must never do nothing without saying why ----
    const silent = await page.evaluate(async () => {
      const out = {};
      let said = '';
      const oal = window.alertStyled;
      window.alertStyled = async (m, t) => { said = String(t || m); };

      // Previous Experience picker (Build step 3) — the creation step everyone touches.
      Object.assign(char, { culture: 'Bardings', skills: { Athletics: { rating: 4, favoured: false } },
        skillsBaseline: { Athletics: 1 }, peSpent: 0 });
      saveCharacter();
      said = ''; adjPE('skill', 'Athletics', 1);  out.peCap = said;
      char.skills.Athletics.rating = 1;
      said = ''; adjPE('skill', 'Athletics', -1); out.peFloor = said;

      // Favoured pickers (Build step 4) refuse a third pick — they used to do it silently.
      char.callingFavoured = ['Awe', 'Athletics'];
      said = ''; toggleCallingFavoured('Insight'); out.favLimit = said;
      out.favUnchanged = char.callingFavoured.length === 2;
      char.masteryFavoured = ['Awe', 'Athletics'];
      said = ''; toggleMasteryFavoured('Insight'); out.masteryLimit = said;

      // Special-success spends with no icons banked.
      char.striderMode = true; saveCharacter();
      said = ''; applySpecialSuccess('insight'); out.noIcons = said;

      // GM NPC ledger with an empty name field.
      said = ''; if (typeof gmAddNpc === 'function') gmAddNpc(); out.npcNoName = said;

      window.alertStyled = oal;
      return out;
    });
    checks.push({ ok: /cap/i.test(silent.peCap), msg: 'PE picker explains the creation cap instead of ignoring the tap' });
    checks.push({ ok: /minimum|culture/i.test(silent.peFloor), msg: 'PE picker explains the culture minimum' });
    checks.push({ ok: /picked/i.test(silent.favLimit) && silent.favUnchanged, msg: 'Calling favoured picker explains the 2-pick limit' });
    checks.push({ ok: /picked/i.test(silent.masteryLimit), msg: 'Mastery favoured picker explains the 2-pick limit' });
    checks.push({ ok: /icons/i.test(silent.noIcons), msg: 'special-success spend explains when no ✦ icons remain' });
    checks.push({ ok: /name/i.test(silent.npcNoName), msg: 'GM NPC ledger asks for a name instead of ignoring Add' });

    // ---- Glossary hygiene: no duplicate entries, no term left leaning on undefined jargon ----
    // Two passes independently added 'Stance' and 'Eye of Mordor', so the Reference tab rendered
    // each twice with different wording, and hintRow() silently returned whichever came first.
    const gloss = await page.evaluate(() => {
      const groups = ['terms', 'tn', 'conditions', 'solo', 'combatTasks'];
      const all = [];
      groups.forEach(g => (REFERENCE[g] || []).forEach(([t, d]) => all.push({ t, d: String(d) })));
      const seen = {};
      all.forEach(x => { const k = x.t.toLowerCase(); seen[k] = (seen[k] || 0) + 1; });
      return {
        total: all.length,
        dupes: Object.entries(seen).filter(([, v]) => v > 1).map(([k]) => k),
        // the core creation/combat vocabulary other definitions lean on must itself be defined
        coreDefined: ['Reward', 'Virtue', 'Success die', 'Piercing Blow', 'Resolve', 'Combat Task',
                      'Eye Awareness', 'Revelation Episode'].filter(t => !hintRow(t)),
        // no entry may be empty or a stub
        stubs: all.filter(x => x.d.replace(/<[^>]+>/g, '').trim().length < 25).map(x => x.t)
      };
    });
    checks.push({ ok: gloss.dupes.length === 0, msg: `no duplicate glossary terms (dupes: ${gloss.dupes.join(', ') || 'none'})` });
    checks.push({ ok: gloss.coreDefined.length === 0, msg: `core vocabulary is defined (missing: ${gloss.coreDefined.join(', ') || 'none'})` });
    checks.push({ ok: gloss.stubs.length === 0, msg: `no stub definitions (stubs: ${gloss.stubs.join(', ') || 'none'})` });
    checks.push({ ok: gloss.total >= 90, msg: `glossary coverage held (${gloss.total} entries)` });

    // ---- Solo players have no Loremaster and no Company; the copy must not assume otherwise ----
    const solo = await page.evaluate(() => {
      const out = {};
      const council = () => document.querySelector('#panel-council .hint').innerText;
      char.striderMode = false; saveCharacter(); refreshStriderUI();
      const group = council();
      char.striderMode = true; saveCharacter(); refreshStriderUI();
      const s = council();
      char.striderMode = false; saveCharacter(); refreshStriderUI();
      out.swaps = group !== s && /Company/.test(group) && !/Company/.test(s);
      out.lossless = council() === group;          // toggling back restores the group wording
      // the Gather Rumours undertaking points a solo player at the Oracle, not a Loremaster
      char.striderMode = true; saveCharacter();
      const u = FP_UNDERTAKINGS.find(x => x.id === 'gather-rumours');
      out.fpSolo = /Oracle/.test(soloWord(u.desc, u.descSolo || u.desc));
      char.striderMode = false; saveCharacter();
      out.fpGroup = /Loremaster/.test(soloWord(u.desc, u.descSolo || u.desc));
      // no solo-visible glossary entry may leave "the Loremaster" unexplained as someone else
      const bad = [];
      ['terms', 'tn', 'conditions', 'solo'].forEach(g => (REFERENCE[g] || []).forEach(([t, d]) => {
        const txt = String(d);
        // A mention is fine when the entry also explains the role to a soloist ("stand-in for the
        // Loremaster", "you in solo play"). It is only a defect when it assumes someone else is there.
        if (/Loremaster/.test(txt) && !/solo|you do|you in solo|stand-in for the Loremaster|with no Loremaster/i.test(txt)) bad.push(t);
      }));
      out.unqualified = bad;
      return out;
    });
    checks.push({ ok: solo.swaps, msg: 'group-play wording swaps to solo wording when solo mode is on' });
    checks.push({ ok: solo.lossless, msg: 'toggling solo off restores the original group wording' });
    checks.push({ ok: solo.fpSolo && solo.fpGroup, msg: 'Gather Rumours points solo players at the Oracle, groups at the Loremaster' });
    checks.push({ ok: solo.unqualified.length === 0, msg: `glossary never assumes a Loremaster exists (bad: ${solo.unqualified.join(', ') || 'none'})` });

    checks.push({ ok: errors.length === 0, msg: `0 page errors (got ${errors.length})` });
    await context.close();
    return { checks };
  }
};
