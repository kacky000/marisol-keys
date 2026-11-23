// Deterministic screenshot mode (?shot=<name>&seed=<n>): seeds the random streams, builds the
// scene with the real game code, steps it at a fixed 60 Hz, frames the camera and renders.

import { SCENES } from './shotScenes.js';
import { reseed } from '../core/rng.js';

export function runShot(game, name, seed) {
  const scene = SCENES[name] || SCENES.cover;
  reseed(seed);
  game.state.hour = scene.hour;
  game.hud.show(true);
  scene.setup(game);
  const dt = 1 / 60;
  for (let k = 0; k < scene.steps; k++) {
    scene.tick?.(game, dt);
    game.update(dt);
  }
  const view = scene.finalize(game);
  game.camera.fixed = view;
  game.camera.update(0, game.player, game.time);
  game.updateHud(dt);
  let frames = 0;
  const draw = () => {
    game.render();
    if (++frames < 3) requestAnimationFrame(draw);
    else document.title = `shot-ready:${name}`;
  };
  requestAnimationFrame(draw);
}
