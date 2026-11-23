// Invented brand signage painted into one atlas: shop fascias, hotel names, billboards.
// Signs glow softly at dusk through an emissive map.

import * as THREE from 'three';
import { makeCanvas } from '../core/canvasTexture.js';
import { MeshBatch, tint } from '../core/meshBatch.js';

export const BRAND_STYLES = {
  'SUNWAKE HOTEL': ['#0f4c5c', '#ffd27a', 'serif'],
  'MANGO BAY COLA': ['#ff8a00', '#ffffff', 'round'],
  'PALMETTO BANK': ['#1d3557', '#f1faee', 'serif'],
  'THE CORAL ROOM': ['#ff5d73', '#fff3f5', 'script'],
  'KESTREL MOTORS': ['#222831', '#ffd369', 'block'],
  'MARLIN DINER': ['#e63946', '#ffffff', 'round'],
  'SEABREEZE PHARMACY': ['#2a9d8f', '#ffffff', 'block'],
  'TIDAL 101.3': ['#3a0ca3', '#4cc9f0', 'block'],
  'GLASSWATER TRUST': ['#0b1f33', '#9fd8ff', 'serif'],
  'HALCYON PLAZA': ['#f1f1f1', '#264653', 'serif'],
  'PELICAN SURF CO': ['#fefae0', '#e76f51', 'round'],
  'KEYS TACTICAL': ['#283618', '#fefae0', 'block'],
  'CASA FLAMINGA': ['#ffafcc', '#7b2cbf', 'script'],
  'VELA CINEMA': ['#14213d', '#fca311', 'block'],
  'NOVA GELATO': ['#caffbf', '#ff006e', 'script'],
  'HOTEL ESMERALDA': ['#06d6a0', '#073b4c', 'serif'],
  'MERIDIAN AIR': ['#ffffff', '#1565c0', 'block'],
  'ORCA MEDIA': ['#111111', '#00f5d4', 'block'],
  'BODEGA SOL': ['#ffbe0b', '#3a0ca3', 'round'],
  'KEYS LAUNDRY': ['#a2d2ff', '#023047', 'round'],
  'PALM CUTS': ['#2b2d42', '#edf2f4', 'script'],
  'RAYO TACOS': ['#d62828', '#fcbf49', 'block'],
  'CAFE BRISA': ['#6b4226', '#ffe8d6', 'script'],
  'SALTGATE FREIGHT': ['#1b263b', '#e0e1dd', 'block'],
  'BRAVO LOGISTICS': ['#f77f00', '#000000', 'block'],
  'STATIC 88 FM': ['#000000', '#39ff14', 'block'],
  'SUNBELT GARAGE': ['#023e8a', '#ffd60a', 'block'],
  'PASTEL PAINT & BODY': ['#ff99c8', '#ffffff', 'round'],
  'KEYS CAB CO.': ['#ffd60a', '#000000', 'block'],
  'SUNRISE COURIERS': ['#ff6b35', '#ffffff', 'round'],
  'LUMEN TOWER': ['#0b1f33', '#9fe8ff', 'serif'],
  'DRINK MANGO BAY': ['#ff8a00', '#fff8e1', 'billboard'],
  'SUNWAKE · ROOMS FROM $89': ['#00a6a6', '#ffffff', 'billboard'],
};

const NAMES = Object.keys(BRAND_STYLES);
const COLS = 2, CELL_W = 512, CELL_H = 128;
const ROWS = Math.ceil(NAMES.length / COLS);

let atlas = null;
function buildAtlas() {
  const c = makeCanvas(COLS * CELL_W, ROWS * CELL_H);
  const g = c.getContext('2d');
  NAMES.forEach((name, k) => {
    const [bg, fg, style] = BRAND_STYLES[name];
    const x = (k % COLS) * CELL_W, y = Math.floor(k / COLS) * CELL_H;
    g.save();
    g.translate(x, y);
    g.fillStyle = bg;
    g.fillRect(0, 0, CELL_W, CELL_H);
    if (style === 'billboard') {
      const grad = g.createLinearGradient(0, 0, CELL_W, CELL_H);
      grad.addColorStop(0, bg); grad.addColorStop(1, '#ff4f6d');
      g.fillStyle = grad; g.fillRect(0, 0, CELL_W, CELL_H);
      g.fillStyle = 'rgba(255,255,255,0.25)';
      g.beginPath(); g.arc(440, 64, 50, 0, Math.PI * 2); g.fill();
    }
    g.strokeStyle = fg; g.lineWidth = 6; g.globalAlpha = 0.85;
    g.strokeRect(8, 8, CELL_W - 16, CELL_H - 16);
    g.globalAlpha = 1;
    const font = style === 'serif' ? 'bold 52px Georgia, serif' : style === 'script' ? 'italic bold 56px Georgia, serif' : style === 'round' ? 'bold 52px "Trebuchet MS", sans-serif' : '900 50px "Arial Black", Arial, sans-serif';
    g.font = font;
    g.fillStyle = fg;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    let size = 1;
    const tw = g.measureText(name).width;
    if (tw > CELL_W - 50) size = (CELL_W - 50) / tw;
    g.translate(CELL_W / 2, CELL_H / 2 + 3);
    g.scale(size, 1);
    g.shadowColor = 'rgba(0,0,0,0.35)'; g.shadowOffsetY = 3;
    g.fillText(name, 0, 0);
    g.restore();
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  atlas = tex;
  return tex;
}

function cellUV(name) {
  const k = Math.max(0, NAMES.indexOf(name));
  const u0 = (k % COLS) / COLS, u1 = u0 + 1 / COLS;
  const v1 = 1 - Math.floor(k / COLS) / ROWS, v0 = v1 - 1 / ROWS;
  return [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
}

// signs: [{x, y, z, yaw, w, h, brand}] — yaw 0 faces +Z.
export function buildSignMeshes(signs, group) {
  const batch = new MeshBatch();
  const white = tint('#ffffff');
  for (const s of signs) {
    const c = Math.cos(s.yaw), sn = Math.sin(s.yaw);
    const hw = s.w / 2;
    const p = (lx, ly) => [s.x + lx * c, s.y + ly, s.z - lx * sn];
    batch.quad(p(-hw, 0), p(hw, 0), p(hw, s.h), p(-hw, s.h), [sn, 0, c], cellUV(s.brand), white);
  }
  const map = atlas || buildAtlas();
  const mat = new THREE.MeshStandardMaterial({ map, emissiveMap: map, emissive: '#ffffff', emissiveIntensity: 0.25, roughness: 0.5, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 });
  const mesh = batch.toMesh(mat, { cast: false });
  mesh.name = 'signs';
  group.add(mesh);
  return mat;
}

// Rooftop billboards on frames.
export function addBillboard(kit, x, y, z, yaw, brand) {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  for (const lx of [-4, 4]) kit.trim.orientedBox(x + lx * c, y + 2, z - lx * s, 0.4, 4, 0.4, yaw, tint('#555'));
  kit.trim.orientedBox(x, y + 6.5, z, 13, 5, 0.3, yaw, tint('#333'));
  kit.signs.push({ x: x + s * 0.2, y: y + 4.2, z: z + c * 0.2, yaw, w: 12, h: 4.6, brand });
}
