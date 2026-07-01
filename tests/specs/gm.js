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

    await page.evaluate(() => { localStorage.removeItem('tor2e-gm'); refreshGmUI(); });
    checks.push({ ok: errors.length === 0, msg: `0 page errors (got ${errors.length})` });
    await context.close();
    return { checks };
  }
};
