/* ---------- TABLE PLAY (group play with a Loremaster) ----------
   When this device is in a cloud campaign, ▶ Play stops running a solo story and becomes a
   TABLE SHEET: the Loremaster tells the story out loud, and each player's phone shows their
   hero, what the table is doing right now, and big buttons for the rolls they will be asked for.
   The Loremaster's Play tab is the table console.

   Shared state lives under campaigns/{cid}:
     table        { phase, note, since, … }   — the Loremaster's current phase for everyone
   Players never write `table`; the rules make it loremaster-write (database.rules.json).
   Out of a campaign nothing here runs, and ▶ Play is the solo flow exactly as before. */

function tableActive() { return typeof Sync !== 'undefined' && Sync.isEnabled && Sync.isEnabled() && !!Sync.uid && !!Sync.currentCampaign(); }
function tableIsGm() { return tableActive() && Sync.isLoremaster(); }

const TABLE_PHASES = {
  story:      { label: 'Story',             text: 'The Loremaster is telling the story. Listen, say what your hero does, and roll when you are asked.',
                gm: 'Tell the story. When the outcome of something a hero tries is uncertain, ask for a roll.' },
  journey:    { label: 'On a journey',      text: 'The Company is travelling. The Loremaster runs the road; you roll for your journey role when it comes up.',
                gm: 'Plan the road below. Then run Marching Tests until something happens, and on to the end.' },
  combat:     { label: 'Combat',            text: 'A fight has started. Pick a stance, then act when it is your turn.',
                gm: 'Add the foes. Heroes act in stance order, one action each; then every foe attacks.' },
  council:    { label: 'A council',         text: 'The Company is trying to persuade someone. Speak in character — the Loremaster will ask for rolls.',
                gm: 'Say what is at stake. As they speak, ask for Courtesy, Persuade, Insight, Enhearten or Song.' },
  fellowship: { label: 'Fellowship Phase',  text: 'The adventure is over for now. Rest, recover, and spend what you have earned.',
                gm: 'Open the Fellowship Phase below; each player finishes it on their own phone.' }
};

const Table = {
  state: { phase: 'story' },
  party: {},
  calls: {},
  feed: [],
  pool: 0,
  lessons: [],
  meta: {},
  connected: true,
  _connCb: null,
  _refs: [],
  _partyCb: null,
  _callsPrimed: false,
  _answering: null,
  _done: {},
  _ref(path) { return Sync.db.ref('campaigns/' + Sync.currentCampaign() + '/' + path); },
  _on(ref, fn) { ref.on('value', fn, () => {}); this._refs.push(ref); },
  start() {
    if (!tableActive()) return;
    this.stop();
    this._on(this._ref('table'), snap => { const was = this.state.phase; this.state = Object.assign({ phase: 'story' }, snap.val() || {}); if (was !== this.state.phase) tablePhaseChanged(was); if (!tableIsGm() && this.state.phase !== 'story') tableLearn('phase_' + this.state.phase); tableRefresh(); });
    this._on(this._ref('calls').limitToLast(20), snap => {
      const prev = this.calls; this.calls = snap.val() || {};
      if (this._callsPrimed && !tableIsGm()) Object.keys(this.calls).forEach(id => { const c = this.calls[id]; if (!prev[id] && _tblCallForMe(c) && c.kind !== 'foe-attack') _tblAnnounceCall(c); });
      if (!tableIsGm()) _tcRunFoeAttacks();
      this._callsPrimed = true; tableRefresh();
    });
    this._on(this._ref('feed').limitToLast(30), snap => { const v = snap.val() || {}; this.feed = Object.keys(v).map(k => Object.assign({ id: k }, v[k])).sort((a, b) => (a.ts || 0) - (b.ts || 0)); if (tableIsGm()) tableGmProcess(); tableRefresh(); });
    this._on(this._ref('meta'), snap => {
      this.meta = snap.val() || {};
      if (this.meta.name) { try { const c = JSON.parse(localStorage.getItem('tor2e-campaign-v1')) || {}; if (c.name !== this.meta.name) { c.name = this.meta.name; localStorage.setItem('tor2e-campaign-v1', JSON.stringify(c)); } } catch (e) {} }
      tableApplyRole(); tableRefresh();
    });
    // Connection: detached by its own callback, so the presence listener on the same path survives.
    this._connRef = Sync.db.ref('.info/connected');
    this._connCb = snap => { const was = this.connected; this.connected = snap.val() !== false; if (was !== this.connected) tableRefresh(); };
    this._connRef.on('value', this._connCb, () => {});
    this._on(this._ref('pool/fellowship'), snap => { this.pool = parseInt(snap.val()) || 0; tableRefresh(); });
    if (!Sync.isLoremaster()) this._on(this._ref('handouts/' + Sync.uid), snap => { const v = snap.val() || {}; Object.keys(v).forEach(id => tableApplyHandout(id, v[id])); });
    this._partyCb = m => { this.party = m || {}; tableRefresh(); };
    Sync.subscribeParty(this._partyCb);
    tableApplyRole();
    tableRefresh();
  },
  stop() {
    this._refs.forEach(r => { try { r.off(); } catch (e) {} });
    this._refs = [];
    if (this._connRef && this._connCb) { try { this._connRef.off('value', this._connCb); } catch (e) {} }
    this._connRef = null; this._connCb = null; this.connected = true; this.meta = {};
    if (this._partyCb && typeof Sync !== 'undefined') Sync.unsubscribeParty(this._partyCb);
    this._partyCb = null;
    this.state = { phase: 'story' }; this.party = {}; this.calls = {}; this.feed = []; this.pool = 0; this.lessons = []; this._callsPrimed = false; this._answering = null; this._done = {};
    setTimeout(tableApplyRole, 0);   // after the campaign record is cleared
  }
};
const _TS = () => (typeof firebase !== 'undefined' && firebase.database && firebase.database.ServerValue) ? firebase.database.ServerValue.TIMESTAMP : Date.now();
function _tblMyName() { return heroLabel(char); }

// Re-render whatever table surface is on screen.
function tableRefresh() {
  const play = document.getElementById('panel-play');
  if (play && play.classList.contains('active') && typeof renderPlay === 'function') renderPlay();
  const bs = document.getElementById('table-mode-overlay');
  if (bs && bs.classList.contains('show') && typeof renderTableMode === 'function') renderTableMode();
}

/** Who this device is at the table decides the header, the tabs and the menu.
    · Loremaster: the header names the table instead of a hero (a Loremaster plays no hero), and
      the vitals bar goes — it would show some hero's Endurance that nobody is using.
    · Player: the solo Journey and Council tabs go — at a table the Loremaster runs both, and a
      player starting their own journey on their own phone would be a second, wrong journey. */
function tableApplyRole() {
  const at = tableActive(), lm = at && Sync.isLoremaster();
  document.body.classList.toggle('at-table', at);
  document.body.classList.toggle('is-lm', lm);
  const t = document.getElementById('lm-title'); if (t) t.hidden = !lm;
  const tt = document.getElementById('lm-title-text');
  if (tt) tt.textContent = (Table.meta && Table.meta.name) || (typeof campaignInfo === 'function' && campaignInfo().name) || 'Your table';
  let strandedOn = null;
  ['journey', 'council'].forEach(id => {
    const tab = document.querySelector(`.tab[data-tab="${id}"]`); if (!tab) return;
    tab.style.display = (at && !lm) ? 'none' : '';
    if (at && !lm && tab.classList.contains('active')) strandedOn = id;
  });
  const mb = document.getElementById('table-menu-btn');
  if (mb && typeof setMenuLabel === 'function') setMenuLabel(mb, 'Play at a table', at ? (lm ? 'You are Loremaster' : 'Joined') : 'Join or start');
  if (strandedOn && typeof openNavGroup === 'function') openNavGroup('play');
  else if (typeof refreshNav === 'function') refreshNav();
}

function _tblPhase() { return TABLE_PHASES[Table.state.phase] ? Table.state.phase : 'story'; }

/** ▶ Play while in a campaign. The console keeps its form between updates (a live party
    change must not wipe the roll a Loremaster is halfway through choosing); only its live parts
    are redrawn. The player's sheet has nothing typed into it and is redrawn whole. */
function renderTablePlay(host) {
  if (!char.culture && !tableIsGm()) {
    host.innerHTML = '<div class="card play-empty"><div class="eyebrow">At the table</div><h3 class="card-title">First, a hero</h3>' +
      '<p>Your Loremaster may hand you one — open the link they send and it is added here. Or take a ready-made hero, or build your own together.</p>' +
      '<button class="btn btn-block" onclick="openPregens()">Give me a ready-made hero</button>' +
      '<button class="btn btn-secondary btn-block" onclick="document.querySelector(\'.tab[data-tab=build]\').click()">I\'ll make my own</button></div>';
    return;
  }
  const kind = tableIsGm() ? 'gm' : 'pl';
  if (host.dataset.tbl !== kind || !host.querySelector('.tbl-root')) {
    host.innerHTML = kind === 'gm' ? _tblConsoleShell() : '<div class="tbl-root" id="tbl-sheet"></div>';
    host.dataset.tbl = kind;
  }
  if (kind === 'gm') _tblConsoleUpdate();
  else document.getElementById('tbl-sheet').innerHTML = _tblSheetHtml();
}

function _tblConnHtml() {
  return Table.connected ? '' : '<div class="card callout warn tbl-offline" role="status"><strong>Not connected.</strong> Your phone has lost the table. Rolls and changes are kept and reach the table when the connection is back.</div>';
}
function _tblPhaseCard() {
  const ph = TABLE_PHASES[_tblPhase()];
  const note = Table.state.note ? `<p class="tbl-note">“${escapeHtml(Table.state.note)}”</p>` : '';
  return `<div class="card ornate tbl-phase" data-phase="${_tblPhase()}">${typeof phaseArt === 'function' ? phaseArt(_tblPhase()) : ''}<div class="eyebrow">At the table now</div>
    <h3 class="card-title">${escapeHtml(ph.label)}</h3><p>${escapeHtml(ph.text)}</p>${note}</div>`;
}

