// Keys Cab fast travel: on foot with a waypoint on the map and no heat, press T to hail a cab.
// The screen fades while the cab drives you over, the clock moves on by the length of the ride,
// and the fare comes out of your pocket. Not available during story missions.

import { wasPressed } from '../core/input.js';
import { nearestRoad } from '../roads/roadNetwork.js';
import { ROAD_HALF } from '../world/cityPlan.js';
import { isWater } from '../world/groundHeight.js';
import { emit } from '../core/events.js';

const MIN_DISTANCE = 150;     // metres: closer than this, walk
const FARE_BASE = 20, FARE_PER_KM = 60;
const RIDE_SECONDS = 2.4;     // real seconds behind the fade
const CAB_SPEED = 11;         // m/s, for the in-game minutes the ride takes

export class CabRide {
  constructor(game) {
    this.game = game;
    this.ride = null;
    this.fade = document.createElement('div');
    this.fade.id = 'cab-fade';
    this.fade.innerHTML = '<b>KEYS CAB</b><span></span>';
    document.body.appendChild(this.fade);
  }

  fareTo(w) {
    const p = this.game.player.pos;
    const km = Math.hypot(w.x - p.x, w.z - p.z) / 1000;
    return Math.round((FARE_BASE + km * FARE_PER_KM) / 5) * 5;
  }

  update(dt) {
    const g = this.game, p = g.player, w = g.waypoint;
    if (this.ride) { this.advance(dt); return; }
    if (!w || p.vehicle || p.dead || g.wanted.stars > 0 || g.missions.active || g.activities.active) return;
    if (Math.hypot(w.x - p.pos.x, w.z - p.pos.z) < MIN_DISTANCE) return;
    const fare = this.fareTo(w);
    g.hud.prompt(`<kbd>T</kbd> Hail a Keys Cab to your waypoint · $${fare}`);
    if (!wasPressed('KeyT')) return;
    if (g.state.money < fare) { g.hud.toast('Not enough cash for the fare'); return; }
    g.state.money -= fare;
    emit('sound', { name: 'horn' });
    const dist = Math.hypot(w.x - p.pos.x, w.z - p.pos.z);
    this.ride = { t: 0, moved: false, dest: { x: w.x, z: w.z }, minutes: Math.round(dist / CAB_SPEED / 60 * 4) };
    p.controlsLocked = true;
    this.fade.querySelector('span').textContent = `$${fare} · about ${Math.max(2, this.ride.minutes)} minutes across the island`;
    this.fade.classList.add('on');
  }

  advance(dt) {
    const g = this.game, r = this.ride, p = g.player;
    r.t += dt;
    if (!r.moved && r.t > RIDE_SECONDS / 2) {
      // dropped on the kerb nearest the waypoint, facing along the street
      const road = nearestRoad(r.dest.x, r.dest.z);
      const e = road.edge, len = Math.hypot(e.bx - e.ax, e.bz - e.az) || 1;
      const ux = (e.bx - e.ax) / len, uz = (e.bz - e.az) / len;
      const side = (r.dest.x - road.x) * -uz + (r.dest.z - road.z) * ux >= 0 ? 1 : -1;
      // the kerb on the waypoint's side, else the far kerb, else the road's own shoulder (a
      // waterfront street or a causeway has sea beyond its edge)
      const spots = [side * (ROAD_HALF + 1.5), -side * (ROAD_HALF + 1.5), side * (ROAD_HALF - 1.2)]
        .map((o) => ({ x: road.x - uz * o, z: road.z + ux * o }));
      const spot = spots.find((s) => !isWater(s.x, s.z)) || spots[2];
      p.placeAt(spot.x, spot.z, Math.atan2(ux, -uz));
      g.camera.yaw = p.heading;
      g.state.hour += Math.max(2, r.minutes) / 60;
      g.waypoint = null;
      r.moved = true;
    }
    if (r.t > RIDE_SECONDS) {
      this.fade.classList.remove('on');
      p.controlsLocked = false;
      this.ride = null;
      g.hud.toast('Keys Cab · <b>thanks for riding</b>');
    }
  }

  cancel() {
    if (!this.ride) return;
    this.fade.classList.remove('on');
    this.game.player.controlsLocked = false;
    this.ride = null;
  }
}
