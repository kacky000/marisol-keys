// Painted ground surfaces: sidewalk tiles, sand, lawn, plaza paving, boardwalk planks, quay concrete.

import { canvasTexture, grain, blotches } from '../core/canvasTexture.js';

export function sidewalkTexture() {
  return canvasTexture(256, 256, (g, w, h, rng) => {
    g.fillStyle = '#d9d1c4';
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      const v = rng.range(-10, 10);
      g.fillStyle = `rgb(${218 + v},${208 + v},${194 + v})`;
      g.fillRect(x * 64 + 2, y * 64 + 2, 60, 60);
    }
    blotches(g, w, h, rng, 14, ['rgba(120,100,80,0.08)'], 4, 18);
    grain(g, w, h, rng, 16);
  }, { seed: 21 });
}

export function sandTexture() {
  return canvasTexture(512, 512, (g, w, h, rng) => {
    g.fillStyle = '#f0d9a6';
    g.fillRect(0, 0, w, h);
    blotches(g, w, h, rng, 120, ['rgba(255,240,205,0.25)', 'rgba(205,170,115,0.16)'], 8, 50);
    g.strokeStyle = 'rgba(190,150,95,0.18)';
    g.lineWidth = 2;
    for (let k = 0; k < 40; k++) {
      const y = rng.range(0, h);
      g.beginPath();
      for (let x = 0; x <= w; x += 16) g.lineTo(x, y + Math.sin(x * 0.03 + k) * 6);
      g.stroke();
    }
    grain(g, w, h, rng, 22);
  }, { seed: 22 });
}

export function lawnTexture() {
  return canvasTexture(256, 256, (g, w, h, rng) => {
    g.fillStyle = '#5f9e45';
    g.fillRect(0, 0, w, h);
    blotches(g, w, h, rng, 80, ['rgba(140,190,80,0.25)', 'rgba(40,90,40,0.2)'], 5, 26);
    for (let k = 0; k < 2500; k++) {
      g.fillStyle = rng.chance(0.5) ? 'rgba(160,210,100,0.35)' : 'rgba(30,80,30,0.3)';
      g.fillRect(rng.range(0, w), rng.range(0, h), 1, 3);
    }
  }, { seed: 23 });
}

export function plazaTexture() {
  return canvasTexture(256, 256, (g, w, h, rng) => {
    g.fillStyle = '#e9dcc6';
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const alt = (x + y) % 2 === 0;
      g.fillStyle = alt ? '#efe2cc' : '#e0c9a8';
      g.fillRect(x * 32 + 1, y * 32 + 1, 30, 30);
    }
    g.strokeStyle = 'rgba(200,110,90,0.5)';
    g.lineWidth = 6;
    g.strokeRect(3, 3, w - 6, h - 6);
    grain(g, w, h, rng, 14);
  }, { seed: 24 });
}

export function boardwalkTexture() {
  return canvasTexture(256, 256, (g, w, h, rng) => {
    for (let y = 0; y < h; y += 16) {
      const v = rng.range(-18, 14);
      g.fillStyle = `rgb(${176 + v},${128 + v},${88 + v})`;
      g.fillRect(0, y, w, 15);
      g.fillStyle = 'rgba(60,35,20,0.55)';
      g.fillRect(0, y + 15, w, 1);
      for (let k = 0; k < 6; k++) {
        g.fillStyle = 'rgba(90,55,30,0.25)';
        g.fillRect(rng.range(0, w), y + rng.range(2, 12), rng.range(20, 80), 1);
      }
      g.fillStyle = 'rgba(40,30,20,0.6)';
      g.fillRect(rng.range(0, w), y + 6, 3, 3);
    }
    grain(g, w, h, rng, 14);
  }, { seed: 25 });
}

export function quayTexture() {
  return canvasTexture(256, 256, (g, w, h, rng) => {
    g.fillStyle = '#a7a39b';
    g.fillRect(0, 0, w, h);
    blotches(g, w, h, rng, 50, ['rgba(60,60,60,0.12)', 'rgba(140,110,70,0.1)'], 6, 30);
    g.strokeStyle = 'rgba(40,40,40,0.35)';
    g.lineWidth = 2;
    for (let x = 0; x <= w; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    g.fillStyle = 'rgba(240,200,40,0.8)';
    g.fillRect(0, 120, w, 8);
    grain(g, w, h, rng, 24);
  }, { seed: 26 });
}
