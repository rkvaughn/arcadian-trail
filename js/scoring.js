export function calculateScore(game, isWin) {
  const breakdown = [];
  let total = 0;

  // Base points for winning
  if (isWin) {
    const winBonus = 500;
    total += winBonus;
    breakdown.push({ label: 'Journey completed', value: winBonus });
  }

  // Resources remaining
  const res = game.resources;
  const resourceScore = Math.round(
    (res.fuel + res.water + res.food + res.health + res.morale) / 5
  );
  total += resourceScore;
  breakdown.push({ label: 'Resources remaining', value: resourceScore });

  // Speed bonus: fewer days = more points
  if (isWin && game.day > 0) {
    const expectedDays = Math.ceil(game.totalDistance / 120);
    const speedBonus = Math.max(0, Math.round((expectedDays / game.day) * 100));
    total += speedBonus;
    breakdown.push({ label: `Speed (${game.day} days)`, value: speedBonus });
  }

  // Family survival
  const aliveMembers = game.family.filter(m => m.health > 0).length;
  const familyScore = aliveMembers * 50;
  total += familyScore;
  breakdown.push({ label: `Family members (${aliveMembers}/${game.family.length})`, value: familyScore });

  // Distance traveled (partial credit for losing)
  if (!isWin) {
    const distScore = Math.round(game.getProgress() * 200);
    total += distScore;
    breakdown.push({ label: `Distance covered (${Math.round(game.getProgress() * 100)}%)`, value: distScore });
  }

  // Events survived
  const eventCount = game.journalEntries.filter(e => e.includes('EVENT') || e.includes('!')).length;
  const eventScore = eventCount * 15;
  total += eventScore;
  breakdown.push({ label: `Events survived (${eventCount})`, value: eventScore });

  return { total, breakdown };
}
