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
    const computed = wit + pb + (parseInt(char.parryBonusVirtue) || 0);
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
    saveCharacter();
    setTimeout(async () => {
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
        char.retiredReason = isElf ? 'Sailed for Valinor (Shadow)' : 'Lost to madness (Shadow)';
        char.shadow = 0;  // moot but consistent
        saveCharacter();
        render();
        if (typeof journalAuto === 'function') journalAuto('advancement', 'milestone', `The end of the tale — ${char.retiredReason}.`);
        return;
      }

      let msg = `⚠️ BOUT OF MADNESS\n\nShadow (${char.shadow}${scarsBit}) reached Max Hope (${char.hopeMax}).\n\n`;
      if (flaws) {
        const remaining = flaws.map((f, i) => ({ f, i, owned: flawsField.includes(f) }));
        const available = remaining.filter(x => !x.owned);
        msg += `Shadow Path: "${path}" (${ownedFlaws.length}/4 Flaws acquired)\n\nPick a Flaw to add (only un-owned shown):\n\n`;
        available.forEach(x => { msg += `  ${x.i + 1}. ${x.f}\n`; });
        msg += `\nEnter the number — or Cancel to skip and just clear Shadow.`;
        const n = parseInt(await promptStyled(msg, ''));
        if (n >= 1 && n <= 4 && flaws[n - 1] && !flawsField.includes(flaws[n - 1])) {
          const flawName = flaws[n - 1];
          if (!char.flaws) char.flaws = flawName;
          else char.flaws = char.flaws + '\n' + flawName;
        }
      } else {
        alert(msg + `(No Shadow Path set — set one in Build tab to enable Flaw picker)`);
      }
      char.shadow = 0;
      saveCharacter();
      render();
    }, 100);
  }
  if (char.shadow < char.hopeMax && char._boutPrompted) {
    char._boutPrompted = false;
    saveCharacter();
  }
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
    desc.innerHTML = char.stance ? STANCE_INFO[char.stance] : 'Select a stance to see its effects.';
  }
  renderCombatTasks();
}

function renderCombatTasks() {
  const card = document.getElementById('combat-tasks-card');
  if (!card) return;
  card.style.display = 'block';
  const labels = { forward: 'Forward', open: 'Open', defensive: 'Defensive', rearward: 'Rearward' };
  card.querySelectorAll('button[data-task]').forEach(btn => {
    const matches = btn.dataset.stanceReq === char.stance;
    btn.style.opacity = matches ? '1' : '0.35';
    btn.style.cursor = matches ? 'pointer' : 'not-allowed';
    btn.style.background = matches ? 'var(--gold-soft)' : 'var(--bg-deep)';
    btn.style.borderColor = matches ? 'var(--gold)' : 'var(--border)';
  });
  const hint = document.getElementById('combat-tasks-hint');
  if (hint) {
    hint.textContent = char.stance
      ? `Current stance: ${labels[char.stance]} — matching task highlighted gold.`
      : 'Pick a stance on the Combat tab to enable.';
  }
}

