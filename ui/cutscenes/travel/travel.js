/**
 * travel.js — The driving scene at native 320×180, drawn with the cut scene
 * kit. One TravelRenderer is owned by PixelRenderer and draws every travel
 * frame:
 *
 *   sky (palette per time of day × clear/overcast/heat) → sun / moon / stars →
 *   clouds → terrain layers (parallax, tinted for time of day) → far fog →
 *   roadside signs → perspective road → the family car (+ dust / spray) →
 *   near verge → foreground → weather particles → near fog → flashes.
 *
 * Terrains live in ./terrains/<name>.js and export
 *   VARIANTS: string[]
 *   build(k) → {
 *     ground: color between horizon and road,
 *     layers: [{ c: canvas, y, speed, lights?: canvas }],  back → front
 *     verge:  { base, tuft, hi }      strip just below the road
 *     fore:   { base, dark, detail, flowers? } foreground band (or { c } canvas);
 *             flowers: petal colors, [] for none (sand, pavement…)
 *     road?:  { asphalt, grain, edge, dash, lip }
 *     dust:   color kicked up behind the car
 *     animate?(g, t, run)            drawn after layers (turbines, waves…)
 *     front?(g, t, run)              drawn after the car (reeds, trunks…)
 *   }
 *   k = { variant, rng, phase, lit, night, wx, group, tint(canvas), shade(color),
 *         W, H, HORIZON, ROAD_TOP, ROAD_BOT }
 *   Layers are tinted for time of day automatically; use k.shade() for colors
 *   drawn live in animate/front, and k.tint() for any extra canvases.
 *
 * All numbers here are visual (pixels, colors, seconds).
 */

import {
  W, H, R, rng, clamp, lerp, ditherBands, ditherFill, strip, drawWrap, makeCanvas,
  drawPuff, stepParticles, draw, disc, text, textWidth, bayer, bolt, shimmer,
} from '../kit.js';
import { INK, carSprite, wheelSprites, cloudSprite, birdSprites, SKINS } from '../sprites.js';

export const HORIZON = 92;
export const ROAD_TOP = 106;
export const ROAD_BOT = 130;
const CAR_X = 120;
const CAR_Y = ROAD_BOT - 18;          // wheels sit in the near lane
const ROAD_SPEED = 90;                // px/s at the road surface

const PHASES = ['dawn', 'day', 'dusk', 'night'];

const SKY = {
  clear: {
    dawn:  ['#28285a', '#4a3e7e', '#8a5a8e', '#d0788a', '#f0a888', '#ffd8a8'],
    day:   ['#3070e0', '#4a8af0', '#68a4f8', '#8cc0fc', '#b4d8ff', '#d8ecff'],
    dusk:  ['#141440', '#36265e', '#76386a', '#c0546a', '#ea8656', '#ffbc68'],
    night: ['#03030c', '#070a1c', '#0c1230', '#121a3e', '#1a2448', '#24304e'],
  },
  overcast: {
    dawn:  ['#3e3e50', '#56526a', '#76687e', '#968088', '#b09a98'],
    day:   ['#626c7a', '#7a8592', '#929caa', '#aab2be', '#c2c8d0'],
    dusk:  ['#24222e', '#3a3444', '#564656', '#76585e', '#8e6a66'],
    night: ['#08080e', '#101018', '#181822', '#20202c', '#2a2a36'],
  },
  heat: {
    dawn:  ['#5a4a6a', '#a07078', '#e0a080', '#ffd0a0', '#fff0c8'],
    day:   ['#b0b8c0', '#d0ccb8', '#e8dcb0', '#f8e8b8', '#fff4d0'],
    dusk:  ['#3a2448', '#8a3e58', '#d8684a', '#f8a050', '#ffd080'],
    night: ['#0c0810', '#1a1220', '#2a1c2a', '#3a2830', '#4a3434'],
  },
};

// Multiply tint applied to terrain layers per time of day (+ overcast)
const TINT = { dawn: '#f2d2cc', day: null, dusk: '#e4aa92', night: '#3c4878' };
const TINT_OVERCAST = { dawn: '#d8d2d8', day: '#c8ccd4', dusk: '#c8b8c0', night: '#8a90a8' };

export function weatherGroup(icon) {
  if (['rain', 'drizzle', 'storm', 'snow', 'clouds', 'mist', 'fog'].includes(icon)) return 'overcast';
  if (icon === 'heat') return 'heat';
  return 'clear';
}

