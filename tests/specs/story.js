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
      char.journey = Object.assign(char.journey || {}, { active: false, destination: 'Bree' }); sagaState().step = 'location'; saveCharacter(); renderPlay();
      const total = _playChoices().length;
      const cards = [...document.querySelectorAll('#play-body .play-choices .ccard')].filter(c => c.checkVisibility());
      const r = { n: cards.length, words: cards.map(c => c.querySelector('.c-short').textContent.trim().split(/\\s+/).length), labels: cards.map(c => c.getAttribute('aria-label') || ''), short: cards.map(c => c.querySelector('.c-short').textContent.trim()) };
      const more = cards.find(c => c.classList.contains('ccard-more'));
      if (more) { more.click(); r.after = [...document.querySelectorAll('#play-body .play-choices .ccard')].filter(c => c.checkVisibility()).length; }
      r.total = total; sagaState().step = 'haven'; saveCharacter(); renderPlay();
      return r;`);
    checks.push({ ok: !cc.err && cc.n >= 2 && cc.n <= 4 && cc.words.every(w => w <= 3) && cc.labels.filter(Boolean).every(l => l.length > 6) && cc.total > 4 && cc.after === cc.total,
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

    // ======== Stage 3: fights, councils, tasks, the Band ========
    const bb = await safe(`
      document.querySelectorAll('.menu-overlay.show').forEach(o => o.classList.remove('show'));
      sagaState().step = 'location'; sagaState().scene = null; saveCharacter();
      const B = allBestiary();
      addFoeFromBestiary(B.findIndex(x => /Orc Soldier/.test(x.name))); addFoeFromBestiary(B.findIndex(x => /Warg/.test(x.name)));
      document.querySelectorAll('.menu-overlay.show').forEach(o => o.classList.remove('show'));
      openNavGroup('play'); renderPlay(); await new Promise(r => setTimeout(r, 50));
      const real = window._doInlineRoll;
      window._doInlineRoll = (d, fav, tn, label, opts) => (opts && opts.foe) ? { featValue: 1, featSpecial: null, featLabel: '1', total: 1, icons: 0, outcome: 'FAIL' } : { featValue: 8, featSpecial: null, featLabel: '8', total: 30, icons: 0, outcome: 'SUCCESS' };
      const r = { tokens: document.querySelectorAll('#battle-board .bb-foe').length, encHidden: !document.getElementById('encounter-card-wrap').checkVisibility(), round0: enc().round };
      const orc = enc().foes.find(f => /Orc/.test(f.name)); const before = orc.endCur;
      document.querySelector('#battle-board .bb-foe:not([disabled])').click();
      for (let i = 0; i < 60 && (enc().round === r.round0); i++) await new Promise(x => setTimeout(x, 100));
      r.hit = orc.endCur < before; r.round1 = enc().round; r.turn = encTurn();
      r.said = [...document.querySelectorAll('#play-body .play-feed .beat-cur, #play-body .play-feed .beat-old')].length > 0;
      document.querySelector('#battle-board .bb-acts .btn-quiet').click(); r.numbers = document.getElementById('encounter-card-wrap').checkVisibility();
      document.getElementById('play-fight').classList.remove('show-numbers');
      window._doInlineRoll = real;
      endEncounter({ fled: true }); renderPlay();
      return r;`);
    checks.push({ ok: !bb.err && bb.tokens === 2 && bb.encHidden && bb.hit && bb.round1 === bb.round0 + 1 && bb.turn === 'hero' && bb.numbers,
      msg: `a fight on ▶ Play is a board: tap a foe to strike it, the foes' turn plays itself, the next round comes back to you, and "All the numbers" opens the full tracker (${JSON.stringify(bb)})` });

    const cb = await safe(`
      char.council = { active: true, topic: 'A boat', resistance: 6, attitude: 'reluctant', introRolled: false, timeLimit: 0, attemptsUsed: 0, successesScored: 0, rolls: [] };
      saveCharacter(); playOpenScene('council'); await new Promise(r => setTimeout(r, 50));
      const names = () => [...document.querySelectorAll('#scene-board .sb-skill strong')].map(x => x.textContent);
      const r = { intro: names(), face: !!document.querySelector('#scene-board .sb-face.att-reluctant'), formHidden: !document.getElementById('council-active-card').checkVisibility() };
      Object.assign(char.council, { introRolled: true, timeLimit: 5, attemptsUsed: 2, successesScored: 1 }); saveCharacter(); renderPlay(); await new Promise(x => setTimeout(x, 20));
      r.talk = names(); r.candles = document.querySelectorAll('#scene-board .candle').length;
      const real = window._doInlineRoll; window._doInlineRoll = () => ({ featValue: 8, featSpecial: null, featLabel: '8', total: 30, icons: 0, outcome: 'SUCCESS' });
      const card = [...document.querySelectorAll('#scene-board .sb-skill')].find(b => /Persuade/.test(b.textContent)); await card.onclick();
      window._doInlineRoll = real;
      r.attempts = char.council.attemptsUsed; r.succ = char.council.successesScored;
      char.council.active = false; sagaState().scene = null; saveCharacter(); renderPlay();
      return r;`);
    checks.push({ ok: !cb.err && cb.intro.join() === 'Awe,Courtesy,Riddle' && cb.face && cb.formHidden && cb.talk.includes('Persuade') && cb.talk.length === 5 && cb.candles === 5 && cb.attempts === 3 && cb.succ > 1,
      msg: `a council on ▶ Play is a board — the listener's face, candles for the time, the skills as cards — and a card makes the attempt (${JSON.stringify(cb)})` });

    const eb = await safe(`
      char.skillEndeavour = { active: true, task: 'Climb the cliff', resistance: 6, timeLimit: 5, riskLevel: 'standard', attemptsUsed: 0, successesScored: 0, rolls: [] };
      saveCharacter(); playOpenScene('endeavour'); await new Promise(r => setTimeout(r, 50));
      const r = { cards: document.querySelectorAll('#scene-board .sb-skill').length, other: !!document.querySelector('#scene-board .sb-other') };
      char.skillEndeavour.active = false; sagaState().scene = null; saveCharacter(); renderPlay(); return r;`);
    checks.push({ ok: !eb.err && eb.cards === 5 && eb.other, msg: `a long task on ▶ Play offers the hero's four best skills as cards, and "Another skill" for the rest (${JSON.stringify(eb)})` });

    const band = await safe(`
      const was = char.moriaMode; char.moriaMode = true; char.band.allies = []; addStartingBand();
      char.band.allies[1].injury = 'severe'; char.band.allies[4].outOfAction = true; saveCharacter(); render();
      const p = document.getElementById('band-pill');
      const r = { heads: p.querySelectorAll('.bp-head').length, out: p.querySelectorAll('.bp-head.out').length, hurt: p.querySelectorAll('.bp-head.hurt').length, label: p.getAttribute('aria-label') };
      char.moriaMode = was; char.band.allies = []; saveCharacter(); refreshStriderUI(); render(); return r;`);
    checks.push({ ok: !band.err && band.heads === 6 && band.out === 1 && band.hurt === 1 && /5 of 6/.test(band.label || ''),
      msg: `in Moria the Band is a row of dwarf faces — dimmed when hurt, struck out when lost (${JSON.stringify(band)})` });

    // ---- Stage 4: the hero as four pages you swipe; a dot turns to its page ----
    const hp = await safe(`
      setCharEditing(false); openNavGroup('hero'); document.querySelector('.tab[data-tab="character"]').click(); renderHeroSheet();
      await new Promise(r => setTimeout(r, 450));
      const root = document.querySelector('#hero-sheet .hero-pages'); if (!root) return { err: 'no pages' };
      const keys = [...root.querySelectorAll('.hp-page')].map(p => p.dataset.page);
      const t = root.querySelector('.hp-track'), dots = root.querySelectorAll('.hp-dot');
      dots[2].click(); await new Promise(r => setTimeout(r, 80));
      const g = root.querySelector('.hp-page[data-page="gear"]').getBoundingClientRect(), tr = t.getBoundingClientRect();
      const onGear = Math.abs(g.left - tr.left) < 4 && dots[2].classList.contains('on') && !dots[0].classList.contains('on');
      const you = root.querySelector('.hp-page[data-page="you"]');
      const portrait = !!you.querySelector('.hp-portrait .portrait-svg') && !!you.querySelector('.hp-vit');
      dots[1].click(); await new Promise(r => setTimeout(r, 80));
      const n = history.length; const sk = root.querySelector('.hp-page[data-page="skills"] [onclick^="rollFromSheet"]'); if (sk) sk.click();
      const rolled = history.length > n; closeRollDrawer(); dots[0].click();
      return { keys, onGear, portrait, rolled };`);
    checks.push({ ok: !hp.err && hp.keys.join() === 'you,skills,gear,traits' && hp.onGear && hp.portrait && hp.rolled,
      msg: `the hero is four pages — You (portrait and vitals), Skills (tap to roll), Gear, Traits — and a dot turns to its page (${JSON.stringify(hp)})` });

    // ---- the peek copy of the hero keeps its portrait clipped (ids are stripped there) ----
    const pc = await safe(`openPeek('hero'); const c = document.querySelector('#peek-body .hp-portrait clipPath'); const g = document.querySelector('#peek-body .hp-portrait .pt-fig');
      const ok = !!c && !!g && g.getAttribute('clip-path') === 'url(#' + c.id + ')'; closePeek(); return { ok };`);
    checks.push({ ok: !pc.err && pc.ok, msg: `the hero's portrait stays clipped in the peek copy (${JSON.stringify(pc)})` });

    // ---- the Journal is a book: one page per scene, opening on the scene being written ----
    const bk = await safe(`
      const save = JSON.stringify(journal);
      journal.scenes = []; journal.entries = []; journal.activeSceneId = null;
      ['The road', 'The ford', 'The inn'].forEach((t, i) => { const id = 'sc' + i; journal.scenes.push({ id, title: t, date: Object.assign({}, journal.clock) }); journal.entries.push({ id: 'b' + i, sceneId: id, kind: 'prose', text: t + ' line.' }); });
      journal.activeSceneId = 'sc1'; saveJournal();
      openNavGroup('journal'); document.querySelector('.tab[data-tab="chronicle"]').click(); renderChronicle();
      await new Promise(r => setTimeout(r, 120));
      const pages = document.querySelectorAll('#ch-timeline .ch-page').length;
      const folio = document.querySelector('#ch-timeline .ch-folio').textContent;
      chTurn(1); await new Promise(r => setTimeout(r, 60));
      const folio2 = document.querySelector('#ch-timeline .ch-folio').textContent;
      const b = document.querySelector('#ch-timeline .ch-book'), p3 = b.children[2].getBoundingClientRect(), br = b.getBoundingClientRect();
      const turned = Math.abs(p3.left - br.left) < 4;
      document.querySelector('#panel-chronicle .ch-quill-fab').click();
      const quill = document.activeElement && document.activeElement.id === 'ch-compose';
      Object.assign(journal, JSON.parse(save)); saveJournal(); renderChronicle();
      return { pages, folio, folio2, turned, quill };`);
    checks.push({ ok: !bk.err && bk.pages === 3 && bk.folio === 'Page 2 of 3' && bk.folio2 === 'Page 3 of 3' && bk.turned && bk.quill,
      msg: `the Journal is a book — one page per scene, opening on the scene being written, turned page by page; the quill goes to the writing box (${JSON.stringify(bk)})` });

    checks.push({ ok: errors.length === 0, msg: `0 page errors (got ${errors.length}${errors.length ? ': ' + errors[0] : ''})` });
    await context.close();
    return { checks };
  }
};
