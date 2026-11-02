/**
 * cutscenes/index.js — Registry of event cut scenes by peril type, plus the
 * banner label/accent for each. One scene file per peril in ./scenes/.
 */

import { wildfireScene } from './scenes/wildfire.js';
import { floodScene } from './scenes/flood.js';
import { hurricaneScene } from './scenes/hurricane.js';
import { heatScene } from './scenes/heat.js';
import { tornadoScene } from './scenes/tornado.js';
import { positiveScene } from './scenes/positive.js';
import { infrastructureScene } from './scenes/infrastructure.js';
import { healthScene } from './scenes/health.js';
import { mechanicalScene } from './scenes/mechanical.js';
import { socialScene } from './scenes/social.js';

export const EVENT_SCENES = {
  wildfire: wildfireScene,
  flood: floodScene,
  hurricane: hurricaneScene,
  heat: heatScene,
  tornado: tornadoScene,
  positive: positiveScene,
  infrastructure: infrastructureScene,
  health: healthScene,
  mechanical: mechanicalScene,
  social: socialScene,
};

export const PERIL_META = {
  wildfire:       { kicker: 'WILDFIRE',          accent: '#ff7a2a' },
  flood:          { kicker: 'FLOODING',          accent: '#4aa8ff' },
  hurricane:      { kicker: 'HURRICANE',         accent: '#7ad8e8' },
  heat:           { kicker: 'EXTREME HEAT',      accent: '#ffc040' },
  tornado:        { kicker: 'TORNADO',           accent: '#a8d070' },
  positive:       { kicker: 'A BREAK',           accent: '#7ae070' },
  infrastructure: { kicker: 'GRID FAILURE',      accent: '#ffcc00' },
  health:         { kicker: 'HEALTH CRISIS',     accent: '#ff5a6a' },
  mechanical:     { kicker: 'VEHICLE TROUBLE',   accent: '#c8c8d8' },
  social:         { kicker: 'ON THE ROAD',       accent: '#e8b070' },
};

export function eventSceneFor(perilType) {
  return EVENT_SCENES[perilType] || EVENT_SCENES.positive;
}

/** Banner text for an event: kicker (peril) over the event's own name. */
export function bannerFor(event) {
  const meta = PERIL_META[event.perilType] || PERIL_META.positive;
  const title = String(event.name || meta.kicker).toUpperCase();
  return { title, kicker: title === meta.kicker ? '' : meta.kicker, accent: meta.accent };
}
