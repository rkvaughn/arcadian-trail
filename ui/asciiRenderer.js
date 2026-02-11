import { STATES } from '../js/game.js';
import {
  terrainScenes,
  vehicleSprite,
  vehicleSpriteWidth,
  vehicleCol,
  weatherEffects,
  eventScenes,
} from '../data/asciiArt.js';

const SCENE_WIDTH = 70;
const SCENE_HEIGHT = 18;

export class AsciiRenderer {
  constructor(displayEl, infoBarEl) {
    this.display = displayEl;
    this.infoBar = infoBarEl;
    this.lastTerrain = null;
    this.variantIndex = 0;
    this.frameCount = 0;
  }

  render(game, weatherData) {
    this.frameCount++;

    if (!game || !game.route || game.route.length === 0) {
      this.display.textContent = this.centeredMessage('Preparing journey...');
      this.infoBar.textContent = '';
      return;
    }

    let grid;

    // Show event scenes during EVENT or RESULT states
    if (
      (game.state === STATES.EVENT || game.state === STATES.RESULT) &&
      game.currentEvent
    ) {
      grid = this.getEventGrid(game.currentEvent.perilType);
    } else {
      grid = this.getTerrainGrid(game);
      this.compositeVehicle(grid);
      if (weatherData) {
        this.applyWeatherOverlay(grid, weatherData.icon);
      }
    }

    this.display.textContent = grid.join('\n');
    this.updateInfoBar(game);
  }

  getTerrainGrid(game) {
    const wp = game.getCurrentWaypoint();
    const terrain = wp ? wp.terrain : 'plains';

    // Pick a variant — switch when terrain changes
    if (terrain !== this.lastTerrain) {
      this.lastTerrain = terrain;
      const variants = terrainScenes[terrain] || terrainScenes.plains;
      this.variantIndex = Math.floor(Math.random() * variants.length);
    }

    const variants = terrainScenes[terrain] || terrainScenes.plains;
    const scene = variants[this.variantIndex % variants.length];

    // Deep copy so overlays don't mutate the source
    return scene.map(line => line.slice());
  }

  getEventGrid(perilType) {
    const scene = eventScenes[perilType] || eventScenes.positive;
    return scene.map(line => line.slice());
  }

  compositeVehicle(grid) {
    // Place vehicle sprite on the road band (lines 12-15)
    const roadStart = 12;
    for (let i = 0; i < vehicleSprite.length; i++) {
      const row = roadStart + i;
      if (row >= grid.length) break;

      const line = grid[row];
      const sprite = vehicleSprite[i];

      // Build new line with vehicle composited in
      const before = line.substring(0, vehicleCol);
      const after = line.substring(vehicleCol + vehicleSpriteWidth);
      grid[row] = before + sprite + after;
    }
  }

  applyWeatherOverlay(grid, weatherIcon) {
    if (!weatherIcon) return;
    const effect = weatherEffects[weatherIcon];
    if (!effect) return;

    const { chars, density, rowRange } = effect;
    const [minRow, maxRow] = rowRange;

    // Use frameCount for animation variety
    const seed = this.frameCount;

    for (let row = minRow; row <= maxRow && row < grid.length; row++) {
      const line = grid[row].split('');
      for (let col = 0; col < line.length; col++) {
        // Pseudo-random based on position and frame
        const hash = ((row * 131 + col * 997 + seed * 37) % 1000) / 1000;
        if (hash < density && line[col] === ' ') {
          line[col] = chars[Math.floor(hash * 1000) % chars.length];
        }
      }
      grid[row] = line.join('');
    }

    // Lightning flash effect for storms — occasionally blank the whole scene briefly
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

    // Build progress bar: 20 chars wide
    const barLen = 20;
    const filled = Math.round(progress * barLen);
    const bar =
      '[' +
      '='.repeat(Math.max(0, filled - 1)) +
      (filled > 0 ? '>' : ' ') +
      ' '.repeat(barLen - filled) +
      ']';

    this.infoBar.textContent =
      `Day ${game.day} | ${location} (${terrain}) | ${remaining} mi remaining | ${bar} ${pct}%`;
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
