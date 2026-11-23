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
  }
}

export const SCENES = {
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
    hour: 17.4,
    setup(game) {
      game.peds.target = 0;
      game.traffic.target = 0;
      const p = game.player;
      p.placeAt(12 * B + 12.5, 9 * B + 4, 2.6);
      p.weapon = 'fists';
      crowd(game, [[12 * B + 13.5, 9 * B + 14, 0.2, 'walk'], [12 * B + 15.5, 9 * B + 9, Math.PI, 'walk'], [12 * B + 26, 9 * B + 18, 1.2, 'idle'], [12 * B + 27, 9 * B + 19, -1.8, 'idle'], [12 * B + 11.5, 9 * B + 26, 0, 'walk'], [12 * B + 33, 9 * B + 12, 2.2, 'idle'], [12 * B + 20, 9 * B + 32, -0.4, 'walk'], [12 * B + 16, 8 * B + 56, 2.9, 'walk']]);
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
    },
    steps: 20,
    finalize(game) {
      const p = game.player;
      p.heading = 2.45;
      p.syncRig();
      game.boardMarker.update(1.2);
      game.hud.showDistrict({ name: 'Sunwake Beach', sub: 'BOARDWALK & SURF' });
      return { pos: new THREE.Vector3(p.pos.x - 6.5, p.pos.y + 3.6, p.pos.z - 8.5), look: new THREE.Vector3(p.pos.x + 12, p.pos.y + 0.6, p.pos.z + 12) };
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
    finalize(game) {
      const p = game.player;
      p.heading = Math.PI / 2 - 0.12;
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
        const aim = new THREE.Vector3(p.pos.x + rng.range(-1.5, 1.5), p.pos.y + 1.6 + rng.range(0, 1), p.pos.z + rng.range(-1, 1));
        fireWeapon(e.weapon, o, aim.sub(o).normalize(), e, { people: [], vehicles: [] }, game.fx);
      }
      game.fx.particles.update(0.016);
      game.fx.tracers.update(0.01);
      game.hud.showDistrict({ name: 'Saltgate Harbor', sub: 'CRANE YARD 7' });
      return { pos: new THREE.Vector3(p.pos.x - 3.4, p.pos.y + 2.4, p.pos.z + 1.5), look: new THREE.Vector3(p.pos.x + 20, p.pos.y + 1.9, p.pos.z - 1.2) };
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
