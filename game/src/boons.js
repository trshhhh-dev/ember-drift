// Boons: the choice the night offers between waves. Each one changes a rule the player already
// feels, stacks up to three times, and is rolled from the run's own seeded generator so the same
// seed always offers the same three. `modsOf` folds the stacks into the handful of numbers the
// systems read, so nothing else has to know boons exist.

import { BOON, WORLD } from './config.js';

/** The catalogue, in the order the upgrade screen lists ties. */
export const BOONS = [
  {
    id: 'magnet',
    name: 'MOTE MAGNET',
    effect: 'Motes are pulled in from much farther away',
    detail: `+${Math.round(BOON.magnet * 100)}% mote reach`,
    color: '#ffd36e',
    icon: 'magnet',
  },
  {
    id: 'flare',
    name: 'LONG FLARE',
    effect: 'Flares scatter a much wider circle',
    detail: `+${Math.round(BOON.flare * 100)}% flare radius`,
    color: '#ffb45e',
    icon: 'flare',
  },
  {
    id: 'regen',
    name: 'SLOW EMBER',
    effect: 'The flame slowly feeds itself',
    detail: `+${BOON.regen}% flame a second`,
    color: '#7fe3d4',
    icon: 'regen',
  },
  {
    id: 'chain',
    name: 'DEEP CHAIN',
    effect: 'Chains wait longer before they break',
    detail: `+${BOON.combo}s chain window`,
    color: '#ff8a6a',
    icon: 'chain',
  },
  {
    id: 'dash',
    name: 'EMBER DASH',
    effect: 'The ember flies faster and trails hotter',
    detail: `+${Math.round(BOON.speed * 100)}% speed`,
    color: '#9fd8ff',
    icon: 'dash',
  },
  {
    id: 'shield',
    name: 'STORM SHIELD',
    effect: 'Blocks one hit, then recharges',
    detail: `one shield, back in ${BOON.shieldSeconds}s`,
    color: '#c7a3ff',
    icon: 'shield',
  },
];

/** A fresh boon record. */
export function createBoons() {
  return { stacks: {}, choices: [], picked: -1, total: 0 };
}

/** Clear the record for a new run. */
export function resetBoons(boons) {
  boons.stacks = {};
  boons.choices = [];
  boons.picked = -1;
  boons.total = 0;
}

/** The catalogue entry for an id, or null. */
export function boonById(id) {
  for (let index = 0; index < BOONS.length; index += 1) {
    if (BOONS[index].id === id) return BOONS[index];
  }
  return null;
}

/** How many times a boon has been taken. */
export function stacksOf(state, id) {
  return state.boons.stacks[id] ?? 0;
}

/** The folded modifiers every system reads. */
export function modsOf(state) {
  const stacks = state.boons.stacks;
  const shieldStacks = stacks.shield ?? 0;
  return {
    magnet: 1 + (stacks.magnet ?? 0) * BOON.magnet,
    flare: 1 + (stacks.flare ?? 0) * BOON.flare,
    regen: (stacks.regen ?? 0) * BOON.regen,
    combo: WORLD.comboWindow + (stacks.chain ?? 0) * BOON.combo,
    speed: 1 + (stacks.dash ?? 0) * BOON.speed,
    shieldMax: Math.min(3, shieldStacks),
    shieldRecharge: BOON.shieldSeconds / (1 + Math.max(0, shieldStacks - 1) * 0.18),
  };
}

/** Recompute the folded modifiers after a change. */
function recompute(state) {
  state.mods = modsOf(state);
}

/**
 * Roll the three boons offered after a wave: distinct, drawn from those not yet at three stacks,
 * shuffled by the run's seeded generator. Returns the ids.
 */
export function rollBoons(state) {
  const pool = [];
  for (let index = 0; index < BOONS.length; index += 1) {
    const boon = BOONS[index];
    if ((state.boons.stacks[boon.id] ?? 0) < BOON.maxStacks) pool.push(boon.id);
  }
  if (pool.length === 0) {
    for (let index = 0; index < BOONS.length; index += 1) pool.push(BOONS[index].id);
  }
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(state.random() * (index + 1));
    const held = pool[index];
    pool[index] = pool[swap];
    pool[swap] = held;
  }
  state.boons.choices = pool.slice(0, Math.min(BOON.perWave, pool.length));
  state.boons.picked = -1;
  return state.boons.choices;
}

/** Take one of the offered boons. */
export function applyBoon(state, id) {
  if (boonById(id) === null) return false;
  const stacks = (state.boons.stacks[id] ?? 0) + 1;
  state.boons.stacks[id] = Math.min(BOON.maxStacks, stacks);
  state.boons.total += 1;
  state.boons.picked = state.boons.choices.indexOf(id);
  recompute(state);

  // A shield arrives charged, so the choice pays off at once; another stack adds a charge.
  if (id === 'shield') {
    state.shield.charges = Math.min(state.mods.shieldMax, state.shield.charges + 1);
    state.shield.timer = 0;
  }
  return true;
}
