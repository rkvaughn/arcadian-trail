/**
 * Plains — Midwest farm country. Variants:
 *   farm      red barns, silos, a farmhouse, hay bales, cattle, a pump windmill
 *   wheat     wide golden wheat, grain elevators, a combine kicking up chaff
 *   windfarm  open prairie under a line of turning wind turbines
 */

import { W, R, rng, ridge, strip, ditherFill, draw } from '../../kit.js';
import { roundTreeSprite, houseSprite } from '../../sprites.js';
import { wrapX, field, fence, barnSprite, siloSprite, hayBaleSprite, cowSprite, turbine } from './common.js';

export const VARIANTS = ['farm', 'wheat', 'windfarm'];

export function build(k) {
  const { variant, HORIZON, ROAD_TOP } = k;
  const r = rng(variant.length * 101);

  const far = strip(640, 50, (g, w, h) => ridge(g, w, h, { amp: 28, base: 50, seed: 4, color: '#86a8bc', hi: '#a8c4d4', shade: '#7898ae' }));
  const farTrees = strip(640, 14, (g, w) => {
    const tr = rng(9);
    for (let x = 0; x < w; x += tr.int(3, 9)) { const h = tr.int(3, 7); R(g, x, 14 - h, tr.int(3, 6), h, '#5a8a6a'); }
    R(g, 0, 12, w, 2, '#5a8a6a');
  });

  // Mid layer: fields, buildings, trees (960 wide → long legs rarely repeat)
  const MW = 960, MH = 34;
  const tree = roundTreeSprite();
  const barn = barnSprite(), silo = siloSprite(), bale = hayBaleSprite(), cow = cowSprite();
  const house = houseSprite();
  const mid = strip(MW, MH, (g) => {
    const cols = variant === 'wheat'
      ? [['#d8b04a', '#b88a2a'], ['#e0c060', '#c09a3a'], ['#9aa84a', '#7a8a2a']]
      : variant === 'windfarm'
        ? [['#7ab04a', '#5a9038'], ['#8ab85a', '#6a9a42'], ['#a8b85a', '#88983a']]
        : [['#6aa040', '#4a8030'], ['#d0b050', '#a88a30'], ['#8ab84a', '#6a9a38'], ['#5a9038', '#3a7028']];
    let x = 0, i = 0;
    while (x < MW) {
      const w = r.int(70, 150);
      const [base, row] = cols[i++ % cols.length];
      field(g, x, 12, w, MH - 12, base, row, 3, 1);
      x += w;
    }
    R(g, 0, 11, MW, 1, '#4a7a3a');
    // Props along the field line
    const place = (spr, px, baseY = 22) => draw(g, spr, px, baseY - spr.h);
    if (variant === 'farm') {
      place(barn, 60, 24); place(silo, 84, 24); place(bale, 120, 26); place(bale, 128, 27);
      place(house, 300, 24); place(tree, 285, 24); place(tree, 330, 24);
      place(cow, 420, 28); place(cow, 444, 30);
      place(barn, 600, 23); place(silo, 624, 23); place(silo, 634, 23);
      place(tree, 720, 23); place(tree, 760, 24); place(bale, 820, 27);
      fence(g, 400, 480, 26);
    } else if (variant === 'wheat') {
      // Grain elevators and a far farmstead
      for (const ex of [140, 620]) { for (let j = 0; j < 3; j++) place(silo, ex + j * 9, 22); R(g, ex - 4, 3, 6, 19, '#b8bcc2'); R(g, ex - 4, 3, 6, 1, '#e0e4e8'); }
      place(house, 380, 22); place(tree, 360, 22); place(tree, 405, 23);
      place(tree, 820, 22);
    } else {
      for (const tx of [90, 250, 470, 700, 880]) place(tree, tx, 22);
      place(house, 560, 22);
    }
  });
  // Night: farmhouse windows glow
  const lights = strip(MW, MH, (g) => {
    const hx = variant === 'farm' ? [300] : variant === 'wheat' ? [380] : [560];
    const hy = (variant === 'farm' ? 24 : 22) - house.h;
    for (const x of hx) { R(g, x + 8, hy + 9, 2, 2, '#ffd870'); R(g, x + 18, hy + 9, 2, 2, '#ffd870'); }
  });

  // Near strip right above the road: fence posts and wildflowers
  const near = strip(480, 12, (g, w) => {
    R(g, 0, 6, w, 6, variant === 'wheat' ? '#b89a3a' : '#5a9a38');
    R(g, 0, 6, w, 1, variant === 'wheat' ? '#d8c060' : '#7ac050');
    if (variant !== 'windfarm') fence(g, 0, w, 3, '#9a7a4a', '#6a4a2a', 10);
    const fr = rng(12);
    for (let i = 0; i < 40; i++) R(g, fr.int(0, w), fr.int(7, 11), 1, 1, fr.pick(['#ffe060', '#ffffff', '#ff8aa0', '#c8a0ff']));
  });

  const cr = rng(31);
  const clumps = Array.from({ length: 9 }, (_, i) => ({
    x: i * 78 + cr.int(0, 40), y: cr.int(158, 178),
    dark: k.shade(variant === 'wheat' ? '#a8862a' : '#2e6a20'),
    light: k.shade(variant === 'wheat' ? '#e0c060' : '#5aa040'),
    flower: cr() < 0.4 ? k.shade(cr.pick(['#ff6a8a', '#ffe060', '#ffffff'])) : null,
  }));
  const turbX = [60, 200, 330, 470, 610, 760, 900];
  return {
    ground: variant === 'wheat' ? '#c8a448' : '#6aa040',
    dust: variant === 'wheat' ? '#d0b060' : '#b09a70',
    layers: [
      { c: far, y: ROAD_TOP - MH - 48, speed: 0.06 },
      { c: farTrees, y: ROAD_TOP - MH - 4, speed: 0.12 },
      { c: mid, y: ROAD_TOP - MH - 2, speed: 0.32, lights },
      { c: near, y: ROAD_TOP - 12, speed: 0.75 },
    ],
    verge: variant === 'wheat' ? { base: '#a8903a', tuft: '#8a7428', hi: '#d8c060' } : { base: '#4a8a30', tuft: '#3a7024', hi: '#7ac050' },
    fore: variant === 'wheat'
      ? { base: '#c8a440', dark: '#a8862a', detail: '#f0d870' }
      : { base: '#3e7a2a', dark: '#2e6020', detail: '#6ab048' },
    front(g, t, run) {
      // Big grass clumps and flowers whipping past in the foreground
      for (const c of clumps) {
        const x = wrapX(c.x, run, 1.7, 700);
        if (x < -20 || x > W + 10) continue;
        const y = c.y;
        R(g, x, y - 6, 1, 6, c.dark); R(g, x + 2, y - 9, 1, 9, c.light); R(g, x + 4, y - 7, 1, 7, c.dark); R(g, x + 6, y - 5, 1, 5, c.light);
        R(g, x + 1, y - 8, 1, 2, c.light); R(g, x + 5, y - 9, 1, 3, c.dark);
        if (c.flower) { R(g, x + 1, y - 12, 3, 3, c.flower); R(g, x + 2, y - 11, 1, 1, '#ffe8a0'); R(g, x + 2, y - 9, 1, 3, c.dark); }
      }
    },
    animate(g, t, run, s) {
      if (variant === 'windfarm') {
        // Turbines stand on the mid layer, so they scroll with it
        for (const wx of turbX) {
          const x = wrapX(wx, run, 0.32, MW);
          if (x > -30 && x < 350) turbine(g, x, ROAD_TOP - MH + 12, 36, t * 1.6 + wx, s.lit ? '#9aa0b0' : '#eef0f4', s.lit ? '#6a7080' : '#a8b0bc');
        }
      } else if (variant === 'farm') {
        // Classic pump windmill beside the first barn
        const x = wrapX(110, run, 0.32, MW), base = ROAD_TOP - MH + 22;
        if (x > -20 && x < 340) {
          R(g, x, base - 20, 1, 20, '#5a5a62'); R(g, x + 4, base - 20, 1, 20, '#5a5a62'); R(g, x + 1, base - 12, 3, 1, '#5a5a62');
          for (let b = 0; b < 6; b++) {
            const a = t * 3 + (b * Math.PI) / 3;
            for (let q = 1; q < 6; q++) R(g, Math.round(x + 2 + Math.cos(a) * q), Math.round(base - 22 + Math.sin(a) * q), 1, 1, '#c8c8c8');
          }
          R(g, x + 1, base - 23, 3, 2, '#7a7a82');
        }
      } else {
        // Combine harvester crawling through the wheat with a chaff plume
        const x = wrapX(500 + t * 10, run, 0.32, MW), base = ROAD_TOP - MH + 26;
        if (x > -30 && x < 340) {
          R(g, x, base - 8, 16, 6, '#2a8a3a'); R(g, x + 10, base - 13, 6, 6, '#2a8a3a'); R(g, x + 11, base - 12, 4, 3, '#a8d8f0');
          R(g, x - 4, base - 4, 5, 2, '#d8c040'); R(g, x + 2, base - 2, 4, 3, '#1a1a1a'); R(g, x + 11, base - 3, 5, 4, '#1a1a1a');
          for (let p = 0; p < 6; p++) R(g, x - 6 - p * 2 + Math.round(Math.sin(t * 9 + p) * 1), base - 7 - p, 2, 1, '#e8d080');
        }
      }
    },
  };
}
