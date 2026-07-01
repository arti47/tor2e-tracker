/* ---------- GM SCREEN (P6 — local Loremaster dashboard) ----------
   Gated behind a menu toggle (tor2e-gm), like the solo modes. LOCAL for now: every roster hero on
   this device shown with hand-out controls (damage / heal / conditions / Shadow) + a drop-a-foe
   shortcut into the Combat encounter. Gains a LIVE shared party when cloud campaigns (P4) land.
   Writes go through the normal per-slot path (and mirror to cloud if active). */
const GM_KEY = 'tor2e-gm';
function gmEnabled() { try { return localStorage.getItem(GM_KEY) === '1'; } catch (e) { return false; } }

function refreshGmUI() {
  const tab = document.querySelector('.tab[data-tab="gm"]');
  if (tab) tab.style.display = gmEnabled() ? '' : 'none';
  const btn = document.getElementById('gm-mode-btn');
  if (btn) btn.textContent = gmEnabled() ? '🎲 Disable GM Screen' : '🎲 Enable GM Screen';
  if (!gmEnabled() && tab && tab.classList.contains('active')) {
    const home = document.querySelector('.tab[data-tab="character"]');
    if (home) home.click();
  }
  if (gmEnabled()) renderGm();   // keep the party body fresh across hero switches / re-renders
}
function toggleGmScreen() {
  try { gmEnabled() ? localStorage.removeItem(GM_KEY) : localStorage.setItem(GM_KEY, '1'); } catch (e) {}
  refreshGmUI();
  if (gmEnabled()) { const t = document.querySelector('.tab[data-tab="gm"]'); if (t) t.click(); }
  if (typeof toggleMenu === 'function') toggleMenu();
}

// Apply a mutation to a hero by id (active hero → live char; others → its slot), persist, mirror, re-render.
function gmMutateHero(id, mut) {
  if (id === activeCharId) { mut(char); saveCharacter(); if (typeof render === 'function') render(); }
  else {
    const d = readSlot(id); if (!d) return;
    mut(d);
    localStorage.setItem(CHAR_PREFIX + id, JSON.stringify(d));
    if (typeof Sync !== 'undefined' && Sync.enabled) Sync.queuePush(id);
  }
  renderGm();
}
function gmDamage(id, n) { gmMutateHero(id, d => { d.endCur = Math.max(0, (parseInt(d.endCur) || 0) - n); }); }
function gmHeal(id, n) { gmMutateHero(id, d => { d.endCur = Math.min(parseInt(d.endMax) || 0, (parseInt(d.endCur) || 0) + n); }); }
function gmCond(id, cond) { gmMutateHero(id, d => { d[cond] = !d[cond]; }); }
function gmShadow(id, n) { gmMutateHero(id, d => { const cap = Math.max(0, (parseInt(d.hopeMax) || 0) - (parseInt(d.scars) || 0)); d.shadow = Math.max(0, Math.min(cap, (parseInt(d.shadow) || 0) + n)); }); }

function renderGm() {
  const body = document.getElementById('gm-party-body'); if (!body) return;
  const r = loadRoster() || { activeId: activeCharId, list: [] };
  const rows = r.list.map(e => {
    const d = (e.id === activeCharId) ? char : readSlot(e.id);
    if (!d) return '';
    const totalShadow = (parseInt(d.shadow) || 0) + (parseInt(d.scars) || 0);
    const dying = (parseInt(d.endCur) || 0) <= 0;
    const cbtn = (cond, label) => `<button onclick="gmCond('${e.id}','${cond}')" aria-pressed="${!!d[cond]}" style="font-size:10px;padding:2px 7px;background:${d[cond] ? 'var(--btn-alert-bg)' : 'var(--bg-deep)'};color:${d[cond] ? '#fff' : 'var(--ink)'}">${label}</button>`;
    return `<div class="card" style="padding:10px 12px;margin-bottom:8px">
      <div style="font-weight:700">${escapeHtml(d.name || '?')}${e.id === activeCharId ? ' ★' : ''}${dying ? ' <span style="color:var(--error-text)">DYING</span>' : ''}</div>
      <div style="font-size:12px;color:var(--text-muted);margin:2px 0 6px">❤ ${d.endCur ?? '?'}/${d.endMax ?? '?'} &middot; ✦ ${d.hopeCur ?? '?'}/${d.hopeMax ?? '?'} &middot; 🌑 ${totalShadow}</div>
      <div style="display:flex;flex-wrap:wrap;gap:4px;align-items:center">
        <button onclick="gmDamage('${e.id}',1)" style="font-size:11px;padding:2px 7px" aria-label="Deal 1 damage to ${escapeHtml(d.name || 'hero')}">−1 End</button>
        <button onclick="gmDamage('${e.id}',3)" style="font-size:11px;padding:2px 7px">−3</button>
        <button onclick="gmHeal('${e.id}',3)" style="font-size:11px;padding:2px 7px">+3</button>
        ${cbtn('weary', 'Weary')} ${cbtn('miserable', 'Miserable')} ${cbtn('wounded', 'Wounded')}
        <button onclick="gmShadow('${e.id}',1)" style="font-size:11px;padding:2px 7px">+Shadow</button>
      </div></div>`;
  }).join('');
  body.innerHTML = rows || '<div class="hint" style="text-align:center;padding:10px">No heroes on this device yet.</div>';
}

