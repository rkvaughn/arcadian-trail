/**
 * screensArt.js — Cut scenes outside the event flow:
 *   titleScene      animated title card (logo over a dawn road trip)
 *   endWinScene     arrival at the refuge town, fireworks
 *   endLoseScene    the abandoned car at dusk, weather by dominant peril
 *   barricadeCard   Crash the Barricade win/lose card ({ won })
 *   riverCard       Ford the River win/lose card ({ won, title })
 *
 * Plus two small runners: ScreenArt (looping canvas on a DOM screen) and
 * CardRunner (time-limited mini-game card on the shared canvas).
 */

import {
  W, H, R, rng, ease, easeOut, clamp, lerp, ditherBands, ditherFill, ridge, strip, drawWrap,
  drawPuff, flameWall, stepParticles, draw, silhouette, disc, sprite, text, textWidth, logo, bolt,
} from './kit.js';
import { CutscenePlayer } from './director.js';
import {
  INK, carSprite, wheelSprites, drawCar, familySprites, drawFamily, pineSprite, roundTreeSprite,
  deadTreeSprite, houseSprite, poleSprite, birdSprites, cloudSprite,
} from './sprites.js';

const ROAD_Y = 142;

// ── Shared bits ──────────────────────────────────────────────────────────────

function easeOutBack(t) {
  t = clamp(t, 0, 1);
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

/** Asphalt road band with edge lines and centre dashes, scrolled by `off`. */
function roadStrip(pal = {}) {
  const { asphalt = '#2a2630', grain = '#34303a', edge = '#8a8494', dash = '#d8b040', lip = '#4a4450' } = pal;
  return strip(64, 24, (g) => {
    R(g, 0, 0, 64, 24, asphalt);
    ditherFill(g, 0, 0, 64, 24, grain, 0.25);
    R(g, 0, 0, 64, 1, lip);
    R(g, 0, 2, 64, 1, edge);
    R(g, 0, 21, 64, 1, edge);
    R(g, 4, 11, 14, 2, dash);
    R(g, 36, 11, 14, 2, dash);
  });
}

function grassStrip(base, tuft, hi, h = 16, seed = 4) {
  return strip(128, h, (g) => {
    R(g, 0, 0, 128, h, base);
    const r = rng(seed);
    for (let i = 0; i < 40; i++) {
      const x = r.int(1, 126), y = r.int(3, h - 1);
      R(g, x, y - 2, 1, 2, tuft); R(g, x - 1, y - 3, 1, 1, hi); R(g, x + 1, y - 3, 1, 1, hi);
    }
  });
}

/** Wind turbine: tower + three blades drawn as pixel lines at angle `a`. */
function turbine(g, x, baseY, h, a, col = '#e8ecf0', shade = '#a8b0bc') {
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

const FIREWORK_COLS = [['#ff5a6a', '#ffc0c8'], ['#5ad0ff', '#d0f4ff'], ['#ffe060', '#fff8c8'], ['#7aff8a', '#d8ffe0'], ['#c88aff', '#f0d8ff']];

// ── Title ────────────────────────────────────────────────────────────────────

export function titleScene() {
  const r = rng(2050);
  const sky = strip(W, 122, (g) => ditherBands(g, 0, 0, W, 122,
    ['#0e0a24', '#1e1240', '#3a1a52', '#6a2456', '#a83a4a', '#e0703a', '#ffb050']));
  // Fire glow on the horizon behind them (left), dawn ahead (right)
  const glow = strip(170, 50, (g) => {
    for (let y = 0; y < 50; y++) for (let x = 0; x < 170; x += 1) {
      const d = (1 - x / 170) * (y / 50) * 0.6;
      if (((x * 7 + y * 13) % 16) / 16 < d) R(g, x, y, 1, 1, y > 35 ? '#ff6a2a' : '#d8401a');
    }
  });
  const stars = Array.from({ length: 70 }, () => ({ x: r.int(2, W - 2), y: r.int(2, 70), p: r.int(0, 7) }));
  const far = strip(640, 80, (g, w, h) => ridge(g, w, h, {
    amp: 46, base: 76, seed: 11, color: '#3a2c5e', hi: '#b07a9a', jag: 0.55, snow: '#d8c0d8', snowLine: 26,
  }));
  const pine = silhouette(pineSprite(), '#141a2a');
  const pineRim = silhouette(pineSprite(), '#e0885a');
  const mid = strip(640, 56, (g, w, h) => {
    const tops = ridge(g, w, h, { amp: 14, base: 54, seed: 21, color: '#1a2032', hi: '#6a4a5a' });
    const tr = rng(8);
    for (let x = 0; x < w - 12; x += tr.int(5, 14)) {
      const y = tops[x + 5] - pine.h + 4;
      draw(g, pineRim, x + 1, y); draw(g, pine, x, y);
    }
  });
  const road = roadStrip();
  const verge = grassStrip('#1a2420', '#24342a', '#3a4a34', 18, 9);
  const shoulder = grassStrip('#1c2622', '#26362a', '#4a5a3a', 6, 5);
  const pole = poleSprite('#3a2a24');
  const car = carSprite('blue');
  const wheels = wheelSprites();
  const birds = birdSprites('#1a1020');
  const logoA = logo('ARCADIAN', 4, ['#fff3b0', '#ffd860', '#ffb030', '#f07a20', '#d8481a'], '#1a0a14');
  const logoB = logo('TRAIL', 5, ['#ffe8a0', '#ffc040', '#ff8a2a', '#e8501c', '#b8301a', '#8a1e14'], '#1a0a14');
  const exhaust = [];
  let exT = 0;

  return {
    update(dt, t) {
      exT += dt * 7;
      while (exT > 1) { exT--; exhaust.push({ x: 72, y: ROAD_Y + 8, vx: -r.range(30, 50), vy: -r.range(2, 8), life: 1.2, r0: r.range(1, 2) }); }
      stepParticles(exhaust, dt);
    },
    draw(g, t) {
      const run = t * 70;                                    // road speed px/s
      g.drawImage(sky, 0, 0);
      for (const s of stars) {
        const tw = Math.floor(t * 3 + s.p) % 7;
        if (tw === 0) continue;
        R(g, s.x, s.y, 1, 1, tw === 3 ? '#ffffff' : '#9a8ac8');
        if (tw === 3 && s.p % 3 === 0) { R(g, s.x - 1, s.y, 3, 1, '#c8c0f0'); R(g, s.x, s.y - 1, 1, 3, '#c8c0f0'); }
      }
      // Rising sun with banded halo
      const sy = lerp(118, 92, ease(t / 8));
      disc(g, 252, sy, 30, '#ff9a3a'); disc(g, 252, sy, 24, '#ffc050'); disc(g, 252, sy, 18, '#ffe080'); disc(g, 252, sy, 12, '#fff4c0');
      g.drawImage(glow, 0, 74);
      drawWrap(g, far, run * 0.06, 50);
      drawWrap(g, mid, run * 0.22, 88);
      // Birds crossing
      for (let i = 0; i < 5; i++) {
        const bx = ((t * 16 + i * 14) % (W + 80)) - 40, by = 92 - i * 3 + (i % 2) * 5 + Math.sin(t * 2 + i) * 2;
        draw(g, birds[Math.floor(t * 5 + i) % 2], bx, by);
      }
      drawWrap(g, shoulder, run * 0.8, ROAD_Y - 6);
      // Telephone poles flick past
      for (let k = 0; k < 3; k++) {
        const px = W - (((run * 0.8) + k * 140) % 420) + 40;
        draw(g, pole, px, ROAD_Y - 36);
      }
      drawWrap(g, road, run, ROAD_Y);
      drawWrap(g, verge, run * 1.2, ROAD_Y + 24);
      // Car (cruising) with exhaust and headlight beam
      const bounce = Math.floor(t * 9) % 4 === 0 ? 1 : 0;
      for (const p of exhaust) drawPuff(g, p.x, p.y, p.r0 + p.t * 3, '#4a4458', null, 0.6);
      g.globalAlpha = 0.22;
      g.fillStyle = '#fff2b0';
      g.beginPath(); g.moveTo(118, ROAD_Y + 7); g.lineTo(210, ROAD_Y + 2); g.lineTo(210, ROAD_Y + 20); g.closePath(); g.fill();
      g.globalAlpha = 1;
      drawCar(g, car, wheels, 78, ROAD_Y, run, { bounce });
      // Family faces in the windows (tiny heads behind glass)
      [[83, '#3a2614'], [92, '#8a5a2a'], [100, '#d8b060']].forEach(([x, hair], i) => {
        R(g, x, ROAD_Y + 4 - bounce, 3, 1, hair); R(g, x, ROAD_Y + 5 - bounce, 3, 1, ['#f1c27d', '#c68642', '#ffdbac'][i]);
      });

      // Logo drops in with an overshoot, subtitle follows
      const ky = easeOutBack((t - 0.2) / 0.9);
      const la = lerp(-60, 10, ky);
      g.drawImage(logoA, Math.round(W / 2 - logoA.width / 2), Math.round(la));
      const kb = easeOutBack((t - 0.45) / 0.9);
      g.drawImage(logoB, Math.round(W / 2 - logoB.width / 2), Math.round(lerp(-60, 44, kb)));
      if (t > 1.4) {
        const sub = 'THE LAST SAFE ROAD';
        const n = Math.min(sub.length, Math.floor((t - 1.4) * 20));
        text(g, sub.slice(0, n), W / 2 - textWidth(sub) / 2, 86, { color: '#ffe8c0', outline: '#1a0a14' });
      }
    },
  };
}

// ── End: win ─────────────────────────────────────────────────────────────────

export function endWinScene(env) {
  const r = rng(77);
  const dest = String(env.destName || 'SAFE HAVEN').toUpperCase();
  const sky = strip(W, 130, (g) => ditherBands(g, 0, 0, W, 130,
    ['#1a2058', '#34307a', '#6a4a98', '#b06a9a', '#e8907a', '#ffc078', '#ffe0a0']));
  const far = strip(480, 60, (g, w, h) => ridge(g, w, h, { amp: 30, base: 58, seed: 31, color: '#4a5a8a', hi: '#9aa0c8' }));
  const tree = roundTreeSprite();
  const pine = pineSprite();
  const house = houseSprite(undefined, true);
  const houseB = houseSprite({ R: '#3a6aa8', r: '#2a4a78', W: '#f0e8d0', w: '#c8c0a8', D: '#5a3a20', G: '#ffd870', g: '#90b8d8', C: '#6a6a70' }, true);
  const mid = strip(W + 40, 70, (g, w, h) => {
    const tops = ridge(g, w, h, { amp: 16, base: 66, seed: 41, color: '#3a7a3a', hi: '#8ad06a', shade: '#2a5a2a' });
    draw(g, house, 150, tops[160] - 12);
    draw(g, houseB, 196, tops[205] - 11);
    draw(g, house, 236, tops[245] - 10);
    for (const x of [20, 60, 130, 182, 228, 290]) draw(g, x % 3 ? tree : pine, x, tops[x + 5] - (x % 3 ? tree.h : pine.h) + 4);
    // Solar panels in a row
    for (let x = 96; x < 130; x += 9) { R(g, x, tops[x] - 6, 7, 4, '#2a3a7a'); R(g, x, tops[x] - 6, 7, 1, '#8ab0e8'); R(g, x + 3, tops[x] - 2, 1, 3, '#5a5a6a'); }
  });
  const road = roadStrip({ asphalt: '#3a3640', grain: '#46424c', dash: '#f0d060' });
  const verge = grassStrip('#3a8a3a', '#2a6a2a', '#7ad05a', 18, 13);
  const shoulder = grassStrip('#3a8a3a', '#2a6a2a', '#7ad05a', 6, 3);
  const car = carSprite('blue');
  const wheels = wheelSprites();
  const fam = familySprites(env.family);
  const flowers = Array.from({ length: 26 }, () => ({ x: r.int(2, W - 2), y: r.int(ROAD_Y + 27, H - 3), c: r.pick(['#ff6a8a', '#ffe060', '#ffffff', '#c88aff']), p: r.range(0, 6) }));
  const banner = logo('YOU MADE IT!', 3, ['#fff8c0', '#ffe060', '#ffb030', '#f07a20'], '#1a0a14');
  const sparks = [];
  let fwT = 1.8;

  return {
    update(dt, t) {
      if (t > 2.2) {
        fwT -= dt;
        if (fwT <= 0) {
          fwT = r.range(0.45, 0.9);
          const [c1, c2] = r.pick(FIREWORK_COLS);
          const x = r.range(40, W - 40), y = r.range(18, 64);
          for (let i = 0; i < 34; i++) {
            const a = (i / 34) * Math.PI * 2, sp = r.range(28, 46);
            sparks.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 30, drag: 1.4, life: r.range(1.1, 1.6), c1, c2 });
          }
        }
      }
      stepParticles(sparks, dt);
    },
    draw(g, t) {
      g.drawImage(sky, 0, 0);
      disc(g, 70, 104, 16, '#ffd070'); disc(g, 70, 104, 11, '#fff0b0');
      for (const s of sparks) {
        const k = s.t / s.life;
        R(g, s.x, s.y, 1, 1, k < 0.5 ? s.c2 : s.c1);
        if (k < 0.3) R(g, s.x - s.vx * 0.04, s.y - s.vy * 0.04, 1, 1, s.c1);
      }
      const pan = 1 - easeOut(t / 2.5);
      g.drawImage(far, -40 + Math.round(pan * 30), 70);
      // Wind turbines on the far ridge, behind the town
      for (let k = 0; k < 3; k++) turbine(g, 24 + k * 26 + Math.round(pan * 30), 128 - k * 3, 34 - k * 5, t * 2.2 + k);
      g.drawImage(mid, -20 + Math.round(pan * 50), 76);
      drawWrap(g, shoulder, 0, ROAD_Y - 6);
      drawWrap(g, road, 0, ROAD_Y);
      drawWrap(g, verge, 0, ROAD_Y + 24);
      for (const f of flowers) {
        const sway = Math.round(Math.sin(t * 2 + f.p) * 0.6);
        R(g, f.x, f.y, 1, 2, '#2a6a2a'); R(g, f.x + sway - 1, f.y - 2, 3, 1, f.c); R(g, f.x + sway, f.y - 3, 1, 3, f.c); R(g, f.x + sway, f.y - 2, 1, 1, '#ffe8a0');
      }
      // Welcome sign
      const sx = 238, sw = Math.max(textWidth('WELCOME TO'), textWidth(dest)) + 10;
      R(g, sx + 4, ROAD_Y - 22, 2, 20, '#5a3a20'); R(g, sx + sw - 6, ROAD_Y - 22, 2, 20, '#5a3a20');
      R(g, sx - 1, ROAD_Y - 41, sw + 2, 22, INK);
      R(g, sx, ROAD_Y - 40, sw, 20, '#2a6a3a'); R(g, sx + 1, ROAD_Y - 39, sw - 2, 18, '#3a8a4a');
      R(g, sx + 1, ROAD_Y - 39, sw - 2, 1, '#6ac07a');
      text(g, 'WELCOME TO', sx + sw / 2, ROAD_Y - 36, { align: 'center', color: '#e8f8e0' });
      text(g, dest, sx + sw / 2, ROAD_Y - 27, { align: 'center', color: '#ffffff', shadow: '#1a3a20' });
      // Car arrives, family hops out and cheers
      const ct = clamp(t / 1.8, 0, 1);
      const cx = lerp(-50, 150, easeOut(ct));
      drawCar(g, car, wheels, cx, ROAD_Y, cx, { bounce: ct < 1 && Math.floor(t * 10) % 2 ? 1 : 0 });
      if (t > 1.9) {
        const k = easeOut((t - 1.9) / 0.6);
        fam.forEach((m, i) => {
          const tx = 92 - i * 12, x = lerp(cx + 6, tx, k);
          drawFamily(g, [m], x, ROAD_Y + 18 + (i % 2), k < 1 ? 'walk' : 'cheer', { t: t + i * 0.3, flip: k < 1 });
        });
      }
      if (t > 2.4) {
        const kb = easeOutBack((t - 2.4) / 0.7);
        g.drawImage(banner, Math.round(W / 2 - banner.width / 2), Math.round(lerp(-30, 12, kb)));
      }
    },
  };
}

