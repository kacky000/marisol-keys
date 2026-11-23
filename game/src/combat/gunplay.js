// Hitscan shooting shared by the player, police and gang enemies: spread, pellets, ray tests
// against people, vehicles and buildings, then damage, tracers, sparks, blood and noise.

import * as THREE from 'three';
import { raycastStatic } from '../world/collisionWorld.js';
import { emit } from '../core/events.js';
import { rng } from '../core/rng.js';

const tmpFrom = new THREE.Vector3(), tmpTo = new THREE.Vector3();

// Ray vs vertical capsule approximated by a sphere at chest height and one at the legs.
function rayPerson(o, d, p, maxD) {
  let best = Infinity;
  for (const [h, r] of [[1.35, 0.42], [0.75, 0.38]]) {
    const cx = p.pos.x - o.x, cy = p.pos.y + h - o.y, cz = p.pos.z - o.z;
    const t = cx * d.x + cy * d.y + cz * d.z;
    if (t < 0 || t > maxD) continue;
    const dx = cx - d.x * t, dy = cy - d.y * t, dz = cz - d.z * t;
    if (dx * dx + dy * dy + dz * dz < r * r) best = Math.min(best, t);
  }
  return best;
}

function rayVehicle(o, d, v, maxD) {
  const cx = v.pos.x - o.x, cy = v.pos.y + v.spec.height * 0.5 - o.y, cz = v.pos.z - o.z;
  const t = cx * d.x + cy * d.y + cz * d.z;
  if (t < 0 || t > maxD) return Infinity;
  // test against an oriented box in the car's frame
  const px = o.x + d.x * t - v.pos.x, pz = o.z + d.z * t - v.pos.z, py = o.y + d.y * t - v.pos.y;
  const f = v.forward();
  const along = px * f.x + pz * f.z, side = px * -f.z + pz * f.x;
  if (Math.abs(along) < v.spec.len / 2 && Math.abs(side) < v.spec.width / 2 + 0.1 && py > 0 && py < v.spec.height + 0.2) return t;
  return Infinity;
}

// shooter: { pos, team } — team 'player' | 'police' | 'gang'. targets: { people: [...], vehicles: [...] }
export function fireWeapon(weapon, origin, dir, shooter, targets, fx) {
  const results = [];
  const pellets = weapon.pellets || 1;
  for (let k = 0; k < pellets; k++) {
    const d = new THREE.Vector3(dir.x + (rng.next() - 0.5) * weapon.spread * 2, dir.y + (rng.next() - 0.5) * weapon.spread * 2, dir.z + (rng.next() - 0.5) * weapon.spread * 2).normalize();
    let hitT = raycastStatic(origin.x, origin.y, origin.z, d.x, d.y, d.z, weapon.range);
    let hitObj = null, hitKind = 'world';
    if (d.y < -0.001) {
      const tg = (origin.y - 0.05) / -d.y;
      if (tg < hitT) { hitT = tg; hitKind = 'ground'; }
    }
    for (const p of targets.people) {
      if (p === shooter || !p.alive || p.team === shooter.team) continue;
      const t = rayPerson(origin, d, p, hitT);
      if (t < hitT) { hitT = t; hitObj = p; hitKind = 'person'; }
    }
    for (const v of targets.vehicles) {
      if (v === shooter.vehicle) continue;
      const t = rayVehicle(origin, d, v, hitT);
      if (t < hitT) { hitT = t; hitObj = v; hitKind = 'vehicle'; }
    }
    const end = Math.min(hitT, weapon.range);
    tmpFrom.copy(origin);
    tmpTo.set(origin.x + d.x * end, origin.y + d.y * end, origin.z + d.z * end);
    if (fx) {
      if (k === 0 || pellets > 1 && k % 3 === 0) fx.tracers.shoot(tmpFrom.clone().addScaledVector(d, 0.8), tmpTo.clone(), 0.08, shooter.team === 'player' ? null : '#ffb0a0');
      if (hitKind === 'person') fx.particles.blood(tmpTo.x, tmpTo.y, tmpTo.z);
      else if (hitT < weapon.range) fx.particles.sparks(tmpTo.x, tmpTo.y, tmpTo.z, 6);
    }
    if (hitObj && hitKind === 'person') {
      const killed = hitObj.hurt(weapon.damage, { x: origin.x, z: origin.z, byPlayer: shooter.team === 'player', shooter });
      results.push({ kind: 'person', target: hitObj, killed });
    } else if (hitObj && hitKind === 'vehicle') {
      hitObj.lastDamager = shooter.team;
      hitObj.damage(weapon.damage * 2.2, 'bullet');
      results.push({ kind: 'vehicle', target: hitObj });
    }
  }
  if (fx) {
    fx.particles.muzzle(origin.x + dir.x * 0.7, origin.y + dir.y * 0.7, origin.z + dir.z * 0.7, dir.x, dir.z);
    fx.tracers.flash(new THREE.Vector3(origin.x + dir.x, origin.y + 0.1, origin.z + dir.z));
  }
  emit('gunfire', { x: origin.x, z: origin.z, team: shooter.team, weapon: weapon.id });
  return results;
}
