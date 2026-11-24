// Dogs on leads: a low-poly dog (body, head with snout and ears, four legs, a wagging tail)
// that trots a step behind and beside its owner, sits when the owner stops, and bolts with them.

import * as THREE from 'three';
import { MeshBatch, tint } from '../core/meshBatch.js';
import { markShared } from '../core/disposeTree.js';

const mat = markShared(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }));
const COATS = [['#c8a165', '#f1e3c8'], ['#3a2a20', '#7a5a40'], ['#f2efe8', '#d8cfc0'], ['#8a5a32', '#e8c89a'], ['#222222', '#c8a165']];
const LEAD = markShared(new THREE.LineBasicMaterial({ color: '#c0392b' }));

function part(build) {
  const b = new MeshBatch();
  build(b);
  const m = new THREE.Mesh(b.toGeometry(), mat);
  m.castShadow = true;
  return m;
}

export function buildDog(rng, size = 0.7 + rng.next() * 0.5) {
  const [coat, belly] = COATS[Math.floor(rng.next() * COATS.length)];
  const c = tint(coat), b = tint(belly), dark = tint('#1a1412');
  const root = new THREE.Group();
  const body = new THREE.Group();
  body.scale.setScalar(size);
  root.add(body);
  body.add(part((m) => {
    m.orientedBox(0, 0.42, 0, 0.26, 0.24, 0.62, 0, c);         // torso
    m.orientedBox(0, 0.34, 0, 0.2, 0.06, 0.5, 0, b);           // belly
    m.orientedBox(0, 0.56, -0.36, 0.2, 0.2, 0.22, 0, c);       // head
    m.orientedBox(0, 0.52, -0.5, 0.12, 0.1, 0.12, 0, b);       // snout
    m.orientedBox(0, 0.55, -0.565, 0.05, 0.04, 0.02, 0, dark); // nose
    for (const s of [-1, 1]) m.orientedBox(s * 0.08, 0.69, -0.33, 0.06, 0.1, 0.05, 0, dark); // ears
  }));
  const legs = [];
  for (const [x, z] of [[-0.08, -0.22], [0.08, -0.22], [-0.08, 0.22], [0.08, 0.22]]) {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.32, z);
    pivot.add(part((m) => m.orientedBox(0, -0.16, 0, 0.07, 0.32, 0.07, 0, c)));
    body.add(pivot);
    legs.push(pivot);
  }
  const tail = new THREE.Group();
  tail.position.set(0, 0.5, 0.31);
  tail.add(part((m) => m.orientedBox(0, 0.08, 0.06, 0.05, 0.05, 0.2, 0, c)));
  tail.rotation.x = -0.6;
  body.add(tail);
  root.userData = { legs, tail, body, phase: rng.next() * 6 };
  return root;
}

// speed in m/s; sitting when still.
export function poseDog(rig, speed, dt) {
  const u = rig.userData;
  u.phase += dt * (4 + speed * 3.2);
  const swing = Math.min(0.7, speed * 0.35);
  u.legs.forEach((leg, k) => { leg.rotation.x = Math.sin(u.phase + (k === 0 || k === 3 ? 0 : Math.PI)) * swing; });
  u.tail.rotation.y = Math.sin(u.phase * 2.2) * 0.5;
  const sit = speed < 0.2;
  u.body.rotation.x = sit ? -0.35 : 0;
  u.legs[2].rotation.x = sit ? -1.2 : u.legs[2].rotation.x;
  u.legs[3].rotation.x = sit ? -1.2 : u.legs[3].rotation.x;
}

// A taut red lead from the owner's hand to the dog's collar.
export function buildLead() {
  const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
  return new THREE.Line(geo, LEAD);
}

export function setLead(line, hand, collar) {
  const p = line.geometry.attributes.position;
  p.setXYZ(0, hand.x, hand.y, hand.z);
  p.setXYZ(1, collar.x, collar.y, collar.z);
  p.needsUpdate = true;
  line.geometry.computeBoundingSphere();
}
