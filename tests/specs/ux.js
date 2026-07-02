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
      return { groups, hasWeary: all.includes('Weary'), hasStealth: all.includes('Stealth'), filterShowsStealth: filtered.includes('Stealth'), filterHidesWeary: !filtered.includes('Weary') };
    });
    checks.push({ ok: ref.groups === 6, msg: `Reference renders 6 groups (got ${ref.groups})` });
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

    checks.push({ ok: errors.length === 0, msg: `0 page errors (got ${errors.length})` });
    await context.close();
    return { checks };
  }
};
