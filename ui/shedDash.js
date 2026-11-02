/**
 * shedDash.js — "Run for the Shed" survival mini-game (replaces Shelter Dash)
 *
 * The family dashes across an open field toward a rickety shed while the
 * peril that triggered the event interferes, each in its own way:
 *
 *   HEAT  — sluggish, drifting movement; stamina drains while running and only
 *           recovers in tree shade; exhausted runners stagger and slow.
 *   WIND  — gusts (telegraphed) shove the group; flying debris knocks you back;
 *           ducking in the lee of rocks/cars blocks most of the push.
 *           Storm variants (hurricane / flood) add slowing standing water.
 *   FIRE  — embers flare into flames ahead of you; a fire front advances from
 *           behind; smoke drifts across the field.
 *
 * Renders pixel art to the shared <canvas id="asciiDisplay"> at 160×90 logical
 * px (2 canvas px each) — twice the detail of the travel scene.
 *
 * All numeric constants here are GAMEPLAY TUNING (speeds in logical px/s,
 * damage in health points), not climate data. Outcome effects reuse the values
 * of the original Shelter Dash so game balance is unchanged.
 *
 * Public interface (same callback contract as the other mini-games):
 *   new ShedDash(canvasEl, infoBarEl)
 *   .start(progress, onComplete, { peril, variant, family })
 *   .stop()
 *   onComplete({ survived, narrative, effects })
 */

const LW = 160;          // logical width
const LH = 90;           // logical height
const S = 2;             // canvas px per logical px
const HUD_H = 11;        // HUD band height (logical)
const FIELD_TOP = HUD_H + 1;

const INTRO_SECONDS = 2.6;
const END_SECONDS = 2.2;
const BARELY_HEALTH = 20; // same threshold as the original Shelter Dash
const FOLLOW_GAP = 4.5;   // spacing between family members in the line

// ── Gameplay tuning per peril ────────────────────────────────────────────────
const MODES = {
  heat: {
    label: 'HEAT WAVE',
    hint: 'Sluggish & slippery. Rest in tree shade to recover stamina.',
    accel: 75, friction: 1.7, maxSpeed: 27, drain: 3.0,
  },
  wind: {
    label: 'HIGH WINDS',
    hint: 'Gusts shove you. Shelter behind rocks & cars. Dodge debris!',
    accel: 165, friction: 6, maxSpeed: 38, drain: 2.2,
  },
  fire: {
    label: 'WILDFIRE',
    hint: 'Embers flare into flames. Outrun the fire front!',
    accel: 165, friction: 6, maxSpeed: 38, drain: 1.8,
  },
};

const VARIANT_LABELS = {
  hurricane: 'HURRICANE', tornado: 'TORNADO', flood: 'FLASH FLOOD',
  heatwave: 'HEAT WAVE', drought: 'DROUGHT HEAT', dust_storm: 'DUST STORM',
  wildfire: 'WILDFIRE',
};

const PALETTES = {
  heat: { ground: ['#c9a35a', '#bf9850', '#d4ae66', '#b48b45'], tuft: '#8e7a3a', tuftHi: '#a8924a',
          tint: 'rgba(255,236,190,0.10)' },
  wind: { ground: ['#5d7a48', '#56713f', '#668552', '#4d6838'], tuft: '#3f5a30', tuftHi: '#7a9a5e',
          tint: 'rgba(25,35,50,0.22)' },
  fire: { ground: ['#8f7d3c', '#857237', '#9c8946', '#76662f'], tuft: '#6a5a26', tuftHi: '#b09a50',
          tint: 'rgba(120,40,0,0.10)' },
};

const SHIRTS = ['#e94560', '#3a7bd5', '#f3c623', '#2ecc71', '#9b59b6', '#ff8c42'];
const SKINS = ['#f1c27d', '#c68642', '#8d5524', '#e0ac69', '#ffdbac', '#a0673a'];

function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function rand(lo, hi) { return lo + Math.random() * (hi - lo); }
function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }

