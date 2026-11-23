// Scripted screenshot scenes built from the real game systems: each one places the player, cars,
// police, people and HUD state, steps the simulation, then frames the camera.

import * as THREE from 'three';
import { Gunman, GANG_OUTFITS } from '../combat/gunman.js';
import { Marker } from '../missions/markers.js';
import { PursuitDriver } from '../police/pursuitDriver.js';
import { Helicopter } from '../police/helicopter.js';
import { LaneDriver } from '../traffic/laneDriver.js';
import { WEAPONS } from '../combat/weaponDefs.js';
import { fireWeapon } from '../combat/gunplay.js';
import { STORY } from '../missions/storyMissions.js';
import { randomOutfit, poseHuman } from '../peds/humanModel.js';
import { rng } from '../core/rng.js';

const B = 64;

function car(game, type, x, z, heading, speed = 0, paint) {
  const v = game.vehicles.spawn(type, x, z, heading, { paint, rng });
  v.vel.set(Math.sin(heading) * speed, -Math.cos(heading) * speed);
  v.persistent = true;
  return v;
}

// Two tyre streaks running back from a car's rear wheels, bending sideways by `bend` metres.
function skidTrail(game, v, bend, length = 16) {
  const f = v.forward(), r = v.right();
  const track = v.spec.width * 0.4, back = v.spec.len * 0.34;
  for (const side of [-1, 1]) {
    let prev = null;
    for (let s = 0; s <= length; s += 1) {
      const sway = bend * (s / length) ** 2;
      const x = v.pos.x - f.x * (back + s) + r.x * (side * track + sway);
      const z = v.pos.z - f.z * (back + s) + r.z * (side * track + sway);
      const pt = { x, y: 0.035, z, rx: r.x, rz: r.z };
      if (prev) game.fx.skids.quad(prev, pt);
      prev = pt;
    }
  }
}

function seatPlayer(game, v) {
  const p = game.player;
  p.vehicle = v;
  v.driver = 'player';
  p.rig.visible = false;
  p.pos.copy(v.pos);
  p.heading = v.heading;
}

function cops(game, list) {
  for (const [x, z, h, sp] of list) {
    const v = car(game, 'police', x, z, h, sp);
    const d = new PursuitDriver(v);
    v.driver = d;
    game.police.units.push({ vehicle: v, driver: d, crew: 0 });
  }
}

function crowd(game, points) {
  for (const [x, z, h, state] of points) {
    const ped = game.peds.spawnAt(x, z, randomOutfit(rng));
    ped.heading = h;
    ped.persistent = true;
    if (state === 'idle') { ped.state = 'idle'; ped.idleTimer = 99; }
    if (state === 'flee') ped.flee(x - Math.sin(h) * 5, z + Math.cos(h) * 5, 99);
    if (state === 'sunbathe') ped.state = 'sunbathe';
    if (state === 'wade') ped.state = 'wade';
  }
}

// A civilian car driving its lane on the east-west street j, at world x, westbound or eastbound.
function streetCar(game, type, j, x, westbound, lane, speed = 10) {
  const i0 = Math.floor(x / B), i1 = i0 + 1;
  const from = westbound ? `${i1},${j}` : `${i0},${j}`, to = westbound ? `${i0},${j}` : `${i1},${j}`;
  const off = [1.9, 5.1][lane];
  const z = j * B + (westbound ? -off : off);
  const v = car(game, type, x, z, westbound ? -Math.PI / 2 : Math.PI / 2, speed);
  const d = new LaneDriver(v, from, to, lane, westbound ? i1 * B - x : x - i0 * B, rng);
  v.driver = d;
  game.traffic.drivers.set(v, d);
  return v;
}

