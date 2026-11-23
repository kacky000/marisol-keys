// Small rewards for driving with style: threading past traffic at speed pays a near-miss bonus,
// and a long clean drift pays by the second. Crashing during a drift loses it.

import { emit } from '../core/events.js';

const NEAR_SPEED = 20;     // m/s the player must be doing (72 km/h)
const NEAR_GAP = 0.9;      // metres of daylight at most (tighter than a normal lane-to-lane pass)
const NEAR_PAY = 40;
const DRIFT_MIN = 1.2;     // seconds before a drift counts
const DRIFT_PAY = 60;      // dollars per second of drift

export class DrivingBonuses {
  constructor(game) {
    this.game = game;
    this.passed = new Map(); // vehicle -> time of the last near miss
    this.drift = 0;
    this.driftStartImpact = 0;
  }

  update(dt) {
    const g = this.game, v = g.player.vehicle;
    if (!v || v.spec.boat || v.wrecked) { this.drift = 0; return; }
    this.nearMisses(v, g.time);
    this.drifting(v, dt);
  }

  nearMisses(v, time) {
    if (Math.abs(v.speed) < NEAR_SPEED) return;
    const f = v.forward();
    for (const o of this.game.vehicles.list) {
      if (o === v || o.wrecked || o.spec.boat) continue;
      const dx = o.pos.x - v.pos.x, dz = o.pos.z - v.pos.z;
      const along = dx * f.x + dz * f.z;
      if (Math.abs(along) > 1.5) continue; // only when side by side
      const side = Math.abs(dx * f.z - dz * f.x) - (v.spec.width + o.spec.width) / 2;
      if (side < 0 || side > NEAR_GAP) continue;
      if (time - (this.passed.get(o) ?? -99) < 4 || time - v.lastImpact < 1) continue;
      this.passed.set(o, time);
      this.pay(NEAR_PAY, 'NEAR MISS');
    }
    if (this.passed.size > 40) this.passed.clear();
  }

  drifting(v, dt) {
    if (v.drifting && Math.abs(v.speed) > 8 && !v.airborne) {
      if (this.drift === 0) this.driftStartImpact = v.lastImpact;
      this.drift += dt;
      return;
    }
    const crashed = v.lastImpact !== this.driftStartImpact;
    if (this.drift >= DRIFT_MIN && !crashed) this.pay(Math.round(this.drift * DRIFT_PAY / 10) * 10, `DRIFT ${this.drift.toFixed(1)}s`);
    this.drift = 0;
  }

  pay(amount, label) {
    this.game.state.money += amount;
    this.game.hud.toast(`<b>${label}</b> +$${amount}`, 2);
    emit('sound', { name: 'cash' });
  }
}
