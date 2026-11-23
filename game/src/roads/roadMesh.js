// Turns the road graph into geometry: lane-marked street strips, zebra crosswalks at junctions,
// junction squares, the concrete road bed and the causeway bridges with their piers and rails.

import * as THREE from 'three';
import { MeshBatch, tint } from '../core/meshBatch.js';
import { nodes, edges } from './roadNetwork.js';
import { ROAD_HALF, CAUSEWAYS } from '../world/cityPlan.js';
import { addCollider } from '../world/collisionWorld.js';
import { laneTexture, crosswalkTexture, junctionTexture, causewayDeckTexture } from './roadTextures.js';

const ROAD_Y = 0.03;
export const RAMP = 40;
export const roadMaterials = [];   // the weather makes these glossy when the streets are wet   // size of the ferry-ramp plaza at each causeway's mainland end
const CAP = 6;

export function buildRoadMeshes(group) {
  const lanes = new MeshBatch();
  const caps = new MeshBatch();
  const junctions = new MeshBatch();
  const deck = new MeshBatch();
  const bed = new MeshBatch({ tileU: 8, tileV: 8 });
  const white = tint('#ffffff');
  const W = ROAD_HALF * 2;

  for (const e of edges) {
    const a = nodes.get(e.a), b = nodes.get(e.b);
    const ux = (b.x - a.x) / e.len, uz = (b.z - a.z) / e.len;
    const isBridge = e.kind === 'causeway';
    const aIsJunction = !a.id.startsWith('cw');
    const bIsJunction = !b.id.startsWith('cw');
    const sA = aIsJunction ? ROAD_HALF : 0, sB = bIsJunction ? ROAD_HALF : 0;
    const capA = aIsJunction && !isBridge ? CAP : 0, capB = bIsJunction && !isBridge ? CAP : 0;
    const p = (s) => [a.x + ux * s, a.z + uz * s];
    const [m0x, m0z] = p(sA + capA), [m1x, m1z] = p(e.len - sB - capB);
    const target = isBridge ? deck : lanes;
    target.strip(m0x, m0z, m1x, m1z, W, ROAD_Y, white, 0, (e.len - sA - sB - capA - capB) / 28);
    if (capA) { const [o0x, o0z] = p(sA + capA), [o1x, o1z] = p(sA); caps.strip(o0x, o0z, o1x, o1z, W, ROAD_Y, white, 0, 1); }
    if (capB) { const [o0x, o0z] = p(e.len - sB - capB), [o1x, o1z] = p(e.len - sB); caps.strip(o0x, o0z, o1x, o1z, W, ROAD_Y, white, 0, 1); }
    if (!isBridge) {
      const cx = (a.x + b.x) / 2, cz = (a.z + b.z) / 2;
      const horizontal = Math.abs(ux) > 0.5;
      bed.box(cx, -3, cz, horizontal ? e.len + W : W + 0.6, 3.0, horizontal ? W + 0.6 : e.len + W, tint('#8b8579'), { top: false });
    }
  }
  for (const n of nodes.values()) {
    if (n.id.startsWith('cw')) continue;
    junctions.flat(n.x - ROAD_HALF, n.z - ROAD_HALF, n.x + ROAD_HALF, n.z + ROAD_HALF, ROAD_Y, white, { fit: true });
  }

  const mat = (map) => new THREE.MeshStandardMaterial({ map, roughness: 0.92, metalness: 0, vertexColors: true });
  const laneMat = mat(laneTexture());
  for (const [batch, m] of [[lanes, laneMat], [caps, mat(crosswalkTexture())], [junctions, mat(junctionTexture())], [deck, mat(causewayDeckTexture())]]) {
    roadMaterials.push(m);
    const mesh = batch.toMesh(m, { cast: false });
    mesh.name = 'road';
    group.add(mesh);
  }
  group.add(bed.toMesh(new THREE.MeshStandardMaterial({ color: '#9a9284', roughness: 1, vertexColors: true }), { cast: false }));
  buildCausewayStructure(group);
}

// Piers, deck slab and railings under/along the causeway road strips.
function buildCausewayStructure(group) {
  const concrete = new MeshBatch({ tileU: 6, tileV: 6 });
  const rail = new MeshBatch();
  const c = tint('#d8d2c4'), r = tint('#f4f1ea'), stripe = tint('#ff7d5c');
  for (const e of edges) {
    if (e.kind !== 'causeway') continue;
    const len = Math.abs(e.bx - e.ax);
    const x0 = Math.min(e.ax, e.bx), cz = e.az;
    concrete.box(x0 + len / 2, -1.2, cz, len, 1.2, ROAD_HALF * 2 + 1.2, c, { top: false });
    for (let x = x0 + 12; x < x0 + len; x += 24) {
      concrete.box(x, -8, cz, 2.6, 7, 10, c);
    }
    for (const side of [-1, 1]) {
      rail.box(x0 + len / 2, 0, cz + side * (ROAD_HALF + 0.35), len, 0.9, 0.5, r);
      rail.box(x0 + len / 2, 0.9, cz + side * (ROAD_HALF + 0.35), len, 0.12, 0.62, stripe);
    }
  }
  // the mainland ferry ramp at the far end of each causeway: a plaza, bollards and a gantry sign
  for (const cw of CAUSEWAYS) {
    const x = cw.x0 - RAMP / 2;
    concrete.box(x, -3, cw.z, RAMP, 3.02, RAMP, tint('#cfc8ba'));
    for (let k = -RAMP / 2 + 2; k <= RAMP / 2 - 2; k += 4) {
      concrete.box(cw.x0 - RAMP + 0.6, 0, cw.z + k, 0.8, 1.0, 0.8, stripe);
      if (Math.abs(k) > ROAD_HALF + 2) concrete.box(cw.x0 - 0.6, 0, cw.z + k, 0.8, 1.0, 0.8, stripe);
    }
    for (const s of [-1, 1]) concrete.box(x + s * 0, 0, cw.z + s * (RAMP / 2 - 0.5), RAMP, 1.0, 0.6, r);
    concrete.box(x + 6, 0, cw.z - ROAD_HALF - 1, 0.5, 7, 0.5, tint('#5d6066'));
    concrete.box(x + 6, 0, cw.z + ROAD_HALF + 1, 0.5, 7, 0.5, tint('#5d6066'));
    concrete.box(x + 6, 6, cw.z, 0.6, 1.6, ROAD_HALF * 2 + 2.5, tint('#1d6b8a'));
    addCollider(cw.x0 - RAMP - 1, cw.z - RAMP / 2, cw.x0 - RAMP + 1, cw.z + RAMP / 2, 2);
    for (const s of [-1, 1]) addCollider(cw.x0 - RAMP, cw.z + s * (RAMP / 2 - 0.5) - 0.4, cw.x0, cw.z + s * (RAMP / 2 - 0.5) + 0.4, 2);
  }
  group.add(concrete.toMesh(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, vertexColors: true })));
  group.add(rail.toMesh(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6, vertexColors: true })));
}
