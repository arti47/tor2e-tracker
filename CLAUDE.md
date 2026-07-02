# TOR2E Character Tracker

An HTML5 character sheet + play tracker for **The One Ring 2nd Edition** RPG — a PWA for iPad/iPhone/desktop with rule-faithful creation, full in-play tracking, two solo modes, and **live Firebase multiplayer** (Fellowship campaigns, shared GM-run combat, Loremaster screen). No build step; a thin HTML shell loads classic `<script src>` files.

---

## ⭐ STATUS DASHBOARD — read this first (updated 2026-07-02)

> **This section is the single source of truth for "where are we and what's next."**
> Everything below it is reference detail and per-phase history. Keep this dashboard
> current whenever work lands (and prune it — it must stay one screen).

### Current state
- **All roadmap phases COMPLETE (incl. the full loremaster port):** P0 adversaries · P1 test harness (`npm test`, **93/93 green**, 6 specs) · P2 module split (`src/01…08` + `styles.css`) · P3 cloud-owned heroes · P4 live campaigns/party · P5 shared GM-driven encounter · P6 Loremaster screen (role-gated GM tab, peek, broadcast) · P7 security rules (**deployed + live-verified 2026-07-02**) · P8 accessibility. Plus the UX batch (U3\*, U4\*, U5/6/8, U9–U15; \*=partial, see Open items).
- **Cloud is LIVE**: real Firebase config committed (`FIREBASE_ENABLED=true`); rules deployed; broadcast / in-campaign push / peek all verified against the real project 2026-07-02.
- **SW cache `tor2e-v97`** · git repo (local-only, no remote) · shells (`character-tracker.html` = `index.html`) in sync.

### The dev workflow (every change)
1. Edit **`src/*.js`** (JS) or **`character-tracker.html`** (markup) or `styles.css`.
2. If the HTML changed: `cp character-tracker.html index.html`.
3. Bump `CACHE_VERSION` in `sw.js`.
4. `npm test` — must be green (add a spec check for new behavior).
5. Update **this dashboard** (+ tick the relevant section below) · `git commit`.
- Live-cloud features can't be harness-tested (SDK blocked in tests) → verify via the preview server against the real Firebase project.

### Open items (what's actually left)
| # | Item | Size | Notes |
|---|---|---|---|
| 1 | **Deploy/redeploy the hosted app (Netlify)** | S | Everything multiplayer is built + verified but unusable at a real table until hosted. Bundle = the whole folder (shell now needs `src/`, `styles.css`, `firebase-config.js`). |
| 2 | **Real-device table test** (2+ devices: loremaster + player) | S | The last mile no harness covers: join code entry, live party, shared combat, broadcast toasts on phones. |
| 3 | **Push repo to GitHub** (backup / issues) | S | Repo is local-only; iCloud is the only copy. |
| ~~4~~ | ~~Port remaining loremaster GM tables~~ ✅ **done 2026-07-02** | — | All 6 tables (4×6 action decks, water perils, false/genuine rumours, famous/obscure landmarks) ported **verbatim from `github.com/arti47/tor2e-loremaster`** (the local folder was deleted — the GitHub repo is the recovery source) into `src/08-gm.js` + 2 GM-tab cards (🃏 deck draw, 📜 Moria tables rollers). +2 gm-spec checks; harness **95/95**; live-verified. **The loremaster port is now 100% complete.** SW v98. |
| 5 | GM hand-out to **remote** players | M | Documented deviation: `characters/{id}` is owner-only-write. Needs a request-queue node (or rule relaxation) if wanted. |
| ~~6~~ | ~~UX leftovers~~ ✅ **done 2026-07-02** | — | All five shipped (SW v99, harness **100/100**, +5 ux-spec checks): **U4-swipe** (`initSwipeTabs` — horizontal swipe switches visible tabs; ignores form fields, horizontally-scrollable content, open dialogs), **U3-collapse** (`initCollapsibleCards` — tap any card title to collapse, ▸/▾ + `aria-expanded`, remembered in `tor2e-collapsed`), **U7-hints** (`initHintButtons`/`hintFor` — (?) buttons on key Character-tab labels, text sourced from `REFERENCE.terms` = single source of truth), **U14-nudge** (`maybeBackupNudge` — baseline stamped on install, toast if no export in 14 days, 3-day throttle; both exports stamp `tor2e-lastexport`), **P8-minor** (aria-labels on the generated weapon ▲▼× buttons). Skipped by design: the old "group rolls" idea (a feature, not polish — stays on the legacy wishlist). |
| 7 | CLAUDE.md deep prune | M | This dashboard fixes navigation; a fuller archive/split of the historical sections is optional housekeeping. |

**Recommended order: 1 → 2 → 3, then 4 (nice content win), then 6 as filler. 5 and 7 only if a real need emerges.**

---

## Project Overview

**Purpose**: Replace the paper TOR2E character sheet with a touch-friendly app that enforces the rules and auto-applies mechanical effects.

**Target devices**: iPad, iPhone (Safari → Add to Home Screen), desktop browser

---

## Architecture

### Current state (verify before quoting — figures drift)

Last verified: **2026-07-02**. Re-run these commands to refresh:

```bash
grep CACHE_VERSION sw.js                    # current service worker cache version
wc -l src/*.js styles.css                   # per-file sizes
grep -ro "tor2e-[a-z0-9-]*" src/ | grep -o "tor2e-[a-z0-9-]*" | sort -u   # all localStorage keys
npm test                                    # harness must be green
```

As of last verification:
- **Layout (since P2, 2026-06-29)**: thin `character-tracker.html` shell (mirrored to `index.html`) loading `styles.css` + `src/vendor-qrcode.js` + `src/01-core.js`…`src/08-gm.js` in order — **classic scripts, no build step, still works over `file://`**. `firebase-config.js` (real keys, `FIREBASE_ENABLED=true`) + Firebase compat CDN scripts power the optional-but-live cloud layer (`src/07-sync.js`); the app degrades gracefully to fully-local when offline.
- **`sw.js` `CACHE_VERSION`**: `tor2e-v97` (bump on every deploy). SW strategy: HTML/navigations network-first; static assets cache-first; auto-activate.
- **Test harness**: `npm test` → 6 specs / **93 checks** (smoke, adversaries, ux, spillage, a11y, gm). Cloud paths are no-ops in tests (SDK blocked) — verify live features via preview against the real project.
- **Cloud (P3–P7)**: heroes mirror to `characters/{id}` (owner-only, rules-enforced); campaigns at `campaigns/{cid}` (join codes, live vitals party, presence, shared encounter, loremaster broadcast). `database.rules.json` **deployed + live-verified 2026-07-02**.
- **Solo modes**: Strider + Moria complete (see their sections below).
- **localStorage keys**: a **multi-character roster** (added 2026-05-31):
  - `tor2e-roster-v1` — `{ activeId, list:[{id,name}] }` (the index of all heroes on the device)
  - `tor2e-char-<id>` — each hero's character JSON (one key per hero)
  - `tor2e-rolls-<id>` — each hero's last-30 dice rolls (one key per hero)
  - `tor2e-journal-<id>` — each hero's **Chronicle** (entries / threads / NPCs / Tale-of-Years clock / auto-capture settings)
  - `tor2e-oracle-history` — last 30 Strider/Moria oracle rolls (global, not per-hero)
  - `tor2e-theme` — `'light'` / `'dark'` / `'sepia'` / `'hc'` / unset = auto (U10)
  - `tor2e-textsize` — `'small'` / `'large'` / unset = normal (U9, device-global)
  - `tor2e-lasttab` — last-used tab id, reopened on load if still visible (U4, device-global)
  - `tor2e-backups` — `{ [charId]: [{ts,reason,name,data}] }` per-hero snapshot ring buffer, max 8 (U12)
  - `tor2e-compact` — `'1'` = compact spacing, unset = normal (UX setting, device-global)
  - `tor2e-tutorial` — tutorial progress `{completed, resume, offered}` (device-global)
  - `tor2e-gm` — `'1'` = local GM Screen tab visible (P6; in a campaign the loremaster ROLE overrides this)
  - `tor2e-gm-npcs` — GM NPC-ledger custom entries (device-global, P6)
  - `tor2e-campaign-v1` — current campaign `{cid, code, role}` (device-global, P4)
  - **Legacy (read-once for migration, then left as backup):** `tor2e-character-v1`, `tor2e-rolls-v1`. On first load under the roster system these are migrated into the first hero's slot. `loadCharacter()`/`saveCharacter()` operate on the active slot; `migrateCharacter(raw)` is the pure forward-migration used for slots, imports, and shared-link payloads.

### Stack
- **Pure HTML5 + CSS + JavaScript** — no frameworks, no build step, no dependencies
- **Thin HTML shell + classic `<script src>` files** (since P2, 2026-06-29): `character-tracker.html` (and its `index.html` mirror) is a ~145 KB shell that loads `styles.css` + `src/vendor-qrcode.js` + `src/01-core.js`…`src/06-tabs-init.js` in order. **Classic scripts (not ES modules)** — they share one global scope, so the 367 inline `onclick` handlers + 447 global functions work unchanged AND it still runs over `file://`. **No bundler/build step.** See Phase P2.
- **Storage**: `localStorage` — see Current state above for the full key list

### Why classic scripts (still clone-and-run)?
- Works offline from iOS Files app over `file://` (classic `<script src>`/`<link>` load fine there; only ES modules/`fetch` are CORS-blocked on `file://`)
- "Add to Home Screen" with zero config; AirDrop/iCloud the whole folder
- No build step, no module/CORS issues — the split is purely for maintainability (6 navigable files vs one 15k-line block), guaranteed behavior-identical (the files concatenate byte-for-byte to the original script)

### File structure (within `character-tracker.html`)
1. `<head>` — viewport, PWA meta tags, theme color
2. `<style>` — CSS with variables for theming + readonly state styling
3. `<header>` — sticky nav with character name + tabs (scrollable)
4. `<section.panel>` — **12 tabs**: Character / Skills / Combat / Journey / Council / Gear / Dice / **Oracle** / **Band** / **Battle** / **Chronicle** / Build. Oracle is shown in any solo mode (`isSolo()` in `refreshStriderUI`); **Chronicle is solo-only** (`isSolo()` — Strider or Moria solo). **Band & Battle are Moria-only** (`char.moriaMode`). Journey & Council are always present. (Tab defaults to `display:none`; `refreshStriderUI` owns its visibility.)
5. **Overlay modals** — Menu, Weapon/Armour/Shield pickers, Spend XP, New Reward, New Virtue, Apply Reward To, Prowess TN, +1-Attribute (`kings-overlay`, Rangers/High Elves), Hoard roller, FP wizard, milestone/desperate-stand/kingly-gift pickers
6. `<script>` — at the bottom

