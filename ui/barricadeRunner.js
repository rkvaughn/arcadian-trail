/**
 * barricadeRunner.js — "Crash the Barricade" mini-game.
 *
 * The family wagon races down a raider-held highway at night, dodging lane by
 * lane around barricades, wreckage, barriers and debris. Each crash bleeds
 * speed; stall below the threshold and the raiders catch you, cover the escape
 * distance and you break free.
 *
 * Game logic runs in the original logical grid (70 columns, play rows 3–10);
 * only the rendering is pixel art, drawn on the shared <canvas id="asciiDisplay">
 * at native 320×180 with the cut-scene kit (ui/cutscenes/kit.js).
 *
 * All numbers are GAMEPLAY TUNING (cols/sec, rates) or visual (pixels, colors),
 * not climate data.
 *
 * Public interface:
 *   new BarricadeRunner(displayEl, infoBarEl)   displayEl: the canvas, or any
 *                                               element (then #asciiDisplay is used)
 *   .start(difficulty, onComplete, perks)
 *   .stop()
 *   onComplete({ survived, narrative, effects, used })
 */

import {
  W, H, R, rng, ditherBands, ditherFill, ridge, strip, drawWrap, stepParticles,
  draw, disc, sprite, drawPuff, flameWall,
} from './cutscenes/kit.js';
import { INK, carSprite, wheelSprites, drawCar, poleSprite, deadTreeSprite } from './cutscenes/sprites.js';
import { CardRunner, barricadeCard } from './cutscenes/screensArt.js';
import {
  grassStrip, flowerField, drawFlowers, plate, meter, bar, touchButton, pointerToArt, touchFirst,
  drawLogo, label, countdown, wrapText, RED,
} from './minigames/art.js';

const WIDTH = 70;
const PLAY_MIN_ROW = 3;
const PLAY_MAX_ROW = 10;
const PLAY_MIN_COL = 2;
const PLAY_MAX_COL = 65;
const PLAYER_START_COL = 8;
const PLAYER_START_ROW = 6;
const COUNTDOWN_DURATION = 1.5;
const SCENE_CARD_DURATION = 2000; // ms to show win/lose scene

function lerp(a, b, t) { return a + (b - a) * t; }

function getDifficultyParams(progress) {
  const t = Math.max(0, Math.min(1, progress));
  return {
    duration:       lerp(18, 15, t),
    hazardRate:     lerp(2.0, 5.0, t),
    hazardSpeedMin: lerp(8, 12, t),
    hazardSpeedMax: lerp(14, 21, t),
    pickupRate:     lerp(0.5, 0.8, t),
    // Speed mechanics
    baseSpeed:      lerp(14, 10, t),   // starting forward speed (cols/sec)
    speedDrain:     lerp(3.5, 5.0, t), // speed lost per obstacle hit
    speedRecovery:  lerp(1.5, 1.0, t), // speed regained per second (natural)
    stallThreshold: 1.0,               // below this = caught
    escapeDistance:  lerp(180, 220, t), // total cols to travel to escape
  };
}

const OBSTACLE_TYPES = [
  { name: 'barricade' },
  { name: 'wreckage' },
  { name: 'barrier' },
  { name: 'debris' },
];

const PICKUP_TYPES = [
  { name: 'nitro' },
  { name: 'supplies' },
];

// ── Screen layout (art pixels) ───────────────────────────────────────────────
const PX = W / WIDTH;            // art px per logical column
const HUD_H = 18;
const ROAD_TOP = 60;             // asphalt lip
const LANE_H = 13;
const LANE0 = ROAD_TOP + 3;      // top of lane for row PLAY_MIN_ROW
const LANES = PLAY_MAX_ROW - PLAY_MIN_ROW + 1;
const ROAD_H = 3 + LANES * LANE_H + 3;
const VERGE_Y = ROAD_TOP + ROAD_H;

const laneTop = (row) => LANE0 + (row - PLAY_MIN_ROW) * LANE_H;
const colCenter = (col) => (col + 0.5) * PX;

// ── Art (built once, cached) ─────────────────────────────────────────────────

let ART = null;

function stripes(w, rows, a, b, shade) {
  const out = [];
  for (let y = 0; y < rows; y++) {
    let s = '';
    for (let x = 0; x < w; x++) s += ((x + y) % 6 < 3) ? (y === rows - 1 ? shade : a) : b;
    out.push(s);
  }
  return out;
}

