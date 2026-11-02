/**
 * sprites.js — Shared NES-style sprites for cut scenes: the family station
 * wagon, family members (idle / walk / cheer frames), and common props.
 *
 * Sprites are string art (see kit.sprite): one char per pixel, mapped through a
 * palette, with an automatic dark outline. Build them once (scene init) and
 * keep the returned objects; kit.sprite caches by content anyway.
 */

import { sprite, draw, silhouette, R } from './kit.js';

export const INK = '#120d14';       // universal outline color

// ── Family car (station wagon with roof luggage), faces right ────────────────

const CAR_ROWS = [
  '......ssssss.sssss......................',
  '......sSSSSs.sSSSs......................',
  '....rrrrrrrrrrrrrrrrr...................',
  '...bBBBBBBBBBBBBBBBBBBb.................',
  '..bBWWWWWWBWWWWWWBWWWWWb................',
  '..BBWwWWWWBWwWWWWBWwWWWWb...............',
  '.BBBWWWWWWBWWWWWWBWWWWWWWBBBBBBBBBBBBb..',
  'TBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBL',
  'TBPPPPPPPPPPPPPPPPPPPPPPPPPBBBBBBBBBBBBL',
  'bBpppppppppppppppppppppppppBBBBBBBBBBBBB',
  'CCCCKKKKKKKCCCCCCCCCCCCCCCCKKKKKKKCCCCCC',
  '.DDKK.....KKDDDDDDDDDDDDDDKK.....KKDDDD.',
];

const CAR_PALS = {
  blue:  { B: '#3a6ad0', b: '#2a4a98', D: '#1e3470' },
  red:   { B: '#c8402c', b: '#902a1c', D: '#601a12' },
  green: { B: '#3a9a50', b: '#28703a', D: '#1a4a26' },
};

export function carSprite(color = 'blue') {
  const body = CAR_PALS[color] || CAR_PALS.blue;
  return sprite(CAR_ROWS, {
    ...body,
    W: '#9ad4f0', w: '#e8f8ff', T: '#e83828', L: '#ffe680', C: '#c8ccd4',
    K: '#1a1418', P: '#a8703a', p: '#7a4c22', r: '#3a3438', s: '#c89a5a', S: '#a87a40',
  }, { outline: INK });
}

const WHEEL_A = [
  '..kkkk..', '.kKKgKk.', 'kKKKKKKk', 'kKKHHKKk',
  'kKKHHKKk', 'kKKKKKKk', '.kKgKKk.', '..kkkk..',
];
const WHEEL_B = [
  '..kkkk..', '.kKKKKk.', 'kKKKKKKk', 'kgKHHKKk',
  'kKKHHKgk', 'kKKKKKKk', '.kKKKKk.', '..kkkk..',
];
const WHEEL_PAL = { k: '#0c0a0c', K: '#2a2628', H: '#b8bcc4', g: '#6a666a' };

export function wheelSprites() {
  return [sprite(WHEEL_A, WHEEL_PAL), sprite(WHEEL_B, WHEEL_PAL)];
}

/**
 * Draw the car with its wheels. (x, y) = top-left of the body art; the car is
 * 40×16 overall. `roll` is distance travelled (wheel animation), `bounce`
 * lifts the body by whole pixels. opts.flip faces left.
 */
export function drawCar(g, car, wheels, x, y, roll = 0, opts = {}) {
  const { bounce = 0, flip = false, sil = null } = opts;
  const wf = wheels[Math.floor(Math.abs(roll) / 3) % 2];
  const body = sil ? silhouette(car, sil) : car;
  const wh = sil ? silhouette(wf, sil) : wf;
  const wx1 = flip ? 28 : 4, wx2 = flip ? 5 : 27;
  draw(g, wh, x + wx1, y + 8);
  draw(g, wh, x + wx2, y + 8);
  draw(g, body, x, y - bounce, flip);
}

// ── People ───────────────────────────────────────────────────────────────────

const ADULT_HEAD = ['..HHH..', '.HHHHH.', '.HSSSE.', '.HSSSS.', '..SSS..'];
const ADULT_BODY = ['.CCCCC.', 'CCCCCCC', 'CCCCCCC', 'SCCCCCS', '.CCCCC.'];
const ADULT_CHEER_TOP = ['..HHH..', '.HHHHH.', 'SHSSSES', 'CHSSSSC', 'C.SSS.C'];
const ADULT_CHEER_BODY = ['CCCCCCC', '.CCCCC.', '.CCCCC.', '.CCCCC.', '.CCCCC.'];
const LEGS_IDLE = ['.PPPPP.', '.PP.PP.', '.PP.PP.', '.PP.PP.', '.KK.KK.'];
const LEGS_WALK_A = ['.PPPPP.', '.PP.PP.', 'PP...PP', 'PP...PP', 'KK...KK'];
const LEGS_WALK_B = ['.PPPPP.', '..PPP..', '..PP...', '..PP...', '..KKK..'];

