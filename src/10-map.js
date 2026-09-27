/* ============================================================================
   10-map.js — the Middle-earth hex map (2026-09-27)
   ----------------------------------------------------------------------------
   Tap where you start and where you're going; the app finds the way that takes the fewest days
   (a hex is a day, a hard-terrain hex one more), around water and impassable mountains, and fills
   the Journey setup: From, To, hexes, rough ground, lands, and the Peril of a perilous destination.
   Each Journey Event then uses the land of the hex it strikes in (journeyRegionNow). The terrain
   was read from the map image (src/10-map-data.js); any hex can be corrected with a long press,
   saved on this device (tor2e-map-fixes). During a journey, Play shows the real map with you on it.
   ============================================================================ */

const MAP_FIX_KEY = 'tor2e-map-fixes';
const MAP_LAND = { b: 'Border', l: 'Wild', d: 'Dark' };
const MAP_LAND_WORD = { b: 'Border Land', l: 'Wild Land', d: 'Dark Land', m: 'Impassable', w: 'Water', x: 'Off the map' };

const HexMap = {
  _fixes: null,
  _peril: null,
  fixes() {
    if (!this._fixes) { try { this._fixes = JSON.parse(localStorage.getItem(MAP_FIX_KEY)) || {}; } catch (e) { this._fixes = {}; } }
    return this._fixes;
  },
  saveFixes() { try { localStorage.setItem(MAP_FIX_KEY, JSON.stringify(this._fixes || {})); } catch (e) {} },
  perils() {
    if (!this._peril) { this._peril = {}; MAP_DATA.peril.forEach(([r, c, v, n]) => { this._peril[r + ',' + c] = { v, n }; }); }
    return this._peril;
  },
  inb(r, c) { return r >= 0 && c >= 0 && r < MAP_DATA.rows && c < MAP_DATA.cols; },
  center(r, c) { const G = MAP_DATA.grid; return [G.x0 + ((r & 1) ? G.w / 2 : 0) + c * G.w, G.y0 + r * G.h]; },
  at(x, y) {
    const G = MAP_DATA.grid, r0 = Math.round((y - G.y0) / G.h); let best = null;
    for (const r of [r0 - 1, r0, r0 + 1]) {
      const c = Math.round((x - G.x0 - ((r & 1) ? G.w / 2 : 0)) / G.w);
      const [cx, cy] = this.center(r, c), d = Math.hypot(x - cx, y - cy);
      if (!best || d < best.d) best = { r, c, d };
    }
    return this.inb(best.r, best.c) ? [best.r, best.c] : null;
  },
  /** What a hex is, after any correction made on this device. */
  terr(r, c) {
    if (!this.inb(r, c)) return { land: 'x', hard: false, peril: 0 };
    const ch = MAP_DATA.terrain[r * MAP_DATA.cols + c];
    const k = r + ',' + c, fx = this.fixes()[k] || {}, p = this.perils()[k];
    const land = fx.land || ch.toLowerCase();
    const hard = 'hard' in fx ? !!fx.hard : (ch !== ch.toLowerCase());
    const peril = 'peril' in fx ? (parseInt(fx.peril) || 0) : (p ? p.v : 0);
    return { land, hard: 'blm'.includes(land) ? hard && land !== 'm' : false, peril, area: p ? p.n : (peril ? 'Perilous area' : ''), fixed: !!this.fixes()[k] };
  },
  passable(r, c) { return 'bld'.includes(this.terr(r, c).land); },
  neighbours(r, c) {
    const odd = r & 1;
    const d = odd ? [[0, -1], [0, 1], [-1, 0], [-1, 1], [1, 0], [1, 1]] : [[0, -1], [0, 1], [-1, -1], [-1, 0], [1, -1], [1, 0]];
    return d.map(([dr, dc]) => [r + dr, c + dc]).filter(([a, b]) => this.inb(a, b));
  },
  /** The passable hex nearest to one that isn't (you can't start on a mountain top). */
  snap(r, c) {
    if (this.passable(r, c)) return [r, c];
    const seen = new Set([r + ',' + c]); let q = [[r, c]];
    for (let step = 0; step < 6 && q.length; step++) {
      const nq = [];
      for (const [a, b] of q) for (const [x, y] of this.neighbours(a, b)) {
        const k = x + ',' + y; if (seen.has(k)) continue; seen.add(k);
        if (this.passable(x, y)) return [x, y];
        nq.push([x, y]);
      }
      q = nq;
    }
    return null;
  },
  /** Fewest days between two hexes (Dijkstra; entering a hex costs 1 day, 2 if hard terrain). */
  shortest(from, to) {
    const C = MAP_DATA.cols, N = MAP_DATA.rows * C, idx = (r, c) => r * C + c;
    const dist = new Float64Array(N).fill(Infinity), prev = new Int32Array(N).fill(-1);
    const s = idx(from[0], from[1]), t = idx(to[0], to[1]);
    dist[s] = 0;
    const heap = [[0, s]];
    const push = e => { heap.push(e); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
    while (heap.length) {
      const [d, u] = pop(); if (d > dist[u]) continue; if (u === t) break;
      const r = Math.floor(u / C), c = u % C;
      for (const [a, b] of this.neighbours(r, c)) {
        const v = idx(a, b); if (!this.passable(a, b)) continue;
        // a hair of straightness so equal-cost routes read like roads, not zig-zags
        const nd = d + 1 + (this.terr(a, b).hard ? 1 : 0) + 0.001 * Math.abs(a - to[0]);
        if (nd < dist[v]) { dist[v] = nd; prev[v] = u; push([nd, v]); }
      }
    }
    if (!isFinite(dist[t])) return null;
    const path = []; for (let v = t; v !== -1; v = prev[v]) path.unshift([Math.floor(v / C), v % C]);
    return path;
  },
  /** A route through any stops, summarised the way the Journey setup needs it. */
  route(points) {
    let path = [];
    for (let i = 0; i + 1 < points.length; i++) {
      const leg = this.shortest(points[i], points[i + 1]); if (!leg) return null;
      path = path.concat(i ? leg.slice(1) : leg);
    }
    const steps = path.slice(1);   // the rules count the destination's hex but not the departure's
    const lands = path.map(([r, c]) => this.terr(r, c).land).join('');
    const perils = []; const seenArea = new Set();
    steps.forEach(([r, c], i) => { const t = this.terr(r, c); if (t.peril && !seenArea.has(t.area)) { seenArea.add(t.area); perils.push({ area: t.area, v: t.peril, at: i + 1 }); } });
    const end = path[path.length - 1], endT = this.terr(end[0], end[1]);
    return { path, lands, hexes: steps.length, hard: steps.filter(([r, c]) => this.terr(r, c).hard).length, perils, destPeril: endT.peril, destArea: endT.area };
  },
  placeAt(r, c) {
    let best = null;
    for (const [n, pr, pc] of MAP_DATA.places) { const d = Math.hypot(...this.center(pr, pc).map((v, i) => v - this.center(r, c)[i])); if (d < 30 && (!best || d < best.d)) best = { n, d }; }
    return best ? best.n : '';
  }
};

const _fold = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
function mapFindPlace(q) {
  const f = _fold(q); if (!f) return [];
  const hits = MAP_DATA.places.filter(([n]) => _fold(n).includes(f));
  return hits.sort((a, b) => (_fold(a[0]).startsWith(f) ? 0 : 1) - (_fold(b[0]).startsWith(f) ? 0 : 1));
}

/* ---------- the picker ---------- */
const MapPick = { from: null, to: null, via: null, fromName: '', toName: '', viaName: '', setting: 'from', result: null, vb: null, mode: 'pick' };

function openMapPicker(mode) {
  MapPick.mode = mode === 'view' ? 'view' : 'pick';
  const ov = document.getElementById('map-overlay'); if (!ov) return;
  const svg = document.getElementById('map-svg');
  const img = svg.querySelector('image');
  if (img && !img.getAttribute('href')) img.setAttribute('href', MAP_DATA.img);
  ov.classList.toggle('view-only', MapPick.mode === 'view');
  ov.classList.add('show');
  if (MapPick.mode === 'view') { _mapShowJourney(); return; }
  // From = where you are: your last destination, or your Safe Haven, when the map knows it
  if (!MapPick.from) {
    const j = char.journey || {};
    const guess = [j.active ? null : j.destination, char.safeHaven].filter(Boolean);
    for (const g of guess) { const hit = mapFindPlace(g)[0]; if (hit) { _mapSet('from', [hit[1], hit[2]], hit[0]); break; } }
  }
  MapPick.setting = MapPick.from ? 'to' : 'from';
  _mapFitAll();
  _mapRecompute();
}
function closeMapPicker() { const ov = document.getElementById('map-overlay'); if (ov) ov.classList.remove('show'); _mapHideSug(); }

function _mapSet(which, rc, name) {
  const s = rc && HexMap.snap(rc[0], rc[1]);
  if (!s) { if (typeof showToast === 'function') showToast('No way to travel there — try a hex nearby.'); return false; }
  MapPick[which] = s;
  MapPick[which + 'Name'] = name || HexMap.placeAt(s[0], s[1]) || `a spot on the map`;
  const inp = document.getElementById('map-' + which); if (inp) inp.value = name || HexMap.placeAt(s[0], s[1]) || '';
  return true;
}
function mapSetting(which) { MapPick.setting = which; _mapRecompute(); }
function mapClear(which) { MapPick[which] = null; MapPick[which + 'Name'] = ''; const inp = document.getElementById('map-' + which); if (inp) inp.value = ''; MapPick.setting = which === 'via' ? (MapPick.to ? 'to' : 'from') : which; _mapRecompute(); }

function _mapRecompute() {
  const pts = [MapPick.from, MapPick.via, MapPick.to].filter(Boolean);
  MapPick.result = (MapPick.from && MapPick.to) ? HexMap.route(pts) : null;
  _mapDraw(); _mapSummary();
}

function _mapSummary() {
  const el = document.getElementById('map-summary'), use = document.getElementById('map-use'), hint = document.getElementById('map-hint');
  document.querySelectorAll('#map-overlay .map-set').forEach(b => { const on = b.dataset.set === MapPick.setting; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
  if (hint) hint.textContent = !MapPick.from ? 'Tap where you start — or search above'
    : !MapPick.to ? 'Now tap where you are going'
    : MapPick.setting === 'via' ? 'Tap a place to go by way of it'
    : `Tap to move your ${MapPick.setting === 'from' ? 'start' : 'destination'} · press and hold a hex to correct it`;
  if (!el) return;
  const R = MapPick.result;
  if (use) use.disabled = !R;
  if (!MapPick.from || !MapPick.to) { el.innerHTML = '<p class="map-empty">Pick a start and a destination and the app finds the quickest way.</p>'; return; }
  if (!R) { el.innerHTML = '<p class="map-empty map-bad">There is no way across from here — water or mountains stand between. Try another start or destination, or go by way of somewhere.</p>'; return; }
  const days = R.hexes + R.hard, mounted = Math.ceil(days / 2);
  const counts = {}; R.lands.slice(1).split('').forEach(k => { if (MAP_LAND[k]) counts[k] = (counts[k] || 0) + 1; });
  const order = []; R.lands.split('').forEach(k => { if (MAP_LAND[k] && order[order.length - 1] !== k) order.push(k); });
  const landLine = order.map(k => `<span class="land-chip l-${k}">${MAP_LAND[k]}</span>`).join('<span class="land-arrow">→</span>');
  const passing = R.perils.filter(p => !(p.at === R.hexes && p.area === R.destArea));
  el.innerHTML = `<div class="map-sum-head"><strong>${escapeHtml(MapPick.fromName)}</strong> → <strong>${escapeHtml(MapPick.toName)}</strong>${MapPick.via ? ` <small>by way of ${escapeHtml(MapPick.viaName)}</small>` : ''}</div>
    <div class="map-sum-nums"><span><b>${R.hexes}</b> hexes</span><span><b>${R.hard}</b> rough</span><span>about <b>${days}</b> days on foot · <b>${mounted}</b> mounted</span></div>
    <div class="map-sum-lands">${landLine}</div>
    ${R.destPeril ? `<p class="map-warn">Your destination is perilous: <strong>${escapeHtml(R.destArea)}</strong>, Peril ${R.destPeril} — ${R.destPeril} extra event${R.destPeril > 1 ? 's' : ''} when you get there.</p>` : ''}
    ${passing.length ? `<p class="map-warn soft">The road passes through ${passing.map(p => `<strong>${escapeHtml(p.area)}</strong> (Peril ${p.v})`).join(', ')}. Go by way of somewhere else to avoid ${passing.length > 1 ? 'them' : 'it'}.</p>` : ''}`;
}

/* drawing: one SVG, the map as an <image>, everything else in the image's own pixels */
function _mapDraw() {
  const g = document.getElementById('map-marks'); if (!g) return;
  const R = MapPick.result;
  let h = '';
  if (R) {
    const pts = R.path.map(([r, c]) => HexMap.center(r, c).map(v => v.toFixed(1)).join(',')).join(' ');
    h += `<polyline class="mr-shadow" points="${pts}"/><polyline class="mr-route" points="${pts}"/>`;
    R.path.forEach(([r, c], i) => { if (!i) return; const t = HexMap.terr(r, c); if (t.peril) h += _hexPoly(r, c, 'mr-peril'); else if (t.hard) { const [x, y] = HexMap.center(r, c); h += `<circle class="mr-hard" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.6"/>`; } });
  }
  if (MapPick.via) h += _pin(MapPick.via, 'via');
  if (MapPick.from) h += _pin(MapPick.from, 'from');
  if (MapPick.to) h += _pin(MapPick.to, 'to');
  g.innerHTML = h;
}
function _hexPoly(r, c, cls) {
  const [x, y] = HexMap.center(r, c), s = MAP_DATA.grid.h * 2 / 3;
  const pts = [0, 1, 2, 3, 4, 5].map(k => { const a = Math.PI / 180 * (60 * k - 90); return (x + s * Math.cos(a)).toFixed(1) + ',' + (y + s * Math.sin(a)).toFixed(1); }).join(' ');
  return `<polygon class="${cls}" points="${pts}"/>`;
}
function _pin(rc, kind) {
  const [x, y] = HexMap.center(rc[0], rc[1]);
  const col = kind === 'from' ? 'mr-from' : kind === 'to' ? 'mr-to' : 'mr-via';
  return `<g class="mr-pin ${col}" transform="translate(${x.toFixed(1)},${y.toFixed(1)})"><path d="M0 0 C-7 -9 -9 -14 -9 -18 a9 9 0 1 1 18 0 c0 4 -2 9 -9 18z"/><circle cx="0" cy="-18" r="3.4" class="mr-pin-dot"/></g>`;
}

/* view box: pan, pinch, wheel; taps pick hexes, a long press corrects one */
function _mapSetVB(x, y, w) {
  const svg = document.getElementById('map-svg'); if (!svg) return;
  const box = svg.getBoundingClientRect(); const ar = (box.height || 1) / (box.width || 1);
  w = Math.max(160, Math.min(MAP_DATA.W, w)); const h = w * ar;
  x = Math.max(-w * 0.25, Math.min(MAP_DATA.W - w * 0.75, x)); y = Math.max(-h * 0.25, Math.min(MAP_DATA.H - h * 0.75, y));
  MapPick.vb = { x, y, w, h };
  svg.setAttribute('viewBox', `${x.toFixed(1)} ${y.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}`);
}
function _mapFitAll() {
  if (MapPick.from && !MapPick.to) { const [x, y] = HexMap.center(...MapPick.from); _mapSetVB(x - 300, y - 200, 600); return; }
  if (MapPick.result) { _mapFitPath(MapPick.result.path); return; }
  _mapSetVB(250, 80, 1900);
}
function _mapFitPath(path) {
  const xs = path.map(p => HexMap.center(...p)[0]), ys = path.map(p => HexMap.center(...p)[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const svg = document.getElementById('map-svg'); const box = svg.getBoundingClientRect(); const ar = (box.height || 1) / (box.width || 1);
  const w = Math.max(260, (x1 - x0) * 1.3, (y1 - y0) * 1.3 / ar);
  _mapSetVB((x0 + x1) / 2 - w / 2, (y0 + y1) / 2 - w * ar / 2, w);
}
function mapZoom(f, cx, cy) {
  const v = MapPick.vb; if (!v) return;
  if (cx == null) { cx = v.x + v.w / 2; cy = v.y + v.h / 2; }
  const w = v.w * f; _mapSetVB(cx - (cx - v.x) * f, cy - (cy - v.y) * f, w);
}
function _mapClientToImg(e) {
  const svg = document.getElementById('map-svg'), b = svg.getBoundingClientRect(), v = MapPick.vb;
  return [v.x + (e.clientX - b.left) / b.width * v.w, v.y + (e.clientY - b.top) / b.height * v.h];
}
function initMapGestures() {
  const svg = document.getElementById('map-svg'); if (!svg || svg._wired) return; svg._wired = true;
  const pts = new Map(); let start = null, moved = false, pinch = null, lp = null;
  const end = () => { clearTimeout(lp); lp = null; };
  svg.addEventListener('pointerdown', e => {
    svg.setPointerCapture && svg.setPointerCapture(e.pointerId);
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 1) {
      start = { x: e.clientX, y: e.clientY, vb: { ...MapPick.vb } }; moved = false;
      lp = setTimeout(() => { if (!moved && MapPick.mode === 'pick') { moved = true; const at = HexMap.at(..._mapClientToImg(e)); if (at) openHexFix(at); } }, 550);
    } else if (pts.size === 2) {
      end(); moved = true;
      const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), vb: { ...MapPick.vb }, mid: _mapClientToImg({ clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 }) };
    }
  });
  svg.addEventListener('pointermove', e => {
    if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const b = svg.getBoundingClientRect();
    if (pts.size === 2 && pinch) {
      const [p, q] = [...pts.values()]; const d = Math.hypot(p.x - q.x, p.y - q.y) || 1;
      const f = pinch.d / d, v = pinch.vb, w = v.w * f;
      _mapSetVB(pinch.mid[0] - (pinch.mid[0] - v.x) * f, pinch.mid[1] - (pinch.mid[1] - v.y) * f, w);
    } else if (start) {
      const dx = e.clientX - start.x, dy = e.clientY - start.y;
      if (!moved && Math.hypot(dx, dy) > 7) { moved = true; end(); }
      if (moved) _mapSetVB(start.vb.x - dx / b.width * start.vb.w, start.vb.y - dy / b.height * start.vb.h, start.vb.w);
    }
  });
  const up = e => {
    const wasTap = pts.size === 1 && !moved && start;
    pts.delete(e.pointerId); end();
    if (pts.size < 2) pinch = null;
    if (wasTap && MapPick.mode === 'pick') { const at = HexMap.at(..._mapClientToImg(e)); if (at) mapTapHex(at); }
    if (!pts.size) start = null;
  };
  svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', e => { pts.delete(e.pointerId); end(); pinch = null; start = null; });
  svg.addEventListener('wheel', e => { e.preventDefault(); const [x, y] = _mapClientToImg(e); mapZoom(e.deltaY > 0 ? 1.15 : 1 / 1.15, x, y); }, { passive: false });
  svg.addEventListener('contextmenu', e => { e.preventDefault(); if (MapPick.mode !== 'pick') return; const at = HexMap.at(..._mapClientToImg(e)); if (at) openHexFix(at); });
}
function mapTapHex(rc) {
  const which = MapPick.setting;
  if (!_mapSet(which, rc)) return;
  if (which === 'from' && !MapPick.to) MapPick.setting = 'to';
  else if (which === 'via') MapPick.setting = 'to';
  _mapRecompute();
}

/* search: type part of a name, pick it, the map flies there */
function mapSearch(which) {
  const inp = document.getElementById('map-' + which), box = document.getElementById('map-sug'); if (!inp || !box) return;
  const hits = mapFindPlace(inp.value).slice(0, 6);
  box.dataset.for = which;
  box.innerHTML = hits.map(([n, r, c]) => `<button type="button" class="map-sug-row" onclick="mapChoosePlace('${which}', ${r}, ${c}, this.textContent)">${escapeHtml(n)}</button>`).join('')
    || (inp.value.trim() ? '<p class="map-sug-none">No place by that name — tap the map instead.</p>' : '');
  box.hidden = !box.innerHTML;
}
function _mapHideSug() { const box = document.getElementById('map-sug'); if (box) { box.hidden = true; box.innerHTML = ''; } }
function mapChoosePlace(which, r, c, name) {
  _mapHideSug();
  if (!_mapSet(which, [r, c], name)) return;
  MapPick.setting = which === 'from' && !MapPick.to ? 'to' : which;
  _mapRecompute();
  if (MapPick.result) _mapFitPath(MapPick.result.path); else { const [x, y] = HexMap.center(r, c); _mapSetVB(x - 300, y - 200, 600); }
}

/* fill the Journey setup from the route */
function useMapRoute() {
  const R = MapPick.result; if (!R) return;
  const set = (id, v) => { const el = document.getElementById(id); if (el) { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); } };
  set('j-origin', MapPick.fromName); set('j-destination', MapPick.toName);
  set('j-totalHexes', R.hexes); set('j-hardTerrainHexes', R.hard);
  set('j-perilRating', R.destPeril || 0);
  // the Lands chip shows the land most of the road crosses; each event still uses its own hex
  const counts = {}; R.lands.slice(1).split('').forEach(k => { if (MAP_LAND[k]) counts[k] = (counts[k] || 0) + 1; });
  const most = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
  if (most) { const sel = document.getElementById('j-region'); if (sel) { sel.value = MAP_LAND[most]; sel.dispatchEvent(new Event('change', { bubbles: true })); } }
  window._jPendingRoute = { path: R.path, lands: R.lands, hexes: R.hexes };
  if (typeof _jExact !== 'undefined') _jExact = true;
  if (typeof jSyncGuided === 'function') jSyncGuided();
  closeMapPicker();
  renderMapRouteNote();
  if (R.destPeril) { const d = document.querySelector('#journey-setup-card .j-more'); if (d) d.open = true; }
}
/** A route is only kept while the setup still describes it — change the hexes and it is dropped. */
function takePendingRoute(total) {
  const p = window._jPendingRoute; window._jPendingRoute = null;
  return p && p.hexes === total ? { route: p.path, routeLands: p.lands } : {};
}
function renderMapRouteNote() {
  const el = document.getElementById('j-map-note'); if (!el) return;
  const p = window._jPendingRoute, hex = parseInt((document.getElementById('j-totalHexes') || {}).value) || 0;
  if (!p || p.hexes !== hex) { el.hidden = true; return; }
  el.hidden = false;
  el.innerHTML = `On the map: <strong>${escapeHtml((document.getElementById('j-origin') || {}).value || '')}</strong> → <strong>${escapeHtml((document.getElementById('j-destination') || {}).value || '')}</strong>, ${p.hexes} hexes. <a href="#" onclick="openMapPicker();return false">Change</a>`;
}

/** The land a Journey Event uses: the hex it strikes in, when the journey has a map route. */
function journeyRegionNow(j, hex) {
  if (!j) return 'Wild';
  if (!j.routeLands || !Array.isArray(j.route)) return j.region;
  const i = Math.max(0, Math.min(j.routeLands.length - 1, parseInt(hex != null ? hex : j.currentHex) || 0));
  const k = j.routeLands[i];
  return MAP_LAND[k] || j.region;
}

/* ---------- correcting a hex (press and hold) ---------- */
let _hexFixAt = null;
function openHexFix(rc) {
  _hexFixAt = rc;
  const t = HexMap.terr(rc[0], rc[1]);
  const ov = document.getElementById('hexfix-overlay'); if (!ov) return;
  const place = HexMap.placeAt(rc[0], rc[1]);
  document.getElementById('hexfix-title').textContent = place ? `This hex — ${place}` : 'This hex';
  document.querySelectorAll('#hexfix-land .opt-card').forEach(b => { const on = b.dataset.land === t.land; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
  document.getElementById('hexfix-hard').checked = t.hard;
  document.getElementById('hexfix-peril').value = t.peril || 0;
  document.getElementById('hexfix-reset').hidden = !t.fixed;
  ov.classList.add('show');
}
function hexFixLand(land) {
  document.querySelectorAll('#hexfix-land .opt-card').forEach(b => { const on = b.dataset.land === land; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
}
function saveHexFix() {
  if (!_hexFixAt) return;
  const on = document.querySelector('#hexfix-land .opt-card.on');
  const k = _hexFixAt.join(',');
  HexMap.fixes()[k] = { land: on ? on.dataset.land : HexMap.terr(..._hexFixAt).land, hard: document.getElementById('hexfix-hard').checked, peril: Math.max(0, Math.min(6, parseInt(document.getElementById('hexfix-peril').value) || 0)) };
  HexMap.saveFixes();
  closeHexFix(); _mapRecompute();
  if (typeof showToast === 'function') showToast('Hex corrected — saved on this device');
}
function resetHexFix() {
  if (!_hexFixAt) return;
  delete HexMap.fixes()[_hexFixAt.join(',')]; HexMap.saveFixes();
  closeHexFix(); _mapRecompute();
}
function closeHexFix() { const ov = document.getElementById('hexfix-overlay'); if (ov) ov.classList.remove('show'); }

/* ---------- the journey on the real map (Play) ---------- */
function liveRouteMap(j) {
  if (!j || !Array.isArray(j.route) || j.route.length < 2) return '';
  const P = j.route.map(([r, c]) => HexMap.center(r, c));
  const xs = P.map(p => p[0]), ys = P.map(p => p[1]);
  let x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const pad = 40, ar = 0.5;
  let w = Math.max(x1 - x0 + pad * 2, (y1 - y0 + pad * 2) / ar, 240), h = w * ar;
  const vx = (x0 + x1) / 2 - w / 2, vy = (y0 + y1) / 2 - h / 2;
  const i = Math.max(0, Math.min(P.length - 1, parseInt(j.currentHex) || 0));
  const pts = a => a.map(p => p.map(v => v.toFixed(1)).join(',')).join(' ');
  const done = pts(P.slice(0, i + 1)), ahead = pts(P.slice(i));
  const [hx, hy] = P[i];
  let marks = '';
  (j.events || []).forEach(e => {
    const k = parseInt(e.hex); if (isNaN(k) || k <= 0 || k >= P.length) return;
    const [x, y] = P[k]; const camp = /Marching Test/i.test(String(e.text || ''));
    marks += camp ? `<path class="lm-camp" d="M${(x - 5).toFixed(1)} ${(y + 12).toFixed(1)} l5-8 5 8z"/>` : `<path class="lm-ev" d="M${x.toFixed(1)} ${(y - 12).toFixed(1)} l4 5 -4 5 -4-5z"/>`;
  });
  if (j.nextEventHex && j.nextEventHex > i && j.nextEventHex < P.length) { const [x, y] = P[j.nextEventHex]; marks += `<path class="lm-next" d="M${x.toFixed(1)} ${(y - 7).toFixed(1)} l6 7 -6 7 -6-7z"/>`; }
  const land = journeyRegionNow(j);
  return `<button type="button" class="live-map" onclick="openMapPicker('view')" aria-label="Your journey on the map — ${i} of ${P.length - 1} hexes; tap to open the map">
    <svg viewBox="${vx.toFixed(1)} ${vy.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}" preserveAspectRatio="xMidYMid slice">
      <image href="${MAP_DATA.img}" width="${MAP_DATA.W}" height="${MAP_DATA.H}"/>
      <polyline class="lm-ahead" points="${ahead}"/><polyline class="lm-done" points="${done}"/>${marks}
      <g class="lm-here" transform="translate(${hx.toFixed(1)},${hy.toFixed(1)})"><circle r="6"/><path d="M0 -4 v-15 l10 4 -10 4"/></g>
    </svg>
    <span class="lm-cap">${i} of ${P.length - 1} hexes · ${land} Land here · tap for the map</span></button>`;
}
function _mapShowJourney() {
  const j = char.journey || {};
  const g = document.getElementById('map-marks');
  if (!Array.isArray(j.route) || !g) { _mapSetVB(250, 80, 1900); if (g) g.innerHTML = ''; return; }
  const i = Math.max(0, Math.min(j.route.length - 1, parseInt(j.currentHex) || 0));
  const pts = a => a.map(([r, c]) => HexMap.center(r, c).map(v => v.toFixed(1)).join(',')).join(' ');
  g.innerHTML = `<polyline class="mr-shadow" points="${pts(j.route)}"/><polyline class="mr-route ahead" points="${pts(j.route.slice(i))}"/><polyline class="mr-route" points="${pts(j.route.slice(0, i + 1))}"/>` +
    _pin(j.route[0], 'from') + _pin(j.route[j.route.length - 1], 'to') + _pin(j.route[i], 'via');
  _mapFitPath(j.route);
  const el = document.getElementById('map-summary');
  if (el) el.innerHTML = `<div class="map-sum-head"><strong>${escapeHtml(j.origin || '')}</strong> → <strong>${escapeHtml(j.destination || '')}</strong></div><div class="map-sum-nums"><span><b>${i}</b> of <b>${j.route.length - 1}</b> hexes</span><span>${journeyRegionNow(j)} Land here</span></div>`;
}

document.addEventListener('DOMContentLoaded', () => { initMapGestures(); });
