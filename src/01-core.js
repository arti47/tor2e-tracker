
/* ============================================
   THE ONE RING 2E — CHARACTER TRACKER
   Pure HTML5 / LocalStorage
   ============================================

   FILE MAP — sections are marked with greppable banners; jump with e.g. grep "---------- COUNCIL".
     • Data constants ...... SKILLS / COMBAT_PROFS / WEAPONS / CULTURES / CALLINGS / PATRONS /
                             REWARDS / VIRTUES_* / FLAWS_BY_PATH / oracle & Moria tables / DEFAULT_CHARACTER
     • State & storage ..... "STATE" (migrateCharacter, schema), "MULTI-CHARACTER ROSTER",
                             "SHARE VIA LINK / QR", per-hero journal block (CHRONICLE)
     • Rendering ........... "RENDERING" (render + the render* family)
     • Solo modes .......... Strider/Moria via isSolo()/isMoria(); "EYE OF MORDOR", Oracle, Band, Battle
     • Subsystems .......... "JOURNEY", "COUNCIL", "SKILL ENDEAVOUR", "FELLOWSHIP PHASE WIZARD",
                             "MAGICAL TREASURE", "PROTECTION ROLL", "WOUND SEVERITY"
     • Build pickers ....... "REWARD APPLY-TO FLOW", "FAVOURED SKILLS", "SPEND XP MODAL",
                             "DISTINCTIVE FEATURES PICKER", "REWARDS/VIRTUES PICKER", "QUICK BUILD"
     • Chronicle ........... journaling — JOURNAL_TYPES, scenes/blocks, clock, combats, export
     • Wiring .............. "INPUT BINDING", "TABS", "MENU", "INIT"

   localStorage keys: tor2e-roster-v1 · tor2e-char-<id> · tor2e-rolls-<id> · tor2e-journal-<id>
                      tor2e-oracle-history · tor2e-theme · tor2e-textsize · tor2e-lasttab · tor2e-compact  (legacy: tor2e-character-v1, tor2e-rolls-v1)
   ============================================ */

const STORAGE_KEY = 'tor2e-character-v1';   // legacy single-character key (migrated into the roster)
const THEME_KEY = 'tor2e-theme';  // 'light' | 'dark' | null (= auto via prefers-color-scheme)
// Multi-character roster (added 2026-05-31). The device can hold many heroes:
//   tor2e-roster-v1   → { activeId, list: [{id, name}] }
//   tor2e-char-<id>   → that hero's character JSON
//   tor2e-rolls-<id>  → that hero's roll history (legacy key was tor2e-rolls-v1)
const ROSTER_KEY = 'tor2e-roster-v1';
const CHAR_PREFIX = 'tor2e-char-';
const ROLLS_PREFIX = 'tor2e-rolls-';
const JOURNAL_PREFIX = 'tor2e-journal-';   // per-hero Chronicle (entries/threads/npcs/clock/settings)
let activeCharId = null;

// Apply theme before render so first paint is correct.
// Themes (U10). Preference in THEME_KEY: 'auto' (default, = unset) | 'light' | 'dark' | 'sepia' | 'hc'.
// 'auto' follows prefers-color-scheme and is stored as *absent* so the live prefers-color-scheme
// listener (see init) keeps re-applying it.
const THEMES = ['auto', 'light', 'dark', 'sepia', 'hc'];
const THEME_LABELS = { auto: 'Auto', light: 'Light', dark: 'Dark', sepia: 'Sepia', hc: 'High Contrast' };
function currentThemePref() { return localStorage.getItem(THEME_KEY) || 'auto'; }
function applyTheme() {
  const pref = currentThemePref();
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const eff = pref === 'auto' ? (prefersDark ? 'dark' : 'light') : pref;
  const b = document.body; if (!b) return;
  b.classList.remove('dark', 'theme-sepia', 'theme-hc');
  if (eff === 'dark') b.classList.add('dark');
  else if (eff === 'sepia') b.classList.add('theme-sepia');
  else if (eff === 'hc') b.classList.add('theme-hc');
  // (light => no class)
  const tc = document.querySelector('meta[name="theme-color"]');
  if (tc) tc.setAttribute('content', eff === 'dark' ? '#15110c' : (eff === 'sepia' ? '#ece0bf' : '#f5ecd9'));
  const btn = document.getElementById('dark-mode-btn');
  if (btn) btn.textContent = '🎨 Theme: ' + THEME_LABELS[pref];
}
function cycleTheme() {
  const next = THEMES[(THEMES.indexOf(currentThemePref()) + 1) % THEMES.length];
  if (next === 'auto') localStorage.removeItem(THEME_KEY); else localStorage.setItem(THEME_KEY, next);
  applyTheme();
}

// Styled modal — returns a Promise that resolves with the chosen button's value
// (or the input string if input was shown, or null on dismissal).
// Use for high-impact prompts; native confirm/alert/prompt still acceptable for low-stakes.
function showModal(opts) {
  return new Promise((resolve) => {
    const ov = document.getElementById('styled-modal-overlay');
    const titleEl = document.getElementById('styled-modal-title');
    const bodyEl = document.getElementById('styled-modal-body');
    const inputEl = document.getElementById('styled-modal-input');
    const btnsEl = document.getElementById('styled-modal-buttons');
    titleEl.textContent = opts.title || '';
    bodyEl.innerHTML = opts.message || '';  // intentionally HTML — caller controls
    if (opts.input) {
      inputEl.style.display = 'block';
      inputEl.placeholder = opts.inputPlaceholder || '';
      inputEl.value = opts.inputValue || '';
    } else {
      inputEl.style.display = 'none';
      inputEl.value = '';
    }
    btnsEl.innerHTML = '';
    (opts.buttons || [{label:'OK', value:true}]).forEach(b => {
      const btn = document.createElement('button');
      btn.textContent = b.label;
      btn.style.cssText = b.style || 'background:var(--red);color:white;border:1px solid var(--red-dark);border-radius:5px;padding:10px;font-size:14px;font-weight:500;cursor:pointer';
      btn.onclick = () => {
        ov.classList.remove('show');
        if (opts.input) {
          // For prompt-style modals: cancel buttons (value:null) return null; OK buttons return the input value.
          resolve(b.cancel ? null : inputEl.value);
        } else {
          resolve(b.value);
        }
      };
      btnsEl.appendChild(btn);
    });
    ov.classList.add('show');
    if (opts.input) setTimeout(() => inputEl.focus(), 50);
  });
}

// Convenience helpers — async, drop-in for common patterns.
async function confirmStyled(message, title) {
  const result = await showModal({
    title: title || 'Confirm',
    message,
    buttons: [
      {label:'OK', value:true},
      {label:'Cancel', value:false, style:'background:var(--btn-secondary-bg);color:white;border:1px solid var(--btn-secondary-bg);border-radius:5px;padding:10px;font-size:14px;cursor:pointer'}
    ]
  });
  return !!result;
}

async function alertStyled(message, title) {
  await showModal({
    title: title || 'Notice',
    message,
    buttons: [{label:'OK', value:true}]
  });
}

// Promise-based prompt() replacement. Returns the entered string on OK, null on Cancel.
async function promptStyled(message, defaultValue, title, placeholder) {
  return showModal({
    title: title || 'Input',
    message,
    input: true,
    inputValue: defaultValue || '',
    inputPlaceholder: placeholder || '',
    buttons: [
      {label:'OK'},
      {label:'Cancel', cancel: true, style:'background:var(--btn-secondary-bg);color:white;border:1px solid var(--btn-secondary-bg);border-radius:5px;padding:10px;font-size:14px;cursor:pointer'}
    ]
  });
}

// Monkey-patch native alert() with a queued styled version. alert() callers don't await
// its return value, so this is safe — sequential alerts are queued to appear in order.
// All confirm()/prompt() calls were migrated to await confirmStyled() / await promptStyled().
(function() {
  const queue = [];
  let active = false;
  function process() {
    if (active || queue.length === 0) return;
    active = true;
    const msg = queue.shift();
    alertStyled(String(msg)).then(() => {
      active = false;
      process();
    }).catch(() => { active = false; process(); });
  }
  // Preserve native fallback in case styled modal infrastructure isn't loaded yet.
  window._nativeAlert = window.alert;
  window.alert = function(msg) {
    // Convert newlines to <br> so the styled modal preserves line breaks.
    const html = String(msg == null ? '' : msg).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
    queue.push(html);
    process();
  };
})();

async function toggleStriderMode() {
  document.getElementById('menu-overlay').classList.remove('show');  // close menu so the dialog + result are visible
  const turningOn = !char.striderMode;
  const msg = turningOn
    ? `<strong>Enable Strider Mode?</strong><br><br>Solo / no-Loremaster play variant. Changes:<ul style="text-align:left;font-size:12px;padding-left:18px;margin:6px 0"><li>PE budget: 10 → <strong>15</strong></li><li>Attribute TN: <strong>18 − Rating</strong> (was 20 − Rating)</li><li>Fellowship Rating starts at <strong>3</strong></li><li>Adds free <strong>Strider</strong> Distinctive Feature (Inspired while journeying)</li><li>Unlocks <strong>Oracle tab</strong> (Telling / Lore / Fortune / Ill-Fortune tables)</li><li>Unlocks <strong>Skirmish stance</strong> + <strong>Gain Ground</strong> combat task</li><li>Unlocks <strong>Eye of Mordor</strong> tracking</li></ul>You can switch back any time. Attribute TNs will recalculate.`
    : `<strong>Disable Strider Mode?</strong><br><br>Revert to standard play. PE budget → 10, TN → 20 − Rating, Strider Distinctive Feature can be removed manually. Oracle tab + Skirmish stance + Eye of Mordor will hide.`;
  if (!await confirmStyled(msg, turningOn ? '🗡️ Strider Mode' : 'Disable Strider Mode')) return;
  char.striderMode = turningOn;
  // Recalculate TNs based on new mode
  if (char.strRating) char.strTN = (char.striderMode ? 18 : 20) - parseInt(char.strRating);
  if (char.hrtRating) char.hrtTN = (char.striderMode ? 18 : 20) - parseInt(char.hrtRating);
  if (char.witRating) char.witTN = (char.striderMode ? 18 : 20) - parseInt(char.witRating);
  // Bump Fellowship to 3 on first activation if currently 0
  if (turningOn && (parseInt(char.fellowshipRating) || 0) < 3) char.fellowshipRating = 3;
  // Auto-add Strider distinctive feature
  if (turningOn) {
    const features = String(char.features || '');
    if (!features.includes('Strider')) {
      char.features = features ? features + '\nStrider — Inspired on all Skill rolls while journeying' : 'Strider — Inspired on all Skill rolls while journeying';
    }
  }
  saveCharacter();
  render();
  refreshStriderUI();
  alert(turningOn ? '🗡️ Strider Mode enabled. Oracle tab visible; Eye of Mordor counter active.' : 'Strider Mode disabled. Standard rules restored.');
}

// Moria Solo Mode (Moria — Through the Doors of Durin solo campaign). Self-contained solo
// mode that takes precedence over Strider on shared surfaces. Independent boolean — can be
// on alongside Strider (for overland travel outside Moria).
async function toggleMoriaMode() {
  document.getElementById('menu-overlay').classList.remove('show');  // close menu so the dialog + result are visible
  const turningOn = !char.moriaMode;
  const msg = turningOn
    ? `<strong>Enable Moria Solo Mode?</strong><br><br>Solo campaign leading a Band of Allies under Balin's expedition. Changes (Phase 1):<ul style="text-align:left;font-size:12px;padding-left:18px;margin:6px 0"><li>PE budget: → <strong>15</strong> (solo)</li><li><strong>+5 max Hope</strong> (support of your Band)</li><li>Patron is <strong>Balin</strong> — <em>Balin's Counsel</em>: spend Fellowship to make a combat/battle roll Favoured</li><li>Fellowship Rating starts at <strong>3</strong> (+1 from Balin)</li><li>Safe Haven → <strong>Moria — First Hall</strong></li><li>Journeys use the <strong>Moria</strong> event table (Dark Land, Ill-Favoured)</li><li>Unlocks <strong>Oracle tab</strong> + <strong>Eye of Mordor</strong> (Moria: Dark Land, Hunt 14)</li></ul>Band roster, Battles, and Moria oracle tables arrive in later phases. You can switch back any time.`
    : `<strong>Disable Moria Solo Mode?</strong><br><br>Revert to standard play. The +5 Hope band bonus is removed; journeys/oracle return to normal (or Strider, if that's still on).`;
  if (!await confirmStyled(msg, turningOn ? '⛏️ Moria Solo Mode' : 'Disable Moria Solo Mode')) return;
  char.moriaMode = turningOn;
  if (turningOn) {
    // +5 max Hope (band support) — applied as a tracked, reversible delta.
    if (!char.moriaHopeBonus) {
      char.moriaHopeBonus = 5;
      char.hopeMax = (parseInt(char.hopeMax) || 0) + 5;
      char.hopeCur = (parseInt(char.hopeCur) || 0) + 5;
    }
    if ((parseInt(char.fellowshipRating) || 0) < 3) char.fellowshipRating = 3;
    if (!String(char.safeHaven || '').trim()) char.safeHaven = 'Moria — First Hall';
    char.huntRegion = 'dark';  // Moria is a Dark Land (Hunt Threshold 14)
    if (!char.eyeAwareness) char.eyeAwareness = 0;
  } else {
    // Revert the Hope bonus.
    const bonus = parseInt(char.moriaHopeBonus) || 0;
    if (bonus) {
      char.hopeMax = Math.max(0, (parseInt(char.hopeMax) || 0) - bonus);
      if ((parseInt(char.hopeCur) || 0) > char.hopeMax) char.hopeCur = char.hopeMax;
      char.moriaHopeBonus = 0;
    }
  }
  saveCharacter();
  render();
  refreshStriderUI();
  alert(turningOn
    ? '⛏️ Moria Solo Mode enabled. +5 max Hope, Balin as Patron, Moria journeys active.'
    : 'Moria Solo Mode disabled. Band Hope bonus removed.');
}

