/* ---------- CLOUD SYNC (P3 — Firebase, optional) ----------
   Dormant by default. The app is 100% local/localStorage unless ALL of the following hold:
     • firebase-config.js sets FIREBASE_ENABLED = true with real (non-placeholder) keys, AND
     • the Firebase compat SDK actually loaded (it won't over file:// or offline).
   When any is false, Sync stays disabled and every code path behaves exactly as before — this is
   what keeps the offline/clone-and-run ethos (and the headless test harness, which blocks the SDK)
   working unchanged.

   MODEL (steps 1–2): localStorage remains the working source of truth (so all existing logic +
   the test suite are unchanged). Cloud is an ADDITIVE mirror:
     • mirror-up: saveCharacter() → Sync.queuePush(id) (debounced) → characters/{id} in RTDB.
     • pull-missing: on sign-in, any cloud hero owned by this uid but absent locally is copied down
       (cross-device restore); any local hero absent in the cloud is pushed up (first-run migration).
   Conflict policy for now is last-write-wins per hero (live two-way party sync is P4). All cloud
   calls are guarded by `enabled` + `uid`, so with cloud off they are no-ops.
   NOTE: the actual cloud round-trip needs a real Firebase project to verify — it cannot be exercised
   by the headless harness (which blocks the SDK). Only the local no-op paths are test-covered. */
