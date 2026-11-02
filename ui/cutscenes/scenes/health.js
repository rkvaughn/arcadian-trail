/**
 * Health — the body gives out on the road.
 *
 *   medical_emergency (default)  night field hospital: a big canvas tent with a
 *                                red cross, lantern light and moths, a family
 *                                member on a cot tended by a medic. Intro: an
 *                                ambulance pulls in, beacon flashing.
 *   water_contamination          a murky, oil-sheened creek with dead fish and
 *                                flies; a hand pump with a DO NOT DRINK sign
 *                                and a line of people with water jugs.
 *   grey_famine                  ash-grey sky over failed grey crops, empty
 *                                market stalls with torn awnings, a ration line.
 *   quarantine_zone              chain-link fence and warning tape at dusk,
 *                                hazmat figures, sweeping floodlights.
 */

import {
  W, H, R, rng, ease, easeOut, clamp, lerp, ditherBands, ditherFill, ridge, strip, drawWrap,
  drawPuff, stepParticles, draw, silhouette, disc, sprite, painted, text,
} from '../kit.js';
import { INK, SHIRTS, carSprite, wheelSprites, drawCar, familySprites, drawFamily, pineSprite } from '../sprites.js';
import {
  strangerSprites, drawStranger, glowSprite, drawGlow, tentSprite, crescent,
  starStrip, twinkles, drawTwinkles, roadStrip,
} from './social.js';

const ROAD_Y = 146;

export function healthScene(env) {
  switch (env.eventId) {
    case 'water_contamination': return waterScene(env);
    case 'grey_famine': return famineScene(env);
    case 'quarantine_zone': return quarantineScene(env);
    default: return hospitalScene(env);
  }
}

// ── Field hospital ────────────────────────────────────────────────────────────

function hospitalTent() {
  return painted(112, 46, (g) => {
    const C = '#d8d4c8', c = '#aaa698', d = '#86827a';
    // Gable roof
    for (let y = 0; y < 14; y++) {
      const half = Math.round(((y + 1) / 14) * 58);
      R(g, 56 - half, y, half, 1, C); R(g, 56, y, half, 1, c);
    }
    R(g, 0, 14, 112, 1, d);
    // Walls with seams
    R(g, 2, 15, 108, 31, C);
    R(g, 2, 15, 108, 2, c);
    for (let x = 14; x < 110; x += 16) R(g, x, 17, 1, 29, c);
    R(g, 2, 44, 108, 2, d);
    // Red cross panel
    R(g, 74, 21, 18, 18, '#f0eee8');
    R(g, 80, 23, 6, 14, '#d82424'); R(g, 76, 27, 14, 6, '#d82424');
    // Open door flap with warm interior
    R(g, 24, 22, 22, 24, '#ffd890'); R(g, 28, 26, 14, 20, '#ffeab8');
    R(g, 24, 22, 4, 24, '#b89a6a'); R(g, 42, 22, 4, 24, '#b89a6a');
    R(g, 31, 34, 8, 2, '#c8a870');          // a cot inside
    // Roof vent
    R(g, 52, -2, 8, 3, d);
  }, INK);
}

function ambulanceSprite() {
  return painted(54, 22, (g) => {
    const Wt = '#ececf0', s = '#b8b8c4', red = '#d82020';
    R(g, 16, 0, 38, 18, Wt); R(g, 16, 14, 38, 4, s);              // box
    R(g, 2, 6, 16, 12, Wt); R(g, 0, 10, 4, 8, Wt); R(g, 2, 14, 16, 4, s); // cab + nose
    R(g, 4, 7, 10, 4, '#4a7aa8'); R(g, 5, 7, 3, 1, '#a8d0f0');    // windshield
    R(g, 0, 11, 54, 2, red);                                       // stripe
    R(g, 32, 2, 4, 10, red); R(g, 29, 5, 10, 4, red);             // cross
    R(g, 52, 2, 1, 14, s);                                         // rear door seam
    R(g, 0, 18, 54, 2, '#6a6a74');                                 // bumper/skirt
    R(g, 0, 14, 2, 2, '#ffe680');                                  // headlight
  }, INK);
}

