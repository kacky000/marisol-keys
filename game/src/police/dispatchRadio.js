// MKPD radio chatter: tells the player what the police know — street, heading, units en route —
// whenever the wanted level changes and every few seconds during a pursuit.

import { on } from '../core/events.js';
import { BLOCK, AVENUES, STREETS, districtAtPoint } from '../world/cityPlan.js';

const HEADINGS = ['northbound', 'eastbound', 'southbound', 'westbound'];

export function streetNameAt(x, z) {
  const i = Math.round(x / BLOCK), j = Math.round(z / BLOCK);
  const dx = Math.abs(x - i * BLOCK), dz = Math.abs(z - j * BLOCK);
  if (dz < 9 && STREETS[j]) return STREETS[j];
  if (dx < 9 && AVENUES[i]) return AVENUES[i];
  return districtAtPoint(x, z).name;
}

export function headingWord(h) {
  const k = Math.round((((h % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 2)) % 4;
  return HEADINGS[k];
}

const LINES = {
  1: ['Units in the area, report of a disturbance near {street}.', 'Patrol, eyes out for a suspect in teal near {street}.'],
  2: ['Suspect {dir} on {street}. Two units responding.', 'Shots reported on {street}. Approach with caution.'],
  3: ['Roadblocks going up ahead of the suspect. {dir} on {street}.', 'All units, suspect is armed. Last seen {dir} on {street}.'],
  4: ['Air One is up. Suspect {dir} on {street}, all units converge.', 'Captain Hale wants this one. {street}, {dir}, lethal force authorised.'],
  5: ['Every unit on the island to {street}. Do not lose the suspect.', 'Air One, light them up. Suspect {dir} on {street}.'],
};

export class DispatchRadio {
  constructor(game) {
    this.game = game;
    this.el = document.getElementById('hud-dispatch');
    this.timer = 0;
    this.hideTimer = 0;
    this.k = 0;
    on('wanted:changed', ({ stars }) => { if (stars > 0) this.say(stars); });
    on('wanted:evaded', () => this.show('All units, suspect lost. Return to patrol.'));
    on('police:roadblock', () => this.show('Roadblock in place. Suspect heading right for it.'));
  }

  say(stars) {
    const p = this.game.player;
    const list = LINES[Math.min(5, stars)];
    const line = list[this.k++ % list.length];
    const h = p.vehicle ? p.vehicle.heading : p.heading;
    this.show(line.replace('{street}', streetNameAt(p.pos.x, p.pos.z)).replace('{dir}', headingWord(h)));
  }

  show(text, seconds = 5) {
    if (!this.el) return;
    this.el.querySelector('.dispatch-text').textContent = text;
    this.el.classList.remove('hidden');
    this.hideTimer = seconds;
  }

  update(dt) {
    const stars = this.game.wanted.stars;
    if (this.hideTimer > 0) { this.hideTimer -= dt; if (this.hideTimer <= 0) this.el.classList.add('hidden'); }
    if (stars > 0 && this.game.wanted.seen) {
      this.timer -= dt;
      if (this.timer <= 0) { this.timer = 14; this.say(stars); }
    }
  }
}
