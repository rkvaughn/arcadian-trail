/**
 * Flood — floodwater swallows a valley town under a black storm sky. Rain
 * drives in sheets, lightning cracks over the hills, debris drifts past the
 * half-drowned rooftops, and the family stands on the raised road with the car
 * as the water climbs. Intro: the camera tilts down out of the storm clouds
 * while the water rises over the houses.
 *
 * Variants:
 *   road_washout  — the road ahead has collapsed; water roars through the gap
 *   swollen_river — a fast brown river rips past, carrying logs and trees
 *   king_tide     — sunny coastal street: the sea spills over the seawall
 */

import {
  W, H, R, rng, ease, easeOut, clamp, lerp, ditherBands, ditherFill, ridge, strip, drawWrap,
  drawPuff, stepParticles, draw, silhouette, disc, bolt, sprite, text,
} from '../kit.js';
import {
  INK, carSprite, wheelSprites, drawCar, familySprites, drawFamily, houseSprite, poleSprite,
  pineSprite, roundTreeSprite, cloudSprite, birdSprites, palmSprite,
} from '../sprites.js';

const ROAD_Y = 146;          // top of the raised road
const ROAD_H = 18;
const RAPIDS = [[30, 12], [124, 22], [212, 9]];

// ── Local helpers ────────────────────────────────────────────────────────────

/** Tile of slanted rain streaks (wraps in both directions). */
function rainTile(w, h, n, len, slope, color, seed) {
  return strip(w, h, (g) => {
    const r = rng(seed);
    for (let i = 0; i < n; i++) {
      const x = r.int(0, w - 1), y = r.int(0, h - 1);
      for (let k = 0; k < len; k++) R(g, (x + Math.round(k * slope) + w) % w, (y + k) % h, 1, 1, color);
    }
  });
}

/** Draw a layer tiled in both directions, scrolled by (ox, oy). */
function tile2(g, layer, ox, oy, y0 = 0, y1 = H) {
  const lw = layer.width, lh = layer.height;
  const sx = -(((Math.round(ox) % lw) + lw) % lw);
  const sy = -(((Math.round(oy) % lh) + lh) % lh);
  for (let y = sy + y0; y < y1; y += lh) for (let x = sx; x < W; x += lw) g.drawImage(layer, x, y);
}

/** NES-style wave-crest band (16 px period) for a water surface. */
function waveBand(crest, mid, deep) {
  return strip(W + 16, 4, (g) => {
    for (let x = 0; x < W + 16; x += 16) {
      R(g, x + 2, 0, 5, 1, crest); R(g, x + 1, 1, 2, 1, crest); R(g, x + 7, 1, 2, 1, mid);
      R(g, x, 2, 1, 1, mid); R(g, x + 9, 2, 4, 1, mid); R(g, x + 12, 3, 4, 1, deep);
    }
  });
}

const BARREL = ['.ooo.', 'oOOOo', 'bbbbb', 'oOOOo', 'oOOOo', 'bbbbb', '.ooo.'];
const LOG = ['..LLLLLLLLLLLLL.', '.LllLLLLLLlLLLLe', 'LLLLLLLlLLLLLLLe', '.LLLLLLLLLLLLLe.'];

function debrisSprites() {
  return {
    barrel: sprite(BARREL, { o: '#2a6ab0', O: '#4a8ad0', b: '#c8ccd4' }, { outline: INK }),
    log: sprite(LOG, { L: '#6a4a24', l: '#8a6a3a', e: '#c8a060' }, { outline: INK }),
    crate: sprite(['wwwwww', 'wWWWWw', 'wWwwWw', 'wWwwWw', 'wWWWWw', 'wwwwww'],
      { w: '#8a6a3a', W: '#b08a50' }, { outline: INK }),
    rock: sprite(['..rrrrr...', '.rRRRRrr..', 'rRRRrrrrr.', 'rrrrrrrrrr'], { r: '#4a443e', R: '#7a7268' }, { outline: INK }),
    snag: sprite([
      '..b.....b.......................', '...b...b..b.....................',
      'bb.bbbb.bb......................', '...bBBBBBBBBBBBBBBBBBBBBBBBBBBBr',
      '..bBBBBBBBBBBBBBBBBBBBBBBBBBBBBr', '...bbbbbbbbbbbbbbbbbbbbbbbbbbbb.',
      '..b..b.bb.......................',
    ], { b: '#4a3020', B: '#6a4a30', r: '#c8a060' }, { outline: INK }),
    tire: sprite(['.kkk.', 'kKgKk', 'kg.gk', 'kKgKk', '.kkk.'], { k: '#1a1418', K: '#2a2628', g: '#5a5658' }, { outline: INK }),
  };
}

