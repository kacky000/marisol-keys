// MV Calloway Belle: the car ferry that shuttles between Saltgate Harbor and Port Calloway on
// the mainland — a white double-ended hull with a blue band, a car deck of parked cars, a
// bridge house and twin funnels. Crosses in a few minutes, waits at each end, turns round.

import * as THREE from 'three';
import { MeshBatch, tint } from '../core/meshBatch.js';
import { MAINLAND_SHORE } from '../world/mainland.js';

const ROUTE_Z = 905;
const ISLAND_END = 70, MAINLAND_END = MAINLAND_SHORE + 60;
const CROSSING = 150, DWELL = 40;      // seconds
const LEN = 38, WIDTH = 13;

function buildFerry() {
  const b = new MeshBatch();
  const white = tint('#f3f1ea'), blue = tint('#1f4e8c'), deck = tint('#8b8f94'), dark = tint('#24303c'), red = tint('#c8302a');
  b.orientedBox(0, 0.6, 0, WIDTH, 3.2, LEN, 0, white);                 // hull
  b.orientedBox(0, 0.1, 0, WIDTH + 0.05, 0.9, LEN + 0.05, 0, blue);   // waterline band
  b.orientedBox(0, 1.55, 0, WIDTH + 0.06, 0.35, LEN + 0.06, 0, blue); // rubbing strake
  b.orientedBox(0, 2.25, 0, WIDTH - 1.2, 0.1, LEN - 2, 0, deck);      // car deck
  for (const s of [-1, 1]) b.orientedBox(s * (WIDTH / 2 - 0.4), 2.9, 0, 0.5, 1.3, LEN - 2, 0, white); // side bulwarks
  // cars parked in rows on the deck
  const paints = ['#ff5a36', '#19c3b4', '#ffd23f', '#e9e4da', '#2f5d8a', '#ff8fb1', '#3d3f45'];
  let n = 0;
  for (let row = -1; row <= 1; row++) {
    for (let k = -3; k <= 3; k++) {
      if ((row + k + 7) % 5 === 0) continue;
      const c = tint(paints[n++ % paints.length]);
      b.orientedBox(row * 3.6, 2.85, k * 5.2, 1.9, 1.1, 4.3, 0, c);
      b.orientedBox(row * 3.6, 3.55, k * 5.2 + 0.2, 1.7, 0.5, 2.3, 0, dark);
    }
  }
  // bridge house straddling the deck on one side, with windows and twin funnels
  b.orientedBox(WIDTH / 2 - 2.2, 4.6, 0, 3.6, 4.8, 12, 0, white);
  b.orientedBox(WIDTH / 2 - 2.2, 6.2, 0, 3.7, 0.9, 12.1, 0, dark);
  for (const z of [-3, 3]) {
    b.orientedBox(WIDTH / 2 - 2.2, 8.4, z, 1.4, 2.2, 1.4, 0, white);
    b.orientedBox(WIDTH / 2 - 2.2, 9.6, z, 1.45, 0.6, 1.45, 0, red);
  }
  return b;
}

export function createCarFerry(group) {
  const mesh = buildFerry().toMesh(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.1 }));
  mesh.rotation.y = Math.PI / 2; // runs east-west
  const holder = new THREE.Group();
  holder.add(mesh);
  holder.name = 'car-ferry';
  group.add(holder);
  const cycle = 2 * (CROSSING + DWELL);
  return (time) => {
    const t = time % cycle;
    // 0..1 along the route from the island to the mainland and back, eased at each end
    let u;
    if (t < DWELL) u = 0;
    else if (t < DWELL + CROSSING) u = (t - DWELL) / CROSSING;
    else if (t < 2 * DWELL + CROSSING) u = 1;
    else u = 1 - (t - 2 * DWELL - CROSSING) / CROSSING;
    const s = u * u * (3 - 2 * u);
    holder.position.set(ISLAND_END + (MAINLAND_END - ISLAND_END) * s, -0.9 + Math.sin(time * 0.9) * 0.08, ROUTE_Z);
    holder.rotation.z = Math.sin(time * 0.7) * 0.012;
  };
}
