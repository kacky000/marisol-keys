// MKPD dispatch: answers the wanted level with patrol cars that chase and ram, officers who bail
// out and shoot, roadblocks across the road ahead from three stars and the helicopter from four.

import * as THREE from 'three';
import { edges, nodes, lanePoint } from '../roads/roadNetwork.js';
import { PursuitDriver } from './pursuitDriver.js';
import { Gunman, POLICE_OUTFIT, NPC_DAMAGE } from '../combat/gunman.js';
import { Helicopter } from './helicopter.js';
import { WEAPONS } from '../combat/weaponDefs.js';
import { fireWeapon } from '../combat/gunplay.js';
import { raycastStatic } from '../world/collisionWorld.js';
import { emit, on } from '../core/events.js';
import { rng } from '../core/rng.js';

const CARS_FOR_STARS = [0, 2, 3, 4, 5, 6];

export class PoliceDispatch {
  constructor(scene, vehicles, wanted) {
    this.scene = scene;
    this.vehicles = vehicles;
    this.wanted = wanted;
    this.units = [];       // { vehicle, driver, crew: number }
    this.officers = [];
    this.heli = null;
    this.roadblocks = [];
    this.spawnTimer = 0;
    this.roadblockTimer = 8;
    this.bustTimer = 0;
    this.lastPlayerShot = -99;
    this.clock = 0;
    on('player:shot', () => { this.lastPlayerShot = this.clock; });
  }

  get people() { return this.officers; }

  spawnUnit(player, near = false) {
    const px = player.pos.x, pz = player.pos.z;
    const ring = edges.filter((e) => {
      if (e.kind !== 'street') return false;
      const d = Math.hypot((e.ax + e.bx) / 2 - px, (e.az + e.bz) / 2 - pz);
      return near ? d > 40 && d < 90 : d > 110 && d < 200;
    });
    if (!ring.length) return null;
    const e = ring[Math.floor(rng.next() * ring.length)];
    const a = nodes.get(e.a), b = nodes.get(e.b);
    const p = lanePoint(a, b, 1, e.len * 0.5);
    const v = this.vehicles.spawn('police', p.x, p.z, p.heading);
    v.persistent = true;
    const driver = new PursuitDriver(v);
    v.driver = driver;
    this.units.push({ vehicle: v, driver, crew: this.wanted.stars >= 4 ? 2 : 1 });
    return v;
  }

  spawnOfficer(x, z, heading = 0) {
    const o = new Gunman(this.scene, x, z, POLICE_OUTFIT, 'police', this.wanted.stars >= 4 ? 'smg' : 'pistol');
    o.heading = heading;
    // low-level pursuits try to make an arrest; from three stars they come out shooting
    o.mode = this.wanted.stars >= 3 ? 'attack' : 'arrest';
    this.officers.push(o);
    return o;
  }

  // Two cruisers parked across a street ahead of the player, officers behind them.
  placeRoadblock(player) {
    const v = player.vehicle;
    const f = v ? v.forward() : { x: Math.sin(player.heading), z: -Math.cos(player.heading) };
    const ax = player.pos.x + f.x * 120, az = player.pos.z + f.z * 120;
    let best = null, bd = Infinity;
    for (const n of nodes.values()) {
      if (n.id.startsWith('cw')) continue;
      const d = (n.x - ax) ** 2 + (n.z - az) ** 2;
      if (d < bd) { bd = d; best = n; }
    }
    if (!best) return;
    const horizontal = Math.abs(f.x) > Math.abs(f.z);
    const side = horizontal ? -Math.sign(f.x) : -Math.sign(f.z);
    const cx = best.x + (horizontal ? side * 14 : 0), cz = best.z + (horizontal ? 0 : side * 14);
    const block = { cars: [], timer: 40 };
    for (const s of [-1, 1]) {
      const x = cx + (horizontal ? 0 : s * 3.2), z = cz + (horizontal ? s * 3.2 : 0);
      const car = this.vehicles.spawn('police', x, z, (horizontal ? 0 : Math.PI / 2) + s * 0.35);
      car.persistent = true;
      car.sirenOn = true;
      block.cars.push(car);
      const ox = x + (horizontal ? side * 3 : 0), oz = z + (horizontal ? 0 : side * 3);
      this.spawnOfficer(ox, oz);
    }
    // a spike strip across the whole road, a little before the cruisers
    const sx = cx + (horizontal ? side * 9 : 0), sz = cz + (horizontal ? 0 : side * 9);
    block.strip = this.makeSpikeStrip(sx, sz, horizontal);
    this.roadblocks.push(block);
    emit('police:roadblock', { x: cx, z: cz });
  }

