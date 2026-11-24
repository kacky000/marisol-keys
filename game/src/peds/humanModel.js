// Low-poly people built from five vertex-coloured meshes (body, two arms, two legs) so a crowd
// stays cheap. Poses: idle, walk, run, aim, drive, flee (hands up) and dead.

import * as THREE from 'three';
import { MeshBatch, tint } from '../core/meshBatch.js';
import { markShared } from '../core/disposeTree.js';

const mat = markShared(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75 }));
const SKIN = ['#f1c7a5', '#d9a07a', '#b97a55', '#8d5a3b', '#5e3a26', '#f6d9c0'];
const SHIRTS = ['#ff6b5a', '#19c3b4', '#ffd23f', '#ffffff', '#ff8fb1', '#5b7cff', '#7bd389', '#f4a259', '#2b2d42', '#e9e4da'];
const PANTS = ['#2f3e46', '#d9c9a3', '#3d5a80', '#f1f1f1', '#6d597a', '#264653', '#c9ada7'];
const HAIR = ['#1d1a17', '#4a2c1a', '#a06a3b', '#e8cf8f', '#7a7a7a', '#2b1b12'];

const DRESSES = ['#ff6b5a', '#ffd23f', '#19c3b4', '#ff8fb1', '#ffffff', '#7a5cff', '#f4a259'];

export function randomOutfit(rng) {
  const feminine = rng.chance(0.5);
  return {
    skin: rng.pick(SKIN), shirt: rng.pick(SHIRTS), pants: rng.pick(PANTS), hair: rng.pick(HAIR),
    shorts: rng.chance(0.55), hat: rng.chance(0.25) ? rng.pick(['cap', 'sunhat']) : null,
    shades: rng.chance(0.35), shoes: rng.pick(['#222', '#f5f5f5', '#8b5a2b']), build: feminine ? rng.range(0.88, 0.98) : rng.range(0.96, 1.1),
    hairStyle: feminine ? rng.pick(['long', 'long', 'bun', 'bob']) : rng.pick(['short', 'short', 'bald', 'curly']),
    dress: feminine && rng.chance(0.45) ? rng.pick(DRESSES) : null,
    bag: rng.chance(0.2) ? rng.pick(['#8b5a2b', '#ff6b5a', '#2b2d42']) : null,
  };
}

