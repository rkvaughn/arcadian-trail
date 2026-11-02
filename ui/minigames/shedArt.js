/**
 * shedArt.js — Pixel art for Shed Dash ("Run for the Shed") at native 320×180.
 *
 * The game's physics run in the original 160×90 logical units (8 px tiles);
 * this art is drawn at 2× detail, one canvas pixel per art pixel, so a tile is
 * 16×16 and the runner (6×11 logical hitbox) is a 12×22 px sprite. Built in
 * the cut-scene style: outlined string-art sprites, dithered skies, wrapping
 * ridges with silhouettes, banded logos.
 *
 * Everything here is visual (pixels, colors). No gameplay or climate numbers.
 */

import {
  W, H, R, rng, ditherBands, ditherFill, ridge, strip, sprite, painted, draw, silhouette, disc,
  drawPuff, makeCanvas, bayer,
} from '../cutscenes/kit.js';
import {
  INK, SHIRTS, SKINS, pineSprite, deadTreeSprite, houseSprite, roundTreeSprite, cactusSprite,
} from '../cutscenes/sprites.js';

export const TILE = 16;      // art px per 8-px logical tile

// Same per-member colors as the cut scenes (ui/cutscenes/sprites.js).
const HAIRS = ['#3a2614', '#1a1210', '#8a5a2a', '#d8b060', '#5a3a1a', '#2a1a10'];
const PANTS = ['#2a3a6a', '#3a3a44', '#5a4a3a', '#2a4a3a', '#4a3a5a', '#3a3046'];

/** Darken (k < 1) or lighten (k > 1) a hex color. */
export function shade(hex, k) {
  const h = hex.replace('#', '');
  const c = [0, 2, 4].map(i => Math.max(0, Math.min(255, Math.round(parseInt(h.slice(i, i + 2), 16) * k))));
  return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
}

// ── Looks (palette per peril) ────────────────────────────────────────────────

export const LOOKS = {
  heat: {
    sky: ['#c8582a', '#e07a34', '#f09a44', '#f8b858', '#fcd47c', '#fee8a8', '#fff4d0'],
    far: '#c87a44', farHi: '#f0aa6a', farShade: '#a85e34', mesa: '#b0623a', mesaHi: '#e8945a',
    mid: '#8a5428', midHi: '#c08040', sil: '#6a3c1c', rim: '#f0b060',
    grass: '#c8a848', grassHi: '#f0dc8a', grassDk: '#8a7228', dirt: '#b06a2a', dirtDk: '#86481a', dirtHi: '#d0904a', stone: '#e8cc98',
    flowers: ['#ffe060', '#ffffff', '#ff8a4a'], flowerRate: 0.25,
    leaf: ['#5a6a1a', '#8a9a2a', '#b0c040', '#d8e070'], hud: '#ffc040', dust: '#f0d8a0', tint: '#fff0c0',
  },
  dust: {
    sky: ['#6a3e22', '#83502c', '#9c6436', '#b47a42', '#c89252', '#d8aa66', '#e4c084'],
    far: '#946038', farHi: '#c08a58', farShade: '#7a4c2a', mesa: '#86542e', mesaHi: '#b47e4e',
    mid: '#6a4426', midHi: '#9a6a3e', sil: '#583820', rim: '#d8a868',
    grass: '#b09a4a', grassHi: '#dac888', grassDk: '#7a6a2e', dirt: '#9a6430', dirtDk: '#744620', dirtHi: '#bc8650', stone: '#d8c09a',
    flowers: ['#ffe060', '#f0e0c0'], flowerRate: 0.12,
    leaf: ['#4a5422', '#6a7430', '#8a9440', '#b0b860'], hud: '#f0c070', dust: '#d8b07a', tint: '#e0b080',
  },
  wind: {
    sky: ['#1a2434', '#243246', '#30425a', '#40546a', '#566a78', '#72847e', '#8e9a80'],
    far: '#2e4054', farHi: '#4e6680', farShade: '#24344a',
    mid: '#24482e', midHi: '#3e6a40', sil: '#1a3824', rim: '#5a8a5a',
    grass: '#3a9a3e', grassHi: '#86d86a', grassDk: '#246a2e', dirt: '#7a4c26', dirtDk: '#56341a', dirtHi: '#9a6a3a', stone: '#b4a48e',
    flowers: ['#ff6a8a', '#ffe060', '#ffffff', '#c88aff'], flowerRate: 0.55,
    leaf: ['#1a5a2a', '#2a8a3a', '#4aa84a', '#8ad06a'], hud: '#9cc8fc', cloud: ['#3a4658', '#56647a'], dust: '#d8d0c0', tint: '#0a1428',
  },
  stormy: {
    sky: ['#0a0f1a', '#111a28', '#1a2638', '#243448', '#304258', '#3e5266', '#4c6072'],
    far: '#1a2634', farHi: '#30445a', farShade: '#141e2a',
    mid: '#16301e', midHi: '#2a4a32', sil: '#10261a', rim: '#3a5a48',
    grass: '#2e8436', grassHi: '#6ab45a', grassDk: '#1c5a26', dirt: '#5e3c20', dirtDk: '#422814', dirtHi: '#7a5434', stone: '#8e8678',
    flowers: ['#ff6a8a', '#ffe060', '#ffffff'], flowerRate: 0.35,
    leaf: ['#123e1e', '#1e6a2e', '#348a3e', '#5aa852'], hud: '#9cc8fc', cloud: ['#1e2632', '#2e3846'], dust: '#a8b0b8', tint: '#060c1c',
  },
  fire: {
    sky: ['#120406', '#260708', '#46100c', '#6e1c10', '#9c3014', '#cc4c1c', '#f07a2a'],
    far: '#1e0a0a', farHi: '#a8401a', farShade: '#140606',
    mid: '#140808', midHi: '#6a2410', sil: '#0e0606', rim: '#e05a1a',
    grass: '#6e5e28', grassHi: '#a89238', grassDk: '#3e3216', dirt: '#46301e', dirtDk: '#2c1c10', dirtHi: '#664630', stone: '#7a6c5e',
    flowers: ['#ff8a2a', '#ffd040'], flowerRate: 0.18,
    leaf: ['#140c0a', '#2a1a12', '#3e2618', '#5a3a22'], hud: '#ff9a6a', cloud: ['#2a1214', '#a8401a'], dust: '#8a7a74', tint: '#500000',
  },
};

