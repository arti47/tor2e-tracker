/* ---------- GM SCREEN (P6 — local Loremaster dashboard) ----------
   Gated behind a menu toggle (tor2e-gm), like the solo modes. LOCAL for now: every roster hero on
   this device shown with hand-out controls (damage / heal / conditions / Shadow) + a drop-a-foe
   shortcut into the Combat encounter. Gains a LIVE shared party when cloud campaigns (P4) land.
   Writes go through the normal per-slot path (and mirror to cloud if active). */
const GM_KEY = 'tor2e-gm';
function gmEnabled() { try { return localStorage.getItem(GM_KEY) === '1'; } catch (e) { return false; } }
// P6: in a campaign the ROLE decides — the loremaster always sees the GM tab, players never do
// (regardless of the local toggle). Out of a campaign, the device-local toggle decides as before.
function gmInCampaign() { return typeof Sync !== 'undefined' && Sync.isEnabled && Sync.isEnabled() && Sync.currentCampaign && !!Sync.currentCampaign(); }
function gmVisible() { return gmInCampaign() ? Sync.isLoremaster() : gmEnabled(); }

function refreshGmUI() {
  const tab = document.querySelector('.tab[data-tab="gm"]');
  const vis = gmVisible();
  if (tab) tab.style.display = vis ? '' : 'none';
  const btn = document.getElementById('gm-mode-btn');
  if (btn) btn.textContent = gmInCampaign()
    ? (Sync.isLoremaster() ? '🎲 GM Screen (campaign: you are Loremaster)' : '🎲 GM Screen (campaign: Loremaster only)')
    : (gmEnabled() ? '🎲 Disable GM Screen' : '🎲 Enable GM Screen');
  if (!vis && tab && tab.classList.contains('active')) {
    const home = document.querySelector('.tab[data-tab="character"]');
    if (home) home.click();
  }
  if (vis) renderGm();   // keep the party body fresh across hero switches / re-renders
}
function toggleGmScreen() {
  if (gmInCampaign()) {
    // Role-controlled while in a campaign — the toggle is informational only.
    alert(Sync.isLoremaster()
      ? 'You are this campaign\'s Loremaster — the 🎲 GM tab is always available while in the campaign.'
      : 'In a campaign, the GM Screen belongs to the Loremaster. Leave the campaign to use the local GM Screen.');
    if (Sync.isLoremaster()) { const t = document.querySelector('.tab[data-tab="gm"]'); if (t) t.click(); if (typeof toggleMenu === 'function') toggleMenu(); }
    return;
  }
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
  // Encounter line + the Eye and NPC sub-panels (present only when the GM tab is rendered).
  const encLine = document.getElementById('gm-enc-line');
  if (encLine) {
    // P5: shared-aware — in a campaign this reads the shared encounter (same as the Combat tab).
    const shared = (typeof encShared === 'function') && encShared();
    const en = (typeof enc === 'function') ? enc() : (char.encounter || {});
    const foes = Array.isArray(en.foes) ? en.foes : [];
    const living = foes.filter(f => !f.slain).length;
    encLine.textContent = (en.active && foes.length)
      ? `Active ${shared ? 'SHARED campaign' : ''} encounter${shared ? '' : ` (${char.name || 'active hero'})`}: ${living} living / ${foes.length} foe(s), round ${en.round || 1}.`
      : (shared ? 'No active encounter (shared — visible to the whole campaign when started).' : 'No active encounter.');
  }
  renderGmEye();
  renderGmNpc();
  renderGmCampaign();
}

