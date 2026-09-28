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
  story:      { label: 'Story',             text: 'The Loremaster is telling the story. Listen, say what your hero does, and roll when you are asked.' },
  journey:    { label: 'On a journey',      text: 'The Company is travelling. The Loremaster runs the road; you roll for your journey role when it comes up.' },
  combat:     { label: 'Combat',            text: 'A fight has started. Pick a stance, then act when it is your turn.' },
  council:    { label: 'A council',         text: 'The Company is trying to persuade someone. Speak in character — the Loremaster will ask for rolls.' },
  fellowship: { label: 'Fellowship Phase',  text: 'The adventure is over for now. Rest, recover, and spend what you have earned.' }
};

const Table = {
  state: { phase: 'story' },
  party: {},
  calls: {},
  feed: [],
  _refs: [],
  _partyCb: null,
  _callsPrimed: false,
  _answering: null,
  _ref(path) { return Sync.db.ref('campaigns/' + Sync.currentCampaign() + '/' + path); },
  _on(ref, fn) { ref.on('value', fn, () => {}); this._refs.push(ref); },
  start() {
    if (!tableActive()) return;
    this.stop();
    this._on(this._ref('table'), snap => { const was = this.state.phase; this.state = Object.assign({ phase: 'story' }, snap.val() || {}); if (was !== this.state.phase) tablePhaseChanged(was); tableRefresh(); });
    this._on(this._ref('calls').limitToLast(20), snap => {
      const prev = this.calls; this.calls = snap.val() || {};
      if (this._callsPrimed && !tableIsGm()) Object.keys(this.calls).forEach(id => { if (!prev[id] && _tblCallForMe(this.calls[id])) _tblAnnounceCall(this.calls[id]); });
      this._callsPrimed = true; tableRefresh();
    });
    this._on(this._ref('feed').limitToLast(30), snap => { const v = snap.val() || {}; this.feed = Object.keys(v).map(k => Object.assign({ id: k }, v[k])).sort((a, b) => (a.ts || 0) - (b.ts || 0)); tableRefresh(); });
    if (!Sync.isLoremaster()) this._on(this._ref('handouts/' + Sync.uid), snap => { const v = snap.val() || {}; Object.keys(v).forEach(id => tableApplyHandout(id, v[id])); });
    this._partyCb = m => { this.party = m || {}; tableRefresh(); };
    Sync.subscribeParty(this._partyCb);
    tableRefresh();
  },
  stop() {
    this._refs.forEach(r => { try { r.off(); } catch (e) {} });
    this._refs = [];
    if (this._partyCb && typeof Sync !== 'undefined') Sync.unsubscribeParty(this._partyCb);
    this._partyCb = null;
    this.state = { phase: 'story' }; this.party = {}; this.calls = {}; this.feed = []; this._callsPrimed = false; this._answering = null;
  }
};
const _TS = () => (typeof firebase !== 'undefined' && firebase.database && firebase.database.ServerValue) ? firebase.database.ServerValue.TIMESTAMP : Date.now();
function _tblMyName() { return heroLabel(char); }

