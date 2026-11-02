/**
 * Vehicle trouble — golden hour on a lonely desert highway. The car sputters
 * to a stop with a backfire, the hood pops, steam pours out, and a family
 * member goes at the engine with a wrench while a hazard triangle blinks and
 * a tumbleweed rolls past. Telephone poles and wires give parallax depth.
 *
 * Variant: flash_freeze — an icy blue night: falling snow, frost on the car,
 * icicles, breath vapor, and a glinting frozen road. The car slides in on ice.
 */

import {
  W, H, R, rng, ease, easeOut, clamp, lerp, ditherBands, ditherFill, ridge, strip, drawWrap,
  drawPuff, stepParticles, draw, disc, sprite, silhouette, makeCanvas, bayer,
} from '../kit.js';
import {
  INK, carSprite, wheelSprites, familySprites, drawFamily, poleSprite, cactusSprite, birdSprites,
} from '../sprites.js';

const ROAD_Y = 142;
const GROUND_Y = 122;
const CAR_X = 150;

/** 1–2 px thick line with an ink outline (for the propped hood, wrench arm). */
function thickLine(g, x0, y0, x1, y1, color, ink = INK) {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i <= n; i++) {
      const x = Math.round(lerp(x0, x1, i / n)), y = Math.round(lerp(y0, y1, i / n));
      if (pass === 0) R(g, x - 1, y - 1, 4, 4, ink);
      else R(g, x, y, 2, 2, color);
    }
  }
}