// Moria-Madness: a Dwarf-hero in Moria may follow the Moria-Madness Shadow Path instead of
// their Calling's path (Moria solo rules p.43). Reversible — restores the original path.
async function toggleMoriaMadnessPath() {
  const onMoria = char.shadowPath === 'Moria-Madness';
  if (onMoria) {
    if (!await confirmStyled('Restore your original Shadow Path?<br><br>Switches back from Moria-Madness to <strong>' + escapeHtml(char.shadowPathOrig || '(none)') + '</strong>.')) return;
    char.shadowPath = char.shadowPathOrig || '';
    char.shadowPathOrig = '';
  } else {
    if (!await confirmStyled('Follow the <strong>Moria-Madness</strong> Shadow Path?<br><br>Per the Moria solo rules (p.43) a Dwarf overcome by the sacred memory of Khazad-dûm may suffer Moria-Madness — Flaws: <em>Distracted, Mistrustful, Blinded, Jealous</em> — instead of the Flaws of "' + escapeHtml(char.shadowPath || '(none)') + '". Reversible.', '⛏️ Moria-Madness')) return;
    char.shadowPathOrig = char.shadowPath || '';
    char.shadowPath = 'Moria-Madness';
  }
  saveCharacter();
  render();
}

// Shared Shadow on band losses (Moria solo rules): +1 per ally Severe/Grievous, +2 per ally lost.
// Routes through adj('shadow') so caps, Miserable/Bout triggers, and EA (if Strider) all apply.
function gainBandShadow(n, reason) {
  if (n <= 0) return '';
  adj('shadow', n);
  return `<br><span class="result-tag" style="background:var(--btn-alert-bg);color:white">🌑 +${n} Shadow — ${reason}</span>`;
}

/* ---------- SOLO JOURNEY EVENT DETAILS (Strider Mode supplement) ---------- */
// Rolled with one Success die after the main Solo Journey Event is determined.
// Each entry has the imagined event + the skill to roll + outcome description.
const SOLO_EVENT_DETAILS = {
  terrible: [
    { event: 'Dire confrontation',  skill: 'Noteworthy', outcome: 'Noteworthy Encounter' },
    { event: 'Rival predator',      skill: 'Hunting',    outcome: 'avoid becoming the hunted' },
    { event: 'Violent weather',     skill: 'Explore',    outcome: 'find shelter' },
    { event: 'Hidden hazard',       skill: 'Awareness',  outcome: 'avoid stumbling into danger' },
    { event: 'Dangerous terrain',   skill: 'Explore',    outcome: 'find a safer route' },
    { event: 'Stalking enemy',      skill: 'Awareness',  outcome: 'spot the foul presence' }
  ],
  despair: [
    { event: 'Servants of the Enemy', skill: 'Noteworthy', outcome: 'Noteworthy Encounter' },
    { event: 'Torrential weather',    skill: 'Explore',    outcome: 'find the least exposed path' },
    { event: 'Nightmarish presence',  skill: 'Awareness',  outcome: 'sense the danger' },
    { event: 'Fading vigour',         skill: 'Hunting',    outcome: 'gain sustenance' },
    { event: 'Corrupted site',        skill: 'Explore',    outcome: 'find your way out' },
    { event: 'Grisly scene / foreboding portent', skill: 'Awareness', outcome: 'be forewarned' }
  ],
  ill: [
    { event: 'Mismanaged provisions', skill: 'Hunting',   outcome: 'replenish stores' },
    { event: 'Wayward path',          skill: 'Explore',   outcome: 'retrace your steps' },
    { event: 'Overlooked hazard',     skill: 'Awareness', outcome: 'escape safely' },
    { event: 'Lost quarry',           skill: 'Hunting',   outcome: 'follow its tracks' },
    { event: 'Disorienting environs', skill: 'Explore',   outcome: 'find your way' },
    { event: 'Haunting visions',      skill: 'Awareness', outcome: 'overcome darkness' }
  ],
  mishap: [
    { event: 'Sparse wildlife',  skill: 'Hunting',   outcome: 'forage what you can' },
    { event: 'Lost direction',   skill: 'Explore',   outcome: 'find your way' },
    { event: 'Obstructed path',  skill: 'Awareness', outcome: 'spot a way around' },
    { event: 'Elusive quarry',   skill: 'Hunting',   outcome: 'track it down' },
    { event: 'Rough terrain',    skill: 'Explore',   outcome: 'safely traverse' },
    { event: 'Wandering enemies',skill: 'Awareness', outcome: 'sense their coming' }
  ],
  shortcut: [
    { event: 'Game trail',          skill: 'Hunting',   outcome: 'traverse the path' },
    { event: 'Secluded path',       skill: 'Explore',   outcome: 'navigate the wilds' },
    { event: 'Helpful tracks',      skill: 'Awareness', outcome: 'follow the tracks' },
    { event: 'Animal guide',        skill: 'Hunting',   outcome: 'follow at a distance' },
    { event: 'Favourable weather',  skill: 'Explore',   outcome: 'make the most of it' },
    { event: 'Familiar waypoint',   skill: 'Awareness', outcome: 'recognize the landmark' }
  ],
  chance: [
    { event: 'Lone hunter',        skill: 'Hunting',    outcome: 'trade stories' },
    { event: 'Fellow traveller',   skill: 'Explore',    outcome: 'learn about the path ahead' },
    { event: 'Discreet watcher',   skill: 'Awareness',  outcome: 'spot them' },
    { event: 'Noble beast',        skill: 'Hunting',    outcome: 'commune' },
    { event: 'Secluded encampment',skill: 'Explore',    outcome: 'find a way off the beaten path' },
    { event: 'Auspicious gathering',skill:'Noteworthy', outcome: 'Noteworthy Encounter' }
  ],
  joyful: [
    { event: 'Majestic creatures', skill: 'Hunting',   outcome: 'observe without startling them' },
    { event: 'Inspiring vista',    skill: 'Explore',   outcome: 'reach a vantage point' },
    { event: 'Benevolent being',   skill: 'Awareness', outcome: 'sense their presence' },
    { event: 'Abundant foraging',  skill: 'Hunting',   outcome: 'replenish your rations' },
    { event: 'Ancient monument',   skill: 'Awareness', outcome: 'recognize its significance' },
    { event: 'Peaceful sanctuary', skill: 'Noteworthy',outcome: 'Noteworthy Encounter' }
  ]
};

/* ---------- MORIA SOLO JOURNEY EVENTS (Moria solo campaign) ---------- */
// Feat-die keyed. Moria is a Dark Land → the journey-event roll is Ill-Favoured by default
// (unless a foothold has been secured / region set to Border). Skills are Explore / Awareness
// / Craft for the lone hero (Dispositions for the Band arrive in a later phase).
const MORIA_JOURNEY_EVENTS = {
  eye:  { key: 'deadlyDark',      name: 'Deadly Dark 👁',                       fatigue: 3, effect: 'If the roll fails: target is <strong>Wounded</strong>, and <strong>Eye Awareness +1</strong>.' },
  rune: { key: 'dreadWonder',     name: 'Dread and Wonder of Moria ᚱ',          fatigue: 0, effect: 'If the roll fails: <strong>+1 Shadow</strong> (Dread). If it succeeds: everyone regains <strong>+1 Hope</strong>.' },
  e12:  { key: 'longDark',        name: 'The Long Dark of Moria',               fatigue: 2, effect: 'If the roll fails: gain <strong>+2 Shadow</strong> (Dread).' },
  e35:  { key: 'watchfulEyes',    name: 'Watchful Eyes',                        fatigue: 2, effect: 'If the roll fails: target gains <strong>+1 Shadow</strong> (Dread), and <strong>Eye Awareness +1</strong>.' },
  e69:  { key: 'branchingStairs', name: 'Endlessly Branching Stairs & Passages',fatigue: 2, effect: 'If the roll fails: <strong>+1 day</strong> to the journey and target gains +1 Fatigue. <strong>Either way, roll the Random Chamber Generator.</strong>' },
  e10:  { key: 'rightWay',        name: 'The Right Way',                        fatigue: 1, effect: 'If the roll succeeds: <strong>−1 day</strong> to the journey.' }
};
function mapMoriaEvent(r) {
  if (r.featSpecial === 'eye')  return MORIA_JOURNEY_EVENTS.eye;
  if (r.featSpecial === 'rune') return MORIA_JOURNEY_EVENTS.rune;
  const f = r.featValue;
  if (f <= 2) return MORIA_JOURNEY_EVENTS.e12;
  if (f <= 5) return MORIA_JOURNEY_EVENTS.e35;
  if (f <= 9) return MORIA_JOURNEY_EVENTS.e69;
  return MORIA_JOURNEY_EVENTS.e10;  // 10
}

// Event Detail sub-tables (one Success die). Same shape as SOLO_EVENT_DETAILS so the existing
// detail-render path is reused. Keys match MORIA_JOURNEY_EVENTS[*].key.
const MORIA_EVENT_DETAILS = {
  deadlyDark: [
    { event: 'Sudden ambush',     skill: 'Noteworthy', outcome: 'Noteworthy Encounter' },
    { event: 'Smoke and flame',   skill: 'Awareness',  outcome: 'avoid the blistering heat' },
    { event: 'Goblin arrow slits',skill: 'Craft',      outcome: 'spot the hidden alcoves' },
    { event: 'Crumbling ruins',   skill: 'Explore',    outcome: 'escape the chaos' },
    { event: 'Lurking assassin',  skill: 'Awareness',  outcome: 'be forewarned of the attack' },
    { event: 'Noxious air',       skill: 'Craft',      outcome: 'detect the poisonous fumes' }
  ],
  longDark: [
    { event: 'Dark-dwelling foes',skill: 'Noteworthy', outcome: 'Noteworthy Encounter' },
    { event: 'Endless ruination', skill: 'Craft',      outcome: 'glimpse former glories' },
    { event: 'Deepening shadows', skill: 'Explore',    outcome: 'find your way through' },
    { event: 'Oppressive silence',skill: 'Awareness',  outcome: 'remain focused' },
    { event: 'Fallen kin',        skill: 'Craft',      outcome: 'lay them to rest' },
    { event: 'Drums in the deep', skill: 'Explore',    outcome: 'navigate away from the threat' }
  ],
  watchfulEyes: [
    { event: 'Swarming creatures',skill: 'Explore',    outcome: 'avoid their ire' },
    { event: 'Lone scout',        skill: 'Awareness',  outcome: 'silence the sentry' },
    { event: 'They are coming',   skill: 'Craft',      outcome: 'build a barricade / seal the passage' },
    { event: 'Nameless fear',     skill: 'Explore',    outcome: 'outrun the lurking presence' },
    { event: 'Pits and tripwires',skill: 'Awareness',  outcome: 'steer clear of orc-laid hazards' },
    { event: 'Graven image',      skill: 'Craft',      outcome: 'tear it down' }
  ],
  branchingStairs: [
    { event: 'Maddening roads',   skill: 'Awareness',  outcome: 'keep your wits' },
    { event: 'Flooded passage',   skill: 'Craft',      outcome: 'make or find an exit' },
    { event: 'Dizzying heights',  skill: 'Explore',    outcome: 'safely traverse' },
    { event: 'Unstable terrain',  skill: 'Awareness',  outcome: 'keep your footing' },
    { event: 'Collapsed tunnel',  skill: 'Craft',      outcome: 'clear the way' },
    { event: 'Dead-end corridor', skill: 'Explore',    outcome: 'retrace your steps' }
  ],
  rightWay: [
    { event: 'Familiar waypoint', skill: 'Craft',      outcome: 'understand its significance' },
    { event: 'Unspoiled chambers',skill: 'Awareness',  outcome: 'walk unbroken roads' },
    { event: 'Plunging watercourse',skill: 'Explore',  outcome: 'navigate its currents' },
    { event: 'Glimmer in the dark',skill: 'Craft',     outcome: 'illuminate the way' },
    { event: 'Well-trod path',    skill: 'Awareness',  outcome: 'keep to the trail' },
    { event: 'Fellow delvers',    skill: 'Noteworthy', outcome: 'Noteworthy Encounter' }
  ],
  dreadWonder: [
    { event: 'Kingly hall',       skill: 'Explore',    outcome: 'map its confines' },
    { event: 'Buried secrets',    skill: 'Awareness',  outcome: 'spot among the rubble' },
    { event: 'Ancient mechanism', skill: 'Craft',      outcome: 'restore its function' },
    { event: 'Monuments to ancient glories', skill: 'Explore', outcome: 'reveal their grandeur' },
    { event: 'Echoes of forgotten lives', skill: 'Awareness', outcome: 'find their mementos' },
    { event: 'Remote outpost',    skill: 'Noteworthy', outcome: 'Noteworthy Encounter' }
  ]
};

