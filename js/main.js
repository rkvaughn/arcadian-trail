import { Game, STATES } from './game.js';
import { ScreenManager } from '../ui/screens.js';
import { AsciiRenderer } from '../ui/asciiRenderer.js';
import { Dashboard } from '../ui/dashboard.js';
import { EventPanel } from '../ui/eventPanel.js';
import { Logger } from '../ui/logger.js';
import { ProgressMap } from '../ui/progressMap.js';
import { ShelterDash } from '../ui/shelterDash.js';
import { BarricadeRunner } from '../ui/barricadeRunner.js';
import { fetchWeather, getWeatherRisk, getWeatherNarrative } from './weather.js';
import { calculateScore } from './scoring.js';
import { getRandomNarrative } from '../data/narratives.js';

const RENDER_INTERVAL_MS = 250;
const TRAVEL_SPEED_MS = 2000;
const WEATHER_FETCH_INTERVAL = 3; // days
const EVENT_RESULT_DELAY_MS = 1500; // pause before showing continue button

class GameController {
  constructor() {
    this.game = new Game();
    this.travelInterval = null;
    this.renderInterval = null;
    this.travelSpeed = TRAVEL_SPEED_MS;
    this.currentWeather = null;

    this.screens = new ScreenManager((origin, dest, name, trait, size, items) => {
      this.beginGame(origin, dest, name, trait, size, items);
    });

    this.asciiRenderer = new AsciiRenderer(
      document.getElementById('asciiDisplay'),
      document.getElementById('asciiInfoBar')
    );
    this.dashboard = new Dashboard('dashboard');
    this.logger = new Logger('log-entries');

    this.eventPanel = new EventPanel('event-panel', (choice) => {
      this.handleEventChoice(choice);
    });

    this.progressMap = new ProgressMap(document.getElementById('progressMap'));
    this.familyRoster = document.getElementById('family-roster');

    const displayEl = document.getElementById('asciiDisplay');
    const infoBarEl = document.getElementById('asciiInfoBar');
    this.shelterDash = new ShelterDash(displayEl, infoBarEl);
    this.barricadeRunner = new BarricadeRunner(displayEl, infoBarEl);

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

  beginGame(origin, dest, leaderName, leaderTrait, familySize, items) {
    const result = this.game.setup(origin, dest, leaderName, leaderTrait, familySize, items);

    if (result.error) {
      alert(result.error);
      return;
    }

    this.dashboard.update(this.game.resources);
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
          this._launchMiniGame('SHELTER');
          break;

        case 'event':
          clearInterval(this.travelInterval);
          this.travelInterval = null;
          this.eventPanel.show(result.event);
          this.logger.log(`EVENT: ${result.event.name}`, 'event');
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
      this._launchMiniGame(result.minigame);
      return;
    }

    this.dashboard.update(this.game.resources);
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

  _launchMiniGame(type) {
    clearInterval(this.travelInterval);
    this.travelInterval = null;
    clearInterval(this.renderInterval);
    this.renderInterval = null;
    this.game.state = STATES.MINIGAME;

    const progress = this.game.getProgress();
    const callback = (mgResult) => this._onMiniGameComplete(mgResult);

    if (type === 'BARRICADE') {
      this.logger.log('CRASH THE BARRICADE! Dodge obstacles and break free!', 'event');
      this.barricadeRunner.start(progress, callback);
    } else {
      this.logger.log('SHELTER DASH! Find shelter before the storm hits!', 'event');
      this.shelterDash.start(progress, callback, this.game.weatherRisk);
    }
  }

  _onMiniGameComplete(result) {
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
    if (this.renderInterval) clearInterval(this.renderInterval);
    this.renderInterval = setInterval(() => {
      this.asciiRenderer.render(this.game, this.currentWeather);
      this.progressMap.render(this.game);
    }, RENDER_INTERVAL_MS);
  }

  endGame(isWin) {
    if (this.travelInterval) clearInterval(this.travelInterval);
    if (this.renderInterval) clearInterval(this.renderInterval);

    const score = calculateScore(this.game, isWin);
    this.screens.showEnd(isWin, this.game, score);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new GameController();
});
