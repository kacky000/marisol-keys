// A* over the road graph: used by police pursuit drivers and the minimap GPS route to the waypoint.

import { nodes } from './roadNetwork.js';

export function nearestNode(x, z) {
  let best = null, bd = Infinity;
  for (const n of nodes.values()) {
    const d = (n.x - x) ** 2 + (n.z - z) ** 2;
    if (d < bd) { bd = d; best = n; }
  }
  return best;
}

export function planRoute(fromX, fromZ, toX, toZ) {
  const start = nearestNode(fromX, fromZ), goal = nearestNode(toX, toZ);
  if (!start || !goal) return [];
  const open = new Map([[start.id, { n: start, g: 0, f: 0, prev: null }]]);
  const closed = new Map();
  const h = (n) => Math.abs(n.x - goal.x) + Math.abs(n.z - goal.z);
  while (open.size) {
    let cur = null;
    for (const rec of open.values()) if (!cur || rec.f < cur.f) cur = rec;
    open.delete(cur.n.id);
    closed.set(cur.n.id, cur);
    if (cur.n === goal) break;
    for (const id of cur.n.links) {
      if (closed.has(id)) continue;
      const nb = nodes.get(id);
      const g = cur.g + Math.hypot(nb.x - cur.n.x, nb.z - cur.n.z);
      const old = open.get(id);
      if (!old || g < old.g) open.set(id, { n: nb, g, f: g + h(nb), prev: cur });
    }
  }
  const end = closed.get(goal.id);
  if (!end) return [];
  const path = [];
  for (let r = end; r; r = r.prev) path.push(r.n);
  return path.reverse();
}
