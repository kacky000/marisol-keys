// Paramedic duty (any Sunwake Medical ambulance, press E): a patient lies on a kerb somewhere
// nearby; stop beside them to load them up, then race to Sunwake Medical before the clock runs
// out. Each patient delivered raises the level and pays more; E again goes off duty.

import { RESPAWN } from '../buildings/landmarkSigns.js';
import { BLOCK, ROAD_HALF, blockLetter, isUrban } from '../world/cityPlan.js';
import { rng } from '../core/rng.js';
import { emit } from '../core/events.js';

// the ambulance bay: pulled up on the wide pavement outside the hospital, clear of the lanes
export const HOSPITAL_BAY = { x: 11 * BLOCK - ROAD_HALF - 1.4, z: RESPAWN.hospital.z + 7 };

const CONDITIONS = ['a sunstroke on the boardwalk', 'a cyclist who met a cab door', 'a jogger with chest pains', 'a tourist stung by a jellyfish', 'a waiter who fell off a ladder', 'a fender-bender with whiplash'];

function kerbSpot(nearX, nearZ) {
  for (let k = 0; k < 40; k++) {
    const a = rng.next() * Math.PI * 2, r = 110 + rng.next() * 200;
    const x = nearX + Math.cos(a) * r, z = nearZ + Math.sin(a) * r;
    const i = Math.floor(x / BLOCK), j = Math.floor(z / BLOCK);
    if (!isUrban(blockLetter(i, j))) continue;
    // on the sidewalk, with the road kerb a few metres away
    return rng.next() < 0.5
      ? { x: i * BLOCK + ROAD_HALF + 2, z: j * BLOCK + 32, roadX: i * BLOCK + ROAD_HALF - 3, roadZ: j * BLOCK + 32 }
      : { x: i * BLOCK + 32, z: j * BLOCK + ROAD_HALF + 2, roadX: i * BLOCK + 32, roadZ: j * BLOCK + ROAD_HALF - 3 };
  }
  return null;
}

export function startParamedic(jobs, level = 1) {
  const g = jobs.game, p = g.player;
  const spot = kerbSpot(p.pos.x, p.pos.z);
  if (!spot) return;
  const patient = g.peds.spawnAt(spot.x, spot.z);
  patient.state = 'sunbathe'; // lying on the pavement
  patient.persistent = true;
  const what = CONDITIONS[Math.floor(rng.next() * CONDITIONS.length)];
  jobs.active = { kind: 'paramedic', stage: 'pickup', level, patient, what, timer: 55 - Math.min(20, level * 3), needsVehicle: true };
  jobs.setMarker(spot.roadX, spot.roadZ);
  g.hud.setObjective(`PARAMEDIC · LEVEL ${level}`, `Reach the patient: <b>${what}</b>`);
  g.player.vehicle.sirenOn = true;
}

// Returns true when the job handled this frame's progress.
export function updateParamedic(jobs, a, markerDist, offDuty) {
  const g = jobs.game, p = g.player;
  if (offDuty) { dropPatient(g, a); jobs.end('OFF DUTY'); return; }
  if (!p.vehicle || p.vehicle.type !== 'ambulance') return;
  const stopped = Math.abs(p.vehicle.speed) < 4;
  if (a.stage === 'pickup' && markerDist < 7 && stopped) {
    g.peds.remove(a.patient); // loaded aboard
    a.patient = null;
    a.stage = 'hospital';
    const d = Math.hypot(HOSPITAL_BAY.x - p.pos.x, HOSPITAL_BAY.z - p.pos.z);
    a.timer = 20 + d / 12;
    a.dist = d;
    jobs.setMarker(HOSPITAL_BAY.x, HOSPITAL_BAY.z);
    g.hud.setObjective(`PARAMEDIC · LEVEL ${a.level}`, 'Rush the patient to <b>Sunwake Medical</b>');
    emit('sound', { name: 'checkpoint' });
  } else if (a.stage === 'hospital' && markerDist < 8 && stopped) {
    const pay = Math.round(150 * a.level + a.dist * 0.4 + a.timer * 5);
    g.state.money += pay;
    g.state.stats.patients = (g.state.stats.patients || 0) + 1;
    g.hud.bigMessage(`PATIENT SAVED · LEVEL ${a.level}`, `+$${pay}`, 2.5);
    emit('sound', { name: 'cash' });
    jobs.end(null);
    startParamedic(jobs, a.level + 1);
  }
}

export function dropPatient(g, a) {
  if (a?.patient) { g.peds.remove(a.patient); a.patient = null; }
}
