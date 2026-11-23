// Pedestrians: stroll sidewalk loops around blocks and the boardwalk, chat in pairs, flee from
// gunfire and speeding cars, get knocked down, and report crimes they witness.

import * as THREE from 'three';
import { buildHuman, poseHuman, randomOutfit } from './humanModel.js';
import { BLOCK, ROAD_HALF, blockLetter, isUrban } from '../world/cityPlan.js';
import { groundHeight } from '../world/groundHeight.js';
import { resolveCircle } from '../world/collisionWorld.js';
import { BOARDWALK } from '../props/beachfront.js';
import { on, emit } from '../core/events.js';
import { wrapAngle } from '../core/mathUtil.js';
import { rng as sharedRng } from '../core/rng.js';
import { nodes, lightFor } from '../roads/roadNetwork.js';

let pedId = 1;
export const pedClock = { time: 0 };   // game time, for reading the crossing lights
const PHONE_GEO = new THREE.BoxGeometry(0.07, 0.14, 0.02);
const PHONE_MAT = new THREE.MeshStandardMaterial({ color: '#111', emissive: '#4cc9f0', emissiveIntensity: 0.4 });

export class Ped {
  constructor(scene, x, z, outfit, kind = 'civilian') {
    this.id = pedId++;
    this.kind = kind;
    this.outfit = outfit;
    this.rig = buildHuman(outfit);
    this.pos = { x, y: groundHeight(x, z), z };
    this.heading = 0;
    this.state = 'walk';
    this.health = 100;
    this.speed = 1.4;
    this.route = [];
    this.fleeTimer = 0;
    this.deadTimer = 0;
    this.scene = scene;
    scene.add(this.rig);
  }

  get alive() { return this.state !== 'dead'; }

  hurt(amount, source) {
    if (!this.alive) return false;
    this.health -= amount;
    if (this.health <= 0) {
      this.state = 'dead';
      this.deadTimer = 0;
      emit('ped:killed', { ped: this, source });
      return true;
    }
    // about a third of the people Tessa punches put their fists up and swing back
    if (source?.melee && this.kind === 'civilian' && this.id % 3 === 0 && source.shooter) {
      this.state = 'brawl';
      this.brawl = { foe: source.shooter, t: 9, swing: 0.6 };
      return false;
    }
    this.flee(source?.x ?? this.pos.x, source?.z ?? this.pos.z, 10);
    return false;
  }

  // Close in and trade punches until the time runs out or the foe goes down.
  updateBrawl(dt) {
    const b = this.brawl, foe = b.foe;
    b.t -= dt;
    b.swing -= dt;
    const dx = foe.pos.x - this.pos.x, dz = foe.pos.z - this.pos.z, d = Math.hypot(dx, dz);
    this.heading = Math.atan2(dx, -dz);
    let moving = 0;
    if (d > 1.2) { moving = 3.4; this.pos.x += (dx / d) * moving * dt; this.pos.z += (dz / d) * moving * dt; resolveCircle(this.pos, 0.35, this.pos.y); }
    poseHuman(this.rig, moving ? 'run' : 'idle', moving, dt);
    // guard up, and a jab when in reach
    const u = this.rig.userData;
    u.arms[0].rotation.set(1.3, 0, 0.4);
    u.arms[1].rotation.set(b.swing < 0.15 ? 1.7 : 1.1, 0, -0.3);
    if (d < 1.5 && b.swing <= 0 && foe.alive && !foe.vehicle) {
      b.swing = 0.9;
      foe.hurt(7, { x: this.pos.x, z: this.pos.z, melee: true });
      emit('sound', { name: 'punch' });
    }
    if (b.t <= 0 || !foe.alive || foe.vehicle) { this.state = 'walk'; this.brawl = null; this.route.length = 0; }
    this.rig.position.set(this.pos.x, this.pos.y, this.pos.z);
    this.rig.rotation.y = -this.heading;
  }

  flee(fromX, fromZ, time = 8) {
    if (!this.alive || this.state === 'wade') return; // swimmers duck under the waves instead
    this.state = 'flee';
    this.fleeTimer = time;
    this.heading = Math.atan2(this.pos.x - fromX, -(this.pos.z - fromZ)) + (sharedRng.next() - 0.5) * 0.8;
  }

