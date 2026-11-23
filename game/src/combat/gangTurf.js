// Gull's crew hangs around the harbor between missions: small groups that loiter, eye Tessa up,
// and open fire if she gets too close or starts shooting. Each one carries some cash.

import { Gunman, GANG_OUTFITS } from './gunman.js';
import { on } from '../core/events.js';
import { rng } from '../core/rng.js';

const B = 64;
const HANGOUTS = [
  { x: 3 * B + 30, z: 12 * B + 9.5, name: 'Bravo Logistics yard' },
  { x: 6 * B + 20, z: 13 * B + 55, name: 'Quay Road loading bay' },
];

export class GangTurf {
  constructor(game) {
    this.game = game;
    this.crews = HANGOUTS.map((h) => ({ ...h, members: [], cooldown: 0 }));
    on('ped:killed', ({ ped, source }) => {
      if (ped.kind === 'gang' && source?.byPlayer && this.crews.some((c) => c.members.includes(ped))) {
        game.pickups?.drop('cash', ped.pos.x - 0.6, ped.pos.z);
      }
    });
  }

  get people() { return this.crews.flatMap((c) => c.members); }

  blips() {
    const out = [];
    for (const c of this.crews) for (const m of c.members) if (m.alive && m.mode === 'attack') out.push({ x: m.pos.x, z: m.pos.z, kind: 'enemy' });
    return out;
  }

  update(dt) {
    const g = this.game, p = g.player;
    const inMission = !!g.missions.active;
    for (const c of this.crews) {
      const d = Math.hypot(p.pos.x - c.x, p.pos.z - c.z);
      c.cooldown -= dt;
      // turn up when Tessa is in the area (not during missions, which bring their own crews)
      if (!c.members.length && d < 130 && d > 50 && !inMission && c.cooldown <= 0) {
        for (let k = 0; k < 3; k++) {
          const m = new Gunman(g.scene, c.x + (k - 1) * 1.6, c.z + rng.range(-1, 1), GANG_OUTFITS[k % GANG_OUTFITS.length], 'gang', k === 1 ? 'smg' : 'pistol');
          m.mode = 'guard';
          m.alertRange = 11;
          m.heading = rng.range(0, 6.28);
          c.members.push(m);
        }
      }
      const ctx = { player: p, targets: g.targets, fx: g.fx, alert: false };
      for (const m of c.members) m.think(dt, ctx);
      // leave when Tessa is long gone, or come back later once they have all been dropped
      if (c.members.length && (d > 220 || inMission || c.members.every((m) => !m.alive && m.deadTimer > 20))) {
        for (const m of c.members) m.dispose();
        c.members = [];
        c.cooldown = 120;
      }
    }
  }

  // Gunfire nearby puts the whole crew on edge.
  alertNear(x, z) {
    for (const c of this.crews) if (Math.hypot(x - c.x, z - c.z) < 45) for (const m of c.members) if (m.alive) m.mode = 'attack';
  }
}
