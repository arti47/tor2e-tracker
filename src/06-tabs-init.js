/* ---------- TABS ---------- */
function bindTabs() {
  document.querySelectorAll('.tab').forEach(t => {
    t.onclick = () => {
      document.querySelectorAll('.tab').forEach(x => { x.classList.remove('active'); x.removeAttribute('aria-current'); });
      document.querySelectorAll('.panel').forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      t.setAttribute('aria-current', 'page');   // P8: a11y — mark the active tab for screen readers
      document.getElementById('panel-' + t.dataset.tab).classList.add('active');
      try { localStorage.setItem('tor2e-lasttab', t.dataset.tab); } catch (e) {}  // U4: remember last tab
      // Auto-lock Skills tab when leaving it (extra safety against accidental edits)
      if (t.dataset.tab !== 'character' && editMode) {   // skill corrections live in the sheet's Edit now
        toggleEditMode();
      }
      if (t.dataset.tab !== 'character' && typeof adjustMode !== 'undefined' && adjustMode) toggleAdjustMode(false);
      if (t.dataset.tab === 'play' && typeof renderPlay === 'function') renderPlay();
      if (t.dataset.tab === 'chronicle') renderChronicle();
      if (t.dataset.tab === 'reference') renderReference();
      if (t.dataset.tab === 'gm' && typeof renderGm === 'function') renderGm();
      if (typeof initHintButtons === 'function') initHintButtons();       // (?) hints on any newly-shown markup
      clampLongHints();
      initTips();
      if (JUMP_PANELS.includes('panel-' + t.dataset.tab)) renderJumpBar('panel-' + t.dataset.tab);
      if (typeof renderNewcomerBanner === 'function') renderNewcomerBanner();
      refreshNav();
      window.scrollTo(0, 0);
    };
  });
  document.querySelectorAll('.bn-item').forEach(b => { b.onclick = () => openNavGroup(b.dataset.group); });
  refreshNav();
}

/* ---------- PRIMARY NAVIGATION (groups) ----------
   Fourteen top-level tabs were the single biggest source of "intimidating": they
   overflowed the header and a newcomer could not tell which ones mattered. The
   .tab buttons still exist (every jump link, guard and spec clicks them) but they
   are now a sub-navigation inside five groups. Mode gating stays where it was —
   refreshStriderUI / refreshGmUI set .tab style.display — and a group is simply
   hidden when none of its tabs is visible. */
const NAV_GROUPS = [
  { id: 'play',      tabs: ['play'] },
  { id: 'hero',      tabs: ['character', 'gear', 'build'] },
  { id: 'adventure', tabs: ['journey', 'council', 'combat', 'band', 'battle', 'gm'] },
  { id: 'roll',      tabs: ['dice', 'oracle'] },
  { id: 'journal',   tabs: ['chronicle', 'reference'] },
];
const _navLast = {};   // group id → last sub-tab opened in it (this session)
function _tabShown(id) {
  const t = document.querySelector(`.tab[data-tab="${id}"]`);
  return !!t && t.style.display !== 'none';
}
function navGroupOf(tabId) { return NAV_GROUPS.find(g => g.tabs.includes(tabId)) || NAV_GROUPS[0]; }
function openNavGroup(gid) {
  const g = NAV_GROUPS.find(x => x.id === gid); if (!g) return;
  const shown = g.tabs.filter(_tabShown);
  const pick = (_navLast[gid] && shown.includes(_navLast[gid])) ? _navLast[gid] : shown[0];
  const t = pick && document.querySelector(`.tab[data-tab="${pick}"]`);
  if (t) t.click();
}
/** Build is for making a hero. It sits in the Hero group until the hero is built, then leaves the
    bar; it is still reached from Menu → Creation steps, from Edit on the sheet, and from any link
    that clicks its tab (it stays while open). */
function heroBuilt() {
  if (!char || !char.culture) return false;
  if (char.saga && char.saga.started) return true;
  return typeof _buildSteps === 'function' && _buildSteps().every(s => s.done);
}
function refreshBuildTab() {
  const t = document.querySelector('.tab[data-tab="build"]'); if (!t) return;
  const show = !heroBuilt() || t.classList.contains('active');
  t.style.display = show ? '' : 'none';
}
function openBuild() {
  const m = document.getElementById('menu-overlay'); if (m && m.classList.contains('show') && typeof toggleMenu === 'function') toggleMenu();
  { const pc = document.getElementById('panel-character'); if (pc && pc.classList.contains('editing') && typeof setCharEditing === 'function') setCharEditing(false); }
  const t = document.querySelector('.tab[data-tab="build"]'); if (t) t.click();
}
function refreshNav() {
  refreshBuildTab();
  const active = document.querySelector('.tab.active');
  const cur = navGroupOf(active ? active.dataset.tab : 'play');
  if (active) _navLast[cur.id] = active.dataset.tab;
  // round 4: moving to another group turns the page, forward or back by the group's place in the bar
  const prevGroup = document.body.dataset.group;
  if (prevGroup && prevGroup !== cur.id && active) {
    const panel = document.getElementById('panel-' + active.dataset.tab);
    const dir = NAV_GROUPS.findIndex(x => x.id === cur.id) > NAV_GROUPS.findIndex(x => x.id === prevGroup) ? 'fwd' : 'back';
    if (panel) { panel.classList.remove('turn-fwd', 'turn-back'); void panel.offsetWidth; panel.classList.add('turn-' + dir);
      clearTimeout(panel._turnT); panel._turnT = setTimeout(() => panel.classList.remove('turn-fwd', 'turn-back'), 450); }
    if (typeof sfx === 'function') sfx('page');
  }
  document.body.dataset.group = cur.id;   // per-group accent colour (wayfinding)
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('nav-out', !cur.tabs.includes(t.dataset.tab)));
  const nav = document.querySelector('.tabs');
  if (nav) nav.classList.toggle('single', cur.tabs.filter(_tabShown).length <= 1);
  if (nav) {
    nav.classList.toggle('fits', nav.scrollWidth <= nav.clientWidth + 2);
    if (active && !active.classList.contains('nav-out')) { try { active.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) {} }
  }
  document.querySelectorAll('.bn-item').forEach(b => {
    const g = NAV_GROUPS.find(x => x.id === b.dataset.group);
    const shown = g ? g.tabs.filter(_tabShown) : [];
    b.style.display = shown.length ? '' : 'none';
    const on = g === cur;
    b.classList.toggle('active', on);
    if (on) b.setAttribute('aria-pressed', 'true'); else b.removeAttribute('aria-pressed');
    const lbl = b.querySelector('[data-alt]');   // "Journal" reads "Rules" when there is no Chronicle
    if (lbl) { lbl.dataset.main = lbl.dataset.main || lbl.textContent; lbl.textContent = shown.length === 1 && shown[0] === 'reference' ? lbl.dataset.alt : lbl.dataset.main; }
  });
  moveTabIndicator(prevGroup === cur.id);
}
/** Round 5: the chosen sub-tab is a pill that slides from one tab to the next. */
function moveTabIndicator(animate) {
  const nav = document.querySelector('.tabs'); if (!nav) return;
  let ind = nav.querySelector('.tab-ind');
  if (!ind) { ind = document.createElement('span'); ind.className = 'tab-ind'; ind.setAttribute('aria-hidden', 'true'); nav.insertBefore(ind, nav.firstChild); }
  const a = nav.querySelector('.tab.active:not(.nav-out)');
  if (!a || !a.offsetWidth) { ind.style.opacity = '0'; return; }
  ind.classList.toggle('no-anim', !animate);
  ind.style.opacity = '1'; ind.style.width = a.offsetWidth + 'px'; ind.style.height = a.offsetHeight + 'px';
  ind.style.transform = `translate(${a.offsetLeft}px, ${a.offsetTop}px)`;
}
// U4: reopen the last-used tab on load. Only if it's still present AND visible (solo-only
// tabs are display:none when their mode is off — never restore into a hidden tab).
function restoreLastTab() {
  try {
    const id = localStorage.getItem('tor2e-lasttab');
    if (!id || id === 'character') return;  // 'character' is the default active tab already
    const tab = document.querySelector(`.tab[data-tab="${id}"]`);
    if (tab && tab.style.display !== 'none') tab.click();
  } catch (e) {}
}

/* ---------- DICE RESULT DRAWER ----------
   A roll from ANY tab shows its result in a drawer that slides up from the bottom — dice,
   outcome, and the follow-ups (Pierce, Fortune, Special Success) — instead of on the Dice tab
   below the fold. #roll-result itself is moved into the drawer once at boot, so every renderer
   and spec that addresses it by id is unchanged. Deliberately NOT a .menu-overlay: the Fortune
   offer waits while one is open (GOTCHA 25), and the drawer must never block it. */
function initRollDrawer() {
  const res = document.getElementById('roll-result'); if (!res || document.getElementById('roll-drawer')) return;
  const d = document.createElement('div');
  d.id = 'roll-drawer'; d.className = 'roll-drawer'; d.setAttribute('aria-label', 'Roll result');
  d.innerHTML = '<div class="rd-bar"><span class="rd-handle"></span><button class="rd-close" type="button" aria-label="Close the result">Done</button></div><div class="rd-body"></div>';
  document.body.appendChild(d);
  d.querySelector('.rd-body').appendChild(res);
  res.style.marginTop = '0';
  d.querySelector('.rd-close').onclick = closeRollDrawer;
  // swipe down on the handle bar to dismiss
  let y0 = null; const bar = d.querySelector('.rd-bar');
  bar.addEventListener('touchstart', e => { y0 = e.touches[0].clientY; }, { passive: true });
  bar.addEventListener('touchend', e => { if (y0 !== null && e.changedTouches[0].clientY - y0 > 50) closeRollDrawer(); y0 = null; }, { passive: true });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && d.classList.contains('open') && !document.querySelector('.menu-overlay.show')) closeRollDrawer(); });
}
function openRollDrawer() {
  const d = document.getElementById('roll-drawer'); if (!d) return;
  if (window._inlineToPlay) { if (typeof sfx === 'function') sfx('dice'); return; }   // a roll from ▶ Play is told in the story; Details opens this
  d.classList.add('open'); document.body.classList.add('drawer-open');
  if (typeof sfx === 'function') sfx('dice');
  const b = d.querySelector('.rd-body'); if (b) b.scrollTop = 0;
}
function closeRollDrawer() {
  const d = document.getElementById('roll-drawer'); if (!d) return;
  d.classList.remove('open'); document.body.classList.remove('drawer-open');
}

/* ---------- JUMP BARS ----------
   The two longest tabs (Band ~5 screens, Oracle ~3) get a row of chips naming their cards,
   so a player can go straight to "Tests" or "Lore" instead of scrolling past everything. */
const JUMP_PANELS = ['panel-band', 'panel-oracle'];
function renderJumpBar(panelId) {
  const panel = document.getElementById(panelId); if (!panel) return;
  let bar = panel.querySelector(':scope > .jump-bar');
  const cards = [...panel.querySelectorAll(':scope > .card:not(.tab-intro)')]
    .filter(c => c.style.display !== 'none' && c.querySelector(':scope > .card-title'))
    // round 4: the card already on screen (the Oracle's Ask box) needs no chip
    .filter(c => !c.classList.contains('ornate'));
  if (cards.length < 4) { if (bar) bar.remove(); return; }
  if (!bar) {
    bar = document.createElement('nav'); bar.className = 'jump-bar'; bar.setAttribute('aria-label', 'Jump to a section');
    const intro = panel.querySelector(':scope > .tab-intro');
    panel.insertBefore(bar, intro ? intro.nextSibling : panel.firstChild);
  }
  bar.innerHTML = '';
  cards.forEach((c, i) => {
    const t = c.querySelector(':scope > .card-title');
    const tc = t.cloneNode(true); tc.querySelectorAll('.card-status').forEach(x => x.remove());
    const label = tc.childNodes[0] && tc.childNodes[0].nodeType === 3 ? tc.childNodes[0].textContent : tc.textContent;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'jump-chip';
    b.textContent = label.replace(/[⌄▾▸?]/g, '').replace(/—.*$/, '').trim().replace(/\s+Table$/i, '').replace(/^(Random|Oracle)\s+/i, '').trim().slice(0, 22);
    b.onclick = () => openCard(c);
    bar.appendChild(b);
  });
}
function renderJumpBars() { JUMP_PANELS.forEach(renderJumpBar); }

/* ---------- ONE-TIME TIPS ----------
   Every tab opens with an explanation (.tab-intro — GOTCHA 14 keeps them). Shown every
   visit they became a wall of grey text; now each carries "Got it" and stays dismissed
   (tor2e-tips, device-global). Menu → Appearance → "Show the tips again" restores them. */
const TIPS_KEY = 'tor2e-tips';
function _tipsSeen() { try { return JSON.parse(localStorage.getItem(TIPS_KEY)) || {}; } catch (e) { return {}; } }
function initTips() {
  const seen = _tipsSeen();
  document.querySelectorAll('.panel .tab-intro').forEach(el => {
    const panel = el.closest('.panel'); const id = panel ? panel.id : '';
    if (!el.querySelector('.tip-dismiss')) {
      const b = document.createElement('button');
      b.className = 'tip-dismiss'; b.type = 'button'; b.textContent = 'Got it';
      b.setAttribute('aria-label', 'Hide this tip');
      b.onclick = () => { const s = _tipsSeen(); s[id] = 1; try { localStorage.setItem(TIPS_KEY, JSON.stringify(s)); } catch (e) {} el.classList.add('tip-hidden'); };
      el.appendChild(b);
    }
    el.classList.toggle('tip-hidden', !!seen[id] || !_tipTurn(id));
  });
}
/* Quiet help: at most ONE tab tip per session. The first unseen tip the player meets this
   session is the one that shows; the others wait (undismissed) for a later session. */
const TIP_SESSION_KEY = 'tor2e-tip-session';
function _tipTurn(id) {
  let cur = null; try { cur = sessionStorage.getItem(TIP_SESSION_KEY); } catch (e) {}
  if (cur) return cur === '*' || cur === id;      // '*' = the player asked for every tip back
  const panel = document.getElementById(id);
  if (!panel || !panel.classList.contains('active')) return false;   // only the tab actually opened claims the turn
  try { sessionStorage.setItem(TIP_SESSION_KEY, id); } catch (e) {}
  return true;
}
/* Long explanations collapse to one line marked ⓘ; tap to read the rest. The text is all still
   there (and still read by screen readers) — it just stops shouting from every card. */
function clampLongHints() {
  document.querySelectorAll('.panel .card .hint:not(.hint-clamp-checked), .panel .tab-intro .hint:not(.hint-clamp-checked)').forEach(h => {
    h.classList.add('hint-clamp-checked');
    const intro = !!h.closest('.tab-intro');
    if (h.querySelector('button, a, input, select, textarea')) return;
    if ((h.textContent || '').trim().length < (intro ? 90 : 110)) return;
    if (!_splitFirstSentence(h)) return;        // one long sentence: show it whole, never cut mid-word
    h.classList.add('hint-clamp');
    h.setAttribute('role', 'button'); h.setAttribute('tabindex', '0'); h.setAttribute('aria-expanded', 'false');
    const more = document.createElement('span'); more.className = 'hint-more'; more.textContent = 'More'; more.setAttribute('aria-hidden', 'true');
    h.appendChild(more);
    const t = () => { const o = h.classList.toggle('open'); h.setAttribute('aria-expanded', o ? 'true' : 'false'); more.textContent = o ? 'Less' : 'More'; };
    h.addEventListener('click', t);
    h.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); t(); } });
  });
}
/* Quiet help: keep the first full sentence on screen and fold the rest behind "More".
   Splits at the first sentence end (after ≥20 characters) in a direct text child, or at the
   element boundary that contains it; everything after moves into span.hint-rest.
   Returns false when there is nothing worth folding, so the hint shows whole. */
function _splitFirstSentence(h) {
  const kids = [...h.childNodes]; let acc = 0, cut = -1;
  for (let i = 0; i < kids.length && cut < 0; i++) {
    const n = kids[i], t = n.textContent || '';
    const re = /[.!?](?=\s|$)/g; let m;
    while ((m = re.exec(t))) {
      if (acc + m.index < 20) continue;
      if (n.nodeType === 3) {
        if (m.index + 1 < t.length) n.splitText(m.index + 1);
        cut = i + 1;
      } else cut = i + 1;
      break;
    }
    acc += t.length;
  }
  if (cut < 0) return false;
  const rest = [...h.childNodes].slice(cut);
  const restLen = rest.reduce((a, n) => a + (n.textContent || '').trim().length, 0);
  if (restLen < 25) return false;
  const span = document.createElement('span'); span.className = 'hint-rest';
  rest.forEach(n => span.appendChild(n));
  h.appendChild(span);
  return true;
}
/* Plain-language glosses: a two- or three-word gloss under the game terms a newcomer meets
   first. The (?) still gives the full rule; the gloss answers "what is this, roughly". */
const PLAIN_GLOSS = {
  'Strength': 'body & brawn', 'Heart': 'spirit & nerve', 'Wits': 'mind & senses',
  'Shadow': 'creeping despair', 'Scars': 'permanent Shadow', 'Fatigue': 'weariness from travel',
  'Load': 'weight you carry', 'Valour': 'courage · earns Rewards', 'Wisdom': 'judgement · earns Virtues',
  'Skill Pts': 'buy skills', 'Adventure Pts': 'buy combat skill, Valour, Wisdom', 'Treasure': 'wealth',
  'Fellowship Pts': 'bonds with companions', 'Parry': 'how hard you are to hit', 'Parry Total': 'how hard you are to hit',
  'Protection (dice)': 'armour against wounds', 'Eye Awareness': 'how close the Enemy is to noticing you',
  'Hunt Threshold': 'when the Enemy strikes', 'Engaged Foes': 'enemies fighting you', 'Foe Parry': 'how hard the foe is to hit'
};
function applyPlainGlosses() {
  document.querySelectorAll('.counter-label, .attr h4').forEach(el => {
    if (el.querySelector('.gloss')) return;
    const key = (el.childNodes[0] && el.childNodes[0].nodeType === 3 ? el.childNodes[0].textContent : el.textContent).replace(/[?⌄▾▸]/g, '').trim();
    const g = PLAIN_GLOSS[key]; if (!g) return;
    const s = document.createElement('span'); s.className = 'gloss'; s.textContent = g; el.appendChild(s);
  });
}
function resetTips() {
  try { localStorage.removeItem(TIPS_KEY); sessionStorage.setItem(TIP_SESSION_KEY, '*'); } catch (e) {}
  initTips();
  if (typeof showToast === 'function') showToast('Tips are back on every tab.');
}

/* ---------- MENU ---------- */
function toggleMenu() {
  const ov = document.getElementById('menu-overlay');
  ov.classList.toggle('show');
  // P3: refresh the cloud sync status line whenever the menu opens.
  if (ov.classList.contains('show')) {
    const el = document.getElementById('sync-status-line');
    if (el && typeof Sync !== 'undefined') {
      const on = Sync.isEnabled();
      const st = Sync.status();
      el.textContent = on ? (Sync.uid ? 'Saved on this device and in the cloud.' : 'Connecting to the cloud…') : 'Saved locally on this device.';
      el.title = st;
      el.style.color = on ? 'var(--success-text)' : 'var(--text-muted)';
    }
  }
}

