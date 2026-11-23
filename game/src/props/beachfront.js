// Sunwake Beach: the raised boardwalk, striped lifeguard towers, umbrellas and towels, beach huts,
// a volleyball court and the fishing pier reaching into the surf.

import { tint } from '../core/meshBatch.js';
import { BLOCK, ROAD_HALF, eachBlock } from '../world/cityPlan.js';
import { addCollider } from '../world/collisionWorld.js';
import { createRng } from '../core/rng.js';

export const BOARDWALK = { x0: 12 * BLOCK + ROAD_HALF + 0.4, x1: 12 * BLOCK + ROAD_HALF + 10, y: 0.55 };
export const PIER = { z: 7 * BLOCK + 32, x0: 13 * BLOCK - 4, x1: 13 * BLOCK + 70, half: 4 };
const TOWER_COLORS = [['#ff6b5a', '#fff4e0'], ['#19c3b4', '#ffffff'], ['#ffc93c', '#ff6b5a'], ['#7f8cff', '#ffffff'], ['#ff8fb1', '#fff4e0']];
const UMBRELLAS = ['#ff6b5a', '#ffc93c', '#19c3b4', '#ffffff', '#ff8fb1', '#5b7cff'];

export function lifeguardTower(kit, x, z, palette, yaw = Math.PI / 2) {
  const [c1, c2] = palette;
  for (const [lx, lz] of [[-1.2, -1.2], [1.2, -1.2], [1.2, 1.2], [-1.2, 1.2]]) kit.trim.box(x + lx, 0, z + lz, 0.22, 2.6, 0.22, tint('#f4f1ea'));
  kit.trim.box(x, 2.6, z, 3.4, 0.2, 3.4, tint('#f4f1ea'));
  kit.trim.box(x, 2.8, z, 2.8, 1.1, 2.8, tint(c1));
  kit.trim.box(x, 3.9, z, 2.8, 0.5, 2.8, tint(c2));
  kit.trim.box(x, 4.4, z, 2.8, 0.6, 2.8, tint(c1));
  kit.roof.pyramid(x, 5.0, z, 3.8, 3.8, 1.2, tint(c2));
  kit.trim.orientedBox(x - 3, 1.3, z, 4.5, 0.15, 1.2, yaw, tint('#d8c49a'));
  kit.trim.box(x, 5.8, z, 0.08, 2.5, 0.08, tint('#333'));
  kit.glow.box(x + 0.5, 7.6, z, 1.0, 0.6, 0.04, tint(c1));
  addCollider(x - 1.5, z - 1.5, x + 1.5, z + 1.5, 6, -5, 'tower');
}