function buildArt() {
  const r = rng(404);
  const sky = strip(W, ROAD_TOP - HUD_H + 4, (g, w, h) => ditherBands(g, 0, 0, w, h,
    ['#07061a', '#120e2c', '#221640', '#3e1c48', '#6a2440', '#9a3a2c', '#c8602a']));
  const stars = Array.from({ length: 46 }, () => ({ x: r.int(1, W - 1), y: r.int(HUD_H + 1, 40), p: r.int(0, 9) }));
  const far = strip(480, 34, (g, w, h) => ridge(g, w, h, { amp: 16, base: 33, seed: 71, color: '#1a1428', hi: '#3a2a48' }));
  // Burnt-out skyline: broken rooftops, a few lit windows, fire spots at street level
  const fires = [];
  const city = strip(480, 34, (g, w, h) => {
    const cr = rng(19);
    for (let x = 0; x < w;) {
      const bw = cr.int(9, 22), bh = cr.int(9, 30);
      const top = h - bh;
      R(g, x, top, bw, bh, '#0e0a14');
      // jagged broken roofline
      for (let k = 0; k < bw; k += 2) if (cr() < 0.35) R(g, x + k, top - cr.int(1, 3), 2, 3, '#0e0a14');
      if (cr() < 0.3) R(g, x + cr.int(1, bw - 3), top - 6, 1, 6, '#0e0a14');       // antenna / rebar
      for (let wy = top + 3; wy < h - 3; wy += 4) {
        for (let wx = x + 2; wx < x + bw - 2; wx += 3) {
          const v = cr();
          if (v < 0.05) R(g, wx, wy, 1, 2, '#e8b060');
          else if (v < 0.09) R(g, wx, wy, 1, 2, '#7a3a2a');
        }
      }
      if (cr() < 0.22) fires.push(x + Math.floor(bw / 2));
      x += bw + cr.int(0, 5);
    }
    R(g, 0, h - 2, w, 2, '#0a0810');
  });
  const shoulder = grassStrip('#1a1e1c', '#262c26', '#3a4232', ROAD_TOP - 50, 33, 128);
  const verge = grassStrip('#1c221e', '#283028', '#3e4a36', H - VERGE_Y, 34, 128);
  const flowers = flowerField(35, 18, 0, W + 6, VERGE_Y + 5, H - 2, ['#c85a7a', '#d8c060', '#d8d8e8', '#9a7ad8']);

  // Multi-lane asphalt: edge lines, dashed lane lines, double yellow in the middle
  const road = strip(64, ROAD_H, (g) => {
    R(g, 0, 0, 64, ROAD_H, '#24222a');
    ditherFill(g, 0, 0, 64, ROAD_H, '#2e2c34', 0.22);
    R(g, 0, 0, 64, 1, '#3a3842');
    R(g, 0, 2, 64, 1, '#8a8494');
    R(g, 0, ROAD_H - 3, 64, 1, '#8a8494');
    R(g, 0, ROAD_H - 1, 64, 1, '#16141a');
    for (let i = 1; i < LANES; i++) {
      const y = 3 + i * LANE_H - 1;
      if (i === LANES / 2) {
        R(g, 0, y - 1, 64, 1, '#c8a030'); R(g, 0, y + 1, 64, 1, '#c8a030');
      } else {
        R(g, 4, y, 14, 1, '#b8b4c0'); R(g, 36, y, 14, 1, '#b8b4c0');
      }
    }
    // tire tracks and patches
    for (let i = 0; i < LANES; i++) {
      const y = 3 + i * LANE_H;
      ditherFill(g, 0, y + 4, 64, 1, '#1c1a20', 0.5);
      ditherFill(g, 0, y + 9, 64, 1, '#1c1a20', 0.5);
    }
    R(g, 22, 3 + LANE_H * 2 + 5, 6, 3, '#1e1c22');
    R(g, 50, 3 + LANE_H * 5 + 3, 4, 2, '#2c2a32');
  });

  const car = carSprite('blue');
  const wheels = wheelSprites();
  const pole = poleSprite('#2a2026');
  const snag = deadTreeSprite('#16121a', '#241e28');

  const O = { outline: INK };
  const obstacles = {
    barricade: sprite([
      ...stripes(18, 3, 'R', 'W', 'r'),
      '.bb............bb.', '.bb............bb.', 'b..b..........b..b', 'b..b..........b..b',
      'b...b........b...b', 'b...b........b...b',
    ], { R: '#e04a1c', W: '#f0ece0', r: '#a03010', b: '#6a4a2a' }, O),
    wreckage: sprite([
      '.......kkkkkkkk.........',
      '......kgkkkgkkgk........',
      '.....kkgkkkkkkkkkk......',
      '...RRRRrrRRRRRRRRRRRk...',
      '..RRrRRRRRRRrrRRRRRRRk..',
      '.RRRRRRRRRRRRRRRRRRRRRk.',
      'rrrrrrrrrrrrrrrrrrrrrrrr',
      'r.kKk..rrrrrrrr..kKk...r',
      '..kkk............kkk....',
    ], { k: '#1a1416', g: '#3a4450', R: '#6a3a26', r: '#3a2018', K: '#6a6a6a' }, O),
    barrier: sprite([
      '.....hhhhhhhh.....',
      '.....CCCCCCCC.....',
      '....CCCCCCCCCC....',
      '...CCCCCCCCCCCC...',
      '..YYKKYYKKYYKKYY..',
      '.CCCCCCCCCCCCCCCC.',
      'CCCCCCCCCCCCCCCCCC',
      'cccccccccccccccccc',
    ], { h: '#d8d4cc', C: '#a8a49c', c: '#6a6660', Y: '#e8b830', K: '#2a2628' }, O),
    debris: sprite([
      '.....PPPPPPPPPP.',
      '....PpppppppppP.',
      '.kkkk....kkkk...',
      'kKKKKk..kKKKKk..',
      'kK..Kk..kK..Kk..',
      'kKKKKk..kKKKKk..',
      '.kkkk....kkkk...',
    ], { P: '#a87a3a', p: '#6a4a20', k: '#0e0c0e', K: '#3a383c' }, O),
  };
  const pickups = {
    nitro: sprite([
      '..ss..', '.ssss.', 'BwBBBb', 'BwNNBb', 'BwNNBb', 'BwBBBb', 'BwBBBb', 'bbbbbb',
    ], { s: '#c8ccd4', B: '#2a8ad8', b: '#1a5a98', w: '#a8e0ff', N: '#ffe060' }, O),
    supplies: sprite([
      'TTTTTTTTTT', 'TddddddddT', 'TtGGttGGtT', 'TtGGttGGtT', 'TttttttttT', 'TtGGttGGtT', 'TddddddddT', 'TTTTTTTTTT',
    ], { T: '#c8903a', t: '#a8702a', d: '#6a4418', G: '#3a8a3a' }, O),
  };
  const crateIcon = pickups.supplies;
  const flagIcon = sprite(['kWkW', 'WkWk', 'kWkW', 's...', 's...'], { k: '#141018', W: '#f0f0f0', s: '#8a8494' });
  const miniCar = sprite(['.bbb..', 'bwbwbb', 'kbbbbk'], { b: '#3a6ad0', w: '#9ad4f0', k: '#1a1418' }, O);

  return { sky, stars, far, city, fires, shoulder, verge, flowers, road, car, wheels, pole, snag, obstacles, pickups, crateIcon, flagIcon, miniCar };
}

