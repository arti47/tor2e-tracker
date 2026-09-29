/* ============================================================
   09-art.js — the drawn layer (round 3)
   Terrain vignettes for the Play scene, the inked route map, culture silhouettes,
   extra line-art icons, and optional sound. Everything here is inline SVG / WebAudio:
   no images, nothing fetched, works over file://.
   ============================================================ */

/* ---------- Extra icons, added to the shell's sprite at boot ---------- */
const ART_SYMBOLS = {
  'i-weary':  '<path d="M4 16c3-4 5-5 8-5s5 1 8 5"/><path d="M7 8l2 1M17 8l-2 1"/><path d="M15 3h3l-3 3h3"/>',
  'i-rain':   '<path d="M7 14a4 4 0 0 1 0-8 5 5 0 0 1 9.5 1A3.5 3.5 0 0 1 17 14z"/><path d="M8 17l-1 3M12 17l-1 3M16 17l-1 3"/>',
  'i-drop':   '<path d="M12 3c3 4 6 7.5 6 11a6 6 0 0 1-12 0c0-3.5 3-7 6-11z"/>',
  'i-star':   '<path d="M12 3l2.5 6 6.5.5-5 4.3 1.6 6.4L12 16.8 6.4 20.2 8 13.8 3 9.5l6.5-.5z"/>',
  'i-speaker':'<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12"/>',
  // round 4: a drawn icon for every emoji the app used to print
  'i-warn':    '<path d="M12 3 2 20h20z"/><path d="M12 9v5M12 17h.01"/>',
  'i-check':   '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  'i-cross':   '<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/>',
  'i-flag':    '<path d="M5 21V4"/><path d="M5 4h12l-2 4 2 4H5"/>',
  'i-bandage': '<rect x="2.5" y="8" width="19" height="8" rx="4" transform="rotate(-35 12 12)"/><path d="M10.5 10.5h.01M13.5 13.5h.01M10.5 13.5h.01M13.5 10.5h.01"/>',
  'i-home':    '<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/>',
  'i-ear':     '<path d="M7 9a5 5 0 0 1 10 0c0 3-3 4-3 7a3 3 0 0 1-5.5 1.6"/><path d="M10 9a2 2 0 0 1 4 0c0 1.5-2 2-2 3"/>',
  'i-target':  '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  'i-trophy':  '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4"/><path d="M12 13v4M8 21h8M9 21l1-4h4l1 4"/>',
  'i-calendar':'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  'i-camera':  '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  'i-trash':   '<path d="M4 7h16M10 11v6M14 11v6"/><path d="M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  'i-pencil':  '<path d="M4 20l1-4L16 5l3 3L8 19z"/><path d="M14 7l3 3"/>',
  'i-clapper': '<rect x="3" y="9" width="18" height="11" rx="1.5"/><path d="M3 9l1.5-5 16 3-1 2"/><path d="M8 5l1.5 3.6M13 6l1.5 3.4"/>',
  'i-search':  '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.3-4.3"/>',
  'i-coins':   '<ellipse cx="9" cy="7" rx="6" ry="2.5"/><path d="M3 7v4c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5V7"/><path d="M9 13.5v3c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-4c0-1.4-2.7-2.5-6-2.5"/>',
  'i-bow':     '<path d="M5 3c9 2 14 7 16 16"/><path d="M5 3 21 19"/><path d="M13 11l-9 9M4 16v4h4"/>',
  'i-pick':    '<path d="M3 21 14 10"/><path d="M8 4c5-1 9 1 12 5-3-1-6-1-9 0 1-2 0-4-3-5z"/>',
  'i-wave':    '<path d="M2 9c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/><path d="M2 15c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/>',
  'i-lock':    '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  'i-unlock':  '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/>',
  'i-mail':    '<path d="M8 3h8l4 4-3 2.5V21H7V9.5L4 7z"/><path d="M8 3c1.5 2.5 6.5 2.5 8 0M7 13h10M7 17h10"/>',
  'i-helm':    '<path d="M4 15a8 8 0 0 1 16 0v3H4z"/><path d="M12 7v11M4 15h16"/>',
  'i-leaf':    '<path d="M5 19c0-9 5-14 15-15-1 10-6 15-15 15z"/><path d="M5 19 14 10"/>',
  'i-tree':    '<path d="M12 2 6 10h3l-4 6h14l-4-6h3z"/><path d="M12 16v6"/>',
  'i-anchor':  '<circle cx="12" cy="5" r="2"/><path d="M12 7v14M8 11h8"/><path d="M4 14a8 8 0 0 0 16 0"/>',
  'i-fleur':   '<path d="M12 3c-3 3-3 7 0 10 3-3 3-7 0-10z"/><path d="M12 13c-2-4-7-4-8-1 2 0 4 1 5 3M12 13c2-4 7-4 8-1-2 0-4 1-5 3"/><path d="M8 16h8M12 13v8"/>',
  'i-horn':    '<path d="M3 10v4h3l9 5V5L6 10z"/><path d="M18 9a4 4 0 0 1 0 6"/>',
  'i-clipboard':'<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h3"/>',
  'i-chart':   '<path d="M4 20V4M4 20h16"/><path d="m7 15 4-4 3 3 5-6"/>',
  'i-snow':    '<path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7"/><path d="M9 4l3 2 3-2M9 20l3-2 3 2"/>',
  'i-chat':    '<path d="M4 5h16v11H9l-5 4z"/>',
  'i-hush':    '<circle cx="12" cy="12" r="9"/><path d="M9 15h6M12 6v6"/>',
  'i-inbox':   '<path d="M3 13l3-8h12l3 8v6H3z"/><path d="M3 13h5l1 2h6l1-2h5"/>',
  'i-box':     '<path d="M3 7 12 3l9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/>',
  'i-scales':  '<path d="M12 3v18M7 21h10M5 7h14"/><path d="M5 7l-3 7a3 3 0 0 0 6 0zM19 7l-3 7a3 3 0 0 0 6 0z"/>',
  'i-burst':   '<path d="M12 2l2 6 6-3-3 6 6 2-6 2 3 6-6-3-2 6-2-6-6 3 3-6-6-2 6-2-3-6 6 3z"/>',
  'i-music':   '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
  'i-dragon': '<path d="M3 18c3 0 5-2 7-5l2-6 2 6c2 3 4 5 7 5"/><path d="M12 7 9 3M12 7l3-4"/><path d="M8 14 3 10l1 5M16 14l5-4-1 5"/>',
  'i-screen':  '<rect x="2" y="4" width="20" height="13" rx="1.5"/><path d="M8 21h8M12 17v4"/>',
  'i-refresh': '<path d="M20 11a8 8 0 0 0-14-5l-2 2"/><path d="M4 4v4h4"/><path d="M4 13a8 8 0 0 0 14 5l2-2"/><path d="M20 20v-4h-4"/>',
  'i-offline': '<path d="M3 3l18 18"/><rect x="6" y="3" width="12" height="18" rx="2"/>',
  'i-link':    '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  'i-arm': '<path d="M7 12V8a2 2 0 0 1 4 0v3M11 11V6a2 2 0 0 1 4 0v5M15 11V8a2 2 0 0 1 4 0v5a8 8 0 0 1-8 8h-1a5 5 0 0 1-5-5v-2a2 2 0 0 1 4 0v1"/>',
  'i-climb':   '<circle cx="14" cy="4" r="2"/><path d="M8 21l3-6 3 2 1-6-4-3-3 3M15 11l3 1 2-3"/>',
  'i-gift':    '<rect x="3" y="9" width="18" height="4" rx="1"/><path d="M5 13v8h14v-8M12 9v12"/><path d="M12 9C9 9 7 7 8 5.5S11 5 12 9zM12 9c3 0 5-2 4-3.5S13 5 12 9z"/>',
  'i-point':   '<path d="M3 12h13"/><path d="m12 7 5 5-5 5"/>',
  'i-tools':   '<path d="M14 7a4 4 0 0 0 5 5l-9 9-3-3 9-9a4 4 0 0 0-2-2z"/><path d="M4 4l6 6"/>',
  'i-cloud':   '<path d="M7 18a4 4 0 0 1 0-8 6 6 0 0 1 11.5 1.5A3.5 3.5 0 0 1 18 18z"/>',
  'i-web':     '<circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6 5.6 18.4"/><path d="M12 7l5 5-5 5-5-5z"/>',
  'i-rock':    '<path d="M3 18l3-8 5-4 6 2 4 6-2 4z"/><path d="M11 6l1 6 5-4M12 12l-6-2"/>',
  'i-fog':     '<path d="M3 8h13M6 12h15M3 16h13M8 20h10"/>',
  'i-user':    '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  'i-save':    '<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v5h7V3M8 21v-7h8v7"/>',
  'i-lion':    '<circle cx="12" cy="12" r="5"/><path d="M12 2l2 3 3-1 1 3 3 1-1 3 2 2-2 2 1 3-3 1-1 3-3-1-2 3-2-3-3 1-1-3-3-1 1-3-2-2 2-2-1-3 3-1 1-3 3 1z"/>',
  'i-hat': '<path d="M3 20h18"/><path d="M6 20 12 3l6 17"/><path d="M8.5 13h7"/>',
  'i-dot':     '<circle cx="12" cy="12" r="5" fill="currentColor" stroke="none"/>',
  'i-cards':   '<rect x="3" y="6" width="11" height="15" rx="1.5" transform="rotate(-10 8 13)"/><rect x="10" y="4" width="11" height="15" rx="1.5"/><path d="M15.5 9l1.5 2.5-1.5 2.5-1.5-2.5z"/>',
  'i-timer':   '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M10 2h4M12 2v3"/>',
  'i-hourglass':'<path d="M6 2h12M6 22h12M7 2c0 6 10 6 10 10S7 16 7 22M17 2c0 6-10 6-10 10s10 4 10 10"/>',
  'i-download':'<path d="M12 3v12M7 10l5 5 5-5M4 20h16"/>',
  'i-upload':  '<path d="M12 15V3M7 8l5-5 5 5M4 20h16"/>',
  'i-person':  '<circle cx="13" cy="4" r="2"/><path d="M9 21l2-6 3 3v3M11 15l1-6 3 2 3 1M12 9l-4 3"/>'
};
function injectArtSymbols() {
  const sprite = document.querySelector('svg symbol#i-play') && document.querySelector('svg symbol#i-play').parentNode;
  if (!sprite) return;
  Object.entries(ART_SYMBOLS).forEach(([id, body]) => {
    if (document.getElementById(id)) return;
    const ns = 'http://www.w3.org/2000/svg';
    const sym = document.createElementNS(ns, 'symbol');
    sym.setAttribute('id', id); sym.setAttribute('viewBox', '0 0 24 24');
    sym.setAttribute('fill', 'none'); sym.setAttribute('stroke', 'currentColor');
    sym.setAttribute('stroke-width', '1.8'); sym.setAttribute('stroke-linecap', 'round'); sym.setAttribute('stroke-linejoin', 'round');
    sym.innerHTML = body;
    sprite.appendChild(sym);
  });
}
function artIcon(id, cls) { return `<svg class="${cls || 'ic'}" aria-hidden="true"><use href="#${id}"/></svg>`; }

