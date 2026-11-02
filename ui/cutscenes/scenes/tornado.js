/**
 * Tornado — a green-black supercell squats over the plains. A funnel snakes
 * down from the wall cloud, spinning (shaded bands slide around it), with
 * boards and shingles orbiting in front of and behind it and a dust cloud
 * churning at its base. Wheat leans into the inflow, power lines sway, and the
 * family watches from the car on a dirt road. Intro: the camera pans and the
 * funnel lowers from the cloud until it touches down in a burst of dust.
 */

import {
  W, H, R, rng, ease, easeOut, clamp, lerp, ditherBands, ditherFill, strip, drawWrap,
  drawPuff, stepParticles, draw, bolt, painted, sprite,
} from '../kit.js';
import { INK, carSprite, wheelSprites, drawCar, familySprites, drawFamily, roundTreeSprite, poleSprite } from '../sprites.js';

const HORIZON = 118;
const ROAD_Y = 140;
const CLOUD_BASE = 44;
const TOUCHDOWN_S = 2.6;

export function tornadoScene(env) {
  const r = rng(29);

  const sky = strip(W, HORIZON + 4, (g) => ditherBands(g, 0, 0, W, HORIZON + 4,
    ['#10160e', '#1a2416', '#26341e', '#3a4a28', '#56602e', '#7e7c3c', '#b0a252']));
  // Wall cloud: a heavy shelf with lit, lumpy underside
  const shelf = strip(440, 62, (g, w) => {
    const cr = rng(14);
    R(g, 0, 0, w, 20, '#0c120a');
    for (let i = 0; i < 120; i++) {
      const x = cr.range(0, w), y = cr.range(4, 34), rad = cr.range(6, 13);
      for (const dx of [0, -w, w]) drawPuff(g, x + dx, y, rad, '#10180c', '#36442a', 0.4, true);
    }
  });
  const trees = roundTreeSprite({ G: '#1e2c18', g: '#162212', h: '#2a3a20', T: '#1a1a12', t: '#141410' });
  const farLine = strip(480, 22, (g, w) => {
    R(g, 0, 16, w, 6, '#1c2614');
    const tr = rng(4);
    for (let x = 0; x < w; x += tr.int(9, 30)) draw(g, trees, x, 16 - trees.h + tr.int(2, 5));
  });
  const fields = strip(W + 40, ROAD_Y - HORIZON, (g, w, h) => {
    ditherBands(g, 0, 0, w, h, ['#4a5226', '#566030', '#606a36']);
    for (let y = 2; y < h; y += 3) R(g, 0, y, w, 1, y % 2 ? '#3e4620' : '#6a7440');
  });
  const barn = painted(44, 32, (g) => {
    // Gambrel roof
    for (let k = 0; k < 6; k++) R(g, 8 - k, k, 28 + k * 2, 1, '#5a1a16');
    for (let k = 6; k < 12; k++) R(g, 2, k, 40, 1, k === 6 ? '#7a2a22' : '#6a1e1a');
    R(g, 3, 12, 38, 20, '#a8302a');
    for (let x = 5; x < 41; x += 3) R(g, x, 12, 1, 20, '#8a2420');
    R(g, 15, 18, 14, 14, '#f0e8d8'); R(g, 16, 19, 12, 13, '#6a1e1a');
    for (let k = 0; k < 12; k++) { R(g, 16 + k, 19 + k, 1, 1, '#f0e8d8'); R(g, 27 - k, 19 + k, 1, 1, '#f0e8d8'); }
    R(g, 19, 5, 6, 5, '#f0e8d8'); R(g, 20, 6, 4, 3, '#3a1a12');
  }, INK);
  const silo = painted(14, 40, (g) => {
    for (let k = 0; k < 5; k++) R(g, 5 - k, k, 4 + k * 2, 1, '#8a9094');
    R(g, 1, 5, 12, 35, '#b8b8b0');
    R(g, 1, 5, 3, 35, '#d8d8d0'); R(g, 10, 5, 3, 35, '#8a8a84');
    for (let y = 9; y < 40; y += 6) R(g, 1, y, 12, 1, '#7a7a74');
  }, INK);
  const pole = poleSprite('#3a2a1a');
  const car = carSprite('blue');
  const wheels = wheelSprites();
  const fam = familySprites(env.family);
  const board = sprite(['bbbbbbb', 'BBBBBBB'], { b: '#8a6a3a', B: '#5a4024' }, { outline: INK });

  const orbit = [];
  for (let i = 0; i < 22; i++) {
    orbit.push({ th: r.range(0, Math.PI * 2), w: r.range(2.5, 4.5), h: r.range(2, 60), vh: r.range(-6, 10),
      kind: r() < 0.3 ? 'board' : r() < 0.6 ? 'shingle' : 'bit' });
  }
  const dust = [], streaks = [];
  let dustT = 0, streakT = 0;
  let nextBolt = 1.2, boltAge = 9, boltX = 120, boltSeed = 1;
  let touched = false;

  const funnelX = (t, cam) => 206 + Math.sin(t * 0.45) * 14 + cam * 0.4;
  const funnelBottom = (t) => lerp(CLOUD_BASE + 4, HORIZON + 2, ease((t - 0.3) / (TOUCHDOWN_S - 0.3)));

  const scene = {
    shake: 0, flash: 0,

    update(dt, t) {
      const down = t >= TOUCHDOWN_S;
      if (down && !touched) {
        touched = true;
        for (let i = 0; i < 30; i++) dust.push({ x: 0, y: 0, a: r.range(0, 6.3), rad: r.range(2, 8), vr: r.range(10, 30), vx: 0, vy: 0, life: r.range(1, 2.2), big: true });
      }
      if (down) {
        dustT += dt * 30;
        while (dustT > 1) { dustT--; dust.push({ x: 0, y: 0, a: r.range(0, 6.3), rad: r.range(3, 10), vr: r.range(2, 8), vx: 0, vy: 0, life: r.range(1, 2.5) }); }
      }
      for (const d of dust) { d.a += dt * 4; d.rad += d.vr * dt; d.vy = -6; }
      stepParticles(dust, dt, 400);
      // Inflow streaks racing along the ground toward the funnel
      streakT += dt * 14;
      while (streakT > 1) { streakT--; streaks.push({ x: r.range(0, W), y: r.range(HORIZON + 4, H - 2), vx: 0, vy: 0, life: 0.6 }); }
      stepParticles(streaks, dt);
      for (const o of orbit) {
        o.th += o.w * dt;
        o.h += o.vh * dt;
        if (o.h > 70 || o.h < 0) o.vh = -o.vh;
      }
      boltAge += dt;
      if (t > nextBolt) { boltAge = 0; boltX = r.range(20, 300); boltSeed = r.int(1, 999); nextBolt = t + r.range(2.5, 5); }
      scene.flash = boltAge < 0.18 ? (1 - boltAge / 0.18) * 0.4 : 0;
      scene.shake = t > TOUCHDOWN_S && t < TOUCHDOWN_S + 0.5 ? 1.5 : 0;
    },

    draw(g, t) {
      const cam = -50 * (1 - easeOut(t / 2.6));
      const fx = funnelX(t, cam);
      const fb = funnelBottom(t);
      const down = t >= TOUCHDOWN_S;

      g.drawImage(sky, 0, 0);
      if (boltAge < 0.16) bolt(g, boltX, 30, HORIZON - 4, boltSeed, '#ffffff', '#c8d8a0');
      g.drawImage(farLine, Math.round(cam * 0.25) - 60, HORIZON - 16);

      // Orbiting debris behind the funnel
      drawOrbit(g, t, fx, false);
      drawFunnel(g, fx, fb, t);
      if (down) for (const d of dust) {
        const k = d.t / d.life;
        drawPuff(g, fx + Math.cos(d.a) * d.rad * 1.4, HORIZON - 2 - d.t * 8 + Math.sin(d.a) * d.rad * 0.35,
          (d.big ? 6 : 4) + k * 6, '#5a4c32', '#8a7a52', 0.5);
      }
      drawOrbit(g, t, fx, true);

      // Wall cloud lowering over the funnel top
      drawWrap(g, shelf, t * 3 + cam * 0.3, -6);
      for (let k = -3; k <= 3; k++) {
        drawPuff(g, fx + k * 10 + Math.sin(t * 1.4 + k) * 2, CLOUD_BASE - 4 + Math.abs(k) * -2, 12 - Math.abs(k), '#121a0e', '#3e4c2c', 0.4, true);
      }

      // Farm mid-ground
      g.drawImage(fields, Math.round(cam * 0.6) - 30, HORIZON);
      draw(g, barn, 30 + Math.round(cam * 0.6), HORIZON - 26);
      draw(g, silo, 78 + Math.round(cam * 0.6), HORIZON - 34);
      // Power poles with wires swaying in the inflow
      const poles = [];
      for (let i = 0; i < 6; i++) {
        const px = 18 + i * 62 + Math.round(cam * 0.8);
        draw(g, pole, px, ROAD_Y - 34);
        poles.push(px + 5);
      }
      g.fillStyle = '#141810';
      for (let i = 0; i < poles.length - 1; i++) {
        for (const dy of [0, 2]) {
          for (let x = poles[i]; x <= poles[i + 1]; x++) {
            const u = (x - poles[i]) / (poles[i + 1] - poles[i]);
            g.fillRect(x, ROAD_Y - 34 + 1 + dy + Math.round(Math.sin(u * Math.PI) * (5 + Math.sin(t * 3 + i + dy) * 2)), 1, 1);
          }
        }
      }
      // Dirt road
      R(g, 0, ROAD_Y, W, 12, '#5a4a32'); ditherFill(g, 0, ROAD_Y, W, 12, '#6a5a40', 0.3);
      R(g, 0, ROAD_Y, W, 1, '#7a6a4a'); R(g, 0, ROAD_Y + 11, W, 1, '#3a3020');
      for (const s of streaks) if (s.y > ROAD_Y - 2) R(g, s.x + (fx - s.x) * s.t * 0.3, s.y, 6, 1, '#8a7a56');

      // Car and family watching the funnel
      const cx = 30 + Math.round(cam);
      drawCar(g, car, wheels, cx, ROAD_Y - 6, 0, { bounce: scene.shake && Math.floor(t * 20) % 2 ? 1 : 0 });
      drawFamily(g, fam, cx + 46, ROAD_Y + 10, 'idle', { t, gap: 10 });

      // Foreground wheat leaning into the inflow
      drawWheat(g, t, fx);

      // Sickly green storm light
      g.globalCompositeOperation = 'multiply';
      R(g, 0, HORIZON, W, H - HORIZON, '#a8b890');
      g.globalCompositeOperation = 'source-over';
    },
  };

  function drawFunnel(g, fx, fb, t) {
    const top = CLOUD_BASE - 6;
    const span = HORIZON + 2 - top;
    for (let y = top; y < fb; y++) {
      const p = (y - top) / span;
      const hw = Math.max(1, Math.round(lerp(24, 3, Math.pow(p, 0.6))));
      const cx = fx + Math.sin(y * 0.07 + t * 1.6) * 5 * p;
      for (let x = -hw; x <= hw; x++) {
        const u = x / hw;
        const band = Math.sin(u * 2.4 + t * 10 - y * 0.2);
        let c = band > 0.45 ? '#8a9078' : band > -0.2 ? '#626a54' : '#454c3c';
        if (u < -0.8) c = '#353c2e';
        if (u > 0.85) c = '#2a3024';
        R(g, cx + x, y, 1, 1, c);
      }
      // Ragged edge flecks
      if ((y + Math.floor(t * 20)) % 5 === 0) R(g, cx + hw + 1, y, 1, 1, '#454c3c');
      if ((y + Math.floor(t * 17)) % 7 === 0) R(g, cx - hw - 1, y, 1, 1, '#626a54');
    }
  }

  function drawOrbit(g, t, fx, front) {
    for (const o of orbit) {
      const s = Math.sin(o.th);
      if ((s > 0) !== front) continue;
      const rad = 10 + o.h * 0.35;
      const x = fx + Math.cos(o.th) * rad;
      const y = HORIZON - 2 - o.h + s * rad * 0.25;
      const f = Math.floor(t * 10 + o.w * 3) % 4;
      if (o.kind === 'board') {
        if (f % 2) draw(g, board, x - 3, y); else { R(g, x, y - 3, 2, 7, '#8a6a3a'); R(g, x - 1, y - 3, 1, 7, INK); }
      } else if (o.kind === 'shingle') {
        R(g, x, y, f % 2 ? 3 : 2, f % 2 ? 2 : 3, '#3a3a34'); R(g, x, y, 1, 1, '#6a6a5a');
      } else {
        R(g, x, y, 1, 1, front ? '#2a2a20' : '#4a4a3a');
      }
    }
  }

  function drawWheat(g, t, fx) {
    R(g, 0, ROAD_Y + 12, W, H - ROAD_Y - 12, '#4a3e20');
    for (const [y0, dark] of [[160, true], [176, false]]) {
      for (let x = -2; x < W + 2; x += 2) {
        const lean = clamp((fx - x) / 120, -1, 1) * 2;
        const h = 10 + ((x * 7) % 5);
        const sway = Math.round(lean + Math.sin(t * 4 + x * 0.17) * 1.2);
        const stem = dark ? '#7a6a2e' : '#a88a40';
        const head = dark ? '#a89048' : '#e0c060';
        for (let k = 0; k < h; k++) R(g, x + Math.round(sway * k / h), y0 - k, 1, 1, stem);
        R(g, x + sway, y0 - h - 2, 1, 3, head);
        R(g, x + sway - 1, y0 - h, 1, 1, head);
      }
      R(g, 0, y0, W, H - y0, dark ? '#5a4a26' : '#6a5a2e');
    }
  }

  return scene;
}