/** Multiply-tint a layer canvas in place, keeping its transparency. */
function tintCanvas(c, color) {
  if (!color) return c;
  const [copy, cg] = makeCanvas(c.width, c.height);
  cg.drawImage(c, 0, 0);
  const g = c.getContext('2d');
  g.globalCompositeOperation = 'multiply';
  g.fillStyle = color;
  g.fillRect(0, 0, c.width, c.height);
  g.globalCompositeOperation = 'destination-in';
  g.drawImage(copy, 0, 0);
  g.globalCompositeOperation = 'source-over';
  return c;
}

/** Tinted copy of a sprite object (same shape, multiplied colors). */
function tintSprite(spr, color) {
  if (!color) return spr;
  const [c, g] = makeCanvas(spr.c.width, spr.c.height);
  g.drawImage(spr.c, 0, 0);
  return { ...spr, c: tintCanvas(c, color) };
}

/** Blend a hex color toward white by `k` (0 = unchanged). */
function lighten(a, k) {
  if (!a) return null;
  const p = parseInt(a.slice(1), 16);
  const ch = (s) => Math.round(((p >> s) & 255) + (255 - ((p >> s) & 255)) * k);
  return '#' + [16, 8, 0].map(s => ch(s).toString(16).padStart(2, '0')).join('');
}

function mulColor(a, b) {
  if (!b) return a;
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = (s) => Math.round((((pa >> s) & 255) * ((pb >> s) & 255)) / 255);
  return '#' + [16, 8, 0].map(s => ch(s).toString(16).padStart(2, '0')).join('');
}

// ── Static pieces built once per scene ───────────────────────────────────────

function roadPattern(p, wet) {
  const { asphalt = '#34323a', grain = '#3e3c44', edge = '#c8c4b8', dash = '#e8c040', lip = '#24222a' } = p || {};
  const h = ROAD_BOT - ROAD_TOP;
  return strip(64, h, (g) => {
    R(g, 0, 0, 64, h, wet ? mulColor(asphalt, '#b8bcc8') : asphalt);
    ditherFill(g, 0, 0, 64, h, grain, 0.22);
    R(g, 0, 0, 64, 1, lip);
    R(g, 0, 2, 64, 1, edge);
    R(g, 0, h - 3, 64, 1, edge);
    R(g, 0, h - 1, 64, 1, lip);
    R(g, 6, Math.floor(h / 2) - 1, 16, 2, dash);
    R(g, 38, Math.floor(h / 2) - 1, 16, 2, dash);
    R(g, 31, 3, 1, h - 6, mulColor(asphalt, '#c8c8c8'));      // tar seam
    if (wet) for (let i = 0; i < 10; i++) R(g, (i * 23) % 60, 4 + ((i * 7) % (h - 8)), 3 + (i % 3), 1, '#8a96aa');
  });
}

function vergeStrip(v, h, seed) {
  const { base, tuft, hi } = v;
  return strip(128, h, (g) => {
    R(g, 0, 0, 128, h, base);
    const r = rng(seed);
    for (let i = 0; i < 46; i++) {
      const x = r.int(1, 126), y = r.int(3, h - 1);
      R(g, x, y - 2, 1, 2, tuft); R(g, x - 1, y - 3, 1, 1, hi); R(g, x + 1, y - 3, 1, 1, hi);
    }
  });
}

// Foreground band in the style of the end screens: flat grass, sparse darker
// rows for depth, tufts, and little flowers (or terrain bits) on stems.
function foreStrip(f, h, seed) {
  if (f.c) return f.c;
  const { base, dark, detail } = f;
  const flowers = f.flowers || ['#ff6a8a', '#ffe060', '#ffffff', '#c88aff'];
  return strip(192, h, (g) => {
    R(g, 0, 0, 192, h, base);
    const r = rng(seed);
    for (let y = 4; y < h; y += 6) for (let x = r.int(0, 20); x < 192; x += r.int(18, 40)) R(g, x, y, r.int(8, 22), 1, dark);
    for (let i = 0; i < 34; i++) {
      const x = r.int(1, 190), y = r.int(3, h - 1);
      R(g, x, y - 2, 1, 2, dark); R(g, x - 1, y - 3, 1, 1, detail); R(g, x + 1, y - 3, 1, 1, detail);
    }
    for (let i = 0; i < (flowers.length ? 16 : 0); i++) {
      const x = r.int(2, 189), y = r.int(5, h - 2), c = r.pick(flowers);
      R(g, x, y - 1, 1, 2, dark); R(g, x - 1, y - 3, 3, 1, c); R(g, x, y - 4, 1, 3, c); R(g, x, y - 3, 1, 1, '#ffe8a0');
    }
  });
}