function exportData() {
  // Bundle the Chronicle alongside the character when it has content (v2 wrapper);
  // otherwise emit a plain character object for backward compatibility.
  const hasJournal = journal && (journal.entries.length || journal.threads.length || journal.npcs.length);
  const payload = hasJournal ? { _tor2e: 'export-v2', character: char, journal } : char;
  const data = JSON.stringify(payload, null, 2);
  const blob = new Blob([data], {type: 'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = (char.name || 'character') + '.tor2e.json';
  a.click();
  try { localStorage.setItem('tor2e-lastexport', String(Date.now())); } catch (e) {}   // U14 nudge baseline
  toggleMenu();
}

// U14 — bulk export of the ENTIRE roster (every hero + their Chronicle + roll history) in one file.
function exportAllHeroes() {
  const roster = loadRoster();
  if (!roster || !roster.list.length) { alert('No heroes to export yet.'); return; }
  const get = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
  const heroes = roster.list.map(entry => ({
    name: entry.name,
    character: get(CHAR_PREFIX + entry.id),
    journal: get(JOURNAL_PREFIX + entry.id),
    rolls: get(ROLLS_PREFIX + entry.id)
  })).filter(h => h.character);
  const payload = { _tor2e: 'roster-export-v1', exported: new Date().toISOString(), count: heroes.length, heroes };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'tor2e-all-heroes-' + new Date().toISOString().slice(0, 10) + '.json';
  a.click();
  try { localStorage.setItem('tor2e-lastexport', String(Date.now())); } catch (e) {}   // U14 nudge baseline
  toggleMenu();
}
// U14 — restore an "all heroes" backup. Heroes are ADDED with fresh ids (never overwrites existing).
function importAllHeroes(e) {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = async ev => {
    let data;
    try { data = JSON.parse(ev.target.result); } catch (err) { alert('That file is not valid JSON — import cancelled.'); e.target.value = ''; return; }
    if (!data || data._tor2e !== 'roster-export-v1' || !Array.isArray(data.heroes)) {
      alert('That is not a TOR2E “all heroes” backup. (Use 📥 Import Character for a single hero file.)'); e.target.value = ''; return;
    }
    const valid = data.heroes.filter(h => h && validCharacterShape(h.character));
    if (!valid.length) { alert('No valid heroes found in that file.'); e.target.value = ''; return; }
    if (!await confirmStyled(
      `Add <strong>${valid.length}</strong> hero(es) from this backup?<br><br>They are added as <strong>new</strong> heroes — your existing heroes are never changed or overwritten.`,
      '📦 Restore Heroes', {yes:'Add these heroes', no:'Cancel'})) { e.target.value = ''; return; }
    let roster = loadRoster() || { activeId: null, list: [] };
    valid.forEach(h => {
      const id = genCharId();
      const c = migrateCharacter(h.character);
      localStorage.setItem(CHAR_PREFIX + id, JSON.stringify(c));
      if (h.journal && typeof h.journal === 'object') localStorage.setItem(JOURNAL_PREFIX + id, JSON.stringify(h.journal));
      if (Array.isArray(h.rolls)) localStorage.setItem(ROLLS_PREFIX + id, JSON.stringify(h.rolls));
      roster.list.push({ id, name: c.name || h.name || 'New Hero' });
    });
    if (!roster.activeId) roster.activeId = roster.list[0].id;
    saveRoster(roster);
    e.target.value = '';
    toggleMenu();
    alert(valid.length + ' hero(es) added to your roster.');
    if (typeof openRoster === 'function' && document.getElementById('roster-overlay')?.classList.contains('show')) openRoster();
  };
  reader.readAsText(file);
}

function importData(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async ev => {
    let data;
    try { data = JSON.parse(ev.target.result); }
    catch (err) { alert('That file is not valid JSON — import cancelled.'); return; }
    // v2 wrapper { _tor2e, character, journal } or a plain (legacy) character object.
    const incomingChar = (data && data._tor2e && data.character) ? data.character : data;
    const incomingJournal = (data && data._tor2e && data.journal) ? data.journal : null;
    if (!validCharacterShape(incomingChar)) {
      alert('That file does not look like a TOR2E character — import cancelled.');
      return;
    }
    // Importing REPLACES the active hero, so confirm before destroying data.
    if (!await confirmStyled(
      `This replaces the <strong>active hero</strong> (“${escapeHtml(char.name || 'current')}”) with “${escapeHtml(incomingChar.name || 'Imported hero')}”.<br><br>Export a backup first if unsure, or use <strong>New Character</strong> to keep both. Proceed?`,
      '📥 Import Character', {yes:'Replace this hero', no:'Cancel'})) return;
    char = migrateCharacter(incomingChar);
    saveCharacter();
    if (incomingJournal && typeof incomingJournal === 'object') {
      // Normalize through the same path the loader uses (scene wrapping, clock migration, array guards).
      localStorage.setItem(journalKey(), JSON.stringify(incomingJournal));
      journal = loadJournal();
    }
    render();
    renderChronicle();
    toggleMenu();
    alert('Character imported!' + (incomingJournal ? ' (Chronicle included)' : ''));
  };
  reader.readAsText(file);
}

async function resetCharacter() {
  if (await confirmStyled('Erase character and start fresh? This cannot be undone.\n\nRoll history and the Chronicle will also be cleared.', undefined, {yes:'Erase this hero', no:'Keep hero'})) {
    char = JSON.parse(JSON.stringify(DEFAULT_CHARACTER));
    history = [];
    journal = defaultJournal();
    saveCharacter();
    saveHistory();
    saveJournal();
    renderHistory();
    renderChronicle();
    render();
    toggleMenu();
  }
}

/* ============================================
   DICE ROLLER
   ============================================ */
let diceState = {
  success: 1,
  fav: 'normal',  // 'ill' | 'normal' | 'fav'
  tn: 'str',
  weary: false,
  miserable: false,
  hopeSpend: false,
  support: 'none',  // 'none' | '1d' | '2d'
  magical: false,
  keen: false,
  inspired: false,        // Inspired doubles the +1d Hope bonus to +2d (no effect without Hope spend)
  inspiredSource: '',     // 'Brave at a Pinch' | 'Distinctive Feature' | ...
  isAttack: false,  // only true when rolling a combat proficiency (weapon attack)
  foeParry: 0,      // current foe's Parry rating — adds to Str TN on attack rolls
  dragonSlayer: false,  // Bardings virtue: toggled on for attacks vs Might 2+ foes
  // Sources that contribute Favoured / Ill-Favoured Feat die rolls. Populated by quickRoll
  // from blessings/virtues/toggles; the player's manual seg-btn pick stacks on top.
  // Per RAW p.20: if both Favoured and Ill-Favoured apply, they cancel to a normal roll.
  autoFavSources: [],   // e.g. ['Sure at the Mark', 'Stout-Hearted']
  autoIllSources: []    // reserved for future auto-Ill sources
};

function adjFoeParry(delta) {
  diceState.foeParry = Math.max(0, (parseInt(diceState.foeParry) || 0) + delta);
  setText('foe-parry-v', diceState.foeParry);
}

function hasVirtue(name) {
  return Array.isArray(char.virtuesList) && char.virtuesList.some(v => v.name === name);
}

function toggleKeen() {
  diceState.keen = !diceState.keen;
  document.getElementById('keen-btn').classList.toggle('active', diceState.keen);
}

function toggleDragonSlayer() {
  diceState.dragonSlayer = !diceState.dragonSlayer;
  refreshDragonSlayerButton();
}

function refreshDragonSlayerButton() {
  const btn = document.getElementById('dragon-slayer-btn');
  if (!btn) return;
  const visible = hasVirtue('Dragon-Slayer');
  btn.style.display = visible ? 'block' : 'none';
  if (!visible) diceState.dragonSlayer = false;
  btn.classList.toggle('active', diceState.dragonSlayer);
}

function toggleDarkBusiness() {
  if (diceState.inspired && diceState.inspiredSource === 'Dark for Dark Business') {
    diceState.inspired = false;
    diceState.inspiredSource = '';
  } else {
    diceState.inspired = true;
    diceState.inspiredSource = 'Dark for Dark Business';
  }
  refreshDarkBusinessButton();
  refreshBraveButton();
  refreshInvokeDFButton();
}

function refreshDarkBusinessButton() {
  const btn = document.getElementById('dark-business-btn');
  if (!btn) return;
  const visible = hasVirtue('Dark for Dark Business');
  btn.style.display = visible ? 'block' : 'none';
  if (!visible && diceState.inspiredSource === 'Dark for Dark Business') {
    diceState.inspired = false;
    diceState.inspiredSource = '';
  }
  btn.classList.toggle('active', diceState.inspired && diceState.inspiredSource === 'Dark for Dark Business');
}

function refreshConditionalVirtueButtons() {
  refreshDragonSlayerButton();
  refreshDarkBusinessButton();
}

function refreshKeenButton() {
  const btn = document.getElementById('keen-btn');
  if (!btn) return;
  const hasKeen = (char.weapons || []).some(w => Array.isArray(w.rewards) && w.rewards.includes('Keen'));
  btn.style.display = hasKeen ? 'block' : 'none';
  if (!hasKeen) diceState.keen = false;
  btn.classList.toggle('active', diceState.keen);
}

// Brave at a Pinch (Bardings virtue) — sets Inspired when Weary/Miserable/Wounded.
// Per RAW p.20: Inspiration doubles a Hope spend to +2d; no effect without Hope spend.
function toggleBrave() {
  if (diceState.inspired && diceState.inspiredSource === 'Brave at a Pinch') {
    diceState.inspired = false;
    diceState.inspiredSource = '';
  } else {
    diceState.inspired = true;
    diceState.inspiredSource = 'Brave at a Pinch';
  }
  refreshBraveButton();
  refreshInvokeDFButton();
}

function refreshBraveButton() {
  const btn = document.getElementById('brave-btn');
  if (!btn) return;
  const hasVirtue = Array.isArray(char.virtuesList) && char.virtuesList.some(v => v.name === 'Brave at a Pinch');
  const conditionMet = !!(char.weary || char.miserable || char.wounded);
  const visible = hasVirtue && conditionMet;
  btn.style.display = visible ? 'block' : 'none';
  if (!visible && diceState.inspiredSource === 'Brave at a Pinch') {
    diceState.inspired = false;
    diceState.inspiredSource = '';
  }
  btn.classList.toggle('active', diceState.inspired && diceState.inspiredSource === 'Brave at a Pinch');
}

// Generic "Invoke Distinctive Feature" — narrative trigger that sets Inspired (Core Rules p.20).
function toggleInvokeDF() {
  if (diceState.inspired && diceState.inspiredSource === 'Distinctive Feature') {
    diceState.inspired = false;
    diceState.inspiredSource = '';
  } else {
    diceState.inspired = true;
    diceState.inspiredSource = 'Distinctive Feature';
  }
  refreshBraveButton();
  refreshInvokeDFButton();
}

function refreshInvokeDFButton() {
  const btn = document.getElementById('invoke-df-btn');
  if (!btn) return;
  btn.classList.toggle('active', diceState.inspired && diceState.inspiredSource === 'Distinctive Feature');
}

function toggleHopeSpend() {
  if (!diceState.hopeSpend && (parseInt(char.hopeCur) || 0) <= 0) {
    alert('Not enough Hope!');
    return;
  }
  diceState.hopeSpend = !diceState.hopeSpend;
  if (diceState.hopeSpend) diceState.magical = false;  // mutually exclusive
  refreshHopeButtons();
}

function toggleMagical() {
  if (!diceState.magical && (parseInt(char.hopeCur) || 0) <= 0) {
    alert('Not enough Hope!');
    return;
  }
  diceState.magical = !diceState.magical;
  if (diceState.magical) diceState.hopeSpend = false;
  refreshHopeButtons();
}

function refreshHopeButtons() {
  document.getElementById('hope-spend-btn').classList.toggle('active', diceState.hopeSpend);
  document.getElementById('magical-btn').classList.toggle('active', diceState.magical);
  document.getElementById('hope-cost-hint').style.display = (diceState.hopeSpend || diceState.magical) ? 'block' : 'none';
}

function bindDice() {
  document.querySelectorAll('#success-count .seg-btn').forEach(b => {
    b.onclick = () => {
      diceState.success = parseInt(b.dataset.val);
      document.querySelectorAll('#success-count .seg-btn').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
    };
  });
  document.querySelectorAll('#fav-pick .seg-btn').forEach(b => {
    b.onclick = () => {
      diceState.fav = b.dataset.val;
      document.querySelectorAll('#fav-pick .seg-btn').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      refreshFavCancelHint();
    };
  });
  document.querySelectorAll('#tn-pick .seg-btn').forEach(b => {
    b.onclick = () => {
      diceState.tn = b.dataset.val;
      document.querySelectorAll('#tn-pick .seg-btn').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
    };
  });
  document.querySelectorAll('#support-pick .seg-btn').forEach(b => {
    b.onclick = () => {
      diceState.support = b.dataset.val;  // 'none' | '1d' | '2d'
      document.querySelectorAll('#support-pick .seg-btn').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
    };
  });
  // Council setup seg-btns
  document.querySelectorAll('#c-resistance-pick .seg-btn').forEach(b => {
    b.onclick = () => {
      document.querySelectorAll('#c-resistance-pick .seg-btn').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      renderCouncil();
    };
  });
  document.querySelectorAll('#c-attitude-pick .seg-btn').forEach(b => {
    b.onclick = () => {
      document.querySelectorAll('#c-attitude-pick .seg-btn').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      renderCouncil();
    };
  });
  // Council roleplay bonus seg-btns
  document.querySelectorAll('#c-roleplay-pick .seg-btn').forEach(b => {
    b.onclick = () => {
      document.querySelectorAll('#c-roleplay-pick .seg-btn').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
    };
  });
  // Skill Endeavour setup seg-btns
  ['#se-resistance-pick', '#se-time-pick', '#se-risk-pick', '#se-roleplay-pick'].forEach(sel => {
    document.querySelectorAll(sel + ' .seg-btn').forEach(b => {
      b.onclick = () => {
        document.querySelectorAll(sel + ' .seg-btn').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        if (sel !== '#se-roleplay-pick') renderSkillEndeavour();
      };
    });
  });
  // Oracle Lore Table column picker
  document.querySelectorAll('#oracle-lore-cols .seg-btn').forEach(b => {
    b.onclick = () => {
      document.querySelectorAll('#oracle-lore-cols .seg-btn').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
    };
  });
  // Hoard tier picker
  document.querySelectorAll('#hoard-tier-pick .seg-btn').forEach(b => {
    b.onclick = () => {
      document.querySelectorAll('#hoard-tier-pick .seg-btn').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      fpHoardSetupHint();
    };
  });
  document.getElementById('weary-tog').onclick = function() {
    diceState.weary = !diceState.weary;
    this.classList.toggle('active', diceState.weary);
  };
  document.getElementById('miser-tog').onclick = function() {
    diceState.miserable = !diceState.miserable;
    this.classList.toggle('active', diceState.miserable);
  };
}

function quickRoll(item, s) {
  window._lastQuick = { item, s };   // Play's "Again" chip repeats this
  if (typeof _noteRecentRoll === 'function') _noteRecentRoll(item && item.name);
  // Set dice state and switch to dice tab
  let rating = s.rating;
  let stanceNote = '';
  let usefulItemNote = '';
  let blessingNote = '';
  let blessingFav = false;
  const autoFavSources = [];  // each auto-Favoured source name; layered with manual pick by effectiveFav()
  if (s.favoured) autoFavSources.push('Favoured Skill');

  // Cultural Blessing: Stout-Hearted (Bardings Valour) / Hobbit-Sense (Hobbit Wisdom)
  if (item.isMeta) {
    if (item.name === 'Valour' && char.culture === 'Bardings') {
      blessingFav = true;
      blessingNote = ' [Stout-Hearted: Favoured]';
      autoFavSources.push('Stout-Hearted');
    } else if (item.name === 'Wisdom' && char.culture === 'Hobbits of the Shire') {
      blessingFav = true;
      blessingNote = ' [Hobbit-Sense: Favoured]';
      autoFavSources.push('Hobbit-Sense');
    }
  }
  // Cultural Blessing: Furious (Beornings) — Wounded → Attack rolls Favoured
  if (item.isProf && char.culture === 'Beornings' && char.wounded) {
    blessingFav = true;
    blessingNote = ' [Furious: Favoured]';
    autoFavSources.push('Furious');
  }
  // === Conditional virtue auto-applies (Favoured) ===
  // Sure at the Mark (Hobbits) — all ranged attacks Favoured
  if (item.isProf && item.name === 'Bows' && hasVirtue('Sure at the Mark')) {
    blessingFav = true;
    blessingNote += ' [Sure at the Mark: Favoured]';
    autoFavSources.push('Sure at the Mark');
  }
  // Against the Unseen (Elves of Lindon / Elves of Mirkwood) — Shadow Test vs Dread Favoured
  if (item.shadowTest === 'Dread' && hasVirtue('Against the Unseen')) {
    blessingFav = true;
    blessingNote += ' [Against the Unseen: Favoured]';
    autoFavSources.push('Against the Unseen');
  }
  // Dragon-Slayer (Bardings) — narrative toggle: attacks vs Might 2+ foes Favoured
  if (item.isProf && diceState.dragonSlayer && hasVirtue('Dragon-Slayer')) {
    blessingFav = true;
    blessingNote += ' [Dragon-Slayer: Favoured]';
    autoFavSources.push('Dragon-Slayer');
  }
  // Strider Mode: Strider Distinctive Feature auto-sets Inspired on Skill rolls during
  // an active Journey (RAW: "Inspired on all Skill rolls while journeying"). Only kicks
  // in if the player hasn't already chosen a different Inspired source manually.
  if (char.striderMode && char.journey && char.journey.active && !item.isProf && !item.isMeta) {
    if (!diceState.inspired) {
      diceState.inspired = true;
      diceState.inspiredSource = 'Strider (Journey)';
    }
  }

  // Useful Item bonus (skills only, not Valour/Wisdom or combat profs)
  let blessingItemNote = '';
  let blessingMagicalSuccess = false;
  // === Conditional virtue auto-applies (+1d on Shadow Tests) ===
  // Strength of Will (Rangers of the North) — +1d on Shadow Tests vs Dread
  if (item.shadowTest === 'Dread' && hasVirtue('Strength of Will')) {
    rating += 1;
    blessingItemNote += ' [Strength of Will +1d]';
  }
  // Untameable Spirit (Dwarves of Durin's Folk) — +1d on Shadow Tests vs Sorcery
  if (item.shadowTest === 'Sorcery' && hasVirtue('Untameable Spirit')) {
    rating += 1;
    blessingItemNote += " [Untameable Spirit +1d]";
  }
  if (!item.isProf && !item.isMeta) {
    const ui = getUsefulItemForSkill(item.name);
    if (ui) {
      rating += 1;
      usefulItemNote = ` [🎒 ${ui.name} +1d]`;
    }
    // Magical Treasure Blessing — +2d on rolls of the affected Skill (Marvellous Artefact / Wondrous Item).
    // Per Core Rules pp.160-161: also enables Magical Success.
    if (Array.isArray(char.magicalItems)) {
      const matchingItem = char.magicalItems.find(mi =>
        (mi.type === 'Marvellous Artefact' || mi.type === 'Wondrous Item') &&
        Array.isArray(mi.blessings) && mi.blessings.includes(item.name)
      );
      if (matchingItem) {
        rating += 2;
        blessingItemNote = ` [✨ ${matchingItem.name} Blessing +2d]`;
        blessingMagicalSuccess = true;
      }
    }
  }

  // Auto-apply stance modifier ONLY when rolling a Combat Proficiency (attack roll)
  if (item.isProf && char.stance) {
    if (char.stance === 'forward') {
      rating += 1;
      stanceNote = ' [Fwd +1d]';
    } else if (char.stance === 'defensive') {
      const foes = parseInt(char.engagedFoes) || 0;
      rating = Math.max(0, rating - foes);
      stanceNote = foes > 0 ? ` [Def −${foes}d]` : ' [Def]';
    } else if (char.stance === 'rearward' && (item.name === 'Axes' || item.name === 'Spears' || item.name === 'Swords')) {
      stanceNote = ' [Rearward: ranged only!]';
    } else if (char.stance === 'skirmish') {
      // Strider Mode: Skirmish stance. Ranged attacks lose 1d; melee weapons can't attack at all.
      if (item.name === 'Bows') {
        rating = Math.max(0, rating - 1);
        stanceNote = ' [Skirmish: −1d ranged]';
      } else {
        stanceNote = ' [Skirmish: ranged only — melee weapons cannot attack!]';
      }
    }
  }
  diceState.stanceNote = stanceNote + usefulItemNote + blessingItemNote + blessingNote;
  diceState.blessingMagicalSuccess = blessingMagicalSuccess;
  diceState.success = rating;
  diceState.tn = item.attr;
  diceState.autoFavSources = autoFavSources;
  diceState.autoIllSources = shadowDespairActive() ? ['Despair (Shadow = Max Hope)'] : [];
  diceState.fav = (s.favoured || blessingFav) ? 'fav' : 'normal';
  diceState.isAttack = !!item.isProf;  // Piercing Blow indicator only on weapon attacks
  diceState.combatTask = item.combatTask || '';
  diceState.shadowTest = item.shadowTest || '';
  diceState.firstAid = !!item.firstAid;
  diceState.lastAttackProf = item.isProf ? item.name : (diceState.lastAttackProf || '');
  diceState.weary = typeof heroIsWeary === 'function' ? heroIsWeary() : !!char.weary;
  diceState.miserable = !!char.miserable;

  // Update UI
  document.querySelectorAll('#success-count .seg-btn').forEach(x => {
    x.classList.toggle('active', parseInt(x.dataset.val) === Math.min(6, rating));
  });
  document.querySelectorAll('#fav-pick .seg-btn').forEach(x => {
    x.classList.toggle('active', x.dataset.val === diceState.fav);
  });
  document.querySelectorAll('#tn-pick .seg-btn').forEach(x => {
    x.classList.toggle('active', x.dataset.val === diceState.tn);
  });
  document.getElementById('weary-tog').classList.toggle('active', diceState.weary);
  document.getElementById('miser-tog').classList.toggle('active', diceState.miserable);
  refreshFavCancelHint();

  rollDice(item.displayName || item.name);
}

function rollFeatOnce() {
  const r = Math.floor(Math.random() * 12) + 1;
  if (r === 11) return {label: '👁', value: 0, special: 'eye'};
  if (r === 12) return {label: 'ᚱ', value: 11, special: 'rune'};
  // "Favoured by the Grey Wizard" major event: treat any 1 as an 11
  if (r === 1 && char && char.greyWizard) return {label: '1→11', value: 11, special: 'greyWizard'};
  return {label: String(r), value: r};
}

// Refresh the cancellation hint shown under the Feat-die picker. Surfaces when any
// auto source layers against an opposite manual/auto pick, per RAW p.20.
function refreshFavCancelHint() {
  const el = document.getElementById('fav-cancel-hint');
  if (!el) return;
  const autoFavs = diceState.autoFavSources || [];
  const autoIlls = diceState.autoIllSources || [];
  const hasAutoFav = autoFavs.length > 0;
  const hasAutoIll = autoIlls.length > 0;
  const manualFav = diceState.fav === 'fav';
  const manualIll = diceState.fav === 'ill';
  const cancels = (hasAutoFav || manualFav) && (hasAutoIll || manualIll);
  if (cancels) {
    const favList = [...autoFavs, ...(manualFav ? ['Manual Favoured'] : [])].join(', ');
    const illList = [...autoIlls, ...(manualIll ? ['Manual Ill'] : [])].join(', ');
    el.innerHTML = `⚖ ${favList} ⇄ ${illList} — cancel to Normal`;
    el.style.display = 'block';
  } else if (hasAutoFav && !manualFav && !manualIll) {
    el.innerHTML = `★ Auto-Favoured: ${autoFavs.join(', ')}`;
    el.style.color = 'var(--gold)';
    el.style.display = 'block';
  } else if (hasAutoIll && !manualFav && !manualIll) {
    el.innerHTML = `⚠ Auto Ill-Favoured: ${autoIlls.join(', ')}`;
    el.style.color = 'var(--red)';
    el.style.display = 'block';
  } else {
    el.style.display = 'none';
  }
}

// Despair (Core Rules p.137): when Shadow + Scars equals (or exceeds) Max Hope, the hero is
// gripped by despair and rolls EVERY Feat die Ill-Favoured until the total drops below Max
// Hope (Harden Will, a Bout of Madness, or Hope recovery). Scars count as Shadow per RAW.
function shadowDespairActive() {
  const hopeMax = parseInt(char.hopeMax) || 0;
  if (hopeMax <= 0 || char.retired) return false;
  const total = (parseInt(char.shadow) || 0) + (parseInt(char.scars) || 0);
  return total >= hopeMax;
}

// Compute the effective Feat-die state by layering manual seg-btn pick + auto sources.
// Per RAW p.20: if any Favoured AND any Ill-Favoured source applies, they cancel to normal.
function effectiveFav() {
  const hasFav = (diceState.autoFavSources && diceState.autoFavSources.length > 0) || diceState.fav === 'fav';
  const hasIll = (diceState.autoIllSources && diceState.autoIllSources.length > 0) || diceState.fav === 'ill';
  if (hasFav && hasIll) return 'normal';
  if (hasFav) return 'fav';
  if (hasIll) return 'ill';
  return 'normal';
}

function rollFeatDie() {
  if (effectiveFav() === 'normal') return [rollFeatOnce()];
  return [rollFeatOnce(), rollFeatOnce()];
}

function pickFeat(rolls) {
  if (rolls.length === 1) return rolls[0];
  // Favoured: pick best (Rune > 10 > ... > 1 > Eye)
  // Ill-Favoured: pick worst
  const score = r => r.special === 'rune' ? 100 : (r.special === 'eye' ? -100 : r.value);
  rolls.sort((a, b) => score(b) - score(a));
  return effectiveFav() === 'fav' ? rolls[0] : rolls[rolls.length - 1];
}

/* ---------- The illuminated result banner (round 4) ----------
   The verdict comes first, as a ribbon in the display face coloured by outcome, with one line
   of why ("12 vs TN 15 — short by 3"). Success icons and a Piercing Blow sit on it as seals. */
/** Round 5: a number counts up to its value once the dice have landed. */
function countUpNumber(el, to, delay) {
  if (!el || typeof to !== 'number' || !isFinite(to)) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { el.textContent = to; return; }
  const token = (el._cu = (el._cu || 0) + 1);
  el.textContent = '0';
  setTimeout(() => {
    const t0 = performance.now(), dur = 380;
    const step = t => { if (el._cu !== token) return; const k = Math.min(1, (t - t0) / dur); el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); else el.textContent = to; };
    requestAnimationFrame(step);
  }, delay || 0);
}
function renderRollBanner(r) {
  const el = document.getElementById('roll-banner'); if (!el) return;
  const word = !r.ok ? 'Failure' : r.level === 'Extraordinary' ? 'Extraordinary success' : r.level === 'Great' ? 'Great success' : 'Success';
  const why = r.isAutoSuccess ? 'The Rune — a success whatever the total'
    : r.isAutoFail ? 'Miserable, and the Eye came up — it fails'
    : (r.total >= r.tn ? `${r.total} vs TN ${r.tn} — made it${r.total > r.tn ? ' by ' + (r.total - r.tn) : ', exactly'}` : `${r.total} vs TN ${r.tn} — short by ${r.tn - r.total}`);
  const seals = (r.ok && r.icons ? `<span class="seal" title="Success icons">✦ ${r.icons}</span>` : '') + (r.piercing ? '<span class="seal pierce">Piercing blow</span>' : '');
  el.className = 'roll-banner ' + (!r.ok ? 'b-fail' : r.level === 'Extraordinary' ? 'b-extra' : r.level === 'Great' ? 'b-great' : 'b-ok') + (r.ok && (r.level === 'Extraordinary' || r.level === 'Great') ? ' shine' : '');
  const stamp = typeof rollStamp === 'function' ? rollStamp(r.ok, r.level) : '';
  const said = typeof rollMeaning === 'function' ? rollMeaning(r.what, r.ok, r.isAttack) : '';
  el.innerHTML = `${r.what ? `<div class="rb-what">${escapeHtml(r.what)}</div>` : ''}<div class="rb-row"><div class="rb-ribbon"><span>${word}</span></div>${stamp}</div>${said ? `<div class="rb-said">${escapeHtml(said)}</div>` : ''}<div class="rb-why">${why}</div>${seals ? `<div class="rb-seals">${seals}</div>` : ''}`;
  el.hidden = false;
}
function rollDice(skillLabel) {
  // A hero with no culture applied has placeholder attributes, so every roll here is meaningless
  // (and always vs the default TN). Say so once rather than silently printing nonsense numbers.
  if (typeof newcomerNeedsHelp === 'function' && newcomerNeedsHelp() && !window._blankRollWarned) {
    window._blankRollWarned = true;
    alertStyled('Your hero has no <strong>Culture</strong> yet, so their Strength / Heart / Wits are still placeholders — this roll is being scored against a default Target Number and doesn’t mean anything.<br><br>Build a hero on the <strong>Build</strong> tab (or load a ready-made one from ☰ Menu → ✨ Pre-generated Heroes) and your rolls will use their real numbers.<br><br><span style="opacity:.8">Rolling anyway — this notice won’t show again.</span>', '⚠️ No hero built yet');
  }
  // Despair (Core Rules p.137): at Shadow + Scars = Max Hope every roll is Ill-Favoured.
  // Ensure the source is present even for manual Dice-tab rolls (quickRoll already sets it).
  if (shadowDespairActive()) {
    if (!Array.isArray(diceState.autoIllSources)) diceState.autoIllSources = [];
    if (!diceState.autoIllSources.includes('Despair (Shadow = Max Hope)')) {
      diceState.autoIllSources.push('Despair (Shadow = Max Hope)');
    }
    refreshFavCancelHint();
  }
  // Effective success dice = configured + Hope Spend (+1d, or +2d if Inspired per RAW p.20) + Receive Support (+1d/+2d) + queued Build Advantage (+1d each)
  // Magical Success doesn't add dice — just forces Rune. Inspired alone (no Hope spend) does NOTHING per RAW.
  const supportBonus = diceState.support === '2d' ? 2 : (diceState.support === '1d' ? 1 : 0);
  const hopeBonus = diceState.hopeSpend ? (diceState.inspired ? 2 : 1) : 0;
  const advantageBonus = parseInt(diceState.queuedAdvantage) || 0;
  const bonusDice = hopeBonus + supportBonus + advantageBonus;
  const successCount = diceState.success + bonusDice;

  // Magical Success: force the Feat die to Rune
  let featRolls, chosenFeat;
  if (diceState.magical) {
    chosenFeat = { label: 'ᚱ', value: 11, special: 'rune', forced: true };
    featRolls = [chosenFeat];
  } else {
    featRolls = rollFeatDie();
    chosenFeat = pickFeat(featRolls);
  }

  const successRolls = [];
  for (let i = 0; i < successCount; i++) {
    const v = Math.floor(Math.random() * 6) + 1;
    const wearied = diceState.weary && v < 4;
    successRolls.push({value: v, icon: v === 6, wearied});
  }

  // Deduct Hope if used
  if (diceState.hopeSpend || diceState.magical) {
    char.hopeCur = Math.max(0, (parseInt(char.hopeCur) || 0) - 1);
    saveCharacter();
  }

  // Compute total
  let featValue = chosenFeat.value;
  let isAutoSuccess = chosenFeat.special === 'rune';
  let isAutoFail = chosenFeat.special === 'eye' && diceState.miserable;

  let total = isAutoSuccess ? null : featValue + successRolls.reduce((sum, s) => sum + (s.wearied ? 0 : s.value), 0);

  // Per RAW p.98: attack rolls add the foe's Parry rating to the attacker's Str TN.
  const baseTn = parseInt(char[diceState.tn + 'TN']) || 0;
  const foeParryBonus = (diceState.isAttack && diceState.foeParry) ? (parseInt(diceState.foeParry) || 0) : 0;
  const tn = baseTn + foeParryBonus;
  const icons = successRolls.filter(s => s.icon && !s.wearied).length;

  let outcome;
  if (isAutoFail) outcome = 'FAIL (Miserable + Eye)';
  else if (isAutoSuccess) outcome = 'SUCCESS (Rune!)';
  else if (total >= tn) outcome = 'SUCCESS';
  else outcome = 'FAIL';

  let level = '';
  if (outcome.startsWith('SUCCESS') && !isAutoFail) {
    if (icons === 0) level = '';
    else if (icons === 1) level = 'Great';
    else level = 'Extraordinary';
  }

  // Piercing Blow indicator if Feat roll is Rune (auto), 10, or 9+ with Keen weapon
  const keenActive = diceState.keen;
  const piercing = chosenFeat.special === 'rune' || chosenFeat.value === 10 || (keenActive && chosenFeat.value >= 9);

  // Render result
  const resultEl = document.getElementById('roll-result');
  resultEl.style.display = 'block';
  openRollDrawer();
  // Bring the result into view — quick-roll / Combat Task / Shadow Test buttons can sit well
  // above it on a phone. 'nearest' = no movement if already fully visible, else the minimal
  // jump. behavior:'auto' (instant) on purpose: 'smooth' never completes in some headless/older
  // Safari engines, and instant means zero tap→result latency. Deferred a tick so the panel has
  // its final size before we measure.
  setTimeout(() => { try { resultEl.scrollIntoView({ behavior: 'auto', block: 'nearest' }); } catch (e) {} }, 50);

  const diceDiv = document.getElementById('result-dice');
  diceDiv.innerHTML = '';

  // Feat die (show all rolled if fav/ill)
  featRolls.forEach((r, i) => {
    const d = document.createElement('div');
    d.className = 'feat-die' + (r.special === 'eye' ? ' eye' : '') + (r.special === 'rune' ? ' rune' : '');
    d.textContent = r.label;
    _labelFeatDie(d, r.special);                       // label first: it reads textContent
    if (r.special && DIE_GLYPH[r.special]) d.innerHTML = DIE_GLYPH[r.special];
    if (r !== chosenFeat) d.style.opacity = '0.4';
    diceDiv.appendChild(d);
  });

  successRolls.forEach(s => {
    const d = document.createElement('div');
    d.className = 'success-die' + (s.icon ? ' icon' : '') + (s.wearied ? ' dim' : '');
    d.textContent = s.value;
    _labelSuccessDie(d, s.value, !!s.icon);
    diceDiv.appendChild(d);
  });

  const totEl = document.getElementById('result-total');
  totEl.setAttribute('aria-hidden', 'true');   // the banner says the total; the counting digits need not
  totEl.textContent = isAutoSuccess ? '★' : (isAutoFail ? '✗' : total);
  if (!isAutoSuccess && !isAutoFail) countUpNumber(totEl, total, 180 + 120 * successRolls.length);
  // round 5: the Eye leaves an ink blot; a great or extraordinary result catches the light
  resultEl.classList.remove('ink-eye', 'gilt'); void resultEl.offsetWidth;
  if (chosenFeat && chosenFeat.special === 'eye') resultEl.classList.add('ink-eye');
  // Feel: the dice tumble in, the card takes the outcome's colour, and phones that can buzz do.
  diceDiv.classList.remove('dice-tumble'); void diceDiv.offsetWidth; diceDiv.classList.add('dice-tumble');
  resultEl.classList.toggle('res-success', outcome.startsWith('SUCCESS'));
  resultEl.classList.toggle('res-fail', !outcome.startsWith('SUCCESS'));
  try { if (navigator.vibrate) navigator.vibrate(outcome.startsWith('SUCCESS') ? 12 : [8, 40, 8]); } catch (e) {}
  renderRollBanner({ ok: outcome.startsWith('SUCCESS') && !isAutoFail, level, total, tn, isAutoSuccess, isAutoFail, icons,
    piercing: piercing && outcome.startsWith('SUCCESS') && diceState.isAttack, what: skillLabel || '', isAttack: !!diceState.isAttack });

  const tnLabel = foeParryBonus > 0 ? `${tn} (${baseTn} Str + ${foeParryBonus} Foe Parry)` : `${tn}`;
  // Lead with WHAT was rolled (quick rolls pass the skill/prof name; manual rolls have none).
  // The banner above says the verdict; this head line stays for screen readers and history.
  let summary = `<span class="rs-head"><strong>${skillLabel ? escapeHtml(skillLabel) + ' · ' : ''}vs TN ${tnLabel}</strong> — `;
  summary += outcome.startsWith('SUCCESS')
    ? `<span class="result-tag tag-success">${outcomeWords(outcome)}</span>`
    : `<span class="result-tag tag-fail">${outcomeWords(outcome)}</span>`;
  if (level === 'Great') summary += `<span class="result-tag tag-great">Great Success</span>`;
  if (level === 'Extraordinary') summary += `<span class="result-tag tag-extra">Extraordinary</span>`;
  if (icons > 0) summary += `<br><small>${icons} success icon${icons>1?'s':''}</small>`;
  summary += '</span>';
  if (diceState.stanceNote) summary += `<br><small style="color:var(--gold);font-weight:600">Modifier:${diceState.stanceNote}</small>`;
  // Favoured/Ill-Favoured cancellation tag (RAW p.20)
  {
    const autoFavs = diceState.autoFavSources || [];
    const autoIlls = diceState.autoIllSources || [];
    const hasFav = autoFavs.length > 0 || diceState.fav === 'fav';
    const hasIll = autoIlls.length > 0 || diceState.fav === 'ill';
    if (hasFav && hasIll) {
      const favList = [...autoFavs, ...(diceState.fav === 'fav' ? ['Manual Favoured'] : [])].join(', ');
      const illList = [...autoIlls, ...(diceState.fav === 'ill' ? ['Manual Ill'] : [])].join(', ');
      summary += `<br><span class="result-tag" style="background:var(--btn-warn-bg);color:white">⚖ Cancelled: ${favList} ⇄ ${illList} → rolled Normal</span>`;
    } else if (hasIll && autoIlls.length > 0) {
      summary += `<br><span class="result-tag" style="background:var(--btn-alert-bg);color:white">⚠ Ill-Favoured: ${autoIlls.join(', ')}</span>`;
    }
  }
  // Hope-spend / Magical Success / Keen modifiers shown in summary
  if (diceState.hopeSpend) summary += `<br><span class="result-tag" style="background:var(--gold);color:white">✨ Hope spent (+1d)</span>`;
  if (diceState.magical) summary += `<br><span class="result-tag" style="background:var(--gold);color:white">★ Magical Success (1 Hope)</span>`;
  if (diceState.keen) summary += `<br><span class="result-tag" style="background:var(--btn-secondary-bg);color:white">🗡️ Keen (PB on 9+)</span>`;
  if (diceState.inspired && diceState.hopeSpend) {
    const srcEmoji = diceState.inspiredSource === 'Brave at a Pinch' ? '🌲' : '✨';
    summary += `<br><span class="result-tag" style="background:var(--green-soft);color:white">${srcEmoji} Inspired (${diceState.inspiredSource}) — Hope bonus +2d</span>`;
  } else if (diceState.inspired && !diceState.hopeSpend) {
    summary += `<br><span class="result-tag" style="background:var(--text-muted);color:white">⚠️ Inspired (${diceState.inspiredSource}) — no Hope spent, so no bonus this roll</span>`;
  }
  if (diceState.support === '1d') summary += `<br><span class="result-tag" style="background:var(--brown-soft);color:white">🤝 Supported by ally (+1d)</span>`;
  if (diceState.support === '2d') summary += `<br><span class="result-tag" style="background:var(--brown-soft);color:white">🤝 Supported by Focus-holder (+2d)</span>`;
  if (piercing && outcome.startsWith('SUCCESS') && diceState.isAttack) summary += `<br><span class="result-tag tag-pierce">Piercing Blow possible</span>`;
  if (diceState.combatTask) summary += `<br><span class="result-tag" style="background:var(--red);color:white">⚔️ ${diceState.combatTask}</span>`;
  if (diceState.shadowTest) {
    const reduction = outcome.startsWith('SUCCESS') && !isAutoFail ? (1 + icons) : 0;
    const verdict = reduction > 0
      ? `Reduce incoming Shadow by <strong>${reduction}</strong> (1 + ${icons} icon${icons!==1?'s':''})`
      : `No reduction — full Shadow gain applies`;
    summary += `<br><span class="result-tag" style="background:var(--btn-alert-bg);color:white">🌑 ${diceState.shadowTest} test: ${verdict}</span>`;
    // One-tap apply: enter the Loremaster's incoming Shadow, apply (incoming − reduction).
    summary += `<div id="shadow-apply-row" style="margin-top:6px;display:flex;gap:6px;align-items:center;flex-wrap:wrap;font-size:var(--fs-xs)">
      <span>Incoming Shadow:</span>
      <input id="shadow-incoming" type="number" min="0" value="${diceState.shadowTest === 'Sorcery' ? 2 : 1}" style="width:48px;padding:3px 5px;border:1px solid var(--border);border-radius:var(--r-sm);background:var(--bg-deep);color:var(--ink)">
      <button onclick="applyShadowTestResult(${reduction})" style="background:var(--btn-alert-bg);color:white;border:none;border-radius:var(--r-sm);padding:5px 10px;font-weight:600;cursor:pointer">Apply Shadow</button>
    </div>`;
  }
  if (diceState.firstAid) {
    const fa = applyFirstAidResult(outcome.startsWith('SUCCESS') && !isAutoFail, icons);
    summary += fa.after < fa.before || fa.mended
      ? `<br><span class="result-tag" style="background:var(--success-text);color:white">⛑️ First Aid: ${fa.mended ? 'the wound is mended — no longer Wounded' : `${fa.before} → ${fa.after} days to mend`}</span>`
      : `<br><span class="result-tag" style="background:var(--error-text);color:white">⛑️ First Aid failed — try again after a day has passed</span>`;
    render();
  }
  document.getElementById('result-summary').innerHTML = summary;

  // Pierce special damage (Core Rules p.99): on a successful attack with Swords/Bows/Spears and
  // success icons remaining, spend 1 ✦ to push Feat +1/+2/+3 (max 10) — can trigger Piercing Blow.
  const pierceTable = { Swords: 1, Bows: 2, Spears: 3 };
  const pierceBonus = pierceTable[diceState.lastAttackProf];
  const pierceEligible = diceState.isAttack && pierceBonus && icons > 0
    && chosenFeat.value < 10 && !chosenFeat.special && !isAutoFail
    && outcome.startsWith('SUCCESS');
  const pierceDiv = document.getElementById('pierce-action');
  if (pierceDiv) {
    if (pierceEligible) {
      diceState.pendingPierce = {
        oldFeat: chosenFeat.value,
        oldTotal: total,
        oldIcons: icons,
        bonus: pierceBonus,
        profName: diceState.lastAttackProf,
        tn,
        isAutoFail,
        successDiceVisualTotal: successRolls.reduce((sum, s) => sum + (s.wearied ? 0 : s.value), 0)
      };
      const newFeat = Math.min(10, chosenFeat.value + pierceBonus);
      const piercedNow = newFeat === 10 ? ' = <strong>Piercing Blow!</strong>' : '';
      pierceDiv.innerHTML = `<button onclick="applyPierce()" style="background:var(--warn-orange);color:white;border:none;border-radius:var(--r-sm);padding:8px 14px;font-size:var(--fs-sm);font-weight:600;cursor:pointer">🗡️ Pierce: spend 1 ✦ (${diceState.lastAttackProf} +${pierceBonus}) → Feat ${chosenFeat.value}→${newFeat}${piercedNow}</button>`;
    } else {
      pierceDiv.innerHTML = '';
      diceState.pendingPierce = null;
    }
  }

  // Solo modes (Strider / Moria): Eye-Awareness auto-increment hooks.
  // RAW: "Raise the Eye Awareness by 1 point whenever a die roll made by a player outside of
  // combat produces an [Eye] icon, regardless of whether the roll resulted in a success or a
  // failure." A RUNE does not raise it — it triggers the Fortune table, which can LOWER it by 1.
  // (The old code added +1 on a Rune too, which both invented a gain and cancelled that loss.)
  if (isSolo() && !diceState.isAttack) {
    let eaDelta = 0;
    if (chosenFeat.special === 'eye') eaDelta += 1;
    if (diceState.magical) eaDelta += 1;
    if (eaDelta > 0) {
      raiseEye(eaDelta);
      saveCharacter();   // persist — rollDice's earlier saveCharacter() runs before this hook
      refreshEyeOfMordor();
      // Tag in summary so the player sees the bump
      const sEl = document.getElementById('result-summary');
      if (sEl) sEl.innerHTML += `<br><span class="result-tag" style="background:var(--btn-alert-bg);color:white">👁️ Eye Awareness +${eaDelta}</span>`;
    }
  }

  // Strider Mode: Special Success spends. Show 6 buttons if successful with ≥1 ✦ icon.
  if (char.striderMode && outcome.startsWith('SUCCESS') && !isAutoFail && icons > 0) {
    renderSpecialSuccessPanel(icons);
  } else {
    const panel = document.getElementById('strider-special-success');
    if (panel) panel.style.display = 'none';
  }

  // Solo modes (Strider / Moria): auto Fortune / Ill-Fortune prompt on Rune (success) / Eye (failure).
  // Appends a one-tap button below the result summary that rolls the matching table inline.
  if (isSolo()) {
    const summaryEl = document.getElementById('result-summary');
    // Clear any prior auto-fortune action
    const existing = document.getElementById('strider-fortune-action');
    if (existing) existing.remove();
    // RAW: the tables "offer prompts for narrative outcomes when a [Gandalf] rune or [Eye] icon is
    // rolled on your Feat die" — no success/failure condition. They are optional, and meant "for
    // worthy challenges and key actions", so this is an offer rather than an automatic roll.
    let fortuneType = null;
    if (chosenFeat.special === 'rune') fortuneType = 'fortune';
    else if (chosenFeat.special === 'eye') fortuneType = 'illfortune';
    if (fortuneType) {
      const btn = document.createElement('div');
      btn.id = 'strider-fortune-action';
      btn.style.cssText = 'margin-top:8px;text-align:center';
      const isIll = fortuneType === 'illfortune';
      btn.innerHTML = `<button onclick="rollAutoFortune('${fortuneType}')" style="background:${isIll?'var(--btn-alert-bg)':'var(--gold)'};color:white;border:none;border-radius:var(--r-sm);padding:8px 14px;font-size:var(--fs-sm);font-weight:600;cursor:pointer">${isIll?'🎲 Roll Ill-Fortune Table (Eye)':'🎲 Roll Fortune Table (Rune)'}</button><div class="hint" style="margin-top:4px">Optional — for a worthy challenge or a key action, not every routine roll.</div>`;
      summaryEl.parentElement.appendChild(btn);
    }
  }

  // History — annotate Hope spends + stance + brave
  const hopeTag = diceState.magical ? ' ★mag' : (diceState.hopeSpend ? ' ✨+1d' : '');
  const braveTag = (diceState.inspired && diceState.hopeSpend)
    ? (diceState.inspiredSource === 'Brave at a Pinch' ? ' 🌲Inspired+2d' : ' ✨Inspired+2d')
    : '';
  const stanceTag = diceState.stanceNote || '';
  const label = (skillLabel || `${successCount}d ${diceState.tn.toUpperCase()}`) + hopeTag + braveTag + stanceTag;
  history.unshift({
    label, total: isAutoSuccess ? '★' : (isAutoFail ? '✗' : total),
    outcome, tn, icons,
    feat: chosenFeat.special || featValue, dice: successRolls.map(s => s.value),
    time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})
  });
  saveHistory();
  renderHistory();
  // A quick roll made from ▶ Play belongs in Play's story too, not only in the result drawer.
  if (typeof playRollNote === 'function') playRollNote(label, isAutoSuccess ? '★' : (isAutoFail ? '✗' : total), tn, outcome, icons);
  if (typeof journalAuto === 'function') journalAuto('dice', 'roll', `${label} — ${isAutoSuccess ? '★' : (isAutoFail ? '✗' : total)} vs ${tn} → ${outcomeWords(outcome)}${icons ? ' (' + icons + '✦)' : ''}`);
  if (typeof tablePostRoll === 'function') tablePostRoll({ label, skill: skillLabel, total: isAutoSuccess ? '★' : (isAutoFail ? '✗' : total), tn, outcome, icons });   // the table feed (group play)

  // Mirror an attack roll into the active Chronicle Combat Log: auto-append an editable round
  // built from the roll, and apply the equipped weapon's Damage to the foe's Endurance on a hit.
  if (diceState.isAttack && typeof activeCombat === 'function' && journal) {
    const combat = activeCombat();
    if (combat) {
      const prof = diceState.lastAttackProf || label;
      // Pick the equipped weapon for this proficiency (highest Damage if several) to size the hit.
      const wpns = (char.weapons || []).filter(w => w.prof === prof && (parseInt(w.dmg) || 0) > 0);
      const wpn = wpns.sort((a, b) => (parseInt(b.dmg) || 0) - (parseInt(a.dmg) || 0))[0] || null;
      const hit = outcome.startsWith('SUCCESS') && !isAutoFail;
      const stance = char.stance ? char.stance + ' · ' : '';
      const score = isAutoSuccess ? '★' : (isAutoFail ? '✗' : total);
      let line = `${stance}${wpn ? wpn.name : prof} · ${score} vs ${tn} → ${outcomeWords(outcome)}${icons ? ` (${icons}✦)` : ''}`;
      if (hit && wpn) {
        const dmg = parseInt(wpn.dmg) || 0;
        combat.endCur = Math.max(0, (parseInt(combat.endCur) || 0) - dmg);
        line += ` · −${dmg} End → ${combat.endCur}/${combat.endMax}`;
        if (piercing && icons > 0 && wpn.inj && wpn.inj !== '—') line += ` · Piercing Blow possible (foe Protection vs ${wpn.inj})`;
      } else if (hit && !wpn) {
        line += ` · (no weapon for ${prof} — adjust End manually)`;
      }
      combat.rounds.push({ hero: line, foe: '' });
      saveJournal();
      const panel = document.getElementById('panel-chronicle');
      if (panel && panel.classList.contains('active')) renderChronicle();
    }
  }

  // Reset Hope spend / Magical / stance / Keen / Brave / isAttack / combatTask state and refresh UI
  diceState.hopeSpend = false;
  diceState.magical = false;
  diceState.keen = false;
  diceState.inspired = false;
  diceState.inspiredSource = '';
  diceState.isAttack = false;
  diceState.stanceNote = '';
  diceState.combatTask = '';
  diceState.shadowTest = '';
  diceState.firstAid = false;
  diceState.dragonSlayer = false;
  diceState.autoFavSources = [];
  diceState.autoIllSources = [];
  diceState.support = 'none';
  diceState.queuedAdvantage = 0;  // Consumed by this roll
  // Visually reset support seg-btns to "None"
  document.querySelectorAll('#support-pick .seg-btn').forEach(x => x.classList.toggle('active', x.dataset.val === 'none'));
  refreshKeenButton();
  refreshBraveButton();
  refreshInvokeDFButton();
  refreshConditionalVirtueButtons();
  refreshFavCancelHint();
  refreshHopeButtons();
  setText('hope-cur-v', char.hopeCur);
  renderConditionWarnings();
}

