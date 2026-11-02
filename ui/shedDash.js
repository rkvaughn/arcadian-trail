/**
 * shedDash.js — "Run for the Shed": an 8-bit side-scrolling dash
 *
 * Original NES-era-style platformer. The family runs right across a scrolling
 * field to a rickety shed while the peril interferes:
 *
 *   HEAT — sluggish, slippery movement and shorter jumps; stamina drains as you
 *          run and only recovers in tree shade; cacti hurt.
 *   WIND — strong, telegraphed gusts shove you (worst mid-jump); crouch or stand
 *          in the lee of crates/cars to brace; debris flies low (jump it) or
 *          high (duck it). Hurricane/flood variants add rain and flooded pits.
 *   FIRE — ground vents smoke, then burst into flame columns; a wall of fire
 *          chases you; burning embers fall from above.
 *
 * Physics and level logic run in the original 160×90 logical px (8 px tiles),
 * so the bot-tested tuning below is unchanged. The art is drawn at 2× detail on
 * the shared <canvas id="asciiDisplay"> at its native 320×180, one canvas pixel
 * per art pixel, in the cut-scene style (ui/minigames/shedArt.js, kit.js).
 * All numeric constants are GAMEPLAY TUNING (px, px/s, health points) or
 * visual, not climate data. Outcome effects match the original Shelter Dash.
 *
 * Public interface (same contract as the other mini-games):
 *   new ShedDash(canvasEl, infoBarEl)
 *   .start(progress, onComplete, { peril, variant, family, perks })
 *   .stop()
 *   onComplete({ survived, narrative, effects, used })
 */

import {
  W as CW, H as CH, R, rng, ditherFill, drawWrap, draw, silhouette, disc, drawPuff, flameWall, bolt, text, ease,
} from './cutscenes/kit.js';
import { cloudSprite, birdSprites, SHIRTS, SKINS } from './cutscenes/sprites.js';
import {
  INK, plate, meter, bar, touchButton, drawLogo, label, countdown, wrapText, turbine, GOLD, GREEN, RED, BLUE,
} from './minigames/art.js';
import {
  TILE, LOOKS, lookFor, buildBackdrop, buildTiles, FAR_Y, MID_Y, crateSprite, wreckSprite, fenceSprite,
  treeSprites, cactusHazard, debrisSprites, emberSprite, arrowMarker, heartIcon, dropIcon, shedIcon, shedBody,
  shedDoors, looseSheet, runnerSprites, veil,
} from './minigames/shedArt.js';

// ── Screen & world ───────────────────────────────────────────────────────────
const LW = 160, LH = 90, S = 2;   // logical view; canvas is LW*S × LH*S = 320×180
const T = 8;                 // tile size (logical px)
const ROWS = 12;             // world rows (bottom row partly below the screen)
const HUD_H = 10;
const HUD_PX = HUD_H * S;
const INTRO_SECONDS = 2.8;
const END_SECONDS = 2.4;
const BARELY_HEALTH = 20;    // same threshold as the original Shelter Dash
const FOLLOW_DELAY = 0.2;    // seconds between family members replaying the leader's path

// ── Movement tuning ──────────────────────────────────────────────────────────
const BASE = {
  run: 62, accel: 420, airAccel: 260, friction: 560, gravity: 460,
  jump: 182, jumpCut: 0.45, coyote: 0.09, buffer: 0.12,
};
const MODES = {
  heat: { label: 'HEAT WAVE', hint: 'SLUGGISH & SLIPPERY. REST IN SHADE.',
          run: 0.78, accel: 0.45, friction: 0.28, jump: 0.92, drain: 1.5 },
  wind: { label: 'HIGH WINDS', hint: 'GUSTS SHOVE YOU. CROUCH OR HIDE!',
          run: 1, accel: 1, friction: 1, jump: 1, drain: 1.1 },
  fire: { label: 'WILDFIRE', hint: 'TIME THE FLAMES. FIRE IS BEHIND YOU!',
          run: 1, accel: 1, friction: 1, jump: 1, drain: 0.9 },
};
const VARIANT_LABELS = {
  hurricane: 'HURRICANE', tornado: 'TORNADO', flood: 'FLASH FLOOD', heatwave: 'HEAT WAVE',
  drought: 'DROUGHT HEAT', dust_storm: 'DUST STORM', wildfire: 'WILDFIRE',
};
const WHITE = '#fcfcfc';

