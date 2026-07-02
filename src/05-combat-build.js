/* ---------- STRIDER MODE: SPECIAL SUCCESS SPENDS (supplement) ---------- */
// Six post-roll spends shown after a success with ≥1 ✦ icon. Most are narrative-only;
// "Build advantage" queues +1d on the next roll via diceState.queuedAdvantage.
const SPECIAL_SUCCESS_SPENDS = [
  { id: 'insight',   label: '🔍 Gain Insight',     desc: 'Gain additional information, not necessarily related to the task at hand.' },
  { id: 'quietly',   label: '🤫 Go Quietly',        desc: 'Achieve your goal noiselessly or without attracting attention.' },
  { id: 'haste',     label: '⏱️ Make Haste',        desc: 'Complete the task in about half the expected time.' },
  { id: 'influence', label: '🎯 Widen Influence',   desc: 'Influence more than the specific number of subjects originally targeted.' },
  { id: 'advantage', label: '📈 Build Advantage',   desc: 'Carry forward your success — gain +1d on your next Skill roll.' },
  { id: 'cancel',    label: '🤝 Cancel a Failure',  desc: 'Co-op only — help another Player-hero who failed within the same skill roll.' }
];

function renderSpecialSuccessPanel(iconsAvailable) {
  const panel = document.getElementById('strider-special-success');
  if (!panel) return;
  if (!char.striderMode || iconsAvailable <= 0) {
    panel.style.display = 'none';
    return;
  }
  panel.style.display = 'block';
  // Track remaining icons on the panel itself for the spend handler
  panel.dataset.iconsLeft = String(iconsAvailable);
  const grid = panel.querySelector('div[style*="grid-template-columns"]');
  grid.innerHTML = SPECIAL_SUCCESS_SPENDS.map(s => {
    return `<button onclick="applySpecialSuccess('${s.id}')" title="${escapeHtml(s.desc)}" style="background:var(--card-bg);color:var(--ink);border:1px solid var(--border);border-radius:4px;padding:5px 6px;font-size:11px;cursor:pointer;text-align:left;line-height:1.3"><strong>${s.label}</strong><br><small style="color:var(--text-muted);font-size:10px">${escapeHtml(s.desc.substring(0, 60))}${s.desc.length>60?'…':''}</small></button>`;
  }).join('');
  // Status line
  let status = panel.querySelector('.spend-status');
  if (!status) {
    status = document.createElement('div');
    status.className = 'spend-status';
    status.style.cssText = 'margin-top:6px;font-size:10px;color:var(--text-muted);text-align:center';
    panel.appendChild(status);
  }
  status.textContent = `${iconsAvailable} ✦ icon${iconsAvailable>1?'s':''} available to spend`;
}

function rollAutoFortune(type) {
  // Roll on the Fortune or Ill-Fortune table inline. Same logic as the Oracle tab roller,
  // but result is appended to the dice tab's result summary for in-context narrative.
  const isIll = type === 'illfortune';
  const table = isIll ? ILL_FORTUNE_TABLE : FORTUNE_TABLE;
  const r = rollFeatOnce();
  let entry;
  if (r.special === 'eye') entry = table[0];
  else if (r.special === 'rune') entry = table[11];
  else entry = table.find(e => e.roll === r.value) || table[0];
  const summaryEl = document.getElementById('result-summary');
  if (summaryEl) {
    const colour = isIll ? 'var(--btn-alert-bg)' : 'var(--gold)';
    summaryEl.innerHTML += `<br><span class="result-tag" style="background:${colour};color:white">${isIll?'🎲 Ill-Fortune':'🎲 Fortune'} (Feat ${r.label}): ${entry.text}</span>`;
  }
  // Special EA hooks: Fortune Eye → −1 EA; Ill-Fortune Eye → +2 EA (solo modes — Moria reuses these tables).
  if (isSolo()) {
    if (isIll && r.special === 'eye') {
      char.eyeAwareness = (parseInt(char.eyeAwareness) || 0) + 2;
      saveCharacter(); refreshEyeOfMordor();
    } else if (!isIll && r.special === 'eye') {
      char.eyeAwareness = Math.max(0, (parseInt(char.eyeAwareness) || 0) - 1);
      saveCharacter(); refreshEyeOfMordor();
    }
  }
  logOracleRoll(isIll ? 'Ill-Fortune (auto)' : 'Fortune (auto)', entry.text.substring(0, 80));
  // Disable the button once used
  const btn = document.getElementById('strider-fortune-action');
  if (btn) btn.remove();
}

function applySpecialSuccess(id) {
  const panel = document.getElementById('strider-special-success');
  if (!panel) return;
  let left = parseInt(panel.dataset.iconsLeft) || 0;
  if (left <= 0) return;
  left -= 1;
  const spend = SPECIAL_SUCCESS_SPENDS.find(s => s.id === id);
  if (!spend) return;
  // Mechanical effect: Build Advantage queues +1d on the next roll
  if (id === 'advantage') {
    diceState.queuedAdvantage = (diceState.queuedAdvantage || 0) + 1;
  }
  // Log to roll history
  history.unshift({
    label: `${spend.label} (spent ✦)`,
    total: '',
    outcome: spend.desc,
    tn: '',
    icons: 0,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });
  saveHistory();
  renderHistory();
  // Re-render with new icons left
  renderSpecialSuccessPanel(left);
}

function applyPierce() {
  const p = diceState.pendingPierce;
  if (!p) return;
  const newFeat = Math.min(10, p.oldFeat + p.bonus);
  const delta = newFeat - p.oldFeat;
  const newTotal = p.oldTotal + delta;
  const newIcons = p.oldIcons - 1;

  // Update the kept Feat die in the DOM (the one not dimmed)
  document.querySelectorAll('#result-dice .feat-die').forEach(el => {
    if (el.style.opacity !== '0.4') el.textContent = String(newFeat);
  });
  document.getElementById('result-total').textContent = newTotal;

  // Recompute outcome
  let outcome;
  if (p.isAutoFail) outcome = 'FAIL (Miserable + Eye)';
  else if (newTotal >= p.tn) outcome = 'SUCCESS';
  else outcome = 'FAIL';

  let level = '';
  if (outcome.startsWith('SUCCESS')) {
    if (newIcons === 1) level = 'Great';
    else if (newIcons >= 2) level = 'Extraordinary';
  }
  const piercedNow = newFeat === 10;

  let summary = `<strong>vs TN ${p.tn}</strong> — ` +
    (outcome.startsWith('SUCCESS')
      ? `<span class="result-tag tag-success">${outcome}</span>`
      : `<span class="result-tag tag-fail">${outcome}</span>`);
  if (level === 'Great') summary += `<span class="result-tag tag-great">Great Success</span>`;
  if (level === 'Extraordinary') summary += `<span class="result-tag tag-extra">Extraordinary</span>`;
  if (newIcons > 0) summary += `<br><small>${newIcons} success icon${newIcons!==1?'s':''} remaining</small>`;
  summary += `<br><span class="result-tag" style="background:var(--warn-orange);color:white">🗡️ Pierce: Feat ${p.oldFeat}→${newFeat} (${p.profName} +${p.bonus}, spent 1 ✦)</span>`;
  if (piercedNow && outcome.startsWith('SUCCESS')) summary += `<br><span class="result-tag tag-pierce">Piercing Blow possible</span>`;
  document.getElementById('result-summary').innerHTML = summary;

  // Chain Pierce if there are still icons + room below 10
  const pierceDiv = document.getElementById('pierce-action');
  if (newFeat < 10 && newIcons > 0) {
    diceState.pendingPierce = { ...p, oldFeat: newFeat, oldTotal: newTotal, oldIcons: newIcons };
    const next = Math.min(10, newFeat + p.bonus);
    const piercedNext = next === 10 ? ' = <strong>Piercing Blow!</strong>' : '';
    pierceDiv.innerHTML = `<button onclick="applyPierce()" style="background:var(--warn-orange);color:white;border:none;border-radius:6px;padding:8px 14px;font-size:13px;font-weight:600;cursor:pointer">🗡️ Pierce again: spend 1 ✦ → Feat ${newFeat}→${next}${piercedNext}</button>`;
  } else {
    diceState.pendingPierce = null;
    pierceDiv.innerHTML = '';
  }
}

function rollFirstAid() {
  if (!char.wounded) { alert('First Aid only applies when Wounded.'); return; }
  const days = parseInt(char.injuryDays) || 0;
  if (days <= 0) { alert('No Severe Injury day-count to reduce. (Moderate/Grievous injuries do not use day-tracking.)'); return; }
  if (char.firstAidUsed) {
    alert('First Aid already attempted on this injury.\n\nPer RAW: a failed HEALING roll cannot be repeated until at least a day has passed. Tap "Reset (next day)" if a day has passed in fiction.');
    return;
  }
  const s = char.skills['Healing'] || { rating: 0, favoured: false };
  const item = {
    name: 'Healing',
    attr: 'hrt',
    firstAid: true,
    displayName: 'First Aid (Healing)'
  };
  quickRoll(item, s);
}

async function resetFirstAid() {
  if (!await confirmStyled('Reset First Aid for this injury? Use this when a day has passed in fiction and you want to retry a failed Healing roll.')) return;
  char.firstAidUsed = false;
  saveCharacter();
  refreshFirstAidRow();
}

function refreshFirstAidRow() {
  const row = document.getElementById('first-aid-row');
  if (!row) return;
  const show = char.wounded && (parseInt(char.injuryDays) || 0) > 0;
  row.style.display = show ? 'flex' : 'none';
  if (!show) return;
  const btn = document.getElementById('first-aid-btn');
  const status = document.getElementById('first-aid-status');
  const resetBtn = document.getElementById('first-aid-reset-btn');
  const used = !!char.firstAidUsed;
  btn.disabled = used;
  btn.style.opacity = used ? '0.4' : '1';
  btn.style.cursor = used ? 'not-allowed' : 'pointer';
  status.textContent = `${char.injuryDays} day${char.injuryDays>1?'s':''} to mend` + (used ? ' · First Aid spent' : '');
  resetBtn.style.display = used ? 'inline-block' : 'none';
}

function rollShadowTest(source) {
  // Dread → Valour vs Heart TN. Greed / Sorcery → Wisdom vs Wits TN.
  const isValour = (source === 'Dread');
  const skill = isValour ? 'Valour' : 'Wisdom';
  const attr = isValour ? 'hrt' : 'wit';
  const ratingSrc = isValour ? 'valour' : 'wisdom';
  const s = { rating: parseInt(char[ratingSrc]) || 1, favoured: false };
  const item = {
    name: skill,
    attr: attr,
    isMeta: true,
    ratingSrc: ratingSrc,
    shadowTest: source,
    displayName: `Shadow Test: ${source} (${skill})`
  };
  quickRoll(item, s);
}

async function hardenWill() {
  const shadow = parseInt(char.shadow) || 0;
  const scars = parseInt(char.scars) || 0;
  if (shadow <= 0) {
    alert('Harden Will: no current Shadow points to clear.');
    return;
  }
  if (shadow + scars >= char.hopeMax) {
    alert('Harden Will is unavailable: your Shadow (' + shadow + ') + Scars (' + scars + ') already matches or exceeds Max Hope (' + char.hopeMax + '). At this point only a Bout of Madness can clear your Shadow.');
    return;
  }
  const ok = await confirmStyled(`Clear all <strong>${shadow}</strong> current Shadow → gain <strong>1 permanent Shadow Scar</strong> (now ${scars} → ${scars + 1}).<br><br>A Scar counts as Shadow for Miserable / Bout of Madness, but can only be removed by the Heal Scars undertaking at Yule (5 AP per Scar).`, '🔥 Harden Will');
  if (!ok) return;
  char.shadow = 0;
  char.scars = scars + 1;
  char._boutPrompted = false;  // reset so future bouts can fire
  saveCharacter();
  render();
}

function refreshHardenWillButton() {
  const btn = document.getElementById('harden-will-btn');
  if (!btn) return;
  const shadow = parseInt(char.shadow) || 0;
  const scars = parseInt(char.scars) || 0;
  const enabled = shadow > 0 && (shadow + scars) < char.hopeMax;
  btn.disabled = !enabled;
  btn.style.opacity = enabled ? '1' : '0.4';
  btn.style.cursor = enabled ? 'pointer' : 'not-allowed';
}

function rollCombatTask(btn) {
  const stanceReq = btn.dataset.stanceReq;
  const labels = { forward: 'Forward', open: 'Open', defensive: 'Defensive', rearward: 'Rearward' };
  if (char.stance !== stanceReq) {
    alert(`This task requires ${labels[stanceReq]} stance.\nCurrent stance: ${char.stance ? labels[char.stance] : 'none'}.\n\nSet your stance on the Combat tab first.`);
    return;
  }
  const skillName = btn.dataset.skill;
  const taskLabels = {
    intimidate: 'Intimidate Foe',
    rally: 'Rally Comrades',
    protect: 'Protect Companion',
    prepare: 'Prepare Shot',
    'gain-ground': 'Gain Ground'
  };
  const taskName = taskLabels[btn.dataset.task];

  // Look up skill attribute and current rating
  let attr = 'str';
  if (SKILLS.hrt.includes(skillName)) attr = 'hrt';
  else if (SKILLS.wit.includes(skillName)) attr = 'wit';
  const s = char.skills[skillName] || { rating: 0, favoured: false };

  // Build a skill-like item; flag combatTask so quickRoll passes a custom label and tag
  const item = {
    name: skillName,
    attr: attr,
    combatTask: taskName,
    displayName: `${taskName} (${skillName})`
  };
  quickRoll(item, s);
}

function renderAgeHint() {
  const hint = document.getElementById('age-hint');
  if (!hint) return;
  if (char.culture && CULTURES[char.culture]) {
    hint.textContent = `Suggested age for ${char.culture}: ${CULTURES[char.culture].age}`;
    hint.style.display = 'block';
  } else {
    hint.style.display = 'none';
  }
}

