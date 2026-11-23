// Entry point: builds the island, then either runs a scripted screenshot scene (?shot=name)
// or opens the title screen over a live flyover and starts the game loop.

import { createRenderer, createCamera } from './core/renderer.js';
import { Game } from './core/game.js';
import { runShot } from './shots/shotDirector.js';

const params = new URLSearchParams(location.search);
const shot = params.get('shot');
const stage = document.getElementById('stage');
const renderer = createRenderer(stage, { preserve: !!shot });
const camera = createCamera();

const bar = document.querySelector('#loading .load-bar i');
bar.style.width = '35%';

// Let the loading screen paint before the heavy city build.
requestAnimationFrame(() => setTimeout(() => {
  const game = new Game(renderer, camera, { shotMode: !!shot });
  game.init();
  bar.style.width = '100%';
  document.getElementById('loading').classList.add('hidden');
  if (shot) {
    runShot(game, shot, Number(params.get('seed') || 1));
  } else {
    game.menus.openTitle();
    game.loop();
  }
  window.marisol = game; // handy for debugging from the console
}, 30));
