// smoke — the app boots clean, key globals exist, and every visible tab activates with 0 JS errors.
module.exports = {
  name: 'smoke',
  async run({ browser, baseUrl, newPage }) {
    const checks = [];
    const { context, page, errors } = await newPage(browser, baseUrl + '/character-tracker.html');

    const globals = await page.evaluate(() => ({
      allBestiary: typeof window.allBestiary,
      cycleTheme: typeof window.cycleTheme,
      applyTextSize: typeof window.applyTextSize,
      renderReference: typeof window.renderReference,
      moveWeapon: typeof window.moveWeapon,
      exportAllHeroes: typeof window.exportAllHeroes,
      renderRollStats: typeof window.renderRollStats,
      restoreLastTab: typeof window.restoreLastTab,
      skillCount: (typeof SKILLS !== 'undefined') ? Object.values(SKILLS).flat().length : -1
    }));
    for (const [k, v] of Object.entries(globals)) {
      if (k === 'skillCount') checks.push({ ok: v === 18, msg: `SKILLS flattens to 18 (got ${v})` });
      else checks.push({ ok: v === 'function', msg: `global ${k} is a function (got ${v})` });
    }

    // Click through every visible tab; each should activate its panel.
    const visibleTabs = await page.$$eval('.tab', els => els.filter(e => e.style.display !== 'none').map(e => e.dataset.tab));
    for (const t of visibleTabs) {
      await page.click(`.tab[data-tab="${t}"]`);
      const active = await page.$eval(`#panel-${t}`, el => el.classList.contains('active'));
      checks.push({ ok: active, msg: `tab "${t}" activates its panel` });
    }
    checks.push({ ok: visibleTabs.includes('reference'), msg: 'Reference tab is present & visible' });

    checks.push({ ok: errors.length === 0, msg: `0 page errors during boot+tabs (got ${errors.length}${errors.length ? ': ' + errors[0] : ''})` });

    await context.close();
    return { checks };
  }
};
