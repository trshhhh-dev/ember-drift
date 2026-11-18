// Boot and the one loop. Input is read every frame, the world advances in fixed 1/60 s steps
// (several in a slow frame, none in a fast one), and the renderer paints what is there. The shell
// moves between four screens: title, play, paused and over. It also owns localStorage's best score
// and the ?shot=start|play|end staging used for screenshots.

import { BEST_KEY, MAX_FRAME, STEP } from './config.js';
import {
  createWorld, EVENT_BOSS, EVENT_BOSS_DOWN, EVENT_COLLECT, EVENT_DENY, EVENT_FLARE, EVENT_HIT,
  EVENT_OVER, EVENT_SHIELD, EVENT_WAVE,
} from './world.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_UPGRADE } from './render.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';
import { displayScore, multiplierOf } from './score.js';
import { applyBoon, boonById, rollBoons } from './boons.js';
import { boonAtPoint } from './upgrades.js';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const initialSeed = Number.isInteger(seedParam) ? seedParam >>> 0 : nextSeed();

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(initialSeed);
const renderer = createRenderer(canvas, initialSeed);
world.resize(renderer.size().width, renderer.size().height);
window.addEventListener('resize', () => {
  const size = renderer.size();
  world.resize(size.width, size.height);
});

/** A fresh 32-bit seed for a new run; the URL's seed fixes it for screenshots. */
function nextSeed() {
  return (Math.random() * 4294967296) >>> 0;
}

/** Read the saved best score, or 0 when storage is unavailable. */
function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

/** Save a new best score; private windows simply forget it. */
function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off; the best then lasts this visit only.
  }
}

/** Paint the staged shot twice, then announce it ready for a screenshot tool. */
function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.meta);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

