/**
 * pixelScenes.js — Pixel-art scene definitions for Arcadian Trail
 *
 * Coordinate system: 80×45 logical pixels (rendered at SCALE factor by pixelRenderer).
 * All drawing is done via the `r(x, y, w, h, color)` helper passed into each scene fn.
 * x/y/w/h are in logical pixels; color is any CSS color string.
 *
 * Road band: y=32–38. Vehicle: x≈25, y≈22 (placed by renderer, not scenes).
 */

export const PW = 80;  // logical pixel width
export const PH = 45;  // logical pixel height

// ── PRIMITIVE HELPERS ─────────────────────────────────────────────────────────

function cloud(r, x, y, w = 9) {
  r(x + 2, y,     w - 4, 2, '#f8f8ff');
  r(x + 1, y + 1, w - 2, 2, '#ffffff');
  r(x,     y + 2, w,     2, '#ffffff');
  r(x + 1, y + 4, w - 2, 1, '#e8e8f0');
}

function tree(r, x, y, h = 9, leaf = '#2d5a1b', trunk = '#5c4a2a') {
  const th = Math.round(h * 0.45);
  const lh = h - th;
  r(x + 1, y + lh, 2, th, trunk);
  r(x,     y + Math.round(lh * 0.6), 4, Math.round(lh * 0.45), leaf);
  r(x + 1, y + Math.round(lh * 0.3), 2, Math.round(lh * 0.35), leaf);
  r(x + 1, y,     2, Math.round(lh * 0.35), leaf);
}

function pineTall(r, x, y, leaf = '#1a3a10', trunk = '#3a2a10') {
  r(x + 2, y + 10, 2, 4, trunk);
  r(x,     y + 7,  6, 4, leaf);
  r(x + 1, y + 4,  4, 4, leaf);
  r(x + 2, y + 1,  2, 4, leaf);
}

function cactus(r, x, y) {
  const g = '#2d6a1a', lg = '#3a8a22';
  r(x + 1, y,     2, 10, g);
  r(x - 1, y + 3, 2,  3, g);  // left arm
  r(x - 1, y + 2, 2,  2, g);  // arm top
  r(x + 3, y + 4, 2,  3, g);  // right arm
  r(x + 3, y + 3, 2,  2, g);  // arm top
  r(x + 2, y,     1,  7, lg); // highlight
}

function hill(r, cx, baseY, w, h, color) {
  for (let i = 0; i < h; i++) {
    const t = 1 - i / h;
    const hw = Math.round((w / 2) * Math.sqrt(t));
    if (hw > 0) r(cx - hw, baseY - i, hw * 2, 1, color);
  }
}

function peak(r, cx, baseY, w, h, rock = '#5a6270', snow = '#f0f0ff') {
  // Rock body
  for (let i = 0; i < h; i++) {
    const hw = Math.round((w / 2) * (1 - i / h));
    if (hw > 0) r(cx - hw, baseY - i, hw * 2, 1, rock);
  }
  // Snow cap
  const sh = Math.round(h * 0.28);
  for (let i = 0; i < sh; i++) {
    const basehw = Math.round((w / 2) * (1 - (h - sh + i) / h));
    const hw = Math.max(1, Math.round(basehw * (sh - i) / sh));
    r(cx - hw, baseY - (h - sh + i), hw * 2, 1, snow);
  }
}

function building(r, x, y, w, h, wall = '#3a3f4a', roof = '#1a2030', win = '#ffcc44') {
  r(x, y,     w, h,  wall);
  r(x, y,     w, 2,  roof);
  for (let wy = y + 3; wy + 1 < y + h; wy += 4) {
    for (let wx = x + 1; wx + 1 < x + w; wx += 3) {
      r(wx, wy, 2, 2, win);
    }
  }
}

function wave(r, x, y, w, deep = '#2a6aaa', crest = '#8ad0f0') {
  r(x, y,     w, 2, deep);
  r(x, y,     Math.round(w * 0.4), 1, crest);
  r(x + Math.round(w * 0.6), y, Math.round(w * 0.3), 1, crest);
}

function road(r, frame) {
  const Y0 = 32;
  const Y1 = 38;
  const CX = 40;  // vanishing point at horizontal center

  // Full-width surface + shoulder lines
  r(0, Y0, PW, 7, '#7a5a18');
  r(0, Y0, PW, 1, '#a07a28');      // top shoulder
  r(0, Y1, PW, 1, '#a07a28');      // bottom shoulder

  // Perspective lane markers — converge toward horizon (CX) at y=Y0
  for (let y = Y0; y <= Y1; y++) {
    const t  = (y - Y0) / (Y1 - Y0);   // 0 at horizon, 1 at viewer
    const lx = Math.round(CX - 22 * t);
    const rx = Math.round(CX + 22 * t);
    r(lx, y, 1, 1, '#c8a020');          // left lane marker
    r(rx, y, 1, 1, '#c8a020');          // right lane marker
  }

  // Scrolling center dashes (motion between the lane markers)
  const off = (frame * 2) % 12;
  for (let x = -off; x < PW + 12; x += 12) {
    r(x + CX - 4, Y0 + 3, 8, 1, '#c8a020');
    r(x + CX - 4, Y0 + 4, 8, 1, '#c8a020');
  }
}

