// Low-poly people built from five vertex-coloured meshes (body, two arms, two legs) so a crowd
// stays cheap. Poses: idle, walk, run, aim, drive, flee (hands up) and dead.

import * as THREE from 'three';
import { MeshBatch, tint } from '../core/meshBatch.js';

const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75 });
const SKIN = ['#f1c7a5', '#d9a07a', '#b97a55', '#8d5a3b', '#5e3a26', '#f6d9c0'];
const SHIRTS = ['#ff6b5a', '#19c3b4', '#ffd23f', '#ffffff', '#ff8fb1', '#5b7cff', '#7bd389', '#f4a259', '#2b2d42', '#e9e4da'];
const PANTS = ['#2f3e46', '#d9c9a3', '#3d5a80', '#f1f1f1', '#6d597a', '#264653', '#c9ada7'];
const HAIR = ['#1d1a17', '#4a2c1a', '#a06a3b', '#e8cf8f', '#7a7a7a', '#2b1b12'];

export function randomOutfit(rng) {
  return {
    skin: rng.pick(SKIN), shirt: rng.pick(SHIRTS), pants: rng.pick(PANTS), hair: rng.pick(HAIR),
    shorts: rng.chance(0.55), hat: rng.chance(0.25) ? rng.pick(['cap', 'sunhat']) : null,
    shades: rng.chance(0.35), shoes: rng.pick(['#222', '#f5f5f5', '#8b5a2b']), build: rng.range(0.92, 1.1),
  };
}

function limb(parts, w, h, d, colors) {
  // colors: array of [fromFraction, toFraction, color] down the limb (0 = joint)
  const b = new MeshBatch();
  for (const [a, z, c] of colors) b.orientedBox(0, -h * (a + z) / 2, 0, w, h * (z - a), d, 0, tint(c));
  const m = new THREE.Mesh(b.toGeometry(), mat);
  m.castShadow = true;
  return m;
}

export function buildHuman(o) {
  const root = new THREE.Group();
  const hips = new THREE.Group();
  hips.position.y = 0.95;
  root.add(hips);
  const body = new MeshBatch();
  body.orientedBox(0, 0.34, 0, 0.46, 0.62, 0.26, 0, tint(o.shirt));       // torso
  body.orientedBox(0, 0.02, 0, 0.42, 0.12, 0.24, 0, tint(o.pants));       // belt line
  body.orientedBox(0, 0.72, 0, 0.12, 0.1, 0.12, 0, tint(o.skin));         // neck
  body.orientedBox(0, 0.9, 0, 0.26, 0.28, 0.27, 0, tint(o.skin));         // head
  body.orientedBox(0, 1.05, 0.02, 0.28, 0.08, 0.29, 0, tint(o.hair));     // hair top
  body.orientedBox(0, 0.95, 0.12, 0.28, 0.2, 0.06, 0, tint(o.hair));      // hair back
  if (o.shades) body.orientedBox(0, 0.93, -0.14, 0.27, 0.06, 0.03, 0, tint('#111'));
  if (o.hat === 'cap') { body.orientedBox(0, 1.1, 0, 0.3, 0.08, 0.3, 0, tint(o.hatColor || o.shirt)); body.orientedBox(0, 1.08, -0.2, 0.26, 0.03, 0.16, 0, tint(o.hatColor || o.shirt)); }
  if (o.hat === 'sunhat') { body.orientedBox(0, 1.08, 0, 0.56, 0.03, 0.56, 0, tint('#e9d8a6')); body.orientedBox(0, 1.13, 0, 0.3, 0.1, 0.3, 0, tint('#e9d8a6')); }
  if (o.hat === 'police') { body.orientedBox(0, 1.1, 0, 0.31, 0.1, 0.31, 0, tint('#132a4a')); body.orientedBox(0, 1.08, -0.19, 0.3, 0.03, 0.14, 0, tint('#111')); }
  if (o.badge) body.orientedBox(-0.12, 0.5, -0.135, 0.07, 0.08, 0.01, 0, tint('#ffd24a'));
  if (o.vest) body.orientedBox(0, 0.36, 0, 0.48, 0.44, 0.28, 0, tint(o.vest));
  const torso = new THREE.Mesh(body.toGeometry(), mat);
  torso.castShadow = true;
  hips.add(torso);

  const sleeve = o.longSleeves ? o.shirt : o.skin;
  const arms = [-1, 1].map((s) => {
    const pivot = new THREE.Group();
    pivot.position.set(s * 0.3, 0.6, 0);
    pivot.add(limb(null, 0.13, 0.66, 0.13, [[0, 0.3, o.shirt], [0.3, 0.88, sleeve], [0.88, 1, o.skin]]));
    hips.add(pivot);
    return pivot;
  });
  const legTop = o.shorts ? 0.45 : 0.92;
  const legs = [-1, 1].map((s) => {
    const pivot = new THREE.Group();
    pivot.position.set(s * 0.12, 0, 0);
    pivot.add(limb(null, 0.17, 0.92, 0.18, [[0, legTop, o.pants], [legTop, 0.92, o.skin], [0.92, 1, o.shoes]]));
    hips.add(pivot);
    return pivot;
  });
  // held weapon (hidden until armed)
  // the barrel runs along the arm so it points wherever the arm aims
  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.38, 0.13), new THREE.MeshStandardMaterial({ color: '#1c1c1f', metalness: 0.6, roughness: 0.4 }));
  gun.position.set(0, -0.78, -0.04);
  gun.visible = false;
  arms[1].add(gun);
  root.scale.setScalar(o.build || 1);
  root.userData = { hips, torso, arms, legs, gun, phase: (o.build || 1) * 37 % 6 };
  return root;
}

