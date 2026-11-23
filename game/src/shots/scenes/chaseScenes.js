// Driving scenes: the four-star sunset chase down Sundown Boulevard (the cover), the older
// northbound chase up Marisol Boulevard, and a night drive for checking the lights.

import * as THREE from 'three';
import { LaneDriver } from '../../traffic/laneDriver.js';
import { Helicopter } from '../../police/helicopter.js';
import { rng } from '../../core/rng.js';
import { B, car, seatPlayer, cops, crowd, streetCar, skidTrail } from '../sceneKit.js';

// 1. Westbound on Sundown Boulevard into the setting sun, Glasswater towers ahead.
export const sunset = {
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
};

// Extra: golden-hour police chase up Marisol Boulevard toward the Glasswater towers.
export const cover = {
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
};

// Extra: the city after dark from the Pastel Mile (for checking the night look).
export const night = {
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
};
