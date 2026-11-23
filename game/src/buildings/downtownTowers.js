// Glasswater: glass towers on podiums with setbacks, crowns and spires, tallest at the core.

import { addBlockBuilding, addSign, streetSide } from './buildingKit.js';
import { tint } from '../core/meshBatch.js';
import { WALK_Y } from '../world/terrain.js';

const GLASS_TINTS = ['#c6e2ff', '#dff3ff', '#ffe6c8', '#cdeee6', '#e4dcff', '#bfd8f0', '#f4f0ff'];
const PODIUM_TINTS = ['#efe6da', '#e4ddd2', '#f3ece4', '#dfe3e6'];
const TOWER_BRANDS = ['GLASSWATER TRUST', 'PALMETTO BANK', 'HALCYON PLAZA', 'MERIDIAN AIR', 'SUNWAKE HOTEL', 'ORCA MEDIA'];

function tower(kit, block, cx, cz, w, d, h, rng) {
  const glass = rng.pick(GLASS_TINTS);
  const podium = rng.pick(PODIUM_TINTS);
  const podH = 7;
  addBlockBuilding(kit, 'stucco', cx, cz, w + 4, d + 4, podH, podium);
  // storefront glow band and canopy
  kit.trim.box(cx, WALK_Y + podH - 0.8, cz, w + 5, 0.5, d + 5, tint('#3a3f48'));
  let y = WALK_Y + podH;
  let sw = w, sd = d;
  const segments = h > 80 ? 3 : 2;
  const segH = (h - podH) / segments;
  for (let s = 0; s < segments; s++) {
    const top = addBlockBuilding(kit, 'glass', cx, cz, sw, sd, segH, glass, { y0: y, roof: s === segments - 1, uOffset: s * 0.37 });
    // white spandrel fins at the corners
    for (const [fx, fz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) kit.trim.box(cx + fx * sw / 2, y, cz + fz * sd / 2, 0.8, segH, 0.8, tint('#f2f2f0'));
    kit.trim.box(cx, top - 0.4, cz, sw + 0.8, 0.8, sd + 0.8, tint('#eef0f2'));
    y = top;
    sw = Math.max(8, sw - rng.range(2.5, 6));
    sd = Math.max(8, sd - rng.range(2.5, 6));
  }
  // crown
  if (h > 95) {
    kit.trim.box(cx, y, cz, sw * 0.7, 6, sd * 0.7, tint(glass));
    kit.trim.box(cx, y + 6, cz, 0.7, 22, 0.7, tint('#f0f0f0'));
    kit.glow.box(cx, y + 27.5, cz, 1.0, 1.0, 1.0, tint('#ff3030'));
  } else if (rng.chance(0.5)) {
    kit.trim.box(cx, y, cz, sw * 0.55, 0.3, sd * 0.55, tint('#2f6b4f'));
    kit.glow.box(cx, y + 0.3, cz, sw * 0.4, 0.05, 0.4, tint('#ffd34d'));
  }
  kit.tallest.push({ x: cx, z: cz, h: y });
  const side = streetSide(block, cx, cz);
  addSign(kit, cx, cz, w + 4, d + 4, WALK_Y + 4.6, side, rng.pick(TOWER_BRANDS), Math.min(14, w), 2.2);
  if (h > 70 && rng.chance(0.7)) addSign(kit, cx, cz, w, d, WALK_Y + h - 6, side, rng.pick(TOWER_BRANDS), Math.min(16, w * 0.9), 3);
}

export function buildDowntownBlock(kit, block, rng) {
  const coreDist = Math.hypot(block.i - 7, block.j - 4);
  const base = 150 - coreDist * 26;
  const w = block.ix1 - block.ix0, d = block.iz1 - block.iz0;
  const layout = rng.int(0, 2);
  if (layout === 0) {
    tower(kit, block, block.cx, block.cz, w - 8, d - 8, Math.max(45, base + rng.range(-10, 20)), rng);
  } else if (layout === 1) {
    const hw = (w - 6) / 2;
    tower(kit, block, block.ix0 + 2 + hw / 2, block.cz, hw - 4, d - 8, Math.max(40, base + rng.range(-25, 10)), rng);
    tower(kit, block, block.ix1 - 2 - hw / 2, block.cz, hw - 4, d - 8, Math.max(35, base * 0.7 + rng.range(-10, 10)), rng);
  } else {
    const q = (w - 6) / 2;
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      tower(kit, block, block.cx + sx * (q / 2 + 1.5), block.cz + sz * (q / 2 + 1.5), q - 4, q - 4, Math.max(28, base * rng.range(0.4, 0.9)), rng);
    }
  }
}
