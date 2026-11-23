// Places that take your money: Keys Tactical (guns, ammo, armour), Pastel Paint & Body (a
// respray that loses the police), Sunbelt Garage (repairs) and properties that pay out daily.

import { PLACES } from '../world/cityPlan.js';
import { WEAPONS } from '../combat/weaponDefs.js';
import { wasPressed } from '../core/input.js';
import { emit } from '../core/events.js';

export const PROPERTIES = [
  { id: 'deco-loft', name: 'Pastel Mile Loft', x: 11 * 64 - 9.5, z: 7 * 64 + 30, price: 6000, income: 300 },
  { id: 'boathouse', name: 'Canal Boathouse', x: 4 * 64 + 9.5, z: 9 * 64 + 30, price: 4500, income: 220 },
  { id: 'surf-shack', name: 'Pelican Surf Shack', x: 12 * 64 + 20, z: 11 * 64 + 20, price: 3000, income: 150 },
  { id: 'penthouse', name: 'Lumen Tower Penthouse', x: 8 * 64 + 9.5, z: 4 * 64 + 30, price: 25000, income: 1200 },
];

export const SHOPS = [
  { id: 'guns', name: 'Keys Tactical', letter: 'T', ...PLACES.gunShop },
  { id: 'paint', name: 'Pastel Paint & Body', letter: 'P', ...PLACES.paintShop },
  { id: 'garage', name: 'Sunbelt Garage', letter: 'G', ...PLACES.garage },
];

export class Shops {
  constructor(game) {
    this.game = game;
    this.lastDay = Math.floor(game.state.hour / 24);
  }

  blips() {
    const out = SHOPS.map((s) => ({ x: s.x, z: s.z, kind: 'shop', letter: s.letter }));
    for (const p of PROPERTIES) out.push({ x: p.x, z: p.z, kind: 'property', color: this.game.state.properties.includes(p.id) ? '#7bd389' : '#ff8fb1' });
    return out;
  }

  update() {
    const g = this.game, p = g.player;
    // daily property income at 08:00
    const day = Math.floor((g.state.hour - 8) / 24);
    if (day > this.lastDay) {
      this.lastDay = day;
      const income = PROPERTIES.filter((q) => g.state.properties.includes(q.id)).reduce((a, q) => a + q.income, 0);
      if (income) { g.state.money += income; g.hud.toast(`Property income <b>+$${income}</b>`); }
    }
    for (const s of SHOPS) {
      const d = Math.hypot(p.pos.x - s.x, p.pos.z - s.z);
      if (d > 5) continue;
      if (s.id === 'guns' && !p.vehicle) this.gunShop();
      if (s.id === 'paint' && p.vehicle) this.paintShop();
      if (s.id === 'garage' && p.vehicle) this.garage();
    }
    for (const q of PROPERTIES) {
      if (g.state.properties.includes(q.id) || p.vehicle) continue;
      if (Math.hypot(p.pos.x - q.x, p.pos.z - q.z) > 3) continue;
      g.hud.prompt(`<kbd>E</kbd> Buy ${q.name} — $${q.price.toLocaleString('en-US')} (+$${q.income}/day)`);
      if (wasPressed('KeyE')) {
        if (g.state.money >= q.price) { g.state.money -= q.price; g.state.properties.push(q.id); g.hud.bigMessage('PROPERTY BOUGHT', q.name, 3); emit('sound', { name: 'passed' }); g.save(); }
        else g.hud.toast('Not enough money');
      }
    }
  }

  gunShop() {
    const g = this.game, p = g.player;
    const stock = [['smg', 1600, 96], ['shotgun', 2400, 24], ['pistol', 300, 48]];
    const next = stock.find(([id]) => !p.owned.has(id)) || stock[(Math.floor(g.time / 3)) % stock.length];
    const [id, price, ammo] = next;
    const owned = p.owned.has(id);
    const cost = owned ? Math.round(price * 0.25) : price;
    g.hud.prompt(`<kbd>E</kbd> ${owned ? 'Ammo for' : 'Buy'} ${WEAPONS[id].name} — $${cost} &nbsp; <kbd>Q</kbd> Body armour — $500`);
    if (wasPressed('KeyE')) {
      if (g.state.money >= cost) { g.state.money -= cost; p.giveWeapon(id, ammo); g.hud.toast(`${WEAPONS[id].name} <b>+${ammo}</b>`); emit('sound', { name: 'cash' }); }
      else g.hud.toast('Not enough money');
    }
    if (wasPressed('KeyQ') && g.state.money >= 500) { g.state.money -= 500; p.armor = 100; g.hud.toast('Armour <b>100%</b>'); emit('sound', { name: 'cash' }); }
  }

  paintShop() {
    const g = this.game;
    if (g.wanted.stars === 0) { g.hud.prompt('Pastel Paint & Body — come back when the heat is on'); return; }
    if (g.wanted.minimumStars > 0) { g.hud.prompt('Too hot to respray right now'); return; }
    g.hud.prompt('<kbd>E</kbd> Respray and lose the cops — $250');
    if (wasPressed('KeyE') && g.state.money >= 250) {
      g.state.money -= 250;
      const v = g.player.vehicle;
      v.mesh.userData.body.geometry.attributes.color.array.forEach((_, k, arr) => { if (k % 3 === 0 && arr[k] > 0.3) { arr[k] = Math.random(); arr[k + 1] = Math.random(); arr[k + 2] = Math.random(); } });
      v.mesh.userData.body.geometry.attributes.color.needsUpdate = true;
      v.health = v.spec.health;
      g.wanted.clear();
      g.hud.bigMessage('FRESH PAINT', 'The MKPD lost your description', 3);
      emit('sound', { name: 'cash' });
    }
  }

  garage() {
    const g = this.game, v = g.player.vehicle;
    if (v.health >= v.spec.health) return;
    g.hud.prompt('<kbd>E</kbd> Repair at Sunbelt Garage — $150');
    if (wasPressed('KeyE') && g.state.money >= 150) { g.state.money -= 150; v.health = v.spec.health; g.hud.toast('Vehicle repaired'); emit('sound', { name: 'cash' }); }
  }
}
