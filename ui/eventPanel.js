import { hurricaneCardHtml } from './hurricaneCard.js';

export class EventPanel {
  constructor(containerId, onChoice) {
    this.container = document.getElementById(containerId);
    this.onChoice = onChoice;
  }

  /**
   * @param {object} event
   * @param {object} [context] — { waypoint } where the event fired; used to
   *   attach real-world data (e.g. HUTrackDB landfall record for hurricanes)
   */
  show(event, context = {}) {
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
      ${event.perilType === 'hurricane' && context.waypoint
        ? hurricaneCardHtml(context.waypoint.name) : ''}
      <div class="event-choices"></div>
    `;

    const choicesDiv = card.querySelector('.event-choices');
    event.choices.forEach((choice, idx) => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.textContent = choice.text;
      btn.addEventListener('click', () => {
        // Animate the selected choice before loading result
        choicesDiv.querySelectorAll('.choice-btn').forEach(b => {
          b.disabled = true;
          b.classList.add('choice-btn-unchosen');
        });
        btn.classList.remove('choice-btn-unchosen');
        btn.classList.add('choice-btn-chosen');
        setTimeout(() => this.onChoice(idx), 480);
      });
      choicesDiv.appendChild(btn);
    });

    this.container.appendChild(card);
  }

  showResult(result, delay = 1500) {
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

    const deathHtml = result.death
      ? `<p class="result-death">\u2620\uFE0F ${result.death.message}</p>`
      : '';

    card.innerHTML = `
      <p class="result-narrative">${result.narrative}</p>
      <div class="result-effects">${effectsHtml}</div>
      ${deathHtml}
      <button class="btn-continue" id="btn-continue" style="display:none">Continue Journey</button>
    `;

    this.container.appendChild(card);

    // Delay before showing continue button so player can read the result
    const btn = document.getElementById('btn-continue');
    setTimeout(() => {
      btn.style.display = '';
    }, delay);

    btn.addEventListener('click', () => {
      this.hide();
      this.onChoice('continue');
    });
  }

  showWaypoint(waypointName, nextTerrain, onChoice) {
    this.container.innerHTML = '';
    this.container.classList.add('active');

    const terrainLabels = {
      plains: 'Plains', desert: 'Desert', mountain: 'Mountain', forest: 'Forest',
      coastal: 'Coastal', urban: 'Urban', wetland: 'Wetland', hills: 'Hills', valley: 'Valley'
    };
    const terrainLabel = terrainLabels[nextTerrain] || nextTerrain;

    const card = document.createElement('div');
    card.className = 'event-card waypoint-card';
    card.innerHTML = `
      <div class="event-header">
        <span class="event-icon">📍</span>
        <h3 class="event-name">${waypointName}</h3>
      </div>
      <p class="event-desc waypoint-desc">Next stretch: <strong>${terrainLabel}</strong>. Choose how you run it.</p>
      <div class="event-choices">
        <button class="choice-btn waypoint-btn" data-choice="safe">
          <span class="waypoint-route-name">Safe Route</span>
          <span class="waypoint-route-stats">+20% fuel · −30% event chance</span>
        </button>
        <button class="choice-btn waypoint-btn" data-choice="fast">
          <span class="waypoint-route-name">Fast Route</span>
          <span class="waypoint-route-stats">−10% fuel · +40% event chance</span>
        </button>
      </div>
    `;

    card.querySelectorAll('.waypoint-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        card.querySelectorAll('.waypoint-btn').forEach(b => {
          b.disabled = true;
          b.classList.add('choice-btn-unchosen');
        });
        btn.classList.remove('choice-btn-unchosen');
        btn.classList.add('choice-btn-chosen');
        setTimeout(() => {
          this.hide();
          onChoice(btn.dataset.choice);
        }, 350);
      });
    });

    this.container.appendChild(card);
  }

  hide() {
    this.container.innerHTML = '';
    this.container.classList.remove('active');
  }
}
