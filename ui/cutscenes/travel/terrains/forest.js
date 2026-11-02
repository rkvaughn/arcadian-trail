/**
 * Forest — the road through the woods. Variants:
 *   pine     layered blue → green conifer ridges, a dense dark pine wall
 *   autumn   maples and oaks in red / orange / gold, leaves drifting down
 *   redwood  giant red trunks framing the road, ferns, shafts of light
 */

import { W, H, R, rng, ridge, strip, ditherFill, drawPuff, draw } from '../../kit.js';
import { INK, pineSprite, roundTreeSprite } from '../../sprites.js';

export const VARIANTS = ['pine', 'autumn', 'redwood'];

const MW = 960;

/** Screen x of layer pixel `lx` on a wrapping layer (matches kit.drawWrap). */
function sx(lx, run, speed, period, margin = 40) {
  let x = ((lx - run * speed) % period + period) % period;
  if (x > W + margin) x -= period;
  return x;
}

/** Procedural conifer: tiered triangle with lit left edge and INK outline. */
function conifer(g, x, base, h, pal) {
  const canopy = h - 3, maxHalf = Math.max(3, Math.round(h * 0.3));
  const half = (y) => Math.max(1, Math.round(((y + 1) / canopy) * maxHalf) - ((y % 6) < 2 && y > 4 ? 1 : 0));
  const top = base - h;
  for (let y = 0; y < canopy; y++) R(g, x - half(y) - 1, top + y, half(y) * 2 + 3, 1, INK);
  R(g, x, top - 1, 1, 1, INK);
  R(g, x - 1, base - 3, 3, 3, INK);
  for (let y = 0; y < canopy; y++) {
    const hw = half(y);
    R(g, x - hw, top + y, hw * 2 + 1, 1, pal.G);
    R(g, x + 1, top + y, hw, 1, pal.g);
    R(g, x - hw, top + y, 1, 1, pal.h);
  }
  R(g, x, base - 3, 1, 3, pal.T);
}

/** A ridge with a fringe of tiny pine points along its crest. */
function pineRidge(w, h, seed, amp, color, hi) {
  return strip(w, h, (g) => {
    const tops = ridge(g, w, h, { amp, base: h, seed, color, hi });
    const r = rng(seed * 3);
    for (let x = 0; x < w; x += r.int(2, 4)) {
      const th = r.int(3, 8), top = tops[x];
      for (let i = 0; i < th; i++) {
        const hw = Math.floor(((i + 1) / th) * 2);
        R(g, ((x - hw) % w + w) % w, top - th + i, hw * 2 + 1, 1, color);
      }
    }
  });
}

