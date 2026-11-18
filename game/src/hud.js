// The HUD: score and best, wave and its countdown, the fuel bar, the chain multiplier and the
// flare's readiness. It is drawn over play, pause and the results screen, and every readout uses
// large, high-contrast shapes so the state of a run is legible even in a shrunken screenshot.

import { FONT, PALETTE, WORLD } from './config.js';
import { displayScore, multiplierOf } from './score.js';
import { inGust } from './hazards.js';
import { waveName, WAVE_SECONDS } from './waves.js';
import { bossRatio } from './boss.js';
import { BOONS } from './boons.js';
import { drawText, pulse, roundRectPath } from './ui.js';
import { drawFlameGlyph } from './sprites.js';
import { drawBoonIcon } from './upgrades.js';

/** The warm colour of a chain at its current multiplier. */
function comboColor(multiplier) {
  if (multiplier >= 7) return '#ff8a6a';
  if (multiplier >= 4) return '#ffb35c';
  return PALETTE.gold;
}

/** Score, best, wave and chain in the top corners. */
function drawHeadline(ctx, state, width, height, best, scale) {
  const left = 34 * scale;
  const right = width - 34 * scale;
  const top = 30 * scale;
  const score = displayScore(state.score);

  drawText(ctx, 'SCORE', left, top + 10 * scale, {
    font: `600 ${11 * scale}px ${FONT.ui}`,
    fill: PALETTE.dim,
    letterSpacing: 3.4 * scale,
  });
  drawText(ctx, String(score).padStart(6, '0'), left - 2 * scale, top + 46 * scale, {
    font: `700 ${36 * scale}px ${FONT.mono}`,
    fill: PALETTE.ink,
    glow: 14,
    glowColor: 'rgba(255, 190, 110, 0.5)',
  });
  const bestLabel = best > 0 ? `BEST ${String(best).padStart(6, '0')}` : 'BEST —';
  drawText(ctx, bestLabel, left, top + 67 * scale, {
    font: `500 ${12 * scale}px ${FONT.mono}`,
    fill: PALETTE.faint,
    letterSpacing: 1.4 * scale,
  });

  drawText(ctx, `WAVE ${state.wave}`, right, top + 25 * scale, {
    font: `700 ${26 * scale}px ${FONT.mono}`,
    fill: PALETTE.ink,
    align: 'right',
    letterSpacing: 1.4 * scale,
  });
  drawText(ctx, waveName(state.wave), right, top + 44 * scale, {
    font: `600 ${11 * scale}px ${FONT.ui}`,
    fill: PALETTE.wind,
    align: 'right',
    letterSpacing: 3 * scale,
  });

  // The next wave's approach, as a thin bar that fills.
  const barWidth = 154 * scale;
  const barX = right - barWidth;
  const barY = top + 55 * scale;
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.09)';
  roundRectPath(ctx, barX, barY, barWidth, 3 * scale, 2 * scale);
  ctx.fill();
  ctx.fillStyle = 'rgba(127, 227, 212, 0.62)';
  roundRectPath(ctx, barX, barY, barWidth * (state.waves.sinceWave / WAVE_SECONDS), 3 * scale, 2 * scale);
  ctx.fill();
  ctx.restore();

  // Chain: the multiplier is the loudest number after the score.
  if (state.score.combo >= 3) {
    const multiplier = multiplierOf(state.score);
    const color = comboColor(multiplier);
    drawText(ctx, 'CHAIN', right, top + 84 * scale, {
      font: `700 ${10 * scale}px ${FONT.ui}`,
      fill: PALETTE.dim,
      align: 'right',
      letterSpacing: 3 * scale,
    });
    drawText(ctx, `×${multiplier}`, right, top + 124 * scale, {
      font: `700 ${48 * scale}px ${FONT.mono}`,
      fill: color,
      align: 'right',
      glow: 24,
      glowColor: color,
    });
    drawText(ctx, `${state.score.combo} MOTES`, right, top + 144 * scale, {
      font: `600 ${11 * scale}px ${FONT.ui}`,
      fill: PALETTE.dim,
      align: 'right',
      letterSpacing: 2.6 * scale,
    });
    const chainWidth = 120 * scale;
    const chainX = right - chainWidth;
    const chainY = top + 152 * scale;
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    roundRectPath(ctx, chainX, chainY, chainWidth, 4 * scale, 2 * scale);
    ctx.fill();
    ctx.fillStyle = color;
    roundRectPath(ctx, chainX, chainY, chainWidth * Math.max(0, Math.min(1, state.score.comboLeft / state.mods.combo)), 4 * scale, 2 * scale);
    ctx.fill();
    ctx.restore();
  }
}

