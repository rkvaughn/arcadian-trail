// Dev-only cut scene viewer. Not loaded by the game.
import { CutscenePlayer } from '../ui/cutscenes/director.js';
import { EVENT_SCENES, bannerFor } from '../ui/cutscenes/index.js';

const EXTRA = (await import('../ui/cutscenes/screensArt.js').catch(() => ({}))).GALLERY_SCENES || {};

const FAMILY = [
  { name: 'Walker', age: 38, alive: true }, { name: 'Sam', age: 36, alive: true },
  { name: 'Eli', age: 12, alive: true }, { name: 'Rowan', age: 8, alive: true },
];
const VARIANTS = {
  wildfire: ['wildfire', 'toxic_air'], flood: ['flood', 'road_washout', 'swollen_river', 'king_tide'],
  hurricane: ['hurricane'], heat: ['heatwave', 'drought', 'dust_storm'], tornado: ['tornado'],
  positive: ['supply_cache', 'friendly_settlement', 'abandoned_station', 'clear_skies'],
  infrastructure: ['power_outage', 'bridge_collapse'],
  health: ['medical_emergency', 'water_contamination', 'grey_famine', 'quarantine_zone'],
  mechanical: ['vehicle_breakdown', 'flash_freeze'],
  social: ['refugee_camp', 'armored_caravan', 'human_bottleneck', 'bandits'],
};

const q = new URLSearchParams(location.search);
const ctx = document.getElementById('c').getContext('2d');
const player = new CutscenePlayer();
let cur = { scene: q.get('scene') || 'wildfire', id: q.get('id') || null };
let paused = q.get('pause') === '1';
let simMs = 0;

function start(seekT = 0) {
  player.reset();
  if (EVENT_SCENES[cur.scene]) {
    const ev = { id: cur.id || cur.scene, perilType: cur.scene, name: (cur.id || cur.scene).replace(/_/g, ' ') };
    player.play(ev, EVENT_SCENES[cur.scene], { family: FAMILY, eventId: ev.id, perilType: cur.scene }, bannerFor(ev));
  } else if (EXTRA[cur.scene]) {
    const x = EXTRA[cur.scene];
    player.play(cur.scene + cur.id, x.factory, { family: FAMILY, eventId: cur.id, ...x.env }, x.meta || {});
  }
  simMs = 0;
  player.render(ctx, simMs);
  while (player.t < seekT) { simMs += 1000 / 30; player.render(ctx, simMs); }
}

const bar = document.getElementById('scenes');
const all = [...Object.keys(EVENT_SCENES).flatMap(s => VARIANTS[s].map(id => [s, id])),
             ...Object.keys(EXTRA).map(k => [k, EXTRA[k].id || null])];
for (const [s, id] of all) {
  const b = document.createElement('button');
  b.textContent = id && id !== s ? `${s}:${id}` : s;
  b.onclick = () => { cur = { scene: s, id }; start(); mark(); };
  b.dataset.k = s + ':' + id;
  bar.appendChild(b);
}
function mark() { for (const b of bar.children) b.classList.toggle('on', b.dataset.k === cur.scene + ':' + cur.id); }

document.getElementById('pause').onclick = () => { paused = !paused; };
document.getElementById('restart').onclick = () => start();
document.getElementById('seek').oninput = (e) => { start(parseFloat(e.target.value)); };

// ?mag=x,y,w,h shows that region magnified instead of the full frame
const mag = q.get('mag') ? q.get('mag').split(',').map(Number) : null;
const zc = document.getElementById('z');
const zctx = zc.getContext('2d');
if (mag) {
  document.body.classList.add('mag');
  zc.width = mag[2] * 4; zc.height = mag[3] * 4;
  zctx.imageSmoothingEnabled = false;
}
start(parseFloat(q.get('t') || '0'));
mark();
let last = performance.now();
function loop(now) {
  const d = now - last; last = now;
  if (!paused) simMs += d;
  player.render(ctx, simMs);
  if (mag) zctx.drawImage(ctx.canvas, mag[0], mag[1], mag[2], mag[3], 0, 0, zc.width, zc.height);
  document.getElementById('tlabel').textContent = player.t.toFixed(1) + 's';
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
window.__player = player;
