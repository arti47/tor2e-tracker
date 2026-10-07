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
  // Round 7: carved columns with capitals, arches between them, a stair and a hanging lantern —
  // the halls of Khazad-dûm, not bars across the scene.
  moria: () => `<rect x="0" y="0" width="360" height="90" class="dark"/>` +
    `<circle cx="180" cy="44" r="46" class="glow"/>` +
    `<path d="M160 90 V52 Q180 30 200 52 V90" class="f2"/>` +
    [36, 108, 252, 324].map(x => `<path d="M${x - 6} 90 V30 h12 V90" class="f2"/><path d="M${x - 11} 30 h22 l-4 -6 h-14 z" class="f"/><path d="M${x - 9} 90 v-4 h18 v4"/><path d="M${x - 3} 36 v48 M${x + 3} 36 v48"/>`).join('') +
    `<path d="M47 24 Q72 6 97 24 M263 24 Q288 6 313 24 M119 24 Q180 -8 241 24"/>` +
    `<path d="M150 90 h60 M155 85 h50 M160 80 h40 M165 75 h30" class="w"/>` +
    `<path d="M180 0 v24"/><path d="M174 24 h12 l-2 12 h-8 z" class="f"/><circle cx="180" cy="30" r="2.2" class="flame"/>`,
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
  // Round 6: on the road, the land you are crossing now — not the place you are heading for
  if ((s.step === 'journey' || s.step === 'home') && jr.active) {
    const reg = String((typeof journeyRegionNow === 'function' ? journeyRegionNow(jr, parseInt(jr.currentHex) || 0) : '') || jr.region || '').toLowerCase();
    return REGION_TERRAIN[reg] || 'road';
  }
  const hit = TERRAIN_WORDS.find(([, re]) => re.test(words));
  if (s.step === 'location' && hit) return hit[0];
  if (hit && hit[0] !== 'haven') return hit[0];
  if (s.step === 'location') return 'ruins';
  return REGION_TERRAIN[jr.region] || 'road';
}
function terrainVignette(key, opts) {
  opts = opts || {};
  const k = TERRAIN_ART[key] ? key : 'road';
  // Round 6: a sky wash behind the drawing; a road through it while travelling; mist in the
  // Shadow and Dark lands; the Eye opening over the scene as the hunt closes in.
  const road = opts.road && k !== 'road' && k !== 'moria' ? '<path d="M150 90 C170 80 190 76 214 72 S250 67 262 64" class="rd"/><path d="M222 90 C220 82 226 76 236 71 S256 66 262 64" class="rd"/>' : '';
  const mist = opts.mist ? '<div class="scene-mist"></div>' : '';
  const eye = opts.eye > 0 ? `<svg class="scene-eye" viewBox="0 0 60 30" style="opacity:${Math.min(.55, .12 + opts.eye * .43).toFixed(2)}"><path d="M2 15 Q30 -6 58 15 Q30 36 2 15z"/><ellipse cx="30" cy="15" rx="3.5" ry="10"/></svg>` : '';
  const weather = opts.weather ? `<div class="scene-weather w-${opts.weather}"></div>` : '';
  return `<div class="scene-art t-${k}" aria-hidden="true"><svg viewBox="0 0 360 90" preserveAspectRatio="xMidYMax slice"><rect class="sky" x="0" y="0" width="360" height="90"/>${TERRAIN_ART[k]()}${road}</svg>${weather}${mist}${eye}</div>`;
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
    <div class="route-count">${cur} of ${total} stretches${opts.days ? ` · day ${opts.days}` : ''}${(() => { const n = [...seen].filter(k => k.startsWith('camp')).length; return n ? ` · ${n} camp${n === 1 ? '' : 's'}` : ''; })()}</div></div>`;
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
function soundOn() { try { return localStorage.getItem(SOUND_KEY) !== '0'; } catch (e) { return true; } }   // storybook: on unless turned off
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
/* Ambient (storybook stage 5): a soft wind under the story while ▶ Play is open and sound is on.
   It can only start after a tap (browsers forbid sound before one), and stops off Play or out of sight. */
let _amb = null;
function ambientSync() {
  const want = soundOn() && document.visibilityState !== 'hidden' && document.body.dataset.group === 'play'
    && !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  if (want && !_amb && window._userTapped) {
    const ac = _audio(); if (!ac) return;
    const len = ac.sampleRate * 4, b = ac.createBuffer(1, len, ac.sampleRate), d = b.getChannelData(0);
    let last = 0; for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
    const src = ac.createBufferSource(); src.buffer = b; src.loop = true;
    const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420;
    const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 0.07; lg.gain.value = 180; lfo.connect(lg); lg.connect(f.frequency);
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.05, ac.currentTime + 2.5);
    src.connect(f); f.connect(g); g.connect(ac.destination); src.start(); lfo.start();
    _amb = { src, lfo, g, ac };
  } else if (!want && _amb) {
    const a = _amb; _amb = null;
    try { a.g.gain.exponentialRampToValueAtTime(0.0001, a.ac.currentTime + 0.8); setTimeout(() => { try { a.src.stop(); a.lfo.stop(); } catch (e) {} }, 900); } catch (e) {}
  }
}
document.addEventListener('pointerdown', () => { window._userTapped = true; setTimeout(ambientSync, 50); }, { passive: true });
document.addEventListener('visibilitychange', ambientSync);
setInterval(ambientSync, 2500);
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
  ambientSync();
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

/* ============================================================
   Round 6 — one family of drawn glyphs for the game's own ideas, and the art built from it:
   group header strips, table phase vignettes, the seeing-stone, wax seals, the season wheel,
   notched End/Hate bars and the battle banners. Same 24-unit, 1.75px stroke as the sprite.
   ============================================================ */
Object.assign(ART_SYMBOLS, {
  // the three Attributes
  'i-att-str': '<path d="M6 11V8.5a1.5 1.5 0 0 1 3 0V11M9 10V7a1.5 1.5 0 0 1 3 0v3M12 10V7.5a1.5 1.5 0 0 1 3 0V10M15 10.5V9a1.5 1.5 0 0 1 3 0v5a7 7 0 0 1-7 7h-.5A4.5 4.5 0 0 1 6 16.5V11"/><path d="M6 13.5h4.5a2 2 0 0 1 0 4H8.5"/>',
  'i-att-hrt': '<path d="M12 20.5s-7.5-4.4-7.5-10.3A4.2 4.2 0 0 1 12 7.6a4.2 4.2 0 0 1 7.5 2.6c0 5.9-7.5 10.3-7.5 10.3z"/><path d="M12 16.5c-1.6 0-2.5-1.2-2-2.6.5.6 1 .6 1.2-.1.3-1 .9-1.7 1.6-2.1.1 1.5 1.4 2.1 1.2 3.4-.2.9-1 1.4-2 1.4z"/>',
  'i-att-wit': '<path d="M4 14.5c0 2.8 3.2 4.5 7 4.5s7-1.7 7-4.5z"/><path d="M18 14.5 21 12"/><path d="M20.8 10c-1.2-1-1-2.4 0-3.6.4 1.2 1.4 2 .6 3.6"/><path d="M9 19l-1 2h6l-1-2"/><path d="M7.5 14.5c0-1.6 1.6-3 3.5-3"/>',
  // stances
  'i-st-forward':  '<path d="M4 20 17 7"/><path d="M14 5l7-2-2 7-2-3z"/><path d="M3 14h4M4 10h3.5"/>',
  'i-st-open':     '<path d="M12 2.5 13.4 5v11h-2.8V5z"/><path d="M8 16h8M12 16v4.5M10.3 21h3.4"/>',
  'i-st-defensive':'<path d="M12 3l8 3v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z"/><circle cx="12" cy="11" r="2.2"/><path d="M12 5v3.8M12 13.2V19"/>',
  // dispositions and the road
  'i-axe':     '<path d="M5 21 15 7"/><path d="M12.5 4.2c3-1.3 6.3-.4 8.5 1.8-2 .1-3.2 1.2-3.7 3.1-.5 1.9-2.4 3-5.1 2.3 1.1-2.4 1.3-4.6.3-7.2z"/>',
  'i-lantern': '<path d="M9 5h6M12 3v2"/><path d="M8 7h8l-1 11H9z"/><path d="M8 18h8"/><path d="M12 10.5c1.1 1 1.1 2.6 0 3.6-1.1-1-1.1-2.6 0-3.6z"/>',
  'i-boot':    '<path d="M8 3h5v9l6 2.6a2 2 0 0 1 1.2 1.8V19H6.2L5 16V3z"/><path d="M5 19h15M8 7h5M9 10h4"/>',
  'i-horse':   '<path d="M6 20.5 7.5 14C5.6 13 4.6 11 5.4 9l3.8-4.2.8 2 3-.8 1 1.8c2.2.8 5 2.1 6 5l-1.9 1.9-2.8-1.7-1.8 3 .8 4.5"/><path d="M9.5 20.5l.8-5"/><circle cx="9" cy="8.5" r=".4"/>',
  'i-stone':   '<path d="M7 20V9a5 5 0 0 1 10 0v11"/><path d="M4 20h16M10 11h4M10 14h4"/>',
  'i-sprout':  '<path d="M12 21v-9"/><path d="M12 12c0-4-3-6-7-6 0 4 3 6 7 6zM12 14.5c0-3 2.5-5 6-5 0 3-2.5 5-6 5z"/><path d="M8 21h8"/>',
  'i-road':    '<path d="M9 3 5 21M15 3l4 18"/><path d="M12 5v2M12 10v3M12 16v3"/>',
  'i-hall':    '<path d="M3 9 12 4l9 5z"/><path d="M5.5 9v9M9.8 9v9M14.2 9v9M18.5 9v9M3 20.5h18M4 18h16"/>',
  'i-hearth':  '<path d="M4 21V9l8-5 8 5v12"/><path d="M8 21v-5.5a4 4 0 0 1 8 0V21"/><path d="M12 20c-1.5 0-2.4-1-2-2.4.5.6 1 .6 1.2 0 .3-1 .8-1.6 1.5-2 0 1.3 1.3 1.8 1.2 3-.2.9-1 1.4-1.9 1.4z"/>',
  // gear and useful items
  'i-w-sword': '<path d="M19.5 3.5 20.5 4.5 9 16l-1-1z"/><path d="M19.5 3.5 21 3l-.5 1.5"/><path d="M6 13l5 5M8.5 15.5 4 20M3 19l2 2"/>',
  'i-w-spear': '<path d="M3 21 16 8"/><path d="M16 8l1.5-4.5L21 2l-1.5 3.5L16 8z"/><path d="M13 9.5l1.5 1.5"/>',
  'i-w-dagger':'<path d="M16 4l4 0 0 4-8 8-4-4z"/><path d="M7 11l6 6M9.5 14.5 5 19M4 18l2 2"/>',
  'i-w-club':  '<path d="M4 20l8.5-8.5"/><path d="M12 12c-1-3 1.5-7.5 5-8.5 2.3-.6 3.8.9 3.2 3.2-1 3.5-5.5 6-8.2 5.3z"/><path d="M16 6.5h.01M18 9h.01M15 9.5h.01"/>',
  'i-leather': '<path d="M8 3h8l4 4-3 2.5V21H7V9.5L4 7z"/><path d="M8 3c1.5 2.5 6.5 2.5 8 0"/><path d="M12 7v14M9.5 10h5M9.5 14h5"/>',
  'i-knife':   '<path d="M4 20 15 9"/><path d="M15 9l4.5-4.5c.4 4.8-1.7 8-5.8 8.2"/><path d="M6 16.5l1.5 1.5"/>',
  'i-rope':    '<circle cx="10" cy="13" r="6"/><circle cx="10" cy="13" r="2.8"/><path d="M15.2 10c1.8-1 2.8-3 2.8-5.5M16 3l2 1.5 2-1.5"/>',
  'i-jar':     '<path d="M8.5 7h7M9.5 4h5v3M7.5 7h9v12a2 2 0 0 1-2 2h-5a2 2 0 0 1-2-2z"/><path d="M12 11c-2 1-2 4 0 6 2-2 2-5 0-6z"/>',
  'i-cloak':   '<path d="M9 3h6l1.3 3L12 8.2 7.7 6z"/><path d="M7.7 6 4 21h16L16.3 6"/><circle cx="12" cy="8.5" r="1"/>',
  'i-flask':   '<path d="M10 3h4M10.5 3v5l-4.3 8A3 3 0 0 0 9 21h6a3 3 0 0 0 2.8-5l-4.3-8V3"/><path d="M7.4 14h9.2"/>',
  'i-pipe':    '<path d="M3 11h9.5l1.5 5.5a3 3 0 0 0 5.8-.8V11h-5.8"/><path d="M15.5 7.5c0-1.2 1-2-.2-3.5M18.5 7.5c0-1.2 1-2-.2-3.5"/>',
  'i-harp':    '<path d="M6 3v18h12"/><path d="M6 3c7 1 12 8 12 18"/><path d="M9 6v15M12 9v12M15 13v8"/>',
  'i-seal':    '<path fill="currentColor" stroke="none" d="M12 1.5c1.9 0 2.4 1.4 3.9 1.8 1.5.3 2.9-.3 3.9 1 .9 1.3.2 2.6.5 4.1.4 1.5 1.8 2.1 1.8 3.9s-1.4 2.4-1.8 3.9c-.3 1.5.4 2.8-.5 4.1-1 1.3-2.4.7-3.9 1-1.5.4-2 1.8-3.9 1.8s-2.4-1.4-3.9-1.8c-1.5-.3-2.9.3-3.9-1-.9-1.3-.2-2.6-.5-4.1C1.9 14.7.5 14.1.5 12.3s1.4-2.4 1.8-3.9c.3-1.5-.4-2.8.5-4.1 1-1.3 2.4-.7 3.9-1C8.1 2.9 8.6 1.5 12 1.5z"/><circle cx="12" cy="12.2" r="7" stroke="#000" stroke-opacity=".28" stroke-width="1"/>',
'i-orb':     '<circle cx="12" cy="10" r="6.5"/><path d="M8.5 7.5a4 4 0 0 1 3-1.8"/><path d="M6 20h12M8 20l1.2-3.5h5.6L16 20"/>'
});
const ATTR_GLYPH = { str: 'i-att-str', hrt: 'i-att-hrt', wit: 'i-att-wit' };
const STANCE_GLYPH = { forward: 'i-st-forward', open: 'i-st-open', defensive: 'i-st-defensive', rearward: 'i-bow', skirmish: 'i-person' };
const DISP_GLYPH = { expertise: 'i-hammer', manoeuvre: 'i-boot', rally: 'i-horn', vigilance: 'i-lantern', war: 'i-axe' };
const SEASON_GLYPH = { spring: 'i-sprout', summer: 'i-sun', autumn: 'i-leaf', winter: 'i-snow' };
const PHASE_GLYPH = { story: 'i-scroll', journey: 'i-road', combat: 'i-swords', council: 'i-hall', fellowship: 'i-hearth' };
function attrOfSkill(name) {
  if (typeof SKILLS === 'undefined') return '';
  const k = Object.keys(SKILLS).find(a => (SKILLS[a] || []).some(s => (s.name || s) === name));
  return k || '';
}
/** A drawn icon for a Useful Item or treasure, from the words in its name, then its skill. */
function itemGlyph(name, skill) {
  const t = String(name || '').toLowerCase();
  const by = [[/knife|salt/, 'i-knife'], [/rope|grappl|cord/, 'i-rope'], [/lantern|lamp|torch|light/, 'i-lantern'],
    [/instrument|harp|flute|lyre|drum|fiddle|viol|horn/, 'i-harp'], [/balm|salve|herb|poultice|ointment/, 'i-jar'],
    [/cloak|clothes|coat|hood|garb|mantle/, 'i-cloak'], [/brooch|earring|pearl|ring|jewel|gem|necklace|circlet/, 'i-gem'],
    [/liquor|flask|draught|ale|wine|brandy/, 'i-flask'], [/sunstone|crystal|stone/, 'i-orb'], [/pipe|tobacco|pipe-weed/, 'i-pipe'],
    [/map|chart/, 'i-map'], [/tool|chisel|carving|hammer/, 'i-tools'], [/book|riddle|tome|scroll|notes/, 'i-book']];
  const hit = by.find(([re]) => re.test(t)); if (hit) return hit[1];
  const a = attrOfSkill(skill); return ATTR_GLYPH[a] || 'i-pack';
}
/** A drawn weapon by its name first (a dagger is not a sword), its proficiency second. */
function weaponGlyph(w, prof) {
  const t = String((w && w.name) || '').toLowerCase();
  if (/dagger|knife/.test(t)) return 'i-w-dagger';
  if (/cudgel|club|mace|staff|unarmed|fist/.test(t)) return /unarmed|fist/.test(t) ? 'i-arm' : 'i-w-club';
  if (/mattock|pick/.test(t)) return 'i-pick';
  if (/bow/.test(t)) return 'i-bow';
  if (/spear|lance|javelin|pike/.test(t)) return 'i-w-spear';
  if (/axe/.test(t)) return 'i-axe';
  if (/sword|blade|sabre|scimitar/.test(t)) return 'i-w-sword';
  return ({ Swords: 'i-w-sword', Bows: 'i-bow', Spears: 'i-w-spear', Axes: 'i-axe', Brawling: 'i-arm' })[prof] || 'i-w-sword';
}

/* ---------- Header strips: one thin engraved band per nav group ---------- */
const GROUP_STRIPS = {
  hero: `<path d="M0 30 H132"/><path d="M228 30 H360"/><path d="M140 30 q20-24 40-24 q20 0 40 24"/><path d="M160 30 v-10 l20-8 20 8 v10"/><path d="M180 12 v18M170 22 h20"/>` +
    `<path d="M132 30 c-12-2-18-8-22-16M114 20 c-6 0-10-3-12-7M122 26 c-7 1-12-1-16-5"/><path d="M228 30 c12-2 18-8 22-16M246 20 c6 0 10-3 12-7M238 26 c7 1 12-1 16-5"/>`,
  adventure: `<path d="M0 34 C40 30 60 36 100 32 S170 26 210 32 S300 36 360 30"/><path d="M40 30 l12-16 8 9 10-14 14 21" class="f2"/>` +
    `<path d="M270 30 l6-6 6 6 M288 30 l5-5 5 5"/><circle cx="330" cy="18" r="9"/><path d="M330 7 v22 M319 18 h22 M330 9 l2 9 -2 9 -2-9z" class="f"/>` +
    `<path d="M150 29 q4-6 8 0 M162 30 q3-4 6 0"/><path d="M198 14 q3-3 6 0 q3-3 6 0"/>`,
  roll: `<path d="M0 30 H360" class="w"/><rect x="150" y="10" width="18" height="18" rx="3" transform="rotate(-12 159 19)"/><circle cx="156" cy="16" r="1" class="f"/><circle cx="162" cy="22" r="1" class="f"/>` +
    `<path d="M186 8 l9 4 2 10 -7 7 -10-2 -3-10z"/><path d="M186 8 l1 9 -8 3 M187 17 l9 5 M187 17 l3 12"/><path d="M60 20 h40 M260 20 h40" class="w"/><path d="M110 20 l4-4 4 4-4 4z M242 20 l4-4 4 4-4 4z" class="f"/>`,
  journal: `<path d="M0 32 H360" class="w"/><path d="M40 32 c40-4 80-4 110-10"/><path d="M150 22 c6-8 20-16 38-18 -6 10-18 18-30 20z" class="f2"/><path d="M150 22 l-8 10"/>` +
    `<path d="M210 26 c10 0 14-6 22-6 s10 5 20 5 12-6 22-6" /><circle cx="300" cy="26" r="2.5" class="f"/><path d="M60 14 h60 M60 20 h44" class="w"/>`
};
function groupStrip(g) {
  if (!GROUP_STRIPS[g]) return '';
  return `<div class="group-strip gs-${g}" aria-hidden="true"><svg viewBox="0 0 360 40" preserveAspectRatio="xMidYMid meet">${GROUP_STRIPS[g]}</svg></div>`;
}
function injectGroupStrips() {
  if (typeof navGroupOf !== 'function') return;
  document.querySelectorAll('.panel[id^="panel-"]').forEach(p => {
    if (p.querySelector(':scope > .group-strip')) return;
    const tab = p.id.slice(6); const g = navGroupOf(tab); const id = g && g.id;
    if (!id || id === 'play' || !GROUP_STRIPS[id]) return;
    p.insertAdjacentHTML('afterbegin', groupStrip(id));
  });
}

/* ---------- Table-play phase vignettes (players' "At the table now" card, the big screen) ---------- */
const PHASE_ART = {
  story: `<path d="M110 20 h140 v44 h-140z" class="f2"/><path d="M110 20 c-10 0-10 12 0 12 M250 64 c10 0 10-12 0-12"/><path d="M126 34 h100 M126 42 h108 M126 50 h84"/><path d="M280 60 c6-10 16-20 30-24 -4 8-12 16-22 20z" class="f"/><path d="M280 60 l-6 8"/>`,
  journey: `<path d="M0 70 C80 62 120 72 180 64 S300 56 360 62"/><path d="M150 90 C170 76 190 70 210 64 M232 90 C224 78 220 70 214 64"/><path d="M30 64 l18-30 14 16 12-20 22 34" class="f2"/><path d="M290 62 l3-8 3 8 M300 64 l2-6 2 6"/><path d="M206 64 v-10 l10 3-10 3" class="f"/>`,
  combat: `<path d="M140 76 L220 20 M220 76 L140 20"/><path d="M216 16 l8 0 0 8 M144 16 l-8 0 0 8"/><path d="M150 66 l-8 8 M210 66 l8 8"/><circle cx="180" cy="48" r="26" class="f2"/><path d="M60 80 h60 M240 80 h60" class="w"/>`,
  council: `<path d="M110 32 L180 10 L250 32z" class="f2"/><path d="M122 32 v44 M150 32 v44 M180 32 v44 M210 32 v44 M238 32 v44"/><path d="M104 80 h152 M110 76 h140"/><circle cx="180" cy="22" r="3" class="f"/>`,
  fellowship: `<path d="M120 84 V44 l60-30 60 30 v40" class="f2"/><path d="M150 84 v-20 a30 30 0 0 1 60 0 v20"/><path d="M180 82 c-10 0-16-7-13-16 3 4 7 4 8 0 2-7 6-11 11-14 0 9 9 12 8 20-1 6-7 10-14 10z" class="f"/><path d="M100 84 h160"/>`
};
function phaseArt(phase) {
  const k = PHASE_ART[phase] ? phase : 'story';
  return `<div class="phase-art ph-${k}" aria-hidden="true"><svg viewBox="0 0 360 90" preserveAspectRatio="xMidYMid meet">${PHASE_ART[k]}</svg></div>`;
}

/* ---------- The seeing-stone beside the Oracle's question ---------- */
function seeingStone() {
  return `<svg class="seeing-stone" viewBox="0 0 64 64" aria-hidden="true">
    <defs><radialGradient id="ss-g" cx="40%" cy="35%" r="65%"><stop offset="0" stop-color="#e9e4f5"/><stop offset=".45" stop-color="#7d86a8"/><stop offset="1" stop-color="#1f2336"/></radialGradient></defs>
    <circle class="ss-glow" cx="32" cy="27" r="22"/>
    <circle cx="32" cy="27" r="17" fill="url(#ss-g)" stroke="currentColor" stroke-width="1.4"/>
    <path d="M22 20a11 11 0 0 1 8-6" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M18 58h28M21 58l3-9h16l3 9M24 49c0-3 3-5 8-5s8 2 8 5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
}
/** A wax seal: a scalloped disc with a letter or number pressed into it. */
function waxSeal(mark, cls, title) {
  return `<span class="wax-seal ${cls || ''}"${title ? ` title="${escapeHtml(title)}"` : ''}><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-seal"/></svg><b>${escapeHtml(String(mark))}</b></span>`;
}

