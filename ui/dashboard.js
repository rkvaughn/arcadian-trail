export class Dashboard {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.bars = {};
    this.init();
  }

  init() {
    this.container.innerHTML = '';
    const resources = ['fuel', 'water', 'food', 'health', 'morale'];
    const icons = {
      fuel: '\u26FD',
      water: '\uD83D\uDCA7',
      food: '\uD83C\uDF5E',
      health: '\u2764\uFE0F',
      morale: '\u2B50'
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
        fill: bar.querySelector('.resource-fill'),
        value: bar.querySelector('.resource-value')
      };
    }
  }

  update(resources) {
    for (const [res, val] of Object.entries(resources)) {
      if (!this.bars[res]) continue;
      const rounded = Math.round(val);
      const pct = Math.max(0, Math.min(100, rounded));

      this.bars[res].value.textContent = rounded;
      this.bars[res].fill.style.width = `${pct}%`;

      // Color based on value
      let color;
      if (pct > 60) color = '#2ecc71';
      else if (pct > 30) color = '#f39c12';
      else if (pct > 15) color = '#e67e22';
      else color = '#e74c3c';

      this.bars[res].fill.style.backgroundColor = color;
    }
  }
}
