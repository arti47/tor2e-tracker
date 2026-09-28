// A stand-in for the Firebase Realtime Database, for driving several "devices" (browser contexts)
// against one shared campaign in the harness. The real SDK is blocked in tests; this replaces it
// with a small compat-API shim in each page that relays every read, write and subscription to one
// in-memory tree held here in Node. Writes fan out to every subscribed page, so a Loremaster
// context and two player contexts see each other's changes the way real phones would.
//
// NOT modelled: security rules (database.rules.json is enforced only by the real server — deploy
// and verify it live), offline behaviour, and transactions' atomicity.

const CLIENT = `(() => {
  const uid = window.__FB_UID || ('u' + Math.random().toString(36).slice(2, 8));
  let lid = 0, seq = 0;
  const listeners = {};
  const snap = (v, key) => {
    const val = v === undefined ? null : v;
    return { key: key || null, val: () => (val === null ? null : JSON.parse(JSON.stringify(val))), exists: () => val !== null,
      forEach(fn) { if (val && typeof val === 'object') Object.keys(val).sort().some(k => fn(snap(val[k], k)) === true); } };
  };
  window.__fbDeliver = (id, v) => { const l = listeners[id]; if (l) try { l.cb(snap(v, l.key)); } catch (e) { console.warn('listener', e); } };
  const norm = p => String(p || '').split('/').filter(Boolean).join('/');
  const genKey = () => { const t = Date.now().toString(36).padStart(9, '0'); seq++; return '-' + t + String(seq).padStart(5, '0') + Math.random().toString(36).slice(2, 5); };
  function Ref(path, q) { this.path = norm(path); this.q = q || null; const parts = this.path.split('/'); this.key = this.path ? parts[parts.length - 1] : null; this._ids = []; }
  Ref.prototype.child = function (p) { return new Ref(this.path + '/' + p); };
  Ref.prototype.push = function (val) {
    const r = new Ref(this.path + '/' + genKey());
    if (val === undefined) return r;
    const p = r.set(val); r.then = p.then.bind(p); r.catch = p.catch.bind(p); return r;
  };
  Ref.prototype.set = function (v) { return window.__fb({ op: 'set', path: this.path, value: v === undefined ? null : v }); };
  Ref.prototype.update = function (v) { return window.__fb({ op: 'update', path: this.path, value: v }); };
  Ref.prototype.remove = function () { return this.set(null); };
  Ref.prototype.transaction = function (fn) {
    return window.__fb({ op: 'get', path: this.path }).then(cur => { const next = fn(cur === undefined ? null : cur); if (next === undefined) return { committed: false }; return this.set(next).then(() => ({ committed: true, snapshot: snap(next, this.key) })); });
  };
  Ref.prototype.once = function () { return window.__fb({ op: 'get', path: this.path, q: this.q }).then(v => snap(v, this.key)); };
  Ref.prototype.on = function (ev, cb) {
    const id = ++lid; listeners[id] = { cb, key: this.key }; this._ids.push(id);
    if (this.path === '.info/connected') { setTimeout(() => window.__fbDeliver(id, true), 0); return cb; }
    window.__fb({ op: 'sub', id, path: this.path, q: this.q }); return cb;
  };
  Ref.prototype.off = function () { this._ids.forEach(id => { delete listeners[id]; window.__fb({ op: 'unsub', id }); }); this._ids = []; };
  Ref.prototype.orderByChild = function (k) { return new Ref(this.path, Object.assign({}, this.q, { orderBy: k })); };
  Ref.prototype.equalTo = function (v) { return new Ref(this.path, Object.assign({}, this.q, { equalTo: v })); };
  Ref.prototype.limitToLast = function (n) { return new Ref(this.path, Object.assign({}, this.q, { last: n })); };
  Ref.prototype.onDisconnect = function () { return { set: () => Promise.resolve(), remove: () => Promise.resolve(), cancel: () => Promise.resolve() }; };
  const db = { ref: p => new Ref(p) };
  const user = { uid, isAnonymous: true, linkWithPopup: () => Promise.resolve() };
  const auth = { currentUser: user, onAuthStateChanged(cb) { setTimeout(() => cb(user), 0); return () => {}; },
    signInAnonymously: () => Promise.resolve({ user }), signInWithPopup: () => Promise.resolve({ user }) };
  const firebase = { apps: [], initializeApp(cfg) { this.apps.push(cfg); return {}; }, database: () => db, auth: () => auth };
  firebase.database.ServerValue = { TIMESTAMP: { '.sv': 'timestamp' } };
  firebase.auth.GoogleAuthProvider = function () {};
  window.firebase = firebase;
  window.__fakeFirebase = true;
})();`;

