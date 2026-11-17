// The wave director: difficulty is read as a table, not scattered constants. Every twenty
// seconds the night moves to the next wave, rain thickens and quickens, gusts come more often,
// motes grow scarcer but come in pairs, and the flame burns a little faster. Spawn timers return
// plain commands so the world (not the director) owns the entities it creates.

import { WORLD } from './config.js';

export const WAVE_SECONDS = 20;
const WAVE_NAMES = [
  'FIRST BREATH',
  'NIGHT BREEZE',
  'CROSSWIND',
  'SQUALL',
  'GALE',
  'TEMPEST',
  'EMBERSTORM',
  'THE LONG NIGHT',
];

/** The name the HUD shows for a wave, cycling the last name for endless nights. */
export function waveName(wave) {
  const index = Math.min(WAVE_NAMES.length - 1, Math.max(0, wave - 1));
  return WAVE_NAMES[index];
}

/** Every spawn and drain rate for a wave. */
export function difficultyOf(wave) {
  const step = Math.max(0, wave - 1);
  return {
    drain: Math.min(WORLD.maxDrain, WORLD.baseDrain + step * WORLD.drainPerWave),
    moteInterval: Math.max(0.62, 1.55 - step * 0.09),
    moteBurst: wave >= 5 ? 2 : 1,
    rainInterval: Math.max(0.16, 0.42 - step * 0.028),
    rainBurst: wave >= 7 ? 2 : 1,
    rainSpeed: Math.min(560, 235 + step * 18),
    maxDrops: Math.min(60, 16 + wave * 4),
    gustInterval: Math.max(6, 12 - step),
    maxGusts: wave >= 6 ? 2 : 1,
  };
}

/** A fresh director, just after the first breath. */
export function createWaves() {
  return {
    sinceWave: 0,
    moteTimer: 0.55,
    rainTimer: 1.7,
    gustTimer: 9,
  };
}

/** Restart the pacing. */
export function resetWaves(waves) {
  waves.sinceWave = 0;
  waves.moteTimer = 0.55;
  waves.rainTimer = 1.7;
  waves.gustTimer = 9;
}

/**
 * Advance the clocks and return the spawn commands for this step: {type:'wave'|'mote'|'rain'|'gust'}.
 * The world executes them, so all entity creation stays in one place.
 */
export function updateWaves(waves, state, dt) {
  const commands = [];
  waves.sinceWave += dt;
  if (waves.sinceWave >= WAVE_SECONDS) {
    waves.sinceWave -= WAVE_SECONDS;
    state.wave += 1;
    commands.push({ type: 'wave' });
  }

  const difficulty = difficultyOf(state.wave);

  waves.moteTimer -= dt;
  if (waves.moteTimer <= 0) {
    waves.moteTimer = difficulty.moteInterval * (0.78 + state.random() * 0.44);
    for (let count = 0; count < difficulty.moteBurst; count += 1) commands.push({ type: 'mote' });
  }

  waves.rainTimer -= dt;
  if (waves.rainTimer <= 0) {
    waves.rainTimer = difficulty.rainInterval * (0.6 + state.random() * 0.8);
    for (let count = 0; count < difficulty.rainBurst; count += 1) commands.push({ type: 'rain' });
  }

  waves.gustTimer -= dt;
  if (waves.gustTimer <= 0) {
    waves.gustTimer = difficulty.gustInterval * (0.82 + state.random() * 0.36);
    commands.push({ type: 'gust' });
  }

  return commands;
}
