// The upgrade screen: after every wave the night offers three boons, and the player takes one with
// the mouse or the 1/2/3 keys. This module owns the presentation and the hit-testing; the boons
// themselves (what they do, how they stack) live in boons.js.

import { FONT, PALETTE, TAU } from './config.js';
import { boonById, stacksOf } from './boons.js';
import { drawText, fillPanel, pulse, roundRectPath } from './ui.js';

const CARD_GAP = 26;

/** The three card rectangles for a viewport, left to right. */
export function upgradeLayout(width, height) {
  const scale = Math.max(0.7, Math.min(1.15, width / 1280));
  const total = Math.min(1010 * scale, width - 70 * scale);
  const cardWidth = (total - CARD_GAP * 2 * scale) / 3;
  const cardHeight = Math.min(336 * scale, height * 0.52);
  const left = width / 2 - total / 2;
  const top = height * 0.5 - cardHeight / 2 + 42 * scale;
  const cards = [];
  for (let index = 0; index < 3; index += 1) {
    cards.push({
      index,
      x: left + index * (cardWidth + CARD_GAP * scale),
      y: top,
      width: cardWidth,
      height: cardHeight,
    });
  }
  return { cards, scale, top };
}

/** The card under a point, or -1. */
export function boonAtPoint(width, height, x, y) {
  const { cards } = upgradeLayout(width, height);
  for (let index = 0; index < cards.length; index += 1) {
    const card = cards[index];
    if (x >= card.x && x <= card.x + card.width && y >= card.y && y <= card.y + card.height) return index;
  }
  return -1;
}

/** One procedural icon per boon, drawn around (x, y) with radius r. */
export function drawBoonIcon(ctx, id, x, y, r, time) {
  const boon = boonById(id);
  const color = boon === null ? PALETTE.gold : boon.color;
  const breathe = 1 + 0.04 * Math.sin(time * 3.2 + x * 0.01);
  const size = r * breathe;
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(2, size * 0.12);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (id === 'magnet') {
    ctx.beginPath();
    ctx.arc(0, 2, size * 0.62, Math.PI, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-size * 0.62, 2);
    ctx.lineTo(-size * 0.62, size * 0.5);
    ctx.moveTo(size * 0.62, 2);
    ctx.lineTo(size * 0.62, size * 0.5);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillRect(-size * 0.75, size * 0.5, size * 0.26, size * 0.3);
    ctx.fillRect(size * 0.49, size * 0.5, size * 0.26, size * 0.3);
  } else if (id === 'flare') {
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.28, 0, TAU);
    ctx.fill();
    for (let ray = 0; ray < 8; ray += 1) {
      const angle = (ray / 8) * TAU + time * 0.15;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * size * 0.44, Math.sin(angle) * size * 0.44);
      ctx.lineTo(Math.cos(angle) * size * 0.82, Math.sin(angle) * size * 0.82);
      ctx.stroke();
    }
  } else if (id === 'regen') {
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.72);
    ctx.bezierCurveTo(size * 0.5, -size * 0.22, size * 0.46, size * 0.38, 0, size * 0.58);
    ctx.bezierCurveTo(-size * 0.46, size * 0.38, -size * 0.5, -size * 0.22, 0, -size * 0.72);
    ctx.fill();
    ctx.fillStyle = '#07101f';
    ctx.beginPath();
    ctx.moveTo(-size * 0.5, size * 0.42);
    ctx.lineTo(size * 0.5, size * 0.42);
    ctx.lineTo(size * 0.5, size * 0.52);
    ctx.lineTo(-size * 0.5, size * 0.52);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, size * 0.06);
    ctx.lineTo(0, size * 0.3);
    ctx.moveTo(-size * 0.12, size * 0.18);
    ctx.lineTo(size * 0.12, size * 0.18);
    ctx.stroke();
  } else if (id === 'chain') {
    ctx.beginPath();
    ctx.ellipse(-size * 0.28, 0, size * 0.34, size * 0.22, -0.5, 0, TAU);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(size * 0.28, 0, size * 0.34, size * 0.22, -0.5, 0, TAU);
    ctx.stroke();
  } else if (id === 'dash') {
    for (let chevron = 0; chevron < 3; chevron += 1) {
      const offset = (chevron - 1) * size * 0.34;
      ctx.beginPath();
      ctx.moveTo(offset - size * 0.18, -size * 0.4);
      ctx.lineTo(offset + size * 0.16, 0);
      ctx.lineTo(offset - size * 0.18, size * 0.4);
      ctx.stroke();
    }
  } else if (id === 'shield') {
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.7);
    ctx.lineTo(size * 0.56, -size * 0.4);
    ctx.lineTo(size * 0.56, size * 0.08);
    ctx.quadraticCurveTo(size * 0.46, size * 0.54, 0, size * 0.72);
    ctx.quadraticCurveTo(-size * 0.46, size * 0.54, -size * 0.56, size * 0.08);
    ctx.lineTo(-size * 0.56, -size * 0.4);
    ctx.closePath();
    ctx.stroke();
  }
  ctx.restore();
}

