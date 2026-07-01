// a11y (P8) — dialog semantics, focus management, keyboard, live regions, nav aria-current.
module.exports = {
  name: 'a11y',
  async run({ browser, baseUrl, newPage }) {
    const checks = [];
    const { context, page, errors } = await newPage(browser, baseUrl + '/character-tracker.html');

    // Live regions on dice result + vitals.
    const live = await page.evaluate(() => ({
      roll: document.getElementById('roll-result').getAttribute('aria-live'),
      end: document.getElementById('end-cur-v').getAttribute('aria-live'),
      hope: document.getElementById('hope-cur-v').getAttribute('aria-live')
    }));
    checks.push({ ok: live.roll === 'polite' && live.end === 'polite' && live.hope === 'polite', msg: 'aria-live=polite on dice result + End/Hope vitals' });

    // Nav aria-current tracks the active tab (exactly one).
    const nav = await page.evaluate(() => {
      document.querySelector('.tab[data-tab="dice"]').click();
      return { active: document.querySelector('.tab[aria-current="page"]')?.dataset.tab, count: document.querySelectorAll('.tab[aria-current="page"]').length };
    });
    checks.push({ ok: nav.active === 'dice' && nav.count === 1, msg: `nav aria-current marks exactly the active tab (${nav.active}, count ${nav.count})` });

    // Dialog semantics on overlays.
    const dlg = await page.evaluate(() => {
      const ov = document.getElementById('menu-overlay');
      return { role: ov.getAttribute('role'), modal: ov.getAttribute('aria-modal'), labelled: !!ov.getAttribute('aria-labelledby') };
    });
    checks.push({ ok: dlg.role === 'dialog' && dlg.modal === 'true' && dlg.labelled, msg: 'overlays are role=dialog + aria-modal=true + aria-labelledby' });

    // Opening a dialog moves focus inside it.
    await page.evaluate(() => { document.querySelector('.tab[data-tab="character"]').focus(); openTimeline(); });
    await page.waitForTimeout(90);
    const focusIn = await page.evaluate(() => {
      const ov = document.getElementById('timeline-overlay');
      return { shown: ov.classList.contains('show'), inside: ov.contains(document.activeElement) };
    });
    checks.push({ ok: focusIn.shown && focusIn.inside, msg: 'opening a dialog moves focus inside it' });

    // Escape closes it + focus returns to the opener.
    await page.keyboard.press('Escape');
    await page.waitForTimeout(60);
    const afterEsc = await page.evaluate(() => ({
      shown: document.getElementById('timeline-overlay').classList.contains('show'),
      restoredToOpener: !!(document.activeElement && document.activeElement.dataset && document.activeElement.dataset.tab === 'character')
    }));
    checks.push({ ok: !afterEsc.shown, msg: 'Escape closes the dialog' });
    checks.push({ ok: afterEsc.restoredToOpener, msg: 'focus restored to the opener after close' });

    checks.push({ ok: errors.length === 0, msg: `0 page errors (got ${errors.length})` });
    await context.close();
    return { checks };
  }
};