/** Green highway sign carrying the current waypoint's name. */
function signSprite(name) {
  const label = String(name || 'NEXT EXIT').toUpperCase().slice(0, 24);
  const w = textWidth(label) + 10;
  const [c, g] = makeCanvas(w + 2, 30);
  R(g, 4, 13, 2, 17, '#6a6a72'); R(g, w - 4, 13, 2, 17, '#6a6a72');
  R(g, 0, 0, w + 2, 15, INK);
  R(g, 1, 1, w, 13, '#1e6a3a'); R(g, 2, 2, w - 2, 11, '#2a7a46'); R(g, 2, 2, w - 2, 1, '#e8f0e8');
  text(g, label, 1 + w / 2, 4, { align: 'center', color: '#f0f8f0' });
  return c;
}

// ── The renderer ─────────────────────────────────────────────────────────────

export class TravelRenderer {
  constructor(terrains) {
    this.terrains = terrains;           // { name: module }
    [this.buf, this.bg] = makeCanvas(W, H);
    [this.snap, this.sg] = makeCanvas(W, H);
    this.key = null;
    this.scene = null;
    this.run = 0;
    this.speed = 0;
    this.last = null;
    this.t = 0;
    this.trans = 1;                     // 0→1 dissolve from previous scene
    this.fx = [];                       // weather particles
    this.dust = [];
    this.fxT = 0;
    this.boltT = 3;
    this.flash = 0;
    this.boltSeed = 1;
    this.car = carSprite('blue');
    this.wheels = wheelSprites();
    this.birds = birdSprites('#1a1a24');
    this.wakeup = 0;
  }

  /** Start a dissolve from whatever `canvas` shows now (e.g. a cut scene). */
  dissolveFrom(canvas) {
    this.sg.drawImage(canvas, 0, 0);
    this.trans = 0;
  }

  /**
   * Draw one frame. opts: { terrain, variantSeed, day, weather, moving,
   * family, place } — everything the scene needs from the game.
   */
  render(ctx, nowMs, opts) {
    const dt = this.last == null ? 0 : clamp((nowMs - this.last) / 1000, 0, 0.1);
    this.last = nowMs;
    this.t += dt;

    const phase = PHASES[Math.floor((opts.day || 0) / 3) % 4];
    const wx = opts.weather || 'clear';
    const group = weatherGroup(wx);
    const mod = this.terrains[opts.terrain] || this.terrains.plains;
    const variant = mod.VARIANTS[Math.abs(opts.variantSeed | 0) % mod.VARIANTS.length];
    const key = [opts.terrain, variant, phase, group].join('|');
    if (key !== this.key) {
      if (this.scene) { this.sg.drawImage(ctx.canvas, 0, 0); this.trans = 0; }
      this.key = key;
      this.scene = this._build(mod, variant, phase, group, opts);
    }
    if (opts.place !== this.place) { this.place = opts.place; this.sign = signSprite(opts.place); }
    this.family = opts.family;

    // Ease the car's speed toward cruising (or a stop while a card is up)
    const target = opts.moving ? ROAD_SPEED : 0;
    this.speed += (target - this.speed) * clamp(dt * 1.6, 0, 1);
    this.run += this.speed * dt;
    this._update(dt, wx);

    const g = this.bg;
    g.imageSmoothingEnabled = false;
    this._draw(g, wx, phase);

    ctx.imageSmoothingEnabled = false;
    if (wx === 'heat') shimmer(ctx, this.buf, 54, ROAD_TOP, this.t, 1.2);
    else ctx.drawImage(this.buf, 0, 0);
    if (this.flash > 0.5) { ctx.fillStyle = `rgba(230,236,255,${(this.flash - 0.5) * 0.9})`; ctx.fillRect(0, 0, W, H); }

    if (this.trans < 1) {                 // Bayer dissolve from the old scene
      this.trans = Math.min(1, this.trans + dt / 0.8);
      const k = this.trans;
      for (let by = 0; by < H; by += 4) {
        for (let bx = 0; bx < W; bx += 4) {
          if (bayer(bx / 4, by / 4) >= k) ctx.drawImage(this.snap, bx, by, 4, 4, bx, by, 4, 4);
        }
      }
    }
    R(ctx, 0, 0, W, 1, '#000'); R(ctx, 0, H - 1, W, 1, '#000');
    R(ctx, 0, 0, 1, H, '#000'); R(ctx, W - 1, 0, 1, H, '#000');
  }

