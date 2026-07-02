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
      if (t.dataset.tab !== 'skills' && editMode) {
        toggleEditMode();
      }
      if (t.dataset.tab === 'chronicle') renderChronicle();
      if (t.dataset.tab === 'reference') renderReference();
      if (t.dataset.tab === 'gm' && typeof renderGm === 'function') renderGm();
      window.scrollTo(0, 0);
    };
  });
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

/* ---------- MENU ---------- */
function toggleMenu() {
  const ov = document.getElementById('menu-overlay');
  ov.classList.toggle('show');
  // P3: refresh the cloud sync status line whenever the menu opens.
  if (ov.classList.contains('show')) {
    const el = document.getElementById('sync-status-line');
    if (el && typeof Sync !== 'undefined') {
      const on = Sync.isEnabled();
      el.textContent = (on ? '☁️ ' : '📴 ') + Sync.status();
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
      '📦 Restore Heroes')) { e.target.value = ''; return; }
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
      '📥 Import Character')) return;
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
  if (await confirmStyled('Erase character and start fresh? This cannot be undone.\n\nRoll history and the Chronicle will also be cleared.')) {
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
  inspired: false,        // RAW p.20: Inspired doubles the +1d Hope bonus to +2d (no effect without Hope spend)
  inspiredSource: '',     // 'Brave at a Pinch' | 'Distinctive Feature' | ...
  isAttack: false,  // only true when rolling a combat proficiency (weapon attack)
  foeParry: 0,      // current foe's Parry rating — adds to Str TN on attack rolls (RAW p.98)
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
  diceState.weary = !!char.weary;
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
    el.innerHTML = `⚖ ${favList} ⇄ ${illList} — cancel to Normal (RAW p.20)`;
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

function rollDice(skillLabel) {
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
    if (r !== chosenFeat) d.style.opacity = '0.4';
    diceDiv.appendChild(d);
  });

  successRolls.forEach(s => {
    const d = document.createElement('div');
    d.className = 'success-die' + (s.icon ? ' icon' : '') + (s.wearied ? ' dim' : '');
    d.textContent = s.value;
    diceDiv.appendChild(d);
  });

  document.getElementById('result-total').textContent = isAutoSuccess ? '★' : (isAutoFail ? '✗' : total);

  const tnLabel = foeParryBonus > 0 ? `${tn} (${baseTn} Str + ${foeParryBonus} Foe Parry)` : `${tn}`;
  let summary = `<strong>vs TN ${tnLabel}</strong> — `;
  summary += outcome.startsWith('SUCCESS')
    ? `<span class="result-tag tag-success">${outcome}</span>`
    : `<span class="result-tag tag-fail">${outcome}</span>`;
  if (level === 'Great') summary += `<span class="result-tag tag-great">Great Success</span>`;
  if (level === 'Extraordinary') summary += `<span class="result-tag tag-extra">Extraordinary</span>`;
  if (icons > 0) summary += `<br><small>${icons} success icon${icons>1?'s':''}</small>`;
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
    summary += `<div id="shadow-apply-row" style="margin-top:6px;display:flex;gap:6px;align-items:center;flex-wrap:wrap;font-size:12px">
      <span>Incoming Shadow:</span>
      <input id="shadow-incoming" type="number" min="0" value="${diceState.shadowTest === 'Sorcery' ? 2 : 1}" style="width:48px;padding:3px 5px;border:1px solid var(--border);border-radius:4px;background:var(--bg-deep);color:var(--ink)">
      <button onclick="applyShadowTestResult(${reduction})" style="background:var(--btn-alert-bg);color:white;border:none;border-radius:5px;padding:5px 10px;font-weight:600;cursor:pointer">Apply Shadow</button>
    </div>`;
  }
  if (diceState.firstAid) {
    char.firstAidUsed = true;  // success or fail, the attempt is spent
    if (outcome.startsWith('SUCCESS') && !isAutoFail) {
      const reduction = Math.max(1, 1 + icons);
      const before = parseInt(char.injuryDays) || 0;
      const after = Math.max(0, before - reduction);
      char.injuryDays = after;
      char.injury = after > 0
        ? `Severe Injury — ${after} day${after>1?'s':''} to mend (First Aid: ${before}→${after})`
        : `Healing applied — injury minor; recovers naturally`;
      summary += `<br><span class="result-tag" style="background:var(--success-text);color:white">⛑️ First Aid: reduced injury by ${reduction} day${reduction!==1?'s':''} (${before}→${after})</span>`;
    } else {
      summary += `<br><span class="result-tag" style="background:var(--error-text);color:white">⛑️ First Aid failed — retry only after 1 day passes</span>`;
    }
    saveCharacter();
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
      pierceDiv.innerHTML = `<button onclick="applyPierce()" style="background:var(--warn-orange);color:white;border:none;border-radius:6px;padding:8px 14px;font-size:13px;font-weight:600;cursor:pointer">🗡️ Pierce: spend 1 ✦ (${diceState.lastAttackProf} +${pierceBonus}) → Feat ${chosenFeat.value}→${newFeat}${piercedNow}</button>`;
    } else {
      pierceDiv.innerHTML = '';
      diceState.pendingPierce = null;
    }
  }

  // Solo modes (Strider / Moria): Eye-Awareness auto-increment hooks (per supplement).
  // Raise EA by 1 on any Eye or Rune outside combat. Magical Success also raises EA by 1.
  if (isSolo() && !diceState.isAttack) {
    let eaDelta = 0;
    if (chosenFeat.special === 'eye' || chosenFeat.special === 'rune') eaDelta += 1;
    if (diceState.magical) eaDelta += 1;
    if (eaDelta > 0) {
      char.eyeAwareness = (parseInt(char.eyeAwareness) || 0) + eaDelta;
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
    let fortuneType = null;
    if (chosenFeat.special === 'rune' && outcome.startsWith('SUCCESS')) fortuneType = 'fortune';
    else if (chosenFeat.special === 'eye' && !outcome.startsWith('SUCCESS')) fortuneType = 'illfortune';
    if (fortuneType) {
      const btn = document.createElement('div');
      btn.id = 'strider-fortune-action';
      btn.style.cssText = 'margin-top:8px;text-align:center';
      const isIll = fortuneType === 'illfortune';
      btn.innerHTML = `<button onclick="rollAutoFortune('${fortuneType}')" style="background:${isIll?'var(--btn-alert-bg)':'var(--gold)'};color:white;border:none;border-radius:6px;padding:8px 14px;font-size:13px;font-weight:600;cursor:pointer">${isIll?'🎲 Roll Ill-Fortune Table (Eye)':'🎲 Roll Fortune Table (Rune)'}</button>`;
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
    time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})
  });
  saveHistory();
  renderHistory();
  if (typeof journalAuto === 'function') journalAuto('dice', 'roll', `${label} — ${isAutoSuccess ? '★' : (isAutoFail ? '✗' : total)} vs ${tn} → ${outcome}${icons ? ' (' + icons + '✦)' : ''}`);

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
      let line = `${stance}${wpn ? wpn.name : prof} · ${score} vs ${tn} → ${outcome}${icons ? ` (${icons}✦)` : ''}`;
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
  el.innerHTML = `<div style="font-size:11px;color:var(--text-muted);background:var(--bg-deep);border:1px solid var(--border);border-radius:6px;padding:6px 9px;margin-bottom:8px;display:flex;flex-wrap:wrap;gap:4px 12px">
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
    div.innerHTML = '<div style="text-align:center;color:var(--text-faint);padding:10px;font-size:12px">No rolls yet</div>';
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
    div.innerHTML = '<div style="text-align:center;color:var(--text-faint);padding:10px;font-size:12px">No matching rolls</div>';
    return;
  }
  rows.slice(0, 20).forEach(h => {
    const item = document.createElement('div');
    item.className = 'history-item';
    const color = h.outcome.startsWith('SUCCESS') ? '#2e7d32' : 'var(--error-text)';
    // Real index into the full history array (rows is filtered/sliced; object identity maps back).
    const realIdx = history.indexOf(h);
    item.innerHTML = `
      <span><strong>${h.label}</strong> · ${h.total} vs ${h.tn}</span>
      <span style="color:${color}">${h.outcome}${h.icons ? ' · '+h.icons+'⬢' : ''} · ${h.time}
        <button onclick="deleteRollAt(${realIdx})" aria-label="Delete this roll" title="Delete this roll" style="background:none;border:none;color:var(--text-faint);cursor:pointer;font-size:14px;padding:0 0 0 6px;vertical-align:middle">×</button></span>
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
  if (!await confirmStyled(`Delete all ${history.length} stored roll(s) for this hero? This cannot be undone.`, 'Clear Roll History')) return;
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
  if (typeof clearUndo === 'function') clearUndo();
  render(); renderHistory(); renderChronicle();
}
async function _tutExitSandbox() {
  const sb = window._tutSandbox; if (!sb) { return; }
  saveCharacter();
  const keep = await confirmStyled(`Keep this practice hero in your roster?<br><br>Save <strong>${escapeHtml(char.name || 'the hero')}</strong> as a real character, or discard it. Either way your previous character comes back.`, '📖 Tutorial');
  if (keep) {
    char.name = (char.name || 'Hero').replace(/\s*\(Practice\)\s*/i, '').trim() || 'Hero';
    if (char.name === 'Practice Hero') char.name = 'Hero';
    saveCharacter();  // leaves it active, in the roster, renamed
  } else {
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
}

/* ----- the Lessons menu ----- */
function openTutorial() {
  const m = document.getElementById('menu-overlay'); if (m) m.classList.remove('show');
  _tutEnterSandbox();
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
    return `<button onclick="tutStartLesson('${l.id}')" class="add-row-btn" style="width:100%;text-align:left;margin-bottom:6px;background:var(--bg-deep);color:var(--ink);font-size:13px;display:flex;align-items:center;gap:9px;padding:9px 10px">
        <span style="font-size:18px;flex:0 0 auto">${l.icon}</span>
        <span style="flex:1;min-width:0"><strong>${escapeHtml(l.title)}</strong><br><span style="font-size:11px;color:var(--text-muted)">${escapeHtml(l.sub || '')}</span></span>
        <span style="font-size:11px;font-weight:600;color:${done ? 'var(--gold)' : 'var(--text-faint)'}">${tag}</span>
      </button>`;
  }).join('');
  ov.innerHTML = `<div class="menu" style="max-width:400px;width:93%;max-height:90vh;overflow-y:auto">
      <h3 style="margin-top:0">📖 Learn the Game</h3>
      <p class="hint" style="text-align:left;margin:0 0 10px">Lessons run on a safe <strong>practice hero</strong> — your real characters aren't touched. Pick any topic.</p>
      ${items}
      <button onclick="tutDone()" class="add-row-btn" style="width:100%;margin-top:8px;background:var(--btn-secondary-bg);color:white">Done — exit tutorial</button>
      <button onclick="resetTutorial()" class="add-row-btn" style="width:100%;margin-top:6px;background:none;border:1px solid var(--border);color:var(--text-muted);font-size:12px">↺ Reset tutorial progress</button>
    </div>`;
  ov.classList.add('show');
}
// Clear all tutorial progress (✓ completed marks + resume points) and re-arm the first-run welcome.
async function resetTutorial() {
  if (!await confirmStyled(`Reset the whole tutorial?<br><br>This clears every ✓ completed mark and resume point, and the one-time welcome offer will appear again. Your characters are not affected.`, '↺ Reset Tutorial')) return;
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
  card.style.cssText = 'position:fixed;max-width:340px;width:88%;background:var(--bg);border:2px solid var(--gold);border-radius:12px;padding:0 16px 14px;box-shadow:0 10px 38px rgba(0,0,0,.5);font-size:14px;color:var(--ink);box-sizing:border-box;pointer-events:auto';
  ov.appendChild(hole); ov.appendChild(card);
  document.body.appendChild(ov);
  // Floating "Return to tutorial" pill, shown while the tour has stepped aside (hands-on mode).
  if (!document.getElementById('tut-pill')) {
    const pill = document.createElement('button'); pill.id = 'tut-pill';
    pill.onclick = tutReturn;
    pill.style.cssText = 'position:fixed;left:50%;bottom:calc(16px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:1001;display:none;background:var(--gold);color:var(--ink);border:2px solid var(--gold);border-radius:24px;padding:11px 20px;font-size:14px;font-weight:700;box-shadow:0 4px 18px rgba(0,0,0,.45);cursor:pointer;max-width:90%';
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
  const intro = step.intro ? `<div style="font-style:italic;color:var(--gold);margin-bottom:8px;font-size:13px;line-height:1.5">${step.intro}</div>` : '';
  const title = step.title ? `<div style="font-weight:700;margin-bottom:4px">${step.title}</div>` : '';
  const more = step.more ? `<details style="margin-top:8px"><summary style="cursor:pointer;color:var(--gold);font-size:12px">Tell me more</summary><div style="margin-top:6px;font-size:12.5px;color:var(--text-muted);line-height:1.55">${step.more}</div></details>` : '';
  // Interactive steps have a `done` predicate. The "Try it" button steps the tutorial fully aside
  // (clears the dim + card) so you can act on the real page; a Return pill brings it back, and it
  // also auto-returns the moment the action is done. Already-satisfied steps just say so.
  const cue = step.done
    ? (wasDone
      ? `<div style="margin-top:9px;font-size:12px;color:var(--text-muted);background:var(--bg-deep);border-radius:6px;padding:6px 8px">✓ Already done — tap <strong>Next</strong> to go on.</div>`
      : `<button onclick="tutStepAside()" class="add-row-btn" style="width:100%;margin-top:10px;background:var(--gold);font-size:14px;font-weight:700">👉 Try it on the page →</button>
         <div style="margin-top:5px;font-size:11px;color:var(--text-muted);text-align:center">The tutorial steps aside so you can do it. It pops back automatically when you finish — or tap the ↩ Return pill.</div>`)
    : '';
  const nextLabel = s.step === total - 1 ? 'Finish ✓' : (step.done && !wasDone ? 'Skip ›' : 'Next ›');
  return `<div id="tut-drag" style="display:flex;align-items:center;gap:6px;margin:0 -16px 6px;padding:10px 16px 6px;cursor:grab;border-bottom:1px dashed var(--border)" title="Drag to move this window">
      <span style="color:var(--text-faint);font-size:13px;letter-spacing:1px">⠿</span>
      <span style="font-size:11px;font-weight:700;color:var(--gold);flex:1;min-width:0">${escapeHtml(s.lessonTitle)}</span>
      <span style="font-size:11px;color:var(--text-faint)">${n}/${total}</span>
      <button onclick="tutExit()" title="Exit" style="background:none;border:none;color:var(--text-faint);font-size:17px;cursor:pointer;line-height:1">×</button>
    </div>
    ${intro}${title}
    <div style="line-height:1.55">${step.body}</div>
    ${cue}
    ${more}
    <div style="display:flex;gap:6px;margin-top:12px">
      <button onclick="tutPrev()" class="add-row-btn" style="background:var(--btn-secondary-bg);color:white;font-size:13px;${s.step === 0 ? 'opacity:0.4;pointer-events:none' : ''}">‹ Back</button>
      <button id="tut-next-btn" onclick="tutNext()" class="add-row-btn" style="flex:1;background:var(--gold);font-size:14px">${nextLabel}</button>
    </div>
    <div style="display:flex;gap:10px;justify-content:center;margin-top:7px">
      <button onclick="tutStepAside()" style="background:none;border:none;color:var(--text-faint);font-size:11px;cursor:pointer;text-decoration:underline">🔍 Look around the app</button>
      <button onclick="tutExit()" style="background:none;border:none;color:var(--text-faint);font-size:11px;cursor:pointer;text-decoration:underline">Skip / back to lessons</button>
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
function maybeOfferTutorial() {
  const p = loadTutProgress();
  if (p.offered) return;
  p.offered = true; saveTutProgress(p);
  setTimeout(async () => {
    if (await confirmStyled(`Welcome to the TOR2E Tracker!<br><br>New to the app or to <em>The One Ring</em>? Take a short <strong>guided tutorial</strong> — it runs on a practice hero and walks you through making a character, combat, journeys, and more.`, '📖 Welcome')) {
      openTutorial();
    }
  }, 700);
}

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
      { tab: 'combat', sel: '[data-stance="rearward"]', title: `Wounds, fleeing & more`, body: `A Wound is serious — you're hurt until you heal. To escape, use “🏃 Fly, You Fools!”. Brawling, two-handed grips, and a Foe-Parry counter all live on this tab.`, more: `At 0 Endurance you are Dying — out of the fight unless aided. A Wound on top of that is dire; sometimes retreat is the wise course.` },
      { tab: 'combat', sel: '#encounter-card-wrap', title: `End the encounter`, body: `When the foes are down, tap “End encounter”. In solo play the whole fight folds neatly into your Chronicle as one entry. Recover your Endurance by resting afterward.`, more: `Combat ends when one side is defeated or flees. Hate is the foe's version of Hope — some spend it for fell deeds.` }
    ] },
  { id: 'conditions', icon: '🌑', title: 'Conditions, Shadow & Rest', sub: 'Endurance, Hope, dread and wounds',
    prep: c => { _tutBuildIfBlank(c); c.shadow = 2; c.endCur = Math.max(1, (parseInt(c.endMax) || 30) - 8); },
    steps: [
      { tab: 'character', sel: '#end-cur-v', intro: `The road wears at body and soul alike.`, title: `Endurance`, body: `Endurance is your physical stamina. It falls from blows and heavy loads; at 0 you are Dying. Adjust it with the +/− buttons.`, more: `Carrying too much — load plus travel Fatigue — can leave you Weary even at full Endurance.` },
      { tab: 'character', sel: '[onclick="takeShortRest()"]', title: `Resting`, done: (c, b) => (parseInt(c.endCur) || 0) !== b.end, body: `Tap ☀️ Short Rest to recover Strength in Endurance, or 🌙 Prolonged Rest for a full night's recovery. Take a rest now.`, more: `A Prolonged Rest in a Safe Haven also clears lingering travel Fatigue, and returns a point of Hope if you were at zero.` },
      { tab: 'character', sel: '#hope-cur-v', title: `Hope`, body: `Hope fuels your dice and your virtues. At 0 Hope you can spend none — a perilous place to be.`, more: `Recover Hope mainly in the Fellowship phase, or by spending a Fellowship point during a rest.` },
      { tab: 'character', sel: `[onclick="adj('shadow',1)"]`, title: `Gaining Shadow`, done: (c, b) => ((parseInt(c.shadow) || 0) + (parseInt(c.scars) || 0)) > b.shadow, body: `Shadow gathers from dread, anguish, and dark deeds. Raise it to see what happens. When Shadow + Scars reaches your current Hope, you become Miserable.`, more: `A Shadow Test (Dread / Greed / Sorcery, on the Dice tab) can reduce incoming Shadow — roll Valour or Wisdom against it.` },
      { tab: 'character', sel: '[data-cond="weary"]', title: `Conditions`, done: c => !!(c.weary || c.miserable || c.wounded), body: `Toggle Weary, Miserable, or Wounded as they strike. Weary zeroes low Success dice; Miserable makes an Eye auto-fail; Wounded means you're injured and mending. Toggle one.`, more: `Becoming Wounded opens a First Aid (HEALING) roll and a day-count below; a Severe injury can be fatal without treatment.` },
      { tab: 'character', sel: '#harden-will-btn', title: `Bouts of Madness & Scars`, body: `If Shadow ever fills your Hope completely, you suffer a Bout of Madness — gaining a Flaw from your Shadow path. The 🔥 Harden Will button (“Clear Shadow → +1 Scar”, in the Hope card) clears your Shadow now, at the price of a permanent Scar.`, more: `Scars count as permanent Shadow for triggers. Gather all four Flaws of your path and the hero is lost — retired to the tale.` }
    ] },
  { id: 'journey', icon: '🥾', title: 'Journey', sub: 'Cross the wild from here to there',
    prep: c => { _tutBuildIfBlank(c); if (c.journey) c.journey.active = false; },
    steps: [
      { tab: 'journey', sel: '#j-start-btn', intro: `It is a dangerous business, going out your door.`, title: `Plan the route`, done: c => !!(c.journey && c.journey.active), body: `In the Journey Setup card, set your origin, destination, distance in hexes, season and region, then tap “▶ Start Journey”. Try starting one.`, more: `Distance and terrain decide how long you travel and how many Events you face. Harsh seasons and dark regions make it worse.` },
      { tab: 'journey', title: `Roles`, body: `In a full company each hero takes a role — Guide, Hunter, Look-out, Scout. Travelling solo, you are all of them. Roles decide who rolls for each Event.`, more: `The Guide rolls the Marching Tests; others cover Hunting (food), Awareness (ambush) and Scouting (the way ahead).` },
      { tab: 'journey', sel: '[onclick="rollMarchingTest()"]', title: `Marching Tests & Fatigue`, body: `Tap “🚶 Marching Test” to roll TRAVEL and advance day by day. Fatigue builds with distance and hard terrain; too much makes you Weary.`, more: `Forced March covers ground faster but piles on Fatigue. Mounts ease it, but have their own Vigour to spend.` },
      { tab: 'journey', sel: '#j-resolve-event-btn', title: `Journey Events`, body: `At set points an Event fires — “🎲 Resolve Event Now” lights up when you reach one — Terrible Misfortune, Despair, Ill Choices, a Mishap, a Short Cut, or a Joyful Sight. Resolve the roll it calls for.`, more: `A ⭐ Noteworthy Encounter is a full scene — a fight, a council, or a discovery. Events can cost Fatigue, Hope, or Shadow.` },
      { tab: 'journey', sel: '[onclick="arriveAtDestination()"]', title: `Arrival`, body: `At your destination, tap “🏁 Arrive at Destination”. A final TRAVEL roll sets your lingering Fatigue, carried onto your Character sheet until you rest.`, more: `Then the adventure continues — a council, a ruin, a foe — wherever the road has led you.` }
    ] },
  { id: 'council', icon: '🗣️', title: 'Councils & Endeavours', sub: 'Words, and long labours',
    prep: c => _tutBuildIfBlank(c),
    steps: [
      { tab: 'council', sel: '[onclick="startCouncil()"]', intro: `Not every battle is fought with the sword.`, title: `Begin a Council`, done: c => !!(c.council && c.council.active), body: `A Council is a social contest. Set the topic, the audience's Resistance and attitude, then tap “▶ Begin Council”. Try it.`, more: `Resistance is how many successes you need to win them over; attitude (Reluctant / Open / Friendly) gives ±1 die to your rolls.` },
      { tab: 'council', title: `Introduction`, body: `First make an Introduction roll (AWE, COURTESY, or RIDDLE) to set your time limit — how many attempts you get before patience runs out.`, more: `A strong introduction buys you more attempts; a poor one leaves you little room to manoeuvre.` },
      { tab: 'council', title: `Interaction`, body: `Then use skills like PERSUADE, INSIGHT, ENHEARTEN, RIDDLE or SONG to wear down the Resistance. Each success contributes 1 + its ✦ icons.`, more: `A Roleplay Bonus for a relevant or brilliant point adds dice. Run out of time and you may accept failure, or a costly Success-with-Woe.` },
      { tab: 'council', title: `Skill Endeavours`, body: `Scroll to the Skill Endeavour section for long tasks — research, crafting, healing. Set a Resistance, a time limit, and a risk level, then roll until it's done.`, more: `Risk levels: Standard, Hazardous (failures bring Woe), and Foolish (a single failure is a Disaster). Choose your gamble.` }
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
      { tab: 'character', sel: '[onclick="awardSessionXP()"]', intro: `Between perils, heroes rest, mend, and grow in renown.`, title: `Earn experience`, done: (c, b) => ((parseInt(c.skillPts) || 0) > b.sp || (parseInt(c.advPts) || 0) > b.ap), body: `After a session, tap “Award Session XP (+3 SP / +3 AP)” in the 📜 End Session card. Try it.`, more: `Skill points raise skills; Adventure points raise combat proficiencies and buy Valour & Wisdom.` },
      { tab: 'character', sel: `[onclick="openSpendXP('skill')"]`, title: `Spend points`, done: (c, b) => ((parseInt(c.skillPts) || 0) < b.sp), body: `Tap a Spend button to raise a skill or proficiency. Higher ranks cost more — 4 / 8 / 12 / 20 / 26 / 30 points to reach each rank. Spend some.`, more: `In a strict Fellowship phase you may raise each skill or proficiency only once, and choose Valour OR Wisdom — the wizard enforces this.` },
      { tab: 'character', sel: `[onclick="adj('valour',1)"]`, title: `Valour & Wisdom`, body: `Valour is renown; Wisdom is insight. Raising Valour grants a new Reward; raising Wisdom grants a new Virtue.`, more: `They also power Valour rolls (vs Heart, against dread) and Wisdom rolls (vs Wits, against greed and sorcery).` },
      { tab: 'character', sel: '[onclick="openFPWizard()"]', title: `The Fellowship Phase`, body: `When an adventure ends, tap “Open Fellowship Phase Wizard” in the 🌿 End Adventuring Phase card: recover Hope, remove Shadow, update skills, and choose an Undertaking.`, more: `Undertakings: heal a Scar, write a song, strengthen the Fellowship, raise an heir, meet your Patron, study items — some free to your Calling.` },
      { tab: 'character', title: `Yule`, body: `A Yule Fellowship phase is special: your hero ages a year, gains bonus Skill points, and recovers fully. The year turns in your tale.`, more: `Across a campaign your hero grows mighty — while the years and the Scars accumulate. That long arc is the soul of the game.` }
    ] },
  { id: 'solo', icon: '🗡️', title: 'Solo Play', sub: 'Strider, Moria, Oracle & Chronicle',
    prep: c => { _tutBuildIfBlank(c); c.striderMode = true; if (!c.fellowshipRating || c.fellowshipRating < 3) c.fellowshipRating = 3; },
    steps: [
      { tab: 'character', intro: `Even alone, a Ranger's long road can be walked.`, title: `Solo modes`, body: `The ☰ menu offers “Enable Strider Mode” (lone-hero play) and “Enable Moria Solo Mode” (the Durin's Folk campaign). We've switched Strider on for this lesson.`, more: `Solo mode lowers your Target Numbers (18 − rating), sets a minimum Fellowship rating, and unlocks the Oracle, the Eye of Mordor, and the Chronicle.` },
      { tab: 'oracle', sel: '[onclick="rollTellingTable()"]', title: `The Oracle — yes or no`, body: `With no Loremaster, the Oracle answers for the world. Ask a yes/no question, set the odds, and tap “Ask the Telling Table”. Try it.`, more: `A ☉ rune or 👁 Eye on the answer adds a twist — “yes, but…” or “no, and…” — to keep the story surprising.` },
      { tab: 'oracle', sel: '[onclick="rollLoreTable()"]', title: `The Oracle — inspiration`, body: `Stuck for what happens next? The Lore Table gives Action / Aspect / Focus words to spark a scene, an NPC, or a complication.`, more: `Fortune and Ill-Fortune tables turn special Feat results on your ordinary rolls into unfolding story events.` },
      { tab: 'character', sel: '#eye-of-mordor-card', title: `The Eye of Mordor`, body: `In solo play the Eye measures how close the Enemy is to noticing you. It rises as you act and gather Shadow; cross the Hunt threshold and a Revelation Episode strikes.`, more: `Each region has its own Hunt threshold — the deeper into darkness you go, the sooner the Eye turns your way.` },
      { tab: 'chronicle', sel: '[onclick="rollWritingPrompt()"]', title: `The Chronicle`, body: `Your solo journal. Scenes, dice, oracle results, and whole combats fold into a Tale of Years you can export. Tap “🎬 Scene” to seed what happens next. Try it.`, more: `It auto-captures the mechanical beats — rolls, oracle answers, journey events, combats — and you write the prose around them.` },
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
function initSwipeTabs() {
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
    const tabs = Array.from(document.querySelectorAll('.tab')).filter(x => x.style.display !== 'none');
    const cur = tabs.findIndex(x => x.classList.contains('active'));
    if (cur < 0) return;
    const next = dx < 0 ? cur + 1 : cur - 1;   // swipe left = next tab, right = previous
    if (next >= 0 && next < tabs.length) tabs[next].click();
  }, { passive: true });
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
    const key = (panel ? panel.id : '?') + '|' + h.textContent.trim().slice(0, 40);
    h.classList.add('collapsible');
    h.setAttribute('role', 'button');
    h.setAttribute('tabindex', '0');
    if (saved[key]) card.classList.add('collapsed');
    h.setAttribute('aria-expanded', card.classList.contains('collapsed') ? 'false' : 'true');
    const toggle = () => {
      const on = card.classList.toggle('collapsed');
      h.setAttribute('aria-expanded', on ? 'false' : 'true');
      const s = loadCollapsed();
      if (on) s[key] = 1; else delete s[key];
      try { localStorage.setItem(COLLAPSE_KEY, JSON.stringify(s)); } catch (e) {}
    };
    h.addEventListener('click', e => { if (e.target.closest('button, input, select, a')) return; toggle(); });
    h.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
  });
}

