import { SSP_DEFS, YEAR_DEFS } from '../data/ssp.js';

export class Dashboard {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.bars = {};
    this.init();
  }

  init() {
    this.container.innerHTML = '';

    // Scenario badge — populated by setScenario() once game starts
    const badge = document.createElement('div');
    badge.id = 'scenario-badge';
    badge.className = 'scenario-badge';
    badge.style.display = 'none';
    this.container.appendChild(badge);

    // Active hazard indicator — shown when a multi-tick hazard is active
    const hazardBar = document.createElement('div');
    hazardBar.id = 'hazard-indicator';
    hazardBar.className = 'hazard-indicator';
    hazardBar.style.display = 'none';
    this.container.appendChild(hazardBar);

    const resources = ['fuel', 'water', 'food', 'health', 'morale'];
    const icons = {
      fuel:   '⛽',
      water:  '💧',
      food:   '🍞',
      health: '❤️',
      morale: '⭐'
    };

    for (const res of resources) {
      const bar = document.createElement('div');
      bar.className = 'resource-bar';
      bar.innerHTML = `
        <div class="resource-label">
          <span class="resource-icon">${icons[res]}</span>
          <span class="resource-name">${res}</span>
        </div>
        <div class="resource-track">
          <div class="resource-fill" id="bar-${res}"></div>
        </div>
        <span class="resource-value" id="val-${res}">100</span>
      `;
      this.container.appendChild(bar);
      this.bars[res] = {
        fill:  bar.querySelector('.resource-fill'),
        value: bar.querySelector('.resource-value')
      };
    }
  }

  /**
   * Show the scenario badge above the resource bars.
   * Called once from GameController.beginGame() after game.setup().
   *
   * @param {string} ssp  — 'SSP2-4.5' | 'SSP3-7.0' | 'SSP5-8.5'
   * @param {number} year — 2050 | 2075 | 2100
   */
  setScenario(ssp, year) {
    const badge  = document.getElementById('scenario-badge');
    const sspDef  = SSP_DEFS[ssp];
    const yearDef = YEAR_DEFS[year];
    if (!badge || !sspDef || !yearDef) return;

    badge.innerHTML = `
      <span class="scenario-ssp" style="color:${sspDef.color}">${ssp}</span>
      <span class="scenario-sep">·</span>
      <span class="scenario-year">${year}</span>
      <span class="scenario-sep">·</span>
      <span class="scenario-difficulty" style="color:${sspDef.color}">${yearDef.label}</span>
    `;
    badge.style.display = 'flex';
  }

  /**
   * Show or update the active hazard indicator.
   * Pass null to hide it.
   *
   * @param {object|null} hazard — game.activeHazard or null
   */
  setActiveHazard(hazard) {
    const el = document.getElementById('hazard-indicator');
    if (!el) return;

    if (!hazard) {
      el.style.display = 'none';
      el.textContent = '';
      return;
    }

    const label = hazard.type === 'heat'
      ? `⚠ Heatwave active — ${hazard.ticksRemaining} day${hazard.ticksRemaining !== 1 ? 's' : ''} remaining`
      : `⚠ ${hazard.type} hazard — ${hazard.ticksRemaining} day${hazard.ticksRemaining !== 1 ? 's' : ''} remaining`;

    el.textContent = label;
    el.style.display = 'block';
  }

  update(resources) {
    for (const [res, val] of Object.entries(resources)) {
      if (!this.bars[res]) continue;
      const rounded = Math.round(val);
      const pct = Math.max(0, Math.min(100, rounded));

      this.bars[res].value.textContent = rounded;
      this.bars[res].fill.style.width = `${pct}%`;

      let color;
      if (pct > 60)      color = '#2ecc71';
      else if (pct > 30) color = '#f39c12';
      else if (pct > 15) color = '#e67e22';
      else               color = '#e74c3c';

      this.bars[res].fill.style.backgroundColor = color;
    }
  }
}
