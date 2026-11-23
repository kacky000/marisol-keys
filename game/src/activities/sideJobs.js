// Side activities: Keys Cab fares (any taxi, press E), Sunrise Couriers deliveries against the
// clock, the Night Sprint time trial from the boulevard start line, Vigilante in a cruiser and
// Paramedic duty in an ambulance (paramedicJob.js).

import { Marker, checkpointMarker } from '../missions/markers.js';
import { PLACES, BLOCK, ROAD_HALF, blockLetter, isUrban } from '../world/cityPlan.js';
import { wasPressed } from '../core/input.js';
import { emit } from '../core/events.js';
import { rng } from '../core/rng.js';
import { edges, nodes, lanePoint } from '../roads/roadNetwork.js';
import { LaneDriver } from '../traffic/laneDriver.js';
import { streetNameAt } from '../police/dispatchRadio.js';
import { startParamedic, updateParamedic, dropPatient } from './paramedicJob.js';

const SPRINT = [[10 * BLOCK, 11 * BLOCK], [10 * BLOCK, 9 * BLOCK], [8 * BLOCK + 32, 8 * BLOCK], [7 * BLOCK, 7 * BLOCK], [5 * BLOCK, 6 * BLOCK + 20], [6 * BLOCK, 10 * BLOCK], [8 * BLOCK, 12 * BLOCK], [10 * BLOCK, 12 * BLOCK + 32]];
const FARE_NAMES = ['a tourist in a sun hat', 'a nervous accountant', 'two surfers', 'a wedding planner', 'a chef late for service', 'a lost cruise passenger'];

function randomKerbPoint(nearX, nearZ, minD, maxD) {
  for (let k = 0; k < 40; k++) {
    const a = rng.next() * Math.PI * 2, r = minD + rng.next() * (maxD - minD);
    const x = nearX + Math.cos(a) * r, z = nearZ + Math.sin(a) * r;
    const i = Math.floor(x / BLOCK), j = Math.floor(z / BLOCK);
    if (!isUrban(blockLetter(i, j))) continue;
    // a point on the road kerb next to this block
    return rng.next() < 0.5 ? { x: i * BLOCK + ROAD_HALF - 3, z: j * BLOCK + 32 } : { x: i * BLOCK + 32, z: j * BLOCK + ROAD_HALF - 3 };
  }
  return { x: PLACES.safehouse.x, z: PLACES.safehouse.z - 8 };
}

export class SideJobs {
  constructor(game) {
    this.game = game;
    this.active = null;      // { kind, ... }
    this.marker = null;
    this.startMarkers = [
      { kind: 'courier', ...PLACES.courier, letter: 'C' },
      { kind: 'sprint', ...PLACES.raceStart, letter: 'R' },
    ];
  }

  blips() {
    const out = this.startMarkers.map((s) => ({ x: s.x, z: s.z, kind: 'job', letter: s.letter }));
    if (this.marker) out.unshift({ x: this.marker.x, z: this.marker.z, kind: 'objective' });
    const s = this.active?.suspect;
    if (s && !s.wrecked) out.unshift({ x: s.pos.x, z: s.pos.z, kind: 'objective' });
    return out;
  }

  setMarker(x, z, gate = false) {
    this.marker?.dispose();
    this.marker = gate ? checkpointMarker(this.game.scene, x, z) : new Marker(this.game.scene, x, z, { color: '#7bd389', radius: 4, height: 8 });
  }

  end(message, pay = 0) {
    const g = this.game;
    this.marker?.dispose();
    this.marker = null;
    if (this.active?.suspect) this.active.suspect.persistent = false;
    dropPatient(g, this.active);
    this.active = null;
    g.hud.setObjective(null);
    g.hud.setTimer(null);
    if (pay > 0) { g.state.money += pay; emit('sound', { name: 'cash' }); }
    if (message) g.hud.bigMessage(message, pay > 0 ? `+$${pay}` : '', 2.5);
  }

