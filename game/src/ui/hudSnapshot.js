// Everything the HUD draws this frame, gathered from the game: money, clock and weather, stars,
// health and armour, weapon and ammo, the vehicle, and the minimap with every blip (story, jobs,
// shops, pickups, events, stunts, gangs, waypoint, police units, officers and Air One).

export function buildHudSnapshot(game) {
  const p = game.player;
  const v = p.vehicle;
  const blips = [...game.missions.blips(), ...game.activities.blips(), ...game.shops.blips(), ...game.pickups.blips(), ...game.events.blips(), ...game.stunts.blips(), ...game.gangs.blips()];
  if (game.waypoint) {
    if (Math.hypot(p.pos.x - game.waypoint.x, p.pos.z - game.waypoint.z) < 15) { game.waypoint = null; game.hud.toast('Waypoint reached'); }
    else blips.push({ ...game.waypoint, kind: 'waypoint' });
  }
  for (const u of game.police.units) if (!u.vehicle.wrecked && !u.vehicle.removed) blips.push({ x: u.vehicle.pos.x, z: u.vehicle.pos.z, kind: 'police' });
  for (const o of game.police.officers) if (o.alive) blips.push({ x: o.pos.x, z: o.pos.z, kind: 'police' });
  if (game.police.heli) blips.push({ x: game.police.heli.pos.x, z: game.police.heli.pos.z, kind: 'heli' });
  const heading = v ? v.heading : game.camera.yaw;
  const w = game.wanted;
  return {
    money: game.state.money, snapMoney: game.shotMode, weatherIcon: game.weather.icon, hour: game.state.hour, stars: w.stars, starsFlash: w.flash,
    health: p.health, armor: p.armor, weapon: p.weapon, clip: p.clip[p.weapon], ammo: p.ammo[p.weapon],
    vehicle: v, aiming: p.aiming && !v,
    map: { x: p.pos.x, z: p.pos.z, heading, boat: !!v?.spec.boat, arrowRel: (v ? 0 : p.heading - heading), speed: v ? Math.abs(v.speed) : 0, blips, time: game.time,
      zone: w.stars > 0 ? { ...w.zone, seen: w.seen } : null },
  };
}
