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
    ['Story missions', state.story || 0, STORY.length, 50],
    ['Tide Book pages', (state.pages || []).length, PAGE_COUNT, 15],
    ['Stunt jumps', s.jumps || 0, JUMP_COUNT, 8],
    ['Properties', (state.properties || []).length, PROPERTIES.length, 10],
    ['Sunbelt tuning', tuned, TUNING_STEPS, 5],
    ['Keys Cab fares', s.fares || 0, 5, 3],
    ['Courier runs', s.deliveries || 0, 1, 3],
    ['Night Sprint', s.races || 0, 1, 3],
    ['Vigilante level', s.vigilante || 0, 3, 3],
  ];
}

export function completionPercent(state) {
  let pct = 0;
  for (const [, done, total, weight] of completionGoals(state)) pct += weight * Math.min(1, done / Math.max(1, total));
  return Math.floor(pct);
}
