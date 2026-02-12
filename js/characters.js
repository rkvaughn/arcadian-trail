const TRAITS = {
  resilient: {
    name: 'Resilient',
    description: 'Takes less health damage from events.',
    passive: { healthDrain: 0.7 }
  },
  resourceful: {
    name: 'Resourceful',
    description: 'Finds more supplies in positive events.',
    passive: { supplyBonus: 1.3 }
  },
  medic: {
    name: 'Medic',
    description: 'Medical events are less severe.',
    passive: { healthDrain: 0.8, healBonus: 1.5 }
  },
  mechanic: {
    name: 'Mechanic',
    description: 'Vehicle events are less severe. Fuel efficiency +10%.',
    passive: { fuelDrain: 0.9 }
  },
  navigator: {
    name: 'Navigator',
    description: 'Better fuel efficiency. Faster travel.',
    passive: { fuelDrain: 0.85, travelSpeed: 1.15 }
  }
};

const FIRST_NAMES = [
  'Alex', 'Jordan', 'Casey', 'Morgan', 'Riley',
  'Quinn', 'Avery', 'Taylor', 'Reese', 'Dakota',
  'Sam', 'Jamie', 'Charlie', 'Pat', 'Robin',
  'Eli', 'Sage', 'River', 'Finley', 'Rowan'
];

export function getTraits() {
  return TRAITS;
}

export function createFamily(leaderName, leaderTrait, familySize) {
  const usedNames = new Set([leaderName]);
  const members = [
    {
      name: leaderName,
      age: 30 + Math.floor(Math.random() * 15),
      health: 100,
      alive: true,
      trait: leaderTrait,
      isLeader: true
    }
  ];

  for (let i = 1; i < familySize; i++) {
    let name;
    do {
      name = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
    } while (usedNames.has(name));
    usedNames.add(name);

    const age = i === 1
      ? 25 + Math.floor(Math.random() * 20)  // partner/adult
      : 5 + Math.floor(Math.random() * 15);   // kids

    members.push({
      name,
      age,
      health: 100,
      alive: true,
      trait: null,
      isLeader: false
    });
  }

  return members;
}

export function getFamilyPassives(family) {
  const passives = {
    healthDrain: 1,
    fuelDrain: 1,
    supplyBonus: 1,
    healBonus: 1,
    travelSpeed: 1
  };

  for (const member of family) {
    if (member.trait && member.alive && TRAITS[member.trait]) {
      const traitPassives = TRAITS[member.trait].passive;
      for (const [key, value] of Object.entries(traitPassives)) {
        if (key in passives) {
          passives[key] *= value;
        }
      }
    }
  }

  return passives;
}
