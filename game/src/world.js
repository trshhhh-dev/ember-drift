// The world: one seeded night, composed from the small systems around it. It owns the state tree
// and the fixed-step update, executes the wave director's spawn commands, runs the storm boss,
// pays out the boons, feeds the juice layer and reports what happened to the shell (main.js) as a
// bitmask of events for sound and screen changes.

import { BOON, HAIL, WISP, WORLD } from './config.js';
import { createRandom } from './random.js';
import { createPlayer, resetPlayer, updatePlayer, addFuel, damagePlayer, drainPlayer, canFlare, beginFlare } from './player.js';
import { createScore, resetScore, updateScore, collectMote, breakCombo, addSurvivalScore, displayScore, multiplierOf } from './score.js';
import { spawnMote, updateMotes, pullMotesToward, moteFuelValue } from './motes.js';
import {
  spawnRain, updateRain, spawnGust, updateGusts,
  spawnHail, updateHail, spawnWisp, updateWisps, clearHazardsAround,
} from './hazards.js';
import { createWaves, resetWaves, updateWaves, difficultyOf, isBossWave } from './waves.js';
import { createBoons, resetBoons, modsOf } from './boons.js';
import { spawnBoss, resetBoss, updateBoss, damageBoss, BOSS } from './boss.js';
import { createJuice, resetJuice, addPopup, requestHitStop, updateJuice } from './juice.js';
import { createParticles, resetParticles, spawnBurst, spawnTrail, spawnAmbientEmber, updateParticles, SPARK, SPLASH, SMOKE } from './particles.js';

export const EVENT_HIT = 1;
export const EVENT_COLLECT = 2;
export const EVENT_FLARE = 4;
export const EVENT_WAVE = 8;
export const EVENT_OVER = 16;
export const EVENT_DENY = 32;
export const EVENT_BOSS = 64;
export const EVENT_BOSS_DOWN = 128;
export const EVENT_SHIELD = 256;

/** A fresh state tree for a seed. */
function createState(seed) {
  const state = {
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
    hail: [],
    wisps: [],
    bolts: [],
    boss: null,
    boons: createBoons(),
    mods: { magnet: 1, flare: 1, regen: 0, combo: WORLD.comboWindow, speed: 1, shieldMax: 0, shieldRecharge: BOON.shieldSeconds },
    shield: { charges: 0, timer: 0 },
    juice: createJuice(),
    particles: createParticles(),
    score: createScore(),
    waves: createWaves(),
    wind: { x: 0.18, y: 0 },
    flash: 0,
    shake: 0,
    banner: 0,
    ambientTimer: 0,
    stormBroken: false,
  };
  state.mods = modsOf(state);
  return state;
}