// ── Main class ───────────────────────────────────────────────────────────────

export class BarricadeRunner {
  constructor(displayEl, infoBarEl) {
    this.display = displayEl;
    this.infoBar = infoBarEl;
    this.running = false;
    this._boundKeyDown = null;
    this._boundKeyUp = null;
    this._rafId = null;
  }

  _resolveCanvas() {
    if (this.display && this.display.tagName === 'CANVAS') return this.display;
    return document.getElementById('asciiDisplay');
  }

  start(difficulty, onComplete, perks = {}) {
    this.onComplete = onComplete;
    this.perks = perks || {};   // supply perks (js/supplies.js minigamePerks)
    this.used = {};             // supplies consumed this run
    this.params = getDifficultyParams(difficulty);
    this.running = true;

    // Canvas setup (pixel art at native 320×180)
    this.canvas = this._resolveCanvas();
    this.canvas.width = W;
    this.canvas.height = H;
    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this._savedFilter = this.canvas.style.filter;
    this.canvas.style.filter = 'none';
    this._savedInfo = this.infoBar.textContent;
    if (!ART) ART = buildArt();

    // Player state
    this.playerCol = PLAYER_START_COL;
    this.playerRow = PLAYER_START_ROW;
    this.keysDown = {};
    this.touches = new Map();
    this.showTouch = touchFirst();

    // Speed & distance
    this.speed = this.params.baseSpeed;
    if (this.perks.boost) {      // fuel can: burst of speed off the line
      this.speed *= this.perks.boost;
      this.used.extra_fuel = 1;
    }
    this.distanceTraveled = 0;

    // Game state
    this.elapsed = 0;
    this.countdownElapsed = 0;
    this.inCountdown = true;
    this.obstacles = [];
    this.pickups = [];
    this.obstacleAccum = 0;
    this.pickupAccum = 0;
    this.suppliesCollected = 0;
    this.hitFlash = 0;           // seconds (visual only)
    this.ended = false;
    this.showingSceneCard = false;

    // Scrolling
    this.groundOffset = 0;
    this.scrollPx = 0;
    this.t = 0;
    this.shake = 0;
    this.particles = [];
    this.popups = [];
    this._exT = 0;

    this._bindInput();
    this._lastTime = performance.now();
    this._rafId = requestAnimationFrame((t) => this._tick(t));
  }