  update(dt) {
    if (this.fling) {
      // thrown by a car: fly, tumble, land
      const f = this.fling;
      f.t += dt;
      f.vy -= 18 * dt;
      this.pos.x += f.vx * dt; this.pos.z += f.vz * dt; this.pos.y += f.vy * dt;
      resolveCircle(this.pos, 0.35, this.pos.y);
      const gy = groundHeight(this.pos.x, this.pos.z);
      poseHuman(this.rig, 'flee', 3, dt);
      this.rig.position.set(this.pos.x, this.pos.y, this.pos.z);
      this.rig.rotation.set(-f.t * 7, -this.heading, 0, 'YXZ');
      if (this.pos.y <= gy && f.vy < 0) { this.pos.y = gy; this.fling = null; this.rig.rotation.set(0, 0, 0); }
      return;
    }
    if (this.state === 'dead') {
      this.deadTimer += dt;
      poseHuman(this.rig, 'dead', 0, dt);
      this.rig.position.set(this.pos.x, this.pos.y + 0.14, this.pos.z);
      this.rig.rotation.y = -this.heading;
      return;
    }
    if (this.state === 'brawl') { this.updateBrawl(dt); return; }
    if (this.state === 'wade') {
      // standing in the surf, bobbing with the swell, arms out for balance
      this.phase = (this.phase || 0) + dt;
      poseHuman(this.rig, 'idle', 0, dt);
      this.rig.userData.arms[0].rotation.set(0.3, 0, -0.9 - Math.sin(this.phase * 1.3) * 0.2);
      this.rig.userData.arms[1].rotation.set(0.3, 0, 0.9 + Math.sin(this.phase * 1.3) * 0.2);
      this.rig.position.set(this.pos.x, this.pos.y + Math.sin(this.phase * 1.6) * 0.08, this.pos.z);
      this.rig.rotation.y = -this.heading;
      return;
    }
    if (this.state === 'sunbathe') {
      poseHuman(this.rig, 'sunbathe', 0, dt);
      this.rig.position.set(this.pos.x, this.pos.y + 0.12, this.pos.z);
      this.rig.rotation.y = -this.heading;
      return;
    }
    let moving = 0;
    if (this.state === 'flee') {
      this.fleeTimer -= dt;
      moving = 5.2;
      if (this.fleeTimer <= 0) { this.state = 'walk'; this.route.length = 0; }
    } else if (this.state === 'walk') {
      if (!this.route.length) this.route = planStroll(this.pos.x, this.pos.z, sharedRng.next);
      const t = this.route[0];
      const dx = t.x - this.pos.x, dz = t.z - this.pos.z;
      const d = Math.hypot(dx, dz);
      // at the kerb: wait for the traffic on this road to be held at red
      const node = t.cross && nodes.get(t.cross.node);
      const waiting = node && !this.crossing && lightFor(node, t.cross.axis, pedClock.time) !== 'red';
      if (d < 0.8) { this.route.shift(); this.crossing = false; }
      else if (waiting) { this.heading += wrapAngle(Math.atan2(dx, -dz) - this.heading) * Math.min(1, dt * 6); }
      else {
        if (t.cross) this.crossing = true;
        const want = Math.atan2(dx, -dz);
        this.heading += wrapAngle(want - this.heading) * Math.min(1, dt * 6);
        moving = this.speed;
      }
    } else if (this.state === 'idle') {
      this.idleTimer -= dt;
      if (this.idleTimer <= 0) this.state = 'walk';
    }
    if (moving) {
      this.pos.x += Math.sin(this.heading) * moving * dt;
      this.pos.z += -Math.cos(this.heading) * moving * dt;
      const hit = resolveCircle(this.pos, 0.35, this.pos.y);
      if (hit && this.state === 'flee') this.heading += 1.2;
      const gy = groundHeight(this.pos.x, this.pos.z);
      if (gy < -0.6) { this.pos.x -= Math.sin(this.heading) * moving * dt * 2; this.pos.z += Math.cos(this.heading) * moving * dt * 2; this.heading += Math.PI * 0.7; }
      else this.pos.y += (gy - this.pos.y) * Math.min(1, dt * 10);
    }
    poseHuman(this.rig, this.state === 'flee' ? 'flee' : moving ? 'walk' : 'idle', moving, dt);
    // some people are glued to their phones: a call at the ear, or a screen held low
    if (this.state !== 'flee' && this.id % 4 === 1) {
      const arm = this.rig.userData.arms[1];
      if (moving) arm.rotation.set(1.0, 0, 0.45); else arm.rotation.set(2.4, 0, 0.9);
      if (!this.phone) {
        this.phone = new THREE.Mesh(PHONE_GEO, PHONE_MAT);
        this.phone.position.set(0, -0.68, -0.05);
        arm.add(this.phone);
      }
    }
    this.rig.position.set(this.pos.x, this.pos.y, this.pos.z);
    this.rig.rotation.y = -this.heading;
  }