export const SCENES = {
  // 1b. Westbound on Sundown Boulevard into the setting sun, Glasswater towers ahead.
  sunset: {
    hour: 18.25,
    setup(game) {
      game.peds.target = 0;
      game.traffic.target = 0;
      const pv = car(game, 'sports', 11 * B + 34, 4 * B - 3.4, -Math.PI / 2, 34, '#ff3f8e');
      seatPlayer(game, pv);
      game.player.autoDrive = { throttle: 1, brake: 0, steer: 0, handbrake: false };
      cops(game, [[11 * B + 38, 4 * B + 2.5, -Math.PI / 2, 34], [11 * B + 44, 4 * B - 3, -Math.PI / 2, 34], [11 * B + 60, 4 * B + 2, -Math.PI / 2, 34]]);
      streetCar(game, 'taxi', 4, 10 * B + 30, true, 1, 9);
      streetCar(game, 'sedan', 4, 9 * B + 50, true, 0, 9);
      streetCar(game, 'bus', 4, 10 * B + 6, false, 1, 8);
      streetCar(game, 'pickup', 4, 9 * B + 30, false, 0, 10);
      streetCar(game, 'van', 4, 8 * B + 50, true, 1, 9);
      streetCar(game, 'sedan', 4, 11 * B + 8, true, 1, 8);
      streetCar(game, 'bike', 4, 10 * B + 52, false, 0, 9);
      streetCar(game, 'taxi', 4, 10 * B + 44, false, 1, 9);
      streetCar(game, 'convertible', 4, 10 * B + 28, false, 0, 9);
      streetCar(game, 'convertible', 4, 9 * B + 62, true, 0, 9);
      crowd(game, [[11 * B + 8, 4 * B - 9, -1.6, 'flee'], [11 * B + 4, 4 * B - 9.5, 1.6, 'flee'], [11 * B + 2, 4 * B + 9.2, -1.5, 'idle'], [11 * B + 3, 4 * B + 9.6, 1.6, 'idle'],
        [11 * B + 18, 4 * B - 9, -1.6, 'walk'], [11 * B + 12, 4 * B + 9, 1.5, 'walk'], [10 * B + 56, 4 * B - 9.3, -1.6, 'walk'], [10 * B + 50, 4 * B + 9.5, -1.4, 'flee']]);
      game.wanted.setStars(4);
      game.wanted.minimumStars = 4;
      game.police.heli = new Helicopter(game.scene, 10 * B, 4 * B - 20);
      game.state.story = 9; // the final mission, Causeway Run
      game.state.money = 48250;
      game.hud.setObjective('CAUSEWAY RUN', 'Cross <b>Pelican Causeway</b> to the mainland');
    },
    steps: 24,
    finalize(game) {
      const p = game.player.vehicle;
      const units = game.police.units.map((u) => u.vehicle);
      const spots = [[p.pos.x + 3.2, 4 * B + 2.4, -Math.PI / 2 + 0.07], [p.pos.x + 5.6, p.pos.z - 3.1, -Math.PI / 2 - 0.06], [p.pos.x + 19, 4 * B + 3.2, -Math.PI / 2]];
      units.forEach((v, k) => { if (spots[k]) { v.pos.set(spots[k][0], v.pos.y, spots[k][1]); v.heading = spots[k][2]; v.syncMesh(0.016, 34, game.time); } });
      const h = game.police.heli;
      h.pos.set(p.pos.x - 22, 14.5, p.pos.z + 3);
      h.update(0.016, game.time, game.player, 4, () => {});
      h.pos.set(p.pos.x - 22, 14.5, p.pos.z + 3);
      h.mesh.position.copy(h.pos);
      game.wanted.zone = { x: p.pos.x, z: p.pos.z, r: game.wanted.zoneRadius() };
      game.wanted.seen = true;
      // a cab that lost an argument with a cruiser burns on the kerb ahead, smoke rising into the sunset
      const wreck = car(game, 'taxi', p.pos.x - 21, 4 * B + 7.6, -Math.PI / 2 + 0.7, 0);
      wreck.wrecked = true; wreck.health = 0;
      wreck.mesh.userData.body.material = wreck.mesh.userData.body.material.clone();
      wreck.mesh.userData.body.material.color.set('#3a3330');
      wreck.syncMesh(0.016, 0, game.time);
      for (let k = 0; k < 26; k++) {
        const up = k * 0.55;
        game.fx.particles.smoke.emit({ x: wreck.pos.x + up * 0.3 + (rng.next() - 0.5), y: 1.4 + up * 1.1, z: wreck.pos.z + up * 0.35, vy: 0.5, life: 3, size: 2.6 + up * 0.7, grow: 0, color: '#4a423e', alpha: 0.6 - k * 0.018 });
      }
      for (let k = 0; k < 14; k++) game.fx.particles.fire(wreck.pos.x, wreck.pos.y + 1, wreck.pos.z);
      // tyre smoke kicked up behind the racing cars
      for (const v of [p, ...units.slice(0, 2)]) {
        const f = v.forward(), r = v.right();
        for (let k = 0; k < 7; k++) {
          for (const s of [-1, 1]) {
            game.fx.particles.smoke.emit({ x: v.pos.x - f.x * (v.spec.len * 0.5 + k * 0.9) + r.x * s * 0.8, y: 0.35 + k * 0.05, z: v.pos.z - f.z * (v.spec.len * 0.5 + k * 0.9) + r.z * s * 0.8,
              vy: 0.4, life: 1.4, size: 0.7 + k * 0.25, grow: 0, color: '#e8dccb', alpha: 0.26 - k * 0.03 });
          }
        }
      }
      // rubber from the swerves that got everyone here, curving back toward the camera
      [[p, 0.9], [units[0], -1.4], [units[1], 1.2]].forEach(([v, bend]) => { if (v) skidTrail(game, v, bend); });
      game.fx.particles.update(0.05);
      game.hud.showDistrict({ name: 'Pastel Mile', sub: 'SUNDOWN BOULEVARD' });
      game.dispatch.show('Air One is up. Suspect westbound on Sundown Boulevard, all units converge.');
      const q = new URLSearchParams(location.search);
      const back = Number(q.get('back') || 12.5), up = Number(q.get('up') || 4.3);
      return { pos: new THREE.Vector3(p.pos.x + back, up, p.pos.z + 0.9), look: new THREE.Vector3(p.pos.x - 30, 2.6, p.pos.z + 0.2), roll: -0.045 };
    },
  },

  // 1. Golden-hour police chase up Marisol Boulevard toward the Glasswater towers.
  cover: {
    hour: 17.75,
    setup(game) {
      game.peds.target = 0;
      game.traffic.target = 0;
      const pv = car(game, 'sports', 10 * B + 3.4, 11 * B + 52, 0, 34, '#19c3b4');
      seatPlayer(game, pv);
      game.player.autoDrive = { throttle: 1, brake: 0, steer: 0.0, handbrake: false };
      cops(game, [[10 * B - 2.4, 11 * B + 56.5, 0.05, 34], [10 * B + 6.6, 11 * B + 58, -0.05, 34], [10 * B + 0.5, 12 * B + 18, 0, 34]]);
      // civilian traffic ahead, both directions
      for (const [x, z, h, t] of [[10 * B + 5.1, 10 * B + 20, 0, 'taxi'], [10 * B - 1.9, 9 * B + 40, Math.PI, 'sedan'], [10 * B - 5.1, 10 * B + 2, Math.PI, 'bus'], [10 * B + 1.9, 9 * B + 20, 0, 'pickup'], [10 * B - 1.9, 8 * B + 30, Math.PI, 'sedan'], [10 * B + 5.1, 8 * B + 10, 0, 'van']]) {
        const v = car(game, t, x, z, h, 9);
        const fwd = h === 0;
        const d = new LaneDriver(v, fwd ? `10,${Math.ceil(z / B)}` : `10,${Math.floor(z / B)}`, fwd ? `10,${Math.floor(z / B)}` : `10,${Math.ceil(z / B)}`, Math.abs(x - 10 * B) > 3.5 ? 1 : 0, (fwd ? Math.ceil(z / B) * B - z : z - Math.floor(z / B) * B), rng);
        v.driver = d;
        game.traffic.drivers.set(v, d);
      }
      crowd(game, [[10 * B + 9, 10 * B + 34, Math.PI, 'flee'], [10 * B + 9.5, 10 * B + 44, 0.4, 'flee'], [10 * B - 9, 10 * B + 20, 0, 'idle'], [10 * B - 9.3, 10 * B + 22, Math.PI, 'idle'], [10 * B + 9, 9 * B + 50, Math.PI, 'walk']]);
      game.wanted.setStars(4);
      game.wanted.minimumStars = 4;
      game.police.heli = new Helicopter(game.scene, 10 * B - 20, 10 * B + 30);
      game.state.story = 8;
      game.state.money = 48250;
      game.hud.setObjective('CAUSEWAY RUN', 'Cross <b>Pelican Causeway</b> to the mainland');
      game.hud.setTimer(null);
    },
    steps: 24,
    finalize(game) {
      const p = game.player.vehicle;
      const h = game.police.heli;
      h.pos.set(p.pos.x - 13, 16, p.pos.z - 24);
      h.update(0.016, game.time, game.player, 4, () => {});
      h.pos.set(p.pos.x - 13, 16, p.pos.z - 24);
      h.mesh.position.copy(h.pos);
      // pin the pursuing cruisers into the frame: one alongside, one tailing in the next lane
      const units = game.police.units.map((u) => u.vehicle);
      const spots = [[10 * B - 2.0, p.pos.z + 2.4, 0.07], [p.pos.x + 0.3, p.pos.z + 8.2, -0.04], [10 * B - 4.8, p.pos.z - 9, 0.02]];
      units.forEach((v, k) => { if (spots[k]) { v.pos.set(spots[k][0], v.pos.y, spots[k][1]); v.heading = spots[k][2]; v.syncMesh(0.016, 34, game.time); } });
      game.wanted.zone = { x: p.pos.x, z: p.pos.z, r: game.wanted.zoneRadius() };
      game.wanted.seen = true;
      game.hud.showDistrict({ name: 'Pastel Mile', sub: 'MARISOL BOULEVARD' });
      return { pos: new THREE.Vector3(p.pos.x - 0.6, 5.0, p.pos.z + 15), look: new THREE.Vector3(p.pos.x - 0.5, 2.2, p.pos.z - 30) };
    },
  },

  // 2. On foot on the Sunwake boardwalk with Ozzie on the phone and the tower marker.
  boardwalk: {
    hour: 16.1,
    setup(game) {
      game.peds.target = 0;
      game.traffic.target = 0;
      const p = game.player;
      p.placeAt(12 * B + 12.5, 9 * B + 4, 2.6);
      p.weapon = 'fists';
      crowd(game, [[12 * B + 13.5, 9 * B + 14, 0.2, 'walk'], [12 * B + 15.5, 9 * B + 9, Math.PI, 'walk'], [12 * B + 26, 9 * B + 18, 1.2, 'idle'], [12 * B + 27, 9 * B + 19, -1.8, 'idle'], [12 * B + 11.5, 9 * B + 26, 0, 'walk'], [12 * B + 33, 9 * B + 12, 2.2, 'idle'], [12 * B + 20, 9 * B + 32, -0.4, 'walk'], [12 * B + 16, 8 * B + 56, 2.9, 'walk'],
        [12 * B + 24, 9 * B + 23, 1.57, 'sunbathe'], [12 * B + 30, 9 * B + 26, 1.4, 'sunbathe'], [12 * B + 22, 9 * B + 38, 1.7, 'sunbathe'], [12 * B + 29, 9 * B + 41, 1.5, 'idle'], [12 * B + 13, 9 * B + 36, 3.0, 'walk'], [12 * B + 42, 9 * B + 20, 0.6, 'idle'], [12 * B + 47, 9 * B + 30, -1.4, 'walk'],
        [13 * B + 5, 9 * B + 12, -1.6, 'wade'], [13 * B + 8, 9 * B + 16, 1.4, 'wade'], [13 * B + 4, 9 * B + 30, -1.2, 'wade'], [13 * B + 10, 9 * B + 26, 1.7, 'wade']]);
      game.boardMarker = new Marker(game.scene, 12 * B + 36, 9 * B + 30, { color: '#ffd23f', radius: 2.2, height: 9 });
      const v = car(game, 'taxi', 12 * B - 1.9, 9 * B + 10, Math.PI, 0);
      void v;
      car(game, 'sedan', 12 * B + 1.9, 9 * B - 14, 0, 0, '#ff8fb1');
      game.state.story = 1;
      game.state.money = 1150;
      game.hud.setObjective('LIFEGUARD TOWER 3', 'Walk to <b>Lifeguard Tower 3</b> on Sunwake Beach');
      game.dialogue.showStatic('ozzie', 'Marco stashed a cooler under Lifeguard Tower 3. Coral stripes, can\'t miss it. Beach patrol loves a cooler — be quick.');
      game.missions.active = STORY[1];
      game.missions.marker = game.boardMarker;
      p.placeAt(12 * B + 12.4, 9 * B - 0.4, Math.PI - 0.5);
      game.contacts.place('ozzie', 12 * B + 12.6, 9 * B + 2.6, -0.35);
      game.contacts.talking = true;
    },
    steps: 20,
    finalize(game) {
      const p = game.player;
      p.heading = Math.PI - 0.55;
      p.syncRig();
      game.boardMarker.update(1.2);
      game.hud.showDistrict({ name: 'Sunwake Beach', sub: 'BOARDWALK & SURF' });
      return { pos: new THREE.Vector3(12 * B + 7.3, p.pos.y + 2.0, 9 * B - 0.6), look: new THREE.Vector3(12 * B + 22, p.pos.y + 1.0, 9 * B + 6.5) };
    },
  },

  // 3. Shoot-out among the containers of Crane Yard 7.
  harbor: {
    hour: 16.6,
    setup(game) {
      game.peds.target = 0;
      game.traffic.target = 0;
      const p = game.player;
      // an aisle between two container rows of Crane Yard 7, looking east toward the cranes
      p.placeAt(5 * B + 14, 13 * B + 26, Math.PI / 2 - 0.1);
      p.giveWeapon('smg', 200);
      p.weapon = 'smg';
      p.health = 72;
      p.armor = 40;
      p.aiming = true;
      const enemies = [[5 * B + 25, 13 * B + 24.4, 'smg'], [5 * B + 31, 13 * B + 27.6, 'pistol'], [5 * B + 39, 13 * B + 25.2, 'smg'], [5 * B + 46, 13 * B + 27, 'pistol']];
      for (const [x, z, w] of enemies) {
        const e = new Gunman(game.scene, x, z, GANG_OUTFITS[Math.floor(rng.next() * 3)], 'gang', w);
        e.mode = 'attack';
        e.preferRange = 30;
        game.missions.enemies.push(e);
      }
      const dead = new Gunman(game.scene, 5 * B + 20, 13 * B + 27, GANG_OUTFITS[1], 'gang', 'pistol');
      dead.state = 'dead';
      dead.heading = 1.2;
      game.missions.enemies.push(dead);
      game.state.story = 4;
      game.state.money = 6200;
      game.missions.active = STORY[4];
      game.hud.setObjective('CRANE YARD SEVEN', 'Take out <b>Gull\'s crew</b> · 3/7');
    },
    steps: 30,
    tick(game, dt) {
      const ctx = { player: game.player, targets: game.targets, fx: null, alert: true };
      for (const e of game.missions.enemies) { if (e.alive) { e.cooldown = 99; e.think(dt, ctx); } else e.think(dt, ctx); }
    },
    finalize(game, cam = {}) {
      const p = game.player;
      // face the middle of the crew
      const foes = game.missions.enemies.filter((q) => q.alive);
      const mx = foes.reduce((a, e) => a + e.pos.x, 0) / foes.length, mz = foes.reduce((a, e) => a + e.pos.z, 0) / foes.length;
      p.heading = Math.atan2(mx - p.pos.x, -(mz - p.pos.z));
      p.aiming = true;
      poseHuman(p.rig, 'aim', 0, 0.016, 0.05);
      p.rig.userData.gun.visible = true;
      p.syncRig();
      // a burst from Tessa and return fire from the crew
      const origin = new THREE.Vector3(p.pos.x + 0.5, p.pos.y + 1.45, p.pos.z + 0.3);
      for (const e of game.missions.enemies.filter((q) => q.alive).slice(0, 2)) {
        const dir = new THREE.Vector3(e.pos.x - origin.x, 1.2, e.pos.z - origin.z).normalize();
        dir.y = 0.0;
        fireWeapon(WEAPONS.smg, origin, dir.normalize(), p, game.targets, game.fx);
      }
      for (const e of game.missions.enemies.filter((q) => q.alive)) {
        e.heading = Math.atan2(p.pos.x - e.pos.x, -(p.pos.z - e.pos.z));
        poseHuman(e.rig, 'aim', 0, 0.016);
        e.rig.rotation.y = -e.heading;
        const o = new THREE.Vector3(e.pos.x, e.pos.y + 1.45, e.pos.z);
        // rounds kick up the ground just in front of Tessa (keeps streaks out of the camera)
        const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z, dd = Math.hypot(dx, dz) || 1;
        const aim = new THREE.Vector3(p.pos.x + dx / dd * 2.5 + rng.range(-1, 1), p.pos.y + 0.2, p.pos.z + dz / dd * 2.5 + rng.range(-1, 1));
        fireWeapon(e.weapon, o, aim.sub(o).normalize(), e, { people: [], vehicles: [] }, game.fx);
      }
      game.fx.particles.update(0.016);
      game.fx.tracers.update(0.01);
      game.hud.showDistrict({ name: 'Saltgate Harbor', sub: 'CRANE YARD 7' });
      // over the right shoulder, looking down the line of fire
      const fx = Math.sin(p.heading), fz = -Math.cos(p.heading), rx = Math.cos(p.heading), rz = Math.sin(p.heading);
      const { back = 3.6, up = 2.4, side = 0.9 } = cam;
      return { pos: new THREE.Vector3(p.pos.x - fx * back + rx * side, p.pos.y + up, p.pos.z - fz * back + rz * side), look: new THREE.Vector3(p.pos.x + fx * 20, p.pos.y + 1.4, p.pos.z + fz * 20) };
    },
  },

  // Extra: free camera for art review, ?shot=view&cam=x,y,z,lookX,lookY,lookZ&hour=h
  view: {
    hour: Number(new URLSearchParams(location.search).get('hour') || 16.5),
    setup(game) {
      const c = (new URLSearchParams(location.search).get('cam') || '400,30,600,450,0,500').split(',').map(Number);
      this.cam = c;
      game.peds.target = 30;
      game.traffic.target = 24;
      game.player.placeAt(c[3], c[5]);
      game.player.rig.visible = false;
    },
    steps: 90,
    finalize() {
      const c = this.cam;
      return { pos: new THREE.Vector3(c[0], c[1], c[2]), look: new THREE.Vector3(c[3], c[4], c[5]) };
    },
  },

  // Extra: the city after dark from the Pastel Mile (for checking the night look).
  night: {
    hour: 21.5,
    setup(game) {
      game.peds.target = 12;
      game.traffic.target = 14;
      const pv = car(game, 'sports', 11 * B + 34, 4 * B - 3.4, -Math.PI / 2, 12, '#19c3b4');
      seatPlayer(game, pv);
    },
    steps: 40,
    finalize(game) {
      const p = game.player.vehicle;
      return { pos: new THREE.Vector3(p.pos.x + 12, 4.5, p.pos.z + 0.8), look: new THREE.Vector3(p.pos.x - 30, 3, p.pos.z) };
    },
  },

  // 3b. The same fight out on the quay apron under the gantry cranes.
  quay: {
    hour: 16.6,
    setup(game) {
      game.peds.target = 0;
      game.traffic.target = 0;
      const p = game.player;
      p.placeAt(5 * B + 8, 13 * B + 50, Math.PI / 2 + 0.15);
      p.giveWeapon('smg', 200);
      p.weapon = 'smg';
      p.health = 64;
      p.armor = 35;
      p.aiming = true;
      const enemies = [[5 * B + 19, 13 * B + 54.5, 'smg'], [5 * B + 24, 13 * B + 49.5, 'pistol'], [5 * B + 31, 13 * B + 56, 'smg'], [5 * B + 38, 13 * B + 51.5, 'pistol'], [5 * B + 17, 13 * B + 46.5, 'pistol']];
      for (const [x, z, w] of enemies) {
        const e = new Gunman(game.scene, x, z, GANG_OUTFITS[Math.floor(rng.next() * 3)], 'gang', w);
        e.mode = 'attack';
        e.preferRange = 30;
        game.missions.enemies.push(e);
      }
      for (const [x, z, h] of [[5 * B + 14, 13 * B + 52.5, 0.4], [5 * B + 27, 13 * B + 47.5, 2.2]]) {
        const dead = new Gunman(game.scene, x, z, GANG_OUTFITS[1], 'gang', 'pistol');
        dead.state = 'dead';
        dead.heading = h;
        game.missions.enemies.push(dead);
      }
      const wreck = car(game, 'pickup', 5 * B + 29, 13 * B + 53, 1.2, 0, '#2c3e50');
      wreck.explode();
      wreck.burning = 99;
      car(game, 'van', 5 * B + 52, 13 * B + 47.5, 1.57, 0, '#ffffff');
      game.state.story = 4;
      game.state.money = 6200;
      game.missions.active = STORY[4];
      game.hud.setObjective('CRANE YARD SEVEN', 'Take out <b>Gull\'s crew</b> · 3/7');
    },
    steps: 40,
    tick(game, dt) {
      const ctx = { player: game.player, targets: game.targets, fx: null, alert: true };
      for (const e of game.missions.enemies) { if (e.alive) { e.cooldown = 99; e.think(dt, ctx); } else e.think(dt, ctx); }
    },
    finalize(game) {
      return SCENES.harbor.finalize(game, { back: 4.2, up: 2.7, side: 1.6 });
    },
  },

  // 4. The phone: illustrated island map with the story mission list.
  map: {
    hour: 15.5,
    setup(game) {
      game.peds.target = 0;
      game.traffic.target = 0;
      game.player.placeAt(9 * B + 30, 7 * B + 9.5, 0.6);
      game.state.story = 4;
      game.state.money = 6200;
      game.state.properties = ['surf-shack'];
      game.state.stats = { missions: 4, fares: 6, deliveries: 2, races: 1, bestRace: 71.4, kills: 9, stars: 0 };
    },
    steps: 2,
    finalize(game) {
      game.phone.tab = 'story';
      game.phone.toggle(true);
      const p = game.player;
      return { pos: new THREE.Vector3(p.pos.x - 30, 40, p.pos.z + 40), look: new THREE.Vector3(p.pos.x, 0, p.pos.z) };
    },
  },
};