/* ---------- Terrain vignettes ----------
   One drawn band across the top of the Play scene card, chosen from where the hero is:
   the Safe Haven at the start and end of an adventure, the land the road runs through,
   or the place travelled to. Keywords from the destination win; the journey's region
   decides when the name says nothing. */
function _trees(n, x0, x1, base, tall, seed) {
  // Irregular spacing and a mix of firs and round-crowned trees, so a wood reads as a wood
  // and not as a saw-blade of mountains.
  let s = '', x = x0, i = 0;
  while (x < x1 && i < n) {
    const r = ((i + (seed || 0)) * 47) % 19;
    const h = tall * (0.55 + r / 40);
    if (r % 3 === 0) {
      s += `<circle cx="${x.toFixed(1)}" cy="${(base - h * .62).toFixed(1)}" r="${(h * .3).toFixed(1)}" class="f"/><path d="M${x.toFixed(1)} ${(base - h * .35).toFixed(1)} V${base}"/>`;
    } else {
      s += `<path d="M${x.toFixed(1)} ${(base - h).toFixed(1)} l${(-h * .22).toFixed(1)} ${(h * .38).toFixed(1)} h${(h * .1).toFixed(1)} l${(-h * .12).toFixed(1)} ${(h * .34).toFixed(1)} h${(h * .48).toFixed(1)} l${(-h * .12).toFixed(1)} ${(-h * .34).toFixed(1)} h${(h * .1).toFixed(1)} z" class="f"/><path d="M${x.toFixed(1)} ${(base - h * .28).toFixed(1)} V${base}"/>`;
    }
    x += 14 + r * 1.6; i++;
  }
  return s;
}
const TERRAIN_ART = {
  road: () => `<path d="M0 60 Q60 47 120 56 T240 52 T360 58"/>` +
    `<path d="M112 90 C150 80 186 71 206 63 S234 57 240 55"/><path d="M204 90 C207 80 216 72 223 64 S237 57 241 55"/>` +
    `<path d="M26 82 l3-7 l3 7 M34 83 l2-5 l2 5 M300 80 l3-7 l3 7 M308 81 l2-5 l2 5 M60 72 l2-5 l2 5"/>` +
    `<path d="M282 84 v-13 q5-6 10 0 v13 z" class="f"/><path d="M298 22 q4-4 8 0 q4-4 8 0 M318 30 q3-3 6 0 q3-3 6 0"/>`,
  forest: () => `<path d="M0 86 H360"/>` + _trees(9, 40, 350, 72, 34, 3).replace(/class="f"/g, 'class="f2"') + _trees(12, 8, 352, 86, 56, 0),
  hills: () => `<path d="M0 68 Q50 40 110 60 T220 56 T360 62" class="f2"/><path d="M0 86 Q80 64 160 78 T360 74"/>` +
    `<path d="M226 58 q20-16 40 0"/><path d="M300 76 l2-18 h6 l1 18 z" class="f"/><path d="M60 80 l2-5 l2 5 M180 82 l2-5 l2 5"/>`,
  mountains: () => `<path d="M0 80 L40 42 L60 56 L95 16 L130 58 L150 44 L190 72 L232 24 L272 62 L300 38 L342 74 L360 64" class="f2"/>` +
    `<path d="M84 30 l11-14 l12 15 M221 38 l11-14 l11 13 M292 46 l8-8 l8 9"/><path d="M0 88 Q90 72 180 84 T360 82"/>`,
  river: () => `<path d="M0 58 C80 53 120 70 200 64 S320 56 360 60"/><path d="M0 78 C90 72 140 88 210 82 S320 74 360 78"/>` +
    `<path d="M30 68 h14 M70 71 h10 M150 75 h16 M232 72 h12 M300 67 h14" class="w"/>` +
    `<path d="M40 56 v-12 M45 56 v-15 M50 56 v-9 M322 58 v-11 M327 58 v-14"/><path d="M246 72 q22-18 44 0 M246 72 h44"/>`,
  ruins: () => `<path d="M0 86 H360"/><path d="M150 86 V30 L158 24 L164 33 L172 21 L180 34 V86 z" class="f"/>` +
    `<path d="M160 52 v-8 q5-6 10 0 v8 z"/><path d="M180 86 V60 h20 v-8 h12 v34"/><path d="M110 86 V70 h14 v-6 h8 v22"/>` +
    `<circle cx="222" cy="84" r="2.5"/><circle cx="230" cy="83" r="3.5"/><circle cx="98" cy="84" r="3"/><path d="M246 20 q5-5 10 0 q5-5 10 0"/>`,
  moria: () => `<rect x="0" y="0" width="360" height="90" class="dark"/>` +
    [30, 110, 190, 270].map(x => `<path d="M${x} 90 V22 M${x + 10} 90 V22"/><path d="M${x + 10} 28 Q${x + 45} -2 ${x + 80} 28"/>`).join('') +
    `<path d="M150 90 h60 M156 84 h48 M162 78 h36 M168 72 h24" class="w"/><circle cx="180" cy="46" r="3" class="f"/>`,
  haven: () => `<path d="M0 86 H360"/><path d="M130 86 V56 H212 V86" class="f2"/><path d="M122 58 L171 30 L220 58"/>` +
    `<path d="M162 86 v-12 a9 9 0 0 1 18 0 v12"/><rect x="140" y="64" width="12" height="10"/><rect x="190" y="64" width="12" height="10"/>` +
    `<path d="M194 44 v-14 h8 v18"/><path d="M198 26 q-6-6 0-12 q6-6 0-12"/>` +
    `<circle cx="276" cy="52" r="20" class="f2"/><path d="M276 72 V86"/><path d="M20 80 h80 M30 76 v10 M50 76 v10 M70 76 v10 M90 76 v10"/>`
};
const TERRAIN_WORDS = [
  ['moria', /moria|khazad|dwarrowdelf|delving|mine|deep|chamber|hall/],
  ['forest', /wood|forest|mirkwood|eaves|tree|grove|shaws|old forest|fangorn/],
  ['mountains', /mountain|peak|pass|misty|grey|caradhras|redhorn|crag|cliff/],
  ['river', /river|ford|anduin|lake|marsh|fen|water|bridge|mere|brandywine|stream/],
  ['ruins', /ruin|tower|watchtower|barrow|keep|fort|tomb|dol |ancient|broken/],
  ['hills', /hill|downs|weather|ridge|moor|dale/],
  ['haven', /haven|bree|rivendell|inn|shire|hobbiton|home|town|village|lake-town|esgaroth|hall of/]
];
const REGION_TERRAIN = { free: 'road', border: 'hills', wild: 'forest', shadow: 'ruins', dark: 'mountains' };
function sceneTerrain() {
  const s = (typeof sagaState === 'function') ? sagaState() : { step: 'haven' };
  const jr = char.journey || {};
  if (s.step === 'haven' || s.step === 'fellowship') return (typeof isMoria === 'function' && isMoria()) ? 'moria' : 'haven';
  const words = String(s.step === 'home' ? (jr.origin || char.safeHaven || '') : (jr.destination || '')).toLowerCase();
  if (typeof isMoria === 'function' && isMoria()) return 'moria';
  const hit = TERRAIN_WORDS.find(([, re]) => re.test(words));
  if (s.step === 'location' && hit) return hit[0];
  if (hit && hit[0] !== 'haven') return hit[0];
  if (s.step === 'location') return 'ruins';
  return REGION_TERRAIN[jr.region] || 'road';
}
function terrainVignette(key) {
  const k = TERRAIN_ART[key] ? key : 'road';
  return `<div class="scene-art t-${k}" aria-hidden="true"><svg viewBox="0 0 360 90" preserveAspectRatio="xMidYMax slice">${TERRAIN_ART[k]()}</svg></div>`;
}