function hospitalScene(env) {
  const r = rng(303);
  const sky = strip(W, 128, (g) => ditherBands(g, 0, 0, W, 128, ['#04050c', '#0a0f24', '#121a38', '#1c2448', '#2a2e4e']));
  const stars = starStrip(W, 70, 41, 80);
  const tw = twinkles(19, 14, 60);
  const hills = strip(480, 60, (g, w, h) => ridge(g, w, h, { amp: 20, base: 56, seed: 8, color: '#0e1222', hi: '#26304e' }));
  const pineS = silhouette(pineSprite(), '#0a0e18');
  const trees = strip(480, 34, (g, w, h) => {
    const tops = ridge(g, w, h, { amp: 5, base: 32, seed: 2, color: '#0c1018', hi: '#1a2232' });
    const tr = rng(4);
    for (let x = 0; x < w; x += tr.int(8, 16)) draw(g, pineS, x, tops[Math.min(w - 1, x + 5)] - 16);
  });
  const ground = roadStrip('#262830', '#1c1e26', '#3e4250', '#9a8a3a', '#141c1a', '#1e2a24', 33, 124);
  const tent = hospitalTent();
  const smallTent = tentSprite(30, 18, '#c8c4b8', '#9a968a', true);
  const amb = ambulanceSprite();
  const wheels = wheelSprites();
  const car = carSprite('blue');
  const fam = familySprites(env.family);
  const medic = strangerSprites(1, 'medic');
  // The patient: second family member (if any) lying on a cot, shirt matches
  const patientShirt = fam.length > 1 ? SHIRTS[1] : '#8a8a9a';
  const patient = sprite([
    '..HH.................', '.HSSS..CCCCCCCPPPPPKK', '.HSSE.CCCCCCCCPPPPPKK', '..SS..................',
  ], { H: '#1a1210', S: '#e0ac69', E: '#1a1018', C: patientShirt, P: '#3a3a44', K: '#1e1618' }, { outline: INK });
  const blanket = sprite(['bbbbbbbbbbbbbb', 'BBBBBBBBBBBBBB'], { B: '#6a8a6a', b: '#8aaa8a' });
  const standing = fam.length > 1 ? fam.filter((_, i) => i !== 1) : fam;
  const lanternGlow = glowSprite(26, '#ffcf70', 0.5, 0.7);
  const doorGlow = glowSprite(22, '#ffd890', 0.45, 0.6);
  const beaconR = glowSprite(18, '#ff3030', 0.55, 0.7);
  const beaconB = glowSprite(18, '#3a7aff', 0.55, 0.7);
  const moths = Array.from({ length: 6 }, (_, i) => ({ a: r.range(0, 6), rad: r.range(4, 10), sp: r.range(3, 6) * (i % 2 ? 1 : -1) }));
  const LX = 104, LY = 108;     // lantern

  return {
    draw(g, t) {
      const cam = -36 * (1 - easeOut(t / 2.2));
      const at = clamp(t / 2.1, 0, 1);
      const ax = lerp(W + 20, 246, easeOut(at)) + cam;     // ambulance pulls in
      const beacon = Math.floor(t * 6) % 2;

      g.drawImage(sky, 0, 0);
      g.drawImage(stars, 0, 0);
      drawTwinkles(g, tw, t);
      crescent(g, 46, 24, 9, '#e8e4d0', '#fffff0');
      g.drawImage(hills, Math.round(cam * 0.2) - 40, 74);
      g.drawImage(trees, Math.round(cam * 0.45) - 40, 96);
      g.drawImage(ground, 0, 124);

      draw(g, smallTent, 40 + cam, 116);
      draw(g, tent, 126 + cam, 90);
      // Guy ropes
      for (const [x0, x1] of [[126, 114], [238, 250]]) {
        const a = x0 + cam, b = x1 + cam;
        for (let k = 0; k <= 16; k++) R(g, Math.round(lerp(a, b, k / 16)), Math.round(lerp(104, 138, k / 16)), 1, 1, '#8a8478');
      }
      // Lantern pole
      R(g, LX + cam, LY, 1, 30, '#4a3a2a');
      R(g, LX - 3 + cam, LY - 1, 7, 1, '#4a3a2a');
      R(g, LX + 2 + cam, LY, 3, 4, '#ffe9a0'); R(g, LX + 2 + cam, LY - 1, 3, 1, '#6a5030');

      // Ambulance
      const bump = at < 1 && Math.floor(t * 10) % 2 ? 1 : 0;
      draw(g, wheels[Math.floor(ax / 3) % 2], ax + 6, ROAD_Y + 6);
      draw(g, wheels[Math.floor(ax / 3) % 2], ax + 40, ROAD_Y + 6);
      draw(g, amb, ax, ROAD_Y - 6 - bump);
      R(g, ax + 4, ROAD_Y - 9 - bump, 10, 3, '#3a3a44');
      R(g, ax + 4, ROAD_Y - 9 - bump, 5, 2, beacon ? '#ff3030' : '#6a1a1a');
      R(g, ax + 9, ROAD_Y - 9 - bump, 5, 2, beacon ? '#2a2a6a' : '#4a8aff');

      // Family car and the family waiting by the tent
      const cx = 14 + cam * 1.2;
      drawCar(g, car, wheels, cx, ROAD_Y, 0);
      drawFamily(g, standing, cx + 50, ROAD_Y + 19, 'idle', { t, gap: 10 });

      // Night grade, then light sources on top
      g.globalCompositeOperation = 'multiply';
      R(g, 0, 86, W, H - 86, '#6a72a0');
      g.globalCompositeOperation = 'source-over';
      const flick = 0.85 + 0.15 * Math.sin(t * 11);
      g.globalAlpha = flick;
      drawGlow(g, LX + 3 + cam, LY + 22, lanternGlow);
      g.globalAlpha = 1;
      drawGlow(g, 161 + cam, 140, doorGlow);
      R(g, LX + 2 + cam, LY, 3, 4, '#fff4c0');
      R(g, 152 + cam, 114, 14, 22, '#ffe2a0'); R(g, 155 + cam, 118, 8, 18, '#fff0c8');   // door light
      // Cot with patient and medic, in the door light (drawn after the grade)
      const cotX = 150 + cam, cotY = 142;
      R(g, cotX, cotY, 26, 2, '#6a5a3a'); R(g, cotX + 1, cotY + 2, 1, 4, '#4a3a24'); R(g, cotX + 24, cotY + 2, 1, 4, '#4a3a24');
      draw(g, patient, cotX + 2, cotY - 4);
      draw(g, blanket, cotX + 9, cotY - 2);
      drawStranger(g, medic, cotX + 28, 147, Math.floor(t * 1.5) % 2 ? 'wave' : 'idle', t, true);
      // Medic's bag
      R(g, cotX + 38, 143, 6, 4, '#c82a2a'); R(g, cotX + 40, 142, 2, 1, '#8a1a1a');


      if (at > 0.2) drawGlow(g, ax + 9, ROAD_Y - 4, beacon ? beaconR : beaconB);
      R(g, ax + 4, ROAD_Y - 9 - bump, 5, 2, beacon ? '#ff5050' : '#7a2a2a');
      R(g, ax + 9, ROAD_Y - 9 - bump, 5, 2, beacon ? '#2a2a7a' : '#6aa0ff');
      // Beacon wash on the tent wall
      if (at > 0.5) {
        g.globalAlpha = 0.18;
        R(g, 126 + cam + (beacon ? 60 : 0), 106, 52, 30, beacon ? '#ff2020' : '#3060ff');
        g.globalAlpha = 1;
      }
      // Moths around the lantern
      for (const m of moths) {
        const a = m.a + t * m.sp;
        R(g, LX + 3 + cam + Math.cos(a) * m.rad, LY + 2 + Math.sin(a * 1.3) * m.rad * 0.6, 1, 1, Math.floor(t * 8 + m.a) % 2 ? '#e8e0c0' : '#a89a80');
      }
    },
  };
}

