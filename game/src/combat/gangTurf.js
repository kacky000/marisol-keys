// Street crews between missions: Gull's crew around the harbor and Las Linternas, the canal
// quarter's own gang in teal and violet, loiter in small groups, eye Tessa up, and open fire if
// she gets too close or starts shooting. Each one carries some cash.

import { Gunman, GANG_OUTFITS } from './gunman.js';
import { on } from '../core/events.js';
import { rng } from '../core/rng.js';

const B = 64;
const LINTERNAS_OUTFITS = [
  { skin: '#c98d66', shirt: '#19c3b4', pants: '#2a2340', hair: '#111', shorts: false, hat: 'cap', hatColor: '#7a3cff', shades: true, shoes: '#eee', build: 1.02 },
  { skin: '#8d5a3b', shirt: '#7a3cff', pants: '#1d1d2b', hair: '#2b1b12', shorts: true, hat: null, shades: false, shoes: '#19c3b4', build: 1.0, vest: '#19c3b4' },
  { skin: '#f1c7a5', shirt: '#2a2340', pants: '#19c3b4', hair: '#4a2c1a', shorts: false, hat: 'cap', hatColor: '#19c3b4', shades: true, shoes: '#222', build: 1.06 },
];
const HANGOUTS = [
  { x: 3 * B + 30, z: 12 * B + 9.5, name: 'Bravo Logistics yard', outfits: GANG_OUTFITS },
  { x: 6 * B + 20, z: 13 * B + 55, name: 'Quay Road loading bay', outfits: GANG_OUTFITS },
  { x: 3 * B + 9.5, z: 7 * B + 32, name: 'Lantern Canals footbridge', outfits: LINTERNAS_OUTFITS },
  { x: 4 * B + 32, z: 9 * B + 9.5, name: 'Canal Street corner', outfits: LINTERNAS_OUTFITS },
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
          const m = new Gunman(g.scene, c.x + (k - 1) * 1.6, c.z + rng.range(-1, 1), c.outfits[k % c.outfits.length], 'gang', k === 1 ? 'smg' : 'pistol');
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
