/**
 * pixelRenderer.js — Canvas-based pixel-art renderer for Arcadian Trail
 *
 * Replaces asciiRenderer.js. Renders terrain and event scenes as pixel art
 * onto a <canvas> element at a fixed logical resolution (PW×PH), scaled up
 * to fill the container with crisp nearest-neighbor interpolation.
 *
 * Public interface is identical to AsciiRenderer:
 *   new PixelRenderer(canvasEl, infoBarEl)
 *   renderer.render(game, weatherData)
 */

import { STATES } from '../js/game.js';
import {
  PW, PH,
  drawTerrainScene,
  drawEventScene,
  drawVehicle,
  drawWeather,
} from '../data/pixelScenes.js';

const SCALE = 4;                           // canvas px per logical px
const CANVAS_W = PW * SCALE;              // 320 native canvas pixels wide
const CANVAS_H = PH * SCALE;              // 180 native canvas pixels tall

const TIME_PHASES = ['dawn', 'day', 'dusk', 'night'];
const DAYS_PER_PHASE = 3;

const PROGRESS_BAR_LENGTH = 20;

export class PixelRenderer {
  constructor(canvasEl, infoBarEl) {
    this.canvas  = canvasEl;
    this.infoBar = infoBarEl;
    this.ctx     = canvasEl.getContext('2d');
    this.frameCount = 0;
    this.lastInfoBarStr = null;
    this.lastTerrain = null;

    // Set native resolution; CSS width:100% / height:auto handles display scaling
    this.canvas.width  = CANVAS_W;
    this.canvas.height = CANVAS_H;

    // Disable anti-aliasing so pixels stay crisp when scaled
    this.ctx.imageSmoothingEnabled = false;

    // Cache .game-layout ancestor — used to propagate data-terrain so CSS vars
    // cascade to all siblings (info bar, event panel, dashboard). V1/V2/V4.
    this.gameLayout = canvasEl.closest('.game-layout') || null;
  }

  // Bound rect helper — draws one logical pixel block
  _r(x, y, w, h, color) {
    if (x >= PW || y >= PH || x + w <= 0 || y + h <= 0) return;
    this.ctx.fillStyle = color;
    this.ctx.fillRect(
      Math.round(x) * SCALE,
      Math.round(y) * SCALE,
      Math.round(w) * SCALE,
      Math.round(h) * SCALE
    );
  }

  render(game, weatherData) {
    this.frameCount++;
    const r = this._r.bind(this);
    const ctx = this.ctx;

    if (!game || !game.route || game.route.length === 0) {
      // Clear to dark and show loading placeholder
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.fillStyle = '#6a8a6a';
      ctx.font = `${SCALE * 4}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText('Preparing journey...', CANVAS_W / 2, CANVAS_H / 2);
      return;
    }

    const wp         = game.getCurrentWaypoint();
    const terrain    = wp ? wp.terrain : 'plains';
    const isEvent    = (game.state === STATES.EVENT || game.state === STATES.RESULT)
                       && !!game.currentEvent;
    const weatherIcon = weatherData ? weatherData.icon : null;

    // Determine if terrain changed (for data-terrain CSS attribute)
    if (terrain !== this.lastTerrain) {
      this.lastTerrain = terrain;
    }

    // ── Draw scene ──────────────────────────────────────────────────────────
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    if (isEvent) {
      drawEventScene(r, game.currentEvent.perilType, this.frameCount);
    } else {
      drawTerrainScene(r, terrain, this.frameCount);
      drawWeather(r, weatherIcon, this.frameCount);
      drawVehicle(r, this.frameCount);
    }

    // ── Propagate data-terrain to canvas and game-layout parent ─────────────
    // V1: setting on game-layout makes CSS vars (--terrain-sky, --terrain-ground,
    // --terrain-text) cascade to all children: info bar, event panel, dashboard.
    const terrainAttr = isEvent ? `event-${game.currentEvent.perilType}` : terrain;
    this.canvas.dataset.terrain = terrainAttr;
    if (this.gameLayout) this.gameLayout.dataset.terrain = terrainAttr;

    // ── Compose day/night + weather into a single CSS filter ─────────────────
    // V3: composing here lets weather tints stack cleanly on top of time-of-day
    // effects. Previously these were separate CSS class filters that could not
    // be combined without a wrapper element.
    const phase = TIME_PHASES[
      Math.floor(game.day / DAYS_PER_PHASE) % TIME_PHASES.length
    ];
    const composed = [this._timeFilter(phase), this._weatherFilter(weatherIcon)]
      .filter(Boolean).join(' ');
    this.canvas.style.filter = composed || 'none';

    // ── Info bar ────────────────────────────────────────────────────────────
    this._updateInfoBar(game);
  }

  // V3: Day/night filter string — applied before weather tint (order matters in CSS filters)
  _timeFilter(phase) {
    switch (phase) {
      case 'dawn':  return 'sepia(35%) brightness(0.80) saturate(0.85)';
      case 'dusk':  return 'sepia(55%) brightness(0.72) hue-rotate(12deg) saturate(0.9)';
      case 'night': return 'brightness(0.28) saturate(0.5) hue-rotate(200deg)';
      default:      return '';
    }
  }

  // V3: Weather color tint — stacks on top of the day/night base
  _weatherFilter(weatherIcon) {
    switch (weatherIcon) {
      case 'rain':
      case 'drizzle': return 'brightness(0.82) saturate(0.88)';
      case 'storm':   return 'brightness(0.65) saturate(0.75)';
      case 'snow':    return 'brightness(1.08) saturate(0.62)';
      case 'heat':    return 'sepia(25%) hue-rotate(-18deg) brightness(1.04)';
      case 'mist':
      case 'fog':
      case 'wind':    return 'brightness(0.92) saturate(0.85)';
      default:        return '';
    }
  }

  _updateInfoBar(game) {
    const wp       = game.getCurrentWaypoint();
    const location = wp ? wp.name    : 'Unknown';
    const terrain  = wp ? wp.terrain : '???';
    const remaining = Math.max(
      0, Math.round(game.totalDistance - game.totalDistanceTraveled)
    );
    const progress = game.getProgress();
    const pct      = Math.round(progress * 100);
    const filled   = Math.round(progress * PROGRESS_BAR_LENGTH);
    const bar      =
      '[' +
      '='.repeat(Math.max(0, filled - 1)) +
      (filled > 0 ? '>' : ' ') +
      ' '.repeat(PROGRESS_BAR_LENGTH - filled) +
      ']';

    const str = `Day ${game.day} | ${location} (${terrain}) | ${remaining} mi remaining | ${bar} ${pct}%`;

    if (str !== this.lastInfoBarStr) {
      this.infoBar.textContent = str;
      this.lastInfoBarStr = str;
    }
  }
}
