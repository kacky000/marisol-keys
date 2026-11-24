// Random street life: an MKPD cruiser chasing a getaway car past you, two street racers
// screaming down the boulevard, a mugging on the sidewalk you can break up for a reward.

import { edges, nodes, lanePoint } from '../roads/roadNetwork.js';
import { LaneDriver } from '../traffic/laneDriver.js';
import { PursuitDriver } from '../police/pursuitDriver.js';
import { Gunman, GANG_OUTFITS } from '../combat/gunman.js';
import { on } from '../core/events.js';
import { rng } from '../core/rng.js';
import { groundAt } from '../world/cityPlan.js';

export class StreetEvents {
  constructor(game) {
    this.game = game;
    this.timer = 25;
    this.active = null;
    on('ped:killed', ({ ped, source }) => {
      const a = this.active;
      if (a && a.kind === 'mugging' && ped === a.mugger && source?.byPlayer) {
        game.state.money += 300;
        game.hud.toast('<b>Good Samaritan</b> · the tourist pays you $300');
        a.victim.flee(ped.pos.x, ped.pos.z, 6);
      }
    });
  }

  edgeNear(minD, maxD) {
    const p = this.game.player.pos;
    const list = edges.filter((e) => e.kind === 'street' && e.len > 50 && (() => { const d = Math.hypot((e.ax + e.bx) / 2 - p.x, (e.az + e.bz) / 2 - p.z); return d > minD && d < maxD; })());
    return list.length ? list[Math.floor(rng.next() * list.length)] : null;
  }

  laneCar(type, e, s, lane, paint) {
    const a = nodes.get(e.a), b = nodes.get(e.b);
    const lp = lanePoint(a, b, lane, s);
    const v = this.game.vehicles.spawn(type, lp.x, lp.z, lp.heading, { paint, rng });
    v.persistent = true;
    const d = new LaneDriver(v, a.id, b.id, lane, s, rng);
    v.driver = d;
    this.game.traffic.drivers.set(v, d);
    return { v, d, lp };
  }

  start() {
    const roll = rng.next();
    const e = this.edgeNear(80, 170);
    if (!e) return;
    if (roll < 0.4) {
      const run = this.laneCar('sedan', e, e.len * 0.6, 1, '#2b2d42');
      run.d.panic = 9999; run.d.cruise = 19;
      const a = nodes.get(e.a), b = nodes.get(e.b);
      const lp = lanePoint(a, b, 0, e.len * 0.25);
      const cop = this.game.vehicles.spawn('police', lp.x, lp.z, lp.heading);
      cop.persistent = true;
      const chase = new PursuitDriver(cop);
      cop.driver = chase;
      this.active = { kind: 'pursuit', runner: run.v, cop, chase, t: 50 };
      this.game.dispatch.show('All units: stolen sedan fleeing, pursuit in progress near you.');
    } else if (roll < 0.7) {
      const r1 = this.laneCar('sports', e, e.len * 0.5, 0, '#ffd23f');
      const r2 = this.laneCar('sports', e, e.len * 0.2, 0, '#17c3b2');
      for (const r of [r1, r2]) { r.d.panic = 9999; r.d.cruise = 24; }
      this.active = { kind: 'racers', cars: [r1.v, r2.v], t: 40 };
    } else {
      // a mugging on the sidewalk of a nearby block
      const p = this.game.player.pos;
      const x = Math.round((p.x + (rng.next() - 0.5) * 120) / 64) * 64 + 9.5, z = Math.round((p.z + (rng.next() - 0.5) * 120) / 64) * 64 + 30;
      if (groundAt(x, z) !== 'walk') return; // only on a real sidewalk (not in the sea or a canal)
      const victim = this.game.peds.spawnAt(x, z);
      victim.state = 'idle'; victim.idleTimer = 999; victim.persistent = true;
      const mugger = new Gunman(this.game.scene, x + 1.2, z + 0.6, GANG_OUTFITS[2], 'gang', 'pistol');
      mugger.mode = 'guard'; mugger.alertRange = 12; mugger.heading = Math.atan2(victim.pos.x - mugger.pos.x, -(victim.pos.z - mugger.pos.z));
      this.active = { kind: 'mugging', victim, mugger, t: 60 };
    }
  }

  stop() {
    const a = this.active, g = this.game;
    if (!a) return;
    // back to ordinary traffic: no longer kept alive, and drivers calm down to a normal pace
    const drop = (v) => {
      if (!v || v === g.player.vehicle) return;
      v.persistent = false;
      const d = g.traffic.drivers.get(v);
      if (d) { d.panic = 0; d.cruise = 11; }
    };
    if (a.kind === 'pursuit') {
      drop(a.runner); drop(a.cop);
      // the cruiser pulls over and waits (its chase driver is only steered while the event runs)
      if (a.cop.driver === a.chase) {
        a.cop.sirenOn = false;
        a.cop.driver = null;
        Object.assign(a.cop.input, { throttle: 0, brake: 0, steer: 0, handbrake: true });
      }
    }
    if (a.kind === 'racers') a.cars.forEach(drop);
    if (a.kind === 'mugging') { a.mugger.dispose(); a.victim.persistent = false; a.victim.state = 'walk'; }
    this.active = null;
  }

  get people() { return this.active && this.active.kind === 'mugging' ? [this.active.mugger] : []; }

  blips() {
    const a = this.active;
    if (!a) return [];
    if (a.kind === 'pursuit') return [{ x: a.cop.pos.x, z: a.cop.pos.z, kind: 'police' }];
    if (a.kind === 'mugging' && a.mugger.alive) return [{ x: a.mugger.pos.x, z: a.mugger.pos.z, kind: 'enemy' }];
    return [];
  }

  update(dt) {
    const g = this.game;
    const busy = g.missions.active || g.wanted.stars > 0 || g.activities.active;
    if (!this.active) {
      this.timer -= dt;
      if (this.timer <= 0 && !busy) { this.timer = 45 + rng.next() * 40; this.start(); }
      return;
    }
    const a = this.active;
    a.t -= dt;
    if (a.kind === 'pursuit') {
      // once the getaway car is wrecked the cruiser pulls up beside it instead of ramming it
      if (a.cop.driver === a.chase && !a.runner.removed) a.chase.update(dt, { pos: a.runner.pos, vehicle: a.runner.wrecked ? null : a.runner }, null);
      if (a.runner.wrecked && !a.paid && g.player.vehicle) {
        a.paid = true;
        g.state.money += 500;
        g.hud.toast('<b>Citizen\'s arrest</b> · MKPD reward $500');
      }
    }
    if (a.kind === 'mugging') {
      a.mugger.think(dt, { player: g.player, targets: g.targets, fx: g.fx, alert: false });
      if (a.victim.alive && a.mugger.alive && a.mugger.mode === 'guard') {
        a.victim.rig.userData.arms[0].rotation.set(2.9, 0, -0.3);
        a.victim.rig.userData.arms[1].rotation.set(2.9, 0, 0.3);
      }
    }
    if (a.t <= 0 || busy && a.kind !== 'mugging') this.stop();
  }
}