// U13 — read-only roll insight over the stored history (last 30 rolls per hero).
function renderRollStats() {
  const el = document.getElementById('roll-stats'); if (!el) return;
  const n = history.length;
  if (!n) { el.innerHTML = ''; return; }
  const succ = history.filter(h => (h.outcome || '').startsWith('SUCCESS')).length;
  const withIcons = history.filter(h => (h.icons || 0) >= 1).length;
  const great = history.filter(h => (h.icons || 0) >= 2).length;
  const rate = Math.round(succ / n * 100);
  el.innerHTML = `<div style="font-size:var(--fs-xs);color:var(--text-muted);background:var(--bg-deep);border:1px solid var(--border);border-radius:var(--r-sm);padding:6px 9px;margin-bottom:8px;display:flex;flex-wrap:wrap;gap:4px 12px">
    <span>📊 <strong>${n}</strong> rolls</span>
    <span>✅ <strong>${succ}</strong> (<strong>${rate}%</strong>)</span>
    <span>❌ ${n - succ}</span>
    <span>✦ ${withIcons} with icons</span>
    <span>🌟 ${great} great+</span></div>`;
}
function renderHistory() {
  renderRollStats();
  const div = document.getElementById('roll-history');
  if (!div) return;
  div.innerHTML = '';
  if (history.length === 0) {
    div.innerHTML = emptyState('No rolls yet — tap a skill above to make your first.', 'dice', { label: 'Roll any skill…', fn: 'openAllRolls()' });
    return;
  }
  // Filters
  const q = (document.getElementById('history-search')?.value || '').toLowerCase().trim();
  const outFilter = document.getElementById('history-outcome')?.value || 'all';
  let rows = history;
  if (q) rows = rows.filter(h => (h.label || '').toLowerCase().includes(q));
  if (outFilter === 'success') rows = rows.filter(h => h.outcome.startsWith('SUCCESS'));
  else if (outFilter === 'fail') rows = rows.filter(h => !h.outcome.startsWith('SUCCESS'));
  if (rows.length === 0) {
    div.innerHTML = '<div style="text-align:center;color:var(--text-faint);padding:10px;font-size:var(--fs-xs)">No matching rolls</div>';
    return;
  }
  rows.slice(0, 20).forEach(h => {
    const item = document.createElement('div');
    item.className = 'history-item';
    const color = h.outcome.startsWith('SUCCESS') ? '#2e7d32' : 'var(--error-text)';
    // Real index into the full history array (rows is filtered/sliced; object identity maps back).
    const realIdx = history.indexOf(h);
    // Round 8: a ledger row — the Feat die in miniature, the Success dice as pips, a seal for the outcome
    const ok = /^SUCCESS/.test(h.outcome || ''), rolled = h.tn !== '' && h.tn != null;
    const lvl = /extraordinary/i.test(h.outcome) || (h.icons || 0) >= 2 ? 'extraordinary' : (/great/i.test(h.outcome) || (h.icons || 0) === 1) ? 'great' : '';
    item.classList.add('ledger', rolled ? (ok ? 'ok' : 'bad') : 'note');
    item.innerHTML = `
      ${rolled ? `<span class="hl-feat${h.feat === 'eye' ? ' eye' : h.feat === 'rune' ? ' rune' : ''}" aria-hidden="true">${h.feat === 'eye' ? '<svg viewBox="0 0 24 24"><use href="#i-eye"/></svg>' : h.feat === 'rune' ? 'ᚱ' : (h.feat != null ? h.feat : (h.total === '★' ? 'ᚱ' : ''))}</span>` : '<span class="hl-feat blank" aria-hidden="true"></span>'}
      <span class="hl-main"><strong>${h.label}</strong><small>${rolled ? `${h.total} vs ${h.tn}` : ''}${Array.isArray(h.dice) && h.dice.length ? ` <span class="hl-pips" aria-hidden="true">${h.dice.map(v => `<i class="${v === 6 ? 'six' : ''}"></i>`).join('')}</span>` : ''}</small></span>
      <span class="hl-end" style="color:${color}">${rolled && typeof rollStamp === 'function' ? `<span class="hl-seal">${rollStamp(ok, lvl)}</span>` : ''}<span class="hl-out">${outcomeWords(h.outcome)}${h.icons ? ' · '+h.icons+'⬢' : ''}</span><span class="hl-time">${h.time}</span>
        <button onclick="deleteRollAt(${realIdx})" aria-label="Delete this roll" title="Delete this roll" style="background:none;border:none;color:var(--text-faint);cursor:pointer;font-size:var(--fs-md);padding:0 0 0 6px;vertical-align:middle">×</button></span>
    `;
    div.appendChild(item);
  });
}

