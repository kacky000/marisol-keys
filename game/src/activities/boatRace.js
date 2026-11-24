// The Riptide Run: a speedboat time trial off Sunwake Beach. Sit in any boat by the end of the
// pier and press E; buoy gates lead out past the surf, round the Turquoise Sound and back to the
// pier. Best time is kept; quicker runs pay more.

import { emit } from '../core/events.js';

export const RACE_START = { x: 912, z: 500 };
// buoy gates, all on open water east of the beach (checked as navigable)
export const RIPTIDE_COURSE = [[930, 400], [970, 260], [940, 130], [1040, 170], [1070, 400], [1050, 640], [970, 800], [905, 700], [915, 560], [912, 505]];
const TIME = 110;

export function startBoatRace(jobs) {
  jobs.active = { kind: 'boatrace', cp: 0, timer: TIME, needsVehicle: true };
  const [x, z] = RIPTIDE_COURSE[0];
  jobs.setMarker(x, z, true);
  jobs.game.hud.setObjective('RIPTIDE RUN', `Buoy 0/${RIPTIDE_COURSE.length}`);
  emit('sound', { name: 'checkpoint' });
}

// Called by SideJobs while the race runs; markerDist is the distance to the current gate.
export function updateBoatRace(jobs, a, markerDist) {
  const g = jobs.game, v = g.player.vehicle;
  if (!v || !v.spec.boat) return; // the side-job grace timer ends it if Tessa stays out of a boat
  if (markerDist > 14) return;
  a.cp++;
  emit('sound', { name: 'checkpoint' });
  if (a.cp >= RIPTIDE_COURSE.length) {
    const time = TIME - a.timer;
    const st = g.state.stats;
    const record = !st.boatBest || time < st.boatBest;
    if (record) st.boatBest = time;
    st.boatRaces = (st.boatRaces || 0) + 1;
    jobs.end(`${record ? 'NEW RECORD · ' : ''}${time.toFixed(1)}s`, time < 70 ? 2500 : time < 85 ? 1200 : 500);
    return;
  }
  const [x, z] = RIPTIDE_COURSE[a.cp];
  jobs.setMarker(x, z, true);
  g.hud.setObjective('RIPTIDE RUN', `Buoy ${a.cp}/${RIPTIDE_COURSE.length}`);
}