  makeSpikeStrip(x, z, horizontal) {
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 14), new THREE.MeshStandardMaterial({ color: '#2a2a2e', roughness: 0.6 }));
    g.add(base);
    const spikeMat = new THREE.MeshStandardMaterial({ color: '#d8dde3', metalness: 0.9, roughness: 0.25 });
    for (let k = -6.6; k <= 6.6; k += 0.6) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 4), spikeMat);
      spike.position.set(0, 0.1, k);
      g.add(spike);
    }
    g.position.set(x, 0.05, z);
    g.rotation.y = horizontal ? 0 : Math.PI / 2;
    this.scene.add(g);
    return { mesh: g, x, z, horizontal };
  }

  // Bursts the tyres of the player's car when it rolls over a strip.
  checkSpikeStrips(player) {
    const v = player.vehicle;
    if (!v || v.tyresBurst || v.spec.boat) return;
    for (const b of this.roadblocks) {
      const s = b.strip;
      if (!s) continue;
      const along = s.horizontal ? Math.abs(v.pos.x - s.x) : Math.abs(v.pos.z - s.z);
      const across = s.horizontal ? Math.abs(v.pos.z - s.z) : Math.abs(v.pos.x - s.x);
      if (along < 1.2 && across < 7) {
        v.tyresBurst = true;
        emit('sound', { name: 'crash' });
        emit('hud:prompt', { html: '<b>Tyres shredded</b> by a spike strip — Sunbelt Garage can fix them' });
      }
    }
  }

  canAnyoneSee(player) {
    const t = player.pos;
    const look = (x, y, z, range) => {
      const dx = t.x - x, dy = t.y + 1 - y, dz = t.z - z;
      const d = Math.hypot(dx, dy, dz);
      if (d > range) return false;
      return raycastStatic(x, y, z, dx / d, dy / d, dz / d, d) >= d - 1;
    };
    if (this.heli && look(this.heli.pos.x, this.heli.pos.y - 2, this.heli.pos.z, 140)) return true;
    for (const u of this.units) if (!u.vehicle.wrecked && look(u.vehicle.pos.x, 1.6, u.vehicle.pos.z, 75)) return true;
    for (const o of this.officers) if (o.alive && look(o.pos.x, 1.6, o.pos.z, 55)) return true;
    return false;
  }

  update(dt, time, player, targets, fx) {
    this.clock = time;
    const stars = this.wanted.stars;
    // dispatch more units as the level rises
    this.spawnTimer -= dt;
    const active = this.units.filter((u) => !u.vehicle.wrecked && !u.vehicle.removed).length;
    if (stars > 0 && active < CARS_FOR_STARS[stars] && this.spawnTimer <= 0) {
      this.spawnTimer = 3.5;
      this.spawnUnit(player);
    }
    if (stars >= 3) {
      this.roadblockTimer -= dt;
      if (this.roadblockTimer <= 0 && player.vehicle) { this.roadblockTimer = 28; this.placeRoadblock(player); }
    }
    if (stars >= 4 && !this.heli) this.heli = new Helicopter(this.scene, player.pos.x + 80, player.pos.z - 80);
    if (stars < 4 && this.heli) { this.heli.dispose(); this.heli = null; }

    const known = this.wanted.seen ? player.pos : (stars > 0 ? { x: this.wanted.zone.x, z: this.wanted.zone.z } : null);
    for (const u of this.units) {
      const v = u.vehicle;
      if (v.removed) continue;
      if (stars === 0) { v.sirenOn = false; v.input.throttle = 0; v.input.brake = 0.5; continue; }
      if (v.driver === u.driver) {
        u.driver.update(dt, player, known);
        // officers bail out next to an on-foot suspect
        if (u.driver.parked && u.crew > 0) {
          for (let k = 0; k < u.crew; k++) {
            const d = v.doorPoint(k ? 1 : -1);
            this.spawnOfficer(d.x, d.z, v.heading);
          }
          u.crew = 0;
          v.driver = null;
          v.input.throttle = 0; v.input.brake = 1;
        }
      }
    }
    const hostile = stars >= 3 || time - this.lastPlayerShot < 6;
    const ctx = { player, targets, fx, alert: false, hostile, onShot: () => emit('sound', { name: 'pistol-far' }) };
    for (const o of this.officers) {
      if (stars === 0 && o.alive) { o.mode = 'guard'; }
      else if (o.mode === 'guard') o.mode = hostile ? 'attack' : 'arrest';
      o.think(dt, ctx);
    }
    if (this.heli) {
      this.heli.update(dt, time, player, stars, (h) => {
        const origin = new THREE.Vector3(h.pos.x, h.pos.y - 1.5, h.pos.z);
        const aim = new THREE.Vector3(player.pos.x + (rng.next() - 0.5) * 3, player.pos.y + 1, player.pos.z + (rng.next() - 0.5) * 3);
        fireWeapon({ ...WEAPONS.smg, damage: WEAPONS.smg.damage * NPC_DAMAGE }, origin, aim.sub(origin).normalize(), { team: 'police', pos: h.pos }, targets, fx);
      });
    }
    // busted: an officer right next to a slow suspect on foot
    let close = false;
    if (stars > 0 && !player.vehicle && player.alive) {
      for (const o of this.officers) if (o.alive && Math.hypot(o.pos.x - player.pos.x, o.pos.z - player.pos.z) < 2.6) close = true;
    }
    this.bustTimer = close && player.speedNow < 4 ? this.bustTimer + dt : 0;
    if (this.bustTimer > 2.2) { this.bustTimer = 0; emit('player:down', { cause: 'busted' }); }

    // tidy up: far, dead or no longer needed units
    this.checkSpikeStrips(player);
    this.cleanup(player, stars);
  }

  cleanup(player, stars) {
    const far = (p, r) => (p.x - player.pos.x) ** 2 + (p.z - player.pos.z) ** 2 > r * r;
    this.units = this.units.filter((u) => {
      if (u.vehicle.removed) return false;
      if (far(u.vehicle.pos, stars ? 320 : 160) && u.vehicle !== player.vehicle) { this.vehicles.remove(u.vehicle); return false; }
      return true;
    });
    this.officers = this.officers.filter((o) => {
      if (far(o.pos, stars ? 200 : 120) || (!o.alive && o.deadTimer > 30)) { o.dispose(); return false; }
      if (!o.alive) o.deadTimer += 0.016;
      return true;
    });
    for (const b of this.roadblocks) b.timer -= 0.016;
    this.roadblocks = this.roadblocks.filter((b) => {
      if (b.timer > 0 && stars > 0) return true;
      for (const c of b.cars) if (c !== player.vehicle && far(c.pos, 60)) this.vehicles.remove(c);
      if (b.strip) this.scene.remove(b.strip.mesh);
      return false;
    });
  }

  clearAll(player) {
    for (const u of this.units) if (u.vehicle !== player.vehicle) this.vehicles.remove(u.vehicle);
    for (const o of this.officers) o.dispose();
    for (const b of this.roadblocks) {
      for (const c of b.cars) if (c !== player.vehicle) this.vehicles.remove(c);
      if (b.strip) this.scene.remove(b.strip.mesh);
    }
    this.units = []; this.officers = []; this.roadblocks = [];
    if (this.heli) { this.heli.dispose(); this.heli = null; }
  }
}
