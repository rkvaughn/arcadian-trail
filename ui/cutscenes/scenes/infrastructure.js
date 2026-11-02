/**
 * Grid failure — dusk over a city. During the intro the skyline blacks out
 * block by block, right to left. A snapped high-voltage line dangles from a
 * transmission tower and arcs sparks on the road; a dead traffic light blinks
 * amber over cones and a striped barricade. The car waits, headlights on.
 *
 * Variant: bridge_collapse — an overcast river gorge. A span of the bridge
 * breaks away and crashes into the river (splash, shake); rebar dangles over
 * the gap and the car stops short at a CLOSED barricade.
 */

import {
  W, H, R, rng, ease, easeOut, clamp, lerp, ditherBands, ditherFill, ridge, strip, drawWrap,
  drawPuff, stepParticles, draw, disc, sprite, text, makeCanvas, silhouette,
} from '../kit.js';
import { INK, carSprite, wheelSprites, drawCar, familySprites, drawFamily, poleSprite, pineSprite } from '../sprites.js';

const ROAD_Y = 142;
const GROUND_Y = 128;

function line(g, x0, y0, x1, y1, c) {
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
  for (let i = 0; i <= n; i++) R(g, lerp(x0, x1, i / n), lerp(y0, y1, i / n), 1, 1, c);
}

/** Sagging catenary-ish wire between two points. */
function wire(g, x0, y0, x1, y1, sag, c) {
  const n = Math.max(1, Math.ceil(Math.abs(x1 - x0)));
  for (let i = 0; i <= n; i++) {
    const k = i / n;
    R(g, lerp(x0, x1, k), lerp(y0, y1, k) + Math.sin(k * Math.PI) * sag, 1, 1, c);
  }
}

const cone = () => sprite(['..O..', '..O..', '.WWW.', '.OOO.', '.WWW.', 'OOOOO', 'KKKKK'],
  { O: '#ff6a10', W: '#f8f0e8', K: '#2a2228' }, { outline: INK });
const barricade = () => sprite([
  'L..............L', 'OOWWOOWWOOWWOOWW', 'WWOOWWOOWWOOWWOO', 'OOWWOOWWOOWWOOWW', '.P............P.',
  '.P............P.', 'PP............PP',
], { O: '#ff6a10', W: '#f8f0e8', P: '#6a6a72', L: '#ffb020' }, { outline: INK });

export function infrastructureScene(env) {
  return env.eventId === 'bridge_collapse' ? bridgeScene(env) : outageScene(env);
}

// ── Power outage ─────────────────────────────────────────────────────────────

