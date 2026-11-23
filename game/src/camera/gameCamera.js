// Third-person camera: mouse orbit on foot with an over-the-shoulder aim mode, a speed-sensitive
// chase cam in vehicles, and collision so walls and buildings never come between it and the player.

import * as THREE from 'three';
import { raycastStatic } from '../world/collisionWorld.js';
import { mouseState, isDown } from '../core/input.js';
import { clamp, damp, dampAngle, wrapAngle } from '../core/mathUtil.js';

export class GameCamera {
  constructor(camera) {
    this.cam = camera;
    this.yaw = 0;
    this.pitch = -0.18;
    this.distance = 5;
    this.sens = 0.0024;
    this.invertY = false;
    this.lastMouse = 0;
    this.recoil = 0;
    this.shake = 0;
    this.fixed = null;
    this.pos = new THREE.Vector3();
    this.target = new THREE.Vector3();
  }

  kick(a) { this.recoil += a; this.shake = Math.max(this.shake, a * 3); }

  // Point in the world under the crosshair.
  aimPoint(maxDist) {
    const dir = new THREE.Vector3();
    this.cam.getWorldDirection(dir);
    const o = this.cam.position;
    const t = Math.min(raycastStatic(o.x, o.y, o.z, dir.x, dir.y, dir.z, maxDist), dir.y < 0 ? (o.y - 0.05) / -dir.y : Infinity);
    return o.clone().addScaledVector(dir, Math.min(t, maxDist));
  }

  update(dt, player, time) {
    const m = mouseState();
    if (this.fixed) {
      this.cam.position.copy(this.fixed.pos);
      this.cam.lookAt(this.fixed.look);
      if (this.fixed.roll) this.cam.rotateZ(this.fixed.roll); // a dutch tilt for action scenes
      return;
    }
    if (m.dx || m.dy) this.lastMouse = time;
    this.yaw = wrapAngle(this.yaw + m.dx * this.sens);
    this.pitch = clamp(this.pitch - m.dy * this.sens * (this.invertY ? -1 : 1), -1.2, 0.6);
    this.pitch += this.recoil;
    this.recoil = damp(this.recoil, 0, 18, dt);

    const v = player.vehicle || (player.enter && player.enter.mode === 'in' && player.enter.t > 0.5 ? player.enter.vehicle : null);
    let pivot, dist, side = 0, fovTarget = 62;
    if (v) {
      const sp = Math.abs(v.speed);
      // swing behind the car unless the player has looked around recently
      if (time - this.lastMouse > 1.2) {
        const behind = isDown('KeyC') ? v.heading + Math.PI : v.heading;
        this.yaw = dampAngle(this.yaw, behind, sp > 2 ? 3.2 : 1.2, dt);
        this.pitch = damp(this.pitch, -0.2, 2, dt);
      }
      pivot = new THREE.Vector3(v.pos.x, v.pos.y + v.spec.height + 0.6, v.pos.z);
      dist = v.spec.len * 0.9 + 4.2 + sp * 0.05;
      fovTarget = 62 + Math.min(18, sp * 0.35);
    } else {
      pivot = new THREE.Vector3(player.pos.x, player.pos.y + 1.65, player.pos.z);
      dist = player.aiming ? 2.6 : 4.4;
      side = player.aiming ? 0.75 : 0.35;
    }
    this.distance = damp(this.distance, dist, 6, dt);
    if (Math.abs(this.cam.fov - fovTarget) > 0.1) { this.cam.fov = damp(this.cam.fov, fovTarget, 3, dt); this.cam.updateProjectionMatrix(); }
    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    const back = new THREE.Vector3(-Math.sin(this.yaw) * cp, -sp, Math.cos(this.yaw) * cp);
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, Math.sin(this.yaw));
    const shoulder = pivot.clone().addScaledVector(right, side);
    const want = shoulder.clone().addScaledVector(back, this.distance);
    // pull in along the ray if a wall or building is in the way
    const dir = want.clone().sub(shoulder);
    const len = dir.length();
    dir.divideScalar(len);
    const hit = raycastStatic(shoulder.x, shoulder.y, shoulder.z, dir.x, dir.y, dir.z, len + 0.4);
    const d = hit < len + 0.4 ? Math.max(0.6, hit - 0.45) : len;
    const pos = shoulder.clone().addScaledVector(dir, d);
    pos.y = Math.max(pos.y, 0.6);
    if (this.shake > 0) {
      pos.x += (Math.random() - 0.5) * this.shake;
      pos.y += (Math.random() - 0.5) * this.shake;
      this.shake = damp(this.shake, 0, 10, dt);
    }
    this.cam.position.copy(pos);
    const look = shoulder.clone().addScaledVector(back, -6);
    this.cam.lookAt(look);
    this.pitch -= this.recoil * 0; // recoil already folded in above
  }
}