// ── Main flood scene ─────────────────────────────────────────────────────────

export function floodScene(env) {
  if (env.eventId === 'king_tide') return kingTideScene(env);
  const washout = env.eventId === 'road_washout';
  const river = env.eventId === 'swollen_river';
  const r = rng(river ? 44 : 31);

  const sky = strip(W, 130, (g) => ditherBands(g, 0, 0, W, 130, river
    ? ['#1a2230', '#2a3444', '#3e4a58', '#56606a', '#6e7678']
    : ['#070b16', '#0e1626', '#18243a', '#24344c', '#34465a', '#46586a']));
  const clouds = strip(420, 76, (g, w) => {
    const cr = rng(12);
    for (let i = 0; i < 110; i++) {
      const x = cr.range(0, w), y = cr.range(-6, 40) * (i < 80 ? 0.7 : 1), rad = cr.range(8, 17) * (1 - y / 90);
      for (const dx of [0, -w, w]) drawPuff(g, x + dx, y, rad, river ? '#2a323e' : '#0e1424', river ? '#4a5462' : '#34465e', 0.45);
    }
  });
  // Low ragged scud racing under the cloud deck
  const scud = strip(360, 20, (g, w) => {
    const cr = rng(19);
    for (let i = 0; i < 26; i++) {
      const x = cr.range(0, w), y = cr.range(6, 12), rad = cr.range(3, 7);
      for (const dx of [0, -w, w]) drawPuff(g, x + dx, y, rad, river ? '#3e4854' : '#1c2638', river ? '#5a6470' : '#34445a', 0.6);
    }
  });
  const hills = strip(480, 50, (g, w, h) => ridge(g, w, h, {
    amp: 22, base: 46, seed: 9, color: '#1a2434', hi: '#34465a', shade: '#141c2a',
  }));

  // Mid-ground: a drowned town (or far riverbank of pines)
  const litWindows = [];
  const town = strip(480, 80, (g, w) => {
    const tr = rng(river ? 61 : 8);
    if (!river) {
      // Valley floor (soon under water): dark fields and a lane
      R(g, 0, 36, w, 44, '#1e2a26'); ditherFill(g, 0, 36, w, 44, '#26342e', 0.4);
      R(g, 0, 50, w, 3, '#2e3236');
    }
    if (river) {
      const tops = ridge(g, w, 60, { amp: 8, base: 48, seed: 21, color: '#1e3024', hi: '#3a5a3a' });
      const pine = pineSprite({ G: '#1e4a2a', g: '#14341e', h: '#3a6a3a', T: '#3a2a1a' });
      for (let x = 0; x < w; x += tr.int(6, 11)) draw(g, pine, x, tops[Math.min(w - 1, x + 5)] - pine.h + 4);
      return;
    }
    const pole = poleSprite('#4a3420');
    const poles = [];
    for (let x = 6; x < w - 30; x += tr.int(34, 52)) {
      const lit = tr() < 0.45;
      const pal = {
        R: tr.pick(['#7a3a30', '#4a5a6a', '#6a5a3a', '#5a3a4a']), r: '#2a2028',
        W: tr.pick(['#a8a090', '#8a9aa8', '#b0987a']), w: '#6a6a70', D: '#3a2820', G: '#ffd870', g: '#4a6a88', C: '#4a4a50',
      };
      const hs = houseSprite(pal, lit);
      const by = tr.int(24, 32);
      draw(g, hs, x, by);
      if (lit) litWindows.push(x + 8, x + 18);
      if (tr() < 0.6) { const px = x + 30; draw(g, pole, px, by - 18); poles.push([px + 5, by - 18]); }
    }
    // Sagging wires between poles
    g.fillStyle = '#141018';
    for (let i = 0; i < poles.length - 1; i++) {
      const [ax, ay] = poles[i], [bx, by] = poles[i + 1];
      for (let x = ax; x <= bx; x++) {
        const u = (x - ax) / (bx - ax);
        g.fillRect(x, Math.round(lerp(ay, by, u) + Math.sin(u * Math.PI) * 5) + 1, 1, 1);
      }
    }
  });

  // Water body (dither bands), prerendered taller than needed
  const waterBody = strip(W, 70, (g) => ditherBands(g, 0, 0, W, 70, river
    ? ['#7a6a4a', '#5e5034', '#4a4028', '#3a3220']
    : ['#2a4a6a', '#1e3a58', '#162e48', '#10223a']));
  const waves = river ? waveBand('#f0e4c8', '#a89068', '#4a4028') : waveBand('#9ad0f0', '#4a80b0', '#1e3a58');
  const current = strip(W + 40, 34, (g) => {
    const cr = rng(5);
    for (let i = 0; i < (river ? 120 : 30); i++) {
      R(g, cr.int(0, W + 39), cr.int(2, 33), cr.int(3, 10), 1, river ? cr.pick(['#a88a5a', '#c8b088', '#5a4a2e']) : '#3a6a90');
    }
  });

  // Road: raised levee road with guard rail, riprap slope, foreground water
  const road = strip(W, H - ROAD_Y + 8, (g, w, h) => {
    const y0 = 8;
    // Guard rail
    for (let x = 3; x < w; x += 14) R(g, x, 0, 2, 9, '#6a7078');
    R(g, 0, 2, w, 2, '#a8b0b8'); R(g, 0, 4, w, 1, '#5a6068');
    R(g, 0, y0, w, ROAD_H, '#2a2c32');
    ditherFill(g, 0, y0, w, ROAD_H, '#34363e', 0.3);
    R(g, 0, y0, w, 1, '#5a5e68');
    R(g, 0, y0 + 2, w, 1, '#8a8e96');
    for (let x = 6; x < w; x += 22) R(g, x, y0 + 9, 12, 1, '#d8b040');
    R(g, 0, y0 + ROAD_H - 1, w, 1, '#16181c');
    // Riprap stones
    R(g, 0, y0 + ROAD_H, w, h - y0 - ROAD_H, '#2a2a30');
    const sr = rng(77);
    for (let i = 0; i < 160; i++) {
      const x = sr.int(0, w), y = sr.int(y0 + ROAD_H, h - 1), s = sr.int(2, 4);
      R(g, x, y, s, s - 1, sr.pick(['#4a4a52', '#3a3a42', '#5a5a62']));
      R(g, x, y, s - 1, 1, '#6a6a74');
    }
  });

  const rainFar = rainTile(160, 120, 70, 4, 0.35, '#3a5070', 3);
  const rainNear = rainTile(160, 120, 40, 7, 0.4, '#7a98b8', 4);

  const car = carSprite('blue');
  const wheels = wheelSprites();
  const carRim = silhouette(car, '#8ab0d8');
  const fam = familySprites(env.family);
  const deb = debrisSprites();
  const roofCar = carSprite('red');

  const floaters = [];
  for (let i = 0; i < (river ? 7 : 6); i++) {
    floaters.push({
      kind: river ? r.pick(['log', 'log', 'snag', 'crate', 'tire']) : r.pick(['barrel', 'log', 'crate', 'tire', 'roof']),
      x: r.range(-40, W + 40), lane: r.range(0, 1), sp: river ? r.range(40, 70) : r.range(5, 12), ph: r.range(0, 6),
    });
  }
  if (!river) floaters.push({ kind: 'roof', x: 230, lane: 0.55, sp: 4, ph: 1 });

  const splashes = [], spray = [];
  let splashT = 0, sprayT = 0;
  let nextBolt = 0.8, boltAge = 9, boltX = 200, boltSeed = 1;

  const scene = {
    flash: 0,

    update(dt, t) {
      splashT += dt * 40;
      while (splashT > 1) {
        splashT--;
        splashes.push({ x: r.range(0, W), y: r.range(0, 1), vx: 0, vy: 0, life: 0.25 });
      }
      if (washout && t > 0.5) {
        sprayT += dt * 50;
        while (sprayT > 1) {
          sprayT--;
          spray.push({ x: r.range(GAP_X0 - 2, GAP_X1 + 2), y: ROAD_Y + 6, vx: r.range(-20, 20), vy: -r.range(10, 40), g: 90, life: 1.2 });
        }
      }
      stepParticles(splashes, dt, 200); stepParticles(spray, dt);
      boltAge += dt;
      if (t > nextBolt) {
        boltAge = 0; boltX = r.range(140, 300); boltSeed = r.int(1, 999);
        nextBolt = t + r.range(2.8, 5.2);
      }
      scene.flash = boltAge < 0.25 ? (1 - boltAge / 0.25) * (river ? 0.35 : 0.6) : 0;
    },

    draw(g, t) {
      const camY = -26 * (1 - easeOut(t / 2.2));          // tilt down out of the clouds
      const camX = -30 * (1 - easeOut(t / 2.6));
      const rise = easeOut(clamp((t - 0.2) / 2.8, 0, 1));
      const waterY = Math.round((river ? lerp(122, 112, rise) : lerp(142, 115, rise)) + Math.sin(t * 1.3) * 0.6);

      g.drawImage(sky, 0, Math.round(camY * 0.2) - 4);
      R(g, 0, 126 + Math.round(camY * 0.2), W, 60, '#46586a');
      drawWrap(g, clouds, -t * 6 + camX * 0.2, Math.round(camY * 0.3) - 6);
      drawWrap(g, scud, -t * 14 + camX * 0.25, 70 + Math.round(camY * 0.35));
      if (boltAge < 0.22) bolt(g, boltX + camX * 0.3, 20, 92 + Math.round(camY * 0.4), boltSeed, '#ffffff', '#8aa8e8');
      g.drawImage(hills, Math.round(camX * 0.3) - 60, 62 + Math.round(camY * 0.45));
      g.drawImage(town, Math.round(camX * 0.6) - 60, 72 + Math.round(camY * 0.7));

      // Water surface
      const wy = waterY + Math.round(camY * 0.7);
      g.drawImage(waterBody, 0, wy);
      R(g, 0, wy + 70, W, 40, river ? '#3a2e1c' : '#10223a');
      // Lit-window reflections on the water
      if (!river) {
        for (const lx of litWindows) {
          const x = lx + Math.round(camX * 0.6) - 60;
          if (x < -4 || x > W) continue;
          for (let k = 0; k < 4; k++) {
            if ((Math.floor(t * 6) + k + lx) % 3 === 0) continue;
            R(g, x + ((k + Math.floor(t * 4)) % 2), wy + 3 + k * 3, 2 + (k % 2), 1, k < 2 ? '#e8c060' : '#8a7040');
          }
        }
      }
      tile2(g, current, river ? t * 90 : t * 10, 0, wy + 4, wy + 38);
      if (river) {
        for (const [rx, ry] of RAPIDS) {
          const y = wy + ry;
          // Boulder with a foam cushion upstream and a V-shaped wake downstream
          draw(g, deb.rock, rx, y - 4);
          const fp = Math.floor(t * 12) % 2;
          R(g, rx - 3, y - 3 + fp, 3, 4, '#ffffff'); R(g, rx - 1, y - 5, 4, 1, '#f0e8d8');
          for (let k = 0; k < 7; k++) {
            const ph = (Math.floor(t * 14) + k) % 3;
            const c = k < 3 ? '#ffffff' : k < 5 ? '#e8dcc0' : '#b8a078';
            R(g, rx + 10 + k * 4 + ph, y - 3 - Math.floor(k / 2), 3, 1, c);
            R(g, rx + 10 + k * 4 + ph, y + 2 + Math.floor(k / 2), 3, 1, c);
          }
        }
      }
      drawWrap(g, waves, river ? t * 60 : t * 8, wy - 1);
      if (river) {
        drawWrap(g, waves, t * 75 + 5, wy + 9);
        drawWrap(g, waves, t * 90 + 11, wy + 19);
      }

      // Floating debris bobbing in the current
      for (const f of floaters) {
        const span = W + 80;
        const x = ((f.x + t * f.sp) % span + span) % span - 40;
        const y = wy + 2 + Math.round(f.lane * 20 + Math.sin(t * 2 + f.ph) * 1);
        if (f.kind === 'roof') {
          // A drowned car: roof and windows above the waterline
          g.drawImage(roofCar.c, 0, 0, roofCar.c.width, 7, Math.round(x), y - 5, roofCar.c.width, 7);
          R(g, x, y + 2, 42, 1, '#9ad0f0');
          continue;
        }
        const s = deb[f.kind];
        draw(g, s, x, y - Math.floor(s.h / 2));
        R(g, x - 1, y + Math.ceil(s.h / 2), s.w + 2, 1, river ? '#c8b088' : '#9ad0f0');
      }
      for (const s of splashes) {
        const x = Math.round(s.x), y = wy + 4 + Math.round(s.y * 30);
        if (s.t < 0.12) { R(g, x, y - 1, 1, 1, '#c8e0f0'); } else { R(g, x - 1, y, 1, 1, '#8ab0d0'); R(g, x + 1, y, 1, 1, '#8ab0d0'); }
      }

      // Raised road, with an optional washed-out gap
      g.drawImage(road, 0, ROAD_Y - 8);
      if (washout) drawWashout(g, t, spray);
      // Foreground water lapping the riprap
      const fy = 172 + Math.round(Math.sin(t * 1.7) * 1);
      R(g, 0, fy, W, H - fy, river ? '#4a3a22' : '#162e48');
      drawWrap(g, waves, t * 14 + 7, fy - 1);

      // Car parked on the road, headlights on; family by the rail
      const carX = washout ? 150 : 196;
      const roll = lerp(-60, carX, easeOut(clamp(t / 1.6, 0, 1)));
      const moving = t < 1.6;
      const bounce = moving && Math.floor(t * 10) % 2 ? 1 : 0;
      if (scene.flash > 0.1) draw(g, carRim, roll, ROAD_Y + 2 - 1 - bounce);
      drawCar(g, car, wheels, roll, ROAD_Y + 2, roll, { bounce });
      g.globalAlpha = 0.16;
      g.fillStyle = '#ffeaa0';
      g.beginPath(); g.moveTo(roll + 40, ROAD_Y + 9); g.lineTo(roll + 110, ROAD_Y + 2); g.lineTo(roll + 110, ROAD_Y + 18); g.closePath(); g.fill();
      g.globalAlpha = 1;
      fam.forEach((m, i) => {
        const t0 = 1.8 + i * 0.25;
        if (t < t0) return;
        const start = roll + 6, target = roll - 16 - i * 11;
        const x = Math.max(target, start - (t - t0) * 42);
        const walking = x > target;
        drawFamily(g, [m], x, ROAD_Y + 15 + (i % 2), walking ? 'walk' : 'idle',
          { t: t + i, flip: walking || i % 2 === 1, rim: scene.flash > 0.1 ? '#c8dcff' : null, rimDx: 0, rimDy: -1 });
      });

      // Cold storm grade over the foreground
      g.globalCompositeOperation = 'multiply';
      R(g, 0, ROAD_Y - 10, W, H - ROAD_Y + 10, river ? '#b8b8c0' : '#98a8c0');
      g.globalCompositeOperation = 'source-over';

      // Rain sheets, far then near
      const rk = river ? 0.6 : 1;
      g.globalAlpha = 0.8 * rk;
      tile2(g, rainFar, -t * 40, -t * 140);
      g.globalAlpha = rk;
      tile2(g, rainNear, -t * 70, -t * 230);
      g.globalAlpha = 1;
    },
  };
  return scene;
}

