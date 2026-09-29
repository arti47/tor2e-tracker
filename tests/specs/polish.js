// polish — round 5 of the UX/UI work (2026-09-29): one kit, drawn feel. Every check asserts
// what a player sees or can do (GOTCHA 20) and was proven to fail with its fix reverted.
module.exports = {
  name: 'polish',
  async run({ browser, baseUrl, newPage }) {
    const checks = [];
    const { context, page, errors } = await newPage(browser, baseUrl + '/character-tracker.html');
    await page.setViewportSize({ width: 390, height: 844 });
    const safe = fn => page.evaluate(async src => { try { return await (new Function('return (async()=>{' + src + '})()'))(); } catch (e) { return { err: String(e && e.message || e) }; } }, fn);
    const wait = ms => page.waitForTimeout(ms);
    const setup = () => safe(`
      loadPregen(0); document.querySelectorAll('.menu-overlay.show').forEach(o => o.classList.remove('show'));
      char.striderMode = true; char.saga = Object.assign(char.saga || {}, { started: true, premise: 'Orcs on the East Road.' });
      saveCharacter(); render(); refreshStriderUI(); return activeCharId;`);
    const go = async t => { await safe(`openNavGroup(navGroupOf('${t}').id); document.querySelector('.tab[data-tab="${t}"]').click(); window.scrollTo(0, 0); return 1;`); await wait(480); };
    await setup(); await wait(300);

    // ---- Nothing inside a card sticks out of it (Tale of Years' Phase picker did), at 390 and 320 ----
    const overflow = async () => safe(`
      const out = [];
      for (const t of ['play','character','gear','build','journey','council','combat','dice','oracle','chronicle','reference']) {
        const tab = document.querySelector('.tab[data-tab="' + t + '"]'); if (!tab || tab.style.display === 'none') continue;
        openNavGroup(navGroupOf(t).id); tab.click();
        await new Promise(r => setTimeout(r, 460));
        document.querySelectorAll('#panel-' + t + ' .card').forEach(card => {
          if (!card.checkVisibility()) return; const c = card.getBoundingClientRect();
          card.querySelectorAll('button, input, select, textarea, .pick-btn, .stepper').forEach(el => {
            if (!el.checkVisibility()) return; const r = el.getBoundingClientRect();
            if (r.width && (r.right > c.right + 1 || r.left < c.left - 1)) out.push(t + ':' + (el.id || el.className || el.tagName).toString().slice(0, 30) + ' +' + Math.round(r.right - c.right));
          });
        });
      }
      return out.slice(0, 6);`);
    const ov390 = await overflow();
    await page.setViewportSize({ width: 320, height: 640 }); await wait(200);
    const ov320 = await overflow();
    await page.setViewportSize({ width: 390, height: 844 }); await wait(200);
    checks.push({ ok: Array.isArray(ov390) && !ov390.length && Array.isArray(ov320) && !ov320.length, msg: `no control sticks out of its card at 390 or 320 wide (${JSON.stringify({ ov390, ov320 })})` });

    // ---- A leading icon keeps a real gap from its words ----
    await go('dice');
    const gap = await safe(`
      const b = [...document.querySelectorAll('#panel-dice button')].find(x => x.checkVisibility() && /Roll Dice/.test(x.textContent));
      const ic = b.querySelector('svg'); const tn = [...b.childNodes].find(n => n.nodeType === 3 && n.textContent.trim());
      const rg = document.createRange(); rg.selectNodeContents(tn);
      return Math.round(rg.getBoundingClientRect().left - ic.getBoundingClientRect().right);`);
    checks.push({ ok: typeof gap === 'number' && gap >= 5, msg: `a button's leading icon keeps a gap from its words (Roll Dice: ${JSON.stringify(gap)}px)` });

    // ---- Every text box is the same paper ----
    const inputs = await safe(`
      const bg = id => { const e = document.getElementById(id); return e ? getComputedStyle(e).backgroundColor : null; };
      return { ref: bg('j-origin'), hist: bg('history-search'), chq: bg('ch-oracle-q'), chs: bg('ch-search'), ask: bg('ask-q') };`);
    checks.push({ ok: !inputs.err && [inputs.hist, inputs.chq, inputs.chs, inputs.ask].every(v => v === inputs.ref), msg: `all text boxes share one background (${JSON.stringify(inputs)})` });

    // ---- Dice: recent + your best, and the whole list in a sheet ----
    const dice = await safe(`
      char.recentRolls = []; renderQuickSkills();
      const before = [...document.querySelectorAll('#quick-skills .quick-skill')].length;
      const heads = [...document.querySelectorAll('#quick-skills .qs-h')].map(h => h.textContent);
      rollFromSheet('Scan'); await new Promise(r => setTimeout(r, 200)); if (typeof closeRollDrawer === 'function') closeRollDrawer();
      renderQuickSkills();
      const firstAfter = (document.querySelector('#quick-skills .quick-skill') || {}).textContent || '';
      const allBtn = [...document.querySelectorAll('#quick-skills button')].find(b => /Roll any skill/.test(b.textContent));
      if (allBtn) allBtn.click();
      const sheet = document.getElementById('allroll-overlay');
      const inSheet = sheet ? [...sheet.querySelectorAll('.quick-skill')].map(b => b.textContent) : [];
      if (typeof closeAllRolls === 'function') closeAllRolls();
      return { before, heads, firstAfter: firstAfter.slice(0, 12), open: !!(sheet && inSheet.length), all: inSheet.length, hasLore: inSheet.some(t => t.startsWith('Lore')) };`);
    checks.push({ ok: !dice.err && dice.before <= 8 && dice.heads.includes('Your best') && /^Scan/.test(dice.firstAfter), msg: `the Dice tab shows your recent and best rolls, not every skill; the last roll leads (${JSON.stringify(dice)})` });
    checks.push({ ok: !dice.err && dice.open && dice.all > dice.before && dice.hasLore, msg: `"Roll any skill…" opens every rated skill in a sheet (${dice.all} there)` });

    // ---- Journey: Mount's Vigour only when mounted; season and lands each on one row ----
    await go('journey');
    const jr = await safe(`
      const row = document.getElementById('j-vigour-row'); jPickTravel('foot');
      const foot = row.checkVisibility(); jPickTravel('mounted'); const mounted = row.checkVisibility(); jPickTravel('foot');
      const tops = id => [...document.querySelectorAll('#' + id + ' .chip')].map(c => Math.round(c.getBoundingClientRect().top));
      const s = tops('j-season-chips'), l = tops('j-region-chips');
      return { foot, mounted, seasonRows: new Set(s).size, landRows: new Set(l).size };`);
    checks.push({ ok: !jr.err && !jr.foot && jr.mounted, msg: `Mount's Vigour shows only for a mounted journey (${JSON.stringify(jr)})` });
    checks.push({ ok: !jr.err && jr.seasonRows === 1 && jr.landRows === 1, msg: `season and lands each read as one row, no chip left alone (${JSON.stringify(jr)})` });

    // ---- Gear: armour and shield wear different icons; actions share one size ----
    await go('gear');
    const gear = await safe(`
      const cards = [...document.querySelectorAll('#panel-gear .item-card')].filter(c => c.checkVisibility());
      const iconOf = re => { const c = cards.find(x => re.test(x.textContent)); return c ? c.querySelector('.item-ic use').getAttribute('href') : null; };
      const hs = new Set([...document.querySelectorAll('#panel-gear .item-ctl button')].filter(b => b.checkVisibility()).map(b => Math.round(b.getBoundingClientRect().height)));
      return { armour: iconOf(/Protection \\d+ dice/), shield: iconOf(/Parry \\+/), heights: [...hs] };`);
    checks.push({ ok: !gear.err && gear.armour && gear.shield && gear.armour !== gear.shield, msg: `armour and shield have their own icons (${JSON.stringify(gear)})` });
    checks.push({ ok: !gear.err && gear.heights.length === 1, msg: `every gear action button is one height (${JSON.stringify(gear.heights)})` });

    // ---- Foe cards: −/+ are touch-sized ----
    await go('combat');
    const foe = await safe(`
      addFoeFromBestiary(0); document.querySelectorAll('.menu-overlay.show').forEach(o => o.classList.remove('show'));
      const b = document.querySelector('#panel-combat .foe-card .foe-bar button');
      const r = b ? b.getBoundingClientRect() : null; endEncounter && 0;
      return r ? { w: Math.round(r.width), h: Math.round(r.height) } : { err: 'no stepper' };`);
    checks.push({ ok: !foe.err && foe.w >= 40 && foe.h >= 40, msg: `a foe's Endurance/Hate −/+ are at least 40px (${JSON.stringify(foe)})` });

    // ---- Fellowship Phase: step names never cut, nav labels on one line ----
    const fp = await safe(`
      openFPWizard(); await new Promise(r => setTimeout(r, 200));
      const pills = [...document.querySelectorAll('.fp-step-pill')].filter(p => p.checkVisibility());
      const cut = pills.filter(p => p.scrollWidth > p.clientWidth + 1).map(p => p.textContent);
      fpSetPhaseType && fpSetPhaseType('ordinary'); fpNextStep(); await new Promise(r => setTimeout(r, 150));
      const next = document.getElementById('fp-next-btn'); const lh = parseFloat(getComputedStyle(next).lineHeight) || 20;
      const lines = Math.round((next.getBoundingClientRect().height - parseFloat(getComputedStyle(next).paddingTop) - parseFloat(getComputedStyle(next).paddingBottom)) / lh);
      fpClose(); return { cut, lines, label: next.textContent };`);
    checks.push({ ok: !fp.err && !fp.cut.length && fp.lines <= 1, msg: `Fellowship Phase step pills are never cut and "Next" stays on one line (${JSON.stringify(fp)})` });

    // ---- Help is a small ⓘ, not an underline that reads like a link ----
    const hint = await safe(`
      const t = [...document.querySelectorAll('.title-term')].find(x => x.checkVisibility()) || document.querySelector('.title-term');
      if (!t) return { err: 'no title term' };
      const cs = getComputedStyle(t), af = getComputedStyle(t, '::after');
      return { line: cs.textDecorationLine, mark: af.content };`);
    checks.push({ ok: !hint.err && !/underline/.test(hint.line) && /i/.test(hint.mark || ''), msg: `a title with help shows a small ⓘ, not an underline (${JSON.stringify(hint)})` });

    // ---- Ornaments only on the ornate cards ----
    await go('reference');
    const orn = await safe(`
      const h = document.querySelector('#panel-reference .ref-group summary h3'); return h ? getComputedStyle(h).backgroundImage : 'none';`);
    checks.push({ ok: orn === 'none', msg: `Reference group titles carry no repeated ornament (${String(orn).slice(0, 40)})` });

    // ---- Labels are small caps in one colour ----
    await go('play');
    const lab = await safe(`
      const els = [...document.querySelectorAll('.eyebrow, .qs-h, .jq-sub, .v-h')].slice(0, 12);
      return { caps: [...new Set(els.map(e => getComputedStyle(e).fontVariantCaps))], colours: [...new Set(els.map(e => getComputedStyle(e).color))] };`);
    checks.push({ ok: !lab.err && lab.caps.length === 1 && lab.caps[0] === 'all-small-caps' && lab.colours.length === 1, msg: `section labels are small caps in one colour (${JSON.stringify(lab)})` });

    // ---- Header: the given name on a phone, the whole name on a tablet ----
    const hn = await safe(`
      const el = document.getElementById('char-name-text');
      const vis = [...el.querySelectorAll('span')].filter(s => s.checkVisibility()).map(s => s.textContent).join('') || el.textContent;
      return { phone: vis };`);
    checks.push({ ok: !hn.err && hn.phone === 'Geira', msg: `a phone header shows the given name only (${JSON.stringify(hn)})` });

    // ---- Vitals: a change slides the bar and floats the difference up ----
    const fx = await safe(`
      document.querySelectorAll('.fdelta').forEach(f => f.remove());
      adj('endCur', -3); await new Promise(r => setTimeout(r, 120));
      const f = [...document.querySelectorAll('#hud-end .fdelta')].map(x => x.textContent);
      adj('endCur', 3); return { f };`);
    checks.push({ ok: !fx.err && fx.f.some(t => /−3 End/.test(t)), msg: `losing Endurance floats "−3 End" off the meter (${JSON.stringify(fx)})` });

    // ---- Conditions are wax seals ----
    const seal = await safe(`
      char.weary = true; saveCharacter(); render(); await new Promise(r => setTimeout(r, 60));
      const ic = document.querySelector('#hud-chips .chip.weary .chip-ic');
      const bg = ic ? getComputedStyle(ic).backgroundImage : ''; const r = ic ? ic.getBoundingClientRect() : {};
      char.weary = false; saveCharacter(); render(); return { grad: /radial-gradient/.test(bg), w: Math.round(r.width) };`);
    checks.push({ ok: !seal.err && seal.grad && seal.w >= 20, msg: `a condition wears a round wax seal (${JSON.stringify(seal)})` });

    // ---- Each part of the book has its own paper ----
    const paper = await safe(`
      const bg = g => { openNavGroup(g); return getComputedStyle(document.body).backgroundImage; };
      const a = bg('hero'), b = bg('journal'), c = bg('play'); openNavGroup('play');
      return { distinct: new Set([a, b, c]).size };`);
    checks.push({ ok: !paper.err && paper.distinct === 3, msg: `Hero, Journal and Play each have their own paper (${JSON.stringify(paper)})` });

    // ---- The scene takes the season of the story ----
    const mood = await safe(`
      const prev = journal.clock.month; journal.clock.month = 'Solmath'; renderPlay();
      const sc = document.querySelector('.play-scene'); const s = sc && sc.dataset.season;
      journal.clock.month = 'Wedmath'; renderPlay(); const s2 = document.querySelector('.play-scene').dataset.season;
      journal.clock.month = prev; renderPlay(); return { s, s2 };`);
    checks.push({ ok: !mood.err && mood.s === 'winter' && mood.s2 === 'summer', msg: `the Play scene follows the story's season (${JSON.stringify(mood)})` });

    // ---- Dice: the total counts up; a great success shines; an Eye leaves ink ----
    const feel = await safe(`
      const orig = Math.random;
      Math.random = () => 0.55; rollFromSheet('Persuade');
      const early = document.getElementById('result-total').textContent;
      await new Promise(r => setTimeout(r, 1500));
      const late = document.getElementById('result-total').textContent;
      Math.random = () => 0.999; rollFromSheet('Persuade');
      const shine = document.getElementById('roll-banner').classList.contains('shine');
      Math.random = () => 0.9; rollFromSheet('Awe'); const eye = document.getElementById('roll-result').classList.contains('ink-eye');
      Math.random = orig; closeRollDrawer();
      return { early, late, shine, eye };`);
    checks.push({ ok: !feel.err && feel.early !== feel.late && Number(feel.late) > 0, msg: `the dice total counts up to its value (${JSON.stringify(feel)})` });
    checks.push({ ok: !feel.err && feel.shine, msg: `a great success catches the light on the banner (${JSON.stringify(feel)})` });
    checks.push({ ok: !feel.err && feel.eye, msg: `an Eye on the Feat die leaves an ink blot (${JSON.stringify(feel)})` });

    // ---- Long-press a skill: see the roll, don't make it ----
    await go('character');
    const lp = await safe(`
      const row = [...document.querySelectorAll('[onclick^="rollFromSheet"]')].find(r => r.checkVisibility() && /Persuade/.test(r.textContent));
      if (!row) return { err: 'no row' };
      row.scrollIntoView({ block: 'center' }); const r = row.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, n: history.length };`);
    if (!lp.err) {
      await page.mouse.move(lp.x, lp.y); await page.mouse.down(); await wait(700);
      const shown = await safe(`const p = document.getElementById('roll-preview'); return p && p.classList.contains('show') ? p.textContent : '';`);
      await page.mouse.up(); await wait(200);
      const n2 = await safe(`return history.length;`);
      checks.push({ ok: /TN \d+/.test(shown) && /Persuade/.test(shown) && n2 === lp.n, msg: `long-pressing a skill previews dice and TN without rolling (${JSON.stringify({ shown: String(shown).slice(0, 60), before: lp.n, after: n2 })})` });
    } else checks.push({ ok: false, msg: `long-press preview: ${lp.err}` });

    // ---- Ink ripple on a secondary button ----
    const rip = await safe(`
      const b = [...document.querySelectorAll('.btn-secondary')].find(x => x.checkVisibility()); if (!b) return { err: 'none' };
      b.scrollIntoView({ block: 'center' }); await new Promise(r => setTimeout(r, 500));
      const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 };`);
    if (!rip.err) {
      await page.mouse.move(rip.x, rip.y); await page.mouse.down();
      const has = await safe(`return !!document.querySelector('.ripple-box .ripple');`);
      await page.mouse.up();
      checks.push({ ok: has === true, msg: `a secondary button shows an ink ripple where it was pressed (${has})` });
    } else checks.push({ ok: false, msg: `ripple: ${rip.err}` });

    // ---- Empty states carry the one action that fills them ----
    await go('dice');
    const es = await safe(`
      history.length = 0; renderHistory();
      const b = document.querySelector('#panel-dice .empty-state .es-act'); if (!b) return { err: 'no action' };
      b.click(); const open = document.getElementById('allroll-overlay').classList.contains('show'); closeAllRolls();
      return { label: b.textContent, open };`);
    checks.push({ ok: !es.err && es.open, msg: `an empty roll history offers the button that fills it (${JSON.stringify(es)})` });

    // ---- Sub-tabs: the pill sits under the chosen tab; a swipe stays in its group ----
    await go('journey');
    const ind = await safe(`
      document.querySelector('.tab[data-tab="combat"]').click(); await new Promise(r => setTimeout(r, 400));
      const a = document.querySelector('.tab.active').getBoundingClientRect(), i = document.querySelector('.tabs .tab-ind').getBoundingClientRect();
      return { dx: Math.round(Math.abs(a.left - i.left)), dw: Math.round(Math.abs(a.width - i.width)) };`);
    checks.push({ ok: !ind.err && ind.dx <= 2 && ind.dw <= 2, msg: `the sliding pill sits under the chosen sub-tab (${JSON.stringify(ind)})` });

    // ---- Sticky action: Journey's Set out stays in reach and presses the real one ----
    await go('journey');
    const st = await safe(`
      window.scrollTo(0, 0); updateStickyAction(); await new Promise(r => setTimeout(r, 250));
      const bar = document.getElementById('sticky-act');
      const shown = bar && bar.classList.contains('show'); const label = bar ? bar.textContent.trim() : '';
      return { shown, label };`);
    checks.push({ ok: !st.err && st.shown && /Set out/.test(st.label), msg: `Journey's "Set out" stays in reach while the real button is off screen (${JSON.stringify(st)})` });

    // ---- Small phones: the first choice is on the first screen ----
    await page.setViewportSize({ width: 320, height: 568 }); await go('play');
    const sm = await safe(`
      const c = document.querySelector('.play-choices .choice'); const nav = document.getElementById('bottom-nav').getBoundingClientRect();
      return { bottom: Math.round(c.getBoundingClientRect().bottom), floor: Math.round(nav.top) };`);
    checks.push({ ok: !sm.err && sm.bottom <= sm.floor, msg: `on a 320×568 phone the first choice shows without scrolling (${JSON.stringify(sm)})` });

    // ---- Landscape phone: the side rail and two panes ----
    await page.setViewportSize({ width: 740, height: 360 }); await go('play');
    const ls = await safe(`
      const nav = document.getElementById('bottom-nav').getBoundingClientRect();
      const sc = document.querySelector('.play-scene').getBoundingClientRect(), ch = document.querySelector('.play-choices').getBoundingClientRect();
      return { rail: nav.height > 200 && nav.left < 5, side: ch.left >= sc.right - 2 };`);
    checks.push({ ok: !ls.err && ls.rail && ls.side, msg: `a phone held sideways gets the side rail and two panes (${JSON.stringify(ls)})` });

    // ---- Tablet: the story so far fills the column under the scene; the whole name in the header ----
    await page.setViewportSize({ width: 1180, height: 820 }); await go('play');
    const tb = await safe(`
      const sc = document.querySelector('.play-scene').getBoundingClientRect(), st = document.querySelector('.play-story');
      const r = st && st.checkVisibility() ? st.getBoundingClientRect() : null;
      const el = document.getElementById('char-name-text');
      const name = [...el.querySelectorAll('span')].filter(s => s.checkVisibility()).map(s => s.textContent).join('') || el.textContent;
      return { story: !!r, under: r ? r.top >= sc.bottom - 1 && r.top - sc.bottom < 40 && Math.abs(r.left - sc.left) < 2 : false, name };`);
    checks.push({ ok: !tb.err && tb.story && tb.under, msg: `on a tablet the story so far sits under the scene (${JSON.stringify(tb)})` });
    checks.push({ ok: !tb.err && /daughter of/.test(tb.name), msg: `a tablet header shows the whole name (${JSON.stringify(tb.name)})` });
    await page.setViewportSize({ width: 390, height: 844 });

    checks.push({ ok: errors.length === 0, msg: `0 page errors (got ${errors.length}${errors.length ? ': ' + errors[0] : ''})` });
    await context.close();
    return { checks };
  }
};
