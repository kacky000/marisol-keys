// Saltgate Harbor: warehouses, stacked shipping containers, gantry cranes on the quay and
// mooring bollards. Containers are instanced and double as cover in gunfights.

import * as THREE from 'three';
import { addBlockBuilding, addSign } from './buildingKit.js';
import { tint } from '../core/meshBatch.js';
import { WALK_Y } from '../world/terrain.js';
import { addCollider } from '../world/collisionWorld.js';
import { blockLetter } from '../world/cityPlan.js';
import { canvasTexture, grain } from '../core/canvasTexture.js';

const CONTAINER_COLORS = ['#c8432f', '#2f6db3', '#e0a12a', '#2e8b6a', '#d9d4c7', '#7a3f8f', '#e26a2c', '#3c9fb8'];
export const containers = [];   // { x, y, z, yaw, color }
export const cranes = [];       // { x, z, yaw }

export function buildHarborBlock(kit, block, rng) {
  const { ix0, iz0, ix1, iz1, cx, cz } = block;
  const waterSouth = blockLetter(block.i, block.j + 1) === '~';
  const waterWest = blockLetter(block.i - 1, block.j) === '~';
  if (rng.chance(0.35) && !waterSouth) {
    addBlockBuilding(kit, 'warehouse', cx, cz, ix1 - ix0 - 6, iz1 - iz0 - 10, rng.range(9, 13), rng.pick(['#dfe6ea', '#e8e0d0', '#cfd9d0']));
    addSign(kit, cx, cz, ix1 - ix0 - 6, iz1 - iz0 - 10, WALK_Y + 7, 'n', rng.pick(['SALTGATE FREIGHT', 'BRAVO LOGISTICS', 'KESTREL MOTORS']), 12, 2);
    return;
  }
  // container stacks in rows with forklift aisles
  for (let row = 0; row < 3; row++) {
    const z = iz0 + 5 + row * 12;
    for (let x = ix0 + 4; x < ix1 - 6; x += 7.5) {
      if (rng.chance(0.18)) continue;
      const stack = rng.int(1, 3);
      for (let s = 0; s < stack; s++) containers.push({ x, y: WALK_Y + s * 2.6, z, yaw: Math.PI / 2, color: rng.pick(CONTAINER_COLORS) });
      addCollider(x - 1.25, z - 6.1, x + 1.25, z + 6.1, WALK_Y + stack * 2.6, -5, 'container');
    }
  }
  if (waterSouth) {
    for (const x of [ix0 + 8, ix1 - 8]) cranes.push({ x, z: block.z1 + 2, yaw: 0 });
    for (let x = ix0; x < ix1; x += 8) kit.trim.box(x, WALK_Y, block.z1 - 7.6, 0.6, 0.7, 0.6, tint('#2b2b2b'));
  } else if (waterWest) {
    cranes.push({ x: block.x0 - 2, z: cz, yaw: Math.PI / 2 });
  }
}

function containerTexture() {
  return canvasTexture(256, 128, (g, w, h, rng) => {
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 6) { g.fillStyle = x % 12 ? '#d6d6d6' : '#f4f4f4'; g.fillRect(x, 6, 4, h - 12); }
    g.fillStyle = '#8a8a8a';
    g.fillRect(0, 0, w, 6); g.fillRect(0, h - 6, w, 6);
    g.fillStyle = 'rgba(0,0,0,0.35)';
    g.font = 'bold 22px Arial';
    g.fillText(rng.pick(['SALTGATE', 'BRAVO', 'MERIDIAN', 'ORCA LINE']), 20, 52);
    grain(g, w, h, rng, 18);
  }, { seed: 41 });
}

// Gantry crane: four legs, a boom reaching over the water, a trolley and a cab.
function addCrane(batch, { x, z, yaw }) {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  const P = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
  const red = tint('#d8442f'), white = tint('#f3f1ea'), dark = tint('#333');
  for (const [lx, lz] of [[-7, -5], [7, -5], [-7, 9], [7, 9]]) {
    const [px, pz] = P(lx, lz);
    batch.orientedBox(px, 18, pz, 1.4, 36, 1.4, yaw, (lz < 0) ? red : white);
  }
  for (const lz of [-5, 9]) { const [px, pz] = P(0, lz); batch.orientedBox(px, 34, pz, 15.5, 1.6, 1.6, yaw, red); }
  for (const lx of [-7, 7]) { const [px, pz] = P(lx, 2); batch.orientedBox(px, 30, pz, 1.2, 1.2, 15, yaw, white); }
  const [bx, bz] = P(0, 14);
  batch.orientedBox(bx, 36, bz, 4, 2.2, 52, yaw, red);
  const [tx, tz] = P(0, 22);
  batch.orientedBox(tx, 33.5, tz, 3.4, 2.6, 4, yaw, dark);
  const [cx2, cz2] = P(0, -3);
  batch.orientedBox(cx2, 31.5, cz2, 3, 2.6, 3, yaw, white);
  const [hx, hz] = P(0, 22);
  batch.orientedBox(hx, 24, hz, 0.15, 16, 0.15, yaw, dark);
  for (const [lx, lz] of [[-7, -5], [7, -5], [-7, 9], [7, 9]]) {
    const [px, pz] = P(lx, lz);
    addCollider(px - 0.8, pz - 0.8, px + 0.8, pz + 0.8, 36, -5, 'crane');
  }
}

export function buildHarborMeshes(group, craneBatch) {
  for (const cr of cranes) addCrane(craneBatch, cr);
  if (!containers.length) return;
  const geo = new THREE.BoxGeometry(2.5, 2.6, 12.2);
  geo.translate(0, 1.3, 0);
  const mat = new THREE.MeshStandardMaterial({ map: containerTexture(), roughness: 0.75, metalness: 0.2 });
  const inst = new THREE.InstancedMesh(geo, mat, containers.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
  containers.forEach((c, k) => {
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), c.yaw);
    m.compose(v.set(c.x, c.y, c.z), q, one);
    inst.setMatrixAt(k, m);
    inst.setColorAt(k, new THREE.Color(c.color));
  });
  inst.castShadow = inst.receiveShadow = true;
  group.add(inst);
}