export function lookFor(mode, variant) {
  if (mode === 'fire') return 'fire';
  if (mode === 'heat') return variant === 'dust_storm' ? 'dust' : 'heat';
  return ['hurricane', 'flood'].includes(variant) ? 'stormy' : 'wind';
}

// ── Backdrop layers ──────────────────────────────────────────────────────────

export const FAR_Y = 50, MID_Y = 72;

export function buildBackdrop(lk, kind) {
  const sky = strip(W, H, (g) => {
    ditherBands(g, 0, 0, W, H, lk.sky);
    if (kind === 'fire') {          // fire glow banding up from the horizon
      for (let y = 100; y < 150; y++) ditherFill(g, 0, y, W, 1, '#ff9a3a', ((y - 100) / 50) * 0.35);
    }
  });

  let farTops = null;
  const far = strip(640, 110, (g, w, h) => {
    farTops = ridge(g, w, h, {
      amp: kind === 'fire' ? 50 : 40, base: 84, seed: 17, color: lk.far, hi: lk.farHi, shade: lk.farShade,
      jag: kind === 'fire' || kind === 'stormy' ? 0.5 : 0,
    });
    if (lk.mesa) {                   // flat-topped mesas with strata
      const r = rng(5);
      for (let k = 0; k < 4; k++) {
        const x = 30 + k * 160 + r.int(-20, 20), mw = r.int(40, 70), top = r.int(22, 42);
        for (let y = top; y < h; y++) {
          const spread = Math.min(12, Math.floor((y - top) * 0.5));
          R(g, x - spread, y, mw + spread * 2, 1, lk.mesa);
          if ((y - top) % 7 === 3) R(g, x - spread, y, mw + spread * 2, 1, lk.farShade);
        }
        R(g, x, top, mw, 1, lk.mesaHi);
        ditherFill(g, x + mw - 10, top + 2, 10, h - top - 2, lk.farShade, 0.4);
      }
    }
  });

  const r = rng(29);
  let midTops = null;
  const mid = strip(640, 108, (g, w, h) => {
    midTops = ridge(g, w, h, { amp: 18, base: 90, seed: 23, color: lk.mid, hi: lk.midHi, shade: lk.sil });
    const at = (x) => midTops[Math.max(0, Math.min(w - 1, x))];
    if (kind === 'heat' || kind === 'dust') {
      const cac = cactusSprite();
      const sil = silhouette(cac, lk.sil), rim = silhouette(cac, lk.rim);
      const snag = silhouette(deadTreeSprite(), lk.sil);
      for (let x = 8; x < w - 16; x += r.int(26, 60)) {
        if (r() < 0.75) { draw(g, rim, x - 1, at(x + 5) - cac.h + 3); draw(g, sil, x, at(x + 5) - cac.h + 3); }
        else draw(g, snag, x, at(x + 6) - snag.h + 3);
      }
    } else if (kind === 'fire') {
      const pine = pineSprite();
      const sil = silhouette(pine, lk.sil), rim = silhouette(pine, lk.rim);
      const snag = silhouette(deadTreeSprite(), lk.sil), snagRim = silhouette(deadTreeSprite(), lk.rim);
      for (let x = 4; x < w - 14; x += r.int(8, 22)) {
        if (r() < 0.55) { draw(g, rim, x + 1, at(x + 5) - pine.h + 3); draw(g, sil, x, at(x + 5) - pine.h + 3); }
        else { draw(g, snagRim, x + 1, at(x + 6) - snag.h + 3); draw(g, snag, x, at(x + 6) - snag.h + 3); }
      }
    } else {
      const dim = kind === 'stormy' ? 0.62 : 0.8;
      const tree = roundTreeSprite({ G: shade('#3a9a3a', dim), g: shade('#2a6a2a', dim), h: shade('#7ad06a', dim), T: shade('#6a4a24', dim), t: shade('#4a3018', dim) });
      const pine = pineSprite({ G: shade('#2a6a34', dim), g: shade('#1a4a26', dim), h: shade('#4a9a4a', dim), T: shade('#5a3a1e', dim) });
      const house = houseSprite({ R: shade('#a83a2a', dim), r: shade('#7a2a1e', dim), W: shade('#e8d8b0', dim), w: shade('#c0b088', dim), D: shade('#6a4020', dim), G: '#ffd870', g: shade('#90b8d8', dim), C: shade('#6a6a70', dim) }, kind === 'stormy');
      const barn = houseSprite({ R: shade('#5a5a62', dim), r: shade('#3a3a42', dim), W: shade('#a83a2a', dim), w: shade('#7a2a1e', dim), D: shade('#3a2010', dim), G: '#ffd870', g: shade('#90b8d8', dim), C: shade('#6a6a70', dim) });
      for (let x = 6; x < w - 26; x += r.int(14, 34)) {
        const k = r();
        if (k < 0.12) draw(g, house, x, at(x + 12) - house.h + 3);
        else if (k < 0.18) draw(g, barn, x, at(x + 12) - barn.h + 3);
        else if (k < 0.6) draw(g, tree, x, at(x + 6) - tree.h + 3);
        else draw(g, pine, x, at(x + 5) - pine.h + 3);
      }
      // a fence line along the ridge
      for (let x = 0; x < w; x += 6) { R(g, x, at(x) + 4, 1, 4, shade(lk.mid, 0.6)); }
      for (let x = 0; x < w; x++) R(g, x, at(x) + 5, 1, 1, shade(lk.mid, 0.7));
    }
  });

  // Cloud / smoke banks
  const clouds = lk.cloud ? strip(640, 70, (g, w) => {
    const cr = rng(41);
    for (let k = 0; k < 9; k++) {
      const cx = k * 72 + cr.int(0, 30), cy = cr.int(18, 40);
      for (let j = 0; j < 6; j++) {
        const px = cx + j * 9 - 22 + cr.int(-3, 3), py = cy + cr.int(-6, 6), pr = cr.int(8, 14);
        for (const dx of [-w, 0, w]) drawPuff(g, px + dx, py, pr, lk.cloud[0], lk.cloud[1], 0.4, kind === 'fire');   // wrap seam
      }
    }
  }) : null;

  return { sky, far, mid, clouds, farTops, midTops };
}