/* ---------- The inked route map ----------
   A winding road between two named places, inked where the hero has walked and dashed
   ahead, with small marks of the land along it, the hero's pennant, and the next event. */
function routeMap(cur, total, nextEvent, from, to, terrain, opts) {
  opts = opts || {};
  const W = 340, H = 104, x0 = 22, x1 = W - 22, N = 72;
  const pt = t => [x0 + (x1 - x0) * t, 48 + 15 * Math.sin(t * Math.PI * 2.3 + .5) + 5 * Math.sin(t * Math.PI * 5.1)];
  const pts = Array.from({ length: N + 1 }, (_, i) => pt(i / N));
  const d = arr => arr.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const f = total > 0 ? Math.max(0, Math.min(1, cur / total)) : 0;
  const k = Math.round(f * N);
  const [hx, hy] = pt(f);
  const marks = [];
  const glyph = {
    forest: (x, y) => `<path d="M${x} ${y - 9} l-4 9 h8 z" class="f"/>`,
    mountains: (x, y) => `<path d="M${x - 6} ${y} l6-10 l6 10"/>`,
    hills: (x, y) => `<path d="M${x - 7} ${y} q7-8 14 0"/>`,
    river: (x, y) => `<path d="M${x - 7} ${y} q3-3 7 0 t7 0"/>`,
    ruins: (x, y) => `<path d="M${x - 3} ${y} v-9 h6 v9 M${x - 3} ${y - 9} l1.5-2 1.5 2 1.5-2 1.5 2"/>`,
    moria: (x, y) => `<path d="M${x - 5} ${y} v-7 q5-6 10 0 v7"/>`,
    haven: (x, y) => `<path d="M${x - 5} ${y} v-6 l5-4 5 4 v6 z"/>`,
    road: (x, y) => `<path d="M${x - 3} ${y} l2-5 2 5 M${x + 1} ${y} l1.5-4 1.5 4"/>`
  }[terrain] || ((x, y) => `<path d="M${x - 3} ${y} l2-5 2 5"/>`);
  for (let i = 1; i < 9; i++) {
    const t = i / 9, [x, y] = pt(t), up = i % 2 === 0;
    marks.push(glyph(x.toFixed(1), (up ? y - 12 : y + 20).toFixed(1)));
  }
  let ev = '';
  if (nextEvent && total > 0 && nextEvent > cur) {
    const [ex, ey] = pt(Math.min(1, nextEvent / total));
    ev = `<g class="rm-ev"><path d="M${ex.toFixed(1)} ${(ey - 7).toFixed(1)} l6 7 -6 7 -6-7 z"/><text x="${ex.toFixed(1)}" y="${(ey + 3.5).toFixed(1)}" text-anchor="middle">!</text></g>`;
  }
  // round 4: where you camped (each march ends at a camp) and what happened on the way
  let past = '';
  const seen = new Set();
  (opts.log || []).forEach(e => {
    const h = parseInt(e && e.hex); if (!total || isNaN(h) || h <= 0 || h > cur || h >= total) return;
    const txt = String(e.text || '');
    const kind = /Marching Test/i.test(txt) ? 'camp' : /Arrived/i.test(txt) ? '' : 'event';
    if (!kind || seen.has(kind + h)) return; seen.add(kind + h);
    const [x, y] = pt(Math.min(1, h / total));
    past += kind === 'camp'
      ? `<path class="rm-camp" d="M${(x - 5).toFixed(1)} ${(y + 13).toFixed(1)} l5-8 5 8 z M${x.toFixed(1)} ${(y + 5).toFixed(1)} v8"><title>Camped here${e.day ? ' — day ' + e.day : ''}</title></path>`
      : `<path class="rm-past" d="M${x.toFixed(1)} ${(y - 12).toFixed(1)} l4 5 -4 5 -4-5 z"><title>${escapeHtml(txt.replace(/<[^>]+>/g, '').slice(0, 80))}</title></path>`;
  });
  const dayTag = opts.days ? `<text x="${Math.min(x1 - 20, Math.max(x0 + 20, hx)).toFixed(1)}" y="${Math.max(10, hy - 24).toFixed(1)}" class="rm-day" text-anchor="middle">Day ${opts.days}</text>` : '';
  const lab = s => escapeHtml(String(s || '').slice(0, 22));
  return `<div class="route" role="img" aria-label="${cur} of ${total} stretches travelled${to ? ' toward ' + lab(to) : ''}">
    <svg viewBox="0 0 ${W} ${H}" class="route-svg">
      <g class="rm-land">${marks.join('')}</g>
      <path d="${d(pts.slice(k))}" class="rm-ahead"/>
      <path d="${d(pts.slice(0, k + 1))}" class="rm-done"/>
      <circle cx="${x0}" cy="${pts[0][1].toFixed(1)}" r="4" class="rm-end"/><circle cx="${x1}" cy="${pts[N][1].toFixed(1)}" r="4" class="rm-end"/>
      ${past}${ev}
      ${dayTag}
      <g class="rm-here route-here"><path d="M${hx.toFixed(1)} ${(hy - 3).toFixed(1)} v-17 l11 4 -11 4"/><circle cx="${hx.toFixed(1)}" cy="${hy.toFixed(1)}" r="5.5"/></g>
      <text x="${x0}" y="${H - 4}" class="rm-place">${lab(from) || 'Setting out'}</text>
      <text x="${x1}" y="${H - 4}" class="rm-place" text-anchor="end">${lab(to) || 'Journey’s end'}</text>
    </svg>
    <div class="route-count">${cur} of ${total} stretches${opts.days ? ` · day ${opts.days}` : ''}${seen.size ? ` · ${[...seen].filter(k => k.startsWith('camp')).length} camps` : ''}</div></div>`;
}

