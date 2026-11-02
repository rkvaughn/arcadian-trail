/**
 * Mountain — high country. Variants:
 *   alpine  jagged snowy peaks, pine slopes, a cliff with a waterfall
 *   pass    rocky peaks and a cliff wall with switchbacks, a tunnel, guard rail,
 *           and the occasional rockfall
 *   lake    peaks mirrored in a shimmering lake, with a dock, cabins and a canoe
 */

import { W, R, rng, ridge, strip, draw, sprite } from '../../kit.js';
import { INK, pineSprite } from '../../sprites.js';
import { wrapX } from './common.js';

export const VARIANTS = ['alpine', 'pass', 'lake'];

const MW = 960;

function cabinSprite() {
  return sprite([
    '.......RR.......', '......RRRR......', '.....RRRRRR.....', '....RRRRRRRR....', '...RRRRRRRRRR...',
    '..rrrrrrrrrrrr..', '...LLLLLLLLLL...', '...LwwLLLLwwL...', '...LwwLLDDLwwL..', '...llllLDDllll..',
    '...LLLLLDDLLLL..', '...llllllllllll.',
  ], { R: '#5a3a2a', r: '#3a2418', L: '#9a6a3a', l: '#7a5028', w: '#a8c8d8', D: '#4a2a18' }, { outline: INK });
}

function boulderSprite(big) {
  return big
    ? sprite(['..rrrr..', '.rRhRRr.', 'rRhRRRRr', 'RRRRRRRd', '.dddddd.'], { r: '#8a8a92', R: '#6e6e78', h: '#b0b0b8', d: '#4a4a52' }, { outline: INK })
    : sprite(['.rr.', 'rhRr', 'RRRd'], { r: '#8a8a92', R: '#6e6e78', h: '#b0b0b8', d: '#4a4a52' }, { outline: INK });
}

