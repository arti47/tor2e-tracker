/* ---------- STATE ---------- */
// Bump when a *breaking* schema change needs a one-time transform on load. The defensive
// per-field guards in migrateCharacter() already make old saves forward-compatible; this
// stamp lets future migrations branch on `raw.schemaVersion` if a destructive change ever lands.
// NB: must be declared BEFORE the top-level loadCharacter() call below — migrateCharacter()
// reads it during that call, so a later `const` here would hit the temporal dead zone and throw
// (which silently bricked the whole page for anyone with saved character data).
const CHARACTER_SCHEMA_VERSION = 1;

let char = loadCharacter();
let history = loadHistory();
let journal = loadJournal();

/**
 * True if `obj` looks like a TOR2E character object (not an array, not a primitive,
 * and carrying at least one recognizable character field). Used to gate imports so a
 * malformed/foreign JSON can't overwrite a hero. Intentionally lenient — partial
 * characters and shared deltas are valid (migrateCharacter backfills the rest).
 * @param {*} obj
 * @returns {boolean}
 */
function validCharacterShape(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
  const markers = ['name', 'culture', 'calling', 'strRating', 'hrtRating', 'witRating', 'skills', 'profs', 'endMax', 'hopeMax'];
  return markers.some(k => k in obj);
}

/**
 * Apply all forward-migrations to a raw (parsed) character object. Pure — no storage I/O —
 * so it can be reused for roster slots, imports, and shared-link payloads. Always returns a
 * complete character (missing fields are backfilled from DEFAULT_CHARACTER).
 * @param {Object} raw  a parsed (possibly partial / legacy) character object
 * @returns {Object} a complete, current-schema character
 */
function migrateCharacter(raw) {
    {
      const merged = { ...DEFAULT_CHARACTER, ...raw };
      // Migrate legacy string rewards/virtues into arrays
      if (!Array.isArray(merged.rewardsList)) {
        merged.rewardsList = merged.rewards
          ? [{ name: merged.startingReward || 'Reward', type: '', desc: merged.rewards, appliedTo: '' }]
          : [];
      }
      if (!Array.isArray(merged.virtuesList)) {
        merged.virtuesList = merged.virtues
          ? [{ name: merged.startingVirtue || 'Virtue', desc: merged.virtues }]
          : [];
      }
      // Migrate: combat-tab encounter object added later — old saves won't have it.
      if (!merged.encounter || typeof merged.encounter !== 'object') {
        merged.encounter = JSON.parse(JSON.stringify(DEFAULT_CHARACTER.encounter));
      } else {
        merged.encounter = { ...JSON.parse(JSON.stringify(DEFAULT_CHARACTER.encounter)), ...merged.encounter };
        if (!Array.isArray(merged.encounter.foes)) merged.encounter.foes = [];
        if (!merged.encounter.adv || typeof merged.encounter.adv !== 'object') merged.encounter.adv = { open: false, hope: false, fav: 'normal', extra: 0, keen: false };
      }
      // Migrate: journey object added later — old saves won't have it.
      if (!merged.journey || typeof merged.journey !== 'object') {
        merged.journey = JSON.parse(JSON.stringify(DEFAULT_CHARACTER.journey));
      } else {
        // Defensive: ensure all expected keys exist (in case schema grew)
        merged.journey = { ...DEFAULT_CHARACTER.journey, ...merged.journey };
        if (!merged.journey.roles) merged.journey.roles = { ...DEFAULT_CHARACTER.journey.roles };
        if (!Array.isArray(merged.journey.events)) merged.journey.events = [];
      }
      // Migrate: council object added later.
      if (!merged.council || typeof merged.council !== 'object') {
        merged.council = JSON.parse(JSON.stringify(DEFAULT_CHARACTER.council));
      } else {
        merged.council = { ...DEFAULT_CHARACTER.council, ...merged.council };
        if (!Array.isArray(merged.council.rolls)) merged.council.rolls = [];
      }
      // Migrate: persistent council history array added later.
      if (!Array.isArray(merged.councilHistory)) merged.councilHistory = [];
      if (!Array.isArray(merged.timeline)) merged.timeline = [];
      // Migrate: skillEndeavour object added later.
      if (!merged.skillEndeavour || typeof merged.skillEndeavour !== 'object') {
        merged.skillEndeavour = JSON.parse(JSON.stringify(DEFAULT_CHARACTER.skillEndeavour));
      } else {
        merged.skillEndeavour = { ...DEFAULT_CHARACTER.skillEndeavour, ...merged.skillEndeavour };
        if (!Array.isArray(merged.skillEndeavour.rolls)) merged.skillEndeavour.rolls = [];
      }
      // Migrate: Fellowship Phase fields added later.
      if (!merged.activeFPBonuses || typeof merged.activeFPBonuses !== 'object') {
        merged.activeFPBonuses = { ...DEFAULT_CHARACTER.activeFPBonuses };
      }
      if (!Array.isArray(merged.songs)) merged.songs = [];
      if (!merged.heir || typeof merged.heir !== 'object') merged.heir = { name: '', pe: 0 };
      if (typeof merged.phasesCompleted !== 'number') merged.phasesCompleted = 0;
      if (typeof merged.fpModeActive !== 'boolean') merged.fpModeActive = false;
      if (typeof merged.striderMode !== 'boolean') merged.striderMode = false;
      if (typeof merged.moriaMode !== 'boolean') merged.moriaMode = false;
      if (typeof merged.moriaHopeBonus !== 'number') merged.moriaHopeBonus = 0;
      if (!merged.band || typeof merged.band !== 'object') {
        merged.band = { readiness: 4, dispositions: { expertise: 2, manoeuvre: 2, rally: 2, vigilance: 2, war: 2 }, burden: 'medium', allies: [] };
      } else {
        if (typeof merged.band.readiness !== 'number') merged.band.readiness = 4;
        if (!merged.band.dispositions || typeof merged.band.dispositions !== 'object') merged.band.dispositions = { expertise: 2, manoeuvre: 2, rally: 2, vigilance: 2, war: 2 };
        if (typeof merged.band.burden !== 'string') merged.band.burden = 'medium';
        if (typeof merged.band.sharedCalling !== 'string') merged.band.sharedCalling = '';
        if (typeof merged.band.dispositionFocus !== 'string') merged.band.dispositionFocus = '';
        if (!Array.isArray(merged.band.allies)) merged.band.allies = [];
        merged.band.allies.forEach(a => { if (typeof a.giftWasted !== 'boolean') a.giftWasted = false; if (a.kinglyGift === undefined) a.kinglyGift = null; });
      }
      if (!merged.mission || typeof merged.mission !== 'object') {
        merged.mission = { active: false, objective: '', size: 'medium', warGear: 'prepared', specialisation: '', prevOutcome: '', fpDuration: 'brief', roster: [] };
      } else {
        const md = { active: false, objective: '', size: 'medium', warGear: 'prepared', specialisation: '', prevOutcome: '', fpDuration: 'brief', roster: [] };
        merged.mission = { ...md, ...merged.mission };
        if (!Array.isArray(merged.mission.roster)) merged.mission.roster = [];
      }
      if (typeof merged.huntMod !== 'number') merged.huntMod = 0;
      if (!merged.battle || typeof merged.battle !== 'object') {
        merged.battle = { active: false, scale: '', foeMight: 1, foeResistance: 6, foeResMax: 6, archfoe: 'none', objective: '', objectiveRes: 0, objectiveResMax: 0, advantages: [], complications: [], leaderFocus: 'fight', bandStance: 'balanced', inspired: false, focusBonus: 0, fleeIll: false, round: 0, log: [] };
      } else {
        const bd = { active: false, scale: '', foeMight: 1, foeResistance: 6, foeResMax: 6, archfoe: 'none', objective: '', objectiveRes: 0, objectiveResMax: 0, advantages: [], complications: [], leaderFocus: 'fight', bandStance: 'balanced', inspired: false, focusBonus: 0, fleeIll: false, round: 0, log: [] };
        merged.battle = { ...bd, ...merged.battle };
        if (!Array.isArray(merged.battle.advantages)) merged.battle.advantages = [];
        if (!Array.isArray(merged.battle.complications)) merged.battle.complications = [];
        if (!Array.isArray(merged.battle.log)) merged.battle.log = [];
      }
      if (typeof merged.eyeAwareness !== 'number') merged.eyeAwareness = 0;
      if (typeof merged.huntRegion !== 'string') merged.huntRegion = 'wild';
      if (typeof merged.experienceMode !== 'string') merged.experienceMode = 'session';
      if (!merged.fpSpend || typeof merged.fpSpend !== 'object') {
        merged.fpSpend = { skills: {}, profs: {}, valour: 0, wisdom: 0 };
      } else {
        merged.fpSpend = { skills: {}, profs: {}, valour: 0, wisdom: 0, ...merged.fpSpend };
        if (!merged.fpSpend.skills) merged.fpSpend.skills = {};
        if (!merged.fpSpend.profs) merged.fpSpend.profs = {};
      }
      if (!merged.skillNotes || typeof merged.skillNotes !== 'object') merged.skillNotes = {};
      if (!Array.isArray(merged.magicalItems)) merged.magicalItems = [];
      // Backfill `qualities` on Famous items added before this feature.
      merged.magicalItems.forEach(mi => {
        if ((mi.type === 'Famous Weapon' || mi.type === 'Famous Armour') && !Array.isArray(mi.qualities)) {
          mi.qualities = [];
        }
      });
      merged.schemaVersion = CHARACTER_SCHEMA_VERSION;  // stamp the current schema
      return merged;
    }
}