/* ---------- Culture silhouettes ----------
   A drawn figure behind the hero's name on the sheet: height, build and gear read the
   culture at a glance (a stout bearded dwarf with an axe, a tall elf with a bow…). */
const SILHOUETTE = {
  'Bardings':                     { h: 1.0, w: 1.0, gear: 'bow', cloak: 1 },
  "Dwarves of Durin's Folk":      { h: .8, w: 1.3, beard: 'long', hood: 1, gear: 'axe' },
  'Dwarves of Nogrod & Belegost': { h: .8, w: 1.3, beard: 'long', gear: 'axe', helm: 1 },
  'Elves of Lindon':              { h: 1.08, w: .85, hair: 1, gear: 'spear' },
  'Elves of Mirkwood':            { h: 1.06, w: .85, hair: 1, gear: 'bow' },
  'High Elves of Rivendell':      { h: 1.1, w: .85, hair: 1, gear: 'sword', circlet: 1 },
  'Hobbits of the Shire':         { h: .66, w: 1.05, curls: 1, gear: 'stick' },
  'Men of Bree':                  { h: 1.0, w: 1.0, hat: 1, gear: 'stick', cloak: 1 },
  'Rangers of the North':         { h: 1.04, w: .95, hood: 1, gear: 'sword', cloak: 1 },
  'Beornings':                    { h: 1.06, w: 1.3, beard: 'bushy', gear: 'axe', cloak: 1 },
  'Woodmen of Wilderland':        { h: 1.0, w: 1.05, hood: 1, gear: 'axe' }
};
function cultureSilhouette(culture) {
  const p = SILHOUETTE[culture]; if (!p) return '';
  const B = 118, H = 104 * p.h, r = 8.5 * p.h, cx = 50;
  const hy = B - H + r, sy = hy + r + 3, hem = B - 14 * p.h;
  const sw = 13 * p.w, hw = (p.cloak ? 22 : 18) * p.w;
  let s = '';
  // gear drawn first, behind the figure
  if (p.gear === 'bow') s += `<path d="M${cx + 16} ${sy - 12} Q${cx + 34} ${(sy + hem) / 2} ${cx + 16} ${hem + 6}" class="s-line"/><path d="M${cx + 16} ${sy - 12} L${cx + 16} ${hem + 6}" class="s-thin"/>`;
  if (p.gear === 'spear') s += `<path d="M${cx + 20} ${B} L${cx + 20} ${hy - 24}" class="s-line"/><path d="M${cx + 20} ${hy - 34} l-4 10 h8 z"/>`;
  if (p.gear === 'stick') s += `<path d="M${cx + 18} ${B} L${cx + 20} ${sy - 4}" class="s-line"/>`;
  if (p.gear === 'axe') s += `<path d="M${cx + 20} ${B - 2} L${cx + 20} ${sy - 2}" class="s-line"/><path d="M${cx + 20} ${sy} q13 2 12 14 q-6-5-12-4 z"/>`;
  if (p.gear === 'sword') s += `<path d="M${cx - 22} ${hem + 2} L${cx - 8} ${sy + 18}" class="s-line"/><path d="M${cx - 13} ${sy + 20} l8 4"  class="s-line"/>`;
  // body: cloak trapezoid, then legs
  s += `<path d="M${cx - sw} ${sy} Q${cx} ${sy - 4} ${cx + sw} ${sy} L${cx + hw} ${hem} Q${cx} ${hem + 4} ${cx - hw} ${hem} Z"/>`;
  s += `<rect x="${cx - 8 * p.w}" y="${hem - 2}" width="${6 * p.w}" height="${B - hem + 2}" rx="2"/><rect x="${cx + 2 * p.w}" y="${hem - 2}" width="${6 * p.w}" height="${B - hem + 2}" rx="2"/>`;
  // head and what sits on it
  s += `<circle cx="${cx}" cy="${hy}" r="${r}"/>`;
  if (p.hair) s += `<path d="M${cx - r} ${hy} Q${cx - r - 3} ${sy + 14} ${cx - r + 2} ${sy + 20} L${cx - 2} ${sy + 4} Z"/>`;
  if (p.curls) s += [-r, -r / 2, 0, r / 2, r].map(dx => `<circle cx="${(cx + dx).toFixed(1)}" cy="${(hy - r * .7).toFixed(1)}" r="${(r * .42).toFixed(1)}"/>`).join('');
  if (p.hood) s += `<path d="M${cx - r - 3} ${hy + r + 2} Q${cx - r - 4} ${hy - r - 6} ${cx} ${hy - r - 8} Q${cx + r + 5} ${hy - r - 4} ${cx + r + 3} ${hy + r + 2} Z"/>`;
  if (p.helm) s += `<path d="M${cx - r - 2} ${hy - 1} Q${cx} ${hy - r - 9} ${cx + r + 2} ${hy - 1} Z"/><path d="M${cx} ${hy - r - 8} v-5" class="s-line"/>`;
  if (p.hat) s += `<ellipse cx="${cx}" cy="${hy - r * .5}" rx="${r + 8}" ry="2.6"/><path d="M${cx - r + 1} ${hy - r * .5} Q${cx} ${hy - r - 10} ${cx + r - 1} ${hy - r * .5} Z"/>`;
  if (p.circlet) s += `<path d="M${cx - r} ${hy - 2} Q${cx} ${hy - 6} ${cx + r} ${hy - 2}" class="s-gold"/>`;
  if (p.beard === 'long') s += `<path d="M${cx - r + 1} ${hy + 2} Q${cx} ${hy + r + 26} ${cx + r - 1} ${hy + 2} Z"/>`;
  if (p.beard === 'bushy') s += `<path d="M${cx - r - 1} ${hy + 1} Q${cx} ${hy + r + 14} ${cx + r + 1} ${hy + 1} Z"/>`;
  return `<svg class="silhouette" viewBox="0 0 100 120" aria-hidden="true">${s}</svg>`;
}