/* ---------- MORIA BAND OF ALLIES (Moria solo campaign) ---------- */
// Dispositions replace skills/combat-profs when rolling for the Band. Rated 0+, default 2,
// rolled vs the Band's Readiness TN (= 20 − readiness).
const DISPOSITIONS = [
  { key: 'expertise', name: 'Expertise', sub: 'Craft · Lore · Healing · Hunting', desc: 'Learned skills & knowledge' },
  { key: 'manoeuvre', name: 'Manoeuvre', sub: 'Athletics · Explore · Travel · Stealth', desc: 'Pace, navigation, speed' },
  { key: 'rally',     name: 'Rally',     sub: 'Enhearten · Endurance & Fatigue tests', desc: 'Hardiness, courage, influence' },
  { key: 'vigilance', name: 'Vigilance', sub: 'Awareness · Insight · Scan', desc: 'Attentiveness, searches' },
  { key: 'war',       name: 'War',       sub: 'Battle · Clash rolls', desc: 'Combined fighting strength' }
];

// Shared Callings (Moria solo p.195) — the Player-hero and Band share one. Disposition Focus =
// the Band is Inspired when testing that Disposition (a Hope spend gives +2d, not +1d). Favoured =
// choose 2 of 3 → Favoured for the hero. Shadow Path = the path you both follow.
const SHARED_CALLINGS = {
  'Reclaimers':       { focus: 'expertise', skills: ['Craft', 'Lore', 'Scan'],          path: 'Dragon-Sickness' },
  'Pathfinders':      { focus: 'manoeuvre', skills: ['Athletics', 'Explore', 'Travel'], path: 'Lure of Secrets' },
  'Standard-Bearers': { focus: 'rally',     skills: ['Enhearten', 'Persuade', 'Song'],  path: 'Lure of Power' },
  'Guardians':        { focus: 'vigilance', skills: ['Awareness', 'Healing', 'Insight'],path: 'Path of Despair' },
  'Vanguards':        { focus: 'war',       skills: ['Awe', 'Battle', 'Stealth'],        path: 'Curse of Vengeance' }
};

// Ally Gifts — roll 1 Success die (band) then 1 Feat die (entry). Each grants +1d when relevant.
const ALLY_GIFTS = {
  lo: { // Success 1-2
    eye:{n:'Goblin-Slayer',d:'fights Orcs, carries trophies'}, 1:{n:'Healer',d:'bandages, herbs, treats wounds'},
    2:{n:'Cook',d:'pot & seasoning, nourishing meals'}, 3:{n:'Stone-Seer',d:'attuned to caves, identifies minerals'},
    4:{n:'Dead-Eye',d:'bow, spots & strikes from afar'}, 5:{n:'Mighty',d:'immense strength, hardier than most'},
    6:{n:'Prowler',d:'at home in shadows, moves unseen'}, 7:{n:'Inheritor',d:'noble name, heirloom armour'},
    8:{n:'Courteous',d:'customs & manners, negotiation'}, 9:{n:'Watchful',d:'keen eyes, always on lookout'},
    10:{n:'Fleet',d:'quick-moving and graceful'}, rune:{n:'Musician',d:'instrument, lifts spirits, keeper of lore'}
  },
  mid: { // Success 3-4
    eye:{n:'Grim Fury',d:'rage inspires fear, uncanny strength'}, 1:{n:'Iron Gut',d:'resists illness, sniffs out rot/poison'},
    2:{n:'Scout',d:'finds safe paths, rarely lost'}, 3:{n:'Artist',d:'charcoal & parchment, identifies symbols'},
    4:{n:'Smith',d:'metalworking tools, identifies items'}, 5:{n:'Cartographer',d:'maps, knows paths & chambers'},
    6:{n:'Climber',d:'rope & pinions, scales walls'}, 7:{n:'Indomitable',d:'immovable, ignores pain'},
    8:{n:'Vaultbreaker',d:'disables traps and locks'}, 9:{n:'Bird-Friend',d:'loyal bird scout/spy'},
    10:{n:'Shield-Bearer',d:'protector, draws enemy focus'}, rune:{n:'Natural Leader',d:'rallies, instils courage'}
  },
  hi: { // Success 5-6
    eye:{n:'Shadow-Touched',d:'deep Shadow knowledge, haunted by visions'}, 1:{n:'Lorekeeper',d:'tome & ledger, recalls lore'},
    2:{n:'Charmer',d:'uncanny charisma, smooth-talker'}, 3:{n:'Gem-Hound',d:'sniffs valuables, mining tools'},
    4:{n:'Beast-Whisperer',d:'commune with beasts'}, 5:{n:'Flame-Tender',d:'keeper of light, exudes warmth'},
    6:{n:'Brew-Master',d:'keg & tankards, pours drinks'}, 7:{n:'Mirthful',d:'pipeweed, song & poem, lifts spirits'},
    8:{n:'Quartermaster',d:'extra supplies, tracks resources'}, 9:{n:'Green Thumb',d:'good with plants, useful herbs'},
    10:{n:'Soothsayer',d:'divining runes, tells fortunes'}, rune:{n:'Battle-Tested',d:'weapon of renown, instils awe'}
  }
};

// Ally Quirks — roll 1 Success die (band) then 1 Feat die (entry).
const ALLY_QUIRKS = {
  lo: { eye:'Always ready with a song', 1:'Bears grisly battle scars', 2:'Braided beard down to their knees',
    3:'Can fall asleep anywhere', 4:'Casual with vulgar language', 5:'Constantly sipping from a flask',
    6:'Fingers adorned with rings', 7:'Obsessed with food', 8:'Prefers to be alone', 9:'Smokes a pipe incessantly',
    10:'Infamous prankster', rune:'Wears an eye patch' },
  mid: { eye:'Carries a prized bag of spices & herbs', 1:'Carries a legendary weapon of forebears', 2:'Hard of hearing',
    3:'Keeps a well-worn tankard on their belt', 4:'Proudly wears a token of another culture', 5:'Shield adorned with battle trophies',
    6:'Speaks only in Khuzdul', 7:'Speaks with a strange, regional accent', 8:'Overly eager to please',
    9:'Weapons/armour encrusted with gems', 10:'Wears a necklace of goblin ears', rune:'Wields a pickaxe as a weapon' },
  hi: { eye:'Always scribbling in a journal', 1:'Constantly covered in soot and grime', 2:'Deeply religious; carries a holy symbol',
    3:'Draped in animal furs', 4:'Dwarf-friend of another culture', 5:'Fiercely guards an old family memento',
    6:'Always expects the worst', 7:'Harbours a fascination with rocks', 8:'Often lost in thought',
    9:'Ready with an old war story at any time', 10:'Wears a fully-enclosed helm; rarely removes it', rune:'Wispy beard shrouds a youthful face' }
};

// Ally Names — roll 1 Feat die (row) then 1 Success die (column: lo 1-2 / mid 3-4 / hi 5-6).
const ALLY_NAMES = {
  eye:['Ánar','Austri','Bári'], 1:['Bildur','Bláin','Blóvur'], 2:['Broc','Brúni','Dári'], 3:['Dolg','Dúrnir','Eitri'],
  4:['Fáin','Fár','Farli'], 5:['Frár','Fridh','Frosti'], 6:['Galar','Grer','Grim'], 7:['Hilding','Hór','Íri'],
  8:['Lítir','Móin','Mondul'], 9:['Munin','Nár','Nyr'], 10:['Regin','Sindri','Tóki'], rune:['Úri','Vár','Vili']
};

// Condition chains + modifiers.
const INJURY_ORDER = ['fleeting', 'moderate', 'severe', 'grievous'];  // worsen chain; 'lingering' is a side-state
const FATIGUE_ORDER = ['fatigued', 'faltering', 'spent', 'collapsed'];
const INJURY_SERIOUS = ['severe', 'grievous', 'lingering'];           // count toward Band Weary
const FATIGUE_SERIOUS = ['spent', 'collapsed'];
const BURDEN_DICE = { light: 1, medium: 0, heavy: -1, overburdened: -2 };  // dice mod on Fatigue Tests
const DAMAGE_THREAT = { bothersome: 0, painful: 1, vicious: 2, dreadful: 3 };
// Immediate-wound / Eye-fail Injury Severity (Feat die).
function rollInjurySeverity() {
  const r = rollFeatOnce();
  if (r.special === 'eye')  return 'grievous';
  if (r.special === 'rune') return 'fleeting';
  return (r.value <= 3) ? 'severe' : 'moderate';  // 1-3 severe, 4-10 moderate
}

/* ---------- MORIA MISSION PLANNING (Moria solo campaign) ---------- */
// Mission Objective — roll 1 Feat die (row) + 1 Success die (column: 1-3 / 4-6).
const MISSION_OBJECTIVES = {
  eye: ['Repel enemies encroaching upon a reclaimed area', 'Defeat a Champion of the Shadow (Archfoe) and their minions'],
  1:   ['Seek a lost relic thought hidden in Moria', 'Embark beyond Moria to deliver a message home'],
  2:   ["Scout out the enemy's fortifications and report", 'Escort a beleaguered expeditionary group to a safe haven'],
  3:   ['Chart a safe route to a landmark', 'Seek the source of a corruption tainting food and water'],
  4:   ['Reclaim an important landmark', 'Establish a new expeditionary camp'],
  5:   ['Free captives held by enemy minions', 'Capture an enemy spy and discover what they know'],
  6:   ['Deliver an urgent message to another expeditionary group', 'Recover lost records of ancient Dwarves'],
  7:   ['Open up a new road or gate previously blocked', 'Reclaim a captured treasure'],
  8:   ['Fortify the defences in a remote area', 'Find a missing group and escort survivors to safety'],
  9:   ['Investigate rumours of a Nameless Fear', 'Find and secure a hidden passage exploited by the enemy'],
  10:  ['Secure a cache of important resources', 'Secure a storehouse of Mithril ingots'],
  rune:['An ally reveals a personal goal (roll the Lore table for inspiration)', 'Balin trusts you with a mission of personal significance (roll the Lore table)']
};
// Composition modifiers to Dispositions (base 2). War Gear also sets Burden.
const COMP_SIZE = { small: { war: -1, manoeuvre: 1 }, medium: {}, large: { war: 1, manoeuvre: -1 } };
const COMP_WARGEAR = { travellingLight: { war: -1, burden: 'light' }, prepared: { burden: 'medium' }, gearedForWar: { war: 1, burden: 'heavy' } };
const COMP_SPEC = { '': {}, sentinels: { vigilance: 1 }, stalwarts: { rally: 1 }, experts: { expertise: 1 } };
// Eye Awareness mission modifier by Band size; Hunt Threshold modifiers (prev mission + FP duration).
const EA_SIZE_MOD = { small: 0, medium: 2, large: 4 };
const HUNT_MOD_PREV = { '': 0, astounding: 4, qualified: 0, minorFail: -2, devastating: -4 };
const HUNT_MOD_FP = { hurried: 2, brief: 0, extended: -2 };
// Readiness bonus from Hardened allies on the mission (relative to Band size).
function readinessBonus(hardened, bandSize) {
  if (bandSize > 0 && hardened >= bandSize) return 4;
  if (bandSize > 0 && hardened * 2 >= bandSize) return 3;  // half (rounding up) or more
  if (hardened >= 2) return 2;
  if (hardened === 1) return 1;
  return 0;
}

