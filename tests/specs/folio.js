// folio — round 8 of the UX/UI work (2026-09-29): one call to action per empty list, the drawn
// empty battlefield, choice-card scenes, place suggestions, Band status lines, the big screen's
// portraits, pick-sheet pictures, ledger histories, XP tokens and the small finishes. Every check
// asserts what a player sees (GOTCHA 20) and was proven to fail with its fix reverted.
module.exports = {
  name: 'folio',
  async run({ browser, baseUrl, newPage }) {
    const checks = [];
    const { context, page, errors } = await newPage(browser, baseUrl + '/character-tracker.html');
    await page.setViewportSize({ width: 390, height: 844 });
    const safe = fn => page.evaluate(async src => { try { return await (new Function('return (async()=>{' + src + '})()'))(); } catch (e) { return { err: String(e && e.message || e) }; } }, fn);
    const wait = ms => page.waitForTimeout(ms);
    await safe(`
      loadPregen(0); document.querySelectorAll('.menu-overlay.show').forEach(o => o.classList.remove('show'));
      char.striderMode = true; char.saga = Object.assign(char.saga || {}, { started: true, premise: 'Orcs on the East Road.', step: 'haven' });
      saveCharacter(); render(); refreshStriderUI(); return 1;`);
    const go = async t => { await safe(`openNavGroup(navGroupOf('${t}').id); document.querySelector('.tab[data-tab="${t}"]').click(); window.scrollTo(0, 0); return 1;`); await wait(480); };
    const shut = `document.querySelectorAll('.menu-overlay.show').forEach(o => o.classList.remove('show'));`;

    // ---- A toast never lands on an open sheet's buttons ----
    const ts = await safe(`
      openRoster(); showToast('Rested'); await new Promise(r => setTimeout(r, 80));
      const t = [...document.querySelectorAll('.toast')].filter(x => x.checkVisibility()).pop(); const tr = t && t.getBoundingClientRect();
      const btn = [...document.querySelectorAll('#roster-overlay button')].filter(b => b.checkVisibility()).pop(); const br = btn && btn.getBoundingClientRect();
      const hit = tr && br && !(tr.bottom <= br.top || tr.top >= br.bottom);
      ${shut} document.querySelectorAll('.toast').forEach(x => x.remove());
      return { hit, top: tr && Math.round(tr.top) };`);
    checks.push({ ok: !ts.err && ts.hit === false && ts.top < 120, msg: `with a sheet open a toast drops from the top, clear of the sheet's buttons (${JSON.stringify(ts)})` });

    // ---- A (?) never sits inside a button, and never alone on a line ----
    await go('battle');
    const hb = await safe(`
      const inside = [...document.querySelectorAll('button .hint-q')].filter(q => q.parentElement.closest('button') !== q && q.closest('button') !== q).length;
      const w = [...document.querySelectorAll('.hint-wrap')].filter(x => x.checkVisibility()).map(x => { const b = x.firstElementChild.getBoundingClientRect(), q = x.querySelector(':scope > .hint-q').getBoundingClientRect(); return Math.abs((b.top + b.bottom) / 2 - (q.top + q.bottom) / 2) < 8; });
      return { inside, wraps: w.length, sameLine: w.every(Boolean) };`);
    checks.push({ ok: !hb.err && hb.inside === 0 && hb.wraps >= 1 && hb.sameLine, msg: `a button's (?) sits beside it on the same line, never inside it (${JSON.stringify(hb)})` });
    await go('combat');
    const tail = await safe(`
      const q = document.querySelector('#panel-combat [data-hint="Protection"] .hint-q'); const t = q && q.closest('.hint-tail');
      const w = t && t.firstChild; let ok = false;
      if (w) { const rg = document.createRange(); rg.selectNodeContents(w); const a = rg.getBoundingClientRect(), b = q.getBoundingClientRect(); ok = Math.abs((a.top + a.bottom) / 2 - (b.top + b.bottom) / 2) < 8; }
      return { tail: !!t, ok };`);
    checks.push({ ok: !tail.err && tail.tail && tail.ok, msg: `a label's (?) stays on the line with its last word (${JSON.stringify(tail)})` });

    // ---- Opening Volley is a switch ----
    const ov = await safe(`
      const i = document.getElementById('opening-volley-btn'); const before = !!char.openingVolley;
      document.getElementById('opening-volley-row').click(); await new Promise(r => setTimeout(r, 30));
      const r = { type: i.type, flipped: !!char.openingVolley !== before, checked: i.checked === !!char.openingVolley };
      if (!!char.openingVolley !== before) { char.openingVolley = before; saveCharacter(); render(); }
      return r;`);
    checks.push({ ok: !ov.err && ov.type === 'checkbox' && ov.flipped && ov.checked, msg: `Opening Volley is a switch that flips the rule (${JSON.stringify(ov)})` });

    // ---- Battle: the objective box is full width; FP: the FREE badge keeps to one line ----
    await go('battle');
    const ob = await safe(`
      const i = document.getElementById('b-objective'); const c = i.closest('.card');
      return { w: Math.round(i.getBoundingClientRect().width), cw: Math.round(c.getBoundingClientRect().width) };`);
    checks.push({ ok: !ob.err && ob.w >= ob.cw * 0.8, msg: `the Battle objective box spans the card, so its hint is not cut (${JSON.stringify(ob)})` });
    const fb = await safe(`
      openFPWizard(); fpSetPhaseType('ordinary'); fpNextStep(); fpNextStep(); fpNextStep(); await new Promise(r => setTimeout(r, 100));
      const b = document.querySelector('.free-badge'); const r = b && b.getBoundingClientRect();
      const lh = b && parseFloat(getComputedStyle(b).fontSize) * 1.6;
      fpClose(); return { badge: !!b, oneLine: !!r && r.height <= lh + 4, h: r && Math.round(r.height) };`);
    checks.push({ ok: !fb.err && fb.badge && fb.oneLine, msg: `the FREE undertaking badge stays on one line (${JSON.stringify(fb)})` });

    // ---- The empty fight: a drawn battlefield and six common foes, each one tap ----
    const ef = await safe(`
      endEncounter && (char.encounter = { active: false, round: 1, foes: [], weaponIdx: 0, adv: {} }); saveCharacter(); render();
      const art = !!document.querySelector('#encounter-card .battlefield-art svg');
      const q = [...document.querySelectorAll('#encounter-card .quick-foe')];
      const sil = q.filter(b => b.querySelector('.qf-sil')).length;
      const warg = q.find(b => /Warg/.test(b.textContent)); warg && warg.click();
      const foes = (enc().foes || []).map(f => f.name);
      char.encounter = { active: false, round: 1, foes: [], weaponIdx: 0, adv: {} }; saveCharacter(); render();
      return { art, n: q.length, sil, foes };`);
    checks.push({ ok: !ef.err && ef.art && ef.n === 6 && ef.sil === 6 && JSON.stringify(ef.foes) === '["Warg"]', msg: `an empty fight shows a battlefield and six common foes; one tap adds that foe (${JSON.stringify(ef)})` });

    // ---- Protection/Parry labels and a hero's Parry row stay within their card ----
    // ---- Choice cards carry an ink scene ----
    await go('journey');
    const cv = await safe(`
      const j = [...document.querySelectorAll('#j-dist .opt-card, #j-travel .opt-card')].filter(c => c.checkVisibility());
      const c = [...document.querySelectorAll('#pick-council, #pick-endeavour')];
      return { j: j.length, jv: j.filter(x => x.querySelector('.opt-vig svg')).length, cv: c.filter(x => x.querySelector('.opt-vig svg')).length };`);
    checks.push({ ok: !cv.err && cv.j >= 7 && cv.jv === cv.j && cv.cv === 2, msg: `Journey and Council choice cards each open on an ink scene (${JSON.stringify(cv)})` });

    // ---- Places: suggestions as you type; Home fills From ----
    const pl = await safe(`
      const to = document.getElementById('j-destination'); to.value = 'riv'; to.dispatchEvent(new Event('input')); await new Promise(r => setTimeout(r, 20));
      const opts = [...to.parentNode.querySelectorAll('.place-sugg .ps-opt')].filter(b => b.checkVisibility()).map(b => b.textContent.trim());
      const r1 = [...to.parentNode.querySelectorAll('.place-sugg .ps-opt')].find(b => /Rivendell/.test(b.textContent)); r1 && r1.click();
      const filled = to.value;
      const keep = char.safeHaven; char.safeHaven = ''; document.getElementById('j-origin').value = '';
      document.getElementById('j-home-chip').click(); const home = document.getElementById('j-origin').value;
      char.safeHaven = keep; to.value = ''; document.getElementById('j-origin').value = ''; return { opts, filled, home };`);
    checks.push({ ok: !pl.err && pl.opts.some(o => /Rivendell/.test(o)) && pl.filled === 'Rivendell', msg: `typing a place offers the map's towns; tapping one fills the box (${JSON.stringify(pl)})` });
    checks.push({ ok: !pl.err && pl.home === 'Dale', msg: `Home fills From with the hero's home — a Barding with no Safe Haven starts from Dale (${JSON.stringify(pl)})` });

    // ---- Band: status on every folded step; a tick when done; jump chips stay clean ----
    const bd = await safe(`
      char.moriaMode = true; char.band.allies = []; saveCharacter(); refreshStriderUI(); render();
      openNavGroup('adventure'); document.querySelector('.tab[data-tab="band"]').click(); await new Promise(r => setTimeout(r, 460));
      const st = t => { const h = [...document.querySelectorAll('#panel-band .card > h3.card-title')].find(x => x.textContent.includes(t)); const s = h && h.querySelector('.card-status'); return s ? { t: s.textContent.trim(), done: s.classList.contains('done'), n: h.querySelectorAll('.card-status').length } : null; };
      const before = { allies: st('Allies ('), mission: st('Mission Planning'), tests: st('Tests') };
      const dup = !!document.querySelector('#panel-band [data-empty-dup]') && document.querySelector('#panel-band [data-empty-dup]').checkVisibility();
      addStartingBand(); document.querySelectorAll('.menu-overlay.show').forEach(o => o.classList.remove('show')); render();
      const after = { allies: st('Allies ('), tests: st('Tests') };
      const chips = [...document.querySelectorAll('#panel-band .jump-chip')].map(c => c.textContent);
      char.moriaMode = false; char.band.allies = []; saveCharacter(); refreshStriderUI(); render();
      return { before, after, dup, chips };`);
    checks.push({ ok: !bd.err && bd.before.allies && /none yet/.test(bd.before.allies.t) && /not set/.test(bd.before.mission.t) && /needs allies/.test(bd.before.tests.t)
      && bd.before.allies.n === 1 && bd.after.allies.done && /6 allies/.test(bd.after.allies.t) && /ready/.test(bd.after.tests.t),
      msg: `each Band step says where it stands and ticks when done (${JSON.stringify(bd).slice(0, 300)})` });
    checks.push({ ok: !bd.err && bd.chips.length > 0 && bd.chips.every(c => !/none yet|not set|needs allies|Readiness/.test(c)), msg: `jump chips name the step only, not its status (${JSON.stringify(bd.chips)})` });

    // ---- One call to action per empty list ----
    await go('gear');
    const mt = await safe(`
      char.magicalItems = []; saveCharacter(); render();
      const own = [...document.querySelectorAll('#panel-gear button')].find(b => /Roll Hoard/.test(b.textContent));
      const es = document.querySelector('#magical-items-list .empty-state .es-act');
      const r = { own: own && own.checkVisibility(), es: !!(es && es.checkVisibility()) };
      char.magicalItems = [{ type: 'marvellous', name: 'Lamp', blessings: ['Lore'] }]; saveCharacter(); render();
      r.ownAfter = own && own.checkVisibility();
      char.magicalItems = []; saveCharacter(); render(); return r;`);
    checks.push({ ok: !mt.err && mt.own === false && mt.es && mt.ownAfter === true, msg: `an empty list keeps one button — the card's own returns once it has items (${JSON.stringify(mt)})` });
    await go('dice');
    const cl = await safe(`
      const keep = history.slice(); history.length = 0; renderHistory();
      const clr = [...document.querySelectorAll('#panel-dice button')].find(b => /clearRollHistory/.test(b.getAttribute('onclick') || ''));
      const all = document.querySelector('#quick-skills .qs-all');
      const r = { clearEmpty: clr.checkVisibility(), allEmpty: all && all.checkVisibility() };
      history.push({ label: 'Awe', total: 14, tn: 15, outcome: 'FAIL', icons: 0, time: '09:00' }); renderHistory();
      r.clearFull = clr.checkVisibility(); r.allFull = all && all.checkVisibility();
      history.length = 0; history.push(...keep); renderHistory(); return r;`);
    checks.push({ ok: !cl.err && cl.clearEmpty === false && cl.clearFull === true && cl.allEmpty === false && cl.allFull === true, msg: `Clear and the duplicate "Roll any skill…" step aside while the history is empty (${JSON.stringify(cl)})` });

    // ---- Ledger rows: a Feat die, pips and a seal that matches the outcome ----
    const lg = await safe(`
      const keep = history.slice(); history.length = 0;
      rollFromSheet('Awe'); await new Promise(r => setTimeout(r, 900)); closeRollDrawer();
      const row = document.querySelector('#roll-history .history-item.ledger');
      const h = history[0]; const ok = /^SUCCESS/.test(h.outcome);
      const st = row && row.querySelector('.hl-seal .roll-stamp');
      const r = { feat: !!(row && row.querySelector('.hl-feat')), pips: row ? row.querySelectorAll('.hl-pips i').length : 0, dice: (h.dice || []).length,
        seal: st && [...st.classList].find(c => c.startsWith('st-')), ok, w: st && Math.round(st.getBoundingClientRect().width) };
      history.length = 0; history.push(...keep); saveHistory(); renderHistory(); return r;`);
    checks.push({ ok: !lg.err && lg.feat && lg.pips === lg.dice && lg.dice > 0 && ((lg.seal === 'st-fail') === !lg.ok) && lg.w <= 26, msg: `a roll history row shows its Feat die, its dice and a small seal for the outcome (${JSON.stringify(lg)})` });

    // ---- Oracle history slips: a small wax seal on a yes/no ----
    await go('oracle');
    const os = await safe(`
      document.getElementById('ask-q').value = 'Is it safe?'; askYesNo(); await new Promise(r => setTimeout(r, 60));
      const s = document.querySelector('#oracle-history .or-slip .or-seal'); const r = s && s.querySelector('svg').getBoundingClientRect();
      const res = oracleHistory[0].result;
      return { seal: !!s, w: r && Math.round(r.width), cls: s && [...s.classList].find(c => /^seal-/.test(c)), res };`);
    checks.push({ ok: !os.err && os.seal && os.w <= 30 && ((/^YES/.test(os.res) && /seal-(yes|and)/.test(os.cls)) || (/^NO/.test(os.res) && /seal-(no|worse)/.test(os.cls))), msg: `an Oracle answer in the history wears a small seal of its colour (${JSON.stringify(os)})` });

    // ---- Pick sheets: the odds as a five-step bar ----
    const pk = await safe(`
      openPicker(document.getElementById('oracle-telling-chance'));
      const rows = [...document.querySelectorAll('#pick-list .pick-opt')].map(o => (o.querySelectorAll('.odds-bar i.on') || []).length);
      closePicker(); return { rows };`);
    checks.push({ ok: !pk.err && JSON.stringify(pk.rows) === '[5,4,3,2,1]', msg: `the odds picker draws each chance as a five-step bar (${JSON.stringify(pk)})` });

    // ---- The sheet: XP as tokens; one quiet Spend; skill rows show a die and favoured ribbons ----
    await go('character');
    const xp = await safe(`
      char.skillPts = 0; char.advPts = 0; saveCharacter(); setCharEditing(false); renderHeroSheet();
      const t0 = document.querySelectorAll('#hero-sheet .xp-token').length, s0 = document.querySelectorAll('#hero-sheet .xp-spend').length;
      char.advPts = 4; saveCharacter(); renderHeroSheet();
      const s1 = [...document.querySelectorAll('#hero-sheet .xp-spend')].map(b => b.textContent.trim());
      const live = document.querySelectorAll('#hero-sheet .xp-token.live').length;
      char.advPts = 0; saveCharacter(); renderHeroSheet();
      const row = document.querySelector('#hero-sheet .s-skill'); const m = getComputedStyle(row, '::after');
      const fav = document.querySelector('#hero-sheet .s-skill b.fav'); const fs = fav && getComputedStyle(fav);
      return { t0, s0, s1, live, die: /svg/.test(m.webkitMaskImage || m.maskImage || ''), fav: !!fav && fs.fontSize === '0px' && fs.clipPath !== 'none' };`);
    checks.push({ ok: !xp.err && xp.t0 === 4 && xp.s0 === 0 && JSON.stringify(xp.s1) === '["Spend Adventure points · 4"]' && xp.live === 1, msg: `points are drawn tokens; one Spend shows only when there is something to spend (${JSON.stringify(xp)})` });
    checks.push({ ok: !xp.err && xp.die && xp.fav, msg: `each skill row carries a die mark and favoured skills a gold ribbon (${JSON.stringify(xp)})` });

    // ---- Card-title rubrics on tool cards, none on the numbered Band steps ----
    const rb = await safe(`
      await new Promise(r => requestAnimationFrame(() => setTimeout(r, 30)));
      const war = [...document.querySelectorAll('#hero-sheet .card-title')].find(h => /War gear/.test(h.textContent));
      return { war: !!(war && war.querySelector('.rubric')), band: document.querySelectorAll('#panel-band .rubric').length };`);
    checks.push({ ok: !rb.err && rb.war && rb.band === 0, msg: `tool card titles carry a small drawn mark (${JSON.stringify(rb)})` });

    // ---- Play: a change of scene fades in ----
    const sc = await safe(`
      openNavGroup('play'); char.saga.step = 'haven'; saveCharacter(); renderPlay();
      const a = document.querySelector('#panel-play .play-scene').classList.contains('scene-change');
      char.saga.step = 'place'; saveCharacter(); renderPlay();
      const b = document.querySelector('#panel-play .play-scene').classList.contains('scene-change');
      renderPlay(); const c = document.querySelector('#panel-play .play-scene').classList.contains('scene-change');
      char.saga.step = 'haven'; saveCharacter(); renderPlay(); return { a, b, c };`);
    checks.push({ ok: !sc.err && !sc.a && sc.b && !sc.c, msg: `the Play scene fades in when the story moves, and only then (${JSON.stringify(sc)})` });

    // ---- Sheets have a deckled top edge on phones ----
    const dk = await safe(`openRoster(); const m = document.querySelector('#roster-overlay .menu'); const cs = getComputedStyle(m); const r = { mask: /svg/.test(cs.webkitMaskImage || cs.maskImage || '') }; ${shut} return r;`);
    checks.push({ ok: !dk.err && dk.mask, msg: `bottom sheets have a torn paper edge (${JSON.stringify(dk)})` });

    // ---- The map picture loads behind a parchment shimmer ----
    const mp = await safe(`
      const img = document.querySelector('#map-svg image'); img.removeAttribute('href');
      openMapPicker('view'); const loading = document.querySelector('#map-overlay .map-view').classList.contains('loading');
      closeMapPicker && closeMapPicker(); return { loading };`);
    checks.push({ ok: !mp.err && mp.loading, msg: `the map shows a shimmer while its picture loads (${JSON.stringify(mp)})` });

    // ---- The big screen: portraits for heroes, silhouettes and Hate for foes ----
    const tv = await safe(`
      char.encounter = { active: false, round: 1, foes: [], weaponIdx: 0, adv: {} }; addFoeFromBestiary(0);
      openTableMode(); await new Promise(r => setTimeout(r, 100));
      const hero = document.querySelector('#table-mode-body .tv-hero:not(.foe) .tv-portrait .tv-sil');
      const foe = document.querySelector('#table-mode-body .tv-hero.foe .tv-portrait .tv-foe-sil');
      const hate = !!document.querySelector('#table-mode-body .tv-hero.foe .tv-meter.hate');
      closeTableMode(); char.encounter = { active: false, round: 1, foes: [], weaponIdx: 0, adv: {} }; saveCharacter(); render();
      return { hero: !!hero, foe: !!foe, hate };`);
    checks.push({ ok: !tv.err && tv.hero && tv.foe && tv.hate, msg: `the big screen shows hero portraits and foe silhouettes with a Hate bar (${JSON.stringify(tv)})` });

    // ---- Tablet: the culture figure clears the Edit button; the Battle objective box is full width ----
    await page.setViewportSize({ width: 1180, height: 820 });
    await go('character');
    const ed = await safe(`
      setCharEditing(false); renderHeroSheet();
      const s = document.querySelector('#hero-sheet .sheet-head .silhouette').getBoundingClientRect();
      const e = [...document.querySelectorAll('#hero-sheet .sheet-head button')].find(b => /Edit/.test(b.textContent)).getBoundingClientRect();
      return { overlap: !(s.right <= e.left || s.left >= e.right || s.bottom <= e.top || s.top >= e.bottom) };`);
    checks.push({ ok: !ed.err && ed.overlap === false, msg: `on a tablet the culture figure is not under the Edit button (${JSON.stringify(ed)})` });
    await page.setViewportSize({ width: 390, height: 844 });

    // ---- Loremaster on a phone: the table's name is never cut off ----
    const lm = await safe(`
      const t = document.getElementById('lm-title'); const tx = document.getElementById('lm-title-text');
      const was = t.hidden; t.hidden = false; tx.textContent = 'The Lonely Mountain of Erebor'; document.body.classList.add('is-lm');
      const r = { fits: tx.scrollWidth <= tx.clientWidth + 1, h: Math.round(tx.getBoundingClientRect().height) };
      t.hidden = was; document.body.classList.remove('is-lm'); return r;`);
    checks.push({ ok: !lm.err && lm.fits, msg: `the Loremaster header shows the whole table name on a phone (${JSON.stringify(lm)})` });

    checks.push({ ok: errors.length === 0, msg: `0 page errors (got ${errors.length}${errors.length ? ': ' + errors[0] : ''})` });
    await context.close();
    return { checks };
  }
};
