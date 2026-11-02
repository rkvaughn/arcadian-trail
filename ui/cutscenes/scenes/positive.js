/**
 * Positive — a break in the clouds. Bright, Super-Mario-sunny sky with outlined
 * puffy clouds, rolling green hills, a turning wind turbine, bobbing flowers,
 * birds. Intro: the car rolls in, the family hops out and cheers.
 *
 * The right half of the frame holds a variant prop:
 *   friendly_settlement (default)  solar-roofed houses, garden rows, waving locals
 *   clear_skies                    a rainbow, a picnic blanket, a kite
 *   abandoned_station              an old gas station canopy with pumps
 *   supply_cache / refugee_stash   a stash of crates and jugs under a tarp, glinting
 *   relay_cache                    the stash plus a radio mast pulsing signal rings
 *   silent_array                   a row of dish antennas and solar panels
 */

import {
  W, H, R, rng, ease, easeOut, clamp, lerp, ditherBands, ditherFill, ridge, strip, drawWrap,
  stepParticles, draw, disc, sprite, painted, text,
} from '../kit.js';
import {
  INK, carSprite, wheelSprites, drawCar, familySprites, drawFamily, roundTreeSprite, cloudSprite,
  birdSprites, houseSprite,
} from '../sprites.js';
import { strangerSprites, drawStranger, roadStrip, glowSprite, drawGlow } from './social.js';

const ROAD_Y = 146;
const GRASS_Y = 126;

function propFor(id) {
  switch (id) {
    case 'clear_skies': return 'rainbow';
    case 'abandoned_station': return 'station';
    case 'supply_cache': case 'refugee_stash': return 'stash';
    case 'relay_cache': return 'relay';
    case 'silent_array': return 'array';
    default: return 'settlement';
  }
}

function solarPanel() {
  return painted(14, 6, (g) => {
    R(g, 0, 0, 14, 6, '#2a3a7a');
    for (let x = 0; x < 14; x += 3) R(g, x, 0, 1, 6, '#5a7ac8');
    R(g, 0, 2, 14, 1, '#4a6ab0');
    R(g, 1, 0, 2, 1, '#a8c8ff');
  }, INK);
}

function crateSprite() {
  return sprite([
    'hhhhhhhhhh', 'hWWWWWWWWw', 'hWwWWWWwWw', 'hWWwWWwWWw', 'hWWWwwWWWw',
    'hWWwWWwWWw', 'hWwWWWWwWw', 'hWWWWWWWWw', 'wwwwwwwwww',
  ], { W: '#b8823a', w: '#7a5020', h: '#e0aa5a' }, { outline: INK });
}

// Parabolic dish seen at an angle: a tilted ellipse (lit bowl face + shaded
// back rim), a feed arm to the receiver, and a pedestal.
function dishSprite() {
  return painted(18, 22, (g) => {
    const cx = 9, cy = 7, ang = -0.6, ca = Math.cos(ang), sa = Math.sin(ang);
    for (let y = 0; y < 15; y++) {
      for (let x = 0; x < 18; x++) {
        const dx = x - cx, dy = y - cy;
        const u = dx * ca + dy * sa, v = -dx * sa + dy * ca;
        const e = (u / 8.5) ** 2 + (v / 3.6) ** 2;
        if (e > 1) continue;
        R(g, x, y, 1, 1, v > 1.2 ? '#8a90a0' : e > 0.7 ? '#c0c4d0' : v < -1 ? '#ffffff' : '#e4e8f0');
      }
    }
    // Feed arm out of the bowl toward the sky, receiver at its tip
    const nx = sa, ny = -ca;            // bowl normal (up-left)
    for (let k = 1; k <= 6; k++) R(g, Math.round(cx + nx * k), Math.round(cy + ny * k), 1, 1, '#5a5a64');
    R(g, Math.round(cx + nx * 7) - 1, Math.round(cy + ny * 7) - 1, 2, 2, '#3a3a44');
    // Pedestal
    R(g, 8, 10, 2, 7, '#8a8a94'); R(g, 9, 10, 1, 7, '#6a6a74');
    R(g, 4, 17, 10, 2, '#7a7a84'); R(g, 3, 19, 12, 3, '#6a6a74'); R(g, 3, 19, 12, 1, '#9a9aa4');
  }, INK);
}

