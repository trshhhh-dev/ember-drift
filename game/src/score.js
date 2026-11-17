// Score, combo and the run's small statistics. Motes chained within the combo window raise a
// multiplier (x2 at three motes, up to x9); a hit or a long pause in collecting breaks the chain.
// Survival itself pays a little, more at higher waves, so a careful flight is never worthless.

import { WORLD } from './config.js';

/** A fresh scoring record. */
export function createScore() {
  return {
    value: 0,
    motes: 0,
    combo: 0,
    bestCombo: 0,
    comboLeft: 0,
    points: 0,
  };
}

/** Clear the record for a new run. */
export function resetScore(score) {
  score.value = 0;
  score.motes = 0;
  score.combo = 0;
  score.bestCombo = 0;
  score.comboLeft = 0;
  score.points = 0;
}

/** The current chain multiplier: 1 at no chain, x2 from three motes, up to x9. */
export function multiplierOf(score) {
  return Math.min(9, 1 + Math.floor(score.combo / 3));
}

/** Motes collected in the current chain, for the HUD's small counter. */
export function chainOf(score) {
  return score.combo;
}

/** Tick the combo clock; a chain that runs out resets to none. */
export function updateScore(score, dt) {
  if (score.combo === 0) return;
  score.comboLeft -= dt;
  if (score.comboLeft <= 0) {
    score.combo = 0;
    score.comboLeft = 0;
  }
}

/** Collect one mote: extend the chain, award its multiplied value, and return the points. */
export function collectMote(score) {
  score.combo += 1;
  score.comboLeft = WORLD.comboWindow;
  score.bestCombo = Math.max(score.bestCombo, score.combo);
  score.motes += 1;
  const points = 10 * multiplierOf(score);
  score.points = points;
  score.value += points;
  return points;
}

/** A hit or a gust tears the chain apart. */
export function breakCombo(score) {
  score.combo = 0;
  score.comboLeft = 0;
}

/** Award survival score: a slow trickle that grows with the wave. */
export function addSurvivalScore(score, dt, wave) {
  score.value += dt * (1.5 + wave * 0.75);
}

/** The whole number the HUD shows. */
export function displayScore(score) {
  return Math.floor(score.value);
}
