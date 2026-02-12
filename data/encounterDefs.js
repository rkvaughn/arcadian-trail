// Roadside encounters — non-modal flavor events with minor resource effects.
// These fire during travel without pausing the game. Logged to the journal.

export const encounterDefs = [
  // Positive finds
  { text: 'Found a half-full jerry can wedged under a wrecked truck.', effects: { fuel: 3 }, terrain: [] },
  { text: 'A hand-painted sign points to a spring. The water tests clean.', effects: { water: 4 }, terrain: ['mountain', 'hills', 'forest'] },
  { text: 'Canned goods in an overturned delivery van. Still sealed.', effects: { food: 3 }, terrain: [] },
  { text: 'A roadside chapel offers shade and silence. Everyone breathes easier.', effects: { morale: 4 }, terrain: ['plains', 'desert', 'hills'] },
  { text: 'Wildflowers push through the cracked highway median. Life persists.', effects: { morale: 3 }, terrain: ['plains', 'valley', 'hills'] },
  { text: 'An abandoned pharmacy — a few blister packs of aspirin left on the shelf.', effects: { health: 3 }, terrain: ['urban'] },
  { text: 'Solar panels still working on a deserted house. You charge your batteries.', effects: { morale: 2 }, terrain: ['desert', 'plains'] },
  { text: 'A friendly dog joins the family for a few miles. Morale improves.', effects: { morale: 5 }, terrain: [] },

  // Negative encounters
  { text: 'A pothole buckles the rim. You lose time hammering it back into shape.', effects: { fuel: -2 }, terrain: [] },
  { text: 'Bad smell from the water jug. You dump a portion just to be safe.', effects: { water: -3 }, terrain: [] },
  { text: 'Rats got into the food bag overnight. Some of it is ruined.', effects: { food: -3 }, terrain: ['urban', 'wetland'] },
  { text: 'A stretch of road with no shade. The heat saps everyone.', effects: { health: -2 }, terrain: ['desert', 'plains'] },
  { text: 'Graffiti on an overpass: "TURN BACK." Nobody talks for a while.', effects: { morale: -3 }, terrain: ['urban'] },
  { text: 'Detour around a collapsed overpass costs extra fuel.', effects: { fuel: -3 }, terrain: ['urban', 'mountain'] },
  { text: 'A dust devil coats everything in grit. Eyes sting, tempers flare.', effects: { morale: -2, health: -1 }, terrain: ['desert', 'plains'] },
  { text: 'Mosquito swarm at a rest stop. Everyone itches and nobody sleeps.', effects: { health: -2, morale: -1 }, terrain: ['wetland', 'coastal'] },

  // Neutral / atmospheric
  { text: 'Passed a convoy heading the other direction. They didn\'t stop.', effects: {}, terrain: [] },
  { text: 'An old radio tower blinks red in the dark. No signal, just light.', effects: {}, terrain: ['plains', 'hills'] },
  { text: 'Mile marker 404. Someone scratched "NOT FOUND" underneath.', effects: { morale: 1 }, terrain: [] },
  { text: 'A child spots a hawk circling overhead. First wildlife in days.', effects: { morale: 2 }, terrain: ['mountain', 'hills', 'valley'] },
];

// Probability of an encounter firing per travel tick
export const ENCOUNTER_CHANCE = 0.18;