/* ---------- MORIA BATTLES / CLASH SYSTEM (Moria solo campaign) ---------- */
// War Party scale by Feat die (roll Favoured if small band, Ill-Favoured if large).
function mapWarParty(r) {
  if (r.special === 'eye')  return { scale: 'Horde',   might: 3, resistance: 12 };
  if (r.special === 'rune') return { scale: 'Patrol',  might: 0, resistance: 3 };
  if (r.value <= 4)         return { scale: 'Warband', might: 2, resistance: 9 };
  return { scale: 'Pack', might: 1, resistance: 6 };  // 5-10
}
const ARCHFOE_MODS = {
  none:    { dM: 0, dR: 0, label: 'No Archfoe' },
  lesser:  { dM: 0, dR: 1, label: 'Lesser Archfoe (M +0, R +1, −1d clash)' },
  greater: { dM: 1, dR: 3, label: 'Greater Archfoe (M +1, R +3, −1d clash)' }
};
const OBJECTIVE_RES = { '': 0, simple: 3, laborious: 6, daunting: 9, overwhelming: 12 };
const BATTLEFIELD_ASPECTS = {
  eye: 'Barbed and wicked fortifications', 1: 'Cramped passages and chambers', 2: 'Paths leading to high ground',
  3: 'Expansive hall with soaring pillars', 4: 'Fissured or fractured terrain', 5: 'Concealing smoke or steam',
  6: 'Bridge over a chasm or pit', 7: 'Running rivers', 8: 'Improvised barricades', 9: 'Endless stairs',
  10: 'Mine shafts and heavy equipment', rune: 'Sun-lit space'
};
// Clash Setback (Feat die) — fired on a Clash failure showing an Eye. Some effects auto-apply.
const CLASH_SETBACK = {
  eye:  { name: 'Baneful Strike', effect: 'Make an Ill-Favoured Endurance Test. If it fails, the Injury Severity roll is also Ill-Favoured.', auto: null },
  1:    { name: 'Ally in Danger', effect: 'Persistent complication "Ally in Danger". If not removed next clash, an ally is harmed (Ill-Favoured Injury Severity).', auto: { complication: 'Ally in Danger' } },
  2:    { name: 'Unexpected Attack', effect: 'Your Player-hero: make a successful AWARENESS roll or receive a Wound.', auto: null },
  3:    { name: 'Fractured Terrain', effect: 'MANOEUVRE roll to reposition, or make an Endurance Test and add persistent complication "Difficult Ground".', auto: null },
  4:    { name: 'Outflanked', effect: 'Add persistent complication "Outmanoeuvred".', auto: { complication: 'Outmanoeuvred' } },
  5:    { name: 'Obscuring Shadow', effect: 'Add persistent complication "Enduring Darkness".', auto: { complication: 'Enduring Darkness' } },
  6:    { name: 'Cut Off', effect: 'Your next Leader Focus is Ill-Favoured. If duelling, take no benefit from the clash.', auto: null },
  7:    { name: 'Fell Presence', effect: 'Gain 2 Shadow (Dread) and add persistent complication "Hateful Foes".', auto: { shadow: 2, complication: 'Hateful Foes' } },
  8:    { name: 'Escape Blocked', effect: 'For the rest of the battle, Fleeing clash rolls are Ill-Favoured.', auto: null },
  9:    { name: 'Reinforcements', effect: 'Increase the foe\'s Resistance by 3.', auto: { foeRes: 3 } },
  10:   { name: 'An Archfoe Appears', effect: 'An Archfoe enters. If one is already present, you lose 2d (not 1d) on the next clash.', auto: null },
  rune: { name: 'The Band Falters', effect: 'Make a successful RALLY roll or add persistent complication "Failing Morale".', auto: null }
};

/* ---------- MORIA GENERATORS & TABLES (Moria campaign rules) ---------- */
// Random Chamber Generator (each a Feat die).
const CHAMBER_TYPE = { eye: 'Orc-nest', 1: 'Utility', 2: 'Storeroom', 3: 'Small Dwelling', 4: 'Stairs', 5: 'Well or Watercourse', 6: 'Guard Post or Armoury', 7: 'Forge', 8: 'Workshop', 9: 'Large Dwelling', 10: 'Civic Building', rune: 'Great Hall' };
const CHAMBER_CONDITION = { eye: 'Held by foes', 1: 'Blocked', 2: 'Suspiciously intact', 3: 'Flooded', 4: 'Utterly ruined', 5: 'Goblin-gnawed', 6: 'Shattered by earthquake', 7: 'Burnt', 8: 'Despoiled', 9: 'Ruined by passage of time', 10: 'Mostly intact', rune: 'A safe place to rest' };
const CHAMBER_APPEARANCE = { eye: 'Shunned', 1: 'Unfinished', 2: 'Austere', 3: 'Ancient', 4: 'Simple', 5: 'Heroic', 6: 'Homely', 7: 'Richly decorated', 8: 'Elven', 9: 'Fortified', 10: 'Natural', rune: 'Enchanted' };
const CHAMBER_CHALLENGE = { eye: 'Combat', 1: 'None (Desolation)', 2: 'Athletics', 3: 'Battle', 4: 'Enhearten', 5: 'Healing', 6: 'Hunting', 7: 'Lore', 8: 'Riddle', 9: 'Stealth', 10: 'None (Foreshadowing)', rune: 'Token of hope' };

// Moria Revelation Episodes — four Feat-die (d12) tables; trigger by Success die (1-3 Dire / 4-5 Orc / 6 Terrors); Ghâsh! via escalation.
const REVELATION_MORIA = {
  dire: { label: 'Dire Portents', t: { eye: ['Smoke in the Air', 'You have delved too deep. Next Revelation comes from Ghâsh!, rolled Favoured.'], 1: ['Cave-in', 'Everyone rolls AWARENESS; those who fail suffer a severe loss of Endurance.'], 2: ['The Way is Shut', 'A sealed door. On a Journey: +1 day and an extra event. If foes near, you cannot fly.'], 3: ['Dreadful Dreams', 'All gain 1 Shadow (Dread) and 1 Fatigue.'], 4: ['Misfortune', 'One hero (random) loses a weapon or useful item.'], 5: ['Crack in the Floor', 'A chasm — climb or leap across (ATHLETICS).'], 6: ['Horror of Death', 'You find a corpse. Gain 2 Shadow (Dread).'], 7: ['Lure of the Abyss', 'A hero is tempted by their Flaws.'], 8: ['Goblin-feet', 'Goblins follow and watch. Hunt Threshold −4 until dealt with; next Revelation from Orc Assault.'], 9: ['Eyes in the Dark', 'For the rest of this expedition, all Eye Awareness gains are doubled.'], 10: ['Sudden Darkness', 'Torches are extinguished; unless you have magical light or are near the surface, you are in darkness.'], rune: ['A Light in the Dark', 'Natural light shines from outside; the bright sun dismays creatures of darkness.'] } },
  orc:  { label: 'Orc Assault', t: { eye: ['Smoke in the Air', 'You have awakened a horror. Next Revelation comes from Ghâsh!.'], 1: ['Infamous Orc', 'A group of Orcs escorting a Chief of Moria.'], 2: ['They Have a Cave-troll', 'A host of Orcs and a Cave-troll Slinker attack, aiming to pen you in.'], 3: ['Orc-slavers', 'Orcs capture one of you for interrogation; rescue or abandon them.'], 4: ['Orc-stalkers', 'Orcs corral you; next battle you are Ambushed and Moderately hindered.'], 5: ['Sudden Ambush!', 'Ambushed by Orcs — the AWARENESS roll to avoid surprise loses 1d.'], 6: ['Orc-sentries', 'Orcs patrol ahead — sneak past or fight.'], 7: ['Roaming Cave-troll', 'A Great Cave-troll wanders in at the worst moment.'], 8: ['Sabotage!', 'Goblins spoil food, steal items, or lure you into a peril.'], 9: ['Goblin-sneaks', 'Goblins track you; Hunt Threshold −2 until you lose or hunt them.'], 10: ['Goblin-trap', 'A booby-trap; AWARENESS/SCAN/CRAFT to avert, else a grievous Endurance loss.'], rune: ['Close Encounter', 'You nearly meet a foe but avoid it; roll again to see what you avoided.'] } },
  terrors: { label: 'Terrors of the Dark', t: { eye: ['Doom Approaches', 'You smell smoke. Next Revelation from Ghâsh!, rolled Ill-Favoured.'], 1: ['Stalked by a Nameless Thing', 'A Nameless Thing pursues you; unless thrown off, it attacks at your next rest.'], 2: ['Nightmarish Delusions', 'A hero gains 2 Shadow (Sorcery); if any Shadow, they believe the delusions.'], 3: ['Twisting Paths', 'Tunnels double back. On a Journey: +1 day, an extra event, losing 1d on its skill roll.'], 4: ['Orc-horns', 'Orcs are close! Hunt Threshold −4; next Revelation from Orc Assault.'], 5: ['Unseen Foe', 'Something follows you. Hunt Threshold −2 until driven away.'], 6: ['Missing Companion', 'A hero or companion wanders off and is lost.'], 7: ['Crumbling Masonry', 'A ruined section — passing through is a Skill Endeavour (Resistance 6).'], 8: ['Sight of Horror', 'Something demoralising — gain 2 Shadow (Dread).'], 9: ['The Endless Dark', 'Supplies run low; each hero gains 2 Fatigue.'], 10: ['Led Astray', 'Clues seem to guide you, but lead into a trap.'], rune: ['A Moment of Truth', 'You discover a clue pointing to a Hidden Landmark.'] } },
  ghash: { label: 'Ghâsh!', t: { eye: ["Durin's Bane!", 'The Balrog engages you. Fleeing is the only sane option; one hero may stay behind so the rest can fly.'], 1: ['Nameless Horror', 'A Nameless Thing slithers up from the depths.'], 2: ['Distant Flames', 'You see the Balrog at a distance; flee with a successful AWARENESS roll without fighting.'], 3: ['A Spell of Closing', 'The Balrog seals a portal behind you — sorcery holds it shut.'], 4: ['Distant Roar', 'The Balrog roars. Gain 3 Shadow (Dread).'], 5: ['Power of Udûn!', 'All foes in the next combat gain a Moderate advantage and the Flame of Udûn fell ability.'], 6: ['The Shadow Deepens', 'Shadows impede you — lose 1d on any roll subject to visual impairment.'], 7: ['Choking Fumes', 'Foul fumes rise; climb to cleaner air quickly or suffer a severe Endurance loss.'], 8: ['Unreasoning Terror', 'All gain 2 Shadow (Dread); those who fail feel the urge to flee (ENHEARTEN to reassure).'], 9: ['Leaping Flames', 'Flames explode from a crack; passing through risks a severe Endurance loss.'], 10: ['Malicious Thought', "Durin's Bane bends thought on you — all gain 2 Shadow (Sorcery)."], rune: ['A Foresight Is on Me', 'A hero glimpses the Balrog in dream — they know it is near and retreat is wise.'] } }
};

// Random Orc-Band Generator — Feat die (leader) + 1 Success die per living ally (or hero).
const ORC_BAND_LEADER = { eye: 'A named Orc leader, a Great Orc Chief, or a Great Cave-troll', 1: 'Cave-troll Slinker', 2: 'Cave-troll Slinker', 3: 'Great Orc Bodyguard', 4: 'Great Orc Bodyguard', 5: 'Great Orc Bodyguard', 6: 'Orc-chieftain', 7: 'Orc-chieftain', 8: 'Orc-chieftain', 9: 'Orc-chieftain', 10: 'Orc-chieftain', rune: 'Orc-chieftain (the foes are distracted — you can take them by surprise)' };
const ORC_BAND_MEMBER = { 1: '1 Great Orc Bodyguard', 2: '1 Orc Guard + 1 Goblin Archer', 3: '2 Orc Soldiers', 4: '1 Orc Guard', 5: '1 Orc Soldier', 6: '1 Goblin Archer' };

