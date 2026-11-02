/**
 * js/supplies.js — How supplies change the odds in every challenge
 *
 * Every hazard event choice is a "challenge" with a visible success chance.
 * Supplies that fit the peril raise it; consumables are spent when they help.
 * Mini-games get item perks from the same inventory (see minigamePerks).
 *
 * All numbers here are GAMEPLAY TUNING (success probabilities, multipliers),
 * not climate data.
 */

import { getItemById } from '../data/items.js';

export const BASE_CHANCE = 0.5;          // a challenge with no help is a coin flip
export const MAX_CHANCE = 0.95;          // nothing is ever certain on this road
const SIGNATURE_BONUS = 0.30;            // the item an event was written around (itemRequired)
const ITEM_BONUS = 0.15;                 // any other item that fits the peril
const BOTTLE_BONUS = 0.06;               // per water bottle...
const MAX_BOTTLES_PER_CHALLENGE = 2;     // ...up to this many per challenge
export const FAIL_LOSS_MULT = 1.5;       // a failed challenge makes losses this much worse
export const FAIL_GAIN_MULT = 0.5;       // ...and halves any gains
export const FAIL_MIN_MORALE = -5;       // a failure always stings a little

// Which supplies help with which kind of peril. Each hazard type is helped by
// four to six of the eleven supplies, and every supply helps in at least three
// hazard types, so almost any loadout has something to use in each challenge.
export const PERIL_ITEMS = {
  wildfire:       ['gas_mask', 'first_aid', 'extra_fuel', 'water_bottles', 'radio'],
  hurricane:      ['tarp_shelter', 'radio', 'canned_food', 'solar_panel', 'first_aid', 'water_bottles'],
  flood:          ['tool_kit', 'radio', 'extra_fuel', 'water_purifier', 'tarp_shelter', 'first_aid'],
  heat:           ['insulation', 'water_purifier', 'water_bottles', 'first_aid', 'solar_panel'],
  tornado:        ['tarp_shelter', 'radio', 'first_aid', 'tool_kit'],
  infrastructure: ['tool_kit', 'solar_panel', 'extra_fuel', 'radio', 'insulation'],
  health:         ['first_aid', 'water_purifier', 'gas_mask', 'water_bottles', 'canned_food'],
  mechanical:     ['tool_kit', 'extra_fuel', 'insulation', 'solar_panel'],
  social:         ['radio', 'canned_food', 'extra_fuel', 'solar_panel', 'water_bottles', 'gas_mask'],
};

/** How many uses of an item the family still has (Infinity for durable gear). */
export function usesLeft(gameState, id) {
  const item = gameState.inventory?.find(i => i.id === id);
  if (!item) return 0;
  const used = gameState.itemUses?.[id] || 0;
  if (item.stackable) return Math.max(0, (item.quantity || 0) - used);
  if (item.maxUses) return Math.max(0, item.maxUses - used);
  return Infinity;
}

function consumable(item) {
  return !!(item.stackable || item.maxUses);
}

/** Is this choice a challenge (rolled), as opposed to a sure thing or a mini-game? */
export function isChallenge(event, choice) {
  return !!choice && !choice.minigame && !!choice.outcomes && event.perilType !== 'positive';
}

/**
 * Success chance for a choice and the supplies that would be used.
 * @returns {{ chance, helpers: [{ id, name, bonus, count, consumes }] } | null}
 */
export function challengeOdds(gameState, event, choice) {
  if (!isChallenge(event, choice)) return null;
  const signature = choice.outcomes.itemRequired || null;
  const fits = new Set([...(PERIL_ITEMS[event.perilType] || []), ...(signature ? [signature] : [])]);

  const helpers = [];
  for (const id of fits) {
    const left = usesLeft(gameState, id);
    if (!left) continue;
    const item = getItemById(id) || gameState.inventory.find(i => i.id === id);
    if (item.stackable) {
      const count = Math.min(left, MAX_BOTTLES_PER_CHALLENGE);
      helpers.push({ id, name: item.name, bonus: BOTTLE_BONUS * count, count, consumes: true });
    } else {
      const bonus = id === signature ? SIGNATURE_BONUS : ITEM_BONUS;
      helpers.push({ id, name: item.name, bonus, count: 1, consumes: consumable(item) });
    }
  }
  // Durable gear first, then consumables; stop spending consumables once
  // the chance is already maxed out.
  helpers.sort((a, b) => (a.consumes - b.consumes) || (b.bonus - a.bonus));
  let chance = BASE_CHANCE;
  const used = [];
  for (const h of helpers) {
    if (chance >= MAX_CHANCE && h.consumes) continue;
    chance += h.bonus;
    used.push(h);
  }
  return { chance: Math.min(MAX_CHANCE, chance), helpers: used };
}

