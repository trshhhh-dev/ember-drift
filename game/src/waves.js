// The wave director: the whole night's difficulty curve is one table, so the pacing can be read
// and tuned as rules rather than hunted down as constants. Each row is a wave's weather: how fast
// the flame drains, how thick the rain, hail and wisps come, how hard the wind blows and how warm
// or cold the sky turns. Every fifth wave is a storm boss. Spawn timers return plain commands so
// the world (not the director) owns the entities it creates.

import { WORLD } from './config.js';

export const WAVE_SECONDS = 20;

/**
 * The curve, wave by wave. `wind` scales the night's breathing wind; `hail` and `wisp` are the
 * storm hazards' intervals (0 keeps one out of the sky); `sky` picks the palette. The table ends
 * at wave 8 and `difficultyOf` carries its last row forward for the endless night.
 */
export const WAVE_TABLE = [
  {
    name: 'FIRST BREATH', drain: 1.35, moteInterval: 1.45, moteBurst: 1,
    rainInterval: 0.62, rainBurst: 2, rainSpeed: 235, maxDrops: 24,
    gustInterval: 11, maxGusts: 1, hailInterval: 0, hailBurst: 0, wispInterval: 0, maxWisps: 0,
    wind: 0.55, sky: 0,
  },
  {
    name: 'NIGHT BREEZE', drain: 1.55, moteInterval: 1.32, moteBurst: 1,
    rainInterval: 0.52, rainBurst: 2, rainSpeed: 255, maxDrops: 30,
    gustInterval: 10, maxGusts: 1, hailInterval: 2.6, hailBurst: 2, wispInterval: 0, maxWisps: 0,
    wind: 0.68, sky: 0,
  },
  {
    name: 'CROSSWIND', drain: 1.75, moteInterval: 1.2, moteBurst: 2,
    rainInterval: 0.44, rainBurst: 2, rainSpeed: 275, maxDrops: 36,
    gustInterval: 9, maxGusts: 1, hailInterval: 2.0, hailBurst: 2, wispInterval: 5.2, maxWisps: 1,
    wind: 0.82, sky: 1,
  },
  {
    name: 'SQUALL', drain: 1.95, moteInterval: 1.08, moteBurst: 2,
    rainInterval: 0.36, rainBurst: 2, rainSpeed: 300, maxDrops: 42,
    gustInterval: 8, maxGusts: 2, hailInterval: 1.6, hailBurst: 3, wispInterval: 4.4, maxWisps: 2,
    wind: 0.95, sky: 1,
  },
  {
    name: 'GALE', drain: 2.1, moteInterval: 1.0, moteBurst: 2,
    rainInterval: 0.3, rainBurst: 3, rainSpeed: 325, maxDrops: 48,
    gustInterval: 7.2, maxGusts: 2, hailInterval: 1.3, hailBurst: 3, wispInterval: 3.8, maxWisps: 2,
    wind: 1.0, sky: 2,
  },
  {
    name: 'TEMPEST', drain: 2.25, moteInterval: 0.92, moteBurst: 2,
    rainInterval: 0.26, rainBurst: 3, rainSpeed: 350, maxDrops: 52,
    gustInterval: 6.6, maxGusts: 2, hailInterval: 1.1, hailBurst: 3, wispInterval: 3.2, maxWisps: 3,
    wind: 1.05, sky: 2,
  },
  {
    name: 'EMBERSTORM', drain: 2.4, moteInterval: 0.84, moteBurst: 3,
    rainInterval: 0.22, rainBurst: 3, rainSpeed: 375, maxDrops: 56,
    gustInterval: 6.0, maxGusts: 3, hailInterval: 0.95, hailBurst: 4, wispInterval: 2.8, maxWisps: 3,
    wind: 1.1, sky: 1,
  },
  {
    name: 'THE LONG NIGHT', drain: 2.55, moteInterval: 0.78, moteBurst: 3,
    rainInterval: 0.18, rainBurst: 3, rainSpeed: 400, maxDrops: 60,
    gustInterval: 5.5, maxGusts: 3, hailInterval: 0.85, hailBurst: 4, wispInterval: 2.5, maxWisps: 3,
    wind: 1.15, sky: 2,
  },
];

/** Whether a wave is a storm-boss wave: every fifth night. */
export function isBossWave(wave) {
  return wave > 0 && wave % 5 === 0;
}

