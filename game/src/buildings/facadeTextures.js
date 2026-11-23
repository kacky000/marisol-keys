// Facade paintings for each architectural style. Walls are painted near-white so per-building
// vertex tints give every block its own pastel; glass is painted with a sky reflection.

import * as THREE from 'three';
import { canvasTexture, grain } from '../core/canvasTexture.js';

// Glass curtain wall: one tile = 12 m wide x 12 m tall (4 panes x 3 floors).
export function glassFacade() {
  return canvasTexture(256, 256, (g, w, h, rng) => {
    g.fillStyle = '#e4e9ee';
    g.fillRect(0, 0, w, h);
    const cw = w / 4, fh = h / 3;
    for (let f = 0; f < 3; f++) {
      for (let c = 0; c < 4; c++) {
        const x = c * cw + 3, y = f * fh + 10, pw = cw - 6, ph = fh - 16;
        const grad = g.createLinearGradient(x, y, x + pw * 0.4, y + ph);
        const warm = rng.chance(0.22);
        grad.addColorStop(0, warm ? '#ffd9a8' : '#a9c8e0');
        grad.addColorStop(0.45, warm ? '#c79a86' : '#5b86ab');
        grad.addColorStop(1, '#2c4b68');
        g.fillStyle = grad;
        g.fillRect(x, y, pw, ph);
        g.fillStyle = 'rgba(255,255,255,0.18)';
        g.beginPath(); g.moveTo(x, y + ph * 0.7); g.lineTo(x + pw * 0.5, y); g.lineTo(x + pw * 0.75, y); g.lineTo(x, y + ph); g.fill();
      }
      g.fillStyle = '#c4ccd4';
      g.fillRect(0, f * fh, w, 7);
    }
    grain(g, w, h, rng, 6);
  }, { seed: 31 });
}

// Art-deco stucco: one tile = 6 m wide x 6.6 m tall (2 windows x 2 floors) with eyebrow ledges.
export function decoFacade() {
  return canvasTexture(256, 256, (g, w, h, rng) => {
    g.fillStyle = '#fbf8f2';
    g.fillRect(0, 0, w, h);
    const fh = h / 2;
    for (let f = 0; f < 2; f++) {
      const y = f * fh;
      g.fillStyle = 'rgba(120,110,100,0.35)';
      g.fillRect(0, y + 14, w, 5); // eyebrow ledge shadow
      g.fillStyle = '#ffffff';
      g.fillRect(0, y + 8, w, 7);
      for (let c = 0; c < 2; c++) {
        const x = c * (w / 2) + 30;
        g.fillStyle = '#e9e4dc';
        g.fillRect(x - 6, y + 26, 80, 86);
        const grad = g.createLinearGradient(0, y + 30, 0, y + 110);
        grad.addColorStop(0, '#8fb3c9'); grad.addColorStop(1, '#27465a');
        g.fillStyle = grad;
        g.fillRect(x, y + 30, 68, 78);
        g.fillStyle = '#f6f2ea';
        g.fillRect(x + 32, y + 30, 4, 78);
        g.fillRect(x, y + 60, 68, 3);
      }
      g.fillStyle = 'rgba(0,0,0,0.06)';
      g.fillRect(0, y + fh - 8, w, 8);
    }
    // vertical pilasters
    g.fillStyle = 'rgba(255,255,255,0.9)';
    g.fillRect(0, 0, 8, h);
    g.fillStyle = 'rgba(0,0,0,0.08)';
    g.fillRect(8, 0, 3, h);
    grain(g, w, h, rng, 8);
  }, { seed: 32 });
}