// ── VEHICLE SPRITE ────────────────────────────────────────────────────────────

export function drawVehicle(r, frame) {
  const osc = Math.round(Math.sin(frame * 0.28) * 1.2);
  const bounce = frame % 5 === 0 ? -1 : 0;
  const vx = 24 + osc;
  const vy = 22 + bounce;

  const BODY  = '#2a5aa0';
  const CAB   = '#1e3d72';
  const GLASS = '#90c8e8';
  const TIRE  = '#111111';
  const RIM   = '#777777';
  const LIGHT = '#ffff80';
  const BUMP  = '#c0c0c0';

  r(vx + 2, vy,     9, 1, CAB);          // cab roof
  r(vx + 2, vy + 1, 9, 3, CAB);          // cab body
  r(vx + 3, vy + 1, 3, 2, GLASS);        // front window
  r(vx + 7, vy + 1, 3, 2, GLASS);        // rear window
  r(vx,     vy + 4, 16, 3, BODY);        // main body
  r(vx,     vy + 5, 2,  2, BUMP);        // front bumper
  r(vx + 14, vy + 5, 1, 2, LIGHT);       // headlight
  r(vx + 1, vy + 7, 4,  2, TIRE);        // front tire
  r(vx + 10, vy + 7, 4, 2, TIRE);        // rear tire
  r(vx + 2, vy + 7, 2,  1, RIM);
  r(vx + 11, vy + 7, 2, 1, RIM);
}

// ── WEATHER OVERLAYS ──────────────────────────────────────────────────────────

export function drawWeather(r, weatherIcon, frame) {
  if (!weatherIcon) return;
  switch (weatherIcon) {
    case 'rain': case 'drizzle': drawRain(r, frame, 18); break;
    case 'storm':                drawRain(r, frame, 28); drawLightning(r, frame); break;
    case 'snow':                 drawSnow(r, frame); break;
    case 'mist': case 'fog':    drawMist(r); break;
    case 'wind':                 drawWind(r, frame); break;
  }
}

function drawRain(r, frame, count = 18) {
  for (let i = 0; i < count; i++) {
    const seed = i * 83 + 29;
    const x = seed % PW;
    const y = ((frame * 4 + seed * 3) % (PH + 8)) - 4;
    r(x, y, 1, 4, '#3366aa');
    r((x - 1 + PW) % PW, y + 1, 1, 2, '#4477bb');
  }
}

function drawLightning(r, frame) {
  if (frame % 18 === 0) {
    r(0, 0, PW, PH, 'rgba(220,230,255,0.18)');
    const lx = (frame * 37) % (PW - 4);
    r(lx + 2, 0, 1, 14, '#ffffcc');
    r(lx, 8, 4, 1, '#ffffcc');
    r(lx + 1, 9, 2, 8, '#ffffcc');
  }
}

function drawSnow(r, frame) {
  for (let i = 0; i < 30; i++) {
    const seed = i * 61 + 11;
    const x = ((seed % PW) + Math.round(Math.sin(frame * 0.05 + i) * 2) + PW) % PW;
    const y = ((frame + seed * 2) % (PH + 4)) - 2;
    r(x, y, 1, 1, '#f0f8ff');
  }
}

function drawMist(r) {
  r(0, 20, PW, 4, 'rgba(200,220,230,0.4)');
  r(0, 28, PW, 3, 'rgba(200,220,230,0.25)');
}

function drawWind(r, frame) {
  for (let i = 0; i < 6; i++) {
    const seed = i * 53 + 7;
    const y = (seed % 20) + 2;
    const x = ((frame * 6 + seed * 4) % (PW + 20)) - 10;
    const len = 8 + (seed % 8);
    r(x, y, len, 1, 'rgba(180,200,220,0.5)');
  }
}

// ── TERRAIN SCENES ────────────────────────────────────────────────────────────

function scenePlains(r, frame) {
  // Sky — richer cornflower blue, horizon at 40% (y=18)
  r(0, 0, PW, 18, '#4a8ec8');
  const cd = Math.floor(frame / 10);
  cloud(r, (8  + cd) % (PW + 12) - 8, 3, 11);
  cloud(r, (48 + cd) % (PW + 12) - 8, 6, 9);
  cloud(r, (28 + cd) % (PW + 12) - 8, 2, 7);
  // Distant treeline at horizon
  r(0, 15, PW, 3, '#3a6a18');
  hill(r, 14, 18, 24, 6, '#4a7a20');
  hill(r, 56, 18, 28, 7, '#3d7018');
  // Ground (expanded — more ground visible with raised horizon)
  r(0, 18, PW, 14, '#5a8a2a');
  // Barn (base sitting on new horizon line)
  r(53, 9,  11, 9, '#8b2020'); // walls
  r(51, 7,  15, 3, '#5a1010'); // roof
  r(51, 5,  15, 3, '#6a1818'); // roof peak
  r(56, 14, 4,  4, '#2a0808'); // door
  r(58, 10, 2,  2, '#ffd080'); // window
  // Trees
  tree(r, 37, 8,  10, '#2d5a1b', '#5c4a2a');
  tree(r, 44, 10, 8,  '#3a6a20', '#5c4a2a');
  tree(r,  7, 9,  9,  '#2d5a1b', '#5c4a2a');
  // Road + foreground grass
  road(r, frame);
  r(0, 39, PW, 6, '#4a7a20');
  // Foreground texture
  for (let x = 2; x < PW; x += 9) r(x, 40, 4, 2, '#3a6a18');
}

