// adversaries (P0) — the ported loremaster ADVERSARY_DB + adapter + unified picker + add-to-encounter.
module.exports = {
  name: 'adversaries',
  async run({ browser, baseUrl, newPage }) {
    const checks = [];
    const { context, page, errors } = await newPage(browser, baseUrl + '/character-tracker.html');

    const data = await page.evaluate(() => {
      const all = allBestiary();
      const adapted = ADVERSARY_DB.map(loremasterFoeToEncounter);
      return {
        bestiary: BESTIARY.length,
        advDb: ADVERSARY_DB.length,
        unified: all.length,
        villains: all.filter(b => b.source === 'Named Villains').length,
        hateAllPositive: adapted.every(a => a.hate > 0),
        attacksAllPresent: adapted.every(a => Array.isArray(a.attacks) && a.attacks.length > 0),
        malformed: all.filter(b => !(b.name && typeof b.end === 'number' && typeof b.parry === 'number' && typeof b.atkTN === 'number' && Array.isArray(b.attacks))).length
      };
    });
    checks.push({ ok: data.bestiary === 18, msg: `original BESTIARY = 18 (got ${data.bestiary})` });
    checks.push({ ok: data.advDb === 44, msg: `ADVERSARY_DB = 44 (got ${data.advDb})` });
    checks.push({ ok: data.unified === 56, msg: `unified picker = 56 after de-dupe (got ${data.unified})` });
    checks.push({ ok: data.villains === 11, msg: `Named Villains = 11 (got ${data.villains})` });
    checks.push({ ok: data.hateAllPositive, msg: 'every adapted adversary has Hate > 0' });
    checks.push({ ok: data.attacksAllPresent, msg: 'every adapted adversary has ≥1 attack' });
    checks.push({ ok: data.malformed === 0, msg: `0 malformed unified entries (got ${data.malformed})` });

    // Add a Named Villain to the encounter and confirm a well-formed combatant; then clean up.
    const added = await page.evaluate(() => {
      const all = allBestiary();
      const vIdx = all.findIndex(b => b.name.startsWith('Búrzgul'));
      const n0 = enc().foes.length;
      addFoeFromBestiary(vIdx);
      const f = enc().foes[enc().foes.length - 1];
      const res = { added: enc().foes.length - n0, endMax: f.endMax, hateMax: f.hateMax, parry: f.parry, attacks: f.attacks.length };
      // cleanup
      char.encounter = JSON.parse(JSON.stringify(DEFAULT_CHARACTER.encounter)); saveCharacter();
      return res;
    });
    checks.push({ ok: added.added === 1 && added.endMax > 0 && added.hateMax > 0 && added.attacks > 0, msg: `addFoeFromBestiary(villain) → End ${added.endMax}/Hate ${added.hateMax}/${added.attacks} attacks` });

    checks.push({ ok: errors.length === 0, msg: `0 page errors (got ${errors.length})` });
    await context.close();
    return { checks };
  }
};
