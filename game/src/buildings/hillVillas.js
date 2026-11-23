// Mirador Hills: white modernist villas with terracotta roofs, infinity pools, hedges and palms,
// stepped on terraces that climb toward the hills behind.

import { addBlockBuilding } from './buildingKit.js';
import { tint } from '../core/meshBatch.js';
import { WALK_Y } from '../world/terrain.js';
import { addCollider } from '../world/collisionWorld.js';

export function buildVillaBlock(kit, block, rng) {
  const { ix0, iz0, ix1, iz1, cx, cz } = block;
  const terrace = Math.max(0, (5 - block.j)) * 0.6;
  // a low stone retaining wall and lawn terrace, stepping up toward the hills
  if (terrace > 0) {
    kit.trim.box(cx, WALK_Y, cz, ix1 - ix0, terrace, iz1 - iz0, tint('#cdb48c'), { top: false });
    kit.trim.box(cx, WALK_Y + terrace, cz, ix1 - ix0 + 0.3, 0.18, iz1 - iz0 + 0.3, tint('#efe4cf'), { top: false });
    kit.trim.box(cx, WALK_Y + terrace - 0.01, cz, ix1 - ix0, 0.02, iz1 - iz0, tint('#7dbb5c'));
    addCollider(ix0, iz0, ix1, iz1, WALK_Y + terrace);
  }
  const y0 = WALK_Y + terrace;
  const n = rng.int(1, 2);
  for (let k = 0; k < n; k++) {
    const vx = n === 1 ? cx : cx + (k ? 10 : -10), vz = cz - 4;
    const w = n === 1 ? rng.range(18, 24) : 15, d = rng.range(11, 14);
    const top = addBlockBuilding(kit, 'villa', vx, vz, w, d, 4, '#ffffff', { y0, roof: false });
    kit.roof.pyramid(vx, top, vz, w + 1.6, d + 1.6, 2.2, tint('#c8603f'));
    const ux = vx + rng.range(-3, 3);
    const t2 = addBlockBuilding(kit, 'villa', ux, vz - 1, w * 0.6, d * 0.7, 3.6, '#fbfbfb', { y0: top, roof: false, collide: false });
    kit.roof.pyramid(ux, t2, vz - 1, w * 0.6 + 1.4, d * 0.7 + 1.4, 1.8, tint('#bd5a3b'));
    // pool deck and pool in front
    kit.trim.box(vx, y0, vz + d / 2 + 4, w * 0.8, 0.3, 6, tint('#efe6d6'));
    kit.glow.box(vx, y0 + 0.31, vz + d / 2 + 4, w * 0.7, 0.02, 4.4, tint('#3fd0e8'));
    kit.palms.push({ x: vx - w / 2 - 2, z: vz + d / 2 + 3, h: rng.range(10, 13), lean: 0.25, y: y0 }, { x: vx + w / 2 + 2, z: vz - d / 2, h: rng.range(9, 12), lean: -0.2, y: y0 });
  }
  // hedge walls along the street, a shade tree and flowering shrubs in the garden
  kit.trim.box(cx, y0, iz1 - 0.8, ix1 - ix0 - 6, 1.4, 1.2, tint('#3f7f3a'));
  kit.trees.push({ x: ix0 + 5 + rng.range(0, 4), z: iz1 - 6, y: y0, size: rng.range(1.2, 1.6), flowering: rng.chance(0.5) });
  for (let k = 0; k < 4; k++) kit.shrubs.push({ x: rng.range(ix0 + 3, ix1 - 3), z: iz1 - rng.range(3, 5), y: y0, size: rng.range(0.8, 1.2), flowering: rng.chance(0.5) });
}

// The green hills rising north of the villas, a backdrop for the skyline.
export function buildHills(batch) {
  const green = tint('#6d9a4f'), dry = tint('#a89a62');
  const peaks = [[200, -90, 120, 60], [300, -140, 160, 90], [420, -110, 140, 70], [120, -60, 90, 40], [540, -170, 200, 110], [700, -150, 160, 75]];
  for (const [x, z, r, h] of peaks) {
    const seg = 10;
    for (let k = 0; k < seg; k++) {
      const a0 = (k / seg) * Math.PI * 2, a1 = ((k + 1) / seg) * Math.PI * 2;
      const p0 = [x + Math.cos(a0) * r, -2, z + Math.sin(a0) * r];
      const p1 = [x + Math.cos(a1) * r, -2, z + Math.sin(a1) * r];
      const apex = [x, h, z];
      const nx = Math.cos((a0 + a1) / 2), nz = Math.sin((a0 + a1) / 2);
      batch.quad(p1, p0, apex, apex, [nx * 0.6, 0.8, nz * 0.6], [[0, 0], [1, 0], [0.5, 1], [0.5, 1]], k % 3 === 0 ? dry : green);
    }
  }
}
