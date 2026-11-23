// Pastel Mile: three-to-five storey art-deco hotels and shops in candy pastels, with racing
// stripes, eyebrow awnings, stepped central fins and neon trims.

import { addBlockBuilding, addSign, addRooftopClutter, streetSide, addShopfront } from './buildingKit.js';
import { tint } from '../core/meshBatch.js';
import { WALK_Y } from '../world/terrain.js';
import { addCollider } from '../world/collisionWorld.js';

const PASTELS = ['#ffc2cf', '#b9f0dc', '#fff0a8', '#c7d6ff', '#ffd2a8', '#e5c9ff', '#a8e6f0', '#ffe0ec'];
const ACCENTS = ['#ff6f91', '#19b39b', '#f0a020', '#5b7cff', '#ff8a3d', '#9a5cff', '#1c9fc0'];
const NEON = ['#ff4fa3', '#3dffe0', '#ffe14d', '#7a8bff', '#ff7a3d'];
const BRANDS = ['CASA FLAMINGA', 'THE CORAL ROOM', 'MARLIN DINER', 'SEABREEZE PHARMACY', 'NOVA GELATO', 'VELA CINEMA', 'HOTEL ESMERALDA', 'PELICAN SURF CO', 'TIDAL 101.3', 'MANGO BAY COLA'];

function decoBuilding(kit, block, cx, cz, w, d, rng) {
  const floors = rng.int(3, 5);
  const h = floors * 3.3 + 1;
  const pastel = rng.pick(PASTELS), accent = rng.pick(ACCENTS), neon = rng.pick(NEON);
  const top = addBlockBuilding(kit, 'deco', cx, cz, w, d, h, pastel);
  addShopfront(kit, cx, cz, w, d);
  const side = streetSide(block, cx, cz);
  // racing stripes wrapping the upper floors
  for (let k = 0; k < 3; k++) kit.trim.box(cx, top - 1.6 - k * 0.55, cz, w + 0.25, 0.22, d + 0.25, tint(accent));
  // ground floor awning along the street side
  const along = side === 'n' || side === 's';
  const aw = along ? w * 0.9 : 1.8, ad = along ? 1.8 : d * 0.9;
  const ax = side === 'e' ? cx + w / 2 + 0.9 : side === 'w' ? cx - w / 2 - 0.9 : cx;
  const az = side === 's' ? cz + d / 2 + 0.9 : side === 'n' ? cz - d / 2 - 0.9 : cz;
  kit.trim.box(ax, WALK_Y + 3.0, az, aw, 0.25, ad, tint(accent));
  kit.trim.box(ax, WALK_Y + 3.25, az, aw * (along ? 1 : 0.5), 0.12, ad * (along ? 0.5 : 1), tint('#ffffff'));
  // stepped central fin above the roofline
  const fw = along ? 2.4 : 1.2, fd = along ? 1.2 : 2.4;
  const fx = side === 'e' ? cx + w / 2 - 0.6 : side === 'w' ? cx - w / 2 + 0.6 : cx;
  const fz = side === 's' ? cz + d / 2 - 0.6 : side === 'n' ? cz - d / 2 + 0.6 : cz;
  kit.trim.box(fx, top, fz, fw * 2.2, 2.2, fd * 2.2, tint(pastel));
  kit.trim.box(fx, top + 2.2, fz, fw * 1.4, 2.4, fd * 1.4, tint(pastel));
  kit.trim.box(fx, top + 4.6, fz, fw * 0.7, 2.6, fd * 0.7, tint(accent));
  // neon outline along the roof edge
  kit.glow.box(cx, top + 0.72, cz, w + 0.1, 0.14, d + 0.1, tint(neon));
  addSign(kit, cx, cz, w, d, WALK_Y + 4.6, side, rng.pick(BRANDS), Math.min(10, (along ? w : d) * 0.75), 1.8);
  // street-corner buildings get a rounded deco corner tower with a stepped crown and neon ring
  const sx = Math.sign(cx - block.cx), sz = Math.sign(cz - block.cz);
  if (Math.abs(cx - block.cx) > 9 && Math.abs(cz - block.cz) > 9 && w > 8 && d > 8) {
    const tx = cx + sx * (w / 2 - 2.2), tz = cz + sz * (d / 2 - 2.2);
    const th = top - WALK_Y + 3.5;
    kit.deco.cylinder(tx, WALK_Y, tz, 3.2, th, tint(pastel), { capColor: tint(pastel) });
    kit.trim.cylinder(tx, WALK_Y + th, tz, 2.3, 1.4, tint(accent));
    kit.trim.cylinder(tx, WALK_Y + th + 1.4, tz, 1.3, 1.4, tint(pastel));
    kit.trim.box(tx, WALK_Y + th + 2.8, tz, 0.25, 3.2, 0.25, tint('#f0f0f0'));
    kit.glow.cylinder(tx, top - 0.9, tz, 3.26, 0.22, tint(neon), { cap: false });
    kit.glow.cylinder(tx, WALK_Y + th - 0.4, tz, 3.26, 0.22, tint(neon), { cap: false });
    addCollider(tx - 3.2, tz - 3.2, tx + 3.2, tz + 3.2, WALK_Y + th);
  }
  addRooftopClutter(kit, cx, cz, w, d, top, rng);
  kit.rooftops.push({ x: cx, y: top, z: cz, w, d });
}

// Lines the block's perimeter with 2-3 buildings per side, leaving a courtyard.
export function buildDecoBlock(kit, block, rng) {
  const { ix0, iz0, ix1, iz1 } = block;
  const depth = 13;
  const W = ix1 - ix0;
  // north and south rows span the full width, east/west fill between them
  for (const [z, s] of [[iz0 + depth / 2, 'n'], [iz1 - depth / 2, 's']]) {
    const n = rng.int(2, 3);
    const seg = W / n;
    for (let k = 0; k < n; k++) decoBuilding(kit, block, ix0 + seg * (k + 0.5), z, seg - 0.6, depth - 0.6, rng);
    void s;
  }
  const midD = iz1 - iz0 - depth * 2;
  for (const x of [ix0 + depth / 2, ix1 - depth / 2]) decoBuilding(kit, block, x, (iz0 + iz1) / 2, depth - 0.6, midD - 0.6, rng);
  // courtyard pool and palms
  kit.trim.box(block.cx, WALK_Y, block.cz, 9, 0.35, 6, tint('#e8e1d4'));
  kit.glow.box(block.cx, WALK_Y + 0.36, block.cz, 8, 0.02, 5, tint('#38c8e0'));
  kit.palms.push({ x: block.cx - 6, z: block.cz - 5, h: 9, lean: 0.2 }, { x: block.cx + 6, z: block.cz + 5, h: 10, lean: -0.2 });
}