// ── Tiles ────────────────────────────────────────────────────────────────────

export function buildTiles(lk, kind) {
  const r = rng(kind.length * 7 + 3);
  const top = [0, 1, 2].map(v => strip(TILE, TILE, (g) => {
    R(g, 0, 0, TILE, TILE, lk.dirt);
    ditherFill(g, 0, 7, TILE, 9, lk.dirtDk, 0.22);
    R(g, 0, 0, TILE, 6, lk.grass);
    R(g, 0, 0, TILE, 1, lk.grassHi);
    for (let x = 0; x < TILE; x++) {
      const d = 6 + ((x * 5 + v * 3) % 7 === 0 ? 2 : (x * 3 + v) % 4 === 0 ? 1 : 0);
      R(g, x, 6, 1, d - 6, lk.grass);
      R(g, x, d, 1, 1, lk.grassDk);
    }
    for (let i = 0; i < 5; i++) {                  // blade ticks
      const x = r.int(0, TILE - 1), y = r.int(1, 4);
      R(g, x, y, 1, 2, lk.grassDk); R(g, x + 1, y - 1, 1, 1, lk.grassHi);
    }
    for (let i = 0; i < 2; i++) {                  // stones
      const x = r.int(1, TILE - 4), y = r.int(10, 13);
      R(g, x, y, 3, 1, lk.stone); R(g, x, y + 1, 3, 1, lk.dirtDk);
    }
  }));
  const dirt = [0, 1].map(v => strip(TILE, TILE, (g) => {
    R(g, 0, 0, TILE, TILE, lk.dirt);
    ditherFill(g, 0, 0, TILE, TILE, lk.dirtDk, 0.2 + v * 0.06);
    R(g, 0, v ? 9 : 4, TILE, 1, lk.dirtDk);       // strata
    for (let i = 0; i < 3; i++) {
      const x = r.int(1, TILE - 4), y = r.int(1, TILE - 3);
      R(g, x, y, 2, 1, lk.dirtHi); R(g, x, y + 1, 2, 1, lk.dirtDk);
    }
  }));
  return { top, dirt };
}