// Delete one stored roll (× on a history row). Index is into the FULL history array.
function deleteRollAt(i) {
  if (i < 0 || i >= history.length) return;
  history.splice(i, 1);
  saveHistory();
  renderHistory();
}
// Delete the whole roll history for the active hero (🗑 Clear button; confirmed).
async function clearRollHistory() {
  if (!history.length) { alert('No rolls to clear.'); return; }
  if (!await confirmStyled(`Delete all ${history.length} stored roll(s) for this hero? This cannot be undone.`, 'Clear Roll History', {yes:'Clear roll history', no:'Keep it'})) return;
  history.length = 0;
  saveHistory();
  renderHistory();
}

/* ---------- INIT ---------- */
/* ============================ INTERACTIVE TUTORIAL ============================
   Lessons menu (☰ → 📖 Tutorial + first-run offer). Each lesson runs on ONE shared
   sandbox practice hero (a real roster entry, swapped in and restored/kept on exit),
   taught with a dim+cutout spotlight and tap-Next/Back/Skip/Exit. Steps degrade
   gracefully: if a step's target control isn't found (or is hidden), the card just
   centers — the tour can never get stuck. Progress (✓ + resume) persists per device. */
const TUTORIAL_KEY = 'tor2e-tutorial';
function loadTutProgress() { try { return JSON.parse(localStorage.getItem(TUTORIAL_KEY)) || {}; } catch (e) { return {}; } }
function saveTutProgress(p) { try { localStorage.setItem(TUTORIAL_KEY, JSON.stringify(p)); } catch (e) {} }
let _tutState = null;            // { lessonId, lessonTitle, step, steps } while a lesson is running
// window._tutSandbox = { prevActiveId, practiceId } while the tutorial session owns the active hero

// Fill a blank practice hero with a ready, equipped Barding warden — unless one was already built.
function _tutBuildIfBlank(c) {
  if (c.culture) return;  // already built (e.g. via the Creation lesson) — keep the player's work
  Object.assign(c, {
    name: 'Beran (Practice)', gender: 'Male', culture: 'Bardings', calling: 'Warden', shadowPath: 'Path of Despair',
    strRating: 5, hrtRating: 4, witRating: 3, strTN: 15, hrtTN: 16, witTN: 17,
    endMax: 30, endCur: 30, hopeMax: 12, hopeCur: 12, shadow: 0, scars: 0, parry: 3, shieldTotal: 0,
    valour: 2, wisdom: 1, fellowshipRating: 0, skillPts: 0, advPts: 0, treasure: 10,
    armourProt: 2, helmProt: 0, armourNotes: 'Mail shirt',
    profs: { Axes: 0, Bows: 1, Spears: 2, Swords: 0 },
    weapons: [{ name: 'Spear', dmg: '4', inj: '14', prof: 'Spears', picked: true }, { name: 'Long-bow', dmg: '4', inj: '16', prof: 'Bows', picked: true }]
  });
}
const TUT_SANDBOX_KEY = 'tor2e-tut-sandbox';   // survives a reload so a half-finished tutorial can be unwound
function _tutEnterSandbox() {
  if (window._tutSandbox) return;
  saveCharacter();
  const prevActiveId = activeCharId;
  const id = genCharId();
  activeCharId = id;
  char = JSON.parse(JSON.stringify(DEFAULT_CHARACTER));
  char.name = 'Practice Hero';
  history = []; journal = defaultJournal();
  const r = loadRoster() || { activeId: prevActiveId, list: [] };
  r.list.push({ id, name: char.name }); r.activeId = id; saveRoster(r);
  localStorage.setItem(CHAR_PREFIX + id, JSON.stringify(char));
  saveHistory(); saveJournal();
  window._tutSandbox = { prevActiveId, practiceId: id };
  // Persist it: the sandbox lived only in memory, so closing the app mid-tutorial left the player
  // reopening AS the practice hero with their real character inactive and no explanation.
  try { localStorage.setItem(TUT_SANDBOX_KEY, JSON.stringify(window._tutSandbox)); } catch (e) {}
  if (typeof clearUndo === 'function') clearUndo();
  render(); renderHistory(); renderChronicle();
}
async function _tutExitSandbox() {
  const sb = window._tutSandbox; if (!sb) { return; }
  saveCharacter();
  // A bare [OK] [Cancel] on a choice about someone's character is not a choice anyone should have
  // to guess at — the buttons say what they do.
  const keep = await showModal({
    title: '📖 Tutorial finished',
    message: `What should happen to your practice hero, <strong>${escapeHtml(char.name || 'the hero')}</strong>?<br><br>Either way, the character you were playing before comes back.`,
    buttons: [
      { label: '💾 Keep — add to my roster', value: true },
      { label: '🗑 Discard the practice hero', value: false, style: 'background:var(--btn-secondary-bg);color:white;border:none;border-radius:var(--r-sm);padding:10px;font-size:var(--fs-md);cursor:pointer' }
    ]
  }) === true;
  if (keep) {
    char.name = (char.name || 'Hero').replace(/\s*\(Practice\)\s*/i, '').trim() || 'Hero';
    if (char.name === 'Practice Hero') char.name = 'Hero';
    saveCharacter();  // leaves it active, in the roster, renamed
  } else {
    if (typeof Sync !== 'undefined' && Sync.deleteChar) Sync.deleteChar(sb.practiceId);   // or the cloud copy comes back
    localStorage.removeItem(CHAR_PREFIX + sb.practiceId);
    localStorage.removeItem(ROLLS_PREFIX + sb.practiceId);
    localStorage.removeItem(JOURNAL_PREFIX + sb.practiceId);
    const r = loadRoster();
    if (r) {
      r.list = r.list.filter(e => e.id !== sb.practiceId);
      r.activeId = (sb.prevActiveId && r.list.some(e => e.id === sb.prevActiveId)) ? sb.prevActiveId : (r.list[0] && r.list[0].id);
      if (!r.list.length) { const nid = genCharId(); r.list.push({ id: nid, name: 'New Hero' }); r.activeId = nid; localStorage.setItem(CHAR_PREFIX + nid, JSON.stringify(DEFAULT_CHARACTER)); }
      saveRoster(r);
      activeCharId = r.activeId;
    }
    applyActiveCharacter();
  }
  window._tutSandbox = null;
  try { localStorage.removeItem(TUT_SANDBOX_KEY); } catch (e) {}
}

/* Recovery: a persisted sandbox with no tutorial running means the app was closed mid-lesson.
   Offer the same Keep/Discard choice the tutorial would have, instead of silently leaving the
   player on a practice hero. */
async function _tutRecoverSandbox() {
  if (window._tutSandbox) return;
  let sb = null;
  try { sb = JSON.parse(localStorage.getItem(TUT_SANDBOX_KEY) || 'null'); } catch (e) {}
  if (!sb || !sb.practiceId) return;
  // Nothing to recover if the practice hero is already gone.
  if (!localStorage.getItem(CHAR_PREFIX + sb.practiceId)) { try { localStorage.removeItem(TUT_SANDBOX_KEY); } catch (e) {} return; }
  const roster = loadRoster() || { list: [] };
  const prev = (roster.list || []).find(e => e.id === sb.prevActiveId);
  const practice = (roster.list || []).find(e => e.id === sb.practiceId);
  window._tutSandbox = sb;                       // let _tutExitSandbox do the actual work
  await alertStyled(
    'You closed the app while the <strong>tutorial</strong> was open, so you are currently on its ' +
    'practice hero' + (practice ? ' — <strong>' + escapeHtml(practice.name) + '</strong>' : '') + '.<br><br>' +
    'Your own character' + (prev ? ' <strong>' + escapeHtml(prev.name) + '</strong>' : '') + ' is safe in your roster. ' +
    'Choose next whether to keep the practice hero or discard it.',
    '📖 Tutorial was still open');
  await _tutExitSandbox();
}

/* ----- the Lessons menu ----- */
function openTutorial() {
  const m = document.getElementById('menu-overlay'); if (m) m.classList.remove('show');
  // the practice hero is made when a lesson starts (tutStartLesson) — just looking at the list
  // used to swap your hero out and then ask whether to keep a practice hero you never used
  renderTutMenu();
}
function _tutCloseMenu() { const m = document.getElementById('tut-menu'); if (m) m.classList.remove('show'); }
function renderTutMenu() {
  let ov = document.getElementById('tut-menu');
  if (!ov) { ov = document.createElement('div'); ov.id = 'tut-menu'; ov.className = 'menu-overlay'; document.body.appendChild(ov); }
  const prog = loadTutProgress();
  const items = TUTORIAL_LESSONS.map(l => {
    const done = prog.completed && prog.completed[l.id];
    const resume = prog.resume && prog.resume.lessonId === l.id;
    const tag = done ? '✓ done' : (resume ? 'Resume' : 'Start');
    return `<button onclick="tutStartLesson('${l.id}')" class="add-row-btn" style="width:100%;text-align:left;margin-bottom:6px;background:var(--bg-deep);color:var(--ink);font-size:var(--fs-sm);display:flex;align-items:center;gap:9px;padding:9px 10px">
        <span style="font-size:var(--fs-lg);flex:0 0 auto">${l.icon}</span>
        <span style="flex:1;min-width:0"><strong>${escapeHtml(l.title)}</strong><br><span style="font-size:var(--fs-xs);color:var(--text-muted)">${escapeHtml(l.sub || '')}</span></span>
        <span style="font-size:var(--fs-xs);font-weight:600;color:${done ? 'var(--gold)' : 'var(--text-faint)'}">${tag}</span>
      </button>`;
  }).join('');
  ov.innerHTML = `<div class="menu" style="max-width:400px;width:93%;max-height:90vh;overflow-y:auto">
      <h3 style="margin-top:0">Learn the Game</h3>
      <p class="hint" style="text-align:left;margin:0 0 10px">Lessons run on a safe <strong>practice hero</strong> — your real characters aren't touched. Pick any topic.</p>
      ${items}
      <button onclick="tutDone()" class="close add-row-btn" style="width:100%;margin-top:8px;background:var(--btn-secondary-bg);color:white">Done — exit tutorial</button>
      <button onclick="resetTutorial()" class="add-row-btn" style="width:100%;margin-top:6px;background:none;border:1px solid var(--border);color:var(--text-muted);font-size:var(--fs-xs)">↺ Reset tutorial progress</button>
    </div>`;
  ov.classList.add('show');
}
// Clear all tutorial progress (✓ completed marks + resume points) and re-arm the first-run welcome.
async function resetTutorial() {
  if (!await confirmStyled(`Reset the whole tutorial?<br><br>This clears every ✓ completed mark and resume point, and the one-time welcome offer will appear again. Your characters are not affected.`, '↺ Reset Tutorial', {yes:'Reset tutorial', no:'Keep progress'})) return;
  try { localStorage.removeItem(TUTORIAL_KEY); } catch (e) {}
  renderTutMenu();
  alert('Tutorial reset — all lessons are marked unread again.');
}
async function tutDone() {
  _tutClearPoll(); _tutHidePill();
  _tutCloseMenu(); _tutHideSpotlight(); _tutState = null;
  await _tutExitSandbox();
}

/* ----- running a lesson ----- */
function tutStartLesson(id) {
  const lesson = TUTORIAL_LESSONS.find(l => l.id === id); if (!lesson) return;
  if (!window._tutSandbox) _tutEnterSandbox();
  if (lesson.prep) { try { lesson.prep(char); } catch (e) {} saveCharacter(); }
  if (typeof refreshStriderUI === 'function') refreshStriderUI();
  render();
  _tutState = { lessonId: id, lessonTitle: lesson.title, step: 0, steps: lesson.steps };
  const prog = loadTutProgress();
  if (prog.resume && prog.resume.lessonId === id && prog.resume.step > 0 && prog.resume.step < lesson.steps.length) _tutState.step = prog.resume.step;
  _tutCloseMenu();
  _tutRender();
}
function _tutSaveResume() { if (!_tutState) return; const p = loadTutProgress(); p.resume = { lessonId: _tutState.lessonId, step: _tutState.step }; saveTutProgress(p); }
function tutNext() { const s = _tutState; if (!s) return; if (s.step >= s.steps.length - 1) { tutComplete(); return; } s.step++; _tutSaveResume(); _tutRender(); }
function tutPrev() { const s = _tutState; if (!s || s.step <= 0) return; s.step--; _tutSaveResume(); _tutRender(); }
function tutComplete() {
  const s = _tutState; if (!s) return;
  _tutClearPoll(); _tutHidePill();
  const p = loadTutProgress(); p.completed = p.completed || {}; p.completed[s.lessonId] = true;
  if (p.resume && p.resume.lessonId === s.lessonId) delete p.resume;
  saveTutProgress(p);
  _tutHideSpotlight(); _tutState = null; renderTutMenu();
}
function tutExit() {
  _tutClearPoll(); _tutHidePill();
  if (_tutState) { const p = loadTutProgress(); p.resume = { lessonId: _tutState.lessonId, step: _tutState.step }; saveTutProgress(p); }
  _tutHideSpotlight(); _tutState = null; renderTutMenu();
}