  stop() {
    this.running = false;
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    if (this._endTimer) { clearTimeout(this._endTimer); this._endTimer = null; }
    if (this._card) { this._card.stop(); this._card = null; }
    this._unbindInput();
    if (this.canvas && this._savedFilter !== undefined) { this.canvas.style.filter = this._savedFilter; this._savedFilter = undefined; }
    if (this._savedInfo !== undefined) { this.infoBar.textContent = this._savedInfo; this._savedInfo = undefined; }
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  _bindInput() {
    this._boundKeyDown = (e) => this._onKeyDown(e);
    this._boundKeyUp = (e) => this._onKeyUp(e);
    this._pd = (e) => {
      if (e.pointerType !== 'mouse') this.showTouch = true;
      const btn = this._buttonAt(pointerToArt(this.canvas, e));
      if (btn) {
        this.touches.set(e.pointerId, btn);
        try { this.canvas.setPointerCapture?.(e.pointerId); } catch { /* synthetic or already-released pointer */ }
        e.preventDefault();
      }
    };
    this._pm = (e) => { if (this.touches.has(e.pointerId)) this.touches.set(e.pointerId, this._buttonAt(pointerToArt(this.canvas, e))); };
    this._pu = (e) => { this.touches.delete(e.pointerId); };
    this._blur = () => { this.keysDown = {}; this.touches.clear(); };
    window.addEventListener('keydown', this._boundKeyDown);
    window.addEventListener('keyup', this._boundKeyUp);
    this.canvas.addEventListener('pointerdown', this._pd);
    this.canvas.addEventListener('pointermove', this._pm);
    window.addEventListener('pointerup', this._pu);
    window.addEventListener('pointercancel', this._pu);
    this.canvas.addEventListener('lostpointercapture', this._pu);
    window.addEventListener('blur', this._blur);
    this.canvas.classList.add('minigame-touch');
  }

  _unbindInput() {
    if (!this._boundKeyDown) return;
    window.removeEventListener('keydown', this._boundKeyDown);
    window.removeEventListener('keyup', this._boundKeyUp);
    this.canvas.removeEventListener('pointerdown', this._pd);
    this.canvas.removeEventListener('pointermove', this._pm);
    window.removeEventListener('pointerup', this._pu);
    window.removeEventListener('pointercancel', this._pu);
    this.canvas.removeEventListener('lostpointercapture', this._pu);
    window.removeEventListener('blur', this._blur);
    this.canvas.classList.remove('minigame-touch');
    this._boundKeyDown = null;
    this._boundKeyUp = null;
  }

  _onKeyDown(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const key = e.key.toLowerCase();
    if (['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d'].includes(key)) {
      e.preventDefault();
      this.keysDown[key] = true;
    }
  }

  _onKeyUp(e) {
    this.keysDown[e.key.toLowerCase()] = false;
  }

  // Touch buttons: ◀ ▶ bottom-left, ▲ ▼ stacked bottom-right
  static BUTTONS = [
    { id: 'arrowleft', label: 'left', x: 4, y: 154, w: 26, h: 22 },
    { id: 'arrowright', label: 'right', x: 34, y: 154, w: 26, h: 22 },
    { id: 'arrowup', label: 'up', x: 290, y: 128, w: 26, h: 22 },
    { id: 'arrowdown', label: 'down', x: 290, y: 154, w: 26, h: 22 },
  ];

  _buttonAt(p) {
    if (!p) return null;
    for (const b of BarricadeRunner.BUTTONS) {
      if (p.x >= b.x - 3 && p.x < b.x + b.w + 3 && p.y >= b.y - 3 && p.y < b.y + b.h + 3) return b.id;
    }
    return null;
  }

  _keys() {
    const k = { ...this.keysDown };
    for (const id of this.touches.values()) if (id) k[id] = true;
    return k;
  }

  // ── Loop ───────────────────────────────────────────────────────────────────

  _tick(now) {
    if (!this.running) return;
    const dt = Math.min((now - this._lastTime) / 1000, 0.1);
    this._lastTime = now;

    if (this.showingSceneCard) {
      // The pixel card (CardRunner) owns the canvas now
      this._updateInfoBar();
      this._rafId = requestAnimationFrame((t) => this._tick(t));
      return;
    }

    if (this.inCountdown) {
      this._updateCountdown(dt);
    } else if (!this.ended) {
      this._updateGame(dt);
    }
    this._updateFx(dt);

    if (!this.showingSceneCard) this._render();
    this._updateInfoBar();
    this._rafId = requestAnimationFrame((t) => this._tick(t));
  }

  _updateCountdown(dt) {
    this.countdownElapsed += dt;
    this.scrollPx += this.params.baseSpeed * 0.15 * PX * dt;    // idle crawl behind the title
    if (this.countdownElapsed >= COUNTDOWN_DURATION) this.inCountdown = false;
  }

  _updateGame(dt) {
    this.elapsed += dt;

    // Speed naturally recovers toward base
    if (this.speed < this.params.baseSpeed) {
      this.speed = Math.min(this.params.baseSpeed, this.speed + this.params.speedRecovery * dt);
    }

    // Distance traveled (speed = forward progress in cols/sec)
    this.distanceTraveled += this.speed * dt;

    // Ground scrolls at current speed
    this.groundOffset = (this.groundOffset + this.speed * dt) % WIDTH;
    this.scrollPx += this.speed * PX * dt;

    // Player: mostly lane changes, minor left/right dodging within the play area
    const vSpeed = 8 * dt;
    const k = this._keys();
    if (k['arrowup'] || k['w']) this.playerRow -= vSpeed;
    if (k['arrowdown'] || k['s']) this.playerRow += vSpeed;
    const hSpeed = 6 * dt;
    if (k['arrowleft'] || k['a']) this.playerCol -= hSpeed;
    if (k['arrowright'] || k['d']) this.playerCol += hSpeed;

    this.playerCol = Math.max(PLAY_MIN_COL, Math.min(PLAY_MAX_COL, this.playerCol));
    this.playerRow = Math.max(PLAY_MIN_ROW, Math.min(PLAY_MAX_ROW, this.playerRow));

    // Spawn obstacles
    this.obstacleAccum += this.params.hazardRate * dt;
    while (this.obstacleAccum >= 1) {
      this.obstacleAccum -= 1;
      const type = OBSTACLE_TYPES[Math.floor(Math.random() * OBSTACLE_TYPES.length)];
      const row = PLAY_MIN_ROW + Math.floor(Math.random() * (PLAY_MAX_ROW - PLAY_MIN_ROW + 1));
      const spd = this.params.hazardSpeedMin + Math.random() * (this.params.hazardSpeedMax - this.params.hazardSpeedMin);
      this.obstacles.push({ col: WIDTH - 1, row, speed: spd, seed: Math.random() * 10, ...type });
    }

    // Spawn pickups
    this.pickupAccum += this.params.pickupRate * dt;
    while (this.pickupAccum >= 1) {
      this.pickupAccum -= 1;
      const type = PICKUP_TYPES[Math.floor(Math.random() * PICKUP_TYPES.length)];
      const row = PLAY_MIN_ROW + Math.floor(Math.random() * (PLAY_MAX_ROW - PLAY_MIN_ROW + 1));
      this.pickups.push({ col: WIDTH - 1, row, speed: 8 + Math.random() * 4, seed: Math.random() * 10, ...type });
    }

    // Move obstacles & pickups
    for (const o of this.obstacles) o.col -= o.speed * dt;
    this.obstacles = this.obstacles.filter(o => o.col > -2);
    for (const p of this.pickups) p.col -= p.speed * dt;
    this.pickups = this.pickups.filter(p => p.col > -2);

    // Collision: obstacles slow player
    const pCol = Math.round(this.playerCol);
    const pRow = Math.round(this.playerRow);

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const o = this.obstacles[i];
      if (Math.round(o.row) === pRow && Math.abs(Math.round(o.col) - pCol) <= 1) {
        this.obstacles.splice(i, 1);
        this.speed = Math.max(0, this.speed - this.params.speedDrain * (this.perks.hitMult || 1));
        this.hitFlash = 0.3;
        this.shake = 1;
        this._crashFx(o);
      }
    }

    // Collision: pickups (nitro = speed boost, supplies = reward)
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      if (Math.round(p.row) === pRow && Math.abs(Math.round(p.col) - pCol) <= 1) {
        this.pickups.splice(i, 1);
        if (p.name === 'nitro') {
          this.speed = Math.min(this.params.baseSpeed * 1.5, this.speed + 5);
        } else {
          this.suppliesCollected++;
        }
        this._pickupFx(p);
      }
    }