// ── Props ────────────────────────────────────────────────────────────────────

export function crateSprite() {
  return painted(TILE - 2, TILE - 2, (g) => {
    const w = TILE - 2;
    R(g, 0, 0, w, w, '#a8581a');
    R(g, 0, 0, w, 2, '#e89a48'); R(g, 0, w - 2, w, 2, '#7a3a10');
    R(g, 0, 0, 2, w, '#d07a2a'); R(g, w - 2, 0, 2, w, '#8a4614');
    R(g, 2, 5, w - 4, 1, '#7a3a10'); R(g, 2, 8, w - 4, 1, '#7a3a10');
    for (let k = 0; k < w - 4; k++) {               // diagonal brace
      R(g, 2 + k, w - 3 - k, 2, 1, '#e89a48');
      R(g, 2 + k, w - 2 - k, 1, 1, '#6a300c');
    }
    for (const [x, y] of [[1, 1], [w - 2, 1], [1, w - 2], [w - 2, w - 2]]) R(g, x, y, 1, 1, '#f8e0b0');
  }, INK);
}

/** Wrecked car spanning 3 tiles (48 px) with its cab above the tile row. */
export function wreckSprite() {
  return painted(46, 21, (g) => {
    const body = '#a8402c', hi = '#d8684a', lo = '#782a1c', rust = '#6a3a1a';
    // cab
    for (let y = 0; y < 8; y++) R(g, 12 - Math.min(5, y), y, 22 + Math.min(5, y) + Math.min(4, y), 1, body);
    R(g, 12, 0, 22, 1, hi);
    R(g, 10, 2, 11, 5, '#1e2834'); R(g, 23, 2, 12, 5, '#1e2834');          // windows
    R(g, 21, 2, 2, 6, body);
    for (let k = 0; k < 4; k++) R(g, 12 + k * 2, 6 - k, 1, 1, '#9ac0d8');   // cracked glass
    R(g, 26, 3, 6, 1, '#6a8aa0'); R(g, 28, 4, 1, 2, '#9ac0d8');
    // body
    R(g, 0, 8, 46, 8, body);
    R(g, 0, 8, 46, 1, hi); R(g, 0, 14, 46, 2, lo);
    R(g, 21, 9, 1, 6, lo); R(g, 33, 9, 1, 6, lo);                          // door seams
    R(g, 0, 10, 2, 3, '#e8e4c8'); R(g, 44, 10, 2, 3, '#a81808');           // lights
    R(g, 0, 13, 46, 1, '#9a9aa0');                                         // trim
    const rr = rng(77);
    for (let i = 0; i < 6; i++) ditherFill(g, rr.int(2, 38), rr.int(8, 12), rr.int(3, 7), rr.int(2, 4), rust, 0.6);
    // flat tyres
    for (const wx of [5, 31]) {
      R(g, wx, 14, 10, 6, '#1a1418'); R(g, wx - 1, 18, 12, 3, '#1a1418');
      R(g, wx + 3, 15, 4, 3, '#6a666a'); R(g, wx + 4, 16, 2, 1, '#b8bcc4');
    }
  }, INK);
}