/** The interactive game. */
function runGame() {
  const input = createInput(canvas);
  const audio = createAudio();
  let screen = SCREEN_TITLE;
  let best = readBest();
  let newBest = false;
  let accumulator = 0;
  let flareQueued = false;
  let overAt = 0;
  let lastMultiplier = 1;
  let last = performance.now();

  // A moment after the flame goes out before the results take input, so a flare pressed at death
  // does not skip the score the player is reading.
  const OVER_GRACE_MS = 800;

  // Browsers only start audio from a gesture; the first key or click is that gesture.
  window.addEventListener('pointerdown', () => audio.unlock());
  window.addEventListener('keydown', () => audio.unlock());

  function announce(message) {
    status.textContent = message;
  }

  /** Begin a fresh run; the seed changes so each night's weather is its own. */
  function startRun() {
    world.reset(nextSeed());
    screen = SCREEN_PLAY;
    accumulator = 0;
    flareQueued = false;
    newBest = false;
    lastMultiplier = 1;
    audio.play('start');
    announce('Ember lit. Collect motes to feed the flame. Wave 1.');
  }

  /** End the run and record the score if it is the best so far. */
  function endRun() {
    if (screen === SCREEN_OVER) return;
    screen = SCREEN_OVER;
    overAt = performance.now();
    const score = displayScore(world.state.score);
    newBest = score > best;
    if (newBest) {
      best = score;
      saveBest(best);
    }
    audio.play('over');
    announce(`Ember extinguished. Score ${score}. Best ${best}. Press R to rise again.`);
  }

  function pauseRun() {
    if (screen !== SCREEN_PLAY) return;
    screen = SCREEN_PAUSED;
    audio.play('click');
    announce('Paused. Press P or Escape to resume, or R to restart.');
  }

  function resumeRun() {
    if (screen !== SCREEN_PAUSED) return;
    screen = SCREEN_PLAY;
    accumulator = 0;
    announce('Playing.');
  }

  /** Between waves: offer three boons and hold the night still until one is taken. */
  function enterUpgrade() {
    rollBoons(world.state);
    screen = SCREEN_UPGRADE;
    accumulator = 0;
    audio.play('wave');
    announce(`Wave ${world.state.wave}. Choose a boon: 1, 2 or 3.`);
  }

  /** Take the offered boon at `index`, then fly on. */
  function pickBoon(index) {
    if (screen !== SCREEN_UPGRADE) return;
    const choices = world.state.boons.choices;
    if (index < 0 || index >= choices.length) return;
    const boon = boonById(choices[index]);
    applyBoon(world.state, choices[index]);
    screen = SCREEN_PLAY;
    accumulator = 0;
    audio.play('upgrade');
    announce(`${boon === null ? 'Boon' : boon.name} taken. Wave ${world.state.wave}.`);
  }

  function handleEvents(events) {
    if (events & EVENT_COLLECT) {
      const score = world.state.score;
      audio.play('collect', score.combo);
      const multiplier = multiplierOf(score);
      if (multiplier > lastMultiplier) audio.play('chain', score.combo);
      lastMultiplier = multiplier;
    }
    if (events & EVENT_HIT) {
      audio.play('hit');
      announce(`Hit. Fuel ${Math.ceil(world.state.fuel)} percent.`);
    }
    if (events & EVENT_FLARE) audio.play('flare');
    if (events & EVENT_DENY) audio.play('deny');
    if (events & EVENT_SHIELD) audio.play('shield');
    if (events & EVENT_WAVE) {
      if (world.state.wave > 1) enterUpgrade();
      else {
        audio.play('wave');
        announce(`Wave ${world.state.wave}. Fuel ${Math.ceil(world.state.fuel)} percent.`);
      }
    }
    if (events & EVENT_BOSS) {
      audio.play('boss');
      announce(`Storm boss. Break it with flares and motes.`);
    }
    if (events & EVENT_BOSS_DOWN) {
      audio.play('waveclear');
      announce(`Storm broken. Fuel ${Math.ceil(world.state.fuel)} percent.`);
    }
    if (events & EVENT_OVER) endRun();
  }

  /** The mouse steers by distance, the keys steer at full strength; the keys win when held. */
  function readIntent() {
    const keys = input.direction();
    if (keys.x !== 0 || keys.y !== 0) return keys;
    const pointer = input.pointer();
    if (!pointer.seen || !pointer.steering) return { x: 0, y: 0 };
    const player = world.state.player;
    const dx = pointer.x - player.x;
    const dy = pointer.y - player.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 6) return { x: 0, y: 0 };
    const strength = Math.min(1, distance / 34);
    return { x: (dx / distance) * strength, y: (dy / distance) * strength };
  }

  function handleActions() {
    const actions = input.take();

    if (actions.mute) {
      audio.unlock();
      audio.setMuted(!audio.muted);
      announce(audio.muted ? 'Sound off.' : 'Sound on.');
    }

    if (screen === SCREEN_TITLE) {
      if (actions.start || actions.flare || actions.restart) startRun();
      return;
    }

    if (screen === SCREEN_UPGRADE) {
      if (actions.restart) {
        startRun();
        return;
      }
      if (actions.choice >= 0) {
        pickBoon(actions.choice);
        return;
      }
      if (actions.pick !== null) {
        const size = renderer.size();
        const index = boonAtPoint(size.width, size.height, actions.pick.x, actions.pick.y);
        if (index >= 0) pickBoon(index);
      }
      return;
    }

    if (actions.pause) {
      if (screen === SCREEN_PLAY) pauseRun();
      else if (screen === SCREEN_PAUSED) resumeRun();
      return;
    }

    if (screen === SCREEN_PAUSED) {
      if (actions.restart) {
        startRun();
        return;
      }
      if (actions.start || actions.flare) resumeRun();
      return;
    }

    if (screen === SCREEN_OVER) {
      if (performance.now() - overAt >= OVER_GRACE_MS && (actions.start || actions.flare || actions.restart)) startRun();
      return;
    }

    // R restarts from the middle of a run too, as the controls promise, not only while paused.
    if (actions.restart) {
      startRun();
      return;
    }
    if (actions.flare) flareQueued = true;
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const delta = Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();

    if (screen === SCREEN_PLAY) {
      const intent = readIntent();
      accumulator += delta;
      let firstStep = true;
      while (accumulator >= STEP) {
        const events = world.step(STEP, intent, firstStep && flareQueued);
        if (firstStep) {
          flareQueued = false;
          firstStep = false;
        }
        accumulator -= STEP;
        handleEvents(events);
        if (screen !== SCREEN_PLAY) {
          accumulator = 0;
          break;
        }
      }
    } else if (screen === SCREEN_TITLE) {
      accumulator += delta;
      let budget = 0;
      while (accumulator >= STEP && budget < 4) {
        world.ambient(STEP);
        accumulator -= STEP;
        budget += 1;
      }
      if (accumulator > STEP) accumulator = 0;
    } else {
      accumulator = 0;
    }

    renderer.draw(world.state, screen, { best, newBest });
  }

  // Leaving the tab pauses a running game rather than letting the flame burn unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pauseRun();
  });

  announce('Ember Drift. Click or press Space to ignite. Mouse or WASD to fly, Space to flare, P to pause.');
  requestAnimationFrame(frame);
}

if (shot) {
  // A read-only handle for the screenshot tooling and local inspection; it changes nothing.
  window.__emberDrift = { world, renderer };
  runShot(shot);
} else {
  runGame();
}