/* ---------- The season wheel on the Tale of Years ---------- */
function seasonWheel(month, day) {
  const m = Math.max(1, Math.min(12, parseInt(month) || 1)), d = Math.max(1, Math.min(30, parseInt(day) || 1));
  const cx = 60, cy = 60, R = 50, r = 34;
  const pt = (a, rad) => [cx + rad * Math.sin(a), cy - rad * Math.cos(a)];
  // Shire months 1 (Afteryule) .. 12 (Foreyule): winter at the top, around Yule
  const seasonOf = i => (i === 12 || i <= 2) ? 'winter' : i <= 5 ? 'spring' : i <= 8 ? 'summer' : 'autumn';
  let seg = '';
  for (let i = 1; i <= 12; i++) {
    const a0 = (i - 1) / 12 * Math.PI * 2 - Math.PI / 12, a1 = i / 12 * Math.PI * 2 - Math.PI / 12;
    const [x0, y0] = pt(a0, R), [x1, y1] = pt(a1, R), [x2, y2] = pt(a1, r), [x3, y3] = pt(a0, r);
    seg += `<path class="sw-${seasonOf(i)}${i === m ? ' on' : ''}" d="M${x0.toFixed(1)} ${y0.toFixed(1)} A${R} ${R} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)} A${r} ${r} 0 0 0 ${x3.toFixed(1)} ${y3.toFixed(1)}z"/>`;
  }
  const a = ((m - 1) + (d - 1) / 30) / 12 * Math.PI * 2 - Math.PI / 12;
  const [hx, hy] = pt(a, R + 4);
  const [yx, yy] = pt(-Math.PI / 12, R + 7);
  const icon = (s, ang) => { const [x, y] = pt(ang, (R + r) / 2); return `<use href="#${SEASON_GLYPH[s]}" x="${(x - 6).toFixed(1)}" y="${(y - 6).toFixed(1)}" width="12" height="12" class="sw-ic"/>`; };
  return `<svg class="season-wheel" viewBox="0 0 120 120" role="img" aria-label="Month ${m} of 12, day ${d}">${seg}
    ${icon('winter', 0)}${icon('spring', Math.PI * 2 / 12 * 3)}${icon('summer', Math.PI * 2 / 12 * 6)}${icon('autumn', Math.PI * 2 / 12 * 9)}
    <circle cx="${cx}" cy="${cy}" r="${r - 6}" class="sw-hub"/><path d="M${cx} ${cy} L${hx.toFixed(1)} ${hy.toFixed(1)}" class="sw-hand"/><circle cx="${cx}" cy="${cy}" r="3" class="sw-pin"/>
    <path d="M${(yx - 3).toFixed(1)} ${(yy - 5).toFixed(1)} l3 4 3-4" class="sw-yule"/></svg>`;
}

