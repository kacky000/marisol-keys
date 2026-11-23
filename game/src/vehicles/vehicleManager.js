// Owns every vehicle in the scene: spawning, despawning, stepping physics and car-to-car crashes.

import { Vehicle } from './vehicle.js';
import { emit } from '../core/events.js';

export class VehicleManager {
  constructor(scene) {
    this.scene = scene;
    this.list = [];
  }

  spawn(type, x, z, heading, opts) {
    const v = new Vehicle(type, x, z, heading, opts);
    this.list.push(v);
    this.scene.add(v.mesh);
    return v;
  }

  remove(v) {
    const i = this.list.indexOf(v);
    if (i >= 0) this.list.splice(i, 1);
    this.scene.remove(v.mesh);
    v.removed = true;
  }

  update(dt, time) {
    for (const v of this.list) v.update(dt, time);
    this.collidePairs(time);
  }

  // Circle-pair contacts along each car's length with momentum exchange.
  collidePairs(time) {
    const L = this.list;
    for (let i = 0; i < L.length; i++) {
      const a = L[i];
      for (let j = i + 1; j < L.length; j++) {
        const b = L[j];
        const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z;
        const reach = (a.spec.len + b.spec.len) / 2;
        if (dx * dx + dz * dz > reach * reach) continue;
        // closest pair of capsule sample points
        let best = null;
        for (const oa of samples(a)) for (const ob of samples(b)) {
          const ex = ob.x - oa.x, ez = ob.z - oa.z;
          const d2 = ex * ex + ez * ez;
          const rr = oa.r + ob.r;
          if (d2 < rr * rr && (!best || d2 < best.d2)) best = { d2, ex, ez, rr };
        }
        if (!best) continue;
        const d = Math.sqrt(best.d2) || 0.01;
        const nx = best.ex / d, nz = best.ez / d;
        const pen = best.rr - d;
        const ma = a.spec.mass, mb = b.spec.mass;
        const wa = mb / (ma + mb), wb = ma / (ma + mb);
        a.pos.x -= nx * pen * wa; a.pos.z -= nz * pen * wa;
        b.pos.x += nx * pen * wb; b.pos.z += nz * pen * wb;
        const rel = (b.vel.x - a.vel.x) * nx + (b.vel.y - a.vel.y) * nz;
        if (rel < 0) {
          const jImp = -1.3 * rel;
          a.vel.x -= nx * jImp * wa; a.vel.y -= nz * jImp * wa;
          b.vel.x += nx * jImp * wb; b.vel.y += nz * jImp * wb;
          const impact = -rel;
          if (impact > 4 && time - (a.lastImpact || 0) > 0.2) {
            a.damage(impact * impact * 0.6, 'crash');
            b.damage(impact * impact * 0.6, 'crash');
            a.lastImpact = b.lastImpact = time;
            emit('vehicle:collision', { a, b, impact, x: (a.pos.x + b.pos.x) / 2, z: (a.pos.z + b.pos.z) / 2 });
          }
        }
      }
    }
  }

  nearest(x, z, maxDist, filter = () => true) {
    let best = null, bd = maxDist * maxDist;
    for (const v of this.list) {
      if (!filter(v)) continue;
      const d = (v.pos.x - x) ** 2 + (v.pos.z - z) ** 2;
      if (d < bd) { bd = d; best = v; }
    }
    return best;
  }
}

function samples(v) {
  const f = v.forward();
  const r = v.spec.width / 2;
  const half = Math.max(0, v.spec.len / 2 - r);
  if (half < 0.3) return [{ x: v.pos.x, z: v.pos.z, r }];
  return [
    { x: v.pos.x + f.x * half, z: v.pos.z + f.z * half, r },
    { x: v.pos.x, z: v.pos.z, r },
    { x: v.pos.x - f.x * half, z: v.pos.z - f.z * half, r },
  ];
}
