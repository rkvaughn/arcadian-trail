/**
 * Coastal — the road hugs the shore with the ocean behind it. Variants:
 *   beach    sandy beach, palms, striped umbrellas, a lifeguard tower, a pier,
 *            gulls, rolling wave lines and sun glitter on the water
 *   cliffs   grassy clifftop, distant headlands and sea stacks with surf
 *            bursting at their feet, a lighthouse that sweeps at dusk/night
 *   harbor   a working quay: cranes, stacked containers, warehouses, fishing
 *            boats bobbing at the docks, sailboats drifting on the horizon
 *
 * The ocean animates (crest lines, glitter, foam), so `animate` paints the
 * water live and then redraws the mid and near layers on top of it; anything
 * that sits on the water (moored boats, sails) is drawn live in between.
 */

import { W, R, rng, ridge, strip, ditherFill, ditherBands, draw, drawWrap, makeCanvas, sprite } from '../../kit.js';
import { INK, palmSprite, houseSprite, birdSprites } from '../../sprites.js';
import { wrapX } from './common.js';

export const VARIANTS = ['beach', 'cliffs', 'harbor'];

const MW = 960;           // mid layer width
const FAR_SPEED = 0.03, MID_SPEED = 0.32, NEAR_SPEED = 0.75;

/** Copy a (cached, shared) sprite and tint the copy for time of day. */
function tinted(k, spr) {
  const [c, g] = makeCanvas(spr.c.width, spr.c.height);
  g.drawImage(spr.c, 0, 0);
  k.tint(c);
  return { ...spr, c };
}

function umbrella(g, x, baseY, a, b) {
  for (let i = 0; i < 6; i++) {
    const hw = Math.round(Math.sqrt(Math.max(0, 36 - (5 - i) * (5 - i))) * 1.1);
    for (let xx = -hw; xx < hw; xx++) R(g, x + xx, baseY - 14 + i, 1, 1, Math.floor((xx + 12) / 3) % 2 ? a : b);
  }
  R(g, x - 7, baseY - 9, 14, 1, INK);
  R(g, x, baseY - 8, 1, 8, '#e8e0d0');
}

function palmTrunk(g, x, baseY, h, lean) {
  for (let i = 0; i < h; i++) {
    const xx = Math.round(x + lean * (i / h) * (i / h) * 6);
    R(g, xx, baseY - i, 3, 1, i % 3 === 0 ? '#6a4a24' : '#8a6234');
    R(g, xx - 1, baseY - i, 1, 1, INK); R(g, xx + 3, baseY - i, 1, 1, INK);
  }
}

function boatSprite(hull, cabin) {
  return sprite([
    '.......MM.........', '.......M..........', '....cccccc........', '....cWWcWWc.......',
    '....cccccccc......', 'HHHHHHHHHHHHHHHHHH', '.hHHHHHHHHHHHHHHh.', '..hhhhhhhhhhhhhh..',
  ], { M: '#5a5a62', c: cabin, W: '#a8d8f0', H: hull, h: '#2a2a34' }, { outline: INK });
}

function sailSprite(sail) {
  return sprite([
    '....S.....', '....SS....', '....SSS...', '....SSSS..', '....SSSSS.', '....SSSSSS',
    '...SSSSSS.', 'HHHHHHHHHH', '.HHHHHHHH.',
  ], { S: sail, H: '#7a4a2a' }, { outline: INK });
}