  update(dt) {
    const g = this.game, p = g.player;
    if (g.missions.active) { if (this.active) this.end('JOB CANCELLED'); return; }
    this.marker?.update(g.time);
    if (!this.active) {
      if (p.vehicle && p.vehicle.type === 'taxi') {
        g.hud.prompt('<kbd>E</kbd> Go on duty — Keys Cab fares');
        if (wasPressed('KeyE')) this.startTaxi();
      }
      if (p.vehicle && p.vehicle.type === 'police' && g.wanted.stars === 0) {
        g.hud.prompt('<kbd>E</kbd> Vigilante — run down MKPD\'s most wanted');
        if (wasPressed('KeyE')) this.startVigilante(1);
      }
      if (p.vehicle && p.vehicle.type === 'ambulance') {
        g.hud.prompt('<kbd>E</kbd> Paramedic — rush patients to Sunwake Medical');
        if (wasPressed('KeyE')) startParamedic(this, 1);
      }
      for (const s of this.startMarkers) {
        if (Math.hypot(p.pos.x - s.x, p.pos.z - s.z) > 6) continue;
        if (s.kind === 'courier' && !p.vehicle) { g.hud.prompt('<kbd>E</kbd> Sunrise Couriers — deliver 3 parcels'); if (wasPressed('KeyE')) this.startCourier(); }
        if (s.kind === 'sprint' && p.vehicle) { g.hud.prompt('<kbd>E</kbd> Night Sprint — time trial'); if (wasPressed('KeyE')) this.startSprint(); }
      }
      return;
    }
    const a = this.active;
    a.timer -= dt;
    g.hud.setTimer(a.timer);
    if (a.timer <= 0) { this.end('OUT OF TIME'); return; }
    if (!p.vehicle && a.needsVehicle) { a.grace = (a.grace || 0) + dt; if (a.grace > 8) { this.end('JOB ABANDONED'); return; } } else a.grace = 0;
    const d = this.marker ? Math.hypot(p.pos.x - this.marker.x, p.pos.z - this.marker.z) : 999;
    if (a.kind === 'vigilante') {
      const s = a.suspect;
      if (wasPressed('KeyE')) { this.end('OFF DUTY'); return; }
      if (s.wrecked) {
        const pay = 400 * a.level;
        g.state.money += pay;
        g.state.stats.vigilante = Math.max(g.state.stats.vigilante || 0, a.level);
        g.hud.bigMessage(`SUSPECT DOWN · LEVEL ${a.level}`, `+$${pay}`, 2.5);
        emit('sound', { name: 'cash' });
        s.persistent = false;
        this.active = null;
        this.startVigilante(a.level + 1);
        return;
      }
      if (Math.hypot(p.pos.x - s.pos.x, p.pos.z - s.pos.z) > 380) { s.persistent = false; this.end('SUSPECT ESCAPED'); }
      return;
    }
    if (a.kind === 'paramedic') { updateParamedic(this, a, d, wasPressed('KeyE')); return; }
    if (a.kind === 'taxi') {
      if (wasPressed('KeyE')) { this.end('OFF DUTY'); return; }
      if (d < 6 && Math.abs(p.vehicle?.speed || 0) < 4) {
        if (a.stage === 'pickup') {
          a.stage = 'dropoff';
          const dest = randomKerbPoint(p.pos.x, p.pos.z, 250, 520);
          a.dist = Math.hypot(dest.x - p.pos.x, dest.z - p.pos.z);
          a.timer = 25 + a.dist / 11;
          this.setMarker(dest.x, dest.z);
          g.hud.setObjective('KEYS CAB', `Drive ${a.who} to the <b>drop-off</b>`);
        } else {
          const pay = Math.round(40 + a.dist * 0.18 + a.timer * 2);
          g.state.stats.fares++;
          this.end(null, pay);
          g.hud.toast(`Fare complete <b>+$${pay}</b>`);
          this.startTaxi();
        }
      }
    } else if (a.kind === 'courier') {
      if (d < 6) {
        a.left--;
        emit('sound', { name: 'checkpoint' });
        if (a.left <= 0) { g.state.stats.deliveries++; this.end('DELIVERIES DONE', 600 + Math.round(a.timer * 6)); return; }
        const dest = randomKerbPoint(p.pos.x, p.pos.z, 200, 450);
        this.setMarker(dest.x, dest.z);
        a.timer += 40;
        g.hud.setObjective('SUNRISE COURIERS', `Deliver the parcel · ${3 - a.left}/3`);
      }
    } else if (a.kind === 'sprint') {
      if (d < 11) {
        a.cp++;
        emit('sound', { name: 'checkpoint' });
        if (a.cp >= SPRINT.length) {
          const time = 95 - a.timer;
          const best = g.state.stats.bestRace;
          if (!best || time < best) g.state.stats.bestRace = time;
          g.state.stats.races++;
          this.end(`FINISHED ${time.toFixed(1)}s`, time < 60 ? 2000 : time < 75 ? 1000 : 400);
          return;
        }
        this.setMarker(SPRINT[a.cp][0], SPRINT[a.cp][1], true);
        g.hud.setObjective('NIGHT SPRINT', `Checkpoint ${a.cp}/${SPRINT.length}`);
      }
    }
  }

