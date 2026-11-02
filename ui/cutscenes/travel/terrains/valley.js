/**
 * Valley — a broad green valley between mountain walls. Variants:
 *   river     a river winding along the valley floor with sparkles, a bridge,
 *             a farmhouse and bank-side trees
 *   orchard   rows of fruit trees in blossom and fruit, a farmstand with crates
 *   vineyard  vine rows following the slope, cypress lines and a stone winery
 */

import { W, R, rng, ridge, strip, draw, sprite } from '../../kit.js';
import { INK, roundTreeSprite, pineSprite, houseSprite } from '../../sprites.js';
import { wrapX, fence } from './common.js';

export const VARIANTS = ['river', 'orchard', 'vineyard'];

const MW = 960;

function fruitTree(blossom, fruit) {
  return sprite([
    '...hhhhh...', '.hhGGGGGgg.', 'hGGfGGGfGgg', 'GGGGGGfGGgg', 'GfGGGGGGGfg', '.gGGGfGGgg.',
    '...gTTtg...', '....TTt....', '....TTt....',
  ], {
    G: blossom ? '#f0a8c0' : '#4a9a3a', g: blossom ? '#d07898' : '#2e7028', h: blossom ? '#ffd8e4' : '#7ac860',
    f: blossom ? '#ffffff' : fruit, T: '#6a4a2a', t: '#4a3018',
  }, { outline: INK });
}

function cypressSprite() {
  return sprite(['..h..', '.hGg.', '.hGg.', '.GGg.', 'hGGgg', 'hGGgg', 'GGGgg', 'GGGgg', 'hGGgg', 'GGGgg', '.GGg.', '..t..'],
    { G: '#2e5a2e', g: '#1e4020', h: '#4a7a3e', t: '#4a3018' }, { outline: INK });
}

function winerySprite() {
  return sprite([
    '..........TTTTTTTTTTTTTTTT..........', '........TTTTTTTTTTTTTTTTTTTT........', '......tttttttttttttttttttttttt......',
    '.......SSSSSSSSSSSSSSSSSSSSSS.......', '.......SSsSSSSsSSSSSSsSSSSSsSS......', '.......SSaaSSSaaSSSSSSaaSSSaaS......',
    '.......SSwwSSSwwSSDDSSwwSSSwwS......', '.......SSwwSSSwwSSDDSSwwSSSwwS......', '.......SSSSSSSSSSSDDSSSSSSSSSS......',
    '.......ssssssssssDDssssssssss.......',
  ], { T: '#c8603a', t: '#8a3e24', S: '#d8c8a8', s: '#b0a080', a: '#8a7a5a', w: '#3a3a4a', D: '#5a3a22' }, { outline: INK });
}

function farmstandSprite() {
  return sprite([
    'RWRWRWRWRWRWRWRW', 'RWRWRWRWRWRWRWRW', 'rrrrrrrrrrrrrrrr', '.p............p.', '.p..........p.p.',
    '.p.crrc.cooc..p.', 'BBBBBBBBBBBBBBBB', 'BbbbbbbbbbbbbbbB', 'B..............B',
  ], { R: '#d84a3a', W: '#f0e8d8', r: '#8a2a20', p: '#8a6a44', c: '#a8783a', o: '#f0a030', B: '#9a7048', b: '#7a5030' }, { outline: INK });
}

