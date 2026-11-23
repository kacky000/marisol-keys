// The drivable road graph derived from the city plan: intersections (nodes), street segments
// (edges), lane geometry for right-hand traffic and the traffic-light cycle at each junction.

import { BLOCK, GRID, CAUSEWAYS, hasHorizontalRoad, hasVerticalRoad } from '../world/cityPlan.js';
import { hash2 } from '../core/rng.js';

export const LANE_OFFSETS = [1.9, 5.1];   // distance of each lane centre from the road centre line
export const STOP_BACK = 9.5;            // stop line distance from the node centre
const LIGHT_GREEN = 11, LIGHT_YELLOW = 2.2;
const LIGHT_CYCLE = (LIGHT_GREEN + LIGHT_YELLOW) * 2;

export const nodes = new Map();
export const edges = [];

const id = (i, j) => `${i},${j}`;

function addNode(key, x, z) {
  if (!nodes.has(key)) nodes.set(key, { id: key, x, z, links: [], hasLight: false, phase: 0 });
  return nodes.get(key);
}

function link(a, b, kind) {
  a.links.push(b.id);
  b.links.push(a.id);
  const len = Math.hypot(b.x - a.x, b.z - a.z);
  edges.push({ a: a.id, b: b.id, ax: a.x, az: a.z, bx: b.x, bz: b.z, len, kind });
}

export function buildRoadNetwork() {
  if (edges.length) return;
  for (let j = 0; j <= GRID; j++) {
    for (let i = 0; i <= GRID; i++) {
      if (i < GRID && hasHorizontalRoad(i, j)) link(addNode(id(i, j), i * BLOCK, j * BLOCK), addNode(id(i + 1, j), (i + 1) * BLOCK, j * BLOCK), 'street');
      if (j < GRID && hasVerticalRoad(i, j)) link(addNode(id(i, j), i * BLOCK, j * BLOCK), addNode(id(i, j + 1), i * BLOCK, (j + 1) * BLOCK), 'street');
    }
  }
  CAUSEWAYS.forEach((c, k) => {
    const end = addNode(`cw${k}`, c.x0, c.z);
    const mid = addNode(`cwm${k}`, (c.x0 + c.x1) / 2, c.z);
    const shore = nodes.get(id(Math.round(c.x1 / BLOCK), Math.round(c.z / BLOCK)));
    link(end, mid, 'causeway');
    link(mid, shore, 'causeway');
  });
  for (const n of nodes.values()) {
    n.hasLight = n.links.length >= 3 && !n.id.startsWith('cw');
    n.phase = hash2(Math.round(n.x), Math.round(n.z), 7) * LIGHT_CYCLE;
  }
}

export const getNode = (key) => nodes.get(key);

// Axis of travel from node a to node b: 'ns' or 'ew'.
export function travelAxis(a, b) {
  return Math.abs(b.x - a.x) > Math.abs(b.z - a.z) ? 'ew' : 'ns';
}

// Light shown to traffic arriving at `node` along `axis` at game time t.
export function lightFor(node, axis, t) {
  if (!node.hasLight) return 'green';
  const c = (t + node.phase) % LIGHT_CYCLE;
  const nsPhase = c < LIGHT_GREEN ? 'green' : c < LIGHT_GREEN + LIGHT_YELLOW ? 'yellow' : 'red';
  const ewPhase = c < LIGHT_GREEN + LIGHT_YELLOW ? 'red' : c < LIGHT_GREEN * 2 + LIGHT_YELLOW ? 'green' : 'yellow';
  return axis === 'ns' ? nsPhase : ewPhase;
}

// Position on lane `lane` travelling from node a to node b at distance s from a.
export function lanePoint(a, b, lane, s) {
  const dx = b.x - a.x, dz = b.z - a.z;
  const len = Math.hypot(dx, dz) || 1;
  const ux = dx / len, uz = dz / len;
  const rx = -uz, rz = ux; // right-hand side of travel
  const off = LANE_OFFSETS[lane];
  return { x: a.x + ux * s + rx * off, z: a.z + uz * s + rz * off, heading: Math.atan2(ux, -uz), len };
}

// Closest point on the road centre lines to (x, z).
export function nearestRoad(x, z) {
  let best = null, bestD = Infinity;
  for (const e of edges) {
    const dx = e.bx - e.ax, dz = e.bz - e.az;
    const t = Math.max(0, Math.min(1, ((x - e.ax) * dx + (z - e.az) * dz) / (dx * dx + dz * dz)));
    const px = e.ax + dx * t, pz = e.az + dz * t;
    const d = (px - x) ** 2 + (pz - z) ** 2;
    if (d < bestD) { bestD = d; best = { edge: e, t, x: px, z: pz, dist: Math.sqrt(d) }; }
  }
  return best;
}

// Edges whose midpoint lies within a ring around a point (spawning traffic and police).
export function edgesInRing(x, z, rMin, rMax) {
  const out = [];
  for (const e of edges) {
    const mx = (e.ax + e.bx) / 2, mz = (e.az + e.bz) / 2;
    const d = Math.hypot(mx - x, mz - z);
    if (d >= rMin && d <= rMax) out.push(e);
  }
  return out;
}
