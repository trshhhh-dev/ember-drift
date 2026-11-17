// The world: one seeded night, composed from the small systems around it. It owns the state tree
// and the fixed-step update, executes the wave director's spawn commands, and reports what
// happened to the shell (main.js) as a bitmask of events for sound and screen changes.

import { WORLD } from './config.js';
import { createRandom } from './random.js';
import { createPlayer, resetPlayer, updatePlayer, addFuel, damagePlayer, drainPlayer, canFlare, beginFlare } from './player.js';
import { createScore, resetScore, updateScore, collectMote, breakCombo, addSurvivalScore, displayScore } from './score.js';
import { spawnMote, updateMotes, pullMotesToward, moteFuelValue } from './motes.js';
import { spawnRain, updateRain, clearRainAround, spawnGust, updateGusts } from './hazards.js';
import { createWaves, resetWaves, updateWaves, difficultyOf } from './waves.js';
import { createParticles, resetParticles, spawnBurst, spawnTrail, spawnAmbientEmber, updateParticles, SPARK, SPLASH, SMOKE } from './particles.js';

export const EVENT_HIT = 1;
export const EVENT_COLLECT = 2;
export const EVENT_FLARE = 4;
export const EVENT_WAVE = 8;
export const EVENT_OVER = 16;
export const EVENT_DENY = 32;

/** A fresh state tree for a seed. */
function createState(seed) {
  return {
    seed,
    random: createRandom(seed),
    width: 1280,
    height: 720,
    time: 0,
    wave: 1,
    fuel: WORLD.startFuel,
    over: false,
    hits: 0,
    player: createPlayer(),
    motes: [],
    drops: [],
    gusts: [],
    particles: createParticles(),
    score: createScore(),
    waves: createWaves(),
    wind: { x: 0.18, y: 0 },
    flash: 0,
    shake: 0,
    banner: 0,
    ambientTimer: 0,
  };
}

/** The night's slow, breathing wind, in the range -1..1. */
function updateWind(state) {
  state.wind.x = Math.sin(state.time * 0.13) * 0.48 + Math.sin(state.time * 0.041 + 1.7) * 0.26;
  state.wind.y = Math.sin(state.time * 0.09 + 0.6) * 0.12;
}

/**
 * Create a world for a seed and return its small public face:
 *   state                 everything the renderer and HUD read
 *   reset(seed?)          a fresh run, re-seeding the generator
 *   resize(width,height)  keep the playfield in step with the window
 *   step(dt,intent,flare) one simulation step, returning an event bitmask
 *   ambient(dt)           the title screen's drifting air, with no rules
 */
