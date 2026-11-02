/**
 * art.js — Shared pixel-art bits for the interactive mini-games (Shed Dash,
 * River Crossing, Crash the Barricade), drawn on the shared 320×180 canvas in
 * the same style as the cut scenes (ui/cutscenes/kit.js).
 *
 * The cut-scene kit owns the primitives (sprite, ditherBands, ridge, text,
 * logo, particles). This file adds what the games need on top: road and grass
 * strips, HUD plates and meters, touch buttons, intro/outcome title cards and
 * pointer → art-pixel mapping.
 *
 * All numbers here are visual (pixels, colors, seconds of animation).
 */

import { W, H, R, rng, ditherFill, strip, text, textWidth, logo, sprite, draw } from '../cutscenes/kit.js';
import { INK } from '../cutscenes/sprites.js';

export { INK };

// ── Strips (same look as the end screens) ────────────────────────────────────

/** Asphalt road band with edge lines and centre dashes; tile it with drawWrap. */
export function roadStrip(pal = {}, h = 24) {
  const { asphalt = '#2a2630', grain = '#34303a', edge = '#8a8494', dash = '#d8b040', lip = '#4a4450' } = pal;
  return strip(64, h, (g) => {
    R(g, 0, 0, 64, h, asphalt);
    ditherFill(g, 0, 0, 64, h, grain, 0.25);
    R(g, 0, 0, 64, 1, lip);
    R(g, 0, 2, 64, 1, edge);
    R(g, 0, h - 3, 64, 1, edge);
    const mid = Math.floor(h / 2) - 1;
    R(g, 4, mid, 14, 2, dash);
    R(g, 36, mid, 14, 2, dash);
  });
}

/** Grass band with tufts; tile it with drawWrap. */
export function grassStrip(base, tuft, hi, h = 16, seed = 4, w = 128) {
  return strip(w, h, (g) => {
    R(g, 0, 0, w, h, base);
    const r = rng(seed);
    for (let i = 0; i < w * 0.32; i++) {
      const x = r.int(1, w - 2), y = r.int(3, h - 1);
      R(g, x, y - 2, 1, 2, tuft); R(g, x - 1, y - 3, 1, 1, hi); R(g, x + 1, y - 3, 1, 1, hi);
    }
  });
}

/** Seeded flower dots for a foreground grass band (end-screen style). */
export function flowerField(seed, n, x0, x1, y0, y1, cols = ['#ff6a8a', '#ffe060', '#ffffff', '#c88aff']) {
  const r = rng(seed);
  return Array.from({ length: n }, () => ({ x: r.int(x0, x1), y: r.int(y0, y1), c: r.pick(cols), p: r.range(0, 6) }));
}

/** Draw flowers from flowerField; `off` scrolls them (wrapping across `span`). */
export function drawFlowers(g, flowers, t, off = 0, span = W + 8) {
  for (const f of flowers) {
    const x = ((((f.x - off) % span) + span) % span) - 4;
    const sway = Math.round(Math.sin(t * 2 + f.p) * 0.6);
    R(g, x, f.y, 1, 2, '#2a6a2a');
    R(g, x + sway - 1, f.y - 2, 3, 1, f.c); R(g, x + sway, f.y - 3, 1, 3, f.c); R(g, x + sway, f.y - 2, 1, 1, '#ffe8a0');
  }
}

/** Wind turbine: tower + three blades drawn as pixel lines at angle `a`. */
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

// ── HUD ──────────────────────────────────────────────────────────────────────

/** Bevelled dark plate (HUD bar, dialog box). */
export function plate(g, x, y, w, h, opts = {}) {
  const { fill = '#141020', hi = '#3a3450', lo = '#08060c', edge = INK, alpha = 1 } = opts;
  g.globalAlpha = alpha;
  R(g, x, y, w, h, edge);
  R(g, x + 1, y + 1, w - 2, h - 2, fill);
  R(g, x + 1, y + 1, w - 2, 1, hi);
  R(g, x + 1, y + h - 2, w - 2, 1, lo);
  g.globalAlpha = 1;
}

/**
 * Segmented meter: `n` blocks, `frac` (0..1) of them lit in `col` with a
 * highlight row, the rest in `off`. Returns the drawn width.
 */
export function meter(g, x, y, frac, opts = {}) {
  const { n = 10, bw = 5, bh = 6, gap = 1, col = '#3ad04a', hi = '#a8f8a0', off = '#2a2632', edge = INK } = opts;
  const w = n * (bw + gap) - gap + 2;
  R(g, x, y, w, bh + 2, edge);
  const lit = Math.round(Math.max(0, Math.min(1, frac)) * n * 2) / 2;   // half-block steps
  for (let i = 0; i < n; i++) {
    const bx = x + 1 + i * (bw + gap);
    const on = i + 1 <= lit, half = !on && i + 0.5 <= lit;
    R(g, bx, y + 1, bw, bh, off);
    if (on || half) {
      const ww = on ? bw : Math.ceil(bw / 2);
      R(g, bx, y + 1, ww, bh, col);
      R(g, bx, y + 1, ww, 1, hi);
    }
  }
  return w;
}