/* ---------- MULTI-CHARACTER ROSTER ---------- */
function genCharId() { return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

function loadRoster() {
  try {
    const r = JSON.parse(localStorage.getItem(ROSTER_KEY));
    if (r && Array.isArray(r.list) && r.list.length) return r;
  } catch(e) {}
  return null;
}
function saveRoster(r) { localStorage.setItem(ROSTER_KEY, JSON.stringify(r)); }

/** Load the active hero: read the roster, migrate the legacy single-character key on first run,
 *  set `activeCharId`, and return a complete (migrated) character. @returns {Object} */
function loadCharacter() {
  let roster = loadRoster();
  if (!roster) {
    // First run under the roster system: migrate the legacy single-character key, or start fresh.
    let raw = null;
    try { const legacy = localStorage.getItem(STORAGE_KEY); if (legacy) raw = JSON.parse(legacy); } catch(e) {}
    const obj = raw ? migrateCharacter(raw) : JSON.parse(JSON.stringify(DEFAULT_CHARACTER));
    const id = genCharId();
    activeCharId = id;
    roster = { activeId: id, list: [{ id, name: obj.name || 'New Hero' }] };
    saveRoster(roster);
    localStorage.setItem(CHAR_PREFIX + id, JSON.stringify(obj));
    // Carry the legacy roll history into this hero's slot.
    try {
      const legacyRolls = localStorage.getItem(ROLLS_PREFIX + 'v1');
      if (legacyRolls && !localStorage.getItem(ROLLS_PREFIX + id)) localStorage.setItem(ROLLS_PREFIX + id, legacyRolls);
    } catch(e) {}
    return obj;
  }
  activeCharId = roster.activeId;
  // Defensive: if the active id is dangling, fall back to the first hero.
  if (!roster.list.some(e => e.id === activeCharId)) {
    activeCharId = roster.list[0].id;
    roster.activeId = activeCharId;
    saveRoster(roster);
  }
  let raw = null;
  try { raw = JSON.parse(localStorage.getItem(CHAR_PREFIX + activeCharId)); } catch(e) {}
  if (!raw) return JSON.parse(JSON.stringify(DEFAULT_CHARACTER));
  return migrateCharacter(raw);
}

/** Persist the active hero to its slot (`tor2e-char-<id>`) and keep the roster index + name in sync. */
function saveCharacter() {
  if (!activeCharId) activeCharId = genCharId();
  localStorage.setItem(CHAR_PREFIX + activeCharId, JSON.stringify(char));
  // Keep the roster index + active-hero name in sync.
  let roster = loadRoster() || { activeId: activeCharId, list: [] };
  let entry = roster.list.find(e => e.id === activeCharId);
  if (!entry) { entry = { id: activeCharId, name: '' }; roster.list.push(entry); }
  entry.name = char.name || 'New Hero';
  roster.activeId = activeCharId;
  saveRoster(roster);
  // P3: mirror this hero to the cloud (debounced). No-op unless cloud sync is active.
  if (typeof Sync !== 'undefined' && Sync.enabled) { Sync.queuePush(activeCharId); Sync.publishVitals(); }
}

function readSlot(id) {
  try { return JSON.parse(localStorage.getItem(CHAR_PREFIX + id)); } catch(e) { return null; }
}

// Re-load the active hero from storage and repaint the whole app.
function applyActiveCharacter() {
  char = loadCharacter();
  history = loadHistory();
  journal = loadJournal();                            // Chronicle is per-hero
  if (typeof clearUndo === 'function') clearUndo();   // undo stack is per-hero
  render();
  renderHistory();
  renderChronicle();
}

/* ---------- AUTO-BACKUP / RESTORE POINTS (U12) ----------
   Per-hero ring buffer of full-slot snapshots (max 8), separate from the 50-deep in-memory
   undo and from manual export. One auto-snapshot per app load; manual "Snapshot now"; restore
   takes a safety snapshot of the current state first so a restore is itself undoable. */
const BACKUPS_KEY = 'tor2e-backups';
const BACKUPS_MAX = 8;
function loadBackups() { try { return JSON.parse(localStorage.getItem(BACKUPS_KEY)) || {}; } catch (e) { return {}; } }
function saveBackups(b) { try { localStorage.setItem(BACKUPS_KEY, JSON.stringify(b)); } catch (e) {} }
function snapshotHero(id, reason) {
  if (!id) return false;
  let raw; try { raw = localStorage.getItem(CHAR_PREFIX + id); } catch (e) { return false; }
  if (!raw) return false;
  const all = loadBackups();
  const list = all[id] || (all[id] = []);
  if (list.length && list[0].data === raw) return false;   // unchanged since last snapshot
  let name = id; try { name = JSON.parse(raw).name || id; } catch (e) {}
  list.unshift({ ts: Date.now(), reason: reason || 'manual', name, data: raw });
  if (list.length > BACKUPS_MAX) list.length = BACKUPS_MAX;
  saveBackups(all);
  return true;
}
function backupNow() {
  const ok = snapshotHero(activeCharId, 'manual');
  alert(ok ? 'Snapshot saved.' : 'No change since the last snapshot — nothing new to save.');
  renderRestorePoints();
}
function openRestorePoints() {
  document.getElementById('menu-overlay').classList.remove('show');
  renderRestorePoints();
  document.getElementById('restore-points-overlay').classList.add('show');
}
function closeRestorePoints() { document.getElementById('restore-points-overlay').classList.remove('show'); }
function renderRestorePoints() {
  const body = document.getElementById('restore-points-body'); if (!body) return;
  const list = loadBackups()[activeCharId] || [];
  if (!list.length) { body.innerHTML = '<div class="hint" style="text-align:center;padding:10px">No snapshots yet for this hero.</div>'; return; }
  body.innerHTML = list.map((s, i) =>
    `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--border)">
      <span style="font-size:12px"><strong>${escapeHtml(s.name || 'Hero')}</strong><br><span style="color:var(--text-muted)">${new Date(s.ts).toLocaleString()} · ${escapeHtml(s.reason || '')}</span></span>
      <button onclick="restoreSnapshot(${i})" style="flex:0 0 auto">Restore</button></div>`).join('');
}
async function restoreSnapshot(idx) {
  const list = loadBackups()[activeCharId] || [];
  const snap = list[idx]; if (!snap) return;
  if (!await confirmStyled(`Roll <strong>this hero</strong> back to the snapshot from <strong>${new Date(snap.ts).toLocaleString()}</strong>?<br><br>A snapshot of the current state is taken first, so this restore is itself undoable.`, '♻️ Restore')) return;
  snapshotHero(activeCharId, 'pre-restore');               // safety snapshot of current state
  localStorage.setItem(CHAR_PREFIX + activeCharId, snap.data);
  applyActiveCharacter();
  closeRestorePoints();
  alert('Restored to ' + new Date(snap.ts).toLocaleString() + '.');
}

function switchCharacter(id) {
  if (id === activeCharId) { closeRoster(); return; }
  saveCharacter();                       // persist the hero we're leaving
  const r = loadRoster();
  if (!r || !r.list.some(e => e.id === id)) return;
  r.activeId = id;
  saveRoster(r);
  applyActiveCharacter();
  renderRoster();
  closeRoster();
}

function newCharacter() {
  saveCharacter();                       // persist current hero first
  const id = genCharId();
  activeCharId = id;
  char = JSON.parse(JSON.stringify(DEFAULT_CHARACTER));
  history = [];
  journal = defaultJournal();
  saveCharacter();                       // creates the slot + roster entry, sets it active
  saveHistory();
  saveJournal();
  if (typeof clearUndo === 'function') clearUndo();
  render();
  renderHistory();
  renderChronicle();
  renderRoster();
}

async function renameCharacter(id) {
  const r = loadRoster();
  const entry = r && r.list.find(e => e.id === id);
  if (!entry) return;
  const name = await promptStyled('Rename hero:', entry.name || '', 'Rename');
  if (name === null) return;             // cancelled
  const clean = name.trim() || 'New Hero';
  if (id === activeCharId) {
    char.name = clean;
    saveCharacter();                     // syncs roster entry + header
    render();
  } else {
    const data = readSlot(id);
    if (data) { data.name = clean; localStorage.setItem(CHAR_PREFIX + id, JSON.stringify(data)); }
    entry.name = clean;
    saveRoster(r);
  }
  renderRoster();
}

function duplicateCharacter(id) {
  const data = (id === activeCharId) ? JSON.parse(JSON.stringify(char)) : readSlot(id);
  if (!data) return;
  const r = loadRoster() || { activeId: activeCharId, list: [] };
  const newId = genCharId();
  const baseName = (data.name || 'New Hero');
  data.name = baseName + ' (copy)';
  localStorage.setItem(CHAR_PREFIX + newId, JSON.stringify(data));
  // Insert the copy right after its source in the list.
  const idx = r.list.findIndex(e => e.id === id);
  r.list.splice(idx < 0 ? r.list.length : idx + 1, 0, { id: newId, name: data.name });
  saveRoster(r);
  renderRoster();
}

async function deleteCharacter(id) {
  const r = loadRoster();
  if (!r) return;
  const entry = r.list.find(e => e.id === id);
  if (!entry) return;
  if (!await confirmStyled(`Delete <strong>${escapeHtml(entry.name || 'this hero')}</strong>?<br><br>This permanently removes the character and their roll history. Export a JSON backup first if you might want them back.`, '🗑️ Delete Hero')) return;
  localStorage.removeItem(CHAR_PREFIX + id);
  localStorage.removeItem(ROLLS_PREFIX + id);
  localStorage.removeItem(JOURNAL_PREFIX + id);
  r.list = r.list.filter(e => e.id !== id);
  if (r.list.length === 0) {
    // Never leave the roster empty — spin up a fresh hero.
    const nid = genCharId();
    activeCharId = nid;
    char = JSON.parse(JSON.stringify(DEFAULT_CHARACTER));
    history = [];
    journal = defaultJournal();
    r.list.push({ id: nid, name: char.name || 'New Hero' });
    r.activeId = nid;
    saveRoster(r);
    localStorage.setItem(CHAR_PREFIX + nid, JSON.stringify(char));
    saveHistory();
    saveJournal();
    render();
    renderHistory();
    renderChronicle();
  } else {
    if (id === activeCharId) {
      r.activeId = r.list[0].id;
      saveRoster(r);
      applyActiveCharacter();
    } else {
      saveRoster(r);
    }
  }
  renderRoster();
}

/* ---------- PRE-GENERATED HEROES ---------- */
// Build a full character object from a PREGENS record (skills are stored as {rating,favoured}).
function _pregenToChar(p) {
  const c = JSON.parse(JSON.stringify(DEFAULT_CHARACTER));
  ['name','culture','blessing','calling','shadowPath','patron','standard','age','features'].forEach(k => { c[k] = p[k] || ''; });
  ['strRating','strTN','hrtRating','hrtTN','witRating','witTN','parry','valour','wisdom','armourProt','armourLoad','helmProt','helmLoad','shieldBase','shieldTotal','shieldLoad'].forEach(k => { c[k] = p[k] || 0; });
  c.endMax = p.endMax; c.endCur = p.endMax; c.hopeMax = p.hopeMax; c.hopeCur = p.hopeMax;
  c.armourNotes = p.armourNotes || ''; c.shieldNotes = p.shieldNotes || '';
  c.skills = JSON.parse(JSON.stringify(p.skills || {}));
  c.profs = Object.assign({ Axes: 0, Bows: 0, Spears: 0, Swords: 0 }, p.profs || {});
  c.weapons = JSON.parse(JSON.stringify(p.weapons || []));
  c.rewardsList = JSON.parse(JSON.stringify(p.rewardsList || []));
  c.virtuesList = JSON.parse(JSON.stringify(p.virtuesList || []));
  // Also build the display strings shown in the read-only Rewards/Virtues textareas (render()
  // fills those fields from char.rewards/char.virtues, which the pickers only derive later).
  c.rewards = c.rewardsList.map(r => `${r.name} (${r.type})${r.appliedTo ? ' → ' + r.appliedTo : ''} — ${r.desc}`).join('\n');
  c.virtues = c.virtuesList.map(v => `${v.name} — ${v.desc}`).join('\n');
  c.usefulItems = JSON.parse(JSON.stringify(p.usefulItems || []));
  c.armourRewards = (p.armourRewards || []).slice();
  c.helmRewards = (p.helmRewards || []).slice();
  c.shieldRewards = (p.shieldRewards || []).slice();
  c.prowessAttr = p.prowessAttr || '';
  c.fellowshipRating = p.patron ? 1 : 0;
  return c;
}
function loadPregen(idx) {
  const p = PREGENS[idx]; if (!p) return;
  saveCharacter();                         // persist the hero we're leaving
  const id = genCharId();
  activeCharId = id;
  char = _pregenToChar(p);
  history = []; journal = defaultJournal();
  const r = loadRoster() || { activeId: id, list: [] };
  r.list.push({ id, name: char.name }); r.activeId = id; saveRoster(r);
  localStorage.setItem(CHAR_PREFIX + id, JSON.stringify(char));
  saveHistory(); saveJournal();
  if (typeof clearUndo === 'function') clearUndo();
  render(); renderHistory(); renderChronicle();
  const ov = document.getElementById('pregen-overlay'); if (ov) ov.classList.remove('show');
  alert('Loaded ' + char.name + ' into your roster.');
}
function openPregens() {
  const m = document.getElementById('menu-overlay'); if (m) m.classList.remove('show');
  let ov = document.getElementById('pregen-overlay');
  if (!ov) { ov = document.createElement('div'); ov.id = 'pregen-overlay'; ov.className = 'menu-overlay'; document.body.appendChild(ov); }
  let src = '', items = '';
  PREGENS.forEach((p, i) => {
    if (p.src !== src) { src = p.src; items += `<div style="font-size:12px;font-weight:700;color:var(--gold);margin:10px 0 4px">${escapeHtml(src)}</div>`; }
    const sub = [p.culture, p.calling].filter(Boolean).join(' · ');
    items += `<button onclick="loadPregen(${i})" class="add-row-btn" style="width:100%;text-align:left;margin-bottom:5px;background:var(--bg-deep);color:var(--ink);font-size:13px">
        <strong>${escapeHtml(p.name)}</strong><br><span style="font-size:11px;color:var(--text-muted)">${escapeHtml(sub)} · Str ${p.strRating} Hrt ${p.hrtRating} Wit ${p.witRating} · End ${p.endMax} Hope ${p.hopeMax}</span></button>`;
  });
  ov.innerHTML = `<div class="menu" style="max-width:420px;width:93%;max-height:90vh;overflow-y:auto">
      <h3 style="margin-top:0">✨ Pre-generated Heroes</h3>
      <p class="hint" style="text-align:left;margin:0 0 8px">Official ready-made heroes. Tap one to add it to your roster as a new character — your existing heroes aren't affected.</p>
      ${items}
      <button onclick="document.getElementById('pregen-overlay').classList.remove('show')" class="add-row-btn" style="width:100%;margin-top:8px;background:var(--btn-secondary-bg);color:white">Close</button>
    </div>`;
  ov.classList.add('show');
}

function openRoster() {
  document.getElementById('menu-overlay').classList.remove('show');
  document.getElementById('roster-overlay').classList.add('show');
  renderRoster();
}
function closeRoster() {
  document.getElementById('roster-overlay').classList.remove('show');
}

function renderRoster() {
  const list = document.getElementById('roster-list');
  if (!list) return;
  const r = loadRoster() || { activeId: activeCharId, list: [] };
  list.innerHTML = r.list.map(e => {
    const isActive = e.id === r.activeId;
    const data = (e.id === activeCharId) ? char : readSlot(e.id);
    const sub = data ? [data.culture, data.calling].filter(Boolean).join(' · ') : '';
    const endBit = data ? `End ${data.endCur ?? '?'}/${data.endMax ?? '?'} · Hope ${data.hopeCur ?? '?'}/${data.hopeMax ?? '?'}` : '';
    return `<div style="border:1px solid ${isActive ? 'var(--gold)' : 'var(--border)'};border-radius:8px;padding:10px;margin-bottom:8px;background:${isActive ? 'var(--gold-soft)' : 'var(--card-bg)'}">
      <div style="display:flex;align-items:center;gap:8px">
        <div style="flex:1;min-width:0">
          <strong style="font-size:15px">${escapeHtml(e.name || 'New Hero')}</strong>${isActive ? ' <span style="font-size:10px;background:var(--gold);color:#fff;padding:1px 6px;border-radius:8px;vertical-align:middle">ACTIVE</span>' : ''}
          ${sub ? `<br><small style="color:var(--text-muted)">${escapeHtml(sub)}</small>` : ''}
          ${endBit ? `<br><small style="color:var(--text-faint)">${escapeHtml(endBit)}</small>` : ''}
        </div>
        ${isActive ? '' : `<button class="add-row-btn" onclick="switchCharacter('${e.id}')" style="background:var(--gold);flex:0 0 auto">Switch</button>`}
      </div>
      <div style="display:flex;gap:6px;margin-top:8px">
        <button class="add-row-btn" onclick="renameCharacter('${e.id}')" style="flex:1;background:var(--btn-secondary-bg);font-size:12px">✏️ Rename</button>
        <button class="add-row-btn" onclick="duplicateCharacter('${e.id}')" style="flex:1;background:var(--btn-secondary-bg);font-size:12px">⧉ Duplicate</button>
        <button class="add-row-btn" onclick="deleteCharacter('${e.id}')"${r.list.length === 1 ? ' disabled' : ''} style="flex:1;background:var(--btn-alert-bg);font-size:12px${r.list.length === 1 ? ';opacity:.4' : ''}">🗑️ Delete</button>
      </div>
    </div>`;
  }).join('');
}

/* ---------- PARTY VIEW (read-only) ---------- */
function openPartyView() {
  document.getElementById('menu-overlay').classList.remove('show');
  document.getElementById('party-view-overlay').classList.add('show');
  renderPartyView();
}
function closePartyView() { document.getElementById('party-view-overlay').classList.remove('show'); }

function renderPartyView() {
  const body = document.getElementById('party-view-body');
  if (!body) return;
  const r = loadRoster() || { activeId: activeCharId, list: [] };
  const th = 'style="padding:6px 8px;border-bottom:2px solid var(--border);text-align:left;white-space:nowrap"';
  const td = 'style="padding:6px 8px;border-bottom:1px solid var(--border);vertical-align:top"';
  const rows = r.list.map(e => {
    const d = (e.id === activeCharId) ? char : readSlot(e.id);
    if (!d) return '';
    const totalShadow = (parseInt(d.shadow) || 0) + (parseInt(d.scars) || 0);
    const scarsBit = (parseInt(d.scars) || 0) > 0 ? ` <small style="color:var(--text-faint)">(${d.scars}🗡)</small>` : '';
    const conds = [d.weary && 'Weary', d.miserable && 'Miserable', d.wounded && 'Wounded'].filter(Boolean).join(', ') || '—';
    const active = e.id === r.activeId;
    const sub = [d.culture, d.calling].filter(Boolean).join(' · ');
    return `<tr style="${active ? 'background:var(--gold-soft)' : ''}">
      <td ${td}><strong>${escapeHtml(d.name || '?')}</strong>${active ? ' ★' : ''}${sub ? `<br><small style="color:var(--text-muted)">${escapeHtml(sub)}</small>` : ''}</td>
      <td ${td}>${d.endCur ?? '?'}/${d.endMax ?? '?'}</td>
      <td ${td}>${d.hopeCur ?? '?'}/${d.hopeMax ?? '?'}</td>
      <td ${td}>${totalShadow}${scarsBit}</td>
      <td ${td}>V${d.valour ?? '?'} · W${d.wisdom ?? '?'}</td>
      <td ${td}>${escapeHtml(conds)}</td>
    </tr>`;
  }).join('');
  body.innerHTML = `<table style="width:100%;border-collapse:collapse;font-size:12px;min-width:480px">
    <thead><tr>
      <th ${th}>Hero</th><th ${th}>End</th><th ${th}>Hope</th><th ${th}>Shadow</th><th ${th}>V/W</th><th ${th}>Conditions</th>
    </tr></thead><tbody>${rows}</tbody></table>`;
}

/* ---------- FELLOWSHIP CAMPAIGN (P4) — create/join/leave + live party ---------- */
const _CAMP_INPUT = 'width:100%;padding:7px 9px;margin:4px 0;border:1px solid var(--border);border-radius:8px;background:var(--card-bg);color:var(--ink);font-size:14px';
function openCampaign() {
  document.getElementById('menu-overlay').classList.remove('show');
  document.getElementById('campaign-overlay').classList.add('show');
  renderCampaign();
}
function closeCampaign() {
  if (typeof Sync !== 'undefined') Sync.unsubscribeParty();
  document.getElementById('campaign-overlay').classList.remove('show');
}
function _campRole() { const el = document.getElementById('camp-role'); return el ? el.value : 'player'; }
async function campaignCreate() {
  const name = (document.getElementById('camp-name') || {}).value || '';
  try { const r = await Sync.createCampaign(name, _campRole()); alertStyled('Campaign created!\nShare this join code: ' + r.code); renderCampaign(); }
  catch (e) { alertStyled('Could not create campaign: ' + (e && e.message ? e.message : e)); }
}
async function campaignJoin() {
  const code = (document.getElementById('camp-code') || {}).value || '';
  try { const r = await Sync.joinCampaign(code, _campRole()); alertStyled('Joined campaign ' + r.code + '.'); renderCampaign(); }
  catch (e) { alertStyled('Could not join: ' + (e && e.message ? e.message : e)); }
}
async function campaignLeave() {
  if (!(await confirmStyled('Leave this campaign? Your hero stays on your device.'))) return;
  Sync.leaveCampaign(); renderCampaign();
}
async function campaignDelete() {
  if (!(await confirmStyled('Delete this campaign for everyone? This removes it and its join code — it cannot be undone.'))) return;
  try { await Sync.deleteCampaign(); renderCampaign(); }
  catch (e) { alertStyled('Could not delete: ' + (e && e.message ? e.message : e)); }
}
function renderCampaign() {
  const body = document.getElementById('campaign-body'); if (!body) return;
  const hint = document.getElementById('campaign-cloud-hint');
  const active = (typeof Sync !== 'undefined') && Sync.isEnabled();
  const status = (typeof Sync !== 'undefined' && Sync.status) ? Sync.status() : 'Local only';
  if (hint) hint.textContent = active
    ? 'A campaign links a Fellowship across devices — share the join code so others can see the live party.'
    : 'Cloud sync is not active — serve the app over http(s) with Firebase configured to use campaigns. (' + status + ')';
  if (!active) { body.innerHTML = '<div class="hint" style="text-align:center;padding:12px">📴 Cloud sync required for campaigns.</div>'; return; }
  const cid = Sync.currentCampaign();
  if (cid) {
    let code = '';
    try { code = (JSON.parse(localStorage.getItem('tor2e-campaign-v1')) || {}).code || ''; } catch (e) {}
    body.innerHTML = `
      <div class="card" style="border-color:var(--gold)">
        <div style="font-weight:700">You are in a campaign.</div>
        <div style="margin:6px 0">Join code: <b style="letter-spacing:1px;font-size:15px">${escapeHtml(code || '—')}</b>
          ${code ? `<button onclick="navigator.clipboard&&navigator.clipboard.writeText('${code}');alertStyled('Copied ${code}')" style="font-size:11px;padding:2px 8px;margin-left:8px">Copy</button>` : ''}</div>
        <button onclick="campaignLeave()" style="background:var(--btn-secondary-bg);color:#fff">Leave campaign</button>
        ${Sync.isCampaignOwner() ? '<button onclick="campaignDelete()" style="background:var(--btn-alert-bg);color:#fff;margin-left:6px">Delete campaign</button>' : ''}
      </div>
      <div class="card"><h3 class="card-title">Party (live)</h3><div id="campaign-members"><div class="hint">Loading…</div></div></div>`;
    Sync.subscribeParty(renderCampaignMembers);
  } else {
    body.innerHTML = `
      <div class="card">
        <h3 class="card-title">Create a campaign</h3>
        <input type="text" id="camp-name" placeholder="Campaign name" style="${_CAMP_INPUT}">
        <div style="margin:6px 0;font-size:13px">Your role:
          <select id="camp-role" style="padding:4px 8px;border-radius:6px;background:var(--card-bg);color:var(--ink);border:1px solid var(--border)">
            <option value="player">Player</option><option value="loremaster">Loremaster</option></select></div>
        <button onclick="campaignCreate()" style="width:100%">Create + get a join code</button>
      </div>
      <div class="card">
        <h3 class="card-title">Join a campaign</h3>
        <input type="text" id="camp-code" placeholder="Join code (e.g. SHADOW-DURIN-42)" style="${_CAMP_INPUT}">
        <div style="margin:6px 0;font-size:13px">Your role:
          <select id="camp-role" style="padding:4px 8px;border-radius:6px;background:var(--card-bg);color:var(--ink);border:1px solid var(--border)">
            <option value="player">Player</option><option value="loremaster">Loremaster</option></select></div>
        <button onclick="campaignJoin()" style="width:100%">Join</button>
      </div>`;
  }
}
function renderCampaignMembers(members, err) {
  const box = document.getElementById('campaign-members'); if (!box) return;
  if (err) { box.innerHTML = '<div class="hint">Could not load the party (permission or network).</div>'; return; }
  const keys = members ? Object.keys(members) : [];
  if (!keys.length) { box.innerHTML = '<div class="hint">No members yet.</div>'; return; }
  const myUid = (typeof Sync !== 'undefined') ? Sync.uid : null;
  box.innerHTML = keys.map(uid => {
    const m = members[uid] || {}; const v = m.vitals || {};
    const conds = [v.weary && 'Weary', v.miserable && 'Miserable', v.wounded && 'Wounded', v.dying && 'DYING'].filter(Boolean).join(', ');
    return `<div style="padding:6px 0;border-bottom:1px solid var(--border)">
      <b>${escapeHtml(v.name || m.displayName || 'Hero')}</b>${uid === myUid ? ' ★' : ''}
      <small style="color:var(--text-muted)">· ${m.role === 'loremaster' ? '🎲 Loremaster' : 'Player'}</small><br>
      <small style="color:var(--text-muted)">❤ ${v.endCur ?? '?'}/${v.endMax ?? '?'} · ✦ ${v.hopeCur ?? '?'}/${v.hopeMax ?? '?'} · 🌑 ${v.shadow ?? 0} · V${v.valour ?? '?'}/W${v.wisdom ?? '?'}${conds ? ' · <span style="color:var(--error-text)">' + conds + '</span>' : ''}</small>
    </div>`;
  }).join('');
}

/* ---------- BIG-SCREEN TABLE MODE (U11) ----------
   Full-screen, high-contrast, large-text read-only dashboard for casting to a TV at an in-person
   table: every hero's vitals/conditions + the active encounter's foes. Fixed dark palette (not the
   app theme) for legibility across a room; auto-refreshes every 2s while open so it stays current. */
let _tableModeTimer = null;
function openTableMode() {
  document.getElementById('menu-overlay').classList.remove('show');
  renderTableMode();
  document.getElementById('table-mode-overlay').classList.add('show');
  clearInterval(_tableModeTimer);
  _tableModeTimer = setInterval(renderTableMode, 2000);
}
function closeTableMode() {
  document.getElementById('table-mode-overlay').classList.remove('show');
  clearInterval(_tableModeTimer); _tableModeTimer = null;
}
function renderTableMode() {
  const body = document.getElementById('table-mode-body'); if (!body) return;
  const r = loadRoster() || { activeId: activeCharId, list: [] };
  const pill = (t, bg) => `<span style="background:${bg};color:#fff;padding:3px 11px;border-radius:7px;font-size:.5em;font-weight:800;letter-spacing:1px">${t}</span>`;
  const heroCards = r.list.map(e => {
    const d = (e.id === activeCharId) ? char : readSlot(e.id);
    if (!d) return '';
    const totalShadow = (parseInt(d.shadow) || 0) + (parseInt(d.scars) || 0);
    const dying = (parseInt(d.endCur) || 0) <= 0;
    const conds = (dying ? [pill('DYING', '#b01010')] : [])
      .concat([d.weary && pill('WEARY', '#8a5a14'), d.miserable && pill('MISERABLE', '#6a1a6a'), d.wounded && pill('WOUNDED', '#7a1a1a')].filter(Boolean)).join(' ');
    return `<div style="border:3px solid #d4a635;border-radius:14px;padding:14px 18px;background:#1a1612">
      <div style="font-size:1.25em;font-weight:800;color:#f1e4c4">${escapeHtml(d.name || '?')}${e.id === activeCharId ? ' ★' : ''}</div>
      <div style="display:flex;gap:24px;flex-wrap:wrap;margin-top:8px;font-size:1.55em;font-weight:800">
        <span style="color:#7ed07e">&#10084; ${d.endCur ?? '?'}/${d.endMax ?? '?'}</span>
        <span style="color:#6fa8ff">&#10022; ${d.hopeCur ?? '?'}/${d.hopeMax ?? '?'}</span>
        <span style="color:#e0a060">&#127769; ${totalShadow}</span>
      </div>
      ${conds ? `<div style="margin-top:10px">${conds}</div>` : ''}</div>`;
  }).filter(Boolean).join('');
  const enc = char.encounter;
  const foes = (enc && enc.active && (enc.foes || []).filter(f => !f.slain)) || [];
  const foeHtml = foes.length
    ? `<h2 style="margin:22px 0 10px;font-size:1.2em;color:#e06060">&#9876; Encounter &middot; Round ${enc.round || 1}</h2>
       <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px">${foes.map(f =>
        `<div style="border:3px solid #e06060;border-radius:14px;padding:12px 16px;background:#1a1612">
          <div style="font-size:1.15em;font-weight:800;color:#f1e4c4">${escapeHtml(f.name)}</div>
          <div style="font-size:1.45em;font-weight:800;color:#7ed07e;margin-top:4px">&#10084; ${f.endCur}/${f.endMax}</div>
          ${f.wounded ? pill('WOUNDED', '#7a1a1a') : ''}</div>`).join('')}</div>`
    : '';
  body.innerHTML = `<div style="font-size:20px"><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px">${heroCards}</div>${foeHtml}</div>`;
}

/* ---------- CAMPAIGN TIMELINE (U15) ----------
   A lightweight, all-modes per-hero event log (separate from the solo Chronicle's prose journal).
   Captured at funnel points (adj → Shadow/Scars/Valour/Wisdom; session XP; Fellowship Phase).
   Stored on char.timeline so it exports/syncs with the hero. */
const TIMELINE_ICON = { xp: '📈', shadow: '🌑', scars: '🗡', rank: '⭐', fp: '🌿', note: '•' };
function logTimeline(type, text) {
  if (!char) return;
  if (!Array.isArray(char.timeline)) char.timeline = [];
  char.timeline.unshift({ ts: Date.now(), type: type || 'note', text: String(text || '') });
  if (char.timeline.length > 200) char.timeline.length = 200;
  saveCharacter();
}
function openTimeline() {
  document.getElementById('menu-overlay').classList.remove('show');
  renderTimeline();
  document.getElementById('timeline-overlay').classList.add('show');
}
function closeTimeline() { document.getElementById('timeline-overlay').classList.remove('show'); }
async function clearTimeline() {
  if (!await confirmStyled('Clear this hero’s entire campaign timeline? This cannot be undone.', 'Clear Timeline')) return;
  char.timeline = []; saveCharacter(); renderTimeline();
}
function renderTimeline() {
  const body = document.getElementById('timeline-body'); if (!body) return;
  const list = Array.isArray(char.timeline) ? char.timeline : [];
  if (!list.length) { body.innerHTML = '<div class="hint" style="text-align:center;padding:10px">No events yet. Session XP, Shadow/Scar gains, Valour/Wisdom rank-ups and Fellowship Phases will appear here.</div>'; return; }
  body.innerHTML = list.map(ev =>
    `<div style="display:flex;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);font-size:12px">
      <span style="flex:0 0 auto">${TIMELINE_ICON[ev.type] || '•'}</span>
      <span style="flex:1">${escapeHtml(ev.text)}<br><small style="color:var(--text-muted)">${new Date(ev.ts).toLocaleString()}</small></span></div>`).join('');
}

/* ---------- SHARE VIA LINK / QR ---------- */
// Trim a character down to only the fields that differ from the default schema — keeps the
// shared payload as small as possible.
function characterDelta(c) {
  const d = {};
  for (const k in c) {
    if (k === '_boutPrompted') continue;  // transient UI flag
    if (JSON.stringify(c[k]) !== JSON.stringify(DEFAULT_CHARACTER[k])) d[k] = c[k];
  }
  if (c.name) d.name = c.name;            // always carry the name for the import prompt
  return d;
}
// UTF-8-safe URL-safe base64.
function encodeShare(obj) {
  const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function decodeShare(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return JSON.parse(decodeURIComponent(escape(atob(s))));
}
function shareBaseUrl() {
  // location.origin is "null" for file:// — fall back to the full href minus hash/query.
  if (location.origin && location.origin !== 'null') return location.origin + location.pathname;
  return location.href.split('#')[0].split('?')[0];
}

let _shareCode = '';
function openShare() {
  document.getElementById('menu-overlay').classList.remove('show');
  _shareCode = encodeShare(characterDelta(char));
  const link = shareBaseUrl() + '#import=' + _shareCode;
  document.getElementById('share-name').textContent = char.name || 'this hero';
  document.getElementById('share-link').value = link;
  const bytes = link.length;
  document.getElementById('share-size').textContent = `Link length: ${bytes} characters`;
  renderShareQR(link, bytes);
  document.getElementById('share-overlay').classList.add('show');
}
function closeShare() { document.getElementById('share-overlay').classList.remove('show'); }

function copyShareLink() { copyToClipboard(document.getElementById('share-link').value, 'Link copied!'); }
function copyShareCode() { copyToClipboard(_shareCode, 'Code copied!'); }

function copyToClipboard(text, okMsg) {
  const done = () => alert(okMsg);
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
  } else { fallbackCopy(text, done); }
}
function fallbackCopy(text, done) {
  const ta = document.createElement('textarea');
  ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta); ta.focus(); ta.select();
  try { document.execCommand('copy'); done(); } catch(e) { alert('Copy failed — select the text manually.'); }
  document.body.removeChild(ta);
}

