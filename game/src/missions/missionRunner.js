// Runs story missions step by step: contact markers, dialogue, objectives on the HUD, markers
// and blips, timers, spawned enemies and vehicles, pass/fail screens and rewards.

import { STORY, CONTACTS } from './storyMissions.js';
import { Marker, checkpointMarker } from './markers.js';
import { Gunman, GANG_OUTFITS } from '../combat/gunman.js';
import { LaneDriver } from '../traffic/laneDriver.js';
import { edges, nodes, lanePoint } from '../roads/roadNetwork.js';
import { emit, on } from '../core/events.js';
import { rng } from '../core/rng.js';
import { CAST } from '../story/cast.js';
import { wasPressed } from '../core/input.js';

export class MissionRunner {
  constructor(game) {
    this.game = game;
    this.active = null;
    this.stepIndex = 0;
    this.step = null;
    this.marker = null;
    this.contactMarker = null;
    this.spawned = { vehicles: [], enemies: [] };
    this.enemies = [];
    this.timer = null;
    this.suppressShotCrime = false;
    this.cooldown = 0;
    on('player:down', ({ cause }) => { if (this.active) this.fail(cause === 'busted' ? 'You were busted' : 'You were wasted'); });
  }

  get next() { return STORY[this.game.state.story] || null; }

  get people() { return this.enemies; }

  // Map/minimap blips for the current mission or the next contact.
  blips() {
    const out = [];
    if (this.active) {
      if (this.marker) out.push({ x: this.marker.x, z: this.marker.z, kind: 'objective' });
      for (const e of this.enemies) if (e.alive) out.push({ x: e.pos.x, z: e.pos.z, kind: 'enemy' });
      if (this.step?.type === 'destroy' && this.target && !this.target.wrecked) out.push({ x: this.target.pos.x, z: this.target.pos.z, kind: 'enemy' });
      if (this.step?.type === 'enterVehicle' && this.vehicle) out.push({ x: this.vehicle.pos.x, z: this.vehicle.pos.z, kind: 'vehicle' });
    } else if (this.next) {
      const c = CONTACTS[this.next.at];
      out.push({ x: c.x, z: c.z, kind: 'contact', letter: CAST[this.next.giver].name[0] });
    }
    return out;
  }

  update(dt) {
    const g = this.game;
    this.cooldown -= dt;
    if (!this.active) {
      const m = this.next;
      if (!m) { this.clearContact(); return; }
      const c = CONTACTS[m.at];
      if (!this.contactMarker || this.contactMarker.forMission !== m.id) {
        this.clearContact();
        this.contactMarker = new Marker(g.scene, c.x, c.z, { color: '#ffd23f', radius: 1.6, height: 5 });
        this.contactMarker.forMission = m.id;
      }
      this.contactMarker.update(g.time);
      // a failed mission can be retried on the spot for a few seconds
      if (this.retryTimer > 0) {
        this.retryTimer -= dt;
        g.hud.prompt('<kbd>E</kbd> Retry the mission');
        if (wasPressed('KeyE') && !g.player.dead && !g.downTimer) {
          this.retryTimer = 0;
          if (g.player.vehicle) { g.player.vehicle.driver = null; g.player.vehicle = null; g.player.rig.visible = true; }
          g.wanted.clear();
          g.police.clearAll(g.player);
          g.player.placeAt(c.x - 1.5, c.z + 1.5, 0);
          this.start(g.state.story);
          return;
        }
      }
      const d = Math.hypot(g.player.pos.x - c.x, g.player.pos.z - c.z);
      if (d < 2.2 && !g.player.vehicle && g.wanted.stars === 0 && this.cooldown <= 0 && !g.activities.active) this.start(g.state.story);
      return;
    }
    if (this.marker) this.marker.update(g.time);
    if (this.timer !== null) {
      this.timer -= dt;
      g.hud.setTimer(this.timer);
      if (this.timer <= 0) { this.fail('Out of time'); return; }
    }
    this.updateStep(dt);
  }

  start(index) {
    const g = this.game;
    this.clearContact();
    this.active = STORY[index];
    this.stepIndex = -1;
    g.hud.bigMessage(this.active.title.toUpperCase(), `MISSION ${index + 1} · ${CAST[this.active.giver].name.toUpperCase()}`, 3);
    emit('mission:started', { mission: this.active });
    this.advance();
  }

