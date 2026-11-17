// A small seeded random number generator (mulberry32). One seed drives every spawn in a run,
// so a seed and a step count always give the same night: that is what makes the ?shot scenes
// repeatable and lets a player replay a night they liked.

import { TAU } from './config.js';

/** A deterministic random() in [0, 1) from a 32-bit seed. */
export function createRandom(seed) {
  let a = seed | 0;
  return function random() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A random number in [min, max). */
export function between(random, min, max) {
  return min + random() * (max - min);
}

/** A random integer in [min, max]. */
export function integerBetween(random, min, max) {
  return Math.floor(min + random() * (max - min + 1));
}

/** One element of a non-empty list. */
export function pick(random, list) {
  return list[Math.floor(random() * list.length) % list.length];
}

/** A random angle in [0, 2π). */
export function randomAngle(random) {
  return random() * TAU;
}