// ── End: lose ────────────────────────────────────────────────────────────────

const LOSE_SKIES = {
  flood:     ['#0c1420', '#16243a', '#24364c', '#364a5e', '#4a5e6e'],
  hurricane: ['#0a141a', '#14262e', '#203a40', '#2e4a4e', '#405a5a'],
  wildfire:  ['#14080a', '#2e0e0e', '#561a12', '#86301a', '#b0502a'],
  heat:      ['#3a2414', '#6a4024', '#a8683a', '#d8904a', '#f0b868'],
  tornado:   ['#0e140e', '#1c2a20', '#2e4232', '#465a40', '#6a7a52'],
  default:   ['#0e0e1a', '#1c1a30', '#30284a', '#4a3a5a', '#6a4e62'],
};

export function endLoseScene(env) {
  const peril = env.peril && LOSE_SKIES[env.peril] ? env.peril : 'default';
  const r = rng(13);
  const wet = peril === 'flood' || peril === 'hurricane' || peril === 'default';
  const sky = strip(W, 130, (g) => ditherBands(g, 0, 0, W, 130, LOSE_SKIES[peril]));
  const far = strip(480, 60, (g, w, h) => ridge(g, w, h, { amp: 24, base: 58, seed: 5, color: '#1a1622', hi: '#3a3040' }));
  const snag = deadTreeSprite('#1a1214', '#2a2024');
  const mid = strip(W + 40, 50, (g, w, h) => {
    const tops = ridge(g, w, h, { amp: 10, base: 48, seed: 6, color: '#141016', hi: '#2a2230' });
    for (const x of [30, 90, 210, 290]) draw(g, snag, x, tops[x + 5] - snag.h + 3);
  });
  const road = roadStrip({ asphalt: '#1e1c22', grain: '#28262c', edge: '#4a4650', dash: '#6a5a3a', lip: '#2a2830' });
  const verge = grassStrip('#16141a', '#221e24', '#2e2a30', 18, 22);
  const shoulder = grassStrip('#16141a', '#221e24', '#2e2a30', 6, 23);
  const car = carSprite('blue');
  const wheels = wheelSprites();
  const door = sprite(['BBBBBBB', 'BWWWWWB', 'BWWWWWB', 'BBBBBBB', 'BBBBBBB', 'BBBBBBB', 'bbbbbbb'],
    { B: '#3a6ad0', b: '#2a4a98', W: '#9ad4f0' }, { outline: INK });
  const bag = sprite(['.hh.', 'SSSS', 'SsSS', 'SSSS'], { h: '#3a2a1a', S: '#a86a3a', s: '#c88a4a' }, { outline: INK });
  const crow = [sprite(['..KK', 'KKKk', '.KK.', '.k.k'], { K: '#141016', k: '#e0a030' }), sprite(['..KK', 'KKKk', 'KKK.', '.k.k'], { K: '#141016', k: '#e0a030' })];
  const pole = poleSprite('#2a2026');
  const SW = 41;   // sign board width
  const sign = sprite([
    'Y'.repeat(SW), 'Y' + 'k'.repeat(SW - 2) + 'Y',
    ...Array(7).fill('Yk' + 'Y'.repeat(SW - 4) + 'kY'),
    'Y' + 'k'.repeat(SW - 2) + 'Y', 'Y'.repeat(SW),
    ...Array(6).fill('.'.repeat(19) + 'ss'),
  ], { Y: '#c8a030', k: '#1a1410', s: '#5a5a62' }, { outline: INK });
  const skyline = strip(W, 40, (g) => {
    const sr = rng(19);
    for (let x = 0; x < W;) {
      const bw = sr.int(8, 20), bh = sr.int(10, 34);
      R(g, x, 40 - bh, bw, bh, '#100e16');
      for (let wy = 40 - bh + 3; wy < 38; wy += 4) for (let wx = x + 2; wx < x + bw - 2; wx += 3) if (sr() < 0.06) R(g, wx, wy, 1, 2, '#c8a060');
      x += bw + sr.int(0, 4);
    }
  });
  const fog = strip(W + 64, 30, (g) => { for (let y = 0; y < 30; y++) ditherFill(g, 0, y, W + 64, 1, '#5a5a6a', 0.3 * Math.sin((y / 30) * Math.PI)); });
  let boltT = 2, boltSeed = 1, flash = 0;
  const title = logo('THE ROAD ENDS', 3, ['#e8d8d8', '#c8a8a8', '#a87878', '#7a4a4a'], '#0a0608');
  const fx = [];
  let fxT = 0;

  return {
    shimmer: peril === 'heat' ? { y0: 90, y1: ROAD_Y + 10, amp: 1 } : null,
    flash: 0,
    update(dt) {
      if (wet) {
        boltT -= dt;
        flash = Math.max(0, flash - dt * 3);
        if (boltT <= 0) { boltT = r.range(2.5, 5); boltSeed = r.int(1, 999); flash = 1; }
        this.flash = flash > 0.6 ? flash * 0.5 : 0;
      }
      fxT += dt * (wet ? 90 : peril === 'wildfire' ? 22 : peril === 'tornado' ? 18 : 8);
      while (fxT > 1) {
        fxT--;
        if (wet) fx.push({ x: r.range(0, W + 40), y: -4, vx: -30, vy: r.range(150, 190), life: 2, k: 'rain' });
        else if (peril === 'wildfire') fx.push({ x: r.range(-10, W), y: r.range(-4, H), vx: r.range(6, 14), vy: r.range(4, 10), life: 8, k: 'ash' });
        else if (peril === 'tornado') fx.push({ x: -6, y: r.range(40, H), vx: r.range(90, 140), vy: r.range(-10, 10), life: 4, k: 'debris' });
        else fx.push({ x: -4, y: r.range(90, H), vx: r.range(30, 60), vy: r.range(-3, 3), life: 8, k: 'dust' });
      }
      stepParticles(fx, dt);
    },
    draw(g, t) {
      g.drawImage(sky, 0, 0);
      if (wet && flash > 0.6) bolt(g, 60 + (boltSeed % 200), 0, 104, boltSeed);
      g.drawImage(far, -40, 72);
      g.drawImage(skyline, 0, 78);
      g.drawImage(mid, -20, 96);
      drawWrap(g, fog, t * 3, 104);
      drawWrap(g, shoulder, 0, ROAD_Y - 6);
      // Power poles with sagging (one snapped) wires
      draw(g, pole, 40, ROAD_Y - 36); draw(g, pole, 250, ROAD_Y - 36);
      for (let x = 46; x < 256; x++) {
        const k = (x - 46) / 210;
        R(g, x, ROAD_Y - 35 + Math.round(Math.sin(k * Math.PI) * 9), 1, 1, '#0a0810');
        if (x < 160) R(g, x, ROAD_Y - 31 + Math.round(Math.sin(k * Math.PI) * 9), 1, 1, '#0a0810');
      }
      R(g, 160, ROAD_Y - 27, 1, 1, '#0a0810');
      for (let y = 0; y < 18; y++) R(g, 160 + Math.round(Math.sin(t * 1.4 + y * 0.2) * y * 0.15), ROAD_Y - 26 + y, 1, 1, '#0a0810');
      drawWrap(g, road, 0, ROAD_Y);
      drawWrap(g, verge, 0, ROAD_Y + 24);
      // Flickering streetlight and its pool of light
      const lampOn = Math.floor(t * 7) % 9 !== 0 && Math.floor(t * 3) % 11 !== 4;
      R(g, 222, ROAD_Y - 44, 2, 46, '#2a2830'); R(g, 212, ROAD_Y - 44, 12, 2, '#2a2830'); R(g, 210, ROAD_Y - 43, 5, 2, lampOn ? '#fff0b0' : '#4a4640');
      if (lampOn) {
        g.globalAlpha = 0.16; g.fillStyle = '#ffe8a0';
        g.beginPath(); g.moveTo(210, ROAD_Y - 41); g.lineTo(215, ROAD_Y - 41); g.lineTo(236, ROAD_Y + 22); g.lineTo(186, ROAD_Y + 22); g.closePath(); g.fill();
        g.globalAlpha = 1;
      }
      // Leaning ROAD CLOSED sign
      g.save(); g.translate(60, ROAD_Y + 4); g.rotate(-0.12);
      draw(g, sign, -20, -16);
      text(g, 'CLOSED', 0, -14, { align: 'center', color: '#1a1410' });
      g.restore();
      // Abandoned car, hazard lights, open door, a dropped bag, crows
      const cx = 140;
      drawCar(g, car, wheels, cx, ROAD_Y, 0);
      draw(g, door, cx + 13, ROAD_Y + 4);
      draw(g, bag, cx - 14, ROAD_Y + 14);
      if (Math.floor(t * 2) % 2 === 0) {
        R(g, cx, ROAD_Y + 7, 1, 2, '#ffb030'); R(g, cx + 39, ROAD_Y + 7, 1, 2, '#ffb030');
        g.globalAlpha = 0.25; disc(g, cx, ROAD_Y + 8, 5, '#ffb030'); disc(g, cx + 39, ROAD_Y + 8, 5, '#ffb030'); g.globalAlpha = 1;
      }
      draw(g, crow[Math.floor(t * 1.3) % 2], cx + 8, ROAD_Y - 2);
      draw(g, crow[Math.floor(t * 0.9 + 1) % 2], cx + 18, ROAD_Y - 2, true);
      for (const p of fx) {
        if (p.k === 'rain') { R(g, p.x, p.y, 1, 3, '#7a8aa0'); }
        else if (p.k === 'ash') R(g, p.x, p.y, 1, 1, '#8a7a74');
        else if (p.k === 'debris') R(g, p.x, p.y, 3, 1, '#5a4a3a');
        else R(g, p.x, p.y, 2, 1, '#c8a070');
      }
      if (wet) {
        // Puddle ripples on the road
        for (let i = 0; i < 6; i++) {
          const k = (t * 1.5 + i * 0.37) % 1, px = (i * 53 + 20) % W;
          R(g, px - k * 3, ROAD_Y + 18 + (i % 3) * 2, 1 + k * 6, 1, '#4a5060');
        }
      }
      const a = clamp((t - 0.8) / 1.2, 0, 1);
      g.globalAlpha = a;
      g.drawImage(title, Math.round(W / 2 - title.width / 2), 22);
      g.globalAlpha = 1;
    },
  };
}