export function build(k) {
  const { variant, ROAD_TOP } = k;
  const r = rng(variant.length * 211 + 7);

  // ── Far: the ocean (static base; crests/glitter are animated) ──────────────
  const FAR_Y = 54, FAR_H = 46, SEA_TOP = 6;       // sea horizon at screen y 60
  const far = strip(640, FAR_H, (g, w) => {
    ditherBands(g, 0, SEA_TOP, w, FAR_H - SEA_TOP, ['#8ab8e0', '#5a98d0', '#3a7cc0', '#2c66aa', '#245a9c']);
    const fr = rng(5);
    for (let i = 0; i < 160; i++) {
      const y = fr.int(SEA_TOP + 2, FAR_H - 2);
      R(g, fr.int(0, w), y, fr.int(2, 3 + Math.floor((y - SEA_TOP) / 8)), 1, '#6aa4d8');
    }
    if (variant === 'cliffs') {
      // Distant headlands with steep cliff faces and sea stacks
      for (const [x0, len, ht] of [[20, 120, 22], [260, 90, 15], [430, 150, 26]]) {
        for (let x = 0; x < len; x++) {
          const u = x / len;
          const top = Math.round(SEA_TOP + 6 - ht * Math.min(1, u * 5) * (1 - Math.pow(u, 4)) * (0.8 + 0.12 * Math.sin(x * 0.09 + x0) + 0.08 * Math.sin(x * 0.23)));
          R(g, x0 + x, top, 1, FAR_H - top, u > 0.85 ? '#6a5a50' : '#7a6a5a');
          R(g, x0 + x, top, 1, 2, '#6a8a4a');
          if (u < 0.22) R(g, x0 + x, top + 2, 1, FAR_H - top - 2, '#64544a');
        }
      }
      for (const [x, h] of [[160, 10], [172, 6], [385, 12], [600, 8]]) {
        R(g, x, SEA_TOP + 6 - h, 5, h + 30, '#6a5a4c'); R(g, x, SEA_TOP + 6 - h, 5, 1, '#6a8a4a'); R(g, x + 3, SEA_TOP + 7 - h, 2, h + 30, '#544638');
      }
    } else if (variant === 'harbor') {
      // Breakwater with a small light, distant freighters
      R(g, 0, SEA_TOP + 14, w, 3, '#8a8a84'); R(g, 0, SEA_TOP + 14, w, 1, '#b0b0a8');
      for (let x = 0; x < w; x += 7) R(g, x, SEA_TOP + 16, 4, 1, '#6a6a64');
      for (const sx of [120, 470]) { R(g, sx, SEA_TOP + 4, 3, 10, '#e8e4dc'); R(g, sx, SEA_TOP + 4, 3, 2, '#c83a2a'); }
      for (const [sx, l] of [[230, 34], [560, 26]]) {
        R(g, sx, SEA_TOP - 3, l, 3, '#4a4a54'); R(g, sx + l - 8, SEA_TOP - 7, 6, 4, '#e8e4dc'); R(g, sx + 4, SEA_TOP - 5, 4, 2, '#c84a3a'); R(g, sx + 10, SEA_TOP - 5, 4, 2, '#3a7ac8');
      }
    } else {
      // A hazy island and a far headland
      for (const [x0, len, ht] of [[90, 70, 7], [400, 110, 10]]) {
        for (let x = 0; x < len; x++) {
          const top = Math.round(SEA_TOP - ht * Math.sin((x / len) * Math.PI));
          R(g, x0 + x, top, 1, SEA_TOP - top + 1, '#7a9ab0');
        }
      }
    }
  });

  // ── Mid layer per variant ─────────────────────────────────────────────────
  const MH = variant === 'harbor' ? 62 : 34;
  const midY = ROAD_TOP - MH - 2;
  const SH = 104 - 18 - midY;                     // canvas y of the shoreline (screen 86)
  const live = { palms: [], boats: [], lighthouse: null };
  const crowns = [tinted(k, palmSprite(0)), tinted(k, palmSprite(1))];

  const mid = strip(MW, MH, (g) => {
    if (variant === 'beach') {
      R(g, 0, SH, MW, 4, '#c8a868');                 // wet sand
      R(g, 0, SH + 3, MW, 1, '#d8b878');
      R(g, 0, SH + 4, MW, MH - SH - 4, '#ecd49c');   // dry sand
      const sr = rng(55);                             // shells and pebbles
      for (let i = 0; i < 90; i++) R(g, sr.int(0, MW), sr.int(SH + 5, MH - 6), sr() < 0.5 ? 2 : 1, 1, sr.pick(['#f8f0e0', '#c8a878', '#e8a8a0']));
      // Dunes with sea oats toward the road
      for (let x = 0; x < MW; x++) {
        const d = Math.round(3 + Math.sin((x / MW) * Math.PI * 16) * 2 + Math.sin((x / MW) * Math.PI * 4) * 2);   // whole cycles: seamless wrap
        R(g, x, MH - d, 1, d, '#d8bc80');
        if (x % 5 === 0) { R(g, x, MH - d - 3, 1, 3, '#8a9a4a'); R(g, x + 1, MH - d - 4, 1, 2, '#a8b05a'); }
      }
      // Towels, umbrellas, sandcastles, lifeguard tower, pier
      const ur = rng(77);
      for (let x = 30; x < MW - 40; x += ur.int(60, 120)) {
        if (x > 300 && x < 460) continue;          // pier zone
        const [a, b] = ur.pick([['#e84a4a', '#f8f0e0'], ['#3a8ae8', '#f8f0e0'], ['#f0c030', '#e85a2a'], ['#2ab08a', '#f8f0e0']]);
        umbrella(g, x, SH + 12, a, b);
        R(g, x + 6, SH + 10, 9, 3, ur.pick(['#e85a8a', '#4ac0e8', '#f0d040'])); R(g, x + 6, SH + 11, 9, 1, '#ffffff');
        if (ur() < 0.5) { R(g, x - 16, SH + 9, 5, 3, '#c8a868'); R(g, x - 15, SH + 7, 3, 2, '#c8a868'); R(g, x - 14, SH + 5, 1, 2, '#c8a868'); R(g, x - 14, SH + 4, 2, 1, '#e84a4a'); }
      }
      // Lifeguard tower
      for (const lx of [220, 760]) {
        R(g, lx, SH - 6, 1, 18, '#e8e0d0'); R(g, lx + 10, SH - 6, 1, 18, '#e8e0d0'); R(g, lx + 1, SH + 2, 9, 1, '#c8c0b0');
        R(g, lx - 2, SH - 13, 15, 8, '#e8503a'); R(g, lx - 1, SH - 11, 13, 3, '#f8f0e0'); R(g, lx - 3, SH - 15, 17, 2, '#c8402a');
        R(g, lx + 4, SH - 19, 1, 4, '#5a5a62'); R(g, lx + 5, SH - 19, 4, 2, '#f0d040');
      }
      // Pier: deck on posts reaching into the surf
      R(g, 300, SH - 9, 160, 3, '#8a6234'); R(g, 300, SH - 9, 160, 1, '#b08850');
      for (let x = 302; x < 460; x += 8) R(g, x, SH - 6, 2, 10, '#5a3e22');
      for (let x = 300; x < 460; x += 4) R(g, x, SH - 12, 1, 3, '#6a4a2a');
      R(g, 300, SH - 12, 160, 1, '#8a6234');
      R(g, 420, SH - 22, 22, 13, '#e8dcc8'); R(g, 418, SH - 25, 26, 3, '#3a7ac8'); R(g, 426, SH - 18, 3, 4, '#5a9ad0'); R(g, 433, SH - 18, 3, 4, '#5a9ad0');
      // Palm trunks (crowns sway live)
      const pr = rng(19);
      for (let x = 10; x < MW - 20; x += pr.int(48, 110)) {
        if (x > 290 && x < 470) continue;
        const h = pr.int(20, 30), lean = pr.pick([-1, 1]);
        palmTrunk(g, x, SH + 14, h, lean);
        live.palms.push({ x: x + 1 + lean * 6, y: SH + 14 - h, ph: pr.range(0, 6) });
      }
    } else if (variant === 'cliffs') {
      // Clifftop meadow with a rocky lip, wind-bent cypress, stone wall, cottage
      for (let x = 0; x < MW; x++) {
        const lip = Math.round(SH - 2 + Math.sin((x / MW) * Math.PI * 22) * 1.5 + Math.sin((x / MW) * Math.PI * 6) * 2);
        R(g, x, lip, 1, MH - lip, '#5a8a3a');
        R(g, x, lip, 1, 1, '#8aba5a');
        if ((x * 7) % 11 === 0) R(g, x, lip + 1, 1, 2, '#7a6a5a');
      }
      const fl = rng(57);                             // wildflowers in the clifftop grass
      for (let i = 0; i < 110; i++) R(g, fl.int(0, MW), fl.int(SH + 2, MH - 8), 1, 1, fl.pick(['#ffe060', '#ffffff', '#c8a0ff', '#4a7a30', '#4a7a30']));
      const cr = rng(41);
      for (let x = 20; x < MW - 30; x += cr.int(70, 150)) {
        if (x > 460 && x < 560) continue;          // lighthouse ground
        // Wind-sculpted cypress leaning inland
        R(g, x + 3, SH - 4, 2, 10, '#4a3420');
        for (let i = 0; i < 9; i++) R(g, x + Math.round(i * 0.6), SH - 6 - i, 12 - i, 1, i % 2 ? '#2a5a2a' : '#356a32');
        R(g, x + 1, SH - 7, 9, 1, '#4a8a3a');
      }
      for (let x = 0; x < MW; x += 5) { R(g, x, MH - 6, 4, 3, '#9a948a'); R(g, x, MH - 6, 4, 1, '#bab4aa'); R(g, x + 4, MH - 6, 1, 3, '#6a645a'); }
      const cottage = houseSprite({ R: '#4a5a6a', r: '#364250', W: '#e8e4dc', w: '#c0bcb4', D: '#3a4a7a', G: '#ffd870', g: '#90b8d8', C: '#6a6a70' });
      draw(g, cottage, 640, SH + 6 - cottage.h);
      live.lighthouse = { x: 500, base: SH + 6 };
      // Lighthouse keeper's base and path baked in
      R(g, 492, SH + 2, 26, 4, '#d8d0c0'); R(g, 492, SH + 2, 26, 1, '#f0e8d8');
    } else {
      // Harbor: water to the quay, docks on piles, cranes, containers, sheds
      const QY = MH - 12;                            // quay top (screen 92)
      R(g, 0, QY, MW, 12, '#8a8a8a'); R(g, 0, QY, MW, 1, '#b8b8b0'); R(g, 0, QY + 11, MW, 1, '#6a6a68');
      for (let x = 0; x < MW; x += 12) R(g, x, QY + 1, 1, 11, '#6a6a68');
      // Docks reaching out from the quay
      for (const dx of [40, 250, 520, 760]) {
        R(g, dx, QY - 5, 70, 3, '#8a6234'); R(g, dx, QY - 5, 70, 1, '#b08850');
        for (let x = dx + 2; x < dx + 70; x += 9) R(g, x, QY - 2, 2, 4, '#4a3420');
        R(g, dx + 66, QY - 9, 2, 4, '#5a3e22');
      }
      // Gantry cranes
      for (const cx of [160, 620]) {
        R(g, cx, 6, 3, QY - 6, '#d88a2a'); R(g, cx + 24, 6, 3, QY - 6, '#d88a2a');
        for (let y = 10; y < QY - 4; y += 8) { for (let i = 0; i < 24; i++) R(g, cx + 2 + i, y + Math.round(i / 3) % 8, 1, 1, '#b8701e'); }
        R(g, cx - 30, 4, 70, 3, '#e89a3a'); R(g, cx - 30, 4, 70, 1, '#f8c070'); R(g, cx + 2, 1, 6, 3, '#d88a2a');
        R(g, cx - 18, 7, 1, 14, '#3a3a40'); R(g, cx - 22, 21, 9, 4, '#3a6aa8');
      }
      // Stacked containers
      const cols = ['#c83a2a', '#2a6ab0', '#e8a830', '#3a9a5a', '#8a5aa8', '#d0d0d0'];
      const kr = rng(13);
      for (let x = 200; x < MW - 30; x += kr.int(90, 180)) {
        if (Math.abs(x - 620) < 40 || Math.abs(x - 160) < 40) continue;
        const stacks = kr.int(2, 4);
        for (let sx = 0; sx < stacks; sx++) for (let lv = 0; lv < kr.int(1, 3); lv++) {
          const c = kr.pick(cols), bx = x + sx * 15, by = QY - 7 - lv * 7;
          R(g, bx, by, 14, 7, c); R(g, bx, by, 14, 1, '#ffffff33'); for (let i = 2; i < 14; i += 3) R(g, bx + i, by + 1, 1, 6, '#00000033');
          R(g, bx + 14, by, 1, 7, INK);
        }
      }
      // Sheds along the back of the quay
      for (const wx of [60, 380, 860]) {
        R(g, wx, QY - 22, 44, 22, '#a8a098'); R(g, wx, QY - 25, 44, 3, '#6a6a72'); R(g, wx + 4, QY - 12, 12, 12, '#5a5a62');
        for (let i = 0; i < 4; i++) R(g, wx + 20 + i * 6, QY - 19, 4, 3, '#4a6a8a');
      }
      // Moored fishing boats bob live beside the docks
      const br = rng(3);
      for (const dx of [40, 250, 520, 760]) live.boats.push({ x: dx + 12 + br.int(0, 30), y: QY - 8, ph: br.range(0, 6), spr: br.int(0, 2) });
    }
  });

  // Lights at dusk/night
  const lights = strip(MW, MH, (g) => {
    if (variant === 'harbor') {
      for (const wx of [60, 380, 860]) for (let i = 0; i < 4; i++) R(g, wx + 20 + i * 6, MH - 12 - 19, 4, 3, '#ffd870');
      for (let x = 30; x < MW; x += 64) { R(g, x, MH - 12 - 14, 1, 14, '#3a3a40'); R(g, x - 1, MH - 12 - 16, 3, 2, '#ffe8a0'); }
    } else if (variant === 'cliffs') {
      R(g, 648, SH + 6 - 5, 2, 2, '#ffd870'); R(g, 658, SH + 6 - 5, 2, 2, '#ffd870');
    } else {
      R(g, 426, SH - 18, 3, 4, '#ffd870'); R(g, 433, SH - 18, 3, 4, '#ffd870');
      for (let x = 304; x < 460; x += 20) R(g, x, SH - 14, 1, 2, '#ffe8a0');
    }
  });

  // ── Near strip just above the road ────────────────────────────────────────
  const near = strip(480, 14, (g, w) => {
    if (variant === 'harbor') {
      R(g, 0, 8, w, 6, '#9a9a96'); R(g, 0, 8, w, 1, '#c8c8c0');
      for (let x = 0; x < w; x += 24) { R(g, x, 4, 3, 4, '#3a3a40'); R(g, x, 4, 3, 1, '#6a6a72'); }
      R(g, 0, 2, w, 1, '#c8c8d0'); for (let x = 0; x < w; x += 8) R(g, x, 2, 1, 6, '#a8a8b0');
    } else if (variant === 'cliffs') {
      R(g, 0, 8, w, 6, '#4a7a2e'); R(g, 0, 8, w, 1, '#6a9a42');
      R(g, 0, 4, w, 2, '#c8ccd0'); R(g, 0, 4, w, 1, '#e8eaee');
      for (let x = 0; x < w; x += 16) R(g, x, 5, 2, 5, '#7a7a80');
    } else {
      R(g, 0, 8, w, 6, '#dcc490'); R(g, 0, 8, w, 1, '#ecd8a8');
      // Sand fence
      for (let x = 0; x < w; x += 4) R(g, x, 3 + (x % 8 === 0 ? 0 : 1), 1, 6, '#8a6a44');
      R(g, 0, 5, w, 1, '#6a4a2a');
      const nr = rng(8);
      for (let i = 0; i < 26; i++) { const x = nr.int(0, w); R(g, x, 6, 1, 3, '#8a9a4a'); R(g, x + 1, 5, 1, 3, '#a8b05a'); }
    }
  });

  const gulls = [tinted(k, birdSprites('#f4f4f0')[0]), tinted(k, birdSprites('#f4f4f0')[1])];
  const boats = [tinted(k, boatSprite('#e8e4dc', '#c83a2a')), tinted(k, boatSprite('#3a6ab0', '#e8e4dc'))];
  const sail = tinted(k, sailSprite('#f8f4e8'));
  const sailRed = tinted(k, sailSprite('#e8604a'));

  // Live colors (shaded for time of day)
  const C = {
    crest: k.shade('#b8dcf8'), crest2: k.shade('#8ac0ec'), foam: k.shade('#ffffff'), foam2: k.shade('#d8ecf8'),
    glitter: k.phase === 'dusk' ? '#ffd0a0' : k.phase === 'night' ? '#c8d0e8' : '#fffbe0',
    spray: k.shade('#f4f8fc'), tower: k.shade('#f0ece4'), stripe: k.shade('#c83a2a'), lamp: k.shade('#3a3a40'),
  };
  const crestSeeds = Array.from({ length: 70 }, () => ({ x: r.range(0, W + 40), row: r.int(0, 23), len: r.int(3, 9), ph: r.range(0, 6) }));
  const glitter = Array.from({ length: 40 }, () => ({ dx: r.range(-24, 24), row: r.int(1, 24), ph: r.int(0, 7) }));
  const sunX = k.phase === 'dawn' ? 64 : k.phase === 'night' ? 60 : 262;
  const sea = (y) => FAR_Y + SEA_TOP + y;          // screen y of a sea row

  return {
    ground: variant === 'harbor' ? '#8a8a8a' : variant === 'cliffs' ? '#5a8a3a' : '#ecd49c',
    dust: variant === 'beach' ? '#e8d4a0' : variant === 'cliffs' ? '#a8a080' : '#a8a8a0',
    layers: [
      { c: far, y: FAR_Y, speed: FAR_SPEED },
      { c: mid, y: midY, speed: MID_SPEED, lights },
      { c: near, y: ROAD_TOP - 14, speed: NEAR_SPEED },
    ],
    road: variant === 'harbor' ? { asphalt: '#2e2e34', grain: '#38383e', edge: '#d8d8d0', dash: '#e8e8e0', lip: '#222228' } : undefined,
    verge: variant === 'beach'
      ? { base: '#dcc490', tuft: '#8a9a4a', hi: '#b8c070' }
      : variant === 'cliffs' ? { base: '#4a7a2e', tuft: '#3a6a24', hi: '#7aaa4a' } : { base: '#8a8a86', tuft: '#6a6a66', hi: '#b0b0a8' },
    fore: variant === 'beach'
      ? { base: '#e4cc94', dark: '#ccb07a', detail: '#f8e8c0', flowers: ['#fff4ec', '#f0b8a8'] }
      : variant === 'cliffs' ? { base: '#3e6e28', dark: '#2e5a1e', detail: '#6a9a42' } : { base: '#7a7a78', dark: '#6a6a68', detail: '#9a9a96', flowers: [] },

    animate(g, t, run, s) {
      // 1. Ocean life: rolling crest lines and sun / moon glitter
      for (const c of crestSeeds) {
        const y = sea(c.row + 1);
        const x = ((c.x + t * (2 + c.row * 0.15) - run * FAR_SPEED * 3) % (W + 40) + W + 40) % (W + 40) - 20;
        const len = c.len + Math.round(Math.sin(t * 1.5 + c.ph) * 2);
        if (len > 1) R(g, x, y, len, 1, c.row > 14 ? C.crest : C.crest2);
      }
      if (s.group !== 'overcast') {
        for (const gl of glitter) if (Math.floor(t * 6 + gl.ph) % 7 < 2) R(g, sunX + gl.dx * (0.4 + gl.row / 24), sea(gl.row), 2, 1, C.glitter);
      }
      // 2. Things on the water (behind the land)
      if (variant === 'harbor') {
        for (const [sx0, spr, sp] of [[60, sail, 4], [210, sailRed, 3], [380, sail, 5]]) {
          const x = ((sx0 + t * sp - run * FAR_SPEED) % (W + 60) + W + 60) % (W + 60) - 30;
          draw(g, spr, x, sea(10) - 8 + Math.round(Math.sin(t * 2 + sx0) * 0.6));
        }
      } else if (variant === 'cliffs') {
        // Surf bursting at the feet of headlands and stacks
        for (const sx of [24, 160, 172, 262, 385, 432, 600]) {
          const x = wrapX(sx, run, FAR_SPEED, 640) + 40;
          if (x < -10 || x > W + 10) continue;
          const ph = (t * 0.7 + sx * 0.013) % 1;
          if (ph < 0.45) {
            const k2 = ph / 0.45;
            for (let i = 0; i < 7; i++) {
              const a = Math.PI * (0.15 + i * 0.12);
              R(g, x + 2 + Math.cos(a) * k2 * 8, sea(14) - Math.sin(a) * k2 * 10 + k2 * k2 * 6, 1, 1, C.spray);
            }
          }
          R(g, x - 2, sea(15), 9, 1, C.foam2);
        }
      }
      // 3. Land on top again (it was drawn before the water animated)
      drawWrap(g, mid, run * MID_SPEED, midY);
      if (s.lit) drawWrap(g, lights, run * MID_SPEED, midY);
      // Shore foam lapping on the beach
      if (variant === 'beach') {
        for (let x = 0; x < W; x++) {
          const wob = Math.sin((x + run * MID_SPEED) * 0.09 + t * 1.8) + Math.sin((x + run * MID_SPEED) * 0.031 - t);
          const y = 86 + Math.round(wob * 1.2);
          R(g, x, y, 1, 1, wob > 0.6 ? C.foam : C.foam2);
        }
        for (const p of live.palms) {
          const x = wrapX(p.x, run, MID_SPEED, MW) + 40;
          if (x < -20 || x > W + 20) continue;
          draw(g, crowns[Math.floor(t * 1.6 + p.ph) % 2], x - 8, midY + p.y - 3);
        }
        // Gulls wheeling over the surf
        for (let i = 0; i < 3; i++) {
          const gx = 60 + i * 90 + Math.sin(t * 0.5 + i * 2) * 30, gy = 66 + Math.cos(t * 0.7 + i) * 6;
          draw(g, gulls[Math.floor(t * 4 + i) % 2], gx, gy);
        }
      } else if (variant === 'harbor') {
        for (const b of live.boats) {
          const x = wrapX(b.x, run, MID_SPEED, MW) + 40;
          if (x < -24 || x > W + 4) continue;
          draw(g, boats[b.spr], x, midY + b.y - 7 + Math.round(Math.sin(t * 1.8 + b.ph) * 1));
          if (s.lit) R(g, x + 5, midY + b.y - 4 + Math.round(Math.sin(t * 1.8 + b.ph)), 2, 1, '#ffd870');
        }
        for (let i = 0; i < 2; i++) draw(g, gulls[Math.floor(t * 4 + i) % 2], 120 + i * 120 + Math.sin(t * 0.4 + i) * 40, 40 + i * 6);
      } else if (live.lighthouse) {
        const L = live.lighthouse;
        const x = wrapX(L.x, run, MID_SPEED, MW) + 40;
        if (x > -40 && x < W + 40) {
          const base = midY + L.base, top = base - 40;
          for (let y = top + 6; y < base; y++) {
            const hw = Math.round(4 + (y - top) * 0.06);
            R(g, x - hw - 1, y, hw * 2 + 2, 1, INK);
            R(g, x - hw, y, hw * 2, 1, Math.floor((y - top) / 7) % 2 ? C.stripe : C.tower);
          }
          R(g, x - 5, top + 5, 10, 1, INK); R(g, x - 4, top, 8, 6, INK);
          R(g, x - 3, top + 1, 6, 4, s.lit ? '#fff2a0' : k.shade('#d8e8f0'));
          R(g, x - 3, top - 2, 6, 2, C.stripe); R(g, x - 1, top - 4, 2, 2, C.lamp);
          if (s.lit) {
            // Sweeping beam: width follows the rotation, sides alternate
            const a = t * 1.4;
            const reach = Math.cos(a) * 150;
            g.globalAlpha = 0.22 + 0.12 * Math.abs(Math.cos(a));
            g.fillStyle = '#fff4c0';
            g.beginPath(); g.moveTo(x, top + 3); g.lineTo(x + reach, top - 4 - Math.abs(Math.sin(a)) * 4); g.lineTo(x + reach, top + 10); g.closePath(); g.fill();
            g.globalAlpha = 1;
          }
        }
      }
      // Near strip back on top of everything
      drawWrap(g, near, run * NEAR_SPEED, ROAD_TOP - 14);
    },
  };
}
