// The sky's fixed lights: seeded stars that breathe on their own clocks, and the vignette that
// closes the frame. The scene's depth (gradient, auroras, clouds, hills) lives in parallax.js;
// this file keeps only what is pinned to the seed and never moves.

import { TAU } from './config.js';
import { createRandom } from './random.js';

/** Build the fixed stars for a seed. */
export function createBackground(seed) {
  const random = createRandom((seed ^ 0x9e3779b9) >>> 0);
  const stars = [];
  for (let index = 0; index < 150; index += 1) {
    stars.push({
      x: random(),
      y: random() * 0.82,
      size: 0.5 + random() * 1.8,
      phase: random() * TAU,
      twinkle: 0.4 + random() * 1.8,
      warmth: random(),
    });
  }
  return { stars };
}

/** Draw the stars: each breathes on its own clock, a few warm ones among the cold. */
export function drawStars(ctx, background, width, height, time) {
  ctx.save();
  for (let index = 0; index < background.stars.length; index += 1) {
    const star = background.stars[index];
    const breathe = 0.55 + 0.45 * Math.sin(time * star.twinkle + star.phase);
    const alpha = 0.18 + breathe * 0.6;
    const x = star.x * width;
    const y = star.y * height;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = star.warmth > 0.84 ? '#ffe1b0' : '#dcecff';
    ctx.beginPath();
    ctx.arc(x, y, star.size, 0, TAU);
    ctx.fill();
    if (star.size > 1.6) {
      ctx.globalAlpha = alpha * 0.22;
      ctx.fillRect(x - 4, y - 0.4, 8, 0.8);
      ctx.fillRect(x - 0.4, y - 4, 0.8, 8);
    }
  }
  ctx.restore();
}

/** A vignette that keeps the eye on the ember. */
export function drawVignette(ctx, width, height) {
  const vignette = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.28, width / 2, height / 2, Math.max(width, height) * 0.72);
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(0.7, 'rgba(0, 0, 0, 0.18)');
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.55)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
}
