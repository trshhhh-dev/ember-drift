// Ember Drift's tuning table and palette: every number a designer would reach for lives
// here, so the systems that use it read as rules rather than magic values.

/** The fixed simulation step: 60 updates a second, whatever the frame rate. */
export const STEP = 1 / 60;
/** The longest frame the loop replays after a stall (a hidden tab drops the rest). */
export const MAX_FRAME = 0.25;
/** localStorage key for the best score. */
export const BEST_KEY = 'ember-drift.best.v1';

/** Rules of the flame: fuel, combo, damage and the flare burst. */
export const WORLD = {
  margin: 46,
  maxFuel: 100,
  startFuel: 100,
  baseDrain: 1.45,
  drainPerWave: 0.15,
  maxDrain: 3.1,
  moteFuel: 7,
  rainFuel: 11,
  gustDrain: 5.5,
  comboWindow: 3.1,
  flareCost: 18,
  flareCooldown: 1.15,
  flareRadius: 175,
  flarePullRadius: 330,
  invulnTime: 1.0,
};

/** The ember's flight model: speed, how sharply it answers, and its trail. */
export const PLAYER = {
  radius: 10,
  speed: 405,
  accel: 9.4,
  trailEvery: 0.017,
};

/** Mote and raindrop sizes, and how many may be alive at once. */
export const MOTE = { radius: 9, max: 10, lifetime: 30 };
export const RAIN = { radius: 4, max: 60 };

/** Night-sky colour palette, warm flame against a cold wind. */
export const PALETTE = {
  skyTop: '#04050c',
  skyMid: '#080b1c',
  skyLow: '#111631',
  horizon: '#20264c',
  ink: '#edf3ff',
  dim: '#95a5c7',
  faint: '#5a688c',
  ember: '#ffb45e',
  emberHot: '#ffe6ab',
  emberDeep: '#ff6a2a',
  mote: '#ffd36e',
  moteHot: '#fff6d8',
  rain: '#9fd8ff',
  rainHot: '#e4f6ff',
  wind: '#7fe3d4',
  gold: '#ffcf7a',
  danger: '#ff6472',
  panel: 'rgba(7, 10, 22, 0.84)',
  panelEdge: 'rgba(255, 196, 120, 0.30)',
};

/** Three font voices: an arcade mono for numbers, a serif for the title, a clean sans elsewhere. */
export const FONT = {
  mono: 'ui-monospace, "SFMono-Regular", Consolas, monospace',
  display: 'Georgia, "Times New Roman", serif',
  ui: '"Trebuchet MS", "Segoe UI", system-ui, sans-serif',
};

/** Radians in a full turn, for the wobble maths. */
export const TAU = Math.PI * 2;
