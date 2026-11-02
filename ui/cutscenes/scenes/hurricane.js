/**
 * Hurricane — spiral cloud bands wheel over a churning sea. Rain drives
 * sideways, palms whip in the gusts, storm-surge waves slam the seawall and
 * throw spray across the road, shingles and a sign tumble past, and the family
 * dashes from the car to a shuttered house. Intro: the camera pans in as the
 * first surge wave rears up behind the wall; gusts shake the camera.
 */

import {
  W, H, R, rng, ease, easeOut, clamp, lerp, ditherBands, ditherFill, strip, drawWrap,
  drawPuff, stepParticles, draw, silhouette, bolt, sprite, painted,
} from '../kit.js';
import { INK, carSprite, wheelSprites, drawCar, familySprites, drawFamily, palmSprite } from '../sprites.js';

const SEA_Y = 98;
const WALL_Y = 124;
const ROAD_Y = 136;
const HOUSE_WINDOWS = [[11, 16], [42, 16], [11, 27], [42, 27], [26, 16]];
const EYE = [380, -24];
const ARC = Math.PI * 0.62;     // angular span of the visible band arcs        // storm centre, off-screen top-right

function rainTile(w, h, n, len, slope, color, seed) {
  return strip(w, h, (g) => {
    const r = rng(seed);
    for (let i = 0; i < n; i++) {
      const x = r.int(0, w - 1), y = r.int(0, h - 1);
      for (let k = 0; k < len; k++) R(g, (x + Math.round(k * slope) + w) % w, (y + k) % h, 1, 1, color);
    }
  });
}

function tile2(g, layer, ox, oy) {
  const lw = layer.width, lh = layer.height;
  const sx = -(((Math.round(ox) % lw) + lw) % lw);
  const sy = -(((Math.round(oy) % lh) + lh) % lh);
  for (let y = sy; y < H; y += lh) for (let x = sx; x < W; x += lw) g.drawImage(layer, x, y);
}

/** Gust strength 0..1: slow swell plus sharp peaks. */
function gustAt(t) {
  const a = Math.max(0, Math.sin(t * 0.9 - 1.2));
  return clamp(a * a * 1.2 + 0.15 * Math.sin(t * 5.3), 0, 1);
}