/* ---------- PATRON QUESTS (Strider Mode supplement) ---------- */
const PATRON_QUESTS = {
  'Balin, son of Fundin': [
    'Dark whispers plague a Dwarven territory. What nameless Shadow lurks in the wilds?',
    'This broken artifact could be a potent weapon against the enemy. What is this item, and who wields the skill to reforge it?',
    'The Dwarven ruins hold great secrets — and weapons against the Enemy. What is the nature of these ruins, and what treasures do they hold?',
    'A powerful comrade has fallen in battle against the Enemy. Who are they, and what did they carry vital to our survival?',
    'A Dwarven stronghold now lies with the Enemy. Who leads these foul creatures, and how have they defiled our sacred site?',
    'A powerful lieutenant of the Enemy grows in power. Who is this shadowy figure, and how have they amassed followers?'
  ],
  'Cirdan the Shipwright': [
    'Supplies wane as the Enemy draws near. What vital resource for the building of ships must you deliver?',
    'An ancient enemy of the Elves has resurfaced and made themselves known. Who are they, and what grudge do they bear?',
    'Hope falters in these dark days; travel to a remote beacon and rekindle its flame. What shadowy presence seeks to prevent this?',
    'Our missives fall into the hands of the Enemy. What fate befalls our messengers?',
    'An artifact of great importance to the Elves is carried by a servant of the Enemy. Who is this creature, and why do they covet the artifact?',
    'The ships of the Grey Havens are fashioned from sacred wood. What malady taints these trees?'
  ],
  'Bilbo Baggins': [
    'This particular delicacy is a rare treat. What is this precious item, and where can it be found?',
    'Scout the area and make a note of significant landmarks to aid cartography. How has the land changed?',
    'The roads grow dark and perilous. What vital missive do you carry, and to whom must it be delivered?',
    'An ancient text confounds attempts to decipher it. What is the nature of this text, and who possesses the knowledge to translate it?',
    'The Enemy holds a map of special significance. What secrets does this map hold, and why is it vital?',
    'An artifact of great importance has resurfaced. What is this item, and why must we find it before the enemy does?'
  ],
  'Gandalf the Grey': [
    'The people need hope in these dark times. Where is this remote settlement, and what good news do you bring?',
    'Carry word of the Enemy\'s movements to our trusted ally. Who is this ally, and how can they aid us?',
    'A possible ally has made themselves known to us. Who is this ally, and what must we do to earn their trust?',
    'Our vision is clouded, our path uncertain. We must capture a servant of the Enemy. Who are they, and what do they know?',
    'News has reached us of a terrible weapon the Enemy means to bear. What is this weapon, and who wields it?',
    'The Shadow has captured an ally. Who is this ally, and where are they imprisoned?'
  ],
  'Gilraen, daughter of Dirhael': [
    'A Ranger has gone missing. What has become of them?',
    'A powerful servant of the Enemy lurks nearby. Who are they, and why do they target our Rangers?',
    'Enemy patrols prowl along the road, targeting merchants and supply wagons. Who leads these deadly patrols?',
    'A settlement has come under the eye of the Shadow. Why is this place significant?',
    'Monstrous servants of the Enemy encroach. What manner of weapon do they carry?',
    'We\'ve received no word from a remote Ranger refuge. What fate has befallen our allies?'
  ],
  'Tom Bombadil and Lady Goldberry': [
    'Creatures of the wilds have come under a dark affliction. What is this sickness, and what rare ingredient holds the key to a cure?',
    'A sacred spring runs black with some malady of the Shadow. What taints this source, and what manner of foul creature guards it?',
    'A group of travellers seeks escort through the wilds. Who are they, and what is their vital mission?',
    'The Shadow corrupts a sacred site. What is this place, and what foul presence now taints it?',
    'A precious flower blooms for the first time in many years. What is this plant, and why is it so vital?',
    'An ancient, sacred tree hosts a foul presence. What is this shadow, and can it be purged?'
  ]
};

// Strider Mode supplement: alternative XP-award scheme. Each milestone grants specified SP/AP.
const XP_MILESTONES = [
  { name: 'Accept a mission from a patron',         sp: 0, ap: 1 },
  { name: 'Achieve a notable personal goal',        sp: 1, ap: 1 },
  { name: 'Complete a patron\'s mission',           sp: 1, ap: 1 },
  { name: 'Complete a meaningful journey',          sp: 2, ap: 0 },
  { name: 'Face a Noteworthy Encounter (journey)',  sp: 1, ap: 0 },
  { name: 'Reveal a significant location/discovery',sp: 0, ap: 1 },
  { name: 'Overcome a tricky obstacle',             sp: 1, ap: 0 },
  { name: 'Participate in a Council',               sp: 1, ap: 0 },
  { name: 'Survive a dangerous combat',             sp: 0, ap: 1 },
  { name: 'Face a Revelation Episode',              sp: 0, ap: 1 }
];

// Moria solo Experience Milestones (Moria solo rules p.211).
const MORIA_EXP_MILESTONES = [
  { name: 'Reclaim a new Safe Haven within Moria',          sp: 3, ap: 3 },
  { name: 'Achieve a mission or quest',                     sp: 2, ap: 2 },
  { name: 'Achieve a notable personal goal',               sp: 1, ap: 1 },
  { name: 'Retrieve a notable treasure',                   sp: 1, ap: 1 },
  { name: 'Reach or reveal a significant location',        sp: 0, ap: 1 },
  { name: 'Survive a dangerous battle',                    sp: 0, ap: 1 },
  { name: 'Face a Revelation Episode',                     sp: 0, ap: 1 },
  { name: 'Defeat a notable foe',                          sp: 1, ap: 0 },
  { name: 'Overcome a tricky obstacle',                    sp: 1, ap: 0 },
  { name: 'Face a Noteworthy Encounter during a journey',  sp: 1, ap: 0 }
];
// Fellowship Phase Interruption (Moria solo rules p.223) — Feat die, on an Eye during FP.
const FP_INTERRUPTIONS = { eye: 'Orcs attack in force!', 1: "Madness among Balin's folk", 2: 'Orcs test your defences', 3: 'Drums in the deep', 4: 'Supplies run short', 5: 'Saboteurs or assassins strike', 6: 'Orcs encamp nearby', 7: "Strife among Balin's folk", 8: 'Collapsing or unstable environs', 9: 'Squabbles among your band', 10: 'Goblin spies skulking about', rune: 'Dark dreams plague your rest' };

async function openMilestonePicker() {
  const MS = isMoria() ? MORIA_EXP_MILESTONES : XP_MILESTONES;
  const buttons = MS.map((m, i) => {
    const award = (m.sp ? `+${m.sp} SP` : '') + (m.sp && m.ap ? ' ' : '') + (m.ap ? `+${m.ap} AP` : '');
    return {
      label: `${m.name} (${award})`,
      value: i,
      style: 'background:var(--card-bg);color:var(--ink);border:1px solid var(--border);border-radius:5px;padding:8px 10px;font-size:12px;font-weight:500;cursor:pointer;text-align:left'
    };
  });
  buttons.push({ label: 'Cancel', value: -1, style: 'background:var(--btn-secondary-bg);color:white;border:1px solid var(--btn-secondary-bg);border-radius:5px;padding:10px;font-size:14px;cursor:pointer' });
  const pick = await showModal({
    title: '🏆 Award Milestone XP',
    message: (isMoria() ? 'Moria solo campaign milestones. ' : 'Per Strider Mode supplement. ') + 'Pick the milestone your hero achieved. <strong>Pick only one per scene/challenge.</strong>',
    buttons
  });
  if (pick === -1 || pick == null) return;
  const m = MS[pick];
  const sp = parseInt(char.skillPts) || 0;
  const ap = parseInt(char.advPts) || 0;
  char.skillPts = sp + m.sp;
  char.advPts = ap + m.ap;
  char.experienceMode = 'milestone';
  saveCharacter();
  render();
  await alertStyled(`🏆 Milestone: <strong>${m.name}</strong><br>+${m.sp} SP, +${m.ap} AP.<br><br>SP: ${sp} → ${char.skillPts}<br>AP: ${ap} → ${char.advPts}`, 'Milestone Awarded');
}

async function rollPatronQuest() {
  const patron = char.patron;
  if (!patron || !PATRON_QUESTS[patron]) {
    await alertStyled('Set your Patron on the Build tab first (Strider Mode supplement quests are available for the 6 Core Rules patrons).', 'No Patron');
    return;
  }
  const quests = PATRON_QUESTS[patron];
  const die = Math.floor(Math.random() * 6) + 1;
  const quest = quests[die - 1];
  await alertStyled(`<strong>Patron Quest from ${patron}</strong> (Success die: ${die})<br><br>${quest}<br><br><small>Treat the open questions as inspiration: imagine the Patron's full briefing, or use the Oracle (Telling / Lore) to flesh out details.</small>`, '📜 Patron Quest');
}

/* ---------- ORACLE TABLES (Strider Mode) ---------- */
const TELLING_THRESHOLDS = { certain: 1, likely: 4, middling: 6, doubtful: 8, unthinkable: 10 };

const LORE_TABLE = {
  // Keys: 'eye' | 'rune' | 1..10 → arrays of 6 rows of {action, aspect, focus}
  'eye': [
    { action:'Abandon',  aspect:'Corrupted',   focus:'Curse' },
    { action:'Attack',   aspect:'Cruel',       focus:'Despair' },
    { action:'Betray',   aspect:'Deceptive',   focus:'Enemy' },
    { action:'Corrupt',  aspect:'Fell',        focus:'Fear' },
    { action:'Defeat',   aspect:'Ruined',      focus:'Shadow' },
    { action:'Weaken',   aspect:'Treacherous', focus:'War' }
  ],
  'rune': [
    { action:'Believe',    aspect:'Flourishing', focus:'Courage' },
    { action:'Bolster',    aspect:'Beautiful',   focus:'Duty' },
    { action:'Defend',     aspect:'Good',        focus:'Fellowship' },
    { action:'Forgive',    aspect:'Kind',        focus:'Hope' },
    { action:'Resist',     aspect:'Gentle',      focus:'Love' },
    { action:'Strengthen', aspect:'Wondrous',    focus:'Peace' }
  ],
  1: [
    { action:'Aid',    aspect:'Active',    focus:'Battle' },
    { action:'Arrive', aspect:'Ancient',   focus:'Border' },
    { action:'Await',  aspect:'Bold',      focus:'Burden' },
    { action:'Breach', aspect:'Bright',    focus:'Council' },
    { action:'Break',  aspect:'Broken',    focus:'Court' },
    { action:'Capture',aspect:'Cheerless', focus:'Creature' }
  ],
  2: [
    { action:'Change', aspect:'Cold',      focus:'Darkness' },
    { action:'Chase',  aspect:'Concealed', focus:'Death' },
    { action:'Command',aspect:'Dangerous', focus:'Defence' },
    { action:'Control',aspect:'Dark',      focus:'Depths' },
    { action:'Create', aspect:'Dead',      focus:'Doubt' },
    { action:'Defy',   aspect:'Defended',  focus:'Dreams' }
  ],
  3: [
    { action:'Demand',  aspect:'Desolate',  focus:'Fate' },
    { action:'Discover',aspect:'Destroyed', focus:'Fire' },
    { action:'Disguise',aspect:'Dreadful',  focus:'Folk' },
    { action:'Endure',  aspect:'Empty',     focus:'Followers' },
    { action:'Escape',  aspect:'Evil',      focus:'Greed' },
    { action:'Evade',   aspect:'Faded',     focus:'Haven' }
  ],
  4: [
    { action:'Explore', aspect:'Far-reaching', focus:'History' },
    { action:'Find',    aspect:'Fierce',       focus:'Honour' },
    { action:'Focus',   aspect:'Foreboding',   focus:'Journey' },
    { action:'Gather',  aspect:'Forgotten',    focus:'Kindred' },
    { action:'Guard',   aspect:'Fragile',      focus:'Knowledge' },
    { action:'Guide',   aspect:'Ghastly',      focus:'Land' }
  ],
  5: [
    { action:'Hide',    aspect:'Gloomy',       focus:'Leader' },
    { action:'Hinder',  aspect:'Growing',      focus:'Legend' },
    { action:'Hoard',   aspect:'Hidden',       focus:'Life' },
    { action:'Hold',    aspect:'Ill-fated',    focus:'Light' },
    { action:'Hunt',    aspect:'Impenetrable', focus:'Luck' },
    { action:'Journey', aspect:'Inspiring',    focus:'Memory' }
  ],
  6: [
    { action:'Lead',  aspect:'Isolated', focus:'Message' },
    { action:'Learn', aspect:'Lofty',    focus:'Might' },
    { action:'Leave', aspect:'Lost',     focus:'Nature' },
    { action:'Lose',  aspect:'Menacing', focus:'Pain' },
    { action:'Mourn', aspect:'Mighty',   focus:'Path' },
    { action:'Move',  aspect:'Mysterious',focus:'Patron' }
  ],
  7: [
    { action:'Persist',  aspect:'Noble',      focus:'Peril' },
    { action:'Preserve', aspect:'Obstructed', focus:'Plan' },
    { action:'Prevent',  aspect:'Old',        focus:'Power' },
    { action:'Refuse',   aspect:'Ominous',    focus:'Prophecy' },
    { action:'Reject',   aspect:'Open',       focus:'Quest' },
    { action:'Remove',   aspect:'Peaceful',   focus:'Refuge' }
  ],
  8: [
    { action:'Replenish',aspect:'Restored', focus:'Riddle' },
    { action:'Restore',  aspect:'Sheltered',focus:'Ruins' },
    { action:'Scheme',   aspect:'Silent',   focus:'Rumour' },
    { action:'Search',   aspect:'Simple',   focus:'Secret' },
    { action:'Seize',    aspect:'Small',    focus:'Skill' },
    { action:'Share',    aspect:'Sombre',   focus:'Song' }
  ],
  9: [
    { action:'Slay',    aspect:'Stony',    focus:'Story' },
    { action:'Steal',   aspect:'Stout',    focus:'Strength' },
    { action:'Summon',  aspect:'Stricken', focus:'Time' },
    { action:'Surrender',aspect:'Stubborn',focus:'Tool' },
    { action:'Surround',aspect:'Twisted',  focus:'Treasure' },
    { action:'Threaten',aspect:'Unnatural',focus:'Trust' }
  ],
  10: [
    { action:'Transform',aspect:'Veiled',   focus:'Truth' },
    { action:'Trap',     aspect:'Vigorous', focus:'Vengeance' },
    { action:'Trick',    aspect:'Weary',    focus:'Wealth' },
    { action:'Uncover',  aspect:'Wild',     focus:'Weapon' },
    { action:'Uphold',   aspect:'Wretched', focus:'Wilds' },
    { action:'Withstand',aspect:'Young',    focus:'Wish' }
  ]
};

