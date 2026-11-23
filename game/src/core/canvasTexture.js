// Builds three.js textures from 2D canvas drawing functions: every surface in the game is painted here.

import * as THREE from 'three';
import { createRng } from './rng.js';

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

export function canvasTexture(w, h, draw, { repeat = true, color = true, aniso = 8, seed = 3 } = {}) {
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  draw(g, w, h, createRng(seed));
  const tex = new THREE.CanvasTexture(c);
  if (repeat) tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  if (color) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = aniso;
  tex.needsUpdate = true;
  return tex;
}

// Sprinkle per-pixel grain over a canvas region (asphalt, sand, concrete).
export function grain(g, w, h, rng, amount = 18, alpha = 1) {
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  for (let k = 0; k < d.length; k += 4) {
    const n = (rng.next() - 0.5) * amount;
    d[k] += n; d[k + 1] += n; d[k + 2] += n;
    d[k + 3] = d[k + 3] * alpha;
  }
  g.putImageData(img, 0, 0);
}

export function blotches(g, w, h, rng, count, colors, rMin, rMax) {
  for (let k = 0; k < count; k++) {
    g.fillStyle = colors[k % colors.length];
    g.beginPath();
    g.ellipse(rng.range(0, w), rng.range(0, h), rng.range(rMin, rMax), rng.range(rMin, rMax), rng.range(0, 3), 0, Math.PI * 2);
    g.fill();
  }
}
