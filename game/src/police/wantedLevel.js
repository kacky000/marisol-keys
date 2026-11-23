// Wanted level: crimes raise heat (1-5 stars); police sight keeps the search zone on the player;
// break line of sight and leave the search circle long enough and the stars fade away.

import { on, emit } from '../core/events.js';

const CRIME_HEAT = {
  gunfire: 0.35, assault: 0.6, carjack: 0.7, runover: 0.8, 'kill-civilian': 1.0, 'shoot-cop': 1.0,
  'kill-cop': 1.6, 'steal-police-car': 1.2, 'vehicle-explosion': 0.8, 'hit-cop-car': 0.5,
};

export class WantedLevel {
  constructor() {
    this.heat = 0;
    this.stars = 0;
    this.seen = false;
    this.seenTimer = 0;
    this.unseenTimer = 0;
    this.evadeTimer = 0;
    this.zone = { x: 0, z: 0, r: 0 };
    this.flash = false;
    this.lastCrime = { name: '', time: -99 };
    this.minimumStars = 0;      // missions may hold the level up
    this.cooldown = 0;
    on('crime', (c) => this.report(c.type, c.x, c.z, c.witnessed !== false));
  }

  report(type, x, z, witnessed = true) {
    if (!witnessed && this.stars === 0) return;
    const add = CRIME_HEAT[type] ?? 0.4;
    const before = this.stars;
    this.heat = Math.min(5.99, this.heat + add);
    this.stars = Math.max(this.stars, Math.min(5, Math.floor(this.heat)), 1);
    this.lastCrime = { name: type, time: performance.now() };
    if (this.stars > 0 && before === 0) { this.zone = { x, z, r: this.zoneRadius() }; }
    this.seen = true;
    this.unseenTimer = 0;
    this.evadeTimer = 0;
    if (this.stars !== before) emit('wanted:changed', { stars: this.stars, before });
  }

  setStars(n) {
    const before = this.stars;
    this.stars = n;
    this.heat = Math.max(this.heat, n);
    if (n === 0) this.heat = 0;
    if (before !== n) emit('wanted:changed', { stars: n, before });
  }

  zoneRadius() { return 55 + this.stars * 22; }

  clear() { this.setStars(0); this.heat = 0; this.zone.r = 0; }

  // seenBy: whether any officer, car or helicopter can see the player this frame.
  update(dt, player, seenBy) {
    if (this.stars === 0) { this.zone.r = 0; return; }
    if (this.stars < this.minimumStars) this.setStars(this.minimumStars);
    this.seen = seenBy;
    const r = this.zoneRadius();
    if (seenBy) {
      this.zone.x = player.pos.x; this.zone.z = player.pos.z; this.zone.r = r;
      this.unseenTimer = 0;
      this.evadeTimer = 0;
    } else {
      this.unseenTimer += dt;
      const out = Math.hypot(player.pos.x - this.zone.x, player.pos.z - this.zone.z) > this.zone.r;
      if (out && this.stars > this.minimumStars) {
        this.evadeTimer += dt;
        if (this.evadeTimer > 5 + this.stars * 1.5) {
          emit('wanted:evaded', { stars: this.stars });
          this.clear();
        }
      } else this.evadeTimer = Math.max(0, this.evadeTimer - dt * 0.5);
    }
    this.flash = !seenBy && Math.floor(performance.now() / 350) % 2 === 0;
  }
}
