// Tessa's phone: the illustrated island map with every blip, the story mission list with
// rewards and progress, side jobs, and owned properties and stats.

import { paintIllustratedMap } from './mapPainter.js';
import { drawBlip } from './blipIcons.js';
import { STORY, CONTACTS } from '../missions/storyMissions.js';
import { CAST, paintPortrait } from '../story/cast.js';
import { PROPERTIES } from '../economy/shops.js';
import { formatMoney } from '../core/mathUtil.js';
import { planRoute } from '../roads/routePlanner.js';
import { formatClock } from '../sky/timeOfDay.js';

export class PhoneScreen {
  constructor(game) {
    this.game = game;
    this.el = document.getElementById('phone');
    this.canvas = document.getElementById('phone-map');
    this.side = document.getElementById('phone-side');
    this.tab = 'story';
    this.el.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => { this.tab = b.dataset.tab; this.render(); }));
  }

  get open() { return !this.el.classList.contains('hidden'); }

  toggle(v = !this.open) {
    this.el.classList.toggle('hidden', !v);
    if (v) this.render();
  }

  render() {
    const g = this.game;
    const status = this.el.querySelector('.phone-status');
    if (status) status.textContent = `${formatClock(g.state.hour)}   ▂▄▆█ KEYSNET 5G   87%`;
    this.el.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('on', b.dataset.tab === this.tab || (this.tab === 'map' && b.dataset.tab === 'map')));
    const ctx = this.canvas.getContext('2d');
    const { project } = paintIllustratedMap(ctx, this.canvas.width, { x0: -70, z0: 15, span: 1010 });
    // GPS preview: dotted route from Tessa to the next story contact
    const next = STORY[g.state.story];
    if (next && !g.missions.active) {
      const c = CONTACTS[next.at];
      const route = planRoute(g.player.pos.x, g.player.pos.z, c.x, c.z);
      ctx.save();
      ctx.strokeStyle = '#b06bff'; ctx.lineWidth = 6; ctx.lineJoin = 'round'; ctx.setLineDash([10, 7]);
      ctx.beginPath();
      const [sx, sy] = project(g.player.pos.x, g.player.pos.z);
      ctx.moveTo(sx, sy);
      for (const n of route) { const [x, y] = project(n.x, n.z); ctx.lineTo(x, y); }
      const [cx, cy] = project(c.x, c.z);
      ctx.lineTo(cx, cy);
      ctx.stroke();
      ctx.restore();
    }
    // story mission pins with numbers
    STORY.forEach((m, k) => {
      const c = CONTACTS[m.at];
      const [x, y] = project(c.x, c.z);
      if (k < g.state.story) return;
      drawBlip(ctx, { kind: 'contact', letter: CAST[m.giver].name[0] }, x + (k % 3) * 6, y, 13);
    });
    // uncollected Tide pages are secrets: show how many remain, not where
    for (const b of [...g.shops.blips(), ...g.activities.blips(), ...g.missions.blips()]) {
      const [x, y] = project(b.x, b.z);
      drawBlip(ctx, b, x, y, 11, g.time);
    }
    if (g.wanted.zone.r > 0) {
      const [x, y] = project(g.wanted.zone.x, g.wanted.zone.z);
      const [x2] = project(g.wanted.zone.x + g.wanted.zone.r, g.wanted.zone.z);
      ctx.fillStyle = 'rgba(60,110,255,0.25)'; ctx.strokeStyle = '#4f8bff'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x, y, x2 - x, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    const [px, py] = project(g.player.pos.x, g.player.pos.z);
    ctx.save(); ctx.translate(px, py); ctx.rotate(g.player.heading);
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#0b2233'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(12, 13); ctx.lineTo(0, 6); ctx.lineTo(-12, 13); ctx.closePath(); ctx.stroke(); ctx.fill();
    ctx.restore();
    this.drawLegend(ctx);
    this.renderSide();
  }

  // Key to the icons along the bottom of the map.
  drawLegend(ctx) {
    const H = this.canvas.height, W = this.canvas.width;
    ctx.fillStyle = 'rgba(8,20,32,0.82)';
    ctx.beginPath(); ctx.roundRect(12, H - 64, W - 24, 52, 12); ctx.fill();
    const items = [
      [{ kind: 'contact', letter: 'O' }, 'Story contact'], [{ kind: 'shop', letter: 'T' }, 'Shop'], [{ kind: 'job', letter: 'C' }, 'Side job'],
      [{ kind: 'property', color: '#ff8fb1' }, 'Property'], [{ kind: 'objective' }, 'Objective'], [{ kind: 'police' }, 'MKPD'],
    ];
    ctx.font = '700 17px "Segoe UI", Arial';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    let x = 38;
    for (const [b, label] of items) {
      drawBlip(ctx, b, x, H - 38, 11, 0);
      ctx.fillStyle = '#fff6ea';
      ctx.fillText(label, x + 18, H - 37);
      x += 30 + ctx.measureText(label).width + 20;
    }
    ctx.fillStyle = '#ffd36e'; ctx.font = '900 19px "Arial Black", Arial';
    ctx.fillText('MARISOL KEYS', 22, 30);
    ctx.font = '700 13px "Segoe UI", Arial'; ctx.fillStyle = '#e8f6ff';
    ctx.fillText(`PAGES FOUND ${(this.game.state.pages || []).length}/20`, 24, 52);
  }

  renderSide() {
    const g = this.game, st = g.state;
    if (this.tab === 'story' || this.tab === 'map') {
      const pct = Math.round((st.story / STORY.length) * 100);
      const rows = STORY.map((m, k) => {
        const cls = k < st.story ? 'done' : k === st.story ? 'next' : '';
        return `<div class="row ${cls}"><span class="num">${k < st.story ? '✓' : k + 1}</span><canvas data-portrait="${m.giver}" width="40" height="40" style="width:30px;height:30px;border-radius:6px"></canvas><span class="what"><b>${m.title}</b><span class="who">${CAST[m.giver].name}</span></span><span class="pay">${formatMoney(m.reward)}</span></div>`;
      }).join('');
      this.side.innerHTML = `<h3>THE TIDE BOOK</h3><div class="progress">STORY ${st.story}/${STORY.length} · ${pct}% COMPLETE<i style="--p:${pct}%"></i></div>${rows}`;
      this.side.querySelectorAll('[data-portrait]').forEach((c) => paintPortrait(c.getContext('2d'), c.dataset.portrait, 40));
    } else if (this.tab === 'jobs') {
      this.side.innerHTML = `<h3>SIDE JOBS</h3>
        <div class="row"><span class="num">🚕</span><span class="what"><b>Keys Cab fares</b>Get in any taxi and press E</span><span class="pay">${st.stats.fares} done</span></div>
        <div class="row"><span class="num">📦</span><span class="what"><b>Sunrise Couriers</b>Three parcels against the clock</span><span class="pay">${st.stats.deliveries} done</span></div>
        <div class="row"><span class="num">🏁</span><span class="what"><b>Night Sprint</b>Time trial from Marisol Blvd</span><span class="pay">${st.stats.bestRace ? st.stats.bestRace.toFixed(1) + 's' : '—'}</span></div>
        <div class="row"><span class="num">T</span><span class="what"><b>Keys Tactical</b>Guns, ammo and armour</span></div>
        <div class="row"><span class="num">P</span><span class="what"><b>Pastel Paint &amp; Body</b>Respray to lose the police · $250</span></div>`;
    } else {
      const rows = PROPERTIES.map((p) => `<div class="row ${st.properties.includes(p.id) ? 'done' : ''}"><span class="num">${st.properties.includes(p.id) ? '✓' : '⌂'}</span><span class="what"><b>${p.name}</b>+${formatMoney(p.income)} a day</span><span class="pay">${formatMoney(p.price)}</span></div>`).join('');
      this.side.innerHTML = `<h3>ASSETS</h3><div class="progress">CASH ${formatMoney(st.money)}</div>${rows}
        <div class="row"><span class="num">📄</span><span class="what"><b>Tide Book pages</b>Loose pages hidden around the island</span><span class="pay">${(st.pages || []).length}/20</span></div>
        <div class="row"><span class="what"><b>Stats</b>Missions ${st.stats.missions} · Fares ${st.stats.fares} · Deliveries ${st.stats.deliveries}</span></div>`;
    }
  }
}
