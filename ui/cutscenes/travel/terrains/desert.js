/**
 * Desert — Southwest high desert. Variants:
 *   mesa     banded red buttes and mesas, saguaros, scrub and boulders
 *   dunes    rolling sand dunes with slip faces and wind ripples; sand blows off the crests
 *   route66  cactus flats, an abandoned gas station, a neon motel sign,
 *            telephone poles strung with wire, tumbleweeds bouncing past
 */

import { W, R, rng, ridge, strip, draw, sprite, text } from '../../kit.js';
import { INK, cactusSprite, deadTreeSprite, poleSprite } from '../../sprites.js';
import { wrapX } from './common.js';

export const VARIANTS = ['mesa', 'dunes', 'route66'];

const MW = 960;

/** Flat-topped mesa / butte with strata bands and a shaded right flank. */
function mesa(g, cx, baseY, w, h, c) {
  const slope = h * 0.32;
  for (let i = 0; i < h; i++) {
    const y = baseY - h + i;
    const k = i / h;
    const half = w / 2 - slope + slope * Math.min(1, k * 1.6) + (k > 0.75 ? (k - 0.75) * w * 0.5 : 0);
    const x0 = Math.round(cx - half), x1 = Math.round(cx + half);
    const strata = i % 5 === 2 || i % 7 === 4;
    R(g, x0, y, x1 - x0, 1, strata ? c.strata : c.body);
    R(g, Math.round(x1 - (x1 - x0) * 0.3), y, Math.round((x1 - x0) * 0.3), 1, strata ? c.shadeStrata : c.shade);
    if (i === 0) R(g, x0, y, x1 - x0, 1, c.cap);
    R(g, x0, y, 1, 1, c.cap);
  }
  // Talus apron at the base
  R(g, Math.round(cx - w / 2 - 3), baseY - 2, Math.round(w + 6), 2, c.shade);
  R(g, Math.round(cx - w / 2 - 3), baseY - 2, Math.round(w + 6), 1, c.cap);
}

function rockSprite(big) {
  return big
    ? sprite(['..rrrr...', '.rRRRRr..', 'rRRhRRRr.', 'RRRRRRRRr', 'RRRRRRRRd', '.dddddddd'], { r: '#b07850', R: '#985e3a', h: '#d0986a', d: '#6a3e24' }, { outline: INK })
    : sprite(['.rrr.', 'rRhRr', 'RRRRd', '.ddd.'], { r: '#b07850', R: '#985e3a', h: '#d0986a', d: '#6a3e24' }, { outline: INK });
}

function scrubSprite() {
  return sprite(['.g.g..g.', 'gGg.gGg.', '.gGGGg.g', 'gGGGGGg.', '.dGGGd..'], { g: '#8a9a5a', G: '#6a7a42', d: '#4a5a30' }, { outline: INK });
}

function saguaroSprite() {
  return sprite([
    '.....hG.....', '....hGGg....', '....hGGg....', '....hGGg....', '.hg.hGGg....', 'hGGghGGg..hg',
    'hGGghGGg.hGG', 'hGGghGGghGGg', '.ggGGGGghGGg', '...hGGGGGGg.', '...hGGgggg..', '...hGGg.....',
    '...hGGg.....', '...hGGg.....', '...hGGg.....', '...hGGg.....', '...hGGg.....', '..hhGGgg....',
  ], { G: '#3a8a3a', g: '#2a5a2a', h: '#6aba5a' }, { outline: INK });
}

function gasStation() {
  // Canopy on two posts, a pump, a small shop with a window, a GAS sign
  return sprite([
    '...........................................',
    'RRRRRRRRRRRRRRRRRRRRRRRR...................',
    'WWWWWWWWWWWWWWWWWWWWWWWW...................',
    'rrrrrrrrrrrrrrrrrrrrrrrr.....SSSSSSSSSSSSS.',
    '..p..................p.......SwwwwwSSDDSSS.',
    '..p......PP..........p.......SwwwwwSSDDSSS.',
    '..p.....PPPP.........p.......SwwwwwSSDDSSS.',
    '..p.....PyyP.........p.......SSSSSSSSDDSSS.',
    '..p.....PPPP.........p.......SSSSSSSSDDSSS.',
    '..p.....PPPP.........p.......SSSSSSSSDDSSS.',
    '..p.....PPPP.........p.......sssssssssssss.',
    'ccccccccccccccccccccccccccccccccccccccccccc',
  ], {
    R: '#c84030', W: '#f0e8d8', r: '#8a2a20', p: '#c8c8c8', P: '#d84a3a', y: '#f0d060',
    S: '#d8c8a0', s: '#a89870', w: '#5a7a8a', D: '#6a4a2a', c: '#9a9488',
  }, { outline: INK });
}

