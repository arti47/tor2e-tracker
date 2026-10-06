// TOR2E Tracker — Service Worker
// Strategy:
//   • HTML / navigations → NETWORK-FIRST: always fetch the freshest page when online,
//     fall back to cache only when offline. This means a deploy shows up on the next
//     online load with no stale-cache lag.
//   • Code (.js/.css/.json) → NETWORK-FIRST as well, so HTML and scripts always match.
//   • Static assets (images, fonts, icons) → CACHE-FIRST for speed/offline.
//   • Updates AUTO-ACTIVATE: install skipWaiting()s and activate claims clients, so a new
//     deploy takes over on the next online load (the page reloads once to pick up fresh HTML).
//     This keeps clients from getting stuck on a stale build.
// Bump CACHE_VERSION on any deploy so old caches are garbage-collected on activate.

const CACHE_VERSION = 'tor2e-v171';
const PRECACHE = [
  './',
  './index.html',
  './character-tracker.html',
  './styles.css',
  './firebase-config.js',
  './src/vendor-qrcode.js',
  './src/01-core.js',
  './src/02-data.js',
  './src/03-state.js',
  './src/04-render.js',
  './src/05-combat-build.js',
  './src/06-tabs-init.js',
  './src/07-sync.js',
  './src/08-gm.js',
  './src/09-art.js',
  './src/10-map-data.js',
  './src/10-map.js',
  './src/11-table.js',
  './maps/middle-earth.webp',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon.svg',
  './fonts/eb-garamond-latin-500-normal.woff2',
  './fonts/eb-garamond-latin-600-normal.woff2',
  './fonts/eb-garamond-latin-700-normal.woff2',
  './fonts/eb-garamond-latin-500-italic.woff2'
];

self.addEventListener('install', (event) => {
  // Precache best-effort (don't let one missing file fail the whole install).
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache =>
      // cache:'reload' skips the browser's HTTP cache, so a new version can never precache old code
      Promise.all(PRECACHE.map(u => cache.add(new Request(u, { cache: 'reload' })).catch(() => null)))
    )
  );
  self.skipWaiting();  // auto-activate so stuck clients can't be marooned on an old build
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  const isHTML = event.request.mode === 'navigate' ||
                 event.request.destination === 'document' ||
                 url.pathname.endsWith('.html') ||
                 url.pathname.endsWith('/');
  // The app's code is network-first too: fresh HTML running last version's scripts shows new
  // controls wired to old functions (the map card once did nothing that way).
  const isCode = /\.(js|css|json)$/.test(url.pathname);

  if (isHTML || isCode) {
    // Network-first: freshest HTML online, cached shell offline.
    event.respondWith(
      fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() =>
        caches.match(event.request).then(c => c || (isHTML ? caches.match('./index.html').then(i => i || caches.match('./character-tracker.html')) : Response.error()))
      )
    );
    return;
  }

  // Cache-first for static assets.
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