const Sync = {
  enabled: false,
  uid: null,
  db: null,
  auth: null,
  _lastError: null,
  _pushTimers: {},
  _migrated: false,

  available() {
    return !!(window.FIREBASE_ENABLED
      && typeof firebase !== 'undefined'
      && window.FIREBASE_CONFIG
      && window.FIREBASE_CONFIG.apiKey
      && window.FIREBASE_CONFIG.apiKey !== 'YOUR_API_KEY');
  },

  isEnabled() { return this.enabled; },
  status() {
    if (!this.enabled) return this._lastError || 'Local only';
    return this.uid ? 'Cloud synced' : 'Connecting…';
  },

  init() {
    if (this.enabled) return;
    if (!this.available()) {
      this._lastError = (typeof firebase === 'undefined')
        ? 'Firebase SDK not loaded (offline or file://) — running locally.'
        : (window.FIREBASE_ENABLED ? 'Firebase not configured — running locally.' : 'Cloud sync disabled — running locally.');
      return;
    }
    try {
      if (!firebase.apps || !firebase.apps.length) firebase.initializeApp(window.FIREBASE_CONFIG);
      this.db = firebase.database();
      this.auth = firebase.auth();
      this.enabled = true;
      this.auth.onAuthStateChanged(user => {
        if (user) { this.uid = user.uid; this._onSignedIn(); }
        else { this.auth.signInAnonymously().catch(e => { this._lastError = 'Anonymous sign-in failed: ' + (e && e.message); }); }
      });
    } catch (e) {
      this._lastError = 'Firebase init failed: ' + (e && e.message ? e.message : e);
      console.warn(this._lastError);
      this.enabled = false;
    }
  },

  _onSignedIn() {
    this._syncDown();   // pull cloud heroes missing locally, then push local heroes missing in cloud
    if (this.currentCampaign()) { this._setupPresence(); this.subscribeEncounter(); }   // resume campaign surfaces
    if (typeof refreshPartyPill === 'function') refreshPartyPill();   // light up the header pill once signed in
  },

  // Latest campaign members snapshot (populated while any party listener is active), for read-only views.
  lastParty() { return this._lastParty; },

  // Lightweight presence: mark our member node online while connected; onDisconnect flips it false.
  _presenceRef: null,
  _setupPresence() {
    if (!this.enabled || !this.uid) return;
    const cid = this.currentCampaign(); if (!cid) return;
    this._teardownPresence();
    const memRef = this.db.ref('campaigns/' + cid + '/members/' + this.uid);
    const connRef = this.db.ref('.info/connected');
    this._presenceRef = connRef;
    connRef.on('value', snap => {
      if (snap.val() !== true) return;
      memRef.child('online').onDisconnect().set(false);
      memRef.child('online').set(true).catch(() => {});
    });
  },
  _teardownPresence() {
    if (this._presenceRef) { try { this._presenceRef.off('value'); } catch (e) {} this._presenceRef = null; }
  },

  // Debounced mirror-up (saveCharacter is called very frequently; coalesce writes per hero).
  queuePush(id) {
    if (!this.enabled || !this.uid || !id) return;
    clearTimeout(this._pushTimers[id]);
    this._pushTimers[id] = setTimeout(() => this.pushChar(id), 1500);
  },

  pushChar(id) {
    if (!this.enabled || !this.uid || !id) return;
    let data = null, rolls = null, journal = null;
    try { data = JSON.parse(localStorage.getItem(CHAR_PREFIX + id)); } catch (e) {}
    if (!data) return;
    try { rolls = JSON.parse(localStorage.getItem(ROLLS_PREFIX + id)); } catch (e) {}
    try { journal = JSON.parse(localStorage.getItem(JOURNAL_PREFIX + id)); } catch (e) {}
    this.db.ref('characters/' + id).set({
      owner: this.uid,
      updated: firebase.database.ServerValue ? firebase.database.ServerValue.TIMESTAMP : Date.now(),
      name: data.name || 'Hero',
      data, rolls: rolls || null, journal: journal || null
    }).catch(e => console.warn('cloud push failed:', e && e.message));
  },

  // Cross-device restore + first-run migration. Never overwrites a locally-present hero.
  _syncDown() {
    if (!this.enabled || !this.uid) return;
    this.db.ref('characters').orderByChild('owner').equalTo(this.uid).once('value').then(snap => {
      const cloud = snap.val() || {};
      let roster = loadRoster() || { activeId: null, list: [] };
      let added = 0;
      Object.keys(cloud).forEach(id => {
        const rec = cloud[id];
        if (!rec || !rec.data) return;
        if (localStorage.getItem(CHAR_PREFIX + id)) return;   // present locally → don't clobber (last-write-wins locally)
        localStorage.setItem(CHAR_PREFIX + id, JSON.stringify(rec.data));
        if (rec.rolls) localStorage.setItem(ROLLS_PREFIX + id, JSON.stringify(rec.rolls));
        if (rec.journal) localStorage.setItem(JOURNAL_PREFIX + id, JSON.stringify(rec.journal));
        if (!roster.list.some(e => e.id === id)) roster.list.push({ id, name: rec.data.name || rec.name || 'Hero' });
        added++;
      });
      if (added) {
        if (!roster.activeId && roster.list.length) roster.activeId = roster.list[0].id;
        saveRoster(roster);
        if (typeof applyActiveCharacter === 'function') applyActiveCharacter();
        if (typeof showToast === 'function') showToast(`☁️ Restored ${added} hero(es) from the cloud.`);
      }
      // First-run migration: push any LOCAL hero not yet in the cloud.
      if (!this._migrated) {
        this._migrated = true;
        (loadRoster() || { list: [] }).list.forEach(e => { if (!cloud[e.id]) this.pushChar(e.id); });
      }
    }).catch(e => console.warn('cloud sync-down failed:', e && e.message));
  },

  /* ---------- P4: campaigns & live Fellowship party ----------
     A campaign is a shared node with a memorable join code. Members publish a lightweight VITALS
     snapshot into their own member node (readable by fellow members) so the party banner can show
     End/Hope/Shadow/conditions live WITHOUT exposing each other's full owner-only character record.
     Role ("player"|"loremaster") is stored from day one (gates the P6 GM surface later). */
  campaignId: null,
  _partyRef: null,
  _partyListeners: [],
  _lastParty: null,

  currentCampaign() {
    if (this.campaignId) return this.campaignId;
    try { const c = JSON.parse(localStorage.getItem('tor2e-campaign-v1')); if (c && c.id) { this.campaignId = c.id; return c.id; } } catch (e) {}
    return null;
  },
  _saveCampaign(id, code, owner, role) { try { localStorage.setItem('tor2e-campaign-v1', JSON.stringify({ id, code, owner: !!owner, role: role === 'loremaster' ? 'loremaster' : 'player' })); } catch (e) {} this.campaignId = id; },
  isCampaignOwner() { try { return !!(JSON.parse(localStorage.getItem('tor2e-campaign-v1')) || {}).owner; } catch (e) { return false; } },
  myRole() { try { return (JSON.parse(localStorage.getItem('tor2e-campaign-v1')) || {}).role || 'player'; } catch (e) { return 'player'; } },
  isLoremaster() { return this.myRole() === 'loremaster'; },
  _clearCampaign() { try { localStorage.removeItem('tor2e-campaign-v1'); } catch (e) {} this.campaignId = null; },

  // Memorable two-word code, e.g. "SHADOW-MITHRIL". Avoids ambiguous look-alikes by using whole words.
  _genCode() {
    const A = ['SHADOW', 'MITHRIL', 'ELVEN', 'DARK', 'GOLDEN', 'SILVER', 'ANCIENT', 'HIDDEN', 'GREY', 'WILD', 'DEEP', 'LONELY', 'MISTY', 'BLACK', 'WHITE', 'STONE'];
    const B = ['RING', 'DELVING', 'HALL', 'GATE', 'PEAK', 'RIVER', 'FOREST', 'CROWN', 'HOARD', 'WARG', 'RAVEN', 'EMBER', 'THORN', 'HOLLOW', 'MARCH', 'DURIN'];
    const pick = arr => arr[Math.floor(Math.random() * arr.length)];
    return pick(A) + '-' + pick(B) + '-' + (Math.floor(Math.random() * 90) + 10);
  },

  // Build the lightweight vitals snapshot published to fellow members (no full character data).
  _vitalsOf(d) {
    if (!d) return null;
    return {
      name: d.name || 'Hero',
      endCur: parseInt(d.endCur) || 0, endMax: parseInt(d.endMax) || 0,
      hopeCur: parseInt(d.hopeCur) || 0, hopeMax: parseInt(d.hopeMax) || 0,
      shadow: (parseInt(d.shadow) || 0) + (parseInt(d.scars) || 0),
      valour: parseInt(d.valour) || 0, wisdom: parseInt(d.wisdom) || 0,
      weary: !!d.weary, miserable: !!d.miserable, wounded: !!d.wounded,
      dying: (parseInt(d.endCur) || 0) <= 0
    };
  },

  // Create a campaign with the ACTIVE hero as first member. role: 'player' | 'loremaster'.
  createCampaign(name, role) {
    if (!this.enabled || !this.uid) return Promise.reject(new Error('Cloud sync is not active.'));
    const cid = this.db.ref('campaigns').push().key;
    const code = this._genCode();
    const meta = { name: name || 'Fellowship', joinCode: code, ownerUid: this.uid, createdAt: firebase.database.ServerValue ? firebase.database.ServerValue.TIMESTAMP : Date.now() };
    const member = {
      displayName: (typeof char !== 'undefined' && char.name) || 'Hero',
      characterId: activeCharId, role: role === 'loremaster' ? 'loremaster' : 'player',
      updated: Date.now(), online: true, vitals: this._vitalsOf(typeof char !== 'undefined' ? char : null)
    };
    const updates = {};
    updates['campaigns/' + cid + '/meta'] = meta;
    updates['campaigns/' + cid + '/members/' + this.uid] = member;
    updates['joinCodes/' + code] = cid;
    return this.db.ref().update(updates).then(() => { this._saveCampaign(cid, code, true, member.role); this._setupPresence(); this.subscribeEncounter(); return { cid, code }; });
  },

  // Join by code: resolve joinCodes/{CODE} -> cid, then write our own membership.
  joinCampaign(codeRaw, role) {
    if (!this.enabled || !this.uid) return Promise.reject(new Error('Cloud sync is not active.'));
    const code = (codeRaw || '').trim().toUpperCase();
    if (!code) return Promise.reject(new Error('Enter a join code.'));
    return this.db.ref('joinCodes/' + code).once('value').then(snap => {
      const cid = snap.val();
      if (!cid) throw new Error('No campaign found for code ' + code + '.');
      const member = {
        displayName: (typeof char !== 'undefined' && char.name) || 'Hero',
        characterId: activeCharId, role: role === 'loremaster' ? 'loremaster' : 'player',
        updated: Date.now(), online: true, vitals: this._vitalsOf(typeof char !== 'undefined' ? char : null)
      };
      return this.db.ref('campaigns/' + cid + '/members/' + this.uid).set(member).then(() => { this._saveCampaign(cid, code, false, member.role); this._setupPresence(); this.subscribeEncounter(); return { cid, code }; });
    });
  },

  // Owner-only: tear down the whole campaign + its join-code index (rules enforce ownership).
  deleteCampaign() {
    const cid = this.currentCampaign();
    if (!this.enabled || !this.uid || !cid) return Promise.reject(new Error('Not in a campaign.'));
    let code = null;
    try { code = (JSON.parse(localStorage.getItem('tor2e-campaign-v1')) || {}).code; } catch (e) {}
    this.unsubscribeParty();
    this._teardownPresence();
    this.unsubscribeEncounter();
    const updates = {};
    updates['campaigns/' + cid] = null;
    if (code) updates['joinCodes/' + code] = null;
    return this.db.ref().update(updates).then(() => {
      this._clearCampaign();
      if (typeof renderEncounter === 'function') renderEncounter();   // back to the local encounter
    });
  },

  leaveCampaign() {
    const cid = this.currentCampaign();
    this.unsubscribeParty();
    this._teardownPresence();
    this.unsubscribeEncounter();
    if (this.enabled && this.uid && cid) this.db.ref('campaigns/' + cid + '/members/' + this.uid).remove().catch(() => {});
    this._clearCampaign();
    if (typeof renderEncounter === 'function') renderEncounter();   // flip the Combat tab back to the local encounter
  },

  // Debounced vitals publish (called from saveCharacter alongside queuePush).
  publishVitals() {
    if (!this.enabled || !this.uid) return;
    const cid = this.currentCampaign(); if (!cid) return;
    clearTimeout(this._vitalsTimer);
    this._vitalsTimer = setTimeout(() => {
      this.db.ref('campaigns/' + cid + '/members/' + this.uid).update({
        displayName: (typeof char !== 'undefined' && char.name) || 'Hero',
        updated: Date.now(), vitals: this._vitalsOf(typeof char !== 'undefined' ? char : null)
      }).catch(() => {});
    }, 1500);
  },

  // Live party subscription (multi-listener): each cb(membersObject) fires on every roster change.
  // One underlying RTDB listener is shared across all subscribers so the header pill, Party View,
  // Table Mode, and campaign overlay can all listen at once. Returns the cb (its unsubscribe handle).
  subscribeParty(cb) {
    const cid = this.currentCampaign();
    if (!this.enabled || !this.uid || !cid) { cb && cb(null); return cb; }
    if (this._partyListeners.indexOf(cb) === -1) this._partyListeners.push(cb);
    if (!this._partyRef) {
      this._partyRef = this.db.ref('campaigns/' + cid + '/members');
      this._partyRef.on('value',
        snap => { this._lastParty = snap.val() || {}; this._partyListeners.slice().forEach(l => { try { l(this._lastParty); } catch (e) {} }); },
        err => { this._partyListeners.slice().forEach(l => { try { l(null, err); } catch (e) {} }); });
    } else if (this._lastParty) { try { cb && cb(this._lastParty); } catch (e) {} }   // replay latest to the new subscriber
    return cb;
  },
  // Remove one listener (pass the cb) or all (no arg). Detaches the RTDB listener when none remain.
  unsubscribeParty(cb) {
    if (cb) this._partyListeners = this._partyListeners.filter(l => l !== cb);
    else this._partyListeners = [];
    if (!this._partyListeners.length && this._partyRef) { try { this._partyRef.off('value'); } catch (e) {} this._partyRef = null; this._lastParty = null; }
  },

  /* ---------- P5: shared, GM-driven encounter ----------
     While in a campaign, the encounter's SHARED state (active/round/foes) lives at
     campaigns/{cid}/encounter and renders live for every member; the per-player dice options
     (weaponIdx + adv row) stay LOCAL on the mirror and are never pushed or overwritten.
     enc() in 05-combat-build.js returns this mirror whenever sharedEncActive(); out of a
     campaign the encounter is char.encounter exactly as before (local mode byte-identical).
     Conflict policy: last-write-wins on the shared subset with a dirty-check (we only push
     when OUR serialized copy changed, so a no-op save can never clobber a newer remote state).
     GM-locking (add/edit/remove foes, round, end) is enforced in the UI by role; the RTDB rule
     gates writes to campaign MEMBERS (per-field GM locks aren't sanely expressible over a foes
     array in RTDB rules — deviation from the original P5 spec, documented in CLAUDE.md). */
  _encRef: null,
  _sharedEnc: null,
  _lastEncJson: null,
  _encTimer: null,
  _encPushPending: false,

  sharedEncActive() { return !!(this.enabled && this.uid && this.currentCampaign()); },
  // The in-memory mirror. Stable object identity — the encounter engine mutates it in place.
  sharedEnc() {
    if (!this._sharedEnc) this._sharedEnc = this._normEnc(null);
    return this._sharedEnc;
  },
  // Normalize a raw RTDB value into a full encounter shape (RTDB drops empty arrays/objects).
  _normEnc(v) {
    const base = (typeof DEFAULT_CHARACTER !== 'undefined' && DEFAULT_CHARACTER.encounter)
      ? JSON.parse(JSON.stringify(DEFAULT_CHARACTER.encounter))
      : { active: false, round: 1, foes: [], weaponIdx: 0, adv: { open: false, hope: false, fav: 'normal', extra: 0, keen: false } };
    if (!v || typeof v !== 'object') return base;
    base.active = !!v.active;
    base.round = parseInt(v.round) || 1;
    base.foes = Array.isArray(v.foes) ? v.foes : Object.values(v.foes || {});
    base.foes.forEach(f => { f.attacks = Array.isArray(f.attacks) ? f.attacks : Object.values(f.attacks || {}); });
    return base;
  },
  _encSharedPayload() {
    const m = this.sharedEnc();
    return { active: !!m.active, round: parseInt(m.round) || 1, foes: m.foes || [] };
  },

  subscribeEncounter() {
    if (!this.sharedEncActive()) return;
    this.unsubscribeEncounter();
    const cid = this.currentCampaign();
    this._encRef = this.db.ref('campaigns/' + cid + '/encounter');
    this._encRef.on('value', snap => {
      // A local push is in flight: applying this (possibly stale/initial-null) snapshot would wipe
      // the unpushed change. Skip it — our own set() will echo back through here with the truth.
      if (this._encPushPending) return;
      const norm = this._normEnc(snap.val());
      const m = this.sharedEnc();
      // Merge only the SHARED subset; keep this device's weaponIdx/adv untouched.
      m.active = norm.active; m.round = norm.round; m.foes = norm.foes;
      this._lastEncJson = JSON.stringify(this._encSharedPayload());
      if (typeof encDeriveEngaged === 'function') encDeriveEngaged();
      if (typeof renderEncounter === 'function') renderEncounter();
      if (typeof renderGm === 'function' && document.querySelector('.tab[data-tab="gm"].active')) renderGm();
    }, () => {});
  },
  unsubscribeEncounter() {
    if (this._encRef) { try { this._encRef.off('value'); } catch (e) {} this._encRef = null; }
    clearTimeout(this._encTimer);
    this._sharedEnc = null; this._lastEncJson = null; this._encPushPending = false;
  },

  // Called from saveCharacter() on EVERY save; the dirty-check makes non-encounter saves free
  // and guarantees we never push an unchanged (possibly stale) copy over a newer remote one.
  queuePushEncounter() {
    if (!this.sharedEncActive() || !this._sharedEnc) return;
    const j = JSON.stringify(this._encSharedPayload());
    if (j === this._lastEncJson) return;
    this._lastEncJson = j;
    this._encPushPending = true;
    clearTimeout(this._encTimer);
    this._encTimer = setTimeout(() => {
      const cid = this.currentCampaign(); if (!cid) { this._encPushPending = false; return; }
      const payload = this._encSharedPayload();
      payload.updated = Date.now();
      this.db.ref('campaigns/' + cid + '/encounter').set(payload)
        .then(() => { this._encPushPending = false; })
        .catch(e => {
          // Failed (offline / rules): clear the flags so remote snapshots apply again and the
          // next save retries the push instead of being dirty-check-suppressed.
          this._encPushPending = false; this._lastEncJson = null;
          console.warn('encounter push failed:', e && e.message);
        });
    }, 300);
  },

  // Optional: upgrade the anonymous account to a Google account (cross-device identity). Step 3 UI.
  linkGoogle() {
    if (!this.enabled || !this.auth) { alert('Cloud sync is not active.'); return; }
    const provider = new firebase.auth.GoogleAuthProvider();
    const user = this.auth.currentUser;
    const p = user && user.isAnonymous ? user.linkWithPopup(provider) : this.auth.signInWithPopup(provider);
    p.then(() => alert('Google account linked — your heroes now back up to this account.'))
     .catch(e => alert('Google link failed: ' + (e && e.message)));
  }
};