/* ---------- Optional sound (off by default) ----------
   Synthesised on the fly — a few wooden clicks for dice, a soft rustle for a page. */
const SOUND_KEY = 'tor2e-sound';
function soundOn() { try { return localStorage.getItem(SOUND_KEY) === '1'; } catch (e) { return false; } }
let _ac = null;
function _audio() {
  if (!_ac) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; _ac = new C(); }
  if (_ac.state === 'suspended') _ac.resume();
  return _ac;
}
function _noise(ac, dur) {
  const b = ac.createBuffer(1, Math.max(1, Math.floor(ac.sampleRate * dur)), ac.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const s = ac.createBufferSource(); s.buffer = b; return s;
}
function sfx(kind) {
  if (!soundOn()) return;
  const ac = _audio(); if (!ac) return;
  const t0 = ac.currentTime;
  if (kind === 'dice') {
    for (let i = 0; i < 5; i++) {
      const t = t0 + i * (0.045 + Math.random() * 0.05);
      const n = _noise(ac, 0.035), f = ac.createBiquadFilter(), g = ac.createGain();
      f.type = 'bandpass'; f.frequency.value = 1400 + Math.random() * 1800; f.Q.value = 6;
      g.gain.setValueAtTime(0.35 * (1 - i * .12), t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      n.connect(f); f.connect(g); g.connect(ac.destination); n.start(t);
    }
  } else if (kind === 'page') {
    const n = _noise(ac, 0.32), f = ac.createBiquadFilter(), g = ac.createGain();
    f.type = 'bandpass'; f.Q.value = 0.8;
    f.frequency.setValueAtTime(900, t0); f.frequency.exponentialRampToValueAtTime(3500, t0 + 0.28);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.18, t0 + 0.06); g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.32);
    n.connect(f); f.connect(g); g.connect(ac.destination); n.start(t0);
  }
}
function toggleSound() {
  const on = !soundOn();
  try { localStorage.setItem(SOUND_KEY, on ? '1' : '0'); } catch (e) {}
  refreshSoundLabel();
  if (on) sfx('dice');
}
function refreshSoundLabel() {
  const b = document.getElementById('sound-btn'); if (!b) return;
  b.innerHTML = `<span>Sound effects</span><span class="m-state">${soundOn() ? 'On' : 'Off'}</span>`;
}
/* The page-turn sound rides on the Chronicle's two write actions. */
function initArt() {
  injectArtSymbols();
  refreshSoundLabel();
  ['newScene', 'addProseToScene'].forEach(fn => {
    const orig = window[fn]; if (typeof orig !== 'function' || orig._sfx) return;
    const wrapped = function () { sfx('page'); return orig.apply(this, arguments); };
    wrapped._sfx = true; window[fn] = wrapped;
  });
}
document.addEventListener('DOMContentLoaded', initArt);

