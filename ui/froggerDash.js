/**
 * froggerDash.js — River Crossing mini-game (Frogger-style)
 *
 * Triggered when the player chooses to ford a swollen river.
 * Player hops across floating logs and debris to reach the far bank.
 * Open water drains health; logs carry the player with the current.
 *
 * Game logic runs in an 80×45 logical grid (x in logical px, y as rows); the
 * art draws at the canvas's native 320×180 (4 art px per logical px across),
 * in the cut-scene style (ui/cutscenes/kit.js). Row heights on screen are
 * visual only — collisions depend on row index and x, as before.
 *
 * Public interface:
 *   new FroggerDash(canvasEl, infoBarEl)
 *   .start(difficulty, onComplete, weatherData, perks)
 *   .stop()
 */

import { CardRunner, riverCard } from './cutscenes/screensArt.js';
import {
  W, H, R, rng, ditherBands, ditherFill, ridge, strip, draw, sprite, painted, silhouette, text, stepParticles,
} from './cutscenes/kit.js';
import {
  INK, familySprites, drawFamily, pineSprite, roundTreeSprite, houseSprite, cloudSprite,
} from './cutscenes/sprites.js';
import {
  grassStrip, flowerField, drawFlowers, turbine, plate, meter, bar, touchButton, pointerToArt, touchFirst,
  drawLogo, countdown, label, wrapText, GOLD,
} from './minigames/art.js';

const PW    = 80;   // logical width  (game logic units)
const PH    = 45;   // logical height (kept for reference; rows are what matter)
const SX    = W / PW;   // art px per logical px (4)

// ── Layout ────────────────────────────────────────────────────────────────────
// Row 0  = far bank  (GOAL)
// Rows 1–5 = river lanes
// Row 6  = near bank (START)

const RIVER_ROWS = [1, 2, 3, 4, 5];

const LANE_DEFS = [
  { dir:  1, baseSpeed: 0.40, logW: 12, count: 3, color: '#8b5e1a', bark: '#6a3e0a' },
  { dir: -1, baseSpeed: 0.55, logW: 10, count: 3, color: '#7a4e12', bark: '#5a3008' },
  { dir:  1, baseSpeed: 0.70, logW:  9, count: 4, color: '#8b5e1a', bark: '#6a3e0a' },
  { dir: -1, baseSpeed: 0.45, logW: 14, count: 2, color: '#5a3e0e', bark: '#3a2008' }, // heavy debris
  { dir:  1, baseSpeed: 0.50, logW: 11, count: 3, color: '#7a4e12', bark: '#5a3008' },
];

const GAME_DURATION      = 35;   // seconds
const WATER_DAMAGE_RATE  = 35;   // health/sec when in open water
const PLAYER_W           = 5;
const FRAME_RATE         = 60;   // log speeds above are px per 60 Hz frame

// ── Screen layout (art px; visual only) ──────────────────────────────────────
const HUD_H     = 13;
const BANK_TOP  = 40;            // far bank grass
const RIVER_Y   = 54;            // first lane top
const LANE_H    = 20;
const NEAR_Y    = RIVER_Y + LANE_H * 5;   // 154: near bank
const laneTop = (row) => RIVER_Y + (row - 1) * LANE_H;
// Y of the car's wheel line for each row when standing/riding
const ROW_BOTTOM = [52, ...RIVER_ROWS.map(r => laneTop(r) + 10), 173];

// Touch buttons (art px)
const BTN = {
  l: [2, 148, 34, 30], r: [38, 148, 34, 30],
  d: [W - 72, 148, 34, 30], u: [W - 36, 148, 34, 30],
};

// ── Sprites ──────────────────────────────────────────────────────────────────

// Mini station wagon sized to the 5×4 logical hitbox (18×10 art + outline = 20 px).
const MINI_WAGON = [
  '...sSss.sSs.......',
  '..rrrrrrrrrrr.....',
  '..bBBBBBBBBBBb....',
  '.bBWWWBWWWBWwWb...',
  '.BBWwWBWwWBWWWBBBb',
  'TBBBBBBBBBBBBBBBBL',
  'TPPPPPPPPPPPPBBBBL',
  'bppppppppppppBBBBB',
  'CCKKKCCCCCCCCKKKCC',
  '..KK.........KK...',
];
const WAGON_PAL = {
  B: '#3a6ad0', b: '#2a4a98', W: '#9ad4f0', w: '#e8f8ff', T: '#e83828', L: '#ffe680', C: '#c8ccd4',
  K: '#1a1418', P: '#a8703a', p: '#7a4c22', r: '#3a3438', s: '#c89a5a', S: '#a87a40',
};