function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function rand(lo, hi) { return lo + Math.random() * (hi - lo); }
function irand(lo, hi) { return Math.floor(rand(lo, hi + 1)); }
function overlap(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

/** Map an event peril/id to a mini-game mode. */
export function shedModeFor(perilType, eventId) {
  if (perilType === 'wildfire' && eventId !== 'toxic_air') return 'fire';
  if (perilType === 'heat') return 'heat';
  if (['hurricane', 'tornado', 'flood'].includes(perilType)) return 'wind';
  return null;
}

export class ShedDash {
  constructor(canvasEl, infoBarEl) {
    this.canvas = canvasEl;
    this.infoBar = infoBarEl;
    this.ctx = canvasEl.getContext('2d');
    this.running = false;
    this._rafId = null;
    this.buf = document.createElement('canvas');
    this.bctx = this.buf.getContext('2d');
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  start(progress, onComplete, opts = {}) {
    this.onComplete = onComplete;
    this.mode = MODES[opts.peril] ? opts.peril : 'wind';
    this.cfg = MODES[this.mode];
    this.variant = opts.variant || null;
    this.label = VARIANT_LABELS[this.variant] || this.cfg.label;
    this.stormy = this.mode === 'wind' && ['hurricane', 'flood'].includes(this.variant);
    this.perks = opts.perks || {};
    this.used = {};
    this.drinksLeft = this.perks.drinks || 0;
    const t = clamp(progress || 0, 0, 1);
    this.diff = { t, drain: lerp(1, 1.5, t), hazard: lerp(1.1, 1.6, t) };

    this.canvas.width = this.buf.width = LW * S;
    this.canvas.height = this.buf.height = LH * S;
    this.ctx.imageSmoothingEnabled = this.bctx.imageSmoothingEnabled = false;
    this._savedFilter = this.canvas.style.filter;
    this.canvas.style.filter = 'none';

    const members = (opts.family || []).filter(m => m.alive !== false);
    const n = clamp(members.length || 3, 1, 6);
    this.family = Array.from({ length: n }, (_, i) => ({
      small: typeof members[i]?.age === 'number' && members[i].age < 13, hurt: 0,
    }));

    this._buildLevel();
    this._buildArt();

    this.leader = {
      x: this.spawn.x, y: this.spawn.y, w: 6, h: 11, vx: 0, vy: 0, face: 1,
      onGround: true, coyote: 0, jumpBuf: 0, stun: 0, invuln: 0, crouch: false, walk: 0,
    };
    this.history = [];

    this.health = 100;
    this.stamina = 100;
    this.elapsed = 0;
    this.phase = 'intro';
    this.phaseT = 0;
    this.outcome = null;
    this.keys = {};
    this.touches = new Map();
    this.showTouch = typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0;
    this.shake = 0;
    this.flash = 0;
    this.particles = [];
    this.debris = [];
    this.embers = [];
    this.spawnT = 1.5;
    this.emberT = 2;
    this.fireWall = this.spawn.x - 70;
    this.gust = { state: 'calm', t: rand(1.2, 2), dir: -1, force: 0, t0: 0, dur: 1 };
    this.camX = 0;
    this.doorShut = false;
    this.speedFrac = 0;
    this._banner = null;

    this._bindInput();
    this.running = true;
    this._savedInfo = this.infoBar.textContent;
    this.infoBar.textContent = `${this.label} — run for the shed! ←/→ move · ↑/Space jump · ↓ crouch · or use the on-screen buttons.`;
    this._last = performance.now();
    this._rafId = requestAnimationFrame(t2 => this._frame(t2));
  }

  stop() {
    this.running = false;
    if (this._rafId) cancelAnimationFrame(this._rafId);
    this._rafId = null;
    this._unbindInput();
    if (this._savedFilter !== undefined) this.canvas.style.filter = this._savedFilter;
    if (this._savedInfo !== undefined) this.infoBar.textContent = this._savedInfo;
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  _bindInput() {
    const map = {
      ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r', ArrowUp: 'j', KeyW: 'j', Space: 'j',
      KeyZ: 'j', KeyK: 'j', ArrowDown: 'd', KeyS: 'd',
    };
    this._kd = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = map[e.code]; if (!k) return;
      if (k === 'j' && !this.keys.j) this.leader.jumpBuf = BASE.buffer;
      this.keys[k] = true; e.preventDefault();
    };
    this._ku = (e) => { const k = map[e.code]; if (k) this.keys[k] = false; };
    const toLogical = (e) => {
      const b = this.canvas.getBoundingClientRect(), cs = getComputedStyle(this.canvas);
      const pl = parseFloat(cs.paddingLeft || 0), pr = parseFloat(cs.paddingRight || 0);
      const pt = parseFloat(cs.paddingTop || 0), pb = parseFloat(cs.paddingBottom || 0);
      const left = b.left + this.canvas.clientLeft + pl, top = b.top + this.canvas.clientTop + pt;
      return { x: (e.clientX - left) / (this.canvas.clientWidth - pl - pr) * LW,
               y: (e.clientY - top) / (this.canvas.clientHeight - pt - pb) * LH };
    };
    this._pd = (e) => {
      this.showTouch = this.showTouch || e.pointerType !== 'mouse';
      const btn = this._buttonAt(toLogical(e));
      if (btn) {
        this.touches.set(e.pointerId, btn);
        if (btn === 'j') this.leader.jumpBuf = BASE.buffer;
        try { this.canvas.setPointerCapture?.(e.pointerId); } catch { /* pointer already gone */ }
        e.preventDefault();
      }
    };
    this._pm = (e) => { if (this.touches.has(e.pointerId)) this.touches.set(e.pointerId, this._buttonAt(toLogical(e))); };
    this._pu = (e) => { this.touches.delete(e.pointerId); };
    this._blur = () => { this.keys = {}; this.touches.clear(); };
    window.addEventListener('keydown', this._kd);
    window.addEventListener('keyup', this._ku);
    this.canvas.addEventListener('pointerdown', this._pd);
    this.canvas.addEventListener('pointermove', this._pm);
    window.addEventListener('pointerup', this._pu);
    window.addEventListener('pointercancel', this._pu);
    this.canvas.addEventListener('lostpointercapture', this._pu);
    window.addEventListener('blur', this._blur);
    this.canvas.classList.add('minigame-touch');
  }

  _unbindInput() {
    if (!this._kd) return;
    window.removeEventListener('keydown', this._kd);
    window.removeEventListener('keyup', this._ku);
    this.canvas.removeEventListener('pointerdown', this._pd);
    this.canvas.removeEventListener('pointermove', this._pm);
    window.removeEventListener('pointerup', this._pu);
    window.removeEventListener('pointercancel', this._pu);
    this.canvas.removeEventListener('lostpointercapture', this._pu);
    window.removeEventListener('blur', this._blur);
    this.canvas.classList.remove('minigame-touch');
    this._kd = null;
  }

  // On-screen buttons (bottom corners); a tap on the upper-right half also jumps.
  _buttonAt(p) {
    if (!p) return null;
    if (p.y < LH - 26) return p.x > LW / 2 ? 'j' : null;
    if (p.x < 24) return 'l';
    if (p.x < 48) return 'r';
    if (p.x > LW - 48 && p.x < LW - 24) return 'd';
    if (p.x > LW - 24) return 'j';
    return null;
  }

  _input() {
    const held = new Set(this.touches.values());
    return {
      l: this.keys.l || held.has('l'), r: this.keys.r || held.has('r'),
      j: this.keys.j || held.has('j'), d: this.keys.d || held.has('d'),
    };
  }

  // ── Level generation ───────────────────────────────────────────────────────

  _buildLevel() {
    const d = this.diff.t;
    const cols = this.cols = Math.round(lerp(80, 100, d));
    const h = this.ground = new Array(cols).fill(3);
    this.solids = new Set();              // extra solid tiles: "col,row"
    this.decor = [];                      // trees, fences, cars (visual)
    this.cacti = [];                      // heat hazards
    this.vents = [];                      // fire hazards
    this.shade = [];

    // Terrain: flat start, varied middle, flat run-up to the shed
    let c = 10, cur = 3, lastPit = -10;
    while (c < cols - 14) {
      const roll = Math.random();
      if (roll < lerp(0.22, 0.32, d) && c - lastPit > 6) {               // pit (2–3 wide)
        // Heat makes jumps short, so its pits stay 2 wide
        const w = this.mode !== 'heat' && Math.random() < lerp(0.35, 0.6, d) ? 3 : 2;
        for (let k = 0; k < w; k++) h[c + k] = 0;
        if (w === 3 && Math.random() < 0.4) this._crate(c + 1, ROWS - cur - 3);   // stepping crate
        lastPit = c + w; c += w;
      } else if (roll < 0.55) {                                            // step up/down one tile
        cur = clamp(cur + (Math.random() < 0.5 ? 1 : -1), 2, 4);
        const run = irand(3, 6);
        for (let k = 0; k < run && c < cols - 14; k++) h[c++] = cur;
      } else {                                                             // flat run with an obstacle
        const run = irand(5, 8);
        for (let k = 0; k < run && c < cols - 14; k++) h[c + k] = cur;
        this._obstacle(c + irand(1, Math.max(1, run - 4)), cur);
        c += run;
      }
    }
    for (; c < cols; c++) h[c] = cur;
    for (let k = 0; k < 10; k++) h[k] = 3;

    // Rickety shed on the final stretch
    this.shed = { c: cols - 7 };
    for (let k = this.shed.c - 3; k < cols; k++) h[k] = h[this.shed.c];
    const gTop = (col) => (ROWS - h[col]) * T;
    this.shed.x = this.shed.c * T;
    this.shed.y = gTop(this.shed.c) - 34;
    this.doorX = this.shed.x + 3;

    // Peril features on clear, flat ground
    const flatCols = [];
    for (let col = 14; col < cols - 12; col++) {
      if (h[col] && h[col - 1] === h[col] && h[col + 1] === h[col] &&
          !this._extraSolidAt(col, ROWS - h[col] - 1) && !this._extraSolidAt(col, ROWS - h[col] - 2)) flatCols.push(col);
    }
    const pick = (n, gap) => {
      const out = [];
      for (const col of [...flatCols].sort(() => Math.random() - 0.5)) {
        if (out.every(o => Math.abs(o - col) >= gap)) out.push(col);
        if (out.length >= n) break;
      }
      return out.sort((a, b) => a - b);
    };
    if (this.mode === 'fire') {
      for (const col of pick(Math.round(lerp(8, 11, d)), 5)) this.vents.push({ col, state: 'idle', t: rand(0.2, 2.5) });
    }
    if (this.mode === 'heat') {
      const trees = pick(4, 14);
      for (const col of trees) {
        this.decor.push({ kind: 'tree', col });
        this.shade.push({ x0: (col - 1) * T, x1: (col + 2) * T });
      }
      for (const col of pick(Math.round(lerp(5, 8, d)), 6)) if (trees.every(t => Math.abs(t - col) > 2)) this.cacti.push({ col });
    } else {
      for (const col of pick(4, 10)) this.decor.push({ kind: 'tree', col, back: true });
    }

    this.spawn = { x: 3 * T, y: gTop(3) - 11 };

    // Parallax silhouettes (generated once)
    this.far = Array.from({ length: 48 }, () => irand(6, 22));
    this.mid = Array.from({ length: 40 }, () => ({ h: irand(10, 22), kind: Math.random() }));
    this.clouds = Array.from({ length: 6 }, (_, i) => ({ x: i * 60 + rand(0, 30), y: rand(14, 36), w: irand(3, 5) }));
  }

  _crate(col, row) { this.solids.add(`${col},${row}`); }
  _extraSolidAt(col, row) { return this.solids.has(`${col},${row}`); }

  _obstacle(col, hgt) {
    const top = ROWS - hgt;
    const r = Math.random();
    if (r < 0.35) {                                     // crate stack (1–2 high)
      this._crate(col, top - 1);
      if (Math.random() < 0.5) this._crate(col, top - 2);
    } else if (r < 0.6) {                               // wrecked car: 3 wide × 1 high, hop on it
      for (let k = 0; k < 3; k++) this._crate(col + k, top - 1);
      this.decor.push({ kind: 'car', col, row: top - 1 });
    } else if (r < 0.8) {                               // fence: solid, 1 high
      this._crate(col, top - 1);
      this.decor.push({ kind: 'fence', col, row: top - 1 });
    } else {                                            // floating crate ledge
      this._crate(col, top - 3); this._crate(col + 1, top - 3);
    }
  }

  // ── Tile queries ───────────────────────────────────────────────────────────

  _solid(col, row) {
    if (col < 0 || col >= this.cols) return true;
    if (row < 0) return false;
    const h = this.ground[col];
    if (h > 0 && row >= ROWS - h) return true;
    return this._extraSolidAt(col, row);
  }

  // First x at or after `x` standing on two solid ground columns with clear headroom
  _safeSpotFrom(x) {
    for (let col = Math.max(0, Math.floor(x / T)); col < this.cols - 1; col++) {
      const h = this.ground[col];
      if (h && this.ground[col + 1] && !this._extraSolidAt(col, ROWS - h - 1) && !this._extraSolidAt(col, ROWS - h - 2)) {
        return Math.max(x, col * T + 1);
      }
    }
    return this.spawn.x;
  }

  _groundTopAt(x) {
    const col = clamp(Math.floor(x / T), 0, this.cols - 1);
    for (let row = 0; row < ROWS; row++) if (this._solid(col, row)) return row * T;
    return LH + 20;
  }

  _collide(e, axis) {
    const c0 = Math.floor(e.x / T), c1 = Math.floor((e.x + e.w - 0.01) / T);
    const r0 = Math.floor(e.y / T), r1 = Math.floor((e.y + e.h - 0.01) / T);
    for (let c = c0; c <= c1; c++) {
      for (let r = r0; r <= r1; r++) {
        if (!this._solid(c, r)) continue;
        if (axis === 'x') {
          if (e.vx > 0) e.x = c * T - e.w; else if (e.vx < 0) e.x = (c + 1) * T;
          e.vx = 0;
        } else {
          if (e.vy > 0) { e.y = r * T - e.h; e.onGround = true; } else if (e.vy < 0) e.y = (r + 1) * T;
          e.vy = 0;
        }
        return true;
      }
    }
    return false;
  }

  // ── Main loop ──────────────────────────────────────────────────────────────

  _frame(now) {
    if (!this.running) return;
    const dt = clamp((now - this._last) / 1000, 0, 1 / 30);   // rAF can stamp a frame just before _last
    this._last = now;
    this._update(dt);
    if (!this.running) return;
    this._draw();
    this._rafId = requestAnimationFrame(t => this._frame(t));
  }

  _update(dt) {
    this.phaseT += dt;
    this.shake = Math.max(0, this.shake - dt * 3);
    this.flash = Math.max(0, this.flash - dt * 2.5);
    if (this._banner) this._banner.t -= dt;
    this._updateParticles(dt);
    for (const m of this.family) m.hurt = Math.max(0, m.hurt - dt);

    if (this.phase === 'intro') {
      if (this.phaseT >= INTRO_SECONDS) { this.phase = 'play'; this.phaseT = 0; this.leader.jumpBuf = 0; }
      return;
    }
    if (this.phase === 'enter' || this.phase === 'collapse') {
      if (this.phase === 'enter') this._animateEntering(dt);
      else this._settle(dt);
      this._camera(dt);
      if (this.phaseT >= END_SECONDS) this._finish();
      return;
    }

    // ── play ──
    this.elapsed += dt;
    const intensity = 1 + this.elapsed / 40;
    this._updateGust(dt);
    this._moveLeader(dt);
    this._recordHistory();
    this._camera(dt);

    let drain = this.cfg.drain * this.diff.drain * intensity;
    if (this.mode === 'heat' && this._inShade()) drain *= 0.2;
    this.health -= drain * dt;

    if (this.mode === 'heat') this._updateHeat(dt);
    if (this.mode === 'wind') this._updateWind(dt);
    if (this.mode === 'fire') this._updateFire(dt);
    this._firstAidCheck();

    if (this.health <= 0) {
      this.health = 0; this.phase = 'collapse'; this.phaseT = 0; this.outcome = 'failed'; this.shake = 1;
      return;
    }
    if (this.leader.x + this.leader.w >= this.doorX) {
      this.phase = 'enter'; this.phaseT = 0;
      this.outcome = this.health > BARELY_HEALTH ? 'survived' : 'barely';
      this._burst(this.doorX, this.leader.y + 4, '#f8d878', 16);
    }
  }

  _moveLeader(dt) {
    const L = this.leader, inp = this._input(), c = this.cfg;
    const exhausted = this.mode === 'heat' && this.stamina < 12;
    const run = BASE.run * c.run * (exhausted ? 0.6 : 1);
    const accel = BASE.accel * c.accel;
    const jumpV = BASE.jump * c.jump * (exhausted ? 0.92 : 1);

    // Crouch (brace) on the ground
    const wantCrouch = inp.d && L.onGround;
    if (wantCrouch !== L.crouch) {
      if (wantCrouch) { L.y += 4; L.h = 7; L.crouch = true; }
      else if (!this._solid(Math.floor(L.x / T), Math.floor((L.y - 4) / T)) &&
               !this._solid(Math.floor((L.x + L.w - 0.01) / T), Math.floor((L.y - 4) / T))) {
        L.y -= 4; L.h = 11; L.crouch = false;
      }
    }

    let dir = (inp.r ? 1 : 0) - (inp.l ? 1 : 0);
    if (L.stun > 0) { L.stun -= dt; dir = 0; }
    if (L.crouch) dir = 0;

    const a = L.onGround ? accel : BASE.airAccel * c.accel;
    if (dir) {
      L.vx += dir * a * dt;
      L.face = dir;
    } else if (L.onGround) {
      const f = BASE.friction * c.friction * dt;
      L.vx = Math.abs(L.vx) <= f ? 0 : L.vx - Math.sign(L.vx) * f;
    }
    // Wind
    if (this.mode === 'wind') {
      let push = this._windForce();
      if (L.crouch) push *= 0.25;
      push *= this._leeFactor() * (this.perks.pushMult || 1);
      if (!L.onGround) push *= 1.35;           // airborne: nothing to dig your heels into
      L.vx += push * dt;
    }
    // Your own legs cap at `run`; the wind can shove you past it
    if (dir && Math.sign(L.vx) === dir && Math.abs(L.vx) > run) {
      L.vx = dir * Math.max(run, Math.abs(L.vx) - accel * dt);
    }
    const cap = run * (this.mode === 'wind' ? 1.9 : 1);
    if (Math.abs(L.vx) > cap) L.vx = Math.sign(L.vx) * cap;

    // Jump: coyote time + buffer + variable height
    L.coyote = L.onGround ? BASE.coyote : Math.max(0, L.coyote - dt);
    L.jumpBuf = Math.max(0, L.jumpBuf - dt);
    if (L.jumpBuf > 0 && L.coyote > 0 && !L.crouch && L.stun <= 0) {
      L.vy = -jumpV; L.coyote = 0; L.jumpBuf = 0; L.onGround = false;
      if (this.mode === 'heat') this.stamina -= 6 * this.diff.drain * (this.perks.staminaMult || 1);
      this._puff(L.x + 3, L.y + L.h);
    }
    if (!inp.j && L.vy < 0) L.vy *= Math.pow(BASE.jumpCut, dt * 10);
    L.vy = Math.min(L.vy + BASE.gravity * dt, 260);

    L.x += L.vx * dt; this._collide(L, 'x');
    L.onGround = false;
    L.y += L.vy * dt; this._collide(L, 'y');
    if (L.x < this.camX) { L.x = this.camX; L.vx = Math.max(0, L.vx); }   // left edge of the screen
    L.invuln = Math.max(0, L.invuln - dt);

    if (L.onGround) {
      L.walk += Math.abs(L.vx) * dt * 0.18;
    }
    this.speedFrac = Math.abs(L.vx) / run;

    // Fell in a pit: hurt, then back to the last safe ground
    if (L.y > LH + 10) {
      this._hurt(this.stormy ? 10 : 12, 'fall');
      this._splash(L.x);
      if (L.crouch) { L.crouch = false; L.h = 11; }
      // Scramble out on the far side of the pit: it costs health, never a dead end
      L.x = this._safeSpotFrom(Math.max(L.x, this.camX + 2));
      L.y = this._groundTopAt(L.x + 3) - L.h;
      L.vx = 0; L.vy = 0; L.invuln = 1;
      this.history = [];
      // Don't respawn straight into the chasing fire: give a short head start
      if (this.mode === 'fire') this.fireWall = Math.min(this.fireWall, L.x - 45);
    }
  }

  _pose(L) {
    if (!L.onGround) return 'jump';
    if (L.crouch) return 'crouch';
    return Math.abs(L.vx) > 4 ? 'run' + (Math.floor(L.walk * 2) % 4) : 'stand';
  }

  _recordHistory() {
    const L = this.leader;
    this.history.push({ t: this.elapsed, x: L.x, y: L.y + L.h, face: L.face, pose: this._pose(L) });
    while (this.history.length > 2 && this.history[1].t < this.elapsed - 3) this.history.shift();
  }

  _followerState(i) {
    const target = this.elapsed - i * FOLLOW_DELAY;
    const h = this.history;
    if (!h.length) return null;
    for (let k = h.length - 1; k >= 0; k--) if (h[k].t <= target) return h[k];
    return h[0];
  }

  // Camera follows the leader and never scrolls back
  _camera(dt) {
    const target = clamp(this.leader.x - 56, 0, this.cols * T - LW);
    const next = this.camX + (target - this.camX) * Math.min(1, dt * 8);
    this.camX = Math.max(this.camX, next);
  }

  // ── Hazards ────────────────────────────────────────────────────────────────

  _hurt(amount, kind, kx = 0) {
    const L = this.leader;
    const continuous = kind === 'burn' || kind === 'wall';
    if (L.invuln > 0 && !continuous) return false;
    let dmg = amount;
    if ((continuous || kind === 'ember') && this.perks.burnMult) dmg *= this.perks.burnMult;
    if (kind === 'debris' && this.perks.pushMult) dmg *= this.perks.pushMult;
    this.health -= dmg;
    if (!continuous) {
      L.invuln = 1.0; L.stun = 0.25; L.vx = kx * 90; L.vy = Math.min(L.vy, -70);
      this.flash = 0.7; this.shake = 0.6;
      this.family[0].hurt = 0.6;
    } else {
      this.flash = Math.max(this.flash, 0.35);
    }
    return true;
  }

  _firstAidCheck() {
    if (this.perks.firstAid && !this.used.first_aid && this.health > 0 && this.health < 30) {
      this.health += 30;
      this.used.first_aid = 1;
      this._banner = { text: 'FIRST AID!', t: 1.4, color: WHITE };
      this._burst(this.leader.x + 3, this.leader.y, '#f83800', 10);
    }
  }

  _inShade() {
    const cx = this.leader.x + this.leader.w / 2;
    return this.leader.onGround && this.shade.some(s => cx > s.x0 && cx < s.x1);
  }

  _updateHeat(dt) {
    const L = this.leader;
    const mult = this.perks.staminaMult || 1;
    if (this._inShade()) this.stamina += 34 * dt;
    else if (this.speedFrac > 0.15) this.stamina -= 13 * this.speedFrac * this.diff.drain * mult * dt;
    else this.stamina += 3 * dt;
    // Water bottles: take a drink when stamina gives out
    if (this.stamina <= 2 && this.drinksLeft > 0) {
      this.stamina = 65; this.drinksLeft--;
      this.used.water_bottles = (this.used.water_bottles || 0) + 1;
      this._banner = { text: 'GULP! WATER', t: 1.2, color: '#3cbcfc' };
    }
    this.stamina = clamp(this.stamina, 0, 100);
    for (const c of this.cacti) {
      const box = { x: c.col * T + 1, y: (ROWS - this.ground[c.col]) * T - 10, w: 6, h: 10 };
      if (overlap(L, box)) this._hurt(7, 'cactus', L.x + L.w / 2 < box.x + 3 ? -1 : 1);
    }
    if (!this._inShade() && Math.random() < dt * 3) this._spawn('sweat', L.x + 3, L.y);
  }

  _windForce() {
    const g = this.gust;
    const breeze = -16;                          // steady headwind
    if (g.state !== 'gust') return breeze;
    return breeze + g.dir * g.force * Math.sin(Math.PI * clamp(g.t0 / g.dur, 0, 1));
  }

  // Standing just downwind of a solid tile at body height blocks most of the push
  _leeFactor() {
    const L = this.leader, up = -Math.sign(this._windForce()) || 1;
    const row = Math.floor((L.y + L.h / 2) / T);
    for (let k = 1; k <= 2; k++) {
      const col = Math.floor((up > 0 ? L.x + L.w : L.x) / T) + up * k;
      if (this._solid(col, row)) return 0.2;
    }
    return 1;
  }

  _updateGust(dt) {
    if (this.mode !== 'wind') return;
    const g = this.gust;
    g.t -= dt;
    if (g.state === 'gust') g.t0 += dt;
    if (g.t <= 0) {
      if (g.state === 'calm') {
        g.state = 'warn'; g.t = this.perks.earlyWarning ? 1.6 : 0.9;
        g.dir = Math.random() < 0.72 ? -1 : 1;      // mostly headwinds
      } else if (g.state === 'warn') {
        g.state = 'gust'; g.dur = rand(1.3, 2.1); g.t = g.dur; g.t0 = 0;
        g.force = rand(300, 420) * this.diff.hazard; this.shake = Math.max(this.shake, 0.5);
      } else { g.state = 'calm'; g.t = rand(1.3, 2.6) / this.diff.hazard; }
    }
  }

  _updateWind(dt) {
    const L = this.leader, g = this.gust;
    this.spawnT -= dt;
    if (this.spawnT <= 0) {
      this.spawnT = rand(1.1, 1.8) / this.diff.hazard * (g.state === 'gust' ? 0.6 : 1);
      const fromRight = g.state === 'gust' ? g.dir < 0 : Math.random() < 0.75;
      const x = fromRight ? this.camX + LW + 8 : this.camX - 12;
      const ground = this._groundTopAt(L.x + 3);
      const high = Math.random() < 0.45;
      this.debris.push({
        // low: jump it · high: chest height, crouch under it
        x, y: high ? ground - 9 : ground - 3, vx: (fromRight ? -1 : 1) * rand(105, 150) * this.diff.hazard,
        rot: rand(0, 4), kind: Math.random() < 0.5 ? 'plank' : 'tin', high,
      });
    }
    for (const d of this.debris) {
      d.x += d.vx * dt; d.rot += dt * 14;
      if (d.dead) continue;
      const box = { x: d.x - 4, y: d.y - 1.5, w: 8, h: 3 };
      if (overlap(L, box)) {
        if (this._hurt(9, 'debris', Math.sign(d.vx))) { d.dead = true; this._burst(d.x, d.y, '#c8a060', 8); }
        continue;
      }
      if (!d.dead && this._solid(Math.floor(d.x / T), Math.floor(d.y / T))) { d.dead = true; this._burst(d.x, d.y, '#8c6c3c', 5); }
    }
    this.debris = this.debris.filter(d => !d.dead && d.x > this.camX - 30 && d.x < this.camX + LW + 30);
    const rate = g.state === 'gust' ? 70 : g.state === 'warn' ? 35 : 12;
    for (let i = 0; i < rate * dt; i++) this._spawn('streak', this.camX + rand(0, LW + 20), rand(HUD_H, LH));
    if (this.stormy) for (let i = 0; i < 80 * dt; i++) this._spawn('rain', this.camX + rand(-10, LW + 10), rand(HUD_H - 10, LH));
  }

  _updateFire(dt) {
    const L = this.leader;
    // The chasing wall of fire (keeps pace with the screen so it never falls far behind)
    this.fireWall += lerp(13, 17, this.diff.t) * (1 + this.elapsed / 50) * dt;
    this.fireWall = Math.max(this.fireWall, this.camX - 40);
    if (L.x < this.fireWall + 6) this._hurt(34 * dt, 'wall');
    for (let i = 1; i < this.family.length; i++) {
      const s = this._followerState(i);
      if (s && s.x < this.fireWall + 4) { this.health -= 5 * (this.perks.burnMult || 1) * dt; this.family[i].hurt = 0.3; }
    }
    // Vents: idle → smoke warning → flame burst
    for (const v of this.vents) {
      v.t -= dt;
      if (v.t <= 0) {
        if (v.state === 'idle') { v.state = 'warn'; v.t = 0.85; }
        else if (v.state === 'warn') { v.state = 'burn'; v.t = rand(1.0, 1.5); }
        else { v.state = 'idle'; v.t = rand(1.4, 2.8) / this.diff.hazard; }
      }
      const top = (ROWS - this.ground[v.col]) * T;
      if (v.state === 'warn' && Math.random() < dt * 12) this._spawn('smoke', v.col * T + 4, top - 2);
      if (v.state === 'burn') {
        if (Math.random() < dt * 20) this._spawn('ember', v.col * T + rand(1, 7), top - rand(4, 22));
        if (overlap(L, { x: v.col * T, y: top - 24, w: T, h: 24 })) this._hurt(24 * dt, 'burn');
      }
    }
    // Falling burning embers
    this.emberT -= dt;
    if (this.emberT <= 0) {
      this.emberT = rand(0.7, 1.4) / this.diff.hazard;
      this.embers.push({ x: this.camX + rand(30, LW + 20), y: HUD_H - 4, vx: rand(-14, -4), vy: rand(40, 60) });
    }
    for (const e of this.embers) {
      e.x += e.vx * dt; e.y += e.vy * dt;
      if (e.dead) continue;
      if (overlap(L, { x: e.x - 1, y: e.y - 1, w: 3, h: 3 })) {
        if (this._hurt(6, 'ember', 0)) { e.dead = true; this._burst(e.x, e.y, '#f8b800', 6); }
      } else if (this._solid(Math.floor(e.x / T), Math.floor(e.y / T))) { e.dead = true; this._burst(e.x, e.y, '#f87858', 4); }
    }
    this.embers = this.embers.filter(e => !e.dead && e.y < LH + 10);
    for (let i = 0; i < 6 * dt; i++) this._spawn('ember', this.camX + rand(0, LW), LH - rand(0, 30));
  }

  // ── Ending ─────────────────────────────────────────────────────────────────

  // Collapsed: let the leader drop to the ground instead of hanging in the air
  _settle(dt) {
    const L = this.leader;
    if (L.y > LH + 10) return;
    L.vx = 0;
    L.vy = Math.min(L.vy + BASE.gravity * dt, 260);
    L.onGround = false;
    L.y += L.vy * dt; this._collide(L, 'y');
  }

  _animateEntering(dt) {
    const L = this.leader;
    if (L.crouch) { L.crouch = false; L.y -= 4; }
    L.vx = 30; L.onGround = true; L.h = 11;
    L.y = this._groundTopAt(L.x + 3) - L.h;          // walk in on the ground, even if we arrived mid-jump
    L.x = Math.min(L.x + 30 * dt, this.doorX + 6);
    L.walk += 30 * dt * 0.18;
    this.elapsed += dt;
    this._recordHistory();
    if (this.phaseT > 0.5 + this.family.length * FOLLOW_DELAY && !this.doorShut) { this.doorShut = true; this.shake = 0.6; }
  }

  _finish() {
    if (!this.running) return;
    const result = this._buildResult();
    this.stop();
    this.onComplete?.(result);
  }

  _buildResult() {
    const what = this.label.toLowerCase();
    const used = this.used;
    if (this.outcome === 'survived') {
      return { survived: true, used, effects: { morale: 5, health: -5 },
        narrative: `Through the ${what}, the family piled into a rickety shed and slammed the door. It rattled all night — but it held.` };
    }
    if (this.outcome === 'barely') {
      return { survived: true, used, effects: { morale: -3, health: -12 },
        narrative: `The ${what} nearly took you. The family staggered into the shed scorched, bruised and gasping. You made it, barely.` };
    }
    return { survived: false, used, effects: { health: -20, morale: -10 },
      narrative: `The ${what} was too much. The family collapsed short of the shed and had to crawl to cover once the worst passed.` };
  }

  // ── Particles ──────────────────────────────────────────────────────────────

  _spawn(kind, x, y) {
    const p = { kind, x, y, t: 0, life: 1 };
    if (kind === 'ember') Object.assign(p, { vx: rand(-5, 5), vy: rand(-18, -8), life: rand(0.5, 1.1) });
    if (kind === 'smoke') Object.assign(p, { vx: rand(-4, 4), vy: rand(-12, -6), life: rand(0.8, 1.4), r: rand(2, 3.5) });
    if (kind === 'sweat') Object.assign(p, { vx: rand(-8, 8), vy: rand(-14, -6), life: 0.5 });
    if (kind === 'spark') Object.assign(p, { vx: rand(-40, 40), vy: rand(-50, 10), life: rand(0.3, 0.6) });
    if (kind === 'puff') Object.assign(p, { vx: rand(-10, 10), vy: rand(-6, -2), life: 0.35 });
    if (kind === 'streak') Object.assign(p, { life: rand(0.3, 0.6), len: irand(4, 9) });
    if (kind === 'rain') Object.assign(p, { life: 0.6 });
    this.particles.push(p);
    return p;
  }
  _burst(x, y, color, n) { for (let i = 0; i < n; i++) this._spawn('spark', x, y).color = color; }
  _puff(x, y) { for (let i = 0; i < 3; i++) this._spawn('puff', x, y); }
  _splash(x) { for (let i = 0; i < 10; i++) this._spawn('spark', x, LH - 6).color = this.stormy ? '#3cbcfc' : '#7c4c1c'; }

  _updateParticles(dt) {
    const g = this.gust, wind = this.mode === 'wind' ? (g.state === 'gust' ? g.dir * 150 : -50) : 0;
    for (const p of this.particles) {
      p.t += dt;
      if (p.kind === 'streak') p.x += wind * dt;
      else if (p.kind === 'rain') { p.x += wind * 0.4 * dt; p.y += 120 * dt; }
      else { p.x += (p.vx || 0) * dt; p.y += (p.vy || 0) * dt; if (p.kind === 'spark' || p.kind === 'sweat') p.vy += 120 * dt; }
    }
    this.particles = this.particles.filter(p => p.t < p.life);
    if (this.particles.length > 450) this.particles.splice(0, this.particles.length - 450);
  }

  // ── Art (built once per run) ───────────────────────────────────────────────

  _buildArt() {
    const look = this.look = lookFor(this.mode, this.variant);
    const lk = this.lk = LOOKS[look];
    const art = this.art = {
      ...buildBackdrop(lk, look),
      tiles: buildTiles(lk, look),
      crate: crateSprite(), wreck: wreckSprite(), fence: fenceSprite(),
      tree: treeSprites(lk, look), cactus: cactusHazard(),
      debris: { plank: debrisSprites('plank'), tin: debrisSprites('tin') },
      ember: emberSprite(), marker: arrowMarker(), heart: heartIcon(), drop: dropIcon(), shedIcon: shedIcon(),
      shed: shedBody(look), doors: shedDoors(), sheet: looseSheet(),
      runners: runnerSprites(this.family),
      veil: veil(CW, CH - HUD_PX),
      birds: birdSprites(look === 'fire' ? '#1a0806' : '#141018'),
      cloud: cloudSprite(true, { W: '#fff8e8', w: '#f0d8b0', h: '#ffffff' }),
      chevron: [-1, 1].map(d => {
        const rows = d < 0 ? ['..##', '.##.', '##..', '.##.', '..##'] : ['##..', '.##.', '..##', '.##.', '##..'];
        return rows;
      }),
    };
    // Per-column grass blades poking over the edge and flowers (seeded)
    const r = rng(this.cols * 31 + look.length);
    this.blades = []; this.flowers = [];
    for (let col = 0; col < this.cols; col++) {
      this.blades.push(Array.from({ length: 3 }, () => ({ dx: r.int(0, TILE - 1), h: r.int(1, 2), c: r() < 0.5 ? lk.grass : lk.grassHi })));
      const fl = [];
      if (r() < lk.flowerRate) fl.push({ dx: r.int(2, 13), c: r.pick(lk.flowers), p: r.range(0, 6) });
      if (r() < lk.flowerRate * 0.4) fl.push({ dx: r.int(2, 13), c: r.pick(lk.flowers), p: r.range(0, 6) });
      this.flowers.push(fl);
    }
    art.pit = (() => {          // dry pit: darkness gathering toward the bottom
      const c = document.createElement('canvas');
      c.width = TILE; c.height = 64;
      const g = c.getContext('2d');
      for (let y = 0; y < 64; y++) ditherFill(g, 0, y, TILE, 1, INK, Math.min(1, y / 48));
      return c;
    })();
  }

  // ── Drawing ────────────────────────────────────────────────────────────────

  _draw() {
    const g = this.bctx;
    const cam = Math.round(this.camX * S);
    const T0 = this.elapsed + this.phaseT;

    this._drawBackdrop(g, cam, T0);
    this._drawDecor(g, cam, T0, true);
    this._drawTiles(g, cam, T0);
    this._drawDecor(g, cam, T0, false);
    this._drawShed(g, cam, T0);
    if (this.mode === 'heat') this._drawCacti(g, cam);
    if (this.mode === 'fire') this._drawVents(g, cam, T0);
    this._drawFamily(g, cam, T0);
    if (this.mode === 'wind') this._drawDebris(g, cam);
    if (this.mode === 'fire') { this._drawEmbers(g, cam); this._drawFireWall(g, cam, T0); }
    this._drawParticles(g, cam);
    this._drawOverlay(g, T0);

    // Composite (heat shimmer / shake)
    const ctx = this.ctx;
    ctx.clearRect(0, 0, CW, CH);
    const sx = this.shake > 0 ? Math.round(rand(-2, 2) * this.shake) * S : 0;
    const sy = this.shake > 0 ? Math.round(rand(-2, 2) * this.shake) * S : 0;
    if (this.mode === 'heat') {
      const amp = 1 + (1 - this.stamina / 100) * 2;
      for (let y = 0; y < CH; y += 2) {
        const off = y > HUD_PX ? Math.round(Math.sin(y * 0.09 + T0 * 7) * amp) : 0;
        ctx.drawImage(this.buf, 0, y, CW, 2, off + sx, y + sy, CW, 2);
      }
    } else ctx.drawImage(this.buf, sx, sy);
    if (this.flash > 0) { ctx.fillStyle = `rgba(248,56,0,${this.flash * 0.3})`; ctx.fillRect(0, 0, CW, CH); }

    this._drawHUD(ctx, T0);
    if (this.showTouch && this.phase === 'play') this._drawButtons(ctx);
    if (this.phase === 'intro') this._drawIntro(ctx, T0);
    if (this.phase === 'enter' || this.phase === 'collapse') this._drawEnd(ctx);
  }

  _drawBackdrop(g, cam, T0) {
    const A = this.art, look = this.look, gust = this.gust.state === 'gust';
    g.drawImage(A.sky, 0, 0);
    if (look === 'heat' || look === 'dust') {
      const sx = 252, sy = 46, pulse = Math.floor(T0 * 2) % 2;
      if (look === 'heat') {
        for (let k = 0; k < 12; k++) {                         // pulsing rays
          const a = k * Math.PI / 6 + T0 * 0.15;
          for (let s = 27 + pulse * 2; s < 33 + pulse * 3; s++) R(g, Math.round(sx + Math.cos(a) * s), Math.round(sy + Math.sin(a) * s), 1, 1, '#fff4c8');
        }
        disc(g, sx, sy, 24, '#ffc860'); disc(g, sx, sy, 20, '#ffe08a'); disc(g, sx, sy, 15, '#fff2c0'); disc(g, sx, sy, 9, '#ffffff');
      } else {
        disc(g, sx, sy, 14, '#e8c890'); disc(g, sx, sy, 10, '#f4dcb0');
      }
    }
    if (look === 'fire') { disc(g, 64, 64, 15, '#d8401a'); disc(g, 64, 64, 11, '#ff6a2a'); disc(g, 64, 64, 6, '#ff9a4a'); }
    if (A.clouds) {
      const drift = look === 'fire' ? T0 * 5 : T0 * (gust ? 46 : 16);
      drawWrap(g, A.clouds, cam * 0.08 + drift, look === 'fire' ? 14 : look === 'stormy' ? -6 : 2);
    } else if (look === 'heat') {
      for (let i = 0; i < 3; i++) {
        const x = ((i * 130 + 40 - cam * 0.06 + T0 * 3) % 400 + 400) % 400 - 50;
        draw(g, A.cloud, x, 20 + i * 11);
      }
    }
    if (this.stormy && this._lightning(T0)) bolt(g, 40 + (Math.floor(T0 * 3 / 23) * 97) % 240, 0, FAR_Y + 50, Math.floor(T0 * 3));
    drawWrap(g, A.far, cam * 0.2, FAR_Y);
    if (look === 'wind' || look === 'stormy') {                 // turbines spin up in the gusts
      const off = ((cam * 0.2) % 640 + 640) % 640;
      [70, 236, 410, 560].forEach((x, k) => {
        let sx = ((x - off) % 640 + 640) % 640;
        if (sx > CW + 30) sx -= 640;
        if (sx < -30) return;
        const cols = look === 'stormy' ? ['#8a94a2', '#5a6472'] : ['#d8dee6', '#98a2b0'];
        turbine(g, sx, FAR_Y + A.farTops[x] + 3, 30 - (k % 2) * 6, T0 * (gust ? 10 : 3.5) + k, cols[0], cols[1]);
      });
    }
    // Birds: vultures circle in the heat, flocks flee the fire, get blown about in the wind
    for (let i = 0; i < 4; i++) {
      let bx, by;
      if (look === 'heat' || look === 'dust') { bx = 200 + Math.cos(T0 * 0.8 + i * 1.6) * 40; by = 40 + Math.sin(T0 * 0.8 + i * 1.6) * 10 + i * 3; }
      else if (look === 'fire') { bx = ((T0 * 40 + i * 24) % (CW + 60)) - 30; by = 30 + i * 4 + Math.sin(T0 * 3 + i) * 3; }
      else { bx = CW - ((T0 * (gust ? 120 : 30) + i * 70) % (CW + 60)) + 30; by = 30 + i * 9 + Math.sin(T0 * 5 + i) * 4; }
      draw(g, A.birds[Math.abs(Math.floor(T0 * 6 + i)) % 2], bx, by);
    }
    drawWrap(g, A.mid, cam * 0.45, MID_Y);
    if (look === 'fire') {                                      // fire line cresting the hills
      const off = cam * 0.45;
      for (let x = 0; x < CW; x++) {
        const mx = ((Math.round(x + off) % 640) + 640) % 640;
        if (Math.floor(mx / 90) % 3 === 1) continue;
        const top = MID_Y + A.midTops[mx];
        const h = Math.round(3 + 2.5 * Math.sin(mx * 0.31 + T0 * 7) + 2 * Math.sin(mx * 0.11 - T0 * 3));
        if (h <= 0) continue;
        R(g, x, top - h, 1, h, '#e04a10');
        if (h > 2) R(g, x, top - h + 2, 1, h - 2, '#ffa030');
      }
    }
  }

  _lightning(T0) { return Math.floor(T0 * 3) % 23 === 0; }

  _drawTiles(g, cam, T0) {
    const A = this.art, lk = this.lk;
    const c0 = Math.max(0, Math.floor(this.camX / T) - 1), c1 = Math.min(this.cols - 1, c0 + Math.ceil(LW / T) + 2);
    for (let col = c0; col <= c1; col++) {
      const h = this.ground[col];
      const x = col * TILE - cam;
      if (h > 0) {
        const top = (ROWS - h) * TILE;
        g.drawImage(A.tiles.top[col % 3], x, top);
        for (let y = top + TILE, k = 0; y < CH; y += TILE, k++) g.drawImage(A.tiles.dirt[(col + k) % 2], x, y);
        const hl = this.ground[col - 1], hr = this.ground[col + 1];
        if (!hl || hl < h) { R(g, x, top, 1, CH - top, INK); R(g, x + 1, top + 8, 1, CH - top - 8, lk.dirtHi); }
        if (!hr || hr < h) { R(g, x + TILE - 1, top, 1, CH - top, INK); R(g, x + TILE - 2, top + 8, 1, CH - top - 8, lk.dirtDk); }
        R(g, x, top - 1, TILE, 1, INK);
        for (const b of this.blades[col]) R(g, x + b.dx, top - 1 - b.h, 1, b.h, b.c);
        for (const f of this.flowers[col]) {
          const fx = x + f.dx, sway = Math.round(Math.sin(T0 * 2 + f.p) * 0.6);
          R(g, fx, top - 2, 1, 2, lk.grassDk);
          R(g, fx + sway - 1, top - 4, 3, 1, f.c); R(g, fx + sway, top - 5, 1, 3, f.c); R(g, fx + sway, top - 4, 1, 1, '#ffe8a0');
        }
      } else if (this.stormy) {                                          // flooded pit
        const wy = (LH - 9) * S;
        R(g, x, wy, TILE, CH - wy, '#1a3478');
        ditherFill(g, x, wy + 4, TILE, CH - wy - 4, '#10245a', 0.35);
        R(g, x, wy, TILE, 1, '#8ad8ff');
        for (let k = 0; k < 2; k++) R(g, x + ((Math.floor(T0 * 10) + k * 8 + col * 3) % TILE), wy + 1 + k * 2, 3, 1, '#3c8cfc');
      } else {
        g.drawImage(A.pit, x, CH - 64);
      }
      for (let row = 0; row < ROWS; row++) {
        if (this._extraSolidAt(col, row) && !this._decorAt(col, row)) draw(g, A.crate, x + 1, row * TILE + 1);
      }
    }
  }

  _decorAt(col, row) {
    return this.decor.some(d => (d.kind === 'car' && row === d.row && col >= d.col && col < d.col + 3) ||
                                (d.kind === 'fence' && d.col === col && d.row === row));
  }

  _drawDecor(g, cam, T0, back) {
    const A = this.art;
    for (const d of this.decor) {
      const x = d.col * TILE - cam;
      if (x < -60 || x > CW + 30) continue;
      if (d.kind === 'tree' && !!d.back === back) {
        const top = (ROWS - this.ground[d.col]) * TILE;
        const sway = this.mode === 'wind' ? Math.round(Math.sin(T0 * 4 + d.col) * (this.gust.state === 'gust' ? 4 : 2)) : 0;
        if (this.mode === 'heat') {                                       // the shade you can rest in
          g.globalAlpha = 0.35; ditherFill(g, x - 16, top, 48, 3, INK, 0.6); g.globalAlpha = 1;
        }
        draw(g, A.tree.trunk, x + 4, top - 29);
        draw(g, A.tree.canopy, x - 15 + sway, top - 58);
        if (this.mode === 'fire') {
          for (let k = 0; k < 3; k++) {
            if (Math.floor(T0 * 8 + d.col + k) % 3 === 0) continue;
            const fx = x - 8 + k * 14 + sway, fy = top - 56 + (k % 2) * 8;
            R(g, fx, fy, 3, 4, '#f04a0c'); R(g, fx + 1, fy + 1, 1, 3, '#ffd040');
          }
        }
      }
      if (!back && d.kind === 'car') draw(g, A.wreck, x + 1, d.row * TILE - 5);
      if (!back && d.kind === 'fence') draw(g, A.fence, x, d.row * TILE - 3);
    }
  }

  _drawCacti(g, cam) {
    for (const c of this.cacti) {
      const x = c.col * TILE - cam, top = (ROWS - this.ground[c.col]) * TILE;
      if (x < -20 || x > CW + 10) continue;
      draw(g, this.art.cactus, x + 2, top - 20);
    }
  }

  _drawVents(g, cam, T0) {
    for (const v of this.vents) {
      const x = v.col * TILE - cam, top = (ROWS - this.ground[v.col]) * TILE;
      if (x < -20 || x > CW + 10) continue;
      R(g, x + 2, top - 1, 12, 3, INK);                                   // charred crack
      R(g, x + 3, top, 10, 1, Math.floor(T0 * 3 + v.col) % 4 ? '#3a1408' : '#7a2a0c');
      if (v.state === 'warn') {
        R(g, x + 3, top - 1, 10, 1, Math.floor(T0 * 16) % 2 ? '#ffb030' : '#f04a0c');
        g.globalAlpha = 0.25; disc(g, x + 8, top - 2, 7, '#ff8a2a'); g.globalAlpha = 1;
      }
      if (v.state === 'burn') {
        g.globalAlpha = 0.22; disc(g, x + 8, top - 20, 20, '#ff8a2a'); g.globalAlpha = 1;
        flameWall(g, x, x + TILE, top, 46, T0 * 1.4, 1, v.col * 3);
      }
    }
  }

  // The rickety shed: warped planks with gaps, a crooked tin roof, a lit door
  _drawShed(g, cam, T0) {
    const s = this.shed, A = this.art;
    const wob = this.mode === 'wind' ? Math.round(Math.sin(T0 * 9) * (this.gust.state === 'gust' ? 1.4 : 0.6)) : 0;
    const rattle = this.doorShut ? Math.round(Math.sin(T0 * 34) * Math.max(0, 1.2 - this.phaseT / 1.6)) : 0;
    const x = Math.round(s.x * S) - cam + (wob + rattle) * S, y = Math.round(s.y * S);
    if (x > CW + 10 || x < -100) return;
    if (!this.doorShut) {                                                 // warm light spilling out
      g.globalAlpha = 0.25; ditherFill(g, x - 4, y + 66, 34, 4, '#ffd870', 0.5); g.globalAlpha = 1;
    }
    draw(g, A.shed, x - 4, y);
    R(g, x + 5, y + 27, 22, 41, INK);                                     // door frame
    if (this.doorShut) draw(g, A.doors.shut, x + 6, y + 28);
    else {
      draw(g, A.doors.open, x + 6, y + 28);
      if (Math.floor(T0 * 4) % 2) R(g, x + 15, y + 34, 2, 2, '#ffffff');  // lantern flicker
      const swing = Math.round(2 + Math.sin(T0 * (this.mode === 'wind' ? 8 : 2)) * 2) * S;
      draw(g, A.doors.leaf, x + 1 - swing, y + 28);
    }
    const flap = Math.round(Math.sin(T0 * 12) * (this.mode === 'wind' ? 2 : 0.5)) * S;
    draw(g, A.sheet, x + 70, y + 4 + flap);                               // loose sheet
  }

  _drawFamily(g, cam, T0) {
    const A = this.art, L = this.leader;
    const n = this.family.length;
    for (let i = n - 1; i >= 0; i--) {                         // followers behind, leader in front
      const m = this.family[i], fr = A.runners[i];
      let st;
      if (this.phase === 'intro') {                            // lined up behind the leader, jogging in place
        const gap = Math.min(7, 20 / Math.max(1, n - 1));
        st = { x: L.x - i * gap, y: L.y + L.h, face: 1, pose: 'run' + (Math.floor(T0 * 8 + i) % 4) };
      } else if (i === 0) {
        st = { x: L.x, y: L.y + L.h, face: L.face, pose: this._pose(L) };
        if (L.invuln > 0 && this.phase === 'play' && Math.floor(T0 * 20) % 2) continue;
      } else {
        st = this._followerState(i);
        if (!st) continue;
      }
      if (this.phase === 'enter' && st.x > this.doorX + 2) continue;    // already inside
      const pose = this.phase === 'collapse' ? 'down' : st.pose;
      if (this.phase === 'collapse' && i > 0) st = { ...st, y: this._groundTopAt(st.x + 3) };
      let spr = pose === 'down' ? fr.down : pose === 'jump' ? fr.jump : pose === 'crouch' ? fr.crouch
        : pose.startsWith('run') ? fr.run[+pose[3] || 0] : fr.stand;
      if (m.hurt > 0 && Math.floor(T0 * 30) % 2) spr = silhouette(spr, '#ffffff');
      const feet = Math.round(st.y * S);
      const sx = pose === 'down' ? Math.round(st.x * S) - cam - 4 : Math.round(st.x * S) - cam + (TILE - 4 - fr.w) / 2 + 1;
      draw(g, spr, sx, feet - spr.h, st.face < 0);
      if (i === 0 && this.phase === 'play') {                          // leader marker
        const bob = Math.floor(T0 * 4) % 2;
        draw(g, A.marker, Math.round(st.x * S) - cam + 4, feet - spr.h - 7 + bob);
      }
    }
    if (this.mode === 'heat' && this.stamina < 25 && Math.floor(T0 * 3) % 2 && this.phase === 'play') {
      const x = Math.round(L.x * S) - cam + 14, y = Math.round(L.y * S) - 6;
      R(g, x, y, 1, 1, '#d8f4ff'); R(g, x - 1, y + 1, 3, 2, '#3cbcfc'); R(g, x, y + 3, 1, 1, '#2a8ad8');
    }
  }

  _drawDebris(g, cam) {
    for (const d of this.debris) {
      const spr = this.art.debris[d.kind][Math.floor(d.rot) % 4];
      draw(g, spr, Math.round(d.x * S) - cam - spr.w / 2, Math.round(d.y * S - spr.h / 2));
    }
  }

  _drawEmbers(g, cam) {
    for (const e of this.embers) {
      const x = Math.round(e.x * S) - cam, y = Math.round(e.y * S);
      g.globalAlpha = 0.5; R(g, x + 1, y - 7, 1, 4, '#8a7a74'); R(g, x + 2, y - 11, 1, 3, '#6a5e5a'); g.globalAlpha = 1;
      draw(g, this.art.ember, x - 2, y - 2);
    }
  }

  _drawFireWall(g, cam, T0) {
    const f = Math.round(this.fireWall * S) - cam;
    if (f < -40) return;
    g.globalAlpha = 0.18; ditherFill(g, Math.max(0, f), HUD_PX, 28, CH - HUD_PX, '#ff8a2a', 0.5); g.globalAlpha = 1;
    for (let k = 0; k < 4; k++) {                                         // smoke rolling up behind the flames
      const py = HUD_PX + 6 + ((k * 23 + T0 * 18) % 60);
      drawPuff(g, f + 2 + Math.sin(T0 + k) * 4, py, 8 + k * 2, '#2a1416', '#6a2410', 0.5);
    }
    for (let y = HUD_PX; y < CH; y += 2) {
      const ly = y / S;
      const lick = Math.round((Math.sin(ly * 0.5 + T0 * 10) * 3 + Math.sin(ly * 0.17 + T0 * 4) * 2) * S);
      const tip = f + lick;
      R(g, 0, y, tip + 2, 2, '#5a0a04');
      R(g, 0, y, tip, 2, '#c81e08');
      R(g, 0, y, tip - 6, 2, '#f05a10');
      R(g, 0, y, tip - 14, 2, '#ff9a1e');
      R(g, 0, y, tip - 26, 2, '#ffe060');
      R(g, 0, y, tip - 46, 2, '#fff8c0');
      if (((y * 7 + Math.floor(T0 * 14)) % 19) === 0) R(g, tip + 4, y, 3, 2, '#f05a10');   // detached licks
    }
  }

  _drawParticles(g, cam) {
    const gust = this.gust.state === 'gust';
    for (const p of this.particles) {
      const k = 1 - p.t / p.life;
      const x = Math.round(p.x * S) - cam, y = Math.round(p.y * S);
      switch (p.kind) {
        case 'ember': R(g, x, y, 1, 1, k > 0.5 ? '#ffd040' : '#f04a0c'); if (k > 0.7) R(g, x, y + 1, 1, 1, '#c81e08'); break;
        case 'spark': R(g, x, y, 2, 2, p.color || WHITE); break;
        case 'sweat': R(g, x, y, 1, 2, '#3cbcfc'); break;
        case 'puff': drawPuff(g, x, y, 2 + (1 - k) * 2, this.lk.dust, null, 0.6); break;
        case 'smoke': {
          g.globalAlpha = 0.7 * k;
          drawPuff(g, x, y, p.r * (1 + p.t) * S, '#3a3436', '#5a5050', 0.5);
          g.globalAlpha = 1; break;
        }
        case 'streak': g.globalAlpha = 0.45 * k; R(g, x, y, p.len * S * (gust ? 2 : 1), 1, WHITE); g.globalAlpha = 1; break;
        case 'rain': g.globalAlpha = 0.75; R(g, x, y, 1, 3, '#a0c8fc'); R(g, x - 1, y + 3, 1, 2, '#a0c8fc'); g.globalAlpha = 1; break;
      }
    }
  }

  _drawOverlay(g, T0) {
    if (this.mode === 'fire') {
      g.fillStyle = 'rgba(80,0,0,0.12)'; g.fillRect(0, 0, CW, CH);
      g.globalAlpha = 0.3;
      for (let i = 0; i < 4; i++) {                       // drifting smoke banks
        const x = ((i * 100 - T0 * 24) % 440 + 440) % 440 - 80;
        drawPuff(g, x, 64 + i * 18, 18, '#1e1214', null, 0.6);
        drawPuff(g, x + 22, 70 + i * 18, 14, '#1e1214', null, 0.6);
      }
      g.globalAlpha = 1;
    }
    if (this.mode === 'wind') {
      g.fillStyle = 'rgba(10,20,40,0.15)'; g.fillRect(0, 0, CW, CH);
      if (this.stormy && this._lightning(T0)) { g.fillStyle = 'rgba(252,252,252,0.35)'; g.fillRect(0, 0, CW, CH); }
    }
    if (this.mode === 'heat') {
      g.fillStyle = this.look === 'dust' ? 'rgba(200,150,90,0.16)' : 'rgba(252,224,168,0.10)';
      g.fillRect(0, 0, CW, CH);
    }
  }

  _drawChevrons(g, dir, cx, y, color) {
    const rows = this.art.chevron[dir < 0 ? 0 : 1];
    for (let k = 0; k < 3; k++) {
      const x = cx + k * 6;
      for (const [d, col] of [[1, INK], [0, color]]) {
        for (let r = 0; r < rows.length; r++) for (let c = 0; c < 4; c++) if (rows[r][c] === '#') R(g, x + c + d, y + r + d, 1, 1, col);
      }
    }
  }

  _drawHUD(g, T0) {
    const A = this.art, lk = this.lk;
    plate(g, 0, 0, CW, HUD_PX, { fill: '#120e1a' });
    R(g, 0, HUD_PX, CW, 1, INK);
    text(g, this.label, 5, 7, { color: lk.hud, shadow: INK });
    const hx = 88;                                                      // family health
    draw(g, A.heart, hx, 7);
    const hcol = this.health > 50 ? ['#3ad04a', '#a8f8a0'] : this.health > 25 ? ['#f8c020', '#fff0a0'] : ['#e8402a', '#ffa090'];
    meter(g, hx + 10, 6, this.health / 100, { col: hcol[0], hi: hcol[1] });
    if (this.mode === 'heat') {                                         // stamina
      const low = this.stamina < 12 && Math.floor(T0 * 8) % 2;
      draw(g, A.drop, 172, 6);
      bar(g, 181, 7, 44, 7, this.stamina / 100, low ? '#e8402a' : '#3cbcfc', low ? '#ffa090' : '#c8f0ff');
    }
    const prog = clamp((this.leader.x - this.spawn.x) / (this.doorX - this.spawn.x), 0, 1);  // progress to shed
    const px0 = 236, pw = 60;
    R(g, px0, 9, pw, 3, INK); R(g, px0 + 1, 10, pw - 2, 1, '#5a5468');
    for (let x = px0 + 4; x < px0 + pw; x += 8) R(g, x, 10, 2, 1, '#8a84a0');
    const mx = px0 + Math.round(prog * (pw - 6));
    R(g, mx, 5, 6, 10, INK); R(g, mx + 1, 6, 4, 3, SKINS[1]); R(g, mx + 1, 9, 4, 5, SHIRTS[0]);   // leader colors
    draw(g, A.shedIcon, 302, 6);
    if (this.phase === 'play' && this.mode === 'wind' && this.gust.state !== 'calm' && (this.gust.state === 'gust' || Math.floor(T0 * 10) % 2)) {
      const warn = this.gust.state === 'warn';
      const word = warn ? 'GUST!' : 'BRACE!';
      const tw = word.length * 6 - 1, total = tw + 6 + 18;
      const x0 = Math.round(CW / 2 - total / 2);
      label(g, word, x0, 27, warn ? '#ffe060' : WHITE);
      this._drawChevrons(g, this.gust.dir, x0 + tw + 6, 28, warn ? '#ffe060' : '#9cc8fc');
    }
    if (this.mode === 'heat' && this.stamina < 12 && this.phase === 'play') label(g, 'EXHAUSTED! FIND SHADE', CW / 2, 27, '#ff8a6a', 'center');
    if (this._banner && this._banner.t > 0) {
      drawLogo(g, this._banner.text, CW / 2, 38, 2, this._banner.color === '#3cbcfc' ? BLUE : RED);
    }
  }

  _drawButtons(g) {
    const held = new Set(this.touches.values());
    const y = (LH - 22) * S, s = 20 * S;
    touchButton(g, 2 * S, y, s, s, 'left', held.has('l'));
    touchButton(g, 26 * S, y, s, s, 'right', held.has('r'));
    touchButton(g, (LW - 46) * S, y, s, s, 'down', held.has('d'));
    touchButton(g, (LW - 22) * S, y, s, s, 'up', held.has('j'));
  }

  _drawIntro(g, T0) {
    const k = ease(this.phaseT / 0.35);
    g.globalAlpha = k;
    g.drawImage(this.art.veil, 0, HUD_PX);
    g.globalAlpha = 1;
    const drop = (d) => Math.round((1 - ease((this.phaseT - d) / 0.45)) * -60);
    g.save();
    g.beginPath(); g.rect(0, HUD_PX + 1, CW, CH - HUD_PX - 1); g.clip();      // logos drop in from under the HUD
    drawLogo(g, 'RUN FOR', CW / 2, 24 + drop(0), 3, GOLD);
    drawLogo(g, 'THE SHED!', CW / 2, 49 + drop(0.12), 3, GOLD);
    g.restore();
    if (this.phaseT < 0.35) return;
    label(g, this.label, CW / 2, 79, this.lk.hud, 'center');
    label(g, this.cfg.hint, CW / 2, 89, WHITE, 'center');
    const perkNames = {
      firstAid: 'FIRST AID', burnMult: 'GAS MASKS', staminaMult: 'INSULATION',
      drinks: `${this.perks.drinks} WATER`, pushMult: 'TARP BRACE', earlyWarning: 'RADIO',
    };
    const perks = Object.keys(this.perks).map(p => perkNames[p]).filter(Boolean);
    const lines = perks.length ? wrapText('SUPPLIES: ' + perks.join(', '), 48) : ['NO SUPPLIES FOR THIS ONE'];
    lines.slice(0, 2).forEach((ln, i) => label(g, ln, CW / 2, 100 + i * 9, perks.length ? '#7ae07a' : '#8a8498', 'center'));
    label(g, this.showTouch ? 'BUTTONS: MOVE - JUMP - CROUCH' : 'ARROWS MOVE - SPACE JUMP - DOWN CROUCH', CW / 2, 119, '#c8c4d8', 'center');
    countdown(g, INTRO_SECONDS - this.phaseT - 0.5, CW / 2 + 70, 136);
    this._drawFamily(g, Math.round(this.camX * S), T0);                // the family, ready to run
  }

  _drawEnd(g) {
    const ok = this.outcome !== 'failed';
    const k = Math.min(1, this.phaseT / 0.4);
    g.globalAlpha = 0.55 * k;
    g.drawImage(this.art.veil, 0, 0, CW, 52, 0, HUD_PX + 1, CW, 52);
    g.globalAlpha = 1;
    const title = { survived: 'SHELTERED!', barely: 'MADE IT... BARELY', failed: 'OVERWHELMED' }[this.outcome];
    const bands = this.outcome === 'survived' ? GREEN : this.outcome === 'barely' ? GOLD : RED;
    const t = clamp(this.phaseT / 0.55, 0, 1), c1 = 1.70158;
    const kb = 1 + (c1 + 1) * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);     // ease-out-back
    const big = title.length <= 12;
    drawLogo(g, title, CW / 2, Math.round(lerp(-30, HUD_PX + (big ? 5 : 10), kb)), big ? 3 : 2, bands);
    if (this.phaseT > 0.35) {
      label(g, ok ? 'THE SHED CREAKS - BUT IT HOLDS.' : 'THE FAMILY COLLAPSES SHORT OF COVER.', CW / 2, HUD_PX + 36, WHITE, 'center');
    }
  }
}