/* ---------- Notched bars (End / Hate) ---------- */
function notchBar(cur, max, cls, label) {
  const m = Math.max(0, parseInt(max) || 0), c = Math.max(0, Math.min(m, parseInt(cur) || 0));
  if (!m) return '';
  const n = Math.min(m, 30), per = m / n;
  let s = '';
  for (let i = 0; i < n; i++) s += `<i class="${(i + 1) * per <= c + 1e-9 ? 'on' : ''}"></i>`;
  return `<span class="notch-bar ${cls || ''}" role="img" aria-label="${escapeHtml(label || '')} ${c} of ${m}">${s}</span>`;
}

/* ---------- Battle: two banners and the clash between them ---------- */
function battleBanners(bandName, foeName, foeRes, foeResMax) {
  const max = Math.max(1, parseInt(foeResMax) || 1), res = Math.max(0, Math.min(max, parseInt(foeRes) || 0));
  const pct = Math.round((1 - res / max) * 100);
  const flag = (cls, mark) => `<svg class="bb-flag ${cls}" viewBox="0 0 40 56" aria-hidden="true"><path d="M4 2v54"/><path d="M4 4h32v34l-16-8-16 8" class="bb-cloth"/><use href="#${mark}" x="10" y="8" width="20" height="20" class="bb-mark"/></svg>`;
  return `<div class="battle-banners" role="img" aria-label="${escapeHtml(bandName)} against ${escapeHtml(foeName)}: foe Resistance ${res} of ${max}">
    ${flag('bb-band', 'i-hammer')}
    <div class="bb-mid"><div class="bb-names"><b>${escapeHtml(bandName)}</b><b>${escapeHtml(foeName)}</b></div>
      <div class="tug"><span class="tug-fill" style="width:${pct}%"></span><span class="tug-knot" style="left:${pct}%"></span></div>
      <small>Foe Resistance ${res} / ${max}</small></div>
    ${flag('bb-foe', 'i-skull')}</div>`;
}

