// Juice: the little language of feedback. Floating numbers and callouts ("+50", "CHAIN ×5",
// "STORM BROKEN") live here, along with the hit-stop that freezes the simulation for a few frames
// when something big lands. Popups are spawned from the seeded world, so their drift is identical
// for a given seed and step count.

const MAX_POPUPS = 24;

/** A fresh juice record. */
export function createJuice() {
  return { popups: [], hitStop: 0 };
}

/** Clear it for a new run. */
export function resetJuice(juice) {
  juice.popups.length = 0;
  juice.hitStop = 0;
}

/**
 * Float a line of text up from a point. `rise` is how far it climbs, `size` its font size at
 * birth, `life` its seconds. The deterministic sway comes from the position, never a clock.
 */
export function addPopup(juice, x, y, text, options = {}) {
  if (juice.popups.length >= MAX_POPUPS) juice.popups.shift();
  const size = options.size ?? 22;
  juice.popups.push({
    x,
    y,
    text,
    color: options.color ?? '#ffe6ab',
    size,
    life: options.life ?? 1.05,
    maxLife: options.life ?? 1.05,
    rise: options.rise ?? 44,
    weight: options.weight ?? 700,
    sway: ((x * 0.37 + y * 0.19) % 1) * 2 - 1,
  });
}

/** Freeze the simulation briefly; the longest request wins. */
export function requestHitStop(juice, seconds) {
  juice.hitStop = Math.max(juice.hitStop, seconds);
}

/** Tick the popups and the hit-stop clock. */
export function updateJuice(juice, dt) {
  juice.hitStop = Math.max(0, juice.hitStop - dt);
  const keep = [];
  for (let index = 0; index < juice.popups.length; index += 1) {
    const popup = juice.popups[index];
    popup.life -= dt;
    if (popup.life > 0) keep.push(popup);
  }
  juice.popups = keep;
}

/** Draw every popup as glowing text that punches in, rises and fades. */
export function drawPopups(ctx, juice, scale = 1) {
  const list = juice.popups;
  if (list.length === 0) return;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let index = 0; index < list.length; index += 1) {
    const popup = list[index];
    const progress = 1 - popup.life / popup.maxLife;
    const alpha = Math.min(1, popup.life * 3.2);
    const punch = 1 + Math.max(0, 0.35 - progress * 0.9);
    const y = popup.y - progress * popup.rise + Math.sin(progress * 5.2 + popup.sway) * 3;
    const x = popup.x + popup.sway * progress * 14;
    const size = popup.size * scale * punch;
    ctx.font = `${popup.weight} ${size}px ui-monospace, "SFMono-Regular", Consolas, monospace`;
    ctx.globalAlpha = alpha;
    ctx.shadowColor = popup.color;
    ctx.shadowBlur = 16 * scale;
    ctx.fillStyle = popup.color;
    ctx.fillText(popup.text, x, y);
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.globalAlpha = alpha * 0.55;
    ctx.fillText(popup.text, x, y);
  }
  ctx.restore();
}