// ── Water contamination ───────────────────────────────────────────────────────

function pumpSprite(handleUp) {
  return painted(16, 26, (g) => {
    const I = '#4a5258', i = '#6a747a';
    R(g, 4, 4, 5, 20, I); R(g, 5, 4, 1, 20, i);       // column
    R(g, 2, 22, 9, 4, I);                              // base
    R(g, 9, 9, 6, 2, I); R(g, 13, 11, 2, 3, I);        // spout
    R(g, 3, 2, 7, 3, I);                               // cap
    if (handleUp) { R(g, 0, 0, 2, 6, I); R(g, 0, 0, 6, 2, I); }
    else { R(g, 0, 4, 6, 2, I); R(g, 0, 4, 2, 6, I); }
  }, INK);
}

function waterScene(env) {
  const r = rng(212);
  const sky = strip(W, 120, (g) => ditherBands(g, 0, 0, W, 120, ['#6a7a74', '#8a9482', '#a4a68a', '#bab690', '#c8c098']));
  const clouds = strip(480, 40, (g, w) => {
    const cr = rng(6);
    for (let i = 0; i < 26; i++) {
      const x = cr.range(0, w), y = cr.range(4, 22), rad = cr.range(6, 12);
      for (const dx of [0, -w, w]) drawPuff(g, x + dx, y, rad, '#8a9284', '#a8ae9c', 0.5);
    }
  });
  const hills = strip(480, 50, (g, w, h) => ridge(g, w, h, { amp: 18, base: 46, seed: 31, color: '#5a6a44', hi: '#7a8a5a', shade: '#4a5a38' }));
  const CREEK_Y = 116, CREEK_H = 16;
  const banks = strip(W, H - 108, (g, w, h) => {
    R(g, 0, 0, w, h, '#6a6a3e');
    ditherFill(g, 0, 0, w, h, '#5a5a34', 0.35);
    const ry = CREEK_Y - 108;
    R(g, 0, ry, w, CREEK_H, '#4a5428');
    ditherFill(g, 0, ry, w, CREEK_H, '#3a4220', 0.4);
    R(g, 0, ry - 1, w, 1, '#3a3a20'); R(g, 0, ry + CREEK_H, w, 1, '#3a3a20');
    const gr = rng(4);
    for (let i = 0; i < 40; i++) { const x = gr.int(0, w); R(g, x, ry - 3, 1, 3, '#8a8a4a'); R(g, x + 1, ry - 2, 1, 2, '#6a6a3a'); }
  });
  const road = roadStrip('#4a4844', '#3a3834', '#6a6658', '#c8b050', '#5a5a34', '#6a6a3a', 77, 140);
  const fish = sprite(['..wwww.', 'wWWWWWw', '.wwww..'], { W: '#e8e4d8', w: '#a8a498' }, { outline: '#2a2a20' });
  const jug = sprite(['.c.', 'BBB', 'BBB', 'BBB'], { B: '#3a7ad0', c: '#2a4a8a' }, { outline: INK });
  const pumps = [pumpSprite(true), pumpSprite(false)];
  const queue = Array.from({ length: 5 }, (_, i) => strangerSprites(i + 1));
  const car = carSprite('blue');
  const wheels = wheelSprites();
  const fam = familySprites(env.family);
  const fishes = Array.from({ length: 6 }, () => ({ x: r.range(0, W), y: r.range(CREEK_Y + 3, CREEK_Y + CREEK_H - 3), p: r.range(0, 6), v: r.range(2, 5) }));
  const flies = Array.from({ length: 14 }, () => ({ f: r.int(0, 5), a: r.range(0, 6), s: r.range(4, 9) }));
  const drops = [];

  return {
    update(dt, t) {
      if (Math.floor(t * 1.4) % 2 === 0 && r() < dt * 12) drops.push({ x: 223 + r.range(-1, 1), y: 112, vx: 0, vy: 20, g: 120, life: 0.5 });
      stepParticles(drops, dt);
    },
    draw(g, t) {
      const cam = -40 * (1 - easeOut(t / 2.2));
      g.drawImage(sky, 0, 0);
      disc(g, 230, 26, 9, '#d8d0a8');
      drawWrap(g, clouds, t * 3 - cam * 0.1, 0);
      g.drawImage(hills, Math.round(cam * 0.25) - 40, 72);
      g.drawImage(banks, 0, 108);
      // Oily sheen and ripples on the creek
      for (let i = 0; i < 18; i++) {
        const x = ((i * 47 + t * 9) % (W + 20)) - 10;
        const y = CREEK_Y + 2 + (i * 5) % (CREEK_H - 4);
        const hue = ['#7a6a9a', '#5a8a8a', '#9a8a4a'][i % 3];
        R(g, x, y, 6, 1, hue); R(g, x + 6, y, 3, 1, '#6a7a4a');
      }
      for (const f of fishes) {
        const x = ((f.x + t * f.v) % (W + 10)) - 5;
        const bob = Math.round(Math.sin(t * 2 + f.p));
        draw(g, fish, x, f.y + bob - 1);
      }
      // Flies over the fish
      for (const fl of flies) {
        const f = fishes[fl.f];
        const fx = ((f.x + t * f.v) % (W + 10)) - 5;
        R(g, fx + 3 + Math.cos(t * fl.s + fl.a) * 5, f.y - 4 + Math.sin(t * fl.s * 1.7 + fl.a) * 3, 1, 1, '#1a1a14');
      }
      // Pump with warning sign and a queue with jugs
      const px = 214 + cam;
      const up = Math.floor(t * 1.4) % 2 === 0;
      draw(g, pumps[up ? 0 : 1], px, 112);
      for (const d of drops) R(g, d.x + cam, d.y, 1, 2, '#7a8a5a');
      R(g, px + 22, 112, 2, 26, '#5a4028');
      R(g, px + 14, 96, 46, 20, '#e8e0c8'); R(g, px + 14, 96, 46, 2, '#c82020'); R(g, px + 14, 114, 46, 2, '#c82020');
      text(g, 'DO NOT', px + 37, 99, { align: 'center', color: '#c82020' });
      text(g, 'DRINK', px + 37, 107, { align: 'center', color: '#2a2020' });
      queue.forEach((q, i) => {
        const x = px + 26 + i * 12 + cam * 0.1;
        drawStranger(g, q, x, 140, Math.floor(t * 0.8 + i) % 4 === 0 ? 'walk' : 'idle', t + i, true);
        draw(g, jug, x - 2, 132);
      });
      g.drawImage(road, 0, 140);
      const cx = 22 + cam * 1.2;
      drawCar(g, car, wheels, cx, ROAD_Y, 0);
      drawFamily(g, fam, cx + 50, ROAD_Y + 19, 'idle', { t, gap: 10 });
      // Jug in the leader's hand
      draw(g, jug, cx + 58, ROAD_Y + 8);
      // Sickly tint
      g.globalCompositeOperation = 'multiply';
      R(g, 0, 0, W, H, '#e8f0d0');
      g.globalCompositeOperation = 'source-over';
    },
  };
}

