/**
 * Extreme heat — a bleached sky, a huge pulsing sun, mesas wobbling in the
 * heat shimmer, cracked earth, and a mirage pool on the road. The family
 * shelters under a tarp strung off the car while vultures circle.
 * Intro: the glare fades in as the camera pans, and the tarp unfurls.
 *
 * Variants:
 *   drought    — a dry, cracked reservoir with a stranded boat, dead crop
 *                rows, and dust devils wandering across.
 *   dust_storm — a brown haboob wall rolls in from the left, the sun dims to a
 *                flat disc, and dust streams across the frame.
 */

import {
  W, H, R, rng, ease, easeOut, clamp, lerp, ditherBands, ditherFill, ridge, strip, drawWrap,
  drawPuff, stepParticles, draw, disc, sprite,
} from '../kit.js';
import {
  INK, carSprite, wheelSprites, drawCar, familySprites, drawFamily, cactusSprite, deadTreeSprite, birdSprites,
} from '../sprites.js';

const ROAD_Y = 142;
const GROUND_Y = 118;

// Flat-topped mesas with strata stripes, seamless across `w`
function mesas(g, w, h, seed, body, lit, strata, shade) {
  const r = rng(seed);
  let x = -10;
  while (x < w) {
    const mw = r.int(36, 80), mh = r.int(14, 34), top = h - mh;
    const lean = r.int(3, 8);
    for (let i = 0; i < mw; i++) {
      const edge = Math.min(i, mw - 1 - i);
      const yy = top + Math.max(0, lean - edge) * 2;
      for (const dx of [0, w]) {
        const px = x + i - dx;
        if (px < 0 || px >= w) continue;
        R(g, px, yy, 1, h - yy, body);
        R(g, px, yy, 1, 1, lit);
        for (let s = yy + 4; s < h; s += 5) R(g, px, s, 1, 1, strata);
        if (i > mw * 0.6) for (let s = yy + 1; s < h; s += 2) if ((px + s) % 2) R(g, px, s, 1, 1, shade);
      }
    }
    x += mw + r.int(10, 40);
  }
}

// Cracked earth: branching random-walk cracks
function cracks(g, x0, y0, w, h, n, seed, color, hi) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    let x = r.range(x0, x0 + w), y = r.range(y0, y0 + h);
    let dir = r.range(0, Math.PI * 2);
    for (let k = 0; k < r.int(6, 16); k++) {
      R(g, x, y, 1, 1, color);
      if (hi) R(g, x, y + 1, 1, 1, hi);
      dir += r.range(-0.9, 0.9);
      x += Math.cos(dir) * 1.6; y += Math.sin(dir) * 0.8;
      if (y < y0 || y > y0 + h) break;
    }
  }
}

