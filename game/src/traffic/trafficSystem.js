// Keeps the streets busy: spawns civilian cars on lanes in a ring around the player, drives them
// with LaneDriver, and recycles the ones left far behind.

import { edges, nodes, lanePoint } from '../roads/roadNetwork.js';
import { LaneDriver } from './laneDriver.js';
import { TRAFFIC_MIX } from '../vehicles/vehicleTypes.js';
import { on } from '../core/events.js';

export class TrafficSystem {
  constructor(vehicles, rng) {
    this.vehicles = vehicles;
    this.rng = rng;
    this.drivers = new Map();   // vehicle -> LaneDriver
    this.target = 28;
    this.spawnTimer = 0;
    on('gunfire', ({ x, z }) => this.scare(x, z, 60));
    on('vehicle:collision', ({ a, b }) => { this.scareVehicle(a); this.scareVehicle(b); });
  }

  scare(x, z, r) {
    for (const [v, d] of this.drivers) if ((v.pos.x - x) ** 2 + (v.pos.z - z) ** 2 < r * r) d.panic = 8;
  }

  scareVehicle(v) {
    const d = this.drivers.get(v);
    if (d) d.panic = 6;
  }

  // Put a car on a random lane of a given edge at distance s.
  spawnOnEdge(edge, s, type = null, forward = null) {
    const fwd = forward ?? this.rng.next() < 0.5;
    const a = nodes.get(fwd ? edge.a : edge.b), b = nodes.get(fwd ? edge.b : edge.a);
    const lane = this.rng.next() < 0.5 ? 0 : 1;
    const p = lanePoint(a, b, lane, s);
    const t = type || TRAFFIC_MIX[Math.floor(this.rng.next() * TRAFFIC_MIX.length)];
    if (t === 'bus' && lane === 0) return null;
    for (const o of this.vehicles.list) if ((o.pos.x - p.x) ** 2 + (o.pos.z - p.z) ** 2 < 144) return null;
    const v = this.vehicles.spawn(t, p.x, p.z, p.heading, { rng: this.rng });
    const d = new LaneDriver(v, a.id, b.id, lane, s, this.rng);
    v.driver = d;
    v.vel.set(Math.sin(p.heading) * d.cruise * 0.8, -Math.cos(p.heading) * d.cruise * 0.8);
    this.drivers.set(v, d);
    return v;
  }

  release(v) {
    this.drivers.delete(v);
    if (v.driver instanceof LaneDriver) v.driver = null;
  }

  update(dt, time, player) {
    const px = player.pos.x, pz = player.pos.z;
    for (const [v, d] of this.drivers) {
      if (v.removed || v.driver !== d) { this.drivers.delete(v); continue; }
      d.update(dt, time, this.vehicles.list, player);
    }
    // recycle far or wrecked cars nobody cares about
    for (const v of [...this.vehicles.list]) {
      if (v.persistent || v === player.vehicle) continue;
      const d2 = (v.pos.x - px) ** 2 + (v.pos.z - pz) ** 2;
      if (d2 > 330 * 330 || (v.wrecked && d2 > 120 * 120)) { this.drivers.delete(v); this.vehicles.remove(v); }
    }
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && this.drivers.size < this.target) {
      this.spawnTimer = 0.25;
      const ring = edges.filter((e) => {
        if (e.kind !== 'street') return false;
        const mx = (e.ax + e.bx) / 2, mz = (e.az + e.bz) / 2;
        const d = Math.hypot(mx - px, mz - pz);
        return d > 90 && d < 260;
      });
      if (ring.length) {
        const e = ring[Math.floor(this.rng.next() * ring.length)];
        this.spawnOnEdge(e, 12 + this.rng.next() * (e.len - 30));
      }
    }
  }
}