/** Smooth bar (timer/progress) with a dark well and a lit fill. */
export function bar(g, x, y, w, h, frac, col, hi = '#ffffff', well = '#1e1a26') {
  R(g, x, y, w, h, INK);
  R(g, x + 1, y + 1, w - 2, h - 2, well);
  const fw = Math.round((w - 2) * Math.max(0, Math.min(1, frac)));
  R(g, x + 1, y + 1, fw, h - 2, col);
  if (h > 3) R(g, x + 1, y + 1, fw, 1, hi);
}

// ── Touch buttons ────────────────────────────────────────────────────────────

const ICONS = {
  left:  ['...#', '..##', '.###', '####', '.###', '..##', '...#'],
  right: ['#...', '##..', '###.', '####', '###.', '##..', '#...'],
  up:    ['...#...', '..###..', '.#####.', '#######'],
  down:  ['#######', '.#####.', '..###..', '...#...'],
};

/** Rounded translucent touch button with an arrow icon or a text label. */
export function touchButton(g, x, y, w, h, label, on = false) {
  g.globalAlpha = on ? 0.75 : 0.5;
  R(g, x + 1, y, w - 2, h, INK); R(g, x, y + 1, w, h - 2, INK);
  R(g, x + 1, y + 1, w - 2, h - 2, on ? '#6a6488' : '#2a2638');
  R(g, x + 2, y + 1, w - 4, 1, on ? '#a8a0d0' : '#4a4660');
  g.globalAlpha = 1;
  const icon = ICONS[label];
  if (icon) {
    const k = Math.max(1, Math.floor(Math.min(w, h) / 14));     // icon pixel size grows with the button
    const iw = icon[0].length * k, ih = icon.length * k, ox = Math.round(x + (w - iw) / 2), oy = Math.round(y + (h - ih) / 2);
    for (const [dx, col] of [[1, INK], [0, on ? '#ffffff' : '#e8e4f0']]) {
      for (let r = 0; r < icon.length; r++) for (let c = 0; c < icon[0].length; c++) {
        if (icon[r][c] === '#') R(g, ox + c * k + dx, oy + r * k + dx, k, k, col);
      }
    }
  } else {
    text(g, label, x + w / 2, y + Math.round((h - 7) / 2), { align: 'center', color: on ? '#ffffff' : '#e8e4f0', shadow: INK });
  }
}

/**
 * Map a pointer event to art pixels on a canvas whose backing store is
 * `w`×`h` (handles CSS scaling, borders and padding).
 */
export function pointerToArt(canvas, e, w = W, h = H) {
  const b = canvas.getBoundingClientRect(), cs = getComputedStyle(canvas);
  const pl = parseFloat(cs.paddingLeft || 0), pr = parseFloat(cs.paddingRight || 0);
  const pt = parseFloat(cs.paddingTop || 0), pb = parseFloat(cs.paddingBottom || 0);
  const left = b.left + canvas.clientLeft + pl, top = b.top + canvas.clientTop + pt;
  return {
    x: (e.clientX - left) / Math.max(1, canvas.clientWidth - pl - pr) * w,
    y: (e.clientY - top) / Math.max(1, canvas.clientHeight - pt - pb) * h,
  };
}

/** True on touch-first devices (show on-screen buttons from the start). */
export function touchFirst() {
  return typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0;
}

// ── Title cards ──────────────────────────────────────────────────────────────

export const GOLD = ['#fff8c0', '#ffe060', '#ffb030', '#f07a20'];
export const GREEN = ['#f0ffe0', '#a8f080', '#5ad050', '#2a9a3a'];
export const RED = ['#ffe0d0', '#ff8a6a', '#e8402a', '#a01a14'];
export const BLUE = ['#e8f4ff', '#9ac8f0', '#5a8ac8', '#2a4a8a'];

/** Banded logo canvas centered at (cx, y). */
export function drawLogo(g, str, cx, y, scale = 3, bands = GOLD, outline = '#1a0a14') {
  const c = logo(str, scale, bands, outline);
  g.drawImage(c, Math.round(cx - c.width / 2), Math.round(y));
  return c;
}

/** Split text into lines of at most `max` characters. */
export function wrapText(str, max) {
  const lines = [];
  let cur = '';
  for (const word of String(str).split(' ')) {
    if ((cur + ' ' + word).trim().length > max) { lines.push(cur.trim()); cur = word; } else cur += ' ' + word;
  }
  if (cur.trim()) lines.push(cur.trim());
  return lines;
}

/** Outlined 5×7 text (kit.text with the INK outline preset). */
export function label(g, str, x, y, color = '#ffffff', align = 'left', scale = 1) {
  return text(g, str, x, y, { color, align, outline: INK, scale });
}

/** 3·2·1·GO countdown numeral at (cx, y) for `remaining` seconds. */
export function countdown(g, remaining, cx, y) {
  const n = Math.ceil(remaining);
  const s = n > 0 ? String(n) : 'GO!';
  drawLogo(g, s, cx, y, 4, n > 0 ? GOLD : GREEN);
}

export { textWidth, sprite, draw };