function sceneDesert(r, frame) {
  // Hot sky
  r(0, 0,  PW, 14, '#dba96e');
  r(0, 14, PW, 10, '#e0a050');
  // Sun
  r(62, 3, 6, 6, '#ffd040');
  r(61, 4, 8, 4, '#ffd040');
  r(62, 2, 6, 1, '#ffe080');
  // Heat shimmer lines (subtle)
  if (frame % 3 === 0) r(0, 22, PW, 1, 'rgba(255,200,100,0.15)');
  // Sand dunes
  r(0, 24, PW, 8, '#c4873a');
  hill(r, 10, 24, 28, 7, '#b87030');
  hill(r, 50, 24, 32, 9, '#c4873a');
  hill(r, 72, 24, 18, 5, '#b07828');
  // Cacti
  cactus(r, 12, 13);
  cactus(r, 63, 11);
  cactus(r, 34, 15);
  // Skull / bones
  r(47, 26, 3, 2, '#e8e0c8'); // skull
  r(44, 27, 2, 1, '#e8e0c8'); // bone
  r(49, 27, 3, 1, '#e8e0c8'); // bone
  // Road (cracked dry earth)
  r(0, 32, PW, 7, '#8a6020');
  r(0, 32, PW, 1, '#aa8030');
  r(0, 38, PW, 1, '#aa8030');
  // Cracks in road
  r(10, 33, 1, 3, '#6a4810'); r(20, 35, 2, 2, '#6a4810');
  r(50, 33, 1, 4, '#6a4810'); r(65, 34, 2, 2, '#6a4810');
  // Sand foreground
  r(0, 39, PW, 6, '#c4873a');
}

function sceneMountain(r, frame) {
  // Alpine sky — horizon at 40%
  r(0, 0, PW, 18, '#6a8fb5');
  cloud(r, (6 + Math.floor(frame / 15)) % 80, 4, 10);
  cloud(r, (52 + Math.floor(frame / 15)) % 80, 2, 8);
  // Mountain peaks
  peak(r,  8, 28, 26, 28, '#4a5060', '#e8f0ff');
  peak(r, 38, 28, 32, 24, '#5a6270', '#f0f4ff');
  peak(r, 65, 28, 24, 20, '#4a5060', '#e8f0ff');
  // Pine tree line at base (raised to sit against peaks, not road)
  for (let x = 0; x < PW; x += 7) {
    if ((x + 3) % 14 > 0) pineTall(r, x, 12, '#1a3a10', '#3a2a10');
  }
  // Rocky ground
  r(0, 26, PW, 6, '#4a5060');
  // Rock outcroppings
  r(5,  28, 5, 3, '#3a4050'); r(25, 29, 4, 2, '#3a4050');
  r(55, 27, 6, 3, '#3a4050'); r(71, 28, 4, 3, '#3a4050');
  // Road (narrow rocky path)
  r(0, 32, PW, 7, '#5a4a30');
  r(0, 32, PW, 1, '#7a6040');
  r(0, 38, PW, 1, '#7a6040');
  const off = (frame * 2) % 12;
  for (let x = -off; x < PW + 12; x += 12) r(x, Y_ROAD + 3, 6, 2, '#7a6040');
  // Rocky foreground
  r(0, 39, PW, 6, '#4a5060');
  r(3,  40, 5, 3, '#3a4050'); r(70, 39, 7, 4, '#3a4050');
}

// mountain road helper
const Y_ROAD = 32;

function sceneForest(r, frame) {
  // Canopy — dark green sky filtered through trees
  r(0, 0, PW, 24, '#1e3a12');
  // Light shafts from canopy
  for (let i = 0; i < 6; i++) {
    const sx = 5 + i * 14 + Math.round(Math.sin(frame * 0.04 + i) * 2);
    r(sx, 0, 3, 20, 'rgba(180,220,100,0.12)');
  }
  // Canopy layer (sides)
  r(0, 0,  18, 16, '#2d5a1b');
  r(62, 0, 18, 16, '#2d5a1b');
  r(0, 8,  10, 12, '#1a3a0e');
  r(70, 8, 10, 12, '#1a3a0e');
  // Central canopy arch — closes the gap in the tree cover overhead
  r(16, 0, 48, 8,  '#243a14');
  r(20, 6, 40, 6,  '#2d5a1b');
  // Mid-ground trees
  pineTall(r,  3, 14, '#1a3a10', '#3a2a10');
  pineTall(r, 12, 16, '#243a14', '#3a2a10');
  pineTall(r, 58, 14, '#1a3a10', '#3a2a10');
  pineTall(r, 66, 16, '#243a14', '#3a2a10');
  // Undergrowth
  r(0, 28, PW, 4, '#1a2e0e');
  r(0, 26, 20, 2, '#243814'); r(60, 26, 20, 2, '#243814');
  // Ferns (small irregular green blobs)
  for (let x = 0; x < PW; x += 6) r(x, 28, 4, 2, '#2a4a14');
  // Forest floor
  r(0, 24, PW, 8, '#1a2e0e');
  // Path (narrow dirt trail)
  r(20, 32, 40, 7, '#3a2a10');
  r(20, 32, 40, 1, '#4a3818');
  r(20, 38, 40, 1, '#4a3818');
  // Mossy foreground
  r(0, 39, PW, 6, '#1a2e0e');
  r(0, 39, 18, 6, '#243814'); r(62, 39, 18, 6, '#243814');
}

