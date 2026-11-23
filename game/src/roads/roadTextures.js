// Painted road surfaces: asphalt with lane markings, crosswalks, junction squares, causeway decks.

import { canvasTexture, grain, blotches } from '../core/canvasTexture.js';

function asphalt(g, w, h, rng) {
  g.fillStyle = '#4a4b50';
  g.fillRect(0, 0, w, h);
  blotches(g, w, h, rng, 60, ['rgba(30,30,34,0.18)', 'rgba(110,105,100,0.12)'], 6, 40);
  grain(g, w, h, rng, 26);
}

// u spans the 14 m road width, v spans 28 m along it.
export function laneTexture() {
  return canvasTexture(256, 512, (g, w, h, rng) => {
    asphalt(g, w, h, rng);
    const m = w / 14; // pixels per metre
    // tyre wear darkening in each lane
    g.fillStyle = 'rgba(20,20,24,0.18)';
    for (const c of [1.9, 5.1]) for (const s of [-1, 1]) g.fillRect((7 + s * c - 0.9) * m, 0, 1.8 * m, h);
    // kerb gutters
    g.fillStyle = 'rgba(15,15,18,0.45)';
    g.fillRect(0, 0, 0.35 * m, h);
    g.fillRect(w - 0.35 * m, 0, 0.35 * m, h);
    // solid white edge lines
    g.fillStyle = '#e8e6df';
    g.fillRect(0.55 * m, 0, 0.16 * m, h);
    g.fillRect(w - 0.71 * m, 0, 0.16 * m, h);
    // double yellow centre
    g.fillStyle = '#f2c230';
    g.fillRect((7 - 0.28) * m, 0, 0.14 * m, h);
    g.fillRect((7 + 0.14) * m, 0, 0.14 * m, h);
    // dashed lane dividers
    g.fillStyle = '#ecebe4';
    const pm = h / 28;
    for (const x of [3.5, 10.5]) for (let s = 0; s < 28; s += 7) g.fillRect((x - 0.08) * m, (s + 1) * pm, 0.16 * m, 3.2 * pm);
    grain(g, w, h, rng, 10);
  }, { seed: 11 });
}

// 14 m wide by 6 m long: zebra crosswalk plus the stop line, placed at each end of a street.
export function crosswalkTexture() {
  return canvasTexture(256, 128, (g, w, h, rng) => {
    asphalt(g, w, h, rng);
    const m = w / 14, pm = h / 6;
    g.fillStyle = '#f1efe8';
    for (let x = 0.6; x < 13.6; x += 1.3) g.fillRect(x * m, 0.4 * pm, 0.75 * m, 3.4 * pm);
    g.fillRect(7 * m, 4.6 * pm, 7 * m, 0.45 * pm); // stop line on the inbound half
    g.fillStyle = '#f2c230';
    g.fillRect((7 - 0.28) * m, 4.2 * pm, 0.14 * m, 1.8 * pm);
    g.fillRect((7 + 0.14) * m, 4.2 * pm, 0.14 * m, 1.8 * pm);
    grain(g, w, h, rng, 14);
  }, { seed: 12 });
}

export function junctionTexture() {
  return canvasTexture(256, 256, (g, w, h, rng) => {
    asphalt(g, w, h, rng);
    g.strokeStyle = 'rgba(230,200,60,0.55)';
    g.lineWidth = 3;
    g.setLineDash([10, 8]);
    g.strokeRect(18, 18, w - 36, h - 36);
    g.setLineDash([]);
    grain(g, w, h, rng, 10);
  }, { seed: 13 });
}

export function causewayDeckTexture() {
  return canvasTexture(256, 512, (g, w, h, rng) => {
    g.fillStyle = '#55565a';
    g.fillRect(0, 0, w, h);
    grain(g, w, h, rng, 30);
    const m = w / 14, pm = h / 28;
    g.fillStyle = '#efefe8';
    g.fillRect(0.5 * m, 0, 0.18 * m, h);
    g.fillRect(w - 0.68 * m, 0, 0.18 * m, h);
    g.fillStyle = '#f2c230';
    g.fillRect((7 - 0.28) * m, 0, 0.14 * m, h);
    g.fillRect((7 + 0.14) * m, 0, 0.14 * m, h);
    g.fillStyle = '#e9e8e0';
    for (const x of [3.5, 10.5]) for (let s = 0; s < 28; s += 7) g.fillRect((x - 0.08) * m, (s + 1) * pm, 0.16 * m, 3.2 * pm);
    g.fillStyle = 'rgba(0,0,0,0.25)';
    for (let s = 0; s < 28; s += 14) g.fillRect(0, s * pm, w, 2); // expansion joints
  }, { seed: 14 });
}
