// US boundary (simplified polygon for clipping/background)
const US_BOUNDS = { minLat: 24, maxLat: 49, minLon: -125, maxLon: -66 };

export class MapRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const container = this.canvas.parentElement;
    if (container) {
      this.canvas.width = container.clientWidth;
      this.canvas.height = Math.min(400, container.clientWidth * 0.5);
    }
  }

  // Convert lat/lon to canvas coordinates
  project(lat, lon) {
    const x = ((lon - US_BOUNDS.minLon) / (US_BOUNDS.maxLon - US_BOUNDS.minLon)) * this.canvas.width;
    const y = ((US_BOUNDS.maxLat - lat) / (US_BOUNDS.maxLat - US_BOUNDS.minLat)) * this.canvas.height;
    return { x, y };
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  render(game, weatherData) {
    this.clear();
    this.drawBackground();
    if (game.route.length > 0) {
      this.drawRoute(game.route, game.waypointIndex);
      this.drawWaypoints(game.route, game.waypointIndex, weatherData);
      this.drawPlayer(game);
      this.drawLabels(game);
    }
  }

  drawBackground() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Dark gradient background
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#1a1a2e');
    grad.addColorStop(1, '#16213e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Subtle grid
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  }

  drawRoute(route, currentIdx) {
    const ctx = this.ctx;

    // Draw full route line (dim)
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 2;
    for (let i = 0; i < route.length; i++) {
      const p = this.project(route[i].lat, route[i].lon);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();

    // Draw traveled portion (bright)
    if (currentIdx > 0) {
      ctx.beginPath();
      ctx.strokeStyle = '#e94560';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#e94560';
      ctx.shadowBlur = 8;
      for (let i = 0; i <= currentIdx; i++) {
        const p = this.project(route[i].lat, route[i].lon);
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }

  drawWaypoints(route, currentIdx, weatherData) {
    const ctx = this.ctx;

    for (let i = 0; i < route.length; i++) {
      const wp = route[i];
      const p = this.project(wp.lat, wp.lon);

      const isVisited = i <= currentIdx;
      const isCurrent = i === currentIdx;
      const isDestination = i === route.length - 1;

      // Waypoint dot
      ctx.beginPath();
      if (isDestination) {
        ctx.fillStyle = '#ffd700';
        ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
      } else if (isCurrent) {
        ctx.fillStyle = '#e94560';
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      } else if (isVisited) {
        ctx.fillStyle = '#e94560';
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      }
      ctx.fill();

      // Weather icon at current waypoint
      if (isCurrent && weatherData && weatherData.icon) {
        this.drawWeatherIcon(p.x + 12, p.y - 12, weatherData.icon);
      }

      // Terrain indicator
      if (isCurrent || isDestination || i === 0) {
        const terrainColors = {
          coastal: '#4ecdc4', wetland: '#45b7d1', forest: '#2ecc71',
          plains: '#f39c12', desert: '#e74c3c', mountain: '#9b59b6',
          hills: '#8e6f47', urban: '#95a5a6', valley: '#27ae60'
        };
        const color = terrainColors[wp.terrain] || '#fff';
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(p.x, p.y + 10, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  drawPlayer(game) {
    const ctx = this.ctx;
    const route = game.route;
    const idx = game.waypointIndex;
    const current = route[idx];
    const next = route[idx + 1];

    let playerPos;
    if (next) {
      // Interpolate between waypoints
      const totalDist = next.dist;
      const remaining = game.distanceToNextWaypoint;
      const t = totalDist > 0 ? 1 - (remaining / totalDist) : 0;
      const clampedT = Math.max(0, Math.min(1, t));

      const p1 = this.project(current.lat, current.lon);
      const p2 = this.project(next.lat, next.lon);
      playerPos = {
        x: p1.x + (p2.x - p1.x) * clampedT,
        y: p1.y + (p2.y - p1.y) * clampedT
      };
    } else {
      playerPos = this.project(current.lat, current.lon);
    }

    // Pulsing glow
    const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 300);

    ctx.beginPath();
    ctx.fillStyle = `rgba(233, 69, 96, ${0.3 + pulse * 0.3})`;
    ctx.arc(playerPos.x, playerPos.y, 10 + pulse * 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.fillStyle = '#fff';
    ctx.arc(playerPos.x, playerPos.y, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  drawLabels(game) {
    const ctx = this.ctx;
    const route = game.route;

    // Origin label
    const origin = route[0];
    const pOrigin = this.project(origin.lat, origin.lon);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(origin.name, pOrigin.x, pOrigin.y - 12);

    // Destination label
    const dest = route[route.length - 1];
    const pDest = this.project(dest.lat, dest.lon);
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(dest.name, pDest.x, pDest.y - 14);

    // Current waypoint label
    const current = route[game.waypointIndex];
    if (game.waypointIndex > 0 && game.waypointIndex < route.length - 1) {
      const pCurr = this.project(current.lat, current.lon);
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = '10px monospace';
      ctx.fillText(current.name, pCurr.x, pCurr.y - 10);
    }

    // Progress bar at bottom
    const progress = game.getProgress();
    const barY = this.canvas.height - 8;
    const barW = this.canvas.width - 40;

    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(20, barY, barW, 4);

    ctx.fillStyle = '#e94560';
    ctx.fillRect(20, barY, barW * progress, 4);

    // Distance text
    const remaining = Math.max(0, game.totalDistance - game.totalDistanceTraveled);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.round(remaining)} mi remaining`, this.canvas.width - 20, barY - 4);
    ctx.textAlign = 'left';
    ctx.fillText(`Day ${game.day}`, 20, barY - 4);
  }

  drawWeatherIcon(x, y, icon) {
    const ctx = this.ctx;
    ctx.font = '14px sans-serif';
    const iconMap = {
      'clear': '\u2600',
      'clouds': '\u2601',
      'rain': '\uD83C\uDF27',
      'storm': '\u26C8',
      'snow': '\u2744',
      'mist': '\uD83C\uDF2B',
      'hot': '\uD83D\uDD25',
      'wind': '\uD83D\uDCA8'
    };
    ctx.fillText(iconMap[icon] || '\u2600', x, y);
  }
}