function sceneCoastal(r, frame) {
  // Sky
  r(0, 0, PW, 18, '#3a8ac0');
  cloud(r, (10 + Math.floor(frame / 8)) % (PW + 10), 3, 12);
  cloud(r, (55 + Math.floor(frame / 8)) % (PW + 10), 5, 9);
  // Distant water horizon
  r(0, 18, PW, 2, '#2a6a9a');
  // Ocean (animated waves)
  r(0, 20, PW, 12, '#1a4a8a');
  const wo = frame % 10;
  for (let y = 22; y < 32; y += 4) {
    wave(r, wo, y, 18, '#1a6aaa', '#8ad0f0');
    wave(r, wo + 20, y + 2, 14, '#1a5a9a', '#70c0e8');
    wave(r, wo + 45, y, 20, '#1a6aaa', '#8ad0f0');
    wave(r, wo + 65, y + 2, 12, '#1a5a9a', '#70c0e8');
  }
  // Lighthouse on rocky coastal bluff (left side, above the tide line)
  r(4, 6,  4, 20, '#e8e8e0'); // tower
  r(3, 5,  6, 2,  '#cc3322'); // lamp housing
  r(2, 24, 8, 4,  '#8a7a60'); // rocky bluff base
  r(1, 27, 10, 2, '#6a5a48'); // bluff base shadow
  if (frame % 20 < 10) r(5, 7, 2, 1, '#ffff80'); // light flash
  // Sandy beach
  r(0, 32, PW, 3, '#c8aa70');
  r(0, 35, PW, 2, '#b89860');
  // Beach road
  r(0, 37, PW, 2, '#a08850');
  road(r, frame);
  r(0, 39, PW, 6, '#b89860');
}

function sceneUrban(r, frame) {
  // Smoggy sky
  r(0, 0, PW, 15, '#7a8090');
  r(0, 12, PW, 4, '#606878'); // smog layer near horizon
  // Buildings (varied heights)
  building(r, 0,  4, 10, 20, '#3a3f4a', '#1a2030', '#ffcc44');
  building(r, 11, 10, 8,  14, '#4a5060', '#2a3040', '#ffaa22');
  building(r, 20, 7,  12, 17, '#3a3f4a', '#1a2030', '#ffcc44');
  building(r, 33, 12, 7,  12, '#4a4a50', '#2a2a38', '#ff8844');
  building(r, 41, 5,  10, 19, '#3a3a40', '#1a1a28', '#ffcc44');
  building(r, 52, 9,  9,  15, '#4a5060', '#2a3040', '#ffcc44');
  building(r, 62, 6,  18, 18, '#3a3f4a', '#1a2030', '#ffaa22');
  // Power lines
  r(0, 16, PW, 1, '#1a1a20');
  for (let x = 5; x < PW; x += 15) r(x, 13, 1, 4, '#1a1a20');
  // Cracked road
  r(0, 32, PW, 7, '#2a2a2a');
  r(0, 32, PW, 1, '#3a3a3a');
  r(0, 38, PW, 1, '#3a3a3a');
  // Pavement cracks
  r(8,  33, 1, 4, '#1a1a1a'); r(22, 34, 2, 2, '#1a1a1a');
  r(40, 33, 1, 5, '#1a1a1a'); r(58, 34, 3, 1, '#1a1a1a');
  // Yellow center line (dashed)
  const off = (frame * 2) % 12;
  for (let x = -off; x < PW + 12; x += 12) r(x, 35, 8, 2, '#c8a020');
  // Sidewalk
  r(0, 39, PW, 6, '#3a3a3a');
}

