/**
 * common.js — Helpers shared by the travel terrains: scrolling-prop math,
 * field / fence painters, a few landmark sprites, and animated props drawn per
 * frame (wind turbines). Visual constants only.
 */

import { R, rng, ditherFill, sprite, draw } from '../../kit.js';
import { INK } from '../../sprites.js';

/**
 * Screen x of something placed at `worldX` on a layer of width `period` that
 * scrolls at `speed` × the road distance `run`, in the range [-40, period-40)
 * so props can slide fully off the left edge. To line a live prop up with a
 * pixel painted at layer x on that layer, pass `x + 40`.
 */
export function wrapX(worldX, run, speed, period) {
  return ((worldX - run * speed) % period + period) % period - 40;
}

/** Paint a flat field band with dithered crop rows. */
export function field(g, x, y, w, h, base, row, rowEvery = 3, density = 0.5) {
  R(g, x, y, w, h, base);
  for (let yy = y + 1; yy < y + h; yy += rowEvery) ditherFill(g, x, yy, w, 1, row, density);
}

/** Post-and-rail fence along y (posts every `step`). */
export function fence(g, x0, x1, y, wood = '#8a6a44', dark = '#5a4028', step = 8) {
  R(g, x0, y, x1 - x0, 1, wood);
  R(g, x0, y + 3, x1 - x0, 1, dark);
  for (let x = x0; x < x1; x += step) { R(g, x, y - 2, 1, 7, dark); R(g, x, y - 2, 1, 1, wood); }
}

export function barnSprite() {
  return sprite([
    '.......RRRRRR.......', '.....RRRRRRRRRR.....', '...RRRRRRRRRRRRRR...', '.RRRRRRRRRRRRRRRRRR.',
    'rrrrrrrrrrrrrrrrrrrr', 'BBBBBBBBBBBBBBBBBBBB', 'BBWWWWBBBBBBBBWWWWBB', 'BBWkkWBBBBBBBBWkkWBB',
    'BBWWWWBBWWWWBBWWWWBB', 'BBBBBBBWWxxWWBBBBBBB', 'BBBBBBBWxWWxWBBBBBBB', 'BBBBBBBWWxxWWBBBBBBB',
    'BBBBBBBWxWWxWBBBBBBB', 'bbbbbbbWWWWWWbbbbbbb',
  ], { R: '#6a3a2a', r: '#4a2a1e', B: '#b83a2a', b: '#8a2a1e', W: '#f0e8d8', k: '#3a2a20', x: '#a8a090' }, { outline: INK });
}

export function siloSprite() {
  return sprite([
    '..dddd..', '.dSSSSd.', 'dSSSSSSd', 'SSsSSSSS', 'SSsSSSSS', 'SSSSSSSS', 'SSsSSSSS', 'SSsSSSSS',
    'SSSSSSSS', 'SSsSSSSS', 'SSsSSSSS', 'SSSSSSSS', 'SSsSSSSS', 'SSsSSSSS', 'SSSSSSSS', 'SSsSSSSS',
    'SSsSSSSS', 'SSSSSSSS', 'ssssssss',
  ], { d: '#8a9098', S: '#c8ccd2', s: '#9aa0a8' }, { outline: INK });
}

export function hayBaleSprite() {
  return sprite(['.hhhh.', 'hHHHHh', 'hHhHHh', 'hHHHHh', '.hhhh.'], { h: '#a8862a', H: '#d8b44a' }, { outline: INK });
}

export function cowSprite() {
  return sprite(['.KK.........', 'KKKWWWKKWWW.', '.KWWKKWWWKKW', '..WWWWKKWWW.', '..K.K...K.K.'],
    { K: '#1a1418', W: '#f0ece4' }, { outline: INK });
}

/** Wind turbine drawn live (blades turn). */
export function turbine(g, x, baseY, h, a, col = '#e8ecf0', shade = '#a8b0bc') {
  R(g, x - 1, baseY - h, 2, h, col);
  R(g, x, baseY - h, 1, h, shade);
  for (let k = 0; k < 3; k++) {
    const ang = a + (k * Math.PI * 2) / 3;
    for (let s = 1; s < h * 0.55; s++) {
      R(g, Math.round(x + Math.cos(ang) * s), Math.round(baseY - h + Math.sin(ang) * s), 1, 1, s < 3 ? shade : col);
    }
  }
  R(g, x - 1, baseY - h - 1, 3, 3, shade);
}

/** Scatter sprites along a layer: returns placements [{ spr, x }] seeded. */
export function scatter(seed, width, choices, minGap, maxGap) {
  const r = rng(seed);
  const out = [];
  for (let x = r.int(0, maxGap); x < width - 30; x += r.int(minGap, maxGap)) out.push({ spr: r.pick(choices), x });
  return out;
}

export { draw };