/* ---------- Foe silhouettes (round 4) ----------
   Each foe card carries a faint drawn figure of what it is — an orc, a warg, a troll, a spider,
   a wight — chosen from its name and source, so a fight reads at a glance. */
const FOE_ART = {
  orc: '<path d="M50 14c-7 0-12 6-12 13 0 4 2 7 4 9-9 3-16 11-18 22l-4 22h10l3-14 3 30h10l4-18 4 18h10l3-30 3 14h10l-4-22c-2-11-9-19-18-22 2-2 4-5 4-9 0-7-5-13-12-13z"/><path d="M38 24l-9-5 5 9zM62 24l9-5-5 9z"/><path d="M80 34l8-20 3 1-6 21-9 24-3-1z"/>',
  goblin: '<path d="M50 30c-6 0-10 5-10 11 0 3 1 5 3 7-7 3-12 9-13 17l-3 17h8l3-10 2 18h8l2-12 2 12h8l2-18 3 10h8l-3-17c-1-8-6-14-13-17 2-2 3-4 3-7 0-6-4-11-10-11z"/><path d="M41 38l-17-9 13 13zM59 38l17-9-13 13z"/><path d="M26 60l-6 26 3 1 7-25z"/>',
  wolf: '<path d="M6 62c5-11 15-15 27-15h22l11-11 3-11 5 9 6 2-2 8 9 7-3 5-11-2-5 8v24h-7l-2-17H39l-5 17h-7l1-19c-9-2-15-7-22-15z"/>',
  troll: '<path d="M48 8c-10 0-16 7-16 16 0 3 1 6 3 8-15 4-25 16-27 31l-2 21h12l4-16 3 28h15l3-18h5l3 18h15l3-28 4 16h12l-2-21c-2-15-12-27-27-31 2-2 3-5 3-8 0-9-6-16-16-16z"/><path d="M86 14l7 4-15 44-6-2z"/><circle cx="87" cy="16" r="6"/>',
  spider: '<ellipse cx="50" cy="60" rx="17" ry="15"/><circle cx="50" cy="39" r="9"/><path fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" d="M38 52 20 36 8 46M36 58 14 52 4 64M38 64 18 72 10 86M42 70 30 84 26 96M62 52 80 36 92 46M64 58 86 52 96 64M62 64 82 72 90 86M58 70 70 84 74 96"/>',
  undead: '<path fill-rule="evenodd" d="M50 8c-13 0-21 10-21 24v14L18 88l8-6 6 11 6-11 6 11 6-11 6 11 6-11 6 11 6-11 8 6-11-42V32C71 18 63 8 50 8zM42 32h5v4h-5zM53 32h5v4h-5z"/>',
  man: '<circle cx="46" cy="16" r="8"/><path d="M36 28c-6 2-10 8-11 16l-5 44h10l4-26 3 34h14l3-34 4 26h10l-5-44c-1-8-5-14-11-16z"/><path d="M76 10h3v88h-3z"/><path d="M74 12l3.5-9 3.5 9z"/>',
  beast: '<path fill-rule="evenodd" d="M18 18l13 15c4-6 11-9 19-9s15 3 19 9l13-15-4 23c3 5 4 11 4 17 0 17-14 30-32 30S18 75 18 58c0-6 1-12 4-17zM38 52a4 4 0 1 0 .1 0zM62 52a4 4 0 1 0 .1 0z"/>'
};
function foeKind(f) {
  // the name decides first ("Orc Guard" filed under "Orcs & Goblins" is an orc); the source only if the name says nothing
  return _foeKindOf(String((f && f.name) || '').toLowerCase()) || _foeKindOf(String((f && f.source) || '').toLowerCase()) || 'beast';
}
function _foeKindOf(t) {
  if (/spider|attercop|shelob/.test(t)) return 'spider';
  if (/warg|wolf|wolves|hound|werewolf/.test(t)) return 'wolf';
  if (/troll|ogre/.test(t)) return 'troll';
  if (/goblin|snaga/.test(t)) return 'goblin';
  if (/orc|uruk|orch|ghash|bolg|azog/.test(t)) return 'orc';
  if (/wight|wraith|ghost|dead|undead|barrow|nazg|shade|spirit|necromancer/.test(t)) return 'undead';
  if (/\bmen\b|\bman\b|ruffian|bandit|brigand|easterling|southron|southerner|dunlend|númenórean|numenorean|footpad|chieftain|captain|robber|thief|outlaw|villain|sorcerer|spy|agent|lord|king/.test(t)) return 'man';
  return '';
}
function foeSilhouette(f, cls) {
  const k = foeKind(f);
  return `<svg class="${cls || 'foe-sil'} k-${k}" viewBox="0 0 100 100" fill="currentColor" aria-hidden="true">${FOE_ART[k]}</svg>`;
}
