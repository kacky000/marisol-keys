// Getting in and out of vehicles: pick the nearest car (or a boat off the quay), walk to its door,
// pull out any driver (a carjacking), slide into the seat; and the reverse, stepping off boats
// onto the nearest dry footing.

import { poseHuman } from '../peds/humanModel.js';
import { groundHeight } from '../world/groundHeight.js';
import { emit } from '../core/events.js';
import { dampAngle } from '../core/mathUtil.js';

// Nearest dry footing within a few metres of a boat (quay, pier or beach), or null.
export function landingSpot(x, z) {
  for (const r of [3, 4.5, 6, 7.5]) {
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
      if (groundHeight(px, pz) > -0.4) return { x: px, z: pz };
    }
  }
  return null;
}

export function tryEnterVehicle(player, vehicles) {
  // boats sit off the quay, so they can be boarded from a little further away
  const v = vehicles.nearest(player.pos.x, player.pos.z, 4.5, (c) => !c.wrecked && c.driver !== 'player')
    || vehicles.nearest(player.pos.x, player.pos.z, 9.5, (c) => c.spec.boat && !c.wrecked && c.driver !== 'player');
  if (!v) return;
  const right = v.right();
  const side = ((player.pos.x - v.pos.x) * right.x + (player.pos.z - v.pos.z) * right.z) > 0 ? 1 : -1;
  player.enter = { mode: 'in', vehicle: v, t: 0, side, start: player.pos.clone(), jacked: v.driver && v.driver !== 'player' };
  emit('player:entering', { vehicle: v, jacked: !!player.enter.jacked });
}

// Leave the vehicle (boats need a landing spot nearby). Returns true when Tessa gets out.
export function exitVehicle(player) {
  const v = player.vehicle;
  let shore = null;
  if (v.spec.boat) {
    shore = landingSpot(v.pos.x, v.pos.z);
    if (!shore) { emit('hud:prompt', { html: 'Bring the boat alongside a quay or the beach to get out' }); return false; }
    v.vel.set(0, 0);
  }
  if (Math.abs(v.speed) >= 9) return false;
  player.vehicle = null;
  v.driver = null;
  v.input.throttle = 0; v.input.brake = 0.4; v.input.steer = 0; v.input.handbrake = true;
  player.rig.visible = true;
  player.rig.rotation.z = 0;
  player.enter = { mode: 'out', vehicle: v, t: 0, side: -1, target: shore };
  emit('player:exiting', { vehicle: v });
  return true;
}

// Animates the walk to the door, the carjack and the slide into the seat (or the way out).
export function updateEnterExit(player, dt) {
  const e = player.enter;
  const v = e.vehicle;
  e.t += dt;
  const door = e.target || v.doorPoint(e.side);
  if (e.mode === 'in') {
    if (e.t < 0.45) {
      // walk to the door
      const k = e.t / 0.45;
      player.pos.x = e.start.x + (door.x - e.start.x) * k;
      player.pos.z = e.start.z + (door.z - e.start.z) * k;
      player.heading = dampAngle(player.heading, Math.atan2(v.pos.x - door.x, -(v.pos.z - door.z)), 14, dt);
      poseHuman(player.rig, 'walk', 3, dt);
    } else if (e.t < 0.95) {
      if (e.jacked && !e.pulled) {
        e.pulled = true;
        emit('player:carjack', { vehicle: v, door, side: e.side });
        v.driver = null;
        v.input.throttle = 0; v.input.brake = 1;
      }
      // slide into the seat, reaching for the door
      const k = (e.t - 0.45) / 0.5;
      player.pos.x = door.x + (v.pos.x - door.x) * k * 0.8;
      player.pos.z = door.z + (v.pos.z - door.z) * k * 0.8;
      player.heading = dampAngle(player.heading, v.heading, 10, dt);
      poseHuman(player.rig, 'drive', 0, dt);
      player.rig.userData.arms[e.side > 0 ? 0 : 1].rotation.x = 1.6 + Math.sin(e.t * 20) * 0.3;
    } else {
      player.enter = null;
      player.vehicle = v;
      v.driver = 'player';
      v.input.brake = 0;
      player.rig.visible = !!(v.spec.bike || v.spec.open || v.spec.boat); // seen riding in open vehicles
      emit('player:entered', { vehicle: v });
    }
  } else {
    const k = Math.min(1, e.t / 0.5);
    player.pos.x = v.pos.x + (door.x - v.pos.x) * k;
    player.pos.z = v.pos.z + (door.z - v.pos.z) * k;
    player.pos.y = groundHeight(player.pos.x, player.pos.z);
    poseHuman(player.rig, 'walk', 2, dt);
    if (e.t >= 0.5) { player.enter = null; emit('player:exited', { vehicle: v }); }
  }
  player.syncRig(dt);
}
