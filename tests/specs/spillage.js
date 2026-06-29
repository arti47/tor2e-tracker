// spillage — no horizontal overflow at phone widths across every visible tab.
// This is the check the interactive preview cannot do (its pane has no real width).
// Stresses the War Gear table (U3 ▲/▼ buttons) by seeding 3 weapons before measuring.
module.exports = {
  name: 'spillage',
  async run({ browser, baseUrl, newPage }) {
    const checks = [];
    for (const width of [360, 390]) {
      const { context, page, errors } = await newPage(browser, baseUrl + '/character-tracker.html');
      await page.setViewportSize({ width, height: 800 });

      // Seed War Gear so the Combat tab's weapon table (with U3 reorder buttons) is exercised.
      await page.evaluate(() => {
        char.weapons = [
          { name: 'Long-hafted Axe', dmg: '5', inj: '18', notes: 'two-handed', picked: true },
          { name: 'Dagger', dmg: '2', inj: '12', picked: true },
          { name: 'Bow', dmg: '4', inj: '16', picked: true }
        ];
        if (typeof renderWeapons === 'function') renderWeapons();
      });

      const visibleTabs = await page.$$eval('.tab', els => els.filter(e => e.style.display !== 'none').map(e => e.dataset.tab));
      for (const t of visibleTabs) {
        await page.click(`.tab[data-tab="${t}"]`);
        const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        checks.push({ ok: over <= 1, msg: `@${width}px tab "${t}": no horizontal overflow (got ${over}px)` });
      }
      checks.push({ ok: errors.length === 0, msg: `@${width}px: 0 page errors` });
      await context.close();
    }
    return { checks };
  }
};