function renderShareQR(link, bytes) {
  const wrap = document.getElementById('share-qr-wrap');
  if (!wrap) return;
  wrap.innerHTML = '';
  // QR realistically scans only for modest payloads; beyond that the code is too dense.
  const MAX_QR = 1200;
  if (bytes > MAX_QR) {
    wrap.innerHTML = `<div style="padding:14px;border:1px dashed var(--border);border-radius:8px;font-size:12px;color:var(--text-muted)">
      📷 This character is too detailed for a scannable QR code (${bytes} chars). Use <strong>Copy Link</strong> or <strong>Copy Code Only</strong> instead — paste it on the other device's import screen.</div>`;
    return;
  }
  if (typeof QRCode === 'undefined') {
    wrap.innerHTML = `<div style="padding:14px;border:1px dashed var(--border);border-radius:8px;font-size:12px;color:var(--text-muted)">QR generator unavailable — use the link or code.</div>`;
    return;
  }
  try {
    const box = document.createElement('div');
    box.style.cssText = 'display:inline-block;padding:10px;background:#fff;border-radius:8px';
    wrap.appendChild(box);
    // Error-correction level L — lowest redundancy → smallest, most-scannable code for link payloads.
    new QRCode(box, {
      text: link,
      width: 260,
      height: 260,
      colorDark: '#000000',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.L
    });
    const cap = document.createElement('div');
    cap.style.cssText = 'font-size:11px;color:var(--text-muted);margin-top:6px';
    cap.textContent = 'Scan to import on another device.';
    wrap.appendChild(cap);
  } catch (e) {
    wrap.innerHTML = `<div style="padding:14px;border:1px dashed var(--border);border-radius:8px;font-size:12px;color:var(--text-muted)">This character is too detailed for a scannable QR code — use the link or code instead.</div>`;
  }
}

