// Building blocks for the screenshot scenes: spawn a car, seat the player, add pursuing cruisers,
// a crowd in given poses, lane-following civilian traffic and painted skid trails.

import { PursuitDriver } from '../police/pursuitDriver.js';
import { LaneDriver } from '../traffic/laneDriver.js';
import { randomOutfit } from '../peds/humanModel.js';
import { rng } from '../core/rng.js';

export const B = 64;

export function car(game, type, x, z, heading, speed = 0, paint) {
  const v = game.vehicles.spawn(type, x, z, heading, { paint, rng });
  v.vel.set(Math.sin(heading) * speed, -Math.cos(heading) * speed);
  v.persistent = true;
  return v;
}

// Two tyre streaks running back from a car's rear wheels, bending sideways by `bend` metres.
export function skidTrail(game, v, bend, length = 16) {
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

export function seatPlayer(game, v) {
  const p = game.player;
  p.vehicle = v;
  v.driver = 'player';
  p.rig.visible = false;
  p.pos.copy(v.pos);
  p.heading = v.heading;
}

// MKPD cruisers in pursuit: [x, z, heading, speed] each.
export function cops(game, list) {
  for (const [x, z, h, sp] of list) {
    const v = car(game, 'police', x, z, h, sp);
    const d = new PursuitDriver(v);
    v.driver = d;
    game.police.units.push({ vehicle: v, driver: d, crew: 0 });
  }
}

// Pedestrians: [x, z, heading, 'walk' | 'idle' | 'flee' | 'sunbathe' | 'wade', 'dog'?] each.
export function crowd(game, points) {
  for (const [x, z, h, state, extra] of points) {
    const ped = game.peds.spawnAt(x, z, randomOutfit(rng));
    ped.heading = h;
    ped.persistent = true;
    if (extra === 'dog') { game.peds.addDog(ped); ped.dog.x = x + Math.sin(h) * 1.2; ped.dog.z = z - Math.cos(h) * 1.2; }
    if (state === 'idle') { ped.state = 'idle'; ped.idleTimer = 99; }
    if (state === 'flee') ped.flee(x - Math.sin(h) * 5, z + Math.cos(h) * 5, 99);
    if (state === 'sunbathe') ped.state = 'sunbathe';
    if (state === 'wade') ped.state = 'wade';
  }
}

// A civilian car driving its lane on the east-west street j, at world x, westbound or eastbound.
export function streetCar(game, type, j, x, westbound, lane, speed = 10) {
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

// Lets a gunfight's crews move into position while holding their fire.
export function holdFireTick(game, dt) {
  const ctx = { player: game.player, targets: game.targets, fx: null, alert: true };
  for (const e of game.missions.enemies) { if (e.alive) { e.cooldown = 99; e.think(dt, ctx); } else e.think(dt, ctx); }
}
