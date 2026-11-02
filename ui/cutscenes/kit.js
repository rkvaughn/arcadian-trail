/**
 * kit.js — Shared pixel-art toolkit for cut scenes (event scenes, title, end
 * screens, mini-game scene cards).
 *
 * Everything draws at the canvas's native 320×180, one canvas pixel per art
 * pixel, so sprites can be NES-sized (a person is ~9×17 px with outline, the
 * family car ~42×18) instead of the 4×-blown-up 80×45 travel scenes.
 *
 * Building blocks:
 *   sprite(rows, palette, { outline })  string-art sprite → cached canvas, with
 *                                       an optional auto-generated 1 px outline
 *   draw(g, spr, x, y, flip)            blit a sprite (x/y = art top-left)
 *   silhouette(spr, color)              same shape, one flat color (backlighting)
 *   text / textWidth / logo             5×7 bitmap font, outline + banded fill
 *   ditherBands(g, ...)                 Bayer-dithered vertical gradient
 *   ridge(g, ...)                       seamless wrapping hill/mountain silhouette
 *   strip / drawWrap                    pre-rendered parallax layers
 *   stepParticles                       tiny particle integrator
 *
 * All numbers in this folder are visual (pixels, colors, seconds of animation).
 */

export const W = 320;
export const H = 180;

// ── Basics ───────────────────────────────────────────────────────────────────

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  return [c, g];
}

/** Deterministic PRNG (mulberry32) so pre-rendered layers look the same each time. */
export function rng(seed = 1) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  next.range = (lo, hi) => lo + next() * (hi - lo);
  next.int = (lo, hi) => Math.floor(lo + next() * (hi - lo + 1));
  next.pick = (arr) => arr[Math.floor(next() * arr.length)];
  return next;
}

export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const ease = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
export const easeOut = (t) => { t = clamp(t, 0, 1); return 1 - (1 - t) * (1 - t); };

/** Rounded rect fill in art pixels. */
export function R(g, x, y, w, h, c) {
  if (w <= 0 || h <= 0) return;
  g.fillStyle = c;
  g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
/** Ordered-dither threshold in (0,1) for pixel (x, y). */
export function bayer(x, y) {
  return (BAYER4[((y & 3) << 2) | (x & 3)] + 0.5) / 16;
}

const rgbCache = new Map();
export function rgba(hex) {
  let v = rgbCache.get(hex);
  if (v) return v;
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  v = [
    parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16),
    h.length >= 8 ? parseInt(h.slice(6, 8), 16) : 255,
  ];
  rgbCache.set(hex, v);
  return v;
}

// ── Sprites ──────────────────────────────────────────────────────────────────

const spriteCache = new Map();

/**
 * Build a sprite from rows of characters. Each char maps through `pal` to a hex
 * color; '.' and ' ' are transparent. With `outline`, every transparent pixel
 * 4-adjacent to an opaque one becomes that color (classic NES dark outline).
 */
export function sprite(rows, pal, opts = {}) {
  const outline = opts.outline || null;
  const key = rows.join('\n') + '|' + JSON.stringify(pal) + '|' + outline;
  const hit = spriteCache.get(key);
  if (hit) return hit;

  const h = rows.length;
  const w = Math.max(...rows.map(r => r.length));
  const pad = outline ? 1 : 0;
  const cw = w + pad * 2, ch = h + pad * 2;
  const [c, g] = makeCanvas(cw, ch);
  const img = g.createImageData(cw, ch);
  const d = img.data;
  const solid = new Uint8Array(cw * ch);
  for (let y = 0; y < h; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      const k = row[x];
      if (k === '.' || k === ' ') continue;
      const col = pal[k];
      if (!col) continue;
      const [r, gg, b, a] = rgba(col);
      const i = ((y + pad) * cw + (x + pad));
      d[i * 4] = r; d[i * 4 + 1] = gg; d[i * 4 + 2] = b; d[i * 4 + 3] = a;
      solid[i] = 1;
    }
  }
  if (outline) {
    const [r, gg, b, a] = rgba(outline);
    for (let y = 0; y < ch; y++) {
      for (let x = 0; x < cw; x++) {
        const i = y * cw + x;
        if (solid[i]) continue;
        const n = (x > 0 && solid[i - 1]) || (x < cw - 1 && solid[i + 1]) ||
                  (y > 0 && solid[i - cw]) || (y < ch - 1 && solid[i + cw]);
        if (n) { d[i * 4] = r; d[i * 4 + 1] = gg; d[i * 4 + 2] = b; d[i * 4 + 3] = a; }
      }
    }
  }
  g.putImageData(img, 0, 0);
  const spr = { c, w, h, pad };
  spriteCache.set(key, spr);
  return spr;
}

