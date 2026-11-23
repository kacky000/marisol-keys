// The game: owns every system, runs the fixed-order update each frame, handles wasted/busted
// respawns, pause, phone, radio, saving, and the title-screen flyover.

import * as THREE from 'three';
// story and missions
import { MissionRunner } from '../missions/missionRunner.js';
import { ContactCast } from '../story/contactCharacters.js';
// police and the wanted level
import { WantedLevel } from '../police/wantedLevel.js';
import { PoliceDispatch } from '../police/policeDispatch.js';
import { startCrimeWatch } from '../police/crimeWatch.js';
import { DispatchRadio } from '../police/dispatchRadio.js';
// the player, vehicles, traffic and people
import { Player } from '../player/player.js';
import { VehicleManager } from '../vehicles/vehicleManager.js';
import { TrafficSystem } from '../traffic/trafficSystem.js';
import { PedSystem } from '../peds/pedSystem.js';
import { GameCamera } from '../camera/gameCamera.js';
// activities and the economy
import { SideJobs } from '../activities/sideJobs.js';
import { StreetEvents } from '../activities/streetEvents.js';
import { TidePages } from '../activities/tidePages.js';
import { Pickups } from '../activities/pickups.js';
import { Shops } from '../economy/shops.js';
// effects
import { ParticleFX } from '../fx/particles.js';
import { TracerFX } from '../fx/tracers.js';
import { startDamageEffects } from '../fx/damageEffects.js';
import { PostProcess } from '../fx/postProcess.js';
// the island, sky and light
import { buildWorld } from '../world/worldBuilder.js';
import { districtAtPoint, PLACES } from '../world/cityPlan.js';
import { createSkyDome, updateSkyDome } from '../sky/skyDome.js';
import { createLighting, updateLighting } from '../sky/sunLight.js';
import { skyStateAt } from '../sky/timeOfDay.js';
import { SkyEnvironment } from '../sky/skyEnvironment.js';
// engine plumbing
import { fitToWindow } from './renderer.js';
import { initInput, endInputFrame, wasPressed, menuPressed, setInputEnabled, pointerLocked } from './input.js';
import { on } from './events.js';
import { rng } from './rng.js';
// interface
import { Hud } from '../ui/hud.js';
import { DialogueBox } from '../ui/dialogueBox.js';
import { PhoneScreen } from '../ui/phoneScreen.js';
import { Menus } from '../ui/menus.js';
import { newGameState, saveGame, loadGame, loadSettings } from '../save/saveGame.js';
import { startAudio, applyVolumes } from '../audio/audioEngine.js';
import { playSound } from '../audio/soundEffects.js';
import { VehicleAudio } from '../audio/vehicleAudio.js';
import { Radio } from '../audio/radioStations.js';
import { Ambience } from '../audio/ambience.js';
import { lampHeads } from '../props/streetFurniture.js';

export class Game {
  constructor(renderer, camera, { shotMode = false } = {}) {
    this.renderer = renderer;
    this.threeCamera = camera;
    this.shotMode = shotMode;
    this.scene = new THREE.Scene();
    this.settings = loadSettings();
    this.state = newGameState();
    this.time = 0;
    this.running = false;
    this.paused = false;
  }

  init() {
    const s = this.scene;
    this.sky = createSkyDome();
    s.add(this.sky);
    this.lights = createLighting(s);
    this.skyEnv = new SkyEnvironment(this.renderer, s);
    this.post = new PostProcess(this.renderer);
    this.world = buildWorld(s);
    this.vehicles = new VehicleManager(s);
    // Riptide speedboats moored at the pier, in the harbor basin and on the bay
    for (const [x, z, h, paint] of [[852, 486.5, Math.PI / 2, '#ffffff'], [876, 486.5, Math.PI / 2, '#e63946'], [300, 925, 0, '#1d3557'], [96, 600, Math.PI, '#ffffff']]) {
      this.vehicles.spawn('boat', x, z, h, { paint }).persistent = true;
    }
    this.traffic = new TrafficSystem(this.vehicles, rng);
    this.peds = new PedSystem(s, rng);
    this.player = new Player(s);
    this.camera = new GameCamera(this.threeCamera);
    this.fx = { particles: new ParticleFX(s), tracers: new TracerFX(s) };
    this.wanted = new WantedLevel();
    this.police = new PoliceDispatch(s, this.vehicles, this.wanted);
    this.hud = new Hud();
    this.dialogue = new DialogueBox();
    this.missions = new MissionRunner(this);
    this.activities = new SideJobs(this);
    this.shops = new Shops(this);
    this.pages = new TidePages(this);
    this.contacts = new ContactCast(this);
    this.pickups = new Pickups(this);
    this.events = new StreetEvents(this);
    this.phone = new PhoneScreen(this);
    this.damageFx = startDamageEffects(this);
    this.radio = new Radio();
    this.dispatch = new DispatchRadio(this);
    startCrimeWatch(this);
    this.bindEvents();
    this.nightLights = this.makeNightLights();
    if (!this.shotMode) {
      initInput(this.renderer.domElement);
      this.menus = new Menus(this);
    }
    this.applySettings();
  }

