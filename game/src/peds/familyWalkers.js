// Families out for a walk: a child at a parent's side, holding their hand, taking quicker steps
// to keep up; the child runs along when the parent flees and stays close if they stop.
// Children are never targets; if the parent goes down, the child runs off out of the scene.

import { buildHuman, poseHuman, randomOutfit } from './humanModel.js';
import { groundHeight } from '../world/groundHeight.js';
import { wrapAngle } from '../core/mathUtil.js';

const CHILD_SCALE = 0.6;

export function addChild(scene, ped, rng) {
  const o = randomOutfit(rng);
  const rig = buildHuman({ ...o, shorts: true, bag: null, hat: rng.chance(0.3) ? 'cap' : null, hairStyle: rng.pick(['short', 'curly', 'bob', 'long']) });
  rig.scale.setScalar(CHILD_SCALE);
  scene.add(rig);
  ped.child = { rig, x: ped.pos.x + 0.8, z: ped.pos.z, heading: ped.heading };
}

export function removeChild(scene, ped) {
  if (!ped.child) return;
  scene.remove(ped.child.rig);
  ped.child = null;
}

export function updateChild(ped, dt) {
  const c = ped.child;
  if (!ped.alive) {
    // the child runs off up the street and out of the scene
    c.gone = (c.gone || 0) + dt;
    c.x += Math.sin(c.heading) * 4 * dt; c.z += -Math.cos(c.heading) * 4 * dt;
    poseHuman(c.rig, 'run', 4 / CHILD_SCALE, dt);
    c.rig.position.set(c.x, groundHeight(c.x, c.z), c.z);
    c.rig.rotation.y = -c.heading;
    if (c.gone > 4) { c.rig.parent?.remove(c.rig); ped.child = null; }
    return;
  }
  // on the parent's left, a little behind
  const fx = Math.sin(ped.heading), fz = -Math.cos(ped.heading);
  const tx = ped.pos.x - fx * 0.2 + fz * 0.75, tz = ped.pos.z - fz * 0.2 - fx * 0.75;
  const dx = tx - c.x, dz = tz - c.z, dist = Math.hypot(dx, dz);
  let speed = 0;
  if (dist > 0.08) {
    speed = Math.min(dist * 4, 6);
    const step = Math.min(dist, speed * dt);
    c.x += (dx / dist) * step; c.z += (dz / dist) * step;
  }
  c.heading += wrapAngle(ped.heading - c.heading) * Math.min(1, dt * 6);
  poseHuman(c.rig, ped.state === 'flee' ? 'flee' : speed > 0.3 ? 'walk' : 'idle', speed / CHILD_SCALE, dt);
  if (ped.alive && ped.state !== 'flee') c.rig.userData.arms[1].rotation.set(0.35, 0, 0.55); // reaching up to hold hands
  c.rig.position.set(c.x, groundHeight(c.x, c.z), c.z);
  c.rig.rotation.y = -c.heading;
}