function sceneWetland(r, frame) {
  // Murky sky
  r(0, 0, PW, 20, '#4a5848');
  r(0, 17, PW, 5, '#3a4838'); // fog at horizon
  // Mist wisps
  r(0, 18, PW, 3, 'rgba(160,180,140,0.3)');
  // Dark swamp water
  r(0, 22, PW, 10, '#2a3a28');
  r(0, 22, PW, 2, '#3a4a38'); // water surface sheen
  // Water ripples (animated)
  const rw = frame % 12;
  for (let x = rw; x < PW; x += 18) r(x, 23, 8, 1, 'rgba(80,120,70,0.4)');
  // Cattails
  function cattail(cx, h) {
    r(cx, 13, 1, h, '#6a5a2a');     // stalk
    r(cx - 1, 13, 3, 4, '#5a3a18'); // head
  }
  cattail(8, 10); cattail(14, 12); cattail(22, 9);
  cattail(58, 11); cattail(65, 10); cattail(72, 13);
  // Cypress tree silhouettes
  r(30, 8, 4, 14, '#2a3a20');
  r(28, 6, 8, 4, '#2a3a20');
  r(45, 10, 4, 12, '#2a3a20');
  r(43, 8, 8, 4, '#2a3a20');
  // Muddy path
  r(0, 32, PW, 7, '#3a2a15');
  r(0, 32, PW, 1, '#4a3a25');
  r(0, 38, PW, 1, '#4a3a25');
  // Mud puddles on path
  r(15, 33, 6, 3, '#2a1a0a'); r(50, 34, 8, 2, '#2a1a0a');
  // Dashes
  const off = (frame * 2) % 12;
  for (let x = -off; x < PW + 12; x += 12) r(x, 35, 8, 2, '#5a4a28');
  // Foreground mud
  r(0, 39, PW, 6, '#2a2a18');
}

function sceneHills(r, frame) {
  // Sky — deeper summer blue, horizon at 40% (y=18)
  r(0, 0, PW, 18, '#5aaad0');
  const cd = Math.floor(frame / 12);
  cloud(r, (4  + cd) % (PW + 14) - 8, 4, 13);
  cloud(r, (50 + cd) % (PW + 14) - 8, 2, 10);
  // Rolling hills (layered for depth — raised with horizon)
  r(0, 14, PW, 4, '#6aaa30');   // farthest band near horizon
  hill(r,  5, 18, 30, 8, '#5a9a20');
  hill(r, 40, 18, 28, 9, '#6aaa30');
  hill(r, 68, 18, 24, 7, '#5a9a20');
  r(0, 18, PW, 14, '#5a9a28');  // mid ground
  hill(r, 20, 28, 22, 8, '#4a8a18');
  hill(r, 60, 28, 26, 9, '#5a9a28');
  // Wildflowers (adjusted positions)
  const flowers = [[8,20,'#ff6688'],[15,21,'#ffee44'],[28,19,'#ff6688'],
                   [45,20,'#cc44ff'],[52,22,'#ffee44'],[70,19,'#ff6688']];
  flowers.forEach(([x, y, c]) => r(x, y, 2, 2, c));
  // Birds
  if (frame % 4 < 2) { r(20, 5, 2, 1, '#1a2a3a'); r(23, 5, 2, 1, '#1a2a3a'); }
  // Road
  road(r, frame);
  r(0, 39, PW, 6, '#4a8a18');
  // Foreground wildflower texture
  for (let x = 4; x < PW; x += 11) r(x, 40, 2, 2, '#ff8899');
}

function sceneValley(r, frame) {
  // Sky above valley
  r(0, 0, PW, 18, '#4a88b8');
  cloud(r, (12 + Math.floor(frame / 10)) % (PW + 12), 3, 10);
  // Valley walls (cliff faces left and right)
  r(0,  0, 20, 38, '#4a5068');  // left cliff
  r(60, 0, 20, 38, '#4a5068');  // right cliff
  r(0,  0, 18, 38, '#5a6078');  // left lighter face
  r(62, 0, 18, 38, '#5a6078');  // right lighter face
  // Cliff detail stripes
  for (let y = 4; y < 36; y += 5) {
    r(0, y, 18, 1, '#4a5068'); r(62, y, 18, 1, '#4a5068');
  }
  // Valley floor (lush)
  r(18, 20, 44, 12, '#3a7020');
  // Stream / river through valley
  r(32, 20, 16, 8, '#2060a0');
  r(32, 20, 16, 1, '#60a8d8'); // surface glint
  const sw = (frame * 2) % 8;
  r(32 + sw, 22, 4, 1, 'rgba(100,180,230,0.5)');
  // Lush valley vegetation
  tree(r, 20, 18, 8, '#2a5818', '#5c4a2a');
  tree(r, 28, 20, 7, '#3a6820', '#5c4a2a');
  tree(r, 51, 18, 9, '#2a5818', '#5c4a2a');
  tree(r, 57, 20, 7, '#3a6820', '#5c4a2a');
  // Road through valley
  road(r, frame);
  r(0, 39, PW, 6, '#3a7020');
}

// ── EVENT SCENES ─────────────────────────────────────────────────────────────

