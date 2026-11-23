// Free-standing monument signs on the sidewalk for civic places: Sunwake Medical, where the wasted
// wake up, and the MKPD Glasswater Precinct, where the busted are let go.

import { tint } from '../core/meshBatch.js';
import { addCollider } from '../world/collisionWorld.js';
import { WALK_Y } from '../world/terrain.js';

const B = 64;
export const RESPAWN = {
  hospital: { x: 11 * B - 9.5, z: 7 * B + 26, label: 'Sunwake Medical' },
  precinct: { x: 8 * B - 9.5, z: 4 * B + 26, label: 'MKPD Glasswater Precinct' },
};

function monument(kit, x, z, yaw, brand, accent) {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  kit.trim.orientedBox(x, WALK_Y + 0.3, z, 4.6, 0.6, 0.9, yaw, tint('#efe9dd'));
  for (const side of [-1, 1]) kit.trim.orientedBox(x + side * 2.1 * c, WALK_Y + 1.6, z - side * 2.1 * s, 0.3, 2.6, 0.5, yaw, tint('#efe9dd'));
  kit.trim.orientedBox(x, WALK_Y + 2.95, z, 4.6, 0.2, 0.6, yaw, tint(accent));
  kit.signs.push({ x: x + s * 0.27, y: WALK_Y + 1.0, z: z + c * 0.27, yaw, w: 3.8, h: 1.6, brand });
  kit.signs.push({ x: x - s * 0.27, y: WALK_Y + 1.0, z: z - c * 0.27, yaw: yaw + Math.PI, w: 3.8, h: 1.6, brand });
  // footprint: 4.6 m along the facing direction's sides, 0.9 m deep
  const alongX = Math.abs(c) > 0.5;
  addCollider(x - (alongX ? 2.3 : 0.5), z - (alongX ? 0.5 : 2.3), x + (alongX ? 2.3 : 0.5), z + (alongX ? 0.5 : 2.3), WALK_Y + 3);
}

export function buildLandmarkSigns(kit) {
  // stand them just up the sidewalk from the respawn spot, against the building line, facing the street
  const hx = RESPAWN.hospital.x - 0.9, hz = RESPAWN.hospital.z - 8;
  monument(kit, hx, hz, Math.PI / 2, 'SUNWAKE MEDICAL', '#ff4d6d');
  kit.glow.box(hx, WALK_Y + 3.15, hz, 0.3, 1.2, 0.3, tint('#ff3b3b'));
  kit.glow.box(hx, WALK_Y + 3.6, hz, 0.3, 0.3, 1.2, tint('#ff3b3b'));
  monument(kit, RESPAWN.precinct.x - 0.9, RESPAWN.precinct.z - 8, Math.PI / 2, 'MKPD PRECINCT', '#2a5bff');
}