  // A pool of warm point lights that follow the nearest street lamps after dusk.
  makeNightLights() {
    const pool = [];
    for (let k = 0; k < 6; k++) {
      const l = new THREE.PointLight('#ffcf8a', 0, 26, 1.6);
      this.scene.add(l);
      pool.push(l);
    }
    return pool;
  }

  get targets() {
    return {
      people: [...this.peds.peds, ...this.police.officers, ...this.missions.enemies, ...(this.events ? this.events.people : []), this.player],
      vehicles: this.vehicles.list,
    };
  }

  bindEvents() {
    on('sound', ({ name }) => playSound(name));
    on('wanted:changed', ({ stars, before }) => {
      if (stars > before) { playSound('wanted'); if (before === 0) this.hud.toast('<b>MKPD</b> is on to you'); }
    });
    on('wanted:evaded', () => { this.hud.bigMessage('LOST THEM', 'The MKPD gave up the search', 2.5); this.police.clearAll(this.player); });
    on('player:hurt', () => this.hud.flashHit());
    on('hud:prompt', ({ html }) => this.hud.toast(html));
    on('player:carjack', ({ vehicle, door }) => {
      const ped = this.peds.spawnAt(door.x, door.z);
      ped.flee(vehicle.pos.x, vehicle.pos.z, 10);
      playSound('door');
      this.traffic.release(vehicle);
    });
    on('player:entered', ({ vehicle }) => {
      this.traffic.release(vehicle);
      if (vehicle.spec.police) vehicle.sirenOn = false;
      this.hud.setRadio(this.radio.tune(this.radio.index));
      playSound('door');
    });
    on('player:down', ({ cause }) => this.playerDown(cause));
    on('ped:killed', ({ source }) => { if (source?.byPlayer) this.state.stats.kills++; });
  }

  applySettings() {
    const s = this.settings;
    this.camera.sens = 0.0024 * (s.sens / 100);
    this.camera.invertY = s.invert;
    this.renderer.shadowMap.enabled = s.shadows;
    this.drawDistance = s.draw;
    applyVolumes(s);
  }

  startGame(continueSave) {
    startAudio(this.settings);
    this.vehicleAudio ??= new VehicleAudio();
    this.ambience ??= new Ambience();
    const loaded = continueSave ? loadGame() : null;
    this.state = loaded || newGameState();
    const p = this.player;
    p.owned = new Set(this.state.weapons.owned);
    p.ammo = { fists: Infinity, ...this.state.weapons.ammo };
    p.clip = { fists: Infinity, pistol: 0, smg: 0, shotgun: 0 };
    for (const w of p.owned) p.reload(w, true);
    p.placeAt(this.state.position.x, this.state.position.z, this.state.position.heading);
    this.shops.lastDay = Math.floor((this.state.hour - 8) / 24);
    this.pages.refresh();
    this.running = true;
    this.hud.show(true);
    this.camera.yaw = p.heading;
    this.hud.bigMessage('MARISOL KEYS', loaded ? 'Welcome back' : 'Find Ozzie at the bait shop — follow the yellow route', 4);
    if (!loaded) this.hud.toast('Tip: press <b>M</b> for the map, <b>F</b> to take a car');
    this.renderer.domElement.focus();
  }