/* ---------- U7: contextual (?) hints on key Character-tab labels ---------- */
// Reuses the Reference tab's REFERENCE.terms as the single source of truth.
const HINT_LABELS = { 'End Max': 'Endurance', 'Hope Max': 'Hope', 'Parry': 'Parry', 'Load': 'Load', 'Fatigue': 'Fatigue', 'Shadow': 'Shadow / Scars', 'Scars': 'Shadow / Scars', 'Valour': 'Valour', 'Wisdom': 'Wisdom' };
function hintFor(term) {
  const row = (REFERENCE.terms || []).find(t => t[0] === term) || (REFERENCE.tn || []).find(t => t[0] === term);
  if (row) alert(row[0] + '\n\n' + row[1]);
}
function initHintButtons() {
  document.querySelectorAll('#panel-character .counter-label').forEach(el => {
    if (el.dataset.hinted) return;
    const label = el.textContent.replace('🔒', '').trim();
    const term = HINT_LABELS[label];
    if (!term) return;
    el.dataset.hinted = '1';
    const b = document.createElement('button');
    b.className = 'hint-q'; b.textContent = '?';
    b.setAttribute('aria-label', 'What is ' + term + '?');
    b.onclick = ev => { ev.stopPropagation(); hintFor(term); };
    el.appendChild(b);
  });
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
        const f = focusables(ov);
        if (f.length) setTimeout(() => { try { f[0].focus(); } catch (e) {} }, 30);
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
  });
}

document.addEventListener('DOMContentLoaded', () => {
  if (typeof Sync !== 'undefined') Sync.init();   // P3: boot cloud sync if configured; else a no-op (stays local)
  initA11y();                                      // P8: dialog/focus/keyboard accessibility
  bindInputs();
  bindTabs();
  bindDice();
  bindBuilder();
  render();
  renderHistory();
  renderChronicle();
  restoreLastTab();   // U4: reopen the tab the player was last on (if still visible)
  initSwipeTabs();          // U4: swipe between tabs on touch
  initCollapsibleCards();   // U3: tap a card title to collapse (remembered per device)
  initHintButtons();        // U7: (?) hints on key Character-tab labels
  if (typeof snapshotHero === 'function') snapshotHero(activeCharId, 'load');   // U12: one auto-backup per load
  importFromHash();   // offer to import a character if the URL carries a shared payload
  maybeOfferTutorial();   // one-time first-run offer of the guided tutorial
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