/** The storm's health bar, centred at the top while a boss wave is up. */
function drawBossBar(ctx, state, width, scale) {
  if (state.boss === null) return;
  const barWidth = 380 * scale;
  const barHeight = 10 * scale;
  const x = width / 2 - barWidth / 2;
  const y = 30 * scale;
  const ratio = bossRatio(state.boss);
  drawText(ctx, 'STORM', x, y - 9 * scale, {
    font: `700 ${10 * scale}px ${FONT.ui}`,
    fill: PALETTE.danger,
    letterSpacing: 4 * scale,
  });
  drawText(ctx, `${Math.ceil(ratio * 100)}%`, x + barWidth, y - 9 * scale, {
    font: `600 ${10 * scale}px ${FONT.mono}`,
    fill: PALETTE.dim,
    align: 'right',
  });
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  roundRectPath(ctx, x, y, barWidth, barHeight, barHeight / 2);
  ctx.fill();
  ctx.fillStyle = ratio > 0.3 ? 'rgba(255, 120, 96, 0.9)' : 'rgba(255, 200, 120, 0.9)';
  roundRectPath(ctx, x, y, Math.max(2, barWidth * ratio), barHeight, barHeight / 2);
  ctx.fill();
  ctx.restore();
}

/** The boons taken, as a small tray under the score, so the run's build reads at a glance. */
function drawBoonTray(ctx, state, left, top, scale) {
  let index = 0;
  for (let boonIndex = 0; boonIndex < BOONS.length; boonIndex += 1) {
    const boon = BOONS[boonIndex];
    const stacks = state.boons.stacks[boon.id] ?? 0;
    if (stacks === 0) continue;
    const x = left + 15 * scale + index * 40 * scale;
    const y = top + 14 * scale;
    ctx.save();
    ctx.fillStyle = 'rgba(8, 12, 26, 0.55)';
    ctx.strokeStyle = `${boon.color}55`;
    ctx.lineWidth = 1;
    roundRectPath(ctx, x - 14 * scale, y - 14 * scale, 28 * scale, 28 * scale, 8 * scale);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    drawBoonIcon(ctx, boon.id, x, y, 8.5 * scale, state.time);
    if (stacks > 1) {
      drawText(ctx, String(stacks), x + 16 * scale, y + 13 * scale, {
        font: `700 ${9 * scale}px ${FONT.mono}`,
        fill: boon.color,
        align: 'right',
      });
    }
    index += 1;
  }
}