// Neighbourhood stucco with shutters and balcony rails: 8 m x 6 m (2 windows x 2 floors).
export function stuccoFacade() {
  return canvasTexture(256, 256, (g, w, h, rng) => {
    g.fillStyle = '#fdf9f1';
    g.fillRect(0, 0, w, h);
    const fh = h / 2;
    for (let f = 0; f < 2; f++) {
      const y = f * fh;
      for (let c = 0; c < 2; c++) {
        const x = c * (w / 2) + 34;
        g.fillStyle = '#2f4b57';
        g.fillRect(x, y + 28, 60, 72);
        g.fillStyle = 'rgba(160,200,220,0.35)';
        g.fillRect(x + 4, y + 32, 24, 30);
        g.fillStyle = '#8a9a8f';
        g.fillRect(x - 18, y + 26, 16, 76);
        g.fillRect(x + 62, y + 26, 16, 76);
        g.fillStyle = 'rgba(0,0,0,0.25)';
        for (let k = 0; k < 7; k++) { g.fillRect(x - 18, y + 30 + k * 10, 16, 2); g.fillRect(x + 62, y + 30 + k * 10, 16, 2); }
        if ((f + c) % 2 === 0) {
          g.fillStyle = '#5b5b5b';
          g.fillRect(x - 10, y + 92, 80, 4);
          for (let k = 0; k <= 8; k++) g.fillRect(x - 10 + k * 10, y + 96, 2, 16);
          g.fillRect(x - 10, y + 110, 80, 3);
        }
      }
      g.fillStyle = 'rgba(0,0,0,0.07)';
      g.fillRect(0, y + fh - 6, w, 6);
    }
    grain(g, w, h, rng, 10);
  }, { seed: 33 });
}

// Corrugated warehouse cladding: 8 m x 8 m.
export function warehouseFacade() {
  return canvasTexture(256, 256, (g, w, h, rng) => {
    for (let x = 0; x < w; x += 8) {
      g.fillStyle = x % 16 === 0 ? '#e2e2de' : '#c9c9c4';
      g.fillRect(x, 0, 8, h);
    }
    for (let k = 0; k < 14; k++) {
      const x = rng.range(0, w);
      const grad = g.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, 'rgba(150,80,30,0.0)');
      grad.addColorStop(1, 'rgba(150,80,30,0.25)');
      g.fillStyle = grad;
      g.fillRect(x, rng.range(0, h / 2), rng.range(3, 10), h);
    }
    g.fillStyle = '#8b9199';
    g.fillRect(0, h - 26, w, 26);
    g.fillStyle = 'rgba(0,0,0,0.3)';
    g.fillRect(0, 40, w, 4);
    grain(g, w, h, rng, 12);
  }, { seed: 34 });
}

// Hillside villa: white render with big dark panes and slab edges. 10 m x 7 m.
export function villaFacade() {
  return canvasTexture(256, 256, (g, w, h, rng) => {
    g.fillStyle = '#fefcf8';
    g.fillRect(0, 0, w, h);
    const grad = g.createLinearGradient(0, 40, 0, 220);
    grad.addColorStop(0, '#9cc0d6'); grad.addColorStop(1, '#203a4c');
    g.fillStyle = grad;
    g.fillRect(24, 50, 130, 160);
    g.fillRect(176, 50, 56, 110);
    g.fillStyle = '#d4c9b8';
    g.fillRect(0, 0, w, 22);
    g.fillRect(0, h - 26, w, 26);
    g.fillStyle = '#fefcf8';
    g.fillRect(86, 50, 5, 160);
    grain(g, w, h, rng, 8);
  }, { seed: 35 });
}

