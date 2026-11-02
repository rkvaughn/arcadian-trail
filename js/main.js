import { Game, STATES } from './game.js';
import { ScreenManager } from '../ui/screens.js';
import { PixelRenderer } from '../ui/pixelRenderer.js';
import { Dashboard } from '../ui/dashboard.js';
import { EventPanel } from '../ui/eventPanel.js';
import { Logger } from '../ui/logger.js';
import { MapOverlay } from '../ui/mapOverlay.js';
import { ShedDash, shedModeFor } from '../ui/shedDash.js';
import { challengeOdds, minigamePerks, consumeMinigameUses } from './supplies.js';

const MINIGAME_KIND = { SHELTER: 'shed', FROGGER: 'frogger', BARRICADE: 'barricade' };
import { BarricadeRunner } from '../ui/barricadeRunner.js';
import { FroggerDash } from '../ui/froggerDash.js';
import { fetchWeather, getWeatherRisk, getWeatherNarrative } from './weather.js';
import { calculateScore } from './scoring.js';
import { getRandomNarrative } from '../data/narratives.js';

const MAP_RENDER_INTERVAL_MS = 250; // progress map changes slowly; scene renders every frame
const TRAVEL_SPEED_MS = 2000;
const WEATHER_FETCH_INTERVAL = 3; // days
const EVENT_RESULT_DELAY_MS = 1500; // pause before showing continue button

class GameController {
  constructor() {
    this.game = new Game();
    this.travelInterval = null;
    this.renderLoopToken = 0;   // bumped on start/stop; stale rAF callbacks exit
    this.renderFrameId = null;
    this.travelSpeed = TRAVEL_SPEED_MS;
    this.currentWeather = null;

    this.screens = new ScreenManager((origin, dest, name, trait, size, items, year, ssp) => {
      this.beginGame(origin, dest, name, trait, size, items, year, ssp);
    });

    this.asciiRenderer = new PixelRenderer(
      document.getElementById('asciiDisplay'),
      document.getElementById('asciiInfoBar')
    );
    this.dashboard = new Dashboard('dashboard');
    this.logger = new Logger('log-entries');

    this.eventPanel = new EventPanel('event-panel', (choice) => {
      this.handleEventChoice(choice);
    });

    this.progressMap = new MapOverlay(document.getElementById('progressMap'));
    this.familyRoster = document.getElementById('family-roster');

    const displayEl = document.getElementById('asciiDisplay');
    const infoBarEl = document.getElementById('asciiInfoBar');
    const miniGameEl = document.getElementById('miniGameDisplay');
    this.shedDash = new ShedDash(displayEl, infoBarEl);
    this.barricadeRunner = new BarricadeRunner(miniGameEl, infoBarEl);
    this.froggerDash = new FroggerDash(displayEl, infoBarEl);

    this.screens.initTitle();
  }

  updateRoster() {
    if (!this.game.family.length) {
      this.familyRoster.innerHTML = '';
      return;
    }
    const members = this.game.family.map(m => {
      const cls = !m.alive ? 'roster-member dead' : m.isLeader ? 'roster-member roster-leader' : 'roster-member';
      const icon = m.isLeader ? '\u2605 ' : '';
      const status = !m.alive ? ' \u2620' : '';
      return `<span class="${cls}">${icon}${m.name}${status}</span>`;
    }).join('');
    this.familyRoster.innerHTML = `<div class="roster-title">Party</div><div class="roster-list">${members}</div>`;
  }

  beginGame(origin, dest, leaderName, leaderTrait, familySize, items, year, ssp) {
    const result = this.game.setup(origin, dest, leaderName, leaderTrait, familySize, items, year, ssp);

    if (result.error) {
      alert(result.error);
      return;
    }

    this.dashboard.update(this.game.resources);
    this.dashboard.setScenario(this.game.ssp, this.game.year);
    this.updateRoster();
    this.logger.clear();
    this.logger.log(`Departing ${origin.name} for ${dest.name}...`, 'info');
    this.fetchWeatherForWaypoint();
    this.startTravelLoop();
    this.startRenderLoop();
  }

  async fetchWeatherForWaypoint() {
    const wp = this.game.getCurrentWaypoint();
    if (!wp) return;

    const weather = await fetchWeather(wp.lat, wp.lon);
    if (weather) {
      this.currentWeather = weather;
      this.game.weatherRisk = getWeatherRisk(weather);

      const narrative = getWeatherNarrative(weather);
      if (narrative) {
        this.logger.log(narrative, 'info');
      }
    }
  }

