// Armed NPCs (police officers and harbor gang crews): hold a post, advance to firing range,
// strafe, check line of sight and shoot at the player with imperfect aim.

import * as THREE from 'three';
import { Ped } from '../peds/pedSystem.js';
import { poseHuman } from '../peds/humanModel.js';
import { WEAPONS } from './weaponDefs.js';
import { fireWeapon } from './gunplay.js';
import { raycastStatic, resolveCircle } from '../world/collisionWorld.js';
import { groundHeight } from '../world/groundHeight.js';
import { dampAngle } from '../core/mathUtil.js';
import { rng } from '../core/rng.js';

export const NPC_DAMAGE = 0.32;   // share of a weapon's damage when an NPC pulls the trigger

export const POLICE_OUTFIT = { skin: '#c68e62', shirt: '#1f3d66', pants: '#14233b', hair: '#1d1a17', shorts: false, hat: 'police', shades: false, shoes: '#111', badge: true, longSleeves: false, build: 1.04 };
export const GANG_OUTFITS = [
  { skin: '#b97a55', shirt: '#2b2d42', pants: '#4a4e69', hair: '#111', shorts: false, hat: 'cap', hatColor: '#d62828', shades: true, shoes: '#222', build: 1.05, vest: '#3d3d3d' },
  { skin: '#f1c7a5', shirt: '#d62828', pants: '#2b2d42', hair: '#4a2c1a', shorts: false, hat: null, shades: true, shoes: '#222', build: 1.08 },
  { skin: '#8d5a3b', shirt: '#f77f00', pants: '#1d3557', hair: '#111', shorts: false, hat: 'cap', hatColor: '#111', shades: false, shoes: '#eee', build: 1.0, vest: '#264653' },
];

export class Gunman extends Ped {
  constructor(scene, x, z, outfit, team, weaponId = 'pistol') {
    super(scene, x, z, outfit, team === 'police' ? 'cop' : 'gang');
    this.team = team;
    this.weapon = WEAPONS[weaponId];
    this.npcWeapon = { ...this.weapon, damage: this.weapon.damage * NPC_DAMAGE };
    this.rig.userData.gun.visible = true;
    this.mode = 'guard';
    this.cooldown = 1 + rng.next();
    this.accuracy = team === 'police' ? 0.55 : 0.45;
    this.preferRange = 10 + rng.next() * 10;
    this.strafe = rng.next() < 0.5 ? -1 : 1;
    this.alertRange = 32;
    this.health = team === 'police' ? 110 : 90;
    this.persistent = true;
  }

  hurt(amount, source) {
    const killed = super.hurt(amount, source);
    if (this.state === 'flee') this.state = 'walk';
    this.mode = 'attack';
    return killed;
  }

  canSee(target) {
    const ox = this.pos.x, oy = this.pos.y + 1.5, oz = this.pos.z;
    const dx = target.pos.x - ox, dy = target.pos.y + 1.2 - oy, dz = target.pos.z - oz;
    const d = Math.hypot(dx, dy, dz);
    return raycastStatic(ox, oy, oz, dx / d, dy / d, dz / d, d) >= d - 0.5;
  }

  // ctx: { player, targets, fx, dt, active }
  think(dt, ctx) {
    if (!this.alive) { super.update(dt); return; }
    const p = ctx.player;
    const dx = p.pos.x - this.pos.x, dz = p.pos.z - this.pos.z;
    const dist = Math.hypot(dx, dz);
    if (this.mode === 'guard' && (dist < this.alertRange || ctx.alert)) this.mode = 'attack';
    let move = 0, moveDir = 0;
    const face = Math.atan2(dx, -dz);
    let state = 'idle';
    if (this.mode === 'arrest' && p.alive) {
      // move in to cuff the suspect; draw down only if they get violent
      this.heading = dampAngle(this.heading, face, 8, dt);
      if (ctx.hostile) this.mode = 'attack';
      else if (dist > 1.8) { move = dist > 8 ? 4.8 : 2.4; moveDir = face; state = dist > 8 ? 'run' : 'aim'; }
      else state = 'aim';
    }
    if (this.mode === 'attack' && p.alive) {
      this.heading = dampAngle(this.heading, face, 8, dt);
      const sees = dist < 70 && this.canSee(p);
      if (dist > this.preferRange + 4 || !sees) { move = 4.6; moveDir = face; state = 'run'; }
      else if (dist < this.preferRange - 5) { move = 2; moveDir = face + Math.PI; state = 'aim'; }
      else { move = 1.4; moveDir = face + this.strafe * Math.PI / 2; state = 'aim'; if (rng.next() < dt * 0.3) this.strafe *= -1; }
      this.cooldown -= dt;
      if (sees && dist < this.weapon.range && this.cooldown <= 0) {
        // NPCs fire in short, slower bursts and hit softer than the player, so fights last
        this.cooldown = 1 / this.weapon.rate * (3.2 + rng.next() * 2.5) + 0.25;
        const origin = new THREE.Vector3(this.pos.x, this.pos.y + 1.45, this.pos.z);
        const miss = (1 - this.accuracy) * (1.2 + dist * 0.03);
        const aim = new THREE.Vector3(p.pos.x + (rng.next() - 0.5) * miss * 2, p.pos.y + 1.1 + (rng.next() - 0.5) * miss, p.pos.z + (rng.next() - 0.5) * miss * 2);
        const dir = aim.sub(origin).normalize();
        fireWeapon(this.npcWeapon, origin, dir, this, ctx.targets, ctx.fx);
        ctx.onShot?.(this);
        state = 'aim';
      }
    }
    if (move) {
      this.pos.x += Math.sin(moveDir) * move * dt;
      this.pos.z += -Math.cos(moveDir) * move * dt;
      resolveCircle(this.pos, 0.38, this.pos.y);
      const gy = groundHeight(this.pos.x, this.pos.z);
      if (gy > -0.6) this.pos.y += (gy - this.pos.y) * Math.min(1, dt * 10);
    }
    poseHuman(this.rig, state === 'run' ? 'run' : state === 'aim' ? 'aim' : 'idle', move, dt);
    this.rig.position.set(this.pos.x, this.pos.y, this.pos.z);
    this.rig.rotation.y = -this.heading;
  }

  update() { /* driven by think() from the owning system */ }
}
