// Shelter Dash — 2D shelter survival mini-game
// Player navigates a static field seeking shelter from weather perils.
// Exposed = rapid damage, sheltered = safe. Survive the timer.

const WIDTH = 70;
const HEIGHT = 18;
const PLAY_MIN_ROW = 2;
const PLAY_MAX_ROW = 16;
const PLAY_MIN_COL = 1;
const PLAY_MAX_COL = 68;
const COUNTDOWN_DURATION = 1.5;

function lerp(a, b, t) { return a + (b - a) * t; }

function getDifficultyParams(progress) {
  const t = Math.max(0, Math.min(1, progress));
  return {
    duration:       lerp(15, 12, t),
    exposureDamage: lerp(8, 16, t),  // health lost per sec when exposed
    shelterCount:   Math.round(lerp(6, 4, t)),
    shelterSize:    3, // 3x3 shelters
    perilDensity:   lerp(0.02, 0.05, t), // visual particle density
  };
}

// Peril types based on weather conditions
const PERIL_PRESETS = {
  smoke:   { char: '~', cssClass: 'ascii-fire',  label: 'SMOKE' },
  fire:    { char: '*', cssClass: 'ascii-fire',  label: 'FIRE' },
  heat:    { char: '~', cssClass: 'ascii-fire',  label: 'HEAT' },
  drought: { char: '.', cssClass: 'ascii-road',  label: 'DROUGHT' },
  flood:   { char: '~', cssClass: 'ascii-water', label: 'FLOOD' },
  storm:   { char: '/', cssClass: 'ascii-snow',  label: 'STORM' },
  default: { char: '*', cssClass: 'ascii-fire',  label: 'HAZARD' },
};

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Determine peril type from weather data
function getPerilFromWeather(weatherRisk) {
  if (!weatherRisk) return PERIL_PRESETS.default;
  if (weatherRisk.wildfire > 0) return PERIL_PRESETS.smoke;
  if (weatherRisk.heat > 0) return PERIL_PRESETS.heat;
  if (weatherRisk.flood > 0) return PERIL_PRESETS.flood;
  if (weatherRisk.tornado > 0 || weatherRisk.hurricane > 0) return PERIL_PRESETS.storm;
  return PERIL_PRESETS.default;
}

export class ShelterDash {
  constructor(displayEl, infoBarEl) {
    this.display = displayEl;
    this.infoBar = infoBarEl;
    this.running = false;
    this._boundKeyDown = null;
    this._boundKeyUp = null;
    this._rafId = null;
  }