function eventWildfire(r, frame) {
  const flicker = frame % 3;
  r(0, 0, PW, 24, '#cc4400');
  r(0, 14, PW, 10, '#882200');
  // Smoke
  for (let i = 0; i < 8; i++) {
    const sx = 5 + i * 10 + (flicker === i % 3 ? 1 : 0);
    r(sx, 0, 6, 8, 'rgba(30,20,10,0.6)');
    r(sx + 1, 4, 4, 6, 'rgba(50,30,10,0.5)');
  }
  // Burning trees (silhouettes + fire)
  r(8,  14, 4, 10, '#2a1000'); tree(r, 6, 8, 10, '#cc4400', '#aa2200');
  r(28, 16, 4, 8,  '#2a1000'); tree(r, 26, 10, 10, '#dd5500', '#bb3300');
  r(55, 12, 4, 12, '#2a1000'); tree(r, 53, 6, 12, '#cc4400', '#aa2200');
  // Fire at base — flickering blocks
  const ff = [
    ['#ff6600','#ff4400','#ff8800'],
    ['#ff4400','#ff8800','#ff6600'],
    ['#ff8800','#ff6600','#ff4400'],
  ];
  [[4,22],[10,22],[22,21],[30,21],[50,22],[57,21]].forEach(([x, y], i) => {
    r(x, y, 5, 3, ff[flicker][i % 3]);
  });
  r(0, 25, PW, 7, '#5a1800');   // scorched ground
  r(0, 32, PW, 7, '#3a1000');   // road
  r(0, 39, PW, 6, '#4a1500');
}

function eventFlood(r, frame) {
  r(0, 0, PW, 20, '#1a4a8a');
  // Heavy rain
  drawRain(r, frame, 35);
  // Dark clouds
  r(0, 0,  PW, 8,  '#0a1a3a');
  r(0, 5,  30, 10, '#0e2250');
  r(35, 3, 28, 11, '#0a1a3a');
  r(65, 6, 15, 9,  '#0e2250');
  // Flood water rising (fills lower portion)
  r(0, 22, PW, 23, '#1a3a7a');
  r(0, 22, PW, 2,  '#2a5aaa');  // water surface
  // Submerged objects (barely visible)
  r(10, 26, 8, 4, '#0a1a3a');   // submerged car
  r(40, 24, 5, 2, '#0a2050');   // sign post
  // Animated wave crests
  const wf = frame % 8;
  for (let x = wf; x < PW; x += 16) r(x, 23, 10, 1, '#5090d0');
  // Debris
  r((frame * 2) % PW, 24, 3, 1, '#3a2a10');
  r((frame * 3 + 20) % PW, 25, 2, 1, '#2a2a10');
}

function eventHurricane(r, frame) {
  r(0, 0, PW, PH, '#1a1e2a');
  // Storm clouds
  r(0, 0,  PW, 14, '#0e1220');
  r(0, 10, PW, 6,  '#1a1830');
  // Heavy diagonal rain
  for (let i = 0; i < 40; i++) {
    const seed = i * 71 + 13;
    const x = ((seed % PW) + (frame * 6)) % (PW + 10) - 10;
    const y = (seed % PH);
    r(x, y, 1, 3, '#2a3a5a');
    r(x - 1, y + 1, 1, 2, '#3a4a6a');
  }
  // Debris (scattered)
  r((frame * 3) % PW,          12, 2, 1, '#5a4a3a');
  r((frame * 2 + 15) % PW,     20, 3, 1, '#4a3a2a');
  r((frame * 4 + 30) % PW,     8,  2, 2, '#3a3a2a');
  r((frame * 3 + 50) % PW,     28, 2, 1, '#4a3a2a');
  // Dark ground
  r(0, 32, PW, 7, '#1a1410');
  r(0, 39, PW, 6, '#141010');
  drawLightning(r, frame);
}

function eventHeat(r, frame) {
  // Bleached sky
  r(0, 0, PW, 18, '#e8c040');
  r(0, 15, PW, 9, '#d8a030');
  // Sun (massive, glaring)
  r(55, 2, 10, 10, '#fff080');
  r(53, 4, 14, 6,  '#fff080');
  r(56, 1, 8, 1,   '#ffffff');
  // Shimmer lines (horizontal)
  if (frame % 4 === 0) r(0, 20, PW, 1, 'rgba(255,220,100,0.25)');
  if (frame % 4 === 2) r(0, 24, PW, 1, 'rgba(255,220,100,0.2)');
  // Parched earth
  r(0, 24, PW, 8, '#8a5a18');
  // Cracks
  r(5, 25, 1, 5, '#5a3808'); r(18, 26, 2, 4, '#5a3808');
  r(40, 24, 1, 6, '#5a3808'); r(60, 25, 2, 3, '#5a3808'); r(72, 26, 1, 4, '#5a3808');
  // Dead trees
  r(12, 14, 2, 10, '#5a3808');
  r(10, 14, 6, 2, '#5a3808'); r(12, 12, 2, 3, '#5a3808');
  r(60, 16, 2, 8, '#5a3808');
  r(58, 16, 6, 2, '#5a3808');
  // Road
  r(0, 32, PW, 7, '#7a5010');
  r(0, 32, PW, 1, '#9a6a20');
  r(0, 38, PW, 1, '#9a6a20');
  r(0, 39, PW, 6, '#7a5010');
}

