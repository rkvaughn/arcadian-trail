export class EventPanel {
  constructor(containerId, onChoice) {
    this.container = document.getElementById(containerId);
    this.onChoice = onChoice;
  }

  show(event) {
    this.container.innerHTML = '';
    this.container.classList.add('active');

    const perilIcons = {
      wildfire: '\uD83D\uDD25', hurricane: '\uD83C\uDF00', flood: '\uD83C\uDF0A',
      heat: '\u2600\uFE0F', tornado: '\uD83C\uDF2A\uFE0F', infrastructure: '\u26A0\uFE0F',
      health: '\uD83E\uDE7A', mechanical: '\uD83D\uDD27', social: '\uD83D\uDC65',
      positive: '\u2728'
    };

    const icon = perilIcons[event.perilType] || '\u26A0\uFE0F';

    const card = document.createElement('div');
    card.className = 'event-card';
    card.innerHTML = `
      <div class="event-header">
        <span class="event-icon">${icon}</span>
        <h3 class="event-name">${event.name}</h3>
      </div>
      <p class="event-desc">${event.description}</p>
      <div class="event-choices"></div>
    `;

    const choicesDiv = card.querySelector('.event-choices');
    event.choices.forEach((choice, idx) => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.textContent = choice.text;
      btn.addEventListener('click', () => {
        this.onChoice(idx);
      });
      choicesDiv.appendChild(btn);
    });

    this.container.appendChild(card);
  }

  showResult(result) {
    this.container.innerHTML = '';

    const card = document.createElement('div');
    card.className = 'event-card result-card';

    // Format effects
    let effectsHtml = '';
    if (result.effects) {
      const entries = Object.entries(result.effects);
      effectsHtml = entries.map(([resource, value]) => {
        const sign = value >= 0 ? '+' : '';
        const cls = value >= 0 ? 'effect-positive' : 'effect-negative';
        return `<span class="${cls}">${sign}${value} ${resource}</span>`;
      }).join(' ');
    }

    card.innerHTML = `
      <p class="result-narrative">${result.narrative}</p>
      <div class="result-effects">${effectsHtml}</div>
      <button class="btn-continue" id="btn-continue">Continue Journey</button>
    `;

    this.container.appendChild(card);

    document.getElementById('btn-continue').addEventListener('click', () => {
      this.hide();
      this.onChoice('continue');
    });
  }

  hide() {
    this.container.innerHTML = '';
    this.container.classList.remove('active');
  }
}
