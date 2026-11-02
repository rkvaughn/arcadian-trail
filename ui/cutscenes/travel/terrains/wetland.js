/**
 * Wetland — a causeway across the swamp. Variants:
 *   bayou     bald cypress hung with moss over dark water, lily pads, a heron
 *   marsh     golden reed beds, open blue channels, a boardwalk, ducks
 *   mangrove  arching mangrove roots over teal water, a white egret
 * Water shimmers live; cattails sway in the foreground.
 */

import { W, H, R, rng, ridge, strip, ditherFill, drawPuff, sprite, draw } from '../../kit.js';
import { INK } from '../../sprites.js';

export const VARIANTS = ['bayou', 'marsh', 'mangrove'];

const MW = 960;
const MH = 42;
const WATER_Y = 28;            // water line inside the mid layer

const PAL = {
  bayou:    { water: '#2a3c34', deep: '#22302a', shine: '#6a8a74', far: '#6a8a84', far2: '#3e5a4a', ground: '#2e4430', near: '#3a5a32' },
  marsh:    { water: '#3a6e90', deep: '#2e5a78', shine: '#9ac8e0', far: '#8aa8b8', far2: '#7a8a5a', ground: '#8a8a48', near: '#9a9040' },
  mangrove: { water: '#2a8a8a', deep: '#207070', shine: '#8ae0d8', far: '#8ab8c0', far2: '#3e7a50', ground: '#3a6a3a', near: '#4a7a3a' },
};

function sx(lx, run, speed, period, margin = 40) {
  let x = ((lx - run * speed) % period + period) % period;
  if (x > W + margin) x -= period;
  return x;
}

function cypress(g, x, base, h, r) {
  // Flared buttress trunk
  const top = base - h;
  for (let y = top + 8; y < base; y++) {
    const flare = Math.max(0, (y - (base - 7))) ;
    const hw = 1 + Math.floor(flare * 0.8);
    R(g, x - hw - 1, y, hw * 2 + 3, 1, INK);
    R(g, x - hw, y, hw * 2 + 1, 1, '#5a4a3a');
    R(g, x - hw, y, 1, 1, '#7a6a52');
  }
  // Flat layered canopy
  for (let i = 0; i < 4; i++) {
    const cx = x + r.int(-6, 6), cy = top + 3 + i * 3;
    drawPuff(g, cx, cy, r.int(4, 7), i % 2 ? '#2e5a34' : '#3a6a3a', '#5a8a4a', 0.35);
  }
  // Spanish moss
  for (let m = 0; m < 7; m++) {
    const mx = x + r.int(-9, 9), my = top + r.int(6, 12), ml = r.int(3, 8);
    R(g, mx, my, 1, ml, m % 2 ? '#9aa88a' : '#8a9a7a');
  }
}

function mangrove(g, x, base, r) {
  // Canopy first, then the arching prop roots reaching down into the water
  const top = base - 26;
  for (let i = 0; i < 6; i++) drawPuff(g, x + r.int(-10, 10), top + r.int(0, 6), r.int(4, 7), i % 2 ? '#2e7a3a' : '#3a8a40', '#6ac060', 0.3);
  R(g, x - 1, top + 6, 3, 8, '#6a5438');
  for (let i = -4; i <= 4; i++) {
    const span = 10 + Math.abs(i) * 2;
    const dir = i < 0 ? -1 : 1;
    const reach = 2 + Math.abs(i) * 2.6;
    let px = x, py = top + 12;
    for (let s = 0; s <= span; s++) {
      const nx = Math.round(x + dir * reach * Math.sin((s / span) * Math.PI * 0.5));
      const ny = Math.round(top + 12 + (s / span) * (base - top - 12));
      R(g, nx, ny, 1, 1, '#7a6448');
      if (nx !== px && Math.abs(ny - py) < 2) R(g, nx, ny + 1, 1, 1, '#4a3a2a');
      px = nx; py = ny;
    }
  }
}

