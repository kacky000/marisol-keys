// Hundred-percent tracking: every goal on the island weighted into one completion figure,
// with a checklist the phone shows so the player always knows what is left.

import { STORY } from '../missions/storyMissions.js';
import { PROPERTIES } from '../economy/shops.js';

const PAGE_COUNT = 20, JUMP_COUNT = 4, TUNING_STEPS = 9;

// [label, done, total, weight in percent]
export function completionGoals(state) {
  const s = state.stats || {};
  const u = state.upgrades || {};
  const tuned = (u.engine || 0) + (u.tyres || 0) + (u.armor || 0);
  return [
    ['Story missions', state.story || 0, STORY.length, 44],
    ['Riptide Run', s.boatRaces || 0, 1, 3],
    ['Tide Book pages', (state.pages || []).length, PAGE_COUNT, 15],
    ['Stunt ramps cleared', (state.rampsCleared || []).length, JUMP_COUNT, 8],
    ['Properties', (state.properties || []).length, PROPERTIES.length, 10],
    ['Sunbelt tuning', tuned, TUNING_STEPS, 5],
    ['Keys Cab fares', s.fares || 0, 5, 3],
    ['Courier runs', s.deliveries || 0, 1, 3],
    ['Night Sprint', s.races || 0, 1, 3],
    ['Vigilante level', s.vigilante || 0, 3, 3],
    ['Paramedic saves', s.patients || 0, 3, 3],
  ];
}

export function completionPercent(state) {
  let pct = 0;
  for (const [, done, total, weight] of completionGoals(state)) pct += weight * Math.min(1, done / Math.max(1, total));
  return Math.floor(pct);
}

const MILESTONES = [25, 50, 75, 100];
const HUNDRED_BONUS = 100000;

// Watches progress during play: a toast at each quarter and, at one hundred percent, a bonus
// and a headline. Older saves start at the milestone they have already passed, silently.
export class CompletionWatch {
  constructor(game) {
    this.game = game;
    this.wait = 0;
  }

  update(dt) {
    this.wait -= dt;
    if (this.wait > 0) return;
    this.wait = 2;
    const g = this.game, st = g.state;
    const pct = completionPercent(st);
    const reached = MILESTONES.filter((m) => pct >= m).pop() || 0;
    if (st.completionShown === undefined) { st.completionShown = reached; return; }
    if (reached <= st.completionShown) return;
    st.completionShown = reached;
    if (reached === 100) {
      st.money += HUNDRED_BONUS;
      g.hud.bigMessage('THE KEYS ARE YOURS', `100% COMPLETE · +$${HUNDRED_BONUS.toLocaleString('en-US')}`, 4);
    } else {
      g.hud.toast(`<b>Island ${reached}% complete</b> · check the Assets tab for what is left`);
    }
  }
}