export function positiveScene(env) {
  const prop = propFor(env.eventId);
  const r = rng(1212);

  const sky = strip(W, 130, (g) => ditherBands(g, 0, 0, W, 130,
    prop === 'station' ? ['#4a86d8', '#6aa0e0', '#9ab8d8', '#d8c8a0', '#f0d8a0']
      : ['#3a7af0', '#5c94fc', '#74a8fc', '#98c0fc', '#c4dcfc']));
  const rainbow = prop === 'rainbow' ? strip(W, 120, (g) => {
    const cols = ['#ff5a5a', '#ffa040', '#ffe050', '#6ad060', '#4aa0ff', '#8a6ae0'];
    const img = g.createImageData(W, 120);
    for (let y = 0; y < 120; y++) {
      for (let x = 0; x < W; x++) {
        const d = Math.sqrt((x - 170) ** 2 + ((y - 132) * 1.15) ** 2);
        const band = Math.floor((128 - d) / 3);
        if (band < 0 || band >= 6) continue;
        const h = cols[band].replace('#', '');
        const k = (y * W + x) * 4;
        img.data[k] = parseInt(h.slice(0, 2), 16); img.data[k + 1] = parseInt(h.slice(2, 4), 16);
        img.data[k + 2] = parseInt(h.slice(4, 6), 16); img.data[k + 3] = 150;
      }
    }
    g.putImageData(img, 0, 0);
  }) : null;
  const farHills = strip(480, 60, (g, w, h) => ridge(g, w, h, { amp: 26, base: 58, seed: 17, color: '#58b0a0', hi: '#8ae0c8', shade: '#4a9a8c' }));
  const tree = roundTreeSprite();
  const midHills = strip(480, 46, (g, w, h) => {
    const tops = ridge(g, w, h, { amp: 14, base: 44, seed: 29, color: '#3aa040', hi: '#7ade6a', shade: '#2e8a36' });
    const tr = rng(2);
    for (let x = 10; x < w; x += tr.int(40, 80)) draw(g, tree, x, tops[Math.min(w - 1, x + 7)] - 12);
  });
  const ground = roadStrip('#7a6a5a', '#6a5a4a', '#9a8a6a', null, '#48b040', '#3a9834', 55, GRASS_Y);
  const clouds = [cloudSprite(true), cloudSprite(false), cloudSprite(true), cloudSprite(false)];
  const cloudPos = [[20, 14, 0.5], [110, 30, 0.8], [190, 8, 0.4], [270, 26, 0.7]];
  const birds = birdSprites('#2a2a3a');
  const flowers = Array.from({ length: 34 }, () => ({
    x: r.int(0, W), y: r.int(GRASS_Y + 3, ROAD_Y - 3), c: r.pick(['#ff5a8a', '#ffe040', '#ffffff', '#c080ff', '#ff8a3a']), p: r.range(0, 6),
  })).concat(Array.from({ length: 18 }, () => ({
    x: r.int(0, W), y: r.int(ROAD_Y + 24, H - 3), c: r.pick(['#ff5a8a', '#ffe040', '#ffffff', '#c080ff']), p: r.range(0, 6),
  })));
  const car = carSprite('blue');
  const wheels = wheelSprites();
  const fam = familySprites(env.family);
  const locals = [0, 1, 2].map(i => strangerSprites(i + 3));
  const house = houseSprite();
  const panel = solarPanel();
  const crate = crateSprite();
  const dish = dishSprite();
  const jug = sprite(['.c.', 'BBB', 'BBB', 'bBB'], { B: '#4a8ae0', b: '#2a5aa0', c: '#2a4a8a' }, { outline: INK });
  const blink = glowSprite(4, '#ff4040', 0.9);
  const sparkles = [];
  let sparkT = 0;
  const butterflies = Array.from({ length: 3 }, (_, i) => ({ x: 120 + i * 60, y: 132, p: r.range(0, 6), c: ['#ffe040', '#ff8ac0', '#ffffff'][i] }));

  // Turbine on the far hills
  const turb = { x: 92, y: 66 };
  const station = painted(110, 46, (g) => {
    R(g, 0, 0, 110, 6, '#c8c0b0'); R(g, 0, 6, 110, 3, '#a83a2a'); R(g, 0, 9, 110, 1, '#7a2a1e');   // faded canopy
    R(g, 10, 10, 4, 36, '#d8d0c0'); R(g, 96, 10, 4, 36, '#d8d0c0');
    R(g, 34, 28, 8, 18, '#c84a3a'); R(g, 35, 30, 6, 4, '#2a2a2a'); R(g, 64, 28, 8, 18, '#c84a3a'); R(g, 65, 30, 6, 4, '#2a2a2a');
    R(g, 32, 44, 12, 2, '#8a8478'); R(g, 62, 44, 12, 2, '#8a8478');
  }, INK);
  const kiosk = painted(40, 28, (g) => {
    R(g, 0, 4, 40, 24, '#d8c8a8'); R(g, 0, 0, 40, 5, '#8a7a6a');
    R(g, 4, 10, 14, 10, '#3a4a5a'); R(g, 6, 11, 4, 3, '#8ab0d0'); R(g, 12, 14, 5, 5, '#2a2a2a');   // cracked window
    R(g, 24, 10, 10, 18, '#6a4a2a');
  }, INK);

  return {
    update(dt, t) {
      if (prop === 'stash' || prop === 'relay' || prop === 'station') {
        sparkT += dt * 5;
        while (sparkT > 1) { sparkT--; sparkles.push({ x: r.range(214, 270), y: r.range(112, 140), vx: 0, vy: -4, life: 0.8 }); }
      }
      stepParticles(sparkles, dt);
    },
    draw(g, t) {
      const cam = -50 * (1 - easeOut(t / 2.4));
      g.drawImage(sky, 0, 0);
      // Sun with turning rays
      const sx = 268 + cam * 0.05, sy = 26;
      const ra = t * 0.6;
      for (let k = 0; k < 8; k++) {
        const a = ra + (k * Math.PI) / 4;
        for (let d = 15; d < 21; d++) R(g, sx + Math.cos(a) * d, sy + Math.sin(a) * d, 2, 2, '#fff2a0');
      }
      disc(g, sx, sy, 12, '#ffd040'); disc(g, sx, sy, 10, '#ffe870'); disc(g, sx - 3, sy - 3, 3, '#fffad8');
      if (rainbow) g.drawImage(rainbow, Math.round(cam * 0.1), 0);
      // Clouds drift
      clouds.forEach((c, i) => {
        const [x0, y, sp] = cloudPos[i];
        const x = ((x0 + t * sp * 6 + cam * 0.15) % (W + 60) + W + 60) % (W + 60) - 40;
        draw(g, c, x, y);
      });
      g.drawImage(farHills, Math.round(cam * 0.25) - 40, 64);
      // Wind turbine
      const tx = turb.x + cam * 0.25, ty = turb.y;
      R(g, tx - 1, ty, 3, 46, '#f0f0f4'); R(g, tx + 1, ty, 1, 46, '#c0c0c8');
      for (let k = 0; k < 3; k++) {
        const a = t * 2.4 + (k * Math.PI * 2) / 3;
        for (let d = 2; d < 15; d++) R(g, tx + Math.cos(a) * d, ty + Math.sin(a) * d, 1, 1, '#ffffff');
      }
      R(g, tx - 1, ty - 1, 3, 3, '#c8c8d0');
      g.drawImage(midHills, Math.round(cam * 0.5) - 40, 84);
      g.drawImage(ground, 0, GRASS_Y);
      // Birds
      for (let i = 0; i < 4; i++) {
        const bx = ((i * 83 + t * 18) % (W + 30)) - 15, by = 44 + i * 9 + Math.sin(t * 2 + i) * 3;
        draw(g, birds[Math.floor(t * 5 + i) % 2], bx, by);
      }

      // Variant prop
      const px = cam * 0.9;
      if (prop === 'settlement') {
        draw(g, house, 176 + px, 104);
        draw(g, house, 236 + px, 108);
        draw(g, panel, 188 + px, 106); draw(g, panel, 248 + px, 110);
        // Garden rows and picket fence
        for (let row = 0; row < 3; row++) {
          for (let x = 150; x < 300; x += 4) {
            R(g, x + px, 128 + row * 4, 3, 2, '#2a7a2a');
            if ((x + row * 3) % 12 === 0) R(g, x + 1 + px, 128 + row * 4, 1, 1, '#e83a2a');
          }
        }
        for (let x = 148; x < 302; x += 4) { R(g, x + px, 138, 2, 5, '#f8f8f0'); R(g, x + px, 138, 1, 1, '#ffffff'); }
        R(g, 148 + px, 140, 154, 1, '#d8d8d0');
        locals.forEach((l, i) => drawStranger(g, l, 214 + i * 26 + px, 128, 'wave', t + i * 0.4, true));
      } else if (prop === 'rainbow') {
        // Picnic blanket and a kite on a string
        for (let y = 0; y < 6; y++) for (let x = 0; x < 24; x += 3) R(g, 220 + x + px, 134 + y, 3, 1, ((x / 3 + y) % 2) ? '#e83a3a' : '#f8f0f0');
        R(g, 226 + px, 131, 5, 3, '#c8903a'); R(g, 227 + px, 130, 3, 1, '#a8702a');
        const kx = 250 + Math.sin(t * 1.1) * 8 + px, ky = 52 + Math.sin(t * 1.7) * 4;
        for (let k = 0; k <= 30; k++) R(g, lerp(kx, 236 + px, k / 30), lerp(ky + 6, 132, k / 30) + Math.sin(k * 0.3 + t * 2) * 1.5, 1, 1, '#f0f0f0');
        R(g, kx - 3, ky, 7, 7, '#ff5a8a'); R(g, kx - 2, ky + 1, 5, 5, '#ffe040'); R(g, kx, ky - 1, 1, 9, '#2a2a2a');
        for (let k = 0; k < 4; k++) R(g, kx + Math.sin(t * 6 + k) * 2, ky + 8 + k * 3, 2, 1, ['#ff5a5a', '#4aa0ff'][k % 2]);
        locals.slice(0, 2).forEach((l, i) => drawStranger(g, l, 214 + i * 30 + px, 140, 'wave', t + i, true));
      } else if (prop === 'station') {
        draw(g, kiosk, 254 + px, 106);
        draw(g, station, 170 + px, 94);
        R(g, 156 + px, 80, 2, 54, '#6a6a6a');
        R(g, 146 + px, 72, 22, 12, '#e8e0c8'); text(g, 'GAS', 157 + px, 75, { align: 'center', color: '#a83a2a' });
        for (let i = 0; i < 18; i++) R(g, 150 + i * 9 + px, 136 + (i % 3), 1, 3, '#5a9a2a');
        draw(g, crate, 224 + px, 128); draw(g, jug, 238 + px, 133);
      } else if (prop === 'stash' || prop === 'relay') {
        // Tarp lean-to over a crate stash
        for (let y = 0; y < 14; y++) R(g, 206 + y + px, 112 + y, 64 - y * 2, 1, y % 3 ? '#3a7aa8' : '#2a5a88');
        R(g, 206 + px, 112, 2, 30, '#6a4a2a'); R(g, 268 + px, 112, 2, 30, '#6a4a2a');
        draw(g, crate, 214 + px, 131); draw(g, crate, 226 + px, 131); draw(g, crate, 220 + px, 122);
        draw(g, jug, 240 + px, 136); draw(g, jug, 246 + px, 136); draw(g, jug, 252 + px, 136);
        if (prop === 'relay') {
          const mx = 288 + px;
          R(g, mx, 62, 1, 80, '#8a8a94'); R(g, mx + 4, 62, 1, 80, '#8a8a94');
          for (let y = 64; y < 142; y += 6) { R(g, mx, y, 5, 1, '#6a6a74'); R(g, mx + 2, y + 3, 1, 1, '#6a6a74'); }
          const on = Math.floor(t * 2) % 2 === 0;
          if (on) drawGlow(g, mx + 2, 60, blink);
          R(g, mx + 1, 59, 3, 2, on ? '#ff4040' : '#7a2020');
          for (let k = 0; k < 3; k++) {
            const rad = ((t * 14 + k * 10) % 30) + 4;
            for (let a = -0.9; a <= 0.9; a += 0.12) {
              R(g, mx + 2 + Math.cos(a - Math.PI / 2) * rad, 60 + Math.sin(a - Math.PI / 2) * rad * 0.6, 1, 1, rad < 20 ? '#ffffff' : '#c8e0ff');
            }
          }
        }
      } else if (prop === 'array') {
        for (let i = 0; i < 4; i++) {
          const x = 168 + i * 34 + px;
          draw(g, dish, x, 104 + (i % 2) * 6);
          const on = Math.floor(t * 2 + i) % 3 === 0;
          R(g, x + 8, 103 + (i % 2) * 6, 2, 2, on ? '#40ff60' : '#1a5a2a');
        }
        for (let i = 0; i < 5; i++) draw(g, panel, 166 + i * 28 + px, 132);
        R(g, 166 + px, 140, 140, 1, '#2a2a2a');
      }
      for (const s of sparkles) {
        const k = s.t / s.life;
        const c = k < 0.5 ? '#ffffff' : '#fff0a0';
        R(g, s.x + px, s.y, 1, 1, c);
        if (k > 0.25 && k < 0.6) { R(g, s.x - 1 + px, s.y, 3, 1, c); R(g, s.x + px, s.y - 1, 1, 3, c); }
      }
      // Flowers bob in the breeze
      for (const f of flowers) {
        const bob = Math.round(Math.sin(t * 2.5 + f.p) * 0.6);
        R(g, f.x, f.y + 1, 1, 2, '#2a7a2a');
        R(g, f.x - 1 + bob, f.y - 1, 3, 1, f.c); R(g, f.x + bob, f.y - 2, 1, 3, f.c);
        R(g, f.x + bob, f.y - 1, 1, 1, '#ffe080');
      }
      for (const b of butterflies) {
        const bx = b.x + Math.sin(t * 0.9 + b.p) * 30 + px, by = b.y + Math.sin(t * 2.3 + b.p) * 6;
        const open = Math.floor(t * 10 + b.p) % 2;
        R(g, bx, by, 1, 2, '#2a2a2a');
        if (open) { R(g, bx - 2, by - 1, 2, 2, b.c); R(g, bx + 1, by - 1, 2, 2, b.c); } else { R(g, bx - 1, by - 1, 1, 2, b.c); R(g, bx + 1, by - 1, 1, 2, b.c); }
      }

      // Car rolls in; family hops out and cheers
      const ct = clamp(t / 1.8, 0, 1);
      const cx = lerp(-50, 34, easeOut(ct)) + cam * 0.2;
      const bounce = ct < 1 && Math.floor(t * 10) % 2 ? 1 : 0;
      drawCar(g, car, wheels, cx, ROAD_Y, cx, { bounce });
      fam.forEach((m, i) => {
        const t0 = 1.9 + i * 0.25;
        if (t < t0) return;
        const start = cx + 26, target = cx + 50 + i * 11;
        const u = t - t0;
        const x = Math.min(target, start + u * 34);
        const arrived = x >= target;
        // hop out of the car: a little arc in the first 0.3 s
        const hop = u < 0.3 ? Math.round(Math.sin((u / 0.3) * Math.PI) * 5) : 0;
        drawFamily(g, [m], x, ROAD_Y + 19 - hop + (i % 2), arrived ? 'cheer' : 'walk', { t: t + i * 0.3 });
      });
    },
  };
}
