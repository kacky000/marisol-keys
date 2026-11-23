// Heads-up display: money, wanted stars, weapon and ammo, health and armour, clock, objective and
// timer, speedometer, district name pop-ups, toasts, prompts and big mission banners.

import { Minimap } from './minimap.js';
import { WEAPONS, drawWeaponIcon } from '../combat/weaponDefs.js';
import { formatClock } from '../sky/timeOfDay.js';
import { kmh } from '../vehicles/vehicleTypes.js';
import { formatMoney } from '../core/mathUtil.js';

const $ = (id) => document.getElementById(id);

export class Hud {
  constructor() {
    this.root = $('hud');
    this.minimap = new Minimap($('hud-minimap'));
    this.weaponIcon = $('weapon-icon').getContext('2d');
    this.speedDial = $('speedo-dial').getContext('2d');
    this.shownMoney = 0;
    this.lastWeapon = null;
    this.district = null;
    this.districtTimer = 0;
    this.bigTimer = 0;
    this.promptTimer = 0;
    for (let k = 0; k < 5; k++) $('hud-stars').appendChild(document.createElement('span')).textContent = '★';
  }

  show(v) { this.root.classList.toggle('hidden', !v); }

  setObjective(title, html) {
    const el = $('hud-objective');
    if (!title) { el.classList.add('hidden'); return; }
    el.classList.remove('hidden');
    el.querySelector('.obj-title').textContent = title;
    el.querySelector('.obj-text').innerHTML = html;
  }

  setTimer(t) {
    const el = $('hud-objective').querySelector('.obj-timer');
    if (t === null || t === undefined) { el.textContent = ''; return; }
    const s = Math.max(0, Math.ceil(t));
    el.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    el.style.color = t < 10 ? '#ff6b5a' : '#ffd36e';
  }

  toast(html, seconds = 3.5) {
    const box = $('hud-toast');
    const d = document.createElement('div');
    d.innerHTML = html;
    box.appendChild(d);
    while (box.children.length > 4) box.firstChild.remove();
    setTimeout(() => d.remove(), seconds * 1000);
  }

  prompt(html) {
    const el = $('hud-prompt');
    el.innerHTML = html;
    el.classList.remove('hidden');
    this.promptTimer = 0.15;
  }

  bigMessage(text, sub = '', seconds = 3) {
    const el = $('hud-bigmsg');
    el.innerHTML = `${text}<small>${sub}</small>`;
    el.classList.remove('hidden');
    this.bigTimer = seconds;
  }

  showDistrict(d) {
    if (this.district === d.name) return;
    this.district = d.name;
    const el = $('hud-district');
    el.querySelector('.district-name').textContent = d.name;
    el.querySelector('.district-sub').textContent = d.sub;
    el.classList.remove('hidden');
    this.districtTimer = 4;
  }

  // Crosshair kicks red when a round connects.
  hitMarker() {
    const el = $('hud-crosshair');
    el.classList.add('hit');
    clearTimeout(this.hitTimer);
    this.hitTimer = setTimeout(() => el.classList.remove('hit'), 120);
  }

  flashHit() {
    const el = $('hud-hitflash');
    el.style.boxShadow = 'inset 0 0 160px rgba(255,0,0,0.55)';
    setTimeout(() => { el.style.boxShadow = 'inset 0 0 160px rgba(255,0,0,0)'; }, 120);
  }

  setRadio(name) {
    const el = $('hud-radio');
    if (!name) { el.classList.add('hidden'); return; }
    el.textContent = '♪ ' + name;
    el.classList.remove('hidden');
    clearTimeout(this.radioTimer);
    this.radioTimer = setTimeout(() => el.classList.add('hidden'), 3000);
  }

