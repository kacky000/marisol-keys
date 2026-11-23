// The HUD radar: the painted city map rotated with the player, GPS route to the objective,
// the police search circle, blips for cops, enemies, contacts and shops, and the player arrow.

import { cityMapCanvas, worldToMap } from './mapPainter.js';
import { drawBlip } from './blipIcons.js';
import { planRoute } from '../roads/routePlanner.js';

export class Minimap {
  constructor(canvas) {
    this.canvas = canvas;
    this.g = canvas.getContext('2d');
    this.route = [];
    this.routeFor = null;
    this.routeTimer = 0;
    this.zoom = 1.1;
  }

  // view: { x, z, heading, speed, blips: [], zone: {x,z,r,seen}, time }
  draw(view, dt = 0.016) {
    const g = this.g, W = this.canvas.width, H = this.canvas.height;
    const map = cityMapCanvas();
    const targetZoom = 1.25 - Math.min(0.6, view.speed * 0.012);
    this.zoom += (targetZoom - this.zoom) * Math.min(1, dt * 2);
    const z = this.zoom;
    g.save();
    g.clearRect(0, 0, W, H);
    g.beginPath(); g.arc(W / 2, H / 2, W / 2, 0, Math.PI * 2); g.clip();
    g.fillStyle = '#2f8fbf';
    g.fillRect(0, 0, W, H);
    g.translate(W / 2, H / 2 + H * 0.12);
    g.rotate(-view.heading);
    g.scale(z, z);
    const p = worldToMap(view.x, view.z);
    g.translate(-p.x, -p.y);
    g.drawImage(map, 0, 0);
    // GPS route to the first objective blip
    const goal = view.blips.find((b) => b.kind === 'objective') || view.blips.find((b) => b.kind === 'waypoint')
      || view.blips.find((b) => b.kind === 'contact' || b.kind === 'vehicle');
    this.routeTimer -= dt;
    if (goal && (this.routeTimer <= 0 || this.routeFor !== goal)) {
      this.routeTimer = 1;
      this.routeFor = goal;
      this.route = planRoute(view.x, view.z, goal.x, goal.z);
    }
    if (goal && this.route.length) {
      g.strokeStyle = 'rgba(160,90,255,0.95)';
      g.lineWidth = 6;
      g.lineJoin = 'round';
      g.beginPath();
      const s0 = worldToMap(view.x, view.z);
      g.moveTo(s0.x, s0.y);
      for (const n of this.route) { const q = worldToMap(n.x, n.z); g.lineTo(q.x, q.y); }
      const qg = worldToMap(goal.x, goal.z);
      g.lineTo(qg.x, qg.y);
      g.stroke();
    }
    // search zone
    if (view.zone && view.zone.r > 0) {
      const c = worldToMap(view.zone.x, view.zone.z);
      const pulse = 0.5 + 0.5 * Math.sin(view.time * 5);
      g.fillStyle = view.zone.seen ? `rgba(255,50,60,${0.16 + pulse * 0.1})` : `rgba(60,110,255,${0.16 + pulse * 0.1})`;
      g.strokeStyle = view.zone.seen ? 'rgba(255,60,70,0.9)' : 'rgba(80,140,255,0.9)';
      g.lineWidth = 3 / z;
      g.beginPath(); g.arc(c.x, c.y, view.zone.r, 0, Math.PI * 2); g.fill(); g.stroke();
    }
    g.restore();
    // blips drawn upright, clamped to the rim
    const cx = W / 2, cy = H / 2 + H * 0.12;
    const cosH = Math.cos(-view.heading), sinH = Math.sin(-view.heading);
    for (const b of view.blips) {
      const dx = (b.x - view.x) * z, dz = (b.z - view.z) * z;
      let sx = cx + dx * cosH - dz * sinH, sy = cy + dx * sinH + dz * cosH;
      const ox = sx - W / 2, oy = sy - H / 2, r = Math.hypot(ox, oy), lim = W / 2 - 12;
      if (r > lim) {
        // only the things you are heading for stick to the rim; the rest drop off the radar
        if (!['objective', 'contact', 'vehicle', 'enemy'].includes(b.kind)) continue;
        sx = W / 2 + (ox / r) * lim; sy = H / 2 + (oy / r) * lim;
      }
      drawBlip(g, b, sx, sy, b.kind === 'enemy' || b.kind === 'police' ? 7 : 10, view.time);
    }
    // player arrow
    g.save();
    g.translate(cx, cy);
    g.rotate(view.arrowRel || 0);
    g.fillStyle = '#ffffff';
    g.strokeStyle = '#0b2233';
    g.lineWidth = 3;
    g.beginPath(); g.moveTo(0, -13); g.lineTo(10, 11); g.lineTo(0, 5); g.lineTo(-10, 11); g.closePath(); g.stroke(); g.fill();
    g.restore();
    // north marker on the rim
    const nx = W / 2 + Math.sin(-view.heading) * (W / 2 - 14), ny = H / 2 - Math.cos(-view.heading) * (W / 2 - 14);
    g.fillStyle = '#0b2233'; g.beginPath(); g.arc(nx, ny, 11, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff'; g.font = '900 13px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('N', nx, ny + 1);
  }
}
