// The island's edge: a stone seawall with a capstone wherever a street runs along open water,
// white railings on the promenades, mooring bollards on the harbor quays, and riprap boulders
// piled in the shallows below. The wall stops short of every causeway mouth and inside corner.

import { tint } from '../core/meshBatch.js';
import { nodes, edges } from '../roads/roadNetwork.js';
import { ROAD_HALF, BLOCK, blockLetter } from '../world/cityPlan.js';
import { addCollider } from '../world/collisionWorld.js';
import { hash2 } from '../core/rng.js';

const STONE = tint('#c9bfae'), CAP = tint('#eee7da'), RAIL = tint('#f4f1ea'), ROCK = tint('#8c857a'), BOLLARD = tint('#2b2b2b');

function roadTowardWater(node, wx, wz) {
  return node.links.some((id) => {
    const o = nodes.get(id);
    const dx = o.x - node.x, dz = o.z - node.z, l = Math.hypot(dx, dz) || 1;
    return (dx * wx + dz * wz) / l > 0.5;
  });
}
const isWater = (x, z) => blockLetter(Math.floor(x / BLOCK), Math.floor(z / BLOCK)) === '~';

export function buildSeawalls(kit) {
  for (const e of edges) {
    if (e.kind !== 'street') continue;
    const a = nodes.get(e.a), b = nodes.get(e.b);
    const ux = (b.x - a.x) / e.len, uz = (b.z - a.z) / e.len;
    const rx = -uz, rz = ux;
    for (const side of [-1, 1]) {
      const probe = ROAD_HALF + 3;
      if (!isWater((a.x + b.x) / 2 + rx * side * probe, (a.z + b.z) / 2 + rz * side * probe)) continue;
      // run of wall in metres from node a: wraps round convex corners, but stops short wherever
      // another road (a causeway or a street at an inside corner) leaves toward the water side
      const s0 = roadTowardWater(a, rx * side, rz * side) ? ROAD_HALF + 0.5 : -ROAD_HALF;
      const s1 = roadTowardWater(b, rx * side, rz * side) ? e.len - ROAD_HALF - 0.5 : e.len + ROAD_HALF;
      const len = s1 - s0, mid = (s0 + s1) / 2;
      const off = ROAD_HALF + 0.45;
      const at = (s, o = off) => ({ x: a.x + ux * s + rx * side * o, z: a.z + uz * s + rz * side * o });
      const c = at(mid);
      const horizontal = Math.abs(ux) > 0.5;
      const w = horizontal ? len : 0.9, d = horizontal ? 0.9 : len;
      kit.trim.box(c.x, -2.4, c.z, w, 2.75, d, STONE);
      kit.trim.box(c.x, 0.35, c.z, w + (horizontal ? 0 : 0.2), 0.22, d + (horizontal ? 0.2 : 0), CAP);
      // harbor quays get bollards; promenades get a railing
      const inland = at(mid, -10);
      const harbor = [-1, 1].some((s) => blockLetter(Math.floor((inland.x + ux * s * 20) / BLOCK), Math.floor((inland.z + uz * s * 20) / BLOCK)) === 'H');
      if (harbor) {
        for (let s = 6; s < e.len; s += 12) { const p = at(s); kit.trim.box(p.x, 0.57, p.z, 0.5, 0.6, 0.5, BOLLARD); }
      } else {
        kit.trim.box(c.x, 1.35, c.z, horizontal ? len : 0.08, 0.08, horizontal ? 0.08 : len, RAIL);
        for (let s = s0; s <= s1; s += 3) { const p = at(s); kit.trim.box(p.x, 0.57, p.z, 0.07, 0.8, 0.07, RAIL); }
        addCollider(c.x - w / 2, c.z - d / 2, c.x + w / 2, c.z + d / 2, 1.4, -5, 'rail');
      }
      // riprap boulders in the water at the foot of the wall
      for (let s = 2; s < e.len; s += 3.2) {
        const h = hash2(Math.round(s * 7), Math.round(c.x + c.z), 11);
        if (h < 0.35) continue;
        const p = at(s, off + 1.4 + h * 2);
        kit.trim.orientedBox(p.x, -0.75, p.z, 1.2 + h, 0.9 + h * 0.6, 1.1 + h * 0.8, h * 3, ROCK);
      }
    }
  }
}