/* ----- spotlight rendering ----- */
function _tutEnsureDom() {
  if (document.getElementById('tut-overlay')) return;
  const ov = document.createElement('div'); ov.id = 'tut-overlay';
  // No dimming: the page stays fully visible & usable. The container is pointer-transparent;
  // only the floating card catches taps. #tut-hole is a glowing border FRAME around the
  // section the step talks about (not a cutout).
  ov.style.cssText = 'position:fixed;inset:0;z-index:1000;display:none;pointer-events:none';
  const hole = document.createElement('div'); hole.id = 'tut-hole';
  hole.style.cssText = 'position:fixed;left:50%;top:50%;width:0;height:0;border-radius:12px;border:3px solid var(--gold);box-shadow:0 0 0 3px rgba(212,166,53,.30), 0 0 16px rgba(212,166,53,.55);pointer-events:none;transition:all .18s ease;display:none';
  const card = document.createElement('div'); card.id = 'tut-card';
  card.style.cssText = 'position:fixed;max-width:340px;width:88%;background:var(--bg);border:2px solid var(--gold);border-radius:12px;padding:0 16px 14px;box-shadow:0 10px 38px rgba(0,0,0,.5);font-size:var(--fs-md);color:var(--ink);box-sizing:border-box;pointer-events:auto';
  ov.appendChild(hole); ov.appendChild(card);
  document.body.appendChild(ov);
  // Floating "Return to tutorial" pill, shown while the tour has stepped aside (hands-on mode).
  if (!document.getElementById('tut-pill')) {
    const pill = document.createElement('button'); pill.id = 'tut-pill';
    pill.onclick = tutReturn;
    pill.style.cssText = 'position:fixed;left:50%;bottom:calc(16px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:1001;display:none;background:var(--gold);color:var(--ink);border:2px solid var(--gold);border-radius:24px;padding:11px 20px;font-size:var(--fs-md);font-weight:700;box-shadow:0 4px 18px rgba(0,0,0,.45);cursor:pointer;max-width:90%';
    document.body.appendChild(pill);
  }
}
// Make the floating card draggable by its header bar (pointer events cover mouse + touch).
function _tutBindDrag() {
  const card = document.getElementById('tut-card');
  const handle = document.getElementById('tut-drag');
  if (!card || !handle) return;
  handle.style.touchAction = 'none';
  handle.onpointerdown = (e) => {
    if (e.target.closest('button')) return;   // the × button still works
    e.preventDefault();
    const r = card.getBoundingClientRect();
    const offX = e.clientX - r.left, offY = e.clientY - r.top;
    const move = (ev) => {
      card.style.transform = 'none';
      card.style.left = Math.max(0, Math.min(window.innerWidth - r.width, ev.clientX - offX)) + 'px';
      card.style.top = Math.max(0, Math.min(window.innerHeight - 40, ev.clientY - offY)) + 'px';
      if (_tutState) _tutState.dragged = true;   // keep the user's position until the next step
    };
    const up = () => { document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up); };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
  };
}
function _tutHideSpotlight() { const o = document.getElementById('tut-overlay'); if (o) o.style.display = 'none'; }
function _tutShowPill(text) { _tutEnsureDom(); const p = document.getElementById('tut-pill'); if (p) { p.textContent = text || '↩ Return to tutorial'; p.style.display = 'block'; } }
function _tutHidePill() { const p = document.getElementById('tut-pill'); if (p) p.style.display = 'none'; }
// Step the tutorial fully aside: clear the dim + card so the whole page is usable; leave a Return pill.
function tutStepAside() {
  if (!_tutState) return;
  _tutState.aside = true;
  _tutHideSpotlight();
  _tutShowPill('↩ Return to tutorial');
  // The done-poll started in _tutRender keeps running; on completion it auto-advances (auto-return).
}
// Come back from hands-on mode: if the step's action is done, advance; otherwise re-show the same step.
function tutReturn() {
  const s = _tutState; if (!s) { _tutHidePill(); return; }
  _tutHidePill();
  s.aside = false;
  const step = s.steps[s.step];
  let done = false; try { done = step.done ? !!step.done(char, s.baseline) : false; } catch (e) {}
  if (done) tutNext(); else _tutRender();
}
function _tutCardHtml(step, s, wasDone) {
  const n = s.step + 1, total = s.steps.length;
  const intro = step.intro ? `<div style="font-style:italic;color:var(--gold);margin-bottom:8px;font-size:var(--fs-sm);line-height:1.5">${step.intro}</div>` : '';
  const title = step.title ? `<div style="font-weight:700;margin-bottom:4px">${step.title}</div>` : '';
  const more = step.more ? `<details style="margin-top:8px"><summary style="cursor:pointer;color:var(--gold);font-size:var(--fs-xs)">Tell me more</summary><div style="margin-top:6px;font-size:var(--fs-sm);color:var(--text-muted);line-height:1.55">${step.more}</div></details>` : '';
  // Interactive steps have a `done` predicate. The "Try it" button steps the tutorial fully aside
  // (clears the dim + card) so you can act on the real page; a Return pill brings it back, and it
  // also auto-returns the moment the action is done. Already-satisfied steps just say so.
  const cue = step.done
    ? (wasDone
      ? `<div style="margin-top:9px;font-size:var(--fs-xs);color:var(--text-muted);background:var(--bg-deep);border-radius:var(--r-sm);padding:6px 8px">✓ Already done — tap <strong>Next</strong> to go on.</div>`
      : `<button onclick="tutStepAside()" class="add-row-btn" style="width:100%;margin-top:10px;background:var(--gold);font-size:var(--fs-md);font-weight:700">👉 Try it on the page →</button>
         <div style="margin-top:5px;font-size:var(--fs-xs);color:var(--text-muted);text-align:center">The tutorial steps aside so you can do it. It pops back automatically when you finish — or tap the ↩ Return pill.</div>`)
    : '';
  const nextLabel = s.step === total - 1 ? 'Finish ✓' : (step.done && !wasDone ? 'Skip ›' : 'Next ›');
  return `<div id="tut-drag" style="display:flex;align-items:center;gap:6px;margin:0 -16px 6px;padding:10px 16px 6px;cursor:grab;border-bottom:1px dashed var(--border)" title="Drag to move this window">
      <span style="color:var(--text-faint);font-size:var(--fs-sm);letter-spacing:1px">⠿</span>
      <span style="font-size:var(--fs-xs);font-weight:700;color:var(--gold);flex:1;min-width:0">${escapeHtml(s.lessonTitle)}</span>
      <span style="font-size:var(--fs-xs);color:var(--text-faint)">${n}/${total}</span>
      <button onclick="tutExit()" title="Exit" style="background:none;border:none;color:var(--text-faint);font-size:var(--fs-lg);cursor:pointer;line-height:1">×</button>
    </div>
    ${intro}${title}
    <div style="line-height:1.55">${step.body}</div>
    ${cue}
    ${more}
    <div style="display:flex;gap:6px;margin-top:12px">
      <button onclick="tutPrev()" class="add-row-btn" style="background:var(--btn-secondary-bg);color:white;font-size:var(--fs-sm);${s.step === 0 ? 'opacity:0.4;pointer-events:none' : ''}">‹ Back</button>
      <button id="tut-next-btn" onclick="tutNext()" class="add-row-btn" style="flex:1;background:var(--gold);font-size:var(--fs-md)">${nextLabel}</button>
    </div>
    <div style="display:flex;gap:10px;justify-content:center;margin-top:7px">
      <button onclick="tutStepAside()" style="background:none;border:none;color:var(--text-faint);font-size:var(--fs-xs);cursor:pointer;text-decoration:underline">🔍 Look around the app</button>
      <button onclick="tutExit()" style="background:none;border:none;color:var(--text-faint);font-size:var(--fs-xs);cursor:pointer;text-decoration:underline">Skip / back to lessons</button>
    </div>`;
}
function _tutClearPoll() { if (_tutState && _tutState._poll) { clearInterval(_tutState._poll); _tutState._poll = null; } }
function _tutRender() {
  const s = _tutState; if (!s) return;
  _tutClearPoll();
  s.aside = false; _tutHidePill();   // rendering a step = back in card mode
  const step = s.steps[s.step];
  if (step.tab) { const tb = document.querySelector(`.tab[data-tab="${step.tab}"]`); if (tb && tb.style.display !== 'none') tb.click(); }
  _tutEnsureDom();
  const ov = document.getElementById('tut-overlay'); ov.style.display = 'block';
  const hole = document.getElementById('tut-hole'), card = document.getElementById('tut-card');
  // Interactive steps: a `done(char, baseline)` predicate. Capture a baseline now, and only
  // auto-advance on a false→true transition (so a condition already met just lets you tap Next).
  s.baseline = {
    rolls: (typeof history !== 'undefined' && history) ? history.length : 0,
    oracle: (typeof oracleHistory !== 'undefined' && oracleHistory) ? oracleHistory.length : 0,
    scenes: (typeof journal !== 'undefined' && journal && journal.entries) ? journal.entries.length : 0,
    sp: parseInt(char.skillPts) || 0, ap: parseInt(char.advPts) || 0,
    treasure: parseInt(char.treasure) || 0, items: (char.magicalItems || []).length,
    shadow: (parseInt(char.shadow) || 0) + (parseInt(char.scars) || 0),
    end: parseInt(char.endCur) || 0, hope: parseInt(char.hopeCur) || 0
  };
  let wasDone = false;
  try { wasDone = step.done ? !!step.done(char, s.baseline) : false; } catch (e) {}
  s.dragged = false;   // each step starts auto-positioned; dragging pins it for this step only
  card.innerHTML = _tutCardHtml(step, s, wasDone);
  _tutBindDrag();
  if (step.done && !wasDone) {
    s._poll = setInterval(() => {
      // Don't evaluate/advance while a picker or dialog is open — switching steps (and tabs)
      // underneath an open overlay was the main cause of misfired auto-advances.
      if (document.querySelector('.menu-overlay.show')) return;
      let ok = false; try { ok = !!step.done(char, s.baseline); } catch (e) {}
      if (ok) {
        _tutClearPoll();
        const btn = document.getElementById('tut-next-btn');
        if (btn) { btn.textContent = '✓ Done! Continuing…'; btn.style.background = 'var(--success-bg, var(--gold))'; }
        if (s.aside) _tutShowPill('✓ Done! Returning…');   // hands-on mode: flash the pill, then return+advance
        setTimeout(() => { if (_tutState === s) tutNext(); }, 750);
      }
    }, 450);
  }
  const place = () => {
    if (!_tutState || _tutState !== s) return;
    // Resolve the step's target, then highlight the whole SECTION it sits in (its enclosing
    // .card), not the tiny control — unless the step opts out with `exact: true`.
    let tgt = step.sel ? document.querySelector(step.sel) : null;
    // A Build-tab target may sit on another wizard step — bring that step on screen first.
    if (tgt && typeof buildGoToCard === 'function') { const bc = tgt.closest('.bw-hidden'); if (bc && bc.id) buildGoToCard(bc.id); }
    if (tgt && tgt.closest('#char-edit') && typeof setCharEditing === 'function') { const sec = editSectionOf(tgt); if (!document.getElementById('panel-character').classList.contains('editing') || document.getElementById('char-edit').dataset.sec !== sec) setCharEditing(true, sec); }
    if (tgt && !step.exact) tgt = tgt.closest('.card') || tgt;
    let r = tgt ? tgt.getBoundingClientRect() : null;
    if (tgt && r && (r.width === 0 && r.height === 0)) { tgt = null; r = null; }  // hidden → no frame
    if (tgt) {
      try { tgt.scrollIntoView({ block: 'center', behavior: 'auto' }); } catch (e) {}
      r = tgt.getBoundingClientRect();
      hole.style.display = 'block';
      hole.style.left = (r.left - 5) + 'px'; hole.style.top = (r.top - 5) + 'px';
      hole.style.width = (r.width + 4) + 'px'; hole.style.height = (r.height + 4) + 'px';
      if (!s.dragged) {
        const cardH = card.offsetHeight || 220;
        const below = r.bottom + 14, above = r.top - cardH - 14;
        card.style.left = '50%';
        if (below + cardH <= window.innerHeight - 8) { card.style.top = below + 'px'; card.style.transform = 'translateX(-50%)'; }
        else if (above >= 8) { card.style.top = above + 'px'; card.style.transform = 'translateX(-50%)'; }
        else { card.style.top = ''; card.style.bottom = 'calc(10px + env(safe-area-inset-bottom))'; card.style.transform = 'translateX(-50%)'; return; }
        card.style.bottom = '';
      }
    } else {
      hole.style.display = 'none';
      if (!s.dragged) { card.style.left = '50%'; card.style.top = '50%'; card.style.bottom = ''; card.style.transform = 'translate(-50%,-50%)'; }
    }
  };
  requestAnimationFrame(() => { place(); setTimeout(place, 90); });
}

/* ----- first-run offer ----- */
/* First run (round 4): no dialog. The welcome modal covered the Play tab's own "First, a hero"
   screen, so a newcomer met two competing starts. The tutorial is now offered on that screen
   (renderPlay), and `offered` is stamped only when the player acts on it. */
function tutorialOffered() { return !!loadTutProgress().offered; }
function startTutorialFromWelcome() { const q = loadTutProgress(); q.offered = true; saveTutProgress(q); openTutorial(); }

/* ---------- A: persistent newcomer banner ----------
   The first-run modal is a single moment; this is the standing safety net. While the active hero
   has no culture applied (i.e. nothing has been built yet), the Character tab carries a dismissible
   "start here" banner pointing at the two real entry points: the tutorial and the Build tab.
   Dismissal is per-hero-state, not persisted — it reappears for a genuinely new hero. */
function newcomerNeedsHelp() {
  return !char || !char.culture;
}
function renderNewcomerBanner() {
  const host = document.getElementById('newcomer-banner');
  if (!host) return;
  if (!newcomerNeedsHelp() || window._newcomerDismissed) { host.style.display = 'none'; host.innerHTML = ''; return; }
  host.style.display = 'block';
  host.innerHTML =
    '<div class="card" style="border-color:var(--gold);background:linear-gradient(180deg,var(--gold-paler) 0%,var(--card-bg) 100%)">' +
      '<h3 class="card-title" style="color:var(--gold)">Start here</h3>' +
      '<p class="hint" style="text-align:left;line-height:1.55;margin:0 0 10px 0">' +
        'This hero is empty. Nothing on this page can be edited yet — almost every number here is ' +
        '<strong>calculated for you</strong> once you pick a culture and a calling.' +
      '</p>' +
      '<button class="add-row-btn" style="width:100%;margin-bottom:6px" onclick="openTutorial()">📖 Teach me the game (guided tutorial)</button>' +
      '<button class="add-row-btn" style="width:100%;margin-bottom:6px" onclick="document.querySelector(\'.tab[data-tab=build]\').click()">🛠️ Build my hero (Build tab)</button>' +
      '<button class="add-row-btn" style="width:100%;margin-bottom:6px" onclick="openPregens()">✨ Just give me a ready-made hero</button>' +
      '<p class="hint" style="text-align:left;margin:8px 0 0 0">' +
        'Playing alone, with no Game Master? That works — see ☰ Menu → <strong>🗡️ Solo Play</strong>, ' +
        'or read <strong>📖 Ref → How a solo session runs</strong>.' +
      '</p>' +
      '<button class="add-row-btn" style="width:100%;margin-top:8px;background:transparent;color:var(--text-muted);border:1px solid var(--text-faint)" onclick="dismissNewcomerBanner()">Dismiss</button>' +
    '</div>';
}
function dismissNewcomerBanner() { window._newcomerDismissed = true; renderNewcomerBanner(); }