  // Vigilante: a getaway car spawns ahead and flees; wreck it before the clock runs out.
  startVigilante(level) {
    const g = this.game, p = g.player;
    const near = edges.filter((e) => e.kind === 'street' && (() => { const d = Math.hypot((e.ax + e.bx) / 2 - p.pos.x, (e.az + e.bz) / 2 - p.pos.z); return d > 60 && d < 130; })());
    if (!near.length) return;
    const e = near[Math.floor(rng.next() * near.length)];
    const a = nodes.get(e.a), b = nodes.get(e.b);
    const lp = lanePoint(a, b, 1, e.len / 2);
    const suspect = g.vehicles.spawn(level > 2 ? 'sports' : 'sedan', lp.x, lp.z, lp.heading, { paint: '#2b2d42' });
    suspect.persistent = true;
    suspect.health *= 0.5 + level * 0.1;
    const d = new LaneDriver(suspect, a.id, b.id, 1, e.len / 2, rng);
    d.panic = 9999;
    d.cruise = 14 + level * 2;
    suspect.driver = d;
    g.traffic.drivers.set(suspect, d);
    this.active = { kind: 'vigilante', level, suspect, timer: 90, needsVehicle: true };
    g.hud.setObjective(`VIGILANTE · LEVEL ${level}`, 'Wreck the <b>suspect\'s car</b>');
    g.dispatch.show(`Unit, suspect vehicle fleeing near ${streetNameAt(suspect.pos.x, suspect.pos.z)}. Take it down.`);
  }

  startTaxi() {
    const p = this.game.player;
    const pick = randomKerbPoint(p.pos.x, p.pos.z, 90, 220);
    this.active = { kind: 'taxi', stage: 'pickup', timer: 60, needsVehicle: true, who: FARE_NAMES[Math.floor(rng.next() * FARE_NAMES.length)] };
    this.setMarker(pick.x, pick.z);
    this.game.hud.setObjective('KEYS CAB', `Pick up ${this.active.who}`);
  }

  startCourier() {
    const g = this.game;
    const v = g.vehicles.spawn('van', PLACES.courier.x - 9.5 + 3, PLACES.courier.z, 0, { paint: '#ff6b35' });
    v.persistent = true;
    const dest = randomKerbPoint(v.pos.x, v.pos.z, 200, 450);
    this.active = { kind: 'courier', left: 3, timer: 90, needsVehicle: true };
    this.setMarker(dest.x, dest.z);
    g.hud.setObjective('SUNRISE COURIERS', 'Take the van and deliver the parcel · 0/3');
  }

  startSprint() {
    this.active = { kind: 'sprint', cp: 0, timer: 95, needsVehicle: true };
    this.setMarker(SPRINT[0][0], SPRINT[0][1], true);
    this.game.hud.setObjective('NIGHT SPRINT', `Checkpoint 0/${SPRINT.length}`);
  }
}
