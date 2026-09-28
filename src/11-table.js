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
  _refs: [],
  _partyCb: null,
  _ref(path) { return Sync.db.ref('campaigns/' + Sync.currentCampaign() + '/' + path); },
  start() {
    if (!tableActive()) return;
    this.stop();
    const tref = this._ref('table');
    tref.on('value', snap => { this.state = Object.assign({ phase: 'story' }, snap.val() || {}); tableRefresh(); }, () => {});
    this._refs.push(tref);
    this._partyCb = m => { this.party = m || {}; tableRefresh(); };
    Sync.subscribeParty(this._partyCb);
    tableRefresh();
  },
  stop() {
    this._refs.forEach(r => { try { r.off(); } catch (e) {} });
    this._refs = [];
    if (this._partyCb && typeof Sync !== 'undefined') Sync.unsubscribeParty(this._partyCb);
    this._partyCb = null;
    this.state = { phase: 'story' }; this.party = {};
  }
};

// Re-render whatever table surface is on screen.
function tableRefresh() {
  const play = document.getElementById('panel-play');
  if (play && play.classList.contains('active') && typeof renderPlay === 'function') renderPlay();
}

function _tblPhase() { return TABLE_PHASES[Table.state.phase] ? Table.state.phase : 'story'; }

/** ▶ Play while in a campaign. */
function renderTablePlay(host) {
  if (!char.culture) {
    host.innerHTML = '<div class="card play-empty"><div class="eyebrow">At the table</div><h3 class="card-title">First, a hero</h3>' +
      '<p>Your Loremaster may hand you one — open the link they send and it is added here. Or take a ready-made hero, or build your own together.</p>' +
      '<button class="btn btn-block" onclick="openPregens()">Give me a ready-made hero</button>' +
      '<button class="btn btn-secondary btn-block" onclick="document.querySelector(\'.tab[data-tab=build]\').click()">I\'ll make my own</button></div>';
    return;
  }
  host.innerHTML = tableIsGm() ? _tblConsoleHtml() : _tblSheetHtml();
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
  return solo + _tblPhaseCard() +
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
    _tblRollsHtml() +
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
function _tblConsoleHtml() {
  const players = _tblMembers().filter(m => m.role !== 'loremaster');
  const rows = players.map(m => {
    const v = m.vitals || {};
    const cond = ['weary', 'miserable', 'wounded'].filter(k => v[k]).join(' · ');
    return `<div class="tbl-prow${m.online === false ? ' off' : ''}"><strong>${escapeHtml(v.name || m.displayName || 'Hero')}</strong>
      <span>End ${v.endCur ?? '?'}/${v.endMax ?? '?'} · Hope ${v.hopeCur ?? '?'}/${v.hopeMax ?? '?'} · Shadow ${v.shadow ?? 0}${v.dying ? ' · <b>Dying</b>' : ''}${cond ? ' · ' + cond : ''}</span></div>`;
  }).join('');
  return _tblPhaseCard() +
    `<div class="card tbl-console"><h3 class="card-title">Your table</h3>
      ${rows || '<p class="hint">No players yet. Give them the join code from Menu → Fellowship campaign.</p>'}</div>`;
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
