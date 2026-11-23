// Vehicle damage feedback: engine smoke when hurt, flames when critical, explosions that hurt
// everything nearby, crash sparks, and tyre dust while drifting.

import { on, emit } from '../core/events.js';

export function startDamageEffects(game) {
  on('vehicle:exploded', ({ vehicle }) => {
    const p = vehicle.pos;
    game.fx.particles.explosion(p.x, p.y + 0.8, p.z);
    game.fx.tracers.flash(vehicle.mesh.position.clone().setY(2));
    emit('sound', { name: 'explosion', x: p.x, z: p.z });
    emit('explosion', { x: p.x, z: p.z });
    game.camera.shake = Math.max(game.camera.shake, 1.2 / Math.max(1, Math.hypot(game.player.pos.x - p.x, game.player.pos.z - p.z) / 10));
    for (const person of game.targets.people) {
      const d = Math.hypot(person.pos.x - p.x, person.pos.z - p.z);
      if (d < 7 && person.alive) person.hurt(person === game.player ? 45 * (1 - d / 7) : 120, { x: p.x, z: p.z, explosion: true, byPlayer: vehicle.lastDamager === 'player' });
    }
    for (const v of game.vehicles.list) {
      if (v === vehicle) continue;
      const d = Math.hypot(v.pos.x - p.x, v.pos.z - p.z);
      if (d < 8) { v.damage(400 * (1 - d / 8), 'explosion'); v.vel.x += (v.pos.x - p.x) / d * 6; v.vel.y += (v.pos.z - p.z) / d * 6; }
    }
    if (vehicle.lastDamager === 'player') emit('crime', { type: 'vehicle-explosion', x: p.x, z: p.z });
  });
  on('vehicle:impact', ({ impact, x, z, vehicle }) => {
    game.fx.particles.sparks(x, 0.8, z, Math.min(20, impact));
    if (vehicle === game.player.vehicle) { emit('sound', { name: 'crash' }); game.camera.shake = Math.max(game.camera.shake, impact * 0.02); }
  });
  on('vehicle:collision', ({ impact, x, z, a, b }) => {
    game.fx.particles.sparks(x, 0.9, z, Math.min(16, impact));
    if (a === game.player.vehicle || b === game.player.vehicle) { emit('sound', { name: 'crash' }); game.camera.shake = Math.max(game.camera.shake, impact * 0.02); }
  });
  let timer = 0;
  return (dt) => {
    timer -= dt;
    if (timer > 0) return;
    timer = 0.06;
    for (const v of game.vehicles.list) {
      const frac = v.health / v.spec.health;
      const f = v.forward();
      const hx = v.pos.x + f.x * v.spec.len * 0.38, hz = v.pos.z + f.z * v.spec.len * 0.38;
      if (v.wrecked && v.burning > 0) { game.fx.particles.fire(v.pos.x, v.pos.y + 1, v.pos.z); game.fx.particles.carSmoke(v.pos.x, v.pos.y + 2, v.pos.z, true); }
      else if (frac < 0.2) { game.fx.particles.fire(hx, v.pos.y + 1, hz); game.fx.particles.carSmoke(hx, v.pos.y + 1.4, hz, true); }
      else if (frac < 0.45) game.fx.particles.carSmoke(hx, v.pos.y + 1.2, hz, false);
      if (v.drifting && Math.abs(v.speed) > 6) {
        const r = v.right();
        for (const s of [-1, 1]) game.fx.particles.dust(v.pos.x - f.x * v.spec.len * 0.4 + r.x * s * 0.9, 0.3, v.pos.z - f.z * v.spec.len * 0.4 + r.z * s * 0.9, 0.8);
      }
    }
  };
}