/* ---------- P6: campaign Fellowship (live members + peek + broadcast) ---------- */
function _gmOnParty() {
  // Re-render the GM tab live when the party changes and the tab is open.
  const tab = document.querySelector('.tab[data-tab="gm"]');
  if (tab && tab.classList.contains('active')) renderGmCampaign();
}
function renderGmCampaign() {
  const box = document.getElementById('gm-campaign-body'); if (!box) return;
  if (!gmInCampaign() || !Sync.isLoremaster()) { box.innerHTML = ''; return; }
  Sync.subscribeParty(_gmOnParty);   // multi-listener; replays the latest snapshot
  const members = (Sync.lastParty && Sync.lastParty()) || {};
  const rows = Object.keys(members).map(uid => {
    const m = members[uid] || {}; const v = m.vitals || {};
    const conds = [v.weary && 'Weary', v.miserable && 'Miserable', v.wounded && 'Wounded', v.dying && 'DYING'].filter(Boolean).join(', ');
    return `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--border)">
      <span>${m.online ? '🟢' : '⚪'} <b>${escapeHtml(v.name || m.displayName || 'Hero')}</b>${uid === Sync.uid ? ' ★' : ''}
        <small style="color:var(--text-muted)">❤ ${v.endCur ?? '?'}/${v.endMax ?? '?'} · ✦ ${v.hopeCur ?? '?'}/${v.hopeMax ?? '?'} · 🌑 ${v.shadow ?? 0}${conds ? ' · <span style="color:var(--error-text)">' + conds + '</span>' : ''}</small></span>
      ${m.characterId ? `<button onclick="gmPeek('${m.characterId}')" style="font-size:11px;padding:2px 9px" aria-label="Peek at ${escapeHtml(v.name || 'hero')}'s sheet">👁 Peek</button>` : ''}
    </div>`;
  }).join('');
  box.innerHTML = `<div class="card" style="border-color:var(--gold)">
    <h3 class="card-title">🏰 Campaign Fellowship (live)</h3>
    <div>${rows || '<div class="hint">No members yet.</div>'}</div>
  </div>
  <div class="card">
    <h3 class="card-title">📢 Broadcast to the party</h3>
    <textarea id="gm-bcast-text" rows="2" placeholder="Message every player sees as a toast + in their Loremaster Feed…" style="width:100%;padding:6px 8px;border:1px solid var(--border);border-radius:6px;background:var(--card-bg);color:var(--ink);font-size:13px"></textarea>
    <button onclick="gmBroadcastSend()" style="width:100%;margin-top:6px">📢 Send</button>
    <div id="gm-bcast-feed" style="margin-top:8px"></div>
  </div>`;
  if (typeof renderBroadcastFeed === 'function' && Sync.lastBroadcasts) renderBroadcastFeed(Sync.lastBroadcasts());
}
async function gmBroadcastSend() {
  const el = document.getElementById('gm-bcast-text');
  const text = el ? el.value : '';
  try { await Sync.sendBroadcast(text); if (el) el.value = ''; }
  catch (e) { alert('Broadcast failed: ' + (e && e.message ? e.message : e)); }
}
// Read-only peek at a member's full sheet (rule-enforced: loremaster of their campaign only).
async function gmPeek(characterId) {
  let rec = null;
  try { rec = await Sync.peekCharacter(characterId); }
  catch (e) { alert('Could not read that sheet: ' + (e && e.message ? e.message : e)); return; }
  const d = rec && rec.data;
  if (!d) { alert('No sheet found for that hero.'); return; }
  const skills = Object.keys(d.skills || {}).filter(s => (d.skills[s] && (d.skills[s].rating || d.skills[s])) > 0)
    .map(s => { const sk = d.skills[s]; const r = (sk && sk.rating) || 0; return `${escapeHtml(s)} ${r}${sk && sk.favoured ? '★' : ''}`; }).join(' · ');
  const profs = Object.keys(d.profs || {}).filter(p => (parseInt(d.profs[p]) || 0) > 0).map(p => `${escapeHtml(p)} ${d.profs[p]}`).join(' · ');
  const weapons = (d.weapons || []).map(w => escapeHtml(w.name)).filter(Boolean).join(', ');
  const conds = [d.weary && 'Weary', d.miserable && 'Miserable', d.wounded && 'Wounded'].filter(Boolean).join(', ') || '—';
  const msg = `<div style="text-align:left;font-size:13px;line-height:1.55">
    <b>${escapeHtml(d.name || 'Hero')}</b> — ${escapeHtml([d.culture, d.calling].filter(Boolean).join(' · ') || '')}<br>
    Str ${d.strRating ?? '?'} (TN ${d.strTN ?? '?'}) · Heart ${d.hrtRating ?? '?'} (TN ${d.hrtTN ?? '?'}) · Wits ${d.witRating ?? '?'} (TN ${d.witTN ?? '?'})<br>
    ❤ ${d.endCur ?? '?'}/${d.endMax ?? '?'} · ✦ ${d.hopeCur ?? '?'}/${d.hopeMax ?? '?'} · 🌑 ${(parseInt(d.shadow) || 0)}+${(parseInt(d.scars) || 0)}scar · Parry ${d.parry ?? '?'}<br>
    Valour ${d.valour ?? '?'} · Wisdom ${d.wisdom ?? '?'} · Conditions: ${escapeHtml(conds)}<br>
    ${skills ? `<span style="color:var(--text-muted)">Skills:</span> ${skills}<br>` : ''}
    ${profs ? `<span style="color:var(--text-muted)">Profs:</span> ${profs}<br>` : ''}
    ${weapons ? `<span style="color:var(--text-muted)">Weapons:</span> ${weapons}` : ''}
  </div>`;
  if (typeof showModal === 'function') await showModal({ title: '👁 ' + (d.name || 'Hero') + ' (read-only)', message: msg, buttons: [{ label: 'Close' }] });
  else alert((d.name || 'Hero') + ' — see console');
}

