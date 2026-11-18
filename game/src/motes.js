// Fuel motes: warm little lights that drift in from the edges on the night wind. They are the
// player's fuel, score and combo in one, so they are placed to pull the ember across the sky.
// A flare's shockwave can yank nearby motes toward the player.

import { MOTE, TAU, WORLD } from './config.js';
import { between, integerBetween } from './random.js';

/** One mote at an edge of the sky, drifting toward a point inside it. */
export function spawnMote(state) {
  if (state.motes.length >= MOTE.max) return false;
  const random = state.random;
  const margin = 90;
  const width = state.width;
  const height = state.height;
  const edge = integerBetween(random, 0, 3);
  let x;
  let y;
  if (edge === 0) {
    x = between(random, margin, width - margin);
    y = -26;
  } else if (edge === 1) {
    x = -26;
    y = between(random, 110, height - 130);
  } else if (edge === 2) {
    x = width + 26;
    y = between(random, 110, height - 130);
  } else {
    x = between(random, margin, width - margin);
    y = height + 26;
  }
  const targetX = between(random, margin, width - margin);
  const targetY = between(random, 100, height - 120);
  const angle = Math.atan2(targetY - y, targetX - x);
  const speed = between(random, 30, 64);
  state.motes.push({
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius: MOTE.radius,
    age: 0,
    phase: random() * TAU,
    wobble: between(random, 0.7, 1.5),
    spin: between(random, -1.6, 1.6),
  });
  return true;
}

/**
 * Move every mote, let the ambient wind carry it, and collect the ones touching the ember.
 * Returns the collected motes' positions so the world can spark them.
 */
export function updateMotes(state, dt) {
  const player = state.player;
  const collected = [];
  const keep = [];
  for (let index = 0; index < state.motes.length; index += 1) {
    const mote = state.motes[index];
    mote.age += dt;
    mote.phase += mote.spin * dt;

    // A soft wander plus the wind: motes are blown, never driven.
    mote.vx += (state.wind.x * 24 + Math.cos(mote.phase) * 5 * mote.wobble) * dt;
    mote.vy += (state.wind.y * 16 + Math.sin(mote.phase * 1.3) * 7 * mote.wobble) * dt;
    const speed = Math.hypot(mote.vx, mote.vy);
    if (speed > 120) {
      mote.vx = (mote.vx / speed) * 120;
      mote.vy = (mote.vy / speed) * 120;
    }
    mote.x += mote.vx * dt;
    mote.y += mote.vy * dt;

    const reach = (player.radius + mote.radius + 6) * (state.mods?.magnet ?? 1);
    const dx = mote.x - player.x;
    const dy = mote.y - player.y;
    if (dx * dx + dy * dy <= reach * reach) {
      collected.push({ x: mote.x, y: mote.y });
      continue;
    }

    const out = mote.x < -90 || mote.x > state.width + 90 || mote.y < -110 || mote.y > state.height + 110;
    if (mote.age > MOTE.lifetime || out) continue;
    keep.push(mote);
  }
  state.motes = keep;
  return collected;
}

/** A flare shockwave grabs nearby motes and swings them toward the ember. */
export function pullMotesToward(state, x, y, radius, strength) {
  for (let index = 0; index < state.motes.length; index += 1) {
    const mote = state.motes[index];
    const dx = x - mote.x;
    const dy = y - mote.y;
    const distance = Math.hypot(dx, dy);
    if (distance > radius || distance < 1) continue;
    const pull = strength * (1 - distance / radius);
    mote.vx += (dx / distance) * pull;
    mote.vy += (dy / distance) * pull;
  }
}

/** Fuel a mote gives back; kept here beside the entity it belongs to. */
export function moteFuelValue() {
  return WORLD.moteFuel;
}
