/**
 * js/events.js — Event selection and choice resolution
 *
 * selectEvent() weights the full event pool by terrain, weather risk,
 * peril deduplication, and SSP climate multipliers, then draws one event.
 *
 * applyChoice() resolves a player decision, checking item synergies,
 * routing mini-game triggers, and applying resource deltas.
 */
import { isChallenge, challengeOdds, consumeHelpers, FAIL_LINES,
         FAIL_LOSS_MULT, FAIL_GAIN_MULT, FAIL_MIN_MORALE } from './supplies.js';
import { eventDefs } from '../data/eventDefs.js';

/**
 * Select a weighted-random event for the current travel tick.
 *
 * @param {string} terrain          — current waypoint terrain type
 * @param {object} weatherRisk      — live risk scores { heat, flood, wildfire, tornado, hurricane }
 * @param {array}  inventory        — player's selected items
 * @param {array}  recentPerilTypes — last ≤3 peril types; recent types are heavily penalised
 * @param {object} sspMultipliers   — from data/ssp.js; scales heatRisk, floodRisk, wildfireRisk
 *                                    on top of weather boosts. null = no SSP scaling (fallback).
 * @returns {object} eventDef
 */
export function selectEvent(terrain, weatherRisk, inventory, recentPerilTypes = [], sspMultipliers = null, flags = {}) {
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

    // Skip events whose flag conditions aren't met (G2)
    if (event.conditions?.flags) {
      if (!event.conditions.flags.every(f => flags[f])) {
        weights.push({ event, weight: 0 });
        totalWeight += 0;
        continue;
      }
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

    // SSP climate multipliers — scale event probability by scenario/year risk
    // Sources and derivations: data/ssp.js and REFERENCES.md
    if (sspMultipliers) {
      if (event.perilType === 'heat') {
        weight *= sspMultipliers.heatRisk;
      }
      if (event.perilType === 'flood' || event.perilType === 'hurricane') {
        weight *= sspMultipliers.floodRisk;
      }
      if (event.perilType === 'wildfire') {
        weight *= sspMultipliers.wildfireRisk;
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

  // If this choice triggers a mini-game, signal the controller instead of applying effects
  if (choice.minigame) {
    return { type: 'minigame', minigame: choice.minigame, narrative: '', effects: {} };
  }

  const outcome = choice.outcomes;
  const effects = { ...outcome.effects };
  let usedItem = false;
  let roll = null;

  if (isChallenge(event, choice)) {
    // Hazard choices roll against a success chance that supplies raise
    const odds = challengeOdds(gameState, event, choice);
    const success = Math.random() < odds.chance;
    usedItem = odds.helpers.some(h => h.id === outcome.itemRequired);
    // On success the event's written itemBonus already covers the signature item
    const gained = consumeHelpers(gameState, odds.helpers,
      success && usedItem && outcome.itemBonus ? outcome.itemRequired : null);
    if (success) {
      if (usedItem && outcome.itemBonus) {
        for (const [resource, value] of Object.entries(outcome.itemBonus)) {
          effects[resource] = (effects[resource] || 0) + value;
        }
      }
    } else {
      usedItem = false;
      for (const [resource, value] of Object.entries(effects)) {
        effects[resource] = Math.round(value * (value < 0 ? FAIL_LOSS_MULT : FAIL_GAIN_MULT));
      }
      effects.morale = Math.min(effects.morale || 0, FAIL_MIN_MORALE);
    }
    for (const [resource, value] of Object.entries(gained)) {
      // Supplies still get used on a failed roll, but only do half the good
      const v = success ? value : Math.round(value * FAIL_GAIN_MULT);
      effects[resource] = (effects[resource] || 0) + v;
    }
    roll = {
      success,
      chance: odds.chance,
      used: odds.helpers.map(h => ({ name: h.name, count: h.count, consumed: h.consumes })),
      failLine: success ? null : (FAIL_LINES[event.perilType] || ''),
    };
  } else if (outcome.itemRequired) {
    // Non-challenge choices (good-news events) keep the simple item bonus (G5)
    const item = gameState.inventory.find(i => i.id === outcome.itemRequired);
    if (item && outcome.itemBonus) {
      const uses = gameState.itemUses?.[item.id] || 0;
      const hasUsesLeft = !item.maxUses || uses < item.maxUses;
      if (hasUsesLeft) {
        usedItem = true;
        if (item.maxUses) {
          if (!gameState.itemUses) gameState.itemUses = {};
          gameState.itemUses[item.id] = uses + 1;
        }
        for (const [resource, value] of Object.entries(outcome.itemBonus)) {
          effects[resource] = (effects[resource] || 0) + value;
        }
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

  let narrative = (usedItem && outcome.itemNarrative)
    ? outcome.itemNarrative
    : outcome.narrative;
  // A failed roll gets its own text: the written outcome describes the plan working
  if (roll && !roll.success) narrative = `It doesn't go to plan. ${roll.failLine}`.trim();

  // Severe health damage from events can kill a party member
  const death = checkEventDeath(gameState, effects, event.perilType);

  // Set game flag if this choice triggers one (G2)
  if (choice.setsFlag && gameState.flags != null) {
    gameState.flags[choice.setsFlag] = true;
  }

  return {
    narrative,
    death,
    effects,
    setsActiveHazard: choice.setsActiveHazard || null,
    setsFlag: choice.setsFlag || null,
    roll
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
