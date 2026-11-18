// The shot scenes behind ?shot=cover|play|upgrade|end|start&seed=N. Each one resets the real world
// and plays it forward with the autopilot, so a screenshot is a real frame of the game's own rules,
// not a posed drawing. The same seed and step count always produce the same scene.

import { STEP } from './config.js';
import { EVENT_OVER, EVENT_WAVE, currentScore } from './world.js';
import { steer, shouldFlare } from './autopilot.js';
import { rollBoons, applyBoon } from './boons.js';
import { SCREEN_COVER, SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_UPGRADE } from './render.js';

/** Fly the world forward for up to `maxSteps`, stopping early when `done` says so. */
function flyUntil(world, maxSteps, done, care = 1, hunger = 1, stopOnWave = true) {
  const state = world.state;
  let steps = 0;
  while (steps < maxSteps) {
    const intent = steer(state, care, hunger);
    const events = world.step(STEP, intent, care > 0 && shouldFlare(state));
    steps += 1;
    if (stopOnWave && events & EVENT_WAVE) return { steps, events, waveClear: true };
    if (events & EVENT_OVER) return { steps, events, over: true };
    if (done(state)) return { steps, events };
  }
  return { steps, over: state.over };
}

/** Take a boon each time a wave turns, as a player would, so the run's build is visible. */
function flyWithBoons(world, maxSteps, done) {
  const state = world.state;
  let steps = 0;
  while (steps < maxSteps) {
    const intent = steer(state, 0.98, 1);
    const events = world.step(STEP, intent, shouldFlare(state));
    steps += 1;
    if (events & EVENT_WAVE && state.wave > 1) {
      rollBoons(state);
      applyBoon(state, state.boons.choices[0]);
    }
    if (events & EVENT_OVER) return { steps, over: true };
    if (done(state)) return { steps };
  }
  return { steps, over: state.over };
}

/**
 * Stage the named scene and return the screen to draw and the metadata the shell should show.
 */
export function stageShot(name, world) {
  world.reset();
  const state = world.state;

  if (name === 'start') {
    // Let the title's ambient air fill with rising embers before the frame is taken.
    for (let index = 0; index < 600; index += 1) world.ambient(STEP);
    return { screen: SCREEN_TITLE, meta: { best: 0, newBest: false } };
  }

  if (name === 'upgrade') {
    // Fly to the first wave boundary and stop there: the night offers its first three boons.
    flyUntil(world, 60 * 30, () => false, 1, 1);
    rollBoons(state);
    return {
      screen: SCREEN_UPGRADE,
      meta: { best: Math.max(0, Math.floor(currentScore(state) * 0.92)), newBest: false },
    };
  }

  if (name === 'cover') {
    // A busy mid-wave frame: hazard weather, a running chain and a live score popup or two.
    flyUntil(world, 60 * 80, (s) => (
      s.wave >= 4
      && s.boss === null
      && s.drops.length >= 14
      && s.hail.length >= 2
      && s.motes.length >= 8
      && s.score.combo >= 8
      && s.juice.popups.some((popup) => popup.life > 0.55)
      && s.player.x > s.width * 0.26
      && s.player.x < s.width * 0.74
      && s.player.y > s.height * 0.26
      && s.player.y < s.height * 0.8
    ), 0.95, 1, false);
    // A handful of quiet steps let the newest popup rise clear of the ember.
    for (let index = 0; index < 7; index += 1) world.step(STEP, steer(state, 0.9, 1), false);
    const score = currentScore(state);
    return {
      screen: SCREEN_COVER,
      meta: { best: Math.max(900, Math.floor(score * 0.86)), newBest: false },
    };
  }

  if (name === 'play') {
    // A late wave: a full sky, a deep chain and the boon tray carrying the run's build.
    flyWithBoons(world, 60 * 160, (s) => (
      s.wave >= 6
      && s.drops.length >= 20
      && s.hail.length >= 2
      && s.motes.length >= 8
      && s.score.combo >= 12
      && s.juice.popups.filter((popup) => popup.life > 0.5).length >= 2
      && s.player.x > s.width * 0.3
      && s.player.x < s.width * 0.7
      && s.player.y > s.height * 0.3
      && s.player.y < s.height * 0.72
    ));
    for (let index = 0; index < 5; index += 1) world.step(STEP, steer(state, 0.9, 1), false);
    const score = currentScore(state);
    return {
      screen: SCREEN_PLAY,
      meta: { best: Math.max(0, Math.floor(score * 0.8)), newBest: false },
    };
  }

  // The results scene flies well for a while, then stops chasing fuel: the flame burns down as it
  // would for a player who gives up, and the run ends through the game's own rules.
  const limitSeconds = 260;
  const maxSteps = Math.round(limitSeconds / STEP);
  let steps = 0;
  while (steps < maxSteps) {
    const fading = state.time > 46;
    const care = fading ? 0 : 0.9;
    const hunger = fading ? 0 : 1;
    const intent = steer(state, care, hunger);
    const events = world.step(STEP, intent, !fading && shouldFlare(state));
    steps += 1;
    if (events & EVENT_OVER) break;
  }

  const score = currentScore(state);
  return {
    screen: SCREEN_OVER,
    meta: { best: Math.max(0, Math.floor(score * 0.88)), newBest: true },
  };
}
