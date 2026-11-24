// Per-frame audio mix: the player's engine and tyres, the nearest siren (and whose it is),
// the car radio while driving, and the island's ambience (surf, gulls, rain, footsteps).

export function updateSoundscape(game, dt) {
  if (!game.vehicleAudio) return; // audio starts with the first New Game / Continue
  const p = game.player;
  let near = Infinity, count = 0, kind = 'police';
  for (const v of game.vehicles.list) {
    if (!v.sirenOn) continue;
    count++;
    const d = Math.hypot(v.pos.x - p.pos.x, v.pos.z - p.pos.z);
    if (d < near) { near = d; kind = v.spec.ambulance ? 'ambulance' : v.spec.firetruck ? 'fire' : 'police'; }
  }
  game.vehicleAudio.update(p, near, count, kind);
  game.radio.update(!!p.vehicle && !game.dialogue.open);
  game.ambience.update(dt, p, game.time, game.weather.rainAmount || 0);
}
