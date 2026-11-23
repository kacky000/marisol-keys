// Sunwake Medical: when someone goes down in the street near Tessa (and the police aren't
// tearing the island apart), an ambulance runs lights and siren to the scene, two paramedics
// kneel over the patient, carry them off, and the ambulance drives away again.
// Steal the ambulance mid-call and the crew calls it off.

import { edges, nodes, lanePoint } from '../roads/roadNetwork.js';
import { PursuitDriver } from '../police/pursuitDriver.js';
import { buildHuman, poseHuman } from '../peds/humanModel.js';
import { groundHeight } from '../world/groundHeight.js';
import { resolveCircle } from '../world/collisionWorld.js';
import { on } from '../core/events.js';
import { rng } from '../core/rng.js';
import { HOSPITAL_BAY } from '../activities/paramedicJob.js';

const RESPONSE_DELAY = 6;     // seconds after the incident before the call goes out
const CALL_RANGE = 160;       // only incidents this close to the player get a response
const MAX_STARS = 2;          // above this the streets are too hot for medics
const TREAT_SECONDS = 7;
const MEDIC_OUTFIT = { skin: '#c98d66', shirt: '#f4f4f2', pants: '#1f3b5c', hair: '#2b1b12', shorts: false, hat: 'cap', shades: false, shoes: '#222', build: 1, hairStyle: 'short', dress: null, bag: null };

class Medic {
  constructor(scene, x, z, skin) {
    this.rig = buildHuman({ ...MEDIC_OUTFIT, skin });
    this.pos = { x, y: groundHeight(x, z), z };
    this.heading = 0;
    this.scene = scene;
    scene.add(this.rig);
  }

  // Walks toward (x, z); true once within `reach`.
  walkTo(x, z, dt, reach = 1.1) {
    const dx = x - this.pos.x, dz = z - this.pos.z, d = Math.hypot(dx, dz);
    if (d < reach) { this.pose('idle', 0, dt); return true; }
    this.heading = Math.atan2(dx, -dz);
    const step = Math.min(d, 2.6 * dt);
    this.pos.x += (dx / d) * step;
    this.pos.z += (dz / d) * step;
    resolveCircle(this.pos, 0.3, this.pos.y);
    this.pos.y = groundHeight(this.pos.x, this.pos.z);
    this.pose('run', 2.6, dt);
    return false;
  }

  pose(state, speed, dt) {
    poseHuman(this.rig, state, speed, dt);
    this.rig.position.set(this.pos.x, this.pos.y, this.pos.z);
    this.rig.rotation.y = -this.heading;
  }

  dispose() { this.scene.remove(this.rig); }
}

export class AmbulanceService {
  constructor(game) {
    this.game = game;
    this.incidents = [];
    this.call = null;
    on('ped:killed', ({ ped }) => {
      if (ped.kind === 'civilian' && !game.shotMode) this.incidents.push({ ped, t: game.time });
    });
  }

  // One ambulance always waits in the bay outside Sunwake Medical (paramedic duty starts there).
  // Once it has been taken, a fresh one appears while the player is out of sight of the bay.
  keepBayStocked() {
    const g = this.game, bay = this.bay;
    const away = Math.hypot(g.player.pos.x - HOSPITAL_BAY.x, g.player.pos.z - HOSPITAL_BAY.z) > 120;
    if (bay && !bay.removed && !bay.wrecked && Math.hypot(bay.pos.x - HOSPITAL_BAY.x, bay.pos.z - HOSPITAL_BAY.z) < 6) return;
    if (!away && bay) return;
    if (bay && bay.driver !== 'player') bay.persistent = false;
    this.bay = g.vehicles.spawn('ambulance', HOSPITAL_BAY.x, HOSPITAL_BAY.z, 0);
    this.bay.persistent = true;
  }

  update(dt) {
    const g = this.game;
    this.keepBayStocked();
    if (this.call) { this.runCall(dt); return; }
    const p = g.player.pos;
    this.incidents = this.incidents.filter((i) => g.peds.peds.includes(i.ped) && g.time - i.t < 60);
    if (g.wanted.stars > MAX_STARS) return;
    const due = this.incidents.find((i) => g.time - i.t > RESPONSE_DELAY && Math.hypot(i.ped.pos.x - p.x, i.ped.pos.z - p.z) < CALL_RANGE);
    if (due) this.dispatch(due.ped);
  }

