// Narrative text variants for replay variety.
// These get injected contextually based on terrain, weather, and events.

export const travelNarratives = {
  coastal: [
    'Salt air stings your eyes as waves crash against the abandoned seawall.',
    'Flooded parking lots and tilted power poles line the coastal highway.',
    'The road hugs what used to be the shoreline. The water is closer now.',
    'Rusting cargo ships sit beached like iron whales on the receding tide.',
    'Tattered umbrellas and plastic bottles litter the gray, oil-slicked sand.',
    'The highway crumbles into the surf where the rising tide has reclaimed the lane.',
    'White salt crusts over the skeletons of dead palm trees along the dunes.',
    'Wind-blown foam drifts across the asphalt like bitter, dirty snow.'
  ],
  desert: [
    'Heat shimmers turn the horizon into a liquid mirage.',
    'The desert stretches endlessly. No shade for miles.',
    'Cracked earth and dead saguaros mark the landscape.',
    'Wind-whipped sand scours the paint from abandoned cars along the shoulder.',
    'Bleached cattle skulls half-buried in the dunes mark the path of a dried creek.',
    'The sun is a white hole in a sky drained of all color.',
    'Ripples of fine dust migrate across the cracked asphalt in the hot wind.',
    'Shriveled cacti stand like skeletal sentinels in the scorching stillness.'
  ],
  forest: [
    'Tall pines filter the light into green columns.',
    'A deer watches from the treeline as you pass.',
    'Smoke-scarred trunks remind you why you left.',
    'Charred trunks stand like black needles against a bruised, smoky sky.',
    'Tangled vines choke the dead oaks, turning the woods into a wall of gray.',
    'The smell of old resin and rot hangs heavy in the humid shade.',
    'Dust-covered leaves rattle in the wind like dry parchment.',
    'Fallen timber blocks the side roads, claimed by moss and decay.'
  ],
  mountain: [
    'The engine strains on the switchbacks. Altitude presses on your ears.',
    'Snow-capped peaks loom ahead. The air thins.',
    'Rockslide debris narrows the road to one lane.',
    'Gray scree slides down the slopes, burying sections of the rusted guardrail.',
    'Jagged peaks pierce a sky choked with ash and thin, high clouds.',
    'Empty ski resorts sit like rotting wooden crowns on the barren ridges.',
    'A dry wind whistles through the hollowed-out tunnels of the pass.',
    'The sun sets early behind the granite walls, plunging the road into deep blue.'
  ],
  plains: [
    'Flat grassland rolls to the horizon in every direction.',
    'Wind turbines stand still — no power, no maintenance.',
    'An abandoned farmstead. The crops died years ago.',
    'Massive dust clouds boil on the horizon, turning the sun a sickly orange.',
    'Rusted combine harvesters sit frozen in fields of waist-high, yellowed weeds.',
    'The wind howls through the power lines, a lonely sound in the vast emptiness.',
    'Deep fissures divide the earth where the last moisture escaped decades ago.',
    'Old billboards for forgotten towns peel and flap in the relentless gale.'
  ],
  urban: [
    'Empty towers. Shattered storefronts. The city is a ghost.',
    'Traffic lights blink red at intersections nobody uses.',
    'A makeshift market operates in what was once a mall parking lot.',
    'Saplings burst through the cracked asphalt of the six-lane expressway.',
    'Broken glass glitters like diamonds across the blackened remains of the intersection.',
    'Faded graffiti covers the lower floors of skyscrapers that have lost their windows.',
    'A rusted bus lies on its side, a steel carcass stripped of everything valuable.',
    'Shadows of long-gone crowds seem to linger in the echoing concrete canyons.'
  ],
  wetland: [
    'Standing water on both sides of the road. Mosquitoes cloud the air.',
    'The swamp has reclaimed the shoulder. You drive the center line.',
    'Egrets stand in flooded fields where cattle used to graze.',
    'Thick, oily slicks shimmer on the surface of the black water.',
    'Cypress knees poke through the muck like the ribs of a sunken world.',
    'The air is a thick blanket of humidity and the stench of sulfur.',
    'Half-submerged road signs point to towns that are now part of the swamp.',
    'Bright purple algae blooms choke the stagnant pools along the embankment.'
  ],
  hills: [
    'Rolling hills stretch ahead. The road rises and falls like breathing.',
    'A creek runs alongside the road — one of the few clean water sources.',
    'Kudzu has swallowed entire buildings on the hillside.',
    'Terraced gardens, long since dead, scar the sides of the golden slopes.',
    'The road snakes around jagged limestone outcrops that look like broken teeth.',
    'Low-hanging clouds snag on the summits, dripping gray mist onto the windshield.',
    'Patches of scrub brush cling to the dry soil, shivering in the breeze.',
    'From the crest of the ridge, the world below looks like a scorched map.'
  ],
  valley: [
    'The valley floor is hazy. Air quality signs read "Hazardous."',
    'Orchards stand dead in neat rows. The irrigation channels are dry.',
    'A breeze carries the scent of distant fire through the valley.',
    'A thick layer of yellow smog pools between the steep rock walls.',
    'The dry bed of a once-great river is now just a scar of white stones.',
    'Abandoned irrigation pipes snake through the dust like giant iron worms.',
    'Heat remains trapped here long after the sun has dropped behind the peaks.',
    'Echoes of the engine bounce off the cliffs, making the silence feel louder.'
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