export function build(k) {
  const { variant, ROAD_TOP } = k;
  const r = rng(variant.length * 211 + 7);

  // ── Far layer: hazy distant mesas (or a big dune sea) ────────────────────
  const FH = 64;
  const far = strip(640, FH, (g, w, h) => {
    if (variant === 'dunes') {
      ridge(g, w, h, { amp: 22, base: h, seed: 17, color: '#e0b878', hi: '#f8dca8' });
      return;
    }
    // Low ridge first, then mesas, wrapping across the seam
    ridge(g, w, h, { amp: 8, base: h, seed: 23, color: '#b88a8a', hi: '#d0a8a0' });
    const fr = rng(41);
    const cols = { body: '#c08a86', strata: '#b07e7c', shadeStrata: '#9c6c70', cap: '#dcaaa0' };
    for (let x = 20; x < w; x += fr.int(90, 160)) {
      const mw = fr.int(40, 90), mh = fr.int(variant === 'mesa' ? 24 : 14, variant === 'mesa' ? 46 : 26);
      for (const dx of [0, -w, w]) mesa(g, x + dx, h, mw, mh, cols);
    }
  });

  // ── Mid layer: the main desert floor and landmarks ───────────────────────
  const MH = variant === 'route66' ? 44 : 40;
  const cactus = cactusSprite(), sag = saguaroSprite(), rock = rockSprite(true), pebble = rockSprite(false);
  const scrub = scrubSprite(), snag = deadTreeSprite('#7a5a3a', '#9a7a52');
  const pole = poleSprite('#6a4a2a'), station = gasStation();
  const crests = [];
  const mid = strip(MW, MH, (g, w, h) => {
    const floorY = h - 12;
    const place = (spr, x, baseY) => { for (const dx of [0, -w]) draw(g, spr, x + dx, baseY - spr.h); };
    if (variant === 'dunes') {
      R(g, 0, floorY, w, 12, '#e0b070');
      // Dunes: gentle windward (lit) side, steep shaded slip face
      const dr = rng(77);
      const dunes = [];
      for (let x = 0; x < w; x += dr.int(70, 120)) dunes.push({ cx: x, dw: dr.int(80, 140), dh: dr.int(12, 26), base: floorY + dr.int(0, 8) });
      for (const d of dunes) {
        crests.push({ x: d.cx, y: d.base - d.dh });
        for (let x = Math.round(d.cx - d.dw * 0.65); x < d.cx + d.dw * 0.35; x++) {
          const top = x < d.cx
            ? d.base - d.dh * Math.pow(Math.max(0, (x - (d.cx - d.dw * 0.65)) / (d.dw * 0.65)), 1.3)
            : d.base - d.dh * (1 - (x - d.cx) / (d.dw * 0.35));
          const lit = x < d.cx;
          for (const dx of [0, -w, w]) {
            const xx = x + dx;
            if (xx < 0 || xx >= w) continue;
            R(g, xx, Math.round(top), 1, d.base - Math.round(top) + 12, lit ? '#f0cc88' : '#c8925a');
            if (lit) {
              // Wind ripples on the lit face
              for (let y = Math.round(top) + 3; y < d.base + 4; y += 3) {
                if (((xx + Math.round(Math.sin(y * 0.7) * 2)) % 5) === 0) R(g, xx, y, 1, 1, '#d8a868');
              }
            }
            if (Math.abs(x - d.cx) < 1) R(g, xx, Math.round(top), 1, 1, '#fff0c0');
          }
        }
      }
      const sr = rng(5);
      for (let i = 0; i < 9; i++) place(sr() < 0.5 ? snag : scrub, sr.int(20, w - 30), floorY + sr.int(4, 10));
    } else {
      // Desert floor with dithered gravel bands
      R(g, 0, floorY - 2, w, 14, variant === 'mesa' ? '#d0965e' : '#d8aa6a');
      R(g, 0, floorY - 2, w, 1, variant === 'mesa' ? '#e8b07a' : '#f0c888');
      const gr = rng(3);
      for (let i = 0; i < 160; i++) R(g, gr.int(0, w - 2), gr.int(floorY, h - 1), gr.int(1, 2), 1, variant === 'mesa' ? '#b87a48' : '#c09058');
      if (variant === 'mesa') {
        // Near buttes and mesas standing on the floor
        const mr = rng(91);
        const cols = { body: '#c0603a', strata: '#a84e30', shadeStrata: '#7e3a24', cap: '#e08a5a' };
        for (let x = 40; x < w - 20; x += mr.int(150, 240)) {
          const bw = mr.int(26, 70), bh = mr.int(18, 32);
          for (const dx of [0, -w, w]) mesa(g, x + dx, floorY, bw, bh, cols);
        }
        const pr = rng(13);
        for (let x = 10; x < w - 20; x += pr.int(28, 60)) {
          const pick = pr();
          place(pick < 0.35 ? sag : pick < 0.6 ? cactus : pick < 0.8 ? rock : scrub, x, floorY + pr.int(2, 10));
        }
      } else {
        // Route 66: poles every 80 px with sagging wire (period divides 960)
        const top = floorY - pole.h + 2;
        for (let x = 0; x < w; x += 80) draw(g, pole, x, top);
        for (let x = 0; x < w; x++) {
          const u = (x % 80) / 80;
          const sag = Math.round(Math.sin(u * Math.PI) * 5);
          R(g, x + 5, top + 1 + sag, 1, 1, '#2a2020');
          R(g, x + 5, top + 3 + sag, 1, 1, '#2a2020');
        }
        place(station, 150, floorY + 3);
        // Motel sign on a tall post
        const mx = 520;
        R(g, mx + 14, floorY - 34, 2, 36, '#6a6a72');
        R(g, mx - 1, floorY - 40, 34, 13, INK); R(g, mx, floorY - 39, 32, 11, '#2a4a7a'); R(g, mx + 1, floorY - 38, 30, 1, '#5a8ac0');
        text(g, 'MOTEL', mx + 16, floorY - 37, { align: 'center', color: '#e8a0c0' });
        R(g, mx + 4, floorY - 26, 24, 4, '#c8b080'); R(g, mx + 4, floorY - 26, 24, 1, '#e8d8a8');
        // Low motel row behind it
        R(g, mx + 40, floorY - 10, 70, 12, '#e0c8a0'); R(g, mx + 40, floorY - 12, 70, 2, '#a85a3a');
        for (let i = 0; i < 7; i++) { R(g, mx + 44 + i * 10, floorY - 7, 3, 4, '#3a5a6a'); R(g, mx + 48 + i * 10, floorY - 6, 2, 6, '#7a4a2a'); }
        // Billboard
        const bx = 780;
        R(g, bx + 6, floorY - 12, 2, 14, '#5a4a3a'); R(g, bx + 30, floorY - 12, 2, 14, '#5a4a3a');
        R(g, bx - 1, floorY - 29, 40, 18, INK); R(g, bx, floorY - 28, 38, 16, '#f0e0b0');
        R(g, bx + 2, floorY - 26, 12, 12, '#d84a3a'); R(g, bx + 4, floorY - 24, 8, 8, '#f0c040');
        text(g, 'EAT', bx + 26, floorY - 24, { align: 'center', color: '#2a2a2a' });
        const pr = rng(19);
        for (let x = 20; x < w - 20; x += pr.int(24, 50)) {
          if ((x > 140 && x < 200) || (x > 500 && x < 620) || (x > 770 && x < 830)) continue;
          const pick = pr();
          place(pick < 0.3 ? cactus : pick < 0.5 ? sag : pick < 0.75 ? scrub : pebble, x, floorY + pr.int(4, 10));
        }
      }
    }
  });
  // Night lights: shop window, canopy and motel neon
  const lights = variant === 'route66' ? strip(MW, MH, (g, w, h) => {
    const floorY = h - 12;
    R(g, 150 + 30, floorY + 3 - station.h + 4, 5, 3, '#ffe08a');
    R(g, 151, floorY + 3 - station.h + 3, 22, 1, '#fff4c0');
    text(g, 'MOTEL', 520 + 16, floorY - 37, { align: 'center', color: '#ff6ab8' });
    for (let i = 0; i < 7; i += 2) R(g, 520 + 44 + i * 10, floorY - 7, 3, 4, '#ffd070');
  }) : null;

  // ── Near strip just above the road: gravel shoulder, small rocks ──────────
  const near = strip(480, 12, (g, w) => {
    R(g, 0, 5, w, 7, variant === 'dunes' ? '#e8bc7c' : '#c89a62');
    R(g, 0, 5, w, 1, variant === 'dunes' ? '#f8d8a0' : '#e0b480');
    const nr = rng(29);
    for (let i = 0; i < 30; i++) { const x = nr.int(0, w - 3); R(g, x, nr.int(6, 10), nr.int(1, 3), 1, '#8a6040'); }
    for (let i = 0; i < 6; i++) draw(g, pebble, nr.int(0, w - 8), 6);
  });

  // ── Live props ─────────────────────────────────────────────────────────────
  const weeds = Array.from({ length: 3 }, (_, i) => ({ x: 120 + i * 230, base: r.int(150, 172), ph: r.range(0, 6), size: r.int(4, 6) }));
  const big = Array.from({ length: 6 }, (_, i) => ({ x: i * 120 + r.int(0, 50), y: r.int(160, 178), kind: r.int(0, 2) }));
  const weedCol = [k.shade('#8a6a3a'), k.shade('#b08a50'), k.shade('#5a4024')];
  const rockCol = [k.shade('#a06a44'), k.shade('#c88a5a'), k.shade('#6a3e24')];
  const sandCol = k.shade('#fff0c8');
  const devilCol = k.shade('#d8b080');

  return {
    ground: variant === 'dunes' ? '#e8b878' : '#d0a064',
    dust: variant === 'dunes' ? '#f0d098' : '#d8b080',
    road: variant === 'route66'
      ? { asphalt: '#3a3634', grain: '#46403c', edge: '#d8d0b8', dash: '#e8c040', lip: '#2a2420' }
      : { asphalt: '#4a4440', grain: '#56504a', edge: '#e0d4b8', dash: '#e8c850', lip: '#3a3028' },
    layers: [
      { c: far, y: ROAD_TOP - MH - FH + 14, speed: 0.07 },
      { c: mid, y: ROAD_TOP - MH, speed: 0.32, lights },
      { c: near, y: ROAD_TOP - 12, speed: 0.75 },
    ],
    verge: variant === 'dunes' ? { base: '#e0b070', tuft: '#c89858', hi: '#f8d898' } : { base: '#c89058', tuft: '#8a8a4a', hi: '#a8a860' },
    fore: variant === 'dunes'
      ? { base: '#e8bc7a', dark: '#d0a060', detail: '#f8dca0', flowers: [] }
      : { base: '#d09a5c', dark: '#b07a44', detail: '#8a9050', flowers: ['#ffd040', '#ff8a5a'] },
    animate(g, t, run) {
      if (variant === 'dunes') {
        // Sand streaming off the dune crests
        for (const c of crests) {
          const x = wrapX(c.x + 40, run, 0.32, MW);
          if (x < -10 || x > W + 10) continue;
          const y = ROAD_TOP - MH + c.y;
          for (let p = 0; p < 5; p++) {
            const f = ((t * 1.4 + p * 0.21 + c.x * 0.01) % 1);
            R(g, Math.round(x + f * 14), Math.round(y - 1 - f * 4 + Math.sin(t * 7 + p) * 0.6), 1, 1, sandCol);
          }
        }
      } else if (variant === 'mesa') {
        // A dust devil wandering across the far floor
        const x = wrapX(600 + Math.sin(t * 0.2) * 120, run, 0.32, MW);
        if (x > -20 && x < W + 20) {
          const base = ROAD_TOP - 14;
          for (let i = 0; i < 18; i++) {
            const wdt = 1 + i * 0.35;
            const sx = Math.round(x + Math.sin(t * 9 + i * 0.6) * wdt);
            if (((i + Math.floor(t * 10)) % 3) !== 0) R(g, sx, base - i, Math.round(wdt), 1, devilCol);
          }
        }
      }
    },
    front(g, t, run) {
      // Foreground rocks and scrub whipping past
      for (const b of big) {
        const x = wrapX(b.x, run, 1.7, 720);
        if (x < -20 || x > W + 10) continue;
        if (b.kind === 0) {
          R(g, x + 1, b.y - 5, 8, 5, rockCol[0]); R(g, x, b.y - 3, 10, 3, rockCol[0]); R(g, x + 2, b.y - 5, 4, 1, rockCol[1]); R(g, x + 1, b.y - 1, 9, 1, rockCol[2]);
        } else {
          for (let s = 0; s < 6; s++) R(g, x + s * 2, b.y - 3 - (s % 3) * 2, 1, 3 + (s % 3) * 2, weedCol[s % 2]);
        }
      }
      if (variant !== 'route66') return;
      // Tumbleweeds rolling with the wind, bouncing
      for (const w of weeds) {
        const x = wrapX(w.x - t * 40, run, 1.5, 700);
        if (x < -20 || x > W + 10) continue;
        const y = w.base - Math.abs(Math.sin(t * 5 + w.ph)) * 7;
        const a = -t * 6 + w.ph, s = w.size;
        for (let i = 0; i < 14; i++) {
          const ang = a + i * 0.9, rr = s * (0.5 + (i % 3) * 0.25);
          R(g, Math.round(x + Math.cos(ang) * rr), Math.round(y - s + Math.sin(ang) * rr), 1, 1, weedCol[i % 3]);
        }
        R(g, Math.round(x - 1), Math.round(y - s - 1), 2, 2, weedCol[1]);
      }
    },
  };
}