export function build(k) {
  const { variant, ROAD_TOP } = k;
  const r = rng(variant.length * 421 + 11);

  // ── Far: high mountain walls framing the valley ───────────────────────────
  const FH = 84;
  const far = strip(640, FH, (g, w, h) => ridge(g, w, h, {
    amp: 72, base: h, seed: 67, color: '#6a7aa0', hi: '#a8b4d0', jag: 0.5, snow: '#eef2fa', snowLine: 36,
  }));
  const second = strip(640, 50, (g, w, h) => ridge(g, w, h, variant === 'vineyard'
    ? { amp: 22, base: h, seed: 79, color: '#9aa060', hi: '#c8c880' }
    : { amp: 22, base: h, seed: 81, color: '#4a7a5a', hi: '#7aa878' }));

  // ── Mid layer ─────────────────────────────────────────────────────────────
  const MH = 40;
  const tree = roundTreeSprite(), pine = pineSprite();
  const house = houseSprite();
  const blossom = fruitTree(true), apples = fruitTree(false, '#e83a2a'), oranges = fruitTree(false, '#f0a030');
  const cypress = cypressSprite(), winery = winerySprite(), stand = farmstandSprite();
  const riverY = [];
  const lit = [];
  const mid = strip(MW, MH, (g, w, h) => {
    const place = (spr, x, baseY) => { for (const dx of [0, -w]) draw(g, spr, x + dx, baseY - spr.h); };
    if (variant === 'river') {
      R(g, 0, 6, w, h - 6, '#6aa848');
      R(g, 0, 6, w, 1, '#8ac860');
      // Field patches: flat colors with a lit edge
      const fr = rng(7);
      for (let x = 0; x < w; x += fr.int(60, 120)) {
        const fw = fr.int(40, 70), fy = fr.int(8, 14);
        const fc = fr.pick(['#8ab850', '#a8b850', '#5a9a40']);
        for (const dx of [0, -w]) { R(g, x + dx, fy, fw, 6, fc); R(g, x + dx, fy, fw, 1, '#b8d870'); }
      }
      // River: a band winding along the floor (periodic over the strip)
      for (let x = 0; x < w; x++) {
        const c = Math.round(h - 16 + 5 * Math.sin((x / w) * Math.PI * 4) + 2 * Math.sin((x / w) * Math.PI * 10));
        riverY.push(c);
        R(g, x, c - 3, 1, 7, '#3a7ac0');
        R(g, x, c - 3, 1, 1, '#c8b880');          // sandy bank
        R(g, x, c + 4, 1, 1, '#a89860');
        if ((x % 9) < 4) R(g, x, c - 1, 1, 1, '#5a9ad8');
      }
      // Bridge
      const bx = 600, by = riverY[bx];
      R(g, bx - 4, by - 6, 30, 2, '#8a8a90'); R(g, bx - 4, by - 7, 30, 1, '#b8b8c0');
      for (let p = 0; p < 30; p += 8) R(g, bx - 4 + p, by - 4, 2, 7, '#6a6a72');
      place(house, 250, riverY[250] - 4);
      lit.push({ x: 250, y: riverY[250] - 4 - house.h });
      const tr = rng(9);
      for (let x = 8; x < w - 16; x += tr.int(20, 46)) {
        if (Math.abs(x - 250) < 30 || Math.abs(x - 600) < 30) continue;
        place(tr() < 0.6 ? tree : pine, x, riverY[x + 6] - 3);
      }
    } else if (variant === 'orchard') {
      R(g, 0, 4, w, h - 4, '#7ab84a');
      // Three rows of trees with mown strips between
      for (const [y, col] of [[12, '#8ac858'], [22, '#6aa840'], [32, '#8ac858']]) R(g, 0, y, w, 2, col);
      const blocks = [blossom, apples, oranges, blossom];
      const tr = rng(17);
      for (let row = 0; row < 3; row++) {
        for (let x = (row % 2) * 8; x < w - 14; x += 16) {
          if (row === 2 && x > 380 && x < 420) continue;
          const spr = blocks[Math.floor(x / 240) % blocks.length];
          place(spr, x + tr.int(-1, 1), 12 + row * 11);
        }
      }
      place(stand, 384, h - 2);
      lit.push({ x: 384, y: h - 2 - stand.h, stand: true });
      // A ladder against a tree
      for (let y = 0; y < 10; y += 2) R(g, 700, h - 12 + y, 4, 1, '#c8a060');
      R(g, 700, h - 12, 1, 10, '#a88040'); R(g, 703, h - 12, 1, 10, '#a88040');
    } else {
      // Vineyard: rising slope with contour vine rows
      const slope = [];
      for (let x = 0; x < w; x++) slope.push(Math.round(6 + 8 * (0.5 + 0.5 * Math.sin((x / w) * Math.PI * 2 + 1)) + 3 * Math.sin((x / w) * Math.PI * 6)));
      for (let x = 0; x < w; x++) {
        R(g, x, slope[x], 1, h - slope[x], '#a8a050');
        R(g, x, slope[x], 1, 1, '#d0c870');
        for (let y = slope[x] + 3; y < h - 2; y += 4) {
          R(g, x, y, 1, 2, '#3e6a2a');
          if (((x * 5 + y) % 11) === 0) R(g, x, y + 1, 1, 1, '#6a2a5a');   // grapes
          if (x % 14 === 0) R(g, x, y - 1, 1, 3, '#7a5a3a');               // trellis posts
        }
      }
      place(winery, 470, h - 6);
      lit.push({ x: 470, y: h - 6 - winery.h, winery: true });
      for (let i = 0; i < 6; i++) place(cypress, 430 + i * 7 - (i > 2 ? 0 : 0), slope[430 + i * 7] + 6);
      for (let i = 0; i < 5; i++) place(cypress, 120 + i * 7, slope[120 + i * 7] + 6);
      for (let i = 0; i < 5; i++) place(cypress, 800 + i * 7, slope[800 + i * 7] + 6);
    }
  });
  const lights = strip(MW, MH, (g) => {
    for (const p of lit) {
      if (p.winery) { for (const wx of [9, 14, 22, 27]) R(g, p.x + wx, p.y + 6, 2, 2, '#ffd070'); }
      else if (p.stand) R(g, p.x + 2, p.y + 3, 12, 1, '#ffe8a0');
      else { R(g, p.x + 8, p.y + 9, 2, 2, '#ffd870'); R(g, p.x + 18, p.y + 9, 2, 2, '#ffd870'); }
    }
  });

  // ── Near strip: grass and a low fence above the road ──────────────────────
  const near = strip(480, 12, (g, w) => {
    R(g, 0, 5, w, 7, variant === 'vineyard' ? '#9a9a48' : '#5a9a3a');
    R(g, 0, 5, w, 1, variant === 'vineyard' ? '#c8c070' : '#8ac860');
    if (variant !== 'river') fence(g, 0, w, 3, '#a88050', '#6a4a2a', 12);
    const nr = rng(23);
    for (let i = 0; i < 34; i++) R(g, nr.int(0, w), nr.int(7, 11), 1, 1, nr.pick(variant === 'orchard' ? ['#ffd8e4', '#ffffff', '#ffe060'] : ['#ffe060', '#ffffff', '#c8a0ff']));
  });

  // ── Live props ─────────────────────────────────────────────────────────────
  const glint = k.shade('#ffffff');
  const petal = [k.shade('#ffd0e0'), k.shade('#ffffff')];
  const clumpC = [k.shade('#2e6a20'), k.shade('#5aa040')];
  const clumps = Array.from({ length: 8 }, (_, i) => ({
    x: i * 88 + r.int(0, 40), y: r.int(158, 178),
    flower: r() < 0.5 ? k.shade(r.pick(variant === 'vineyard' ? ['#8a3a7a', '#ffe060'] : ['#ff8aa8', '#ffe060', '#ffffff'])) : null,
  }));
  const petals = Array.from({ length: 18 }, (_, i) => ({ x: i * 19, y: r.range(40, 170), ph: r.range(0, 6) }));
  const midY = ROAD_TOP - MH;

  return {
    ground: variant === 'vineyard' ? '#a8a050' : '#6aa848',
    dust: variant === 'vineyard' ? '#c8b880' : '#b0a078',
    layers: [
      { c: far, y: midY - FH + 26, speed: 0.04 },
      { c: second, y: midY - 34, speed: 0.13 },
      { c: mid, y: midY, speed: 0.32, lights },
      { c: near, y: ROAD_TOP - 12, speed: 0.75 },
    ],
    verge: variant === 'vineyard' ? { base: '#8a8a40', tuft: '#6a7030', hi: '#b8b860' } : { base: '#4a8a30', tuft: '#3a7024', hi: '#7ac050' },
    fore: variant === 'vineyard'
      ? { base: '#7a8238', dark: '#5e6a2c', detail: '#b8a8d8' }
      : { base: '#3e7a2a', dark: '#2e6020', detail: variant === 'orchard' ? '#ffd0e0' : '#ffe060' },
    animate(g, t, run) {
      if (variant !== 'river') return;
      // Sparkles riding the river's current
      for (let i = 0; i < 24; i++) {
        const lx = (i * 40 + Math.floor(t * 12)) % MW;
        if (Math.floor(t * 4 + i) % 3 !== 0) continue;
        const x = wrapX(lx + 40, run, 0.32, MW);
        if (x < 0 || x > W) continue;
        R(g, x, midY + riverY[lx] - 1 + (i % 3), 2, 1, glint);
      }
    },
    front(g, t, run) {
      for (const c of clumps) {
        const x = wrapX(c.x, run, 1.7, 720);
        if (x < -20 || x > W + 10) continue;
        R(g, x, c.y - 6, 1, 6, clumpC[0]); R(g, x + 2, c.y - 9, 1, 9, clumpC[1]); R(g, x + 4, c.y - 7, 1, 7, clumpC[0]);
        if (c.flower) { R(g, x + 1, c.y - 12, 3, 3, c.flower); R(g, x + 2, c.y - 9, 1, 3, clumpC[0]); }
      }
      if (variant !== 'orchard') return;
      // Blossom petals drifting across the frame
      for (const p of petals) {
        const x = ((p.x - t * 30 - run * 0.4) % (W + 20) + W + 20) % (W + 20) - 10;
        const y = p.y + Math.sin(t * 2 + p.ph) * 6 + ((t * 8) % 20);
        R(g, Math.round(x), Math.round(y), 1, 1, petal[Math.floor(p.ph * 3) % 2]);
      }
    },
  };
}
