// Marisol Keys — hand-in program (Node 22, standard library only).
//
// The game itself is the static site in game/: index.html, an import map pointing "three" at the
// single vendored three.js build, and the game's own ES modules under game/src/ (world, roads,
// buildings, vehicles, traffic, peds, player, combat, police, missions, story, ui, audio, save,
// shots). Nothing is built: this program only copies game/ and the screenshots taken with
// tools/capture-shots.sh into the output folder, then writes dossier.json with the kit's
// buildDossier so the judge sees exactly these files.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts      (grader: writes to /output)

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Limits the gate enforces; buildDossier refuses anything over them, so a bad hand-in fails here.
const LIMITS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function copyFolder(name: string): void {
  const from = join(repoRoot, name);
  const to = join(outputDir, name);
  mkdirSync(to, { recursive: true });
  if (existsSync(from)) cpSync(from, to, { recursive: true });
}

mkdirSync(outputDir, { recursive: true });
copyFolder('game');
copyFolder('screenshots');

const shots = readdirSync(join(outputDir, 'screenshots')).filter((f) => !f.startsWith('.'));
if (shots.length < 3 || shots.length > 4) throw new Error(`expected 3-4 screenshots, found ${shots.length}`);

writeFileSync(join(outputDir, 'dossier.json'), buildDossier(outputDir, LIMITS));
