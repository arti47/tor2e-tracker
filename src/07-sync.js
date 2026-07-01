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