### Data constants in `<script>`
- `SKILLS` — 18 skills grouped by attribute
- `COMBAT_PROFS` — 4 combat proficiencies
- `WEAPONS` — 16 standard weapons with stats
- `ARMOURS`, `SHIELDS` — gear catalogs
- `REWARDS` — 6 starting rewards with type + description
- `VIRTUES_GENERIC` — 6 generic virtues with effect data
- `CULTURAL_VIRTUES` — per-culture virtue lists for all 11 cultures (6 each for most; High Elves of Rivendell have 10 = Lindon's 6 + 4 own)
- `FLAWS_BY_PATH` — 6 shadow paths × 4 escalating flaws
- `PATRONS` — 6 starting patrons with FP bonus + ability + agenda
- `CULTURES` — **11 cultures**: 6 Core + 3 Peoples of Wilderland (Beornings, Elves of Mirkwood, Woodmen) + 2 Other (Dwarves of Nogrod & Belegost, High Elves of Rivendell). Each: blessing, attribute sets, skills, profs, derived stat bonuses, distinctive features. Both Dwarf cultures share `isDwarfCulture()` (Redoubtable load-halving + no great-weapon/shield). High Elves & Rangers share the +1-Attribute overlay (`kings-overlay`, retitled per culture). High Elf EA base = 3.
- `CALLINGS` — 6 core callings + **5 Moria Shared Callings** (`shared:true`: Reclaimers/Pathfinders/Standard-Bearers/Guardians/Vanguards) → favoured skills, feature (Disposition Focus for shared), shadow path
- **Moria Solo constants** (full reference in the "Moria Solo Mode" section below): `DISPOSITIONS`, `SHARED_CALLINGS`, `ALLY_GIFTS`/`ALLY_QUIRKS`/`ALLY_NAMES`, injury/fatigue/burden tables, `MISSION_OBJECTIVES`/`COMP_*`/`HUNT_MOD_*`, `WAR_PARTY`/`ARCHFOE_MODS`/`CLASH_SETBACK`/`BATTLEFIELD_ASPECTS`, `MORIA_JOURNEY_EVENTS`/`MORIA_EVENT_DETAILS`, `CHAMBER_*`/`REVELATION_MORIA`/`ORC_BAND_*`, `MORIA_LORE` (4-col), `MORIA_EXP_MILESTONES`/`FP_INTERRUPTIONS`. Mode helpers: `isMoria()`/`isSolo()`/`oracleSet()`/`isDwarfCulture()`; band helpers: `missionAllies()`/`bandRoll()`/`bandWeary()`.
- `PREGENS` — **13 official pre-generated heroes** for one-tap loading (☰ menu **✨ Pre-generated Heroes** → `openPregens`/`loadPregen`/`_pregenToChar`): 5 from the **Player Heroes** pack (Geira/Regin/Fimbrethil/Mentha/Duinhir — full sheets w/ Calling, Shadow Path, Patron) + 8 from the **Shire Starter Set** (Drogo/Esmeralda/Lobelia/Paladin/Primula/Rorimac/Balin/Bilbo — simplified, no Calling, TN = 18−rating). Extracted from the official PDFs via PyMuPDF (text spans for words/numbers, filled-pip vector shapes for skill/prof ratings). Each record carries attributes (rating+printed TN), End/Hope/Parry/Valour/Wisdom, skills `{rating,favoured}`, profs, weapons, armour/helm/shield, rewards, virtues, useful items. `loadPregen` adds the hero as a NEW roster entry (never overwrites). Favoured skills are read from each sheet's filled markers (the actual picks, e.g. Regin = Awe/Athletics/Craft, not the Calling default; Mastery-virtue heroes correctly show 5).
- `XP_COST_TO_REACH` — `[0, 4, 8, 12, 20, 26, 30]` — in-game costs (cost to reach each rank)
- `SKILL_PE_COST` — `[0, 1, 2, 3, 5, 0, 0]` — creation-time Previous Experience cost for skills (cap rank 4)
- `PROF_PE_COST` — `[0, 2, 4, 6, 0, 0, 0]` — creation-time PE cost for combat profs (cap rank 3)
- `PE_BUDGET = 10` — Previous Experience point budget at creation
- `STANCE_INFO` — descriptions for 4 combat stances
- `DEFAULT_CHARACTER` — full character schema

### Major JS function groups
- State: `loadCharacter` (with migration) / `saveCharacter` / `loadHistory` / `saveHistory`
- Rendering: `render`, `renderSkills`, `renderProfs`, `renderWeapons`, `renderDerivedStats`, `renderConditionWarnings`, `renderStance`, `renderFavouredPicker`, `renderFeaturesPicker`, `renderRewardsPicker`, `renderVirtuesPicker`, `renderQuickSkills`, `renderProtectionParry`, `renderHistory`
- Auto-compute: `recomputeLoad`, `refreshFavoured`, `refreshKeenButton`, `checkAutoTriggers`
- Pickers: `bindBuilder`, `applyCulture`, `applyCalling`, `applyPatron`, `pickReward`/`pickNewReward`/`promptApplyReward`/`confirmApplyReward`/`applyRewardStats`/`revertRewardStats`/`removeRewardByName`, `pickVirtue`/`pickNewVirtue`/`applyVirtueEffect`/`pickProwess`
- Gear pickers: `openWeaponPicker`/`pickWeapon`, `openArmourPicker`/`pickArmour`/`clearArmour`/`toggleHelm`, `openShieldPicker`/`pickShield`/`clearShield`
- XP: `openSpendXP`/`renderSpendXP`/`openNewReward`/`openNewVirtue`
- Counters: `adj`, `adjVirtueBonus`
- Dice: `rollDice`, `rollFeatDie`, `pickFeat`, `quickRoll`, `rollProtection`, `rollWoundSeverity`, `toggleHopeSpend`, `toggleMagical`, `toggleKeen`

---

## Field Lock Reference (🔒 = read-only display)

### Character tab
| Field | Status | Source |
|---|---|---|
| Heroic Culture | 🔒 | Build → Culture picker |
| Cultural Blessing | 🔒 | Auto from Culture |
| Calling | 🔒 | Build → Calling picker |
| Shadow Path | 🔒 | Auto from Calling |
| Patron | 🔒 | Build → Patron picker |
| Standard of Living | dropdown | Initial from Culture; can change with Treasure |
| Age | editable | Increases at Yule; hint shows culture's typical range |
| Safe Haven | editable | Free text — Bree, Rivendell, Thorin's Hall, etc. |
| Strength / Heart / Wits Rating | 🔒 | Build → Attribute Set picker |
| Strength / Heart / Wits TN | 🔒 | Auto: `20 − Rating` |
| End Max | 🔒 | Auto: `Str + culture endBonus + endBonusVirtue` |
| Hope Max | 🔒 | Auto: `Heart + culture hopeBonus + hopeBonusVirtue` |
| Parry | 🔒 | Auto: `Wit + culture parryBonus + parryBonusVirtue` |
| Current End / Hope / Shadow / Scars | +/− | Capped at Max |
| Load | 🔒 | Auto-sums armour + helm + shield + weapons + treasure + Other Load |
| Fatigue | +/− | |
| Virtue Bonus rows (End / Hope) | +/− | Clamped ≥ 0 |
| Other Load | +/− | For Marvellous/Wondrous Items |
| Conditions (Weary / Miserable / Wounded) | toggle | Auto-warning badges when state suggests |
| Injury | editable | Auto-filled from Wound Severity roll |
| Valour / Wisdom | +/− | Or via Spend XP |
| Fellowship Pts | +/− | |
| Fellowship Rating | 🔒 | From Patron + Three is Company virtue |
| Skill Pts / Adventure Pts | +/− + Spend button | |
| Treasure | +/− | Counts toward Load |
| Fellowship Focus | dropdown | |
| Distinctive Features | 🔒 | Build → Features picker |
| Flaws | 🔒 | Bout of Madness auto-prompt |
| Rewards | 🔒 | Build picker (starting) + new Valour rank prompt |
| Virtues | 🔒 | Build picker (starting) + new Wisdom rank prompt |
| History | editable | Free text |

### Skills tab
- Skill pips: 🔒 by default (upgrade via Spend Skill Points modal)
- Combat Prof pips: 🔒 by default (upgrade via Spend Adventure Points modal)
- Favoured checkboxes: 🔒 by default (set via Build → Favoured Skills picker)
- **Edit Mode toggle** at top of Skills tab — unlocks pips & favoured for manual override; auto-locks when leaving the tab. Use only for corrections.

### Combat tab
- Stance buttons: toggle
- Engaged Foes: +/−
- **Starting Gear count hint** above War Gear: shows "Axes: 1/2 · Swords: 2/2" etc. — picked vs allotted (1 weapon per Combat Prof rank); turns red if exceeded
- War Gear: Name + Notes editable; Damage / Injury / Load 🔒 for picked weapons, editable for Custom Row
- Armour Protection / Load: 🔒 (Pick / Clear / Add Helm)
- Helm Protection / Load: 🔒 (Add Helm / Remove Helm toggle)
- Armour Type/Notes: editable
- Shield Base / Load: 🔒 (Pick / Clear)
- Shield Total: editable (Base + Reward upgrades)
- Shield Notes: editable

### Gear tab
- Travelling Gear, Treasure/Hoards, Notes — all editable free text

### Dice tab
- All controls editable

---

## Current Features

### Build tab (character creation workflow)
1. **Culture picker** (6 cultures) — shows blessing, derived stat formulas, profs, favoured choice, features, weapon restrictions; attribute set picker (6 options or random)
2. **Calling picker** (6 callings) — shows shadow path, distinctive feature, favoured skills
3. **Patron picker** (6 patrons) — Balin / Bilbo / Cirdan / Gandalf / Gilraen / Tom Bombadil; shows FP bonus + ability + agenda; auto-adds to Fellowship Rating
4. **Previous Experience (10 pts)** — budget bar + per-skill/per-prof +/− buttons; creation-tier costs (1/2/3/5 SP for skills, 2/4/6 AP for profs); caps skills at ◆◆◆◆ and profs at ◆◆◆; "Reset to Culture Baseline" button
5. **Favoured Skills picker** — pick 1 from culture (of 2 underlined), pick 2 from calling (of 3), pick 2 more if Mastery virtue owned
6. **Distinctive Features picker** — pick 2 from culture's 8; calling feature auto-added
7. **Starting Reward picker** — 6 rewards; on pick, opens Apply-to modal for compatible gear → auto-modifies stats
8. **Starting Virtue picker** — 6 generic + 6 cultural for your culture; auto-applies mechanical effects (End/Hope/Parry bonuses, Fellowship Rating, Prowess TN, etc.)
9. Manual setup checklist reminding remaining steps

### Character tab
- All identity fields (locked where appropriate)
- Attribute block with derived stats display (End Max / Hope Max / Parry with formula breakdown)
- Endurance card: Max/Current/Load/Fatigue counters + Virtue Bonus + Other Load mini-counters
- Hope card: Max/Current/Shadow/Scars + Virtue Bonus mini-counter
- Conditions toggles with auto-warning badges + Dying pill at 0 Endurance
- Advancement: Valour / Wisdom / Fellowship Pts / Skill Pts / Adventure Pts / Treasure (with **Spend** buttons on SP/AP) + Fellowship Rating display + Fellowship Focus dropdown
- Distinctive Features / Flaws / Rewards / Virtues (all locked, populated by structured pickers)
- History (free text)

### Skills tab
- 18 skills with diamond-pip ratings (0–6), locked
- Favoured checkboxes, locked (set via Build picker)
- 4 Combat Proficiencies, locked
- Warning banner shown when more than 3 favoured skills marked

### Combat tab
- Stance card: 4 buttons + description + Engaged Foes counter
- War Gear: + Pick Weapon (16 standard, grouped by proficiency) and + Custom Row buttons; picked rows have locked stats; rewards modify stats
- Armour picker: 4 body armours + Helm toggle; Dwarven Redoubtable auto-halves Load
- Shield picker: 3 shields; Hobbit/Dwarf great-shield warning
- Protection (dice) and Parry Total summary

### Gear tab
- Travelling Gear / Treasure / Hoards / Notes — free text

### Dice tab
- Feat die + 0–6 Success dice
- Normal / Favoured / Ill-Favoured
- TN attribute selector
- Weary / Miserable toggles
- Spend 1 Hope (+1d) button
- Magical Success (1 Hope, forces Rune) button
- Keen weapon (PB 9+) toggle — appears only if a weapon has the Keen reward
- Quick-roll buttons from skills/profs with rating ≥1 or favoured
- Stance auto-modifier on Combat Proficiency quick-rolls: Forward +1d, Defensive −1d per engaged foe
- Protection Roll card with Close-fitting reward auto-applying +2 to result
- Roll history (last 20 visible, 30 stored)

### Auto-systems
- **Wound Severity** roll on Wounded toggle
- **Protection Roll** chains to Wounded + Severity on fail
- **Bout of Madness** prompt when Shadow ≥ Max Hope, picks Flaw from Shadow Path
- **Condition warnings** (pulsing badges) when state suggests Weary/Miserable
- **Dying indicator** when Endurance = 0
- **Load auto-compute** with breakdown hint
- **Favoured refresh** keeps skill flags in sync with picker arrays
- **Reward apply-to** modifies equipment stats; revert on removal

### Menu (☰)
- Export character as JSON
- Import character from JSON
- Reset to fresh character (also clears roll history)

---

## Data Sources

- `The One Ring - Core Rules.pdf` — pp. 32–46 (cultures, callings, character creation), pp. 78–89 (Rewards, Virtues, Cultural Virtues)
- `The One Ring 2ed Cheat Sheet.pdf` — mechanics summary (16 pages)
- `The One Ring - Peoples of Wilderland.pdf` — supplement adding 3 cultures (Beornings, Elves of Mirkwood, Woodmen of Wilderland) with 18 new cultural virtues
- `The One Ring - Character Lifepaths.pdf` — supplement adding random backstory tables (6 cultures × 6 backstories = 36 entries) + Major Events table (12 entries)

Reference PDFs are now stored at:
- `~/Library/Mobile Documents/com~apple~CloudDocs/iCloud Downloads/Coding/TOR2E Tracker/The One Ring - Core Rules.pdf`
- `~/Library/Mobile Documents/com~apple~CloudDocs/iCloud Downloads/Coding/TOR2E Tracker/The One Ring 2ed Cheat Sheet.pdf`

**NotebookLM (live source-of-truth for rules queries):**
- Notebook: "TOR2E" — `https://notebooklm.google.com/notebook/d39b8118-b250-4ca2-bb2f-5820d8dd89c9`
- ID: `d39b8118-b250-4ca2-bb2f-5820d8dd89c9` (8 sources: Core Rules, Cheat Sheet, Peoples of Wilderland, Character Lifepaths, Rivendell, Ruins of the Lost Realm, Strider Mode, Moria)
- **Caveat:** the Core Rules PDF text layer is garbled at numeric tables (XP costs, etc.). NotebookLM's AI confidently *infers* values from "mathematical progression" rather than reading them — this produces hallucinated answers on tables. Always render the actual PDF page with the PDF Tools (`render_pdf_page`) to verify numbers, not trust the textual answer.

---

## Roadmap

### ✅ Priority 1 — Core rule coverage gaps (DONE)
- [x] Parry derived stat field with auto formula
- [x] Auto-derived End/Hope Max from Rating + culture bonus + Virtue Bonus
- [x] Wound Severity roller on Wounded toggle
- [x] Protection Roll card with chained Wound flow
- [x] Auto-condition triggers (Weary/Miserable badges, Dying pill)
- [x] Fellowship Focus selector

### ✅ Priority 2 — Picker UIs (DONE)
- [x] Patron picker (6 starting patrons)
- [x] Weapon database (16 weapons, grouped by proficiency)
- [x] Armour database (4 body + helm toggle, Dwarven half-load)
- [x] Shield database (3 shields with cultural restrictions)
- [x] Starting Rewards picker (6 rewards) + Apply-to-equipment flow
- [x] Starting Virtues picker (6 generic + 36 cultural)
- [x] Distinctive Features picker (8 per culture, pick 2 + auto calling feature)
- [x] Favoured Skills picker (Culture / Calling / Mastery virtue)

### ✅ In-session quick-wins (DONE)
- [x] Spend 1 Hope (+1d) toggle in dice roller
- [x] Magical Success button (forces Rune, 1 Hope cost)
- [x] Stance selector (Forward / Open / Defensive / Rearward) with descriptions
- [x] Stance auto-modifier on combat-prof attack rolls (Forward +1d, Defensive −1d per engaged foe)
- [x] Bout of Madness prompt with Shadow Path flaw picker
- [x] Dying indicator at 0 Endurance

### ✅ Reward auto-apply system (DONE)
- [x] "Apply to which item?" modal with compatible-gear filter
- [x] Stat-modifying rewards: Fell +2 Injury, Grievous +1 Damage, Cunning Make −2 Load, Reinforced +1 shield Parry
- [x] Tag-only rewards stored on equipment: Close-fitting, Keen
- [x] Close-fitting integrated in Protection Roll (+2 to result, stacks armour+helm)
- [x] Keen integrated in dice tab (toggle button, Piercing window opens to 9+)
- [x] Reverts cleanly on Reward removal

### ✅ Special virtue handlers (DONE)
- [x] Prowess: sub-modal "Lower which TN?" → applies −1 to chosen Attribute TN
- [x] Three is Company: +1 Fellowship Rating field
- [x] Hardiness / Confidence / Nimbleness / High Destiny / Stone-Hard / Untameable Spirit / Elbereth Gilthoniel / Bree-Pony / Endurance of the Ranger — all auto-apply numerical effects

### ✅ XP-gated upgrades (DONE)
- [x] Skill pips locked behind Spend Skill Points modal
- [x] Combat Prof pips locked behind Spend Adventure Points modal
- [x] Valour/Wisdom upgrades cost AP per `XP_COST_TO_REACH` table
- [x] Auto-prompts Reward picker on Valour rank up
- [x] Auto-prompts Virtue picker on Wisdom rank up
- [x] Attribute Ratings locked (set via Build attribute set picker)
- [x] Skills tab Edit Mode toggle (manual override for corrections; auto-locks on tab switch)

### ✅ Character creation completeness (DONE)
- [x] Previous Experience 10-pt budget on Build tab with creation-tier costs
- [x] PE baseline snapshot at Apply Culture; reset button reverts to baseline
- [x] Age culture-range hint below Age field
- [x] Safe Haven free-text field
- [x] Starting Gear count display on Combat tab (allotted vs picked per Combat Prof)
- [x] Useful Items picker — 12 standard items, limited by Standard of Living (0/1/2/3/4); auto-applies +1d on matching skill rolls via quick-roll
- [x] Useful Items display on Gear tab (read-only list of selected items)
- [x] **Cultural Virtues rule fix** — Starting Virtue picker shows only generic 6 (per book p.81: cultural unlock at Wisdom 2+). Note added explaining when cultural becomes available.
- [x] Champion Enemy-Lore sub-picker — when Champion calling is applied, 6-button picker (Evil Men/Orcs/Spiders/Trolls/Wargs/Undead) appears in Features card; updates Distinctive Feature text to "Enemy-Lore (Orcs)" instead of "(choose: ...)"
- [x] Weapon restrictions enforcement — Hobbit/Dwarf restricted weapons greyed out with ⚠ in Weapon picker; confirm-override on pick
- [x] **Rangers Kings of Men +1 Attribute** — sub-prompt on Apply Rangers asks which Attribute (Str/Heart/Wits) gets +1; re-derives End/Hope/Parry Max accordingly; reversible if changed
- [x] **Valour / Wisdom roll buttons** — auto-shown at top of Dice tab quick-roll grid; Valour uses Heart TN with Valour-rank success dice; Wisdom uses Wits TN with Wisdom-rank success dice
- [x] **Cultural Blessing auto-Favoured** — Bardings Stout-Hearted auto-Favours all Valour rolls (★ badge); Hobbits Hobbit-Sense auto-Favours all Wisdom rolls (★ badge); shown in dice result summary
- [x] **Combat Proficiency choice at creation** — new picker card on Build tab lets you choose (1) which of your culture's 2 primary profs gets rank 2, and (2) which of all 4 profs gets the +1 (can stack on primary for rank 3). Preserves PE delta when choices change.

### ✅ Playtest fixes (first round — DONE)
- [x] **Starting Gear card on Build tab** — gold-bordered card before Starting Reward links to Combat tab so users equip gear before picking Rewards (which need a target).
- [x] **Hope/Magical/Keen/Brave result tags** — these now appear in the Dice result summary as visible tags (not just in history).
- [x] **WEARY pill next to Current Endurance** — mirrors the DYING pill style; visible when char.weary is set OR auto-condition met. More prominent than the badge on the Weary button.
- [x] **Brave at a Pinch auto-toggle** — when virtue owned AND Weary/Miserable/Wounded, a 🌲 toggle appears in dice roller. ✅ **Fixed to RAW (later patch):** button now sets `diceState.inspired = true` instead of granting flat +2d. Inspired doubles a Hope spend to +2d; no Hope spend = no bonus. See "Brave at a Pinch RAW fix + Inspiration state" entry above and Known Issues for the resolution.

### ✅ Playtest fixes (second round — DONE)
- [x] **Gender field** — dropdown (Male / Female / —) on Character tab next to Name
- [x] **Random Name picker** — 🎲 button next to Name. Pulls from culture-specific male/female lists in `NAMES` data (extracted from book pp.32-43). Adds family name for Hobbits / Bree, patronymic ("son/daughter of X") for Bardings.
- [x] **Piercing Blow tag only on weapon rolls** — added `diceState.isAttack` flag set by `quickRoll` when item is a Combat Proficiency; "Piercing Blow possible" tag suppressed for skill / Valour / Wisdom rolls.

### ✅ Peoples of Wilderland supplement (DONE)
- [x] **3 new cultures added**: Beornings, Elves of Mirkwood, Woodmen of Wilderland
  - Full Cultural Blessing, attribute sets, derived stat formulas, skills, combat profs, distinctive features
  - Grouped under "Peoples of Wilderland" optgroup in the Culture picker
- [x] **18 new cultural virtues** added to `CULTURAL_VIRTUES` (6 per new culture). Effect data filled where mechanical (Brother to Bears +1 End, Staunching Song +1 Hope).
- [x] **New culture name lists** added to `NAMES`. Beornings and Woodmen use bynames/nicknames (no family names). Elves of Mirkwood share Sindarin pool with Elves of Lindon.
- [x] **Beornings "Furious" auto-Favoured** — when char.wounded and rolling a Combat Proficiency attack OR a Protection Roll, the Feat die is automatically Favoured (rolls 2 dice, keep better). Tag shown in result: "[Furious: Favoured]".

### ✅ Character Lifepaths supplement (DONE)
- [x] **36 backstories** (6 per Core Rules culture) in `LIFEPATHS` data. Each has die roll, name, story, suggested Str/Hrt/Wit, favoured skill, 2 distinctive features.
- [x] **12 Major Events** in `MAJOR_EVENTS` data (Eye, 1-10, Rune).
- [x] **Lifepath card on Build tab** — gold-bordered card with two rollers:
  - "🎲 Roll Backstory" — rolls d6 → displays backstory + suggested stats → "Apply" button overwrites attributes, derived stats, culture favoured, distinctive features; appends story to History
  - "🎲 Roll Major Event" — rolls Feat die → displays event → "Apply" button applies effects (Scars+1, PE budget shift, Standard of Living shift, TN adjustments with prompts, Fellowship Rating shift, Endurance/Hope/Parry adjustments, Favoured-skill prompts, Grey Wizard flag)
- [x] **"Favoured by the Grey Wizard"** — when applied, `char.greyWizard = true`. In `rollFeatOnce`, any 1 rolled is automatically treated as 11. Visible in result as "1→11".
- [x] **Only Core Rules cultures have lifepaths** — Wilderland supplement cultures (Beornings, Mirkwood, Woodmen) hide the Lifepath card (no backstory data exists in this supplement for them).

### ✅ Notebook audit fixes (DONE)
- [x] **Shadow Path → Flaws mapping corrected** — original `FLAWS_BY_PATH` was shifted by one column. Per Core Rules p.140: Curse of Vengeance (Champion) = Spiteful/Brutal/Cruel/Murderous; Dragon-Sickness (Treasure Hunter) = Grasping/Mistrustful/Deceitful/Thieving; Lure of Power (Captain) = Resentful/Arrogant/Overconfident/Tyrannical; Lure of Secrets (Scholar) = Haughty/Scornful/Scheming/Traitorous; Path of Despair (Warden) = Troubled/Wavering/Guilt-ridden/Fearful; Wandering-Madness (Messenger) = Idle/Forgetful/Uncaring/Cowardly.
- [x] **Combat Tasks card on Dice tab** — 4 stance-gated buttons. Intimidate Foe (Forward · AWE), Rally Comrades (Open · ENHEARTEN), Protect Companion (Defensive · ATHLETICS), Prepare Shot (Rearward · SCAN). Matching task is highlighted gold when the player picks the right stance; non-matching tasks dimmed. Tapping rolls the underlying skill via `quickRoll` with a `combatTask` label that appears as a tag in the result summary and in roll history (e.g. "Intimidate Foe (Awe)"). Per-task effect reminders inline on each button.
- [x] **XP_COST_TO_REACH table verified against Core Rules p.119** — values `[0, 4, 8, 12, 20, 26, 30]` match the printed table exactly (Rank 1=4, Rank 2=8, Rank 3=12, Rank 4=20, Rank 5=26, Rank 6=30). Verified by rendering the PDF page visually (NotebookLM's text-extracted values were garbled and the AI hallucinated a clean +4 progression of 4/8/12/16/20/24, which is **wrong**). Same cost column applies to Skills, Combat Proficiencies, Valour, and Wisdom. Do not "fix" this table — it is correct as-is.
- [x] **Shadow Tests on Dice tab** — new card with 3 buttons: 🌑 Dread (Valour vs Heart TN), 💰 Greed (Wisdom vs Wits TN), 🔮 Sorcery (Wisdom vs Wits TN). Tapping triggers a Valour/Wisdom roll via `quickRoll` with a `shadowTest` flag. Result summary shows a tag: "Reduce incoming Shadow by N (1 + N icons)" on success or "No reduction — full Shadow gain applies" on failure. Player manually adjusts the Shadow counter on Character tab. Misdeeds cannot be tested (RAW); the hint copy notes this.
- [x] **Harden Will button** in Hope card — clears all current Shadow to 0 and adds +1 permanent Shadow Scar. Disabled when shadow ≤ 0 or when (shadow + scars) ≥ hopeMax (only Bout of Madness can clear at that point). Confirm dialog explains the trade-off. Resets `char._boutPrompted` so future bouts can fire.
- [x] **Scars now count as Shadow for triggers** (per Core Rules p.137: "considered as a normal Shadow point for all purposes" except healing). `renderConditionWarnings` and `checkAutoTriggers` (Miserable + Bout of Madness) now compare `(shadow + scars)` to the appropriate threshold. `adj()` clamps `shadow + scars ≤ hopeMax` so further Shadow gain is blocked once the total cap is hit. If `hopeMax` is reduced below current `shadow + scars`, the overflow trims shadow first then scars.
- [x] **First Aid HEALING roll** — new red-bordered row appears below Injury input only when Wounded + injuryDays > 0. New char fields: `injuryDays` (number set from Severe-injury roll) and `firstAidUsed` (boolean). Roll Healing button fires a Healing skill roll; on success reduces `injuryDays` by `1 + icons` (min 1) and rewrites the Injury text to show the change. On success or fail, the attempt is marked spent. "↺ Reset (next day)" appears after a failed attempt so the player can retry once a day has passed in fiction. Wounded toggle OFF resets both fields.
- [x] **Pierce special damage** (Core Rules p.99) — after a successful attack roll with Swords/Bows/Spears + remaining ✦ icons + Feat < 10 + not Eye/Rune, an orange "🗡️ Pierce: spend 1 ✦" button appears below the result. Tap bumps Feat by +1 (Swords) / +2 (Bows) / +3 (Spears), caps at 10, decrements icons by 1, recomputes outcome/level/total, and re-renders the result. Chains automatically if there are still icons and Feat < 10. New `diceState.pendingPierce` holds the snapshot; `diceState.lastAttackProf` captures the prof on every attack quickRoll.
- [x] **Receive Support seg-buttons** on dice tab — new "Receive Support" 3-segment row (None / +1d / +2d Focus). Adds 1 or 2 success dice to the roll. Result tag shows "🤝 Supported by ally (+1d)" or "🤝 Supported by Focus-holder (+2d)". Auto-resets to None after each roll. Represents the receiving side of the Support action (the supporting ally spends 1 Hope on their own sheet).
- [x] **FP→Hope mini-button** in Hope card next to Fellowship Pts counter — spend 1 FP to gain +1 Hope (RAW: only during rest scenes, players agree on distribution). Confirm dialog shows the FP and Hope deltas. Caps Hope at hopeMax; blocked if Hope already at max or FP = 0.
- [x] **Strider Mode subsystem** — full solo-play variant per *The One Ring – Strider Mode* supplement.
  - **Foundation**: new `char.striderMode` flag + main-menu toggle. When enabled: PE budget 10→15, attribute TN formula 18−Rating (was 20−Rating), Fellowship Rating min 3, auto-adds free `Strider` Distinctive Feature ("Inspired on all Skill rolls while journeying"). Toggling re-runs TN calc on Strength/Heart/Wits.
  - **Eye of Mordor card** (Character tab, visible only in Strider Mode): Eye Awareness counter + Region picker (Border 18 / Wild 16 / Dark 14) + Hunt Threshold display + Revelation banner with auto-trigger when EA ≥ threshold. `resetEyeAwarenessToStarting()` computes from culture (Hobbits/Men 0, Dwarves 1, Dúnedain/Elves 2) + Valour 4+ +1 + per-Famous-item +1. Full 12-entry **Revelation Episode table** (Conflict brews / Safe Haven in peril / etc.) rolled via Feat die.
  - **Oracle tab** (visible only in Strider Mode): Telling Table (yes/no with 5 chance bands), Lore Table (12 Feat-die sections × 6 Success-die rows × Action/Aspect/Focus columns; ~216 distinct word combos), Fortune Table + Ill-Fortune Table (12 entries each). Oracle History card retains the last 30 rolls in dedicated localStorage.
  - **Skirmish stance** (5th stance, visible only in Strider Mode): Ranged-only attacks (−1d); melee weapons can't attack from Skirmish; escape combat with a ranged-attack roll.
  - **Gain Ground combat task** (Skirmish-stance-gated): ATHLETICS (or SCAN) → +1d on next ranged attack +1d per icon.
  - **Patron Quests** picker on Build tab — rolls 1d6 against the matched Patron's 6-entry quest table (6 patrons × 6 quests, per supplement).
  - **Experience Milestones** alternative: "🏆 Award Milestone XP" picker showing 10 milestones (Accept patron mission, Complete journey, Face Noteworthy Encounter, etc.) with the SP/AP award per RAW. `char.experienceMode` records which scheme the player is using.
  - **Backwards-compatible migration** — all new fields default cleanly for existing characters; toggle is opt-in.
  - **Solo Journey Events + Event Detail sub-tables** — when Strider Mode is on, `resolveJourneyEvent` uses the supplement's split ranges (4-7 Mishap / 8-9 Short Cut / 10 Chance-meeting; the core book has Mishap 4-9 and a combined Short-Cut/Chance-meeting at 10). After determining the main event, rolls a Success die for the **Event Detail** sub-table (7 tables × 6 entries each — e.g. "Stalking enemy → AWARENESS to spot the foul presence" under Terrible Misfortune). Sub-table specifies a different skill where appropriate (HUNTING/EXPLORE/AWARENESS) and the displayed `targetSkill` is overridden accordingly. **Noteworthy Encounter** results (Dire confrontation, Servants of the Enemy, Auspicious gathering, Peaceful sanctuary) are flagged with a red ⭐ NOTEWORTHY ENCOUNTER badge in the journey log — resolve as extended scenes with multiple rolls, possibly combat/council/endeavour.

  **Post-audit fixes (added after the 2026-05-27 audit):**
  - **Marching Test auto-rolls TRAVEL in Strider Mode** — `rollMarchingTest()` now skips the "you are not the Guide" manual-entry prompt when `char.striderMode` is true; the lone hero is treated as the de-facto Guide and TRAVEL is rolled inline (Heart TN, full Favoured/Miserable handling).
  - **All journey-event role coverage auto-applies in Strider Mode** — `resolveJourneyEvent()` sets `playerCovers = true` unconditionally when Strider Mode is on, so the "▶ You cover X: roll Y" highlight always fires regardless of which role the sub-table targeted.
  - **Journey Setup roles section hidden in Strider Mode** — the 4-role checkbox group is replaced by a gold-bordered hint explaining "no roles assigned — the lone hero handles all aspects of travel". Toggled by `refreshStriderUI`.
  - ~~**Solo Journey Events standalone roller**~~ — was added to Oracle tab, then moved to Journey tab, then **removed entirely** when the user pointed out it was redundant: `resolveJourneyEvent()` (the existing "🎲 Resolve Event Now" button on the Journey tab) already rolls the full Strider Mode flow — Feat die with the 4-7 Mishap / 8-9 Short Cut / 10 Chance-meeting split, plus the Event Detail Success-die sub-roll with Noteworthy Encounter flagging. The standalone card + `rollSoloJourneyEventStandalone()` function were deleted; users now use the in-journey resolver for both prep-time and in-play rolls (start a throwaway journey if you want to pre-roll).

  **Dark Mode inverted-bg fix (2026-05-27)** — three new semantic vars added because the existing `--ink`, `--red-dark`, `--amber-soft` invert to *lighter* values in dark mode, breaking white-text-on-bg contrast in ~44 sites (cancel buttons, alert badges, WEARY/DYING pills, Ill-Fortune button, NOTEWORTHY ENCOUNTER badges, Visiting-Treasury secondary buttons, etc.):
  - `--btn-secondary-bg` (light `#2a1810` / dark `#1b140d`) — cancel/secondary buttons (was `var(--ink)`)
  - `--btn-alert-bg` (light `#5d0e0e` / dark `#7a1a1a`) — alert/danger backgrounds (was `var(--red-dark)`)
  - `--btn-warn-bg` (light `#a86b00` / dark `#7a4f00`) — warning/amber backgrounds (was `var(--amber-soft)`)
  
  Bulk-replaced via Python: 26 sites of `background:var(--ink)`, 11 of `background:var(--red-dark)`, 7 of `background:var(--amber-soft)`. Also fixed Cancel button `border:1px solid var(--ink)` → `border:1px solid var(--btn-secondary-bg)`. The `color:`, `border-color:`, etc. uses of the original vars are unchanged — they were always correct in both modes.

  **Strider Mode known gaps (audited 2026-05-27 — all 5 settled 2026-05-27):**
  1. ✅ **Special Success spend table** — `renderSpecialSuccessPanel(icons)` appears below the result summary on any Strider-Mode success roll with ≥1 ✦ icon. 6 buttons (Gain Insight / Go Quietly / Make Haste / Widen Influence / Build Advantage / Cancel a Failure) with full tooltips. Spending decrements the icon counter. **Build Advantage** queues `diceState.queuedAdvantage++`, which adds +1d on the next roll (resets after). Other spends log to roll history as narrative.
  2. ✅ **Auto Fortune / Ill-Fortune prompt** — `rollDice()` checks for Rune+success or Eye+fail at the end of a Strider Mode roll and injects a one-tap "🎲 Roll Fortune/Ill-Fortune Table" button below the summary. Tapping rolls inline via the same FORTUNE_TABLE / ILL_FORTUNE_TABLE constants the Oracle tab uses, appends the result as a tag, and (for Fortune Eye/Ill-Fortune Eye) bumps Eye Awareness per supplement.
  3. ✅ **Auto-Inspired during Journey** — `quickRoll()` auto-sets `diceState.inspired = true` with source `'Strider (Journey)'` when `striderMode && journey.active && !isProf && !isMeta` (Skill rolls only). Only fires if the player hasn't already chosen a different Inspired source manually. The Strider Distinctive Feature now actually does something.
  4. ✅ **Eye-Awareness auto-increment hooks** — three sites, now gated on **`isSolo()`** so they fire in **both Strider and Moria** (were `striderMode`-only until 2026-05-31):
     - `rollDice()` (post-roll): +1 EA when `isSolo() && !isAttack && (Eye or Rune)`; +1 EA on Magical Success. Tag shown in result; now `saveCharacter()`-persisted (the earlier no-save was a latent bug). The auto Fortune/Ill-Fortune prompt is likewise `isSolo()`-gated.
     - `adj('shadow', delta>0)`: in either solo mode, EA rises by the actual Shadow gain (capped by Shadow cap). Player can manually decrement if the Shadow was from combat.
     - `rollAutoFortune`: Fortune Eye → −1 EA; Ill-Fortune Eye → +2 EA per supplement (Moria reuses these tables).
  5. ✅ **Fellowship Focus suppression** — `refreshStriderUI()` hides the Focus picker row + the "Spend 1 Hope to support" hint when Strider Mode is on, and surfaces a gold-bordered "no Fellowship Focus — Support action does not apply" hint in its place.
- [x] **Native dialog migration completed (incremental → full)** — 101 → 0 native confirm/prompt calls.
  - **All ~25 remaining `confirm()` calls** swapped to `await confirmStyled(...)` via a Python regex pass; their enclosing functions converted to `async`.
  - **All 6 `prompt()` calls** swapped to `await promptStyled(...)` (new helper added — input modal with OK/Cancel that distinguishes OK from Cancel via `b.cancel: true` on the Cancel button).
  - **3 `setTimeout(() => ...)` callbacks** that contain inline confirms (Bout of Madness flaw picker, SoL auto-promote in `adj`, SoL auto-promote in `hoardTakeTreasureShare`) converted to `setTimeout(async () => ...)`.
  - **1 inline `onclick` arrow** (the Wounded condition toggle in `bindInputs`) converted to `async` for the inline await.
  - **1 function added to async list** (`applyBackstory` — wasn't in the first migration pass).
  - Python audit script verifies all `await` calls live inside async contexts: **0 issues**.
  - **`CACHE_VERSION` in `sw.js` bumped from `tor2e-v1` → `tor2e-v2`** so existing PWA users get the styled-dialog version on next visit.
- [x] **Native dialog migration to styled modals** — closes the polished-UI gap (initial pass — 63 alerts + 8 high-impact confirms).
  - **All 63 `alert()` calls** now render as styled modals via a one-shot **`window.alert` monkey-patch**: `_alertQueue` + serial processing → `alertStyled(msg)`. Caller code unchanged (alert is fire-and-forget; sequential alerts queue cleanly). HTML-escape applied so user content can't inject markup; `\n` converted to `<br>`. Native fallback preserved as `window._nativeAlert` for edge cases.
  - **8 high-impact `confirm()` calls migrated** to `confirmStyled` (manually, callers converted to async):
    - `awardSessionXP` (📜 End Session)
    - `hardenWill` (🔥 Harden Will — Shadow → Scar)
    - `cancelCouncil`, `cancelSkillEndeavour`, `endJourney` (cancel-mid-flow dialogs)
    - `arriveAtDestination` (🏁 Journey arrival)
    - `takeShortRest` (☀️ Short Rest)
    - `removeMagicalItem` (destructive)
  - **Remaining ~24 confirms + 6 prompts left native** by design: they appear in low-frequency code paths (build-tab pickers, reset flows, manual marching-test entry, etc.) and converting their callers to async would cascade through many sites with limited UX gain. Future migration is incremental and follows the demonstrated pattern.
  - **Note for service worker bump**: bump `CACHE_VERSION` in `sw.js` (currently `'tor2e-v1'`) on next deploy so users get the styled-modal version instead of the cached shell.
- [x] **Cursed Items + Treasure Index** (Core Rules pp.165-167) — closes the last narrative gaps in the Treasure subsystem.
  - **Cursed Items**: Add Magical Item modal gains a "⚠️ Cursed item" checkbox + curse-type dropdown (Shadow Taint / Owned / Marked). On Add: stores `cursed: true` + `curseType` on the item, surfaces the chosen curse-type in a follow-up alert with the RAW consequence. Cursed items render with a 2px red-dark border + ⚠️ CURSED badge (showing curse type) in the magical-items list.
  - **Shadow Taint auto-application in FP wizard**: step 2 now shows a red preview panel listing all Shadow-Tainted items and the +N Shadow that will apply this phase. On Apply Recovery, the taint is added after the player's chosen Shadow Removal, capped at hopeMax−scars per existing Shadow caps. Recovery summary shows the taint gain with the items' names.
  - **Treasure Index**: new `TREASURE_INDEX` constant with 15 canonical Middle-earth items — Glamdring, Orcrist, Sting, Andúril, Bilbo's Mithril Coat, Helm of Hammerhand, Phial of Galadriel, Arkenstone, Horn of Boromir, Elven Cloak, Elven Rope, Cram, Black Arrow, Horn of the Mark, Drinking Horn of Thranduil. Each entry has type, craftsmanship, qualities/blessings (with full RAW descriptions), and lore notes. New "📖 Pick from Treasure Index" button in the Add Magical Item modal opens a picker overlay; selecting an item pre-fills the entire form (type-aware, so Blessings or Famous qualities populate correctly), player can edit anything before tapping Add Item.
- [x] **Comprehensive var-isation of inline hex colours** — completes the dark-mode polish. Added ~13 new semantic vars to `:root` (light) + `body.dark` (dark): `--gold-soft`, `--gold-paler`, `--red-soft`, `--success-bg`, `--success-text`, `--error-bg`, `--error-text`, `--warn-orange`, `--amber-soft`, `--green-soft`, `--brown-soft`, `--text-muted`, `--text-faint`, `--pure-white`, `--rest-blue`, `--warn-yellow`. Replaced ~150 inline hex references throughout the HTML body, JS template strings, and CSS class rules with the semantic vars. Removed the band-aid attribute-selector overrides (`body.dark [style*="background:#fff8e1"]` etc.) that were previously bolting dark mode onto hardcoded panels. Only remaining hex literals are: (1) the icon SVG data URIs in `<link>` tags (intentionally raw — they're inside a URL value); (2) two dark-mode form-control overrides (`background: #1b140d` / `#14100a`) that hard-set form colors against the parchment palette. Result: dark mode now renders consistently across all cards, modals, tags, buttons, and JS-generated UI without per-element overrides.
- [x] **Polish bundle — Brawling + Dark Mode + Styled Modals**:
  - **Brawling proficiency** (Core Rules p.45) — added to the quick-roll grid as a derived prof. Rating = `max(Axes, Bows, Spears, Swords) − 1`, computed live via `getBrawlingRating()`. Not stored in `char.profs`. Shown with a small "(der)" tag and tooltip explaining the derivation. Use for Unarmed / Dagger / Cudgel / Club weapons.
  - **Dark mode** — auto via `@media (prefers-color-scheme: dark)` when no manual preference, with a manual toggle button in the main menu ("🌙 Toggle Dark Mode" / "☀️ Toggle Light Mode"). Preference persists in `localStorage` under `tor2e-theme` (`'light'` / `'dark'` / unset = auto). New CSS vars: `--card-bg`, `--ink-soft` joined the existing palette. Dark palette is a Tolkien-esque deep-parchment brown (`#1b140d` / `#261c12` / `#2a1f15` with gold accents `#d4a635` and softened red `#c44545`). Pragmatic overrides catch the most common hardcoded panel hexes (`#fff8e1`, `#f4e8e8`, `#fffaef`, `white`) via attribute selectors; comprehensive var-isation of every inline style remains a follow-up polish. `theme-color` meta updates so the iOS status bar matches.
  - **Styled modal infrastructure** — new `showModal({title, message, buttons[], input?})` Promise-based helper + `confirmStyled(msg)` / `alertStyled(msg)` convenience wrappers. Matches the existing menu-overlay aesthetic, looks better than native iOS alerts. **Honest scope:** the infrastructure is in place; existing native `confirm()`/`alert()`/`prompt()` calls are left as-is to avoid a cascading sync→async refactor. New features should use the styled helpers. Migration of existing dialogs can happen incrementally.
- [x] **Experience awards enforcement** (Core Rules pp.55, 119):
  - **📜 End Session button** in the Character tab Advancement card. Confirm dialog → +3 SP + 3 AP per RAW p.55. Brief recap alert.
  - **`char.fpModeActive` boolean + `char.fpSpend = { skills:{}, profs:{}, valour:0, wisdom:0 }`** — tracks per-current-FP spending. Reset on `openFPWizard`; preserved (but `fpModeActive = false`) on `fpClose`/`fpComplete` so the player can review.
  - **Spend XP modal enforcement**: when `fpModeActive`, each rank purchase is gated through `fpSpendBlocker(group, label)`:
    - Skill: blocks if that Skill was already raised this phase
    - Combat Prof: blocks if that Prof was already raised
    - Valour: blocks if Wisdom was already raised this phase
    - Wisdom: blocks if Valour was already raised
  - Blocked rows show "🔒 FP" with a reason hint underneath. Modal header surfaces an FP-mode banner with current spend summary.
  - **Out of FP mode**: no caps (current looser behaviour preserved), with a hint noting "per RAW XP is only spent in FP — use the FP wizard for rule-correct play".
- [x] **iOS Home Screen icon refreshed** — replaced the basic inline SVG with a richer design: gold One Ring (gradient stroke) on a cream-parchment radial-gradient background, white highlight arc on the upper-left for polished-metal gleam, four small dark-red compass dots at N/E/S/W, "TOR" in bold serif dark red centered, "2E" subtitle below in tracked letter-spacing. Provided three `<link rel="apple-touch-icon">` tags (default + sizes="152x152" iPad + sizes="167x167" iPad Pro) plus a `<link rel="icon">` favicon all sharing the same inline data URI. SVG scales perfectly — iOS rasterises it cleanly at any required home-screen size (60/120/180px).

- [x] **Full PWA install (manifest.json + service worker)** — Android Chrome now meets the "Add to Home Screen" install criteria; iOS continues to work via the existing apple-touch-icon path but now also caches offline via the service worker. New sibling files added next to `index.html`:
  - **`manifest.json`** — name, short_name "TOR2E", start_url `./index.html`, scope `./`, display `standalone`, theme/background `#f5ecd9`, 5 icon entries (192/512 PNG with `purpose: any`, 192/512 PNG with `purpose: maskable`, and the SVG with `sizes: any`).
  - **`sw.js`** — cache-first service worker. `CACHE_VERSION = 'tor2e-v1'` (bump on each deploy). Install event pre-caches the 6 critical files; activate cleans up old caches and claims clients. Fetch handler is GET-only, same-origin only, caches successful responses, and falls back to the cached HTML shell when offline + uncached HTML requested.
  - **`icon-192.png`** (42 KB) and **`icon-512.png`** (231 KB) — rasterised from the SVG via `qlmanage` for Android Chrome's "PWA install" criteria (Chrome currently requires raster icons in some Android versions; SVG works for many but PNGs guarantee install eligibility everywhere).
  - **`icon.svg`** (1 KB) — the source SVG, also referenced by manifest with `sizes: "any"` for scalable rendering.
  - **HTML changes**: added `<link rel="manifest" href="manifest.json">` in head; added a `navigator.serviceWorker.register('sw.js')` block at the end of the main script, gated on http/https protocol (skipped for file:// previews).

### Deploying on iOS / Android (Add to Home Screen)

**Deploy bundle** — for hosted install, you need these files together at the same path:
- `index.html` (canonical mirror of `character-tracker.html`)
- `manifest.json`
- `sw.js`
- `icon-192.png` · `icon-512.png` · `icon.svg`

**Netlify (recommended):** drop the project folder onto Netlify (or `git push` if you've set up a git-linked site). All 6 files deploy as a unit; the service worker auto-registers on first visit.

**iOS Safari install:** open the deployed URL → Share → Add to Home Screen → confirm. Launches standalone (no Safari chrome) thanks to `apple-mobile-web-app-capable=yes`. The apple-touch-icon SVG renders crisp at 60/120/180px. Offline works after first load (SW caches the shell + manifest + icons; localStorage persists character data across launches).

**Android Chrome install:** open the deployed URL → Chrome surfaces an "Install app" prompt (or use the ⋮ menu → "Add to Home screen"). Manifest + working SW + maskable icons satisfy the installable-PWA criteria. Same offline behaviour.

**Direct / file:// preview:** open `index.html` from iCloud Drive or local disk; everything works *except* the service worker (browsers block SW registration on `file://`). For just-on-this-device use, iOS Add-to-Home-Screen still works from Files-app-launched Safari and uses the apple-touch-icon — offline is then handled by Safari's normal page cache + localStorage.

**Updating the deployed bundle:** when you push new code, bump `CACHE_VERSION` in `sw.js` (e.g. `'tor2e-v2'`) so old clients drop their stale shell and pull the new one on next visit. The activate handler garbage-collects the old caches.
- [x] **Famous Weapon dormant qualities flow** (Core Rules pp.162-165) — extends Treasure subsystem:
  - New `ENCHANTED_REWARDS` constant catalog: 7 Enchanted Rewards (Ancient/Superior Cunning Make, Cleaving, Flame of Hope, Foe-Slaying, Superior Fell, Reflective) + 6 ordinary Rewards (Close-fitting, Cunning Make, Fell, Grievous, Keen, Reinforced). Each has a condensed RAW description.
  - **Add Magical Item modal — Famous variant** now shows a 3-slot quality picker. Slot 1 is gold-bordered with "ACTIVE on find" badge; slots 2-3 are grey "DORMANT". Each slot has a dropdown (auto-fills name + description from the catalog) plus name and description text inputs for custom entries.
  - **Saved on item:** `qualities: [{ name, description, active }]`. First quality auto-active. Load-time migration backfills `qualities: []` on pre-existing Famous items.
  - **Display:** the magical-items list now renders each Famous item's qualities as colored rows (gold/active vs grey/dormant) with description lines. If any dormant exist, a "🔓 Unlock Next Dormant Quality (N left)" button appears.
  - **Manual unlock**: tap the Unlock button → prompt explains the two RAW methods (new Valour rank or Visiting the Treasury), player enters 1 or 2 → next dormant quality flips to active, confirmation alert.
  - **Fellowship Phase wizard integration**: when "Visiting the Treasury" is one of the chosen undertakings, fpComplete now surfaces a picker listing all Famous items with dormant qualities. Player picks one to unlock; quality activates and FP completion log records the gift + activation. If no Famous items have dormant qualities, falls back to narrative-only with an explanatory log entry.
- [x] **Treasure subsystem** — Magical Treasure framework per Core Rules pp.158-167. New `char.magicalItems[]` data model (with `{type, name, blessings, craftsmanship, notes}`) + load migration. New gold-bordered "✨ Magical Treasure" card on the Gear tab with item list + Roll Hoard / Add Magical Item buttons.
  - **🎲 Hoard Roller modal**: tier picker (Lesser/Greater/Marvellous) with correct dice counts per RAW (1/2/3 Success dice × party size for Treasure; 2/4/6 Feat dice for magical), party size input, ⚠️ Tainted Hoard toggle. Rolls Treasure points (per-hero share displayed), rolls Magical Treasure dice (Eye/Rune = magical find; Success die determines type 1-3 Marvellous Artefact / 4-5 Wondrous Item / 6 Famous Weapon). "Take My Share" button awards Treasure (uses SoL auto-promote logic). "Take Item" button per find launches the Add Magical Item modal pre-populated with type + tainted flag.
  - **+ Add Magical Item modal**: type dropdown, name, craftsmanship dropdown (Mannish/Elven/Dwarven/Númenórean variants), Blessing skill picker(s) — 1 for Marvellous, 2 for Wondrous, none for Famous (recorded in Notes), tainted-hoard checkbox. On Add: appends to `char.magicalItems`, adds +1 Load via `otherLoad`. If tainted: prompts for Greed Shadow Test (Wisdom vs Wits TN, +1/+2/+3 Shadow by type per RAW p.158); success reduces gain by 1+icons. Both test+full-gain options surfaced.
  - **Auto +2d on Blessing match in `quickRoll`**: when rolling a Skill matched by an owned Marvellous/Wondrous item's Blessing, success dice +2 and a "✨ {item} Blessing +2d" tag appears in result. Magical Success becomes available for that roll per RAW.
  - **Magical item list display** on Gear tab: emoji-tagged (✨ / 💎 / ⚔️), shows type/craftsmanship/Blessings/notes, × button to remove (also reduces Load by 1).
  - **Honest scope:** Famous Weapon/Armour dormant qualities and Visiting Treasury unlock flow are narrative-only (notes field). Treasure Index (Loremaster pre-prepared item list) not modeled. Cursed Items (Shadow Taint, Owned) not modeled mechanically — narrative only.
- [x] **Combat polish bundle** — three combat features per Core Rules pp.93-99:
  - **Foe Parry input on Combat tab** — counter next to Engaged Foes. Stored in `diceState.foeParry`. When an attack roll fires (`isAttack`), effective TN = `strTN + foeParry`. Result summary shows the breakdown: "vs TN 16 (14 Str + 2 Foe Parry)".
  - **Two-handed grip toggle on War Gear** — versatile weapons (Long Sword, Spear, Long-hafted Axe — those with "/" in Injury) now store `inj1h` and `inj2h` separately. A small grip toggle button appears next to the weapon name on the War Gear row: tap to swap between 1h (lower Injury, may use shield) and 2h (higher Injury, no shield Parry bonus). The Injury column auto-updates; weapon notes are annotated with `(currently 1h/2h)`.
  - **🏃 Fly, You Fools! button** in the Stance card. Opens a 2-choice prompt explaining RAW p.95 escape rules: (1) Rearward stance = auto-escape on next turn no roll, (2) Defensive stance = attack roll, success = escape with no damage dealt, failure = remain engaged. Picking either sets the stance automatically.
- [x] **Brave at a Pinch RAW fix + Inspiration state** — per Core Rules p.20: Inspired doubles the +1d Hope bonus to +2d; Inspired alone (no Hope spend) has no effect. Replaced `diceState.brave` (old +2d flat, no Hope cost) with `diceState.inspired` + `diceState.inspiredSource` ('Brave at a Pinch' | 'Distinctive Feature'). Bonus math: `hopeBonus = hopeSpend ? (inspired ? 2 : 1) : 0`. Updated UI: Brave at a Pinch button now reads "🌲 Brave at a Pinch — Inspired (next Hope spend = +2d)" and only shows when Bardings virtue + Weary/Miserable/Wounded conditions are met; added a new "✨ Invoke Distinctive Feature — Inspired (next Hope spend = +2d)" button always visible below it (RAW: DF invocation is a generic Inspiration source). Result summary shows green Inspired tag when both Inspired and Hope-spend are active, or a grey "no Hope spent, so no bonus this roll" hint when Inspired but no Hope is spent. History label uses the source emoji (🌲 or ✨). Reset cleanly at end of each roll.
- [x] **Resting buttons** (Core Rules p.71) — two buttons under the Endurance counters on Character tab:
  - **☀️ Short Rest** (orange) — recovers `+STRENGTH` Endurance (capped at Max). Blocked entirely if Wounded ("no Endurance recovered" per RAW). Confirm dialog shows the projected End delta.
  - **🌙 Prolonged Rest** (blue) — recovers full Endurance (or `+STRENGTH` only if Wounded), plus +1 Hope if Hope was at 0. If `char.fatigue > 0`, asks "Are you resting in a Safe Haven?" and clears 1 Fatigue on Yes (per RAW: lingering Travel Fatigue clears 1/Prolonged Rest in a Safe Haven only). Recap alert shows the changes.
- [x] **SoL auto-promote** — when `char.treasure` crosses a Standard-of-Living threshold (30/90/180/300 per Core Rules p.73), `adj()` prompts to upgrade. Only promotes upward; never auto-downgrades. Uses `SOL_THRESHOLDS` and `SOL_RANK` constants.
- [x] **Give-side Support button** — "🤝 Support Ally" mini-button below Hope counter on Character tab. Confirm dialog notes the +1d default and +2d if the supporter has the ally as Fellowship Focus, decrements Hope by 1. Mirrors the existing Receive Support seg-buttons on the dice tab.
- [x] **4-Flaws-succumb enforcement** (Core Rules p.141) — Bout of Madness handler now detects whether all 4 path Flaws are already present in `char.flaws`. If yes, the hero succumbs instead of getting another bout: sets `char.retired = true` + `retiredReason`, surfaces a culture-aware fate message (Elves → "sailed for Valinor", others → "lost to madness"), and shows a permanent **RETIRED** pill in the header next to the character name. The bout flaw-picker also now excludes already-owned flaws (so the player can't accidentally double up). Bout trigger guard skips entirely when `char.retired` is true (no further bouts after retirement).
- [x] **Skill Endeavour tracker** — added as a second section on the Council tab (below the Council cards, separated by a gold divider labelled "Skill Endeavour"). Full prolonged-task system per Core Rules p.131. New `char.skillEndeavour` object: {active, task, resistance, timeLimit, riskLevel, attemptsUsed, successesScored, rolls[], outcome}. Backwards-compatible load migration. Three cards:
  - **Setup**: task text, Resistance 3-segment (Simple 3 / Laborious 6 / Daunting 9) with rule hints, Time Limit 4-segment (3 Not enough / 4 Short / 5 Enough / 6 Plenty), Risk Level 3-segment (Standard / Hazardous / Foolish) with consequence hints.
  - **Active**: two progress bars, full 18-skill picker grid (str/hrt/wit skills with rating + Favoured highlight), Roleplay Bonus picker (None / +1d / +2d, resets after each attempt). Each successful attempt contributes `1 + icons`. Failure-with-Woe consequences auto-flagged in roll log when Risk = Hazardous. End-of-Endeavour outcomes branch by Risk Level: Standard → Simple Failure OR Success-with-Woe (player choice); Hazardous → Failure-with-Woe (woes already accumulated per failed roll); Foolish → Disaster! (cannot resume).
  - **Log**: scrolling roll history with contribution/woe tags.
  - Reuses `_doInlineRoll` and the same Miserable+Eye handling. Tab name kept as "Council" — happy to rename to "Endeavours" if you'd prefer (both Council and Skill Endeavours fit under the same conceptual umbrella).
- [x] **Council tracker (new Council tab)** — full Social Encounter system per Core Rules pp.104-108. New `char.council` object holds {active, topic, resistance, attitude, introRolled, timeLimit, attemptsUsed, successesScored, rolls[], outcome}. Backwards-compatible load migration. Three cards on a new Council tab:
  - **Setup**: topic text field, Resistance 3-segment (Reasonable 3 / Bold 6 / Outrageous 9) with rule-hint per choice, Audience Attitude 3-segment (Reluctant −1d / Open / Friendly +1d) with rule-hint, Begin button.
  - **Active**: two progress bars (Successes / Resistance + Attempts / Time Limit), Introduction phase with 3 useful-skill buttons (AWE / COURTESY / RIDDLE) — fail sets Time Limit to 3, success to 4 + icons; Interaction phase with 5 useful-skill buttons (ENHEARTEN / INSIGHT / PERSUADE / RIDDLE / SONG) and a 3-segment Roleplay Bonus picker (None / Relevant +1d / Brilliant +2d, resets after each attempt); all rolls auto-apply Attitude as ±1d. Each successful Interaction attempt contributes `1 + icons` toward Resistance. End-of-Council screen surfaces automatically when Resistance is met (auto Success) or time runs out (Accept Failure / Success-with-Woe choice).
  - **Log**: scrolling roll history with intro/contribution tags, success/fail color coding, roleplay-bonus annotation.
  - Uses the shared `_doInlineRoll(successDice, fav, tn)` helper (originally built for Journey) — Miserable+Eye still auto-fails.
- [x] **Fellowship Phase wizard** — 4-step modal (Type → Spiritual Recovery → Updates → Undertakings) per Core Rules pp.117-123.
  - **Step 1 — Type:** Ordinary or Yule. Yule unlocks Yule-only undertakings and triggers extras.
  - **Step 2 — Spiritual Recovery:** auto-recovers +HEART Hope (or full at Yule), prompts for Shadow removal (0/−1/−2/−3 based on Adventuring Phase outcome). Yule extras applied automatically: age +1, +WITS bonus Skill Points, all Hope restored. Resets `activeFPBonuses` (so previous phase's Strengthen Fellowship and Ponder Maps expire) and clears `songs[].used` flags for the next Adventuring Phase.
  - **Step 3 — Updates:** displays current SP/AP pools and reminds player of the RAW caps (1 rank per Skill/Prof, Valour XOR Wisdom). Player closes wizard to use existing Spend XP modals; wizard state is preserved.
  - **Step 4 — Undertakings:** all 10 undertakings shown with FREE-Calling indicator and YULE badge where applicable. Limit enforcement: max 1 main non-Yule + max 1 free non-Yule + any number of Yule-only picks. Mechanical effects applied on Complete: Strengthen Fellowship (+1 FP Rating until next FP), Ponder Maps (sets flag for Journey integration), Heal Scars (−5 AP, −1 Scar), Raise an Heir (configurable AP+Treasure spend → heir PE), Write a Song (adds to `char.songs[]` with type/title/lyrics). Narrative-only undertakings (Gather Rumours, Meet Patron, Study Magical Items, Visiting Treasury, Recount a Story) just log to the completion summary.
  - **Trigger:** "🌿 End Adventuring Phase" gold button in the Advancement card on the Character tab, with a small "active bonuses" status line and a phases-completed counter.
  - **Ponder Maps integration:** when `activeFPBonuses.ponderMaps` is true, Journey event Feat die gets +1 (Eye → Despair, otherwise +1 to numeric value, capped at 10; Rune unaffected). Event log shows "🗺️ Ponder Maps +1" tag.
- [x] **Journey tracker (new tab)** — full Adventuring-Phase journey system per Core Rules pp.108-115. New `char.journey` object holds all state (`active`, `origin`, `destination`, `totalHexes`, `hardTerrainHexes`, `currentHex`, `season`, `region`, `forcedMarch`, `mounted`, `mountVigour`, `roles {guide,hunter,lookout,scout}`, `travelFatigue`, `daysElapsed`, `events[]`, `nextEventHex`). Backwards-compatible load migration. Three cards on the Journey tab:
  - **Setup**: origin/destination text, total + hard-terrain hex inputs, Season + Region dropdowns, Forced March + Mounted + Mount Vigour, my-role checkboxes, Start/Cancel buttons.
  - **In Progress**: progress bar showing currentHex/totalHexes, Days Elapsed / Travel Fatigue / Next Event counters, **Marching Test** button (rolls TRAVEL inline as Guide, or prompts manual entry if not Guide — applies hex advance based on success/icons or season-fail rules; advances days incl. hard-terrain bonus; Forced March halves time and adds Fatigue), **Resolve Event** button (enabled when at next event hex — rolls success die for target role/skill, rolls region-modified Feat die for the event from p.112 table: Terrible Misfortune/Despair/Ill Choices/Mishap/Short Cut/Joyful Sight — applies +Fatigue, surfaces effect description, highlights whether you cover the targeted role), **Arrive at Destination** (mount Vigour reduction → TRAVEL roll → lingering Fatigue added to character Fatigue counter).
  - **Log**: scrolling event log per journey (day + hex prefix).
  - Inline `_doInlineRoll(successDice, fav, tn)` helper does dice without going through the Dice tab — keeps the player on the Journey tab for the whole journey loop.

### Core Rules coverage matrix (snapshot from 2026-05-23 notebook audit)
Audit cross-referenced the full Core Rules table of contents against the app. Coverage by subsystem:

| Subsystem | App coverage | Notes |
|---|---|---|
| Action Resolution / dice | ~99% | ✅ Inspiration as a state (RAW p.20) + Invoke-Distinctive-Feature button added. ✅ Favoured/Ill-Favoured auto-cancellation per RAW p.20 — `effectiveFav()` layers `autoFavSources` + `autoIllSources` against manual pick; matching opposite sources cancel to Normal with hint + result tag. Remaining gap: Repeating-a-Roll rules not enforced (probably correct to leave as player-tracker behaviour). |
| Character Creation | ~98% | ✅ SoL auto-promote added (prompts on Treasure crossing 30/90/180/300). |
| Combat (player side) | ~99% | ✅ Combat Tasks + Pierce + Foe Parry TN modifier + 2-handed grip toggle + Fly You Fools escape added. ✅ **Opening Volleys added** — a 🏹 toggle on the Combat tab's Protection/Parry card (`char.openingVolley` / `toggleOpeningVolley()`): when the hero is the aware target of a ranged volley, `renderProtectionParry()` surfaces a "Parry vs ranged" value with the shield's Parry bonus **doubled** (Core Rules p.93). |
| Conditions | ~95% | |
| Skills | ~95% | |
| Shadow | ~99% | ✅ Shadow Tests + Harden Will + Scars-as-Shadow + 4-flaws-succumb retirement added. ✅ **Despair Ill-Favoured added** — `shadowDespairActive()` makes every Feat die Ill-Favoured (dice tab `quickRoll`/`rollDice` + inline Journey/Council/Endeavour rolls) when Shadow+Scars ≥ Max Hope, layered against Favoured per RAW p.20; result summary shows a "⚠ Ill-Favoured: Despair" tag. ✅ **Shadow-Test apply added** — a successful (or failed) Shadow Test result now shows an "Incoming Shadow" input + **Apply Shadow** button (`applyShadowTestResult(reduction)`): applies `max(0, incoming − reduction)` through `adj('shadow', …)` so caps, Bout/Miserable triggers, the solo Eye-Awareness hook, and undo all apply. |
| Journey | ~88% | ✅ Full Journey tab added. Roles, hex path, Marching Tests, Event Target + Journey Events table, terrain/season modifiers, Forced March, Mounted/Vigour, Arrival TRAVEL roll, lingering Fatigue → regular Fatigue, event log. ✅ **Perilous Locations added** — a Peril rating (journey setup) queues N extra Journey Events resolved via a red "🎲 Resolve Peril Event" button independent of the hex path; peril events are tagged ⚠️ [Peril] in the log (`resolveJourneyEvent(isPeril)`). Still missing: supplement-specific event tables (Rivendell etc.), per-hero Fatigue distribution (single-character app only tracks this hero). |
| Council | ~93% | ✅ Full Council tab added. Resistance 3/6/9, Audience Attitude ±1d, Introduction roll sets Time Limit, Interaction phase with 5 skill buttons + Roleplay Bonus picker, auto-end at Resistance met or Time Limit exhausted, Success/Failure/Success-with-Woe outcomes, roll log. ✅ **In-council Companion Support added** — `toggleCouncilSupport()` arms +1d on the next Interaction roll (one-shot). ✅ **Persistent council history added** — `char.councilHistory[]` keeps a summary of every closed council (topic/outcome/successes/attempts/day) in a "Past Councils" card with a clear button. Still missing: supplement-specific council bonuses. |
| Fellowship Phase | ~98% | ✅ Full 4-step wizard + 1-rank/Skill, 1-rank/Prof, Valour-XOR-Wisdom **enforced** in Spend XP modal during FP mode. +Heart/full Hope recovery, Shadow removal prompt, Yule extras (age +1, +WITS SP, full Hope), all 10 Undertakings with Calling-free indicators, mechanical effects for Strengthen Fellowship / Ponder Maps / Heal Scars / Raise an Heir / Write a Song / Visiting Treasury (dormant-quality unlock). Still missing: phase-duration mechanics (week-to-season window). |
| Treasure & Magical Items | ~99% | ✅ Hoard Roller, Treasure share with SoL auto-promote, Magical Treasure rolls, Add Item modal with Blessings + Famous quality picker, +2d auto on Blessing matches, Greed Shadow Test on tainted finds, Load +1 per item, Famous Weapon dormant-quality activation flow (manual Unlock + Visiting-Treasury integration), **Cursed Items** (Shadow Taint / Owned / Marked with red-border display + ⚠️ badge + Shadow-Taint auto-application in FP recovery), **Treasure Index** (15 curated canonical items: Glamdring/Orcrist/Sting/Andúril/Phial of Galadriel/etc., one-tap pre-fill of the Add modal). Effectively content-complete for player-side use. |
| Eye of Mordor | ~95% | ✅ Implemented for **both solo modes** (Strider + Moria; visible when either is toggled). Eye Awareness counter, Region picker (Border/Wild/Dark) with auto threshold (18/16/14 ± Hunt mods), Hunt-threshold banner, full 12-entry Revelation Episode table, reset-to-starting helper (culture + Valour + Famous items). ✅ **Auto-increment hooks now fire in both solo modes** (were Strider-only, gated `char.striderMode`; now `isSolo()`): `rollDice()` +1 EA on Eye/Rune outside combat (`!isAttack`) and +1 on Magical Success (now also **persisted** via `saveCharacter()` — was a latent no-save bug); `adj('shadow', +n)` raises EA by the actual Shadow gain; the auto Fortune/Ill-Fortune prompt + `rollAutoFortune` apply Fortune-Eye −1 / Ill-Fortune-Eye +2. Manual ± buttons remain for combat-sourced Shadow the player wants to exclude. |
| Skill Endeavours | ~93% | ✅ Full Skill Endeavour section added to the Council tab. Resistance 3/6/9, Time Limit 3/4/5/6, Risk Level Standard/Hazardous/Foolish with branching outcomes, full 18-skill picker, Roleplay Bonus, auto-end at Resistance met or Time Limit exhausted. ✅ **Failure-with-Woe now auto-applies** — a failed Hazardous roll auto-applies +2 Fatigue (+1 Shadow on an Eye die) and logs it; a failed Foolish roll ends the endeavour immediately as a Disaster (`finalizeSkillEndeavour('disaster')`). Still missing: per-task progress persistence across the Adventuring Phase. |
| Resting/Healing | ~90% | ✅ Short Rest + Prolonged Rest buttons added with full RAW behaviour (Wounded reduction, 0 Hope → +1 on PR, Safe Haven Fatigue clearing). First Aid HEALING roll with day-countdown. ✅ **Day-tracker added** — `char.dayCount` + `char.shortRestUsedToday`: one Short Rest per day (override-able); a Prolonged Rest is the night's sleep that advances the day, clears the Short-Rest flag, and ticks a Wounded hero's `injuryDays` down by 1 (re-enabling First Aid). Status line on the Endurance card shows "📅 Day N · Short Rest available/used · 🩹 N injury days left". Still missing: nothing material for single-character play. |
| Experience awards | ~95% | ✅ End-Session button (+3 SP / +3 AP per RAW p.55). Yule WITS bonus already auto-applied via FP wizard step 2. Spend XP modal now enforces 1-rank-per-skill, 1-rank-per-prof, Valour-XOR-Wisdom when Fellowship Phase mode is active. Still missing: granular per-hour rate (1 SP+AP/hour, or 1.5/hour for fast-paced) — would need a session-timer; players can just tap End-Session button multiple times or adjust counters manually. |

**Recommended next features (in priority order):** 1. ~~Journey tracker~~ ✅ done · 2. ~~Combat Tasks~~ ✅ done · 3. ~~Council tracker~~ ✅ done · 4. ~~Fellowship Phase wizard~~ ✅ done · 5. ~~Shadow Test button~~ ✅ done · 6. ~~Harden Will~~ ✅ done · 7. ~~First Aid HEALING roll~~ ✅ done · 8. ~~Pierce special damage~~ ✅ done · 9. ~~SoL auto-promote~~ ✅ done · 10. ~~Fellowship Point support spend~~ ✅ done (as Receive Support + FP→Hope). · 11. ~~Skill Endeavours~~ ✅ done. · 12. ~~Give-side Support~~ ✅ done. · 13. ~~4-Flaws-Succumb~~ ✅ done. · 14. ~~Resting buttons~~ ✅ done · 15. ~~Brave at a Pinch RAW fix + Inspiration state~~ ✅ done · 16. ~~Combat polish (Foe Parry / 2h grip / Fly You Fools)~~ ✅ done · 17. ~~Treasure subsystem~~ ✅ done. · 18. ~~Famous Weapon dormant qualities flow~~ ✅ done.

### 🟢 Priority 3 — UX polish
- [x] **Dark mode** — auto via `prefers-color-scheme` + manual menu toggle (persisted in `tor2e-theme`).
- [x] **Service worker + manifest.json** — true offline PWA with home-screen icons.
- [ ] **Roll multiple skills at once** — group rolls
- [x] **Per-skill notes field** — slim `.skill-note` input under each skill row on the Skills tab; stored in `char.skillNotes[skillName]` (saved on change; empty notes pruned). Part of the character, so it exports/shares.
- [x] **History filter/search** — Dice-tab History card gains a text filter (matches roll label) + an outcome dropdown (All / Successes / Failures); `renderHistory()` applies both before slicing to the last 20.
- [x] **Compact mode** — menu toggle **📏 Compact Mode** (persisted in `tor2e-compact`); `body.compact` CSS overrides tighten panel/card/counter/field spacing & font for iPhone portrait. `applyCompact()` bootstraps on load.
- [x] **Print-friendly stylesheet** — `@media print` hides chrome/buttons/interactive tabs (Dice/Build/Oracle/Band/Battle/Journey/Council), stacks the Character/Skills/Combat/Gear panels, forces black-on-white, and shows a `#print-title` (name — culture · calling). Menu **🖨️ Print / Save PDF** button calls `window.print()`.
- [x] **Undo button** — header **↶** button (shown only when the stack is non-empty). `snapshot()` pushes a pre-mutation char JSON (bounded to 50) at the high-misfire entry points — `adj()` counters, condition toggles, and Apply Culture; `undoLast()` restores it. Stack is per-hero (cleared on switch/new).
- [ ] **Drag-to-reorder** war gear rows
- [x] **Styled modal** to replace native `confirm()` / `alert()` (done in an earlier pass — `showModal`/`confirmStyled`/`alertStyled`/`promptStyled`).
- [x] **Chronicle (journaling)** — a **solo-only** tab (gated on `isSolo()` in `refreshStriderUI` — visible in Strider or Moria solo; tab defaults `display:none`) that fuses solo-RPG journaling conventions (researched: Lonelog/Solo-RPG-Notation, Mythic GME, Ironsworn) with TOR2E's native **Tale of Years**. Reworked from a tagged-log into a **free-write, scene-based prose journal**. Per-hero, stored in `tor2e-journal-<id>` (separate key — excluded from the share-link to keep QR small; bundled in full JSON export via a `{_tor2e:'export-v2',character,journal}` wrapper `importData` understands). Pieces:
  - **Scenes & blocks** — `journal.scenes[]` + `journal.entries[]` (blocks `{sceneId, kind:'prose'|'auto', type, text, …}`) + `activeSceneId`. **"+ New Scene"** prompts for a frame line → dated heading; you **free-write prose** into a textarea (`addProseToScene`); blocks are inline-**editable** (`editBlock`/`saveBlockEdit`) and deletable. `ensureActiveScene()` auto-starts a scene on the first write. No notation glyphs on screen (pure prose); Lonelog ASCII glyphs appear only in the Markdown export.
  - **Auto-weave, inline & dimmed** — `journalAuto(bucket,type,text)` pushes a **dimmed `kind:'auto'` block into the open scene**, gated by `journal.settings` toggles (buckets `ojc` / `dice` [**off by default**] / `status` / `advancement`). Hooks: `logOracleRoll`, `resolveJourneyEvent`, `finalizeCouncil`, `rollDice`, `adj` (Shadow/Scar), condition toggles, `awardSessionXP`, retirement, `fpComplete` (Yule), journey arrival.
  - **Tale-of-Years clock** — Year/Season/Day/Phase stamps each scene; timeline shows scenes newest-first with blocks in written order. Auto-advances on Prolonged Rest (+1 day), journey arrival (+days), Yule (year+1); manual editor + Next Season / Mark Yule.
  - **Threads** (open→closed) + **NPCs-met** trackers.
  - **Markdown export** — one section per scene (prose as paragraphs, auto-events as `` `glyph` `` bullets) + Threads + NPCs, as `<name>-chronicle.md`.
  - **Migration**: legacy flat tagged entries auto-wrap into one "Earlier entries" scene, reordered chronological. Per-hero load/save wired into `applyActiveCharacter`/`newCharacter`/delete/import/reset.
  - **Halbarad-style upgrades** (modelled on a real TOR2E solo journal, 2026-06-03): (1) **Shire-Reckoning calendar** — `clock {year,month,day,phase}` over 12 × 30-day months (`SHIRE_MONTHS`), season derived via `monthSeason()`; dates read "Spring, 13th Astron 2965" (`dateLabel`/`ordinal`). `advanceChronicleDay` rolls months/years; `markYule` → 1 Afteryule of next year. Legacy `{year,season,day}` clocks migrate (season→representative month). (2) **Structured oracle notation** — `logOracleRoll(label,result,journalText)`; the Telling Table logs `Q: … · Telling Table (Middling) → YES`. (3) **Combat log subsystem** — `journal.combats[]` ({foeName,endMax/Cur,hateMax/Cur,rounds:[{hero,foe}],active,outcome}); a "Combat Log" card (`renderChronicleCombat`) tracks one active fight with End/Hate steppers + round entries; ended fights fold into the scene (`renderCombatBlock`) and the export.
  - **Interleaved play-log layout (2026-06-03)** — on-screen, a scene renders blocks in **chronological order**: a dimmed roll-result line (`kind:'auto'`), then the prose description written for it, then the next roll, etc. (matches the Ironsworn/Solo-Notation "roll → narrate" flow). Each roll line has a **"✎ describe"** affordance (`describeBlock`/`saveDescribe`) that **splices a prose block immediately after that result** in `journal.entries`. The compose box still appends prose to the end of the open scene.
  - **Polish bundle (2026-06-03)**: (1) **Two export modes** — `exportChronicleMarkdown(mode)` with `'split'` (⬇ Story — Halbarad prose + Rules Bits) and `'log'` (⬇ Play-log — interleaved as on screen). (2) **"Continue in Chronicle"** — `arriveAtDestination()` offers (in solo) to open a fresh `At <destination>` scene and jump to the Chronicle tab (montage→landmark hand-off). (3) **Eye-Awareness steppers in the Combat Log card** (`adjCombatEye`) showing `Eye N / Hunt`. (4) **Opt-in sample scene** — `loadSampleChronicle()` from the empty-state button (a demo scene + rolls + a finished combat; ordinary editable data).
  - **Deepening bundle (2026-06-04)**: (1) **Per-scene state snapshot** — `captureState()` stamps End/Hope/Shadow(+Scars)/Eye at scene start, shown in the scene header (`stateLabel`). (2) **Edit roll lines** — `editBlock` works on any block (auto results editable, not just prose). (3) **Reorder blocks** — ▲/▼ via `moveBlock` (swaps scene-siblings). (4) **Collapse / navigate** — per-scene collapse (`sc.collapsed`, `toggleSceneCollapse`) + a jump-to-scene `<select>` (`jumpToScene`). (5) **Scene generator** (button "🎬 Scene") — `rollWritingPrompt()` posts a describable scene seed; see "Scene generator" below. (6) **Inline oracle** — an "Oracle" card (`chronicleAsk`/`chronicleLore` via shared `_tellingResult`/`_randomLoreRow`) asks the Strider-Mode Telling/Lore tables without leaving the tab, logging the structured line into the open scene.
  - **Scene generator (2026-06-05)** — replaced the old introspective writing prompts (which mis-keyed to Shadow/Hope and felt disconnected) with a **structured Middle-earth scene generator**. `SCENE_GEN` holds three pools — `travel` (wilderness/road), `rest` (settled/respite/camp), and a `peril` overlay (dread) — each with `where`/`who`/`what`/`mood` lists. `rollWritingPrompt()` picks a context (journey active → `travel`, else `rest`) and, when **Shadow + Scars ≥ ½ Max Hope** or (solo) **Eye Awareness ≥ Hunt threshold**, draws who/what/mood from `peril`; it posts one describable line `🎬 Scene — Where: … Who/What: … Happening: … Mood: …` into the open scene. Researched against Mythic GME scene-setup + Scene Unfolding Machine / Ironsworn scene-framing, kept TOR2E-faithful (still labeled "a journaling aid, not a Strider Mode rule"). Verified in jsdom: travel/rest/peril contexts select correctly; calm state never peril.
  - **Strider-Mode-faithful trim (2026-06-04)** — audited so the journal captures **only Strider Mode oracle (Telling/Lore/Fortune/Revelation/Eye) + core-TOR2E events** (Tale of Years, Journey/Council, Shadow/conditions, Yule/FP/XP, combat). **Removed** the external imports: the Mythic **random-event generator** (`rollRandomEvent`/`EVENT_FOCUS`), the Mythic-style **Threads & NPC trackers** (cards + `addThread`/`toggleThread`/`addNpc`/etc.; the `journal.threads`/`journal.npcs` arrays remain in the schema for backward-compat but are unsurfaced), and the **Lonelog ASCII glyphs** in export (Markdown now uses plain `**Label:**` prefixes; the glyph legend is gone). **Kept** the **writing prompts**, labeled in-UI as "a journaling aid, not a Strider Mode rule." (`JOURNAL_TYPES.ascii` is now unused.)
  - **Combat-roll → Combat Log mirroring (2026-06-04)** — closes the "I have to type combat by hand" gap. (1) **Dice capture on by default** — `defaultJournal().settings.dice` flipped `false → true`; `loadJournal` does a one-time `_diceOnMigrated` flip so existing journals turn it on too (still user-toggleable). Every roll through `rollDice()` (incl. Combat-tab quick-rolls) now logs a line to the open scene. (2) **Attack rolls auto-populate the active Combat Log** — `rollDice()` gains a hook (right after the `journalAuto('dice'…)` line): when `diceState.isAttack` and `activeCombat()` exists, it appends an **editable** round built from the roll (`{stance ·} weapon · score vs TN → outcome (N✦)`), maps `diceState.lastAttackProf` → the equipped `char.weapons[]` entry (highest `dmg` if several), and on a hit subtracts that weapon's **Damage** from the foe's `endCur` (`· −N End → cur/max`); a great-success Piercing Blow is noted (`foe Protection vs Injury`) but **not** auto-applied to Endurance (it's a wound, resolved separately). Independent of the noisy `dice` bucket, so combat still mirrors even with roll-logging off. (3) **Editable rounds** — `editCombatRound(id,idx)` + a ✎ button per round; the manual `ch-rd-hero/foe` inputs remain for narrative rounds (relabelled "Log Round N manually" with a hint that rolls auto-add). Flow per the user's pick: all rolls on · auto-add+edit · auto-apply weapon damage · Dice/Combat-tab → mirror.
  - **Foe Attacks helper / adversary attack profile (2026-06-04)** — auto-fills the *foe* side of the round too. Each combat carries `foe: { atkDice, atkDmg, atkInj, atkTN }` (defaults 2/4/14/14; backfilled in `loadJournal` + set in `newCombat`), editable via compact inputs in the card (`setFoeProfile`). A **🗡️ {foe} Attacks** button (`foeAttacks(id)`) rolls `_doInlineRoll(atkDice,'normal', atkTN + heroParry)` where `heroParry = char.parry + char.shieldTotal` (mirrors the hero-attack TN encoding). On a hit it subtracts `atkDmg` from **the hero's** `char.endCur` (floored at 0, flags Dying), notes a Piercing Blow (`your Protection vs {atkInj}`) on a great success, and writes the foe line into the latest round's empty `foe` slot (else a new round). Verified in jsdom: backfill, profile edits, foe-slot pairing, Endurance drain on hits, Rune auto-hit, miss lines — no errors.
  - **NOTE (2026-06-04): Combat moved to the Combat tab.** The Chronicle Combat Log card was **replaced** by a full **Encounter tracker on the Combat tab** (see "Combat-tab Encounter tracker" below). The Chronicle now shows only a pointer note; combat results still auto-log into the open scene via `journalAuto`. The old Chronicle-combat functions (`newCombat`/`foeAttacks`/`adjCombat`/`renderChronicleCombat`/…) are now **dead code** (unreferenced, harmless) pending a cleanup pass; `renderCombatBlock` is still used to render any legacy `journal.combats` in scene export.
  - **Piercing Blow → Protection → Wound chain (2026-06-04)** — `foeAttacks` is now `async` and, on a Piercing Blow (foe Feat die = Rune or 10, matching the hero-attack model), auto-prompts the hero's Protection roll vs the foe's `atkInj`. Shared logic extracted from the Dice-tab card: **`_protectionRoll(tn, protDice)`** (pure: Feat + `armourProt+helmProt` dice + Close-fitting/Furious/Stone-Hard/Skin-Coat/Weary/Miserable, returns outcome) and **`_applyWoundFromFail()`** (sets `wounded`, rolls `rollWoundSeverity()`, writes `injury`/`injuryDays`, resets `firstAidUsed`). On a failed Protection it wounds the hero and appends the severity to the round line (`Piercing Blow — Protection N vs Inj → WOUNDED (Severe Injury …)`); on success `→ resisted`. `rollProtection()` (Dice tab) refactored to call the same two helpers — behaviour unchanged. Verified in jsdom (forced Feat 10): fail→Wounded+severity, success→resisted, and the Dice-tab card still rolls — no errors. (Hero-on-foe Piercing Blow stays a note: we don't model foe armour/wounds.)

### Combat-tab Encounter tracker (2026-06-04)
A full in-tab combat encounter system on the **Combat tab** (works in all modes — solo or not), built per the user's spec to **replace** the Chronicle Combat Log. Run the whole fight without leaving the tab.

- **Data**: `char.encounter = { active, round, foes:[], weaponIdx, adv:{open,hope,fav,extra,keen} }` (default + `migrateCharacter` guard). Each foe = full stat block `{ id, name, source, endMax/endCur, might, hateMax/hateCur, parry, armour, atkTN, attacks:[{name,dice,dmg,inj,special}], fell, engaged, wounded, slain }`. Persists on the character (survives reload, in export).
- **`BESTIARY`** constant — curated Core / Moria / Wilderland adversaries (orcs, wargs, wights, trolls, spiders, goblins, cave-troll, Watcher, werewolf, etc.). **Best-effort stats, all editable** (not verified table reproductions). Bestiary picker overlay (`bestiary-overlay`) + `addFoeFromBestiary` / `addCustomFoe`.
- **Render**: `renderEncounter()` (called from `render()`) fills `#encounter-card`. Per-foe card: End/Hate steppers, Parry/Armour/Might, Fell-ability line, Wounded/Slain badges, an `✎` edit expander (`_renderFoeEdit`) to key in every stat + add/remove/edit named attacks (`setFoeField`/`setFoeAttack`/`addFoeAttack`/`delFoeAttack`).
- **Your attack** (`heroAttackFoe`): a global "Attack with" weapon `<select>` + an `⚙ Advanced` row (Hope +1d / Favoured-Ill / ±dice / Keen). Rolls via `_doInlineRoll(dice, fav, strTN + foe.parry)`; auto-applies **stance** (Forward +1d, Defensive −1d/engaged foe, Rearward/Skirmish ranged-only warnings) and the live engaged-foe count. On a hit subtracts weapon Damage from foe Endurance (**slain at 0**); a Piercing Blow (Feat Rune/10, or Keen 9+) rolls the **foe's** Protection via `_foeProtectionRoll(foe, weaponInj)` (Feat + foe Armour dice) → fail = foe **Wounded**, and a 2nd Piercing Blow on a wounded foe = **slain**. Inline result shown in the foe's card.
- **Foe attacks** (`foeAttackHero`): per-foe per-attack buttons + an **"All engaged foes attack"** button (`allFoesAttack`, sequential, pausing for Piercing-Blow prompts). Reuses the `_protectionRoll`/`_applyWoundFromFail` chain → your Endurance, Dying, Wounded + Severity.
- **Integration**: `encDeriveEngaged()` keeps `char.engagedFoes` = live engaged foes (feeds the Stance card's Defensive modifier). Every action logs to roll history (`encLogRoll`) **and** the Chronicle scene (`journalAuto('dice',…)`). Round counter (`nextRound`, free-form), slain foes stay listed (greyed), **`endEncounter`** clears.
- **Verified in jsdom**: bestiary add + engaged-derive; hero attack drains Endurance and slays at 0; hero Piercing → foe Protection → Wounded → slain-on-2nd; foe Piercing → your Protection → Wounded + severity; `allFoesAttack`; render + endEncounter — no errors.
- **`_equippedWeapons()` derives proficiency** via `_weaponProf(w)` (catalog lookup by name; picked weapons historically stored no `prof`), so the "Attack with" dropdown lists picked **and** custom weapons (custom → Brawling). `pickWeapon` now also stores `prof`.

### Chronicle: combat groups (collapsible) (2026-06-05)
Encounter combat folds under one collapsible heading in the Chronicle timeline. Per the user's spec: grouping is **encounter-scoped** (first foe → End Encounter), heading is **auto from foe names but renamable**, **collapsed by default with a one-line summary**, exported as a **heading + nested lines**.
- **Data**: `journal.combatGroups[] = { id, sceneId, title, renamed, collapsed, ongoing, startSnap:{end,hope,shadow}, summary }` + `journal.activeCombatId` (defaults + `loadJournal` guards). Blocks created while a group is open carry `block.combatId` (set in `pushBlock`; inherited in `saveDescribe`).
- **Lifecycle** (solo only, `isSolo()`-gated): `_encEnsureGroup()` opens/refreshes the group (from `encLogRoll` before the `journalAuto` line, and from `addFoeFromBestiary`); title = `⚔️ Combat vs <foe names>` unless renamed. `_encFinishGroup()` (from `endEncounter`, **before** the encounter is cleared) computes the summary (`N foes · K slain · R rounds · −End · Wounded · ±Hope · +Shadow` vs a start snapshot) and releases `activeCombatId`. Everything logged during the fight — combat lines, other rolls, mid-fight prose — folds in.
- **Render**: `renderChronicleTimeline` folds each run of same-`combatId` blocks under a gold header (`toggleCombatGroup`, `renameCombatGroup`, `LIVE` badge while ongoing, summary when ended; auto-expands if a child block is being edited/described). Per-block markup extracted to a local `renderOne(b)`.
- **Export**: `exportChronicleMarkdown` emits each group as `### <title> — <summary>` with its lines nested (Story and Play-log modes).
- **Verified in jsdom**: group create + auto title; combat lines + mid-fight prose tagged, pre-combat prose untagged; summary on End; new encounter = new group; collapse/expand render; export heading + nested lines — no errors.

### 🔵 Priority 4 — Expanded rules tracking
- [ ] **Skill Endeavour tracker** — set Resistance + Time Limit, tally successes
- [ ] **Journey tracker** — Marching Tests, Journey Events table, fatigue accumulation, journey log
- [ ] **Council tracker** — Resistance, Time Limit, accumulated successes, audience attitude
- [ ] **Fellowship Phase wizard** — guided Yule/regular phase: skill training UI, Hope recovery, undertakings, Heal Scar
- [ ] **Eye Awareness tracker** (Loremaster only)
- [x] **Conditional virtue toggles in dice roller** — Dragon-Slayer + Dark for Dark Business as opt-in toggles; Sure at the Mark, Stone-Hard, Skin-Coat, Strength of Will, Untameable Spirit, Against the Unseen all auto-apply when the virtue is owned and the roll context matches. Helper `hasVirtue(name)` available for future additions.

### 🟣 Priority 5 — Multi-character & sharing
- [x] **Multiple characters per device** — list/selector. Menu → **👥 Characters** opens a roster overlay: switch / rename / duplicate / delete, plus **➕ New Character**. Storage is keyed per hero (`tor2e-char-<id>` + `tor2e-rolls-<id>`) with a `tor2e-roster-v1` index; legacy single-character saves auto-migrate on first load. Each hero keeps its own sheet **and** roll history. `resetCharacter()` now resets the active hero in place (kept distinct from New Character).
- [x] **Share via URL** — Menu → **🔗 Share Character**. `characterDelta(char)` trims the hero to non-default fields → URL-safe base64 (`encodeShare`/`decodeShare`, UTF-8 safe) in a `#import=…` hash. `importFromHash()` (run on load) decodes, confirms, and adds the shared hero as a **new** character (never overwrites); the hash is cleared via `window.history.replaceState` (note: `history` is the roll-history array in this app — must use `window.history`). Copy-link + copy-code-only buttons with a clipboard fallback.
- [x] **QR code** generation — Menu → 🔗 Share renders a QR of the share-link via a **vendored** `QRCode` lib (davidshimjs/qrcodejs, MIT, inlined as a separate `<script>` block to stay single-file/offline). Gated at ≤1200 link chars (beyond that a QR is too dense to scan, so it falls back to "use the link/code"). EC level L for the smallest code.
- [x] **Companion view** — Menu → **🛡️ Party View**: read-only table of every saved hero (Name/Culture·Calling, End, Hope, Shadow+Scars, Valour/Wisdom, conditions), active hero highlighted.

### ⚪ Priority 6 — Loremaster tools
- [ ] **Adversary stat blocks** — combat tracking against NPCs
- [ ] **Eye Awareness manager** — global Eye level, hunt threshold by terrain
- [ ] **Hoard generator** — Lesser/Greater/Marvellous
- [ ] **Magical Treasure generator** — Marvellous Artefacts, Wondrous Items, Famous Weapons with Blessings
- [ ] **NPC manager** — quick stat blocks

### 🧹 Priority 7 — Code quality
- [x] **Section data with banner comments** — the script already carries ~40 greppable `/* ---------- SECTION ---------- */` banners; a top-of-file **FILE MAP** comment (after the title banner) now groups them (data constants / state & storage / rendering / solo modes / subsystems / build pickers / Chronicle / wiring) and lists the localStorage keys, so the 12k-line file is navigable by grep.
- [x] **JSDoc type annotations** — added to the core state/IO functions (`migrateCharacter`, `loadCharacter`, `saveCharacter`, `validCharacterShape`, `journalAuto`). Selective, not exhaustive.
- [x] **State migration on load** — `CHARACTER_SCHEMA_VERSION = 1` constant + `schemaVersion` on `DEFAULT_CHARACTER`; `migrateCharacter()` stamps it on every load. The existing per-field defensive guards remain the de-facto (idempotent) migration; the stamp lets a future *breaking* change branch on `raw.schemaVersion`.
- [x] **Validation on import** — `validCharacterShape(obj)` (object, not array/primitive, carries a recognizable character field; partial deltas OK). Gates `importData` (now also **confirms before overwriting the active hero** — closes a data-loss gap — and routes the imported journal through `loadJournal` for normalization) and `importFromHash` (rejects non-character shared links).

---

## Cloud, Multiplayer & Modularization Roadmap (PLANNED — 2026-06-29)

> **Status: PLAN ONLY. No code written yet.** This roadmap ports the *"how the app is
> run"* features of the sibling **Dragonbane Player** app (Firebase live multiplayer,
> a GM screen, a modular codebase, a committed test harness) into TOR2E **without
> changing any TOR2E rule**. Every item below is mechanical/infrastructure/UX only —
> dice math, costs, tables, and rules engines are untouched. Implement in phase order;
> tick each box and add a dated entry when a phase lands (per the doc-sync discipline).
>
> **Spec format per item:** **Goal** (what/why) · **Target** (file/function) ·
> **Behavior** · **Schema** (new data/fields) · **Acceptance** (browser/test check) ·
> **Risk**.

### Design decisions (2026-06-29 — locked by Q&A, do not re-litigate)
1. **Cloud scope:** full cloud, mirroring Dragonbane — Firebase is a first-class feature (not merely optional plumbing). It still degrades gracefully to local when unconfigured/offline.
2. **Audience:** **both** — a peer Fellowship party view *and* an **optional Loremaster (GM) screen**; the `role: "player" | "loremaster"` schema is laid in from day one so no migration is needed later.
3. **Architecture:** split into `src/*.js`. **REVISED 2026-06-29 (in P2): classic `<script src>` files, NOT ES modules** — because 367 inline `onclick` handlers need global functions, ES modules would have broken them and dropped `file://`. Classic scripts share global scope, so **open-from-Files (`file://`) is KEPT** and all handlers work unchanged. (The earlier "drop file://" trade-off no longer applies.) See the Phase P2 entry.
4. **Shared combat:** the Encounter tracker is **promoted to a live, GM-driven shared encounter** — the Loremaster runs the fight, all players see foes/rounds/damage in real time.
5. **Account model:** **mirror Dragonbane** — instant anonymous sign-in, optional Google account link in Settings; **heroes become cloud-owned** (by uid), sync across the player's devices, and stay cached offline. The current per-device localStorage roster becomes the offline cache + migration source.
6. **Extra features adopted (zero rules impact):** committed Playwright **test harness**, **accessibility pass**, **GM→player broadcast feed**. **Not adopting:** portrait image upload.

### Implications to fold in when these phases land
- **Design Constraints** section: the "No build step / openable from Files app / single file" constraints are **superseded** for the module-split + cloud build. Update them (note the served/PWA model; offline still works via SW + cached RTDB).
- **Deployment** section: drop/flag the Path 2 (iCloud `file://`) instructions; Netlify (Path 1) becomes the supported path. `index.html` stays the mirror of the shell, but now loads `src/main.js` as a module and the new `firebase-config.js`.
- **Architecture → Current state**: the localStorage-key list gains the Firebase schema; the SW `APP_SHELL`/precache list gains every `src/*.js`, `styles.css`, `firebase-config.js`. Bump `CACHE_VERSION` on every phase that ships a file change.
- **New files:** `database.rules.json` (security rules), `firebase-config.js` (placeholder + `FIREBASE_ENABLED` flag), `src/*.js`, `styles.css`, `tests/` (harness). Keep `node_modules` gitignored; the shipped app stays dependency-free (Firebase via CDN `<script>`, like Dragonbane).

### GM-engine source: reuse from `tor2e-loremaster-main` (surveyed 2026-06-29)
There is a **pre-existing, complete, debugged, RAW-faithful Loremaster app** in the sibling
directory `../tor2e-loremaster-main/` (single-file `loremaster-tracker.html`, ~5,532 lines,
101 functions, localStorage-only, **no Firebase**). It already **consumes the player app's
exported hero JSON** (`handlePartyFiles`), so the two data models are already compatible.
**P5/P6 are therefore a "port + adapt + sync-wire" job, not a "build from scratch" job.**

> **End state / consolidation:** there will be **one unified app, here in `tor2e-tracker-main/`.**
> The Loremaster app is **not** kept as a second app. Its **data + engine + render** code is
> copied into the new `src/` modules during P2/P5/P6 (`gm.js`, `combat.js`, `data-adversaries.js`,
> plus Eye/journey/loot helpers). Its **import/export + "local GM copy" plumbing is discarded** —
> the changelogs there repeatedly note GM edits never write back to the player's device; live RTDB
> sync (P3–P5) replaces that entire seam. After the port, `tor2e-loremaster-main/` is archival.

**Directly portable assets (all TOR2E RAW — no rules change; it *adds* canonical content):**
- **`ADVERSARY_DB`** — 44 adversaries across 7 categories (Evil Men & Ruffians ×8, Orcs & Goblins ×10, Trolls ×5, Undead ×5, Wolves ×3, Monsters & Nameless Things ×2, **Named Villains ×11**). Full schema: `{name, category, features, attributeLevel, endurance, might, resolve, parry, armour, profs:[{name,rating,damage,injury,special}], fellAbilities:[{name,desc}]}`. **Higher quality than the player app's current `BESTIARY`** (which §"Combat-tab Encounter tracker" flags as "best-effort … not verified table reproductions").
- **Encounter engine** — `addAdversaryToCombat`, `rollFoeAttack`, `rollFoeProtection`, `executeAdversaryRoll`/`executeAdversaryProtection`, stance/initiative tracker (`renderStanceTracker`/`renderStanceGrid`), `applySpecialDamage` (Heavy Blow / Break Shield / Seize / Fiery Blow), Hate/Resolve + round tracking, `COMBAT_ACTION_DECKS`, encounter presets.
- **Party dashboard** — `renderPartyTab` (live End/Hope/**Shadow+Scars** + Miserable flag), `awardPartyXP`/`endSessionParty`, per-hero export.
- **Hand-out tools** — `rollGroupCheck` (Dread/Greed/Sorcery group shadow tests) + `applyShadowDirect`.
- **NPC ledger** — `LORE_NPCS` (6) + custom NPCs, `openNPCDetail`, `addNPCToEncounter`.
- **Eye manager** — `adjEye`, region selector, **5 revelation tables** (`REVELATION_EPISODES`/`DIRE_PORTENTS`/`TERRORS`/`ORC_ASSAULT`/`GHASH`).
- **Journey/Moria** — `resolveMoriaJourney`, `rollMarchingTest`, `rollWaterPeril` (`WATER_PERILS`), landmark seeking (`FAMOUS_LANDMARKS`/`OBSCURE_LANDMARKS`), `generateMoriaChamber` (+ `CHAMBER_*`), orc-band generator, rumours (`FALSE_RUMOURS`/`GENUINE_RUMOURS`), `MORIA_JOURNEY_EVENTS`. **Reuse the `class="moria-only"` + `refreshMoriaUI()` gating convention** — it aligns with this app's `isMoria()`/`refreshStriderUI()`.
- **Loot** — `rollLootHoard`, `CANONICAL_ITEMS` + `FAMOUS_QUALITIES_CATALOG`.

**Port caveats (why it's reuse, not copy-paste):**
1. **Schema adapter required.** LM adversary `{attributeLevel, endurance, resolve, profs[{rating,damage,injury,special}]}` → this app's encounter foe `{endMax/endCur, hateMax/hateCur, atkTN, attacks:[{name,dice,dmg,inj,special}], fell, …}`. Clean 1:1 mapping; write one `loremasterFoeToEncounter()` adapter and keep `ADVERSARY_DB` as the data table (`data-adversaries.js`).
2. **Port the RAW attack-TN fix.** The LM app fixed a real bug: an adversary's attack TN vs a hero = the **hero's Parry score** (not Strength TN), and a target's stance applies as a **±Success die** (Forward +1d, Defensive −1d), not a Favoured/Ill Feat die. Carry that correctness into the shared encounter.
3. **Discard the integration plumbing** — file-upload import, per-hero re-export, "local GM copy" (replaced by sync in P3–P5).
4. **Modularize on the way in** — the LM app is vanilla single-file; its code lands in the P2 module layout, not before.

### Phase P0 — Port the canonical adversary library (cloud-independent quick win)
- [x] **Adversary content ported — ✅ done 2026-06-29.** Brought the loremaster `ADVERSARY_DB` (44 foes across 7 categories: Evil Men & Ruffians ×8, Orcs & Goblins ×10, Trolls ×5, Wolves ×3, Undead ×5, Monsters & Nameless Things ×2, **Named Villains ×11**) into `character-tracker.html` **verbatim** (extracted programmatically — no transcription risk), right after `BESTIARY`. Added `loremasterFoeToEncounter(a)` adapter → the encounter bestiary-foe shape (`category→source`, `endurance→end`, **`hate ?? resolve → hate`** [source mixes both keys — monsters use Hate, intelligent foes Resolve], `attributeLevel→atkTN = 10+AL` to match the existing convention, `profs→attacks`, `features`+`fellAbilities`→`fell`), and `allBestiary()` = original 18 + adapted 44 **de-duped by name** (6 LM dupes dropped → **56 unified** picker entries). `renderBestiaryList`/`addFoeFromBestiary` now read `allBestiary()`; custom-foe + edit flow unchanged. Verified: all inline `<script>` blocks parse (`node --check`); adapter yields 0 malformed entries, all 44 with Hate>0, Búrzgul spot-check (End 22 / Hate 5 / atkTN 15 / 2 attacks). Synced `index.html`; bumped `sw.js` → `tor2e-v76`. No character-schema change, **no rules change** (additive content only).
- [x] **Adversary-attack-TN RAW fix — ✅ done 2026-06-29 (after P1, test-guarded).** `foeAttackHero` was computing `tn = f.atkTN + heroParry` (≈14+17=**31**, near-unhittable). Fixed to RAW: a foe's attack TN against a hero = the **hero's Parry alone** (`char.parry + shieldTotal`, a full TN — verified: pregens carry parry 15–19), and the hero's **stance modifies the foe's attack dice** as a ±Success die (Forward +1d easier to hit / Defensive −1d), per the app's own `STANCE_INFO`. The foe's `atkTN` field is now vestigial (kept; harmless). Basis (no rules change — a correctness fix to the app's own documented rules): the loremaster app's validated fix + `STANCE_INFO` text + the full-TN parry values, three consistent in-repo sources (NotebookLM re-verification optional). Guarded by 2 new `adversaries`-spec checks (TN = Parry 17 not 31; Forward +1d present). Harness **59/59 green**. SW cache → v80.

### Phase P1 — Committed test harness (do FIRST; it protects the refactor)
- [x] **Headless Playwright suite, `npm test`. ✅ done 2026-06-29.** `npm test` (`node tests/run.js`) boots the app headless and runs **4 specs / 57 checks**: **smoke** (boot + key globals + every visible tab activates + 0 JS errors), **adversaries** (P0: BESTIARY 18 / ADVERSARY_DB 44 / unified 56 / 11 villains / adapter Hate+attacks / add-villain-to-encounter), **ux** (this session: theme cycle, text-size classes, Reference 6 groups + filter, roll-stats math, restore-last-tab hidden-guard), **spillage** (no horizontal overflow at 360 & 390px across all visible tabs, with the War Gear table seeded to stress the U3 buttons). Infra: `tests/run.js` (orchestrator + per-spec summary + non-zero exit), `tests/serve.js` (ephemeral static server), `tests/browser.js` (launches Chromium, **resolves a cached build via glob** so it runs without matching playwright-core's pinned version — `CHROMIUM_BIN` overrides; blocks `sw.js`+Firebase; suppresses the first-run tutorial modal; captures page errors). `package.json` declares a dev-only `playwright-core`; `.gitignore` excludes `node_modules`. Verified: 57/57 green (exit 0); a deliberately failing check exits 1. **Tests live outside the SW `PRECACHE`** — no cache bump, no app-behavior change. (Note: this folder isn't a git repo yet — `git init` recommended before P2.)
  - Goal: a regression net before touching a 15k-line file, so the module split and cloud work can't silently break the sheet.
  - Target: new `tests/{run,serve,browser}.js` + `tests/specs/*.js`; new dev-only `package.json` (`playwright-core` devDependency, `"test": "node tests/run.js"`); `.gitignore` `node_modules`. Mirror Dragonbane's `tests/` exactly in shape.
  - Behavior: boot the current app headless (served by `tests/serve.js`), `route('**/firebasejs/**', abort)` so tests never touch Firebase. Specs: **smoke** (boot + every tab renders + a skill roll fires, 0 JS errors), **spillage** (no horizontal overflow at 360/390px across all tabs + open modals), **derivation** (load each of the 13 PREGENS; assert End/Hope/Parry/TN formulas per §3 / Field-Lock table), **build** (apply each culture/calling; legal derived stats), **dice** (`rollDice`/feat/boon-equivalent invariants, Favoured/Ill cancellation). Runner prints per-spec pass/fail and exits non-zero on any failure.
  - Schema: none.
  - Acceptance: `node tests/run.js` on a clean checkout is green; intentionally breaking a known invariant (e.g. End formula) exits non-zero.
  - Risk: low. Tooling only; ships nothing into the app.

### Phase P2 — Module split + CSS extraction (locked behind P1)
- [x] **Split into classic `<script src>` files + `styles.css`. ✅ done 2026-06-29.** **Approach revised from ES modules → classic scripts** (Q&A 2026-06-29): the app has **367 inline `onclick="fn()"` handlers** calling **447 global functions**; ES modules would scope those functions away (breaking every handler) and drop `file://`. Classic scripts share one global scope → all handlers keep working, **`file://` open-from-Files is PRESERVED**, still no build step. The single `<script>` was cut **order-preservingly** at section-banner boundaries into 6 files — `src/{01-core,02-data,03-state,04-render,05-combat-build,06-tabs-init}.js` — plus `src/vendor-qrcode.js` (the vendored QR lib) and `styles.css` (both `<style>` blocks). A generator script **asserted the 6 files concatenate byte-for-byte to the original script** (so execution is identical), and verified the only hoisting hazard (`let char/history/journal = load*()` calling later-declared `load*`) stays co-located in `03-state.js` with all load-time deps in `01–03`. The two HTML files became identical thin shells (`<link rel="stylesheet">` + 7 `<script src>` tags, ~145 KB vs 889 KB). Verified: all 7 files `node --check` clean; **harness 59/59 green against the split** (every tab renders, 0 page errors). SW `PRECACHE` gained `styles.css` + all `src/*.js`; cache → v81.
  - Goal: maintainability parity with Dragonbane; make the cloud/GM work reviewable.
  - Target: `character-tracker.html` → a thin shell loading `<link rel="stylesheet" href="styles.css">` + `<script type="module" src="src/main.js">`. Proposed modules (by the existing FILE-MAP banners): `core.js` (consts/util), `data-*.js` (SKILLS/WEAPONS/CULTURES/CALLINGS/PATRONS/REWARDS/VIRTUES/BESTIARY/oracle+Moria tables/PREGENS/LIFEPATHS), `state.js` (DEFAULT_CHARACTER, migrate/load/save, roster, share/QR), `render.js`, `dice.js`, `build.js` (pickers), `journey.js`, `council.js`, `endeavour.js`, `fellowship.js`, `treasure.js`, `combat.js` (encounter), `solo-strider.js`, `solo-moria.js`, `chronicle.js`, `tutorial.js`, `ui.js` (modals/toasts), `main.js` (init/wiring). Final list finalized during the split; update the §"File structure" + a new module-map table.
  - Behavior: **pure refactor, zero behavior change.** Cross-module references via `export`/`import` (no globals); runtime cycles are fine under ESM live bindings.
  - Schema: none.
  - Acceptance: P1 suite stays green before/after; manual parity pass on all 12 tabs + both solo modes. `cp character-tracker.html index.html` discipline replaced by "both load `src/main.js`"; document the new sync rule.
  - Risk: **high** (largest single change). Mitigation: land P1 first; split in small, test-green increments; keep a pre-split tag.

### Phase P3 — Firebase foundation & cloud-owned characters
- [x] **✅ COMPLETE (live-verified against the real project 2026-07-01; real config committed, `FIREBASE_ENABLED=true`).** **Step 1 — graceful-degradation foundation ✅ done 2026-06-29.** New `firebase-config.js` (placeholder config, **`FIREBASE_ENABLED = false` by default** — no secrets, runs 100% local out of the box) + Firebase compat CDN `<script>`s in the shell + new `src/07-sync.js` (`Sync` module). `Sync.init()` (called in DOMContentLoaded) boots Firebase **only if** enabled + real keys + SDK loaded; otherwise it's a **no-op and the app stays fully local** (this is what preserves the offline/clone-and-run/`file://` ethos and keeps the harness green). Verified: harness **66/66** with a new smoke check proving `Sync.isEnabled() === false` when the SDK is absent, app byte-behavior identical, 0 errors. Test harness now `fulfill`s `firebasejs` requests empty (regex route) so tests are deterministic/offline. SW `PRECACHE` += `firebase-config.js` + `src/07-sync.js`; cache → v85.
  - **Step 2 — cloud engine ✅ done 2026-06-29 (⚠️ cloud paths unverified — need real Firebase keys):** expanded `src/07-sync.js` with **anonymous auth** (`onAuthStateChanged` → `signInAnonymously`), **debounced mirror-up** (`saveCharacter` → `Sync.queuePush(id)` → `characters/{id}` after 1.5s), **pull-missing on sign-in** (`_syncDown`: cloud heroes owned by this uid but absent locally are copied down = cross-device restore; never clobbers a locally-present hero), **first-run local→cloud migration** (local heroes absent in cloud are pushed up), and a **`linkGoogle()`** method (anonymous→Google upgrade). Conflict policy = last-write-wins per hero (live two-way is P4). Schema written: `characters/{id}: { owner:uid, updated, name, data, rolls, journal }`. **All cloud calls guarded by `enabled`+`uid`** → no-ops when off. Verified locally: harness **67/67** incl. a guard check that `queuePush`/`pushChar`/`saveCharacter` are safe no-ops while disabled and never flip `enabled`. SW cache → v86. **The cloud round-trip itself is NOT verified here** (harness blocks the SDK) — needs a live Firebase project.
  - **Step 3 — UI hooks ✅ done 2026-06-29.** `toggleMenu()` populates a **`#sync-status-line`** from `Sync.status()` (📴 Local only / ☁️ Cloud synced / Connecting…) when the menu opens; added a **☁️ Link Google Account** menu button → `Sync.linkGoogle()`. Verified: harness **68/68** (menu shows the status line + button; local-mode text). SW cache → v87.
  - **✅ LIVE-VERIFIED 2026-07-01** against a real Firebase project (`tor2e-tracker`, RTDB asia-southeast1). Served over `http://localhost` (config in `firebase-config.js`, `FIREBASE_ENABLED=true`): `Sync.init()` boots, **anonymous sign-in succeeds** (uid assigned), `Sync.status()` → **"Cloud synced"**. Confirmed a full **write→read round-trip** (`pushChar` → `characters/{id}` with `owner=uid`, read back) AND that the **P7 rules enforce**: a foreign-owner write and an unfiltered collection read both return `PERMISSION_DENIED`; the owner-filtered `_syncDown` query is allowed. **`FIREBASE_ENABLED` is left `false` in the committed `firebase-config.js`** — the real config is kept **local/uncommitted** (per the file's own warning) so the repo stays clone-and-run + the harness (which blocks the SDK) stays green. **Gotcha discovered:** cloud sync needs the app **served over http(s)** — opening via `file://` leaves the Firebase SDK unloaded and the app correctly falls back to 📴 Local only. Live two-way party sync is still P4. RTDB offline persistence is inherent (localStorage is the offline store; RTDB web keeps an in-memory cache).
- [ ] **(original consolidated spec, retained):** SDK, config, anonymous auth, offline persistence, Store cloud mode, character migration, Google linking.
  - Goal: heroes live in the cloud (uid-owned), sync across devices, cached offline; zero-friction launch.
  - Target: `index.html`/shell (Firebase compat CDN `<script>`s), new `firebase-config.js` (placeholder + `FIREBASE_ENABLED`), `state.js`/new `store.js` + `sync.js` (port Dragonbane's `Store` cloud mode + `Sync`), Settings (Google link button).
  - Behavior: instant anonymous sign-in; if unconfigured/offline, run exactly as today (localStorage). On first cloud run, **migrate** the local roster (`tor2e-char-<id>` etc.) into `characters/{id}` under the uid; thereafter localStorage is the offline cache. Optional Google link merges/keeps heroes. RTDB IndexedDB persistence for offline edits.
  - Schema (RTDB): `characters/{characterId}: { owner: uid, campaignId, ...migrated DEFAULT_CHARACTER fields..., rolls, journal }`. Keep per-hero `journal`/`rolls` as sub-nodes (journal currently a separate localStorage key).
  - Acceptance: with placeholder config → identical to today (tests green, no network). With real keys → a hero created on one device appears on another after sign-in; offline edits resync.
  - Risk: medium (migration correctness; data-loss guardrails — never overwrite without confirm, keep a local backup of pre-migration JSON).

### Phase P4 — Campaigns & live Fellowship party
- [x] **✅ COMPLETE (increments 1–3 live-verified; final rules redeploy verified 2026-07-02).** History: Increment 1 (campaign engine: create/join/leave + rules + UI) 2026-07-01. `src/07-sync.js` gains campaign methods: `createCampaign(name,role)` (pushes `campaigns/{cid}/meta` + own `members/{uid}` + a public `joinCodes/{CODE}→cid` index; role `player|loremaster` from day one), `joinCampaign(code,role)` (resolves the code via `joinCodes`, then writes own membership), `leaveCampaign`, `publishVitals` (debounced; writes a **lightweight vitals snapshot** — name/End/Hope/Shadow+Scars/V/W/conditions/dying — into the member node so the party shows live WITHOUT exposing owner-only character records; wired into `saveCharacter` next to `queuePush`), and `subscribeParty`/`unsubscribeParty` (live `on('value')`). Memorable two-word join codes (`_genCode`, e.g. `SHADOW-DURIN-42`). Current campaign persisted device-global (`tor2e-campaign-v1`). UI (`src/03-state.js`): a **🏰 Fellowship Campaign…** menu item → `campaign-overlay` with create/join forms (role picker), current-code + Copy + Leave, and a **live members list** (`renderCampaign`/`renderCampaignMembers`). **`database.rules.json` extended** (P7): `campaigns/{cid}` member-gated read; `meta` writable by ownerUid; `members/{uid}` self-write only (`$uid===auth.uid`) with role validated to the two allowed values; `joinCodes` authed-read + create-once write. Harness **89/89** (cloud paths are no-ops under the SDK-blocked harness). **Live-verified via preview against the real project:** fresh code loads (`methods`/`uiFns` true), auth "Cloud synced", and `createCampaign` correctly returns **`PERMISSION_DENIED`** under the not-yet-redeployed rules (confirms wiring + graceful failure). SW cache → **v92**. **✅ Increment-1 core LIVE-VERIFIED 2026-07-01** (rules deployed): `createCampaign` writes `meta`(ownerUid✓)+`members/{uid}`(role+vitals)+`joinCodes/{CODE}→cid`(resolves✓); **live `subscribeParty` reflected a pushed vitals change** (name→Aragorn, End→27); rule enforcement confirmed — foreign member write **denied**, non-member campaign read **denied**.
  - **Delete/cleanup semantics added (2026-07-01, SW → v93):** verification exposed that the owner couldn't tear down a campaign (no `.write` at `campaigns/$cid`; `joinCodes` was create-once). Added: rule `.write` at `$cid` (owner + `!newData.exists()` = owner-delete only), `joinCodes` delete allowed when the code points to a campaign you own; `Sync.deleteCampaign()` (multi-remove `campaigns/$cid` + `joinCodes/$code`), `isCampaignOwner()` (owner flag persisted in `tor2e-campaign-v1`), and an **owner-only "Delete campaign"** button (`campaignDelete`) beside "Leave". **✅ delete LIVE-VERIFIED 2026-07-01** (rules redeployed): owner `deleteCampaign` removed `campaigns/{cid}` + `joinCodes/{code}` and cleared local state; the deleted campaign is correctly unreadable afterward (membership gone). Owner-delete rule confirmed working via the multi-location `update`.
  - **✅ Increment 2 — live Party View + presence (2026-07-01, SW → v94, LIVE-VERIFIED).** The existing **🛡️ Party View** now shows the **live campaign Fellowship** when in a campaign (else the local-device roster): `openPartyView` takes the live branch (`Sync.isEnabled() && currentCampaign()`) → `subscribeParty` → `renderPartyViewLive` (same table + an online dot + role; `closePartyView` unsubscribes). **Presence**: `Sync._setupPresence()` watches `.info/connected` and sets `members/{uid}/online=true` with `onDisconnect().set(false)`; members start `online:true` on create/join; torn down on leave/delete and resumed in `_onSignedIn` if already in a campaign. UI-only re: rules (no redeploy). Verified live: create → Party View shows live header + 🟢 online + ★ me; a pushed vitals change (name→Frodo, End→12/26, Weary) **re-rendered the open Party View in real time**; owner delete cleaned up; 0 console errors. **P4 core (increments 1–2) is done + verified.**
  - **✅ Increment 3 — polish (2026-07-01, SW → v95, LIVE-VERIFIED).** (1) **Multi-listener party subscription** — `subscribeParty(cb)`/`unsubscribeParty(cb)` refactored from single-consumer to a fan-out (`_partyListeners[]` + one shared RTDB `on`, replays `_lastParty` to late subscribers) so the header pill, Party View, Table Mode, and campaign overlay can all listen at once; overlay closers now pass their named cb. (2) **Header campaign pill** — `#campaign-pill` shows live `🏰 online/total`, tap → opens the campaign overlay; `updatePartyPill`/`refreshPartyPill` (persistent subscription while in a campaign; wired via `renderCampaign` + `_onSignedIn`; hidden otherwise). (3) **Table Mode presence** — `renderTableMode` shows the **live Fellowship** (online dots + ★ me) via `Sync.lastParty()` when in a campaign, else the local roster. Verified live: pill shows `🏰 1/1` and hides on leave; Table Mode shows 🟢 + a pushed name change (→Gandalf) + ★ me; 0 console errors. **P4 is complete.** (Skipped as marginal: a "last seen" timestamp.) (Harmless leftover from testing: a single dangling `joinCodes/GOLDEN-DELVING-86` string pointing at an already-removed campaign — inert, can't self-clean since its campaign meta is gone.) Increment 2 = wire the live party into the main 🛡️ Party View + presence.
- [ ] **(original spec) Join codes, party banner, live vitals sync, member roster + roles.**
  - Goal: a Fellowship sees each other's state live.
  - Target: `sync.js` (campaign create/join), header status pill + party banner (port Dragonbane's), `render.js`.
  - Behavior: create a campaign → memorable join code (reuse a fantasy-word generator); others join by code. A party banner shows each member's End/Hope/Shadow(+Scars)/conditions/Valour-Wisdom live (extends the existing read-only Party View into a live one). Presence/online indicators.
  - Schema (RTDB): `campaigns/{id}: { meta:{name,joinCode,createdAt,ownerUid}, members/{uid}:{displayName, characterId, role:"player"|"loremaster"} }`. **Role field present from day one.**
  - Acceptance: two browsers join one code; a HP/Shadow change on one appears on the other within ~1s; offline member shows stale-but-cached.
  - Risk: medium.

### Phase P5 — Shared, GM-driven Encounter tracker
- [x] **✅ COMPLETE (live-verified; rules deployed 2026-07-02).** History: shared-encounter bridge built + pre-redeploy-verified 2026-07-02 (SW → v96). While in a campaign, the Combat-tab encounter becomes **shared**: `enc()` (in `src/05-combat-build.js`) returns a Sync **mirror** of `campaigns/{cid}/encounter` whenever `Sync.sharedEncActive()`; out of a campaign it's `char.encounter` **byte-identical to before** (guarded by 2 new `gm`-spec checks → harness **91/91**). Design decisions: (1) only the **shared subset** `{active, round, foes}` syncs — the per-player dice options (`weaponIdx` + `adv` row) stay local on the mirror, never pushed or overwritten, so one player's "Spend Hope" can't toggle everyone's. (2) **One-line persistence hook**: `saveCharacter()` calls `Sync.queuePushEncounter()` (300ms debounce) with a **dirty-check** (`_lastEncJson`) so non-encounter saves are free and an unchanged copy can never clobber newer remote state; conflict policy is last-write-wins on the subset (turn-based play). (3) **`_encPushPending` guard** — the `on('value')` listener skips snapshots while a local push is in flight (a real race found in live testing: the subscription's initial `null` snapshot arrived after the GM added a foe and wiped the unpushed mirror); a failed push clears the flags so remote applies + the next save retries. (4) **Role gating is UI-level** (`encCanGm()` = local mode OR `Sync.isLoremaster()`; role now persisted in `tor2e-campaign-v1` by `_saveCampaign`): GM-only = add/edit/remove foes (`_edit` expander gated too — the flag syncs with the foe), End/Hate steppers, next round, end encounter; players keep their own ⚔️ attack + 🗡️ defence buttons and see a "Loremaster runs the foes" banner. **Deviation from spec, documented:** per-field GM locks aren't sanely expressible over a foes array in RTDB rules, so the rule (`database.rules.json` → `campaigns/$cid/encounter`) gates writes to campaign **members**; GM-locking is honest-UI. `endEncounter` resets the shared node (not `char.encounter`) in shared mode; subscribe on create/join/sign-in resume, unsubscribe + re-render-to-local on leave/delete; Table Mode + GM-tab encounter line are shared-aware (read via `enc()`). **Live-verified pre-redeploy** (real project): shared mode activates, mirror ≠ `char.encounter`, GM banner+controls, player view hides GM controls but keeps attack/defence, foe survives the denied-push echo (race fix), push correctly `PERMISSION_DENIED` until the rules redeploy.
  - **✅ P5 COMPLETE — happy path LIVE-VERIFIED 2026-07-02** (rules redeployed): GM `addFoeFromBestiary` → the push **lands** at `campaigns/{cid}/encounter` (Orc Soldier, `active:true`, and **no `weaponIdx`/`adv` leak** — the per-player subset stays local); a **simulated remote member's write** (foe End→5, round→3, direct `set`) updated the mirror AND live re-rendered the open Combat card; a **player attack drained the shared foe** (5→1) and the drain propagated back to the cloud node; **non-member encounter write denied** (`PERMISSION_DENIED`); GM **End encounter reset the shared node** (`active:false`, no foes) + mirror; owner delete cleaned up; 0 console errors. The `campaigns/$cid/encounter` member-write rule is live (P7 item verified). **`tor2e-loremaster-main/` is now archival** — its encounter engine ideas are absorbed (adversary DB in P0, attack-TN fix, GM tooling in P6 steps 1–2, shared encounter here); safe to zip/delete.
- [ ] **(original spec) Promote `char.encounter` to a campaign-level shared encounter.**
  - Goal: the Loremaster runs one fight everyone sees; players act on their own turn.
  - **Source: port the `tor2e-loremaster-main` encounter engine** (see "GM-engine source" above) into `combat.js` via the `loremasterFoeToEncounter()` adapter; keep its special-damage toolbar, Hate/Resolve, stance/initiative, and the attack-TN RAW fix. Discard its file-upload/local-copy seam — `sync.js` provides the shared node instead.
  - Target: `combat.js` (encounter), `sync.js`, `data-adversaries.js` (from P0).
  - Behavior: when in a campaign, the Encounter lives at `campaigns/{id}/encounter` (foes, rounds, engaged, applied damage) and renders live for all. **Loremaster-locked** controls (add/edit/remove foes, advance round, apply foe→hero damage); players roll their own attacks and see results. Out of a campaign, the encounter stays local (today's behavior) unchanged.
  - Schema (RTDB): `campaigns/{id}/encounter: { active, round, foes:[…full stat blocks…], turn }`; writes honor `role` in security rules.
  - Acceptance: Loremaster adds a foe → appears on all sheets; a player's attack drains the shared foe's Endurance for everyone; a non-GM cannot mutate GM-locked fields (rule-enforced).
  - Risk: medium-high (the existing encounter model is rich; map it to a synced node carefully; keep local mode byte-identical when not synced).

### Phase P6 — Loremaster (GM) screen + broadcast feed
- [x] **✅ COMPLETE (P6-final live-verified after the 2026-07-02 rules deploy: broadcast write OK + read-back, in-campaign `campaignId` push OK, peek OK, owner delete-campaign cleanup OK).** History: local GM dashboard landed 2026-07-01. `src/08-gm.js` (wired into both shells + `sw.js` PRECACHE, cache → **v89**) adds a **device-global** GM Screen behind a menu toggle (`🎲 Enable/Disable GM Screen`, key `tor2e-gm`), mirroring the solo-mode toggle pattern. When on, a hidden **`🎲 GM` nav tab** + `#panel-gm` appear (visibility owned by `refreshGmUI()`, called from `refreshStriderUI()`; rendered on tab-click via `bindTabs` and on every `refreshStriderUI`). **`renderGm()`** lists **every roster hero** (active starred, DYING flag) with live ❤/✦/🌑 and hand-out controls: **−1 / −3 End**, **+3 heal**, **Weary / Miserable / Wounded** toggles, **+Shadow**. All mutations route through **`gmMutateHero(id, mut)`** — the active hero edits live `char` + `saveCharacter()` + `render()`; other heroes edit their slot via `readSlot` → `localStorage[tor2e-char-<id>]` + `Sync.queuePush(id)` (mirrors to cloud when enabled). Shadow respects the `hopeMax − scars` cap. Guarded by a new **`gm` spec (8 checks)** — harness **83/83 green**. No character-schema change; no rules change (device-global infra only).
  - **GM enrichment step 1 — Group Shadow Test (2026-07-01).** Ported from `tor2e-loremaster-main` (`rollGroupCheck`/`applyShadowDirect`). A `🌑 Group Shadow Test` card on the GM tab rolls one test for **every roster hero at once** — Dread (Valour vs Heart TN), Greed / Sorcery (Wisdom vs Wits TN). `_gmRollHero(hero,dice,tn)` is self-contained so **each hero's own Weary + Despair** apply (Shadow+Scars ≥ Max Hope → Ill-Favoured, RAW p.137) rather than the active hero's global state. Renders a PASS/FAIL row per hero (Feat/total + ⚠Despair/·Weary flags); failures show a one-tap **+N Shadow** button (amount input, default 1) that routes through the capped `gmShadow`. `GM_SHADOW_TESTS` config in `src/08-gm.js`. Guarded by 2 more `gm`-spec checks (verdict-per-hero + Despair flag) → harness **85/85**. SW cache → **v90**.
  - **GM enrichment step 2 — Eye manager + NPC ledger + drop-a-foe (2026-07-01).** Three more cards on the GM tab (all `src/08-gm.js`): **⚔️ Encounter** — a live foe-count line + a `➕ Drop a foe into the Encounter` button reusing the existing `openBestiary()` picker (adds to the active hero's `char.encounter`; a *shared* encounter waits on P5). **👁 Eye of Mordor** — surfaces each roster hero's `eyeAwareness` vs their Hunt threshold (`HUNT_THRESHOLDS[huntRegion]+huntMod`) with −/+ steppers (`gmEye`, floored at 0, routed through `gmMutateHero`); ⚠ flag when EA ≥ Hunt. Reuses the existing per-hero solo-mode Eye data rather than duplicating the revelation tables. **👤 NPC Ledger** — device-global custom NPCs (`tor2e-gm-npcs`) + 5 lore refs (`GM_LORE_NPCS`, ported from `tor2e-loremaster-main`'s `LORE_NPCS`): search filter, add form (name/role/features/notes), delete custom (`gmNpcs`/`gmAddNpc`/`gmDelNpc`/`renderGmNpc`). `renderGm` now also updates the encounter line and calls `renderGmEye`/`renderGmNpc`. Guarded by 4 more `gm`-spec checks → harness **89/89**. SW cache → **v91**.
  - **P6-final — role gating + peek + broadcast (2026-07-02, SW → v97, pre-redeploy-verified).** (1) **Role-gated GM tab**: `gmVisible()` — in a campaign the ROLE decides (loremaster always sees the 🎲 tab, players never, regardless of the local toggle; `toggleGmScreen` becomes informational in-campaign); out of a campaign the device toggle works as before. Wired via `renderCampaign → refreshGmUI`. (2) **👁 Peek-any-sheet**: `pushChar` now stamps **`campaignId`** on the character record (nulled on leave/delete via a re-push) and the `characters` rule grants **read** to the loremaster of that campaign; `Sync.peekCharacter(id)` → `gmPeek` renders a read-only summary modal (attributes/TNs, vitals, V/W, conditions, skills★, profs, weapons). (3) **📢 Broadcast feed**: `campaigns/{cid}/broadcast/{pushId} = {text,ts,from}` — rule: loremaster-write create-only, member-read; `Sync.subscribeBroadcast` (persistent, `limitToLast(20)`, **ts-watermark** so only genuinely-new messages toast — the first snapshot is history; `showToast` helper added in `src/03-state.js`), `sendBroadcast` (composer on the GM tab: `gmBroadcastSend`), feed rendered in the campaign overlay + GM tab (`renderBroadcastFeed`). (4) **🏰 Campaign Fellowship card on the GM tab** (`renderGmCampaign`, live via the multi-listener party subscription): members with vitals/online + Peek buttons. Harness **93/93** (+2 gm-spec checks: role-gating inert locally; broadcast rejects out-of-campaign + toast renders). **Live-verified pre-redeploy**: loremaster role reveals the tab (toggle off), player role hides it (falls back to Character tab), Fellowship card + composer render, broadcast correctly `PERMISSION_DENIED`. **PENDING: redeploy `database.rules.json`** (adds broadcast rule + `campaignId` validate + loremaster-peek read), then live-verify broadcast toast + feed. Note: in-campaign hero pushes carry `campaignId` and will fail validation until the redeploy (out-of-campaign unaffected — the null key is dropped).
  - **Deviation from the original P6 spec (documented):** GM **hand-out to remote heroes** (damage/conditions/Shadow on another player's sheet) is NOT implemented — `characters/{id}` is owner-only-write by design (verified rules), so remote hand-outs would need a GM-write relaxation or a request-queue node. Players adjust their own sheets at the table; the GM runs the shared encounter, broadcasts, and peeks. The local-roster hand-out controls remain for same-device heroes.
- [ ] **(original cloud spec) GM dashboard, gated by `role === "loremaster"` (or a GM toggle).**
  - Goal: the optional GM surface Dragonbane proved out — most of it already built in `tor2e-loremaster-main`.
  - **Source: port the `tor2e-loremaster-main` GM tooling** into `gm.js` — party dashboard (`renderPartyTab`), group shadow tests (`rollGroupCheck`/`applyShadowDirect`), NPC ledger (`LORE_NPCS` + custom), Eye manager (5 revelation tables), and the Moria/journey/loot generators (reuse its `moria-only` gating). Re-source its data from live RTDB instead of imported JSON.
  - Target: new `gm.js` + a GM nav tab (gated like the solo tabs via the UI-refresh path), `sync.js` (broadcast).
  - Behavior: **party panel** (live vitals/conditions/dying for all heroes), **peek any sheet** (read-only), **drop adversaries** into the shared encounter from `BESTIARY`, **hand out** damage / a condition / a Shadow point to a chosen hero (through the normal write path so rules+caps apply), and a **broadcast** box → pushes a message or a rolled result to every player (toast + a saved "📢 Loremaster" feed on each sheet). Plain players never see the GM tab.
  - Schema (RTDB): `campaigns/{id}/broadcast/{pushId}: { text, ts, from }` (GM-write / member-read). No character-schema change (uses existing `state`).
  - Acceptance: a campaign creator (loremaster) sees the GM tab; a joiner does not; dropping a foe hits the shared encounter; a broadcast toasts all players and persists in their feed.
  - Risk: medium.

### Phase P7 — Firebase Security Rules
- [x] **✅ COMPLETE — full rules (characters + joinCodes + campaigns/members/encounter/broadcast) DEPLOYED and live-verified 2026-07-02.** History: `characters` ownership rules shipped 2026-07-01 (ahead of order, to gate P3 verification safely). `database.rules.json` created with **default-deny** (`.read/.write:false` at root) + a `characters` block that is **owner-only**: per-hero `.read`/`.write` require `auth.uid === owner` (write also covers create/update/delete without letting `owner` be reassigned), a parent-level `.read` that permits **only** the exact query `Sync._syncDown` issues (`orderByChild('owner').equalTo(uid)`), `.indexOn:["owner"]` (this satisfies the index the P3 sync-down query needed — previously flagged pending), and per-field `.validate` (owner string, data object, `$other:false` to reject stray keys). **Campaign/encounter/broadcast rules are deliberately NOT written yet** — those nodes don't ship until P4/P5/P6, and the root default-deny keeps them locked; adding rules for unbuilt nodes would be speculative + risky. Pure valid JSON (no comments) so it deploys via `firebase deploy --only database` or paste into the console. **✅ VERIFIED live 2026-07-01** against the real project: owner write + owner-filtered query allowed; foreign-owner write + unfiltered collection read both `PERMISSION_DENIED`.
- [ ] **(remaining) campaign/encounter/broadcast rules + role enforcement.**
  - Goal: players read/write only their own hero + shared campaign state they're allowed to; loremaster gets campaign-wide write.
  - Target: new `database.rules.json` (port + adapt Dragonbane's).
  - Behavior: `characters/{id}` writable only by `owner`; `campaigns/{id}/members` self-write own membership; `campaigns/{id}/encounter` writable by members but GM-locked fields restricted to `role==="loremaster"`; `broadcast` GM-write/member-read.
  - Acceptance: a non-owner write to someone else's hero is rejected; a non-GM write to a GM-locked encounter field is rejected (tested against the RTDB emulator or a manual check; document the method).
  - Risk: medium (security-sensitive — review before any real deploy).

### Phase P8 — Accessibility pass
- [x] **Keyboard + screen-reader support. ✅ done 2026-06-29.** New `initA11y()` (`src/06-tabs-init.js`, called in DOMContentLoaded) adds a centralized a11y layer over **every `.menu-overlay`** (static overlays *and* `showModal()` styled modals): `role="dialog"` + `aria-modal="true"` + `aria-labelledby` (from each dialog's heading); a `MutationObserver` on the `.show` toggle **moves focus into** the dialog on open and **restores focus to the opener** on close; a document keydown handler **traps Tab** within the open dialog and **closes on Escape** (clicks the dialog's close/cancel control so cleanup like Table Mode's timer runs; never force-hides a pending `showModal`). Nav: `bindTabs` sets **`aria-current="page"`** on the active tab (initial + on switch). Live regions: `aria-live="polite"` on the dice **`#roll-result`** and the **End/Hope** current-value vitals (with `aria-label`s). Additive — no visual/behavior change for mouse/touch. Verified by a new **`tests/specs/a11y.js` (7 checks)**: live regions, single aria-current, dialog semantics, focus-in, Escape-close, focus-restore, 0 errors. Harness **75/75**. SW cache → v88. *(Minor follow-up: aria-labels on the remaining generated icon-only buttons — ▲▼ reorder, `×` delete — the high-value dialog/nav/live-region a11y is done.)*
  - Goal: usable by keyboard and screen reader; no layout change for touch users.
  - Target: `ui.js` (modals), nav, dice/vitals render.
  - Behavior: dialogs get `role="dialog"`/`aria-modal`/`aria-labelledby`, focus-in on open, **Tab trapped**, **Escape** closes, focus restored to opener; `aria-current="page"` on the active tab; `aria-live="polite"` on dice results + HP/Hope values; `aria-label` on icon-only buttons; decorative emoji `aria-hidden`.
  - Schema: none.
  - Acceptance: a new `tests/specs/a11y.js` (dialog semantics + focus-in + Escape + focus-restore + live regions + nav aria-current) is green.
  - Risk: low.

### Out of scope (explicitly deferred)
- Portrait image upload (declined).
- Single-file bundle step to restore `file://` (could revisit after P2 if open-from-Files is missed).
- Any rules change. If a cloud feature seems to need a rules tweak, **stop and ask** — it doesn't belong in this roadmap.

---

## UX & Quality Enhancements (PLANNED — 2026-06-29)

> **Status: PLAN ONLY.** A rules-neutral backlog gathered 2026-06-29 (Q&A), distinct from the
> cloud/GM roadmap above. **None change any TOR2E rule** — they surface, speed up, present, or
> safeguard what's already there. Each item is tagged **(pre-split safe)** = can land anytime,
> independent of the module split, like Phase P0 · or **(do after P2)** = touches code the
> module split (P2) will relocate, so defer it to avoid refactoring the same thing twice.
> Format: **Goal · Target · Behavior · tag.** Tick + dated entry when each lands.

### A. At-the-table speed
- [ ] **U1 — Roll-from-anywhere bar.** Goal: cut taps for the most common in-play action. Target: a persistent bar / floating button + the dice path (`quickRoll`/`rollDice`). Behavior: fire your **last roll** and a few **pinned/favourite** rolls from any tab without switching to Dice; long-press a skill/prof to pin it. **(do after P2 — dice + render move)**
- [ ] **U2 — Multi-skill / group rolls.** Goal: resolve batched checks at once (the unchecked Priority-3 "group rolls"). Target: dice module. Behavior: select several skills/profs → roll together → combined result list (e.g. a whole-Fellowship check). **(do after P2)**
- [~] **U3 — Gear & list ergonomics.** ✅ **reorder done 2026-06-29** — War Gear rows get touch-friendly **▲/▼** buttons (`moveWeapon(i,dir)`) instead of HTML5 drag (unreliable on iOS); swaps in `char.weapons`, persists, re-renders. Verified live (reorder + top/bottom no-ops). ⚠️ **Spillage of the 2 extra action-cell buttons at 390px not yet verified** (the preview pane has no real width — `innerWidth:2`); confirm via the P1 spillage spec or a real device. Still TODO (deferred): collapsible card sections with **remembered** collapsed state. **(do after P2)**
- [~] **U4 — Navigation polish.** ✅ **remember-last-tab done 2026-06-29** — `bindTabs` persists `tor2e-lasttab` on every tab click; `restoreLastTab()` (called in `DOMContentLoaded`) reopens it on load, guarded so it never restores into a hidden solo-only tab (verified live: persists on click, restores visible tab, skips hidden `oracle`). Still TODO (deferred): **swipe between tabs** + **jump-to-section** within long tabs. **(pre-split safe)**

### B. In-app rules reference (paraphrased summaries only — never rulebook prose)
- [x] **U5 + U6 + U8 — Reference tab. ✅ done 2026-06-29** (built together as one consolidated tab). New **📖 Ref** tab + `panel-reference`, `REFERENCE` data + `renderReference()` with a live search filter. Six groups: **Stances** (reuses the in-app `STANCE_INFO` — single source of truth), **Conditions** (Weary/Miserable/Wounded), **Combat Tasks** (5), **Dice & Target Numbers** (TN=20−Rating / 18 Strider, Feat die, ✦ icons, great success), **Key Terms** (8), and the **18 Skills** with one-line purposes. All paraphrased, RAW-accurate, and consistent with the app's own mechanics (no rulebook prose). Hidden from print (`#panel-reference` added to the `@media print` hide list). Verified live: all 6 groups render, search filters correctly (e.g. "stealth" shows Stealth, hides Weary).
- [ ] **U7 — Contextual inline hints.** Goal: explain numbers/actions in place. Target: many render sites (fields/buttons). Behavior: small (?) affordances expanding the existing tooltip pattern. **(do after P2 — else you annotate code that moves)**

### C. Presentation & output
- [x] **U9 — Text-size control. ✅ done 2026-06-29.** `🔠 Text Size` menu button cycles Normal/Small/Large (`cycleTextSize`/`applyTextSize`, persisted in `tor2e-textsize`); scales the whole UI via `body.text-small{zoom:.9}` / `body.text-large{zoom:1.15}` (zoom scales the many px font-sizes too; iOS-supported), independent of Compact Mode. Verified live (zoom 1 / 0.9 / 1.15, label updates).
- [x] **U10 — More themes. ✅ done 2026-06-29.** Replaced the binary dark toggle with a `🎨 Theme` cycler (`cycleTheme`/`applyTheme`, `THEMES=['auto','light','dark','sepia','hc']`, persisted in `tor2e-theme`; `auto` stored as *absent* so the prefers-color-scheme listener keeps working). Added **Sepia** (deeper aged-paper) and **High Contrast** (black-on-white, 2px borders, accessibility) CSS var blocks alongside the existing light/dark. Verified live: all 5 cycle with distinct `--bg` (auto→#15110c, light→#f5ecd9, dark→#15110c, sepia→#ece0bf, hc→#ffffff) and correct labels; theme-color meta updates per theme.
- [x] **U11 — Big-screen Table Mode. ✅ done 2026-06-29.** `📺 Table Mode` menu button → full-screen overlay (`openTableMode`/`renderTableMode`/`closeTableMode` in `src/03-state.js`) with a **fixed dark high-contrast palette** (not the app theme — legible across a room) showing every roster hero as a large card (name · ❤ End · ✦ Hope · 🌑 Shadow+Scars · WEARY/MISERABLE/WOUNDED/DYING pills) plus the active encounter's living foes (name · End · WOUNDED) with a round counter. **Auto-refreshes every 2s while open** (timer cleared on close). Read-only. Verified by 2 `ux`-spec checks (hero cards + foe shown; timer starts/clears). Foundation for the P6 GM party panel. SW cache → v83.
- [ ] ~~Printable/PDF character sheet~~ — **not selected** (2026-06-29); existing `@media print` stays as-is.

### D. Data safety & insight
- [x] **U12 — Auto-backup & restore points. ✅ done 2026-06-29.** Per-hero ring buffer of full-slot snapshots (`tor2e-backups`, max 8/hero) in `src/03-state.js`: one auto-snapshot per app load (`snapshotHero(activeCharId,'load')` in the DOMContentLoaded init), a `📸 Snapshot now` button, and a `♻️ Restore Points` menu overlay listing snapshots (timestamp + reason) with one-tap Restore. Restore takes a **safety snapshot of the current state first**, so the restore is itself undoable; dedupes identical consecutive snapshots. Verified by 2 `ux`-spec checks (snapshot + dedupe + 2nd entry; UI lists 2 rows). Independent of the 50-deep in-memory undo and manual export. (Reconcile with P3 cloud backup when that lands.) SW cache → v82.
- [x] **U13 — Roll stats. ✅ done 2026-06-29.** `renderRollStats()` adds a read-only summary bar above the Dice-tab history: total rolls, successes + success-rate %, failures, rolls-with-✦-icons, and great-successes (≥2 icons), over the stored history. Verified live (3 sample rolls → "3 rolls · ✅ 2 (67%) · ❌ 1 · ✦ 2 · 🌟 1 great+"; clears when empty). Shadow/Hope *trend over time* deferred until U15 (campaign timeline) provides the time-series.
- [x] **U14 — Bulk export + restore. ✅ done 2026-06-29.** `📦 Export ALL Heroes (backup)` → `exportAllHeroes()` bundles every roster hero + their Chronicle + roll history into one `roster-export-v1` JSON. `📦 Restore Heroes (backup)` → `importAllHeroes()` adds them back with **fresh ids (never overwrites** existing heroes). Verified live (functions + menu buttons + file input wired; roster gather confirmed). Deferred: the "back up after big changes" **nudge** (small follow-up).
- [x] **U15 — Campaign timeline. ✅ done 2026-06-29.** A lightweight **all-modes** per-hero event log (`char.timeline[]`, separate from the solo prose Chronicle; exports/syncs with the hero, capped 200). `logTimeline(type,text)` + a `📜 Campaign Timeline` menu overlay (`src/03-state.js`). Captured at **funnel points** to minimise edits: `adj()` covers Shadow gains, Scar gains, and Valour/Wisdom rank-ups (one site); `awardSessionXP` logs session XP; `fpComplete` logs Fellowship Phase (incl. Yule). Recovery (negative deltas) doesn't log. New schema field `timeline: []` (`DEFAULT_CHARACTER` + `migrateCharacter` back-fill). Verified by 2 `ux`-spec checks (logs xp + Shadow-via-`adj`, skips recovery; viewer lists rows). SW cache → v84.

### Suggested quick-win order (the pre-split-safe items, do anytime)
U10 (themes) → U9 (text size) → U4 (nav: remember last tab + swipe) → U5/U6 (rule cards + skill reference) → U8 (cheat-sheet tab) → U14 (bulk/reminded export) → U13 (roll stats) → U3 drag-reorder. Everything else waits for P2.

---

## Interactive Tutorial (2026-06-05)
A guided **Lessons menu** that teaches the whole game on a safe **sandbox practice hero**. Built per the user's spec (asked one question at a time). Launch: ☰ menu **📖 Tutorial** + a one-time first-run offer (`maybeOfferTutorial`, gated by `tor2e-tutorial.offered`).

- **Lessons** (`TUTORIAL_LESSONS`, **10 · 57 steps** — expanded 2026-06-05 into a complete first-player rules course): **How the Game Works** (overview) · Character Creation · Dice Basics · Combat · Conditions/Shadow/Rest · Journey · Councils & Endeavours · Treasure & Magical Items · Advancement & Fellowship · Solo Play. Each = `{ id, icon, title, sub, prep(char), steps:[{tab, sel, intro, title, body, done, more}] }`; every step has a concise `body` + a deeper "Tell me more" (`more`) carrying the RAW idea, so the tour doubles as a rules primer. **Free pick** — `prep()` auto-prepares the hero (`_tutBuildIfBlank` fills a ready Barding warden unless one was already built; Creation resets to blank; Conditions seeds Shadow + lowered Endurance; Fellowship adds spendable XP; Solo flips `striderMode`).
- **One shared sandbox hero across all lessons.** `_tutEnterSandbox()` saves the real hero, creates a practice roster entry, swaps it in. `_tutExitSandbox()` (on **Done**) offers **Keep** (rename, leave it active) or **Discard** (delete its slots, restore the previous `activeId` via `applyActiveCharacter`). Reuses the roster API so saves never touch real heroes.
- **Highlight engine (reworked 2026-06-06 — no dim)**: `_tutRender()` switches to `step.tab`, resolves `step.sel`, **climbs to the enclosing `.card`** (`closest('.card')`; opt out with `step.exact:true`) and draws a glowing **gold border frame** (`#tut-hole` — border, *not* a dim cutout; the page stays fully visible & usable). `#tut-card` floats near the frame (below → above → docked bottom) and is **draggable** by its `⠿` header (`_tutBindDrag`, pointer events; drag pins it for that step). **Graceful degradation**: a missing or hidden (`0×0`) target hides the frame and centers the card — the tour can't get stuck. The done-poll **pauses while any `.menu-overlay.show` is open** so auto-advance never fires under a picker/dialog. Tap-Next/Back; `tutNext`/`tutPrev`/`tutComplete`/`tutExit`/`tutDone`. (2026-06-06 also fixed step texts to match real labels: "▶ Start Journey", "▶ Begin Council", "Award Session XP (+3 SP / +3 AP)", "Open Fellowship Phase Wizard", "Clear Shadow → +1 Scar", and added journey/council section targets.)
- **Progress** (`tor2e-tutorial`): `{ completed:{id:true}, resume:{lessonId,step}, offered }` → ✓ on the menu + resume mid-lesson. **↺ Reset tutorial progress** (`resetTutorial`, in the Lessons menu) removes the key entirely — clears ✓/resume and re-arms the first-run welcome.
- Selectors used (stable): `.tab[data-tab=…]`, `#apply-culture-btn`, `.roll-btn`, `#encounter-card-wrap`, `#end-cur-v`, `#hope-cur-v`; everything else centers.
- **Interactive steps (2026-06-05)**: the spotlight is **non-blocking** (`#tut-overlay` `pointer-events:none`, cutout outlined in gold; `#tut-card` stays `pointer-events:auto`), so you tap the real highlighted control. Steps with a `done(char, baseline)` predicate **auto-advance** on a false→true transition (450ms poll → ✓ flash → `tutNext`); a "👉 Try it" cue shows, Next reads "Skip ›", and an already-satisfied condition shows "✓ Already done — tap Next" (no surprise advance). `_tutRender` captures `s.baseline={rolls:history.length}`; `_tutClearPoll` on every render/exit/complete/done. `done` wired on the key actions: pick a Culture, make a roll, add a foe, strike a foe, start a journey, begin a council, toggle a condition, add a magical item.
- **Hands-on "step aside" mode (2026-06-05)**: a step can step the tutorial fully aside so you act on the real page. **👉 Try it on the page** (on `done` steps) and **🔍 Look around the app** (on *every* step) call `tutStepAside()` → `_tutHideSpotlight()` + a floating **↩ Return pill** (`#tut-pill`, `tutReturn`); sets `_tutState.aside=true`. The done-poll keeps running, so finishing the action **auto-returns and advances** (pill flashes "✓ Done! Returning…"); otherwise the Return pill brings you back to the **same** step (advance-if-done-else-same). `_tutRender` resets `aside` + hides the pill; exit/complete/done hide it too.
- **Verified in jsdom**: sandbox create → restore (discard brings the real hero back) / keep (strips "(Practice)"); every lesson runs; bad selector centers without crashing; completion + resume persist; **auto-advance fires when the real action is performed**; **Try-it hides the overlay + shows the pill, doing the action auto-advances, manual Return on an unfinished step stays put, Look-around works on read-only steps, exit clears the pill** — no errors. Honest scope: only a handful of controls are spotlighted by `sel` (the rest center).

## Moria Solo Mode (full subsystem reference)

The *Moria — Through the Doors of Durin* solo campaign, built as a **self-contained second solo mode** parallel to Strider Mode. Sources: the Moria **Solo Rules** chapter (Band, Battles, solo journeys, milestones, solo FP) + the Moria **Loremaster Rules** chapter (Chamber Generator, Revelation Episodes, Orc-Band Generator, Moria-Madness). All 8 build phases complete and browser-verified (2026-05-29). The two source markdowns + the old phased plan have been folded into this section — **this is the single source of truth**.

### Activation & precedence
- One menu toggle: **`toggleMoriaMode()`** (`⛏️ Enable Moria Solo Mode`). Sets `char.moriaMode`.
- Creation deltas on enable: **+5 max Hope** (band support, tracked/reversible via `char.moriaHopeBonus`), Patron → **Balin** (note), Fellowship ≥ 3, Safe Haven default "Moria — First Hall", `huntRegion = 'dark'` (Dark Land, Hunt 14), PE budget 15 (via `isSolo()`).
- **Precedence on shared surfaces:** `moriaMode → Moria · else striderMode → Strider · else normal`. Helpers `isMoria()` / `isSolo()` / `oracleSet()`. Moria & Strider are independent booleans (can both be on; Moria wins). TN-18 stays Strider-only (Moria RAW doesn't change the TN formula).
- Gating: `refreshStriderUI()` shows **Band + Battle tabs**, `.moria-only` cards, the shared-calling optgroup, and the Eye-of-Mordor card in Moria mode.

### Data model (on `char`, with load migration)
- `char.moriaMode`, `char.moriaHopeBonus`, `char.huntMod` (Hunt mods from prev-mission + FP duration), `char.shadowPathOrig` (Moria-Madness revert).
- `char.band = { readiness (TN = 20−readiness), dispositions{expertise,manoeuvre,rally,vigilance,war}, burden, sharedCalling, dispositionFocus, allies[] }`. Ally = `{ id, name, gift, giftDesc, quirk, hardened, injury, fatigue, outOfAction, kinglyGift:{name}|null, giftWasted }`.
- `char.mission = { active, objective, size, warGear, specialisation, prevOutcome, fpDuration, roster[] }` (empty roster = whole Band).
- `char.battle = { active, scale, foeMight, foeResistance, foeResMax, archfoe, objective, objectiveRes(Max), advantages[], complications[], leaderFocus, bandStance, inspired, focusBonus, fleeIll, round, log[] }`.

### Subsystems (as built)
- **Band tab** — Readiness/TN, 5 Disposition counters + roll buttons, Burden picker, Weary pill (auto when ≥ half the *mission roster* are out/serious). Ally roster: generate (Gift/Quirk/Name roll tables), per-ally injury/fatigue/hardened/out-of-action/**on-mission**/**Kingly-Gift** controls + **wasted-gift** badge. Endurance Test (Rally vs TN+DamageThreat) and Fatigue Test (Rally vs TN+pts ± Burden dice) → on fail apply/worsen the least-injured roster ally via `_applyInjuryFromFail` (shared with Clash failures). **Solo Tools** card: Hero-or-Band success-die roller (odd=Band, even=hero), Desperate Stand (pick ally → Favoured 2-Feat roll; an 👁 → survives, else lost +2 Shadow).
- **Dispositions** — rolled via `bandRoll()` (weary-aware; Eye auto-fails only when Miserable). Gift dropdown (+1d, **wasted on Eye**, Kingly variant re-rolls one Eye via `kinglyWard`), Hope spend (+1d, **+2d on the Disposition Focus** from the shared calling). `missionAllies()` scopes weary/picks to the roster.
- **Shared Callings** (5, in `CALLINGS` with `shared:true`) — Reclaimers/Pathfinders/Standard-Bearers/Guardians/Vanguards → Disposition Focus + 2-of-3 favoured + shadow path. Picked from the Build calling dropdown (Moria optgroup); `applyCalling` sets `char.band.dispositionFocus`.
- **Mission planning** card — objective roller, composition (Size/War Gear/Specialisation) → live-preview Dispositions/Burden/Readiness/EA/Hunt, prev-mission + FP-duration Hunt mods, ally roster picker. `applyMissionSetup` writes computed values.
- **Battle tab** — War Party (scale roller, Might/Resistance), Archfoe (Lesser/Greater), Objective Resistance, Battlefield Aspect, **Get-in-Position** → Advantage/Complication. **Clash loop**: Leader Focus (Command/Inspire/Fight/Duel) → Band Stance (Aggressive/Balanced/Guarded/Fleeing) → Clash roll (War/Manoeuvre vs TN+Might ± focus/advantages/complications/archfoe + gift/hope) → spend successes (−Foe/Objective Resistance, Advantage, remove Complication, Harry Archfoe). Failure → Endurance Test + all Advantages lost; Eye-fail → **Clash Setback** (d12, auto-applies Reinforcements +3 / Fell Presence +2 Shadow / persistent complications). Victory at foe Resistance 0. Duel = hand-off to Combat/Dice tabs.
- **Journeys** — `resolveJourneyEvent()` Moria branch (Ill-Favoured Dark Land; events 👁 Deadly Dark / 1-2 Long Dark / 3-5 Watchful Eyes / 6-9 Branching Stairs / 10 Right Way / ᚱ Dread & Wonder; 6 Event-Detail sub-tables; no roles, skill from detail; Branching-Stairs auto-rolls a Chamber). Marching Test auto-rolls TRAVEL for the solo Guide. Distance roller = (2 Success dice)×4 miles ÷2 = hexes.
- **Oracle generators** (Moria-only cards) — Random Chamber Generator (4 Feat-die tables → Type/Appearance/Condition/Challenge), Random Orc-Band (Feat leader + N success dice = party size, count field), Moria **Lore** (4-column Action/Aspect/Focus/Feature, `MORIA_LORE`, Feature button gated). Revelation Episodes (`rollRevelationEpisode` → `rollMoriaRevelation`): Success-die trigger (1-3 Dire / 4-5 Orc / 6 Terrors) + Ghâsh escalation, 4× d12 tables, fires on EA ≥ Hunt. Fortune/Ill-Fortune reuse the near-identical Strider tables.
- **Shadow** — shared pool; band loss → `gainBandShadow` (+1 Severe/Grievous, +2 lost). **Moria-Madness** alt shadow path (`toggleMoriaMadnessPath`, flaws Distracted/Mistrustful/Blinded/Jealous, reversible).
- **Milestones & Fellowship Phase** — milestone picker swaps to `MORIA_EXP_MILESTONES` in Moria mode. **Moria FP** (`moriaFP`, no Yule): Hurried/Brief/Extended recovery profiles (Hope by Heart vs full, Endurance, Shadow 1-3, wound heal, tiered band-condition clearing, **wasted-gift recovery**); FP Interruption roll (Eye → `FP_INTERRUPTIONS`); undertakings Recruit Allies + Reclaim Safe Haven; Refresh FP (Fellowship Milestone). **Kingly Gift** = give a Famous item to a Hardened ally (2nd gift + Eye-reroll ward).

### Key constants (grep these in `character-tracker.html`)
`DISPOSITIONS`, `SHARED_CALLINGS`, `ALLY_GIFTS`/`ALLY_QUIRKS`/`ALLY_NAMES`, `INJURY_ORDER`/`FATIGUE_ORDER`/`INJURY_SERIOUS`/`FATIGUE_SERIOUS`/`BURDEN_DICE`/`DAMAGE_THREAT`, `MISSION_OBJECTIVES`/`COMP_SIZE`/`COMP_WARGEAR`/`COMP_SPEC`/`EA_SIZE_MOD`/`HUNT_MOD_PREV`/`HUNT_MOD_FP`, `WAR_PARTY` (via `mapWarParty`)/`ARCHFOE_MODS`/`OBJECTIVE_RES`/`BATTLEFIELD_ASPECTS`/`CLASH_SETBACK`, `MORIA_JOURNEY_EVENTS`/`MORIA_EVENT_DETAILS`, `CHAMBER_TYPE`/`CHAMBER_CONDITION`/`CHAMBER_APPEARANCE`/`CHAMBER_CHALLENGE`/`REVELATION_MORIA`/`ORC_BAND_LEADER`/`ORC_BAND_MEMBER`, `MORIA_LORE`, `MORIA_EXP_MILESTONES`/`FP_INTERRUPTIONS`, `HUNT_THRESHOLDS`. `FLAWS_BY_PATH['Moria-Madness']`.

### Honest scope / deferrals
- **Duel** is a pointer to the existing Combat/Dice tabs (3 rounds vs Archfoe), not a re-implemented combat engine.
- Some **Clash Setback** follow-ups (AWARENESS/MANOEUVRE/RALLY rolls) are described, not auto-resolved; mechanical ones (Resistance +3, +Shadow, complications) auto-apply.
- **Rumours / Water Peril** tables from the Loremaster chapter are not yet in-app (low-priority flavour).
- Moria **Fortune/Ill-Fortune** reuse the Strider tables (≈identical text + same EA ±1/+2).

---

## Design Constraints

- **No build step** — must remain a plain HTML file openable from Files app
- **iOS Safari compatibility** — test all features in mobile Safari
- **Touch-first** — tap targets ≥ 32px, no hover-dependent UI
- **Offline-first** — never depend on a network request
- **Data preservation** — never destroy character data without explicit user confirmation
- **Single file unless necessary** — only split when file grows past ~200KB or maintenance becomes painful

---

## Known Issues / Limitations

- ~~**Brawling proficiency not in COMBAT_PROFS** — Brawling weapons (Unarmed/Dagger/Cudgel/Club) exist in WEAPONS but the proficiency isn't tracked. Per rules Brawling uses the highest combat prof at −1d.~~ ✅ **Fixed.** Brawling now appears in the quick-roll grid as a derived prof (`getBrawlingRating()` = `max(other profs) − 1`).
- ~~**Conditional virtue effects** (Dragon-Slayer, Sure at the Mark, Defiance, etc.) shown in description but not automatically applied during rolls — relies on player to remember. Adding all as toggles would clutter dice tab.~~ ✅ **Partially fixed (2026-05-27).** 6 auto-applies + 2 toggles wired:
  - **Auto (no UI, fires only if virtue owned + context matches):** Sure at the Mark (Bows attack → Favoured), Against the Unseen (Dread Shadow Test → Favoured), Strength of Will (Dread Shadow Test → +1d), Untameable Spirit (Sorcery Shadow Test → +1d), Stone-Hard (Protection → Favoured unless Miserable), Skin-Coat (Protection + leather/none armour → +1d).
  - **Toggles on Dice tab (only shown if virtue owned):** Dragon-Slayer (🐉 Foe is Might 2+ → Favoured attack), Dark for Dark Business (🌑 Dark/Underground → Inspired, source-tracked alongside Brave/Invoke-DF).
  - **Still narrative-only:** Defiance (end-of-combat End recovery), Desperate Courage (Hope+Shadow→Inspired), Brother to Bears (Brawling −1d cancel), Bree-Pony, Heir of Arnor, Royalty Revealed, Tough as Old Tree-Roots, Memory of Ancient Days, plus all flat-passive virtues (Small Folk, Durin's Way) that don't fit dice-tab toggles. Helper `hasVirtue(name)` available for future hooks.
- ~~**Spiteful Shadow Path** has Wandering-Madness flaws (Spiteful/Brutal/Cruel/Murderous). The 7-column cheat sheet table is ambiguous; current mapping is best-effort.~~ **Fixed:** the original mapping was shifted by one column. Per Core Rules p.140 the correct mapping is now in `FLAWS_BY_PATH`: Curse of Vengeance (Champion) → Spiteful/Brutal/Cruel/Murderous; Dragon-Sickness (Treasure Hunter) → Grasping/Mistrustful/Deceitful/Thieving; Lure of Power (Captain) → Resentful/Arrogant/Overconfident/Tyrannical; Lure of Secrets (Scholar) → Haughty/Scornful/Scheming/Traitorous; Path of Despair (Warden) → Troubled/Wavering/Guilt-ridden/Fearful; Wandering-Madness (Messenger) → Idle/Forgetful/Uncaring/Cowardly.
- **Combat Proficiency XP costs** in Spend XP modal use the in-game `XP_COST_TO_REACH` table (4/8/12/20/26/30). Character creation Previous Experience costs (1-5 SP, 2/4/6 AP) are not exposed since pre-XP-spend is part of Build.
- **Attribute Growth via new Valour/Wisdom rank** not yet implemented — the cheat sheet hints at it but rules need confirmation. For now, attribute ratings are locked.
- **Native `confirm()` / `alert()`** used throughout — less polished than custom modals. ✅ **Styled modal infrastructure added** (`showModal` / `confirmStyled` / `alertStyled`); migration of existing native calls deferred (would cascade sync→async through many functions). New features should use the styled helpers.
- **Rewards re-equipping** — if you change armour/shield after applying Close-fitting / Cunning Make / Reinforced, the reward's reference becomes stale. Manual revert + reapply needed.

### Action Resolution rules deviations / gaps (the ~1% the coverage matrix flags)

- ~~**Brave at a Pinch is more generous than RAW.**~~ ✅ **Fixed.** Now sets Inspired state; Inspired doubles a Hope spend to +2d (per RAW p.20). No bonus without Hope spend.
- ~~**Inspiration as a generic state is not modeled.**~~ ✅ **Fixed.** Added "✨ Invoke Distinctive Feature" button on dice tab that sets Inspired with source "Distinctive Feature". Player narrates which DF they're invoking.
- ~~**Give-side Support button missing.**~~ ✅ **Fixed.** "🤝 Support Ally" mini-button added under the Hope counter on Character tab.
- ~~**Favoured vs Ill-Favoured cancellation not auto-computed.**~~ ✅ **Fixed (2026-05-27).** `diceState.autoFavSources` / `autoIllSources` arrays track every auto source (cultural blessings, conditional virtues, skill's own Favoured flag, Dragon-Slayer toggle, etc.). New `effectiveFav()` helper layers them against the manual seg-btn pick per RAW p.20 — any-Fav + any-Ill → cancel to Normal. `rollFeatDie` and `pickFeat` use the effective state. A `#fav-cancel-hint` element under the Feat-die picker surfaces auto-Favoured sources by default, and flips to a "⚖ {fav-list} ⇄ {ill-list} — cancel to Normal" warning when an opposing pick layers. The result summary also gets a "⚖ Cancelled: … → rolled Normal" tag when it fires. `autoIllSources` is empty today (no auto-Ill rules in the catalog yet) but the plumbing is in place for future Ill-Favoured triggers (e.g. Sorcery debuffs, foe abilities).
- **Repeating-a-Roll rules not enforced.** RAW: cannot re-attempt the same skill action unless circumstances change in a meaningful way. The app doesn't track or block re-rolls. Probably correct to leave as player-tracker behaviour.

---

## Local Development

```bash
# Just open the file in a browser
open "character-tracker.html"

# Or serve locally (optional, for testing PWA features)
python3 -m http.server 8000
# Then visit http://localhost:8000/character-tracker.html
```

---

## Deployment

The project folder contains **two copies** of the app for different deploy paths:
- `character-tracker.html` — canonical edit target. All edits should be made here first.
- `index.html` — duplicate kept in sync for hosted deploys (Netlify serves it at root URL).

After every meaningful edit to `character-tracker.html`, **sync the copy**:

```bash
cp "character-tracker.html" "index.html"
```

(Claude should run this automatically after every batch of changes that the user is likely to deploy.)

### 🟢 Path 1 — Netlify Drop (recommended, real HTTPS PWA)

**Initial deploy (Mac):**
1. Open https://app.netlify.com/drop in a browser
2. Drag the entire `TOR2E Tracker` folder onto the drop zone
3. Wait ~20 seconds → Netlify gives a URL like `https://random-name.netlify.app`
4. Click **"Claim this site"** → sign in with email or GitHub (free)
5. **Site Settings → Change site name** for a memorable URL

**Redeploy after an update:**
- Either drag the folder onto the same site's **Deploys** page in Netlify dashboard
- Or connect the folder to a Git repo (later upgrade)

**Install on iPhone/iPad:**
1. Open the Netlify URL in **Safari**
2. Tap **Share** (square + ↑) → **Add to Home Screen** → **Add**
3. Red-ring "TOR" icon appears on Home Screen — launches fullscreen as a PWA

### 🟡 Path 2 — iCloud Drive direct (fallback, no hosting)

The file is in iCloud Drive so it syncs automatically to iOS devices.

**On iPhone/iPad:**
1. Open **Files** app → navigate to `iCloud Drive → iCloud Downloads → Coding → TOR2E Tracker`
2. Tap `character-tracker.html` — opens in iOS HTML preview
3. Tap **Share** → **"Open in Safari"**
4. In Safari: **Share** → **Add to Home Screen**

⚠️ iOS Safari treats `file://` PWAs with limited support — the Home Screen icon may behave more like a bookmark than a true fullscreen PWA. Path 1 (Netlify) is preferred for proper PWA experience.

### What `Add to Home Screen` provides

Already correctly configured via meta tags in `<head>`:
- `apple-mobile-web-app-capable` → fullscreen launch (no Safari chrome)
- `apple-mobile-web-app-status-bar-style` → status bar themed parchment-cream
- `apple-mobile-web-app-title` → "TOR2E" displayed under the icon
- `apple-touch-icon` → inline SVG data-URI showing red TOR ring on parchment
- `viewport-fit=cover` + `safe-area-inset-*` CSS → proper notch handling on newer iPhones

### Updating an installed PWA

When the deployed version changes:
1. The Home Screen-installed app uses Safari's cache by default
2. To force-refresh: open the URL in Safari, long-press reload → **"Request without cache"**
3. In rare cases: delete the Home Screen icon and re-add from Safari
4. **localStorage character data persists** across these refreshes — only an explicit browser-data clear (or Reset Character in the app menu) wipes it

### Backup workflow

Before any major update, the user can export their character via the ☰ Menu → **Export Character (JSON)**. The JSON file can be saved to iCloud Drive or emailed. Restore via the same menu's **Import**.

---

## File Layout

```
TOR2E Tracker/
├── character-tracker.html              # canonical edit target — all changes start here
├── index.html                          # mirror of character-tracker.html for hosted deploys
├── sw.js · manifest.json · icon-*.png/svg  # PWA service worker + install assets
├── CLAUDE.md                            # this file — single source of truth (incl. full Moria subsystem ref)
├── MD FIles/                            # extracted rulebook markdown (source reference for Claude)
│   ├── Moria - Solo Rules.md · Moria - Rules.md
│   └── (Strider Mode, etc.)
└── *.pdf                               # original rulebook PDFs (Core Rules, Cheat Sheet, supplements)
```

**Workflow rule for Claude**: after any batch of edits to `character-tracker.html`, run `cp character-tracker.html index.html` to keep the deployed mirror in sync, and bump `CACHE_VERSION` in `sw.js`. Mention the deployed file is updated when reporting completed work.

Future structure if we ever split (only if file becomes unmaintainable):

```
TOR2E Tracker/
├── index.html
├── styles.css
├── app.js
├── data/
│   ├── cultures.js
│   ├── callings.js
│   ├── weapons.js
│   ├── rewards.js
│   └── virtues.js
├── manifest.json
└── service-worker.js
```
