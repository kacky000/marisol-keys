// Spinning pickups scattered around the island: health hearts, armour vests, ammo boxes and
// dropped cash. They respawn a few minutes after being taken.

import * as THREE from 'three';
import { groundHeight } from '../world/groundHeight.js';
import { emit, on } from '../core/events.js';

const B = 64;
const KINDS = {
  health: { color: new THREE.Color(3.2, 0.5, 0.6), label: 'Health' },
  armor: { color: new THREE.Color(0.5, 1.6, 3.4), label: 'Armour' },
  ammo: { color: new THREE.Color(2.6, 2.0, 0.4), label: 'Ammo' },
  cash: { color: new THREE.Color(0.6, 3.0, 0.8), label: 'Cash' },
  bribe: { color: new THREE.Color(3.2, 2.6, 0.3), label: 'Police bribe' },
};
const SPOTS = [
  ['health', 7 * B + 20, 8 * B + 9.5], ['armor', 7 * B + 44, 8 * B + 9.5], ['health', 12 * B + 12, 5 * B + 20], ['ammo', 9 * B + 9.5, 10 * B + 20],
  ['armor', 4 * B + 9.5, 12 * B + 30], ['ammo', 5 * B + 30, 13 * B + 9.5], ['health', 3 * B + 9.5, 6 * B + 40], ['cash', 6 * B + 9.5, 6 * B + 32],
  ['health', 8 * B + 9.5, 3 * B + 40], ['armor', 6 * B + 9.5, 2 * B + 30], ['cash', 11 * B + 9.5, 11 * B + 20], ['ammo', 10 * B + 54, 6 * B + 9.5],
  ['cash', 3 * B + 32, 2 * B - 9.5], ['health', 9 * B + 54, 12 * B + 40], ['ammo', 3 * B + 54, 9 * B + 30], ['cash', 12 * B + 30, 13 * B + 20],
  ['bribe', 8 * B + 9.5, 7 * B + 30], ['bribe', 4 * B + 54, 4 * B + 30], ['bribe', 10 * B + 30, 11 * B + 54],
];

function pickupMesh(kind) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: KINDS[kind].color, emissiveIntensity: 0.6, roughness: 0.4 });
  let m;
  if (kind === 'health') {
    m = new THREE.Group();
    m.add(new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.2, 0.2), mat), new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.6, 0.2), mat));
  } else if (kind === 'armor') {
    m = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.18), mat);
  } else if (kind === 'bribe') {
    // a gold star: two crossed triangles
    m = new THREE.Group();
    const tri = new THREE.CylinderGeometry(0.42, 0.42, 0.08, 3);
    tri.rotateX(Math.PI / 2);
    const a = new THREE.Mesh(tri, mat), b = new THREE.Mesh(tri, mat);
    b.rotation.z = Math.PI;
    m.add(a, b);
  } else if (kind === 'ammo') {
    m = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.35, 0.35), mat);
  } else {
    m = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 0.3), mat);
  }
  m.position.y = 0.9;
  const halo = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.65, 20), new THREE.MeshBasicMaterial({ color: KINDS[kind].color, transparent: true, opacity: 0.7, side: THREE.DoubleSide }));
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = 0.06;
  g.add(m, halo);
  g.userData.spin = m;
  return g;
}

export class Pickups {
  constructor(game) {
    this.game = game;
    this.items = SPOTS.map(([kind, x, z]) => {
      const mesh = pickupMesh(kind);
      mesh.position.set(x, Math.max(0, groundHeight(x, z)), z);
      game.scene.add(mesh);
      return { kind, x, z, mesh, respawn: 0 };
    });
    on('ped:killed', ({ ped }) => { if (ped.weapon && ped.kind !== 'civilian') this.drop('ammo', ped.pos.x + 0.6, ped.pos.z); });
  }

  blips() {
    return this.items.filter((p) => p.kind === 'health' && p.mesh.visible).map((p) => ({ x: p.x, z: p.z, kind: 'health' }));
  }

  // Armed enemies and officers drop their ammo when they go down (gone again after 30 s).
  drop(kind, x, z) {
    const mesh = pickupMesh(kind);
    mesh.position.set(x, Math.max(0, groundHeight(x, z)), z);
    this.game.scene.add(mesh);
    this.items.push({ kind, x, z, mesh, respawn: 0, ttl: 30 });
  }

  update(dt, time) {
    const p = this.game.player;
    for (const it of [...this.items]) {
      if (it.ttl !== undefined) {
        it.ttl -= dt;
        if (it.ttl <= 0 || !it.mesh.visible) { this.game.scene.remove(it.mesh); this.items.splice(this.items.indexOf(it), 1); continue; }
      }
      if (!it.mesh.visible) {
        it.respawn -= dt;
        if (it.respawn <= 0) it.mesh.visible = true;
        continue;
      }
      it.mesh.userData.spin.rotation.y = time * 2.2;
      it.mesh.userData.spin.position.y = 0.9 + Math.sin(time * 3 + it.x) * 0.1;
      if ((p.pos.x - it.x) ** 2 + (p.pos.z - it.z) ** 2 > (p.vehicle ? 9 : 1.6)) continue;
      if (it.kind === 'health' && p.health >= 100) continue;
      if (it.kind === 'armor' && p.armor >= 100) continue;
      if (it.kind === 'bribe' && (this.game.wanted.stars === 0 || this.game.wanted.minimumStars > 0)) continue;
      if (it.kind === 'bribe') this.game.wanted.setStars(this.game.wanted.stars - 1);
      it.mesh.visible = false;
      it.respawn = 180;
      if (it.kind === 'health') p.health = Math.min(100, p.health + 50);
      if (it.kind === 'armor') p.armor = Math.min(100, p.armor + 50);
      if (it.kind === 'ammo') for (const w of p.owned) if (w !== 'fists') p.ammo[w] += w === 'shotgun' ? 12 : 40;
      if (it.kind === 'cash') this.game.state.money += 150 + Math.floor(Math.random() * 250);
      this.game.hud.toast(`Picked up <b>${KINDS[it.kind].label}</b>`);
      emit('sound', { name: it.kind === 'cash' ? 'cash' : 'checkpoint' });
    }
  }
}
