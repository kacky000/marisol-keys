// 3. Gunfights with Gull's crew in Crane Yard 7: one in an aisle between container rows, and the
// one used for the screenshot out on the quay apron under the gantry cranes, by a burning pickup.

import * as THREE from 'three';
import { Gunman, GANG_OUTFITS } from '../../combat/gunman.js';
import { WEAPONS } from '../../combat/weaponDefs.js';
import { fireWeapon } from '../../combat/gunplay.js';
import { STORY } from '../../missions/storyMissions.js';
import { poseHuman } from '../../peds/humanModel.js';
import { rng } from '../../core/rng.js';
import { B, car, holdFireTick } from '../sceneKit.js';

function arm(game, p, health, armor) {
  p.giveWeapon('smg', 200);
  p.weapon = 'smg';
  p.health = health;
  p.armor = armor;
  p.aiming = true;
}

function crew(game, list) {
  for (const [x, z, w] of list) {
    const e = new Gunman(game.scene, x, z, GANG_OUTFITS[Math.floor(rng.next() * 3)], 'gang', w);
    e.mode = 'attack';
    e.preferRange = 30;
    game.missions.enemies.push(e);
  }
}

function fallen(game, x, z, heading) {
  const dead = new Gunman(game.scene, x, z, GANG_OUTFITS[1], 'gang', 'pistol');
  dead.state = 'dead';
  dead.heading = heading;
  game.missions.enemies.push(dead);
}

function onTheJob(game) {
  game.state.story = 4;
  game.state.money = 6200;
  game.missions.active = STORY[4];
  game.hud.setObjective('CRANE YARD SEVEN', 'Take out <b>Gull\'s crew</b> · 3/7');
}

// Tessa fires a burst, the crew fires back, and the camera sits over her right shoulder.
function exchangeFire(game, cam = {}) {
  const p = game.player;
  // face the middle of the crew
  const foes = game.missions.enemies.filter((q) => q.alive);
  const mx = foes.reduce((a, e) => a + e.pos.x, 0) / foes.length, mz = foes.reduce((a, e) => a + e.pos.z, 0) / foes.length;
  p.heading = Math.atan2(mx - p.pos.x, -(mz - p.pos.z));
  p.aiming = true;
  poseHuman(p.rig, 'aim', 0, 0.016, 0.05);
  p.rig.userData.gun.visible = true;
  p.syncRig();
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
  const fx = Math.sin(p.heading), fz = -Math.cos(p.heading), rx = Math.cos(p.heading), rz = Math.sin(p.heading);
  const { back = 3.6, up = 2.4, side = 0.9 } = cam;
  return { pos: new THREE.Vector3(p.pos.x - fx * back + rx * side, p.pos.y + up, p.pos.z - fz * back + rz * side), look: new THREE.Vector3(p.pos.x + fx * 20, p.pos.y + 1.4, p.pos.z + fz * 20) };
}

// Extra: an aisle between two container rows, looking east toward the cranes.
export const harbor = {
  hour: 16.6,
  setup(game) {
    game.peds.target = 0;
    game.traffic.target = 0;
    const p = game.player;
    p.placeAt(5 * B + 14, 13 * B + 26, Math.PI / 2 - 0.1);
    arm(game, p, 72, 40);
    crew(game, [[5 * B + 25, 13 * B + 24.4, 'smg'], [5 * B + 31, 13 * B + 27.6, 'pistol'], [5 * B + 39, 13 * B + 25.2, 'smg'], [5 * B + 46, 13 * B + 27, 'pistol']]);
    fallen(game, 5 * B + 20, 13 * B + 27, 1.2);
    onTheJob(game);
  },
  steps: 30,
  tick: holdFireTick,
  finalize: (game) => exchangeFire(game),
};

// 3. Out on the quay apron under the gantry cranes.
export const quay = {
  hour: 16.6,
  setup(game) {
    game.peds.target = 0;
    game.traffic.target = 0;
    const p = game.player;
    p.placeAt(5 * B + 8, 13 * B + 50, Math.PI / 2 + 0.15);
    arm(game, p, 64, 35);
    crew(game, [[5 * B + 19, 13 * B + 54.5, 'smg'], [5 * B + 24, 13 * B + 49.5, 'pistol'], [5 * B + 31, 13 * B + 56, 'smg'], [5 * B + 38, 13 * B + 51.5, 'pistol'], [5 * B + 17, 13 * B + 46.5, 'pistol']]);
    fallen(game, 5 * B + 14, 13 * B + 52.5, 0.4);
    fallen(game, 5 * B + 27, 13 * B + 47.5, 2.2);
    const wreck = car(game, 'pickup', 5 * B + 29, 13 * B + 53, 1.2, 0, '#2c3e50');
    wreck.explode();
    wreck.burning = 99;
    car(game, 'van', 5 * B + 52, 13 * B + 47.5, 1.57, 0, '#ffffff');
    onTheJob(game);
  },
  steps: 40,
  tick: holdFireTick,
  finalize: (game) => exchangeFire(game, { back: 4.2, up: 2.7, side: 1.6 }),
};
