// One emergency call, shared by Sunwake Medical and the Keys Fire Department: a unit spawns on a
// street a block or two away, runs lights and siren to the scene along the road graph, parks, lets
// its crew out to work, takes them back aboard and drives off. The service decides what "work"
// means (kneeling over a patient, hosing down a fire) through the hooks it passes in.
// Steal or wreck the unit mid-call and the call is over.

import { edges, nodes, lanePoint } from '../roads/roadNetwork.js';
import { PursuitDriver } from '../police/pursuitDriver.js';
import { CrewMember } from './crewMember.js';
import { rng } from '../core/rng.js';

export class ResponseCall {
  // hooks: { spot(k) -> {x, z}, work(member, k, dt), done() -> bool, finish() }
  static dispatch(game, type, x, z, outfit, hooks) {
    const ring = edges.filter((e) => {
      if (e.kind !== 'street') return false;
      const d = Math.hypot((e.ax + e.bx) / 2 - x, (e.az + e.bz) / 2 - z);
      return d > 90 && d < 180;
    });
    if (!ring.length) return null;
    const e = ring[Math.floor(rng.next() * ring.length)];
    const at = lanePoint(nodes.get(e.a), nodes.get(e.b), 1, e.len * 0.5);
    const v = game.vehicles.spawn(type, at.x, at.z, at.heading);
    v.persistent = true;
    return new ResponseCall(game, v, { x, z }, outfit, hooks);
  }

  constructor(game, vehicle, scene, outfit, hooks) {
    this.game = game;
    this.v = vehicle;
    this.driver = new PursuitDriver(vehicle);
    vehicle.driver = this.driver;
    this.scene = scene;
    this.outfit = outfit;
    this.hooks = hooks;
    this.stage = 'respond';
    this.t = 0;
    this.crew = [];
    this.target = { pos: { x: scene.x, z: scene.z }, vehicle: null };
  }

  // Steps the call; returns true once it is over (and cleaned up).
  update(dt) {
    const g = this.game, v = this.v;
    this.t += dt;
    const playerDist = Math.hypot(v.pos.x - g.player.pos.x, v.pos.z - g.player.pos.z);
    if (v.driver !== this.driver || v.wrecked) { this.end(false); return true; }
    if (playerDist > 240 || this.t > 120) { this.end(true); return true; }
    if (this.stage === 'respond') {
      this.driver.update(dt, this.target);
      const near = Math.hypot(v.pos.x - this.scene.x, v.pos.z - this.scene.z) < 20;
      if (near && Math.abs(v.speed) < 1.5) this.arrive();
      return false;
    }
    if (this.stage === 'leave') {
      this.driver.update(dt, this.target);
      this.leaveT += dt;
      if (this.leaveT > 40 || playerDist > 200) { this.end(true); return true; }
      return false;
    }
    // parked: brake to a stop, then hold the handbrake (brake at a standstill would reverse)
    v.input.throttle = 0; v.input.brake = v.speed > 0.5 ? 1 : 0; v.input.steer = 0; v.input.handbrake = true;
    if (this.stage === 'work') {
      this.crew.forEach((m, k) => {
        const spot = this.hooks.spot(k);
        if (m.walkTo(spot.x, spot.z, dt, 0.4)) this.hooks.work(m, k, dt);
      });
      if (this.hooks.done()) { this.hooks.finish(); this.stage = 'board'; }
      return false;
    }
    if (this.stage === 'board') {
      const f = v.forward();
      const back = { x: v.pos.x - f.x * (v.spec.len / 2 + 1), z: v.pos.z - f.z * (v.spec.len / 2 + 1) };
      if (this.crew.every((m) => m.walkTo(back.x, back.z, dt, 1.2))) this.depart();
    }
    return false;
  }

  arrive() {
    const v = this.v, f = v.forward(), r = v.right();
    this.stage = 'work';
    // passers-by stop to watch the crew for a while
    let watchers = 0;
    for (const ped of this.game.peds.peds) {
      if (watchers >= 4 || !ped.alive || ped.kind !== 'civilian' || ped.state !== 'walk') continue;
      if (Math.hypot(ped.pos.x - this.scene.x, ped.pos.z - this.scene.z) > 28) continue;
      ped.state = 'idle';
      ped.idleTimer = 10 + watchers * 2;
      ped.heading = Math.atan2(this.scene.x - ped.pos.x, -(this.scene.z - ped.pos.z));
      watchers++;
    }
    for (const side of [-1, 1]) {
      const x = v.pos.x - f.x * (v.spec.len / 2 + 0.8) + r.x * side * 0.6, z = v.pos.z - f.z * (v.spec.len / 2 + 0.8) + r.z * side * 0.6;
      this.crew.push(new CrewMember(this.game.scene, x, z, { ...this.outfit, skin: side < 0 ? '#c98d66' : '#f1c7a5' }));
    }
  }

  depart() {
    const v = this.v;
    this.crew.forEach((m) => m.dispose());
    this.crew = [];
    this.stage = 'leave';
    this.leaveT = 0;
    v.sirenOn = false;
    const far = [...nodes.values()].filter((n) => Math.hypot(n.x - v.pos.x, n.z - v.pos.z) > 260 && !n.id.startsWith('cw'));
    const n = far[Math.floor(rng.next() * far.length)] || { x: 512, z: 512 };
    this.target = { pos: { x: n.x, z: n.z }, vehicle: null };
  }

  // removeVehicle: take the unit off the map too (it left, or the player is far away).
  end(removeVehicle) {
    this.crew.forEach((m) => m.dispose());
    this.crew = [];
    this.hooks.abandon?.();
    if (removeVehicle && this.v.driver === this.driver) this.game.vehicles.remove(this.v);
    else this.v.persistent = false;
  }
}
