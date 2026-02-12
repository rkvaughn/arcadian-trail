import { getFamilyPassives } from './characters.js';
import { encounterDefs, ENCOUNTER_CHANCE } from '../data/encounterDefs.js';

// Base burn rates per day of travel
const BASE_RATES = {
  fuel: -4,
  water: -3,
  food: -3,
  health: -1,
  morale: -1.5
};

// Terrain modifiers (multiplier on burn rates — higher = harsher)
const TERRAIN_MODIFIERS = {
  coastal:  { fuel: 1.0, water: 1.2, food: 1.0, health: 1.0, morale: 1.0 },
  wetland:  { fuel: 1.3, water: 0.8, food: 1.0, health: 1.2, morale: 1.1 },
  forest:   { fuel: 1.1, water: 0.9, food: 0.8, health: 1.0, morale: 0.8 },
  plains:   { fuel: 0.9, water: 1.1, food: 1.0, health: 1.0, morale: 1.0 },
  desert:   { fuel: 1.1, water: 1.8, food: 1.0, health: 1.3, morale: 1.3 },
  mountain: { fuel: 1.4, water: 1.0, food: 1.1, health: 1.1, morale: 0.9 },
  hills:    { fuel: 1.2, water: 1.0, food: 1.0, health: 1.0, morale: 0.9 },
  urban:    { fuel: 1.2, water: 1.0, food: 0.9, health: 0.9, morale: 1.2 },
  valley:   { fuel: 0.9, water: 1.0, food: 0.9, health: 1.0, morale: 0.9 }
};

// Miles traveled per day (base)
const BASE_MILES_PER_DAY = 120;

// Event trigger base probability per travel tick
const EVENT_BASE_CHANCE = 0.30;

export function travelTick(gameState) {
  const { resources, route, waypointIndex, family, inventory, weatherRisk } = gameState;
  const currentWaypoint = route[waypointIndex];
  const nextWaypoint = route[waypointIndex + 1];

  if (!nextWaypoint) {
    return { arrived: true };
  }

  const terrain = currentWaypoint.terrain;
  const terrainMod = TERRAIN_MODIFIERS[terrain] || TERRAIN_MODIFIERS.plains;
  const familyPassives = getFamilyPassives(family);

  // Calculate item passives
  const itemPassives = getItemPassives(inventory);

  // Apply resource burn
  const changes = {};
  for (const [resource, baseRate] of Object.entries(BASE_RATES)) {
    let rate = baseRate;

    // Terrain modifier
    rate *= terrainMod[resource] || 1;

    // Family trait modifiers
    if (resource === 'fuel') rate *= familyPassives.fuelDrain;
    if (resource === 'health') rate *= familyPassives.healthDrain;

    // Item passive modifiers (multiplier type)
    if (itemPassives[resource] && typeof itemPassives[resource] === 'number' && itemPassives[resource] < 1) {
      rate *= itemPassives[resource];
    }

    // Weather makes things worse
    if (weatherRisk && weatherRisk.severity) {
      rate *= (1 + weatherRisk.severity * 0.2);
    }

    changes[resource] = rate;
    resources[resource] = Math.max(0, Math.min(100, resources[resource] + rate));
  }

  // Apply item flat bonuses per day (e.g., solar panel +1 morale)
  if (itemPassives.morale && itemPassives.morale >= 1) {
    resources.morale = Math.min(100, resources.morale + itemPassives.morale);
  }

  // Calculate distance traveled today
  let milesPerDay = BASE_MILES_PER_DAY * familyPassives.travelSpeed;
  if (terrain === 'mountain') milesPerDay *= 0.7;
  if (terrain === 'desert') milesPerDay *= 0.85;
  if (terrain === 'wetland') milesPerDay *= 0.8;

  gameState.distanceTraveledToday = milesPerDay;
  gameState.distanceToNextWaypoint -= milesPerDay;
  gameState.totalDistanceTraveled += milesPerDay;
  gameState.day += 1;

  // Check if we reached next waypoint
  let reachedWaypoint = false;
  if (gameState.distanceToNextWaypoint <= 0) {
    gameState.waypointIndex += 1;
    reachedWaypoint = true;

    // Set distance to the NEXT waypoint after this one
    const newNext = route[gameState.waypointIndex + 1];
    if (newNext) {
      gameState.distanceToNextWaypoint = newNext.dist;
    } else {
      // We've reached the final destination
      return { arrived: true, changes, reachedWaypoint: true, waypointName: nextWaypoint.name };
    }
  }

  // Check for event trigger
  let eventChance = EVENT_BASE_CHANCE;
  if (weatherRisk && weatherRisk.eventBoost) {
    eventChance += weatherRisk.eventBoost;
  }
  // Radio item reduces negative event chance slightly
  if (itemPassives.positiveBoost) {
    eventChance *= 0.9;
  }
  const triggerEvent = Math.random() < eventChance;

  // Check for roadside encounter (non-modal, minor effects)
  let encounter = null;
  if (!triggerEvent && Math.random() < ENCOUNTER_CHANCE) {
    encounter = selectEncounter(terrain);
    if (encounter) {
      for (const [resource, value] of Object.entries(encounter.effects)) {
        if (resource in resources) {
          resources[resource] = Math.max(0, Math.min(100, resources[resource] + value));
        }
      }
    }
  }

  // Check for game over
  const gameOver = checkGameOver(resources);

  return {
    arrived: false,
    changes,
    triggerEvent,
    encounter,
    reachedWaypoint,
    waypointName: reachedWaypoint ? nextWaypoint.name : currentWaypoint.name,
    terrain,
    milesPerDay,
    gameOver
  };
}

function getItemPassives(inventory) {
  const passives = {};
  for (const item of inventory) {
    if (item.passive) {
      for (const [key, value] of Object.entries(item.passive)) {
        if (key in passives) {
          if (typeof value === 'number' && value < 1) {
            passives[key] = (passives[key] || 1) * value;
          } else {
            passives[key] = (passives[key] || 0) + value;
          }
        } else {
          passives[key] = value;
        }
      }
    }
  }
  return passives;
}

function selectEncounter(terrain) {
  // Filter to encounters that match this terrain (empty terrain array = any terrain)
  const pool = encounterDefs.filter(
    e => e.terrain.length === 0 || e.terrain.includes(terrain)
  );
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

function checkGameOver(resources) {
  if (resources.fuel <= 0) return 'Out of fuel. Stranded on the road.';
  if (resources.water <= 0) return 'No water left. Dehydration takes hold.';
  if (resources.food <= 0) return 'Starvation. The family can go no further.';
  if (resources.health <= 0) return 'Too sick and injured to continue.';
  if (resources.morale <= 0) return 'Despair wins. The family gives up the journey.';
  return null;
}
