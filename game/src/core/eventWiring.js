// Connects the game-wide event bus to the systems that react: sounds, wanted-level toasts,
// hit feedback, carjack victims, radio on entering a car, and the kill counter.

import { on } from './events.js';
import { playSound } from '../audio/soundEffects.js';

export function wireGameEvents(game) {
  on('sound', ({ name }) => playSound(name));
  on('wanted:changed', ({ stars, before }) => {
    if (stars > before) { playSound('wanted'); if (before === 0) game.hud.toast('<b>MKPD</b> is on to you'); }
  });
  on('wanted:evaded', () => { game.hud.bigMessage('LOST THEM', 'The MKPD gave up the search', 2.5); game.police.clearAll(game.player); });
  on('player:hurt', () => { game.hud.flashHit(); game.player.sinceHurt = 0; });
  on('player:shot', ({ hits }) => { if (hits.length) game.hud.hitMarker(); });
  on('hud:prompt', ({ html }) => game.hud.toast(html));
  on('player:carjack', ({ vehicle, door }) => {
    const ped = game.peds.spawnAt(door.x, door.z);
    ped.flee(vehicle.pos.x, vehicle.pos.z, 10);
    playSound('door');
    game.traffic.release(vehicle);
  });
  on('player:entered', ({ vehicle }) => {
    game.traffic.release(vehicle);
    if (vehicle.spec.police || vehicle.spec.ambulance) vehicle.sirenOn = false;
    game.hud.setRadio(game.radio.tune(game.radio.index));
    playSound('door');
  });
  on('player:down', ({ cause }) => game.playerDown(cause));
  on('ped:killed', ({ source }) => { if (source?.byPlayer) game.state.stats.kills++; });
}