export function build(k) {
  const { variant, ROAD_TOP } = k;
  const r = rng(variant.length * 211 + 7);

  if (variant === 'redwood') return buildRedwood(k, r);

  const autumn = variant === 'autumn';
  const MH = 44;
  const far1 = pineRidge(640, 70, 21, 34, autumn ? '#9aa4c0' : '#8ea8c4', autumn ? '#b8c0d8' : '#aec4d8');
  const far2 = autumn
    ? strip(720, 54, (g, w, h) => {
      const tops = ridge(g, w, h, { amp: 22, base: h, seed: 33, color: '#8a6a6a', hi: '#a8888a' });
      const tr = rng(8);
      for (let x = 0; x < w; x += tr.int(3, 6)) {
        const c = tr.pick(['#a8584a', '#b8784a', '#9a6a5a', '#7a6a5a']);
        drawPuff(g, x, tops[x] + 2, tr.int(3, 5), c, null, 0.5);
        if (x < 8) drawPuff(g, x + w, tops[x] + 2, 4, c, null, 0.5);
      }
    })
    : pineRidge(720, 54, 45, 24, '#4e7e82', '#6a9a98');

  // Mid layer: dense forest wall
  const mid = strip(MW, MH, (g) => {
    R(g, 0, MH - 7, MW, 7, autumn ? '#6a4a2a' : '#1e3a24');
    R(g, 0, MH - 7, MW, 1, autumn ? '#8a5a2a' : '#2a4a2a');
    const pines = [
      { G: '#2a6a3a', g: '#1a4a2a', h: '#4a8a4a', T: '#4a3018' },
      { G: '#235a36', g: '#163e26', h: '#3e7a48', T: '#4a3018' },
      { G: '#2e7044', g: '#1c4c2e', h: '#58965a', T: '#4a3018' },
    ];
    if (!autumn) {
      // Back row (shorter, bluer) then front row (taller, greener)
      for (let x = 0; x < MW; x += r.int(5, 9)) {
        const h = r.int(18, 28);
        for (const dx of [0, -MW, MW]) conifer(g, x + dx, MH - 6, h, { G: '#2e5a52', g: '#1e4440', h: '#467a6a', T: '#3a2a1a' });
      }
      for (let x = 3; x < MW; x += r.int(7, 13)) {
        const h = r.int(26, 40), pal = r.pick(pines);
        for (const dx of [0, -MW, MW]) conifer(g, x + dx, MH - 2, h, pal);
      }
      // Clearings with a ranger tower now and then
      for (const tx of [280, 760]) {
        R(g, tx - 14, MH - 9, 28, 9, '#3a6a32'); R(g, tx - 14, MH - 9, 28, 1, '#5a8a44');
        R(g, tx - 4, MH - 30, 1, 24, '#5a4028'); R(g, tx + 4, MH - 30, 1, 24, '#5a4028');
        for (let y = MH - 28; y < MH - 6; y += 5) R(g, tx - 4, y, 9, 1, '#4a3420');
        R(g, tx - 6, MH - 37, 13, 7, '#6a4a2a'); R(g, tx - 5, MH - 35, 11, 3, '#2a2420'); R(g, tx - 7, MH - 38, 15, 2, '#8a3a2a');
      }
    } else {
      const fall = [
        ['#c83a2a', '#ff7a4a'], ['#e0702a', '#ffb050'], ['#d8a83a', '#ffe070'], ['#a83a3a', '#e86a5a'], ['#8a8a3a', '#c8c060'],
      ];
      for (let x = 0; x < MW; x += r.int(6, 11)) {           // soft back canopy
        const [c, lit] = r.pick(fall);
        for (const dx of [0, -MW, MW]) drawPuff(g, x + dx, MH - 18 - r.int(0, 6), r.int(7, 11), c, lit, 0.35);
      }
      const trees = fall.map(([c, lit]) => roundTreeSprite({ G: c, g: shadeHex(c, 0.7), h: lit, T: '#5a3a20', t: '#3a2414' }));
      for (let x = 2; x < MW; x += r.int(10, 18)) {
        const s = r() < 0.2 ? pineSprite(pines[0]) : r.pick(trees);
        for (const dx of [0, -MW, MW]) draw(g, s, x + dx, MH - 1 - s.h);
      }
    }
  });
  const lights = strip(MW, MH, (g) => {
    if (autumn) return;
    for (const tx of [280, 760]) { R(g, tx - 4, MH - 35, 3, 2, '#ffd870'); R(g, tx + 1, MH - 35, 3, 2, '#ffd870'); }
  });

  // Near: undergrowth and a guard rail along the road
  const near = strip(480, 14, (g, w) => {
    const tr = rng(17);
    for (let x = 0; x < w; x += tr.int(3, 6)) drawPuff(g, x, 9, tr.int(2, 4), autumn ? tr.pick(['#9a5a2a', '#b8782a', '#6a6a2a']) : tr.pick(['#2a5a2a', '#3a6a30']), autumn ? '#d8a040' : '#5a9a48', 0.4);
    R(g, 0, 10, w, 4, autumn ? '#7a4a24' : '#2a4a24');
    R(g, 0, 6, w, 1, '#b8bcc4'); R(g, 0, 7, w, 1, '#7a7e88');
    for (let x = 0; x < w; x += 16) R(g, x, 6, 1, 6, '#6a6e78');
  });

  const lr = rng(5);
  const leaves = Array.from({ length: autumn ? 22 : 0 }, () => ({
    x: lr.range(0, W), y: lr.range(0, H), sp: lr.range(14, 26), ph: lr.range(0, 6),
    c: k.shade(lr.pick(['#e0502a', '#ffb040', '#ffd060', '#c83a2a'])),
  }));
  const ferns = Array.from({ length: 7 }, (_, i) => ({ x: i * 110 + lr.int(0, 50), y: lr.int(162, 178) }));
  const fernDark = k.shade(autumn ? '#7a5a2a' : '#1e5a2a'), fernLit = k.shade(autumn ? '#c89a3a' : '#4a9a3e');

  return {
    ground: autumn ? '#6a4a2a' : '#1e3a24',
    dust: autumn ? '#9a7a5a' : '#7a7a5a',
    layers: [
      { c: far1, y: ROAD_TOP - MH - 2 - 52, speed: 0.05 },
      { c: far2, y: ROAD_TOP - MH - 2 - 30, speed: 0.12 },
      { c: mid, y: ROAD_TOP - MH - 2, speed: 0.34, lights },
      { c: near, y: ROAD_TOP - 14, speed: 0.75 },
    ],
    verge: autumn ? { base: '#7a5228', tuft: '#5a3a1a', hi: '#d8902a' } : { base: '#2e5a26', tuft: '#1e4a1e', hi: '#5a9a3a' },
    fore: autumn ? { base: '#6a4224', dark: '#4e2e18', detail: '#e0782a' } : { base: '#24482a', dark: '#18361e', detail: '#4a8a3a' },
    front(g, t, run) {
      for (const f of ferns) {
        const x = sx(f.x, run, 1.7, 770);
        if (x < -16 || x > W + 4) continue;
        const sway = Math.round(Math.sin(t * 2 + f.x) * 0.6);
        for (let i = 0; i < 5; i++) {
          const a = -Math.PI / 2 + (i - 2) * 0.5;
          for (let q = 1; q < 9; q++) R(g, Math.round(x + Math.cos(a) * q + (q > 5 ? sway : 0)), Math.round(f.y + Math.sin(a) * q * 0.9), 1, 1, q % 3 ? fernDark : fernLit);
        }
      }
      for (const l of leaves) {
        const x = ((l.x - t * l.sp * 0.6 - run * 0.4 + Math.sin(t * 1.7 + l.ph) * 6) % (W + 20) + W + 20) % (W + 20) - 10;
        const y = (l.y + t * l.sp) % (H + 10) - 5;
        R(g, x, y, 2, 1, l.c); if (Math.floor(t * 4 + l.ph) % 2) R(g, x + 1, y + 1, 1, 1, l.c);
      }
    },
  };
}

