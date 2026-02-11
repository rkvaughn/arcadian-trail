import { origins, destinations } from '../data/cities.js';
import { getAvailableDestinations } from '../data/routes.js';
import { getTraits } from '../js/characters.js';
import { itemDefs } from '../data/items.js';

export class ScreenManager {
  constructor(onSetupComplete) {
    this.onSetupComplete = onSetupComplete;
    this.screens = {
      title: document.getElementById('screen-title'),
      setup: document.getElementById('screen-setup'),
      game: document.getElementById('screen-game'),
      end: document.getElementById('screen-end')
    };
  }

  show(screenId) {
    for (const [id, el] of Object.entries(this.screens)) {
      el.classList.toggle('active', id === screenId);
    }
  }

  initTitle() {
    this.show('title');
    document.getElementById('btn-start').addEventListener('click', () => {
      this.initSetup();
    });
  }

  initSetup() {
    this.show('setup');
    this.populateOrigins();
    this.populateTraits();
    this.populateItems();

    const originSelect = document.getElementById('select-origin');
    originSelect.addEventListener('change', () => this.onOriginChange());

    document.getElementById('btn-begin-journey').addEventListener('click', () => {
      this.submitSetup();
    });
  }

  populateOrigins() {
    const select = document.getElementById('select-origin');
    select.innerHTML = '<option value="">-- Choose Origin --</option>';
    for (const city of origins) {
      const opt = document.createElement('option');
      opt.value = city.id;
      opt.textContent = city.name;
      select.appendChild(opt);
    }
  }

  onOriginChange() {
    const originId = document.getElementById('select-origin').value;
    const destSelect = document.getElementById('select-dest');
    destSelect.innerHTML = '<option value="">-- Choose Destination --</option>';

    if (!originId) return;

    const availDests = getAvailableDestinations(originId);
    for (const destId of availDests) {
      const city = destinations.find(d => d.id === destId);
      if (city) {
        const opt = document.createElement('option');
        opt.value = city.id;
        opt.textContent = city.name;
        destSelect.appendChild(opt);
      }
    }

    // Show origin description
    const origin = origins.find(o => o.id === originId);
    document.getElementById('origin-desc').textContent = origin ? origin.description : '';
  }

  populateTraits() {
    const container = document.getElementById('trait-options');
    container.innerHTML = '';
    const traits = getTraits();
    for (const [id, trait] of Object.entries(traits)) {
      const label = document.createElement('label');
      label.className = 'trait-option';
      label.innerHTML = `
        <input type="radio" name="trait" value="${id}" ${id === 'resilient' ? 'checked' : ''}>
        <span class="trait-name">${trait.name}</span>
        <span class="trait-desc">${trait.description}</span>
      `;
      container.appendChild(label);
    }
  }

  populateItems() {
    const container = document.getElementById('item-options');
    container.innerHTML = '';
    for (const item of itemDefs) {
      const label = document.createElement('label');
      label.className = 'item-option';
      label.innerHTML = `
        <input type="checkbox" name="items" value="${item.id}">
        <span class="item-name">${item.name}</span>
        <span class="item-cost">Cost: ${item.cost}</span>
        <span class="item-desc">${item.description}</span>
      `;
      container.appendChild(label);
    }
    this.updateBudget();

    container.addEventListener('change', () => this.updateBudget());
  }

  updateBudget() {
    const checked = document.querySelectorAll('input[name="items"]:checked');
    let totalCost = 0;
    for (const cb of checked) {
      const item = itemDefs.find(i => i.id === cb.value);
      if (item) totalCost += item.cost;
    }
    const remaining = 100 - totalCost;
    const budgetEl = document.getElementById('budget-remaining');
    if (budgetEl) {
      budgetEl.textContent = remaining;
      budgetEl.className = remaining < 0 ? 'budget-over' : '';
    }
  }

  submitSetup() {
    const originId = document.getElementById('select-origin').value;
    const destId = document.getElementById('select-dest').value;
    const leaderName = document.getElementById('input-name').value.trim() || 'Walker';
    const leaderTrait = document.querySelector('input[name="trait"]:checked')?.value || 'resilient';
    const familySize = parseInt(document.getElementById('select-family-size').value) || 4;

    if (!originId || !destId) {
      document.getElementById('setup-error').textContent = 'Please select both an origin and destination.';
      return;
    }

    const origin = origins.find(o => o.id === originId);
    const dest = destinations.find(d => d.id === destId);

    // Gather selected items, check budget
    const checkedItems = document.querySelectorAll('input[name="items"]:checked');
    const selectedItems = [];
    let totalCost = 0;
    for (const cb of checkedItems) {
      const item = itemDefs.find(i => i.id === cb.value);
      if (item) {
        selectedItems.push(item);
        totalCost += item.cost;
      }
    }

    if (totalCost > 100) {
      document.getElementById('setup-error').textContent = 'Over budget! Remove some items.';
      return;
    }

    document.getElementById('setup-error').textContent = '';
    this.show('game');
    this.onSetupComplete(origin, dest, leaderName, leaderTrait, familySize, selectedItems);
  }

  showEnd(isWin, game, score) {
    this.show('end');
    const title = document.getElementById('end-title');
    const summary = document.getElementById('end-summary');
    const journal = document.getElementById('end-journal');
    const scoreEl = document.getElementById('end-score');

    if (isWin) {
      title.textContent = 'Journey Complete!';
      title.className = 'end-win';
      summary.innerHTML = `
        <p>The ${game.family[0]?.name || 'your'} family reached <strong>${game.destination.name}</strong> in <strong>${game.day} days</strong>.</p>
        <p>${game.destination.description}</p>
      `;
    } else {
      title.textContent = 'Journey Over';
      title.className = 'end-lose';
      const lastEntry = game.journalEntries[game.journalEntries.length - 1] || '';
      summary.innerHTML = `
        <p>${lastEntry}</p>
        <p>The journey ended on <strong>Day ${game.day}</strong> near <strong>${game.getCurrentWaypoint()?.name || 'the road'}</strong>.</p>
      `;
    }

    // Score breakdown
    if (score) {
      let scoreHtml = '<div class="score-breakdown">';
      for (const line of score.breakdown) {
        scoreHtml += `<div class="score-line">${line.label}: <strong>+${line.value}</strong></div>`;
      }
      scoreHtml += `<div class="score-total">Score: ${score.total}</div>`;
      scoreHtml += '</div>';
      scoreEl.innerHTML = scoreHtml;
    }

    // Journal
    journal.innerHTML = '';
    for (const entry of game.journalEntries) {
      const div = document.createElement('div');
      div.className = 'journal-entry';
      div.textContent = entry;
      journal.appendChild(div);
    }

    document.getElementById('btn-play-again').addEventListener('click', () => {
      location.reload();
    });
  }
}
