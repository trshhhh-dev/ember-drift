// Particles: sparks, embers, rain splashes and the powder of a flare. One pooled update and one
// additive draw call keep hundreds of little lights cheap and, because every spawn is seeded,
// identical for a given seed and step count.

import { TAU } from './config.js';

const MAX_PARTICLES = 520;

export const SPARK = 'spark';
export const SMOKE = 'smoke';
export const SPLASH = 'splash';
export const EMBER = 'ember';

/** A fresh, empty particle field. */
export function createParticles() {
  return { list: [] };
}

/** Empty the field for a new run. */
export function resetParticles(particles) {
  particles.list.length = 0;
}

/** Add one particle, dropping the oldest if the field is full. */
function add(particles, particle) {
  if (particles.list.length >= MAX_PARTICLES) particles.list.shift();
  particles.list.push(particle);
}

/**
 * A burst of sparks. `kind` chooses the palette and behaviour: warm sparks for motes and the
 * ember, cold splashes for rain, slow dark smoke for an extinguished flame.
 */
export function spawnBurst(particles, x, y, count, kind, random, options = {}) {
  const speed = options.speed ?? 130;
  const life = options.life ?? 0.6;
  for (let index = 0; index < count; index += 1) {
    const angle = random() * TAU;
    const force = speed * (0.35 + random() * 0.9);
    const particle = {
      x,
      y,
      vx: Math.cos(angle) * force + (options.vx ?? 0),
      vy: Math.sin(angle) * force + (options.vy ?? 0),
      life: life * (0.55 + random() * 0.75),
      maxLife: life * 1.3,
      size: (options.size ?? 2.2) * (0.55 + random() * 0.9),
      kind,
      spin: random() * TAU,
      drag: options.drag ?? 2.2,
      gravity: options.gravity ?? 0,
    };
    add(particles, particle);
  }
}

/** A single small trail spark behind the flying ember. */
export function spawnTrail(particles, x, y, vx, vy, random) {
  add(particles, {
    x: x + (random() - 0.5) * 8,
    y: y + (random() - 0.5) * 8,
    vx: -vx * 0.12 + (random() - 0.5) * 30,
    vy: -vy * 0.12 + (random() - 0.5) * 30 - 10,
    life: 0.42 + random() * 0.3,
    maxLife: 0.72,
    size: 1.4 + random() * 1.8,
    kind: SPARK,
    spin: random() * TAU,
    drag: 1.6,
    gravity: -12,
  });
}

/** A slow ember rising from the bottom of the night, for the title screen's air. */
export function spawnAmbientEmber(particles, width, height, random) {
  add(particles, {
    x: random() * width,
    y: height * (0.55 + random() * 0.45),
    vx: (random() - 0.5) * 16,
    vy: -12 - random() * 22,
    life: 3 + random() * 4,
    maxLife: 7,
    size: 1 + random() * 1.8,
    kind: EMBER,
    spin: random() * TAU,
    drag: 0.15,
    gravity: -2,
  });
}

/** Advance every particle; dead ones are dropped. */
export function updateParticles(particles, dt) {
  const list = particles.list;
  let write = 0;
  for (let read = 0; read < list.length; read += 1) {
    const particle = list[read];
    particle.life -= dt;
    if (particle.life <= 0) continue;
    const damp = Math.exp(-particle.drag * dt);
    particle.vx *= damp;
    particle.vy = particle.vy * damp + particle.gravity * dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.spin += dt * 2;
    list[write] = particle;
    write += 1;
  }
  list.length = write;
}

const COLORS = {
  [SPARK]: ['#ffd889', '#ff9a3d', '#ffeab5'],
  [SPLASH]: ['#b8e8ff', '#7fc8ff', '#e6f7ff'],
  [SMOKE]: ['#5d5270', '#3d3a52', '#7b6a7a'],
  [EMBER]: ['#ffb45e', '#ff7a32', '#ffd98a'],
};

/** Draw every particle additively: light adds to light on a dark sky. */
export function drawParticles(ctx, particles) {
  const list = particles.list;
  if (list.length === 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let index = 0; index < list.length; index += 1) {
    const particle = list[index];
    const fade = Math.max(0, Math.min(1, particle.life / particle.maxLife));
    const palette = COLORS[particle.kind] ?? COLORS[SPARK];
    const color = palette[Math.floor(particle.spin) % palette.length];
    const size = particle.size * (0.4 + fade * 0.8);
    ctx.globalAlpha = fade * (particle.kind === SMOKE ? 0.35 : 0.9);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, Math.max(0.4, size), 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}