    // Stall check: caught by raiders
    if (this.speed <= this.params.stallThreshold) {
      this._endGame('caught');
      return;
    }

    // Escape check: made it past the barricade zone
    if (this.distanceTraveled >= this.params.escapeDistance) {
      this._endGame('escaped');
    }
  }

  _endGame(outcome) {
    this.ended = true;
    this.outcome = outcome;
    this.showingSceneCard = true;

    // Pixel-art win/lose card on the same canvas, then report the result
    this._card = new CardRunner(this.canvas);
    this._card.start(barricadeCard, { won: outcome === 'escaped' });
    this._endTimer = setTimeout(() => {
      this._endTimer = null;
      this.stop();
      if (this.onComplete) this.onComplete(this._buildResult(outcome));
    }, SCENE_CARD_DURATION);
  }

  _buildResult(outcome) {
    const effects = {};

    if (outcome === 'escaped') {
      effects.morale = 8;
      effects.health = -5; // some vehicle damage regardless
      const supplyResources = ['fuel', 'water', 'food'];
      for (let i = 0; i < this.suppliesCollected; i++) {
        const key = supplyResources[Math.floor(Math.random() * supplyResources.length)];
        effects[key] = (effects[key] || 0) + 3;
      }
      return {
        survived: true,
        used: this.used,
        narrative: 'Metal screeches as you smash through the barricade. The family cheers — you\'re free!',
        effects,
      };
    } else {
      // caught
      effects.health = -20;
      effects.fuel = -15;
      effects.morale = -12;
      effects.food = -10;
      return {
        survived: false,
        used: this.used,
        narrative: 'The wreckage stalls the vehicle. Armed figures surround you, taking what they want.',
        effects,
      };
    }
  }

  // ── Effects (visual only) ──────────────────────────────────────────────────

  _carBox() {
    const front = Math.round((this.playerCol + 1.5) * PX - 4);
    const y = Math.round(laneTop(this.playerRow)) - 3;
    return { x: front - 40, y, front };
  }

  _crashFx(o) {
    const x = colCenter(o.col), y = laneTop(o.row) + 6;
    const cols = { barricade: ['#e04a1c', '#f0ece0'], wreckage: ['#6a3a26', '#3a4450'], barrier: ['#a8a49c', '#e8b830'], debris: ['#a87a3a', '#3a383c'] }[o.name];
    for (let i = 0; i < 16; i++) {
      this.particles.push({ x, y, vx: Math.random() * 120 - 20, vy: -Math.random() * 90 - 10, g: 260, life: 0.5 + Math.random() * 0.4, c: i % 3 ? '#ffe080' : '#ff8a2a', k: 'spark' });
    }
    for (let i = 0; i < 5; i++) {
      this.particles.push({ x, y, vx: Math.random() * 100 + 10, vy: -Math.random() * 80 - 20, g: 300, life: 0.8, c: cols[i % 2], k: 'chunk' });
    }
    this.popups.push({ x, y: y - 10, t: 0, s: 'CRASH!', c: '#ff8a6a' });
  }

  _pickupFx(p) {
    const x = colCenter(p.col), y = laneTop(p.row) + 5;
    const c = p.name === 'nitro' ? '#7ad8ff' : '#ffe060';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      this.particles.push({ x, y, vx: Math.cos(a) * 50, vy: Math.sin(a) * 50, drag: 3, life: 0.45, c, k: 'spark' });
    }
    this.popups.push({ x, y: y - 10, t: 0, s: p.name === 'nitro' ? 'NITRO!' : '+SUPPLIES', c });
  }

  _updateFx(dt) {
    this.t += dt;
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    this.shake = Math.max(0, this.shake - dt * 4);
    // Exhaust puffs from the tailpipe, faster when the engine is working harder
    const car = this._carBox();
    this._exT += dt * (this.inCountdown ? 6 : 8 + this.speed * 0.6);
    while (this._exT > 1) {
      this._exT--;
      this.particles.push({ x: car.x + 1, y: car.y + 11, vx: -30 - this.speed * 3 - Math.random() * 20, vy: -Math.random() * 8, life: 0.7, r0: 1.5 + Math.random(), k: 'smoke' });
    }
    // Smoke rising off wreckage
    for (const o of this.obstacles) {
      if (o.name === 'wreckage' && Math.random() < dt * 6) {
        this.particles.push({ x: colCenter(o.col) + Math.random() * 6 - 4, y: laneTop(o.row) - 2, vx: -o.speed * PX * 0.3, vy: -10 - Math.random() * 8, life: 1, r0: 1, k: 'smoke' });
      }
    }
    stepParticles(this.particles, dt);
    for (const p of this.popups) { p.t += dt; p.y -= 14 * dt; }
    this.popups = this.popups.filter(p => p.t < 0.8);
    if (this.particles.length > 260) this.particles.splice(0, this.particles.length - 260);
  }

  // ── Rendering ──────────────────────────────────────────────────────────────

  _render() {
    const g = this.ctx;
    const A = ART;
    const t = this.t;
    const run = this.scrollPx;

    g.save();
    if (this.shake > 0) g.translate(Math.round((Math.random() * 4 - 2) * this.shake), Math.round((Math.random() * 4 - 2) * this.shake));

    // Sky, stars, moon, glow of burning city
    g.drawImage(A.sky, 0, HUD_H - 4);
    for (const s of A.stars) {
      const tw = Math.floor(t * 3 + s.p) % 9;
      if (tw) R(g, s.x, s.y, 1, 1, tw === 4 ? '#ffffff' : '#7a76a0');
    }
    disc(g, 262, 32, 8, '#e8e4c8'); disc(g, 265, 30, 7, '#1a1236');
    drawWrap(g, A.far, run * 0.04, 20);
    const cityOff = run * 0.12;
    drawWrap(g, A.city, cityOff, 18);
    // Street fires and their smoke columns in the skyline
    for (const fx of A.fires) {
      const x = ((((fx - cityOff) % 480) + 480) % 480);
      if (x < -10 || x > W + 10) continue;
      flameWall(g, x - 3, x + 3, 50, 7, t, 1, fx);
      for (let k = 0; k < 4; k++) {
        const ph = (t * 0.5 + k * 0.25 + fx * 0.01) % 1;
        drawPuff(g, x + ph * 10, 43 - ph * 24, 2 + ph * 4, '#1a1420', null, 0.5);
      }
    }
    // Far shoulder with dead trees and power poles
    drawWrap(g, A.shoulder, run * 0.85, 50);
    for (let k = 0; k < 4; k++) {
      const px = W + 30 - (((run * 0.85) + k * 97) % 400);
      draw(g, A.snag, px + 40, ROAD_TOP - A.snag.h + 2);
    }
    const poleXs = [];
    for (let k = 0; k < 4; k++) {
      const px = W + 20 - (((run * 0.85) + k * 110) % 440);
      poleXs.push(px);
      draw(g, A.pole, px, ROAD_TOP - 33);
    }
    poleXs.sort((a, b) => a - b);
    for (let i = 0; i < poleXs.length - 1; i++) {
      const a = poleXs[i] + 5, b = poleXs[i + 1] + 5;
      if (b - a > 140) continue;
      for (let x = a; x < b; x++) R(g, x, ROAD_TOP - 32 + Math.round(Math.sin(((x - a) / (b - a)) * Math.PI) * 5), 1, 1, '#0a0810');
    }

    // Road
    drawWrap(g, A.road, run, ROAD_TOP);
    drawWrap(g, A.verge, run * 1.1, VERGE_Y);
    drawFlowers(g, A.flowers, t, run * 1.1, W + 8);

    // Speed lines when moving fast
    if (!this.inCountdown && this.speed > this.params.baseSpeed * 0.8) {
      const n = Math.round((this.speed / this.params.baseSpeed) * 6);
      for (let i = 0; i < n; i++) {
        const ly = LANE0 + ((i * 37) % (LANES * LANE_H)), lx = W - ((t * 420 + i * 89) % (W + 60));
        R(g, lx, ly, 10 + (i % 3) * 6, 1, i % 2 ? '#3a3848' : '#4a4a5c');
      }
    }

    // Lane objects, drawn top lane first so lower lanes overlap
    const items = [];
    for (const o of this.obstacles) items.push({ y: o.row, f: () => this._drawObstacle(g, o) });
    for (const p of this.pickups) items.push({ y: p.row, f: () => this._drawPickup(g, p) });
    items.push({ y: this.playerRow + 0.01, f: () => this._drawPlayer(g) });
    items.sort((a, b) => a.y - b.y);
    for (const it of items) it.f();

    // Particles and popups
    for (const p of this.particles) {
      const k = p.t / p.life;
      if (p.k === 'smoke') drawPuff(g, p.x, p.y, p.r0 + k * 4, k < 0.4 ? '#5a5664' : '#3a3644', null, 0.5);
      else if (p.k === 'chunk') R(g, p.x, p.y, 2, 2, p.c);
      else R(g, p.x, p.y, 1, 1, k < 0.5 ? p.c : '#ff6a2a');
    }
    for (const p of this.popups) {
      if (p.t > 0.6 && Math.floor(p.t * 20) % 2) continue;
      label(g, p.s, p.x, Math.round(p.y), p.c, 'center');
    }
    g.restore();

    // Red rim flash on a crash
    if (this.hitFlash > 0) {
      g.globalAlpha = Math.min(0.18, this.hitFlash * 0.7);
      R(g, 0, 0, W, H, '#ff2a10');
      g.globalAlpha = 1;
    }

    this._drawHUD(g);
    if (this.inCountdown) this._drawIntro(g);
    else if (this.showTouch) this._drawButtons(g);
  }

  _drawObstacle(g, o) {
    const spr = ART.obstacles[o.name];
    const cx = colCenter(o.col), base = laneTop(o.row) + 12;
    const x = Math.round(cx - spr.w / 2), y = base - spr.h;
    R(g, x + 1, base, spr.w, 1, 'rgba(0,0,0,0.45)');
    draw(g, spr, x, y);
    const t = this.t;
    if (o.name === 'barricade') {
      // flashing amber warning lamps on top
      const on = Math.floor(t * 4 + o.seed) % 2 === 0;
      R(g, x + 1, y - 2, 2, 2, on ? '#ffd040' : '#6a4a10');
      R(g, x + spr.w - 3, y - 2, 2, 2, on ? '#6a4a10' : '#ffd040');
      if (on) { g.globalAlpha = 0.25; disc(g, x + 2, y - 1, 4, '#ffb030'); g.globalAlpha = 1; }
    } else if (o.name === 'wreckage') {
      flameWall(g, x + 8, x + 15, y + 2, 7, t * 1.3, 1, o.seed * 10);
    }
  }

  _drawPickup(g, p) {
    const spr = ART.pickups[p.name];
    const cx = colCenter(p.col), base = laneTop(p.row) + 11;
    const bob = Math.round(Math.sin(this.t * 6 + p.seed) * 1.2);
    const x = Math.round(cx - spr.w / 2), y = base - spr.h - 1 + bob;
    const glow = p.name === 'nitro' ? '#5ac8ff' : '#ffd860';
    g.globalAlpha = 0.18 + 0.1 * Math.sin(this.t * 8 + p.seed);
    disc(g, cx, y + spr.h / 2, 8, glow);
    g.globalAlpha = 1;
    R(g, x + 1, base, spr.w - 1, 1, 'rgba(0,0,0,0.4)');
    draw(g, spr, x, y);
    if (Math.floor(this.t * 5 + p.seed) % 4 === 0) {           // twinkle
      R(g, x + spr.w, y - 1, 1, 3, '#ffffff'); R(g, x + spr.w - 1, y, 3, 1, '#ffffff');
    }
  }

  _drawPlayer(g) {
    const A = ART;
    const { x, y, front } = this._carBox();
    const bounce = !this.inCountdown && Math.floor(this.t * 12) % 3 === 0 ? 1 : 0;
    // Headlight beam
    g.globalAlpha = 0.18;
    g.fillStyle = '#fff2b0';
    g.beginPath(); g.moveTo(front - 1, y + 6); g.lineTo(front + 70, y + 1); g.lineTo(front + 70, y + 15); g.closePath(); g.fill();
    g.globalAlpha = 1;
    // Shadow
    R(g, x + 2, y + 16, 38, 1, 'rgba(0,0,0,0.5)');
    // Nitro flame when running faster than cruise
    if (!this.inCountdown && this.speed > this.params.baseSpeed * 1.02) {
      const len = 4 + Math.floor(this.t * 30) % 4;
      R(g, x - len, y + 10, len, 3, '#2a8ad8'); R(g, x - len + 2, y + 11, len - 2, 1, '#a8e0ff');
      R(g, x - len - 2, y + 11, 2, 1, '#ff8a2a');
    }
    const flashing = this.hitFlash > 0 && Math.floor(this.hitFlash * 30) % 2 === 0;
    drawCar(g, A.car, A.wheels, x, y, this.scrollPx, { bounce, sil: flashing ? '#ffffff' : null });
    if (!flashing) {
      // The family through the windows
      [[x + 5, '#3a2614', '#f1c27d'], [x + 13, '#8a5a2a', '#c68642'], [x + 20, '#d8b060', '#ffdbac']].forEach(([hx, hair, skin]) => {
        R(g, hx, y + 4 - bounce, 3, 1, hair); R(g, hx, y + 5 - bounce, 3, 1, skin);
      });
    }
  }

  _drawHUD(g) {
    const A = ART;
    plate(g, 0, 0, W, HUD_H);
    const base = this.params.baseSpeed;
    const pct = this.speed / base;
    const low = pct <= 0.3;
    const blink = low && Math.floor(this.t * 6) % 2 === 0;
    label(g, 'SPEED', 5, 6, low ? (blink ? '#ff5a3a' : '#ffffff') : '#ffffff');
    const boosted = pct > 1.01;
    meter(g, 38, 5, Math.min(1, pct), {
      n: 10, bw: 6, bh: 6,
      col: low ? (blink ? '#ff3a1a' : '#a01a10') : boosted ? '#3ac8ff' : pct < 0.6 ? '#f0b030' : '#3ad04a',
      hi: low ? '#ff9a8a' : boosted ? '#c8f4ff' : pct < 0.6 ? '#ffe8a0' : '#a8f8a0',
    });
    label(g, 'ESCAPE', 116, 6, '#ffffff');
    const dist = Math.min(1, this.distanceTraveled / this.params.escapeDistance);
    bar(g, 156, 7, 110, 6, dist, '#5ab0ff', '#c8e8ff');
    draw(g, A.miniCar, 154 + Math.round(dist * 104), 2);
    draw(g, A.flagIcon, 268, 5);
    draw(g, A.crateIcon, 279, 4);
    label(g, `X${this.suppliesCollected}`, 293, 6, '#ffe060');
  }

  _drawIntro(g) {
    g.globalAlpha = 0.62;
    R(g, 0, HUD_H, W, H - HUD_H, '#06040c');
    g.globalAlpha = 1;
    drawLogo(g, 'CRASH THE', W / 2, 26, 3, RED, '#140606');
    drawLogo(g, 'BARRICADE', W / 2, 52, 3, RED, '#140606');
    label(g, 'RAIDERS BLOCK THE HIGHWAY. KEEP YOUR SPEED UP!', W / 2, 84, '#ffe8c0', 'center');
    label(g, 'ARROWS / WASD: CHANGE LANES', W / 2, 95, '#c8c0d8', 'center');
    const names = [];
    if (this.perks.hitMult) names.push('TOOL KIT BUMPER');
    if (this.perks.boost) names.push('FUEL CAN BOOST');
    const lines = names.length ? wrapText('SUPPLIES: ' + names.join(', '), 50) : ['NO SUPPLIES FOR THIS ONE'];
    lines.slice(0, 2).forEach((ln, i) => label(g, ln, W / 2, 108 + i * 10, names.length ? '#7ad860' : '#8a8494', 'center'));
    // 3·2·1 over the 1.5 s countdown
    countdown(g, (COUNTDOWN_DURATION - this.countdownElapsed) * 2, W / 2, 130);
  }

  _drawButtons(g) {
    const held = new Set(this.touches.values());
    for (const b of BarricadeRunner.BUTTONS) touchButton(g, b.x, b.y, b.w, b.h, b.label, held.has(b.id) || !!this.keysDown[b.id]);
  }

  _updateInfoBar() {
    if (this.inCountdown) {
      this.infoBar.textContent = 'CRASH THE BARRICADE | Get ready...';
      return;
    }
    if (this.showingSceneCard) {
      this.infoBar.textContent = this.outcome === 'escaped'
        ? 'ESCAPED! You broke through!'
        : 'CAUGHT! The raiders have you...';
      return;
    }
    const spdPct = Math.round((this.speed / this.params.baseSpeed) * 100);
    const distPct = Math.round((this.distanceTraveled / this.params.escapeDistance) * 100);
    this.infoBar.textContent =
      `CRASH THE BARRICADE | [W/A/S/D] Dodge | Speed: ${spdPct}% | Escape: ${distPct}% | Supplies: ${this.suppliesCollected}`;
  }
}
