// The scene's depth: a wave-tinted sky, slow aurora ribbons, drifting cloud silhouettes and two
// ridges of distant hills that slide against the action. Everything is drawn in screen space from
// the world clock and the wave's palette, so the night turns from cold blue to violet dusk to a
// teal-and-amber storm without ever needing to remember a frame.

import { TAU } from './config.js';
import { createRandom } from './random.js';
import { wavePalette } from './waves.js';

/** Build the fixed parts of the scene for a seed: ridges, clouds and ribbons. */
export function createParallax(seed) {
  const random = createRandom((seed ^ 0x51ed270b) >>> 0);

  // Two ridges of hills, each a row of heights at even steps across the sky.
  const ridges = [];
  for (let layer = 0; layer < 2; layer += 1) {
    const points = [];
    let height = 0.5 + random() * 0.5;
    for (let index = 0; index <= 12; index += 1) {
      height += (random() - 0.5) * 0.55;
      height = Math.max(0.12, Math.min(1, height));
      points.push(height);
    }
    ridges.push(points);
  }

  const clouds = [];
  for (let index = 0; index < 8; index += 1) {
    clouds.push({
      x: random(),
      y: 0.12 + random() * 0.46,
      width: 0.1 + random() * 0.22,
      height: 0.016 + random() * 0.04,
      speed: 0.004 + random() * 0.016,
      alpha: 0.07 + random() * 0.1,
      wobble: 0.6 + random() * 1.2,
    });
  }

  const aurora = [];
  for (let band = 0; band < 3; band += 1) {
    aurora.push({
      y: 0.08 + band * 0.075,
      amplitude: 0.028 + random() * 0.05,
      speed: 0.05 + random() * 0.08,
      phase: random() * TAU,
      width: 0.45 + random() * 0.5,
      alpha: 0.12 + random() * 0.09,
      lean: (random() - 0.5) * 0.05,
    });
  }

  return { ridges, clouds, aurora };
}

/** The sky gradient, its auroras, clouds and ridges: everything behind the action. */
export function drawParallax(ctx, layer, width, height, time, wind, wave) {
  const palette = wavePalette(wave);

  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, palette.top);
  sky.addColorStop(0.52, palette.mid);
  sky.addColorStop(1, palette.low);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  // Auroras: wide additive ribbons that sway on their own clocks.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let band = 0; band < layer.aurora.length; band += 1) {
    const ribbon = layer.aurora[band];
    const drift = Math.sin(time * ribbon.speed + ribbon.phase) * width * 0.06;
    const x = width * 0.5 + drift;
    const y = height * ribbon.y + Math.sin(time * ribbon.speed * 1.7 + ribbon.phase) * height * ribbon.amplitude;
    const rx = width * ribbon.width;
    const ry = height * (0.05 + ribbon.amplitude);
    const glow = ctx.createRadialGradient(x, y, 0, x, y, rx);
    glow.addColorStop(0, `rgba(${hexToRgb(band === 1 ? palette.auroraB : palette.auroraA)}, ${ribbon.alpha})`);
    glow.addColorStop(0.55, `rgba(${hexToRgb(band === 1 ? palette.auroraB : palette.auroraA)}, ${ribbon.alpha * 0.35})`);
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, ribbon.lean + wind * 0.05, 0, TAU);
    ctx.fill();
  }
  ctx.restore();

  // Clouds: soft silhouettes that slide very slowly, faster as the wind rises.
  ctx.save();
  for (let index = 0; index < layer.clouds.length; index += 1) {
    const cloud = layer.clouds[index];
    const travel = ((cloud.x + time * cloud.speed * (0.6 + Math.abs(wind)) + 1) % 1.3) - 0.15;
    const x = travel * width;
    const y = cloud.y * height + Math.sin(time * 0.12 * cloud.wobble + index) * 6;
    const rx = cloud.width * width;
    const ry = cloud.height * height;
    const puff = ctx.createRadialGradient(x, y, 0, x, y, rx);
    puff.addColorStop(0, rgba(palette.cloud, cloud.alpha));
    puff.addColorStop(0.6, rgba(palette.cloud, cloud.alpha * 0.45));
    puff.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = puff;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + rx * 0.35, y - ry * 0.4, rx * 0.62, ry * 0.8, 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();

  // Hills: the far ridge sits high and dim, the near one low and darker; both breathe with time.
  drawRidge(ctx, layer.ridges[0], width, height, 0.84, 0.1, palette.hillFar, 1);
  drawRidge(ctx, layer.ridges[1], width, height, 0.92, 0.14, palette.hillNear, -0.6);

  // A warm lift from the ground, so the dark never feels flat.
  const floor = ctx.createLinearGradient(0, height * 0.66, 0, height);
  floor.addColorStop(0, `rgba(${palette.floor}, 0)`);
  floor.addColorStop(1, `rgba(${palette.floor}, 0.13)`);
  ctx.fillStyle = floor;
  ctx.fillRect(0, height * 0.7, width, height * 0.3);
}

/** One ridge of hills as a filled polygon, its crest lit by a thin cold rim. */
function drawRidge(ctx, points, width, height, base, depth, color, drift) {
  const count = points.length - 1;
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, height);
  for (let index = 0; index <= count; index += 1) {
    const x = (index / count) * width;
    const y = height * base - points[index] * height * depth;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(width, height);
  ctx.closePath();
  ctx.fill();

  // The crest catches a little of the sky's light, so the silhouette has an edge.
  ctx.beginPath();
  for (let index = 0; index <= count; index += 1) {
    const x = (index / count) * width;
    const y = height * base - points[index] * height * depth;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = drift > 0 ? 'rgba(150, 178, 235, 0.14)' : 'rgba(190, 150, 210, 0.10)';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.restore();
}

/** "#rrggbb" to "r, g, b" for rgba() strings. */
function hexToRgb(hex) {
  const value = Number.parseInt(hex.slice(1), 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `${r}, ${g}, ${b}`;
}

/** rgba() for a palette hex and an alpha. */
function rgba(hex, alpha) {
  return `rgba(${hexToRgb(hex)}, ${alpha})`;
}
