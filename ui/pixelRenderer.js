/**
 * pixelRenderer.js — Canvas renderer for the game screen in Arcadian Trail.
 *
 * Draws at the canvas's native 320×180 (CSS scales it up with crisp pixels):
 *   - travel: the driving scene (ui/cutscenes/travel/), with terrain variants,
 *     time-of-day palettes and in-scene weather
 *   - EVENT / RESULT: the event's cut scene (ui/cutscenes/)
 *
 * Public interface:
 *   new PixelRenderer(canvasEl, infoBarEl)
 *   renderer.render(game, weatherData, nowMs?)
 *
 * Called every animation frame (requestAnimationFrame) by js/main.js.
 */

import { STATES } from '../js/game.js';
import { W as CANVAS_W, H as CANVAS_H } from './cutscenes/kit.js';
import { CutscenePlayer } from './cutscenes/director.js';
import { eventSceneFor, bannerFor } from './cutscenes/index.js';
import { TravelRenderer, TERRAINS } from './cutscenes/travel/index.js';

const PROGRESS_BAR_LENGTH = 20;

export class PixelRenderer {
  constructor(canvasEl, infoBarEl) {
    this.canvas  = canvasEl;
    this.infoBar = infoBarEl;
    this.ctx     = canvasEl.getContext('2d');
    this.lastInfoBarStr = null;
    this.lastTerrainAttr = null;
    this.wasEvent = false;

    // Set native resolution; CSS width:100% / height:auto handles display scaling
    this.canvas.width  = CANVAS_W;
    this.canvas.height = CANVAS_H;
    this.ctx.imageSmoothingEnabled = false;
    // Lighting is drawn in-scene (palettes per time of day and weather), so the
    // old CSS filter tint is retired.
    this.canvas.style.filter = 'none';

    // Cache .game-layout ancestor — used to propagate data-terrain so CSS vars
    // cascade to all siblings (info bar, event panel, dashboard). V1/V2/V4.
    this.gameLayout = canvasEl.closest('.game-layout') || null;

    this.cutscene = new CutscenePlayer();
    this.travel = new TravelRenderer(TERRAINS);
  }

  render(game, weatherData, nowMs = performance.now()) {
    const ctx = this.ctx;

    if (!game || !game.route || game.route.length === 0) {
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.fillStyle = '#6a8a6a';
      ctx.font = '16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Preparing journey...', CANVAS_W / 2, CANVAS_H / 2);
      return;
    }

    const wp      = game.getCurrentWaypoint();
    const terrain = wp ? wp.terrain : 'plains';
    const isEvent = (game.state === STATES.EVENT || game.state === STATES.RESULT)
                    && !!game.currentEvent;

    if (isEvent) {
      // A new event (after travelling) restarts the scene and its intro; the
      // RESULT card for the same event keeps playing the scene it started.
      const ev = game.currentEvent;
      this.cutscene.play(ev, eventSceneFor(ev.perilType),
        { family: game.family, eventId: ev.id, perilType: ev.perilType }, bannerFor(ev));
      this.cutscene.render(ctx, nowMs);
    } else {
      this.cutscene.reset();
      // Coming back from a cut scene: dissolve from its last frame
      if (this.wasEvent) this.travel.dissolveFrom(this.canvas);
      this.travel.render(ctx, nowMs, {
        terrain,
        variantSeed: game.waypointIndex || 0,   // each stretch of road gets its own look
        day: game.day || 0,
        weather: weatherData ? weatherData.icon : 'clear',
        moving: game.state === STATES.TRAVELING,
        family: game.family,
        place: wp ? wp.name : '',
      });
    }
    this.wasEvent = isEvent;

    // ── Propagate data-terrain to canvas and game-layout parent ─────────────
    // V1: setting on game-layout makes CSS vars (--terrain-sky, --terrain-ground,
    // --terrain-text) cascade to all children: info bar, event panel, dashboard.
    // Only touch the DOM on change — this runs every animation frame.
    const terrainAttr = isEvent ? `event-${game.currentEvent.perilType}` : terrain;
    if (terrainAttr !== this.lastTerrainAttr) {
      this.canvas.dataset.terrain = terrainAttr;
      if (this.gameLayout) this.gameLayout.dataset.terrain = terrainAttr;
      this.lastTerrainAttr = terrainAttr;
    }

    this._updateInfoBar(game);
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
