/**
 * froggerDash.js — Ford the River mini-game
 *
 * Triggered when the player chooses to ford a swollen river. The family
 * crosses one member at a time, hopping across floating logs and debris to
 * reach the far bank. Open water drains the wader's health; logs carry them
 * with the current.
 *
 * Every living family member is one try. If the river takes the wader (health
 * runs out, they drift off-screen or time runs out), that member is lost and
 * the next one steps up. The first to reach the far bank ties off a line and
 * the rest follow. The members lost are returned in `result.lost` (indices into
 * the family array) and main.js kills them through the event death path
 * (js/events.js killFamilyMember).
 *
 * Game logic runs in an 80×45 logical grid (x in logical px, y as rows); the
 * art draws at the canvas's native 320×180 (4 art px per logical px across),
 * in the cut-scene style (ui/cutscenes/kit.js). Row heights on screen are
 * visual only — collisions depend on row index and x.
 *
 * Public interface:
 *   new FroggerDash(canvasEl, infoBarEl)
 *   .start(difficulty, onComplete, weatherData, perks, { family })
 *   .stop()
 */

import { CardRunner, riverCard } from './cutscenes/screensArt.js';
import {
  W, H, R, rng, ditherBands, ditherFill, ridge, strip, draw, sprite, painted, silhouette, text, stepParticles, ease,
} from './cutscenes/kit.js';
import {
  INK, pineSprite, roundTreeSprite, houseSprite, cloudSprite, SHIRTS, SKINS,
} from './cutscenes/sprites.js';
import {
  grassStrip, flowerField, drawFlowers, turbine, plate, meter, bar, touchButton, pointerToArt, touchFirst,
  drawLogo, countdown, label, wrapText, GOLD, BLUE,
} from './minigames/art.js';
import { runnerSprites } from './minigames/shedArt.js';

const PW    = 80;   // logical width  (game logic units)
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

const GAME_DURATION      = 35;   // seconds per try
const WATER_DAMAGE_RATE  = 35;   // health/sec when in open water
const FRAME_RATE         = 60;   // log speeds above are px per 60 Hz frame
const START_X            = 38;   // where each wader steps off the near bank (logical px)

// GAMEPLAY TUNING (not climate data): the wader's hitbox matches the 12-px-wide
// family sprite (3 logical px; the old mini wagon was 5).
const PLAYER_W           = 3;
// GAMEPLAY TUNING (not climate data): pacing between tries, in seconds.
const LOST_PAUSE         = 2.4;  // show who the river took
const NEXT_PAUSE         = 1.6;  // the next family member walks up to the water
const END_PAUSE          = 2;    // final card before handing back to the game

// ── Screen layout (art px; visual only) ──────────────────────────────────────
const HUD_H     = 13;
const BANK_TOP  = 40;            // far bank grass
const RIVER_Y   = 54;            // first lane top
const LANE_H    = 20;
const NEAR_Y    = RIVER_Y + LANE_H * 5;   // 154: near bank
const laneTop = (row) => RIVER_Y + (row - 1) * LANE_H;
// Y of the wader's feet for each row (on the far bank, on a log, on the near bank)
const FEET = [52, ...RIVER_ROWS.map(r => laneTop(r) + 6), 172];
const QUEUE_X = 84;    // art px: where the waiting family stands on the near bank
const QUEUE_GAP = 12;
const HOP_T = 0.18;     // seconds of hop / step animation (visual only)

// Touch buttons (art px)
const BTN = {
  l: [2, 148, 34, 30], r: [38, 148, 34, 30],
  d: [W - 72, 148, 34, 30], u: [W - 36, 148, 34, 30],
};

// ── Sprites ──────────────────────────────────────────────────────────────────