  _build(mod, variant, phase, group, opts) {
    const lit = phase === 'dusk' || phase === 'night';
    const tint = group === 'overcast'
      ? (TINT[phase] ? mulColor(TINT[phase], TINT_OVERCAST[phase]) : TINT_OVERCAST[phase])
      : TINT[phase];
    const k = {
      variant, phase, lit, night: phase === 'night', wx: opts.weather, group,
      rng: rng(1 + (opts.variantSeed | 0) * 7919), tint: (c) => tintCanvas(c, tint), shade: (c) => mulColor(c, tint),
      W, H, HORIZON, ROAD_TOP, ROAD_BOT,
    };
    const t = mod.build(k);
    for (const L of t.layers) tintCanvas(L.c, tint);
    const wet = ['rain', 'drizzle', 'storm'].includes(opts.weather);
    const snow = opts.weather === 'snow';
    const sky = strip(W, ROAD_TOP, (g) => ditherBands(g, 0, 0, W, HORIZON + 14, SKY[group][phase]));
    const r = rng(phase.length * 31 + group.length);
    const clouds = Array.from({ length: group === 'overcast' ? 9 : group === 'heat' ? 1 : 4 }, (_, i) => ({
      x: r.range(0, W + 60), y: r.range(6, 50), big: i % 3 === 0, sp: r.range(0.02, 0.06),
    }));
    const cloudPal = {
      clear: { dawn: ['#ffd8d0', '#d08a9a'], day: ['#ffffff', '#c8dcf0'], dusk: ['#ffb8a0', '#a0587a'], night: ['#3a4060', '#262a44'] },
      overcast: { dawn: ['#a89aa8', '#7a7088'], day: ['#c8ccd4', '#9aa2ae'], dusk: ['#6a5a6a', '#4a3e4e'], night: ['#26262e', '#1a1a22'] },
      heat: { dawn: ['#ffe8d0', '#e0b0a0'], day: ['#fff8e8', '#e8dcc0'], dusk: ['#ffc8a0', '#c07a6a'], night: ['#3a3038', '#2a2228'] },
    }[group][phase];
    const cloudSprs = [cloudSprite(false, { W: cloudPal[0], w: cloudPal[1], h: cloudPal[0] }),
                       cloudSprite(true, { W: cloudPal[0], w: cloudPal[1], h: cloudPal[0] })];
    const stars = Array.from({ length: 60 }, () => ({ x: r.int(1, W - 2), y: r.int(1, HORIZON - 20), p: r.int(0, 9) }));
    const vergeH = 10, foreH = H - ROAD_BOT - vergeH;
    const tintCol = (c) => mulColor(c, tint);
    const verge = vergeStrip({ base: tintCol(t.verge.base), tuft: tintCol(t.verge.tuft), hi: tintCol(t.verge.hi) }, vergeH, 7);
    const fore = t.fore.c ? tintCanvas(t.fore.c, tint)
      : foreStrip({ base: tintCol(t.fore.base), dark: tintCol(t.fore.dark), detail: tintCol(t.fore.detail),
                    flowers: t.fore.flowers ? t.fore.flowers.map(tintCol) : ['#ff6a8a', '#ffe060', '#ffffff', '#c88aff'].map(tintCol) }, foreH, 9);
    const road = tintCanvas(roadPattern(t.road, wet), tint);
    // Snowbanks: solid snow with a lumpy top edge and soft blue shading
    const snowCover = snow ? strip(W + 64, H - ROAD_BOT, (g, w, h) => {
      const sr = rng(77);
      R(g, 0, 3, w, h - 3, mulColor('#eef3fa', lighten(tint, 0.3)));
      for (let x = 0; x < w; x += 4) R(g, x, sr.int(0, 3), 4, 3, mulColor('#eef3fa', lighten(tint, 0.3)));
      for (let i = 0; i < 70; i++) R(g, sr.int(0, w), sr.int(5, h - 2), sr.int(3, 9), 1, mulColor('#c4d2e6', lighten(tint, 0.3)));
      R(g, 0, h - 8, w, 8, mulColor('#d4e0f0', lighten(tint, 0.3)));
    }) : null;
    // Fog banks: rows of soft puffs, drawn translucent so the scene shows through
    const foggy = opts.weather === 'mist' || opts.weather === 'fog';
    const fogCol = phase === 'night' ? '#5a5e6a' : '#dfe3e8';
    const fogBank = (h, n, rmin, rmax, seed) => strip(W + 96, h, (g, w) => {
      const fr = rng(seed);
      for (let i = 0; i < n; i++) {
        const x = fr.range(0, w), y = fr.range(h * 0.3, h * 0.7), rr = fr.range(rmin, rmax);
        for (const dx of [0, -w, w]) drawPuff(g, x + dx, y, rr, fogCol, null, 0.5);
      }
    });
    const fogFar = foggy ? fogBank(50, 70, 6, 14, 41) : null;
    const fogNear = foggy ? fogBank(40, 50, 5, 11, 43) : null;
    // The car is lit a little more than the land so it always reads
    const carTint = lighten(tint, 0.45);
    this.carT = tintSprite(this.car, carTint);
    this.wheelsT = this.wheels.map(w => tintSprite(w, carTint));
    return {
      t, sky, clouds, cloudSprs, stars, verge, fore, road, snowCover, fogFar, fogNear, lit, phase, group,
      ground: tintCol(t.ground), dust: tintCol(t.dust || '#a08a6a'),
    };
  }