/** Spend consumables that helped; each also gives its stated "when used" effect. */
export function consumeHelpers(gameState, helpers, skipEffectId = null) {
  const gained = {};
  if (!gameState.itemUses) gameState.itemUses = {};
  for (const h of helpers) {
    if (!h.consumes) continue;
    gameState.itemUses[h.id] = (gameState.itemUses[h.id] || 0) + h.count;
    const effect = getItemById(h.id)?.effect;
    if (effect && h.id !== skipEffectId) {
      for (const [k, v] of Object.entries(effect)) gained[k] = (gained[k] || 0) + v * h.count;
    }
  }
  return gained;
}

/** Peril types an item helps with — for the supplies screen. */
export function perilsHelpedBy(id) {
  return Object.entries(PERIL_ITEMS).filter(([, ids]) => ids.includes(id)).map(([p]) => p);
}

/**
 * Mini-game perks from the family's supplies.
 * @param {string} game  'shed' | 'frogger' | 'barricade'
 * @param {string} [mode] Shed Dash peril mode: 'heat' | 'wind' | 'fire'
 * @returns {{ perks: object, labels: string[] }}
 */
export function minigamePerks(gameState, game, mode) {
  const has = id => usesLeft(gameState, id) > 0;
  const perks = {}, labels = [];
  const add = (key, value, label) => { perks[key] = value; labels.push(label); };

  // Barricade has no health bar, so first aid only helps on foot or in the water
  if (has('first_aid') && game !== 'barricade') add('firstAid', true, 'First aid: one emergency heal');
  if (game === 'shed') {
    if (mode === 'fire' && has('gas_mask')) add('burnMult', 0.65, 'Gas masks: fire & smoke hurt less');
    if (mode === 'heat' && has('insulation')) add('staminaMult', 0.7, 'Insulation: stamina lasts longer');
    if (mode === 'heat' && has('water_bottles')) add('drinks', Math.min(3, usesLeft(gameState, 'water_bottles')), 'Water bottles: drink to recover stamina');
    if (mode === 'wind' && has('tarp_shelter')) add('pushMult', 0.7, 'Tarp: brace against gusts & debris');
    if (mode === 'wind' && has('radio')) add('earlyWarning', true, 'Radio: earlier gust warnings');
  }
  if (game === 'frogger' && has('tool_kit')) add('waterMult', 0.65, 'Tool kit rope: the current hurts less');
  if (game === 'barricade') {
    if (has('tool_kit')) add('hitMult', 0.6, 'Tool kit bumper: crashes slow you less');
    if (has('extra_fuel')) add('boost', 1.25, 'Fuel can: burst of speed');
  }
  return { perks, labels };
}

/** Record supplies a mini-game actually used, e.g. { first_aid: 1, water_bottles: 2 }. */
export function consumeMinigameUses(gameState, used = {}) {
  if (!gameState.itemUses) gameState.itemUses = {};
  for (const [id, n] of Object.entries(used)) {
    if (n > 0) gameState.itemUses[id] = (gameState.itemUses[id] || 0) + n;
  }
}

// Failure lines appended to the outcome narrative, by peril type
export const FAIL_LINES = {
  wildfire:       'The wind shifts at the worst moment. It goes badly.',
  hurricane:      'The storm finds every weakness in your plan.',
  flood:          'The water rises faster than you bargained for.',
  heat:           'The heat wins this round. Everyone pays for it.',
  tornado:        'The funnel swings closer than anyone expected.',
  infrastructure: 'Nothing holds the way it should.',
  health:         'The illness spreads before you can stop it.',
  mechanical:     'Something else gives way. The repair costs more than planned.',
  social:         'Words fail. Things turn ugly.',
};