  dispatch(patient) {
    const g = this.game;
    const ring = edges.filter((e) => {
      if (e.kind !== 'street') return false;
      const d = Math.hypot((e.ax + e.bx) / 2 - patient.pos.x, (e.az + e.bz) / 2 - patient.pos.z);
      return d > 90 && d < 180;
    });
    if (!ring.length) return;
    const e = ring[Math.floor(rng.next() * ring.length)];
    const at = lanePoint(nodes.get(e.a), nodes.get(e.b), 1, e.len * 0.5);
    const v = g.vehicles.spawn('ambulance', at.x, at.z, at.heading);
    v.persistent = true;
    const driver = new PursuitDriver(v);
    v.driver = driver;
    patient.persistent = true; // the body waits for the crew
    this.incidents = this.incidents.filter((i) => i.ped !== patient);
    this.call = { v, driver, patient, stage: 'respond', t: 0, medics: [], target: { pos: { x: patient.pos.x, z: patient.pos.z }, vehicle: null } };
  }

  runCall(dt) {
    const g = this.game, c = this.call, v = c.v;
    c.t += dt;
    const playerDist = Math.hypot(v.pos.x - g.player.pos.x, v.pos.z - g.player.pos.z);
    // stolen or wrecked: the call is off, whatever is on the street stays where it is
    if (v.driver !== c.driver || v.wrecked) { this.endCall(false); return; }
    if (playerDist > 240 || c.t > 120) { this.endCall(true); return; }
    if (c.stage === 'respond') {
      c.driver.update(dt, c.target);
      const near = Math.hypot(v.pos.x - c.target.pos.x, v.pos.z - c.target.pos.z) < 20;
      if (near && Math.abs(v.speed) < 1.5) this.arrive();
      return;
    }
    // parked: brake to a stop, then hold the handbrake (brake at a standstill would reverse)
    v.input.throttle = 0; v.input.brake = v.speed > 0.5 ? 1 : 0; v.input.steer = 0; v.input.handbrake = true;
    const back = { x: v.pos.x - v.forward().x * (v.spec.len / 2 + 1), z: v.pos.z - v.forward().z * (v.spec.len / 2 + 1) };
    if (c.stage === 'treat') {
      let kneeling = 0;
      c.medics.forEach((m, k) => {
        const side = k ? 1 : -1;
        const spot = { x: c.patient.pos.x + side * 0.9, z: c.patient.pos.z + 0.3 };
        if (m.walkTo(spot.x, spot.z, dt, 0.4)) {
          m.heading = Math.atan2(c.patient.pos.x - m.pos.x, -(c.patient.pos.z - m.pos.z));
          m.pose('kneel', 0, dt);
          kneeling++;
        }
      });
      if (kneeling === c.medics.length) c.treat += dt;
      if (c.treat > TREAT_SECONDS) {
        g.peds.remove(c.patient); // taken aboard
        c.stage = 'board';
      }
      return;
    }
    if (c.stage === 'board') {
      const aboard = c.medics.every((m) => m.walkTo(back.x, back.z, dt, 0.8));
      if (aboard) {
        c.medics.forEach((m) => m.dispose());
        c.medics = [];
        c.stage = 'leave';
        v.sirenOn = false;
        const far = [...nodes.values()].filter((n) => Math.hypot(n.x - v.pos.x, n.z - v.pos.z) > 260 && !n.id.startsWith('cw'));
        const n = far[Math.floor(rng.next() * far.length)] || { x: 512, z: 512 };
        c.target = { pos: { x: n.x, z: n.z }, vehicle: null };
        c.leaveT = 0;
      }
      return;
    }
    if (c.stage === 'leave') {
      c.driver.update(dt, c.target);
      c.leaveT += dt;
      if (c.leaveT > 40 || playerDist > 200) this.endCall(true);
    }
  }

  arrive() {
    const g = this.game, c = this.call, v = c.v;
    c.stage = 'treat';
    c.treat = 0;
    const f = v.forward(), r = v.right();
    for (const side of [-1, 1]) {
      const x = v.pos.x - f.x * (v.spec.len / 2 + 0.8) + r.x * side * 0.6, z = v.pos.z - f.z * (v.spec.len / 2 + 0.8) + r.z * side * 0.6;
      c.medics.push(new Medic(g.scene, x, z, side < 0 ? '#c98d66' : '#f1c7a5'));
    }
  }

  // removeVehicle: take the ambulance off the map too (it left, or the player is far away).
  endCall(removeVehicle) {
    const g = this.game, c = this.call;
    if (!c) return;
    c.medics.forEach((m) => m.dispose());
    if (c.patient) c.patient.persistent = false;
    if (removeVehicle && c.v.driver === c.driver) g.vehicles.remove(c.v);
    else c.v.persistent = false;
    this.call = null;
  }

  clear() {
    this.endCall(true);
    this.incidents = [];
  }
}
