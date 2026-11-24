// Keys Fire Department: a car that goes up in flames near Tessa keeps burning until Engine 7
// arrives; two firefighters brace hoses on the wreck until the fire is out, then roll back
// to the station. Same call flow as the ambulance (responseCall.js).

import { on } from '../core/events.js';
import { ResponseCall } from './responseCall.js';
import { FIREFIGHTER_OUTFIT } from './crewMember.js';
import { streetNameAt } from '../police/dispatchRadio.js';

const RESPONSE_DELAY = 3;
const CALL_RANGE = 170;
const MAX_STARS = 2;
const HOSE_SECONDS = 8;

export class FireService {
  constructor(game) {
    this.game = game;
    this.fires = [];
    this.call = null;
    on('vehicle:exploded', ({ vehicle }) => {
      if (!game.shotMode && !vehicle.spec.boat) this.fires.push({ wreck: vehicle, t: game.time });
    });
  }

  update(dt) {
    const g = this.game;
    if (this.call) { if (this.call.update(dt)) this.call = null; return; }
    const p = g.player.pos;
    this.fires = this.fires.filter((f) => !f.wreck.removed && g.time - f.t < 90);
    if (g.wanted.stars > MAX_STARS) return;
    const due = this.fires.find((f) => g.time - f.t > RESPONSE_DELAY && Math.hypot(f.wreck.pos.x - p.x, f.wreck.pos.z - p.z) < CALL_RANGE);
    if (due) this.dispatch(due.wreck);
  }

  dispatch(wreck) {
    const g = this.game;
    let hosed = 0;
    const call = ResponseCall.dispatch(g, 'firetruck', wreck.pos.x, wreck.pos.z, FIREFIGHTER_OUTFIT, {
      // hoses from two sides, a few metres back from the flames
      spot: (k) => ({ x: wreck.pos.x + (k ? 4.5 : -4.5), z: wreck.pos.z + (k ? 1.5 : -1.5) }),
      work: (m, k, dt) => {
        m.face(wreck.pos.x, wreck.pos.z);
        m.brace(dt);
        const n = m.nozzle();
        g.fx.particles.waterJet(n.x, n.y, n.z, wreck.pos.x, wreck.pos.z);
        if (k === 0) hosed += dt;
        if (hosed > HOSE_SECONDS * 0.6) wreck.burning = Math.min(wreck.burning, 0.5); // flames die down, smoke lingers
      },
      done: () => hosed > HOSE_SECONDS,
      finish: () => { wreck.burning = 0; wreck.persistent = false; },
      abandon: () => { wreck.persistent = false; wreck.burning = Math.min(wreck.burning, 10); }, // burns itself out
    });
    if (!call) return;
    wreck.burning = 999; // keeps burning until the crew puts it out
    g.dispatch.show(`KFD Engine 7 responding: vehicle fire near ${streetNameAt(wreck.pos.x, wreck.pos.z)}.`, 4);
    wreck.persistent = true;
    this.fires = this.fires.filter((f) => f.wreck !== wreck);
    this.call = call;
  }

  clear() {
    this.call?.end(true);
    this.call = null;
    this.fires = [];
  }
}
