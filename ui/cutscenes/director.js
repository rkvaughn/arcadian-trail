/**
 * director.js — Plays one cut scene at a time onto a 320×180 canvas.
 *
 * A scene is a plain object made by a factory `(env) => scene` where
 *   scene.update(dt, t)   advances particles/state (dt, t in seconds)
 *   scene.draw(g, t)      paints the full frame into the buffer context g
 *   scene.shimmer         optional { y0, y1, amp } heat-shimmer band
 *   scene.shake           optional number of px of camera shake this frame
 *   scene.flash           optional 0..1 full-screen white flash (lightning)
 *
 * The director adds the shared intro: a Bayer pixel-dissolve in from black and
 * a title banner that slides in, holds, and slides out (like a level card).
 */

import { W, H, makeCanvas, R, bayer, text, textWidth, shimmer, clamp, easeOut } from './kit.js';

const DISSOLVE_S = 0.5;
const BANNER_IN = 0.25, BANNER_HOLD = 3.0, BANNER_SLIDE = 0.35;

export class CutscenePlayer {
  constructor() {
    [this.buf, this.bg] = makeCanvas(W, H);
    this.scene = null;
    this.key = null;
    this.t = 0;
    this.last = null;
  }

  /**
   * Start `scene` unless `key` is already playing.
   * meta: { title, kicker, accent } for the banner; dissolve: intro seconds.
   */
  play(key, factory, env, meta = {}) {
    if (key === this.key && this.scene) return false;
    this.key = key;
    this.scene = factory(env);
    this.meta = meta;
    this.t = 0;
    this.last = null;
    return true;
  }

  reset() { this.key = null; this.scene = null; }

  render(ctx, nowMs) {
    if (!this.scene) return;
    const dt = this.last == null ? 0 : clamp((nowMs - this.last) / 1000, 0, 0.1);
    this.last = nowMs;
    this.t += dt;
    const t = this.t, s = this.scene;
    if (s.update) s.update(dt, t);
    this.bg.imageSmoothingEnabled = false;
    s.draw(this.bg, t);

    ctx.imageSmoothingEnabled = false;
    const sh = s.shake ? Math.round((Math.random() * 2 - 1) * s.shake) : 0;
    const sv = s.shake ? Math.round((Math.random() * 2 - 1) * s.shake) : 0;
    if (sh || sv) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); }
    ctx.save();
    ctx.translate(sh, sv);
    if (s.shimmer) shimmer(ctx, this.buf, s.shimmer.y0, s.shimmer.y1, t, s.shimmer.amp);
    else ctx.drawImage(this.buf, 0, 0);
    ctx.restore();
    if (s.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${clamp(s.flash, 0, 1) * 0.7})`; ctx.fillRect(0, 0, W, H); }

    if (this.meta.title) this._banner(ctx, t);
    const dis = this.meta.dissolve ?? DISSOLVE_S;
    if (t < dis) this._dissolve(ctx, t / dis);
    // Thin dark frame (matches the travel renderer's border)
    R(ctx, 0, 0, W, 1, '#000'); R(ctx, 0, H - 1, W, 1, '#000');
    R(ctx, 0, 0, 1, H, '#000'); R(ctx, W - 1, 0, 1, H, '#000');
  }

  _dissolve(ctx, k) {
    ctx.fillStyle = '#000';
    for (let by = 0; by < H; by += 6) {
      for (let bx = 0; bx < W; bx += 6) {
        if (bayer(bx / 6, by / 6) >= k) ctx.fillRect(bx, by, 6, 6);
      }
    }
  }

  _banner(ctx, t) {
    const { title, kicker = '', accent = '#ffd700' } = this.meta;
    const end = BANNER_IN + BANNER_SLIDE + BANNER_HOLD;
    if (t < BANNER_IN || t > end + BANNER_SLIDE) return;
    const kIn = easeOut((t - BANNER_IN) / BANNER_SLIDE);
    const kOut = t > end ? easeOut((t - end) / BANNER_SLIDE) : 0;
    const scale = textWidth(title, 2) <= W - 40 ? 2 : 1;
    const tw = Math.max(textWidth(title, scale), textWidth(kicker, 1));
    const bw = tw + 22, bh = kicker ? 7 * scale + 18 : 7 * scale + 10;
    const x = Math.round(-bw + (bw + 8) * kIn - (bw + 16) * kOut);
    const y = 10;
    // Plate with notched right edge, accent stripe, and drop shadow
    R(ctx, x + 2, y + 2, bw, bh, 'rgba(0,0,0,0.45)');
    R(ctx, x, y, bw, bh, '#0e0c16');
    R(ctx, x + bw, y + 2, 2, bh - 4, '#0e0c16');
    R(ctx, x, y, bw, 1, accent);
    R(ctx, x, y + bh - 2, bw, 2, accent);
    R(ctx, x + 4, y + 4, 3, bh - 8, accent);
    let ty = y + 4;
    if (kicker) { text(ctx, kicker, x + 12, ty, { color: accent }); ty += 10; }
    text(ctx, title, x + 12, ty, { color: '#ffffff', scale, shadow: '#000000' });
  }
}