  dispose() { this.scene.remove(this.rig); }
}

// A route around the sidewalk ring of the block the ped stands in (or along the boardwalk).
export function planStroll(x, z, rand) {
  const i = Math.floor(x / BLOCK), j = Math.floor(z / BLOCK);
  const l = blockLetter(i, j);
  if (l === 'S') {
    const bx = (BOARDWALK.x0 + BOARDWALK.x1) / 2 + (rand() - 0.5) * 6;
    const dir = rand() < 0.5 ? -1 : 1;
    const pts = [];
    for (let k = 1; k <= 4; k++) {
      const zz = z + dir * k * 14;
      if (blockLetter(i, Math.floor(zz / BLOCK)) !== 'S') break;
      pts.push({ x: rand() < 0.3 ? i * BLOCK + 20 + rand() * 30 : bx, z: zz });
    }
    return pts.length ? pts : [{ x: bx, z: z - dir * 14 }];
  }
  const inset = ROAD_HALF + 2;
  const x0 = i * BLOCK + inset, x1 = (i + 1) * BLOCK - inset, z0 = j * BLOCK + inset, z1 = (j + 1) * BLOCK - inset;
  const corners = [{ x: x0, z: z0 }, { x: x1, z: z0 }, { x: x1, z: z1 }, { x: x0, z: z1 }];
  // nearest corner, then go round
  let k0 = 0, best = Infinity;
  corners.forEach((c, k) => { const d = (c.x - x) ** 2 + (c.z - z) ** 2; if (d < best) { best = d; k0 = k; } });
  const dir = rand() < 0.5 ? 1 : 3;
  const route = [0, 1, 2, 3].map((n) => ({ ...corners[(k0 + n * dir) % 4] }));
  // then, half the time, use the zebra crossing at the last corner to reach the next block
  const end = route[route.length - 1];
  if (rand() < 0.6) {
    const acrossX = rand() < 0.5;
    const east = end.x > i * BLOCK + BLOCK / 2, south = end.z > j * BLOCK + BLOCK / 2;
    const ni = acrossX ? i + (east ? 1 : -1) : i, nj = acrossX ? j : j + (south ? 1 : -1);
    if (isUrban(blockLetter(ni, nj))) {
      const roadX = (east ? i + 1 : i) * BLOCK, roadZ = (south ? j + 1 : j) * BLOCK;
      const target = acrossX ? { x: roadX + (east ? inset : -inset), z: end.z } : { x: end.x, z: roadZ + (south ? inset : -inset) };
      // crossing a north-south road means waiting for that road's traffic to get a red light
      target.cross = { node: `${Math.round(roadX / BLOCK)},${Math.round(roadZ / BLOCK)}`, axis: acrossX ? 'ns' : 'ew' };
      route.push(target);
    }
  }
  return route;
}

const BUSY = { A: 1.4, S: 1.6, D: 1.2, R: 0.8, C: 1.0, P: 0.9, H: 0.25, V: 0.3 };

export class PedSystem {
  constructor(scene, rng) {
    this.scene = scene;
    this.rng = rng;
    this.peds = [];
    this.target = 34;
    this.timer = 0;
    on('gunfire', ({ x, z }) => this.panic(x, z, 45));
    on('explosion', ({ x, z }) => this.panic(x, z, 60));
  }

  panic(x, z, r) {
    for (const p of this.peds) if (p.alive && p.kind === 'civilian' && (p.pos.x - x) ** 2 + (p.pos.z - z) ** 2 < r * r) p.flee(x, z, 9);
  }

