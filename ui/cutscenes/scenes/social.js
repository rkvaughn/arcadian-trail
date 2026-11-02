/**
 * Social — people on the road.
 *
 *   refugee_camp (default)  dusk over a sprawling tent camp: campfires with
 *                           smoke and sparks, strung festoon lights, a queue
 *                           of people with bundles. Intro: the camera pans
 *                           across the camp until the family's car slides in.
 *   armored_caravan         armored trucks with flapping pennants roll past in
 *                           a dust storm of their own making.
 *   human_bottleneck        a gridlocked road and a crowd on foot funnelling
 *                           toward a checkpoint boom; a searchlight sweeps.
 *   bandits                 night roadblock: burning barrels, tire piles, a
 *                           wreck, silhouetted figures caught in headlights.
 *
 * Also exports small helpers (strangers, glows, tents) reused by the health and
 * positive scenes.
 */

import {
  W, H, R, rng, ease, easeOut, clamp, lerp, ditherBands, ditherFill, ridge, strip, drawWrap,
  drawPuff, flameWall, stepParticles, draw, silhouette, disc, sprite, painted, makeCanvas, bayer, text,
} from '../kit.js';
import { INK, carSprite, wheelSprites, drawCar, familySprites, drawFamily, pineSprite, deadTreeSprite, poleSprite } from '../sprites.js';

// ── Shared helpers (also used by health.js / positive.js) ─────────────────────

const HEAD = ['..HHH..', '.HHHHH.', '.HSSSE.', '.HSSSS.', '..SSS..'];
const BODY = ['.CCCCC.', 'CCCCCCC', 'CCCCCCC', 'SCCCCCS', '.CCCCC.'];
const WAVE_TOP = ['..HHH..', '.HHHHH.', '.HSSSES', '.HSSSSC', '..SSS.C'];
const WAVE_BODY = ['.CCCCCC', 'CCCCCC.', 'CCCCCC.', 'SCCCCC.', '.CCCCC.'];
const L_IDLE = ['.PPPPP.', '.PP.PP.', '.PP.PP.', '.PP.PP.', '.KK.KK.'];
const L_WALK_A = ['.PPPPP.', '.PP.PP.', 'PP...PP', 'PP...PP', 'KK...KK'];
const L_WALK_B = ['.PPPPP.', '..PPP..', '..PP...', '..PP...', '..KKK..'];
const HAZMAT_HEAD = ['..YYY..', '.YYYYY.', '.YVVVv.', '.YVVVV.', '..YYY..'];

const STRANGER_LOOKS = [
  { H: '#2a1a10', S: '#c68642', C: '#7a5a8a', P: '#3a3a44', K: '#1e1618' },
  { H: '#5a3a1a', S: '#f1c27d', C: '#4a7a8a', P: '#4a3a2a', K: '#1e1618' },
  { H: '#1a1210', S: '#8d5524', C: '#a85a3a', P: '#2a3a4a', K: '#1e1618' },
  { H: '#8a8a8a', S: '#e0ac69', C: '#6a7a4a', P: '#3a3046', K: '#1e1618' },
  { H: '#d8b060', S: '#ffdbac', C: '#8a4a5a', P: '#2a4a3a', K: '#1e1618' },
  { H: '#3a2614', S: '#a0673a', C: '#c89a4a', P: '#3a3a3a', K: '#1e1618' },
];

/**
 * Person frame set for a non-family character. kind: 'plain' | 'hazmat' |
 * 'medic'. Returns { idle, walk:[a,b], wave, h }.
 */
export function strangerSprites(i = 0, kind = 'plain', override = {}) {
  const pal = { ...STRANGER_LOOKS[i % STRANGER_LOOKS.length], E: '#1a1018', ...override };
  let head = HEAD, waveTop = WAVE_TOP;
  if (kind === 'hazmat') {
    Object.assign(pal, { Y: '#e8c830', V: '#2a3a5a', v: '#8ab0d8', C: '#e8c830', P: '#d0b028', S: '#3a3a3a', K: '#2a2a2a' });
    head = HAZMAT_HEAD; waveTop = HAZMAT_HEAD;
  }
  if (kind === 'medic') Object.assign(pal, { C: '#f0f0f0', P: '#5a8ab0', X: '#d82020' });
  const body = kind === 'medic' ? ['.CCCCC.', 'CCCXCCC', 'CCXXXCC', 'SCCXCCS', '.CCCCC.'] : BODY;
  const o = { outline: INK };
  return {
    h: 15,
    idle: sprite([...head, ...body, ...L_IDLE], pal, o),
    walk: [sprite([...head, ...body, ...L_WALK_A], pal, o), sprite([...head, ...body, ...L_WALK_B], pal, o)],
    wave: sprite([...waveTop, ...(kind === 'medic' ? body : WAVE_BODY), ...L_IDLE], pal, o),
  };
}

