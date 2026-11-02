/**
 * Hills — rolling country. Variants:
 *   green     layered green hills, hedgerows, sheep, a stone farmhouse
 *   vineyard  vine rows tracing the hill contours, a winery, poplars
 *   autumn    patchwork fields in gold and rust, a red covered bridge,
 *             a white church steeple
 */

import { W, R, rng, strip, drawPuff, sprite, draw } from '../../kit.js';
import { INK, roundTreeSprite } from '../../sprites.js';

export const VARIANTS = ['green', 'vineyard', 'autumn'];

const MW = 960;
const MH = 46;

/**
 * Rolling hill silhouette with whole-number wave cycles across `w` (seamless
 * when tiled). Crest heights stay between lo and hi px above the bottom.
 * Returns the crest y per column.
 */
function hillBand(g, w, h, lo, hi, seed, color, lit) {
  const r = rng(seed);
  const waves = [[2, 0.55], [3, 0.3], [7, 0.15]].map(([k, a]) => ({ k, a, p: r.range(0, Math.PI * 2) }));
  const tops = [];
  for (let x = 0; x < w; x++) {
    let v = 0;
    for (const wv of waves) v += wv.a * Math.sin((x / w) * Math.PI * 2 * wv.k + wv.p);
    tops.push(Math.round(h - (lo + (hi - lo) * (0.5 + v * 0.5))));
  }
  for (let x = 0; x < w; x++) {
    R(g, x, tops[x], 1, h - tops[x], color);
    R(g, x, tops[x], 1, 1, lit);
    if (tops[(x + 1) % w] < tops[x] || tops[(x - 1 + w) % w] < tops[x]) R(g, x, tops[x] + 1, 1, 1, lit);
  }
  return tops;
}

function sx(lx, run, speed, period, margin = 40) {
  let x = ((lx - run * speed) % period + period) % period;
  if (x > W + margin) x -= period;
  return x;
}

const sheepSpr = () => sprite(['.WWWW..', 'WWWWWKK', 'WWWWWK.', '.K..K..'], { W: '#f4f2ea', K: '#2a2420' }, { outline: INK });

const farmhouseSpr = () => sprite([
  '....RRRRRRRRRRRR....', '...RRRRRRRRRRRRRRc..', '..RRRRRRRRRRRRRRRRc.', '.rrrrrrrrrrrrrrrrrrr',
  '..SsSSsSSSsSSsSSSs..', '..SSkkSSsSSkkSsSSS..', '..SsggSSSSSggSSsSs..', '..SSSSSsSDDSSSSSSS..',
  '..SsSSSSSDDSsSSsSS..', '..ssssssssssssssss..',
], { R: '#9a3a2a', r: '#6a2a1e', c: '#5a5a5a', S: '#b8b0a0', s: '#8a8478', k: '#3a3028', g: '#90b8d8', D: '#5a3a20' }, { outline: INK });

const winerySpr = () => sprite([
  '.....OOOOOOOOOOOOOO.....', '...OOOOOOOOOOOOOOOOOO...', '.oooooooooooooooooooooo.',
  '..TTTTTTTTTTTTTTTTTTTT..', '..TTkkTTTTTTTTTTTTkkTT..', '..TTggTTTTAAAATTTTggTT..',
  '..TTTTTTTTAddATTTTTTTT..', '..TtTTTTTTAddATTTTTTtT..', '..tttttttttttttttttttt..',
], { O: '#c8643a', o: '#9a4a2a', T: '#e0cc9a', t: '#b8a478', k: '#3a3028', g: '#90b8d8', A: '#7a5a3a', d: '#4a3020' }, { outline: INK });

const churchSpr = () => sprite([
  '.....Y.....', '.....Y.....', '....YYY....', '.....Y.....', '....rrr....', '...rrrrr...', '....WWW....',
  '....WgW....', '....WWW....', '..rrrrrrr..', '.rrrrrrrrr.', 'rrrrrrrrrrr', '.WWWWWWWWW.',
  '.WgWWWWWgW.', '.WgWWDWWgW.', '.WWWWDWWWW.', '.wwwwwwwww.',
], { Y: '#e0c040', r: '#5a6a7a', W: '#f0eee6', w: '#c8c4b8', g: '#90b8d8', D: '#7a4a2a' }, { outline: INK });

const poplarSpr = () => sprite([
  '..h..', '.hG..', '.hGg.', '.GGg.', 'hGGg.', 'hGGgg', 'hGGgg', 'hGGgg', 'hGGgg',
  '.GGg.', '.GGg.', '..T..', '..T..',
], { G: '#2e5a2a', g: '#1e3e1e', h: '#4a8a3a', T: '#4a3018' }, { outline: INK });