// Washed-out gap in the road: broken asphalt edges, water cascading through
const GAP_X0 = 232, GAP_X1 = 276;
function drawWashout(g, t, spray) {
  const y0 = ROAD_Y - 8;
  R(g, GAP_X0, y0, GAP_X1 - GAP_X0, H - y0, '#1e3a58');
  // Cascading water columns
  for (let x = GAP_X0; x < GAP_X1; x++) {
    const ph = (x * 7 + Math.floor(t * 30)) % 9;
    for (let y = y0 + 4 + ph; y < H; y += 9) R(g, x, y, 1, 4, (x + y) % 3 ? '#4a80b0' : '#9ad0f0');
  }
  // Foam at the lip and the base
  for (let x = GAP_X0 - 2; x < GAP_X1 + 2; x += 2) {
    const h = 2 + ((x + Math.floor(t * 12)) % 3);
    R(g, x, ROAD_Y + 4 - h, 2, h, '#e8f4ff');
    R(g, x, 168 - ((x + Math.floor(t * 10)) % 4), 2, 3, '#c8e4f8');
  }
  // Jagged broken road edges
  for (let k = 0; k < ROAD_H + 2; k += 2) {
    const j = (k * 5) % 4;
    R(g, GAP_X0 - j, ROAD_Y + k, j + 1, 2, '#1e3a58');
    R(g, GAP_X1 - 1, ROAD_Y + k, ((k * 3) % 4) + 1, 2, '#1e3a58');
  }
  R(g, GAP_X0 - 4, ROAD_Y + ROAD_H, 3, 2, '#5a5e68');
  // Barricade + sign before the gap
  const bx = GAP_X0 - 34;
  R(g, bx, ROAD_Y + 1, 2, 12, '#3a3a40'); R(g, bx + 20, ROAD_Y + 1, 2, 12, '#3a3a40');
  for (let x = 0; x < 24; x += 4) R(g, bx - 1 + x, ROAD_Y + 3, 4, 3, (x / 4) % 2 ? '#f0f0f0' : '#e04a20');
  R(g, bx - 1, ROAD_Y + 3, 24, 1, INK);
  if (Math.floor(t * 3) % 2) R(g, bx, ROAD_Y - 1, 2, 2, '#ffb020');
  R(g, bx + 10, ROAD_Y - 4, 2, 5, '#3a3a40');
  R(g, bx - 9, ROAD_Y - 14, 42, 11, INK);
  R(g, bx - 8, ROAD_Y - 13, 40, 9, '#f0c020');
  text(g, 'CLOSED', bx + 12, ROAD_Y - 12, { color: INK, align: 'center' });
  for (const p of spray) R(g, p.x, p.y, 1, 1, p.t < 0.5 ? '#e8f4ff' : '#9ad0f0');
}

