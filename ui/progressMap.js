// ASCII US progress map — adapted from asciiart.cc/view/12125
// Route overlay with color-coded markers

const MAP_ROWS = 21;
const MAP_COLS = 66;

// Base map outline — state borders and coastline
const US_MAP = [
  "         ,__                                                  _,",
  " \\~\\|  ~~---___              ,                          | \\",
  "  |      / |   ~~~~~~~|~~~~~| ~~---,                  _/  >",
  " /~-_--__| |          |     \\     / ~\\~~/        /~|  |,'",
  " |       /  \\         |------|   {    / /~)    __- ',| \\  ",
  "/       |    |~~~~~~~~|      \\    \\   | | '~\\ |_____|~,-'  ",
  "|~~--__ |    |        |____  |~~~~~|--| |__ /_-'     {,~    ",
  "|   |  ~~~|~~|        |    ~~\\     /  `-' |`~ |_____{/     ",
  "|   |     |  '---------.     \\----| . | . | ,' ~/~\\,|`    ",
  "',  \\     |    |       |~~~~~~~|    \\  | ,'~~\\  /    |",
  " |   \\    |    |       |      |     \\_-~    /`~___--\\",
  " ',   \\  ,-----|-------+-------'_____/__----~~/      /",
  "  '_   '\\|     |      |~~~|     |    |      _/-,~~-,/",
  "    \\    |     |      |   |_    |   /~~|~~\\    \\,/     ",
  "     ~~~-'     |      |     `~~~\\___| . | . |    /",
  "         '-,_  | _____|          |  /   | ,-'---~\\",
  "             `~'~  \\             |  `--,~~~~-~~,  \\",
  "                    \\/~\\      /~~~`---`         |  \\",
  "                        \\    /                   \\  |",
  "                         \\  |                     \\'",
  "                          `~'",
];

// Manual city → grid position lookup (row, col) calibrated to the ASCII art
const CITY_POS = {
  // Origins
  'Miami, FL':        [18, 59],
  'Phoenix, AZ':      [13, 10],
  'Sacramento, CA':   [10,  2],
  'Houston, TX':      [17, 30],
  'New Orleans, LA':  [16, 38],
  'Charleston, SC':   [13, 57],
  // Destinations
  'Minneapolis, MN':  [ 3, 37],
  'Buffalo, NY':      [ 5, 52],
  'Boise, ID':        [ 5,  9],
  'Burlington, VT':   [ 2, 57],
  // Waypoints
  'Orlando, FL':      [16, 55],
  'Jacksonville, FL': [15, 55],
  'Atlanta, GA':      [14, 51],
  'Nashville, TN':    [12, 45],
  'Louisville, KY':   [10, 47],
  'Indianapolis, IN': [ 8, 44],
  'Chicago, IL':      [ 8, 41],
  'Milwaukee, WI':    [ 4, 38],
  'Savannah, GA':     [14, 54],
  'Charlotte, NC':    [11, 54],
  'Roanoke, VA':      [ 9, 55],
  'Pittsburgh, PA':   [ 6, 50],
  'Richmond, VA':     [ 9, 56],
  'Washington, DC':   [ 8, 56],
  'Philadelphia, PA': [ 7, 57],
  'Hartford, CT':     [ 6, 58],
  'New York, NY':     [ 6, 55],
  'Flagstaff, AZ':    [12, 12],
  'Albuquerque, NM':  [13, 19],
  'Amarillo, TX':     [12, 25],
  'Oklahoma City, OK':[12, 33],
  'Kansas City, MO':  [10, 37],
  'Des Moines, IA':   [ 7, 35],
  'St. Louis, MO':    [10, 40],
  'Wichita, KS':      [ 9, 33],
  'Page, AZ':         [11, 12],
  'Salt Lake City, UT':[ 9, 17],
  'Twin Falls, ID':   [ 5, 11],
  'Reno, NV':         [ 8,  6],
  'Winnemucca, NV':   [ 7,  8],
  'Cheyenne, WY':     [ 6, 22],
  'North Platte, NE': [ 8, 26],
  'Omaha, NE':        [ 8, 33],
  'Dallas, TX':       [15, 30],
  'Little Rock, AR':  [13, 38],
  'Memphis, TN':      [12, 40],
  'Columbus, OH':     [ 8, 48],
  'Jackson, MS':      [14, 41],
  'Birmingham, AL':   [13, 47],
  'Knoxville, TN':    [12, 48],
  'Raleigh, NC':      [11, 56],
};

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function getCityPos(name) {
  return CITY_POS[name] || null;
}