// Moria Lore Keywords Matrix (Moria solo rules p.208) — 4 columns: Action / Aspect / Focus / Feature.
// Keys: 'rune' | 'eye' | 1..10 → arrays of 6 rows, each [action, aspect, focus, feature].
const MORIA_LORE = {
  rune: [['Believe','Alluring','Courage','Artefact'],['Bolster','Cheery','Duty','Artwork'],['Defend','Gentle','Fellowship','Illumination'],['Forgive','Good','Hope','Plants'],['Resist','Kind','Love','Shelter'],['Strengthen','Wondrous','Peace','Treasure']],
  eye:  [['Abandon','Corrupted','Curse','Darkness'],['Attack','Cruel','Despair','Ruin'],['Betray','Deceptive','Enemy','Blood'],['Corrupt','Fell','Fear','Bones'],['Defeat','Despoiled','Shadow','Corpse'],['Weaken','Treacherous','War','Trap']],
  1:  [['Aid','Abandoned','Ally','Archive'],['Ambush','Adorned','Border','Armament'],['Arrive','Ancient','Burden','Barricade'],['Await','Blocked','Community','Battlefield'],['Breach','Bold','Council','Bridge'],['Break','Broken','Court','Cave-in']],
  2:  [['Capture','Cheerless','Death','Chill'],['Change','Colossal','Decay','Container'],['Chase','Concealed','Defence','Creature'],['Command','Dangerous','Doubt','Dead-end'],['Control','Dead','Dream','Debris'],['Craft','Defended','Fate','Doorway']],
  3:  [['Defy','Destroyed','Folk','Dust'],['Deliver','Dreadful','Followers','Echoes'],['Demand','Fierce','Fortune','Encampment'],['Discover','Flourishing','Greed','Enchantment'],['Disguise','Foreboding','Haven','Excavation'],['Endure','Forgotten','Health','Fire']],
  4:  [['Escape','Forsaken','History','Fissure'],['Evade','Fragile','Honour','Fortification'],['Explore','Ghastly','Ill-fortune','Gate'],['Fortify','Gloomy','Journey','Ghost'],['Gather','Grand','Kin','Heat'],['Guard','Haunted','Knowledge','Heights']],
  5:  [['Guide','Hidden','Land','Hideaway'],['Hide','Impenetrable','Leader','Illusion'],['Hinder','Imposing','Legend','Inscription'],['Hoard','Inspiring','Life','Lair'],['Hold','Isolated','Memory','Machinery'],['Hunt','Lost','Message','Mist']],
  6:  [['Lead','Menacing','Gift','Monument'],['Learn','Mighty','Nature','Nest'],['Leave','Mysterious','Pain','Opening'],['Lose','Noble','Patron','Person'],['Mourn','Old','Peril','Pillar'],['Move','Ominous','Plan','Pit']],
  7:  [['Persist','Open','Power','Provisions'],['Preserve','Peaceful','Prophecy','Puzzle'],['Prevent','Precious','Quest','Rubbish'],['Reclaim','Restored','Refuge','Runes'],['Reject','Rugged','Riddle','Scratches'],['Remove','Secretive','Rumour','Silence']],
  8:  [['Replenish','Simple','Secret','Smoke'],['Restore','Small','Skill','Sound'],['Scheme','Stout','Song','Stairs'],['Search','Stricken','Story','Stench'],['Seize','Stubborn','Strength','Stone'],['Share','Swift','Survival','Tomb']],
  9:  [['Slay','Towering','Threat','Tool'],['Steal','Tricky','Time','Trail'],['Summon','Twisted','Trust','Vault'],['Surrender','Unfathomable','Truth','Viewpoint'],['Surround','Unnatural','Vengeance','Vision'],['Threaten','Unstable','Wealth','Voice']],
  10: [['Transform','Veiled','Weapon','Wall'],['Travel','Vigorous','Wish','Warren'],['Trick','Weary','Wound','Water'],['Uncover','Wild','Safety','Whispers'],['Uphold','Wretched','Scar','Wind'],['Withstand','Young','Magic','Wood']]
};

const FORTUNE_TABLE = [
  { roll: 'eye',  text: 'The Eye of the Enemy focuses elsewhere. Decrease Eye Awareness by 1.' },
  { roll: 1,  text: 'You may bypass a threat without attracting notice.' },
  { roll: 2,  text: 'You gain the attention of a potential ally.' },
  { roll: 3,  text: 'An enemy inadvertently reveals their position.' },
  { roll: 4,  text: 'You gain favoured ground.' },
  { roll: 5,  text: 'Enemies run afoul of danger.' },
  { roll: 6,  text: 'You locate or learn of a useful item.' },
  { roll: 7,  text: 'Your success instils new hope or renewed resolve.' },
  { roll: 8,  text: 'You find a moment of comfort or safety.' },
  { roll: 9,  text: 'You learn or realize something which gives helpful insight into your mission.' },
  { roll: 10, text: 'You encounter an opportunity suited to your nature or abilities.' },
  { roll: 'rune', text: 'An unexpected ally appears or sends aid.' }
];

const ILL_FORTUNE_TABLE = [
  { roll: 'eye',  text: 'Your actions catch the Eye of the Enemy. Increase Eye Awareness by 2.' },
  { roll: 1,  text: 'You draw unwanted attention.' },
  { roll: 2,  text: 'Your actions are observed by someone of ill-intent.' },
  { roll: 3,  text: 'Unexpected enemies emerge or are sighted.' },
  { roll: 4,  text: 'You are hindered by difficult terrain or an unfavourable environment.' },
  { roll: 5,  text: 'You find yourself ill-equipped for the circumstances.' },
  { roll: 6,  text: 'A favoured weapon or item is lost, broken, or sacrificed.' },
  { roll: 7,  text: 'You are plagued by troubling visions or thoughts.' },
  { roll: 8,  text: 'An old injury or stress resurfaces.' },
  { roll: 9,  text: 'You learn or realize something which adds a new complication to your mission.' },
  { roll: 10, text: 'You face a test which is contrary to your nature or abilities.' },
  { roll: 'rune', text: 'An ally becomes a hindrance or liability.' }
];

let oracleHistory = JSON.parse(localStorage.getItem('tor2e-oracle-history') || '[]');
function saveOracleHistory() {
  oracleHistory = oracleHistory.slice(0, 30);
  localStorage.setItem('tor2e-oracle-history', JSON.stringify(oracleHistory));
}
function logOracleRoll(label, result, journalText) {
  oracleHistory.unshift({
    label, result,
    time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})
  });
  saveOracleHistory();
  renderOracleHistory();
  // journalText (optional) lets callers supply Halbarad-style "Q → Tool(odds) → Answer" notation.
  if (typeof journalAuto === 'function') journalAuto('ojc', 'oracle', journalText || `${label} → ${result}`);
}
function renderOracleHistory() {
  const el = document.getElementById('oracle-history');
  if (!el) return;
  if (oracleHistory.length === 0) {
    el.innerHTML = '<div style="text-align:center;color:var(--text-faint);padding:10px;font-size:12px">No rolls yet.</div>';
    return;
  }
  el.innerHTML = oracleHistory.map(h => `<div style="padding:5px 8px;border-bottom:1px solid var(--border)"><strong>${h.label}</strong> · ${h.result} <span style="float:right;color:var(--text-muted);font-size:11px">${h.time}</span></div>`).join('');
}

// Core Telling-Table resolution — shared by the Oracle tab and the inline Chronicle ask.
// Rolls, logs (structured Q→Tool→Answer into the Chronicle), and returns the result.
function _tellingResult(q, chance) {
  const threshold = TELLING_THRESHOLDS[chance] || 6;
  const r = rollFeatOnce();
  let answer, twist = '';
  if (r.special === 'rune') { answer = 'YES'; twist = ' (extreme result or twist — Gandalf Rune)'; }
  else if (r.special === 'eye') { answer = 'NO'; twist = ' (extreme result or twist — Eye of Sauron)'; }
  else { answer = r.value >= threshold ? 'YES' : 'NO'; }
  const chanceLabel = chance.charAt(0).toUpperCase() + chance.slice(1);
  const jtext = `Q: ${q || '(unstated)'} · Telling Table (${chanceLabel}) → ${answer}${twist}`;
  logOracleRoll(`Telling (${chance}): "${(q || '').substring(0,30)}${(q || '').length>30?'…':''}"`, `${answer}${twist}`, jtext);
  return { answer, twist, r, threshold };
}
function rollTellingTable() {
  const q = (document.getElementById('oracle-telling-q').value || '').trim();
  const chance = document.getElementById('oracle-telling-chance').value;
  const res = _tellingResult(q, chance);
  const resultEl = document.getElementById('oracle-telling-result');
  resultEl.style.display = 'block';
  resultEl.innerHTML = `<strong>Q:</strong> ${escapeHtml(q || '(no question entered)')}<br>` +
    `<strong>Feat die:</strong> ${res.r.label} · chance: ${chance} (yes if ≥ ${res.threshold})<br>` +
    `<strong style="color:${res.answer==='YES'?'var(--success-text)':'var(--error-text)'};font-size:18px">→ ${res.answer}${res.twist}</strong>`;
}
// A random Lore row (Action/Aspect/Focus) from the active table — used by Chronicle Lore + random events.
function _randomLoreRow() {
  const moria = isMoria();
  const r = rollFeatOnce();
  const sectionKey = r.special === 'eye' ? 'eye' : (r.special === 'rune' ? 'rune' : r.value);
  const rowIdx = Math.floor(Math.random() * 6);
  if (moria) { const a = (MORIA_LORE[sectionKey] || MORIA_LORE[1])[rowIdx]; return { action: a[0], aspect: a[1], focus: a[2] }; }
  return (LORE_TABLE[sectionKey] || LORE_TABLE[1])[rowIdx];
}

