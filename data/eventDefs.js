// Expanded event definitions — ~20 events with choices and outcomes.
// Each event: id, name, description, perilType, baseProbability,
// choices: [{ text, outcomes: { resourceEffects, narrative } }]

export const eventDefs = [
  {
    id: 'wildfire',
    name: 'Wildfire',
    perilType: 'wildfire',
    baseProbability: 0.12,
    terrainBonus: ['forest', 'valley', 'mountain'],
    description: 'A wall of orange light crests the ridge ahead. Smoke fills the cabin and the road disappears in haze.',
    choices: [
      {
        text: 'Drive through the smoke',
        outcomes: {
          effects: { health: -22, fuel: -12 },
          narrative: 'You gun it through the flames. The heat cracks the windshield but you make it through, coughing and shaken.'
        }
      },
      {
        text: 'Detour around the fire',
        outcomes: {
          effects: { fuel: -20, food: -5 },
          narrative: 'You backtrack 40 miles on dirt roads. It costs fuel and time, but everyone is safe.'
        }
      },
      {
        text: 'Wait for the fire to pass',
        minigame: 'SHELTER',
        outcomes: {
          effects: { water: -10, food: -8, morale: -10 },
          narrative: 'You shelter in a concrete underpass for two days. Supplies dwindle but the fire moves on.'
        }
      }
    ]
  },
  {
    id: 'hurricane',
    name: 'Hurricane',
    perilType: 'hurricane',
    baseProbability: 0.08,
    terrainBonus: ['coastal', 'wetland'],
    description: 'The sky turns green-black. Wind shrieks through the vehicle. A hurricane is making landfall.',
    choices: [
      {
        text: 'Shelter in a sturdy building',
        minigame: 'SHELTER',
        outcomes: {
          effects: { food: -10, water: -8 },
          itemRequired: 'tarp_shelter',
          itemBonus: { food: 5, morale: 8 },
          narrative: 'You find an old fire station and ride out the storm. Two days lost, but the family is safe.',
          itemNarrative: 'The tarp seals the broken windows. Your shelter kit turns the fire station into a proper camp. Morale holds.'
        }
      },
      {
        text: 'Try to outrun it',
        outcomes: {
          effects: { fuel: -30, health: -18 },
          narrative: 'You floor it north. Flying debris dents the car and fuel burns fast, but you escape the eye.'
        }
      }
    ]
  },
  {
    id: 'flood',
    name: 'Flash Flood',
    perilType: 'flood',
    baseProbability: 0.1,
    terrainBonus: ['wetland', 'coastal', 'plains'],
    description: 'Brown water surges across the highway. The road ahead is submerged — and rising.',
    choices: [
      {
        text: 'Ford the water slowly',
        outcomes: {
          effects: { health: -18, fuel: -8 },
          narrative: 'Water reaches the doors. The engine sputters but holds. You crawl through, soaked and rattled.'
        }
      },
      {
        text: 'Find higher ground and wait',
        minigame: 'SHELTER',
        outcomes: {
          effects: { food: -10, water: -5, morale: -8 },
          narrative: 'You camp on a hill for a day. The waters recede by morning, revealing a mud-caked road.'
        }
      },
      {
        text: 'Search for an alternate bridge',
        outcomes: {
          effects: { fuel: -15 },
          narrative: 'A local points you to an old railroad bridge. It holds. You cross safely but burn extra fuel.'
        }
      }
    ]
  },
  {
    id: 'drought',
    name: 'Drought Zone',
    perilType: 'heat',
    baseProbability: 0.1,
    terrainBonus: ['desert', 'plains'],
    description: 'The landscape is cracked and dead. Every gas station is dry. Water prices are scrawled in desperate handwriting.',
    choices: [
      {
        text: 'Trade fuel for water',
        outcomes: {
          effects: { fuel: -15, water: 10 },
          itemRequired: 'water_purifier',
          itemBonus: { water: 10, fuel: 8 },
          narrative: 'A roadside trader takes your fuel at a brutal exchange rate, but your canteens are full again.',
          itemNarrative: 'You purify creek water on-site instead. The trader sees the purifier and offers fuel for a turn with it. Fair deal.'
        }
      },
      {
        text: 'Push through without stopping',
        outcomes: {
          effects: { water: -25, health: -12 },
          narrative: 'You ration sips and drive in silence. By nightfall, lips are cracked and heads are pounding.'
        }
      }
    ]
  },
  {
    id: 'heatwave',
    name: 'Extreme Heatwave',
    perilType: 'heat',
    baseProbability: 0.12,
    terrainBonus: ['desert', 'urban', 'plains'],
    description: 'The dashboard thermometer reads 122\u00B0F. The asphalt shimmers. Air conditioning died an hour ago.',
    choices: [
      {
        text: 'Drive at night only',
        outcomes: {
          effects: { morale: -5, food: -5 },
          narrative: 'You park under an overpass until sunset. Night driving is eerie but cool. Progress is slow.'
        }
      },
      {
        text: 'Keep driving — push through',
        outcomes: {
          effects: { health: -22, water: -18 },
          narrative: 'Someone faints in the back seat. You pour precious water over their neck. The heat is relentless.'
        }
      },
      {
        text: 'Find shade and rest',
        minigame: 'SHELTER',
        outcomes: {
          effects: { water: -8, food: -8 },
          itemRequired: 'insulation',
          itemBonus: { water: 6, health: 5 },
          narrative: 'An abandoned warehouse provides shelter. You lose a day but avoid heat stroke.',
          itemNarrative: 'The thermal insulation keeps the cabin cool even parked. You barely touch the water reserves.'
        }
      }
    ]
  },
  {
    id: 'tornado',
    name: 'Tornado Warning',
    perilType: 'tornado',
    baseProbability: 0.07,
    terrainBonus: ['plains'],
    description: 'The radio crackles a warning. A funnel cloud touches down a mile east. The ground trembles.',
    choices: [
      {
        text: 'Take shelter in a ditch',
        minigame: 'SHELTER',
        outcomes: {
          effects: { health: -5, morale: -10 },
          itemRequired: 'tarp_shelter',
          itemBonus: { morale: 10, health: 5 },
          narrative: 'You lie flat in a drainage ditch, arms over your heads. The roar passes. You\'re alive but shaken.',
          itemNarrative: 'You stake the tarp over the ditch. Debris bounces off the cover. Everyone walks away unscratched.'
        }
      },
      {
        text: 'Drive perpendicular to its path',
        outcomes: {
          effects: { fuel: -12 },
          narrative: 'You cut west at full speed. The funnel drifts east. Heart pounding, you watch it recede in the mirror.'
        }
      }
    ]
  },
  {
    id: 'toxic_air',
    name: 'Toxic Air Quality',
    perilType: 'wildfire',
    baseProbability: 0.09,
    terrainBonus: ['urban', 'valley', 'forest'],
    description: 'The air quality index reads "Hazardous." Breathing outside for more than minutes brings coughing fits.',
    choices: [
      {
        text: 'Use gas masks and keep moving',
        outcomes: {
          effects: { health: -5 },
          itemRequired: 'gas_mask',
          itemBonus: { health: 5 },
          narrative: 'The masks help, but eyes still sting. You press forward through the brown haze.'
        }
      },
      {
        text: 'Seal the car and drive fast',
        outcomes: {
          effects: { fuel: -10, health: -8 },
          narrative: 'Windows up, vents closed. The cabin grows stuffy but you clear the worst zone in an hour.'
        }
      }
    ]
  },
  {
    id: 'power_outage',
    name: 'Regional Power Outage',
    perilType: 'infrastructure',
    baseProbability: 0.08,
    terrainBonus: ['urban'],
    description: 'The grid is down for 200 miles. Gas pumps don\'t work. Traffic lights are dark. Stores are shuttered.',
    choices: [
      {
        text: 'Conserve fuel and coast through',
        outcomes: {
          effects: { fuel: -5, food: -8 },
          itemRequired: 'solar_panel',
          itemBonus: { fuel: 8, morale: 5 },
          narrative: 'You hypermile through silent towns. No gas, no food resupply. But the road is clear.',
          itemNarrative: 'The solar panel trickle-charges the battery as you coast. You barely touch the fuel reserves. Smart packing.'
        }
      },
      {
        text: 'Wait for power restoration',
        outcomes: {
          effects: { food: -12, water: -8, morale: -5 },
          narrative: 'You camp in a school parking lot for two days. Power returns. You fill up and move on.'
        }
      }
    ]
  },
  {
    id: 'supply_cache',
    name: 'Abandoned Supply Cache',
    perilType: 'positive',
    baseProbability: 0.1,
    terrainBonus: [],
    description: 'Behind a boarded-up gas station, you spot crates. Someone left supplies — maybe in a hurry.',
    choices: [
      {
        text: 'Take everything you can carry',
        outcomes: {
          effects: { fuel: 12, water: 10, food: 12 },
          narrative: 'Canned food, bottled water, and a few gallons of gas. A lucky find.'
        }
      },
      {
        text: 'Take only what you need',
        outcomes: {
          effects: { fuel: 5, water: 5, food: 5, morale: 8 },
          narrative: 'You take modest supplies and leave the rest for others. The family feels good about it.'
        }
      }
    ]
  },
  {
    id: 'friendly_settlement',
    name: 'Friendly Settlement',
    perilType: 'positive',
    baseProbability: 0.08,
    terrainBonus: ['plains', 'forest', 'hills'],
    description: 'A small community has set up a refugee waystation. A hand-painted sign reads "REST STOP — ALL WELCOME."',
    choices: [
      {
        text: 'Stay and rest for a day',
        outcomes: {
          effects: { health: 12, morale: 15, food: -5 },
          narrative: 'Hot meals, clean water, and kind faces. You share your food supply as thanks. Morale soars.'
        }
      },
      {
        text: 'Trade supplies and move on',
        outcomes: {
          effects: { fuel: 8, water: 8, food: -8 },
          narrative: 'You barter canned goods for gas and water. Quick but fair. Back on the road within the hour.'
        }
      }
    ]
  },
  {
    id: 'abandoned_station',
    name: 'Abandoned Gas Station',
    perilType: 'positive',
    baseProbability: 0.09,
    terrainBonus: ['desert', 'plains'],
    description: 'A dusty gas station, doors hanging open. The pumps are dead but the shelves aren\'t empty.',
    choices: [
      {
        text: 'Search thoroughly',
        outcomes: {
          effects: { food: 8, water: 5 },
          narrative: 'Behind the counter: canned soup, crackers, and a jug of water. Small wins matter out here.'
        }
      },
      {
        text: 'Siphon the underground tanks',
        outcomes: {
          effects: { fuel: 15, health: -5 },
          narrative: 'A mouthful of fumes later, you\'ve got fuel. Your throat burns but the tank is fuller.'
        }
      }
    ]
  },
  {
    id: 'road_washout',
    name: 'Road Washout',
    perilType: 'flood',
    baseProbability: 0.08,
    terrainBonus: ['mountain', 'hills', 'wetland'],
    description: 'The road drops away into a muddy chasm. Recent rains carved a 30-foot gap in the highway.',
    choices: [
      {
        text: 'Find an off-road bypass',
        outcomes: {
          effects: { fuel: -12, health: -5 },
          narrative: 'A dirt track through a farmer\'s field gets you around. Bumpy and slow, but passable.'
        }
      },
      {
        text: 'Backtrack to the last junction',
        outcomes: {
          effects: { fuel: -18 },
          narrative: 'Thirty miles back to the fork, then a longer route. Hours lost. Gas tank hurting.'
        }
      }
    ]
  },
  {
    id: 'bridge_collapse',
    name: 'Bridge Collapse',
    perilType: 'infrastructure',
    baseProbability: 0.06,
    terrainBonus: ['mountain', 'hills'],
    description: 'The bridge ahead is a twisted mass of concrete and rebar, dropped into the river below.',
    choices: [
      {
        text: 'Search for a shallow crossing',
        outcomes: {
          effects: { fuel: -8, health: -10 },
          narrative: 'You find a rocky ford downstream. The car scrapes bottom but you cross. Undercarriage damage.'
        }
      },
      {
        text: 'Take the long detour',
        outcomes: {
          effects: { fuel: -22, food: -5 },
          narrative: 'A 60-mile detour through back roads. Safe but costly in fuel and time.'
        }
      }
    ]
  },
  {
    id: 'dust_storm',
    name: 'Dust Storm',
    perilType: 'heat',
    baseProbability: 0.08,
    terrainBonus: ['desert', 'plains'],
    description: 'A brown wall rolls across the horizon. Within minutes, visibility drops to zero.',
    choices: [
      {
        text: 'Pull over and wait it out',
        outcomes: {
          effects: { morale: -8, food: -5 },
          narrative: 'Sand blasts the paint. You huddle inside for hours. When it passes, the road is buried.'
        }
      },
      {
        text: 'Crawl forward at low speed',
        outcomes: {
          effects: { fuel: -10, health: -8 },
          itemRequired: 'gas_mask',
          itemBonus: { health: 8 },
          narrative: 'Navigating by GPS alone, you inch through the storm. Sand clogs the air filter. But you gain ground.',
          itemNarrative: 'Masks on, you inch through the wall of sand. Lungs stay clear. The air filter takes a beating but you don\'t.'
        }
      }
    ]
  },
  {
    id: 'medical_emergency',
    name: 'Medical Emergency',
    perilType: 'health',
    baseProbability: 0.07,
    terrainBonus: [],
    description: 'Someone in the back seat is burning up with fever. They need help — now.',
    choices: [
      {
        text: 'Use your first aid supplies',
        outcomes: {
          effects: { health: 5 },
          itemRequired: 'first_aid',
          itemBonus: { health: 10 },
          narrative: 'Antibiotics and rest. By morning, the fever breaks. Your med kit is lighter but it worked.'
        }
      },
      {
        text: 'Search for a clinic',
        outcomes: {
          effects: { fuel: -12, health: -5 },
          narrative: 'You drive 30 miles to a shuttered urgent care. A retired nurse helps from her porch. It\'s enough.'
        }
      },
      {
        text: 'Push on and hope for the best',
        outcomes: {
          effects: { health: -25, morale: -18 },
          narrative: 'The fever spikes. Delirium sets in. By the time it breaks, everyone is scared and exhausted.'
        }
      }
    ]
  },
  {
    id: 'vehicle_breakdown',
    name: 'Vehicle Breakdown',
    perilType: 'mechanical',
    baseProbability: 0.08,
    terrainBonus: ['mountain', 'desert'],
    description: 'The engine coughs, sputters, and dies. Steam rises from under the hood.',
    choices: [
      {
        text: 'Attempt repairs',
        outcomes: {
          effects: { fuel: -5 },
          itemRequired: 'tool_kit',
          itemBonus: { fuel: 5 },
          narrative: 'With the toolkit, you patch the radiator hose. Ugly but functional. Back on the road.'
        }
      },
      {
        text: 'Walk to the nearest town',
        outcomes: {
          effects: { health: -15, water: -15, food: -8 },
          narrative: 'A brutal 8-mile walk to find a mechanic. He charges in fuel. But the car runs again.'
        }
      }
    ]
  },
  {
    id: 'refugee_camp',
    name: 'Refugee Camp',
    perilType: 'social',
    baseProbability: 0.07,
    terrainBonus: ['urban', 'plains'],
    description: 'Rows of tents stretch along the highway. Thousands of people, all heading the same direction you are.',
    choices: [
      {
        text: 'Share supplies and rest',
        outcomes: {
          effects: { food: -10, water: -8, morale: 15, health: 5 },
          narrative: 'You share what you can. In return: information about the road ahead, and a renewed sense of purpose.'
        }
      },
      {
        text: 'Drive past without stopping',
        outcomes: {
          effects: { morale: -22 },
          narrative: 'Eyes follow your car. A child waves. You keep driving. Nobody speaks for an hour.'
        }
      },
      {
        text: 'Trade for information',
        outcomes: {
          effects: { food: -5, morale: 5 },
          narrative: 'A former trucker draws you a map of open roads. Worth every calorie you traded.'
        }
      }
    ]
  },
  {
    id: 'water_contamination',
    name: 'Water Contamination',
    perilType: 'health',
    baseProbability: 0.07,
    terrainBonus: ['wetland', 'urban'],
    description: 'A hand-lettered sign at the creek: "DON\'T DRINK — CHEMICAL SPILL." Your water supply tastes off.',
    choices: [
      {
        text: 'Purify with your filter',
        outcomes: {
          effects: { water: -5 },
          itemRequired: 'water_purifier',
          itemBonus: { water: 10 },
          narrative: 'The purifier catches the worst of it. Water tastes metallic but tests safe. Filter is wearing thin.'
        }
      },
      {
        text: 'Dump the suspect water',
        outcomes: {
          effects: { water: -20 },
          narrative: 'Better safe than sick. You dump your reserves and drive on, hoping to find clean water soon.'
        }
      },
      {
        text: 'Risk drinking it',
        outcomes: {
          effects: { health: -22, morale: -10 },
          narrative: 'Stomach cramps hit within the hour. It\'s a miserable night, but you keep your water supply.'
        }
      }
    ]
  },
  {
    id: 'clear_skies',
    name: 'Clear Skies',
    perilType: 'positive',
    baseProbability: 0.1,
    terrainBonus: [],
    description: 'Blue sky from horizon to horizon. The road is open. For the first time in days, things feel... normal.',
    choices: [
      {
        text: 'Make good time while you can',
        outcomes: {
          effects: { morale: 10, fuel: -5 },
          narrative: 'You cover extra ground. Music on the radio. Windows down. Almost feels like the old days.'
        }
      },
      {
        text: 'Take a break and enjoy it',
        outcomes: {
          effects: { morale: 15, health: 8 },
          narrative: 'A roadside picnic. The kids play in a field. Everyone breathes easier. These moments matter.'
        }
      }
    ]
  },
  {
    id: 'swollen_river',
    name: 'River Crossing',
    perilType: 'flood',
    baseProbability: 0.08,
    terrainBonus: ['valley', 'hills'],
    description: 'The bridge is gone. Just rebar jutting like broken teeth over brown water churning mud and debris.',
    choices: [
      {
        text: 'Ford the shallows aggressively',
        outcomes: {
          effects: { health: -15, morale: -10 },
          narrative: 'Water floods the floorboards. The engine chokes, sputters, but drags you onto the far bank wet and shaking.'
        }
      },
      {
        text: 'Reinforce chassis and float',
        outcomes: {
          effects: { fuel: -5, morale: 5 },
          itemRequired: 'tool_kit',
          itemBonus: { morale: 10 },
          narrative: 'You seal the intakes. The vehicle bobs like a cork, drifting downstream before tires find traction.'
        }
      },
      {
        text: 'Find a narrow point upstream',
        outcomes: {
          effects: { fuel: -20, water: -5 },
          narrative: 'Hours burned navigating the mud. You cross safely, but the fuel gauge drops significantly.'
        }
      }
    ]
  },
  {
    id: 'armored_caravan',
    name: 'The Iron Caravan',
    perilType: 'social',
    baseProbability: 0.06,
    terrainBonus: ['plains', 'desert'],
    description: 'Three semi-trucks welded with scrap metal circle up. A gunner tracks you from a turret. They aren\'t raiding — they\'re trading.',
    choices: [
      {
        text: 'Trade fuel for clean water',
        outcomes: {
          effects: { fuel: -15, water: 15 },
          narrative: 'The exchange is tense. Hands on holsters. They toss the jerry cans and peel out into the dust.'
        }
      },
      {
        text: 'Hail them on the frequency',
        outcomes: {
          effects: { morale: 10, food: 5 },
          itemRequired: 'radio',
          itemBonus: { food: 8 },
          narrative: 'You speak their code. The gunner waves. They toss a crate of MREs as a gesture of road solidarity.'
        }
      },
      {
        text: 'Keep driving, head down',
        outcomes: {
          effects: { morale: -5 },
          narrative: 'You pass in silence. The opportunity for supplies vanishes in the rearview mirror.'
        }
      }
    ]
  },
  {
    id: 'flash_freeze',
    name: 'Flash Freeze',
    perilType: 'mechanical',
    baseProbability: 0.07,
    terrainBonus: ['mountain', 'hills'],
    description: 'Temperature plummets thirty degrees in an hour. Rain turns to black ice. The road is a sheet of glass.',
    choices: [
      {
        text: 'Keep moving at a crawl',
        outcomes: {
          effects: { fuel: -25, health: -5 },
          itemRequired: 'insulation',
          itemBonus: { fuel: 12, health: 5 },
          narrative: 'Heater blasting, wheels spinning. You burn a tank of gas to move ten miles without sliding off the edge.',
          itemNarrative: 'The thermal insulation holds cabin heat without running the heater at full blast. You save fuel and keep warm.'
        }
      },
      {
        text: 'Stop and build a fire',
        outcomes: {
          effects: { food: -10, morale: -5 },
          narrative: 'You huddle for warmth. Frost coats the interior. You survive the night, but hunger gnaws at you.'
        }
      }
    ]
  },
  {
    id: 'grey_famine',
    name: 'The Blight',
    perilType: 'health',
    baseProbability: 0.09,
    terrainBonus: ['valley', 'plains'],
    description: 'Miles of corn turned to black slime. The smell of rot is thick. Gaunt locals watch your vehicle with hollow eyes.',
    choices: [
      {
        text: 'Share supplies with locals',
        outcomes: {
          effects: { food: -20, morale: 15 },
          narrative: 'You hand over cans of beans. They weep. It hurts your stock, but you feel human again.'
        }
      },
      {
        text: 'Speed through the zone',
        outcomes: {
          effects: { fuel: -10, morale: -10 },
          narrative: 'You don\'t look back. The guilt sits heavy in the silence of the cab.'
        }
      },
      {
        text: 'Scavenge the farmhouses',
        outcomes: {
          effects: { health: -15, water: 10 },
          itemRequired: 'gas_mask',
          itemBonus: { health: 12 },
          narrative: 'You find some bottled water, but inhale spores of the black rot. Your lungs burn for days.',
          itemNarrative: 'Masks on, you pick through the farmhouses. Bottled water, canned goods — and your lungs stay clean.'
        }
      }
    ]
  },
  {
    id: 'king_tide',
    name: 'Storm Surge',
    perilType: 'flood',
    baseProbability: 0.10,
    terrainBonus: ['coastal', 'wetland'],
    description: 'The Atlantic is reclaiming the highway. Saltwater breaches the levees, grey foam snapping at the tires.',
    choices: [
      {
        text: 'Race the rising water',
        outcomes: {
          effects: { health: -10, fuel: -10 },
          narrative: 'Salt spray blinds the windshield. You hydroplane through the surge, rust forming before the metal even dries.'
        }
      },
      {
        text: 'Retreat to high ground',
        outcomes: {
          effects: { food: -15, fuel: -5 },
          narrative: 'You lose a day waiting on a ridge. The ocean swallows the road below. You have to backtrack.'
        }
      }
    ]
  },
  {
    id: 'human_bottleneck',
    name: 'Refugee Checkpoint',
    perilType: 'social',
    baseProbability: 0.11,
    terrainBonus: ['urban', 'valley'],
    description: 'Concrete barriers block the interstate. Thousands of desperate souls pressed against chain-link, begging for entry.',
    choices: [
      {
        text: 'Bribe the border guards',
        outcomes: {
          effects: { fuel: -20, morale: -5 },
          narrative: 'They take the jerry cans without a word and open the gate. The crowd screams as you pass.'
        }
      },
      {
        text: 'Ram the side barricade',
        minigame: 'BARRICADE',
        outcomes: {
          effects: { health: -20, fuel: -5 },
          narrative: 'Metal screeches. You smash through the fencing. The vehicle takes a beating, but you are free.'
        }
      },
      {
        text: 'Navigate the service roads',
        outcomes: {
          effects: { water: -10, food: -5 },
          itemRequired: 'radio',
          itemBonus: { water: 8, food: 5 },
          narrative: 'Hours navigating back alleys to bypass the crush. Supplies consumed in the wait.',
          itemNarrative: 'The emergency radio picks up a trucker frequency with real-time route intel. You thread through in half the time.'
        }
      }
    ]
  },
  {
    id: 'silent_array',
    name: 'Solar Farm',
    perilType: 'positive',
    baseProbability: 0.06,
    terrainBonus: ['desert', 'plains'],
    description: 'A sea of mirrors shimmering in the heat. Abandoned, but the charge indicators on the storage banks still blink green.',
    choices: [
      {
        text: 'Siphon power for batteries',
        outcomes: {
          effects: { fuel: 15 },
          narrative: 'You hook up the jumper cables. The hum of electricity fills the air. The tank is saved.'
        }
      },
      {
        text: 'Loot panels for trade',
        outcomes: {
          effects: { morale: 10, fuel: 5 },
          itemRequired: 'tool_kit',
          itemBonus: { fuel: 10 },
          narrative: 'You unbolt a pristine photovoltaic cell. Worth its weight in gold at the next settlement.'
        }
      }
    ]
  },
  {
    id: 'quarantine_zone',
    name: 'Abandoned Hospital',
    perilType: 'health',
    baseProbability: 0.07,
    terrainBonus: ['urban'],
    description: 'Biohazard tape flutters from the awning. The windows are dark. It smells of copper and old sickness.',
    choices: [
      {
        text: 'Raid the pharmacy',
        outcomes: {
          effects: { health: 15, morale: 5 },
          itemRequired: 'gas_mask',
          itemBonus: { health: 10 },
          narrative: 'Mask on, you step over the bodies. You find a stash of untouched antibiotics in a locked cabinet.'
        }
      },
      {
        text: 'Search the cafeteria',
        outcomes: {
          effects: { food: 10, health: -10 },
          narrative: 'You find canned peaches, but cut your hand on rusted metal. The wound throbs immediately.'
        }
      },
      {
        text: 'Too risky — drive on',
        outcomes: {
          effects: { fuel: -5 },
          narrative: 'You leave the house of the dead behind. Better hungry than infected.'
        }
      }
    ]
  },
  {
    id: 'bandits',
    name: 'Road Bandits',
    perilType: 'social',
    baseProbability: 0.06,
    terrainBonus: ['desert', 'mountain'],
    description: 'A makeshift roadblock. Armed figures emerge from behind wrecked cars. They want your supplies.',
    choices: [
      {
        text: 'Negotiate and share',
        outcomes: {
          effects: { food: -12, fuel: -8 },
          narrative: 'You hand over supplies with steady hands. They take what they want and wave you through.'
        }
      },
      {
        text: 'Floor it through the barricade',
        minigame: 'BARRICADE',
        outcomes: {
          effects: { health: -18, fuel: -8 },
          narrative: 'Tires scream. Something hits the trunk. A window shatters. But you\'re through and gone.'
        }
      },
      {
        text: 'Reverse and find another route',
        outcomes: {
          effects: { fuel: -18 },
          itemRequired: 'radio',
          itemBonus: { fuel: 10 },
          narrative: 'You back up a mile, then cut down a side road. Hours lost, but nothing else.',
          itemNarrative: 'The radio crackles with a trucker warning about this stretch. You reroute early, saving fuel and nerves.'
        }
      }
    ]
  }
];