/** The full upgrade screen over the dimmed battle. */
export function drawUpgrade(ctx, state, width, height, time) {
  const { cards, scale } = upgradeLayout(width, height);
  const choices = state.boons.choices;

  ctx.fillStyle = 'rgba(3, 5, 12, 0.66)';
  ctx.fillRect(0, 0, width, height);

  const headingY = cards[0].y - 92 * scale;
  drawText(ctx, `WAVE ${Math.max(1, state.wave - 1)} CLEARED`, width / 2, headingY, {
    font: `700 ${11 * scale}px ${FONT.ui}`,
    fill: PALETTE.wind,
    align: 'center',
    letterSpacing: 5 * scale,
  });
  drawText(ctx, 'CHOOSE A BOON', width / 2, headingY + 44 * scale, {
    font: `700 ${40 * scale}px ${FONT.display}`,
    fill: PALETTE.emberHot,
    align: 'center',
    glow: 26,
    glowColor: 'rgba(255, 160, 70, 0.6)',
    letterSpacing: 5 * scale,
  });
  drawText(ctx, 'the night offers three gifts · click a card or press 1 · 2 · 3', width / 2, headingY + 66 * scale, {
    font: `italic ${14 * scale}px ${FONT.display}`,
    fill: PALETTE.dim,
    align: 'center',
  });

  for (let index = 0; index < cards.length; index += 1) {
    const card = cards[index];
    const id = choices[index];
    const boon = boonById(id);
    if (boon === null) continue;
    const stacks = stacksOf(state, id);
    const hover = 0;

    fillPanel(ctx, card.x, card.y, card.width, card.height, {
      radius: 18 * scale,
      accent: `${boon.color}66`,
    });

    // A soft wash of the boon's colour behind its icon.
    const wash = ctx.createRadialGradient(
      card.x + card.width / 2, card.y + 88 * scale, 0,
      card.x + card.width / 2, card.y + 88 * scale, card.width * 0.62,
    );
    wash.addColorStop(0, `${boon.color}22`);
    wash.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.save();
    ctx.fillStyle = wash;
    ctx.fillRect(card.x, card.y, card.width, card.height * 0.6);
    ctx.restore();

    drawBoonIcon(ctx, id, card.x + card.width / 2, card.y + 92 * scale, 34 * scale, time);

    drawText(ctx, boon.name, card.x + card.width / 2, card.y + 168 * scale, {
      font: `700 ${19 * scale}px ${FONT.mono}`,
      fill: boon.color,
      align: 'center',
      letterSpacing: 1.6 * scale,
      glow: 10,
      glowColor: boon.color,
    });
    drawText(ctx, boon.effect, card.x + card.width / 2, card.y + 198 * scale, {
      font: `500 ${13.5 * scale}px ${FONT.ui}`,
      fill: PALETTE.ink,
      align: 'center',
      alpha: 0.92,
    });
    drawText(ctx, boon.detail, card.x + card.width / 2, card.y + 220 * scale, {
      font: `600 ${11 * scale}px ${FONT.mono}`,
      fill: PALETTE.faint,
      align: 'center',
      letterSpacing: 0.8 * scale,
    });

    // Stack dots: what another copy buys.
    if (stacks > 0) {
      for (let dot = 0; dot < 3; dot += 1) {
        ctx.save();
        ctx.globalAlpha = dot < stacks ? 0.9 : 0.22;
        ctx.fillStyle = boon.color;
        ctx.beginPath();
        ctx.arc(card.x + card.width / 2 + (dot - 1) * 14 * scale, card.y + 240 * scale, 3.4 * scale, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
    }

    // The key cap, and the card's edge glowing with its colour.
    drawText(ctx, String(index + 1), card.x + card.width / 2, card.y + card.height - 32 * scale, {
      font: `700 ${18 * scale}px ${FONT.mono}`,
      fill: boon.color,
      align: 'center',
      alpha: pulse(time, 2.4, 0.55),
    });
    ctx.save();
    ctx.globalAlpha = 0.5 + 0.2 * Math.sin(time * 2.4 + index);
    ctx.strokeStyle = boon.color;
    ctx.lineWidth = 1.4;
    roundRectPath(ctx, card.x + 1, card.y + 1, card.width - 2, card.height - 2, 17 * scale);
    ctx.stroke();
    ctx.restore();
  }

  drawText(ctx, 'R restarts the run', width / 2, cards[0].y + cards[0].height + 30 * scale, {
    font: `500 ${10.5 * scale}px ${FONT.ui}`,
    fill: PALETTE.faint,
    align: 'center',
    letterSpacing: 2 * scale,
  });
}