/* ---------- Motion: the scene drifts as you scroll ---------- */
function _sceneParallax() {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const art = document.querySelector('#panel-play .scene-art svg'); if (!art) return;
  const r = art.parentNode.getBoundingClientRect();
  const off = Math.max(-14, Math.min(14, (r.top - 80) * -0.08));
  art.style.transform = `translateY(${off.toFixed(1)}px) scale(1.08)`;
}
/* A row of chips wider than the screen fades at its right edge until you reach the end. */
function jumpBarCue(el) {
  if (!el) return;
  const over = el.scrollWidth > el.clientWidth + 2;
  el.classList.toggle('over', over);
  el.classList.toggle('at-end', !over || el.scrollLeft + el.clientWidth >= el.scrollWidth - 2);
}
function refreshJumpCues() { document.querySelectorAll('.jump-bar').forEach(jumpBarCue); }
document.addEventListener('scroll', e => { if (e.target && e.target.classList && e.target.classList.contains('jump-bar')) jumpBarCue(e.target); }, true);
window.addEventListener('resize', () => requestAnimationFrame(refreshJumpCues));
document.addEventListener('click', e => { if (e.target.closest && e.target.closest('.tab, .bn-item')) setTimeout(refreshJumpCues, 60); });
document.addEventListener('DOMContentLoaded', () => {
  injectGroupStrips();
  setTimeout(refreshJumpCues, 300);
  const st = document.getElementById('ask-stone'); if (st && !st.firstChild) st.innerHTML = seeingStone();
  window.addEventListener('scroll', () => requestAnimationFrame(_sceneParallax), { passive: true });
});
/** The moon on a given day of a 30-day month: new at day 1, full at 15. */
function moonGlyph(day) {
  const d = ((parseInt(day) || 1) - 1) % 30, t = d / 30;             // 0 new → .5 full → 1 new
  const lit = 1 - Math.abs(t * 2 - 1);                                 // 0..1
  const off = ((t < .5 ? -1 : 1) * lit * 16).toFixed(1);             // the shadow slides off, then back
  return `<svg class="moon" viewBox="0 0 24 24" aria-hidden="true"><defs><clipPath id="mc${d}"><circle cx="12" cy="12" r="7"/></clipPath></defs>` +
    `<circle cx="12" cy="12" r="7" class="moon-lit"/><circle cx="${(12 + +off).toFixed(1)}" cy="12" r="7" class="moon-dark" clip-path="url(#mc${d})"${lit > .98 ? ' opacity="0"' : ''}/><circle cx="12" cy="12" r="7" class="moon-rim"/></svg>`;
}
/** A scene's date as a small wax seal carrying the moon of that day. */
function dateSeal(date) {
  const day = date && date.day;
  return `<span class="date-seal" aria-hidden="true"><svg viewBox="0 0 24 24"><use href="#i-seal"/></svg>${moonGlyph(day)}</span>`;
}
/** Sessions and adventures played, pressed as wax seals on the Play tab's campaign line. */
function renderCampSeals() {
  const el = document.getElementById('camp-seals'); if (!el || typeof char === 'undefined') return;
  const sg = char.saga || {}; const ses = parseInt(sg.sessions) || 0, adv = parseInt(sg.adventures) || 0;
  el.innerHTML = sg.started ? waxSeal(ses, 'seal-ses', ses + (ses === 1 ? ' session' : ' sessions')) + waxSeal(adv, 'seal-adv', adv + (adv === 1 ? ' adventure' : ' adventures')) : '';
}
/** A drawn horizon closing the Play tab: hills, a road running off, a lone tree — so the page
    ends on a picture instead of empty paper. */