function limb(parts, w, h, d, colors) {
  // colors: array of [fromFraction, toFraction, color] down the limb (0 = joint)
  // rounded limb: an eight-sided tube per colour band, tapering slightly toward the end
  const b = new MeshBatch();
  for (const [a, z, c] of colors) b.cylinder(0, -h * z, 0, (w + d) / 4 * (1 - a * 0.18), h * (z - a), tint(c), { segments: 8, ao: 1 });
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
  body.orientedBox(0, 0.47, 0, 0.5, 0.36, 0.27, 0, tint(o.shirt));        // chest and shoulders
  body.orientedBox(0, 0.2, 0, 0.41, 0.22, 0.24, 0, tint(o.shirt));        // waist
  body.cylinder(0.0, 0.62, 0.0, 0.17, 0.05, tint(o.shirt), { segments: 10, ao: 1 }); // collar
  body.orientedBox(0, 0.03, 0, 0.42, 0.12, 0.25, 0, tint(o.pants));       // belt line
  body.cylinder(0, 0.66, 0, 0.065, 0.12, tint(o.skin), { segments: 8, ao: 1 });       // neck
  body.cylinder(0, 0.76, 0, 0.14, 0.28, tint(o.skin), { segments: 12, ao: 1 });      // head
  body.orientedBox(0, 0.86, -0.135, 0.05, 0.07, 0.04, 0, tint(o.skin));               // nose
  // face: eyes with whites, brows and a mouth on the front of the head
  for (const s of [-1, 1]) {
    body.orientedBox(s * 0.055, 0.905, -0.133, 0.05, 0.035, 0.01, 0, tint('#f4f1ea'));
    body.orientedBox(s * 0.055, 0.905, -0.139, 0.025, 0.03, 0.01, 0, tint('#1d1712'));
    body.orientedBox(s * 0.055, 0.94, -0.134, 0.065, 0.016, 0.012, 0, tint(o.hair));
  }
  body.orientedBox(0, 0.815, -0.134, 0.06, 0.014, 0.012, 0, tint('#7a3b33'));
  const hs = o.hairStyle || 'short';
  if (hs !== 'bald') {
    body.cylinder(0, 0.98, 0.01, 0.152, hs === 'curly' ? 0.13 : 0.08, tint(o.hair), { segments: 12, ao: 1 });   // hair cap
    body.orientedBox(0, 0.92, 0.1, 0.29, 0.2, 0.1, 0, tint(o.hair));    // hair back
  }
  if (hs === 'long') { body.orientedBox(0, 0.72, 0.13, 0.3, 0.42, 0.07, 0, tint(o.hair)); body.orientedBox(0, 0.86, 0, 0.31, 0.22, 0.24, 0, tint(o.hair)); }
  if (hs === 'bob') body.orientedBox(0, 0.88, 0.02, 0.32, 0.22, 0.3, 0, tint(o.hair));
  if (hs === 'bun') body.orientedBox(0, 1.1, 0.12, 0.13, 0.13, 0.13, 0, tint(o.hair));
  if (o.headphones) { body.orientedBox(0, 1.1, 0, 0.32, 0.05, 0.08, 0, tint('#ff3f8e')); for (const s of [-1, 1]) body.orientedBox(s * 0.15, 0.93, 0, 0.06, 0.14, 0.12, 0, tint('#ff3f8e')); }
  if (o.beard) body.orientedBox(0, 0.8, -0.1, 0.26, 0.12, 0.09, 0, tint(o.beard));
  if (o.mustache) body.orientedBox(0, 0.85, -0.14, 0.14, 0.03, 0.02, 0, tint(o.mustache));
  if (o.dress) body.orientedBox(0, -0.1, 0, 0.5, 0.48, 0.32, 0, tint(o.dress));   // skirt over the hips
  if (o.bag) { body.orientedBox(0.27, 0.05, 0, 0.08, 0.3, 0.26, 0, tint(o.bag)); body.orientedBox(0.1, 0.45, 0, 0.36, 0.04, 0.27, 0.6, tint(o.bag)); }
  if (o.hat === 'bucket') { body.orientedBox(0, 1.08, 0, 0.42, 0.03, 0.42, 0, tint('#5b7c5a')); body.orientedBox(0, 1.14, 0, 0.3, 0.12, 0.3, 0, tint('#5b7c5a')); }
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
  const legTop = o.dress ? 0.3 : o.shorts ? 0.45 : 0.92;
  const legs = [-1, 1].map((s) => {
    const pivot = new THREE.Group();
    pivot.position.set(s * 0.12, 0, 0);
    pivot.add(limb(null, 0.17, 0.92, 0.18, [[0, legTop, o.dress || o.pants], [legTop, 0.92, o.skin], [0.92, 1, o.shoes]]));
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

// Pose the rig. state: 'idle' | 'walk' | 'run' | 'aim' | 'drive' | 'flee' | 'dead' | 'jump' | 'kneel' | 'sunbathe'
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
  if (state === 'kneel') {
    // kneeling on both shins (limbs have no knee joint, so the legs angle back from the hips),
    // hands working low in front: paramedics at a patient
    u.hips.position.y = 0.5;
    u.legs[0].rotation.set(-1.15, 0, -0.08);
    u.legs[1].rotation.set(-1.15, 0, 0.08);
    const work = Math.sin(u.phase * 1.6) * 0.15;
    u.arms[0].rotation.set(1.0 + work, 0, 0.15);
    u.arms[1].rotation.set(1.0 - work, 0, -0.15);
  }
  if (state === 'sunbathe') {
    rig.rotation.x = Math.PI / 2;
    u.hips.position.y = 0.16;
    u.arms[0].rotation.set(2.9, 0, -0.3);
    u.arms[1].rotation.set(0.2, 0, 0.35);
    u.legs[1].rotation.set(0.25, 0, 0);
  }
  if (state === 'dead') {
    rig.rotation.x = -Math.PI / 2;
    u.hips.position.y = 0.15;
    u.arms[0].rotation.set(2.6, 0, -0.6);
    u.arms[1].rotation.set(0.3, 0, 0.9);
    u.legs[0].rotation.set(0.2, 0, -0.15);
  }
}
