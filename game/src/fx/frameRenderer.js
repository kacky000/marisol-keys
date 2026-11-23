// Draws one frame: applies the clock and weather to sky, sun, fog and reflections, lights the
// city for the hour (signs, shopfronts, windows, street lamps, headlights), trims shadow casters
// to the player's surroundings, then renders through the post-processing chain.

import { fitToWindow } from '../core/renderer.js';
import { skyStateAt } from '../sky/timeOfDay.js';
import { updateLighting } from '../sky/sunLight.js';
import { updateSkyDome } from '../sky/skyDome.js';
import { roadMaterials } from '../roads/roadMesh.js';
import { lampHeads } from '../props/streetFurniture.js';

// Emissive city lights follow the night factor.
function lightTheCity(game, state) {
  const w = game.world;
  w.signMaterial.emissiveIntensity = 0.25 + state.night * 1.4;
  if (w.shopMaterial) w.shopMaterial.emissiveIntensity = 0.3 + state.night * 1.6;
  for (const m of w.nightMaterials) m.emissiveIntensity = state.night * 0.95;
  if (game.police.heli) game.police.heli.night = state.night > 0.3;
}

// A small pool of real lights follows the street lamps nearest the player after dusk
// (toggling visibility only at dusk and dawn keeps daytime shaders free of these lights).
function placeNightLamps(game, state, focus) {
  const lamps = state.night > 0.3 ? lampHeads.map((l) => [l, l.distanceToSquared(focus)]).sort((a, b) => a[1] - b[1]).slice(0, game.nightLights.length) : [];
  game.nightLights.forEach((l, k) => { l.visible = !!lamps[k]; if (lamps[k]) { l.position.copy(lamps[k][0]); l.intensity = 30 * state.night; } });
}

// Only nearby people and cars cast shadows (the shadow map covers ~110 m around the player);
// headlight pools show on nearby cars after dark. Refreshed every 20 frames.
function trimShadowCasters(game, state, focus) {
  game.shadowTimer = (game.shadowTimer || 0) - 1;
  if (game.shadowTimer > 0) return;
  game.shadowTimer = 20;
  const near = (o, r) => (o.pos.x - focus.x) ** 2 + (o.pos.z - focus.z) ** 2 < r * r;
  for (const ped of game.peds.peds) { const on = near(ped, 60); ped.rig.traverse((m) => { if (m.isMesh) m.castShadow = on; }); }
  for (const car of game.vehicles.list) {
    const on = near(car, 90);
    car.mesh.traverse((m) => { if (m.isMesh) m.castShadow = on; });
    const beam = car.mesh.userData.beam;
    if (beam) beam.visible = state.night > 0.35 && !car.wrecked && !car.spec.boat && near(car, 160);
  }
}

export function renderFrame(game) {
  fitToWindow(game.renderer, game.threeCamera);
  const state = game.weather.apply(skyStateAt(game.state.hour));
  const focus = game.player.pos;
  const wet = game.weather.rainAmount || 0;
  for (const m of roadMaterials) m.roughness = 0.92 - wet * 0.6;
  updateLighting(game.lights, game.scene, state, focus, game.drawDistance || 900);
  updateSkyDome(game.sky, state, game.threeCamera, game.time);
  game.skyEnv.update(state);
  lightTheCity(game, state);
  placeNightLamps(game, state, focus);
  trimShadowCasters(game, state, focus);
  const v = game.player.vehicle;
  const speedBlur = v ? Math.max(0, Math.abs(v.speed) - 24) / 40 : 0;
  game.post.render(game.scene, game.threeCamera, { exposure: 1.0 + state.night * 0.35, bloom: 0.45 + state.night * 0.5, speedBlur: Math.min(0.6, speedBlur) });
}