/* ---------- FELLOWSHIP PHASE WIZARD ---------- */
const FP_UNDERTAKINGS = [
  { id: 'gather-rumours', name: 'Gather Rumours',
    desc: 'Receive a rumour from the Loremaster — story about a person, place, coming event, or specific inquiry related to current adventuring circumstances.',
    freeCalling: 'Warden', yuleOnly: false, narrative: true },
  { id: 'meet-patron', name: 'Meet Patron',
    desc: 'Meet your Patron if available at this location. Ask for help, accept a task, learn the Blessings of a magical item.',
    freeCalling: 'Messenger', yuleOnly: false, narrative: true },
  { id: 'ponder-maps', name: 'Ponder Storied and Figured Maps',
    desc: 'Until next Fellowship Phase, +1 modifier to all Feat die rolls during the Event Resolution step of any Journey.',
    freeCalling: 'Scholar', yuleOnly: false, narrative: false },
  { id: 'strengthen-fellowship', name: 'Strengthen Fellowship',
    desc: 'Raise the Company\'s Fellowship Rating by +1 until next Fellowship Phase.',
    freeCalling: 'Captain', yuleOnly: false, narrative: false },
  { id: 'study-magical-items', name: 'Study Magical Items',
    desc: 'Learn all discoverable qualities/Blessings of every Marvellous Artefact and Wondrous Item the Company currently possesses.',
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
  if (!await confirmStyled(`📜 <strong>End Session — award XP</strong><br><br>Per Core Rules p.55: <strong>+3 Skill Points + 3 Adventure Points</strong> per session attended.<br><br>SP: ${sp} → ${sp + 3}<br>AP: ${ap} → ${ap + 3}`, '📜 End Session')) return;
  char.skillPts = sp + 3;
  char.advPts = ap + 3;
  saveCharacter();
  render();
  if (typeof journalAuto === 'function') journalAuto('advancement', 'milestone', 'End of session — earned +3 Skill Points and +3 Adventure Points.');
  if (typeof logTimeline === 'function') logTimeline('xp', 'End of session: +3 Skill Points, +3 Adventure Points.');
  alert(`✅ Awarded +3 SP + 3 AP.\n\nSpend during Fellowship Phase (cap: 1 rank/skill, 1 rank/prof, Valour XOR Wisdom).`);
}

function openFPWizard() {
  // Fresh wizard state
  fpState = {
    step: 1,
    phaseType: null,  // 'ordinary' | 'yule'
    shadowToRemove: 1,
    recoveryApplied: false,
    selectedUndertakings: [],  // ids
    songInput: { type: 'Lay', title: '', lyrics: '' },
    heirInput: { treasure: 0, ap: 0 }
  };
  // Enter Fellowship Phase spend mode — clear prior phase's spend tracker
  char.fpModeActive = true;
  char.fpSpend = { skills: {}, profs: {}, valour: 0, wisdom: 0 };
  saveCharacter();
  document.getElementById('fp-wizard-overlay').classList.add('show');
  fpRenderStep();
}

function fpClose() {
  document.getElementById('fp-wizard-overlay').classList.remove('show');
  // Exit FP spend mode but keep the spend tracker visible for the player's reference.
  char.fpModeActive = false;
  saveCharacter();
}

function fpSetPhaseType(t) {
  fpState.phaseType = t;
  const status = document.getElementById('fp-type-status');
  status.textContent = t === 'yule' ? '❄️ Yule selected — all heroes age +1, Hope restored, +WITS bonus Skill Points' : 'Ordinary Phase selected';
  document.getElementById('fp-type-ord').style.opacity = t === 'ordinary' ? '1' : '0.5';
  document.getElementById('fp-type-yule').style.opacity = t === 'yule' ? '1' : '0.5';
}

function fpRenderStep() {
  const steps = [1, 2, 3, 4];
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

  if (fpState.step === 2) fpRenderStep2();
  if (fpState.step === 3) fpRenderStep3();
  if (fpState.step === 4) fpRenderStep4();
}

async function fpNextStep() {
  if (fpState.step === 1 && !fpState.phaseType) {
    alert('Pick Ordinary or Yule first.');
    return;
  }
  if (fpState.step === 2 && !fpState.recoveryApplied) {
    if (!await confirmStyled('You haven\'t tapped "Apply Recovery" yet. Skip Spiritual Recovery?')) return;
  }
  fpState.step = Math.min(4, fpState.step + 1);
  fpRenderStep();
}

function fpPrevStep() {
  fpState.step = Math.max(1, fpState.step - 1);
  fpRenderStep();
}

function fpRenderStep2() {
  const heart = parseInt(char.hrtRating) || 1;
  const isYule = fpState.phaseType === 'yule';
  const curHope = parseInt(char.hopeCur) || 0;
  const maxHope = parseInt(char.hopeMax) || 0;
  const hopeAmt = isYule ? (maxHope - curHope) : Math.min(heart, maxHope - curHope);

  const hopeDiv = document.getElementById('fp-hope-recovery');
  hopeDiv.innerHTML = `
    <strong>Hope Recovery:</strong> ${isYule ? 'Full Hope restoration (Yule)' : `+HEART (${heart}) — capped at Max Hope`}<br>
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
      taintEl.innerHTML = `<strong>⚠️ Shadow Taint:</strong> ${taintedItems.length} cursed item${taintedItems.length>1?'s':''} (${taintedItems.map(i=>i.name).join(', ')}) → <strong>+${taintedItems.length} Shadow</strong> this phase (Core Rules p.165). Applied after the Shadow Removal you choose below.`;
    } else {
      taintEl.style.display = 'none';
    }
  }

  document.getElementById('fp-recovery-status').textContent = fpState.recoveryApplied ? '✅ Recovery applied — proceed to next step' : '';
}

function fpApplyRecovery() {
  if (fpState.recoveryApplied) {
    alert('Recovery already applied this session. Cancel and reopen to redo.');
    return;
  }
  const heart = parseInt(char.hrtRating) || 1;
  const wits = parseInt(char.witRating) || 1;
  const isYule = fpState.phaseType === 'yule';
  const curHope = parseInt(char.hopeCur) || 0;
  const maxHope = parseInt(char.hopeMax) || 0;
  const hopeAmt = isYule ? (maxHope - curHope) : Math.min(heart, maxHope - curHope);
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

  let summary = `+${hopeAmt} Hope (${curHope} → ${char.hopeCur})`;
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
  saveCharacter();
  render();
  document.getElementById('fp-recovery-status').innerHTML = `✅ ${summary}`;
}

function fpRenderStep3() {
  const sp = parseInt(char.skillPts) || 0;
  const ap = parseInt(char.advPts) || 0;
  document.getElementById('fp-xp-summary').innerHTML = `
    Skill Points: <strong>${sp}</strong> · Adventure Points: <strong>${ap}</strong><br>
    <small style="color:var(--text-muted)">Tap Close, use Spend XP modals on Character tab, then re-open this wizard to continue.</small>
  `;
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
    row.style.cssText = `padding:8px;border:1px solid ${selected ? 'var(--gold)' : 'var(--border)'};border-radius:6px;background:${selected ? 'var(--gold-soft)' : (disabled ? 'var(--bg-deep)' : 'var(--pure-white)')};${disabled ? 'opacity:0.4;' : 'cursor:pointer;'}`;
    if (!disabled) row.onclick = () => fpToggleUndertaking(u.id);
    row.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px">
        <input type="checkbox" ${selected ? 'checked' : ''} ${disabled ? 'disabled' : ''} style="margin:0">
        <strong style="font-size:13px">${u.name}</strong>
        ${isFree ? '<span style="background:var(--gold);color:white;padding:1px 6px;border-radius:8px;font-size:10px">FREE — ' + calling + '</span>' : ''}
        ${u.yuleOnly ? '<span style="background:var(--brown-soft);color:white;padding:1px 6px;border-radius:8px;font-size:10px">YULE</span>' : ''}
      </div>
      <p class="hint" style="text-align:left;margin:4px 0 0 0">${u.desc}</p>
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
  fpRenderStep4();
}

function fpRenderFollowup() {
  const wrap = document.getElementById('fp-undertaking-followup');
  wrap.innerHTML = '';
  const has = id => fpState.selectedUndertakings.includes(id);

  if (has('write-a-song')) {
    wrap.innerHTML += `
      <div style="padding:10px;background:var(--bg-deep);border-radius:6px;margin-top:6px">
        <strong style="font-size:12px;color:var(--red-dark)">Write a Song — details</strong>
        <div style="display:flex;gap:6px;margin-top:6px">
          <select id="fp-song-type" style="flex:0 0 110px;padding:4px;font-size:12px">
            <option>Lay</option><option>Song of Victory</option><option>Walking-song</option>
          </select>
          <input id="fp-song-title" placeholder="Title" style="flex:1;padding:4px;font-size:12px">
        </div>
        <input id="fp-song-lyrics" placeholder="Lyrics or theme (optional)" style="width:100%;margin-top:6px;padding:4px;font-size:12px">
      </div>`;
  }
  if (has('raise-heir')) {
    wrap.innerHTML += `
      <div style="padding:10px;background:var(--bg-deep);border-radius:6px;margin-top:6px">
        <strong style="font-size:12px;color:var(--red-dark)">Raise an Heir — spend</strong>
        <div style="display:flex;gap:6px;margin-top:6px;align-items:center">
          <input id="fp-heir-name" placeholder="Heir name" value="${(char.heir && char.heir.name) || ''}" style="flex:1;padding:4px;font-size:12px">
          <label style="font-size:11px">AP & Treasure to spend:</label>
          <input id="fp-heir-ap" type="number" min="0" max="5" value="${fpState.heirInput.ap || 0}" style="width:50px;padding:4px;font-size:12px">
        </div>
        <p class="hint" style="text-align:left;margin:6px 0 0 0">Equal Treasure + AP. Each AP grants +1 PE to heir (current: ${(char.heir && char.heir.pe) || 0}).</p>
      </div>`;
  }
  if (has('recount-story')) {
    wrap.innerHTML += `
      <div style="padding:10px;background:var(--bg-deep);border-radius:6px;margin-top:6px">
        <strong style="font-size:12px;color:var(--red-dark)">Recount a Story</strong>
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
  if (fpState.selectedUndertakings.length === 0) {
    if (!await confirmStyled('No undertakings selected. Complete phase anyway?')) return;
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
          let prompt_msg = `🏛️ VISITING THE TREASURY\n\nTrade in 1 Reward from a piece of war gear to activate one dormant quality on a Famous Weapon/Armour.\n\nFamous items with dormant qualities:\n\n`;
          famousWithDormant.forEach((mi, idx) => {
            const dormant = mi.qualities.filter(q => !q.active).length;
            const itemIdx = char.magicalItems.indexOf(mi);
            prompt_msg += `  ${idx + 1}. ${mi.name} (${mi.type}) — ${dormant} dormant\n`;
          });
          prompt_msg += `\nEnter the number to unlock (1-${famousWithDormant.length}), or Cancel to skip.`;
          const pick = parseInt(await promptStyled(prompt_msg, '1'));
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
  fpClose();
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
  const task = (document.getElementById('se-task').value || '').trim();
  const resBtn = document.querySelector('#se-resistance-pick .seg-btn.active');
  const timeBtn = document.querySelector('#se-time-pick .seg-btn.active');
  const riskBtn = document.querySelector('#se-risk-pick .seg-btn.active');
  if (!resBtn || !timeBtn || !riskBtn) { alert('Pick Resistance, Time Limit, and Risk Level first.'); return; }
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
  if (!await confirmStyled('Cancel this endeavour? All progress will be discarded.', 'Cancel Endeavour')) return;
  char.skillEndeavour.active = false;
  saveCharacter();
  renderSkillEndeavour();
}

function renderSkillEndeavour() {
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

  if (e.active) {
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
        <strong>${s.name}</strong><br><span style="font-size:9px;color:var(--text-muted)">${sk.rating}d · ${s.attr.toUpperCase()}</span>
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
            <button class="add-row-btn" onclick="finalizeSkillEndeavour('woe')" style="width:100%;background:var(--btn-warn-bg)">Success with Woe (achieve at a price — LM approval)</button>
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
}

function renderSkillEndeavourLog() {
  const log = document.getElementById('se-roll-log');
  if (!log || !char.skillEndeavour) return;
  const rolls = char.skillEndeavour.rolls || [];
  if (rolls.length === 0) {
    log.innerHTML = '<div style="text-align:center;color:var(--text-faint);padding:10px;font-size:12px">No attempts yet.</div>';
    return;
  }
  log.innerHTML = rolls.slice().reverse().map((r, i) => {
    const num = rolls.length - i;
    const tag = r.contributed > 0
      ? `<span style="background:var(--success-text);color:white;padding:1px 6px;border-radius:8px;font-size:10px">+${r.contributed}</span>`
      : (r.woeApplied ? `<span style="background:var(--btn-warn-bg);color:white;padding:1px 6px;border-radius:8px;font-size:10px">WOE</span>` : '');
    const tagColor = r.contributed > 0 ? 'var(--success-text)' : 'var(--error-text)';
    return `<div style="padding:6px 8px;border-bottom:1px solid var(--border)">
      <strong>#${num} ${r.skill}</strong> ${tag} — ${r.detail} <span style="color:${tagColor};font-weight:600">${r.success ? 'SUCCESS' : 'FAIL'}</span>${r.bonus ? ` <small style="color:var(--gold)">(roleplay +${r.bonus}d)</small>` : ''}
    </div>`;
  }).join('');
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
  const successDice = Math.max(0, s.rating + roleplayBonus);
  let fav = s.favoured ? 'fav' : 'normal';
  const r = _doInlineRoll(successDice, fav, actualTn);
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
  saveCharacter();
  renderSkillEndeavour();
  // Keep cards visible until reset
  document.getElementById('se-active-card').style.display = 'block';
  document.getElementById('se-log-card').style.display = 'block';
  document.getElementById('se-setup-card').style.display = 'none';
  document.getElementById('se-cancel-btn').style.display = 'none';
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
  const topic = (document.getElementById('c-topic').value || '').trim();
  const resBtn = document.querySelector('#c-resistance-pick .seg-btn.active');
  const attBtn = document.querySelector('#c-attitude-pick .seg-btn.active');
  if (!resBtn || !attBtn) { alert('Pick Resistance and Audience Attitude first.'); return; }
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
  if (!await confirmStyled('Cancel this council? All progress will be discarded.', 'Cancel Council')) return;
  char.council.active = false;
  saveCharacter();
  renderCouncil();
}

function renderCouncil() {
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
          <button class="add-row-btn" onclick="finalizeCouncil('woe')" style="width:100%;background:var(--btn-warn-bg)">Success with Woe (LM approval — achieve goal at a price)</button>
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
}

async function clearCouncilHistory() {
  if (!await confirmStyled('Clear all saved council summaries? This cannot be undone.', 'Clear Council History')) return;
  char.councilHistory = [];
  saveCharacter();
  renderCouncil();
}

function renderCouncilLog() {
  const log = document.getElementById('c-roll-log');
  if (!log || !char.council) return;
  const rolls = char.council.rolls || [];
  if (rolls.length === 0) {
    log.innerHTML = '<div style="text-align:center;color:var(--text-faint);padding:10px;font-size:12px">No rolls yet — make the Introduction roll to begin.</div>';
    return;
  }
  log.innerHTML = rolls.slice().reverse().map((r, i) => {
    const num = rolls.length - i;
    const tagColor = r.contributed > 0 ? 'var(--success-text)' : (r.success ? '#666' : 'var(--error-text)');
    const tag = r.intro
      ? `<span style="background:var(--gold);color:white;padding:1px 6px;border-radius:8px;font-size:10px">INTRO</span>`
      : (r.contributed > 0
          ? `<span style="background:var(--success-text);color:white;padding:1px 6px;border-radius:8px;font-size:10px">+${r.contributed}</span>`
          : '');
    return `<div style="padding:6px 8px;border-bottom:1px solid var(--border)">
      <strong>#${num} ${r.skill}</strong> ${tag} — ${r.detail} <span style="color:${tagColor};font-weight:600">${r.success ? 'SUCCESS' : 'FAIL'}</span>${r.bonus ? ` <small style="color:var(--gold)">(roleplay +${r.bonus}d)</small>` : ''}
    </div>`;
  }).join('');
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
  const successDice = Math.max(0, s.rating + attMod);
  let fav = s.favoured ? 'fav' : 'normal';
  const r = _doInlineRoll(successDice, fav, actualTn);
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
  const successDice = Math.max(0, s.rating + attMod + roleplayBonus + supportBonus);
  let fav = s.favoured ? 'fav' : 'normal';
  const r = _doInlineRoll(successDice, fav, actualTn);
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
}

function closeCouncilAndReset() {
  char.council = JSON.parse(JSON.stringify(DEFAULT_CHARACTER.council));
  saveCharacter();
  renderCouncil();
  document.getElementById('c-cancel-btn').style.display = 'block';
}

/* ---------- JOURNEY ---------- */
function _doInlineRoll(successDice, fav, tn) {
  // Inline dice roller used by Journey for Marching Tests / Event Feat dice / Arrival roll.
  // Returns: { featValue, featSpecial, featLabel, total, icons, outcome }
  // Despair (Core Rules p.137): at Shadow + Scars = Max Hope, every Feat die is Ill-Favoured.
  // Layer it against the caller's fav per RAW p.20 (Fav + Ill cancel to Normal).
  if (shadowDespairActive()) fav = (fav === 'fav') ? 'normal' : 'ill';
  let featRolls;
  if (fav === 'normal') featRolls = [rollFeatOnce()];
  else featRolls = [rollFeatOnce(), rollFeatOnce()];
  const score = r => r.special === 'rune' ? 100 : (r.special === 'eye' ? -100 : r.value);
  featRolls.sort((a, b) => score(b) - score(a));
  const chosen = (fav === 'ill') ? featRolls[featRolls.length - 1] : featRolls[0];
  const successRolls = [];
  for (let i = 0; i < successDice; i++) {
    const v = Math.floor(Math.random() * 6) + 1;
    successRolls.push({ value: v, icon: v === 6 });
  }
  const icons = successRolls.filter(s => s.icon).length;
  const sumSuccess = successRolls.reduce((sum, s) => sum + s.value, 0);
  const total = chosen.special === 'rune' ? null : chosen.value + sumSuccess;
  let outcome;
  if (tn === null) outcome = 'N/A';
  else if (chosen.special === 'rune') outcome = 'SUCCESS (Rune)';
  else if (chosen.special === 'eye') outcome = 'FAIL (Eye)';
  else if (total >= tn) outcome = 'SUCCESS';
  else outcome = 'FAIL';
  return { featValue: chosen.value, featSpecial: chosen.special, featLabel: chosen.label, total, icons, outcome };
}

function startJourney() {
  const total = parseInt(document.getElementById('j-totalHexes').value) || 0;
  if (total <= 0) { alert('Total Hexes must be greater than 0.'); return; }
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
    perilEventsRemaining: Math.max(0, parseInt(document.getElementById('j-perilRating').value) || 0)
  };
  saveCharacter();
  renderJourney();
}

async function endJourney() {
  if (!await confirmStyled('Cancel this journey? All progress will be discarded.<br><br><small>(Does not retroactively undo Fatigue / Shadow already applied.)</small>', 'Cancel Journey')) return;
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
    if (cancelBtn) cancelBtn.style.display = 'inline-block';

    const roleLabels = [];
    if (j.roles && j.roles.guide) roleLabels.push('Guide');
    if (j.roles && j.roles.hunter) roleLabels.push('Hunter');
    if (j.roles && j.roles.lookout) roleLabels.push('Look-out');
    if (j.roles && j.roles.scout) roleLabels.push('Scout');
    const rolesStr = roleLabels.length ? roleLabels.join(', ') : '<em>none</em>';
    const fmTag = j.forcedMarch ? ' · <strong>Forced March</strong>' : '';
    const mountTag = j.mounted ? ` · Mounted (Vigour ${j.mountVigour})` : '';
    document.getElementById('j-summary').innerHTML =
      `<strong>${j.origin || '?'}</strong> → <strong>${j.destination || '?'}</strong><br>` +
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
  } else {
    setup.style.display = 'block';
    progress.style.display = 'none';
    log.style.display = 'none';
    if (cancelBtn) cancelBtn.style.display = 'none';
  }
}

function renderJourneyLog() {
  const log = document.getElementById('j-event-log');
  if (!log || !char.journey || !char.journey.events) return;
  if (char.journey.events.length === 0) {
    log.innerHTML = '<div style="text-align:center;color:var(--text-faint);padding:10px;font-size:12px">No events yet — make a Marching Test to begin.</div>';
    return;
  }
  log.innerHTML = char.journey.events.slice().reverse().map(e =>
    `<div style="padding:6px 8px;border-bottom:1px solid var(--border);"><strong>Day ${e.day}, hex ${e.hex}:</strong> ${e.text}</div>`
  ).join('');
}

async function rollMarchingTest() {
  const j = char.journey;
  if (!j.active) { alert('No active journey.'); return; }
  if (j.currentHex >= j.totalHexes) { alert('Already at destination — tap Arrive.'); return; }
  if (j.nextEventHex !== null && j.nextEventHex !== undefined && j.currentHex >= j.nextEventHex) {
    alert('An event is queued. Resolve it before making the next Marching Test.');
    return;
  }
  // Solo (Strider or Moria): no roles assigned — the lone hero is the de-facto Guide.
  // Treat as Guide automatically and auto-roll TRAVEL.
  if (!isSolo() && (!j.roles || !j.roles.guide)) {
    const inp = await promptStyled('You are not the Guide. Record the Marching Test outcome from the Guide:\n\nFormat: "S 2" for success with 2 icons, "F 0" for fail.', 'S 0');
    if (!inp) return;
    const parts = inp.trim().toUpperCase().split(/\s+/);
    const success = parts[0] === 'S';
    const icons = parseInt(parts[1]) || 0;
    applyMarchingTestResult(success, icons, 'manual entry');
    return;
  }
  const s = char.skills['Travel'] || { rating: 0, favoured: false };
  const tn = parseInt(char.hrtTN) || 14;
  let fav = s.favoured ? 'fav' : 'normal';
  if (char.miserable) {
    // Miserable doesn't ill-fav, but does cause Eye = auto-fail (handled in _doInlineRoll? no — let me handle it here)
  }
  const r = _doInlineRoll(s.rating, fav, tn);
  // Miserable: an Eye result becomes auto-fail (matches main dice roller)
  let success = r.outcome.startsWith('SUCCESS');
  if (char.miserable && r.featSpecial === 'eye') success = false;
  applyMarchingTestResult(success, r.icons, `Feat ${r.featLabel}, total ${r.total ?? '★'}, ${r.icons} ✦, vs Heart TN ${tn}${char.miserable ? ' (Miserable)' : ''}`);
}

function applyMarchingTestResult(success, icons, detail) {
  const j = char.journey;
  let hexesToNext;
  if (success) {
    hexesToNext = 3 + icons;
  } else {
    hexesToNext = (j.season === 'Spring' || j.season === 'Summer') ? 2 : 1;
  }
  // Cap by remaining hexes
  hexesToNext = Math.min(hexesToNext, j.totalHexes - j.currentHex);
  // Days: 1 per hex baseline + hard terrain bonus distributed; forced march halves time
  const hardRatio = j.hardTerrainHexes > 0 && j.totalHexes > 0 ? j.hardTerrainHexes / j.totalHexes : 0;
  const hardHexesNow = Math.round(hexesToNext * hardRatio);
  let daysSpent = hexesToNext + hardHexesNow;
  if (j.forcedMarch) daysSpent = Math.ceil(daysSpent / 2);
  j.daysElapsed += daysSpent;
  if (j.forcedMarch) j.travelFatigue += daysSpent;  // +1 Fatigue per forced-march day
  j.currentHex += hexesToNext;
  j.nextEventHex = j.currentHex;  // event happens at landing hex
  j.events.push({
    day: j.daysElapsed,
    hex: j.currentHex,
    text: `🚶 Marching Test — <strong>${success ? 'Success' : 'Failure'}</strong> (${detail}). Advanced ${hexesToNext} hex${hexesToNext!==1?'es':''} in ${daysSpent} day${daysSpent!==1?'s':''}${j.forcedMarch?' (forced march: +'+daysSpent+' Travel Fatigue)':''}. Event resolves at hex ${j.currentHex}.`
  });
  saveCharacter();
  renderJourney();
  if (j.currentHex >= j.totalHexes) {
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
  return { rating: parseInt(s.rating) || 0, favoured: !!s.favoured, tn: _skillTN(name) };
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
  if (!(char.band.allies || []).length) { alert('Generate your Band on the Band tab before a battle.'); return; }
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
function resolveLeaderFocus() {
  const b = char.battle;
  if (!b.active) return;
  const focus = b.leaderFocus;
  if (focus === 'duel') {
    if (b.archfoe === 'none') { alert('No Archfoe present to duel. Choose another Focus, or add an Archfoe.'); return; }
    alert('⚔️ DUEL: fight the Archfoe with the normal combat rules (Combat + Dice tabs) for 3 close-quarters rounds, then return here and make the Clash roll. Spend Clash successes via "Harry the Archfoe" to gain bonus dice in the duel.');
    battleLog('Leader Focus: <strong>Duel</strong> — playing out 3 close-quarters rounds vs the Archfoe (use Combat/Dice tabs).');
    saveCharacter(); renderBattle(); return;
  }
  let r, msg;
  if (focus === 'command') {
    const hs = _heroSkill('Battle');
    r = bandRoll(hs.rating, hs.favoured ? 'fav' : 'normal', hs.tn, { weary: !!char.weary });
    if (r.outcome.startsWith('SUCCESS')) { b.focusBonus = 1 + r.icons; msg = `Command (BATTLE) ${r.outcome}: +${b.focusBonus}d on the Clash roll`; }
    else { b.complications.push({ name: 'Chaos in the Ranks', persistent: false }); msg = `Command (BATTLE) ${r.outcome}: temporary Complication "Chaos in the Ranks"`; }
  } else if (focus === 'inspire') {
    const hs = _heroSkill('Enhearten');
    r = bandRoll(hs.rating, hs.favoured ? 'fav' : 'normal', hs.tn, { weary: !!char.weary });
    if (r.outcome.startsWith('SUCCESS')) { b.inspired = true; msg = `Inspire (ENHEARTEN) ${r.outcome}: the Band is Inspired until your next failed Clash` + (r.icons ? ' (and ignores Weary/Miserable)' : ''); }
    else { adj('shadow', 1); msg = `Inspire (ENHEARTEN) ${r.outcome}: +1 Shadow`; }
  } else if (focus === 'fight') {
    const p = _bestProf();
    const tn = (parseInt(char.strTN) || 14) + (b.foeMight || 0);
    r = bandRoll(p.rating, 'normal', tn, { weary: !!char.weary });
    if (r.outcome.startsWith('SUCCESS')) {
      b.foeResistance = Math.max(0, b.foeResistance - 1);
      if (r.icons > 0) b.focusBonus = (b.focusBonus || 0) + 1;
      msg = `Fight (${p.name} vs TN ${tn}) ${r.outcome}: −1 foe Resistance` + (r.icons ? ', +1d Clash (opening)' : '');
    } else {
      const loss = r.dice.reduce((s, d) => s + d.value, 0) || (Math.floor(Math.random() * 6) + 1 + Math.floor(Math.random() * 6) + 1);
      char.endCur = Math.max(0, (parseInt(char.endCur) || 0) - loss);
      msg = `Fight (${p.name}) ${r.outcome}: you lose ${loss} Endurance`;
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
    battleLog(`Clash (${fleeing ? 'Manoeuvre' : 'War'} ${dice}d) — <span class="result-tag tag-success">${r.outcome}</span>, ${successes} success(es)`);
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
    battleLog(`Clash (${fleeing ? 'Manoeuvre' : 'War'} ${dice}d) — <span class="result-tag tag-fail">${r.outcome}</span>; Endurance Test ${er.outcome.startsWith('SUCCESS') ? 'passed' : 'failed'}`);
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
  el.innerHTML = `<div style="background:var(--gold-soft);border:1px solid var(--gold);border-radius:6px;padding:8px">
    <strong style="font-size:12px">Spend successes: ${n}</strong>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:6px">
      <button class="add-row-btn" style="font-size:11px" onclick="clashSpend('foe')">⚔ −1 Foe Resistance</button>
      ${hasObj ? `<button class="add-row-btn" style="font-size:11px" onclick="clashSpend('obj')">🎯 −1 Objective</button>` : ''}
      <button class="add-row-btn" style="font-size:11px;background:var(--btn-secondary-bg)" onclick="clashSpend('adv')">▲ Gain Advantage</button>
      ${n >= 2 ? `<button class="add-row-btn" style="font-size:11px;background:var(--btn-secondary-bg)" onclick="clashSpend('advP')">▲⚓ Persistent (2)</button>` : ''}
      ${hasPersistComp ? `<button class="add-row-btn" style="font-size:11px;background:var(--btn-secondary-bg)" onclick="clashSpend('comp')">✓ Remove Complication</button>` : ''}
      ${b.archfoe !== 'none' ? `<button class="add-row-btn" style="font-size:11px;background:var(--btn-secondary-bg)" onclick="clashSpend('harry')">☠ Harry Archfoe (+1d duel)</button>` : ''}
    </div>
  </div>`;
}
function clashSpend(type) {
  const b = char.battle;
  if ((b._pendingSpend || 0) <= 0) return;
  let cost = 1, log = '';
  if (type === 'foe') { b.foeResistance = Math.max(0, b.foeResistance - 1); log = '−1 Foe Resistance'; }
  else if (type === 'obj') { b.objectiveRes = Math.max(0, b.objectiveRes - 1); log = '−1 Objective Resistance'; }
  else if (type === 'adv') { b.advantages.push({ name: 'Advantage', persistent: false }); log = 'gained temporary Advantage'; }
  else if (type === 'advP') { if ((b._pendingSpend || 0) < 2) return; cost = 2; b.advantages.push({ name: 'Advantage', persistent: true }); log = 'gained persistent Advantage'; }
  else if (type === 'comp') { const i = b.complications.findIndex(c => c.persistent); if (i >= 0) b.complications.splice(i, 1); log = 'removed a persistent Complication'; }
  else if (type === 'harry') { log = 'Harry the Archfoe — +1d to spend in the duel'; }
  b._pendingSpend -= cost;
  battleLog(`Spend: ${log}`);
  saveCharacter();
  renderBattle();
  document.getElementById('b-clash-result').style.display = 'block';
  renderClashSpend();
  checkBattleEnd();
}

/* ---- Advantages / Complications / End ---- */
async function addAdvantagePrompt() {
  const name = await promptStyled('Name this Advantage (e.g. High Ground):', '');
  if (!name) return;
  const persist = await confirmStyled('Make this Advantage <strong>persistent</strong> (lasts until a failed Clash)?<br><br>Cancel = temporary (next Clash only).');
  char.battle.advantages.push({ name, persistent: !!persist });
  battleLog(`+ Advantage "${name}"${persist ? ' (persistent)' : ''}`);
  saveCharacter(); renderBattle();
}
async function addComplicationPrompt() {
  const name = await promptStyled('Name this Complication (e.g. Broken Ranks):', '');
  if (!name) return;
  const persist = await confirmStyled('Make this Complication <strong>persistent</strong> (lasts until removed with a success)?<br><br>Cancel = temporary (next Clash only).');
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
  if (!await confirmStyled('End this battle? (Use for a successful flight, a surrender, or to abandon the tracker.)')) return;
  char.battle.active = false;
  battleLog('Battle ended.');
  saveCharacter(); render();
}

function renderBattle() {
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
    const oc = document.getElementById('b-obj-counter');
    if (b.objectiveResMax > 0) { oc.style.display = ''; setText('b-objres-v', b.objectiveRes); document.getElementById('b-obj-name').textContent = b.objective || 'objective'; }
    else oc.style.display = 'none';
    document.querySelectorAll('#b-focus-pick .seg-btn').forEach(x => { x.classList.toggle('active', x.dataset.focus === b.leaderFocus); x.onclick = () => { b.leaderFocus = x.dataset.focus; saveCharacter(); renderBattle(); }; });
    document.querySelectorAll('#b-stance-pick .seg-btn').forEach(x => { x.classList.toggle('active', x.dataset.stance === b.bandStance); x.onclick = () => { b.bandStance = x.dataset.stance; saveCharacter(); renderBattle(); }; });
    const bg = document.getElementById('b-gift-pick'); if (bg) bg.innerHTML = _giftOptionsHTML('clash');
    renderBattleChips();
  }
  renderBattleLog();
}
function renderBattleChips() {
  const b = char.battle, el = document.getElementById('b-chips');
  if (!el) return;
  const adv = (b.advantages || []).map((a, i) => `<span style="display:inline-block;background:var(--success-bg);color:var(--success-text);border-radius:8px;padding:2px 8px;font-size:11px;margin:2px">▲ ${escapeHtml(a.name)}${a.persistent ? ' ⚓' : ''} <span onclick="removeAdv(${i})" style="cursor:pointer;font-weight:700">×</span></span>`).join('');
  const comp = (b.complications || []).map((c, i) => `<span style="display:inline-block;background:var(--error-bg);color:var(--error-text);border-radius:8px;padding:2px 8px;font-size:11px;margin:2px">▼ ${escapeHtml(c.name)}${c.persistent ? ' ⚓' : ''} <span onclick="removeComp(${i})" style="cursor:pointer;font-weight:700">×</span></span>`).join('');
  const af = (b.archfoe && b.archfoe !== 'none') ? `<span style="display:inline-block;background:var(--btn-alert-bg);color:white;border-radius:8px;padding:2px 8px;font-size:11px;margin:2px">☠ ${b.archfoe} Archfoe (−1d)</span>` : '';
  const insp = b.inspired ? `<span style="display:inline-block;background:var(--green-soft);color:white;border-radius:8px;padding:2px 8px;font-size:11px;margin:2px">✨ Inspired</span>` : '';
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
  else if (duration === 'brief') { const h = parseInt(char.hrtRating) || 0; char.hopeCur = Math.min(parseInt(char.hopeMax) || 0, (parseInt(char.hopeCur) || 0) + h); lines.push(`+${h} Hope (Heart)`); }
  // Endurance — always fully restored
  char.endCur = parseInt(char.endMax) || 0; lines.push('Endurance fully restored');
  // Hero Wound
  if (char.wounded) {
    const dying = (parseInt(char.endCur) || 0) === 0;
    if (duration === 'extended' || (duration === 'brief' && !dying)) { char.wounded = false; char.injury = ''; char.injuryDays = 0; lines.push('Wound healed'); }
  }
  // Shadow removal (Brief/Extended) — player decides by impact (1-3)
  if (duration !== 'hurried' && (parseInt(char.shadow) || 0) > 0) {
    const n = parseInt(await promptStyled('Spiritual Recovery — remove how many Shadow points?\n\n1 = you interfered with the Shadow · 2 = you damaged the Enemy · 3 = you drew the Dark Lord\'s attention', '1'));
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
  if (!await confirmStyled(`Recruit Allies undertaking:<br><br>${cur < 4 ? `Your Band is below 4 — gain ${n} to reach 4.` : `Gain ${n} ally(ies) — one per Valour rank (Valour ${char.valour || 1}).`}<br><br>Proceed?`)) return;
  for (let i = 0; i < n; i++) char.band.allies.push(_rollAlly());
  saveCharacter(); render();
  alert(`Recruited ${n} new all${n === 1 ? 'y' : 'ies'}. Your Band now numbers ${char.band.allies.length}.`);
}

async function reclaimSafeHavenUndertaking() {
  if (!isMoria()) return;
  if (!await confirmStyled('Reclaim a Safe Haven (Extended phase, once/year, requires a secured strategic location):<br><br>The points between the existing haven and the new one become a <strong>Wild Land</strong>. You gain <strong>+3 SP and +3 AP</strong> (a milestone).<br><br>Establish the new Safe Haven?')) return;
  char.skillPts = (parseInt(char.skillPts) || 0) + 3;
  char.advPts = (parseInt(char.advPts) || 0) + 3;
  char.huntRegion = 'wild';  // the secured stretch is now a Wild Land (Hunt 16)
  saveCharacter(); render();
  alert('🏛️ New Safe Haven reclaimed! +3 SP, +3 AP. The secured region is now a Wild Land (Hunt Threshold 16). Update your Safe Haven name on the Character tab.');
}

// Moria abstract distance: (2 Success dice) × 4 miles, then ÷2 since each hex = 2 miles.
function rollMoriaDistance() {
  const d1 = Math.floor(Math.random() * 6) + 1;
  const d2 = Math.floor(Math.random() * 6) + 1;
  const miles = (d1 + d2) * 4;
  const hexes = Math.round(miles / 2);
  const el = document.getElementById('j-totalHexes');
  if (el) el.value = hexes;
  alert(`🎲 Moria distance: (${d1} + ${d2}) × 4 = ${miles} miles → ${hexes} hexes (1 hex = 2 miles). Set as Total Hexes.`);
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
  else if (feat.special === 'eye' && miserable) outcome = 'FAIL (Eye, Miserable)';  // Eye only auto-fails when Miserable (RAW)
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
  fd.textContent = r.feat.label; dd.appendChild(fd);
  r.dice.forEach(d => {
    const e = document.createElement('div');
    e.className = 'success-die' + (d.icon ? ' icon' : '') + (d.wearied ? ' dim' : '');
    e.textContent = d.value; dd.appendChild(e);
  });
  document.getElementById(totalId).textContent = r.feat.special === 'rune' ? '★' : (r.feat.special === 'eye' ? '✗' : r.total);
  let s = `<strong>${label}</strong> vs Readiness TN ${tn} — `;
  s += r.outcome.startsWith('SUCCESS') ? `<span class="result-tag tag-success">${r.outcome}</span>` : `<span class="result-tag tag-fail">${r.outcome}</span>`;
  if (r.icons > 0) s += ` <small>${r.icons} ✦</small>`;
  if (r.weary) s += `<br><small style="color:var(--warn-orange)">Band Weary: 1-3 counted as 0</small>`;
  document.getElementById(sumId).innerHTML = s;
}

function rollDisposition(key) {
  const disp = DISPOSITIONS.find(d => d.key === key);
  const rating = parseInt(char.band.dispositions[key]) || 0;
  const bonus = _bandBonusDice('band', key);
  const r = bandRoll(rating + bonus, 'normal', bandTN(), { kinglyWard: _giftKinglyWard('band') });
  _renderBandRoll(r, bandTN(), disp.name + ' (Band' + (bonus ? ' +' + bonus + 'd' : '') + ')', 'band-roll-dice', 'band-roll-total', 'band-roll-summary', 'band-roll-result');
  document.getElementById('band-roll-summary').innerHTML += _resolveBandExtras(r, 'band', key);
  renderBand();
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
        html += `<br><small style="color:var(--gold)">👑 ${escapeHtml(a.name)}'s Kingly Gift aided the roll (+1d · re-rolls one 👁)</small>`;
      } else if (r.feat.special === 'eye') {
        a.giftWasted = true;
        html += `<br><span class="result-tag" style="background:var(--btn-warn-bg);color:white">⚠ ${escapeHtml(a.name)}'s Gift is wasted (👁) — recovers next Fellowship Phase</span>`;
      } else {
        html += `<br><small style="color:var(--gold)">${escapeHtml(a.name)}'s Gift aided the roll (+1d)</small>`;
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
  const buttons = living.map((a, i) => ({ label: `${escapeHtml(a.name)} — ${escapeHtml(a.gift)}`, value: i, style: 'background:var(--card-bg);color:var(--ink);border:1px solid var(--border);border-radius:5px;padding:8px 10px;font-size:12px;cursor:pointer;text-align:left' }));
  buttons.push({ label: 'Cancel', value: -1, style: 'background:var(--btn-secondary-bg);color:white;border:none;border-radius:5px;padding:10px;font-size:14px;cursor:pointer' });
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

function enduranceTest() {
  if (!(char.band.allies || []).length) { alert('No allies in the Band yet — generate some first.'); return; }
  const threat = _selectedThreat();
  const tn = bandTN() + (DAMAGE_THREAT[threat] || 0);
  const r = bandRoll(parseInt(char.band.dispositions.rally) || 0, 'normal', tn);
  let extra = '';
  if (!r.outcome.startsWith('SUCCESS')) extra = _applyInjuryFromFail(r);
  else extra = '<br><small style="color:var(--success-text)">The Band emerges unscathed.</small>';
  _renderBandRoll(r, tn, 'Endurance Test (Rally, ' + threat + ')', 'band-test-dice', 'band-test-total', 'band-test-summary', 'band-test-result');
  document.getElementById('band-test-summary').innerHTML += extra;
  renderBand();
}

function fatigueTest() {
  if (!(char.band.allies || []).length) { alert('No allies in the Band yet — generate some first.'); return; }
  const pts = parseInt(document.getElementById('band-fatigue-pts').value) || 0;
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
  char.band.allies.push(_rollAlly());
  saveCharacter(); renderBand();
}
function addStartingBand() {
  while (char.band.allies.length < 6) char.band.allies.push(_rollAlly());
  saveCharacter(); renderBand();
}
async function removeAlly(id) {
  if (!await confirmStyled('Remove this ally from the Band?')) return;
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
  const buttons = famous.map((mi, i) => ({ label: `${mi.type === 'Famous Armour' ? '🛡️' : '⚔️'} ${mi.name}`, value: i, style: 'background:var(--card-bg);color:var(--ink);border:1px solid var(--border);border-radius:5px;padding:8px 10px;font-size:12px;cursor:pointer;text-align:left' }));
  buttons.push({ label: 'Cancel', value: -1, style: 'background:var(--btn-secondary-bg);color:white;border:none;border-radius:5px;padding:10px;font-size:14px;cursor:pointer' });
  const pick = await showModal({ title: '👑 Kingly Gift', message: `Grant a Famous item to <strong>${escapeHtml(a.name)}</strong>. It becomes a second Gift (a (1d) bonus when it aids the Band) and wards against the Shadow — re-roll one 👁 on the Feat die when the gift aids a roll.<br><br>Note: a Famous item carried by an ally also raises your starting Eye Awareness on a mission (+1 each).`, buttons });
  if (pick === -1 || pick == null) return;
  a.kinglyGift = { name: famous[pick].name };
  saveCharacter(); renderBand();
  await alertStyled(`👑 ${escapeHtml(famous[pick].name)} granted to <strong>${escapeHtml(a.name)}</strong> as a Kingly Gift.`, 'Kingly Gift');
}
async function removeKinglyGift(id) {
  const a = char.band.allies.find(x => x.id === id); if (!a) return;
  if (!await confirmStyled('Reclaim this Kingly Gift from the ally?')) return;
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
  const hunt = HUNT_THRESHOLDS.dark + huntMod;  // Moria = Dark Land (14)
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
    + `Eye Awareness: <strong>${p.ea}</strong> · Hunt Threshold: <strong>${p.hunt}</strong> <small>(14 ${p.huntMod >= 0 ? '+' : ''}${p.huntMod})</small>`;
}

function applyMissionSetup() {
  const p = _compPreview();
  char.band.dispositions = { ...p.base };
  char.band.burden = p.burden;
  char.band.readiness = p.readiness;
  char.eyeAwareness = p.ea;
  char.huntRegion = 'dark';
  char.huntMod = p.huntMod;
  char.mission.active = true;
  saveCharacter(); render();
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
}

function renderBand() {
  const panel = document.getElementById('panel-band');
  if (!panel) return;
  renderMission();
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
      return `<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border)">
        <div style="flex:1">
          <strong>${d.name}</strong>${isFocus ? ' <span style="color:var(--gold)">★</span>' : ''} <span style="color:var(--text-muted);font-size:11px">${d.sub}</span>
        </div>
        <button class="counter-buttons-btn" onclick="adjDisposition('${d.key}',-1)" style="width:26px;height:26px;border:1px solid var(--red);background:var(--pure-white);color:var(--red);border-radius:4px;font-weight:700;cursor:pointer">−</button>
        <span style="min-width:18px;text-align:center;font-weight:700;font-size:16px">${rating}</span>
        <button class="counter-buttons-btn" onclick="adjDisposition('${d.key}',1)" style="width:26px;height:26px;border:1px solid var(--red);background:var(--pure-white);color:var(--red);border-radius:4px;font-weight:700;cursor:pointer">+</button>
        <button class="add-row-btn" onclick="rollDisposition('${d.key}')" style="padding:6px 10px;font-size:12px">🎲</button>
      </div>`;
    }).join('');
  }
  // Allies
  const ac = document.getElementById('band-allies');
  const cnt = document.getElementById('band-ally-count');
  if (cnt) cnt.textContent = `(${char.band.allies.length})`;
  if (ac) {
    if (!char.band.allies.length) {
      ac.innerHTML = `<p class="hint" style="text-align:center">No allies yet. Tap “Roll 6 Starting Allies” to begin your Band.</p>`;
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
          ? `<div style="font-size:12px;margin-top:2px;background:var(--gold-soft);border-radius:4px;padding:3px 6px"><strong style="color:var(--gold)">👑 Kingly Gift:</strong> ${escapeHtml(kg.name)} <span style="color:var(--text-muted)">— 2nd Gift (+1d) &amp; ward: re-roll one 👁 when it aids a roll</span> <span onclick="removeKinglyGift('${a.id}')" style="cursor:pointer;color:var(--red);font-weight:700;float:right">×</span></div>`
          : '';
        const kgBtn = (a.hardened && !kg) ? `<button onclick="giveKinglyGift('${a.id}')" style="font-size:11px;background:var(--gold-soft);border:1px solid var(--gold);color:var(--ink);border-radius:5px;padding:3px 8px;cursor:pointer">👑 Kingly Gift</button>` : '';
        return `<div style="border:1.5px solid ${border};border-radius:6px;padding:8px;margin-bottom:8px;${a.outOfAction ? 'opacity:0.6' : ''}${!onMission ? ';opacity:0.5' : ''}">
          <div style="display:flex;align-items:center;gap:6px">
            <input value="${escapeHtml(a.name)}" onchange="setAllyField('${a.id}','name',this.value)" style="flex:1;font-weight:700;border:none;background:transparent;color:var(--ink);font-size:14px">
            ${a.hardened ? '<span style="background:var(--gold);color:white;font-size:10px;font-weight:700;padding:1px 6px;border-radius:8px">HARDENED</span>' : ''}
            <button onclick="removeAlly('${a.id}')" style="background:none;border:none;color:var(--red);font-size:16px;cursor:pointer">×</button>
          </div>
          <div style="font-size:12px;margin-top:2px"><strong style="color:var(--gold)">Gift:</strong> ${escapeHtml(a.gift)} <span style="color:var(--text-muted)">— ${escapeHtml(a.giftDesc || '')}</span>${a.giftWasted ? ' <span style="background:var(--btn-warn-bg);color:white;font-size:9px;font-weight:700;padding:1px 5px;border-radius:7px;cursor:pointer" onclick="setAllyField(\'' + a.id + '\',\'giftWasted\',false)">WASTED ✕</span>' : ''}</div>
          <div style="font-size:12px"><strong style="color:var(--red-dark)">Quirk:</strong> <span style="color:var(--text-muted)">${escapeHtml(a.quirk)}</span></div>
          ${kgLine}
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;align-items:center">
            <select onchange="setAllyField('${a.id}','injury',this.value)" style="font-size:11px;padding:3px 4px">${injSel}</select>
            <select onchange="setAllyField('${a.id}','fatigue',this.value)" style="font-size:11px;padding:3px 4px">${fatSel}</select>
            <label style="font-size:11px;display:flex;align-items:center;gap:3px"><input type="checkbox"${onMission ? ' checked' : ''} onchange="setAllyOnMission('${a.id}',this.checked)" style="width:auto">On mission</label>
            <label style="font-size:11px;display:flex;align-items:center;gap:3px"><input type="checkbox"${a.hardened ? ' checked' : ''} onchange="setAllyField('${a.id}','hardened',this.checked)" style="width:auto">Hardened</label>
            <label style="font-size:11px;display:flex;align-items:center;gap:3px"><input type="checkbox"${a.outOfAction ? ' checked' : ''} onchange="setAllyField('${a.id}','outOfAction',this.checked)" style="width:auto">Out of action</label>
            ${kgBtn}
          </div>
        </div>`;
      }).join('');
    }
  }
}

function resolveJourneyEvent(isPeril) {
  const j = char.journey;
  if (isPeril) {
    if ((parseInt(j.perilEventsRemaining) || 0) <= 0) { alert('No peril events remaining.'); return; }
  } else {
    if (j.nextEventHex === null || j.nextEventHex === undefined) { alert('No event scheduled. Make a Marching Test first.'); return; }
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

  // Step 2: event Feat die, region-modified.
  let featFav = 'normal';
  if (moria) {
    // Moria is a Dark Land → Ill-Favoured, unless a foothold makes this leg a Border region.
    featFav = (j.region === 'Border') ? 'normal' : 'ill';
  } else if (j.region === 'Border') featFav = 'fav';
  else if (j.region === 'Dark') featFav = 'ill';
  const r = _doInlineRoll(0, featFav, null);

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
  } else if (r.featSpecial === 'eye') {
    event = { key: 'terrible', name: 'Terrible Misfortune 👁', fatigue: 3, effect: 'If the skill roll fails: target is <strong>Wounded</strong>' };
  } else if (r.featSpecial === 'rune') {
    event = { key: 'joyful', name: 'Joyful Sight ᚱ', fatigue: 0, effect: 'If the skill roll succeeds: every hero recovers <strong>+1 Hope</strong>' };
  } else if (f === 1) {
    event = { key: 'despair', name: 'Despair', fatigue: 2, effect: 'If the skill roll fails: <strong>everyone</strong> in the Company gains +1 Shadow (Dread)' };
  } else if (f >= 2 && f <= 3) {
    event = { key: 'ill', name: 'Ill Choices', fatigue: 2, effect: 'If the skill roll fails: <strong>target</strong> gains +1 Shadow (Dread)' };
  } else if (solo ? (f >= 4 && f <= 7) : (f >= 4 && f <= 9)) {
    event = { key: 'mishap', name: 'Mishap', fatigue: 2, effect: 'If the skill roll fails: +1 day to journey length, target gains +1 additional Fatigue' };
  } else if (solo && f >= 8 && f <= 9) {
    event = { key: 'shortcut', name: 'Short Cut', fatigue: 1, effect: 'If the skill roll succeeds: −1 day to journey' };
  } else if (solo && f === 10) {
    event = { key: 'chance', name: 'Chance-meeting', fatigue: 1, effect: 'If the skill roll succeeds: no Fatigue, favourable encounter' };
  } else if (!solo && f === 10) {
    event = { key: 'shortcut', name: 'Short Cut / Chance-meeting', fatigue: 1, effect: 'If the skill roll succeeds: −1 day to journey OR favourable encounter (LM picks)' };
  } else {
    event = { key: 'unknown', name: 'Event ('+f+')', fatigue: 1, effect: 'GM adjudicates' };
  }

  // Solo: roll the Event Detail sub-table to envision the specific event.
  const detailTable = moria ? MORIA_EVENT_DETAILS : SOLO_EVENT_DETAILS;
  let detailLine = '';
  if (solo && detailTable[event.key]) {
    const die = Math.floor(Math.random() * 6) + 1;
    const detail = detailTable[event.key][die - 1];
    // Override targetSkill if the sub-table specifies a different one
    if (detail.skill && detail.skill !== 'Noteworthy') {
      targetSkill = detail.skill;
    }
    const noteworthyTag = detail.outcome === 'Noteworthy Encounter'
      ? `<br><span style="background:var(--btn-alert-bg);color:white;padding:1px 6px;border-radius:8px;font-size:10px;font-weight:700">⭐ NOTEWORTHY ENCOUNTER</span> resolve as an extended scene (multiple rolls, possibly combat / council / endeavour). Award XP as a milestone afterwards.`
      : `<br><small style="color:var(--text-muted)">Sub-event roll: ${die} · Skill: ${detail.skill || targetSkill}</small>`;
    detailLine = `<br><em>${escapeHtml(detail.event)}</em> — <small>${escapeHtml(detail.outcome)}</small>${noteworthyTag}`;
  }
  // Branching Stairs (Moria): always roll the Random Chamber Generator.
  if (moria && event.key === 'branchingStairs') {
    const c = genChamber();
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
  j.events.push({
    day: j.daysElapsed,
    hex: isPeril ? j.currentHex : j.nextEventHex,
    text: `${perilPrefix}🎲 <strong>${event.name}</strong> (Feat ${featSym}${ponderTag}, region ${j.region}). ${rollClause} <strong>+${event.fatigue} Travel Fatigue</strong>. <em>${event.effect}</em>${detailSuffix}${playerHint}`
  });
  if (isPeril) {
    j.perilEventsRemaining = Math.max(0, (parseInt(j.perilEventsRemaining) || 0) - 1);
  } else {
    j.nextEventHex = null;
  }
  saveCharacter();
  renderJourney();
  if (typeof journalAuto === 'function') journalAuto('ojc', 'oracle', `${isPeril ? '[Peril] ' : ''}Journey event — ${event.name}${event.effect ? ' (' + event.effect.replace(/<[^>]+>/g, '') + ')' : ''}`);
}

async function arriveAtDestination() {
  const j = char.journey;
  if (!j || !j.active) return;
  if (!await confirmStyled('Arrive at destination?<br><br>This applies end-of-journey Fatigue reduction (mount Vigour + your TRAVEL roll), adds lingering Fatigue to your regular Fatigue counter, then closes the journey.', '🏁 Arrive')) return;

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
  const r = _doInlineRoll(s.rating, fav, tn);
  let success = r.outcome.startsWith('SUCCESS');
  if (char.miserable && r.featSpecial === 'eye') success = false;
  if (success) {
    const reduce = 1 + r.icons;
    const applied = Math.min(totalFat, reduce);
    totalFat -= applied;
    lines.push(`Arrival TRAVEL roll: <strong>${r.outcome}</strong> (Feat ${r.featLabel}, ${r.icons} ✦, total ${r.total ?? '★'} vs Heart TN ${tn}) → −${applied} → ${totalFat}.`);
  } else {
    lines.push(`Arrival TRAVEL roll: <strong>${r.outcome}</strong> (Feat ${r.featLabel}, total ${r.total ?? '✗'} vs Heart TN ${tn}) → no reduction.`);
  }

  // Lingering Fatigue → add to regular Fatigue (clears 1/Prolonged Rest in Safe Haven)
  const before = parseInt(char.fatigue) || 0;
  char.fatigue = before + totalFat;
  lines.push(`Lingering <strong>${totalFat}</strong> Fatigue added to character Fatigue (${before} → ${char.fatigue}). Clears at 1/Prolonged Rest in a Safe Haven.`);

  j.events.push({
    day: j.daysElapsed,
    hex: j.totalHexes,
    text: `🏁 <strong>Arrived at ${j.destination || 'destination'}!</strong><br>${lines.join('<br>')}`
  });
  j.active = false;
  // Advance the Chronicle clock by the days the journey took, and log the arrival.
  if (journal && journal.clock && (parseInt(j.daysElapsed) || 0) > 0) {
    journal.clock.day = (parseInt(journal.clock.day) || 1) + (parseInt(j.daysElapsed) || 0);
    saveJournal();
  }
  saveCharacter();
  renderJourney();
  renderConditionWarnings();
  setText('fat-v', char.fatigue);
  if (typeof journalAuto === 'function') journalAuto('ojc', 'milestone', `Arrived at ${j.destination || 'the destination'} after ${j.daysElapsed || '?'} days (from ${j.origin || '?'}).`);
  const recap = 'Journey complete!\n\n' + lines.map(l => l.replace(/<[^>]+>/g, '')).join('\n');
  // In solo play, offer to open a fresh "at the landmark" scene in the Chronicle (montage → play hand-off).
  const dest = j.destination || 'the destination';
  if (isSolo() && await confirmStyled(escapeHtml(recap).replace(/\n/g, '<br>') + `<br><br>Start a Chronicle scene at <strong>${escapeHtml(dest)}</strong>?`, '🏁 Arrived')) {
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
    alert('☀️ Short Rest while Wounded: no Endurance recovered (Core Rules p.71).');
    return;
  }
  // Frequency: one Short Rest per day (Core Rules p.71). Allow an explicit override.
  if (char.shortRestUsedToday) {
    if (!await confirmStyled(`You have already taken a Short Rest on Day ${char.dayCount || 1}.<br><br>RAW allows one Short Rest per day. Take another anyway? (LM's call.)`, '☀️ Already Rested Today')) return;
  }
  const recovered = Math.min(str, max - cur);
  if (!await confirmStyled(`Recover <strong>+${recovered}</strong> Endurance (your STRENGTH ${str}).<br>End: ${cur} → ${cur + recovered} / ${max}<br><br><small>At least 1 hour of inactivity. Marks your Short Rest for Day ${char.dayCount || 1}.</small>`, '☀️ Short Rest')) return;
  char.endCur = cur + recovered;
  char.shortRestUsedToday = true;
  saveCharacter();
  render();
}

async function takeProlongedRest() {
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
  if (wouldClearFatigue) {
    inSafeHaven = await confirmStyled(`🌙 Prolonged Rest (a night's sleep)\n\nEndurance recovery: +${endRecover}\n${hopeRecover ? 'Hope recovery: +1 (you were at 0)\n' : ''}\nYou have ${fat} Fatigue. Are you resting in a Safe Haven? Tap OK if yes (Fatigue will be reduced by 1), Cancel if no.`);
  } else {
    if (!await confirmStyled(`🌙 Prolonged Rest (a night's sleep)\n\nEndurance recovery: +${endRecover}${char.wounded ? ' (Wounded: STRENGTH only)' : ' (full)'}\n${hopeRecover ? 'Hope recovery: +1 (you were at 0)' : ''}\n\nMax one Prolonged Rest per day (LM may allow more in safe/comfortable places).`)) return;
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
  // Advance the Chronicle clock by a day (the night passes).
  if (journal && journal.clock) { journal.clock.day = (parseInt(journal.clock.day) || 1) + 1; saveJournal(); }
  let injuryTicked = 0;
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
  fpHoardSetupHint();
}

function fpHoardSetupHint() {
  const tierBtn = document.querySelector('#hoard-tier-pick .seg-btn.active');
  if (!tierBtn) return;
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
  const partySize = parseInt(document.getElementById('hoard-party-size').value) || 4;
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
      mhtml += `<div style="padding:8px;background:var(--gold-soft);border:1px solid var(--gold);border-radius:6px">
        <strong>✨ ${f.type}</strong> <small style="color:var(--text-muted)">(Feat ${f.featLabel})</small>
        <button onclick="hoardTakeMagicalItem('${f.type}', ${tainted})" style="background:var(--gold);color:white;border:none;border-radius:4px;padding:4px 8px;font-size:11px;font-weight:600;cursor:pointer;margin-left:8px">Take Item</button>
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
        if (await confirmStyled(`💰 Treasure (${char.treasure}) crossed ${tier.sol}'s threshold (${tier.treasure}).\n\nPromote Standard of Living from ${char.standard || '(none)'} to ${tier.sol}?`)) {
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
    return `<button onclick="applyTreasureIndex(${idx})" style="background:var(--card-bg);color:var(--ink);text-align:left;padding:10px 12px;font-size:13px;border:1px solid var(--border);border-radius:6px;cursor:pointer;display:block;width:100%;line-height:1.4">
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
    section.innerHTML = `<p class="hint" style="text-align:left;line-height:1.5;margin-bottom:8px">Famous Weapons/Armour have up to <strong>3 qualities</strong>, with at least 1 Enchanted Reward (per RAW p.162). Only the <strong>first is active</strong> when found; the rest unlock via new Valour rank or the Visiting the Treasury undertaking.</p>` +
      [1,2,3].map(n => `
        <div style="padding:8px;background:${n===1?'var(--gold-soft)':'var(--bg-deep)'};border:1px solid ${n===1?'var(--gold)':'var(--border)'};border-radius:6px;margin-bottom:6px">
          <strong style="font-size:12px;color:var(--red-dark)">Quality ${n} ${n===1 ? '<span style="background:var(--gold);color:white;padding:1px 6px;border-radius:8px;font-size:10px">ACTIVE on find</span>' : '<span style="background:var(--btn-secondary-bg);color:white;padding:1px 6px;border-radius:8px;font-size:10px">DORMANT</span>'}</strong>
          <select id="mi-q${n}-pick" onchange="fpFamousQualityPicked(${n})" style="width:100%;margin-top:4px;padding:4px;font-size:12px">${rewardOpts}</select>
          <input id="mi-q${n}-name" placeholder="Name (custom if not in dropdown)" style="width:100%;margin-top:4px;padding:4px;font-size:12px">
          <input id="mi-q${n}-desc" placeholder="Description (auto-filled from dropdown)" style="width:100%;margin-top:4px;padding:4px;font-size:11px">
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
    if (await confirmStyled(`⚠ TAINTED HOARD\n\nGreed Shadow gain for ${type}: +${greedAmt} Shadow.\n\nMake a WISDOM Shadow Test now to reduce? Success reduces by 1+icons.`)) {
      const r = _doInlineRoll(wisdomRating, 'normal', wisdomTN);
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
  if (!await confirmStyled(`Remove <strong>"${escapeHtml(item.name)}"</strong>?<br><br>Load will decrease by 1.`, 'Remove Magical Item')) return;
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
    list.innerHTML = '<p class="hint" style="text-align:center;margin:0">No magical treasure yet.</p>';
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
            ? '<span style="background:var(--gold);color:white;padding:1px 6px;border-radius:8px;font-size:9px;font-weight:700">ACTIVE</span>'
            : '<span style="background:var(--text-faint);color:white;padding:1px 6px;border-radius:8px;font-size:9px;font-weight:700">DORMANT</span>';
          const descLine = q.description ? `<br><small style="color:var(--text-muted)">${escapeHtml(q.description)}</small>` : '';
          return `<div style="padding:5px 8px;background:${bg};border:1px solid ${border};border-radius:4px;font-size:11px;color:${color}"><strong>${escapeHtml(q.name)}</strong> ${badge}${descLine}</div>`;
        }).join('') +
        '</div>';
      if (dormantCount > 0) {
        qualitiesBlock += `<button onclick="unlockDormantQuality(${i})" style="background:var(--gold);color:white;border:none;border-radius:4px;padding:5px 10px;font-size:11px;font-weight:600;cursor:pointer;margin-top:6px;width:100%">🔓 Unlock Next Dormant Quality (${dormantCount} left)</button>`;
      }
    }

    const cursedBorder = item.cursed ? 'var(--red-dark)' : 'var(--gold)';
    const cursedBadge = item.cursed
      ? `<span style="background:var(--btn-alert-bg);color:white;padding:1px 6px;border-radius:8px;font-size:9px;font-weight:700;margin-left:4px">⚠️ CURSED · ${escapeHtml(item.curseType || 'Cursed')}</span>`
      : '';

    return `<div style="padding:8px;background:var(--card-bg);border:${item.cursed ? '2px' : '1px'} solid ${cursedBorder};border-radius:6px;margin-bottom:6px;display:flex;align-items:flex-start;gap:8px">
      <div style="flex:1">
        <strong>${typeEmoji} ${escapeHtml(item.name || 'Unnamed')}</strong>${cursedBadge}
        <small style="color:var(--text-muted)">— ${item.type}${craft}</small>${blessingsTag}${notes}
        ${qualitiesBlock}
      </div>
      <button onclick="removeMagicalItem(${i})" class="del-btn" style="font-size:14px">×</button>
    </div>`;
  }).join('');
}

