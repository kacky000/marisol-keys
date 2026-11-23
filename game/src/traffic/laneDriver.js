// AI driver for civilian traffic: follows lanes, curves through junctions, stops at red lights,
// keeps distance to the car ahead, and panics (speeds, ignores lights) when threatened.

import { nodes, lanePoint, lightFor, travelAxis, STOP_BACK } from '../roads/roadNetwork.js';
import { ROAD_HALF } from '../world/cityPlan.js';
import { clamp, wrapAngle } from '../core/mathUtil.js';

export class LaneDriver {
  constructor(vehicle, fromId, toId, lane, s, rng) {
    this.vehicle = vehicle;
    this.rng = rng;
    this.lane = lane;
    this.cruise = 11 + rng.next() * 5;
    this.panic = 0;
    this.path = [];
    this.stopAt = -1;          // index in path of the stop line point
    this.from = nodes.get(fromId);
    this.to = nodes.get(toId);
    this.buildEdge(s);
  }

  buildEdge(startS = ROAD_HALF + 1) {
    const a = this.from, b = this.to;
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    this.path.length = 0;
    const end = len - (b.hasLight || b.links.length > 2 ? STOP_BACK : ROAD_HALF);
    for (let s = startS; s < end; s += 6) this.path.push(lanePoint(a, b, this.lane, s));
    this.path.push(lanePoint(a, b, this.lane, end));
    this.stopAt = this.path.length - 1;
    this.edgeEnd = end;
  }

  // Choose the next street at the junction and append a curved turn plus that street's lane.
  advance() {
    const a = this.from, b = this.to;
    let options = b.links.filter((id) => id !== a.id);
    if (!options.length) options = [a.id];
    const nextId = options[Math.floor(this.rng.next() * options.length)];
    const c = nodes.get(nextId);
    const p0 = lanePoint(a, b, this.lane, this.edgeEnd);
    const p2 = lanePoint(b, c, this.lane, ROAD_HALF + 1);
    const d0x = (b.x - a.x) / p0.len, d0z = (b.z - a.z) / p0.len;
    const fwd = Math.max(1, (p2.x - p0.x) * d0x + (p2.z - p0.z) * d0z);
    const cx = p0.x + d0x * fwd, cz = p0.z + d0z * fwd;
    const turn = [];
    for (let k = 1; k <= 5; k++) {
      const t = k / 5, u = 1 - t;
      turn.push({ x: u * u * p0.x + 2 * u * t * cx + t * t * p2.x, z: u * u * p0.z + 2 * u * t * cz + t * t * p2.z, turn: true });
    }
    this.from = b;
    this.to = c;
    const rest = [];
    const len = p2.len;
    const end = len - (c.hasLight || c.links.length > 2 ? STOP_BACK : ROAD_HALF);
    for (let s = ROAD_HALF + 7; s < end; s += 6) rest.push(lanePoint(b, c, this.lane, s));
    rest.push(lanePoint(b, c, this.lane, end));
    this.edgeEnd = end;
    this.path.splice(0, this.path.length, ...turn, ...rest);
    this.stopAt = this.path.length - 1;
  }

  update(dt, time, vehicles, player) {
    const v = this.vehicle;
    if (v.wrecked) return;
    this.panic = Math.max(0, this.panic - dt);
    // drop reached points
    while (this.path.length > 1 && (this.path[0].x - v.pos.x) ** 2 + (this.path[0].z - v.pos.z) ** 2 < 16) {
      this.path.shift();
      this.stopAt--;
    }
    if (this.path.length <= 1 && (this.path[0].x - v.pos.x) ** 2 + (this.path[0].z - v.pos.z) ** 2 < 25) {
      // at the stop line: wait for green unless panicking
      const light = lightFor(this.to, travelAxis(this.from, this.to), time);
      if (light === 'green' || this.panic > 0 || !this.to.hasLight) this.advance();
    }
    // pure pursuit toward a look-ahead point
    const look = 5 + Math.abs(v.speed) * 0.45;
    let target = this.path[this.path.length - 1];
    for (const p of this.path) {
      if ((p.x - v.pos.x) ** 2 + (p.z - v.pos.z) ** 2 > look * look) { target = p; break; }
    }
    const want = Math.atan2(target.x - v.pos.x, -(target.z - v.pos.z));
    const err = wrapAngle(want - v.heading);
    let targetSpeed = this.panic > 0 ? this.cruise * 1.9 : this.cruise;
    if (this.path[0] && this.path[0].turn) targetSpeed = Math.min(targetSpeed, 7.5);
    if (Math.abs(err) > 0.5) targetSpeed = Math.min(targetSpeed, 6);

    // red light ahead: brake to the stop line
    if (this.panic <= 0 && this.to.hasLight && this.stopAt >= 0) {
      const sp = this.path[Math.min(this.stopAt, this.path.length - 1)];
      const ds = Math.hypot(sp.x - v.pos.x, sp.z - v.pos.z);
      const light = lightFor(this.to, travelAxis(this.from, this.to), time);
      if (light !== 'green' && ds < 40 && !(light === 'yellow' && ds < 8)) targetSpeed = Math.min(targetSpeed, Math.max(0, (ds - 2.5) * 0.55));
    }
    // keep distance from anything in front (other cars or the player)
    const f = v.forward();
    const gap = this.gapAhead(v, f, vehicles, player);
    if (gap < 22) targetSpeed = Math.min(targetSpeed, Math.max(0, (gap - 6) * 0.7));

    const sp = v.speed;
    v.input.steer = clamp(err * 2.4, -1, 1);
    v.input.handbrake = false;
    if (sp < targetSpeed - 0.5) { v.input.throttle = clamp((targetSpeed - sp) * 0.35, 0.2, 1); v.input.brake = 0; }
    else if (sp > targetSpeed + 0.8) { v.input.throttle = 0; v.input.brake = clamp((sp - targetSpeed) * 0.25, 0.15, 1); }
    else { v.input.throttle = 0.15; v.input.brake = 0; }
    if (targetSpeed < 0.3 && sp < 0.6) { v.input.throttle = 0; v.input.brake = 0; v.vel.multiplyScalar(0.8); }
  }

  gapAhead(v, f, vehicles, player) {
    let gap = Infinity;
    const test = (x, z, extra) => {
      const dx = x - v.pos.x, dz = z - v.pos.z;
      const along = dx * f.x + dz * f.z;
      if (along <= 0 || along > 26) return;
      const side = Math.abs(dx * -f.z + dz * f.x);
      if (side < 2.2 + extra) gap = Math.min(gap, along - extra);
    };
    for (const o of vehicles) if (o !== v) test(o.pos.x, o.pos.z, o.spec.len / 2);
    if (player && !player.vehicle) test(player.pos.x, player.pos.z, 0.5);
    return gap;
  }
}
