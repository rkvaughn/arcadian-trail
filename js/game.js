import { getRoute, getTotalDistance } from '../data/routes.js';
import { createFamily, getFamilyPassives } from './characters.js';
import { travelTick } from './travel.js';
import { selectEvent, applyChoice } from './events.js';
import { computeSSPMultipliers, SSP_DEFS } from '../data/ssp.js';
import { getOriginDescription } from '../data/cities.js';

export const STATES = {
  TITLE: 'TITLE',
  SETUP: 'SETUP',
  TRAVELING: 'TRAVELING',
  EVENT: 'EVENT',
  DECISION: 'DECISION',
  RESULT: 'RESULT',
  MINIGAME: 'MINIGAME',
  WIN: 'WIN',
  LOSE: 'LOSE'
};

export class Game {
  constructor() {
    this.state = STATES.TITLE;
    this.resources = { fuel: 100, water: 100, food: 100, health: 100, morale: 100 };
    this.origin = null;
    this.destination = null;
    this.route = [];
    this.waypointIndex = 0;
    this.distanceToNextWaypoint = 0;
    this.totalDistance = 0;
    this.totalDistanceTraveled = 0;
    this.day = 0;
    this.family = [];
    this.familyPassives = {};
    this.inventory = [];
    this.currentEvent = null;
    this.lastResult = null;
    this.weatherRisk = null;
    this.journalEntries = [];
    this.recentPerilTypes = [];
    this.perilHistory = [];
    this.startBudget = 100;
    this.distanceTraveledToday = 0;
    this.year = 2050;
    this.ssp = 'SSP2-4.5';
    this.sspMultipliers = null;
    this.activeHazard = null; // { type, ticksRemaining, drainPerTick: { resource: amount } }
  }

  setState(newState) {
    this.state = newState;
  }

  /**
   * Configure a new journey. Called once from GameController.beginGame().
   *
   * @param {object} originCity     — city object from data/cities.js
   * @param {object} destCity       — city object from data/cities.js
   * @param {string} leaderName     — player-entered name
   * @param {string} leaderTrait    — trait id from js/characters.js
   * @param {number} familySize     — 3 | 4 | 5
   * @param {array}  selectedItems  — item definitions from data/items.js
   * @param {number} year           — 2050 | 2075 | 2100
   * @param {string} ssp            — 'SSP2-4.5' | 'SSP3-7.0' | 'SSP5-8.5'
   * @returns {{ success: true } | { error: string }}
   */
  setup(originCity, destCity, leaderName, leaderTrait, familySize, selectedItems, year, ssp) {
    this.origin = originCity;
    this.destination = destCity;
    this.year = year || 2050;
    this.ssp  = ssp  || 'SSP2-4.5';
    this.sspMultipliers = computeSSPMultipliers(this.ssp, this.year, originCity.id);
    this.route = getRoute(originCity.id, destCity.id);

    if (!this.route) {
      return { error: 'No route available between these cities.' };
    }

    this.totalDistance = getTotalDistance(this.route);
    this.waypointIndex = 0;
    this.distanceToNextWaypoint = this.route[1] ? this.route[1].dist : 0;
    this.totalDistanceTraveled = 0;
    this.day = 0;

    this.family = createFamily(leaderName, leaderTrait, familySize);
    this.familyPassives = getFamilyPassives(this.family);
    this.inventory = selectedItems || [];
    this.resources = { fuel: 100, water: 100, food: 100, health: 100, morale: 100 };
    this.currentEvent = null;
    this.lastResult = null;
    this.journalEntries = [];
    this.recentPerilTypes = [];
    this.perilHistory = [];
    this.activeHazard = null;

    const sspDef = SSP_DEFS[this.ssp];
    const originDesc = getOriginDescription(originCity, this.ssp);
    this.addJournal(`Day 1: The ${leaderName} family departs ${originCity.name} — ${this.year}, ${sspDef.shortName}. ${originDesc} Destination: ${destCity.name}.`);
    this.state = STATES.TRAVELING;

    return { success: true };
  }

