// Pedestrians: stroll sidewalk loops around blocks and the boardwalk, chat in pairs, flee from
// gunfire and speeding cars, get knocked down, and report crimes they witness.

import { buildHuman, poseHuman, randomOutfit } from './humanModel.js';
import { BLOCK, ROAD_HALF, blockLetter, isUrban } from '../world/cityPlan.js';
import { groundHeight } from '../world/groundHeight.js';
import { resolveCircle } from '../world/collisionWorld.js';
import { BOARDWALK } from '../props/beachfront.js';
import { on, emit } from '../core/events.js';
import { wrapAngle } from '../core/mathUtil.js';
import { rng as sharedRng } from '../core/rng.js';

let pedId = 1;

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
    this.flee(source?.x ?? this.pos.x, source?.z ?? this.pos.z, 10);
    return false;
  }

  flee(fromX, fromZ, time = 8) {
    if (!this.alive) return;
    this.state = 'flee';
    this.fleeTimer = time;
    this.heading = Math.atan2(this.pos.x - fromX, -(this.pos.z - fromZ)) + (sharedRng.next() - 0.5) * 0.8;
  }

  update(dt) {
    if (this.state === 'dead') {
      this.deadTimer += dt;
      poseHuman(this.rig, 'dead', 0, dt);
      this.rig.position.set(this.pos.x, this.pos.y + 0.14, this.pos.z);
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
      if (d < 0.8) this.route.shift();
      else {
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
  return [0, 1, 2, 3, 4].map((n) => corners[(k0 + n * dir) % 4]);
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
      if (l === 'S') return { x: (BOARDWALK.x0 + BOARDWALK.x1) / 2 + (this.rng.next() < 0.4 ? this.rng.next() * 30 : 0), z: pz };
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
      if (pt) this.spawnAt(pt.x, pt.z);
    }
  }
}