export function heatScene(env) {
  const drought = env.eventId === 'drought';
  const dust = env.eventId === 'dust_storm';
  const r = rng(53);

  const skyCols = dust
    ? ['#6a4024', '#8a5630', '#a8703c', '#c08a4c', '#d0a060']
    : drought
      ? ['#cfe0e4', '#e8ecd8', '#f4e4b0', '#f0cc80', '#e4ac60']
      : ['#fffbe8', '#fff4c0', '#ffe48a', '#ffc858', '#f8a440', '#f08a38'];
  const sky = strip(W, 124, (g) => ditherBands(g, 0, 0, W, 124, skyCols));

  // Sun glare halo (dithered rings), drawn around the sun
  const halo = strip(121, 121, (g) => {
    for (let y = 0; y < 121; y++) {
      for (let x = 0; x < 121; x++) {
        const d = Math.hypot(x - 60, y - 60);
        if (d < 22 || d > 60) continue;
        const k = 1 - (d - 22) / 38;
        if (((x * 7 + y * 13) % 16) / 16 < k * 0.6) R(g, x, y, 1, 1, '#fffef0');
      }
    }
  });

  const far = strip(480, 46, (g, w, h) => mesas(g, w, h, 11,
    dust ? '#8a5a38' : '#d89466', dust ? '#a87048' : '#f4c08a', dust ? '#7a4a30' : '#c47a50', dust ? '#7a4a30' : '#b8704a'));
  const near = strip(480, 34, (g, w, h) => {
    ridge(g, w, h, { amp: 10, base: 32, seed: 4, color: dust ? '#9a6838' : '#d4a060', hi: dust ? '#b8844c' : '#ecc888' });
    mesas(g, w, h, 29, dust ? '#7a4c2e' : '#b8743e', dust ? '#9a643c' : '#e09a5c', dust ? '#6a4026' : '#9a5a30', dust ? '#6a4026' : '#9a5a30');
  });

  const cactus = cactusSprite();
  const snag = deadTreeSprite('#5a3a22', '#8a6038');

  const ground = strip(W, H - GROUND_Y, (g, w, h) => {
    R(g, 0, 0, w, h, dust ? '#a07040' : '#d8a460');
    ditherFill(g, 0, 0, w, 8, dust ? '#8a5c34' : '#c48c4c', 0.5);
    cracks(g, 0, 2, w, ROAD_Y - GROUND_Y - 4, 70, 3, dust ? '#6a4426' : '#9a6630', dust ? '#b88a58' : '#ecc490');
    if (drought) {
      // Dry reservoir: a sunken basin of cracked clay below the old waterline
      R(g, 150, 3, 170, 19, '#c49a68');
      ditherFill(g, 150, 3, 170, 6, '#a87c50', 0.5);
      for (let i = 0; i < 8; i++) R(g, 150 - i, 3 + i * 2, 1, 2, '#8a6038');   // sloped near bank
      cracks(g, 152, 9, 166, 12, 110, 41, '#7a4e2c', '#e4c494');
      R(g, 150, 3, 170, 1, '#7a5634');
      // Old waterline stains on the bank
      R(g, 150, 2, 170, 1, '#e8d0a8'); R(g, 152, 3, 166, 1, '#a07850');
      const boat = sprite([
        '......M.........', '......M.........', '.....MMM........', '......M.........',
        'HHHHHHHHHHHHHHH.', '.hHHHHHHHHHHHh..', '..hhhhhhhhhhh...',
      ], { M: '#7a6a5a', H: '#e8e0d0', h: '#9aa0a8' }, { outline: INK });
      draw(g, boat, 228, 12);
      // Dead crop rows on the left
      for (let row = 0; row < 3; row++) {
        for (let px = 6 + row * 3; px < 140; px += 6) {
          const y = 6 + row * 6;
          R(g, px, y, 1, 4, '#8a6a30'); R(g, px - 1, y, 1, 1, '#a8884a'); R(g, px + 1, y + 1, 1, 1, '#a8884a');
        }
      }
    } else {
      for (let i = 0; i < 6; i++) draw(g, i % 2 ? cactus : snag, 10 + i * 56 + (i % 3) * 7, i % 2 ? 5 : 9);
    }
    // Road: sun-bleached asphalt, faded paint
    const ry = ROAD_Y - GROUND_Y;
    R(g, 0, ry, w, 24, dust ? '#5a4a40' : '#7a6a60');
    ditherFill(g, 0, ry, w, 24, dust ? '#665448' : '#8a7a6c', 0.35);
    R(g, 0, ry, w, 1, dust ? '#3a2c24' : '#5a4a40');
    R(g, 0, ry + 2, w, 1, '#c8b890');
    R(g, 0, ry + 22, w, 1, '#a89878');
    for (let x = 4; x < w; x += 22) { R(g, x, ry + 11, 12, 2, '#e8d090'); ditherFill(g, x, ry + 11, 12, 2, '#a89060', 0.4); }
    // Verge below the road: pebbles and dry tufts
    const gr = rng(9);
    for (let i = 0; i < 60; i++) {
      const x = gr.int(0, w), y = gr.int(ry + 26, h - 2);
      if (i % 3) { R(g, x, y, 2, 1, dust ? '#7a5434' : '#a87a48'); R(g, x, y - 1, 1, 1, dust ? '#b88a5a' : '#f0d0a0'); }
      else { R(g, x, y, 1, 2, '#9a7a3a'); R(g, x - 1, y - 1, 1, 1, '#c0a058'); R(g, x + 1, y - 1, 1, 1, '#c0a058'); }
    }
  });

  // Dust storm overlays: the haboob body and a fine haze, prerendered
  const haboob = dust ? strip(240, 190, (g, w, h) => {
    const hr = rng(77);
    R(g, 0, 40, w - 60, h - 40, '#6a3e24');
    for (let i = 0; i < 120; i++) {
      const y = hr.range(14, h - 6);
      const x = hr.range(0, w - 30 - (h - y) * 0.12);
      drawPuff(g, x, y, hr.range(10, 24), y < 70 ? '#8a5432' : '#6e4026', '#c08850', 0.4);
    }
    // Billowing lit crest along the leading edge
    for (let y = 16; y < h; y += 9) drawPuff(g, w - 30 - (h - y) * 0.12, y, hr.range(8, 13), '#9a6038', '#d09a60', 0.4);
  }) : null;
  const haze = dust ? strip(W, H, (g) => ditherFill(g, 0, 0, W, H, '#a87448', 0.3)) : null;

  const car = carSprite('blue');
  const wheels = wheelSprites();
  const fam = familySprites(env.family);
  const birds = birdSprites('#2a1a14');
  const tarpSpr = { main: '#2a7ad8', dark: '#1a5aa8', stripe: '#e8e0c8' };

  const sweat = [], devils = [], grit = [];
  let sweatT = 0, gritT = 0;
  if (drought) for (let i = 0; i < 2; i++) devils.push({ x0: 40 + i * 150, ph: i * 2.3, parts: [] });

  const CAR_X = 182;
  const scene = {
    shimmer: { y0: 64, y1: ROAD_Y + 6, amp: dust ? 0.6 : 1.6 },

    update(dt, t) {
      // Sweat drops from the family under the tarp
      sweatT += dt * 2.2;
      while (sweatT > 1) {
        sweatT--;
        const i = r.int(0, fam.length - 1);
        sweat.push({ x: CAR_X - 54 + i * 11 + r.int(1, 5), y: ROAD_Y + 17 - fam[i].h + 1, vx: 0, vy: 6, g: 60, life: 0.7 });
      }
      for (const d of devils) {
        d.x = d.x0 + Math.sin(t * 0.35 + d.ph) * 60;
        if (r() < dt * 40) d.parts.push({ a: r.range(0, 6.28), y: 0, life: r.range(1, 2), t: 0 });
        for (const p of d.parts) { p.t += dt; p.y += dt * 18; p.a += dt * 9; }
        d.parts = d.parts.filter(p => p.t < p.life);
      }
      gritT += dt * (dust ? 120 : 10);
      while (gritT > 1) {
        gritT--;
        grit.push({ x: dust ? -6 : r.range(0, W), y: dust ? r.range(20, H) : r.range(124, H), vx: dust ? r.range(90, 180) : r.range(10, 20),
          vy: r.range(-6, 6), life: dust ? 6 : 2, c: dust ? (r() < 0.5 ? '#c09060' : '#8a5a34') : '#f0d8a8' });
      }
      stepParticles(sweat, dt); stepParticles(grit, dt);
    },

    draw(g, t) {
      const cam = 50 * (1 - easeOut(t / 2.4));
      g.drawImage(sky, 0, 0);

      // The sun: huge, pulsing, with slowly turning rays (dimmed disc in dust)
      const sx = 72 - cam * 0.05, sy = 40;
      if (dust) {
        disc(g, sx, sy, 14, '#e8b878'); disc(g, sx, sy, 12, '#f4cc90');
      } else {
        g.drawImage(halo, Math.round(sx - 60), Math.round(sy - 60));
        const pulse = Math.floor(t * 3) % 2;
        const rot = t * 0.25;
        for (let i = 0; i < 16; i++) {
          const a = rot + (i / 16) * Math.PI * 2;
          const len = (i % 2 ? 9 : 14) + pulse;
          for (let k = 0; k < len; k++) {
            const d = 24 + k;
            R(g, sx + Math.cos(a) * d, sy + Math.sin(a) * d, i % 2 ? 1 : 2, i % 2 ? 1 : 2, k < len / 2 ? '#fff6c0' : '#ffe890');
          }
        }
        disc(g, sx, sy, 20 + pulse, '#fff0a0');
        disc(g, sx, sy, 17 + pulse, '#fffad8');
        disc(g, sx - 4, sy - 4, 7, '#ffffff');
      }

      // Vultures circling
      if (!dust) {
        for (let i = 0; i < 3; i++) {
          const a = t * 0.6 + i * 2.1;
          const bx = 220 + Math.cos(a) * (34 + i * 6) - cam * 0.2, by = 34 + Math.sin(a) * 9 + i * 4;
          draw(g, birds[Math.floor(t * 3 + i) % 2], bx, by, Math.cos(a) > 0);
        }
      }

      g.drawImage(far, Math.round(-cam * 0.3) - 80, GROUND_Y - 44);
      g.drawImage(near, Math.round(-cam * 0.6) - 80, GROUND_Y - 30);
      g.drawImage(ground, 0, GROUND_Y);

      if (dust) {
        // Haboob wall rolls in from the left behind the road, then creeps
        const front = lerp(-40, 150, easeOut(t / 3.6)) + Math.sin(t * 0.8) * 3;
        g.drawImage(haboob, Math.round(front - 240), -12);
        R(g, 0, 30, Math.max(0, front - 238), ROAD_Y - 30, '#6a3e24');
      }
      // Dust devils over the reservoir
      for (const d of devils) {
        for (const p of d.parts) {
          const rad = 2 + p.y * 0.35;
          R(g, d.x + Math.cos(p.a) * rad - cam, GROUND_Y + 14 - p.y, 1, 1, p.y > 20 ? '#e0c49a' : '#b88a5a');
        }
      }

      // Mirage pool on the road, flickering sky-blue reflections
      for (let y = 0; y < 6; y++) {
        const wob = Math.round(Math.sin(t * 5 + y * 1.7) * 3);
        const len = 46 - Math.abs(y - 2.5) * 8;
        const x0 = 262 + wob - len / 2 - cam;
        for (let x = 0; x < len; x += 2) {
          if ((x + y + Math.floor(t * 6)) % 5 === 0) continue;
          R(g, x0 + x, ROAD_Y + 3 + y, 2, 1, (y + x) % 4 ? '#b8dcf0' : '#f0f8ff');
        }
      }

      // Car parked; tarp unfurls off the roof rack toward two poles
      const cx = CAR_X - cam;
      drawCar(g, car, wheels, cx, ROAD_Y, 0);
      const unf = ease((t - 0.8) / 1.4);
      const poleX = cx - 62;
      const tipX = lerp(cx + 6, poleX, unf), tipY = lerp(ROAD_Y + 1, ROAD_Y - 6, unf);
      if (unf > 0.98) {
        R(g, poleX - 1, ROAD_Y - 6, 2, 24, '#6a4a2a'); R(g, poleX - 1, ROAD_Y - 6, 1, 24, '#9a7040');
        R(g, poleX - 3, ROAD_Y + 17, 6, 1, '#3a2a1a');
      }
      // Shade under the tarp
      if (unf > 0.2) {
        g.globalCompositeOperation = 'multiply';
        R(g, tipX + 2, ROAD_Y + 12, cx + 4 - tipX, 7, '#b89a80');
        g.globalCompositeOperation = 'source-over';
      }
      // Tarp: sagging cloth between roof (x = cx+6, y = ROAD_Y+1) and pole tip
      const span = cx + 6 - tipX;
      for (let i = 0; i <= span; i++) {
        const k = i / Math.max(1, span);
        const sag = Math.sin(k * Math.PI) * 3 * unf + Math.sin(t * 6 + i * 0.4) * 0.6 * unf;
        const y = Math.round(lerp(tipY, ROAD_Y + 1, k) + sag);
        R(g, tipX + i, y - 1, 1, 1, INK);
        R(g, tipX + i, y, 1, 2, i % 8 < 4 ? tarpSpr.main : tarpSpr.stripe);
        R(g, tipX + i, y + 2, 1, 1, tarpSpr.dark);
        R(g, tipX + i, y + 3, 1, 1, INK);
      }

      // Family in the shade (fanning, glistening)
      drawFamily(g, fam, cx - 54, ROAD_Y + 18, 'idle', { t, gap: 11 });
      for (const s of sweat) R(g, s.x - cam, s.y, 1, 1, '#a8e0ff');

      if (dust) {
        // Haboob wall rolls in from the left during the intro, then creeps
        g.globalAlpha = clamp((t - 0.5) / 2.5, 0, 1);
        g.drawImage(haze, 0, 0);
        g.globalAlpha = 1;
      }
      for (const p of grit) R(g, p.x, p.y, dust ? 2 : 1, 1, p.c);
      // Glare fades out over the intro
      if (!dust && t < 1.6) {
        g.globalAlpha = 1 - ease(t / 1.6);
        R(g, 0, 0, W, H, '#fffef0');
        g.globalAlpha = 1;
      }
    },
  };
  return scene;
}