  save() { saveGame(this.state, this.player); }

  setPaused(v) {
    this.paused = v;
    setInputEnabled(!v);
    if (v) this.menus.show('menu-pause');
  }

  quitToTitle() {
    this.running = false;
    this.paused = false;
    setInputEnabled(true);
    this.hud.show(false);
    this.menus.openTitle();
  }

  playerDown(cause) {
    if (this.downTimer) return;
    const busted = cause === 'busted';
    this.hud.bigMessage(busted ? 'BUSTED' : 'WASTED', busted ? 'Captain Hale sends his regards' : 'Sunwake Medical patched you up', 3.5);
    this.downTimer = 3.5;
    this.downBusted = busted;
  }

  respawn() {
    const p = this.player;
    const spot = this.downBusted ? { x: PLACES.lumenTower.x, z: PLACES.lumenTower.z + 30 } : { x: PLACES.boardwalk.x - 4, z: PLACES.boardwalk.z };
    this.state.money = Math.max(0, this.state.money - (this.downBusted ? 300 : 150));
    if (this.downBusted) { p.ammo.smg = Math.floor(p.ammo.smg / 2); p.ammo.shotgun = Math.floor(p.ammo.shotgun / 2); }
    p.dead = false;
    p.health = 100;
    p.armor = Math.max(p.armor, 0);
    if (p.vehicle) { p.vehicle.driver = null; p.vehicle = null; }
    p.enter = null;
    p.rig.visible = true;
    p.placeAt(spot.x, spot.z, 0);
    this.wanted.clear();
    this.police.clearAll(p);
    this.downTimer = 0;
  }

  update(dt) {
    this.time += dt;
    if (!this.shotMode) this.handleGlobalKeys();
    if (this.paused || (this.phone.open && !this.shotMode)) return;
    if (this.running) this.state.hour += dt / 120; // a full day every 48 minutes
    const p = this.player;
    if (this.downTimer > 0) { this.downTimer -= dt; if (this.downTimer <= 0) this.respawn(); }
    p.update(dt, { camera: this.camera, vehicles: this.vehicles, targets: this.targets, fx: this.fx, time: this.time });
    this.traffic.update(dt, this.time, p);
    this.vehicles.update(dt, this.time);
    this.peds.update(dt, p, this.vehicles);
    const seen = this.wanted.stars > 0 && this.police.canAnyoneSee(p);
    this.wanted.update(dt, p, seen);
    this.police.update(dt, this.time, p, this.targets, this.fx);
    this.dispatch.update(dt);
    if (this.running) {
      this.missions.update(dt);
      this.activities.update(dt);
      this.shops.update(dt);
      this.pages.update(dt, this.time);
      this.pickups.update(dt, this.time);
      this.events.update(dt);
    }
    this.contacts.update(dt);
    this.dialogue.update(dt);
    this.damageFx(dt);
    this.fx.particles.update(dt);
    this.fx.tracers.update(dt);
    this.world.update(this.time, dt);
    this.camera.update(dt, p, this.time);
    // radio and engine audio
    if (this.vehicleAudio) {
      let near = Infinity, count = 0;
      for (const v of this.vehicles.list) if (v.sirenOn) { count++; near = Math.min(near, Math.hypot(v.pos.x - p.pos.x, v.pos.z - p.pos.z)); }
      this.vehicleAudio.update(p, near, count);
      this.radio.update(!!p.vehicle && !this.dialogue.open);
      this.ambience.update(dt, p, this.time);
    }
    this.districtTimer = (this.districtTimer || 0) - dt;
    if (this.districtTimer <= 0 && this.running) {
      this.districtTimer = 0.5;
      this.hud.showDistrict(districtAtPoint(p.pos.x, p.pos.z));
    }
    if (this.running || this.shotMode) this.updateHud(dt);
  }

  handleGlobalKeys() {
    if (!this.running) return;
    if (menuPressed('Escape') || menuPressed('KeyP')) {
      if (this.phone.open) this.phone.toggle(false);
      else if (this.paused) { this.menus.show(null); this.setPaused(false); }
      else this.setPaused(true);
    }
    if (!this.paused && (menuPressed('KeyM') || menuPressed('Tab'))) { this.phone.toggle(); setInputEnabled(!this.phone.open); }
    if (wasPressed('KeyQ') && this.player.vehicle) this.hud.setRadio(this.radio.tune(this.radio.index + 1));
    if (this.prevLocked && !pointerLocked() && !this.paused && !this.phone.open && !this.dialogue.open) this.setPaused(true);
    this.prevLocked = pointerLocked();
  }

