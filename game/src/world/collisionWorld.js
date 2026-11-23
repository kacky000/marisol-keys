// Static obstacles (buildings, walls, containers, props) as axis-aligned boxes in a spatial hash:
// circle push-out for people and cars, and ray casts for bullets and the camera.

const CELL = 24;
const boxes = [];
const cells = new Map();

const key = (cx, cz) => cx * 73856093 ^ cz * 19349663;

export function clearColliders() {
  boxes.length = 0;
  cells.clear();
}

// A solid box from y0 to y1 covering [x0,x1] x [z0,z1].
export function addCollider(x0, z0, x1, z1, y1 = 30, y0 = -5, tag = 'wall') {
  const b = { x0: Math.min(x0, x1), x1: Math.max(x0, x1), z0: Math.min(z0, z1), z1: Math.max(z0, z1), y0, y1, tag };
  boxes.push(b);
  for (let cx = Math.floor(b.x0 / CELL); cx <= Math.floor(b.x1 / CELL); cx++) {
    for (let cz = Math.floor(b.z0 / CELL); cz <= Math.floor(b.z1 / CELL); cz++) {
      const k = key(cx, cz);
      if (!cells.has(k)) cells.set(k, []);
      cells.get(k).push(b);
    }
  }
  return b;
}

export const addColliderCentered = (cx, cz, w, d, h, tag) => addCollider(cx - w / 2, cz - d / 2, cx + w / 2, cz + d / 2, h, -5, tag);

let stamp = 0;
function forNear(x0, z0, x1, z1, fn) {
  stamp++;
  for (let cx = Math.floor(x0 / CELL); cx <= Math.floor(x1 / CELL); cx++) {
    for (let cz = Math.floor(z0 / CELL); cz <= Math.floor(z1 / CELL); cz++) {
      const list = cells.get(key(cx, cz));
      if (!list) continue;
      for (const b of list) {
        if (b._s === stamp) continue;
        b._s = stamp;
        fn(b);
      }
    }
  }
}

// Push a circle out of every box it overlaps. Returns the push normal of the deepest hit (or null).
export function resolveCircle(pos, r, y = 0) {
  let hit = null;
  forNear(pos.x - r, pos.z - r, pos.x + r, pos.z + r, (b) => {
    if (y > b.y1 || y + 1.8 < b.y0) return;
    const nx = Math.max(b.x0, Math.min(pos.x, b.x1));
    const nz = Math.max(b.z0, Math.min(pos.z, b.z1));
    let dx = pos.x - nx, dz = pos.z - nz;
    let d2 = dx * dx + dz * dz;
    if (d2 >= r * r) return;
    if (d2 < 1e-8) {
      // centre is inside the box: leave by the nearest face
      const opts = [[pos.x - b.x0, -1, 0], [b.x1 - pos.x, 1, 0], [pos.z - b.z0, 0, -1], [b.z1 - pos.z, 0, 1]];
      opts.sort((p, q) => p[0] - q[0]);
      const [depth, ox, oz] = opts[0];
      pos.x += ox * (depth + r);
      pos.z += oz * (depth + r);
      hit = { nx: ox, nz: oz, depth: depth + r, box: b };
      return;
    }
    const d = Math.sqrt(d2);
    const push = r - d;
    dx /= d; dz /= d;
    pos.x += dx * push;
    pos.z += dz * push;
    if (!hit || push > hit.depth) hit = { nx: dx, nz: dz, depth: push, box: b };
  });
  return hit;
}

export function circleBlocked(x, z, r, y = 0) {
  let blocked = false;
  forNear(x - r, z - r, x + r, z + r, (b) => {
    if (blocked || y > b.y1) return;
    const nx = Math.max(b.x0, Math.min(x, b.x1)), nz = Math.max(b.z0, Math.min(z, b.z1));
    if ((x - nx) ** 2 + (z - nz) ** 2 < r * r) blocked = true;
  });
  return blocked;
}

// Ray against all boxes (slab test). Returns distance along the unit direction, or Infinity.
export function raycastStatic(ox, oy, oz, dx, dy, dz, maxDist) {
  let best = maxDist;
  const ex = ox + dx * maxDist, ez = oz + dz * maxDist;
  forNear(Math.min(ox, ex), Math.min(oz, ez), Math.max(ox, ex), Math.max(oz, ez), (b) => {
    let tmin = 0, tmax = best;
    for (const [o, d, lo, hi] of [[ox, dx, b.x0, b.x1], [oy, dy, b.y0, b.y1], [oz, dz, b.z0, b.z1]]) {
      if (Math.abs(d) < 1e-9) { if (o < lo || o > hi) return; continue; }
      let t1 = (lo - o) / d, t2 = (hi - o) / d;
      if (t1 > t2) [t1, t2] = [t2, t1];
      if (t1 > tmin) tmin = t1;
      if (t2 < tmax) tmax = t2;
      if (tmin > tmax) return;
    }
    if (tmin < best) best = tmin;
  });
  return best;
}

export const colliderCount = () => boxes.length;

// Every static box, for map painting (footprints of buildings and containers).
export function eachCollider(fn) { for (const b of boxes) fn(b); }
