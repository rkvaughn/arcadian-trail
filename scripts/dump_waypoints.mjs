// Prints every unique route waypoint ({name, lat, lon, terrain}) as JSON.
// Used by scripts/build_hurricane_stats.py so the stats always cover exactly
// the waypoints the game can visit.
import { origins, destinations } from '../data/cities.js';
import { getRoute } from '../data/routes.js';

const seen = new Map();
for (const o of origins) {
  for (const d of destinations) {
    const route = getRoute(o.id, d.id);
    if (!route) continue;
    for (const w of route) {
      if (!seen.has(w.name)) seen.set(w.name, { name: w.name, lat: w.lat, lon: w.lon, terrain: w.terrain });
    }
  }
}
process.stdout.write(JSON.stringify([...seen.values()]));