/* ----- lesson content (flavoured intros + plain steps) ----- */
const TUTORIAL_LESSONS = [
  { id: 'overview', icon: '🧭', title: 'How the Game Works', sub: 'Start here — the big picture',
    prep: c => _tutBuildIfBlank(c),
    steps: [
      { intro: `Welcome, traveller. Before the dice, the shape of the tale.`, title: `What this game is`, body: `<em>The One Ring</em> is a story of heroes journeying through a perilous Middle-earth. You say what your hero does; when the outcome is in doubt, you roll dice. The app does the maths — these lessons teach the ideas behind it.`, more: `You won't need to memorise any app rule. Learn the concepts here and the numbers on the sheet will make sense.` },
      { title: `The two phases of play`, body: `Play alternates between the <strong>Adventuring phase</strong> (journeys, fights, councils — the quest) and the <strong>Fellowship phase</strong> (the rest between adventures, where heroes heal and grow).`, more: `This app has a tool for each: the Journey, Combat and Council tabs for adventuring; the Fellowship Phase wizard for downtime.` },
      { tab: 'character', sel: '#end-cur-v', title: `Your hero in a few numbers`, body: `Almost everything flows from three attributes — <strong>Strength</strong>, <strong>Heart</strong>, <strong>Wits</strong> — and three pools: <strong>Endurance</strong> (body), <strong>Hope</strong> (spirit), and <strong>Parry</strong> (defence).`, more: `Strength feeds Endurance and combat; Heart feeds Hope; Wits feeds Parry and wits-skills. You'll see them on the Character tab.` },
      { tab: 'character', sel: '#hope-cur-v', title: `Hope and Shadow`, body: `Hope is the light you spend to do great things. Shadow is the darkness that gathers from fear and foul deeds. When Shadow overtakes your Hope, despair takes hold.`, more: `Balancing the two is the heart of the game: spend Hope to triumph, but never let the Shadow win you.` },
      { title: `How to use these lessons`, body: `Each lesson runs on this practice hero — your real characters are untouched. Take them in order, or pick what you like. When you finish you can keep the hero you built, or discard it.`, more: `Reopen the tutorial anytime from ☰ Menu → 📖 Tutorial. Tap Finish to return to the lesson list.` }
    ] },
  { id: 'creation', icon: '📜', title: 'Character Creation', sub: 'Build a hero from scratch',
    prep: c => { Object.assign(c, JSON.parse(JSON.stringify(DEFAULT_CHARACTER))); c.name = 'Practice Hero'; },
    steps: [
      { tab: 'build', sel: '#apply-culture-btn', intro: `Every tale begins with a name and a homeland.`, title: `The Build tab`, body: `Character creation lives here, and we'll walk down it top to bottom. This is a practice hero, so feel free to experiment.`, more: `A hero is Culture + Calling + three attributes + skills + starting gear. The Build tab turns those picks into a finished sheet automatically.` },
      { tab: 'build', sel: '#apply-culture-btn', title: `1 · Pick a Culture`, done: c => !!c.culture, body: `Choose your people, then tap “Apply Culture Defaults”. Culture sets your attribute options, starting skills, a Blessing, and your favoured weapons. Try it.`, more: `Eleven cultures across the books — Bardings (martial), Hobbits (lucky, stealthy), Rangers (Kings of Men, +1 attribute), Elves (keen, ageless), Dwarves (Stone-hard), and more. Each has a unique Cultural Blessing.` },
      { tab: 'build', title: `2 · Choose a Calling`, body: `Your Calling is your role in the Fellowship — Warden, Champion, Scholar, Treasure-hunter, Captain, or Messenger. It grants favoured skills, a distinctive feature, and a Shadow path.`, more: `The Shadow path is the kind of madness that threatens you (Wandering-madness, Dragon-sickness, Lure of Power…). It decides which Flaws you risk as Shadow rises.` },
      { tab: 'build', title: `3 · Attributes`, body: `Pick a Strength · Heart · Wits set (or roll one at random). These three ratings drive your Target Numbers, Endurance, Hope and Parry.`, more: `Target Number to succeed = 20 − the attribute's rating (18 − in solo Strider mode). A higher rating means a lower, easier TN.` },
      { tab: 'build', title: `4 · Previous Experience`, body: `Spend your Previous Experience points to raise skills and combat proficiencies before play begins. Watch the budget bar so you don't overspend.`, more: `Skills rate 0–6 (shown as ◆ pips). Combat proficiencies — Axes, Bows, Spears, Swords — set how many Success dice you roll when you attack with that kind of weapon.` },
      { tab: 'build', title: `5 · Favoured skills`, body: `Mark your favoured skills. A favoured roll rolls a second Feat die and keeps the better — an edge you'll feel on every check.`, more: `You get a couple from your Culture and a couple from your Calling; some Virtues grant more. Choose skills you'll lean on.` },
      { tab: 'build', title: `6 · Reward & Virtue`, body: `Choose a starting Reward (a special quality for a piece of gear — Keen, Grievous, and so on) and a starting Virtue (a personal ability). The sheet applies their effects for you.`, more: `Cultural Virtues unlock later (at Wisdom 2+); at creation you choose from the six generic Virtues.` },
      { tab: 'character', sel: '#end-cur-v', title: `Your finished hero`, body: `On the Character tab your Endurance, Hope and Parry are now filled in from those choices — a playable hero. Next, learn to roll the dice.`, more: `These fields are locked because they come from your Build picks. You change them through play — experience, the Fellowship phase — not by editing.` }
    ] },
  { id: 'dice', icon: '🎲', title: 'Dice Basics', sub: 'The heart of every action',
    prep: c => _tutBuildIfBlank(c),
    steps: [
      { tab: 'dice', sel: '.roll-btn', intro: `All deeds, great and small, are weighed by the dice.`, title: `Make a roll`, done: (c, b) => (typeof history !== 'undefined' && history.length > b.rolls), body: `A roll is one Feat die (1–12) plus a few Success dice (d6). Choose a number of Success dice and tap “🎲 Roll Dice”. Try it now.`, more: `You succeed if the total meets the Target Number. TN = 20 − the attribute's rating (18 − in Strider solo mode).` },
      { tab: 'dice', sel: '.roll-btn', title: `The Feat die: ☉ and 👁`, body: `The Feat die is the decisive one. Two faces are special: the Gandalf rune (☉) is an automatic success; the Eye of Sauron (👁) counts as 0.`, more: `When you are Miserable, an Eye result becomes an automatic failure — the Shadow trips you at the worst moment.` },
      { tab: 'dice', sel: '.roll-btn', title: `Success icons (✦)`, body: `Every Success die that rolls a 6 shows a ✦ (tengwar) icon. Extra ✦ turn a success into a Great or Extraordinary one and fuel special effects — like Piercing Blows in combat.`, more: `Passing the TN is only half the story; the number of ✦ decides how <em>well</em> you did.` },
      { tab: 'dice', title: `Favoured & Ill-Favoured`, body: `A Favoured roll adds a second Feat die and keeps the better; Ill-Favoured keeps the worse. The buttons set this, and favoured skills do it automatically.`, more: `Fear and the Shadow can make rolls Ill-Favoured; Favoured and Ill-Favoured cancel each other to a normal roll.` },
      { tab: 'dice', title: `Spending Hope`, body: `Spend 1 point of Hope to add +1 Success die to a roll. Inspiration (invoking a Distinctive Feature, or “Brave at a Pinch”) doubles that to +2 dice.`, more: `Hope is limited and slow to recover — spend it on the rolls that truly matter, not on every check.` },
      { tab: 'dice', title: `Weary & Miserable`, body: `When Weary, Success dice showing 1–3 count as 0. When Miserable, an Eye on the Feat die is an auto-failure. The app applies both for you.`, more: `Weary comes from Fatigue (load + travel); Miserable comes from Shadow. Manage them, or your rolls fall apart.` },
      { tab: 'dice', sel: '.roll-btn', title: `Quick-roll everything`, done: (c, b) => (typeof history !== 'undefined' && history.length > b.rolls), body: `Scroll down: every skill and combat proficiency has a one-tap button that rolls it at the right TN, with stance and conditions already applied. Make one to finish.`, more: `There are also buttons for Valour (vs Heart), Wisdom (vs Wits), and Shadow Tests (Dread / Greed / Sorcery).` }
    ] },
  { id: 'combat', icon: '⚔️', title: 'Combat', sub: 'Fight a foe, round by round',
    prep: c => _tutBuildIfBlank(c),
    steps: [
      { tab: 'combat', sel: '#encounter-card-wrap', intro: `Steel is answered with steel in the dark places of the world.`, title: `Add a foe`, done: c => (((c.encounter && c.encounter.foes) || []).length > 0), body: `Tap “+ Add Adversary” and choose one from the bestiary — orcs, wargs, trolls and more — or build a custom foe. Add one now.`, more: `Each foe has a full stat block: Endurance, Parry, Armour, Might, Hate, and named attacks. Every value is editable.` },
      { tab: 'combat', sel: '[data-stance="forward"]', title: `Choose a stance`, done: c => !!c.stance, body: `Pick a stance. Forward (+1 attack die, but easier to hit), Open (balanced), Defensive (−1 die per foe, harder to hit), Rearward (archers, safest). Tap one.`, more: `Stance is your round-by-round trade of offence for safety. In solo play a fifth stance, Skirmish, allows ranged-only hit-and-run.` },
      { tab: 'combat', sel: '#encounter-card-wrap', title: `Attack!`, done: c => (((c.encounter && c.encounter.foes) || []).some(f => f.slain || f.endCur < f.endMax)), body: `Pick your weapon in “Attack with”, then tap a foe's ⚔️ Attack. You roll your proficiency vs (your Strength TN + the foe's Parry); a hit deals your weapon's Damage. Try it.`, more: `A higher proficiency means more Success dice — better odds, and more ✦ for special effects.` },
      { tab: 'combat', sel: '#encounter-card-wrap', title: `Piercing Blows`, body: `Roll a ☉ rune or a 10 on the Feat die (9+ with a Keen weapon) for a Piercing Blow: the foe rolls its Protection (Armour) or is Wounded — and a second Wound fells it.`, more: `Reducing a foe to 0 Endurance also fells it. Tough foes need both: whittle their Endurance and land a telling blow.` },
      { tab: 'combat', sel: '#encounter-card-wrap', title: `The foe strikes back`, done: (c, b) => (parseInt(c.endCur) || 0) < b.end, body: `Tap “🗡️ … Attacks”, or “All engaged foes attack”. A hit drops your Endurance; a foe's Piercing Blow makes YOU roll Protection or be Wounded. Let a foe attack you.`, more: `Your Protection roll = a Feat die + Success dice equal to your Armour + Helm, against the foe's Injury number.` },
      { tab: 'combat', sel: '[data-stance="rearward"]', title: `Wounds, fleeing & more`, body: `A Wound is serious — you're hurt until you heal. To escape, use “🏃 Fly, You Fools!”. Weapons, armour, two-handed grips and your shield live on Hero → Gear.`, more: `At 0 Endurance you are Dying — out of the fight unless aided. A Wound on top of that is dire; sometimes retreat is the wise course.` },
      { tab: 'combat', sel: '#encounter-card-wrap', title: `End the encounter`, body: `When the foes are down, tap “End encounter”. In solo play the whole fight folds neatly into your Chronicle as one entry. Recover your Endurance by resting afterward.`, more: `Combat ends when one side is defeated or flees. Hate is the foe's version of Hope — some spend it for fell deeds.` }
    ] },
  { id: 'conditions', icon: '🌑', title: 'Conditions, Shadow & Rest', sub: 'Endurance, Hope, dread and wounds',
    prep: c => { _tutBuildIfBlank(c); c.shadow = 2; c.endCur = Math.max(1, (parseInt(c.endMax) || 30) - 8); },
    steps: [
      { tab: 'character', sel: '#end-cur-v', intro: `The road wears at body and soul alike.`, title: `Endurance`, body: `Endurance is your physical stamina. It falls from blows and heavy loads; at 0 you are Dying. Adjust it with the +/− buttons.`, more: `Carrying too much — load plus travel Fatigue — can leave you Weary even at full Endurance.` },
      { tab: 'character', sel: '#hud', title: `Resting`, done: (c, b) => (parseInt(c.endCur) || 0) !== b.end, body: `Tap your Endurance and Hope at the top of the screen: the sheet that opens has <strong>Short rest</strong> (recover Strength in Endurance) and <strong>Sleep</strong> (a full night's recovery). Take a rest now.`, more: `A Prolonged Rest in a Safe Haven also clears lingering travel Fatigue, and returns a point of Hope if you were at zero.` },
      { tab: 'character', sel: '#hope-cur-v', title: `Hope`, body: `Hope fuels your dice and your virtues. At 0 Hope you can spend none — a perilous place to be.`, more: `Recover Hope mainly in the Fellowship phase, or by spending a Fellowship point during a rest.` },
      { tab: 'character', sel: `[onclick="adj('shadow',1)"]`, title: `Gaining Shadow`, done: (c, b) => ((parseInt(c.shadow) || 0) + (parseInt(c.scars) || 0)) > b.shadow, body: `Shadow gathers from dread, anguish, and dark deeds. Raise it to see what happens. When Shadow + Scars reaches your current Hope, you become Miserable.`, more: `A Shadow Test (Dread / Greed / Sorcery, on the Dice tab) can reduce incoming Shadow — roll Valour or Wisdom against it.` },
      { tab: 'character', sel: '[data-cond="weary"]', title: `Conditions`, done: c => !!(c.weary || c.miserable || c.wounded), body: `Toggle Weary, Miserable, or Wounded as they strike. Weary zeroes low Success dice; Miserable makes an Eye auto-fail; Wounded means you're injured and mending. Toggle one.`, more: `Becoming Wounded opens a First Aid (HEALING) roll and a day-count below; a Severe injury can be fatal without treatment.` },
      { tab: 'character', sel: '#hud', title: `Bouts of Madness & Scars`, body: `If Shadow ever fills your Hope completely, you suffer a Bout of Madness — gaining a Flaw from your Shadow path. <strong>Harden your will</strong> (tap your Endurance and Hope at the top) clears your Shadow now, at the price of a permanent Scar.`, more: `Scars count as permanent Shadow for triggers. Gather all four Flaws of your path and the hero is lost — retired to the tale.` }
    ] },
  { id: 'journey', icon: '🥾', title: 'Journey', sub: 'Cross the wild from here to there',
    prep: c => { _tutBuildIfBlank(c); if (c.journey) c.journey.active = false; },
    steps: [
      { tab: 'journey', sel: '#j-start-btn', intro: `It is a dangerous business, going out your door.`, title: `Plan the route`, done: c => !!(c.journey && c.journey.active), body: `Answer the three questions — where, how far, how you travel (with the season and the lands you cross) — then tap “Set out”. Try starting one.`, more: `Distance and terrain decide how long you travel and how many Events you face. Harsh seasons and dark regions make it worse.` },
      { tab: 'journey', title: `Roles`, body: `In a full company each hero takes a role — Guide, Hunter, Look-out, Scout. Travelling solo, you are all of them. Roles decide who rolls for each Event.`, more: `The Guide rolls the Marching Tests; others cover Hunting (food), Awareness (ambush) and Scouting (the way ahead).` },
      { tab: 'journey', sel: '[onclick="rollMarchingTest()"]', title: `Marching Tests & Fatigue`, body: `Tap “🚶 Marching Test” to roll TRAVEL and advance day by day. Fatigue builds with distance and hard terrain; too much makes you Weary.`, more: `Forced March covers ground faster but piles on Fatigue. Mounts ease it, but have their own Vigour to spend.` },
      { tab: 'journey', sel: '#j-resolve-event-btn', title: `Journey Events`, body: `At set points an Event fires — “🎲 Resolve Event Now” lights up when you reach one — Terrible Misfortune, Despair, Ill Choices, a Mishap, a Short Cut, or a Joyful Sight. Resolve the roll it calls for.`, more: `A ⭐ Noteworthy Encounter is a full scene — a fight, a council, or a discovery. Events can cost Fatigue, Hope, or Shadow.` },
      { tab: 'journey', sel: '[onclick="arriveAtDestination()"]', title: `Arrival`, body: `At your destination, tap “🏁 Arrive at Destination”. A final TRAVEL roll sets your lingering Fatigue, carried onto your Character sheet until you rest.`, more: `Then the adventure continues — a council, a ruin, a foe — wherever the road has led you.` }
    ] },
  { id: 'council', icon: '🗣️', title: 'Councils & Endeavours', sub: 'Words, and long labours',
    prep: c => _tutBuildIfBlank(c),
    steps: [
      { tab: 'council', sel: '#council-chooser', intro: `Not every battle is fought with the sword.`, title: `Begin a Council`, done: c => !!(c.council && c.council.active), body: `A Council is a social contest. Tap “Persuade someone”, set the topic, the audience's Resistance and attitude, then tap “Begin Council”. Try it.`, more: `Resistance is how many successes you need to win them over; attitude (Reluctant / Open / Friendly) gives ±1 die to your rolls.` },
      { tab: 'council', title: `Introduction`, body: `First make an Introduction roll (AWE, COURTESY, or RIDDLE) to set your time limit — how many attempts you get before patience runs out.`, more: `A strong introduction buys you more attempts; a poor one leaves you little room to manoeuvre.` },
      { tab: 'council', title: `Interaction`, body: `Then use skills like PERSUADE, INSIGHT, ENHEARTEN, RIDDLE or SONG to wear down the Resistance. Each success contributes 1 + its ✦ icons.`, more: `A Roleplay Bonus for a relevant or brilliant point adds dice. Run out of time and you may accept failure, or a costly Success-with-Woe.` },
      { tab: 'council', title: `Skill Endeavours`, body: `For long tasks — research, crafting, healing — choose “A long, hard task” at the top of this tab. Set a Resistance, a time limit, and a risk level, then roll until it's done.`, more: `Risk levels: Standard, Hazardous (failures bring Woe), and Foolish (a single failure is a Disaster). Choose your gamble.` }
    ] },
  { id: 'treasure', icon: '💎', title: 'Treasure & Magical Items', sub: 'The glitter of old hoards',
    prep: c => { _tutBuildIfBlank(c); c.treasure = (parseInt(c.treasure) || 0) + 20; },
    steps: [
      { tab: 'gear', sel: '[onclick="openHoardRoller()"]', intro: `The hoards of the elder world still glimmer in the dark.`, title: `Roll a Hoard`, done: (c, b) => ((parseInt(c.treasure) || 0) !== b.treasure || (c.magicalItems || []).length > b.items), body: `After a victory, tap “🎲 Roll Hoard”, choose a tier (Lesser / Greater / Marvellous), and take your share. Try it.`, more: `Treasure raises your Standard of Living; cross a threshold (30 / 90 / 180 / 300) and the app offers to promote it.` },
      { tab: 'gear', sel: '[onclick="openAddMagicalItem()"]', title: `Magical items`, done: (c, b) => ((c.magicalItems || []).length > b.items), body: `Add a Magical Item — a Marvellous Artefact, a Wondrous Item, or a Famous Weapon. A Blessing adds +2 dice to matching skill rolls, automatically. Add one.`, more: `Famous Weapons hold dormant qualities you unlock by gaining a Valour rank or by Visiting the Treasury in a Fellowship phase.` },
      { tab: 'gear', title: `Rewards & Virtues`, body: `Rewards attach special qualities to gear — Keen, Grievous, Close-fitting, Cunning Make — while Virtues are personal abilities. Both arrive as you advance and are applied for you.`, more: `Your Standard of Living also sets how many Useful Items you may carry and how freely you spend Treasure.` },
      { tab: 'gear', title: `Cursed treasure`, body: `Some hoards are tainted. Cursed items (Shadow Taint, Owned, Marked) are flagged with a red badge, and a tainted find tempts a Greed Shadow Test.`, more: `The lust for treasure is one of the Shadow's surest roads — Greed has undone mightier folk than your hero.` }
    ] },
  { id: 'fellowship', icon: '🌿', title: 'Advancement & Fellowship', sub: 'Earn XP, rest, and grow',
    prep: c => { _tutBuildIfBlank(c); c.skillPts = (parseInt(c.skillPts) || 0) + 4; c.advPts = (parseInt(c.advPts) || 0) + 4; },
    steps: [
      { tab: 'character', sel: '#hud', intro: `Between perils, heroes rest, mend, and grow in renown.`, title: `Earn experience`, done: (c, b) => ((parseInt(c.skillPts) || 0) > b.sp || (parseInt(c.advPts) || 0) > b.ap), body: `After a session, tap your Endurance and Hope at the top, then <strong>End the session</strong> (+3 Skill and +3 Adventure points). Try it.`, more: `Skill points raise skills; Adventure points raise combat proficiencies and buy Valour & Wisdom.` },
      { tab: 'character', sel: `[onclick="openSpendXP('skill')"]`, title: `Spend points`, done: (c, b) => ((parseInt(c.skillPts) || 0) < b.sp), body: `Tap a Spend button to raise a skill or proficiency. Higher ranks cost more — 4 / 8 / 12 / 20 / 26 / 30 points to reach each rank. Spend some.`, more: `In a strict Fellowship phase you may raise each skill or proficiency only once, and choose Valour OR Wisdom — the wizard enforces this.` },
      { tab: 'character', sel: `[onclick="adj('valour',1)"]`, title: `Valour & Wisdom`, body: `Valour is renown; Wisdom is insight. Raising Valour grants a new Reward; raising Wisdom grants a new Virtue.`, more: `They also power Valour rolls (vs Heart, against dread) and Wisdom rolls (vs Wits, against greed and sorcery).` },
      { tab: 'character', sel: '#hud', title: `The Fellowship Phase`, body: `When an adventure ends, tap your Endurance and Hope at the top, then <strong>Fellowship Phase</strong>: recover Hope, remove Shadow, update skills, and choose an Undertaking.`, more: `Undertakings: heal a Scar, write a song, strengthen the Fellowship, raise an heir, meet your Patron, study items — some free to your Calling.` },
      { tab: 'character', title: `Yule`, body: `A Yule Fellowship phase is special: your hero ages a year, gains bonus Skill points, and recovers fully. The year turns in your tale.`, more: `Across a campaign your hero grows mighty — while the years and the Scars accumulate. That long arc is the soul of the game.` }
    ] },
  { id: 'solo', icon: '🗡️', title: 'Solo Play', sub: 'Strider, Moria, Oracle & Chronicle',
    prep: c => { _tutBuildIfBlank(c); c.striderMode = true; if (!c.fellowshipRating || c.fellowshipRating < 3) c.fellowshipRating = 3; },
    steps: [
      { tab: 'character', intro: `Even alone, a Ranger's long road can be walked.`, title: `Solo modes`, body: `The ☰ menu offers “Enable Strider Mode” (lone-hero play) and “Enable Moria Solo Mode” (the Durin's Folk campaign). We've switched Strider on for this lesson.`, more: `Solo mode lowers your Target Numbers (18 − rating), sets a minimum Fellowship rating, and unlocks the Oracle, the Eye of Mordor, and the Chronicle.` },
      { tab: 'oracle', sel: '[onclick="rollTellingTable()"]', title: `The Oracle — yes or no`, body: `With no Loremaster, the Oracle answers for the world. Ask a yes/no question, set the odds, and tap “Ask the Telling Table”. Try it.`, done: (c, b) => (typeof oracleHistory !== 'undefined' && oracleHistory ? oracleHistory.length : 0) > (b.oracle || 0), more: `A ☉ rune or 👁 Eye on the answer adds a twist — “yes, but…” or “no, and…” — to keep the story surprising.` },
      { tab: 'oracle', sel: '#oracle-ask', title: `The Oracle — inspiration`, body: `Stuck for what happens next? The Lore Table gives Action / Aspect / Focus words to spark a scene, an NPC, or a complication.`, more: `Fortune and Ill-Fortune tables turn special Feat results on your ordinary rolls into unfolding story events.` },
      { tab: 'character', sel: '#eye-of-mordor-card', title: `The Eye of Mordor`, body: `In solo play the Eye measures how close the Enemy is to noticing you. It rises as you act and gather Shadow; cross the Hunt threshold and a Revelation Episode strikes.`, more: `Each region has its own Hunt threshold — the deeper into darkness you go, the sooner the Eye turns your way.` },
      { tab: 'chronicle', sel: '[onclick="rollWritingPrompt()"]', title: `The Chronicle`, body: `Your solo journal. Scenes, dice, oracle results, and whole combats fold into a Tale of Years you can export. Tap “🎬 Scene” to seed what happens next. Try it.`, done: (c, b) => (typeof journal !== 'undefined' && journal && journal.entries ? journal.entries.length : 0) > (b.scenes || 0), more: `It auto-captures the mechanical beats — rolls, oracle answers, journey events, combats — and you write the prose around them.` },
      { tab: 'character', title: `You're ready`, body: `That's the whole game! Tap Finish, then choose whether to keep this practice hero. May your road be ever eastward.`, more: `Revisit any lesson anytime from ☰ Menu → 📖 Tutorial. Good journey, and mind the Shadow.` }
    ] }
];

/* ---------- ACCESSIBILITY (P8) ----------
   Dialog semantics + focus management for every .menu-overlay (both the static overlays and the
   showModal() styled modals), keyboard Escape-to-close, Tab focus-trap, and focus restore to the
   opener. Additive — no visual/behavior change for mouse/touch users. */
/* ---------- U4: swipe between tabs (touch) ---------- */
// Horizontal swipe on panel content switches to the prev/next VISIBLE tab. Ignores swipes that
// start inside form fields or horizontally-scrollable content, and does nothing while a dialog is open.
/* ---------- Header folds on scroll (round 4, phones) ----------
   Scrolling down folds the header to one slim line — crest, Endurance, Hope, the Eye. Scrolling
   up, or a tap on the slim header, brings it back with the sub-tabs. */
function setSlimHeader(on) {
  if (document.body.classList.contains('hdr-slim') === !!on) return;
  document.body.classList.toggle('hdr-slim', !!on);
  window._slimHold = Date.now();
}
function initSlimHeader() {
  let lastY = window.scrollY, queued = false;
  const phone = () => window.matchMedia('(max-width: 899px)').matches && !window.matchMedia('(min-width: 640px) and (max-height: 540px) and (orientation: landscape)').matches;
  window.addEventListener('scroll', () => {
    if (queued) return; queued = true;
    requestAnimationFrame(() => {
      queued = false;
      const y = window.scrollY, dy = y - lastY; lastY = y;
      if (!phone() || document.querySelector('.menu-overlay.show')) return setSlimHeader(false);
      if (Date.now() - (window._slimHold || 0) < 250) return;   // the header's own resize moves the page
      if (y < 60) setSlimHeader(false);
      else if (dy > 6 && document.documentElement.scrollHeight > window.innerHeight + 240) setSlimHeader(true);
      else if (dy < -6) setSlimHeader(false);
    });
  }, { passive: true });
  const hdr = document.querySelector('.header');
  if (hdr) hdr.addEventListener('click', e => {
    if (!document.body.classList.contains('hdr-slim')) return;
    const ctl = e.target.closest && e.target.closest('button, a, .tab, .bn-item, [onclick], input, select');
    if (ctl) { setSlimHeader(false); return; }   // a control acts on the first tap
    e.preventDefault(); e.stopPropagation(); setSlimHeader(false);
  }, true);
}

