// The protagonist, Tessa Vane: walking, sprinting, jumping, crouching, punching and shooting on
// foot; her outfit, health and arsenal. Car entry and driving are in vehicleEntry.js and
// drivingControls.js.

import * as THREE from 'three';
import { buildHuman, poseHuman } from '../peds/humanModel.js';
import { groundHeight } from '../world/groundHeight.js';
import { resolveCircle } from '../world/collisionWorld.js';
import { isDown, wasPressed, mouseState } from '../core/input.js';
import { WEAPONS, WEAPON_ORDER } from '../combat/weaponDefs.js';
import { emit } from '../core/events.js';
import { dampAngle } from '../core/mathUtil.js';
import { fireWeapon } from '../combat/gunplay.js';
import { tryEnterVehicle, updateEnterExit } from './vehicleEntry.js';
import { updateDriving } from './drivingControls.js';

export const TESSA_OUTFIT = { skin: '#d9a07a', shirt: '#19c3b4', pants: '#3a3f4a', hair: '#2b1b12', shorts: false, hat: null, shades: true, shoes: '#f5f5f5', build: 1.0, longSleeves: false };

export class Player {
  constructor(scene) {
    this.team = 'player';
    this.scene = scene;
    this.applyOutfit(TESSA_OUTFIT);
    this.pos = new THREE.Vector3(0, 0, 0);
    this.vy = 0;
    this.heading = 0;
    this.onGround = true;
    this.health = 100;
    this.armor = 50;
    this.vehicle = null;
    this.enter = null;            // car entering / exiting animation state
    this.weapon = 'pistol';
    this.ammo = { fists: Infinity, pistol: 60, smg: 0, shotgun: 0 };
    this.clip = { fists: Infinity, pistol: 12, smg: 0, shotgun: 0 };
    this.owned = new Set(['fists', 'pistol']);
    this.cooldown = 0;
    this.reloading = 0;
    this.aiming = false;
    this.moveState = 'idle';
    this.speedNow = 0;
    this.dead = false;
    this.controlsLocked = false;
  }

  get alive() { return !this.dead; }