/** Map an event peril/id to a mini-game mode. Exported for tests and main.js. */
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
    this.ground = document.createElement('canvas');
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  start(progress, onComplete, opts = {}) {
    this.onComplete = onComplete;
    this.mode = MODES[opts.peril] ? opts.peril : 'wind';
    this.cfg = MODES[this.mode];
    this.variant = opts.variant || null;
    this.label = VARIANT_LABELS[this.variant] || this.cfg.label;
    this.pal = PALETTES[this.mode];
    this.stormy = this.mode === 'wind' && ['hurricane', 'flood'].includes(this.variant);
    const t = clamp(progress || 0, 0, 1);
    this.diff = { drain: lerp(1, 1.6, t), hazard: lerp(1, 1.5, t) };

    // Canvas setup (own resolution; clear day/night filter while we play)
    this.canvas.width = LW * S;
    this.canvas.height = LH * S;
    this.buf.width = LW * S;
    this.buf.height = LH * S;
    this.ground.width = LW * S;
    this.ground.height = LH * S;
    for (const c of [this.ctx, this.bctx]) c.imageSmoothingEnabled = false;
    this._savedFilter = this.canvas.style.filter;
    this.canvas.style.filter = 'none';

    // Family: everyone still alive follows the leader
    const members = (opts.family || []).filter(m => m.alive !== false);
    const n = clamp(members.length || 3, 1, 6);
    this.family = Array.from({ length: n }, (_, i) => ({
      shirt: SHIRTS[i % SHIRTS.length],
      skin: SKINS[(i * 2 + 1) % SKINS.length],
      small: typeof members[i]?.age === 'number' && members[i].age < 13,
      x: 0, y: 0, hurt: 0,
    }));

    this._buildField();

    this.health = 100;
    this.stamina = 100;
    this.elapsed = 0;
    this.phase = 'intro';
    this.phaseT = 0;
    this.outcome = null;
    this.keys = {};
    this.pointer = null;
    this.shake = 0;
    this.flash = 0;
    this.stun = 0;
    this.particles = [];
    this.hazards = [];       // fire spots
    this.debris = [];        // wind projectiles
    this.spawnT = 1.2;
    this.fireFront = -10;
    this.gust = { state: 'calm', t: rand(1.5, 2.5), force: 0, angle: this.windAngle };
    this.walk = 0;
    this.speedFrac = 0;
    this.doorShut = false;

    this._bindInput();
    this.running = true;
    this._savedInfo = this.infoBar.textContent;
    this.infoBar.textContent = `${this.label} — run for the shed! Arrow keys / WASD, or tap & hold where to go.`;
    this._last = performance.now();
    this._rafId = requestAnimationFrame(t2 => this._frame(t2));
  }

  stop() {
    this.running = false;
    if (this._rafId) cancelAnimationFrame(this._rafId);
    this._rafId = null;
    this._unbindInput();
    if (this._savedFilter !== undefined) this.canvas.style.filter = this._savedFilter;
    // Restore the travel text so the renderer's cached info bar stays accurate
    if (this._savedInfo !== undefined) this.infoBar.textContent = this._savedInfo;
  }

  _bindInput() {
    const keyMap = { ArrowUp: 'u', KeyW: 'u', ArrowDown: 'd', KeyS: 'd', ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r' };
    this._kd = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;   // leave browser shortcuts alone
      const k = keyMap[e.code]; if (k) { this.keys[k] = true; e.preventDefault(); }
    };
    this._ku = (e) => { const k = keyMap[e.code]; if (k) this.keys[k] = false; };
    // Map to the canvas content box (the element has a border, and padding on mobile)
    const toLogical = (e) => {
      const b = this.canvas.getBoundingClientRect();
      const cs = getComputedStyle(this.canvas);
      const left = b.left + this.canvas.clientLeft + parseFloat(cs.paddingLeft || 0);
      const top = b.top + this.canvas.clientTop + parseFloat(cs.paddingTop || 0);
      const w = this.canvas.clientWidth - parseFloat(cs.paddingLeft || 0) - parseFloat(cs.paddingRight || 0);
      const h = this.canvas.clientHeight - parseFloat(cs.paddingTop || 0) - parseFloat(cs.paddingBottom || 0);
      return { x: (e.clientX - left) / w * LW, y: (e.clientY - top) / h * LH };
    };
    this._pd = (e) => { this.pointer = toLogical(e); this.canvas.setPointerCapture?.(e.pointerId); e.preventDefault(); };
    this._pm = (e) => { if (this.pointer) this.pointer = toLogical(e); };
    this._pu = () => { this.pointer = null; };
    this._blur = () => { this.keys = {}; this.pointer = null; };   // lost focus: drop held input
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

  // ── Field generation ───────────────────────────────────────────────────────

  _buildField() {
    // Shed on the right; door on its left wall
    this.shed = { x: 134, y: Math.round(rand(FIELD_TOP + 14, LH - 30)), w: 22, h: 22 };
    this.door = { x: this.shed.x - 3, y: this.shed.y + 10, w: 5, h: 11 };
    // Leader starts far enough in that the whole line of followers is on screen
    this.startPos = { x: 6 + (this.family.length - 1) * FOLLOW_GAP, y: Math.round(rand(FIELD_TOP + 18, LH - 18)) };

    // Wind blows across the route (from north or south), varying per gust
    this.windAngle = Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2;
    this.windAngle += rand(-0.5, 0.5);

    for (let attempt = 0; attempt < 30; attempt++) {
      this._placeObstacles(attempt < 20 ? 1 : 0.6);
      if (this._pathExists()) break;
    }
    this._placePools();

    this.family.forEach((m, i) => {
      m.x = this.startPos.x - i * FOLLOW_GAP; m.y = this.startPos.y;
      m.vx = 0; m.vy = 0; m.face = 1;
    });

    this._paintGround();
  }

  _placeObstacles(density) {
    const kinds = {
      heat: ['tree', 'tree', 'tree', 'rock', 'cactus', 'car', 'rock'],
      wind: ['rock', 'fence', 'car', 'tree', 'rock', 'hay', 'fence'],
      fire: ['burnt', 'rock', 'car', 'hay', 'burnt', 'rock'],
    }[this.mode];
    const sizes = { tree: [6, 6], burnt: [5, 6], rock: [8, 5], cactus: [3, 7], car: [15, 8], fence: [3, 14], hay: [7, 5] };
    const count = Math.round(rand(11, 15) * density);
    this.obstacles = [];
    let guard = 0;
    while (this.obstacles.length < count && guard++ < 400) {
      const kind = kinds[Math.floor(Math.random() * kinds.length)];
      const [w, h] = sizes[kind];
      // Keep obstacles clear of the family's starting line
      const minX = Math.max(24, Math.ceil(this.startPos.x) + 8);
      const o = { kind, w, h, x: Math.round(rand(minX, 124 - w)), y: Math.round(rand(FIELD_TOP + 3, LH - h - 3)) };
      const clear = this.obstacles.every(p =>
        o.x > p.x + p.w + 5 || o.x + o.w + 5 < p.x || o.y > p.y + p.h + 5 || o.y + o.h + 5 < p.y);
      if (clear) this.obstacles.push(o);
    }
  }

  _placePools() {
    this.pools = [];
    if (!this.stormy) return;
    for (let i = 0; i < 5; i++) {
      const p = { x: rand(26, 120), y: rand(FIELD_TOP + 6, LH - 10), rx: rand(7, 12), ry: rand(3.5, 5.5) };
      if (!this._hitsObstacle(p.x, p.y, 2)) this.pools.push(p);
    }
  }

  // Coarse BFS so the shed is always reachable
  _pathExists() {
    const C = 4, cols = Math.ceil(LW / C), rows = Math.ceil(LH / C);
    const blocked = (cx, cy) => {
      const x = cx * C + C / 2, y = cy * C + C / 2;
      if (y < FIELD_TOP + 3 || y > LH - 3) return true;
      return this._hitsObstacle(x, y, 3);
    };
    const sx = Math.floor(this.startPos.x / C), sy = Math.floor(this.startPos.y / C);
    const gx = Math.floor((this.door.x - 2) / C), gy = Math.floor((this.door.y + this.door.h / 2) / C);
    const seen = new Set([`${sx},${sy}`]);
    const q = [[sx, sy]];
    while (q.length) {
      const [x, y] = q.shift();
      if (x === gx && y === gy) return true;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy, k = `${nx},${ny}`;
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows || seen.has(k) || blocked(nx, ny)) continue;
        seen.add(k); q.push([nx, ny]);
      }
    }
    return false;
  }

  _hitsObstacle(x, y, pad = 0) {
    for (const o of this.obstacles) {
      if (x > o.x - pad && x < o.x + o.w + pad && y > o.y - pad && y < o.y + o.h + pad) return o;
    }
    const s = this.shed;
    if (x > s.x - pad && x < s.x + s.w + pad && y > s.y - pad && y < s.y + s.h + pad) return s;
    return null;
  }

  // Pre-render the textured ground + static shadows once per run
  _paintGround() {
    const g = this.ground.getContext('2d');
    const r = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x * S, y * S, w * S, h * S); };
    const P = this.pal;
    r(0, 0, LW, LH, P.ground[0]);
    // Dithered noise patches
    for (let i = 0; i < 900; i++) {
      r(Math.floor(Math.random() * LW), Math.floor(Math.random() * LH), 1, 1, P.ground[1 + (i % 3)]);
    }
    for (let i = 0; i < 26; i++) {
      const cx = rand(0, LW), cy = rand(FIELD_TOP, LH), rad = rand(4, 10);
      for (let k = 0; k < rad * 6; k++) {
        const a = rand(0, Math.PI * 2), d = rand(0, rad);
        r(Math.round(cx + Math.cos(a) * d), Math.round(cy + Math.sin(a) * d * 0.6), 1, 1, P.ground[3]);
      }
    }
    // Cracked earth (heat) / scorched streaks (fire)
    if (this.mode === 'heat') {
      for (let i = 0; i < 40; i++) {
        let x = rand(0, LW), y = rand(FIELD_TOP, LH);
        for (let k = 0; k < 6; k++) { r(Math.round(x), Math.round(y), 1, 1, '#9c7a3c'); x += rand(-1.5, 1.5); y += rand(-1, 1); }
      }
    }
    // Static tufts (animated tufts are drawn live)
    this.tufts = [];
    for (let i = 0; i < 70; i++) {
      const x = Math.round(rand(2, LW - 2)), y = Math.round(rand(FIELD_TOP + 2, LH - 2));
      if (!this._hitsObstacle(x, y, 2)) this.tufts.push({ x, y, ph: rand(0, 6) });
    }
    // Footpath worn toward the shed (subtle guide)
    for (let x = this.startPos.x; x < this.door.x; x += 2) {
      const y = lerp(this.startPos.y, this.door.y + 5, (x - this.startPos.x) / (this.door.x - this.startPos.x));
      if (Math.random() < 0.55) r(x, Math.round(y + rand(-1, 1)), 2, 1, P.ground[3]);
    }
  }

  // ── Main loop ──────────────────────────────────────────────────────────────

  _frame(now) {
    if (!this.running) return;
    const dt = Math.min(0.05, (now - this._last) / 1000);
    this._last = now;
    this._update(dt);
    if (!this.running) return;   // _update may have finished the game and handed back the canvas
    this._draw();
    this._rafId = requestAnimationFrame(t => this._frame(t));
  }

  _update(dt) {
    this.phaseT += dt;
    this.shake = Math.max(0, this.shake - dt * 3);
    this.flash = Math.max(0, this.flash - dt * 2.5);
    this._updateParticles(dt);
    this._updateAmbient(dt);

    if (this.phase === 'intro') {
      if (this.phaseT >= INTRO_SECONDS) { this.phase = 'play'; this.phaseT = 0; }
      return;
    }
    if (this.phase === 'enter' || this.phase === 'collapse') {
      if (this.phase === 'enter') this._animateEntering(dt);
      if (this.phaseT >= END_SECONDS) this._finish();
      return;
    }

    // ── play ──
    this.elapsed += dt;
    const leader = this.family[0];
    const intensity = 1 + this.elapsed / 20;

    this._moveLeader(dt);
    this._moveFollowers(dt);

    // Exposure drain (rises the longer you are out in it)
    let drain = this.cfg.drain * this.diff.drain * intensity;
    if (this.mode === 'heat') drain *= this._inShade(leader.x, leader.y) ? 0.2 : 1;
    this.health -= drain * dt;

    if (this.mode === 'heat') this._updateHeat(dt);
    if (this.mode === 'wind') this._updateWind(dt);
    if (this.mode === 'fire') this._updateFire(dt);
    for (const m of this.family) m.hurt = Math.max(0, m.hurt - dt);

    if (this.health <= 0) {
      this.health = 0;
      this.phase = 'collapse'; this.phaseT = 0;
      this.outcome = 'failed';
      this.shake = 1;
      return;
    }

    // Reached the door?
    const d = this.door;
    if (leader.x + 2 >= d.x && leader.y >= d.y - 1 && leader.y <= d.y + d.h + 1) {
      this.phase = 'enter'; this.phaseT = 0;
      this.outcome = this.health > BARELY_HEALTH ? 'survived' : 'barely';
      this._burst(d.x, d.y + d.h / 2, '#ffe9a0', 14);
    }
  }

  _moveLeader(dt) {
    const L = this.family[0];
    let ix = (this.keys.r ? 1 : 0) - (this.keys.l ? 1 : 0);
    let iy = (this.keys.d ? 1 : 0) - (this.keys.u ? 1 : 0);
    if (this.pointer) {
      const dx = this.pointer.x - L.x, dy = this.pointer.y - L.y, m = Math.hypot(dx, dy);
      if (m > 2) { ix = dx / m; iy = dy / m; }
    }
    const im = Math.hypot(ix, iy);
    if (im > 0) { ix /= im; iy /= im; }
    if (this.stun > 0) { this.stun -= dt; ix = iy = 0; }

    let maxSpeed = this.cfg.maxSpeed;
    let accel = this.cfg.accel;
    if (this.mode === 'heat' && this.stamina < 15) { maxSpeed *= 0.5; accel *= 0.6; }
    if (this._inPool(L.x, L.y)) maxSpeed *= 0.45;

    L.vx += ix * accel * dt;
    L.vy += iy * accel * dt;
    // External push (wind)
    if (this.mode === 'wind') {
      const f = this._windForce() * this._leeFactor(L.x, L.y);
      L.vx += Math.cos(this.gust.angle) * f * dt;
      L.vy += Math.sin(this.gust.angle) * f * dt;
    }
    const fr = Math.max(0, 1 - this.cfg.friction * dt);
    L.vx *= fr; L.vy *= fr;
    const sp = Math.hypot(L.vx, L.vy);
    const cap = maxSpeed * (this.mode === 'wind' ? 1.6 : 1); // wind can shove you past your own top speed
    if (sp > cap) { L.vx *= cap / sp; L.vy *= cap / sp; }

    // Heat exhaustion stagger
    let wob = 0;
    if (this.mode === 'heat' && this.stamina < 25 && sp > 2) wob = Math.sin(this.elapsed * 9) * 7;

    // Axis-separated collision against obstacles + field bounds
    const nx = L.x + L.vx * dt, ny = L.y + (L.vy + wob) * dt;
    if (!this._hitsObstacle(nx, L.y, 2) && nx > 2 && nx < LW - 2) L.x = nx; else L.vx *= -0.2;
    if (!this._hitsObstacle(L.x, ny, 2) && ny > FIELD_TOP + 3 && ny < LH - 2) L.y = ny; else L.vy *= -0.2;
    if (Math.abs(L.vx) > 1) L.face = L.vx > 0 ? 1 : -1;

    this.walk += sp * dt * 0.35;
    this.speedFrac = sp / this.cfg.maxSpeed;
  }

  // Rope-style following: each member keeps FOLLOW_GAP behind the one ahead,
  // sliding around obstacles. A member snagged far behind slips through.
  _moveFollowers(dt) {
    for (let i = 1; i < this.family.length; i++) {
      const m = this.family[i], lead = this.family[i - 1];
      const dx = lead.x - m.x, dy = lead.y - m.y, d = Math.hypot(dx, dy);
      if (d <= FOLLOW_GAP) continue;
      const step = Math.min(d - FOLLOW_GAP, this.cfg.maxSpeed * 1.8 * dt + (d - FOLLOW_GAP) * 0.15);
      const nx = m.x + dx / d * step, ny = m.y + dy / d * step;
      const snagged = d > FOLLOW_GAP * 3;
      if (snagged || !this._hitsObstacle(nx, m.y, 1)) m.x = nx;
      if (snagged || !this._hitsObstacle(m.x, ny, 1)) m.y = ny;
      if (Math.abs(dx) > 0.5) m.face = dx > 0 ? 1 : -1;
    }
  }

  // ── Peril behaviour ────────────────────────────────────────────────────────

  _updateHeat(dt) {
    const L = this.family[0];
    const shade = this._inShade(L.x, L.y);
    if (shade) this.stamina += 32 * dt;
    else if (this.speedFrac > 0.15) this.stamina -= 20 * this.speedFrac * this.diff.drain * dt;
    else this.stamina += 3 * dt;
    this.stamina = clamp(this.stamina, 0, 100);
    if (!shade && Math.random() < dt * 4) this._spawn('sweat', L.x + rand(-2, 2), L.y - 7);
  }

  _windForce() {
    const g = this.gust;
    const breeze = 14;
    if (g.state === 'gust') return breeze + g.force * Math.sin(Math.PI * clamp(g.t0 / g.dur, 0, 1));
    return breeze;
  }

  // Obstacles upwind block most of the push
  _leeFactor(x, y) {
    const ux = -Math.cos(this.gust.angle), uy = -Math.sin(this.gust.angle);
    for (const d of [3, 6, 9, 12]) {
      const o = this._hitsObstacle(x + ux * d, y + uy * d, 0);
      if (o && o !== this.shed) return 0.2;
    }
    return 1;
  }

  _updateWind(dt) {
    const g = this.gust;
    g.t -= dt;
    if (g.state === 'gust') g.t0 += dt;
    if (g.t <= 0) {
      if (g.state === 'calm') { g.state = 'warn'; g.t = 0.95; g.angle = this.windAngle + rand(-0.6, 0.6); }
      else if (g.state === 'warn') {
        g.state = 'gust'; g.dur = rand(1.2, 1.9); g.t = g.dur; g.t0 = 0;
        g.force = rand(150, 210) * this.diff.hazard; this.shake = Math.max(this.shake, 0.35);
      } else { g.state = 'calm'; g.t = rand(1.6, 3.0) / this.diff.hazard; }
    }

    // Flying debris from the upwind edge
    this.spawnT -= dt;
    if (this.spawnT <= 0) {
      this.spawnT = rand(0.9, 1.6) / this.diff.hazard * (g.state === 'gust' ? 0.5 : 1);
      const a = g.angle + rand(-0.25, 0.25), speed = rand(70, 105);
      const upY = Math.sin(a) > 0 ? FIELD_TOP - 4 : LH + 4;
      const L = this.family[0];
      this.debris.push({
        x: clamp(L.x + rand(-45, 55), 10, LW - 10) - Math.cos(a) * 30, y: upY,
        vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, rot: rand(0, 6), spin: rand(-12, 12),
        kind: Math.random() < 0.5 ? 'plank' : 'sheet',
      });
    }
    for (const d of this.debris) {
      d.x += d.vx * dt; d.y += d.vy * dt; d.rot += d.spin * dt;
      if (d.dead) continue;
      for (let i = 0; i < this.family.length; i++) {
        const m = this.family[i];
        if (dist(d.x, d.y, m.x, m.y - 3) < 4.5) {
          d.dead = true;
          this.health -= i === 0 ? 9 : 6;
          m.hurt = 0.5; this.flash = 0.6; this.shake = 0.6;
          if (i === 0) { m.vx += d.vx * 0.55; m.vy += d.vy * 0.55; this.stun = 0.25; }
          this._burst(m.x, m.y - 3, '#d8c8a8', 8);
          break;
        }
      }
      if (!d.dead && this._hitsObstacle(d.x, d.y, 0)) { d.dead = true; this._burst(d.x, d.y, '#8a6a40', 5); }
    }
    this.debris = this.debris.filter(d => !d.dead && d.x > -20 && d.x < LW + 20 && d.y > -20 && d.y < LH + 20);
  }

  _updateFire(dt) {
    const L = this.family[0];
    // Advancing fire front from behind
    this.fireFront += (2.6 + this.elapsed * 0.12) * this.diff.hazard * dt;
    // Spot fires flare ahead of the family
    this.spawnT -= dt;
    if (this.spawnT <= 0) {
      this.spawnT = rand(0.55, 0.95) / this.diff.hazard;
      const ignite = (x, y) => {
        if (x > this.door.x - 10 || y < FIELD_TOP + 3 || y > LH - 3) return false;
        // Keep the final approach to the door clear so the shed is never walled off
        if (dist(x, y, this.door.x, this.door.y + this.door.h / 2) < 22) return false;
        if (dist(x, y, L.x, L.y) < 10 || this._hitsObstacle(x, y, 1)) return false;
        this.hazards.push({ x, y, r: 0, maxR: rand(4, 7.5), t: 0, warn: 0.85, burn: rand(4, 6.5) });
        return true;
      };
      if (Math.random() < 0.3) {
        // A broken firebreak across the path: four spots, one gap to thread
        const x = L.x + rand(30, 50), gap = Math.floor(rand(0, 4));
        [-12, -4, 4, 12].forEach((dy, k) => { if (k !== gap) ignite(x + rand(-2, 2), L.y + dy); });
      } else {
        for (let tries = 0; tries < 8; tries++) {
          const ahead = Math.random() < 0.7;
          const x = ahead ? L.x + rand(22, 55) : rand(this.fireFront + 15, 128);
          const y = ahead ? L.y + rand(-20, 20) : rand(FIELD_TOP + 4, LH - 4);
          if (ignite(x, y)) break;
        }
      }
    }
    for (const h of this.hazards) {
      h.t += dt;
      const burning = h.t > h.warn && h.t < h.warn + h.burn;
      if (h.t < h.warn) h.r = 1.5;
      else if (burning) h.r = Math.min(h.maxR, h.r + dt * 9);
      else h.r = Math.max(0, h.r - dt * 6);
      h.burning = burning;
      if (burning && Math.random() < dt * 10) this._spawn('ember', h.x + rand(-h.r, h.r), h.y - rand(0, 4));
      if (burning && Math.random() < dt * 3) this._spawn('smoke', h.x, h.y - 4);
    }
    this.hazards = this.hazards.filter(h => h.t < h.warn + h.burn + 6); // ash lingers then fades

    for (let i = 0; i < this.family.length; i++) {
      const m = this.family[i];
      let hot = m.x < this.fireFront + 5 ? 1 : 0;
      for (const h of this.hazards) if (h.burning && dist(m.x, m.y - 2, h.x, h.y) < h.r + 1.5) hot = 1;
      if (!hot) continue;
      // Followers cut corners behind the leader, so they take less than the leader
      this.health -= (i === 0 ? 30 : 6) * dt;
      if (m.hurt <= 0) {
        m.hurt = 0.5; this.flash = Math.max(this.flash, 0.5);
        if (i === 0) {
          this.stun = 0.3; this.shake = 0.5;
          const h = this.hazards.find(z => z.burning && dist(m.x, m.y, z.x, z.y) < z.r + 3);
          const ax = h ? m.x - h.x : 1, ay = h ? m.y - h.y : 0, am = Math.hypot(ax, ay) || 1;
          m.vx = ax / am * 45; m.vy = ay / am * 45;
        }
      }
    }
  }

  _inShade(x, y) {
    if (this.mode !== 'heat') return false;
    return this.obstacles.some(o => (o.kind === 'tree' || o.kind === 'car') &&
      x > o.x - 1 && x < o.x + o.w + 7 && y > o.y + o.h - 2 && y < o.y + o.h + 7);
  }

  _inPool(x, y) {
    return this.pools.some(p => ((x - p.x) / p.rx) ** 2 + ((y - p.y) / p.ry) ** 2 < 1);
  }

  // ── Ending ─────────────────────────────────────────────────────────────────

  _animateEntering(dt) {
    const target = { x: this.door.x + 4, y: this.door.y + this.door.h / 2 + 2 };
    this.family.forEach((m, i) => {
      if (this.phaseT < i * 0.18) return;
      const dx = target.x - m.x, dy = target.y - m.y, d = Math.hypot(dx, dy);
      if (d < 1.5) { m.inside = true; return; }
      const s = Math.min(d, 60 * dt);
      m.x += dx / d * s; m.y += dy / d * s; m.face = 1;
    });
    if (this.family.every(m => m.inside) && !this.doorShut) { this.doorShut = true; this.shake = 0.5; }
  }

  _finish() {
    if (!this.running) return;
    const result = this._buildResult();
    this.stop();
    this.onComplete?.(result);
  }

  _buildResult() {
    const what = this.label.toLowerCase();
    // Effect values carried over unchanged from the original Shelter Dash.
    if (this.outcome === 'survived') {
      return { survived: true, effects: { morale: 5, health: -5 },
        narrative: `Through the ${what}, the family piled into a rickety shed and slammed the door. It rattled all night — but it held.` };
    }
    if (this.outcome === 'barely') {
      return { survived: true, effects: { morale: -3, health: -12 },
        narrative: `The ${what} nearly took you. The family staggered into the shed scorched, bruised and gasping. You made it, barely.` };
    }
    return { survived: false, effects: { health: -20, morale: -10 },
      narrative: `The ${what} was too much. The family collapsed short of the shed and had to crawl to cover once the worst passed.` };
  }

  // ── Particles & ambience ───────────────────────────────────────────────────

  _spawn(kind, x, y) {
    const p = { kind, x, y, t: 0 };
    if (kind === 'ember') Object.assign(p, { vx: rand(-4, 4), vy: rand(-14, -6), life: rand(0.6, 1.3) });
    if (kind === 'smoke') Object.assign(p, { vx: rand(3, 8), vy: rand(-5, -2), life: rand(2.5, 4), r: rand(3, 6) });
    if (kind === 'sweat') Object.assign(p, { vx: rand(-6, 6), vy: rand(-10, -4), life: 0.5 });
    if (kind === 'spark') Object.assign(p, { vx: rand(-25, 25), vy: rand(-25, 25), life: rand(0.3, 0.6) });
    if (kind === 'rain') Object.assign(p, { life: 0.5 });
    if (kind === 'streak') Object.assign(p, { life: rand(0.4, 0.8), len: rand(5, 11) });
    this.particles.push(p);
  }

  _burst(x, y, color, n) {
    for (let i = 0; i < n; i++) { this._spawn('spark', x, y); this.particles[this.particles.length - 1].color = color; }
  }

  _updateAmbient(dt) {
    if (this.mode === 'wind') {
      const g = this.gust;
      const rate = g.state === 'gust' ? 90 : g.state === 'warn' ? 45 : 16;
      for (let i = 0; i < rate * dt; i++) this._spawn('streak', rand(-10, LW + 10), rand(FIELD_TOP, LH));
      if (this.stormy) for (let i = 0; i < 70 * dt; i++) this._spawn('rain', rand(0, LW), rand(FIELD_TOP - 5, LH));
    }
    if (this.mode === 'fire') {
      for (let i = 0; i < 10 * dt; i++) this._spawn('ember', rand(0, LW), rand(FIELD_TOP + 10, LH));
      if (Math.random() < dt * 2) this._spawn('smoke', Math.max(0, this.fireFront) + rand(-4, 4), rand(FIELD_TOP, LH));
    }
  }

  _updateParticles(dt) {
    const g = this.gust;
    const wx = this.mode === 'wind' ? Math.cos(g.angle) : 0, wy = this.mode === 'wind' ? Math.sin(g.angle) : 0;
    const wSpeed = this.mode === 'wind' ? (g.state === 'gust' ? 120 : 60) : 0;
    for (const p of this.particles) {
      p.t += dt;
      if (p.kind === 'streak' || p.kind === 'rain') {
        p.x += wx * wSpeed * dt + (p.kind === 'rain' ? wx * 20 * dt : 0);
        p.y += wy * wSpeed * dt + (p.kind === 'rain' ? 90 * dt : 0);
      } else {
        p.x += (p.vx || 0) * dt; p.y += (p.vy || 0) * dt;
        if (p.kind === 'sweat') p.vy += 40 * dt;
      }
    }
    this.particles = this.particles.filter(p => p.t < p.life);
    if (this.particles.length > 500) this.particles.splice(0, this.particles.length - 500);
  }

  // ── Drawing ────────────────────────────────────────────────────────────────

  _draw() {
    const c = this.bctx;
    const r = (x, y, w, h, col) => { if (w <= 0 || h <= 0) return; c.fillStyle = col; c.fillRect(Math.round(x) * S, Math.round(y) * S, Math.round(w) * S, Math.round(h) * S); };
    this._r = r;
    const T = this.elapsed + this.phaseT;

    c.drawImage(this.ground, 0, 0);
    this._drawPools(r, T);
    this._drawTufts(r, T);
    if (this.mode === 'heat') this._drawShade(r);
    if (this.mode === 'fire') this._drawFireFloor(r, T);

    // Depth-sorted sprites: obstacles, shed, family
    const sprites = [
      ...this.obstacles.map(o => ({ y: o.y + o.h, draw: () => this._drawObstacle(r, o, T) })),
      { y: this.shed.y + this.shed.h, draw: () => this._drawShed(r, T) },
      ...this.family.map((m, i) => ({ y: m.y, draw: () => this._drawPerson(r, m, i, T) })),
    ].sort((a, b) => a.y - b.y);
    for (const s of sprites) s.draw();

    if (this.mode === 'fire') this._drawFlames(r, T);
    if (this.mode === 'wind') this._drawDebris(c);
    this._drawParticles(r);
    this._drawWeatherOverlay(c, r, T);

    // Composite buffer → screen (heat shimmer / shake)
    const ctx = this.ctx;
    ctx.clearRect(0, 0, LW * S, LH * S);
    const sx = this.shake > 0 ? Math.round(rand(-2, 2) * this.shake * S) : 0;
    const sy = this.shake > 0 ? Math.round(rand(-2, 2) * this.shake * S) : 0;
    if (this.mode === 'heat') {
      const amp = 1 + (1 - this.health / 100) * 1.5;
      for (let y = HUD_H * S; y < LH * S; y += 2) {
        const off = Math.round(Math.sin(y * 0.11 + T * 7) * amp);
        ctx.drawImage(this.buf, 0, y, LW * S, 2, off + sx, y + sy, LW * S, 2);
      }
    } else {
      ctx.drawImage(this.buf, sx, sy);
    }
    if (this.flash > 0) { ctx.fillStyle = `rgba(255,60,40,${this.flash * 0.25})`; ctx.fillRect(0, 0, LW * S, LH * S); }

    this._drawHUD(ctx, T);
    if (this.phase === 'intro') this._drawIntro(ctx);
    if (this.phase === 'enter' || this.phase === 'collapse') this._drawEndBanner(ctx);
  }

  _drawTufts(r, T) {
    const P = this.pal;
    const g = this.gust;
    const bend = this.mode === 'wind' ? Math.round(Math.cos(g.angle) * (g.state === 'gust' ? 2 : 1)) : 0;
    for (const t of this.tufts) {
      const sway = this.mode === 'wind' ? bend + Math.round(Math.sin(T * 6 + t.ph)) * (g.state === 'gust' ? 1 : 0) : Math.round(Math.sin(T * 1.5 + t.ph) * 0.4);
      r(t.x, t.y, 1, 2, P.tuft);
      r(t.x - 1 + sway, t.y - 1, 1, 1, P.tuftHi);
      r(t.x + 1 + sway, t.y - 1, 1, 1, P.tuftHi);
      r(t.x + sway, t.y - 2, 1, 1, P.tuftHi);
    }
  }

  _drawPools(r, T) {
    for (const p of this.pools) {
      for (let dy = -Math.ceil(p.ry); dy <= Math.ceil(p.ry); dy++) {
        const hw = Math.round(p.rx * Math.sqrt(Math.max(0, 1 - (dy / p.ry) ** 2)));
        r(p.x - hw, p.y + dy, hw * 2, 1, dy < 0 ? '#3c5f78' : '#33526a');
      }
      const rip = (T * 4) % 6;
      r(p.x - p.rx * 0.5 + rip, p.y - 1, 3, 1, '#7fa8c4');
      r(p.x + p.rx * 0.2 - rip * 0.5, p.y + 1, 2, 1, '#6b94b0');
    }
  }

  _drawShade(r) {
    for (const o of this.obstacles) {
      if (o.kind !== 'tree' && o.kind !== 'car') continue;
      r(o.x, o.y + o.h - 1, o.w + 6, 7, 'rgba(40,30,10,0.32)');
      r(o.x + 1, o.y + o.h + 6, o.w + 4, 1, 'rgba(40,30,10,0.18)');
    }
  }

  _drawFireFloor(r, T) {
    const f = this.fireFront;
    if (f > -8) {
      r(0, FIELD_TOP, Math.max(0, f - 2), LH, '#2a1d14');                      // burned ground
      for (let y = FIELD_TOP; y < LH; y += 3) r(Math.max(0, f - 6), y, 3, 1, '#4a2a18');
    }
    for (const h of this.hazards) {
      if (h.t > h.warn + 0.4) {                                                  // scorch / ash
        const a = Math.min(1, (h.warn + h.burn + 6 - h.t) / 2);
        r(h.x - h.maxR, h.y - h.maxR * 0.5, h.maxR * 2, h.maxR, `rgba(35,25,18,${0.75 * a})`);
      }
      if (h.t < h.warn) {                                                        // ember warning
        const pulse = Math.sin(h.t * 22) > 0;
        r(h.x - 2, h.y - 1, 4, 2, pulse ? '#ff8a2a' : '#c43a10');
        r(h.x - 1, h.y - 2, 2, 1, '#ffd060');
      }
    }
  }

  _drawFlames(r, T) {
    const cols = ['#ffe36a', '#ffb02e', '#ff6a1a', '#d8340c'];
    const flame = (x, y, h, ph) => {
      const hh = h + Math.round(Math.sin(T * 14 + ph) * 1.5);
      r(x, y - hh, 2, hh, cols[2]);
      r(x, y - hh + 2, 2, Math.max(0, hh - 3), cols[1]);
      r(x, y - Math.round(hh * 0.5), 1, Math.round(hh * 0.4), cols[0]);
      r(x + (Math.sin(T * 20 + ph) > 0 ? 1 : 0), y - hh - 1, 1, 1, cols[3]);
    };
    for (const h of this.hazards) {
      if (!h.burning && h.r < 1) continue;
      if (h.t < h.warn) continue;
      const n = Math.max(1, Math.round(h.r));
      for (let i = -n; i <= n; i += 2) {
        const yy = h.y + Math.round(Math.abs(i) * 0.3);
        flame(h.x + i, yy, Math.round((h.r - Math.abs(i) * 0.5) * 1.4 + 2), i);
      }
      r(h.x - h.r, h.y, h.r * 2, 1, 'rgba(255,120,30,0.6)');
    }
    // The fire front: a wall of flame
    const f = this.fireFront;
    if (f > -6) {
      for (let y = FIELD_TOP + 2; y < LH; y += 2) flame(Math.round(f + Math.sin(y * 0.7 + T * 3) * 2), y, 5 + (y % 3), y);
    }
  }

  _drawObstacle(r, o, T) {
    const { x, y, w, h } = o;
    r(x + 1, y + h - 1, w, 2, 'rgba(0,0,0,0.25)');   // contact shadow
    switch (o.kind) {
      case 'rock':
        r(x + 1, y, w - 2, h, '#7d7d84'); r(x, y + 1, w, h - 2, '#7d7d84');
        r(x + 1, y + 1, w - 3, 1, '#a4a4ac'); r(x + 2, y + h - 2, w - 3, 1, '#5c5c63');
        break;
      case 'tree': {
        const sway = this.mode === 'wind' ? Math.round(Math.sin(T * 3 + x) * 1) : 0;
        r(x + 2, y + 2, 2, h - 2, '#6a4a2a');
        const leaf = this.mode === 'heat' ? ['#6b7a2a', '#86963a'] : ['#2e5a26', '#3f7a32'];
        r(x - 1 + sway, y - 4, w + 2, 5, leaf[0]); r(x + sway, y - 6, w, 3, leaf[0]);
        r(x + 1 + sway, y - 5, 3, 2, leaf[1]);
        break;
      }
      case 'burnt':
        r(x + 2, y - 3, 2, h + 3, '#2b1f17'); r(x, y - 1, 2, 1, '#2b1f17'); r(x + 4, y, 2, 1, '#2b1f17');
        r(x + 2, y - 3, 1, 1, '#ff7a2a');
        break;
      case 'cactus':
        r(x + 1, y - 2, 2, h + 2, '#3f7a32'); r(x - 1, y + 1, 2, 1, '#3f7a32'); r(x - 1, y - 1, 1, 2, '#3f7a32');
        r(x + 3, y + 2, 1, 1, '#3f7a32'); r(x + 3, y, 1, 2, '#3f7a32'); r(x + 1, y - 2, 1, h, '#5a9a44');
        break;
      case 'car':
        r(x, y + 2, w, h - 3, '#7a3b2a'); r(x + 3, y, w - 6, 3, '#6a3224');
        r(x + 4, y + 1, 3, 1, '#9cc0cc'); r(x + 8, y + 1, 3, 1, '#9cc0cc');
        r(x + 1, y + 3, w - 2, 1, '#9a5a3a'); r(x + 2, y + h - 1, 3, 1, '#1a1a1a'); r(x + w - 5, y + h - 1, 3, 1, '#1a1a1a');
        r(x + 5, y + 4, 2, 2, '#5a2a1a');                                   // rust spot
        break;
      case 'fence':
        for (let k = 0; k < h; k += 5) r(x + 1, y + k, 1, 4, '#7a5a34');
        r(x, y + 1, 3, 1, '#9a7a4a'); r(x, y + h - 3, 3, 1, '#9a7a4a');
        r(x + 1, y, 1, h, '#8a6a3c');
        break;
      case 'hay':
        r(x, y, w, h, '#c8a440'); r(x, y + 1, w, 1, '#a88a30'); r(x, y + 3, w, 1, '#a88a30'); r(x + 1, y, 1, h, '#e0c060');
        break;
    }
  }

  // The rickety shed: warped planks with gaps, a crooked rusty roof, a door
  // that swings in the wind, boarded window, light spilling from inside.
  _drawShed(r, T) {
    const s = this.shed;
    const wobAmp = this.mode === 'wind' ? (this.gust.state === 'gust' ? 1.2 : 0.5) : 0.3;
    const wob = Math.round(Math.sin(T * (this.mode === 'wind' ? 9 : 3)) * wobAmp);
    const shut = this.doorShut;
    const rattle = shut ? Math.round(Math.sin(T * 30) * Math.max(0, 1 - this.phaseT / 2)) : 0;
    const x = s.x + wob + rattle, y = s.y;

    r(s.x - 1, y + s.h, s.w + 4, 2, 'rgba(0,0,0,0.3)');                       // shadow
    const planks = ['#8a6a44', '#7a5a38', '#94744c', '#6e5034'];
    for (let i = 0; i < s.w; i += 3) {
      const lean = i > s.w - 7 ? 1 : 0;                                         // back corner sags
      r(x + i, y + 5 + lean, 2, s.h - 5 - lean, planks[(i / 3) % 4 | 0]);
      if ((i / 3) % 3 === 1) r(x + i + 2, y + 9, 1, 6, '#2a1c10');              // gap between planks
    }
    r(x + 9, y + 12, 2, 6, '#3a2a18');                                           // missing plank
    r(x + 13, y + 8, 5, 4, '#3a2a18'); r(x + 13, y + 8, 5, 1, '#9a7a50');        // boarded window
    r(x + 13, y + 9, 1, 1, '#9a7a50'); r(x + 15, y + 10, 1, 1, '#9a7a50'); r(x + 17, y + 11, 1, 1, '#9a7a50');
    // Crooked corrugated roof, rust patches, one loose sheet flapping
    for (let i = -2; i < s.w + 3; i++) {
      const sag = Math.round(i * 0.12);
      r(x + i, y + 1 + sag, 1, 4, i % 2 ? '#8a8f94' : '#70757a');
    }
    r(x + 4, y + 2, 3, 2, '#9a4a20'); r(x + 15, y + 3, 2, 2, '#9a4a20');
    const flap = Math.round(Math.sin(T * 12) * (this.mode === 'wind' ? 2 : 0.5));
    r(x + s.w - 4, y + 1 + flap, 6, 1, '#a0a5aa');
    // Door (left wall): swings open, light spills out
    const d = this.door;
    const glow = 0.35 + 0.25 * Math.sin(T * 4);
    r(d.x - 1, d.y - 1, d.w + 2, d.h + 2, `rgba(255,220,120,${shut ? 0.1 : glow})`);
    r(d.x + 1 + wob, d.y, 3, d.h, shut ? '#5a3e22' : '#1a120a');
    if (!shut) {
      const swing = Math.round(1.5 + Math.sin(T * (this.mode === 'wind' ? 7 : 2)) * 1.5);
      r(d.x - swing + wob, d.y, 2, d.h, '#6e5034');                             // door leaf
      r(d.x + 2 + wob, d.y + 3, 1, d.h - 4, '#ffcf6a');                         // lamplight
    }
    r(d.x + 1 + wob, d.y + d.h, 3, 1, '#4a3420');
  }

  _drawPerson(r, m, i, T) {
    if (m.inside) return;
    const x = Math.round(m.x), y = Math.round(m.y);
    if (this.phase === 'collapse') {                                            // lying down
      r(x - 3, y - 2, 7, 2, m.shirt); r(x + 4 * (m.face || 1), y - 2, 2, 2, m.skin);
      return;
    }
    const h = m.small ? 6 : 8;
    const step = Math.floor(this.walk + i * 1.7) % 2;
    const moving = this.phase === 'enter' || (this.speedFrac || 0) > 0.1;
    const hurt = m.hurt > 0 && Math.sin(T * 40) > 0;
    r(x - 2, y, 5, 1, 'rgba(0,0,0,0.28)');                                      // shadow
    // legs
    const legA = moving && step ? 1 : 0;
    r(x - 1, y - 2 + legA, 1, 2 - legA, '#2a2a3a'); r(x + 1, y - 2 + (1 - legA) * (moving ? 1 : 0), 1, 2 - (moving ? 1 - legA : 0), '#2a2a3a');
    // body
    r(x - 1, y - h + 3, 3, h - 5, hurt ? '#ffffff' : m.shirt);
    r(x - 2 + (m.face > 0 ? 0 : 4), y - h + 4, 1, 2, m.skin);                   // arm
    // head + hair
    r(x - 1, y - h, 3, 3, m.skin);
    r(x - 1, y - h, 3, 1, '#3a2614');
    r(x + (m.face > 0 ? 1 : -1), y - h + 1, 1, 1, '#1a1a1a');                    // eye
    if (i === 0) {                                                               // leader marker
      const bob = Math.round(Math.sin(T * 6));
      r(x, y - h - 4 + bob, 1, 2, '#ffd700'); r(x - 1, y - h - 3 + bob, 3, 1, '#ffd700');
    }
    if (this.mode === 'heat' && this.stamina < 25 && Math.sin(T * 6 + i) > 0) r(x + 2, y - h - 1, 1, 1, '#9fd8ff');
  }

  _drawDebris(c) {
    for (const d of this.debris) {
      c.save();
      c.translate(Math.round(d.x) * S, Math.round(d.y) * S);
      c.rotate(Math.round(d.rot * 4) / 4);
      c.fillStyle = d.kind === 'plank' ? '#8a6a3a' : '#9aa0a6';
      const w = d.kind === 'plank' ? 7 : 5, h = d.kind === 'plank' ? 2 : 3;
      c.fillRect(-w * S / 2, -h * S / 2, w * S, h * S);
      c.fillStyle = d.kind === 'plank' ? '#6a4a24' : '#6e7378';
      c.fillRect(-w * S / 2, h * S / 2 - S, w * S, S);
      c.restore();
    }
  }

  _drawParticles(r) {
    for (const p of this.particles) {
      const k = 1 - p.t / p.life;
      switch (p.kind) {
        case 'ember': r(p.x, p.y, 1, 1, k > 0.5 ? '#ffd060' : '#ff6a1a'); break;
        case 'spark': r(p.x, p.y, 1, 1, p.color || '#ffffff'); break;
        case 'sweat': r(p.x, p.y, 1, 1, '#9fd8ff'); break;
        case 'smoke': {
          const rr = p.r * (1 + p.t * 0.5);
          r(p.x - rr, p.y - rr * 0.6, rr * 2, rr * 1.2, `rgba(60,55,55,${0.35 * k})`);
          break;
        }
        case 'streak': {
          const g = this.gust;
          const len = p.len * (g.state === 'gust' ? 1.6 : 1);
          for (let s = 0; s < len; s += 2) r(p.x - Math.cos(g.angle) * s, p.y - Math.sin(g.angle) * s, 1, 1, `rgba(220,230,235,${0.35 * k})`);
          break;
        }
        case 'rain': r(p.x, p.y, 1, 2, 'rgba(170,200,230,0.55)'); break;
      }
    }
  }

  _drawWeatherOverlay(c, r, T) {
    c.fillStyle = this.pal.tint;
    c.fillRect(0, 0, LW * S, LH * S);
    if (this.mode === 'heat') {
      // Sun glare in the corner
      const g = c.createRadialGradient(LW * S, 0, 4, LW * S, 0, 120);
      g.addColorStop(0, 'rgba(255,250,220,0.55)'); g.addColorStop(1, 'rgba(255,240,200,0)');
      c.fillStyle = g; c.fillRect(0, 0, LW * S, LH * S);
    }
    if (this.mode === 'wind') {
      // Cloud shadows racing across
      for (let i = 0; i < 3; i++) {
        const cx = ((T * 25 * Math.cos(this.gust.angle) + i * 60) % (LW + 40) + LW + 40) % (LW + 40) - 20;
        r(cx, FIELD_TOP + 10 + i * 22, 30, 12, 'rgba(10,20,30,0.18)');
      }
      if (this.gust.state === 'gust') { c.fillStyle = 'rgba(200,210,220,0.06)'; c.fillRect(0, 0, LW * S, LH * S); }
    }
    if (this.mode === 'fire') {
      const f = Math.max(0, this.fireFront);
      const g = c.createLinearGradient(0, 0, (f + 40) * S, 0);
      g.addColorStop(0, 'rgba(255,90,20,0.30)'); g.addColorStop(1, 'rgba(255,90,20,0)');
      c.fillStyle = g; c.fillRect(0, 0, LW * S, LH * S);
    }
  }

  // ── HUD & overlays (drawn at native resolution for crisp text) ─────────────

  _text(ctx, str, x, y, color = '#fff', size = 8, align = 'left') {
    ctx.font = `bold ${size}px monospace`;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillText(str, x + 1, y + 1);
    ctx.fillStyle = color;
    ctx.fillText(str, x, y);
  }

  _bar(ctx, x, y, w, h, frac, col, label) {
    ctx.fillStyle = '#0d0d16'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = col; ctx.fillRect(x + 1, y + 1, Math.max(0, (w - 2) * clamp(frac, 0, 1)), h - 2);
    for (let i = 1; i < 10; i++) { ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x + (w * i) / 10, y + 1, 1, h - 2); }
    this._text(ctx, label, x - 3, y + h / 2, '#c8c8d8', 7, 'right');
  }

  _drawHUD(ctx, T) {
    const W = LW * S;
    ctx.fillStyle = '#12121e'; ctx.fillRect(0, 0, W, HUD_H * S);
    ctx.fillStyle = '#e94560'; ctx.fillRect(0, HUD_H * S - 1, W, 1);
    const pc = { heat: '#ffb347', wind: '#9ad0ff', fire: '#ff6a2a' }[this.mode];
    this._text(ctx, this.label, 6, 11, pc, 9);

    const hp = this.health / 100;
    const hcol = hp > 0.5 ? '#2ecc71' : hp > 0.25 ? '#f39c12' : '#e74c3c';
    this._bar(ctx, 118, 4, 70, 7, hp, hcol, 'FAMILY');
    if (this.mode === 'heat') {
      const sc = this.stamina < 15 ? (Math.sin(T * 10) > 0 ? '#e74c3c' : '#7a2a2a') : '#5ac8fa';
      this._bar(ctx, 118, 13, 70, 5, this.stamina / 100, sc, 'STAMINA');
    }
    // Distance to shed
    const L = this.family[0];
    const prog = clamp((L.x - this.startPos.x) / (this.door.x - this.startPos.x), 0, 1);
    this._text(ctx, 'SHED', 214, 11, '#c8c8d8', 7);
    ctx.fillStyle = '#0d0d16'; ctx.fillRect(238, 8, 60, 6);
    ctx.fillStyle = '#ffd700'; ctx.fillRect(239, 9, Math.round(58 * prog), 4);
    ctx.fillStyle = '#8a6a44'; ctx.fillRect(299, 6, 8, 10); ctx.fillStyle = '#70757a'; ctx.fillRect(298, 5, 10, 2);

    // Gust warning arrow
    if (this.mode === 'wind' && (this.gust.state === 'warn' || this.gust.state === 'gust')) {
      const a = this.gust.angle, cx = W / 2, cy = HUD_H * S + 16;
      if (this.gust.state === 'gust' || Math.sin(T * 20) > 0) {
        this._text(ctx, this.gust.state === 'warn' ? 'GUST INCOMING!' : 'GUST!', cx, cy, '#ffffff', 9, 'center');
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx + 52 - Math.cos(a) * 8, cy - Math.sin(a) * 8);
        ctx.lineTo(cx + 52 + Math.cos(a) * 8, cy + Math.sin(a) * 8);
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx + 52 + Math.cos(a) * 8 - 2, cy + Math.sin(a) * 8 - 2, 4, 4);
      }
    }
    if (this.mode === 'heat' && this.stamina < 15 && this.phase === 'play') {
      this._text(ctx, 'EXHAUSTED — find shade!', W / 2, HUD_H * S + 14, '#ff8a6a', 8, 'center');
    }
  }

  _drawIntro(ctx) {
    const W = LW * S, H = LH * S;
    ctx.fillStyle = 'rgba(8,8,16,0.72)'; ctx.fillRect(0, HUD_H * S, W, H - HUD_H * S);
    this._text(ctx, 'RUN FOR THE SHED!', W / 2, 62, '#ffd700', 14, 'center');
    this._text(ctx, this.label, W / 2, 82, { heat: '#ffb347', wind: '#9ad0ff', fire: '#ff6a2a' }[this.mode], 10, 'center');
    this._text(ctx, this.cfg.hint, W / 2, 100, '#e0e0e0', 7, 'center');
    this._text(ctx, 'Arrows / WASD — or tap & hold where to go', W / 2, 114, '#8892a4', 7, 'center');
    const left = INTRO_SECONDS - this.phaseT;
    const n = Math.ceil(left - 0.6);
    this._text(ctx, n > 0 ? String(n) : 'GO!', W / 2, 140, n > 0 ? '#ffffff' : '#2ecc71', 16, 'center');
  }

  _drawEndBanner(ctx) {
    const W = LW * S;
    const k = Math.min(1, this.phaseT / 0.4);
    const ok = this.outcome !== 'failed';
    ctx.fillStyle = ok ? `rgba(10,30,15,${0.6 * k})` : `rgba(40,5,5,${0.65 * k})`;
    ctx.fillRect(0, 66, W, 44);
    const title = { survived: 'SHELTERED!', barely: 'MADE IT... BARELY', failed: 'OVERWHELMED' }[this.outcome];
    this._text(ctx, title, W / 2, 82, ok ? '#2ecc71' : '#e74c3c', 14, 'center');
    const sub = ok ? 'The shed creaks and groans — but it holds.' : 'The family collapses short of cover.';
    this._text(ctx, sub, W / 2, 99, '#e0e0e0', 7, 'center');
  }
}