export class ProgressMap {
  constructor(el) {
    this.el = el;
    this.lastKey = null;
  }

  render(game) {
    if (!game || !game.route || game.route.length === 0) return;

    // Cache key — skip redundant renders
    const key = `${game.waypointIndex}-${game.totalDistanceTraveled | 0}`;
    if (key === this.lastKey) return;
    this.lastKey = key;

    // Deep copy the base map
    const grid = US_MAP.map(line => line.padEnd(MAP_COLS).split(''));

    // Draw route lines between waypoints
    for (let i = 0; i < game.route.length - 1; i++) {
      const posA = getCityPos(game.route[i].name);
      const posB = getCityPos(game.route[i + 1].name);
      if (posA && posB) {
        const ch = i < game.waypointIndex ? '=' : '-';
        this.drawLine(grid, posA[0], posA[1], posB[0], posB[1], ch);
      }
    }

    // Plot waypoint markers on top of lines
    for (let i = 0; i < game.route.length; i++) {
      const pos = getCityPos(game.route[i].name);
      if (!pos) continue;
      const [row, col] = pos;
      if (row >= 0 && row < MAP_ROWS && col >= 0 && col < MAP_COLS) {
        grid[row][col] = i <= game.waypointIndex ? '#' : 'o';
      }
    }

    // Plot current position (interpolated between waypoints)
    const currentWp = game.route[game.waypointIndex];
    const nextWp = game.route[game.waypointIndex + 1];
    const posA = currentWp ? getCityPos(currentWp.name) : null;
    const posB = nextWp ? getCityPos(nextWp.name) : null;

    if (posA && posB && nextWp.dist > 0) {
      const progress = Math.max(0, 1 - (game.distanceToNextWaypoint / nextWp.dist));
      const cr = Math.round(posA[0] + (posB[0] - posA[0]) * progress);
      const cc = Math.round(posA[1] + (posB[1] - posA[1]) * progress);
      if (cr >= 0 && cr < MAP_ROWS && cc >= 0 && cc < MAP_COLS) {
        grid[cr][cc] = '@';
      }
    } else if (posA) {
      grid[posA[0]][posA[1]] = '@';
    }

    // Render with color spans
    const lines = grid.map(row => {
      let html = '';
      for (const ch of row) {
        if (ch === '@') {
          html += '<span class="map-player">@</span>';
        } else if (ch === '#' || ch === '=') {
          html += `<span class="map-visited">${escapeHtml(ch)}</span>`;
        } else if (ch === 'o' || ch === '-') {
          html += `<span class="map-route">${escapeHtml(ch)}</span>`;
        } else {
          html += escapeHtml(ch);
        }
      }
      return html;
    });

    this.el.innerHTML = lines.join('\n');
  }

  drawLine(grid, r1, c1, r2, c2, ch) {
    const steps = Math.max(Math.abs(r2 - r1), Math.abs(c2 - c1));
    if (steps === 0) return;
    for (let s = 1; s < steps; s++) {
      const r = Math.round(r1 + (r2 - r1) * s / steps);
      const c = Math.round(c1 + (c2 - c1) * s / steps);
      if (r >= 0 && r < MAP_ROWS && c >= 0 && c < MAP_COLS) {
        grid[r][c] = ch;
      }
    }
  }
}
