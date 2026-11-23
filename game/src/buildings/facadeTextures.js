// Facade paintings for each architectural style. Walls are painted near-white so per-building
// vertex tints give every block its own pastel; glass is painted with a sky reflection.

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
