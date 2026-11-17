// The renderer: owns the canvas, its device-pixel scaling and the painting order. It draws the sky,
// then the gust whirls, motes, rain and the ember under a shake, the flash and vignette, and
// finally the HUD or the full-screen state over it. The simulation never paints; this file never
// changes a rule.

import { createBackground, drawBackground, drawVignette } from './background.js';
import { drawEmber, drawMote, drawRain, drawGust, drawFlareRing } from './sprites.js';
import { drawParticles } from './particles.js';
import { drawHud } from './hud.js';
import { drawTitle, drawPause, drawGameOver } from './screens.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

/**
 * Create the renderer for a canvas and a visual seed. The background's stars are seeded separately
 * from the run, so the sky is stable across restarts of the same night.
 */
export function createRenderer(canvas, seed) {
  const ctx = canvas.getContext('2d', { alpha: false });
  const sky = createBackground(seed);
  let width = Math.max(320, window.innerWidth);
  let height = Math.max(240, window.innerHeight);
  let dpr = 1;

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    width = Math.max(320, window.innerWidth);
    height = Math.max(240, window.innerHeight);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw(state, screen, meta = {}) {
    if (width !== Math.max(320, window.innerWidth) || height !== Math.max(240, window.innerHeight)) resize();
    const best = meta.best ?? 0;
    drawBackground(ctx, sky, width, height, state.time, state.wind.x);

    if (screen !== SCREEN_TITLE) {
      ctx.save();
      if (state.shake > 0) {
        ctx.translate(
          Math.sin(state.time * 97) * state.shake * 9,
          Math.cos(state.time * 113) * state.shake * 7,
        );
      }
      for (let index = 0; index < state.gusts.length; index += 1) drawGust(ctx, state.gusts[index], width, state.time);
      for (let index = 0; index < state.motes.length; index += 1) drawMote(ctx, state.motes[index], state.time);
      for (let index = 0; index < state.drops.length; index += 1) drawRain(ctx, state.drops[index]);
      if (state.player.flareTime > 0) drawFlareRing(ctx, state.player, state.time);
      drawEmber(ctx, state.player, state.fuel / 100, state.time);
      drawParticles(ctx, state.particles);
      ctx.restore();
    } else {
      drawParticles(ctx, state.particles);
    }

    if (state.flash > 0 && screen !== SCREEN_TITLE) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.32, state.flash * 0.24);
      ctx.fillStyle = 'rgba(255, 82, 104, 1)';
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    drawVignette(ctx, width, height);

    if (screen !== SCREEN_TITLE) drawHud(ctx, state, width, height, best);
    if (screen === SCREEN_TITLE) drawTitle(ctx, state, width, height, best);
    else if (screen === SCREEN_PAUSED) drawPause(ctx, state, width, height, best);
    else if (screen === SCREEN_OVER) drawGameOver(ctx, state, width, height, meta);
  }

  resize();
  window.addEventListener('resize', resize);

  return {
    draw,
    resize,
    size() {
      return { width, height };
    },
  };
}
