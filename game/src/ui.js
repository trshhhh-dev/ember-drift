// Shared drawing primitives: rounded panels, glowing text, key caps and the small pulse that
// makes a prompt breathe. Keeping them in one place is what lets the HUD and the menus share the
// same visual language without repeating canvas boilerplate.

import { FONT, PALETTE } from './config.js';

/** A value eased between two numbers. */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/** A 0..1 pulse that never quite stops. */
export function pulse(time, speed = 2.6, floor = 0) {
  return floor + (1 - floor) * (0.5 + 0.5 * Math.sin(time * speed));
}

/** Trace a rounded rectangle; the caller fills or strokes it. */
export function roundRectPath(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

/**
 * A dark glass panel with a warm hairline, a top sheen and a soft drop shadow.
 * `accent` recolours the border for a new-best or danger panel.
 */
export function fillPanel(ctx, x, y, width, height, options = {}) {
  const radius = options.radius ?? 18;
  const accent = options.accent ?? PALETTE.panelEdge;
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
  ctx.shadowBlur = 34;
  ctx.shadowOffsetY = 14;
  const glass = ctx.createLinearGradient(0, y, 0, y + height);
  glass.addColorStop(0, options.top ?? 'rgba(16, 21, 43, 0.92)');
  glass.addColorStop(1, options.bottom ?? 'rgba(6, 9, 20, 0.94)');
  ctx.fillStyle = glass;
  roundRectPath(ctx, x, y, width, height, radius);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  ctx.strokeStyle = accent;
  ctx.lineWidth = 1.2;
  roundRectPath(ctx, x + 0.5, y + 0.5, width - 1, height - 1, radius);
  ctx.stroke();

  const sheen = ctx.createLinearGradient(0, y, 0, y + height * 0.4);
  sheen.addColorStop(0, 'rgba(255, 255, 255, 0.055)');
  sheen.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = sheen;
  roundRectPath(ctx, x + 1, y + 1, width - 2, height * 0.42, radius);
  ctx.fill();
  ctx.restore();
}

/**
 * Draw one line of text with optional tracking and glow. `letterSpacing` is set on the context
 * when the browser supports it; the default reset keeps other text unaffected.
 */
export function drawText(ctx, text, x, y, options = {}) {
  ctx.save();
  ctx.font = options.font ?? `20px ${FONT.ui}`;
  ctx.fillStyle = options.fill ?? PALETTE.ink;
  ctx.textAlign = options.align ?? 'left';
  ctx.textBaseline = options.baseline ?? 'alphabetic';
  ctx.globalAlpha = options.alpha ?? 1;
  if (options.letterSpacing !== undefined) ctx.letterSpacing = `${options.letterSpacing}px`;
  if (options.glow) {
    ctx.shadowColor = options.glowColor ?? options.fill ?? PALETTE.ember;
    ctx.shadowBlur = options.glow;
  }
  ctx.fillText(text, x, y);
  ctx.restore();
}

/** A rounded key cap, centered on (x, y), with its label. Returns its width. */
export function drawKeyCap(ctx, label, x, y, options = {}) {
  const font = options.font ?? `600 13px ${FONT.ui}`;
  ctx.save();
  ctx.font = font;
  const padding = options.padding ?? 10;
  const width = Math.max(options.minWidth ?? 30, ctx.measureText(label).width + padding * 2);
  const height = options.height ?? 26;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.strokeStyle = options.border ?? 'rgba(255, 210, 150, 0.38)';
  ctx.lineWidth = 1;
  roundRectPath(ctx, x - width / 2, y - height / 2, width, height, 7);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = options.fill ?? PALETTE.gold;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x, y + 0.5);
  ctx.restore();
  return width;
}

/** A tiny horizontal hairline with a glow, used to separate a screen's title from its content. */
export function drawRule(ctx, x, y, width, alpha = 0.4) {
  const gradient = ctx.createLinearGradient(x, y, x + width, y);
  gradient.addColorStop(0, 'rgba(255, 200, 130, 0)');
  gradient.addColorStop(0.5, `rgba(255, 200, 130, ${alpha})`);
  gradient.addColorStop(1, 'rgba(255, 200, 130, 0)');
  ctx.save();
  ctx.strokeStyle = gradient;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y + 0.5);
  ctx.lineTo(x + width, y + 0.5);
  ctx.stroke();
  ctx.restore();
}
