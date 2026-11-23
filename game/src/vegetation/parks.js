// Seagrape Park: lawns crossed by paths, a tiled fountain, flowering shrubs and a palm grove.

import { tint } from '../core/meshBatch.js';
import { WALK_Y } from '../world/terrain.js';
import { addCollider } from '../world/collisionWorld.js';
import { nearRampLane } from '../activities/stuntJumps.js';
import { nearDealerLot } from '../economy/carDealer.js';

const FLOWERS = ['#ff5d8f', '#ffb703', '#f15bb5', '#ffffff', '#e76f51'];

export function buildParkBlock(kit, block, rng) {
  const { ix0, iz0, ix1, iz1, cx, cz } = block;
  const y = WALK_Y + 0.02;
  kit.trim.box(cx, WALK_Y, cz, ix1 - ix0, 0.04, 3.2, tint('#e6d5b8'));
  kit.trim.box(cx, WALK_Y, cz, 3.2, 0.04, iz1 - iz0, tint('#e6d5b8'));
  // fountain
  kit.trim.box(cx, y, cz, 9, 0.7, 9, tint('#f0e6d8'));
  kit.glow.box(cx, y + 0.7, cz, 8, 0.02, 8, tint('#4fd6e8'));
  kit.trim.box(cx, y, cz, 1.2, 2.6, 1.2, tint('#f0e6d8'));
  kit.trim.box(cx, y + 2.6, cz, 3, 0.3, 3, tint('#f0e6d8'));
  addCollider(cx - 4.5, cz - 4.5, cx + 4.5, cz + 4.5, 0.9);
  // shrubs and flower beds in each quadrant
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const qx = cx + sx * 11, qz = cz + sz * 11;
    for (let k = 0; k < 5; k++) {
      const bx = qx + rng.range(-6, 6), bz = qz + rng.range(-6, 6);
      if (nearRampLane(bx, bz) || nearDealerLot(bx, bz)) continue;
      kit.shrubs.push({ x: bx, z: bz, y, size: rng.range(0.9, 1.5), flowering: rng.chance(0.4) });
    }
    const tx = qx + rng.range(-4, 4), tz = qz + rng.range(-4, 4);
    if (!nearRampLane(tx, tz) && !nearDealerLot(tx, tz)) kit.trees.push({ x: tx, z: tz, y, size: rng.range(1.1, 1.5), flowering: rng.chance(0.35) });
    void FLOWERS;
    for (let k = 0; k < 2; k++) {
      const px = qx + rng.range(-7, 7), pz = qz + rng.range(-7, 7);
      if (!nearRampLane(px, pz) && !nearDealerLot(px, pz)) kit.palms.push({ x: px, z: pz, h: rng.range(9, 14), lean: rng.range(-0.3, 0.3) });
    }
  }
}