  // Called every frame with a snapshot of the game.
  update(dt, s) {
    if (s.snapMoney) this.shownMoney = s.money;
    this.shownMoney += (s.money - this.shownMoney) * Math.min(1, dt * 6);
    if (Math.abs(s.money - this.shownMoney) < 1) this.shownMoney = s.money;
    $('hud-money').textContent = formatMoney(this.shownMoney);
    $('hud-clock').textContent = `${s.weatherIcon || ''} ${formatClock(s.hour)}`;
    const stars = $('hud-stars').children;
    for (let k = 0; k < 5; k++) stars[k].className = k < s.stars ? 'on' : '';
    $('hud-stars').classList.toggle('flash', s.starsFlash);
    $('hud-bars').querySelector('.health i').style.width = `${Math.max(0, s.health)}%`;
    $('hud-bars').querySelector('.armor i').style.width = `${Math.max(0, s.armor)}%`;
    if (this.lastWeapon !== s.weapon) {
      drawWeaponIcon(this.weaponIcon, s.weapon, 120, 48);
      this.lastWeapon = s.weapon;
    }
    const w = WEAPONS[s.weapon];
    $('hud-ammo').innerHTML = w.melee ? '<small>MELEE</small>' : `${s.clip}<small> / ${s.ammo}</small>`;
    const speedo = $('hud-speedo');
    if (s.vehicle) {
      speedo.classList.remove('hidden');
      const v = kmh(s.vehicle.speed);
      speedo.querySelector('.speed-num').textContent = v;
      speedo.querySelector('.vehicle-name').textContent = s.vehicle.spec.name.toUpperCase();
      this.drawDial(v, s.vehicle.spec.maxSpeed * 3.6, s.vehicle.health / s.vehicle.spec.health);
    } else speedo.classList.add('hidden');
    $('hud-crosshair').classList.toggle('hidden', !s.aiming);
    if (this.districtTimer > 0) { this.districtTimer -= dt; if (this.districtTimer <= 0) $('hud-district').classList.add('hidden'); }
    if (this.bigTimer > 0) { this.bigTimer -= dt; if (this.bigTimer <= 0) $('hud-bigmsg').classList.add('hidden'); }
    if (this.promptTimer > 0) { this.promptTimer -= dt; if (this.promptTimer <= 0) $('hud-prompt').classList.add('hidden'); }
    this.minimap.draw(s.map, dt);
  }

  drawDial(speed, max, condition) {
    const g = this.speedDial;
    g.clearRect(0, 0, 170, 170);
    const cx = 85, cy = 85, r = 72;
    const a0 = Math.PI * 0.75, a1 = Math.PI * 2.25;
    g.lineCap = 'round';
    g.lineWidth = 11;
    g.strokeStyle = 'rgba(8,20,32,0.72)';
    g.beginPath(); g.arc(cx, cy, r, a0, a1); g.stroke();
    const t = Math.min(1, speed / max);
    const grad = g.createLinearGradient(0, 170, 170, 0);
    grad.addColorStop(0, '#19d3c5'); grad.addColorStop(0.6, '#ffb347'); grad.addColorStop(1, '#ff6b5a');
    g.strokeStyle = grad;
    g.beginPath(); g.arc(cx, cy, r, a0, a0 + (a1 - a0) * t); g.stroke();
    g.fillStyle = 'rgba(8,20,32,0.6)';
    g.beginPath(); g.arc(cx, cy, r - 14, 0, Math.PI * 2); g.fill();
    // condition arc
    g.lineWidth = 4;
    g.strokeStyle = condition > 0.5 ? '#7bd389' : condition > 0.25 ? '#ffb347' : '#ff3b3b';
    g.beginPath(); g.arc(cx, cy, r - 20, Math.PI * 0.8, Math.PI * 0.8 + Math.PI * 1.4 * Math.max(0, condition)); g.stroke();
    g.fillStyle = '#fff';
    for (let k = 0; k <= 10; k++) {
      const a = a0 + (a1 - a0) * (k / 10);
      g.fillRect(cx + Math.cos(a) * (r + 9) - 1, cy + Math.sin(a) * (r + 9) - 1, 2.5, 2.5);
    }
  }
}
