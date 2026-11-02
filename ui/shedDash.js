/**
 * shedDash.js — "Run for the Shed": an 8-bit side-scrolling dash
 *
 * Original NES-era-style platformer (chunky 8×8 tiles, bold limited palette,
 * black-outlined sprites, blocky 3×5 pixel font). The family runs right
 * across a scrolling field to a rickety shed while the peril interferes:
 *
 *   HEAT — sluggish, slippery movement and shorter jumps; stamina drains as you
 *          run and only recovers in tree shade; cacti hurt.
 *   WIND — strong, telegraphed gusts shove you (worst mid-jump); crouch or stand
 *          in the lee of crates/cars to brace; debris flies low (jump it) or
 *          high (duck it). Hurricane/flood variants add rain and flooded pits.
 *   FIRE — ground vents smoke, then burst into flame columns; a wall of fire
 *          chases you; burning embers fall from above.
 *
 * Renders to the shared <canvas id="asciiDisplay"> at 160×90 logical px (2×).
 * All numeric constants are GAMEPLAY TUNING (px, px/s, health points), not
 * climate data. Outcome effects match the original Shelter Dash.
 *
 * Public interface (same contract as the other mini-games):
 *   new ShedDash(canvasEl, infoBarEl)
 *   .start(progress, onComplete, { peril, variant, family, perks })
 *   .stop()
 *   onComplete({ survived, narrative, effects, used })
 */

// ── Screen & world ───────────────────────────────────────────────────────────
const LW = 160, LH = 90, S = 2;
const T = 8;                 // tile size (logical px)
const ROWS = 12;             // world rows (bottom row partly below the screen)
const HUD_H = 10;
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

// ── Palettes (original picks in a limited 8-bit spirit) ─────────────────────
const K = '#000000', W = '#fcfcfc';
const PAL = {
  heat: { sky: ['#f8b800', '#fcd060', '#fce0a8'], far: '#e45c10', farHi: '#f88838', mid: '#ac7c00',
          grass: '#d8b858', grassHi: '#f8e8a0', dirt: '#a85808', dot: '#7c3c00', hud: '#f8b800' },
  wind: { sky: ['#3c4c6c', '#58688c', '#7c8ca8'], far: '#2c3c4c', farHi: '#44566a', mid: '#1c4c2c',
          grass: '#3cb83c', grassHi: '#88f070', dirt: '#7c4c1c', dot: '#503000', hud: '#9cc8fc' },
  fire: { sky: ['#2c0808', '#881000', '#f83800'], far: '#1c0606', farHi: '#3c0c0c', mid: '#3c0e0e',
          grass: '#887000', grassHi: '#c8a020', dirt: '#5c3c1c', dot: '#2c1c0c', hud: '#f87858' },
};
const SHIRTS = ['#d82800', '#0058f8', '#f8b800', '#00a800', '#9878f8', '#f87858'];
const SKINS = ['#fcbcb0', '#c87c40', '#8c4c20', '#e0a070', '#fcd8a8', '#a86030'];
const HAIRS = ['#503000', '#000000', '#7c3c00', '#000000', '#f8b800', '#503000'];

// ── Sprites (8 wide; o=outline s=skin h=hair c=shirt p=pants E=eye) ──────────
const HEAD = ['..oooo..', '.ohhhho.', '.ohssso.', '.osssEo.', '..osso..'];
const BLANK = '........';
const SPR = {
  stand:  [...HEAD, '.occcco.', 'osccccso', '.occcco.', '.oppppo.', '.opoopo.', '.opoopo.', '.oo..oo.'],
  walkA:  [...HEAD, '.occcco.', 'osccccso', '.occcco.', '.oppppo.', 'opo..opo', 'op....po', 'oo....oo'],
  walkB:  [...HEAD, '.occcco.', 'osccccso', '.occcco.', '.oppppo.', '.oppppo.', '..oppo..', '..oooo..'],
  jump:   [...HEAD, '.occccos', '.occcco.', '.occcco.', '.oppppo.', 'opo..opo', 'oo....oo', BLANK],
  crouch: [BLANK, BLANK, BLANK, BLANK, '..oooo..', '.ohhhho.', '.ohssso.', '.osssEo.',
           '.occcco.', 'osccccso', '.oppppo.', '.oo..oo.'],
  down:   [BLANK, BLANK, BLANK, BLANK, BLANK, BLANK, BLANK, BLANK,
           '.ooooooo', 'ohssccpp', 'ohssccpp', '.ooooooo'],
};

