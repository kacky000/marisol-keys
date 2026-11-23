// Kestrel Motors: a forecourt with a turntable display car. Browse the lot with E, buy with Q;
// a bought car is delivered to the safehouse garage and kept between sessions.

import * as THREE from 'three';
import { buildVehicleMesh } from '../vehicles/vehicleMesh.js';
import { VEHICLE_TYPES } from '../vehicles/vehicleTypes.js';
import { groundHeight } from '../world/groundHeight.js';
import { emit } from '../core/events.js';
import { wasPressed } from '../core/input.js';

// The salesman's spot on the park's west sidewalk; the turntable stands on the lawn beside it.
export const DEALER = { x: 7 * 64 + 9.5, z: 7 * 64 + 20, name: 'Kestrel Motors', tx: 7 * 64 + 17.5, tz: 7 * 64 + 20 };
export const nearDealerLot = (x, z) => Math.hypot(x - DEALER.tx, z - DEALER.tz) < 6.5;

function salesBoardTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 96;
  const g = c.getContext('2d');
  g.fillStyle = '#222831'; g.fillRect(0, 0, 256, 96);
  g.fillStyle = '#ffd369'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '900 34px "Arial Black", Arial'; g.fillText('KESTREL MOTORS', 128, 38);
  g.font = '700 16px "Segoe UI", Arial'; g.fillStyle = '#ffffff'; g.fillText('drive one home today', 128, 72);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const STOCK = [
  { type: 'sports', paint: '#ff5a36', price: 9000 },
  { type: 'convertible', paint: '#8fd3c8', price: 6500 },
  { type: 'pickup', paint: '#3b6e4f', price: 4000 },
  { type: 'bike', paint: '#2fb5ff', price: 3000 },
];

export class CarDealer {
  constructor(game) {
    this.game = game;
    this.index = 0;
    this.turntable = new THREE.Group();
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.6, 0.25, 28), new THREE.MeshStandardMaterial({ color: '#e8e4dc', metalness: 0.3, roughness: 0.4 }));
    disc.position.y = 0.12;
    this.turntable.add(disc);
    this.turntable.position.set(DEALER.tx, groundHeight(DEALER.tx, DEALER.tz) + 0.05, DEALER.tz);
    game.scene.add(this.turntable);
    // a sales board on two posts
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.2, 3.4), new THREE.MeshStandardMaterial({ map: salesBoardTexture(), emissive: '#ffffff', emissiveIntensity: 0.15 }));
    board.material.emissiveMap = board.material.map;
    board.position.set(DEALER.x + 2.2, 2.4, DEALER.z - 4.6);
    for (const s of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.4, 0.1), new THREE.MeshStandardMaterial({ color: '#333' }));
      post.position.set(DEALER.x + 2.2, 1.2, DEALER.z - 4.6 + s * 1.5);
      game.scene.add(post);
    }
    game.scene.add(board);
    this.showCar();
  }

  showCar() {
    if (this.display) this.turntable.remove(this.display);
    const s = STOCK[this.index];
    this.display = buildVehicleMesh(s.type, VEHICLE_TYPES[s.type], s.paint);
    this.display.position.y = 0.25;
    if (this.display.userData.npc) this.display.userData.npc.visible = false; // showroom cars sit empty
    this.turntable.add(this.display);
  }

  update(dt) {
    const g = this.game, p = g.player;
    this.turntable.rotation.y += dt * 0.4;
    if (p.vehicle || Math.hypot(p.pos.x - DEALER.x, p.pos.z - DEALER.z) > 4) return;
    const s = STOCK[this.index];
    const spec = VEHICLE_TYPES[s.type];
    g.hud.prompt(`Kestrel Motors · <b>${spec.name}</b> $${s.price.toLocaleString('en-US')} &nbsp; <kbd>E</kbd> next car &nbsp; <kbd>Q</kbd> buy`);
    if (wasPressed('KeyE')) { this.index = (this.index + 1) % STOCK.length; this.showCar(); }
    if (wasPressed('KeyQ')) {
      if (g.state.money < s.price) { g.hud.toast('Not enough money'); return; }
      g.state.money -= s.price;
      g.state.garageCar = { type: s.type, paint: s.paint };
      if (g.shops.garageCar && !g.shops.garageCar.removed && g.shops.garageCar !== p.vehicle) g.vehicles.remove(g.shops.garageCar);
      g.shops.garageCar = null;
      g.shops.spawnGarageCar();
      g.save();
      g.hud.bigMessage('NEW WHEELS', `${spec.name} delivered to your safehouse garage`, 3);
      emit('sound', { name: 'passed' });
    }
  }
}