/** Blit a sprite; (x, y) is the top-left of the art (outline sits 1 px outside). */
export function draw(g, spr, x, y, flip = false) {
  const px = Math.round(x) - spr.pad, py = Math.round(y) - spr.pad;
  if (!flip) { g.drawImage(spr.c, px, py); return; }
  g.save();
  g.translate(px + spr.c.width, py);
  g.scale(-1, 1);
  g.drawImage(spr.c, 0, 0);
  g.restore();
}

const silCache = new WeakMap();
/** Flat single-color copy of a sprite (for backlit figures and shadows). */
export function silhouette(spr, color) {
  let m = silCache.get(spr);
  if (!m) { m = new Map(); silCache.set(spr, m); }
  let s = m.get(color);
  if (s) return s;
  const [c, g] = makeCanvas(spr.c.width, spr.c.height);
  g.drawImage(spr.c, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = color;
  g.fillRect(0, 0, c.width, c.height);
  s = { c, w: spr.w, h: spr.h, pad: spr.pad };
  m.set(color, s);
  return s;
}

/** Sprite built by a paint callback instead of string rows (for big props). */
export function painted(w, h, paint, outline = null) {
  const [c, g] = makeCanvas(w + 2, h + 2);
  g.translate(1, 1);
  paint(g);
  if (!outline) return { c, w, h, pad: 1 };
  const img = g.getImageData(0, 0, w + 2, h + 2);
  const d = img.data, cw = w + 2, ch = h + 2;
  const solid = new Uint8Array(cw * ch);
  for (let i = 0; i < cw * ch; i++) solid[i] = d[i * 4 + 3] > 0 ? 1 : 0;
  const [r, gg, b] = rgba(outline);
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const i = y * cw + x;
      if (solid[i]) continue;
      if ((x > 0 && solid[i - 1]) || (x < cw - 1 && solid[i + 1]) ||
          (y > 0 && solid[i - cw]) || (y < ch - 1 && solid[i + cw])) {
        d[i * 4] = r; d[i * 4 + 1] = gg; d[i * 4 + 2] = b; d[i * 4 + 3] = 255;
      }
    }
  }
  g.putImageData(img, 0, 0);
  return { c, w, h, pad: 1 };
}

// ── 5×7 bitmap font ──────────────────────────────────────────────────────────

const GLYPHS = {
  A: '.###.#...##...#######...##...##...#', B: '####.#...##...#####.#...##...#####.',
  C: '.###.#...##....#....#....#...#.###.', D: '####.#...##...##...##...##...#####.',
  E: '######....#....####.#....#....#####', F: '######....#....####.#....#....#....',
  G: '.###.#...##....#.####...##...#.####', H: '#...##...##...#######...##...##...#',
  I: '.###...#....#....#....#....#...###.', J: '..###...#....#....#....##..#..##...',
  K: '#...##..#.#.#..##...#.#..#..#.#...#', L: '#....#....#....#....#....#....#####',
  M: '#...###.###.#.##.#.##...##...##...#', N: '#...##...###..##.#.##..###...##...#',
  O: '.###.#...##...##...##...##...#.###.', P: '####.#...##...#####.#....#....#....',
  Q: '.###.#...##...##...##.#.##..#..##.#', R: '####.#...##...#####.#.#..#..#.#...#',
  S: '.#####....#.....###.....#....#####.', T: '#####..#....#....#....#....#....#..',
  U: '#...##...##...##...##...##...#.###.', V: '#...##...##...##...##...#.#.#...#..',
  W: '#...##...##...##.#.##.#.##.#.#.#.#.', X: '#...##...#.#.#...#...#.#.#...##...#',
  Y: '#...##...#.#.#...#....#....#....#..', Z: '#####....#...#...#...#...#....#####',
  0: '.###.#...##..###.#.###..##...#.###.', 1: '..#...##....#....#....#....#...###.',
  2: '.###.#...#....#...#...#...#...#####', 3: '####.....#....#.###.....#....#####.',
  4: '...#...##..#.#.#..#.#####...#....#.', 5: '######....####.....#....##...#.###.',
  6: '..##..#...#....####.#...##...#.###.', 7: '#####....#...#...#...#....#....#...',
  8: '.###.#...##...#.###.#...##...#.###.', 9: '.###.#...##...#.####....#...#..##..',
  '!': '..#....#....#....#....#.........#..', '?': '.###.#...#....#...#...#.........#..',
  '.': '................................#..', ',': '...........................#...#...',
  "'": '..#....#...#.......................', '-': '................###................',
  ':': '.......#..............#............', '/': '....#....#...#...#...#...#....#....',
  '&': '.##..#..#.#.#...#...#.#.##..#..##.#', ' ': '...................................',
};

