// Turns what the player does into reported crimes: shots in public, assaults, run-overs,
// carjackings, attacks on officers and stolen cruisers.

import { on, emit } from '../core/events.js';

export function startCrimeWatch(game) {
  let lastShotReport = -10;
  const crime = (type, x, z) => emit('crime', { type, x, z, witnessed: true });
  on('player:shot', () => {
    const p = game.player.pos;
    if (game.time - lastShotReport > 2.5 && !game.missions.suppressShotCrime) {
      lastShotReport = game.time;
      crime('gunfire', p.x, p.z);
    }
  });
  on('ped:killed', ({ ped, source }) => {
    if (!source || !source.byPlayer) return;
    if (ped.kind === 'cop') crime('kill-cop', ped.pos.x, ped.pos.z);
    else if (ped.kind === 'civilian') crime('kill-civilian', ped.pos.x, ped.pos.z);
  });
  on('player:melee', ({ target }) => {
    if (target.kind === 'cop') crime('shoot-cop', target.pos.x, target.pos.z);
    else if (target.kind === 'civilian') crime('assault', target.pos.x, target.pos.z);
  });
  on('ped:runover', ({ ped, vehicle }) => {
    if (vehicle === game.player.vehicle) crime('runover', ped.pos.x, ped.pos.z);
  });
  on('player:carjack', ({ vehicle }) => crime(vehicle.spec.police ? 'steal-police-car' : 'carjack', vehicle.pos.x, vehicle.pos.z));
  on('player:entered', ({ vehicle }) => { if (vehicle.spec.police) crime('steal-police-car', vehicle.pos.x, vehicle.pos.z); });
  on('vehicle:collision', ({ a, b }) => {
    const pv = game.player.vehicle;
    if (!pv) return;
    const other = a === pv ? b : b === pv ? a : null;
    if (other && other.spec.police) crime('hit-cop-car', other.pos.x, other.pos.z);
  });
}
