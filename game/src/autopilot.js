// A small pilot used only to stage the ?shot scenes and to prove the game is playable without a
// human hand. It flies toward the nearest worthwhile mote, leans away from rain and gust whirls,
// hugs the middle away from the edges, and flares when a drop gets too close. `care` dials its
// caution from a careful player (1) down to a hurried one, which is how the results scene is made.

import { WORLD } from './config.js';

/** The nearest mote, weighted toward fuel when the flame is low. */
function bestMote(state) {
  const player = state.player;
  let best = null;
  let bestCost = Infinity;
  for (let index = 0; index < state.motes.length; index += 1) {
    const mote = state.motes[index];
    const distance = Math.hypot(mote.x - player.x, mote.y - player.y);
    const urgency = state.fuel < 42 ? -150 : 0;
    const cost = distance + urgency + mote.age * 2;
    if (cost < bestCost) {
      bestCost = cost;
      best = mote;
    }
  }
  return best;
}

/**
 * The steering intent for one step: a unit vector toward safety and food. `care` 1 is a careful
 * pilot; near 0 it chases motes and ignores the weather.
 */
export function steer(state, care = 1, hunger = 1) {
  const player = state.player;
  const width = state.width;
  const height = state.height;
  let x = 0;
  let y = 0;

  const mote = hunger > 0.01 ? bestMote(state) : null;
  if (mote !== null) {
    const dx = mote.x - player.x;
    const dy = mote.y - player.y;
    const distance = Math.hypot(dx, dy) || 1;
    const pull = (state.fuel < 35 ? 1.7 : 1.15) * hunger;
    x += (dx / distance) * pull;
    y += (dy / distance) * pull;
  } else {
    x += (width / 2 - player.x) / 280;
    y += (height / 2 - player.y) / 280;
  }

  // Rain: push away from where each drop is and where it will be in a third of a second.
  for (let index = 0; index < state.drops.length; index += 1) {
    const drop = state.drops[index];
    for (let look = 0; look < 2; look += 1) {
      const at = look * 0.34;
      const dropX = drop.x + drop.vx * at;
      const dropY = drop.y + drop.vy * at;
      const dx = player.x - dropX;
      const dy = player.y - dropY;
      const distance = Math.hypot(dx, dy) || 1;
      const reach = 168 + care * 40;
      if (distance < reach) {
        const weight = ((reach - distance) / reach) * care * 2.4;
        x += (dx / distance) * weight;
        y += (dy / distance) * weight * 0.85;
      }
    }
  }

  // Gusts: leave the whirl along the shortest way out of its oval, and lean upwind outside it.
  for (let index = 0; index < state.gusts.length; index += 1) {
    const gust = state.gusts[index];
    const dx = (player.x - gust.x) / gust.rx;
    const dy = (player.y - gust.y) / gust.ry;
    const inside = dx * dx + dy * dy;
    if (inside <= 1.35) {
      const distance = Math.hypot(dx, dy) || 0.001;
      const weight = care * (inside <= 1 ? 3.2 : 1.3);
      x += (dx / distance) * weight;
      y += (dy / distance) * weight;
      x -= gust.direction * care * 0.5;
    }
  }

  // The edges of the sky push back.
  const edge = 78;
  if (player.x < edge) x += ((edge - player.x) / edge) * 2.2;
  if (player.x > width - edge) x -= ((player.x - (width - edge)) / edge) * 2.2;
  if (player.y < edge) y += ((edge - player.y) / edge) * 2.2;
  if (player.y > height - edge) y -= ((player.y - (height - edge)) / edge) * 2.2;

  const length = Math.hypot(x, y);
  if (length < 0.0001) return { x: 0, y: 0 };
  return { x: x / length, y: y / length };
}

/** Flare when a drop is about to touch and the flame can spare the price. */
export function shouldFlare(state) {
  if (state.player.flareCooldown > 0) return false;
  if (state.fuel < WORLD.flareCost + 14) return false;
  const player = state.player;
  for (let index = 0; index < state.drops.length; index += 1) {
    const drop = state.drops[index];
    if (Math.hypot(drop.x - player.x, drop.y - player.y) < 76) return true;
  }
  return false;
}
