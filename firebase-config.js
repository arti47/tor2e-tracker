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
window.FIREBASE_ENABLED = false;
window.FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
