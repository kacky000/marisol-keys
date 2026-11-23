// Tessa at the wheel: keyboard to throttle, brake, steer and handbrake, horn and siren, drive-by
// shooting, the seated pose for bikes, convertibles and boats, getting out, and bailing from a wreck.

import { isDown, wasPressed, mouseState } from '../core/input.js';
import { poseHuman } from '../peds/humanModel.js';
import { groundHeight } from '../world/groundHeight.js';
import { emit } from '../core/events.js';
import { exitVehicle } from './vehicleEntry.js';

function seatRider(player, v, dt) {
  if (v.spec.bike) {
    poseHuman(player.rig, 'drive', 0, dt);
    player.rig.userData.hips.position.y = 0.85;
    player.syncRig(dt);
    player.rig.rotation.z = v.mesh.rotation.z;
  } else if (v.spec.open || v.spec.boat) {
    // seated at the wheel (driver's side, left)
    poseHuman(player.rig, 'drive', 0, dt);
    const r = v.right(), f = v.forward();
    const seatSide = v.spec.boat ? 0 : -0.42, seatBack = v.spec.boat ? 1.4 : 0.55;
    player.rig.userData.hips.position.y = v.spec.boat ? 0.9 : 0.7;
    player.rig.position.set(v.pos.x + r.x * seatSide - f.x * seatBack, v.pos.y + (v.spec.boat ? -0.2 : -0.05), v.pos.z + r.z * seatSide - f.z * seatBack);
    player.rig.rotation.set(0, -v.heading, 0);
  }
}

export function updateDriving(player, dt, ctx) {
  const v = player.vehicle;
  const locked = player.controlsLocked;
  v.input.throttle = !locked && isDown('KeyW') ? 1 : 0;
  v.input.brake = !locked && isDown('KeyS') ? 1 : 0;
  v.input.steer = locked ? 0 : (isDown('KeyD') ? 1 : 0) - (isDown('KeyA') ? 1 : 0);
  v.input.handbrake = !locked && isDown('Space');
  if (player.autoDrive) Object.assign(v.input, player.autoDrive); // scripted scenes
  if (!locked && wasPressed('KeyH')) emit('sound', { name: 'horn' });
  if (!locked && v.spec.police && wasPressed('KeyG')) v.sirenOn = !v.sirenOn;
  player.pos.set(v.pos.x, v.pos.y, v.pos.z);
  player.heading = v.heading;
  seatRider(player, v, dt);
  // drive-by: aim and fire to the sides with the pistol or SMG
  const mouse = mouseState();
  player.aiming = !locked && mouse.right && player.weapon !== 'shotgun' && player.weapon !== 'fists';
  if (player.aiming && mouse.left && player.cooldown <= 0) player.fire(ctx);
  if (!locked && wasPressed('Digit2')) player.selectWeapon('pistol');
  if (!locked && wasPressed('Digit3')) player.selectWeapon('smg');
  if (!locked && wasPressed('KeyF')) exitVehicle(player);
  // the car blew up around her
  if (v.wrecked && v.health <= 0 && !player.dead && player.vehicle === v) {
    player.hurt(60, { explosion: true });
    player.vehicle = null;
    v.driver = null;
    player.rig.visible = true;
    const door = v.doorPoint(-1);
    player.pos.set(door.x, groundHeight(door.x, door.z), door.z);
  }
}