const CATTAIL = ['.b..', '.b.b', '.B.b', '.BgB', 'gBgB', 'g.gg', 'g.g.', 'gg..'];
const CATTAIL_PAL = { b: '#6a3a1a', B: '#7a4a24', g: '#4a8a3a' };
const ROCK = ['.hhh..', 'hRRRr.', 'RRRRrr', '.rrrr.'];
const ROCK_PAL = { h: '#a8a49a', R: '#7a766e', r: '#55524c' };

/** A floating log `w` art px long: bark body, grain, knots, moss, end grain. */
function logSprite(w, def, seed) {
  const r = rng(seed);
  const hiCol = def.color === '#5a3e0e' ? '#7a5a2a' : '#a87a3a';
  return painted(w, 14, (g) => {
    // Branch stub on top
    const sx = r.int(8, w - 14);
    R(g, sx, 0, 2, 3, def.bark); R(g, sx + 1, 0, 1, 2, def.color);
    // Body (rounded ends)
    R(g, 1, 2, w - 2, 12, def.color);
    R(g, 0, 3, 1, 10, def.color); R(g, w - 1, 3, 1, 10, def.color);
    R(g, 2, 3, w - 8, 2, hiCol);                       // top light
    R(g, 1, 11, w - 2, 3, def.bark);                   // underside shadow
    // Bark grain
    for (let y = 5; y < 11; y += 2) {
      for (let x = 2; x < w - 6;) {
        const len = r.int(4, 10);
        R(g, x, y, Math.min(len, w - 6 - x), 1, def.bark);
        x += len + r.int(2, 5);
      }
    }
    // Knots
    for (let k = 0; k < Math.max(1, Math.floor(w / 20)); k++) {
      const kx = r.int(4, w - 10), ky = r.int(5, 8);
      R(g, kx, ky, 3, 2, def.bark); R(g, kx + 1, ky, 1, 1, '#2a1404');
    }
    // Moss tufts
    for (let k = 0; k < 3; k++) { const mx = r.int(3, w - 8); R(g, mx, 2, r.int(2, 4), 1, '#5a8a3a'); }
    // End grain (cut face, right end)
    R(g, w - 6, 3, 5, 10, '#d8b070');
    R(g, w - 6, 3, 1, 10, '#a8803a');
    R(g, w - 4, 5, 2, 6, '#b88a48'); R(g, w - 3, 7, 1, 2, '#8a5a24');
    R(g, w - 5, 4, 3, 1, '#e8c890');
  }, INK);
}

/** Heavy-debris lane: a lashed raft of planks with a barrel and a tyre. */
function debrisSprite(w, seed) {
  const r = rng(seed);
  return painted(w, 14, (g) => {
    const planks = ['#8a6a3a', '#6a4a24', '#9a7a48', '#5a3e1e'];
    for (let x = 0, i = 0; x < w; x += 7, i++) {
      R(g, x, 7, Math.min(6, w - x), 7, planks[i % 4]);
      R(g, x, 7, Math.min(6, w - x), 1, '#b89a68');
      R(g, x + 2, 9, 1, 1, '#2a1a0a'); R(g, x + 2, 12, 1, 1, '#2a1a0a');
    }
    R(g, 0, 10, w, 1, '#3a2410');                     // lashing rope
    // Rusty barrel on its end
    const bx = r.int(4, 8);
    R(g, bx, 0, 10, 10, '#a8402a'); R(g, bx + 1, 0, 3, 10, '#d0603a'); R(g, bx + 8, 0, 2, 10, '#702418');
    R(g, bx, 2, 10, 1, '#4a1a10'); R(g, bx, 7, 10, 1, '#4a1a10');
    R(g, bx + 1, 0, 8, 1, '#e8806a');
    // Tyre lying on the deck
    const tx = w - r.int(16, 20);
    R(g, tx + 2, 3, 10, 6, '#1e1c20'); R(g, tx, 4, 14, 4, '#1e1c20');
    R(g, tx + 4, 5, 6, 2, '#6a6a70'); R(g, tx + 5, 5, 4, 1, '#8a8a90');
    R(g, tx + 2, 3, 10, 1, '#3a383e');
    // A broken board poking up
    const px = Math.round(w / 2) + r.int(-4, 2);
    R(g, px, 1, 3, 6, '#9a7a48'); R(g, px, 1, 1, 6, '#c8a878');
  }, INK);
}

// ── Main class ────────────────────────────────────────────────────────────────

export class FroggerDash {
  constructor(canvasEl, infoBarEl) {
    this.canvas  = canvasEl;
    this.infoBar = infoBarEl;
    this.ctx     = canvasEl.getContext('2d');
    this.running = false;
    this._rafId  = null;
    this._boundKeyDown = null;
    this._endScheduled = false;
  }