// Street-level shopfront: one tile = 6 m wide x 3.6 m tall. Big display windows with warm-lit
// interiors and shelf silhouettes, a glass door, kick plate and a dark fascia for the sign.
export function shopfrontFacade() {
  return canvasTexture(256, 160, (g, w, h, rng) => {
    g.fillStyle = '#2a2d33';
    g.fillRect(0, 0, w, h);
    const fascia = 26;
    g.fillStyle = '#3a3e46';
    g.fillRect(0, 0, w, fascia);
    const pane = (x, pw, warmth) => {
      const grad = g.createLinearGradient(0, fascia, 0, h - 14);
      grad.addColorStop(0, warmth ? '#ffd9a0' : '#bfe4f0');
      grad.addColorStop(0.55, warmth ? '#e8a060' : '#6fa8c0');
      grad.addColorStop(1, '#3a2a24');
      g.fillStyle = grad;
      g.fillRect(x, fascia + 6, pw, h - fascia - 22);
      // shelves and goods
      for (let s = 0; s < 3; s++) {
        const y = fascia + 30 + s * 30;
        g.fillStyle = 'rgba(60,35,20,0.55)';
        g.fillRect(x + 4, y, pw - 8, 3);
        for (let k = 0; k < 6; k++) {
          g.fillStyle = `hsla(${rng.int(0, 360)},55%,55%,0.7)`;
          g.fillRect(x + 6 + k * (pw - 12) / 6, y - rng.range(6, 14), (pw - 12) / 8, rng.range(6, 14));
        }
      }
      // reflection sweep
      g.fillStyle = 'rgba(255,255,255,0.16)';
      g.beginPath(); g.moveTo(x, h - 30); g.lineTo(x + pw * 0.45, fascia + 6); g.lineTo(x + pw * 0.62, fascia + 6); g.lineTo(x + pw * 0.15, h - 16); g.fill();
    };
    pane(8, 92, true);
    pane(156, 92, rng.chance(0.5));
    // door
    g.fillStyle = '#1b1e22';
    g.fillRect(108, fascia + 6, 40, h - fascia - 6);
    g.fillStyle = 'rgba(190,225,240,0.55)';
    g.fillRect(113, fascia + 12, 30, h - fascia - 30);
    g.fillStyle = '#d9d9d9';
    g.fillRect(138, fascia + 60, 3, 18);
    // kick plate and mullions
    g.fillStyle = '#5a5e66';
    g.fillRect(0, h - 14, w, 14);
    g.fillRect(0, fascia, w, 6);
    g.fillRect(0, 0, 8, h); g.fillRect(100, fascia, 8, h); g.fillRect(148, fascia, 8, h); g.fillRect(w - 8, 0, 8, h);
    grain(g, w, h, rng, 6);
  }, { seed: 37 });
}

// Night windows: an emissive map derived from a facade texture. The tile is split into the
// style's window grid and roughly 40% of the panes glow a warm interior light.
export function litWindowsFrom(tex, cols, rows, seed = 5) {
  const src = tex.image;
  const w = src.width, h = src.height;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  const sd = src.getContext('2d').getImageData(0, 0, w, h).data;
  const out = g.createImageData(w, h);
  let s = seed;
  const rand = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const lit = [];
  const tints = [[255, 196, 120], [255, 226, 170], [190, 220, 255], [255, 170, 120]];
  for (let k = 0; k < cols * rows; k++) lit.push(rand() < 0.42 ? tints[Math.floor(rand() * tints.length)] : null);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const r = sd[i], gg = sd[i + 1], b = sd[i + 2];
      const lum = (r * 0.3 + gg * 0.59 + b * 0.11) / 255;
      const cell = lit[Math.floor(x / (w / cols)) + Math.floor(y / (h / rows)) * cols];
      if (cell && lum < 0.62 && b >= r - 10) { out.data[i] = cell[0]; out.data[i + 1] = cell[1]; out.data[i + 2] = cell[2]; }
      out.data[i + 3] = 255;
    }
  }
  g.putImageData(out, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Flat roofs: gravel with HVAC grime.
export function roofTexture() {
  return canvasTexture(256, 256, (g, w, h, rng) => {
    g.fillStyle = '#a9a59d';
    g.fillRect(0, 0, w, h);
    for (let k = 0; k < 3000; k++) {
      g.fillStyle = rng.chance(0.5) ? 'rgba(80,80,80,0.25)' : 'rgba(230,230,225,0.3)';
      g.fillRect(rng.range(0, w), rng.range(0, h), 2, 2);
    }
    grain(g, w, h, rng, 14);
  }, { seed: 36 });
}