export function build(k) {
  const { variant, ROAD_TOP } = k;
  const P = PAL[variant];
  const r = rng(variant.length * 97 + 3);

  const far = strip(640, 40, (g, w, h) => ridge(g, w, h, { amp: 12, base: h, seed: 71, color: P.far, hi: '#b0c8cc' }));
  // Distant treeline: soft rounded crowns (bayou / mangrove) or low reed flats (marsh)
  const far2 = strip(720, 22, (g, w, h) => {
    const tr = rng(13);
    R(g, 0, h - 4, w, 4, P.far2);
    if (variant === 'marsh') {
      for (let x = 0; x < w; x += tr.int(1, 3)) { const th = tr.int(1, 4); R(g, x, h - 4 - th, 1, th, P.far2); }
      return;
    }
    for (let x = 0; x < w; x += tr.int(4, 8)) {
      const rad = tr.int(3, 6), y = h - 4 - tr.int(1, 6);
      for (const dx of [0, -w, w]) {
        drawPuff(g, x + dx, y, rad, P.far2, null, 0.25);
        if (variant === 'bayou' && tr() < 0.5) R(g, x + dx, y - rad - 2, 1, 3, P.far2);
      }
    }
  });

  const mid = strip(MW, MH, (g) => {
    // Water fills the lower part, with darker depth bands
    R(g, 0, WATER_Y, MW, MH - WATER_Y, P.water);
    R(g, 0, WATER_Y + 8, MW, MH - WATER_Y - 8, P.deep);
    R(g, 0, WATER_Y, MW, 1, P.shine);
    if (variant === 'bayou') {
      R(g, 0, WATER_Y - 3, MW, 3, '#2a4430');
      for (let x = 6; x < MW; x += r.int(18, 34)) {
        const h = r.int(22, 30), seed = rng(x + 5);
        for (const dx of [0, -MW, MW]) { cypress(g, x + dx, WATER_Y + 2, h, rng(x * 3)); }
        // Reflection
        for (let y = WATER_Y + 2; y < MH; y += 2) R(g, x - 1, y, 3, 1, '#1a2620');
        void seed;
      }
      for (let i = 0; i < 70; i++) {                          // lily pads
        const px = r.int(0, MW - 4), py = r.int(WATER_Y + 3, MH - 2);
        R(g, px, py, 3, 1, '#4a7a3a'); R(g, px + 1, py, 1, 1, '#2a4a2a');
        if (i % 9 === 0) R(g, px + 1, py - 1, 1, 1, '#f0c8e0');
      }
    } else if (variant === 'marsh') {
      // Reed islands between open channels; a boardwalk on posts
      let x = 0;
      while (x < MW) {
        const w = r.int(40, 110);
        if (r() < 0.7) {
          for (let rx = x; rx < x + w; rx++) {
            const th = 6 + Math.round(Math.sin(rx * 0.2) * 2 + r() * 6);
            R(g, rx, WATER_Y + 4 - th, 1, th, rx % 3 ? '#b8a050' : '#8a8a3a');
            if (rx % 5 === 0) R(g, rx, WATER_Y + 4 - th - 2, 1, 3, '#6a4a2a');
          }
        }
        x += w + r.int(20, 50);
      }
      for (const bx of [200, 640]) {
        R(g, bx, WATER_Y - 3, 120, 2, '#9a7a4a'); R(g, bx, WATER_Y - 1, 120, 1, '#6a4a2a');
        for (let px = bx; px < bx + 120; px += 10) R(g, px, WATER_Y - 1, 1, 6, '#5a3a20');
        R(g, bx + 50, WATER_Y - 12, 12, 9, '#7a5a3a'); R(g, bx + 49, WATER_Y - 14, 14, 2, '#5a3a24');
      }
    } else {
      // Shadowy mangrove interior behind the stilt roots
      R(g, 0, WATER_Y - 12, MW, 12, '#24563e');
      for (let x = 0; x < MW; x += 3) R(g, x, WATER_Y - 12 - (x % 7 === 0 ? 2 : x % 5 === 0 ? 1 : 0), 3, 2, '#24563e');
      for (let x = 8; x < MW; x += r.int(18, 30)) for (const dx of [0, -MW, MW]) mangrove(g, x + dx, WATER_Y + 3, rng(x * 7));
      for (let x = 0; x < MW; x += 4) if (r() < 0.4) R(g, x, WATER_Y + r.int(4, 12), 2, 1, '#4aa8a0');
    }
  });

  const near = strip(480, 12, (g, w) => {
    R(g, 0, 7, w, 5, P.near);
    R(g, 0, 11, w, 1, P.ground);
    const tr = rng(21);
    for (let x = 0; x < w; x += tr.int(1, 3)) {
      const th = tr.int(3, 8);
      R(g, x, 12 - th, 1, th, variant === 'marsh' ? '#c8b060' : tr() < 0.5 ? '#4a8a3a' : '#3a6a2e');
    }
  });

  // Foreground: the swamp on the near side of the causeway
  const fore = strip(400, H - k.ROAD_BOT - 10, (g, w, h) => {
    R(g, 0, 0, w, h, P.water);
    R(g, 0, Math.round(h * 0.55), w, h, P.deep);
    R(g, 0, 0, w, 3, P.near);
    R(g, 0, 3, w, 1, P.shine);
    const tr = rng(29);
    for (let i = 0; i < 26; i++) {
      const px = tr.int(0, w - 6), py = tr.int(8, h - 3);
      if (variant === 'bayou') { R(g, px, py, 5, 2, '#4a7a3a'); R(g, px + 2, py, 1, 1, '#2a4a2a'); if (i % 5 === 0) R(g, px + 1, py - 1, 2, 1, '#f0d0e8'); }
      else R(g, px, py, 4, 1, P.shine);
    }
  });

  const lr = rng(41);
  const cattails = Array.from({ length: 12 }, (_, i) => ({ x: i * 58 + lr.int(0, 30), y: lr.int(150, 178), h: lr.int(12, 22), ph: lr.range(0, 6) }));
  const stalk = k.shade(variant === 'marsh' ? '#9a9a40' : '#4a7a32'), head = k.shade('#6a4224'), leaf = k.shade(variant === 'marsh' ? '#c8b860' : '#5aa040');
  const shine = k.shade(P.shine), white = k.shade('#f4f4f0'), heronC = k.shade('#7a8aa0'), duckC = k.shade('#6a4a2a'), duckH = k.shade('#2a7a4a');

  const heron = sprite(['..HH.', '.HHHk', '..H..', '..H..', '.HHH.', 'HHHHH', '.HHH.', '..H..', '..H..', '..H..'], { H: '#7a8aa0', k: '#e0b040' }, { outline: INK });
  const egret = sprite(['..WW.', '.WWWk', '..W..', '..W..', '.WWW.', 'WWWWW', '.WWW.', '..k..', '..k..', '..k..'], { W: '#f4f4f0', k: '#2a2a2a' }, { outline: INK });
  void heronC; void white;

  return {
    ground: P.ground,
    dust: variant === 'marsh' ? '#b0a070' : '#8a9080',
    road: { asphalt: '#3a383e', grain: '#444248', edge: '#c8c4b8', dash: '#e8c040', lip: '#5a5048' },
    layers: [
      { c: far, y: ROAD_TOP - MH - 38, speed: 0.05 },
      { c: far2, y: ROAD_TOP - MH - 12, speed: 0.12 },
      { c: mid, y: ROAD_TOP - MH - 2, speed: 0.32 },
      { c: near, y: ROAD_TOP - 12, speed: 0.75 },
    ],
    verge: { base: P.near, tuft: P.ground, hi: variant === 'marsh' ? '#d8c070' : '#6aa048' },
    fore: { c: fore },
    animate(g, t, run) {
      const wy = ROAD_TOP - MH - 2 + WATER_Y;
      // Shimmer: short light lines drifting over the mid water
      for (let i = 0; i < 18; i++) {
        const x = ((i * 53 - run * 0.32 + Math.sin(t * 0.8 + i) * 6) % (W + 20) + W + 20) % (W + 20) - 10;
        const y = wy + 2 + (i * 7) % (MH - WATER_Y - 3);
        if (Math.floor(t * 3 + i) % 4) R(g, x, y, 3 + (i % 3), 1, shine);
      }
      // Wading bird or ducks, scrolling with the mid layer
      if (variant === 'marsh') {
        for (const dx of [120, 520, 800]) {
          const x = sx(dx + t * 4, run, 0.32, MW), y = wy + 6 + Math.round(Math.sin(t * 2 + dx) * 0.6);
          if (x < -10 || x > W + 10) continue;
          R(g, x, y, 5, 2, duckC); R(g, x + 4, y - 2, 2, 2, duckH); R(g, x + 6, y - 1, 1, 1, '#e0a030');
          R(g, x - 2, y + 2, 9, 1, shine);
        }
      } else {
        const x = sx(variant === 'bayou' ? 380 : 560, run, 0.32, MW);
        if (x > -10 && x < W + 10) {
          const bird = variant === 'bayou' ? heron : egret;
          const dip = Math.floor(t / 3) % 3 === 0 ? 1 : 0;
          draw(g, bird, x, wy - 7 + dip);
          R(g, x - 1, wy + 3, 7, 1, shine);
        }
      }
    },
    front(g, t, run) {
      for (const c of cattails) {
        const x = sx(c.x, run, 1.7, 700);
        if (x < -10 || x > W + 6) continue;
        const sway = Math.sin(t * 1.8 + c.ph) * 1.5;
        for (let y = 0; y < c.h; y++) R(g, Math.round(x + sway * (y / c.h)), c.y - y, 1, 1, stalk);
        R(g, Math.round(x + sway) - 1, c.y - c.h - 4, 3, 5, head);
        R(g, Math.round(x + sway), c.y - c.h - 6, 1, 2, stalk);
        for (let y = 0; y < c.h * 0.6; y++) R(g, Math.round(x + 2 + y * 0.25 + sway * (y / c.h)), c.y - y, 1, 1, leaf);
      }
      for (let i = 0; i < 10; i++) {
        const x = ((i * 71 - run * 1.45 + Math.sin(t + i) * 4) % (W + 20) + W + 20) % (W + 20) - 10;
        const y = k.ROAD_BOT + 14 + (i * 11) % 34;
        if (Math.floor(t * 2.5 + i) % 3) R(g, x, y, 4, 1, shine);
      }
    },
  };
}