/** Pixel width of a string at `scale` (6 px per char incl. 1 px spacing). */
export function textWidth(str, scale = 1) {
  return Math.max(0, String(str).length * 6 * scale - scale);
}

function glyphFor(ch) {
  const u = ch.toUpperCase();
  if (GLYPHS[u]) return GLYPHS[u];
  if (ch === '—' || ch === '–') return GLYPHS['-'];
  return GLYPHS['?'];
}

function rawText(g, str, x, y, color, scale) {
  g.fillStyle = color;
  let cx = Math.round(x);
  for (const ch of String(str)) {
    const gl = glyphFor(ch);
    for (let i = 0; i < 35; i++) {
      if (gl[i] === '#') g.fillRect(cx + (i % 5) * scale, Math.round(y) + Math.floor(i / 5) * scale, scale, scale);
    }
    cx += 6 * scale;
  }
}

/**
 * Draw bitmap text. opts: { color, scale, align: 'left'|'center'|'right',
 * shadow: color (1 px drop shadow), outline: color (8-way 1 px outline) }.
 */
export function text(g, str, x, y, opts = {}) {
  const { color = '#ffffff', scale = 1, align = 'left', shadow = null, outline = null } = opts;
  const w = textWidth(str, scale);
  let tx = x;
  if (align === 'center') tx = x - w / 2;
  else if (align === 'right') tx = x - w;
  tx = Math.round(tx);
  if (outline) {
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      rawText(g, str, tx + dx, y + dy, outline, scale);
    }
  }
  if (shadow) rawText(g, str, tx + scale, y + scale, shadow, scale);
  rawText(g, str, tx, y, color, scale);
  return w;
}

const logoCache = new Map();
/**
 * Big logo text: banded vertical fill (one color per band, top→bottom), a dark
 * outline and a drop shadow. Returns a cached canvas.
 */
export function logo(str, scale, bands, outline = '#140a0a', shadow = '#00000088') {
  const key = [str, scale, bands.join(','), outline, shadow].join('|');
  if (logoCache.has(key)) return logoCache.get(key);
  const tw = textWidth(str, scale), th = 7 * scale;
  const [c, g] = makeCanvas(tw + 4, th + 5);
  // Fill pass on its own canvas so we can band it
  const [fc, fg] = makeCanvas(tw, th);
  rawText(fg, str, 0, 0, '#fff', scale);
  // Paint the bands on their own canvas, then mask once ('source-in' clears
  // everything outside the shape being drawn, so it must be a single draw).
  const [bc, bg] = makeCanvas(tw, th);
  const bh = th / bands.length;
  bands.forEach((col, i) => { bg.fillStyle = col; bg.fillRect(0, Math.floor(i * bh), tw, Math.ceil(bh)); });
  fg.globalCompositeOperation = 'source-in';
  fg.drawImage(bc, 0, 0);
  // Shadow + outline
  rawText(g, str, 2 + 2, 2 + 2, shadow, scale);
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1], [0, 2], [1, 2], [-1, 2]]) {
    rawText(g, str, 2 + dx, 2 + dy, outline, scale);
  }
  g.drawImage(fc, 2, 2);
  logoCache.set(key, c);
  return c;
}

// ── Backgrounds ──────────────────────────────────────────────────────────────

/**
 * Vertical gradient through `colors` (top→bottom) between y0 and y1, quantised
 * with a 4×4 Bayer dither so it reads as stepped NES-style bands.
 */
export function ditherBands(g, x0, y0, w, h, colors) {
  if (colors.length === 1) { R(g, x0, y0, w, h, colors[0]); return; }
  const img = g.getImageData(x0, y0, w, h);
  const d = img.data;
  const cols = colors.map(rgba);
  const n = cols.length - 1;
  for (let y = 0; y < h; y++) {
    const f = (y / Math.max(1, h - 1)) * n;
    const i = Math.min(n - 1, Math.floor(f));
    const frac = f - i;
    for (let x = 0; x < w; x++) {
      const c = frac > bayer(x + x0, y + y0) ? cols[i + 1] : cols[i];
      const k = (y * w + x) * 4;
      d[k] = c[0]; d[k + 1] = c[1]; d[k + 2] = c[2]; d[k + 3] = 255;
    }
  }
  g.putImageData(img, x0, y0);
}

