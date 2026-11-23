// Lantern Canals: narrow, brightly painted canal houses lining a channel, with lantern strings,
// footbridges and moored skiffs.

import { addBlockBuilding, addSign } from './buildingKit.js';
import { tint } from '../core/meshBatch.js';
import { WALK_Y, CANAL_HALF } from '../world/terrain.js';
import { addCollider } from '../world/collisionWorld.js';

const HOUSE = ['#ff9e80', '#ffd166', '#7bd3c4', '#9fb7ff', '#f78fb3', '#c3e88d', '#ffb4a2', '#80c7ff'];

export function buildCanalBlock(kit, block, rng) {
  const { iz0, iz1, cx } = block;
  const bankW = 12;
  for (const side of [-1, 1]) {
    const x = cx + side * (CANAL_HALF + 1.2 + bankW / 2);
    let z = iz0;
    while (z < iz1 - 4) {
      const w = Math.min(rng.range(6, 9), iz1 - z);
      const h = rng.range(7, 12);
      const color = rng.pick(HOUSE);
      const top = addBlockBuilding(kit, 'stucco', x, z + w / 2, bankW, w - 0.4, h, color);
      kit.roof.pyramid(x, top + 0.05, z + w / 2, bankW + 0.6, w + 0.2, 2.6, tint(rng.pick(['#c8553d', '#b5653f', '#d07a52'])));
      z += w;
    }
    // canal-side quay rail
    kit.trim.box(cx + side * (CANAL_HALF + 0.15), WALK_Y, block.cz, 0.15, 0.9, iz1 - iz0 - 2, tint('#3b3b40'));
  }
  // footbridge across the middle
  kit.trim.box(cx, WALK_Y + 0.4, block.cz, CANAL_HALF * 2 + 2, 0.35, 3, tint('#c98e5c'));
  for (const s of [-1, 1]) kit.trim.box(cx, WALK_Y + 0.75, block.cz + s * 1.4, CANAL_HALF * 2 + 2, 0.8, 0.12, tint('#7a5236'));
  addCollider(cx - CANAL_HALF - 1, block.cz - 1.5, cx + CANAL_HALF + 1, block.cz + 1.5, 0.6, -5, 'bridge');
  // lantern strings across the canal
  for (let z = iz0 + 6; z < iz1 - 4; z += 9) {
    kit.trim.box(cx, WALK_Y + 6, z, CANAL_HALF * 2 + 2.4, 0.05, 0.05, tint('#222222'));
    for (let x = -CANAL_HALF; x <= CANAL_HALF; x += 2.5) kit.glow.box(cx + x, WALK_Y + 5.6, z, 0.45, 0.45, 0.45, tint(rng.pick(['#ffcf6b', '#ff7b5c', '#7fffd4'])));
  }
  // skiffs moored in the channel
  for (let k = 0; k < 2; k++) {
    const z = iz0 + 5 + k * 18 + rng.range(0, 4);
    const x = cx + (k % 2 ? 2.6 : -2.6);
    kit.trim.box(x, -0.65, z, 1.6, 0.6, 5, tint(rng.pick(['#ffffff', '#ffd9a0', '#bfe8ff'])));
    kit.trim.box(x, -0.06, z, 1.7, 0.12, 5.1, tint('#e04f3c'));
  }
  if (block.j === 7) addSign(kit, cx + CANAL_HALF + 1.2 + bankW / 2, iz0 + 4, bankW, 6, WALK_Y + 3.4, 'w', 'STATIC 88 FM', 6, 1.4);
}