function renderNameHint() {
  const hint = document.getElementById('name-hint');
  if (!hint) return;
  if (!char.culture || !NAMES[char.culture]) {
    hint.style.display = 'none';
    return;
  }
  if (!char.gender) {
    hint.innerHTML = '🎲 Tap the dice to generate a random name. <em>Pick Gender first for accurate results.</em>';
  } else {
    const fam = NAMES[char.culture].family ? ` + family name` : (char.culture === 'Bardings' ? ' (Bardings use patronymics)' : '');
    hint.innerHTML = `🎲 Generates a random ${char.gender} name from ${char.culture}${fam}.`;
  }
  hint.style.display = 'block';
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function generateRandomName() {
  if (!char.culture || !NAMES[char.culture]) {
    alert('Pick a Culture first (Build tab) so I know which name list to use.');
    return;
  }
  const data = NAMES[char.culture];
  const gender = (char.gender || '').toLowerCase();
  if (!gender || (gender !== 'male' && gender !== 'female')) {
    if (!await confirmStyled('No Gender set — pick a random name from either list?')) return;
  }
  const pool = (gender === 'female') ? data.female : (gender === 'male') ? data.male
              : (Math.random() < 0.5 ? data.male : data.female);
  let name = pickRandom(pool);
  if (data.family) name = name + ' ' + pickRandom(data.family);
  else if (char.culture === 'Bardings') {
    // Patronymic: "X, son/daughter of Y" using random male name as parent
    const parent = pickRandom(data.male);
    const lineage = (gender === 'female') ? 'daughter of' : 'son of';
    name = name + ', ' + lineage + ' ' + parent;
  }
  char.name = name;
  saveCharacter();
  render();
  // Also update header input live
  const headerName = document.getElementById('char-name');
  if (headerName) headerName.value = name;
}

function renderGearCount() {
  const hint = document.getElementById('gear-count-hint');
  if (!hint) return;
  // Count weapons by proficiency (lookup from WEAPONS catalog)
  const counts = { Axes: 0, Bows: 0, Spears: 0, Swords: 0, Brawling: 0 };
  (char.weapons || []).forEach(w => {
    const wp = WEAPONS.find(x => x.name === w.name);
    if (wp && counts[wp.prof] !== undefined) counts[wp.prof]++;
  });
  // Build display: allotted = prof rating, picked = count
  const parts = [];
  let anyAllotted = false;
  COMBAT_PROFS.forEach(p => {
    const allotted = char.profs[p] || 0;
    const picked = counts[p] || 0;
    if (allotted > 0) {
      anyAllotted = true;
      const ok = picked <= allotted;
      parts.push(`${p}: <strong style="color:${ok ? 'var(--red-dark)' : 'var(--red)'}">${picked}/${allotted}</strong>`);
    } else if (picked > 0) {
      parts.push(`${p}: <strong style="color:var(--red)">${picked}/0 ⚠</strong>`);
    }
  });
  if (!anyAllotted && parts.length === 0) {
    hint.innerHTML = '';
    return;
  }
  hint.innerHTML = `Starting gear (1 weapon per Combat Prof rank): ${parts.join(' · ')}`;
}

function renderFocusOptions() {
  const sel = document.getElementById('focus-pick');
  if (!sel) return;
  const current = char.fellowshipFocus || '';
  const allSkills = [...SKILLS.str, ...SKILLS.hrt, ...SKILLS.wit].sort();
  sel.innerHTML = '<option value="">— None —</option>' + allSkills.map(s =>
    `<option ${s === current ? 'selected' : ''}>${s}</option>`
  ).join('');
}

function setText(id, v) {
  const el = document.getElementById(id);
  if (el) el.textContent = v;
}

function renderSkills() {
  if (!char.skillNotes || typeof char.skillNotes !== 'object') char.skillNotes = {};
  ['str','hrt','wit'].forEach(attr => {
    const container = document.getElementById('skills-' + attr);
    container.innerHTML = '';
    SKILLS[attr].forEach(skillName => {
      const s = char.skills[skillName] || {rating: 0, favoured: false};
      const wrap = document.createElement('div');
      wrap.className = 'skill-wrap';
      const row = document.createElement('div');
      row.className = 'pip-row';
      row.innerHTML = `
        <div class="fav-check ${s.favoured ? 'checked' : ''}" data-skill="${skillName}" data-action="fav"></div>
        <div class="pip-name">${skillName}</div>
        <div class="pips">${renderPips(s.rating, skillName, 'skill')}</div>
      `;
      wrap.appendChild(row);
      const note = document.createElement('input');
      note.className = 'skill-note';
      note.placeholder = 'notes…';
      note.value = char.skillNotes[skillName] || '';
      note.addEventListener('change', () => {
        const val = note.value.trim();
        if (val) char.skillNotes[skillName] = val; else delete char.skillNotes[skillName];
        saveCharacter();
      });
      wrap.appendChild(note);
      container.appendChild(wrap);
    });
  });
  bindPipEvents();
}

function renderProfs() {
  const container = document.getElementById('combat-profs');
  container.innerHTML = '';
  COMBAT_PROFS.forEach(prof => {
    const rating = char.profs[prof] || 0;
    const row = document.createElement('div');
    row.className = 'pip-row';
    row.innerHTML = `
      <div style="width:22px;flex-shrink:0"></div>
      <div class="pip-name">${prof}</div>
      <div class="pips">${renderPips(rating, prof, 'prof')}</div>
    `;
    container.appendChild(row);
  });
  bindPipEvents();
}

function renderPips(rating, name, type) {
  let html = '';
  for (let i = 1; i <= 6; i++) {
    html += `<div class="pip ${i <= rating ? 'filled' : ''}" data-${type}="${name}" data-val="${i}" data-action="pip"></div>`;
  }
  return html;
}

let editMode = false;

function toggleEditMode() {
  editMode = !editMode;
  const btn = document.getElementById('edit-mode-btn');
  const state = document.getElementById('edit-mode-state');
  const card = document.getElementById('edit-mode-card');
  const instructions = document.getElementById('edit-mode-instructions');
  if (editMode) {
    btn.textContent = '🔒 Lock';
    btn.style.background = 'var(--ink)';
    state.textContent = 'UNLOCKED';
    state.style.background = 'var(--red)';
    card.style.borderColor = 'var(--red)';
    instructions.style.display = 'block';
  } else {
    btn.textContent = '🔓 Unlock';
    btn.style.background = 'var(--red)';
    state.textContent = 'LOCKED';
    state.style.background = 'var(--ink)';
    card.style.borderColor = 'var(--gold)';
    instructions.style.display = 'none';
  }
  // Re-render skills/profs to refresh interactive state
  renderSkills();
  renderProfs();
}

function bindPipEvents() {
  document.querySelectorAll('[data-action="pip"]').forEach(pip => {
    if (editMode) {
      pip.style.cursor = 'pointer';
      pip.title = 'Tap to set rating';
      pip.onclick = () => {
        const val = parseInt(pip.dataset.val);
        if (pip.dataset.skill) {
          const name = pip.dataset.skill;
          const cur = char.skills[name]?.rating || 0;
          const newVal = (cur === val) ? val - 1 : val;
          char.skills[name] = { ...(char.skills[name] || {favoured: false}), rating: Math.max(0, newVal) };
        } else if (pip.dataset.prof) {
          const name = pip.dataset.prof;
          const cur = char.profs[name] || 0;
          char.profs[name] = (cur === val) ? val - 1 : val;
        }
        saveCharacter(); renderSkills(); renderProfs(); renderQuickSkills();
      };
    } else {
      pip.style.cursor = 'default';
      pip.title = 'Locked — toggle Edit Mode or use Spend XP';
      pip.onclick = null;
    }
  });

  document.querySelectorAll('[data-action="fav"]').forEach(box => {
    if (editMode) {
      box.style.cursor = 'pointer';
      box.style.opacity = '1';
      box.title = 'Tap to toggle Favoured';
      box.onclick = () => {
        const name = box.dataset.skill;
        const cur = char.skills[name] || {rating: 0, favoured: false};
        cur.favoured = !cur.favoured;
        char.skills[name] = cur;
        saveCharacter(); renderSkills(); renderQuickSkills();
      };
    } else {
      box.style.cursor = 'default';
      box.style.opacity = '0.85';
      box.title = 'Locked — set via Build tab Favoured Skills picker';
      box.onclick = null;
    }
  });
}

function renderWeapons() {
  const tbody = document.getElementById('weapon-tbody');
  tbody.innerHTML = '';
  if (!char.weapons) char.weapons = [];
  char.weapons.forEach((w, i) => {
    const ro = w.picked ? 'readonly' : '';
    const versatile = w.picked && w.inj1h && w.inj2h;
    const gripBtn = versatile
      ? `<button onclick="toggleWeaponGrip(${i})" title="Switch between 1-handed (lower Injury, can use shield) and 2-handed (higher Injury, no shield Parry bonus)" style="background:${w.grip==='2h'?'var(--red)':'var(--bg-deep)'};color:${w.grip==='2h'?'white':'var(--ink)'};border:1px solid var(--border);border-radius:4px;font-size:10px;font-weight:600;padding:2px 6px;margin-top:2px;cursor:pointer;width:100%">${w.grip || '1h'}</button>`
      : '';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input value="${escapeHtml(w.name || '')}" oninput="updateWeapon(${i},'name',this.value)">${gripBtn}</td>
      <td><input value="${escapeHtml(w.dmg || '')}" oninput="updateWeapon(${i},'dmg',this.value)" ${ro}></td>
      <td><input value="${escapeHtml(w.inj || '')}" oninput="updateWeapon(${i},'inj',this.value)" ${ro}></td>
      <td><input value="${escapeHtml(w.load || '')}" oninput="updateWeapon(${i},'load',this.value)" ${ro}></td>
      <td><input value="${escapeHtml(w.notes || '')}" oninput="updateWeapon(${i},'notes',this.value)"></td>
      <td style="white-space:nowrap"><button class="del-btn" onclick="moveWeapon(${i},-1)" title="Move up" style="padding:2px 5px">▲</button><button class="del-btn" onclick="moveWeapon(${i},1)" title="Move down" style="padding:2px 5px">▼</button><button class="del-btn" onclick="removeWeapon(${i})">×</button></td>
    `;
    tbody.appendChild(tr);
  });
}
// U3 — reorder War Gear rows (touch-friendly ▲/▼; HTML5 drag is unreliable on iOS).
function moveWeapon(i, dir) {
  if (!char.weapons) return;
  const j = i + dir;
  if (j < 0 || j >= char.weapons.length) return;
  const a = char.weapons;
  [a[i], a[j]] = [a[j], a[i]];
  saveCharacter();
  renderWeapons();
}

function toggleWeaponGrip(i) {
  const w = char.weapons[i];
  if (!w || !w.inj1h || !w.inj2h) return;
  const newGrip = w.grip === '2h' ? '1h' : '2h';
  w.grip = newGrip;
  w.inj = newGrip === '2h' ? w.inj2h : w.inj1h;
  // Update notes with current grip indicator
  const baseNotes = (w.notes || '').replace(/\s*\(currently \dh\)/g, '');
  w.notes = baseNotes + (newGrip === '2h' ? ' (currently 2h)' : ' (currently 1h)');
  saveCharacter();
  renderWeapons();
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

function addWeapon() {
  if (!char.weapons) char.weapons = [];
  char.weapons.push({name:'', dmg:'', inj:'', load:'', notes:'', picked: false});
  saveCharacter(); renderWeapons();
}

function isWeaponRestricted(weaponName, culture) {
  if (culture === 'Hobbits of the Shire') {
    // Hobbits allowed: axe, bow, club, cudgel, dagger, short sword, short spear, spear
    const allowed = ['Unarmed', 'Dagger', 'Cudgel', 'Club', 'Short Sword', 'Short Spear', 'Spear', 'Axe', 'Bow'];
    if (!allowed.includes(weaponName)) return 'Hobbits cannot use ' + weaponName + ' (cultural restriction).';
  }
  if (isDwarfCulture(culture)) {
    if (['Great Bow', 'Great Spear'].includes(weaponName)) return 'Dwarves cannot use ' + weaponName + ' (Naugrim restriction).';
  }
  return null;
}

function openWeaponPicker() {
  const list = document.getElementById('weapon-list');
  list.innerHTML = '';
  // Group by proficiency
  const groups = {};
  WEAPONS.forEach((w, i) => {
    if (!groups[w.prof]) groups[w.prof] = [];
    groups[w.prof].push({...w, idx: i});
  });
  Object.keys(groups).forEach(prof => {
    const h = document.createElement('div');
    h.style.cssText = 'font-size:11px;color:var(--red);text-transform:uppercase;letter-spacing:1px;font-weight:700;padding:6px 2px 2px;';
    h.textContent = prof;
    list.appendChild(h);
    groups[prof].forEach(w => {
      const restriction = isWeaponRestricted(w.name, char.culture);
      const btn = document.createElement('button');
      btn.style.cssText = `background:${restriction?'var(--red-soft)':'var(--pure-white)'};color:${restriction?'#888':'var(--ink)'};text-align:left;padding:10px 12px;font-size:13px;border:1px solid ${restriction?'var(--border)':'var(--border)'};border-radius:6px;cursor:pointer;display:block;width:100%;line-height:1.4;`;
      btn.innerHTML =
        `<strong>${w.name}</strong>${restriction ? ' <span style="color:var(--red);font-size:10px">⚠ restricted</span>' : ''}` +
        `<span style="float:right;color:var(--red);font-weight:600;font-size:12px">Dmg ${w.dmg} · Inj ${w.inj}</span><br>` +
        `<small style="color:var(--text-muted)">Load ${w.load}${w.notes ? ' · ' + w.notes : ''}</small>`;
      btn.onclick = () => pickWeapon(w.idx);
      list.appendChild(btn);
    });
  });
  document.getElementById('weapon-picker-overlay').classList.add('show');
}

function closeWeaponPicker() {
  document.getElementById('weapon-picker-overlay').classList.remove('show');
}

async function pickWeapon(i) {
  const w = WEAPONS[i];
  const restriction = isWeaponRestricted(w.name, char.culture);
  if (restriction && !await confirmStyled(`⚠ ${restriction}\n\nEquip anyway?`)) return;
  if (!char.weapons) char.weapons = [];
  // Versatile weapons have inj like "16/18" — parse into inj1h/inj2h. Default grip '1h'.
  const injStr = String(w.inj);
  const isVersatile = injStr.includes('/');
  const inj1h = isVersatile ? injStr.split('/')[0].trim() : injStr;
  const inj2h = isVersatile ? injStr.split('/')[1].trim() : '';
  const grip = isVersatile ? '1h' : (w.notes && w.notes.includes('2-handed') ? '2h' : '1h');
  char.weapons.push({
    name: w.name,
    dmg: String(w.dmg),
    inj: inj1h,
    inj1h: inj1h,
    inj2h: inj2h,
    grip: grip,
    load: String(w.load),
    notes: w.notes,
    prof: w.prof,
    picked: true
  });
  saveCharacter();
  renderWeapons();
  closeWeaponPicker();
}

function updateWeapon(i, field, val) {
  char.weapons[i][field] = val;
  saveCharacter();
  if (field === 'load') {
    recomputeLoad();
    setText('load-v', char.load);
  }
}

function removeWeapon(i) {
  char.weapons.splice(i, 1);
  saveCharacter(); renderWeapons();
}

function renderProtectionParry() {
  const armour = parseInt(char.armourProt) || 0;
  const helm = parseInt(char.helmProt) || 0;
  const baseParry = parseInt(char.parry) || 0;
  const shieldBonus = parseInt(char.shieldTotal) || 0;
  setText('prot-v', armour + helm);
  setText('parry-v', baseParry + shieldBonus);

  // Opening Volleys (Core Rules p.93): when the hero is the aware target of a ranged volley,
  // the shield's Parry bonus is doubled vs ranged for that exchange.
  const ovBtn = document.getElementById('opening-volley-btn');
  const ovInfo = document.getElementById('opening-volley-info');
  if (ovBtn) {
    const on = !!char.openingVolley;
    ovBtn.textContent = on ? '🏹 Opening Volley (aware) — ON' : '🏹 Opening Volley (aware) — off';
    ovBtn.style.background = on ? 'var(--gold)' : 'var(--btn-secondary-bg)';
    if (ovInfo) {
      ovInfo.style.display = on ? 'block' : 'none';
      setText('parry-ranged-v', baseParry + shieldBonus * 2);
    }
  }

  // Helm toggle button label
  const helmBtn = document.getElementById('helm-toggle-btn');
  if (helmBtn) helmBtn.textContent = (helm > 0) ? 'Remove Helm' : 'Add Helm';

  // Dwarven hint
  const dwarfHint = document.getElementById('dwarf-load-hint');
  if (dwarfHint) dwarfHint.style.display = isDwarfCulture() ? 'block' : 'none';
}

function toggleOpeningVolley() {
  char.openingVolley = !char.openingVolley;
  saveCharacter();
  renderProtectionParry();
}

// Shadow Test follow-through (Core Rules p.158): apply the net Shadow gain after a test.
// net = max(0, incoming − reduction). Routes through adj() so caps, the Bout/Miserable
// triggers, the solo-mode Eye-Awareness hook, and undo all apply consistently.
function applyShadowTestResult(reduction) {
  const inEl = document.getElementById('shadow-incoming');
  const incoming = Math.max(0, parseInt(inEl && inEl.value) || 0);
  const net = Math.max(0, incoming - (parseInt(reduction) || 0));
  const before = parseInt(char.shadow) || 0;
  if (net > 0) adj('shadow', net);     // adj snapshots (undo), clamps, fires EA hook, re-renders
  const applied = (parseInt(char.shadow) || 0) - before;
  const row = document.getElementById('shadow-apply-row');
  if (row) {
    row.innerHTML = `<span style="color:var(--success-text);font-weight:600">✓ Applied +${applied} Shadow</span>` +
      ` <small style="color:var(--text-muted)">(${incoming} incoming − ${reduction} reduced${applied < net ? ', capped at Max' : ''})</small>`;
  }
}

function halveForDwarf(load) {
  return isDwarfCulture() ? Math.ceil(load / 2) : load;
}

/* ---------- ARMOUR / HELM / SHIELD PICKERS ---------- */
function openArmourPicker() {
  const list = document.getElementById('armour-list');
  list.innerHTML = '';
  ARMOURS.forEach((a, i) => {
    const btn = document.createElement('button');
    btn.style.cssText = 'background:var(--card-bg);color:var(--ink);text-align:left;padding:10px 12px;font-size:13px;border:1px solid var(--border);border-radius:6px;cursor:pointer;display:block;width:100%;line-height:1.4;';
    const dwarven = isDwarfCulture();
    const shownLoad = dwarven ? Math.ceil(a.load / 2) : a.load;
    btn.innerHTML =
      `<strong>${a.name}</strong>` +
      `<span style="float:right;color:var(--red);font-weight:600;font-size:12px">${a.prot}d · Load ${shownLoad}${dwarven ? ' (½)' : ''}</span><br>` +
      `<small style="color:var(--text-muted)">${a.type}${a.min ? ' · min: ' + a.min : ''}</small>`;
    btn.onclick = () => pickArmour(i);
    list.appendChild(btn);
  });
  document.getElementById('armour-picker-overlay').classList.add('show');
}

function closeArmourPicker() {
  document.getElementById('armour-picker-overlay').classList.remove('show');
}

function pickArmour(i) {
  const a = ARMOURS[i];
  char.armourProt = a.prot;
  char.armourLoad = halveForDwarf(a.load);
  char.armourNotes = a.type;
  saveCharacter();
  render();
  closeArmourPicker();
}

async function clearArmour() {
  if (!await confirmStyled('Clear body armour?')) return;
  char.armourProt = 0; char.armourLoad = 0; char.armourNotes = '';
  saveCharacter(); render();
}

function toggleHelm() {
  const hasHelm = (parseInt(char.helmProt) || 0) > 0;
  if (hasHelm) {
    char.helmProt = 0;
    char.helmLoad = 0;
  } else {
    char.helmProt = 1;
    char.helmLoad = halveForDwarf(4);
  }
  saveCharacter();
  render();
}

function openShieldPicker() {
  const list = document.getElementById('shield-list');
  list.innerHTML = '';
  SHIELDS.forEach((s, i) => {
    const btn = document.createElement('button');
    btn.style.cssText = 'background:var(--card-bg);color:var(--ink);text-align:left;padding:10px 12px;font-size:13px;border:1px solid var(--border);border-radius:6px;cursor:pointer;display:block;width:100%;line-height:1.4;';
    btn.innerHTML =
      `<strong>${s.name}</strong>` +
      `<span style="float:right;color:var(--red);font-weight:600;font-size:12px">Parry +${s.parry} · Load ${s.load}</span>` +
      (s.min ? `<br><small style="color:var(--text-muted)">min: ${s.min}</small>` : '');
    btn.onclick = () => pickShield(i);
    list.appendChild(btn);
  });
  document.getElementById('shield-picker-overlay').classList.add('show');
}

function closeShieldPicker() {
  document.getElementById('shield-picker-overlay').classList.remove('show');
}

async function pickShield(i) {
  const s = SHIELDS[i];
  // Hobbits and Dwarves cannot use great shield
  if (s.name === 'Great Shield' && (char.culture === 'Hobbits of the Shire' || isDwarfCulture())) {
    if (!await confirmStyled(`${char.culture} cannot use a Great Shield per cultural restrictions. Equip anyway?`)) return;
  }
  char.shieldBase = s.parry;
  char.shieldTotal = s.parry;
  char.shieldLoad = s.load;
  char.shieldNotes = s.name;
  saveCharacter();
  render();
  closeShieldPicker();
}

async function clearShield() {
  if (!await confirmStyled('Clear shield?')) return;
  char.shieldBase = 0; char.shieldTotal = 0; char.shieldLoad = 0; char.shieldNotes = '';
  saveCharacter(); render();
}

/* ---------- PROTECTION ROLL ---------- */
// Pure Protection roll: Feat + protDice success dice (+ Close-fitting / Furious / Stone-Hard /
// Skin-Coat bonuses, Weary, Miserable) vs the weapon Injury TN. No DOM, no save — the caller
// (Dice tab or Chronicle foe-attack flow) renders and applies the result. Shared so both match.
function _protectionRoll(tn, protDice) {
  if (protDice == null || isNaN(protDice)) protDice = parseInt(char.armourProt) || 0;
  // Beornings Furious: Wounded → Protection rolls Favoured (roll 2 Feat dice, keep better)
  const furiousFav = (char.culture === 'Beornings' && char.wounded);
  // Stone-Hard (Dwarves of Durin's Folk) — Protection rolls Favoured unless Miserable
  const stoneHardFav = hasVirtue('Stone-Hard') && !char.miserable;
  // Skin-Coat (Beornings) — +1d Protection if wearing Leather armour or no armour
  const armourIsLight = (parseInt(char.armourProt) || 0) === 0 || char.armourNotes === 'Leather armour';
  const skinCoatBonus = (hasVirtue('Skin-Coat') && armourIsLight) ? 1 : 0;
  const fav = furiousFav || stoneHardFav;
  const feat = fav
    ? (() => { const a = rollFeatOnce(), b = rollFeatOnce();
        const score = r => r.special === 'rune' ? 100 : (r.special === 'eye' ? -100 : r.value);
        return (score(a) >= score(b)) ? a : b; })()
    : rollFeatOnce();
  const dice = [];
  // Weary applies to Protection rolls too
  for (let i = 0; i < protDice + skinCoatBonus; i++) {
    const v = Math.floor(Math.random() * 6) + 1;
    const wearied = !!char.weary && v < 4;
    dice.push({ value: v, icon: v === 6, wearied });
  }
  const isAutoSuccess = feat.special === 'rune';
  const isAutoFail = feat.special === 'eye' && char.miserable;
  // Close-fitting reward: +2 to Protection roll result
  const closeFittingBonus = (
    ((char.armourRewards || []).includes('Close-fitting') ? 2 : 0) +
    ((char.helmRewards || []).includes('Close-fitting') ? 2 : 0)
  );
  const total = isAutoSuccess ? null : feat.value + dice.reduce((s, d) => s + (d.wearied ? 0 : d.value), 0) + closeFittingBonus;
  let outcome;
  if (isAutoFail) outcome = 'FAIL';
  else if (isAutoSuccess) outcome = 'SUCCESS (Rune!)';
  else outcome = (total >= tn) ? 'SUCCESS' : 'FAIL';
  return { feat, dice, total, outcome, isAutoSuccess, isAutoFail, closeFittingBonus, furiousFav, stoneHardFav, skinCoatBonus };
}
// Mark Wounded + roll & record Wound Severity (shared by the Dice tab and the foe-attack flow).
// Returns the severity result.
async function _applyWoundFromFail() {
  char.wounded = true;
  const r = rollWoundSeverity();
  char.injury = `${r.label} — ${r.detail}`;
  char.injuryDays = r.days;
  char.firstAidUsed = false;  // new injury → First Aid available again
  saveCharacter();
  render();
  alert(`Wound Severity:\n\n${r.label}\n${r.detail}`);
  return r;
}
async function rollProtection() {
  const tn = parseInt(document.getElementById('prot-injury-tn').value);
  let protDice = parseInt(document.getElementById('prot-dice').value);
  if (!tn) { alert('Enter the weapon Injury TN first'); return; }

  const R = _protectionRoll(tn, isNaN(protDice) ? null : protDice);
  const { feat, dice, total, outcome, isAutoSuccess, isAutoFail, closeFittingBonus, furiousFav, stoneHardFav, skinCoatBonus } = R;

  // Render
  const resultEl = document.getElementById('prot-result');
  resultEl.style.display = 'block';
  const diceDiv = document.getElementById('prot-dice-display');
  diceDiv.innerHTML = '';
  const fd = document.createElement('div');
  fd.className = 'feat-die' + (feat.special === 'eye' ? ' eye' : '') + (feat.special === 'rune' ? ' rune' : '');
  fd.textContent = feat.label;
  diceDiv.appendChild(fd);
  dice.forEach(d => {
    const e = document.createElement('div');
    e.className = 'success-die' + (d.icon ? ' icon' : '') + (d.wearied ? ' dim' : '');
    e.textContent = d.value;
    diceDiv.appendChild(e);
  });
  document.getElementById('prot-total').textContent = isAutoSuccess ? '★' : (isAutoFail ? '✗' : total);

  let summary = `<strong>vs Injury ${tn}</strong> — `;
  summary += outcome.startsWith('SUCCESS')
    ? `<span class="result-tag tag-success">${outcome}</span> — no Wound`
    : `<span class="result-tag tag-fail">${outcome}</span> — <strong>Wounded!</strong>`;
  if (closeFittingBonus > 0) summary += `<br><small style="color:var(--gold);font-weight:600">Close-fitting reward: +${closeFittingBonus} to result</small>`;
  if (furiousFav) summary += `<br><small style="color:var(--gold);font-weight:600">Furious (Beornings, Wounded): Favoured</small>`;
  if (stoneHardFav) summary += `<br><small style="color:var(--gold);font-weight:600">Stone-Hard (Dwarves): Favoured</small>`;
  if (skinCoatBonus) summary += `<br><small style="color:var(--gold);font-weight:600">Skin-Coat (Beornings, leather/none): +${skinCoatBonus}d</small>`;
  document.getElementById('prot-summary').innerHTML = summary;

  if (outcome === 'FAIL') {
    if (await confirmStyled('Failed Protection Roll!\n\nMark Wounded and roll Wound Severity?')) {
      await _applyWoundFromFail();
    }
  }
}

/* ---------- WOUND SEVERITY ---------- */
function rollWoundSeverity() {
  const r = Math.floor(Math.random() * 12) + 1;
  if (r === 11) return { label: 'Grievous Injury 👁', detail: 'Unconscious & Dying (as if Wounded twice)', days: 0 };
  if (r === 12) return { label: 'Moderate Injury ᚱ', detail: 'Uncheck Wounded in a few hours', days: 0 };
  return { label: `Severe Injury (${r})`, detail: `${r} days to mend; dies in 1 hr without Healing roll`, days: r };
}

/* ---------- COMBAT-TAB ENCOUNTER TRACKER ---------- */
let _encResults = {};  // transient inline roll results, keyed by foe id (not persisted)
// P5: in a cloud campaign the encounter is SHARED (Sync mirror of campaigns/{cid}/encounter);
// otherwise it's this hero's local char.encounter, exactly as before.
function encShared() { return typeof Sync !== 'undefined' && Sync.sharedEncActive && Sync.sharedEncActive(); }
// GM-locked controls (add/edit/remove foes, round, end) — everyone in local mode, loremaster in shared.
function encCanGm() { return !encShared() || (Sync.isLoremaster && Sync.isLoremaster()); }
function enc() {
  if (encShared()) return Sync.sharedEnc();
  return char.encounter || (char.encounter = JSON.parse(JSON.stringify(DEFAULT_CHARACTER.encounter)));
}
function getFoe(id) { return enc().foes.find(f => f.id === id); }
function encEngagedFoes() { return enc().foes.filter(f => f.engaged && !f.slain); }
function ensureEncounterActive() { const e = enc(); if (!e.active) { e.active = true; e.round = 1; } }
function encDeriveEngaged() { const e = enc(); if (e.active) char.engagedFoes = encEngagedFoes().length; }
function _newFoeId() { return 'f' + Date.now() + Math.floor(Math.random() * 1000); }
function _equippedWeapons() { return (char.weapons || []).map((w, i) => ({ ...w, idx: i, prof: _weaponProf(w) })).filter(w => (parseInt(w.dmg) || 0) > 0); }
// Equipped weapons don't always store `prof` (picked weapons historically didn't). Derive it from
// the WEAPONS catalog by name, falling back to any stored prof, then '' (custom → treated as Brawling).
function _weaponProf(w) { if (w && w.prof) return w.prof; const wp = WEAPONS.find(x => x.name === (w && w.name)); return wp ? wp.prof : ''; }

function nextRound() { const e = enc(); e.round = (parseInt(e.round) || 1) + 1; saveCharacter(); renderEncounter(); }
async function endEncounter() {
  const e = enc();
  if (e.foes.length && !await confirmStyled('End the encounter and clear all adversaries?', 'End Encounter')) return;
  _encFinishGroup();  // finalise the Chronicle combat group (summary) BEFORE clearing the encounter
  if (encShared()) { const m = Sync.sharedEnc(); m.active = false; m.round = 1; m.foes = []; }
  else char.encounter = JSON.parse(JSON.stringify(DEFAULT_CHARACTER.encounter));
  char.engagedFoes = 0;
  _encResults = {};
  saveCharacter(); render(); renderEncounter();
  if (typeof renderChronicle === 'function') renderChronicle();
}

// ----- bestiary / adding foes -----
function openBestiary() { renderBestiaryList(); document.getElementById('bestiary-overlay').classList.add('show'); }
function renderBestiaryList() {
  const q = (document.getElementById('bestiary-filter')?.value || '').toLowerCase().trim();
  const list = document.getElementById('bestiary-list'); if (!list) return;
  let html = '', src = '';
  allBestiary().forEach((b, idx) => {
    if (!b.name.toLowerCase().includes(q)) return;
    if (b.source !== src) { src = b.source; html += `<div style="font-size:11px;font-weight:700;color:var(--text-muted);margin:8px 0 4px">${src}</div>`; }
    html += `<button onclick="addFoeFromBestiary(${idx})" class="add-row-btn" style="width:100%;text-align:left;margin-bottom:4px;background:var(--bg-deep);color:var(--ink);font-size:12px">
      <strong>${escapeHtml(b.name)}</strong> — End ${b.end}, Parry ${b.parry}, Armour ${b.armour}${b.might ? `, Might ${b.might}` : ''}<br>
      <span style="color:var(--text-muted)">${b.attacks.map(a => `${escapeHtml(a.name)} ${a.dice}d (${a.dmg}/${a.inj})`).join(' · ')}</span></button>`;
  });
  list.innerHTML = html || '<div style="color:var(--text-faint);text-align:center;padding:10px">No match.</div>';
}
function addFoeFromBestiary(idx) {
  const b = allBestiary()[idx]; if (!b) return;
  ensureEncounterActive();
  enc().foes.push({
    id: _newFoeId(), name: b.name, source: b.source,
    endMax: b.end, endCur: b.end, might: b.might, hateMax: b.hate, hateCur: b.hate,
    parry: b.parry, armour: b.armour, atkTN: b.atkTN,
    attacks: JSON.parse(JSON.stringify(b.attacks)), fell: b.fell,
    engaged: true, wounded: false, slain: false
  });
  encDeriveEngaged(); _encEnsureGroup(); saveCharacter(); renderEncounter();
  document.getElementById('bestiary-overlay').classList.remove('show');
}
function addCustomFoe() {
  ensureEncounterActive();
  const f = { id: _newFoeId(), name: 'New foe', source: 'Custom', endMax: 12, endCur: 12, might: 0, hateMax: 2, hateCur: 2, parry: 3, armour: 1, atkTN: 14, attacks: [{ name: 'Attack', dice: 2, dmg: 4, inj: 14, special: '' }], fell: '', engaged: true, wounded: false, slain: false, _edit: true };
  enc().foes.push(f);
  encDeriveEngaged(); saveCharacter(); renderEncounter();
  document.getElementById('bestiary-overlay').classList.remove('show');
}
function removeFoe(id) { const e = enc(); e.foes = e.foes.filter(f => f.id !== id); delete _encResults[id]; encDeriveEngaged(); saveCharacter(); renderEncounter(); }
function adjFoe(id, field, delta) {
  const f = getFoe(id); if (!f) return;
  const max = field === 'endCur' ? f.endMax : (field === 'hateCur' ? f.hateMax : 999);
  f[field] = Math.max(0, Math.min(max, (parseInt(f[field]) || 0) + delta));
  if (field === 'endCur') { if (f.endCur === 0) { f.slain = true; f.engaged = false; } else if (f.slain) f.slain = false; }
  encDeriveEngaged(); saveCharacter(); renderEncounter();
}
function setFoeField(id, field, val) {
  const f = getFoe(id); if (!f) return;
  if (field === 'name' || field === 'fell') f[field] = val;
  else { f[field] = Math.max(0, parseInt(val) || 0); if (field === 'endMax' && f.endCur > f.endMax) f.endCur = f.endMax; }
  saveCharacter(); renderEncounter();
}
function toggleFoeEdit(id) { const f = getFoe(id); if (!f) return; f._edit = !f._edit; renderEncounter(); }
function addFoeAttack(id) { const f = getFoe(id); if (!f) return; (f.attacks = f.attacks || []).push({ name: 'Attack', dice: 2, dmg: 4, inj: 14, special: '' }); saveCharacter(); renderEncounter(); }
function delFoeAttack(id, i) { const f = getFoe(id); if (!f) return; f.attacks.splice(i, 1); saveCharacter(); renderEncounter(); }
function setFoeAttack(id, i, field, val) { const f = getFoe(id); if (!f || !f.attacks[i]) return; if (field === 'name' || field === 'special') f.attacks[i][field] = val; else f.attacks[i][field] = Math.max(0, parseInt(val) || 0); saveCharacter(); renderEncounter(); }

// ----- encounter advanced-roll state + weapon -----
function setEncWeapon(idx) { enc().weaponIdx = parseInt(idx) || 0; saveCharacter(); renderEncounter(); }
function toggleEncAdv() { enc().adv.open = !enc().adv.open; saveCharacter(); renderEncounter(); }
function setEncAdv(field, val) {
  const a = enc().adv;
  if (field === 'fav') a.fav = val;
  else if (field === 'extra') a.extra = parseInt(val) || 0;
  else a[field] = !a[field];
  saveCharacter(); renderEncounter();
}

// ----- Chronicle combat group (folds an encounter's log lines under one collapsible heading) -----
function _encGroupTitle() {
  const names = [...new Set((enc().foes || []).map(f => f.name))];
  return names.length ? '⚔️ Combat vs ' + names.join(', ') : '⚔️ Combat';
}
function _activeCombatGroup() { return (journal.combatGroups || []).find(g => g.id === journal.activeCombatId) || null; }
// Open (or refresh) the combat group so subsequent journal blocks carry its combatId. Solo only.
function _encEnsureGroup() {
  if (typeof isSolo === 'function' && !isSolo()) return;
  if (!journal) return;
  if (journal.activeCombatId && _activeCombatGroup()) { const g = _activeCombatGroup(); if (g && !g.renamed) g.title = _encGroupTitle(); saveJournal(); return; }
  const sc = ensureActiveScene();
  const id = 'cg' + Date.now() + Math.floor(Math.random() * 1000);
  journal.combatGroups = journal.combatGroups || [];
  journal.combatGroups.push({
    id, sceneId: sc.id, title: _encGroupTitle(), renamed: false, collapsed: true, ongoing: true,
    startSnap: { end: parseInt(char.endCur) || 0, hope: parseInt(char.hopeCur) || 0, shadow: (parseInt(char.shadow) || 0) + (parseInt(char.scars) || 0) },
    summary: ''
  });
  journal.activeCombatId = id;
  saveJournal();
}
// Finalise the open group: compute the one-line summary, mark not-ongoing, release the id.
function _encFinishGroup() {
  if (!journal || !journal.activeCombatId) return;
  const g = _activeCombatGroup();
  if (g) {
    const e = enc(); const foes = e.foes || [];
    const slain = foes.filter(f => f.slain).length;
    const endLost = (g.startSnap.end || 0) - (parseInt(char.endCur) || 0);
    const hopeD = (parseInt(char.hopeCur) || 0) - (g.startSnap.hope || 0);
    const shadowD = ((parseInt(char.shadow) || 0) + (parseInt(char.scars) || 0)) - (g.startSnap.shadow || 0);
    const parts = [`${foes.length} foe${foes.length !== 1 ? 's' : ''}${slain ? ` · ${slain} slain` : ''}`, `${e.round} round${e.round !== 1 ? 's' : ''}`];
    if (endLost > 0) parts.push(`−${endLost} End`);
    if (char.wounded) parts.push('Wounded');
    if (hopeD) parts.push(`${hopeD > 0 ? '+' : ''}${hopeD} Hope`);
    if (shadowD > 0) parts.push(`+${shadowD} Shadow`);
    g.summary = parts.join(' · ');
    g.ongoing = false;
  }
  journal.activeCombatId = null;
  saveJournal();
}
function toggleCombatGroup(id) { const g = (journal.combatGroups || []).find(x => x.id === id); if (!g) return; g.collapsed = !g.collapsed; saveJournal(); renderChronicleTimeline(); }
async function renameCombatGroup(id) {
  const g = (journal.combatGroups || []).find(x => x.id === id); if (!g) return;
  const t = await promptStyled('Name this combat:', g.title || '', 'Rename Combat');
  if (t === null) return;
  g.title = t.trim() || g.title; g.renamed = true; saveJournal(); renderChronicleTimeline();
}

// ----- logging -----
function encLogRoll(plain) {
  const clean = String(plain).replace(/<[^>]+>/g, '');
  history.unshift({ label: '⚔️ Combat', total: '', outcome: clean, tn: '', icons: 0, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
  if (history.length > 30) history.length = 30;
  saveHistory(); renderHistory();
  _encEnsureGroup();  // open/refresh the group BEFORE logging so the block carries its combatId
  if (typeof journalAuto === 'function') journalAuto('dice', 'roll', clean);
}
function _encStash(foeId, lineHtml, note) {
  const noteStr = note && note.length ? ` <span style="color:var(--text-faint)">[${note.join(' · ')}]</span>` : '';
  _encResults[foeId] = lineHtml + noteStr;
}

// ----- foe Protection roll (Feat + foe Armour dice vs weapon Injury) -----
function _foeProtectionRoll(foe, tn) {
  const dice = Math.max(0, parseInt(foe.armour) || 0);
  const feat = rollFeatOnce();
  let sum = 0, icons = 0;
  for (let i = 0; i < dice; i++) { const v = Math.floor(Math.random() * 6) + 1; if (v === 6) icons++; sum += v; }
  const isAutoSuccess = feat.special === 'rune';
  const featVal = feat.special === 'eye' ? 0 : (feat.special === 'rune' ? 0 : feat.value);
  const total = isAutoSuccess ? null : featVal + sum;
  const outcome = isAutoSuccess ? 'SUCCESS (Rune!)' : (total >= tn ? 'SUCCESS' : 'FAIL');
  return { total, outcome, isAutoSuccess, isAutoFail: false, icons };
}

// ----- HERO attacks a foe -----
async function heroAttackFoe(foeId) {
  const f = getFoe(foeId); if (!f || f.slain) return;
  const wpns = _equippedWeapons();
  if (!wpns.length) { alert('Equip a weapon in War Gear first.'); return; }
  const e = enc();
  const w = wpns[Math.min(e.weaponIdx || 0, wpns.length - 1)];
  const prof = w.prof;
  // Brawling (derived) and custom weapons with no known proficiency both use the Brawling rating.
  const profRating = (!prof || prof === 'Brawling') ? getBrawlingRating() : (parseInt((char.profs || {})[prof]) || 0);
  const a = e.adv;
  let dice = profRating, note = [];
  const isRanged = prof === 'Bows' || /bow/i.test(w.name);
  if (char.stance === 'forward') { dice += 1; note.push('Fwd +1d'); }
  else if (char.stance === 'defensive') { const foes = encEngagedFoes().length; dice = Math.max(0, dice - foes); if (foes) note.push(`Def −${foes}d`); }
  else if (char.stance === 'rearward' && !isRanged) { note.push('⚠ Rearward: melee cannot attack'); }
  else if (char.stance === 'skirmish') { if (isRanged) { dice = Math.max(0, dice - 1); note.push('Skirmish −1d'); } else { note.push('⚠ Skirmish: melee cannot attack'); } }
  let hopeSpent = false;
  if (a.hope && (parseInt(char.hopeCur) || 0) > 0) { dice += 1; note.push('Hope +1d'); hopeSpent = true; }
  dice = Math.max(0, dice + (parseInt(a.extra) || 0));
  if (a.fav === 'fav') note.push('Favoured'); else if (a.fav === 'ill') note.push('Ill-Favoured');
  const tn = (parseInt(char.strTN) || 0) + (parseInt(f.parry) || 0);
  const roll = _doInlineRoll(dice, a.fav, tn);
  const hit = roll.outcome.startsWith('SUCCESS');
  const piercing = hit && (roll.featSpecial === 'rune' || roll.featValue === 10 || (a.keen && roll.featValue >= 9));
  if (hopeSpent) char.hopeCur = Math.max(0, (parseInt(char.hopeCur) || 0) - 1);
  const score = roll.featSpecial === 'rune' ? '★' : (roll.featSpecial === 'eye' ? '✗' : roll.total);
  let line = `<strong>You</strong> · ${escapeHtml(w.name)} · ${score} vs TN ${tn} (${char.strTN} Str + Parry ${f.parry}) → ${roll.outcome}${roll.icons ? ` (${roll.icons}✦)` : ''}`;
  if (hit) {
    const dmg = parseInt(w.dmg) || 0;
    f.endCur = Math.max(0, (parseInt(f.endCur) || 0) - dmg);
    line += ` · −${dmg} End → ${f.endCur}/${f.endMax}`;
    if (f.endCur === 0) { f.slain = true; f.engaged = false; line += ` · ⚔ <strong>${escapeHtml(f.name)} slain!</strong>`; }
  } else { line += ` · miss`; }
  if (piercing && !f.slain && w.inj && w.inj !== '—') {
    const injTN = parseInt(w.inj) || 14;
    const P = _foeProtectionRoll(f, injTN);
    const pScore = P.isAutoSuccess ? '★' : P.total;
    if (P.outcome.startsWith('SUCCESS')) line += ` · Piercing Blow — foe Protection ${pScore} vs ${injTN} → resisted`;
    else if (f.wounded) { f.slain = true; f.engaged = false; line += ` · Piercing Blow — foe Protection ${pScore} vs ${injTN} → already Wounded → <strong>SLAIN!</strong>`; }
    else { f.wounded = true; line += ` · Piercing Blow — foe Protection ${pScore} vs ${injTN} → foe WOUNDED`; }
  }
  a.hope = false;
  _encStash(foeId, line, note);
  encDeriveEngaged(); saveCharacter(); encLogRoll(line);
  render(); renderEncounter();
}

// ----- a FOE attacks the hero (Piercing → your Protection → Wound) -----
async function foeAttackHero(foeId, attackIdx) {
  const f = getFoe(foeId); if (!f || f.slain) return;
  const atk = (f.attacks || [])[attackIdx] || (f.attacks || [])[0];
  if (!atk) return;
  // RAW (§7C-style fix, ported from the loremaster app): an adversary's attack TN against a
  // hero IS the hero's Parry (a full TN incl. shield) — NOT the foe's own atkTN added on top.
  // The foe's skill is its number of attack dice; the targeted hero's stance modifies the FOE's
  // dice as a ±Success die (Forward = easier to hit, +1d; Defensive = harder, −1d), per STANCE_INFO.
  const tn = (parseInt(char.parry) || 0) + (parseInt(char.shieldTotal) || 0);
  let atkDice = parseInt(atk.dice) || 0;
  let stanceNote = '';
  if (char.stance === 'forward') { atkDice += 1; stanceNote = ' · you Forward +1d'; }
  else if (char.stance === 'defensive') { atkDice = Math.max(0, atkDice - 1); stanceNote = ' · you Defensive −1d'; }
  const roll = _doInlineRoll(atkDice, 'normal', tn);
  const hit = roll.outcome.startsWith('SUCCESS');
  const piercing = hit && (roll.featSpecial === 'rune' || roll.featValue === 10);
  const score = roll.featSpecial === 'rune' ? '★' : (roll.featSpecial === 'eye' ? '✗' : roll.total);
  let line = `<strong>${escapeHtml(f.name)}</strong> · ${escapeHtml(atk.name)} · ${score} vs your Parry ${tn}${stanceNote} → `;
  if (hit) {
    const dmg = parseInt(atk.dmg) || 0;
    char.endCur = Math.max(0, (parseInt(char.endCur) || 0) - dmg);
    line += `HIT · −${dmg} End → ${char.endCur}/${char.endMax}`;
    if (char.endCur === 0) line += ' · ⚠ you are Dying';
    saveCharacter();
  } else { line += `miss`; }
  if (piercing && atk.inj && atk.inj !== '—' && parseInt(atk.inj) > 0) {
    const injTN = parseInt(atk.inj) || 14;
    if (await confirmStyled(`🗡️ <strong>Piercing Blow!</strong> ${escapeHtml(f.name)}'s ${escapeHtml(atk.name)} finds a gap.<br><br>Roll your Protection vs Injury <strong>${injTN}</strong>?`, 'Piercing Blow')) {
      const protDice = (parseInt(char.armourProt) || 0) + (parseInt(char.helmProt) || 0);
      const P = _protectionRoll(injTN, protDice);
      const pScore = P.isAutoSuccess ? '★' : (P.isAutoFail ? '✗' : P.total);
      if (P.outcome.startsWith('SUCCESS')) line += ` · Piercing Blow — Protection ${pScore} vs ${injTN} → resisted`;
      else { line += ` · Piercing Blow — Protection ${pScore} vs ${injTN} → WOUNDED`; const wr = await _applyWoundFromFail(); line += ` (${wr.label})`; }
    } else line += ` · Piercing Blow (resolve manually)`;
  }
  _encStash(foeId, line, []);
  saveCharacter(); encLogRoll(line);
  render(); renderEncounter();
}
async function allFoesAttack() {
  const foes = encEngagedFoes();
  if (!foes.length) { alert('No engaged foes.'); return; }
  for (const f of foes) { await foeAttackHero(f.id, 0); }
}

// ----- render -----
function renderEncounter() {
  const card = document.getElementById('encounter-card');
  if (!card) return;
  const e = enc();
  const shared = encShared(), canGm = encCanGm();
  const sharedBanner = shared ? `<p class="hint" style="text-align:left;margin:0 0 8px;border:1px solid var(--gold);border-radius:6px;padding:5px 8px">🏰 <b>Shared campaign encounter</b> — every member sees this fight live.${canGm ? ' You run it (Loremaster).' : ' The Loremaster runs the foes; roll your own attacks and defences.'}</p>` : '';
  if (!e.active && (!e.foes || e.foes.length === 0)) {
    card.innerHTML = sharedBanner + (canGm
      ? `<p class="hint" style="text-align:left;margin:0 0 8px">Key in adversaries, roll your attacks and theirs, and apply damage — all here. Works in solo or group play.</p>
      <button class="add-row-btn" onclick="openBestiary()" style="width:100%;background:var(--btn-alert-bg)">+ Add Adversary</button>`
      : `<p class="hint" style="text-align:center;padding:8px">No active encounter — waiting for the Loremaster to add adversaries.</p>`);
    return;
  }
  const wpns = _equippedWeapons();
  const wIdx = Math.min(e.weaponIdx || 0, Math.max(0, wpns.length - 1));
  const a = e.adv;
  let html = sharedBanner + `<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:8px">
      <strong style="font-size:14px">Round ${e.round}</strong>
      ${canGm ? `<button onclick="nextRound()" class="add-row-btn" style="font-size:11px;padding:3px 8px;background:var(--btn-secondary-bg);color:white">Next round ▸</button>` : ''}
      <span style="flex:1"></span>
      ${canGm ? `<button onclick="endEncounter()" class="add-row-btn" style="font-size:11px;padding:3px 8px;background:var(--btn-secondary-bg);color:white">End encounter</button>` : ''}
    </div>
    <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:12px;margin-bottom:6px">
      <span>Attack with:</span>
      <select onchange="setEncWeapon(this.value)" style="flex:1;min-width:130px;padding:4px;border:1px solid var(--border);border-radius:5px;background:var(--bg-deep);color:var(--ink)">
        ${wpns.length ? wpns.map((w, i) => `<option value="${i}" ${i === wIdx ? 'selected' : ''}>${escapeHtml(w.name)} (${w.dmg}/${w.inj}, ${w.prof || 'Brawling'})</option>`).join('') : '<option>— no weapon equipped —</option>'}
      </select>
      <button onclick="toggleEncAdv()" class="add-row-btn" style="font-size:11px;padding:3px 8px;background:${a.open ? 'var(--gold)' : 'var(--btn-secondary-bg)'};color:${a.open ? 'var(--ink)' : 'white'}">⚙ Advanced</button>
    </div>`;
  if (a.open) {
    html += `<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:12px;margin:0 0 8px;padding:6px;background:var(--bg-deep);border-radius:6px">
        <label><input type="checkbox" ${a.hope ? 'checked' : ''} onchange="setEncAdv('hope')"> Spend Hope (+1d)</label>
        <label>Roll <select onchange="setEncAdv('fav',this.value)" style="padding:2px 4px;border:1px solid var(--border);border-radius:4px;background:var(--bg);color:var(--ink)">
          <option value="normal" ${a.fav === 'normal' ? 'selected' : ''}>Normal</option>
          <option value="fav" ${a.fav === 'fav' ? 'selected' : ''}>Favoured</option>
          <option value="ill" ${a.fav === 'ill' ? 'selected' : ''}>Ill-Favoured</option>
        </select></label>
        <label>±dice <input type="number" value="${a.extra || 0}" onchange="setEncAdv('extra',this.value)" style="width:42px;padding:2px;border:1px solid var(--border);border-radius:4px;background:var(--bg);color:var(--ink)"></label>
        <label><input type="checkbox" ${a.keen ? 'checked' : ''} onchange="setEncAdv('keen')"> Keen (PB 9+)</label>
      </div>`;
  }
  if (encEngagedFoes().length > 1) html += `<button onclick="allFoesAttack()" class="add-row-btn" style="width:100%;margin-bottom:8px;background:var(--btn-alert-bg)">🗡️ All engaged foes attack</button>`;
  (e.foes || []).forEach(f => { html += _renderFoeCard(f, canGm); });
  if (canGm) html += `<button onclick="openBestiary()" class="add-row-btn" style="width:100%;margin-top:4px;background:var(--gold)">+ Add Adversary</button>`;
  card.innerHTML = html;
}
function _renderFoeCard(f, canGm = true) {
  const slain = f.slain;
  const step = (field, d, lbl) => canGm ? `<button onclick="adjFoe('${f.id}','${field}',${d})" style="width:24px;height:24px;border:1px solid var(--border);background:var(--card-bg);color:var(--ink);border-radius:4px;cursor:pointer">${lbl}</button>` : '';
  let h = `<div style="border:1px solid var(--border);border-radius:8px;padding:8px;margin-bottom:8px;${slain ? 'opacity:0.55' : ''}">
    <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
      <strong style="font-size:14px">${escapeHtml(f.name)}</strong>
      ${slain ? '<span class="result-tag tag-fail">SLAIN</span>' : (f.wounded ? '<span class="result-tag" style="background:var(--btn-warn-bg);color:white">WOUNDED</span>' : '')}
      <span style="font-size:10px;color:var(--text-faint)">${escapeHtml(f.source || '')}</span>
      <span style="flex:1"></span>
      ${canGm ? `<button onclick="toggleFoeEdit('${f.id}')" title="Edit stats" style="background:none;border:none;cursor:pointer;color:var(--text-faint)">✎</button>
      <button onclick="removeFoe('${f.id}')" title="Remove" style="background:none;border:none;cursor:pointer;color:var(--text-faint)">×</button>` : ''}
    </div>
    <div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;font-size:13px;margin-top:5px">
      <span>End <strong>${f.endCur}/${f.endMax}</strong></span>${step('endCur', -1, '−')}${step('endCur', 1, '+')}
      <span style="margin-left:6px">Hate <strong>${f.hateCur}/${f.hateMax}</strong></span>${step('hateCur', -1, '−')}${step('hateCur', 1, '+')}
      <span style="margin-left:6px;color:var(--text-muted)">Parry ${f.parry} · Armour ${f.armour}${f.might ? ` · Might ${f.might}` : ''}</span>
    </div>
    ${f.fell ? `<div style="font-size:11px;color:var(--text-muted);margin-top:3px">⚜ ${escapeHtml(f.fell)}</div>` : ''}`;
  if (!slain) {
    h += `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">
        <button onclick="heroAttackFoe('${f.id}')" class="add-row-btn" style="flex:1;min-width:110px;background:var(--gold)">⚔️ Attack</button>
        ${(f.attacks || []).map((atk, i) => `<button onclick="foeAttackHero('${f.id}',${i})" class="add-row-btn" style="flex:1;min-width:110px;background:var(--btn-alert-bg)">🗡️ ${escapeHtml(atk.name)} ${atk.dice}d</button>`).join('')}
      </div>`;
  }
  if (_encResults[f.id]) h += `<div style="font-size:12px;margin-top:6px;padding:6px;background:var(--bg-deep);border-radius:6px;line-height:1.45">${_encResults[f.id]}</div>`;
  if (f._edit && canGm) h += _renderFoeEdit(f);
  return h + `</div>`;
}
function _renderFoeEdit(f) {
  const inp = (field, val, w) => `<input value="${val}" onchange="setFoeField('${f.id}','${field}',this.value)" style="width:${w || 44}px;padding:2px 4px;border:1px solid var(--border);border-radius:4px;background:var(--bg-deep);color:var(--ink);font-size:12px">`;
  let h = `<div style="margin-top:8px;padding-top:6px;border-top:1px dashed var(--border);font-size:12px">
      <div style="margin-bottom:5px">Name ${inp('name', escapeHtml(f.name), 120)}</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
        End ${inp('endMax', f.endMax)} Might ${inp('might', f.might)} Hate ${inp('hateMax', f.hateMax)} Parry ${inp('parry', f.parry)} Armour ${inp('armour', f.armour)} atkTN ${inp('atkTN', f.atkTN)}
      </div>
      <div style="margin-top:5px">Fell ${inp('fell', escapeHtml(f.fell || ''), 210)}</div>
      <div style="margin-top:6px;font-weight:600">Attacks <button onclick="addFoeAttack('${f.id}')" style="font-size:11px;border:1px solid var(--border);border-radius:4px;background:var(--bg-deep);color:var(--ink);cursor:pointer">+ add</button></div>`;
  (f.attacks || []).forEach((atk, i) => {
    const ai = (field, val, w) => `<input value="${val}" onchange="setFoeAttack('${f.id}',${i},'${field}',this.value)" style="width:${w || 40}px;padding:2px 4px;border:1px solid var(--border);border-radius:4px;background:var(--bg-deep);color:var(--ink);font-size:12px">`;
    h += `<div style="display:flex;gap:4px;flex-wrap:wrap;align-items:center;margin-top:4px">
        ${ai('name', escapeHtml(atk.name), 86)} ${ai('dice', atk.dice, 32)}d Dmg ${ai('dmg', atk.dmg, 32)} Inj ${ai('inj', atk.inj, 32)} ${ai('special', escapeHtml(atk.special || ''), 78)}
        <button onclick="delFoeAttack('${f.id}',${i})" style="background:none;border:none;color:var(--text-faint);cursor:pointer">×</button>
      </div>`;
  });
  return h + `</div>`;
}

function renderQuickSkills() {
  const container = document.getElementById('quick-skills');
  if (!container) return;
  container.innerHTML = '';
  const all = [
    {name:'Valour', attr:'hrt', isMeta:true, ratingSrc:'valour'},
    {name:'Wisdom', attr:'wit', isMeta:true, ratingSrc:'wisdom'},
    ...SKILLS.str.map(s => ({name:s, attr:'str'})),
    ...SKILLS.hrt.map(s => ({name:s, attr:'hrt'})),
    ...SKILLS.wit.map(s => ({name:s, attr:'wit'})),
    ...COMBAT_PROFS.map(s => ({name:s, attr:'str', isProf: true})),
    // Brawling: derived prof (max(others) − 1) — RAW p.45. Shown when at least one other prof is rated.
    {name:'Brawling', attr:'str', isProf: true, isDerived: true}
  ];
  all.forEach(item => {
    let s;
    if (item.isMeta) s = { rating: parseInt(char[item.ratingSrc]) || 1, favoured: false };
    else if (item.isDerived && item.name === 'Brawling') s = { rating: getBrawlingRating(), favoured: false };
    else if (item.isProf) s = { rating: char.profs[item.name] || 0, favoured: false };
    else s = char.skills[item.name] || { rating: 0, favoured: false };

    if (!item.isMeta && s.rating === 0 && !s.favoured) return;  // hide empty skills/profs (always show Valour/Wisdom)

    // Auto-favoured indicator from Cultural Blessing
    let blessingFav = false;
    if (item.isMeta) {
      if (item.name === 'Valour' && char.culture === 'Bardings') blessingFav = true;
      if (item.name === 'Wisdom' && char.culture === 'Hobbits of the Shire') blessingFav = true;
    }

    const btn = document.createElement('div');
    btn.className = 'quick-skill' + (s.favoured || blessingFav ? ' fav' : '');
    if (item.isMeta) btn.style.background = 'var(--gold-soft)';
    if (item.isDerived) btn.title = 'Brawling: derived from your highest combat prof, minus 1 (RAW p.45). Use for Unarmed/Dagger/Cudgel/Club.';
    const star = blessingFav ? ' ★' : '';
    const derivedTag = item.isDerived ? ' <small style="color:var(--text-faint);font-size:9px">(der)</small>' : '';
    btn.innerHTML = `${item.name}${star}${derivedTag}<br><span class="rating">${s.rating}d · ${item.attr.toUpperCase()}</span>`;
    btn.onclick = () => quickRoll(item, s);
    container.appendChild(btn);
  });
  if (container.children.length === 0) {
    container.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:var(--text-faint);font-size:12px;padding:10px">Set skill ratings to see quick-roll buttons</div>';
  }
}

/* ---------- LOAD AUTO-COMPUTE ---------- */
function recomputeLoad() {
  const armour = parseInt(char.armourLoad) || 0;
  const helm = parseInt(char.helmLoad) || 0;
  const shield = parseInt(char.shieldLoad) || 0;
  const weapons = (char.weapons || []).reduce((sum, w) => sum + (parseInt(w.load) || 0), 0);
  const treasure = parseInt(char.treasure) || 0;
  const other = parseInt(char.otherLoad) || 0;
  char.load = armour + helm + shield + weapons + treasure + other;

  // Update breakdown hint
  const bd = document.getElementById('load-breakdown');
  if (bd) {
    const parts = [];
    if (armour) parts.push(`Arm ${armour}`);
    if (helm) parts.push(`Hlm ${helm}`);
    if (shield) parts.push(`Shd ${shield}`);
    if (weapons) parts.push(`Wpn ${weapons}`);
    if (treasure) parts.push(`Trs ${treasure}`);
    if (other) parts.push(`Oth ${other}`);
    bd.textContent = parts.length ? parts.join(' · ') : 'auto';
  }
}

/* ---------- VIRTUE BONUS ---------- */
function adjVirtueBonus(type, delta) {
  const vField = type === 'end' ? 'endBonusVirtue' : 'hopeBonusVirtue';
  const maxField = type === 'end' ? 'endMax' : 'hopeMax';
  const curField = type === 'end' ? 'endCur' : 'hopeCur';
  const wasAtMax = (parseInt(char[curField]) || 0) === (parseInt(char[maxField]) || 0);

  const newVirtue = (parseInt(char[vField]) || 0) + delta;
  if (newVirtue < 0) return;  // clamp at 0 — no negative virtue bonuses
  char[vField] = newVirtue;
  char[maxField] = Math.max(0, (parseInt(char[maxField]) || 0) + delta);

  if (wasAtMax) char[curField] = char[maxField];
  if ((parseInt(char[curField]) || 0) > char[maxField]) char[curField] = char[maxField];

  // Shadow cannot exceed new Hope Max
  if (type === 'hope' && (parseInt(char.shadow) || 0) > char.hopeMax) char.shadow = char.hopeMax;

  saveCharacter();
  render();
}

/* ---------- COUNTERS ---------- */
// SoL thresholds per Core Rules p.73
const SOL_THRESHOLDS = [
  { sol: 'Common', treasure: 30 },
  { sol: 'Prosperous', treasure: 90 },
  { sol: 'Rich', treasure: 180 },
  { sol: 'Very Rich', treasure: 300 }
];
const SOL_RANK = { 'Poor': 0, 'Frugal': 1, 'Common': 2, 'Prosperous': 3, 'Rich': 4, 'Very Rich': 5 };

function adj(field, delta) {
  snapshot();   // undo support
  let v = Math.max(0, (parseInt(char[field]) || 0) + delta);

  // Upper caps tied to max values
  if (field === 'endCur') v = Math.min(v, parseInt(char.endMax) || 0);
  if (field === 'hopeCur') v = Math.min(v, parseInt(char.hopeMax) || 0);
  // Per RAW: Scars count as Shadow → shadow + scars ≤ hopeMax
  if (field === 'shadow')  v = Math.min(v, Math.max(0, (parseInt(char.hopeMax) || 0) - (parseInt(char.scars) || 0)));
  if (field === 'scars')   v = Math.min(v, Math.max(0, (parseInt(char.hopeMax) || 0) - (parseInt(char.shadow) || 0)));

  const prevValue = parseInt(char[field]) || 0;
  char[field] = v;

  // Solo modes (Strider / Moria): Shadow gain outside combat raises Eye Awareness by the same
  // amount (RAW supplement). Best-effort — the player can manually decrement EA if the gain was
  // from combat. Skipped on negative delta (Shadow recovery doesn't lower EA — different event).
  if (field === 'shadow' && isSolo() && delta > 0) {
    const actualDelta = v - prevValue;  // capped at hopeMax−scars
    if (actualDelta > 0) {
      char.eyeAwareness = (parseInt(char.eyeAwareness) || 0) + actualDelta;
    }
  }

  // Chronicle status beats: Shadow / Scar gains.
  if (typeof journalAuto === 'function' && v !== prevValue) {
    if (field === 'shadow' && v > prevValue) journalAuto('status', 'status', `Gained ${v - prevValue} Shadow (now ${v}).`);
    else if (field === 'scars' && v > prevValue) journalAuto('status', 'status', `Took a Shadow Scar (now ${v}).`);
  }
  // U15 campaign timeline beats (all modes).
  if (typeof logTimeline === 'function' && v > prevValue) {
    if (field === 'shadow') logTimeline('shadow', `Gained ${v - prevValue} Shadow (now ${v}).`);
    else if (field === 'scars') logTimeline('scars', `Took a Shadow Scar (now ${v}).`);
    else if (field === 'valour') logTimeline('rank', `Valour raised to ${v}.`);
    else if (field === 'wisdom') logTimeline('rank', `Wisdom raised to ${v}.`);
  }

  // If a Max was reduced below its Current, snap Current down
  if (field === 'endMax' && (parseInt(char.endCur) || 0) > v) char.endCur = v;
  if (field === 'hopeMax') {
    if ((parseInt(char.hopeCur) || 0) > v) char.hopeCur = v;
    const totalShadow = (parseInt(char.shadow) || 0) + (parseInt(char.scars) || 0);
    if (totalShadow > v) {
      // Trim shadow first, then scars if still over
      const overflow = totalShadow - v;
      const shadowReduce = Math.min(overflow, parseInt(char.shadow) || 0);
      char.shadow = (parseInt(char.shadow) || 0) - shadowReduce;
      const remaining = overflow - shadowReduce;
      if (remaining > 0) char.scars = (parseInt(char.scars) || 0) - remaining;
    }
  }

  // Standard of Living auto-promote on Treasure threshold crossing (Core Rules p.73).
  // Only triggers when Treasure goes UP and a threshold is newly crossed.
  // We never auto-downgrade — that'd punish the player.
  if (field === 'treasure' && v > prevValue) {
    const curRank = SOL_RANK[char.standard] !== undefined ? SOL_RANK[char.standard] : 1;
    for (const tier of SOL_THRESHOLDS) {
      if (v >= tier.treasure && prevValue < tier.treasure && SOL_RANK[tier.sol] > curRank) {
        // Crossed this threshold upward and current SoL is below it
        setTimeout(async () => {
          if (await confirmStyled(`💰 Treasure (${v}) crossed ${tier.sol}'s threshold (${tier.treasure}).\n\nPromote your Standard of Living from ${char.standard || '(none)'} to ${tier.sol}?`)) {
            char.standard = tier.sol;
            saveCharacter();
            render();
          }
        }, 50);
        break;  // only one prompt per adjustment
      }
    }
  }

  saveCharacter();
  render();
}

/* ---------- INPUT BINDING ---------- */
function bindInputs() {
  document.querySelectorAll('[data-field]').forEach(el => {
    el.addEventListener('input', () => {
      const k = el.dataset.field;
      if (el.type === 'checkbox') char[k] = el.checked;
      else if (el.type === 'number') char[k] = el.value === '' ? '' : parseFloat(el.value);
      else char[k] = el.value;

      // Auto-derive Endurance Max / Hope Max / Parry when rating changes (if culture set)
      // Skip if field is empty (user mid-edit) to avoid transient zero values
      if (k === 'strRating' && char.endBonus && char.strRating !== '') {
        const newMax = parseInt(char.strRating) + char.endBonus + (parseInt(char.endBonusVirtue) || 0);
        if (char.endCur === char.endMax) char.endCur = newMax;
        char.endMax = newMax;
        if (char.endCur > newMax) char.endCur = newMax;
      }
      if (k === 'hrtRating' && char.hopeBonus && char.hrtRating !== '') {
        const newMax = parseInt(char.hrtRating) + char.hopeBonus + (parseInt(char.hopeBonusVirtue) || 0) + (parseInt(char.moriaHopeBonus) || 0);
        if (char.hopeCur === char.hopeMax) char.hopeCur = newMax;
        char.hopeMax = newMax;
        if (char.hopeCur > newMax) char.hopeCur = newMax;
        if (char.shadow > newMax) char.shadow = newMax;
      }
      if (k === 'witRating' && char.parryBonus && char.witRating !== '') {
        char.parry = parseInt(char.witRating) + char.parryBonus + (parseInt(char.parryBonusVirtue) || 0);
      }
      // Auto-update TN when rating changes
      if (k === 'strRating' && char.strRating !== '') char.strTN = (char.striderMode ? 18 : 20) - parseInt(char.strRating);
      if (k === 'hrtRating' && char.hrtRating !== '') char.hrtTN = (char.striderMode ? 18 : 20) - parseInt(char.hrtRating);
      if (k === 'witRating' && char.witRating !== '') char.witTN = (char.striderMode ? 18 : 20) - parseInt(char.witRating);

      saveCharacter();
      if (k.endsWith('Prot') || k.endsWith('Total')) renderProtectionParry();
      if (k.endsWith('Rating')) {
        // Lightweight update — avoid full render() rebuild on every keystroke
        setText('end-max-v', char.endMax);
        setText('hope-max-v', char.hopeMax);
        setText('end-cur-v', char.endCur);
        setText('hope-cur-v', char.hopeCur);
        renderDerivedStats();
        renderProtectionParry();
        renderConditionWarnings();
        checkAutoTriggers();
      } else {
        renderConditionWarnings();
        checkAutoTriggers();
      }
    });
  });

  document.querySelectorAll('[data-stance]').forEach(btn => {
    btn.onclick = () => {
      const s = btn.dataset.stance;
      char.stance = (char.stance === s) ? '' : s;  // tap again to clear
      saveCharacter();
      renderStance();
    };
  });

  document.querySelectorAll('[data-cond]').forEach(btn => {
    btn.onclick = async () => {
      const c = btn.dataset.cond;
      snapshot();   // undo support
      const wasOff = !char[c];
      char[c] = !char[c];

      // Wound severity prompt on first wound
      if (c === 'wounded' && wasOff) {
        if (await confirmStyled('Roll Wound Severity now?')) {
          const result = rollWoundSeverity();
          char.injury = `${result.label} — ${result.detail}`;
          char.injuryDays = result.days;
          char.firstAidUsed = false;  // new injury → First Aid available
          alert(`Wound Severity:\n\n${result.label}\n${result.detail}`);
        }
      }
      // Wounded toggled OFF → clear injury tracking
      if (c === 'wounded' && !char.wounded) {
        char.injuryDays = 0;
        char.firstAidUsed = false;
      }

      if (typeof journalAuto === 'function') {
        const cl = { weary: 'Weary', miserable: 'Miserable', wounded: 'Wounded' }[c] || c;
        journalAuto('status', 'status', char[c] ? `Became ${cl}.` : `No longer ${cl}.`);
      }

      saveCharacter();
      render();
    };
  });
}

/* ---------- USEFUL ITEMS PICKER ---------- */
function renderUsefulItemsPicker() {
  const list = document.getElementById('useful-items-list');
  const budgetEl = document.getElementById('useful-items-budget');
  if (!list || !budgetEl) return;

  const allowed = SOL_USEFUL_ITEM_COUNT[char.standard] !== undefined ? SOL_USEFUL_ITEM_COUNT[char.standard] : 0;
  if (!Array.isArray(char.usefulItems)) char.usefulItems = [];
  const picked = char.usefulItems;

  budgetEl.innerHTML = `Standard of Living: <strong>${char.standard || '— set on Character tab —'}</strong> · Allowed: <strong>${allowed}</strong> · Picked: <strong>${picked.length}/${allowed}</strong>`;

  list.innerHTML = '';
  USEFUL_ITEMS.forEach(item => {
    const isOn = picked.includes(item.name);
    const disabled = !isOn && picked.length >= allowed;
    const skillTag = item.skillAlt ? `${item.skill} or ${item.skillAlt}` : item.skill;
    const row = document.createElement('div');
    row.style.cssText = `display:flex;align-items:flex-start;gap:10px;padding:10px;cursor:${disabled?'not-allowed':'pointer'};border:1px solid ${isOn?'var(--red)':'var(--border)'};border-radius:6px;margin-bottom:6px;background:${isOn?'var(--gold-soft)':disabled?'var(--bg-deep)':'var(--pure-white)'};opacity:${disabled?0.5:1}`;
    row.innerHTML = `
      <div class="fav-check ${isOn ? 'checked' : ''}" style="flex-shrink:0;margin-top:2px"></div>
      <div style="flex:1">
        <strong>${item.name}</strong> <span style="color:var(--red);font-size:11px;font-weight:600">+1d ${skillTag}</span><br>
        <small style="color:var(--text-muted);font-size:12px">${item.desc}</small>
      </div>
    `;
    if (!disabled) row.onclick = () => toggleUsefulItem(item.name);
    list.appendChild(row);
  });
}

function toggleUsefulItem(name) {
  if (!Array.isArray(char.usefulItems)) char.usefulItems = [];
  const idx = char.usefulItems.indexOf(name);
  if (idx >= 0) {
    char.usefulItems.splice(idx, 1);
  } else {
    const allowed = SOL_USEFUL_ITEM_COUNT[char.standard] || 0;
    if (char.usefulItems.length >= allowed) {
      alert(`Standard of Living "${char.standard || 'none'}" allows only ${allowed} Useful Items.`);
      return;
    }
    char.usefulItems.push(name);
  }
  saveCharacter();
  render();
}

function renderUsefulItemsDisplay() {
  const div = document.getElementById('useful-items-display');
  if (!div) return;
  const owned = Array.isArray(char.usefulItems) ? char.usefulItems : [];
  if (owned.length === 0) {
    div.innerHTML = '<p style="color:var(--text-faint);font-size:12px;text-align:center;padding:10px">No Useful Items picked yet. Pick some on the Build tab.</p>';
    return;
  }
  div.innerHTML = owned.map(entry => {
    const isObj = entry && typeof entry === 'object';
    const item = isObj ? entry : USEFUL_ITEMS.find(x => x.name === entry);
    if (!item) return '';
    const skillTag = item.skillAlt ? `${item.skill} or ${item.skillAlt}` : (item.skill || '');
    return `<div style="padding:10px;border:1px solid var(--border);border-radius:6px;margin-bottom:6px;background:var(--gold-soft)">
      <strong>${escapeHtml(item.name)}</strong> ${skillTag ? `<span style="color:var(--red);font-size:11px;font-weight:600">+1d ${skillTag}</span>` : ''}<br>
      <small style="color:var(--text-muted);font-size:12px">${escapeHtml(item.desc || '')}</small>
    </div>`;
  }).join('');
}

// Returns useful item matching the skill (or null). Supports catalog-name strings AND custom
// item objects ({name, skill, skillAlt?, desc?}) used by pre-generated heroes.
function getUsefulItemForSkill(skillName) {
  if (!Array.isArray(char.usefulItems) || !skillName) return null;
  for (const e of char.usefulItems) {
    if (e && typeof e === 'object') { if (e.skill === skillName || e.skillAlt === skillName) return e; }
    else { const it = USEFUL_ITEMS.find(x => x.name === e); if (it && (it.skill === skillName || it.skillAlt === skillName)) return it; }
  }
  return null;
}

/* ---------- LIFEPATHS (Character Lifepaths supplement) ---------- */
function renderLifepathCard() {
  const card = document.getElementById('lifepath-card');
  if (!card) return;
  card.style.display = 'block';

  // Determine whether rollers are enabled based on culture
  const disabledHint = document.getElementById('lifepath-disabled-hint');
  const rollers = document.getElementById('lifepath-rollers');
  if (!char.culture) {
    disabledHint.style.display = 'block';
    disabledHint.innerHTML = '🛈 Pick a <strong>Culture</strong> above (Quick Build) to enable Lifepath rolls.';
    rollers.style.display = 'none';
    return;
  }
  if (!LIFEPATHS[char.culture]) {
    disabledHint.style.display = 'block';
    disabledHint.innerHTML = `🛈 The <em>Character Lifepaths</em> supplement only covers the 6 Core Rules cultures. <strong>${char.culture}</strong> doesn't have lifepath data. Major Events still apply, though:`;
    rollers.style.display = 'block';
    // Hide the backstory section for Wilderland cultures
    const backstoryRow = rollers.querySelector('div[style*="margin-bottom:14px"]');
    if (backstoryRow) backstoryRow.style.display = 'none';
    return;
  }
  // Core Rules culture — full rollers visible
  disabledHint.style.display = 'none';
  rollers.style.display = 'block';
  const backstoryRow = rollers.querySelector('div[style*="margin-bottom:14px"]');
  if (backstoryRow) backstoryRow.style.display = 'block';

  // Render existing backstory result if present
  if (char.backstoryName) {
    const lp = LIFEPATHS[char.culture]?.find(x => x.die === char.backstoryDie);
    const div = document.getElementById('backstory-result');
    if (lp && div) {
      div.style.display = 'block';
      div.innerHTML = `
        <strong style="color:var(--red-dark)">Die ${lp.die}: ${lp.name}</strong><br>
        <em style="color:var(--text-muted)">${lp.story}</em><br><br>
        <strong>Suggested:</strong> Str ${lp.attrs.str} · Hrt ${lp.attrs.hrt} · Wit ${lp.attrs.wit}<br>
        <strong>Favoured skill:</strong> ${lp.favouredSkill}<br>
        <strong>Distinctive features:</strong> ${lp.features.join(', ')}<br>
        <button class="add-row-btn" onclick="applyBackstory(${lp.die})" style="padding:6px 12px;font-size:12px;margin-top:8px">✓ Apply Suggested Stats</button>
      `;
    }
  } else {
    const div = document.getElementById('backstory-result');
    if (div) div.style.display = 'none';
  }

  // Render existing major event if present
  if (char.majorEventName) {
    const me = MAJOR_EVENTS.find(e => String(e.die) === String(char.majorEventDie));
    const div = document.getElementById('major-event-result');
    if (me && div) {
      div.style.display = 'block';
      div.innerHTML = `
        <strong style="color:var(--red-dark)">Feat die ${me.die === 'eye' ? '👁' : me.die === 'rune' ? 'ᚱ' : me.die}: ...${me.name}</strong><br>
        <em style="color:var(--text-muted)">${me.short}</em><br>
        <button class="add-row-btn" onclick="applyMajorEvent('${me.die}')" style="padding:6px 12px;font-size:12px;margin-top:8px">✓ Apply Effects</button>
      `;
    }
  } else {
    const div = document.getElementById('major-event-result');
    if (div) div.style.display = 'none';
  }
}

function rollBackstory() {
  if (!char.culture || !LIFEPATHS[char.culture]) {
    alert('Pick a Core Rules culture first. (Wilderland supplement cultures don\'t have lifepaths.)');
    return;
  }
  const die = Math.floor(Math.random() * 6) + 1;
  const lp = LIFEPATHS[char.culture][die - 1];
  char.backstoryDie = die;
  char.backstoryName = lp.name;
  char.backstoryStory = lp.story;
  saveCharacter();
  renderLifepathCard();
}

async function applyBackstory(die) {
  const lp = LIFEPATHS[char.culture]?.find(x => x.die === die);
  if (!lp) return;
  if (!await confirmStyled(`Apply "${lp.name}" lifepath?\n\nThis overwrites:\n• Attributes (Str ${lp.attrs.str} / Hrt ${lp.attrs.hrt} / Wit ${lp.attrs.wit})\n• Culture Favoured (${lp.favouredSkill})\n• Distinctive Features (${lp.features.join(', ')})\n• History (backstory text added)`)) return;

  char.strRating = lp.attrs.str; char.strTN = (char.striderMode ? 18 : 20) - lp.attrs.str;
  char.hrtRating = lp.attrs.hrt; char.hrtTN = (char.striderMode ? 18 : 20) - lp.attrs.hrt;
  char.witRating = lp.attrs.wit; char.witTN = (char.striderMode ? 18 : 20) - lp.attrs.wit;

  const c = CULTURES[char.culture];
  if (c.endBonus) {
    char.endMax = lp.attrs.str + c.endBonus + (parseInt(char.endBonusVirtue) || 0);
    char.endCur = char.endMax;
  }
  if (c.hopeBonus) {
    char.hopeMax = lp.attrs.hrt + c.hopeBonus + (parseInt(char.hopeBonusVirtue) || 0);
    char.hopeCur = char.hopeMax;
  }
  if (c.parryBonus) {
    char.parry = lp.attrs.wit + c.parryBonus + (parseInt(char.parryBonusVirtue) || 0);
  }

  char.cultureFavoured = lp.favouredSkill;
  char.featuresPicked = lp.features.slice();
  refreshFavoured();
  rebuildFeaturesText();

  // Append story to History (preserve any existing notes)
  const header = `[Lifepath ${die}: ${lp.name}]\n${lp.story}`;
  if (!char.history || !char.history.includes(header)) {
    char.history = header + (char.history ? '\n\n' + char.history : '');
  }

  saveCharacter();
  render();
  alert(`Applied "${lp.name}".`);
}

function rollMajorEvent() {
  // Roll Feat die: 1-10 normal, 11=Rune, 12=Eye (matching rollFeatOnce semantics)
  const r = Math.floor(Math.random() * 12) + 1;
  let die;
  if (r === 11) die = 'eye';
  else if (r === 12) die = 'rune';
  else die = r;
  const me = MAJOR_EVENTS.find(e => String(e.die) === String(die));
  if (!me) return;
  char.majorEventDie = die;
  char.majorEventName = me.name;
  char.majorEventText = me.short;
  saveCharacter();
  renderLifepathCard();
}

async function applyMajorEvent(die) {
  const me = MAJOR_EVENTS.find(e => String(e.die) === String(die));
  if (!me) return;
  if (!await confirmStyled(`Apply major event "...${me.name}"?\n\nEffect: ${me.short}\n\nSome effects may require you to make choices (e.g. which Attribute TN to lower).`)) return;

  // Apply each effect token
  for (const e of me.effects) {
    if (e === 'scars+1') char.scars = (parseInt(char.scars) || 0) + 1;
    else if (e === 'pe+10') char.peSpent = Math.max(0, (parseInt(char.peSpent) || 0) - 10);  // grants 10 extra PE = reduces spent
    else if (e === 'pe+5') char.peSpent = Math.max(0, (parseInt(char.peSpent) || 0) - 5);
    else if (e === 'pe-5') char.peSpent = (parseInt(char.peSpent) || 0) + 5;
    else if (e === 'sol-1' || e === 'sol+1') {
      const tiers = ['Poor','Frugal','Common','Prosperous','Rich','Very Rich'];
      const cur = tiers.indexOf(char.standard);
      const delta = (e === 'sol+1') ? 1 : -1;
      const idx = Math.max(0, Math.min(tiers.length - 1, (cur < 0 ? 2 : cur) + delta));
      char.standard = tiers[idx];
    }
    else if (e === 'witTN+1') char.witTN = (parseInt(char.witTN) || 0) + 1;
    else if (e === 'hrtTN+1') char.hrtTN = (parseInt(char.hrtTN) || 0) + 1;
    else if (e === 'strTN+1') char.strTN = (parseInt(char.strTN) || 0) + 1;
    else if (e === 'attrTN-1') {
      const which = await promptStyled('Lower which Attribute TN by 1? Type "str", "hrt", or "wit":', 'str');
      if (which && ['str','hrt','wit'].includes(which.toLowerCase())) {
        const k = which.toLowerCase() + 'TN';
        char[k] = Math.max(1, (parseInt(char[k]) || 0) - 1);
      }
    }
    else if (e === 'fellow-1') char.fellowshipRating = Math.max(0, (parseInt(char.fellowshipRating) || 0) - 1);
    else if (e === 'fellow+1') char.fellowshipRating = (parseInt(char.fellowshipRating) || 0) + 1;
    else if (e === 'fav+1') alert('Mark an additional Skill as Favoured manually via Build tab → Favoured Skills picker or Skills tab Edit Mode.');
    else if (e === 'fav-1') alert('Choose one Favoured Skill to un-mark manually via Build tab → Favoured Skills picker.');
    else if (e === 'fav-2') alert('Choose TWO Favoured Skills to un-mark manually via Build tab → Favoured Skills picker.');
    else if (e === 'end-2') {
      char.endMax = Math.max(0, (parseInt(char.endMax) || 0) - 2);
      if (char.endCur > char.endMax) char.endCur = char.endMax;
    }
    else if (e === 'end+2') {
      char.endMax = (parseInt(char.endMax) || 0) + 2;
      char.endCur = (parseInt(char.endCur) || 0) + 2;
    }
    else if (e === 'parry+1') char.parry = (parseInt(char.parry) || 0) + 1;
    else if (e === 'parry-1') char.parry = Math.max(0, (parseInt(char.parry) || 0) - 1);
    else if (e === 'hope+2') {
      char.hopeMax = (parseInt(char.hopeMax) || 0) + 2;
      char.hopeCur = (parseInt(char.hopeCur) || 0) + 2;
    }
    else if (e === 'greyWizard') char.greyWizard = true;
    else if (e === 'eyeAwareness+2') {
      // Eye Awareness is LM-side; just note in history
    }
  }

  // Append to history
  const header = `[Major Event: ...${me.name}]\n${me.short}`;
  if (!char.history || !char.history.includes(header)) {
    char.history = (char.history ? char.history + '\n\n' : '') + header;
  }

  saveCharacter();
  render();
  alert('Major event applied. Review your character for any manual follow-ups (Favoured skills, etc.)');
}

/* ---------- COMBAT PROFICIENCY CHOICES (creation) ---------- */
function renderCombatProfsPicker() {
  const card = document.getElementById('combat-profs-card');
  if (!card) return;
  if (!char.culture || !CULTURES[char.culture]) {
    card.style.display = 'none';
    return;
  }
  card.style.display = 'block';

  const c = CULTURES[char.culture];
  const primaryOpts = c.profPrimary;  // e.g. ['Bows', 'Swords']
  const primary = char.primaryProfChoice || primaryOpts[0];
  const secondary = char.secondaryProfChoice || COMBAT_PROFS.find(p => !primaryOpts.includes(p));

  let html = `
    <div style="margin-bottom:14px">
      <strong style="color:var(--red-dark);font-size:13px">Rank 2 — pick 1 of: ${primaryOpts.join(' OR ')}</strong>
      <div style="display:flex;gap:8px;margin-top:6px">
        ${primaryOpts.map(p => {
          const isOn = primary === p;
          return `<button onclick="setCombatProfs('${p}', '${secondary}')" style="flex:1;padding:10px;border:1px solid ${isOn?'var(--red)':'var(--border)'};background:${isOn?'var(--gold-soft)':'var(--pure-white)'};border-radius:6px;cursor:pointer;font-weight:${isOn?700:400}">${p} ◆◆${isOn?' ✓':''}</button>`;
        }).join('')}
      </div>
    </div>
    <div>
      <strong style="color:var(--red-dark);font-size:13px">+1 — choose any Combat Proficiency</strong>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:6px">
        ${COMBAT_PROFS.map(p => {
          const isOn = secondary === p;
          const stackNote = (p === primary) ? ' <small style="color:var(--text-faint)">(stacks → ◆◆◆)</small>' : '';
          return `<button onclick="setCombatProfs('${primary}', '${p}')" style="padding:10px;border:1px solid ${isOn?'var(--red)':'var(--border)'};background:${isOn?'var(--gold-soft)':'var(--pure-white)'};border-radius:6px;cursor:pointer;font-weight:${isOn?700:400}">${p} ◆${isOn?' ✓':''}${stackNote}</button>`;
        }).join('')}
      </div>
    </div>
  `;
  document.getElementById('combat-profs-picker').innerHTML = html;
}

function setCombatProfs(primary, secondary) {
  // Capture PE delta (current minus baseline) to preserve PE upgrades
  const deltas = {};
  COMBAT_PROFS.forEach(p => {
    deltas[p] = (parseInt(char.profs[p]) || 0) - (parseInt(char.profsBaseline?.[p]) || 0);
  });
  // Build new baseline
  const newBaseline = {};
  COMBAT_PROFS.forEach(p => newBaseline[p] = 0);
  newBaseline[primary] = (newBaseline[primary] || 0) + 2;
  newBaseline[secondary] = (newBaseline[secondary] || 0) + 1;  // stacks if same prof
  // Apply baseline + deltas
  COMBAT_PROFS.forEach(p => {
    char.profs[p] = newBaseline[p] + (deltas[p] || 0);
  });
  char.profsBaseline = newBaseline;
  char.primaryProfChoice = primary;
  char.secondaryProfChoice = secondary;
  saveCharacter();
  render();
}

/* ---------- PREVIOUS EXPERIENCE (creation-time XP) ---------- */
function renderPECard() {
  const card = document.getElementById('pe-card');
  if (!card) return;
  if (!char.culture || Object.keys(char.skillsBaseline || {}).length === 0) {
    card.style.display = 'none';
    return;
  }
  card.style.display = 'block';

  const spent = parseInt(char.peSpent) || 0;
  const budget = getPEBudget();
  const remaining = budget - spent;
  const budgetEl = document.getElementById('pe-budget');
  budgetEl.innerHTML = `Budget: <span style="color:${remaining<0?'var(--red)':'var(--red-dark)'}">${remaining} / ${budget}</span> remaining · Spent ${spent}`;

  const list = document.getElementById('pe-list');
  list.innerHTML = '';

  const makeRow = (name, kind) => {
    const cur = kind === 'skill' ? (char.skills[name]?.rating || 0) : (char.profs[name] || 0);
    const base = kind === 'skill' ? (char.skillsBaseline?.[name] || 0) : (char.profsBaseline?.[name] || 0);
    const cap = kind === 'skill' ? 4 : 3;
    const costs = kind === 'skill' ? SKILL_PE_COST : PROF_PE_COST;
    const nextCost = cur < cap ? costs[cur + 1] : null;
    const canPlus = nextCost !== null && nextCost > 0 && (remaining >= nextCost);
    const canMinus = cur > base;
    const refundCost = cur > 0 ? costs[cur] : 0;

    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:6px;padding:6px 8px;border-bottom:1px solid rgba(0,0,0,0.05)';
    row.innerHTML = `
      <div style="flex:1;font-size:13px"><strong>${name}</strong></div>
      <button onclick="adjPE('${kind}','${name}',-1)" ${canMinus?'':'disabled'} style="width:28px;height:28px;border:1px solid var(--red);background:${canMinus?'var(--pure-white)':'var(--bg-deep)'};color:${canMinus?'var(--red)':'var(--text-faint)'};border-radius:4px;font-weight:700;cursor:${canMinus?'pointer':'not-allowed'}">−</button>
      <span style="min-width:50px;text-align:center;font-size:13px;color:var(--red-dark)">${'◆'.repeat(cur) || '—'}</span>
      <button onclick="adjPE('${kind}','${name}',1)" ${canPlus?'':'disabled'} style="width:28px;height:28px;border:1px solid var(--red);background:${canPlus?'var(--pure-white)':'var(--bg-deep)'};color:${canPlus?'var(--red)':'var(--text-faint)'};border-radius:4px;font-weight:700;cursor:${canPlus?'pointer':'not-allowed'}">+</button>
      <span style="min-width:42px;font-size:10px;color:var(--text-faint);text-align:right">${nextCost ? `${nextCost}pt` : 'MAX'}</span>
    `;
    list.appendChild(row);
  };

  const header = (text) => {
    const h = document.createElement('div');
    h.style.cssText = 'font-size:11px;color:var(--red);text-transform:uppercase;letter-spacing:1px;font-weight:700;padding:10px 2px 4px';
    h.textContent = text;
    list.appendChild(h);
  };

  header('Strength Skills');
  SKILLS.str.forEach(s => makeRow(s, 'skill'));
  header('Heart Skills');
  SKILLS.hrt.forEach(s => makeRow(s, 'skill'));
  header('Wits Skills');
  SKILLS.wit.forEach(s => makeRow(s, 'skill'));
  header('Combat Proficiencies');
  COMBAT_PROFS.forEach(p => makeRow(p, 'prof'));
}

function adjPE(kind, name, delta) {
  const cur = kind === 'skill' ? (char.skills[name]?.rating || 0) : (char.profs[name] || 0);
  const base = kind === 'skill' ? (char.skillsBaseline?.[name] || 0) : (char.profsBaseline?.[name] || 0);
  const cap = kind === 'skill' ? 4 : 3;
  const costs = kind === 'skill' ? SKILL_PE_COST : PROF_PE_COST;
  const spent = parseInt(char.peSpent) || 0;

  if (delta > 0) {
    const newRank = cur + 1;
    if (newRank > cap) return;
    const cost = costs[newRank];
    if (cost === 0) return;
    if (spent + cost > getPEBudget()) {
      alert(`Need ${cost} PE; only ${getPEBudget() - spent} remaining.`);
      return;
    }
    if (kind === 'skill') {
      if (!char.skills[name]) char.skills[name] = { rating: 0, favoured: false };
      char.skills[name].rating = newRank;
    } else {
      char.profs[name] = newRank;
    }
    char.peSpent = spent + cost;
  } else {
    if (cur <= base) return;
    const refund = costs[cur];
    if (kind === 'skill') char.skills[name].rating = cur - 1;
    else char.profs[name] = cur - 1;
    char.peSpent = Math.max(0, spent - refund);
  }
  saveCharacter();
  render();
}

async function resetPE() {
  if (!await confirmStyled('Reset all PE spending? Skills and Combat Proficiencies will revert to Culture defaults.')) return;
  Object.keys(char.skillsBaseline || {}).forEach(s => {
    if (char.skills[s]) char.skills[s].rating = char.skillsBaseline[s];
  });
  Object.keys(char.profsBaseline || {}).forEach(p => {
    char.profs[p] = char.profsBaseline[p];
  });
  char.peSpent = 0;
  saveCharacter();
  render();
}

/* ---------- REWARD APPLY-TO FLOW ---------- */
let pendingReward = null;  // { name, source: 'starting' | 'new', rewardObj }

function getCompatibleTargets(rewardName) {
  const w = char.weapons || [];
  const armourEquipped = (parseInt(char.armourProt) || 0) > 0;
  const helmEquipped = (parseInt(char.helmProt) || 0) > 0;
  const shieldEquipped = (parseInt(char.shieldBase) || 0) > 0;
  const targets = [];

  if (['Fell', 'Grievous', 'Keen'].includes(rewardName)) {
    w.forEach((wpn, i) => targets.push({ kind: 'weapon', idx: i, label: wpn.name || `Weapon ${i+1}`, info: `Dmg ${wpn.dmg||'?'} · Inj ${wpn.inj||'?'}` }));
  }
  if (rewardName === 'Close-fitting') {
    if (armourEquipped) targets.push({ kind: 'armour', idx: -1, label: char.armourNotes || 'Body Armour', info: `Prot ${char.armourProt}d` });
    if (helmEquipped) targets.push({ kind: 'helm', idx: -1, label: 'Helm', info: `Prot ${char.helmProt}d` });
  }
  if (rewardName === 'Cunning Make') {
    if (armourEquipped) targets.push({ kind: 'armour', idx: -1, label: char.armourNotes || 'Body Armour', info: `Load ${char.armourLoad}` });
    if (helmEquipped) targets.push({ kind: 'helm', idx: -1, label: 'Helm', info: `Load ${char.helmLoad}` });
    if (shieldEquipped) targets.push({ kind: 'shield', idx: -1, label: char.shieldNotes || 'Shield', info: `Load ${char.shieldLoad}` });
  }
  if (rewardName === 'Reinforced') {
    if (shieldEquipped) targets.push({ kind: 'shield', idx: -1, label: char.shieldNotes || 'Shield', info: `Parry +${char.shieldBase}` });
  }
  return targets;
}

function promptApplyReward(rewardName, source) {
  const r = REWARDS.find(x => x.name === rewardName);
  if (!r) return;
  const targets = getCompatibleTargets(rewardName);
  if (targets.length === 0) {
    alert(`Reward "${rewardName}" needs ${r.type} equipped first.\n\nEquip the gear on the Combat tab, then re-pick this Reward.`);
    return false;
  }
  pendingReward = { name: rewardName, source, rewardObj: r };
  document.getElementById('apply-reward-title').textContent = `Apply ${rewardName} to…`;
  document.getElementById('apply-reward-desc').textContent = r.desc;
  const list = document.getElementById('apply-reward-targets');
  list.innerHTML = '';
  targets.forEach(t => {
    const btn = document.createElement('button');
    btn.style.cssText = 'background:var(--card-bg);color:var(--ink);text-align:left;padding:10px 12px;font-size:13px;border:1px solid var(--border);border-radius:6px;cursor:pointer;display:block;width:100%';
    btn.innerHTML = `<strong>${t.label}</strong> <span style="float:right;color:var(--red);font-size:11px">${t.info}</span><br><small style="color:var(--text-faint);text-transform:uppercase">${t.kind}</small>`;
    btn.onclick = () => confirmApplyReward(t);
    list.appendChild(btn);
  });
  document.getElementById('apply-reward-overlay').classList.add('show');
  return true;
}

function cancelApplyReward() {
  pendingReward = null;
  document.getElementById('apply-reward-overlay').classList.remove('show');
}

function confirmApplyReward(target) {
  if (!pendingReward) return;
  const rewardName = pendingReward.name;
  const r = pendingReward.rewardObj;
  applyRewardStats(rewardName, target);
  // Push to rewardsList
  if (!Array.isArray(char.rewardsList)) char.rewardsList = [];
  char.rewardsList.push({
    name: r.name, type: r.type, desc: r.desc,
    appliedKind: target.kind, appliedIdx: target.idx,
    appliedLabel: target.label
  });
  if (pendingReward.source === 'starting') char.startingReward = rewardName;
  pendingReward = null;
  document.getElementById('apply-reward-overlay').classList.remove('show');
  saveCharacter();
  render();
}

// Bump injury value, handling "16/18" → "18/20" form
function bumpInjury(str, delta) {
  if (!str) return String(delta);
  const parts = String(str).split('/');
  return parts.map(p => {
    const n = parseInt(p);
    return isNaN(n) ? p : String(n + delta);
  }).join('/');
}

function applyRewardStats(rewardName, target) {
  if (target.kind === 'weapon') {
    const w = char.weapons[target.idx];
    if (!w.rewards) w.rewards = [];
    w.rewards.push(rewardName);
    if (rewardName === 'Fell')     w.inj = bumpInjury(w.inj, 2);
    if (rewardName === 'Grievous') w.dmg = String((parseInt(w.dmg) || 0) + 1);
    // Keen: tag only
  } else if (target.kind === 'armour') {
    if (!Array.isArray(char.armourRewards)) char.armourRewards = [];
    char.armourRewards.push(rewardName);
    if (rewardName === 'Cunning Make') char.armourLoad = Math.max(0, (parseInt(char.armourLoad) || 0) - 2);
    // Close-fitting: tag only
  } else if (target.kind === 'helm') {
    if (!Array.isArray(char.helmRewards)) char.helmRewards = [];
    char.helmRewards.push(rewardName);
    if (rewardName === 'Cunning Make') char.helmLoad = Math.max(0, (parseInt(char.helmLoad) || 0) - 2);
  } else if (target.kind === 'shield') {
    if (!Array.isArray(char.shieldRewards)) char.shieldRewards = [];
    char.shieldRewards.push(rewardName);
    if (rewardName === 'Cunning Make') char.shieldLoad = Math.max(0, (parseInt(char.shieldLoad) || 0) - 2);
    if (rewardName === 'Reinforced') {
      char.shieldBase = (parseInt(char.shieldBase) || 0) + 1;
      char.shieldTotal = (parseInt(char.shieldTotal) || 0) + 1;
    }
  }
}

function revertRewardStats(rewardName, appliedKind, appliedIdx) {
  if (appliedKind === 'weapon') {
    const w = char.weapons[appliedIdx];
    if (!w) return;
    if (Array.isArray(w.rewards)) w.rewards = w.rewards.filter(x => x !== rewardName);
    if (rewardName === 'Fell')     w.inj = bumpInjury(w.inj, -2);
    if (rewardName === 'Grievous') w.dmg = String(Math.max(0, (parseInt(w.dmg) || 0) - 1));
  } else if (appliedKind === 'armour') {
    char.armourRewards = (char.armourRewards || []).filter(x => x !== rewardName);
    if (rewardName === 'Cunning Make') char.armourLoad = (parseInt(char.armourLoad) || 0) + 2;
  } else if (appliedKind === 'helm') {
    char.helmRewards = (char.helmRewards || []).filter(x => x !== rewardName);
    if (rewardName === 'Cunning Make') char.helmLoad = (parseInt(char.helmLoad) || 0) + 2;
  } else if (appliedKind === 'shield') {
    char.shieldRewards = (char.shieldRewards || []).filter(x => x !== rewardName);
    if (rewardName === 'Cunning Make') char.shieldLoad = (parseInt(char.shieldLoad) || 0) + 2;
    if (rewardName === 'Reinforced') {
      char.shieldBase = Math.max(0, (parseInt(char.shieldBase) || 0) - 1);
      char.shieldTotal = Math.max(0, (parseInt(char.shieldTotal) || 0) - 1);
    }
  }
}

function removeRewardByName(name) {
  if (!Array.isArray(char.rewardsList)) return;
  const idx = char.rewardsList.findIndex(r => r.name === name);
  if (idx < 0) return;
  const r = char.rewardsList[idx];
  revertRewardStats(r.name, r.appliedKind, r.appliedIdx);
  char.rewardsList.splice(idx, 1);
}

/* ---------- FAVOURED SKILLS ---------- */
function refreshFavoured() {
  // Clear all existing favoured flags
  Object.keys(char.skills || {}).forEach(name => {
    if (char.skills[name]) char.skills[name].favoured = false;
  });
  // Re-apply from authoritative sources
  const all = []
    .concat(char.cultureFavoured ? [char.cultureFavoured] : [])
    .concat(Array.isArray(char.callingFavoured) ? char.callingFavoured : [])
    .concat(Array.isArray(char.masteryFavoured) ? char.masteryFavoured : []);
  all.forEach(name => {
    if (!char.skills[name]) char.skills[name] = { rating: 0, favoured: true };
    else char.skills[name].favoured = true;
  });
}

function renderFavouredPicker() {
  const card = document.getElementById('favoured-card');
  if (!card) return;
  if (!char.culture && !char.calling && (!char.virtuesList || !char.virtuesList.some(v=>v.name==='Mastery'))) {
    card.style.display = 'none';
    return;
  }
  card.style.display = 'block';

  let html = '';

  // Culture: pick 1 of 2 underlined
  if (char.culture && CULTURES[char.culture]) {
    const opts = CULTURES[char.culture].favouredChoice;
    html += `<div style="margin-bottom:12px"><strong style="color:var(--red-dark);font-size:13px">Culture Favoured (pick 1)</strong><div style="display:flex;gap:8px;margin-top:6px">`;
    opts.forEach(s => {
      const picked = char.cultureFavoured === s;
      html += `<button onclick="setCultureFavoured('${s}')" style="flex:1;padding:10px;border:1px solid ${picked?'var(--red)':'var(--border)'};background:${picked?'var(--gold-soft)':'var(--pure-white)'};border-radius:6px;cursor:pointer;font-weight:${picked?700:400}">${s}${picked?' ✓':''}</button>`;
    });
    html += `</div></div>`;
  }

  // Calling: pick 2 of 3
  if (char.calling && CALLINGS[char.calling]) {
    const opts = CALLINGS[char.calling].favoured;
    const picked = char.callingFavoured || [];
    html += `<div style="margin-bottom:12px"><strong style="color:var(--red-dark);font-size:13px">Calling Favoured (pick 2)</strong><div style="display:flex;gap:8px;margin-top:6px;flex-wrap:wrap">`;
    opts.forEach(s => {
      const isOn = picked.includes(s);
      const disabled = !isOn && picked.length >= 2;
      html += `<button ${disabled?'disabled':''} onclick="toggleCallingFavoured('${s}')" style="flex:1;min-width:90px;padding:10px;border:1px solid ${isOn?'var(--red)':'var(--border)'};background:${isOn?'var(--gold-soft)':disabled?'var(--bg-deep)':'var(--pure-white)'};border-radius:6px;cursor:${disabled?'not-allowed':'pointer'};opacity:${disabled?0.5:1};font-weight:${isOn?700:400}">${s}${isOn?' ✓':''}</button>`;
    });
    html += `</div><p class="hint" style="text-align:left;margin:6px 0">Selected: ${picked.length}/2</p></div>`;
  }

  // Mastery: pick 2 of all 18 skills (only if Mastery virtue owned)
  if (Array.isArray(char.virtuesList) && char.virtuesList.some(v => v.name === 'Mastery')) {
    const picked = char.masteryFavoured || [];
    html += `<div><strong style="color:var(--red-dark);font-size:13px">Mastery Virtue Favoured (pick 2)</strong><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:6px;margin-top:6px">`;
    [...SKILLS.str, ...SKILLS.hrt, ...SKILLS.wit].forEach(s => {
      const isOn = picked.includes(s);
      const disabled = !isOn && picked.length >= 2;
      html += `<button ${disabled?'disabled':''} onclick="toggleMasteryFavoured('${s}')" style="padding:8px;border:1px solid ${isOn?'var(--red)':'var(--border)'};background:${isOn?'var(--gold-soft)':disabled?'var(--bg-deep)':'var(--pure-white)'};border-radius:6px;cursor:${disabled?'not-allowed':'pointer'};opacity:${disabled?0.5:1};font-size:12px;font-weight:${isOn?700:400}">${s}${isOn?' ✓':''}</button>`;
    });
    html += `</div><p class="hint" style="text-align:left;margin:6px 0">Selected: ${picked.length}/2</p></div>`;
  }

  document.getElementById('favoured-content').innerHTML = html;
}

function setCultureFavoured(name) {
  char.cultureFavoured = (char.cultureFavoured === name) ? '' : name;
  refreshFavoured();
  saveCharacter();
  render();
}

function toggleCallingFavoured(name) {
  if (!Array.isArray(char.callingFavoured)) char.callingFavoured = [];
  const idx = char.callingFavoured.indexOf(name);
  if (idx >= 0) char.callingFavoured.splice(idx, 1);
  else if (char.callingFavoured.length < 2) char.callingFavoured.push(name);
  refreshFavoured();
  saveCharacter();
  render();
}

function toggleMasteryFavoured(name) {
  if (!Array.isArray(char.masteryFavoured)) char.masteryFavoured = [];
  const idx = char.masteryFavoured.indexOf(name);
  if (idx >= 0) char.masteryFavoured.splice(idx, 1);
  else if (char.masteryFavoured.length < 2) char.masteryFavoured.push(name);
  refreshFavoured();
  saveCharacter();
  render();
}

/* ---------- SPEND XP MODAL ---------- */
// In-game XP costs: index = new rank, value = cost. Same scale for Skills/Profs/Valour/Wisdom.
const XP_COST_TO_REACH = [0, 4, 8, 12, 20, 26, 30];

function openSpendXP(mode) {
  document.getElementById('spend-xp-overlay').classList.add('show');
  document.getElementById('spend-xp-title').textContent = mode === 'skill' ? 'Spend Skill Points' : 'Spend Adventure Points';
  renderSpendXP(mode);
}
function closeSpendXP() {
  document.getElementById('spend-xp-overlay').classList.remove('show');
}

function fpSpendBlocker(group, label) {
  // Returns a reason string if blocked, or null if allowed. Only enforces when FP mode is active.
  if (!char.fpModeActive) return null;
  if (!char.fpSpend) char.fpSpend = { skills: {}, profs: {}, valour: 0, wisdom: 0 };
  if (group === 'skill' && char.fpSpend.skills[label]) {
    return `Already raised "${label}" this Fellowship Phase (1 rank per Skill per FP — RAW p.119).`;
  }
  if (group === 'prof' && char.fpSpend.profs[label]) {
    return `Already raised "${label}" this Fellowship Phase (1 rank per Combat Proficiency per FP).`;
  }
  if (group === 'valour' && char.fpSpend.wisdom > 0) {
    return `Already raised Wisdom this Fellowship Phase — Valour and Wisdom are exclusive per phase (RAW p.119).`;
  }
  if (group === 'wisdom' && char.fpSpend.valour > 0) {
    return `Already raised Valour this Fellowship Phase — Valour and Wisdom are exclusive per phase (RAW p.119).`;
  }
  return null;
}

function fpSpendRecord(group, label) {
  if (!char.fpModeActive) return;
  if (!char.fpSpend) char.fpSpend = { skills: {}, profs: {}, valour: 0, wisdom: 0 };
  if (group === 'skill') char.fpSpend.skills[label] = true;
  if (group === 'prof') char.fpSpend.profs[label] = true;
  if (group === 'valour') char.fpSpend.valour = (char.fpSpend.valour || 0) + 1;
  if (group === 'wisdom') char.fpSpend.wisdom = (char.fpSpend.wisdom || 0) + 1;
}

function renderSpendXP(mode) {
  const budgetEl = document.getElementById('spend-xp-budget');
  const list = document.getElementById('spend-xp-list');
  list.innerHTML = '';
  const sp = parseInt(char.skillPts) || 0;
  const ap = parseInt(char.advPts) || 0;
  const available = mode === 'skill' ? sp : ap;
  const fpHint = char.fpModeActive
    ? `<br><small style="color:var(--gold);font-weight:600">⚠️ Fellowship Phase mode: 1 rank max per Skill/Prof per FP; Valour XOR Wisdom per FP. Already spent: ${Object.keys(char.fpSpend?.skills || {}).length} skill rank(s), ${Object.keys(char.fpSpend?.profs || {}).length} prof rank(s)${char.fpSpend?.valour ? ', Valour' : ''}${char.fpSpend?.wisdom ? ', Wisdom' : ''}.</small>`
    : `<br><small style="color:var(--text-muted)">Spending outside Fellowship Phase (no caps enforced; per RAW XP is only spent in FP — use the FP wizard for rule-correct play).</small>`;
  budgetEl.innerHTML = (mode === 'skill' ? `Available: ${sp} Skill Points` : `Available: ${ap} Adventure Points`) + fpHint;

  const makeRow = (label, currentRank, maxRank, onUpgrade, group) => {
    const newRank = currentRank + 1;
    const cost = (newRank <= maxRank) ? XP_COST_TO_REACH[newRank] : null;
    const fpBlock = cost !== null ? fpSpendBlocker(group, label) : null;
    const can = cost !== null && available >= cost && !fpBlock;
    const row = document.createElement('div');
    row.style.cssText = `display:flex;align-items:center;gap:10px;padding:10px;border:1px solid var(--border);border-radius:6px;background:var(--card-bg);${fpBlock ? 'opacity:0.6' : ''}`;
    let status;
    if (cost === null) status = 'MAX';
    else if (fpBlock) status = '🔒 FP';
    else status = `${cost} pts`;
    const fpBlockHint = fpBlock ? `<div style="color:var(--red);font-size:10px;font-style:italic">${fpBlock}</div>` : '';
    row.innerHTML = `
      <div style="flex:1">
        <div style="font-size:13px"><strong>${label}</strong> <span style="color:var(--red);font-size:10px;text-transform:uppercase">${group}</span></div>
        <div style="color:var(--text-muted);font-size:11px">Current: ${'◆'.repeat(currentRank) || '—'} → ${cost === null ? 'maxed' : '◆'.repeat(newRank)}</div>
        ${fpBlockHint}
      </div>
      <button style="background:${can?'var(--red)':'#ccc'};color:white;border:none;border-radius:5px;padding:8px 12px;font-size:12px;font-weight:600;cursor:${can?'pointer':'not-allowed'}" ${can?'':'disabled'} title="${fpBlock || ''}">${status}</button>
    `;
    const btn = row.querySelector('button');
    if (can) btn.onclick = () => { onUpgrade(cost); fpSpendRecord(group, label); closeSpendXP(); };
    list.appendChild(row);
  };

  const header = (txt) => {
    const h = document.createElement('div');
    h.style.cssText = 'font-size:11px;color:var(--red);text-transform:uppercase;letter-spacing:1px;font-weight:700;padding:8px 2px 4px';
    h.textContent = txt;
    list.appendChild(h);
  };

  if (mode === 'skill') {
    ['str', 'hrt', 'wit'].forEach(attr => {
      header(({str:'Strength', hrt:'Heart', wit:'Wits'})[attr] + ' Skills');
      SKILLS[attr].forEach(name => {
        const cur = char.skills[name]?.rating || 0;
        makeRow(name, cur, 6, (cost) => {
          char.skillPts = sp - cost;
          if (!char.skills[name]) char.skills[name] = { rating: 0, favoured: false };
          char.skills[name].rating = cur + 1;
          saveCharacter(); render();
        }, 'skill');
      });
    });
  } else {
    header('Combat Proficiencies');
    COMBAT_PROFS.forEach(name => {
      const cur = char.profs[name] || 0;
      makeRow(name, cur, 6, (cost) => {
        char.advPts = ap - cost;
        char.profs[name] = cur + 1;
        saveCharacter(); render();
      }, 'prof');
    });
    header('Valour & Wisdom');
    makeRow('Valour', char.valour || 1, 6, (cost) => {
      char.advPts = ap - cost;
      char.valour = (char.valour || 1) + 1;
      saveCharacter(); render();
      openNewReward();
    }, 'valour');
    makeRow('Wisdom', char.wisdom || 1, 6, (cost) => {
      char.advPts = ap - cost;
      char.wisdom = (char.wisdom || 1) + 1;
      saveCharacter(); render();
      openNewVirtue();
    }, 'wisdom');
  }
}

/* ---------- NEW REWARD / VIRTUE PROMPTS ---------- */
function openNewReward() {
  const list = document.getElementById('new-reward-list');
  list.innerHTML = '';
  REWARDS.forEach(r => {
    const row = document.createElement('button');
    row.style.cssText = 'background:var(--card-bg);color:var(--ink);text-align:left;padding:10px 12px;font-size:13px;border:1px solid var(--border);border-radius:6px;cursor:pointer;display:block;width:100%;line-height:1.4;';
    row.innerHTML = `<strong>${r.name}</strong> <span style="float:right;color:var(--red);font-size:11px">${r.type}</span><br><small style="color:var(--text-muted)">${r.desc}</small>`;
    row.onclick = () => pickNewReward(r.name);
    list.appendChild(row);
  });
  document.getElementById('new-reward-overlay').classList.add('show');
}
function closeNewReward() { document.getElementById('new-reward-overlay').classList.remove('show'); }

function pickNewReward(name) {
  closeNewReward();
  promptApplyReward(name, 'new');
}

function syncRewardsText() {
  if (!Array.isArray(char.rewardsList)) char.rewardsList = [];
  char.rewards = char.rewardsList.map(r => `${r.name} (${r.type})${r.appliedTo ? ' → '+r.appliedTo : ''} — ${r.desc}`).join('\n');
}

function openNewVirtue() {
  const list = document.getElementById('new-virtue-list');
  list.innerHTML = '';
  const renderGroup = (label, items) => {
    const h = document.createElement('div');
    h.style.cssText = 'font-size:11px;color:var(--red);text-transform:uppercase;letter-spacing:1px;font-weight:700;padding:6px 2px 2px';
    h.textContent = label;
    list.appendChild(h);
    items.forEach(v => {
      // Skip already-owned virtues
      if (Array.isArray(char.virtuesList) && char.virtuesList.some(x => x.name === v.name)) return;
      const row = document.createElement('button');
      row.style.cssText = 'background:var(--card-bg);color:var(--ink);text-align:left;padding:10px 12px;font-size:13px;border:1px solid var(--border);border-radius:6px;cursor:pointer;display:block;width:100%;line-height:1.4;';
      row.innerHTML = `<strong>${v.name}</strong><br><small style="color:var(--text-muted)">${v.desc}</small>`;
      row.onclick = () => pickNewVirtue(v.name);
      list.appendChild(row);
    });
  };
  renderGroup('Generic', VIRTUES_GENERIC);
  if (char.culture && CULTURAL_VIRTUES[char.culture]) renderGroup(char.culture, CULTURAL_VIRTUES[char.culture]);
  document.getElementById('new-virtue-overlay').classList.add('show');
}
function closeNewVirtue() { document.getElementById('new-virtue-overlay').classList.remove('show'); }

function pickNewVirtue(name) {
  const v = findVirtue(name);
  if (!v) return;
  if (!Array.isArray(char.virtuesList)) char.virtuesList = [];
  char.virtuesList.push({ name: v.name, desc: v.desc });
  if (v.effect) {
    Object.entries(v.effect).forEach(([k, val]) => {
      char[k] = (parseInt(char[k]) || 0) + val;
      if (k === 'endBonusVirtue') { char.endMax = (parseInt(char.endMax) || 0) + val; char.endCur = (parseInt(char.endCur) || 0) + val; }
      if (k === 'hopeBonusVirtue') { char.hopeMax = (parseInt(char.hopeMax) || 0) + val; char.hopeCur = (parseInt(char.hopeCur) || 0) + val; }
    });
  }
  syncVirtuesText();
  saveCharacter();
  render();
  closeNewVirtue();
}

function syncVirtuesText() {
  if (!Array.isArray(char.virtuesList)) char.virtuesList = [];
  char.virtues = char.virtuesList.map(v => `${v.name} — ${v.desc}`).join('\n');
}

/* ---------- DISTINCTIVE FEATURES PICKER ---------- */
function renderFeaturesPicker() {
  const card = document.getElementById('features-card');
  if (!card) return;
  if (!char.culture || !CULTURES[char.culture]) { card.style.display = 'none'; return; }
  card.style.display = 'block';

  const c = CULTURES[char.culture];
  const cultureFeats = c.features.split(',').map(s => s.trim());
  const picked = char.featuresPicked || [];

  const list = document.getElementById('features-checklist');
  list.innerHTML = '';
  cultureFeats.forEach(f => {
    const isPicked = picked.includes(f);
    const disabled = !isPicked && picked.length >= 2;
    const row = document.createElement('div');
    row.style.cssText = `display:flex;align-items:center;gap:10px;padding:8px;cursor:${disabled?'not-allowed':'pointer'};opacity:${disabled?0.4:1}`;
    row.innerHTML = `
      <div class="fav-check ${isPicked ? 'checked' : ''}" style="cursor:${disabled?'not-allowed':'pointer'}"></div>
      <span style="font-size:14px">${f}</span>
    `;
    if (!disabled) row.onclick = () => toggleFeature(f);
    list.appendChild(row);
  });

  // Show calling feature summary
  const summary = document.getElementById('features-summary');
  if (char.calling && CALLINGS[char.calling]) {
    summary.style.display = 'block';
    let callFeat = CALLINGS[char.calling].feature;
    if (char.calling === 'Champion' && char.enemyLore) callFeat = `Enemy-Lore (${char.enemyLore})`;
    summary.innerHTML = `<strong>Auto from ${char.calling}:</strong> ${callFeat}<br><strong>Picked:</strong> ${picked.length ? picked.join(', ') : '— none yet —'} ${picked.length === 2 ? '✓' : `(${picked.length}/2)`}`;

  } else {
    summary.style.display = 'block';
    summary.innerHTML = `<strong>Picked:</strong> ${picked.length ? picked.join(', ') : '— none yet —'} ${picked.length === 2 ? '✓' : `(${picked.length}/2)`}<br><em>Pick a Calling to auto-add its Distinctive Feature.</em>`;
  }

  // Champion Enemy-Lore subject sub-picker (rendered into dedicated container — no duplicates)
  const eloContainer = document.getElementById('enemy-lore-picker');
  if (eloContainer) {
    if (char.calling === 'Champion') {
      eloContainer.innerHTML = '<div style="margin-top:12px;padding:10px;background:var(--gold-soft);border:1px solid var(--gold);border-radius:6px"><strong style="color:var(--red-dark);font-size:13px">Champion — Enemy-Lore Subject (pick 1)</strong><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">' +
        ENEMY_LORE_TYPES.map(e => {
          const isOn = char.enemyLore === e;
          return `<button onclick="setEnemyLore('${e}')" style="padding:8px 10px;border:1px solid ${isOn?'var(--red)':'var(--border)'};background:${isOn?'var(--gold-soft)':'var(--pure-white)'};border-radius:5px;font-size:12px;font-weight:${isOn?700:400};cursor:pointer">${e}${isOn?' ✓':''}</button>`;
        }).join('') + '</div></div>';
    } else {
      eloContainer.innerHTML = '';
    }
  }
}

function toggleFeature(f) {
  if (!Array.isArray(char.featuresPicked)) char.featuresPicked = [];
  const idx = char.featuresPicked.indexOf(f);
  if (idx >= 0) char.featuresPicked.splice(idx, 1);
  else if (char.featuresPicked.length < 2) char.featuresPicked.push(f);
  rebuildFeaturesText();
  saveCharacter();
  renderFeaturesPicker();
  // Reflect on Character tab
  const charField = document.querySelector('[data-field="features"]');
  if (charField) charField.value = char.features;
}

function rebuildFeaturesText() {
  const picked = (char.featuresPicked || []).join(', ');
  let callingFeat = '';
  if (char.calling && CALLINGS[char.calling]) {
    let featText = CALLINGS[char.calling].feature;
    if (char.calling === 'Champion' && char.enemyLore) {
      featText = `Enemy-Lore (${char.enemyLore})`;
    }
    callingFeat = `[${char.calling}: ${featText}]`;
  }
  char.features = [picked, callingFeat].filter(Boolean).join('\n');
}

function setEnemyLore(name) {
  char.enemyLore = (char.enemyLore === name) ? '' : name;
  rebuildFeaturesText();
  saveCharacter();
  render();
}

/* ---------- REWARDS PICKER ---------- */
function renderRewardsPicker() {
  const list = document.getElementById('rewards-list');
  if (!list) return;
  list.innerHTML = '';
  REWARDS.forEach(r => {
    const picked = char.startingReward === r.name;
    const row = document.createElement('div');
    row.style.cssText = `display:flex;align-items:flex-start;gap:10px;padding:10px;cursor:pointer;border:1px solid ${picked?'var(--red)':'var(--border)'};border-radius:6px;margin-bottom:6px;background:${picked?'var(--gold-soft)':'var(--pure-white)'}`;
    row.innerHTML = `
      <div class="fav-check ${picked ? 'checked' : ''}" style="flex-shrink:0;margin-top:2px"></div>
      <div style="flex:1">
        <strong>${r.name}</strong> <span style="color:var(--red);font-size:11px">(${r.type})</span><br>
        <small style="color:var(--text-muted);font-size:12px">${r.desc}</small>
      </div>
    `;
    row.onclick = () => pickReward(r.name);
    list.appendChild(row);
  });
}

function pickReward(name) {
  if (!Array.isArray(char.rewardsList)) char.rewardsList = [];
  if (char.startingReward === name) {
    // Deselect — revert stats and remove
    removeRewardByName(name);
    char.startingReward = '';
    saveCharacter();
    render();
  } else {
    // Switching — revert old, prompt apply for new
    if (char.startingReward) removeRewardByName(char.startingReward);
    const ok = promptApplyReward(name, 'starting');
    if (!ok) {
      // Could not apply (no gear) — leave startingReward unchanged
      saveCharacter();
      render();
    }
    // confirmApplyReward will set char.startingReward
  }
}

/* ---------- VIRTUES PICKER ---------- */
function renderVirtuesPicker() {
  const list = document.getElementById('virtues-list');
  if (!list) return;
  list.innerHTML = '';

  const renderGroup = (label, virtues) => {
    const hdr = document.createElement('div');
    hdr.style.cssText = 'font-size:11px;color:var(--red);text-transform:uppercase;letter-spacing:1px;font-weight:700;padding:8px 2px 4px';
    hdr.textContent = label;
    list.appendChild(hdr);
    virtues.forEach(v => {
      const picked = char.startingVirtue === v.name;
      const row = document.createElement('div');
      row.style.cssText = `display:flex;align-items:flex-start;gap:10px;padding:10px;cursor:pointer;border:1px solid ${picked?'var(--red)':'var(--border)'};border-radius:6px;margin-bottom:6px;background:${picked?'var(--gold-soft)':'var(--pure-white)'}`;
      row.innerHTML = `
        <div class="fav-check ${picked ? 'checked' : ''}" style="flex-shrink:0;margin-top:2px"></div>
        <div style="flex:1">
          <strong>${v.name}</strong><br>
          <small style="color:var(--text-muted);font-size:12px">${v.desc}</small>
        </div>
      `;
      row.onclick = () => pickVirtue(v.name);
      list.appendChild(row);
    });
  };

  renderGroup('Starting Virtue (pick 1)', VIRTUES_GENERIC);

  // Per rules (book p.81): Cultural Virtues require Wisdom 2+. At creation Wisdom = 1.
  const note = document.createElement('p');
  note.className = 'hint';
  note.style.cssText = 'text-align:left;margin-top:10px;padding:8px;background:var(--bg);border-radius:6px';
  note.innerHTML = '<strong>🔒 Cultural Virtues</strong> (e.g. Dragon-Slayer, Baruk Khazâd!, Elvish Dreams) unlock at <strong>Wisdom 2+</strong>. After your first Wisdom rank-up via Spend XP, the new-Virtue picker will include your culture\'s 6 cultural virtues.';
  list.appendChild(note);
}

function findVirtue(name) {
  for (const v of VIRTUES_GENERIC) if (v.name === name) return v;
  for (const culture in CULTURAL_VIRTUES) {
    for (const v of CULTURAL_VIRTUES[culture]) if (v.name === name) return v;
  }
  return null;
}

function applyVirtueEffect(v, sign) {
  // sign: +1 to apply, -1 to revert
  if (!v) return;
  if (v.effect) {
    Object.entries(v.effect).forEach(([k, val]) => {
      const delta = val * sign;
      char[k] = Math.max(0, (parseInt(char[k]) || 0) + delta);
      if (k === 'endBonusVirtue') { char.endMax = Math.max(0, (parseInt(char.endMax) || 0) + delta); char.endCur = Math.max(0, (parseInt(char.endCur) || 0) + delta); }
      if (k === 'hopeBonusVirtue') { char.hopeMax = Math.max(0, (parseInt(char.hopeMax) || 0) + delta); char.hopeCur = Math.max(0, (parseInt(char.hopeCur) || 0) + delta); }
    });
  }
  // Special virtues with no static effect field
  if (v.name === 'Three is Company') {
    char.fellowshipRating = Math.max(0, (parseInt(char.fellowshipRating) || 0) + (1 * sign));
  }
  if (v.name === 'Prowess') {
    if (sign > 0) {
      setTimeout(() => document.getElementById('prowess-overlay').classList.add('show'), 100);
    } else {
      // Revert previously-chosen TN
      const attr = char.prowessAttr;
      if (attr) {
        char[attr + 'TN'] = (parseInt(char[attr + 'TN']) || 0) + 1;
        char.prowessAttr = '';
      }
    }
  }
}

function pickKingsOfMen(attr) {
  // Revert previous choice if any
  if (char.kingsOfMenAttr && char.kingsOfMenAttr !== attr) {
    const prev = char.kingsOfMenAttr;
    char[prev + 'Rating'] = Math.max(0, (parseInt(char[prev + 'Rating']) || 0) - 1);
  }
  char.kingsOfMenAttr = attr;
  char[attr + 'Rating'] = (parseInt(char[attr + 'Rating']) || 0) + 1;
  char[attr + 'TN'] = (char.striderMode ? 18 : 20) - char[attr + 'Rating'];

  // Re-derive End / Hope / Parry Max from new ratings
  if (char.endBonus) {
    const wasAtMax = char.endCur === char.endMax;
    char.endMax = char.strRating + char.endBonus + (parseInt(char.endBonusVirtue) || 0);
    if (wasAtMax) char.endCur = char.endMax;
  }
  if (char.hopeBonus) {
    const wasAtMax = char.hopeCur === char.hopeMax;
    char.hopeMax = char.hrtRating + char.hopeBonus + (parseInt(char.hopeBonusVirtue) || 0);
    if (wasAtMax) char.hopeCur = char.hopeMax;
  }
  if (char.parryBonus) {
    char.parry = char.witRating + char.parryBonus + (parseInt(char.parryBonusVirtue) || 0);
  }
  document.getElementById('kings-overlay').classList.remove('show');
  saveCharacter();
  render();
}

function pickProwess(attr) {
  // Sanity: don't double-apply
  if (char.prowessAttr) {
    alert('Prowess already applied to ' + char.prowessAttr.toUpperCase() + '. Remove the virtue first to change.');
    document.getElementById('prowess-overlay').classList.remove('show');
    return;
  }
  char.prowessAttr = attr;
  char[attr + 'TN'] = Math.max(1, (parseInt(char[attr + 'TN']) || 0) - 1);
  document.getElementById('prowess-overlay').classList.remove('show');
  saveCharacter();
  render();
}

function pickVirtue(name) {
  if (!Array.isArray(char.virtuesList)) char.virtuesList = [];
  if (char.startingVirtue === name) {
    // Deselect — remove and revert effect
    const v = findVirtue(name);
    applyVirtueEffect(v, -1);
    char.virtuesList = char.virtuesList.filter(x => x.name !== name);
    char.startingVirtue = '';
    if (name === 'Mastery') { char.masteryFavoured = []; refreshFavoured(); }
  } else {
    // Switching — revert old, apply new
    if (char.startingVirtue) {
      const old = findVirtue(char.startingVirtue);
      applyVirtueEffect(old, -1);
      char.virtuesList = char.virtuesList.filter(x => x.name !== char.startingVirtue);
      if (char.startingVirtue === 'Mastery') { char.masteryFavoured = []; refreshFavoured(); }
    }
    const v = findVirtue(name);
    if (v) {
      char.startingVirtue = name;
      char.virtuesList.push({ name: v.name, desc: v.desc });
      applyVirtueEffect(v, +1);
    }
  }
  syncVirtuesText();
  saveCharacter();
  render();
}

/* ---------- QUICK BUILD ---------- */
function bindBuilder() {
  const culturePick = document.getElementById('culture-pick');
  const callingPick = document.getElementById('calling-pick');
  const patronPick = document.getElementById('patron-pick');

  patronPick.onchange = () => {
    const name = patronPick.value;
    const info = document.getElementById('patron-info');
    const btn = document.getElementById('apply-patron-btn');
    if (!name) { info.style.display = 'none'; btn.style.display = 'none'; return; }
    const p = PATRONS[name];
    const match = char.calling && p.callings.includes(char.calling);
    info.innerHTML = `
      <strong>${name}</strong><br>
      Favoured Callings: ${p.callings.join(', ')}${match ? ' ✓ (matches your Calling)' : ''}<br>
      Fellowship bonus: <strong>+${p.fpBonus}</strong><br>
      <em>${p.ability}</em><br>
      Agenda: ${p.agenda}
    `;
    info.style.display = 'block';
    btn.style.display = 'block';
  };

  culturePick.onchange = () => {
    const name = culturePick.value;
    const info = document.getElementById('culture-info');
    const btn = document.getElementById('apply-culture-btn');
    const attrRow = document.getElementById('attr-set-row');
    const attrSel = document.getElementById('attr-set');

    if (!name) {
      info.style.display = 'none';
      btn.style.display = 'none';
      attrRow.style.display = 'none';
      return;
    }
    const c = CULTURES[name];

    // Populate attribute set options
    attrSel.innerHTML = '<option value="-1">— Pick set (or roll) —</option>' +
      c.attrSets.map((s, i) => `<option value="${i}">Set ${i+1}: Str ${s[0]} · Hrt ${s[1]} · Wit ${s[2]}</option>`).join('') +
      '<option value="r">🎲 Roll random</option>';
    attrRow.style.display = 'flex';

    info.innerHTML = `
      <strong>${name}</strong><br>
      <em>${c.blessing}</em><br>
      Standard: ${c.standard} · Age: ${c.age}<br>
      End: Str+${c.endBonus} · Hope: Hrt+${c.hopeBonus} · Parry: Wits+${c.parryBonus}<br>
      Profs: ${c.profPrimary.join(' OR ')} (2) + 1 other<br>
      Favoured choice: <strong>${c.favouredChoice.join(' OR ')}</strong><br>
      Features: ${c.features}${c.weapons ? '<br><span style="color:var(--red)">⚠ '+c.weapons+'</span>' : ''}
    `;
    info.style.display = 'block';
    btn.style.display = 'block';
  };

  callingPick.onchange = () => {
    const name = callingPick.value;
    const info = document.getElementById('calling-info');
    const btn = document.getElementById('apply-calling-btn');
    if (!name) { info.style.display = 'none'; btn.style.display = 'none'; return; }
    const c = CALLINGS[name];
    info.innerHTML = `
      <strong>${name}</strong><br>
      Shadow Path: <em>${c.shadowPath}</em><br>
      Distinctive Feature: <strong>${c.feature}</strong><br>
      Favoured Skills (pick 2): ${c.favoured.join(', ')}
    `;
    info.style.display = 'block';
    btn.style.display = 'block';
  };
}

async function applyCulture() {
  const name = document.getElementById('culture-pick').value;
  if (!name) return;
  snapshot();   // undo support — Apply Culture is a big, easy-to-misfire change
  const c = CULTURES[name];

  // Pick attribute set
  let setIdx = document.getElementById('attr-set').value;
  let attrs;
  if (setIdx === 'r') {
    setIdx = Math.floor(Math.random() * 6);
    attrs = c.attrSets[setIdx];
  } else if (setIdx === '-1' || setIdx === '') {
    attrs = c.attrSets[0];
  } else {
    attrs = c.attrSets[parseInt(setIdx)];
  }

  if (!await confirmStyled(`Apply ${name} defaults?\n\nThis will overwrite:\n• Culture, Cultural Blessing, Standard, Age\n• Attributes (Str ${attrs[0]} / Hrt ${attrs[1]} / Wit ${attrs[2]})\n• Endurance & Hope max\n• Skills & Combat Proficiencies\n• Distinctive Features list`)) return;

  // Apply
  char.culture = name;
  char.blessing = c.blessing;
  char.standard = c.standard;
  char.age = c.age;

  char.strRating = attrs[0]; char.strTN = (char.striderMode ? 18 : 20) - attrs[0];
  char.hrtRating = attrs[1]; char.hrtTN = (char.striderMode ? 18 : 20) - attrs[1];
  char.witRating = attrs[2]; char.witTN = (char.striderMode ? 18 : 20) - attrs[2];

  char.endBonus = c.endBonus;
  char.hopeBonus = c.hopeBonus;
  char.parryBonus = c.parryBonus;

  char.endMax = attrs[0] + c.endBonus + (parseInt(char.endBonusVirtue) || 0);
  char.endCur = char.endMax;
  char.hopeMax = attrs[1] + c.hopeBonus + (parseInt(char.hopeBonusVirtue) || 0);
  char.hopeCur = char.hopeMax;
  char.parry = attrs[2] + c.parryBonus;

  // Skills — set ratings; favoured handled by separate cultureFavoured / callingFavoured / masteryFavoured state
  char.skills = {};
  Object.entries(c.skills).forEach(([skill, rating]) => {
    char.skills[skill] = { rating, favoured: false };
  });
  // Snapshot baseline for Previous Experience tracking
  char.skillsBaseline = {};
  Object.entries(c.skills).forEach(([skill, rating]) => { char.skillsBaseline[skill] = rating; });
  // Reset Previous Experience budget
  char.peSpent = 0;
  // Default culture-favoured to first option (user can change via Build tab Favoured picker)
  char.cultureFavoured = c.favouredChoice[0];
  refreshFavoured();

  // Combat profs — defaults: first primary at rank 2, first non-primary at rank 1
  // (user can change via Combat Proficiencies picker on Build tab)
  char.profs = {};
  COMBAT_PROFS.forEach(p => char.profs[p] = 0);
  const defPrimary = c.profPrimary[0];
  const defSecondary = COMBAT_PROFS.find(p => !c.profPrimary.includes(p)) || COMBAT_PROFS[0];
  char.profs[defPrimary] = c.profPrimaryRank;
  char.profs[defSecondary] = (char.profs[defSecondary] || 0) + c.profSecondaryRank;
  char.primaryProfChoice = defPrimary;
  char.secondaryProfChoice = defSecondary;
  char.profsBaseline = { ...char.profs };

  // Reset picked features when culture changes (avoid stacked list bug)
  char.featuresPicked = [];
  char.features = '';

  // Reset Kings of Men choice if switching to a different culture
  char.kingsOfMenAttr = '';

  saveCharacter();
  render();
  alert(`${name} applied!\n\nNow scroll down on the Build tab to:\n• Pick your Culture Favoured (1 of: ${c.favouredChoice.join(' / ')})\n• Pick 2 Distinctive Features\n• Choose your secondary Combat Proficiency manually`);

  // +1 Attribute blessing — Rangers (Kings of Men) and High Elves (Elven-wise).
  if (name === 'Rangers of the North' || name === 'High Elves of Rivendell') {
    const t = document.getElementById('kings-title');
    const h = document.getElementById('kings-hint');
    if (name === 'High Elves of Rivendell') {
      if (t) t.textContent = '✨ Elven-wise';
      if (h) h.innerHTML = 'High Elves add <strong>+1 to one Attribute</strong>. Choose which:';
    } else {
      if (t) t.textContent = '👑 Kings of Men';
      if (h) h.innerHTML = 'Rangers add <strong>+1 to one Attribute</strong>. Choose which:';
    }
    setTimeout(() => document.getElementById('kings-overlay').classList.add('show'), 100);
  }
}

async function applyPatron() {
  const name = document.getElementById('patron-pick').value;
  if (!name) return;
  const p = PATRONS[name];

  if (!await confirmStyled(`Apply ${name} as your Patron?\n\nThis will set your Patron field and add +${p.fpBonus} to your Fellowship.`)) return;

  char.patron = name;
  char.fellowshipRating = (parseInt(char.fellowshipRating) || 0) + p.fpBonus;
  char.fellowship = (parseInt(char.fellowship) || 0) + p.fpBonus;

  saveCharacter();
  render();
  alert(`Patron set: ${name}\n\nAbility: ${p.ability}\nAgenda: ${p.agenda}\n\nFellowship bonus +${p.fpBonus} added.`);
}

async function applyCalling() {
  const name = document.getElementById('calling-pick').value;
  if (!name) return;
  const c = CALLINGS[name];

  if (!await confirmStyled(`Apply ${name} defaults?\n\nThis will overwrite:\n• Calling, Shadow Path\n• First 2 of 3 Favoured skills will be pre-selected (use Favoured Skills picker to adjust)`)) return;

  char.calling = name;
  char.shadowPath = c.shadowPath;

  // Default callingFavoured to first 2 (user can change via Build tab Favoured picker)
  char.callingFavoured = c.favoured.slice(0, 2);
  refreshFavoured();

  // Moria Shared Calling — set the Band's Disposition Focus (Band Inspired in that Disposition).
  if (c.shared && SHARED_CALLINGS[name]) {
    char.band.sharedCalling = name;
    char.band.dispositionFocus = SHARED_CALLINGS[name].focus;
  }

  // Calling distinctive feature is appended via the Features picker (rebuildFeaturesText)
  rebuildFeaturesText();

  saveCharacter();
  render();
  alert(`${name} applied!\n\nDistinctive Feature added: ${c.feature}${c.shared ? '\n(Shared Calling — your Band is Inspired in the ' + SHARED_CALLINGS[name].focus + ' Disposition: a Hope spend gives +2d on those rolls.)' : ''}\n\nIf you want different Favoured skills than the first 2 (${c.favoured.slice(0,2).join(', ')}), use the Favoured Skills picker on the Build tab.`);
}

/* ---------- REFERENCE (U5 rule cards / U6 skill+term reference / U8 cheat-sheet tab) ----------
   Paraphrased, RAW-accurate memory aids (no rulebook prose). Stances reuse the in-app STANCE_INFO
   so there is one source of truth. All content here matches the app's own mechanics. */
const REFERENCE = {
  conditions: [
    ['Weary', 'On your Success dice, results of 1–3 count as 0 (zeroes). Onset when Fatigue ≥ Endurance (and from some effects).'],
    ['Miserable', 'A ✦ Eye on the Feat die is an automatic failure, whatever the total. Onset when Shadow (+ Scars) ≥ Hope.'],
    ['Wounded', 'A second Wound takes you out of the fight. You recover no Endurance from rest while Wounded — treat it with a Healing roll over days.']
  ],
  combatTasks: [
    ['Intimidate Foe', '<em>Forward</em> · AWE — on success, Might 1 enemies are Weary this round (great success: also Might 2).'],
    ['Rally Comrades', '<em>Open</em> · ENHEARTEN — heroes in Forward stance gain +1d next round.'],
    ['Protect Companion', '<em>Defensive</em> · ATHLETICS — the protected hero’s next attacker loses 1d (+1d per success icon).'],
    ['Prepare Shot', '<em>Rearward</em> · SCAN — +1d on your next ranged attack (+1d per success icon).'],
    ['Gain Ground', '<em>Skirmish (Strider)</em> · ATHLETICS or SCAN — +1d on your next ranged attack (+1d per icon).']
  ],
  tn: [
    ['Target Number (TN)', 'TN = 20 − the governing attribute’s Rating (18 − Rating in Strider Mode). Roll Feat die + Success dice; total ≥ TN = success.'],
    ['Feat die (d12)', '✦ Gandalf rune = automatic success. ✦ Eye = 0 (and an automatic failure while Miserable).'],
    ['Success icons (✦)', 'Each 6 rolled on a Success die is an icon — fuels extra effects, Magical success, and the Piercing Blow window.'],
    ['Great Success', 'Two ✦ icons = Great success; three = Extraordinary — stronger effects and special damage.']
  ],
  terms: [
    ['Endurance', 'Your stamina/health pool. Reduced by damage and Load; restored by rest. At 0 you are Dying.'],
    ['Hope', 'Spend 1 to add +1d to a roll (doubled to +2d if Inspired). Restored in the Fellowship Phase and from Fellowship points.'],
    ['Shadow / Scars', 'Corruption. Shadow + permanent Scars ≥ Hope → Miserable; reaching that point again can trigger a Bout of Madness.'],
    ['Fatigue', 'Weariness from Load and travel. When Fatigue ≥ Endurance you become Weary.'],
    ['Parry', 'Your defence TN — the number an adversary must beat to hit you (plus your shield).'],
    ['Load', 'Total weight carried; high Load drives Fatigue.'],
    ['Valour', 'Martial renown. Each rank grants Valour rolls and unlocks a Reward.'],
    ['Wisdom', 'Spiritual insight. Each rank grants Wisdom rolls, unlocks a Virtue, and helps resist Shadow.']
  ],
  skills: {
    Awe: 'Intimidate; commanding presence (STR).', Athletics: 'Run, climb, jump, feats of body (STR).', Awareness: 'Notice danger and ambushes (STR).', Hunting: 'Track quarry and find food in the wild (STR).', Song: 'Lift hearts with music and verse (STR).', Craft: 'Make and repair things (STR).',
    Enhearten: 'Rally and encourage companions (HRT).', Travel: 'Endure journeys; the Guide rolls this (HRT).', Insight: 'Read people’s true intentions (HRT).', Healing: 'Treat wounds; recover Endurance (HRT).', Courtesy: 'Etiquette and good first impressions (HRT).', Battle: 'Tactics and command in war (HRT).',
    Persuade: 'Convince and bargain (WIT).', Stealth: 'Move unseen and unheard (WIT).', Scan: 'Search an area for details (WIT).', Explore: 'Find the way; read terrain (WIT).', Riddle: 'Wits, puzzles, gather rumour (WIT).', Lore: 'Knowledge of history and the world (WIT).'
  }
};
function renderReference() {
  const body = document.getElementById('reference-body'); if (!body) return;
  const q = (document.getElementById('ref-filter')?.value || '').toLowerCase().trim();
  const stanceRows = Object.keys(STANCE_INFO).map(k => [null, STANCE_INFO[k]]);
  const groups = [
    ['Stances (Combat)', stanceRows],
    ['Conditions', REFERENCE.conditions],
    ['Combat Tasks', REFERENCE.combatTasks],
    ['Dice & Target Numbers', REFERENCE.tn],
    ['Key Terms', REFERENCE.terms],
    ['Skills (18)', Object.entries(REFERENCE.skills)]
  ];
  let html = '';
  groups.forEach(([title, rows]) => {
    const matched = rows.filter(([t, d]) => !q || title.toLowerCase().includes(q) || (((t || '') + ' ' + (d || '')).toLowerCase().includes(q)));
    if (!matched.length) return;
    html += `<h3 style="color:var(--red-dark);border-bottom:1px solid var(--border);padding-bottom:3px;margin:14px 0 6px;font-size:14px">${title}</h3>`;
    matched.forEach(([t, d]) => {
      html += `<div style="margin:0 0 7px;font-size:13px;line-height:1.45;color:var(--ink)">${t ? `<strong>${escapeHtml(t)}</strong> — ` : ''}${d}</div>`;
    });
  });
  body.innerHTML = html || '<div class="hint">No match.</div>';
}
