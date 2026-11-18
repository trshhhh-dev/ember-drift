// Hazards: rain, gusts, storm hail and ash wisps. Rain falls as slanted bright streaks and takes a
// bite of fuel on contact. A gust is a wandering whirl of wind, a drifting oval of teal ribbons
// that shoves the ember off its line and burns fuel while the ember is caught inside it. Hail
// shards fall hard and fast, and ash wisps are slow violet orbs that lean after the ember. All of
// them answer the flare.

import { HAIL, RAIN, WISP, WORLD } from './config.js';
import { between, integerBetween } from './random.js';

/** One raindrop at the top of the sky, or occasionally blown in from a side. */
export function spawnRain(state, difficulty) {
  if (state.drops.length >= Math.min(RAIN.max, difficulty.maxDrops)) return false;
  const random = state.random;
  const fromSide = random() < 0.16;
  const x = fromSide ? (random() < 0.5 ? -20 : state.width + 20) : between(random, -40, state.width + 40);
  const y = fromSide ? between(random, 40, state.height * 0.6) : -24;
  const fall = between(random, 0.85, 1.25) * difficulty.rainSpeed;
  const slant = state.wind.x * 190 + between(random, -30, 30) - 26;
  state.drops.push({
    x,
    y,
    vx: slant + (fromSide ? (x < 0 ? 90 : -90) : 0),
    vy: fall,
    length: between(random, 36, 66),
    width: between(random, 2.0, 3.4),
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

/** One hail shard: bigger, faster and heavier than a raindrop, blown across by the wind. */
export function spawnHail(state, difficulty) {
  if (state.hail.length >= Math.min(HAIL.max, difficulty.maxDrops)) return false;
  const random = state.random;
  state.hail.push({
    x: between(random, -30, state.width + 30),
    y: -30,
    vx: state.wind.x * 260 + between(random, -70, 70),
    vy: between(random, 360, 470) + difficulty.rainSpeed * 0.8,
    radius: HAIL.radius,
    spin: random() * Math.PI * 2,
    spinRate: between(random, -6, 6),
    age: 0,
  });
  return true;
}

/** Fall every shard, spin it, and return the ones that struck the ember. */
export function updateHail(state, dt) {
  const player = state.player;
  const hits = [];
  const keep = [];
  for (let index = 0; index < state.hail.length; index += 1) {
    const shard = state.hail[index];
    shard.age += dt;
    shard.vy += 150 * dt;
    shard.x += shard.vx * dt;
    shard.y += shard.vy * dt;
    shard.spin += shard.spinRate * dt;
    if (shard.x < -120 || shard.x > state.width + 120 || shard.y > state.height + 80) continue;

    const reach = player.radius + shard.radius + 2;
    const dx = shard.x - player.x;
    const dy = shard.y - player.y;
    if (player.invuln <= 0 && dx * dx + dy * dy <= reach * reach) {
      hits.push({ x: shard.x, y: shard.y });
      continue;
    }
    keep.push(shard);
  }
  state.hail = keep;
  return hits;
}

/** An ash wisp: a slow violet orb that leans toward the ember as it drifts. */
export function spawnWisp(state, difficulty) {
  if (state.wisps.length >= difficulty.maxWisps) return false;
  const random = state.random;
  const edge = integerBetween(random, 0, 3);
  const x = edge === 0 ? -30 : edge === 1 ? state.width + 30 : between(random, 80, state.width - 80);
  const y = edge === 2 ? -30 : edge === 3 ? state.height + 30 : between(random, 110, state.height - 130);
  state.wisps.push({
    x,
    y,
    vx: between(random, -20, 20),
    vy: between(random, -14, 24),
    radius: WISP.radius,
    age: 0,
    phase: random() * Math.PI * 2,
    drift: between(random, 0.7, 1.5),
  });
  return true;
}

/** Drift the wisps after the ember, and return the ones that touched it. */
export function updateWisps(state, dt) {
  const player = state.player;
  const hits = [];
  const keep = [];
  for (let index = 0; index < state.wisps.length; index += 1) {
    const wisp = state.wisps[index];
    wisp.age += dt;
    wisp.phase += dt * 2.4;
    const dx = player.x - wisp.x;
    const dy = player.y - wisp.y;
    const distance = Math.hypot(dx, dy) || 1;
    const pull = 46 * wisp.drift;
    wisp.vx += (dx / distance) * pull * dt + Math.cos(wisp.phase) * 8 * dt;
    wisp.vy += (dy / distance) * pull * dt + Math.sin(wisp.phase * 1.3) * 8 * dt;
    const speed = Math.hypot(wisp.vx, wisp.vy);
    const cap = 96;
    if (speed > cap) {
      wisp.vx = (wisp.vx / speed) * cap;
      wisp.vy = (wisp.vy / speed) * cap;
    }
    wisp.x += wisp.vx * dt;
    wisp.y += wisp.vy * dt;

    const reach = player.radius + wisp.radius;
    if (player.invuln <= 0 && dx * dx + dy * dy <= reach * reach) {
      hits.push({ x: wisp.x, y: wisp.y });
      continue;
    }
    if (wisp.age < WISP.lifetime && wisp.x > -140 && wisp.x < state.width + 140 && wisp.y > -140 && wisp.y < state.height + 140) {
      keep.push(wisp);
    }
  }
  state.wisps = keep;
  return hits;
}

/** A flare's circle clears rain, hail and wisps alike; returns every cleared position. */
export function clearHazardsAround(state, x, y, radius) {
  const cleared = [];
  const radiusSq = radius * radius;

  const keepDrops = [];
  for (let index = 0; index < state.drops.length; index += 1) {
    const drop = state.drops[index];
    const dx = drop.x - x;
    const dy = drop.y - y;
    if (dx * dx + dy * dy <= radiusSq) cleared.push({ x: drop.x, y: drop.y });
    else keepDrops.push(drop);
  }
  state.drops = keepDrops;

  const keepHail = [];
  for (let index = 0; index < state.hail.length; index += 1) {
    const shard = state.hail[index];
    const dx = shard.x - x;
    const dy = shard.y - y;
    if (dx * dx + dy * dy <= radiusSq) cleared.push({ x: shard.x, y: shard.y });
    else keepHail.push(shard);
  }
  state.hail = keepHail;

  const keepWisps = [];
  for (let index = 0; index < state.wisps.length; index += 1) {
    const wisp = state.wisps[index];
    const dx = wisp.x - x;
    const dy = wisp.y - y;
    if (dx * dx + dy * dy <= radiusSq) cleared.push({ x: wisp.x, y: wisp.y });
    else keepWisps.push(wisp);
  }
  state.wisps = keepWisps;

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