function playFooterArt() {
  return `<div class="play-footart" aria-hidden="true"><svg viewBox="0 0 360 70" preserveAspectRatio="xMidYMax slice">
    <path d="M0 52 Q60 30 120 46 T240 40 T360 48" class="f2"/><path d="M0 64 Q90 50 180 60 T360 58"/>
    <path d="M170 70 C182 62 196 56 214 52 S246 46 262 44 M212 70 C214 62 222 56 232 52 S252 46 262 44" class="rd"/>
    <circle cx="300" cy="30" r="10" class="f2"/><path d="M300 40 v14"/><path d="M52 44 l6-10 6 10z M60 46 l4-7 4 7z" class="f"/>
    <path d="M110 18 q4-4 8 0 q4-4 8 0 M136 26 q3-3 6 0 q3-3 6 0"/></svg></div>`;
}

/* ============================================================
   Round 7 — tallies, candles, faces, badges, the dice stamp, the hero plate, weather
   ============================================================ */
Object.assign(ART_SYMBOLS, {
  'i-face-sad':   '<circle cx="12" cy="12" r="9"/><path d="M8.5 10h.01M15.5 10h.01"/><path d="M8.5 16.5c2-1.8 5-1.8 7 0"/><path d="M7 7.5l2.5 1M17 7.5l-2.5 1"/>',
  'i-face-flat':  '<circle cx="12" cy="12" r="9"/><path d="M8.5 10h.01M15.5 10h.01"/><path d="M8.5 15.5h7"/>',
  'i-face-smile': '<circle cx="12" cy="12" r="9"/><path d="M8.5 10h.01M15.5 10h.01"/><path d="M8 14.5c2 2.4 6 2.4 8 0"/>',
  'i-chalice':    '<path d="M7 3h10v4a5 5 0 0 1-10 0z"/><path d="M12 12v6M8 21h8M9.5 21l1-3h3l1 3"/>',
  'i-quill':      '<path d="M20 3c-7 1-12 6-14 14l-2 4 4-2c8-2 13-7 14-14z" /><path d="M6 17 14 9"/>'
});
/** Successes as tally marks — four strokes and a slash per five — against the Resistance to beat. */
function tallyMarks(n, of) {
  const got = Math.max(0, parseInt(n) || 0), need = Math.max(0, parseInt(of) || 0);
  const slots = Math.max(got, need); if (!slots) return '';
  const groups = Math.ceil(slots / 5), W = groups * 30 + 8, H = 26;
  let s = '';
  for (let i = 0; i < slots; i++) {
    const g = Math.floor(i / 5), k = i % 5, x0 = 6 + g * 30;
    const cls = i < got ? (i < need ? 'tm on' : 'tm over') : 'tm off';
    s += k < 4 ? `<path class="${cls}" d="M${x0 + k * 5.5} 4 l${(k % 2 ? .6 : -.5)} 18"/>` : `<path class="${cls}" d="M${x0 - 3} 19 L${x0 + 20} 6"/>`;
  }
  const fx = need ? 6 + Math.floor((need - 1) / 5) * 30 + ((need - 1) % 5 < 4 ? ((need - 1) % 5) * 5.5 + 5 : 22) : 0;
  const finish = need ? `<path class="tm-line" d="M${fx.toFixed(1)} 1 v24"/>` : '';
  return `<svg class="tally" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${got} of ${need} successes">${s}${finish}</svg>`;
}
/** The Time Limit as candles: one goes out for each attempt made. */
function candleRow(used, total) {
  const t = Math.max(0, parseInt(total) || 0), u = Math.max(0, Math.min(t, parseInt(used) || 0));
  if (!t) return '';
  let s = '';
  for (let i = 0; i < t; i++) {
    const lit = i < t - u;
    s += `<svg class="candle ${lit ? 'lit' : 'out'}" viewBox="0 0 16 36" width="16" height="36" aria-hidden="true">` +
      (lit ? `<path class="c-flame" d="M8 2c2.6 3 3 5.4 0 8.6C5 7.4 5.4 5 8 2z"/>` : `<path class="c-smoke" d="M8 10c-2-2 2-3 0-5s2-3 0-4"/>`) +
      `<path class="c-wick" d="M8 10.5v2.5"/><rect class="c-body" x="4" y="13" width="8" height="20" rx="1.5"/><path class="c-drip" d="M5 16v4M11 15v3"/><path class="c-base" d="M2 34h12"/></svg>`;
  }
  return `<span class="candles" role="img" aria-label="${t - u} of ${t} attempts left">${s}</span>`;
}
/** Protection and Parry drawn as the thing that gives them: a mail shirt, a shield. */
function statBadge(kind, value) {
  const shape = kind === 'shield'
    ? '<path class="sb-shape" d="M24 3l17 6v12c0 12-7.5 20-17 24C14.5 41 7 33 7 21V9z"/>'
    : '<path class="sb-shape" d="M15 4h18l9 9-6 5v26H12V18l-6-5z"/><path class="sb-mail" d="M13 24h22M13 30h22M13 36h22"/>';
  return `<span class="stat-badge sb-${kind}"><svg viewBox="0 0 48 48" aria-hidden="true">${shape}</svg><b>${escapeHtml(String(value))}</b></span>`;
}
/** An ink stamp beside the result banner: a tick, one star, two stars, or a cross. */
function rollStamp(ok, level) {
  const great = /great/i.test(level || ''), extra = /extraordinary/i.test(level || '');
  const mark = !ok ? '<path d="M17 17l14 14M31 17L17 31"/>'
    : extra ? '<path d="M17 18l1.6 3.4 3.6.4-2.7 2.4.8 3.6-3.3-1.9-3.2 1.9.8-3.6-2.7-2.4 3.6-.4zM31 18l1.6 3.4 3.6.4-2.7 2.4.8 3.6-3.3-1.9-3.2 1.9.8-3.6-2.7-2.4 3.6-.4z"/>'
    : great ? '<path d="M24 14l2.6 5.6 6 .6-4.5 4 1.3 6-5.4-3.1-5.4 3.1 1.3-6-4.5-4 6-.6z"/>'
    : '<path d="M16 24l6 6 11-12"/>';
  return `<span class="roll-stamp ${ok ? (extra ? 'st-extra' : great ? 'st-great' : 'st-ok') : 'st-fail'}" aria-hidden="true"><svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="20"/><circle cx="24" cy="24" r="16.5" class="st-inner"/>${mark}</svg></span>`;
}
/** Tablet Play (round 7): the hero in a framed plate — silhouette in a gilt oval, crest, name and
    the two pools — and, when not on the road, the country around the Safe Haven on the real map. */