  start(difficulty, onComplete, weatherData, perks = {}) {
    this.onComplete  = onComplete;
    this.perks       = perks || {};   // supply perks (js/supplies.js minigamePerks)
    this.used        = {};            // supplies consumed this run
    this.difficulty  = Math.max(0, Math.min(1, difficulty || 0));
    this.weatherData = weatherData || null;
    this.running     = true;
    this._endScheduled = false;
    this.flood = !!(weatherData && weatherData.icon === 'flood');

    // Speed scales with difficulty and flood conditions
    const speedMult =
      (1 + this.difficulty * 0.6) *
      (this.flood ? 1.35 : 1);

    // Build lanes with randomised starting positions
    this.lanes = LANE_DEFS.map((def, i) => {
      const spacing = PW / def.count;
      return {
        def,
        logs: Array.from({ length: def.count }, (_, j) => ({
          x: j * spacing + Math.random() * (spacing - def.logW),
          width: def.logW,
          speed: def.baseSpeed * speedMult,
          spr: i === 3 ? debrisSprite(def.logW * SX, 40 + j) : logSprite(def.logW * SX, def, 10 + i * 7 + j),
        })),
        scroll: 0,
      };
    });

    // Player
    this.player = {
      row:     6,         // start at near bank
      x:       38,        // horizontal position (left edge of sprite)
      health:  100,
      inWater: false,
      riding:  null,      // { laneIdx, log } when on a log
    };
    this.face = 1;

    this.timer       = GAME_DURATION;
    this.state       = 'countdown';   // countdown → playing → won/failed
    this.countdown   = 3;
    this.frameCount  = 0;
    this.lastTime    = null;
    this.t           = 0;             // animation clock (s)
    this.parts       = [];
    this.rain        = [];
    this.flashT      = 0;
    this.boltT       = 3;
    this.aidT        = 0;
    this.pressed     = null;          // { btn, t } for button highlight
    this.showTouch   = touchFirst();

    // Keyboard + pointer
    this._boundKeyDown = (e) => this._onKey(e);
    window.addEventListener('keydown', this._boundKeyDown);
    this._boundPointer = (e) => this._onPointer(e);
    this.canvas.addEventListener('pointerdown', this._boundPointer);
    this.canvas.classList.add('minigame-touch');

    // Native art resolution; save what the host had so stop() can restore it
    this.canvas.width  = W;
    this.canvas.height = H;
    this.ctx.imageSmoothingEnabled = false;
    this._savedFilter = this.canvas.style.filter;
    this.canvas.style.filter = 'none';
    this._savedInfo = this.infoBar.textContent;

    this._buildArt();
    this._rafId = requestAnimationFrame((t) => this._loop(t));
  }

