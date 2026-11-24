// Paints Marisol Keys as a map from the city plan itself: sea, district-coloured blocks, parks,
// beach, canals, roads, causeways and the pier. Shared by the minimap and the phone map.

import { eachBlock, BLOCK, ROAD_HALF, DISTRICTS, CAUSEWAYS, AVENUES, STREETS, GRID } from '../world/cityPlan.js';
import { edges } from '../roads/roadNetwork.js';
import { PIER } from '../props/beachfront.js';
import { CANAL_HALF } from '../world/terrain.js';
import { eachCollider } from '../world/collisionWorld.js';
import { MAINLAND_SHORE } from '../world/mainland.js';

export const MAP_BOUNDS = { x0: -1000, z0: -260, x1: 1140, z1: 1300 };
const PPM = 1; // pixels per metre in the cached map

let cached = null;

export function worldToMap(x, z) {
  return { x: (x - MAP_BOUNDS.x0) * PPM, y: (z - MAP_BOUNDS.z0) * PPM };
}

export function cityMapCanvas() {
  if (cached) return cached;
  const w = (MAP_BOUNDS.x1 - MAP_BOUNDS.x0) * PPM, h = (MAP_BOUNDS.z1 - MAP_BOUNDS.z0) * PPM;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  // sea with depth gradient toward the open ocean
  const sea = g.createLinearGradient(0, 0, w, 0);
  sea.addColorStop(0, '#2f8fbf'); sea.addColorStop(0.55, '#3aa7c9'); sea.addColorStop(1, '#1d6fa3');
  g.fillStyle = sea;
  g.fillRect(0, 0, w, h);
  g.translate(-MAP_BOUNDS.x0 * PPM, -MAP_BOUNDS.z0 * PPM);
  g.scale(PPM, PPM);
  // shallows ring
  g.fillStyle = 'rgba(120,220,220,0.35)';
  g.beginPath(); g.roundRect(2 * BLOCK - 40, BLOCK - 40, 11 * BLOCK + 80, 13 * BLOCK + 80, 60); g.fill();
  // hills to the north
  g.fillStyle = '#7fa65c';
  for (const [x, z, r] of [[200, -90, 120], [300, -140, 160], [420, -110, 140], [540, -170, 200], [700, -150, 160]]) { g.beginPath(); g.arc(x, z, r * 0.8, 0, Math.PI * 2); g.fill(); }
  // the mainland across the channel: scrub, its beach, the ferry quays and the coast highway
  const top = MAP_BOUNDS.z0, tall = MAP_BOUNDS.z1 - MAP_BOUNDS.z0;
  g.fillStyle = '#9fbf72'; g.fillRect(MAP_BOUNDS.x0, top, MAINLAND_SHORE - MAP_BOUNDS.x0, tall);
  g.fillStyle = '#f5e2ae'; g.fillRect(MAINLAND_SHORE, top, 28, tall);
  g.fillStyle = '#4a4e55'; g.fillRect(MAINLAND_SHORE - 68, top, 16, tall);
  g.fillStyle = '#d8d2c4';
  for (const cw of CAUSEWAYS) g.fillRect(MAINLAND_SHORE - 5, cw.z - 22, 30, 44);
  g.save();
  g.translate(MAINLAND_SHORE - 110, 520); g.rotate(-Math.PI / 2);
  g.fillStyle = 'rgba(40,60,40,0.75)'; g.font = '900 26px Arial'; g.textAlign = 'center';
  g.fillText('PORT CALLOWAY · MAINLAND', 0, 0);
  g.restore();
  // land blocks
  eachBlock((b) => {
    if (b.letter === '~') return;
    const d = DISTRICTS[b.key];
    if (b.letter === 'S') {
      g.fillStyle = '#f5e2ae';
      g.fillRect(b.x0, b.z0, BLOCK + 8, BLOCK + 0.5);
      g.fillStyle = '#c99a62';
      g.fillRect(b.x0 + ROAD_HALF, b.z0, 10, BLOCK + 0.5);
      return;
    }
    g.fillStyle = '#e9e2d6';
    g.fillRect(b.x0, b.z0, BLOCK + 0.5, BLOCK + 0.5);
    g.fillStyle = d.map;
    g.fillRect(b.x0 + ROAD_HALF + 3, b.z0 + ROAD_HALF + 3, BLOCK - ROAD_HALF * 2 - 6, BLOCK - ROAD_HALF * 2 - 6);
    if (b.letter === 'C') { g.fillStyle = '#3c9fc4'; g.fillRect(b.cx - CANAL_HALF, b.z0 + ROAD_HALF, CANAL_HALF * 2, BLOCK - ROAD_HALF * 2); }
    if (b.letter === 'P') { g.fillStyle = '#6fbf5a'; g.beginPath(); g.arc(b.cx, b.cz, 6, 0, Math.PI * 2); g.fill(); }
    if (b.letter === 'D') { g.fillStyle = 'rgba(40,60,90,0.25)'; g.fillRect(b.cx - 14, b.cz - 14, 28, 28); }
    if (b.letter === 'H') { g.fillStyle = 'rgba(120,60,40,0.35)'; for (let k = 0; k < 3; k++) g.fillRect(b.ix0 + 2, b.iz0 + 3 + k * 12, b.ix1 - b.ix0 - 6, 4); }
  });
  // roads
  g.lineCap = 'square';
  g.strokeStyle = '#ffffff';
  g.lineWidth = ROAD_HALF * 2;
  g.beginPath();
  for (const e of edges) { g.moveTo(e.ax, e.az); g.lineTo(e.bx, e.bz); }
  g.stroke();
  g.strokeStyle = '#ffd36e';
  g.lineWidth = 2;
  g.beginPath();
  for (const e of edges) { if (e.kind === 'causeway') { g.moveTo(e.ax, e.az); g.lineTo(e.bx, e.bz); } }
  for (const i of Object.keys(AVENUES)) { g.moveTo(i * BLOCK, BLOCK); g.lineTo(i * BLOCK, (GRID - 2) * BLOCK); }
  g.stroke();
  // building footprints from the collision boxes, shaded by height, with a drop shadow
  eachCollider((b) => {
    if (b.tag !== 'wall' && b.tag !== 'container') return;
    const w = b.x1 - b.x0, d = b.z1 - b.z0;
    if (w * d < 6) return;
    const h = b.y1;
    g.fillStyle = 'rgba(30,40,60,0.25)';
    g.fillRect(b.x0 + 1.5, b.z0 + 1.5, w, d);
    if (b.tag === 'container') g.fillStyle = '#c98a6a';
    else g.fillStyle = h > 60 ? '#5f7896' : h > 25 ? '#8aa0b8' : h > 12 ? '#e7d3bf' : '#f3e6d6';
    g.fillRect(b.x0, b.z0, w, d);
    g.strokeStyle = 'rgba(60,50,40,0.35)';
    g.lineWidth = 0.8;
    g.strokeRect(b.x0, b.z0, w, d);
  });
  // pier
  g.fillStyle = '#b07d52';
  g.fillRect(PIER.x0, PIER.z - PIER.half, PIER.x1 - PIER.x0, PIER.half * 2);
  for (const cw of CAUSEWAYS) {
    g.fillStyle = 'rgba(255,255,255,0.5)';
    for (let x = cw.x0 + 12; x < cw.x1; x += 24) g.fillRect(x - 1.5, cw.z - 10, 3, 20);
  }
  cached = c;
  return c;
}