  hudSnapshot() {
    const p = this.player;
    const v = p.vehicle;
    const blips = [...this.missions.blips(), ...this.activities.blips(), ...this.shops.blips(), ...this.pickups.blips(), ...this.events.blips()];
    for (const u of this.police.units) if (!u.vehicle.wrecked && !u.vehicle.removed) blips.push({ x: u.vehicle.pos.x, z: u.vehicle.pos.z, kind: 'police' });
    for (const o of this.police.officers) if (o.alive) blips.push({ x: o.pos.x, z: o.pos.z, kind: 'police' });
    if (this.police.heli) blips.push({ x: this.police.heli.pos.x, z: this.police.heli.pos.z, kind: 'heli' });
    const heading = v ? v.heading : this.camera.yaw;
    return {
      money: this.state.money, snapMoney: this.shotMode, hour: this.state.hour, stars: this.wanted.stars, starsFlash: this.wanted.flash,
      health: p.health, armor: p.armor, weapon: p.weapon, clip: p.clip[p.weapon], ammo: p.ammo[p.weapon],
      vehicle: v, aiming: p.aiming && !v,
      map: { x: p.pos.x, z: p.pos.z, heading, arrowRel: (v ? 0 : p.heading - heading), speed: v ? Math.abs(v.speed) : 0, blips, time: this.time,
        zone: this.wanted.stars > 0 ? { ...this.wanted.zone, seen: this.wanted.seen } : null },
    };
  }

  updateHud(dt) { this.hud.update(dt, this.hudSnapshot()); }

  render() {
    fitToWindow(this.renderer, this.threeCamera);
    const state = skyStateAt(this.state.hour);
    const focus = this.player.pos;
    updateLighting(this.lights, this.scene, state, focus, this.drawDistance || 900);
    updateSkyDome(this.sky, state, this.threeCamera, this.time);
    this.skyEnv.update(state);
    const exposure = 1.0 + state.night * 0.35;
    this.world.signMaterial.emissiveIntensity = 0.25 + state.night * 1.4;
    if (this.world.shopMaterial) this.world.shopMaterial.emissiveIntensity = 0.3 + state.night * 1.6;
    if (this.police.heli) this.police.heli.night = state.night > 0.3;
    // street lamps near the player light up at night
    const lamps = state.night > 0.3 ? lampHeads.map((l) => [l, l.distanceToSquared(focus)]).sort((a, b) => a[1] - b[1]).slice(0, this.nightLights.length) : [];
    // (toggling visibility only at dusk and dawn keeps daytime shaders free of these lights)
    this.nightLights.forEach((l, k) => { l.visible = !!lamps[k]; if (lamps[k]) { l.position.copy(lamps[k][0]); l.intensity = 30 * state.night; } });
    this.post.render(this.scene, this.threeCamera, { exposure, bloom: 0.45 + state.night * 0.5 });
  }

  // Advances the simulation without drawing (used by automated play tests).
  debugStep(frames = 30, dt = 1 / 30) {
    for (let k = 0; k < frames; k++) { this.update(dt); endInputFrame(); }
    return { x: this.player.pos.x, z: this.player.pos.z, time: this.time };
  }

  // Title screen: a slow helicopter flyover of the island.
  renderTitle(dt) {
    this.time += dt;
    const t = this.time * 0.04;
    const cam = this.threeCamera;
    cam.position.set(560 + Math.cos(t) * 380, 95 + Math.sin(t * 0.7) * 20, 470 + Math.sin(t) * 380);
    cam.lookAt(520, 30, 430);
    this.world.update(this.time, dt);
    this.player.pos.set(520, 0, 430);
    this.render();
  }

  loop() {
    let last = performance.now();
    const frame = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (this.running) {
        this.update(dt);
        this.render();
      } else this.renderTitle(dt);
      endInputFrame();
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }
}
