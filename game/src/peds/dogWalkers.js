// Dog walkers: a dog on a red lead that trots a step behind and to the right of its owner,
// sits when the owner stops, runs when they run, and waits by them if they go down.

import { buildDog, poseDog, buildLead, setLead } from './dogModel.js';
import { groundHeight } from '../world/groundHeight.js';
import { wrapAngle } from '../core/mathUtil.js';
import { disposeTree } from '../core/disposeTree.js';

export function addDog(scene, ped, rng) {
  ped.dog = { rig: buildDog(rng), lead: buildLead(), x: ped.pos.x + 1, z: ped.pos.z + 1, heading: ped.heading };
  scene.add(ped.dog.rig, ped.dog.lead);
}

export function removeDog(scene, ped) {
  if (!ped.dog) return;
  scene.remove(ped.dog.rig, ped.dog.lead);
  disposeTree(ped.dog.rig);
  disposeTree(ped.dog.lead);
  ped.dog = null;
}

export function updateDog(ped, dt) {
  const d = ped.dog;
  const fx = Math.sin(ped.heading), fz = -Math.cos(ped.heading);
  const tx = ped.pos.x - fx * 1.1 - fz * 0.7, tz = ped.pos.z - fz * 1.1 + fx * 0.7;
  const dx = tx - d.x, dz = tz - d.z, dist = Math.hypot(dx, dz);
  let speed = 0;
  if (dist > 0.15) {
    speed = Math.min(dist * 3, 7);
    const step = Math.min(dist, speed * dt);
    d.x += (dx / dist) * step; d.z += (dz / dist) * step;
    d.heading = Math.atan2(dx, -dz);
  } else d.heading += wrapAngle(ped.heading - d.heading) * Math.min(1, dt * 3);
  const y = groundHeight(d.x, d.z);
  d.rig.position.set(d.x, y, d.z);
  d.rig.rotation.y = -d.heading;
  poseDog(d.rig, ped.alive ? speed : 0, dt);
  // the lead runs from the owner's right hand to the collar
  const s = d.rig.userData.body.scale.x;
  const rx = Math.cos(ped.heading), rz = Math.sin(ped.heading);
  setLead(d.lead, { x: ped.pos.x + rx * 0.32, y: ped.pos.y + (ped.alive ? 0.85 : 0.2), z: ped.pos.z + rz * 0.32 },
    { x: d.x + Math.sin(d.heading) * 0.3 * s, y: y + 0.55 * s, z: d.z - Math.cos(d.heading) * 0.3 * s });
}