  startTravelLoop() {
    if (this.travelInterval) clearInterval(this.travelInterval);

    this.travelInterval = setInterval(() => {
      if (this.game.state !== STATES.TRAVELING) return;

      const result = this.game.travel();
      if (!result) return;

      this.dashboard.update(this.game.resources);
      this.dashboard.setActiveHazard(this.game.activeHazard);
      this.updateRoster();

      switch (result.type) {
        case 'travel': {
          if (result.death) {
            this.logger.log(`\u2620\uFE0F ${result.death.message}`, 'danger');
          }
          if (result.encounter) {
            // Encounters get their own log style
            const hasPositive = Object.values(result.encounter.effects).some(v => v > 0);
            const hasNegative = Object.values(result.encounter.effects).some(v => v < 0);
            const logType = hasNegative ? 'danger' : hasPositive ? 'success' : 'info';
            this.logger.log(result.encounter.text, logType);
          } else if (!result.death) {
            const narrative = getRandomNarrative(result.terrain);
            if (narrative && this.game.day % 2 === 0) {
              this.logger.log(narrative, 'info');
            }
          }
          break;
        }

        case 'minigame':
          this._launchMiniGame('SHELTER', this._shedPerilFromConditions());
          break;

        case 'event':
          clearInterval(this.travelInterval);
          this.travelInterval = null;
          this.eventPanel.show(result.event, {
            waypoint: this.game.getCurrentWaypoint(),
            odds: result.event.choices.map(c => c.minigame
              ? { minigame: true, labels: minigamePerks(this.game, MINIGAME_KIND[c.minigame],
                  shedModeFor(result.event.perilType, result.event.id) || undefined).labels }
              : challengeOdds(this.game, result.event, c)),
          });
          this.logger.log(`EVENT: ${result.event.name}`, 'event');
          break;

        case 'waypoint':
          clearInterval(this.travelInterval);
          this.travelInterval = null;
          this.eventPanel.showWaypoint(
            result.waypointName,
            result.nextTerrain,
            (choice) => {
              this.game.chooseRoute(choice);
              this.startTravelLoop();
            }
          );
          this.logger.log(`Reached ${result.waypointName} — choose your route.`, 'info');
          break;

        case 'arrived':
          clearInterval(this.travelInterval);
          this.travelInterval = null;
          this.logger.log('ARRIVED! Journey complete!', 'success');
          setTimeout(() => this.endGame(true), 1500);
          break;

        case 'gameOver':
          clearInterval(this.travelInterval);
          this.travelInterval = null;
          this.logger.log(`GAME OVER: ${result.reason}`, 'danger');
          setTimeout(() => this.endGame(false), 2000);
          break;
      }

      // Fetch weather when reaching a new waypoint
      if (result.type === 'travel' || result.type === 'event') {
        // Only re-fetch occasionally (every 3 days or on new waypoint)
        if (this.game.day % WEATHER_FETCH_INTERVAL === 0) {
          this.fetchWeatherForWaypoint();
        }
      }
    }, this.travelSpeed);
  }

  handleEventChoice(choice) {
    if (choice === 'continue') {
      this.game.continueJourney();
      this.startTravelLoop();
      return;
    }

    const result = this.game.makeChoice(choice);
    if (!result) return;

    // Choice triggers a mini-game instead of immediate effects
    if (result.minigame) {
      this.eventPanel.hide();
      const ev = this.game.currentEvent;
      const peril = ev && shedModeFor(ev.perilType, ev.id);
      this._launchMiniGame(result.minigame, peril
        ? { peril, variant: ev.id }
        : this._shedPerilFromConditions());
      return;
    }

    this.dashboard.update(this.game.resources);
    this.dashboard.setActiveHazard(this.game.activeHazard);
    this.updateRoster();

    if (result.type === 'gameOver') {
      this.eventPanel.showResult(result, EVENT_RESULT_DELAY_MS);
      this.logger.log(`${result.narrative}`, 'danger');
      setTimeout(() => this.endGame(false), 3000);
      return;
    }

    this.eventPanel.showResult(result, EVENT_RESULT_DELAY_MS);
    this.logger.log(result.narrative, 'info');

    if (result.death) {
      this.logger.log(`\u2620\uFE0F ${result.death.message}`, 'danger');
    }
  }

  /**
   * Peril for a Shed Dash that no event chose (random roadside trigger):
   * live weather first, then the terrain the family is crossing.
   */
  _shedPerilFromConditions() {
    const w = this.game.weatherRisk || {};
    if (w.wildfire > 0) return { peril: 'fire', variant: 'wildfire' };
    if (w.heat > 0) return { peril: 'heat', variant: 'heatwave' };
    if (w.hurricane > 0) return { peril: 'wind', variant: 'hurricane' };
    if (w.tornado > 0) return { peril: 'wind', variant: 'tornado' };
    if (w.flood > 0) return { peril: 'wind', variant: 'flood' };
    const terrain = this.game.getCurrentWaypoint()?.terrain;
    if (terrain === 'desert') return { peril: 'heat', variant: 'heatwave' };
    if (['forest', 'mountain', 'hills', 'valley'].includes(terrain)) return { peril: 'fire', variant: 'wildfire' };
    return { peril: 'wind', variant: null };
  }