export function mechanicalScene(env) {
  const ice = env.eventId === 'flash_freeze';
  const r = rng(37);

  const sky = strip(W, 130, (g) => ditherBands(g, 0, 0, W, 130, ice
    ? ['#04061a', '#0a1230', '#122250', '#1c3468', '#2c4c80']
    : ['#2a2a6a', '#5a3a7a', '#a8507a', '#e0786a', '#f8a858', '#ffd078']));
  const stars = ice ? Array.from({ length: 50 }, () => [r.int(2, W - 2), r.int(2, 90), r()]) : [];

  // Long streaky clouds lit from below by the low sun
  const clouds = strip(480, 70, (g, w) => {
    const cr = rng(31);
    for (let i = 0; i < 9; i++) {
      const x = cr.int(0, w), y = cr.int(4, 60), len = cr.int(30, 80);
      for (const dx of [0, -w]) {
        R(g, x + dx, y, len, 2, ice ? '#1a2a50' : '#7a4a7a');
        R(g, x + dx + 4, y - 1, len - 12, 1, ice ? '#22345e' : '#8a5a86');
        R(g, x + dx + 3, y + 2, len - 6, 1, ice ? '#3a5080' : '#f0a070');
      }
    }
  });
  const far = strip(480, 60, (g, w, h) => ridge(g, w, h, ice
    ? { amp: 26, base: 56, seed: 12, color: '#2a3a5a', hi: '#c8d8f0', jag: 0.5, snow: '#c8d8ec', snowLine: 26 }
    : { amp: 22, base: 56, seed: 12, color: '#6a4a7a', hi: '#d88a8a', shade: '#5a3e6a', jag: 0.3 }));
  const nearHills = strip(480, 30, (g, w, h) => ridge(g, w, h, ice
    ? { amp: 8, base: 28, seed: 8, color: '#8aa0c0', hi: '#e8f0ff' }
    : { amp: 8, base: 28, seed: 8, color: '#a8604a', hi: '#f0a070', shade: '#8a4a3a' }));

  // Telephone poles with sagging wires (seamless across 480 px, every 80 px)
  const pole = poleSprite(ice ? '#3a3040' : '#5a3a20');
  const poles = strip(480, 40, (g, w) => {
    for (let x = 20; x < w; x += 80) {
      draw(g, pole, x, 4);
      if (ice) { R(g, x, 3, 11, 1, '#f0f8ff'); R(g, x + 1, 5, 9, 1, '#f0f8ff'); }
      for (const wy of [5, 7]) {
        for (let k = 0; k < 80; k++) {
          const sag = Math.sin((k / 80) * Math.PI) * 6;
          const px = (x + 5 + k) % w;
          R(g, px, wy + sag, 1, 1, ice ? '#5a6a8a' : '#2a1e24');
        }
      }
    }
  });
  const scrub = strip(480, 22, (g, w) => {
    const cr = rng(6);
    const cactus = cactusSprite();
    for (let i = 0; i < 26; i++) {
      const x = cr.int(0, w);
      if (!ice && i % 6 === 0) draw(g, cactus, x, 4);
      else {
        R(g, x, 16, 5, 2, ice ? '#e8f0fa' : '#6a7a3a'); R(g, x + 1, 15, 3, 1, ice ? '#ffffff' : '#8a9a4a');
        R(g, x - 1, 17, 1, 1, ice ? '#b8c8e0' : '#4a5a2a');
      }
    }
  });

  const ground = strip(W, H - GROUND_Y, (g, w, h) => {
    const ry = ROAD_Y - GROUND_Y;
    R(g, 0, 0, w, h, ice ? '#d0dcee' : '#d8a070');
    ditherFill(g, 0, 0, w, ry, ice ? '#b8c8e0' : '#c48a5c', 0.35);
    const gr = rng(4);
    for (let i = 0; i < 40; i++) {
      const x = gr.int(0, w), y = gr.int(2, ry - 3);
      if (ice) { R(g, x, y, 6, 1, '#ffffff'); R(g, x + 1, y + 1, 4, 1, '#a8bad8'); }
      else { R(g, x, y, 2, 1, '#a8704a'); R(g, x, y - 1, 1, 1, '#f0c090'); }
    }
    // Road
    R(g, 0, ry, w, 24, ice ? '#46587a' : '#4a4048');
    ditherFill(g, 0, ry, w, 24, ice ? '#52668a' : '#56494f', 0.3);
    R(g, 0, ry, w, 1, ice ? '#e8f0ff' : '#2a2228');
    R(g, 0, ry + 2, w, 1, ice ? '#a8b8d0' : '#d8c8a8');
    R(g, 0, ry + 22, w, 1, ice ? '#a8b8d0' : '#c8b898');
    for (let x = 4; x < w; x += 22) R(g, x, ry + 11, 12, 2, ice ? '#b8a860' : '#f0c040');
    if (ice) {
      // Glassy ice sheets with streak highlights
      for (let i = 0; i < 14; i++) {
        const x = gr.int(0, w), y = gr.int(ry + 4, ry + 20), len = gr.int(8, 30);
        R(g, x, y, len, 1, '#8aa8d0'); R(g, x + 2, y, Math.max(2, len / 3), 1, '#d8ecff');
      }
    }
    for (let i = 0; i < 50; i++) {
      const x = gr.int(0, w), y = gr.int(ry + 26, h - 2);
      if (ice) { R(g, x, y, 3, 1, '#ffffff'); R(g, x, y + 1, 3, 1, '#a8bad8'); }
      else { R(g, x, y, 1, 2, '#7a8a3a'); R(g, x - 1, y - 1, 1, 1, '#9aaa4a'); R(g, x + 1, y - 1, 1, 1, '#9aaa4a'); }
    }
  });

  const car = carSprite('blue');
  const wheels = wheelSprites();
  const carRim = silhouette(car, ice ? '#c8e0ff' : '#ffd890');
  // Frost: white car silhouette masked by a top-heavy dither
  const frost = (() => {
    const [c, g] = makeCanvas(car.c.width, car.c.height);
    g.drawImage(silhouette(car, '#f4faff').c, 0, 0);
    const img = g.getImageData(0, 0, c.width, c.height);
    for (let y = 0; y < c.height; y++) {
      for (let x = 0; x < c.width; x++) {
        const k = 0.75 - (y / c.height) * 0.9;
        if (bayer(x, y) > k) img.data[(y * c.width + x) * 4 + 3] = 0;
      }
    }
    g.putImageData(img, 0, 0);
    return c;
  })();
  const flat = sprite(['..kkkkkk..', '.kKKKKKKk.', 'kKKKHHKKKk', 'kKKKKKKKKk', 'kkkkkkkkkk'],
    { k: '#0c0a0c', K: '#2a2628', H: '#8a8890' });
  const spare = sprite(['.kkkk.', 'kKKKKk', 'kKHHKk', 'kKHHKk', 'kKKKKk', '.kkkk.'], { k: '#0c0a0c', K: '#2a2628', H: '#b8bcc4' }, { outline: INK });
  const jack = sprite(['..RR..', '.R..R.', 'R....R', '.R..R.', 'RRRRRR'], { R: '#c83020' }, { outline: INK });
  const tri = [
    sprite(['...R...', '..RWR..', '..RWR..', '.RWWWR.', '.RWRWR.', 'RRRRRRR'], { R: '#ff3a2a', W: '#fff0e0' }, { outline: INK }),
    sprite(['...R...', '..RWR..', '..RWR..', '.RWWWR.', '.RWRWR.', 'RRRRRRR'], { R: '#8a1a10', W: '#c8b8a8' }, { outline: INK }),
  ];
  const tumble = [
    sprite(['..b.bb...', '.bBb..bb.', 'b..bBb..b', 'bb.B..bBb', 'b.bb.b..b', '.b..bBb..', '..bb..bb.', '...bbb...'], { b: '#8a6030', B: '#c09050' }),
    sprite(['...bb.b..', '.bb..bBb.', 'b..bBb..b', 'bBb..B.bb', 'b..b.bb.b', '..bBb..b.', '.bb..bb..', '...bbb...'], { b: '#8a6030', B: '#c09050' }),
  ];
  const wrench = sprite(['GG.....', 'G.GGGGG', 'GG.....'], { G: '#c8ccd4' }, { outline: INK });
  const birds = birdSprites('#2a1e24');
  const fam = familySprites(env.family);
  const mech = fam[0];
  const rest = fam.slice(1);

  const steam = [], snow = [], vapor = [];
  let steamT = 0, snowT = 0, puffed = [false, false];
  if (ice) {
    for (let i = 0; i < 120; i++) snow.push({ x: r.range(0, W), y: r.range(0, H), vx: 0, vy: r.range(10, 26), life: 99, ph: r.range(0, 6), big: r() < 0.25 });
  }

  // Car path: sputters in and stops (ice: slides in, wheels lagging)
  const carX = (t) => {
    const k = clamp(t / 2.0, 0, 1);
    const jerk = ice ? 0 : Math.max(0, Math.sin(t * 9)) * 3 * (1 - k);
    return lerp(-60, CAR_X, easeOut(k)) - jerk;
  };

  return {
    update(dt, t) {
      const cx = carX(t);
      // Backfires while sputtering in
      [0.8, 1.5].forEach((bt, i) => {
        if (!ice && !puffed[i] && t >= bt) {
          puffed[i] = true;
          for (let k = 0; k < 6; k++) steam.push({ x: cx - 2, y: ROAD_Y + 9, vx: -r.range(10, 30), vy: -r.range(2, 10), life: 1.4, r0: r.range(2, 4), dark: true });
        }
      });
      // Steam from the engine once stopped (ice: exhaust vapor at the tail)
      if (t > 2.0) {
        steamT += dt * (ice ? 4 : 14);
        while (steamT > 1) {
          steamT--;
          if (ice) steam.push({ x: cx - 2, y: ROAD_Y + 9, vx: -r.range(4, 10), vy: -r.range(4, 9), life: 2.2, r0: 2 });
          else steam.push({ x: cx + 30 + r.range(-3, 5), y: ROAD_Y + 4, vx: r.range(4, 14), vy: -r.range(14, 26), life: r.range(1.4, 2.4), r0: r.range(2, 3) });
        }
      }
      if (ice) {
        for (const s of snow) {
          s.x += Math.sin(t * 1.3 + s.ph) * 6 * dt;
          if (s.y > H) { s.y = -2; s.x = r.range(0, W); }
          s.y += s.vy * dt;
        }
        // Breath vapor from each family member, staggered
        fam.forEach((m, i) => {
          if (Math.floor((t + i * 0.7) * 0.8) !== Math.floor((t + i * 0.7 - dt) * 0.8)) {
            vapor.push({ i, x: 0, y: 0, vx: r.range(4, 8), vy: -r.range(2, 5), life: 1.2 });
          }
        });
      }
      stepParticles(steam, dt, 40);
      for (const v of vapor) { v.t = (v.t || 0) + dt; v.x += v.vx * dt; v.y += v.vy * dt; }
      for (let i = vapor.length - 1; i >= 0; i--) if (vapor[i].t > vapor[i].life) vapor.splice(i, 1);
    },

    draw(g, t) {
      const cam = 40 * (1 - easeOut(t / 2.4));
      g.drawImage(sky, 0, 0);
      if (ice) {
        for (const [sx, sy, ph] of stars) if (Math.sin(t * 3 + ph * 20) > -0.6) R(g, sx, sy, 1, 1, ph > 0.8 ? '#ffffff' : '#a8b8e0');
        disc(g, 252, 30, 10, '#e8f0ff'); disc(g, 256, 27, 9, '#0a1230');   // crescent moon
      } else {
        // Low sun sinking behind the far ridge
        disc(g, 252 - cam * 0.1, 100, 22, '#ffb860');
        disc(g, 252 - cam * 0.1, 100, 18, '#ffe090');
        for (let y = 84; y < 120; y += 4) R(g, 228, y, 48, 1, '#ffd078');
      }
      drawWrap(g, clouds, t * 2 - cam * 0.1, 8);
      g.drawImage(far, Math.round(-cam * 0.2) - 80, GROUND_Y - 56);
      g.drawImage(nearHills, Math.round(-cam * 0.4) - 80, GROUND_Y - 26);
      drawWrap(g, scrub, -cam * 0.7, GROUND_Y - 20);
      drawWrap(g, poles, -cam * 0.7 + 30, GROUND_Y - 42);
      // Two birds on the wire
      if (!ice) { draw(g, birds[1], 92 - cam * 0.7, GROUND_Y - 35); draw(g, birds[1], 99 - cam * 0.7, GROUND_Y - 34); }
      g.drawImage(ground, 0, GROUND_Y);

      const cx = Math.round(carX(t) + cam * 0);
      const stopped = t > 2.0;

      // Long golden-hour shadow cast to the left
      g.globalCompositeOperation = 'multiply';
      for (let i = 0; i < 4; i++) R(g, cx - 10 - i * 3, ROAD_Y + 15 + i, 44, 1, ice ? '#a8b0d0' : '#c09078');
      g.globalCompositeOperation = 'source-over';

      // Car: rear flat on a jack (breakdown) or sliding on ice
      const roll = ice ? cx * 0.3 : cx;
      const wf = wheels[Math.floor(Math.abs(roll) / 3) % 2];
      draw(g, wf, cx + 27, ROAD_Y + 8);
      if (!ice && stopped) { draw(g, flat, cx + 3, ROAD_Y + 11); draw(g, jack, cx + 12, ROAD_Y + 12); }
      else draw(g, wf, cx + 4, ROAD_Y + 8);
      const bounce = !stopped && Math.floor(t * 10) % 2 ? 1 : 0;
      draw(g, carRim, cx + 1, ROAD_Y - bounce);
      draw(g, car, cx, ROAD_Y - bounce);
      if (ice) {
        g.drawImage(frost, cx - 1, ROAD_Y - 1);
        for (let x = 1; x < 39; x += 3) {
          if ((x > 3 && x < 12) || (x > 26 && x < 35)) continue;
          R(g, cx + x, ROAD_Y + 12, 1, 1 + ((x * 7) % 3), '#c8e8ff');
        }
      }

      // Hood pops open, engine bay revealed
      if (!ice) {
        const hk = ease((t - 2.1) / 0.35);
        if (hk > 0) {
          R(g, cx + 26, ROAD_Y + 5, 13, 2, '#2a2228');
          R(g, cx + 28, ROAD_Y + 4, 6, 2, '#6a6a72');
          const a = hk * 1.2;
          thickLine(g, cx + 26, ROAD_Y + 6, cx + 26 + Math.cos(a) * 13, ROAD_Y + 6 - Math.sin(a) * 13, '#3a6ad0');
        }
      }

      // Steam / smoke / exhaust vapor
      for (const p of steam) {
        const k = p.t / p.life;
        drawPuff(g, p.x, p.y, p.r0 + k * (ice ? 3 : 6), p.dark ? '#4a4048' : ice ? '#c8d8ec' : '#e8e8f0', p.dark ? '#6a6068' : '#ffffff', 0.5);
      }

      // Spare tire leaning on the car; hazard triangle behind it
      if (stopped && !ice) draw(g, spare, cx - 8, ROAD_Y + 9);
      if (stopped) {
        const blink = Math.floor(t * 2) % 2;
        const tx = ice ? cx + 56 : cx - 22;
        draw(g, tri[blink], tx, ROAD_Y + 11);
        if (!blink) { R(g, tx + 2, ROAD_Y + 7, 3, 1, '#ff6a4a'); R(g, tx + 3, ROAD_Y + 6, 1, 1, '#ffb090'); }
      }

      // Family: mechanic at the engine with a working wrench arm; others wait
      if (stopped) {
        const appear = clamp((t - 2.3) / 0.6, 0, 1);
        const mx = Math.round(lerp(cx + 30, cx + 42, appear));
        if (mech) {
          drawFamily(g, [mech], mx, ROAD_Y + 18, appear < 1 ? 'walk' : 'idle', { t, flip: true });
          if (!ice && appear >= 1) {
            const sw = Math.sin(t * 7);
            const hx = mx - 4 + Math.round(sw * 2), hy = ROAD_Y + 4 + Math.round(Math.abs(sw) * 2);
            thickLine(g, mx + 1, ROAD_Y + 7, hx, hy, '#f1c27d');
            draw(g, wrench, hx - 6, hy - 1, true);
            if (Math.floor(t * 7 / Math.PI) % 2 === 0 && Math.abs(sw) > 0.95) R(g, hx - 6, hy - 3, 1, 1, '#ffffa0');
          }
        }
        drawFamily(g, rest, ice ? cx - 36 : cx - 36 - (rest.length - 1) * 10, ROAD_Y + 18, 'idle', { t, gap: ice ? 8 : 10 });
      }
      if (ice) {
        for (const v of vapor) {
          const baseX = v.i === 0 ? cx + 40 : cx - 36 + (v.i - 1) * 8 + 6;
          drawPuff(g, baseX + v.x, ROAD_Y + 18 - (fam[v.i]?.h || 15) + 3 + v.y, 1 + v.t * 2, '#e8f0fa', null, 0.5);
        }
        // Glints racing along the ice
        for (let i = 0; i < 4; i++) {
          const gx = ((t * 30 + i * 90) % (W + 40)) - 20, gy = ROAD_Y + 6 + i * 4;
          if (Math.sin(t * 8 + i) > 0.3) { R(g, gx, gy, 1, 1, '#ffffff'); R(g, gx - 1, gy, 3, 1, '#d8ecff'); }
        }
        for (const s of snow) R(g, s.x, s.y, s.big ? 2 : 1, s.big ? 2 : 1, s.big ? '#ffffff' : '#c8d8f0');
      } else {
        // Tumbleweed bouncing past
        const tx = ((t * 38 + 120) % 480) - 60;
        const ty = ROAD_Y + 14 - Math.abs(Math.sin(t * 5)) * 7;
        draw(g, tumble[Math.floor(t * 8) % 2], tx, ty);
        // Warm grade over the whole frame
        g.globalCompositeOperation = 'multiply';
        R(g, 0, 0, W, H, '#fff0e0');
        g.globalCompositeOperation = 'source-over';
      }
    },
  };
}