function rollLoreTable() {
  const colsBtn = document.querySelector('#oracle-lore-cols .seg-btn.active');
  let cols = colsBtn ? colsBtn.dataset.val : 'all';
  const moria = isMoria();
  if (cols === 'feature' && !moria) cols = 'all';  // safety: Feature only exists in Moria
  const r = rollFeatOnce();
  const sectionKey = r.special === 'eye' ? 'eye' : (r.special === 'rune' ? 'rune' : r.value);
  const rowIdx = Math.floor(Math.random() * 6);
  let row;
  if (moria) {
    const a = (MORIA_LORE[sectionKey] || MORIA_LORE[1])[rowIdx];
    row = { action: a[0], aspect: a[1], focus: a[2], feature: a[3] };
  } else {
    row = (LORE_TABLE[sectionKey] || LORE_TABLE[1])[rowIdx];
  }
  const parts = [];
  if (cols === 'action' || cols === 'all') parts.push(`<strong>Action:</strong> ${row.action}`);
  if (cols === 'aspect' || cols === 'all') parts.push(`<strong>Aspect:</strong> ${row.aspect}`);
  if (cols === 'focus'  || cols === 'all') parts.push(`<strong>Focus:</strong> ${row.focus}`);
  if (moria && (cols === 'feature' || cols === 'all')) parts.push(`<strong>Feature:</strong> ${row.feature}`);
  const phrase = parts.map(p => p.replace(/<[^>]+>/g, '').replace(/^\w+:\s*/, '')).filter(Boolean).join(' / ');
  const resultEl = document.getElementById('oracle-lore-result');
  resultEl.style.display = 'block';
  resultEl.innerHTML = `<strong>Feat ${r.label} / Success ${rowIdx + 1}</strong>${moria ? ' <small style="color:var(--gold)">(Moria)</small>' : ''}<br>` + parts.join('<br>') + `<br><br><em>Phrase: <strong>"${phrase}"</strong></em>`;
  logOracleRoll(`Lore (${cols})`, phrase);
}

function rollFortuneTable(ill) {
  const table = ill ? ILL_FORTUNE_TABLE : FORTUNE_TABLE;
  const r = rollFeatOnce();
  let entry;
  if (r.special === 'eye') entry = table[0];
  else if (r.special === 'rune') entry = table[11];
  else entry = table.find(e => e.roll === r.value) || table[0];
  const elId = ill ? 'oracle-illfortune-result' : 'oracle-fortune-result';
  const el = document.getElementById(elId);
  el.style.display = 'block';
  el.innerHTML = `<strong>Feat die:</strong> ${r.label}<br><strong style="color:${ill?'var(--error-text)':'var(--success-text)'}">${entry.text}</strong>`;
  logOracleRoll(ill ? 'Ill-Fortune' : 'Fortune', entry.text.substring(0, 80) + (entry.text.length > 80 ? '…' : ''));
}

/* ---------- EYE OF MORDOR ---------- */
const HUNT_THRESHOLDS = { border: 18, wild: 16, dark: 14 };
const REVELATION_EPISODE_TABLE = [
  { roll: 'eye', name: 'Conflict brews between allies', desc: 'Tensions flare — an ally turns against you or another in your circle.' },
  { roll: 1, name: 'Safe Haven in peril', desc: 'Internal strife or an external threat puts your Safe Haven in danger.' },
  { roll: 2, name: 'Unexpected danger ahead', desc: 'A new threat blocks the path, forcing a new route.' },
  { roll: 3, name: 'Nature corrupted', desc: 'The wilds themselves seem to turn against you.' },
  { roll: 4, name: 'Spies report your mission', desc: 'Servants of the Enemy carry word of your purpose.' },
  { roll: 5, name: 'Ambush', desc: 'Enemy minions launch an attack or lay a trap.' },
  { roll: 6, name: 'On your trail', desc: 'Enemy minions pick up your tracks.' },
  { roll: 7, name: 'Important location lost', desc: 'A place vital to your mission is overtaken by an enemy.' },
  { roll: 8, name: 'Cursed possession', desc: 'An item you carry holds a curse, or is hunted.' },
  { roll: 9, name: 'Temptation', desc: 'You are tempted by something greatly desired.' },
  { roll: 10, name: 'Malicious lies', desc: 'Whispers and false rumours cause others to mistrust or fear you.' },
  { roll: 'rune', name: 'Important ally endangered', desc: 'Someone vital to your story is put in mortal peril.' }
];

function calcStartingEyeAwareness() {
  // Per Strider Mode: Hobbits/Men 0, Dwarves 1, Dúnedain/Elves 2, High Elves 3 + 1 if Valour ≥ 4 + 1 per Famous Weapon/Armour.
  let ea = 0;
  const culture = char.culture || '';
  if (culture.startsWith('High Elves')) ea = 3;        // High Elves of Rivendell
  else if (culture.startsWith('Dwarves')) ea = 1;
  else if (culture.startsWith('Rangers of the North') || culture.startsWith('Elves')) ea = 2;
  if ((parseInt(char.valour) || 0) >= 4) ea += 1;
  const famousCount = (char.magicalItems || []).filter(mi => mi.type === 'Famous Weapon' || mi.type === 'Famous Armour').length;
  ea += famousCount;
  return ea;
}

function resetEyeAwarenessToStarting() {
  const ea = calcStartingEyeAwareness();
  char.eyeAwareness = ea;
  saveCharacter();
  render();
  alert(`Eye Awareness reset to starting value: ${ea}.\n\n` + (
    (char.culture && char.culture.startsWith('Dwarves')) ? '+1 culture (Dwarves), ' :
    (char.culture && (char.culture.startsWith('Rangers of the North') || char.culture.startsWith('Elves'))) ? '+2 culture, ' : '+0 culture, '
  ) + `+${(parseInt(char.valour) || 0) >= 4 ? 1 : 0} Valour ≥ 4, +${(char.magicalItems || []).filter(mi => mi.type === 'Famous Weapon' || mi.type === 'Famous Armour').length} Famous item(s).`);
}

function setHuntRegion(region) {
  char.huntRegion = region;
  saveCharacter();
  refreshEyeOfMordor();
}

function refreshEyeOfMordor() {
  const card = document.getElementById('eye-of-mordor-card');
  if (!card) return;
  card.style.display = isSolo() ? 'block' : 'none';
  if (!isSolo()) return;
  const ea = parseInt(char.eyeAwareness) || 0;
  const region = char.huntRegion || 'wild';
  const huntMod = parseInt(char.huntMod) || 0;  // Moria mission modifiers (prev mission + FP duration)
  const threshold = (HUNT_THRESHOLDS[region] || 16) + huntMod;
  setText('eye-aware-v', ea);
  setText('eye-region-v', region.charAt(0).toUpperCase() + region.slice(1) + (huntMod ? (huntMod > 0 ? ' +' + huntMod : ' ' + huntMod) : ''));
  setText('eye-threshold-v', threshold);
  const regionPick = document.getElementById('eye-region-pick');
  if (regionPick) regionPick.value = region;
  const banner = document.getElementById('eye-revelation-banner');
  if (banner) banner.style.display = ea >= threshold ? 'block' : 'none';
}

async function rollRevelationEpisode() {
  if (isMoria()) return rollMoriaRevelation();
  // Strider Mode supplement Revelation table.
  const r = rollFeatOnce();
  let entry;
  if (r.special === 'eye') entry = REVELATION_EPISODE_TABLE[0];
  else if (r.special === 'rune') entry = REVELATION_EPISODE_TABLE[11];
  else entry = REVELATION_EPISODE_TABLE.find(e => e.roll === r.value) || REVELATION_EPISODE_TABLE[0];
  await alertStyled(`<strong>Revelation Episode</strong> (Feat ${r.label})<br><br><strong>${entry.name}</strong><br><br>${entry.desc}<br><br><small>After resolving the episode, reset Eye Awareness to your starting value (use the ↺ button).</small>`, '👁️ Revelation Episode');
}

// Moria Revelation Episode — pick a category (Success die 1-3 Dire / 4-5 Orc / 6 Terrors), then Feat die.
async function rollMoriaRevelation(forceCat) {
  let cat = forceCat;
  if (!cat) { const t = Math.floor(Math.random() * 6) + 1; cat = t <= 3 ? 'dire' : (t <= 5 ? 'orc' : 'terrors'); }
  const tbl = REVELATION_MORIA[cat];
  const r = rollFeatOnce();
  const key = r.special === 'eye' ? 'eye' : (r.special === 'rune' ? 'rune' : r.value);
  const [name, effect] = tbl.t[key];
  await alertStyled(`<strong>${tbl.label}</strong> (Feat ${r.label})<br><br><strong>${name}</strong><br><br>${effect}<br><br><small>After resolving, reset Eye Awareness to your starting value (↺ button). An Eye result here may escalate the next Revelation to the Ghâsh! table.</small>`, '👁️ Moria Revelation');
  logOracleRoll('Revelation: ' + tbl.label, name);
}

/* ---- Random Chamber + Orc-Band generators ---- */
function _chamberKey() { const r = rollFeatOnce(); return r.special === 'eye' ? 'eye' : (r.special === 'rune' ? 'rune' : r.value); }
function genChamber() { return { appr: CHAMBER_APPEARANCE[_chamberKey()], type: CHAMBER_TYPE[_chamberKey()], cond: CHAMBER_CONDITION[_chamberKey()], chal: CHAMBER_CHALLENGE[_chamberKey()] }; }
function rollChamber() {
  const c = genChamber();
  const el = document.getElementById('chamber-result');
  el.style.display = 'block';
  el.innerHTML = `<strong style="color:var(--gold)">${c.appr} ${c.type}</strong><br>`
    + `<small style="color:var(--text-muted)">Type:</small> ${c.type}<br>`
    + `<small style="color:var(--text-muted)">Appearance:</small> ${c.appr}<br>`
    + `<small style="color:var(--text-muted)">Condition:</small> ${c.cond}<br>`
    + `<small style="color:var(--text-muted)">Challenge:</small> ${c.chal}`;
  logOracleRoll('Chamber', `${c.appr} ${c.type} — ${c.cond} — ${c.chal}`);
}
function rollOrcBand() {
  const inp = parseInt((document.getElementById('orcband-count') || {}).value);
  const livingBand = (char.band && Array.isArray(char.band.allies)) ? char.band.allies.filter(a => !a.outOfAction).length : 0;
  const n = (inp && inp > 0) ? inp : Math.max(1, livingBand);
  const leader = ORC_BAND_LEADER[_chamberKey()];
  const members = [];
  for (let i = 0; i < n; i++) { members.push(ORC_BAND_MEMBER[Math.floor(Math.random() * 6) + 1]); }
  const el = document.getElementById('orcband-result');
  el.style.display = 'block';
  el.innerHTML = `<strong>Leader:</strong> ${leader}<br><strong>Foes (${n} Success ${n === 1 ? 'die' : 'dice'}):</strong><br>` + members.map(m => '• ' + m).join('<br>');
  logOracleRoll('Orc-Band', leader + ' + ' + members.join(', '));
}

function refreshStriderUI() {
  const solo = isSolo();
  // Shared solo surfaces — visible in EITHER Strider or Moria mode.
  const oracleTab = document.querySelector('.tab[data-tab="oracle"]');
  if (oracleTab) oracleTab.style.display = solo ? '' : 'none';
  // Chronicle (journaling) is a SOLO-PLAY feature — visible in either Strider OR Moria solo mode,
  // hidden in normal/group play.
  const showChronicle = isSolo();
  const chronicleTab = document.querySelector('.tab[data-tab="chronicle"]');
  if (chronicleTab) chronicleTab.style.display = showChronicle ? '' : 'none';
  // If we just hid the Chronicle while its panel was open, fall back to the Character tab
  // so the player isn't stranded on a now-hidden tab.
  if (!showChronicle) {
    const cp = document.getElementById('panel-chronicle');
    if (cp && cp.classList.contains('active')) {
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.getElementById('panel-character')?.classList.add('active');
      document.querySelector('.tab[data-tab="character"]')?.classList.add('active');
    }
  }
  const eomCard = document.getElementById('eye-of-mordor-card');
  if (eomCard) eomCard.style.display = solo ? 'block' : 'none';
  // Journey setup: hide role checkboxes in solo play, show explanatory hint instead.
  const rolesSection = document.getElementById('j-roles-section');
  const rolesHint = document.getElementById('j-roles-strider-hint');
  if (rolesSection) rolesSection.style.display = solo ? 'none' : '';
  if (rolesHint) rolesHint.style.display = solo ? 'block' : 'none';
  // Strider-only surfaces.
  const skirmishBtn = document.querySelector('[data-stance="skirmish"]');
  if (skirmishBtn) skirmishBtn.style.display = char.striderMode ? '' : 'none';
  // Moria-only surfaces.
  const moriaDistBtn = document.getElementById('moria-distance-btn');
  if (moriaDistBtn) moriaDistBtn.style.display = char.moriaMode ? 'block' : 'none';
  const bandTab = document.querySelector('.tab[data-tab="band"]');
  if (bandTab) bandTab.style.display = char.moriaMode ? '' : 'none';
  const battleTab = document.querySelector('.tab[data-tab="battle"]');
  if (battleTab) battleTab.style.display = char.moriaMode ? '' : 'none';
  document.querySelectorAll('.moria-only').forEach(el => { el.style.display = char.moriaMode ? '' : 'none'; });
  const callingShared = document.getElementById('calling-shared-group');
  if (callingShared) callingShared.style.display = char.moriaMode ? '' : 'none';
  // Orc-Band dice count: prefill the living Band size ONLY when the field is empty, so a manual
  // entry always sticks (an empty field means "use band size").
  const obc = document.getElementById('orcband-count');
  if (obc && char.moriaMode && document.activeElement !== obc && obc.value === '') {
    const living = (char.band && Array.isArray(char.band.allies)) ? char.band.allies.filter(a => !a.outOfAction).length : 0;
    if (living > 0) obc.value = living;
  }
  const mmBtn = document.getElementById('moria-madness-btn');
  if (mmBtn) {
    mmBtn.style.display = char.moriaMode ? 'block' : 'none';
    mmBtn.textContent = char.shadowPath === 'Moria-Madness'
      ? '↩ Restore original Shadow Path'
      : '⛏️ Follow the Moria-Madness path';
  }
  // Mode toggle button labels.
  const btn = document.getElementById('strider-mode-btn');
  if (btn) btn.textContent = char.striderMode ? '🗡️ Disable Strider Mode' : '🗡️ Enable Strider Mode (solo)';
  const mbtn = document.getElementById('moria-mode-btn');
  if (mbtn) mbtn.textContent = char.moriaMode ? '⛏️ Disable Moria Solo Mode' : '⛏️ Enable Moria Solo Mode';
  // GM Screen (P6): device-global toggle, independent of char mode. Keep its tab + label in sync.
  if (typeof refreshGmUI === 'function') refreshGmUI();
}