function createFakeDb() {
  let root = {};
  const subs = new Map();   // id -> { page, path, q, last }
  const parts = p => String(p || '').split('/').filter(Boolean);
  const clone = v => (v === undefined || v === null) ? null : JSON.parse(JSON.stringify(v));
  const stamp = v => {
    if (v && typeof v === 'object') {
      if (v['.sv'] === 'timestamp') return Date.now();
      const o = Array.isArray(v) ? [] : {};
      Object.keys(v).forEach(k => { const s = stamp(v[k]); if (s !== null && s !== undefined) o[k] = s; });
      return o;
    }
    return v;
  };
  // RTDB stores arrays as objects keyed "0","1",… and drops empty containers and nulls.
  const toTree = v => {
    if (v === null || v === undefined) return null;
    if (typeof v !== 'object') return v;
    const o = {};
    Object.keys(v).forEach(k => { const c = toTree(v[k]); if (c !== null) o[k] = c; });
    return Object.keys(o).length ? o : null;
  };
  const fromTree = v => {
    if (!v || typeof v !== 'object') return v;
    const keys = Object.keys(v);
    const isArr = keys.length && keys.every((k, i) => String(i) === k);
    if (isArr) return keys.map(k => fromTree(v[k]));
    const o = {}; keys.forEach(k => { o[k] = fromTree(v[k]); }); return o;
  };
  function get(path) {
    let n = root;
    for (const k of parts(path)) { if (!n || typeof n !== 'object' || !(k in n)) return null; n = n[k]; }
    return n === undefined ? null : n;
  }
  function put(path, value) {
    const ks = parts(path);
    const v = toTree(stamp(value));
    if (!ks.length) { root = v || {}; return; }
    let n = root;
    for (let i = 0; i < ks.length - 1; i++) { if (!n[ks[i]] || typeof n[ks[i]] !== 'object') n[ks[i]] = {}; n = n[ks[i]]; }
    if (v === null) delete n[ks[ks.length - 1]]; else n[ks[ks.length - 1]] = v;
    prune(root);
  }
  function prune(n) { if (!n || typeof n !== 'object') return; Object.keys(n).forEach(k => { prune(n[k]); if (n[k] && typeof n[k] === 'object' && !Object.keys(n[k]).length) delete n[k]; }); }
  function query(path, q) {
    let v = get(path);
    if (!q || !v || typeof v !== 'object') return clone(fromTree(v));
    let keys = Object.keys(v).sort();
    if (q.orderBy !== undefined && q.equalTo !== undefined) keys = keys.filter(k => v[k] && v[k][q.orderBy] === q.equalTo);
    if (q.last) keys = keys.slice(-q.last);
    const o = {}; keys.forEach(k => { o[k] = v[k]; });
    return keys.length ? clone(fromTree(o)) : null;
  }
  async function handle(page, msg) {
    switch (msg.op) {
      case 'get': return query(msg.path, msg.q);
      case 'sub': {
        const key = page.__fbId + ':' + msg.id;
        const v = query(msg.path, msg.q);
        subs.set(key, { page, path: msg.path, q: msg.q, last: JSON.stringify(v) });
        page.evaluate(([i, val]) => window.__fbDeliver && window.__fbDeliver(i, val), [msg.id, v]).catch(() => {});
        return null;
      }
      case 'unsub': subs.delete(page.__fbId + ':' + msg.id); return null;
    }
    return null;
  }
  // Keys in subs are "pageId:listenerId"; deliveries use the page-local listener id.
  async function notifyAll() {
    for (const [key, s] of subs) {
      const v = query(s.path, s.q); const j = JSON.stringify(v);
      if (j === s.last) continue; s.last = j;
      const id = parseInt(key.split(':')[1]);
      s.page.evaluate(([i, val]) => window.__fbDeliver && window.__fbDeliver(i, val), [id, v]).catch(() => {});
    }
  }
  let pageSeq = 0;
  return {
    // Wire a browser context: every page in it runs the shim as `uid` and talks to this tree.
    async attach(context, uid) {
      await context.addInitScript(u => { window.__FB_UID = u; }, uid);
      await context.addInitScript(CLIENT);
      await context.exposeBinding('__fb', async (source, msg) => {
        if (!source.page.__fbId) source.page.__fbId = 'p' + (++pageSeq);
        if (msg.op === 'set' || msg.op === 'update') {
          if (msg.op === 'set') put(msg.path, msg.value);
          else Object.keys(msg.value || {}).forEach(k => put(msg.path ? msg.path + '/' + k : k, msg.value[k]));
          await notifyAll(); return null;
        }
        return handle(source.page, msg);
      });
      // Real phones reach Firebase; the harness serves the SDK URLs empty so the shim is what runs.
      await context.route(/firebasejs/, r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    },
    get: path => clone(fromTree(get(path))),
    set: async (path, v) => { put(path, v); await notifyAll(); },
    dump: () => clone(root)
  };
}

module.exports = { createFakeDb };
