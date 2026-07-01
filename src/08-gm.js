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
