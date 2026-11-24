// Boats that make the water feel used: sailboats with striped sails, speedboats, motor yachts
// and harbor tugs, moored or cruising slow loops, all rocking on the swell.

import * as THREE from 'three';
import { MeshBatch, tint } from '../core/meshBatch.js';
import { createRng } from '../core/rng.js';

const hullMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.1, side: THREE.DoubleSide });

// Tapered hull: a box for the stern half and a pointed bow, deck on top.
function hull(b, len, width, height, color, deck = '#e9dcc6') {
  const c = tint(color), d = tint(deck);
  const hw = width / 2, hl = len / 2;
  b.orientedBox(0, height / 2 - 0.3, hl * 0.25, width, height, len * 0.75, 0, c);
  const y0 = -0.3, y1 = height - 0.3, zb = -hl * 0.12, tip = -hl;
  b.quad([-hw, y0, zb], [0, y0 + 0.2, tip], [0, y1 + 0.15, tip], [-hw, y1, zb], [-0.9, 0, -0.4], [[0, 0], [1, 0], [1, 1], [0, 1]], c);
  b.quad([0, y0 + 0.2, tip], [hw, y0, zb], [hw, y1, zb], [0, y1 + 0.15, tip], [0.9, 0, -0.4], [[0, 0], [1, 0], [1, 1], [0, 1]], c);
  b.quad([-hw, y1, zb], [0, y1 + 0.15, tip], [0, y1 + 0.15, tip], [hw, y1, zb], [0, 1, 0], [[0, 0], [1, 0], [1, 1], [0, 1]], d);
  b.orientedBox(0, y1 - 0.02, hl * 0.25, width - 0.1, 0.06, len * 0.75 - 0.1, 0, d);
}

function sailboat(rng) {
  const b = new MeshBatch();
  const len = rng.range(7, 10);
  hull(b, len, 2.4, 1.1, '#ffffff');
  b.orientedBox(0, 1.1, 0.5, 1.6, 0.7, 2.2, 0, tint('#f4f1ea'));
  b.orientedBox(0, 5.5, -0.4, 0.14, 10, 0.14, 0, tint('#d8d8d8'));
  const sail = tint(rng.pick(['#ffffff', '#fff3d6', '#ffe0e6']));
  const stripe = tint(rng.pick(['#ff6b5a', '#19c3b4', '#ffc93c', '#5b7cff']));
  b.quad([0, 1.4, -0.2], [0, 1.4, 3.6], [0, 1.6, 3.6], [0, 10.2, -0.3], [1, 0, 0], [[0, 0], [1, 0], [1, 1], [0, 1]], sail);
  b.quad([0, 1.4, -0.6], [0, 8.8, -0.55], [0, 8.8, -0.55], [0, 1.4, -len * 0.42], [1, 0, 0], [[0, 0], [1, 0], [1, 1], [0, 1]], stripe);
  return b;
}

function speedboat(rng) {
  const b = new MeshBatch();
  hull(b, 7, 2.3, 1.0, rng.pick(['#ffffff', '#1d3557', '#e63946']), '#d8c3a5');
  b.orientedBox(0, 0.62, 0.6, 2.32, 0.12, 4.5, 0, tint(rng.pick(['#ff6b5a', '#19c3b4', '#ffd23f'])));
  b.orientedBox(0, 1.0, -0.4, 1.9, 0.5, 0.1, 0, tint('#7fb3d5'));
  b.orientedBox(0, 0.9, 1.6, 1.6, 0.5, 1.4, 0, tint('#f4f1ea'));
  return b;
}

function yacht(rng) {
  const b = new MeshBatch();
  hull(b, 18, 5, 2.2, '#fbfbfb');
  b.orientedBox(0, 2.4, 1.5, 4.2, 1.6, 10, 0, tint('#f4f4f2'));
  b.orientedBox(0, 2.6, 1.5, 4.25, 0.6, 9.4, 0, tint('#1e2d3a'));
  b.orientedBox(0, 3.9, 2.4, 3.4, 1.3, 6, 0, tint('#f4f4f2'));
  b.orientedBox(0, 4.1, 2.4, 3.45, 0.5, 5.6, 0, tint('#1e2d3a'));
  b.orientedBox(0, 5.4, 3, 0.2, 1.8, 0.2, 0, tint('#cccccc'));
  b.orientedBox(0, 1.9, 0, 5.05, 0.18, 17, 0, tint(rng.pick(['#19c3b4', '#ff6b5a', '#c9a227'])));
  return b;
}

function tug() {
  const b = new MeshBatch();
  hull(b, 11, 4, 1.8, '#c0392b', '#3a3a3a');
  b.orientedBox(0, 2.3, 1.2, 3, 2.2, 4, 0, tint('#f2f2f2'));
  b.orientedBox(0, 3.0, 1.2, 3.05, 0.6, 3.6, 0, tint('#1e2d3a'));
  b.orientedBox(0, 4.6, 2.2, 0.8, 1.6, 0.8, 0, tint('#ffd23f'));
  b.orientedBox(0, 5.4, 2.2, 0.82, 0.3, 0.82, 0, tint('#111'));
  return b;
}

const MAKERS = { sailboat, speedboat, yacht, tug };

// The drivable Riptide speedboat model (its bow faces -Z like every vehicle).
export function speedboatBatch(paint) {
  return speedboat({ pick: (list) => (list.includes(paint) ? paint : list[0]) });
}

// [type, x, z, heading, cruising radius (0 = moored)]
const FLEET = [
  // (the first two are kept clear of the Riptide Run gates)
  ['yacht', 875, 330, 0.3, 0], ['sailboat', 1130, 520, 1.2, 60], ['speedboat', 880, 640, -0.4, 90], ['sailboat', 1000, 300, 2.0, 0],
  ['sailboat', 980, 760, 0.8, 70], ['yacht', 930, 860, -1.2, 0], ['speedboat', 870, 470, 2.6, 0], ['sailboat', 20, 420, 0.5, 50],
  ['yacht', 60, 560, 1.6, 0], ['speedboat', 40, 700, 0.2, 80], ['tug', 330, 945, 1.57, 0], ['tug', 250, 960, 1.2, 40],
  ['sailboat', 520, 980, 2.1, 0], ['yacht', 600, 960, 1.57, 0], ['speedboat', 860, 520, 3.0, 0], ['sailboat', 1060, 600, 0.1, 0],
];

export function buildBoats(group) {
  const rng = createRng(404);
  const boats = [];
  for (const [type, x, z, heading, radius] of FLEET) {
    const mesh = MAKERS[type](rng).toMesh(hullMat);
    const holder = new THREE.Group();
    holder.add(mesh);
    holder.position.set(x, -0.5, z);
    holder.rotation.y = -heading;
    group.add(holder);
    boats.push({ holder, x, z, heading, radius, phase: rng.range(0, 6), speed: rng.range(0.03, 0.06) });
  }
  return (time) => {
    for (const b of boats) {
      if (b.radius) {
        const a = b.phase + time * b.speed;
        b.holder.position.x = b.x + Math.cos(a) * b.radius;
        b.holder.position.z = b.z + Math.sin(a) * b.radius;
        b.holder.rotation.y = -(a + Math.PI);
      }
      b.holder.position.y = -0.55 + Math.sin(time * 1.3 + b.phase) * 0.12;
      b.holder.rotation.z = Math.sin(time * 0.9 + b.phase) * 0.05;
      b.holder.rotation.x = Math.sin(time * 1.1 + b.phase * 2) * 0.03;
    }
  };
}
