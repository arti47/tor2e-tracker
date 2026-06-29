// ux — guards this session's UX features: themes (U10), text size (U9), Reference (U5/6/8),
// roll stats (U13), and remember-last-tab (U4).
module.exports = {
  name: 'ux',
  async run({ browser, baseUrl, newPage }) {
    const checks = [];
    const { context, page, errors } = await newPage(browser, baseUrl + '/character-tracker.html');

    // U10 — theme cycle visits all 5, each with the right body class.
    const themeRun = await page.evaluate(() => {
      localStorage.removeItem('tor2e-theme'); applyTheme();
      const seen = [];
      for (let i = 0; i < 5; i++) {
        const pref = localStorage.getItem('tor2e-theme') || 'auto';
        const cls = document.body.className.split(' ').filter(c => c === 'dark' || c.startsWith('theme-')).join(',') || 'light';
        seen.push(pref + ':' + cls);
        cycleTheme();
      }
      localStorage.removeItem('tor2e-theme'); applyTheme();
      return seen;
    });
    checks.push({ ok: themeRun.length === 5 && themeRun.some(s => s.startsWith('sepia:theme-sepia')) && themeRun.some(s => s.startsWith('hc:theme-hc')) && themeRun.some(s => s.startsWith('dark:dark')) && themeRun.some(s => s.startsWith('light:light')), msg: `themes cycle Auto/Light/Dark/Sepia/HC (${themeRun.join(' · ')})` });

    // U9 — text size classes.
    const sizeRun = await page.evaluate(() => {
      const out = {};
      localStorage.setItem('tor2e-textsize', 'small'); applyTextSize(); out.small = document.body.classList.contains('text-small');
      localStorage.setItem('tor2e-textsize', 'large'); applyTextSize(); out.large = document.body.classList.contains('text-large');
      localStorage.removeItem('tor2e-textsize'); applyTextSize(); out.normal = !document.body.classList.contains('text-small') && !document.body.classList.contains('text-large');
      return out;
    });
    checks.push({ ok: sizeRun.small && sizeRun.large && sizeRun.normal, msg: 'text-size applies text-small / text-large / clears' });

    // U5/6/8 — Reference tab renders groups + filter.
    const ref = await page.evaluate(() => {
      document.querySelector('.tab[data-tab="reference"]').click();
      const all = document.getElementById('reference-body').innerText;
      const groups = (document.getElementById('reference-body').innerHTML.match(/<h3/g) || []).length;
      document.getElementById('ref-filter').value = 'stealth'; renderReference();
      const filtered = document.getElementById('reference-body').innerText;
      document.getElementById('ref-filter').value = ''; renderReference();
      return { groups, hasWeary: all.includes('Weary'), hasStealth: all.includes('Stealth'), filterShowsStealth: filtered.includes('Stealth'), filterHidesWeary: !filtered.includes('Weary') };
    });
    checks.push({ ok: ref.groups === 6, msg: `Reference renders 6 groups (got ${ref.groups})` });
    checks.push({ ok: ref.hasWeary && ref.hasStealth, msg: 'Reference includes Conditions (Weary) + Skills (Stealth)' });
    checks.push({ ok: ref.filterShowsStealth && ref.filterHidesWeary, msg: 'Reference search filters (stealth shows, Weary hidden)' });

    // U13 — roll stats math.
    const stats = await page.evaluate(() => {
      const saved = history.slice(); history.length = 0;
      history.push({ label: 'A', total: 16, tn: 15, outcome: 'SUCCESS', icons: 2, time: 'now' });
      history.push({ label: 'B', total: 9, tn: 15, outcome: 'FAIL', icons: 0, time: 'now' });
      history.push({ label: 'C', total: 18, tn: 14, outcome: 'SUCCESS', icons: 1, time: 'now' });
      renderHistory();
      const txt = document.getElementById('roll-stats').innerText.replace(/\s+/g, ' ').trim();
      history.length = 0; saved.forEach(h => history.push(h)); renderHistory();
      return txt;
    });
    checks.push({ ok: /3 rolls/.test(stats) && /67%/.test(stats) && /🌟 1/.test(stats), msg: `roll stats math correct ("${stats}")` });

    // U4 — restoreLastTab respects hidden tabs.
    const tab = await page.evaluate(() => {
      const active = () => document.querySelector('.tab.active')?.dataset.tab;
      document.querySelector('.tab[data-tab="character"]').click();
      localStorage.setItem('tor2e-lasttab', 'dice'); restoreLastTab(); const restored = active();
      document.querySelector('.tab[data-tab="character"]').click();
      localStorage.setItem('tor2e-lasttab', 'oracle'); restoreLastTab(); const afterHidden = active();
      localStorage.removeItem('tor2e-lasttab'); document.querySelector('.tab[data-tab="character"]').click();
      return { restored, afterHidden };
    });
    checks.push({ ok: tab.restored === 'dice' && tab.afterHidden === 'character', msg: 'restoreLastTab reopens visible tab, skips hidden (oracle)' });

    checks.push({ ok: errors.length === 0, msg: `0 page errors (got ${errors.length})` });
    await context.close();
    return { checks };
  }
};
