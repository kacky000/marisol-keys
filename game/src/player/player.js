// The protagonist, Tessa Vane: walking, sprinting, jumping, punching, shooting, and stealing
// cars with a walk-to-door / pull-the-driver-out / slide-in animation.

import * as THREE from 'three';
import { buildHuman, poseHuman } from '../peds/humanModel.js';
import { groundHeight } from '../world/groundHeight.js';
import { resolveCircle } from '../world/collisionWorld.js';
import { isDown, wasPressed, mouseState } from '../core/input.js';
import { WEAPONS, WEAPON_ORDER } from '../combat/weaponDefs.js';
import { emit } from '../core/events.js';
import { dampAngle } from '../core/mathUtil.js';
import { fireWeapon } from '../combat/gunplay.js';

export const TESSA_OUTFIT = { skin: '#d9a07a', shirt: '#19c3b4', pants: '#3a3f4a', hair: '#2b1b12', shorts: false, hat: null, shades: true, shoes: '#f5f5f5', build: 1.0, longSleeves: false };

export class Player {
  constructor(scene) {
    this.team = 'player';
    this.rig = buildHuman(TESSA_OUTFIT);
    // ponytail
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.1), new THREE.MeshStandardMaterial({ color: '#2b1b12' }));
    tail.position.set(0, 0.85, 0.19);
    tail.rotation.x = 0.4;
    this.rig.userData.hips.add(tail);
    scene.add(this.rig);
    this.scene = scene;
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

  placeAt(x, z, heading = 0) {
    this.pos.set(x, groundHeight(x, z), z);
    this.heading = heading;
    this.syncRig(0);
  }

  hurt(amount, source) {
    if (this.dead) return false;
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
    const sprint = isDown('ShiftLeft') && !this.aiming;
    const len = Math.hypot(mx, mz);
    let speed = 0;
    if (len > 0) {
      const yaw = cam.yaw;
      const fx = Math.sin(yaw), fz = -Math.cos(yaw);
      const rx = Math.cos(yaw), rz = Math.sin(yaw);
      const dx = (fx * -mz + rx * mx) / len, dz = (fz * -mz + rz * mx) / len;
      speed = this.aiming ? 2.4 : sprint ? 7.2 : 3.6;
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
    poseHuman(this.rig, state, speed, dt, this.aiming ? -ctx.camera.pitch * 0.8 : 0);
    this.rig.userData.gun.visible = !WEAPONS[this.weapon].melee;
    this.syncRig(dt);
  }

  selectWeapon(id) { if (this.owned.has(id)) { this.weapon = id; emit('player:weapon', { weapon: id }); } }

  // Muzzle position and the direction toward what the crosshair covers.
  aimRay(ctx) {
    const cam = ctx.camera;
    const origin = new THREE.Vector3(this.pos.x + Math.cos(this.heading) * 0.3 + Math.sin(this.heading) * 0.5, this.pos.y + 1.45, this.pos.z + Math.sin(this.heading) * 0.3 - Math.cos(this.heading) * 0.5);
    const target = cam.aimPoint(90);
    const dir = target.sub(origin).normalize();
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
          p.hurt(w.damage, { x: this.pos.x, z: this.pos.z, byPlayer: true, shooter: this });
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

  tryEnterVehicle(ctx) {
    const v = ctx.vehicles.nearest(this.pos.x, this.pos.z, 4.5, (c) => !c.wrecked && c.driver !== 'player');
    if (!v) return;
    const right = v.right();
    const side = ((this.pos.x - v.pos.x) * right.x + (this.pos.z - v.pos.z) * right.z) > 0 ? 1 : -1;
    this.enter = { mode: 'in', vehicle: v, t: 0, side, start: this.pos.clone(), jacked: v.driver && v.driver !== 'player' };
    emit('player:entering', { vehicle: v, jacked: !!this.enter.jacked });
  }

  updateEnterExit(dt, ctx) {
    const e = this.enter;
    const v = e.vehicle;
    e.t += dt;
    const door = v.doorPoint(e.side);
    if (e.mode === 'in') {
      if (e.t < 0.45) {
        // walk to the door
        const k = e.t / 0.45;
        this.pos.x = e.start.x + (door.x - e.start.x) * k;
        this.pos.z = e.start.z + (door.z - e.start.z) * k;
        this.heading = dampAngle(this.heading, Math.atan2(v.pos.x - door.x, -(v.pos.z - door.z)), 14, dt);
        poseHuman(this.rig, 'walk', 3, dt);
      } else if (e.t < 0.95) {
        if (e.jacked && !e.pulled) {
          e.pulled = true;
          emit('player:carjack', { vehicle: v, door, side: e.side });
          v.driver = null;
          v.input.throttle = 0; v.input.brake = 1;
        }
        // slide into the seat
        const k = (e.t - 0.45) / 0.5;
        this.pos.x = door.x + (v.pos.x - door.x) * k * 0.8;
        this.pos.z = door.z + (v.pos.z - door.z) * k * 0.8;
        this.heading = dampAngle(this.heading, v.heading, 10, dt);
        poseHuman(this.rig, 'drive', 0, dt);
        this.rig.userData.arms[e.side > 0 ? 0 : 1].rotation.x = -1.6 + Math.sin(e.t * 20) * 0.3;
      } else {
        this.enter = null;
        this.vehicle = v;
        v.driver = 'player';
        v.input.brake = 0;
        this.rig.visible = !v.spec.bike ? false : true;
        emit('player:entered', { vehicle: v });
      }
    } else {
      const k = Math.min(1, e.t / 0.5);
      this.pos.x = v.pos.x + (door.x - v.pos.x) * k;
      this.pos.z = v.pos.z + (door.z - v.pos.z) * k;
      this.pos.y = groundHeight(this.pos.x, this.pos.z);
      poseHuman(this.rig, 'walk', 2, dt);
      if (e.t >= 0.5) { this.enter = null; emit('player:exited', { vehicle: v }); }
    }
    this.syncRig(dt);
  }

  updateDriving(dt, ctx) {
    const v = this.vehicle;
    const locked = this.controlsLocked;
    v.input.throttle = !locked && isDown('KeyW') ? 1 : 0;
    v.input.brake = !locked && isDown('KeyS') ? 1 : 0;
    v.input.steer = locked ? 0 : (isDown('KeyD') ? 1 : 0) - (isDown('KeyA') ? 1 : 0);
    v.input.handbrake = !locked && isDown('Space');
    if (this.autoDrive) Object.assign(v.input, this.autoDrive); // scripted scenes
    if (!locked && wasPressed('KeyH')) emit('sound', { name: 'horn' });
    if (!locked && v.spec.police && wasPressed('KeyG')) v.sirenOn = !v.sirenOn;
    this.pos.set(v.pos.x, v.pos.y, v.pos.z);
    this.heading = v.heading;
    if (v.spec.bike) {
      poseHuman(this.rig, 'drive', 0, dt);
      this.rig.userData.hips.position.y = 0.85;
      this.syncRig(dt);
      this.rig.rotation.z = v.mesh.rotation.z;
    }
    // drive-by: aim and fire to the sides with the pistol or SMG
    const mouse = mouseState();
    this.aiming = !locked && mouse.right && this.weapon !== 'shotgun' && this.weapon !== 'fists';
    if (this.aiming && mouse.left && this.cooldown <= 0) this.fire(ctx);
    if (!locked && (wasPressed('Digit2'))) this.selectWeapon('pistol');
    if (!locked && (wasPressed('Digit3'))) this.selectWeapon('smg');
    if (!locked && wasPressed('KeyF') && Math.abs(v.speed) < 9) {
      this.vehicle = null;
      v.driver = null;
      v.input.throttle = 0; v.input.brake = 0.4; v.input.steer = 0; v.input.handbrake = true;
      this.rig.visible = true;
      this.rig.rotation.z = 0;
      this.enter = { mode: 'out', vehicle: v, t: 0, side: -1 };
      emit('player:exiting', { vehicle: v });
    }
    if (v.wrecked && v.health <= 0 && !this.dead) {
      this.hurt(60, { explosion: true });
      this.vehicle = null;
      v.driver = null;
      this.rig.visible = true;
      const door = v.doorPoint(-1);
      this.pos.set(door.x, groundHeight(door.x, door.z), door.z);
    }
  }

  syncRig() {
    this.rig.position.set(this.pos.x, this.pos.y, this.pos.z);
    this.rig.rotation.y = -this.heading;
  }
}

