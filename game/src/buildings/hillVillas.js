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

// The Mirador ridge north of the island: a displaced heightfield of rolling hills, green in the
// folds and sun-dried on the crests, speckled with dark scrub.
const PEAKS = [[200, -110, 130, 60], [320, -170, 170, 95], [450, -130, 150, 72], [110, -80, 100, 38], [580, -200, 210, 118], [740, -170, 170, 80], [880, -150, 140, 50], [20, -120, 120, 45]];

function ridgeHeight(x, z) {
  let h = 0;
  for (const [px, pz, r, ph] of PEAKS) {
    const d = Math.hypot(x - px, z - pz) / r;
    if (d < 1.6) h = Math.max(h, ph * Math.exp(-d * d * 1.6));
  }
  // gullies and knobs
  h += Math.sin(x * 0.045) * Math.cos(z * 0.06) * 4 + Math.sin(x * 0.13 + z * 0.09) * 1.5;
  return h - 3;
}

export function buildHills(batch) {
  const green = tint('#5f9446'), dry = tint('#b8a564'), scrub = tint('#3c6b34'), rock = tint('#a08f78');
  const x0 = -260, x1 = 1120, z0 = -420, z1 = -20, step = 14;
  const nx = Math.round((x1 - x0) / step), nz = Math.round((z1 - z0) / step);
  const H = (i, j) => ridgeHeight(x0 + i * step, z0 + j * step);
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const xa = x0 + i * step, xb = xa + step, za = z0 + j * step, zb = za + step;
      const h00 = H(i, j), h10 = H(i + 1, j), h01 = H(i, j + 1), h11 = H(i + 1, j + 1);
      if (Math.max(h00, h10, h01, h11) < -2) continue;
      const avg = (h00 + h10 + h01 + h11) / 4;
      const slope = Math.max(Math.abs(h00 - h11), Math.abs(h10 - h01)) / step;
      const n = ((i * 73856093) ^ (j * 19349663)) >>> 0;
      // dry grass climbs the crests, scrub dots the lower slopes, rock shows on the steep bits
      const c = avg > 48 + (n % 9) ? dry : slope > 1.1 ? rock : n % 11 === 0 ? scrub : green;
      // normal from the cell's two diagonals
      const ux = step, uy = h10 - h00, vz = step, vy = h01 - h00;
      const len = Math.hypot(uy * vz, ux * vz, ux * vy) || 1;
      const nrm = [-uy * vz / len, ux * vz / len, -ux * vy / len];
      batch.quad([xa, h01, zb], [xb, h11, zb], [xb, h10, za], [xa, h00, za], nrm, [[0, 0], [1, 0], [1, 1], [0, 1]], c);
    }
  }
}
