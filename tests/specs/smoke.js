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

    // P3 graceful degradation: with no Firebase SDK, Sync must stay dormant and the app fully local.
    const sync = await page.evaluate(() => ({
      defined: typeof Sync,
      enabled: (typeof Sync !== 'undefined') ? Sync.isEnabled() : null,
      firebaseAbsent: typeof firebase === 'undefined',
      configPresent: typeof window.FIREBASE_CONFIG === 'object'
    }));
    checks.push({ ok: sync.defined === 'object' && sync.enabled === false && sync.firebaseAbsent && sync.configPresent, msg: `Sync dormant + app local when Firebase SDK absent (enabled=${sync.enabled})` });

    // Cloud calls must be safe no-ops while disabled (guards against a mirror firing with no backend).
    const syncGuard = await page.evaluate(() => {
      let threw = false;
      try { Sync.queuePush('nope'); Sync.pushChar('nope'); saveCharacter(); } catch (e) { threw = true; }
      return { threw, stillDisabled: Sync.isEnabled() === false, api: ['queuePush', 'pushChar', '_syncDown', 'linkGoogle', 'status'].every(m => typeof Sync[m] === 'function') };
    });
    checks.push({ ok: !syncGuard.threw && syncGuard.stillDisabled && syncGuard.api, msg: 'cloud calls are safe no-ops while disabled; Sync API present' });

    // P3 UI hooks: menu shows a sync-status line + a Link Google button.
    const syncUi = await page.evaluate(() => {
      toggleMenu();  // open — populates the status line from Sync.status()
      const line = document.getElementById('sync-status-line');
      const txt = line ? line.textContent : '';
      const linkBtn = !!document.querySelector('button[onclick="Sync.linkGoogle()"]');
      toggleMenu();  // close
      return { txt, linkBtn };
    });
    checks.push({ ok: /local/i.test(syncUi.txt) && syncUi.linkBtn, msg: `menu shows sync status ("${syncUi.txt}") + Link Google button` });

    checks.push({ ok: errors.length === 0, msg: `0 page errors during boot+tabs (got ${errors.length}${errors.length ? ': ' + errors[0] : ''})` });

    await context.close();
    return { checks };
  }
};
