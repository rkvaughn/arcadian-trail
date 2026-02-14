const WIDTH = 70;
const HEIGHT = 18;
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

// Obstacle types
const OBSTACLE_TYPES = [
  { char: '#', cssClass: 'ascii-fire',  name: 'barricade' },
  { char: 'X', cssClass: 'ascii-fire',  name: 'wreckage' },
  { char: '=', cssClass: 'ascii-road',  name: 'barrier' },
  { char: '/', cssClass: 'ascii-snow',  name: 'debris' },
];

// Boost pickups
const PICKUP_TYPES = [
  { char: '>', cssClass: 'ascii-player',     name: 'nitro' },
  { char: '$', cssClass: 'ascii-dash-health', name: 'supplies' },
];

// Win scene: car speeding into distance
const WIN_SCENE = [
  "                                                                      ",
  "      .    *      .    *      .    *      .    *      .    *          ",
  "  *      .    *      .    *      .    *      .    *      .    *      ",
  "                                                                      ",
  "                     Y O U   E S C A P E D !                          ",
  "                                                                      ",
  "                          .  __                                       ",
  "                        . _.'  '.__                                   ",
  "                   ======'--()--()-'====>                              ",
  "                                                                      ",
  "            The barricade shrinks in the rearview mirror.             ",
  "            Your family cheers. Freedom ahead.                        ",
  "______________________________road___________________________________ ",
  "  ---  ---  ---  ---  ---  ---  ---  ---  ---  ---  ---  ---  ---     ",
  "______________________________road___________________________________ ",
  "  ,,, ,,, ,,, ,,, ,,, ,,, open road ,,, ,,, ,,, ,,, ,,, ,,, ,,,    ",
  "                                                                      ",
  "                                                                      ",
];