// ── Mini-game cards ──────────────────────────────────────────────────────────

const RAIDER = ['..KK..', '.KKKK.', '.KSSK.', '..SS..', 'CCCCCC', 'CCCCCC', 'SCCCCS', '.CCCC.', '.PPPP.', '.PP.PP', '.PP.PP', '.KK.KK'];
const RAIDER_UP = ['S.KK.S', 'CKKKKC', 'C.SS.C', 'C.SS.C', 'CCCCCC', '.CCCC.', '.CCCC.', '.CCCC.', '.PPPP.', '.PP.PP', '.PP.PP', '.KK.KK'];

export function barricadeCard(env) {
  const won = !!env.won;
  const r = rng(won ? 8 : 9);
  const sky = strip(W, 130, (g) => ditherBands(g, 0, 0, W, 130, ['#06060e', '#0e0e22', '#1a1834', '#2a2040', '#3a2a40']));
  const stars = Array.from({ length: 50 }, () => ({ x: r.int(1, W - 1), y: r.int(1, 80) }));
  const far = strip(480, 50, (g, w, h) => ridge(g, w, h, { amp: 22, base: 48, seed: 51, color: '#14141e', hi: '#2a2a3a' }));
  const road = roadStrip({ asphalt: '#1e1c24', grain: '#26242c', edge: '#5a5664', dash: '#a08a3a', lip: '#24222a' });
  const verge = grassStrip('#121418', '#1a1e20', '#24282a', 18, 31);
  const shoulder = grassStrip('#121418', '#1a1e20', '#24282a', 6, 32);
  const car = carSprite('blue');
  const wheels = wheelSprites();
  const plank = sprite(['WWWWWWWWWWW', 'wwwwwwwwwww'], { W: '#8a6a3a', w: '#5a4020' }, { outline: INK });
  const tire = sprite(['.kkkk.', 'kKKKKk', 'kK..Kk', 'kKKKKk', '.kkkk.'], { k: '#0a0a0a', K: '#2a2a2e' }, { outline: INK });
  const raiders = [0, 1, 2, 3, 4, 5].map(i => {
    const pal = { K: '#1a1418', S: '#4a3428', C: ['#3a2a2a', '#2a3a2a', '#3a3a2a'][i % 3], P: '#22201e' };
    return { idle: sprite(RAIDER, pal, { outline: INK }), up: sprite(RAIDER_UP, pal, { outline: INK }) };
  });
  const banner = won ? logo('ESCAPED!', 4, ['#f0ffe0', '#a8f080', '#5ad050', '#2a9a3a'], '#06140a')
                     : logo('CAUGHT!', 4, ['#ffe0d0', '#ff8a6a', '#e8402a', '#a01a14'], '#140606');
  const BX = 196;               // barricade x
  const debris = [], sparks = [], smoke = [];
  let hit = false, smT = 0;

  const scene = {
    shake: 0,
    update(dt, t) {
      scene.shake = Math.max(0, scene.shake - dt * 10);
      if (won && !hit && t > 0.32) {
        hit = true; scene.shake = 3;
        for (let i = 0; i < 9; i++) debris.push({ x: BX + r.range(-2, 8), y: ROAD_Y - r.range(0, 16), vx: r.range(40, 140), vy: -r.range(40, 110), g: 260, life: 2, rot: r.range(0, 3), vr: r.range(-12, 12), kind: i % 3 ? 'plank' : 'tire' });
        for (let i = 0; i < 30; i++) sparks.push({ x: BX, y: ROAD_Y + r.range(-8, 12), vx: r.range(-30, 120), vy: -r.range(10, 90), g: 200, life: r.range(0.3, 0.8) });
      }
      for (const d of debris) d.rot += d.vr * dt;
      if (!won) {
        smT += dt * 10;
        while (smT > 1) { smT--; for (const bx of [60, 262]) smoke.push({ x: bx + r.range(-2, 2), y: ROAD_Y - 18, vx: r.range(-2, 4), vy: -r.range(10, 18), life: 2.2, r0: 2 }); sparks.push({ x: r.pick([60, 262]) + r.range(-3, 3), y: ROAD_Y - 16, vx: r.range(-8, 8), vy: -r.range(20, 50), life: 0.8 }); }
      }
      stepParticles(debris, dt); stepParticles(sparks, dt); stepParticles(smoke, dt);
    },
    draw(g, t) {
      g.drawImage(sky, 0, 0);
      for (const s of stars) R(g, s.x, s.y, 1, 1, '#6a6a8a');
      disc(g, 270, 30, 9, '#e8e4c8'); disc(g, 274, 27, 8, '#0e0e22');
      g.drawImage(far, -60, 98);
      const run = won ? t * 260 : 0;
      drawWrap(g, shoulder, run * 0.8, ROAD_Y - 6);
      drawWrap(g, road, run, ROAD_Y);
      drawWrap(g, verge, run * 1.1, ROAD_Y + 24);

      if (won) {
        // Intact barricade until the hit, then splinters
        if (!hit) {
          for (let i = 0; i < 3; i++) draw(g, plank, BX - 4, ROAD_Y - 14 + i * 7);
          R(g, BX, ROAD_Y - 18, 2, 26, '#5a4020'); R(g, BX + 6, ROAD_Y - 18, 2, 26, '#5a4020');
          draw(g, tire, BX - 12, ROAD_Y + 12); draw(g, tire, BX + 10, ROAD_Y + 14);
        }
        const cx = t < 0.32 ? lerp(-40, BX - 36, t / 0.32) : BX - 36 + (t - 0.32) * 150;
        // Speed lines
        for (let i = 0; i < 10; i++) {
          const ly = 20 + ((i * 37) % 150), lx = W - ((t * 600 + i * 97) % (W + 60));
          R(g, lx, ly, 18 + (i % 3) * 8, 1, i % 2 ? '#3a3a5a' : '#5a5a7a');
        }
        drawCar(g, car, wheels, cx, ROAD_Y, cx, { bounce: Math.floor(t * 14) % 2 });
        g.globalAlpha = 0.25; g.fillStyle = '#fff2b0';
        g.beginPath(); g.moveTo(cx + 40, ROAD_Y + 7); g.lineTo(cx + 130, ROAD_Y); g.lineTo(cx + 130, ROAD_Y + 18); g.closePath(); g.fill();
        g.globalAlpha = 1;
        for (const d of debris) {
          g.save(); g.translate(Math.round(d.x), Math.round(d.y)); g.rotate(Math.round(d.rot * 4) / 4);
          if (d.kind === 'plank') g.drawImage(plank.c, -6, -2); else g.drawImage(tire.c, -4, -4);
          g.restore();
        }
      } else {
        // Burning barrels at both ends, car stuck at the barricade
        for (const bx of [60, 262]) {
          R(g, bx - 5, ROAD_Y - 12, 10, 14, INK); R(g, bx - 4, ROAD_Y - 11, 8, 12, '#4a3a34'); R(g, bx - 4, ROAD_Y - 7, 8, 1, '#6a5a50');
          flameWall(g, bx - 4, bx + 4, ROAD_Y - 11, 10, t * 1.3, 1, bx);
          g.globalAlpha = 0.18 + 0.06 * Math.sin(t * 17 + bx); disc(g, bx, ROAD_Y - 10, 22, '#ff8a2a'); g.globalAlpha = 1;
        }
        for (const p of smoke) drawPuff(g, p.x, p.y, p.r0 + p.t * 3, '#1e1a1e', null, 0.5);
        for (let i = 0; i < 3; i++) draw(g, plank, BX + 2, ROAD_Y - 14 + i * 7);
        R(g, BX + 6, ROAD_Y - 18, 2, 26, '#5a4020'); R(g, BX + 12, ROAD_Y - 18, 2, 26, '#5a4020');
        drawCar(g, car, wheels, BX - 38, ROAD_Y, 0);
        // Raiders close in from both sides, then whoop
        raiders.forEach((rd, i) => {
          const left = i % 2 === 0;
          const k = easeOut((t - i * 0.08) / 0.7);
          const home = left ? 96 + i * 7 : 236 + i * 5;
          const x = lerp(left ? -20 : W + 20, home, k);
          const up = k >= 1 && Math.floor(t * 4 + i) % 2 === 0;
          const s = up ? rd.up : rd.idle;
          draw(g, silhouette(s, '#ff7a3a'), x + (left ? -1 : 1), ROAD_Y + 6 + (i % 3) * 3 - 1, !left);
          draw(g, s, x, ROAD_Y + 6 + (i % 3) * 3, !left);
        });
      }
      for (const s of sparks) R(g, s.x, s.y, 1, 1, s.t < 0.3 ? '#fff0a0' : '#ff8a2a');
      if (t > 0.35) {
        const kb = easeOutBack((t - 0.35) / 0.5);
        g.drawImage(banner, Math.round(W / 2 - banner.width / 2), Math.round(lerp(-40, 18, kb)));
        const sub = won ? 'FREEDOM AHEAD' : 'THE RAIDERS TAKE THEIR CUT';
        if (t > 0.8) text(g, sub, W / 2, 56, { align: 'center', color: won ? '#c8f0c0' : '#f0c0b0', outline: '#000' });
      }
    },
  };
  return scene;
}