function toggleDarkMode() {
  const isDark = document.body.classList.contains('dark');
  localStorage.setItem(THEME_KEY, isDark ? 'light' : 'dark');
  applyTheme();
}

/* ---------- COMPACT MODE ---------- */
const COMPACT_KEY = 'tor2e-compact';   // '1' = compact, unset = normal spacing
function applyCompact() {
  if (!document.body) return;
  const on = localStorage.getItem(COMPACT_KEY) === '1';
  document.body.classList.toggle('compact', on);
  const btn = document.getElementById('compact-mode-btn');
  if (btn) btn.textContent = on ? '📏 Normal Spacing' : '📏 Compact Mode';
}
function toggleCompactMode() {
  const on = localStorage.getItem(COMPACT_KEY) === '1';
  if (on) localStorage.removeItem(COMPACT_KEY); else localStorage.setItem(COMPACT_KEY, '1');
  applyCompact();
}
(function bootstrapCompact() {
  if (document.body) applyCompact();
  else document.addEventListener('DOMContentLoaded', applyCompact);
})();

/* ---------- TEXT SIZE (U9) ---------- */
const TEXTSIZE_KEY = 'tor2e-textsize';   // unset = normal | 'small' | 'large'
const TEXTSIZES = ['normal', 'small', 'large'];
function applyTextSize() {
  if (!document.body) return;
  const v = localStorage.getItem(TEXTSIZE_KEY) || 'normal';
  document.body.classList.remove('text-small', 'text-large');
  if (v === 'small') document.body.classList.add('text-small');
  else if (v === 'large') document.body.classList.add('text-large');
  const btn = document.getElementById('textsize-btn');
  if (btn) btn.textContent = '🔠 Text Size: ' + v.charAt(0).toUpperCase() + v.slice(1);
}
function cycleTextSize() {
  const v = localStorage.getItem(TEXTSIZE_KEY) || 'normal';
  const next = TEXTSIZES[(TEXTSIZES.indexOf(v) + 1) % TEXTSIZES.length];
  if (next === 'normal') localStorage.removeItem(TEXTSIZE_KEY); else localStorage.setItem(TEXTSIZE_KEY, next);
  applyTextSize();
}
(function bootstrapTextSize() {
  if (document.body) applyTextSize();
  else document.addEventListener('DOMContentLoaded', applyTextSize);
})();

/* ---------- UNDO ---------- */
// A bounded stack of pre-mutation character snapshots. snapshot() is called by the
// mutating entry points the user is most likely to fat-finger (counters via adj(),
// condition toggles, Apply Culture). undoLast() restores the most recent snapshot.
let undoStack = [];
function snapshot() {
  try { undoStack.push(JSON.stringify(char)); } catch(e) { return; }
  if (undoStack.length > 50) undoStack.shift();
  refreshUndoButton();
}
function clearUndo() { undoStack = []; refreshUndoButton(); }
function refreshUndoButton() {
  const b = document.getElementById('undo-btn');
  if (b) b.style.display = undoStack.length ? 'inline-flex' : 'none';
}
function undoLast() {
  if (!undoStack.length) return;
  let prev;
  try { prev = JSON.parse(undoStack.pop()); } catch(e) { refreshUndoButton(); return; }
  char = migrateCharacter(prev);
  saveCharacter();
  render();
  renderHistory();
  refreshUndoButton();
}

// Run early — DOM might not be fully parsed yet, so guard against missing body.
(function bootstrapTheme() {
  if (document.body) applyTheme();
  else document.addEventListener('DOMContentLoaded', applyTheme);
  // React to system-theme changes if user hasn't set a manual override
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (!localStorage.getItem(THEME_KEY)) applyTheme();
    });
  }
})();
const HISTORY_KEY = 'tor2e-rolls-v1';

const SKILLS = {
  str: ['Awe', 'Athletics', 'Awareness', 'Hunting', 'Song', 'Craft'],
  hrt: ['Enhearten', 'Travel', 'Insight', 'Healing', 'Courtesy', 'Battle'],
  wit: ['Persuade', 'Stealth', 'Scan', 'Explore', 'Riddle', 'Lore']
};

const COMBAT_PROFS = ['Axes', 'Bows', 'Spears', 'Swords'];

// ---------- BESTIARY ----------
// Best-effort adversary stat blocks (Core Rules / Moria / Wilderland). Every field is editable
// after adding — treat these as good starting values, not verified table reproductions.
// Shape: { name, source, end, might, hate, parry, armour, atkTN, attacks:[{name,dice,dmg,inj,special}], fell }
// atkTN = the foe's attack Target Number; its attack roll must reach atkTN + your Parry total to hit.
const BESTIARY = [
  // ----- Core Rules -----
  { name: 'Orc Soldier', source: 'Core', end: 12, might: 1, hate: 2, parry: 3, armour: 2, atkTN: 14,
    attacks: [{ name: 'Broad-bladed sword', dice: 2, dmg: 5, inj: 16, special: '' }, { name: 'Vicious spear', dice: 1, dmg: 4, inj: 14, special: 'Pierce' }], fell: 'Hatred (Dwarves). Sunlight-averse.' },
  { name: 'Orc Guard', source: 'Core', end: 18, might: 1, hate: 4, parry: 4, armour: 3, atkTN: 15,
    attacks: [{ name: 'Orc-axe', dice: 3, dmg: 6, inj: 18, special: 'Fear' }], fell: 'Hatred. Denizen of the Dark.' },
  { name: 'Great Orc (Captain)', source: 'Core', end: 25, might: 2, hate: 6, parry: 5, armour: 3, atkTN: 16,
    attacks: [{ name: 'Cruel sword', dice: 3, dmg: 7, inj: 18, special: 'Heavy Blow' }], fell: 'Commanding Voice (rallies orcs). Hatred.' },
  { name: 'Warg', source: 'Core', end: 16, might: 1, hate: 4, parry: 4, armour: 1, atkTN: 15,
    attacks: [{ name: 'Bite', dice: 3, dmg: 5, inj: 16, special: 'Seize' }], fell: 'Horrible Strength. Hunts in packs.' },
  { name: 'Wild Wolf', source: 'Core', end: 8, might: 0, hate: 0, parry: 4, armour: 1, atkTN: 13,
    attacks: [{ name: 'Bite', dice: 2, dmg: 3, inj: 14, special: '' }], fell: 'Pack hunter.' },
  { name: 'Barrow-wight', source: 'Core', end: 20, might: 2, hate: 6, parry: 5, armour: 2, atkTN: 16,
    attacks: [{ name: 'Cold grip', dice: 2, dmg: 4, inj: 18, special: 'Drains Hope' }], fell: 'Wight-spell (paralysing fear). Dispelled by sunlight.' },
  { name: 'Great Spider', source: 'Core', end: 14, might: 1, hate: 4, parry: 5, armour: 1, atkTN: 15,
    attacks: [{ name: 'Venomous bite', dice: 3, dmg: 4, inj: 16, special: 'Poison' }, { name: 'Web', dice: 2, dmg: 0, inj: 0, special: 'Snare (no damage)' }], fell: 'Evil eye. Drains the doomed.' },
  { name: 'Hill-troll', source: 'Core', end: 50, might: 5, hate: 9, parry: 4, armour: 3, atkTN: 16,
    attacks: [{ name: 'Great club', dice: 4, dmg: 9, inj: 20, special: 'Break Shield' }, { name: 'Grab', dice: 3, dmg: 5, inj: 16, special: 'Seize' }], fell: 'Thick Hide. Turns to stone in sunlight. Hatred.' },
  // ----- Moria -----
  { name: 'Goblin of Moria', source: 'Moria', end: 8, might: 0, hate: 1, parry: 3, armour: 1, atkTN: 13,
    attacks: [{ name: 'Jagged blade', dice: 2, dmg: 4, inj: 14, special: '' }], fell: 'Hatred. Swarms in numbers. Sunlight-averse.' },
  { name: 'Goblin Archer', source: 'Moria', end: 8, might: 0, hate: 1, parry: 3, armour: 1, atkTN: 13,
    attacks: [{ name: 'Black bow', dice: 2, dmg: 4, inj: 14, special: 'Ranged' }], fell: 'Looses from the dark.' },
  { name: 'Goblin Captain', source: 'Moria', end: 20, might: 2, hate: 5, parry: 4, armour: 2, atkTN: 15,
    attacks: [{ name: 'Whip & blade', dice: 3, dmg: 5, inj: 16, special: 'Commanding' }], fell: 'Drives the band on. Hatred.' },
  { name: 'Cave-troll', source: 'Moria', end: 60, might: 6, hate: 9, parry: 4, armour: 4, atkTN: 16,
    attacks: [{ name: 'Stone hammer', dice: 4, dmg: 9, inj: 20, special: 'Break Shield' }, { name: 'Spiked chain', dice: 3, dmg: 6, inj: 18, special: 'Seize' }], fell: 'Thick Hide. Fearsome. Hatred.' },
  { name: 'The Watcher in the Water', source: 'Moria', end: 90, might: 8, hate: 12, parry: 5, armour: 3, atkTN: 17,
    attacks: [{ name: 'Tentacle', dice: 4, dmg: 6, inj: 18, special: 'Seize' }, { name: 'Crushing coils', dice: 3, dmg: 8, inj: 20, special: 'Drags under' }], fell: 'Many tentacles (multiple attacks/round). Lurks unseen.' },
  // ----- Wilderland -----
  { name: 'Stone-troll', source: 'Wilderland', end: 45, might: 5, hate: 8, parry: 3, armour: 4, atkTN: 15,
    attacks: [{ name: 'Heavy club', dice: 4, dmg: 8, inj: 20, special: 'Break Shield' }], fell: 'Thick Hide. Turns to stone in sunlight. Slow-witted.' },
  { name: 'Werewolf', source: 'Wilderland', end: 30, might: 3, hate: 7, parry: 5, armour: 2, atkTN: 16,
    attacks: [{ name: 'Savage bite', dice: 3, dmg: 6, inj: 18, special: 'Seize' }], fell: 'Fell Voice (Howl — Dread test). Denizen of the Dark.' },
  { name: 'Mirkwood Spider', source: 'Wilderland', end: 10, might: 0, hate: 2, parry: 4, armour: 1, atkTN: 14,
    attacks: [{ name: 'Bite', dice: 2, dmg: 3, inj: 14, special: 'Poison' }], fell: 'Hunts in webs. Evil eye.' },
  { name: 'Wild Bear', source: 'Wilderland', end: 22, might: 1, hate: 0, parry: 4, armour: 1, atkTN: 14,
    attacks: [{ name: 'Claws & maw', dice: 3, dmg: 5, inj: 16, special: '' }], fell: 'Great Strength. Not evil — provoked.' },
  { name: 'Marsh-dweller', source: 'Wilderland', end: 12, might: 1, hate: 3, parry: 4, armour: 1, atkTN: 14,
    attacks: [{ name: 'Clammy grasp', dice: 2, dmg: 4, inj: 16, special: 'Drags under' }], fell: 'Lures with pale lights. Lurks in bog-water.' }
];
