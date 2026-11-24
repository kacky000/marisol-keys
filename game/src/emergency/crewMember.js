// A paramedic or firefighter on foot: walks (runs) to a spot around obstacles' edges, then
// holds a pose — kneeling over a patient, or bracing a hose. Not a combat target.

import { buildHuman, poseHuman } from '../peds/humanModel.js';
import { groundHeight } from '../world/groundHeight.js';
import { resolveCircle } from '../world/collisionWorld.js';
import { disposeTree } from '../core/disposeTree.js';

const BASE = { skin: '#c98d66', hair: '#2b1b12', shorts: false, shades: false, shoes: '#222', build: 1, hairStyle: 'short', dress: null, bag: null };
export const MEDIC_OUTFIT = { ...BASE, shirt: '#f4f4f2', pants: '#1f3b5c', hat: 'cap' };
export const FIREFIGHTER_OUTFIT = { ...BASE, shirt: '#c9a227', pants: '#2a2a2a', hat: 'cap', build: 1.06 };

export class CrewMember {
  constructor(scene, x, z, outfit) {
    this.rig = buildHuman(outfit);
    this.pos = { x, y: groundHeight(x, z), z };
    this.heading = 0;
    this.scene = scene;
    scene.add(this.rig);
  }

  // Runs toward (x, z); true once within `reach`.
  walkTo(x, z, dt, reach = 1.1) {
    const dx = x - this.pos.x, dz = z - this.pos.z, d = Math.hypot(dx, dz);
    if (d < reach) { this.pose('idle', 0, dt); return true; }
    this.heading = Math.atan2(dx, -dz);
    const step = Math.min(d, 2.6 * dt);
    this.pos.x += (dx / d) * step;
    this.pos.z += (dz / d) * step;
    resolveCircle(this.pos, 0.3, this.pos.y);
    this.pos.y = groundHeight(this.pos.x, this.pos.z);
    this.pose('run', 2.6, dt);
    return false;
  }

  face(x, z) { this.heading = Math.atan2(x - this.pos.x, -(z - this.pos.z)); }

  pose(state, speed, dt) {
    poseHuman(this.rig, state, speed, dt);
    this.rig.position.set(this.pos.x, this.pos.y, this.pos.z);
    this.rig.rotation.y = -this.heading;
  }

  // Both hands forward at chest height, holding a hose nozzle.
  brace(dt) {
    this.pose('idle', 0, dt);
    const arms = this.rig.userData.arms;
    arms[0].rotation.set(1.35, 0, 0.35);
    arms[1].rotation.set(1.5, 0, -0.2);
  }

  // World position of the hands, roughly, for the hose jet.
  nozzle() {
    const fx = Math.sin(this.heading), fz = -Math.cos(this.heading);
    return { x: this.pos.x + fx * 0.8, y: this.pos.y + 1.3, z: this.pos.z + fz * 0.8 };
  }

  dispose() { this.scene.remove(this.rig); disposeTree(this.rig); }
}
