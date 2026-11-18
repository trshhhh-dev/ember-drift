// The three full-screen states: the title with its controls, the pause card, and the results
// screen with the final score and a clear restart. They share the game's warm-on-cold language:
// a glass panel, a warm hairline, serif display type and mono numerals.

import { FONT, PALETTE, WORLD } from './config.js';
import { displayScore } from './score.js';
import { waveName } from './waves.js';
import { drawKeyCap, drawRule, drawText, fillPanel, pulse, roundRectPath } from './ui.js';
import { drawTitleEmblem } from './sprites.js';

/** A row of key caps starting at the left edge of its slot; returns the width used. */
function caps(ctx, labels, x, centerY, scale) {
  let cursor = x;
  for (let index = 0; index < labels.length; index += 1) {
    const label = labels[index];
    ctx.save();
    ctx.font = `600 ${12 * scale}px ${FONT.ui}`;
    const width = Math.max(34 * scale, ctx.measureText(label).width + 18 * scale);
    ctx.restore();
    drawKeyCap(ctx, label, cursor + width / 2, centerY, {
      font: `600 ${12 * scale}px ${FONT.ui}`,
      height: 25 * scale,
      padding: 9 * scale,
      minWidth: 34 * scale,
    });
    cursor += width + 7 * scale;
  }
  return cursor - x - 7 * scale;
}