// Import a character from a shared #import=… hash on first load.
async function importFromHash() {
  const m = location.hash.match(/[#&]import=([^&]+)/);
  if (!m) return;
  // Clear the hash immediately so a refresh doesn't re-prompt. NOTE: `history` is the global
  // roll-history array in this app — must use window.history here.
  try { window.history.replaceState(null, '', location.pathname + location.search); } catch(e) { location.hash = ''; }
  let payload;
  try { payload = decodeShare(m[1]); } catch(e) { alert('That shared link is invalid or corrupted.'); return; }
  if (!validCharacterShape(payload)) { alert('That shared link does not contain a TOR2E character.'); return; }
  const obj = migrateCharacter(payload);
  if (!await confirmStyled(`Import shared character <strong>${escapeHtml(obj.name || 'New Hero')}</strong>?<br><br>It will be added as a new hero on this device — nothing is overwritten.`, '🔗 Import Shared Character')) return;
  saveCharacter();                       // persist current hero
  const id = genCharId();
  activeCharId = id;
  char = obj;
  history = [];
  journal = defaultJournal();
  saveCharacter();                       // creates slot + roster entry, makes it active
  saveHistory();
  saveJournal();
  render();
  renderHistory();
  renderChronicle();
  alert(`Imported "${obj.name || 'New Hero'}" and switched to them.`);
}

function historyKey() { return ROLLS_PREFIX + (activeCharId || 'v1'); }

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(historyKey())) || [];
  } catch(e) { return []; }
}

function saveHistory() {
  localStorage.setItem(historyKey(), JSON.stringify(history.slice(0, 30)));
}

/* ============================================
   CHRONICLE (journaling) — per-hero
   ============================================ */
