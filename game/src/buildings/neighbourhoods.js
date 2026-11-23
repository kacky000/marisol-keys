// Palmetto Flats and Old Keys: two-to-six storey stucco apartments, corner shops with signs,
// terracotta-roofed houses and backyard palms.

import { addBlockBuilding, addSign, addRooftopClutter, streetSide, addShopfront } from './buildingKit.js';
import { tint } from '../core/meshBatch.js';
import { WALK_Y } from '../world/terrain.js';

const STUCCO = ['#fff3e0', '#ffe2c6', '#f8d7c2', '#e9f3e1', '#dff0f5', '#fbe7a9', '#f6c9b0', '#e6dbf5', '#fde6ef'];
const SHOP_BRANDS = ['BODEGA SOL', 'KEYS LAUNDRY', 'MARLIN DINER', 'SEABREEZE PHARMACY', 'NOVA GELATO', 'PALM CUTS', 'RAYO TACOS', 'CAFE BRISA', 'MANGO BAY COLA', 'TIDAL 101.3'];

function apartment(kit, block, cx, cz, w, d, rng) {
  const tall = block.letter === 'R' && rng.chance(0.25);
  const h = tall ? rng.range(15, 24) : rng.range(6, 13);
  const color = rng.pick(STUCCO);
  const top = addBlockBuilding(kit, 'stucco', cx, cz, w, d, h, color);
  const side = streetSide(block, cx, cz);
  if (!tall && rng.chance(0.4)) {
    kit.roof.pyramid(cx, top + 0.05, cz, w + 1, d + 1, Math.min(w, d) * 0.3, tint('#d0714f'));
  } else {
    addRooftopClutter(kit, cx, cz, w, d, top, rng);
    kit.rooftops.push({ x: cx, y: top, z: cz, w, d });
  }
  // shop sign + awning on the ground floor
  if (rng.chance(0.55)) {
    addShopfront(kit, cx, cz, w, d);
    addSign(kit, cx, cz, w, d, WALK_Y + 3.6, side, rng.pick(SHOP_BRANDS), Math.min(8, (side === 'n' || side === 's' ? w : d) * 0.7), 1.4);
    const along = side === 'n' || side === 's';
    const ax = side === 'e' ? cx + w / 2 + 0.8 : side === 'w' ? cx - w / 2 - 0.8 : cx;
    const az = side === 's' ? cz + d / 2 + 0.8 : side === 'n' ? cz - d / 2 - 0.8 : cz;
    kit.trim.box(ax, WALK_Y + 2.6, az, along ? w * 0.8 : 1.6, 0.2, along ? 1.6 : d * 0.8, tint(rng.pick(['#e0533d', '#2f8f83', '#f2b134', '#3a6fd1'])));
  }
  addBalconies(kit, cx, cz, w, d, h, side, rng);
}

// Street-side balconies on the upper floors: a slab, a white rail and the odd potted plant.
function addBalconies(kit, cx, cz, w, d, h, side, rng) {
  if (h < 7 || rng.chance(0.3)) return;
  const along = side === 'n' || side === 's';
  const face = along ? w : d;
  const bw = Math.min(face * 0.7, 9), depth = 1.1;
  const nx = side === 'e' ? 1 : side === 'w' ? -1 : 0, nz = side === 's' ? 1 : side === 'n' ? -1 : 0;
  const fx = cx + nx * ((along ? d : w) / 2 + depth / 2), fz = cz + nz * ((along ? d : w) / 2 + depth / 2);
  const rail = tint('#f6f3ee'), slab = tint('#e4ddd2');
  for (let y = WALK_Y + 3.4; y < WALK_Y + h - 2; y += 3) {
    kit.trim.box(fx, y, fz, along ? bw : depth, 0.16, along ? depth : bw, slab);
    const ox = fx + nx * (depth / 2 - 0.05), oz = fz + nz * (depth / 2 - 0.05);
    kit.trim.box(ox, y + 0.16, oz, along ? bw : 0.06, 0.9, along ? 0.06 : bw, rail);
    if (rng.chance(0.4)) kit.trim.box(fx + (along ? rng.range(-bw / 3, bw / 3) : 0), y + 0.16, fz + (along ? 0 : rng.range(-bw / 3, bw / 3)), 0.5, 0.8, 0.5, tint(rng.pick(['#3f8a3c', '#5aa04a', '#ff6b8b'])));
  }
}

export function buildNeighbourhoodBlock(kit, block, rng) {
  const { ix0, iz0, ix1, iz1 } = block;
  const cols = rng.int(2, 3), rows = rng.int(2, 3);
  const cw = (ix1 - ix0) / cols, rh = (iz1 - iz0) / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = ix0 + cw * (c + 0.5), cz = iz0 + rh * (r + 0.5);
      const inner = r > 0 && r < rows - 1 && c > 0 && c < cols - 1;
      if (inner || rng.chance(0.12)) {
        // a little garden: a palm or a shade tree with shrubs around it
        if (rng.chance(0.5)) kit.palms.push({ x: cx + rng.range(-3, 3), z: cz + rng.range(-3, 3), h: rng.range(8, 12), lean: rng.range(-0.3, 0.3) });
        else kit.trees.push({ x: cx + rng.range(-2, 2), z: cz + rng.range(-2, 2), size: rng.range(1.2, 1.7), flowering: rng.chance(0.3) });
        for (let k = 0; k < 3; k++) kit.shrubs.push({ x: cx + rng.range(-5, 5), z: cz + rng.range(-5, 5), size: rng.range(0.8, 1.3), flowering: rng.chance(0.35) });
        continue;
      }
      apartment(kit, block, cx, cz, cw - rng.range(1.5, 3.5), rh - rng.range(1.5, 3.5), rng);
    }
  }
}
