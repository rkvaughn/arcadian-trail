/**
 * Wildfire — a wall of flame races along the ridge behind the road. Smoke
 * columns climb into a blood-orange sky, embers stream past, and the family
 * stands backlit beside the car. Intro: the camera pans in, the car rolls to a
 * stop, the flames erupt, and the family climbs out.
 *
 * Variant: toxic_air — the fire is distant; a choking haze dominates.
 */

import {
  W, H, R, rng, ease, easeOut, clamp, lerp, ditherBands, ditherFill, ridge, strip, drawWrap,
  drawPuff, flameWall, stepParticles, draw, silhouette, disc,
} from '../kit.js';
import { carSprite, wheelSprites, drawCar, familySprites, drawFamily, pineSprite, deadTreeSprite } from '../sprites.js';

const ROAD_Y = 142;
const FIRE_Y = 127;
const SMOKE_SRC = [24, 96, 150, 214, 286, 340];

export function wildfireScene(env) {
  const toxic = env.eventId === 'toxic_air';
  const r = rng(91);

  const sky = strip(W, 132, (g) => ditherBands(g, 0, 0, W, 132, toxic
    ? ['#3a2a2a', '#5a3a30', '#8a5a40', '#b07a50', '#c8925a']
    : ['#1e070c', '#4a0e12', '#8a1e14', '#c8401a', '#f07a24', '#ffb04a']));

  // Far ridge (backlit) and burning mid ridge with pine silhouettes
  const far = strip(480, 70, (g, w, h) => ridge(g, w, h, {
    amp: 34, base: 64, seed: 7, color: toxic ? '#4a3430' : '#3a0c12', hi: toxic ? '#8a6050' : '#e0561c', jag: 0.4,
  }));
  // Smoke canopy pressing down from the top of the frame
  const canopy = strip(400, 40, (g, w) => {
    const cr = rng(23);
    for (let i = 0; i < 60; i++) {
      const x = cr.range(0, w), y = cr.range(-4, 14), rad = cr.range(6, 14);
      for (const dx of [0, -w, w]) drawPuff(g, x + dx, y, rad, toxic ? '#3a2e2c' : '#1e0a0e', toxic ? '#5a4a42' : '#4a1a16', 0.5, true);
    }
  });
  const pine = silhouette(pineSprite(), '#120507');
  const snag = silhouette(deadTreeSprite(), '#120507');
  const mid = strip(480, 60, (g, w, h) => {
    const tops = ridge(g, w, h, { amp: 12, base: 52, seed: 3, color: '#1a080a', hi: '#5a1a10' });
    const tr = rng(5);
    for (let x = 0; x < w; x += tr.int(7, 13)) {
      const s = tr() < 0.25 ? snag : pine;
      draw(g, s, x, tops[Math.min(w - 1, x + 5)] - s.h + 3);
    }
  });
  // Glow above the fire line, two dither densities to flicker between
  const glowA = strip(W, 60, (g) => { for (let y = 0; y < 60; y++) ditherFill(g, 0, y, W, 1, '#ff8a2a', (y / 60) * 0.55); });
  const glowB = strip(W, 60, (g) => { for (let y = 0; y < 60; y++) ditherFill(g, 0, y, W, 1, '#ffb040', (y / 60) * 0.4); });
  const ground = strip(W, H - FIRE_Y, (g, w, h) => {
    R(g, 0, 0, w, h, '#1c0c0c');
    ditherFill(g, 0, 0, w, 14, '#3a1610', 0.5);
    // Road
    R(g, 0, ROAD_Y - FIRE_Y, w, 24, '#231819');
    ditherFill(g, 0, ROAD_Y - FIRE_Y, w, 24, '#2e2022', 0.3);
    R(g, 0, ROAD_Y - FIRE_Y, w, 1, '#6a2e1e');
    R(g, 0, ROAD_Y - FIRE_Y + 2, w, 1, '#7a6050');
    R(g, 0, ROAD_Y - FIRE_Y + 22, w, 1, '#5a4840');
    for (let x = 4; x < w; x += 22) R(g, x, ROAD_Y - FIRE_Y + 11, 12, 2, '#c8902a');
    // Scorched verge below the road with burnt tufts
    const gr = rng(17);
    for (let i = 0; i < 70; i++) {
      const x = gr.int(0, w), y = gr.int(ROAD_Y - FIRE_Y + 26, h - 2);
      R(g, x, y, 1, 2, '#3a1a12'); R(g, x - 1, y - 1, 1, 1, '#4a2216'); R(g, x + 1, y - 1, 1, 1, '#4a2216');
    }
  });

  const haze = toxic ? strip(W + 4, H, (g) => {
    ditherFill(g, 0, 0, W + 4, H, '#7a6a5a', 0.24);
    ditherFill(g, 0, 90, W + 4, 50, '#9a8a70', 0.2);
  }) : null;

  const car = carSprite('blue');
  const wheels = wheelSprites();
  const carRim = silhouette(car, '#ff9a4a');
  const fam = familySprites(env.family);

  const embers = [], smoke = [], ash = [];
  let emberT = 0, smokeT = 0, ashT = 0;

  const scene = {
    shimmer: { y0: 70, y1: FIRE_Y + 4, amp: 1.2 },

    update(dt, t) {
      const k = ease((t - 0.3) / 1.6);
      emberT += dt * (toxic ? 12 : 60) * k;
      while (emberT > 1) {
        emberT--;
        embers.push({ x: r.range(-20, W), y: FIRE_Y - r.range(0, 18), vx: r.range(8, 26), vy: -r.range(14, 40),
          life: r.range(1.5, 3.5), wob: r.range(0, 6), big: r() < 0.15 });
      }
      smokeT += dt * (toxic ? 16 : 11);
      while (smokeT > 1) {
        smokeT--;
        const src = r.pick(SMOKE_SRC);
        smoke.push({ x: src + r.range(-7, 7), y: r.range(100, 112), vx: r.range(5, 10), vy: -r.range(9, 15),
          life: r.range(7, 10), r0: r.range(3, 6) });
      }
      ashT += dt * 14;
      while (ashT > 1) { ashT--; ash.push({ x: r.range(-10, W), y: -4, vx: r.range(6, 16), vy: r.range(8, 16), life: 14, ph: r.range(0, 6) }); }
      for (const e of embers) e.vx += Math.sin(t * 3 + e.wob) * 20 * dt;
      for (const a of ash) a.vx = 10 + Math.sin(t * 2 + a.ph) * 8;
      stepParticles(embers, dt); stepParticles(smoke, dt, 40); stepParticles(ash, dt);
    },

    draw(g, t) {
      const cam = -60 * (1 - easeOut(t / 2.4));          // intro pan, settles at 0
      const fireK = ease((t - 0.3) / 1.6) * (toxic ? 0.45 : 1);
      const flick = 0.8 + 0.2 * Math.sin(t * 13) * Math.sin(t * 7.3);

      g.drawImage(sky, 0, 0);
      // Smoke-dimmed sun
      const sx = 238 + cam * 0.05, sy = 44;
      disc(g, sx, sy, 15, toxic ? '#d89a6a' : '#ff6a2a');
      disc(g, sx, sy, 11, toxic ? '#e8b080' : '#ff8a3a');
      disc(g, sx - 3, sy - 3, 4, toxic ? '#f0c898' : '#ffb060');

      g.drawImage(far, Math.round(cam * 0.25) - 60, 52);
      // Smoke columns behind the mid ridge
      for (const p of smoke) {
        const k = p.t / p.life;
        const rad = p.r0 + k * 16;
        drawPuff(g, p.x + cam * 0.4, p.y, rad, toxic ? '#4a3a36' : k < 0.5 ? '#3a1614' : '#2a1012',
          toxic ? '#7a6050' : '#9a3a1a', 0.4, true);
      }
      drawWrap(g, canopy, -t * 4 + cam * 0.3, 0);
      g.globalAlpha = flick;
      g.drawImage(Math.floor(t * 8) % 2 ? glowA : glowB, 0, FIRE_Y - 58);
      g.globalAlpha = 1;
      g.drawImage(mid, Math.round(cam * 0.55) - 60, FIRE_Y - 52);

      // The fire front: two flame walls for depth
      flameWall(g, 0, W, FIRE_Y + 1, 22, t, fireK, 1.7, ['#7a1006', '#c8300a', '#f06a14', '#ffb030', '#ffe070']);
      flameWall(g, 0, W, FIRE_Y + 4, 30, t * 1.15, fireK, 4.1);

      g.drawImage(ground, 0, FIRE_Y + 3);
      // Fire light spilling over the road edge
      g.globalAlpha = 0.5 * flick * fireK;
      R(g, 0, FIRE_Y + 3, W, 2, '#ff9a3a');
      R(g, 0, ROAD_Y, W, 1, '#ff7a2a');
      g.globalAlpha = 1;

      // Car rolls in and stops
      const ct = clamp(t / 1.9, 0, 1);
      const cx = lerp(-48, 168, easeOut(ct)) + cam;
      const moving = ct < 1;
      const bounce = moving && Math.floor(t * 10) % 2 ? 1 : 0;
      draw(g, carRim, cx, ROAD_Y - 1 - bounce);
      drawCar(g, car, wheels, cx, ROAD_Y, cx, { bounce });
      // Headlight beam into the smoke
      g.globalAlpha = 0.18 + 0.05 * flick;
      g.fillStyle = '#ffe9a0';
      g.beginPath(); g.moveTo(cx + 40, ROAD_Y + 7); g.lineTo(cx + 120, ROAD_Y - 4); g.lineTo(cx + 120, ROAD_Y + 20); g.closePath(); g.fill();
      g.globalAlpha = 1;
      // Family climbs out and steps away from the car, rim-lit by the fire
      fam.forEach((m, i) => {
        const t0 = 2.0 + i * 0.3;
        if (t < t0) return;
        const start = cx + 8, target = cx - 18 - i * 11;
        const x = Math.max(target, start - (t - t0) * 32);
        const walking = x > target;
        const one = [m];
        const feet = ROAD_Y + 17 + (i % 2);
        drawFamily(g, one, x, feet, walking ? 'walk' : 'idle',
          { t: t + i, flip: walking, rim: '#ffa050', rimDx: 0, rimDy: -1 });
      });

      // Warm-shadow the foreground (backlit by the fire)
      g.globalCompositeOperation = 'multiply';
      R(g, 0, ROAD_Y - 4, W, H - ROAD_Y + 4, '#c08878');
      g.globalCompositeOperation = 'source-over';

      // Embers and falling ash in front of everything
      for (const e of embers) {
        const k = e.t / e.life;
        const c = k < 0.3 ? '#fff0a0' : k < 0.6 ? '#ffb030' : '#e0401a';
        R(g, e.x + cam * 0.8, e.y, e.big ? 2 : 1, e.big ? 2 : 1, c);
      }
      for (const a of ash) R(g, a.x, a.y, 1, 1, Math.floor(a.ph * 10) % 2 ? '#8a7a74' : '#5a4e4a');

      if (toxic) g.drawImage(haze, Math.round(Math.sin(t * 0.4) * 2), 0);
    },
  };
  return scene;
}