/* ----- the player's table sheet ----- */
function _tblSheetHtml() {
  const n = v => parseInt(v) || 0;
  const conds = ['weary', 'miserable', 'wounded'].filter(k => char[k]).map(k => `<span class="tbl-chip bad">${k[0].toUpperCase() + k.slice(1)}</span>`).join('');
  const dying = n(char.endCur) <= 0 ? '<span class="tbl-chip bad">Dying</span>' : '';
  const weapons = (char.weapons || []).filter(w => w && w.name).map(w =>
    `<li><strong>${escapeHtml(w.name)}</strong> <small>Damage ${n(w.dmg)} · Injury ${escapeHtml(String(w.inj || '—'))}</small></li>`).join('');
  const solo = isSolo() ? `<div class="card callout info"><strong>This hero is set up for solo play.</strong> At a table the Target Numbers are 20 − Rating, not 18 − Rating.
    <button class="btn btn-block" onclick="openWhereAmI()">Switch to table rules</button></div>` : '';
  return _tblConnHtml() + solo + _tblLessonHtml() + _tblCallsForMeHtml() + _tblPhaseCard() + _tblFpPlayerHtml() + _tblCombatPlayerHtml() + _tblJourneyPlayerHtml() +
    `<div class="card tbl-hero">
       <div class="tbl-hero-head">${typeof cultureCrest === 'function' ? cultureCrest(char.culture, 40, char.name) : ''}
         <div><h3 class="card-title">${escapeHtml(heroLabel(char))}</h3><small>${escapeHtml([char.culture, char.calling].filter(Boolean).join(' · '))}</small></div></div>
       <div class="tbl-vitals">
         <div><span>Endurance</span><strong>${n(char.endCur)}<small>/${n(char.endMax)}</small></strong></div>
         <div><span>Hope</span><strong>${n(char.hopeCur)}<small>/${n(char.hopeMax)}</small></strong></div>
         <div><span>Shadow</span><strong>${n(char.shadow) + n(char.scars)}</strong></div>
         <div><span>Parry</span><strong>${n(char.parry) + n(char.shieldTotal)}</strong></div>
         <div><span>Armour</span><strong>${n(char.armourProt) + n(char.helmProt)}d</strong></div>
       </div>
       ${conds || dying ? `<div class="tbl-chips">${dying}${conds}</div>` : ''}
       ${weapons ? `<ul class="tbl-weapons">${weapons}</ul>` : ''}
       ${_tblPoolPlayerHtml()}
     </div>` +
    _tblRollsHtml() + _tblFeedHtml(6) +
    `<div class="tbl-foot"><button type="button" class="btn btn-quiet" onclick="openCampaign()">Table code &amp; players</button>
     <button type="button" class="btn btn-quiet" onclick="campaignLeave()">Leave the table</button></div>`;
}

/** Every roll a Loremaster may ask for, as big buttons grouped by attribute. A skill at 0 is
    still rollable (the Feat die alone), so all eighteen are here. */
function _tblRollsHtml() {
  // Round 7: the same tile as the Dice tab — attribute glyph, the dice drawn as pips
  const b = (name, sub, fav, attr, n) => `<button type="button" class="tbl-roll${fav ? ' fav' : ''}" onclick="rollFromSheet('${name}')">${attr && typeof ATTR_GLYPH !== 'undefined' ? `<svg class="ic tr-ic" aria-hidden="true"><use href="#${ATTR_GLYPH[attr]}"/></svg>` : ''}<strong>${escapeHtml(name)}${fav ? ' ★' : ''}</strong><small>${n ? `<span class="qs-pips" aria-hidden="true">${'<i></i>'.repeat(Math.min(6, n))}</span>` : ''}${escapeHtml(sub)}</small></button>`;
  const dice = r => r + (r === 1 ? ' die' : ' dice');
  const TN = { str: char.strTN, hrt: char.hrtTN, wit: char.witTN };
  const grp = (title, items) => `<div class="tbl-group"><div class="eyebrow">${title}</div><div class="tbl-rolls">${items}</div></div>`;
  let h = grp('Valour & Wisdom',
    b('Valour', dice(parseInt(char.valour) || 1) + ' · TN ' + (parseInt(TN.hrt) || '—'), char.culture === 'Bardings', 'hrt', parseInt(char.valour) || 1) +
    b('Wisdom', dice(parseInt(char.wisdom) || 1) + ' · TN ' + (parseInt(TN.wit) || '—'), char.culture === 'Hobbits of the Shire', 'wit', parseInt(char.wisdom) || 1));
  // Skills the hero has ranks in (or favours) first; the rest fold away — still one tap to open,
  // and a roll call for one of them brings its own button anyway.
  const zero = [];
  [['str', 'Strength'], ['hrt', 'Heart'], ['wit', 'Wits']].forEach(([a, label]) => {
    const have = SKILLS[a].filter(s => { const v = (char.skills || {})[s] || {}; if ((parseInt(v.rating) || 0) > 0 || v.favoured) return true; zero.push([s, a]); return false; });
    if (have.length) h += grp(`${label} · TN ${parseInt(TN[a]) || '—'}`, have.map(s => { const v = char.skills[s] || {}; return b(s, dice(parseInt(v.rating) || 0), v.favoured, a, parseInt(v.rating) || 0); }).join(''));
  });
  const profs = COMBAT_PROFS.filter(p => (parseInt((char.profs || {})[p]) || 0) > 0);
  if (profs.length) h += grp('Combat', profs.map(p => b(p, dice(parseInt(char.profs[p]) || 0), false, 'str', parseInt(char.profs[p]) || 0)).join(''));
  if (zero.length) h += `<details class="tbl-more"><summary>${zero.length} skills with no ranks <small>— the Feat die alone</small></summary><div class="tbl-rolls">${
    zero.map(([s, a]) => b(s, 'Feat die · TN ' + (parseInt(TN[a]) || '—'), false, a, 0)).join('')}</div></details>`;
  return `<div class="card tbl-rollcard"><h3 class="card-title">Roll when you are asked</h3>${h}</div>`;
}