function heroPlate(withMap) {
  if (typeof char === 'undefined' || !char.culture) return '';
  const n = v => parseInt(v) || 0;
  const pct = (a, b) => b > 0 ? Math.max(0, Math.min(100, a / b * 100)) : 0;
  const sil = cultureSilhouette(char.culture).replace('class="silhouette"', 'class="silhouette hp-sil"');
  const sh = n(char.shadow) + n(char.scars);
  const map = withMap && typeof havenMapPanel === 'function' ? havenMapPanel() : '';
  return `<div class="card hero-plate${map ? ' has-map' : ''}"><div class="hp-row">
      <div class="hp-oval" aria-hidden="true">${sil}</div>
      <div class="hp-txt"><div class="eyebrow">Your hero</div><strong class="hp-name">${escapeHtml(char.name || heroLabel(char))}</strong>
        <span class="hp-sub">${cultureCrest(char.culture, 22, char.name)}${escapeHtml(char.culture)}${char.calling ? ' · ' + escapeHtml(char.calling) : ''}</span>
        <div class="hp-meter"><span>Endurance</span><b>${n(char.endCur)}<small>/${n(char.endMax)}</small></b><i class="hp-bar end"><em style="width:${pct(n(char.endCur), n(char.endMax))}%"></em></i></div>
        <div class="hp-meter"><span>Hope</span><b>${n(char.hopeCur)}<small>/${n(char.hopeMax)}</small></b><i class="hp-bar hope"><em style="width:${pct(n(char.hopeCur), n(char.hopeMax))}%"></em>${sh ? `<em class="soot" style="width:${pct(sh, n(char.hopeMax))}%"></em>` : ''}</i></div>
      </div></div>${map}</div>`;
}
/** Numbered steps ("1 · Allies") get their number in a small gilt medallion. The words stay the
    same in the text, so anything reading "1 · Allies" still finds it; only the look changes. */
function medalliseSteps(root) {
  (root || document).querySelectorAll('.card-title, .panel p.hint, .panel h4').forEach(el => {
    if (el.querySelector('.step-med')) return;
    // a title with a help hint has its words wrapped in .title-term, so look one level in
    const host = el.firstElementChild && el.firstElementChild.classList.contains('title-term') && el.firstChild === el.firstElementChild ? el.firstElementChild : el;
    const t = host.firstChild; if (!t || t.nodeType !== 3) return;
    const m = t.nodeValue.match(/^(\s*)(\d{1,2}) · /); if (!m) return;
    const span = document.createElement('span'); span.className = 'step-med';
    span.innerHTML = `<b>${m[2]}</b><span class="sm-dot"> · </span>`;
    t.nodeValue = t.nodeValue.slice(m[0].length);
    host.insertBefore(span, t);
    el.classList.add('has-step-med');
  });
}
document.addEventListener('DOMContentLoaded', () => setTimeout(() => medalliseSteps(document), 0));
/* The quill nibs while you write in the Chronicle. */
document.addEventListener('input', e => {
  if (!e.target || e.target.id !== 'ch-compose') return;
  const q = document.getElementById('ch-quill'); if (!q) return;
  q.classList.add('writing'); clearTimeout(q._t); q._t = setTimeout(() => q.classList.remove('writing'), 700);
});
/* Round 7: each empty list gets its own small drawing instead of a generic icon */
const EMPTY_ART = {
  dice: '<path d="M10 14h18l-3 24H13z"/><path d="M10 14c3-3 15-3 18 0"/><path d="M13 20h12" opacity=".5"/><rect x="31" y="30" width="10" height="10" rx="2" transform="rotate(-14 36 35)"/><circle cx="34.5" cy="33.5" r=".9" class="ea-f"/><circle cx="37.5" cy="36.5" r=".9" class="ea-f"/><path d="M6 40h36"/>',
  gem: '<path d="M8 24h32v14H8z"/><path d="M8 24l4-10h24l4 10"/><path d="M12 14l-2-6h28l-2 6" opacity=".6"/><path d="M22 28h4v4h-4z"/><path d="M8 31h32" opacity=".4"/>',
  feather: '<path d="M10 10h22a4 4 0 0 1 0 8H14"/><path d="M14 18v20a4 4 0 0 1-8 0V14a4 4 0 0 1 4-4"/><path d="M14 38h20a4 4 0 0 0 4-4V18"/><path d="M40 6c-6 1-10 5-12 12l-2 5 4-2c6-2 9-7 10-15z" class="ea-f2"/>',
  pack: '<path d="M12 18h24v20a2 2 0 0 1-2 2H14a2 2 0 0 1-2-2z"/><path d="M12 18c0-6 5-9 12-9s12 3 12 9"/><path d="M12 22h24l-3 7H15z"/><path d="M24 29v4"/>',
  skull: '<path d="M8 40l24-28"/><path d="M29 11l5-3-1 6"/><path d="M11 33l5 5"/><path d="M40 40L20 17"/><path d="M18 18l-4-2 1 5"/><path d="M34 34l-4 5"/><path d="M4 42h40" opacity=".5"/>',
  users: '<path d="M6 16 24 7l18 9"/><path d="M9 16v24M39 16v24M18 16v24M30 16v24" opacity=".7"/><path d="M6 40h36"/><path d="M13 34h8M27 34h8"/><path d="M14 34v4M20 34v4M28 34v4M34 34v4" opacity=".6"/>'
};

/* ============================================================
   Round 8 — the empty battlefield, choice-card vignettes, tokens
   ============================================================ */
/** An empty field of battle: a ridge, broken spears, a banner, crossed blades — waiting for foes. */
function battlefieldArt() {
  return `<div class="battlefield-art" aria-hidden="true"><svg viewBox="0 0 320 84" preserveAspectRatio="xMidYMid meet">
    <path class="bf-far" d="M0 58 Q40 42 80 50 T160 44 T240 50 T320 42 V84 H0Z"/>
    <path class="bf-near" d="M0 70 Q60 60 120 66 T240 62 T320 68 V84 H0Z"/>
    <g class="bf-ink"><path d="M40 70 L52 40M47 44l9-7-2 11"/><path d="M270 66 L262 34M259 38l4-10 4 10"/><path d="M226 64 l10-16"/>
      <path d="M92 66 V26"/><path class="bf-flag" d="M92 27 q14 3 24 -1 v14 q-10 4 -24 1z"/></g>
    <g class="bf-blades"><path d="M146 66 L178 30M178 30l4 -2 -2 4M150 56l6 6"/><path d="M178 66 L146 30M146 30l-4 -2 2 4M174 56l-6 6"/></g>
    <circle class="bf-sun" cx="160" cy="26" r="10"/></svg></div>`;
}