  _update(dt, wx) {
    const s = this.scene, r = Math.random;
    // Dust (dry) or spray (wet) from the rear wheel while moving
    const wet = ['rain', 'drizzle', 'storm', 'snow'].includes(wx);
    const v = this.speed / ROAD_SPEED;
    if (v > 0.2 && r() < dt * 14 * v) {
      this.dust.push(wet
        ? { x: CAR_X + 6, y: CAR_Y + 14, vx: -40 - r() * 30, vy: -20 - r() * 25, g: 120, life: 0.5, k: 'spray' }
        : { x: CAR_X + 3, y: CAR_Y + 14, vx: -40 - r() * 20, vy: -3 - r() * 5, life: 0.7, k: 'dust', r0: 1 });
    }
    stepParticles(this.dust, dt);

    // Weather particles
    const rate = { drizzle: 40, rain: 110, storm: 220, snow: 50, wind: 22, heat: 0, mist: 0, fog: 0 }[wx] || 0;
    this.fxT += dt * rate;
    while (this.fxT > 1) {
      this.fxT--;
      if (wx === 'snow') this.fx.push({ x: r() * (W + 80), y: -3, vx: -12 - v * 20, vy: 18 + r() * 14, life: 12, k: 'snow', ph: r() * 6 });
      else if (wx === 'wind') this.fx.push(r() < 0.75
        ? { x: W + 4, y: r() * (ROAD_BOT + 30), vx: -220 - r() * 100, vy: r() * 10 - 5, life: 3, k: 'streak', len: 8 + r() * 14 }
        : { x: W + 4, y: 40 + r() * 100, vx: -140 - r() * 60, vy: r() * 30 - 10, life: 4, k: 'leaf', ph: r() * 6 });
      else {
        const storm = wx === 'storm';
        this.fx.push({ x: r() * (W + 120), y: -6, vx: -(storm ? 90 : 40) - v * 30, vy: storm ? 300 : 230, life: 2, k: 'rain', len: storm ? 6 : 4 });
        if (r() < 0.25) this.fx.push({ x: r() * W, y: ROAD_TOP + 3 + r() * (ROAD_BOT - ROAD_TOP - 4), vx: -this.speed, vy: 0, life: 0.25, k: 'splash' });
      }
    }
    for (const p of this.fx) if (p.k === 'snow' || p.k === 'leaf') p.vx += Math.sin(this.t * 2 + p.ph) * 12 * dt;
    stepParticles(this.fx, dt, 140);

    // Lightning
    this.flash = Math.max(0, this.flash - dt * 2.5);
    if (wx === 'storm') {
      this.boltT -= dt;
      if (this.boltT <= 0) { this.boltT = 3 + r() * 5; this.flash = 1; this.boltSeed = Math.floor(r() * 9999); }
    }
    void s;
  }

