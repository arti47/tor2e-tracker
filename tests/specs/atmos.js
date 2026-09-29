// atmos — round 7 of the UX/UI work (2026-09-29): the pictures that carry state (tallies, candles,
// badges, stamps, the iris, weather) and the fixes that came with them. Every check asserts what a
// player sees (GOTCHA 20) and was proven to fail with its fix reverted.
module.exports = {
  name: 'atmos',
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

    // ---- Council: successes as tally marks, the Time Limit as candles, the audience as faces ----
    await go('council');
    const co = await safe(`
      const b = [...document.querySelectorAll('#panel-council button')].find(x => /Persuade someone/.test(x.textContent)); b && b.click();
      const faces = document.querySelectorAll('#panel-council .face-ic').length;
      startCouncil(); document.querySelectorAll('.menu-overlay.show').forEach(o => o.classList.remove('show'));
      Object.assign(char.council, { resistance: 3, successesScored: 2, attemptsUsed: 1, timeLimit: 5 }); saveCharacter(); render();
      const r = { faces, on: document.querySelectorAll('#c-tally .tm.on').length, off: document.querySelectorAll('#c-tally .tm.off').length,
        lit: document.querySelectorAll('#c-candles .candle.lit').length, out: document.querySelectorAll('#c-candles .candle.out').length,
        tallyVis: !!document.querySelector('#c-tally svg.tally') && document.querySelector('#c-tally').checkVisibility() };
      char.council.active = false; saveCharacter(); render(); return r;`);
    checks.push({ ok: !co.err && co.on === 2 && co.off === 1 && co.tallyVis, msg: `a council's successes are tally marks against the Resistance (${JSON.stringify(co)})` });
    checks.push({ ok: !co.err && co.lit === 4 && co.out === 1, msg: `the Time Limit is a row of candles, one out per attempt (${JSON.stringify(co)})` });
    checks.push({ ok: !co.err && co.faces === 3, msg: `the audience's attitude is shown as three faces (${JSON.stringify(co)})` });

    // ---- Parry and Armour as a shield and a mail coat ----
    await go('combat');
    const cb = await safe(`return { parry: !!document.querySelector('#parry-v .stat-badge.sb-shield'), prot: !!document.querySelector('#prot-v .stat-badge.sb-mail'),
      val: (document.querySelector('#parry-v .stat-badge b') || {}).textContent };`);
    await go('character');
    const sh = await safe(`return { shield: !!document.querySelector('#hero-sheet .stat-badge.sb-shield'), mail: !!document.querySelector('#hero-sheet .stat-badge.sb-mail') };`);
    checks.push({ ok: !cb.err && cb.parry && cb.prot && /\d/.test(cb.val || '') && !sh.err && sh.shield && sh.mail, msg: `Parry is a shield and Armour a mail coat, on Combat and on the sheet (${JSON.stringify([cb, sh])})` });

    // ---- The Eye's iris warms from amber to fire as awareness rises ----
    const ey = await safe(`
      const col = () => { refreshEyeOfMordor(); const i = document.querySelector('#eye-pill .eye-iris'); return i && i.getAttribute('fill'); };
      char.eyeAwareness = 0; const lo = col(); char.eyeAwareness = 15; const hi = col(); char.eyeAwareness = 0; saveCharacter(); refreshEyeOfMordor();
      return { lo, hi, pupil: !!document.querySelector('#eye-pill .eye-pupil') };`);
    checks.push({ ok: !ey.err && ey.lo && ey.hi && ey.lo !== ey.hi && ey.pupil, msg: `the Eye pill draws an iris that changes colour with awareness (${JSON.stringify(ey)})` });

    // ---- The roll: dice on a tray, an ink stamp by the banner ----
    const rl = await safe(`
      rollFromSheet('Awe'); await new Promise(r => setTimeout(r, 1300));
      const st = document.querySelector('#roll-result .rb-row .roll-stamp'); const rb = document.querySelector('#roll-result .rb-ribbon');
      const tray = document.querySelector('#roll-result .result-dice'); const cs = tray && getComputedStyle(tray);
      const ok = !!(rb && !/fail|miss/i.test(rb.textContent));
      const r = { stamp: st && [...st.classList].find(c => c.startsWith('st-')), ok, rb: rb && rb.textContent.trim(), tray: cs && (cs.backgroundImage !== 'none' || cs.backgroundColor !== 'rgba(0, 0, 0, 0)') };
      closeRollDrawer(); return r;`);
    checks.push({ ok: !rl.err && rl.stamp && ((rl.stamp === 'st-fail') === !rl.ok), msg: `the result carries an ink stamp that matches it (${JSON.stringify(rl)})` });
    checks.push({ ok: !rl.err && rl.tray, msg: `the dice sit on a tray (${JSON.stringify(rl)})` });

    // ---- Toasts come one at a time ----
    const ts = await safe(`
      document.querySelectorAll('#toast-wrap .toast').forEach(t => t.remove());
      showToast('One'); showToast('Two'); showToast('Three'); await new Promise(r => setTimeout(r, 80));
      const all = [...document.querySelectorAll('#toast-wrap .toast')];
      const shown = all.filter(t => t.checkVisibility()).map(t => t.textContent.trim());
      all.forEach(t => t.remove()); return { n: all.length, shown };`);
    checks.push({ ok: !ts.err && ts.n === 3 && ts.shown.length === 1 && /One/.test(ts.shown[0]), msg: `toasts queue: three are sent, one shows (${JSON.stringify(ts)})` });

    // ---- Weather follows the story's season and hour ----
    const wx = await safe(`
      const set = (m, ph) => { journal.clock.month = m; journal.clock.phase = ph || 'adventuring'; saveJournal(); openNavGroup('play'); renderPlay();
        const w = document.querySelector('#panel-play .scene-weather'); return w ? [...w.classList].find(c => c.startsWith('w-')) : null; };
      const keep = JSON.stringify(journal.clock);
      const by = z => SHIRE_MONTHS.find(m => String(monthSeason(m)).toLowerCase() === z);
      const r = { winter: set(by('winter')), autumn: set(by('autumn')), summer: set(by('summer')) };
      journal.clock = JSON.parse(keep); saveJournal(); renderPlay(); return r;`);
    checks.push({ ok: !wx.err && wx.winter === 'w-snow' && wx.autumn === 'w-leaves' && wx.summer === null, msg: `the Play scene snows in winter and drops leaves in autumn (${JSON.stringify(wx)})` });

    // ---- Moria: pillars and a lantern, not dimmed by the gloom filter ----
    const mo = await safe(`
      char.moriaMode = true; saveCharacter(); refreshStriderUI(); render(); openNavGroup('play'); renderPlay(); await new Promise(r => setTimeout(r, 100));
      const a = document.querySelector('#panel-play .scene-art.t-moria');
      const r = { art: !!a, flame: !!(a && a.querySelector('.flame')), glow: !!(a && a.querySelector('.glow')), filter: a && getComputedStyle(a).filter, weather: !!document.querySelector('#panel-play .scene-weather') };
      return r;`);
    checks.push({ ok: !mo.err && mo.art && mo.flame && mo.glow && mo.filter === 'none' && !mo.weather, msg: `Moria is lit by a lantern and not greyed out (${JSON.stringify(mo)})` });

    // ---- Numbered steps wear a gilt medallion; the words stay the same ----
    await go('band');
    const md = await safe(`
      const t = [...document.querySelectorAll('#panel-band .card-title')].find(e => /Allies/.test(e.textContent) && e.querySelector('.step-med'));
      return { med: !!t, text: t && t.textContent.replace(/\\s+/g, ' ').trim().slice(0, 12) };`);
    checks.push({ ok: !md.err && md.med && /^1 · Allies/.test(md.text || ''), msg: `Band step numbers sit in medallions and still read "1 · Allies" (${JSON.stringify(md)})` });
    await safe(`char.moriaMode = false; saveCharacter(); refreshStriderUI(); render(); return 1;`);

    // ---- Fellowship Phase undertakings each carry a drawing ----
    const fp = await safe(`
      openFPWizard(); fpSetPhaseType('ordinary'); fpNextStep(); fpNextStep(); fpNextStep(); await new Promise(r => setTimeout(r, 100));
      const n = document.querySelectorAll('#fp-overlay .und-ic, .fp-undertaking .und-ic, [id^="fp-step"] .und-ic').length;
      fpClose(); return { n };`);
    checks.push({ ok: !fp.err && fp.n >= 8, msg: `undertakings each have an icon (${JSON.stringify(fp)})` });

    // ---- The active nav item gets a small flourish ----
    const nv = await safe(`const a = document.querySelector('.bn-item.active'); return { bg: a && getComputedStyle(a, '::after').backgroundImage };`);
    checks.push({ ok: !nv.err && /svg/.test(nv.bg || ''), msg: `the active section is underlined with a flourish (${JSON.stringify(nv).slice(0, 80)})` });

    // ---- Chronicle: an illuminated first letter; the quill moves while you write ----
    await go('chronicle');
    const ch = await safe(`
      loadSampleChronicle(); document.querySelectorAll('.menu-overlay.show').forEach(o => o.classList.remove('show')); await new Promise(r => setTimeout(r, 100));
      const f = document.querySelector('#ch-timeline .ch-p.ch-first'); const fl = f && getComputedStyle(f, '::first-letter');
      const ta = document.getElementById('ch-compose'); ta.value = 'x'; ta.dispatchEvent(new Event('input', { bubbles: true }));
      const writing = document.getElementById('ch-quill').classList.contains('writing');
      ta.value = ''; return { first: !!f, float: fl && fl.float, size: fl && parseFloat(fl.fontSize) > parseFloat(getComputedStyle(f).fontSize) * 1.8, writing };`);
    checks.push({ ok: !ch.err && ch.first && ch.float === 'left' && ch.size, msg: `a scene opens on an illuminated letter (${JSON.stringify(ch)})` });
    checks.push({ ok: !ch.err && ch.writing, msg: `the quill beside the write box moves while you write (${JSON.stringify(ch)})` });

    // ---- Empty lists draw their own picture ----
    await go('dice');
    const em = await safe(`
      const keep = history.slice(); history.length = 0; renderHistory();
      const d = document.querySelector('#panel-dice .empty-art svg.ea-draw'); const w = d && d.getBoundingClientRect().width;
      history.push(...keep); renderHistory(); return { draw: !!d, w };`);
    checks.push({ ok: !em.err && em.draw && em.w >= 36, msg: `an empty roll history is a drawing, not a glyph (${JSON.stringify(em)})` });

    // ---- Build: the culture you are about to pick, drawn large ----
    await go('build');
    const cu = await safe(`
      const s = document.getElementById('culture-pick'); s.value = 'Hobbits of the Shire'; s.dispatchEvent(new Event('change'));
      const p = document.querySelector('#culture-info .cult-preview');
      return { crest: !!(p && p.querySelector('svg.crest')), sil: !!(p && p.querySelector('.cp-sil')), vis: !!(p && p.checkVisibility()) };`);
    checks.push({ ok: !cu.err && cu.crest && cu.sil && cu.vis, msg: `choosing a culture shows its crest and its people (${JSON.stringify(cu)})` });

    // ---- Table sheet: roll buttons are tiles with a glyph and the dice ----
    const tb = await safe(`const h = _tblRollsHtml(); const d = document.createElement('div'); d.innerHTML = h;
      const b = d.querySelector('.tbl-roll'); return { ic: !!(b && b.querySelector('.tr-ic')), pips: d.querySelectorAll('.tbl-roll .qs-pips').length, name: b && b.querySelector('strong').textContent };`);
    checks.push({ ok: !tb.err && tb.ic && tb.pips > 3, msg: `table roll buttons carry an attribute glyph and dice pips (${JSON.stringify(tb)})` });

    // ---- Phone: no hero plate. Tablet: the plate with the map where the hero stands; no mid-word tile breaks ----
    await go('play');
    const ph = await safe(`const p = document.querySelector('#panel-play .hero-plate'); return { vis: !!(p && p.checkVisibility()) };`);
    await page.setViewportSize({ width: 1180, height: 820 });
    await go('play');
    const tp = await safe(`
      const p = document.querySelector('#panel-play .hero-plate'); const m = p && p.querySelector('.haven-map');
      const meter = p && p.querySelector('.hp-meter');
      return { vis: !!(p && p.checkVisibility()), map: !!(m && m.checkVisibility()), cap: m && m.querySelector('.hm-cap').textContent, meters: !!(meter && meter.checkVisibility()) };`);
    checks.push({ ok: !ph.err && !ph.vis && !tp.err && tp.vis && tp.map && tp.cap === 'Dale' && !tp.meters,
      msg: `tablet Play shows the hero's portrait and home on the map (Bardings → Dale); phones do not (${JSON.stringify([ph, tp])})` });
    await go('dice');
    const tl = await safe(`
      const bad = [...document.querySelectorAll('#quick-skills .quick-skill .qs-name')].filter(n => n.checkVisibility()).filter(n => {
        const lh = parseFloat(getComputedStyle(n).lineHeight) || parseFloat(getComputedStyle(n).fontSize) * 1.3;
        return n.textContent.trim().split(/\\s+/).length === 1 && n.getBoundingClientRect().height > lh * 1.5; }).map(n => n.textContent.trim());
      return { bad };`);
    checks.push({ ok: !tl.err && tl.bad.length === 0, msg: `on a tablet no quick-roll name is broken across lines (${JSON.stringify(tl)})` });
    await page.setViewportSize({ width: 390, height: 844 });

    // ---- Journey seasons: four chips alike ----
    await go('journey');
    const se = await safe(`
      const c = [...document.querySelectorAll('#j-season-chips .chip')].filter(e => e.checkVisibility()).map(e => { const r = e.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; });
      return { c, same: c.length === 4 && new Set(c.map(x => x.join('x'))).size === 1 };`);
    checks.push({ ok: !se.err && se.same, msg: `the four season chips are the same size (${JSON.stringify(se)})` });

    checks.push({ ok: errors.length === 0, msg: `0 page errors (got ${errors.length}${errors.length ? ': ' + errors[0] : ''})` });
    await context.close();
    return { checks };
  }
};
