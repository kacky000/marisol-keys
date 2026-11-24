// Sunwake Medical: when someone goes down in the street near Tessa (and the police aren't
// tearing the island apart), an ambulance runs lights and siren to the scene, two paramedics
// kneel over the patient, carry them off, and the ambulance drives away again. One ambulance
// also waits in the bay outside the hospital for Paramedic duty.

import { on } from '../core/events.js';
import { HOSPITAL_BAY } from '../activities/paramedicJob.js';
import { ResponseCall } from './responseCall.js';
import { MEDIC_OUTFIT } from './crewMember.js';
import { streetNameAt } from '../police/dispatchRadio.js';

const RESPONSE_DELAY = 6;     // seconds after the incident before the call goes out
const CALL_RANGE = 160;       // only incidents this close to the player get a response
const MAX_STARS = 2;          // above this the streets are too hot for medics
const TREAT_SECONDS = 7;

export class AmbulanceService {
  constructor(game) {
    this.game = game;
    this.incidents = [];
    this.call = null;
    on('ped:killed', ({ ped }) => {
      if (ped.kind === 'civilian' && !game.shotMode) this.incidents.push({ ped, t: game.time });
    });
  }

  // Once the bay ambulance has been taken, a fresh one appears while the player is out of sight.
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
    if (this.call) { if (this.call.update(dt)) this.call = null; return; }
    const p = g.player.pos;
    this.incidents = this.incidents.filter((i) => g.peds.peds.includes(i.ped) && g.time - i.t < 60);
    if (g.wanted.stars > MAX_STARS) return;
    const due = this.incidents.find((i) => g.time - i.t > RESPONSE_DELAY && Math.hypot(i.ped.pos.x - p.x, i.ped.pos.z - p.z) < CALL_RANGE);
    if (due) this.dispatch(due.ped);
  }

  dispatch(patient) {
    const g = this.game;
    let treated = 0;
    const call = ResponseCall.dispatch(g, 'ambulance', patient.pos.x, patient.pos.z, MEDIC_OUTFIT, {
      // one paramedic either side of the patient
      spot: (k) => ({ x: patient.pos.x + (k ? 0.9 : -0.9), z: patient.pos.z + 0.3 }),
      work: (m, k, dt) => {
        m.face(patient.pos.x, patient.pos.z);
        m.pose('kneel', 0, dt);
        if (k === 0) treated += dt;
      },
      done: () => treated > TREAT_SECONDS,
      finish: () => { g.peds.remove(patient); }, // taken aboard
      abandon: () => { patient.persistent = false; },
    });
    if (!call) return;
    patient.persistent = true; // the body waits for the crew
    g.dispatch.show(`Sunwake Medical, unit rolling to a casualty on ${streetNameAt(patient.pos.x, patient.pos.z)}.`, 4);
    this.incidents = this.incidents.filter((i) => i.ped !== patient);
    this.call = call;
  }

  clear() {
    this.call?.end(true);
    this.call = null;
    this.incidents = [];
  }
}
