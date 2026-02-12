import { eventDefs } from '../data/eventDefs.js';

// Select an event based on terrain, weather, and randomness
// recentPerilTypes: last 3 peril types to suppress repeats
export function selectEvent(terrain, weatherRisk, inventory, recentPerilTypes = []) {
  const weights = [];
  let totalWeight = 0;

  for (const event of eventDefs) {
    let weight = event.baseProbability;

    // Suppress recently-seen peril types (most recent = hardest penalty)
    const lastIdx = recentPerilTypes.lastIndexOf(event.perilType);
    if (lastIdx !== -1) {
      const recency = recentPerilTypes.length - lastIdx; // 1 = most recent, 2 = two ago, etc.
      weight *= recency === 1 ? 0.05 : recency === 2 ? 0.3 : 0.6;
    }

    // Terrain bonus
    if (event.terrainBonus.includes(terrain)) {
      weight *= 1.8;
    }

    // Weather risk boosts
    if (weatherRisk) {
      if (event.perilType === 'heat' && weatherRisk.heat) {
        weight *= (1 + weatherRisk.heat);
      }
      if (event.perilType === 'flood' && weatherRisk.flood) {
        weight *= (1 + weatherRisk.flood);
      }
      if (event.perilType === 'wildfire' && weatherRisk.wildfire) {
        weight *= (1 + weatherRisk.wildfire);
      }
      if (event.perilType === 'tornado' && weatherRisk.tornado) {
        weight *= (1 + weatherRisk.tornado);
      }
      if (event.perilType === 'hurricane' && weatherRisk.hurricane) {
        weight *= (1 + weatherRisk.hurricane);
      }
    }

    // Radio item boosts positive events
    const hasRadio = inventory.some(item => item.id === 'radio');
    if (hasRadio && event.perilType === 'positive') {
      weight *= 1.3;
    }

    weights.push({ event, weight });
    totalWeight += weight;
  }

  // Weighted random selection
  let roll = Math.random() * totalWeight;
  for (const { event, weight } of weights) {
    roll -= weight;
    if (roll <= 0) return event;
  }

  // Fallback
  return eventDefs[0];
}

// Apply the chosen outcome to game state
export function applyChoice(gameState, event, choiceIndex) {
  const choice = event.choices[choiceIndex];
  if (!choice) return { narrative: 'Nothing happens.', effects: {} };

  const outcome = choice.outcomes;
  const effects = { ...outcome.effects };

  // Check for item bonus — show itemNarrative when item helps
  let usedItem = false;
  if (outcome.itemRequired) {
    const hasItem = gameState.inventory.some(item => item.id === outcome.itemRequired);
    if (hasItem && outcome.itemBonus) {
      usedItem = true;
      for (const [resource, value] of Object.entries(outcome.itemBonus)) {
        effects[resource] = (effects[resource] || 0) + value;
      }
    }
  }

  // Apply supply bonus from resourceful trait
  const isPositive = event.perilType === 'positive';
  if (isPositive && gameState.familyPassives && gameState.familyPassives.supplyBonus > 1) {
    for (const [resource, value] of Object.entries(effects)) {
      if (value > 0) {
        effects[resource] = Math.round(value * gameState.familyPassives.supplyBonus);
      }
    }
  }

  // Apply effects to resources
  for (const [resource, value] of Object.entries(effects)) {
    if (resource in gameState.resources) {
      gameState.resources[resource] = Math.max(0, Math.min(100, gameState.resources[resource] + value));
    }
  }

  const narrative = (usedItem && outcome.itemNarrative)
    ? outcome.itemNarrative
    : outcome.narrative;

  // Severe health damage from events can kill a party member
  const death = checkEventDeath(gameState, effects, event.perilType);

  return {
    narrative,
    death,
    effects
  };
}

// Event death causes keyed by perilType
const EVENT_DEATH_CAUSES = {
  wildfire:       ['was caught in the flames.', 'didn\'t make it through the fire.'],
  hurricane:      ['was swept away by the storm.', 'was lost in the hurricane.'],
  flood:          ['drowned in the floodwaters.', 'was swept away by the current.'],
  heat:           ['died of heatstroke.', 'succumbed to the heat.'],
  tornado:        ['was killed by flying debris.', 'was taken by the tornado.'],
  infrastructure: ['was crushed by falling debris.', 'died in the collapse.'],
  health:         ['has died of dysentery.', 'succumbed to illness.', 'didn\'t survive the sickness.'],
  mechanical:     ['was killed in the accident.', 'died from injuries in the wreck.'],
  social:        ['was killed in the confrontation.', 'didn\'t survive the encounter.'],
};

// Check if a severe event outcome kills a party member
function checkEventDeath(gameState, effects, perilType) {
  if (!effects.health || effects.health >= -8) return null; // only severe health hits

  const alive = gameState.family.filter(m => m.alive);
  if (alive.length <= 1) return null; // don't kill the last member

  // Probability scales with damage severity: -10 → 15%, -15 → 30%, -20 → 45%
  const damage = Math.abs(effects.health);
  const deathChance = (damage - 8) * 0.03;

  if (Math.random() > deathChance) return null;

  // Pick a non-leader victim
  const nonLeaders = alive.filter(m => !m.isLeader);
  if (nonLeaders.length === 0) return null;

  const victim = nonLeaders[Math.floor(Math.random() * nonLeaders.length)];
  victim.alive = false;
  victim.health = 0;

  // Morale hit
  gameState.resources.morale = Math.max(0, gameState.resources.morale - 15);

  const messages = EVENT_DEATH_CAUSES[perilType] || EVENT_DEATH_CAUSES.health;
  const message = `${victim.name} ${messages[Math.floor(Math.random() * messages.length)]}`;

  return { name: victim.name, cause: perilType, message, isLeader: false };
}
