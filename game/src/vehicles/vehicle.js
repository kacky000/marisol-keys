// One drivable vehicle: arcade physics (throttle, brakes, handbrake drift, grip), collisions with
// the city, damage states (smoke, fire, explosion) and its 3D model kept in sync.

import * as THREE from 'three';
import { VEHICLE_TYPES } from './vehicleTypes.js';
import { buildVehicleMesh } from './vehicleMesh.js';
import { resolveCircle } from '../world/collisionWorld.js';
import { groundHeight } from '../world/groundHeight.js';
import { clamp, wrapAngle } from '../core/mathUtil.js';
import { emit } from '../core/events.js';

let nextId = 1;

export class Vehicle {
  constructor(type, x, z, heading, { paint = null, rng = Math.random } = {}) {
    this.id = nextId++;
    this.type = type;
    this.spec = VEHICLE_TYPES[type];
    const paints = this.spec.paints;
    this.paint = paint || paints[Math.floor((typeof rng === 'function' ? rng() : rng.next()) * paints.length)];
    this.mesh = buildVehicleMesh(type, this.spec, this.paint);
    this.pos = new THREE.Vector3(x, groundHeight(x, z), z);
    this.heading = heading;
    this.vel = new THREE.Vector2(0, 0);   // world x/z velocity
    this.yawRate = 0;
    this.steer = 0;
    this.input = { throttle: 0, brake: 0, steer: 0, handbrake: false };
    this.health = this.spec.health;
    this.driver = null;        // 'player' | ped/cop object | null
    this.siren = this.spec.police;
    this.sirenOn = false;
    this.wrecked = false;
    this.burning = 0;
    this.wheelSpin = 0;
    this.lastImpact = 0;
    this.doorOpen = 0;
    this.mesh.position.copy(this.pos);
    this.mesh.rotation.y = -heading;
  }

  get speed() {
    const f = this.forward();
    return this.vel.x * f.x + this.vel.y * f.z;
  }

  forward() { return { x: Math.sin(this.heading), z: -Math.cos(this.heading) }; }
  right() { return { x: Math.cos(this.heading), z: Math.sin(this.heading) }; }

  update(dt, time) {
    const s = this.spec;
    const inp = this.wrecked ? { throttle: 0, brake: 0.3, steer: 0, handbrake: true } : this.input;
    const f = this.forward(), r = this.right();
    let vF = this.vel.x * f.x + this.vel.y * f.z;
    let vR = this.vel.x * r.x + this.vel.y * r.z;

    // engine and brakes
    const top = s.maxSpeed * (this.health < s.health * 0.25 ? 0.6 : 1);
    if (inp.throttle > 0) {
      const fall = 1 - clamp(vF / top, 0, 1) ** 2;
      vF += inp.throttle * s.accel * fall * dt;
    }
    if (inp.brake > 0) {
      if (vF > 0.5) vF = Math.max(0, vF - s.brake * inp.brake * dt);
      else vF = Math.max(-top * 0.35, vF - s.accel * 0.6 * inp.brake * dt); // reverse
    }
    if (inp.handbrake) vF -= Math.sign(vF) * Math.min(Math.abs(vF), 9 * dt);
    vF -= vF * (0.12 + Math.abs(vF) * 0.004) * dt; // rolling + air drag
    if (!inp.throttle && !inp.brake) vF -= Math.sign(vF) * Math.min(Math.abs(vF), 2.2 * dt);

    // steering: wheel angle eases toward input, less lock at speed
    const lock = s.steer / (1 + Math.abs(vF) * 0.035);
    this.steer += (inp.steer * lock - this.steer) * Math.min(1, dt * 8);
    const targetYaw = (vF / s.wheelbase) * Math.tan(this.steer) * (inp.handbrake ? 1.45 : 1);
    this.yawRate += (targetYaw - this.yawRate) * Math.min(1, dt * (inp.handbrake ? 4 : 9));
    this.heading = wrapAngle(this.heading + this.yawRate * dt);

    // lateral grip: handbrake lets the tail slide (drift)
    const grip = inp.handbrake ? 1.1 : s.grip;
    vR -= vR * Math.min(1, grip * dt);

    const nf = this.forward(), nr = this.right();
    this.vel.set(nf.x * vF + nr.x * vR, nf.z * vF + nr.z * vR);
    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.y * dt;
    this.drifting = inp.handbrake && Math.abs(vF) > 8 || Math.abs(vR) > 4;

    this.collideWithCity(time);
    const gy = groundHeight(this.pos.x, this.pos.z);
    this.pos.y += (Math.max(gy, -3) - this.pos.y) * Math.min(1, dt * 12);
    if (gy < -1.5 && !this.wrecked && !s.boat) this.sink();

    if (this.health <= 0 && !this.wrecked) this.explode();
    if (this.wrecked) this.burning = Math.max(0, this.burning - dt);
    this.syncMesh(dt, vF, time);
  }