export function fenceSprite() {
  return painted(16, 19, (g) => {
    const wood = '#d8c8a8', hi = '#f8f0e0', dk = '#9a8a70';
    for (const px of [2, 11]) { R(g, px, 1, 3, 18, wood); R(g, px, 1, 1, 18, hi); R(g, px + 2, 1, 1, 18, dk); R(g, px + 1, 0, 1, 1, wood); }
    for (const ry of [5, 12]) { R(g, 0, ry, 16, 3, wood); R(g, 0, ry, 16, 1, hi); R(g, 0, ry + 2, 16, 1, dk); }
    R(g, 7, 13, 2, 1, '#6a5a48');
  }, INK);
}

/** Big leafy tree for the play field: { trunk, canopy } (canopy sways separately). */
export function treeSprites(lk, kind) {
  const [dk, base, mid, hi] = lk.leaf;
  const trunk = painted(8, 30, (g) => {
    const bark = kind === 'fire' ? '#2a1a12' : '#6a4424';
    R(g, 0, 0, 8, 30, bark);
    R(g, 1, 0, 2, 30, kind === 'fire' ? '#3e2a1e' : '#8a5a30');
    R(g, 6, 0, 2, 30, kind === 'fire' ? '#180e0a' : '#4a2e18');
    R(g, 3, 8, 2, 1, '#2a1a10'); R(g, 4, 18, 2, 1, '#2a1a10');
    R(g, -1, 27, 10, 3, bark);                                            // roots
  }, INK);
  const canopy = painted(46, 34, (g) => {
    const blobs = [[23, 10, 11], [12, 18, 11], [34, 18, 11], [23, 21, 12], [8, 24, 7], [38, 24, 7]];
    for (const [x, y, rr] of blobs) disc(g, x, y, rr, dk);
    for (const [x, y, rr] of blobs) disc(g, x - 1, y - 2, rr - 2, base);
    for (const [x, y, rr] of blobs) disc(g, x - 3, y - 4, Math.max(2, rr - 6), mid);
    for (const [x, y, rr] of blobs) {
      for (let dy = -rr; dy < 0; dy++) for (let dx = -rr; dx < 0; dx++) {
        if (dx * dx + dy * dy < (rr - 4) * (rr - 4) && bayer(x + dx, y + dy) < 0.25) R(g, x + dx - 2, y + dy - 3, 1, 1, hi);
      }
    }
    ditherFill(g, 0, 26, 46, 8, dk, 0.5);
    if (kind === 'fire') for (let i = 0; i < 14; i++) R(g, (i * 13) % 44 + 1, (i * 7) % 26 + 4, 2, 1, '#6a2a10');
  }, INK);
  return { trunk, canopy };
}

export function cactusHazard() {
  return sprite([
    '....hGGg.....', '...hGsGGg....', '...hGGGGg....', '...hGGsGg....', '.h.hGGGGg....',
    'hGghGGGGg..h.', 'hsghGsGGg.hGg', 'hGghGGGGg.hsg', 'hGGGGGGGg.hGg', '.gGGGGsGGghGg',
    '...hGGGGGGGg.', '...hGsGGgggg.', '...hGGGGg....', '...hGGGsg....', '...hGGGGg....',
    '...hGsGGg....', '...hGGGGg....', '...hGGGGg....', '..hhGGGGgg...', '..dddddddd...',
  ], { G: '#3a9a3a', g: '#226a2a', h: '#7ad06a', s: '#f0f0c0', d: '#6a4a24' }, { outline: INK });
}

/** Wind-borne debris in 4 spin frames: [flat, diag, upright, diag]. */
export function debrisSprites(kind) {
  const [a, b, c] = kind === 'plank' ? ['#c8783a', '#7a4018', '#e8a868'] : ['#b8bcc4', '#6a6e78', '#e8ecf0'];
  const flat = painted(16, 5, (g) => {
    R(g, 0, 0, 16, 5, a); R(g, 0, 0, 16, 1, c); R(g, 0, 4, 16, 1, b);
    if (kind === 'plank') { R(g, 3, 2, 1, 1, b); R(g, 12, 2, 1, 1, b); } else for (let x = 1; x < 16; x += 3) R(g, x, 1, 1, 3, b);
  }, INK);
  const up = painted(5, 16, (g) => {
    R(g, 0, 0, 5, 16, a); R(g, 0, 0, 1, 16, c); R(g, 4, 0, 1, 16, b);
    if (kind === 'plank') { R(g, 2, 3, 1, 1, b); R(g, 2, 12, 1, 1, b); } else for (let y = 1; y < 16; y += 3) R(g, 1, y, 3, 1, b);
  }, INK);
  const diag = (dir) => painted(13, 13, (g) => {
    for (let k = 0; k < 12; k++) {
      const x = dir > 0 ? k : 11 - k;
      R(g, x, 11 - k, 2, 2, a); R(g, x, 11 - k, 1, 1, c);
    }
  }, INK);
  return [flat, diag(1), up, diag(-1)];
}

