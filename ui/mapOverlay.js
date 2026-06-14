/**
 * mapOverlay.js — Illustrated USA map with canvas route overlay
 *
 * Displays assets/USA_bitmap_image.png as the map background and draws
 * route lines, city markers, and the player's current position on a
 * canvas overlay using geographic lat/lon coordinates.
 *
 * Public interface:
 *   new MapOverlay(containerEl)
 *   .render(game)
 */

// ── Geographic bounds of the continental US ─────────────────────────────────
const LON_MIN = -124.7;
const LON_MAX = -67.0;
const LAT_MIN = 24.4;
const LAT_MAX = 49.4;

// ── Map content area as fraction of total image dimensions ──────────────────
// Calibrated to the brown border frame in USA_bitmap_image.png.
// Left/right: ~3% margin; Top: ~4%; Bottom: ~5% (thicker decorative border).
const MAP_L = 0.030;
const MAP_R = 0.968;
const MAP_T = 0.038;
const MAP_B = 0.948;

export class MapOverlay {
  constructor(containerEl) {
    this.container = containerEl;
    this._build();
  }

  _build() {
    this.container.classList.add('map-overlay-container');
    this.container.innerHTML = '';

    // Background image
    this.img = document.createElement('img');
    this.img.src = 'assets/USA_bitmap_image.png';
    this.img.alt = 'USA map';
    this.img.className = 'map-bg-img';

    // Canvas overlay (sits on top of the image via CSS position:absolute)
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'map-overlay-canvas';
    this.ctx = this.canvas.getContext('2d');

    this.container.appendChild(this.img);
    this.container.appendChild(this.canvas);

    // Sync canvas size when image loads or the container is resized
    this.img.addEventListener('load', () => this._syncSize());
    const ro = new ResizeObserver(() => this._syncSize());
    ro.observe(this.container);
  }

  _syncSize() {
    const w = this.img.offsetWidth;
    const h = this.img.offsetHeight;
    if (w > 0 && h > 0) {
      // Use devicePixelRatio for crisp rendering on retina screens
      const dpr = window.devicePixelRatio || 1;
      this.canvas.width  = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
      this.canvas.style.width  = w + 'px';
      this.canvas.style.height = h + 'px';
      this._dpr = dpr;
    }
  }

  // Convert lat/lon → canvas pixel coords (in CSS pixels, DPR-independent)
  _xy(lat, lon) {
    const normX = (lon - LON_MIN) / (LON_MAX - LON_MIN);
    const normY = (LAT_MAX - lat) / (LAT_MAX - LAT_MIN); // north = top → 0
    const cssW  = this.canvas.width  / (this._dpr || 1);
    const cssH  = this.canvas.height / (this._dpr || 1);
    return {
      x: (MAP_L + normX * (MAP_R - MAP_L)) * cssW,
      y: (MAP_T + normY * (MAP_B - MAP_T)) * cssH,
    };
  }