// Re-render whatever table surface is on screen.
function tableRefresh() {
  const play = document.getElementById('panel-play');
  if (play && play.classList.contains('active') && typeof renderPlay === 'function') renderPlay();
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

function _tblPhaseCard() {
  const ph = TABLE_PHASES[_tblPhase()];
  const note = Table.state.note ? `<p class="tbl-note">“${escapeHtml(Table.state.note)}”</p>` : '';
  return `<div class="card ornate tbl-phase" data-phase="${_tblPhase()}"><div class="eyebrow">At the table now</div>
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
  return solo + _tblCallsForMeHtml() + _tblPhaseCard() +
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
     </div>` +
    _tblRollsHtml() + _tblFeedHtml(6) +
    `<button class="btn btn-quiet btn-block" onclick="openWhereAmI()">Where am I playing? · ${isSolo() ? 'on my own' : 'at the table'}</button>`;
}

/** Every roll a Loremaster may ask for, as big buttons grouped by attribute. A skill at 0 is
    still rollable (the Feat die alone), so all eighteen are here. */
function _tblRollsHtml() {
  const b = (name, sub, fav) => `<button type="button" class="tbl-roll${fav ? ' fav' : ''}" onclick="rollFromSheet('${name}')"><strong>${escapeHtml(name)}${fav ? ' ★' : ''}</strong><small>${escapeHtml(sub)}</small></button>`;
  const dice = r => r + (r === 1 ? ' die' : ' dice');
  const TN = { str: char.strTN, hrt: char.hrtTN, wit: char.witTN };
  const grp = (title, items) => `<div class="tbl-group"><div class="eyebrow">${title}</div><div class="tbl-rolls">${items}</div></div>`;
  let h = grp('Valour & Wisdom',
    b('Valour', dice(parseInt(char.valour) || 1) + ' · TN ' + (parseInt(TN.hrt) || '—'), char.culture === 'Bardings') +
    b('Wisdom', dice(parseInt(char.wisdom) || 1) + ' · TN ' + (parseInt(TN.wit) || '—'), char.culture === 'Hobbits of the Shire'));
  [['str', 'Strength'], ['hrt', 'Heart'], ['wit', 'Wits']].forEach(([a, label]) => {
    h += grp(`${label} · TN ${parseInt(TN[a]) || '—'}`, SKILLS[a].map(s => { const v = (char.skills || {})[s] || {}; return b(s, dice(parseInt(v.rating) || 0), v.favoured); }).join(''));
  });
  const profs = COMBAT_PROFS.filter(p => (parseInt((char.profs || {})[p]) || 0) > 0);
  if (profs.length) h += grp('Combat', profs.map(p => b(p, dice(parseInt(char.profs[p]) || 0), false)).join(''));
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
function _tblConsoleShell() {
  const opt = (v, l) => `<option value="${v}">${escapeHtml(l)}</option>`;
  return `<div class="tbl-root">
    <div id="tbl-phase-slot"></div>
    <div class="card tbl-console"><h3 class="card-title">Set the scene</h3>
      <p class="hint">Every phone shows what the table is doing now.</p>
      <div class="tbl-phases" id="tbl-phases">${Object.keys(TABLE_PHASES).map(k => `<button type="button" class="btn btn-secondary" data-phase="${k}" onclick="tableSetPhase('${k}')">${escapeHtml(TABLE_PHASES[k].label)}</button>`).join('')}</div>
      <div class="field"><label for="tbl-note">Tell the table</label><input type="text" id="tbl-note" placeholder="e.g. Night falls on the Old Forest Road"></div>
      <button type="button" class="btn btn-secondary btn-block" onclick="tableSetNote()">Show it on every phone</button>
    </div>
    <div class="card"><h3 class="card-title">Call for a roll</h3>
      <div class="field"><label for="tbl-call-skill">Roll</label><select id="tbl-call-skill">${TABLE_ROLLS().map(r => opt(r, r)).join('')}</select></div>
      <div class="field"><label for="tbl-call-who">Who</label><select id="tbl-call-who">${opt('all', 'Everyone')}</select></div>
      <div class="field"><label for="tbl-call-note">Why</label><input type="text" id="tbl-call-note" placeholder="e.g. the guard is watching the gate"></div>
      <button type="button" class="btn btn-block" onclick="tableCallRoll()">Ask for the roll</button>
      <div id="tbl-calls"></div>
    </div>
    <div class="card"><h3 class="card-title">Hand out</h3>
      <p class="hint">It lands on their sheet at once, with the app's rules and limits applied.</p>
      <div class="field"><label for="tbl-ho-who">To</label><select id="tbl-ho-who">${opt('all', 'Everyone')}</select></div>
      <div class="field"><label for="tbl-ho-kind">What</label><select id="tbl-ho-kind">${TABLE_HANDOUTS.map(([k, l]) => opt(k, l)).join('')}</select></div>
      <div class="field"><label for="tbl-ho-amt">How much</label><input type="number" id="tbl-ho-amt" value="1" min="1" max="30"></div>
      <div class="field"><label for="tbl-ho-note">Because</label><input type="text" id="tbl-ho-note" placeholder="e.g. the orc's blade"></div>
      <button type="button" class="btn btn-secondary btn-block" onclick="tableHandout()">Hand it out</button>
    </div>
    <div class="card tbl-console"><h3 class="card-title">Your table</h3><div id="tbl-party"></div></div>
    <div id="tbl-feed-slot"></div>
  </div>`;
}
function _tblSetOptions(id, opts) {
  const sel = document.getElementById(id); if (!sel) return;
  const keep = sel.value;
  sel.innerHTML = opts.map(([v, l]) => `<option value="${v}">${escapeHtml(l)}</option>`).join('');
  sel.value = opts.some(o => o[0] === keep) ? keep : opts[0][0];
}
function _tblConsoleUpdate() {
  const slot = document.getElementById('tbl-phase-slot'); if (slot) slot.innerHTML = _tblPhaseCard();
  document.querySelectorAll('#tbl-phases [data-phase]').forEach(b => { const on = b.dataset.phase === _tblPhase(); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
  const who = [['all', 'Everyone'], ..._tblPlayers().map(m => [m.uid, (m.vitals && m.vitals.name) || m.displayName || 'Hero'])];
  _tblSetOptions('tbl-call-who', who); _tblSetOptions('tbl-ho-who', who);
  if (typeof syncPickers === 'function') syncPickers();
  const party = document.getElementById('tbl-party');
  if (party) party.innerHTML = _tblPlayers().map(m => {
    const v = m.vitals || {};
    const cond = ['weary', 'miserable', 'wounded'].filter(k => v[k]).join(' · ');
    return `<div class="tbl-prow${m.online === false ? ' off' : ''}"><strong>${escapeHtml(v.name || m.displayName || 'Hero')}</strong>
      <span>End ${v.endCur ?? '?'}/${v.endMax ?? '?'} · Hope ${v.hopeCur ?? '?'}/${v.hopeMax ?? '?'} · Shadow ${v.shadow ?? 0}${v.dying ? ' · <b>Dying</b>' : ''}${cond ? ' · ' + cond : ''}</span></div>`;
  }).join('') || '<p class="hint">No players yet. Give them the join code from Menu → Fellowship campaign.</p>';
  const calls = document.getElementById('tbl-calls'); if (calls) calls.innerHTML = _tblOpenCallsGmHtml();
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
    .filter(c => _tblCallForMe(c) && !_tblAnsweredBy(c.id, Sync.uid)).sort((a, b) => (a.ts || 0) - (b.ts || 0));
}
function _tblAnnounceCall(c) {
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
  const entry = { uid: Sync.uid, name: _tblMyName(), text: `${r.label} — ${result}`, skill, result, outcome: String(r.outcome || ''), ts: _TS() };
  if (callId) entry.callId = callId;
  return Table._ref('feed').push(entry).catch(() => {});
}
function tablePostLine(text) {
  if (!tableActive()) return;
  return Table._ref('feed').push({ uid: Sync.uid, name: _tblMyName(), text: String(text).slice(0, 300), ts: _TS() }).catch(() => {});
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