function outageScene(env) {
  const r = rng(61);
  const sky = strip(W, 132, (g) => ditherBands(g, 0, 0, W, 132,
    ['#100f28', '#22204a', '#4a2c5e', '#8a3e5e', '#d06a52', '#f09a5a']));
  const stars = Array.from({ length: 24 }, () => [r.int(2, W - 2), r.int(2, 50), r()]);

  // Hazy far skyline (no windows) for depth
  const back = strip(400, 70, (g, w, h) => {
    const br = rng(2);
    for (let x = 0; x < w;) {
      const bw = br.int(10, 24), bh = br.int(18, 50);
      R(g, x, h - bh, bw, bh, '#3a2e58');
      if (br() < 0.3) R(g, x + bw / 2, h - bh - 6, 1, 6, '#3a2e58');
      x += bw + br.int(0, 3);
    }
  });
  // Near skyline: buildings with window grids, lit and dark versions
  const blds = [];
  {
    const br = rng(8);
    for (let x = -4; x < 400;) {
      const bw = br.int(16, 34), bh = br.int(26, 72);
      blds.push({ x, w: bw, h: bh, top: br.int(0, 3), seed: br.int(1, 999) });
      x += bw + br.int(1, 5);
    }
  }
  const paintCity = (lit) => strip(400, 80, (g, w, h) => {
    for (const b of blds) {
      const y = h - b.h;
      const wr = rng(b.seed);
      R(g, b.x, y, b.w, b.h, '#262440');
      R(g, b.x, y, 1, b.h, '#3a3858');
      R(g, b.x + b.w - 2, y, 2, b.h, '#1c1a30');
      if (b.top === 1) { R(g, b.x + 2, y - 3, b.w - 4, 3, '#262440'); }
      if (b.top === 2) { R(g, b.x + b.w / 2 - 1, y - 10, 1, 10, '#3a3858'); R(g, b.x + b.w / 2 - 1, y - 11, 1, 1, lit ? '#ff4040' : '#5a2a2a'); }
      if (b.top === 3) { R(g, b.x + 3, y - 7, 6, 5, '#3a3040'); R(g, b.x + 4, y - 2, 1, 2, '#3a3040'); R(g, b.x + 7, y - 2, 1, 2, '#3a3040'); }
      for (let wy = y + 3; wy < h - 3; wy += 4) {
        for (let wx = b.x + 2; wx < b.x + b.w - 3; wx += 3) {
          const on = wr() < 0.62;
          const keep = wr() < 0.025;          // a rare generator-lit window
          R(g, wx, wy, 2, 2, (lit && on) || (!lit && keep) ? (wr() < 0.2 ? '#fff0b0' : '#ffd060') : '#181628');
        }
      }
    }
  });
  const cityLit = paintCity(true), cityDark = paintCity(false);

  // Transmission tower (lattice) painted once
  const tower = (() => {
    const [c, g] = makeCanvas(46, 96);
    const col = '#2a2838', hi = '#5a5870';
    const legL = (y) => lerp(4, 19, y / 90), legR = (y) => lerp(41, 26, y / 90);
    for (let y = 8; y < 96; y++) { R(g, legL(96 - y) , y, 2, 1, col); R(g, legR(96 - y), y, 2, 1, col); }
    for (let y = 14; y < 92; y += 10) {
      const a = legL(96 - y), b = legR(96 - y), a2 = legL(96 - y - 10), b2 = legR(96 - y - 10);
      line(g, a, y, b, y, col);
      line(g, a, y, b2, y + 10, hi); line(g, b, y, a2, y + 10, col);
    }
    for (const ay of [8, 22]) { R(g, 0, ay, 46, 2, col); R(g, 0, ay + 2, 2, 4, '#8a8aa0'); R(g, 44, ay + 2, 2, 4, '#8a8aa0'); }
    R(g, 21, 0, 4, 8, col);
    return c;
  })();
  const pole = poleSprite('#4a3020');
  const coneSpr = cone(), barSpr = barricade();
  const lamp = sprite(['LLLLLL.', '.....P.', '.....P.', ...Array(24).fill('.....P.')], { L: '#4a4a58', P: '#3a3a48' }, { outline: INK });
  const tl = [0, 1].map(on => sprite([
    '.HHHHH.', 'HRRRRRH', 'HRrrrRH', 'HRRRRRH', 'HAAAAAH', `HA${on ? 'aa' : 'AA'}AAH`.slice(0, 7), 'HAAAAAH', 'HGGGGGH', 'HGgggGH', 'HGGGGGH', '.HHHHH.', '...P...', '...P...',
    ...Array(18).fill('...P...'),
  ], { H: '#2a2a32', R: '#3a1414', r: '#4a1a1a', A: on ? '#ffb020' : '#4a3010', a: on ? '#fff0a0' : '#5a3a14', G: '#143a1a', g: '#1a4a22', P: '#3a3a44' }, { outline: INK }));

  const ground = strip(W, H - GROUND_Y, (g, w, h) => {
    const ry = ROAD_Y - GROUND_Y;
    R(g, 0, 0, w, ry, '#4a4858');
    for (let x = 0; x < w; x += 12) R(g, x, 0, 1, ry, '#3a3848');
    R(g, 0, 0, w, 1, '#6a6880');
    R(g, 0, ry - 2, w, 2, '#7a7890');
    R(g, 0, ry, w, 24, '#2a2832');
    ditherFill(g, 0, ry, w, 24, '#34323e', 0.3);
    for (let x = 4; x < w; x += 22) R(g, x, ry + 11, 12, 2, '#c8a040');
    R(g, 0, ry + 22, w, 2, '#7a7890');
    R(g, 0, ry + 24, w, h - ry - 24, '#4a4858');
    for (let x = 6; x < w; x += 12) R(g, x, ry + 24, 1, h - ry - 24, '#3a3848');
    // Cracks in the asphalt
    const cr = rng(5);
    for (let i = 0; i < 10; i++) {
      let x = cr.int(0, w), y = ry + cr.int(3, 20);
      for (let k = 0; k < 8; k++) { R(g, x, y, 1, 1, '#18161e'); x += cr.int(-1, 2); y += cr.int(-1, 1); }
    }
  });

  const car = carSprite('blue');
  const wheels = wheelSprites();
  const fam = familySprites(env.family);

  const sparks = [];
  let nextArc = 1.0, arcT = -9;
  const TOWER_X = 236, END_X = 214, END_Y = ROAD_Y + 4;
  const blackout = (b) => 0.5 + ((400 - b.x) / 400) * 1.8;

  const scene = {
    flash: 0,
    update(dt, t) {
      if (t > nextArc) {
        arcT = t;
        nextArc = t + r.range(0.5, 1.6);
        const n = r.int(10, 22);
        for (let i = 0; i < n; i++) {
          const a = r.range(-Math.PI, 0), sp = r.range(20, 80);
          sparks.push({ x: END_X, y: END_Y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 160, life: r.range(0.3, 0.9),
            c: r.pick(['#ffffff', '#fff6a0', '#a8e0ff', '#ffd040']) });
        }
      }
      // Sparks bounce off the road
      for (const p of sparks) if (p.y > ROAD_Y + 10 && p.vy > 0) { p.vy *= -0.4; p.vx *= 0.7; }
      stepParticles(sparks, dt);
      const since = t - arcT;
      scene.flash = since < 0.08 ? 0.22 : 0;
    },

    draw(g, t) {
      const cam = 50 * (1 - easeOut(t / 2.4));
      g.drawImage(sky, 0, 0);
      const dark = ease((t - 0.6) / 2.2);
      for (const [sx, sy, ph] of stars) if (dark > ph && Math.sin(t * 2 + ph * 30) > -0.5) R(g, sx, sy, 1, 1, '#d8d8ff');
      disc(g, 60, 34, 7, '#f0e0c8'); disc(g, 58, 33, 2, '#d0c0a8'); disc(g, 62, 37, 1, '#d0c0a8');
      g.drawImage(back, Math.round(-cam * 0.2) - 40, GROUND_Y - 70);
      // Near skyline: lit, then each block cuts out (with a flicker) right→left
      const cx0 = Math.round(-cam * 0.4) - 40;
      g.drawImage(cityLit, cx0, GROUND_Y - 80);
      for (const b of blds) {
        const bt = blackout(b);
        const off = t > bt + 0.18 || (t > bt && Math.floor(t * 30) % 2 === 0);
        if (off) g.drawImage(cityDark, b.x, 0, b.w + 1, 80, cx0 + b.x, GROUND_Y - 80, b.w + 1, 80);
      }

      // Tower + wires; one live line snapped and dangling to the road
      const tx = TOWER_X - cam * 0.7;
      const px = 50 - cam * 0.7;
      draw(g, pole, px, GROUND_Y - 32);
      wire(g, px + 1, GROUND_Y - 32, tx, GROUND_Y - 88, 6, '#1a1824');
      wire(g, px + 10, GROUND_Y - 32, tx + 45, GROUND_Y - 88, 5, '#1a1824');
      wire(g, px + 1, GROUND_Y - 30, tx, GROUND_Y - 74, 8, '#1a1824');
      g.drawImage(tower, Math.round(tx), GROUND_Y - 96);
      wire(g, tx + 46, GROUND_Y - 88, W + 10, GROUND_Y - 92, 4, '#1a1824');
      wire(g, tx + 46, GROUND_Y - 74, W + 10, GROUND_Y - 78, 4, '#1a1824');

      g.drawImage(ground, 0, GROUND_Y);
      // Dead street lamps along the sidewalk
      for (let x = 20; x < W; x += 100) draw(g, lamp, x - cam * 0.9, GROUND_Y - 13);

      // Snapped line: hangs from the tower arm, end whipping on the road
      const sway = Math.sin(t * 3) * 3;
      const ex = END_X - cam * 0.7 + sway;
      wire(g, tx + 46, GROUND_Y - 74, ex, END_Y, -6, '#1a1824');
      wire(g, tx + 46, GROUND_Y - 73, ex + 1, END_Y, -6, '#2a2838');
      const since = t - arcT;
      if (since < 0.25) {
        disc(g, ex, END_Y, 6 - since * 16, '#a8e0ff');
        disc(g, ex, END_Y, 3, '#ffffff');
        // Jagged arc to the ground
        for (let i = 0; i < 3; i++) {
          let ax = ex, ay = END_Y;
          for (let k = 0; k < 6; k++) { const nx = ax + r.int(-3, 3), ny = ay + r.int(0, 2); line(g, ax, ay, nx, ny, '#e0f4ff'); ax = nx; ay = ny; }
        }
      }
      for (const p of sparks) R(g, p.x - cam * 0.7 + sway, p.y, 1, 1, p.c);

      // Dead traffic light blinking amber
      const blink = Math.floor(t * 1.6) % 2;
      draw(g, tl[blink], 92 - cam * 0.9, GROUND_Y - 22);
      if (blink) { R(g, 90 - cam * 0.9, GROUND_Y - 18, 1, 1, '#ffd060'); R(g, 100 - cam * 0.9, GROUND_Y - 18, 1, 1, '#ffd060'); }

      // Car rolls up and stops short of the barricade, headlights on
      const ck = clamp(t / 2.0, 0, 1);
      const carX = lerp(-50, 132, easeOut(ck)) - cam * 0.3;
      drawCar(g, car, wheels, carX, ROAD_Y, carX, { bounce: ck < 1 && Math.floor(t * 10) % 2 ? 1 : 0 });
      g.globalAlpha = 0.22;
      g.fillStyle = '#fff0b0';
      g.beginPath(); g.moveTo(carX + 40, ROAD_Y + 7); g.lineTo(carX + 110, ROAD_Y + 2); g.lineTo(carX + 110, ROAD_Y + 20); g.closePath(); g.fill();
      g.globalAlpha = 1;
      draw(g, barSpr, 188 - cam * 0.9, ROAD_Y + 9);
      for (const [cxp, cyp] of [[178, ROAD_Y + 14], [208, ROAD_Y + 12], [232, ROAD_Y + 16], [258, ROAD_Y + 13]]) draw(g, coneSpr, cxp - cam * 0.9, cyp);

      if (t > 2.1) drawFamily(g, fam, carX - 12 - (fam.length - 1) * 10, ROAD_Y + 18, 'idle', { t, gap: 10 });

      // The city goes dark: cool the whole frame as blocks cut out
      g.globalAlpha = 0.45 * dark;
      g.globalCompositeOperation = 'multiply';
      R(g, 0, 0, W, H, '#6a70b0');
      g.globalCompositeOperation = 'source-over';
      g.globalAlpha = 1;
      // Spark glow survives the grade
      if (since < 0.12) { g.globalAlpha = 0.5; disc(g, ex, END_Y, 10, '#c8ecff'); g.globalAlpha = 1; }
    },
  };
  return scene;
}