/** Dithered fill of a rect at `density` (0..1) with one color over what's there. */
export function ditherFill(g, x0, y0, w, h, color, density) {
  g.fillStyle = color;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (bayer(x + x0, y + y0) < density) g.fillRect(x0 + x, y0 + y, 1, 1);
    }
  }
}

/**
 * Seamless silhouette ridge across width `w` (wraps when tiled). Heights are a
 * sum of sines with whole-number cycles across the width, so x=0 meets x=w.
 * opts: { amp, base, seed, color, hi (top-edge highlight), shade (dither color),
 *         jag (extra sharpness for mountains), snow, snowLine }
 */
export function ridge(g, w, h, opts) {
  const { amp = 20, base = h, seed = 1, color, hi = null, shade = null, jag = 0, snow = null, snowLine = 0 } = opts;
  const r = rng(seed);
  const waves = [1, 2, 3, 5, 8].map((k, i) => ({ k, a: r.range(0.4, 1) / (i + 1), p: r.range(0, Math.PI * 2) }));
  const tops = [];
  for (let x = 0; x < w; x++) {
    let v = 0;
    for (const wv of waves) {
      const s = Math.sin((x / w) * Math.PI * 2 * wv.k + wv.p);
      v += wv.a * (jag ? 1 - Math.abs(s) * 2 * jag + s * (1 - jag) : s);
    }
    tops.push(Math.round(base - amp * (0.5 + v * 0.35)));
  }
  for (let x = 0; x < w; x++) {
    const top = tops[x];
    R(g, x, top, 1, h - top, color);
    if (hi && (tops[(x + 1) % w] > top || tops[(x - 1 + w) % w] >= top)) R(g, x, top, 1, 1, hi);
    if (snow && top < snowLine) R(g, x, top, 1, Math.max(1, Math.round((snowLine - top) * 0.6)), snow);
    if (shade) {
      for (let y = top + 3; y < h; y++) if (bayer(x, y) < clamp((y - top) / 30, 0, 0.5)) R(g, x, y, 1, 1, shade);
    }
  }
  return tops;
}

/** Off-screen layer canvas of size w×h painted once by `paint(g)`. */
export function strip(w, h, paint) {
  const [c, g] = makeCanvas(w, h);
  paint(g, w, h);
  return c;
}

/** Draw a horizontally wrapping layer scrolled by `off` px at height y. */
export function drawWrap(g, layer, off, y = 0) {
  const lw = layer.width;
  let x = -(((Math.round(off) % lw) + lw) % lw);
  for (; x < W; x += lw) g.drawImage(layer, x, y);
}

// ── Particles ────────────────────────────────────────────────────────────────

/**
 * Integrate a particle array in place: position += velocity·dt, optional
 * gravity `p.g`, drag `p.drag`; removes particles whose age passes `life` or
 * that leave the padded screen.
 */
export function stepParticles(list, dt, pad = 24) {
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i];
    p.t = (p.t || 0) + dt;
    if (p.g) p.vy += p.g * dt;
    if (p.drag) { const k = Math.max(0, 1 - p.drag * dt); p.vx *= k; p.vy *= k; }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.t > p.life || p.x < -pad || p.x > W + pad || p.y < -pad || p.y > H + pad) list.splice(i, 1);
  }
}

/** Row-offset distortion (heat shimmer) from `src` canvas into `g`. */
export function shimmer(g, src, y0, y1, t, amp, freq = 0.21, speed = 6) {
  if (y0 > 0) g.drawImage(src, 0, 0, W, y0, 0, 0, W, y0);
  for (let y = y0; y < y1; y++) {
    const off = Math.round(Math.sin(y * freq + t * speed) * amp * ((y - y0) / Math.max(1, y1 - y0)));
    g.drawImage(src, 0, y, W, 1, off, y, W, 1);
  }
  if (y1 < H) g.drawImage(src, 0, y1, W, H - y1, 0, y1, W, H - y1);
}