/** The fuel bar, low-fuel warning and the flame's percentage. */
function drawFuel(ctx, state, width, height, scale) {
  const left = 36 * scale;
  const barWidth = 286 * scale;
  const barHeight = 13 * scale;
  const y = height - 64 * scale;
  const ratio = Math.max(0, Math.min(1, state.fuel / WORLD.maxFuel));
  const low = ratio < 0.25;
  const critical = ratio < 0.1;
  const warn = low ? pulse(state.time, critical ? 8 : 4.5, 0.55) : 1;

  drawFlameGlyph(ctx, left + 12 * scale, y - 6 * scale, 1.15 * scale, ratio, state.time);
  drawText(ctx, low ? 'LOW FLAME' : 'FLAME', left + 32 * scale, y - 13 * scale, {
    font: `700 ${11 * scale}px ${FONT.ui}`,
    fill: low ? PALETTE.danger : PALETTE.dim,
    letterSpacing: 3.4 * scale,
    alpha: warn,
  });
  drawText(ctx, `${Math.ceil(state.fuel)}%`, left + 32 * scale + barWidth, y - 13 * scale, {
    font: `600 ${11 * scale}px ${FONT.mono}`,
    fill: low ? PALETTE.danger : PALETTE.faint,
    align: 'right',
  });

  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
  ctx.strokeStyle = 'rgba(255, 190, 120, 0.18)';
  ctx.lineWidth = 1;
  roundRectPath(ctx, left + 32 * scale, y, barWidth, barHeight, barHeight / 2);
  ctx.fill();
  ctx.stroke();

  const fill = ctx.createLinearGradient(left + 32 * scale, y, left + 32 * scale + barWidth, y);
  if (low) {
    fill.addColorStop(0, '#ff5568');
    fill.addColorStop(1, '#ff9a6a');
  } else {
    fill.addColorStop(0, '#ff7a2f');
    fill.addColorStop(0.55, '#ffb35c');
    fill.addColorStop(1, '#ffe6ab');
  }
  ctx.globalAlpha = warn;
  ctx.fillStyle = fill;
  roundRectPath(ctx, left + 32 * scale, y, Math.max(0, (barWidth - 2) * ratio), barHeight, barHeight / 2);
  ctx.fill();

  // Tick marks every quarter, so a glance reads the amount.
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = '#07101f';
  ctx.lineWidth = 1;
  for (let tick = 1; tick < 4; tick += 1) {
    const x = left + 32 * scale + (barWidth * tick) / 4;
    ctx.beginPath();
    ctx.moveTo(x, y + 1);
    ctx.lineTo(x, y + barHeight - 1);
    ctx.stroke();
  }
  ctx.restore();
}

/** The flare's readiness and what it costs. */
function drawFlare(ctx, state, width, height, scale) {
  const boxWidth = 214 * scale;
  const boxHeight = 55 * scale;
  const x = width - 36 * scale - boxWidth;
  const y = height - 88 * scale;
  const ready = state.player.flareCooldown <= 0 && state.fuel >= WORLD.flareCost;
  const affordable = state.fuel >= WORLD.flareCost;
  const charge = 1 - Math.min(1, state.player.flareCooldown / WORLD.flareCooldown);

  ctx.save();
  ctx.fillStyle = 'rgba(8, 12, 26, 0.62)';
  ctx.strokeStyle = ready ? 'rgba(255, 206, 130, 0.5)' : 'rgba(150, 168, 200, 0.2)';
  ctx.lineWidth = 1;
  roundRectPath(ctx, x, y, boxWidth, boxHeight, 11);
  ctx.fill();
  ctx.stroke();
  if (ready) {
    ctx.shadowColor = 'rgba(255, 180, 90, 0.55)';
    ctx.shadowBlur = 18;
    roundRectPath(ctx, x, y, boxWidth, boxHeight, 11);
    ctx.strokeStyle = 'rgba(255, 206, 130, 0.45)';
    ctx.stroke();
  }
  ctx.restore();

  drawText(ctx, 'FLARE', x + 14 * scale, y + 22 * scale, {
    font: `700 ${13 * scale}px ${FONT.ui}`,
    fill: ready ? PALETTE.gold : PALETTE.faint,
    letterSpacing: 3.2 * scale,
  });
  drawText(ctx, `−${WORLD.flareCost} FLAME`, x + 14 * scale, y + 41 * scale, {
    font: `500 ${9.5 * scale}px ${FONT.ui}`,
    fill: affordable ? PALETTE.faint : PALETTE.danger,
    letterSpacing: 1.4 * scale,
  });
  drawText(ctx, ready ? 'READY' : state.player.flareCooldown > 0 ? 'CHARGING' : 'NO FLAME', x + boxWidth - 14 * scale, y + 22 * scale, {
    font: `600 ${9.5 * scale}px ${FONT.ui}`,
    fill: ready ? PALETTE.wind : PALETTE.faint,
    align: 'right',
    letterSpacing: 1.6 * scale,
  });
  drawText(ctx, '[SPACE]', x + boxWidth - 14 * scale, y + 41 * scale, {
    font: `500 ${9.5 * scale}px ${FONT.mono}`,
    fill: PALETTE.faint,
    align: 'right',
    letterSpacing: 0.6 * scale,
  });

  // The cooldown rail along the bottom of the pill.
  const railX = x + 14 * scale;
  const railWidth = boxWidth - 28 * scale;
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
  roundRectPath(ctx, railX, y + boxHeight - 7 * scale, railWidth, 2.5 * scale, 2 * scale);
  ctx.fill();
  ctx.fillStyle = affordable ? PALETTE.gold : PALETTE.danger;
  roundRectPath(ctx, railX, y + boxHeight - 7 * scale, railWidth * charge, 2.5 * scale, 2 * scale);
  ctx.fill();
  ctx.restore();
}