const CHILD_IDLE = ['.HHH.', 'HHHHH', 'HSSSE', '.SSS.', 'CCCCC', 'CCCCC', 'SCCCS', '.PPP.', '.P.P.', '.P.P.', '.K.K.'];
const CHILD_WALK = ['.HHH.', 'HHHHH', 'HSSSE', '.SSS.', 'CCCCC', 'CCCCC', 'SCCCS', '.PPP.', 'P...P', 'P...P', 'K...K'];
const CHILD_CHEER = ['..HHH..', '.HHHHH.', 'SHSSSES', 'C.SSS.C', '.CCCCC.', '.CCCCC.', '..CCC..', '..PPP..', '..P.P..', '..P.P..', '..K.K..'];

export const SHIRTS = ['#e94560', '#3a7bd5', '#f3c623', '#2ecc71', '#9b59b6', '#ff8c42'];
export const SKINS = ['#f1c27d', '#c68642', '#8d5524', '#e0ac69', '#ffdbac', '#a0673a'];
const HAIRS = ['#3a2614', '#1a1210', '#8a5a2a', '#d8b060', '#5a3a1a', '#2a1a10'];
const PANTS = ['#2a3a6a', '#3a3a44', '#5a4a3a', '#2a4a3a', '#4a3a5a', '#3a3046'];

/**
 * Build frame sets for each living family member: { idle, walk:[a,b], cheer }.
 * Colors follow member index so the family looks the same in every scene.
 */
export function familySprites(family) {
  const alive = (family && family.length ? family : [{}, {}, {}]).filter(m => m.alive !== false);
  const list = alive.length ? alive : [{}];
  return list.slice(0, 6).map((m, i) => {
    const pal = {
      H: HAIRS[i % HAIRS.length], S: SKINS[(i * 2 + 1) % SKINS.length], E: '#1a1018',
      C: SHIRTS[i % SHIRTS.length], P: PANTS[i % PANTS.length], K: '#1e1618',
    };
    const small = typeof m.age === 'number' && m.age < 13;
    const o = { outline: INK };
    if (small) {
      return {
        small: true, h: 11,
        idle: sprite(CHILD_IDLE, pal, o),
        walk: [sprite(CHILD_WALK, pal, o), sprite(CHILD_IDLE, pal, o)],
        cheer: sprite(CHILD_CHEER, pal, o),
      };
    }
    return {
      small: false, h: 15,
      idle: sprite([...ADULT_HEAD, ...ADULT_BODY, ...LEGS_IDLE], pal, o),
      walk: [sprite([...ADULT_HEAD, ...ADULT_BODY, ...LEGS_WALK_A], pal, o),
             sprite([...ADULT_HEAD, ...ADULT_BODY, ...LEGS_WALK_B], pal, o)],
      cheer: sprite([...ADULT_CHEER_TOP, ...ADULT_CHEER_BODY, ...LEGS_IDLE], pal, o),
    };
  });
}

/**
 * Draw the family standing in a row with feet on `groundY`, starting at x and
 * stepping `gap` px. mode: 'idle' | 'walk' | 'cheer' | 'huddle'.
 * opts: { flip, sil (silhouette color), rim (rim-light color drawn offset by
 * rimDx/rimDy behind the figure), t (seconds), gap }
 */
export function drawFamily(g, fam, x, groundY, mode = 'idle', opts = {}) {
  const { flip = false, sil = null, rim = null, rimDx = 1, rimDy = 0, t = 0, gap = 9 } = opts;
  fam.forEach((m, i) => {
    let spr = m.idle;
    let lift = 0, dx = 0;
    if (mode === 'walk') spr = m.walk[Math.floor(t * 6 + i) % 2];
    if (mode === 'cheer') {
      const up = Math.floor(t * 4 + i * 0.7) % 2 === 0;
      spr = up ? m.cheer : m.idle;
      lift = up ? 1 : 0;
      if (up && m.small) dx = -1;   // child cheer frame is 2 px wider
    }
    const px = x + (flip ? -i * gap : i * gap) + dx;
    const py = groundY - m.h - lift;
    if (rim) draw(g, silhouette(spr, rim), px + rimDx, py + rimDy, flip);
    draw(g, sil ? silhouette(spr, sil) : spr, px, py, flip);
  });
}

// ── Props ────────────────────────────────────────────────────────────────────

export function pineSprite(pal = { G: '#2a6a34', g: '#1a4a26', h: '#4a9a4a', T: '#5a3a1e' }) {
  return sprite([
    '.....h.....', '....hGg....', '....GGg....', '...hGGGg...', '...GGGgg...',
    '..hGGGGgg..', '....GGg....', '...hGGGg...', '..hGGGGgg..', '..GGGGGgg..',
    '.hGGGGGGgg.', '...GGGGg...', '..hGGGGGg..', '.hGGGGGGgg.', 'hGGGGGGGggg',
    'GGGGGGGGggg', '....TTT....', '....TTT....', '....TTT....',
  ], pal, { outline: INK });
}