const isChild = (m) => typeof m.age === 'number' && m.age < 13;   // same cut-off as the cut-scene sprites
/** Name as the 5×7 font can draw it. */
const shortName = (m) => String(m.name || 'YOU').toUpperCase().replace(/[^A-Z0-9 .'-]/g, '').trim().slice(0, 10) || 'YOU';
/** "A", "A and B", "A, B and C". */
const nameList = (names) => names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;

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

  start(difficulty, onComplete, weatherData, perks = {}, opts = {}) {
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

    // Family: every living member gets one try. Adults go before children and
    // the leader goes last (the game's rule: leaders die last).
    const fam = opts.family && opts.family.length ? opts.family : [{ name: 'You', alive: true, isLeader: true }];
    this.family = fam;
    let alive = fam.map((m, i) => ({ m, i })).filter(e => e.m.alive !== false);
    if (!alive.length) alive = [{ m: { name: 'You' }, i: -1 }];
    alive.forEach((e, k) => { e.k = k; });   // sprite colors follow order among the living, as in the cut scenes
    this.runners = runnerSprites(alive.map(e => ({ small: isChild(e.m) })));
    this.queue = [...alive].sort((a, b) =>
      (!!a.m.isLeader - !!b.m.isLeader) || (isChild(a.m) - isChild(b.m)) || ((b.m.age || 0) - (a.m.age || 0)));
    this.tryIdx = 0;
    this.lost = [];                   // family indices the river took
    this.face = 1;
    this._newTry();

    this.state       = 'countdown';   // countdown → playing → (lost → next → playing)… → won/failed
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
      if (player.row > 0) { player.row--; player.riding = null; this.hopT = HOP_T; }
    } else if (act === 'd') {
      if (player.row < 6) { player.row++; player.riding = null; this.hopT = HOP_T; }
    } else if (act === 'l') {
      player.x = Math.max(1, player.x - 5); this.face = -1; this.walkT = HOP_T;
    } else if (act === 'r') {
      player.x = Math.min(PW - PLAYER_W - 1, player.x + 5); this.face = 1; this.walkT = HOP_T;
    }
  }

  // Buttons in the bottom corners; elsewhere, tap above/below the wader to hop
  // and beside them to shift.
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
      const cy = FEET[this.player.row] - 10;
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

    if ((this.state === 'won' || this.state === 'failed') && !this._endScheduled) {
      // Show the result card, then hand back to the game
      this._endScheduled = true;
      setTimeout(() => {
        this.stop();
        this.onComplete(this._buildResult());
      }, END_PAUSE * 1000);
    }
    // The win card runs on its own; everything else keeps drawing here
    if (this.running && this.state !== 'won') this._rafId = requestAnimationFrame((t) => this._loop(t));
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  /** Put the next family member on the near bank with a fresh timer and health. */
  _newTry() {
    this.cur = this.queue[this.tryIdx];
    this.player = {
      row:     6,         // start at near bank
      x:       START_X,   // horizontal position (left edge of the hitbox)
      health:  100,
      inWater: false,
      riding:  null,      // { laneIdx, log } when on a log
    };
    this.timer = GAME_DURATION;
    this.hopT = 0;
    this.walkT = 0;
  }

  /** The river takes the current wader: they're lost, and the next one tries. */
  _loseWader(cause) {
    const p = this.player;
    if (!RIVER_ROWS.includes(p.row)) p.row = p.row === 0 ? 1 : 5;   // time ran out on a bank: the water rises over them
    this.lost.push(this.cur.i);
    this.lostCause = cause;
    this.lostT = LOST_PAUSE;
    this.driftDir = this.lanes[p.row - 1].def.dir;
    this.driftSpeed = this.lanes[p.row - 1].logs[0].speed;
    p.riding = null;
    p.inWater = true;
    this._splash(16);
    this.state = 'lost';
  }

  _moveLogs(step) {
    this.lanes.forEach(({ def, logs }) => {
      logs.forEach((log) => {
        log.x += def.dir * log.speed * step;
        // Wrap with a small buffer so logs don't pop into view
        if (def.dir ===  1 && log.x >  PW)              log.x = -log.width;
        if (def.dir === -1 && log.x + log.width < 0)    log.x =  PW;
      });
    });
  }

  _update(dt) {
    // Countdown phase
    if (this.state === 'countdown') {
      this.countdown -= dt;
      if (this.countdown <= 0) this.state = 'playing';
      return;
    }

    const { player, lanes } = this;
    const step = FRAME_RATE * dt;   // 60 Hz frames elapsed

    // Between tries: the lost wader drifts off, then the next one walks up
    if (this.state === 'lost') {
      this._moveLogs(step);
      player.x += this.driftDir * this.driftSpeed * step;
      this.lostT -= dt;
      if (this.lostT <= 0) {
        this.tryIdx++;
        if (this.tryIdx >= this.queue.length) { this.state = 'failed'; return; }
        this._newTry();
        this.nextT = NEXT_PAUSE;
        this.state = 'next';
      }
      return;
    }
    if (this.state === 'next') {
      this._moveLogs(step);
      this.nextT -= dt;
      if (this.nextT <= 0) this.state = 'playing';
      return;
    }

    if (this.state !== 'playing') return;

    // Timer
    this.timer -= dt;
    if (this.timer <= 0) { this._loseWader('time'); return; }

    this._moveLogs(step);

    // If riding a log, drift with it
    if (player.riding) {
      const { laneIdx, log } = player.riding;
      const def = lanes[laneIdx].def;
      player.x += def.dir * log.speed * step;

      // Drifted off-screen = swept away
      if (player.x < -PLAYER_W || player.x > PW) {
        player.x = Math.max(-PLAYER_W, Math.min(PW, player.x));
        this._loseWader('swept');
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
        // First aid kit: one emergency heal per crossing (whole family)
        if (this.perks.firstAid && !this.used.first_aid && player.health > 0 && player.health < 30) {
          player.health = Math.min(100, player.health + 30);
          this.used.first_aid = 1;
          this.aidT = 1.4;
        }
        if (player.health <= 0) this._loseWader('drowned');
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
    this.hopT = Math.max(0, this.hopT - dt);
    this.walkT = Math.max(0, this.walkT - dt);
    if (this.pressed) { this.pressed.t -= dt; if (this.pressed.t <= 0) this.pressed = null; }
    for (const ln of this.lanes) ln.scroll += ln.def.dir * ln.logs[0].speed * FRAME_RATE * SX * dt;

    const p = this.player;
    const thrashing = this.state === 'playing' || (this.state === 'lost' && this.lostT > LOST_PAUSE * 0.4);
    if (p.inWater && thrashing && Math.random() < dt * 24) this._splash(1);
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
    const cx = (this.player.x + PLAYER_W / 2) * SX, y = FEET[this.player.row] + 4;
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
    A.hurt = this.runners.map(f => ({ stand: silhouette(f.stand, '#ff5a4a'), jump: silhouette(f.jump, '#ff5a4a') }));
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

    // Made it: hand the canvas to the pixel-art scene card
    if (this.state === 'won') {
      if (!this._card) {
        this._card = new CardRunner(this.canvas);
        this._card.start(riverCard, { won: true, title: 'ACROSS!', family: this._survivors() });
        this.infoBar.textContent = this.lost.length
          ? `FORD THE RIVER — ${shortName(this.cur.m)} made it across. The river took ${this.lost.length}.`
          : `FORD THE RIVER — ACROSS! ${shortName(this.cur.m)} ties off a line and the family follows.`;
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

    // ── Near bank (start) and the family waiting their turn ─────────────
    g.drawImage(A.near, 0, NEAR_Y);
    drawFlowers(g, A.nearFlowers, t);
    for (const x of [96, 196, 258]) draw(g, A.reed, x, NEAR_Y - 4);
    this._drawQueue(g, t);

    // ── The wader ───────────────────────────────────────────────────────
    if (this.state !== 'failed') this._drawPlayer(g, t);
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

    // ── Cards over the scene ────────────────────────────────────────────
    if (this.state === 'countdown') this._intro(g);
    else if (this.state === 'lost') this._lostCard(g, t);
    else if (this.state === 'next') this._nextCard(g, t);
    else if (this.state === 'failed') this._failedCard(g);

    // ── Info bar ─────────────────────────────────────────────────────────
    const who = `${shortName(this.cur.m)} (try ${this.tryIdx + 1}/${this.queue.length})`;
    if (this.state === 'failed') {
      this.infoBar.textContent = 'FORD THE RIVER — the river took the whole family.';
    } else if (this.state === 'lost') {
      this.infoBar.textContent = `FORD THE RIVER — ${shortName(this.cur.m)} is lost to the river.`;
    } else {
      const rowLabel =
        player.row === 0 ? '🏁 FAR BANK' :
        player.row === 6 ? '🟫 Near bank' :
        `🌊 River (lane ${6 - player.row}/5)`;
      const hpLabel  = `♥ ${Math.round(player.health)}%`;
      const tmLabel  = `⏱ ${Math.max(0, Math.round(this.timer))}s`;
      const hint     = this.state === 'playing' ? ' | ↑↓ hop  ←→ shift' : '';
      this.infoBar.textContent =
        `FORD THE RIVER — ${who} | ${rowLabel} | ${hpLabel} | ${tmLabel}${hint}`;
    }
  }

  /** Family members still alive after this crossing (for the win card). */
  _survivors() {
    return this.family.filter((m, i) => m.alive !== false && !this.lost.includes(i));
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

  /** The family still waiting for their turn, lined up on the near bank. */
  _drawQueue(g, t) {
    const waiting = this.queue.slice(this.tryIdx + 1);
    waiting.forEach((e, j) => {
      const f = this.runners[e.k];
      const spr = Math.floor(t * 1.5 + j) % 4 === 0 && this.state === 'lost' ? f.jump : f.stand;   // waving them on / crying out
      draw(g, spr, QUEUE_X + j * QUEUE_GAP, H - 4 - spr.h, true);
    });
  }

  _drawPlayer(g, t) {
    const p = this.player, A = this.art, f = this.runners[this.cur.k];
    // Walking up from the line before their try
    if (this.state === 'next') {
      const k = ease(1 - this.nextT / NEXT_PAUSE);
      const x0 = QUEUE_X - 2, x1 = Math.round(START_X * SX + (PLAYER_W * SX - f.w) / 2);
      const spr = k < 1 ? f.run[Math.floor(t * 10) % 4] : f.stand;
      draw(g, spr, Math.round(x0 + (x1 - x0) * k), FEET[6] - spr.h, x1 < x0);
      return;
    }
    let feet = FEET[p.row];
    if (p.riding) feet += this._bob(p.riding.laneIdx, this.lanes[p.riding.laneIdx].logs.indexOf(p.riding.log));
    const x = Math.round(p.x * SX + (PLAYER_W * SX - f.w) / 2);
    const lost = this.state === 'lost';
    // Sinking: a little while thrashing in open water; all the way under when lost
    const sinkK = lost ? Math.min(1, (1 - this.lostT / LOST_PAUSE) * 1.6) : 0;
    const sink = lost ? 6 + Math.round(sinkK * (f.stand.h - 2)) : p.inWater ? 6 + Math.round(Math.sin(t * 7)) : 0;
    const hop = this.hopT > 0 ? Math.round(Math.sin(Math.PI * (1 - this.hopT / HOP_T)) * 5) : 0;
    let spr = f.stand;
    if (hop > 0) spr = f.jump;
    else if (this.walkT > 0) spr = f.run[Math.floor(t * 12) % 4];
    else if (p.inWater || lost) spr = Math.floor(t * 6) % 2 ? f.jump : f.stand;     // arms up, thrashing
    const hurt = (p.inWater && !lost && Math.floor(t * 12) % 2 === 0);
    const hs = A.hurt[this.cur.k];
    const y = feet - spr.h + sink - hop;
    if (sinkK < 1) draw(g, hurt ? (spr === f.jump ? hs.jump : hs.stand) : spr, x, y, this.face < 0);
    if (p.inWater || lost) {
      // Water swallowing the legs (or everything, as they go under)
      const wl = feet - 1;
      const water = (this.flood ? ['#6a6448', '#5a5a3e', '#4e4e36', '#44442e', '#3a3a28']
        : ['#2e74c8', '#2a6ac0', '#225aa8', '#1c4a92', '#1a3e80'])[p.row - 1];
      for (let dx = -3; dx < f.w + 5; dx++) {
        const wy = wl + Math.round(Math.sin(dx * 0.6 + t * 9));
        R(g, x - 1 + dx, wy, 1, sink + 3, water);
        R(g, x - 1 + dx, wy, 1, 1, '#e8f4ff');
      }
      if (sinkK >= 1) {   // bubbles where they went under
        for (let k = 0; k < 3; k++) {
          const by = wl - ((t * 14 + k * 4) % 10);
          R(g, x + 2 + k * 3, Math.round(by), 1, 1, '#e8f4ff');
        }
      }
    }
    // Marker over the one fording
    if (this.state === 'playing' && p.row !== 0) R(g, x + Math.floor(f.w / 2), y - 5 + (Math.floor(t * 4) % 2), 2, 2, '#ffd040');
  }

  /** One small figure per try: waiting, fording now, or lost. */
  _tryIcons(g, x0, y) {
    const n = this.queue.length;
    this.queue.forEach((e, j) => {
      const x = x0 + j * 7;
      const gone = this.lost.includes(e.i);
      const now = j === this.tryIdx && !gone;
      R(g, x - 1, y - 1, 7, 9, INK);
      R(g, x + 1, y, 3, 3, gone ? '#5a5664' : SKINS[(e.k * 2 + 1) % SKINS.length]);
      R(g, x, y + 3, 5, 4, gone ? '#3a3644' : SHIRTS[e.k % SHIRTS.length]);
      if (gone) { for (let k = 0; k < 5; k++) { R(g, x + k, y + 1 + k, 1, 1, '#ff4a3a'); R(g, x + 4 - k, y + 1 + k, 1, 1, '#ff4a3a'); } }
      if (now) R(g, x, y + 8, 5, 1, '#ffd040');
    });
    return x0 + n * 7;
  }

  _hud(g, t) {
    const p = this.player;
    plate(g, 0, 0, W, HUD_H, { alpha: 0.92 });
    text(g, 'HP', 4, 3, { color: '#ff9a9a', shadow: INK });
    const hp = this.state === 'lost' || this.state === 'failed' ? 0 : p.health;
    const hc = hp > 60 ? ['#3ad04a', '#a8f8a0'] : hp > 30 ? ['#e8a020', '#ffe08a'] : ['#e83a2a', '#ffa08a'];
    meter(g, 17, 2, hp / 100, { col: hc[0], hi: hc[1], bh: 7 });
    const x = this._tryIcons(g, 86, 2);
    if (this.state !== 'failed') {
      const lost = this.state === 'lost';
      text(g, shortName(this.cur.m), x + 3, 3, { color: lost ? '#ff8a7a' : p.inWater ? '#ff8a7a' : '#ffe8a0', shadow: INK });
    }
    const low = this.timer < 8 && Math.floor(t * 4) % 2;
    bar(g, W - 86, 3, 56, 7, this.timer / GAME_DURATION, low ? '#e83a2a' : '#4a8ae8', low ? '#ffa08a' : '#a8d0ff');
    text(g, `${Math.max(0, Math.ceil(this.timer))}S`, W - 4, 3, { align: 'right', color: '#e8e4f0', shadow: INK });
  }

  _intro(g) {
    const A = this.art;
    const n = this.queue.length;
    g.globalAlpha = 0.55; R(g, 0, HUD_H, W, H - HUD_H, '#06080e'); g.globalAlpha = 1;
    drawLogo(g, 'FORD THE RIVER', W / 2, 22, 3, GOLD);
    countdown(g, this.countdown, W / 2, 50);
    label(g, 'ONE AT A TIME, HOP THE LOGS TO THE FAR BANK.', W / 2, 86, '#ffffff', 'center');
    label(g, n > 1 ? `EVERY FAMILY MEMBER IS ONE TRY - ${n} TRIES.` : 'ONE TRY. THERE IS NO ONE ELSE.', W / 2, 96, '#a8d8ff', 'center');
    label(g, 'IF THE RIVER TAKES THEM, THEY ARE LOST.', W / 2, 106, '#ff9a8a', 'center');
    label(g, this.showTouch ? 'TAP ABOVE/BELOW TO HOP, BUTTONS TO SHIFT' : 'ARROWS / WASD: HOP LANES AND SHIFT', W / 2, 118, '#c8c4d8', 'center');
    if (A.perkLines) A.perkLines.slice(0, 2).forEach((ln, i) => label(g, ln, W / 2, 130 + i * 10, '#7ae07a', 'center'));
    else label(g, 'NO SUPPLIES FOR THIS ONE', W / 2, 130, '#8a8698', 'center');
    label(g, `FIRST: ${shortName(this.cur.m)}`, W / 2, 142 + (A.perkLines && A.perkLines.length > 1 ? 10 : 0), '#ffe060', 'center');
  }

  _lostCard(g, t) {
    const k = Math.min(1, (1 - this.lostT / LOST_PAUSE) * 3);
    if (k < 0.2) return;
    this._band(g, 18, this.queue.length - this.tryIdx > 1 ? 54 : 44);
    const title = this.lostCause === 'time' ? 'THE WATER ROSE' : this.lostCause === 'drowned' ? 'PULLED UNDER' : 'SWEPT AWAY';
    drawLogo(g, title, W / 2, 24, 3, BLUE);
    label(g, `${shortName(this.cur.m)} IS LOST TO THE RIVER.`, W / 2, 50, '#ffffff', 'center');
    const left = this.queue.length - this.tryIdx - 1;
    if (left > 0) label(g, `${left} ${left === 1 ? 'TRY' : 'TRIES'} LEFT`, W / 2, 61, '#a8d8ff', 'center');
  }

  /** Dim band behind a banner so it reads over the far bank. */
  _band(g, y, h) {
    g.globalAlpha = 0.55; R(g, 0, y, W, h, '#06080e'); g.globalAlpha = 1;
  }

  _nextCard(g, t) {
    this._band(g, 20, 36);
    drawLogo(g, `${shortName(this.cur.m)}'S TURN`, W / 2, 26, 2, GOLD);
    label(g, 'GET READY...', W / 2, 46, '#ffffff', 'center');
  }

  _failedCard(g) {
    g.globalAlpha = 0.6; R(g, 0, HUD_H, W, H - HUD_H, '#06080e'); g.globalAlpha = 1;
    drawLogo(g, 'FAMILY LOST', W / 2, 52, 4, BLUE);
    label(g, 'THE RIVER TOOK EVERYONE.', W / 2, 92, '#ffffff', 'center');
  }

  // ── Result builder ─────────────────────────────────────────────────────────

  _buildResult() {
    const lost = this.lost.filter(i => i >= 0);
    const who = nameList(this.lost.map(i => (i >= 0 ? this.family[i].name : 'You')));

    if (this.state === 'won') {
      const healthLost = Math.round(100 - this.player.health);
      const hero = this.cur.m.name || 'You';
      if (!this.lost.length) {
        const cleanCross = healthLost < 10;
        return {
          survived: true,
          won: true,
          used: this.used,
          lost,
          narrative: cleanCross
            ? `Log by log, ${hero} picks a way across the churning current and ties off a line on the far bank. The family follows it over, and the car crawls out after them.`
            : `${hero} makes it — barely, half-drowned twice — and ties off a line. The family follows it across the debris-choked river.`,
          effects: {
            ...(healthLost > 0 ? { health: -healthLost } : {}),
            morale:  cleanCross ? 10 : 5,
            fuel:    -5,
          },
        };
      }
      // Deaths cost morale through the death path in main.js; no crossing bonus here
      const alone = this._survivors().length <= 1;
      return {
        survived: true,
        won: true,
        used: this.used,
        lost,
        narrative: alone
          ? `The river took ${who}. ${hero} finally reaches the far bank alone and winches the car across in silence.`
          : `The river took ${who}. ${hero} finally reaches the far bank and ties off a line, and the rest of the family crosses without a word.`,
        effects: {
          ...(healthLost > 0 ? { health: -healthLost } : {}),
          fuel:    -5,
        },
      };
    }
    return {
      survived: false,
      won: false,
      used: this.used,
      lost,
      narrative: `One by one, the river took them: ${who}. No one is left to cross.`,
      effects: {},
    };
  }
}
