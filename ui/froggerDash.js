/**
 * froggerDash.js — River Crossing mini-game (Frogger-style)
 *
 * Triggered when the player chooses to ford a swollen river.
 * Player hops across floating logs and debris to reach the far bank.
 * Open water drains health; logs carry the player with the current.
 *
 * Renders to the shared <canvas id="asciiDisplay"> at 80×45 logical px / SCALE=4.
 *
 * Public interface:
 *   new FroggerDash(canvasEl, infoBarEl)
 *   .start(difficulty, onComplete, weatherData)
 *   .stop()
 */

const PW    = 80;   // logical pixel width  (matches pixelRenderer)
const PH    = 45;   // logical pixel height
const SCALE = 4;    // canvas px per logical px

// ── Layout ────────────────────────────────────────────────────────────────────
// Row 0  = far bank  (GOAL  — y=0–4)
// Rows 1–5 = river lanes  (y=5–34)
// Row 6  = near bank (START — y=35–44)

const ROW_Y = [2, 7, 13, 19, 25, 31, 39]; // y-center for each row (0=far, 6=start)
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
const PLAYER_H           = 4;

// ── Drawing helpers ───────────────────────────────────────────────────────────

function makeR(ctx) {
  return (x, y, w, h, color) => {
    if (w <= 0 || h <= 0) return;
    ctx.fillStyle = color;
    ctx.fillRect(
      Math.round(x) * SCALE,
      Math.round(y) * SCALE,
      Math.round(w) * SCALE,
      Math.round(h) * SCALE
    );
  };
}