  stop() {
    this.running = false;
    if (this._rafId) { cancelAnimationFrame(this._rafId); this._rafId = null; }
    if (this._card) { this._card.stop(); this._card = null; }
    if (this._boundKeyDown) {
      window.removeEventListener('keydown', this._boundKeyDown);
      this._boundKeyDown = null;
    }
    if (this._boundPointer) {
      this.canvas.removeEventListener('pointerdown', this._boundPointer);
      this._boundPointer = null;
      this.canvas.classList.remove('minigame-touch');
    }
    if (this._savedFilter !== undefined) { this.canvas.style.filter = this._savedFilter; this._savedFilter = undefined; }
    if (this._savedInfo !== undefined) { this.infoBar.textContent = this._savedInfo; this._savedInfo = undefined; }
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  _onKey(e) {
    if (!this.running || this.state !== 'playing') return;
    const k = e.key;
    let act = null;
    if (k === 'ArrowUp' || k === 'w' || k === 'W') act = 'u';
    else if (k === 'ArrowDown' || k === 's' || k === 'S') act = 'd';
    else if (k === 'ArrowLeft' || k === 'a' || k === 'A') act = 'l';
    else if (k === 'ArrowRight' || k === 'd' || k === 'D') act = 'r';
    if (!act) return;
    e.preventDefault();
    this._act(act);
  }

  _act(act) {
    const { player } = this;
    if (act === 'u') {
      if (player.row > 0) { player.row--; player.riding = null; }
    } else if (act === 'd') {
      if (player.row < 6) { player.row++; player.riding = null; }
    } else if (act === 'l') {
      player.x = Math.max(1, player.x - 5); this.face = -1;
    } else if (act === 'r') {
      player.x = Math.min(PW - PLAYER_W - 1, player.x + 5); this.face = 1;
    }
  }

  // Buttons in the bottom corners; elsewhere, tap above/below the car to hop
  // and beside it to shift.
  _onPointer(e) {
    if (!this.running) return;
    if (e.pointerType && e.pointerType !== 'mouse') this.showTouch = true;
    if (this.state !== 'playing') return;
    e.preventDefault();
    const p = pointerToArt(this.canvas, e);
    let act = null;
    if (this.showTouch) {
      for (const [k, [x, y, w, h]] of Object.entries(BTN)) {
        if (p.x >= x && p.x < x + w && p.y >= y && p.y < y + h) act = k;
      }
    }
    if (!act) {
      const cy = ROW_BOTTOM[this.player.row] - 6;
      if (p.y < cy - 10) act = 'u';
      else if (p.y > cy + 10) act = 'd';
      else act = p.x < (this.player.x + PLAYER_W / 2) * SX ? 'l' : 'r';
    }
    this.pressed = { btn: act, t: 0.15 };
    this._act(act);
  }

  // ── Game loop ──────────────────────────────────────────────────────────────

  _loop(timestamp) {
    if (!this.running) return;

    const dt = this.lastTime
      ? Math.max(0, Math.min((timestamp - this.lastTime) / 1000, 0.1))
      : 0;
    this.lastTime = timestamp;
    this.frameCount++;

    this._update(dt);
    this._animate(dt);
    this._draw();

    if (this.state === 'playing' || this.state === 'countdown') {
      this._rafId = requestAnimationFrame((t) => this._loop(t));
    } else if (!this._endScheduled) {
      // Show result card for 2 s then hand back to game
      this._endScheduled = true;
      setTimeout(() => {
        this.stop();
        this.onComplete(this._buildResult());
      }, 2000);
    }
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  _update(dt) {
    // Countdown phase
    if (this.state === 'countdown') {
      this.countdown -= dt;
      if (this.countdown <= 0) this.state = 'playing';
      return;
    }

    if (this.state !== 'playing') return;

    const { player, lanes } = this;
    const step = FRAME_RATE * dt;   // 60 Hz frames elapsed

    // Timer
    this.timer -= dt;
    if (this.timer <= 0) { this.state = 'failed'; return; }

    // Move all logs
    lanes.forEach(({ def, logs }) => {
      logs.forEach((log) => {
        log.x += def.dir * log.speed * step;
        // Wrap with a small buffer so logs don't pop into view
        if (def.dir ===  1 && log.x >  PW)              log.x = -log.width;
        if (def.dir === -1 && log.x + log.width < 0)    log.x =  PW;
      });
    });

    // If riding a log, drift with it
    if (player.riding) {
      const { laneIdx, log } = player.riding;
      const def = lanes[laneIdx].def;
      player.x += def.dir * log.speed * step;

      // Drifted off-screen = swept away
      if (player.x < -PLAYER_W || player.x > PW) {
        player.health = 0;
        this.state = 'failed';
        return;
      }
    }

    // Win check
    if (player.row === 0) { this.state = 'won'; return; }

    // River collision — are we on a log?
    const inRiver = RIVER_ROWS.includes(player.row);
    const wasInWater = player.inWater;

    if (inRiver) {
      const laneIdx = player.row - 1; // row 1→lane 0, …, row 5→lane 4
      const logs    = lanes[laneIdx].logs;

      const pLeft  = player.x;
      const pRight = player.x + PLAYER_W;

      let ridden = null;
      for (const log of logs) {
        if (pRight > log.x + 1 && pLeft < log.x + log.width - 1) {
          ridden = { laneIdx, log };
          break;
        }
      }

      player.riding  = ridden;
      player.inWater = !ridden;

      if (player.inWater) {
        if (!wasInWater) this._splash(14);
        player.health = Math.max(0, player.health - WATER_DAMAGE_RATE * (this.perks.waterMult || 1) * dt);
        // First aid kit: one emergency heal per crossing
        if (this.perks.firstAid && !this.used.first_aid && player.health > 0 && player.health < 30) {
          player.health = Math.min(100, player.health + 30);
          this.used.first_aid = 1;
          this.aidT = 1.4;
        }
        if (player.health <= 0) { this.state = 'failed'; }
      }
    } else {
      // On a bank — safe
      player.riding  = null;
      player.inWater = false;
    }
  }

  // ── Visual-only animation (water, particles, weather) ──────────────────────

  _animate(dt) {
    this.t += dt;
    this.aidT = Math.max(0, this.aidT - dt);
    if (this.pressed) { this.pressed.t -= dt; if (this.pressed.t <= 0) this.pressed = null; }
    for (const ln of this.lanes) ln.scroll += ln.def.dir * ln.logs[0].speed * FRAME_RATE * SX * dt;

    const p = this.player;
    if (p.inWater && this.state === 'playing' && Math.random() < dt * 24) this._splash(1);
    stepParticles(this.parts, dt);

    if (this.flood) {
      for (let i = 0; i < 90 * dt; i++) this.rain.push({ x: Math.random() * (W + 40), y: -4, vx: -40, vy: 220 + Math.random() * 60, life: 1.2 });
      stepParticles(this.rain, dt);
      this.boltT -= dt;
      this.flashT = Math.max(0, this.flashT - dt);
      if (this.boltT <= 0) { this.boltT = 4 + Math.random() * 4; this.flashT = 0.18; }
    }
  }

  _splash(n) {
    const cx = (this.player.x + PLAYER_W / 2) * SX, y = ROW_BOTTOM[this.player.row];
    for (let i = 0; i < n; i++) {
      this.parts.push({
        x: cx + (Math.random() - 0.5) * 18, y: y - 2, vx: (Math.random() - 0.5) * 50,
        vy: -30 - Math.random() * 50, g: 240, life: 0.5 + Math.random() * 0.3,
      });
    }
  }

  // ── Art (built once per run) ───────────────────────────────────────────────

  _buildArt() {
    const flood = this.flood;
    this.art = {};
    const A = this.art;
    A.sky = strip(W, BANK_TOP + 6, (g, w, h) => ditherBands(g, 0, 0, w, h, flood
      ? ['#121a24', '#1a2430', '#2a3a4a', '#3a4e5e', '#566a78']
      : ['#2a64c0', '#3a7ad8', '#5a9ae8', '#8ac0f0', '#c0e0f8']));
    A.cloud = flood ? cloudSprite(true, { W: '#4a5868', w: '#36424e', h: '#5a6878' }) : cloudSprite(true);
    A.cloudS = flood ? cloudSprite(false, { W: '#3e4a58', w: '#2e3844', h: '#4a5868' }) : cloudSprite(false);
    let farTops = [];
    A.far = strip(W, 40, (g, w, h) => {
      farTops = ridge(g, w, h, { amp: 16, base: 38, seed: 61, color: flood ? '#24343a' : '#6a8ac0', hi: flood ? '#3a4a50' : '#9ab4d8' });
    });
    A.farTops = farTops;
    const tree = flood ? roundTreeSprite({ G: '#2a5a3a', g: '#1e4a2c', h: '#3a7a4a', T: '#4a3424', t: '#36261a' }) : roundTreeSprite();
    const pine = flood ? pineSprite({ G: '#1e4a2e', g: '#163a24', h: '#2e5e3a', T: '#3a2a1a' }) : pineSprite();
    const house = houseSprite(undefined, flood);
    A.mid = strip(W, 32, (g, w, h) => {
      const tops = ridge(g, w, h, { amp: 8, base: 30, seed: 62, color: flood ? '#1e3a2a' : '#3a7a3a', hi: flood ? '#2e5a3a' : '#8ad06a', shade: flood ? '#16301e' : '#2a5a2a' });
      draw(g, house, 196, tops[205] - 12);
      for (const x of [10, 34, 62, 92, 126, 160, 232, 262]) {
        const t2 = x % 3 ? tree : pine;
        draw(g, t2, x, tops[x + 5] - t2.h + 4);
      }
    });
    // Far bank: grass, mud lip
    A.bank = strip(W, RIVER_Y - BANK_TOP, (g, w, h) => {
      g.drawImage(flood ? grassStrip('#3a6a2e', '#2a5222', '#5a8a42', h, 7, W) : grassStrip('#4a9a3a', '#3a7a2a', '#8ad06a', h, 7, W), 0, 0);
      R(g, 0, 0, w, 1, flood ? '#5a8a42' : '#8ad06a');
      R(g, 0, h - 3, w, 3, '#5a4630'); ditherFill(g, 0, h - 3, w, 3, '#6a5a44', 0.4);
      R(g, 0, h - 3, w, 1, '#7a6a50');
    });
    // River base: deep banded water with lane seams
    A.river = strip(W, LANE_H * 5, (g, w, h) => {
      ditherBands(g, 0, 0, w, h, flood
        ? ['#6a6448', '#5a5a3e', '#4e4e36', '#44442e', '#3a3a28']
        : ['#2e74c8', '#2a6ac0', '#225aa8', '#1c4a92', '#1a3e80']);
      for (let k = 1; k < 5; k++) ditherFill(g, 0, k * LANE_H - 1, w, 2, flood ? '#34321e' : '#163470', 0.5);
    });
    // Near bank: wet mud lip, grass, rocks and reeds
    const rock = sprite(ROCK, ROCK_PAL, { outline: INK });
    const reed = sprite(CATTAIL, CATTAIL_PAL, { outline: INK });
    A.near = strip(W, H - NEAR_Y, (g, w, h) => {
      R(g, 0, 0, w, 5, '#5a4630'); ditherFill(g, 0, 0, w, 5, '#6a5a44', 0.35);
      R(g, 0, 0, w, 1, '#3a2a1c');
      g.drawImage(flood ? grassStrip('#3a6a2e', '#2a5222', '#5a8a42', h - 5, 9, W) : grassStrip('#4a9a3a', '#3a7a2a', '#8ad06a', h - 5, 9, W), 0, 5);
      R(g, 0, 5, w, 1, flood ? '#5a8a42' : '#8ad06a');
      for (const x of [118, 214, 300]) draw(g, rock, x, 2);
    });
    A.reed = reed;
    A.wagon = sprite(MINI_WAGON, WAGON_PAL, { outline: INK });
    A.hurt = silhouette(A.wagon, '#ff5a4a');
    A.fam = familySprites(null);
    A.farFlowers = flowerField(21, 16, 4, W - 4, BANK_TOP + 6, RIVER_Y - 5);
    A.nearFlowers = flowerField(22, 14, 4, W - 4, NEAR_Y + 12, H - 2);
    A.clouds = [{ x: 20, y: 16, big: true, v: 4 }, { x: 150, y: 22, big: false, v: 6 }, { x: 240, y: 14, big: true, v: 3 }];
    const perkNames = [];
    if (this.perks.waterMult) perkNames.push('TOOL KIT ROPE');
    if (this.perks.firstAid) perkNames.push('FIRST AID');
    A.perkLines = perkNames.length ? wrapText('SUPPLIES: ' + perkNames.join(', '), 46) : null;
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  _draw() {
    const { ctx: g, player, lanes, art: A, t } = this;

    // Win / fail: hand the canvas to the pixel-art scene card
    if (this.state === 'won' || this.state === 'failed') {
      if (!this._card) {
        const won = this.state === 'won';
        this._card = new CardRunner(this.canvas);
        this._card.start(riverCard, {
          won,
          title: won ? 'ACROSS!' : (player.health <= 0 ? 'SWEPT AWAY!' : 'TIME\'S UP!'),
        });
        this.infoBar.textContent = won ? 'FORD THE RIVER — ACROSS! The far bank holds.' : 'FORD THE RIVER — the current wins this time.';
      }
      return;
    }

    // ── Sky, clouds, ridges ─────────────────────────────────────────────
    g.drawImage(A.sky, 0, 0);
    for (const c of A.clouds) {
      const spr = c.big ? A.cloud : A.cloudS;
      const x = ((c.x + t * c.v) % (W + 40)) - 30;
      draw(g, spr, x, c.y);
    }
    g.drawImage(A.far, 0, 6);
    if (!this.flood) {
      for (let k = 0; k < 3; k++) {
        const x = 236 + k * 20;
        turbine(g, x, 6 + A.farTops[x] + 4, 22 - k * 3, t * 2 + k);
      }
    }
    g.drawImage(A.mid, 0, BANK_TOP - 28);

    // ── Far bank (goal) ─────────────────────────────────────────────────
    g.drawImage(A.bank, 0, BANK_TOP);
    drawFlowers(g, A.farFlowers, t);
    for (const x of [6, 72, 180, 286]) draw(g, A.reed, x, RIVER_Y - 10);
    this._goalSign(g);

    // ── River ───────────────────────────────────────────────────────────
    g.drawImage(A.river, 0, RIVER_Y);
    this._water(g, t);
    // Water lapping on both banks
    for (let x = 0; x < W; x += 6) {
      const o = Math.round(Math.sin(t * 3 + x * 0.3));
      R(g, x + o, RIVER_Y, 4, 1, this.flood ? '#b8b8a0' : '#c8e8ff');
      R(g, x + 3 - o, NEAR_Y - 1, 3, 1, this.flood ? '#a8a890' : '#a8d8ff');
    }

    // ── Logs and debris ─────────────────────────────────────────────────
    lanes.forEach(({ logs }, i) => {
      const top = laneTop(i + 1);
      logs.forEach((log, j) => {
        const lx = Math.round(log.x * SX), bob = this._bob(i, j);
        const ly = top + 3 + bob;
        // Shadow / wake in the water
        ditherFill(g, lx + 2, top + 17, log.width * SX - 2, 2, this.flood ? '#2a2a1c' : '#102a5a', 0.6);
        draw(g, log.spr, lx, ly);
        // Waterline lapping over the underside
        for (let x = 1; x < log.width * SX - 1; x += 3) {
          const o = (Math.floor(t * 6) + x) % 2;
          R(g, lx + x + o, ly + 13, 2, 1, this.flood ? '#8a8a70' : '#6aaae8');
        }
        // Foam at the upstream end
        const fx = lanes[i].def.dir > 0 ? lx - 3 : lx + log.width * SX + 1;
        R(g, fx, ly + 10 + (Math.floor(t * 8) % 2), 2, 1, '#e8f4ff');
        R(g, fx + (lanes[i].def.dir > 0 ? -2 : 2), ly + 12, 2, 1, '#c8e0f0');
      });
    });

    // ── Near bank (start) ───────────────────────────────────────────────
    g.drawImage(A.near, 0, NEAR_Y);
    drawFlowers(g, A.nearFlowers, t);
    for (const x of [96, 196, 258]) draw(g, A.reed, x, NEAR_Y - 4);
    drawFamily(g, A.fam, 84, H - 5, 'idle', { t, gap: 10 });

    // ── Player ──────────────────────────────────────────────────────────
    this._drawPlayer(g, t);
    for (const p of this.parts) R(g, p.x, p.y, 1, 2, p.t < 0.25 ? '#ffffff' : '#a8d8ff');

    // ── Weather ─────────────────────────────────────────────────────────
    if (this.flood) {
      for (const d of this.rain) R(g, d.x, d.y, 1, 3, '#8a9ab0');
      if (this.flashT > 0) { g.globalAlpha = 0.3; R(g, 0, 0, W, H, '#e8f0ff'); g.globalAlpha = 1; }
    }

    // ── HUD ─────────────────────────────────────────────────────────────
    this._hud(g, t);
    if (this.showTouch && this.state === 'playing') {
      for (const [k, [x, y, w, h]] of Object.entries(BTN)) {
        touchButton(g, x, y, w, h, { l: 'left', r: 'right', u: 'up', d: 'down' }[k], this.pressed?.btn === k);
      }
    }
    if (this.aidT > 0 && Math.floor(t * 8) % 4) label(g, 'FIRST AID!', W / 2, HUD_H + 6, '#ff8a8a', 'center');

    // ── Countdown card ──────────────────────────────────────────────────
    if (this.state === 'countdown') this._intro(g);

    // ── Info bar ─────────────────────────────────────────────────────────
    const rowLabel =
      player.row === 0 ? '🏁 FAR BANK' :
      player.row === 6 ? '🟫 Near bank' :
      `🌊 River (lane ${player.row}/5)`;
    const hpLabel  = `♥ ${Math.round(player.health)}%`;
    const tmLabel  = `⏱ ${Math.max(0, Math.round(this.timer))}s`;
    const hint     = this.state === 'countdown' ? '' : ' | ↑↓ hop  ←→ shift';
    this.infoBar.textContent =
      `FORD THE RIVER — ${rowLabel} | ${hpLabel} | ${tmLabel}${hint}`;
  }

  _bob(lane, j) { return Math.round(Math.sin(this.t * 2.6 + lane * 1.7 + j * 2.3) * 0.8); }

  // Current crests scrolling with each lane's flow
  _water(g, t) {
    const lite = this.flood ? '#8a8668' : '#6aaae8', crest = this.flood ? '#b8b498' : '#c8e8ff';
    this.lanes.forEach((ln, i) => {
      const top = laneTop(i + 1);
      for (const [dy, ph, len] of [[4, 0, 6], [11, 11, 4], [16, 5, 5]]) {
        const off = ((ln.scroll + ph + dy * 7) % 24 + 24) % 24;
        for (let x = -24; x < W + 24; x += 24) {
          const xx = Math.round(x + off);
          R(g, xx, top + dy, len, 1, lite);
          if (dy !== 16) R(g, xx + 2, top + dy - 1, 2, 1, crest);
        }
      }
    });
  }

  _goalSign(g) {
    const sx = 140, sy = BANK_TOP - 9, sw = 42;
    R(g, sx + 6, sy + 9, 2, 8, '#5a3a20'); R(g, sx + sw - 8, sy + 9, 2, 8, '#5a3a20');
    R(g, sx - 1, sy - 1, sw + 2, 12, INK);
    R(g, sx, sy, sw, 10, '#8a6a3a'); R(g, sx, sy, sw, 1, '#b89a68');
    text(g, 'SAFE', sx + sw / 2, sy + 2, { align: 'center', color: '#fff8d0', shadow: '#3a2410' });
  }

  _drawPlayer(g, t) {
    const p = this.player, A = this.art;
    let bottom = ROW_BOTTOM[p.row];
    if (p.riding) bottom += this._bob(p.riding.laneIdx, p.riding.log ? this.lanes[p.riding.laneIdx].logs.indexOf(p.riding.log) : 0);
    const sink = p.inWater ? 3 + Math.round(Math.sin(t * 7) * 1) : 0;
    const x = Math.round(p.x * SX) + 1, y = bottom - A.wagon.h + sink;
    const flick = p.inWater && Math.floor(t * 12) % 2 === 0;
    draw(g, flick ? A.hurt : A.wagon, x, y, this.face < 0);
    if (p.inWater) {
      // Water swallowing the wheels and lower body
      const wl = bottom - 1;
      const water = (this.flood ? ['#6a6448', '#5a5a3e', '#4e4e36', '#44442e', '#3a3a28']
        : ['#2e74c8', '#2a6ac0', '#225aa8', '#1c4a92', '#1a3e80'])[p.row - 1];
      for (let dx = -3; dx < PLAYER_W * SX + 3; dx++) {
        const wy = wl + Math.round(Math.sin(dx * 0.6 + t * 9));
        R(g, x - 1 + dx, wy, 1, sink + 3, water);
        R(g, x - 1 + dx, wy, 1, 1, '#e8f4ff');
      }
    }
    // Leader marker above the car
    if (this.state === 'playing' && p.row !== 0) R(g, x + 8, y - 4 + (Math.floor(t * 4) % 2), 2, 2, '#ffd040');
  }

  _hud(g, t) {
    const p = this.player;
    plate(g, 0, 0, W, HUD_H, { alpha: 0.92 });
    text(g, 'HP', 4, 3, { color: '#ff9a9a', shadow: INK });
    const hc = p.health > 60 ? ['#3ad04a', '#a8f8a0'] : p.health > 30 ? ['#e8a020', '#ffe08a'] : ['#e83a2a', '#ffa08a'];
    meter(g, 17, 2, p.health / 100, { col: hc[0], hi: hc[1], bh: 7 });
    const lane = p.row === 0 ? 'FAR BANK' : p.row === 6 ? 'NEAR BANK' : `LANE ${6 - p.row}/5`;
    text(g, lane, W / 2, 3, { align: 'center', color: p.inWater ? '#ff8a7a' : '#ffe8a0', shadow: INK });
    const low = this.timer < 8 && Math.floor(t * 4) % 2;
    bar(g, W - 86, 3, 56, 7, this.timer / GAME_DURATION, low ? '#e83a2a' : '#4a8ae8', low ? '#ffa08a' : '#a8d0ff');
    text(g, `${Math.max(0, Math.ceil(this.timer))}S`, W - 4, 3, { align: 'right', color: '#e8e4f0', shadow: INK });
  }

  _intro(g) {
    const A = this.art;
    g.globalAlpha = 0.55; R(g, 0, HUD_H, W, H - HUD_H, '#06080e'); g.globalAlpha = 1;
    drawLogo(g, 'FORD THE RIVER', W / 2, 24, 3, GOLD);
    countdown(g, this.countdown, W / 2, 58);
    label(g, 'RIDE THE LOGS TO THE FAR BANK.', W / 2, 98, '#ffffff', 'center');
    label(g, 'OPEN WATER HURTS - DON\'T DRIFT OFF!', W / 2, 108, '#a8d8ff', 'center');
    label(g, this.showTouch ? 'TAP ABOVE/BELOW TO HOP, BUTTONS TO SHIFT' : 'ARROWS / WASD: HOP LANES AND SHIFT', W / 2, 120, '#c8c4d8', 'center');
    if (A.perkLines) A.perkLines.slice(0, 2).forEach((ln, i) => label(g, ln, W / 2, 132 + i * 10, '#7ae07a', 'center'));
    else label(g, 'NO SUPPLIES FOR THIS ONE', W / 2, 132, '#8a8698', 'center');
  }

  // ── Result builder ─────────────────────────────────────────────────────────

  _buildResult() {
    const healthLost = Math.round(100 - this.player.health);

    if (this.state === 'won') {
      const cleanCross = healthLost < 10;
      return {
        survived: true,
        won: true,
        used: this.used,
        narrative: cleanCross
          ? 'Log by log, you pick your way across the churning current without a scratch. The far bank rises solid under your wheels.'
          : 'You make it — barely. Water floods the floorboards twice, but sheer momentum gets you across the debris-choked river.',
        effects: {
          health:  -Math.max(0, healthLost),
          morale:  cleanCross ? 10 : 5,
          fuel:    -5,
        },
      };
    } else {
      const sweptAway = this.player.health <= 0;
      return {
        survived: false,
        won: false,
        used: this.used,
        narrative: sweptAway
          ? 'The current takes you downstream. You claw back to the near bank, soaked and shaking, vehicle scraped along gravel.'
          : 'Time runs out in mid-crossing. The water rises. You retreat to the near bank before you lose the vehicle entirely.',
        effects: {
          health:  -28,
          morale:  -12,
          fuel:    -8,
        },
      };
    }
  }
}