// ── Grey famine ───────────────────────────────────────────────────────────────

function famineScene(env) {
  const r = rng(616);
  const sky = strip(W, 116, (g) => ditherBands(g, 0, 0, W, 116, ['#4a4a50', '#62626a', '#7a7a7c', '#908e8a', '#a6a29a']));
  const hills = strip(480, 50, (g, w, h) => ridge(g, w, h, { amp: 16, base: 46, seed: 44, color: '#5a5856', hi: '#787470', shade: '#4a4846' }));
  // Field of failed crops (grey stalks)
  const FIELD_Y = 104;
  const field = strip(W, 40, (g, w, h) => {
    R(g, 0, 0, w, h, '#6e6a62');
    ditherFill(g, 0, 0, w, h, '#5e5a52', 0.4);
    for (let row = 0; row < 5; row++) R(g, 0, 4 + row * 8, w, 1, '#56524a');
  });
  const stalks = Array.from({ length: 64 }, (_, i) => ({ x: (i * 11) % W + (Math.floor(i / 29) * 5), row: i % 5, p: r.range(0, 6), h: r.int(5, 9) }));
  const road = roadStrip('#4e4c4a', '#3e3c3a', '#6e6a64', '#a89a6a', '#5e5a52', '#6e6a5e', 88, 140);
  const stallSprite = (stripe) => painted(30, 26, (g) => {
    R(g, 2, 8, 2, 18, '#5a4a3a'); R(g, 26, 8, 2, 18, '#5a4a3a');
    R(g, 0, 18, 30, 3, '#7a6a52'); R(g, 0, 21, 30, 5, '#5a4e3e');        // empty counter
    for (let x = 0; x < 30; x += 4) R(g, x, 4, 2, 4, stripe);
    for (let x = 2; x < 30; x += 4) R(g, x, 4, 2, 4, '#c8c0b0');
  }, INK);
  const stalls = [stallSprite('#8a5a5a'), stallSprite('#5a6a8a')];
  const crate = sprite(['wwwwwww', 'wWWwWWw', 'wWwWwWw', 'wWWwWWw', 'wwwwwww'], { W: '#8a7a5a', w: '#5a4a34' }, { outline: INK });
  const truck = painted(46, 20, (g) => {
    R(g, 0, 4, 12, 12, '#6a7a6a'); R(g, 2, 6, 7, 4, '#3a4a5a');
    R(g, 12, 10, 34, 6, '#5a5a52'); R(g, 0, 16, 46, 2, '#3a3a36');
  }, INK);
  const wheels = wheelSprites();
  const car = carSprite('blue');
  const fam = familySprites(env.family);
  const line = Array.from({ length: 6 }, (_, i) => strangerSprites(i, 'plain', { C: ['#6a6a6a', '#7a6e62', '#5e6670'][i % 3] }));
  const ash = [];
  let ashT = 0;

  return {
    update(dt, t) {
      ashT += dt * 18;
      while (ashT > 1) { ashT--; ash.push({ x: r.range(-20, W), y: -3, vx: r.range(4, 10), vy: r.range(6, 12), life: 20, p: r.range(0, 6) }); }
      for (const a of ash) a.vx = 6 + Math.sin(t * 1.5 + a.p) * 6;
      stepParticles(ash, dt);
    },
    draw(g, t) {
      const cam = -40 * (1 - easeOut(t / 2.4));
      g.drawImage(sky, 0, 0);
      disc(g, 210, 34, 11, '#b8b2a4'); disc(g, 210, 34, 8, '#cac4b4');     // ash-dimmed sun
      g.drawImage(hills, Math.round(cam * 0.25) - 40, 66);
      g.drawImage(field, 0, FIELD_Y);
      // Dead stalks, drooping heads swaying
      for (const s of stalks) {
        const x = s.x + Math.round(cam * 0.6), y = FIELD_Y + 6 + s.row * 8;
        const sway = Math.round(Math.sin(t * 1.2 + s.p));
        R(g, x, y - s.h, 1, s.h, '#8a867a');
        R(g, x + sway, y - s.h - 1, 2, 1, '#9e988a');
        R(g, x + 1 + sway, y - s.h, 1, 2, '#7a766a');
      }
      // Empty market stalls with flapping torn awnings
      stalls.forEach((st, i) => {
        const x = 168 + i * 40 + cam * 0.8;
        draw(g, st, x, 114);
        const flap = Math.floor(t * 6 + i * 2) % 3;
        R(g, x + 6 + i * 8, 122, 2, 2 + flap, i ? '#5a6a8a' : '#8a5a5a');
      });
      // Ration truck and line
      const tx = 264 + cam * 0.8;
      draw(g, wheels[0], tx + 4, 134); draw(g, wheels[1], tx + 34, 134);
      draw(g, truck, tx, 124);
      draw(g, crate, tx + 16, 128); draw(g, crate, tx + 26, 128);
      R(g, tx - 4, 112, 40, 10, '#e8e0c8'); text(g, 'RATIONS', tx + 16, 114, { align: 'center', color: '#3a3a3a' });
      line.forEach((p, i) => {
        const shuffle = Math.round(Math.sin(t * 0.9 + i) * 1);
        drawStranger(g, p, tx - 14 - i * 11 + shuffle, 141, 'idle', t + i, false);
      });
      g.drawImage(road, 0, 140);
      const cx = 20 + cam * 1.2;
      drawCar(g, car, wheels, cx, ROAD_Y, 0);
      drawFamily(g, fam, cx + 50, ROAD_Y + 19, 'idle', { t, gap: 10 });
      // Desaturating grey wash + falling ash
      g.globalCompositeOperation = 'multiply';
      R(g, 0, 0, W, H, '#d4d0c8');
      g.globalCompositeOperation = 'source-over';
      for (const a of ash) R(g, a.x, a.y, 1, 1, Math.floor(a.p * 10) % 2 ? '#d8d4cc' : '#a8a49c');
    },
  };
}