/** Small ink scenes across the top of choice cards (Council chooser, Journey distance and travel). */
const CHOICE_VIGNETTES = {
  council: '<path d="M8 38h104"/><path d="M20 38V14M36 38V14M84 38V14M100 38V14"/><path d="M14 14h28M78 14h28M16 10h24M80 10h24"/><path d="M52 38V22q8-8 16 0v16"/><path d="M56 26h8"/><path class="vf" d="M55 30h10v8H55z"/><path d="M44 38l2-6M76 38l-2-6"/>',
  endeavour: '<path d="M10 30h84M16 30v8M88 30v8"/><path class="vf" d="M22 22h22l3 8H19z"/><path d="M30 22V16h10v6"/><path d="M64 30V18M60 18h8l-2-6h-4z"/><path class="vg" d="M64 10l1.5-3 1.5 3"/><path d="M76 30l10-12 4 4-10 12M86 18l4-4"/><path d="M100 38h12"/>',
  d4: '<path d="M4 38h112"/><path d="M60 38 C58 32 62 28 70 24"/><path d="M70 24 q8-10 18-2 q6-6 12 2"/><path d="M10 34q6-5 12 0"/>',
  d9: '<path d="M4 38h112"/><path d="M60 38 C56 30 64 26 58 20 C54 16 62 14 66 12"/><path d="M40 24 q10-12 22-2 q8-8 16 0 q6-4 12 2"/><path d="M14 34q6-5 12 0M94 34q6-5 12 0"/>',
  d18: '<path d="M4 38h112"/><path d="M60 38 C54 30 66 26 56 20 C50 16 64 12 60 8"/><path d="M30 22 l12-14 8 8 10-12 12 12 8-6 12 12"/><path class="vs" d="M42 8l-3 4h6zM60 4l-3 4h6z"/><path d="M10 34q6-5 12 0M96 34q6-5 12 0"/>',
  exact: '<path d="M4 38h112"/><path class="vs" d="M20 10h80v24H20z"/><path d="M28 10v24M44 10v24M60 10v24M76 10v24M92 10v24M20 18h80M20 26h80"/><path d="M60 22l3-8 3 8-3 8z"/>',
  map: '<path d="M24 10l24 4 24-4 24 4v24l-24-4-24 4-24-4z"/><path d="M48 14v24M72 10v24"/><path class="vr" d="M30 30 C38 24 44 26 52 22 S66 18 74 20 S84 26 90 18"/><path class="vr" d="M88 14l4 4M92 14l-4 4"/>',
  foot: '<path d="M4 38h112"/><path d="M40 38 C46 30 60 28 64 20 C66 16 72 14 80 12"/><path d="M12 36l2-6 2 6M22 36l2-8 2 8M96 36l2-6 2 6M104 36l2-8 2 8"/>',
  mounted: '<path d="M4 38h112"/><path d="M40 34h28l4-8 8-2-2 6-4 2v10M44 34v4M50 34v4M62 34v4M68 34v4M40 34l-4-6"/><path d="M54 26l2-10h6l-2 10"/><circle cx="59" cy="12" r="3"/>',
  forced: '<path d="M4 38h112"/><path d="M52 38l6-10 4 10M58 28l2-10 6 6M60 18l-6 4"/><circle cx="62" cy="13" r="3"/><path class="vs" d="M24 26h18M18 30h20M28 22h12"/>'
};
function choiceVignette(key) {
  const d = CHOICE_VIGNETTES[key]; if (!d) return '';
  return `<span class="opt-vig" aria-hidden="true"><svg viewBox="0 0 120 42" preserveAspectRatio="xMidYMid meet">${d}</svg></span>`;
}
function decorateChoiceCards(root) {
  const map = [['#pick-council', 'council'], ['#pick-endeavour', 'endeavour'], ['#j-dist [data-hex="4"]', 'd4'], ['#j-dist [data-hex="9"]', 'd9'],
    ['#j-dist [data-hex="18"]', 'd18'], ['#j-dist [data-hex="exact"]', 'exact'], ['#j-dist [data-hex="map"]', 'map'],
    ['#j-travel [data-mode="foot"]', 'foot'], ['#j-travel [data-mode="mounted"]', 'mounted'], ['#j-travel [data-mode="forced"]', 'forced']];
  map.forEach(([sel, key]) => { const el = (root || document).querySelector(sel); if (!el || el.querySelector('.opt-vig')) return;
    el.insertAdjacentHTML('afterbegin', choiceVignette(key)); el.classList.add('has-vig'); });
}
document.addEventListener('DOMContentLoaded', () => setTimeout(() => decorateChoiceCards(document), 0));
/** Card-title rubrics: a small muted-gold mark before each tool card's title, matching its subject. */
const RUBRIC_ICON = [
  [/^war gear/i, 'i-swords'], [/^armour/i, 'i-mail'], [/^shield/i, 'i-shield'], [/^traits/i, 'i-feather'], [/^skills/i, 'i-dice'],
  [/^experience/i, 'i-trophy'], [/^history/i, 'i-scroll'], [/^travelling gear/i, 'i-pack'], [/^magical treasure/i, 'i-gem'], [/^treasure/i, 'i-coins'],
  [/^notes/i, 'i-quill'], [/^stance/i, 'i-st-forward'], [/^encounter/i, 'i-skull'], [/^protection/i, 'i-shield'], [/^set out/i, 'i-road'],
  [/^journey/i, 'i-road'], [/^what are you facing/i, 'i-scales'], [/^council/i, 'i-hall'], [/^skill endeavour|^endeavour/i, 'i-tools'],
  [/^dice roller/i, 'i-dice'], [/^telling table/i, 'i-orb'], [/^lore table/i, 'i-book'], [/^patron quest/i, 'i-crown'], [/^random chamber/i, 'i-castle'],
  [/^random orc/i, 'i-skull'], [/^fortune table/i, 'i-sparkles'], [/^ill-fortune/i, 'i-eye'], [/^oracle history/i, 'i-scroll'], [/^oracle/i, 'i-orb'],
  [/^chronicle/i, 'i-book'], [/^tale of years/i, 'i-calendar'], [/^quick reference/i, 'i-book'], [/^battle setup/i, 'i-flag'], [/^battle log/i, 'i-scroll'],
  [/^your progress/i, 'i-check'], [/^quick build/i, 'i-sparkles'], [/^useful items/i, 'i-lantern'], [/^conditions/i, 'i-warn'], [/^endurance/i, 'i-heart'],
  [/^hope/i, 'i-sun'], [/^advancement/i, 'i-trophy'], [/^eye of mordor/i, 'i-eye'], [/^council log|^endeavour log|^past councils/i, 'i-scroll']
];
function addCardRubrics(root) {
  (root || document).querySelectorAll('.panel .card:not(.ornate):not(.tab-intro) > h3.card-title').forEach(h => {
    if (h.querySelector('.rubric, .step-med, svg') || h.closest('#panel-band')) return;
    const t = h.textContent.replace(/\s+/g, ' ').trim(); if (/^\d/.test(t)) return;
    const hit = RUBRIC_ICON.find(([re]) => re.test(t)); if (!hit) return;
    h.insertAdjacentHTML('afterbegin', `<svg class="ic rubric" aria-hidden="true"><use href="#${hit[1]}"/></svg>`);
  });
}
document.addEventListener('DOMContentLoaded', () => setTimeout(() => addCardRubrics(document), 60));

/* ---------- PAINTED SCENES (storybook redesign, stage 2) ----------
   Layered flat-colour landscapes — far ridge, middle ridge, near land, foreground — under a sky
   that follows the hour and the season, so the picture itself carries the mood. All SVG, no images.
   paintedScene(terrain, { time, season, road, mist, eye, weather, hope }) */