export function emberSprite() {
  return sprite(['.oo.', 'oYyo', 'oyro', '.oo.'], { o: '#e04a10', Y: '#fff0a0', y: '#ffb030', r: '#c02a08' }, { outline: '#2a0804' });
}

export function arrowMarker() {
  return sprite(['YYYYY', '.YYY.', '..Y..'], { Y: '#ffd040' }, { outline: INK });
}

export function heartIcon() {
  return sprite(['.RR.RR.', 'RWRRRRR', 'RRRRRRR', '.RRRRR.', '..RRR..', '...R...'], { R: '#e8402a', W: '#ffc0b0' }, { outline: INK });
}

export function dropIcon() {
  return sprite(['..B..', '.BB..', '.BBB.', 'BWBBB', 'BBBBB', '.BBB.'], { B: '#3cbcfc', W: '#d8f4ff' }, { outline: INK });
}

export function shedIcon() {
  return sprite(['..RRRR..', '.RRRRRR.', 'RRRRRRRR', '.WWDDWW.', '.WWDDWW.', '.WWDDWW.'],
    { R: '#9a9aa4', W: '#a8642a', D: '#ffd870' }, { outline: INK });
}

// ── The rickety shed (80×68 art, matching the old 40×34 logical footprint) ───

export function shedBody(kind) {
  return painted(88, 68, (g) => {
    const ox = 4;                                   // roof overhang on the left
    const planks = ['#a85e1c', '#8a4610', '#c4742a', '#7a3c0c', '#b06620'];
    // walls (y 14..68)
    for (let i = 0; i < 80; i += 8) {
      const sag = i > 60 ? 2 : 0, p = planks[(i / 8) % planks.length];
      R(g, ox + i, 14 + sag, 7, 54 - sag, p);
      R(g, ox + i, 14 + sag, 1, 54 - sag, shade(p, 1.35));
      R(g, ox + i + 6, 14 + sag, 1, 54 - sag, shade(p, 0.7));
      R(g, ox + i + 7, 14 + sag, 1, 54 - sag, '#2a1608');                 // gap
      R(g, ox + i + 3, 20 + (i % 3) * 9, 1, 3, shade(p, 0.75));             // grain
      R(g, ox + i + 2, 18, 1, 1, '#d8d0c0'); R(g, ox + i + 2, 62, 1, 1, '#d8d0c0');  // nails
      if (i % 16 === 8) { R(g, ox + i + 2, 40, 3, 2, shade(p, 0.6)); R(g, ox + i + 3, 40, 1, 1, shade(p, 0.45)); }  // knot
    }
    R(g, ox + 44, 36, 6, 16, '#140a04');                                    // missing plank
    R(g, ox + 45, 37, 2, 14, '#3a2010');
    // boarded window
    R(g, ox + 54, 24, 18, 14, '#140a04'); R(g, ox + 56, 26, 14, 10, '#3a2210');
    R(g, ox + 53, 26, 20, 3, '#c4742a'); R(g, ox + 53, 26, 20, 1, '#e8a060');
    R(g, ox + 53, 32, 20, 3, '#a85e1c'); R(g, ox + 53, 32, 20, 1, '#d08a48');
    // crooked corrugated tin roof
    for (let i = -6; i < 90; i++) {
      const sag = Math.round(i * 0.1), x = ox + i;
      if (x < 0 || x >= 88) continue;
      R(g, x, 4 + sag, 1, 10, i % 4 < 2 ? '#a8acb4' : '#70747e');
      R(g, x, 4 + sag, 1, 1, '#d8dce4');
      R(g, x, 13 + sag, 1, 1, '#3a3c44');
    }
    ditherFill(g, ox + 8, 6, 14, 5, '#a8501c', 0.5);                       // rust
    ditherFill(g, ox + 50, 9, 10, 5, '#a8501c', 0.45);
    ditherFill(g, ox + 26, 8, 6, 4, '#7a3a14', 0.5);
    if (kind === 'fire') ditherFill(g, ox, 40, 80, 28, '#1a0e08', 0.25);    // soot
    if (kind === 'stormy') ditherFill(g, ox, 54, 80, 14, '#1a2a3a', 0.3); // wet
  }, INK);
}

