// MKPD Air Unit: a police helicopter with spinning rotors, a sweeping searchlight cone, and a
// spotter who opens fire at five stars.

import * as THREE from 'three';
import { MeshBatch, tint } from '../core/meshBatch.js';

export function buildHelicopterMesh() {
  const g = new THREE.Group();
  const paint = (c, metal = 0.35, rough = 0.35) => new THREE.MeshStandardMaterial({ color: c, metalness: metal, roughness: rough });
  const add = (geo, mat, x, y, z, rx = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.x = rx; m.castShadow = true; g.add(m); return m; };
  // rounded navy fuselage lying along Z, white belly, bubble cockpit, tapered tail boom
  const fuselage = add(new THREE.CapsuleGeometry(1.15, 2.6, 6, 14), paint('#16305a'), 0, 0, 0, Math.PI / 2);
  fuselage.scale.set(1, 1, 0.92);
  add(new THREE.CapsuleGeometry(1.0, 2.2, 4, 12), paint('#f2f2f2', 0.2, 0.4), 0, -0.45, 0.2, Math.PI / 2).scale.set(1.08, 1, 0.55);
  const glass = new THREE.MeshPhysicalMaterial({ color: '#9fd4ff', metalness: 0.1, roughness: 0.05, clearcoat: 1, transmission: 0, opacity: 0.95, transparent: true });
  add(new THREE.SphereGeometry(1.05, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62), glass, 0, 0.1, -1.85, -Math.PI / 2 + 0.25).scale.set(1, 1, 0.85);
  const boom = add(new THREE.CylinderGeometry(0.22, 0.5, 5.4, 10), paint('#16305a'), 0, 0.35, 4.4, Math.PI / 2);
  boom.rotation.x = Math.PI / 2 - 0.06;
  add(new THREE.BoxGeometry(0.12, 1.7, 1.0), paint('#16305a'), 0, 1.1, 6.9);
  add(new THREE.BoxGeometry(1.8, 0.1, 0.6), paint('#16305a'), 0, 0.45, 6.4);
  add(new THREE.CylinderGeometry(0.45, 0.6, 0.5, 10), paint('#2a2a2e'), 0, 1.25, 0);
  for (const s of [-1, 1]) {
    add(new THREE.CylinderGeometry(0.07, 0.07, 4.4, 6), paint('#2a2a2e'), s * 1.15, -1.45, 0, Math.PI / 2);
    for (const zz of [-1, 1]) add(new THREE.CylinderGeometry(0.06, 0.06, 0.8, 6), paint('#2a2a2e'), s * 1.05, -1.1, zz);
  }
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
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 0.4, 0.3) }));
  beacon.position.set(0, -0.6, 2.2);
  g.add(beacon);
  // navigation lights (red port, green starboard), a tail strobe and a lit livery stripe
  const lamp = (c, x, y, z, r = 0.16) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 6, 5), new THREE.MeshBasicMaterial({ color: c })); m.position.set(x, y, z); g.add(m); return m; };
  lamp(new THREE.Color(5, 0.3, 0.2), -1.2, -0.2, -0.6);
  lamp(new THREE.Color(0.3, 5, 0.6), 1.2, -0.2, -0.6);
  const strobe = lamp(new THREE.Color(6, 6, 6), 0, 2.2, 7.4, 0.2);
  for (const s of [-1, 1]) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.16, 4.2), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 0.7, 0.45) }));
    stripe.position.set(s * 1.15, -0.1, 0);
    g.add(stripe);
  }
  g.userData = { rotor, tail, cone, beacon, strobe };
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
    m.userData.strobe.visible = (time * 1.3) % 1 < 0.12;
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