const PS_SKY = {
  day:   ['#8fb7d0', '#d9e4df', '#f2e6c8'],
  dusk:  ['#2f3b5e', '#a86a6a', '#eaa66a'],
  night: ['#070b16', '#16223c', '#2b3a5a'],
  dawn:  ['#5d6f95', '#d8a49a', '#f3d1a0']
};
const PS_LAND = {            // far, mid, near, ground
  road:      ['#9aa8a0', '#7c8a5c', '#5e6b3b', '#3f4a26'],
  forest:    ['#7f9a92', '#466152', '#2c4433', '#1b2b20'],
  hills:     ['#a3ae9a', '#7f8f5a', '#5c6c3a', '#3c4a25'],
  mountains: ['#9aa6b8', '#6a7690', '#4a556c', '#2c3344'],
  river:     ['#93ada8', '#5f8077', '#3e5f58', '#26403b'],
  ruins:     ['#9b978b', '#6f6a5c', '#4d4a40', '#302e28'],
  haven:     ['#a9b39a', '#86925f', '#626f3f', '#434d2a'],
  moria:     ['#2a2622', '#1f1c19', '#171513', '#0e0d0c']
};
const PS_SEASON = { winter: ['#dfe6ea', '#c8d2d8', '#aeb9c2', '#8995a1'], autumn: null, spring: null, summer: null };
function _psRidge(y, amp, f1, f2, seed, top) {
  let d = `M0 ${top || 240} L0 ${y}`;
  for (let x = 0; x <= 400; x += 10) {
    const v = y - amp * (Math.sin(x * f1 + seed) * .6 + Math.sin(x * f2 + seed * 2.3) * .4);
    d += ` L${x} ${v.toFixed(1)}`;
  }
  return d + ` L400 ${top || 240} Z`;
}
function _psPeaks(y, n, h, seed) {
  let d = `M0 240 L0 ${y}`; const w = 400 / n;
  for (let i = 0; i < n; i++) {
    const px = i * w + w * (.35 + .3 * Math.abs(Math.sin(i * 1.7 + seed)));
    const ph = h * (.6 + .4 * Math.abs(Math.sin(i * 2.9 + seed)));
    d += ` L${px.toFixed(1)} ${(y - ph).toFixed(1)} L${((i + 1) * w).toFixed(1)} ${(y - ph * .25).toFixed(1)}`;
  }
  return d + ' L400 240 Z';
}
function _psTrees(n, y, s, seed, col) {
  let o = '';
  for (let i = 0; i < n; i++) {
    const x = (i + .5) * (400 / n) + 14 * Math.sin(i * 3.1 + seed), k = s * (.75 + .35 * Math.abs(Math.sin(i * 1.9 + seed)));
    o += `<path d="M${x.toFixed(1)} ${(y - 3.2 * k).toFixed(1)} L${(x - k).toFixed(1)} ${y} L${(x + k).toFixed(1)} ${y} Z" fill="${col}"/>`;
  }
  return o;
}
const PS_NEAR = {
  road: c => `<path d="${_psRidge(196, 6, .02, .05, 1.1)}" fill="${c[2]}"/>` + _psTrees(5, 198, 9, 2, c[3]),
  forest: c => _psTrees(16, 182, 16, .4, c[1]) + _psTrees(11, 214, 24, 1.3, c[2]),
  hills: c => `<path d="${_psRidge(190, 14, .012, .03, 2.2)}" fill="${c[2]}"/>` + _psTrees(4, 194, 8, 5, c[3]),
  mountains: c => `<path d="${_psPeaks(196, 5, 50, 4.4)}" fill="${c[2]}"/>`,
  river: c => `<path d="${_psRidge(186, 6, .015, .04, .8)}" fill="${c[2]}"/><path d="M0 205 C90 196 160 214 240 206 S350 198 400 204 L400 222 C330 216 260 228 190 220 S60 214 0 222 Z" fill="#7fa6b0" opacity=".75"/>`,
  ruins: c => `<path d="${_psRidge(200, 5, .02, .06, 3.3)}" fill="${c[2]}"/><path d="M250 200 V128 l8 -8 8 10 8 -14 8 12 V200 Z M296 200 V160 h22 v-10 h12 v50 Z M190 200 V172 h14 v-8 h10 v36 Z" fill="${c[3]}"/>`,
  haven: c => `<path d="${_psRidge(196, 8, .015, .04, 1.7)}" fill="${c[2]}"/><path d="M150 198 V160 H240 V198 Z" fill="${c[3]}"/><path d="M140 162 L195 128 L250 162 Z" fill="${c[3]}"/><rect x="164" y="170" width="12" height="11" fill="#f2c46b" opacity=".85"/><rect x="214" y="170" width="12" height="11" fill="#f2c46b" opacity=".85"/><path d="M226 140 v-18 h9 v24" fill="${c[3]}"/><circle cx="300" cy="170" r="22" fill="${c[3]}"/><path d="M298 192 v8 h4 v-8" fill="${c[3]}"/>`,
  moria: c => [40, 120, 280, 360].map(x => `<path d="M${x - 9} 240 V70 h18 V240 Z M${x - 15} 70 h30 l-5 -9 h-20 Z" fill="${c[1]}"/>`).join('') +
    `<circle class="ps-glow" cx="200" cy="96" r="90" fill="#ffb347" opacity=".12"/><path d="M150 240 V128 Q200 72 250 128 V240 Z" fill="${c[2]}"/><path d="M200 0 v54" stroke="${c[1]}" stroke-width="2"/><path d="M193 54 h14 l-3 14 h-8 Z" fill="${c[1]}"/><circle class="ps-flame" cx="200" cy="62" r="4" fill="#ffb347"/>`
};
function paintedScene(key, opts) {
  opts = opts || {};
  const k = PS_LAND[key] ? key : 'road';
  const time = opts.time === 'night' || opts.time === 'dusk' || opts.time === 'dawn' ? opts.time : 'day';
  const sky = k === 'moria' ? ['#0d0b0a', '#1a1612', '#231d17'] : PS_SKY[time];
  let land = PS_LAND[k].slice();
  if (opts.season === 'winter' && k !== 'moria') land = PS_SEASON.winter.map((w, i) => i < 2 ? w : land[i]);
  if (opts.season === 'autumn' && (k === 'forest' || k === 'hills' || k === 'road' || k === 'haven')) land = [land[0], '#9a6b3a', '#7a4a2a', land[3]];
  const body = sky => `<defs><linearGradient id="ps-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset=".6" stop-color="${sky[1]}"/><stop offset="1" stop-color="${sky[2]}"/></linearGradient>` +
    `<linearGradient id="ps-fade" x1="0" y1="0" x2="0" y2="1"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></linearGradient></defs>` +
    `<rect width="400" height="240" fill="url(#ps-sky)"/>`;
  const orb = k === 'moria' ? '' : time === 'night'
    ? `<circle cx="318" cy="52" r="14" fill="#e9e3cf" opacity=".9"/><circle cx="324" cy="47" r="12" fill="${sky[0]}"/>`
    : `<circle cx="${time === 'day' ? 300 : 90}" cy="${time === 'day' ? 50 : 132}" r="${time === 'day' ? 16 : 22}" fill="${time === 'day' ? '#fff3d2' : '#ffcf8a'}" opacity=".85"/>`;
  const far = k === 'moria' ? '' : k === 'mountains' ? `<path d="${_psPeaks(150, 6, 80, 1.3)}" fill="${land[0]}"/>` : `<path d="${_psRidge(140, 18, .011, .027, .5)}" fill="${land[0]}"/>`;
  const mid = k === 'moria' ? '' : k === 'mountains' ? `<path d="${_psPeaks(176, 7, 60, 2.6)}" fill="${land[1]}"/>` : `<path d="${_psRidge(168, 14, .014, .033, 1.9)}" fill="${land[1]}"/>`;
  const near = (PS_NEAR[k] || PS_NEAR.road)(land);
  const ground = `<path d="${_psRidge(220, 4, .02, .05, 2.8)}" fill="${land[3]}"/>`;
  const road = opts.road && k !== 'moria' ? `<path class="ps-road" d="M120 240 C170 226 200 214 222 204 S246 196 252 192 L258 192 C252 198 240 210 232 222 S226 236 228 240 Z" fill="#c9b38a" opacity=".55"/>` : '';
  const mist = opts.mist ? '<div class="scene-mist"></div>' : '';
  const eye = opts.eye > 0 ? `<svg class="scene-eye" viewBox="0 0 60 30" style="opacity:${Math.min(.6, .14 + opts.eye * .46).toFixed(2)}"><path d="M2 15 Q30 -6 58 15 Q30 36 2 15z"/><ellipse cx="30" cy="15" rx="3.5" ry="10"/></svg>` : '';
  const weather = opts.weather ? `<div class="scene-weather w-${opts.weather}"></div>` : '';
  const hope = opts.hope == null ? 1 : Math.max(0, Math.min(1, opts.hope));
  return `<div class="pscene t-${k}" style="--desat:${(1 - hope).toFixed(2)};--eye:${(opts.eye || 0).toFixed(2)}" aria-hidden="true">` +
    `<svg class="ps-svg" viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice">${body(sky)}${orb}${far}${mid}${near}${road}${ground}<rect width="400" height="240" fill="url(#ps-fade)"/></svg>${weather}${mist}${eye}</div>`;
}
