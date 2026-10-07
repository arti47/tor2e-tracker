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

    // ======== Stage 2: the story screen ========
    await safe(`char.saga = Object.assign(char.saga || {}, { started: true, premise: 'Orcs on the road.', step: 'haven' }); saveCharacter(); openNavGroup('play'); playClearFeed(); renderPlay(); return 1;`);

    // Beats: several things at once are told one at a time; the choices wait for the last.
    const bt = await safe(`
      playSay('First thing.'); playSay('Second thing.'); playSay('Third thing.'); renderPlay();
      const vis = () => [...document.querySelectorAll('#play-body .story-beat p')].filter(p => p.checkVisibility()).map(p => p.textContent);
      const choicesShown = () => { const c = document.querySelector('#play-body .play-choices'); return !!c && c.checkVisibility(); };
      const r = { a: vis(), more: (document.querySelector('.beat-next') || {}).textContent, choicesA: choicesShown() };
      document.querySelector('#play-body .story-beat').click(); await new Promise(x => setTimeout(x, 20));
      r.b = vis();
      document.querySelector('#play-body .story-beat').click(); await new Promise(x => setTimeout(x, 20));
      r.c = vis(); r.choicesC = choicesShown(); r.waitingC = !!document.querySelector('#play-body .story-beat.waiting');
      return r;`);
    checks.push({ ok: !bt.err && bt.a.join() === 'First thing.' && /2 more/.test(bt.more || '') && !bt.choicesA && bt.b.join() === 'Second thing.' && bt.c.join() === 'Third thing.' && bt.choicesC && !bt.waitingC,
      msg: `what happens is told one beat at a time — tap to go on — and the choices wait for the last beat (${JSON.stringify(bt)})` });

    // Choice cards: at most four, a few words each; the full wording is still there for a screen reader.
    const cc = await safe(`
      renderPlay();
      const cards = [...document.querySelectorAll('#play-body .play-choices .ccard')].filter(c => c.checkVisibility());
      const r = { n: cards.length, words: cards.map(c => c.querySelector('.c-short').textContent.trim().split(/\\s+/).length), labels: cards.map(c => c.getAttribute('aria-label') || ''), short: cards.map(c => c.querySelector('.c-short').textContent.trim()) };
      const more = cards.find(c => c.classList.contains('ccard-more'));
      if (more) { more.click(); r.after = [...document.querySelectorAll('#play-body .play-choices .ccard')].filter(c => c.checkVisibility()).length; }
      return r;`);
    checks.push({ ok: !cc.err && cc.n >= 2 && cc.n <= 4 && cc.words.every(w => w <= 3) && cc.labels.filter(Boolean).every(l => l.length > 6) && (cc.after === undefined || cc.after > cc.n - 1),
      msg: `choices are 2–4 picture cards of 1–3 words, with the full wording kept for screen readers and "More" for the rest (${JSON.stringify(cc).slice(0, 220)})` });

    // The roll moment: a roll in the story takes the screen for a moment, and a tap returns.
    const rm = await safe(`
      document.querySelectorAll('.menu-overlay.show').forEach(o => o.classList.remove('show'));
      const sk = _heroSkill('Awareness'); _doInlineRoll(sk.rating, 'normal', sk.tn, 'Awareness · test');
      const el = document.getElementById('roll-moment');
      const r = { shown: !!el && el.classList.contains('show') && el.checkVisibility(), word: el && el.querySelector('.rm-word').textContent, dice: el ? el.querySelectorAll('.rm-die').length : 0, sub: el && el.querySelector('.rm-sub').textContent };
      el.click(); r.closed = !el.classList.contains('show');
      openNavGroup('hero'); _doInlineRoll(sk.rating, 'normal', sk.tn, 'Awareness · elsewhere'); r.notElsewhere = !el.classList.contains('show'); openNavGroup('play');
      return r;`);
    checks.push({ ok: !rm.err && rm.shown && /Success|Failure/.test(rm.word || '') && rm.dice >= 1 && /Awareness/.test(rm.sub || '') && rm.closed && rm.notElsewhere,
      msg: `a roll in the story is a full-screen moment — the dice, one word, what was rolled — and a tap goes back (${JSON.stringify(rm)})` });

    // The painted scene carries the mood: colour drains with Hope, the edges redden near the Hunt.
    const md = await safe(`
      const keep = { h: char.hopeCur, s: char.shadow, ea: char.eyeAwareness };
      const read = () => { const p = document.querySelector('#play-body .pscene'); return p ? { desat: parseFloat(p.style.getPropertyValue('--desat')), eye: parseFloat(p.style.getPropertyValue('--eye')), sky: !!p.querySelector('#ps-sky') } : null; };
      char.hopeCur = char.hopeMax; char.shadow = 0; char.eyeAwareness = 0; saveCharacter(); renderPlay(); const calm = read();
      char.hopeCur = 2; char.shadow = 1; char.eyeAwareness = huntThreshold(char) - 1; saveCharacter(); renderPlay(); const dark = read();
      char.hopeCur = keep.h; char.shadow = keep.s; char.eyeAwareness = keep.ea; saveCharacter(); renderPlay();
      return { calm, dark };`);
    checks.push({ ok: !md.err && md.calm && md.calm.sky && md.calm.desat === 0 && md.calm.eye === 0 && md.dark.desat > .6 && md.dark.eye > 0,
      msg: `the painted scene drains of colour as Hope runs out and reddens at the edges as the Eye nears the Hunt (${JSON.stringify(md)})` });

    checks.push({ ok: errors.length === 0, msg: `0 page errors (got ${errors.length}${errors.length ? ': ' + errors[0] : ''})` });
    await context.close();
    return { checks };
  }
};
