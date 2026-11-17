// Sprites: the ember, the motes, the rain, the gusts and the flare ring, each drawn with layered
// additive glows so the night reads as light rather than flat shapes. These functions only paint;
// every rule lives in the simulation modules.

import { PALETTE, TAU } from './config.js';
import { gustFade } from './hazards.js';

/** A soft radial light. */
function glow(ctx, x, y, radius, color, alpha, inner = 0) {
  const gradient = ctx.createRadialGradient(x, y, radius * inner, x, y, radius);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.globalAlpha = alpha;
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;
}

/** The player's ember: a hot core, a breathing halo and a comet tail opposite its flight. */
export function drawEmber(ctx, player, fuel, time) {
  const alive = Math.max(0, Math.min(1, fuel));
  const breath = 0.9 + 0.1 * Math.sin(time * 5.3) + 0.05 * Math.sin(time * 13.7);
  const scale = (0.72 + 0.38 * alive) * breath;
  const blink = player.invuln > 0 ? 0.62 + 0.38 * Math.sin(time * 42) : 1;
  const tail = player.heading + Math.PI;
  const speed = Math.hypot(player.vx, player.vy);
  const stretch = Math.min(1.4, speed / 340);
  const length = (28 + stretch * 22) * scale;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = blink;

  glow(ctx, player.x, player.y, 70 * scale, 'rgba(255, 132, 46, 0.5)', 0.85);
  glow(ctx, player.x, player.y, 34 * scale, 'rgba(255, 214, 138, 0.85)', 0.9);

  // One trailing flame: a leaf of light whose tip points away from the flight.
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(tail + Math.sin(time * 8.3) * 0.08);
  const flame = ctx.createLinearGradient(-10 * scale, 0, length, 0);
  flame.addColorStop(0, 'rgba(255, 248, 214, 0.95)');
  flame.addColorStop(0.3, 'rgba(255, 202, 110, 0.82)');
  flame.addColorStop(0.68, 'rgba(255, 122, 48, 0.42)');
  flame.addColorStop(1, 'rgba(255, 78, 20, 0)');
  ctx.fillStyle = flame;
  ctx.beginPath();
  ctx.moveTo(length, 0);
  ctx.bezierCurveTo(length * 0.42, -13 * scale, -8 * scale, -12 * scale, -10 * scale, 0);
  ctx.bezierCurveTo(-8 * scale, 12 * scale, length * 0.42, 13 * scale, length, 0);
  ctx.closePath();
  ctx.fill();

  // A second, shorter tongue gives the flame its flicker.
  const flick = 0.7 + 0.3 * Math.sin(time * 14 + 1.2);
  ctx.fillStyle = 'rgba(255, 168, 72, 0.35)';
  ctx.beginPath();
  ctx.ellipse(length * 0.35, Math.sin(time * 10) * 3, length * 0.42 * flick, 7 * scale, Math.sin(time * 7) * 0.15, 0, TAU);
  ctx.fill();
  ctx.restore();

  // A little ring of ready heat around the core.
  ctx.strokeStyle = 'rgba(255, 218, 150, 0.34)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(player.x, player.y, 16 * scale, 0, TAU);
  ctx.stroke();

  ctx.fillStyle = PALETTE.emberHot;
  ctx.beginPath();
  ctx.arc(player.x, player.y, 5.6 * scale, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/** A floating fuel mote: a warm bead with a breathing halo and a four-point glimmer. */
export function drawMote(ctx, mote, time) {
  const pulse = 0.86 + 0.14 * Math.sin(time * 4 + mote.phase);
  const radius = mote.radius * pulse;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glow(ctx, mote.x, mote.y, 40 * pulse, 'rgba(255, 182, 68, 0.6)', 0.85);
  glow(ctx, mote.x, mote.y, 17 * pulse, 'rgba(255, 243, 198, 0.95)', 1);
  ctx.fillStyle = PALETTE.moteHot;
  ctx.beginPath();
  ctx.arc(mote.x, mote.y, radius * 0.7, 0, TAU);
  ctx.fill();

  // A thin gold ring and a slow orbit make the mote unmistakable from a star.
  ctx.strokeStyle = 'rgba(255, 208, 118, 0.32)';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.arc(mote.x, mote.y, radius * 1.7, 0, TAU);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 240, 190, 0.7)';
  ctx.lineWidth = 1.2;
  const gleam = radius * (1.95 + 0.35 * Math.sin(time * 3 + mote.phase));
  ctx.beginPath();
  ctx.moveTo(mote.x - gleam, mote.y);
  ctx.lineTo(mote.x + gleam, mote.y);
  ctx.moveTo(mote.x, mote.y - gleam);
  ctx.lineTo(mote.x, mote.y + gleam);
  ctx.stroke();

  const orbit = mote.phase * 1.7 + time * 1.4;
  ctx.fillStyle = 'rgba(255, 214, 130, 0.9)';
  ctx.beginPath();
  ctx.arc(mote.x + Math.cos(orbit) * radius * 2, mote.y + Math.sin(orbit) * radius * 1.3, 1.7, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/** A raindrop as a slanted streak with a pale hot head. */
export function drawRain(ctx, drop) {
  const speed = Math.hypot(drop.vx, drop.vy) || 1;
  const tailX = drop.x - (drop.vx / speed) * drop.length;
  const tailY = drop.y - (drop.vy / speed) * drop.length;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(120, 190, 255, 0.18)';
  ctx.lineWidth = drop.width + 3;
  ctx.beginPath();
  ctx.moveTo(tailX, tailY);
  ctx.lineTo(drop.x, drop.y);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(205, 238, 255, 0.86)';
  ctx.lineWidth = drop.width;
  ctx.beginPath();
  ctx.moveTo(tailX, tailY);
  ctx.lineTo(drop.x, drop.y);
  ctx.stroke();
  ctx.fillStyle = 'rgba(244, 252, 255, 0.95)';
  ctx.beginPath();
  ctx.arc(drop.x, drop.y, drop.width * 0.9, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/** A gust: a drifting oval of teal ribbons, its heading shown by chevrons. */
export function drawGust(ctx, gust, width, time) {
  const fade = gustFade(gust, width);
  if (fade <= 0.01) return;
  const edge = 110;
  ctx.save();
  ctx.globalAlpha = fade;
  ctx.globalCompositeOperation = 'lighter';

  const halo = ctx.createRadialGradient(gust.x, gust.y, 0, gust.x, gust.y, gust.rx);
  halo.addColorStop(0, 'rgba(86, 198, 190, 0.18)');
  halo.addColorStop(0.7, 'rgba(70, 150, 165, 0.08)');
  halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.ellipse(gust.x, gust.y, gust.rx * 1.15, gust.ry * 1.15, 0, 0, TAU);
  ctx.fill();

  // Ribbons curling in the direction of travel.
  ctx.lineCap = 'round';
  for (let index = 0; index < 5; index += 1) {
    const phase = gust.swirl + index * 1.25;
    const wobble = Math.sin(phase + time * 1.6) * 12;
    const rx = gust.rx * (0.48 + index * 0.1);
    const ry = gust.ry * (0.3 + (index % 3) * 0.16);
    const y = gust.y + Math.sin(phase) * gust.ry * 0.34 + wobble;
    const start = gust.direction > 0 ? Math.PI * 0.15 : Math.PI * 0.85;
    const end = gust.direction > 0 ? Math.PI * 1.4 : Math.PI * 1.75;
    ctx.strokeStyle = index % 2 === 0 ? 'rgba(127, 227, 212, 0.5)' : 'rgba(150, 214, 255, 0.34)';
    ctx.lineWidth = 1.3 + (index % 2) * 0.8;
    ctx.beginPath();
    ctx.ellipse(gust.x + Math.cos(phase) * 14, y, rx, ry, 0.2 * gust.direction, start, end);
    ctx.stroke();
  }

  // Three chevrons at the leading edge say which way the wind is going.
  const leadX = gust.x + gust.direction * gust.rx * 0.62;
  ctx.strokeStyle = 'rgba(180, 245, 235, 0.5)';
  ctx.lineWidth = 2;
  for (let index = 0; index < 3; index += 1) {
    const x = leadX + gust.direction * index * 15;
    ctx.beginPath();
    ctx.moveTo(x - gust.direction * 8, gust.y - 10);
    ctx.lineTo(x, gust.y);
    ctx.lineTo(x - gust.direction * 8, gust.y + 10);
    ctx.stroke();
  }

  // Flecks of dust riding the whirl.
  ctx.fillStyle = 'rgba(180, 245, 235, 0.4)';
  for (let index = 0; index < 9; index += 1) {
    const angle = gust.swirl * 0.7 + index * 0.7;
    const distance = gust.rx * (0.3 + (index % 3) * 0.22);
    const x = gust.x + Math.cos(angle) * distance;
    const y = gust.y + Math.sin(angle) * gust.ry * 0.55;
    ctx.beginPath();
    ctx.arc(x, y, 1.1 + (index % 2) * 0.7, 0, TAU);
    ctx.fill();
  }

  // A faint warning rim, strongest on the leading edge.
  ctx.globalAlpha = fade * 0.7;
  ctx.strokeStyle = 'rgba(127, 227, 212, 0.42)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(gust.x + gust.direction * 10, gust.y, gust.rx, gust.ry, 0, 0, TAU);
  ctx.stroke();
  ctx.globalAlpha = fade * 0.16;
  ctx.fillStyle = 'rgba(127, 227, 212, 0.2)';
  ctx.fillRect(gust.x - gust.direction * edge, gust.y - gust.ry * 0.5, edge * 0.8, gust.ry);
  ctx.restore();
}

/** The flare's expanding ring and the bright wash it leaves behind. */
export function drawFlareRing(ctx, player, time) {
  const progress = 1 - Math.max(0, player.flareTime) / 0.5;
  if (progress <= 0 || progress >= 1) return;
  const radius = 26 + progress * 190;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = (1 - progress) * 0.8;
  ctx.strokeStyle = 'rgba(255, 226, 160, 0.9)';
  ctx.lineWidth = 5 * (1 - progress) + 1;
  ctx.beginPath();
  ctx.arc(player.x, player.y, radius, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255, 150, 70, 0.5)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(player.x, player.y, radius * 1.12, 0, TAU);
  ctx.stroke();
  glow(ctx, player.x, player.y, 130 * (0.4 + progress), 'rgba(255, 190, 96, 0.5)', (1 - progress) * 0.6);
  ctx.restore();
}

/** The large emblem above the title: a slow-floating spark with a long warm halo. */
export function drawTitleEmblem(ctx, x, y, time) {
  const bob = Math.sin(time * 0.8) * 7;
  const pulse = 0.88 + 0.12 * Math.sin(time * 2.1);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glow(ctx, x, y + bob, 150 * pulse, 'rgba(255, 122, 40, 0.32)', 0.9);
  glow(ctx, x, y + bob, 62 * pulse, 'rgba(255, 208, 126, 0.7)', 0.85);
  for (let index = 0; index < 7; index += 1) {
    const angle = time * 0.5 + index * (TAU / 7);
    const distance = 44 + Math.sin(time * 1.4 + index) * 8;
    ctx.fillStyle = index % 2 === 0 ? 'rgba(255, 196, 110, 0.75)' : 'rgba(255, 240, 200, 0.5)';
    ctx.beginPath();
    ctx.arc(x + Math.cos(angle) * distance, y + bob + Math.sin(angle) * distance * 0.7, 1.8 + (index % 3), 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(255, 236, 190, 0.95)';
  ctx.beginPath();
  ctx.arc(x, y + bob, 7 * pulse, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/** The small flame icon beside the fuel bar. */
export function drawFlameGlyph(ctx, x, y, scale, fuel, time) {
  const flicker = 1 + 0.08 * Math.sin(time * 11) + 0.05 * Math.sin(time * 23);
  const low = fuel < 0.25;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glow(ctx, x, y, 22 * scale, low ? 'rgba(255, 80, 90, 0.5)' : 'rgba(255, 140, 60, 0.5)', 0.8);
  ctx.fillStyle = low ? '#ff8a8a' : PALETTE.ember;
  ctx.beginPath();
  ctx.moveTo(x, y - 11 * scale * flicker);
  ctx.bezierCurveTo(x + 8 * scale, y - 4 * scale, x + 7 * scale, y + 6 * scale, x, y + 9 * scale);
  ctx.bezierCurveTo(x - 7 * scale, y + 6 * scale, x - 8 * scale, y - 4 * scale, x, y - 11 * scale * flicker);
  ctx.fill();
  ctx.fillStyle = low ? '#ffd0d0' : PALETTE.emberHot;
  ctx.beginPath();
  ctx.ellipse(x, y + 2 * scale, 3 * scale, 5 * scale, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
}
