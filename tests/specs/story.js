// story — the storybook redesign (2026-10-07): Story · Hero · Journal, the hero portrait with its
// rings, Tools as full pages, and the Night / Day / High-contrast looks. Every check asserts what a
// player sees or can do (GOTCHA 20) and was proven to fail with its fix reverted.
module.exports = {
  name: 'story',
  async run({ browser, baseUrl, newPage }) {
    const checks = [];
    const { context, page, errors } = await newPage(browser, baseUrl + '/character-tracker.html');
    await page.setViewportSize({ width: 390, height: 844 });
    const safe = fn => page.evaluate(async src => { try { return await (new Function('return (async()=>{' + src + '})()'))(); } catch (e) { return { err: String(e && e.message || e) }; } }, fn);
    await safe(`
      loadPregen(0); document.querySelectorAll('.menu-overlay.show').forEach(o => o.classList.remove('show'));
      char.striderMode = true; saveCharacter(); render(); refreshStriderUI(); return 1;`);

    // ---- Night is the look a new player gets ----
    const look = await safe(`localStorage.removeItem('tor2e-theme'); applyTheme();
      return { night: document.body.classList.contains('night'), bg: getComputedStyle(document.body).getPropertyValue('--bg').trim() };`);
    checks.push({ ok: !look.err && look.night && look.bg === '#11141b', msg: `Night is the default look (${JSON.stringify(look)})` });

    // ---- Tools: every tool opens from Menu → Tools as a full page, and Back returns to the story ----
    const tools = await safe(`
      const out = { opened: [], missing: [], shown: TOOLS.filter(t => _tabShown(t.tab)).length };
      openNavGroup('play');
      for (const t of TOOLS) {
        if (!_tabShown(t.tab)) continue;
        toggleMenu();
        const tile = document.querySelector('#menu-tools .tool-tile[data-tool="' + t.tab + '"]');
        if (!tile || !tile.checkVisibility()) { out.missing.push(t.tab); toggleMenu(); continue; }
        tile.click(); await new Promise(r => setTimeout(r, 60));
        const p = document.getElementById('panel-' + t.tab);
        const bar = document.getElementById('tool-bar');
        const strip = document.querySelector('.tabs');
        if (p.classList.contains('active') && bar.checkVisibility() && bar.textContent.includes(t.label) && !strip.checkVisibility()) out.opened.push(t.tab);
        closeTool(); await new Promise(r => setTimeout(r, 30));
      }
      out.back = document.getElementById('panel-play').classList.contains('active');
      return out;`);
    checks.push({ ok: !tools.err && tools.missing.length === 0 && tools.opened.length >= 6 && tools.opened.length === tools.shown && tools.back,
      msg: `each tool opens from Menu → Tools as its own page with a Back bar, and Back returns to the story (${JSON.stringify(tools)})` });

    const back = await safe(`openNavGroup('hero'); openTool('dice'); await new Promise(r => setTimeout(r, 30)); document.querySelector('#tool-bar .tb-back').click();
      return { group: document.body.dataset.group };`);
    checks.push({ ok: !back.err && back.group === 'hero', msg: `Back returns to the place you opened the tool from (${JSON.stringify(back)})` });

    // ---- The portrait: rings show Endurance and Hope, Shadow eats into Hope, a wound cracks it ----
    const pt = await safe(`
      openNavGroup('play');
      const keep = { e: char.endCur, s: char.shadow, w: char.wounded };
      char.endCur = Math.round(char.endMax / 2); char.shadow = 2; char.wounded = false; saveCharacter(); render();
      const dash = sel => { const c = document.querySelector('#hero-portrait ' + sel); if (!c) return null; const [a, b] = c.getAttribute('stroke-dasharray').split(' ').map(Number); return +(a / b).toFixed(2); };
      const r = { end: dash('.pt-end'), hope: dash('.pt-hope'), shadow: dash('.pt-shadow'), crackBefore: !!document.querySelector('#hero-portrait .pt-crack') };
      char.wounded = true; saveCharacter(); render();
      r.crack = !!document.querySelector('#hero-portrait .pt-crack');
      r.label = document.getElementById('hero-portrait').getAttribute('aria-label');
      char.endCur = keep.e; char.shadow = keep.s; char.wounded = keep.w; saveCharacter(); render();
      return r;`);
    checks.push({ ok: !pt.err && Math.abs(pt.end - .5) < .06 && pt.hope > 0 && pt.shadow > 0 && !pt.crackBefore && pt.crack,
      msg: `the portrait's red ring is Endurance, the gold ring Hope with Shadow eating into it, and a wound cracks it (${JSON.stringify(pt)})` });
    checks.push({ ok: !pt.err && /Endurance \d+ of \d+, Hope/.test(pt.label || '') && /Wounded/.test(pt.label || ''),
      msg: `a screen reader hears the numbers the rings show (${JSON.stringify(pt.label)})` });

    // ---- A change floats off the portrait ----
    const fl = await safe(`adj('endCur', -2); await new Promise(r => setTimeout(r, 120));
      const t = [...document.querySelectorAll('#hero-portrait .pt-delta')].map(x => x.textContent); adj('endCur', 2); return { t };`);
    checks.push({ ok: !fl.err && fl.t.some(x => /−2 End/.test(x)), msg: `losing Endurance floats "−2 End" off the portrait (${JSON.stringify(fl)})` });

    checks.push({ ok: errors.length === 0, msg: `0 page errors (got ${errors.length}${errors.length ? ': ' + errors[0] : ''})` });
    await context.close();
    return { checks };
  }
};
