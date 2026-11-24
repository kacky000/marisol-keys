// The browser frame loop: steps the game (or the title flyover) once per animation frame with a
// capped time step, and trades resolution for frame rate when frames run long.

import { endInputFrame } from './input.js';

export function runFrameLoop(game) {
  let last = performance.now();
  // adaptive resolution: if frames run long, render fewer pixels; recover when there is headroom
  let avg = 16, scale = 1, settle = 0;
  const base = game.renderer.getPixelRatio();
  const frame = (now) => {
    const raw = now - last;
    const dt = Math.min(0.05, raw / 1000);
    last = now;
    avg += (raw - avg) * 0.05;
    settle -= raw;
    if (settle <= 0 && game.running) {
      const next = avg > 30 ? Math.max(0.6, scale - 0.1) : avg < 18 ? Math.min(1, scale + 0.05) : scale;
      if (next !== scale) { scale = next; game.renderer.setPixelRatio(base * scale); settle = 1500; }
    }
    if (game.running) {
      game.update(dt);
      game.render();
    } else game.renderTitle(dt);
    endInputFrame();
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
