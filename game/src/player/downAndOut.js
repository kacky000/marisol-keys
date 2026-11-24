// Wasted and busted: the screen message and filter while the player is down, then the respawn
// at Sunwake Medical (a $150 bill) or outside the MKPD precinct ($300 and half the heavy ammo).

import { RESPAWN } from '../buildings/landmarkSigns.js';

const DOWN_SECONDS = 3.5;

export function playerDown(game, cause) {
  if (game.downTimer) return;
  const busted = cause === 'busted';
  game.hud.bigMessage(busted ? 'BUSTED' : 'WASTED', busted ? 'Captain Hale sends his regards' : 'Sunwake Medical patched you up', DOWN_SECONDS);
  game.downTimer = DOWN_SECONDS;
  game.downBusted = busted;
  game.player.controlsLocked = true; // cuffed (or down): no driving off or shooting while it plays out
  if (game.player.vehicle) { const v = game.player.vehicle; v.input.throttle = 0; v.input.brake = 1; }
  document.body.classList.add(busted ? 'busted' : 'wasted');
}

export function respawn(game) {
  const p = game.player, busted = game.downBusted;
  const spot = busted ? RESPAWN.precinct : RESPAWN.hospital;
  game.state.money = Math.max(0, game.state.money - (busted ? 300 : 150));
  if (busted) { p.ammo.smg = Math.floor(p.ammo.smg / 2); p.ammo.shotgun = Math.floor(p.ammo.shotgun / 2); }
  p.dead = false;
  p.health = 100;
  p.armor = Math.max(p.armor, 0);
  if (p.vehicle) { p.vehicle.driver = null; p.vehicle = null; }
  p.enter = null;
  p.rig.visible = true;
  p.controlsLocked = false;
  p.placeAt(spot.x, spot.z, 0);
  game.wanted.clear();
  game.police.clearAll(p);
  game.downTimer = 0;
  document.body.classList.remove('busted', 'wasted');
}