/** The name the HUD shows for a wave, cycling the last name for endless nights. */
export function waveName(wave) {
  const index = Math.max(0, Math.min(WAVE_TABLE.length - 1, wave - 1));
  return WAVE_TABLE[index].name;
}

/** Every spawn and drain rate for a wave, with the last row carried into the endless night. */
export function difficultyOf(wave) {
  const index = Math.max(0, Math.min(WAVE_TABLE.length - 1, wave - 1));
  const row = WAVE_TABLE[index];
  const extra = Math.max(0, wave - WAVE_TABLE.length);
  return {
    ...row,
    wave,
    boss: isBossWave(wave),
    drain: Math.min(WORLD.maxDrain, row.drain + extra * 0.08),
    moteInterval: Math.max(0.55, row.moteInterval - extra * 0.03),
    rainInterval: Math.max(0.15, row.rainInterval - extra * 0.03),
    rainSpeed: Math.min(600, row.rainSpeed + extra * 10),
    maxDrops: Math.min(64, row.maxDrops + extra * 2),
    gustInterval: Math.max(5.5, row.gustInterval - extra * 0.3),
    maxGusts: Math.min(3, row.maxGusts + (extra > 2 ? 1 : 0)),
    hailInterval: row.hailInterval === 0 ? 0 : Math.max(1.0, row.hailInterval - extra * 0.12),
    wispInterval: row.wispInterval === 0 ? 0 : Math.max(2.4, row.wispInterval - extra * 0.2),
    maxWisps: Math.min(4, row.maxWisps + (extra > 1 ? 1 : 0)),
    wind: Math.min(1.15, row.wind + extra * 0.04),
  };
}

/**
 * The night's colour, one palette per stretch of the curve: cold blue first, then a violet dusk
 * with rose auroras, then a teal-and-amber storm. Boss nights burn warmer than their neighbours.
 */
const SKIES = [
  {
    top: '#04050c', mid: '#0a1430', low: '#1a2350',
    auroraA: '#3f7fbf', auroraB: '#5fd0b8', hillFar: '#0d1430', hillNear: '#090f24',
    cloud: '#1b2447', floor: '255, 138, 60',
  },
  {
    top: '#08060f', mid: '#161234', low: '#2b1a4c',
    auroraA: '#8f6fd6', auroraB: '#ff8a6a', hillFar: '#170f2b', hillNear: '#0d0a1e',
    cloud: '#271a3f', floor: '255, 110, 120',
  },
  {
    top: '#040811', mid: '#0d1e33', low: '#1c3550',
    auroraA: '#2fa9a0', auroraB: '#ffb463', hillFar: '#0e1a2c', hillNear: '#081320',
    cloud: '#16324a', floor: '255, 170, 80',
  },
];

/** The sky palette for a wave; boss nights use the warm storm palette. */
export function wavePalette(wave) {
  const row = WAVE_TABLE[Math.max(0, Math.min(WAVE_TABLE.length - 1, wave - 1))];
  const index = isBossWave(wave) ? 1 : row.sky;
  return SKIES[index];
}

/** A fresh director, just after the first breath. */
export function createWaves() {
  return {
    sinceWave: 0,
    moteTimer: 0.55,
    rainTimer: 1.7,
    gustTimer: 9,
    hailTimer: 6,
    wispTimer: 12,
  };
}

/** Restart the pacing. */
export function resetWaves(waves) {
  waves.sinceWave = 0;
  waves.moteTimer = 0.55;
  waves.rainTimer = 1.7;
  waves.gustTimer = 9;
  waves.hailTimer = 6;
  waves.wispTimer = 12;
}

/**
 * Advance the clocks and return the spawn commands for this step:
 * {type:'wave'|'mote'|'rain'|'gust'|'hail'|'wisp'}. The world executes them, so all entity
 * creation stays in one place.
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

  if (difficulty.hailInterval > 0) {
    waves.hailTimer -= dt;
    if (waves.hailTimer <= 0) {
      waves.hailTimer = difficulty.hailInterval * (0.7 + state.random() * 0.7);
      for (let count = 0; count < difficulty.hailBurst; count += 1) commands.push({ type: 'hail' });
    }
  }

  if (difficulty.wispInterval > 0) {
    waves.wispTimer -= dt;
    if (waves.wispTimer <= 0) {
      waves.wispTimer = difficulty.wispInterval * (0.75 + state.random() * 0.6);
      commands.push({ type: 'wisp' });
    }
  }

  return commands;
}
