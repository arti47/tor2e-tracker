// gm — guards the P6 GM Screen: device-global toggle shows/hides the tab, renderGm lists every
// roster hero, and the hand-out controls mutate the active hero (damage / condition / Shadow).
module.exports = {
  name: 'gm',
  async run({ browser, baseUrl, newPage }) {
    const checks = [];
    const { context, page, errors } = await newPage(browser, baseUrl + '/character-tracker.html');

    // Toggle visibility via the device-global flag (avoid toggleGmScreen's menu side-effects here).
    const vis = await page.evaluate(() => {
      const tab = document.querySelector('.tab[data-tab="gm"]');
      localStorage.setItem('tor2e-gm', '1'); refreshGmUI();
      const on = tab.style.display !== 'none' && gmEnabled();
      const btnOn = document.getElementById('gm-mode-btn').textContent;
      localStorage.removeItem('tor2e-gm'); refreshGmUI();
      const off = tab.style.display === 'none' && !gmEnabled();
      const btnOff = document.getElementById('gm-mode-btn').textContent;
      return { on, off, btnOn, btnOff };
    });
    checks.push({ ok: vis.on && vis.off, msg: 'GM flag shows/hides the tab' });
    checks.push({ ok: /Disable/.test(vis.btnOn) && /Enable/.test(vis.btnOff), msg: `menu button label tracks state (${vis.btnOn} / ${vis.btnOff})` });

    // renderGm lists at least the active hero, with a control row.
    const listed = await page.evaluate(() => {
      localStorage.setItem('tor2e-gm', '1'); refreshGmUI();
      const body = document.getElementById('gm-party-body');
      const cards = body.querySelectorAll('.card').length;
      const hasCtrls = /−1 End/.test(body.innerHTML) && /Shadow/.test(body.innerHTML);
      return { cards, hasCtrls };
    });
    checks.push({ ok: listed.cards >= 1 && listed.hasCtrls, msg: `renderGm lists heroes with controls (${listed.cards} card(s))` });

    // Hand-out controls mutate the active hero and persist.
    const mut = await page.evaluate(() => {
      const id = activeCharId;
      char.endMax = 20; char.endCur = 20; char.hopeMax = 10; char.scars = 0; char.shadow = 0;
      char.weary = false; saveCharacter();
      gmDamage(id, 3);   const afterDmg = char.endCur;            // 17
      gmHeal(id, 1);     const afterHeal = char.endCur;           // 18
      gmCond(id, 'weary'); const weary = char.weary;              // true
      gmShadow(id, 2);   const shadow = char.shadow;              // 2
      // cap: shadow can't exceed hopeMax - scars
      char.shadow = 9; gmShadow(id, 5); const capped = char.shadow; // clamp to 10
      const persisted = (JSON.parse(localStorage.getItem('tor2e-char-' + id)).endCur === 18);
      char.endCur = 20; char.weary = false; char.shadow = 0; saveCharacter();
      return { afterDmg, afterHeal, weary, shadow, capped, persisted };
    });
    checks.push({ ok: mut.afterDmg === 17 && mut.afterHeal === 18, msg: `gmDamage/gmHeal adjust Endurance (${mut.afterDmg}→${mut.afterHeal})` });
    checks.push({ ok: mut.weary === true, msg: 'gmCond toggles a condition' });
    checks.push({ ok: mut.shadow === 2 && mut.capped === 10, msg: `gmShadow adds & clamps to hopeMax−scars (${mut.shadow}, cap ${mut.capped})` });
    checks.push({ ok: mut.persisted, msg: 'GM mutations persist to the hero slot' });

    // Group Shadow Test — rolls for every roster hero and renders a PASS/FAIL row each.
    const gst = await page.evaluate(() => {
      localStorage.setItem('tor2e-gm', '1'); refreshGmUI();
      const n = (loadRoster() || { list: [] }).list.length;
      gmGroupShadowTest('dread');
      const box = document.getElementById('gm-shadow-results');
      const rows = box.querySelectorAll('div[style*="space-between"]').length;
      const titled = /Dread/.test(box.innerHTML);
      const verdicts = (box.innerHTML.match(/PASS|FAIL/g) || []).length;
      // Despair forces Ill-Favoured: a maxed-Shadow hero should be flagged.
      char.hopeMax = 4; char.shadow = 4; char.scars = 0; char.valour = 2; char.hrtTN = 14; saveCharacter();
      gmGroupShadowTest('dread');
      const despairFlag = /⚠Despair/.test(document.getElementById('gm-shadow-results').innerHTML);
      char.shadow = 0; saveCharacter();
      return { n, rows, titled, verdicts, despairFlag };
    });
    checks.push({ ok: gst.rows === gst.n && gst.titled && gst.verdicts === gst.n, msg: `group shadow test renders a verdict per hero (${gst.rows}/${gst.n})` });
    checks.push({ ok: gst.despairFlag, msg: 'maxed-Shadow hero flagged ⚠Despair (Ill-Favoured)' });

    // Eye of Mordor manager — renders a per-hero row and gmEye adjusts (floored at 0).
    const eye = await page.evaluate(() => {
      localStorage.setItem('tor2e-gm', '1'); refreshGmUI();
      const id = activeCharId;
      char.eyeAwareness = 0; char.huntRegion = 'dark'; char.huntMod = 0; saveCharacter();
      renderGm();
      const rows = document.getElementById('gm-eye-body').querySelectorAll('div[style*="space-between"]').length;
      gmEye(id, 2); const up = char.eyeAwareness;      // 2
      gmEye(id, -5); const floored = char.eyeAwareness; // 0, not negative
      const shownHunt = /Hunt 14/.test(document.getElementById('gm-eye-body').innerHTML); // dark = 14
      char.eyeAwareness = 0; saveCharacter();
      return { rows, up, floored, shownHunt };
    });
    checks.push({ ok: eye.rows >= 1 && eye.up === 2 && eye.floored === 0, msg: `Eye manager renders + gmEye adjusts/floors (${eye.up}→${eye.floored})` });
    checks.push({ ok: eye.shownHunt, msg: 'Eye row shows the Hunt threshold (dark=14)' });

    // NPC ledger — lore refs always present; add/filter/delete a custom NPC (device-global).
    const npc = await page.evaluate(() => {
      localStorage.removeItem('tor2e-gm-npcs');
      renderGmNpc();
      const loreShown = /Gorgol/.test(document.getElementById('gm-npc-body').innerHTML);
      document.getElementById('gm-npc-name').value = 'Zib- the Trap-maker';
      document.getElementById('gm-npc-role').value = 'Goblin engineer';
      gmAddNpc();
      const added = /Zib- the Trap-maker/.test(document.getElementById('gm-npc-body').innerHTML) && gmNpcs().length === 1;
      document.getElementById('gm-npc-filter').value = 'zib- the trap'; renderGmNpc();
      const filtered = /Zib- the Trap-maker/.test(document.getElementById('gm-npc-body').innerHTML) && !/Gorgol/.test(document.getElementById('gm-npc-body').innerHTML);
      const delId = gmNpcs()[0].id; gmDelNpc(delId);
      const deleted = gmNpcs().length === 0;
      document.getElementById('gm-npc-filter').value = '';
      localStorage.removeItem('tor2e-gm-npcs');
      return { loreShown, added, filtered, deleted };
    });
    checks.push({ ok: npc.loreShown && npc.added, msg: 'NPC ledger shows lore + adds a custom NPC' });
    checks.push({ ok: npc.filtered && npc.deleted, msg: 'NPC ledger search filters + delete removes' });

    await page.evaluate(() => { localStorage.removeItem('tor2e-gm'); refreshGmUI(); });
    checks.push({ ok: errors.length === 0, msg: `0 page errors (got ${errors.length})` });
    await context.close();
    return { checks };
  }
};