function shadeHex(hex, k) {
  const p = parseInt(hex.slice(1), 16);
  const ch = (s) => Math.round(((p >> s) & 255) * k);
  return '#' + [16, 8, 0].map(s => ch(s).toString(16).padStart(2, '0')).join('');
}

function buildRedwood(k, r) {
  const { ROAD_TOP } = k;
  const MH = 102;
  const TOP = ROAD_TOP - MH - 2;
  // Back: dim distant trunks under a dark canopy roof with a few sky gaps
  const back = strip(720, MH, (g, w) => {
    for (let x = 0; x < w; x += r.int(5, 9)) {
      const tw = r.int(2, 3);
      for (const dx of [0, -w, w]) { R(g, x + dx, 18, tw, MH - 18, '#4a3a3a'); R(g, x + dx, 18, 1, MH - 18, '#5a4644'); }
    }
    for (let x = 0; x < w; x += r.int(4, 7)) {
      const c = r.pick(['#1e3a30', '#24402e', '#1a3428']);
      for (const dx of [0, -w, w]) drawPuff(g, x + dx, r.int(0, 22), r.int(7, 12), c, '#2e5040', 0.4);
    }
    R(g, 0, MH - 8, w, 8, '#2a3a26');
  });
  // Mid: big red trunks with a lit canopy, ferny floor
  const mid = strip(MW, MH, (g) => {
    for (let x = 4; x < MW; x += r.int(14, 24)) {
      const tw = r.int(5, 8);
      for (const dx of [0, -MW, MW]) {
        R(g, x + dx - 1, 14, tw + 2, MH - 14, INK);
        R(g, x + dx, 14, tw, MH - 14, '#7a3a24');
        for (let s2 = 2; s2 < tw; s2 += 3) R(g, x + dx + s2, 14, 1, MH - 14, '#62301c');
        R(g, x + dx, 14, 1, MH - 14, '#a85a3a');
        R(g, x + dx - 2, MH - 4, tw + 4, 2, '#6a3020');
      }
    }
    for (let x = 0; x < MW; x += r.int(5, 8)) {
      const c = r.pick(['#2e5034', '#36583a', '#28482e']);
      for (const dx of [0, -MW, MW]) drawPuff(g, x + dx, r.int(0, 18), r.int(7, 11), c, '#5a8a50', 0.4);
    }
    R(g, 0, MH - 6, MW, 6, '#2a3a22');
    for (let x = 0; x < MW; x += r.int(5, 9)) for (const dx of [0, -MW, MW]) drawPuff(g, x + dx, MH - 6, r.int(2, 4), '#2e5a2a', '#5a9a40', 0.4);
  });
  // Giant trunks between the forest and the road, filling the frame's height
  const giant = strip(1200, ROAD_TOP, (g) => {
    for (const gx of [80, 430, 620, 980]) {
      const tw = r.int(16, 24), base = ROAD_TOP;
      R(g, gx - 1, 0, tw + 2, base, INK);
      R(g, gx, 0, tw, base, '#8a3e26');
      for (let s2 = 2; s2 < tw - 1; s2 += 3) R(g, gx + s2, 0, 1, base, '#6a2c1a');
      R(g, gx + 1, 0, 2, base, '#b8603a');
      for (let i = 0; i < 6; i++) R(g, gx - i, base - 6 + i, tw + i * 2, 1, i % 2 ? '#7a3420' : '#8a3e26');
      R(g, gx - 7, base - 1, tw + 14, 1, INK);
    }
  });
  // Shafts of light slanting down beneath the canopy
  const shafts = strip(W + 140, ROAD_TOP, (g) => {
    for (const s0 of [20, 130, 230, 350]) {
      for (let y = 26; y < ROAD_TOP; y++) ditherFill(g, s0 + Math.round(y * 0.45), y, 12, 1, '#fff0b8', 0.1 * (1 - (y - 26) / (ROAD_TOP - 26)) + 0.03);
    }
  });
  const near = strip(480, 14, (g, w) => {
    const tr = rng(19);
    R(g, 0, 9, w, 5, '#26401e');
    for (let x = 0; x < w; x += tr.int(3, 5)) drawPuff(g, x, 9, tr.int(2, 4), tr.pick(['#2a5a26', '#3a6a2e']), '#6aaa4a', 0.4);
  });
  const lr = rng(77);
  const ferns = Array.from({ length: 8 }, (_, i) => ({ x: i * 96 + lr.int(0, 40), y: lr.int(160, 178) }));
  const fernDark = k.shade('#1e5a2a'), fernLit = k.shade('#5aaa48');
  const day = !k.lit && k.group !== 'overcast';
  return {
    ground: '#26401e',
    dust: '#7a6a4a',
    layers: [
      { c: back, y: TOP, speed: 0.14 },
      { c: mid, y: TOP, speed: 0.3 },
      { c: near, y: ROAD_TOP - 14, speed: 0.75 },
      { c: giant, y: 0, speed: 0.6 },
    ],
    verge: { base: '#2e4a24', tuft: '#1e3a1a', hi: '#5a8a3a' },
    fore: { base: '#22401e', dark: '#163016', detail: '#4a8a3a' },
    animate(g, t) {
      if (!day) return;
      g.globalAlpha = 0.7 + 0.3 * Math.sin(t * 0.6);
      g.drawImage(shafts, -Math.round((t * 2) % 140), 0);
      g.globalAlpha = 1;
    },
    front(g, t, run) {
      for (const f of ferns) {
        const x = sx(f.x, run, 1.7, 770);
        if (x < -16 || x > W + 4) continue;
        const sway = Math.round(Math.sin(t * 2 + f.x) * 0.6);
        for (let i = 0; i < 6; i++) {
          const a = -Math.PI / 2 + (i - 2.5) * 0.45;
          for (let q = 1; q < 11; q++) R(g, Math.round(x + Math.cos(a) * q + (q > 6 ? sway : 0)), Math.round(f.y + Math.sin(a) * q * 0.9), 1, 1, q % 3 ? fernDark : fernLit);
        }
      }
    },
  };
}
