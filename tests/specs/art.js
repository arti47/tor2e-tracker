// art — round 6 of the UX/UI work (2026-09-29): drawn glyphs for the game's own ideas and the
// pictures built from them. Every check asserts what a player sees (GOTCHA 20) and was proven to
// fail with its fix reverted.
module.exports = {
  name: 'art',
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
    const use = sel => `[...document.querySelectorAll('${sel}')].filter(e => e.checkVisibility()).map(e => (e.querySelector('use') || {}).getAttribute ? e.querySelector('use').getAttribute('href') : null)`;

    // ---- Header strips: every tab outside Play opens on its group's drawn band ----
    const strips = await safe(`
      const out = {};
      for (const t of ['character', 'gear', 'journey', 'combat', 'dice', 'oracle', 'chronicle', 'play']) {
        openNavGroup(navGroupOf(t).id); document.querySelector('.tab[data-tab="' + t + '"]').click();
        await new Promise(r => setTimeout(r, 460));
        const s = document.querySelector('#panel-' + t + ' > .group-strip');
        out[t] = s && s.checkVisibility() && s.getBoundingClientRect().height > 16 ? [...s.classList].find(c => c.startsWith('gs-')) : null;
      }
      return out;`);
    checks.push({ ok: !strips.err && strips.character === 'gs-hero' && strips.gear === 'gs-hero' && strips.journey === 'gs-adventure' && strips.combat === 'gs-adventure'
      && strips.dice === 'gs-roll' && strips.oracle === 'gs-roll' && strips.chronicle === 'gs-journal' && strips.play === null,
      msg: `each nav group draws its own header strip, and Play keeps its scene instead (${JSON.stringify(strips)})` });

    // ---- Quick-roll tiles: attribute glyph, the dice drawn as pips, the TN rolled against ----
    await go('dice');
    const tiles = await safe(`
      return [...document.querySelectorAll('#quick-skills .quick-skill')].filter(b => b.checkVisibility()).slice(0, 6).map(b => {
        const name = b.querySelector('.qs-name').textContent.replace(/[★\\s]+$/, '').trim();
        const s = (char.skills || {})[name]; const g = b.querySelector('.qs-ic use');
        return { name, glyph: g && g.getAttribute('href'), pips: b.querySelectorAll('.qs-pips i').length, tn: (b.querySelector('.qs-tn') || {}).textContent,
          want: s ? { r: parseInt(s.rating) || 0, tn: 'TN ' + char[attrOfSkill(name) + 'TN'], g: '#' + ATTR_GLYPH[attrOfSkill(name)] } : null };
      });`);
    const skillTiles = Array.isArray(tiles) ? tiles.filter(t => t.want) : [];
    checks.push({ ok: skillTiles.length >= 2 && skillTiles.every(t => t.glyph === t.want.g && t.pips === t.want.r && t.tn === t.want.tn),
      msg: `quick-roll tiles show the attribute glyph, one pip per die and the TN (${JSON.stringify(tiles)})` });

    // ---- Stances, the sheet's attributes and the Play hero card carry drawn glyphs ----
    await go('combat');
    const st = await safe(`return ${use('#panel-combat .stance-btn')};`);
    checks.push({ ok: Array.isArray(st) && st.length === 5 && new Set(st).size === 5 && st.every(Boolean), msg: `the five stances each show their own glyph (${JSON.stringify(st)})` });
    await go('character');
    const at = await safe(`return { sheet: ${use('#hero-sheet .s-attr')}, heads: ${use('#hero-sheet .s-h')}.filter(Boolean) };`);
    checks.push({ ok: !at.err && JSON.stringify(at.sheet) === JSON.stringify(['#i-att-str', '#i-att-hrt', '#i-att-wit']) && at.heads.length === 3,
      msg: `Strength, Heart and Wits carry their glyphs on the sheet and over their skills (${JSON.stringify(at)})` });

    // ---- Journey setup: distance as milestones, travel and season drawn ----
    await go('journey');
    const jq = await safe(`
      const n = h => document.querySelectorAll('.opt-card[data-hex="' + h + '"] .opt-stones .st').length;
      return { stones: [n(4), n(9), n(18)], foot: !!document.querySelector('.opt-card[data-mode="foot"] use[href="#i-boot"]'),
        horse: !!document.querySelector('.opt-card[data-mode="mounted"] use[href="#i-horse"]'),
        seasons: [...document.querySelectorAll('.chip[data-v] .chip-ic use')].map(u => u.getAttribute('href')) };`);
    checks.push({ ok: !jq.err && JSON.stringify(jq.stones) === '[1,2,3]' && jq.foot && jq.horse && jq.seasons.length === 4,
      msg: `journey choices are drawn — 1/2/3 milestones, boot, horse, four seasons (${JSON.stringify(jq)})` });

    // ---- The Play scene: the land you are crossing, not the place you are heading to ----
    const scene = async (region, ea) => { await safe(`
      Object.assign(char.journey, { active: true, origin: 'Bree', destination: 'the ruined watchtower on Weathertop', totalHexes: 9, currentHex: 2, region: '${region}', route: null, routeLands: null });
      char.saga.step = 'journey'; char.eyeAwareness = ${ea}; saveCharacter(); render(); return 1;`); await go('play');
      return safe(`const a = document.querySelector('#panel-play .scene-art'); if (!a) return null;
        const f = a.querySelector('.f');
        return { t: [...a.classList].find(c => c.startsWith('t-')), road: !!a.querySelector('.rd'), mist: !!a.querySelector('.scene-mist'), eye: !!a.querySelector('.scene-eye'),
          fill: f ? getComputedStyle(f).fill : null };`); };
    const wild = await scene('Wild', 0);
    checks.push({ ok: wild && wild.t === 't-forest' && wild.road, msg: `on the road through the Wild the scene shows the forest with the road in it, not the ruined tower ahead (${JSON.stringify(wild)})` });
    checks.push({ ok: wild && wild.fill && !/^rgb\((74, 53, 36|243, 227, 195)\)$/.test(wild.fill) && wild.fill !== 'none', msg: `the scene is coloured by its land, not only inked (${JSON.stringify(wild && wild.fill)})` });
    const dark = await scene('Dark', 30);
    checks.push({ ok: wild && !wild.mist && dark && dark.mist, msg: `mist gathers in the Dark lands and not in the Wild (${JSON.stringify({ wild: wild && wild.mist, dark: dark && dark.mist })})` });
    checks.push({ ok: wild && !wild.eye && dark && dark.eye, msg: `the Eye opens over the scene near the Hunt and not before (${JSON.stringify({ calm: wild && wild.eye, near: dark && dark.eye })})` });
    await safe(`char.journey.active = false; char.saga.step = 'haven'; char.eyeAwareness = 0; saveCharacter(); render(); return 1;`);

    // ---- The Oracle: seeing-stone, the answer under a wax seal, words as tiles ----
    await go('oracle');
    const orc = await safe(`
      const stone = document.querySelector('#ask-stone .seeing-stone');
      document.getElementById('ask-q').value = 'Is the gate guarded?'; askYesNo();
      const slip = document.getElementById('ask-slip'), yes = /Yes/.test(slip.querySelector('.slip-a').textContent);
      const seal = slip.querySelector('.slip-seal'); const cls = seal ? [...seal.classList].find(c => /^seal-/.test(c) && c !== 'seal') : null;
      const before = getComputedStyle(slip, '::before').display;
      const glow = document.getElementById('ask-stone').classList.contains('glow');
      askWords();
      return { stone: !!stone && stone.checkVisibility(), yes, cls, before, glow, tiles: document.querySelectorAll('#ask-slip .rune-tile').length };`);
    checks.push({ ok: !orc.err && orc.stone && orc.glow, msg: `a seeing-stone sits beside the question and glows when asked (${JSON.stringify(orc)})` });
    checks.push({ ok: !orc.err && orc.cls && (orc.yes ? /seal-(yes|and)/ : /seal-(no|worse)/).test(orc.cls) && orc.before === 'none',
      msg: `the answer comes under a wax seal of its own colour, replacing the plain dot (${JSON.stringify(orc)})` });
    checks.push({ ok: !orc.err && orc.tiles >= 3, msg: `the Lore words come back as engraved tiles (${orc.tiles})` });

    // ---- A roll call on the Oracle row: the chip bar fades until you reach its end ----
    const cue = await safe(`
      const j = [...document.querySelectorAll('#panel-oracle .jump-bar')].find(e => e.checkVisibility()); if (!j) return null; refreshJumpCues();
      const a = { over: j.classList.contains('over'), end: j.classList.contains('at-end'), mask: getComputedStyle(j).maskImage || getComputedStyle(j).webkitMaskImage };
      j.scrollLeft = j.scrollWidth; await new Promise(r => setTimeout(r, 120));
      return Object.assign(a, { endAfter: j.classList.contains('at-end'), maskAfter: getComputedStyle(j).maskImage || getComputedStyle(j).webkitMaskImage });`);
    checks.push({ ok: cue && !cue.err && cue.over && !cue.end && /gradient/.test(cue.mask) && cue.endAfter && !/gradient/.test(cue.maskAfter || ''),
      msg: `a chip row wider than the phone fades at its edge until scrolled to the end (${JSON.stringify(cue)})` });

    // ---- Encounter: notched End bar that counts, a medallion, the round on a banner ----
    await go('combat');
    const en = await safe(`
      addFoeFromBestiary(0); document.querySelectorAll('.menu-overlay.show').forEach(o => o.classList.remove('show'));
      const f = enc().foes[0]; f.endCur = f.endMax; saveCharacter(); renderEncounter();
      const card = () => document.querySelector('#panel-combat .foe-card');
      const on = () => card().querySelectorAll('.notch-bar.nb-end i.on').length;
      const a = on(); adjFoe(f.id, 'endCur', -3); const b = on();
      return { max: f.endMax, a, b, medal: !!card().querySelector('.foe-medal .foe-medal-sil'),
        round: (document.querySelector('#panel-combat .round-banner') || {}).textContent };`);
    checks.push({ ok: !en.err && en.a === Math.min(en.max, 30) && en.b < en.a && en.medal, msg: `a foe's Endurance is a notched bar that loses notches as it is hit, beside its medallion (${JSON.stringify(en)})` });
    checks.push({ ok: !en.err && /Round \d/.test(en.round || ''), msg: `the round sits on a banner (${JSON.stringify(en.round)})` });
    await safe(`endEncounter && (enc().active = false); saveCharacter(); return 1;`);

    // ---- Battle: the two banners, and the clash rope follows foe Resistance ----
    const bat = await safe(`
      char.moriaMode = true; char.band.allies = [{ id: 'a1', name: 'Nár', gift: 'x', quirk: 'y' }];
      Object.assign(char.battle, { active: true, foeResistance: 3, foeResMax: 6, scale: 'Small War Party', round: 1 });
      saveCharacter(); refreshStriderUI(); render(); renderBattle();
      openNavGroup('adventure'); document.querySelector('.tab[data-tab="battle"]').click(); await new Promise(r => setTimeout(r, 460));
      const bb = document.querySelector('#b-banners .battle-banners'); const fill = bb && bb.querySelector('.tug-fill');
      return { shown: !!bb && bb.checkVisibility(), flags: bb ? bb.querySelectorAll('.bb-flag').length : 0, pct: fill ? parseFloat(fill.style.width) : null };`);
    checks.push({ ok: !bat.err && bat.shown && bat.flags === 2 && bat.pct === 50, msg: `a Battle shows both banners and the rope halfway at 3 of 6 foe Resistance (${JSON.stringify(bat)})` });
    await safe(`char.battle.active = false; char.moriaMode = false; char.band.allies = []; saveCharacter(); refreshStriderUI(); render(); return 1;`);

    // ---- Tale of Years: the season wheel follows the month; each scene carries a moon seal ----
    await go('chronicle');
    const wh = await safe(`
      journal.clock.month = 'Astron'; journal.clock.day = 13; renderChronicleClock();
      const a = [...document.querySelectorAll('#ch-wheel .season-wheel path.on')].map(p => p.getAttribute('class'));
      journal.clock.month = 'Blotmath'; renderChronicleClock();
      const b = [...document.querySelectorAll('#ch-wheel .season-wheel path.on')].map(p => p.getAttribute('class'));
      newScene && typeof ensureActiveScene === 'function' && ensureActiveScene(); renderChronicle && renderChronicle();
      const seal = document.querySelector('#panel-chronicle .ch-scene-h .date-seal .moon');
      return { a, b, seal: !!seal };`);
    checks.push({ ok: !wh.err && JSON.stringify(wh.a) === '["sw-spring on"]' && JSON.stringify(wh.b) === '["sw-autumn on"]', msg: `the season wheel marks the month — Astron in spring, Blotmath in autumn (${JSON.stringify(wh)})` });
    checks.push({ ok: !wh.err && wh.seal, msg: `a Chronicle scene's date is a wax seal with that day's moon (${JSON.stringify(wh)})` });

    // ---- Play: sessions and adventures as seals, no stray chevron after them ----
    await go('play');
    const cs = await safe(`
      char.saga.sessions = 3; char.saga.adventures = 1; saveCharacter(); render();
      const el = document.getElementById('camp-seals'); const s = [...el.querySelectorAll('.wax-seal')];
      return { n: s.map(x => x.textContent), after: s.map(x => getComputedStyle(x, '::after').content) };`);
    checks.push({ ok: !cs.err && JSON.stringify(cs.n) === '["3","1"]' && cs.after.every(c => c === 'none' || c === 'normal'),
      msg: `the campaign line shows sessions and adventures as seals (${JSON.stringify(cs)})` });
    const foot = await safe(`const f = document.querySelector('#panel-play .play-footart'); return !!f && f.checkVisibility() && f.getBoundingClientRect().height > 30;`);
    checks.push({ ok: foot === true, msg: `the Play tab ends on a drawn horizon on a phone (${JSON.stringify(foot)})` });

    // ---- Gear: each weapon and item drawn as what it is ----
    await go('gear');
    const gear = await safe(`
      char.weapons = [{ name: 'Sword', dmg: 4, inj: 16, load: 2 }, { name: 'Short Spear', dmg: 3, inj: 14 }, { name: 'Dagger', dmg: 2, inj: 12 }, { name: 'Great Bow', dmg: 4, inj: 16 }];
      char.usefulItems = ['Knife & salt for cooking', 'Wind-proof lantern', 'Fine pipe'];
      saveCharacter(); render();
      return { w: [...document.querySelectorAll('#weapon-tbody .item-ic use')].map(u => u.getAttribute('href')),
               u: [...document.querySelectorAll('#useful-items-display .item-ic use')].map(u => u.getAttribute('href')) };`);
    checks.push({ ok: !gear.err && JSON.stringify(gear.w) === '["#i-w-sword","#i-w-spear","#i-w-dagger","#i-bow"]', msg: `weapons are drawn by type — sword, spear, dagger, bow (${JSON.stringify(gear.w)})` });
    checks.push({ ok: !gear.err && JSON.stringify(gear.u) === '["#i-knife","#i-lantern","#i-pipe"]', msg: `Useful Items are cards with their own icon (${JSON.stringify(gear.u)})` });

    // ---- Build: drawn step marks; the culture picker shows each crest ----
    await go('build');
    const bd = await safe(`
      const marks = [...document.querySelectorAll('#build-stepper .bs-dot .bs-ic use')].map(u => u.getAttribute('href'));
      const sel = document.getElementById('culture-pick'); openPicker(sel);
      const crests = [...document.querySelectorAll('#pick-list .pick-opt.has-art .pick-art svg')].length;
      const opts = [...document.querySelectorAll('#pick-list .pick-opt')].filter(o => o.checkVisibility()).length;
      closePicker(); return { marks: marks.length, distinct: new Set(marks).size, crests, opts };`);
    checks.push({ ok: !bd.err && bd.marks === 9 && bd.distinct === 9, msg: `each Build step has its own drawn mark (${JSON.stringify(bd)})` });
    checks.push({ ok: !bd.err && bd.crests >= 11 && bd.crests === bd.opts - 1, msg: `every culture in the picker shows its crest (${JSON.stringify(bd)})` });

    // ---- Reference groups and Menu sections carry icons; a toast is a parchment note with a mark ----
    await go('reference');
    const misc = await safe(`
      const ref = [...document.querySelectorAll('#reference-body .ref-group summary h3 .ref-ic')].length;
      const menu = [...document.querySelectorAll('summary.menu-group .mg-ic')].length;
      showToast('Short rest: +5 Endurance'); await new Promise(r => setTimeout(r, 60));
      const t = [...document.querySelectorAll('#toast-wrap .toast')].pop();
      const cs = t ? getComputedStyle(t) : null;
      return { ref, menu, toastIc: t ? (t.querySelector('.toast-ic use') || {}).getAttribute && t.querySelector('.toast-ic use').getAttribute('href') : null, bg: cs && cs.backgroundImage, color: cs && cs.color };`);
    checks.push({ ok: !misc.err && misc.ref === 7 && misc.menu === 6, msg: `Reference groups and Menu sections carry icons (${JSON.stringify(misc)})` });
    checks.push({ ok: !misc.err && misc.toastIc === '#i-heart' && /gradient/.test(misc.bg || '') && misc.color === 'rgb(46, 34, 22)', msg: `a toast is a parchment note with a mark for what it is about (${JSON.stringify(misc)})` });

    // ---- The floating delta never covers the number it describes ----
    const fd = await safe(`
      char.endCur = char.endMax; saveCharacter(); render(); await new Promise(r => setTimeout(r, 50));
      adj('endCur', -3); await new Promise(r => setTimeout(r, 250));
      const d = document.querySelector('#hud-end .fdelta'); if (!d) return { missing: true };
      const a = d.getBoundingClientRect();
      const hit = sel => { const e = document.querySelector('#hud-end ' + sel); if (!e) return false; const b = e.getBoundingClientRect(); return !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom); };
      // the number itself is the text node beside the pill, not the whole .m-val box that now holds it
      const val = document.querySelector('#hud-end .m-val'); const tn = val && [...val.childNodes].find(n => n.nodeType === 3 && n.textContent.trim());
      let value = true; if (tn) { const rg = document.createRange(); rg.selectNodeContents(tn); const b = rg.getBoundingClientRect(); value = !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom); }
      const h = document.getElementById('hud-end').getBoundingClientRect();
      const inside = a.left >= h.left - 1 && a.right <= h.right + 1 && a.top >= h.top - 1 && a.bottom <= h.bottom + 1;
      const lab = document.querySelector('#hud-end .m-label');
      return { value, bar: hit('.m-bar'), label: hit('.m-label') && getComputedStyle(lab).visibility !== 'hidden', inside, onScreen: a.top >= 0 };`);
    checks.push({ ok: fd && !fd.err && !fd.value && !fd.bar && !fd.label && fd.inside && fd.onScreen, msg: `the "−3 End" sits inside its meter and covers neither the label, the number nor the bar (${JSON.stringify(fd)})` });

    // ---- Band: dispositions drawn; allies carry a dwarf's silhouette ----
    const band = await safe(`
      char.moriaMode = true; char.band.allies = [{ id: 'a1', name: 'Nár', gift: 'Keen-eyed', giftDesc: '', quirk: 'Gruff' }];
      saveCharacter(); refreshStriderUI(); render();
      openNavGroup('adventure'); document.querySelector('.tab[data-tab="band"]').click(); await new Promise(r => setTimeout(r, 460));
      const r = { disp: [...document.querySelectorAll('#panel-band .disp-row .disp-ic use')].map(u => u.getAttribute('href')), sil: !!document.querySelector('#panel-band .ally-card .ally-sil') };
      char.moriaMode = false; char.band.allies = []; saveCharacter(); refreshStriderUI(); render(); return r;`);
    checks.push({ ok: !band.err && band.disp.length === 5 && new Set(band.disp).size === 5 && band.sil, msg: `each Disposition has its own glyph and allies carry a silhouette (${JSON.stringify(band)})` });

    // ---- Motion stays still for people who ask for less ----
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const rm = await safe(`
      Object.assign(char.journey, { active: true, destination: 'Mount Gram', totalHexes: 9, currentHex: 2, region: 'Dark', route: null, routeLands: null });
      char.saga.step = 'journey'; saveCharacter(); render();
      openNavGroup('play'); await new Promise(r => setTimeout(r, 460));
      const m = document.querySelector('#panel-play .scene-mist');
      const r = { mist: m ? getComputedStyle(m).animationName : null };
      char.journey.active = false; char.saga.step = 'haven'; saveCharacter(); render(); return r;`);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    checks.push({ ok: !rm.err && rm.mist === 'none', msg: `the mist does not drift under reduced motion (${JSON.stringify(rm)})` });

    checks.push({ ok: errors.length === 0, msg: `0 page errors (got ${errors.length}${errors.length ? ': ' + errors[0] : ''})` });
    await context.close();
    return { checks };
  }
};
