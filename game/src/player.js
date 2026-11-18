// The player's ember: flight, fuel, damage and the flare burst. The ember answers its aim with
// a springy exponential approach (quick but never twitchy), burns fuel every second, and spends
// a chunk of that same fuel to flare: a choice that trades survival time for a moment of safety.

import { PLAYER, WORLD } from './config.js';

/** A fresh ember. */
export function createPlayer() {
  return {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    radius: PLAYER.radius,
    invuln: 0,
    flareCooldown: 0,
    flareTime: 0,
    flareFlash: 0,
    trailTimer: 0,
    heading: -Math.PI / 2,
  };
}

/** Put the ember in the middle of the night and clear its timers. */
export function resetPlayer(state) {
  const player = state.player;
  player.x = state.width / 2;
  player.y = state.height / 2;
  player.vx = 0;
  player.vy = 0;
  player.invuln = 0;
  player.flareCooldown = 0;
  player.flareTime = 0;
  player.flareFlash = 0;
  player.trailTimer = 0;
  player.heading = -Math.PI / 2;
}

/**
 * Fly the ember for one step toward `intent` (a vector whose length is at most 1).
 * Returns true on the steps where a trail particle should be born.
 */
export function updatePlayer(state, intent, dt) {
  const player = state.player;
  player.invuln = Math.max(0, player.invuln - dt);
  player.flareCooldown = Math.max(0, player.flareCooldown - dt);
  player.flareTime = Math.max(0, player.flareTime - dt);
  player.flareFlash = Math.max(0, player.flareFlash - dt);

  const wantedX = intent.x * PLAYER.speed * (state.mods?.speed ?? 1);
  const wantedY = intent.y * PLAYER.speed * (state.mods?.speed ?? 1);
  const answer = 1 - Math.exp(-PLAYER.accel * dt);
  player.vx += (wantedX - player.vx) * answer;
  player.vy += (wantedY - player.vy) * answer;

  // The night's ambient wind nudges a hovering ember, so even stillness has a drift.
  player.vx += state.wind.x * 14 * dt;
  player.vy += state.wind.y * 10 * dt;

  player.x += player.vx * dt;
  player.y += player.vy * dt;

  const left = WORLD.margin;
  const right = state.width - WORLD.margin;
  const top = WORLD.margin;
  const bottom = state.height - WORLD.margin;
  if (player.x < left) {
    player.x = left;
    player.vx = Math.max(0, player.vx);
  } else if (player.x > right) {
    player.x = right;
    player.vx = Math.min(0, player.vx);
  }
  if (player.y < top) {
    player.y = top;
    player.vy = Math.max(0, player.vy);
  } else if (player.y > bottom) {
    player.y = bottom;
    player.vy = Math.min(0, player.vy);
  }

  const speed = Math.hypot(player.vx, player.vy);
  if (speed > 24) player.heading = Math.atan2(player.vy, player.vx);

  player.trailTimer -= dt;
  if (player.trailTimer <= 0 && speed > 90) {
    player.trailTimer = PLAYER.trailEvery;
    return true;
  }
  return false;
}

/** Add fuel, never past full. */
export function addFuel(state, amount) {
  state.fuel = Math.min(WORLD.maxFuel, state.fuel + amount);
}

/** Spend fuel, never below empty. */
export function spendFuel(state, amount) {
  state.fuel = Math.max(0, state.fuel - amount);
}

/** Whether the ember could flare right now: off cooldown and with fuel to pay for it. */
export function canFlare(state) {
  return state.player.flareCooldown <= 0 && state.fuel >= WORLD.flareCost;
}

/** Pay for and begin a flare; the world is responsible for what the burst touches. */
export function beginFlare(state) {
  spendFuel(state, WORLD.flareCost);
  state.player.flareCooldown = WORLD.flareCooldown;
  state.player.flareTime = 0.5;
  state.player.flareFlash = 0.28;
  state.player.invuln = Math.max(state.player.invuln, 0.55);
}

/** Take a hit: no damage during invulnerability, otherwise lose fuel and start the blink. */
export function damagePlayer(state, amount) {
  if (state.player.invuln > 0) return false;
  spendFuel(state, amount);
  state.player.invuln = WORLD.invulnTime;
  return true;
}

/** A hit that only saps (a gust): no invulnerability, no chain break on its own. */
export function drainPlayer(state, amount) {
  spendFuel(state, amount);
}

/** The fuel fraction, 0 to 1. */
export function fuelRatio(state) {
  return Math.max(0, Math.min(1, state.fuel / WORLD.maxFuel));
}
