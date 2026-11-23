// The cast in the flesh: whoever gives the next story mission waits at their spot (Ozzie at the
// bait shop, Lulu outside the Coral Room, Priya by the Static 88 studio), turns to face Tessa,
// gestures while talking, and the camera cuts to a two-shot for face-to-face scenes.

import * as THREE from 'three';
import { buildHuman, poseHuman } from '../peds/humanModel.js';
import { groundHeight } from '../world/groundHeight.js';
import { raycastStatic } from '../world/collisionWorld.js';
import { STORY, CONTACTS } from '../missions/storyMissions.js';
import { dampAngle } from '../core/mathUtil.js';

export const CAST_OUTFITS = {
  ozzie: { skin: '#b97a55', shirt: '#f4a259', pants: '#5b6b4f', hair: '#d8d8d8', hairStyle: 'bald', beard: '#e6e6e6', hat: 'bucket', shorts: true, shoes: '#8b5a2b', build: 1.1 },
  lulu: { skin: '#f1c7a5', shirt: '#ffffff', dress: '#ff5d8f', hair: '#e8cf8f', hairStyle: 'long', shades: true, shoes: '#ff5d8f', build: 0.95 },
  priya: { skin: '#8d5a3b', shirt: '#2b2d42', pants: '#3d3d55', hair: '#111111', hairStyle: 'bob', headphones: true, longSleeves: true, shoes: '#f5f5f5', build: 0.93 },
  gull: { skin: '#f1c7a5', shirt: '#d62828', pants: '#1d1d24', hair: '#4a2c1a', hairStyle: 'short', beard: '#4a2c1a', shades: true, shoes: '#111', build: 1.12 },
  hale: { skin: '#d9a07a', shirt: '#1f3d66', pants: '#14233b', hair: '#7a7a7a', hat: 'police', mustache: '#6a6a6a', badge: true, longSleeves: true, shoes: '#111', build: 1.08 },
};

export class ContactCast {
  constructor(game) {
    this.game = game;
    this.rigs = {};
    this.current = null;     // { who, rig, x, z, heading }
    this.talking = false;
  }

  rigFor(who) {
    if (!this.rigs[who]) {
      this.rigs[who] = buildHuman(CAST_OUTFITS[who]);
      this.game.scene.add(this.rigs[who]);
    }
    return this.rigs[who];
  }

  // Place a cast member at a spot (used by missions and screenshot scenes).
  place(who, x, z, heading = 0) {
    for (const r of Object.values(this.rigs)) r.visible = false;
    const rig = this.rigFor(who);
    rig.visible = true;
    this.current = { who, rig, x, z, heading, phase: 0 };
    rig.position.set(x, groundHeight(x, z), z);
    rig.rotation.y = -heading;
  }

  hide() {
    for (const r of Object.values(this.rigs)) r.visible = false;
    this.current = null;
  }

  // A camera beside the pair, looking across at both faces.
  twoShot() {
    const c = this.current, p = this.game.player;
    if (!c) return null;
    const mx = (c.x + p.pos.x) / 2, mz = (c.z + p.pos.z) / 2;
    const dx = c.x - p.pos.x, dz = c.z - p.pos.z;
    const len = Math.hypot(dx, dz) || 1;
    const y = groundHeight(mx, mz);
    const look = new THREE.Vector3(mx, y + 1.45, mz);
    // try both sides of the pair (and a wider shot) and keep the first with a clear view
    for (const dist of [3.4, 4.6]) {
      for (const side of [1, -1]) {
        const nx = (-dz / len) * side, nz = (dx / len) * side;
        const pos = new THREE.Vector3(mx + nx * dist - dx * 0.12, y + 1.8, mz + nz * dist - dz * 0.12);
        const dir = pos.clone().sub(look);
        const d = dir.length();
        dir.divideScalar(d);
        if (raycastStatic(look.x, look.y, look.z, dir.x, dir.y, dir.z, d) >= d) return { pos, look };
      }
    }
    return { pos: new THREE.Vector3(mx - dz / len * 3.4, y + 1.8, mz + dx / len * 3.4), look };
  }

  update(dt) {
    const g = this.game;
    const m = g.missions;
    // the next giver waits at their contact point until the mission starts
    if (!m.active && g.running) {
      const next = STORY[g.state.story];
      if (next && (!this.current || this.current.who !== next.giver || this.current.at !== next.at)) {
        const c = CONTACTS[next.at];
        this.place(next.giver, c.x + 1.6, c.z - 1.2, -0.6);
        this.current.at = next.at;
      }
      if (!next && this.current) this.hide();
    }
    const c = this.current;
    if (!c) return;
    const p = g.player;
    const d = Math.hypot(p.pos.x - c.x, p.pos.z - c.z);
    if (d < 12) c.heading = dampAngle(c.heading, Math.atan2(p.pos.x - c.x, -(p.pos.z - c.z)), 4, dt);
    c.phase += dt;
    poseHuman(c.rig, 'idle', 0, dt);
    if (this.talking) {
      c.rig.userData.arms[1].rotation.set(0.9 + Math.sin(c.phase * 5) * 0.35, 0, -0.3);
      c.rig.userData.arms[0].rotation.set(0.4 + Math.sin(c.phase * 3.7) * 0.25, 0, 0.2);
    }
    c.rig.rotation.y = -c.heading;
    // once the mission is under way the contact goes about their business
    if (m.active && !this.talking && d > 40) this.hide();
  }
}