// Pose the rig. state: 'idle' | 'walk' | 'run' | 'aim' | 'drive' | 'flee' | 'dead' | 'jump'
export function poseHuman(rig, state, speed, dt, aimPitch = 0) {
  const u = rig.userData;
  u.phase += dt * (state === 'run' || state === 'flee' ? 11 : 7) * Math.min(1.4, 0.4 + speed * 0.3);
  const swing = state === 'walk' ? 0.55 : state === 'run' || state === 'flee' ? 0.95 : 0;
  const s = Math.sin(u.phase) * swing;
  rig.rotation.x = 0;
  u.hips.position.y = 0.95 + (swing ? Math.abs(Math.cos(u.phase)) * 0.05 * swing : 0);
  u.hips.rotation.set(0, 0, 0);
  u.legs[0].rotation.set(s, 0, 0);
  u.legs[1].rotation.set(-s, 0, 0);
  // positive X swings a limb forward (toward -Z, the way the body faces)
  u.arms[0].rotation.set(-s * 0.8, 0, -0.08);
  u.arms[1].rotation.set(s * 0.8, 0, 0.08);
  if (state === 'aim') {
    // aimPitch: camera pitch, negative when aiming down
    u.arms[1].rotation.set(Math.PI / 2 + aimPitch, 0, -0.06);
    u.arms[0].rotation.set(Math.PI / 2.15 + aimPitch, 0, 0.62);
  }
  if (state === 'flee') {
    u.arms[0].rotation.set(2.9, 0, -0.25);
    u.arms[1].rotation.set(2.9, 0, 0.25);
  }
  if (state === 'drive') {
    u.legs[0].rotation.set(1.45, 0, 0);
    u.legs[1].rotation.set(1.45, 0, 0);
    u.arms[0].rotation.set(1.1, 0, 0.2);
    u.arms[1].rotation.set(1.1, 0, -0.2);
    u.hips.position.y = 0.55;
  }
  if (state === 'jump') {
    u.legs[0].rotation.set(0.7, 0, 0);
    u.legs[1].rotation.set(-0.3, 0, 0);
    u.arms[0].rotation.set(0.5, 0, -0.6);
    u.arms[1].rotation.set(0.5, 0, 0.6);
  }
  if (state === 'dead') {
    rig.rotation.x = -Math.PI / 2;
    u.hips.position.y = 0.15;
    u.arms[0].rotation.set(2.6, 0, -0.6);
    u.arms[1].rotation.set(0.3, 0, 0.9);
    u.legs[0].rotation.set(0.2, 0, -0.15);
  }
}