// ── King tide: a bright coastal street overtopped by the sea ─────────────────

function kingTideScene(env) {
  const r = rng(52);
  const sky = strip(W, 110, (g) => ditherBands(g, 0, 0, W, 110,
    ['#2a6ac8', '#3a84dc', '#56a0e8', '#7ab8ee', '#a8d4f2']));
  const cloudS = cloudSprite(false);
  const cloudB = cloudSprite(true);
  const sea = strip(W, 30, (g) => {
    ditherBands(g, 0, 0, W, 30, ['#1a5a9a', '#226aa8', '#2a7ab4', '#3a8ac0']);
    const sr = rng(8);
    for (let i = 0; i < 40; i++) R(g, sr.int(0, W), sr.int(2, 29), sr.int(2, 6), 1, '#8ac8f0');
  });
  const waves = waveBand('#ffffff', '#9ad8f8', '#3a8ac0');
  // Pier on stilts running out to sea
  const pier = strip(W, 30, (g) => {
    R(g, 150, 8, 170, 3, '#8a6a44'); R(g, 150, 8, 170, 1, '#b08a5a');
    for (let x = 152; x < W; x += 12) R(g, x, 11, 2, 16, '#5a4028');
    for (let x = 152; x < W; x += 6) R(g, x, 4, 1, 4, '#6a5034');
    R(g, 150, 4, 170, 1, '#6a5034');
  });
  const palmTrunk = '#8a6a3a';
  const crowns = [palmSprite(0), palmSprite(1)];
  const street = strip(W, H - 120, (g, w, h) => {
    // Seawall
    R(g, 0, 0, w, 8, '#b8b0a0'); R(g, 0, 0, w, 1, '#e0d8c8'); R(g, 0, 7, w, 1, '#6a6458');
    for (let x = 0; x < w; x += 16) R(g, x, 1, 1, 6, '#8a8478');
    // Promenade + street
    R(g, 0, 8, w, 10, '#c8bca0'); for (let x = 0; x < w; x += 8) R(g, x, 8, 1, 10, '#a89c80');
    R(g, 0, 18, w, 2, '#d8d0c0');
    R(g, 0, 20, w, h - 20, '#4a4a52');
    ditherFill(g, 0, 20, w, h - 20, '#56565e', 0.3);
    for (let x = 6; x < w; x += 24) R(g, x, 38, 12, 2, '#f0f0f0');
  });

  const car = carSprite('blue');
  const wheels = wheelSprites();
  const fam = familySprites(env.family);
  const gulls = birdSprites('#f8f8f8');

  const spray = [], ripples = [];
  let surgeT = 0, rippleT = 0;

  const scene = {
    update(dt, t) {
      surgeT += dt;
      // A big wave slaps the seawall every few seconds
      if (surgeT > 2.4 && t > 0.6) {
        surgeT = 0;
        for (let i = 0; i < 70; i++) {
          spray.push({ x: r.range(0, W), y: 120 + r.range(-2, 2), vx: r.range(-6, 14), vy: -r.range(30, 80), g: 120, life: 1.6 });
        }
      }
      rippleT += dt * 10;
      while (rippleT > 1) { rippleT--; ripples.push({ x: r.range(0, W), y: r.range(150, 178), vx: 0, vy: 0, life: 0.8 }); }
      stepParticles(spray, dt); stepParticles(ripples, dt);
    },

    draw(g, t) {
      const cam = -40 * (1 - easeOut(t / 2.2));
      const flood = easeOut(clamp((t - 0.2) / 2.5, 0, 1));
      g.drawImage(sky, 0, 0);
      disc(g, 268, 24, 12, '#fff4b0'); disc(g, 268, 24, 9, '#ffffff');
      draw(g, cloudB, ((40 + t * 4 + cam * 0.2) % 380) - 40, 18);
      draw(g, cloudS, ((180 + t * 6 + cam * 0.2) % 380) - 40, 34);
      draw(g, cloudS, ((300 + t * 3 + cam * 0.2) % 380) - 40, 12);
      g.drawImage(sea, 0, 96);
      drawWrap(g, waves, t * 10, 96);
      drawWrap(g, waves, -t * 6 + 5, 106);
      g.drawImage(pier, Math.round(cam * 0.4), 92);
      // Gulls wheeling
      for (let i = 0; i < 3; i++) {
        const a = t * 0.8 + i * 2.1;
        draw(g, gulls[Math.floor(t * 5 + i) % 2], 120 + Math.cos(a) * (30 + i * 10) + cam * 0.3, 52 + Math.sin(a * 1.3) * 8 + i * 6);
      }
      g.drawImage(street, 0, 120);
      // Palms on the promenade
      for (const [px, ph] of [[24, 0], [116, 2]]) {
        const x = px + Math.round(cam * 0.8);
        const sway = Math.round(Math.sin(t * 1.5 + ph) * 1);
        for (let k = 0; k < 26; k++) R(g, x + Math.round((k / 26) ** 2 * (3 + sway)), 136 - k, 3, 1, k % 3 ? palmTrunk : '#6a4a2a');
        draw(g, crowns[Math.floor(t * 2 + ph) % 2], x - 7 + 3 + sway, 106);
      }
      for (const lx of [176, 236, 296]) {
        const x = lx + Math.round(cam * 0.8);
        R(g, x, 104, 2, 24, '#3a4048'); R(g, x - 3, 103, 8, 2, '#3a4048'); R(g, x - 2, 105, 6, 2, '#f8f0c0');
        R(g, x - 1, 127, 4, 1, '#2a3038');
      }
      // Car parked in the street; the water climbs over its wheels
      const cx = 168 + Math.round(cam);
      drawCar(g, car, wheels, cx, 150, 0);
      // Flood water over the street: shallow, sky-coloured, rising
      const fy = Math.round(lerp(178, 159, flood));
      g.globalAlpha = 0.78;
      R(g, 0, fy, W, H - fy, '#3a7ab8');
      g.globalAlpha = 1;
      drawWrap(g, waves, t * 16, fy - 1);
      for (let i = 0; i < 6; i++) R(g, ((i * 61 + t * 12) % (W + 20)) - 10, fy + 6 + i * 5, 8, 1, '#a8d8f8');
      for (const p of ripples) if (p.y > fy + 2) R(g, p.x - (p.t > 0.4 ? 1 : 0), p.y, p.t > 0.4 ? 3 : 1, 1, '#c8ecff');

      // Family stands on the bench by the wall, above the water
      R(g, 96 + cam, 134, 56, 3, '#8a6a44'); R(g, 98 + cam, 137, 2, 4, '#5a4028'); R(g, 148 + cam, 137, 2, 4, '#5a4028');
      drawFamily(g, fam, 102 + cam, 134, 'idle', { t, gap: 11 });
      // Spray over the seawall
      for (const p of spray) R(g, p.x, p.y, p.t < 0.6 ? 2 : 1, p.t < 0.6 ? 2 : 1, p.t < 0.8 ? '#ffffff' : '#a8d8f8');
    },
  };
  return scene;
}