export function riverCard(env) {
  const won = !!env.won;
  const r = rng(won ? 3 : 4);
  const sky = strip(W, 120, (g) => ditherBands(g, 0, 0, W, 120, won
    ? ['#3a7ad8', '#5a9ae8', '#8ac0f0', '#c0e0f8']
    : ['#1a2430', '#2a3a4a', '#3a4e5e', '#566a78']));
  const far = strip(480, 50, (g, w, h) => ridge(g, w, h, { amp: 18, base: 48, seed: 61, color: won ? '#3a7a5a' : '#24343a', hi: won ? '#7ac08a' : '#3a4a50' }));
  const cloud = cloudSprite(true);
  const tree = roundTreeSprite();
  const pine = pineSprite();
  const car = carSprite('blue');
  const wheels = wheelSprites();
  const fam = familySprites(env.family);
  const log = sprite(['.bbbbbbbbbbbbbbbbb.', 'bBBBBBBBBBBBBBBBBBb', 'bBwBBBBBBwBBBBBBBBb', 'bbbbbbbbbbbbbbbbbbb'],
    { b: '#4a2e12', B: '#7a5020', w: '#a87a3a' }, { outline: INK });
  const title = String(env.title || (won ? 'ACROSS!' : 'SWEPT AWAY!')).toUpperCase();
  const banner = won ? logo(title, 4, ['#fffbe0', '#ffe060', '#ffb030', '#e87a20'], '#1a0a04')
                     : logo(title, 4, ['#e8f4ff', '#9ac8f0', '#5a8ac8', '#2a4a8a'], '#04081a');
  const drops = [];
  let dT = 0;

  const RIVER_TOP = won ? 112 : 96;
  return {
    update(dt, t) {
      dT += dt * (won ? 24 : 50);
      while (dT > 1) {
        dT--;
        if (won) { if (t < 1.4) drops.push({ x: r.range(150, 190), y: ROAD_Y + r.range(0, 10), vx: r.range(-10, 10), vy: r.range(0, 10), g: 220, life: 0.6 }); }
        else if (r() < 0.5) drops.push({ x: 150 + t * 18 + r.range(-24, 30), y: 124 + r.range(-2, 2), vx: r.range(-40, 40), vy: -r.range(30, 70), g: 260, life: 0.7 });
      }
      stepParticles(drops, dt);
    },
    draw(g, t) {
      g.drawImage(sky, 0, 0);
      if (won) {
        // Rainbow arc
        const cols = ['#ff5a5a', '#ffa040', '#ffe060', '#6ad05a', '#4a9aff', '#9a6aff'];
        cols.forEach((c, i) => {
          for (let a = 0; a <= Math.PI; a += 0.012) {
            R(g, Math.round(160 + Math.cos(a) * (120 - i * 3)), Math.round(118 - Math.sin(a) * (92 - i * 3)), 2, 2, c);
          }
        });
        draw(g, cloud, (20 + t * 6) % (W + 30) - 30, 18);
        draw(g, cloud, (180 + t * 4) % (W + 30) - 30, 34);
      }
      g.drawImage(far, -40, RIVER_TOP - 40);
      // River: banded water with scrolling crest tiles
      R(g, 0, RIVER_TOP, W, H - RIVER_TOP, won ? '#2a6ac0' : '#1e3a5a');
      for (let y = RIVER_TOP; y < H; y += 5) {
        const sp = (won ? 20 : 70) * (1 + (y - RIVER_TOP) / 40);
        for (let x = -16; x < W + 16; x += 16) {
          const xx = Math.round(x + ((t * sp + y * 3) % 16));
          R(g, xx, y, 6, 1, won ? '#6aaae8' : '#4a7aa0');
          R(g, xx + 2, y - 1, 3, 1, won ? '#c8e8ff' : '#9ac0d8');
        }
      }
      if (won) {
        // Far bank: grass, trees, car climbing out, family cheering
        R(g, 0, ROAD_Y - 2, W, H - ROAD_Y + 2, '#4a9a3a'); R(g, 0, ROAD_Y - 2, W, 1, '#8ad06a');
        ditherFill(g, 0, ROAD_Y + 6, W, H - ROAD_Y - 6, '#3a7a2a', 0.4);
        for (const x of [12, 40, 270, 298]) draw(g, x % 3 ? tree : pine, x, ROAD_Y - (x % 3 ? tree.h : pine.h) + 2);
        const k = easeOut(t / 1.2);
        const cx = lerp(110, 170, k), cy = lerp(ROAD_Y + 10, ROAD_Y - 4, k);
        drawCar(g, car, wheels, cx, cy, cx, { bounce: k < 1 && Math.floor(t * 12) % 2 ? 1 : 0 });
        if (t > 1.1) drawFamily(g, fam, 120, ROAD_Y + 14, 'cheer', { t, flip: false, gap: 10 });
      } else {
        // Logs and the car tumbling downstream
        for (let i = 0; i < 4; i++) draw(g, log, ((t * 80 + i * 97) % (W + 60)) - 40, 102 + (i % 3) * 16 + Math.round(Math.sin(t * 3 + i)));
        const cx = 140 + Math.sin(t * 1.7) * 14 + t * 18, cy = 112 + Math.round(Math.sin(t * 4) * 2);
        g.save();
        g.translate(Math.round(cx + 20), Math.round(cy + 8));
        g.rotate(Math.round(Math.sin(t * 3) * 3) / 12);
        drawCar(g, car, wheels, -20, -8, t * 30);
        g.restore();
        // Water swallowing the lower half of the car
        for (let x = -20; x < 50; x++) {
          const wy = Math.round(cy + 12 + Math.sin(x * 0.4 + t * 8) * 1.5);
          R(g, cx + x, wy, 1, 10, '#1e3a5a');
          R(g, cx + x, wy, 1, 1, '#c8e0f0');
        }
        // Near bank: the family watches from the mud
        R(g, 0, 158, W, H - 158, '#3a2e22'); R(g, 0, 158, W, 1, '#6a5a44');
        ditherFill(g, 0, 160, W, H - 160, '#4a3c2c', 0.35);
        for (let x = 0; x < W; x += 6) R(g, x + Math.round(Math.sin(t * 6 + x) * 1), 157, 4, 1, '#9ac0d8');
        drawFamily(g, fam, 30, 172, 'idle', { t, gap: 10 });
      }
      for (const d of drops) R(g, d.x, d.y, 1, 2, won ? '#c8e8ff' : '#e0f0ff');
      if (t > 0.3) {
        const kb = easeOutBack((t - 0.3) / 0.5);
        g.drawImage(banner, Math.round(W / 2 - banner.width / 2), Math.round(lerp(-40, 16, kb)));
        const sub = won ? 'FAR BANK REACHED' : 'PULLED BACK TO SHORE';
        if (t > 0.7) text(g, sub, W / 2, 54, { align: 'center', color: '#ffffff', outline: '#0a1420' });
      }
    },
  };
}