const bridgeSpr = () => sprite([
  '......RRRRRRRRRRRRRRRRRRRR......', '....RRRRRRRRRRRRRRRRRRRRRRRR....', '..rrrrrrrrrrrrrrrrrrrrrrrrrrrr..',
  '...BBBBBBBBBBBBBBBBBBBBBBBBBB...', '...BkkkkkkkkkkkkkkkkkkkkkkkkB...', '...BkkkkkkkkkkkkkkkkkkkkkkkkB...',
  '...BBBBBBBBBBBBBBBBBBBBBBBBBB...', '.SSS........................SSS.', '.SSS........................SSS.',
], { R: '#4a4a52', r: '#2e2e36', B: '#b8342a', k: '#3a1a14', S: '#8a8478' }, { outline: INK });

export function build(k) {
  const { variant, ROAD_TOP } = k;
  const r = rng(variant.length * 157 + 11);
  const autumn = variant === 'autumn', vine = variant === 'vineyard';

  const far1 = strip(640, 60, (g, w, h) => hillBand(g, w, h, 26, 52, 81,
    autumn ? '#9aa0b8' : '#8ab0bc', autumn ? '#c0c4d8' : '#b8d4dc'));
  const far2 = strip(720, 50, (g, w, h) => hillBand(g, w, h, 16, 40, 83,
    autumn ? '#a8805a' : vine ? '#7aa060' : '#6aa262', autumn ? '#d0a870' : vine ? '#a8c880' : '#9acc80'));

  // Mid hill: one big rolling silhouette, painted with contour detail
  let tops = [];
  const MAIN = autumn ? '#8a9a3a' : vine ? '#7a9a40' : '#5aa040';
  const tree = roundTreeSprite();
  const sheep = sheepSpr(), farm = farmhouseSpr(), winery = winerySpr(), church = churchSpr(), poplar = poplarSpr(), bridge = bridgeSpr();
  const houses = [];      // for night window lights: { spr, x, y, wins: [[dx, dy]] }
  const mid = strip(MW, MH, (g) => {
    tops = hillBand(g, MW, MH, 14, 38, 87, MAIN, autumn ? '#c8c060' : '#9ad06a');
    const at = (x) => tops[((x % MW) + MW) % MW];
    if (autumn) {
      // Patchwork: vertical field segments in fall colors, hedgerow seams
      const cols = ['#c8a03a', '#a8562a', '#8a9a3a', '#b8783a', '#6a7a2a', '#d0b858'];
      let x = 0, i = 0;
      while (x < MW) {
        const w = r.int(40, 90), c = cols[i++ % cols.length];
        for (let xx = x; xx < Math.min(MW, x + w); xx++) R(g, xx, at(xx) + 2, 1, MH - at(xx) - 2, c);
        for (let y = at(x) + 2; y < MH; y++) R(g, x, y, 1, 1, '#4a3a1e');
        x += w;
      }
    }
    // Contour lines: hedgerows (green / autumn) or vine rows (vineyard)
    for (let d = vine ? 6 : 10; d < MH; d += vine ? 4 : 11) {
      for (let x = 0; x < MW; x++) {
        const y = at(x) + d + Math.round(Math.sin((x / MW) * Math.PI * 2 * 15 + d) * 1.5);
        if (y >= MH - 1) continue;
        if (vine) {
          if (x % 3 !== 0) R(g, x, y, 1, 2, x % 3 === 1 ? '#2e5a24' : '#3a6a2a');
          if (x % 11 === 0) R(g, x, y + 1, 1, 1, '#5a2a5a');
        } else if (x % 4 !== 3) {
          R(g, x, y, 1, 2, autumn ? '#5a4a1e' : '#2e6a2a');
        }
      }
    }
    // Landmarks on the crest
    const put = (spr, x, sink = 2) => { draw(g, spr, x, at(x + (spr.w >> 1)) - spr.h + sink); return at(x + (spr.w >> 1)) - spr.h + sink; };
    if (variant === 'green') {
      for (const x of [40, 150, 330, 470, 610, 790, 900]) put(tree, x);
      houses.push({ x: 230, y: put(farm, 230), wins: [[4, 5], [12, 5]] });
      houses.push({ x: 700, y: put(farm, 700), wins: [[4, 5], [12, 5]] });
      for (let i = 0; i < 16; i++) {
        const x = r.int(10, MW - 20);
        draw(g, sheep, x, Math.min(MH - 6, at(x + 3) + r.int(4, 18)), r() < 0.5);
      }
    } else if (vine) {
      houses.push({ x: 300, y: put(winery, 300), wins: [[4, 5], [18, 5]] });
      for (const x of [270, 286, 330, 340, 640, 652, 664, 880]) put(poplar, x);
      for (const x of [80, 520, 760]) put(tree, x);
    } else {
      houses.push({ x: 180, y: put(church, 180), wins: [[2, 13], [8, 13], [5, 7]] });
      put(farm, 560);
      houses.push({ x: 560, y: at(570) - farm.h + 2, wins: [[4, 5], [12, 5]] });
      const fallTrees = ['#c83a2a', '#e07a2a', '#d8a83a'].map(c => roundTreeSprite({ G: c, g: '#7a3a1a', h: '#ffd070', T: '#5a3a20', t: '#3a2414' }));
      for (const x of [60, 120, 260, 420, 480, 700, 860]) put(r.pick(fallTrees), x);
      // Stream with the covered bridge
      for (let x = 760; x < 860; x++) R(g, x, MH - 6 + Math.round(Math.sin(x * 0.2)), 1, 3, '#5a8ab8');
      draw(g, bridge, 794, MH - 16);
    }
  });
  const lights = strip(MW, MH, (g) => {
    for (const hs of houses) for (const [dx, dy] of hs.wins) R(g, hs.x + dx, hs.y + dy, 2, 2, '#ffd870');
  });

  // Near strip: stone wall (green), vine trellis (vineyard), hedge (autumn)
  const near = strip(480, 12, (g, w) => {
    const tr = rng(91);
    R(g, 0, 8, w, 4, autumn ? '#7a7a2a' : '#4a8a30');
    if (variant === 'green') {
      for (let x = 0; x < w; x += 5) { const c = tr.pick(['#9a968a', '#b0aca0', '#86827a']); R(g, x, 4 + (x % 10 ? 0 : 1), 5, 4, c); R(g, x, 4, 5, 1, '#c8c4b8'); R(g, x + 4, 4, 1, 4, '#5a5850'); }
    } else if (vine) {
      R(g, 0, 4, w, 1, '#8a8a8a');
      for (let x = 0; x < w; x += 12) R(g, x, 2, 1, 8, '#6a4a2a');
      for (let x = 0; x < w; x++) if (x % 3) R(g, x, 5 + (x % 2), 1, 2, x % 7 ? '#3a6a2a' : '#5a2a5a');
    } else {
      for (let x = 0; x < w; x += tr.int(3, 5)) drawPuff(g, x, 6, tr.int(2, 4), tr.pick(['#a8562a', '#c8782a', '#7a6a2a']), '#e0a040', 0.3);
    }
  });

  const fr = rng(55);
  const clumps = Array.from({ length: 9 }, (_, i) => ({
    x: i * 80 + fr.int(0, 40), y: fr.int(158, 178), flower: fr() < 0.5,
  }));
  const dark = k.shade(autumn ? '#7a5a2a' : '#2e6a20'), light = k.shade(autumn ? '#c89a3a' : '#5aa040');
  const petal = k.shade(autumn ? '#e07a2a' : vine ? '#c88ae0' : '#ffffff'), eye = k.shade('#ffe060');
  const smokeC = k.shade('#c8c8cc');
  const chimneys = variant === 'green' ? [230 + 16, 700 + 16] : autumn ? [560 + 16] : [];

  return {
    ground: MAIN,
    dust: autumn ? '#a88a5a' : '#9a8a6a',
    layers: [
      { c: far1, y: ROAD_TOP - MH - 50, speed: 0.05 },
      { c: far2, y: ROAD_TOP - MH - 26, speed: 0.13 },
      { c: mid, y: ROAD_TOP - MH - 2, speed: 0.32, lights },
      { c: near, y: ROAD_TOP - 12, speed: 0.75 },
    ],
    verge: autumn ? { base: '#7a7a2a', tuft: '#5a5a1e', hi: '#c8a040' } : { base: '#4a8a30', tuft: '#3a7024', hi: '#7ac050' },
    fore: autumn ? { base: '#6a6a28', dark: '#4e4e1c', detail: '#e0882a' }
      : vine ? { base: '#5a8a34', dark: '#447026', detail: '#c88ae0' }
        : { base: '#3e7a2a', dark: '#2e6020', detail: '#f4f4f0' },
    animate(g, t, run) {
      // Chimney smoke curling up from the farmhouses
      const y0 = ROAD_TOP - MH - 2;
      for (const cx of chimneys) {
        const x = sx(cx, run, 0.32, MW);
        if (x < -10 || x > W + 10) continue;
        const top = y0 + tops[cx % MW] - 12;
        for (let i = 0; i < 4; i++) {
          const ph = (t * 0.6 + i / 4) % 1;
          R(g, Math.round(x + ph * 6 + Math.sin(t * 2 + i) * 1), Math.round(top - ph * 12), 2, 2, smokeC);
        }
      }
    },
    front(g, t, run) {
      for (const c of clumps) {
        const x = sx(c.x, run, 1.7, 720);
        if (x < -20 || x > W + 10) continue;
        const y = c.y, sway = Math.round(Math.sin(t * 2 + c.x) * 0.6);
        R(g, x, y - 6, 1, 6, dark); R(g, x + 2, y - 9, 1, 9, light); R(g, x + 4, y - 7, 1, 7, dark); R(g, x + 6, y - 5, 1, 5, light);
        if (c.flower) {
          R(g, x + 2 + sway - 1, y - 12, 3, 1, petal); R(g, x + 2 + sway, y - 13, 1, 3, petal); R(g, x + 2 + sway, y - 12, 1, 1, eye);
        }
      }
    },
  };
}