export function buildBeachfront(kit) {
  const rng = createRng(91);
  const bw = BOARDWALK;
  let towerIndex = 0;
  eachBlock((b) => {
    if (b.letter !== 'S') return;
    // boardwalk deck, posts and rail
    kit.trim.box((bw.x0 + bw.x1) / 2, 0.05, b.cz, bw.x1 - bw.x0, bw.y - 0.05, BLOCK, tint('#b07d52'), { top: false });
    kit.boardwalk.flat(bw.x0, b.z0, bw.x1, b.z1, bw.y, tint('#ffffff'));
    for (let z = b.z0 + 2; z < b.z1; z += 4) kit.trim.box(bw.x1 - 0.1, bw.y, z, 0.18, 1.0, 0.18, tint('#f6efe2'));
    kit.trim.box(bw.x1 - 0.1, bw.y + 1.0, b.cz, 0.14, 0.12, BLOCK, tint('#f6efe2'));
    // lifeguard tower
    const tx = b.x0 + 40, tz = b.z0 + 30;
    // Tower 3 (the story's cooler drop) wears Sunwake's coral stripes
    lifeguardTower(kit, tx, tz, b.j === 9 ? TOWER_COLORS[0] : TOWER_COLORS[1 + (towerIndex++ % (TOWER_COLORS.length - 1))]);
    if (b.j === 9) kit.signs.push({ x: tx - 1.42, y: 3.0, z: tz, yaw: -Math.PI / 2, w: 2.0, h: 0.7, brand: 'TOWER 3' });
    kit.signs.push({ x: tx + 1.42, y: 3.0, z: tz, yaw: Math.PI / 2, w: 2.0, h: 0.7, brand: 'PELICAN SURF CO' });
    // umbrellas with striped towels, loungers, surfboards stuck in the sand, beach balls
    for (let k = 0; k < 10; k++) {
      const ux = b.x0 + rng.range(20, 54), uz = b.z0 + rng.range(4, 60);
      if (Math.abs(uz - tz) < 4 && Math.abs(ux - tx) < 4) continue;
      const col = rng.pick(UMBRELLAS);
      kit.trim.box(ux, 0, uz, 0.08, 2.4, 0.08, tint('#eeeeee'));
      kit.roof.pyramid(ux, 2.0, uz, 2.8, 2.8, 0.7, tint(col));
      const towel = rng.pick(UMBRELLAS);
      for (let s = 0; s < 4; s++) kit.trim.box(ux + 1.2, 0.06, uz - 0.75 + s * 0.5, 1.0, 0.03, 0.5, tint(s % 2 ? '#ffffff' : towel));
      if (rng.chance(0.5)) {
        // a lounger
        kit.trim.orientedBox(ux - 1.4, 0.35, uz, 0.7, 0.08, 1.9, 0, tint('#f4f1ea'));
        kit.trim.orientedBox(ux - 1.4, 0.6, uz - 0.95, 0.7, 0.5, 0.08, 0, tint('#f4f1ea'));
      }
    }
    for (let k = 0; k < 3; k++) {
      const sx = b.x0 + rng.range(46, 58), sz = b.z0 + rng.range(6, 58);
      kit.trim.orientedBox(sx, 1.0, sz, 0.55, 2.1, 0.12, rng.range(-0.3, 0.3), tint(rng.pick(['#ff6b5a', '#19c3b4', '#ffd23f', '#ffffff'])));
    }
    for (let k = 0; k < 2; k++) kit.trim.cylinder(b.x0 + rng.range(24, 50), 0.05, b.z0 + rng.range(6, 58), 0.32, 0.6, tint(rng.pick(['#ff5d8f', '#ffd23f', '#5b7cff'])), { segments: 8 });
    // ice-cream kiosk on the boardwalk
    if (b.j % 3 === 1) {
      const kx = bw.x0 + 5, kz = b.z0 + 44;
      kit.stucco.box(kx, bw.y, kz, 3, 2.4, 2.6, tint('#fff3f8'), { top: false });
      kit.roof.pyramid(kx, bw.y + 2.4, kz, 3.8, 3.4, 0.9, tint('#ff8fb1'));
      for (let s = 0; s < 6; s++) kit.trim.box(kx - 1.3 + s * 0.52, bw.y + 2.15, kz - 1.55, 0.52, 0.3, 0.12, tint(s % 2 ? '#ffffff' : '#ff8fb1'));
      kit.signs.push({ x: kx, y: bw.y + 2.9, z: kz - 1.75, yaw: Math.PI, w: 3.2, h: 0.8, brand: 'NOVA GELATO' });
      addCollider(kx - 1.5, kz - 1.3, kx + 1.5, kz + 1.3, bw.y + 3);
    }
    // beach huts on the inland edge every other block
    if (b.j % 2 === 0) {
      const hx = bw.x1 + 4, hz = b.z0 + 12;
      kit.stucco.box(hx, 0, hz, 4, 3, 4, tint(rng.pick(['#ffd6e0', '#c8f7ea', '#fff3b0'])), { top: false });
      kit.roof.pyramid(hx, 3, hz, 4.8, 4.8, 1.4, tint('#19a3a0'));
      addCollider(hx - 2, hz - 2, hx + 2, hz + 2, 3);
    }
    if (b.j === 9) {
      // volleyball net
      for (const s of [-1, 1]) kit.trim.box(b.x0 + 30, 0, b.cz + s * 5, 0.12, 2.5, 0.12, tint('#ffffff'));
      kit.trim.box(b.x0 + 30, 1.6, b.cz, 0.05, 0.9, 10, tint('#e8e8e8'));
    }
  });
  // the Pelican Surf Shack (a property Tessa can buy): boards racked against a striped hut
  {
    const sx = 12 * BLOCK + 27, sz = 11 * BLOCK + 22;
    kit.stucco.box(sx, 0.05, sz, 5, 3, 4, tint('#c8f7ea'), { top: false });
    kit.roof.pyramid(sx, 3.05, sz, 6, 5, 1.3, tint('#e76f51'));
    kit.signs.push({ x: sx - 2.55, y: 2.2, z: sz, yaw: -Math.PI / 2, w: 3.6, h: 0.8, brand: 'PELICAN SURF CO' });
    for (let k = 0; k < 5; k++) kit.trim.orientedBox(sx + 2.7, 1.1, sz - 1.6 + k * 0.8, 0.12, 2.2, 0.5, 0.15, tint(['#ff6b5a', '#19c3b4', '#ffd23f', '#ffffff', '#5b7cff'][k]));
    addCollider(sx - 2.5, sz - 2, sx + 2.5, sz + 2, 3);
  }
  // the pier
  const p = PIER;
  kit.boardwalk.flat(p.x0, p.z - p.half, p.x1, p.z + p.half, 1.2, tint('#ffffff'));
  kit.trim.box((p.x0 + p.x1) / 2, -2.5, p.z, p.x1 - p.x0, 3.7, p.half * 2, tint('#8a6040'), { top: false });
  for (let x = p.x0; x < p.x1; x += 6) for (const s of [-1, 1]) kit.trim.box(x, -3, p.z + s * (p.half - 0.3), 0.4, 4.2, 0.4, tint('#6e4b30'));
  for (const s of [-1, 1]) {
    kit.trim.box((p.x0 + p.x1) / 2, 1.2, p.z + s * (p.half - 0.1), p.x1 - p.x0, 1.0, 0.12, tint('#f6efe2'));
    addCollider(p.x0, p.z + s * p.half - 0.2, p.x1, p.z + s * p.half + 0.2, 3, -5, 'rail');
  }
  // pier café at the end
  const cx = p.x1 - 8;
  kit.stucco.box(cx, 1.2, p.z, 8, 3.4, 6, tint('#bff0e6'), { top: false });
  kit.roof.pyramid(cx, 4.6, p.z, 9.5, 7.5, 1.6, tint('#ff6b5a'));
  kit.signs.push({ x: cx - 4.05, y: 3.3, z: p.z, yaw: -Math.PI / 2, w: 5, h: 1.1, brand: 'MARLIN DINER' });
  addCollider(cx - 4, p.z - 3, cx + 4, p.z + 3, 6);
}