// ── Bridge collapse ──────────────────────────────────────────────────────────

function bridgeScene(env) {
  const r = rng(73);
  const RIVER_Y = 150;
  const DECK_Y = ROAD_Y + 2;
  const GAP0 = 214, GAP1 = 262;

  const sky = strip(W, 140, (g) => ditherBands(g, 0, 0, W, 140,
    ['#262c3c', '#343c50', '#4a5468', '#687088', '#8a90a4', '#a8a8b4']));
  const clouds = strip(480, 60, (g, w) => {
    const cr = rng(14);
    for (let i = 0; i < 40; i++) {
      const x = cr.range(0, w), y = cr.range(0, 40), rad = cr.range(6, 14);
      for (const dx of [0, -w, w]) drawPuff(g, x + dx, y, rad, '#2e3446', '#4a5268', 0.5);
    }
  });
  const pineS = silhouette(pineSprite(), '#24303a');
  const hills = strip(480, 60, (g, w, h) => {
    const tops = ridge(g, w, h, { amp: 16, base: 50, seed: 22, color: '#2a3a40', hi: '#4a5a60' });
    for (let x = 0; x < w; x += 9) draw(g, pineS, x, tops[x] - pineS.h + 4);
  });
  const hills2 = strip(480, 40, (g, w, h) => ridge(g, w, h, { amp: 10, base: 38, seed: 9, color: '#344a44', hi: '#5a7064', shade: '#2a3c38' }));

  const river = strip(W + 32, H - RIVER_Y, (g, w, h) => {
    ditherBands(g, 0, 0, w, h, ['#2a5a6a', '#1e4656', '#163444']);
    for (let y = 2; y < h; y += 5) for (let x = (y * 7) % 16; x < w; x += 16) { R(g, x, y, 6, 1, '#4a8a9a'); R(g, x + 2, y - 1, 3, 1, '#8ac0c8'); }
  });

  // Left bank: road on an embankment that drops to the river
  const bank = strip(W, H - GROUND_Y, (g, w, h) => {
    const ry = ROAD_Y - GROUND_Y;
    for (let x = 0; x < 200; x++) {
      const drop = x > 168 ? (x - 168) * 1.6 : 0;
      R(g, x, Math.max(0, ry + 24 + drop * 0.2), 1, h, '#4a5038');
      R(g, x, 0, 1, ry, '#5a6a3a');
    }
    ditherFill(g, 0, 0, 200, ry, '#4a5a30', 0.4);
    R(g, 0, ry, 172, 24, '#36343c');
    ditherFill(g, 0, ry, 172, 24, '#403e46', 0.3);
    R(g, 0, ry, 172, 1, '#6a6a72');
    for (let x = 4; x < 160; x += 22) R(g, x, ry + 11, 12, 2, '#d8b040');
    // Earth embankment face below the road, dropping to the water
    for (let x = 0; x < 200; x++) {
      const top = ry + 24, bot = x < 172 ? h : h - (x - 172) * 1.2;
      R(g, x, top, 1, bot - top, x % 7 === 0 ? '#3a3a2a' : '#4a4630');
      if ((x * 13) % 5 === 0) R(g, x, top + 4 + (x % 9), 2, 1, '#6a6448');
    }
  });

  const rail = (g, x0, x1, y) => {
    R(g, x0, y - 6, x1 - x0, 1, '#9a9aa4');
    for (let x = x0; x < x1; x += 6) R(g, x, y - 6, 1, 6, '#7a7a84');
  };
  const deck = (g, x0, x1, y) => {
    R(g, x0, y, x1 - x0, 7, '#8a8a92');
    R(g, x0, y, x1 - x0, 1, '#b0b0b8');
    R(g, x0, y + 6, x1 - x0, 1, '#5a5a62');
    R(g, x0, y + 1, x1 - x0, 1, '#4a4850');           // asphalt surface
    rail(g, x0, x1, y);
  };
  const car = carSprite('blue');
  const wheels = wheelSprites();
  const fam = familySprites(env.family);
  const barSpr = barricade();
  const sign = sprite(['YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY', ...Array(9).fill('Y.....................................Y'),
    'YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY', '...................P...................', '...................P...................',
    '...................P...................', '...................P...................'], { Y: '#ffb020', P: '#5a5a62' }, { outline: INK });

  const splash = [], dust = [], rain = [];
  let splashed = false;
  for (let i = 0; i < 80; i++) rain.push({ x: r.range(0, W), y: r.range(0, H), ph: r() });

  const FALL0 = 0.5, FALL1 = 1.4;
  const scene = {
    shake: 0,
    update(dt, t) {
      if (!splashed && t >= FALL1) {
        splashed = true;
        for (let i = 0; i < 46; i++) {
          splash.push({ x: r.range(GAP0 + 4, GAP1 - 4), y: RIVER_Y + 4, vx: r.range(-30, 30), vy: -r.range(30, 90), g: 180, life: r.range(0.6, 1.3) });
        }
        for (let i = 0; i < 10; i++) dust.push({ x: r.range(GAP0, GAP1), y: DECK_Y, vx: r.range(-8, 8), vy: -r.range(4, 12), life: 2.2, r0: r.range(3, 6) });
      }
      scene.shake = t > FALL1 && t < FALL1 + 0.5 ? 2 * (1 - (t - FALL1) / 0.5) : 0;
      for (const p of rain) { p.y += dt * 140; p.x -= dt * 30; if (p.y > H) { p.y -= H + 10; p.x = r.range(0, W + 30); } }
      stepParticles(splash, dt); stepParticles(dust, dt, 40);
    },

    draw(g, t) {
      const cam = 40 * (1 - easeOut(t / 2.4));
      g.drawImage(sky, 0, 0);
      drawWrap(g, clouds, t * 3, 0);
      g.drawImage(hills, Math.round(-cam * 0.2) - 80, 70);
      g.drawImage(hills2, Math.round(-cam * 0.4) - 80, 110);
      g.drawImage(river, -Math.floor((t * 12) % 16) - 8, RIVER_Y);

      const o = -cam * 0.8;
      // Piers
      for (const px of [196, 290]) { R(g, px + o, DECK_Y + 7, 8, H - DECK_Y, '#6a6a72'); R(g, px + o, DECK_Y + 7, 2, H - DECK_Y, '#8a8a92'); R(g, px + o - 1, RIVER_Y + 2, 10, 2, '#a8d0d8'); }
      // Fallen span: tilts, drops, and lands in the river
      const fk = ease((t - FALL0) / (FALL1 - FALL0));
      const fy = lerp(DECK_Y, RIVER_Y - 2, fk * fk);
      g.save();
      g.translate(GAP0 + o + 24, fy + 3);
      g.rotate(fk * 0.28);
      deck(g, -24, 24, -3);
      g.restore();
      // Intact deck sections with broken ends and dangling rebar
      deck(g, 168 + o, GAP0 + o, DECK_Y);
      deck(g, GAP1 + o, W + 20, DECK_Y);
      for (const [bx, dir] of [[GAP0, 1], [GAP1, -1]]) {
        for (let k = 0; k < 4; k++) {
          const len = 5 + ((k * 5) % 7);
          const sw = Math.sin(t * 2 + k) * 1.2;
          line(g, bx + o + dir * k * 2 - (dir < 0 ? 1 : 0), DECK_Y + 3 + (k % 2), bx + o + dir * (k * 2 + 2) + sw, DECK_Y + 3 + len, '#8a5a3a');
        }
        R(g, bx + o - (dir > 0 ? 2 : 0), DECK_Y, 2, 7, '#6a6a70');      // jagged broken face
        R(g, bx + o - (dir > 0 ? 1 : 1), DECK_Y + 2, 1, 2, '#3a3a40');
      }
      g.drawImage(bank, 0, GROUND_Y);
      // Foam around the wreck once it lands
      if (fk >= 1) for (let i = 0; i < 6; i++) R(g, GAP0 + o + 2 + i * 8 + Math.sin(t * 4 + i) * 2, RIVER_Y - 1, 4, 1, '#d8eef0');
      for (const p of splash) R(g, p.x + o, p.y, 1, 2, p.t / p.life < 0.5 ? '#e8f8ff' : '#8ac0d0');
      for (const p of dust) drawPuff(g, p.x + o, p.y, p.r0 + (p.t / p.life) * 6, '#8a8478', '#a8a294', 0.5);

      // Barricade + CLOSED sign at the bridgehead
      draw(g, barSpr, 160 + o, ROAD_Y + 9);
      draw(g, sign, 140 + o, ROAD_Y - 14);
      R(g, 141 + o, ROAD_Y - 13, 37, 9, '#ffb020');
      text(g, 'CLOSED', 159 + o, ROAD_Y - 12, { color: '#1a1418', align: 'center' });
      if (Math.floor(t * 2) % 2) { R(g, 160 + o, ROAD_Y + 8, 2, 2, '#fff0a0'); R(g, 174 + o, ROAD_Y + 8, 2, 2, '#fff0a0'); }

      // Car skids to a stop short of the bridge
      const ck = clamp((t - 0.6) / 1.8, 0, 1);
      const carX = lerp(-60, 104, easeOut(ck)) + o * 0.5;
      drawCar(g, car, wheels, carX, ROAD_Y, ck < 1 ? carX : 0);
      if (ck > 0.6 && ck < 1) drawPuff(g, carX + 4, ROAD_Y + 15, 3, '#6a6870', null, 0.5);
      if (t > 2.6) drawFamily(g, fam, carX - 10 - (fam.length - 1) * 10, ROAD_Y + 18, 'idle', { t, gap: 10 });

      for (const p of rain) R(g, p.x, p.y, 1, 3, '#8a98b0');
    },
  };
  return scene;
}
