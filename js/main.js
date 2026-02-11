import { Game, STATES } from './game.js';
import { ScreenManager } from '../ui/screens.js';
import { AsciiRenderer } from '../ui/asciiRenderer.js';
import { Dashboard } from '../ui/dashboard.js';
import { EventPanel } from '../ui/eventPanel.js';
import { Logger } from '../ui/logger.js';
import { fetchWeather, getWeatherRisk, getWeatherNarrative } from './weather.js';
import { calculateScore } from './scoring.js';
import { getRandomNarrative } from '../data/narratives.js';

class GameController {
  constructor() {
    this.game = new Game();
    this.travelInterval = null;
    this.renderInterval = null;
    this.travelSpeed = 1200; // ms per day
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

    this.screens.initTitle();
  }

  beginGame(origin, dest, leaderName, leaderTrait, familySize, items) {
    const result = this.game.setup(origin, dest, leaderName, leaderTrait, familySize, items);

    if (result.error) {
      alert(result.error);
      return;
    }

    this.dashboard.update(this.game.resources);
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

      switch (result.type) {
        case 'travel': {
          const narrative = getRandomNarrative(result.terrain);
          if (narrative && this.game.day % 2 === 0) {
            this.logger.log(narrative, 'info');
          }
          break;
        }

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
        if (this.game.day % 3 === 0) {
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

    this.dashboard.update(this.game.resources);

    if (result.type === 'gameOver') {
      this.eventPanel.showResult(result);
      this.logger.log(`${result.narrative}`, 'danger');
      setTimeout(() => this.endGame(false), 3000);
      return;
    }

    this.eventPanel.showResult(result);
    this.logger.log(result.narrative, 'info');
  }

  startRenderLoop() {
    if (this.renderInterval) clearInterval(this.renderInterval);
    this.renderInterval = setInterval(() => {
      this.asciiRenderer.render(this.game, this.currentWeather);
    }, 250);
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