  advance() {
    this.cleanupStep();
    this.stepIndex++;
    const s = this.step = this.active.steps[this.stepIndex];
    if (!s) { this.pass(); return; }
    const g = this.game;
    if (s.text) g.hud.setObjective(this.active.title, s.text);
    switch (s.type) {
      case 'talk': {
        g.player.controlsLocked = true;
        // face-to-face scenes with the contact get a two-shot cutscene camera
        const contact = g.contacts.current;
        const faceToFace = contact && s.lines.some(([who]) => who === contact.who) && Math.hypot(g.player.pos.x - contact.x, g.player.pos.z - contact.z) < 8;
        if (faceToFace) {
          g.contacts.talking = true;
          if (!g.player.vehicle) g.player.heading = Math.atan2(contact.x - g.player.pos.x, -(contact.z - g.player.pos.z));
          g.camera.fixed = g.contacts.twoShot();
        }
        g.dialogue.play(s.lines, () => {
          g.player.controlsLocked = false;
          g.contacts.talking = false;
          if (faceToFace) { g.camera.fixed = null; g.camera.yaw = g.player.heading; }
          if (s.give) { g.player.giveWeapon(s.give.weapon, s.give.ammo); g.hud.toast(`Picked up the <b>${s.give.weapon.toUpperCase()}</b>`); }
          this.advance();
        });
        break;
      }
      case 'enterVehicle': {
        const v = s.vehicle;
        this.vehicle = g.vehicles.spawn(v.type, v.x, v.z, v.heading, { paint: v.paint });
        this.vehicle.persistent = true;
        this.spawned.vehicles.push(this.vehicle);
        this.missionVehicle = this.vehicle;
        break;
      }
      case 'goto':
        this.marker = new Marker(g.scene, s.x, s.z, { color: '#ffd23f', radius: Math.min(s.radius, 5), height: 9 });
        break;
      case 'checkpoints':
        this.cpIndex = 0;
        this.timer = s.timer;
        this.marker = checkpointMarker(g.scene, s.points[0][0], s.points[0][1]);
        break;
      case 'kill':
        this.suppressShotCrime = !!s.suppressCrime;
        for (const [x, z] of s.enemies) {
          const e = new Gunman(g.scene, x, z, GANG_OUTFITS[Math.floor(rng.next() * GANG_OUTFITS.length)], 'gang', rng.next() < 0.5 ? 'smg' : 'pistol');
          e.alertRange = 38;
          this.enemies.push(e);
        }
        break;
      case 'wanted':
        g.wanted.setStars(s.stars);
        g.wanted.zone = { x: g.player.pos.x, z: g.player.pos.z, r: g.wanted.zoneRadius() };
        this.advance();
        break;
      case 'clearWanted':
        g.wanted.minimumStars = 0;
        g.wanted.clear();
        g.police.clearAll(g.player);
        this.advance();
        break;
      case 'loseWanted':
        if (g.wanted.stars === 0) this.advance();
        break;
      case 'destroy': {
        const p = g.player.pos;
        const ring = edges.filter((e) => e.kind === 'street' && Math.hypot((e.ax + e.bx) / 2 - p.x, (e.az + e.bz) / 2 - p.z) > 60 && Math.hypot((e.ax + e.bx) / 2 - p.x, (e.az + e.bz) / 2 - p.z) < 110);
        const e = ring[Math.floor(rng.next() * ring.length)] || edges[0];
        const a = nodes.get(e.a), b = nodes.get(e.b);
        const lp = lanePoint(a, b, 0, e.len / 2);
        this.target = g.vehicles.spawn(s.vehicle.type, lp.x, lp.z, lp.heading, { paint: s.vehicle.paint });
        this.target.persistent = true;
        this.target.health *= 0.6;
        const d = new LaneDriver(this.target, a.id, b.id, 0, e.len / 2, rng);
        d.panic = 9999;
        d.cruise = 17;
        this.target.driver = d;
        this.targetDriver = d;
        this.spawned.vehicles.push(this.target);
        break;
      }
      default:
        this.advance();
    }
  }

