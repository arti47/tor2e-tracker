/* ---------- CLOUD SYNC (P3 — Firebase, optional) ----------
   Dormant by default. The app is 100% local/localStorage unless ALL of the following hold:
     • firebase-config.js sets FIREBASE_ENABLED = true with real (non-placeholder) keys, AND
     • the Firebase compat SDK actually loaded (it won't over file:// or offline).
   When any is false, Sync stays disabled and every code path behaves exactly as before — this is
   what keeps the offline/clone-and-run ethos (and the headless test harness, which blocks the SDK)
   working unchanged. Cloud behaviour (auth, mirroring, migration) is layered on in later P3 steps. */
const Sync = {
  enabled: false,
  uid: null,
  db: null,
  auth: null,
  storage: null,
  _lastError: null,

  // Is cloud sync configured + available? (Does NOT throw; safe to call anywhere.)
  available() {
    return !!(window.FIREBASE_ENABLED
      && typeof firebase !== 'undefined'
      && window.FIREBASE_CONFIG
      && window.FIREBASE_CONFIG.apiKey
      && window.FIREBASE_CONFIG.apiKey !== 'YOUR_API_KEY');
  },

  isEnabled() { return this.enabled; },

  // Boot Firebase if (and only if) available. Idempotent. Called once at startup.
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
      // (P3 later steps: anonymous auth, RTDB offline persistence, Store cloud-mirroring, and the
      //  first-run local→cloud roster migration. Intentionally not wired yet.)
    } catch (e) {
      this._lastError = 'Firebase init failed: ' + (e && e.message ? e.message : e);
      console.warn(this._lastError);
      this.enabled = false;
    }
  }
};
