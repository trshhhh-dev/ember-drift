// Ember Drift's hand-in program (Node 22, standard library only). The game is the static folder
// game/, plain ES modules a desktop browser loads offline with no build step and no network. This
// program copies game/ and screenshots/ from beside this file into /output and writes
// /output/dossier.json with the kit's vendored library, exactly as the scorer rebuilds it.
//
// Serve it locally with `node serve.ts` and open http://localhost:8080.
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const output = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const gameSource = join(here, 'game');
const shotsSource = join(here, 'screenshots');

if (!existsSync(join(gameSource, 'index.html'))) {
  throw new Error('Ember Drift: game/index.html is missing; there is nothing to hand in.');
}

mkdirSync(output, { recursive: true });
cpSync(gameSource, join(output, 'game'), { recursive: true });

mkdirSync(join(output, 'screenshots'), { recursive: true });
if (existsSync(shotsSource)) cpSync(shotsSource, join(output, 'screenshots'), { recursive: true });

// The caps are the scorer's gate: only text_max_bytes shapes the bytes, the others refuse a game
// the scorer would refuse (four screenshots at 256 KiB, 993 game entries at 48 MiB, 1000-byte paths).
writeFileSync(
  join(output, 'dossier.json'),
  buildDossier(output, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

console.log(`Ember Drift handed in to ${output}`);