  // Advance one day of travel
  travel() {
    if (this.state !== STATES.TRAVELING) return null;

    const hadHazard = !!this.activeHazard;
    const result = travelTick(this);

    // Log when an active hazard clears
    if (hadHazard && !this.activeHazard) {
      this.addJournal(`Day ${this.day}: The heatwave finally breaks.`);
    }

    if (result.arrived) {
      this.state = STATES.WIN;
      this.addJournal(`Day ${this.day}: Arrived at ${this.destination.name}! ${this.destination.description}`);
      return { type: 'arrived' };
    }

    if (result.gameOver) {
      this.state = STATES.LOSE;
      this.addJournal(`Day ${this.day}: ${result.gameOver}`);
      return { type: 'gameOver', reason: result.gameOver };
    }

    if (result.reachedWaypoint) {
      this.addJournal(`Day ${this.day}: Reached ${result.waypointName}. Terrain: ${result.terrain}.`);
    }

    if (result.triggerMiniGame) {
      this.state = STATES.MINIGAME;
      this.addJournal(`Day ${this.day}: A sudden storm forces a dash for shelter!`);
      return { type: 'minigame' };
    }

    if (result.triggerEvent) {
      const terrain = this.route[this.waypointIndex].terrain;
      this.currentEvent = selectEvent(terrain, this.weatherRisk, this.inventory, this.recentPerilTypes, this.sspMultipliers);
      this.recentPerilTypes.push(this.currentEvent.perilType);
      if (this.recentPerilTypes.length > 3) this.recentPerilTypes.shift();
      this.perilHistory.push(this.currentEvent.perilType);
      this.state = STATES.EVENT;
      this.addJournal(`Day ${this.day}: ${this.currentEvent.name}!`);
      return { type: 'event', event: this.currentEvent };
    }

    // Log roadside encounter if one fired
    if (result.encounter) {
      this.addJournal(`Day ${this.day}: ${result.encounter.text}`);
    }

    // Log party member death
    if (result.death) {
      this.addJournal(`Day ${this.day}: ${result.death.message}`);
    }

    return { type: 'travel', terrain: result.terrain, miles: result.milesPerDay, encounter: result.encounter, death: result.death };
  }

  // Player makes a choice during an event
  makeChoice(choiceIndex) {
    if (this.state !== STATES.EVENT || !this.currentEvent) return null;

    this.state = STATES.RESULT;
    const result = applyChoice(this, this.currentEvent, choiceIndex);
    this.lastResult = result;

    this.addJournal(`Day ${this.day}: ${result.narrative}`);

    // Set multi-tick hazard if the choice triggers one (S4)
    // Duration is scaled by SSP heatwave duration multiplier (Martinez-Villalobos et al. 2025)
    if (result.setsActiveHazard && this.sspMultipliers) {
      const duration = Math.max(1, Math.ceil(this.sspMultipliers.heatwaveDuration));
      this.activeHazard = {
        type: result.setsActiveHazard.type,
        ticksRemaining: duration,
        drainPerTick: result.setsActiveHazard.drainPerTick
      };
    }

    // Log party member death from event
    if (result.death) {
      this.addJournal(`Day ${this.day}: ${result.death.message}`);
    }

    // Check for game over after event
    const gameOver = this.checkGameOver();
    if (gameOver) {
      this.state = STATES.LOSE;
      this.addJournal(`Day ${this.day}: ${gameOver}`);
      return { type: 'gameOver', reason: gameOver, ...result };
    }

    return { type: 'result', ...result };
  }

  // Continue traveling after viewing event result or mini-game
  continueJourney() {
    if (this.state === STATES.RESULT || this.state === STATES.MINIGAME) {
      this.currentEvent = null;
      this.lastResult = null;
      this.state = STATES.TRAVELING;
      return true;
    }
    return false;
  }

  checkGameOver() {
    const r = this.resources;
    if (r.fuel <= 0) return 'Out of fuel. Stranded on the road.';
    if (r.water <= 0) return 'No water left. Dehydration takes hold.';
    if (r.food <= 0) return 'Starvation. The family can go no further.';
    if (r.health <= 0) return 'Too sick and injured to continue.';
    if (r.morale <= 0) return 'Despair wins. The family gives up the journey.';
    return null;
  }

  addJournal(entry) {
    this.journalEntries.push(entry);
  }

  getProgress() {
    return this.totalDistance > 0
      ? Math.min(1, this.totalDistanceTraveled / this.totalDistance)
      : 0;
  }

  getCurrentWaypoint() {
    return this.route[this.waypointIndex] || null;
  }

  getNextWaypoint() {
    return this.route[this.waypointIndex + 1] || null;
  }

  getResources() {
    return { ...this.resources };
  }
}
