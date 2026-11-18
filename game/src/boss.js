// The storm boss of every fifth wave: a slow, vast eye of cloud that hangs over the sky, sweeps
// from side to side and calls down telegraphed lightning. It is hurt by flares and by motes fed to
// the flame, so the boon loop and the flare both stay useful when the storm arrives. This module
// owns the boss's rules only; its portrait is drawn in sprites.js.

export const BOSS = {
  hpBase: 26,
  hpPerWave: 5,
  flareDamage: 15,
  moteDamage: 3,
  boltFuel: 15,
  contactDrain: 16,
  boltWarn: 0.65,
  boltRadius: 46,
  boltLife: 0.9,
};

/** A fresh boss for the wave the world just entered. */
export function createBoss(state) {
  const maxHp = BOSS.hpBase + state.wave * BOSS.hpPerWave;
  return {
    x: state.width * 0.5,
    y: -190,
    rx: 215,
    ry: 140,
    hp: maxHp,
    maxHp,
    age: 0,
    phase: state.random() * Math.PI * 2,
    dir: state.random() < 0.5 ? 1 : -1,
    boltTimer: 1.5,
    hitFlash: 0,
  };
}

/** Bring the storm in; called when a boss wave begins. */
export function spawnBoss(state) {
  state.boss = createBoss(state);
  state.bolts = [];
}

/** Clear the storm (a new run, or the wave it belonged to is over). */
export function resetBoss(state) {
  state.boss = null;
  state.bolts = [];
}

/**
 * Move the eye, queue lightning at the ember's lead position, and resolve strikes. Returns the
 * number of lightning hits this step and whether the storm's body is touching the ember.
 */
export function updateBoss(state, dt) {
  const boss = state.boss;
  const result = { hits: [], contact: false, struck: false };
  if (boss === null) return result;

  boss.age += dt;
  boss.hitFlash = Math.max(0, boss.hitFlash - dt);

  // Glide down into the sky, then patrol across it.
  const targetY = state.height * 0.27;
  boss.y += (targetY - boss.y) * Math.min(1, dt * 0.8);
  boss.x = state.width * 0.5 + Math.sin(boss.age * 0.34 + boss.phase) * (state.width * 0.31);
  boss.y += Math.sin(boss.age * 0.9) * 12 * dt;

  // Lightning: aim where the ember is going, then strike after the warning ring burns out.
  boss.boltTimer -= dt;
  if (boss.boltTimer <= 0) {
    boss.boltTimer = Math.max(0.9, 2.1 - state.wave * 0.05);
    const player = state.player;
    const lead = 0.42;
    state.bolts.push({
      x: Math.max(56, Math.min(state.width - 56, player.x + player.vx * lead)),
      y: Math.max(150, Math.min(state.height - 90, player.y + player.vy * lead)),
      warn: BOSS.boltWarn,
      life: BOSS.boltWarn + BOSS.boltLife,
      struck: false,
    });
  }

  const keep = [];
  for (let index = 0; index < state.bolts.length; index += 1) {
    const bolt = state.bolts[index];
    if (!bolt.struck) {
      bolt.warn -= dt;
      if (bolt.warn <= 0) {
        bolt.struck = true;
        bolt.life = BOSS.boltLife;
        result.struck = true;
        const dx = state.player.x - bolt.x;
        const dy = state.player.y - bolt.y;
        if (dx * dx + dy * dy <= BOSS.boltRadius * BOSS.boltRadius) {
          result.hits.push({ x: bolt.x, y: bolt.y });
        }
      }
    } else {
      bolt.life -= dt;
    }
    if (bolt.life > 0) keep.push(bolt);
  }
  state.bolts = keep;

  const dx = (state.player.x - boss.x) / (boss.rx * 0.8);
  const dy = (state.player.y - boss.y) / (boss.ry * 0.8);
  if (dx * dx + dy * dy <= 1) result.contact = true;

  return result;
}

/** Hurt the storm; returns true when this blow breaks it. */
export function damageBoss(state, amount) {
  const boss = state.boss;
  if (boss === null) return false;
  boss.hp = Math.max(0, boss.hp - amount);
  boss.hitFlash = 0.28;
  return boss.hp <= 0;
}

/** The health fraction for the HUD's storm bar. */
export function bossRatio(boss) {
  if (boss === null) return 0;
  return Math.max(0, Math.min(1, boss.hp / boss.maxHp));
}