/** The brief centre banner when a wave turns. */
function drawWaveBanner(ctx, state, width, height, scale) {
  if (state.banner <= 0) return;
  const life = Math.min(1, state.banner / 0.5);
  const fadeIn = Math.min(1, (1.8 - state.banner) * 4);
  const alpha = Math.min(life, fadeIn);
  const y = 148 * scale;
  drawText(ctx, `WAVE ${state.wave}`, width / 2, y, {
    font: `700 ${46 * scale}px ${FONT.mono}`,
    fill: PALETTE.ink,
    align: 'center',
    alpha,
    glow: 26,
    glowColor: 'rgba(255, 190, 110, 0.8)',
    letterSpacing: 4 * scale,
  });
  drawText(ctx, waveName(state.wave), width / 2, y + 27 * scale, {
    font: `600 ${13 * scale}px ${FONT.ui}`,
    fill: PALETTE.wind,
    align: 'center',
    alpha,
    letterSpacing: 5 * scale,
  });
}

/** The one-time flight hint at the start of a run. */
function drawFlightHint(ctx, state, width, height, scale) {
  if (state.time > 8.5 || state.over) return;
  const alpha = Math.min(1, (8.5 - state.time) / 2);
  drawText(ctx, 'MOUSE OR WASD TO FLY   ·   SPACE TO FLARE', width / 2, height - 104 * scale, {
    font: `600 ${11 * scale}px ${FONT.ui}`,
    fill: PALETTE.dim,
    align: 'center',
    alpha: alpha * 0.85,
    letterSpacing: 3 * scale,
  });
}

/** The red warning while a gust holds the ember. */
function drawGustWarning(ctx, state, width, height, scale) {
  if (!inGust(state) || state.over) return;
  const alpha = pulse(state.time, 6, 0.4);
  drawText(ctx, 'CAUGHT IN THE GUST', width / 2, height - 135 * scale, {
    font: `700 ${12 * scale}px ${FONT.ui}`,
    fill: PALETTE.wind,
    align: 'center',
    alpha,
    letterSpacing: 4 * scale,
    glow: 12,
    glowColor: 'rgba(127, 227, 212, 0.8)',
  });
}

/** Draw the whole HUD. */
export function drawHud(ctx, state, width, height, best) {
  const scale = Math.max(0.72, Math.min(1.18, width / 1280));
  drawHeadline(ctx, state, width, height, best, scale);
  drawBossBar(ctx, state, width, scale);
  drawBoonTray(ctx, state, 34 * scale, 30 * scale + 82 * scale, scale);
  drawFuel(ctx, state, width, height, scale);
  drawFlare(ctx, state, width, height, scale);
  drawWaveBanner(ctx, state, width, height, scale);
  drawFlightHint(ctx, state, width, height, scale);
  drawGustWarning(ctx, state, width, height, scale);
}