function drawText(ctx, text, cx, cy, color = '#ffffff', size = 10) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = `bold ${size}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, cx * SCALE, cy * SCALE);
  ctx.restore();
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

  start(difficulty, onComplete, weatherData) {
    this.onComplete  = onComplete;
    this.difficulty  = Math.max(0, Math.min(1, difficulty || 0));
    this.weatherData = weatherData || null;
    this.running     = true;
    this._endScheduled = false;

    // Speed scales with difficulty and flood conditions
    const speedMult =
      (1 + this.difficulty * 0.6) *
      (weatherData && weatherData.icon === 'flood' ? 1.35 : 1);

    // Build lanes with randomised starting positions
    this.lanes = LANE_DEFS.map((def) => {
      const spacing = PW / def.count;
      return {
        def,
        logs: Array.from({ length: def.count }, (_, j) => ({
          x: j * spacing + Math.random() * (spacing - def.logW),
          width: def.logW,
          speed: def.baseSpeed * speedMult,
        })),
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

    this.timer       = GAME_DURATION;
    this.state       = 'countdown';   // countdown → playing → won/failed
    this.countdown   = 3;
    this.frameCount  = 0;
    this.lastTime    = null;

    // Keyboard
    this._boundKeyDown = (e) => this._onKey(e);
    window.addEventListener('keydown', this._boundKeyDown);

    // Set canvas to game resolution
    this.canvas.width  = PW * SCALE;
    this.canvas.height = PH * SCALE;
    this.ctx.imageSmoothingEnabled = false;

    this._rafId = requestAnimationFrame((t) => this._loop(t));
  }

  stop() {
    this.running = false;
    if (this._rafId) { cancelAnimationFrame(this._rafId); this._rafId = null; }
    if (this._boundKeyDown) {
      window.removeEventListener('keydown', this._boundKeyDown);
      this._boundKeyDown = null;
    }
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  _onKey(e) {
    if (!this.running || this.state !== 'playing') return;

    const { player } = this;
    let consumed = true;

    if (e.key === 'ArrowUp'    || e.key === 'w' || e.key === 'W') {
      if (player.row > 0) { player.row--; player.riding = null; }
    } else if (e.key === 'ArrowDown'  || e.key === 's' || e.key === 'S') {
      if (player.row < 6) { player.row++; player.riding = null; }
    } else if (e.key === 'ArrowLeft'  || e.key === 'a' || e.key === 'A') {
      player.x = Math.max(1, player.x - 5);
    } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      player.x = Math.min(PW - PLAYER_W - 1, player.x + 5);
    } else {
      consumed = false;
    }

    if (consumed) e.preventDefault();
  }

  // ── Game loop ──────────────────────────────────────────────────────────────

  _loop(timestamp) {
    if (!this.running) return;

    const dt = this.lastTime
      ? Math.min((timestamp - this.lastTime) / 1000, 0.1)
      : 0;
    this.lastTime = timestamp;
    this.frameCount++;

    this._update(dt);
    this._draw();

    if (this.state === 'playing' || this.state === 'countdown') {
      this._rafId = requestAnimationFrame((t) => this._loop(t));
    } else if (!this._endScheduled) {
      // Show result frame for 2 s then hand back to game
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

    // Timer
    this.timer -= dt;
    if (this.timer <= 0) { this.state = 'failed'; return; }

    // Move all logs
    lanes.forEach(({ def, logs }) => {
      logs.forEach((log) => {
        log.x += def.dir * log.speed;
        // Wrap with a small buffer so logs don't pop into view
        if (def.dir ===  1 && log.x >  PW)              log.x = -log.width;
        if (def.dir === -1 && log.x + log.width < 0)    log.x =  PW;
      });
    });

    // If riding a log, drift with it
    if (player.riding) {
      const { laneIdx, log } = player.riding;
      const def = lanes[laneIdx].def;
      player.x += def.dir * log.speed;

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
        player.health = Math.max(0, player.health - WATER_DAMAGE_RATE * dt);
        if (player.health <= 0) { this.state = 'failed'; }
      }
    } else {
      // On a bank — safe
      player.riding  = null;
      player.inWater = false;
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  _draw() {
    const { ctx, player, lanes, frameCount } = this;
    const r = makeR(ctx);

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // ── Far bank (goal) ─────────────────────────────────────────────────
    r(0, 0, PW, 5, '#2a5a10');
    r(0, 0, PW, 1, '#3a7a20');   // top highlight
    // Lily pads / shore detail
    for (let x = 4; x < PW - 4; x += 12) r(x, 2, 6, 2, '#3a7a20');

    // ── River background ────────────────────────────────────────────────
    r(0, 5, PW, 30, '#1a3a7a');

    // Animated river current shimmer
    const sh = frameCount % PW;
    r(sh,           8,  18, 1, 'rgba(60,140,230,0.25)');
    r((sh + 35) % PW, 14, 12, 1, 'rgba(60,140,230,0.25)');
    r((sh + 55) % PW, 20, 16, 1, 'rgba(60,140,230,0.2)');
    r((sh + 20) % PW, 26, 10, 1, 'rgba(60,140,230,0.25)');

    // Lane dividers (subtle)
    [5, 11, 17, 23, 29, 35].forEach(y => r(0, y, PW, 1, 'rgba(10,20,60,0.4)'));

    // ── Logs ────────────────────────────────────────────────────────────
    lanes.forEach(({ def, logs }, i) => {
      const cy = ROW_Y[i + 1];
      const ly = cy - 2; // log top

      logs.forEach((log) => {
        // Log body
        r(log.x,     ly, log.width,     4, def.color);
        // Wood grain lines
        r(log.x + 1, ly, log.width - 2, 1, def.bark === '#6a3e0a' ? '#aa7a2a' : '#8a5a1a');
        r(log.x + 1, ly + 2, log.width - 2, 1, def.bark);
        // End caps (knots)
        r(log.x,              ly + 1, 2, 2, def.bark);
        r(log.x + log.width - 2, ly + 1, 2, 2, def.bark);
      });
    });

    // ── Near bank (start) ───────────────────────────────────────────────
    r(0, 35, PW, 10, '#3a6a18');
    r(0, 35, PW,  1, '#4a8a28');  // top edge highlight
    r(0, 44, PW,  1, '#2a5a10');  // bottom shadow

    // ── Player sprite ───────────────────────────────────────────────────
    const py = ROW_Y[player.row] - 2;
    const px = Math.round(player.x);

    const flicker = frameCount % 4 < 2;
    const bodyColor = player.inWater
      ? (flicker ? '#ff3333' : '#ff8888')
      : player.riding
        ? '#ffd700'      // gold on log
        : '#2a8aff';     // blue on bank

    // Car top (cab)
    r(px + 1, py,     PLAYER_W - 2, 2, bodyColor);
    // Car body
    r(px,     py + 2, PLAYER_W,     2, bodyColor);
    // Windshield
    r(px + 1, py,     1, 1, 'rgba(180,230,255,0.8)');
    r(px + 3, py,     1, 1, 'rgba(180,230,255,0.8)');
    // Wheels
    r(px,         py + 3, 2, 1, '#111');
    r(px + PLAYER_W - 2, py + 3, 2, 1, '#111');

    // ── HUD ─────────────────────────────────────────────────────────────
    // Health bar (bottom-left, over near bank)
    const hpW = Math.round((player.health / 100) * 28);
    r(2, 37, 30, 4, '#111111');
    r(2, 37, hpW, 4,
      player.health > 60 ? '#22bb44' :
      player.health > 30 ? '#cc8800' : '#dd2222');

    // Timer bar (bottom-right, over near bank)
    const tmW = Math.round((this.timer / GAME_DURATION) * 28);
    r(PW - 32, 37, 30, 4, '#111111');
    r(PW - 32, 37, tmW, 4, '#3366cc');

    // ── Countdown overlay ────────────────────────────────────────────────
    if (this.state === 'countdown') {
      r(0, 0, PW, PH, 'rgba(0,0,0,0.45)');
      const n = Math.ceil(this.countdown);
      drawText(ctx, n > 0 ? String(n) : 'GO!', PW / 2, PH / 2, '#ffffff', 32);
      drawText(ctx, 'FORD THE RIVER', PW / 2, PH / 2 - 10, '#ffd700', 10);
      drawText(ctx, '↑↓ hop lanes   ←→ shift position', PW / 2, PH / 2 + 10, '#cccccc', 8);
    }

    // ── Win screen ───────────────────────────────────────────────────────
    if (this.state === 'won') {
      r(10, 14, 60, 18, '#0a2a08');
      r(11, 15, 58, 16, '#1a4a14');
      drawText(ctx, 'ACROSS!', PW / 2, PH / 2 - 2, '#ffd700', 18);
      drawText(ctx, 'Far bank reached', PW / 2, PH / 2 + 7, '#aaddaa', 8);
    }

    // ── Fail screen ──────────────────────────────────────────────────────
    if (this.state === 'failed') {
      r(10, 14, 60, 18, '#2a0808');
      r(11, 15, 58, 16, '#4a1414');
      const msg = player.health <= 0 ? 'SWEPT AWAY!' : 'TIME\'S UP!';
      drawText(ctx, msg, PW / 2, PH / 2 - 2, '#ff6666', 14);
      drawText(ctx, 'Pulled back to shore', PW / 2, PH / 2 + 7, '#ddaaaa', 8);
    }

    // ── Border frame ─────────────────────────────────────────────────────
    r(0, 0, PW, 1, '#000'); r(0, PH - 1, PW, 1, '#000');
    r(0, 0, 1, PH, '#000'); r(PW - 1, 0, 1, PH, '#000');

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

  // ── Result builder ─────────────────────────────────────────────────────────

  _buildResult() {
    const healthLost = Math.round(100 - this.player.health);

    if (this.state === 'won') {
      const cleanCross = healthLost < 10;
      return {
        survived: true,
        won: true,
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