/** Draw one stranger with feet at groundY. mode 'idle' | 'walk' | 'wave'. */
export function drawStranger(g, s, x, groundY, mode, t, flip = false, sil = null, rim = null) {
  let spr = s.idle;
  if (mode === 'walk') spr = s.walk[Math.floor(t * 6) % 2];
  if (mode === 'wave') spr = Math.floor(t * 3) % 2 ? s.wave : s.idle;
  const y = groundY - s.h;
  if (rim) draw(g, silhouette(spr, rim), x, y - 1, flip);
  draw(g, sil ? silhouette(spr, sil) : spr, x, y, flip);
}

const glowCache = new Map();
/**
 * Light pool: three stepped elliptical bands (NES-style posterised glow), each
 * a flat translucent fill. `dens` scales overall strength.
 */
export function glowSprite(r, color, dens = 0.7, squash = 1) {
  const key = r + color + dens + squash;
  if (glowCache.has(key)) return glowCache.get(key);
  const h = Math.max(1, Math.round(r * squash));
  const [c, g] = makeCanvas(r * 2 + 1, h * 2 + 1);
  const img = g.createImageData(c.width, c.height);
  const [cr, cg, cb] = rgbaHex(color);
  const alphas = [0, 0.16, 0.28, 0.42].map(a => Math.round(a * dens * 1.6 * 255));
  for (let y = -h; y <= h; y++) {
    for (let x = -r; x <= r; x++) {
      const d = Math.sqrt((x / r) ** 2 + (y / h) ** 2);
      const band = d < 0.38 ? 3 : d < 0.68 ? 2 : d <= 1 ? 1 : 0;
      if (!band) continue;
      const k = ((y + h) * c.width + (x + r)) * 4;
      img.data[k] = cr; img.data[k + 1] = cg; img.data[k + 2] = cb; img.data[k + 3] = Math.min(255, alphas[band]);
    }
  }
  g.putImageData(img, 0, 0);
  glowCache.set(key, c);
  return c;
}

