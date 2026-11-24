// The mainland across the channel, where the causeways land: Port Calloway's ferry quays and
// a low coastal town of warehouses, motels and palms, backed by rolling scrub hills. It is
// scenery seen from the island and the causeways; the ferry ramps are as far as the roads go.

import { MeshBatch, tint } from '../core/meshBatch.js';
import { CAUSEWAYS } from './cityPlan.js';
import { addBillboard } from '../buildings/signage.js';
import { hash2 } from '../core/rng.js';

export const MAINLAND_SHORE = -840;   // x of the mainland waterline
const WEST = -2300, NORTH = -700, SOUTH = 1700;

function hillHeight(x, z) {
  const d = MAINLAND_SHORE - x; // metres inland
  if (d < 120) return 0;
  const roll = Math.sin(z * 0.006) * 18 + Math.sin(z * 0.017 + 1.3) * 9 + Math.sin(x * 0.009) * 7;
  return Math.max(0, Math.min(1, (d - 120) / 380)) * (34 + roll);
}

export function buildMainland(group, kit, THREE) {
  const b = new MeshBatch();
  const sand = tint('#e6d3a3'), scrub = tint('#7c9a55'), olive = tint('#9aa064'), dry = tint('#c2b07a');
  // coastal shelf and beach
  b.box((MAINLAND_SHORE + WEST) / 2, -3, (NORTH + SOUTH) / 2, MAINLAND_SHORE - WEST, 3.35, SOUTH - NORTH, scrub);
  b.box(MAINLAND_SHORE + 14, -3, (NORTH + SOUTH) / 2, 28, 3.32, SOUTH - NORTH, sand);
  // rolling hills inland
  const step = 40;
  for (let z = NORTH; z < SOUTH; z += step) {
    for (let x = WEST; x < MAINLAND_SHORE - 100; x += step) {
      const h00 = hillHeight(x, z), h10 = hillHeight(x + step, z), h01 = hillHeight(x, z + step), h11 = hillHeight(x + step, z + step);
      if (Math.max(h00, h10, h01, h11) < 0.5) continue;
      const avg = (h00 + h10 + h01 + h11) / 4;
      const c = avg > 34 ? dry : hash2(Math.round(x), Math.round(z), 5) > 0.7 ? olive : scrub;
      b.quad([x, h01 + 0.3, z + step], [x + step, h11 + 0.3, z + step], [x + step, h10 + 0.3, z], [x, h00 + 0.3, z], [0, 1, 0], [[0, 0], [1, 0], [1, 1], [0, 1]], c);
    }
  }
  // the coast highway
  b.box(MAINLAND_SHORE - 60, 0.3, (NORTH + SOUTH) / 2, 16, 0.06, SOUTH - NORTH, tint('#3a3d42'));
  for (const cw of CAUSEWAYS) buildLanding(b, kit, cw.z);
  // a water tower over the town
  const tx = MAINLAND_SHORE - 150, tz = 470;
  for (const [dx, dz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) b.box(tx + dx, 0.3, tz + dz, 0.6, 22, 0.6, tint('#8d9aa6'));
  b.cylinder(tx, 22, tz, 6, 7, tint('#e9eef2'), { segments: 14, capColor: tint('#c9d2da') });
  b.pyramid(tx, 29, tz, 12, 12, 3, tint('#c9d2da'));
  const mesh = b.toMesh(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true }));
  mesh.castShadow = false;
  mesh.name = 'mainland';
  group.add(mesh);
  // the town name on the tower, facing the island
  addBillboard(kit, tx + 6.4, 23.5, tz, Math.PI / 2, 'PORT CALLOWAY');
}

// Ferry quay, terminal, a few warehouses and motels and a palm row opposite each causeway ramp.
function buildLanding(b, kit, z) {
  const x = MAINLAND_SHORE;
  const concrete = tint('#cfc8ba'), white = tint('#f1ede4'), roof = tint('#5c6670');
  b.box(x + 10, -3, z, 30, 3.4, 44, concrete);                       // quay apron
  b.box(x - 18, 0.3, z - 8, 22, 7, 16, white);                        // ferry terminal
  b.box(x - 18, 7.3, z - 8, 24, 0.5, 18, tint('#2f9e9a'));            // its teal canopy roof
  b.box(x - 6, 0.3, z + 10, 4, 10, 4, tint('#e4b343'));               // ticket booth tower
  for (let k = 0; k < 4; k++) {
    const wz = z - 110 + k * 70 + (k > 1 ? 40 : 0), wx = x - 32 - (k % 2) * 30;
    const tall = 8 + (hash2(Math.round(wz), 3) * 6);
    const col = [tint('#d9cdb8'), tint('#f2c6a0'), tint('#bcd7d2'), tint('#f0e0a8')][k];
    b.box(wx, 0.3, wz, 26, tall, 18, col);                              // warehouses and motels
    b.box(wx, 0.3 + tall, wz, 27, 0.4, 19, roof);
    if (k % 2) for (let w = 0; w < 5; w++) b.box(wx + 13.05, 2 + (w % 2) * 3, wz - 7 + w * 3.4, 0.05, 1.3, 1.8, tint('#1d2b38'));
  }
  for (let k = -5; k <= 5; k++) kit.palms.push({ x: x - 4 + (k % 2) * 2, z: z + k * 14 + 30, h: 9 + (k & 3), lean: (k % 3) * 0.12, y: 0.3 });
}