async function unlockDormantQuality(itemIdx) {
  const item = char.magicalItems[itemIdx];
  if (!item || !Array.isArray(item.qualities)) return;
  const nextDormantIdx = item.qualities.findIndex(q => !q.active);
  if (nextDormantIdx < 0) { alert('No dormant qualities to unlock.'); return; }
  const q = item.qualities[nextDormantIdx];

  const method = await promptStyled(`🔓 Unlock dormant quality on "${item.name}":\n\n  ${q.name}\n  ${q.description}\n\nHow are you unlocking it?\n\n  1. Via new VALOUR rank (instead of taking a Reward this rank-up — Core Rules p.163)\n  2. Via VISITING THE TREASURY undertaking (trade in 1 Reward from war gear at your folk's treasury — pp.121, 165)\n\nEnter 1 or 2 to confirm, or Cancel to abort.`, '');

  if (method !== '1' && method !== '2') return;

  q.active = true;
  const methodLabel = method === '1' ? 'new Valour rank' : 'Visiting the Treasury';
  saveCharacter();
  render();
  alert(`✅ Unlocked: "${q.name}" on ${item.name}.\nMethod: ${methodLabel}.\n\n${q.description || ''}\n\nRemember: if you used Valour rank-up, you've forgone this rank's Reward pick. If Visiting Treasury, mark off the war gear Reward you gifted to your folk.`);
}