// Entry types. label = on-screen tag; ascii = portable Lonelog symbol used in Markdown export.
const JOURNAL_TYPES = {
  action:      { ascii: '@',  label: 'Action' },
  question:    { ascii: '?',  label: 'Question' },
  oracle:      { ascii: '~',  label: 'Oracle' },
  roll:        { ascii: 'd:', label: 'Roll' },
  result:      { ascii: '->', label: 'Result' },
  consequence: { ascii: '=>', label: 'Consequence' },
  status:      { ascii: '%',  label: 'Status' },
  milestone:   { ascii: '#',  label: 'Milestone' },
  event:       { ascii: '!',  label: 'Event' },
  prompt:      { ascii: '>',  label: 'Prompt' },
  note:        { ascii: '*',  label: 'Note' }
};
function defaultJournal() {
  return {
    scenes: [],     // { id, title, date:{year,month,day,phase}, ts }
    entries: [],    // blocks: { id, sceneId, kind:'prose'|'auto', type, text, source, ts, date }
    combats: [],    // { id, sceneId, foeName, endMax, endCur, hateMax, hateCur, eaStart, rounds:[{hero,foe}], active, outcome, date } — legacy
    combatGroups: [], // { id, sceneId, title, renamed, collapsed, ongoing, startSnap:{end,hope,shadow}, summary } — folds an encounter's log lines under one heading
    activeCombatId: null, // the open combat group (blocks logged while set get block.combatId = this)
    threads: [],    // { id, title, status:'open'|'closed', notes, opened, closed }
    npcs: [],       // { id, name, where, notes }
    clock: { year: 2965, month: 'Astron', day: 1, phase: 'Adventuring' },
    settings: { ojc: true, dice: true, status: true, advancement: true },  // dice on (every roll logs to the open scene)
    activeSceneId: null
  };
}
// Shire-Reckoning months (12 × 30 days). Season derived from month.
const SHIRE_MONTHS = ['Afteryule','Solmath','Rethe','Astron','Thrimidge','Forelithe','Afterlithe','Wedmath','Halimath','Winterfilth','Blotmath','Foreyule'];
function monthSeason(month) {
  const i = SHIRE_MONTHS.indexOf(month);
  if (i < 0) return 'Spring';
  if (i === 0 || i === 1 || i === 11) return 'Winter';   // Afteryule, Solmath, Foreyule
  if (i <= 4) return 'Spring';                            // Rethe, Astron, Thrimidge
  if (i <= 7) return 'Summer';                            // Forelithe, Afterlithe, Wedmath
  return 'Autumn';                                        // Halimath, Winterfilth, Blotmath
}
function ordinal(n) {
  n = parseInt(n) || 0;
  const s = ['th','st','nd','rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
function journalKey() { return JOURNAL_PREFIX + (activeCharId || 'v1'); }
function loadJournal() {
  try {
    const raw = JSON.parse(localStorage.getItem(journalKey()));
    if (raw && typeof raw === 'object') {
      const j = { ...defaultJournal(), ...raw };
      if (!Array.isArray(j.scenes)) j.scenes = [];
      if (!Array.isArray(j.entries)) j.entries = [];
      if (!Array.isArray(j.combats)) j.combats = [];
      j.combats.forEach(c => { if (!c.foe || typeof c.foe !== 'object') c.foe = { atkDice: 2, atkDmg: 4, atkInj: 14, atkTN: 14 }; });  // adversary attack profile
      if (!Array.isArray(j.combatGroups)) j.combatGroups = [];
      if (j.activeCombatId === undefined) j.activeCombatId = null;
      if (!Array.isArray(j.threads)) j.threads = [];
      if (!Array.isArray(j.npcs)) j.npcs = [];
      j.clock = { ...defaultJournal().clock, ...(j.clock || {}) };
      // Migrate a legacy {year,season,day} clock to {year,month,day}.
      if (!j.clock.month) {
        const seasonMonth = { Winter: 'Afteryule', Spring: 'Astron', Summer: 'Forelithe', Autumn: 'Halimath' };
        j.clock.month = seasonMonth[j.clock.season] || 'Astron';
      }
      delete j.clock.season;
      j.settings = { ...defaultJournal().settings, ...(j.settings || {}) };
      // One-time flip: existing journals had dice-capture off by default; turn it on once so
      // combat & skill rolls log to the scene. Respected afterward (the toggle still saves).
      if (!j._diceOnMigrated) { j.settings.dice = true; j._diceOnMigrated = true; }
      // Migrate flat (pre-scene) entries into one starting scene, in chronological order.
      const orphans = j.entries.filter(e => !e.sceneId);
      if (orphans.length && j.scenes.length === 0) {
        const oldest = orphans[orphans.length - 1];  // legacy entries were stored newest-first
        const sc = { id: genCharId(), title: 'Earlier entries', date: oldest.date || { ...j.clock }, ts: '' };
        j.scenes.push(sc);
        j.entries = orphans.slice().reverse().map(e => ({
          ...e, sceneId: sc.id, kind: (e.source && e.source.startsWith('auto:')) ? 'auto' : 'prose'
        }));
        j.activeSceneId = sc.id;
      }
      j.entries.forEach(e => { if (!e.kind) e.kind = (e.source && e.source.startsWith('auto:')) ? 'auto' : 'prose'; });
      if (!j.activeSceneId && j.scenes.length) j.activeSceneId = j.scenes[j.scenes.length - 1].id;
      return j;
    }
  } catch(e) {}
  return defaultJournal();
}
function saveJournal() {
  try { localStorage.setItem(journalKey(), JSON.stringify(journal)); } catch(e) {}
}

/* ----- scenes & blocks ----- */
function nowStamp() { return new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
// Snapshot of the hero's vitals at scene start (the paper "state line"). Shadow includes Scars.
function captureState() {
  return {
    endCur: parseInt(char.endCur) || 0, endMax: parseInt(char.endMax) || 0,
    hopeCur: parseInt(char.hopeCur) || 0, hopeMax: parseInt(char.hopeMax) || 0,
    shadow: (parseInt(char.shadow) || 0) + (parseInt(char.scars) || 0),
    eye: parseInt(char.eyeAwareness) || 0
  };
}
function stateLabel(s) {
  if (!s) return '';
  return `End ${s.endCur}/${s.endMax} · Hope ${s.hopeCur}/${s.hopeMax} · Shadow ${s.shadow} · Eye ${s.eye}`;
}
function journalActiveScene() { return journal.scenes.find(s => s.id === journal.activeSceneId) || null; }
function ensureActiveScene() {
  let sc = journalActiveScene();
  if (!sc) {
    sc = { id: genCharId(), title: `${ordinal(journal.clock.day)} ${journal.clock.month}`, date: { ...journal.clock }, ts: nowStamp(), state: captureState() };
    journal.scenes.push(sc);
    journal.activeSceneId = sc.id;
  }
  return sc;
}
async function newScene() {
  const frame = await promptStyled('Frame the scene — where, when, what’s at stake:', '', 'New Scene', 'e.g. Dusk at the Forsaken Inn — the watcher rises to leave');
  if (frame === null) return;  // cancelled
  const sc = { id: genCharId(), title: (frame.trim() || `${ordinal(journal.clock.day)} ${journal.clock.month}`), date: { ...journal.clock }, ts: nowStamp(), state: captureState() };
  journal.scenes.push(sc);
  journal.activeSceneId = sc.id;
  saveJournal();
  renderChronicle();
  const ta = document.getElementById('ch-compose'); if (ta) ta.focus();
}
function setActiveScene(id) {
  journal.activeSceneId = id;
  saveJournal(); renderChronicle();
  const ta = document.getElementById('ch-compose'); if (ta) ta.focus();
}
function toggleSceneCollapse(id) {
  const sc = journal.scenes.find(s => s.id === id); if (!sc) return;
  sc.collapsed = !sc.collapsed; saveJournal(); renderChronicleTimeline();
}
// Move a block up/down among its scene-siblings in the global entries array.
function moveBlock(id, dir) {
  const e = journal.entries; const i = e.findIndex(b => b.id === id); if (i < 0) return;
  const sid = e[i].sceneId; let j = i + dir;
  while (j >= 0 && j < e.length && e[j].sceneId !== sid) j += dir;
  if (j < 0 || j >= e.length || e[j].sceneId !== sid) return;  // no sibling that way
  const tmp = e[i]; e[i] = e[j]; e[j] = tmp;
  saveJournal(); renderChronicleTimeline();
}
function jumpToScene(id) {
  if (!id) return;
  const sc = journal.scenes.find(s => s.id === id);
  if (sc && sc.collapsed) { sc.collapsed = false; saveJournal(); renderChronicleTimeline(); }
  const el = document.getElementById('ch-scene-' + id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
// Scene generator (a journaling aid, not a Strider Mode rule). Produces a structured Middle-earth
// scene frame — Where · Who/What · Happening · Mood — chosen from a context that reads your state:
// journeying → wilderness/road scenes; otherwise a settled/respite context; and when the Shadow
// runs high or the Eye is near its Hunt threshold, a peril overlay lets dread creep in.
const SCENE_GEN = {
  travel: {
    where: ['a leaning standing-stone where the path forks', 'the dark eaves of an ancient wood', 'a fog-bound fen where the ground is never sure', 'a tumbled bridge above a swift, cold stream', 'an old road half-swallowed by grass and years', 'a windswept ridge with the land laid bare below', 'a hollow beneath the roots of a great fallen tree', 'a deserted wayside shelter, its hearth long cold', 'a ford where the water runs grey and quick', 'a cairn-topped hill that the birds avoid'],
    who: ['a wary stranger who keeps one hand near a blade', 'no one — but fresh tracks crossing your own', 'a frightened beast fleeing something behind it', 'a lone figure watching from a far hilltop', 'travellers who draw together at your approach', 'a hooded wanderer who will not meet your eye', 'birds that scatter all at once, startled by the unseen', 'an old soul who knows this country and its dangers', 'the marks of a camp, abandoned in haste', 'a voice on the wind, too faint to name'],
    what: ['you must find shelter before the light fails', 'the way ahead is blocked, and another must be found', 'you cross sign of those you seek — or those who seek you', 'the weather turns hard against you', 'two paths offer themselves, and neither is kind', 'you stumble on something half-buried and old', 'a small mercy presents itself — will you spare the time?', 'weariness or hunger forces a hard choice', 'you glimpse a light where no light should be', 'the silence itself seems to be waiting'],
    mood: ['weary but watchful', 'a fragile, listening quiet', 'the land feels emptied of its old songs', 'mist and failing half-light', 'cold, and the promise of worse', 'a brief, undeserved beauty']
  },
  rest: {
    where: ['a smoky common-room loud with other folk', 'a quiet chamber lent to you for the night', 'the worn steps before a hall of stone', 'a market lane winding down to dusk', 'a walled garden gone half to seed', 'the gate of the settlement, watched by tired guards', 'a small fire in a sheltered camp, the dark close around', 'a bench beneath an old tree where elders gather', 'a stable or storeroom where you have made your bed', 'a high window that looks back over the land you crossed'],
    who: ['your host, generous but full of questions', 'an old acquaintance you did not expect to find', 'a guarded official who measures every word', 'a teller of rumours eager for a fresh ear', 'a child who has watched you since you came', 'a messenger who has been seeking you by name', 'a weary companion who needs your counsel', 'a stranger whose courtesy hides a colder purpose', 'an old one who remembers the days before the Shadow', 'someone in need, who has no one else to ask'],
    what: ['you are asked for news of the road behind you', 'a rumour reaches you that you cannot ignore', 'an old debt — or an old kindness — is recalled', 'you must win the trust of one who doubts you', 'a quiet hour to mend gear, body, and heart', 'an unwelcome question you would rather not answer', 'a chance to learn what the wise here know', 'a parting, or a promise, before you go on', 'you overhear what was not meant for your ears', 'the comfort here makes the leaving harder'],
    mood: ['warm, but watchful', 'open-handed and kind', 'tense beneath the courtesy', 'a hard-won, fragile peace', 'busy and indifferent to your troubles', 'heavy with things unsaid']
  },
  peril: {
    who: ['a servant of the Enemy, hunting with purpose', 'watching eyes you can feel but cannot place', 'a thing that should be long dead, and is not', 'a fell voice that seems to know your name', 'orc-sign, fresh and far too many', 'a shadow that moves against the wind', 'a creature of the old dark, woken and hungry', 'one who was a friend, now changed and cold'],
    what: ['you are hunted, and the net is drawing tight', 'dread settles on you without visible cause', 'something bars the way that means you only harm', 'a trap closes — flight or a stand, choose now', 'the Shadow reaches for your heart; hold fast', 'you must abandon something, or someone, to live', 'the Enemy’s eye turns this way for a moment', 'a betrayal, small or great, comes to light'],
    mood: ['dread, cold and patient', 'a waiting malice in the air', 'the dark pressing close at the firelight’s edge', 'menace, and no clear way out', 'the weight of the Eye, far off but felt']
  }
};
function rollWritingPrompt() {
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const shadow = (parseInt(char.shadow) || 0) + (parseInt(char.scars) || 0);
  const hopeMax = parseInt(char.hopeMax) || 0;
  const hunt = (typeof HUNT_THRESHOLDS !== 'undefined' ? (HUNT_THRESHOLDS[char.huntRegion] || 16) : 16) + (parseInt(char.huntMod) || 0);
  const eye = parseInt(char.eyeAwareness) || 0;
  const solo = (typeof isSolo === 'function') && isSolo();
  const perilous = (hopeMax > 0 && shadow >= Math.ceil(hopeMax * 0.5)) || (solo && eye >= hunt);
  const ctx = (char.journey && char.journey.active) ? SCENE_GEN.travel : SCENE_GEN.rest;
  const src = perilous ? SCENE_GEN.peril : ctx;
  const line = `🎬 Scene — Where: ${pick(ctx.where)}. Who/What: ${pick(src.who)}. Happening: ${pick(src.what)}. Mood: ${pick(src.mood)}.`;
  pushBlock('auto', 'prompt', line, 'manual');  // a describable scene seed (not gated by toggles)
  renderChronicle();
}
// Inline Chronicle oracle — ask the Strider-Mode Telling Table / Lore Table without leaving the tab.
function chronicleAsk() {
  const qEl = document.getElementById('ch-oracle-q');
  const q = (qEl?.value || '').trim();
  const chance = document.getElementById('ch-oracle-chance')?.value || 'middling';
  _tellingResult(q, chance);   // logs the structured line into the open scene
  if (qEl) qEl.value = '';
  renderChronicle();
}
function chronicleLore() {
  const row = _randomLoreRow();
  pushBlock('auto', 'oracle', `Lore → ${row.action} / ${row.aspect} / ${row.focus}`, 'manual');
  renderChronicle();
}
async function renameScene(id) {
  const sc = journal.scenes.find(s => s.id === id); if (!sc) return;
  const t = await promptStyled('Scene title / frame:', sc.title || '', 'Rename Scene');
  if (t === null) return;
  sc.title = t.trim() || sc.title; saveJournal(); renderChronicle();
}
async function deleteScene(id) {
  if (!await confirmStyled('Delete this whole scene and all its entries?', 'Delete Scene')) return;
  journal.scenes = journal.scenes.filter(s => s.id !== id);
  journal.entries = journal.entries.filter(e => e.sceneId !== id);
  if (journal.activeSceneId === id) journal.activeSceneId = journal.scenes.length ? journal.scenes[journal.scenes.length - 1].id : null;
  saveJournal(); renderChronicle();
}
// Push a block into the open scene (creating one if needed).
function pushBlock(kind, type, text, source) {
  if (!text || !text.trim()) return null;
  const sc = ensureActiveScene();
  journal.entries.push({
    id: genCharId(), sceneId: sc.id, kind,
    type: JOURNAL_TYPES[type] ? type : 'note',
    text: text.trim(), source: source || 'manual',
    combatId: journal.activeCombatId || null,  // folds into the open combat group, if any
    ts: nowStamp(), date: { ...journal.clock }
  });
  if (journal.entries.length > 3000) journal.entries.shift();
  saveJournal();
  return true;
}
function addProseToScene() {
  const ta = document.getElementById('ch-compose');
  if (!ta || !ta.value.trim()) return;
  pushBlock('prose', 'note', ta.value, 'manual');
  ta.value = '';
  renderChronicle();
}
/**
 * Auto-capture a mechanical event into the open Chronicle scene as a dimmed `kind:'auto'` block.
 * Gated by the per-bucket toggle in `journal.settings`. Called from the oracle/journey/council,
 * dice, status (Shadow/condition), and advancement paths.
 * @param {('ojc'|'dice'|'status'|'advancement')} bucket  which auto-capture toggle gates this
 * @param {string} type  a JOURNAL_TYPES key (oracle/roll/status/milestone/…)
 * @param {string} text  the line to log
 */
function journalAuto(bucket, type, text) {
  if (!journal || !journal.settings || journal.settings[bucket] === false) return;
  pushBlock('auto', type, text, 'auto:' + bucket);
  const panel = document.getElementById('panel-chronicle');
  if (panel && panel.classList.contains('active')) renderChronicle();
}

/* ----- block edit / delete ----- */
let _editingBlockId = null;
let _describingId = null;
function editBlock(id) { _editingBlockId = id; _describingId = null; renderChronicleTimeline(); const ta = document.getElementById('ch-edit-' + id); if (ta) { ta.focus(); } }
function cancelBlockEdit() { _editingBlockId = null; renderChronicleTimeline(); }
function saveBlockEdit(id) {
  const ta = document.getElementById('ch-edit-' + id);
  if (ta) { const b = journal.entries.find(e => e.id === id); if (b && ta.value.trim()) b.text = ta.value.trim(); }
  _editingBlockId = null; saveJournal(); renderChronicleTimeline();
}
// "Describe" a roll result — opens an inline box and inserts the prose right AFTER that result.
function describeBlock(id) { _describingId = id; _editingBlockId = null; renderChronicleTimeline(); const ta = document.getElementById('ch-desc-' + id); if (ta) ta.focus(); }
function cancelDescribe() { _describingId = null; renderChronicleTimeline(); }
function saveDescribe(id) {
  const ta = document.getElementById('ch-desc-' + id);
  const idx = journal.entries.findIndex(e => e.id === id);
  if (ta && ta.value.trim() && idx >= 0) {
    const anchor = journal.entries[idx];
    journal.entries.splice(idx + 1, 0, {
      id: genCharId(), sceneId: anchor.sceneId, kind: 'prose', type: 'note',
      text: ta.value.trim(), source: 'manual', combatId: anchor.combatId || null, ts: nowStamp(), date: anchor.date || { ...journal.clock }
    });
  }
  _describingId = null; saveJournal(); renderChronicleTimeline();
}
// Opt-in demo so the play-log layout is obvious on first open. The example is normal data — edit or delete freely.
function loadSampleChronicle() {
  const sc = { id: genCharId(), title: 'The Forsaken Inn (example)', date: { ...journal.clock }, ts: nowStamp(), state: captureState() };
  journal.scenes.push(sc); journal.activeSceneId = sc.id;
  const mk = (kind, type, text, source) => ({ id: genCharId(), sceneId: sc.id, kind, type, text, source: source || (kind === 'auto' ? 'auto:ojc' : 'manual'), ts: nowStamp(), date: { ...journal.clock } });
  journal.entries.push(mk('prose', 'note', 'Dusk. The common room empties; a hooded watcher rises to leave.'));
  journal.entries.push(mk('auto', 'oracle', 'Q: Is the yard empty? · Telling Table (Middling) → No, but… a drowsing stablehand', 'auto:ojc'));
  journal.entries.push(mk('prose', 'note', 'I slip out after him, keeping to the shadows along the stable wall.'));
  journal.entries.push(mk('auto', 'roll', 'Stealth 2d WIT — 17 vs 16 → SUCCESS (1✦)', 'auto:dice'));
  journal.entries.push(mk('prose', 'note', 'He never marks me. Under his saddle: a folded note in a cipher I half-know.'));
  journal.combats.push({ id: genCharId(), sceneId: sc.id, foeName: 'Footpad', endMax: 8, endCur: 0, hateMax: 2, hateCur: 1,
    rounds: [{ hero: 'Forward · Long sword · 18 → 6 dmg', foe: 'Cudgel · Miss' }, { hero: 'Long sword · 14 → 4 dmg (slain)', foe: '—' }],
    active: false, outcome: 'Foe slain', date: { ...journal.clock } });
  saveJournal(); renderChronicle();
}
async function deleteChronicleEntry(id) {
  if (!await confirmStyled('Delete this entry?', 'Delete Entry')) return;
  journal.entries = journal.entries.filter(e => e.id !== id);
  if (_editingBlockId === id) _editingBlockId = null;
  saveJournal(); renderChronicleTimeline();
}

/* ----- clock (Shire-Reckoning calendar) ----- */
function setChronicleClock() {
  journal.clock.year = Math.max(0, parseInt(document.getElementById('ch-year').value) || 0);
  journal.clock.day = Math.min(30, Math.max(1, parseInt(document.getElementById('ch-day').value) || 1));
  journal.clock.month = document.getElementById('ch-month').value || 'Astron';
  journal.clock.phase = document.getElementById('ch-phase').value || 'Adventuring';
  saveJournal();
  renderChronicle();
}
// Advance N days, rolling over months (30/mo) and the year (after Foreyule).
function advanceChronicleDay(n) {
  let day = (parseInt(journal.clock.day) || 1) + n;
  let mi = SHIRE_MONTHS.indexOf(journal.clock.month); if (mi < 0) mi = 3;
  let year = parseInt(journal.clock.year) || 0;
  while (day > 30) { day -= 30; mi++; if (mi > 11) { mi = 0; year++; } }
  while (day < 1) { day += 30; mi--; if (mi < 0) { mi = 11; year--; } }
  journal.clock.day = day; journal.clock.month = SHIRE_MONTHS[mi]; journal.clock.year = year;
  saveJournal(); renderChronicleClock();
}
function advanceChronicleMonth() {
  let mi = SHIRE_MONTHS.indexOf(journal.clock.month); if (mi < 0) mi = 3;
  mi++; if (mi > 11) { mi = 0; journal.clock.year = (parseInt(journal.clock.year) || 0) + 1; }
  journal.clock.month = SHIRE_MONTHS[mi];
  saveJournal(); renderChronicleClock();
}
function markYule() {
  // Yule turns the year: roll to 1 Afteryule of the next year.
  journal.clock.year = (parseInt(journal.clock.year) || 0) + 1;
  journal.clock.month = 'Afteryule';
  journal.clock.day = 1;
  saveJournal(); renderChronicleClock();
  journalAuto('advancement', 'milestone', `Yule — the year turns. It is now ${journal.clock.year}.`);
}
function setChronicleToggles() {
  journal.settings.ojc = document.getElementById('ch-set-ojc').checked;
  journal.settings.dice = document.getElementById('ch-set-dice').checked;
  journal.settings.status = document.getElementById('ch-set-status').checked;
  journal.settings.advancement = document.getElementById('ch-set-advancement').checked;
  saveJournal();
}

/* ----- render ----- */
function renderChronicle() {
  renderChronicleClock();
  // "Writing in" label above the compose box
  const lbl = document.getElementById('ch-active-scene');
  if (lbl) {
    const sc = journalActiveScene();
    lbl.innerHTML = sc
      ? `Writing in: <span style="color:var(--ink)">${escapeHtml(sc.title)}</span> <span style="color:var(--text-faint);font-weight:400">· ${dateLabel(sc.date)}</span>`
      : 'No scene open — tap “+ New Scene”, or just write below and a scene begins automatically.';
  }
  renderChronicleTimeline();
  const s = journal.settings || {};
  ['ojc','dice','status','advancement'].forEach(k => {
    const el = document.getElementById('ch-set-' + k);
    if (el) el.checked = s[k] !== false;
  });
}
function renderChronicleClock() {
  const y = document.getElementById('ch-year'); if (!y) return;
  y.value = journal.clock.year;
  document.getElementById('ch-day').value = journal.clock.day;
  const monthSel = document.getElementById('ch-month');
  if (monthSel) {
    if (monthSel.options.length === 0) monthSel.innerHTML = SHIRE_MONTHS.map(m => `<option>${m}</option>`).join('');
    monthSel.value = journal.clock.month;
  }
  document.getElementById('ch-phase').value = journal.clock.phase;
  const readout = document.getElementById('ch-date-readout');
  if (readout) readout.textContent = dateLabel(journal.clock);
}
function dateLabel(d) {
  if (!d) return '';
  // New Shire-calendar form {year,month,day}; falls back to legacy {year,season,day}.
  if (d.month) {
    return `${monthSeason(d.month)}, ${ordinal(d.day)} ${d.month} ${d.year}${d.phase === 'Fellowship' ? ' · Fellowship' : ''}`;
  }
  return `${d.season || ''}, Day ${d.day}, Year ${d.year}${d.phase === 'Fellowship' ? ' · Fellowship' : ''}`;
}
function renderChronicleTimeline() {
  const wrap = document.getElementById('ch-timeline');
  if (!wrap) return;
  const q = (document.getElementById('ch-search')?.value || '').toLowerCase().trim();
  const countEl = document.getElementById('ch-count');
  if (countEl) countEl.textContent = journal.scenes.length ? `(${journal.scenes.length} scene${journal.scenes.length === 1 ? '' : 's'})` : '';
  if (journal.scenes.length === 0) {
    wrap.innerHTML = `<div style="text-align:center;color:var(--text-faint);padding:14px;font-size:12px">No scenes yet — tap “+ New Scene”, or just start writing below.<br><br>
      <button class="add-row-btn" onclick="loadSampleChronicle()" style="background:var(--btn-secondary-bg);font-size:12px">Load an example scene</button></div>`;
    return;
  }
  // Jump-to-scene selector (only worth showing past a couple of scenes).
  let html = '';
  if (journal.scenes.length > 2) {
    html += `<select onchange="jumpToScene(this.value);this.selectedIndex=0" style="width:100%;margin-bottom:8px;font-size:12px;padding:4px 6px;border:1px solid var(--border);border-radius:5px;background:var(--bg-deep);color:var(--ink)">
      <option value="">↪ Jump to scene…</option>
      ${journal.scenes.slice().reverse().map(s => `<option value="${s.id}">${escapeHtml(s.title)}</option>`).join('')}
    </select>`;
  }
  const editTextarea = (b) => `<div style="padding:4px 8px">
      <textarea id="ch-edit-${b.id}" rows="3" style="width:100%;padding:6px;border:1px solid var(--gold);border-radius:6px;background:var(--bg-deep);color:var(--ink);font-size:14px;line-height:1.5">${escapeHtml(b.text)}</textarea>
      <div style="display:flex;gap:6px;margin-top:4px">
        <button onclick="saveBlockEdit('${b.id}')" class="add-row-btn" style="background:var(--gold);font-size:12px;flex:1">Save</button>
        <button onclick="cancelBlockEdit()" class="add-row-btn" style="background:var(--btn-secondary-bg);font-size:12px;flex:1">Cancel</button>
      </div>
    </div>`;
  const moveBtns = (id) => `<button onclick="moveBlock('${id}',-1)" title="Move up" style="flex:0 0 auto;background:none;border:none;color:var(--text-faint);cursor:pointer;font-size:11px">▲</button><button onclick="moveBlock('${id}',1)" title="Move down" style="flex:0 0 auto;background:none;border:none;color:var(--text-faint);cursor:pointer;font-size:11px">▼</button>`;
  // Newest scene first; blocks within a scene stay in chronological (written) order.
  journal.scenes.slice().reverse().forEach(sc => {
    const blocks = journal.entries.filter(e => e.sceneId === sc.id);
    const shown = q ? blocks.filter(b => (b.text || '').toLowerCase().includes(q)) : blocks;
    if (q && shown.length === 0 && !sc.title.toLowerCase().includes(q)) return;  // scene filtered out
    const active = sc.id === journal.activeSceneId;
    const collapsed = !!sc.collapsed;
    const sceneCombats = (journal.combats || []).filter(c => c.sceneId === sc.id && !c.active);
    html += `<div id="ch-scene-${sc.id}" style="margin:10px 0 4px;padding:6px 8px;background:var(--gold-soft);border-radius:6px;display:flex;align-items:center;gap:6px">
      <button onclick="toggleSceneCollapse('${sc.id}')" title="${collapsed ? 'Expand' : 'Collapse'}" style="flex:0 0 auto;background:none;border:none;cursor:pointer;color:var(--ink);font-size:12px">${collapsed ? '▸' : '▾'}</button>
      <div style="flex:1;min-width:0">
        <div style="font-weight:700;color:var(--ink);font-size:13px">${escapeHtml(sc.title)}${active ? ' <span style="font-size:9px;background:var(--gold);color:#fff;padding:1px 5px;border-radius:6px;vertical-align:middle">OPEN</span>' : ''}${collapsed ? ` <span style="font-size:10px;color:var(--text-faint);font-weight:400">(${blocks.length})</span>` : ''}</div>
        <div style="font-size:10px;color:var(--text-faint)">${dateLabel(sc.date)}${sc.state ? ' · ' + stateLabel(sc.state) : ''}</div>
      </div>
      ${active ? '' : `<button onclick="setActiveScene('${sc.id}')" title="Write here" style="background:none;border:1px solid var(--border);border-radius:4px;font-size:10px;padding:2px 6px;cursor:pointer;color:var(--ink)">Write here</button>`}
      <button onclick="renameScene('${sc.id}')" title="Rename" style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:13px">✎</button>
      <button onclick="deleteScene('${sc.id}')" title="Delete scene" style="background:none;border:none;cursor:pointer;color:var(--text-faint);font-size:14px">×</button>
    </div>`;
    if (collapsed) return;
    // Interleaved play-log: blocks in written order — a dimmed roll result, then its description.
    if (shown.length === 0 && sceneCombats.length === 0) {
      html += `<div style="padding:6px 10px;font-size:12px;color:var(--text-faint)">${q ? '(no matching lines)' : 'Empty scene — write the first line below, or make a roll on the Oracle/Dice tabs.'}</div>`;
    }
    // Render a single block (prose or dimmed auto line), incl. its inline edit/describe boxes.
    const renderOne = (b) => {
      if (_editingBlockId === b.id) return editTextarea(b);
      if (b.kind === 'prose') {
        return `<div style="display:flex;gap:4px;padding:2px 10px 6px;align-items:flex-start">
          <div style="flex:1;min-width:0;line-height:1.55;white-space:pre-wrap">${escapeHtml(b.text)}</div>
          ${moveBtns(b.id)}
          <button onclick="editBlock('${b.id}')" title="Edit" style="flex:0 0 auto;background:none;border:none;color:var(--text-faint);cursor:pointer;font-size:12px">✎</button>
          <button onclick="deleteChronicleEntry('${b.id}')" title="Delete" style="flex:0 0 auto;background:none;border:none;color:var(--text-faint);cursor:pointer;font-size:13px">×</button>
        </div>`;
      }
      const t = JOURNAL_TYPES[b.type] || JOURNAL_TYPES.note;
      let h = `<div style="display:flex;gap:6px;padding:5px 10px 1px;align-items:baseline;opacity:0.72">
          <span style="flex:0 0 auto;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted)">${t.label}</span>
          <span style="flex:1;min-width:0;font-size:12px;font-style:italic;color:var(--text-muted)">${escapeHtml(b.text)}</span>
          ${moveBtns(b.id)}
          <button onclick="describeBlock('${b.id}')" title="Describe below" style="flex:0 0 auto;background:none;border:none;color:var(--text-faint);cursor:pointer;font-size:11px">✎ describe</button>
          <button onclick="editBlock('${b.id}')" title="Edit line" style="flex:0 0 auto;background:none;border:none;color:var(--text-faint);cursor:pointer;font-size:11px">edit</button>
          <button onclick="deleteChronicleEntry('${b.id}')" title="Delete" style="flex:0 0 auto;background:none;border:none;color:var(--text-faint);cursor:pointer;font-size:13px">×</button>
        </div>`;
      if (_describingId === b.id) {
        h += `<div style="padding:2px 10px 6px 22px">
            <textarea id="ch-desc-${b.id}" rows="2" placeholder="Describe what happens…" style="width:100%;padding:6px;border:1px solid var(--gold);border-radius:6px;background:var(--bg-deep);color:var(--ink);font-size:14px;line-height:1.5"></textarea>
            <div style="display:flex;gap:6px;margin-top:4px">
              <button onclick="saveDescribe('${b.id}')" class="add-row-btn" style="background:var(--gold);font-size:12px;flex:1">Add description</button>
              <button onclick="cancelDescribe()" class="add-row-btn" style="background:var(--btn-secondary-bg);font-size:12px;flex:1">Cancel</button>
            </div>
          </div>`;
      }
      return h;
    };
    // Walk blocks in written order, folding each run of same-combatId blocks under one heading.
    let bi = 0;
    while (bi < shown.length) {
      const b = shown[bi];
      const cid = b.combatId;
      if (cid) {
        let bj = bi; const run = [];
        while (bj < shown.length && shown[bj].combatId === cid) { run.push(shown[bj]); bj++; }
        const g = (journal.combatGroups || []).find(x => x.id === cid);
        const title = g ? g.title : '⚔️ Combat';
        const hasOpen = run.some(rb => rb.id === _editingBlockId || rb.id === _describingId);
        const showCollapsed = (g ? g.collapsed !== false : true) && !hasOpen;
        const summary = g && !g.ongoing && g.summary ? g.summary : '';
        html += `<div style="margin:5px 0;border:1px solid var(--gold-soft);border-radius:7px;overflow:hidden">
            <div style="display:flex;align-items:center;gap:6px;padding:5px 8px;background:var(--gold-soft);cursor:pointer" onclick="toggleCombatGroup('${cid}')">
              <span style="font-size:11px;color:var(--ink)">${showCollapsed ? '▸' : '▾'}</span>
              <span style="flex:1;min-width:0;font-weight:700;font-size:12px;color:var(--ink)">${escapeHtml(title)}${g && g.ongoing ? ' <span style="font-size:9px;background:var(--red);color:#fff;padding:1px 5px;border-radius:6px;vertical-align:middle">LIVE</span>' : ''}</span>
              ${summary ? `<span style="font-size:10px;color:var(--text-muted);text-align:right">${escapeHtml(summary)}</span>` : ''}
              <button onclick="event.stopPropagation();renameCombatGroup('${cid}')" title="Rename" style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:12px">✎</button>
            </div>`;
        if (showCollapsed) html += `<div style="padding:3px 10px;font-size:11px;color:var(--text-faint)">${run.length} line${run.length !== 1 ? 's' : ''} — tap to expand</div>`;
        else { html += `<div style="padding:2px 0">`; run.forEach(rb => { html += renderOne(rb); }); html += `</div>`; }
        html += `</div>`;
        bi = bj;
      } else {
        html += renderOne(b);
        bi++;
      }
    }
    sceneCombats.forEach(c => { html += renderCombatBlock(c); });
  });
  wrap.innerHTML = html || `<div style="text-align:center;color:var(--text-faint);padding:14px;font-size:12px">No matching entries.</div>`;
}
/* ----- combat log ----- */
function activeCombat() { return (journal.combats || []).find(c => c.active) || null; }
async function newCombat() {
  const name = await promptStyled('Foe name:', '', '⚔️ New Combat', 'e.g. The Watcher in the Dark');
  if (name === null) return;
  const endStr = await promptStyled(`Endurance of ${name.trim() || 'the foe'}:`, '20', '⚔️ New Combat');
  if (endStr === null) return;
  const hateStr = await promptStyled('Hate / Resolve:', '5', '⚔️ New Combat');
  if (hateStr === null) return;
  ensureActiveScene();
  (journal.combats || []).forEach(c => { if (c.active) c.active = false; });  // only one active at a time
  const end = Math.max(0, parseInt(endStr) || 0), hate = Math.max(0, parseInt(hateStr) || 0);
  journal.combats.push({
    id: genCharId(), sceneId: journal.activeSceneId, foeName: (name.trim() || 'Foe'),
    endMax: end, endCur: end, hateMax: hate, hateCur: hate, rounds: [], active: true, outcome: '', date: { ...journal.clock },
    // Adversary attack profile for the "Foe Attacks" helper (editable in the card). TOR2E stat-block
    // shape: N success dice (atkDice) · Damage (atkDmg) · Injury TN (atkInj) · the foe's attack TN (atkTN).
    foe: { atkDice: 2, atkDmg: 4, atkInj: 14, atkTN: 14 }
  });
  saveJournal(); renderChronicle();
}
function adjCombat(id, field, delta) {
  const c = (journal.combats || []).find(x => x.id === id); if (!c) return;
  const max = field === 'endCur' ? c.endMax : c.hateMax;
  c[field] = Math.max(0, Math.min(max, (parseInt(c[field]) || 0) + delta));
  saveJournal(); renderChronicleCombat();
}
// Step the hero's Eye Awareness from within the combat card (it lives on char, shared with the Eye of Mordor card).
function adjCombatEye(delta) {
  char.eyeAwareness = Math.max(0, (parseInt(char.eyeAwareness) || 0) + delta);
  saveCharacter();
  if (typeof refreshEyeOfMordor === 'function') refreshEyeOfMordor();
  renderChronicleCombat();
}
function addCombatRound(id) {
  const c = (journal.combats || []).find(x => x.id === id); if (!c) return;
  const heroEl = document.getElementById('ch-rd-hero'), foeEl = document.getElementById('ch-rd-foe');
  const hero = (heroEl?.value || '').trim(), foe = (foeEl?.value || '').trim();
  if (!hero && !foe) return;
  c.rounds.push({ hero, foe });
  if (heroEl) heroEl.value = ''; if (foeEl) foeEl.value = '';
  saveJournal(); renderChronicleCombat();
}
// Edit the foe's stored attack profile (dice / Damage / Injury TN / attack TN).
function setFoeProfile(id, field, val) {
  const c = (journal.combats || []).find(x => x.id === id); if (!c) return;
  if (!c.foe || typeof c.foe !== 'object') c.foe = { atkDice: 2, atkDmg: 4, atkInj: 14, atkTN: 14 };
  c.foe[field] = Math.max(0, parseInt(val) || 0);
  saveJournal();
  renderChronicleCombat();  // refresh the button's TN label
}
// Roll the foe's attack: Feat + atkDice success dice vs (foe attack TN + your Parry total). On a hit,
// subtract the foe's Damage from YOUR Endurance and log the foe side of the round (auto-fills it).
async function foeAttacks(id) {
  const c = (journal.combats || []).find(x => x.id === id); if (!c) return;
  const f = c.foe || { atkDice: 2, atkDmg: 4, atkInj: 14, atkTN: 14 };
  const heroParry = (parseInt(char.parry) || 0) + (parseInt(char.shieldTotal) || 0);
  const tn = (parseInt(f.atkTN) || 0) + heroParry;
  const roll = _doInlineRoll(parseInt(f.atkDice) || 0, 'normal', tn);
  const hit = roll.outcome.startsWith('SUCCESS');
  const score = roll.featSpecial === 'rune' ? '★(Rune)' : (roll.featSpecial === 'eye' ? '✗(Eye)' : roll.total);
  // Piercing Blow: a Gandalf rune or a 10 on the foe's Feat die (matches the hero-attack model).
  const piercing = hit && (roll.featSpecial === 'rune' || roll.featValue === 10);
  let line = `${c.foeName} attacks · ${score} vs TN ${tn} (${f.atkTN} + Parry ${heroParry}) → `;
  if (hit) {
    const dmg = parseInt(f.atkDmg) || 0;
    char.endCur = Math.max(0, (parseInt(char.endCur) || 0) - dmg);
    line += `HIT · −${dmg} End → ${char.endCur}/${char.endMax}`;
    if (char.endCur === 0) line += ' · ⚠ you are Dying';
    saveCharacter();
  } else {
    line += `miss${roll.icons ? ` (${roll.icons}✦)` : ''}`;
  }

  // Piercing Blow → auto-prompt the hero's Protection roll vs the foe's Injury TN; a failure
  // marks Wounded and rolls Wound Severity (shared with the Dice-tab Protection card).
  if (piercing) {
    const injTN = parseInt(f.atkInj) || 14;
    if (await confirmStyled(`🗡️ <strong>Piercing Blow!</strong> ${escapeHtml(c.foeName)}'s blow finds a gap.<br><br>Roll your Protection vs Injury <strong>${injTN}</strong>?`, 'Piercing Blow')) {
      const protDice = (parseInt(char.armourProt) || 0) + (parseInt(char.helmProt) || 0);
      const P = _protectionRoll(injTN, protDice);
      const pScore = P.isAutoSuccess ? '★' : (P.isAutoFail ? '✗' : P.total);
      if (P.outcome.startsWith('SUCCESS')) {
        line += ` · Piercing Blow — Protection ${pScore} vs ${injTN} → resisted`;
      } else {
        line += ` · Piercing Blow — Protection ${pScore} vs ${injTN} → WOUNDED`;
        const wr = await _applyWoundFromFail();
        line += ` (${wr.label})`;
      }
    } else {
      line += ` · Piercing Blow (resolve Protection manually)`;
    }
  }

  // Auto-fill the foe slot of the latest round if it's empty; otherwise start a new round.
  const rounds = c.rounds || (c.rounds = []);
  const last = rounds[rounds.length - 1];
  if (last && !last.foe) last.foe = line; else rounds.push({ hero: '', foe: line });
  saveJournal();
  render();                 // reflect the hero's new Endurance + any Dying/Wounded state
  renderChronicleCombat();  // refresh the combat card (rounds + Endurance)
}
async function editCombatRound(id, idx) {
  const c = (journal.combats || []).find(x => x.id === id); if (!c || !c.rounds[idx]) return;
  const hero = await promptStyled('Your round (stance · weapon · roll · result):', c.rounds[idx].hero || '', `Edit Round ${idx + 1}`);
  if (hero === null) return;
  const foe = await promptStyled('Foe — attacks · result (optional):', c.rounds[idx].foe || '', `Edit Round ${idx + 1}`);
  if (foe === null) return;
  c.rounds[idx].hero = hero.trim();
  c.rounds[idx].foe = foe.trim();
  saveJournal(); renderChronicleCombat();
}
function delCombatRound(id, idx) {
  const c = (journal.combats || []).find(x => x.id === id); if (!c) return;
  c.rounds.splice(idx, 1); saveJournal(); renderChronicleCombat();
}
async function endCombat(id) {
  const c = (journal.combats || []).find(x => x.id === id); if (!c) return;
  const outcome = await promptStyled('How did it end?', c.endCur <= 0 ? 'Foe slain' : '', 'End Combat', 'e.g. Foe slain · Escaped · Driven off');
  if (outcome === null) return;
  c.active = false; c.outcome = outcome.trim();
  saveJournal(); renderChronicle();
}
async function deleteCombat(id) {
  if (!await confirmStyled('Delete this combat log?', 'Delete Combat')) return;
  journal.combats = journal.combats.filter(x => x.id !== id);
  saveJournal(); renderChronicle();
}
// Read-only combat summary shown inside a scene's Rules Bits (for ended/other-scene combats).
function renderCombatBlock(c) {
  let h = `<div style="padding:3px 6px;font-size:12px">
    <div style="font-weight:700;color:var(--text-muted)">⚔️ ${escapeHtml(c.foeName)} — End ${c.endCur}/${c.endMax}, Hate ${c.hateCur}/${c.hateMax}${c.outcome ? ' · ' + escapeHtml(c.outcome) : ''}${c.active ? ' · <em>ongoing</em>' : ''}
      <button onclick="deleteCombat('${c.id}')" title="Delete" style="background:none;border:none;color:var(--text-faint);cursor:pointer;float:right;font-size:13px">×</button></div>`;
  (c.rounds || []).forEach((r, i) => {
    h += `<div style="font-style:italic;color:var(--text-muted);padding-left:8px;font-size:11px">R${i + 1}: ${escapeHtml(r.hero || '—')}${r.foe ? ' | ' + escapeHtml(r.foe) : ''}</div>`;
  });
  return h + `</div>`;
}
// Active-combat editor card at the top of the Chronicle tab.
function renderChronicleCombat() {
  const card = document.getElementById('ch-combat-card');
  if (!card) return;
  const c = activeCombat();
  if (!c) {
    card.innerHTML = `<button class="add-row-btn" onclick="newCombat()" style="width:100%;background:var(--btn-alert-bg)">⚔️ New Combat</button>`;
    return;
  }
  const step = (id, f, d, lbl) => `<button onclick="adjCombat('${id}','${f}',${d})" style="width:26px;height:26px;border:1px solid var(--border);background:var(--card-bg);color:var(--ink);border-radius:4px;cursor:pointer">${lbl}</button>`;
  const eaStep = (d, lbl) => `<button onclick="adjCombatEye(${d})" style="width:26px;height:26px;border:1px solid var(--border);background:var(--card-bg);color:var(--ink);border-radius:4px;cursor:pointer">${lbl}</button>`;
  const ea = parseInt(char.eyeAwareness) || 0;
  const hunt = (HUNT_THRESHOLDS[char.huntRegion] || 16) + (parseInt(char.huntMod) || 0);
  const f = c.foe || (c.foe = { atkDice: 2, atkDmg: 4, atkInj: 14, atkTN: 14 });
  const heroParry = (parseInt(char.parry) || 0) + (parseInt(char.shieldTotal) || 0);
  const fIn = (field, val) => `<input type="number" min="0" value="${val}" onchange="setFoeProfile('${c.id}','${field}',this.value)" style="width:38px;padding:3px 4px;border:1px solid var(--border);border-radius:4px;background:var(--bg-deep);color:var(--ink);font-size:12px">`;
  let rounds = (c.rounds || []).map((r, i) => `<div style="display:flex;gap:6px;padding:3px 0;border-top:1px solid var(--border);font-size:12px">
      <span style="flex:0 0 26px;color:var(--text-faint)">R${i + 1}</span>
      <span style="flex:1;min-width:0"><span style="color:var(--ink)">${escapeHtml(r.hero || '—')}</span>${r.foe ? `<br><span style="color:var(--red-dark)">${escapeHtml(r.foe)}</span>` : ''}</span>
      <button onclick="editCombatRound('${c.id}',${i})" title="Edit this round" style="background:none;border:none;color:var(--text-faint);cursor:pointer">✎</button>
      <button onclick="delCombatRound('${c.id}',${i})" style="background:none;border:none;color:var(--text-faint);cursor:pointer">×</button>
    </div>`).join('');
  card.innerHTML = `
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
      <strong style="flex:1;font-size:14px">⚔️ ${escapeHtml(c.foeName)}</strong>
      <button onclick="endCombat('${c.id}')" class="add-row-btn" style="font-size:11px;background:var(--btn-secondary-bg);padding:3px 8px">End combat</button>
    </div>
    <div class="row-2" style="gap:10px;font-size:13px">
      <div style="display:flex;align-items:center;gap:4px">End <strong style="min-width:42px;text-align:center">${c.endCur}/${c.endMax}</strong>${step(c.id,'endCur',-1,'−')}${step(c.id,'endCur',1,'+')}</div>
      <div style="display:flex;align-items:center;gap:4px">Hate <strong style="min-width:36px;text-align:center">${c.hateCur}/${c.hateMax}</strong>${step(c.id,'hateCur',-1,'−')}${step(c.id,'hateCur',1,'+')}</div>
    </div>
    <div style="display:flex;align-items:center;gap:4px;font-size:13px;margin-top:6px">👁️ Eye <strong style="min-width:42px;text-align:center;color:${ea >= hunt ? 'var(--red-dark)' : 'var(--ink)'}">${ea} / ${hunt}</strong>${eaStep(-1,'−')}${eaStep(1,'+')}<span style="font-size:10px;color:var(--text-faint)">vs Hunt</span></div>
    <div style="margin-top:8px;padding-top:7px;border-top:1px solid var(--border)">
      <div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;font-size:12px;color:var(--ink)">
        <span style="font-weight:600;color:var(--red-dark)">🗡️ Foe attack:</span>
        ${fIn('atkDice', f.atkDice)}<span>dice</span>
        <span>Dmg</span>${fIn('atkDmg', f.atkDmg)}
        <span>Inj</span>${fIn('atkInj', f.atkInj)}
        <span>TN</span>${fIn('atkTN', f.atkTN)}
      </div>
      <button onclick="foeAttacks('${c.id}')" class="add-row-btn" style="width:100%;margin-top:6px;background:var(--btn-alert-bg)">🗡️ ${escapeHtml(c.foeName)} Attacks — roll vs TN ${(parseInt(f.atkTN)||0) + heroParry} (foe ${f.atkTN} + your Parry ${heroParry})</button>
    </div>
    <p class="hint" style="text-align:left;margin:8px 0 2px;color:var(--text-faint)">⚔️ Your attack rolls on the Dice/Combat tab auto-add a round and subtract weapon Damage. 🗡️ Foe Attacks rolls the foe's hit (Feat + dice) and subtracts its Damage from <em>your</em> Endurance. Use the fields below for a manual/narrative round; tap ✎ to edit any round.</p>
    <input id="ch-rd-hero" placeholder="Your round — stance · weapon · roll · result" style="width:100%;margin-top:4px;padding:6px;border:1px solid var(--border);border-radius:6px;background:var(--bg-deep);color:var(--ink);font-size:13px">
    <input id="ch-rd-foe" placeholder="Foe — attacks · result (Piercing Blow, etc.)" style="width:100%;margin-top:4px;padding:6px;border:1px solid var(--border);border-radius:6px;background:var(--bg-deep);color:var(--ink);font-size:13px">
    <button onclick="addCombatRound('${c.id}')" class="add-row-btn" style="width:100%;margin-top:6px;background:var(--gold)">Log Round ${(c.rounds || []).length + 1} manually</button>
    <div style="margin-top:6px">${rounds}</div>`;
}

/* ----- markdown export ----- */
function exportChronicleMarkdown(mode) {
  mode = mode || 'split';  // 'split' = Halbarad (prose then Rules Bits); 'log' = interleaved play-log
  const lines = [];
  lines.push(`# ${char.name || 'Hero'} — Tale of Years`);
  if (char.culture || char.calling) lines.push(`*${[char.culture, char.calling].filter(Boolean).join(' · ')}*`);
  journal.scenes.forEach(sc => {
    lines.push('');
    lines.push(`## ${sc.title}`);
    lines.push(`*${dateLabel(sc.date)}*`);
    lines.push('');
    const blocks = journal.entries.filter(e => e.sceneId === sc.id);
    const combats = (journal.combats || []).filter(c => c.sceneId === sc.id);
    // A combat group → a "### heading" with its lines nested beneath (both export modes).
    const combatHeading = (cid) => { const g = (journal.combatGroups || []).find(x => x.id === cid); lines.push(`### ${g ? g.title : '⚔️ Combat'}${g && g.summary ? ` — ${g.summary}` : ''}`); lines.push(''); };
    const combatLine = (b) => { if (b.kind === 'prose') { lines.push(b.text); lines.push(''); } else { const t = JOURNAL_TYPES[b.type] || JOURNAL_TYPES.note; lines.push(`- **${t.label}:** ${b.text}`); } };
    if (mode === 'log') {
      // Interleaved play-log; combat runs fold under their heading.
      let i = 0;
      while (i < blocks.length) {
        const b = blocks[i];
        if (b.combatId) {
          let j = i; const run = [];
          while (j < blocks.length && blocks[j].combatId === b.combatId) { run.push(blocks[j]); j++; }
          combatHeading(b.combatId); run.forEach(combatLine); lines.push('');
          i = j;
        } else {
          if (b.kind === 'prose') { lines.push(b.text); lines.push(''); }
          else { const t = JOURNAL_TYPES[b.type] || JOURNAL_TYPES.note; lines.push(`**${t.label}:** ${b.text}`); lines.push(''); }
          i++;
        }
      }
    } else {
      // Split: loose prose first, then a Rules Bits subsection, then combat headings.
      const loose = blocks.filter(b => !b.combatId);
      loose.filter(b => b.kind === 'prose').forEach(b => { lines.push(b.text); lines.push(''); });
      const autos = loose.filter(b => b.kind === 'auto');
      if (autos.length) {
        lines.push('**Rules Bits**'); lines.push('');
        autos.forEach(b => { const t = JOURNAL_TYPES[b.type] || JOURNAL_TYPES.note; lines.push(`- **${t.label}:** ${b.text}`); });
        lines.push('');
      }
      [...new Set(blocks.filter(b => b.combatId).map(b => b.combatId))].forEach(cid => {
        combatHeading(cid); blocks.filter(b => b.combatId === cid).forEach(combatLine); lines.push('');
      });
    }
    // Legacy journal.combats (pre-encounter data) render the same in both modes.
    combats.forEach(c => {
      lines.push(`- **Combat: ${c.foeName}** (End ${c.endCur}/${c.endMax}, Hate ${c.hateCur}/${c.hateMax})${c.outcome ? ' — ' + c.outcome : ''}`);
      (c.rounds || []).forEach((r, i) => { lines.push(`  - R${i + 1}: ${r.hero || '—'}${r.foe ? ' | ' + r.foe : ''}`); });
    });
    lines.push('');
  });
  const md = lines.join('\n');
  const blob = new Blob([md], { type: 'text/markdown' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = (char.name || 'character') + (mode === 'log' ? '-playlog' : '-chronicle') + '.md';
  a.click();
}
