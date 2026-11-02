/**
 * Urban — cities along the route. Variants:
 *   downtown    a pale distant skyline behind a street of mixed towers (brick,
 *               glass, concrete) with rooftop tanks, antennas and billboards;
 *               windows light up at dusk/night; street lamps along the curb
 *   suburb      rows of houses with lawns, picket fences, trees, mailboxes and
 *               driveways under a water tower on the hill
 *   industrial  factory sheds with sawtooth roofs, tanks and smokestacks
 *               trailing smoke, power pylons, a chain-link fence, and a freight
 *               train rolling past on the rail line by the road
 */

import { W, R, rng, ridge, strip, draw, drawPuff, text, textWidth } from '../../kit.js';
import { INK, roundTreeSprite, houseSprite, carSprite } from '../../sprites.js';
import { wrapX } from './common.js';

export const VARIANTS = ['downtown', 'suburb', 'industrial'];

const MW = 960;
const FAR_SPEED = 0.06, MID_SPEED = 0.3, NEAR_SPEED = 0.75;

/** A building with a window grid. Returns window rects for the lights layer. */
function tower(g, x, baseY, w, h, wall, edge, glass, opts = {}) {
  const top = baseY - h;
  R(g, x - 1, top - 1, w + 2, h + 1, INK);
  R(g, x, top, w, h, wall);
  R(g, x, top, 1, h, edge);
  R(g, x + w - 2, top, 2, h, opts.shade || INK);
  R(g, x, top, w, 2, opts.cap || edge);
  const wins = [];
  const ww = opts.ww || 2, wh = opts.wh || 3, sx = opts.sx || 4, sy = opts.sy || 5;
  for (let y = top + 4; y < baseY - 6; y += sy) {
    for (let xx = x + 3; xx < x + w - 3; xx += sx) {
      R(g, xx, y, ww, wh, glass);
      wins.push([xx, y, ww, wh]);
    }
  }
  return wins;
}