  spawnAt(x, z, outfit = null) {
    const p = new Ped(this.scene, x, z, outfit || randomOutfit(this.rng));
    p.speed = 1.1 + this.rng.next() * 0.7;
    p.heading = this.rng.next() * 6.28;
    this.peds.push(p);
    return p;
  }

  remove(p) {
    p.dispose();
    const i = this.peds.indexOf(p);
    if (i >= 0) this.peds.splice(i, 1);
  }

  // Sidewalk or beach point near (x, z) at a distance between rMin and rMax.
  findSpawnPoint(x, z, rMin, rMax) {
    for (let tries = 0; tries < 12; tries++) {
      const a = this.rng.next() * Math.PI * 2, r = rMin + this.rng.next() * (rMax - rMin);
      const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
      const i = Math.floor(px / BLOCK), j = Math.floor(pz / BLOCK);
      const l = blockLetter(i, j);
      if (!isUrban(l) && l !== 'S') continue;
      if (this.rng.next() > (BUSY[l] || 0.5)) continue;
      if (l === 'S') {
        if (this.rng.next() < 0.35) return { x: i * BLOCK + 24 + this.rng.next() * 30, z: pz, sunbathe: true };
        if (this.rng.next() < 0.25) return { x: (i + 1) * BLOCK + 3 + this.rng.next() * 9, z: pz, wade: true };
        return { x: (BOARDWALK.x0 + BOARDWALK.x1) / 2 + (this.rng.next() < 0.4 ? this.rng.next() * 30 : 0), z: pz };
      }
      // snap to the sidewalk ring
      const lx = px - i * BLOCK, lz = pz - j * BLOCK;
      const inset = ROAD_HALF + 2;
      const snapX = lx < BLOCK / 2 ? inset : BLOCK - inset, snapZ = lz < BLOCK / 2 ? inset : BLOCK - inset;
      return this.rng.next() < 0.5 ? { x: i * BLOCK + snapX, z: pz } : { x: px, z: j * BLOCK + snapZ };
    }
    return null;
  }

  update(dt, player, vehicles) {
    const px = player.pos.x, pz = player.pos.z;
    for (const p of [...this.peds]) {
      p.update(dt);
      const d2 = (p.pos.x - px) ** 2 + (p.pos.z - pz) ** 2;
      if (!p.persistent && (d2 > 190 * 190 || (!p.alive && p.deadTimer > 40))) this.remove(p);
    }
    // run-overs and dodging speeding cars
    for (const v of vehicles.list) {
      const sp = Math.abs(v.speed);
      if (sp < 3) continue;
      const f = v.forward();
      for (const p of this.peds) {
        if (!p.alive) continue;
        const dx = p.pos.x - v.pos.x, dz = p.pos.z - v.pos.z;
        const along = dx * f.x + dz * f.z, side = Math.abs(dx * -f.z + dz * f.x);
        if (Math.abs(along) < v.spec.len / 2 + 0.3 && side < v.spec.width / 2 + 0.3) {
          p.pos.x += f.x * 1.5; p.pos.z += f.z * 1.5;
          p.heading = Math.atan2(f.x, -f.z);
          // thrown ahead of the bumper, faster cars throw further and higher
          if (sp > 7) p.fling = { vx: v.vel.x * 0.7, vz: v.vel.y * 0.7, vy: 2 + sp * 0.18, t: 0 };
          p.hurt(sp * 9, { x: v.pos.x, z: v.pos.z, vehicle: v, byPlayer: v === player.vehicle });
          emit('ped:runover', { ped: p, vehicle: v });
        } else if (along > 0 && along < 14 && side < 3 && p.state !== 'flee' && v === player.vehicle && sp > 8) {
          p.flee(v.pos.x, v.pos.z, 3);
        }
      }
    }
    this.timer -= dt;
    if (this.timer <= 0 && this.peds.filter((p) => p.kind === 'civilian').length < this.target) {
      this.timer = 0.2;
      const pt = this.findSpawnPoint(px, pz, 35, 140);
      if (pt) {
        const ped = this.spawnAt(pt.x, pt.z);
        if (pt.sunbathe) { ped.state = 'sunbathe'; ped.outfit.shorts = true; }
        if (pt.wade) { ped.state = 'wade'; ped.heading = Math.PI / 2 + (this.rng.next() - 0.5); }
      }
    }
  }
}
