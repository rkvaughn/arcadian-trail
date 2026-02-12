// ASCII US progress map — based on asciiart.cc/view/12125
// Route overlay with color-coded markers

const MAP_ROWS = 21;

/* eslint-disable no-useless-escape */
// Original art preserved with state labels for orientation.
// Each line padded to uniform width for grid operations.
const US_MAP = [
  "         ,__                                                  _,  ",
  " \\~\\|  ~~---___              ,                          | \\  ",
  "  | Wash./ |   ~~~~~~~|~~~~~| ~~---,                VT_/,ME>  ",
  " /~-_--__| |  Montana |N Dak\\ Minn/ ~\\~~/Mich.     /~| ||,' ",
  " |Oregon /  \\         |------|   { WI / /~)     __-NY',|_\\,NH",
  "/       |Ida.|~~~~~~~~|S Dak.\\    \\   | | '~\\  |_____|~,-'Mass.",
  "|~~--__ |    | Wyoming|____  |~~~~~|--| |__ /_-'Penn.{,~Conn (RI)",
  "|   |  ~~~|~~|        |    ~~\\ Iowa/  `-' |`~ |_____{/NJ     ",
  "|   |     |  '---------, Nebr.\\----| IL|IN|OH,' ~/~\\,|`MD (DE)",
  "',  \\ Nev.|Utah| Colo. |~~~~~~~|    \\  | ,'~~\\WV/ VA |       ",
  " |Cal\\    |    |       | Kansas| MO  \\_-~ KY /`~___--\\       ",
  " ',   \\  ,-----|-------+-------'_____/__----~~/N Car./        ",
  "  '_   '\\|     |      |~~~|Okla.|    | Tenn._/-,~~-,/         ",
  "    \\    |Ariz.| New  |   |_    |Ark./~~|~~\\    \\,/S Car.    ",
  "     ~~~-'     | Mex. |     `~~~\\___| MS |AL | GA /           ",
  "         '-,_  | _____|          |  /   | ,-'---~\\            ",
  "             `~'~  \\    Texas    |LA`--,~~~~-~~,FL\\           ",
  "                    \\/~\\      /~~~`---`         |  \\         ",
  "                        \\    /                   \\  |         ",
  "                         \\  |                     \\'          ",
  "                          `~'                                  ",
];
/* eslint-enable no-useless-escape */

const MAP_COLS = US_MAP.reduce((max, l) => Math.max(max, l.length), 0);

// Manual city → grid position lookup (row, col) calibrated to the art.
// Positions verified by counting characters in each row.
const CITY_POS = {
  // Origins
  'Miami, FL':        [18, 52],
  'Phoenix, AZ':      [13,  9],
  'Sacramento, CA':   [ 9,  5],
  'Houston, TX':      [16, 26],
  'New Orleans, LA':  [16, 35],
  'Charleston, SC':   [13, 51],
  // Destinations
  'Minneapolis, MN':  [ 3, 35],
  'Buffalo, NY':      [ 4, 51],
  'Boise, ID':        [ 5,  9],
  'Burlington, VT':   [ 2, 55],
  // Waypoints — Florida
  'Orlando, FL':      [16, 49],
  'Jacksonville, FL': [15, 48],
  // Waypoints — Southeast
  'Savannah, GA':     [14, 48],
  'Atlanta, GA':      [14, 44],
  'Charlotte, NC':    [11, 50],
  'Raleigh, NC':      [11, 51],
  'Charleston, SC':   [13, 51],
  'Birmingham, AL':   [14, 40],
  'Jackson, MS':      [14, 37],
  // Waypoints — Mid-Atlantic / Northeast
  'Roanoke, VA':      [ 9, 52],
  'Richmond, VA':     [ 9, 53],
  'Washington, DC':   [ 8, 54],
  'Pittsburgh, PA':   [ 6, 48],
  'Philadelphia, PA': [ 7, 53],
  'New York, NY':     [ 5, 52],
  'Hartford, CT':     [ 6, 56],
  // Waypoints — Midwest
  'Nashville, TN':    [12, 42],
  'Knoxville, TN':    [12, 44],
  'Louisville, KY':   [10, 44],
  'Indianapolis, IN': [ 8, 42],
  'Chicago, IL':      [ 8, 39],
  'Milwaukee, WI':    [ 4, 36],
  'Columbus, OH':     [ 8, 46],
  'St. Louis, MO':    [10, 38],
  'Memphis, TN':      [12, 38],
  'Little Rock, AR':  [13, 36],
  'Des Moines, IA':   [ 7, 33],
  'Kansas City, MO':  [10, 35],
  'Wichita, KS':      [10, 32],
  'Omaha, NE':        [ 8, 31],
  'North Platte, NE': [ 8, 28],
  // Waypoints — South Central
  'Dallas, TX':       [15, 27],
  'Oklahoma City, OK':[12, 30],
  'Amarillo, TX':     [12, 24],
  // Waypoints — Mountain West
  'Albuquerque, NM':  [13, 18],
  'Flagstaff, AZ':    [12, 12],
  'Page, AZ':         [11, 12],
  'Salt Lake City, UT':[ 9, 16],
  'Cheyenne, WY':     [ 6, 22],
  'Twin Falls, ID':   [ 5, 12],
  // Waypoints — Pacific
  'Reno, NV':         [ 9,  8],
  'Winnemucca, NV':   [ 7,  8],
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
    const grid = US_MAP.map(line => {
      const padded = line.padEnd(MAP_COLS);
      return padded.split('');
    });

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