  /**
   * Start the shelter survival mini-game.
   * @param {number} difficulty - Game progress 0.0–1.0
   * @param {function} onComplete - Called with { survived, narrative, effects }
   * @param {object} [weatherRisk] - Current weather risk from game state
   */
  start(difficulty, onComplete, weatherRisk) {
    this.onComplete = onComplete;
    this.params = getDifficultyParams(difficulty);
    this.running = true;
    this.peril = getPerilFromWeather(weatherRisk);

    // Player
    this.playerCol = Math.floor(WIDTH / 2);
    this.playerRow = Math.floor(HEIGHT / 2);
    this.keysDown = {};

    // Health (100 = full, 0 = dead)
    this.health = 100;

    // Game state
    this.elapsed = 0;
    this.countdownElapsed = 0;
    this.inCountdown = true;
    this.ended = false;
    this.isInShelter = false;
    this.timeInShelter = 0;
    this.timeExposed = 0;

    // Generate field with shelters
    this.shelters = [];
    this._generateField();

    // Peril animation seed
    this.animFrame = 0;

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

  _generateField() {
    const count = this.params.shelterCount;
    const size = this.params.shelterSize;

    for (let i = 0; i < count; i++) {
      let attempts = 0;
      while (attempts < 50) {
        const col = PLAY_MIN_COL + 2 + Math.floor(Math.random() * (PLAY_MAX_COL - PLAY_MIN_COL - size - 4));
        const row = PLAY_MIN_ROW + 1 + Math.floor(Math.random() * (PLAY_MAX_ROW - PLAY_MIN_ROW - size - 2));

        // Check no overlap with existing shelters (with buffer)
        const overlaps = this.shelters.some(s =>
          col < s.col + s.size + 2 && col + size + 2 > s.col &&
          row < s.row + s.size + 2 && row + size + 2 > s.row
        );
        if (!overlaps) {
          this.shelters.push({ col, row, size });
          break;
        }
        attempts++;
      }
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

    this.animFrame++;
    this._render();
    this._rafId = requestAnimationFrame((t) => this._tick(t));
  }

  _updateCountdown(dt) {
    this.countdownElapsed += dt;
    if (this.countdownElapsed >= COUNTDOWN_DURATION) this.inCountdown = false;
  }

  _updateGame(dt) {
    this.elapsed += dt;

    // Move player
    const speed = 14 * dt;
    const k = this.keysDown;
    if (k['arrowleft'] || k['a']) this.playerCol -= speed;
    if (k['arrowright'] || k['d']) this.playerCol += speed;
    if (k['arrowup'] || k['w']) this.playerRow -= speed;
    if (k['arrowdown'] || k['s']) this.playerRow += speed;

    this.playerCol = Math.max(PLAY_MIN_COL, Math.min(PLAY_MAX_COL, this.playerCol));
    this.playerRow = Math.max(PLAY_MIN_ROW, Math.min(PLAY_MAX_ROW, this.playerRow));

    // Check if in shelter
    const pCol = Math.round(this.playerCol);
    const pRow = Math.round(this.playerRow);
    this.isInShelter = this.shelters.some(s =>
      pCol >= s.col && pCol < s.col + s.size &&
      pRow >= s.row && pRow < s.row + s.size
    );

    // Apply damage or safety
    if (this.isInShelter) {
      this.timeInShelter += dt;
      // Minimal damage in shelter (1/sec from residual exposure)
      this.health = Math.max(0, this.health - 1 * dt);
    } else {
      this.timeExposed += dt;
      this.health = Math.max(0, this.health - this.params.exposureDamage * dt);
    }

    // Check end conditions
    const timeLeft = this.params.duration - this.elapsed;
    if (this.health <= 0) {
      this._endGame('collapsed');
      return;
    }
    if (timeLeft <= 0) {
      this._endGame(this.health > 20 ? 'survived' : 'barely');
    }
  }

  _endGame(outcome) {
    this.ended = true;
    this.outcome = outcome;

    setTimeout(() => {
      this.stop();
      if (this.onComplete) this.onComplete(this._buildResult(outcome));
    }, 1200);
  }

  _buildResult(outcome) {
    const effects = {};

    if (outcome === 'survived') {
      effects.morale = 5;
      effects.health = -5;
      return {
        survived: true,
        narrative: `You found shelter from the ${this.peril.label.toLowerCase()} and rode it out. Shaken but alive.`,
        effects,
      };
    } else if (outcome === 'barely') {
      effects.morale = -3;
      effects.health = -12;
      return {
        survived: true,
        narrative: `The ${this.peril.label.toLowerCase()} battered you between shelters. You made it, but barely.`,
        effects,
      };
    } else {
      // collapsed
      effects.health = -20;
      effects.morale = -10;
      return {
        survived: false,
        narrative: `The ${this.peril.label.toLowerCase()} was too intense. Exposed for too long, the family collapsed before reaching safety.`,
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

    if (this.inCountdown) {
      this._renderCountdown(charGrid, colorGrid);
    } else {
      this._renderPerilBackground(charGrid, colorGrid);
      this._renderShelters(charGrid, colorGrid);
      this._renderPlayer(charGrid, colorGrid);
      this._renderHealthBar(charGrid, colorGrid);

      if (this.ended) {
        this._renderOutcome(charGrid, colorGrid);
      }
    }

    this.display.innerHTML = this._gridsToHtml(charGrid, colorGrid);
    this._updateInfoBar();
  }

  _renderCountdown(charGrid, colorGrid) {
    const title = 'S H E L T E R   D A S H';
    const titleCol = Math.floor((WIDTH - title.length) / 2);
    for (let i = 0; i < title.length; i++) {
      charGrid[2][titleCol + i] = title[i];
      colorGrid[2][titleCol + i] = 'ascii-player';
    }

    const remaining = COUNTDOWN_DURATION - this.countdownElapsed;
    const text = remaining > 1.0 ? '3' : remaining > 0.5 ? '2' : remaining > 0.0 ? '1' : 'GO!';
    const row = 7;
    const col = Math.floor((WIDTH - text.length) / 2);
    for (let i = 0; i < text.length; i++) {
      charGrid[row][col + i] = text[i];
      colorGrid[row][col + i] = 'ascii-player';
    }

    const perilLine = `Peril: ${this.peril.label}  |  Find shelter to survive!`;
    const plCol = Math.floor((WIDTH - perilLine.length) / 2);
    for (let i = 0; i < perilLine.length; i++) {
      charGrid[10][plCol + i] = perilLine[i];
      colorGrid[10][plCol + i] = this.peril.cssClass;
    }

    const instr = '[W/A/S/D] or Arrow Keys to move  |  ^ = Shelter  @ = You';
    const instrCol = Math.floor((WIDTH - instr.length) / 2);
    if (instrCol >= 0) {
      for (let i = 0; i < instr.length; i++) {
        charGrid[13][instrCol + i] = instr[i];
      }
    }
  }

  _renderPerilBackground(charGrid, colorGrid) {
    // Fill exposed areas with animated peril particles
    const seed = this.animFrame;
    for (let r = PLAY_MIN_ROW; r <= PLAY_MAX_ROW; r++) {
      for (let c = PLAY_MIN_COL; c <= PLAY_MAX_COL; c++) {
        const hash = ((r * 131 + c * 997 + seed * 37) % 1000) / 1000;
        if (hash < this.params.perilDensity) {
          charGrid[r][c] = this.peril.char;
          colorGrid[r][c] = this.peril.cssClass;
        }
      }
    }

    // Peril label top-left
    const label = `!! ${this.peril.label} WARNING !!`;
    const lCol = Math.floor((WIDTH - label.length) / 2);
    for (let i = 0; i < label.length; i++) {
      charGrid[0][lCol + i] = label[i];
      colorGrid[0][lCol + i] = this.peril.cssClass;
    }
  }

  _renderShelters(charGrid, colorGrid) {
    for (const s of this.shelters) {
      for (let dr = 0; dr < s.size; dr++) {
        for (let dc = 0; dc < s.size; dc++) {
          const r = s.row + dr;
          const c = s.col + dc;
          if (r >= 0 && r < HEIGHT && c >= 0 && c < WIDTH) {
            // Draw shelter as roof/walls
            if (dr === 0) {
              charGrid[r][c] = '^';
            } else if (dc === 0 || dc === s.size - 1) {
              charGrid[r][c] = '|';
            } else {
              charGrid[r][c] = ' '; // safe interior
            }
            colorGrid[r][c] = 'ascii-shelter';
          }
        }
      }
    }
  }

  _renderPlayer(charGrid, colorGrid) {
    const c = Math.round(this.playerCol);
    const r = Math.round(this.playerRow);
    if (c >= 0 && c < WIDTH && r >= 0 && r < HEIGHT) {
      charGrid[r][c] = '@';
      colorGrid[r][c] = this.isInShelter ? 'ascii-player' : 'ascii-player-hit';
    }
  }

  _renderHealthBar(charGrid, colorGrid) {
    const maxLen = 20;
    const pct = this.health / 100;
    const filled = Math.round(pct * maxLen);
    const label = 'HP:';
    const startCol = 2;

    for (let i = 0; i < label.length; i++) {
      charGrid[0][startCol + i] = label[i];
    }
    const barStart = startCol + label.length;
    charGrid[0][barStart] = '[';
    for (let i = 0; i < maxLen; i++) {
      charGrid[0][barStart + 1 + i] = i < filled ? '=' : ' ';
      colorGrid[0][barStart + 1 + i] = pct > 0.3 ? 'ascii-dash-health' : 'ascii-fire';
    }
    charGrid[0][barStart + maxLen + 1] = ']';

    // Status indicator
    const status = this.isInShelter ? ' SHELTERED' : ' EXPOSED!';
    const statusCss = this.isInShelter ? 'ascii-player' : 'ascii-fire';
    const sStart = barStart + maxLen + 2;
    for (let i = 0; i < status.length && sStart + i < WIDTH; i++) {
      charGrid[0][sStart + i] = status[i];
      colorGrid[0][sStart + i] = statusCss;
    }
  }

  _renderOutcome(charGrid, colorGrid) {
    let text, css;
    if (this.outcome === 'survived') {
      text = '** YOU SURVIVED! **';
      css = 'ascii-player';
    } else if (this.outcome === 'barely') {
      text = '-- BARELY MADE IT --';
      css = 'ascii-player';
    } else {
      text = 'XX COLLAPSED XX';
      css = 'ascii-fire';
    }
    const row = 9;
    const col = Math.floor((WIDTH - text.length) / 2);
    for (let i = 0; i < text.length; i++) {
      if (col + i >= 0 && col + i < WIDTH) {
        charGrid[row][col + i] = text[i];
        colorGrid[row][col + i] = css;
      }
    }
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
      this.infoBar.textContent = `SHELTER DASH | ${this.peril.label} incoming... Get ready!`;
      return;
    }
    const timeLeft = Math.max(0, this.params.duration - this.elapsed).toFixed(1);
    const hp = Math.round(this.health);
    const status = this.isInShelter ? 'SHELTERED' : 'EXPOSED';
    this.infoBar.textContent =
      `SHELTER DASH | [W/A/S/D] Move | Time: ${timeLeft}s | Health: ${hp}% | ${status}`;
  }
}
