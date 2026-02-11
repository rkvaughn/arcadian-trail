// Pre-defined waypoint routes between origin-destination pairs.
// Each waypoint: name, lat, lon, terrain, distFromPrev (miles)

const waypoints = {
  // --- Miami routes ---
  miami_minneapolis: [
    { name: 'Miami, FL', lat: 25.76, lon: -80.19, terrain: 'coastal', dist: 0 },
    { name: 'Orlando, FL', lat: 28.54, lon: -81.38, terrain: 'wetland', dist: 235 },
    { name: 'Atlanta, GA', lat: 33.75, lon: -84.39, terrain: 'forest', dist: 440 },
    { name: 'Nashville, TN', lat: 36.16, lon: -86.78, terrain: 'hills', dist: 250 },
    { name: 'Louisville, KY', lat: 38.25, lon: -85.76, terrain: 'plains', dist: 175 },
    { name: 'Indianapolis, IN', lat: 39.77, lon: -86.16, terrain: 'plains', dist: 115 },
    { name: 'Chicago, IL', lat: 41.88, lon: -87.63, terrain: 'urban', dist: 185 },
    { name: 'Milwaukee, WI', lat: 43.04, lon: -87.91, terrain: 'plains', dist: 92 },
    { name: 'Minneapolis, MN', lat: 44.98, lon: -93.27, terrain: 'plains', dist: 337 }
  ],
  miami_buffalo: [
    { name: 'Miami, FL', lat: 25.76, lon: -80.19, terrain: 'coastal', dist: 0 },
    { name: 'Jacksonville, FL', lat: 30.33, lon: -81.66, terrain: 'wetland', dist: 345 },
    { name: 'Savannah, GA', lat: 32.08, lon: -81.09, terrain: 'coastal', dist: 140 },
    { name: 'Charlotte, NC', lat: 35.23, lon: -80.84, terrain: 'hills', dist: 265 },
    { name: 'Roanoke, VA', lat: 37.27, lon: -79.94, terrain: 'mountain', dist: 195 },
    { name: 'Pittsburgh, PA', lat: 40.44, lon: -79.99, terrain: 'mountain', dist: 230 },
    { name: 'Buffalo, NY', lat: 42.89, lon: -78.88, terrain: 'plains', dist: 190 }
  ],
  miami_burlington: [
    { name: 'Miami, FL', lat: 25.76, lon: -80.19, terrain: 'coastal', dist: 0 },
    { name: 'Jacksonville, FL', lat: 30.33, lon: -81.66, terrain: 'wetland', dist: 345 },
    { name: 'Richmond, VA', lat: 37.54, lon: -77.44, terrain: 'forest', dist: 530 },
    { name: 'Washington, DC', lat: 38.91, lon: -77.04, terrain: 'urban', dist: 110 },
    { name: 'Philadelphia, PA', lat: 39.95, lon: -75.17, terrain: 'urban', dist: 140 },
    { name: 'Hartford, CT', lat: 41.76, lon: -72.68, terrain: 'forest', dist: 210 },
    { name: 'Burlington, VT', lat: 44.48, lon: -73.21, terrain: 'mountain', dist: 215 }
  ],

  // --- Phoenix routes ---
  phoenix_minneapolis: [
    { name: 'Phoenix, AZ', lat: 33.45, lon: -112.07, terrain: 'desert', dist: 0 },
    { name: 'Flagstaff, AZ', lat: 35.20, lon: -111.65, terrain: 'mountain', dist: 145 },
    { name: 'Albuquerque, NM', lat: 35.08, lon: -106.65, terrain: 'desert', dist: 325 },
    { name: 'Amarillo, TX', lat: 35.22, lon: -101.83, terrain: 'plains', dist: 290 },
    { name: 'Oklahoma City, OK', lat: 35.47, lon: -97.52, terrain: 'plains', dist: 260 },
    { name: 'Kansas City, MO', lat: 39.10, lon: -94.58, terrain: 'plains', dist: 350 },
    { name: 'Des Moines, IA', lat: 41.59, lon: -93.62, terrain: 'plains', dist: 195 },
    { name: 'Minneapolis, MN', lat: 44.98, lon: -93.27, terrain: 'plains', dist: 245 }
  ],
  phoenix_boise: [
    { name: 'Phoenix, AZ', lat: 33.45, lon: -112.07, terrain: 'desert', dist: 0 },
    { name: 'Flagstaff, AZ', lat: 35.20, lon: -111.65, terrain: 'mountain', dist: 145 },
    { name: 'Page, AZ', lat: 36.91, lon: -111.46, terrain: 'desert', dist: 135 },
    { name: 'Salt Lake City, UT', lat: 40.76, lon: -111.89, terrain: 'mountain', dist: 275 },
    { name: 'Twin Falls, ID', lat: 42.56, lon: -114.46, terrain: 'plains', dist: 220 },
    { name: 'Boise, ID', lat: 43.62, lon: -116.21, terrain: 'mountain', dist: 130 }
  ],
  phoenix_buffalo: [
    { name: 'Phoenix, AZ', lat: 33.45, lon: -112.07, terrain: 'desert', dist: 0 },
    { name: 'Albuquerque, NM', lat: 35.08, lon: -106.65, terrain: 'desert', dist: 450 },
    { name: 'Amarillo, TX', lat: 35.22, lon: -101.83, terrain: 'plains', dist: 290 },
    { name: 'Oklahoma City, OK', lat: 35.47, lon: -97.52, terrain: 'plains', dist: 260 },
    { name: 'St. Louis, MO', lat: 38.63, lon: -90.20, terrain: 'plains', dist: 500 },
    { name: 'Indianapolis, IN', lat: 39.77, lon: -86.16, terrain: 'plains', dist: 240 },
    { name: 'Columbus, OH', lat: 39.96, lon: -82.99, terrain: 'plains', dist: 175 },
    { name: 'Pittsburgh, PA', lat: 40.44, lon: -79.99, terrain: 'mountain', dist: 185 },
    { name: 'Buffalo, NY', lat: 42.89, lon: -78.88, terrain: 'plains', dist: 190 }
  ],

  // --- Sacramento routes ---
  sacramento_boise: [
    { name: 'Sacramento, CA', lat: 38.58, lon: -121.49, terrain: 'valley', dist: 0 },
    { name: 'Reno, NV', lat: 39.53, lon: -119.81, terrain: 'mountain', dist: 135 },
    { name: 'Winnemucca, NV', lat: 40.97, lon: -117.74, terrain: 'desert', dist: 165 },
    { name: 'Twin Falls, ID', lat: 42.56, lon: -114.46, terrain: 'plains', dist: 225 },
    { name: 'Boise, ID', lat: 43.62, lon: -116.21, terrain: 'mountain', dist: 130 }
  ],
  sacramento_minneapolis: [
    { name: 'Sacramento, CA', lat: 38.58, lon: -121.49, terrain: 'valley', dist: 0 },
    { name: 'Reno, NV', lat: 39.53, lon: -119.81, terrain: 'mountain', dist: 135 },
    { name: 'Salt Lake City, UT', lat: 40.76, lon: -111.89, terrain: 'mountain', dist: 520 },
    { name: 'Cheyenne, WY', lat: 41.14, lon: -104.82, terrain: 'plains', dist: 440 },
    { name: 'North Platte, NE', lat: 41.12, lon: -100.77, terrain: 'plains', dist: 240 },
    { name: 'Omaha, NE', lat: 41.26, lon: -95.94, terrain: 'plains', dist: 290 },
    { name: 'Des Moines, IA', lat: 41.59, lon: -93.62, terrain: 'plains', dist: 150 },
    { name: 'Minneapolis, MN', lat: 44.98, lon: -93.27, terrain: 'plains', dist: 245 }
  ],

  // --- Houston routes ---
  houston_minneapolis: [
    { name: 'Houston, TX', lat: 29.76, lon: -95.37, terrain: 'coastal', dist: 0 },
    { name: 'Dallas, TX', lat: 32.78, lon: -96.80, terrain: 'plains', dist: 240 },
    { name: 'Oklahoma City, OK', lat: 35.47, lon: -97.52, terrain: 'plains', dist: 205 },
    { name: 'Wichita, KS', lat: 37.69, lon: -97.34, terrain: 'plains', dist: 160 },
    { name: 'Kansas City, MO', lat: 39.10, lon: -94.58, terrain: 'plains', dist: 200 },
    { name: 'Des Moines, IA', lat: 41.59, lon: -93.62, terrain: 'plains', dist: 195 },
    { name: 'Minneapolis, MN', lat: 44.98, lon: -93.27, terrain: 'plains', dist: 245 }
  ],
  houston_buffalo: [
    { name: 'Houston, TX', lat: 29.76, lon: -95.37, terrain: 'coastal', dist: 0 },
    { name: 'Little Rock, AR', lat: 34.75, lon: -92.29, terrain: 'forest', dist: 450 },
    { name: 'Memphis, TN', lat: 35.15, lon: -90.05, terrain: 'plains', dist: 135 },
    { name: 'Nashville, TN', lat: 36.16, lon: -86.78, terrain: 'hills', dist: 210 },
    { name: 'Louisville, KY', lat: 38.25, lon: -85.76, terrain: 'plains', dist: 175 },
    { name: 'Columbus, OH', lat: 39.96, lon: -82.99, terrain: 'plains', dist: 200 },
    { name: 'Pittsburgh, PA', lat: 40.44, lon: -79.99, terrain: 'mountain', dist: 185 },
    { name: 'Buffalo, NY', lat: 42.89, lon: -78.88, terrain: 'plains', dist: 190 }
  ],

  // --- New Orleans routes ---
  new_orleans_minneapolis: [
    { name: 'New Orleans, LA', lat: 29.95, lon: -90.07, terrain: 'wetland', dist: 0 },
    { name: 'Jackson, MS', lat: 32.30, lon: -90.18, terrain: 'forest', dist: 180 },
    { name: 'Memphis, TN', lat: 35.15, lon: -90.05, terrain: 'plains', dist: 210 },
    { name: 'St. Louis, MO', lat: 38.63, lon: -90.20, terrain: 'plains', dist: 280 },
    { name: 'Des Moines, IA', lat: 41.59, lon: -93.62, terrain: 'plains', dist: 345 },
    { name: 'Minneapolis, MN', lat: 44.98, lon: -93.27, terrain: 'plains', dist: 245 }
  ],
  new_orleans_burlington: [
    { name: 'New Orleans, LA', lat: 29.95, lon: -90.07, terrain: 'wetland', dist: 0 },
    { name: 'Birmingham, AL', lat: 33.52, lon: -86.80, terrain: 'hills', dist: 345 },
    { name: 'Knoxville, TN', lat: 35.96, lon: -83.92, terrain: 'mountain', dist: 250 },
    { name: 'Roanoke, VA', lat: 37.27, lon: -79.94, terrain: 'mountain', dist: 255 },
    { name: 'Washington, DC', lat: 38.91, lon: -77.04, terrain: 'urban', dist: 240 },
    { name: 'Hartford, CT', lat: 41.76, lon: -72.68, terrain: 'forest', dist: 330 },
    { name: 'Burlington, VT', lat: 44.48, lon: -73.21, terrain: 'mountain', dist: 215 }
  ],

  // --- Charleston routes ---
  charleston_buffalo: [
    { name: 'Charleston, SC', lat: 32.78, lon: -79.93, terrain: 'coastal', dist: 0 },
    { name: 'Charlotte, NC', lat: 35.23, lon: -80.84, terrain: 'hills', dist: 200 },
    { name: 'Roanoke, VA', lat: 37.27, lon: -79.94, terrain: 'mountain', dist: 195 },
    { name: 'Pittsburgh, PA', lat: 40.44, lon: -79.99, terrain: 'mountain', dist: 230 },
    { name: 'Buffalo, NY', lat: 42.89, lon: -78.88, terrain: 'plains', dist: 190 }
  ],
  charleston_burlington: [
    { name: 'Charleston, SC', lat: 32.78, lon: -79.93, terrain: 'coastal', dist: 0 },
    { name: 'Raleigh, NC', lat: 35.78, lon: -78.64, terrain: 'forest', dist: 270 },
    { name: 'Richmond, VA', lat: 37.54, lon: -77.44, terrain: 'forest', dist: 170 },
    { name: 'Washington, DC', lat: 38.91, lon: -77.04, terrain: 'urban', dist: 110 },
    { name: 'New York, NY', lat: 40.71, lon: -74.01, terrain: 'urban', dist: 225 },
    { name: 'Hartford, CT', lat: 41.76, lon: -72.68, terrain: 'forest', dist: 115 },
    { name: 'Burlington, VT', lat: 44.48, lon: -73.21, terrain: 'mountain', dist: 215 }
  ],
  charleston_minneapolis: [
    { name: 'Charleston, SC', lat: 32.78, lon: -79.93, terrain: 'coastal', dist: 0 },
    { name: 'Atlanta, GA', lat: 33.75, lon: -84.39, terrain: 'forest', dist: 310 },
    { name: 'Nashville, TN', lat: 36.16, lon: -86.78, terrain: 'hills', dist: 250 },
    { name: 'St. Louis, MO', lat: 38.63, lon: -90.20, terrain: 'plains', dist: 310 },
    { name: 'Des Moines, IA', lat: 41.59, lon: -93.62, terrain: 'plains', dist: 345 },
    { name: 'Minneapolis, MN', lat: 44.98, lon: -93.27, terrain: 'plains', dist: 245 }
  ]
};

export function getRoute(originId, destId) {
  const key = `${originId}_${destId}`;
  if (waypoints[key]) return waypoints[key];

  // Fallback: try to find any route from this origin
  const prefix = `${originId}_`;
  const fallbackKey = Object.keys(waypoints).find(k => k.startsWith(prefix));
  return fallbackKey ? waypoints[fallbackKey] : null;
}

export function getAvailableDestinations(originId) {
  return Object.keys(waypoints)
    .filter(k => k.startsWith(`${originId}_`))
    .map(k => k.slice(originId.length + 1));
}

export function getTotalDistance(route) {
  return route.reduce((sum, wp) => sum + wp.dist, 0);
}