function eventTornado(r, frame) {
  // Dark sky
  r(0, 0, PW, PH, '#1e1e28');
  r(0, 0, PW, 12, '#141428');
  // Heavy clouds
  r(0, 0,  40, 10, '#0e0e1a');
  r(35, 0, 30, 8,  '#12121e');
  r(62, 0, 18, 12, '#0e0e1a');
  // Tornado funnel (tapers from cloud to ground)
  const tx = 38 + Math.round(Math.sin(frame * 0.08) * 4);
  for (let y = 8; y < 32; y++) {
    const progress = (y - 8) / 24;
    const hw = Math.round(10 * (1 - progress) + 2 * progress);
    r(tx - hw, y, hw * 2, 1, `rgba(80,80,120,${0.7 + progress * 0.2})`);
  }
  // Debris orbit
  const angle = frame * 0.15;
  for (let i = 0; i < 6; i++) {
    const a = angle + (i * Math.PI * 2) / 6;
    const r2 = 12 + Math.round(Math.sin(i + frame * 0.03) * 4);
    const dby = 24;
    const dx = Math.round(tx + Math.cos(a) * r2);
    const dy = Math.round(dby + Math.sin(a) * 4);
    if (dx >= 0 && dx < PW && dy >= 0 && dy < PH) r(dx, dy, 2, 1, '#5a4a3a');
  }
  r(0, 32, PW, 13, '#141020');
}

function eventPositive(r, frame) {
  // Bright hopeful sky
  r(0, 0, PW, 22, '#5ab060');
  r(0, 18, PW, 6, '#4a9a50');
  const cd = Math.floor(frame / 8);
  cloud(r, (5  + cd) % (PW + 10), 3, 12);
  cloud(r, (48 + cd) % (PW + 10), 5, 10);
  cloud(r, (28 + cd) % (PW + 10), 1, 8);
  // Warm sun
  r(6, 3, 7, 7, '#ffd840');
  r(4, 5, 11, 3, '#ffd840');
  // Settlement / buildings (friendly)
  building(r, 48, 12, 10, 12, '#c8a060', '#8a6020', '#ffe080');
  r(53, 20, 3, 4, '#7a4010'); // door
  // Garden / green area
  r(18, 22, 28, 10, '#4a9a30');
  // Flowers
  [[20,22,'#ff6688'],[25,23,'#ffee44'],[30,22,'#cc88ff'],[35,23,'#ff6688'],[40,22,'#ffee44']].forEach(
    ([x,y,c]) => { r(x, y, 2, 2, c); r(x+1, y-1, 1, 1, '#ffff88'); }
  );
  // Friendly figure (simple silhouette, waving)
  r(60, 18, 2, 4, '#5a3a18'); // body
  r(60, 16, 2, 2, '#e8a870'); // head
  if (frame % 8 < 4) r(62, 17, 3, 1, '#5a3a18'); // arm wave up
  else               r(62, 19, 3, 1, '#5a3a18');  // arm wave down
  // Ground
  r(0, 24, PW, 8, '#4a9a30');
  road(r, frame);
  r(0, 39, PW, 6, '#3a8a20');
}

function eventInfrastructure(r, frame) {
  r(0, 0, PW, 22, '#606870');
  r(0, 18, PW, 6, '#505860');
  // Broken power lines
  r(0, 10, 30, 1, '#1a1a1a'); r(30, 10, 1, 6, '#1a1a1a'); // snapped line
  r(31, 16, 20, 1, '#1a1a1a'); // sagging
  r(51, 10, PW-51, 1, '#1a1a1a');
  for (let x = 5; x < PW; x += 18) r(x, 7, 1, 4, '#1a1a1a'); // poles
  // Construction zone
  r(20, 22, 40, 12, '#4a4a4a');
  // Orange cones
  [[22,30,'#ff6600'],[30,28,'#ff6600'],[38,30,'#ff6600'],[50,29,'#ff6600']].forEach(
    ([x,y,c]) => { r(x,y,2,3,c); r(x-1,y+2,4,1,c); }
  );
  // Excavation / hole
  r(32, 26, 14, 8, '#1a1010');
  r(32, 26, 14, 1, '#3a2010');
  // Warning tape
  const tw = (frame * 3) % 14;
  for (let x = 0; x < PW; x += 14) {
    r(x + tw, 25, 7, 1, '#ffcc00');
    r(x + tw + 7, 25, 7, 1, '#111111');
  }
  r(0, 32, PW, 7, '#2a2a2a');
  r(0, 39, PW, 6, '#2a2a2a');
}

function eventHealth(r, frame) {
  r(0, 0, PW, 20, '#4a1a20');
  r(0, 17, PW, 5, '#3a1018');
  // Hospital / medical building
  r(20, 5, 40, 27, '#d0ccc8');
  r(20, 5, 40, 3, '#b0aca8');   // roof
  // Red cross
  r(36, 12, 8, 2, '#cc1111');
  r(39, 9, 2, 8, '#cc1111');
  // Windows
  building(r, 22, 9, 8, 10, '#d0ccc8', '#b0aca8', '#80b0e8');
  building(r, 50, 9, 8, 10, '#d0ccc8', '#b0aca8', '#80b0e8');
  // Ambulance
  r(5, 24, 14, 6, '#e8e8e8');   // body
  r(6, 22, 8, 3, '#e8e8e8');    // cab
  r(7, 23, 6, 2, '#6088c8');    // windshield
  r(16, 25, 2, 1, '#cc2222');   // lights
  if (frame % 6 < 3) r(16, 25, 2, 1, '#ff4444');
  r(6, 30, 3, 2, '#111');
  r(13, 30, 3, 2, '#111');
  r(10, 25, 3, 2, '#cc1111');   // cross on side
  r(11, 24, 1, 4, '#cc1111');
  // Ground
  r(0, 32, PW, 7, '#2a2030');
  r(0, 39, PW, 6, '#1a1020');
}