// Large illustrated map with district names, street names and a compass (phone screen).
export function paintIllustratedMap(g, size, view = { x0: -330, z0: -130, span: 1350 }) {
  const base = cityMapCanvas();
  const s = size / view.span;
  g.save();
  g.fillStyle = '#1d6fa3';
  g.fillRect(0, 0, size, size);
  g.drawImage(base, (view.x0 - MAP_BOUNDS.x0) * PPM, (view.z0 - MAP_BOUNDS.z0) * PPM, view.span * PPM, view.span * PPM, 0, 0, size, size);
  const P = (x, z) => [(x - view.x0) * s, (z - view.z0) * s];
  // district labels
  const labels = [
    ['Mirador Hills', 250, 105], ['Glasswater', 480, 205], ['Pastel Mile', 700, 470], ['Sunwake Beach', 790, 690],
    ['Lantern Canals', 235, 545], ['Saltgate Harbor', 290, 805], ['Old Keys', 500, 640], ['Palmetto Flats', 215, 360], ['Seagrape Park', 600, 335],
  ];
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  for (const [name, x, z] of labels) {
    const [px, py] = P(x, z);
    g.font = `900 ${Math.round(size * 0.024)}px "Arial Black", Arial`;
    g.lineWidth = Math.max(3, size * 0.006);
    g.strokeStyle = 'rgba(10,30,45,0.8)';
    g.strokeText(name.toUpperCase(), px, py);
    g.fillStyle = '#fff6ea';
    g.fillText(name.toUpperCase(), px, py);
  }
  // water names
  g.font = `italic 700 ${Math.round(size * 0.022)}px Georgia, serif`;
  g.fillStyle = 'rgba(230,250,255,0.85)';
  for (const [name, x, z] of [['Marisol Bay', 40, 690], ['Harbor Basin', 420, 950]]) { const [px, py] = P(x, z); g.fillText(name, px, py); }
  { const [px, py] = P(900, 520); g.save(); g.translate(px, py); g.rotate(Math.PI / 2); g.fillText('Turquoise Sound', 0, 0); g.restore(); }
  // street names along avenues
  g.font = `700 ${Math.round(size * 0.013)}px "Segoe UI", Arial`;
  g.fillStyle = '#334';
  for (const [i, name] of Object.entries(AVENUES)) {
    const [px, py] = P(i * BLOCK, 2.5 * BLOCK);
    g.save(); g.translate(px, py); g.rotate(-Math.PI / 2); g.fillText(name, 0, 0); g.restore();
  }
  for (const [j, name] of Object.entries(STREETS)) {
    if (name.includes('Causeway')) {
      const [px, py] = P(-200, j * BLOCK - 16);
      g.fillStyle = '#fff'; g.fillText(name + '  ⟵ MAINLAND', px, py); g.fillStyle = '#334';
      continue;
    }
    const [px, py] = P(6.5 * BLOCK, j * BLOCK);
    g.fillText(name, px, py);
  }
  // compass
  const cx = size * 0.92, cy = size * 0.08, r = size * 0.04;
  g.fillStyle = 'rgba(10,30,45,0.7)';
  g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#ff6b5a';
  g.beginPath(); g.moveTo(cx, cy - r * 0.8); g.lineTo(cx - r * 0.3, cy); g.lineTo(cx + r * 0.3, cy); g.fill();
  g.fillStyle = '#fff';
  g.font = `900 ${Math.round(r * 0.6)}px Arial`;
  g.fillText('N', cx, cy + r * 0.45);
  g.restore();
  return { project: P, scale: s };
}