export function build(k) {
  const { variant, ROAD_TOP } = k;
  const r = rng(variant.length * 313 + 3);

  // ── Far: tall peaks (the defining shape of this terrain) ──────────────────
  const FH = 92;
  const far = strip(640, FH, (g, w, h) => ridge(g, w, h, variant === 'pass'
    ? { amp: 62, base: h, seed: 37, color: '#6a6e7e', hi: '#9a9eac', jag: 0.7, snow: '#e8ecf4', snowLine: 34 }
    : { amp: 84, base: h, seed: 29, color: '#5e6e92', hi: '#a0aec8', jag: 0.65, snow: '#f4f8ff', snowLine: 44 }));
  const pineFar = sprite(['..g..', '.ggg.', '.ggg.', 'ggggg', '..t..'], { g: '#3a5a5a', t: '#2a3a3a' });
  const second = strip(640, 46, (g, w, h) => {
    const tops = ridge(g, w, h, { amp: 22, base: h, seed: 53, color: variant === 'pass' ? '#5a5a62' : '#3e6060', hi: variant === 'pass' ? '#7a7a84' : '#5a8070' });
    if (variant === 'pass') return;
    const tr = rng(61);
    for (let x = 0; x < w - 5; x += tr.int(3, 7)) draw(g, pineFar, x, tops[x + 2] - 3 + tr.int(0, 3));
  });

  // ── Mid layer ────────────────────────────────────────────────────────────
  const MH = variant === 'pass' ? 56 : 44;
  const pine = pineSprite(), pineDark = pineSprite({ G: '#1e5a34', g: '#12402a', h: '#3a7a4a', T: '#4a3018' });
  const cabin = cabinSprite();
  const bBig = boulderSprite(true), bSmall = boulderSprite(false);
  const falls = [];          // waterfall x positions (layer coords)
  const cabins = [];
  const mid = strip(MW, MH, (g, w, h) => {
    const place = (spr, x, baseY) => { for (const dx of [0, -w]) draw(g, spr, x + dx, baseY - spr.h); };
    if (variant === 'alpine') {
      const tops = ridge(g, w, h, { amp: 34, base: h, seed: 71, color: '#4a8a40', hi: '#7ab85a' });
      // Cliff faces with waterfalls
      for (const cx of [300, 760]) {
        for (let y = 2; y < h - 8; y++) {
          const half = 9 + Math.round((y / h) * 6);
          R(g, cx - half, y, half * 2, 1, y % 6 === 0 ? '#6a6a72' : '#7e7e88');
          R(g, cx + half - 4, y, 4, 1, '#5a5a64');
        }
        R(g, cx - 8, 2, 16, 1, '#9a9aa4');
        falls.push(cx);
      }
      // Pine forest clusters on the slope
      const pr = rng(83);
      for (let x = 4; x < w - 12; x += pr.int(6, 16)) {
        if (Math.abs(x - 300) < 20 || Math.abs(x - 760) < 20) continue;
        const spr = pr() < 0.5 ? pine : pineDark;
        const top = tops[x + 5] + spr.h - 4;
        place(spr, x, Math.min(h - 1, top + pr.int(0, Math.max(0, h - 1 - top))));
      }
      place(cabin, 520, h - 4);
      cabins.push({ x: 520, y: h - 4 - cabin.h });
    } else if (variant === 'pass') {
      // A tall rock wall with a jagged crest, flat lit bands and a few cracks
      const crest = [];
      for (let x = 0; x < w; x++) {
        const u = (x / w) * Math.PI * 2;
        crest.push(Math.round(6 + 5 * Math.abs(Math.sin(u * 7)) + 3 * Math.sin(u * 3 + 1) + 2 * Math.abs(Math.sin(u * 19))));
      }
      for (let x = 0; x < w; x++) {
        const top = crest[x];
        R(g, x, top, 1, h - top, '#a08e7c');
        R(g, x, top + 14, 1, h - top - 14, '#927f6e');
        R(g, x, top + 30, 1, Math.max(0, h - top - 30), '#847162');
        R(g, x, top, 1, 1, '#d0bea8');
        if (crest[(x + 1) % w] > top) R(g, x, top + 1, 1, 2, '#bcaa94');
      }
      const cr = rng(97);
      for (let i = 0; i < 12; i++) {
        let x = cr.int(0, w), y = crest[x] + cr.int(2, 8);
        for (let s2 = 0; s2 < cr.int(8, 18); s2++) { R(g, x, y, 1, 1, '#6a5a4c'); x += cr.int(-1, 1); y += 1; }
      }
      // Ledges with scrubby pines
      for (let x = 0; x < w; x += cr.int(40, 90)) { const ly = cr.int(18, 34); R(g, x, ly, cr.int(14, 30), 1, '#c8b6a0'); R(g, x, ly + 1, 20, 1, '#6e5e50'); }
      for (let x = 10; x < w - 12; x += cr.int(30, 70)) place(pineDark, x, Math.max(crest[x + 5] + pine.h - 2, cr.int(20, 36)));
      // Switchback road cut diagonally across the wall
      for (const [x0, y0, len, dir] of [[60, 40, 200, -1], [380, 18, 220, 1], [700, 36, 200, -1]]) {
        for (let i = 0; i < len; i++) {
          const x = x0 + i, y = Math.round(y0 + dir * i * 0.09);
          R(g, x, y, 1, 3, '#4a4a50');
          R(g, x, y - 1, 1, 1, '#a8a8b0');
          if (i % 6 === 0) R(g, x, y - 3, 1, 2, '#c8c8d0');
        }
      }
      // Tunnel portal on the upper switchback
      const tx = 560, ty = 24;
      for (let y = 0; y < 10; y++) { const half = Math.round(7 * Math.sqrt(1 - ((10 - y) / 10) ** 2)); R(g, tx - half - 2, ty - 10 + y, half * 2 + 4, 1, '#a8a49a'); }
      for (let y = 0; y < 9; y++) { const half = Math.round(5 * Math.sqrt(1 - ((9 - y) / 9) ** 2)); R(g, tx - half, ty - 9 + y, half * 2, 1, '#14141a'); }
      // Talus at the base
      R(g, 0, h - 7, w, 7, '#8e7e70'); R(g, 0, h - 7, w, 1, '#b0a090');
      const br = rng(5);
      for (let x = 6; x < w - 12; x += br.int(20, 50)) place(br() < 0.4 ? bBig : bSmall, x, h - 1);
    } else {
      // Lake: far shore tree line, mirrored peaks, open water, near shore
      const shoreY = 8, waterBot = h - 9;
      const tops = [];
      for (let x = 0; x < w; x++) tops.push(Math.round(5 + 4 * Math.sin((x / w) * Math.PI * 6) + 2 * Math.sin((x / w) * Math.PI * 14)));
      for (let x = 0; x < w; x++) R(g, x, tops[x], 1, shoreY - tops[x] + 1, '#2e5a44');
      for (let x = 0; x < w; x += 3) R(g, x, tops[x] - 2, 2, 3, '#2e5a44');
      R(g, 0, shoreY + 1, w, waterBot - shoreY - 1, '#3a6a9a');
      // Reflection of the peaks: mirrored ridge, darker, broken by ripples
      const refl = [];
      for (let x = 0; x < w; x++) {
        let v = 0;
        for (const [kk, a, p] of [[3, 1, 0.4], [5, 0.6, 1.7], [9, 0.3, 2.2]]) v += a * Math.abs(Math.sin((x / w) * Math.PI * kk + p));
        refl.push(Math.round(v * 9));
      }
      for (let x = 0; x < w; x++) {
        for (let y = 0; y < refl[x]; y++) {
          const yy = shoreY + 1 + y;
          if (yy >= waterBot) break;
          if ((yy % 3) === 0 && ((x + yy) % 4) < 2) continue;      // ripple breaks
          R(g, x, yy, 1, 1, y > refl[x] - 4 && y < 8 ? '#a8c0d8' : '#2e5482');
        }
      }
      for (let y = shoreY + 2; y < waterBot; y += 3) for (let x = (y * 7) % 23; x < w; x += 23) R(g, x, y, 6, 1, '#5a8ab8');
      // Near shore
      R(g, 0, waterBot, w, h - waterBot, '#5a8a4a');
      R(g, 0, waterBot, w, 1, '#8a8a7a');
      // Dock, cabins, canoe, shoreline pines
      for (const dx of [160, 640]) {
        R(g, dx, waterBot - 6, 30, 2, '#8a6a44'); R(g, dx, waterBot - 6, 30, 1, '#b08a5a');
        for (let p = 0; p < 30; p += 6) R(g, dx + p, waterBot - 4, 1, 4, '#5a4028');
        place(cabin, dx + 34, h - 2);
        cabins.push({ x: dx + 34, y: h - 2 - cabin.h });
      }
      R(g, 420, waterBot - 12, 14, 2, '#c84a2a'); R(g, 421, waterBot - 11, 12, 1, '#8a2a1a');
      const pr = rng(43);
      for (let x = 4; x < w - 12; x += pr.int(14, 40)) {
        if ((x > 150 && x < 240) || (x > 630 && x < 720)) continue;
        place(pr() < 0.5 ? pine : pineDark, x, h - 2);
      }
    }
  });
  const lights = cabins.length ? strip(MW, MH, (g) => {
    for (const c of cabins) { R(g, c.x + 4, c.y + 7, 2, 2, '#ffd070'); R(g, c.x + 11, c.y + 7, 2, 2, '#ffd070'); }
  }) : null;

  // ── Near strip: rail or rocks right above the road ────────────────────────
  const near = strip(480, 12, (g, w) => {
    R(g, 0, 5, w, 7, variant === 'pass' ? '#8a8a90' : '#5a8a44');
    R(g, 0, 5, w, 1, variant === 'pass' ? '#a8a8b0' : '#7ab85a');
    if (variant === 'pass') {
      // Steel W-beam guard rail
      for (let x = 0; x < w; x += 12) R(g, x + 2, 3, 1, 7, '#5a5a62');
      R(g, 0, 3, w, 2, '#c8ccd2'); R(g, 0, 5, w, 1, '#8a8e96');
    } else {
      const nr = rng(57);
      for (let i = 0; i < 10; i++) draw(g, bSmall, nr.int(0, w - 6), 7);
      for (let i = 0; i < 30; i++) R(g, nr.int(0, w), nr.int(6, 10), 1, 1, nr.pick(['#e8e8f0', '#c8a0ff', '#ffe060']));
    }
  });

  // ── Live props ─────────────────────────────────────────────────────────────
  const water = [k.shade('#c8e4f8'), k.shade('#8ab8e0'), k.shade('#ffffff')];
  const rockC = [k.shade('#8a8a92'), k.shade('#5a5a62')];
  const sparkle = k.shade('#ffffff');
  const big = Array.from({ length: 6 }, (_, i) => ({ x: i * 120 + r.int(0, 50), y: r.int(158, 178), s: r.int(4, 8) }));
  const midY = ROAD_TOP - MH;

  return {
    ground: variant === 'pass' ? '#847162' : '#4a8a40',
    dust: variant === 'pass' ? '#a8a8b0' : '#a89a7a',
    road: { asphalt: '#2e2e36', grain: '#3a3a42', edge: '#d8d8d0', dash: '#e8c040', lip: '#222228' },
    layers: [
      { c: far, y: midY - FH + 30, speed: 0.04 },
      { c: second, y: midY - 30, speed: 0.12 },
      { c: mid, y: midY, speed: 0.32, lights },
      { c: near, y: ROAD_TOP - 12, speed: 0.75 },
    ],
    verge: variant === 'pass' ? { base: '#7a7a82', tuft: '#5a6a4a', hi: '#8a9a6a' } : { base: '#4a8a3a', tuft: '#3a7030', hi: '#7ab85a' },
    fore: variant === 'pass'
      ? { base: '#6e6e76', dark: '#5a5a62', detail: '#8a9a6a' }
      : { base: '#3e7a34', dark: '#2e6028', detail: '#e8e8f0' },
    animate(g, t, run) {
      if (variant === 'alpine') {
        // Waterfalls: falling streaks and a mist pool at the base
        for (const fx of falls) {
          const x = wrapX(fx + 40, run, 0.32, MW);
          if (x < -12 || x > W + 12) continue;
          const top = midY + 3, bot = ROAD_TOP - 8;
          R(g, x - 3, top, 6, bot - top, water[1]);
          for (let i = 0; i < 6; i++) {
            const y = top + ((t * 40 + i * 9) % (bot - top));
            R(g, x - 3 + (i % 3) * 2, Math.round(y), 1, 4, water[0]);
          }
          for (let i = 0; i < 6; i++) R(g, Math.round(x - 6 + i * 2 + Math.sin(t * 6 + i) * 1.5), bot - 1 - (i % 2), 2, 1, water[2]);
        }
      } else if (variant === 'pass') {
        // Rockfall: a few stones bounce down the cliff every few seconds
        const cyc = t % 7;
        if (cyc < 2.2) {
          const x0 = wrapX(250 + 40, run, 0.32, MW);
          for (let i = 0; i < 3; i++) {
            const tt = cyc - i * 0.25;
            if (tt < 0) continue;
            const y = midY + 2 + tt * tt * 22;
            if (y > ROAD_TOP - 6) continue;
            const x = Math.round(x0 + i * 4 + tt * 8);
            const by = Math.round(y - Math.abs(Math.sin(tt * 9)) * 2);
            R(g, x, by, 3, 2, rockC[0]); R(g, x, by + 2, 3, 1, rockC[1]);
            R(g, x + 1, Math.round(by - 3), 1, 1, rockC[0]);
          }
        }
      } else {
        // Sun glints dancing on the lake
        const y0 = midY + 9, y1 = ROAD_TOP - 10;
        for (let i = 0; i < 26; i++) {
          if (Math.floor(t * 3 + i * 1.7) % 4 !== 0) continue;
          const x = wrapX(i * 37 + 40, run, 0.32, MW);
          if (x < 0 || x > W) continue;
          R(g, x, y0 + ((i * 13) % (y1 - y0)), 2, 1, sparkle);
        }
      }
    },
    front(g, t, run) {
      // Foreground boulders flying past
      for (const b of big) {
        const x = wrapX(b.x, run, 1.7, 720);
        if (x < -20 || x > W + 10) continue;
        R(g, x + 1, b.y - b.s, b.s * 2 - 2, b.s, rockC[0]);
        R(g, x, b.y - b.s + 2, b.s * 2, b.s - 2, rockC[0]);
        R(g, x + 2, b.y - b.s, b.s, 1, water[0]);
        R(g, x, b.y - 1, b.s * 2, 1, rockC[1]);
      }
    },
  };
}
