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
  const length = (42 + stretch * 40) * scale;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = blink;

  glow(ctx, player.x, player.y, 108 * scale, 'rgba(255, 122, 40, 0.42)', 0.9);
  glow(ctx, player.x, player.y, 60 * scale, 'rgba(255, 138, 50, 0.62)', 0.95);
  glow(ctx, player.x, player.y, 30 * scale, 'rgba(255, 224, 156, 0.98)', 1);

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
  ctx.arc(player.x, player.y, 21 * scale, 0, TAU);
  ctx.stroke();

  ctx.fillStyle = PALETTE.emberHot;
  ctx.beginPath();
  ctx.arc(player.x, player.y, 8.4 * scale, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/** A floating fuel mote: a warm bead with a breathing halo and a four-point glimmer. */
export function drawMote(ctx, mote, time) {
  const pulse = 0.86 + 0.14 * Math.sin(time * 4 + mote.phase);
  const radius = mote.radius * pulse;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glow(ctx, mote.x, mote.y, 52 * pulse, 'rgba(255, 182, 68, 0.55)', 0.9);
  glow(ctx, mote.x, mote.y, 23 * pulse, 'rgba(255, 243, 198, 1)', 1);
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
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = 'rgba(96, 168, 255, 0.26)';
  ctx.lineWidth = drop.width + 4.5;
  ctx.beginPath();
  ctx.moveTo(tailX, tailY);
  ctx.lineTo(drop.x, drop.y);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(188, 228, 255, 0.9)';
  ctx.lineWidth = drop.width;
  ctx.beginPath();
  ctx.moveTo(tailX, tailY);
  ctx.lineTo(drop.x, drop.y);
  ctx.stroke();
  ctx.fillStyle = 'rgba(248, 253, 255, 1)';
  ctx.beginPath();
  ctx.arc(drop.x, drop.y, drop.width * 1.1, 0, TAU);
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

/** A hail shard: a cold diamond with a short icy wake. */
export function drawHail(ctx, shard) {
  const size = shard.radius;
  const speed = Math.hypot(shard.vx, shard.vy) || 1;
  const tailX = shard.x - (shard.vx / speed) * size * 4.6;
  const tailY = shard.y - (shard.vy / speed) * size * 4.6;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  // The icy wake.
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(120, 200, 255, 0.32)';
  ctx.lineWidth = size * 0.9;
  ctx.beginPath();
  ctx.moveTo(tailX, tailY);
  ctx.lineTo(shard.x, shard.y);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(226, 246, 255, 0.8)';
  ctx.lineWidth = size * 0.3;
  ctx.stroke();

  ctx.translate(shard.x, shard.y);
  ctx.rotate(shard.spin);
  glow(ctx, 0, 0, size * 4.2, 'rgba(150, 210, 255, 0.5)', 0.7);

  ctx.fillStyle = 'rgba(214, 242, 255, 0.92)';
  ctx.beginPath();
  ctx.moveTo(0, -size * 1.5);
  ctx.lineTo(size * 0.85, 0);
  ctx.lineTo(0, size * 1.5);
  ctx.lineTo(-size * 0.85, 0);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.beginPath();
  ctx.moveTo(0, -size * 0.9);
  ctx.lineTo(size * 0.42, 0);
  ctx.lineTo(0, size * 0.35);
  ctx.lineTo(-size * 0.42, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** An ash wisp: a violet orb trailing dark tendrils, its core pulsing. */
export function drawWisp(ctx, wisp, time) {
  const pulse = 0.85 + 0.15 * Math.sin(time * 3.6 + wisp.phase);
  const radius = wisp.radius * pulse;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  glow(ctx, wisp.x, wisp.y, radius * 4.4, 'rgba(150, 92, 235, 0.55)', 0.85);
  glow(ctx, wisp.x, wisp.y, radius * 1.7, 'rgba(221, 176, 255, 0.85)', 0.95);

  // Tendrils dragged behind the wisp's motion.
  const speed = Math.hypot(wisp.vx, wisp.vy) || 1;
  const tailX = -wisp.vx / speed;
  const tailY = -wisp.vy / speed;
  ctx.strokeStyle = 'rgba(176, 120, 255, 0.5)';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  for (let index = 0; index < 3; index += 1) {
    const spread = (index - 1) * 0.5;
    ctx.beginPath();
    ctx.moveTo(wisp.x, wisp.y);
    ctx.quadraticCurveTo(
      wisp.x + tailX * radius * 2.2 + tailY * spread * radius,
      wisp.y + tailY * radius * 2.2 - tailX * spread * radius,
      wisp.x + tailX * radius * 3.4,
      wisp.y + tailY * radius * 3.4,
    );
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(243, 227, 255, 0.95)';
  ctx.beginPath();
  ctx.arc(wisp.x, wisp.y, radius * 0.55, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/** The storm boss: a vast dark eye ringed with lightning, its heart glowing through the cloud. */
export function drawBoss(ctx, boss, time) {
  const pulse = 1 + 0.02 * Math.sin(time * 1.6);
  const rx = boss.rx * pulse;
  const ry = boss.ry * pulse;
  const flash = boss.hitFlash > 0 ? boss.hitFlash / 0.28 : 0;

  ctx.save();
  ctx.translate(boss.x, boss.y);

  // A cold violet halo so the storm's mass reads against the night.
  ctx.globalCompositeOperation = 'lighter';
  glow(ctx, 0, 0, rx * 1.2, 'rgba(124, 92, 226, 0.22)', 1);

  // The cloud body, dark against the sky.
  const body = ctx.createRadialGradient(0, 0, rx * 0.12, 0, 0, rx);
  body.addColorStop(0, 'rgba(24, 16, 46, 0.96)');
  body.addColorStop(0.6, 'rgba(15, 10, 32, 0.92)');
  body.addColorStop(1, 'rgba(10, 8, 24, 0)');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, TAU);
  ctx.fill();

  // Rotating storm rims.
  ctx.globalCompositeOperation = 'lighter';
  for (let ring = 0; ring < 3; ring += 1) {
    const spin = time * (0.5 + ring * 0.22) * boss.dir + boss.phase;
    ctx.strokeStyle = ring === 1 ? 'rgba(255, 158, 92, 0.5)' : 'rgba(150, 120, 255, 0.42)';
    ctx.lineWidth = 2.6 - ring * 0.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx * (0.94 - ring * 0.12), ry * (0.94 - ring * 0.12), spin * 0.05, spin, spin + Math.PI * 1.2);
    ctx.stroke();
  }

  // The eye.
  glow(ctx, 0, 0, rx * 0.5, 'rgba(255, 132, 74, 0.45)', 0.9);
  glow(ctx, 0, 0, rx * 0.24, 'rgba(255, 216, 158, 0.9)', 0.95);
  ctx.fillStyle = 'rgba(14, 8, 26, 0.9)';
  ctx.beginPath();
  ctx.ellipse(0, 0, rx * 0.3, ry * 0.3, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 226, 170, 0.95)';
  ctx.beginPath();
  ctx.ellipse(0, 0, rx * 0.12, ry * 0.14, 0, 0, TAU);
  ctx.fill();

  // Crackling arcs around the rim.
  ctx.strokeStyle = 'rgba(202, 190, 255, 0.65)';
  ctx.lineWidth = 1.4;
  for (let arc = 0; arc < 4; arc += 1) {
    const start = time * (0.9 + arc * 0.2) + arc * 1.7;
    ctx.beginPath();
    for (let step = 0; step <= 5; step += 1) {
      const angle = start + step * 0.16;
      const radius = 0.78 + (step % 2) * 0.1;
      const x = Math.cos(angle) * rx * radius;
      const y = Math.sin(angle) * ry * radius;
      if (step === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  if (flash > 0) {
    ctx.globalAlpha = flash * 0.5;
    ctx.fillStyle = 'rgba(255, 230, 190, 1)';
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

/** The storm shield: a breathing ring of violet light while a charge is held. */
export function drawShieldRing(ctx, player, time) {
  const pulse = 0.9 + 0.1 * Math.sin(time * 4.2);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.55;
  ctx.strokeStyle = 'rgba(199, 163, 255, 0.85)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(player.x, player.y, 30 * pulse, 0, TAU);
  ctx.stroke();
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = 'rgba(150, 110, 255, 0.6)';
  ctx.beginPath();
  ctx.arc(player.x, player.y, 30 * pulse, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/** Lightning: a shrinking warning ring before the strike, then the bolt and its wash. */
export function drawBolts(ctx, bolts, height) {
  if (bolts.length === 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let index = 0; index < bolts.length; index += 1) {
    const bolt = bolts[index];
    if (!bolt.struck) {
      const urgency = 1 - Math.max(0, bolt.warn) / 0.65;
      const ringRadius = 56 - urgency * 22;
      ctx.globalAlpha = 0.3 + urgency * 0.5;
      const warn = ctx.createRadialGradient(bolt.x, bolt.y, 0, bolt.x, bolt.y, ringRadius);
      warn.addColorStop(0, 'rgba(255, 154, 72, 0.5)');
      warn.addColorStop(0.66, 'rgba(255, 116, 52, 0.2)');
      warn.addColorStop(1, 'rgba(255, 80, 30, 0)');
      ctx.fillStyle = warn;
      ctx.beginPath();
      ctx.arc(bolt.x, bolt.y, ringRadius, 0, TAU);
      ctx.fill();

      ctx.globalAlpha = 0.5 + urgency * 0.5;
      ctx.strokeStyle = 'rgba(255, 220, 150, 0.95)';
      ctx.lineWidth = 1.6 + urgency * 1.8;
      ctx.beginPath();
      ctx.arc(bolt.x, bolt.y, ringRadius, 0, TAU);
      ctx.stroke();

      // A small crosshair marks the exact landing spot.
      ctx.globalAlpha = 0.35 + urgency * 0.4;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(bolt.x - 8, bolt.y);
      ctx.lineTo(bolt.x + 8, bolt.y);
      ctx.moveTo(bolt.x, bolt.y - 8);
      ctx.lineTo(bolt.x, bolt.y + 8);
      ctx.stroke();
    } else {
      const fade = Math.max(0, Math.min(1, bolt.life / 0.9));
      ctx.globalAlpha = fade;
      ctx.strokeStyle = 'rgba(255, 236, 190, 0.95)';
      ctx.lineWidth = 4 * fade + 1;
      ctx.beginPath();
      ctx.moveTo(bolt.x + 8, 0);
      for (let step = 1; step <= 6; step += 1) {
        const t = step / 6;
        const x = bolt.x + 8 + Math.sin(step * 2.3 + index) * 16 * (1 - t);
        const y = t * bolt.y;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.strokeStyle = 'rgba(170, 210, 255, 0.6)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(bolt.x - 6, 0);
      ctx.lineTo(bolt.x + 4, bolt.y * 0.6);
      ctx.lineTo(bolt.x - 4, bolt.y);
      ctx.stroke();
      glow(ctx, bolt.x, bolt.y, 90 * fade + 18, 'rgba(255, 200, 130, 0.55)', fade * 0.7);
    }
  }
  ctx.restore();
}
