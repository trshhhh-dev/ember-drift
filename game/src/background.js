// The night itself: a layered sky gradient, seeded stars, two faint nebulae, wind-combed streaks
// and a vignette. Everything is drawn in screen space from a seed and the world clock, so the sky
// drifts without ever needing to remember a frame.

import { PALETTE, TAU } from './config.js';
import { createRandom } from './random.js';

/** Build the fixed sky for a seed: stars and the strands of wind that comb across it. */
export function createBackground(seed) {
  const random = createRandom((seed ^ 0x9e3779b9) >>> 0);
  const stars = [];
  for (let index = 0; index < 130; index += 1) {
    stars.push({
      x: random(),
      y: random() * 0.88,
      size: 0.5 + random() * 1.7,
      phase: random() * TAU,
      twinkle: 0.4 + random() * 1.8,
      warmth: random(),
    });
  }
  const streaks = [];
  for (let index = 0; index < 22; index += 1) {
    streaks.push({
      x: random(),
      y: 0.06 + random() * 0.8,
      length: 0.05 + random() * 0.16,
      speed: 0.015 + random() * 0.05,
      alpha: 0.035 + random() * 0.07,
      bend: (random() - 0.5) * 16,
    });
  }
  return { stars, streaks };
}

/** Draw the sky, its stars, its nebula haze and the wind streaks. */
export function drawBackground(ctx, background, width, height, time, wind) {
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, PALETTE.skyTop);
  sky.addColorStop(0.55, PALETTE.skyMid);
  sky.addColorStop(1, PALETTE.skyLow);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  // Two very faint clouds of distant light: violet high on the left, teal low on the right.
  const nebula = ctx.createRadialGradient(width * 0.28, height * 0.3, 0, width * 0.28, height * 0.3, width * 0.52);
  nebula.addColorStop(0, 'rgba(92, 72, 150, 0.16)');
  nebula.addColorStop(0.55, 'rgba(52, 44, 100, 0.07)');
  nebula.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = nebula;
  ctx.fillRect(0, 0, width, height);

  const haze = ctx.createRadialGradient(width * 0.76, height * 0.72, 0, width * 0.76, height * 0.72, width * 0.5);
  haze.addColorStop(0, 'rgba(40, 120, 130, 0.10)');
  haze.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = haze;
  ctx.fillRect(0, 0, width, height);

  // Stars: each breathes on its own clock, a few warm ones among the cold.
  for (let index = 0; index < background.stars.length; index += 1) {
    const star = background.stars[index];
    const breathe = 0.55 + 0.45 * Math.sin(time * star.twinkle + star.phase);
    const alpha = 0.22 + breathe * 0.62;
    const x = star.x * width;
    const y = star.y * height;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = star.warmth > 0.82 ? '#ffe1b0' : '#dcecff';
    ctx.beginPath();
    ctx.arc(x, y, star.size, 0, TAU);
    ctx.fill();
    if (star.size > 1.55) {
      ctx.globalAlpha = alpha * 0.25;
      ctx.fillRect(x - 4, y - 0.4, 8, 0.8);
      ctx.fillRect(x - 0.4, y - 4, 0.8, 8);
    }
  }
  ctx.globalAlpha = 1;

  // Wind-combed streaks: long, thin, and drifting the way the night is blowing.
  const strength = Math.min(1, Math.abs(wind) + 0.15);
  const direction = wind >= 0 ? 1 : -1;
  ctx.lineWidth = 1;
  for (let index = 0; index < background.streaks.length; index += 1) {
    const streak = background.streaks[index];
    const travel = ((streak.x + time * streak.speed * direction + 1) % 1.25) - 0.125;
    const x = travel * width;
    const y = streak.y * height + Math.sin(time * 0.3 + index) * 3;
    const length = streak.length * width * (0.6 + strength * 0.7);
    ctx.globalAlpha = streak.alpha * strength;
    ctx.strokeStyle = PALETTE.wind;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + length * 0.5, y + streak.bend, x + length, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // A soft warm lift from below, so the dark never feels flat.
  const floor = ctx.createLinearGradient(0, height * 0.72, 0, height);
  floor.addColorStop(0, 'rgba(255, 138, 60, 0)');
  floor.addColorStop(1, 'rgba(255, 138, 60, 0.05)');
  ctx.fillStyle = floor;
  ctx.fillRect(0, height * 0.72, width, height * 0.28);
}

/** A vignette and a very light scan of grain-free noise, drawn after the action. */
export function drawVignette(ctx, width, height) {
  const vignette = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.28, width / 2, height / 2, Math.max(width, height) * 0.72);
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(0.7, 'rgba(0, 0, 0, 0.18)');
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.55)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
}