/** Lightning bolt polyline from (x, y0) down to y1; seeded so it holds for a flash. */
export function bolt(g, x, y0, y1, seed, color = '#ffffff', glow = '#9fb4ff') {
  const r = rng(seed);
  let cx = x;
  const pts = [];
  for (let y = y0; y < y1; y += r.int(3, 7)) { cx += r.int(-4, 4); pts.push([cx, y]); }
  for (const [px, py] of pts) R(g, px - 1, py, 3, 6, glow);
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    const steps = Math.max(1, Math.abs(by - ay));
    for (let s = 0; s <= steps; s++) R(g, Math.round(lerp(ax, bx, s / steps)), Math.round(lerp(ay, by, s / steps)), 1, 1, color);
    if (r() < 0.3) {                     // a side fork
      let fx = bx, fy = by;
      for (let k = 0; k < r.int(3, 8); k++) { fx += r() < 0.5 ? -1 : 1; fy += 1; R(g, fx, fy, 1, 1, color); }
    }
  }
}

/** Filled pixel circle. */
export function disc(g, cx, cy, r, color) {
  g.fillStyle = color;
  const rr = r * r;
  for (let dy = -Math.ceil(r); dy <= Math.ceil(r); dy++) {
    const hw = Math.floor(Math.sqrt(Math.max(0, rr - dy * dy)));
    if (hw > 0 || rr - dy * dy >= 0) g.fillRect(Math.round(cx - hw), Math.round(cy + dy), hw * 2 + 1, 1);
  }
}

const puffCache = new Map();
/**
 * Cached smoke/cloud puff: solid core, Bayer-dithered rim, optional lit edge
 * (top, or bottom when `under` — e.g. smoke lit by fire below). Returns a canvas of size (2r+1)² to blit centered.
 */
export function puff(r, color, lit = null, rim = 0.35, under = false) {
  r = Math.max(1, Math.round(r));
  const key = r + color + lit + rim + under;
  let c = puffCache.get(key);
  if (c) return c;
  let g;
  [c, g] = makeCanvas(r * 2 + 1, r * 2 + 1);
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      const d = Math.sqrt(x * x + y * y) / r;
      if (d > 1) continue;
      const edge = d > 1 - rim ? (1 - d) / rim : 1;
      if (edge < 1 && bayer(x + r, y + r) > edge) continue;
      const litHere = under ? y > r * 0.4 && d > 0.55 : y < -r * 0.45 && d > 0.55;
      g.fillStyle = lit && litHere ? lit : color;
      g.fillRect(x + r, y + r, 1, 1);
    }
  }
  puffCache.set(key, c);
  return c;
}

export function drawPuff(g, x, y, r, color, lit, rim, under) {
  const c = puff(r, color, lit, rim, under);
  g.drawImage(c, Math.round(x - c.width / 2), Math.round(y - c.height / 2));
}

/**
 * Animated flame wall: per-column flame tongues from baseY upward.
 * height(x) is scaled by k (0..1, for intro ramps). Colors outer→core.
 */
export function flameWall(g, x0, x1, baseY, maxH, t, k = 1, seed = 0,
  cols = ['#a81808', '#f04a0c', '#ff9a1e', '#ffe060', '#fff8c0']) {
  for (let x = x0; x < x1; x++) {
    const n = Math.sin(x * 0.31 + seed + t * 5.3) * 0.35 + Math.sin(x * 0.083 + seed * 2 - t * 2.1) * 0.45 +
              Math.sin(x * 0.67 + t * 9.7 + seed) * 0.2;
    const h = Math.max(0, Math.round(maxH * k * (0.55 + n * 0.5)));
    if (h <= 0) continue;
    const top = baseY - h;
    g.fillStyle = cols[0]; g.fillRect(x, top, 1, h);
    if (h > 3) { g.fillStyle = cols[1]; g.fillRect(x, top + Math.round(h * 0.18), 1, h - Math.round(h * 0.18)); }
    if (h > 6) { g.fillStyle = cols[2]; g.fillRect(x, top + Math.round(h * 0.42), 1, h - Math.round(h * 0.42)); }
    if (h > 9) { g.fillStyle = cols[3]; g.fillRect(x, top + Math.round(h * 0.66), 1, h - Math.round(h * 0.66)); }
    if (h > 14) { g.fillStyle = cols[4]; g.fillRect(x, top + Math.round(h * 0.86), 1, h - Math.round(h * 0.86)); }
    // Detached licks above the tongue tips
    if (((x * 7 + Math.floor(t * 12)) % 23) === 0) { g.fillStyle = cols[1]; g.fillRect(x, top - 3, 1, 2); }
  }
}