  // Rebuilds Tessa's model in a given outfit (her trademark ponytail stays).
  applyOutfit(outfit) {
    const old = this.rig;
    this.rig = buildHuman(outfit);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.1), new THREE.MeshStandardMaterial({ color: '#2b1b12' }));
    tail.position.set(0, 0.85, 0.19);
    tail.rotation.x = 0.4;
    this.rig.userData.hips.add(tail);
    if (old) { this.rig.visible = old.visible; this.scene.remove(old); }
    this.scene.add(this.rig);
    if (this.pos) this.syncRig();
  }

  placeAt(x, z, heading = 0) {
    this.pos.set(x, groundHeight(x, z), z);
    this.heading = heading;
    this.syncRig(0);
  }

  hurt(amount, source) {
    if (this.dead) return false;
    if (this.crouching && !source?.explosion) amount *= 0.5; // crouched in cover takes half
    if (this.armor > 0) {
      const a = Math.min(this.armor, amount * 0.7);
      this.armor -= a;
      amount -= a;
    }
    this.health -= amount;
    emit('player:hurt', { amount, source });
    if (this.health <= 0) {
      this.health = 0;
      this.dead = true;
      emit('player:down', { cause: 'wasted' });
      return true;
    }
    return false;
  }

  cycleWeapon(dir) {
    const owned = WEAPON_ORDER.filter((w) => this.owned.has(w));
    const i = owned.indexOf(this.weapon);
    this.weapon = owned[(i + dir + owned.length) % owned.length];
    emit('player:weapon', { weapon: this.weapon });
  }

  giveWeapon(id, ammo) {
    this.owned.add(id);
    this.ammo[id] = (this.ammo[id] || 0) + ammo;
    if (!this.clip[id]) this.reload(id, true);
  }

  reload(id = this.weapon, instant = false) {
    const w = WEAPONS[id];
    if (w.melee) return;
    const need = w.mag - this.clip[id];
    const take = Math.min(need, this.ammo[id]);
    if (take <= 0) return;
    this.ammo[id] -= take;
    this.clip[id] += take;
    if (!instant) { this.reloading = 1.1; emit('player:reload', {}); }
  }

  // ctx: { camera (GameCamera), vehicles, world targets, fx, time, crimes }
  update(dt, ctx) {
    if (this.dead) { poseHuman(this.rig, 'dead', 0, dt); this.syncRig(dt); return; }
    this.cooldown -= dt;
    if (this.reloading > 0) { this.reloading -= dt; }
    if (this.enter) { this.updateEnterExit(dt, ctx); return; }
    if (this.vehicle) { this.updateDriving(dt, ctx); return; }
    this.updateOnFoot(dt, ctx);
  }

  updateOnFoot(dt, ctx) {
    const cam = ctx.camera;
    const locked = this.controlsLocked;
    let mx = 0, mz = 0;
    if (!locked) {
      if (isDown('KeyW')) mz -= 1;
      if (isDown('KeyS')) mz += 1;
      if (isDown('KeyA')) mx -= 1;
      if (isDown('KeyD')) mx += 1;
    }
    const mouse = mouseState();
    this.aiming = !locked && (mouse.right || (mouse.left && !WEAPONS[this.weapon].melee));
    this.crouching = !locked && (isDown('ControlLeft') || isDown('KeyX'));
    const sprint = isDown('ShiftLeft') && !this.aiming && !this.crouching;
    const len = Math.hypot(mx, mz);
    let speed = 0;
    if (len > 0) {
      const yaw = cam.yaw;
      const fx = Math.sin(yaw), fz = -Math.cos(yaw);
      const rx = Math.cos(yaw), rz = Math.sin(yaw);
      const dx = (fx * -mz + rx * mx) / len, dz = (fz * -mz + rz * mx) / len;
      speed = this.crouching ? 1.8 : this.aiming ? 2.4 : sprint ? 7.2 : 3.6;
      this.pos.x += dx * speed * dt;
      this.pos.z += dz * speed * dt;
      if (!this.aiming) this.heading = dampAngle(this.heading, Math.atan2(dx, -dz), 12, dt);
    }
    if (this.aiming) this.heading = dampAngle(this.heading, cam.yaw, 20, dt);
    this.speedNow = speed;
    // jump and gravity
    const gy = groundHeight(this.pos.x, this.pos.z);
    if (wasPressed('Space') && this.onGround && !locked) { this.vy = 5.2; this.onGround = false; }
    this.vy -= 15 * dt;
    this.pos.y += this.vy * dt;
    if (this.pos.y <= gy) { this.pos.y = gy; this.vy = 0; this.onGround = true; }
    else if (this.pos.y - gy > 0.35) this.onGround = false;
    if (gy < -0.6) {
      // swimming is not this character's strength: wade back to dry land
      this.pos.y = Math.max(this.pos.y, -0.9);
      this.onGround = true;
      if (gy < -2.4) { this.health -= 6 * dt; if (this.health <= 0) { this.dead = true; emit('player:down', { cause: 'drowned' }); } }
    }
    resolveCircle(this.pos, 0.38, this.pos.y);
    for (const v of ctx.vehicles.list) {
      // vehicles push the player aside
      const f = v.forward();
      const dx = this.pos.x - v.pos.x, dz = this.pos.z - v.pos.z;
      const along = dx * f.x + dz * f.z, side = dx * -f.z + dz * f.x;
      const hl = v.spec.len / 2 + 0.35, hw = v.spec.width / 2 + 0.35;
      if (Math.abs(along) < hl && Math.abs(side) < hw) {
        const pushSide = hw - Math.abs(side), pushAlong = hl - Math.abs(along);
        if (pushSide < pushAlong) { this.pos.x += -f.z * Math.sign(side) * pushSide; this.pos.z += f.x * Math.sign(side) * pushSide; }
        else { this.pos.x += f.x * Math.sign(along) * pushAlong; this.pos.z += f.z * Math.sign(along) * pushAlong; }
      }
    }
    // weapons
    if (!locked) {
      if (wasPressed('Digit1')) this.selectWeapon('fists');
      if (wasPressed('Digit2')) this.selectWeapon('pistol');
      if (wasPressed('Digit3')) this.selectWeapon('smg');
      if (wasPressed('Digit4')) this.selectWeapon('shotgun');
      if (mouse.wheel) this.cycleWeapon(mouse.wheel > 0 ? 1 : -1);
      if (wasPressed('KeyR')) this.reload();
      const w = WEAPONS[this.weapon];
      const trigger = w.auto ? mouse.left : mouse.leftPressed;
      if (trigger && this.cooldown <= 0 && this.reloading <= 0) this.fire(ctx);
      if (wasPressed('KeyF')) this.tryEnterVehicle(ctx);
    }
    const state = !this.onGround ? 'jump' : this.aiming ? 'aim' : speed > 5 ? 'run' : speed > 0 ? 'walk' : 'idle';
    this.moveState = state;
    poseHuman(this.rig, state, speed, dt, this.aiming ? ctx.camera.pitch * 0.8 : 0);
    if (this.punchTimer > 0) {
      // a quick right jab: snap out, ease back
      this.punchTimer -= dt;
      const k = Math.sin(Math.max(0, this.punchTimer) / 0.25 * Math.PI);
      this.rig.userData.arms[1].rotation.set(0.4 + k * 1.25, 0, -0.2);
      this.rig.userData.arms[0].rotation.set(0.9, 0, 0.35);
    }
    if (this.crouching && this.onGround) {
      // knees bent, hips low
      const u = this.rig.userData;
      u.hips.position.y = 0.62;
      u.legs[0].rotation.x = 1.3 + u.legs[0].rotation.x * 0.3;
      u.legs[1].rotation.x = 0.6 + u.legs[1].rotation.x * 0.3;
    }
    this.rig.userData.gun.visible = !WEAPONS[this.weapon].melee;
    this.syncRig(dt);
  }

  selectWeapon(id) { if (this.owned.has(id)) { this.weapon = id; emit('player:weapon', { weapon: id }); } }

  // Muzzle position and the direction toward what the crosshair covers.
  aimRay(ctx) {
    const cam = ctx.camera;
    const origin = new THREE.Vector3(this.pos.x + Math.cos(this.heading) * 0.3 + Math.sin(this.heading) * 0.5, this.pos.y + 1.45, this.pos.z + Math.sin(this.heading) * 0.3 - Math.cos(this.heading) * 0.5);
    const target = cam.aimPoint(90);
    let dir = target.sub(origin).normalize();
    // aim assist: snap to the chest of a hostile within a few degrees of the crosshair
    let best = 0.07;
    for (const q of ctx.targets.people) {
      if (q === this || !q.alive || q.kind === 'civilian') continue;
      const to = new THREE.Vector3(q.pos.x - origin.x, q.pos.y + 1.3 - origin.y, q.pos.z - origin.z);
      const d = to.length();
      if (d > 70) continue;
      const ang = Math.acos(Math.min(1, to.dot(dir) / d));
      if (ang < best) { best = ang; dir = to.divideScalar(d); }
    }
    return { origin, dir };
  }

  fire(ctx) {
    const w = WEAPONS[this.weapon];
    this.cooldown = 1 / w.rate;
    if (w.melee) {
      this.punchTimer = 0.25;
      const f = { x: Math.sin(this.heading), z: -Math.cos(this.heading) };
      for (const p of ctx.targets.people) {
        if (!p.alive || p === this) continue;
        const dx = p.pos.x - this.pos.x, dz = p.pos.z - this.pos.z;
        if (dx * dx + dz * dz < w.range * w.range && dx * f.x + dz * f.z > 0) {
          p.hurt(w.damage, { x: this.pos.x, z: this.pos.z, byPlayer: true, shooter: this, melee: true });
          emit('player:melee', { target: p });
          break;
        }
      }
      emit('sound', { name: 'punch' });
      return;
    }
    if (this.clip[this.weapon] <= 0) {
      if (this.ammo[this.weapon] > 0) this.reload(); else emit('sound', { name: 'empty' });
      return;
    }
    this.clip[this.weapon]--;
    const { origin, dir } = this.aimRay(ctx);
    const hits = fireWeapon(w, origin, dir, this, ctx.targets, ctx.fx);
    ctx.camera.kick(w.id === 'shotgun' ? 0.05 : 0.015);
    emit('sound', { name: w.id, x: origin.x, z: origin.z });
    emit('player:shot', { weapon: w.id, hits });
    if (this.clip[this.weapon] === 0 && this.ammo[this.weapon] > 0) this.reload();
  }

  // Vehicles: entering, leaving and driving live in their own modules.
  tryEnterVehicle(ctx) { tryEnterVehicle(this, ctx.vehicles); }
  updateEnterExit(dt) { updateEnterExit(this, dt); }
  updateDriving(dt, ctx) { updateDriving(this, dt, ctx); }

  syncRig() {
    this.rig.position.set(this.pos.x, this.pos.y, this.pos.z);
    this.rig.rotation.y = -this.heading;
  }
}