/* ---------- GM: Group Shadow Test (ported from tor2e-loremaster-main) ----------
   Rolls a Shadow test for EVERY roster hero at once: Dread = Valour vs Heart TN;
   Greed & Sorcery = Wisdom vs Wits TN (per Core Rules). Each hero's OWN weary flag and
   Despair state (Shadow+Scars ≥ Max Hope → Ill-Favoured, RAW p.137) apply — not the active
   hero's — so the roll is per-hero correct. Failures offer a one-tap +N Shadow via the capped gmShadow. */
const GM_SHADOW_TESTS = {
  dread:   { label: 'Dread',   stat: 'valour', tnField: 'hrtTN' },
  greed:   { label: 'Greed',   stat: 'wisdom', tnField: 'witTN' },
  sorcery: { label: 'Sorcery', stat: 'wisdom', tnField: 'witTN' }
};
// Per-hero Feat+Success roll (self-contained so a tested hero's own weary/Despair applies).
function _gmRollHero(hero, dice, tn) {
  const rollFeat = () => { const v = Math.floor(Math.random() * 12) + 1; if (v === 11) return { label: '👁', value: 0, special: 'eye' }; if (v === 12) return { label: 'ᚱ', value: 11, special: 'rune' }; return { label: String(v), value: v }; };
  const hopeMax = parseInt(hero.hopeMax) || 0;
  const totalShadow = (parseInt(hero.shadow) || 0) + (parseInt(hero.scars) || 0);
  const despair = hopeMax > 0 && totalShadow >= hopeMax;
  let feat;
  if (despair) { const a = rollFeat(), b = rollFeat(), score = r => r.special === 'rune' ? 100 : (r.special === 'eye' ? -100 : r.value); feat = score(a) <= score(b) ? a : b; }
  else feat = rollFeat();
  const weary = !!hero.weary;
  let sum = 0, icons = 0;
  for (let i = 0; i < dice; i++) { const d = Math.floor(Math.random() * 6) + 1; if (!(weary && d <= 3)) sum += d; if (d === 6) icons++; }
  const total = feat.special === 'rune' ? null : feat.value + sum;
  let pass;
  if (feat.special === 'rune') pass = true; else if (feat.special === 'eye') pass = false; else pass = total >= tn;
  return { feat, total, icons, pass, despair, weary };
}
function gmGroupShadowTest(type) {
  const cfg = GM_SHADOW_TESTS[type]; if (!cfg) return;
  const amtEl = document.getElementById('gm-shadow-amount');
  const amount = Math.max(1, parseInt(amtEl && amtEl.value) || 1);
  const r = loadRoster() || { list: [] };
  const rows = r.list.map(e => {
    const d = (e.id === activeCharId) ? char : readSlot(e.id);
    if (!d) return '';
    const dice = Math.max(0, parseInt(d[cfg.stat]) || 0);
    const tn = parseInt(d[cfg.tnField]) || 14;
    const res = _gmRollHero(d, dice, tn);
    const featTxt = res.feat.special === 'rune' ? 'ᚱ' : (res.feat.special === 'eye' ? '👁' : res.total);
    const flags = (res.despair ? ' ⚠Despair' : '') + (res.weary ? ' ·Weary' : '');
    const failBtn = res.pass ? '' : `<button onclick="gmShadow('${e.id}',${amount})" style="font-size:10px;padding:2px 7px;background:var(--btn-alert-bg);color:#fff" aria-label="Add ${amount} Shadow to ${escapeHtml(d.name || 'hero')}">+${amount} Shadow</button>`;
    return `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid var(--border)">
      <span><b>${escapeHtml(d.name || '?')}</b> <small style="color:var(--text-muted)">${cfg.label} ${dice}d vs ${tn}${flags}</small></span>
      <span><b style="color:${res.pass ? 'var(--success-text)' : 'var(--error-text)'}">${res.pass ? 'PASS' : 'FAIL'}</b> <small style="color:var(--text-muted)">(${featTxt})</small> ${failBtn}</span>
    </div>`;
  }).join('');
  const box = document.getElementById('gm-shadow-results');
  if (box) box.innerHTML = `<div style="font-weight:700;margin-bottom:4px">${cfg.label} — group Shadow test (fail → +${amount})</div>${rows || '<div class="hint">No heroes.</div>'}`;
}