  _draw(g, wx, phase) {
    const s = this.scene, T = s.t, t = this.t, run = this.run;
    g.drawImage(s.sky, 0, 0);
    // Stars (clear night), sun / moon
    if (phase === 'night' && s.group !== 'overcast') {
      for (const st of s.stars) {
        const tw = Math.floor(t * 2 + st.p) % 9;
        if (tw) R(g, st.x, st.y, 1, 1, tw === 4 ? '#ffffff' : '#8a90b8');
      }
    }
    if (s.group !== 'overcast') {
      if (phase === 'day') {
        const big = s.group === 'heat';
        disc(g, 262, 26, big ? 18 : 12, big ? '#fff2c0' : '#fff0a0'); disc(g, 262, 26, big ? 13 : 9, '#ffffff');
      } else if (phase === 'dawn') { disc(g, 64, HORIZON - 26, 16, '#ffb070'); disc(g, 64, HORIZON - 26, 11, '#ffe0a0'); disc(g, 61, HORIZON - 29, 4, '#fff4d0'); }
      else if (phase === 'dusk') { disc(g, 262, HORIZON - 24, 17, '#ff8a3a'); disc(g, 262, HORIZON - 24, 12, '#ffc060'); disc(g, 259, HORIZON - 27, 4, '#fff0b0'); }
      else { disc(g, 60, 24, 8, '#f0ecd8'); disc(g, 63, 22, 7, '#070a1c'); }      // crescent moon
    } else if (phase === 'day' || phase === 'dawn') {
      disc(g, 250, 30, 10, '#d8dce0');               // sun behind cloud cover
    }
    if (wx === 'storm' && this.flash > 0.6) bolt(g, 30 + (this.boltSeed % 260), 0, HORIZON - 6, this.boltSeed);
    // Clouds drift on their own and with travel
    for (const c of s.clouds) {
      const spr = s.cloudSprs[c.big ? 1 : 0];
      const x = ((c.x - run * c.sp - t * 3) % (W + 60) + W + 60) % (W + 60) - 50;
      draw(g, spr, x, c.y);
    }
    // Birds now and then (daytime, fair weather)
    if (phase !== 'night' && s.group !== 'overcast') {
      const cyc = (t % 40) / 40;
      if (cyc < 0.45) for (let i = 0; i < 4; i++) draw(g, this.birds[Math.floor(t * 5 + i) % 2], W + 20 - cyc * 2.2 * (W + 60) + i * 9, 30 + i * 3 + (i % 2) * 4);
    }

    // Ground under everything, then terrain layers (parallax)
    R(g, 0, HORIZON - 2, W, ROAD_TOP - HORIZON + 2, s.ground);
    for (const L of T.layers) {
      drawWrap(g, L.c, run * L.speed, L.y);
      if (L.lights && s.lit) drawWrap(g, L.lights, run * L.speed, L.y);
    }
    if (T.animate) T.animate(g, t, run, s);
    if (s.fogFar) { g.globalAlpha = 0.7; drawWrap(g, s.fogFar, run * 0.15 - t * 6, HORIZON - 34); g.globalAlpha = 1; }

    // Roadside: mile posts and a sign with the current place name
    const post = 150, off = run * 0.95;
    for (let x = -((off % post) + post) % post; x < W; x += post) {
      R(g, x, ROAD_TOP - 9, 2, 9, '#d8d8d0'); R(g, x, ROAD_TOP - 9, 2, 2, '#2a7a46');
    }
    const signEvery = 2600, sx = signEvery - ((run * 0.95 + 1800) % signEvery) - 40;
    if (this.sign && sx > -this.sign.width && sx < W) g.drawImage(this.sign, Math.round(sx), ROAD_TOP - 30);

    // Perspective road: far rows scroll slower than near rows
    const rh = ROAD_BOT - ROAD_TOP;
    for (let y = 0; y < rh; y++) {
      const k = lerp(0.82, 1.12, y / (rh - 1));
      const o = ((run * k) % 64 + 64) % 64;
      for (let x = -o; x < W; x += 64) g.drawImage(s.road, 0, y, 64, 1, Math.round(x), ROAD_TOP + y, 64, 1);
    }

    this._drawCar(g, phase, wx);

    drawWrap(g, s.verge, run * 1.2, ROAD_BOT);
    drawWrap(g, s.fore, run * 1.45, ROAD_BOT + 10);
    if (s.snowCover) drawWrap(g, s.snowCover, run * 1.3, ROAD_BOT);
    if (T.front) T.front(g, t, run, s);

    // Weather on top
    for (const p of this.fx) {
      switch (p.k) {
        case 'rain': R(g, p.x, p.y, 1, p.len, wx === 'storm' ? '#a8b8d0' : '#8aa0c0'); break;
        case 'splash': R(g, p.x - 1, p.y, 1, 1, '#c8d8f0'); R(g, p.x + 1, p.y, 1, 1, '#c8d8f0'); R(g, p.x, p.y - 1, 1, 1, '#e0ecff'); break;
        case 'snow': R(g, p.x, p.y, p.ph > 4 ? 2 : 1, p.ph > 4 ? 2 : 1, '#ffffff'); break;
        case 'streak': R(g, p.x, p.y, p.len, 1, 'rgba(230,236,240,0.45)'); break;
        case 'leaf': R(g, p.x, p.y, 2, 1, Math.floor(p.ph * 10) % 2 ? '#6a8a2a' : '#a06a2a'); break;
      }
    }
    if (s.fogNear) { g.globalAlpha = 0.45; drawWrap(g, s.fogNear, run * 0.6 - t * 10, ROAD_TOP - 20); g.globalAlpha = 1; }
    if (wx === 'storm') { g.fillStyle = 'rgba(8,10,24,0.18)'; g.fillRect(0, 0, W, H); }
    if (wx === 'heat' && phase === 'day') {
      g.globalAlpha = 0.12 + 0.04 * Math.sin(t * 1.3); disc(g, 262, 26, 60, '#fff4d0'); g.globalAlpha = 1;
    }
  }

