export const itemDefs = [
  {
    id: 'extra_fuel',
    name: 'Extra Fuel Can',
    cost: 15,
    weight: 3,
    description: '+20 fuel when used',
    effect: { fuel: 20 }
  },
  {
    id: 'water_purifier',
    name: 'Water Purifier',
    cost: 20,
    weight: 2,
    description: 'Passive: reduces water drain. Bonus in contamination events.',
    passive: { water: 0.8 },
    effect: null
  },
  {
    id: 'first_aid',
    name: 'First Aid Kit',
    cost: 18,
    weight: 2,
    description: '+15 health when used. Bonus in medical events.',
    effect: { health: 15 }
  },
  {
    id: 'solar_panel',
    name: 'Portable Solar Panel',
    cost: 25,
    weight: 3,
    description: 'Passive: +1 morale per day from creature comforts.',
    passive: { morale: 1 },
    effect: null
  },
  {
    id: 'insulation',
    name: 'Thermal Insulation',
    cost: 15,
    weight: 2,
    description: 'Passive: reduces health drain in extreme heat/cold.',
    passive: { health: 0.7 },
    effect: null
  },
  {
    id: 'canned_food',
    name: 'Canned Food Supply',
    cost: 12,
    weight: 4,
    description: '+20 food when used.',
    effect: { food: 20 }
  },
  {
    id: 'tool_kit',
    name: 'Mechanic\'s Tool Kit',
    cost: 20,
    weight: 3,
    description: 'Bonus in vehicle breakdown events. Passive: -10% fuel drain.',
    passive: { fuel: 0.9 },
    effect: null
  },
  {
    id: 'gas_mask',
    name: 'Gas Masks',
    cost: 22,
    weight: 1,
    description: 'Bonus in toxic air events. Passive: reduces health drain in bad air.',
    passive: { health: 0.85 },
    effect: null
  },
  {
    id: 'tarp_shelter',
    name: 'Tarp & Shelter Kit',
    cost: 10,
    weight: 3,
    description: 'Passive: reduces morale drain when waiting out events.',
    passive: { morale: 0.7 },
    effect: null
  },
  {
    id: 'radio',
    name: 'Emergency Radio',
    cost: 15,
    weight: 1,
    description: 'Passive: +5% chance of positive events (better intel).',
    passive: { positiveBoost: 0.05 },
    effect: null
  }
];

export function getItemById(id) {
  return itemDefs.find(item => item.id === id);
}
