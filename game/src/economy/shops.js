// Places that take your money: Keys Tactical (guns, ammo, armour), Pastel Paint & Body (a
// respray that loses the police), Sunbelt Garage (repairs) and properties that pay out daily.

import { PLACES } from '../world/cityPlan.js';
import { WEAPONS } from '../combat/weaponDefs.js';
import { wasPressed } from '../core/input.js';
import { emit } from '../core/events.js';
import { STORE, clothingStore } from './clothingStore.js';
import { PropertySigns } from './propertySigns.js';
import { CarDealer, DEALER } from './carDealer.js';

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
  { id: 'threads', name: STORE.name, letter: 'S', x: STORE.x, z: STORE.z },
  { id: 'cars', name: DEALER.name, letter: 'K', x: DEALER.x, z: DEALER.z },
];

export class Shops {
  constructor(game) {
    this.game = game;
    this.lastDay = Math.floor(game.state.hour / 24);
    this.signs = new PropertySigns(game.scene, PROPERTIES);
    this.dealer = new CarDealer(game);
  }

  // The stored car waits at the safehouse kerb when the game starts.
  // The last session's garage car leaves with it (a new game or another save may have none).
  clearGarageCar() {
    if (this.garageCar && !this.garageCar.removed && this.garageCar !== this.game.player.vehicle) this.game.vehicles.remove(this.garageCar);
    this.garageCar = null;
  }

  spawnGarageCar() {
    const g = this.game, c = g.state.garageCar;
    if (!c || (this.garageCar && !this.garageCar.removed)) return;
    this.garageCar = g.vehicles.spawn(c.type, PLACES.safehouse.x - 6, 8 * 64 + 3.5, Math.PI / 2, { paint: c.paint });
    this.garageCar.persistent = true;
  }

  blips() {
    const out = SHOPS.map((s) => ({ x: s.x, z: s.z, kind: 'shop', letter: s.letter }));
    out.push({ x: PLACES.safehouse.x, z: PLACES.safehouse.z, kind: 'safehouse' });
    for (const p of PROPERTIES) out.push({ x: p.x, z: p.z, kind: 'property', color: this.game.state.properties.includes(p.id) ? '#7bd389' : '#ff8fb1' });
    return out;
  }

  update() {
    const g = this.game, p = g.player;
    this.signs.update(g.state.properties, g.time);
    this.dealer.update(1 / 60);
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
      if (s.id === 'threads' && !p.vehicle) clothingStore(g, wasPressed);
    }
    // safehouse: save and sleep until the next morning; park a car in its garage
    const sh = PLACES.safehouse;
    if (p.vehicle && !p.vehicle.spec.boat && !p.vehicle.spec.police && Math.hypot(p.pos.x - sh.x, p.pos.z - sh.z) < 9 && Math.abs(p.vehicle.speed) < 3) {
      g.hud.prompt('<kbd>E</kbd> Keep this car in the safehouse garage');
      if (wasPressed('KeyE')) {
        const v = p.vehicle;
        g.state.garageCar = { type: v.type, paint: v.paint };
        v.persistent = true;
        this.garageCar = v;
        g.save();
        g.hud.toast(`<b>${v.spec.name}</b> stored — it will be waiting here`);
        emit('sound', { name: 'cash' });
      }
    }
    if (!p.vehicle && Math.hypot(p.pos.x - sh.x, p.pos.z - sh.z) < 3 && !g.missions.active) {
      if (g.wanted.stars > 0) g.hud.prompt('Lose the police before resting at the safehouse');
      else {
        g.hud.prompt('<kbd>E</kbd> Save the game and rest until 08:00');
        if (wasPressed('KeyE')) {
          g.state.hour = Math.ceil((g.state.hour - 8) / 24) * 24 + 8;
          p.health = 100;
          g.save();
          g.hud.bigMessage('GAME SAVED', 'Old Keys safehouse · a new day on the Keys', 3);
          emit('sound', { name: 'passed' });
        }
      }
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
    const stock = [['bat', 250, 0], ['smg', 1600, 96], ['shotgun', 2400, 24], ['pistol', 300, 48]];
    // what you don't own yet comes first; after that the counter cycles through ammo (not the bat)
    const refills = stock.filter(([id]) => !WEAPONS[id].melee);
    const next = stock.find(([id]) => !p.owned.has(id)) || refills[(Math.floor(g.time / 3)) % refills.length];
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

  // Sunbelt Garage: repairs, then three tiers each of engine, armour plating and tyres. The
  // tuning travels with Tessa (Sunbelt's mechanics tune whatever she drives).
  garage() {
    const g = this.game, v = g.player.vehicle;
    if (v.health < v.spec.health || v.tyresBurst) {
      g.hud.prompt('<kbd>E</kbd> Repair at Sunbelt Garage — $150');
      if (wasPressed('KeyE') && g.state.money >= 150) { g.state.money -= 150; v.health = v.spec.health; v.tyresBurst = false; g.hud.toast('Vehicle repaired · new tyres'); emit('sound', { name: 'cash' }); }
      return;
    }
    const up = g.state.upgrades;
    const next = UPGRADES.find((u) => up[u.id] < 3);
    if (!next) { g.hud.prompt('Sunbelt Garage — fully tuned'); return; }
    const level = up[next.id] + 1, price = next.price * level;
    g.hud.prompt(`<kbd>E</kbd> Install ${next.name} ${'I'.repeat(level)} — $${price.toLocaleString('en-US')} (${next.effect})`);
    if (wasPressed('KeyE')) {
      if (g.state.money < price) { g.hud.toast('Not enough money'); return; }
      g.state.money -= price;
      up[next.id] = level;
      g.hud.bigMessage(`${next.name.toUpperCase()} ${'I'.repeat(level)}`, 'Sunbelt Garage tuning installed', 2.5);
      emit('sound', { name: 'cash' });
    }
  }
}

export const UPGRADES = [
  { id: 'engine', name: 'Street Engine', price: 1200, effect: '+top speed, +acceleration' },
  { id: 'tyres', name: 'Grip Tyres', price: 800, effect: '+cornering' },
  { id: 'armor', name: 'Armour Plating', price: 1000, effect: '-crash and bullet damage' },
];

// Multipliers the vehicle physics reads for whatever Tessa drives.
export function tuningFor(upgrades) {
  const u = upgrades || { engine: 0, tyres: 0, armor: 0 };
  return { speed: 1 + u.engine * 0.08, accel: 1 + u.engine * 0.14, grip: 1 + u.tyres * 0.12, armor: 1 + u.armor * 0.45 };
}