export function build(k) {
  const { variant, ROAD_TOP } = k;
  const r = rng(variant.length * 313 + 11);
  const glow = ['#ffe8a0', '#ffd870', '#fff4c8', '#ffc860'];

  let far, farLights = null, farY, mid, midLights, MH, near, nearLights = null, NH;
  const live = { stacks: [], beacons: [] };

  if (variant === 'downtown') {
    // ── Far skyline ─────────────────────────────────────────────────────────
    const FH = 72; farY = ROAD_TOP - FH - 4;
    const fw = [];
    far = strip(640, FH, (g, w) => {
      const fr = rng(21);
      for (let x = 0; x < w;) {
        const bw = fr.int(14, 30), bh = fr.int(24, 68);
        const col = fr.pick(['#9aaac4', '#8a9cba', '#a8b6cc']);
        R(g, x, FH - bh, bw, bh, col);
        R(g, x, FH - bh, 1, bh, '#c0ccdc');
        if (fr() < 0.3) { R(g, x + Math.floor(bw / 2), FH - bh - 6, 1, 6, '#7a8aa8'); live.beacons.push({ x: x + Math.floor(bw / 2), y: FH - bh - 7, layer: 'far' }); }
        if (fr() < 0.25) { R(g, x + 2, FH - bh - 3, bw - 4, 3, col); }
        for (let y = FH - bh + 3; y < FH - 2; y += 3) for (let xx = x + 2; xx < x + bw - 2; xx += 3) {
          R(g, xx, y, 1, 1, '#7a8cac');
          if (fr() < 0.35) fw.push([xx, y]);
        }
        x += bw + fr.int(0, 3);
      }
    });
    farLights = strip(640, FH, (g) => { for (const [x, y] of fw) R(g, x, y, 1, 1, '#f0d890'); });

    // ── Mid street of towers ────────────────────────────────────────────────
    MH = 62;
    const wins = [];
    mid = strip(MW, MH, (g) => {
      const base = MH - 2;
      const kinds = [
        { wall: '#a85a3a', edge: '#c8784a', glass: '#4a6a8a', shade: '#7a3e28', cap: '#8a8a8a' },                // brick
        { wall: '#9a9aa4', edge: '#c0c0c8', glass: '#3a5a7a', shade: '#6a6a74', cap: '#b0b0b8' },                // concrete
        { wall: '#4a6a8a', edge: '#8ab0d0', glass: '#a8d0f0', shade: '#2a4a6a', cap: '#6a8aaa', sx: 3, sy: 4 },  // glass
        { wall: '#c8a878', edge: '#e8d0a0', glass: '#4a5a6a', shade: '#8a7050', cap: '#a88a5a' },                // sandstone
      ];
      let x = 0;
      while (x < MW - 30) {
        const kd = r.pick(kinds);
        const bw = Math.min(r.int(26, 54), MW - 4 - x), bh = r.int(26, 58);
        for (const wn of tower(g, x, base, bw, bh, kd.wall, kd.edge, kd.glass, kd)) wins.push(wn);
        const top = base - bh;
        // Rooftop clutter
        const roll = r();
        if (roll < 0.3) {                                   // water tank
          R(g, x + 6, top - 9, 8, 6, '#6a4a2a'); R(g, x + 6, top - 9, 8, 1, '#8a6a3a'); R(g, x + 5, top - 10, 10, 1, '#4a3a2a');
          R(g, x + 7, top - 3, 1, 3, '#3a3a40'); R(g, x + 12, top - 3, 1, 3, '#3a3a40');
        } else if (roll < 0.5) {                            // antenna
          R(g, x + Math.floor(bw / 2), top - 12, 1, 12, '#5a5a62'); R(g, x + Math.floor(bw / 2) - 2, top - 8, 5, 1, '#5a5a62');
          live.beacons.push({ x: x + Math.floor(bw / 2), y: top - 13, layer: 'mid' });
        } else if (roll < 0.68 && bw > 34) {                // billboard
          const bx = x + 3, by = top - 14, bb = bw - 6;
          R(g, bx + 3, by + 10, 1, 4, '#3a3a40'); R(g, bx + bb - 4, by + 10, 1, 4, '#3a3a40');
          R(g, bx - 1, by - 1, bb + 2, 12, INK);
          const [bgc, fg] = r.pick([['#e8c040', '#c83a2a'], ['#3a8ae8', '#ffffff'], ['#e85a8a', '#ffffff'], ['#2ab08a', '#ffffff']]);
          R(g, bx, by, bb, 10, bgc);
          const word = r.pick(['EAT', 'COLA', 'NEWS', 'SALE', 'GAS', 'HOTEL']);
          if (textWidth(word) < bb - 2) text(g, word, bx + bb / 2, by + 2, { align: 'center', color: fg });
        }
        // Street level: awnings and doors
        if (r() < 0.6) {
          const aw = r.pick(['#c83a2a', '#2a6ab0', '#2a8a5a', '#e8a830']);
          R(g, x + 2, base - 9, bw - 4, 3, aw);
          for (let i = 0; i < bw - 4; i += 3) R(g, x + 2 + i, base - 6, 2, 1, aw);
        }
        R(g, x + Math.floor(bw / 2) - 2, base - 6, 4, 6, '#2a2228');
        x += bw + r.int(1, 6);
      }
      R(g, 0, MH - 2, MW, 2, '#7a7a80');
    });
    midLights = strip(MW, MH, (g) => {
      const lr = rng(3);
      for (const [x, y, w, h] of wins) if (lr() < (k.night ? 0.55 : 0.35)) R(g, x, y, w, h, lr.pick(glow));
    });

    // ── Near: curb with street lamps, planters, hydrants ───────────────────
    NH = 28;
    near = strip(480, NH, (g, w) => {
      R(g, 0, NH - 5, w, 5, '#a8a8ae'); R(g, 0, NH - 5, w, 1, '#c8c8ce');
      for (let x = 0; x < w; x += 12) R(g, x, NH - 4, 1, 4, '#8a8a90');
      for (let x = 20; x < w; x += 96) {
        R(g, x, NH - 27, 2, 22, '#3a3a44'); R(g, x, NH - 27, 7, 2, '#3a3a44'); R(g, x + 5, NH - 26, 4, 2, '#5a5a62');
        R(g, x - 1, NH - 6, 4, 1, '#2a2a34');
      }
      for (let x = 66; x < w; x += 96) {          // tree in a planter
        R(g, x, NH - 8, 10, 3, '#8a7a6a'); R(g, x + 4, NH - 14, 2, 6, '#5a3a20');
        R(g, x, NH - 22, 10, 9, '#3a8a3a'); R(g, x + 1, NH - 23, 8, 1, '#5aaa4a'); R(g, x, NH - 22, 1, 9, INK); R(g, x + 9, NH - 22, 1, 9, INK);
      }
      for (let x = 44; x < w; x += 192) { R(g, x, NH - 9, 3, 4, '#c83a2a'); R(g, x - 1, NH - 8, 5, 1, '#a82a1e'); }
    });
    nearLights = strip(480, NH, (g, w) => {
      for (let x = 20; x < w; x += 96) { R(g, x + 5, NH - 25, 4, 2, '#fff4c8'); R(g, x + 3, NH - 23, 8, 1, '#ffe8a033'); }
    });
  } else if (variant === 'suburb') {
    const FH = 54; farY = ROAD_TOP - FH - 20;
    far = strip(640, FH, (g, w, h) => {
      const tops = ridge(g, w, h, { amp: 22, base: h, seed: 17, color: '#7aa07a', hi: '#9ac08a' });
      // Tree line on the ridge
      for (let x = 0; x < w; x += 3) R(g, x, tops[x] - 3, 3, 4, '#5a8a5a');
      // Water tower on the hill
      for (const tx of [150, 470]) {
        const ty = tops[tx] - 2;
        R(g, tx - 6, ty - 20, 1, 20, '#8a8a92'); R(g, tx + 5, ty - 20, 1, 20, '#8a8a92'); R(g, tx - 1, ty - 18, 1, 18, '#8a8a92');
        R(g, tx - 9, ty - 30, 19, 10, '#c8ccd4'); R(g, tx - 8, ty - 32, 17, 2, '#a8acb4'); R(g, tx - 9, ty - 21, 19, 1, '#8a8e96');
        R(g, tx - 7, ty - 27, 15, 3, '#3a7ac8');
      }
    });
    MH = 40;
    const tree = roundTreeSprite();
    const pals = [
      { R: '#a83a2a', r: '#7a2a1e', W: '#e8d8b0', w: '#c0b088', D: '#6a4020', G: '#ffd870', g: '#90b8d8', C: '#6a6a70' },
      { R: '#3a5a8a', r: '#2a4268', W: '#f0ece0', w: '#c8c4b8', D: '#7a3a2a', G: '#ffd870', g: '#90b8d8', C: '#7a6a6a' },
      { R: '#5a6a4a', r: '#40503a', W: '#e8e0c8', w: '#c4bca4', D: '#3a5a7a', G: '#ffd870', g: '#90b8d8', C: '#6a6a70' },
      { R: '#7a5a8a', r: '#5a4068', W: '#f8f0e8', w: '#d0c8c0', D: '#a83a3a', G: '#ffd870', g: '#90b8d8', C: '#6a6a70' },
    ];
    const houses = pals.map(p => houseSprite(p));
    const parked = carSprite('red');
    const spots = [];
    mid = strip(MW, MH, (g) => {
      R(g, 0, 26, MW, MH - 26, '#6aaa4a');
      R(g, 0, 26, MW, 1, '#8ac860');
      for (let i = 0; i < 160; i++) R(g, r.int(0, MW), r.int(28, MH - 4), 1, 1, r.pick(['#5a9a3e', '#7ab85a']));
      let x = 8;
      while (x < MW - 40) {
        const h = r.pick(houses);
        const hx = x, by = 30;
        draw(g, h, hx, by - h.h);
        spots.push([hx, by - h.h]);
        R(g, hx + 13, by, 4, MH - by - 4, '#b8b8b0');              // front path / driveway
        if (r() < 0.4) draw(g, parked, hx + 26, by - 6);
        if (r() < 0.7) draw(g, tree, hx + 28 + r.int(0, 10), by + 1 - tree.h);
        // Mailbox
        R(g, hx + 2, MH - 10, 1, 5, '#5a4a3a'); R(g, hx, MH - 12, 5, 3, '#3a5a8a');
        x += h.w + r.int(26, 46);
      }
      // White picket fence along the lawns
      for (let px = 0; px < MW; px += 3) {
        if (r() < 0.06) { px += 12; continue; }
        R(g, px, MH - 6, 2, 4, '#f4f4f0'); R(g, px, MH - 7, 1, 1, '#f4f4f0');
      }
      R(g, 0, MH - 5, MW, 1, '#d8d8d0');
    });
    midLights = strip(MW, MH, (g) => {
      const lr = rng(5);
      for (const [hx, hy] of spots) {
        if (lr() < 0.8) R(g, hx + 8, hy + 9, 2, 2, lr.pick(glow));
        if (lr() < 0.7) R(g, hx + 18, hy + 9, 2, 2, lr.pick(glow));
      }
    });
    NH = 12;
    near = strip(480, NH, (g, w) => {
      R(g, 0, NH - 6, w, 6, '#b8b8b4'); R(g, 0, NH - 6, w, 1, '#d8d8d4');
      for (let x = 0; x < w; x += 16) R(g, x, NH - 5, 1, 5, '#9a9a96');
      // Low hedge
      for (let x = 0; x < w; x++) { const hh = 4 + Math.round(Math.sin(x * 0.4) * 1); if (x % 60 < 46) R(g, x, NH - 6 - hh, 1, hh, x % 2 ? '#3a7a34' : '#468a3c'); }
      for (let x = 0; x < w; x += 7) R(g, x, NH - 10, 1, 1, '#6aaa52');
    });
  } else {
    // ── Industrial ──────────────────────────────────────────────────────────
    const FH = 60; farY = ROAD_TOP - FH - 10;
    far = strip(640, FH, (g, w) => {
      const fr = rng(29);
      // Distant plant silhouettes
      for (let x = 0; x < w;) {
        const bw = fr.int(20, 50), bh = fr.int(10, 26);
        R(g, x, FH - bh, bw, bh, '#8a8a9c');
        if (fr() < 0.5) R(g, x + fr.int(2, bw - 6), FH - bh - fr.int(10, 24), 4, 30, '#7a7a8c');
        if (fr() < 0.2) {                                   // cooling tower
          for (let y = 0; y < 26; y++) { const hw = Math.round(10 - Math.sin((y / 26) * Math.PI) * 3); R(g, x + 12 - hw, FH - 26 + y, hw * 2, 1, '#9a9aaa'); }
        }
        x += bw + fr.int(4, 20);
      }
      // Pylons with sagging lines
      const px = [40, 200, 360, 520];
      for (const p of px) {
        for (let y = 0; y < 34; y++) { const hw = Math.round(1 + y * 0.12); R(g, p - hw, FH - 34 + y, 1, 1, '#6a6a7a'); R(g, p + hw, FH - 34 + y, 1, 1, '#6a6a7a'); }
        R(g, p - 6, FH - 30, 13, 1, '#6a6a7a'); R(g, p - 4, FH - 24, 9, 1, '#6a6a7a');
      }
      for (let i = 0; i < px.length; i++) {
        const a = px[i], b = px[(i + 1) % px.length] + (i === px.length - 1 ? w : 0);
        for (let x = a; x < b; x++) { const u = (x - a) / (b - a); R(g, x % w, FH - 30 + Math.round(Math.sin(u * Math.PI) * 5), 1, 1, '#5a5a6a'); }
      }
    });
    MH = 58;
    const wins = [];
    mid = strip(MW, MH, (g) => {
      const base = MH - 2;
      let x = 0;
      while (x < MW - 30) {
        const roll = r();
        if (roll < 0.45) {
          // Sawtooth-roof shed
          const bw = Math.min(r.int(50, 90), MW - 4 - x), bh = r.int(16, 24);
          R(g, x - 1, base - bh - 1, bw + 2, bh + 1, INK);
          R(g, x, base - bh, bw, bh, '#a8644a'); R(g, x, base - bh, bw, 1, '#c8805a');
          for (let tx = x; tx < x + bw - 8; tx += 10) {
            for (let i = 0; i < 8; i++) R(g, tx + i, base - bh - i, 1, i + 1, '#7a7a84');
            R(g, tx + 8, base - bh - 8, 2, 8, '#a8c8e0');
          }
          for (let wx = x + 4; wx < x + bw - 6; wx += 8) { R(g, wx, base - bh + 5, 5, 4, '#3a3a44'); wins.push([wx, base - bh + 5, 5, 4]); }
          R(g, x + 6, base - 9, 12, 9, '#5a5a62'); for (let y = base - 8; y < base; y += 2) R(g, x + 6, y, 12, 1, '#6a6a74');
          x += bw + r.int(4, 12);
        } else if (roll < 0.7) {
          // Smokestack pair beside a boiler house
          const bw = 30, bh = 22;
          R(g, x - 1, base - bh - 1, bw + 2, bh + 1, INK); R(g, x, base - bh, bw, bh, '#8a8a92'); R(g, x, base - bh, bw, 2, '#a8a8b0');
          for (let wx = x + 3; wx < x + bw - 4; wx += 6) { R(g, wx, base - bh + 6, 3, 3, '#3a3a44'); wins.push([wx, base - bh + 6, 3, 3]); }
          for (const [sx, sh] of [[x + 6, 50], [x + 18, 42]]) {
            if (base - sh < 2) continue;
            R(g, sx - 1, base - sh - 1, 7, sh + 1, INK); R(g, sx, base - sh, 5, sh, '#b0a8a0'); R(g, sx, base - sh, 1, sh, '#d0c8c0');
            for (let y = base - sh + 3; y < base - 4; y += 9) R(g, sx, y, 5, 2, '#c84a3a');
            live.stacks.push({ x: sx + 2, y: base - sh - 1 });
            live.beacons.push({ x: sx + 2, y: base - sh - 2, layer: 'mid' });
          }
          x += bw + r.int(6, 14);
        } else {
          // Storage tanks with stairs
          const n = r.int(1, 3);
          for (let i = 0; i < n; i++) {
            const tx = x + i * 22, th = r.int(14, 22);
            R(g, tx - 1, base - th - 2, 20, th + 2, INK); R(g, tx, base - th, 18, th, '#c8ccd0');
            R(g, tx, base - th - 1, 18, 2, '#e0e4e8'); R(g, tx + 14, base - th, 4, th, '#a8acb0');
            for (let s = 0; s < th; s += 2) R(g, tx + 2 + Math.round(s * 0.5), base - s - 1, 2, 1, '#6a6a72');
          }
          R(g, x, base - 6, n * 22, 1, '#6a6a72');           // pipe run
          x += n * 22 + r.int(8, 16);
        }
      }
      R(g, 0, MH - 2, MW, 2, '#6a6a6a');
    });
    midLights = strip(MW, MH, (g) => {
      const lr = rng(7);
      for (const [x, y, w, h] of wins) if (lr() < 0.6) R(g, x, y, w, h, lr.pick(['#ffb050', '#ffc870', '#ffe0a0']));
    });
    // Near: chain-link fence and the rail line
    NH = 22;
    near = strip(480, NH, (g, w) => {
      R(g, 0, NH - 4, w, 4, '#7a6e64');                         // ballast
      for (let x = 0; x < w; x += 5) R(g, x, NH - 3, 3, 1, '#5a4a3a');   // ties
      R(g, 0, NH - 5, w, 1, '#b8b8c0'); R(g, 0, NH - 2, w, 1, '#9a9aa2');
      // Chain-link: open diamond mesh behind the tracks
      for (let x = 0; x < w; x++) for (let y = 2; y < NH - 7; y++) if ((x + y) % 4 === 0 || (x - y + 400) % 4 === 0) { if ((x + y) % 8 < 2) R(g, x, y, 1, 1, '#9aa0a8'); }
      R(g, 0, 1, w, 1, '#8a9098');
      for (let x = 0; x < w; x += 40) { R(g, x, 0, 2, NH - 7, '#6a7078'); for (let i = 0; i < 6; i++) R(g, x - 3 + i, i % 2 === 0 ? 0 : -1, 1, 1, '#6a7078'); }
    });
  }

  // Freight train (industrial) — car palette shaded once
  const trainCols = ['#8a3a2a', '#2a5a8a', '#c88a2a', '#3a6a3a', '#5a5a62'].map(c => k.shade(c));
  const train = {
    body: k.shade('#d8b030'), hi: k.shade('#e0e0e0'), stripe: k.shade('#2a2a30'), win: k.shade('#a8d8f0'), wheel: k.shade('#1a1a1e'),
    cars: Array.from({ length: 9 }, (_, i) => ({ c: trainCols[i % trainCols.length], tank: i % 3 === 1 })),
  };
  const smoke = k.shade('#b8b4b0'), smokeLit = k.shade('#d8d4d0');
  const MID_Y = ROAD_TOP - MH - 2, NEAR_Y = ROAD_TOP - NH;

  const pal = {
    downtown: { ground: '#7a7a80', dust: '#9a9aa0', verge: { base: '#9a9aa0', tuft: '#8a8a90', hi: '#b8b8be' }, fore: { base: '#a8a8ae', dark: '#98989e', detail: '#c0c0c6', flowers: [] } },
    suburb: { ground: '#6aaa4a', dust: '#a8a090', verge: { base: '#5a9a3e', tuft: '#4a8a30', hi: '#7ab85a' }, fore: { base: '#5a9a3e', dark: '#4a8a30', detail: '#8ac860' } },
    industrial: { ground: '#6a6a6a', dust: '#8a8478', verge: { base: '#7a7468', tuft: '#5a5448', hi: '#9a9488' }, fore: { base: '#6e6a62', dark: '#5e5a52', detail: '#8a8478', flowers: [] } },
  }[variant];

  return {
    ground: pal.ground,
    dust: pal.dust,
    layers: [
      { c: far, y: farY, speed: FAR_SPEED, lights: farLights },
      { c: mid, y: MID_Y, speed: MID_SPEED, lights: midLights },
      { c: near, y: NEAR_Y, speed: NEAR_SPEED, lights: nearLights },
    ],
    road: variant === 'suburb'
      ? { asphalt: '#3a383e', grain: '#444248', edge: '#d8d8d0', dash: '#e8c040', lip: '#2a282e' }
      : { asphalt: '#28282e', grain: '#323238', edge: '#d0d0d8', dash: variant === 'downtown' ? '#f0f0f0' : '#e8c040', lip: '#1c1c22' },
    verge: pal.verge,
    fore: pal.fore,
    animate(g, t, run, s) {
      // Red aviation beacons blink at dusk/night
      if (s.lit) {
        for (const b of live.beacons) {
          if (Math.floor(t * 1.5 + b.x * 0.1) % 2) continue;
          const x = b.layer === 'far' ? wrapX(b.x, run, FAR_SPEED, 640) + 40 : wrapX(b.x, run, MID_SPEED, MW) + 40;
          const y = (b.layer === 'far' ? farY : MID_Y) + b.y;
          if (x > -2 && x < W + 2) R(g, x, y, 1, 1, '#ff3a2a');
        }
      }
      if (variant !== 'industrial') return;
      // Smoke drifting off the stacks
      for (const st of live.stacks) {
        const x = wrapX(st.x, run, MID_SPEED, MW) + 40;
        if (x < -40 || x > W + 10) continue;
        for (let j = 0; j < 6; j++) {
          const a = (t * 0.35 + j / 6 + st.x * 0.003) % 1;
          drawPuff(g, x + a * 26, MID_Y + st.y - a * 30, 2 + a * 6, a < 0.4 ? smokeLit : smoke, null, 0.5);
        }
      }
      // Freight train on the rail line (passes every 40 s, rolls left to right)
      const cycle = 40, ph = (t % cycle) / cycle;
      const len = 30 + train.cars.length * 26;
      const tx = -len + ph * (W + len) * 2.2;
      if (tx < W && tx + len > 0) {
        const ry = NEAR_Y + NH - 5;
        let x = tx + len - 30;
        // Locomotive (leading, at the right)
        R(g, x - 1, ry - 15, 31, 13, INK);
        R(g, x, ry - 14, 29, 11, train.body); R(g, x + 22, ry - 18, 8, 5, train.body); R(g, x + 21, ry - 19, 10, 1, INK);
        R(g, x + 24, ry - 17, 4, 3, train.win); R(g, x, ry - 9, 29, 2, train.stripe);
        for (const wx of [3, 9, 18, 24]) R(g, x + wx, ry - 3, 3, 3, train.wheel);
        if (s.lit) R(g, x + 29, ry - 12, 1, 2, '#fff4c8');
        x -= 26;
        for (const c of train.cars) {
          if (c.tank) {
            R(g, x, ry - 12, 25, 9, INK); R(g, x + 1, ry - 11, 23, 7, c.c); R(g, x + 1, ry - 11, 23, 1, train.hi);
          } else {
            R(g, x, ry - 15, 25, 12, INK); R(g, x + 1, ry - 14, 23, 10, c.c);
            R(g, x + 9, ry - 13, 1, 8, train.stripe); R(g, x + 15, ry - 13, 1, 8, train.stripe); R(g, x + 1, ry - 14, 23, 1, train.hi);
          }
          for (const wx of [2, 19]) R(g, x + wx, ry - 3, 4, 3, train.wheel);
          R(g, x + 24, ry - 7, 2, 1, train.stripe);
          x -= 26;
        }
      }
    },
  };
}

