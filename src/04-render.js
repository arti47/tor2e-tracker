/* ---------- RENDERING ---------- */
function render() {
  // Fields
  document.querySelectorAll('[data-field]').forEach(el => {
    const k = el.dataset.field;
    if (el.type === 'checkbox') el.checked = !!char[k];
    else el.value = char[k] !== undefined ? char[k] : '';
  });

  // Print-only title
  const pt = document.getElementById('print-title');
  if (pt) pt.textContent = (char.name || 'Character') + (char.culture ? ' — ' + char.culture : '') + (char.calling ? ' · ' + char.calling : '');

  // Auto-compute Load before rendering counters
  recomputeLoad();
  // Sync rewards/virtues text from arrays
  syncRewardsText();
  syncVirtuesText();

  // Counters
  setText('end-max-v', char.endMax);
  setText('end-cur-v', char.endCur);
  setText('load-v', char.load);
  setText('fat-v', char.fatigue);
  setText('hope-max-v', char.hopeMax);
  setText('hope-cur-v', char.hopeCur);
  setText('shadow-v', char.shadow);
  setText('scar-v', char.scars);
  setText('valour-v', char.valour);
  setText('wisdom-v', char.wisdom);
  setText('fellow-v', char.fellowship);
  setText('skp-v', char.skillPts);
  setText('adv-v', char.advPts);
  setText('tre-v', char.treasure);
  setText('foes-v', char.engagedFoes || 0);
  setText('end-virtue-v', char.endBonusVirtue || 0);
  setText('hope-virtue-v', char.hopeBonusVirtue || 0);
  setText('other-load-v', char.otherLoad || 0);
  setText('fellow-rating-v', char.fellowshipRating || 0);

  // Conditions
  ['weary','miserable','wounded'].forEach(c => {
    const btn = document.querySelector(`[data-cond="${c}"]`);
    btn.classList.toggle('active', !!char[c]);
  });

  renderDerivedStats();
  renderConditionWarnings();
  refreshHardenWillButton();
  renderBoutDue();
  refreshFirstAidRow();
  refreshFPSummary();
  renderJourney();
  renderCouncil();
  renderSkillEndeavour();
  renderBand();
  renderBattle();
  renderMagicalItems();
  refreshStriderUI();
  refreshEyeOfMordor();
  if (typeof renderSaga === 'function') renderSaga();                      // campaign arc: start/sustain/end
  if (typeof renderAdventureLoop === 'function') renderAdventureLoop();   // which subsystem fires, and when
  if (typeof renderPlay === 'function') renderPlay();                     // Play mode: the app runs the session
  if (typeof renderBuildChecklist === 'function') renderBuildChecklist();  // live creation progress
  if (typeof renderOwedPicks === 'function') renderOwedPicks();           // unclaimed Reward/Virtue from a rank-up
  if (typeof refreshXpMode === 'function') refreshXpMode();     // one XP scheme live at a time
  if (typeof refreshFpEntry === 'function') refreshFpEntry();   // Moria FP vs the core wizard
  renderOracleHistory();
  refreshRetiredPill();
  renderFocusOptions();
  renderStance();
  renderFeaturesPicker();
  renderFavouredPicker();
  renderLifepathCard();
  renderCombatProfsPicker();
  renderPECard();
  renderUsefulItemsPicker();
  renderUsefulItemsDisplay();
  if (typeof renderCampSeals === 'function') renderCampSeals();
  renderRewardsPicker();
  renderVirtuesPicker();
  refreshKeenButton();
  refreshBraveButton();
  refreshInvokeDFButton();
  refreshConditionalVirtueButtons();
  renderAgeHint();
  renderNameHint();
  renderGearCount();
  checkAutoTriggers();

  // Skills
  renderSkills();
  renderProfs();
  renderWeapons();
  renderQuickSkills();
  renderProtectionParry();
  renderEncounter();

  if (typeof renderNewcomerBanner === 'function') renderNewcomerBanner();   // A: newcomer 'start here' card
  renderHud();
  renderHeroSheet();
  // Quick Build shows what the hero already is, not "— Select —" (setting .value fires no change
  // event, so nothing is re-applied; the player still has to press Apply to change anything).
  [['culture-pick', char.culture], ['calling-pick', char.calling], ['patron-pick', char.patron]].forEach(([id, v]) => {
    const sel = document.getElementById(id);
    if (!sel || !v || sel.value || document.activeElement === sel) return;
    const opt = [...sel.options].find(o => o.value === v || o.textContent.trim() === v ||
      (typeof patronKey === 'function' && id === 'patron-pick' && patronKey(o.value) === patronKey(v)));
    if (opt) sel.value = opt.value;
  });
}

function renderDerivedStats() {
  const str = parseInt(char.strRating) || 0;
  const hrt = parseInt(char.hrtRating) || 0;
  const wit = parseInt(char.witRating) || 0;
  const eb = parseInt(char.endBonus) || 0;
  const hb = parseInt(char.hopeBonus) || 0;
  const pb = parseInt(char.parryBonus) || 0;

  // Clamp any pre-existing negative virtue bonuses (legacy data)
  if ((parseInt(char.endBonusVirtue) || 0) < 0) char.endBonusVirtue = 0;
  if ((parseInt(char.hopeBonusVirtue) || 0) < 0) char.hopeBonusVirtue = 0;

  // Defensive recompute for parry when culture is applied
  if (pb > 0 && wit > 0) {
    const computed = derivedParry();   // includes char.parryAdjust — see addParryAdjust()
    if (char.parry !== computed) char.parry = computed;
  }

  const endMax = parseInt(char.endMax) || 0;
  const hopeMax = parseInt(char.hopeMax) || 0;
  const parry = parseInt(char.parry) || 0;

  setText('end-derived', endMax > 0 ? endMax : '—');
  setText('hope-derived', hopeMax > 0 ? hopeMax : '—');
  setText('parry-derived', parry > 0 ? parry : '—');

  document.getElementById('end-formula').textContent = eb > 0 ? `Str ${str} + ${eb} bonus` : 'set Max below ↓';
  document.getElementById('hope-formula').textContent = hb > 0 ? `Hrt ${hrt} + ${hb} bonus` : 'set Max below ↓';
  document.getElementById('parry-formula').textContent = pb > 0 ? `Wit ${wit} + ${pb} bonus` : 'apply culture';

  const anyAuto = eb > 0 || hb > 0 || pb > 0;
  document.getElementById('auto-derive-hint').style.display = anyAuto ? 'block' : 'none';

  // Sync read-only TN inputs (they don't auto-update via data-field render when typing in Rating)
  ['str','hrt','wit'].forEach(a => {
    const tn = document.querySelector(`[data-field="${a}TN"]`);
    if (tn) tn.value = char[a + 'TN'];
  });
}

function renderConditionWarnings() {
  const wearyBtn = document.querySelector('[data-cond="weary"]');
  const miserBtn = document.querySelector('[data-cond="miserable"]');
  const shouldWeary = (parseInt(char.endCur) || 0) <= (parseInt(char.load) || 0) + (parseInt(char.fatigue) || 0);
  // Per RAW: Shadow Scars count as Shadow for all purposes except healing.
  const totalShadow = (parseInt(char.shadow) || 0) + (parseInt(char.scars) || 0);
  const shouldMiser = totalShadow >= (parseInt(char.hopeCur) || 0) && char.hopeMax > 0;

  // Remove any existing badge
  wearyBtn.querySelector('.cond-badge')?.remove();
  miserBtn.querySelector('.cond-badge')?.remove();

  if (shouldWeary && !char.weary) {
    const b = document.createElement('div');
    b.className = 'cond-badge';
    b.textContent = '!';
    b.title = 'Endurance ≤ Load + Fatigue';
    wearyBtn.appendChild(b);
  }
  if (shouldMiser && !char.miserable) {
    const b = document.createElement('div');
    b.className = 'cond-badge';
    b.textContent = '!';
    b.title = 'Shadow + Scars ≥ Current Hope';
    miserBtn.appendChild(b);
  }

  // Rest day-tracker status line
  const restStatus = document.getElementById('rest-day-status');
  if (restStatus) {
    const day = parseInt(char.dayCount) || 1;
    const shortTxt = char.shortRestUsedToday
      ? '☀️ Short Rest used'
      : '☀️ Short Rest available';
    const injTxt = (char.wounded && (parseInt(char.injuryDays) || 0) > 0)
      ? ` · 🩹 ${char.injuryDays} injury day(s) left`
      : '';
    restStatus.innerHTML = `📅 Day ${day} · ${shortTxt}${injTxt}`;
    restStatus.style.color = char.shortRestUsedToday ? 'var(--text-muted)' : 'var(--success-text)';
  }
}

async function checkAutoTriggers() {
  // Bout of Madness — Shadow + Scars reaches Max Hope (Scars count per RAW p.137)
  const totalShadow = (parseInt(char.shadow) || 0) + (parseInt(char.scars) || 0);
  if (char.hopeMax > 0 && totalShadow >= char.hopeMax && !char._boutPrompted && !char.retired) {
    char._boutPrompted = true;
    // The prompt fires on a timer and can be lost — closing the app, tapping away. `_boutPrompted`
    // latched, Harden Will is disabled at exactly this threshold, and (with the phase bug) no
    // Fellowship Phase could clear the Shadow either: the hero was locked in permanent Despair
    // with no rules route out. `boutDue` keeps the bout claimable until it is actually resolved.
    char.boutDue = true;
    saveCharacter();
    if (typeof renderBoutDue === 'function') renderBoutDue();
    const boutHero = activeCharId;
    setTimeout(async () => {
      // The hero may have changed in the 100ms before this fires (switching heroes, loading a
      // ready-made one). Then it is not this hero's bout: the owed one stays on its own hero
      // as `boutDue`, claimable from its sheet.
      if (activeCharId !== boutHero || !char.boutDue) return;
      const path = char.shadowPath;
      const flaws = FLAWS_BY_PATH[path];
      const scarsBit = (parseInt(char.scars) || 0) > 0 ? ` + ${char.scars} Scar${char.scars>1?'s':''}` : '';
      const flawsField = (char.flaws || '');

      // Per Core Rules p.141: heroes who develop all 4 Flaws of their Shadow Path
      // succumb to the Shadow the *next* time their Shadow score matches Max Hope.
      const ownedFlaws = flaws ? flaws.filter(f => flawsField.includes(f)) : [];
      const allFlawsOwned = flaws && ownedFlaws.length >= 4;

      if (allFlawsOwned) {
        // SUCCUMB TO SHADOW
        const culture = char.culture || '';
        const isElf = culture.includes('Elves');
        const fate = isElf
          ? '🌊 Your hero, an Elf, can no longer bear the Shadow of Middle-earth. They sail for the Uttermost West — Valinor — to be healed of sadness and misery.'
          : '💀 Your hero succumbs completely to madness. Their fate is left for the player and Loremaster to decide together — death by violence, by starvation in a solitary place, forsaken by folk and beasts, or other dark end.';
        alert(`💀 SUCCUMB TO SHADOW\n\nShadow (${char.shadow}${scarsBit}) reached Max Hope (${char.hopeMax}) and you already bear all 4 Flaws of "${path}".\n\n${fate.replace(/[🌊💀]/g, '').trim()}\n\nYour hero is removed from play. Export a JSON backup before resetting — you may want to bring them back as an NPC, raise their Heir, or revisit them in flashback.`);
        char.retired = true;
        char.boutDue = false;
        char.retiredReason = isElf ? 'Sailed for Valinor (Shadow)' : 'Lost to madness (Shadow)';
        char.shadow = 0;  // moot but consistent
        saveCharacter();
        render();
        if (typeof journalAuto === 'function') journalAuto('advancement', 'milestone', `The end of the tale — ${char.retiredReason}.`);
        return;
      }

      let msg = `⚠️ BOUT OF MADNESS\n\nShadow (${char.shadow}${scarsBit}) reached Max Hope (${char.hopeMax}).\n\n`;
      let taken = '';
      if (flaws) {
        const available = flaws.filter(f => !flawsField.includes(f));
        const picked = await showModal({
          title: '⚠️ Bout of Madness',
          message: escapeHtml(msg).replace(/\n/g, '<br>') +
            `<br>Shadow Path: <strong>${escapeHtml(path)}</strong> (${ownedFlaws.length}/4 Flaws acquired).` +
            '<br><br>Which Flaw does this bout leave you with?',
          buttons: available.map(f => ({ label: f, value: f }))
            .concat([{ label: 'Skip — just clear the Shadow', value: null,
                       style: 'background:var(--btn-secondary-bg);color:white;border:none;border-radius:var(--r-sm);padding:10px;font-size:var(--fs-md);cursor:pointer' }])
        });
        if (picked && !flawsField.includes(picked)) {
          taken = picked;
          char.flaws = char.flaws ? (char.flaws + '\n' + picked) : picked;
        }
      } else {
        alert(msg + `(No Shadow Path set — set one in Build tab to enable Flaw picker)`);
      }
      const cleared = parseInt(char.shadow) || 0;
      char.shadow = 0;
      char.boutDue = false;          // resolved
      saveCharacter();
      render();
      // Say what just happened. Skipping the Flaw is the better outcome, so a silent skip
      // rewarded anyone who mistyped and told nobody the bout had been spent.
      alert(taken
        ? `The bout passes. You take the Flaw "${taken}", and your Shadow clears (${cleared} → 0).`
        : `The bout passes. You take no Flaw this time, and your Shadow clears (${cleared} → 0).\n\nA Flaw not taken here is not owed later — the bout is spent.`);
    }, 100);
  }
  if (char.shadow < char.hopeMax && char._boutPrompted) {
    char._boutPrompted = false;
    saveCharacter();
  }
  if (((parseInt(char.shadow) || 0) + (parseInt(char.scars) || 0)) < (parseInt(char.hopeMax) || 0)) {
    if (char.boutDue) { char.boutDue = false; saveCharacter(); }
  }
  if (typeof renderBoutDue === 'function') renderBoutDue();
  // Dying — Endurance reaches 0
  const dyingBadge = document.getElementById('dying-badge');
  if (dyingBadge) dyingBadge.style.display = (char.endCur === 0) ? 'inline-block' : 'none';

  // WEARY pill next to Current — visible when char.weary is set OR auto-trigger condition met
  const wearyPill = document.getElementById('weary-pill');
  if (wearyPill) {
    const shouldWeary = (parseInt(char.endCur) || 0) <= (parseInt(char.load) || 0) + (parseInt(char.fatigue) || 0);
    wearyPill.style.display = (char.weary || shouldWeary) ? 'inline-block' : 'none';
  }

  // Favoured skill overcount warning
  const favBadge = document.getElementById('fav-overcount');
  if (favBadge) {
    const count = Object.values(char.skills || {}).filter(s => s.favoured).length;
    if (count > 3) {
      favBadge.style.display = 'block';
      favBadge.textContent = `⚠ ${count} skills marked Favoured — rules allow max 3 (1 culture + 2 calling)`;
    } else {
      favBadge.style.display = 'none';
    }
  }
}

const STANCE_INFO = {
  forward: '<strong>Forward</strong> — Attacks against you gain +1d (more likely to hit). Combat Task: <em>Intimidate Foe</em> (AWE) — on success, Might 1 enemies become Weary all round; great success: Might 2.',
  open: '<strong>Open</strong> — Normal combat, no advantage or disadvantage. Combat Task: <em>Rally Comrades</em> (ENHEARTEN) — on success, heroes in Forward gain +1d next round.',
  defensive: '<strong>Defensive</strong> — Attacks against you lose 1d; your attacks also lose 1d per engaging foe. Combat Task: <em>Protect Companion</em> (ATHLETICS) — protected hero loses 1d next attack +1d per success icon.',
  rearward: '<strong>Rearward</strong> — Ranged attacks only; targeted only with ranged. Combat Task: <em>Prepare Shot</em> (SCAN) — gain +1d on next ranged attack +1d per success icon.',
  skirmish: '<strong>🗡️ Skirmish (Strider Mode)</strong> — Ranged-only. Melee adversaries lose 1d on attacks against you; ranged ones don\'t. You lose 1d on your ranged attacks. To escape combat, roll your ranged attack (no penalty); success = leave the battlefield (no damage). Combat Task: <em>Gain Ground</em> (ATHLETICS or SCAN) — on success, +1d on next ranged attack, +1d per success icon.'
};

function renderStance() {
  document.querySelectorAll('[data-stance]').forEach(btn => {
    btn.classList.toggle('active', char.stance === btn.dataset.stance);
  });
  const desc = document.getElementById('stance-desc');
  if (desc) {
    desc.innerHTML = char.stance ? STANCE_INFO[char.stance] : '';   // the buttons already say what each does
    desc.style.display = char.stance ? '' : 'none';
  }
  renderCombatTasks();
}

function renderCombatTasks() {
  const card = document.getElementById('combat-tasks-card');
  if (!card) return;
  card.style.display = 'block';
  const labels = { forward: 'Forward', open: 'Open', defensive: 'Defensive', rearward: 'Rearward' };
  // Only the task your stance allows is shown — four greyed-out buttons read as four broken ones.
  let shown = 0;
  card.querySelectorAll('button[data-task]').forEach(btn => {
    const matches = btn.dataset.stanceReq === char.stance;
    btn.style.display = matches ? '' : 'none';
    btn.style.opacity = '1';
    if (matches) shown++;
  });
  const grid = document.getElementById('combat-tasks-grid');
  if (grid) grid.style.display = shown ? '' : 'none';
  const hint = document.getElementById('combat-tasks-hint');
  if (hint) {
    hint.textContent = char.stance
      ? (shown ? `Your ${labels[char.stance] || char.stance} stance allows this task.` : `No combat task goes with the ${labels[char.stance] || char.stance} stance.`)
      : 'Choose a stance on the Combat tab — each stance unlocks one combat task.';
  }
}

/* ---------- FELLOWSHIP PHASE WIZARD ---------- */
// Round 7: each undertaking drawn as what it is
const FP_UNDERTAKING_ICON = { 'gather-rumours': 'i-ear', 'meet-patron': 'i-crown', 'ponder-maps': 'i-map', 'strengthen-fellowship': 'i-users',
  'study-magical-items': 'i-gem', 'write-a-song': 'i-harp', 'visiting-treasury': 'i-coins', 'heal-scars': 'i-bandage', 'raise-heir': 'i-home', 'recount-story': 'i-book' };
const FP_UNDERTAKINGS = [
  { id: 'gather-rumours', name: 'Gather Rumours',
    desc: 'Receive a rumour from the Loremaster — story about a person, place, coming event, or specific inquiry related to current adventuring circumstances.',
    descSolo: 'Pick up a rumour — about a person, place, or coming event. With no Loremaster, ask the <strong>Oracle</strong> (Telling for a yes/no, Lore for open-ended) and write down what you hear.',
    freeCalling: 'Warden', yuleOnly: false, narrative: true },
  { id: 'meet-patron', name: 'Meet Patron',
    desc: 'Meet your Patron if available at this location. Ask for help, accept a task, learn the Blessings of a magical item.',
    descSolo: 'Meet your Patron, if they are here. Ask for help, accept a task, or learn what a magical item really is. With no Loremaster, roll a <strong>Patron Quest</strong> on the Oracle tab for what they want.',
    freeCalling: 'Messenger', yuleOnly: false, narrative: true },
  { id: 'ponder-maps', name: 'Ponder Storied and Figured Maps',
    desc: 'Until next Fellowship Phase, +1 modifier to all Feat die rolls during the Event Resolution step of any Journey.',
    freeCalling: 'Scholar', yuleOnly: false, narrative: false },
  { id: 'strengthen-fellowship', name: 'Strengthen Fellowship',
    desc: 'Raise the Company\'s Fellowship Rating by +1 until next Fellowship Phase.',
    descSolo: 'Raise your Fellowship Rating by +1 until the next Fellowship Phase — the ties that steady you when things go badly.',
    freeCalling: 'Captain', yuleOnly: false, narrative: false },
  { id: 'study-magical-items', name: 'Study Magical Items',
    desc: 'Learn all discoverable qualities/Blessings of every Marvellous Artefact and Wondrous Item the Company currently possesses.',
    descSolo: 'Learn every discoverable quality and Blessing of the Marvellous Artefacts and Wondrous Items you carry.',
    freeCalling: 'Treasure Hunter', yuleOnly: false, narrative: true },
  { id: 'write-a-song', name: 'Write a Song',
    desc: 'Compose a Lay (Councils), Song of Victory (Combat), or Walking-song (Journeys). Sing during a venture (SONG roll) to ignore Weary for that venture. Each song used only once per Adventuring Phase.',
    freeCalling: 'Champion', yuleOnly: false, narrative: false },
  { id: 'visiting-treasury', name: 'Visiting the Treasury',
    desc: 'Leave a piece of war gear with 1+ Rewards as a gift to your folk; in exchange activate an equal number of dormant qualities on a Famous Weapon/Armour. Narrative — adjust gear sheet manually.',
    freeCalling: null, yuleOnly: false, narrative: true },
  { id: 'heal-scars', name: 'Heal Scars',
    desc: 'Spend 5 Adventure Points to remove 1 Shadow Scar.',
    freeCalling: null, yuleOnly: true, narrative: false },
  { id: 'raise-heir', name: 'Raise an Heir',
    desc: 'Spend up to 5 Treasure + an equal number of Adventure Points to add to your heir\'s starting Previous Experience reserve (+1 PE per AP). Heir is ready to take over at 15+ PE.',
    freeCalling: null, yuleOnly: true, narrative: false },
  { id: 'recount-story', name: 'Recount a Story',
    desc: 'Replace one of your current Distinctive Features with a new one (chosen from the list or your own creation) that reflects a trait you displayed in recent adventures.',
    freeCalling: null, yuleOnly: true, narrative: false }
];

let fpState = null;

async function awardSessionXP() {
  const sp = parseInt(char.skillPts) || 0;
  const ap = parseInt(char.advPts) || 0;
  if (!await confirmStyled(`📜 <strong>End Session — award XP</strong><br><br><strong>+3 Skill Points + 3 Adventure Points</strong> per session attended.<br><br>SP: ${sp} → ${sp + 3}<br>AP: ${ap} → ${ap + 3}`, '📜 End Session', {yes:'Award the XP', no:'Not yet'})) return;
  char.skillPts = sp + 3;
  char.advPts = ap + 3;
  saveCharacter();
  render();
  if (typeof journalAuto === 'function') journalAuto('advancement', 'milestone', 'End of session — earned +3 Skill Points and +3 Adventure Points.');
  if (typeof logTimeline === 'function') logTimeline('xp', 'End of session: +3 Skill Points, +3 Adventure Points.');
  alert(`✅ Awarded +3 SP + 3 AP.\n\nSpend during Fellowship Phase (cap: 1 rank/skill, 1 rank/prof, Valour XOR Wisdom).`);
}

function _freshFPState() {
  return {
    step: 1,
    phaseType: null,  // 'ordinary' | 'yule'
    shadowToRemove: 1,
    recoveryApplied: false,
    selectedUndertakings: [],  // ids
    songInput: { type: 'Lay', title: '', lyrics: '' },
    heirInput: { treasure: 0, ap: 0 }
  };
}

/* The wizard's own step 3 tells you to "Close this wizard temporarily to spend XP, then
   re-open to continue with Undertakings. (Phase state is preserved.)" — and it wasn't:
   openFPWizard() rebuilt fpState from scratch every time, so following the instruction on
   screen threw away your phase type and your applied Recovery and dropped you back on step 1.
   Worse, because recoveryApplied reset while the Hope and Shadow changes had already landed,
   Recovery could be applied twice in a single phase. The state now lives on the character
   between openings, and the recovery guard is durable. */
function openFPWizard(forceNew) {
  const saved = char.fpWizardState;
  if (!forceNew && saved && typeof saved === 'object' && saved.inProgress) {
    fpState = Object.assign(_freshFPState(), saved);
    delete fpState.inProgress;
  } else {
    fpState = _freshFPState();
    // A genuinely new phase: clear the prior phase's per-rank spend tracker.
    char.fpSpend = { skills: {}, profs: {}, valour: 0, wisdom: 0 };
  }
  char.fpModeActive = true;
  char.fpWizardState = Object.assign({}, fpState, { inProgress: true });
  saveCharacter();
  // Opened from ▶ Play: the phase is a scene on Play, not a pop-up over it.
  if (window._fpInPlay && typeof playOpenScene === 'function') { window._fpInPlay = false; playOpenScene('fp'); fpRenderStep(); return; }
  document.getElementById('fp-wizard-overlay').classList.add('show');
  fpRenderStep();
}

/** Persist the in-flight phase so closing the wizard is a pause, not a reset.
    Does nothing once the phase has been COMPLETED — `fpComplete()` clears both `fpState` and
    `char.fpWizardState`, and it finishes by calling `fpClose()`. Without this guard that close
    wrote the just-finished phase straight back with `recoveryApplied: true`, so the NEXT
    Fellowship Phase opened mid-flight and refused Spiritual Recovery forever. A hero could take
    exactly one phase in their whole life. */
function fpPersist() {
  if (!fpState) return;
  char.fpWizardState = Object.assign({}, fpState, { inProgress: true });
  saveCharacter();
}

function fpClose() {
  document.getElementById('fp-wizard-overlay').classList.remove('show');
  fpPersist();
  // Exit FP spend mode but keep the spend tracker visible for the player's reference.
  char.fpModeActive = false;
  saveCharacter();
  if (char.saga && char.saga.scene === 'fp') { char.saga.scene = null; saveCharacter(); if (typeof renderPlay === 'function') renderPlay(); }
}

function fpSetPhaseType(t) {
  fpState.phaseType = t;
  fpPersist();
  const status = document.getElementById('fp-type-status');
  status.textContent = t === 'yule' ? 'Yule selected — all heroes age +1, Hope restored, +WITS bonus Skill Points' : 'Ordinary Phase selected';
  // A choice shows as chosen (ticked, outlined) — not by greying out the other one.
  [['fp-type-ord', 'ordinary'], ['fp-type-yule', 'yule']].forEach(([id, v]) => {
    const b = document.getElementById(id); if (!b) return;
    b.classList.toggle('on', t === v); b.setAttribute('aria-pressed', t === v ? 'true' : 'false');
  });
}

function fpRenderStep() {
  const steps = [1, 2, 3, 4];
  [['fp-type-ord', 'ordinary'], ['fp-type-yule', 'yule']].forEach(([id, v]) => {
    const b = document.getElementById(id); if (b) { b.classList.toggle('on', fpState.phaseType === v); b.setAttribute('aria-pressed', fpState.phaseType === v ? 'true' : 'false'); }
  });
  steps.forEach(n => {
    document.getElementById('fp-step-' + n).style.display = fpState.step === n ? 'block' : 'none';
  });
  document.querySelectorAll('.fp-step-pill').forEach(pill => {
    const n = parseInt(pill.dataset.step);
    pill.classList.toggle('active', n === fpState.step);
    pill.classList.toggle('done', n < fpState.step);
  });
  document.getElementById('fp-prev-btn').style.display = fpState.step > 1 ? 'inline-block' : 'none';
  document.getElementById('fp-next-btn').style.display = fpState.step < 4 ? 'inline-block' : 'none';
  const _applied = fpState.recoveryApplied || (char.fpWizardState && char.fpWizardState.recoveryApplied);
  document.getElementById('fp-next-btn').textContent = fpState.step === 2 && !_applied ? 'Rest and continue\u00a0→' : 'Next\u00a0→';
  const _ab = document.getElementById('fp-recovery-apply'); if (_ab) _ab.style.display = 'none';

  if (fpState.step === 2) fpRenderStep2();
  if (fpState.step === 3) fpRenderStep3();
  if (fpState.step === 4) fpRenderStep4();
}

async function fpNextStep() {
  // fpState is null until openFPWizard() runs. Guard so a stray call can never throw.
  if (!fpState) return openFPWizard();
  if (fpState.step === 1 && !fpState.phaseType) {
    alertStyled('Choose the phase type first — <strong>Ordinary</strong> (the usual rest between adventures) or <strong>Yule</strong> (the midwinter feast, which recovers more and ages your hero a year). The two buttons are at the top of this step.', '⚠️ Pick a phase type');
    return;
  }
  // Round 4: one tap. Next on the Rest step applies the recovery (it used to ask "Skip recovery?"
  // when the separate Apply button had not been pressed — nobody skips resting on purpose).
  if (fpState.step === 2 && !fpState.recoveryApplied && !(char.fpWizardState && char.fpWizardState.recoveryApplied)) fpApplyRecovery();
  fpState.step = Math.min(4, fpState.step + 1);
  fpPersist();
  fpRenderStep();
}

function fpPrevStep() {
  if (!fpState) return;
  fpState.step = Math.max(1, fpState.step - 1);
  fpRenderStep();
}

/** Hope recovered in a Fellowship Phase.
    The Rangers' Cultural Blessing prints its own cost on the sheet — "Kings of Men … Weakness:
    only ½ Heart Hope recovered during Fellowship Phase (not Yule)" — and the wizard used to
    ignore it, awarding full Heart. Halved (rounded up), Yule exempt. */
/** The Hope a Fellowship Phase restores. `phaseType` overrides the wizard's own state so the
    Moria phases (which never open that wizard) get the same Rangers halving — they used to hand
    Rangers the full Heart, silently ignoring the culture's printed weakness. */
function fpHopeRecovery(phaseType) {
  const heart = parseInt(char.hrtRating) || 1;
  const isYule = (phaseType || (fpState && fpState.phaseType)) === 'yule';
  const curHope = parseInt(char.hopeCur) || 0;
  const maxHope = parseInt(char.hopeMax) || 0;
  const halved = !isYule && /Rangers/i.test(String(char.culture || ''));
  const base = isYule ? (maxHope - curHope) : (halved ? Math.ceil(heart / 2) : heart);
  return { amount: Math.max(0, Math.min(base, maxHope - curHope)), halved, heart, isYule, curHope, maxHope };
}

function fpRenderStep2() {
  const heart = parseInt(char.hrtRating) || 1;
  const isYule = fpState.phaseType === 'yule';
  const curHope = parseInt(char.hopeCur) || 0;
  const maxHope = parseInt(char.hopeMax) || 0;
  const hr = fpHopeRecovery();
  const hopeAmt = hr.amount;

  const hopeDiv = document.getElementById('fp-hope-recovery');
  hopeDiv.innerHTML = `
    <strong>Hope Recovery:</strong> ${isYule
      ? 'Full Hope restoration (Yule)'
      : (hr.halved
          ? `+½ HEART (${Math.ceil(heart / 2)} of ${heart}) — <em>Kings of Men weakness: Rangers recover only half Heart in an ordinary Fellowship Phase</em>`
          : `+HEART (${heart}) — capped at Max Hope`)}<br>
    Current: ${curHope} / ${maxHope} → will become <strong>${Math.min(maxHope, curHope + hopeAmt)}</strong> (+${hopeAmt})
  `;

  const yuleDiv = document.getElementById('fp-yule-extras');
  if (isYule) {
    const wits = parseInt(char.witRating) || 1;
    const age = parseInt(char.age) || 0;
    yuleDiv.style.display = 'block';
    yuleDiv.innerHTML = `
      <strong>❄️ Yule extras:</strong><br>
      • Age: ${age} → <strong>${age + 1}</strong> (+1 year)<br>
      • Bonus Skill Points: +<strong>${wits}</strong> (your WITS rating)<br>
      • All Hope restored (handled above)
    `;
  } else {
    yuleDiv.style.display = 'none';
  }

  // Cursed item Shadow Taint preview
  const taintedItems = (char.magicalItems || []).filter(mi => mi.cursed && mi.curseType === 'Shadow Taint');
  const taintEl = document.getElementById('fp-shadow-taint');
  if (taintEl) {
    if (taintedItems.length > 0) {
      taintEl.style.display = 'block';
      taintEl.innerHTML = `<strong>⚠️ Shadow Taint:</strong> ${taintedItems.length} cursed item${taintedItems.length>1?'s':''} (${taintedItems.map(i=>i.name).join(', ')}) → <strong>+${taintedItems.length} Shadow</strong> this phase. Applied after the Shadow Removal you choose below.`;
    } else {
      taintEl.style.display = 'none';
    }
  }

  document.getElementById('fp-recovery-status').textContent = fpState.recoveryApplied ? '✅ Recovery applied — proceed to next step' : '';
}

function fpApplyRecovery() {
  if (fpState.recoveryApplied) {
    // The guard is durable by design (run-1 finding 6), so "cancel and reopen to redo" was
    // simply false — reopening restores the same phase, which is the point.
    alert('Spiritual Recovery has already been applied in this Fellowship Phase — Hope and Shadow have moved once, and they only move once per phase.\n\nClosing and reopening the wizard resumes this same phase; it does not undo the recovery. Complete the phase to begin a new one.');
    return;
  }
  const heart = parseInt(char.hrtRating) || 1;
  const wits = parseInt(char.witRating) || 1;
  const isYule = fpState.phaseType === 'yule';
  const curHope = parseInt(char.hopeCur) || 0;
  const maxHope = parseInt(char.hopeMax) || 0;
  if (char.fpWizardState && char.fpWizardState.recoveryApplied) {
    alertStyled('Spiritual Recovery has already been applied in this Fellowship Phase — Hope and Shadow only move once per phase.<br><br>Finish this phase with <strong>Complete Phase</strong> on step 4; the next Fellowship Phase starts fresh.', '✅ Already applied');
    return;
  }
  const hr = fpHopeRecovery();
  const hopeAmt = hr.amount;
  char.hopeCur = Math.min(maxHope, curHope + hopeAmt);

  const shadowRm = parseInt(document.querySelector('input[name="fp-shadow-rm"]:checked')?.value) || 0;
  const shadowBefore = parseInt(char.shadow) || 0;
  char.shadow = Math.max(0, shadowBefore - shadowRm);

  // Cursed item Shadow Taint — +1 Shadow per Shadow-Tainted item, applied per RAW p.165.
  const taintedItems = (char.magicalItems || []).filter(mi => mi.cursed && mi.curseType === 'Shadow Taint');
  const taintGain = taintedItems.length;
  if (taintGain > 0) {
    const cap = Math.max(0, (parseInt(char.hopeMax) || 0) - (parseInt(char.scars) || 0));
    char.shadow = Math.min(cap, char.shadow + taintGain);
  }

  let summary = `+${hopeAmt} Hope (${curHope} → ${char.hopeCur})${hr.halved ? ' — halved by the Kings of Men weakness' : ''}`;
  if (shadowRm > 0) summary += ` · −${shadowRm} Shadow`;
  if (taintGain > 0) summary += ` · +${taintGain} Shadow (Cursed Taint: ${taintedItems.map(i=>i.name).join(', ')})`;
  summary += ` (Shadow: ${shadowBefore} → ${char.shadow})`;

  if (isYule) {
    char.age = (parseInt(char.age) || 0) + 1;
    char.skillPts = (parseInt(char.skillPts) || 0) + wits;
    summary += ` · Age +1 (now ${char.age}) · +${wits} Skill Points (Yule WITS bonus)`;
  }

  // Clear any active-FP bonuses from previous phase (they expire at start of new FP).
  // We do this here so the player can still see them while reviewing, but they're reset before this phase's undertakings.
  char.activeFPBonuses = { strengthenFellowship: false, ponderMaps: false };
  // Reset song usage flags for the upcoming Adventuring Phase
  if (Array.isArray(char.songs)) char.songs.forEach(s => { s.used = false; });

  fpState.recoveryApplied = true;
  fpPersist();
  saveCharacter();
  render();
  document.getElementById('fp-recovery-status').innerHTML = `✅ ${summary}`;
  // Next moves straight on, so say what the rest did where it can be seen (round 4)
  if (typeof showToast === 'function') showToast('Rested — ' + String(summary).replace(/<[^>]+>/g, ''));
}

function fpRenderStep3() {
  const sp = parseInt(char.skillPts) || 0;
  const ap = parseInt(char.advPts) || 0;
  document.getElementById('fp-xp-summary').innerHTML = `
    Skill Points: <strong>${sp}</strong> · Adventure Points: <strong>${ap}</strong>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px">
      <button class="add-row-btn" style="font-size:var(--fs-xs)" onclick="fpSpendFromWizard('skill')">Spend Skill Points</button>
      <button class="add-row-btn" style="font-size:var(--fs-xs)" onclick="fpSpendFromWizard('adv')">Spend Adventure Points</button>
    </div>
  `;
}

/** Step 3 used to be a signpost to another tab. Open the Spend XP modal from here instead;
    the wizard stays open underneath and the phase's per-rank caps still apply. */
function fpSpendFromWizard(mode) {
  fpPersist();
  if (typeof openSpendXP === 'function') openSpendXP(mode);
}

function fpRenderStep4() {
  const isYule = fpState.phaseType === 'yule';
  const calling = char.calling || '';
  document.getElementById('fp-undertaking-limits').innerHTML = isYule
    ? 'Yule phase: pick <strong>1 individual undertaking</strong> + <strong>1 free undertaking</strong> (only if your Calling unlocks it). Yule-only undertakings (Heal Scars / Raise an Heir / Recount a Story) can stack with another pick.'
    : 'Ordinary phase: pick <strong>1 group undertaking</strong> + <strong>1 free undertaking</strong> (only if your Calling unlocks it).';

  const list = document.getElementById('fp-undertaking-list');
  list.innerHTML = '';
  FP_UNDERTAKINGS.forEach(u => {
    const isYuleOnly = u.yuleOnly;
    const disabled = isYuleOnly && !isYule;
    const isFree = u.freeCalling === calling;
    const selected = fpState.selectedUndertakings.includes(u.id);
    const row = document.createElement('div');
    row.style.cssText = `padding:8px;border:1px solid ${selected ? 'var(--gold)' : 'var(--border)'};border-radius:var(--r-sm);background:${selected ? 'var(--gold-soft)' : (disabled ? 'var(--bg-deep)' : 'var(--pure-white)')};${disabled ? 'opacity:0.4;' : 'cursor:pointer;'}`;
    if (!disabled) row.onclick = () => fpToggleUndertaking(u.id);
    row.innerHTML = `
      <div style="display:flex;align-items:center;gap:6px 8px;flex-wrap:wrap">
        <input type="checkbox" ${selected ? 'checked' : ''} ${disabled ? 'disabled' : ''} style="margin:0">
        ${FP_UNDERTAKING_ICON[u.id] ? `<svg class="ic und-ic" aria-hidden="true"><use href="#${FP_UNDERTAKING_ICON[u.id]}"/></svg>` : ''}
        <strong style="font-size:var(--fs-sm)">${u.name}</strong>
        ${isFree ? '<span class="free-badge" style="background:var(--gold);color:white;padding:1px 6px;border-radius:var(--r-sm);font-size:var(--fs-xs)">FREE — ' + calling + '</span>' : ''}
        ${u.yuleOnly ? '<span style="background:var(--brown-soft);color:white;padding:1px 6px;border-radius:var(--r-sm);font-size:var(--fs-xs)">YULE</span>' : ''}
      </div>
      <p class="hint" style="text-align:left;margin:4px 0 0 0">${soloWord(u.desc, u.descSolo || u.desc)}</p>
    `;
    list.appendChild(row);
  });
  fpRenderFollowup();
}

function fpToggleUndertaking(id) {
  const i = fpState.selectedUndertakings.indexOf(id);
  if (i >= 0) {
    fpState.selectedUndertakings.splice(i, 1);
  } else {
    // Enforce limits: count non-yule picks
    const u = FP_UNDERTAKINGS.find(x => x.id === id);
    const calling = char.calling || '';
    const isFreeForMe = u.freeCalling === calling;
    const currentPicks = fpState.selectedUndertakings.map(x => FP_UNDERTAKINGS.find(y => y.id === x));
    const nonYulePicks = currentPicks.filter(x => !x.yuleOnly);
    const nonYuleFree = nonYulePicks.filter(x => x.freeCalling === calling).length;
    const nonYuleMain = nonYulePicks.filter(x => x.freeCalling !== calling).length;
    if (u.yuleOnly) {
      // Yule picks always allowed (stack)
    } else if (isFreeForMe && nonYuleFree >= 1) {
      alert('You can pick only one free Calling-based undertaking per phase.');
      return;
    } else if (!isFreeForMe && nonYuleMain >= 1) {
      alert('You can pick only one main undertaking per phase. (You may add a Calling-free one if your Calling matches.)');
      return;
    }
    fpState.selectedUndertakings.push(id);
  }
  fpPersist();          // the wizard promises picks survive a close — persist on every toggle
  fpRenderStep4();
}

function fpRenderFollowup() {
  const wrap = document.getElementById('fp-undertaking-followup');
  wrap.innerHTML = '';
  const has = id => fpState.selectedUndertakings.includes(id);

  if (has('write-a-song')) {
    wrap.innerHTML += `
      <div style="padding:10px;background:var(--bg-deep);border-radius:var(--r-sm);margin-top:6px">
        <strong style="font-size:var(--fs-xs);color:var(--red-dark)">Write a Song — details</strong>
        <div style="display:flex;gap:6px;margin-top:6px">
          <select id="fp-song-type" style="flex:0 0 110px;padding:4px;font-size:var(--fs-xs)">
            <option>Lay</option><option>Song of Victory</option><option>Walking-song</option>
          </select>
          <input id="fp-song-title" placeholder="Title" style="flex:1;padding:4px;font-size:var(--fs-xs)">
        </div>
        <input id="fp-song-lyrics" placeholder="Lyrics or theme (optional)" style="width:100%;margin-top:6px;padding:4px;font-size:var(--fs-xs)">
      </div>`;
  }
  if (has('raise-heir')) {
    wrap.innerHTML += `
      <div style="padding:10px;background:var(--bg-deep);border-radius:var(--r-sm);margin-top:6px">
        <strong style="font-size:var(--fs-xs);color:var(--red-dark)">Raise an Heir — spend</strong>
        <div style="display:flex;gap:6px;margin-top:6px;align-items:center">
          <input id="fp-heir-name" placeholder="Heir name" value="${(char.heir && char.heir.name) || ''}" style="flex:1;padding:4px;font-size:var(--fs-xs)">
          <label style="font-size:var(--fs-xs)">AP & Treasure to spend:</label>
          <input id="fp-heir-ap" type="number" min="0" max="5" value="${fpState.heirInput.ap || 0}" style="width:50px;padding:4px;font-size:var(--fs-xs)">
        </div>
        <p class="hint" style="text-align:left;margin:6px 0 0 0">Equal Treasure + AP. Each AP grants +1 PE to heir (current: ${(char.heir && char.heir.pe) || 0}).</p>
      </div>`;
  }
  if (has('recount-story')) {
    wrap.innerHTML += `
      <div style="padding:10px;background:var(--bg-deep);border-radius:var(--r-sm);margin-top:6px">
        <strong style="font-size:var(--fs-xs);color:var(--red-dark)">Recount a Story</strong>
        <p class="hint" style="text-align:left;margin:4px 0 0 0">After completing the phase, edit your Distinctive Features on the Character tab to swap one out.</p>
      </div>`;
  }
}

function refreshFPSummary() {
  const ph = document.getElementById('fp-phases-completed');
  if (ph) ph.textContent = (parseInt(char.phasesCompleted) || 0);
  const sum = document.getElementById('fp-active-bonuses-summary');
  if (sum) {
    const bonuses = [];
    if (char.activeFPBonuses && char.activeFPBonuses.strengthenFellowship) bonuses.push('💪 Strengthen FP');
    if (char.activeFPBonuses && char.activeFPBonuses.ponderMaps) bonuses.push('🗺️ Ponder Maps');
    sum.textContent = bonuses.length > 0 ? `Active: ${bonuses.join(' · ')}` : '';
  }
}

async function fpComplete() {
  // Reset the Adventuring-Phase session counter that drives the saga card's pacing prompt
  // ("two or three sessions, then a Fellowship Phase" — Core Rules).
  try { const sg = sagaState(); sg.lastFpSession = parseInt(sg.sessions) || 0; } catch (e) {}
  // RAW: Eye Awareness "is fully reset to its starting value at the beginning of each Adventuring
  // phase" — which is what completing a Fellowship Phase begins. Was never implemented.
  try {
    if (typeof isSolo === 'function' && isSolo() && typeof resetEyeAwarenessToStarting === 'function') {
      resetEyeAwarenessToStarting();
    }
  } catch (e) {}
  if (fpState.selectedUndertakings.length === 0) {
    if (!await confirmStyled('No undertakings selected. Complete phase anyway?', undefined, {yes:'Finish the phase', no:'Pick one first'})) return;
  }
  const log = [];
  if (typeof logTimeline === 'function') logTimeline('fp', 'Fellowship Phase' + (fpState.phaseType === 'yule' ? ' (Yule)' : '') + ' completed.');

  // for...of (not forEach) so awaits in case bodies actually pause the loop —
  // Visiting Treasury prompts the player and needs the answer before continuing.
  for (const id of fpState.selectedUndertakings) {
    const u = FP_UNDERTAKINGS.find(x => x.id === id);
    switch (id) {
      case 'strengthen-fellowship':
        char.activeFPBonuses.strengthenFellowship = true;
        char.fellowshipRating = (parseInt(char.fellowshipRating) || 0) + 1;
        log.push(`✅ Strengthen Fellowship: +1 Fellowship Rating until next FP`);
        break;
      case 'ponder-maps':
        char.activeFPBonuses.ponderMaps = true;
        log.push(`✅ Ponder Maps: +1 modifier to Journey Event Feat die until next FP`);
        break;
      case 'heal-scars':
        if ((parseInt(char.advPts) || 0) < 5) {
          log.push(`⚠️ Heal Scars skipped: insufficient AP (need 5, have ${char.advPts || 0})`);
        } else if ((parseInt(char.scars) || 0) <= 0) {
          log.push(`⚠️ Heal Scars skipped: no Shadow Scars to heal`);
        } else {
          char.advPts -= 5;
          char.scars = Math.max(0, (parseInt(char.scars) || 0) - 1);
          log.push(`✅ Heal Scars: −5 AP, −1 Scar (now ${char.scars})`);
        }
        break;
      case 'raise-heir':
        const heirName = (document.getElementById('fp-heir-name')?.value || '').trim();
        const heirAp = parseInt(document.getElementById('fp-heir-ap')?.value) || 0;
        const heirCost = Math.min(heirAp, parseInt(char.advPts) || 0, parseInt(char.treasure) || 0, 5);
        if (heirCost > 0) {
          char.advPts -= heirCost;
          char.treasure -= heirCost;
          if (!char.heir) char.heir = { name: '', pe: 0 };
          char.heir.pe = (parseInt(char.heir.pe) || 0) + heirCost;
          if (heirName) char.heir.name = heirName;
          log.push(`✅ Raise an Heir (${char.heir.name || 'unnamed'}): −${heirCost} AP, −${heirCost} Treasure, heir PE now ${char.heir.pe}`);
        } else {
          log.push(`⚠️ Raise an Heir: 0 AP/Treasure spent (insufficient or input was 0)`);
        }
        break;
      case 'write-a-song':
        const songType = document.getElementById('fp-song-type')?.value || 'Lay';
        const songTitle = (document.getElementById('fp-song-title')?.value || 'Untitled').trim();
        const songLyrics = (document.getElementById('fp-song-lyrics')?.value || '').trim();
        if (!Array.isArray(char.songs)) char.songs = [];
        char.songs.push({ type: songType, title: songTitle || 'Untitled', lyrics: songLyrics, used: false });
        log.push(`✅ Write a Song: "${songTitle}" (${songType}) added to song list`);
        break;
      case 'visiting-treasury':
        // Offer to unlock a dormant Famous Weapon/Armour quality (Core Rules p.165).
        const famousWithDormant = (char.magicalItems || []).filter(mi =>
          (mi.type === 'Famous Weapon' || mi.type === 'Famous Armour') &&
          Array.isArray(mi.qualities) && mi.qualities.some(q => !q.active)
        );
        if (famousWithDormant.length === 0) {
          log.push(`📝 Visiting the Treasury: narrative (no Famous Weapon/Armour with dormant qualities to unlock)`);
        } else {
          const pick = await showModal({
            title: '🏛️ Visiting the Treasury',
            message: 'Trade in 1 Reward from a piece of war gear to wake one dormant quality on a Famous Weapon or Armour. Which item?',
            buttons: famousWithDormant.map((mi, idx) => ({
              label: `${mi.name} — ${mi.qualities.filter(q => !q.active).length} dormant`, value: idx + 1
            })).concat([{ label: 'Skip — no unlock this phase', value: 0, cancel: true }])
          });
          if (pick >= 1 && pick <= famousWithDormant.length) {
            const chosen = famousWithDormant[pick - 1];
            const qIdx = chosen.qualities.findIndex(q => !q.active);
            if (qIdx >= 0) {
              chosen.qualities[qIdx].active = true;
              log.push(`✅ Visiting the Treasury: unlocked "${chosen.qualities[qIdx].name}" on ${chosen.name}. Mark off 1 Reward on a piece of war gear gifted to your folk.`);
            }
          } else {
            log.push(`📝 Visiting the Treasury: no unlock selected (narrative)`);
          }
        }
        break;
      default:
        // Narrative-only undertakings — just record in log
        log.push(`📝 ${u.name}: narrative (no mechanical effect)`);
    }
  }

  char.phasesCompleted = (parseInt(char.phasesCompleted) || 0) + 1;
  // Chronicle: a Yule Fellowship Phase turns the year; either way, mark the phase passing.
  if (journal && journal.clock) {
    if (fpState.phaseType === 'yule') { journal.clock.year = (parseInt(journal.clock.year) || 0) + 1; journal.clock.month = 'Afteryule'; journal.clock.day = 1; }
    saveJournal();
  }
  saveCharacter();
  render();
  if (typeof journalAuto === 'function') journalAuto('advancement', 'milestone', `${fpState.phaseType === 'yule' ? 'Yule ' : ''}Fellowship Phase completed (#${char.phasesCompleted}).`);
  // The phase is OVER. Drop the in-flight state before closing, and drop `fpState` too so the
  // `fpClose()` below cannot resurrect it — the next opening must start from a clean step 1.
  fpState = null;
  char.fpWizardState = null;
  saveCharacter();
  fpClose();
  if (typeof tableFpDone === 'function') tableFpDone();   // table play: tell the Loremaster this hero is done
  if (log.length > 0) alert('Fellowship Phase complete!\n\n' + log.map(l => l.replace(/✅|⚠️|📝/g, '')).join('\n'));
}

/* ---------- SKILL ENDEAVOUR ---------- */
const SE_RESISTANCE_HINTS = {
  3: 'Simple — lengthy but manageable (carry boat up slope, put out a house fire).',
  6: 'Laborious — difficult, time-consuming (search wide area, dig deep trench).',
  9: 'Daunting — hard and complicated (repair rope bridge over chasm, decipher obscure lore).'
};
const SE_RISK_HINTS = {
  standard: 'On failure: Simple Failure (delay) OR Success-with-Woe — at end-of-endeavour, player can choose to succeed at a price.',
  hazardous: 'On failure: each failed roll auto-applies a Failure-with-Woe consequence (+2 Fatigue, +1 Shadow on an Eye). LM may adjust.',
  foolish: 'On failure: the first failed roll is a Disaster — the endeavour ends immediately and cannot be resumed.'
};

function startSkillEndeavour() {
  if (typeof newcomerNeedsHelp === 'function' && newcomerNeedsHelp()) {
    alertStyled('Build a hero first — pick a <strong>Culture</strong> and <strong>Calling</strong> on the <strong>Build</strong> tab (or load a ready-made hero from ☰ Menu → ✨ Pre-generated Heroes). Until then this subsystem has no skills or attributes to roll against.', '⚠️ No hero built yet');
    return;
  }

  const task = (document.getElementById('se-task').value || '').trim();
  const resBtn = document.querySelector('#se-resistance-pick .seg-btn.active');
  const timeBtn = document.querySelector('#se-time-pick .seg-btn.active');
  const riskBtn = document.querySelector('#se-risk-pick .seg-btn.active');
  if (!resBtn || !timeBtn || !riskBtn) {
    const missing = [!resBtn && 'Resistance (how hard the task is)', !timeBtn && 'Time Limit (how many attempts you get)', !riskBtn && 'Risk Level (what failure costs)'].filter(Boolean);
    return requireStep('Still to choose: <strong>' + missing.join('</strong>, <strong>') + '</strong>.<br><br>Each is a row of buttons in the Skill Endeavour Setup card — tap one option in every row, then Begin.', 'council', 'endeavour-setup-title', '⚠️ Endeavour not set up');
  }
  char.skillEndeavour = {
    active: true,
    task: task || '(no task set)',
    resistance: parseInt(resBtn.dataset.val) || 3,
    timeLimit: parseInt(timeBtn.dataset.val) || 4,
    riskLevel: riskBtn.dataset.val || 'standard',
    attemptsUsed: 0,
    successesScored: 0,
    rolls: [],
    outcome: null
  };
  saveCharacter();
  renderSkillEndeavour();
}

async function cancelSkillEndeavour() {
  if (!await confirmStyled('Cancel this endeavour? All progress will be discarded.', 'Cancel Endeavour', {yes:'Abandon endeavour', no:'Keep going'})) return;
  char.skillEndeavour.active = false;
  saveCharacter();
  renderSkillEndeavour();
}

/* ---------- Council or Endeavour: choose first (round 4) ----------
   The tab stacked two setups with two primary buttons and a divider under them. Now the player
   picks which one they face; only that setup shows, and whichever is running has the tab. */
let _councilKind = null;
function pickCouncilKind(kind) { _councilKind = kind; _councilLayout(); const el = document.getElementById(kind === 'council' ? 'council-setup-card' : 'se-setup-card'); if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest', behavior: 'auto' }); }
function _councilLayout() {
  const ch = document.getElementById('council-chooser'); if (!ch) return;
  const vis = id => { const e = document.getElementById(id); return e && e.style.display !== 'none'; };
  const cRun = vis('council-active-card'), eRun = vis('se-active-card');
  const busy = cRun || eRun;
  ch.style.display = busy ? 'none' : '';
  document.getElementById('council-setup-card').style.display = (!busy && _councilKind === 'council') ? 'block' : 'none';
  document.getElementById('se-setup-card').style.display = (!busy && _councilKind === 'endeavour') ? 'block' : 'none';
  ['council', 'endeavour'].forEach(k => { const b = document.getElementById('pick-' + k); if (b) { b.classList.toggle('on', _councilKind === k); b.setAttribute('aria-pressed', String(_councilKind === k)); } });
  // Past Councils is a record, not a step — it waits below whatever is on screen
  const hist = document.getElementById('council-history-card');
  if (hist && eRun) hist.style.display = 'none';
}

function renderSkillEndeavour() {
  if (window._playSceneKind === 'endeavour' && typeof renderPlay === 'function' && !window._inRenderPlay) setTimeout(renderPlay, 0);
  const setup = document.getElementById('se-setup-card');
  const active = document.getElementById('se-active-card');
  const log = document.getElementById('se-log-card');
  if (!setup) return;
  const e = char.skillEndeavour || {};

  // Update setup hints
  const resPick = document.querySelector('#se-resistance-pick .seg-btn.active');
  const riskPick = document.querySelector('#se-risk-pick .seg-btn.active');
  if (resPick) document.getElementById('se-resistance-hint').textContent = SE_RESISTANCE_HINTS[parseInt(resPick.dataset.val)] || '';
  if (riskPick) document.getElementById('se-risk-hint').textContent = SE_RISK_HINTS[riskPick.dataset.val] || '';

  // A CLOSED endeavour stays on screen with its outcome until the player starts a new one.
  // finalizeSkillEndeavour used to force these cards visible itself, and the render() that runs
  // on the very next line re-hid them — so a Foolish Disaster vanished without a word.
  const showing = e.active || !!e.outcome;
  if (showing) {
    setup.style.display = 'none';
    active.style.display = 'block';
    log.style.display = 'block';

    const riskLabel = { standard: 'Standard', hazardous: 'Hazardous', foolish: 'Foolish' }[e.riskLevel] || e.riskLevel;
    document.getElementById('se-summary').innerHTML =
      `<strong>${e.task}</strong><br>` +
      `Resistance: <strong>${e.resistance}</strong> · Time Limit: <strong>${e.timeLimit}</strong> · Risk: <strong>${riskLabel}</strong>`;

    const succPct = e.resistance > 0 ? Math.min(100, (e.successesScored / e.resistance) * 100) : 0;
    document.getElementById('se-success-bar').style.width = succPct + '%';
    document.getElementById('se-successes-label').textContent = `${e.successesScored} / ${e.resistance}`;
    const attPct = e.timeLimit > 0 ? Math.min(100, (e.attemptsUsed / e.timeLimit) * 100) : 0;
    document.getElementById('se-attempts-bar').style.width = attPct + '%';
    document.getElementById('se-attempts-label').textContent = `${e.attemptsUsed} / ${e.timeLimit}`;
    if (typeof tallyMarks === 'function') { document.getElementById('se-tally').innerHTML = tallyMarks(e.successesScored, e.resistance); document.getElementById('se-candles').innerHTML = candleRow(e.attemptsUsed, e.timeLimit); }

    // Render skill grid (all 18 skills + Valour + Wisdom)
    const grid = document.getElementById('se-skill-grid');
    const allSkills = [
      ...SKILLS.str.map(s => ({name: s, attr: 'str'})),
      ...SKILLS.hrt.map(s => ({name: s, attr: 'hrt'})),
      ...SKILLS.wit.map(s => ({name: s, attr: 'wit'}))
    ];
    grid.innerHTML = allSkills.map(s => {
      const sk = char.skills[s.name] || { rating: 0, favoured: false };
      const fav = sk.favoured ? ' style="background:var(--gold-soft);border-color:var(--gold)"' : '';
      return `<button class="quick-skill" onclick="rollSkillEndeavourAttempt('${s.name}')"${fav} style="padding:6px 4px;text-align:center">
        <strong>${s.name}</strong><br><span style="font-size:var(--fs-xs);color:var(--text-muted)">${sk.rating}d · ${s.attr.toUpperCase()}</span>
      </button>`;
    }).join('');

    // End-of-endeavour
    const endSection = document.getElementById('se-end-section');
    const attemptSection = document.getElementById('se-attempt-section');
    const finished = e.successesScored >= e.resistance || e.attemptsUsed >= e.timeLimit;
    if (finished && !e.outcome) {
      attemptSection.style.display = 'none';
      endSection.style.display = 'block';
      const msg = document.getElementById('se-end-message');
      const opts = document.getElementById('se-end-options');
      const won = e.successesScored >= e.resistance;
      if (won) {
        msg.innerHTML = `🎉 <strong>SUCCESS</strong> — accumulated ${e.successesScored} successes (Resistance ${e.resistance}). Task completed.`;
        opts.innerHTML = `<button class="add-row-btn" onclick="finalizeSkillEndeavour('success')" style="width:100%;background:var(--success-text)">Close Endeavour (Success)</button>`;
      } else {
        if (e.riskLevel === 'foolish') {
          msg.innerHTML = `💀 <strong>DISASTER!</strong> Time limit reached on a Foolish-risk endeavour. ${e.successesScored} / ${e.resistance} successes. The endeavour fails completely and cannot be resumed.`;
          opts.innerHTML = `<button class="add-row-btn" onclick="finalizeSkillEndeavour('disaster')" style="width:100%;background:var(--btn-alert-bg)">Close (Disaster)</button>`;
        } else if (e.riskLevel === 'hazardous') {
          msg.innerHTML = `❌ Time limit reached on a Hazardous endeavour. ${e.successesScored} / ${e.resistance} successes. Each failed roll already imposed a Failure-with-Woe consequence.`;
          opts.innerHTML = `<button class="add-row-btn" onclick="finalizeSkillEndeavour('failure-with-woe')" style="width:100%;background:var(--btn-secondary-bg)">Close (Failure with Woe)</button>`;
        } else {
          msg.innerHTML = `⏳ Time limit reached. ${e.successesScored} / ${e.resistance} successes. Choose outcome:`;
          opts.innerHTML = `
            <button class="add-row-btn" onclick="finalizeSkillEndeavour('simple-failure')" style="width:100%;background:var(--btn-secondary-bg);margin-bottom:6px">Simple Failure (delay only)</button>
            <button class="add-row-btn" onclick="finalizeSkillEndeavour('woe')" style="width:100%;background:var(--btn-warn-bg)">Success with Woe (achieve at a price)</button>
          `;
        }
      }
    } else if (e.outcome) {
      attemptSection.style.display = 'none';
      endSection.style.display = 'block';
      const labels = {
        'success': '🎉 Success',
        'simple-failure': '❌ Simple Failure (delay)',
        'woe': '⚠️ Success with Woe',
        'failure-with-woe': '❌ Failure with Woe',
        'disaster': '💀 Disaster'
      };
      document.getElementById('se-end-message').innerHTML = `${labels[e.outcome] || e.outcome} — endeavour closed.`;
      document.getElementById('se-end-options').innerHTML = `<button class="add-row-btn" onclick="closeSkillEndeavourAndReset()" style="width:100%">Start New Endeavour</button>`;
    } else {
      attemptSection.style.display = 'block';
      endSection.style.display = 'none';
    }

    renderSkillEndeavourLog();
  } else {
    setup.style.display = 'block';
    active.style.display = 'none';
    log.style.display = 'none';
  }
  _councilLayout();
}

/** One Council / Endeavour roll as a log row: number, dice pill, and what came of it in words.
    The rows used to read "#2 Athletics — Feat 6, total 11 vs STR TN 15, 0 ✦. No contribution. FAIL". */
function _skillLogRow(r, num) {
  const d = String(r.detail || '');
  const m = d.match(/total (\S+) vs \w+ TN (\d+)/);
  const total = m ? (m[1] === '★' ? null : parseInt(m[1])) : null, tn = m ? m[2] : '?';
  let said;
  if (r.intro) {
    const tl = (d.match(/Time Limit set to (\d+)/) || [])[1];
    said = r.success ? `A good opening — <strong>${tl || '?'} attempts</strong> to win them over.` : `A poor opening — only <strong>${tl || 3} attempts</strong>.`;
  } else if (r.contributed > 0) said = `<strong>+${r.contributed}</strong> toward the goal.`;
  else said = 'It fails — no progress toward the goal.';
  const extra = [];
  if (r.bonus) extra.push(`roleplay +${r.bonus}d`);
  if (/Support \+1d/.test(d)) extra.push('support +1d');
  const woe = d.match(/Failure-with-Woe auto-applied: ([^<]*?)\.?<\/strong>/);
  if (woe) said += ` <span class="slog-woe">Woe: ${woe[1].replace(/\s*\(now \d+\)/, '')}.</span>`;
  if (/DISASTER/.test(d)) said += ' <span class="slog-woe">Disaster — the task fails for good.</span>';
  return `<div class="slog-row"><span class="slog-n">${num}</span>${rollPillHtml(r.skill, total, tn, !!r.success)}<span class="slog-said">${said}${extra.length ? ` <small>(${extra.join(', ')})</small>` : ''}</span></div>`;
}
function renderSkillEndeavourLog() {
  const log = document.getElementById('se-roll-log');
  if (!log || !char.skillEndeavour) return;
  const rolls = char.skillEndeavour.rolls || [];
  if (rolls.length === 0) {
    log.innerHTML = '<div style="text-align:center;color:var(--text-faint);padding:10px;font-size:var(--fs-xs)">No attempts yet.</div>';
    return;
  }
  log.innerHTML = rolls.slice().reverse().map((r, i) => _skillLogRow(r, rolls.length - i)).join('');
}

function rollSkillEndeavourAttempt(skillName) {
  const e = char.skillEndeavour;
  if (!e || !e.active) return;
  if (e.attemptsUsed >= e.timeLimit) { alert('Time limit reached.'); return; }
  if (e.successesScored >= e.resistance) { alert('Already succeeded.'); return; }

  const s = char.skills[skillName] || { rating: 0, favoured: false };
  const tnAttr = SKILLS.str.includes(skillName) ? 'str' : (SKILLS.hrt.includes(skillName) ? 'hrt' : 'wit');
  const actualTn = parseInt(char[tnAttr + 'TN']) || 14;
  const roleplayBonus = parseInt(document.querySelector('#se-roleplay-pick .seg-btn.active')?.dataset.val) || 0;
  const successDice = Math.max(0, _heroSkill(skillName).rating + roleplayBonus);
  let fav = s.favoured ? 'fav' : 'normal';
  const r = _doInlineRoll(successDice, fav, actualTn, `${skillName} · Skill Endeavour`);
  let success = r.outcome.startsWith('SUCCESS');
  if (char.miserable && r.featSpecial === 'eye') success = false;

  e.attemptsUsed += 1;
  const contributed = success ? (1 + r.icons) : 0;
  e.successesScored += contributed;

  let detail = `Feat ${r.featLabel}, total ${r.total ?? '★'} vs ${tnAttr.toUpperCase()} TN ${actualTn}, ${r.icons} ✦.`;
  if (success) detail += ` Contributed +${contributed}.`;
  else detail += ` No contribution.`;

  // Hazardous risk: each failed roll applies a Failure-with-Woe consequence. We auto-apply
  // a default mechanical setback (+2 Fatigue) so the cost is real, not just narrated. The
  // LM can adjust afterwards. Eye-die failures hurt more (+1 Shadow on top).
  let woeApplied = false;
  let disaster = false;
  if (!success && e.riskLevel === 'hazardous') {
    const fatBefore = parseInt(char.fatigue) || 0;
    char.fatigue = fatBefore + 2;
    let woeBits = `+2 Fatigue (now ${char.fatigue})`;
    if (r.featSpecial === 'eye') {
      const cap = Math.max(0, (parseInt(char.hopeMax) || 0) - (parseInt(char.scars) || 0));
      const sBefore = parseInt(char.shadow) || 0;
      char.shadow = Math.min(cap, sBefore + 1);
      woeBits += `, +${char.shadow - sBefore} Shadow (👁)`;
    }
    detail += ` ⚠️ <strong>Failure-with-Woe auto-applied: ${woeBits}.</strong>`;
    woeApplied = true;
  }
  // Foolish risk: a single failed roll is a Disaster — the endeavour ends immediately.
  if (!success && e.riskLevel === 'foolish') {
    detail += ` 💀 <strong>DISASTER on a Foolish endeavour — it fails and cannot be resumed.</strong>`;
    disaster = true;
  }

  e.rolls.push({
    skill: skillName,
    success,
    icons: r.icons,
    contributed,
    bonus: roleplayBonus,
    woeApplied,
    detail
  });
  saveCharacter();
  if (disaster) {
    finalizeSkillEndeavour('disaster');  // keeps the active+log cards visible with the outcome
    alertStyled('💀 <strong>Disaster.</strong><br><br>A failed roll on a <strong>Foolish</strong> endeavour ends it outright — ' +
      escapeHtml(char.skillEndeavour.task || 'the task') + ' fails and <strong>cannot be resumed</strong>. ' +
      'Whatever you were attempting is beyond reach by this route; find another.', '💀 Disaster');
  } else {
    renderSkillEndeavour();
  }
  render();  // Fatigue/Shadow counters changed
  // Reset roleplay bonus to None
  document.querySelectorAll('#se-roleplay-pick .seg-btn').forEach(b => b.classList.toggle('active', b.dataset.val === '0'));
}

function finalizeSkillEndeavour(outcome) {
  if (!char.skillEndeavour || !char.skillEndeavour.active) return;
  char.skillEndeavour.outcome = outcome;
  char.skillEndeavour.active = false;
  if (typeof logTimeline === 'function') logTimeline('endeavour', `Skill Endeavour — ${char.skillEndeavour.task || 'a prolonged task'}: ${outcome}.`);
  if (typeof playNote === 'function') playNote(`<strong>The task is done</strong> — ${escapeHtml(char.skillEndeavour.task || 'a prolonged task')}: ${escapeHtml(String(outcome))}.`);
  saveCharacter();
  renderSkillEndeavour();       // shows the closed endeavour + its outcome (see `showing` there)
  document.getElementById('se-active-card').style.display = 'block';
  document.getElementById('se-log-card').style.display = 'block';
  document.getElementById('se-setup-card').style.display = 'none';
  document.getElementById('se-cancel-btn').style.display = 'none';
  _councilLayout();
}

function closeSkillEndeavourAndReset() {
  char.skillEndeavour = JSON.parse(JSON.stringify(DEFAULT_CHARACTER.skillEndeavour));
  saveCharacter();
  renderSkillEndeavour();
  document.getElementById('se-cancel-btn').style.display = 'block';
}

/* ---------- COUNCIL ---------- */
const COUNCIL_RESISTANCE_HINTS = {
  3: 'Reasonable — folk lose nothing by helping, or you offer equal value.',
  6: 'Bold — goal profits you more than the people you\'re asking.',
  9: 'Outrageous — request is dangerous or has scarce/no reward for them.'
};
const COUNCIL_ATTITUDE_HINTS = {
  reluctant: 'Lose (1d). Audience has reason to be unwilling — prejudice, prior grievance, or similar.',
  open: 'No modifier. Default attitude — general willingness to listen.',
  friendly: 'Gain (1d). Audience is keen to hear you — friend of the family, recommended by note, etc.'
};

function _councilSkillRating(skillName) {
  const s = char.skills[skillName] || { rating: 0, favoured: false };
  return s;
}

function startCouncil() {
  if (typeof newcomerNeedsHelp === 'function' && newcomerNeedsHelp()) {
    alertStyled('Build a hero first — pick a <strong>Culture</strong> and <strong>Calling</strong> on the <strong>Build</strong> tab (or load a ready-made hero from ☰ Menu → ✨ Pre-generated Heroes). Until then this subsystem has no skills or attributes to roll against.', '⚠️ No hero built yet');
    return;
  }

  const topic = (document.getElementById('c-topic').value || '').trim();
  const resBtn = document.querySelector('#c-resistance-pick .seg-btn.active');
  const attBtn = document.querySelector('#c-attitude-pick .seg-btn.active');
  if (!resBtn || !attBtn) {
    const missing = [!resBtn && 'Resistance (how hard they are to sway)', !attBtn && 'Audience Attitude (how they feel about you)'].filter(Boolean);
    return requireStep('Still to choose: <strong>' + missing.join('</strong> and <strong>') + '</strong>.<br><br>Each is a row of buttons in the Council Setup card — tap one option in every row, then Begin.', 'council', 'council-setup-title', '⚠️ Council not set up');
  }
  char.council = {
    active: true,
    topic: topic || '(no topic set)',
    resistance: parseInt(resBtn.dataset.val) || 3,
    attitude: attBtn.dataset.val || 'open',
    introRolled: false,
    timeLimit: 0,
    attemptsUsed: 0,
    successesScored: 0,
    rolls: [],
    outcome: null
  };
  saveCharacter();
  renderCouncil();
}

async function cancelCouncil() {
  if (!await confirmStyled('Cancel this council? All progress will be discarded.', 'Cancel Council', {yes:'Abandon council', no:'Keep going'})) return;
  char.council.active = false;
  saveCharacter();
  renderCouncil();
}

function renderCouncil() {
  if (window._playSceneKind === 'council' && typeof renderPlay === 'function' && !window._inRenderPlay) setTimeout(renderPlay, 0);
  const setup = document.getElementById('council-setup-card');
  const active = document.getElementById('council-active-card');
  const log = document.getElementById('council-log-card');
  if (!setup) return;
  const c = char.council || {};

  // Update setup hints
  const resPick = document.querySelector('#c-resistance-pick .seg-btn.active');
  const attPick = document.querySelector('#c-attitude-pick .seg-btn.active');
  if (resPick) document.getElementById('c-resistance-hint').textContent = COUNCIL_RESISTANCE_HINTS[parseInt(resPick.dataset.val)] || '';
  if (attPick) document.getElementById('c-attitude-hint').textContent = COUNCIL_ATTITUDE_HINTS[attPick.dataset.val] || '';

  if (c.active) {
    setup.style.display = 'none';
    active.style.display = 'block';
    log.style.display = 'block';

    const attLabel = { reluctant: 'Reluctant −1d', open: 'Open', friendly: 'Friendly +1d' }[c.attitude] || c.attitude;
    document.getElementById('c-summary').innerHTML =
      `<strong>${c.topic}</strong><br>` +
      `Resistance: <strong>${c.resistance}</strong> · Attitude: <strong>${attLabel}</strong>` +
      (c.introRolled ? ` · Time Limit: <strong>${c.timeLimit}</strong>` : '');

    // Progress bars
    const succPct = c.resistance > 0 ? Math.min(100, (c.successesScored / c.resistance) * 100) : 0;
    document.getElementById('c-success-bar').style.width = succPct + '%';
    document.getElementById('c-successes-label').textContent = `${c.successesScored} / ${c.resistance}`;
    const attPct = c.timeLimit > 0 ? Math.min(100, (c.attemptsUsed / c.timeLimit) * 100) : 0;
    document.getElementById('c-attempts-bar').style.width = attPct + '%';
    document.getElementById('c-attempts-label').textContent = c.timeLimit > 0 ? `${c.attemptsUsed} / ${c.timeLimit}` : `${c.attemptsUsed} / —`;
    if (typeof tallyMarks === 'function') { document.getElementById('c-tally').innerHTML = tallyMarks(c.successesScored, c.resistance); document.getElementById('c-candles').innerHTML = candleRow(c.attemptsUsed, c.timeLimit); }

    // Phase visibility
    document.getElementById('c-intro-section').style.display = c.introRolled ? 'none' : 'block';
    const interactionDone = c.successesScored >= c.resistance || (c.timeLimit > 0 && c.attemptsUsed >= c.timeLimit);
    document.getElementById('c-interaction-section').style.display = (c.introRolled && !interactionDone) ? 'block' : 'none';

    // Support button state
    const supBtn = document.getElementById('c-support-btn');
    const supHint = document.getElementById('c-support-hint');
    if (supBtn) {
      supBtn.classList.toggle('active', !!c.supportNext);
      supBtn.style.background = c.supportNext ? 'var(--success-text)' : 'var(--btn-secondary-bg)';
      supBtn.textContent = c.supportNext ? '🤝 Support armed — +1d on next roll (tap to cancel)' : '🤝 Companion Support (+1d next roll)';
    }
    if (supHint) {
      supHint.style.display = c.supportNext ? 'block' : 'none';
      supHint.textContent = 'A companion is spending 1 Hope (on their own sheet) to support your next roll.';
    }

    // End-of-council
    const endSection = document.getElementById('c-end-section');
    if (c.introRolled && interactionDone && !c.outcome) {
      endSection.style.display = 'block';
      const won = c.successesScored >= c.resistance;
      const msg = document.getElementById('c-end-message');
      const opts = document.getElementById('c-end-options');
      if (won) {
        msg.innerHTML = `🎉 <strong>SUCCESS</strong> — Company accumulated ${c.successesScored} successes (Resistance ${c.resistance}). Goal achieved.`;
        opts.innerHTML = `<button class="add-row-btn" onclick="finalizeCouncil('success')" style="width:100%;background:var(--success-text)">Close Council (Success)</button>`;
      } else {
        msg.innerHTML = `⏳ Time limit reached. ${c.successesScored} / ${c.resistance} successes. Choose outcome:`;
        opts.innerHTML = `
          <button class="add-row-btn" onclick="finalizeCouncil('failure')" style="width:100%;background:var(--btn-secondary-bg);margin-bottom:6px">Accept Failure (refused outright)</button>
          <button class="add-row-btn" onclick="finalizeCouncil('woe')" style="width:100%;background:var(--btn-warn-bg)">Success with Woe (achieve the goal at a price)</button>
        `;
      }
    } else if (c.outcome) {
      endSection.style.display = 'block';
      const labels = { success: '🎉 Success', failure: '❌ Failed (refused)', woe: '⚠️ Success with Woe' };
      document.getElementById('c-end-message').innerHTML = `${labels[c.outcome] || c.outcome} — council closed.`;
      document.getElementById('c-end-options').innerHTML = `<button class="add-row-btn" onclick="closeCouncilAndReset()" style="width:100%">Start New Council</button>`;
    } else {
      endSection.style.display = 'none';
    }

    renderCouncilLog();
  } else {
    setup.style.display = 'block';
    active.style.display = 'none';
    log.style.display = 'none';
  }
  renderCouncilHistory();
  _councilLayout();
}

function renderCouncilHistory() {
  const card = document.getElementById('council-history-card');
  if (!card) return;
  const hist = Array.isArray(char.councilHistory) ? char.councilHistory : [];
  if (hist.length === 0) { card.style.display = 'none'; return; }
  card.style.display = 'block';
  document.getElementById('c-history-count').textContent = `(${hist.length})`;
  const labels = { success: '🎉 Success', failure: '❌ Failed', woe: '⚠️ Success with Woe' };
  document.getElementById('c-history-list').innerHTML = hist.slice().reverse().map((h, i) => {
    const num = hist.length - i;
    return `<div style="padding:6px 8px;border-bottom:1px solid var(--border)">
      <strong>#${num} ${escapeHtml(h.topic || '(untitled)')}</strong>${h.when ? ` <small style="color:var(--text-faint)">${escapeHtml(h.when)}</small>` : ''}<br>
      <small>${labels[h.outcome] || h.outcome} · ${h.successesScored}/${h.resistance} successes in ${h.attemptsUsed} attempt(s)</small>
    </div>`;
  }).join('');
  _councilLayout();
}

async function clearCouncilHistory() {
  if (!await confirmStyled('Clear all saved council summaries? This cannot be undone.', 'Clear Council History', {yes:'Clear summaries', no:'Keep them'})) return;
  char.councilHistory = [];
  saveCharacter();
  renderCouncil();
}

function renderCouncilLog() {
  const log = document.getElementById('c-roll-log');
  if (!log || !char.council) return;
  const rolls = char.council.rolls || [];
  if (rolls.length === 0) {
    log.innerHTML = '<div style="text-align:center;color:var(--text-faint);padding:10px;font-size:var(--fs-xs)">No rolls yet — make the Introduction roll to begin.</div>';
    return;
  }
  log.innerHTML = rolls.slice().reverse().map((r, i) => _skillLogRow(r, rolls.length - i)).join('');
}

function rollCouncilIntro(skillName) {
  const c = char.council;
  if (!c || !c.active) return;
  if (c.introRolled) { alert('Introduction already done.'); return; }
  const s = _councilSkillRating(skillName);
  const tn = parseInt(char.witTN) || 14;  // Introduction skills are Wits-based (Awe is Str, but Courtesy/Riddle are Wits)
  // Better: derive TN from skill's attribute group
  const tnAttr = SKILLS.str.includes(skillName) ? 'str' : (SKILLS.hrt.includes(skillName) ? 'hrt' : 'wit');
  const actualTn = parseInt(char[tnAttr + 'TN']) || 14;
  // Attitude modifier (applied as +1d/-1d on success dice)
  const attMod = c.attitude === 'reluctant' ? -1 : (c.attitude === 'friendly' ? 1 : 0);
  const successDice = Math.max(0, _heroSkill(skillName).rating + attMod);
  let fav = s.favoured ? 'fav' : 'normal';
  const r = _doInlineRoll(successDice, fav, actualTn, `${skillName} · Council introduction`);
  let success = r.outcome.startsWith('SUCCESS');
  if (char.miserable && r.featSpecial === 'eye') success = false;

  c.introRolled = true;
  c.timeLimit = success ? (4 + r.icons) : 3;
  c.rolls.push({
    skill: skillName,
    success,
    icons: r.icons,
    contributed: 0,
    bonus: 0,
    intro: true,
    detail: `Feat ${r.featLabel}, total ${r.total ?? '★'} vs ${tnAttr.toUpperCase()} TN ${actualTn}, ${r.icons} ✦. Attitude ${c.attitude} (${attMod >= 0 ? '+' : ''}${attMod}d). Time Limit set to ${c.timeLimit}.`
  });
  saveCharacter();
  renderCouncil();
}

function rollCouncilAttempt(skillName) {
  const c = char.council;
  if (!c || !c.active || !c.introRolled) return;
  if (c.attemptsUsed >= c.timeLimit) { alert('Time limit reached.'); return; }
  if (c.successesScored >= c.resistance) { alert('Already succeeded.'); return; }

  const s = _councilSkillRating(skillName);
  const tnAttr = SKILLS.str.includes(skillName) ? 'str' : (SKILLS.hrt.includes(skillName) ? 'hrt' : 'wit');
  const actualTn = parseInt(char[tnAttr + 'TN']) || 14;
  const attMod = c.attitude === 'reluctant' ? -1 : (c.attitude === 'friendly' ? 1 : 0);
  const roleplayBonus = parseInt(document.querySelector('#c-roleplay-pick .seg-btn.active')?.dataset.val) || 0;
  const supportBonus = c.supportNext ? 1 : 0;
  const successDice = Math.max(0, _heroSkill(skillName).rating + attMod + roleplayBonus + supportBonus);
  let fav = s.favoured ? 'fav' : 'normal';
  const r = _doInlineRoll(successDice, fav, actualTn, `${skillName} · Council`);
  let success = r.outcome.startsWith('SUCCESS');
  if (char.miserable && r.featSpecial === 'eye') success = false;

  c.attemptsUsed += 1;
  const contributed = success ? (1 + r.icons) : 0;
  c.successesScored += contributed;
  c.rolls.push({
    skill: skillName,
    success,
    icons: r.icons,
    contributed,
    bonus: roleplayBonus,
    intro: false,
    detail: `Feat ${r.featLabel}, total ${r.total ?? '★'} vs ${tnAttr.toUpperCase()} TN ${actualTn}, ${r.icons} ✦. Attitude ${c.attitude} (${attMod >= 0 ? '+' : ''}${attMod}d).${supportBonus ? ' 🤝 Support +1d.' : ''}` + (success ? ` Contributed +${contributed}.` : ` No contribution.`)
  });
  c.supportNext = false;  // support is one-shot
  saveCharacter();
  renderCouncil();
  // Reset roleplay bonus to 0 after each attempt (one-shot)
  document.querySelectorAll('#c-roleplay-pick .seg-btn').forEach(b => b.classList.toggle('active', b.dataset.val === '0'));
}

// Companion Support (Core Rules p.106): a companion spends 1 Hope (on their own sheet) to
// grant the speaker +1d on their next Interaction roll. One-shot; toggle off to cancel.
function toggleCouncilSupport() {
  const c = char.council;
  if (!c || !c.active || !c.introRolled) return;
  c.supportNext = !c.supportNext;
  saveCharacter();
  renderCouncil();
}

function finalizeCouncil(outcome) {
  if (!char.council || !char.council.active) return;
  char.council.outcome = outcome;
  char.council.active = false;  // mark inactive but keep state visible until reset
  if (typeof logTimeline === 'function') logTimeline('council', `Council — ${char.council.topic || 'a matter of some weight'}: ${outcome}.`);
  if (typeof playNote === 'function') playNote(`<strong>The council ends</strong> — ${escapeHtml(char.council.topic || 'a matter of some weight')}: ${escapeHtml(String(outcome))}.`);
  // Persist a summary to the council history.
  if (!Array.isArray(char.councilHistory)) char.councilHistory = [];
  char.councilHistory.push({
    topic: char.council.topic,
    outcome,
    successesScored: char.council.successesScored,
    resistance: char.council.resistance,
    attemptsUsed: char.council.attemptsUsed,
    when: char.dayCount ? `Day ${char.dayCount}` : ''
  });
  saveCharacter();
  renderCouncil();
  const _coutcome = { success: 'succeeded', failure: 'failed', woe: 'succeeded at a price' }[outcome] || outcome;
  if (typeof journalAuto === 'function') journalAuto('ojc', 'result', `Council "${char.council.topic}" ${_coutcome} (${char.council.successesScored}/${char.council.resistance} successes).`);
  // Show log + outcome until player taps "Start New Council"
  // Need to keep cards visible — override the active toggle
  document.getElementById('council-active-card').style.display = 'block';
  document.getElementById('council-log-card').style.display = 'block';
  document.getElementById('council-setup-card').style.display = 'none';
  document.getElementById('c-cancel-btn').style.display = 'none';
  _councilLayout();
}

function closeCouncilAndReset() {
  char.council = JSON.parse(JSON.stringify(DEFAULT_CHARACTER.council));
  saveCharacter();
  renderCouncil();
  document.getElementById('c-cancel-btn').style.display = 'block';
}

/* ---------- JOURNEY ---------- */
function _doInlineRoll(successDice, fav, tn, label, opts) {
  opts = opts || {};
  const foe = !!opts.foe;   // a foe's dice: none of the hero's states (Despair, Weary) apply to them
  // Inline dice roller used by Journey for Marching Tests / Event Feat dice / Arrival roll.
  // Returns: { featValue, featSpecial, featLabel, total, icons, outcome }
  // Despair (Core Rules p.137): at Shadow + Scars = Max Hope, every Feat die is Ill-Favoured.
  // Layer it against the caller's fav per RAW p.20 (Fav + Ill cancel to Normal).
  if (!foe && shadowDespairActive()) fav = (fav === 'fav') ? 'normal' : 'ill';
  const weary = !foe && heroIsWeary();
  let featRolls;
  if (fav === 'normal') featRolls = [rollFeatOnce()];
  else featRolls = [rollFeatOnce(), rollFeatOnce()];
  const score = r => r.special === 'rune' ? 100 : (r.special === 'eye' ? -100 : r.value);
  featRolls.sort((a, b) => score(b) - score(a));
  const chosen = (fav === 'ill') ? featRolls[featRolls.length - 1] : featRolls[0];
  const successRolls = [];
  for (let i = 0; i < successDice; i++) {
    const v = Math.floor(Math.random() * 6) + 1;
    // Weary: a Success die showing 1, 2 or 3 counts as 0 — on every roll, as on the Dice tab.
    successRolls.push({ value: v, icon: v === 6, wearied: weary && v <= 3 });
  }
  const icons = successRolls.filter(s => s.icon).length;
  const sumSuccess = successRolls.reduce((sum, s) => sum + (s.wearied ? 0 : s.value), 0);
  const total = chosen.special === 'rune' ? null : chosen.value + sumSuccess;
  let outcome;
  if (tn === null) outcome = 'N/A';
  else if (chosen.special === 'rune') outcome = 'SUCCESS (Rune)';
  // An Eye counts as 0 on the Feat die; it is an automatic failure only for a Miserable hero —
  // exactly as on the Dice tab. Every other roll (Play, Journey, Council, Endeavour, attacks)
  // used to fail outright on any Eye, however many Success dice came up.
  else if (chosen.special === 'eye' && (foe || char.miserable)) outcome = 'FAIL (Eye)';
  else if (total >= tn) outcome = 'SUCCESS';
  else outcome = 'FAIL';
  const res = { featValue: chosen.value, featSpecial: chosen.special, featLabel: chosen.label, total, icons, outcome, weary };
  if (!foe) _soloEyeFromRoll(res);
  // One record of every roll: rolls made on Play, the Journey, the Council and the Endeavour
  // go into the Dice tab's history too (they used to leave no trace there).
  if (label && tn !== null && typeof history !== 'undefined' && Array.isArray(history)) {
    history.unshift({ label, total: chosen.special === 'rune' ? '★' : total, outcome, tn, icons,
      feat: chosen.special || chosen.value, dice: successRolls.map(x => x.value),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
    if (history.length > 30) history.length = 30;
    try { saveHistory(); if (typeof renderHistory === 'function') renderHistory(); } catch (e) {}
  }
  return res;
}

/* The Eye card states the rule plainly: "Raise by 1 for any Eye icon outside combat." That hook
   lived in `rollDice()` alone, so an 👁 in a Council, Journey, Endeavour, Battle or ▶ Play roll —
   every one of which goes through `_doInlineRoll` — did nothing at all. Solo campaigns ran lighter
   than the rules intend on every surface except the Dice tab.
   A Rune does NOT raise it (GOTCHA / Strider Mode: an Eye only); it offers the Fortune table. */
let _inlineEyeSuspended = false;
function _suspendInlineEye(on) { _inlineEyeSuspended = !!on; }
function _soloEyeFromRoll(r) {
  if (_inlineEyeSuspended) return;                         // combat rolls: the Eye ignores blows
  if (typeof isSolo !== 'function' || !isSolo()) return;
  if (!r) return;
  if (r.featSpecial === 'eye') {
    raiseEye(1);
  }
  _soloFortuneOffer(r);
}

/** The Oracle tab promises: "When one of your ordinary rolls turns up a ☉ Rune or an 👁 Eye, the
    dice result offers a one-tap button to roll the matching table right there." That was true on
    the Dice tab and nowhere else — a Rune on a Marching Test, a Clash or a Peril was offered
    nothing. Every inline roll comes through here, so the offer belongs here. */
function _soloFortuneOffer(r) {
  if (!r || (r.featSpecial !== 'rune' && r.featSpecial !== 'eye')) return;
  const isIll = r.featSpecial === 'eye';
  // Gate on what is actually on screen, not on a flag: a flag survives a dialog that was hidden
  // without resolving (the Escape handler can do that), and then no roll is ever offered a table
  // again for the rest of the session — a silent, permanent loss of the feature.
  setTimeout(async () => {
    for (let i = 0; i < 40 && document.querySelector('.menu-overlay.show'); i++) {
      await new Promise(res => setTimeout(res, 150));
    }
    if (document.querySelector('.menu-overlay.show')) return;     // still busy — let this one go
    try {
      const go = await showModal({
        title: isIll ? '👁 An Eye on that roll' : '☉ A Gandalf Rune on that roll',
        message: (isIll
          ? 'The Enemy\'s luck turns against you. Roll on the <strong>Ill-Fortune</strong> table for a complication to fold into the story?'
          : 'Fortune favours you. Roll on the <strong>Fortune</strong> table for a turn of luck to fold into the story?') +
          '<br><br><em>Optional — for worthy challenges and key actions.</em>',
        buttons: [
          { label: isIll ? '🎲 Roll Ill-Fortune' : '🎲 Roll Fortune', value: 'roll' },
          { label: 'Not this time', value: null, style: 'background:var(--btn-secondary-bg);color:white;border:none;border-radius:var(--r-sm);padding:10px;font-size:var(--fs-md);cursor:pointer' }
        ]
      });
      if (go === 'roll' && typeof fortuneTableRoll === 'function') {
        const out = fortuneTableRoll(isIll);
        const label = isIll ? '🎲 Ill-Fortune' : '🎲 Fortune';
        if (typeof journalAuto === 'function') journalAuto('ojc', 'oracle', `${label} (Feat ${out.r.label}): ${out.entry.text}`);
        alert(`${label} (Feat ${out.r.label})\n\n${out.entry.text}`);
        render();
      }
    } catch (e) {}
  }, 300);
}

async function startJourney() {
  if (typeof newcomerNeedsHelp === 'function' && newcomerNeedsHelp()) {
    alertStyled('Build a hero first — pick a <strong>Culture</strong> and <strong>Calling</strong> on the <strong>Build</strong> tab (or load a ready-made hero from ☰ Menu → ✨ Pre-generated Heroes). Until then this subsystem has no skills or attributes to roll against.', '⚠️ No hero built yet');
    return;
  }

  const total = parseInt(document.getElementById('j-totalHexes').value) || 0;
  if (total <= 0) { alert('Total Hexes must be greater than 0.'); return; }
  // Only Moria asks first; elsewhere the journey starts in this same tick (nothing is awaited).
  if (typeof isMoria === 'function' && isMoria() && !await moriaReadyToTravel()) return;
  char.journey = {
    active: true,
    origin: document.getElementById('j-origin').value,
    destination: document.getElementById('j-destination').value,
    totalHexes: total,
    hardTerrainHexes: parseInt(document.getElementById('j-hardTerrainHexes').value) || 0,
    currentHex: 0,
    season: document.getElementById('j-season').value,
    region: document.getElementById('j-region').value,
    forcedMarch: document.getElementById('j-forcedMarch').checked,
    mounted: document.getElementById('j-mounted').checked,
    mountVigour: parseInt(document.getElementById('j-mountVigour').value) || 0,
    roles: {
      guide: document.getElementById('j-role-guide').checked,
      hunter: document.getElementById('j-role-hunter').checked,
      lookout: document.getElementById('j-role-lookout').checked,
      scout: document.getElementById('j-role-scout').checked
    },
    travelFatigue: 0, daysElapsed: 0, events: [], nextEventHex: null,
    perilRating: Math.max(0, parseInt(document.getElementById('j-perilRating').value) || 0),
    perilEventsRemaining: Math.max(0, parseInt(document.getElementById('j-perilRating').value) || 0),
    ...(typeof takePendingRoute === 'function' ? takePendingRoute(total) : {})
  };
  // ▶ Play follows a journey begun here: out from the haven it is the road there; from the
  // place you went to, it is the road home. (It used to stay "at your home" during the march.)
  if (char.saga && char.saga.started && !char.saga.ended) {
    const st = char.saga.step || 'haven';
    if (st === 'location' || st === 'home') char.saga.step = 'home';
    else if (st !== 'fellowship') char.saga.step = 'journey';
  }
  saveCharacter();
  renderJourney();
}

async function endJourney() {
  if (!await confirmStyled('Cancel this journey? All progress will be discarded.<br><br><small>(Does not retroactively undo Fatigue / Shadow already applied.)</small>', 'Cancel Journey', {yes:'Abandon journey', no:'Keep travelling'})) return;
  char.journey.active = false;
  saveCharacter();
  renderJourney();
}

function renderJourney() {
  const setup = document.getElementById('journey-setup-card');
  const progress = document.getElementById('journey-progress-card');
  const log = document.getElementById('journey-log-card');
  const cancelBtn = document.getElementById('j-cancel-btn');
  if (!setup) return;
  const j = char.journey || {};
  if (j.active) {
    setup.style.display = 'none';
    progress.style.display = 'block';
    log.style.display = 'block';
    if (cancelBtn) cancelBtn.style.display = 'block';   // lives in the active card now, full-width

    const roleLabels = [];
    if (j.roles && j.roles.guide) roleLabels.push('Guide');
    if (j.roles && j.roles.hunter) roleLabels.push('Hunter');
    if (j.roles && j.roles.lookout) roleLabels.push('Look-out');
    if (j.roles && j.roles.scout) roleLabels.push('Scout');
    // Travelling alone, the hero covers every role (Strider Mode) — "none" read as if no-one did.
    const rolesStr = (typeof isSolo === 'function' && isSolo()) ? 'all of them — you travel alone'
      : (roleLabels.length ? roleLabels.join(', ') : '<em>none</em>');
    const fmTag = j.forcedMarch ? ' · <strong>Forced March</strong>' : '';
    const mountTag = j.mounted ? ` · Mounted (Vigour ${j.mountVigour})` : '';
    document.getElementById('j-summary').innerHTML =
      `<strong>${escapeHtml(j.origin || '?')}</strong> → <strong>${escapeHtml(j.destination || '?')}</strong><br>` +
      `${j.season} · ${j.region} Land${fmTag}${mountTag}<br>` +
      `<small>My role(s): ${rolesStr}</small>`;

    const pct = j.totalHexes > 0 ? Math.min(100, (j.currentHex / j.totalHexes) * 100) : 0;
    document.getElementById('j-progress-bar').style.width = pct + '%';
    document.getElementById('j-progress-label').textContent = `${j.currentHex} / ${j.totalHexes} hexes`;
    document.getElementById('j-days-v').textContent = j.daysElapsed || 0;
    document.getElementById('j-travelfat-v').textContent = j.travelFatigue || 0;
    document.getElementById('j-nextevent-v').textContent = (j.nextEventHex !== null && j.nextEventHex !== undefined) ? `hex ${j.nextEventHex}` : '—';

    const resolveBtn = document.getElementById('j-resolve-event-btn');
    const eventDue = j.nextEventHex !== null && j.nextEventHex !== undefined && j.currentHex >= j.nextEventHex;
    resolveBtn.disabled = !eventDue;
    resolveBtn.style.opacity = eventDue ? '1' : '0.4';
    resolveBtn.style.cursor = eventDue ? 'pointer' : 'not-allowed';

    // Perilous Location row
    const perilRow = document.getElementById('j-peril-row');
    if (perilRow) {
      const rem = parseInt(j.perilEventsRemaining) || 0;
      perilRow.style.display = rem > 0 ? 'block' : 'none';
      const remEl = document.getElementById('j-peril-remaining');
      if (remEl) remEl.textContent = rem;
    }

    renderJourneyLog();
    renderJourneyEventRoll();
  } else {
    setup.style.display = 'block';
    progress.style.display = 'none';
    log.style.display = 'none';
    if (cancelBtn) cancelBtn.style.display = 'none';
    // The season is the calendar's (Tale of Years) until the player picks one by hand.
    const se = document.getElementById('j-season');
    if (se && !se.dataset.picked && !(typeof isMoria === 'function' && isMoria())) se.value = calendarSeason();
    // From: the Safe Haven, else the culture's home town, until the player types one.
    const fo = document.getElementById('j-origin');
    if (fo && !fo.value && typeof homePlaceName === 'function') fo.placeholder = homePlaceName() ? 'e.g. ' + homePlaceName() : fo.placeholder;
  }
  if (typeof jSyncGuided === 'function') jSyncGuided();
}

/** The button the journey event asks for, with the effect it promises wired to it. */
function renderJourneyEventRoll() {
  const row = document.getElementById('j-event-roll-row');
  if (!row) return;
  const j = char.journey || {};
  const pend = j.pendingEventRoll;
  if (j.active && j.pendingScene) {
    row.style.display = 'block';
    row.innerHTML = `<div style="font-size:var(--fs-xs);font-weight:600;color:var(--red-dark);margin-bottom:4px">▶ ${escapeHtml(j.pendingScene.detail || j.pendingScene.name)}</div>` +
      `<p class="hint" style="text-align:left;margin:0 0 6px;font-size:var(--fs-xs)">A noteworthy encounter — how do you meet it?</p>` + _sceneButtons();
    return;
  }
  if (!j.active || !pend || !pend.skill) { row.style.display = 'none'; row.innerHTML = ''; return; }
  const sk = _heroSkill(pend.skill);
  const effect = JOURNEY_EVENT_ROLL_EFFECT[pend.eventKey];
  row.style.display = 'block';
  row.innerHTML =
    `<div style="font-size:var(--fs-xs);font-weight:600;color:var(--red-dark);margin-bottom:4px">▶ ${escapeHtml(pend.eventName)} — roll ${escapeHtml(pend.skill)}</div>` +
    `<p class="hint" style="text-align:left;margin:0 0 6px;font-size:var(--fs-xs);line-height:1.4">` +
    `${escapeHtml(pend.skill)} ${'◆'.repeat(sk.rating)}${'◇'.repeat(Math.max(0, 6 - sk.rating))} vs TN ${sk.tn}` +
    `${sk.favoured ? ' · ★ Favoured' : ''}${pend.hard ? ' · hard terrain −1d' : ''}` +
    `${effect ? `<br>On a success: <strong>${escapeHtml(effect.label)}</strong>` : ''}` +
    `${effect && effect.onFail ? `<br>On a failure, the app applies the event's cost for you.` : ''}</p>` +
    `<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">` +
    `<button class="add-row-btn" style="font-size:var(--fs-xs);background:var(--red)" onclick="rollJourneyEvent()">🎲 Roll ${escapeHtml(pend.skill)}</button>` +
    `<button class="add-row-btn" style="font-size:var(--fs-xs);background:var(--btn-secondary-bg);color:white" onclick="skipJourneyEventRoll()">Skip this roll</button>` +
    `</div>`;
}

/* What a successful event roll actually does. Only the mechanical ones are automated; the
   rest are narrative and say so rather than pretending to apply something. */
const _jDay  = (j, d) => { const was = parseInt(j.daysElapsed) || 0; j.daysElapsed = Math.max(0, was + d); if (j === char.journey) advanceDays(j.daysElapsed - was); return (d < 0 ? '−' : '+') + Math.abs(d) + ' day (now day ' + j.daysElapsed + ')'; };
const _jHope = () => { const before = parseInt(char.hopeCur) || 0, max = parseInt(char.hopeMax) || 0;
  char.hopeCur = Math.min(max, before + 1); return char.hopeCur > before ? `+1 Hope (${before} → ${char.hopeCur})` : 'Hope already full'; };
const _jShadow = (n) => {
  const before = (parseInt(char.shadow) || 0);
  if (typeof adj === 'function') { try { adj('shadow', n); } catch (e) { char.shadow = before + n; } }
  else char.shadow = before + n;
  return `+${n} Shadow (${before} → ${parseInt(char.shadow) || 0})`;
};
const _jFatigue = (n) => { char.fatigue = Math.max(0, (parseInt(char.fatigue) || 0) + n); return `+${n} Fatigue (now ${char.fatigue})`; };
const _jWound = () => {
  if (char.wounded) return 'you are hurt again, but already Wounded';
  char.wounded = true;
  let sev = '';
  try { if (typeof _applyWoundFromFail === 'function') { _applyWoundFromFail(); sev = char.injury ? ` — ${char.injury}` : ''; } } catch (e) {}
  return `you are <strong>WOUNDED</strong>${sev}`;
};
/* Each event names a consequence for BOTH outcomes. The success half was automated and the
   failure half printed "the event's effect stands" and applied nothing — while the Travel
   Fatigue from the same event WAS applied, so a player had no way to tell which half of an
   event was theirs to do by hand. `onFail` closes that. */
const JOURNEY_EVENT_ROLL_EFFECT = {
  // Core Rules journey events
  shortcut: { label: '−1 day off the journey',    apply: (j) => _jDay(j, -1) },
  chance:   { label: 'a favourable encounter',    apply: () => 'the meeting goes well — play it out as a scene' },
  joyful:   { label: '+1 Hope',                   apply: () => _jHope() },
  mishap:   { label: 'no extra day, no extra Fatigue', apply: () => 'the mishap costs you nothing further',
              onFail: (j) => `${_jDay(j, 1)} and ${_jFatigue(1)}` },
  ill:      { label: 'no Shadow from this',       apply: () => 'you keep your head — no Shadow gained',
              onFail: () => _jShadow(1) },
  despair:  { label: 'no Shadow from this',       apply: () => 'you hold on to your Hope — no Shadow gained',
              onFail: () => _jShadow(1) },
  terrible: { label: 'you are not Wounded',       apply: () => 'you come through it unwounded',
              onFail: () => _jWound() },
  // Moria
  rightWay:        { label: '−1 day off the journey', apply: (j) => _jDay(j, -1) },
  dreadWonder:     { label: '+1 Hope',                apply: () => _jHope(),
                     onFail: () => _jShadow(1) },
  branchingStairs: { label: 'no lost day',            apply: () => 'you pick the right stair — no day lost',
                     onFail: (j) => `${_jDay(j, 1)} and ${_jFatigue(1)}` },
  longDark:        { label: 'no Shadow from this',    apply: () => 'the dark does not reach you — no Shadow gained',
                     onFail: () => _jShadow(2) },
  watchfulEyes:    { label: 'unseen — no Shadow, no Eye', apply: () => 'you pass unseen — no Shadow, and the Eye does not stir',
                     onFail: () => {
                       const sh = _jShadow(1);
                       raiseEye(1);
                       return `${sh}, and the Eye stirs (👁 ${char.eyeAwareness})`;
                     } },
  deadlyDark:      { label: 'you are not Wounded',    apply: () => 'you come through it unwounded, and unnoticed',
                     onFail: () => {
                       const w = _jWound();
                       raiseEye(1);
                       return `${w}, and the Eye stirs (👁 ${char.eyeAwareness})`;
                     } }
};

async function rollJourneyEvent() {
  const j = char.journey;
  const pend = j && j.pendingEventRoll;
  if (!pend || !pend.skill) return;
  const sk = _heroSkill(pend.skill);
  const dice = Math.max(0, sk.rating - (pend.hard ? 1 : 0));
  const r = _doInlineRoll(dice, sk.favoured ? 'fav' : 'normal', sk.tn, `${pend.skill} · ${pend.eventName || 'Journey event'}`);
  let ok = String(r.outcome).startsWith('SUCCESS');
  if (char.miserable && r.featSpecial === 'eye') ok = false;
  const effect = JOURNEY_EVENT_ROLL_EFFECT[pend.eventKey];
  let applied = '';
  if (effect) applied = (ok ? effect.apply(j) : (effect.onFail ? effect.onFail(j) : '')) || '';
  const score = (r.total === null) ? 'a Gandalf rune — automatic success' : `${r.total} vs TN ${sk.tn}`;
  j.events.push({
    day: j.daysElapsed, hex: j.currentHex,
    res: { skill: pend.skill, eventName: pend.eventName, total: r.total, tn: sk.tn, ok, icons: r.icons, applied,
           noPenalty: !!(effect && !effect.onFail) },
    text: `▶ <strong>${escapeHtml(pend.skill)}</strong> roll for ${escapeHtml(pend.eventName)} — ${score}${r.icons ? `, ${r.icons} ✦` : ''}: ` +
          (ok ? `<strong style="color:var(--success-text)">success</strong>${applied ? ' — ' + applied : ''}`
              : `<strong style="color:var(--error-text)">failure</strong>${applied ? ' — ' + applied : (effect && !effect.onFail ? ' — you simply do not get the benefit; nothing worse happens.' : " — the event's effect stands.")}`)
  });
  j.pendingEventRoll = null;
  saveCharacter();
  renderJourney();
  if (typeof journalAuto === 'function') journalAuto('ojc', 'roll', `${pend.skill} roll for ${pend.eventName}: ${ok ? 'success' : 'failure'}${applied ? ' — ' + applied.replace(/<[^>]+>/g, '') : ''}`);
}

function skipJourneyEventRoll() {
  if (!char.journey) return;
  char.journey.pendingEventRoll = null;
  saveCharacter();
  renderJourney();
}

function renderJourneyLog() {
  const log = document.getElementById('j-event-log');
  if (!log || !char.journey || !char.journey.events) return;
  if (char.journey.events.length === 0) {
    log.innerHTML = '<div style="text-align:center;color:var(--text-faint);padding:10px;font-size:var(--fs-xs)">No events yet — make a Marching Test to begin.</div>';
    return;
  }
  log.innerHTML = char.journey.events.slice().reverse().map(e =>
    `<div class="jlog-row"><div class="jlog-when">Day ${e.day} · stretch ${e.hex}</div>${journeyLogEntry(e)}</div>`
  ).join('');
}

async function rollMarchingTest() {
  const j = char.journey;
  if (!j.active) { alert('No active journey.'); return; }
  if (j.currentHex >= j.totalHexes) { alert('Already at destination — tap Arrive.'); return; }
  if (j.nextEventHex !== null && j.nextEventHex !== undefined && j.currentHex >= j.nextEventHex) {
    return requireStep('Something has happened on the road — resolve it before you march on.<br><br>Tap <strong>🎲 Resolve Event Now</strong> in the Journey in Progress card.', 'journey', 'journey-active-card', '⚠️ Event waiting');
    return;
  }
  // Solo (Strider or Moria): no roles assigned — the lone hero is the de-facto Guide.
  // Treat as Guide automatically and auto-roll TRAVEL.
  if (!isSolo() && (!j.roles || !j.roles.guide)) {
    const r = await showModal({
      title: 'Marching Test',
      message: 'You are not the Guide. How did the Guide’s TRAVEL roll go?',
      buttons: [
        { label: 'Success', value: 'S0' }, { label: 'Success with 1 ✦', value: 'S1' },
        { label: 'Success with 2 ✦', value: 'S2' }, { label: 'Failure', value: 'F0' },
        { label: 'Cancel', value: null, cancel: true }
      ]
    });
    if (!r) return;
    applyMarchingTestResult(r[0] === 'S', parseInt(r[1]) || 0, 'manual entry');
    return;
  }
  const s = char.skills['Travel'] || { rating: 0, favoured: false };
  const tn = parseInt(char.hrtTN) || 14;
  let fav = s.favoured ? 'fav' : 'normal';
  if (char.miserable) {
    // Miserable doesn't ill-fav, but does cause Eye = auto-fail (handled in _doInlineRoll? no — let me handle it here)
  }
  const r = _doInlineRoll(_heroSkill('Travel').rating, fav, tn, 'Travel · Marching Test');
  // Miserable: an Eye result becomes auto-fail (matches main dice roller)
  let success = r.outcome.startsWith('SUCCESS');
  if (char.miserable && r.featSpecial === 'eye') success = false;
  applyMarchingTestResult(success, r.icons, `Feat ${r.featLabel}, total ${r.total ?? '★'}, ${r.icons} ✦, vs Heart TN ${tn}${char.miserable ? ' (Miserable)' : ''}`);
}

/** The Marching Test's arithmetic, shared by the hero's own journey and the table journey
    (src/11-table.js) so the two can never disagree: success = 3 + ✦ hexes, failure = 2 in spring
    and summer, 1 otherwise; hard ground adds days in proportion; a forced march halves the days
    and costs 1 Travel Fatigue per day. Mutates j; returns what it did. */
function marchAdvance(j, success, icons) {
  let hexesToNext = success ? 3 + (parseInt(icons) || 0) : ((j.season === 'Spring' || j.season === 'Summer') ? 2 : 1);
  hexesToNext = Math.min(hexesToNext, j.totalHexes - j.currentHex);
  const hardRatio = j.hardTerrainHexes > 0 && j.totalHexes > 0 ? j.hardTerrainHexes / j.totalHexes : 0;
  let daysSpent = hexesToNext + Math.round(hexesToNext * hardRatio);
  if (j.forcedMarch) daysSpent = Math.ceil(daysSpent / 2);
  j.daysElapsed = (parseInt(j.daysElapsed) || 0) + daysSpent;
  if (j.forcedMarch) j.travelFatigue = (parseInt(j.travelFatigue) || 0) + daysSpent;
  j.currentHex += hexesToNext;
  j.nextEventHex = j.currentHex;  // event happens at landing hex
  return { hexes: hexesToNext, days: daysSpent };
}

function applyMarchingTestResult(success, icons, detail, quiet) {
  const j = char.journey;
  const { hexes: hexesToNext, days: daysSpent } = marchAdvance(j, success, icons);
  // The journey kept its own day counter and the hero's calendar never moved — after a nine-day
  // march the Endurance card still read "Day 1", and a Wounded hero's injury days never ticked.
  advanceDays(daysSpent);
  const mt = String(detail || '').match(/total (\S+)/), mtn = String(detail || '').match(/TN (\d+)/);
  j.events.push({
    day: j.daysElapsed,
    hex: j.currentHex,
    march: { ok: !!success, hexes: hexesToNext, days: daysSpent, forced: !!j.forcedMarch,
             total: mt ? (mt[1] === '★' ? null : (isFinite(parseInt(mt[1])) ? parseInt(mt[1]) : undefined)) : undefined, tn: mtn ? parseInt(mtn[1]) : null },
    text: `🚶 Marching Test — <strong>${success ? 'Success' : 'Failure'}</strong> (${detail}). Advanced ${hexesToNext} hex${hexesToNext!==1?'es':''} in ${daysSpent} day${daysSpent!==1?'s':''}${j.forcedMarch?' (forced march: +'+daysSpent+' Travel Fatigue)':''}. Event resolves at hex ${j.currentHex}.`
  });
  saveCharacter();
  renderJourney();
  if (j.currentHex >= j.totalHexes && !quiet) {
    setTimeout(() => alert('You\'ve reached the destination hex. Resolve the final event, then tap "Arrive at Destination".'), 100);
  }
}

/* ================= MORIA BATTLES / CLASH ================= */
let _setupArchfoe = 'none', _setupObjres = '';

function _skillTN(name) {
  if (SKILLS.str.includes(name)) return parseInt(char.strTN) || 14;
  if (SKILLS.hrt.includes(name)) return parseInt(char.hrtTN) || 14;
  if (SKILLS.wit.includes(name)) return parseInt(char.witTN) || 14;
  return 14;
}
function _heroSkill(name) {
  const s = (char.skills && char.skills[name]) || { rating: 0, favoured: false };
  return { rating: (parseInt(s.rating) || 0) + _skillBonusDice(name), favoured: !!s.favoured, tn: _skillTN(name) };
}
/** The dice a hero's gear adds to a Skill roll — a Useful Item (+1d) and a Marvellous Artefact or
    Wondrous Item blessing that Skill (+2d). The Dice tab always added them; the rolls made on Play,
    the Journey, the Council and the Endeavour did not, so the same hero rolled fewer dice there. */
function _skillBonusDice(name) {
  let d = 0;
  try { if (typeof getUsefulItemForSkill === 'function' && getUsefulItemForSkill(name)) d += 1; } catch (e) {}
  if (Array.isArray(char.magicalItems) && char.magicalItems.some(mi => (mi.type === 'Marvellous Artefact' || mi.type === 'Wondrous Item') && Array.isArray(mi.blessings) && mi.blessings.includes(name))) d += 2;
  return d;
}
/** Weary is a state the rules impose, not a choice: Endurance at or below Load (Fatigue counts
    as Load) makes a hero Weary whether or not the toggle is set. */
function heroIsWeary() {
  if (char.weary) return true;
  const end = parseInt(char.endCur) || 0, load = (parseInt(char.load) || 0) + (parseInt(char.fatigue) || 0);
  return end <= load;
}
function _bestProf() {
  let best = { name: 'Brawling', rating: 0 };
  for (const p of (COMBAT_PROFS || [])) {
    const rt = parseInt((char.profs || {})[p]) || 0;
    if (rt >= best.rating) best = { name: p, rating: rt };
  }
  return best;
}
function battleLog(html) {
  const b = char.battle;
  b.log.unshift({ round: b.round, html });
  if (b.log.length > 40) b.log.length = 40;
}

/* ---- Setup ---- */
function rollWarParty() {
  const bandSize = (char.band.allies || []).filter(a => !a.outOfAction).length;
  const fav = bandSize >= 9 ? 'ill' : (bandSize >= 1 && bandSize <= 4 ? 'fav' : 'normal');
  const wp = mapWarParty(_rollFeatBand(fav));
  document.getElementById('b-scale').value = wp.scale;
  document.getElementById('b-might').value = wp.might;
  document.getElementById('b-resistance').value = wp.resistance;
  alert(`🎲 War Party: ${wp.scale} — Might ${wp.might}, Resistance ${wp.resistance}` + (fav !== 'normal' ? ` (rolled ${fav === 'fav' ? 'Favoured — small band' : 'Ill-Favoured — large band'})` : ''));
}
function rollArchfoe() {
  const v = Math.floor(Math.random() * 6) + 1;
  _setupArchfoe = v <= 3 ? 'none' : (v <= 5 ? 'lesser' : 'greater');
  renderBattle();
  alert(`🎲 Archfoe (Success ${v}): ${ARCHFOE_MODS[_setupArchfoe].label}`);
}
function rollBattlefield() {
  const r = _rollFeatBand('normal');
  const key = r.special === 'eye' ? 'eye' : (r.special === 'rune' ? 'rune' : r.value);
  document.getElementById('b-battlefield').innerHTML = `<strong>Battlefield:</strong> ${BATTLEFIELD_ASPECTS[key]}`;
}
async function beginBattle() {
  const b = char.battle;
  if (!(char.band.allies || []).length) return requireStep('A Battle is fought by your <strong>Band</strong>, and yours is still empty — there is no one to send into the Clash.<br><br>Roll up a Band first (Band tab, card <strong>1 · Allies</strong>).', 'band', 'band-allies-card', '⚠️ No Band yet');
  const might = parseInt(document.getElementById('b-might').value) || 0;
  const resistance = parseInt(document.getElementById('b-resistance').value) || 1;
  const af = ARCHFOE_MODS[_setupArchfoe] || ARCHFOE_MODS.none;
  b.scale = document.getElementById('b-scale').value || '';
  b.archfoe = _setupArchfoe;
  b.foeMight = might + af.dM;
  b.foeResistance = resistance + af.dR;
  b.foeResMax = b.foeResistance;
  b.objective = document.getElementById('b-objective').value || '';
  b.objectiveRes = OBJECTIVE_RES[_setupObjres] || 0;
  b.objectiveResMax = b.objectiveRes;
  b.advantages = []; b.complications = []; b.focusBonus = 0; b.inspired = false; b.fleeIll = false;
  b.leaderFocus = 'fight'; b.bandStance = 'balanced'; b.round = 1; b.log = []; b.active = true;
  // Get in Position — BATTLE roll
  const hs = _heroSkill('Battle');
  const r = bandRoll(hs.rating, hs.favoured ? 'fav' : 'normal', hs.tn, { weary: !!char.weary });
  if (r.outcome.startsWith('SUCCESS')) {
    b.advantages.push({ name: 'Upper Hand', persistent: r.feat.special === 'rune' });
    battleLog(`Get-in-Position BATTLE — <span class="result-tag tag-success">${r.outcome}</span> → ${r.feat.special === 'rune' ? 'persistent' : 'temporary'} Advantage <em>Upper Hand</em>`);
  } else {
    b.complications.push({ name: 'Caught Off Guard', persistent: r.feat.special === 'eye' });
    battleLog(`Get-in-Position BATTLE — <span class="result-tag tag-fail">${r.outcome}</span> → ${r.feat.special === 'eye' ? 'persistent' : 'temporary'} Complication <em>Caught Off Guard</em>`);
  }
  document.getElementById('b-clash-result').style.display = 'none';
  saveCharacter(); render();
}

/* ---- Clash loop ---- */
async function resolveLeaderFocus() {
  const b = char.battle;
  if (!b.active) return;
  const focus = b.leaderFocus;
  if (focus === 'duel') {
    if (b.archfoe === 'none') { alert('No Archfoe present to duel. Choose another Focus, or add an Archfoe.'); return; }
    // The Duel used to be an alert telling you to go and fight a foe that did not exist anywhere.
    // Put the Archfoe in the Encounter, carrying the Harry bonus you were told to bank.
    const harried = parseInt(b.harried) || 0;
    const go = await showModal({
      title: '⚔️ Duel the Archfoe',
      message: 'A Duel is three close-quarters rounds against the Archfoe, fought with the ordinary combat rules — then you come back here and make the Clash roll.' +
        (harried ? `<br><br>You have harried them: <strong>+${harried}d</strong> on your attacks in this duel.` : '<br><br>You have not harried them — spend Clash successes on <strong>☠ Harry Archfoe</strong> first to gain dice here.') +
        '<br><br>Put the Archfoe into the Encounter?',
      buttons: [
        { label: '⚔️ Add the Archfoe and go', value: 'go' },
        { label: 'Just note it — I will run it myself', value: 'note' },
        { label: 'Cancel', value: null, cancel: true }
      ]
    });
    if (!go) return;
    if (go === 'go') _battleAddArchfoeToEncounter(harried);
    battleLog(`Leader Focus: <strong>Duel</strong> — three close-quarters rounds vs the Archfoe${harried ? ` (+${harried}d from Harrying)` : ''}.`);
    saveCharacter(); renderBattle(); return;
  }
  let r, msg;
  if (focus === 'command') {
    const hs = _heroSkill('Battle');
    r = bandRoll(hs.rating, hs.favoured ? 'fav' : 'normal', hs.tn, { weary: !!char.weary });
    if (r.outcome.startsWith('SUCCESS')) { b.focusBonus = 1 + r.icons; msg = `Command (BATTLE) ${outcomeWords(r.outcome)}: +${b.focusBonus}d on the Clash roll`; }
    else { b.complications.push({ name: 'Chaos in the Ranks', persistent: false }); msg = `Command (BATTLE) ${outcomeWords(r.outcome)}: temporary Complication "Chaos in the Ranks"`; }
  } else if (focus === 'inspire') {
    const hs = _heroSkill('Enhearten');
    r = bandRoll(hs.rating, hs.favoured ? 'fav' : 'normal', hs.tn, { weary: !!char.weary });
    if (r.outcome.startsWith('SUCCESS')) { b.inspired = true; msg = `Inspire (ENHEARTEN) ${outcomeWords(r.outcome)}: the Band is Inspired until your next failed Clash` + (r.icons ? ' (and ignores Weary/Miserable)' : ''); }
    else { adj('shadow', 1); msg = `Inspire (ENHEARTEN) ${outcomeWords(r.outcome)}: +1 Shadow`; }
  } else if (focus === 'fight') {
    const p = _bestProf();
    const tn = (parseInt(char.strTN) || 14) + (b.foeMight || 0);
    r = bandRoll(p.rating, 'normal', tn, { weary: !!char.weary });
    if (r.outcome.startsWith('SUCCESS')) {
      b.foeResistance = Math.max(0, b.foeResistance - 1);
      if (r.icons > 0) b.focusBonus = (b.focusBonus || 0) + 1;
      msg = `Fight (${p.name} vs TN ${tn}) ${outcomeWords(r.outcome)}: −1 foe Resistance` + (r.icons ? ', +1d Clash (opening)' : '');
    } else {
      const loss = r.dice.reduce((s, d) => s + d.value, 0) || (Math.floor(Math.random() * 6) + 1 + Math.floor(Math.random() * 6) + 1);
      char.endCur = Math.max(0, (parseInt(char.endCur) || 0) - loss);
      msg = `Fight (${p.name}) ${outcomeWords(r.outcome)}: you lose ${loss} Endurance`;
    }
  }
  battleLog(`Leader Focus — ${msg}`);
  saveCharacter(); render();
  checkBattleEnd();
}

function clashRoll() {
  const b = char.battle;
  if (!b.active) return;
  const fleeing = b.bandStance === 'fleeing';
  const clashKey = fleeing ? 'manoeuvre' : 'war';
  let dice = (char.band.dispositions[clashKey]) || 0;
  dice += b.focusBonus || 0;
  dice += (b.advantages || []).length;
  dice -= (b.complications || []).length;
  if (b.archfoe !== 'none') dice -= 1;
  dice += _bandBonusDice('clash', clashKey);  // Ally Gift (+1) + Hope spend (+1/+2 focus)
  dice = Math.max(0, dice);
  let fav = 'normal';
  if (b.bandStance === 'aggressive') fav = 'ill';
  else if (b.bandStance === 'guarded') fav = 'fav';
  if (fleeing && b.fleeIll) fav = 'ill';
  const tn = bandTN() + (b.foeMight || 0);

  // Aggressive: immediately −1 Resistance regardless of outcome
  let aggrNote = '';
  if (b.bandStance === 'aggressive') { b.foeResistance = Math.max(0, b.foeResistance - 1); aggrNote = '<br><small style="color:var(--gold)">Aggressive: −1 Resistance immediately.</small>'; }

  const r = bandRoll(dice, fav, tn, { kinglyWard: _giftKinglyWard('clash') });
  _renderBandRoll(r, tn, `Clash · ${fleeing ? 'Manoeuvre' : 'War'} ${dice}d`, 'b-clash-dice', 'b-clash-total', 'b-clash-summary', 'b-clash-result');
  const sumEl = document.getElementById('b-clash-summary');
  let tail = aggrNote + _resolveBandExtras(r, 'clash', clashKey);
  const iconsIgnored = (b.bandStance === 'guarded') || fleeing;

  if (r.outcome.startsWith('SUCCESS')) {
    const successes = 1 + (iconsIgnored ? 0 : r.icons);
    b._pendingSpend = successes;
    tail += `<br><strong>${successes} success${successes > 1 ? 'es' : ''}</strong> to spend below.`;
    battleLog(`Clash (${fleeing ? 'Manoeuvre' : 'War'} ${dice}d) — <span class="result-tag tag-success">${outcomeWords(r.outcome)}</span>, ${successes} success(es)`);
  } else {
    b.advantages = [];  // RAW: a failed Clash loses all Advantages (persistent included)
    b._pendingSpend = 0;
    b.inspired = false;
    // Endurance Test for the Band (Rally vs Readiness TN + Might)
    const etn = bandTN() + (b.foeMight || 0);
    const er = bandRoll(parseInt(char.band.dispositions.rally) || 0, 'normal', etn);
    let etTail;
    if (er.outcome.startsWith('SUCCESS')) etTail = '<br><small style="color:var(--success-text)">Endurance Test passed — no injury.</small>';
    else etTail = '<br><small>Endurance Test failed:</small>' + _applyInjuryFromFail(er);
    tail += `<br><span class="result-tag tag-fail">Clash failed</span> — all Advantages lost.${etTail}`;
    battleLog(`Clash (${fleeing ? 'Manoeuvre' : 'War'} ${dice}d) — <span class="result-tag tag-fail">${outcomeWords(r.outcome)}</span>; Endurance Test ${er.outcome.startsWith('SUCCESS') ? 'passed' : 'failed'}`);
    if (r.feat.special === 'eye') tail += rollClashSetback();
  }
  b.focusBonus = 0;
  b.round = (b.round || 1) + 1;
  saveCharacter();
  renderBattle();
  document.getElementById('b-clash-result').style.display = 'block';
  document.getElementById('b-clash-summary').innerHTML += tail;
  renderClashSpend();
  checkBattleEnd();
}

function rollClashSetback() {
  const b = char.battle;
  const r = rollFeatOnce();
  const key = r.special === 'eye' ? 'eye' : (r.special === 'rune' ? 'rune' : r.value);
  const sb = CLASH_SETBACK[key];
  let auto = '';
  if (sb.auto) {
    if (sb.auto.foeRes) { b.foeResistance += sb.auto.foeRes; auto += ` [foe Resistance +${sb.auto.foeRes}]`; }
    if (sb.auto.shadow) { adj('shadow', sb.auto.shadow); auto += ` [+${sb.auto.shadow} Shadow]`; }
    if (sb.auto.complication) { b.complications.push({ name: sb.auto.complication, persistent: true }); auto += ` [+complication "${sb.auto.complication}"]`; }
  }
  battleLog(`👁 Clash Setback — <strong>${sb.name}</strong>: ${sb.effect}${auto}`);
  return `<br><span class="result-tag" style="background:var(--btn-alert-bg);color:white">👁 Setback: ${escapeHtml(sb.name)}</span><br><small>${sb.effect}${auto}</small>`;
}

function renderClashSpend() {
  const b = char.battle;
  const el = document.getElementById('b-spend');
  if (!el) return;
  const n = b._pendingSpend || 0;
  if (n <= 0) { el.innerHTML = ''; return; }
  const hasObj = b.objectiveResMax > 0 && b.objectiveRes > 0;
  const hasPersistComp = (b.complications || []).some(c => c.persistent);
  el.innerHTML = `<div style="background:var(--gold-soft);border:1px solid var(--gold);border-radius:var(--r-sm);padding:8px">
    <strong style="font-size:var(--fs-xs)">Spend successes: ${n}</strong>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:6px">
      <button class="add-row-btn" style="font-size:var(--fs-xs)" onclick="clashSpend('foe')">⚔ −1 Foe Resistance</button>
      ${hasObj ? `<button class="add-row-btn" style="font-size:var(--fs-xs)" onclick="clashSpend('obj')">🎯 −1 Objective</button>` : ''}
      <button class="add-row-btn" style="font-size:var(--fs-xs);background:var(--btn-secondary-bg)" onclick="clashSpend('adv')">▲ Gain Advantage</button>
      ${n >= 2 ? `<button class="add-row-btn" style="font-size:var(--fs-xs);background:var(--btn-secondary-bg)" onclick="clashSpend('advP')">▲⚓ Persistent (2)</button>` : ''}
      ${hasPersistComp ? `<button class="add-row-btn" style="font-size:var(--fs-xs);background:var(--btn-secondary-bg)" onclick="clashSpend('comp')">✓ Remove Complication</button>` : ''}
      ${b.archfoe !== 'none' ? `<button class="add-row-btn" style="font-size:var(--fs-xs);background:var(--btn-secondary-bg)" onclick="clashSpend('harry')">☠ Harry Archfoe (+1d duel${(parseInt(b.harried) || 0) ? ` · banked +${b.harried}d` : ''})</button>` : ''}
    </div>
  </div>`;
}
function clashSpend(type) {
  const b = char.battle;
  if ((b._pendingSpend || 0) <= 0) {
    alertStyled('Nothing left to spend. Successes to spend come from a <strong>Clash roll</strong> — make one first, then choose what to spend them on.', '⚠️ No successes pending');
    return;
  }
  let cost = 1, log = '';
  if (type === 'foe') { b.foeResistance = Math.max(0, b.foeResistance - 1); log = '−1 Foe Resistance'; }
  else if (type === 'obj') { b.objectiveRes = Math.max(0, b.objectiveRes - 1); log = '−1 Objective Resistance'; }
  else if (type === 'adv') { b.advantages.push({ name: 'Advantage', persistent: false }); log = 'gained temporary Advantage'; }
  else if (type === 'advP') { if ((b._pendingSpend || 0) < 2) return; cost = 2; b.advantages.push({ name: 'Advantage', persistent: true }); log = 'gained persistent Advantage'; }
  else if (type === 'comp') { const i = b.complications.findIndex(c => c.persistent); if (i >= 0) b.complications.splice(i, 1); log = 'removed a persistent Complication'; }
  else if (type === 'harry') {
    // This wrote a log line and stored nothing, so the bonus the app told you to bank did not
    // exist. It is now a real pool the Duel spends.
    b.harried = (parseInt(b.harried) || 0) + 1;
    log = `Harry the Archfoe — the duel bonus is now +${b.harried}d`;
  }
  b._pendingSpend -= cost;
  battleLog(`Spend: ${log}`);
  saveCharacter();
  renderBattle();
  document.getElementById('b-clash-result').style.display = 'block';
  renderClashSpend();
  checkBattleEnd();
}

/** Build the Archfoe as an Encounter foe so the Duel has something to fight, and carry the
    Harry bonus into the hero's attack dice (`enc().adv.extra`). */
function _battleAddArchfoeToEncounter(harried) {
  const b = char.battle || {};
  const greater = b.archfoe === 'greater';
  if (typeof ensureEncounterActive === 'function') ensureEncounterActive();
  const e = enc();
  const id = (typeof _newFoeId === 'function') ? _newFoeId() : ('af' + Date.now());
  e.foes.push({
    id, name: greater ? 'Greater Archfoe' : 'Lesser Archfoe', source: 'Moria Battle',
    endMax: greater ? 40 : 28, endCur: greater ? 40 : 28,
    might: greater ? 2 : 1, hateMax: greater ? 8 : 5, hateCur: greater ? 8 : 5,
    parry: greater ? 6 : 4, armour: greater ? 4 : 3, atkTN: 16,
    attacks: [{ name: greater ? 'Great blade' : 'Heavy blade', dice: greater ? 4 : 3, dmg: greater ? 9 : 7, inj: greater ? 18 : 16, special: '' }],
    fell: 'An Archfoe of the war party — stat line is an editable starting point; set it to the foe your story needs.',
    engaged: true, wounded: false, slain: false, _edit: true
  });
  if (harried > 0) e.adv.extra = (parseInt(e.adv.extra) || 0) + harried;
  if (typeof encDeriveEngaged === 'function') encDeriveEngaged();
  saveCharacter();
  if (typeof renderEncounter === 'function') renderEncounter();
  if (typeof _playFightable === 'function' && _playFightable()) _goTab('play'); else document.querySelector('.tab[data-tab=combat]')?.click();
  alert(`The Archfoe is in the Encounter${typeof _playFightable === 'function' && _playFightable() ? ' on ▶ Play' : ' on the Combat tab'}${harried > 0 ? `, and your Harrying is applied as +${harried}d on your attack rolls` : ''}.\n\nIts stat line is a starting point — tap ✎ on the foe to set it to the adversary your story calls for. Fight three rounds, then go on with the Clash.`);
}

/* ---- Advantages / Complications / End ---- */
async function addAdvantagePrompt() {
  const name = await promptStyled('Name this Advantage (e.g. High Ground):', '');
  if (!name) return;
  const persist = await confirmStyled('Make this Advantage <strong>persistent</strong> (lasts until a failed Clash)?<br><br>Cancel = temporary (next Clash only).', undefined, {yes:'Make it persistent', no:'Just this clash'});
  char.battle.advantages.push({ name, persistent: !!persist });
  battleLog(`+ Advantage "${name}"${persist ? ' (persistent)' : ''}`);
  saveCharacter(); renderBattle();
}
async function addComplicationPrompt() {
  const name = await promptStyled('Name this Complication (e.g. Broken Ranks):', '');
  if (!name) return;
  const persist = await confirmStyled('Make this Complication <strong>persistent</strong> (lasts until removed with a success)?<br><br>Cancel = temporary (next Clash only).', undefined, {yes:'Make it persistent', no:'Just this clash'});
  char.battle.complications.push({ name, persistent: !!persist });
  battleLog(`+ Complication "${name}"${persist ? ' (persistent)' : ''}`);
  saveCharacter(); renderBattle();
}
function removeAdv(i) { char.battle.advantages.splice(i, 1); saveCharacter(); renderBattle(); }
function removeComp(i) { char.battle.complications.splice(i, 1); saveCharacter(); renderBattle(); }

function checkBattleEnd() {
  const b = char.battle;
  if (!b.active) return;
  if (b.foeResistance <= 0) {
    b.active = false;
    battleLog('🏆 <strong>VICTORY</strong> — the foe\'s Resistance is broken!');
    saveCharacter(); render();
    setTimeout(() => alert('🏆 VICTORY! The War Party is defeated. Survivors are slain or flee (ask the Telling table if unsure). Award milestone XP — "Survive a dangerous battle" (1 AP).'), 60);
  }
}
async function endBattle() {
  if (!await confirmStyled('End this battle? (Use for a successful flight, a surrender, or to abandon the tracker.)', undefined, {yes:'End the battle', no:'Keep fighting'})) return;
  char.battle.active = false;
  battleLog('Battle ended.');
  saveCharacter(); render();
}

function renderBattle() {
  if (window._playFightPlaced && typeof _playFightOn === 'function' && !_playFightOn() && typeof renderPlay === 'function') setTimeout(renderPlay, 0);
  if (!document.getElementById('panel-battle')) return;
  const b = char.battle;
  document.getElementById('battle-setup-card').style.display = b.active ? 'none' : 'block';
  document.getElementById('battle-active-card').style.display = b.active ? 'block' : 'none';
  // Setup segs (transient module vars)
  document.querySelectorAll('#b-archfoe-pick .seg-btn').forEach(x => { x.classList.toggle('active', x.dataset.archfoe === _setupArchfoe); x.onclick = () => { _setupArchfoe = x.dataset.archfoe; renderBattle(); }; });
  document.querySelectorAll('#b-objres-pick .seg-btn').forEach(x => { x.classList.toggle('active', (x.dataset.objres || '') === _setupObjres); x.onclick = () => { _setupObjres = x.dataset.objres || ''; renderBattle(); }; });
  if (b.active) {
    setText('b-foeres-v', b.foeResistance);
    setText('b-foemight-v', b.foeMight);
    setText('b-round', 'Round ' + b.round);
    const bb = document.getElementById('b-banners');
    if (bb && typeof battleBanners === 'function') bb.innerHTML = battleBanners(char.band && char.band.sharedCalling ? 'The ' + char.band.sharedCalling : 'Your Band', b.scale || 'The War Party', b.foeResistance, b.foeResMax || b.foeResistance);
    const oc = document.getElementById('b-obj-counter');
    if (b.objectiveResMax > 0) { oc.style.display = ''; setText('b-objres-v', b.objectiveRes); document.getElementById('b-obj-name').textContent = b.objective || 'objective'; }
    else oc.style.display = 'none';
    document.querySelectorAll('#b-focus-pick .seg-btn').forEach(x => { x.classList.toggle('active', x.dataset.focus === b.leaderFocus); x.onclick = () => { b.leaderFocus = x.dataset.focus; saveCharacter(); renderBattle(); }; });
    document.querySelectorAll('#b-stance-pick .seg-btn').forEach(x => { x.classList.toggle('active', x.dataset.stance === b.bandStance); x.onclick = () => { b.bandStance = x.dataset.stance; saveCharacter(); renderBattle(); }; });
    const bg = document.getElementById('b-gift-pick'); if (bg) bg.innerHTML = _giftOptionsHTML('clash');
    renderBattleChips();
    // `_pendingSpend` is saved on the character and survives a reload, but the panel that
    // spends it used to be injected only by clashRoll/clashSpend — so backgrounding the app
    // mid-round left successes you had rolled with no control to spend them.
    renderClashSpend();
  }
  renderBattleLog();
}
function renderBattleChips() {
  const b = char.battle, el = document.getElementById('b-chips');
  if (!el) return;
  const adv = (b.advantages || []).map((a, i) => `<span style="display:inline-block;background:var(--success-bg);color:var(--success-text);border-radius:var(--r-sm);padding:2px 8px;font-size:var(--fs-xs);margin:2px">▲ ${escapeHtml(a.name)}${a.persistent ? ' ⚓' : ''} <span onclick="removeAdv(${i})" style="cursor:pointer;font-weight:700">×</span></span>`).join('');
  const comp = (b.complications || []).map((c, i) => `<span style="display:inline-block;background:var(--error-bg);color:var(--error-text);border-radius:var(--r-sm);padding:2px 8px;font-size:var(--fs-xs);margin:2px">▼ ${escapeHtml(c.name)}${c.persistent ? ' ⚓' : ''} <span onclick="removeComp(${i})" style="cursor:pointer;font-weight:700">×</span></span>`).join('');
  const af = (b.archfoe && b.archfoe !== 'none') ? `<span style="display:inline-block;background:var(--btn-alert-bg);color:white;border-radius:var(--r-sm);padding:2px 8px;font-size:var(--fs-xs);margin:2px">☠ ${b.archfoe} Archfoe (−1d)</span>` : '';
  const insp = b.inspired ? `<span style="display:inline-block;background:var(--green-soft);color:white;border-radius:var(--r-sm);padding:2px 8px;font-size:var(--fs-xs);margin:2px">✨ Inspired</span>` : '';
  el.innerHTML = adv + comp + af + insp || '<span class="hint">No advantages or complications.</span>';
}
function renderBattleLog() {
  const el = document.getElementById('b-log');
  if (!el) return;
  const log = char.battle.log || [];
  el.innerHTML = log.length ? log.map(e => `<div style="padding:3px 0;border-bottom:1px solid var(--border)"><small style="color:var(--text-faint)">R${e.round}</small> ${e.html}</div>`).join('') : '<p class="hint">No clashes yet.</p>';
}

/* ================= MORIA FELLOWSHIP PHASE ================= */
// Duration-based recovery (Moria solo rules p.223). No Yule in Moria.
async function moriaFP(duration) {
  if (!isMoria()) return;
  const lines = [];
  // Hope
  if (duration === 'extended') { char.hopeCur = char.hopeMax; lines.push('Hope fully restored'); }
  else if (duration === 'brief') {
    // Through fpHopeRecovery so the Rangers' "only ½ Heart Hope recovered" applies here too
    // (Moria has no Yule, so the exemption never fires).
    const rec = fpHopeRecovery('ordinary');
    char.hopeCur = Math.min(parseInt(char.hopeMax) || 0, (parseInt(char.hopeCur) || 0) + rec.amount);
    lines.push(`+${rec.amount} Hope (${rec.halved ? 'half Heart — Rangers' : 'Heart'})`);
  }
  // Endurance — always fully restored
  char.endCur = parseInt(char.endMax) || 0; lines.push('Endurance fully restored');
  // Hero Wound
  if (char.wounded) {
    const dying = (parseInt(char.endCur) || 0) === 0;
    if (duration === 'extended' || (duration === 'brief' && !dying)) { char.wounded = false; char.injury = ''; char.injuryDays = 0; lines.push('Wound healed'); }
  }
  // Shadow removal (Brief/Extended) — player decides by impact (1-3)
  if (duration !== 'hurried' && (parseInt(char.shadow) || 0) > 0) {
    const n = await showModal({
      title: 'Spiritual Recovery',
      message: 'How much did your adventure hurt the Enemy? That is how much Shadow you shed.',
      buttons: [
        { label: '−1 · you interfered with the Shadow', value: 1 },
        { label: '−2 · you damaged the Enemy', value: 2 },
        { label: '−3 · you drew the Dark Lord’s attention', value: 3 },
        { label: 'None', value: 0, cancel: true }
      ]
    });
    if (n >= 1 && n <= 3) { const rem = Math.min(n, parseInt(char.shadow) || 0); adj('shadow', -rem); lines.push(`−${rem} Shadow`); }
  }
  // Band conditions
  let cleared = 0, giftsRecovered = 0;
  (char.band.allies || []).forEach(a => {
    if (a.giftWasted) { a.giftWasted = false; giftsRecovered++; }  // all durations recover wasted Gifts
    if (a.outOfAction) return;
    if (duration === 'extended') { if (a.injury) { a.injury = ''; cleared++; } if (a.fatigue) { a.fatigue = ''; cleared++; } }
    else {
      if (a.injury === 'fleeting' || a.injury === 'moderate') { a.injury = ''; cleared++; }
      if (duration === 'brief' && (a.fatigue === 'fatigued' || a.fatigue === 'faltering')) { a.fatigue = ''; cleared++; }
    }
  });
  if (cleared) lines.push(`Cleared ${cleared} ally condition(s)`);
  if (giftsRecovered) lines.push(`Recovered ${giftsRecovered} wasted Gift(s)`);
  const undertakings = duration === 'extended' ? 2 : (duration === 'brief' ? 1 : 0);
  // RAW: Eye Awareness resets to its starting value at the beginning of each Adventuring phase.
  // The core wizard got this in run 1; the Moria phases did not.
  try {
    if (typeof resetEyeAwarenessToStarting === 'function') { resetEyeAwarenessToStarting(); lines.push('Eye Awareness reset'); }
  } catch (e) {}
  if (typeof logTimeline === 'function') logTimeline('fp', `Moria Fellowship Phase (${duration}) completed.`);
  saveCharacter(); render();
  await alertStyled(`🌿 <strong>${duration.charAt(0).toUpperCase() + duration.slice(1)} Fellowship Phase</strong><br><br>${lines.join('<br>')}<br><br>Undertakings available: <strong>${undertakings}</strong>.<br><br>Now roll for a Fellowship Interruption, then perform undertakings.`, 'Fellowship Phase');
}

async function rollFPInterruption(duration) {
  if (!isMoria()) return;
  // Extended phases are more exposed → Ill-Favoured trigger roll.
  const trig = (duration === 'extended') ? _rollFeatBand('ill') : rollFeatOnce();
  if (trig.special === 'eye') {
    const ev = rollFeatOnce();
    const key = ev.special === 'eye' ? 'eye' : (ev.special === 'rune' ? 'rune' : ev.value);
    await alertStyled(`👁 <strong>Fellowship Interruption!</strong><br><br><strong>${FP_INTERRUPTIONS[key]}</strong><br><br>You must sacrifice <strong>one undertaking</strong> for the lost time. Play out the crisis as a scene if you wish.`, 'Interruption');
  } else {
    await alertStyled(`No interruption (Feat ${trig.label}). Your rest in Balin's camp is undisturbed.`, 'Fellowship Phase');
  }
}

function refreshFellowship() {
  char.fellowship = parseInt(char.fellowshipRating) || 0;
  saveCharacter(); render();
  alert(`🤝 Fellowship Points refreshed to ${char.fellowship} (a Fellowship Milestone — a meaningful moment shared with others).`);
}

async function recruitAllies() {
  if (!isMoria()) return;
  const cur = char.band.allies.length;
  let n;
  if (cur < 4) n = 4 - cur; else n = Math.max(1, parseInt(char.valour) || 1);
  if (!await confirmStyled(`Recruit Allies undertaking:<br><br>${cur < 4 ? `Your Band is below 4 — gain ${n} to reach 4.` : `Gain ${n} ally(ies) — one per Valour rank (Valour ${char.valour || 1}).`}<br><br>Proceed?`, undefined, {yes:'Recruit', no:'Not now'})) return;
  for (let i = 0; i < n; i++) char.band.allies.push(_rollUniqueAlly());
  saveCharacter(); render();
  alert(`Recruited ${n} new all${n === 1 ? 'y' : 'ies'}. Your Band now numbers ${char.band.allies.length}.`);
}

async function reclaimSafeHavenUndertaking() {
  if (!isMoria()) return;
  if (!await confirmStyled('Reclaim a Safe Haven (Extended phase, once/year, requires a secured strategic location):<br><br>The points between the existing haven and the new one become a <strong>Wild Land</strong>. You gain <strong>+3 SP and +3 AP</strong> (a milestone).<br><br>Establish the new Safe Haven?', undefined, {yes:'Reclaim it', no:'Not now'})) return;
  char.skillPts = (parseInt(char.skillPts) || 0) + 3;
  char.advPts = (parseInt(char.advPts) || 0) + 3;
  char.huntRegion = 'wild';  // the secured stretch is now a Wild Land (Hunt 16)
  saveCharacter(); render();
  alert('🏛️ New Safe Haven reclaimed! +3 SP, +3 AP. The secured region is now a Wild Land (Hunt Threshold 16). Update your Safe Haven name on the Character tab.');
}

/* ---------- Journey setup as three questions (round 4) ----------
   The option cards and chips drive the same inputs the setup always read (j-totalHexes,
   j-mounted, j-forcedMarch, j-season, j-region), so startJourney is unchanged. */
let _jExact = false;
const J_REGION_SAY = { Free: 'Safe lands — the road tends to go your way.', Border: 'Border lands — events lean in your favour.', Wild: 'The wild — neither kind nor cruel.', Shadow: 'Shadow lands — events turn against you.', Dark: 'Dark lands — the Enemy’s own; every event goes hard.' };
function jPickDist(v) {
  if (v === 'map') {
    if (typeof openMapPicker === 'function') openMapPicker();
    else showToast('The map has not loaded — reload the app while online.');
    return;
  }
  window._jPendingRoute = null;
  const inp = document.getElementById('j-totalHexes');
  if (v === 'exact') { _jExact = true; jSyncGuided(); if (inp) inp.focus(); return; }
  _jExact = false; if (inp) inp.value = v; jSyncGuided();
}
function jPickTravel(mode) { const m = document.getElementById('j-mounted'); if (m) m.checked = mode === 'mounted'; jSyncGuided(); }
function jToggleForced() { const f = document.getElementById('j-forcedMarch'); if (f) f.checked = !f.checked; jSyncGuided(); }
function jPickChip(selId, v) { const sel = document.getElementById(selId); if (!sel) return; sel.value = v; sel.dataset.picked = '1'; sel.dispatchEvent(new Event('change', { bubbles: true })); jSyncGuided(); }
function jSyncGuided() {
  const inp = document.getElementById('j-totalHexes'); if (!inp) return;
  const hex = String(inp.value || '');
  const onMap = !!(window._jPendingRoute && String(window._jPendingRoute.hexes) === hex);
  const preset = ['4', '9', '18'].includes(hex) && !_jExact && !onMap;
  document.querySelectorAll('#j-dist .opt-card').forEach(b => { const on = b.dataset.hex === 'map' ? onMap : b.dataset.hex === 'exact' ? (!onMap && !preset && (_jExact || !!hex)) : (preset && b.dataset.hex === hex); b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
  const ex = document.getElementById('j-exact'); if (ex) ex.hidden = onMap || preset || (!_jExact && !hex);
  const mc = document.querySelector('#j-dist [data-hex="map"]'); if (mc) mc.hidden = !!(typeof isMoria === 'function' && isMoria());
  if (typeof renderMapRouteNote === 'function') renderMapRouteNote();
  const mounted = !!(document.getElementById('j-mounted') || {}).checked, forced = !!(document.getElementById('j-forcedMarch') || {}).checked;
  document.querySelectorAll('#j-travel .opt-card').forEach(b => { const on = b.dataset.mode === 'forced' ? forced : (b.dataset.mode === 'mounted') === mounted; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
  const vr = document.getElementById('j-vigour-row'); if (vr) vr.hidden = !mounted;
  [['j-season', 'j-season-chips'], ['j-region', 'j-region-chips']].forEach(([sid, cid]) => {
    const v = (document.getElementById(sid) || {}).value;
    document.querySelectorAll('#' + cid + ' .chip').forEach(c => { c.classList.toggle('on', c.dataset.v === v); c.setAttribute('aria-pressed', String(c.dataset.v === v)); });
  });
  const say = document.getElementById('j-region-say'); if (say) say.textContent = J_REGION_SAY[(document.getElementById('j-region') || {}).value] || '';
}
document.addEventListener('DOMContentLoaded', () => { const i = document.getElementById('j-totalHexes'); if (i) i.addEventListener('input', () => { _jExact = true; jSyncGuided(); }); jSyncGuided(); });

// Moria abstract distance: (2 Success dice) × 4 miles, then ÷2 since each hex = 2 miles.
function rollMoriaDistance() {
  const d1 = Math.floor(Math.random() * 6) + 1;
  const d2 = Math.floor(Math.random() * 6) + 1;
  const miles = (d1 + d2) * 4;
  const hexes = Math.round(miles / 2);
  const el = document.getElementById('j-totalHexes');
  if (el) el.value = hexes;
  if (typeof jSyncGuided === 'function') { _jExact = true; jSyncGuided(); }
  alert(`🎲 Moria distance: (${d1} + ${d2}) × 4 = ${miles} miles → ${hexes} hexes (1 hex = 2 miles). Set as the journey's length.`);
}

/* ================= MORIA BAND OF ALLIES ================= */
function bandTN() { return 20 - (parseInt(char.band.readiness) || 0); }

function adjReadiness(d) {
  char.band.readiness = Math.max(0, Math.min(10, (parseInt(char.band.readiness) || 0) + d));
  saveCharacter(); renderBand();
}
function adjDisposition(key, d) {
  const cur = parseInt(char.band.dispositions[key]) || 0;
  char.band.dispositions[key] = Math.max(0, Math.min(6, cur + d));
  saveCharacter(); renderBand();
}
function setBurden(b) { char.band.burden = b; saveCharacter(); renderBand(); }

// Allies on the current mission. An empty roster means "the whole Band".
function missionAllies() {
  const all = char.band.allies || [];
  const roster = (char.mission && Array.isArray(char.mission.roster)) ? char.mission.roster : [];
  if (!roster.length) return all;
  const onMission = all.filter(a => roster.includes(a.id));
  return onMission.length ? onMission : all;  // safety: never return empty if the band exists
}

function bandWeary() {
  const allies = missionAllies();
  if (!allies.length) return false;
  const hit = allies.filter(a => a.outOfAction || INJURY_SERIOUS.includes(a.injury) || FATIGUE_SERIOUS.includes(a.fatigue)).length;
  return hit * 2 >= allies.length;  // half or more, rounding up
}

function _rollFeatBand(fav) {
  // Returns a single chosen feat roll honouring Favoured/Ill.
  let rolls = (fav === 'normal') ? [rollFeatOnce()] : [rollFeatOnce(), rollFeatOnce()];
  const score = r => r.special === 'rune' ? 100 : (r.special === 'eye' ? -100 : r.value);
  rolls.sort((a, b) => score(b) - score(a));
  return (fav === 'ill') ? rolls[rolls.length - 1] : rolls[0];
}

// Generic band roll honouring Band Weary (success 1-3 → 0). Returns {feat, dice[], icons, total, outcome}.
// opts: { weary, miserable } override the defaults (band-weary / shared char.miserable).
// Used for hero focus rolls in battle (pass char.weary) as well as Band disposition rolls.
function bandRoll(successDice, fav, tn, opts) {
  opts = opts || {};
  let feat = _rollFeatBand(fav);
  if (opts.kinglyWard && feat.special === 'eye') feat = _rollFeatBand(fav);  // Kingly Gift ward: re-roll one 👁
  const weary = (opts.weary !== undefined) ? opts.weary : bandWeary();
  const miserable = (opts.miserable !== undefined) ? opts.miserable : !!char.miserable;
  const dice = [];
  for (let i = 0; i < successDice; i++) {
    const v = Math.floor(Math.random() * 6) + 1;
    const wearied = weary && v <= 3;
    dice.push({ value: v, icon: v === 6, wearied });
  }
  const icons = dice.filter(d => d.icon).length;
  const sum = dice.reduce((s, d) => s + (d.wearied ? 0 : d.value), 0);
  const total = feat.special === 'rune' ? null : feat.value + sum;
  let outcome;
  if (feat.special === 'rune') outcome = 'SUCCESS (Rune)';
  else if (feat.special === 'eye' && miserable) outcome = 'FAIL (Eye, Miserable)';  // Eye only auto-fails when Miserable
  else outcome = (total >= tn) ? 'SUCCESS' : 'FAIL';
  return { feat, dice, icons, total, outcome, weary };
}

// Apply an injury to the least-injured living ally after a FAILED band roll, with shared-Shadow
// gain (Phase 3). Returns the HTML tail to append to a result summary. Shared by Endurance Tests
// and Clash failures.
function _applyInjuryFromFail(r) {
  const a = _pickLeastInjured();
  if (!a) return '<br><small style="color:var(--text-muted)">No living ally to take the hit.</small>';
  let extra = '', shadowGain = 0, shadowReason = '';
  if (r.feat.special === 'eye') {
    const sev = rollInjurySeverity();
    if (INJURY_ORDER.indexOf(sev) > INJURY_ORDER.indexOf(a.injury || '')) a.injury = sev;
    extra = `<br><strong style="color:var(--red)">👁 ${escapeHtml(a.name)} → Injury Severity: ${sev.toUpperCase()}</strong>`;
    if (sev === 'severe' || sev === 'grievous') { shadowGain = 1; shadowReason = `${escapeHtml(a.name)} ${sev}`; }
  } else {
    const res = _worsenInjury(a);
    if (res === 'dead') { extra = `<br><strong style="color:var(--red)">${escapeHtml(a.name)} is slain! (out of action)</strong>`; shadowGain = 2; shadowReason = `${escapeHtml(a.name)} lost`; }
    else { extra = `<br><strong style="color:var(--red-dark)">${escapeHtml(a.name)} suffers a ${res.toUpperCase()} injury</strong>`; if (res === 'severe' || res === 'grievous') { shadowGain = 1; shadowReason = `${escapeHtml(a.name)} ${res}`; } }
  }
  if (shadowGain > 0) extra += gainBandShadow(shadowGain, shadowReason); else saveCharacter();
  return extra;
}

function _renderBandRoll(r, tn, label, diceId, totalId, sumId, resultId) {
  document.getElementById(resultId).style.display = 'block';
  const dd = document.getElementById(diceId); dd.innerHTML = '';
  const fd = document.createElement('div');
  fd.className = 'feat-die' + (r.feat.special === 'eye' ? ' eye' : '') + (r.feat.special === 'rune' ? ' rune' : '');
  fd.textContent = r.feat.label; _labelFeatDie(fd, r.feat.special); dd.appendChild(fd);
  r.dice.forEach(d => {
    const e = document.createElement('div');
    e.className = 'success-die' + (d.icon ? ' icon' : '') + (d.wearied ? ' dim' : '');
    e.textContent = d.value; _labelSuccessDie(e, d.value, !!d.icon); dd.appendChild(e);
  });
  document.getElementById(totalId).textContent = r.feat.special === 'rune' ? '★' : (r.feat.special === 'eye' ? '✗' : r.total);
  let s = `<strong>${label}</strong> vs Readiness TN ${tn} — `;
  s += r.outcome.startsWith('SUCCESS') ? `<span class="result-tag tag-success">${outcomeWords(r.outcome)}</span>` : `<span class="result-tag tag-fail">${outcomeWords(r.outcome)}</span>`;
  if (r.icons > 0) s += ` <small>${r.icons} ✦</small>`;
  if (r.weary) s += `<br><small style="color:var(--warn-orange)">Band Weary: 1-3 counted as 0</small>`;
  document.getElementById(sumId).innerHTML = s;
}

/* What a Disposition roll means for the Band — the tag alone said only SUCCESS / FAIL. */
const DISP_MEANING = {
  expertise: ['Your allies\' skill sees it done.', 'Their skill is not enough this time.'],
  manoeuvre: ['The Band moves where it must, in good order.', 'The Band is slowed, seen or scattered.'],
  rally:     ['The Band holds together.', 'The Band falters.'],
  vigilance: ['The Band sees what is coming.', 'The Band is caught unaware.'],
  war:       ['The Band carries the fight.', 'The Band is beaten back.']
};
function rollDisposition(key) {
  const disp = DISPOSITIONS.find(d => d.key === key);
  const rating = parseInt(char.band.dispositions[key]) || 0;
  const bonus = _bandBonusDice('band', key);
  const r = bandRoll(rating + bonus, 'normal', bandTN(), { kinglyWard: _giftKinglyWard('band') });
  _renderBandRoll(r, bandTN(), disp.name + ' (Band' + (bonus ? ' +' + bonus + 'd' : '') + ')', 'band-roll-dice', 'band-roll-total', 'band-roll-summary', 'band-roll-result');
  document.getElementById('band-roll-summary').innerHTML += _resolveBandExtras(r, 'band', key);
  const dm = DISP_MEANING[key];
  if (dm) document.getElementById('band-roll-summary').innerHTML += `<br><strong>${dm[r.outcome.startsWith('SUCCESS') ? 0 : 1]}</strong>`;
  renderBand();
  return r;
}

function _selectedThreat() {
  const b = document.querySelector('#band-threat-pick .seg-btn.active');
  return b ? b.dataset.threat : 'bothersome';
}

/* ---- Ally Gifts (+1d, wasted on Eye) + Hope spend (+2d on Disposition Focus) ---- */
function _giftOptionsHTML(scope) {
  const curEl = document.getElementById(scope === 'clash' ? 'b-gift-pick' : 'band-gift-pick');
  const cur = curEl ? curEl.value : '';
  let html = '<option value="">No Ally Gift</option>';
  missionAllies().filter(a => !a.outOfAction).forEach(a => {
    if (!a.giftWasted) html += `<option value="${a.id}"${cur === a.id ? ' selected' : ''}>${escapeHtml(a.name)} — ${escapeHtml(a.gift)} (+1d)</option>`;
    if (a.kinglyGift) html += `<option value="${a.id}|kingly"${cur === a.id + '|kingly' ? ' selected' : ''}>${escapeHtml(a.name)} — 👑 ${escapeHtml(a.kinglyGift.name)} (+1d, ward)</option>`;
  });
  return html;
}
function _selectedGift(scope) {
  const el = document.getElementById(scope === 'clash' ? 'b-gift-pick' : 'band-gift-pick');
  if (!el || !el.value) return null;
  const [id, kind] = el.value.split('|');
  return { allyId: id, kingly: kind === 'kingly' };
}
function _selectedHope(scope) {
  const el = document.getElementById(scope === 'clash' ? 'b-hope-spend' : 'band-hope-spend');
  return !!(el && el.checked && (parseInt(char.hopeCur) || 0) > 0);
}
// Extra success dice from a selected Gift (+1) and a Hope spend (+1, or +2 on the Disposition Focus).
function _bandBonusDice(scope, dispKey) {
  let bonus = 0;
  if (_selectedGift(scope)) bonus += 1;
  if (_selectedHope(scope)) bonus += (dispKey && dispKey === char.band.dispositionFocus) ? 2 : 1;
  return bonus;
}
function _giftKinglyWard(scope) { const g = _selectedGift(scope); return !!(g && g.kingly); }
// Resolve a roll's Gift + Hope side-effects; returns HTML tail. Resets the pickers afterward.
function _resolveBandExtras(r, scope, dispKey) {
  let html = '';
  if (_selectedHope(scope)) {
    char.hopeCur = Math.max(0, (parseInt(char.hopeCur) || 0) - 1);
    const focus = dispKey && dispKey === char.band.dispositionFocus;
    html += `<br><span class="result-tag" style="background:var(--gold);color:white">✨ Hope spent (+${focus ? 2 : 1}d${focus ? ' · Disposition Focus' : ''})</span>`;
  }
  const gift = _selectedGift(scope);
  if (gift && gift.allyId) {
    const a = char.band.allies.find(x => x.id === gift.allyId);
    if (a) {
      if (gift.kingly) {
        html += `<br><small style="color:var(--gold)">👑 ${escapeHtml(possessive(a.name))} Kingly Gift aided the roll (+1d · re-rolls one 👁)</small>`;
      } else if (r.feat.special === 'eye') {
        a.giftWasted = true;
        html += `<br><span class="result-tag" style="background:var(--btn-warn-bg);color:white">⚠ ${escapeHtml(possessive(a.name))} Gift is wasted (👁) — recovers next Fellowship Phase</span>`;
      } else {
        html += `<br><small style="color:var(--gold)">${escapeHtml(possessive(a.name))} Gift aided the roll (+1d)</small>`;
      }
    }
  }
  // Reset pickers for the next roll
  const ge = document.getElementById(scope === 'clash' ? 'b-gift-pick' : 'band-gift-pick'); if (ge) ge.value = '';
  const he = document.getElementById(scope === 'clash' ? 'b-hope-spend' : 'band-hope-spend'); if (he) he.checked = false;
  saveCharacter();
  return html;
}

/* ---- Solo tools: Hero-or-Band, Desperate Stand ---- */
function rollHeroOrBand() {
  const v = Math.floor(Math.random() * 6) + 1;
  const who = (v % 2 === 1) ? 'the <strong>Band</strong> (odd)' : 'your <strong>Player-hero</strong> (even)';
  const el = document.getElementById('solo-tool-result');
  el.style.display = 'block';
  el.innerHTML = `🎲 Success die: <strong>${v}</strong> → the outcome affects ${who}.`;
}
async function desperateStand() {
  const living = missionAllies().filter(a => !a.outOfAction);
  if (!living.length) { await alertStyled('No living ally on the mission to make a Desperate Stand.', '🛡️ Desperate Stand'); return; }
  const buttons = living.map((a, i) => ({ label: `${escapeHtml(a.name)} — ${escapeHtml(a.gift)}`, value: i, style: 'background:var(--card-bg);color:var(--ink);border:1px solid var(--border);border-radius:var(--r-sm);padding:8px 10px;font-size:var(--fs-xs);cursor:pointer;text-align:left' }));
  buttons.push({ label: 'Cancel', value: -1, style: 'background:var(--btn-secondary-bg);color:white;border:none;border-radius:var(--r-sm);padding:10px;font-size:var(--fs-md);cursor:pointer' });
  const pick = await showModal({ title: '🛡️ Desperate Stand', message: 'After a failed roll, an Ally steps into the fray. The re-roll is <strong>Favoured & Inspired</strong>; if an 👁 appears the Ally survives, otherwise they are lost — the ultimate sacrifice. Choose who steps forward:', buttons });
  if (pick === -1 || pick == null) return;
  const a = living[pick];
  // Favoured: roll 2 Feat dice. Survival if EITHER shows an Eye.
  const f1 = rollFeatOnce(), f2 = rollFeatOnce();
  const survives = (f1.special === 'eye' || f2.special === 'eye');
  const el = document.getElementById('solo-tool-result');
  el.style.display = 'block';
  let msg = `🛡️ <strong>${escapeHtml(a.name)}</strong> makes a Desperate Stand (Favoured & Inspired — re-roll your failed action with +2 success dice on a Hope spend).<br>Feat dice: ${f1.label} · ${f2.label}.<br>`;
  if (survives) {
    msg += `<strong style="color:var(--success-text)">An 👁 appears — ${escapeHtml(a.name)} survives the sacrifice!</strong>`;
  } else {
    a.outOfAction = true;
    msg += `<strong style="color:var(--red)">${escapeHtml(a.name)} is lost, having given everything for their fellows.</strong>` + gainBandShadow(2, `${escapeHtml(a.name)} lost (Desperate Stand)`);
  }
  el.innerHTML = msg;
  saveCharacter(); renderBand();
}

function _pickLeastInjured() {
  const living = missionAllies().filter(a => !a.outOfAction);
  if (!living.length) return null;
  const rank = a => a.injury ? (INJURY_ORDER.indexOf(a.injury) + 1) : 0;  // uninjured = 0
  return living.slice().sort((a, b) => rank(a) - rank(b))[0];
}
function _pickLeastFatigued() {
  const living = missionAllies().filter(a => !a.outOfAction);
  if (!living.length) return null;
  const rank = a => a.fatigue ? (FATIGUE_ORDER.indexOf(a.fatigue) + 1) : 0;
  return living.slice().sort((a, b) => rank(a) - rank(b))[0];
}
function _worsenInjury(a) {
  if (!a.injury) { a.injury = 'fleeting'; return 'fleeting'; }
  if (a.injury === 'grievous' || a.injury === 'lingering') { a.outOfAction = true; return 'dead'; }
  const i = INJURY_ORDER.indexOf(a.injury);
  a.injury = INJURY_ORDER[Math.min(i + 1, INJURY_ORDER.length - 1)];
  return a.injury;
}
function _worsenFatigue(a) {
  if (!a.fatigue) { a.fatigue = 'fatigued'; return 'fatigued'; }
  const i = FATIGUE_ORDER.indexOf(a.fatigue);
  a.fatigue = FATIGUE_ORDER[Math.min(i + 1, FATIGUE_ORDER.length - 1)];
  return a.fatigue;
}

async function enduranceTest(threatArg) {
  if (!(char.band.allies || []).length) return requireStep('An Endurance Test asks which ally takes the hit — your Band is still empty.<br><br>Roll up a Band on the <strong>Band</strong> tab first (card <strong>1 · Allies</strong>).', 'band', 'band-allies-card', '⚠️ No Band yet');
  const threat = (threatArg && DAMAGE_THREAT[threatArg] !== undefined) ? threatArg : _selectedThreat();
  const tn = bandTN() + (DAMAGE_THREAT[threat] || 0);
  const r = bandRoll(parseInt(char.band.dispositions.rally) || 0, 'normal', tn);
  let extra = '';
  if (!r.outcome.startsWith('SUCCESS')) extra = _applyInjuryFromFail(r);
  else extra = '<br><small style="color:var(--success-text)">The Band emerges unscathed.</small>';
  _renderBandRoll(r, tn, 'Endurance Test (Rally, ' + threat + ')', 'band-test-dice', 'band-test-total', 'band-test-summary', 'band-test-result');
  document.getElementById('band-test-summary').innerHTML += extra;
  renderBand();
  return { r, tn, extra };
}

async function fatigueTest(ptsArg) {
  if (!(char.band.allies || []).length) return requireStep('A Fatigue Test wears down an ally — your Band is still empty.<br><br>Roll up a Band on the <strong>Band</strong> tab first (card <strong>1 · Allies</strong>).', 'band', 'band-allies-card', '⚠️ No Band yet');
  const pts = (typeof ptsArg === 'number') ? ptsArg : (parseInt(document.getElementById('band-fatigue-pts').value) || 0);
  const tn = bandTN() + pts;
  const burdenMod = BURDEN_DICE[char.band.burden] || 0;  // +1 light, −1 heavy, −2 over
  let rating = (parseInt(char.band.dispositions.rally) || 0) + Math.max(0, burdenMod);
  // For Light burden, the +1d aids; for Heavy/Over the loss is modelled as Ill-Favoured-ish: subtract dice.
  if (burdenMod < 0) rating = Math.max(0, rating + burdenMod);
  const r = bandRoll(rating, 'normal', tn);
  let extra = '';
  if (!r.outcome.startsWith('SUCCESS')) {
    const a = _pickLeastFatigued();
    if (a) {
      if (r.feat.special === 'eye') {
        // Eye fail: jump to faltering if unaffected, else +2 ranks.
        if (!a.fatigue) a.fatigue = 'faltering';
        else { const i = FATIGUE_ORDER.indexOf(a.fatigue); a.fatigue = FATIGUE_ORDER[Math.min(i + 2, FATIGUE_ORDER.length - 1)]; }
        extra = `<br><strong style="color:var(--red)">👁 ${escapeHtml(a.name)} → ${a.fatigue.toUpperCase()}</strong>`;
      } else {
        const res = _worsenFatigue(a);
        extra = `<br><strong style="color:var(--red-dark)">${escapeHtml(a.name)} is now ${res.toUpperCase()}</strong>`;
      }
      saveCharacter();
    }
  } else {
    extra = '<br><small style="color:var(--success-text)">The Band bears the hardship.</small>';
  }
  const burdenNote = burdenMod ? ` · Burden ${char.band.burden} ${burdenMod > 0 ? '+' : ''}${burdenMod}d` : '';
  _renderBandRoll(r, tn, 'Fatigue Test (Rally +' + pts + burdenNote + ')', 'band-test-dice', 'band-test-total', 'band-test-summary', 'band-test-result');
  document.getElementById('band-test-summary').innerHTML += extra;
  renderBand();
  return { r, tn, extra };
}

/* ---- Ally generation & roster ---- */
function _featKey() { const r = rollFeatOnce(); return r.special === 'eye' ? 'eye' : (r.special === 'rune' ? 'rune' : r.value); }
function _succBand() { const v = Math.floor(Math.random() * 6) + 1; return v <= 2 ? 'lo' : (v <= 4 ? 'mid' : 'hi'); }
function _succCol() { const v = Math.floor(Math.random() * 6) + 1; return v <= 2 ? 0 : (v <= 4 ? 1 : 2); }

function _rollAlly() {
  const g = ALLY_GIFTS[_succBand()][_featKey()];
  const q = ALLY_QUIRKS[_succBand()][_featKey()];
  const name = ALLY_NAMES[_featKey()][_succCol()];
  return { id: 'a' + Date.now() + Math.floor(Math.random() * 1000), name, gift: g.n, giftDesc: g.d, quirk: q, hardened: false, injury: '', fatigue: '', outOfAction: false, kinglyGift: null, giftWasted: false };
}
function generateAlly() {
  char.band.allies.push(_rollUniqueAlly());
  saveCharacter(); renderBand();
}
function addStartingBand() {
  // _rollAlly draws a name at random, so a starting Band of six routinely arrived with the
  // same dwarf in it twice. Re-roll a clashing name a few times before giving up and
  // disambiguating, so the roster stays readable.
  while (char.band.allies.length < 6) char.band.allies.push(_rollUniqueAlly());
  saveCharacter(); renderBand();
}

/** An ally whose name isn't already in the Band. */
function _rollUniqueAlly() {
  const taken = new Set((char.band.allies || []).map(a => String(a.name || '').toLowerCase()));
  let a = null;
  for (let i = 0; i < 12; i++) {
    a = _rollAlly();
    if (!taken.has(String(a.name || '').toLowerCase())) return a;
  }
  // Every name in the table is spoken for — tell them apart rather than shipping twins.
  let n = 2;
  const base = String(a.name || 'Ally');
  while (taken.has((base + ' the ' + _ordinalWord(n)).toLowerCase())) n++;
  a.name = base + ' the ' + _ordinalWord(n);
  return a;
}
function _ordinalWord(n) {
  return ['', '', 'Younger', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth'][n] || ('#' + n);
}
async function removeAlly(id) {
  if (!await confirmStyled('Remove this ally from the Band?', undefined, {yes:'Remove ally', no:'Keep ally'})) return;
  char.band.allies = char.band.allies.filter(a => a.id !== id);
  saveCharacter(); renderBand();
}
function setAllyField(id, field, val) {
  const a = char.band.allies.find(x => x.id === id); if (!a) return;
  if (field === 'outOfAction') a.outOfAction = val;
  else if (field === 'hardened') a.hardened = val;
  else a[field] = val;
  saveCharacter(); renderBand();
}

// Mission roster: toggle whether an ally is on the current mission. An empty roster means
// "the whole Band"; the first toggle materialises the full list so the change is explicit.
function setAllyOnMission(id, on) {
  let roster = (char.mission.roster && char.mission.roster.length) ? char.mission.roster.slice() : char.band.allies.map(a => a.id);
  if (on) { if (!roster.includes(id)) roster.push(id); }
  else { roster = roster.filter(x => x !== id); }
  // If everyone is back on the mission, collapse to the "whole Band" default (empty).
  const allIds = char.band.allies.map(a => a.id);
  char.mission.roster = (roster.length === allIds.length && allIds.every(i => roster.includes(i))) ? [] : roster;
  saveCharacter(); render();
}

// Kingly Gift — give a Hardened ally a Famous Weapon/Armour as a second Gift (Moria solo p.224).
async function giveKinglyGift(id) {
  const a = char.band.allies.find(x => x.id === id); if (!a) return;
  const famous = (char.magicalItems || []).filter(mi => mi.type === 'Famous Weapon' || mi.type === 'Famous Armour');
  if (!famous.length) { await alertStyled('No Famous Weapons or Armour in your Magical Treasure (Gear tab) to give. Recover one first, then grant it here.', '👑 Kingly Gift'); return; }
  const buttons = famous.map((mi, i) => ({ label: `${mi.type === 'Famous Armour' ? '🛡️' : '⚔️'} ${mi.name}`, value: i, style: 'background:var(--card-bg);color:var(--ink);border:1px solid var(--border);border-radius:var(--r-sm);padding:8px 10px;font-size:var(--fs-xs);cursor:pointer;text-align:left' }));
  buttons.push({ label: 'Cancel', value: -1, style: 'background:var(--btn-secondary-bg);color:white;border:none;border-radius:var(--r-sm);padding:10px;font-size:var(--fs-md);cursor:pointer' });
  const pick = await showModal({ title: '👑 Kingly Gift', message: `Grant a Famous item to <strong>${escapeHtml(a.name)}</strong>. It becomes a second Gift (a (1d) bonus when it aids the Band) and wards against the Shadow — re-roll one 👁 on the Feat die when the gift aids a roll.<br><br>Note: a Famous item carried by an ally also raises your starting Eye Awareness on a mission (+1 each).`, buttons });
  if (pick === -1 || pick == null) return;
  a.kinglyGift = { name: famous[pick].name };
  saveCharacter(); renderBand();
  await alertStyled(`👑 ${escapeHtml(famous[pick].name)} granted to <strong>${escapeHtml(a.name)}</strong> as a Kingly Gift.`, 'Kingly Gift');
}
async function removeKinglyGift(id) {
  const a = char.band.allies.find(x => x.id === id); if (!a) return;
  if (!await confirmStyled('Reclaim this Kingly Gift from the ally?', undefined, {yes:'Take it back', no:'Leave it'})) return;
  a.kinglyGift = null;
  saveCharacter(); renderBand();
}

/* ---- Mission planning ---- */
function rollMissionObjective() {
  const fk = _featKey();
  const col = (Math.floor(Math.random() * 6) + 1) <= 3 ? 0 : 1;
  const obj = MISSION_OBJECTIVES[fk][col];
  char.mission.objective = obj;
  const el = document.getElementById('m-objective'); if (el) el.value = obj;
  saveCharacter(); renderMission();
  alert('🎲 Mission Objective: ' + obj);
}

// Compute Dispositions/Burden/Readiness/EA/Hunt from current (un-applied) mission selections.
function _compPreview() {
  const m = char.mission;
  const base = { expertise: 2, manoeuvre: 2, rally: 2, vigilance: 2, war: 2 };
  const apply = mods => { for (const k in mods) if (k !== 'burden') base[k] = (base[k] || 0) + mods[k]; };
  apply(COMP_SIZE[m.size] || {});
  apply(COMP_WARGEAR[m.warGear] || {});
  apply(COMP_SPEC[m.specialisation] || {});
  for (const k in base) base[k] = Math.max(0, base[k]);
  const burden = (COMP_WARGEAR[m.warGear] || {}).burden || 'medium';
  const onMission = missionAllies();  // roster, or whole Band if none selected
  const hardened = onMission.filter(a => a.hardened).length;
  const bandSize = onMission.length;
  const readiness = 4 + readinessBonus(hardened, bandSize);
  const ea = calcStartingEyeAwareness() + (EA_SIZE_MOD[m.size] || 0);
  const huntMod = (HUNT_MOD_PREV[m.prevOutcome] || 0) + (HUNT_MOD_FP[m.fpDuration] || 0);
  const hunt = HUNT_THRESHOLDS.dark + huntMod;  // Moria = Dark Land (12)
  return { base, burden, readiness, ea, huntMod, hunt, hardened, bandSize };
}

function renderMissionPreview() {
  const el = document.getElementById('m-preview'); if (!el) return;
  const p = _compPreview(), d = p.base;
  const total = (char.band.allies || []).length;
  const rosterNote = (char.mission.roster && char.mission.roster.length) ? `${p.bandSize} of ${total}` : `whole Band (${total})`;
  el.innerHTML = `<strong>Preview →</strong> Roster: <strong>${rosterNote}</strong> on mission<br>`
    + `Dispositions: Exp ${d.expertise} · Man ${d.manoeuvre} · Rally ${d.rally} · Vig ${d.vigilance} · War ${d.war}<br>`
    + `Burden: <strong>${p.burden}</strong> · Readiness: <strong>${p.readiness}</strong> (TN ${20 - p.readiness}) <small>[${p.hardened}/${p.bandSize} hardened]</small><br>`
    // The base was hard-coded to 14 while HUNT_THRESHOLDS.dark is 12, so the preview read
    // "Hunt Threshold: 12 (14 +0)" — a number next to its own contradiction.
    + `Eye Awareness: <strong>${p.ea}</strong> · Hunt Threshold: <strong>${p.hunt}</strong> <small>(${HUNT_THRESHOLDS[char.huntRegion] || HUNT_THRESHOLDS.dark} ${p.huntMod >= 0 ? '+' : ''}${p.huntMod})</small>`;
}

/** The mission as it stands, in words — shown on the Band tab, the hero sheet and ▶ Play once planned. */
const MISSION_LABEL = {
  size: { small: 'Small party', medium: 'Medium party', large: 'Large party' },
  warGear: { travellingLight: 'travelling light', prepared: 'prepared', gearedForWar: 'geared for war' },
  spec: { sentinels: 'Sentinels', stalwarts: 'Stalwarts', experts: 'Experts' },
  outcome: { astounding: 'Astounding success', qualified: 'Qualified success', minorFail: 'Minor failure', devastating: 'Devastating failure' }
};
function missionActive() { return typeof isMoria === 'function' && isMoria() && !!(char.mission && char.mission.active); }
function missionParty() {
  const m = char.mission || {};
  return [MISSION_LABEL.size[m.size] || 'Medium party', MISSION_LABEL.warGear[m.warGear] || 'prepared', MISSION_LABEL.spec[m.specialisation]].filter(Boolean).join(', ');
}
function missionSummaryHtml() {
  if (!missionActive()) return '';
  const m = char.mission, b = char.band || {};
  const on = missionAllies().filter(a => !a.outOfAction).length;
  const hunt = typeof huntThreshold === 'function' ? huntThreshold(char) : (HUNT_THRESHOLDS.dark + (parseInt(char.huntMod) || 0));
  return `<div class="mission-now" id="mission-now">
    <div class="mn-head"><small>Mission under way</small><strong>${m.objective ? escapeHtml(m.objective) : 'No objective set yet'}</strong></div>
    <div class="mn-row">${escapeHtml(missionParty())} · ${on} ${on === 1 ? 'dwarf' : 'dwarves'} on the mission</div>
    <div class="mn-row">Readiness ${parseInt(b.readiness) || 0} (TN ${typeof bandTN === 'function' ? bandTN() : 20 - (parseInt(b.readiness) || 0)}) · Burden ${escapeHtml(b.burden || 'medium')} · Eye ${parseInt(char.eyeAwareness) || 0} of ${hunt}</div>
  </div>`;
}
async function endMission() {
  if (!missionActive()) return;
  const keys = Object.keys(MISSION_LABEL.outcome);
  const pick = await showModal({
    title: 'End the mission',
    message: `How did it go${char.mission.objective ? ` — <em>${escapeHtml(char.mission.objective)}</em>` : ''}? The outcome sets the Hunt Threshold for your next mission.`,
    buttons: keys.map(k => ({ label: MISSION_LABEL.outcome[k] + ` (Hunt ${HUNT_MOD_PREV[k] >= 0 ? '+' : ''}${HUNT_MOD_PREV[k]})`, value: k }))
      .concat([{ label: 'Not yet', value: null, cancel: true, style: 'background:var(--btn-secondary-bg);color:white;border:none;border-radius:var(--r-sm);padding:10px;font-size:var(--fs-md);cursor:pointer' }])
  });
  if (!pick || !MISSION_LABEL.outcome[pick]) return;
  const m = char.mission;
  m.lastObjective = m.objective || ''; m.lastOutcome = pick;
  m.prevOutcome = pick; m.active = false; m.objective = '';
  if (typeof logTimeline === 'function') logTimeline('mission', `Mission ended — ${MISSION_LABEL.outcome[pick]}${m.lastObjective ? ': ' + m.lastObjective : ''}`);
  if (typeof journalAuto === 'function') journalAuto('advancement', 'mission', `Mission ended — ${MISSION_LABEL.outcome[pick]}`);
  saveCharacter(); render();
  showToast(`Mission ended — ${MISSION_LABEL.outcome[pick]}. The next plan starts from it.`);
}
function applyMissionSetup(quiet) {
  const p = _compPreview();
  char.band.dispositions = { ...p.base };
  char.band.burden = p.burden;
  char.band.readiness = p.readiness;
  char.eyeAwareness = p.ea;
  char.huntRegion = 'dark';
  char.huntMod = p.huntMod;
  char.mission.active = true;
  saveCharacter(); render();
  if (quiet) return p;
  alert(`🗺️ Mission setup applied.\n\nReadiness ${p.readiness} (TN ${20 - p.readiness}) · Burden ${p.burden}\nDispositions — Exp ${p.base.expertise}, Man ${p.base.manoeuvre}, Rally ${p.base.rally}, Vig ${p.base.vigilance}, War ${p.base.war}\nEye Awareness ${p.ea} · Hunt Threshold ${p.hunt}`);
}

function renderMission() {
  if (!document.getElementById('panel-band')) return;
  const m = char.mission;
  const obj = document.getElementById('m-objective');
  if (obj && document.activeElement !== obj) obj.value = m.objective || '';
  const bindSeg = (sel, field, attr) => {
    document.querySelectorAll(sel + ' .seg-btn').forEach(b => {
      b.classList.toggle('active', (b.dataset[attr] || '') === (m[field] || ''));
      b.onclick = () => { m[field] = b.dataset[attr] || ''; saveCharacter(); renderMission(); };
    });
  };
  bindSeg('#m-size-pick', 'size', 'size');
  bindSeg('#m-wargear-pick', 'warGear', 'wargear');
  bindSeg('#m-spec-pick', 'specialisation', 'spec');
  bindSeg('#m-prev-pick', 'prevOutcome', 'prev');
  bindSeg('#m-fp-pick', 'fpDuration', 'fp');
  renderMissionPreview();
  const cur = document.getElementById('m-current');
  if (cur) cur.innerHTML = missionActive() ? missionSummaryHtml() + '<button type="button" class="btn btn-secondary" style="width:100%;margin:6px 0 10px" onclick="endMission()">End the mission…</button><p class="hint" style="text-align:left;margin:0 0 8px">To change the plan, adjust the choices below and apply them again.</p>' : '';
  const ap = document.getElementById('m-apply-btn');
  if (ap) ap.textContent = missionActive() ? '✅ Re-plan with these choices' : '✅ Apply Mission Setup';
}

/* Round 8: each Band step says, while folded, where it stands — and ticks when it is done. */
function renderBandStatus() {
  const b = char.band || {}, m = char.mission || {};
  const allies = (b.allies || []), hurt = allies.filter(a => a.injury || a.outOfAction).length;
  const dispSum = Object.values(b.dispositions || {}).reduce((t, v) => t + (parseInt(v) || 0), 0);
  const cap = x => String(x || '').replace(/^./, c => c.toUpperCase());
  const rows = [
    ['Allies', 'i-users', allies.length ? `${allies.length} ${allies.length === 1 ? 'ally' : 'allies'}${hurt ? ` · ${hurt} hurt` : ''}` : 'none yet', allies.length > 0],
    ['Mission Planning', 'i-map', m.active ? (m.objective ? String(m.objective).slice(0, 40) : 'set') : 'not set', !!m.active],
    ['Band of Allies', 'i-flag', `Readiness ${parseInt(b.readiness) || 0} · TN ${bandTN()}`, false],
    ['Dispositions', 'i-scales', b.dispositionFocus ? `Focus: ${cap(b.dispositionFocus)}` : (dispSum ? `${dispSum} points` : 'not set'), dispSum > 0],
    ['Tests', 'i-dice', allies.length ? 'ready' : 'needs allies', false],
    ['Solo Tools', 'i-tools', '', false],
    ['Fellowship Phase (Moria)', 'i-hearth', 'after a mission', false]
  ];
  document.querySelectorAll('#panel-band .card > h3.card-title').forEach(h => {
    const txt = h.textContent.replace(/\s+/g, ' ');
    const bare = txt.replace(/^\s*\d+\s*·\s*/, '');
    const r = rows.find(([n]) => bare.startsWith(n)); if (!r) return;
    const all = [...h.querySelectorAll('.card-status')];
    let st = all.shift(); all.forEach(x => x.remove());
    if (!st) st = document.createElement('span');
    st.className = 'card-status' + (st.classList.contains('done') ? ' done' : '');
    if (st.parentNode !== h || h.lastElementChild !== st) h.appendChild(st);
    const numbered = !!h.querySelector('.step-med') || /^\s*\d/.test(txt);
    st.innerHTML = `${numbered ? '' : `<svg class="ic cs-ic" aria-hidden="true"><use href="#${r[1]}"/></svg>`}${r[2] ? `<span class="cs-t">${escapeHtml(r[2])}</span>` : ''}${r[3] ? '<svg class="ic cs-done" aria-label="done"><use href="#i-check"/></svg>' : ''}`;
    st.classList.toggle('done', !!r[3]);
  });
}
function renderBand() {
  const panel = document.getElementById('panel-band');
  if (!panel) return;
  renderMission();
  try { renderBandStatus(); } catch (e) {}
  setText('band-readiness-v', char.band.readiness);
  setText('band-tn-v', bandTN());
  // Burden seg
  document.querySelectorAll('#band-burden-pick .seg-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.burden === char.band.burden);
    b.onclick = () => setBurden(b.dataset.burden);
  });
  // Threat seg (local UI only)
  document.querySelectorAll('#band-threat-pick .seg-btn').forEach(b => {
    b.onclick = () => { document.querySelectorAll('#band-threat-pick .seg-btn').forEach(x => x.classList.remove('active')); b.classList.add('active'); };
  });
  const weary = bandWeary();
  const wp = document.getElementById('band-weary-pill'); if (wp) wp.style.display = weary ? 'inline-block' : 'none';
  // Disposition Focus note + gift dropdown
  const focusNote = document.getElementById('band-focus-note');
  if (focusNote) {
    const f = char.band.dispositionFocus;
    focusNote.innerHTML = f ? `Disposition Focus: <strong>${(DISPOSITIONS.find(d => d.key === f) || {}).name || f}</strong> (Band Inspired — Hope spend = +2d).` : '';
  }
  const giftSel = document.getElementById('band-gift-pick');
  if (giftSel) giftSel.innerHTML = _giftOptionsHTML('band');
  // Dispositions
  const dc = document.getElementById('band-dispositions');
  if (dc) {
    dc.innerHTML = DISPOSITIONS.map(d => {
      const rating = parseInt(char.band.dispositions[d.key]) || 0;
      const isFocus = char.band.dispositionFocus === d.key;
      return `<div class="disp-row" style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border)">
        ${typeof DISP_GLYPH !== 'undefined' && DISP_GLYPH[d.key] ? `<svg class="ic disp-ic" aria-hidden="true"><use href="#${DISP_GLYPH[d.key]}"/></svg>` : ''}
        <div style="flex:1">
          <strong>${d.name}</strong>${isFocus ? ' <span style="color:var(--gold)">★</span>' : ''} <span style="color:var(--text-muted);font-size:var(--fs-xs)">${d.sub}</span>
        </div>
        <button class="counter-buttons-btn" onclick="adjDisposition('${d.key}',-1)" style="width:26px;height:26px;border:1px solid var(--red);background:var(--pure-white);color:var(--red);border-radius:var(--r-sm);font-weight:700;cursor:pointer">−</button>
        <span style="min-width:18px;text-align:center;font-weight:700;font-size:var(--fs-md)">${rating}</span>
        <button class="counter-buttons-btn" onclick="adjDisposition('${d.key}',1)" style="width:26px;height:26px;border:1px solid var(--red);background:var(--pure-white);color:var(--red);border-radius:var(--r-sm);font-weight:700;cursor:pointer">+</button>
        <button class="add-row-btn" onclick="rollDisposition('${d.key}')" style="padding:6px 10px;font-size:var(--fs-xs)">🎲</button>
      </div>`;
    }).join('');
  }
  // Allies
  const ac = document.getElementById('band-allies');
  const cnt = document.getElementById('band-ally-count');
  if (cnt) cnt.textContent = `(${char.band.allies.length})`;
  if (ac) {
    if (!char.band.allies.length) {
      ac.innerHTML = emptyState('No allies yet. Tap “Roll 6 Starting Allies” to begin your Band.', 'users', { label: 'Roll 6 Starting Allies', fn: 'addStartingBand()' });
    } else {
      const injOpts = ['', ...INJURY_ORDER, 'lingering'];
      const fatOpts = ['', ...FATIGUE_ORDER];
      const roster = char.mission.roster || [];
      ac.innerHTML = char.band.allies.map(a => {
        const serious = a.outOfAction || INJURY_SERIOUS.includes(a.injury) || FATIGUE_SERIOUS.includes(a.fatigue);
        const border = a.outOfAction ? 'var(--btn-alert-bg)' : (serious ? 'var(--warn-orange)' : 'var(--border)');
        const injSel = injOpts.map(o => `<option value="${o}"${o === a.injury ? ' selected' : ''}>${o ? o : 'no injury'}</option>`).join('');
        const fatSel = fatOpts.map(o => `<option value="${o}"${o === a.fatigue ? ' selected' : ''}>${o ? o : 'no fatigue'}</option>`).join('');
        const onMission = !roster.length || roster.includes(a.id);
        const kg = a.kinglyGift;
        const kgLine = kg
          ? `<div style="font-size:var(--fs-xs);margin-top:2px;background:var(--gold-soft);border-radius:var(--r-sm);padding:3px 6px"><strong style="color:var(--gold)">👑 Kingly Gift:</strong> ${escapeHtml(kg.name)} <span style="color:var(--text-muted)">— 2nd Gift (+1d) &amp; ward: re-roll one 👁 when it aids a roll</span> <span onclick="removeKinglyGift('${a.id}')" style="cursor:pointer;color:var(--red);font-weight:700;float:right">×</span></div>`
          : '';
        const kgBtn = (a.hardened && !kg) ? `<button onclick="giveKinglyGift('${a.id}')" style="font-size:var(--fs-xs);background:var(--gold-soft);border:1px solid var(--gold);color:var(--ink);border-radius:var(--r-sm);padding:3px 8px;cursor:pointer">👑 Kingly Gift</button>` : '';
        const sil = typeof cultureSilhouette === 'function' ? cultureSilhouette(a.hardened ? 'Dwarves of Nogrod & Belegost' : "Dwarves of Durin's Folk").replace('class="silhouette"', 'class="silhouette ally-sil"') : '';
        return `<div class="ally-card" style="border:1.5px solid ${border};border-radius:var(--r-sm);padding:8px;margin-bottom:8px;${a.outOfAction ? 'opacity:0.6' : ''}${!onMission ? ';opacity:0.5' : ''}">${sil}
          <div style="display:flex;align-items:center;gap:6px">
            <input value="${escapeHtml(a.name)}" onchange="setAllyField('${a.id}','name',this.value)" style="flex:1;font-weight:700;border:none;background:transparent;color:var(--ink);font-size:var(--fs-md)">
            ${a.hardened ? '<span style="background:var(--gold);color:white;font-size:var(--fs-xs);font-weight:700;padding:1px 6px;border-radius:var(--r-sm)">HARDENED</span>' : ''}
            <button onclick="removeAlly('${a.id}')" style="background:none;border:none;color:var(--red);font-size:var(--fs-md);cursor:pointer">×</button>
          </div>
          <div style="font-size:var(--fs-xs);margin-top:2px"><strong style="color:var(--gold)">Gift:</strong> ${escapeHtml(a.gift)} <span style="color:var(--text-muted)">— ${escapeHtml(a.giftDesc || '')}</span>${a.giftWasted ? ' <span style="background:var(--btn-warn-bg);color:white;font-size:var(--fs-xs);font-weight:700;padding:1px 5px;border-radius:var(--r-sm);cursor:pointer" onclick="setAllyField(\'' + a.id + '\',\'giftWasted\',false)">WASTED ✕</span>' : ''}</div>
          <div style="font-size:var(--fs-xs)"><strong style="color:var(--red-dark)">Quirk:</strong> <span style="color:var(--text-muted)">${escapeHtml(a.quirk)}</span></div>
          ${kgLine}
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;align-items:center">
            <select onchange="setAllyField('${a.id}','injury',this.value)" style="font-size:var(--fs-xs);padding:3px 4px">${injSel}</select>
            <select onchange="setAllyField('${a.id}','fatigue',this.value)" style="font-size:var(--fs-xs);padding:3px 4px">${fatSel}</select>
            <label style="font-size:var(--fs-xs);display:flex;align-items:center;gap:3px"><input type="checkbox"${onMission ? ' checked' : ''} onchange="setAllyOnMission('${a.id}',this.checked)" style="width:auto">On mission</label>
            <label style="font-size:var(--fs-xs);display:flex;align-items:center;gap:3px"><input type="checkbox"${a.hardened ? ' checked' : ''} onchange="setAllyField('${a.id}','hardened',this.checked)" style="width:auto">Hardened</label>
            <label style="font-size:var(--fs-xs);display:flex;align-items:center;gap:3px"><input type="checkbox"${a.outOfAction ? ' checked' : ''} onchange="setAllyField('${a.id}','outOfAction',this.checked)" style="width:auto">Out of action</label>
            ${kgBtn}
          </div>
        </div>`;
      }).join('');
    }
  }
}

/** The Journey Event a Feat die picks (Core Rules; Strider Mode splits 4–10 differently). Shared by
    the hero's own journey and the table journey (src/11-table.js). */
function journeyEventFor(r, solo) {
  let event;
  const f = r.featValue;
  if (r.featSpecial === 'eye') {
    event = { key: 'terrible', name: 'Terrible Misfortune 👁', fatigue: 3, effect: 'If the skill roll fails: target is <strong>Wounded</strong>' };
  } else if (r.featSpecial === 'rune') {
    event = { key: 'joyful', name: 'Joyful Sight ᚱ', fatigue: 0, effect: 'If the skill roll succeeds: every hero recovers <strong>+1 Hope</strong>' };
  } else if (f === 1) {
    event = { key: 'despair', name: 'Despair', fatigue: 2, effect: 'If the skill roll fails: <strong>every hero present</strong> gains +1 Shadow (Dread)' };
  } else if (f >= 2 && f <= 3) {
    event = { key: 'ill', name: 'Ill Choices', fatigue: 2, effect: 'If the skill roll fails: <strong>target</strong> gains +1 Shadow (Dread)' };
  } else if (solo ? (f >= 4 && f <= 7) : (f >= 4 && f <= 9)) {
    event = { key: 'mishap', name: 'Mishap', fatigue: 2, effect: 'If the skill roll fails: +1 day to journey length, target gains +1 additional Fatigue' };
  } else if (solo && f >= 8 && f <= 9) {
    event = { key: 'shortcut', name: 'Short Cut', fatigue: 1, effect: 'If the skill roll succeeds: −1 day to journey' };
  } else if (solo && f === 10) {
    event = { key: 'chance', name: 'Chance-meeting', fatigue: 1, effect: 'If the skill roll succeeds: no Fatigue, favourable encounter' };
  } else if (!solo && f === 10) {
    event = { key: 'shortcut', name: 'Short Cut / Chance-meeting', fatigue: 1, effect: 'If the skill roll succeeds: −1 day to journey OR a favourable encounter — your choice' };
  } else {
    event = { key: 'unknown', name: 'Event ('+f+')', fatigue: 1, effect: 'GM adjudicates' };
  }
  return event;
}

/* ---------- Journey events, told plainly ----------
   An event used to be one run-on string: name, Feat die, land, roll, Fatigue, the rule text,
   the sub-table entry, its die, its skill, the chamber, and "▶ Roll X" — all in one paragraph,
   on Play and on the Journey log alike. Events now carry their parts (`e.ev`, `e.res`) and both
   surfaces draw them through ONE renderer, so they read the same everywhere (GOTCHA 24). */
function _eventStakes(effectHtml, solo) {
  let t = String(effectHtml || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  if (solo) t = t.replace(/\btarget is\b/g, 'you are').replace(/\btarget gains\b/g, 'you gain')
                 .replace(/\bevery hero present gains\b/g, 'you gain').replace(/\bevery hero (recovers|regains)\b/g, 'you $1')
                 .replace(/\beveryone regains\b/g, 'you regain').replace(/\byou (recovers|regains)\b/g, (m, v) => 'you ' + v.slice(0, -1));
  const out = { fail: '', ok: '' };
  t.split(/(?=If (?:the (?:skill )?roll|it) (?:fails|succeeds):)|(?=Either way)/).forEach(part => {
    const m = part.match(/^If (?:the (?:skill )?roll|it) (fails|succeeds):\s*(.*)$/);
    if (!m) return;
    // "gain +2 Shadow" / "you gain +1 Shadow" → "+2 Shadow": the label already says who.
    const txt = m[2].replace(/\.\s*$/, '').replace(/^(?:you |target )?gains?\s+(?=[+−-]?\d)/i, '').trim();
    if (m[1] === 'fails') out.fail = txt; else out.ok = txt;
  });
  return out;
}
function _sentence(s) { s = String(s || '').trim(); return s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/[.\s]*$/, '.') : ''; }
/** One Journey Event as a small card: what it is, what you see, what is at stake, what to roll. */
function journeyEventCard(e) {
  const v = e && e.ev;
  if (!v) return `<div class="jev-legacy">${e && e.text || ''}</div>`;
  const chips = [];
  if (v.noteworthy) chips.push('<span class="jev-chip warn">Noteworthy encounter — play it out as a scene</span>');
  else if (v.skill) chips.push(`<span class="jev-chip">Roll ${escapeHtml(v.skill)}${v.hard ? ' (−1d, rough ground)' : ''}</span>`);
  if (v.fatigue) chips.push(`<span class="jev-chip">+${v.fatigue} Travel Fatigue</span>`);
  const st = v.stakes || {};
  return `<div class="jev${v.peril ? ' peril' : ''}">
    <div class="jev-name">${v.peril ? '<span class="jev-tag">Perilous area</span>' : ''}${escapeHtml(v.name)}</div>
    ${v.detail ? `<div class="jev-what">${escapeHtml(_sentence(v.detail))}</div>` : ''}
    ${chips.length ? `<div class="jev-chips">${chips.join('')}</div>` : ''}
    ${v.noteworthy ? '<div class="jev-scene">No single roll decides this. Meet it as a scene: fight, talk, or overcome it — choose below.</div>'
      : (st.fail || st.ok) ? `<ul class="jev-stakes">${st.ok ? `<li class="ok"><b>If it goes well</b><span>${escapeHtml(_sentence(st.ok))}</span></li>` : ''}${st.fail ? `<li class="bad"><b>If it fails</b><span>${escapeHtml(_sentence(st.fail))}</span></li>` : ''}</ul>` : ''}
    ${v.chamber ? `<div class="jev-find"><b>Further on</b> ${escapeHtml(chamberLine(v.chamber))}</div>` : ''}
  </div>`;
}
/** A Moria chamber as one sentence: "You come to an ancient storeroom, goblin-gnawed. It will test your Battle." */
function chamberLine(c) {
  const lc = w => String(w || '').replace(/^\w/, m => m.toLowerCase());
  const appr = /^Elven$/.test(c.appr) ? c.appr : lc(c.appr);
  const art = /^[aeiou]/i.test(appr) ? 'an' : 'a';
  const chal = String(c.chal || '');
  const test = /^None/i.test(chal) ? `Nothing here tests you${/\((.*)\)/.test(chal) ? ' — ' + lc(chal.match(/\((.*)\)/)[1]) : ''}.`
    : /^Combat$/i.test(chal) ? 'It means a fight.'
    : /hope/i.test(chal) ? 'Something here lifts your heart — a token of hope.'
    : `It will test your ${chal}.`;
  // The whole room type in lower case: "guard Post or Armoury" read like a typo.
  return `You come to ${art} ${appr} ${String(c.type || '').toLowerCase()}, ${lc(c.cond)}. ${test}`;
}
/** The same event as one plain line, for the Chronicle. */
function journeyEventPlain(e) {
  const v = e && e.ev; if (!v) return _playPlainText(e && e.text || '');
  const bits = [v.name + (v.detail ? ' — ' + String(v.detail).replace(/\.$/, '') : '') + '.'];
  if (v.chamber) bits.push(chamberLine(v.chamber));
  if (v.skill && !v.noteworthy) bits.push(`Roll ${v.skill}.`);
  if (v.fatigue) bits.push(`+${v.fatigue} Travel Fatigue.`);
  return (v.peril ? 'Perilous area: ' : '') + bits.join(' ');
}
/** "+1 Shadow (0 → 1), and the Eye stirs (👁 2)" → "+1 Shadow, and the Eye stirs". The running
    totals are on the vitals bar already; in a sentence they are noise. */
function _tidyApplied(s) {
  return String(s || '').replace(/<[^>]+>/g, '').replace(/\s*\((?:[^()]*→[^()]*|👁\s*\d+)\)/g, '').replace(/\s+/g, ' ').trim();
}
/** A roll's result as the dice pill the feeds share: "(Craft roll 8 vs 15 — failure.)" */
function _pillText(skill, total, tn, ok) {
  return `(${skill} roll ${total === null || total === undefined ? 'Rune' : total} vs ${tn} — ${ok ? 'success' : 'failure'}.)`;
}
/** A Marching Test as one line: the pill, then how far and how long. */
function journeyMarchLine(e) {
  const v = e.march;
  const pill = v.total === undefined ? '<span class="jev-chip">Guide’s roll</span>' : rollPillHtml('Travel', v.total, v.tn, v.ok);
  return `<div class="jev-res">${pill} <span>${v.ok ? 'Good going' : 'Hard going'}: ${v.hexes} stretch${v.hexes === 1 ? '' : 'es'} in ${v.days} day${v.days === 1 ? '' : 's'}.${v.forced ? ` Forced march: +${v.days} Travel Fatigue.` : ''}</span></div>`;
}
/** Arriving, as one line: the arrival roll and the Fatigue that stays with you. */
function journeyArriveLine(e) {
  const v = e.arr;
  return `<div class="jev-res"><strong>Arrived at ${escapeHtml(v.place)}.</strong> ${rollPillHtml('Travel', v.roll.total, v.roll.tn, v.roll.ok)} <span>${v.left ? `${v.left} Fatigue stays with you (now ${v.after}) — a Prolonged Rest in a Safe Haven clears 1 at a time.` : 'You shake off the road’s weariness.'}</span></div>`;
}
/** Any journey log entry, drawn by the renderer that fits it. */
function journeyLogEntry(e) {
  return e.ev ? journeyEventCard(e) : e.res ? journeyRollLine(e) : e.march ? journeyMarchLine(e) : e.arr ? journeyArriveLine(e) : `<div class="jev-legacy">${e.text}</div>`;
}
/** One event roll's result as a line: the pill, then what came of it. */
function journeyRollLine(e) {
  const v = e && e.res; if (!v) return `<div class="jev-legacy">${e && e.text || ''}</div>`;
  const what = v.applied ? _sentence(_tidyApplied(v.applied)) : (v.ok ? '' : (v.noPenalty ? 'You simply miss the benefit; nothing worse happens.' : ''));
  return `<div class="jev-res">${_rollPills(_pillText(v.skill, v.total, v.tn, v.ok))} <span>${v.ok ? 'You manage it.' : 'It goes against you.'} ${escapeHtml(what)}</span></div>`;
}

function resolveJourneyEvent(isPeril) {
  const j = char.journey;
  if (isPeril) {
    if ((parseInt(j.perilEventsRemaining) || 0) <= 0) { alert('No peril events remaining.'); return; }
  } else {
    if (j.nextEventHex === null || j.nextEventHex === undefined) return requireStep('No event is due yet — events are scheduled by marching.<br><br>Tap <strong>🚶 Marching Test</strong> in the Journey in Progress card first.', 'journey', 'journey-active-card', '⚠️ Nothing to resolve');
    if (j.currentHex < j.nextEventHex) { alert('Not yet at the event hex.'); return; }
  }

  const solo = isSolo();
  const moria = isMoria();

  // Step 1: target role (CORE ONLY). In solo play the lone hero has no roles — the
  // skill to roll comes straight from the Event Detail sub-table, so we skip this roll.
  let targetRole = null, targetSkill = null, roleKey = null;
  if (!solo) {
    const tgt = Math.floor(Math.random() * 6) + 1;
    if (tgt <= 2) { targetRole = 'Scout'; targetSkill = 'Explore'; roleKey = 'scout'; }
    else if (tgt <= 4) { targetRole = 'Look-out'; targetSkill = 'Awareness'; roleKey = 'lookout'; }
    else { targetRole = 'Hunter'; targetSkill = 'Hunting'; roleKey = 'hunter'; }
  }

  // Step 2: event Feat die, region-modified. With a map route the land is the hex the event
  // strikes in, so the danger rises as the road goes deeper (journeyRegionNow, src/10-map.js).
  const region = (!moria && typeof journeyRegionNow === 'function') ? journeyRegionNow(j, isPeril ? j.currentHex : (j.nextEventHex || j.currentHex)) : j.region;
  let featFav = 'normal';
  if (moria) {
    // Moria is a Dark Land → Ill-Favoured, unless a foothold makes this leg a Border region.
    featFav = (j.region === 'Border') ? 'normal' : 'ill';
  } else if (region === 'Free' || region === 'Border') featFav = 'fav';
  else if (region === 'Shadow' || region === 'Dark') featFav = 'ill';
  // The EVENT feat die is the table's own die, not a roll the hero made — an Eye here selects
  // "Terrible Misfortune", it is not the player drawing the Eye's attention.
  _suspendInlineEye(true);
  const r = _doInlineRoll(0, featFav, null);
  _suspendInlineEye(false);

  // Ponder Storied & Figured Maps undertaking: +1 to Feat result on Journey Events (Core Rules p.121).
  // Eye → 1 (Despair); 10 → still 10 (cap); Rune stays Rune.
  let ponderApplied = false;
  if (char.activeFPBonuses && char.activeFPBonuses.ponderMaps && r.featSpecial !== 'rune') {
    if (r.featSpecial === 'eye') {
      r.featValue = 1;
      r.featSpecial = null;
      r.featLabel = '👁→1';
    } else if (r.featValue < 10) {
      r.featValue += 1;
      r.featLabel = '+1→' + r.featValue;
    }
    ponderApplied = true;
  }

  // Step 3: map Feat → event.
  let event;
  const f = r.featValue;
  if (moria) {
    // Moria solo journey events table (👁 Deadly Dark / 1-2 Long Dark / 3-5 Watchful Eyes /
    // 6-9 Branching Stairs / 10 Right Way / ᚱ Dread & Wonder).
    event = mapMoriaEvent(r);
  } else {
    event = journeyEventFor(r, solo);
  }

  // Solo: roll the Event Detail sub-table to envision the specific event.
  const detailTable = moria ? MORIA_EVENT_DETAILS : SOLO_EVENT_DETAILS;
  let detailLine = '', detailRec = null, chamberRec = null;
  if (solo && detailTable[event.key]) {
    const die = Math.floor(Math.random() * 6) + 1;
    const detail = detailTable[event.key][die - 1];
    detailRec = detail;
    // Override targetSkill if the sub-table specifies a different one
    if (detail.skill && detail.skill !== 'Noteworthy') {
      targetSkill = detail.skill;
    }
    const noteworthyTag = detail.outcome === 'Noteworthy Encounter'
      ? `<br><span style="background:var(--btn-alert-bg);color:white;padding:1px 6px;border-radius:var(--r-sm);font-size:var(--fs-xs);font-weight:700">⭐ NOTEWORTHY ENCOUNTER</span> resolve as an extended scene (multiple rolls, possibly combat / council / endeavour). Award XP as a milestone afterwards.`
      : `<br><small style="color:var(--text-muted)">Sub-event roll: ${die} · Skill: ${detail.skill || targetSkill}</small>`;
    detailLine = `<br><em>${escapeHtml(detail.event)}</em> — <small>${escapeHtml(detail.outcome)}</small>${noteworthyTag}`;
  }
  // Branching Stairs (Moria): always roll the Random Chamber Generator.
  if (moria && event.key === 'branchingStairs') {
    const c = genChamber();
    chamberRec = c;
    detailLine += `<br><span style="color:var(--gold)">⛏️ Chamber: <strong>${c.appr} ${c.type}</strong> — ${c.cond} · Challenge: ${c.chal}</span>`;
  }

  j.travelFatigue += event.fatigue;

  const terrainHint = j.hardTerrainHexes > 0 ? ' (hard terrain hex: −1d)' : '';
  let playerHint, rollClause;
  if (solo) {
    // Strider Mode: the skill comes from the Event Detail table. No roles.
    if (targetSkill) {
      playerHint = `<br><strong style="color:var(--red-dark)">▶ Roll ${targetSkill}${terrainHint}.</strong>`;
      rollClause = `Roll: ${targetSkill}.`;
    } else {
      playerHint = '';  // Noteworthy Encounter — the badge already explains; no single skill roll
      rollClause = '';
    }
  } else {
    const playerCovers = !!(j.roles && j.roles[roleKey]);
    playerHint = playerCovers
      ? `<br><strong style="color:var(--red-dark)">▶ You cover ${targetRole}: roll ${targetSkill}${terrainHint}.</strong>`
      : `<br><small style="color:var(--text-muted)">Target: ${targetRole} (rolled by another player)</small>`;
    rollClause = `Target: ${targetRole} → ${targetSkill} roll.`;
  }
  const featSym = r.featSpecial === 'eye' ? '👁' : (r.featSpecial === 'rune' ? 'ᚱ' : r.featValue);

  const ponderTag = ponderApplied ? ' 🗺️ Ponder Maps +1' : '';
  // Append the detail line if we rolled one (Strider Mode)
  const detailSuffix = detailLine || '';
  const perilPrefix = isPeril ? '⚠️ <strong>[Peril]</strong> ' : '';
  const noteworthy = !!(detailRec && detailRec.outcome === 'Noteworthy Encounter');
  j.events.push({
    day: j.daysElapsed,
    hex: isPeril ? j.currentHex : j.nextEventHex,
    ev: { name: String(event.name).replace(/\s*[👁ᚱ]\s*$/u, ''), key: event.key, peril: !!isPeril, fatigue: event.fatigue,
          skill: noteworthy ? null : (targetSkill || null), hard: j.hardTerrainHexes > 0, noteworthy,
          detail: detailRec ? (noteworthy ? detailRec.event : `${detailRec.event} — ${detailRec.outcome}`) : '',
          chamber: chamberRec ? { appr: chamberRec.appr, type: chamberRec.type, cond: chamberRec.cond, chal: chamberRec.chal } : null,
          stakes: _eventStakes(event.effect, solo), feat: featSym, land: region },
    text: `${perilPrefix}🎲 <strong>${event.name}</strong> (Feat ${featSym}${ponderTag}, ${region} Land). ${rollClause} <strong>+${event.fatigue} Travel Fatigue</strong>. <em>${event.effect}</em>${detailSuffix}${playerHint}`
  });
  if (isPeril) {
    j.perilEventsRemaining = Math.max(0, (parseInt(j.perilEventsRemaining) || 0) - 1);
  } else {
    j.nextEventHex = null;
  }
  // The event has just told the player to roll something. Arm the control that does it —
  // every other subsystem in the app (Council, Endeavour, Battle, Encounter) rolls its own
  // skill in place, and the journey log was the one place that asked and then offered nothing.
  const mine = solo || !!(j.roles && j.roles[roleKey]);
  j.pendingEventRoll = (targetSkill && mine && !noteworthy)
    ? { skill: targetSkill, eventKey: event.key, eventName: event.name, hard: j.hardTerrainHexes > 0 }
    : null;
  // A Noteworthy Encounter is played out as a scene — fight, council or endeavour. It used to arm
  // nothing and print the parent event's "If it fails", with no roll anywhere to fail.
  j.pendingScene = (noteworthy && mine) ? { name: String(event.name).replace(/\s*[👁ᚱ]\s*$/u, ''), detail: detailRec.event } : null;
  saveCharacter();
  renderJourney();
  if (typeof journalAuto === 'function') journalAuto('ojc', 'oracle', `${isPeril ? '[Peril] ' : ''}Journey event — ${event.name}${event.effect ? ' (' + event.effect.replace(/<[^>]+>/g, '') + ')' : ''}`);
}

async function arriveAtDestination() {
  const j = char.journey;
  if (!j || !j.active) return;
  if (!await confirmStyled('Arrive at destination?<br><br>This applies end-of-journey Fatigue reduction (mount Vigour + your TRAVEL roll), adds lingering Fatigue to your regular Fatigue counter, then closes the journey.', '🏁 Arrive', {yes:'We have arrived', no:'Not yet'})) return;

  let totalFat = j.travelFatigue;
  const lines = [`Travel Fatigue accumulated: <strong>${totalFat}</strong>.`];

  if (j.mounted && j.mountVigour > 0) {
    const reduction = Math.min(totalFat, j.mountVigour);
    totalFat -= reduction;
    lines.push(`Mount Vigour ${j.mountVigour}: −${reduction} → ${totalFat}.`);
  }

  // Arrival TRAVEL roll
  const s = char.skills['Travel'] || { rating: 0, favoured: false };
  const tn = parseInt(char.hrtTN) || 14;
  const fav = s.favoured ? 'fav' : 'normal';
  const r = _doInlineRoll(_heroSkill('Travel').rating, fav, tn, 'Travel · Arrival');
  let success = r.outcome.startsWith('SUCCESS');
  if (char.miserable && r.featSpecial === 'eye') success = false;
  if (success) {
    const reduce = 1 + r.icons;
    const applied = Math.min(totalFat, reduce);
    totalFat -= applied;
    lines.push(`Arrival TRAVEL roll: <strong>${outcomeWords(r.outcome)}</strong> (Feat ${r.featLabel}, ${r.icons} ✦, total ${r.total ?? '★'} vs Heart TN ${tn}) → −${applied} → ${totalFat}.`);
  } else {
    lines.push(`Arrival TRAVEL roll: <strong>${outcomeWords(r.outcome)}</strong> (Feat ${r.featLabel}, total ${r.total ?? '✗'} vs Heart TN ${tn}) → no reduction.`);
  }

  // Lingering Fatigue → add to regular Fatigue (clears 1/Prolonged Rest in Safe Haven)
  const before = parseInt(char.fatigue) || 0;
  char.fatigue = before + totalFat;
  lines.push(`Lingering <strong>${totalFat}</strong> Fatigue added to character Fatigue (${before} → ${char.fatigue}). Clears at 1/Prolonged Rest in a Safe Haven.`);

  j.events.push({
    day: j.daysElapsed,
    hex: j.totalHexes,
    arr: { place: j.destination || 'the destination', travel: j.travelFatigue, left: totalFat, before, after: char.fatigue,
           roll: { total: r.total, tn, ok: success } },
    text: `🏁 <strong>Arrived at ${j.destination || 'destination'}!</strong><br>${lines.join('<br>')}`
  });
  j.active = false;
  // ▶ Play follows an arrival made here: the road there ends at the place; the road home ends home.
  if (char.saga && char.saga.started && !char.saga.ended) {
    if (char.saga.step === 'journey') char.saga.step = 'location';
    else if (char.saga.step === 'home') char.saga.step = 'fellowship';
  }
  // The Chronicle clock already moved day by day on the road (advanceDays) — adding the whole
  // journey again here counted every day twice.
  saveCharacter();
  renderJourney();
  renderConditionWarnings();
  setText('fat-v', char.fatigue);
  if (typeof journalAuto === 'function') journalAuto('ojc', 'milestone', `Arrived at ${j.destination || 'the destination'} after ${j.daysElapsed || '?'} days (from ${j.origin || '?'}).`);
  if (typeof logTimeline === 'function') logTimeline('journey', `Journey: ${j.origin || 'home'} → ${j.destination || 'the destination'}, ${j.daysElapsed || '?'} days, ${j.totalHexes || '?'} hexes.`);
  // A short recap — the arithmetic (Feat, ✦, TN, Vigour, before → after) is in the Journey log.
  const recap = `You reach ${j.destination || 'the destination'}. Your arrival Travel roll: ${r.total ?? 'a Gandalf rune'} against ${tn} — ${success ? 'success' : 'failure'}.\n` +
    (totalFat ? `${totalFat} Fatigue stays with you (now ${char.fatigue}).` : 'You shake off the road’s weariness.');
  // In solo play, offer to open a fresh "at the landmark" scene in the Chronicle (montage → play hand-off).
  const dest = j.destination || 'the destination';
  if (isSolo() && await confirmStyled(escapeHtml(recap).replace(/\n/g, '<br>') + `<br><br>Start a Chronicle scene at <strong>${escapeHtml(dest)}</strong>?`, '🏁 Arrived', {yes:'Open a scene', no:'Not now'})) {
    const sc = { id: genCharId(), title: `At ${dest}`, date: { ...journal.clock }, ts: nowStamp(), state: captureState() };
    journal.scenes.push(sc);
    journal.activeSceneId = sc.id;
    saveJournal();
    document.querySelector('.tab[data-tab="chronicle"]')?.click();
    renderChronicle();
    const ta = document.getElementById('ch-compose'); if (ta) ta.focus();
  } else {
    alert(recap);
  }
}

function refreshRetiredPill() {
  const pill = document.getElementById('retired-pill');
  if (!pill) return;
  if (char.retired) {
    pill.style.display = 'inline-block';
    pill.textContent = 'RETIRED';
    pill.title = char.retiredReason || 'Hero retired from play';
  } else {
    pill.style.display = 'none';
  }
}

async function takeShortRest() {
  const str = parseInt(char.strRating) || 1;
  const cur = parseInt(char.endCur) || 0;
  const max = parseInt(char.endMax) || 0;
  if (cur >= max) { alert('Endurance already at maximum.'); return; }
  if (char.wounded) {
    alert('☀️ Short Rest while Wounded: no Endurance recovered.');
    return;
  }
  // Frequency: one Short Rest per day (Core Rules p.71). Allow an explicit override.
  if (char.shortRestUsedToday) {
    if (!await confirmStyled(`You have already taken a Short Rest on Day ${char.dayCount || 1}.<br><br>The rules allow one Short Rest per day. Take another anyway?`, '☀️ Already Rested Today', {yes:'Rest again anyway', no:'Don’t rest'})) return;
  }
  const recovered = Math.min(str, max - cur);
  // Reversible, so it just happens — with Undo — instead of asking first.
  if (typeof snapshot === 'function') snapshot();
  char.endCur = cur + recovered;
  char.shortRestUsedToday = true;
  saveCharacter();
  render();
  showToast(`Short rest: +${recovered} Endurance (${cur} → ${cur + recovered}).`, { label: 'Undo', fn: () => undoLast() });
}

async function takeProlongedRest(opts) {
  opts = opts || {};
  const str = parseInt(char.strRating) || 1;
  const cur = parseInt(char.endCur) || 0;
  const max = parseInt(char.endMax) || 0;
  const hopeCur = parseInt(char.hopeCur) || 0;
  const hopeMax = parseInt(char.hopeMax) || 0;
  const fat = parseInt(char.fatigue) || 0;

  const endRecover = char.wounded ? Math.min(str, max - cur) : (max - cur);
  const hopeRecover = (hopeCur === 0 && hopeMax > 0) ? 1 : 0;
  const wouldClearFatigue = fat > 0;

  // Ask Safe Haven question only if there's Fatigue to clear
  let inSafeHaven = false;
  if (typeof opts.safeHaven === 'boolean') {
    // The caller knows where the hero is (▶ Play: at home, or camped on the road). Lingering
    // Fatigue only lifts in a Safe Haven — a night in the wild must not clear it.
    inSafeHaven = opts.safeHaven;
  } else if (wouldClearFatigue) {
    inSafeHaven = await confirmStyled(`🌙 Prolonged Rest (a night's sleep)\n\nEndurance recovery: +${endRecover}\n${hopeRecover ? 'Hope recovery: +1 (you were at 0)\n' : ''}\nYou have ${fat} Fatigue. It lifts by 1 only in a Safe Haven. Where are you sleeping?`, undefined, {yes:'In a Safe Haven', no:'Out in the wild'});
  } else if (!opts.noConfirm) {
    if (!await confirmStyled(`🌙 Prolonged Rest (a night's sleep)\n\nEndurance recovery: +${endRecover}${char.wounded ? ' (Wounded: STRENGTH only)' : ' (full)'}\n${hopeRecover ? 'Hope recovery: +1 (you were at 0)' : ''}\n\nMax one Prolonged Rest per day (LM may allow more in safe/comfortable places).`, undefined, {yes:'Sleep', no:'Not now'})) return;
  }

  char.endCur = Math.min(max, cur + endRecover);
  if (hopeRecover > 0) char.hopeCur = Math.min(hopeMax, hopeCur + hopeRecover);
  let fatigueRemoved = 0;
  if (inSafeHaven && fat > 0) {
    fatigueRemoved = 1;
    char.fatigue = fat - 1;
  }
  // A Prolonged Rest is the night's sleep that ends the day: advance the day-count,
  // clear the per-day Short-Rest flag, and tick a Wounded hero's injury days down by 1.
  char.dayCount = (parseInt(char.dayCount) || 1) + 1;
  char.shortRestUsedToday = false;
  // Advance the Chronicle clock by a day (the night passes) — through the calendar, so day 30
  // rolls into the next month (it used to read "31 Astron", "32 Astron"…).
  if (typeof advanceChronicleDay === 'function' && journal && journal.clock) advanceChronicleDay(1);
  _syncJourneySeason();
  let injuryTicked = 0;
  let moderateHealed = false;
  // A Moderate Injury's own printed text is "Uncheck Wounded in a few hours" — a night's sleep
  // is those hours, so do what the app said rather than leaving the player to find the checkbox.
  if (char.wounded && char.injuryKind === 'moderate') {
    char.wounded = false; char.injury = ''; char.injuryKind = ''; char.firstAidUsed = false;
    moderateHealed = true;
  }
  if (char.wounded) char.injuryRested = true;      // a Grievous wound can now be cleared
  if (char.wounded && (parseInt(char.injuryDays) || 0) > 0) {
    const before = parseInt(char.injuryDays) || 0;
    char.injuryDays = before - 1;
    char.firstAidUsed = false;  // a new day — First Aid may be attempted again
    injuryTicked = 1;
  }
  saveCharacter();
  render();
  // Brief recap
  let recap = `🌙 Prolonged Rest applied. A new day dawns (Day ${char.dayCount}).\n\nEndurance: +${endRecover} → ${char.endCur} / ${max}`;
  if (hopeRecover > 0) recap += `\nHope: +${hopeRecover} → ${char.hopeCur} / ${hopeMax}`;
  if (fatigueRemoved > 0) recap += `\nFatigue: −${fatigueRemoved} (Safe Haven rest) → ${char.fatigue}`;
  if (moderateHealed) recap += `\nThe Moderate Injury has closed — you are no longer Wounded.`;
  if (injuryTicked > 0) recap += `\nInjury: ${char.injuryDays + 1} → ${char.injuryDays} day(s) remaining` + (char.injuryDays === 0 ? ' — the wound has run its course; you may clear Wounded.' : '');
  alert(recap);
}

/* ---------- MAGICAL TREASURE ---------- */
const HOARD_TIERS = {
  lesser:     { sDice: 1, fDice: 2, label: 'Lesser (Solitary Troll, Goblin plunder, bandit hoard)' },
  greater:    { sDice: 2, fDice: 4, label: 'Greater (Old hoard, Dwarf-hoard)' },
  marvellous: { sDice: 3, fDice: 6, label: 'Marvellous (Ancient hoard, Dwarven city treasury, Dragon-hoard)' }
};

const GREED_SHADOW = {
  'Marvellous Artefact': 1,
  'Wondrous Item': 2,
  'Famous Weapon': 3,
  'Famous Armour': 3
};

// Curated Treasure Index — canonical Middle-earth magical items from The One Ring lore + Core Rules examples.
// Pre-fills the Add Magical Item modal when the player picks one. Loremaster can override anything.
const TREASURE_INDEX = [
  { name: 'Glamdring, Foe-Hammer',     type: 'Famous Weapon', craft: 'Elven, Beleriand',
    qualities: [{name:'Foe-Slaying', desc:'Bane: Orcs. Piercing Blow on Orcs → foe Protection roll Ill-favoured.'}, {name:'Cleaving', desc:'Kill a foe → immediately attack another engaged adversary.'}, {name:'Superior Fell', desc:'Elven: +4 Injury.'}],
    notes:'The sword of Turgon, found in a troll-hoard by Gandalf.' },
  { name: 'Orcrist, Goblin-Cleaver',   type: 'Famous Weapon', craft: 'Elven, Beleriand',
    qualities: [{name:'Foe-Slaying', desc:'Bane: Orcs. Piercing Blow on Orcs → foe Protection roll Ill-favoured.'}, {name:'Superior Fell', desc:'Elven: +4 Injury.'}],
    notes:'Brother-blade to Glamdring. Carried by Thorin Oakenshield.' },
  { name: 'Sting',                     type: 'Famous Weapon', craft: 'Elven, Beleriand',
    qualities: [{name:'Foe-Slaying', desc:'Bane: Spiders. Piercing Blow on Spiders → foe Protection roll Ill-favoured.'}, {name:'Keen', desc:'Piercing Blow on Feat 9-10.'}],
    notes:'Elven knife/short-sword. Glows blue when Orcs are near.' },
  { name: 'Andúril, Flame of the West', type: 'Famous Weapon', craft: 'Númenórean',
    qualities: [{name:'Superior Fell', desc:'Númenórean: +2 Injury (or +Valour vs Bane).'}, {name:'Foe-Slaying', desc:'Bane: Servants of the Enemy.'}, {name:'Cleaving', desc:'Kill a foe → immediately attack another engaged adversary.'}],
    notes:'Reforged from the shards of Narsil. The sword of Elendil and his heir.' },
  { name: 'Mithril Coat (Bilbo\'s)',   type: 'Famous Armour', craft: 'Dwarven, Khazad-dûm',
    qualities: [{name:'Ancient Cunning Make', desc:'Armour: −3 Load (or −Valour, min 0).'}, {name:'Superior Cunning Make', desc:'Armour: PROTECTION roll +3 (or Valour).'}],
    notes:'A mail-shirt of mithril rings. Light as a feather, hard as dragon-scale.' },
  { name: 'Helm of Hammerhand',        type: 'Famous Armour', craft: 'Dwarven, Erebor',
    qualities: [{name:'Reinforced', desc:'+1 Parry.'}, {name:'Cunning Make', desc:'−2 Load.'}],
    notes:'A great helm of the Kings under the Mountain.' },
  { name: 'Phial of Galadriel',        type: 'Marvellous Artefact', craft: 'Elven, Lórien',
    blessings: ['Awe'], notes:'A small crystal phial filled with the light of Eärendil\'s star. "In dark places, when all other lights go out."' },
  { name: 'The Arkenstone',            type: 'Marvellous Artefact', craft: 'Dwarven, Erebor',
    blessings: ['Awe'], notes:'The Heart of the Mountain. A great white gem that holds the light of the stars within itself.' },
  { name: 'Horn of Boromir',           type: 'Marvellous Artefact', craft: 'Númenórean',
    blessings: ['Awe'], notes:'A great horn of the wild ox of Araw, tipped with silver, that sounds defiance across hill and dale.' },
  { name: 'Elven Cloak',               type: 'Wondrous Item',    craft: 'Elven, Lórien',
    blessings: ['Stealth', 'Travel'], notes:'A grey cloak that shifts colour with the surroundings — granted by the Lady of the Wood.' },
  { name: 'Elven Rope',                type: 'Wondrous Item',    craft: 'Elven, Lórien',
    blessings: ['Athletics', 'Travel'], notes:'A slender silver rope, strong beyond measure and seemingly mindful of its owner.' },
  { name: 'Cram (Bardings)',           type: 'Marvellous Artefact', craft: 'Mannish',
    blessings: ['Travel'], notes:'A nourishing biscuit-cake baked in Dale for long journeys.' },
  { name: 'Black Arrow',               type: 'Marvellous Artefact', craft: 'Dwarven, Erebor',
    blessings: ['Hunting'], notes:'A great arrow that has slain a Dragon. Never lost; always recovered.' },
  { name: 'Horn of the Mark',          type: 'Marvellous Artefact', craft: 'Mannish',
    blessings: ['Enhearten'], notes:'A war-horn of the Rohirrim — when sounded, fills the heart of friends with courage and the foe with dread.' },
  { name: 'Drinking Horn of Thranduil', type: 'Marvellous Artefact', craft: 'Elven, Mirkwood',
    blessings: ['Courtesy'], notes:'A wine-horn of the Elvenking, set with silver and shaped like a slim hunting-horn.' }
];

// Curated catalog of Enchanted Rewards + ordinary Rewards that can appear on Famous Weapons/Armour
// (Core Rules pp.79, 163-167). Descriptions are condensed.
const ENCHANTED_REWARDS = [
  // Enchanted Rewards (magical, for Famous items)
  { name: 'Ancient Cunning Make',  enchanted: true,  desc: 'Armour/Helm/Shield: −3 Load (or −Valour, whichever is higher; min 0).' },
  { name: 'Superior Cunning Make', enchanted: true,  desc: 'Armour/Helm: PROTECTION roll adds 3 (or Valour, whichever is higher).' },
  { name: 'Cleaving',              enchanted: true,  desc: 'Close combat weapon: kill a foe → immediately attack another engaged adversary.' },
  { name: 'Flame of Hope',         enchanted: true,  desc: 'Dwarven close combat: hit target → Company (you included) recovers 1 Endurance +1/icon.' },
  { name: 'Foe-Slaying',           enchanted: true,  desc: 'Elven/Númenórean weapon with Bane: Piercing Blow on Bane creature → foe\'s Protection roll is Ill-favoured.' },
  { name: 'Superior Fell',         enchanted: true,  desc: 'Elven: +4 Injury. Númenórean: +2 Injury (or +Valour vs Bane).' },
  { name: 'Reflective',            enchanted: true,  desc: 'Shield: doubled Parry vs ranged attacks (always, not just first volley).' },
  // Ordinary Rewards (can also appear on Famous items)
  { name: 'Close-fitting',         enchanted: false, desc: 'Armour/Helm: +2 to Protection roll result (stacks).' },
  { name: 'Cunning Make',          enchanted: false, desc: 'Armour/Helm/Shield: −2 Load (min 0).' },
  { name: 'Fell',                  enchanted: false, desc: 'Weapon: +2 Injury rating.' },
  { name: 'Grievous',              enchanted: false, desc: 'Weapon: +1 Damage rating.' },
  { name: 'Keen',                  enchanted: false, desc: 'Weapon: Piercing Blow on Feat 9-10 (not just 10).' },
  { name: 'Reinforced',            enchanted: false, desc: 'Shield: +1 Parry.' }
];

let hoardState = null;  // { tier, tainted, partySize, results: [...] }
let pendingMagicalItem = null;  // for Add Magical Item modal

function openHoardRoller() {
  document.getElementById('hoard-roller-overlay').classList.add('show');
  document.getElementById('hoard-setup').style.display = 'block';
  document.getElementById('hoard-result').style.display = 'none';
  // Default the split to the party you actually have. The markup used to ship value="4", which
  // made the `|| (isSolo() ? 1 : 4)` fallback below unreachable — a lone hero silently took a
  // quarter share. The field stays editable either way.
  const ps = document.getElementById('hoard-party-size');
  if (ps && !ps.value) ps.value = (typeof isSolo === 'function' && isSolo()) ? 1 : 4;
  fpHoardSetupHint();
}

function fpHoardSetupHint() {
  const tierBtn = document.querySelector('#hoard-tier-pick .seg-btn.active');
  if (!tierBtn) {
    alertStyled('Choose a hoard size first — <strong>Lesser</strong>, <strong>Greater</strong> or <strong>Marvellous</strong> — using the buttons above. It sets how many dice are rolled for treasure and for magical finds.', '⚠️ Pick a hoard size');
    return;
  }
  const tier = HOARD_TIERS[tierBtn.dataset.val];
  document.getElementById('hoard-tier-hint').textContent = `${tier.label} · Treasure: roll ${tier.sDice} Success die${tier.sDice>1?'s':''} × party size · Magical: roll ${tier.fDice} Feat dice`;
}

function hoardClose() {
  document.getElementById('hoard-roller-overlay').classList.remove('show');
  hoardState = null;
}

function rollHoard() {
  const tierBtn = document.querySelector('#hoard-tier-pick .seg-btn.active');
  if (!tierBtn) return;
  const tierKey = tierBtn.dataset.val;
  const tier = HOARD_TIERS[tierKey];
  const partySize = parseInt(document.getElementById('hoard-party-size').value) || (isSolo() ? 1 : 4);
  const tainted = document.getElementById('hoard-tainted').checked;

  // Treasure dice
  let treasurePerHero = 0;
  const treasureRolls = [];
  for (let i = 0; i < tier.sDice; i++) {
    const v = Math.floor(Math.random() * 6) + 1;
    treasureRolls.push(v);
    treasurePerHero += v;
  }
  const totalTreasure = treasurePerHero * partySize;

  // Magical Treasure dice (Feat dice)
  const magicalTypes = [];
  for (let i = 0; i < tier.fDice; i++) {
    const r = rollFeatOnce();
    if (r.special === 'eye' || r.special === 'rune') {
      // Roll a Success die to determine type
      const t = Math.floor(Math.random() * 6) + 1;
      let type;
      if (t <= 3) type = 'Marvellous Artefact';
      else if (t <= 5) type = 'Wondrous Item';
      else type = 'Famous Weapon';  // could be armour; player chooses on add
      magicalTypes.push({ found: true, type, featLabel: r.label });
    } else {
      magicalTypes.push({ found: false, featLabel: r.label });
    }
  }

  hoardState = { tier: tierKey, tainted, partySize, treasureRolls, treasurePerHero, totalTreasure, magicalTypes };

  // Render result
  document.getElementById('hoard-setup').style.display = 'none';
  document.getElementById('hoard-result').style.display = 'block';
  const taintedTag = tainted ? ' <span style="color:var(--red);font-weight:600">⚠ TAINTED</span>' : '';
  let html = `<strong>Tier:</strong> ${tier.label}${taintedTag}<br>` +
    `<strong>Treasure rolls:</strong> ${treasureRolls.join(', ')} = ${treasurePerHero} per hero (× ${partySize} heroes = ${totalTreasure} total Treasure points)<br>` +
    `<button class="add-row-btn" onclick="hoardTakeTreasureShare()" style="background:var(--gold);width:100%;margin-top:8px">💰 Take My Share (+${treasurePerHero} Treasure)</button>`;
  document.getElementById('hoard-result-content').innerHTML = html;

  const finds = magicalTypes.filter(x => x.found);
  let mhtml = `<strong>Magical Treasure roll:</strong> ${magicalTypes.length} Feat dice → ${finds.length} magical find${finds.length===1?'':'s'} (Eye/Rune triggers)<br>`;
  if (finds.length > 0) {
    mhtml += '<div style="margin-top:8px;display:flex;flex-direction:column;gap:6px">';
    finds.forEach((f, i) => {
      mhtml += `<div style="padding:8px;background:var(--gold-soft);border:1px solid var(--gold);border-radius:var(--r-sm)">
        <strong>✨ ${f.type}</strong> <small style="color:var(--text-muted)">(Feat ${f.featLabel})</small>
        <button onclick="hoardTakeMagicalItem('${f.type}', ${tainted})" style="background:var(--gold);color:white;border:none;border-radius:var(--r-sm);padding:4px 8px;font-size:var(--fs-xs);font-weight:600;cursor:pointer;margin-left:8px">Take Item</button>
      </div>`;
    });
    mhtml += '</div>';
  } else {
    mhtml += '<p class="hint" style="text-align:left">No magical treasure this hoard. The riches are mundane gold and gems.</p>';
  }
  if (tainted && finds.length > 0) {
    mhtml += `<p class="hint" style="text-align:left;color:var(--red);font-weight:600;margin-top:8px">⚠ Tainted hoard: each magical item taken triggers a Greed Shadow Test (Wisdom).</p>`;
  }
  document.getElementById('hoard-magical-finds').innerHTML = mhtml;
}

async function hoardTakeTreasureShare() {
  if (!hoardState) return;
  const before = parseInt(char.treasure) || 0;
  char.treasure = before + hoardState.treasurePerHero;
  saveCharacter();
  render();  // adj() handles SoL auto-promote; we bypass adj() but call render — explicit SoL check
  // Manually check SoL promote since we didn't go through adj()
  const curRank = SOL_RANK[char.standard] !== undefined ? SOL_RANK[char.standard] : 1;
  for (const tier of SOL_THRESHOLDS) {
    if (char.treasure >= tier.treasure && before < tier.treasure && SOL_RANK[tier.sol] > curRank) {
      setTimeout(async () => {
        if (await confirmStyled(`💰 Treasure (${char.treasure}) crossed ${tier.sol}'s threshold (${tier.treasure}).\n\nPromote Standard of Living from ${char.standard || '(none)'} to ${tier.sol}?`, undefined, {yes:'Raise my Standard of Living', no:'Keep it as is'})) {
          char.standard = tier.sol;
          saveCharacter();
          render();
        }
      }, 50);
      break;
    }
  }
  alert(`+${hoardState.treasurePerHero} Treasure (${before} → ${char.treasure}). ${hoardState.treasurePerHero} Load also added.`);
}

function hoardTakeMagicalItem(type, tainted) {
  // Pre-populate the Add Magical Item modal with the type + tainted flag
  document.getElementById('mi-type').value = type;
  document.getElementById('mi-name').value = '';
  document.getElementById('mi-craft').value = '';
  document.getElementById('mi-notes').value = '';
  document.getElementById('mi-tainted').checked = !!tainted;
  document.getElementById('mi-cursed').checked = false;
  document.getElementById('mi-curse-type-row').style.display = 'none';
  renderMagicalItemForm();
  document.getElementById('add-magical-item-overlay').classList.add('show');
}

function openTreasureIndexPicker() {
  const list = document.getElementById('treasure-index-list');
  list.innerHTML = TREASURE_INDEX.map((entry, idx) => {
    const typeEmoji = entry.type === 'Marvellous Artefact' ? '✨' : (entry.type === 'Wondrous Item' ? '💎' : '⚔️');
    const subline = entry.blessings ? `Blessings: ${entry.blessings.join(', ')}` :
                     (entry.qualities ? `${entry.qualities.length} qualit${entry.qualities.length===1?'y':'ies'}` : '');
    return `<button onclick="applyTreasureIndex(${idx})" style="background:var(--card-bg);color:var(--ink);text-align:left;padding:10px 12px;font-size:var(--fs-sm);border:1px solid var(--border);border-radius:var(--r-sm);cursor:pointer;display:block;width:100%;line-height:1.4">
      <strong>${typeEmoji} ${escapeHtml(entry.name)}</strong> <small style="color:var(--text-muted)">${entry.type} · ${entry.craft || ''}</small>
      <br><small style="color:var(--gold);font-weight:600">${subline}</small>
      <br><small style="color:var(--text-muted)">${escapeHtml(entry.notes || '')}</small>
    </button>`;
  }).join('');
  document.getElementById('treasure-index-overlay').classList.add('show');
}

function applyTreasureIndex(idx) {
  const entry = TREASURE_INDEX[idx];
  if (!entry) return;
  // Set type FIRST so renderMagicalItemForm builds the right Blessing/quality slots
  document.getElementById('mi-type').value = entry.type;
  renderMagicalItemForm();
  // Now populate the fields
  document.getElementById('mi-name').value = entry.name;
  document.getElementById('mi-craft').value = entry.craft || '';
  document.getElementById('mi-notes').value = entry.notes || '';
  if (entry.blessings) {
    const b1 = document.getElementById('mi-blessing-1');
    const b2 = document.getElementById('mi-blessing-2');
    if (b1 && entry.blessings[0]) b1.value = entry.blessings[0];
    if (b2 && entry.blessings[1]) b2.value = entry.blessings[1];
  }
  if (entry.qualities) {
    entry.qualities.forEach((q, i) => {
      const n = i + 1;
      const nameEl = document.getElementById('mi-q' + n + '-name');
      const descEl = document.getElementById('mi-q' + n + '-desc');
      if (nameEl) nameEl.value = q.name;
      if (descEl) descEl.value = q.desc || '';
    });
  }
  document.getElementById('treasure-index-overlay').classList.remove('show');
}

function openAddMagicalItem() {
  document.getElementById('mi-type').value = 'Marvellous Artefact';
  document.getElementById('mi-name').value = '';
  document.getElementById('mi-craft').value = '';
  document.getElementById('mi-notes').value = '';
  document.getElementById('mi-tainted').checked = false;
  document.getElementById('mi-cursed').checked = false;
  document.getElementById('mi-curse-type-row').style.display = 'none';
  renderMagicalItemForm();
  document.getElementById('add-magical-item-overlay').classList.add('show');
}

function renderMagicalItemForm() {
  const type = document.getElementById('mi-type').value;
  const section = document.getElementById('mi-blessings-section');
  const allSkills = [
    ...SKILLS.str.map(s => ({name: s, attr: 'str'})),
    ...SKILLS.hrt.map(s => ({name: s, attr: 'hrt'})),
    ...SKILLS.wit.map(s => ({name: s, attr: 'wit'}))
  ];
  const skillOpts = '<option value="">— None —</option>' + allSkills.map(s => `<option value="${s.name}">${s.name} (${s.attr.toUpperCase()})</option>`).join('');
  if (type === 'Marvellous Artefact') {
    section.innerHTML = `<div class="field"><label style="flex:0 0 100px">Blessing</label><select id="mi-blessing-1">${skillOpts}</select></div>
      <p class="hint" style="text-align:left">Bearer gains <strong>+2d</strong> on rolls of this Skill and can achieve a Magical Success.</p>`;
  } else if (type === 'Wondrous Item') {
    section.innerHTML = `<div class="field"><label style="flex:0 0 100px">Blessing 1</label><select id="mi-blessing-1">${skillOpts}</select></div>
      <div class="field"><label style="flex:0 0 100px">Blessing 2</label><select id="mi-blessing-2">${skillOpts}</select></div>
      <p class="hint" style="text-align:left">Bearer gains <strong>+2d</strong> on rolls of either Skill and can achieve a Magical Success.</p>`;
  } else {
    // Famous Weapon / Armour — up to 3 qualities. First active, rest dormant.
    const rewardOpts = '<option value="">— Custom / leave blank —</option>' +
      ENCHANTED_REWARDS.map(r => `<option value="${r.name}" data-desc="${escapeHtml(r.desc)}">${r.enchanted ? '✨ ' : ''}${r.name}</option>`).join('');
    section.innerHTML = `<p class="hint" style="text-align:left;line-height:1.5;margin-bottom:8px">Famous Weapons/Armour have up to <strong>3 qualities</strong>, with at least 1 Enchanted Reward. Only the <strong>first is active</strong> when found; the rest unlock via new Valour rank or the Visiting the Treasury undertaking.</p>` +
      [1,2,3].map(n => `
        <div style="padding:8px;background:${n===1?'var(--gold-soft)':'var(--bg-deep)'};border:1px solid ${n===1?'var(--gold)':'var(--border)'};border-radius:var(--r-sm);margin-bottom:6px">
          <strong style="font-size:var(--fs-xs);color:var(--red-dark)">Quality ${n} ${n===1 ? '<span style="background:var(--gold);color:white;padding:1px 6px;border-radius:var(--r-sm);font-size:var(--fs-xs)">ACTIVE on find</span>' : '<span style="background:var(--btn-secondary-bg);color:white;padding:1px 6px;border-radius:var(--r-sm);font-size:var(--fs-xs)">DORMANT</span>'}</strong>
          <select id="mi-q${n}-pick" onchange="fpFamousQualityPicked(${n})" style="width:100%;margin-top:4px;padding:4px;font-size:var(--fs-xs)">${rewardOpts}</select>
          <input id="mi-q${n}-name" placeholder="Name (custom if not in dropdown)" style="width:100%;margin-top:4px;padding:4px;font-size:var(--fs-xs)">
          <input id="mi-q${n}-desc" placeholder="Description (auto-filled from dropdown)" style="width:100%;margin-top:4px;padding:4px;font-size:var(--fs-xs)">
        </div>
      `).join('');
  }
}

function fpFamousQualityPicked(n) {
  const sel = document.getElementById('mi-q' + n + '-pick');
  const nameInput = document.getElementById('mi-q' + n + '-name');
  const descInput = document.getElementById('mi-q' + n + '-desc');
  if (!sel || !nameInput || !descInput) return;
  if (!sel.value) return;  // Custom
  const desc = sel.options[sel.selectedIndex].dataset.desc || '';
  nameInput.value = sel.value;
  descInput.value = desc;
}

async function confirmAddMagicalItem() {
  const type = document.getElementById('mi-type').value;
  const name = (document.getElementById('mi-name').value || '').trim();
  if (!name) { alert('Please give the item a name.'); return; }
  const craft = document.getElementById('mi-craft').value;
  const notes = (document.getElementById('mi-notes').value || '').trim();
  const tainted = document.getElementById('mi-tainted').checked;

  let blessings = [];
  let qualities = [];
  if (type === 'Marvellous Artefact') {
    const b1 = document.getElementById('mi-blessing-1').value;
    if (b1) blessings.push(b1);
  } else if (type === 'Wondrous Item') {
    const b1 = document.getElementById('mi-blessing-1').value;
    const b2 = document.getElementById('mi-blessing-2').value;
    if (b1) blessings.push(b1);
    if (b2 && b2 !== b1) blessings.push(b2);
  } else {
    // Famous Weapon / Armour — collect up to 3 qualities. First active on find.
    for (const n of [1, 2, 3]) {
      const qName = (document.getElementById('mi-q' + n + '-name')?.value || '').trim();
      const qDesc = (document.getElementById('mi-q' + n + '-desc')?.value || '').trim();
      if (qName) {
        qualities.push({ name: qName, description: qDesc, active: n === 1 });
      }
    }
  }

  const cursed = document.getElementById('mi-cursed')?.checked || false;
  const curseType = cursed ? (document.getElementById('mi-curse-type')?.value || 'Shadow Taint') : '';

  if (!Array.isArray(char.magicalItems)) char.magicalItems = [];
  const itemRecord = { type, name, blessings, craftsmanship: craft, notes };
  if (qualities.length > 0) itemRecord.qualities = qualities;
  if (cursed) { itemRecord.cursed = true; itemRecord.curseType = curseType; }
  char.magicalItems.push(itemRecord);

  // Add 1 Load per magical item (per RAW p.158)
  char.otherLoad = (parseInt(char.otherLoad) || 0) + 1;

  // Greed Shadow Test if tainted
  let shadowMsg = '';
  if (tainted) {
    const greedAmt = GREED_SHADOW[type] || 1;
    const wisdomRating = parseInt(char.wisdom) || 1;
    const wisdomTN = parseInt(char.witTN) || 14;
    if (await confirmStyled(`⚠ TAINTED HOARD\n\nGreed Shadow gain for ${type}: +${greedAmt} Shadow.\n\nMake a WISDOM Shadow Test now to reduce? Success reduces by 1+icons.`, undefined, {yes:'Take the Greed test'})) {
      const r = _doInlineRoll(wisdomRating, 'normal', wisdomTN, 'Wisdom · Greed (Shadow Test)');
      const success = r.outcome.startsWith('SUCCESS') && !(char.miserable && r.featSpecial === 'eye');
      const reduction = success ? Math.min(greedAmt, 1 + r.icons) : 0;
      const netGain = greedAmt - reduction;
      const before = parseInt(char.shadow) || 0;
      char.shadow = Math.min((parseInt(char.hopeMax) || 0) - (parseInt(char.scars) || 0), before + netGain);
      shadowMsg = `\n\nWisdom Test: ${success ? 'SUCCESS' : 'FAIL'} (Feat ${r.featLabel}, ${r.icons} ✦ vs Wits TN ${wisdomTN}). Reduction: −${reduction}. Net Shadow gain: ${netGain} (${before} → ${char.shadow}).`;
    } else {
      // No test — full Shadow gain
      const before = parseInt(char.shadow) || 0;
      char.shadow = Math.min((parseInt(char.hopeMax) || 0) - (parseInt(char.scars) || 0), before + greedAmt);
      shadowMsg = `\n\nNo test — full +${greedAmt} Shadow (${before} → ${char.shadow}).`;
    }
  }

  saveCharacter();
  render();
  document.getElementById('add-magical-item-overlay').classList.remove('show');
  const curseMsg = cursed ? `\n\n⚠️ CURSED (${curseType}). ${curseType === 'Shadow Taint' ? 'You will gain +1 Shadow each Fellowship Phase while bearing this item.' : curseType === 'Owned' ? 'You must pass a Wisdom Shadow Test to use this item willingly.' : "Your bearing of this item draws the Enemy's notice (Eye Awareness +1, narrative)."}` : '';
  alert(`✨ ${type} "${name}" added.\nLoad: +1.${shadowMsg}${curseMsg}`);
}

async function removeMagicalItem(i) {
  const item = char.magicalItems[i];
  if (!item) return;
  if (!await confirmStyled(`Remove <strong>"${escapeHtml(item.name)}"</strong>?<br><br>Load will decrease by 1.`, 'Remove Magical Item', {yes:'Remove item', no:'Keep item'})) return;
  char.magicalItems.splice(i, 1);
  char.otherLoad = Math.max(0, (parseInt(char.otherLoad) || 0) - 1);
  saveCharacter();
  render();
}

function renderMagicalItems() {
  const list = document.getElementById('magical-items-list');
  if (!list) return;
  const items = char.magicalItems || [];
  if (items.length === 0) {
    list.innerHTML = emptyState('No magical treasure yet.', 'gem', { label: 'Roll a hoard', fn: 'openHoardRoller()' });
    return;
  }
  list.innerHTML = items.map((item, i) => {
    const typeEmoji = item.type === 'Marvellous Artefact' ? '✨' : (item.type === 'Wondrous Item' ? '💎' : '⚔️');
    const blessingsTag = item.blessings && item.blessings.length > 0
      ? `<br><small style="color:var(--gold);font-weight:600">Blessing${item.blessings.length>1?'s':''}: ${item.blessings.join(', ')} (+2d on those skills)</small>`
      : '';
    const craft = item.craftsmanship ? ` · ${item.craftsmanship}` : '';
    const notes = item.notes ? `<br><small style="color:var(--text-muted)">${escapeHtml(item.notes)}</small>` : '';

    let qualitiesBlock = '';
    if (Array.isArray(item.qualities) && item.qualities.length > 0) {
      const dormantCount = item.qualities.filter(q => !q.active).length;
      qualitiesBlock = '<div style="margin-top:6px;display:flex;flex-direction:column;gap:3px">' +
        item.qualities.map(q => {
          const bg = q.active ? 'var(--gold-soft)' : 'var(--bg-deep)';
          const border = q.active ? 'var(--gold)' : 'var(--border)';
          const color = q.active ? 'var(--red-dark)' : '#888';
          const badge = q.active
            ? '<span style="background:var(--gold);color:white;padding:1px 6px;border-radius:var(--r-sm);font-size:var(--fs-xs);font-weight:700">ACTIVE</span>'
            : '<span style="background:var(--text-faint);color:white;padding:1px 6px;border-radius:var(--r-sm);font-size:var(--fs-xs);font-weight:700">DORMANT</span>';
          const descLine = q.description ? `<br><small style="color:var(--text-muted)">${escapeHtml(q.description)}</small>` : '';
          return `<div style="padding:5px 8px;background:${bg};border:1px solid ${border};border-radius:var(--r-sm);font-size:var(--fs-xs);color:${color}"><strong>${escapeHtml(q.name)}</strong> ${badge}${descLine}</div>`;
        }).join('') +
        '</div>';
      if (dormantCount > 0) {
        qualitiesBlock += `<button onclick="unlockDormantQuality(${i})" style="background:var(--gold);color:white;border:none;border-radius:var(--r-sm);padding:5px 10px;font-size:var(--fs-xs);font-weight:600;cursor:pointer;margin-top:6px;width:100%">🔓 Unlock Next Dormant Quality (${dormantCount} left)</button>`;
      }
    }

    const cursedBorder = item.cursed ? 'var(--red-dark)' : 'var(--gold)';
    const cursedBadge = item.cursed
      ? `<span style="background:var(--btn-alert-bg);color:white;padding:1px 6px;border-radius:var(--r-sm);font-size:var(--fs-xs);font-weight:700;margin-left:4px">⚠️ CURSED · ${escapeHtml(item.curseType || 'Cursed')}</span>`
      : '';

    return `<div style="padding:8px;background:var(--card-bg);border:${item.cursed ? '2px' : '1px'} solid ${cursedBorder};border-radius:var(--r-sm);margin-bottom:6px;display:flex;align-items:flex-start;gap:8px">
      <div style="flex:1">
        <strong>${typeEmoji} ${escapeHtml(item.name || 'Unnamed')}</strong>${cursedBadge}
        <small style="color:var(--text-muted)">— ${item.type}${craft}</small>${blessingsTag}${notes}
        ${qualitiesBlock}
      </div>
      <button onclick="removeMagicalItem(${i})" class="del-btn" style="font-size:var(--fs-md)">×</button>
    </div>`;
  }).join('');
}

async function unlockDormantQuality(itemIdx) {
  const item = char.magicalItems[itemIdx];
  if (!item || !Array.isArray(item.qualities)) return;
  const nextDormantIdx = item.qualities.findIndex(q => !q.active);
  if (nextDormantIdx < 0) { alert('No dormant qualities to unlock.'); return; }
  const q = item.qualities[nextDormantIdx];

  // A choice between two routes is two buttons, not "type 1 or 2".
  const method = await showModal({
    title: '🔓 Wake a dormant quality',
    message: `<strong>${escapeHtml(q.name)}</strong> on ${escapeHtml(item.name)}<br><small>${escapeHtml(q.description || '')}</small><br><br>How are you unlocking it?`,
    buttons: [
      { label: 'With a new Valour rank (instead of a Reward)', value: '1' },
      { label: 'By Visiting the Treasury (give up a Reward)', value: '2' },
      { label: 'Cancel', value: null, cancel: true }
    ]
  });
  if (method !== '1' && method !== '2') return;       // Cancel — nothing changes, nothing to say

  q.active = true;
  const methodLabel = method === '1' ? 'new Valour rank' : 'Visiting the Treasury';
  saveCharacter();
  render();
  alert(`✅ Unlocked: "${q.name}" on ${item.name}.\nMethod: ${methodLabel}.\n\n${q.description || ''}\n\nRemember: if you used Valour rank-up, you've forgone this rank's Reward pick. If Visiting Treasury, mark off the war gear Reward you gifted to your folk.`);
}

async function flyYouFools() {
  // Finding 11: this used to send you to the Dice tab to "roll your attack", where the foe's Parry
  // is not part of the TN — the same swing was TN 12 there and TN 17 here. The escape roll is now
  // made in place, against the engaged foe, with its Parry applied like any other attack.
  const foes = (typeof encEngagedFoes === 'function') ? encEngagedFoes() : [];
  const choice = await showModal({
    title: '🏃 Fly, You Fools!',
    message: 'Two ways to leave a fight:<br><br>' +
      ((char.flyPending && char.stance === 'rearward' && foes.length)
        ? '<strong>You fell back last round</strong> — your escape is owed. Take it now, without a roll.<br><br>'
        : '') +
      '<strong>Rearward</strong> — fall back now, and escape when your turn comes. No roll.<br><br>' +
      '<strong>Defensive</strong> — fight your way clear: make an attack roll. Success and you are away, ' +
      'dealing no damage; failure and you are still engaged.' +
      (foes.length ? '' : '<br><br><em>No foe is engaged with you right now, so the Defensive escape has nothing to roll against — it will just set your stance.</em>'),
    buttons: ((char.flyPending && char.stance === 'rearward' && foes.length)
        ? [{ label: '🏃 Slip away now (you fell back last round)', value: 'slip' }]
        : [])
      .concat([
        { label: '🛡 Fall back (Rearward)', value: 'rearward' },
        { label: '⚔️ Fight clear (Defensive)', value: 'defensive' },
        { label: 'Cancel', value: null, cancel: true }
      ])
  });
  if (choice === 'rearward') {
    char.stance = 'rearward';
    char.flyPending = true;                 // the escape is owed on your next action
    saveCharacter();
    render(); renderEncounter();
    alert('Stance set to Rearward.\n\nYou fall back this round. On your next action you leave the fight without a roll — tap 🏃 <strong>Slip away now</strong> when your turn comes. From Rearward you cannot attack or take a Combat Task.'.replace(/<\/?strong>/g, ''));
    return;
  }
  if (choice === 'slip') {
    // The promised escape, actually performed: disengage every foe and leave the encounter.
    const n = foes.length;
    foes.forEach(f => { f.engaged = false; });
    char.flyPending = false;
    if (typeof encDeriveEngaged === 'function') encDeriveEngaged();
    saveCharacter();
    if (typeof encLogRoll === 'function') encLogRoll(`<strong>You</strong> · 🏃 slipped away from the fight — no roll needed (Rearward)`);
    // Away is away: the fight is over for you, so the encounter ends with it.
    await endEncounter({ fled: true });
    alert(`🏃 You get away.\n\nYou break off from ${n === 1 ? 'your foe' : 'all ' + n + ' foes'} and leave the fight behind. The encounter is over.`);
    return;
  }
  if (choice !== 'defensive') return;   // Cancel, Escape, or a stray dismissal: say nothing, change nothing
  char.stance = 'defensive';
  saveCharacter();
  render();
  if (!foes.length) {
    requireStep('Stance set to Defensive — but no foe is engaged with you, so there is nothing to break away from.<br><br>Add the foe under <strong>Encounter</strong>, then tap 🏃 again and the escape roll will be made against it.', 'combat', 'encounter-card-wrap', '🏃 Nothing to escape from');
    return;
  }
  await _flyEscapeRoll(foes[0]);
}

/** The Defensive escape: a real attack roll against the foe, Parry and stance included. */
async function _flyEscapeRoll(foe) {
  const wpns = (typeof _equippedWeapons === 'function') ? _equippedWeapons() : [];
  if (!wpns.length) return requireStep('You need a weapon in hand to fight your way clear.<br><br>Pick one under <strong>War Gear</strong> on Hero → Gear.', 'gear', 'war-gear-card', '⚠️ No weapon equipped');
  const e = enc();
  const w = wpns[Math.min(e.weaponIdx || 0, wpns.length - 1)];
  const prof = w.prof;
  const profRating = (!prof || prof === 'Brawling') ? getBrawlingRating() : (parseInt((char.profs || {})[prof]) || 0);
  const engaged = encEngagedFoes().length;
  const dice = Math.max(0, profRating - engaged);     // Defensive: −1d per engaged foe
  const tn = (parseInt(char.strTN) || 0) + (parseInt(foe.parry) || 0);
  _suspendInlineEye(true);
  const roll = _doInlineRoll(dice, 'normal', tn);
  _suspendInlineEye(false);
  const score = roll.featSpecial === 'rune' ? '★' : (roll.featSpecial === 'eye' ? '✗' : roll.total);
  const escaped = roll.outcome.startsWith('SUCCESS');
  let line = `<strong>You</strong> · escape attempt · ${escapeHtml(w.name)} · ${score} vs TN ${tn} (${char.strTN} Str + Parry ${foe.parry}) · Def −${engaged}d → ${outcomeWords(roll.outcome)}`;
  if (escaped) {
    foe.engaged = false;
    line += ' · 🏃 <strong>you break away</strong> — no damage dealt';
  } else {
    line += ' · you remain engaged';
  }
  encDeriveEngaged();
  saveCharacter();
  encLogRoll(line);
  // Clear of every foe → the fight is over and the encounter ends. Another foe still on you → it goes on.
  const stillOn = encEngagedFoes().filter(f => f !== foe);
  if (escaped && !stillOn.length) {
    await endEncounter({ fled: true });
    alert(`🏃 You get away!\n\n${score} vs TN ${tn} — you fight clear of ${foe.name} and deal no damage. The encounter is over.`);
    return;
  }
  render(); renderEncounter();
  alert(escaped
    ? `🏃 Clear of ${foe.name}.\n\n${score} vs TN ${tn} — but ${stillOn.map(f => f.name).join(', ')} ${stillOn.length === 1 ? 'is' : 'are'} still on you. Try again on your next turn.`
    : `You are still engaged.\n\n${score} vs TN ${tn} — ${foe.name} keeps you pinned. You may try again on your next turn.`);
}

async function spendHopeToSupport() {
  const cur = parseInt(char.hopeCur) || 0;
  if (cur <= 0) { alert('No Hope to spend.'); return; }
  const focus = char.fellowshipFocus || '';
  const focusBit = focus ? `\n\nNote: if the ally you're supporting is your Fellowship Focus (${focus}), they gain +2d instead of +1d.` : '';
  // Reversible: it just happens, with Undo (GOTCHA 28).
  if (typeof snapshot === 'function') snapshot();
  char.hopeCur = cur - 1;
  saveCharacter();
  render();
  showToast(`Spent 1 Hope — your ally rolls +1d${focus ? ' (+2d if you are their Focus)' : ''}.`, { label: 'Undo', fn: () => undoLast() });
}

async function spendFPforHope() {
  // At a table the Company's Fellowship points are one shared pool (src/11-table.js).
  if (typeof tableActive === 'function' && tableActive() && !Sync.isLoremaster()) return tableSpendPool();
  const fp = parseInt(char.fellowship) || 0;
  if (fp <= 0) {
    alert('No Fellowship points to spend.\n\nEarned by rest scenes, certain virtues, or Strengthen Fellowship undertaking.');
    return;
  }
  const curHope = parseInt(char.hopeCur) || 0;
  const maxHope = parseInt(char.hopeMax) || 0;
  if (curHope >= maxHope) {
    alert('Hope is already at maximum.');
    return;
  }
  if (typeof snapshot === 'function') snapshot();
  char.fellowship = fp - 1;
  char.hopeCur = Math.min(maxHope, curHope + 1);
  saveCharacter();
  render();
  showToast(`Fellowship point spent: Hope ${curHope} → ${curHope + 1}. (Only during a rest.)`, { label: 'Undo', fn: () => undoLast() });
}

/* ---------- THE SAGA — starting, sustaining and ending a campaign ----------
   Every other subsystem here answers "how does this control work". None of them answered
   "how does a game begin, keep going between sessions, and finish". This does.
   Deliberately action-shaped rather than prose: each state offers the button that does the
   next thing, because fifteen passes of explanatory text did not close this gap. */

function sagaState() {
  if (!char.saga || typeof char.saga !== 'object') {
    char.saga = { started: false, premise: '', sessions: 0, adventures: 0, lastFpSession: 0, ended: false, endedHow: '' };
  }
  if (char.saga.lastFpSession === undefined) char.saga.lastFpSession = 0;
  if (!char.saga.step) char.saga.step = 'haven';
  return char.saga;
}

/* End-conditions worth offering. TOR2E ends a hero's story in a few honest ways; surface them
   only once the character has actually travelled far enough for the offer to mean something. */
function sagaEndSignals() {
  const s = sagaState(), out = [];
  const val = parseInt(char.valour) || 0, wis = parseInt(char.wisdom) || 0;
  if (char.retired) out.push('Your hero has already succumbed — the story has ended itself.');
  // Core Rules: a hero ending the Adventuring Phase with Shadow equal to their maximum Hope
  // "can be considered to have left the Company and are retired from the game." Scars count
  // as Shadow for every trigger (p.137), so they are included here.
  const shadowTotal = (parseInt(char.shadow) || 0) + (parseInt(char.scars) || 0);
  const hopeMax = parseInt(char.hopeMax) || 0;
  if (hopeMax && shadowTotal >= hopeMax) {
    out.push(`Shadow ${shadowTotal} has reached your maximum Hope (${hopeMax}) — by the rules your hero may leave the Company and retire.`);
  }
  // Moria states its own finish line, and the app already tracks Hardened allies.
  if (typeof isMoria === 'function' && isMoria()) {
    const hardened = ((char.band && char.band.allies) || []).filter(a => a && a.hardened).length;
    out.push(hardened >= 12
      ? `You have <strong>${hardened} Hardened Allies</strong> — the Band is complete. Undertake one final great mission into the depths, and that is your ending.`
      : `Moria ends when you have built a Band of <strong>twelve Hardened Allies</strong> and made a final great mission into the depths. You have ${hardened}.`);
  }
  if (val >= 5 || wis >= 5) out.push(`Valour ${val} / Wisdom ${wis} — your hero is near the height of what they can become.`);
  return out;
}

/** A suggested errand from the hero's Patron, if they have one. '' otherwise. */
function _patronQuestSeed() {
  const pk = (typeof patronKey === 'function') ? patronKey(char.patron) : char.patron;
  const quests = (typeof PATRON_QUESTS !== 'undefined' && pk) ? PATRON_QUESTS[pk] : null;
  return (quests && quests.length) ? quests[Math.floor(Math.random() * quests.length)] : '';
}

async function sagaBegin() {
  const s = sagaState();
  if (!char.culture) {
    return requireStep('Build a hero before beginning a saga — a story needs someone to be about.<br><br>Pick a <strong>Culture</strong> and <strong>Calling</strong> on the Build tab, or load a ready-made hero from ☰ Menu → ✨ Pre-generated Heroes.',
      'build', null, '⚠️ No hero yet');
  }
  // A premise comes from the Patron if there is one — that is what Patrons are FOR — otherwise
  // the player writes their own reason to leave home.
  const seed = _patronQuestSeed();
  const premise = await promptStyled(
    'What sends your hero out?<br><br>' +
    (seed ? `Your patron <strong>${escapeHtml(char.patron)}</strong> suggests:<br><em>${escapeHtml(seed)}</em><br><br>Keep it, or write your own.`
          : 'One sentence is enough — a rumour, a debt, a summons, a threat to somewhere you love.'),
    seed, '🗺️ Begin your saga', 'e.g. Word came that the road east is no longer safe…', 'Begin the saga');
  if (premise === null) return;
  s.started = true;
  s.premise = String(premise).trim() || seed || 'The road calls.';
  s.sessions = 0; s.adventures = 1; s.ended = false; s.endedHow = '';
  logTimeline('saga', 'Saga begins: ' + s.premise);
  saveCharacter();
  // In solo play, open the first scene so there is somewhere to write immediately.
  // Open the first scene so there is somewhere to write immediately. ensureActiveScene()/pushBlock()
  // are the real journal API — an earlier draft called a startScene() that does not exist.
  if (typeof isSolo === 'function' && isSolo() && typeof pushBlock === 'function') {
    try {
      const sc = ensureActiveScene();
      sc.title = 'The road begins';
      pushBlock('prose', 'note', s.premise, 'manual');
      saveJournal(); renderChronicle();
    } catch (e) {}
  }
  render();
  // No instruction dialog: the Play screen now shows exactly what to do next, and does the
  // rolling and the writing itself. (The old "Session one" dialog told players to ask the
  // Oracle and write in the Chronicle by hand — the opposite of what Play does for them.)
  if (typeof openNavGroup === 'function') openNavGroup('play');
  if (typeof renderPlay === 'function') renderPlay();
  if (typeof showToast === 'function') showToast('Your saga has begun.');
}

async function sagaStartSession() {
  const s = sagaState();
  s.sessions = (parseInt(s.sessions) || 0) + 1;
  saveCharacter(); render();
  // char.timeline is stored NEWEST-FIRST, so the three most recent events are the first
  // three. The old slice(-3).reverse() recapped the three OLDEST events in the campaign.
  const last = (char.timeline || []).slice(0, 3).map(t => '• ' + escapeHtml(t.text)).join('<br>');
  await alertStyled(
    `<strong>Session ${s.sessions}.</strong><br><br>` +
    (last ? `Last time:<br>${last}<br><br>` : '') +
    `Your reason for being out here:<br><em>${escapeHtml(s.premise || '—')}</em><br><br>` +
    'Open a scene, say where your hero is, and begin.',
    '📖 Session start');
}

async function sagaEndSession() {
  const s = sagaState();
  const solo = typeof isSolo === 'function' && isSolo();
  const banksXp = char.experienceMode !== 'milestone' && !solo;
  if (!await confirmStyled(
      'End this play session?<br><br>' +
      (banksXp
        ? 'You will be awarded the session\'s experience (+3 Skill Points, +3 Adventure Points), and told whether a '
        : 'You are on the <strong>Milestone</strong> experience scheme, so no session XP is awarded — award it with 🏆 Award Milestone XP when something notable happens. You will be told whether a ') +
      '<strong>Fellowship Phase</strong> is due — the rest between adventures where your hero heals and grows.',
      '🌙 End session', {yes:'End the session', no:'Keep playing'})) return;
  // Strider Mode advises AGAINST session-based XP for solo play: sessions "might last for a few
  // minutes or a few hours, which can make session-based rewards disconnected from events and
  // achievements in your story" — it recommends Experience Milestones instead. So only award
  // session XP when the hero is actually on that scheme.
  if (typeof awardSessionXP === 'function' && banksXp) {
    const orig = window.confirmStyled; window.confirmStyled = async () => true;
    try { await awardSessionXP(); } finally { window.confirmStyled = orig; }
  }
  saveCharacter(); render();
  // Core Rules pacing: "an Adventuring Phase will last two or three sessions of play, followed by
  // a Fellowship Phase". Prompt on that rhythm rather than on an XP threshold.
  const sinceFp = (parseInt(s.sessions) || 0) - (parseInt(s.lastFpSession) || 0);
  const due = sinceFp >= 2;
  await alertStyled(
    `<strong>Session ${s.sessions || 1} closed.</strong><br><br>` +
    (solo && char.experienceMode === 'milestone'
      ? 'Playing solo, award experience by <strong>Milestone</strong> rather than by session — sessions vary too much in length for session rewards to track what your hero actually achieved. Use <strong>🏆 Award Milestone XP</strong> on the Character tab when something notable happens.<br><br>'
      : '') +
    (due
      ? `That is ${sinceFp} sessions of adventuring. An Adventuring Phase normally runs <strong>two or three sessions</strong>, then a <strong>Fellowship Phase</strong> — a week to a season of rest, where Hope returns and experience is spent. This is a good moment for one.`
      : 'Pick up where you left off next time. Your Chronicle holds the thread.') +
    '<br><br>Next session, tap <strong>📖 Start session</strong> for a recap.',
    '🌙 Until next time');
}

async function sagaEnd() {
  const s = sagaState();
  const how = await promptStyled(
    'How does your hero\'s story end?<br><br>' +
    'There is no wrong answer. Common endings: they <em>retire</em> to the safe haven they fought for; ' +
    'they <em>fall</em>, and the Chronicle becomes their memorial; they <em>pass on</em> — sailing West, ' +
    'or going under the Mountain; or they simply <em>stop</em>, because the tale you wanted to tell is told.<br><br>' +
    'Write the last line.',
    '', '🏁 End your saga', 'e.g. He went home to Bree, and did not travel again.');
  if (how === null) return;
  s.ended = true;
  s.endedHow = String(how).trim() || 'The tale is told.';
  logTimeline('saga', 'Saga ends: ' + s.endedHow);
  saveCharacter();
  if (typeof isSolo === 'function' && isSolo() && typeof pushBlock === 'function') {
    try {
      journal.activeSceneId = null;            // force a fresh closing scene
      const sc = ensureActiveScene();
      sc.title = 'An ending';
      pushBlock('prose', 'note', s.endedHow, 'manual');
      saveJournal(); renderChronicle();
    } catch (e) {}
  }
  render();
  await alertStyled(
    `<strong>${escapeHtml(possessive(char.name || 'Your hero'))} tale is finished.</strong><br><em>${escapeHtml(s.endedHow)}</em><br><br>` +
    'Export the Chronicle from that tab to keep it. Your hero stays in the roster — nothing is deleted — ' +
    'and ☰ Menu → ➕ New Character begins the next one whenever you are ready.',
    '🏁 The tale is told');
}

async function sagaReopen() {
  if (!await confirmStyled('Continue this saga after all? The ending you wrote stays in the Chronicle.', '↩ Reopen', {yes:'Continue the saga', no:'Leave it ended'})) return;
  const s = sagaState(); s.ended = false; saveCharacter(); render();
}

/** A Bout of Madness you were owed but never answered. The prompt is a timed dialog; losing it
    used to strand the hero permanently. This puts a standing control on the Character tab. */
function renderBoutDue() {
  const host = document.getElementById('bout-due');
  if (!host) return;
  if (!char.boutDue || char.retired) { host.style.display = 'none'; host.innerHTML = ''; return; }
  host.style.display = 'block';
  host.innerHTML =
    '<p class="hint" style="text-align:left;margin:0 0 6px;line-height:1.5"><strong>⚠️ A Bout of Madness is owed.</strong> ' +
    'Your Shadow and Scars have filled your Hope. Face it: you take a Flaw from your Shadow Path, and your Shadow clears to 0.</p>' +
    '<button class="add-row-btn" style="width:100%;background:var(--btn-alert-bg);color:white" onclick="triggerBoutNow()">🌑 Face the Bout of Madness</button>';
}

/** Re-fire the Bout the player lost. */
async function triggerBoutNow() {
  char._boutPrompted = false;      // let checkAutoTriggers run it again
  saveCharacter();
  await checkAutoTriggers();
}

function renderSaga() {
  const host = document.getElementById('saga-card'); if (!host) return;
  const s = sagaState();
  const B = (fn, label, style) =>
    `<button class="add-row-btn" style="width:100%;margin-top:6px;${style || ''}" onclick="${fn}">${label}</button>`;

  if (!s.started) {
    host.innerHTML =
      '<h3 class="card-title" data-hint="Your saga">Your saga — not yet begun</h3>' +
      '<p class="hint" style="text-align:left;line-height:1.55;margin:0 0 8px">' +
      'A hero sheet is not a game. A game needs a <strong>reason to leave home</strong>. ' +
      'This sets one, opens your first scene, and tells you exactly what to do next.</p>' +
      B('sagaBegin()', '▶ Begin your saga', 'background:var(--gold);color:var(--ink)');
    return;
  }
  if (s.ended) {
    host.innerHTML =
      '<h3 class="card-title" data-hint="Your saga">Your saga — ended</h3>' +
      `<p class="hint" style="text-align:left;line-height:1.55;margin:0 0 8px"><em>${escapeHtml(s.endedHow)}</em><br><br>` +
      `${s.sessions || 0} session${s.sessions === 1 ? '' : 's'} · ${s.adventures || 0} adventure${s.adventures === 1 ? '' : 's'}.</p>` +
      B('sagaReopen()', '↩ Actually, continue it', 'background:var(--btn-secondary-bg);color:white');
    return;
  }
  const signals = sagaEndSignals();
  host.innerHTML =
    '<h3 class="card-title" data-hint="Your saga">Your saga</h3>' +
    `<p class="hint" style="text-align:left;line-height:1.55;margin:0 0 4px"><em>${escapeHtml(s.premise || '—')}</em></p>` +
    `<p class="hint" style="text-align:left;margin:0 0 8px;color:var(--text-faint)">Session ${s.sessions || 0}</p>` +
    B('sagaStartSession()', '📖 Start a session') +
    B('sagaEndSession()', '🌙 End this session', 'background:var(--btn-secondary-bg);color:white') +
    '<div style="border-top:1px dashed var(--border);margin:10px 0 6px"></div>' +
    (signals.length
      ? '<p class="hint" style="text-align:left;line-height:1.5;margin:0 0 6px">' +
        '<strong>This could be an ending.</strong><br>' + signals.map(x => '• ' + escapeHtml(x)).join('<br>') +
        '<br><br>Stopping well is part of playing well — a story that ends is better than one that fades.</p>'
      // The ending control used to render ONLY when the app judged an ending earned, while
      // its own dialog offered "or they simply stop, because the tale you wanted to tell is
      // told". Deciding a story is finished is the player's call, not the tracker's.
      : '<p class="hint" style="text-align:left;line-height:1.5;margin:0 0 6px">' +
        'No ending has been forced on you yet — but you can close the tale whenever you decide it is told.</p>') +
    B('sagaEnd()', '🏁 Bring your saga to a close',
      signals.length ? 'background:var(--btn-alert-bg);color:white' : 'background:var(--btn-secondary-bg);color:white');
}

/* ---------- THE ADVENTURE LOOP — which subsystem fires, and when ----------
   The saga card gives the campaign arc (begin → sessions → end). This gives the layer under it:
   the shape of ONE adventure, and therefore when the Journey / Council / Combat / Fellowship tabs
   are actually meant to come into play. That question — "after creating a character, where does
   the journey come in?" — had no answer anywhere in the app. */

const ADVENTURE_STEPS = [
  { id: 'haven', n: 1, name: 'At a Safe Haven',
    what: 'You start somewhere safe — a town, a hall, a homestead. Here you learn <em>why</em> you are about to leave: a patron\'s errand, a rumour, a threat to someone you care about.',
    doNow: 'Write the reason down in your Chronicle, and decide where it takes you.',
    tab: 'chronicle', tabLabel: 'Chronicle',
    next: 'haven → journey', nextLabel: '▶ We set out — begin the journey' },
  { id: 'journey', n: 2, name: 'On the road',
    what: 'Getting there is <strong>the Journey subsystem</strong>, not a scene you narrate away. Set the origin, destination and distance, then repeat: <strong>Marching Test</strong> to cover ground, <strong>Resolve Event</strong> when the road throws something at you.',
    doNow: 'Open the Journey tab, answer where, how far and how, and tap Set out.',
    tab: 'journey', tabLabel: 'Journey',
    next: 'journey → location', nextLabel: '▶ We have arrived' },
  { id: 'location', n: 3, name: 'At the place you travelled to',
    what: 'This is where the adventure actually happens: search the ruin, meet the people, find the thing. Talking your way through something formal — a plea, a bargain, a warning — is a <strong>Council</strong>. Everything else is ordinary skill rolls on the Dice tab.',
    doNow: 'Play out scenes in the Chronicle. Use the Dice tab for anything that could fail; the Council tab when the stakes are social and the outcome is in doubt.',
    tab: 'chronicle', tabLabel: 'Chronicle',
    next: 'location → home', nextLabel: '▶ Our business here is done' },
  { id: 'home', n: 4, name: 'The road home',
    what: 'Another Journey, back the way you came or onward to the next place. Same subsystem, and the Shadow you picked up travels with you.',
    doNow: 'Journey tab again — new origin and destination.',
    tab: 'journey', tabLabel: 'Journey',
    next: 'home → fellowship', nextLabel: '▶ We are safe again' },
  { id: 'fellowship', n: 5, name: 'Fellowship Phase',
    what: 'After <strong>two or three sessions</strong> of the above, the adventure closes and your hero rests — a week to a whole season. This is the <em>only</em> time Hope comes back properly and experience is spent.',
    doNow: 'Open the Fellowship Phase wizard from the Advancement card, or the Moria rest card on the Band tab.',
    tab: 'character', tabLabel: 'Character',
    next: 'fellowship → haven', nextLabel: '▶ Begin the next adventure' }
];

function advStep() { return ADVENTURE_STEPS.find(x => x.id === sagaState().step) || ADVENTURE_STEPS[0]; }

async function advGoTo(stepId) {
  const s = sagaState();
  if (stepId === 'haven' && s.step === 'fellowship') {
    s.adventures = (parseInt(s.adventures) || 0) + 1;
    if (typeof logTimeline === 'function') logTimeline('saga', `Adventure ${s.adventures} begins.`);
  }
  s.step = stepId;
  saveCharacter(); render();
  const st = advStep();
  await alertStyled(
    `<strong>${st.n} · ${st.name}</strong><br><br>${st.what}<br><br><strong>Do now:</strong> ${st.doNow}`,
    '🧭 ' + st.name);
}

function renderAdventureLoop() {
  const host = document.getElementById('adventure-loop'); if (!host) return;
  const s = sagaState();
  if (!s.started || s.ended) { host.style.display = 'none'; host.innerHTML = ''; return; }
  host.style.display = 'block';
  const cur = advStep();
  const dots = ADVENTURE_STEPS.map(x =>
    `<span style="font-size:var(--fs-xs);padding:2px 7px;border-radius:var(--r-sm);margin:0 3px 4px 0;display:inline-block;` +
    (x.id === cur.id
      ? 'background:var(--gold);color:var(--ink);font-weight:700'
      : 'background:var(--bg-deep);color:var(--text-muted);cursor:pointer') + '"' +
    (x.id === cur.id ? '' : ` onclick="advGoTo('${x.id}')"`) + `>${x.n} ${escapeHtml(x.name)}</span>`).join('');
  host.innerHTML =
    '<h3 class="card-title" data-hint="The adventure loop">Where you are in the adventure</h3>' +
    `<div style="margin:0 0 8px">${dots}</div>` +
    `<p class="hint" style="text-align:left;line-height:1.55;margin:0 0 6px"><strong>${cur.n} · ${escapeHtml(cur.name)}</strong><br>${cur.what}</p>` +
    `<p class="hint" style="text-align:left;line-height:1.5;margin:0 0 8px"><strong>Do now:</strong> ${cur.doNow}</p>` +
    `<button class="add-row-btn" style="width:100%;margin-bottom:6px" onclick="document.querySelector('.tab[data-tab=${cur.tab}]').click()">→ Open the ${escapeHtml(cur.tabLabel)} tab</button>` +
    `<button class="add-row-btn" style="width:100%;background:var(--gold);color:var(--ink)" onclick="advGoTo('${cur.next.split(' → ')[1] === 'haven' ? 'haven' : cur.next.split(' → ')[1]}')">${escapeHtml(cur.nextLabel)}</button>` +
    '<p class="hint" style="text-align:left;line-height:1.5;margin:10px 0 0;border-top:1px dashed var(--border);padding-top:8px">' +
    '<strong>Combat is not a step.</strong> A fight can break out at any point above — on the road, in the ruin, at the gate. When one starts, go to the <strong>Combat</strong> tab, run it, then come back to where you were. Councils work the same way.</p>';
}

/* ============================================================================
   PLAY MODE — the app runs the session, turn by turn.
   ----------------------------------------------------------------------------
   Everything before this POINTED at tabs ("open the Journey tab and fill it in").
   Three rounds of feedback said the same thing: that is still homework. This screen
   DRIVES instead — it states what is happening in plain language, offers a handful of
   concrete choices, performs the underlying rolls/subsystems itself, narrates the
   outcome, and moves to the next moment. No rulebook, no tab-hunting, no jargon
   required to play a whole session.
   ============================================================================ */

let _playFeed = [];           // narration lines, newest last
let _playBusy = false;

function playSay(text, kind, plain) {
  _playFeed.push({ text, kind: kind || 'story' });
  if (_playFeed.length > 40) _playFeed.shift();
  // Asides are the app talking to the player ("Read those as a rumour…"), not events in the
  // hero's life. They stay on screen and out of the journal.
  if (kind === 'aside') return;
  // Everything the app narrates is also written into the Chronicle, so the journal
  // fills itself for a player who never opens that tab.
  try { if (typeof pushBlock === 'function' && isSolo()) pushBlock('auto', 'note', plain || _playPlainText(text), 'play'); } catch (e) {}
}

/** HTML the Play tab narrates → the plain prose the Chronicle stores.
    Stripping tags alone left `&#39;` in the journal and welded sentences together where a
    <br> had been the only separator, so strip to text and then decode the entities. */
function _playPlainText(html) {
  const withBreaks = String(html == null ? '' : html)
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|li|h[1-6])>/gi, ' ')
    .replace(/<[^>]+>/g, '');
  let out = withBreaks;
  try {
    const d = document.createElement('textarea');
    d.innerHTML = withBreaks;
    out = d.value;
  } catch (e) {
    out = withBreaks
      .replace(/&#0*39;|&apos;|&#x0*27;/gi, "'")
      .replace(/&quot;|&#0*34;/gi, '"')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
      .replace(/&amp;/gi, '&');
  }
  return out.replace(/[ \t]+/g, ' ').trim();
}

function playClearFeed() { _playFeed = []; }

/** Open a fresh Chronicle scene at a natural break in the Play loop. A whole campaign played from
    ▶ Play used to land in one undifferentiated scene, because nothing here ever started a new one. */
function playScene(title) {
  if (typeof isSolo !== 'function' || !isSolo()) return;
  if (typeof ensureActiveScene !== 'function' || typeof journal === 'undefined' || !journal) return;
  try {
    ensureActiveScene();                       // guarantees journal.scenes/clock are usable
    const sc = { id: genCharId(), title: String(title || '').trim() || `${ordinal(journal.clock.day)} ${journal.clock.month}`,
                 date: { ...journal.clock }, ts: nowStamp(), state: captureState() };
    journal.scenes.push(sc);
    journal.activeSceneId = sc.id;
    saveJournal();
    if (typeof renderChronicle === 'function') renderChronicle();
  } catch (e) {}
}

/* ---- the moment-to-moment script ---------------------------------------- */

/** "a Awareness roll" — the app names skills that start with a vowel. */

function _playSituation() {
  const s = sagaState();
  const where = char.safeHaven || 'your home';
  switch (s.step) {
    case 'haven': {
      const jh = char.journey || {};
      if (jh.active) return { title: 'On the road' + (jh.destination ? ' to ' + escapeHtml(jh.destination) : ''),
        text: `A journey is already under way — <strong>${parseInt(jh.currentHex) || 0}</strong> of <strong>${parseInt(jh.totalHexes) || 0}</strong> stretches covered. ` +
              'Tap <strong>Back to the road</strong> to carry on with it.' };
      return { title: 'At ' + escapeHtml(where),
        text: 'You are somewhere safe. Nothing is trying to kill you yet.<br><br>' +
              (typeof isMoria === 'function' && isMoria()
                ? (moriaBandReady()
                    ? `Your Band: <strong>${(char.band.allies || []).filter(a => !a.outOfAction).length}</strong> dwarves ready${char.mission && char.mission.active ? ', the mission planned' : ' — the mission is not planned yet'}.<br><br>`
                    : 'You have no Band yet. In Moria nobody goes into the dark alone.<br><br>')
                : '') +
              (s.premise ? 'Why you are about to leave: <em>' + escapeHtml(s.premise) + '</em>' : 'You have no errand yet — ask around, and one will find you.') };
    }
    case 'journey':
      const j = char.journey || {};
      return { title: 'On the road' + (j.destination ? ' to ' + escapeHtml(j.destination) : ''),
        text: j.active
          ? _playRoadLine(j) +
            (_playEventDue() ? '<br><strong style="color:var(--error-text)">The road has something waiting for you here.</strong>' : '')
          : (j.destination
              ? 'The road is behind you — you finished this journey on the Journey tab. Tap <strong>We have arrived</strong> to carry on.'
              : 'You are ready to travel, but have not set out yet.') };
    case 'location':
      const j2 = char.journey || {};
      const chm = _playChamberHere();
      return { title: 'At ' + escapeHtml(j2.destination || 'the place you came to'),
        text: (typeof isMoria === 'function' && isMoria())
          ? (chm ? escapeHtml(chamberLine(chm)) + (chm.band && !chm.met ? ' <strong>An Orc-band holds it.</strong>' : '')
                 : 'You have come into the deep places. In Moria you explore <strong>chamber by chamber</strong> — tap <strong>Go on to the next chamber</strong> to see what lies ahead.')
          : 'You have arrived. This is where the thing you came for is — or is not.' };
    case 'home': {
      const jh2 = char.journey || {};
      return { title: 'The road home',
        text: jh2.active
          ? _playRoadLine(jh2) +
            (_playEventDue() ? '<br><strong style="color:var(--error-text)">The road has something waiting for you here.</strong>' : '')
          : 'You turn back the way you came, carrying whatever you found — and whatever found you.' };
    }
    case 'fellowship':
      return { title: 'Safe again, at ' + escapeHtml(where),
        text: 'The adventure is over. Time to rest properly, spend what you have earned, and let the Shadow ebb.' };
  }
  return { title: 'Somewhere', text: '' };
}

/** The one line under the road's title: Travel Fatigue so far, when there is any. Distance and
    day are the map's caption — they used to be printed here as well, and again in every march. */
function _playRoadLine(j) {
  const tf = parseInt(j.travelFatigue) || 0;
  return tf ? `Travel Fatigue so far: <strong>${tf}</strong> — it lands on you when you arrive.` : '';
}

function _playRetiredSituation() {
  return { title: escapeHtml(char.name || 'Your hero') + ' has left the story',
    text: escapeHtml(char.retiredReason || 'This hero is retired from play.') +
          '<br><br>Nothing more is asked of them. Their tale is on the Character tab, and the Chronicle keeps what they did.' };
}

function _playChoices() {
  const C = (label, fn, hint) => ({ label, fn, hint });
  // At 0 Endurance nothing else is the right move. Lead with the things that fix it.
  const lead = [];
  if ((parseInt(char.endCur) || 0) <= 0) {
    lead.push(C('🌙 Rest until you can stand', 'playRest()', 'A Prolonged Rest — the way out of Dying.'));
    if (char.wounded) lead.push(C('🩹 Tend the wound', 'playFirstAid()', 'A HEALING roll against your injury.'));
  } else if (char.wounded) {
    lead.push(C('🩹 Tend the wound', 'playFirstAid()', 'A HEALING roll — a Wound will not rest off.'));
  }
  // Things the rules owe the hero lead too: they lived only inside the Character tab's Edit
  // form, so a player who never opened Edit never saw them.
  lead.unshift(...owedChoices(C));
  // Whatever is running on another tab leads here, so Play never forgets a fight, a council or a
  // task you started (it used to carry on as if nothing were happening).
  if (!char.retired) {
    const standing = _playFoesStanding();
    if (standing && !_playFightable()) lead.unshift(C('⚔️ Back to the fight', "playGoTab('combat')", `${standing} foe${standing === 1 ? '' : 's'} still standing.`));
    if (char.council && char.council.active) lead.push(C('🗣 Back to the council', "playOpenScene('council')", char.council.topic || 'The council is still in session.'));
    if (char.skillEndeavour && char.skillEndeavour.active) lead.push(C('🛠 Back to the task', "playOpenScene('endeavour')", char.skillEndeavour.task || 'The task is not done yet.'));
  }
  const all = lead.concat(_playStepChoices());
  // The Oracle is always one tap away on Play: a yes/no question, with the odds you choose.
  if (!char.retired && !all.some(c => c.fn === 'playAsk()')) all.push(C('🔮 Ask the Oracle', 'playAsk()', 'A yes/no question for the world — you choose the odds.'));
  return all;
}
/** What the rules owe the hero right now — a Bout of Madness, a Revelation Episode, a Reward or
    Virtue from a rank already paid for. One list, shown on ▶ Play and on the hero sheet. */
function owedChoices(C) {
  C = C || ((label, fn, hint) => ({ label, fn, hint }));
  if (char.retired) return [];
  const out = [];
  if (char.boutDue) out.push(C('🌑 Face the Bout of Madness', 'triggerBoutNow()', 'Your Shadow has filled your Hope — take a Flaw, and the Shadow clears.'));
  if (typeof isSolo === 'function' && isSolo() && typeof huntThreshold === 'function') {
    const hunt = huntThreshold(char), ea = parseInt(char.eyeAwareness) || 0;
    if (hunt > 0 && ea >= hunt) out.push(C('👁 The Eye finds you', 'rollRevelationEpisode()', `Eye Awareness ${ea} has reached the Hunt (${hunt}) — a Revelation Episode.`));
  }
  const r = parseInt(char.pendingRewards) || 0, v = parseInt(char.pendingVirtues) || 0;
  if (r) out.push(C(`🎁 Choose your Reward${r > 1 ? ` (${r})` : ''}`, 'openNewReward()', 'A rank of Valour you have already earned.'));
  if (v) out.push(C(`✨ Choose your Virtue${v > 1 ? ` (${v})` : ''}`, 'openNewVirtue()', 'A rank of Wisdom you have already earned.'));
  return out;
}
function _playFoesStanding() {
  try { const e = typeof enc === 'function' ? enc() : char.encounter; if (!e || e.active === false) return 0; return (e.foes || []).filter(f => !f.slain).length; } catch (e) { return 0; }
}
function playRollNote(label, total, tn, outcome, icons) {
  const panel = document.getElementById('panel-play');
  if (!panel || !panel.classList.contains('active') || !(char.saga && char.saga.started)) return;
  if (typeof tableActive === 'function' && tableActive()) return;
  const ok = /^SUCCESS/.test(String(outcome));
  playNote(`<strong>${escapeHtml(String(label).replace(/\s+[✨🌲★].*$/, ''))}</strong> — ${total} vs ${tn}: ` +
    (ok ? '<strong style="color:var(--success-text)">success</strong>' : '<strong style="color:var(--error-text)">failure</strong>') + (icons ? ` (${icons} ✦)` : '') + '.');
  if (typeof renderPlay === 'function') renderPlay();
}
function playGoTab(t) { if ((t === 'combat' || t === 'battle') && _playFightable()) t = 'play'; if (typeof _goTab === 'function') _goTab(t); }
/* ---------- Fights and Battles on ▶ Play ----------
   A fight (or a Moria Battle) is run inside Play: the Stance, the Encounter and the Battle cards are
   moved into Play while one is under way and moved back home when it ends or the Combat / Battle tab
   is opened. One set of cards, so every control, guard and renderer is the same as on its own tab. */
function _playFightable() {
  if (!(char.saga && char.saga.started) || char.saga.ended) return false;
  if (typeof tableActive === 'function' && tableActive()) return false;
  if (typeof encShared === 'function' && encShared()) return false;
  return true;
}
function _playFightOn() { return _playFightable() && !char.retired && (_playFoesStanding() > 0 || !!(char.battle && char.battle.active)); }
/* Councils, Skill Endeavours and the Fellowship Phase are scenes on ▶ Play in the same way: their
   cards are moved in while the scene is open (saga.scene) and home again when it closes. */
const PLAY_SCENES = {
  council:   { label: 'A council', ids: ['council-setup-card', 'council-active-card', 'council-log-card'], done: () => !!(char.council && !char.council.active && char.council.outcome) },
  endeavour: { label: 'A long, hard task', ids: ['se-setup-card', 'se-active-card', 'se-log-card'], done: () => !!(char.skillEndeavour && !char.skillEndeavour.active && char.skillEndeavour.outcome) },
  fp:        { label: 'The Fellowship Phase', ids: ['fp-wizard-box'], done: () => false },
  mfp:       { label: 'The Fellowship Phase', ids: ['band-fp-card'], done: () => false }
};
const FIGHT_IDS = ['battle-active-card', 'stance-card', 'encounter-card-wrap'];
function _playSceneNow() {
  if (!_playFightable()) return null;
  if (_playFightOn()) return 'fight';
  const k = sagaState().scene;
  return PLAY_SCENES[k] ? k : null;
}
function playOpenScene(kind) {
  if (!_playFightable()) return playGoTab(kind === 'endeavour' ? 'council' : kind === 'mfp' ? 'band' : kind);
  sagaState().scene = kind; saveCharacter();
  if (kind === 'council' || kind === 'endeavour') {
    const running = kind === 'council' ? (char.council && (char.council.active || char.council.outcome)) : (char.skillEndeavour && (char.skillEndeavour.active || char.skillEndeavour.outcome));
    if (!running && typeof pickCouncilKind === 'function') pickCouncilKind(kind);
  }
  _goTab('play'); renderPlay();
  window.scrollTo(0, 0);
}
function playEndScene() {
  const k = sagaState().scene;
  if (k === 'fp' && document.getElementById('fp-wizard-box') && typeof fpState !== 'undefined' && fpState) { fpClose(); return; }
  sagaState().scene = null; saveCharacter(); renderPlay();
}
/** The setup tabs say so when what they hold is being played on ▶ Play, with one tap back there. */
const ON_PLAY_TABS = {
  combat:  () => _playFoesStanding() > 0 && 'This fight is being fought on ▶ Play.',
  battle:  () => !!(char.battle && char.battle.active) && 'This battle is being led on ▶ Play.',
  council: () => ((char.council && char.council.active) || (char.skillEndeavour && char.skillEndeavour.active)) && 'This is being played on ▶ Play.',
  journey: () => !!(char.journey && char.journey.active) && 'This journey is being travelled on ▶ Play.'
};
function renderOnPlayBanner(tab) {
  Object.keys(ON_PLAY_TABS).forEach(t => {
    const panel = document.getElementById('panel-' + t); if (!panel) return;
    let el = panel.querySelector(':scope > .on-play');
    const msg = (t === tab || tab === undefined) && _playFightable() ? ON_PLAY_TABS[t]() : '';
    if (!msg) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement('div'); el.className = 'card callout on-play'; panel.insertBefore(el, panel.firstElementChild); }
    const scene = t === 'council' ? ((char.council && char.council.active) ? "playOpenScene('council')" : "playOpenScene('endeavour')") : "_goTab('play')";
    el.innerHTML = `<span>${msg}</span><button type="button" class="btn" onclick="${scene}">Play it there</button>`;
  });
}
const _fightHomes = {};
function _placeFight() {
  const slot = document.getElementById('play-fight'); if (!slot) return false;
  const act = document.querySelector('.tab.active');
  const kind = (!act || act.dataset.tab === 'play') ? _playSceneNow() : null;
  const want = {};
  FIGHT_IDS.forEach(id => { want[id] = false; });
  Object.values(PLAY_SCENES).forEach(sc => sc.ids.forEach(id => { want[id] = false; }));
  if (kind === 'fight') { want['battle-active-card'] = !!(char.battle && char.battle.active); want['stance-card'] = want['encounter-card-wrap'] = _playFoesStanding() > 0; }
  else if (kind) PLAY_SCENES[kind].ids.forEach(id => { want[id] = true; });
  Object.keys(want).forEach(id => {
    const el = document.getElementById(id); if (!el) return;
    // a marker stays where the card lives, so it always goes back to exactly that place
    if (!_fightHomes[id] && el.parentNode !== slot) { const m = document.createComment('home:' + id); el.parentNode.insertBefore(m, el); _fightHomes[id] = m; }
    if (want[id]) { if (el.parentNode !== slot) slot.appendChild(el); }
    else if (el.parentNode === slot && _fightHomes[id]) _fightHomes[id].parentNode.insertBefore(el, _fightHomes[id]);
  });
  const on = !!kind;
  slot.hidden = !on;
  const pp = document.getElementById('panel-play');
  if (pp) { pp.classList.toggle('in-fight', on); pp.dataset.scene = kind || ''; }
  window._playFightPlaced = on;
  window._playSceneKind = kind;
  return on;
}
/** Something that finished on another tab is told in the Play story too. */
function playNote(text) {
  if (typeof _playFeed === 'undefined' || !(char.saga && char.saga.started)) return;
  _playFeed.push({ text, kind: 'story' });
  if (_playFeed.length > 40) _playFeed.splice(0, _playFeed.length - 40);
}

/** The choices offered while a journey is under way. ONE function for both legs: the outbound
    road and the road home run the same subsystem, and keeping two copies is exactly how the
    return leg ended up with no Journey Events at all while the outbound leg had them. */
function _playRoadChoices(C, homeward) {
  const jc = char.journey || {};
  const camp = C('🔥 Make camp', 'playRest()', 'Stop for the night and recover.');
  // An event due at this hex BLOCKS the road (the Journey tab enforces the same order).
  // Play used to sail past it entirely — `applyMarchingTestResult` sets `nextEventHex`
  // and nothing here read it, so a player taking "you never need the other tabs" at its
  // word never met a single Journey Event: the whole pressure mechanic of TOR2E travel.
  if (_playEventDue()) return [
    C('⚠️ Something happens on the road', 'playEvent()', 'Resolve it before you travel on.'),
    camp
  ];
  if (jc.pendingScene) return SCENE_WAYS.map(([k, l, h]) => C(l, `meetScene('${k}')`, h));
  if (jc.pendingEventRoll && jc.pendingEventRoll.skill) return [
    C(`🎲 Roll ${jc.pendingEventRoll.skill}`, 'playEventRoll()', 'The road is asking something of you.'),
    C('↷ Let it happen', 'playEventSkip()', 'Skip the roll and take what comes.')
  ];
  // A Perilous Area set on the Journey tab (or by the map) adds its own events; Play offers them too.
  const peril = parseInt(jc.perilEventsRemaining) || 0;
  const perilC = peril > 0 ? [C(`⚠️ Face the perilous area (${peril} left)`, 'playPeril()', 'A Perilous Area brings extra Journey Events.')] : [];
  const attack = C('⚔️ Something attacks!', 'playFight()', 'Fights can break out on the road too.');
  // At the end of the road there is no "onward": arriving leads.
  if ((parseInt(jc.currentHex) || 0) >= (parseInt(jc.totalHexes) || 1)) return homeward
    ? [C('🏠 We are safe again', 'playArriveHome()', 'You are home.'), ...perilC, camp, attack]
    : [C('🏁 We have arrived', 'playArrive()', 'The place you were making for is in sight.'), ...perilC, camp, attack];
  return homeward
    ? [
      C('🥾 Travel onward', 'playTravel()', 'Cover ground on the way back.'),
      ...perilC, camp, attack,
      C('🏠 We are safe again', 'playArriveHome()', 'You are home.')
    ]
    : [
      C('🥾 Travel onward', 'playTravel()', 'Cover ground. The road may interrupt you.'),
      ...perilC, camp, attack,
      C('🏁 We have arrived', 'playArrive()', 'End the journey here.')
    ];
}

function _playStepChoices() {
  const s = sagaState();
  const C = (label, fn, hint) => ({ label, fn, hint });
  // A retired hero takes no more actions. Play used to offer "⚔️ Something attacks!" to someone
  // the header was already labelling RETIRED.
  if (char.retired) return [
    C('📖 Read the ending', "document.querySelector('.tab[data-tab=character]').click()", char.retiredReason || 'This hero has left the story.'),
    C('👥 Play someone else', 'openRoster()', 'Switch to another hero, or make a new one.')
  ];
  switch (s.step) {
    case 'haven': {
      // A journey started on the Journey tab leaves the step on 'haven'. Say so here rather than
      // insisting the hero is "somewhere safe" while a march is under way.
      const jh = char.journey || {};
      if (jh.active) return [
        C('🥾 Back to the road', "playGoStep('journey')", `Your journey to ${jh.destination || 'somewhere'} is under way — ${parseInt(jh.currentHex) || 0}/${parseInt(jh.totalHexes) || 0} hexes.`),
        C('👂 Ask around for news', 'playAskAround()', 'The world tells you something you did not know.'),
        C('🌙 Rest here a while', 'playRest()', 'Recover Endurance and Hope before you go.')
      ];
      if (typeof isMoria === 'function' && isMoria() && (!moriaBandReady() || !(char.mission && char.mission.active))) return [
        C(moriaBandReady() ? '🗺️ Plan the mission' : '⛏️ Gather your Band', 'playSetOut()',
          moriaBandReady() ? 'How many go, how armed — it sets the Band\'s Dispositions and the Eye.' : 'In Moria you never go alone: roll the dwarves who travel with you.'),
        C('👂 Ask around for news', 'playAskAround()', 'The world tells you something you did not know.'),
        C('🌙 Rest here a while', 'playRest()', 'Recover Endurance and Hope before you go.')
      ];
      return [
        C('👂 Ask around for news', 'playAskAround()', 'The world tells you something you did not know.'),
        C('🥾 Set out on the road', 'playSetOut()', 'Begin the journey to wherever this takes you.'),
        C('🌙 Rest here a while', 'playRest()', 'Recover Endurance and Hope before you go.')
      ];
    }
    case 'journey': {
      const jc = char.journey || {};
      if (jc.active) return _playRoadChoices(C, false);
      // A journey finished on the Journey tab clears `active`. Without this branch the Play
      // tab offered only "Set out" and "Go back", and step 3 was unreachable from the very
      // surface that promises you never need another tab.
      if (jc.destination) return [
        C('🏁 We have arrived', 'playArrive()', 'You finished the road on the Journey tab — carry on from here.'),
        C('🥾 Set out somewhere else', 'playSetOut()', 'Pick a different destination.'),
        C('↩ Go back to the haven', "playGoStep('haven')", '')
      ];
      return [
        C('🥾 Set out on the road', 'playSetOut()', 'Choose where you are going.'),
        C('↩ Go back to the haven', "playGoStep('haven')", '')
      ];
    }
    case 'location': return [
      ..._playMoriaChamberChoices(C),
      C('👀 Look around', 'playLookAround()', 'What is here? The Oracle answers.'),
      C('🎯 Try something', 'playAttempt()', 'Search, climb, persuade, sneak — anything that could fail.'),
      C('🔮 Ask a yes/no question', 'playAsk()', 'When you need the world to decide something.'),
      C('🗣 Win someone over', "playCouncil('council')", 'A Council — when the stakes are social.'),
      C('🛠 A long, hard task', "playCouncil('endeavour')", 'A Skill Endeavour — search, build, mend over several tries.'),
      C('⚔️ Something attacks!', 'playFight()', 'Pick the foe; the fight is fought right here.'),
      C('✅ Our business here is done', "playGoStep('home')", '')
    ];
    case 'home': return (char.journey && char.journey.active)
      ? _playRoadChoices(C, true)
      : [
        // Arriving cleared the outbound journey, so "Travel onward" had nothing to travel and
        // answered "You are not travelling yet" every time. Set out for home instead.
        C('🥾 Set out for home', 'playSetOutHome()', 'Begin the road back.'),
        C('🏠 We are safe again', "playGoStep('fellowship')", 'Skip the return road.')
      ];
    case 'fellowship': return [
      C('🌿 Take a Fellowship Phase', 'playFellowship()', 'Rest, recover Hope, spend experience.'),
      C('▶ Begin the next adventure', 'playNextAdventure()', 'Back to the haven, with a new reason to leave.')
    ];
  }
  return [];
}

/* ---- the actions -------------------------------------------------------- */

async function playAskAround() {
  const row = _randomLoreRow();
  const words = `${row.action} · ${row.aspect} · ${row.focus}`;
  playSay(`You listen at the fire and in the doorways. The Oracle gives three words for the news you hear: <strong>${escapeHtml(words)}</strong>.`);
  playSay(`<em>Read those as a rumour. If they mean nothing to you, tap again — that is allowed.</em>`, 'aside');
  renderPlay();
}

async function playAsk() {
  const q = await promptStyled('Ask the world a <strong>yes or no</strong> question.<br><br>Phrase it so that <strong>“yes” is what your hero would want</strong>.',
    '', '🔮 Ask the Oracle', 'e.g. Is the gate unguarded?');
  if (q === null) return;
  // The odds band is the whole point of the Telling Table — the Oracle tab says so — and Play used
  // to hard-code Middling, so from here you could never ask an unlikely question.
  const chance = await showModal({
    title: '🔮 How likely is that?',
    message: `<em>${escapeHtml(q)}</em><br><br>Judge it from the story so far. The less likely, the higher the Feat die must roll.`,
    buttons: [
      { label: 'Almost certain', value: 'certain' },
      { label: 'Likely', value: 'likely' },
      { label: 'Middling', value: 'middling' },
      { label: 'Doubtful', value: 'doubtful' },
      { label: 'Unthinkable', value: 'unthinkable' }
    ]
  });
  if (!chance) return;
  const res = _tellingResult(q, chance);     // this already writes the structured Q: line
  // …so narrate to the feed only, or the Chronicle gets the same ask twice.
  _playFeed.push({ text: `You wonder: <em>${escapeHtml(q)}</em> <span style="opacity:.7">(${chance})</span><br>The answer is <strong>${res.answer}</strong>${escapeHtml(res.twist)}.`, kind: 'story' });
  renderPlay();
}

async function playLookAround() {
  const row = _randomLoreRow();
  playSay(`You take the place in. The Oracle gives three words for what stands out here: <strong>${escapeHtml(row.action)} · ${escapeHtml(row.aspect)} · ${escapeHtml(row.focus)}</strong>.`);
  playSay('<em>They are a prompt, not a rule: decide what they describe in this place, then act on it.</em>', 'aside');
  renderPlay();
}

/* Plain-language actions mapped to skills, so the player never picks a "skill" —
   they pick a thing a person would do. */
/* Each attempt says what success and failure MEAN for that attempt. "Move unseen — it doesn't"
   left the player asking whether they moved, or were seen, or neither. */
const PLAY_ATTEMPTS = [
  { label: '🔍 Search the place',        skill: 'Scan',      ok: 'You find what is here to be found.',        fail: 'You find nothing — or miss what matters.' },
  { label: '👁 Watch for danger',        skill: 'Awareness', ok: 'You spot the danger before it spots you.',  fail: 'You miss the signs. Trouble may catch you unawares.' },
  { label: '🧗 Climb, force or heave',   skill: 'Athletics', ok: 'You manage it — up, through or aside.',     fail: 'It is too much for you, or you slip.' },
  { label: '🤫 Move unseen',             skill: 'Stealth',   ok: 'You slip by unseen. No one notices you.',  fail: 'You are noticed — someone sees or hears you.' },
  { label: '🗣 Talk them round',         skill: 'Persuade',  ok: 'They come round to your view.',             fail: 'They are not convinced.' },
  { label: '📜 Remember a tale of this', skill: 'Lore',      ok: 'You remember something useful about it.',   fail: 'Nothing useful comes to mind.' },
  { label: '🧭 Find the way',            skill: 'Explore',   ok: 'You find the way.',                          fail: 'You lose your way.' },
  { label: '🩹 Tend a wound',            skill: 'Healing',   ok: 'Your care helps.',                           fail: 'Your care does not help this time.' }
];

async function playAttempt() {
  const pick = await showModal({
    title: '🎯 What do you do?',
    message: 'Pick the closest thing. The app works out which dice to roll.',
    buttons: PLAY_ATTEMPTS.map(a => ({ label: a.label, value: a.skill })).concat([
      { label: 'Never mind', value: null, style: 'background:var(--btn-secondary-bg);color:white;border:1px solid var(--btn-secondary-bg);border-radius:var(--r-sm);padding:10px;font-size:var(--fs-md);cursor:pointer' }
    ])
  });
  if (!pick) return;
  const sk = _heroSkill(pick);
  const r = _doInlineRoll(sk.rating, sk.favoured ? 'fav' : 'normal', sk.tn, `${pick} · ${(PLAY_ATTEMPTS.find(a => a.skill === pick) || {}).label || pick}`);
  const ok = String(r.outcome).startsWith('SUCCESS');
  const entry = PLAY_ATTEMPTS.find(a => a.skill === pick) || { label: pick };
  // What happened, in words about this attempt; the dice as a pill after it.
  const said = ok ? (entry.ok || 'You succeed.') : (entry.fail || 'You fail.');
  const great = ok && r.icons ? ` ${r.icons >= 2 ? 'An extraordinary success' : 'A great success'} (${r.icons} ✦).` : '';
  playSay(`<strong>${escapeHtml(entry.label.replace(/^\S+\s/u, ''))}:</strong> ` +
    `<strong style="color:var(${ok ? '--success-text' : '--error-text'})">${escapeHtml(said)}</strong>${great} ${_pillText(pick, r.total, sk.tn, ok)}`);
  playSay(ok
    ? '<em>Say what success looks like, then keep going.</em>'
    : '<em>Say what goes wrong. A failure should cost something or change the situation — it is not just "nothing happens".</em>', 'aside');
  renderPlay();
}

async function playTravel() {
  if (!char.journey || !char.journey.active) {
    playSay('You are not travelling yet — tap <strong>Set out</strong> first and say where you are going.', 'aside');
    return renderPlay();
  }
  const j = char.journey;
  const before = j.currentHex || 0, beforeDay = j.daysElapsed || 0;
  const sk = _heroSkill('Travel');
  const r = _doInlineRoll(sk.rating, sk.favoured ? 'fav' : 'normal', sk.tn, 'Travel · Marching Test');
  let ok = String(r.outcome).startsWith('SUCCESS');
  if (char.miserable && r.featSpecial === 'eye') ok = false;
  // Advance through the Journey tab's own Marching Test rule rather than a second,
  // incompatible one. Play used to move 2 hexes a press while a Marching Test moved
  // 3 + icons, so the same journey was two different lengths depending which tab you
  // were standing on — and one test could swallow a whole Play-tab road.
  applyMarchingTestResult(ok, r.icons, `Feat ${r.featLabel}, total ${r.total ?? '★'}, ${r.icons} ✦, vs Heart TN ${sk.tn}`, true);
  const gained = (j.currentHex || 0) - before, days = (j.daysElapsed || 0) - beforeDay;
  // How far and how long, then the dice pill. Where you stand on the road is the map's caption,
  // and the Travel Fatigue running total sits in the scene line — not repeated after every march.
  const dayWord = `${days} day${days === 1 ? '' : 's'}`;
  playSay(`${ok ? 'You make good time' : 'The going is hard and slow'}: ${gained} stretch${gained === 1 ? '' : 'es'} in ${dayWord}. ${_pillText('Travel', r.total, sk.tn, ok)}`);
  if (j.currentHex >= (j.totalHexes || 1)) {
    playSay('<strong>The place you were making for is in sight.</strong>');
  }
  renderPlay();
}

/** Is a Journey Event due at the hero's current hex? (Mirrors the Journey tab's own gate.) */
function _playEventDue() {
  const j = char.journey;
  if (!j || !j.active) return false;
  if (j.pendingEventRoll && j.pendingEventRoll.skill) return false;   // already rolled up
  const next = j.nextEventHex;
  if (next === null || next === undefined) return false;
  return (j.currentHex || 0) >= next;
}

/** Resolve the waiting Journey Event, narrated into the Play feed. */
async function playEvent() {
  if (!_playEventDue()) { playSay('Nothing is waiting on the road just now.', 'aside'); return renderPlay(); }
  const before = (char.journey.events || []).length;
  const origAlert = window.alert; window.alert = () => {};
  try { resolveJourneyEvent(); } finally { window.alert = origAlert; }
  const ev = (char.journey.events || [])[before];
  // Through _playPlainText, like everything else Play narrates: a bare tag-strip welded the
  // event's clauses into one run-on sentence, in the feed AND in the Chronicle.
  // One card — what happens, what is at stake, what to roll. The roll itself is the first choice
  // below, so the feed no longer repeats "it asks something of you".
  if (ev) playSay(journeyEventCard(ev), 'event', journeyEventPlain(ev));
  const pend = char.journey.pendingEventRoll;
  if (char.journey.pendingScene) playSay('<em>A noteworthy encounter — choose how you meet it below.</em>', 'aside');
  else if (!(pend && pend.skill)) playSay('<em>Nothing to roll for this one — say what it looks like, and travel on.</em>', 'aside');
  renderPlay();
}

/** Make the roll the event asked for, from Play. */
async function playEventRoll() {
  const j = char.journey;
  if (!j || !j.pendingEventRoll) return renderPlay();
  const before = (j.events || []).length;
  await rollJourneyEvent();
  const line = (j.events || [])[(j.events || []).length - 1];
  if (line && (j.events || []).length > before) {
    const v = line.res;
    if (v) {
      const what = v.applied ? _sentence(_tidyApplied(v.applied)) : (!v.ok && v.noPenalty ? 'You simply miss the benefit.' : '');
      const evName = String(v.eventName || 'event').replace(/\s*[👁ᚱ]\s*$/u, '');
      playSay(`${v.ok ? `Your ${escapeHtml(v.skill)} roll succeeds — the ${escapeHtml(evName)} goes your way.` : `Your ${escapeHtml(v.skill)} roll fails — the ${escapeHtml(evName)} goes against you.`} ${escapeHtml(what)} ${_pillText(v.skill, v.total, v.tn, v.ok)}`.replace(/\s+/g, ' ').trim());
    } else playSay(String(line.text).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim());
  }
  renderPlay();
}

function playEventSkip() {
  const pend = char.journey && char.journey.pendingEventRoll;
  if (typeof skipJourneyEventRoll === 'function') skipJourneyEventRoll();
  playSay(pend ? `You let it pass without testing yourself against it — the ${escapeHtml(pend.eventName)} takes its course.`
               : 'You let it pass.', 'aside');
  renderPlay();
}

/* ---------- Moria: the Band and the mission come before the road ----------
   In Moria a hero never sets out alone: the Band of dwarves goes too, and a mission is planned
   first (it sets the Band's Dispositions, its Readiness and how aware the Eye starts). Every way of
   starting a journey asks for both, and can do them on the spot. */
function moriaBandReady() { return ((char.band && char.band.allies) || []).some(a => !a.outOfAction); }
async function moriaReadyToTravel() {
  if (typeof isMoria !== 'function' || !isMoria()) return true;
  if (!moriaBandReady()) {
    const go = await showModal({
      title: 'Your Band comes first',
      message: 'In Moria you never go into the dark alone. Before any journey you gather your <strong>Band</strong> — dwarves of Balin\'s company who travel and fight beside you, and who suffer the road with you.<br><br>Roll a Band of six now? You can rename them and see their Gifts on the Band tab.',
      buttons: [
        { label: 'Roll my Band of six', value: 'roll' },
        { label: 'Take me to the Band tab', value: 'band' },
        { label: 'Not now', value: null, cancel: true }
      ]
    });
    if (go === 'band') { requireStepGo('band', 'band-allies-card'); return false; }
    if (go !== 'roll') return false;
    addStartingBand();
    const names = (char.band.allies || []).map(a => a.name).filter(Boolean);
    if (typeof playSay === 'function' && char.saga && char.saga.started)
      playSay(`Your Band gathers: <strong>${names.map(escapeHtml).join(', ')}</strong>.`);
    showToast('Your Band of ' + names.length + ' is gathered.');
  }
  if (!char.mission || !char.mission.active) {
    const go = await showModal({
      title: 'Plan the mission',
      message: 'Before a Moria journey you plan the mission: how many go, how heavily armed, and what they are best at. That sets your Band\'s five <strong>Dispositions</strong>, its <strong>Readiness</strong>, and how aware the <strong>Eye</strong> is of you from the start.<br><br>A standard plan is a medium-sized, prepared party with no speciality.',
      buttons: [
        { label: 'Use a standard plan', value: 'std' },
        { label: 'Plan it myself (Band tab)', value: 'band' },
        { label: 'Cancel', value: null, cancel: true }
      ]
    });
    if (go === 'band') { requireStepGo('band', 'band-mission-card'); return false; }
    if (go !== 'std') return false;
    const m = char.mission || (char.mission = {});
    if (!m.size) m.size = 'medium';
    if (!m.warGear) m.warGear = 'prepared';
    if (m.specialisation == null) m.specialisation = '';
    if (!m.objective) { const fk = _featKey(); m.objective = MISSION_OBJECTIVES[fk][(Math.floor(Math.random() * 6) + 1) <= 3 ? 0 : 1]; }
    const pv = applyMissionSetup(true);
    showToast(`Mission planned: ${m.objective}. Readiness ${pv.readiness} (TN ${20 - pv.readiness}), Eye ${pv.ea}.`);
  }
  return true;
}
/** Go straight to a card on a tab (the "Take me there" half of requireStep, without asking again). */
function requireStepGo(tabId, cardId) {
  if (typeof openNavGroup === 'function' && typeof navGroupOf === 'function') { const g = navGroupOf(tabId); if (g) openNavGroup(g.id); }
  const t = document.querySelector('.tab[data-tab=' + tabId + ']'); if (t) t.click();
  setTimeout(() => {
    const c = document.getElementById(cardId); if (!c) return;
    const card = c.closest('.card');
    if (card && typeof openCard === 'function' && card.classList.contains('collapsed')) openCard(card);
    c.scrollIntoView({ block: 'center' });
  }, 80);
}

async function playSetOut() {
  // A journey begun on the Journey tab leaves saga.step on 'haven', so Play used to say "you are
  // somewhere safe" during a live march and then overwrite the whole thing — destination, hexes,
  // region, Forced March, mount and Peril — without a word. Never destroy a journey silently.
  const live = char.journey;
  if (live && live.active) {
    const covered = `${parseInt(live.currentHex) || 0} / ${parseInt(live.totalHexes) || 0} hexes`;
    const go = await showModal({
      title: '🥾 You are already on the road',
      message: `A journey to <strong>${escapeHtml(live.destination || 'somewhere')}</strong> is under way — ${covered} covered.` +
               '<br><br>Carry on with it, or abandon it and set out somewhere else? Abandoning discards its progress, region, mount and any Peril.',
      buttons: [
        { label: '▶ Carry on with this journey', value: 'keep' },
        { label: '🗑 Abandon it and set out anew', value: 'new' },
        { label: 'Cancel', value: null, cancel: true }
      ]
    });
    if (go !== 'new') {
      if (go === 'keep') { sagaState().step = 'journey'; saveCharacter(); renderPlay(); }
      return;
    }
  }
  if (!await moriaReadyToTravel()) return;
  const dest = await promptStyled('Where are you going?', '', '🥾 Set out', 'e.g. the ruined watchtower');
  if (dest === null) return;
  const far = await showModal({
    title: 'How far is it?',
    message: 'Roughly. This only sets how many times you travel before you arrive.',
    buttons: [
      { label: 'Close by — a stretch of road', value: 4 },
      { label: 'A fair way — several days', value: 9 },
      { label: 'Far — a long road', value: 18 },
      { label: '🗺 Plan it in full — map, mount, lands, peril', value: 'plan' }
    ]
  });
  if (!far) return;
  if (far === 'plan') {
    // The Journey tab sets out the same road with everything the rules ask about; ▶ Play
    // picks it up the moment it starts (startJourney moves the story onto the road).
    playGoTab('journey');
    const d = document.getElementById('j-destination'); if (d) { d.value = String(dest).trim(); d.dispatchEvent(new Event('change', { bubbles: true })); }
    const o = document.getElementById('j-origin'); if (o && !o.value && typeof homePlaceName === 'function') o.value = homePlaceName();
    return;
  }
  // The same journey record the Journey tab keeps: it travels in the calendar's season and sets out
  // from the hero's home, so both tabs describe one road.
  const fromHere = (typeof homePlaceName === 'function' && homePlaceName()) || char.safeHaven || 'home';
  char.journey = { active: true, origin: fromHere, destination: String(dest).trim() || 'somewhere',
    totalHexes: far, hardTerrainHexes: 0, currentHex: 0, season: calendarSeason(), region: _regionLabel(char.huntRegion || 'wild'),
    forcedMarch: false, mounted: false, roles: {}, travelFatigue: 0, daysElapsed: 0, events: [], nextEventHex: null };
  sagaState().step = 'journey';
  saveCharacter();
  playClearFeed();
  playScene(`The road to ${char.journey.destination}`);
  playSay(`You leave ${escapeHtml(fromHere)} for <strong>${escapeHtml(char.journey.destination)}</strong>. It is ${calendarSeason().toLowerCase()}.`);
  renderPlay();
}

async function playArrive() {
  const dest = (char.journey || {}).destination || 'the place';
  const fatBefore = parseInt(char.fatigue) || 0;
  if (char.journey && char.journey.active) {
    // Run the real arrival — mount Vigour, the arrival TRAVEL roll, lingering Fatigue —
    // rather than a second, lesser version of it. Answer its own confirm yes, and decline
    // the "jump to the Chronicle" offer: in Play mode you stay here.
    const orig = window.confirmStyled;
    let call = 0;
    window.confirmStyled = async () => (++call === 1);
    const origAlert = window.alert; window.alert = () => {};
    try { await arriveAtDestination(); } finally { window.confirmStyled = orig; window.alert = origAlert; }
  }
  sagaState().step = 'location';
  saveCharacter();
  playClearFeed();
  playScene(`At ${dest}`);
  playSay(`You reach <strong>${escapeHtml(dest)}</strong>.`);
  const fatGained = (parseInt(char.fatigue) || 0) - fatBefore;
  if (fatGained > 0) playSay(`The road has left its mark: <strong>+${fatGained} Fatigue</strong>. A Prolonged Rest in a Safe Haven clears 1 at a time.`, 'aside');
  renderPlay();
}

/** The Journey tab's region picker writes 'Free'/'Border'/'Wild'/'Shadow'/'Dark' and renders the
    value + " Land"; `char.huntRegion` is lower-case. Without this the return leg read "wild Land". */
function _regionLabel(r) {
  const k = String(r || 'wild').toLowerCase();
  return k.charAt(0).toUpperCase() + k.slice(1);
}

/** Reaching home ends the return journey properly. "🏠 We are safe again" used to just change
    the saga step, leaving `journey.active` true — so the Journey tab described a road the hero
    had finished walking for the rest of the campaign. */
async function playArriveHome() {
  const home = (char.journey || {}).destination || char.safeHaven || 'home';
  const fatBefore = parseInt(char.fatigue) || 0;
  if (char.journey && char.journey.active) {
    const orig = window.confirmStyled;
    let call = 0;
    window.confirmStyled = async () => (++call === 1);     // yes to arrive, no to the Chronicle jump
    const origAlert = window.alert; window.alert = () => {};
    try { await arriveAtDestination(); } finally { window.confirmStyled = orig; window.alert = origAlert; }
  }
  sagaState().step = 'fellowship';
  saveCharacter();
  playClearFeed();
  playScene(`Home at ${home}`);
  playSay(`You are home at <strong>${escapeHtml(home)}</strong>.`);
  const fatGained = (parseInt(char.fatigue) || 0) - fatBefore;
  if (fatGained > 0) playSay(`The road took its toll: <strong>+${fatGained} Fatigue</strong>.`, 'aside');
  renderPlay();
}

/** The road back. Same journey machinery, pointed the other way. */
async function playSetOutHome() {
  const home = (typeof homePlaceName === 'function' && homePlaceName()) || 'home';
  const from = (char.journey && char.journey.destination) || 'where you were';
  const far = await showModal({
    title: 'How far is the road back?',
    message: `From ${escapeHtml(from)} to ${escapeHtml(home)}.`,
    buttons: [
      { label: 'The way we came', value: 'same' },
      { label: 'Close by — a stretch of road', value: 4 },
      { label: 'A fair way — several days', value: 9 },
      { label: 'Far — a long road', value: 18 }
    ]
  });
  if (!far) return;
  const hexes = (far === 'same') ? (parseInt((char.journey || {}).totalHexes) || 9) : far;
  // "The way we came" means the same road: keep the outbound region rather than silently
  // re-rolling the hero into whatever their Hunt region happens to be. The Journey tab renders
  // `region + ' Land'`, so the value must be capitalised the way its own picker writes it.
  const outboundRegion = (char.journey || {}).region;
  const region = (far === 'same' && outboundRegion) ? outboundRegion : _regionLabel(char.huntRegion || 'wild');
  char.journey = { active: true, origin: from, destination: home,
    totalHexes: hexes, hardTerrainHexes: 0, currentHex: 0, season: calendarSeason(),
    region: region, forcedMarch: false, mounted: false, roles: {},
    travelFatigue: 0, daysElapsed: 0, events: [], nextEventHex: null };
  saveCharacter();
  playClearFeed();
  playScene(home && home !== 'home' ? `The road home to ${home}` : 'The road home');
  playSay(`You turn back for <strong>${escapeHtml(home)}</strong>.`);
  renderPlay();
}

/** A HEALING roll against the current injury, run from the Play tab. */
async function playFirstAid() {
  if (!char.wounded) { playSay('You are not Wounded — there is nothing to treat.', 'aside'); return renderPlay(); }
  const days = parseInt(char.injuryDays) || 0;
  if (days <= 0 || char.firstAidUsed) {
    // Nothing to roll: name the way out instead of a dialog.
    const kind = char.injuryKind || '';
    playSay(days <= 0
      ? (kind === 'moderate' ? 'This wound closes with a night\'s rest — choose <strong>Rest</strong>.'
        : 'There is no mending time to shorten. Rest under care, then mark the wound as passed from the vitals bar.')
      : 'You have already tended this wound today. Let a day pass, then try again.', 'aside');
    return renderPlay();
  }
  const sk = _heroSkill('Healing');
  const r = _doInlineRoll(sk.rating, sk.favoured ? 'fav' : 'normal', sk.tn, 'Healing · First Aid');
  const ok = String(r.outcome).startsWith('SUCCESS');
  const fa = applyFirstAidResult(ok, r.icons);
  playSay((fa.mended ? '<strong>The wound is mended.</strong> You are no longer Wounded.'
    : ok ? `You tend the wound: ${fa.before} → ${fa.after} days to mend.`
    : 'Your care does not help today. Try again tomorrow.') + ' ' + _pillText('Healing', r.total, sk.tn, ok));
  renderPlay();
}

async function playRest() {
  const before = parseInt(char.endCur) || 0, fatBefore = parseInt(char.fatigue) || 0;
  // Where the hero sleeps decides whether lingering Fatigue lifts (only in a Safe Haven). Play
  // used to answer "yes, a Safe Haven" for every rest — camped on the road included.
  const st = sagaState().step, onRoad = !!(char.journey && char.journey.active);
  let haven = !onRoad && (st === 'haven' || st === 'fellowship');
  if (!onRoad && st === 'location' && fatBefore > 0) {
    const where = await showModal({ title: '🌙 Where do you rest?', message: 'Lingering Fatigue lifts only in a Safe Haven — a place of real safety, like a friendly house or an Elf-haven.',
      buttons: [{ label: 'A Safe Haven', value: 'haven' }, { label: 'Out in the wild', value: 'wild' }, { label: 'Not now', value: null, cancel: true }] });
    if (!where) return;
    haven = where === 'haven';
  }
  await takeProlongedRest({ safeHaven: haven, noConfirm: true });
  const fatNow = parseInt(char.fatigue) || 0;
  playSay(`You rest through the night. Endurance ${before} → ${char.endCur}.` +
    (fatBefore > fatNow ? ` Fatigue ${fatBefore} → ${fatNow}.` : fatBefore > 0 ? ' <em>Your Fatigue stays — it lifts only in a Safe Haven.</em>' : ''));
  renderPlay();
}

/* ---------- Moria: explore chamber by chamber; orcs come as an Orc-band ----------
   The Moria Loremaster chapter builds the deep places one chamber at a time (the Random Chamber
   Generator) and its orcs as a Random Orc-Band. Both lived only on the Oracle tab, so a whole
   session on ▶ Play never rolled either. Play now runs them where the story needs them. */
function _playChamberHere() {
  const ch = char.saga && char.saga.chamber;
  const here = (char.journey && char.journey.destination) || '';
  return ch && ch.at === here ? ch : null;
}
function _playMoriaChamberChoices(C) {
  if (typeof isMoria !== 'function' || !isMoria()) return [];
  const ch = _playChamberHere();
  if (ch && !ch.met) {
    if (ch.band) return [
      C('⚔️ Fight the orc-band', 'playChamberFight()', _orcBandSummary(ch.band) + ' — fought right here.'),
      C('🤫 Try to slip past them', 'playChamberSlip()', 'A Stealth roll. If it fails, they find you.')
    ];
    if (ch.skill) return [C(`🎯 Meet it: ${ch.skill}`, 'playChamberChallenge()', 'The chamber tests you — the app rolls it.')];
  }
  return [C('⛏️ Go on to the next chamber', 'playExploreChamber()', 'The Chamber table says what lies ahead.')];
}
function playExploreChamber() {
  const c = genChamber();
  const chal = String(c.chal || '');
  const ch = { ...c, at: (char.journey && char.journey.destination) || '', met: false };
  if (/^Combat$/i.test(chal)) ch.band = rollOrcBandData();
  else if (!/^None|hope/i.test(chal)) ch.skill = chal;
  else ch.met = true;
  sagaState().chamber = ch;
  logOracleRoll('Chamber', `${c.appr} ${c.type} — ${c.cond} — ${c.chal}`);
  playSay(escapeHtml(chamberLine(c)));
  if (ch.band) {
    logOracleRoll('Orc-Band', `${ch.band.leader} — ${_orcBandSummary(ch.band)}`);
    playSay(`<strong>Orcs!</strong> An Orc-band is here: ${escapeHtml(_orcBandSummary(ch.band))}.` +
      (ch.band.surprise ? ' They have not seen you yet.' : ''));
  } else if (/hope/i.test(chal)) {
    playSay('Something here lifts your heart: <strong>a token of hope</strong>.');
    playSay('<em>Say what you find — a sign that Durin\'s folk were here, a carving, a light. It is the story\'s reward for pressing on.</em>', 'aside');
  }
  saveCharacter(); renderPlay();
}
function playChamberChallenge() {
  const ch = _playChamberHere(); if (!ch || !ch.skill) return;
  const sk = _heroSkill(ch.skill);
  const r = _doInlineRoll(sk.rating, sk.favoured ? 'fav' : 'normal', sk.tn, `${ch.skill} · ${ch.appr} ${ch.type}`);
  const ok = String(r.outcome).startsWith('SUCCESS');
  ch.met = true; saveCharacter();
  const said = (typeof rollMeaning === 'function' && rollMeaning(ch.skill, ok)) || (ok ? 'You succeed.' : 'You fail.');
  playSay(`<strong>The ${escapeHtml(String(ch.type).toLowerCase())} tests your ${escapeHtml(ch.skill)}:</strong> ` +
    `<strong style="color:var(${ok ? '--success-text' : '--error-text'})">${escapeHtml(said)}</strong> ${_pillText(ch.skill, r.total, sk.tn, ok)}`);
  playSay(ok ? '<em>Say how you get through, then go on.</em>' : '<em>Say what it costs you — time, a hurt, a lost trail, noise that carries.</em>', 'aside');
  renderPlay();
}
function playChamberFight() {
  const ch = _playChamberHere(); if (!ch || !ch.band) return;
  addOrcBandFoes(ch.band);
  if (typeof encDeriveEngaged === 'function') encDeriveEngaged();
  if (typeof _encEnsureGroup === 'function') _encEnsureGroup();
  ch.met = true; saveCharacter();
  if (typeof renderEncounter === 'function') renderEncounter();
  playSay(`<strong>You fall on the orc-band.</strong>${ch.band.surprise ? ' They are caught off guard.' : ''}`);
  playGoTab('combat');
  if (typeof _encRoundFellPrompt === 'function') _encRoundFellPrompt(enc().round || 1);
}
function playChamberSlip() {
  const ch = _playChamberHere(); if (!ch || !ch.band) return;
  const sk = _heroSkill('Stealth');
  const r = _doInlineRoll(sk.rating, sk.favoured ? 'fav' : 'normal', sk.tn, 'Stealth · past the orc-band');
  const ok = String(r.outcome).startsWith('SUCCESS');
  if (ok) {
    ch.met = true; saveCharacter();
    playSay(`<strong>You slip past the orc-band unseen.</strong> ${_pillText('Stealth', r.total, sk.tn, true)}`);
    return renderPlay();
  }
  playSay(`<strong style="color:var(--error-text)">They see you.</strong> ${_pillText('Stealth', r.total, sk.tn, false)}`);
  ch.band.surprise = false;
  playChamberFight();
}

async function playFight() {
  playSay('<strong>Something comes at you out of the dark.</strong>');
  playSay('The app suggests a foe from where you are and what just happened — take it, ask for something else, or pick your own. The fight is fought right here; when it is over, the story carries on.', 'aside');
  window._playFightPending = true;      // the first foe picked takes you to the fight
  openBestiary();
  renderPlay();
}
/** Council or Skill Endeavour, set up on the Council tab — Play opens it at the right card. */
function playCouncil(kind) {
  if (_playFightable()) {
    playSay(kind === 'council' ? 'You set out to win someone over. <em>Say who, and what you ask — then roll it here.</em>'
                               : 'You set your hand to a long, hard task. <em>Say what it is — then roll it here.</em>', 'aside');
    return playOpenScene(kind);
  }
  playSay(kind === 'council' ? 'You set out to win someone over. <em>Set up the Council and roll it on the Council tab.</em>'
                             : 'You set your hand to a long, hard task. <em>Set it up and roll it on the Council tab.</em>', 'aside');
  playGoTab('council');
  if (typeof pickCouncilKind === 'function') pickCouncilKind(kind);
}
/** How the hero meets a Noteworthy Encounter: each answer opens the subsystem that runs it. */
const SCENE_WAYS = [
  ['fight', '⚔️ Fight it out', 'A fight, fought here.'],
  ['council', '🗣️ Talk your way through', 'A Council — win them over.'],
  ['endeavour', '💪 Overcome it', 'A Skill Endeavour — a long, hard task.'],
  ['pass', '↷ It passes', 'Say how it ends, and travel on.']
];
function _sceneButtons() {
  return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">${SCENE_WAYS.map(([k, l]) =>
    `<button class="add-row-btn${k === 'fight' ? ' primary' : ''}" style="font-size:var(--fs-xs)" onclick="meetScene('${k}')">${l}</button>`).join('')}</div>`;
}
function meetScene(way) {
  const j = char.journey; if (!j || !j.pendingScene) return;
  const sc = j.pendingScene; j.pendingScene = null; saveCharacter();
  if (typeof renderJourney === 'function') renderJourney();
  if (way === 'fight') return playFight();
  if (way === 'council' || way === 'endeavour') return playCouncil(way);
  playSay(`You come through ${escapeHtml(sc.detail || sc.name)} — say how it ends, and travel on.`, 'aside');
  renderPlay();
}
/** One event from the Perilous Area, narrated like any other. */
async function playPeril() {
  const j = char.journey; if (!j || !j.active || !(parseInt(j.perilEventsRemaining) > 0)) return renderPlay();
  const before = (j.events || []).length;
  const origAlert = window.alert; window.alert = () => {};
  try { resolveJourneyEvent(true); } finally { window.alert = origAlert; }
  const ev = (j.events || [])[before];
  if (ev) playSay(journeyEventCard(ev), 'event', journeyEventPlain(ev));
  renderPlay();
}

async function playFellowship() {
  if (typeof isMoria === 'function' && isMoria()) {
    if (_playFightable()) return playOpenScene('mfp');
    playSay('Moria rests are on the Band tab — pick how long you rest there.', 'aside');
    document.querySelector('.tab[data-tab=band]').click();
    return;
  }
  if (_playFightable()) window._fpInPlay = true;
  openFPWizard();
}

async function playNextAdventure() {
  const s = sagaState();
  // The button promises "Back to the haven, with a new reason to leave" — so ask for one.
  // Without this the Play tab went on restating the old, already-resolved premise as the
  // hero's motive for the next adventure.
  const seed = _patronQuestSeed();
  const reason = await promptStyled(
    'What sends your hero out this time?<br><br>One line is enough — an errand, a rumour, a threat to someone they care about. ' +
    (seed ? `Your Patron suggests: <em>${escapeHtml(seed)}</em>` : 'Leave it blank to keep the old reason.'),
    seed || '', '▶ The next adventure', 'e.g. word came that the road east is closed');
  if (reason === null) return;  // cancelled — stay where you are
  const newPremise = String(reason).trim();
  if (newPremise) s.premise = newPremise;
  s.adventures = (parseInt(s.adventures) || 0) + 1;
  if (typeof logTimeline === 'function') logTimeline('saga', `Adventure ${s.adventures} begins${newPremise ? ': ' + newPremise : ''}.`);
  s.step = 'haven';
  char.journey = { active: false };
  saveCharacter();
  playClearFeed();
  playScene(`Adventure ${s.adventures}${newPremise ? ' — ' + newPremise : ''}`);
  playSay(`<strong>Adventure ${s.adventures} begins.</strong> You are back at ${escapeHtml(char.safeHaven || 'the haven')}.`);
  if (newPremise) playSay(`Why you are leaving again: <em>${escapeHtml(newPremise)}</em>`);
  if (typeof pushBlock === 'function' && isSolo()) {
    try { ensureActiveScene(); pushBlock('auto', 'milestone', `Adventure ${s.adventures} begins${newPremise ? ': ' + newPremise : ''}`, 'play'); } catch (e) {}
  }
  renderPlay();
}

function playGoStep(step) {
  sagaState().step = step;
  saveCharacter();
  playClearFeed();
  renderPlay();
}

/* ---- the screen --------------------------------------------------------- */

/* The Play tab used to print "Endurance 0/26" and offer the same five choices it offered at
   full health — nothing on the surface built to run a session for a newcomer ever said what
   being Dying meant, or that it was urgent. These two helpers say it, in front of everything
   else, and the choice list puts recovery first. */
/** Move the hero's calendar on by `n` days: a new day frees the Short Rest and ticks down a
    Wounded hero's injury days, exactly as a night's Prolonged Rest does. Days pass on the road
    too, which is why this is not private to the rest code. */
/** The Tale of Years' "+1 Day" button: the hero's day, injuries and journey season move with it. */
function passDayByHand() { advanceDays(1); saveCharacter(); render(); }
/** The season of the story's calendar ("Spring"…"Winter"), the one the Journey rules read. */
function calendarSeason() {
  try { if (typeof journal !== 'undefined' && journal && journal.clock && typeof monthSeason === 'function') { const s = monthSeason(journal.clock.month); if (s) return String(s).charAt(0).toUpperCase() + String(s).slice(1).toLowerCase(); } } catch (e) {}
  return 'Spring';
}
/** A journey travels in the season the calendar is in — crossing into Winter on the road makes
    the Marching Tests harder from that day on, as it should. */
function _syncJourneySeason() {
  const j = char.journey;
  if (j && j.active && !(typeof isMoria === 'function' && isMoria())) j.season = calendarSeason();
}
function advanceDays(n) {
  const raw = parseInt(n) || 0;
  // A Short Cut takes a day back off the road: the calendar and the day-count step back with it
  // (injury days already healed stay healed — that time was really spent resting the wound).
  if (raw < 0) {
    char.dayCount = Math.max(1, (parseInt(char.dayCount) || 1) + raw);
    if (typeof advanceChronicleDay === 'function' && typeof journal !== 'undefined' && journal && journal.clock) advanceChronicleDay(raw);
    _syncJourneySeason();
    return;
  }
  const days = Math.max(0, raw);
  if (!days) return;
  // One calendar: the hero's day-count, the Tale of Years in the Chronicle, and the season the
  // journey is travelling in all move together. They used to be three clocks — a nine-day march
  // left the Tale of Years on the day you set out, and a night's rest pushed it to "31 Astron".
  if (typeof advanceChronicleDay === 'function' && typeof journal !== 'undefined' && journal && journal.clock) advanceChronicleDay(days);
  _syncJourneySeason();
  char.dayCount = (parseInt(char.dayCount) || 1) + days;
  char.shortRestUsedToday = false;
  if (char.wounded && (parseInt(char.injuryDays) || 0) > 0) {
    const before = parseInt(char.injuryDays) || 0;
    char.injuryDays = Math.max(0, before - days);
    if (char.injuryDays <= 0) mendWound();                      // the mending time has run out
    else if (char.injuryDays < before) char.firstAidUsed = false;   // a new day allows another attempt
  }
}

/* ---------- HERO SHEET (read-only) ----------
   The Character tab opens on a one-screen sheet — crest, identity, attributes, skills, gear,
   traits — the way the paper sheet reads. "Edit" reveals the full form (#char-edit, unchanged,
   so every control, guard and spec still finds it). In-play actions live in the vitals sheet. */
/* Edit opens a short menu of sections, each one screen (round 4). `sec` jumps straight to one —
   anything that targets a control inside the form passes the section that holds it. */
const EDIT_SECTIONS = { name: 'Name & background', numbers: 'Numbers', skills: 'Skill ratings', traits: 'Traits', story: 'Story' };
function editSectionOf(el) { const h = el && el.closest && el.closest('#char-edit [data-sec]'); return h && EDIT_SECTIONS[h.dataset.sec] ? h.dataset.sec : null; }
function setEditSection(sec) {
  const f = document.getElementById('char-edit'); if (!f) return;
  sec = EDIT_SECTIONS[sec] ? sec : null;
  f.dataset.sec = sec || 'menu';
  f.querySelectorAll('[data-sec]').forEach(el => el.classList.toggle('sec-off', el.dataset.sec !== (sec || 'menu')));
  const t = document.getElementById('edit-title');
  if (t) t.innerHTML = sec ? `<strong>${escapeHtml(EDIT_SECTIONS[sec])}</strong>` : 'Editing <strong>your hero</strong>';
  const back = f.querySelector('.edit-back'); if (back) back.hidden = !sec;
  if (sec !== 'skills' && typeof editMode !== 'undefined' && editMode) toggleEditMode();
  if (sec !== 'numbers' && typeof adjustMode !== 'undefined' && adjustMode) toggleAdjustMode(false);
  window.scrollTo(0, 0);
}
function setCharEditing(on, sec) {
  const p = document.getElementById('panel-character'); if (!p) return;
  p.classList.toggle('editing', !!on);
  if (on) setEditSection(sec || null);
  else {
    if (typeof adjustMode !== 'undefined' && adjustMode) toggleAdjustMode(false);
    if (typeof editMode !== 'undefined' && editMode) toggleEditMode();   // Done also locks skill corrections
    window.scrollTo(0, 0);
  }
  renderHeroSheet();
}
function _chips(txt, cls) {
  const parts = String(txt || '').split(/\n|,(?![^(]*\))/).map(x => x.replace(/\s*—.*$/, '').trim()).filter(Boolean);
  return parts.map(x => `<span class="trait ${cls || ''}">${escapeHtml(x)}</span>`).join('');
}
function _pips(n, max) { let h = ''; for (let i = 0; i < (max || 6); i++) h += `<i class="${i < n ? 'on' : ''}"></i>`; return `<span class="pipset">${h}</span>`; }
/* A Spend button with nothing to spend says how points are earned instead of opening an empty
   list (round 4). Never `disabled` — GOTCHA 21: the control must be able to explain itself. */
/* Round 8: points as drawn tokens. A point-bearing token spends; a zero one says how points are earned. */
function _xpToken(kind, label, v, icon) {
  const inner = `<span class="xt-disc"><svg class="ic" aria-hidden="true"><use href="#${icon}"/></svg></span><strong>${v}</strong><small>${label}</small>`;
  if (!kind) return `<div class="xp-token">${inner}</div>`;
  const what = kind === 'skill' ? 'Skill points' : 'Adventure points';
  return v > 0 ? `<button type="button" class="xp-token live" onclick="openSpendXP('${kind}')" aria-label="Spend ${what} · ${v}">${inner}</button>`
    : `<button type="button" class="xp-token none" onclick="explainNoPoints('${kind}')">${inner}<span class="sr-only">No ${what} yet</span></button>`;
}
function _spendOne(sp, ap) {
  if (sp <= 0 && ap <= 0) return '';
  const kind = sp > 0 ? 'skill' : 'adv';
  const label = sp > 0 && ap > 0 ? 'Spend points' : sp > 0 ? `Spend Skill points · ${sp}` : `Spend Adventure points · ${ap}`;
  return `<div class="s-actions"><button class="btn btn-secondary xp-spend" onclick="openSpendXP('${kind}')">${label}</button></div>`;
}
function explainNoPoints(kind) {
  const what = kind === 'skill' ? 'Skill points' : 'Adventure points';
  const how = char.experienceMode === 'milestone' || isSolo()
    ? 'You earn them from <strong>milestones</strong> — a deed worth remembering. Award one from the vitals bar (tap your Endurance and Hope).'
    : 'You earn them at the <strong>end of each session</strong> (+3 each). End a session from the vitals bar (tap your Endurance and Hope).';
  alertStyled(`You have no ${what} to spend yet.<br><br>${how}<br><br>Spend them between adventures, in a Fellowship Phase.`);
}
/** Moria: the Band at a glance on the hero sheet — only once a Band exists. Rolls and tests stay on the Band tab. */
function _sheetBandHtml() {
  if (typeof isMoria !== 'function' || !isMoria()) return '';
  const b = char.band || {}; const allies = b.allies || [];
  if (!allies.length) return '';
  const n = v => parseInt(v) || 0;
  const disp = DISPOSITIONS.map(d => `<div class="sb-disp"><strong>${n((b.dispositions || {})[d.key])}</strong><span>${d.name}${b.dispositionFocus === d.key ? ' <b class="fav" title="Disposition Focus">★</b>' : ''}</span></div>`).join('');
  const state = a => a.outOfAction ? '<span class="sb-out">Out of action</span>'
    : [a.injury && `${a.injury} injury`, a.fatigue && `${a.fatigue} fatigue`].filter(Boolean).map(x => `<span class="sb-hurt">${escapeHtml(x)}</span>`).join('') || '<span class="sb-ok">Ready</span>';
  const rows = allies.map(a => `<div class="sb-ally${a.outOfAction ? ' out' : ''}"><div><strong>${escapeHtml(a.name || 'Dwarf')}</strong>${a.hardened ? ' <small class="sb-hard">Hardened</small>' : ''}<small>${escapeHtml(a.gift || '')}${a.giftWasted ? ' (wasted)' : ''}</small></div><div class="sb-state">${state(a)}</div></div>`).join('');
  const burden = b.burden ? String(b.burden)[0].toUpperCase() + String(b.burden).slice(1) : '—';
  return `<div class="card band-sum" id="sheet-band">
    <h3 class="card-title">Your Band</h3>
    <div class="sb-top"><span><small>Readiness</small><strong>${n(b.readiness)}</strong></span><span><small>TN</small><strong>${typeof bandTN === 'function' ? bandTN() : 20 - n(b.readiness)}</strong></span><span><small>Burden</small><strong>${escapeHtml(burden)}</strong></span><span><small>Allies</small><strong>${allies.filter(a => !a.outOfAction).length}/${allies.length}</strong></span></div>
    ${missionSummaryHtml()}
    <div class="sb-disps">${disp}</div>
    <div class="sb-allies">${rows}</div>
    <button type="button" class="btn btn-secondary" onclick="requireStepGo('band','band-allies-card')">Open the Band tab — rolls and tests</button>
  </div>`;
}
function renderHeroSheet() {
  const host = document.getElementById('hero-sheet'); if (!host) return;
  host.innerHTML = char.culture ? heroSheetHtml() : '';
  if (document.getElementById('peek-overlay') && document.getElementById('peek-overlay').classList.contains('show')) renderPeek();
}
function heroSheetHtml() {
  const n = v => parseInt(v) || 0;
  const meta = [
    char.patron && ['Patron', char.patron], char.safeHaven && ['Safe Haven', char.safeHaven],
    char.standard && ['Living', char.standard], char.age && ['Age', char.age]
  ].filter(Boolean).map(([k, v]) => `<span class="meta"><small>${k}</small>${escapeHtml(String(v))}</span>`).join('');
  const attr = (k, label, gloss) => `<div class="s-attr">${typeof ATTR_GLYPH !== 'undefined' ? `<svg class="ic a-ic" aria-hidden="true"><use href="#${ATTR_GLYPH[k]}"/></svg>` : ''}<span class="s-lab">${label}</span><strong>${n(char[k + 'Rating'])}</strong><span class="s-tn">TN ${n(char[k + 'TN'])}</span><span class="s-gl">${gloss}</span></div>`;
  const stat = (label, v, roll) => roll
    ? `<button type="button" class="s-stat s-roll" onclick="rollFromSheet('${label}')" aria-label="Roll ${label}"><strong>${v}</strong><span>${label}</span></button>`
    : `<div class="s-stat"><strong>${v}</strong><span>${label}</span></div>`;
  const skillCol = (k, title) => `<div class="s-skillcol"><div class="s-h">${typeof ATTR_GLYPH !== 'undefined' ? `<svg class="ic a-ic" aria-hidden="true"><use href="#${ATTR_GLYPH[k]}"/></svg>` : ''}${title}</div>` + SKILLS[k].map(sk => {
    const d = (char.skills || {})[sk] || {}; const r = n(d.rating);
    return `<button type="button" class="s-skill${r ? '' : ' zero'}" onclick="rollFromSheet('${sk}')" aria-label="Roll ${escapeHtml(sk)}"><span>${d.favoured ? '<b class="fav" title="Favoured">★</b>' : ''}${escapeHtml(sk)}</span>${_pips(r)}</button>`;
  }).join('') + '</div>';
  const profs = ['Axes', 'Bows', 'Spears', 'Swords'].map(pn => `<button type="button" class="s-skill${n((char.profs || {})[pn]) ? '' : ' zero'}" onclick="rollFromSheet('${pn}')" aria-label="Roll ${pn}"><span>${pn}</span>${_pips(n((char.profs || {})[pn]))}</button>`).join('');
  const weapons = (char.weapons || []).filter(w => w && w.name).map(w =>
    `<div class="s-weapon"><strong>${escapeHtml(w.name)}</strong><span>Damage ${escapeHtml(String(w.dmg ?? '–'))} · Injury ${escapeHtml(String(w.inj ?? '–'))}</span></div>`).join('')
    || '<p class="s-empty">No weapon yet — <a href="#" onclick="openEquipment();return false">equip one</a>.</p>';
  const protection = n(char.armourProt) + n(char.helmProt);
  const armourBits = [char.armourNotes && escapeHtml(char.armourNotes), n(char.helmProt) ? 'helm' : '', char.shieldNotes && escapeHtml(char.shieldNotes)].filter(Boolean).join(' · ');
  const traits = [
    ['Distinctive Features', _chips(char.features)], ['Flaws', _chips(char.flaws, 'flaw')],
    ['Rewards', _chips(char.rewards, 'reward')], ['Virtues', _chips(char.virtues, 'virtue')]
  ].filter(([, h]) => h).map(([t, h]) => `<div class="s-h">${t}</div><div class="traits">${h}</div>`).join('');
  const bandHtml = _sheetBandHtml();
  const owed = owedChoices();
  const owedHtml = owed.length ? `<div class="card owed-card"><h3 class="card-title">Waiting for you</h3>${owed.map(o =>
    `<button type="button" class="btn${o.label.startsWith('🌑') || o.label.startsWith('👁') ? '' : ' btn-secondary'} owed-btn" onclick="${o.fn}">${escapeHtml(o.label)}</button><p class="hint" style="margin:2px 0 8px">${escapeHtml(o.hint)}</p>`).join('')}</div>` : '';
  return owedHtml + `
  <div class="card ornate sheet-head">
    ${typeof cultureSilhouette === 'function' ? cultureSilhouette(char.culture) : ''}
    <div class="sh-crest">${cultureCrest(char.culture, 76, char.name)}</div>
    <div class="sh-id">
      <h2 class="sh-name">${escapeHtml(heroLabel(char))}</h2>
      <div class="sh-sub">${escapeHtml([char.culture, char.calling].filter(Boolean).join(' · '))}${char.shadowPath ? ` <span class="sh-path">· ${escapeHtml(char.shadowPath)}</span>` : ''}</div>
      <div class="sh-meta">${meta}</div>
    </div>
    <button class="btn btn-secondary sh-edit" onclick="setCharEditing(true)">Edit</button>
  </div>
  <div class="card">
    <div class="s-attrs">${attr('str', 'Strength', 'body')}${attr('hrt', 'Heart', 'spirit')}${attr('wit', 'Wits', 'mind')}</div>
    <div class="s-stats">${stat('Parry', typeof statBadge === 'function' ? statBadge('shield', n(char.parry) + n(char.shieldTotal)) : n(char.parry) + n(char.shieldTotal))}${stat('Armour', typeof statBadge === 'function' ? statBadge('mail', protection + 'd') : protection + 'd')}${stat('Valour', n(char.valour), 1)}${stat('Wisdom', n(char.wisdom), 1)}${stat('Fellowship', n(char.fellowshipRating))}</div>
  </div>
  <div class="card">
    <h3 class="card-title">Skills</h3>
    <p class="s-rollhint">Tap any skill to roll it.</p>
    <div class="s-skills">${skillCol('str', 'Strength')}${skillCol('hrt', 'Heart')}${skillCol('wit', 'Wits')}</div>
    <div class="s-h">Combat</div><div class="s-profs">${profs}</div>
  </div>
  <div class="card">
    <h3 class="card-title">War gear</h3>
    ${weapons}
    <div class="s-armour"><span>Protection <strong>${protection}d</strong></span>${armourBits ? `<span>${armourBits}</span>` : ''}</div>
  </div>
  ${bandHtml}
  ${traits ? `<div class="card"><h3 class="card-title">Traits</h3>${traits}</div>` : ''}
  <div class="card">
    <h3 class="card-title">Experience &amp; wealth</h3>
    <div class="xp-tokens">${_xpToken('skill', 'Skill points', n(char.skillPts), 'i-quill')}${_xpToken('adv', 'Adventure pts', n(char.advPts), 'i-swords')}${_xpToken('', 'Treasure', n(char.treasure), 'i-coins')}${_xpToken('', 'Fellowship pts', n(char.fellowship), 'i-link')}</div>
    ${_spendOne(n(char.skillPts), n(char.advPts))}
  </div>
  ${String(char.history || '').trim() ? `<div class="card"><h3 class="card-title">History</h3><p class="s-history">${escapeHtml(char.history)}</p></div>` : ''}`;
}

/* ---------- PEEK: the hero and the Band, over whatever you are doing ----------
   Tap the name in the header (or the Band chip in Moria): the sheet slides up, read-only, and
   tap-to-roll still works. Close it and you are exactly where you were. Edit stays on the Hero tab. */
let _peekSide = 'hero';
function openPeek(side) {
  _peekSide = side === 'band' && _trayHasBand() ? 'band' : 'hero';
  renderPeek();
  document.getElementById('peek-overlay').classList.add('show');
}
function closePeek() { const o = document.getElementById('peek-overlay'); if (o) o.classList.remove('show'); }
function peekRoll(name) {
  closePeek();
  const onPlay = document.querySelector('.tab.active') && document.querySelector('.tab.active').dataset.tab === 'play';
  if (onPlay && typeof playTrayRoll === 'function') return playTrayRoll(name);
  rollFromSheet(name);
}
function peekGo(where) {
  closePeek();
  if (where === 'edit') { document.querySelector('.tab[data-tab=character]').click(); setCharEditing(true); }
  else if (where === 'heroes') openRoster();
  else if (where === 'band') requireStepGo('band', 'band-allies-card');
  else if (where === 'sheet') { openNavGroup('hero'); document.querySelector('.tab[data-tab=character]').click(); }
}
function renderPeek() {
  const body = document.getElementById('peek-body'), tabs = document.getElementById('peek-tabs'), title = document.getElementById('peek-title');
  if (!body) return;
  const band = _trayHasBand();
  if (_peekSide === 'band' && !band) _peekSide = 'hero';
  if (tabs) tabs.innerHTML = band ? `<button type="button" class="${_peekSide === 'hero' ? 'on' : ''}" onclick="_peekSide='hero';renderPeek()">Hero</button><button type="button" class="${_peekSide === 'band' ? 'on' : ''}" onclick="_peekSide='band';renderPeek()">Band</button>` : '';
  if (title) title.textContent = _peekSide === 'band' ? 'Your Band' : 'Your hero';
  if (!char.culture) { body.innerHTML = '<p class="hint">No hero yet.</p><button class="btn btn-block" onclick="peekGo(\'heroes\')">Your heroes</button>'; return; }
  if (_peekSide === 'band') {
    body.innerHTML = _sheetBandHtml().replace(/ id="(sheet-band|mission-now)"/g, '').replace('<h3 class="card-title">Your Band</h3>', '')
      .replace(`onclick="requireStepGo('band','band-allies-card')">Open the Band tab — rolls and tests`, `onclick="peekGo('band')">Open the Band tab — roster and mission`) +
      `<p class="hint" style="text-align:left">Roll the Band's Dispositions and tests from the <strong>Roll</strong> tray on ▶ Play.</p>`;
    return;
  }
  // The same sheet as the Hero tab, without its ids (they belong to the tab) and with rolls routed here.
  body.innerHTML = heroSheetHtml()
    .replace(/ id="[^"]*"/g, '')
    .replace(/rollFromSheet\(/g, 'peekRoll(')
    .replace(/onclick="setCharEditing\(true\)"/g, `onclick="peekGo('edit')"`) +
    `<div class="peek-actions"><button type="button" class="btn btn-secondary" onclick="peekGo('heroes')">Switch or add a hero</button><button type="button" class="btn btn-quiet" onclick="peekGo('sheet')">Open the Hero tab</button></div>`;
}
function renderBandPill() {
  const p = document.getElementById('band-pill'); if (!p) return;
  const on = _trayHasBand();
  p.hidden = !on;
  if (!on) return;
  const all = char.band.allies, up = all.filter(a => !a.outOfAction).length;
  p.innerHTML = `<svg class="ic" aria-hidden="true"><use href="#i-users"/></svg>Band <strong>${up}/${all.length}</strong>`;
}

/* ---------- VITALS BAR (header HUD) ----------
   The numbers a player watches in play — Endurance, Hope with Shadow creeping into it,
   the Eye, and any condition the rules impose — on every tab, not only the Character tab.
   Tapping it opens a quick-adjust sheet that routes through adj(), so caps, triggers and
   undo behave exactly as they do on the sheet. */
function _hudConditions() {
  const t = [];
  const end = parseInt(char.endCur) || 0;
  if (end <= 0 && char.culture) t.push({ k: 'dying', label: 'Dying', set: true });
  if (char.wounded) t.push({ k: 'wounded', label: 'Wounded', set: true });
  const autoWeary = end <= (parseInt(char.load) || 0) + (parseInt(char.fatigue) || 0);
  const shadowT = (parseInt(char.shadow) || 0) + (parseInt(char.scars) || 0);
  const autoMiser = char.hopeMax > 0 && shadowT >= (parseInt(char.hopeCur) || 0);
  if (char.weary || autoWeary) t.push({ k: 'weary', label: 'Weary', set: !!char.weary });
  if (char.miserable || autoMiser) t.push({ k: 'miserable', label: 'Miserable', set: !!char.miserable });
  return t;
}
/** Round 5: a change slides the bar from where it was and floats the difference up off it. */
let _hudPrev = null;
function _hudAnimate(now) {
  const prev = _hudPrev; _hudPrev = now;
  if (!prev || prev.id !== now.id) return;
  const still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const one = (hostId, from, to, fromMax, toMax, label, sfrom, sto) => {
    const host = document.getElementById(hostId); if (!host) return;
    const bar = host.querySelector('.m-bar > i:not(.shadow)'), sb = host.querySelector('.m-bar > i.shadow');
    const pct = (v, m) => m > 0 ? Math.max(0, Math.min(100, v / m * 100)) : 0;
    if (!still && bar && (from !== to || fromMax !== toMax)) { const w = bar.style.width; bar.style.transition = 'none'; bar.style.width = pct(from, fromMax) + '%'; void bar.offsetWidth; bar.style.transition = ''; bar.style.width = w; }
    if (!still && sb && sfrom !== sto) { const w = sb.style.width; sb.style.transition = 'none'; sb.style.width = pct(sfrom, fromMax) + '%'; void sb.offsetWidth; sb.style.transition = ''; sb.style.width = w; }
    const d = to - from, ds = (sto || 0) - (sfrom || 0);
    // Round 7: the change is a small pill that takes the label's place in the meter for a moment
    // ("−3 End" says what it is), so it lands on neither the number, the bar, the header name nor the chips.
    const val = host.querySelector('.m-val');
    let pills = null;
    const float = (txt, cls) => {
      if (!pills) { pills = document.createElement('span'); pills.className = 'fd7-wrap'; pills.setAttribute('aria-hidden', 'true'); host.appendChild(pills); host.classList.add('delta-on');
        const mine = pills; clearTimeout(host._fdT); host.querySelectorAll('.fd7-wrap').forEach(w => { if (w !== mine) w.remove(); });
        host._fdT = setTimeout(() => { mine.remove(); host.classList.remove('delta-on'); }, 1500); }
      const f = document.createElement('span'); f.className = 'fdelta fd7 ' + cls; f.textContent = txt; pills.appendChild(f); };
    if (d) float((d > 0 ? '+' : '−') + Math.abs(d) + ' ' + label, d > 0 ? 'up' : 'down');
    if (ds) float((ds > 0 ? '+' : '−') + Math.abs(ds) + ' Shadow', ds > 0 ? 'down shadowd' : 'up');
    if (!still && val && d) {
      const t0 = performance.now();
      const step = t => { const k = Math.min(1, (t - t0) / 420); const first = val && [...val.childNodes].find(n => n.nodeType === 3); if (first) first.nodeValue = String(Math.round(from + d * k)); if (k < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    }
  };
  one('hud-end', prev.end, now.end, prev.endMax, now.endMax, 'End');
  one('hud-hope', prev.hope, now.hope, prev.hopeMax, now.hopeMax, 'Hope', prev.sh, now.sh);
}
function _meter(label, cur, max, cls, extraPct, icon) {
  const pct = max > 0 ? Math.max(0, Math.min(100, cur / max * 100)) : 0;
  const shadow = extraPct ? `<i class="shadow" style="width:${Math.min(100, extraPct)}%"></i>` : '';
  const ic = icon ? `<svg class="m-ic" aria-hidden="true"><use href="#${icon}"/></svg>` : '';
  return `<span class="m-label">${ic}${label}</span><span class="m-val">${cur}<small>/${max}</small></span>` +
         `<span class="m-bar ${cls}"><i style="width:${pct}%"></i>${shadow}</span>`;
}
function renderHud() {
  const hud = document.getElementById('hud'); if (!hud) return;
  const mono = document.getElementById('hdr-monogram');
  const built = !!char.culture;
  hud.style.display = built ? '' : 'none';
  if (mono) {
    mono.style.display = built ? '' : 'none';
    const key = (char.culture || '') + '|' + (char.name || '');
    if (mono.dataset.key !== key) { mono.dataset.key = key; mono.innerHTML = cultureCrest(char.culture, 36, char.name); }
  }
  renderBandPill();
  const nameEl = document.getElementById('char-name-text');
  if (nameEl) {
    const n = String(char.name || '').trim(); const full = n || (built ? heroLabel(char) : 'Unnamed hero');
    // On a phone the header carries the given name only; the whole name lives on the sheet.
    const short = n ? shortHeroName(n) : full;
    if (short !== full) { nameEl.innerHTML = `<span class="hn-short" aria-hidden="true">${escapeHtml(short)}</span><span class="hn-full">${escapeHtml(full)}</span>`; nameEl.title = full; }
    else { nameEl.textContent = full; nameEl.removeAttribute('title'); }
    nameEl.classList.toggle('unnamed', !n);
  }
  if (!built) return;
  const end = parseInt(char.endCur) || 0, endMax = parseInt(char.endMax) || 0;
  const hope = parseInt(char.hopeCur) || 0, hopeMax = parseInt(char.hopeMax) || 0;
  const sh = (parseInt(char.shadow) || 0) + (parseInt(char.scars) || 0);
  const weary = end <= (parseInt(char.load) || 0) + (parseInt(char.fatigue) || 0);
  document.getElementById('hud-end').innerHTML = _meter('Endurance', end, endMax, weary ? 'end low' : 'end', 0, 'i-heart');
  document.getElementById('hud-hope').innerHTML = _meter('Hope', hope, hopeMax, 'hope', hopeMax ? sh / hopeMax * 100 : 0, 'i-star');
  _hudAnimate({ id: activeCharId, end, endMax, hope, hopeMax, sh });
  const CIC = { shadow: 'i-moon', weary: 'i-weary', miserable: 'i-rain', wounded: 'i-drop', dying: 'i-skull' };
  const cic = k => `<svg class="chip-ic" aria-hidden="true"><use href="#${CIC[k]}"/></svg>`;
  document.getElementById('hud-chips').innerHTML = (sh ? `<span class="chip shadow" title="Shadow (incl. Scars). When it reaches your Hope you are Miserable.">${cic('shadow')}Shadow ${sh}</span>` : '') + _hudConditions()
    .map(c => `<span class="chip ${c.k}${c.set ? '' : ' auto'}" title="${c.set ? '' : 'The rules say this applies — tap Weary/Miserable on the Character tab to confirm.'}">${cic(c.k)}${c.label}</span>`).join('');
}
// Conditions + the in-play actions that used to live on the Character tab form.
function _vitalsConditions() {
  const c = (k, label, help) => `<button class="v-cond${char[k] ? ' on' : ''}" aria-pressed="${!!char[k]}" onclick="vitalsCondition('${k}')"><strong>${label}</strong><small>${help}</small></button>`;
  const wound = char.wounded ? `<div class="v-wound"><span>${escapeHtml(char.injury || 'Wounded')}</span>
      <button class="btn btn-secondary" onclick="closeVitals();rollFirstAid()">Tend the wound</button>
      <button class="btn btn-quiet" onclick="closeVitals();clearWound()">The wound has passed</button></div>` : '';
  return `<div class="v-h">Conditions</div><div class="v-conds">${c('weary', 'Weary', '1–3 on success dice count 0')}${c('miserable', 'Miserable', 'an Eye fails the roll')}${c('wounded', 'Wounded', 'needs healing')}</div>${wound}`;
}
function vitalsCondition(k) {
  const b = document.querySelector(`#panel-character .cond-btn[data-cond="${k}"]`);
  if (b) b.click();                      // the real toggle: severity roll, snapshot, journal, undo
  setTimeout(renderVitalsBody, 60);
}
function _vitalsActions() {
  const A = (label, fn, sub) => `<button class="v-act" onclick="closeVitals();${fn}"><strong>${label}</strong>${sub ? `<small>${sub}</small>` : ''}</button>`;
  const shadow = (parseInt(char.shadow) || 0);
  return `<div class="v-h">Actions</div><div class="v-acts">` +
    (shadow > 0 ? A('Harden your will', 'hardenWill()', 'Shadow becomes one permanent Scar') : '') +
    // a lone hero has no ally to support and no Company pool to draw on (round 4)
    (!isSolo() ? A('Support an ally', 'spendHopeToSupport()', 'Spend 1 Hope for their roll') : '') +
    (!isSolo() && (parseInt(char.fellowship) || 0) > 0 ? A('Fellowship → Hope', 'spendFPforHope()', 'During a rest') : '') +
    (char.experienceMode === 'milestone' ? A('Award a milestone', 'openMilestonePicker()', 'Experience for a deed you just did') : '') +
    (sagaState().started
      ? A('End the session', 'sagaEndSession()', (char.experienceMode === 'milestone' || isSolo()) ? 'Close for today — a recap waits next time' : '+3 Skill & Adventure points')
      : (char.experienceMode === 'milestone' ? '' : A('End the session', 'awardSessionXP()', '+3 Skill & Adventure points'))) +
    A('Fellowship Phase', "(char.moriaMode ? (openNavGroup('adventure'), document.querySelector('.tab[data-tab=band]').click()) : openFPWizard())", 'Rest between adventures') +
    `</div>`;
}
function openVitals() {
  renderVitalsBody();
  document.getElementById('vitals-overlay').classList.add('show');
}
function closeVitals() { document.getElementById('vitals-overlay').classList.remove('show'); }
function vitalsAdj(field, d) { adj(field, d); renderVitalsBody(); }
function renderVitalsBody() {
  const host = document.getElementById('vitals-body'); if (!host) return;
  const row = (label, field, cur, max, help) => `
    <div class="v-row">
      <div class="v-text"><strong>${label}</strong><span>${help}</span></div>
      <button class="v-btn" aria-label="${label} down" onclick="vitalsAdj('${field}',-1)">−</button>
      <span class="v-num">${cur}${max !== null ? `<small>/${max}</small>` : ''}</span>
      <button class="v-btn" aria-label="${label} up" onclick="vitalsAdj('${field}',1)">+</button>
    </div>`;
  const sh = parseInt(char.shadow) || 0, sc = parseInt(char.scars) || 0;
  host.innerHTML =
    row('Endurance', 'endCur', parseInt(char.endCur) || 0, parseInt(char.endMax) || 0, 'Goes down when you are hurt or tire.') +
    row('Hope', 'hopeCur', parseInt(char.hopeCur) || 0, parseInt(char.hopeMax) || 0, 'Spend it for +1 die. Rest restores it.') +
    row('Shadow', 'shadow', sh, null, sc ? `Plus ${sc} permanent Scar${sc > 1 ? 's' : ''}.` : 'Dread and misdeeds add it.') +
    row('Fatigue', 'fatigue', parseInt(char.fatigue) || 0, null, 'From travel. A Safe Haven rest clears it.') +
    `<div class="v-actions">
       <button class="btn btn-secondary" onclick="closeVitals();takeShortRest()">Short rest</button>
       <button class="btn btn-secondary" onclick="closeVitals();takeProlongedRest()">Sleep (long rest)</button>
     </div>
     ${_vitalsConditions()}
     ${_vitalsActions()}
     <button class="btn btn-quiet btn-block" onclick="closeVitals();openNavGroup('hero')">Open the full character sheet</button>`;
}

function _playConditionBanner() {
  const dying = (parseInt(char.endCur) || 0) <= 0;
  const notes = [];
  if (dying) notes.push('<strong>You are Dying.</strong> Endurance has hit 0. You are not dead — you are down: you cannot act, cannot defend yourself, and cannot spend Hope, and any further harm can kill you. Get Endurance above 0 before anything else.');
  if (char.wounded) notes.push('<strong>You are Wounded.</strong> A Wound does not heal with an ordinary rest — it needs treatment and time. Wounded <em>and</em> at 0 Endurance is how heroes actually die.');
  if (!dying && char.miserable) notes.push('<strong>You are Miserable.</strong> Shadow has caught up with you: an 👁 on the Feat die now fails the roll automatically.');
  if (!dying && !char.miserable && char.weary) notes.push('<strong>You are Weary.</strong> Success dice showing 1–3 count as nothing until you rest.');
  if (!notes.length) return '';
  return `<div class="card callout danger">
    <h3 class="card-title"${dying ? ' data-hint="Dying"' : ''}>${dying ? 'You are Dying' : 'Take care'}</h3>
    <p>${notes.join('</p><p>')}</p>
  </div>`;
}

/* Wide screens (tablet landscape / desktop): the hero's key numbers beside the story, so a
   player never has to leave Play to check a TN or a skill. Hidden by CSS below 1100px. */
function renderPlayAside() {
  const el = document.getElementById('play-aside'); if (!el) return;
  if (!char.culture) { el.innerHTML = ''; return; }
  const attr = (k, n) => `<div class="pa-attr">${typeof ATTR_GLYPH !== 'undefined' ? `<svg class="ic a-ic" aria-hidden="true"><use href="#${ATTR_GLYPH[k]}"/></svg>` : ''}<span>${n}</span><strong>${parseInt(char[k + 'Rating']) || 0}</strong><small>TN ${parseInt(char[k + 'TN']) || 0}</small></div>`;
  const skills = Object.entries(char.skills || {})
    .map(([n, v]) => ({ n, r: parseInt(v && v.rating) || 0, f: !!(v && v.favoured) }))
    .filter(s => s.r > 0 || s.f).sort((a, b) => b.r - a.r || a.n.localeCompare(b.n)).slice(0, 10);
  const weapons = (char.weapons || []).filter(w => w && w.name);
  el.innerHTML = `<div class="card">
    <div class="eyebrow">Your hero</div>
    <h3 class="card-title">${escapeHtml(heroLabel(char))}</h3>
    <p class="pa-sub">${escapeHtml([char.culture, char.calling].filter(Boolean).join(' · '))}</p>
    <div class="pa-attrs">${attr('str', 'Strength')}${attr('hrt', 'Heart')}${attr('wit', 'Wits')}</div>
    <div class="pa-line"><span>Parry</span><strong>${(parseInt(char.parry) || 0) + (parseInt(char.shieldTotal) || 0)}</strong>
      <span>Armour</span><strong>${(parseInt(char.armourProt) || 0) + (parseInt(char.helmProt) || 0)}d</strong>
      <span>Valour</span><strong>${parseInt(char.valour) || 0}</strong><span>Wisdom</span><strong>${parseInt(char.wisdom) || 0}</strong></div>
    ${skills.length ? `<div class="pa-h">Best skills</div><ul class="pa-skills">${skills.map(s => `<li>${s.f ? '★ ' : ''}${escapeHtml(s.n)}<span>${'◆'.repeat(s.r)}</span></li>`).join('')}</ul>` : ''}
    ${weapons.length ? `<div class="pa-h">Weapons</div><ul class="pa-skills">${weapons.map(w => `<li>${escapeHtml(w.name)}<span>${w.dmg || '–'} / ${w.inj || '–'}</span></li>`).join('')}</ul>` : ''}
  </div>`;
}

/* "(Travel roll 6 vs 15 — failure.)" in the story becomes a small dice pill. */
function _rollPills(html) {
  return String(html).replace(/\((\w[\w ]*?) roll (\d+|ᚱ|Rune) vs (\d+) — (success|failure)\.\)/g,
    (m, sk, a, b, o) => rollPillHtml(sk, a, b, o === 'success'));
}
/** The dice pill every result line shares: label, total, /TN, coloured by how it went for YOU. */
function rollPillHtml(label, total, tn, good, title) {
  const t = (total === null || total === undefined || total === 'ᚱ') ? 'Rune' : total;
  return `<span class="roll-pill ${good ? 'ok' : 'fail'}" title="${escapeHtml(title || `${label} roll ${t} against ${tn}: ${good ? 'success' : 'failure'}`)}"><svg class="ic"><use href="#i-dice"/></svg>${escapeHtml(String(label))} ${t}<small>/${tn}</small></span>`;
}
/* The journey as a road: a stone per stretch, the hero's marker, the next event flagged. */
function _roadStrip(cur, total, nextEvent) {
  const n = Math.min(total, 24);
  const at = Math.round(cur / total * n), ev = nextEvent ? Math.round(nextEvent / total * n) : -1;
  let dots = '';
  for (let i = 0; i <= n; i++) dots += `<i class="${i < at ? 'done' : ''}${i === at ? ' here' : ''}${i === ev && i > at ? ' ev' : ''}"></i>`;
  return `<div class="road" role="img" aria-label="${cur} of ${total} stretches travelled"><div class="road-track">${dots}</div>` +
    `<div class="road-ends"><span>Setting out</span><span>${cur} / ${total}</span><span>Journey’s end</span></div></div>`;
}

function renderPlay() {
  renderPlayAside();
  const host = document.getElementById('play-body'); if (!host) return;
  const s = sagaState();
  const pp = document.getElementById('panel-play'); if (pp) pp.classList.toggle('no-hero', !char.culture);
  // In a cloud campaign ▶ Play is the table sheet (players) or the table console (Loremaster).
  const atTable = typeof tableActive === 'function' && tableActive();
  if (pp) pp.classList.toggle('table-mode', atTable);
  if (atTable) return renderTablePlay(host);
  // Re-rendering replaced the whole page, so every roll threw the view back to the top. Keep the
  // reader where they were, and bring the newest line of the story into view when one was added.
  const keepY = window.scrollY, seenFeed = window._playFeedSeen || 0;
  try { _renderPlayBody(host, s, pp); }
  finally {
    const fd = host.querySelector('.play-feed'); if (fd) fd.scrollTop = fd.scrollHeight;   // newest at the bottom, in view
    if (pp && pp.classList.contains('active')) {
      if (Math.abs(window.scrollY - keepY) > 2) window.scrollTo(0, keepY);
      const fresh = _playFeed.length > seenFeed;
      const last = fresh && host.querySelector('.play-feed > :last-child');
      if (last) last.scrollIntoView({ block: 'nearest', behavior: 'auto' });
    }
    window._playFeedSeen = _playFeed.length;
  }
}
function _renderPlayBody(host, s, pp) {
  if (!char.culture) {
    host.innerHTML = '<div class="card play-empty"><div class="eyebrow">Welcome</div><h3 class="card-title">First, a hero</h3>' +
      '<p>You need someone to play. A ready-made hero takes one tap; making your own takes a few minutes.</p>' +
      '<button class="btn btn-block" onclick="openPregens()">Give me a ready-made hero</button>' +
      '<button class="btn btn-secondary btn-block" onclick="document.querySelector(\'.tab[data-tab=build]\').click()">I\'ll make my own</button>' +
      '<button class="btn btn-quiet btn-block" onclick="startTutorialFromWelcome()">' + (typeof tutorialOffered === 'function' && tutorialOffered() ? 'Take the guided tutorial' : 'New to the game? Take the guided tutorial first') + '</button></div>';
    return;
  }
  if (!s.started) {
    host.innerHTML = '<div class="card play-empty"><div class="eyebrow">Ready</div><h3 class="card-title">Your story hasn\'t started</h3>' +
      '<p>You have a hero. Now they need a reason to leave home — that is all a campaign needs to begin.</p>' +
      '<button class="btn btn-block" onclick="sagaBegin().then(renderPlay)">Begin — give me a reason to go</button></div>';
    return;
  }
  if (s.ended) {
    host.innerHTML = '<div class="card play-empty"><div class="eyebrow">The end</div><h3 class="card-title">The tale is told</h3>' +
      `<p><em>${escapeHtml(s.endedHow)}</em></p>` +
      '<button class="btn btn-secondary btn-block" onclick="sagaReopen().then(renderPlay)">Actually, continue it</button></div>';
    return;
  }

  if (_placeFight() && window._playSceneKind !== 'fight') {
    const k = window._playSceneKind, sc = PLAY_SCENES[k];
    const feedS = _playFeed.slice(-6).map(f => f.kind === 'event' ? f.text : `<p class="${f.kind === 'aside' ? 'aside' : ''}">${_rollPills(f.text)}</p>`).join('');
    const done = sc.done();
    host.innerHTML = _playConditionBanner() +
      `<div class="card play-fight-log"><div class="eyebrow">${escapeHtml(sc.label)}</div>
        ${feedS ? `<div class="play-feed" aria-live="polite">${feedS}</div>` : ''}
        <button type="button" class="btn ${done ? '' : 'btn-secondary '}btn-block" onclick="playEndScene()">${done ? 'Back to the story' : 'Leave this for now — back to the story'}</button></div>
      ${k === 'fp' || k === 'mfp' ? '' : playTrayHtml()}`;
    return;
  }
  if (window._playFightPlaced) {
    const e = enc(), b = char.battle || {};
    const feedF = _playFeed.slice(-8).map(f => f.kind === 'event' ? f.text : `<p class="${f.kind === 'aside' ? 'aside' : ''}">${_rollPills(f.text)}</p>`).join('');
    host.innerHTML = _playConditionBanner() +
      `<div class="card play-fight-log"><div class="eyebrow">${b.active ? 'A battle' : 'A fight'}${_playFoesStanding() ? ` — round ${parseInt(e.round) || 1}` : ''}</div>
        <p class="hint" style="text-align:left;margin:0 0 6px">${b.active && !_playFoesStanding() ? 'Lead the Band through the Clash here. When the foe is broken, the story goes on.' : 'Fight it out here. When the last foe falls or you get away, the story goes on.'}</p>
        ${feedF ? `<div class="play-feed" aria-live="polite">${feedF}</div>` : ''}</div>
      ${playTrayHtml()}`;
    return;
  }
  const sit = char.retired ? _playRetiredSituation() : _playSituation();
  const choices = _playChoices();
  const feed = _playFeed.length
    ? _playFeed.slice(-8).map(f => f.kind === 'event' ? f.text : `<p class="${f.kind === 'aside' ? 'aside' : ''}">${_rollPills(f.text)}</p>`).join('')
    : '';
  const split = lbl => {
    const m = String(lbl).match(/^(\p{Extended_Pictographic}\uFE0F?|[▶↩✔✖🏁])\s*/u);
    return m ? [m[1], lbl.slice(m[0].length)] : ['', lbl];
  };

  const jr = char.journey || {};
  const terrain = typeof sceneTerrain === 'function' ? sceneTerrain() : 'road';
  // A journey planned on the map shows the real map, with you on it; others keep the drawn strip.
  const road = (jr.active && parseInt(jr.totalHexes) > 0)
    ? (Array.isArray(jr.route) && typeof liveRouteMap === 'function') ? liveRouteMap(jr)
    : (typeof routeMap === 'function'
        ? routeMap(parseInt(jr.currentHex) || 0, parseInt(jr.totalHexes), jr.nextEventHex, jr.origin || char.safeHaven, jr.destination, terrain, { log: jr.events, days: parseInt(jr.daysElapsed) || 0 })
        : _roadStrip(parseInt(jr.currentHex) || 0, parseInt(jr.totalHexes), jr.nextEventHex)) : '';
  host.innerHTML =
    _playConditionBanner() +
    `<div class="play-left"><div class="card ornate play-scene${['journey', 'home'].includes(s.step) && (char.journey || {}).active ? ' on-road' : ''}" ${_sceneMood(s)}>
       ${typeof terrainVignette === 'function' ? terrainVignette(terrain, _sceneArtOpts(s)) : ''}
       <div class="eyebrow">Where you are</div>
       <h3 class="card-title">${escapeHtml(sit.title)}</h3>
       <div class="play-sit">${sit.text}</div>
       ${missionActive() && char.mission.objective ? `<p class="play-mission"><small>Mission</small> ${escapeHtml(char.mission.objective)}</p>` : ''}
       ${road}
       ${feed ? `<div class="play-feed" aria-live="polite">${feed}</div>` : ''}
     </div>${_playStoryCard(!!road)}${typeof heroPlate === 'function' ? heroPlate(!road) : ''}</div>
     <div class="play-choices" role="group" aria-label="What do you do?">
       <div class="eyebrow">What do you do?</div>
       ${choices.map((c, i) => { const [ico, txt] = split(c.label); const icId = (typeof EMOJI_ICON !== 'undefined') && EMOJI_ICON[String(ico).replace('\uFE0F', '')]; return `<button class="choice${i === 0 ? ' primary' : ''}" onclick="${c.fn}">
            <span class="c-ico" aria-hidden="true">${icId ? `<svg class="ic"><use href="#${icId}"/></svg>` : (ico || '•')}</span>
            <span class="c-txt"><strong>${escapeHtml(txt)}</strong>${c.hint ? `<small>${escapeHtml(c.hint)}</small>` : ''}</span>
            <svg class="ic c-chev" aria-hidden="true"><use href="#i-chev"/></svg>
          </button>`; }).join('')}
     </div>
     ${playTrayHtml()}
     ${isSolo() ? '<p class="play-foot">Everything that happens here is written into your Chronicle for you.</p>' : ''}
     ${typeof playFooterArt === 'function' ? playFooterArt() : ''}`;
  // Round 8: when the story moves (home → road → place), the scene cross-fades and its heading writes in
  const key = (s.step || '') + '|' + terrain + '|' + (jr.active ? 1 : 0);
  if (window._playSceneKey && window._playSceneKey !== key) { const sc = host.querySelector('.play-scene'); if (sc) sc.classList.add('scene-change'); }
  window._playSceneKey = key;
}
/** Tablet (round 5): under the scene, the story so far from the Chronicle, and the last road
    walked on the map when you are not on one now. Hidden on phones, where the page is already long. */
/** Round 5: the scene takes the colour of the story's season and hour, and dims in dark lands. */
/** Round 6: what the scene art adds on top of the land — the road, mist, the Eye. */
function _sceneArtOpts(s) {
  const jr = char.journey || {};
  const onRoad = ['journey', 'home'].includes(s && s.step) && !!jr.active;
  const region = String(jr.active ? ((typeof journeyRegionNow === 'function' ? journeyRegionNow(jr, parseInt(jr.currentHex) || 0) : '') || jr.region || '') : '').toLowerCase();
  const mist = (typeof isMoria === 'function' && isMoria()) || /dark|shadow/.test(region);
  let eye = 0;
  if (typeof isSolo === 'function' && isSolo() && typeof huntThreshold === 'function') {
    const hunt = huntThreshold(char);
    const ea = parseInt(char.eyeAwareness) || 0;
    if (hunt > 0 && ea >= hunt - 4) eye = Math.min(1, (ea - (hunt - 4)) / 4 + .25);
  }
  // Round 7: weather from the story's season and hour — snow in winter, leaves in autumn, stars at night
  const mood = _sceneMood(s);
  const season = (mood.match(/data-season="([a-z]+)"/) || [])[1], time = (mood.match(/data-time="([a-z]+)"/) || [])[1];
  const weather = (typeof isMoria === 'function' && isMoria()) ? '' : time === 'night' ? 'stars' : season === 'winter' ? 'snow' : season === 'autumn' ? 'leaves' : '';
  return { road: onRoad, mist, eye, weather };
}
function _sceneMood(s) {
  const jr = char.journey || {};
  let season = jr.active && jr.season ? String(jr.season).toLowerCase() : '';
  try { if (!season && typeof journal !== 'undefined' && journal.clock && typeof monthSeason === 'function') season = String(monthSeason(journal.clock.month) || '').toLowerCase(); } catch (e) {}
  const step = s && s.step;
  const time = step === 'fellowship' ? 'night' : (step === 'haven' || step === 'home') && !jr.active ? 'dusk' : 'day';
  const region = String(jr.active ? (typeof journeyRegionNow === 'function' ? (journeyRegionNow(jr, parseInt(jr.currentHex) || 0) || jr.region) : jr.region) : '').toLowerCase();
  const gloom = (typeof isMoria === 'function' && isMoria()) || /dark|shadow/.test(region);
  return `data-season="${escapeHtml(season || 'spring')}" data-time="${time}"${gloom ? ' data-gloom="1"' : ''}`;
}
function shortHeroName(n) {
  const m = String(n).split(/,|\s+(?:son|daughter|child) of\s+|\s+['‘“"(]/i)[0].trim();
  return m || String(n);
}
function _playStoryCard(onRoad) {
  const ents = (typeof journal !== 'undefined' && journal && Array.isArray(journal.entries)) ? journal.entries : [];
  const lines = ents.slice(-6).map(e => {
    const t = (typeof _playPlainText === 'function' ? _playPlainText(e.text) : String(e.text || '')).trim();
    return t ? `<p class="${e.kind === 'auto' ? 'ps-auto' : ''}">${escapeHtml(t.length > 220 ? t.slice(0, 217) + '…' : t)}</p>` : '';
  }).filter(Boolean).join('');
  const jr = char.journey || {};
  const lastRoad = !onRoad && Array.isArray(jr.route) && jr.route.length && typeof liveRouteMap === 'function'
    ? `<div class="eyebrow">The road behind you</div>${liveRouteMap(jr)}` : '';
  if (!lines && !lastRoad) return '<div class="card play-story empty"><div class="eyebrow">The story so far</div><p class="ps-empty">Nothing written yet — what you do here is set down in your Chronicle as you go.</p></div>';
  return `<div class="card play-story">${lines ? `<div class="eyebrow">The story so far</div><div class="ps-lines">${lines}</div>` : ''}${lastRoad}</div>`;
}
/** Pinned quick rolls on Play (round 3): the hero's three strongest skills, plus "Again" for
    the last roll made anywhere — so the common rolls never need a trip to the Roll tab. */
/* ---------- ▶ PLAY ROLL TRAY ----------
   Play is the one screen: every roll a player makes in play — any skill, Valour, Wisdom, a weapon,
   and in Moria the Band's Dispositions and its Endurance and Fatigue tests — sits in one tray pinned
   above the nav on a phone (open beside the choices on a tablet). The result lands in the story feed
   as a dice pill and what it means; "Details" opens the full dice in the drawer. */
let _trayOpen = false, _traySide = 'hero';
function _trayHasBand() { return typeof isMoria === 'function' && isMoria() && ((char.band && char.band.allies) || []).length > 0; }
function togglePlayTray(on) { _trayOpen = on === undefined ? !_trayOpen : !!on; const t = document.getElementById('play-tray'); if (t) t.classList.toggle('open', _trayOpen); }
function setTraySide(side) { _traySide = side; _trayOpen = true; const t = document.getElementById('play-tray'); if (t) t.outerHTML = playTrayHtml(); }
function playTrayHtml() {
  if (!char.culture) return '';
  const band = _trayHasBand();
  const side = band ? _traySide : 'hero';
  const n = v => parseInt(v) || 0;
  const pips = k => k > 0 ? `<span class="pt-pips">${Array.from({ length: Math.min(k, 6) }, () => '<i></i>').join('')}</span>` : '<span class="pt-pips none">–</span>';
  const gl = a => (typeof ATTR_GLYPH !== 'undefined' && ATTR_GLYPH[a]) ? `<svg class="ic" aria-hidden="true"><use href="#${ATTR_GLYPH[a]}"/></svg>` : '';
  const btn = (name, rating, fav, cls) => `<button type="button" class="pt-roll${rating ? '' : ' zero'}${fav ? ' fav' : ''}${cls ? ' ' + cls : ''}" onclick="playTrayRoll('${name.replace(/'/g, "\\'")}')"><span>${fav ? '<b class="fav" aria-label="Favoured">★</b>' : ''}${escapeHtml(name)}</span>${pips(rating)}</button>`;
  let body;
  if (side === 'hero') {
    const col = (a, title) => `<div class="pt-col"><div class="pt-h">${gl(a)}${title}<small>TN ${n(char[a + 'TN'])}</small></div>${SKILLS[a].map(sk => { const d = (char.skills || {})[sk] || {}; return btn(sk, n(d.rating), !!d.favoured); }).join('')}</div>`;
    const profs = COMBAT_PROFS.filter(p => n((char.profs || {})[p]) > 0).map(p => btn(p, n(char.profs[p]), false, 'wpn')).join('');
    const brawl = typeof getBrawlingRating === 'function' && getBrawlingRating() > 0 ? btn('Brawling', getBrawlingRating(), false, 'wpn') : '';
    body = `<div class="pt-cols">${col('str', 'Strength')}${col('hrt', 'Heart')}${col('wit', 'Wits')}</div>
      <div class="pt-meta">${btn('Valour', n(char.valour) || 1, (char.culture === 'Bardings'), 'pt-wide')}${btn('Wisdom', n(char.wisdom) || 1, (char.culture === 'Hobbits of the Shire'), 'pt-wide')}${profs}${brawl}</div>`;
  } else {
    const b = char.band;
    body = `<div class="pt-h pt-bandh">Your Band<small>Readiness ${n(b.readiness)} · TN ${bandTN()}${bandWeary() ? ' · Weary' : ''}</small></div>
      <div class="pt-disps">${DISPOSITIONS.map(d => `<button type="button" class="pt-roll pt-disp${b.dispositionFocus === d.key ? ' fav' : ''}" onclick="playBandRoll('${d.key}')">${typeof DISP_GLYPH !== 'undefined' && DISP_GLYPH[d.key] ? `<svg class="ic" aria-hidden="true"><use href="#${DISP_GLYPH[d.key]}"/></svg>` : ''}<span>${b.dispositionFocus === d.key ? '<b class="fav" aria-label="Disposition Focus">★</b>' : ''}${d.name}</span>${pips(n(b.dispositions[d.key]))}</button>`).join('')}</div>
      <div class="pt-meta"><button type="button" class="pt-roll pt-wide" onclick="playBandTest('endurance')"><span>Endurance test</span><small>Rally · after a blow</small></button><button type="button" class="pt-roll pt-wide" onclick="playBandTest('fatigue')"><span>Fatigue test</span><small>Rally · after hardship</small></button></div>`;
  }
  const last = window._lastQuick;
  return `<div class="play-tray${_trayOpen ? ' open' : ''}" id="play-tray" data-side="${side}">
    <div class="pt-bar">
      <button type="button" class="pt-toggle" onclick="togglePlayTray()" aria-expanded="${_trayOpen}"><svg class="ic" aria-hidden="true"><use href="#i-dice"/></svg>Roll<svg class="ic pt-chev" aria-hidden="true"><use href="#i-chev"/></svg></button>
      ${band ? `<div class="pt-tabs" role="tablist"><button type="button" role="tab" aria-selected="${side === 'hero'}" class="${side === 'hero' ? 'on' : ''}" onclick="setTraySide('hero')">Hero</button><button type="button" role="tab" aria-selected="${side === 'band'}" class="${side === 'band' ? 'on' : ''}" onclick="setTraySide('band')">Band</button></div>` : ''}
      ${last && last.item ? `<button type="button" class="pt-again" onclick="playTrayRoll('${String(last.item.name).replace(/'/g, "\\'")}')">Again: ${escapeHtml(last.item.name)}</button>` : ''}
    </div>
    <div class="pt-body">${body}</div>
  </div>`;
}
/** The one question asked before the dice: the real choices (spend Hope, use an ally's Gift).
    Everything the rules apply by themselves is applied and named in the result. Nothing to choose → no question. */
async function _rollPrompt(title, line, opts) {
  if (!opts.length) return { go: true, picks: {} };
  const go = await showModal({
    title, message: `<p style="margin:0 0 10px">${line}</p>` + opts.map(o =>
      `<label class="rp-opt"><input type="${o.radio ? 'radio' : 'checkbox'}" name="${o.radio || o.id}" id="rp-${o.id}" value="${o.id}"${o.checked ? ' checked' : ''}><span>${o.label}</span></label>`).join(''),
    buttons: [{ label: 'Roll', value: true }, { label: 'Not now', value: false, cancel: true }]
  });
  const picks = {};
  opts.forEach(o => { const el = document.getElementById('rp-' + o.id); picks[o.id] = !!(el && el.checked); });
  return { go: !!go, picks };
}
/** A dice result as one line of the story: the pill, a word, what it means, and the full dice one tap away. */
function _playRollSaid(label, total, tn, ok, icons, meaning, extra) {
  const word = !ok ? 'Failure' : icons >= 2 ? 'Extraordinary success' : icons === 1 ? 'Great success' : 'Success';
  return `${rollPillHtml(label, total, tn, ok)} <strong>${word}</strong>${meaning ? ' — ' + escapeHtml(meaning) : ''}${extra ? ' ' + extra : ''} <button type="button" class="pt-details" onclick="openRollDrawer()">Details</button>`;
}
function _playAfterRoll() {
  if (typeof renderPlay === 'function') renderPlay();
}
async function playTrayRoll(name) {
  const r = _rollables().find(x => x.item.name === name); if (!r) return;
  const hope = parseInt(char.hopeCur) || 0;
  const tn = parseInt(char[r.item.attr + 'TN']) || 0;
  const fav = r.s.favoured || r.blessingFav;
  const opts = [];
  if (hope > 0) opts.push({ id: 'hope', label: `Spend 1 Hope for +${diceState.inspired ? 2 : 1} ${diceState.inspired ? 'dice (Inspired)' : 'die'} <small>(${hope} Hope left)</small>` });
  const p = await _rollPrompt(`Roll ${name}`, `${parseInt(r.s.rating) || 0} ${parseInt(r.s.rating) === 1 ? 'die' : 'dice'} against TN ${tn}${fav ? ' · Favoured' : ''}`, opts);
  if (!p.go) return;
  diceState.hopeSpend = !!p.picks.hope;
  const before = history.length ? history[0] : null;
  window._inlineToPlay = true;
  try { quickRoll(r.item, r.s); } finally { window._inlineToPlay = false; }
  const h = history[0];
  if (!h || h === before) return;
  const ok = String(h.outcome).startsWith('SUCCESS');
  const meaning = typeof rollMeaning === 'function' ? rollMeaning(name, ok, !!r.item.isProf) : '';
  playNote(_playRollSaid(name, h.total, h.tn, ok, ok ? (parseInt(h.icons) || 0) : 0, meaning));
  _playAfterRoll();
}
async function playBandRoll(key) {
  const d = DISPOSITIONS.find(x => x.key === key); if (!d) return;
  const hope = parseInt(char.hopeCur) || 0, focus = char.band.dispositionFocus === key;
  const gifts = [];
  missionAllies().filter(a => !a.outOfAction).forEach(a => {
    if (!a.giftWasted && a.gift) gifts.push({ id: 'g_' + a.id, val: a.id, label: `${escapeHtml(a.name)}'s Gift — ${escapeHtml(a.gift)} (+1 die)` });
    if (a.kinglyGift) gifts.push({ id: 'k_' + a.id, val: a.id + '|kingly', label: `${escapeHtml(a.name)}'s Kingly Gift — ${escapeHtml(a.kinglyGift.name)} (+1 die, re-rolls an Eye)` });
  });
  const opts = [];
  if (hope > 0) opts.push({ id: 'hope', label: `Spend 1 Hope for +${focus ? '2 dice (your Disposition Focus)' : '1 die'} <small>(${hope} Hope left)</small>` });
  gifts.forEach(g => opts.push({ id: g.id, radio: 'gift', label: g.label }));
  const p = await _rollPrompt(`Band: ${d.name}`, `${parseInt(char.band.dispositions[key]) || 0} dice against TN ${bandTN()}${bandWeary() ? ' · the Band is Weary' : ''}`, opts);
  if (!p.go) return;
  const gEl = document.getElementById('band-gift-pick'), hEl = document.getElementById('band-hope-spend');
  const g = gifts.find(x => p.picks[x.id]);
  if (gEl) { gEl.innerHTML = _giftOptionsHTML('band'); gEl.value = g ? g.val : ''; }
  if (hEl) hEl.checked = !!p.picks.hope;
  const r = rollDisposition(key);
  if (!r) return;
  const ok = String(r.outcome).startsWith('SUCCESS');
  const sum = document.getElementById('band-roll-summary');
  const extras = sum ? _playPlainText(sum.innerHTML.split('<br>').slice(1).join(' · ')) : '';
  playNote(_playRollSaid('Band ' + d.name, r.total, bandTN(), ok, ok ? r.icons : 0, '', extras ? `<small>${escapeHtml(extras)}</small>` : ''));
  _playAfterRoll();
}
async function playBandTest(kind) {
  if (kind === 'endurance') {
    const t = await showModal({ title: 'Band Endurance test', message: 'How bad was the blow? (the Damage Threat)', buttons: [
      ...Object.keys(DAMAGE_THREAT).map(k => ({ label: `${k[0].toUpperCase() + k.slice(1)} (TN ${bandTN() + DAMAGE_THREAT[k]})`, value: k })),
      { label: 'Not now', value: null, cancel: true }] });
    if (!t) return;
    const out = await enduranceTest(t); if (!out) return;
    playNote(_playRollSaid('Endurance test', out.r.total, out.tn, out.r.outcome.startsWith('SUCCESS'), 0, '', `<small>${escapeHtml(_playPlainText(out.extra))}</small>`));
  } else {
    const v = await showModal({ title: 'Band Fatigue test', message: 'How many Fatigue points does the hardship carry?', input: true, inputValue: '2', buttons: [{ label: 'Roll', value: true }, { label: 'Not now', value: null, cancel: true }] });
    if (v === null || v === undefined) return;
    const out = await fatigueTest(Math.max(0, parseInt(v) || 0)); if (!out) return;
    playNote(_playRollSaid('Fatigue test', out.r.total, out.tn, out.r.outcome.startsWith('SUCCESS'), 0, '', `<small>${escapeHtml(_playPlainText(out.extra))}</small>`));
  }
  _playAfterRoll();
}
