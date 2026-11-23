// Police pursuit driving: route along the road graph toward the player, then ram directly when
// close; brakes and lets officers out when the suspect is on foot or stopped.

import { planRoute } from '../roads/routePlanner.js';
import { clamp, wrapAngle } from '../core/mathUtil.js';

export class PursuitDriver {
  constructor(vehicle) {
    this.vehicle = vehicle;
    this.route = [];
    this.replan = 0;
    this.stuck = 0;
    this.reverse = 0;
    vehicle.sirenOn = true;
  }

  update(dt, target, knownPos) {
    const v = this.vehicle;
    if (v.wrecked) return;
    const goal = knownPos || target.pos;
    const dx = goal.x - v.pos.x, dz = goal.z - v.pos.z;
    const dist = Math.hypot(dx, dz);
    this.replan -= dt;
    if (this.replan <= 0) {
      this.replan = 1.5;
      this.route = dist > 45 ? planRoute(v.pos.x, v.pos.z, goal.x, goal.z) : [];
      // don't U-turn back to a junction already behind us
      const r = this.route;
      if (r.length >= 2 && Math.hypot(r[1].x - v.pos.x, r[1].z - v.pos.z) < Math.hypot(r[1].x - r[0].x, r[1].z - r[0].z)) r.shift();
    }
    while (this.route.length && Math.hypot(this.route[0].x - v.pos.x, this.route[0].z - v.pos.z) < 10) this.route.shift();
    // slow down ahead of a corner on the route
    let cornerLimit = Infinity;
    if (this.route.length >= 2 && dist > 45) {
      const [n0, n1] = this.route;
      const a0 = Math.atan2(n0.x - v.pos.x, -(n0.z - v.pos.z)), a1 = Math.atan2(n1.x - n0.x, -(n1.z - n0.z));
      const d0 = Math.hypot(n0.x - v.pos.x, n0.z - v.pos.z);
      if (Math.abs(wrapAngle(a1 - a0)) > 0.6 && d0 < 30) cornerLimit = 9 + d0 * 0.35;
    }
    let tx = goal.x, tz = goal.z;
    if (this.route.length && dist > 45) { tx = this.route[0].x; tz = this.route[0].z; }
    else if (target.vehicle) {
      // lead the target a little
      tx += target.vehicle.vel.x * 0.5; tz += target.vehicle.vel.y * 0.5;
    }
    const want = Math.atan2(tx - v.pos.x, -(tz - v.pos.z));
    const err = wrapAngle(want - v.heading);
    const sp = v.speed;
    // unstick: reverse a moment when blocked
    if (Math.abs(sp) < 1 && v.input.throttle > 0.5) this.stuck += dt; else this.stuck = Math.max(0, this.stuck - dt);
    if (this.stuck > 1.2) { this.reverse = 1.1; this.stuck = 0; }
    if (this.reverse > 0) {
      this.reverse -= dt;
      v.input.throttle = 0; v.input.brake = 1; v.input.steer = -Math.sign(err); v.input.handbrake = false;
      return;
    }
    const onFootClose = !target.vehicle && dist < 16;
    let targetSpeed = onFootClose ? 0 : clamp(dist * 0.6, 12, v.spec.maxSpeed * 0.92);
    if (Math.abs(err) > 0.9 && sp > 14) targetSpeed = 12;
    targetSpeed = Math.min(targetSpeed, cornerLimit);
    v.input.steer = clamp(err * 2.2, -1, 1);
    v.input.handbrake = Math.abs(err) > 1.1 && sp > 16;
    if (sp < targetSpeed) { v.input.throttle = 1; v.input.brake = 0; }
    else { v.input.throttle = 0; v.input.brake = clamp((sp - targetSpeed) * 0.2, 0, 1); }
    this.parked = onFootClose && Math.abs(sp) < 2;
  }
}