/** The night's slow, breathing wind, scaled by the wave's strength. */
function updateWind(state, difficulty) {
  const strength = difficulty.wind;
  state.wind.x = (Math.sin(state.time * 0.13) * 0.48 + Math.sin(state.time * 0.041 + 1.7) * 0.26) * strength;
  state.wind.y = Math.sin(state.time * 0.09 + 0.6) * 0.12 * strength;
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
    state.hail = [];
    state.wisps = [];
    state.bolts = [];
    state.wind.x = 0.18;
    state.wind.y = 0;
    state.flash = 0;
    state.shake = 0;
    state.banner = 1.8;
    state.ambientTimer = 0;
    state.stormBroken = false;
    resetScore(state.score);
    resetWaves(state.waves);
    resetParticles(state.particles);
    resetPlayer(state);
    resetBoons(state.boons);
    resetBoss(state);
    resetJuice(state.juice);
    state.mods = modsOf(state);
    state.shield.charges = 0;
    state.shield.timer = 0;
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
    else if (command.type === 'hail') spawnHail(state, difficulty);
    else if (command.type === 'wisp') spawnWisp(state, difficulty);
  }

  /** A storm wave arrives; a normal one clears the last storm away. */
  function beginWave(wave) {
    state.banner = 1.8;
    if (isBossWave(wave)) {
      spawnBoss(state);
    } else {
      resetBoss(state);
    }
  }

  /** Break the storm: bonus score, a wave clear and the next wave's upgrade. */
  function breakStorm() {
    state.boss = null;
    state.bolts = [];
    state.score.value += 250;
    state.flash = Math.max(state.flash, 0.8);
    state.shake = Math.max(state.shake, 1);
    state.stormBroken = true;
    requestHitStop(state.juice, 0.16);
    addPopup(state.juice, state.width / 2, state.height * 0.34, 'STORM BROKEN +250', {
      color: '#ffe6ab', size: 34, life: 1.7, rise: 62,
    });
    spawnBurst(state.particles, state.player.x, state.player.y, 30, SPARK, state.random, { speed: 260, life: 1.0, size: 3 });
    spawnBurst(state.particles, state.player.x, state.player.y, 18, SMOKE, state.random, { speed: 80, life: 1.6, size: 4, gravity: -18 });
    state.waves.sinceWave = 0;
    state.wave += 1;
    beginWave(state.wave);
  }

  /** Pay out one hit through the shield; returns 1 when it landed on the flame. */
  function takeHit(x, y, fuelCost, events) {
    if (state.shield.charges > 0) {
      state.shield.charges -= 1;
      state.shield.timer = 0;
      state.player.invuln = Math.max(state.player.invuln, 0.9);
      state.flash = Math.max(state.flash, 0.55);
      state.shake = Math.max(state.shake, 0.7);
      addPopup(state.juice, x, y - 20, 'SHIELD', { color: '#c7a3ff', size: 24 });
      spawnBurst(state.particles, x, y, 12, SPLASH, state.random, { speed: 150, life: 0.5, size: 2 });
      return events | EVENT_SHIELD;
    }
    if (!damagePlayer(state, fuelCost)) return events;
    state.hits += 1;
    breakCombo(state.score);
    state.flash = 1;
    state.shake = 1;
    requestHitStop(state.juice, 0.07);
    addPopup(state.juice, x, y - 18, `−${Math.round(fuelCost)} FLAME`, { color: '#ff9a9a', size: 20, life: 0.9 });
    return events | EVENT_HIT;
  }

  function step(dt, intent, flareRequested) {
    if (state.over) return 0;

    // Hit-stop: a big moment freezes the night for a few frames, then the world moves on.
    if (state.juice.hitStop > 0) {
      state.juice.hitStop = Math.max(0, state.juice.hitStop - dt);
      return 0;
    }

    const player = state.player;
    const random = state.random;
    const juice = state.juice;
    let events = 0;

    state.time += dt;
    const difficulty = difficultyOf(state.wave);
    updateWind(state, difficulty);
    state.flash = Math.max(0, state.flash - dt * 2.6);
    state.shake = Math.max(0, state.shake - dt * 3.4);
    state.banner = Math.max(0, state.banner - dt);

    // Air: slow embers rise through the whole night, not just the title, so the sky is never bare.
    state.ambientTimer -= dt;
    if (state.ambientTimer <= 0) {
      state.ambientTimer = 0.16;
      spawnAmbientEmber(state.particles, state.width, state.height, random);
    }

    const commands = updateWaves(state.waves, state, dt);
    for (let index = 0; index < commands.length; index += 1) {
      const command = commands[index];
      if (command.type === 'wave') {
        events |= EVENT_WAVE;
        beginWave(state.wave);
        if (isBossWave(state.wave)) events |= EVENT_BOSS;
      } else {
        spawnFrom(command);
      }
    }

    if (flareRequested) {
      if (canFlare(state)) {
        beginFlare(state);
        events |= EVENT_FLARE;
        const flareRadius = WORLD.flareRadius * state.mods.flare;
        const cleared = clearHazardsAround(state, player.x, player.y, flareRadius);
        pullMotesToward(state, player.x, player.y, WORLD.flarePullRadius * state.mods.magnet, 300);
        for (let index = 0; index < cleared.length; index += 1) {
          spawnBurst(state.particles, cleared[index].x, cleared[index].y, 4, SPLASH, random, { speed: 90, life: 0.5, size: 1.8 });
        }
        if (cleared.length > 0) {
          state.score.value += cleared.length * 2;
          addPopup(juice, player.x, player.y - 34, `+${cleared.length * 2}`, { color: '#b8e8ff', size: 18, life: 0.7, rise: 30 });
        }
        if (state.boss !== null) {
          const boss = state.boss;
          const reach = flareRadius + boss.rx * 0.7;
          if (Math.hypot(player.x - boss.x, player.y - boss.y) < reach) {
            if (damageBoss(state, BOSS.flareDamage)) breakStorm();
            else addPopup(juice, boss.x, boss.y + boss.ry * 0.6, `−${BOSS.flareDamage}`, { color: '#ffcf7a', size: 22, life: 0.8 });
          }
        }
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
    drainPlayer(state, (difficulty.drain + gust.caught * WORLD.gustDrain - state.mods.regen) * dt);
    if (gust.caught > 0 && random() < dt * 10) {
      spawnBurst(state.particles, player.x, player.y, 1, SPLASH, random, { speed: 40, life: 0.4, size: 1.4 });
    }

    const collected = updateMotes(state, dt);
    for (let index = 0; index < collected.length; index += 1) {
      const at = collected[index];
      const points = collectMote(state.score, state.mods.combo);
      addFuel(state, moteFuelValue());
      spawnBurst(state.particles, at.x, at.y, 10, SPARK, random, { speed: 130, life: 0.55, size: 2.1 });
      addPopup(juice, at.x, at.y - 12, `+${points}`, { color: '#ffe6ab', size: 20, life: 0.9, rise: 36 });
      if (state.score.combo >= 3) {
        const multiplier = multiplierOf(state.score);
        addPopup(juice, at.x, at.y - 36, `CHAIN ×${multiplier}`, { color: '#ffb35c', size: 22, life: 1.0, rise: 42 });
      }
      if (state.boss !== null && damageBoss(state, BOSS.moteDamage)) breakStorm();
      events |= EVENT_COLLECT;
    }

    const rainHits = updateRain(state, dt);
    for (let index = 0; index < rainHits.length; index += 1) {
      const hit = rainHits[index];
      const before = events;
      events = takeHit(hit.x, hit.y, WORLD.rainFuel, events);
      if (events !== before) {
        spawnBurst(state.particles, hit.x, hit.y, 14, SPLASH, random, { speed: 170, life: 0.6, size: 2.2 });
        spawnBurst(state.particles, hit.x, hit.y, 6, SPARK, random, { speed: 110, life: 0.4, size: 1.6 });
      }
    }

    const hailHits = updateHail(state, dt);
    for (let index = 0; index < hailHits.length; index += 1) {
      const hit = hailHits[index];
      const before = events;
      events = takeHit(hit.x, hit.y, HAIL.fuel, events);
      if (events !== before) {
        spawnBurst(state.particles, hit.x, hit.y, 18, SPLASH, random, { speed: 220, life: 0.6, size: 2.6 });
        state.shake = Math.max(state.shake, 0.85);
      }
    }

    const wispHits = updateWisps(state, dt);
    for (let index = 0; index < wispHits.length; index += 1) {
      const hit = wispHits[index];
      const before = events;
      events = takeHit(hit.x, hit.y, WISP.fuel, events);
      if (events !== before) {
        spawnBurst(state.particles, hit.x, hit.y, 16, SPARK, random, { speed: 170, life: 0.7, size: 2.4 });
        spawnBurst(state.particles, hit.x, hit.y, 8, SPLASH, random, { speed: 120, life: 0.5, size: 1.8 });
      }
    }

    if (state.boss !== null) {
      const storm = updateBoss(state, dt);
      if (storm.contact) {
        drainPlayer(state, BOSS.contactDrain * dt);
        if (random() < dt * 8) {
          spawnBurst(state.particles, player.x, player.y, 1, SPLASH, random, { speed: 50, life: 0.4, size: 1.6 });
        }
      }
      for (let index = 0; index < storm.hits.length; index += 1) {
        const hit = storm.hits[index];
        const before = events;
        events = takeHit(hit.x, hit.y, BOSS.boltFuel, events);
        if (events !== before) {
          state.flash = 1;
          state.shake = 1;
          requestHitStop(juice, 0.09);
          spawnBurst(state.particles, hit.x, hit.y, 24, SPARK, random, { speed: 260, life: 0.8, size: 2.8 });
          spawnBurst(state.particles, hit.x, hit.y, 10, SPLASH, random, { speed: 160, life: 0.6, size: 2 });
        }
      }
    }

    // The storm shield recharges on its own clock once its boon is taken.
    const maxCharges = state.mods.shieldMax;
    if (maxCharges > 0 && state.shield.charges < maxCharges) {
      state.shield.timer += dt;
      if (state.shield.timer >= state.mods.shieldRecharge) {
        state.shield.charges += 1;
        state.shield.timer = 0;
        events |= EVENT_SHIELD;
      }
    }

    addSurvivalScore(state.score, dt, state.wave);
    updateScore(state.score, dt);
    updateParticles(state.particles, dt);
    updateJuice(juice, dt);

    // A broken storm closes its wave and opens the boon choice, exactly like a timed wave clear.
    if (state.stormBroken) {
      state.stormBroken = false;
      events |= EVENT_BOSS_DOWN | EVENT_WAVE;
    }

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
    updateWind(state, difficultyOf(state.wave));
    state.banner = Math.max(0, state.banner - dt);
    state.ambientTimer -= dt;
    if (state.ambientTimer <= 0) {
      state.ambientTimer = 0.09;
      spawnAmbientEmber(state.particles, state.width, state.height, state.random);
    }
    updateParticles(state.particles, dt);
    updateJuice(state.juice, dt);
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