/* ---------- GM: Eye of Mordor (surfaces the per-hero solo-mode Eye Awareness) ---------- */
function gmEye(id, delta) { gmMutateHero(id, d => { d.eyeAwareness = Math.max(0, (parseInt(d.eyeAwareness) || 0) + delta); }); }
function renderGmEye() {
  const body = document.getElementById('gm-eye-body'); if (!body) return;
  const HT = (typeof HUNT_THRESHOLDS !== 'undefined') ? HUNT_THRESHOLDS : { border: 18, wild: 16, dark: 14 };
  const r = loadRoster() || { list: [] };
  body.innerHTML = r.list.map(e => {
    const d = (e.id === activeCharId) ? char : readSlot(e.id); if (!d) return '';
    const ea = parseInt(d.eyeAwareness) || 0;
    const hunt = (HT[d.huntRegion] || 16) + (parseInt(d.huntMod) || 0);
    const over = ea >= hunt;
    return `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid var(--border)">
      <span><b>${escapeHtml(d.name || '?')}</b> <small style="color:${over ? 'var(--error-text)' : 'var(--text-muted)'}">👁 ${ea} / Hunt ${hunt}${over ? ' ⚠' : ''}</small></span>
      <span><button onclick="gmEye('${e.id}',-1)" style="font-size:11px;padding:2px 9px" aria-label="Lower Eye Awareness for ${escapeHtml(d.name || 'hero')}">−</button>
      <button onclick="gmEye('${e.id}',1)" style="font-size:11px;padding:2px 9px" aria-label="Raise Eye Awareness for ${escapeHtml(d.name || 'hero')}">+</button></span>
    </div>`;
  }).join('') || '<div class="hint">No heroes.</div>';
}

/* ---------- GM: NPC Ledger (device-global; lore refs ported from tor2e-loremaster-main) ---------- */
const GM_LORE_NPCS = [
  { name: 'Captain Gurnow', role: 'Master of Tharbad (former bandit)', features: 'Aged, Lazy', notes: 'Lairs in Tharbad. Heir: Tharnow.' },
  { name: 'Tharnow', role: 'Deputy Captain', features: 'Oafish, Ambitious', notes: 'Seeking the treasures of Moria.' },
  { name: 'Arcinyas the Healer', role: 'Scholarly spy of Saruman', features: 'Old, Frail, Blind', notes: 'Acts as a healer to gather intelligence on explorers in Moria and Minhiriath.' },
  { name: 'Ibin the Ring-seeker', role: 'Crazed Dwarf waylayer', features: 'Crazed, Reckless', notes: 'Waylays travelers in Moria searching for the Ring of Alfrigga.' },
  { name: 'Gorgol, son of Bolg', role: 'Warlord of Moria Orcs', features: 'Brutal, Regal', notes: 'Eldest son of Bolg, grandson of Azog. Wields a spell-bound scimitar.' }
];
const GM_NPC_KEY = 'tor2e-gm-npcs';
function gmNpcs() { try { return JSON.parse(localStorage.getItem(GM_NPC_KEY)) || []; } catch (e) { return []; } }
function gmSaveNpcs(list) { try { localStorage.setItem(GM_NPC_KEY, JSON.stringify(list)); } catch (e) {} }
function gmAddNpc() {
  const val = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
  const name = val('gm-npc-name'); if (!name) return;
  const list = gmNpcs();
  list.push({ id: 'npc-' + Date.now().toString(36), name, role: val('gm-npc-role'), features: val('gm-npc-features'), notes: val('gm-npc-notes') });
  gmSaveNpcs(list);
  ['gm-npc-name', 'gm-npc-role', 'gm-npc-features', 'gm-npc-notes'].forEach(i => { const el = document.getElementById(i); if (el) el.value = ''; });
  renderGmNpc();
}
function gmDelNpc(id) { gmSaveNpcs(gmNpcs().filter(n => n.id !== id)); renderGmNpc(); }
function renderGmNpc() {
  const body = document.getElementById('gm-npc-body'); if (!body) return;
  const fEl = document.getElementById('gm-npc-filter');
  const q = (fEl && fEl.value || '').toLowerCase();
  const rows = [...gmNpcs().map(n => ({ n, custom: true })), ...GM_LORE_NPCS.map(n => ({ n, custom: false }))]
    .filter(({ n }) => n.name.toLowerCase().includes(q) || (n.role || '').toLowerCase().includes(q) || (n.features || '').toLowerCase().includes(q));
  body.innerHTML = rows.map(({ n, custom }) => `
    <div style="padding:6px 0;border-bottom:1px solid var(--border)">
      <b style="color:var(--gold-soft)">${escapeHtml(n.name)}</b>${n.role ? ` <small style="color:var(--text-muted)">(${escapeHtml(n.role)})</small>` : ''}
      ${custom
      ? `<button onclick="gmDelNpc('${n.id}')" style="float:right;font-size:10px;padding:1px 7px;background:var(--btn-alert-bg);color:#fff" aria-label="Delete ${escapeHtml(n.name)}">×</button>`
      : '<span style="float:right;font-size:9px;color:var(--gold)">Lore</span>'}
      ${n.features ? `<div style="font-size:11px;color:var(--warn-orange)">Features: ${escapeHtml(n.features)}</div>` : ''}
      ${n.notes ? `<div style="font-size:11px;color:var(--text-muted)">${escapeHtml(n.notes)}</div>` : ''}
    </div>`).join('') || '<div class="hint">No matching NPCs.</div>';
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
