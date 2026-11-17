// Hazards: rain and gusts. Rain falls as slanted bright streaks and takes a bite of fuel on
// contact. A gust is a wandering whirl of wind, a drifting oval of teal ribbons that shoves the
// ember off its line and burns fuel while the ember is caught inside it. Both answer the flare.

import { RAIN, WORLD } from './config.js';
import { between, integerBetween } from './random.js';

/** One raindrop at the top of the sky, or occasionally blown in from a side. */
export function spawnRain(state, difficulty) {
  if (state.drops.length >= Math.min(RAIN.max, difficulty.maxDrops)) return false;
  const random = state.random;
  const fromSide = random() < 0.16;
  const x = fromSide ? (random() < 0.5 ? -20 : state.width + 20) : between(random, -40, state.width + 40);
  const y = fromSide ? between(random, 40, state.height * 0.6) : -24;
  const fall = between(random, 0.85, 1.25) * difficulty.rainSpeed;
  const slant = state.wind.x * 150 + between(random, -35, 35);
  state.drops.push({
    x,
    y,
    vx: slant + (fromSide ? (x < 0 ? 90 : -90) : 0),
    vy: fall,
    length: between(random, 22, 42),
    width: between(random, 1.4, 2.6),
    age: 0,
  });
  return true;
}

/**
 * Fall every drop, remove the ones that leave the sky, and return the drops that struck the
 * ember (a hit consumes them, so one drop never hits twice).
 */
export function updateRain(state, dt) {
  const player = state.player;
  const hits = [];
  const keep = [];
  for (let index = 0; index < state.drops.length; index += 1) {
    const drop = state.drops[index];
    drop.age += dt;
    drop.x += drop.vx * dt;
    drop.y += drop.vy * dt;
    if (drop.x < -120 || drop.x > state.width + 120 || drop.y > state.height + 60) continue;

    const reach = player.radius + RAIN.radius + 2;
    const dx = drop.x - player.x;
    const dy = drop.y - player.y;
    if (player.invuln <= 0 && dx * dx + dy * dy <= reach * reach) {
      hits.push({ x: drop.x, y: drop.y });
      continue;
    }
    keep.push(drop);
  }
  state.drops = keep;
  return hits;
}

/** Rain in a circle is vaporised by a flare; returns the cleared drops' positions. */
export function clearRainAround(state, x, y, radius) {
  const cleared = [];
  const keep = [];
  for (let index = 0; index < state.drops.length; index += 1) {
    const drop = state.drops[index];
    const dx = drop.x - x;
    const dy = drop.y - y;
    if (dx * dx + dy * dy <= radius * radius) cleared.push({ x: drop.x, y: drop.y });
    else keep.push(drop);
  }
  state.drops = keep;
  return cleared;
}

/** A wandering gust: an oval whirl that drifts across the sky from one side. */
export function spawnGust(state, difficulty) {
  if (state.gusts.length >= difficulty.maxGusts) return false;
  const random = state.random;
  const direction = integerBetween(random, 0, 1) === 0 ? 1 : -1;
  const rx = between(random, 118, 178);
  const ry = between(random, 88, 148);
  const y = between(random, 150, Math.max(170, state.height - 150));
  state.gusts.push({
    x: direction > 0 ? -rx - 60 : state.width + rx + 60,
    y,
    rx,
    ry,
    direction,
    speed: between(random, 185, 245) + state.wave * 11,
    age: 0,
    strength: 330 + state.wave * 24,
    swirl: random() * Math.PI * 2,
    wobble: between(random, 0.6, 1.4),
  });
  return true;
}

/**
 * Sweep gusts across the sky. While the ember is inside a whirl it is pushed along the wind and
 * loses extra fuel. Returns how many whirls hold the ember, and the direction of the last one.
 */
export function updateGusts(state, dt) {
  const player = state.player;
  let caught = 0;
  let direction = 0;
  const keep = [];
  for (let index = 0; index < state.gusts.length; index += 1) {
    const gust = state.gusts[index];
    gust.age += dt;
    gust.x += gust.direction * gust.speed * dt;
    gust.y += Math.sin(gust.age * 0.9 * gust.wobble + gust.swirl) * 14 * dt;
    gust.swirl += dt * 2.2;

    const dx = (player.x - gust.x) / gust.rx;
    const dy = (player.y - gust.y) / gust.ry;
    const inside = dx * dx + dy * dy <= 1;
    if (inside) {
      caught += 1;
      direction = gust.direction;
      player.vx += gust.direction * gust.strength * dt;
      player.vy += Math.sin(gust.swirl + player.x * 0.01) * 42 * dt;
      player.x += gust.direction * 62 * dt;
      player.x = Math.max(WORLD.margin, Math.min(state.width - WORLD.margin, player.x));
    }

    const off = gust.direction > 0 ? gust.x - gust.rx > state.width + 80 : gust.x + gust.rx < -80;
    if (!off) keep.push(gust);
  }
  state.gusts = keep;
  return { caught, direction };
}

/** The gust fuel burn for a step: a little more for each whirl holding the ember. */
export function gustDrain(caught, dt) {
  return caught * WORLD.gustDrain * dt;
}

/** Whether the ember sits inside any gust, for the HUD's wind warning. */
export function inGust(state) {
  const player = state.player;
  for (let index = 0; index < state.gusts.length; index += 1) {
    const gust = state.gusts[index];
    const dx = (player.x - gust.x) / gust.rx;
    const dy = (player.y - gust.y) / gust.ry;
    if (dx * dx + dy * dy <= 1) return true;
  }
  return false;
}

/** How visible a gust is: it fades in and out at the edges of its crossing. */
export function gustFade(gust, width) {
  const edge = 140;
  if (gust.direction > 0) return Math.max(0, Math.min(1, (gust.x + gust.rx) / edge, (width + edge - gust.x) / edge));
  return Math.max(0, Math.min(1, (width - gust.x + gust.rx) / edge, (gust.x + edge) / edge));
}
