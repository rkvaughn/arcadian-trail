/**
 * travel/index.js — Terrain registry for the driving scene (one module per
 * terrain in ./terrains/), and the shared TravelRenderer.
 */

import * as plains from './terrains/plains.js';
import * as desert from './terrains/desert.js';
import * as mountain from './terrains/mountain.js';
import * as forest from './terrains/forest.js';
import * as coastal from './terrains/coastal.js';
import * as urban from './terrains/urban.js';
import * as wetland from './terrains/wetland.js';
import * as hills from './terrains/hills.js';
import * as valley from './terrains/valley.js';

export const TERRAINS = { plains, desert, mountain, forest, coastal, urban, wetland, hills, valley };
export { TravelRenderer } from './travel.js';