// ── Blocky 3×5 pixel font (rows separated by spaces) ─────────────────────────
const FONT_ROWS = {
  A: '.#. #.# ### #.# #.#', B: '##. #.# ##. #.# ##.', C: '.## #.. #.. #.. .##', D: '##. #.# #.# #.# ##.',
  E: '### #.. ##. #.. ###', F: '### #.. ##. #.. #..', G: '.## #.. #.# #.# .##', H: '#.# #.# ### #.# #.#',
  I: '### .#. .#. .#. ###', J: '..# ..# ..# #.# .#.', K: '#.# #.# ##. #.# #.#', L: '#.. #.. #.. #.. ###',
  M: '#.# ### ### #.# #.#', N: '##. #.# #.# #.# #.#', O: '.#. #.# #.# #.# .#.', P: '##. #.# ##. #.. #..',
  Q: '.#. #.# #.# ##. .##', R: '##. #.# ##. #.# #.#', S: '.## #.. .#. ..# ##.', T: '### .#. .#. .#. .#.',
  U: '#.# #.# #.# #.# ###', V: '#.# #.# #.# #.# .#.', W: '#.# #.# ### ### #.#', X: '#.# #.# .#. #.# #.#',
  Y: '#.# #.# .#. .#. .#.', Z: '### ..# .#. #.. ###',
  0: '### #.# #.# #.# ###', 1: '.#. ##. .#. .#. ###', 2: '##. ..# .#. #.. ###', 3: '##. ..# .#. ..# ##.',
  4: '#.# #.# ### ..# ..#', 5: '### #.. ##. ..# ##.', 6: '.## #.. ### #.# ###', 7: '### ..# .#. .#. .#.',
  8: '### #.# ### #.# ###', 9: '### #.# ### ..# ##.',
  '!': '.#. .#. .#. ... .#.', '.': '... ... ... ... .#.', '-': '... ... ### ... ...', '%': '#.# ..# .#. #.. #.#',
  ':': '... .#. ... .#. ...', "'": '.#. .#. ... ... ...', '?': '##. ..# .#. ... .#.', '/': '..# ..# .#. #.. #..',
  '+': '... .#. ### .#. ...', '&': '.#. #.# .#. #.# .##', ',': '... ... ... .#. #..',
  '<': '..# .#. #.. .#. ..#', '>': '#.. .#. ..# .#. #..',
};
const FONT = Object.fromEntries(Object.entries(FONT_ROWS).map(([k, v]) => [k, v.replace(/ /g, '')]));