  render(game) {
    if (!game || !game.route || game.route.length === 0) return;
    if (!this.canvas.width) return;

    const ctx  = this.ctx;
    const dpr  = this._dpr || 1;
    const cssW = this.canvas.width  / dpr;
    const cssH = this.canvas.height / dpr;

    // Scale all ctx operations by DPR so we draw in CSS-pixel space
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    const route = game.route;
    const wpIdx = game.waypointIndex;

    // ── Route lines ──────────────────────────────────────────────────────────
    for (let i = 0; i < route.length - 1; i++) {
      const a = this._xy(route[i].lat,     route[i].lon);
      const b = this._xy(route[i+1].lat, route[i+1].lon);

      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);

      if (i < wpIdx) {
        // Traveled segment — solid warm amber
        ctx.strokeStyle = 'rgba(200, 120, 30, 0.90)';
        ctx.lineWidth   = 2.5;
        ctx.setLineDash([]);
      } else {
        // Upcoming segment — dashed, lighter
        ctx.strokeStyle = 'rgba(160, 100, 40, 0.45)';
        ctx.lineWidth   = 1.8;
        ctx.setLineDash([5, 4]);
      }
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // ── Waypoint markers ─────────────────────────────────────────────────────
    for (let i = 0; i < route.length; i++) {
      const wp       = route[i];
      const { x, y } = this._xy(wp.lat, wp.lon);
      const isOrigin = i === 0;
      const isDest   = i === route.length - 1;
      const isPast   = i < wpIdx;
      const isCur    = i === wpIdx;

      if (isOrigin) {
        // Origin: red square flag
        this._drawFlag(ctx, x, y, '#c03010');
        this._drawLabel(ctx, wp.name.split(',')[0], x, y - 12);
      } else if (isDest) {
        // Destination: green star
        this._drawStar(ctx, x, y, '#1a9040', 7);
        this._drawLabel(ctx, wp.name.split(',')[0], x, y - 12);
      } else {
        // Mid-route city dot
        const r     = 3.5;
        const fill  = isPast || isCur ? 'rgba(200,120,30,0.85)' : 'rgba(150,100,50,0.40)';
        const stroke = isPast || isCur ? '#6b2e0a' : 'rgba(100,70,30,0.35)';
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle   = fill;
        ctx.fill();
        ctx.strokeStyle = stroke;
        ctx.lineWidth   = 1;
        ctx.stroke();
      }
    }

    // ── Current position (interpolated between waypoints) ────────────────────
    let posX, posY;
    const curWp  = route[wpIdx];
    const nextWp = route[wpIdx + 1];

    if (nextWp && nextWp.dist > 0) {
      const frac = Math.max(0, Math.min(1,
        1 - (game.distanceToNextWaypoint / nextWp.dist)
      ));
      const a = this._xy(curWp.lat,  curWp.lon);
      const b = this._xy(nextWp.lat, nextWp.lon);
      posX = a.x + (b.x - a.x) * frac;
      posY = a.y + (b.y - a.y) * frac;
    } else {
      ({ x: posX, y: posY } = this._xy(curWp.lat, curWp.lon));
    }

    // Pulsing red dot with white ring
    const pulse = 0.75 + 0.25 * Math.sin(Date.now() / 350);
    const pr    = 6 * pulse;

    // Outer glow
    ctx.beginPath();
    ctx.arc(posX, posY, pr + 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 80, 20, 0.25)';
    ctx.fill();

    // White ring
    ctx.beginPath();
    ctx.arc(posX, posY, pr, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth   = 1.5;
    ctx.stroke();

    // Red core
    ctx.beginPath();
    ctx.arc(posX, posY, pr - 1.5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(230, 50, 10, 0.92)';
    ctx.fill();
  }

  // ── Drawing helpers ─────────────────────────────────────────────────────────

  _drawFlag(ctx, x, y, color) {
    // Small flag: vertical pole + triangular banner
    const poleH = 11;
    ctx.strokeStyle = '#3a1a00';
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - poleH);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x, y - poleH);
    ctx.lineTo(x + 7, y - poleH + 3);
    ctx.lineTo(x, y - poleH + 6);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();

    // Base dot
    ctx.beginPath();
    ctx.arc(x, y, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#3a1a00';
    ctx.fill();
  }

  _drawStar(ctx, x, y, color, r) {
    const pts = 5;
    ctx.beginPath();
    for (let i = 0; i < pts * 2; i++) {
      const radius = i % 2 === 0 ? r : r * 0.45;
      const angle  = (i * Math.PI / pts) - Math.PI / 2;
      const px = x + radius * Math.cos(angle);
      const py = y + radius * Math.sin(angle);
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle   = color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth   = 1;
    ctx.stroke();
  }

  _drawLabel(ctx, text, x, y) {
    ctx.font      = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    // White outline for legibility against any state color
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth   = 3;
    ctx.strokeText(text, x, y);
    ctx.fillStyle = '#2a0e00';
    ctx.fillText(text, x, y);
  }
}