function initSwipeTabs() {
  window.addEventListener('resize', () => moveTabIndicator(false));
  let sx = 0, sy = 0, st = 0, valid = false;
  document.addEventListener('touchstart', e => {
    valid = false;
    if (e.touches.length !== 1) return;
    if (document.querySelector('.menu-overlay.show')) return;   // dialog open — don't hijack
    const t = e.touches[0];
    let el = e.target;
    while (el && el !== document.body) {
      const tag = el.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (el.scrollWidth > el.clientWidth + 5) return;          // horizontally scrollable — let it scroll
      el = el.parentElement;
    }
    sx = t.clientX; sy = t.clientY; st = Date.now(); valid = true;
  }, { passive: true });
  document.addEventListener('touchend', e => {
    if (!valid) return; valid = false;
    const t = e.changedTouches[0]; if (!t) return;
    const dx = t.clientX - sx, dy = t.clientY - sy;
    if (Date.now() - st > 600 || Math.abs(dx) < 70 || Math.abs(dy) > Math.abs(dx) * 0.6) return;
    // round 5: a swipe moves between the sub-tabs of the group you are in, never into another group
    const tabs = Array.from(document.querySelectorAll('.tab')).filter(x => x.style.display !== 'none' && !x.classList.contains('nav-out'));
    const cur = tabs.findIndex(x => x.classList.contains('active'));
    if (cur < 0) return;
    const next = dx < 0 ? cur + 1 : cur - 1;   // swipe left = next tab, right = previous
    if (next >= 0 && next < tabs.length) tabs[next].click();
  }, { passive: true });
}

/* ---------- Round 5: sticky action ----------
   A long tab's one main button (marked data-sticky) floats above the bottom bar whenever the
   real one is off screen. The floating copy only presses the real one, so every guard holds. */
function _stickyTarget() {
  const panel = document.querySelector('.panel.active'); if (!panel) return null;
  return [...panel.querySelectorAll('[data-sticky]')].find(b => b.checkVisibility && b.checkVisibility() && !b.disabled) || null;
}
function updateStickyAction() {
  let bar = document.getElementById('sticky-act');
  if (!bar) {
    bar = document.createElement('div'); bar.id = 'sticky-act'; bar.className = 'sticky-act';
    bar.innerHTML = '<button type="button" class="btn"></button>';
    bar.firstChild.onclick = () => { const t = _stickyTarget(); if (t) t.click(); };
    document.body.appendChild(bar);
  }
  const t = _stickyTarget();
  const busy = document.body.classList.contains('drawer-open') || document.querySelector('.menu-overlay.show');
  let show = false;
  if (t && !busy) {
    const r = t.getBoundingClientRect();
    const nav = document.getElementById('bottom-nav');
    const floor = nav && getComputedStyle(nav).position === 'fixed' && nav.getBoundingClientRect().top > innerHeight / 2 ? nav.getBoundingClientRect().top : innerHeight;
    show = r.top > floor - 8 || r.bottom < 90;
  }
  if (show) { const b = bar.firstChild; const lab = t.getAttribute('data-sticky') || t.textContent.trim(); if (b.textContent !== lab) b.textContent = lab; }
  bar.classList.toggle('show', !!show);
}
function initStickyAction() {
  let q = false;
  const tick = () => { if (q) return; q = true; requestAnimationFrame(() => { q = false; updateStickyAction(); }); };
  window.addEventListener('scroll', tick, { passive: true });
  window.addEventListener('resize', tick);
  document.addEventListener('click', () => setTimeout(tick, 60), true);
  tick();
}

/* ---------- U3: collapsible cards with remembered state ---------- */
const COLLAPSE_KEY = 'tor2e-collapsed';   // { "<panelId>|<title>": 1 } — device-global
function loadCollapsed() { try { return JSON.parse(localStorage.getItem(COLLAPSE_KEY)) || {}; } catch (e) { return {}; } }
function initCollapsibleCards() {
  const saved = loadCollapsed();
  document.querySelectorAll('.panel .card').forEach(card => {
    const h = card.querySelector(':scope > h2, :scope > h3.card-title');
    if (!h || h.classList.contains('collapsible')) return;
    const panel = card.closest('.panel');
    card.dataset.ckey = (panel ? panel.id : '?') + '|' + h.textContent.trim().slice(0, 40);
    h.classList.add('collapsible');
    h.setAttribute('role', 'button');
    h.setAttribute('tabindex', '0');
    // fold-default cards (the full Oracle tables under the Ask box) start folded until opened.
    if (saved[card.dataset.ckey] || (card.classList.contains('fold-default') && !saved[card.dataset.ckey + '|open'])) card.classList.add('collapsed');
    h.setAttribute('aria-expanded', card.classList.contains('collapsed') ? 'false' : 'true');
    const toggle = () => {
      const on = !card.classList.contains('collapsed');
      setCardCollapsed(card, on);
      if (!on) _accordionOnly(card);
    };
    h.addEventListener('click', e => { if (e.target.closest('button, input, select, a')) return; toggle(); });
    h.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
  });
  // Accordion tabs (Band): one step open at a time. First visit opens only the first step.
  document.querySelectorAll('.panel.accordion').forEach(panel => {
    const open = _accCards(panel).filter(c => !c.classList.contains('collapsed'));
    if (open.length > 1) open.slice(1).forEach(c => setCardCollapsed(c, true));
    if (!open.length && _accCards(panel)[0]) setCardCollapsed(_accCards(panel)[0], false);
  });
}
function setCardCollapsed(card, on) {
  const h = card.querySelector(':scope > h2, :scope > h3.card-title');
  card.classList.toggle('collapsed', on);
  if (h) h.setAttribute('aria-expanded', on ? 'false' : 'true');
  const key = card.dataset.ckey; if (!key) return;
  const s = loadCollapsed();
  if (on) s[key] = 1; else delete s[key];
  if (card.classList.contains('fold-default')) { if (on) delete s[key + '|open']; else s[key + '|open'] = 1; }
  try { localStorage.setItem(COLLAPSE_KEY, JSON.stringify(s)); } catch (e) {}
}
function _accCards(panel) {
  return [...panel.querySelectorAll(':scope > .card:not(.tab-intro)')].filter(c => c.dataset.ckey && c.style.display !== 'none');
}
/** In an accordion tab, opening one card closes the others — so the Band reads as one step
    at a time instead of a 3,600px scroll. */
function _accordionOnly(card) {
  const panel = card.closest('.panel.accordion'); if (!panel) return;
  _accCards(panel).forEach(c => { if (c !== card && !c.classList.contains('collapsed')) setCardCollapsed(c, true); });
}
/** Open a card (expanding it in an accordion, closing its siblings) and bring it into view. */
function openCard(card) {
  if (!card) return;
  setCardCollapsed(card, false); _accordionOnly(card);
  card.scrollIntoView({ block: 'start', behavior: 'auto' });
}

/* ---------- U7: contextual (?) hints on key Character-tab labels ---------- */
// Reuses the Reference tab's REFERENCE.terms as the single source of truth.
const HINT_LABELS = { 'End Max': 'Endurance', 'Hope Max': 'Hope', 'Parry': 'Parry', 'Load': 'Load', 'Fatigue': 'Fatigue', 'Shadow': 'Shadow / Scars', 'Scars': 'Shadow / Scars', 'Valour': 'Valour', 'Wisdom': 'Wisdom' };

/** Look a term up across every REFERENCE group (terms, TN, conditions, solo) — one vocabulary,
 *  so a (?) anywhere in the app resolves against the same text the Reference tab shows. */
function hintRow(term) {
  const groups = [REFERENCE.terms, REFERENCE.tn, REFERENCE.conditions, REFERENCE.solo, REFERENCE.combatTasks];
  for (const g of groups) {
    const row = (g || []).find(t => t[0] === term);
    if (row) return row;
  }
  // STANCE_INFO is keyed lowercase ('forward'), but markup reads naturally ('Forward') — match both,
  // otherwise _attachHint silently renders no (?) at all and the control looks unexplained.
  if (typeof STANCE_INFO !== 'undefined') {
    const k = String(term).toLowerCase();
    if (STANCE_INFO[k]) return [term, STANCE_INFO[k]];
  }
  return null;
}
function hintFor(term) {
  const row = hintRow(term);
  if (row) alertStyled(row[1], row[0]);
}

/* Attach a (?) button to one element. Idempotent. */
function _attachHint(el, term) {
  if (!el || el.dataset.hinted) return;
  if (!hintRow(term)) return;               // never render a (?) that would open nothing
  el.dataset.hinted = '1';
  const b = document.createElement('button');
  b.className = 'hint-q'; b.textContent = '?';
  b.setAttribute('aria-label', 'What is ' + term + '?');
  b.onclick = ev => { ev.stopPropagation(); ev.preventDefault(); hintFor(term); };
  // Quiet help: on a card title the whole title word is the tap target (dotted underline),
  // not a (?) circle beside it. The button is still there — transparent, over the words —
  // so keyboard and screen-reader users get the same control; the chevron area still collapses.
  if (el.matches('.card > h3.card-title, .card > h2')) {
    const term$ = document.createElement('span'); term$.className = 'title-term';
    [...el.childNodes].forEach(n => { if (!(n.classList && n.classList.contains('card-status'))) term$.appendChild(n); });
    el.insertBefore(term$, el.querySelector(':scope > .card-status'));
    b.classList.add('hq-title');
    term$.appendChild(b);
    return;
  }
  // a button cannot hold a button: set the (?) beside it, on the same line
  if (el.tagName === 'BUTTON') {
    const w = document.createElement('span'); w.className = 'hint-wrap';
    el.parentNode.insertBefore(w, el); w.appendChild(el); w.appendChild(b);
    return;
  }
  // keep the (?) on the same line as the last word, so a narrow label never strands it alone
  const last = [...el.childNodes].reverse().find(n => n.nodeType === 3 && n.nodeValue.trim());
  if (last && last === [...el.childNodes].filter(n => !(n.nodeType === 3 && !n.nodeValue.trim())).pop()) {
    const m = last.nodeValue.match(/^([\s\S]*?)(\S+)(\s*)$/);
    if (m) { last.nodeValue = m[1]; const tail = document.createElement('span'); tail.className = 'hint-tail'; tail.textContent = m[2]; tail.appendChild(b); el.insertBefore(tail, last.nextSibling); return; }
  }
  el.appendChild(b);
}

/* Declarative hints anywhere in the app: put data-hint="Key Term" on any element and it gets a (?).
   Runs app-wide (not just the Character tab) and is re-run after renders, so JS-generated markup
   picks it up too. */
function initHintButtons() {
  // 1) legacy: Character-tab counter labels matched by their text
  document.querySelectorAll('#panel-character .counter-label').forEach(el => {
    const label = el.textContent.replace('🔒', '').replace('?', '').trim();
    const term = HINT_LABELS[label];
    if (term) _attachHint(el, term);
  });
  // 2) declarative: anything carrying data-hint, on any tab
  document.querySelectorAll('[data-hint]').forEach(el => _attachHint(el, el.dataset.hint));
}

/* ---------- U14: gentle backup nudge ---------- */
// First run stamps a baseline; afterwards, if no export for 14+ days, toast at most once per 3 days.
function maybeBackupNudge() {
  try {
    const roster = loadRoster();
    if (!roster || !roster.list.length) return false;
    const DAY = 86400000;
    const last = parseInt(localStorage.getItem('tor2e-lastexport')) || 0;
    if (!last) { localStorage.setItem('tor2e-lastexport', String(Date.now())); return false; }   // baseline, don't nag new installs
    const lastN = parseInt(localStorage.getItem('tor2e-lastnudge')) || 0;
    if (Date.now() - last < 14 * DAY || Date.now() - lastN < 3 * DAY) return false;
    localStorage.setItem('tor2e-lastnudge', String(Date.now()));
    if (typeof showToast === 'function') showToast('💾 Backup reminder — ☰ Menu → 📦 Export ALL Heroes');
    return true;
  } catch (e) { return false; }
}

function initA11y() {
  const activeTab = document.querySelector('.tab.active');
  if (activeTab) activeTab.setAttribute('aria-current', 'page');

  const overlays = Array.from(document.querySelectorAll('.menu-overlay'));
  overlays.forEach(ov => {
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-modal', 'true');
    const h = ov.querySelector('h2, h3');
    if (h) { if (!h.id) h.id = 'dlg-h-' + Math.random().toString(36).slice(2, 7); ov.setAttribute('aria-labelledby', h.id); }
  });

  const focusables = ov => Array.from(ov.querySelectorAll('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
    .filter(el => !el.disabled && el.offsetParent !== null);

  let opener = null;
  const obs = new MutationObserver(muts => {
    muts.forEach(m => {
      if (m.attributeName !== 'class') return;
      const ov = m.target;
      const shown = ov.classList.contains('show');
      const wasShown = (m.oldValue || '').split(/\s+/).includes('show');
      if (shown && !wasShown) {
        opener = document.activeElement;
        // Focus the dialog's TITLE, not its first button: a highlighted first button looked
        // pre-selected, Enter would fire it, and focusing a search box popped the phone keyboard.
        const title = ov.querySelector('h3, h2, [id$="-title"]');
        const f = focusables(ov);
        setTimeout(() => {
          try {
            if (title && title.offsetParent !== null) { if (!title.hasAttribute('tabindex')) title.setAttribute('tabindex', '-1'); title.focus({ preventScroll: true }); }
            else if (f.length) f[0].focus();
          } catch (e) {}
        }, 30);
      } else if (!shown && wasShown) {
        if (opener && typeof opener.focus === 'function') { try { opener.focus(); } catch (e) {} opener = null; }
      }
    });
  });
  overlays.forEach(ov => obs.observe(ov, { attributes: true, attributeFilter: ['class'], attributeOldValue: true }));

  document.addEventListener('keydown', e => {
    const shownList = Array.from(document.querySelectorAll('.menu-overlay.show'));
    if (!shownList.length) return;
    const ov = shownList[shownList.length - 1];
    if (e.key === 'Escape') {
      // Click a close/cancel control so its cleanup runs (e.g. table-mode's timer). If none, leave it
      // (don't force-hide a styled modal whose promise is still pending).
      const closeBtn = ov.querySelector('.close, [onclick*="close"], [onclick*="toggleMenu"]');
      if (closeBtn) { e.preventDefault(); closeBtn.click(); }
    } else if (e.key === 'Tab') {
      const f = focusables(ov); if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });  // Tapping the dimmed backdrop around a sheet closes it, as it does in every phone app — through
  // the sheet's own close control, so its cleanup runs. Not for a pending question (the styled
  // modal waits for an answer), a full-screen view, or the Fellowship Phase wizard mid-flow.
  document.addEventListener('click', e => {
    const ov = e.target;
    if (!ov || !ov.classList || !ov.classList.contains('menu-overlay') || !ov.classList.contains('show')) return;
    if (['styled-modal-overlay', 'table-mode-overlay', 'fp-wizard-overlay', 'map-overlay'].includes(ov.id)) return;
    // Only a control that does nothing but close — never a row whose handler also closes (a hero
    // row in Your heroes switches hero, then closes).
    const closeBtn = ov.querySelector('button.close') || [...ov.querySelectorAll('button')].find(b => /^\s*(close\w*|toggleMenu)\(\)\s*;?\s*$/.test(b.getAttribute('onclick') || ''));
    if (closeBtn) closeBtn.click();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  if (typeof Sync !== 'undefined') Sync.init();   // P3: boot cloud sync if configured; else a no-op (stays local)
  initA11y();                                      // P8: dialog/focus/keyboard accessibility
  if (typeof pruneEmptyHeroes === 'function') pruneEmptyHeroes(activeCharId);   // blank heroes nobody started
  bindInputs();
  bindTabs();
  bindDice();
  bindBuilder();
  render();
  renderHistory();
  renderChronicle();
  restoreLastTab();   // U4: reopen the tab the player was last on (if still visible)
  initSwipeTabs();          // U4: swipe between tabs on touch
  initStickyAction();       // round 5: a long tab's main action stays in reach
  initSlimHeader();         // round 4: the header folds to one line while you scroll down
  initCollapsibleCards();   // U3: tap a card title to collapse (remembered per device)
  initHintButtons();        // U7/B: (?) hints app-wide (text-matched labels + data-hint)
  initTips();               // one-time tab tips (dismissable intros)
  initIconify();            // drawn icons in place of emoji on buttons
  initRollDrawer();         // dice results slide up from the bottom on every tab
  renderJumpBars();         // chips to jump between the cards of the longest tabs
  (function splash() {      // once per session; purely decorative
    const sp = document.getElementById('splash'); if (!sp) return;
    let seen = false; try { seen = sessionStorage.getItem('tor2e-splashed') === '1'; sessionStorage.setItem('tor2e-splashed', '1'); } catch (e) {}
    if (seen || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) { sp.remove(); return; }
    sp.classList.add('run'); setTimeout(() => sp.classList.add('out'), 1100); setTimeout(() => sp.remove(), 1600);
  })();
  clampLongHints();         // long explanations fold to one tappable line
  applyPlainGlosses();      // 'Shadow — creeping despair' under the first terms a newcomer meets
  renderNewcomerBanner();   // A: 'start here' card while the active hero is still blank
  // Dice tab: the manual dice controls fold away behind the quick-roll grid. Remember the
  // player's choice, but default OPEN for anyone who already knows the app (no hidden controls
  // for existing users) and CLOSED for a hero that hasn't been built yet.
  const dm = document.getElementById('dice-manual');
  if (dm) {
    const pref = localStorage.getItem('tor2e-dicemanual');
    dm.open = pref === null ? !newcomerNeedsHelp() : pref === '1';
    dm.addEventListener('toggle', () => { try { localStorage.setItem('tor2e-dicemanual', dm.open ? '1' : '0'); } catch (e) {} });
  }
  if (typeof snapshotHero === 'function') snapshotHero(activeCharId, 'load');   // U12: one auto-backup per load
  importFromHash();   // offer to import a character if the URL carries a shared payload
  if (typeof joinFromHash === 'function') joinFromHash();   // a table's invite link / QR code
  _tutRecoverSandbox();   // unwind a tutorial the app was closed during (before offering a new one)
  maybeBackupNudge();       // U14: gentle export reminder (14-day threshold, 3-day throttle)

  // Prevent iOS double-tap zoom
  let lastTouch = 0;
  document.addEventListener('touchend', e => {
    const now = Date.now();
    if (now - lastTouch < 300) e.preventDefault();
    lastTouch = now;
  }, {passive: false});
});

// PWA service worker — enables offline & Android Add-to-Home-Screen install.
// Only runs when the page is served over http(s) (skipped for file:// previews).
if ('serviceWorker' in navigator && (location.protocol === 'http:' || location.protocol === 'https:')) {
  // AUTO-UPDATE strategy: the SW skipWaiting()s on install and claims clients on activate,
  // so a new deploy takes over on the next online load with no manual "tap to update" step.
  // When the new worker takes control, we reload ONCE to pick up the fresh HTML. This prevents
  // clients from getting marooned on a stale build. (localStorage persists across the reload,
  // and the app saves on every change, so the reload is safe.)
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!reloading) { reloading = true; window.location.reload(); }
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').then(reg => {
      // If a newer worker is already waiting, activate it immediately.
      if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', () => {
          // New worker installed alongside an existing controller ⇒ activate it now.
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            nw.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });
      // Proactively check for an update on every load.
      reg.update().catch(() => {});
    }).catch(err => console.warn('TOR2E SW registration failed:', err));
  });
}

/* ---------- Drawn icons instead of emoji (rounds 3–4) ----------
   Emoji render as glossy colour pictures that fight the line-art look. Every pictograph in the
   interface's own text — buttons, titles, hints, chips, toasts, dialogs — is swapped for the
   matching drawn icon. An emoji with no drawing is LEFT AS IT IS (round 3 dropped them, which
   left six buttons blank). User writing (Chronicle prose, history, form fields) is never touched. */