/** Open door: lit interior with a lantern; shut door: planks. */
export function shedDoors() {
  const open = painted(20, 40, (g) => {
    ditherBands(g, 0, 0, 20, 40, ['#ffe8a0', '#ffd070', '#f0a848', '#c87a30']);
    R(g, 8, 5, 4, 6, '#3a2010'); R(g, 9, 6, 2, 4, '#fff8c0');              // lantern
    R(g, 9, 3, 2, 2, '#3a2010');
    R(g, 2, 26, 7, 10, '#8a5a2a'); R(g, 2, 26, 7, 1, '#c88a4a');            // a crate inside
  });
  const shut = painted(20, 40, (g) => {
    for (let x = 0; x < 20; x += 5) { R(g, x, 0, 4, 40, '#8a4610'); R(g, x, 0, 1, 40, '#b06620'); R(g, x + 4, 0, 1, 40, '#2a1608'); }
    R(g, 0, 8, 20, 3, '#6a3410'); R(g, 0, 30, 20, 3, '#6a3410');
    for (let k = 0; k < 19; k++) R(g, k, 30 - Math.round(k * 1.1), 2, 2, '#6a3410');
    R(g, 16, 20, 2, 2, '#d8d0c0');
  });
  const leaf = painted(5, 40, (g) => {
    R(g, 0, 0, 5, 40, '#a85e1c'); R(g, 0, 0, 1, 40, '#d08a48'); R(g, 4, 0, 1, 40, '#5a2e0c');
    R(g, 0, 8, 5, 2, '#6a3410'); R(g, 0, 30, 5, 2, '#6a3410');
  }, INK);
  return { open, shut, leaf };
}

export function looseSheet() {
  return painted(16, 3, (g) => { R(g, 0, 0, 16, 3, '#9a9ea8'); R(g, 0, 0, 16, 1, '#e8ecf0'); for (let x = 1; x < 16; x += 4) R(g, x, 1, 2, 2, '#6a6e78'); }, INK);
}

// ── Runners (family members sized to the 6×11 logical hitbox → 12×22 px) ───

// Adult: 10 wide, 21 tall. Faces right. H hair h hair-hi S skin s skin-shade
// E eye C shirt c shirt-shade B belt P pants p pants-shade K shoes.
const A_HEAD = ['...HHHH...', '..HHhhHHH.', '.HHHHHHHH.', '.HHHSSSSS.', '.HHSSSSES.', '..HSSSSSS.', '...sSSSs..', '....sSs...'];
const A_TORSO = {
  stand: ['..cCCCCC..', '.cCCCCCCC.', '.cCCCCCCc.', '.cCCCCCCc.', '.SCCCCCCS.', '..BBBBBB..'],
  armF:  ['..cCCCCC..', '.cCCCCCCCS', '.cCCCCCCc.', 'ccCCCCCC..', 'S.CCCCCC..', '..BBBBBB..'],
  armB:  ['..cCCCCC..', '.cCCCCCC..', 'ScCCCCCCc.', '.cCCCCCCcc', '..CCCCCC.S', '..BBBBBB..'],
  jump:  ['S.cCCCCC.S', 'ccCCCCCCcc', '.cCCCCCCc.', '..CCCCCC..', '..CCCCCC..', '..BBBBBB..'],
};
const A_LEGS = {
  stand:  ['..PPPPPP..', '..PPp.PP..', '..PP..PP..', '..PP..PP..', '..pP..pP..', '..pP..pP..', '..KKK.KKK.'],
  stride: ['..PPPPPP..', '..PPPPPP..', '.PPp..PPP.', '.PP....PP.', 'PP......PP', 'pP......pP', 'KK.....KKK'],
  passA:  ['..PPPPPP..', '..PPPPPP..', '...PPPPp..', '...PP.pP..', '...PP..pK.', '...pP.....', '...KKK....'],
  passB:  ['..PPPPPP..', '..PPPPPPP.', '..PP..PPP.', '..PP...pK.', '..pP......', '..pP......', '..KKK.....'],
  jump:   ['..PPPPPP..', '..PPPPPPP.', '.PPp..PPP.', '.PP....pP.', 'KK.....KK.', '..........', '..........'],
};
const A_CROUCH = ['....HHHH..', '...HHhhHHH', '..HHHHHHHH', '..HHHSSSSS', '..HHSSSSES', '...HSSSSSS', '....sSSSs.',
  '..cCCCCCC.', '.cCCCCCCCS', '.cCCCCCCSS', '..BBBBBBB.', '.PPPPPPPP.', 'PPPp.PPPP.', 'KKK..KKKK.'];