export function roundTreeSprite(pal = { G: '#3a9a3a', g: '#2a6a2a', h: '#7ad06a', T: '#6a4a24', t: '#4a3018' }) {
  return sprite([
    '....hhhhh.....', '..hhGGGGGgg...', '.hGGGGGGGGgg..', 'hGGhGGGGGGGgg.',
    'hGGGGGGGGGGggg', 'GGGGGGGGhGGggg', 'GGGGGGGGGGGggg', '.GGGGGGGGGggg.',
    '..gGGGGGGggg..', '....gTTtg.....', '.....TTt......', '.....TTt......',
    '.....TTt......', '....TTTtt.....',
  ], pal, { outline: INK });
}

export function deadTreeSprite(c = '#4a3020', h = '#6a4a30') {
  return sprite([
    '.T.......T..', '.T..T...T...', '..T.T..T....', '..TTT.T..T..',
    '...TTTT.T...', '....TTTT....', '....hTT.....', '....hTT.....',
    '....hTT.....', '....hTT.....', '...hhTTT....', '..hTTTTTT...',
  ], { T: c, h }, { outline: INK });
}

export function cactusSprite() {
  return sprite([
    '....hG....', '...hGGg...', '...hGGg...', '.h.hGGg...', 'hGghGGg.h.',
    'hGghGGghGg', 'hGGGGGghGg', '.ggGGGgGGg', '...hGGggg.', '...hGGg...',
    '...hGGg...', '...hGGg...', '...hGGg...', '..hhGGgg..',
  ], { G: '#3a8a3a', g: '#2a5a2a', h: '#6aba5a' }, { outline: INK });
}

export function palmSprite(frond = 0) {
  // Trunk is separate (drawn bent per frame); this is the crown.
  const crowns = [
    ['......LL..LL......', '...LLLLlLLlLLLL...', '.LLl..LLLLLL..lLL.', 'Ll...LLccLLL....lL',
     'L...Ll..cc..lL...L', '...Ll........lL...', '..L............L..'],
    ['.......LLLL.......', '..LLLLLlLLlLLLLL..', 'LLl...LLLLLL...lLL', 'L....LLccLL.....lL',
     '....Ll..cc..lL....', '...L..........L...', '..................'],
  ];
  return sprite(crowns[frond % 2], { L: '#3a9a3a', l: '#2a6a2a', c: '#7a5020' }, { outline: INK });
}

export function cloudSprite(big = false, pal = { W: '#ffffff', w: '#c8dcf0', h: '#ffffff' }) {
  const rows = big ? [
    '..........WWWW..........', '.......WWWWWWWWWW.......', '.....WWWWWWWWWWWWWW.....',
    '..WWWWWWWWWWWWWWWWWWWW..', '.WWWWWWWWWWWWWWWWWWWWWWW', 'WWWWWWWWWWWWWWWWWWWWWWWW',
    'wWWWWWWWWWWWWWWWWWWWWWWw', '.wwwWWWWWWWWWWWWWWWwwww.', '...wwwwwwwwwwwwwwwwww...',
  ] : [
    '.....WWWW.....', '...WWWWWWWW...', '.WWWWWWWWWWWW.', 'WWWWWWWWWWWWWW',
    'wWWWWWWWWWWWWw', '.wwwwwwwwwwww.',
  ];
  return sprite(rows, pal, { outline: INK });
}

export function birdSprites(c = '#1a1418') {
  return [
    sprite(['C...C', '.C.C.', '..C..'], { C: c }),
    sprite(['.....', 'CCCCC', '..C..'], { C: c }),
  ];
}

export function poleSprite(wood = '#5a3a20') {
  return sprite([
    'XXXXXXXXXXX', '.....T.....', '.XXXXXXXXX.', '.....T.....', '.....T.....',
    ...Array(26).fill('.....T.....'),
  ], { X: '#3a2a1a', T: wood }, { outline: INK });
}

export function houseSprite(pal = { R: '#a83a2a', r: '#7a2a1e', W: '#e8d8b0', w: '#c0b088', D: '#6a4020', G: '#ffd870', g: '#90b8d8', C: '#6a6a70' }, lit = false) {
  const win = lit ? 'G' : 'g';
  return sprite([
    '.......CC.......RR.......', '.......CC.....RRRRrr.....', '.......CC...RRRRRRRrr....',
    '.........RRRRRRRRRRRRrr..', '.......RRRRRRRRRRRRRRRrr.', '.....RRRRRRRRRRRRRRRRRRrr',
    '....rrrrrrrrrrrrrrrrrrrrr', '.....WWWWWWWWWWWWWWWWWWw.', '.....WWkkkkWWWWWWkkkkWWw.',
    `.....WWk${win}${win}kWWWWWWk${win}${win}kWWw.`, `.....WWk${win}${win}kWWDDWWk${win}${win}kWWw.`,
    '.....WWkkkkWWDDWWkkkkWWw.', '.....WWWWWWWWDDWWWWWWWWw.', '.....wwwwwwwwDDwwwwwwwww.',
  ], { ...pal, k: '#3a2a20' }, { outline: INK });
}

/** Simple soft drop shadow ellipse under a sprite. */
export function shadow(g, cx, y, w, color = 'rgba(0,0,0,0.3)') {
  R(g, cx - w / 2 + 1, y, w - 2, 1, color);
  R(g, cx - w / 2 + 2, y + 1, w - 4, 1, color);
}
