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

  // Check for item bonus
  if (outcome.itemRequired) {
    const hasItem = gameState.inventory.some(item => item.id === outcome.itemRequired);
    if (hasItem && outcome.itemBonus) {
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

  return {
    narrative: outcome.narrative,
    effects
  };
}