// ── Quarantine zone ───────────────────────────────────────────────────────────

function quarantineScene(env) {
  const r = rng(717);
  const sky = strip(W, 120, (g) => ditherBands(g, 0, 0, W, 120, ['#060c10', '#0c181e', '#16282c', '#22383a', '#30484a']));
  const tw = twinkles(23, 12, 50);
  const stars = starStrip(W, 50, 63, 40);
  const hills = strip(480, 50, (g, w, h) => ridge(g, w, h, { amp: 14, base: 46, seed: 51, color: '#0e181a', hi: '#22343a' }));
  const FENCE_TOP = 92, FENCE_BOT = 136;
  // Chain-link mesh with posts and barbed wire
  const fence = strip(W + 88, FENCE_BOT - FENCE_TOP + 6, (g, w) => {
    const h = FENCE_BOT - FENCE_TOP;
    for (let y = 6; y < h + 6; y++) {
      for (let x = 0; x < w; x++) {
        if ((x + y) % 6 === 0 || (x - y + 600) % 6 === 0) R(g, x, y, 1, 1, '#7a8a8a');
      }
    }
    for (let x = 4; x < w; x += 44) { R(g, x, 0, 2, h + 6, '#9aa4a4'); R(g, x, 0, 2, 1, '#c8d0d0'); }
    R(g, 0, 6, w, 1, '#9aa4a4');
    for (let x = 0; x < w; x += 3) R(g, x, 2 + (x % 6 === 0 ? 0 : 1), 1, 1, '#8a9494');
    R(g, 0, 3, w, 1, '#6a7474');
  });
  const decon = tentSprite(56, 30, '#d8dcd8', '#a8aca8', true);
  const ground = roadStrip('#2a3030', '#1e2424', '#4a5252', '#a8a040', '#1a2220', '#243030', 92, 128);
  const hazmat = [0, 1, 2].map(i => strangerSprites(i, 'hazmat'));
  const poleL = painted(8, 70, (g) => { R(g, 3, 6, 2, 64, '#3a4444'); R(g, 0, 0, 8, 6, '#4a5454'); R(g, 1, 4, 6, 2, '#fff8d0'); }, INK);
  const lightGlow = glowSprite(6, '#fff8d0', 0.9);
  const car = carSprite('blue');
  const wheels = wheelSprites();
  const fam = familySprites(env.family);
  const lights = [{ x: 30, p: 0 }, { x: 280, p: 2.1 }];

  return {
    draw(g, t) {
      const cam = -40 * (1 - easeOut(t / 2.2));
      const on = ease((t - 0.5) / 0.5);          // floodlights clunk on
      g.drawImage(sky, 0, 0);
      g.drawImage(stars, 0, 0);
      drawTwinkles(g, tw, t, '#c8e8e8');
      g.drawImage(hills, Math.round(cam * 0.25) - 40, 72);
      g.drawImage(ground, 0, 128);
      // Behind the fence: decon tent and hazmat crew pacing
      draw(g, decon, 150 + cam * 0.7, 98);
      hazmat.forEach((h, i) => {
        const span = 120;
        const u = ((t * 9 + i * 45) % (span * 2));
        const fwd = u < span;
        const x = 100 + (fwd ? u : span * 2 - u) + cam * 0.7;
        drawStranger(g, h, x, 130, 'walk', t + i, !fwd);
      });
      g.drawImage(fence, -44 + (Math.round(cam * 0.9) % 44), FENCE_TOP - 6);
      // Warning tape fluttering along the fence
      for (let x = 0; x < W; x += 2) {
        const y = 112 + Math.round(Math.sin(x * 0.08 + t * 5) * 1.5 + Math.sin(x * 0.21 - t * 3));
        R(g, x, y, 2, 3, Math.floor((x + Math.floor(t * 8)) / 6) % 2 ? '#f0d020' : '#1a1a1a');
      }
      // Sign
      R(g, 196 + cam, 98, 64, 12, '#e8e0c8'); R(g, 196 + cam, 98, 64, 1, '#c82020'); R(g, 196 + cam, 109, 64, 1, '#c82020');
      text(g, 'QUARANTINE', 228 + cam, 101, { align: 'center', color: '#c82020' });
      // Light poles
      for (const l of lights) draw(g, poleL, l.x + cam * 0.9, 60);

      const cx = 30 + cam * 1.2;
      drawCar(g, car, wheels, cx, ROAD_Y, 0);
      drawFamily(g, fam, cx + 50, ROAD_Y + 19, 'idle', { t, gap: 10 });
      g.globalCompositeOperation = 'multiply';
      R(g, 0, 84, W, H - 84, '#6a8a90');
      g.globalCompositeOperation = 'source-over';
      // Sweeping floodlight cones
      if (on > 0) {
        for (const l of lights) {
          const lx = l.x + 4 + cam * 0.9, ly = 64;
          const ex = lx + Math.sin(t * 0.6 + l.p) * 90 + (l.x < 160 ? 70 : -70);
          g.globalAlpha = 0.17 * on;
          g.fillStyle = '#f0fff0';
          g.beginPath(); g.moveTo(lx, ly); g.lineTo(ex - 22, 168); g.lineTo(ex + 22, 168); g.closePath(); g.fill();
          g.globalAlpha = 0.2 * on;
          g.beginPath(); g.ellipse(ex, 168, 24, 5, 0, 0, Math.PI * 2); g.fill();
          g.globalAlpha = 1;
          drawGlow(g, lx, ly, lightGlow);
        }
      }
    },
  };
}
