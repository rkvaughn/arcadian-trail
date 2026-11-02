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
  // Phones stack the stage above the dashboard and journal; bring the pop-up
  // (pinned to the top of the stage) into view whenever a new card opens.
  _reveal() {
    if (window.matchMedia?.('(max-width: 768px) and (orientation: portrait)').matches) {
      this.container.closest('.game-map-section')?.scrollIntoView({ block: 'start' });
    }
  }

  show(event, context = {}) {
    this.container.innerHTML = '';
    this._reveal();
    this.container.classList.remove('collapsed');
    // Event pop-ups arrive a beat after the cut scene starts (see .is-event in CSS)
    this.container.classList.add('active', 'is-event');

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
        <button type="button" class="popup-peek" aria-pressed="false"
                title="Fold this card to watch the scene">\u{1F441}</button>
      </div>
      <div class="event-body">
      <p class="event-desc">${event.description}</p>
      ${event.perilType === 'hurricane' && context.waypoint
        ? hurricaneCardHtml(context.waypoint.name) : ''}
      <div class="event-choices"></div>
      </div>
    `;

    // Peek: fold the card to its title bar to see the cut scene, tap again to unfold
    const peek = card.querySelector('.popup-peek');
    peek.addEventListener('click', () => {
      const folded = this.container.classList.toggle('collapsed');
      peek.setAttribute('aria-pressed', String(folded));
    });

    const choicesDiv = card.querySelector('.event-choices');
    event.choices.forEach((choice, idx) => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.textContent = choice.text;
      const odds = context.odds?.[idx];
      if (odds) btn.appendChild(this._oddsEl(odds));
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

  // "62% success · First Aid Kit +15% · 2× Water Bottles +12%"
  _oddsEl(odds) {
    const el = document.createElement('span');
    el.className = 'choice-odds';
    if (odds.minigame) {
      const tag = document.createElement('span');
      tag.className = 'odds-chance odds-action';
      tag.textContent = 'Action! Your skill decides';
      el.appendChild(tag);
      for (const label of odds.labels.length ? odds.labels : ['No supplies help here']) {
        const chip = document.createElement('span');
        chip.className = 'odds-item' + (odds.labels.length ? '' : ' odds-none');
        chip.textContent = label;
        el.appendChild(chip);
      }
      return el;
    }
    const pct = Math.round(odds.chance * 100);
    const tier = pct >= 75 ? 'odds-good' : pct >= 60 ? 'odds-fair' : 'odds-poor';
    const chance = document.createElement('span');
    chance.className = `odds-chance ${tier}`;
    chance.textContent = `${pct}% success`;
    el.appendChild(chance);
    for (const h of odds.helpers) {
      const chip = document.createElement('span');
      chip.className = 'odds-item' + (h.consumes ? ' odds-item-consumable' : '');
      chip.textContent = `${h.count > 1 ? h.count + '× ' : ''}${h.name} +${Math.round(h.bonus * 100)}%`;
      chip.title = h.consumes ? 'Used up if you choose this' : 'Reusable gear';
      el.appendChild(chip);
    }
    if (!odds.helpers.length) {
      const none = document.createElement('span');
      none.className = 'odds-item odds-none';
      none.textContent = 'No supplies help here';
      el.appendChild(none);
    }
    return el;
  }

  /**
   * @param {object} result
   * @param {number} delay       ms before the Continue button appears
   * @param {object} [opts]      { final: true } for a game-over card (no Continue)
   */
  showResult(result, delay = 1500, opts = {}) {
    this.container.innerHTML = '';
    this._reveal();
    // Also reached straight from a mini-game, when the panel was hidden
    this.container.classList.remove('is-event', 'collapsed');
    this.container.classList.add('active');

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

    let rollHtml = '';
    if (result.roll) {
      const pct = Math.round(result.roll.chance * 100);
      const used = result.roll.used.map(u => `${u.count > 1 ? u.count + '× ' : ''}${u.name}`).join(', ');
      rollHtml = `<p class="result-roll ${result.roll.success ? 'roll-success' : 'roll-fail'}">
        ${result.roll.success ? '\u2714 Success' : '\u2718 Failed'} <span class="roll-chance">(${pct}% chance)</span>
        ${used ? `<span class="roll-used">Supplies: ${used}</span>` : ''}
      </p>`;
    }

    const deathHtml = result.death
      ? `<p class="result-death">\u2620\uFE0F ${result.death.message}</p>`
      : '';

    card.innerHTML = `
      ${rollHtml}
      <p class="result-narrative">${result.narrative}</p>
      <div class="result-effects">${effectsHtml}</div>
      ${deathHtml}
      ${opts.final
        ? '<p class="result-final">The journey ends here\u2026</p>'
        : '<button class="btn-continue" id="btn-continue" style="display:none">Continue Journey</button>'}
    `;

    this.container.appendChild(card);
    if (opts.final) return;   // game over: the end screen follows on its own

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
    this._reveal();
    this.container.classList.remove('is-event', 'collapsed');
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
    this.container.classList.remove('active', 'is-event', 'collapsed');
  }
}
