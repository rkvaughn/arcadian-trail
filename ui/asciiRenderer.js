import { STATES } from '../js/game.js';
import {
  terrainScenes,
  vehicleSpriteWidth,
  vehicleCol,
  weatherEffects,
  eventScenes,
  eventIdScenes,
} from '../data/asciiArt.js';

const SCENE_WIDTH = 70;
const SCENE_HEIGHT = 18;
const ROAD_START_ROW = 12;
const PROGRESS_BAR_LENGTH = 20;
const TRANSITION_FRAMES = 4;
const TIME_PHASES = ['dawn', 'day', 'dusk', 'night'];
const DAYS_PER_PHASE = 3;

// Wheel animation frames for vehicle sprite
const WHEEL_FRAMES = [
  ["  ______     ", " /|_||_\\`.__", "(   _    _ _\\", "=`-(_)--(_)-'"],
  ["  ______     ", " /|_||_\\`.__", "(   _    _ _\\", "=`-(o)--(o)-'"],
];

// Color mapping: character → CSS class
const COLOR_RULES = {
  vehicle: 'ascii-vehicle',
  fire: 'ascii-fire',
  water: 'ascii-water',
  snow: 'ascii-snow',
  rain: 'ascii-rain',
  road: 'ascii-road',
};

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export class AsciiRenderer {
  constructor(displayEl, infoBarEl) {
    this.display = displayEl;
    this.infoBar = infoBarEl;
    this.lastTerrain = null;
    this.variantIndex = 0;
    this.frameCount = 0;

    // Phase 3: Caching
    this.cachedTerrainGrid = null;
    this.cachedTerrainKey = null;
    this.lastInfoBarStr = null;

    // Phase 6: Transition state
    this.transitionFrame = -1; // -1 = no transition
    this.oldGrid = null;
    this.newGrid = null;
  }

  render(game, weatherData) {
    this.frameCount++;

    if (!game || !game.route || game.route.length === 0) {
      this.display.textContent = this.centeredMessage('Preparing journey...');
      this.infoBar.textContent = '';
      return;
    }

    let grid;
    let isEvent = false;
    let weatherIcon = weatherData ? weatherData.icon : null;

    // Show event scenes during EVENT or RESULT states
    if (
      (game.state === STATES.EVENT || game.state === STATES.RESULT) &&
      game.currentEvent
    ) {
      grid = this.getEventGrid(game.currentEvent);
      isEvent = true;
    } else {
      grid = this.getTerrainGrid(game);
      this.compositeVehicle(grid);
      if (weatherIcon) {
        this.applyWeatherOverlay(grid, weatherIcon);
      }
    }

    // Phase 6: Apply transition wipe if active
    if (this.transitionFrame >= 0 && this.transitionFrame < TRANSITION_FRAMES) {
      grid = this.applyTransition(grid);
      this.transitionFrame++;
    } else if (this.transitionFrame >= TRANSITION_FRAMES) {
      this.transitionFrame = -1;
      this.oldGrid = null;
    }

    // Phase 7: Colorize and render as HTML
    const html = this.colorize(grid, isEvent, weatherIcon);
    this.display.innerHTML = html;

    // Day/night cycle — apply time-of-day CSS class
    const phase = TIME_PHASES[Math.floor(game.day / DAYS_PER_PHASE) % TIME_PHASES.length];
    for (const p of TIME_PHASES) {
      this.display.classList.toggle(`time-${p}`, p === phase);
    }

    this.updateInfoBar(game);
  }

  getTerrainGrid(game) {
    const wp = game.getCurrentWaypoint();
    const terrain = wp ? wp.terrain : 'plains';

    // Pick a variant — switch when terrain changes
    if (terrain !== this.lastTerrain) {
      // Phase 6: Start transition if we have a previous terrain
      if (this.lastTerrain !== null && this.cachedTerrainGrid) {
        this.oldGrid = this.cachedTerrainGrid.map(line => line.slice());
        this.transitionFrame = 0;
      }

      this.lastTerrain = terrain;
      const variants = terrainScenes[terrain] || terrainScenes.plains;
      this.variantIndex = Math.floor(Math.random() * variants.length);
      this.cachedTerrainGrid = null;
      this.cachedTerrainKey = null;
    }

    // Phase 3: Cache terrain grid
    const cacheKey = `${terrain}-${this.variantIndex}`;
    if (this.cachedTerrainKey === cacheKey && this.cachedTerrainGrid) {
      return this.cachedTerrainGrid.map(line => line.slice());
    }

    const variants = terrainScenes[terrain] || terrainScenes.plains;
    const scene = variants[this.variantIndex % variants.length];
    this.cachedTerrainGrid = scene.map(line => line.slice());
    this.cachedTerrainKey = cacheKey;

    return this.cachedTerrainGrid.map(line => line.slice());
  }

  getEventGrid(event) {
    // Per-event first-person scene, fall back to perilType generic
    if (eventIdScenes[event.id]) {
      return eventIdScenes[event.id].map(line => line.slice());
    }
    const scene = eventScenes[event.perilType] || eventScenes.positive;
    return scene.map(line => line.slice());
  }

  compositeVehicle(grid) {
    // Phase 5: Horizontal oscillation (±1 col based on frame)
    const oscillation = Math.round(Math.sin(this.frameCount * 0.3) * 1.5);
    const col = vehicleCol + oscillation;

    // Phase 5: Wheel animation — alternate frames
    const wheelFrame = WHEEL_FRAMES[this.frameCount % 2];

    for (let i = 0; i < wheelFrame.length; i++) {
      const row = ROAD_START_ROW + i;
      if (row >= grid.length) break;

      const line = grid[row];
      const sprite = wheelFrame[i];

      const before = line.substring(0, col);
      const after = line.substring(col + vehicleSpriteWidth);
      grid[row] = before + sprite + after;
    }
  }

  applyWeatherOverlay(grid, weatherIcon) {
    if (!weatherIcon) return;
    const effect = weatherEffects[weatherIcon];
    if (!effect) return;

    const { chars, density, rowRange } = effect;
    const [minRow, maxRow] = rowRange;
    const seed = this.frameCount;

    for (let row = minRow; row <= maxRow && row < grid.length; row++) {
      const line = grid[row].split('');
      for (let col = 0; col < line.length; col++) {
        const hash = ((row * 131 + col * 997 + seed * 37) % 1000) / 1000;
        if (hash < density && line[col] === ' ') {
          line[col] = chars[Math.floor(hash * 1000) % chars.length];
        }
      }
      grid[row] = line.join('');
    }

    // Lightning flash effect for storms
    if (effect.lightning && seed % 20 === 0) {
      for (let row = minRow; row <= Math.min(maxRow, 3); row++) {
        const line = grid[row].split('');
        for (let col = 0; col < line.length; col++) {
          if (line[col] === ' ' && Math.random() < 0.3) {
            line[col] = '#';
          }
        }
        grid[row] = line.join('');
      }
    }
  }

  // Phase 6: Left-to-right wipe transition
  applyTransition(newGrid) {
    if (!this.oldGrid) return newGrid;

    const progress = (this.transitionFrame + 1) / TRANSITION_FRAMES;
    const splitCol = Math.floor(SCENE_WIDTH * progress);
    const result = [];

    for (let row = 0; row < SCENE_HEIGHT; row++) {
      const newLine = newGrid[row] || '';
      const oldLine = (this.oldGrid[row] || '').padEnd(SCENE_WIDTH);
      result.push(newLine.substring(0, splitCol) + oldLine.substring(splitCol));
    }
    return result;
  }

  // Phase 7: Colorize grid into HTML
  colorize(grid, isEvent, weatherIcon) {
    const lines = [];

    for (let row = 0; row < grid.length; row++) {
      const rawLine = grid[row];
      const escaped = escapeHtml(rawLine);

      // Road band rows — subtle tint
      if (row === ROAD_START_ROW || row === ROAD_START_ROW + 2) {
        lines.push(`<span class="${COLOR_RULES.road}">${escaped}</span>`);
        continue;
      }

      // Vehicle row — colorize the vehicle sprite region
      if (!isEvent && row >= ROAD_START_ROW && row < ROAD_START_ROW + 4) {
        const oscillation = Math.round(Math.sin(this.frameCount * 0.3) * 1.5);
        const col = vehicleCol + oscillation;
        const endCol = col + vehicleSpriteWidth;
        const before = escapeHtml(rawLine.substring(0, col));
        const veh = escapeHtml(rawLine.substring(col, endCol));
        const after = escapeHtml(rawLine.substring(endCol));
        lines.push(`${before}<span class="${COLOR_RULES.vehicle}">${veh}</span>${after}`);
        continue;
      }

      // Weather overlay coloring for affected rows
      if (!isEvent && weatherIcon) {
        const effect = weatherEffects[weatherIcon];
        if (effect) {
          const [minRow, maxRow] = effect.rowRange;
          if (row >= minRow && row <= maxRow) {
            const colorClass = this.getWeatherColorClass(weatherIcon);
            if (colorClass) {
              const coloredLine = this.colorizeWeatherChars(rawLine, effect.chars, colorClass);
              lines.push(coloredLine);
              continue;
            }
          }
        }
      }

      // Event-specific coloring
      if (isEvent) {
        lines.push(this.colorizeEventLine(escaped, rawLine, row));
        continue;
      }

      lines.push(escaped);
    }

    return lines.join('\n');
  }

  getWeatherColorClass(weatherIcon) {
    switch (weatherIcon) {
      case 'rain': case 'storm': return COLOR_RULES.rain;
      case 'snow': return COLOR_RULES.snow;
      default: return null;
    }
  }

  colorizeWeatherChars(rawLine, weatherChars, colorClass) {
    const chars = rawLine.split('');
    let result = '';
    let inSpan = false;

    for (const ch of chars) {
      const isWeatherChar = weatherChars.includes(ch) && ch !== ' ';
      if (isWeatherChar && !inSpan) {
        result += `<span class="${colorClass}">`;
        inSpan = true;
      } else if (!isWeatherChar && inSpan) {
        result += '</span>';
        inSpan = false;
      }
      result += escapeHtml(ch);
    }
    if (inSpan) result += '</span>';
    return result;
  }

  colorizeEventLine(escaped, rawLine, row) {
    // Fire-related events: colorize flame characters
    if (rawLine.includes('flame') || rawLine.includes('fire') ||
        rawLine.includes('FIRE') || rawLine.includes('ember') ||
        rawLine.includes('**')) {
      return escaped.replace(/[(){}*|]+/g, m => `<span class="${COLOR_RULES.fire}">${m}</span>`);
    }
    // Flood/water events
    if (rawLine.includes('~~~') || rawLine.includes('FLOOD') || rawLine.includes('SURGE')) {
      return escaped.replace(/[~]+/g, m => `<span class="${COLOR_RULES.water}">${m}</span>`);
    }
    return escaped;
  }

  updateInfoBar(game) {
    const wp = game.getCurrentWaypoint();
    const terrain = wp ? wp.terrain : '???';
    const location = wp ? wp.name : 'Unknown';
    const remaining = Math.max(
      0,
      Math.round(game.totalDistance - game.totalDistanceTraveled)
    );
    const progress = game.getProgress();
    const pct = Math.round(progress * 100);

    const filled = Math.round(progress * PROGRESS_BAR_LENGTH);
    const bar =
      '[' +
      '='.repeat(Math.max(0, filled - 1)) +
      (filled > 0 ? '>' : ' ') +
      ' '.repeat(PROGRESS_BAR_LENGTH - filled) +
      ']';

    const str =
      `Day ${game.day} | ${location} (${terrain}) | ${remaining} mi remaining | ${bar} ${pct}%`;

    // Phase 3: Skip DOM update if unchanged
    if (str !== this.lastInfoBarStr) {
      this.infoBar.textContent = str;
      this.lastInfoBarStr = str;
    }
  }

  centeredMessage(msg) {
    const lines = [];
    const pad = Math.max(0, Math.floor((SCENE_WIDTH - msg.length) / 2));
    for (let i = 0; i < SCENE_HEIGHT; i++) {
      if (i === Math.floor(SCENE_HEIGHT / 2)) {
        lines.push(' '.repeat(pad) + msg);
      } else {
        lines.push('');
      }
    }
    return lines.join('\n');
  }
}