// ── Runners ──────────────────────────────────────────────────────────────────

/** Loops a scene on a DOM canvas (title / end screens) until stop(). */
export class ScreenArt {
  constructor(canvas) {
    this.canvas = canvas;
    this.canvas.width = W;
    this.canvas.height = H;
    this.ctx = canvas.getContext('2d');
    this.player = new CutscenePlayer();
    this.raf = null;
  }
  start(factory, env = {}, meta = {}) {
    this.stop();
    this.player.reset();
    this.player.play(Symbol('screen'), factory, env, meta);
    const loop = (now) => {
      this.player.render(this.ctx, now);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }
  stop() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
  }
}

/** Plays a short card on the shared game canvas until stop() (mini-games). */
export class CardRunner extends ScreenArt {
  start(factory, env = {}) { super.start(factory, env, { dissolve: 0.2 }); }
}

// Dev gallery hook (dev/cutscenes.html)
export const GALLERY_SCENES = {
  title: { factory: titleScene, meta: { dissolve: 0.5 } },
  endWin: { factory: endWinScene, env: { destName: 'Duluth' } },
  endLose: { factory: (e) => endLoseScene({ ...e, peril: 'flood' }) },
  endLoseFire: { factory: (e) => endLoseScene({ ...e, peril: 'wildfire' }) },
  endLoseHeat: { factory: (e) => endLoseScene({ ...e, peril: 'heat' }) },
  barricadeWin: { factory: (e) => barricadeCard({ ...e, won: true }), meta: { dissolve: 0.2 } },
  barricadeLose: { factory: (e) => barricadeCard({ ...e, won: false }), meta: { dissolve: 0.2 } },
  riverWin: { factory: (e) => riverCard({ ...e, won: true }), meta: { dissolve: 0.2 } },
  riverLose: { factory: (e) => riverCard({ ...e, won: false }), meta: { dissolve: 0.2 } },
};
