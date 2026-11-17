// The shot scenes behind ?shot=start|play|end&seed=N. Each one resets the real world and plays it
// forward with the autopilot, so a screenshot is a real frame of the game's own rules, not a posed
// drawing. The same seed and step count always produce the same scene.

import { STEP } from './config.js';
import { EVENT_OVER, currentScore } from './world.js';
import { steer, shouldFlare } from './autopilot.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

/** Stage the named scene and return the screen to draw and the metadata the shell should show. */
export function stageShot(name, world) {
  world.reset();
  const state = world.state;

  if (name === 'start') {
    // Let the title's ambient air fill with rising embers before the frame is taken.
    for (let index = 0; index < 600; index += 1) world.ambient(STEP);
    return { screen: SCREEN_TITLE, meta: { best: 0, newBest: false } };
  }

  const limitSeconds = name === 'end' ? 260 : 100;
  const maxSteps = Math.round(limitSeconds / STEP);
  let steps = 0;

  while (steps < maxSteps) {
    // The results scene first flies well for a while, then stops chasing fuel: the flame burns
    // down as it would for a player who gives up, and the run ends through the game's own rules.
    const fading = name === 'end' && state.time > 46;
    const care = name === 'end' ? (fading ? 0 : 0.9) : 1;
    const hunger = name === 'end' && fading ? 0 : 1;
    const intent = steer(state, care, hunger);
    const flare = name !== 'end' && shouldFlare(state);
    const events = world.step(STEP, intent, flare);
    steps += 1;
    if (events & EVENT_OVER) break;

    // Stop the play scene on a rich frame: a gust well inside the sky, a running chain, motes in
    // reach and a respectable amount of rain, with the ember away from the edges.
    if (name === 'play' && state.time > 44) {
      const gustOnScreen = state.gusts.some((gust) => gust.x - gust.rx > 90 && gust.x + gust.rx < state.width - 90);
      const centred = state.player.x > state.width * 0.28 && state.player.x < state.width * 0.72;
      const richness = state.drops.length + state.motes.length * 0.7 + (gustOnScreen ? 10 : 0) + state.score.combo * 0.5;
      if (richness >= 17 && centred) break;
    }
  }

  const score = currentScore(state);
  if (name === 'end') {
    return {
      screen: SCREEN_OVER,
      meta: { best: Math.max(0, Math.floor(score * 0.88)), newBest: true },
    };
  }
  return {
    screen: SCREEN_PLAY,
    meta: { best: Math.max(0, Math.floor(score * 0.82)), newBest: false },
  };
}