export function hurricaneScene(env) {
  const r = rng(73);

  const sky = strip(W, 120, (g) => ditherBands(g, 0, 0, W, 120,
    ['#061012', '#0c1c20', '#142c2e', '#1c3c3a', '#284c46', '#3a6058']));
  const sea = strip(W, WALL_Y - SEA_Y + 4, (g, w, h) => {
    ditherBands(g, 0, 0, w, h, ['#20403e', '#18363a', '#122c30', '#0e2428']);
    const sr = rng(3);
    for (let i = 0; i < 60; i++) R(g, sr.int(0, w), sr.int(1, h - 1), sr.int(2, 7), 1, '#2e5654');
  });
  const swell = strip(W + 24, 5, (g) => {
    for (let x = 0; x < W + 24; x += 24) {
      R(g, x + 3, 0, 8, 1, '#c8e4e0'); R(g, x + 1, 1, 4, 1, '#c8e4e0'); R(g, x + 9, 1, 6, 1, '#6a9a94');
      R(g, x, 2, 2, 1, '#6a9a94'); R(g, x + 13, 2, 8, 1, '#3e6a66'); R(g, x + 18, 3, 6, 1, '#2a504c');
    }
  });
  const seawall = strip(W, ROAD_Y - WALL_Y, (g, w, h) => {
    R(g, 0, 0, w, h, '#5a6464'); R(g, 0, 0, w, 2, '#8a9694'); R(g, 0, h - 1, w, 1, '#2a3232');
    for (let x = 0; x < w; x += 20) R(g, x, 2, 1, h - 3, '#404a4a');
    ditherFill(g, 0, 2, w, h - 3, '#4a5454', 0.3);
  });
  const road = strip(W, H - ROAD_Y, (g, w, h) => {
    R(g, 0, 0, w, h, '#1e2426');
    ditherFill(g, 0, 0, w, h, '#283032', 0.3);
    R(g, 0, 0, w, 1, '#3a4446');
    for (let x = 4; x < w; x += 26) R(g, x, 15, 14, 1, '#c8a838');
    // Wet-road sheen and puddles
    const pr = rng(11);
    for (let i = 0; i < 14; i++) {
      const x = pr.int(0, w), y = pr.int(4, h - 4), pw = pr.int(8, 22);
      R(g, x, y, pw, 2, '#2c3c40'); R(g, x + 2, y, pw - 6, 1, '#4a6266');
    }
    R(g, 0, 30, w, h - 30, '#2a3a2a'); ditherFill(g, 0, 30, w, h - 30, '#1e2e1e', 0.4);
    R(g, 0, 30, w, 1, '#8a9694');
  });
  // Rotating spiral cloud bands: precompute puffs in polar coords
  const bandPuffs = [];
  for (let b = 0; b < 7; b++) {
    for (let a = 0; a < ARC; a += 0.05) {
      bandPuffs.push({ a, b, rad: 70 + b * 36 + r.range(-4, 4), size: r.range(7, 12) - b * 0.3, dark: b % 2 });
    }
  }
  const rainA = rainTile(160, 90, 60, 3, 3, '#4a6a70', 7);
  const rainB = rainTile(160, 90, 34, 5, 3.4, '#9ab8bc', 8);

  const crowns = [palmSprite(0), palmSprite(1)];
  // Two-storey beach house on stilts (56×46)
  const house = painted(56, 46, (g) => {
    R(g, 6, 12, 46, 26, '#c8c0a8');
    for (let y = 14; y < 38; y += 3) R(g, 6, y, 46, 1, '#a8a088');
    R(g, 49, 12, 3, 26, '#9a927c');
    // Hip roof
    for (let k = 0; k < 12; k++) R(g, 2 + k, k, 54 - k * 2, 1, k < 2 ? '#5a6a7a' : '#3a4a5a');
    R(g, 0, 11, 58, 2, '#2a3440');
    // Windows (shutters are drawn live on top)
    for (const [wx, wy] of HOUSE_WINDOWS) { R(g, wx, wy, 6, 7, '#2a2028'); R(g, wx + 1, wy + 1, 4, 5, '#ffd870'); R(g, wx + 1, wy + 3, 4, 1, '#c8a040'); }
    // Door and stairs, stilts
    R(g, 25, 28, 8, 10, '#5a3a20'); R(g, 31, 33, 1, 1, '#ffd870');
    for (const x of [7, 18, 38, 49]) R(g, x, 38, 3, 8, '#6a5a44');
    for (let k = 0; k < 4; k++) R(g, 22 - k * 3, 38 + k * 2, 14, 1, '#8a7a5a');
  }, INK);
  const shutter = sprite(['ss', 'SS', 'ss', 'SS', 'ss', 'SS'], { s: '#2a5a8a', S: '#3a7ab0' }, { outline: INK });
  const signSpr = sprite(['YYYYYYY', 'YkYkkYY', 'YYYYYYY'], { Y: '#e8c030', k: '#3a3020' }, { outline: INK });
  const car = carSprite('blue');
  const wheels = wheelSprites();
  const carRim = silhouette(car, '#c8e8e8');
  const fam = familySprites(env.family);

  const spray = [], debris = [];
  let surge = -1.2;                      // seconds since the last surge (first at ~1.2 s)
  let debrisT = 0;
  let nextBolt = 2.2, boltAge = 9, boltX = 180, boltSeed = 1;

  const scene = {
    shake: 0, flash: 0,

    update(dt, t) {
      const gust = gustAt(t);
      surge += dt;
      if (surge > 3.4) surge = 0;
      // Surge crash: spray bursts over the wall
      if (surge > 0.9 && surge < 1.3) {
        for (let i = 0; i < 9; i++) {
          spray.push({ x: r.range(-10, W), y: WALL_Y - r.range(0, 6), vx: r.range(30, 90), vy: -r.range(40, 90), g: 140, life: r.range(0.8, 1.6) });
        }
      }
      debrisT += dt * (2 + gust * 6);
      while (debrisT > 1) {
        debrisT--;
        const kind = r() < 0.08 ? 'sign' : r() < 0.5 ? 'shingle' : 'frond';
        debris.push({ x: -10, y: r.range(30, 150), vx: r.range(110, 200), vy: r.range(-20, 25), life: 4, kind, spin: r.range(6, 14) });
      }
      for (const d of debris) d.vy += Math.sin(t * 6 + d.spin) * 40 * dt;
      stepParticles(spray, dt); stepParticles(debris, dt, 30);
      boltAge += dt;
      if (t > nextBolt) { boltAge = 0; boltX = r.range(60, 300); boltSeed = r.int(1, 999); nextBolt = t + r.range(3, 6); }
      scene.flash = boltAge < 0.2 ? (1 - boltAge / 0.2) * 0.55 : 0;
      scene.shake = gust > 0.8 ? 1 : 0;
    },

    draw(g, t) {
      const cam = -50 * (1 - easeOut(t / 2.4));
      const gust = gustAt(t);

      g.drawImage(sky, 0, 0);
      // Spiral bands wheeling around the off-screen eye
      const rot = t * 0.05;
      for (const p of bandPuffs) {
        const u = (p.a + rot + p.b * 0.21) % ARC;            // wraps: puffs stream around the arc
        const a = Math.PI * 0.45 + u;
        const rad = p.rad + u * 34;                          // outward spiral
        const x = EYE[0] + Math.cos(a) * rad + cam * 0.15;
        const y = EYE[1] + Math.sin(a) * rad * 0.5;
        if (y < -14 || y > SEA_Y + 4 || x < -16 || x > W + 16) continue;
        drawPuff(g, x, y, p.size, p.dark ? '#040a0c' : '#1a3436', p.dark ? '#24403e' : '#5a807a', 0.45);
      }
      if (boltAge < 0.18) bolt(g, boltX, 30, SEA_Y, boltSeed, '#ffffff', '#9ad8d8');

      // Sea with marching swells and flickering whitecaps
      g.drawImage(sea, 0, SEA_Y);
      drawWrap(g, swell, t * 26 + cam * 0.3, SEA_Y + 2);
      drawWrap(g, swell, t * 34 + 9 + cam * 0.4, SEA_Y + 9);
      drawWrap(g, swell, t * 44 + 17 + cam * 0.5, SEA_Y + 17);
      for (let i = 0; i < 18; i++) {
        if ((Math.floor(t * 5) + i) % 4) continue;
        R(g, (i * 53 + Math.floor(t * 30)) % W, SEA_Y + 3 + (i * 7) % 20, 4, 1, '#e0f0ec');
      }

      // Storm-surge wave rearing up behind the seawall
      if (surge >= 0) {
        const k = surge < 0.9 ? ease(surge / 0.9) : 1 - ease((surge - 0.9) / 0.7);
        const hmax = 26 * Math.max(0, k);
        if (hmax > 1) {
          for (let x = 0; x < W; x++) {
            const h = Math.round(hmax * (0.75 + 0.25 * Math.sin(x * 0.05 + t * 3)));
            const top = WALL_Y - h;
            R(g, x, top, 1, h, '#2a5a58');
            R(g, x, top + Math.round(h * 0.35), 1, Math.round(h * 0.4), '#3a7470');
            R(g, x, top, 1, 2, '#e8f8f4');
            if ((x + Math.floor(t * 20)) % 7 < 3) R(g, x + 1, top - 2, 1, 2, '#ffffff');
          }
        }
      }
      g.drawImage(seawall, 0, WALL_Y);

      // Palms whipping in the wind
      for (const [px, ph] of [[34, 0], [150, 1.7], [212, 3.1]]) {
        const x = px + Math.round(cam * 0.85);
        const bend = 5 + gust * 9 + Math.sin(t * 7 + ph) * 1.5;
        let tx = x, ty = ROAD_Y + 2;
        for (let k = 0; k < 34; k++) {
          tx = x + Math.round((k / 34) ** 2 * bend);
          ty = ROAD_Y + 2 - k;
          R(g, tx, ty, 3, 1, k % 4 === 0 ? '#5a4024' : '#7a5a34');
          R(g, tx - 1, ty, 1, 1, INK); R(g, tx + 3, ty, 1, 1, INK);
        }
        draw(g, crowns[Math.floor(t * (6 + gust * 8) + ph) % 2], tx - 7 + Math.round(gust * 3), ty - 4);
      }

      // Shuttered house; shutters bang open and shut
      const hx = 248 + Math.round(cam * 0.85), hy = ROAD_Y - 44;
      // Porch light glow
      g.globalAlpha = 0.25 + 0.1 * Math.sin(t * 9);
      R(g, hx + 21, hy + 26, 16, 14, '#ffd870');
      g.globalAlpha = 1;
      draw(g, house, hx, hy);
      HOUSE_WINDOWS.forEach(([wx, wy], i) => {
        const bang = Math.floor(t * (3 + gust * 10) + i * 1.3) % 3;
        draw(g, shutter, hx + wx - 3 - (bang === 0 ? 2 : 0), hy + wy + 1);
        draw(g, shutter, hx + wx + 7 + (bang === 1 ? 2 : 0), hy + wy + 1);
      });

      g.drawImage(road, 0, ROAD_Y);

      // Car parked with headlights; family runs for the house
      const cx = 60 + Math.round(cam);
      if (scene.flash > 0.1) draw(g, carRim, cx, ROAD_Y + 6);
      drawCar(g, car, wheels, cx, ROAD_Y + 7, 0, { bounce: gust > 0.7 && Math.floor(t * 12) % 2 ? 1 : 0 });
      g.globalAlpha = 0.15;
      g.fillStyle = '#ffeaa0';
      g.beginPath(); g.moveTo(cx + 40, ROAD_Y + 14); g.lineTo(cx + 120, ROAD_Y + 4); g.lineTo(cx + 120, ROAD_Y + 26); g.closePath(); g.fill();
      // Headlight reflections streaking on the wet road
      g.globalAlpha = 0.5;
      for (let k = 0; k < 5; k++) R(g, cx + 44 + k * 14, ROAD_Y + 25 + (k % 2), 8, 1, '#e8d890');
      g.globalAlpha = 1;
      fam.forEach((m, i) => {
        const t0 = 1.4 + i * 0.3;
        if (t < t0) return;
        const start = cx + 30, target = hx + 4 - i * 10;
        const x = Math.min(target, start + (t - t0) * 46);
        const running = x < target;
        drawFamily(g, [m], x, ROAD_Y + 24 + (i % 2) * 2, running ? 'walk' : 'idle',
          { t: t * 1.5 + i, rim: scene.flash > 0.1 ? '#e0ffff' : null, rimDx: 0, rimDy: -1 });
      });

      // Spray thrown over the wall
      for (const p of spray) R(g, p.x, p.y, p.t < 0.5 ? 2 : 1, p.t < 0.5 ? 2 : 1, p.t < 0.6 ? '#e8f8f4' : '#8ab8b4');

      g.globalCompositeOperation = 'multiply';
      R(g, 0, ROAD_Y - 2, W, H - ROAD_Y + 2, '#9ab4b4');
      g.globalCompositeOperation = 'source-over';

      // Flying debris
      for (const d of debris) {
        const f = Math.floor(d.t * d.spin) % 4;
        if (d.kind === 'sign') { draw(g, signSpr, d.x, d.y, f > 1); continue; }
        if (d.kind === 'shingle') {
          R(g, d.x, d.y, f % 2 ? 3 : 2, f % 2 ? 1 : 2, '#3a3a44');
          R(g, d.x, d.y, 1, 1, '#6a6a78');
        } else {
          R(g, d.x, d.y, 4, 1, '#3a8a3a'); R(g, d.x + (f % 2 ? 1 : 3), d.y + (f < 2 ? -1 : 1), 2, 1, '#2a6a2a');
        }
      }

      // Sideways rain sheets, heavier in the gusts
      g.globalAlpha = 0.7 + gust * 0.3;
      tile2(g, rainA, -t * 260, -t * 80);
      tile2(g, rainB, -t * 380, -t * 110);
      g.globalAlpha = 1;
    },
  };
  return scene;
}