async function flyYouFools() {
  const choice = await promptStyled(`🏃 Fly, You Fools! (Core Rules p.95)\n\nTwo ways to leave combat:\n\n1. REARWARD — assume Rearward stance, then escape when your turn comes. No roll. (Works only if conditions allow Rearward — see Combat tab Stance card.)\n\n2. DEFENSIVE — assume Defensive stance and roll your attack normally. SUCCESS → you escape (no damage dealt). FAILURE → you remain engaged.\n\nEnter 1 or 2 to set your stance, or Cancel to dismiss.`, '');
  if (choice === '1') {
    char.stance = 'rearward';
    saveCharacter();
    render();
    alert('Stance set to Rearward.\n\nOn your next action, you may escape without a roll (no Combat Task or attack possible).');
  } else if (choice === '2') {
    char.stance = 'defensive';
    saveCharacter();
    render();
    alert('Stance set to Defensive.\n\nRoll your attack on the Dice tab. SUCCESS = escape; FAILURE = remain engaged.\n\nRemember: Defensive stance loses 1d per Engaged Foe.');
  }
}

async function spendHopeToSupport() {
  const cur = parseInt(char.hopeCur) || 0;
  if (cur <= 0) { alert('No Hope to spend.'); return; }
  const focus = char.fellowshipFocus || '';
  const focusBit = focus ? `\n\nNote: if the ally you're supporting is your Fellowship Focus (${focus}), they gain +2d instead of +1d.` : '';
  if (!await confirmStyled(`Spend 1 Hope to support an ally's roll?\n\nHope: ${cur} → ${cur - 1}\nAlly gains +1d (or +2d if you are their Focus).${focusBit}\n\nThe ally should toggle "Receive Support" on their Dice tab.`)) return;
  char.hopeCur = cur - 1;
  saveCharacter();
  render();
}

async function spendFPforHope() {
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
  if (!await confirmStyled(`Spend 1 Fellowship point to gain +1 Hope?\n\nFP: ${fp} → ${fp - 1}\nHope: ${curHope} → ${curHope + 1} / ${maxHope}\n\n(Per RAW: only when the Company is resting — players agree on the distribution.)`)) return;
  char.fellowship = fp - 1;
  char.hopeCur = Math.min(maxHope, curHope + 1);
  saveCharacter();
  render();
}