function rgbaHex(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function drawGlow(g, x, y, gl) {
  g.drawImage(gl, Math.round(x - gl.width / 2), Math.round(y - gl.height / 2));
}

/** Simple A-frame tent; `lit` gives a warm door slit. */
export function tentSprite(w, h, col, dark, lit = false) {
  return painted(w, h, (g) => {
    for (let y = 0; y < h; y++) {
      const half = Math.max(1, Math.round(((y + 1) / h) * (w / 2)));
      R(g, w / 2 - half, y, half, 1, col);
      R(g, w / 2, y, half, 1, dark);
    }
    const dh = Math.round(h * 0.55);
    for (let y = 0; y < dh; y++) {
      const half = Math.max(0, Math.round(((y + 1) / dh) * (w * 0.14)));
      R(g, w / 2 - half, h - dh + y, half * 2 + 1, 1, lit ? (y > dh * 0.4 ? '#ffd070' : '#e89a40') : '#1a1418');
    }
    R(g, w / 2, 0, 1, 1, '#d8d0c0');
  }, INK);
}

/** A small campfire: logs, flames, base glow handled by caller. */
export function campfire(g, x, y, t, seed = 0, size = 1) {
  R(g, x - 5, y - 1, 10, 2, '#4a2a18');
  R(g, x - 4, y - 2, 3, 1, '#6a3a1e'); R(g, x + 2, y - 2, 3, 1, '#6a3a1e');
  flameWall(g, x - 4, x + 5, y - 1, 9 * size, t, 1, seed);
}

// ── Scene ─────────────────────────────────────────────────────────────────────

const GROUND_Y = 136;
const ROAD_Y = 146;

export function socialScene(env) {
  const id = env.eventId;
  const mode = id === 'armored_caravan' ? 'caravan' : id === 'human_bottleneck' ? 'bottleneck'
    : id === 'bandits' ? 'bandits' : 'camp';
  if (mode === 'caravan') return caravanScene(env);
  if (mode === 'bottleneck') return bottleneckScene(env);
  if (mode === 'bandits') return banditsScene(env);
  return campScene(env);
}

// Starfield strip shared by night scenes (exported for health / positive)
export function starStrip(w, h, seed, dens = 70) {
  return strip(w, h, (g) => {
    const r = rng(seed);
    for (let i = 0; i < dens; i++) {
      const x = r.int(0, w - 1), y = r.int(0, h - 1);
      R(g, x, y, 1, 1, r() < 0.2 ? '#ffffff' : '#9aa0c8');
    }
  });
}

/** Crescent moon: lit disc minus an offset disc (transparent cut, any sky). */
export function crescent(g, cx, cy, rad, col, hi, cut = 0.45) {
  for (let y = -rad; y <= rad; y++) {
    for (let x = -rad; x <= rad; x++) {
      if (x * x + y * y > rad * rad) continue;
      const ox = x - rad * cut, oy = y + rad * 0.2;
      if (ox * ox + oy * oy < rad * rad * 0.85) continue;
      R(g, cx + x, cy + y, 1, 1, x < -rad * 0.5 ? hi : col);
    }
  }
}

export function twinkles(seed, n, ymax) {
  const r = rng(seed);
  return Array.from({ length: n }, () => ({ x: r.int(2, W - 2), y: r.int(2, ymax), p: r.range(0, 6) }));
}

export function drawTwinkles(g, list, t, c = '#ffffff') {
  for (const s of list) {
    const k = Math.sin(t * 2.2 + s.p);
    if (k > 0.3) { R(g, s.x, s.y, 1, 1, c); if (k > 0.85) { R(g, s.x - 1, s.y, 3, 1, c); R(g, s.x, s.y - 1, 1, 3, c); } }
  }
}

export function roadStrip(top, base, edge, dash, verge, tuft, seed, topY = GROUND_Y) {
  return strip(W, H - topY, (g, w, h) => {
    R(g, 0, 0, w, h, verge);
    const r = rng(seed);
    for (let i = 0; i < 90; i++) {
      const x = r.int(0, w), y = r.int(0, h);
      R(g, x, y, 1, 1, tuft);
    }
    const ry = ROAD_Y - topY;
    R(g, 0, ry, w, 22, base);
    ditherFill(g, 0, ry, w, 22, top, 0.25);
    R(g, 0, ry, w, 1, edge);
    R(g, 0, ry + 21, w, 1, edge);
    if (dash) for (let x = 6; x < w; x += 24) R(g, x, ry + 10, 12, 2, dash);
    for (let i = 0; i < 60; i++) {
      const x = r.int(0, w), y = r.int(ry + 24, h - 2);
      R(g, x, y, 1, 2, tuft); R(g, x - 1, y - 1, 1, 1, tuft); R(g, x + 1, y - 1, 1, 1, tuft);
    }
  });
}

// ── Refugee camp ──────────────────────────────────────────────────────────────

function campScene(env) {
  const r = rng(404);
  const sky = strip(W, 120, (g) => ditherBands(g, 0, 0, W, 120,
    ['#140c2a', '#2e1648', '#5a2252', '#94384a', '#d06440', '#f4a050']));
  const stars = starStrip(W, 40, 12, 40);
  const far = strip(480, 60, (g, w, h) => ridge(g, w, h, { amp: 22, base: 56, seed: 9, color: '#2a1636', hi: '#6a3456', jag: 0.2 }));
  const treeSil = silhouette(pineSprite(), '#1a0e22');
  const trees = strip(560, 40, (g, w, h) => {
    const tops = ridge(g, w, h, { amp: 6, base: 36, seed: 4, color: '#20122a', hi: '#4a2a44' });
    const tr = rng(8);
    for (let x = 0; x < w; x += tr.int(9, 20)) draw(g, treeSil, x, tops[Math.min(w - 1, x + 5)] - 16);
  });

  // Camp layer (560 wide, panned across): tents, fires, a supply tent, poles
  const CAMP_W = 560;
  const tentCols = [['#5a7aa0', '#3a5478'], ['#c87a3a', '#8a5024'], ['#8a8a7a', '#5a5a50'],
    ['#5a8a5a', '#3a5a3a'], ['#a85a5a', '#6a3a3a'], ['#c8b890', '#8a7a5a']];
  const fires = [];
  const poles = [];
  const camp = strip(CAMP_W, 60, (g) => {
    const tr = rng(77);
    // back row (small), front row (bigger)
    for (const [row, y, sz] of [[0, 34, 0.7], [1, 46, 1]]) {
      for (let x = tr.int(0, 10); x < CAMP_W - 20; x += tr.int(22, 34) * sz) {
        const [c, d] = tr.pick(tentCols);
        const w = Math.round(tr.int(16, 24) * sz), h = Math.round(tr.int(10, 14) * sz);
        draw(g, tentSprite(w, h, c, d, tr() < 0.4), x, y - h);
        if (row === 1 && tr() < 0.18) fires.push({ x: x + w + 6, y: y + 6 });
      }
    }
    // Big supply tent with a red banner
    const big = tentSprite(46, 26, '#e0d8c8', '#a8a090', true);
    draw(g, big, 400, 52 - 26);
    R(g, 412, 34, 22, 6, '#c83030'); text(g, 'AID', 423, 34, { align: 'center', color: '#fff' });
    for (let x = 20; x < CAMP_W; x += 90) { R(g, x, 10, 1, 44, '#3a2a2a'); poles.push(x); }
  });
  if (!fires.length) fires.push({ x: 120, y: 52 });
  fires.push({ x: 300, y: 54 }, { x: 470, y: 56 });

  // Strung lights between poles: catenary bulbs (camp coordinates)
  const bulbs = [];
  const bulbCols = ['#ffd060', '#ff7a6a', '#7ad0ff', '#a8f070'];
  for (let i = 0; i < poles.length - 1; i++) {
    const a = poles[i], b = poles[i + 1];
    for (let x = a + 4; x < b; x += 6) {
      const u = (x - a) / (b - a);
      bulbs.push({ x, y: 11 + Math.round(Math.sin(u * Math.PI) * 9), c: bulbCols[bulbs.length % 4], p: r.range(0, 6) });
    }
  }

  const ground = roadStrip('#3a2a30', '#2a2026', '#5a4a4a', null, '#2a1e24', '#3a2a2e', 31, 124);
  const fireGlow = glowSprite(14, '#e88a3a', 0.45, 0.5);
  const bulbGlow = glowSprite(3, '#ffe0a0', 0.6);
  const car = carSprite('blue');
  const wheels = wheelSprites();
  const fam = familySprites(env.family);
  const queue = Array.from({ length: 7 }, (_, i) => ({ s: strangerSprites(i), off: i * 13, bundle: i % 2 === 0 }));
  const bundle = sprite(['.bbb.', 'bBBBb', 'bBBBb', '.bbb.'], { B: '#a8885a', b: '#7a5a3a' }, { outline: INK });
  const tw = twinkles(5, 14, 36);

  const smoke = [], sparks = [];
  let smokeT = 0, sparkT = 0;

  return {
    update(dt, t) {
      smokeT += dt * 5; sparkT += dt * 14;
      while (smokeT > 1) { smokeT--; const f = r.pick(fires); smoke.push({ x: f.x + r.range(-2, 2), y: f.y - 6, vx: r.range(2, 6), vy: -r.range(6, 10), life: r.range(3, 5), r0: r.range(1, 3) }); }
      while (sparkT > 1) { sparkT--; const f = r.pick(fires); sparks.push({ x: f.x + r.range(-3, 3), y: f.y - 4, vx: r.range(-6, 6), vy: -r.range(12, 26), life: r.range(0.6, 1.4) }); }
      stepParticles(smoke, dt, 600); stepParticles(sparks, dt, 600);
    },
    draw(g, t) {
      const pan = easeOut(t / 3.2);
      const campX = Math.round(lerp(0, -210, pan));
      const fg = Math.round((1 - pan) * 280);

      g.drawImage(sky, 0, 0);
      g.drawImage(stars, 0, 0);
      drawTwinkles(g, tw, t);
      crescent(g, Math.round(268 + campX * 0.05), 30, 7, '#f0e8c8', '#fffbe8');
      g.drawImage(far, Math.round(campX * 0.25) - 60, 66);
      g.drawImage(trees, Math.round(campX * 0.5) - 40, 86);

      // Camp ground, then tents on top of it
      g.drawImage(ground, 0, 124);
      g.drawImage(camp, campX, 82);
      for (const f of fires) drawGlow(g, campX + f.x, 82 + f.y - 2, fireGlow);
      for (const p of smoke) {
        const k = p.t / p.life;
        drawPuff(g, campX + p.x, 82 + p.y, p.r0 + k * 5, k < 0.4 ? '#9a8090' : '#7a6a7c', '#c09080', 0.6, true);
      }
      for (const f of fires) campfire(g, campX + f.x, 82 + f.y, t, f.x, 1);
      for (const s of sparks) R(g, campX + s.x, 82 + s.y, 1, 1, s.t < 0.5 ? '#ffe080' : '#ff7a2a');
      // Festoon lights (wire + bulbs)
      for (let i = 0; i < bulbs.length - 1; i++) {
        const a = bulbs[i], b = bulbs[i + 1];
        if (b.x - a.x < 8) R(g, campX + a.x, 82 + Math.min(a.y, b.y), b.x - a.x, 1, '#1a1018');
      }
      for (const b of bulbs) {
        const on = Math.sin(t * 3 + b.p) > -0.6;
        if (on) drawGlow(g, campX + b.x, 82 + b.y + 1, bulbGlow);
        R(g, campX + b.x, 82 + b.y, 1, 2, on ? b.c : '#3a2a2a');
      }
      // Queue shuffling toward the aid tent
      for (const q of queue) {
        const span = 300;
        const pos = (q.off * 3 + t * 7) % span;
        const x = campX + 400 - span + pos;
        const stopgo = Math.sin(t * 1.3 + q.off) > -0.2;
        drawStranger(g, q.s, x, 141, stopgo ? 'walk' : 'idle', t + q.off, false);
        if (q.bundle) draw(g, bundle, x - 3, 141 - 12);
      }

      // Foreground clutter: jerrycans and a bedroll pile by the road
      for (const [x, k] of [[150, 0], [160, 1], [250, 0]]) {
        const px = x + fg;
        if (k) { R(g, px, 162, 12, 5, '#6a4a6a'); R(g, px, 162, 12, 1, '#8a6a8a'); R(g, px + 3, 161, 6, 1, '#4a3a4a'); }
        else { R(g, px, 159, 6, 8, '#3a6a3a'); R(g, px + 1, 158, 3, 1, '#2a4a2a'); R(g, px + 1, 160, 1, 6, '#5a8a5a'); }
      }
      // Family + car slide in with the pan
      const cx = 36 + fg;
      drawCar(g, car, wheels, cx, ROAD_Y, cx);
      drawFamily(g, fam, cx + 48, ROAD_Y + 19, 'idle', { t, gap: 10 });
      // Dusk grade on the foreground
      g.globalCompositeOperation = 'multiply';
      R(g, 0, ROAD_Y - 4, W, H - ROAD_Y + 4, '#a890b8');
      g.globalCompositeOperation = 'source-over';
    },
  };
}

// ── Armored caravan ───────────────────────────────────────────────────────────

function truckSprite() {
  return painted(64, 30, (g) => {
    const O = '#5a6a3a', o = '#3e4c26', d = '#2a3418', hi = '#7a8a50';
    // cab (front = left) and armored box
    R(g, 0, 10, 18, 14, O); R(g, 2, 6, 14, 6, O); R(g, 2, 6, 14, 1, hi);
    R(g, 4, 8, 8, 3, '#1a2010'); R(g, 4, 8, 3, 1, '#4a6a7a');            // slit windscreen
    R(g, 18, 2, 46, 22, O); R(g, 18, 2, 46, 1, hi); R(g, 18, 18, 46, 6, o);
    for (let x = 22; x < 62; x += 8) R(g, x, 6, 1, 10, d);                // armor plates
    for (let x = 24; x < 62; x += 16) R(g, x, 9, 4, 2, '#1a2010');        // gun slits
    R(g, 0, 22, 64, 2, d);
    R(g, 0, 16, 2, 4, '#ffe080');                                          // headlight
    R(g, 30, 0, 12, 3, o); R(g, 32, -1, 8, 1, hi);                         // hatch
  }, INK);
}

function caravanScene(env) {
  const r = rng(808);
  const sky = strip(W, 110, (g) => ditherBands(g, 0, 0, W, 110, ['#8aa0b0', '#b0b4a8', '#d0c098', '#e8d0a0']));
  const mesas = strip(480, 60, (g, w, h) => ridge(g, w, h, { amp: 26, base: 58, seed: 21, color: '#a87a5a', hi: '#d0a078', shade: '#8a6448', jag: 0.7 }));
  const scrub = strip(480, 40, (g, w, h) => {
    ridge(g, w, h, { amp: 8, base: 38, seed: 5, color: '#9a8058', hi: '#b89a68' });
    const sr = rng(3);
    for (let i = 0; i < 40; i++) { const x = sr.int(0, w), y = sr.int(20, 36); R(g, x, y, 3, 2, '#6a6a3a'); R(g, x + 1, y - 1, 1, 1, '#8a8a4a'); }
  });
  const ROAD2 = 112;
  const ground = strip(W, H - 100, (g, w, h) => {
    R(g, 0, 0, w, h, '#b89a6a');
    ditherFill(g, 0, 0, w, h, '#a88a5a', 0.3);
    const ry = ROAD2 - 100;
    R(g, 0, ry, w, 22, '#5a5050'); ditherFill(g, 0, ry, w, 22, '#6a6060', 0.25);
    R(g, 0, ry, w, 1, '#8a8070'); R(g, 0, ry + 21, w, 1, '#8a8070');
    for (let x = 4; x < w; x += 24) R(g, x, ry + 10, 12, 2, '#d8c070');
    const gr = rng(9);
    for (let i = 0; i < 80; i++) { const x = gr.int(0, w), y = gr.int(ry + 26, h); R(g, x, y, 2, 1, '#9a7a4a'); }
  });
  const truck = truckSprite();
  const wheelsT = wheelSprites();
  const car = carSprite('blue');
  const wheels = wheelSprites();
  const fam = familySprites(env.family);
  const flagCols = ['#d03030', '#e8e8e8', '#3a6ad0'];
  const dust = [];
  let dustT = 0;
  const SPACING = 120, SPEED = 46;
  const trucks = [0, 1, 2];
  const truckX = (i, t) => W + 20 + i * SPACING - (t - 0.4) * SPEED - (t > 0.4 ? 0 : 0);
  const loop = W + 80 + 3 * SPACING;
  const tx = (i, t) => ((truckX(i, t) + 80) % loop + loop) % loop - 80;

  return {
    update(dt, t) {
      dustT += dt * 26;
      while (dustT > 1) {
        dustT--;
        const i = r.int(0, 2), x = tx(i, t);
        if (x > -70 && x < W + 10) dust.push({ x: x + 60 + r.range(0, 8), y: ROAD2 + 18, vx: r.range(10, 30), vy: -r.range(4, 12), life: r.range(1.5, 3), r0: r.range(2, 4) });
      }
      stepParticles(dust, dt, 60);
    },
    draw(g, t) {
      const cam = -40 * (1 - easeOut(t / 2.2));
      g.drawImage(sky, 0, 0);
      disc(g, 70, 30, 10, '#f8ecc8'); disc(g, 70, 30, 7, '#fffae8');
      g.drawImage(mesas, Math.round(cam * 0.2) - 40, 54);
      g.drawImage(scrub, Math.round(cam * 0.5) - 40, 74);
      g.drawImage(ground, 0, 100);
      // Trucks drive right→left along the far lane
      for (const i of trucks) {
        const x = tx(i, t) + cam;
        if (x < -80 || x > W + 10) continue;
        const bump = Math.floor(t * 8 + i) % 2;
        R(g, x + 2, ROAD2 + 22, 62, 2, 'rgba(0,0,0,0.25)');
        for (const wx of [6, 30, 48]) draw(g, wheelsT[Math.floor((t * SPEED) / 3 + wx) % 2], x + wx, ROAD2 + 15);
        draw(g, truck, x, ROAD2 - 6 - bump);
        // Antenna pennant
        const ax = x + 56, ay = ROAD2 - 18 - bump;
        R(g, ax, ay, 1, 14, '#2a2a2a');
        const fl = Math.floor(t * 10 + i * 3) % 3;
        const fc = flagCols[i % 3];
        R(g, ax + 1, ay, 6, 2, fc); R(g, ax + 1, ay + 2, fl === 0 ? 4 : fl === 1 ? 6 : 5, 2, fc); R(g, ax + 1 + (fl ? 5 : 3), ay + 1, 2, 1, fc);
      }
      for (const p of dust) {
        const k = p.t / p.life;
        drawPuff(g, p.x + cam, p.y, p.r0 + k * 8, k < 0.5 ? '#c8a878' : '#d8bc90', '#e8d0a8', 0.6);
      }
      // Family pulled over on the shoulder, watching
      const cx = 30 + cam * 1.3;
      drawCar(g, car, wheels, cx, 146, 0);
      drawFamily(g, fam, cx + 50, 166, 'idle', { t, gap: 10 });
      // Dust haze over the lane
      g.globalAlpha = 0.25;
      R(g, 0, ROAD2 - 8, W, 30, '#d8c098');
      g.globalAlpha = 1;
    },
  };
}

// ── Human bottleneck ──────────────────────────────────────────────────────────

function bottleneckScene(env) {
  const r = rng(515);
  const sky = strip(W, 116, (g) => ditherBands(g, 0, 0, W, 116, ['#1a1838', '#2e2a58', '#5a3a6a', '#a05a5a', '#e08a4a']));
  const city = strip(480, 50, (g, w, h) => {
    const cr = rng(14);
    for (let x = 0; x < w;) {
      const bw = cr.int(10, 22), bh = cr.int(14, 44);
      R(g, x, h - bh, bw, bh, '#241c38');
      for (let wy = h - bh + 3; wy < h - 2; wy += 4) for (let wx = x + 2; wx < x + bw - 2; wx += 3) if (cr() < 0.12) R(g, wx, wy, 1, 2, '#c8a050');
      x += bw + cr.int(0, 3);
    }
  });
  const ground = roadStrip('#3a3640', '#2c2a32', '#6a6070', '#a89040', '#3a3238', '#4a4048', 61);
  const LANE = 120;               // far lane of cars
  const shoulder = strip(W, 30, (g) => { R(g, 0, 0, W, 30, '#4a4248'); ditherFill(g, 0, 0, W, 30, '#5a5258', 0.3); R(g, 0, 0, W, 1, '#6a6070'); });
  const cars = [carSprite('red'), carSprite('green'), carSprite('blue'), carSprite('red'), carSprite('green')];
  const wheels = wheelSprites();
  const myCar = carSprite('blue');
  const fam = familySprites(env.family);
  const crowd = Array.from({ length: 14 }, (_, i) => ({ s: strangerSprites(i), off: r.range(0, 240), lane: i % 3, sp: r.range(5, 9) }));
  const guard = strangerSprites(0, 'plain', { C: '#3a4a3a', P: '#2a3a2a', H: '#2a3a2a' });
  const booth = painted(22, 30, (g) => {
    R(g, 0, 6, 22, 24, '#8a8a7a'); R(g, 0, 0, 22, 6, '#4a4a44'); R(g, 3, 10, 16, 8, '#2a3a4a'); R(g, 4, 11, 6, 3, '#7aa0c0');
  }, INK);
  const tower = painted(14, 64, (g) => {
    R(g, 0, 0, 14, 8, '#5a5a54'); R(g, 1, 8, 2, 56, '#4a4a44'); R(g, 11, 8, 2, 56, '#4a4a44');
    for (let y = 12; y < 64; y += 10) { R(g, 3, y, 8, 1, '#4a4a44'); }
  }, INK);
  const lampGlow = glowSprite(5, '#fff6c0', 0.9);
  const brake = glowSprite(4, '#ff3a2a', 0.6);
  const tw = twinkles(7, 10, 30);

  return {
    draw(g, t) {
      const cam = -50 * (1 - easeOut(t / 2.4));
      g.drawImage(sky, 0, 0);
      drawTwinkles(g, tw, t);
      g.drawImage(city, Math.round(cam * 0.25) - 60, 72);
      g.drawImage(shoulder, 0, LANE + 6);
      // Gridlocked far lane: cars inch forward
      cars.forEach((c, i) => {
        const creep = Math.min(4, Math.max(0, Math.sin(t * 0.8 + i) * 4));
        const x = -10 + i * 52 + creep + cam * 0.8;
        drawCar(g, c, wheels, x, LANE - 10, creep);
        if (Math.floor(t * 2 + i) % 3 !== 0) { drawGlow(g, x, LANE - 2, brake); R(g, x, LANE - 3, 1, 2, '#ff5040'); }
      });
      // Checkpoint: tower with searchlight, booth, boom gate
      const tx = 276 + cam * 0.9;
      draw(g, tower, tx, 70);
      draw(g, booth, tx - 26, 112);
      R(g, tx - 4, 128, 3, 14, '#3a3a3a');
      const boomUp = Math.floor(t / 2.5) % 3 === 2;
      for (let k = 0; k < 7; k++) {
        const col = k % 2 ? '#e8e8e8' : '#d02a2a';
        if (boomUp) R(g, tx - 4 - 1, 127 - k * 4, 3, 4, col); else R(g, tx - 4 - (k + 1) * 6, 128, 6, 3, col);
      }
      drawStranger(g, guard, tx - 18, 143, 'idle', t, true);
      // Crowd on foot funnelling right toward the gate
      const sorted = [...crowd].sort((a, b) => a.lane - b.lane);
      for (const p of sorted) {
        const stop = Math.sin(t * 1.1 + p.off) < -0.3;
        const x = ((p.off + t * p.sp) % 250) + cam * 0.9 - 10;
        const gy = 132 + p.lane * 5;
        drawStranger(g, p.s, x, gy, stop ? 'idle' : 'walk', t + p.off);
      }
      // Searchlight sweep
      const ang = Math.sin(t * 0.7) * 0.6 - 0.15;
      const lx = tx + 7, ly = 74;
      const ex = lx - 130 + Math.sin(t * 0.7) * 110, ey = 140;
      g.globalAlpha = 0.16;
      g.fillStyle = '#fff4c0';
      g.beginPath(); g.moveTo(lx, ly); g.lineTo(ex - 18, ey); g.lineTo(ex + 18, ey); g.closePath(); g.fill();
      g.globalAlpha = 0.22;
      g.beginPath(); g.ellipse(ex, ey, 20, 5, 0, 0, Math.PI * 2); g.fill();
      g.globalAlpha = 1;
      drawGlow(g, lx, ly, lampGlow);
      void ang;

      g.drawImage(ground, 0, GROUND_Y + 8);
      const cx = 24 + cam * 1.2;
      drawCar(g, myCar, wheels, cx, ROAD_Y + 4, 0);
      drawFamily(g, fam, cx + 50, ROAD_Y + 23, 'idle', { t, gap: 10 });
      g.globalCompositeOperation = 'multiply';
      R(g, 0, 100, W, H - 100, '#9a90b0');
      g.globalCompositeOperation = 'source-over';
    },
  };
}

// ── Bandits roadblock ─────────────────────────────────────────────────────────

function banditsScene(env) {
  const r = rng(666);
  const sky = strip(W, 120, (g) => ditherBands(g, 0, 0, W, 120, ['#05040a', '#0c0a18', '#1a1020', '#3a1418', '#5a1c14']));
  const stars = starStrip(W, 60, 31, 90);
  const hills = strip(480, 50, (g, w, h) => ridge(g, w, h, { amp: 18, base: 48, seed: 13, color: '#0e0a12', hi: '#2a1418' }));
  const snag = silhouette(deadTreeSprite(), '#0a080c');
  const ground = roadStrip('#262026', '#1c181c', '#3a3238', '#6a5a30', '#141014', '#221a1e', 71);
  const car = carSprite('blue');
  const wheels = wheelSprites();
  const wreck = silhouette(carSprite('red'), '#5a3428');
  const fam = familySprites(env.family);
  const bandits = Array.from({ length: 4 }, (_, i) => strangerSprites(i + 2, 'plain', { C: '#2a2a2a', P: '#1a1a1a' }));
  const tire = sprite(['.kkkk.', 'kKKKKk', 'kK..Kk', 'kKKKKk', '.kkkk.'], { k: '#0a0a0a', K: '#2a2a2a' }, { outline: INK });
  const barrel = sprite(['bbbbbb', 'BBBBBB', 'bbbbbb', 'BBBBBB', 'BBBBBB', 'bbbbbb', 'BBBBBB', 'bbbbbb'], { B: '#6a3a2a', b: '#4a2a1e' }, { outline: INK });
  const fireGlow = glowSprite(24, '#d8702a', 0.38, 0.55);
  const barrels = [{ x: 196 }, { x: 268 }];
  const tw = twinkles(9, 16, 50);
  const sparks = [], smoke = [];
  let sT = 0, mT = 0;

  return {
    update(dt, t) {
      sT += dt * 18; mT += dt * 4;
      while (sT > 1) { sT--; const b = r.pick(barrels); sparks.push({ x: b.x + 3 + r.range(-2, 2), y: 134, vx: r.range(-8, 8), vy: -r.range(16, 34), life: r.range(0.5, 1.3) }); }
      while (mT > 1) { mT--; const b = r.pick(barrels); smoke.push({ x: b.x + 3, y: 120, vx: r.range(2, 6), vy: -r.range(8, 12), life: r.range(3, 5), r0: 2 }); }
      stepParticles(sparks, dt); stepParticles(smoke, dt, 40);
    },
    draw(g, t) {
      const cam = -40 * (1 - easeOut(t / 2.2));
      const lightK = ease((t - 0.6) / 0.4);            // headlights snap on during intro
      const flick = 0.85 + 0.15 * Math.sin(t * 15) * Math.sin(t * 6.1);
      g.drawImage(sky, 0, 0);
      g.drawImage(stars, 0, 0);
      drawTwinkles(g, tw, t, '#e0e4ff');
      crescent(g, 52, 26, 8, '#e8e4d0', '#fffff0');
      g.drawImage(hills, Math.round(cam * 0.3) - 40, 84);
      draw(g, snag, 150 + cam * 0.6, 108);
      g.drawImage(ground, 0, GROUND_Y);
      // Smoke from the barrels
      for (const p of smoke) { const k = p.t / p.life; drawPuff(g, p.x + cam, p.y, p.r0 + k * 7, '#2a2024', '#5a3020', 0.5, true); }
      // Roadblock: wreck, tire piles, plank barrier
      draw(g, wreck, 212 + cam, ROAD_Y - 2, true);
      for (const [x, y] of [[180, 156], [186, 156], [183, 151], [292, 156], [298, 156], [295, 151]]) draw(g, tire, x + cam, y);
      R(g, 178 + cam, 146, 130, 3, '#5a3a22'); R(g, 178 + cam, 146, 130, 1, '#7a5030');
      for (let x = 180; x < 306; x += 7) { R(g, x + cam, 143, 1, 3, '#9a9aa0'); }
      // Burning barrels
      for (const b of barrels) {
        g.globalAlpha = flick;
        drawGlow(g, b.x + 3 + cam, 132, fireGlow);
        g.globalAlpha = 1;
        draw(g, barrel, b.x + cam, 134);
        flameWall(g, b.x + cam, b.x + 6 + cam, 134, 12, t, 1, b.x);
      }
      for (const s of sparks) R(g, s.x + cam, s.y, 1, 1, s.t < 0.5 ? '#ffe080' : '#ff6a20');
      // Silhouetted figures, rim-lit by the barrels, swaying
      bandits.forEach((b, i) => {
        const x = 210 + i * 18 + Math.round(Math.sin(t * 1.4 + i) * 1.5) + cam;
        drawStranger(g, b, x, 160 + (i % 2) * 2, Math.floor(t * 0.7 + i) % 3 === 0 ? 'wave' : 'idle', t + i, true, '#0a0608', '#ff8a3a');
      });
      // The family's car on the left with headlights on
      // Family huddles behind the car, away from the roadblock
      const cx = 58 + cam * 1.3;
      drawCar(g, car, wheels, cx, ROAD_Y + 2, 0);
      drawFamily(g, fam, cx - 46, ROAD_Y + 20, 'idle', { t, gap: 10 });
      g.globalCompositeOperation = 'multiply';
      R(g, 0, 128, W, H - 128, '#5a5a8a');
      g.globalCompositeOperation = 'source-over';
      // Headlight cone (after the night grade so it reads as light)
      if (lightK > 0) {
        g.globalAlpha = 0.2 * lightK;
        g.fillStyle = '#fff2b0';
        g.beginPath(); g.moveTo(cx + 40, ROAD_Y + 9); g.lineTo(cx + 200, ROAD_Y - 14); g.lineTo(cx + 200, ROAD_Y + 26); g.closePath(); g.fill();
        g.globalAlpha = 1;
        R(g, cx + 39, ROAD_Y + 8, 2, 2, '#ffffe0');
      }
      // Re-light the fires on top of the grade
      for (const b of barrels) flameWall(g, b.x + cam, b.x + 6 + cam, 134, 12, t, 1, b.x);
    },
  };
}