function eventMechanical(r, frame) {
  r(0, 0, PW, 22, '#6a7080');
  r(0, 18, PW, 6, '#585f68');
  // Broken-down vehicle (larger, stationary, hood up)
  const vx = 22, vy = 22;
  r(vx,     vy + 4, 26, 5, '#2a5aa0');  // body
  r(vx + 2, vy,     16, 5, '#1e3d72');  // cab
  r(vx + 3, vy + 1, 6, 3, '#90c8e8');  // windows
  r(vx + 10, vy + 1, 5, 3, '#90c8e8');
  // Hood open
  r(vx + 18, vy - 2, 8, 2, '#2a5aa0');
  r(vx + 18, vy - 3, 8, 1, '#1e3d72');
  // Steam from engine
  if (frame % 4 < 2) r(vx + 20, vy - 5, 4, 4, 'rgba(200,200,200,0.6)');
  else               r(vx + 19, vy - 6, 6, 5, 'rgba(200,200,200,0.5)');
  // Wheels
  r(vx + 1, vy + 9, 5, 3, '#111');
  r(vx + 20, vy + 9, 5, 3, '#111');
  r(vx + 2, vy + 9, 3, 1, '#777');
  r(vx + 21, vy + 9, 3, 1, '#777');
  // Tool / spare tire on ground
  r(vx - 5, vy + 8, 4, 4, '#555');   // spare tire
  r(vx - 4, vy + 9, 2, 2, '#888');
  r(vx + 28, vy + 10, 3, 1, '#8a7a5a'); // wrench
  r(vx + 29, vy + 11, 1, 3, '#8a7a5a');
  // Road
  r(0, 32, PW, 7, '#7a5a18');
  r(0, 39, PW, 6, '#5a4a20');
}

function eventSocial(r, frame) {
  r(0, 0, PW, 22, '#7a6a40');
  r(0, 18, PW, 6, '#6a5a30');
  // Checkpoint gate / barrier
  r(20, 10, 2, 22, '#5a5a5a');  // pole left
  r(58, 10, 2, 22, '#5a5a5a');  // pole right
  // Striped barrier bar
  for (let x = 20; x < 60; x += 6) {
    r(x, 14, 3, 3, '#cc2200');
    r(x + 3, 14, 3, 3, '#ffffff');
  }
  // Guard hut
  r(60, 15, 10, 15, '#8a7a5a');
  r(60, 13, 10, 3, '#5a4a2a');
  r(63, 20, 3, 10, '#4a3a1a');  // door
  r(65, 16, 3, 3, '#90c8e8');  // window
  // Crowd silhouettes (people waiting)
  [[4,26],[8,24],[12,26],[16,24],[4,30],[8,28]].forEach(([x,y]) => {
    r(x,   y,   2, 4, '#3a3020'); // body
    r(x,   y-2, 2, 2, '#c89060'); // head
  });
  // Sign
  r(28, 8, 12, 5, '#c8a060');
  r(29, 9, 10, 3, '#f0e0a0');
  r(33, 6, 2, 3, '#8a6a30');
  // Road
  r(0, 32, PW, 7, '#7a5a18');
  r(0, 39, PW, 6, '#5a4a20');
}

// ── BORDER FRAME ─────────────────────────────────────────────────────────────

function drawBorder(r) {
  r(0,      0,      PW, 1,  '#000000');   // top edge
  r(0,      PH - 1, PW, 1,  '#000000');   // bottom edge
  r(0,      0,      1,  PH, '#000000');   // left edge
  r(PW - 1, 0,      1,  PH, '#000000');   // right edge
}

// ── SCENE REGISTRY & DISPATCH ─────────────────────────────────────────────────

const TERRAIN_SCENES = {
  plains:   scenePlains,
  desert:   sceneDesert,
  mountain: sceneMountain,
  forest:   sceneForest,
  coastal:  sceneCoastal,
  urban:    sceneUrban,
  wetland:  sceneWetland,
  hills:    sceneHills,
  valley:   sceneValley,
};

const EVENT_SCENES = {
  wildfire:       eventWildfire,
  flood:          eventFlood,
  hurricane:      eventHurricane,
  heat:           eventHeat,
  tornado:        eventTornado,
  positive:       eventPositive,
  infrastructure: eventInfrastructure,
  health:         eventHealth,
  mechanical:     eventMechanical,
  social:         eventSocial,
};

export function drawTerrainScene(r, terrain, frame) {
  const fn = TERRAIN_SCENES[terrain] || TERRAIN_SCENES.plains;
  fn(r, frame);
  drawBorder(r);
}

export function drawEventScene(r, perilType, frame) {
  const fn = EVENT_SCENES[perilType] || EVENT_SCENES.positive;
  fn(r, frame);
  drawBorder(r);
}