  _drawCar(g, phase, wx) {
    const v = this.speed / ROAD_SPEED;
    const run = this.run;
    // Suspension: soft bob plus a jolt over each road seam
    const seam = ((run * 1.1) % 64) < 3 && v > 0.1 ? 1 : 0;
    const bob = v > 0.1 ? (Math.floor(run / 9) % 5 === 0 ? 1 : 0) : 0;
    const lift = Math.max(seam, bob);
    const x = CAR_X, y = CAR_Y;

    for (const p of this.dust) {
      if (p.k === 'dust') drawPuff(g, p.x, p.y, p.r0 + p.t * 3, this.scene.dust, null, 0.9);
      else R(g, p.x, p.y, 1, 1, '#d8e4f4');
    }
    // Shadow under the car
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(x + 1, y + 16, 39, 2);
    // Headlight beam when it's dark or murky
    const dark = phase === 'night' || phase === 'dusk' || ['storm', 'fog', 'mist'].includes(wx);
    if (dark) {
      g.globalAlpha = phase === 'night' ? 0.28 : 0.18;
      g.fillStyle = '#fff2b8';
      g.beginPath(); g.moveTo(x + 40, y + 7 - lift); g.lineTo(x + 130, y - 2); g.lineTo(x + 130, y + 20); g.closePath(); g.fill();
      g.globalAlpha = 1;
    }
    const wf = this.wheelsT[Math.floor(run / 3) % 2];
    draw(g, wf, x + 4, y + 8);
    draw(g, wf, x + 27, y + 8);
    draw(g, this.carT, x, y - lift);
    // The family through the windows: driver up front, then the rest
    const fam = (this.family || []).filter(m => m.alive !== false);
    const seats = fam.length > 3 ? [19, 12, 4, 7] : [19, 12, 5];
    const hairs = ['#3a2614', '#1a1210', '#8a5a2a', '#d8b060', '#5a3a1a'];
    const night = phase === 'night';
    fam.slice(0, 4).forEach((m, i) => {
      const hx = x + seats[i], hy = y + 4 - lift + (i === 3 ? 1 : 0);
      const small = typeof m.age === 'number' && m.age < 13;
      const nod = Math.floor(this.t * 1.5 + i * 1.3) % 6 === 0 ? 1 : 0;
      const top = hy + (small ? 1 : 0) + nod;
      R(g, hx, top, 3, 1, night ? '#141418' : hairs[i % hairs.length]);
      R(g, hx, top + 1, 3, Math.max(1, 2 - (small ? 1 : 0)), night ? '#3a3440' : SKINS[(i * 2 + 1) % SKINS.length]);
      if (!night) R(g, hx + 2, top + 1, 1, 1, '#1a1018');
    });
    if (dark) { R(g, x + 39, y + 7 - lift, 1, 2, '#fffbe0'); R(g, x, y + 7 - lift, 1, 2, '#ff5040'); }
  }
}
