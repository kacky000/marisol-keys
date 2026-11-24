// Phone calls from the cast: after a few minutes of free roam without picking up the next story
// mission, the contact who gives it rings Tessa with a nudge and where to find them. One call per
// mission, remembered in the save; the call plays over gameplay without taking the controls.

import { STORY, CONTACTS } from '../missions/storyMissions.js';
import { CAST } from './cast.js';
import { emit } from '../core/events.js';

const IDLE_SECONDS = 150;

const NUDGES = {
  ozzie: (where) => [`Tessa, it's Ozzie. Got something that won't keep — come by ${where}.`, 'On my way, Oz.'],
  lulu: (where) => [`Darling, it's Lulu. ${where} misses you, and I have a job with your name on it.`, 'Keep the engine warm. Coming.'],
  priya: (where) => [`Static 88 calling Tessa Vane. I cracked something big — get to ${where}, quietly.`, 'Quietly. Got it.'],
};

export class ContactCalls {
  constructor(game) {
    this.game = game;
    this.idle = 0;
  }

  update(dt) {
    const g = this.game, st = g.state;
    const next = STORY[st.story];
    const busy = !next || g.missions.active || g.activities.active || g.wanted.stars > 0 || g.dialogue.onDone || g.cab?.ride || g.player.dead || g.intro.playing;
    if (busy) { if (g.missions.active) this.idle = 0; return; }
    this.idle += dt;
    if (this.idle < IDLE_SECONDS) return;
    st.callsMade ??= [];
    if (st.callsMade.includes(next.id)) return;
    st.callsMade.push(next.id);
    this.idle = 0;
    const who = next.giver, where = CONTACTS[next.at].label;
    const [ask, reply] = (NUDGES[who] || NUDGES.ozzie)(where);
    emit('sound', { name: 'blip' });
    g.hud.toast(`📞 Incoming call · <b>${CAST[who].name}</b>`, 3);
    g.dialogue.play([[who, ask], ['tessa', reply]], () => {});
  }
}