const EMOJI_ICON = {
  '🎲': 'i-dice', '🗡': 'i-swords', '⚔': 'i-swords', '📜': 'i-scroll', '🛡': 'i-shield', '✨': 'i-sparkles', '🌟': 'i-star', '⭐': 'i-star',
  '🎉': 'i-sparkles', '🔮': 'i-sparkles', '🔥': 'i-flame', '🌙': 'i-moon', '🌑': 'i-moon', '☀': 'i-sun', '⛺': 'i-tent', '🏕': 'i-tent',
  '🏛': 'i-castle', '🏰': 'i-castle', '✍': 'i-feather', '🪶': 'i-feather', '🎒': 'i-pack', '🔨': 'i-hammer', '⚒': 'i-hammer',
  '❤': 'i-heart', '🩸': 'i-drop', '🧭': 'i-compass', '🥾': 'i-steps', '🏃': 'i-steps', '🚶': 'i-person', '⛰': 'i-mountain',
  '🏔': 'i-mountain', '💀': 'i-skull', '☠': 'i-skull', '👥': 'i-users', '🤝': 'i-users', '👑': 'i-crown', '💎': 'i-gem',
  '👁': 'i-eye', '👀': 'i-eye', '➕': 'i-plus', '🌿': 'i-leaf', '🌲': 'i-tree', '📖': 'i-book', '🗺': 'i-map', '🏹': 'i-bow',
  '⚠': 'i-warn', '✅': 'i-check', '✔': 'i-check', '❌': 'i-cross', '✖': 'i-x', '🏁': 'i-flag', '🏆': 'i-trophy', '🗣': 'i-chat',
  '💬': 'i-chat', '🗑': 'i-trash', '🎯': 'i-target', '🎬': 'i-clapper', '🔍': 'i-search', '💰': 'i-coins', '⛏': 'i-pick',
  '🩹': 'i-bandage', '🌊': 'i-wave', '🔒': 'i-lock', '🔓': 'i-unlock', '📝': 'i-pencil', '⛑': 'i-helm', '📅': 'i-calendar',
  '🗓': 'i-calendar', '⚓': 'i-anchor', '🏠': 'i-home', '⚜': 'i-fleur', '🦁': 'i-lion', '📣': 'i-horn', '📢': 'i-horn',
  '⚙': 'i-settings', '📋': 'i-clipboard', '📈': 'i-chart', '📊': 'i-chart', '❄': 'i-snow', '👂': 'i-ear', '🤫': 'i-hush',
  '🛈': 'i-info', 'ℹ': 'i-info', '📥': 'i-inbox', '📦': 'i-box', '⚖': 'i-scales', '💾': 'i-save', '💥': 'i-burst', '🎩': 'i-hat',
  '🎵': 'i-music', '🎶': 'i-music', '🐉': 'i-dragon', '😓': 'i-weary', '😱': 'i-warn', '📸': 'i-camera', '📷': 'i-camera',
  '📺': 'i-screen', '♻': 'i-refresh', '🔄': 'i-refresh', '📴': 'i-offline', '🔗': 'i-link', '💪': 'i-arm', '🦏': 'i-arm',
  '🧗': 'i-climb', '🎁': 'i-gift', '👉': 'i-point', '🛠': 'i-tools', '☁': 'i-cloud', '🕸': 'i-web', '🪨': 'i-rock',
  '🌫': 'i-fog', '👤': 'i-user', '🟢': 'i-dot|ok', '🔴': 'i-dot|bad', '⚪': 'i-dot|off', '♂': 'i-user', '♀': 'i-user',
  '🌧': 'i-rain', '💧': 'i-drop', '🧙': 'i-hat', '🐺': 'i-skull', '🕯': 'i-flame', '🍃': 'i-leaf', '🌳': 'i-tree', '🎭': 'i-user',
  '🃏': 'i-cards', '⏱': 'i-timer', '⏳': 'i-hourglass', '⌛': 'i-hourglass', '⬇': 'i-download', '⬆': 'i-upload', '📤': 'i-upload'
};
// Typographic marks that read as text, not pictures — kept, forced to text presentation.
const _EMOJI_KEEP = new Set(['✦', '★', '▶', '↺', '✓', '✗', '×', '©', '®', '™', '↩', '↪', '↶', '↷', '☉', '⇄', '⇒', '☰', '✎', '✕', '↔', '▸', '▾', '◆', '◇', '↕', '➜', '→', '←', '↑', '↓', '▲', '▼', '○', '⬢', '⌄']);
const _PICTO = /(\p{Extended_Pictographic}|[\u{1F1E6}-\u{1F1FF}])(\uFE0F|\u200D\p{Extended_Pictographic}\uFE0F?)*/gu;
// Where the words are the player's own, or the glyph is the value itself.
const _ICON_SKIP = 'script,style,textarea,input,select,option,svg,[contenteditable],.feat-die,.success-die,.ch-p,.s-history,.no-iconify,.user-text,code,pre';
window._unmappedEmoji = window._unmappedEmoji || new Set();
function _iconSvg(id, cls) {
  const ns = 'http://www.w3.org/2000/svg';
  const [sym, tone] = id.split('|');
  const svg = document.createElementNS(ns, 'svg'); svg.setAttribute('class', cls + (tone ? ' tone-' + tone : '')); svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS(ns, 'use'); use.setAttribute('href', '#' + sym); svg.appendChild(use);
  return svg;
}
function _iconifyTextNode(t) {
  const txt = t.nodeValue;
  if (!txt || !/[\u2190-\u2BFF\u{1F000}-\u{1FAFF}\u2139\u24C2\u3030\u303D\u3297\u3299\u00A9\u00AE]/u.test(txt)) return;
  const el = t.parentElement; if (!el || el.closest(_ICON_SKIP)) return;
  _PICTO.lastIndex = 0;
  if (!_PICTO.test(txt)) return;
  _PICTO.lastIndex = 0;
  const frag = document.createDocumentFragment(); let last = 0, changed = false, m;
  while ((m = _PICTO.exec(txt))) {
    const base = m[1];
    if (_EMOJI_KEEP.has(base)) {
      if (m[0] !== base) { frag.appendChild(document.createTextNode(txt.slice(last, m.index) + base + '\uFE0E')); last = m.index + m[0].length; changed = true; }
      continue;
    }
    const id = EMOJI_ICON[base];
    if (!id) { window._unmappedEmoji.add(base); continue; }
    let before = txt.slice(last, m.index);
    let end = m.index + m[0].length;
    // the icon sits where the emoji sat; one space after it stays, a leading icon swallows it
    const lead = !before.trim() && !frag.childNodes.length && !t.previousSibling;
    if (lead && txt[end] === ' ') end++;
    if (before) frag.appendChild(document.createTextNode(before));
    frag.appendChild(_iconSvg(id, lead ? (txt.slice(end).trim() ? 'b-ic lead-t' : 'b-ic') : 'b-ic ic-t'));
    last = end; changed = true;
  }
  if (!changed) return;
  if (last < txt.length) frag.appendChild(document.createTextNode(txt.slice(last)));
  t.parentNode.replaceChild(frag, t);
}
function _labelGlyphButtons(root) {
  const scope = root.nodeType === 1 ? root : document.body;
  const btns = scope.matches && scope.matches('button') ? [scope] : [];
  scope.querySelectorAll && scope.querySelectorAll('button').forEach(b => btns.push(b));
  btns.forEach(b => {
    if (b.getAttribute('aria-label') || b.textContent.trim()) return;
    const use = b.querySelector('use'); const name = (use && use.getAttribute('href') || '').replace('#i-', '');
    b.setAttribute('aria-label', b.title || name || 'Button');
  });
}
function iconifyText(root) {
  const r = root || document.body;
  if (r.nodeType === 3) { _iconifyTextNode(r); if (r.parentElement) _labelGlyphButtons(r.parentElement); return; }
  if (r.nodeType !== 1 && r.nodeType !== 9) return;
  const start = r.nodeType === 9 ? r.body : r;
  if (!start || (start.closest && start.closest(_ICON_SKIP))) return;
  const tw = document.createTreeWalker(start, NodeFilter.SHOW_TEXT);
  const nodes = []; let n; while ((n = tw.nextNode())) nodes.push(n);
  nodes.forEach(_iconifyTextNode);
  _labelGlyphButtons(start);
}
function initIconify() {
  const pass = () => { enhancePickers(document); enhanceSteppers(document); syncPickers(); if (typeof addCardRubrics === 'function') addCardRubrics(document); };
  iconifyText(document.body); pass();
  let queued = false; const pending = new Set();
  new MutationObserver(muts => {
    muts.forEach(m => {
      if (m.type === 'childList') m.addedNodes.forEach(x => pending.add(x));
      else if (m.type === 'characterData') pending.add(m.target);
    });
    // text is iconified at once, so nothing flashes as a colour emoji first
    pending.forEach(x => { if (x.isConnected) iconifyText(x); }); pending.clear();
    if (queued) return; queued = true;
    requestAnimationFrame(() => { queued = false; pass(); });
  }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['style', 'disabled'] });
  // A select's value set in code fires no event; re-read the labels after every change anywhere.
  document.addEventListener('change', () => requestAnimationFrame(syncPickers), true);
}

/* ---------- Tap-to-pick sheets (round 3) ----------
   Native dropdowns truncated their text ("Wild La…", "Gilraen, daughter of Dirl…") and look
   foreign on iOS. Each <select> gets a full-width button that shows the whole choice and opens
   a bottom sheet of options. The <select> stays in the DOM (hidden, still the source of truth),
   so every existing onchange handler, data-field binding and test keeps working. */
function enhancePickers(root) {
  root.querySelectorAll('select:not([multiple]):not([data-native]):not(.pick-src)').forEach(sel => {
    if (sel.closest('#pick-overlay')) return;
    sel.classList.add('pick-src'); sel.tabIndex = -1; sel.setAttribute('aria-hidden', 'true');
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'pick-btn'; b.setAttribute('aria-haspopup', 'listbox');
    b.innerHTML = '<span class="pick-val"></span><svg class="b-ic pick-chev" aria-hidden="true"><use href="#i-chev"></use></svg>';
    b.onclick = () => openPicker(sel);
    sel.insertAdjacentElement('afterend', b);
    sel._pickBtn = b;
  });
}
function _pickLabel(sel) {
  const lab = (sel.id && document.querySelector(`label[for="${sel.id}"]`)) || (sel.closest('.field') && sel.closest('.field').querySelector('label'))
    || (sel.closest('label'));
  const t = (sel.getAttribute('aria-label') || (lab && lab.textContent) || '').replace(/[?⌄]/g, '').trim();
  return t.split('\n')[0].trim();
}
function syncPickers() {
  document.querySelectorAll('select.pick-src').forEach(sel => {
    const b = sel._pickBtn || (sel.nextElementSibling && sel.nextElementSibling.classList.contains('pick-btn') ? sel.nextElementSibling : null);
    if (!b) return;
    const o = sel.options[sel.selectedIndex];
    const txt = o ? o.textContent.trim() : '';
    const v = b.querySelector('.pick-val');
    const shown = txt || 'Choose…';
    if (v.textContent !== shown) v.textContent = shown;
    b.classList.toggle('empty', !o || !sel.value);
    b.disabled = sel.disabled;
    b.style.display = sel.style.display === 'none' ? 'none' : '';
    const lbl = _pickLabel(sel); b.setAttribute('aria-label', (lbl ? lbl + ': ' : '') + shown);
  });
}
let _pickSel = null;
/* A choice says what it means, not only its name (round 4). `data-desc` on an option wins;
   otherwise the big pickers describe themselves from the game data. */
const PICK_DESC = {
  'eye-region-pick': v => HUNT_THRESHOLDS[v] ? `The Eye hunts you at ${HUNT_THRESHOLDS[v]}` : '',
  'culture-pick': v => (CULTURES[v] && CULTURES[v].blessing) ? String(CULTURES[v].blessing).replace(/\s—\s.*$/, '') + ' · ' + String(CULTURES[v].blessing).replace(/^.*?—\s*/, '') : '',
  'calling-pick': v => CALLINGS[v] && CALLINGS[v].favoured ? `Good at ${CALLINGS[v].favoured.join(', ')}` : '',
  'patron-pick': v => PATRONS[v] ? PATRONS[v].ability : ''
};
// Round 6: a drawn mark beside the choices that have one — a culture's crest, a calling's emblem
const CALLING_ICON = { Captain: 'i-crown', Champion: 'i-swords', Messenger: 'i-horn', Scholar: 'i-book', 'Treasure Hunter': 'i-gem', Warden: 'i-shield',
  Reclaimers: 'i-pick', Pathfinders: 'i-compass', 'Standard-Bearers': 'i-flag', Guardians: 'i-st-defensive', Vanguards: 'i-st-forward' };
const _pIc = id => id ? `<svg class="ic pick-ic" aria-hidden="true"><use href="#${id}"/></svg>` : '';
/* Round 8: odds as a five-step bar; lands as a coloured swatch */
const _ODDS = { certain: 5, likely: 4, middling: 3, doubtful: 2, unthinkable: 1 };
const _oddsBar = v => _ODDS[v] ? `<span class="odds-bar" aria-hidden="true">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= _ODDS[v] ? 'on' : ''}"></i>`).join('')}</span>` : '';
const _LAND_SW = { free: '#6f9a4e', border: '#a8b86a', wild: '#c9a76a', shadow: '#6e6259', dark: '#2a211b' };
const _landSw = v => _LAND_SW[String(v).toLowerCase()] ? `<span class="land-sw" style="background:${_LAND_SW[String(v).toLowerCase()]}" aria-hidden="true"></span>` : '';
const PICK_ART = {
  'culture-pick': v => (typeof cultureCrest === 'function' && typeof CULTURES !== 'undefined' && CULTURES[v]) ? cultureCrest(v, 34) : '',
  'calling-pick': v => CALLING_ICON[v] ? `<svg class="ic pick-ic" aria-hidden="true"><use href="#${CALLING_ICON[v]}"/></svg>` : '',
  'oracle-telling-chance': _oddsBar, 'ch-oracle-chance': _oddsBar,
  'eye-region-pick': _landSw, 'j-region': _landSw,
  'j-season': v => _pIc(SEASON_GLYPH[String(v).toLowerCase()]), 'tj-season': v => _pIc(SEASON_GLYPH[String(v).toLowerCase()]),
  'ch-month': v => typeof monthSeason === 'function' ? _pIc(SEASON_GLYPH[String(monthSeason(v) || '').toLowerCase()]) : '',
  'ch-phase': v => _pIc(/fellow/i.test(v) ? 'i-hearth' : 'i-road'),
  'enc-weapon-pick': v => { const w = typeof _equippedWeapons === 'function' ? _equippedWeapons()[parseInt(v)] : null; return w ? _pIc(weaponGlyph(w, w.prof)) : ''; },
  'tbl-call-skill': v => _pIc(v === 'Valour' ? ATTR_GLYPH.hrt : v === 'Wisdom' ? ATTR_GLYPH.wit : ATTR_GLYPH[attrOfSkill(v)])
};
function _pickArt(sel, o) { const f = PICK_ART[sel.id]; try { return f && o.value ? f(o.value) : ''; } catch (e) { return ''; } }
function _pickDesc(sel, o) { const f = PICK_DESC[sel.id]; try { return f && o.value ? f(o.value) : ''; } catch (e) { return ''; } }
function openPicker(sel) {
  _pickSel = sel;
  document.getElementById('pick-title').textContent = _pickLabel(sel) || 'Choose';
  const list = document.getElementById('pick-list'); list.innerHTML = '';
  const addOpt = o => {
    if (o.hidden || o.style.display === 'none') return;
    const b = document.createElement('button'); b.type = 'button';
    b.className = 'pick-opt' + (o.selected && sel.value === o.value ? ' on' : '') + (o.disabled ? ' off' : '');
    b.setAttribute('role', 'option'); b.setAttribute('aria-selected', o.selected ? 'true' : 'false');
    b.disabled = o.disabled;
    const desc = o.dataset.desc || _pickDesc(sel, o);
    const art = _pickArt(sel, o);
    if (desc) { b.innerHTML = (art ? `<span class="pick-art">${art}</span>` : '') + `<span class="pick-txt"><strong>${escapeHtml(o.textContent.trim() || '—')}</strong><small>${escapeHtml(desc)}</small></span>`; b.classList.add('has-desc'); if (art) b.classList.add('has-art'); }
    else if (art) { b.innerHTML = `<span class="pick-art">${art}</span><span class="pick-txt"><strong>${escapeHtml(o.textContent.trim() || '—')}</strong></span>`; b.classList.add('has-art', 'art-only'); }
    else b.textContent = o.textContent.trim() || '—';
    b.onclick = () => choosePick(o.value);
    list.appendChild(b);
  };
  [...sel.children].forEach(ch => {
    if (ch.tagName === 'OPTGROUP') {
      const h = document.createElement('div'); h.className = 'pick-group'; h.textContent = ch.label; list.appendChild(h);
      [...ch.children].forEach(addOpt);
    } else addOpt(ch);
  });
  document.getElementById('pick-overlay').classList.add('show');
  const on = list.querySelector('.pick-opt.on'); if (on) on.scrollIntoView({ block: 'center' });
}
function choosePick(v) {
  const sel = _pickSel; closePicker();
  if (!sel) return;
  if (sel.value !== v) {
    sel.value = v;
    sel.dispatchEvent(new Event('input', { bubbles: true }));
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  }
  syncPickers();
}
function closePicker() { document.getElementById('pick-overlay').classList.remove('show'); }

/* ---------- Steppers for number boxes (round 3) ----------
   A blank number field asks the player to type; − / + beside it lets them tap. Respects the
   field's min / max / step and fires the same input + change events a keyboard edit would. */
function enhanceSteppers(root) {
  root.querySelectorAll('input[type="number"]:not([readonly]):not([data-nostep]):not(.has-step)').forEach(inp => {
    if (inp.closest('.counter, #pick-overlay')) return;
    inp.classList.add('has-step');
    // a 64px box cannot show "auto-filled from armour": keep the words as its label, the number as the hint
    const ph = inp.getAttribute('placeholder') || '';
    if (ph.length > 4) {
      if (!inp.getAttribute('aria-label')) inp.setAttribute('aria-label', ph);
      if (!inp.title) inp.title = ph;
      const num = ph.match(/\d+/);
      inp.setAttribute('placeholder', num ? num[0] : /auto/i.test(ph) ? 'auto' : (inp.min !== '' ? inp.min : '0'));
    }
    const wrap = document.createElement('span'); wrap.className = 'stepper';
    inp.parentNode.insertBefore(wrap, inp);
    const mk = (d, lab) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'step-btn'; b.textContent = d < 0 ? '−' : '+'; b.setAttribute('aria-label', lab); b.onclick = () => stepNumber(inp, d); return b; };
    wrap.appendChild(mk(-1, 'Decrease')); wrap.appendChild(inp); wrap.appendChild(mk(1, 'Increase'));
  });
}
function stepNumber(inp, dir) {
  const step = parseFloat(inp.step) || 1;
  const min = inp.min !== '' ? parseFloat(inp.min) : -Infinity, max = inp.max !== '' ? parseFloat(inp.max) : Infinity;
  let v = parseFloat(inp.value);
  if (isNaN(v)) v = dir > 0 ? (isFinite(min) ? min : 0) : (isFinite(min) ? min : 0);
  else v = v + dir * step;
  v = Math.min(max, Math.max(min, v));
  inp.value = v;
  inp.dispatchEvent(new Event('input', { bubbles: true }));
  inp.dispatchEvent(new Event('change', { bubbles: true }));
}

/** Open Hero → Gear at the War Gear card (equipment moved off the Combat tab in round 3). */
function openEquipment() {
  openNavGroup('hero');
  const t = document.querySelector('.tab[data-tab="gear"]'); if (t) t.click();
  const c = document.getElementById('war-gear-card');
  if (c) setTimeout(() => c.closest('.card').scrollIntoView({ block: 'start' }), 60);
}

/* ---------- Menu search (round 3) ----------
   One box that finds any action by name: "roll stealth", "add orc", "spend", "rest", "oracle".
   Results run the same functions the buttons do, then close the menu. */
function _goTab(t) { const g = navGroupOf(t); if (g) openNavGroup(g.id); const b = document.querySelector(`.tab[data-tab="${t}"]`); if (b) b.click(); }
function menuActions() {
  const A = [];
  const add = (label, words, run) => A.push({ label, words: (label + ' ' + (words || '')).toLowerCase(), run });
  ['Valour', 'Wisdom', ...SKILLS.str, ...SKILLS.hrt, ...SKILLS.wit, ...COMBAT_PROFS].forEach(n => add('Roll ' + n, 'dice test check', () => rollFromSheet(n)));
  document.querySelectorAll('.tab').forEach(t => {
    if (t.style.display === 'none') return;
    add('Open ' + t.textContent.trim(), 'go tab page', () => _goTab(t.dataset.tab));
  });
  add('Add a foe to the fight', 'adversary enemy orc troll combat encounter bestiary', () => { _goTab('combat'); openBestiary(); });
  add('Spend Skill Points', 'xp experience raise improve', () => openSpendXP('skill'));
  add('Spend Adventure Points', 'xp experience valour wisdom proficiency raise', () => openSpendXP('adv'));
  add('Short rest', 'recover endurance', () => takeShortRest());
  add('Prolonged rest — sleep', 'night recover endurance hope', () => takeProlongedRest());
  add('Harden Will', 'shadow scar', () => hardenWill());
  add('Fellowship Phase', 'end adventure yule undertaking', () => openFPWizard());
  add('Equipment — weapons & armour', 'gear war weapon shield helm armour', () => openEquipment());
  add('Start a journey', 'travel road hexes', () => _goTab('journey'));
  add('Creation steps', 'build culture calling reward virtue lifepath create', () => openBuild());
  add('Edit hero', 'change name attributes', () => { _goTab('character'); setCharEditing(true); });
  add('Your heroes', 'roster switch character new', () => openRoster());
  add('Ready-made heroes', 'pregen pregenerated', () => openPregens());
  add('Learn to play (tutorial)', 'help lessons', () => openTutorial());
  add('Rules reference', 'glossary rules help', () => openReferenceTab());
  add('Export this hero', 'save backup file download', () => exportData());
  add('Change theme', 'dark light sepia old map contrast colour', () => cycleTheme());
  if (typeof isSolo === 'function' && isSolo()) {
    add('Ask the Oracle', 'telling yes no question lore', () => _goTab('oracle'));
    add('New scene', 'chronicle journal write', () => { _goTab('chronicle'); newScene(); });
  }
  return A;
}
function menuSearch(q) {
  const box = document.getElementById('menu-search-results');
  const menu = document.querySelector('.main-menu');
  q = (q || '').trim().toLowerCase();
  menu.classList.toggle('searching', !!q);
  box.innerHTML = '';
  if (!q) return;
  const terms = q.split(/\s+/);
  const hits = menuActions().filter(a => terms.every(t => a.words.includes(t))).slice(0, 8);
  if (!hits.length) { box.innerHTML = '<p class="hint" style="text-align:left">Nothing matches — try a skill name, “rest”, “foe” or “spend”.</p>'; return; }
  hits.forEach(a => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'menu-hit'; b.textContent = a.label;
    b.onclick = () => { const s = document.getElementById('menu-search'); s.value = ''; menuSearch(''); toggleMenu(); setTimeout(a.run, 30); };
    box.appendChild(b);
  });
}

/* ---------- Round 5: ink-press ----------
   A primary button sinks with a darker inner shade (CSS :active); a secondary one gets a faint
   ink ripple from where the finger landed. The ripple lives in its own clipped box, so the
   button's own overflow and children are untouched. Honours reduce-motion. */
(() => {   // ink ripple wiring
  const SEL = '.btn-secondary, .add-row-btn:not(.primary), .choice:not(.primary), .quick-skill, .opt-card, .chip-btn, .qchip, .v-act, .menu-item, .tab, .bn-item';
  document.addEventListener('pointerdown', e => {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const b = e.target.closest && e.target.closest(SEL); if (!b || b.disabled || b.closest('.hint-q')) return;
    const r = b.getBoundingClientRect(); if (!r.width) return;
    if (getComputedStyle(b).position === 'static') b.style.position = 'relative';
    const box = document.createElement('span'); box.className = 'ripple-box'; box.setAttribute('aria-hidden', 'true');
    const dot = document.createElement('span'); dot.className = 'ripple';
    const size = Math.max(r.width, r.height) * 2.2;
    dot.style.width = dot.style.height = size + 'px';
    dot.style.left = (e.clientX - r.left - size / 2) + 'px'; dot.style.top = (e.clientY - r.top - size / 2) + 'px';
    box.appendChild(dot); b.appendChild(box);
    setTimeout(() => box.remove(), 650);
  }, { passive: true, capture: true });
})();
