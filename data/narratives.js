// Narrative text variants for replay variety.
// These get injected contextually based on terrain, weather, and events.

export const travelNarratives = {
  coastal: [
    'Salt air stings your eyes as waves crash against the abandoned seawall.',
    'Flooded parking lots and tilted power poles line the coastal highway.',
    'The road hugs what used to be the shoreline. The water is closer now.'
  ],
  desert: [
    'Heat shimmers turn the horizon into a liquid mirage.',
    'The desert stretches endlessly. No shade for miles.',
    'Cracked earth and dead saguaros mark the landscape.'
  ],
  forest: [
    'Tall pines filter the light into green columns.',
    'A deer watches from the treeline as you pass.',
    'Smoke-scarred trunks remind you why you left.'
  ],
  mountain: [
    'The engine strains on the switchbacks. Altitude presses on your ears.',
    'Snow-capped peaks loom ahead. The air thins.',
    'Rockslide debris narrows the road to one lane.'
  ],
  plains: [
    'Flat grassland rolls to the horizon in every direction.',
    'Wind turbines stand still — no power, no maintenance.',
    'An abandoned farmstead. The crops died years ago.'
  ],
  urban: [
    'Empty towers. Shattered storefronts. The city is a ghost.',
    'Traffic lights blink red at intersections nobody uses.',
    'A makeshift market operates in what was once a mall parking lot.'
  ],
  wetland: [
    'Standing water on both sides of the road. Mosquitoes cloud the air.',
    'The swamp has reclaimed the shoulder. You drive the center line.',
    'Egrets stand in flooded fields where cattle used to graze.'
  ],
  hills: [
    'Rolling hills stretch ahead. The road rises and falls like breathing.',
    'A creek runs alongside the road — one of the few clean water sources.',
    'Kudzu has swallowed entire buildings on the hillside.'
  ],
  valley: [
    'The valley floor is hazy. Air quality signs read "Hazardous."',
    'Orchards stand dead in neat rows. The irrigation channels are dry.',
    'A breeze carries the scent of distant fire through the valley.'
  ]
};

export const arrivalNarratives = [
  'The road opens into green hills and clean air. You made it.',
  'A sign reads "WELCOME — CLIMATE REFUGE COMMUNITY." Tears stream down faces.',
  'The engine sputters one last time as you pull into the settlement. Just in time.',
  'Children\'s laughter carries from a schoolyard. You haven\'t heard that sound in months.',
  'Someone hands you a cup of clean water. It\'s the best thing you\'ve ever tasted.'
];

export const gameOverNarratives = {
  fuel: [
    'The engine dies. No fuel, no hope. The family walks into the unknown.',
    'You coast to a stop on an empty highway. The gas gauge reads zero.'
  ],
  water: [
    'Cracked lips. Sunken eyes. The last water bottle was empty yesterday.',
    'Without water, the heat becomes a death sentence.'
  ],
  food: [
    'Hunger turns into weakness. Nobody can walk another mile.',
    'The children haven\'t eaten in three days. You can\'t go on.'
  ],
  health: [
    'Fever, infection, exhaustion. The road has taken everything.',
    'You can\'t keep your eyes open. The journey ends here.'
  ],
  morale: [
    'A fight breaks out. Blame. Tears. The family fractures.',
    'Silence in the car. Nobody believes anymore. You turn back.'
  ]
};

export function getRandomNarrative(terrain) {
  const pool = travelNarratives[terrain];
  if (!pool || pool.length === 0) return '';
  return pool[Math.floor(Math.random() * pool.length)];
}
