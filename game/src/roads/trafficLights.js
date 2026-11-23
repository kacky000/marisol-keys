// Signal poles at every light-controlled junction; one instanced lamp per approach shows the
// live red / amber / green state the traffic AI obeys.

import * as THREE from 'three';
import { tint } from '../core/meshBatch.js';
import { nodes, lightFor, travelAxis } from './roadNetwork.js';
import { ROAD_HALF } from '../world/cityPlan.js';
import { WALK_Y } from '../world/terrain.js';

const COLORS = { green: new THREE.Color('#33ff77'), yellow: new THREE.Color('#ffc21a'), red: new THREE.Color('#ff2a1a') };

export function buildTrafficLights(kit, group) {
  const heads = [];
  for (const n of nodes.values()) {
    if (!n.hasLight) continue;
    for (const fromId of n.links) {
      const a = nodes.get(fromId);
      const len = Math.hypot(n.x - a.x, n.z - a.z);
      const dx = (n.x - a.x) / len, dz = (n.z - a.z) / len;
      const rx = -dz, rz = dx;
      const px = n.x - dx * (ROAD_HALF + 1.2) + rx * (ROAD_HALF + 1.0);
      const pz = n.z - dz * (ROAD_HALF + 1.2) + rz * (ROAD_HALF + 1.0);
      kit.trim.box(px, WALK_Y, pz, 0.22, 5.2, 0.22, tint('#3a3d42'));
      // mast arm reaching over the lanes
      const ax = px - rx * 3.2, az = pz - rz * 3.2;
      kit.trim.box((px + ax) / 2, WALK_Y + 5.0, (pz + az) / 2, Math.abs(ax - px) + 0.16, 0.16, Math.abs(az - pz) + 0.16, tint('#3a3d42'));
      kit.trim.box(ax, WALK_Y + 3.9, az, 0.5, 1.2, 0.5, tint('#222'));
      heads.push({ x: ax - dx * 0.27, z: az - dz * 0.27, node: n, axis: travelAxis(a, n) });
    }
  }
  const geo = new THREE.BoxGeometry(0.34, 0.34, 0.06);
  const mat = new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false });
  const inst = new THREE.InstancedMesh(geo, mat, Math.max(1, heads.length));
  const m = new THREE.Matrix4();
  heads.forEach((h, k) => {
    m.makeRotationY(Math.atan2(h.x - h.node.x, h.z - h.node.z));
    m.setPosition(h.x, WALK_Y + 4.5, h.z);
    inst.setMatrixAt(k, m);
    inst.setColorAt(k, COLORS.red);
  });
  group.add(inst);
  let timer = 0;
  return {
    heads,
    update(dt, time) {
      timer -= dt;
      if (timer > 0) return;
      timer = 0.2;
      heads.forEach((h, k) => inst.setColorAt(k, COLORS[lightFor(h.node, h.axis, time)]));
      inst.instanceColor.needsUpdate = true;
    },
  };
}