/* ----- the Loremaster's console ----- */
function _tblMembers() {
  return Object.keys(Table.party || {}).map(uid => Object.assign({ uid }, Table.party[uid]))
    .sort((a, b) => (a.role === 'loremaster') - (b.role === 'loremaster') || String(a.displayName).localeCompare(String(b.displayName)));
}
function _tblPlayers() { return _tblMembers().filter(m => m.role !== 'loremaster'); }
function _tblPlayerName(uid) { const m = (Table.party || {})[uid]; return m ? ((m.vitals && m.vitals.name) || m.displayName || 'Hero') : 'a player'; }
const TABLE_ROLLS = () => ['Valour', 'Wisdom', ...SKILLS.str, ...SKILLS.hrt, ...SKILLS.wit, ...COMBAT_PROFS];
const TABLE_HANDOUTS = [
  ['damage', 'Lose Endurance'], ['heal', 'Recover Endurance'], ['hope', 'Gain Hope'], ['hopeLoss', 'Lose Hope'],
  ['shadow', 'Gain Shadow'], ['fatigue', 'Gain Fatigue'], ['sp', 'Skill points'], ['ap', 'Adventure points'],
  ['treasure', 'Treasure'], ['weary', 'Make Weary'], ['miserable', 'Make Miserable'], ['wounded', 'Wound them (rolls severity)']
];
const TABLE_QUICK_ROLLS = ['Awareness', 'Insight', 'Athletics', 'Stealth', 'Travel', 'Persuade', 'Courtesy', 'Valour', 'Wisdom'];
function _tblConsoleShell() {
  const opt = (v, l) => `<option value="${v}">${escapeHtml(l)}</option>`;
  return `<div class="tbl-root tbl-gm">
   <div class="tbl-gm-main">
    <div id="tbl-invite"></div>
    <div class="card tbl-scene"><h3 class="card-title">What is the table doing?</h3>
      <div class="tbl-phases" id="tbl-phases" role="group" aria-label="Phase">${Object.keys(TABLE_PHASES).map(k => `<button type="button" class="btn btn-secondary" data-phase="${k}" onclick="tableSetPhase('${k}')">${typeof PHASE_GLYPH !== 'undefined' ? `<svg class="ic ph-ic" aria-hidden="true"><use href="#${PHASE_GLYPH[k]}"/></svg>` : ''}<span>${escapeHtml(TABLE_PHASES[k].label)}</span></button>`).join('')}</div>
      <p class="tbl-gm-hint" id="tbl-gm-hint"></p>
      <div class="tbl-say"><label for="tbl-note" class="sr-only">Tell the table</label><input type="text" id="tbl-note" placeholder="Say something to every phone — e.g. Night falls on the road">
        <button type="button" class="btn btn-secondary" onclick="tableSetNote()">Show it on every phone</button></div>
      <p class="tbl-lastnote" id="tbl-lastnote"></p>
    </div>
    <div class="card tbl-fight" id="tbl-fight"><h3 class="card-title">The fight</h3>
      <div class="tbl-row2"><button type="button" class="btn btn-secondary" onclick="openBestiary()">Add a foe</button><button type="button" class="btn btn-secondary" onclick="tableNextRound()">Next round</button></div>
      <div id="tbl-flive"></div>
    </div>
    <div class="card tbl-fp" id="tbl-fp"><h3 class="card-title">The Fellowship Phase</h3>
      <div class="field"><label for="tfp-kind">Kind</label><select id="tfp-kind"><option value="ordinary">An ordinary Fellowship Phase</option><option value="yule">Yule — the year turns</option></select></div>
      <div class="field"><label for="tfp-shadow">Shadow removed</label><select id="tfp-shadow"><option value="0">None — nothing hurt the Enemy</option><option value="1" selected>−1 · they got in the Enemy's way</option><option value="2">−2 · they hindered or harmed the Enemy</option><option value="3">−3 · they drew the Dark Lord's eye</option></select></div>
      <button type="button" class="btn btn-secondary btn-block" onclick="tableOpenFp()">Begin the Fellowship Phase for everyone</button>
      <div id="tbl-fplive"></div>
    </div>
    <div class="card tbl-journey" id="tbl-journey"><h3 class="card-title">The journey</h3>
      <div id="tbl-jsetup">
        <button type="button" class="btn btn-secondary btn-block" onclick="openMapPicker()">Pick the road on the map</button>
        <p class="hint">…or type it:</p>
        <div class="field"><label for="tj-from">From</label><input type="text" id="tj-from" placeholder="e.g. Bree"></div>
        <div class="field"><label for="tj-to">To</label><input type="text" id="tj-to" placeholder="e.g. Rivendell"></div>
        <div class="field"><label for="tj-hexes">Hexes</label><input type="number" id="tj-hexes" value="9" min="1" max="200"></div>
        <div class="field"><label for="tj-season">Season</label><select id="tj-season"><option>Spring</option><option>Summer</option><option>Autumn</option><option>Winter</option></select></div>
        <button type="button" class="btn btn-secondary btn-block" onclick="tableStartJourney()">Set out with the Company</button>
      </div>
      <div id="tbl-jlive"></div>
    </div>
   </div>
   <div class="tbl-gm-side">
    <div class="card tbl-callcard"><h3 class="card-title">Ask for a roll</h3>
      <div class="tbl-chips-row" id="tbl-quick" role="group" aria-label="Common rolls">${TABLE_QUICK_ROLLS.map(r => { const a = r === 'Valour' ? 'hrt' : r === 'Wisdom' ? 'wit' : (typeof attrOfSkill === 'function' ? attrOfSkill(r) : ''); return `<button type="button" class="qchip" data-skill="${r}" onclick="tablePickRoll('${r}')">${a && typeof ATTR_GLYPH !== 'undefined' ? `<svg class="ic qc-ic" aria-hidden="true"><use href="#${ATTR_GLYPH[a]}"/></svg>` : ''}${r}</button>`; }).join('')}</div>
      <div class="field"><label for="tbl-call-skill">Roll</label><select id="tbl-call-skill" onchange="tablePickRoll(this.value, true)">${TABLE_ROLLS().map(r => opt(r, r)).join('')}</select></div>
      <div class="field"><label for="tbl-call-who">Who</label><select id="tbl-call-who">${opt('all', 'Everyone')}</select></div>
      <div class="field"><label for="tbl-call-note">Why</label><input type="text" id="tbl-call-note" placeholder="e.g. the guard is watching the gate"></div>
      <button type="button" class="btn btn-block" onclick="tableCallRoll()">Ask for the roll</button>
      <div id="tbl-calls"></div>
    </div>
    <div class="card"><h3 class="card-title">Your table</h3><div id="tbl-party"></div><div id="tbl-pool"></div></div>
    <div class="card"><h3 class="card-title">Hand out</h3>
      <p class="hint">It lands on their sheet at once, with the rules' limits applied.</p>
      <div class="field"><label for="tbl-ho-who">To</label><select id="tbl-ho-who">${opt('all', 'Everyone')}</select></div>
      <div class="field"><label for="tbl-ho-kind">What</label><select id="tbl-ho-kind" onchange="tableHoKind()">${TABLE_HANDOUTS.map(([k, l]) => opt(k, l)).join('')}</select></div>
      <div class="field" id="tbl-ho-amt-row"><label for="tbl-ho-amt">How much</label><input type="number" id="tbl-ho-amt" value="1" min="1" max="30"></div>
      <div class="field"><label for="tbl-ho-note">Because</label><input type="text" id="tbl-ho-note" placeholder="e.g. the orc's blade"></div>
      <button type="button" class="btn btn-secondary btn-block" onclick="tableHandout()">Hand it out</button>
    </div>
    <div id="tbl-feed-slot"></div>
   </div>
  </div>`;
}
/** Quick chips and the full list pick the same roll; the chip that matches is lit. */
function tablePickRoll(skill, fromSelect) {
  const sel = document.getElementById('tbl-call-skill'); if (!sel) return;
  if (!fromSelect) { sel.value = skill; if (typeof syncPickers === 'function') syncPickers(); }
  document.querySelectorAll('#tbl-quick .qchip').forEach(c => { const on = c.dataset.skill === sel.value; c.classList.toggle('on', on); c.setAttribute('aria-pressed', on ? 'true' : 'false'); });
}
/** Conditions take no amount — hide the box rather than ask for a number that means nothing. */
function tableHoKind() {
  const k = (document.getElementById('tbl-ho-kind') || {}).value;
  const row = document.getElementById('tbl-ho-amt-row'); if (row) row.style.display = ['weary', 'miserable', 'wounded'].includes(k) ? 'none' : '';
}
let _tblInviteOpen = false;
function tableToggleInvite() { _tblInviteOpen = !_tblInviteOpen; _tblConsoleUpdate(); }
function _tblInviteUpdate() {
  const box = document.getElementById('tbl-invite'); if (!box) return;
  const code = (typeof campaignInfo === 'function' && campaignInfo().code) || '';
  const show = _tblInviteOpen || !_tblPlayers().length;
  if (!show) { box.innerHTML = ''; box.dataset.code = ''; return; }
  if (box.dataset.code === code && box.firstChild) return;   // keep the drawn QR
  box.dataset.code = code;
  box.innerHTML = `<div class="card tbl-invite"><div class="eyebrow">Invite the players</div>
    <div class="tbl-invite-row"><div id="tbl-invite-qr" class="camp-qr"></div>
      <div><div class="camp-code-big">${escapeHtml(code)}</div>
      <p class="hint">Each player opens <em>Menu → Play at a table → I play a hero</em> and types this code — or scans the square with their camera.</p></div></div>
    <div class="camp-row"><button type="button" class="btn btn-secondary" onclick="copyJoin('link')">Copy invite link</button>
      <button type="button" class="btn btn-secondary" onclick="openTableMode()">Show on a big screen</button>
      ${_tblPlayers().length ? '<button type="button" class="btn btn-quiet" onclick="tableToggleInvite()">Hide</button>' : ''}</div></div>`;
  if (typeof renderJoinQr === 'function') renderJoinQr(document.getElementById('tbl-invite-qr'), code, 132);
}
function _tblSetOptions(id, opts) {
  const sel = document.getElementById(id); if (!sel) return;
  const keep = sel.value;
  sel.innerHTML = opts.map(([v, l]) => `<option value="${v}">${escapeHtml(l)}</option>`).join('');
  sel.value = opts.some(o => o[0] === keep) ? keep : opts[0][0];
}
function _tblConsoleUpdate() {
  _tblInviteUpdate();
  const hint = document.getElementById('tbl-gm-hint'); if (hint) hint.textContent = TABLE_PHASES[_tblPhase()].gm;
  const ln = document.getElementById('tbl-lastnote'); if (ln) ln.innerHTML = Table.state.note ? `On every phone: <em>“${escapeHtml(Table.state.note)}”</em>` : '';
  tablePickRoll(null, true);
  document.querySelectorAll('#tbl-phases [data-phase]').forEach(b => { const on = b.dataset.phase === _tblPhase(); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
  const who = [['all', 'Everyone'], ..._tblPlayers().map(m => [m.uid, (m.vitals && m.vitals.name) || m.displayName || 'Hero'])];
  _tblSetOptions('tbl-call-who', who); _tblSetOptions('tbl-ho-who', who);
  if (typeof syncPickers === 'function') syncPickers();
  const party = document.getElementById('tbl-party');
  const code = (typeof campaignInfo === 'function' && campaignInfo().code) || '';
  if (party) party.innerHTML = _tblPlayers().map(m => {
    const v = m.vitals || {};
    const chips = [v.dying && 'Dying', v.weary && 'Weary', v.miserable && 'Miserable', v.wounded && 'Wounded'].filter(Boolean).map(t => `<span class="tbl-chip bad">${t}</span>`).join('');
    return `<div class="tbl-prow${m.online === false ? ' off' : ''}"><div class="tbl-prow-head"><span class="dot" aria-hidden="true"></span>${v.culture && typeof cultureCrest === 'function' ? `<span class="tbl-crest" aria-hidden="true">${cultureCrest(v.culture, 22, v.name)}</span>` : ''}<strong>${escapeHtml(v.name || m.displayName || 'Hero')}</strong>${m.online === false ? '<em>away</em>' : ''}
        ${m.characterId && typeof gmPeek === 'function' ? `<button type="button" class="btn btn-quiet" onclick="gmPeek('${m.characterId}')">Sheet</button>` : ''}</div>
      <span>Endurance ${v.endCur ?? '?'}/${v.endMax ?? '?'} · Hope ${v.hopeCur ?? '?'}/${v.hopeMax ?? '?'} · Shadow ${v.shadow ?? 0}</span>${chips ? `<div class="tbl-chips">${chips}</div>` : ''}</div>`;
  }).join('') + `<div class="tbl-codeline">Code <strong>${escapeHtml(code)}</strong> · <button type="button" class="linkish" onclick="tableToggleInvite()">${_tblInviteOpen || !_tblPlayers().length ? 'hide invite' : 'invite more'}</button></div>`;
  const calls = document.getElementById('tbl-calls'); if (calls) calls.innerHTML = _tblOpenCallsGmHtml();
  const fpc = document.getElementById('tbl-fp'); if (fpc) fpc.style.display = _tblPhase() === 'fellowship' ? '' : 'none';
  const fpl = document.getElementById('tbl-fplive'); if (fpl) fpl.innerHTML = _tblFpGmHtml();
  const party2 = document.getElementById('tbl-pool'); if (party2) party2.innerHTML = _tblPoolGmHtml();
  const fc = document.getElementById('tbl-fight'); if (fc) fc.style.display = (_tblPhase() === 'combat' || enc().active) ? '' : 'none';
  const fl = document.getElementById('tbl-flive'); if (fl) fl.innerHTML = _tblCombatGmHtml();
  const tj = _tj();
  const jc = document.getElementById('tbl-journey'); if (jc) jc.style.display = (_tblPhase() === 'journey' || tj.active) ? '' : 'none';
  const js = document.getElementById('tbl-jsetup'); if (js) js.style.display = tj.active ? 'none' : '';
  const jl = document.getElementById('tbl-jlive'); if (jl) jl.innerHTML = tj.active ? _tblJourneyGmHtml(tj) : '';
  const feed = document.getElementById('tbl-feed-slot'); if (feed) feed.innerHTML = _tblFeedHtml(15);
}

/* ----- phases ----- */
function tableSetPhase(phase) {
  if (!tableIsGm() || !TABLE_PHASES[phase]) return;
  Table.state.phase = phase; tableRefresh();
  return Table._ref('table').update({ phase, since: _TS() }).catch(e => alertStyled('Could not change the phase: ' + (e && e.message)));
}
function tableSetNote() {
  if (!tableIsGm()) return;
  const el = document.getElementById('tbl-note'); const note = String(el ? el.value : '').trim().slice(0, 200);
  Table.state.note = note; tableRefresh();
  if (el) el.value = '';
  // The note is also a broadcast, so every phone gets a toast and it stays in the table's feed.
  if (note && typeof Sync !== 'undefined' && Sync.sendBroadcast) Sync.sendBroadcast(note).catch(() => {});
  return Table._ref('table').update({ note }).then(() => showToast(note ? 'On every phone now.' : 'Note cleared.'));
}
function tablePhaseChanged(was) {
  if (tableIsGm() || !was) return;
  const ph = TABLE_PHASES[_tblPhase()];
  showToast('The Loremaster: ' + ph.label);
  if (navigator.vibrate) try { navigator.vibrate(60); } catch (e) {}
}

/* ----- roll calls ----- */
function _tblCallForMe(c) { return !!c && !c.closed && (c.who === 'all' || c.who === Sync.uid); }
function _tblAnsweredBy(callId, uid) { return Table.feed.some(f => f.callId === callId && f.uid === uid); }
function _tblMyOpenCalls() {
  return Object.keys(Table.calls).map(id => Object.assign({ id }, Table.calls[id]))
    .filter(c => _tblCallForMe(c) && c.kind !== 'foe-attack' && !_tblAnsweredBy(c.id, Sync.uid)).sort((a, b) => (a.ts || 0) - (b.ts || 0));
}
function _tblAnnounceCall(c) {
  tableLearn('call');
  showToast('The Loremaster asks you to roll ' + c.skill + (c.note ? ' — ' + c.note : ''));
  if (navigator.vibrate) try { navigator.vibrate([80, 60, 80]); } catch (e) {}
}
function _tblCallsForMeHtml() {
  return _tblMyOpenCalls().map(c => `<div class="card tbl-call"><div class="eyebrow">The Loremaster asks</div>
    ${c.note ? `<p>${escapeHtml(c.note)}</p>` : ''}
    <button type="button" class="btn btn-block tbl-call-btn" onclick="tableAnswerCall('${c.id}')">Roll ${escapeHtml(c.skill)}</button></div>`).join('');
}
function tableAnswerCall(id) {
  const c = Table.calls[id]; if (!c) return;
  Table._answering = id;
  rollFromSheet(c.skill);
  Table._answering = null;
}
function tableCallRoll() {
  if (!tableIsGm()) return;
  const skill = document.getElementById('tbl-call-skill').value;
  const who = document.getElementById('tbl-call-who').value || 'all';
  const noteEl = document.getElementById('tbl-call-note');
  const note = String(noteEl.value || '').trim().slice(0, 160);
  return Table._ref('calls').push({ skill, who, note, ts: _TS(), from: _tblMyName() }).then(() => {
    noteEl.value = '';
    showToast(`Asked ${who === 'all' ? 'everyone' : _tblPlayerName(who)} to roll ${skill}.`);
  });
}
function tableCloseCall(id) { if (tableIsGm()) return Table._ref('calls/' + id).update({ closed: true }); }
function _tblOpenCallsGmHtml() {
  const open = Object.keys(Table.calls).map(id => Object.assign({ id }, Table.calls[id])).filter(c => !c.closed);
  if (!open.length) return '';
  return '<div class="tbl-calls">' + open.map(c => {
    const targets = c.who === 'all' ? _tblPlayers().map(m => m.uid) : [c.who];
    const answers = Table.feed.filter(f => f.callId === c.id);
    const waiting = targets.filter(u => !answers.some(a => a.uid === u)).map(_tblPlayerName);
    return `<div class="tbl-callrow"><strong>${escapeHtml(c.skill)}</strong> · ${escapeHtml(c.who === 'all' ? 'everyone' : _tblPlayerName(c.who))}
      ${answers.map(a => `<div class="tbl-ans ${/SUCCESS/.test(a.outcome || '') ? 'ok' : 'no'}">${escapeHtml(a.name)}: ${escapeHtml(a.result || a.outcome || '')}</div>`).join('')}
      ${waiting.length ? `<div class="hint">Waiting for ${escapeHtml(waiting.join(', '))}</div>` : ''}
      <button type="button" class="btn btn-quiet" onclick="tableCloseCall('${c.id}')">Done with this roll</button></div>`;
  }).join('') + '</div>';
}

/* ----- the shared feed (every roll made at the table) ----- */
/** Called from rollDice() for every roll. An open call for this skill is answered by it, whether
    the player tapped the call's own button or the skill on their sheet. */
function tablePostRoll(r) {
  if (!tableActive()) return;
  const skill = String(r.skill || '').trim();
  let callId = Table._answering;
  if (!callId && skill) { const c = _tblMyOpenCalls().find(x => x.skill === skill); if (c) callId = c.id; }
  const result = `${r.total} vs ${r.tn} → ${r.outcome}${r.icons ? ' (' + r.icons + '✦)' : ''}`;
  const entry = { uid: Sync.uid, name: _tblMyName(), text: `${r.label} — ${result}`, skill, result, outcome: String(r.outcome || ''), icons: parseInt(r.icons) || 0, ts: _TS() };
  if (callId) entry.callId = callId;
  const call = callId && Table.calls[callId];
  if (call && call.kind === 'arrive') _tblArrivalFatigue(call, /SUCCESS/.test(entry.outcome), entry.icons);
  return Table._ref('feed').push(entry).catch(() => {});
}
function tablePostLine(text) {
  if (!tableActive()) return;
  const entry = { uid: Sync.uid, name: _tblMyName(), text: String(text).slice(0, 300), ts: _TS() };
  if (Table._answering) entry.callId = Table._answering;
  return Table._ref('feed').push(entry).catch(() => {});
}
function _tblFeedHtml(n) {
  const rows = Table.feed.slice(-n).reverse();
  if (!rows.length) return '';
  return `<div class="card tbl-feed"><h3 class="card-title">At the table</h3>${rows.map(f =>
    `<div class="tbl-frow${f.uid === Sync.uid ? ' me' : ''}"><strong>${escapeHtml(f.name || 'Hero')}</strong> <span>${escapeHtml(f.text || '')}</span></div>`).join('')}</div>`;
}

/* ----- hand-outs: the Loremaster sends, the hero's own phone applies ----- */
function tableHandout() {
  if (!tableIsGm()) return;
  const who = document.getElementById('tbl-ho-who').value || 'all';
  const kind = document.getElementById('tbl-ho-kind').value;
  const amount = Math.max(1, Math.min(30, parseInt(document.getElementById('tbl-ho-amt').value) || 1));
  const noteEl = document.getElementById('tbl-ho-note');
  const note = String(noteEl.value || '').trim().slice(0, 120);
  return tableSendHandout(who, { kind, amount, note }).then(n => {
    noteEl.value = '';
    const label = (TABLE_HANDOUTS.find(h => h[0] === kind) || [0, kind])[1];
    showToast(`${label}${['weary', 'miserable', 'wounded'].includes(kind) ? '' : ' ' + amount} → ${who === 'all' ? 'everyone (' + n + ')' : _tblPlayerName(who)}`);
  });
}
function tableSendHandout(who, h) {
  const uids = who === 'all' ? _tblPlayers().map(m => m.uid) : [who];
  const payload = Object.assign({ ts: _TS(), from: _tblMyName() }, h);
  return Promise.all(uids.map(u => Table._ref('handouts/' + u).push(payload))).then(() => uids.length);
}
const HANDOUT_DONE_KEY = 'tor2e-handouts-done';
function _tblDone() { try { return JSON.parse(localStorage.getItem(HANDOUT_DONE_KEY)) || []; } catch (e) { return []; } }
/** Apply a hand-out once (ids are remembered, so a failed remove can never apply it twice), then
    delete it. Everything goes through the normal paths — adj() keeps its caps, Bout and Eye
    triggers; a Wound rolls its severity. */
async function tableApplyHandout(id, h) {
  const ref = Table._ref('handouts/' + Sync.uid + '/' + id);
  const done = _tblDone();
  if (done.includes(id)) { ref.remove().catch(() => {}); return; }
  try { localStorage.setItem(HANDOUT_DONE_KEY, JSON.stringify(done.concat(id).slice(-200))); } catch (e) {}
  const n = Math.max(0, parseInt(h.amount) || 0);
  const why = h.note ? ' — ' + h.note : '';
  let msg = '';
  switch (h.kind) {
    case 'damage':   adj('endCur', -n); msg = `−${n} Endurance (now ${char.endCur})`; break;
    case 'heal':     adj('endCur', n); msg = `+${n} Endurance (now ${char.endCur})`; break;
    case 'hope':     adj('hopeCur', n); msg = `+${n} Hope (now ${char.hopeCur})`; break;
    case 'hopeLoss': adj('hopeCur', -n); msg = `−${n} Hope (now ${char.hopeCur})`; break;
    case 'shadow':   adj('shadow', n); msg = `+${n} Shadow`; break;
    case 'fatigue':  adj('fatigue', n); msg = `+${n} Fatigue`; break;
    case 'sp':       adj('skillPts', n); msg = `+${n} Skill points`; break;
    case 'ap':       adj('advPts', n); msg = `+${n} Adventure points`; break;
    case 'treasure': adj('treasure', n); msg = `+${n} Treasure`; break;
    case 'weary': case 'miserable':
      char[h.kind] = true; saveCharacter(); render(); msg = `You are ${h.kind[0].toUpperCase() + h.kind.slice(1)}`; break;
    case 'wounded':
      if (!char.wounded) { await _applyWoundFromFail(); msg = 'You are Wounded'; } else msg = 'Wounded again — tell the Loremaster (a second Wound can mean Dying)';
      break;
    default: msg = String(h.kind);
  }
  showToast(`${h.from || 'The Loremaster'}: ${msg}${why}`);
  if (['shadow', 'wounded', 'fatigue', 'damage'].includes(h.kind)) tableLearn(h.kind);
  if (typeof logTimeline === 'function' && ['shadow', 'sp', 'ap', 'treasure', 'wounded'].includes(h.kind)) logTimeline('table', `From the Loremaster: ${msg}${why}`);
  ref.remove().catch(() => {});
}

/* ----- where am I playing? ----- */
function whereLabel() { return char.moriaMode ? 'Moria, on my own' : char.striderMode ? 'On my own' : 'At a table'; }
function refreshWhereLabel() { const b = document.getElementById('where-btn'); if (b) setMenuLabel(b, 'Where am I playing?', whereLabel()); }
/** One hero, two ways to play. Only the rules for the way of playing change; everything the
    hero has earned comes along (setStriderMode undoes exactly what it added). */
async function openWhereAmI() {
  const mo = document.getElementById('menu-overlay'); if (mo) mo.classList.remove('show');
  const cur = char.moriaMode ? 'moria' : char.striderMode ? 'strider' : 'table';
  const v = await showModal({
    title: 'Where am I playing?',
    message: `<p>Now: <strong>${escapeHtml(whereLabel())}</strong>.</p><p>Switching changes only the rules for that way of playing — Target Numbers (20 − Rating at a table, 18 − Rating on your own), the Strider feature, the Eye of Mordor and the Oracle. Everything <strong>${escapeHtml(heroLabel(char))}</strong> has earned comes along both ways.</p>`,
    buttons: [
      { label: 'At a table, with a Loremaster', value: 'table' },
      { label: 'On my own (Strider Mode)', value: 'strider', secondary: true },
      { label: 'Cancel', value: null, cancel: true }
    ]
  });
  if (!v || v === cur) return;
  if (v === 'table') {
    if (char.moriaMode) { await toggleMoriaMode(); if (char.moriaMode) return; }
    setStriderMode(false);
    showToast('Table rules: Target Numbers are 20 − Rating.');
  } else {
    if (tableActive() && !Sync.isLoremaster() && !await confirmStyled('You are in a campaign. Solo rules change your Target Numbers at the table too, until you switch back.', 'Play on your own?', { yes: 'Switch to solo rules', no: 'Stay at the table' })) return;
    setStriderMode(true);
    showToast('Solo rules: Target Numbers are 18 − Rating.');
  }
  refreshWhereLabel();
}
/** After joining a table as a player: a hero set up for solo play is offered table rules. */
async function offerTableRules() {
  if (!tableActive() || Sync.isLoremaster() || !isSolo() || !char.culture) return;
  if (await confirmStyled(`<strong>${escapeHtml(heroLabel(char))}</strong> is set up for solo play. At a table the Loremaster tells the story, and Target Numbers are 20 − Rating. Switch to table rules? Everything the hero has earned stays.`, 'Playing at a table', { yes: 'Use table rules', no: 'Keep solo rules' })) {
    if (char.moriaMode) await toggleMoriaMode();
    setStriderMode(false);
    refreshWhereLabel();
  }
}

/* ----- the table journey (the Loremaster's phone runs it; everyone sees it) -----
   table/journey holds one shared journey. The arithmetic is the hero's own journey's, shared:
   marchAdvance() for the Marching Test, journeyEventFor() for the event, journeyRegionNow() for
   the land of the hex. Rolls are calls to the player holding the role; the Loremaster's phone
   reads the answers from the feed (tableGmProcess) and applies the result — to the journey, or
   as hand-outs to the heroes. Arrival is each hero's own Travel roll, applied on their phone. */
const JOURNEY_ROLES = [['guide', 'Guide', 'Travel'], ['hunter', 'Hunter', 'Hunting'], ['lookout', 'Look-out', 'Awareness'], ['scout', 'Scout', 'Explore']];
function _tj() {
  const j = Object.assign({ active: false }, Table.state.journey || {});
  ['route', 'events'].forEach(k => { if (j[k] && !Array.isArray(j[k])) j[k] = Object.values(j[k]); });
  if (j.routeLands && typeof j.routeLands !== 'string') j.routeLands = Object.values(j.routeLands).join('');
  j.events = j.events || [];
  ['currentHex', 'totalHexes', 'hardTerrainHexes', 'daysElapsed', 'travelFatigue'].forEach(k => { j[k] = parseInt(j[k]) || 0; });
  if (j.nextEventHex === undefined) j.nextEventHex = null;
  return j;
}
function _tjSave(j) { Table.state.journey = j; tableRefresh(); return Table._ref('table/journey').set(j); }
function _tjLog(j, text) { j.events.push({ day: j.daysElapsed, hex: j.currentHex, text }); if (j.events.length > 20) j.events = j.events.slice(-20); }
function _tblRoleHolders(role) { return _tblPlayers().filter(m => m.jroles && m.jroles[role]); }
function _tjEventDue(j) { return j.nextEventHex !== null && j.currentHex >= j.nextEventHex; }

/** After "Use this route" on the map, copy the route into the console's journey form. */
function tableJourneyFromMap() {
  if (!tableIsGm()) return;
  const v = id => (document.getElementById(id) || {}).value || '';
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
  set('tj-from', v('j-origin')); set('tj-to', v('j-destination')); set('tj-hexes', v('j-totalHexes'));
}
function tableStartJourney() {
  if (!tableIsGm()) return;
  const v = id => String((document.getElementById(id) || {}).value || '').trim();
  const hexes = parseInt(v('tj-hexes')) || 0;
  if (hexes <= 0) return alertStyled('How far is it? Enter the number of hexes, or pick the road on the map.', 'The journey');
  const routed = typeof takePendingRoute === 'function' ? takePendingRoute(hexes) : {};
  const j = Object.assign({
    active: true, origin: v('tj-from'), destination: v('tj-to'), totalHexes: hexes,
    hardTerrainHexes: routed.route ? (parseInt(v('j-hardTerrainHexes')) || 0) : 0,
    currentHex: 0, daysElapsed: 0, travelFatigue: 0, nextEventHex: null, events: [],
    season: v('tj-season') || 'Spring', region: v('j-region') || 'Wild'
  }, routed);
  _tjLog(j, `The Company sets out${j.origin ? ' from ' + j.origin : ''}${j.destination ? ' for ' + j.destination : ''} — ${hexes} hexes.`);
  Table.state.phase = 'journey';
  return Promise.all([_tjSave(j), Table._ref('table').update({ phase: 'journey', since: _TS() })]);
}
function tableMarch() {
  const j = _tj(); if (!tableIsGm() || !j.active || j.pending || _tjEventDue(j) || j.currentHex >= j.totalHexes) return;
  const guides = _tblRoleHolders('guide');
  const who = guides.length ? guides[0].uid : 'all';
  const note = guides.length ? 'Marching Test — the Guide leads the way' : 'Marching Test — nobody is the Guide, so the first Travel roll counts';
  const ref = Table._ref('calls').push();   // the key first, so the journey can wait on this call
  j.pending = { type: 'march', callId: ref.key };
  return Promise.all([ref.set({ skill: 'Travel', who, note, kind: 'march', ts: _TS(), from: _tblMyName() }), _tjSave(j)]);
}
function tableJourneyEvent() {
  const j = _tj(); if (!tableIsGm() || !j.active || j.pending || !_tjEventDue(j)) return;
  const t = Math.floor(Math.random() * 6) + 1;
  const [role, roleLabel, skill] = t <= 2 ? JOURNEY_ROLES[3] : t <= 4 ? JOURNEY_ROLES[2] : JOURNEY_ROLES[1];
  const land = typeof journeyRegionNow === 'function' ? journeyRegionNow(j, j.currentHex) : j.region;
  const fav = (land === 'Free' || land === 'Border') ? 'fav' : (land === 'Shadow' || land === 'Dark') ? 'ill' : 'normal';
  _suspendInlineEye(true); const r = _doInlineRoll(0, fav, null); _suspendInlineEye(false);
  const ev = journeyEventFor(r, false);
  j.travelFatigue += ev.fatigue;
  j.nextEventHex = null;
  const holders = _tblRoleHolders(role);
  const who = holders.length ? holders[0].uid : 'all';
  const plain = String(ev.effect || '').replace(/<[^>]+>/g, '');
  _tjLog(j, `${ev.name} (${land} land) — the ${roleLabel} rolls ${skill}. +${ev.fatigue} Travel Fatigue. ${plain}`);
  const note = `${ev.name}: the ${roleLabel} rolls ${skill}${j.hardTerrainHexes ? ' (hard ground: roll one die fewer)' : ''}. ${plain}`;
  const ref = Table._ref('calls').push();
  j.pending = { type: 'event', callId: ref.key, eventKey: ev.key, eventName: ev.name };
  return Promise.all([ref.set({ skill, who, note, kind: 'event', eventKey: ev.key, ts: _TS(), from: _tblMyName() }), _tjSave(j)]);
}
/** Read the answers the Loremaster is waiting for and apply them, once. */
function tableGmProcess() {
  Object.keys(Table.calls).forEach(id => { const c = Table.calls[id]; if (c.kind === 'foe-attack' && !c.closed && !Table._done[id] && Table.feed.some(f => f.callId === id)) { Table._done[id] = true; tableCloseCall(id); } });
  const j = _tj(); const p = j.pending; if (!j.active || !p || Table._done[p.callId]) return;
  const ans = Table.feed.find(f => f.callId === p.callId); if (!ans) return;
  Table._done[p.callId] = true;
  const ok = /SUCCESS/.test(ans.outcome || '');
  const icons = parseInt(ans.icons) || 0;
  if (p.type === 'march') {
    const m = marchAdvance(j, ok, icons);
    _tjLog(j, `Marching Test by ${ans.name}: ${ok ? 'success' : 'failure'} — ${m.hexes} hex${m.hexes === 1 ? '' : 'es'} in ${m.days} day${m.days === 1 ? '' : 's'}.`);
  } else if (p.type === 'event') {
    const out = _tjEventOutcome(j, p.eventKey, ok, ans.uid);
    _tjLog(j, `${ans.name} rolled for ${p.eventName}: ${ok ? 'success' : 'failure'}${out ? ' — ' + out : ''}.`);
  }
  delete j.pending;
  tableCloseCall(p.callId);
  return _tjSave(j);
}
/** What an event roll does, at a table: the journey's days on the Loremaster's phone, and each
    hero's cost as a hand-out to that hero (the same path every hand-out takes). */
function _tjEventOutcome(j, key, ok, uid) {
  const all = 'all', one = uid;
  switch (key) {
    case 'shortcut': if (ok) { j.daysElapsed = Math.max(0, j.daysElapsed - 1); return '−1 day'; } return '';
    case 'joyful': if (ok) { tableSendHandout(all, { kind: 'hope', amount: 1, note: 'Joyful Sight' }); return 'every hero +1 Hope'; } return '';
    case 'mishap': if (!ok) { j.daysElapsed += 1; tableSendHandout(one, { kind: 'fatigue', amount: 1, note: 'Mishap' }); return '+1 day, +1 Fatigue for the roller'; } return '';
    case 'ill': if (!ok) { tableSendHandout(one, { kind: 'shadow', amount: 1, note: 'Ill Choices' }); return '+1 Shadow for the roller'; } return '';
    case 'despair': if (!ok) { tableSendHandout(all, { kind: 'shadow', amount: 1, note: 'Despair' }); return 'every hero +1 Shadow'; } return '';
    case 'terrible': if (!ok) { tableSendHandout(one, { kind: 'wounded', amount: 1, note: 'Terrible Misfortune' }); return 'the roller is Wounded'; } return '';
    default: return '';
  }
}
function tableCancelPending() {
  const j = _tj(); if (!tableIsGm() || !j.pending) return;
  tableCloseCall(j.pending.callId); delete j.pending; return _tjSave(j);
}
/** Arrival: every hero rolls Travel; a success sheds 1 + ✦ of the journey's Travel Fatigue, and
    what lingers lands on their own Fatigue (applied on their phone as they roll). */
function tableArrive() {
  const j = _tj(); if (!tableIsGm() || !j.active) return;
  const f = j.travelFatigue;
  return Table._ref('calls').push({ skill: 'Travel', who: 'all', kind: 'arrive', fatigue: f, note: `You have arrived${j.destination ? ' at ' + j.destination : ''}. The road cost ${f} Travel Fatigue; a success sheds 1 + ✦ of it.`, ts: _TS(), from: _tblMyName() }).then(() => {
    j.active = false; delete j.pending;
    _tjLog(j, `Arrived${j.destination ? ' at ' + j.destination : ''} after ${j.daysElapsed} days.`);
    return _tjSave(j);
  });
}
function _tblArrivalFatigue(call, ok, icons) {
  const f = Math.max(0, parseInt(call.fatigue) || 0);
  const keep = ok ? Math.max(0, f - 1 - (parseInt(icons) || 0)) : f;
  if (keep > 0) adj('fatigue', keep);
  showToast(`Arrival: ${keep} of the road's ${f} Travel Fatigue stays with you (Fatigue ${char.fatigue}).`);
}
async function tableAbandonJourney() {
  if (!tableIsGm()) return;
  if (!await confirmStyled('Abandon this journey for the whole table?', 'The journey', { yes: 'Abandon journey', no: 'Keep travelling' })) return;
  const j = _tj(); if (j.pending) tableCloseCall(j.pending.callId);
  return _tjSave({ active: false });
}
function _tjProgressHtml(j) {
  const map = (Array.isArray(j.route) && typeof liveRouteMap === 'function') ? liveRouteMap(j) : '';
  const pct = j.totalHexes ? Math.round(100 * j.currentHex / j.totalHexes) : 0;
  return `<div class="tbl-jhead"><strong>${escapeHtml(j.origin || 'Setting out')} → ${escapeHtml(j.destination || 'the journey’s end')}</strong>
    <span>Day ${j.daysElapsed} · ${j.currentHex} of ${j.totalHexes} hexes · Travel Fatigue ${j.travelFatigue}</span></div>
    ${map || `<div class="tbl-jbar" role="img" aria-label="${pct}% of the way"><i style="width:${pct}%"></i></div>`}`;
}
function _tjLogHtml(j, n) { return j.events.length ? `<ul class="tbl-jlog">${j.events.slice(-n).reverse().map(e => `<li>Day ${e.day}: ${escapeHtml(e.text)}</li>`).join('')}</ul>` : ''; }
function _tblJourneyGmHtml(j) {
  const roles = JOURNEY_ROLES.map(([k, l]) => { const h = _tblRoleHolders(k).map(m => (m.vitals && m.vitals.name) || m.displayName); return `<div><span>${l}</span> ${h.length ? escapeHtml(h.join(', ')) : '<em>nobody</em>'}</div>`; }).join('');
  let act;
  if (j.pending) act = `<p class="hint">Waiting for the ${j.pending.type === 'march' ? 'Marching Test' : escapeHtml(j.pending.eventName || 'event') + ' roll'}…</p><button type="button" class="btn btn-quiet btn-block" onclick="tableCancelPending()">Cancel this roll</button>`;
  else if (_tjEventDue(j)) act = `<button type="button" class="btn btn-block" onclick="tableJourneyEvent()">Something happens on the road</button>`;
  else if (j.currentHex >= j.totalHexes) act = `<button type="button" class="btn btn-block" onclick="tableArrive()">We have arrived</button>`;
  else act = `<button type="button" class="btn btn-block" onclick="tableMarch()">Marching Test</button>`;
  return _tjProgressHtml(j) + `<div class="tbl-roles">${roles}</div>` + act + _tjLogHtml(j, 6) +
    `<button type="button" class="btn btn-quiet btn-block" onclick="tableAbandonJourney()">Abandon the journey</button>`;
}
function _tblJourneyPlayerHtml() {
  const j = _tj(); if (_tblPhase() !== 'journey' && !j.active) return '';
  const me = (Table.party || {})[Sync.uid] || {};
  const mine = me.jroles || {};
  const chips = JOURNEY_ROLES.map(([k, l, sk]) => `<button type="button" class="tbl-role${mine[k] ? ' on' : ''}" aria-pressed="${!!mine[k]}" onclick="tableToggleRole('${k}')"><strong>${l}</strong><small>rolls ${sk}</small></button>`).join('');
  return `<div class="card tbl-journey"><h3 class="card-title">The journey</h3>
    ${j.active ? _tjProgressHtml(j) : '<p class="hint">The Loremaster is planning the road.</p>'}
    <div class="eyebrow">Your role on the road</div><div class="tbl-roles-pick">${chips}</div>
    ${_tjLogHtml(j, 4)}</div>`;
}
function tableToggleRole(role) {
  if (!tableActive()) return;
  const me = (Table.party || {})[Sync.uid] || {};
  const roles = Object.assign({}, me.jroles || {});
  if (roles[role]) delete roles[role]; else roles[role] = true;
  me.jroles = roles; tableRefresh();
  return Table._ref('members/' + Sync.uid + '/jroles').set(Object.keys(roles).length ? roles : null);
}

/* ----- combat rounds -----
   The shared Encounter (P5) holds the foes and the round. Turn order is derived, never stored:
   heroes by stance (Forward, Open, Defensive, Rearward, then anyone without one), each acting
   once per round (members/{uid}/turnDone = the round they finished; the Loremaster can skip a
   hero, table/combat/skip/{uid}). When every hero has acted, the foes attack: each attack is a
   call of kind 'foe-attack' that the target's own phone runs through foeAttackHero(), so
   Parry, stance, armour, Piercing Blows and Wounds all come from the hero's own sheet. */
const TC_STANCES = [['forward', 'Forward', 'hit harder, get hit more'], ['open', 'Open', 'balanced'], ['defensive', 'Defensive', 'harder to hit you'], ['rearward', 'Rearward', 'bows only, from behind']];
function _tcRound() { return parseInt(enc().round) || 1; }
function _tcStanceOf(m) { return ((m.vitals || {}).stance) || ''; }
function _tcActed(m, round) {
  const skip = ((Table.state.combat || {}).skip || {})[m.uid];
  return (parseInt(m.turnDone) || 0) >= round || (parseInt(skip) || 0) >= round;
}
function tableTurnOrder() {
  const rank = st => { const i = TC_STANCES.findIndex(x => x[0] === st); return i < 0 ? 9 : i; };
  return _tblPlayers().filter(m => !((m.vitals || {}).dying)).sort((a, b) => rank(_tcStanceOf(a)) - rank(_tcStanceOf(b)) || String((a.vitals || {}).name).localeCompare(String((b.vitals || {}).name)));
}
/** Whose turn it is: a hero, or null when every hero has acted (the foes' turn). */
function tableTurnNow() { const r = _tcRound(); return tableTurnOrder().find(m => !_tcActed(m, r)) || null; }
function _tcFoes() { return (enc().foes || []).filter(f => !f.slain); }

function tableSetStance(st) {
  char.stance = st; saveCharacter();
  if (typeof renderStance === 'function') renderStance();
  const me = (Table.party || {})[Sync.uid]; if (me) { me.vitals = Object.assign({}, me.vitals, { stance: st }); }
  tableRefresh();
  if (tableActive()) return Table._ref('members/' + Sync.uid + '/vitals/stance').set(st).catch(() => {});
}
function tableEndTurn() {
  if (!tableActive()) return;
  const r = _tcRound();
  const me = (Table.party || {})[Sync.uid]; if (me) me.turnDone = r;
  tableRefresh();
  return Table._ref('members/' + Sync.uid + '/turnDone').set(r).catch(() => {});
}
/** One action a round: an attack ends your turn. */
async function tableAttack(foeId) {
  await heroAttackFoe(foeId);
  return tableEndTurn();
}
function tableSkipTurn(uid) {
  if (!tableIsGm()) return;
  const c = Table.state.combat || {}; c.skip = Object.assign({}, c.skip, { [uid]: _tcRound() });
  Table.state.combat = c; tableRefresh();
  return Table._ref('table/combat/skip/' + uid).set(_tcRound());
}
function tableNextRound() { if (tableIsGm()) return nextRound(); }
const _tcTarget = {};
function tableFoeAttack(foeId) {
  if (!tableIsGm()) return;
  const f = getFoe(foeId); if (!f) return;
  const order = tableTurnOrder();
  const who = _tcTarget[foeId] || (order[0] && order[0].uid);
  if (!who) return alertStyled('There is no hero for it to attack.', 'The fight');
  return Table._ref('calls').push({ skill: f.name, who, kind: 'foe-attack', foeId, attackIdx: 0, note: `${f.name} attacks`, ts: _TS(), from: _tblMyName() })
    .then(() => showToast(`${f.name} attacks ${_tblPlayerName(who)}.`));
}
/** A foe's attack aimed at this phone's hero: run it here, once. */
async function _tcRunFoeAttacks() {
  const done = _tblDone();
  const mine = Object.keys(Table.calls).filter(id => { const c = Table.calls[id]; return c.kind === 'foe-attack' && _tblCallForMe(c) && !done.includes(id); });
  for (const id of mine) {
    if (_tblDone().includes(id)) continue;
    try { localStorage.setItem(HANDOUT_DONE_KEY, JSON.stringify(_tblDone().concat(id).slice(-200))); } catch (e) {}
    const c = Table.calls[id];
    showToast(`${c.skill} attacks you!`);
    Table._answering = id;
    try { await foeAttackHero(c.foeId, parseInt(c.attackIdx) || 0); }
    finally { Table._answering = null; }
    if (!Table.feed.some(f => f.callId === id)) { Table._answering = id; tablePostLine(`${c.skill}'s attack is done.`); Table._answering = null; }
  }
}
function _tcFoesHtml() {
  const foes = enc().foes || [];
  if (!foes.length) return emptyState('No foes yet.', 'skull', { label: 'Add a foe', fn: 'openBestiary()' });
  return '<ul class="tbl-foes">' + foes.map(f => `<li class="${f.slain ? 'slain' : ''}">${typeof foeSilhouette === 'function' ? `<span class="foe-medal" aria-hidden="true">${foeSilhouette(f, 'foe-medal-sil')}</span>` : ''}<strong>${escapeHtml(f.name)}</strong> <span>End ${parseInt(f.endCur) || 0}/${parseInt(f.endMax) || 0}${f.wounded ? ' · Wounded' : ''}${f.slain ? ' · Slain' : ''}</span>${typeof notchBar === 'function' ? notchBar(f.endCur, f.endMax, 'nb-end', 'Endurance') : ''}</li>`).join('') + '</ul>';
}
function _tcOrderHtml(gm) {
  const r = _tcRound(), now = tableTurnNow();
  const rows = tableTurnOrder().map((m, i) => {
    const st = (TC_STANCES.find(x => x[0] === _tcStanceOf(m)) || [0, 'no stance'])[1];
    const acted = _tcActed(m, r), cur = now && now.uid === m.uid;
    return `<li class="${acted ? 'done' : ''}${cur ? ' now' : ''}"><span>${i + 1}.</span> <strong>${escapeHtml((m.vitals || {}).name || m.displayName || 'Hero')}</strong> <small>${escapeHtml(st)}</small>
      ${acted ? '<em>done</em>' : cur ? '<em>acting now</em>' : ''}${gm && !acted ? ` <button type="button" class="btn btn-quiet" onclick="tableSkipTurn('${m.uid}')">Skip</button>` : ''}</li>`;
  }).join('');
  return `<ol class="tbl-order">${rows || '<li>No heroes yet.</li>'}</ol>`;
}
function _tblCombatGmHtml() {
  const r = _tcRound(), now = tableTurnNow();
  const players = tableTurnOrder();
  const foes = _tcFoes().map(f => {
    const opts = players.map(m => `<option value="${m.uid}"${(_tcTarget[f.id] || (players[0] && players[0].uid)) === m.uid ? ' selected' : ''}>${escapeHtml(typeof shortHeroName === 'function' ? shortHeroName((m.vitals || {}).name || 'Hero') : ((m.vitals || {}).name || 'Hero'))}</option>`).join('');
    return `<div class="tbl-foerow"><div class="tf-head">${typeof foeSilhouette === 'function' ? `<span class="foe-medal" aria-hidden="true">${foeSilhouette(f, 'foe-medal-sil')}</span>` : ''}<strong>${escapeHtml(f.name)}</strong> <span>End ${parseInt(f.endCur) || 0}/${parseInt(f.endMax) || 0}</span>${typeof notchBar === 'function' ? notchBar(f.endCur, f.endMax, 'nb-end', 'Endurance') : ''}</div>
      <select data-native aria-label="Target for ${escapeHtml(f.name)}" onchange="_tcTarget['${f.id}']=this.value">${opts}</select>
      <button type="button" class="btn ${now ? 'btn-quiet' : 'btn-secondary'}" onclick="tableFoeAttack('${f.id}')">Attack</button></div>`;
  }).join('');
  return `<div class="tbl-round">Round ${r} · ${now ? 'the heroes act' : 'the foes attack'}</div>` + _tcOrderHtml(true) +
    (foes ? `<div class="eyebrow">${now ? 'Foes (they attack once every hero has acted)' : 'The foes attack'}</div>${foes}` : '<p class="hint">Add a foe to begin.</p>');
}
function _tblCombatPlayerHtml() {
  if (_tblPhase() !== 'combat' && !enc().active) return '';
  const r = _tcRound(), now = tableTurnNow();
  const me = (Table.party || {})[Sync.uid] || { uid: Sync.uid };
  const mine = now && now.uid === Sync.uid;
  const acted = _tcActed(Object.assign({ uid: Sync.uid }, me), r);
  const stances = TC_STANCES.map(([k, l, d]) => `<button type="button" class="tbl-role${char.stance === k ? ' on' : ''}" aria-pressed="${char.stance === k}" onclick="tableSetStance('${k}')">${typeof STANCE_GLYPH !== 'undefined' && STANCE_GLYPH[k] ? `<svg class="ic st-ic" aria-hidden="true"><use href="#${STANCE_GLYPH[k]}"/></svg>` : ''}<strong>${l}</strong><small>${d}</small></button>`).join('');
  let turn;
  if (mine) turn = `<div class="tbl-turn now"><strong>Your turn</strong><p>One action this round. Attack a foe, or do something else and tell the table.</p>
      ${_tcFoes().filter(f => f.engaged !== false).map(f => `<button type="button" class="btn btn-block tbl-call-btn" onclick="tableAttack('${f.id}')">Attack ${escapeHtml(f.name)}</button>`).join('')}
      <button type="button" class="btn btn-secondary btn-block" onclick="tableEndTurn()">I did something else — end my turn</button></div>`;
  else if (acted) turn = `<div class="tbl-turn">You have acted this round.${now ? ` Now: <strong>${escapeHtml((now.vitals || {}).name || 'Hero')}</strong>.` : ' The foes attack next.'}</div>`;
  else turn = `<div class="tbl-turn">${now ? `Waiting for <strong>${escapeHtml((now.vitals || {}).name || 'Hero')}</strong>.` : 'The foes attack.'}</div>`;
  return `<div class="card tbl-fight"><h3 class="card-title">The fight · round ${r}</h3>
    <div class="eyebrow">Your stance</div><div class="tbl-roles-pick">${stances}</div>
    ${turn}${_tcOrderHtml(false)}${_tcFoesHtml()}</div>`;
}

/* ----- the Fellowship Phase at a table -----
   The Loremaster opens it for everyone (table/fp: kind + the Shadow the adventure washed away);
   each player runs the normal wizard on their own phone, preset to those choices, and the console
   shows who has finished (members/{uid}/fpDone = the phase's id). */
function tableOpenFp() {
  if (!tableIsGm()) return;
  const yule = document.getElementById('tfp-kind').value === 'yule';
  const shadow = parseInt(document.getElementById('tfp-shadow').value) || 0;
  const fp = { id: 'fp' + Date.now().toString(36), yule, shadow, ts: _TS() };
  Table.state.fp = fp; Table.state.phase = 'fellowship'; tableRefresh();
  return Table._ref('table').update({ fp, phase: 'fellowship', since: _TS() });
}
function _tblFpOpen() { const fp = Table.state.fp; return fp && fp.id && _tblPhase() === 'fellowship' ? fp : null; }
function _tblFpGmHtml() {
  const fp = _tblFpOpen(); if (!fp) return '';
  const rows = _tblPlayers().map(m => `<li class="${m.fpDone === fp.id ? 'done' : ''}"><strong>${escapeHtml((m.vitals || {}).name || m.displayName || 'Hero')}</strong> <em>${m.fpDone === fp.id ? 'done' : 'resting…'}</em></li>`).join('');
  return `<div class="tbl-round">${fp.yule ? 'Yule' : 'An ordinary phase'} · Shadow −${fp.shadow}</div><ol class="tbl-order">${rows}</ol>`;
}
function _tblFpPlayerHtml() {
  const fp = _tblFpOpen(); if (!fp) return '';
  const me = (Table.party || {})[Sync.uid] || {};
  if (me.fpDone === fp.id) return `<div class="card tbl-fp"><h3 class="card-title">The Fellowship Phase</h3><p>You are done. Wait for the others, or tell the table what your hero did.</p></div>`;
  return `<div class="card tbl-fp"><h3 class="card-title">The Fellowship Phase</h3>
    <p>${fp.yule ? '<strong>Yule.</strong> The year turns: you grow a year older and your Hope is restored. ' : ''}The Loremaster says the adventure washed away <strong>${fp.shadow} Shadow</strong>. Rest, recover, spend your points and choose what your hero does.</p>
    <button type="button" class="btn btn-block tbl-call-btn" onclick="tableStartMyFp()">Start my Fellowship Phase</button></div>`;
}
/** The normal wizard, preset to the Loremaster's choices (a phase already in progress resumes). */
function tableStartMyFp() {
  const fp = _tblFpOpen(); if (!fp) return;
  const resume = char.fpWizardState && char.fpWizardState.inProgress && char.fpWizardState.tableFp === fp.id;
  openFPWizard(!resume);
  if (!resume) {
    fpSetPhaseType(fp.yule ? 'yule' : 'ordinary');
    fpState.tableFp = fp.id; fpPersist();
  }
  const r = document.querySelector(`input[name="fp-shadow-rm"][value="${parseInt(fp.shadow) || 0}"]`); if (r) r.checked = true;
}
function tableFpDone() {
  const fp = _tblFpOpen(); if (!fp || !tableActive() || Sync.isLoremaster()) return;
  const me = (Table.party || {})[Sync.uid]; if (me) me.fpDone = fp.id;
  tableRefresh();
  return Table._ref('members/' + Sync.uid + '/fpDone').set(fp.id).catch(() => {});
}

/* ----- the Company's Fellowship pool (one shared number at a table) ----- */
function _tblPoolGmHtml() {
  const n = _tblPlayers().length;
  return `<div class="tbl-pool"><span>Company Fellowship</span><strong>${Table.pool}</strong>
    <div class="tbl-pool-btns"><button type="button" class="btn btn-secondary" aria-label="Remove a Fellowship point" onclick="tableAdjPool(-1)">−</button>
    <button type="button" class="btn btn-secondary" aria-label="Add a Fellowship point" onclick="tableAdjPool(1)">+</button>
    ${n ? `<button type="button" class="btn btn-quiet" onclick="tableRefillPool()">Refill to ${n} (one per hero)</button>` : ''}</div></div>`;
}
function _tblPoolPlayerHtml() {
  return `<div class="tbl-pool-card"><div class="tbl-pool"><span>Company Fellowship</span><strong>${Table.pool}</strong>
    ${Table.pool > 0 ? '<button type="button" class="btn btn-secondary" onclick="spendFPforHope()">Spend 1 for +1 Hope</button>' : '<small>empty — the Loremaster refills it</small>'}</div>
    <p class="hint">One pool for the whole Company. Spend it during a rest, when you all agree.</p></div>`;
}
function tableAdjPool(d) { if (tableIsGm()) return Table._ref('pool/fellowship').transaction(cur => Math.max(0, (parseInt(cur) || 0) + d)); }
function tableRefillPool() { if (tableIsGm()) return Table._ref('pool/fellowship').set(_tblPlayers().length); }
/** Spend one point of the Company's pool for +1 Hope. A transaction, so two players tapping at
    once cannot both spend the last point. */
async function tableSpendPool() {
  const curHope = parseInt(char.hopeCur) || 0, maxHope = parseInt(char.hopeMax) || 0;
  if (curHope >= maxHope) return alertStyled('Your Hope is already full.', 'Company Fellowship');
  const res = await Table._ref('pool/fellowship').transaction(cur => { const n = parseInt(cur) || 0; return n > 0 ? n - 1 : undefined; });
  if (!res || !res.committed) return alertStyled('The Company\'s Fellowship pool is empty. The Loremaster refills it.', 'Company Fellowship');
  adj('hopeCur', 1);
  tablePostLine(`spent a Company Fellowship point: Hope ${curHope} → ${char.hopeCur}.`);
  showToast(`Company Fellowship spent: Hope ${curHope} → ${char.hopeCur}.`);
}

/* ----- first-time explanations: once per hero, never in the way ----- */
const TABLE_LESSONS = {
  phase_journey:    ['A journey', 'The Company travels hex by hex. Pick a role: the Guide rolls Travel to move everyone on; the Hunter, Look-out and Scout roll when something happens on the road. Every event costs Fatigue — when you arrive, a good Travel roll sheds some of it.'],
  phase_combat:     ['A fight', 'Pick a stance: Forward hits harder but gets hit more, Defensive is harder to hit, Rearward is for bows. Heroes act in stance order, one action each; then every foe attacks. At 0 Endurance you are Dying.'],
  phase_council:    ['A council', 'You are trying to win someone over. Speak as your hero; the Loremaster asks for rolls like Courtesy, Persuade or Insight. Good roleplay earns extra dice.'],
  phase_fellowship: ['The Fellowship Phase', 'The adventure is over for now. You recover Hope, lose some Shadow, and spend the Skill and Adventure points you earned — one rank per skill each phase.'],
  call:             ['A roll', 'Tap the button to roll: one Feat die plus a Success die for each rank of the skill. Reach the Target Number or more to succeed. A ✦ on a Success die makes it a great success.'],
  shadow:           ['Shadow', 'Shadow is creeping despair. When your Shadow reaches your Hope you are Miserable, and worse can follow. A Fellowship Phase washes some away.'],
  wounded:          ['Wounded', 'A Wound takes days to heal. Another Wound while Wounded, or Endurance at 0, and you are Dying. A companion can roll Healing to help.'],
  fatigue:          ['Fatigue', 'Fatigue adds to what you carry. When your Endurance falls to your Load or lower you are Weary, and your dice count for less. A rest in a safe place clears it.'],
  damage:           ['Endurance', 'Endurance is how much punishment you can take before you drop. A rest recovers it.']
};
const LESSON_KEY = 'tor2e-explained';
function _tblSeen() { try { return JSON.parse(localStorage.getItem(LESSON_KEY)) || {}; } catch (e) { return {}; } }
function tableLearn(key) {
  if (!TABLE_LESSONS[key] || tableIsGm()) return;
  const seen = _tblSeen()[activeCharId] || {};
  if (seen[key] || Table.lessons.includes(key)) return;
  Table.lessons.push(key); tableRefresh();
}
function tableLearnDone(key) {
  const all = _tblSeen(); all[activeCharId] = Object.assign({}, all[activeCharId], { [key]: 1 });
  try { localStorage.setItem(LESSON_KEY, JSON.stringify(all)); } catch (e) {}
  Table.lessons = Table.lessons.filter(k => k !== key); tableRefresh();
}
function _tblLessonHtml() {
  const key = Table.lessons[0]; if (!key) return '';
  const [title, text] = TABLE_LESSONS[key];
  return `<div class="card tbl-learn" role="note"><div class="eyebrow">New here</div><h3 class="card-title">${escapeHtml(title)}</h3><p>${escapeHtml(text)}</p>
    <button type="button" class="btn btn-secondary" onclick="tableLearnDone('${key}')">Got it</button></div>`;
}

/* ----- joining by link or QR: #join=CODE opens the join step with the code filled in ----- */
function joinFromHash() {
  const m = location.hash.match(/[#&]join=([^&]+)/); if (!m) return;
  try { window.history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
  let code = ''; try { code = normJoinCode(decodeURIComponent(m[1])); } catch (e) { code = normJoinCode(m[1]); }
  openCampaign();
  if (tableActive()) return;   // already at a table: the panel shows which
  if (typeof campStep === 'function') campStep('pl');
  const inp = document.getElementById('camp-code'); if (inp) inp.value = code;
}
window.addEventListener('hashchange', joinFromHash);