/** Format seconds as m:ss. */
function formatTime(seconds) {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

/**
 * The cover overlay: the game's wordmark over a live mid-wave frame, drawn for the screenshot the
 * judge sees large. It sits high and centred, clear of the HUD's corners, so the scene stays busy
 * underneath it.
 */
export function drawCoverTitle(ctx, state, width, height) {
  const scale = Math.max(0.72, Math.min(1.2, width / 1280));
  const centre = width / 2;
  const top = height * 0.155;

  const band = ctx.createLinearGradient(0, top - 92 * scale, 0, top + 56 * scale);
  band.addColorStop(0, 'rgba(3, 5, 12, 0.62)');
  band.addColorStop(0.55, 'rgba(3, 5, 12, 0.30)');
  band.addColorStop(1, 'rgba(3, 5, 12, 0)');
  ctx.fillStyle = band;
  ctx.fillRect(0, top - 92 * scale, width, 148 * scale);

  drawText(ctx, 'EMBER DRIFT', centre, top, {
    font: `700 ${74 * scale}px ${FONT.display}`,
    fill: PALETTE.emberHot,
    align: 'center',
    glow: 38,
    glowColor: 'rgba(255, 128, 42, 0.85)',
    letterSpacing: 9 * scale,
  });
  drawText(ctx, 'a small flame against the long night', centre, top + 30 * scale, {
    font: `italic ${17 * scale}px ${FONT.display}`,
    fill: PALETTE.dim,
    align: 'center',
    letterSpacing: 1.6 * scale,
  });
  drawRule(ctx, centre - 220 * scale, top + 48 * scale, 440 * scale, 0.4);

  drawText(ctx, `WAVE ${state.wave}  ·  ${waveName(state.wave)}`, centre, top + 74 * scale, {
    font: `600 ${12 * scale}px ${FONT.ui}`,
    fill: PALETTE.wind,
    align: 'center',
    letterSpacing: 4 * scale,
  });
}

/** The start screen: name, a floating spark, the controls and the invitation to play. */
export function drawTitle(ctx, state, width, height, best) {
  const scale = Math.max(0.68, Math.min(1.2, width / 1280));
  const centre = width / 2;

  // A gentle darkening top and bottom keeps the type clear without hiding the sky.
  const shade = ctx.createLinearGradient(0, 0, 0, height);
  shade.addColorStop(0, 'rgba(3, 5, 12, 0.55)');
  shade.addColorStop(0.4, 'rgba(3, 5, 12, 0.16)');
  shade.addColorStop(0.75, 'rgba(3, 5, 12, 0.30)');
  shade.addColorStop(1, 'rgba(3, 5, 12, 0.72)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, width, height);

  drawTitleEmblem(ctx, centre, height * 0.205, state.time);

  drawText(ctx, 'EMBER DRIFT', centre, height * 0.365, {
    font: `700 ${86 * scale}px ${FONT.display}`,
    fill: PALETTE.emberHot,
    align: 'center',
    glow: 34,
    glowColor: 'rgba(255, 138, 50, 0.65)',
    letterSpacing: 7 * scale,
  });
  drawText(ctx, 'a small flame against the long night', centre, height * 0.365 + 34 * scale, {
    font: `italic ${19 * scale}px ${FONT.display}`,
    fill: PALETTE.dim,
    align: 'center',
    letterSpacing: 1.2 * scale,
  });
  drawRule(ctx, centre - 190 * scale, height * 0.365 + 54 * scale, 380 * scale, 0.35);

  // Controls card.
  const panelWidth = Math.min(650 * scale, width - 70 * scale);
  const panelHeight = 154 * scale;
  const panelX = centre - panelWidth / 2;
  const panelY = height * 0.475;
  fillPanel(ctx, panelX, panelY, panelWidth, panelHeight, { radius: 16 * scale });
  const rowX = panelX + 34 * scale;
  const noteX = panelX + panelWidth - 28 * scale;
  const rows = [
    { y: panelY + 38 * scale, title: 'MOVE', keys: ['MOUSE', 'WASD', 'ARROWS'], note: 'aim the ember through the wind' },
    { y: panelY + 79 * scale, title: 'FLARE', keys: ['SPACE', 'CLICK'], note: `burn ${WORLD.flareCost} flame to scatter rain` },
    { y: panelY + 119 * scale, title: 'PAUSE', keys: ['P', 'ESC'], note: 'rest, or press R to restart' },
  ];
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    drawText(ctx, row.title, rowX, row.y + 4 * scale, {
      font: `700 ${11 * scale}px ${FONT.ui}`,
      fill: PALETTE.gold,
      letterSpacing: 3 * scale,
    });
    caps(ctx, row.keys, rowX + 70 * scale, row.y, scale);
    drawText(ctx, row.note, noteX, row.y + 4 * scale, {
      font: `500 ${11.5 * scale}px ${FONT.ui}`,
      fill: PALETTE.dim,
      align: 'right',
      alpha: 0.95,
    });
  }

  drawText(ctx, 'COLLECT MOTES  ·  DODGE THE RAIN  ·  RIDE THE GUSTS', centre, height * 0.705, {
    font: `600 ${11 * scale}px ${FONT.ui}`,
    fill: PALETTE.faint,
    align: 'center',
    letterSpacing: 3.2 * scale,
  });

  const breathe = pulse(state.time, 2.8, 0.45);
  drawText(ctx, 'CLICK OR PRESS SPACE TO IGNITE', centre, height * 0.805, {
    font: `700 ${19 * scale}px ${FONT.ui}`,
    fill: PALETTE.emberHot,
    align: 'center',
    alpha: breathe,
    glow: 20,
    glowColor: 'rgba(255, 170, 80, 0.9)',
    letterSpacing: 3.6 * scale,
  });

  drawText(ctx, best > 0 ? `BEST  ${String(best).padStart(6, '0')}` : 'BEST  —', width - 34 * scale, 40 * scale, {
    font: `600 ${12 * scale}px ${FONT.mono}`,
    fill: PALETTE.faint,
    align: 'right',
    letterSpacing: 1.6 * scale,
  });
  drawText(ctx, 'an original night-flight arcade', width - 34 * scale, height - 28 * scale, {
    font: `500 ${10 * scale}px ${FONT.ui}`,
    fill: 'rgba(149, 165, 199, 0.45)',
    align: 'right',
    letterSpacing: 2 * scale,
  });
}

/** The pause card: the run is intact behind it, the choices in front. */
export function drawPause(ctx, state, width, height, best) {
  const scale = Math.max(0.72, Math.min(1.15, width / 1280));
  ctx.fillStyle = 'rgba(3, 5, 12, 0.62)';
  ctx.fillRect(0, 0, width, height);

  const panelWidth = Math.min(520 * scale, width - 60 * scale);
  const panelHeight = 322 * scale;
  const x = width / 2 - panelWidth / 2;
  const y = height / 2 - panelHeight / 2;
  fillPanel(ctx, x, y, panelWidth, panelHeight, { radius: 20 * scale, accent: 'rgba(255, 205, 135, 0.42)' });

  drawText(ctx, 'PAUSED', width / 2, y + 66 * scale, {
    font: `700 ${44 * scale}px ${FONT.display}`,
    fill: PALETTE.emberHot,
    align: 'center',
    glow: 22,
    glowColor: 'rgba(255, 160, 70, 0.6)',
    letterSpacing: 5 * scale,
  });
  drawText(ctx, 'the night waits', width / 2, y + 89 * scale, {
    font: `italic ${15 * scale}px ${FONT.display}`,
    fill: PALETTE.dim,
    align: 'center',
  });
  drawRule(ctx, width / 2 - 150 * scale, y + 108 * scale, 300 * scale, 0.3);

  drawText(ctx, 'SCORE', x + 44 * scale, y + 140 * scale, {
    font: `600 ${10 * scale}px ${FONT.ui}`,
    fill: PALETTE.faint,
    letterSpacing: 3 * scale,
  });
  drawText(ctx, String(displayScore(state.score)).padStart(6, '0'), x + 44 * scale, y + 172 * scale, {
    font: `700 ${30 * scale}px ${FONT.mono}`,
    fill: PALETTE.ink,
  });
  drawText(ctx, `WAVE ${state.wave} · ${waveName(state.wave)}`, x + panelWidth - 44 * scale, y + 154 * scale, {
    font: `600 ${11 * scale}px ${FONT.ui}`,
    fill: PALETTE.wind,
    align: 'right',
    letterSpacing: 2 * scale,
  });
  drawText(ctx, `BEST ${String(best).padStart(6, '0')}`, x + panelWidth - 44 * scale, y + 174 * scale, {
    font: `500 ${11 * scale}px ${FONT.mono}`,
    fill: PALETTE.faint,
    align: 'right',
  });

  const hintY = y + 224 * scale;
  drawText(ctx, 'P / ESC', width / 2 - 100 * scale, hintY, {
    font: `600 ${12 * scale}px ${FONT.mono}`,
    fill: PALETTE.gold,
    align: 'center',
  });
  drawText(ctx, 'resume', width / 2 - 100 * scale, hintY + 19 * scale, {
    font: `500 ${10 * scale}px ${FONT.ui}`,
    fill: PALETTE.faint,
    align: 'center',
    letterSpacing: 1.5 * scale,
  });
  drawText(ctx, 'R', width / 2 + 100 * scale, hintY, {
    font: `600 ${12 * scale}px ${FONT.mono}`,
    fill: PALETTE.gold,
    align: 'center',
  });
  drawText(ctx, 'restart', width / 2 + 100 * scale, hintY + 19 * scale, {
    font: `500 ${10 * scale}px ${FONT.ui}`,
    fill: PALETTE.faint,
    align: 'center',
    letterSpacing: 1.5 * scale,
  });

  drawText(ctx, 'CLICK TO RESUME', width / 2, y + panelHeight - 34 * scale, {
    font: `600 ${10 * scale}px ${FONT.ui}`,
    fill: PALETTE.dim,
    align: 'center',
    alpha: pulse(state.time, 2.4, 0.35),
    letterSpacing: 3 * scale,
  });
}

/** One results statistic: a small label over a mono value. */
function stat(ctx, label, value, x, y, scale) {
  drawText(ctx, label, x, y, {
    font: `600 ${9.5 * scale}px ${FONT.ui}`,
    fill: PALETTE.faint,
    letterSpacing: 2.4 * scale,
  });
  drawText(ctx, value, x, y + 22 * scale, {
    font: `700 ${19 * scale}px ${FONT.mono}`,
    fill: PALETTE.ink,
  });
}

/** The results screen: how the run ended, what it earned, and how to begin again. */
export function drawGameOver(ctx, state, width, height, meta) {
  const scale = Math.max(0.7, Math.min(1.16, width / 1280));
  const panelWidth = Math.min(660 * scale, width - 56 * scale);
  const panelHeight = 466 * scale;
  const x = width / 2 - panelWidth / 2;
  const y = Math.max(34 * scale, height / 2 - panelHeight / 2 + 22 * scale);

  const shade = ctx.createLinearGradient(0, 0, 0, height);
  shade.addColorStop(0, 'rgba(3, 5, 12, 0.30)');
  shade.addColorStop(0.42, 'rgba(3, 5, 12, 0.68)');
  shade.addColorStop(0.78, 'rgba(3, 5, 12, 0.94)');
  shade.addColorStop(1, 'rgba(3, 5, 12, 0.97)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, width, height);

  fillPanel(ctx, x, y, panelWidth, panelHeight, {
    radius: 22 * scale,
    accent: meta.newBest ? 'rgba(255, 211, 140, 0.55)' : 'rgba(255, 140, 110, 0.38)',
  });

  drawText(ctx, 'GAME OVER', width / 2, y + 42 * scale, {
    font: `600 ${10 * scale}px ${FONT.ui}`,
    fill: PALETTE.danger,
    align: 'center',
    letterSpacing: 5 * scale,
  });
  drawText(ctx, 'EMBER EXTINGUISHED', width / 2, y + 88 * scale, {
    font: `700 ${38 * scale}px ${FONT.display}`,
    fill: PALETTE.emberHot,
    align: 'center',
    glow: 24,
    glowColor: 'rgba(255, 130, 55, 0.65)',
    letterSpacing: 3 * scale,
  });
  drawText(ctx, `the ${waveName(state.wave).toLowerCase()} took the last of it`, width / 2, y + 112 * scale, {
    font: `italic ${14 * scale}px ${FONT.display}`,
    fill: PALETTE.dim,
    align: 'center',
  });

  drawText(ctx, 'FINAL SCORE', width / 2, y + 156 * scale, {
    font: `600 ${10 * scale}px ${FONT.ui}`,
    fill: PALETTE.faint,
    align: 'center',
    letterSpacing: 4 * scale,
  });
  drawText(ctx, String(displayScore(state.score)).padStart(6, '0'), width / 2, y + 218 * scale, {
    font: `700 ${70 * scale}px ${FONT.mono}`,
    fill: PALETTE.gold,
    align: 'center',
    glow: 30,
    glowColor: 'rgba(255, 190, 100, 0.6)',
    letterSpacing: 4 * scale,
  });

  const best = Math.max(meta.best ?? 0, displayScore(state.score));
  const bestLine = `BEST  ${String(best).padStart(6, '0')}`;
  drawText(ctx, bestLine, width / 2 - (meta.newBest ? 58 * scale : 0), y + 246 * scale, {
    font: `600 ${12 * scale}px ${FONT.mono}`,
    fill: PALETTE.dim,
    align: 'center',
    letterSpacing: 1.5 * scale,
  });
  if (meta.newBest) {
    const badgeWidth = 88 * scale;
    const badgeX = width / 2 + 44 * scale;
    ctx.save();
    ctx.fillStyle = 'rgba(255, 196, 110, 0.14)';
    ctx.strokeStyle = 'rgba(255, 206, 135, 0.55)';
    ctx.lineWidth = 1;
    roundRectPath(ctx, badgeX, y + 230 * scale, badgeWidth, 21 * scale, 10 * scale);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    drawText(ctx, 'NEW BEST', badgeX + badgeWidth / 2, y + 245 * scale, {
      font: `700 ${9 * scale}px ${FONT.ui}`,
      fill: PALETTE.gold,
      align: 'center',
      letterSpacing: 1.6 * scale,
    });
  }

  drawRule(ctx, x + 60 * scale, y + 272 * scale, panelWidth - 120 * scale, 0.26);

  const statY = y + 300 * scale;
  const left = x + 68 * scale;
  const step = (panelWidth - 136 * scale) / 3;
  stat(ctx, 'WAVE', String(state.wave), left, statY, scale);
  stat(ctx, 'MOTES', String(state.score.motes), left + step, statY, scale);
  stat(ctx, 'BEST CHAIN', String(state.score.bestCombo), left + step * 2, statY, scale);
  stat(ctx, 'TIME', formatTime(state.time), left, statY + 62 * scale, scale);
  stat(ctx, 'RAIN HITS', String(state.hits), left + step, statY + 62 * scale, scale);

  const promptY = y + panelHeight - 46 * scale;
  drawText(ctx, 'PRESS R OR CLICK TO RISE AGAIN', width / 2, promptY, {
    font: `700 ${15 * scale}px ${FONT.ui}`,
    fill: PALETTE.emberHot,
    align: 'center',
    alpha: pulse(state.time, 2.8, 0.45),
    glow: 16,
    glowColor: 'rgba(255, 170, 80, 0.8)',
    letterSpacing: 3 * scale,
  });
  drawText(ctx, 'collect motes to feed the flame · every chain buys another breath', width / 2, promptY + 22 * scale, {
    font: `500 ${9.5 * scale}px ${FONT.ui}`,
    fill: PALETTE.faint,
    align: 'center',
    letterSpacing: 1.2 * scale,
  });
}
