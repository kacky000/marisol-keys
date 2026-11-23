// Sidewalk furniture: street lamps, palm-lined boulevards, benches, bins, hydrants and bus shelters.

import * as THREE from 'three';
import { MeshBatch, tint } from '../core/meshBatch.js';
import { nodes, edges } from '../roads/roadNetwork.js';
import { ROAD_HALF, BLOCK, blockLetter } from '../world/cityPlan.js';
import { WALK_Y } from '../world/terrain.js';
import { addCollider } from '../world/collisionWorld.js';
import { hash2 } from '../core/rng.js';

export const lampHeads = [];   // world positions of lamp bulbs (night glow)

const PALM_AVENUES = new Set([10, 12]);
const PALM_STREETS = new Set([4, 9]);

export function buildStreetFurniture(kit) {
  const poles = kit.trim;
  for (const e of edges) {
    if (e.kind !== 'street') continue;
    const a = nodes.get(e.a), b = nodes.get(e.b);
    const ux = (b.x - a.x) / e.len, uz = (b.z - a.z) / e.len;
    const rx = -uz, rz = ux;
    const vertical = Math.abs(uz) > 0.5;
    const lineIndex = vertical ? Math.round(a.x / BLOCK) : Math.round(a.z / BLOCK);
    const palmRow = vertical ? PALM_AVENUES.has(lineIndex) : PALM_STREETS.has(lineIndex);
    for (const side of [-1, 1]) {
      // only furnish sides that have a sidewalk (land block on that side)
      const px = (a.x + b.x) / 2 + rx * side * (ROAD_HALF + 2), pz = (a.z + b.z) / 2 + rz * side * (ROAD_HALF + 2);
      const bl = blockLetter(Math.floor(px / BLOCK), Math.floor(pz / BLOCK));
      if (bl === '~') continue;
      if (bl === 'S') {
        for (let s = 14; s < e.len - 12; s += 11) kit.palms.push({ x: a.x + ux * s + rx * side * (ROAD_HALF + 2.2), z: a.z + uz * s + rz * side * (ROAD_HALF + 2.2), h: 10 + hash2(s, lineIndex) * 4, lean: 0.3 });
        continue;
      }
      for (let s = 16; s < e.len - 14; s += 24) {
        const x = a.x + ux * s + rx * side * (ROAD_HALF + 0.9), z = a.z + uz * s + rz * side * (ROAD_HALF + 0.9);
        poles.box(x, WALK_Y, z, 0.25, 7.5, 0.25, tint('#5d6066'));
        const hx = x - rx * side * 1.6, hz = z - rz * side * 1.6;
        poles.box((x + hx) / 2, WALK_Y + 7.3, (z + hz) / 2, Math.abs(hx - x) + 0.2, 0.18, Math.abs(hz - z) + 0.2, tint('#5d6066'));
        kit.glow.box(hx, WALK_Y + 7.0, hz, 0.7, 0.25, 0.7, tint('#fff2c8'));
        lampHeads.push(new THREE.Vector3(hx, WALK_Y + 6.9, hz));
        addCollider(x - 0.2, z - 0.2, x + 0.2, z + 0.2, 7.5, -5, 'lamp');
      }
      if (palmRow) {
        for (let s = 12; s < e.len - 10; s += 12) {
          kit.palms.push({ x: a.x + ux * s + rx * side * (ROAD_HALF + 2.4), z: a.z + uz * s + rz * side * (ROAD_HALF + 2.4), h: 11 + hash2(s, side) * 4, lean: 0.15 });
        }
      }
      // benches, bins and the odd bus shelter
      const r = hash2(Math.round(px), Math.round(pz), 3);
      const bx = px + rx * side * 1.2, bz = pz + rz * side * 1.2;
      if (r < 0.25) {
        // bus shelter
        const yaw = Math.atan2(rx * side, rz * side);
        poles.orientedBox(bx, WALK_Y + 2.6, bz, 5, 0.15, 1.8, yaw, tint('#2f8f83'));
        poles.orientedBox(bx - rx * side * 0.8, WALK_Y + 1.3, bz - rz * side * 0.8, 5, 2.5, 0.1, yaw, tint('#bfe6f0'));
        kit.signs.push({ x: bx - rx * side * 0.74, y: WALK_Y + 1.1, z: bz - rz * side * 0.74, yaw: Math.atan2(rx * side, rz * side), w: 2.6, h: 1.2, brand: r < 0.12 ? 'MANGO BAY COLA' : 'SUNWAKE · ROOMS FROM $89' });
        addCollider(bx - 1.2, bz - 1.2, bx + 1.2, bz + 1.2, 2.6, -5, 'shelter');
      } else if (r < 0.6) {
        const yaw = Math.atan2(rx * side, rz * side);
        poles.orientedBox(bx, WALK_Y + 0.45, bz, 2.2, 0.12, 0.6, yaw, tint('#a0663c'));
        poles.orientedBox(bx, WALK_Y + 0.2, bz, 2.0, 0.4, 0.1, yaw, tint('#444'));
        poles.box(bx + ux * 2.2, WALK_Y, bz + uz * 2.2, 0.6, 0.9, 0.6, tint('#2e5e4e'));
      } else {
        poles.box(bx, WALK_Y, bz, 0.35, 0.7, 0.35, tint('#e0402e'));
      }
    }
  }
}