  _launchMiniGame(type, shed = {}) {
    clearInterval(this.travelInterval);
    this.travelInterval = null;
    this.stopRenderLoop();
    this.game.state = STATES.MINIGAME;

    const progress = this.game.getProgress();
    const callback = (mgResult) => this._onMiniGameComplete(mgResult);
    const { perks, labels } = minigamePerks(this.game, MINIGAME_KIND[type] || 'shed', shed.peril);
    if (labels.length) this.logger.log(`Supplies ready: ${labels.join(' · ')}`, 'info');

    const canvasEl = document.getElementById('asciiDisplay');
    const miniGameEl = document.getElementById('miniGameDisplay');

    if (type === 'FROGGER') {
      // Frogger uses the canvas directly
      canvasEl.style.display = '';
      miniGameEl.style.display = 'none';
      this.logger.log('FORD THE RIVER! Ride the logs — don\'t fall in!', 'event');
      this.froggerDash.start(progress, callback, this.currentWeather, perks);
    } else if (type === 'BARRICADE') {
      // Barricade draws pixel art on the shared canvas, like Frogger
      canvasEl.style.display = '';
      miniGameEl.style.display = 'none';
      this.logger.log('CRASH THE BARRICADE! Dodge obstacles and break free!', 'event');
      this.barricadeRunner.start(progress, callback, perks);
    } else {
      // Shed Dash draws pixel art on the shared canvas, like Frogger
      canvasEl.style.display = '';
      miniGameEl.style.display = 'none';
      this.logger.log('RUN FOR THE SHED! Get the family to cover!', 'event');
      this.shedDash.start(progress, callback, { ...shed, family: this.game.family, perks });
    }
  }

  _onMiniGameComplete(result) {
    // Spend supplies the mini-game actually used
    consumeMinigameUses(this.game, result.used);
    // Restore canvas display (in case an ASCII mini-game was showing the pre element)
    const canvasEl = document.getElementById('asciiDisplay');
    const miniGameEl = document.getElementById('miniGameDisplay');
    canvasEl.style.display = '';
    miniGameEl.style.display = 'none';

    // Apply effects to resources
    if (result.effects) {
      for (const [resource, value] of Object.entries(result.effects)) {
        if (resource in this.game.resources) {
          this.game.resources[resource] = Math.max(0, Math.min(100, this.game.resources[resource] + value));
        }
      }
    }

    // Set lastResult so the RESULT state has something to show
    this.game.lastResult = result;
    this.game.state = STATES.RESULT;

    // Update UI
    this.dashboard.update(this.game.resources);
    this.updateRoster();

    // Log outcome
    this.logger.log(result.narrative, result.survived ? 'success' : 'danger');
    this.game.addJournal(`Day ${this.game.day}: ${result.narrative}`);

    // Show result in event panel (reuse existing result card UI)
    this.eventPanel.showResult(result, EVENT_RESULT_DELAY_MS);

    // Restart render loop so normal ASCII display resumes behind the result card
    this.startRenderLoop();

    // Check for game over from mini-game damage
    const gameOver = this.game.checkGameOver();
    if (gameOver) {
      this.game.state = STATES.LOSE;
      this.game.addJournal(`Day ${this.game.day}: ${gameOver}`);
      this.logger.log(`GAME OVER: ${gameOver}`, 'danger');
      setTimeout(() => this.endGame(false), 3000);
    }
  }

  startRenderLoop() {
    this.stopRenderLoop();
    const token = this.renderLoopToken;
    let lastMapRender = -Infinity;
    const loop = (now) => {
      if (token !== this.renderLoopToken) return;
      this.asciiRenderer.render(this.game, this.currentWeather, now);
      if (now - lastMapRender >= MAP_RENDER_INTERVAL_MS) {
        this.progressMap.render(this.game);
        lastMapRender = now;
      }
      this.renderFrameId = requestAnimationFrame(loop);
    };
    this.renderFrameId = requestAnimationFrame(loop);
  }

  stopRenderLoop() {
    this.renderLoopToken++;
    if (this.renderFrameId !== null) cancelAnimationFrame(this.renderFrameId);
    this.renderFrameId = null;
  }

  endGame(isWin) {
    if (this.travelInterval) clearInterval(this.travelInterval);
    this.stopRenderLoop();

    const score = calculateScore(this.game, isWin);
    this.screens.showEnd(isWin, this.game, score);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new GameController();
});