  updateStep(dt) {
    const g = this.game, s = this.step, p = g.player;
    if (!s) return;
    if (this.missionVehicle && this.missionVehicle.wrecked && s.type !== 'talk' && this.stepIndex <= this.lastVehicleStep()) { this.fail('The vehicle was destroyed'); return; }
    switch (s.type) {
      case 'enterVehicle':
        if (p.vehicle === this.vehicle) {
          if (s.onEnterStars) { g.wanted.setStars(s.onEnterStars); g.wanted.zone = { x: p.pos.x, z: p.pos.z, r: g.wanted.zoneRadius() }; }
          if (s.holdStars) g.wanted.minimumStars = s.holdStars;
          this.advance();
        }
        break;
      case 'goto': {
        const d = Math.hypot(p.pos.x - s.x, p.pos.z - s.z);
        const okMode = (!s.inVehicle || p.vehicle) && (!s.onFoot || !p.vehicle);
        if (d < s.radius && okMode) {
          if (p.vehicle) { p.vehicle.input.brake = 1; p.vehicle.vel.multiplyScalar(0.5); }
          this.advance();
        } else if (d < s.radius && s.onFoot && p.vehicle) g.hud.prompt('Get out of the vehicle <kbd>F</kbd>');
        break;
      }
      case 'checkpoints': {
        const pt = s.points[this.cpIndex];
        if (Math.hypot(p.pos.x - pt[0], p.pos.z - pt[1]) < (s.relay ? 8 : 11)) {
          emit('sound', { name: 'checkpoint' });
          this.cpIndex++;
          this.marker?.dispose();
          this.marker = null;
          if (s.relay) g.hud.toast(`Relay ${this.cpIndex} of ${s.points.length} planted`);
          if (this.cpIndex >= s.points.length) { this.timer = null; g.hud.setTimer(null); this.advance(); }
          else {
            const np = s.points[this.cpIndex];
            this.marker = checkpointMarker(g.scene, np[0], np[1]);
            g.hud.setObjective(this.active.title, `${s.text} · ${this.cpIndex}/${s.points.length}`);
          }
        }
        break;
      }
      case 'kill': {
        const ctx = { player: p, targets: g.targets, fx: g.fx, alert: false, onShot: () => emit('sound', { name: 'pistol-far' }) };
        for (const e of this.enemies) e.think(dt, ctx);
        const left = this.enemies.filter((e) => e.alive).length;
        g.hud.setObjective(this.active.title, `${s.text} · ${s.enemies.length - left}/${s.enemies.length}`);
        if (!left) { this.suppressShotCrime = false; this.advance(); }
        break;
      }
      case 'loseWanted':
        if (g.wanted.stars === 0) this.advance();
        break;
      case 'destroy':
        if (this.target.wrecked) this.advance();
        else if (Math.hypot(p.pos.x - this.target.pos.x, p.pos.z - this.target.pos.z) > 420) this.fail('Gull got away');
        break;
    }
  }

  lastVehicleStep() {
    let last = -1;
    this.active.steps.forEach((s, k) => { if (s.inVehicle || s.type === 'enterVehicle') last = k; });
    return last;
  }

  cleanupStep() {
    this.marker?.dispose();
    this.marker = null;
    this.timer = null;
    this.game.hud.setTimer(null);
  }

  cleanupMission() {
    const g = this.game;
    this.cleanupStep();
    for (const e of this.enemies) e.dispose();
    this.enemies = [];
    for (const v of this.spawned.vehicles) { v.persistent = false; if (v !== g.player.vehicle && v.wrecked) g.vehicles.remove(v); }
    this.spawned.vehicles = [];
    this.missionVehicle = null;
    this.vehicle = null;
    this.target = null;
    this.suppressShotCrime = false;
    g.wanted.minimumStars = 0;
    g.player.controlsLocked = false;
    g.camera.fixed = null;
    g.contacts.talking = false;
    g.dialogue.close();
    g.hud.setObjective(null);
  }

  pass() {
    const g = this.game, m = this.active;
    this.cleanupMission();
    g.state.money += m.reward;
    g.state.story++;
    g.state.stats.missions++;
    this.active = null;
    this.cooldown = 4;
    g.hud.bigMessage('MISSION PASSED', `+$${m.reward.toLocaleString('en-US')} · ${m.title}`, 4.5);
    emit('mission:passed', { mission: m });
    emit('sound', { name: 'passed' });
    g.save();
  }

  fail(reason) {
    const g = this.game, m = this.active;
    if (!m) return;
    this.cleanupMission();
    this.active = null;
    this.cooldown = 6;
    this.retryTimer = 9;
    g.hud.bigMessage('MISSION FAILED', `${reason} · press E to retry`, 4);
    emit('mission:failed', { mission: m, reason });
    emit('sound', { name: 'failed' });
  }

  clearContact() { this.contactMarker?.dispose(); this.contactMarker = null; }
}