// Lose scene: warlords cheering
const LOSE_SCENE = [
  "                                                                      ",
  "                    C A U G H T !                                     ",
  "                                                                      ",
  "      \\o/    \\o/    \\o/    \\o/    \\o/    \\o/    \\o/              ",
  "       |      |      |      |      |      |      |                   ",
  "      / \\    / \\    / \\    / \\    / \\    / \\    / \\              ",
  "                                                                      ",
  "    The raiders surround the car. They bang on the hood and cheer.    ",
  "    Your supplies are forfeit. Your family huddles in silence.        ",
  "                                                                      ",
  "       [####]====[####]  BARRICADE  [####]====[####]                  ",
  "       |    |    |    |             |    |    |    |                  ",
  "______________________________road___________________________________ ",
  "  ---  ---  ---  ---  ---  ---  ---  ---  ---  ---  ---  ---  ---     ",
  "______________________________road___________________________________ ",
  "       X    X    X    wreckage    X    X    X    X                    ",
  "                                                                      ",
  "                                                                      ",
];

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export class BarricadeRunner {
  constructor(displayEl, infoBarEl) {
    this.display = displayEl;
    this.infoBar = infoBarEl;
    this.running = false;
    this._boundKeyDown = null;
    this._boundKeyUp = null;
    this._rafId = null;
  }

  start(difficulty, onComplete) {
    this.onComplete = onComplete;
    this.params = getDifficultyParams(difficulty);
    this.running = true;

    // Player state
    this.playerCol = PLAYER_START_COL;
    this.playerRow = PLAYER_START_ROW;
    this.keysDown = {};

    // Speed & distance
    this.speed = this.params.baseSpeed;
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
    this.hitFlashFrames = 0;
    this.ended = false;
    this.showingSceneCard = false;

    // Scrolling ground offset
    this.groundOffset = 0;

    // Input
    this._boundKeyDown = (e) => this._onKeyDown(e);
    this._boundKeyUp = (e) => this._onKeyUp(e);
    window.addEventListener('keydown', this._boundKeyDown);
    window.addEventListener('keyup', this._boundKeyUp);

    this._lastTime = performance.now();
    this._tick(performance.now());
  }

  stop() {
    this.running = false;
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    if (this._boundKeyDown) {
      window.removeEventListener('keydown', this._boundKeyDown);
      this._boundKeyDown = null;
    }
    if (this._boundKeyUp) {
      window.removeEventListener('keyup', this._boundKeyUp);
      this._boundKeyUp = null;
    }
  }

  _onKeyDown(e) {
    const key = e.key.toLowerCase();
    if (['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d'].includes(key)) {
      e.preventDefault();
      this.keysDown[key] = true;
    }
  }

  _onKeyUp(e) {
    this.keysDown[e.key.toLowerCase()] = false;
  }

  _tick(now) {
    if (!this.running) return;
    const dt = Math.min((now - this._lastTime) / 1000, 0.1);
    this._lastTime = now;

    if (this.inCountdown) {
      this._updateCountdown(dt);
    } else if (!this.ended) {
      this._updateGame(dt);
    }

    this._render();
    this._rafId = requestAnimationFrame((t) => this._tick(t));
  }

  _updateCountdown(dt) {
    this.countdownElapsed += dt;
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

    // Player vertical movement only (horizontal is auto-scroll, just dodge up/down)
    const vSpeed = 8 * dt;
    const k = this.keysDown;
    if (k['arrowup'] || k['w']) this.playerRow -= vSpeed;
    if (k['arrowdown'] || k['s']) this.playerRow += vSpeed;
    // Allow minor left/right dodging within play area
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
      this.obstacles.push({ col: WIDTH - 1, row, speed: spd, ...type });
    }

    // Spawn pickups
    this.pickupAccum += this.params.pickupRate * dt;
    while (this.pickupAccum >= 1) {
      this.pickupAccum -= 1;
      const type = PICKUP_TYPES[Math.floor(Math.random() * PICKUP_TYPES.length)];
      const row = PLAY_MIN_ROW + Math.floor(Math.random() * (PLAY_MAX_ROW - PLAY_MIN_ROW + 1));
      this.pickups.push({ col: WIDTH - 1, row, speed: 8 + Math.random() * 4, ...type });
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
        this.speed = Math.max(0, this.speed - this.params.speedDrain);
        this.hitFlashFrames = 4;
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
      }
    }

    if (this.hitFlashFrames > 0) this.hitFlashFrames--;

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

    // Show scene card, then report result
    setTimeout(() => {
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
        narrative: 'The wreckage stalls the vehicle. Armed figures surround you, taking what they want.',
        effects,
      };
    }
  }

  // --- Rendering ---
  _render() {
    const charGrid = [];
    const colorGrid = [];
    for (let r = 0; r < HEIGHT; r++) {
      charGrid.push(new Array(WIDTH).fill(' '));
      colorGrid.push(new Array(WIDTH).fill(''));
    }

    if (this.showingSceneCard) {
      this._renderSceneCard(charGrid, colorGrid);
    } else if (this.inCountdown) {
      this._renderCountdown(charGrid, colorGrid);
    } else {
      this._renderBackground(charGrid, colorGrid);
      this._renderObstacles(charGrid, colorGrid);
      this._renderPickups(charGrid, colorGrid);
      this._renderPlayer(charGrid, colorGrid);
      this._renderSpeedBar(charGrid, colorGrid);
    }

    this.display.innerHTML = this._gridsToHtml(charGrid, colorGrid);
    this._updateInfoBar();
  }

  _renderSceneCard(charGrid, colorGrid) {
    const scene = this.outcome === 'escaped' ? WIN_SCENE : LOSE_SCENE;
    const css = this.outcome === 'escaped' ? 'ascii-player' : 'ascii-fire';
    for (let r = 0; r < HEIGHT && r < scene.length; r++) {
      for (let c = 0; c < WIDTH && c < scene[r].length; c++) {
        charGrid[r][c] = scene[r][c];
        if (scene[r][c] !== ' ') colorGrid[r][c] = css;
      }
    }
  }

  _renderCountdown(charGrid, colorGrid) {
    const title = 'C R A S H   T H E   B A R R I C A D E';
    const titleCol = Math.floor((WIDTH - title.length) / 2);
    for (let i = 0; i < title.length; i++) {
      charGrid[2][titleCol + i] = title[i];
      colorGrid[2][titleCol + i] = 'ascii-fire';
    }

    const remaining = COUNTDOWN_DURATION - this.countdownElapsed;
    const text = remaining > 1.0 ? '3' : remaining > 0.5 ? '2' : remaining > 0.0 ? '1' : 'GO!';
    const row = 8;
    const col = Math.floor((WIDTH - text.length) / 2);
    for (let i = 0; i < text.length; i++) {
      charGrid[row][col + i] = text[i];
      colorGrid[row][col + i] = 'ascii-player';
    }

    const instr = '[W/A/S/D] Dodge obstacles  |  Keep your speed up to break free!';
    const instrCol = Math.floor((WIDTH - instr.length) / 2);
    if (instrCol >= 0) {
      for (let i = 0; i < instr.length; i++) {
        charGrid[12][instrCol + i] = instr[i];
      }
    }
  }

  _renderBackground(charGrid, colorGrid) {
    const offset = Math.floor(this.groundOffset);

    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < WIDTH; c++) {
        if (((c + r * 17 + offset) % 11) === 0) charGrid[r][c] = '.';
      }
    }

    const title = 'CRASH THE BARRICADE';
    const tCol = Math.floor((WIDTH - title.length) / 2);
    for (let i = 0; i < title.length; i++) {
      charGrid[0][tCol + i] = title[i];
      colorGrid[0][tCol + i] = 'ascii-fire';
    }

    for (let c = 0; c < WIDTH; c++) {
      if (((c + offset) % 3) === 0) charGrid[11][c] = ',';
    }

    for (let r = 12; r <= 14; r++) {
      for (let c = 0; c < WIDTH; c++) {
        if (r === 13) {
          charGrid[r][c] = ((c + offset) % 4 < 2) ? '-' : ' ';
        } else {
          charGrid[r][c] = '-';
        }
        colorGrid[r][c] = 'ascii-road';
      }
    }

    for (let r = 15; r <= 17; r++) {
      for (let c = 0; c < WIDTH; c++) {
        if (((c + r * 13 + offset) % 5) === 0) charGrid[r][c] = '.';
      }
    }
  }

  _renderObstacles(charGrid, colorGrid) {
    for (const o of this.obstacles) {
      const c = Math.round(o.col);
      const r = Math.round(o.row);
      if (c >= 0 && c < WIDTH && r >= 0 && r < HEIGHT) {
        charGrid[r][c] = o.char;
        colorGrid[r][c] = o.cssClass;
      }
    }
  }

  _renderPickups(charGrid, colorGrid) {
    for (const p of this.pickups) {
      const c = Math.round(p.col);
      const r = Math.round(p.row);
      if (c >= 0 && c < WIDTH && r >= 0 && r < HEIGHT) {
        charGrid[r][c] = p.char;
        colorGrid[r][c] = p.cssClass;
      }
    }
  }

  _renderPlayer(charGrid, colorGrid) {
    const c = Math.round(this.playerCol);
    const r = Math.round(this.playerRow);
    if (c >= 0 && c < WIDTH && r >= 0 && r < HEIGHT) {
      charGrid[r][c] = '@';
      colorGrid[r][c] = this.hitFlashFrames > 0 ? 'ascii-player-hit' : 'ascii-player';
    }
  }

  _renderSpeedBar(charGrid, colorGrid) {
    // Speed bar on row 2, right side
    const maxLen = 20;
    const pct = Math.max(0, this.speed / this.params.baseSpeed);
    const filled = Math.round(pct * maxLen);
    const label = 'SPD:';
    const startCol = WIDTH - maxLen - label.length - 3;

    for (let i = 0; i < label.length; i++) {
      charGrid[1][startCol + i] = label[i];
    }
    const barStart = startCol + label.length;
    charGrid[1][barStart] = '[';
    for (let i = 0; i < maxLen; i++) {
      charGrid[1][barStart + 1 + i] = i < filled ? '=' : ' ';
      colorGrid[1][barStart + 1 + i] = pct > 0.3 ? 'ascii-player' : 'ascii-fire';
    }
    charGrid[1][barStart + maxLen + 1] = ']';

    // Distance bar on row 2
    const distPct = Math.min(1, this.distanceTraveled / this.params.escapeDistance);
    const distFilled = Math.round(distPct * maxLen);
    const distLabel = 'DST:';
    for (let i = 0; i < distLabel.length; i++) {
      charGrid[2][startCol + i] = distLabel[i];
    }
    charGrid[2][barStart] = '[';
    for (let i = 0; i < maxLen; i++) {
      charGrid[2][barStart + 1 + i] = i < distFilled ? '=' : ' ';
      colorGrid[2][barStart + 1 + i] = 'ascii-player';
    }
    charGrid[2][barStart + maxLen + 1] = ']';
  }

  _gridsToHtml(charGrid, colorGrid) {
    const lines = [];
    for (let r = 0; r < HEIGHT; r++) {
      let line = '';
      let currentClass = '';
      let spanOpen = false;
      for (let c = 0; c < WIDTH; c++) {
        const cls = colorGrid[r][c];
        const ch = escapeHtml(charGrid[r][c]);
        if (cls !== currentClass) {
          if (spanOpen) line += '</span>';
          if (cls) {
            line += `<span class="${cls}">${ch}`;
            spanOpen = true;
          } else {
            line += ch;
            spanOpen = false;
          }
          currentClass = cls;
        } else {
          line += ch;
        }
      }
      if (spanOpen) line += '</span>';
      lines.push(line);
    }
    return lines.join('\n');
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