function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function rand(lo, hi) { return lo + Math.random() * (hi - lo); }
function irand(lo, hi) { return Math.floor(rand(lo, hi + 1)); }
function overlap(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

// Split text into lines of at most `max` characters
function wrap(text, max) {
  const lines = [];
  let cur = '';
  for (const word of text.split(' ')) {
    if ((cur + ' ' + word).trim().length > max) { lines.push(cur.trim()); cur = word; } else cur += ' ' + word;
  }
  if (cur.trim()) lines.push(cur.trim());
  return lines;
}

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
    this.pal = PAL[this.mode];
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
      shirt: SHIRTS[i % SHIRTS.length], skin: SKINS[(i * 2 + 1) % SKINS.length], hair: HAIRS[i % HAIRS.length],
      small: typeof members[i]?.age === 'number' && members[i].age < 13, hurt: 0,
    }));

    this._buildLevel();

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
        this.canvas.setPointerCapture?.(e.pointerId);
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
    const dt = Math.min(1 / 30, (now - this._last) / 1000);
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
    return Math.abs(L.vx) > 4 ? (Math.floor(L.walk) % 2 ? 'walkA' : 'walkB') : 'stand';
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
      this._banner = { text: 'FIRST AID!', t: 1.4, color: W };
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

  // ── Drawing ────────────────────────────────────────────────────────────────

  _draw() {
    const c = this.bctx;
    const cam = Math.round(this.camX);
    const r = (x, y, w, h, col) => { if (w <= 0 || h <= 0) return; c.fillStyle = col; c.fillRect(Math.round(x) * S, Math.round(y) * S, Math.round(w) * S, Math.round(h) * S); };
    const wr = (x, y, w, h, col) => r(x - cam, y, w, h, col);   // world-space rect
    const T0 = this.elapsed + this.phaseT;

    this._drawSky(r, T0);
    this._drawParallax(r, cam, T0);
    this._drawDecor(wr, cam, T0, true);
    this._drawTiles(wr, cam);
    this._drawDecor(wr, cam, T0, false);
    this._drawShed(wr, T0);
    if (this.mode === 'heat') this._drawCacti(wr, cam);
    if (this.mode === 'fire') this._drawVents(wr, cam, T0);
    this._drawFamily(wr, T0);
    if (this.mode === 'wind') this._drawDebris(wr);
    if (this.mode === 'fire') { this._drawEmbers(wr); this._drawFireWall(wr, T0); }
    this._drawParticles(wr);
    this._drawOverlay(c, r, T0);

    // Composite (heat shimmer / shake)
    const ctx = this.ctx;
    ctx.clearRect(0, 0, LW * S, LH * S);
    const sx = this.shake > 0 ? Math.round(rand(-2, 2) * this.shake) * S : 0;
    const sy = this.shake > 0 ? Math.round(rand(-2, 2) * this.shake) * S : 0;
    if (this.mode === 'heat') {
      const amp = 1 + (1 - this.stamina / 100) * 2;
      for (let y = 0; y < LH * S; y += 2) {
        const off = y > HUD_H * S ? Math.round(Math.sin(y * 0.09 + T0 * 7) * amp) : 0;
        ctx.drawImage(this.buf, 0, y, LW * S, 2, off + sx, y + sy, LW * S, 2);
      }
    } else ctx.drawImage(this.buf, sx, sy);
    if (this.flash > 0) { ctx.fillStyle = `rgba(248,56,0,${this.flash * 0.3})`; ctx.fillRect(0, 0, LW * S, LH * S); }

    const hr = (x, y, w, h, col) => { if (w <= 0 || h <= 0) return; ctx.fillStyle = col; ctx.fillRect(Math.round(x) * S, Math.round(y) * S, Math.round(w) * S, Math.round(h) * S); };
    this._drawHUD(hr, T0);
    if (this.showTouch && this.phase === 'play') this._drawButtons(hr);
    if (this.phase === 'intro') this._drawIntro(hr, T0);
    if (this.phase === 'enter' || this.phase === 'collapse') this._drawEnd(hr);
  }

  // Blocky pixel text. scale = logical px per font pixel.
  _text(r, str, x, y, color, scale = 1, align = 'left', shadow = true) {
    const s = String(str).toUpperCase();
    const width = s.length * 4 * scale - scale;
    let cx = Math.round(align === 'center' ? x - width / 2 : align === 'right' ? x - width : x);
    for (const ch of s) {
      const g = FONT[ch];
      if (g) {
        for (let i = 0; i < 15; i++) {
          if (g[i] !== '#') continue;
          const px = cx + (i % 3) * scale, py = y + Math.floor(i / 3) * scale;
          if (shadow) r(px + scale, py + scale, scale, scale, K);
          r(px, py, scale, scale, color);
        }
      }
      cx += 4 * scale;
    }
  }

  _drawSky(r, T0) {
    const P = this.pal;
    r(0, 0, LW, LH, P.sky[0]);
    r(0, 26, LW, 20, P.sky[1]);
    r(0, 46, LW, LH - 46, P.sky[2]);
    for (let x = 0; x < LW; x += 2) {                               // dithered band edges
      r(x + (x % 4 ? 1 : 0), 25, 1, 1, P.sky[1]);
      r(x + (x % 4 ? 0 : 1), 45, 1, 1, P.sky[2]);
    }
    if (this.mode === 'heat') {                                     // blocky sun with pulsing rays
      const pulse = Math.floor(T0 * 2) % 2;
      r(122, 14, 16, 16, W); r(120, 16, 20, 12, W); r(124, 12, 12, 20, W);
      r(124, 16, 12, 12, '#fce0a8');
      for (const [dx, dy] of [[-6, 20], [24, 20], [18, 4], [0, 4], [18, 34], [0, 34]]) r(122 + dx, 2 + dy, 2 + pulse, 2 + pulse, W);
    }
    if (this.mode === 'fire') r(0, LH - 20, LW, 20, '#f87858');
  }

  _drawParallax(r, cam, T0) {
    const P = this.pal;
    // far mesas / ridges (0.2×)
    const off = (cam * 0.2) % 16;
    for (let i = 0; i < 13; i++) {
      const hgt = this.far[(i + Math.floor(cam * 0.2 / 16)) % this.far.length];
      const x = i * 16 - off;
      r(x, 66 - hgt, 16, hgt + 30, P.far);
      r(x, 66 - hgt, 16, 2, P.farHi);
      r(x + 2, 66 - hgt + 2, 2, 1, P.farHi);
    }
    // clouds / smoke banks
    for (const cl of this.clouds) {
      const drift = this.mode === 'wind' ? -T0 * (this.gust.state === 'gust' ? 40 : 14) : T0 * 3;
      const x = ((cl.x - cam * 0.1 + drift) % 200 + 200) % 200 - 30;
      const col = this.mode === 'fire' ? '#3c0c0c' : this.mode === 'wind' ? '#2c3c4c' : W;
      const out = this.mode === 'heat' ? '#f8b800' : K;
      const w = cl.w * 6;
      r(x - 1, cl.y + 3, w + 2, 6, out);
      r(x, cl.y + 2, w, 6, col);
      r(x + 4, cl.y - 1, w - 10, 4, out); r(x + 5, cl.y, w - 12, 4, col);
    }
    // mid silhouettes (0.45×): cacti / burnt snags / bending trees
    const moff = (cam * 0.45) % 20;
    for (let i = 0; i < 10; i++) {
      const m = this.mid[(i + Math.floor(cam * 0.45 / 20)) % this.mid.length];
      const x = i * 20 - moff, base = 74;
      if (this.mode === 'heat') {
        r(x + 8, base - m.h, 4, m.h, P.mid); r(x + 4, base - m.h + 5, 4, 3, P.mid); r(x + 4, base - m.h + 2, 2, 4, P.mid);
        r(x + 12, base - m.h + 8, 4, 3, P.mid); r(x + 14, base - m.h + 4, 2, 5, P.mid);
      } else if (this.mode === 'fire') {
        r(x + 9, base - m.h, 2, m.h, P.mid); r(x + 6, base - m.h + 4, 3, 1, P.mid); r(x + 11, base - m.h + 7, 3, 1, P.mid);
        if (m.kind > 0.6 && Math.floor(T0 * 6 + i) % 3) r(x + 9, base - m.h - 2, 2, 2, '#f83800');
      } else {
        const sway = Math.round(Math.sin(T0 * 3 + i) * (this.gust.state === 'gust' ? 3 : 1));
        r(x + 9, base - m.h + 8, 2, m.h - 8, P.mid);
        r(x + 3 + sway, base - m.h, 14, 10, P.mid); r(x + 5 + sway, base - m.h - 3, 10, 4, P.mid);
      }
    }
  }

  _drawTiles(wr, cam) {
    const P = this.pal;
    const c0 = Math.max(0, Math.floor(cam / T) - 1), c1 = Math.min(this.cols - 1, c0 + Math.ceil(LW / T) + 2);
    for (let col = c0; col <= c1; col++) {
      const h = this.ground[col];
      const x = col * T;
      if (h > 0) {
        const top = (ROWS - h) * T;
        wr(x, top, T, LH - top + 10, P.dirt);
        for (let y = top + 8; y < LH; y += 8) {                         // dirt pattern
          const odd = (col + y / 8) % 2;
          wr(x + (odd ? 1 : 5), y + 2, 2, 1, P.dot);
          wr(x + (odd ? 5 : 2), y + 5, 1, 1, P.dot);
          wr(x, y, T, 1, P.dot);
        }
        wr(x, top, T, 3, P.grass);                                        // grass cap
        wr(x, top, T, 1, P.grassHi);
        wr(x + (col % 3), top + 3, 2, 1, P.grass);
        if (!this.ground[col - 1] || this.ground[col - 1] < h) wr(x, top, 1, LH - top, K);
        if (!this.ground[col + 1] || this.ground[col + 1] < h) wr(x + T - 1, top, 1, LH - top, K);
        wr(x, top - 1, T, 1, K);
      } else if (this.stormy) {                                          // flooded pit
        wr(x, LH - 9, T, 10, '#2038ec'); wr(x, LH - 9, T, 1, '#3cbcfc');
      }
      for (let row = 0; row < ROWS; row++) {
        if (this._extraSolidAt(col, row) && !this._decorAt(col, row)) this._drawCrate(wr, x, row * T);
      }
    }
  }

  _decorAt(col, row) {
    return this.decor.some(d => (d.kind === 'car' && row === d.row && col >= d.col && col < d.col + 3) ||
                                (d.kind === 'fence' && d.col === col && d.row === row));
  }

  _drawCrate(wr, x, y) {
    wr(x, y, T, T, K);
    wr(x + 1, y + 1, 6, 6, '#c84c0c');
    wr(x + 1, y + 1, 6, 1, '#fc9838');
    wr(x + 1, y + 1, 1, 6, '#fc9838');
    for (let k = 0; k < 6; k++) { wr(x + 1 + k, y + 1 + k, 1, 1, '#7c2c00'); wr(x + 6 - k, y + 1 + k, 1, 1, '#7c2c00'); }
  }

  _drawDecor(wr, cam, T0, back) {
    for (const d of this.decor) {
      const x = d.col * T;
      if (x < cam - 30 || x > cam + LW + 10) continue;
      if (d.kind === 'tree' && !!d.back === back) {
        const top = (ROWS - this.ground[d.col]) * T;
        const sway = this.mode === 'wind' ? Math.round(Math.sin(T0 * 4 + d.col) * (this.gust.state === 'gust' ? 2 : 1)) : 0;
        const leaf = this.mode === 'heat' ? ['#88a800', '#b8d838'] : this.mode === 'fire' ? ['#3c1c0c', '#5c2c0c'] : ['#00a800', '#58d854'];
        if (this.mode === 'heat') wr(x - 8, top - 1, 24, 2, 'rgba(0,0,0,0.25)');   // shade on the ground
        wr(x + 2, top - 14, 4, 14, K); wr(x + 3, top - 14, 2, 14, '#7c4c1c');
        wr(x - 7 + sway, top - 25, 22, 13, K);
        wr(x - 6 + sway, top - 24, 20, 11, leaf[0]);
        wr(x - 3 + sway, top - 28, 14, 5, K); wr(x - 2 + sway, top - 27, 12, 4, leaf[0]);
        wr(x - 4 + sway, top - 23, 6, 3, leaf[1]); wr(x + 3 + sway, top - 26, 5, 2, leaf[1]);
        if (this.mode === 'fire' && Math.floor(T0 * 8 + d.col) % 2) wr(x + 4 + sway, top - 29, 3, 2, '#f83800');
      }
      if (!back && d.kind === 'car') {
        const y = d.row * T;
        wr(x, y + 1, 24, 7, K);
        wr(x + 1, y + 2, 22, 4, '#a81000'); wr(x + 1, y + 2, 22, 1, '#e45c10');
        wr(x + 5, y - 3, 13, 5, K); wr(x + 6, y - 2, 11, 3, '#a81000');
        wr(x + 7, y - 2, 4, 2, '#3cbcfc'); wr(x + 12, y - 2, 4, 2, '#3cbcfc');
        wr(x + 3, y + 5, 5, 3, K); wr(x + 16, y + 5, 5, 3, K);
        wr(x + 4, y + 6, 3, 1, '#bcbcbc'); wr(x + 17, y + 6, 3, 1, '#bcbcbc');
        wr(x + 9, y + 3, 3, 2, '#503000');
      }
      if (!back && d.kind === 'fence') {
        const y = d.row * T;
        wr(x + 1, y - 2, 2, 10, K); wr(x + 5, y - 2, 2, 10, K);
        wr(x + 1, y - 1, 1, 9, W); wr(x + 5, y - 1, 1, 9, W);
        wr(x, y + 1, 8, 2, K); wr(x, y + 5, 8, 2, K);
        wr(x, y + 1, 8, 1, '#bcbcbc'); wr(x, y + 5, 8, 1, '#bcbcbc');
      }
    }
  }

  _drawCacti(wr, cam) {
    for (const c of this.cacti) {
      const x = c.col * T, top = (ROWS - this.ground[c.col]) * T;
      if (x < cam - 10 || x > cam + LW + 10) continue;
      wr(x + 2, top - 11, 4, 11, K); wr(x + 3, top - 10, 2, 10, '#00a800');
      wr(x, top - 8, 3, 5, K); wr(x + 1, top - 7, 1, 3, '#00a800');
      wr(x + 5, top - 9, 3, 4, K); wr(x + 6, top - 8, 1, 2, '#00a800');
      wr(x + 3, top - 9, 1, 1, '#b8f818'); wr(x + 4, top - 5, 1, 1, '#b8f818');
    }
  }

  _drawVents(wr, cam, T0) {
    for (const v of this.vents) {
      const x = v.col * T, top = (ROWS - this.ground[v.col]) * T;
      if (x < cam - 10 || x > cam + LW + 10) continue;
      wr(x + 1, top, 6, 2, K); wr(x + 2, top, 4, 1, '#503000');                      // charred crack
      if (v.state === 'warn') wr(x + 2, top - 1, 4, 1, Math.floor(T0 * 16) % 2 ? '#f8b800' : '#f83800');
      if (v.state === 'burn') {
        const f = Math.floor(T0 * 14) % 3;
        const hgt = 20 + f * 2;
        wr(x, top - hgt, T, hgt, K);
        wr(x + 1, top - hgt + 1, 6, hgt - 1, '#d82800');
        wr(x + 2, top - hgt + 4, 4, hgt - 5, '#f87800');
        wr(x + 3, top - hgt + 8, 2, hgt - 9, '#fce0a8');
        wr(x + (f === 1 ? 1 : 5), top - hgt - 2, 2, 2, '#f87800');
      }
    }
  }

  // The rickety shed: warped planks with gaps, a crooked tin roof, a lit door
  _drawShed(wr, T0) {
    const s = this.shed;
    const wob = this.mode === 'wind' ? Math.round(Math.sin(T0 * 9) * (this.gust.state === 'gust' ? 1.4 : 0.6)) : 0;
    const rattle = this.doorShut ? Math.round(Math.sin(T0 * 34) * Math.max(0, 1.2 - this.phaseT / 1.6)) : 0;
    const x = s.x + wob + rattle, y = s.y, w = 40, h = 34;
    wr(x - 1, y + 7, w + 2, h - 7, K);
    const planks = ['#a85808', '#884000', '#c86c1c', '#7c3c00'];
    for (let i = 0; i < w; i += 4) {
      const sag = i > w - 10 ? 1 : 0;
      wr(x + i, y + 8 + sag, 3, h - 8 - sag, planks[(i / 4) % 4]);
      wr(x + i, y + 8 + sag, 1, h - 8 - sag, '#e09048');
    }
    wr(x + 22, y + 18, 3, 8, K);                                                   // missing plank
    wr(x + 27, y + 12, 9, 7, K); wr(x + 28, y + 13, 7, 5, '#503000');              // boarded window
    wr(x + 28, y + 13, 7, 1, '#c86c1c'); wr(x + 28, y + 16, 7, 1, '#c86c1c');
    for (let i = -3; i < w + 4; i++) {                                             // crooked tin roof
      const sag = Math.round(i * 0.1);
      wr(x + i, y + 2 + sag, 1, 6, K);
      wr(x + i, y + 3 + sag, 1, 4, i % 2 ? '#bcbcbc' : '#7c7c7c');
    }
    wr(x + 6, y + 4, 4, 2, '#c84c0c'); wr(x + 26, y + 5, 3, 2, '#c84c0c');          // rust
    const flap = Math.round(Math.sin(T0 * 12) * (this.mode === 'wind' ? 2 : 0.5));
    wr(x + w - 5, y + 2 + flap, 8, 2, K); wr(x + w - 5, y + 2 + flap, 8, 1, W);     // loose sheet
    const dx = x + 3, dy = y + 14;                                                 // door
    wr(dx - 1, dy - 1, 12, h - 13, K);
    if (this.doorShut) {
      wr(dx, dy, 10, h - 14, '#884000');
      wr(dx + 2, dy + 2, 1, h - 18, '#503000'); wr(dx + 6, dy + 2, 1, h - 18, '#503000');
    } else {
      wr(dx, dy, 10, h - 14, Math.floor(T0 * 4) % 2 ? '#f8d878' : '#fce0a8');
      wr(dx + 3, dy + 3, 4, 4, '#f8b800');
      const swing = Math.round(2 + Math.sin(T0 * (this.mode === 'wind' ? 8 : 2)) * 2);
      wr(dx - swing - 1, dy, 3, h - 14, K); wr(dx - swing, dy + 1, 2, h - 16, '#a85808');
    }
  }

  _drawSprite(wr, tmpl, x, y, face, m, hurtFlash) {
    const cols = { o: K, s: m.skin, h: m.hair, c: hurtFlash ? W : m.shirt, p: '#24188c', E: K };
    for (let row = 0; row < tmpl.length; row++) {
      const line = tmpl[row];
      for (let i = 0; i < 8; i++) {
        const ch = line[face > 0 ? i : 7 - i];
        if (ch && ch !== '.' && cols[ch]) wr(x + i, y + row, 1, 1, cols[ch]);
      }
    }
  }

  _drawFamily(wr, T0) {
    for (let i = this.family.length - 1; i >= 0; i--) {         // followers behind, leader in front
      const m = this.family[i];
      let st;
      if (i === 0) {
        const L = this.leader;
        st = { x: L.x, y: L.y + L.h, face: L.face, pose: this._pose(L) };
        if (L.invuln > 0 && this.phase === 'play' && Math.floor(T0 * 20) % 2) continue;
      } else {
        st = this._followerState(i);
        if (!st) continue;
      }
      if (this.phase === 'enter' && st.x > this.doorX + 2) continue;    // already inside
      const pose = this.phase === 'collapse' ? 'down' : st.pose;
      if (this.phase === 'collapse' && i > 0) st = { ...st, y: this._groundTopAt(st.x + 3) };
      let tmpl = SPR[pose] || SPR.stand;
      if (m.small && pose !== 'down' && pose !== 'crouch') tmpl = tmpl.slice(0, 4).concat(tmpl.slice(6));
      this._drawSprite(wr, tmpl, Math.round(st.x) - 1, Math.round(st.y) - tmpl.length, st.face, m, m.hurt > 0 && Math.floor(T0 * 30) % 2);
      if (i === 0 && this.phase === 'play') {                          // leader marker
        const bob = Math.floor(T0 * 4) % 2;
        wr(Math.round(st.x) + 2, Math.round(st.y) - tmpl.length - 4 + bob, 2, 2, '#f8b800');
      }
    }
    if (this.mode === 'heat' && this.stamina < 25 && Math.floor(T0 * 3) % 2) wr(this.leader.x + 7, this.leader.y - 3, 1, 2, '#3cbcfc');
  }

  _drawDebris(wr) {
    for (const d of this.debris) {
      const spin = Math.floor(d.rot) % 2;
      const col = d.kind === 'plank' ? ['#c86c1c', '#7c3c00'] : ['#bcbcbc', '#7c7c7c'];
      if (!spin) { wr(d.x - 4, d.y - 2, 9, 4, K); wr(d.x - 3, d.y - 1, 7, 2, col[0]); wr(d.x - 3, d.y, 7, 1, col[1]); }
      else { wr(d.x - 2, d.y - 4, 4, 8, K); wr(d.x - 1, d.y - 3, 2, 6, col[0]); wr(d.x, d.y - 3, 1, 6, col[1]); }
    }
  }

  _drawEmbers(wr) {
    for (const e of this.embers) {
      wr(e.x - 2, e.y - 2, 4, 4, K); wr(e.x - 1, e.y - 1, 2, 2, '#f8b800');
      wr(e.x + 1, e.y - 4, 1, 2, 'rgba(120,120,120,0.6)');
    }
  }

  _drawFireWall(wr, T0) {
    const f = this.fireWall;
    for (let y = HUD_H; y < LH; y += 4) {
      const lick = Math.round(Math.sin(y * 0.5 + T0 * 10) * 3 + Math.sin(y * 0.17 + T0 * 4) * 2);
      wr(f - 60, y, 60 + lick + 2, 4, K);
      wr(f - 60, y, 60 + lick, 4, '#d82800');
      wr(f - 60, y, 56 + lick, 4, '#f87800');
      wr(f - 60, y, 50 + lick, 4, '#fce0a8');
    }
  }

  _drawParticles(wr) {
    for (const p of this.particles) {
      const k = 1 - p.t / p.life;
      switch (p.kind) {
        case 'ember': wr(p.x, p.y, 1, 1, k > 0.5 ? '#f8b800' : '#f83800'); break;
        case 'spark': wr(p.x, p.y, 1, 1, p.color || W); break;
        case 'sweat': wr(p.x, p.y, 1, 1, '#3cbcfc'); break;
        case 'puff': wr(p.x - 1, p.y - 1, 2, 2, W); break;
        case 'smoke': { const rr = p.r * (1 + p.t); wr(p.x - rr, p.y - rr, rr * 2, rr * 2, `rgba(60,60,60,${0.55 * k})`); break; }
        case 'streak': wr(p.x, p.y, p.len * (this.gust.state === 'gust' ? 2 : 1), 1, `rgba(252,252,252,${0.45 * k})`); break;
        case 'rain': wr(p.x, p.y, 1, 3, 'rgba(160,200,252,0.7)'); break;
      }
    }
  }

  _drawOverlay(c, r, T0) {
    if (this.mode === 'fire') {
      c.fillStyle = 'rgba(80,0,0,0.12)'; c.fillRect(0, 0, LW * S, LH * S);
      for (let i = 0; i < 4; i++) {                       // drifting smoke banks
        const x = ((i * 50 - T0 * 12) % 220 + 220) % 220 - 40;
        r(x, 30 + i * 9, 40, 8, 'rgba(30,20,20,0.25)');
      }
    }
    if (this.mode === 'wind') {
      c.fillStyle = 'rgba(10,20,40,0.15)'; c.fillRect(0, 0, LW * S, LH * S);
      if (this.stormy && Math.floor(T0 * 3) % 23 === 0) { c.fillStyle = 'rgba(252,252,252,0.35)'; c.fillRect(0, 0, LW * S, LH * S); }
    }
    if (this.mode === 'heat') { c.fillStyle = 'rgba(252,224,168,0.10)'; c.fillRect(0, 0, LW * S, LH * S); }
  }

  _drawHUD(r, T0) {
    const P = this.pal;
    r(0, 0, LW, HUD_H, K);
    r(0, HUD_H, LW, 1, P.hud);
    this._text(r, this.label, 3, 3, P.hud, 1, 'left', false);
    this._text(r, 'FAM', 58, 3, W, 1, 'left', false);                 // family health: ten blocks
    const col = this.health > 50 ? '#00a800' : this.health > 25 ? '#f8b800' : '#d82800';
    for (let i = 0; i < 10; i++) r(71 + i * 4, 3, 3, 5, this.health > i * 10 ? col : '#3c3c3c');
    if (this.mode === 'heat') {                                       // stamina
      const low = this.stamina < 12 && Math.floor(T0 * 8) % 2;
      r(113, 4, 20, 3, '#3c3c3c'); r(113, 4, Math.round(20 * this.stamina / 100), 3, low ? '#d82800' : '#3cbcfc');
    }
    const prog = clamp((this.leader.x - this.spawn.x) / (this.doorX - this.spawn.x), 0, 1);  // progress to shed
    r(137, 5, 16, 1, '#7c7c7c');
    r(137 + Math.round(prog * 14), 3, 2, 5, W);
    r(155, 3, 4, 6, '#a85808'); r(154, 2, 6, 2, '#bcbcbc');
    if (this.mode === 'wind' && this.gust.state !== 'calm' && (this.gust.state === 'gust' || Math.floor(T0 * 10) % 2)) {
      const arrows = this.gust.dir < 0 ? '<<<' : '>>>';
      this._text(r, `${this.gust.state === 'warn' ? 'GUST!' : 'BRACE!'} ${arrows}`, LW / 2, 14, W, 1, 'center');
    }
    if (this.mode === 'heat' && this.stamina < 12 && this.phase === 'play') this._text(r, 'EXHAUSTED! FIND SHADE', LW / 2, 14, '#f87858', 1, 'center');
    if (this._banner && this._banner.t > 0) this._text(r, this._banner.text, LW / 2, 22, this._banner.color, 1, 'center');
  }

  _drawButtons(r) {
    const held = new Set(this.touches.values());
    const btn = (x, label, on) => {
      r(x, LH - 22, 20, 20, on ? 'rgba(252,252,252,0.35)' : 'rgba(0,0,0,0.35)');
      r(x, LH - 22, 20, 1, 'rgba(252,252,252,0.6)');
      this._text(r, label, x + 10, LH - 15, W, 1, 'center');
    };
    btn(2, '<', held.has('l')); btn(26, '>', held.has('r'));
    btn(LW - 46, 'DN', held.has('d')); btn(LW - 22, 'UP', held.has('j'));
  }

  _drawIntro(r, T0) {
    r(0, HUD_H + 1, LW, LH - HUD_H - 1, K);
    this._text(r, 'RUN FOR THE SHED!', LW / 2, 16, '#f8b800', 2, 'center');
    this._text(r, this.label, LW / 2, 31, this.pal.hud, 1, 'center');
    this._text(r, this.cfg.hint, LW / 2, 39, W, 1, 'center');
    const perkNames = {
      firstAid: 'FIRST AID', burnMult: 'GAS MASKS', staminaMult: 'INSULATION',
      drinks: `${this.perks.drinks} WATER`, pushMult: 'TARP BRACE', earlyWarning: 'RADIO',
    };
    const perks = Object.keys(this.perks).map(k => perkNames[k]).filter(Boolean);
    const lines = perks.length ? wrap('SUPPLIES: ' + perks.join(', '), 38) : ['NO SUPPLIES FOR THIS ONE'];
    lines.slice(0, 2).forEach((ln, i) => this._text(r, ln, LW / 2, 48 + i * 7, perks.length ? '#58d854' : '#7c7c7c', 1, 'center'));
    this._text(r, 'ARROWS MOVE, SPACE JUMP, DOWN CROUCH', LW / 2, 64, '#bcbcbc', 1, 'center');
    const n = Math.ceil(INTRO_SECONDS - this.phaseT - 0.5);
    this._text(r, n > 0 ? String(n) : 'GO!', LW / 2, 73, n > 0 ? W : '#58d854', 2, 'center');
    for (let i = 0; i < this.family.length; i++) {                      // family preview, jogging in place
      this._drawSprite(r, SPR[Math.floor(T0 * 4 + i) % 2 ? 'walkA' : 'walkB'], 6 + i * 9, LH - 14, 1, this.family[i], false);
    }
  }

  _drawEnd(r) {
    const k = Math.min(1, this.phaseT / 0.4);
    const ok = this.outcome !== 'failed';
    // Banner sits up top so the shed (door slam, rattling walls) stays in view
    r(0, HUD_H + 1, LW, 22, ok ? `rgba(0,40,0,${0.75 * k})` : `rgba(60,0,0,${0.75 * k})`);
    r(0, HUD_H + 22, LW, 1, K);
    const title = { survived: 'SHELTERED!', barely: 'MADE IT... BARELY', failed: 'OVERWHELMED' }[this.outcome];
    this._text(r, title, LW / 2, HUD_H + 3, ok ? '#58d854' : '#f87858', 2, 'center');
    this._text(r, ok ? 'THE SHED CREAKS - BUT IT HOLDS.' : 'THE FAMILY COLLAPSES SHORT OF COVER.', LW / 2, HUD_H + 15, W, 1, 'center');
  }
}