  // Front and rear circles pushed out of buildings; bounce and take damage from hard hits.
  collideWithCity(time) {
    const s = this.spec;
    const f = this.forward();
    const rad = s.width / 2 + 0.1;
    const offs = s.bike ? [0] : [-(s.len / 2 - rad), 0, s.len / 2 - rad];
    for (const o of offs) {
      const c = { x: this.pos.x + f.x * -o, z: this.pos.z + f.z * -o };
      const hit = resolveCircle(c, rad, this.pos.y);
      if (!hit) continue;
      const dx = c.x - (this.pos.x + f.x * -o), dz = c.z - (this.pos.z + f.z * -o);
      this.pos.x += dx; this.pos.z += dz;
      const vn = this.vel.x * hit.nx + this.vel.y * hit.nz;
      if (vn < 0) {
        this.vel.x -= vn * hit.nx * 1.35;
        this.vel.y -= vn * hit.nz * 1.35;
        this.vel.multiplyScalar(0.8);
        const impact = -vn;
        if (impact > 6 && time - this.lastImpact > 0.25) {
          this.damage(impact * impact * 0.9, 'crash');
          this.lastImpact = time;
          emit('vehicle:impact', { vehicle: this, impact, x: c.x, z: c.z });
        }
      }
    }
  }

  damage(amount, cause) {
    if (this.wrecked) return;
    this.health -= amount / (this.spec.mass || 1);
    emit('vehicle:damaged', { vehicle: this, amount, cause });
  }

  explode() {
    this.wrecked = true;
    this.health = 0;
    this.burning = 12;
    this.vel.multiplyScalar(0.3);
    this.mesh.userData.body.material = this.mesh.userData.body.material.clone();
    this.mesh.userData.body.material.color.set('#2a2522');
    emit('vehicle:exploded', { vehicle: this });
  }

  sink() {
    this.wrecked = true;
    this.health = 0;
    emit('vehicle:sank', { vehicle: this });
  }

  syncMesh(dt, vF, time) {
    const m = this.mesh;
    m.position.copy(this.pos);
    m.rotation.set(0, -this.heading, 0);
    // body roll in turns and pitch under braking
    const roll = clamp(-this.yawRate * vF * 0.004, -0.08, 0.08);
    if (this.spec.bike) m.rotation.z = clamp(this.yawRate * vF * 0.03, -0.6, 0.6);
    else m.rotation.z = roll;
    this.wheelSpin += (vF / this.spec.wheelR) * dt;
    for (const w of m.userData.wheels) {
      w.userData.spin.rotation.x = -this.wheelSpin;
      w.rotation.y = w.userData.front ? -this.steer : 0;
    }
    const lb = m.userData.lightbar;
    if (lb.length) {
      const on = this.sirenOn ? (Math.floor(time * 6) % 2) : -1;
      lb[0].visible = on !== 1;
      lb[1].visible = on !== 0;
    }
  }

  // Side the driver's door is on, in world space, for enter/exit animations.
  doorPoint(side = -1) {
    const r = this.right();
    const off = this.spec.width / 2 + 0.7;
    return { x: this.pos.x + r.x * off * side, z: this.pos.z + r.z * off * side };
  }
}