export function createWorld(seed) {
  const state = createState(seed >>> 0);

  function reset(nextSeed) {
    if (nextSeed !== undefined) state.seed = nextSeed >>> 0;
    state.random = createRandom(state.seed);
    state.time = 0;
    state.wave = 1;
    state.fuel = WORLD.startFuel;
    state.over = false;
    state.hits = 0;
    state.motes = [];
    state.drops = [];
    state.gusts = [];
    state.wind.x = 0.18;
    state.wind.y = 0;
    state.flash = 0;
    state.shake = 0;
    state.banner = 1.8;
    state.ambientTimer = 0;
    resetScore(state.score);
    resetWaves(state.waves);
    resetParticles(state.particles);
    resetPlayer(state);
  }

  function resize(width, height) {
    state.width = Math.max(640, width);
    state.height = Math.max(480, height);
    if (state.player.x === 0 && state.player.y === 0) resetPlayer(state);
    state.player.x = Math.max(WORLD.margin, Math.min(state.width - WORLD.margin, state.player.x));
    state.player.y = Math.max(WORLD.margin, Math.min(state.height - WORLD.margin, state.player.y));
  }

  function spawnFrom(command) {
    const difficulty = difficultyOf(state.wave);
    if (command.type === 'mote') spawnMote(state);
    else if (command.type === 'rain') spawnRain(state, difficulty);
    else if (command.type === 'gust') spawnGust(state, difficulty);
  }

  function step(dt, intent, flareRequested) {
    if (state.over) return 0;
    const player = state.player;
    const random = state.random;
    let events = 0;

    state.time += dt;
    updateWind(state);
    state.flash = Math.max(0, state.flash - dt * 2.6);
    state.shake = Math.max(0, state.shake - dt * 3.4);
    state.banner = Math.max(0, state.banner - dt);

    const commands = updateWaves(state.waves, state, dt);
    for (let index = 0; index < commands.length; index += 1) {
      const command = commands[index];
      if (command.type === 'wave') {
        events |= EVENT_WAVE;
        state.banner = 1.8;
      } else {
        spawnFrom(command);
      }
    }

    if (flareRequested) {
      if (canFlare(state)) {
        beginFlare(state);
        events |= EVENT_FLARE;
        const cleared = clearRainAround(state, player.x, player.y, WORLD.flareRadius);
        pullMotesToward(state, player.x, player.y, WORLD.flarePullRadius, 300);
        for (let index = 0; index < cleared.length; index += 1) {
          spawnBurst(state.particles, cleared[index].x, cleared[index].y, 4, SPLASH, random, { speed: 90, life: 0.5, size: 1.8 });
        }
        if (cleared.length > 0) state.score.value += cleared.length * 2;
        spawnBurst(state.particles, player.x, player.y, 24, SPARK, random, { speed: 230, life: 0.65, size: 2.6 });
        state.shake = Math.max(state.shake, 0.3);
      } else {
        events |= EVENT_DENY;
      }
    }

    if (updatePlayer(state, intent, dt)) {
      spawnTrail(state.particles, player.x, player.y, player.vx, player.vy, random);
    }

    const gust = updateGusts(state, dt);
    drainPlayer(state, (difficultyOf(state.wave).drain + gust.caught * WORLD.gustDrain) * dt);
    if (gust.caught > 0 && random() < dt * 10) {
      spawnBurst(state.particles, player.x, player.y, 1, SPLASH, random, { speed: 40, life: 0.4, size: 1.4 });
    }

    const collected = updateMotes(state, dt);
    for (let index = 0; index < collected.length; index += 1) {
      const at = collected[index];
      collectMote(state.score);
      addFuel(state, moteFuelValue());
      spawnBurst(state.particles, at.x, at.y, 10, SPARK, random, { speed: 130, life: 0.55, size: 2.1 });
      events |= EVENT_COLLECT;
    }

    const hits = updateRain(state, dt);
    for (let index = 0; index < hits.length; index += 1) {
      if (damagePlayer(state, WORLD.rainFuel)) {
        state.hits += 1;
        breakCombo(state.score);
        state.flash = 1;
        state.shake = 1;
        events |= EVENT_HIT;
        spawnBurst(state.particles, hits[index].x, hits[index].y, 14, SPLASH, random, { speed: 170, life: 0.6, size: 2.2 });
        spawnBurst(state.particles, hits[index].x, hits[index].y, 6, SPARK, random, { speed: 110, life: 0.4, size: 1.6 });
      }
    }

    addSurvivalScore(state.score, dt, state.wave);
    updateScore(state.score, dt);
    updateParticles(state.particles, dt);

    if (state.fuel <= 0) {
      state.fuel = 0;
      state.over = true;
      state.flash = 1;
      state.shake = 1;
      breakCombo(state.score);
      spawnBurst(state.particles, player.x, player.y, 26, SMOKE, random, { speed: 90, life: 1.8, size: 4, gravity: -22, drag: 0.8 });
      spawnBurst(state.particles, player.x, player.y, 20, SPARK, random, { speed: 160, life: 0.9, size: 2.2 });
      events |= EVENT_OVER;
    }

    return events;
  }

  function ambient(dt) {
    state.time += dt;
    updateWind(state);
    state.banner = Math.max(0, state.banner - dt);
    state.ambientTimer -= dt;
    if (state.ambientTimer <= 0) {
      state.ambientTimer = 0.09;
      spawnAmbientEmber(state.particles, state.width, state.height, state.random);
    }
    updateParticles(state.particles, dt);
  }

  return {
    state,
    reset,
    resize,
    step,
    ambient,
  };
}

/** The current run's score, for the shell's best-score bookkeeping. */
export function currentScore(state) {
  return displayScore(state.score);
}
