// ---------------------------------------------------------------------------
// Firebase config (OPTIONAL cloud sync). DISABLED by default so the app runs 100%
// offline from localStorage out of the box (clone-and-run, works over file://).
//
// To turn on cloud sync (multi-device heroes + shared party):
//   1. Create a Firebase project → enable Anonymous Auth + Realtime Database.
//   2. Paste your web-app config below and set FIREBASE_ENABLED = true.
// These are public web-app identifiers, not secrets — but do NOT commit a config
// for a project whose database rules aren't locked down (see database.rules.json).
// ---------------------------------------------------------------------------
window.FIREBASE_ENABLED = true;
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyDL28UL_twZKvqQfs5SQ0o9gog-3UMaUkE",
  authDomain: "tor2e-tracker.firebaseapp.com",
  databaseURL: "https://tor2e-tracker-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "tor2e-tracker",
  storageBucket: "tor2e-tracker.firebasestorage.app",
  messagingSenderId: "12814245621",
  appId: "1:12814245621:web:163b3d8cb3e99ea2ebafbc"
};
