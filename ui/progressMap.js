// Simplified ASCII US map for route progress display
// Coordinate space: lat 25–49°N, lon -124 to -67°W
// Grid: 48 cols x 13 rows

const MAP_COLS = 48;
const MAP_ROWS = 13;
const LAT_MIN = 25;
const LAT_MAX = 49;
const LON_MIN = -124;
const LON_MAX = -67;

// Simplified continental US outline: '.' = land, ' ' = empty
// Row 0 = 49°N (Canada border), Row 12 = 25°N (S Florida)
// City positions verified: Sacramento(5,2) Phoenix(8,10) Boise(3,6)
// SLC(4,10) Minneapolis(2,25) Chicago(4,30) Atlanta(8,33)
// Houston(10,24) NewOrleans(10,28) Charleston(8,36) Miami(12,36)
// Buffalo(3,37) Burlington(2,42)
const US_MAP = [
  " .....                .........    ......  ", // row 0  ~49°N WA/MT..ND/MN..NY/VT/ME
  " ......           ...................  .... ", // row 1  ~47°N
  " .......      .............................  ", // row 2  ~45°N  OR..MN..Burlington
  " ........  ............................... ", // row 3  ~43°N  ID..WI..Buffalo
  "  ..........  ............................  ", // row 4  ~41°N  NV/UT..Chicago..PA
  "  ..........  ...........................   ", // row 5  ~39°N  Sacramento..KS..VA
  "   ......... ............................   ", // row 6  ~37°N
  "    .......  ............................   ", // row 7  ~35°N  AZ..OK..NC
  "     ......    .........................    ", // row 8  ~33°N  Phoenix..Atlanta..Charleston
  "               ..........  ...........     ", // row 9  ~31°N
  "               ................  ......     ", // row 10 ~29°N  Houston..NewOrleans..FL
  "                .....          .....       ", // row 11 ~27°N  TX tip..FL
  "                                .....      ", // row 12 ~25°N  Miami/Keys
];

function latToRow(lat) {
  return Math.round((LAT_MAX - lat) / (LAT_MAX - LAT_MIN) * (MAP_ROWS - 1));
}

function lonToCol(lon) {
  return Math.round((lon - LON_MIN) / (LON_MAX - LON_MIN) * (MAP_COLS - 1));
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export class ProgressMap {
  constructor(el) {
    this.el = el;
    this.lastKey = null;
  }

  render(game) {
    if (!game || !game.route || game.route.length === 0) return;

    // Build cache key to skip redundant renders
    const key = `${game.waypointIndex}-${game.totalDistanceTraveled | 0}`;
    if (key === this.lastKey) return;
    this.lastKey = key;

    // Deep copy the base map
    const grid = US_MAP.map(line => line.padEnd(MAP_COLS).split(''));

    // Plot all waypoints as dim markers
    for (let i = 0; i < game.route.length; i++) {
      const wp = game.route[i];
      const row = latToRow(wp.lat);
      const col = lonToCol(wp.lon);
      if (row >= 0 && row < MAP_ROWS && col >= 0 && col < MAP_COLS) {
        grid[row][col] = i <= game.waypointIndex ? '+' : 'o';
      }
    }

    // Draw route lines between waypoints (simple bresenham-ish)
    for (let i = 0; i < game.route.length - 1; i++) {
      const a = game.route[i];
      const b = game.route[i + 1];
      const r1 = latToRow(a.lat), c1 = lonToCol(a.lon);
      const r2 = latToRow(b.lat), c2 = lonToCol(b.lon);
      this.drawLine(grid, r1, c1, r2, c2, i < game.waypointIndex ? '*' : '-');
    }

    // Re-plot waypoint markers on top of lines
    for (let i = 0; i < game.route.length; i++) {
      const wp = game.route[i];
      const row = latToRow(wp.lat);
      const col = lonToCol(wp.lon);
      if (row >= 0 && row < MAP_ROWS && col >= 0 && col < MAP_COLS) {
        grid[row][col] = i <= game.waypointIndex ? '+' : 'o';
      }
    }

    // Plot current position
    const currentWp = game.route[game.waypointIndex];
    const nextWp = game.route[game.waypointIndex + 1];
    if (currentWp && nextWp) {
      const progress = nextWp.dist > 0
        ? Math.max(0, 1 - (game.distanceToNextWaypoint / nextWp.dist))
        : 0;
      const cr = latToRow(currentWp.lat + (nextWp.lat - currentWp.lat) * progress);
      const cc = lonToCol(currentWp.lon + (nextWp.lon - currentWp.lon) * progress);
      if (cr >= 0 && cr < MAP_ROWS && cc >= 0 && cc < MAP_COLS) {
        grid[cr][cc] = '@';
      }
    } else if (currentWp) {
      const cr = latToRow(currentWp.lat);
      const cc = lonToCol(currentWp.lon);
      if (cr >= 0 && cr < MAP_ROWS && cc >= 0 && cc < MAP_COLS) {
        grid[cr][cc] = '@';
      }
    }

    // Render with color spans
    const lines = grid.map(row => {
      let html = '';
      for (const ch of row) {
        if (ch === '@') {
          html += `<span class="map-player">@</span>`;
        } else if (ch === '+' || ch === '*') {
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
        // Don't overwrite waypoint markers
        if (grid[r][c] === '.' || grid[r][c] === ' ') {
          grid[r][c] = ch;
        }
      }
    }
  }
}