const A_DOWN = ['...............HHH..', 'KK.PPPPPPCCCCCHHhHH.', 'KPPPPPPPPCCCCCSSSSHH', 'KPPPPPPPPCCCCCSSSESH',
  'KK.pppppBcccccSSSSS.', '..............sSSs..'];

// Child: 8 wide, 15 tall.
const C_HEAD = ['..HHHH..', '.HHhhHH.', '.HHSSSS.', '.HSSSES.', '..SSSSS.', '...sSs..'];
const C_TORSO = {
  stand: ['.cCCCC..', '.cCCCCC.', '.SCCCCS.', '..BBBB..'],
  armF:  ['.cCCCC..', '.cCCCCCS', 'cCCCCC..', 'S.BBBB..'],
  armB:  ['.cCCCC..', 'ScCCCCC.', '.cCCCCcS', '..BBBB..'],
  jump:  ['ScCCCCcS', '.cCCCCC.', '..CCCC..', '..BBBB..'],
};
const C_LEGS = {
  stand:  ['..PPPP..', '..P..P..', '..P..P..', '..p..p..', '..KK.KK.'],
  stride: ['..PPPP..', '.PP..PP.', 'PP....PP', 'p......p', 'KK....KK'],
  passA:  ['..PPPP..', '...PPp..', '...P.pK.', '...p....', '...KK...'],
  passB:  ['..PPPP..', '..PPPPP.', '..P..pK.', '..p.....', '..KK....'],
  jump:   ['..PPPP..', '.PPp.PP.', 'PP...pP.', 'K.....K.', '........'],
};
const C_CROUCH = ['...HHHH.', '..HHhhHH', '..HHSSSS', '..HSSSES', '...SSSSS', '.cCCCCCS', '..BBBBB.', '.PPPPPP.', 'KKK.KKK.'];
const C_DOWN = ['..........HH..', 'K.PPPPCCCCHHhH', 'KPPPPPCCCCSSES', 'K.pppBccccSSSS', '..........sSs.'];

function framesFor(head, torso, legs, crouch, down, pal) {
  const o = { outline: INK };
  const mk = (t, l) => sprite([...head, ...torso[t], ...legs[l]], pal, o);
  return {
    stand: mk('stand', 'stand'),
    run: [mk('armF', 'stride'), mk('stand', 'passA'), mk('armB', 'stride'), mk('stand', 'passB')],
    jump: mk('jump', 'jump'),
    crouch: sprite(crouch, pal, o),
    down: sprite(down, pal, o),
  };
}

/** Frame sets for each living family member (colors match the cut scenes). */
export function runnerSprites(family) {
  return family.map((m, i) => {
    const shirt = SHIRTS[i % SHIRTS.length], skin = SKINS[(i * 2 + 1) % SKINS.length];
    const hair = HAIRS[i % HAIRS.length], pants = PANTS[i % PANTS.length];
    const pal = {
      H: hair, h: shade(hair, 1.6), S: skin, s: shade(skin, 0.8), E: '#1a1018', C: shirt, c: shade(shirt, 0.75),
      B: shade(pants, 0.6), P: pants, p: shade(pants, 0.75), K: '#1e1618',
    };
    const f = m.small
      ? framesFor(C_HEAD, C_TORSO, C_LEGS, C_CROUCH, C_DOWN, pal)
      : framesFor(A_HEAD, A_TORSO, A_LEGS, A_CROUCH, A_DOWN, pal);
    f.small = m.small;
    f.w = m.small ? 8 : 10;
    return f;
  });
}

/** Pre-rendered dither veil (for the intro card) so it's one drawImage per frame. */
export function veil(w, h, color = INK, density = 0.6) {
  const [c, g] = makeCanvas(w, h);
  ditherFill(g, 0, 0, w, h, color, density);
  return c;
}
