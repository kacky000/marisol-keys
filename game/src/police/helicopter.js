// MKPD Air Unit: a police helicopter with spinning rotors, a sweeping searchlight cone, and a
// spotter who opens fire at five stars.

import * as THREE from 'three';
import { MeshBatch, tint } from '../core/meshBatch.js';

export function buildHelicopterMesh() {
  const g = new THREE.Group();
  const b = new MeshBatch();
  const navy = tint('#132a4a'), white = tint('#f2f2f2'), glass = tint('#2b4d6b'), coral = tint('#ff7a59');
  b.orientedBox(0, 0, 0, 2.2, 2.0, 4.6, 0, navy);
  b.orientedBox(0, 0.15, -2.5, 2.0, 1.6, 1.2, 0, glass);
  b.orientedBox(0, -0.35, 0, 2.25, 0.35, 4.4, 0, white);
  b.orientedBox(0, -0.1, 0, 2.26, 0.12, 4.5, 0, coral);
  b.orientedBox(0, 0.5, 4.6, 0.5, 0.5, 5.4, 0, navy);
  b.orientedBox(0, 1.3, 7.1, 0.12, 1.8, 0.9, 0, navy);
  b.orientedBox(0, 1.1, 0, 0.6, 0.5, 0.6, 0, tint('#222'));
  for (const s of [-1, 1]) {
    b.orientedBox(s * 1.2, -1.35, 0, 0.12, 0.12, 4.2, 0, tint('#333'));
    b.orientedBox(s * 1.1, -1.05, -1, 0.1, 0.6, 0.1, 0, tint('#333'));
    b.orientedBox(s * 1.1, -1.05, 1, 0.1, 0.6, 0.1, 0, tint('#333'));
  }
  const body = b.toMesh(new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.4, roughness: 0.4 }));
  g.add(body);
  const rotorMat = new THREE.MeshStandardMaterial({ color: '#1a1a1a', transparent: true, opacity: 0.75 });
  const rotor = new THREE.Group();
  for (let k = 0; k < 4; k++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.05, 11), rotorMat);
    blade.rotation.y = (k * Math.PI) / 4;
    rotor.add(blade);
  }
  rotor.position.y = 1.4;
  g.add(rotor);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.2, 0.25), rotorMat);
  tail.position.set(0.3, 1.3, 7.2);
  g.add(tail);
  // searchlight cone
  const coneGeo = new THREE.ConeGeometry(3.2, 34, 20, 1, true);
  coneGeo.translate(0, -17, 0);
  const cone = new THREE.Mesh(coneGeo, new THREE.MeshBasicMaterial({ color: '#fff6d0', transparent: true, opacity: 0.05, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
  cone.position.set(0, -1, -2);
  g.add(cone);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), new THREE.MeshBasicMaterial({ color: '#ff2020' }));
  beacon.position.set(0, -0.6, 2.2);
  g.add(beacon);
  g.userData = { rotor, tail, cone, beacon };
  return g;
}

export class Helicopter {
  constructor(scene, x, z) {
    this.mesh = buildHelicopterMesh();
    this.pos = new THREE.Vector3(x, 45, z);
    this.angle = 0;
    this.heading = 0;
    this.cooldown = 3;
    scene.add(this.mesh);
    this.scene = scene;
  }

  update(dt, time, target, stars, shoot) {
    this.angle += dt * 0.35;
    const radius = 34;
    const tx = target.pos.x + Math.cos(this.angle) * radius, tz = target.pos.z + Math.sin(this.angle) * radius;
    this.pos.x += (tx - this.pos.x) * Math.min(1, dt * 0.8);
    this.pos.z += (tz - this.pos.z) * Math.min(1, dt * 0.8);
    this.pos.y += (38 - this.pos.y) * Math.min(1, dt * 0.5);
    this.heading = Math.atan2(target.pos.x - this.pos.x, -(target.pos.z - this.pos.z));
    const m = this.mesh;
    m.position.copy(this.pos);
    m.rotation.set(0, -this.heading, 0);
    m.rotateX(-0.12);
    m.userData.rotor.rotation.y = time * 28;
    m.userData.tail.rotation.x = time * 40;
    m.userData.beacon.visible = Math.floor(time * 2) % 2 === 0;
    // point the searchlight at the suspect
    const cone = m.userData.cone;
    cone.visible = !!this.night;
    const local = m.worldToLocal(new THREE.Vector3(target.pos.x, target.pos.y, target.pos.z));
    cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), local.sub(cone.position).normalize());
    if (stars >= 5) {
      this.cooldown -= dt;
      if (this.cooldown <= 0) { this.cooldown = 1.6; shoot(this); }
    }
  }

  dispose() { this.scene.remove(this.mesh); }
}
