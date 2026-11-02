// Dev-only mini-game bench. Not loaded by the game.
// window.__mg is the running game instance (poke its state from the console).
import { ShedDash } from '../ui/shedDash.js';
import { FroggerDash } from '../ui/froggerDash.js';
import { BarricadeRunner } from '../ui/barricadeRunner.js';

const FAMILY = [
  { name: 'Walker', age: 38, alive: true }, { name: 'Sam', age: 36, alive: true },
  { name: 'Eli', age: 12, alive: true }, { name: 'Rowan', age: 8, alive: true },
];
let q = new URLSearchParams(location.search);
const canvas = document.getElementById('asciiDisplay');
const pre = document.getElementById('miniGameDisplay');
const info = document.getElementById('info');
const log = document.getElementById('log');
info.textContent = 'info bar (restored after each run)';

function perks() {
  const out = {};
  for (const kv of (q.get('perks') || '').split(',').filter(Boolean)) {
    const [k, v] = kv.split('=');
    out[k] = v === undefined ? true : Number(v);
  }
  return out;
}

const games = {
  shed: () => new ShedDash(canvas, info),
  frogger: () => new FroggerDash(canvas, info),
  barricade: () => new BarricadeRunner(canvas, info),
};

let game = null;
function start() {
  q = new URLSearchParams(location.search);
  if (game) game.stop();
  const kind = q.get('game') || 'shed';
  const progress = parseFloat(q.get('progress') || '0.3');
  canvas.style.display = ''; pre.style.display = 'none';
  canvas.style.filter = q.get('filter') || 'saturate(1.1)';   // games must restore this
  const done = (res) => {
    log.textContent = `${new Date().toLocaleTimeString()} ${kind}: ${JSON.stringify(res)}\n` +
      `filter after: ${canvas.style.filter} | info after: ${info.textContent}\n` + log.textContent;
    window.__lastResult = res;
  };
  game = games[kind]();
  window.__mg = game;
  if (kind === 'shed') game.start(progress, done, { peril: q.get('peril') || 'wind', variant: q.get('variant') || null, family: FAMILY, perks: perks() });
  else if (kind === 'frogger') game.start(progress, done, q.get('flood') ? { icon: 'flood' } : null, perks());
  else game.start(progress, done, perks());
  document.getElementById('q').textContent = location.search;
}

const bar = document.getElementById('games');
for (const [label, qs] of [
  ['shed heat', 'game=shed&peril=heat&variant=heatwave'], ['shed wind', 'game=shed&peril=wind&variant=tornado'],
  ['shed hurricane', 'game=shed&peril=wind&variant=hurricane'], ['shed flood', 'game=shed&peril=wind&variant=flood'],
  ['shed fire', 'game=shed&peril=fire&variant=wildfire'], ['frogger', 'game=frogger'], ['frogger flood', 'game=frogger&flood=1'],
  ['barricade', 'game=barricade'],
]) {
  const b = document.createElement('button');
  b.textContent = label;
  b.onclick = () => { location.search = qs + (q.get('perks') ? '&perks=' + q.get('perks') : ''); };
  bar.appendChild(b);
}
document.getElementById('restart').onclick = start;
start();
