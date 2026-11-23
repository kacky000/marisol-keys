// Stunt jumps: painted launch ramps in the parks and on the harbor apron. Hit one fast enough,
// stay airborne long enough, and the island pays you for it.

import * as THREE from 'three';
import { MeshBatch, tint } from '../core/meshBatch.js';
import { emit } from '../core/events.js';

const B = 64;
// x, z: foot of the ramp; heading: launch direction; len and top height
export const RAMPS = [
  { x: 7 * B + 38, z: 7 * B + 50, heading: 0, len: 10, h: 3.2, name: 'Seagrape Leap' },
  { x: 7 * B + 26, z: 9 * B + 14, heading: Math.PI, len: 10, h: 3.2, name: 'Fountain Flyer' },
  { x: 9 * B + 14, z: 5 * B + 38, heading: Math.PI / 2, len: 10, h: 3.3, name: 'Glasswater Gap' },
  { x: 3 * B + 20, z: 13 * B + 58, heading: Math.PI / 2, len: 11, h: 3.6, name: 'Quay Hopper' },
];

// True inside a ramp's runway: 35 m of run-up behind it and 30 m of landing ahead, 4 m wide.
export function nearRampLane(x, z) {
  for (const r of RAMPS) {
    const fx = Math.sin(r.heading), fz = -Math.cos(r.heading);
    const dx = x - r.x, dz = z - r.z;
    const along = dx * fx + dz * fz, side = dx * -fz + dz * fx;
    if (along > -35 && along < r.len + 30 && Math.abs(side) < 4.5) return true;
  }
  return false;
}

// Height of any ramp surface under (x, z), or -Infinity.
export function rampHeight(x, z) {
  let best = -Infinity;
  for (const r of RAMPS) {
    const fx = Math.sin(r.heading), fz = -Math.cos(r.heading);
    const dx = x - r.x, dz = z - r.z;
    const along = dx * fx + dz * fz, side = dx * -fz + dz * fx;
    if (along >= 0 && along <= r.len && Math.abs(side) <= 3) best = Math.max(best, 0.18 + (along / r.len) * r.h);
  }
  return best;
}

export class StuntJumps {
  constructor(game) {
    this.game = game;
    this.air = null;
    const b = new MeshBatch();
    const stripeA = tint('#ffd23f'), stripeB = tint('#222'), side = tint('#c9c2b4');
    for (const r of RAMPS) {
      const c = Math.cos(r.heading), s = Math.sin(r.heading);
      const P = (lx, ly, lz) => [r.x + lx * c - lz * s, ly, r.z + lx * s + lz * c];
      // local frame: +lz runs up the ramp (toward the launch direction)
      const fwd = (along) => -along;
      for (let k = 0; k < 6; k++) {
        const a0 = (k / 6) * r.len, a1 = ((k + 1) / 6) * r.len;
        const y0 = 0.18 + (a0 / r.len) * r.h, y1 = 0.18 + (a1 / r.len) * r.h;
        const col = k % 2 ? stripeA : stripeB;
        b.quad(P(-3, y0, fwd(a0)), P(3, y0, fwd(a0)), P(3, y1, fwd(a1)), P(-3, y1, fwd(a1)), [0, 1, 0], [[0, 0], [1, 0], [1, 1], [0, 1]], col);
      }
      for (const sx of [-3, 3]) b.quad(P(sx, 0.18, 0), P(sx, 0.18, fwd(r.len)), P(sx, 0.18 + r.h, fwd(r.len)), P(sx, 0.18, 0), [sx, 0, 0], [[0, 0], [1, 0], [1, 1], [0, 1]], side);
      b.quad(P(-3, 0.18, fwd(r.len)), P(3, 0.18, fwd(r.len)), P(3, 0.18 + r.h, fwd(r.len)), P(-3, 0.18 + r.h, fwd(r.len)), [s, 0, -c], [[0, 0], [1, 0], [1, 1], [0, 1]], side);
    }
    const mesh = b.toMesh(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, side: THREE.DoubleSide }));
    game.scene.add(mesh);
  }

  blips() { return RAMPS.map((r) => ({ x: r.x, z: r.z, kind: 'stunt', letter: 'J' })); }

  update(dt) {
    const g = this.game, v = g.player.vehicle;
    if (!v) { this.air = null; return; }
    if (v.airborne && !this.air) this.air = { t: 0, x: v.pos.x, z: v.pos.z, peak: v.pos.y };
    if (this.air) {
      this.air.t += dt;
      this.air.peak = Math.max(this.air.peak, v.pos.y);
      if (!v.airborne) {
        const dist = Math.hypot(v.pos.x - this.air.x, v.pos.z - this.air.z);
        if (this.air.t > 0.9 && dist > 16 && !v.wrecked) {
          const pay = Math.round(200 + dist * 12 + this.air.t * 100);
          g.state.money += pay;
          g.state.stats.jumps = (g.state.stats.jumps || 0) + 1;
          g.hud.bigMessage('STUNT JUMP', `${dist.toFixed(0)} m · ${this.air.t.toFixed(1)} s airtime · +$${pay}`, 3);
          emit('sound', { name: 'passed' });
        }
        this.air = null;
      }
    }
  }
}
