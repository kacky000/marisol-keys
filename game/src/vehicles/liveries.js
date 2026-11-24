// Service liveries painted onto a car body after its basic shape is built: MKPD navy doors,
// push bar, light bar and decals; Keys Cab roof sign and checker band; the courier van stripe;
// the Sunwake Medical patient box with red crosses; KFD Engine 7's lockers and roof ladder.

import * as THREE from 'three';
import { tint } from '../core/meshBatch.js';
import { canvasTexture } from '../core/canvasTexture.js';
import { markShared } from '../core/disposeTree.js';

const redLight = new THREE.MeshBasicMaterial({ color: new THREE.Color(7, 0.35, 0.3) });
const blueLight = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, 0.9, 8) });
const whiteLight = new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 6, 5.5) });
markShared(redLight, blueLight, whiteLight);

let decalTex = null, decalMat = null;
function policeDecalMaterial() {
  decalMat ??= markShared(new THREE.MeshBasicMaterial({ map: markShared(policeDecal()) }));
  return decalMat;
}
function policeDecal() {
  decalTex ??= canvasTexture(256, 64, (g, w, h) => {
    g.fillStyle = '#132a4a'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ff7a59'; g.fillRect(0, h - 12, w, 7);
    g.fillStyle = '#ffffff'; g.font = '900 34px "Arial Black", Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('MKPD', w / 2 - 30, h / 2 - 4);
    g.font = '700 14px Arial';
    g.fillText('MARISOL KEYS', w / 2 + 70, h / 2 - 2);
  }, { repeat: false, seed: 61 });
  return decalTex;
}

// Two flashing lamps on a black bar; the vehicle alternates them when its siren is on.
function lightBar(c, y, z, width, lampW, left, right) {
  c.body.orientedBox(0, y - 0.07, z, width, 0.08, 0.3, 0, c.black);
  const a = new THREE.Mesh(new THREE.BoxGeometry(lampW, 0.14, 0.27), left);
  const b = new THREE.Mesh(new THREE.BoxGeometry(lampW, 0.14, 0.27), right);
  a.position.set(-width / 4, y, z); b.position.set(width / 4, y, z);
  c.group.add(a, b);
  c.lightbar.push(a, b);
}

// A tall box behind the cab (ambulance, fire engine). orientedBox takes the centre height.
function rearBox(c, spec, top) {
  const boxFront = -spec.cabin.back, boxLen = c.L / 2 - boxFront;
  const box = { front: boxFront, len: boxLen, z: boxFront + boxLen / 2, top };
  c.body.orientedBox(0, (c.belt - 0.1 + top) / 2, box.z, c.W, top - c.belt + 0.1, boxLen, 0, c.paint);
  return box;
}

const roofMid = (cab) => (-cab.front + cab.slopeF - cab.back - cab.slopeB) / 2;

// c: { body, glow, group, lightbar, W, L, belt, clearance, sideH, paint, black, dark, chrome }
export function applyLivery(type, spec, c) {
  const { body, W, L, belt } = c;
  if (spec.police) {
    for (const s of [-1, 1]) body.orientedBox(s * (W / 2 + 0.006), c.clearance + c.sideH * 0.45, 0.05, 0.01, c.sideH * 0.8, L * 0.46, 0, tint('#132a4a'));
    body.orientedBox(0, c.clearance + 0.35, -L / 2 - 0.2, W * 0.7, 0.4, 0.1, 0, c.black); // push bar
    lightBar(c, spec.cabin.top + 0.1, roofMid(spec.cabin), 1.5, 0.66, redLight, blueLight);
    const decal = policeDecalMaterial();
    for (const s of [-1, 1]) {
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.48), decal);
      plane.position.set(s * (W / 2 + 0.02), c.clearance + c.sideH * 0.5, 0.05);
      plane.rotation.y = s * Math.PI / 2;
      c.group.add(plane);
    }
  }
  if (spec.taxiSign) {
    c.glow.orientedBox(0, spec.cabin.top + 0.16, roofMid(spec.cabin), 0.95, 0.28, 0.32, 0, tint('#fff2a0'));
    for (const s of [-1, 1]) for (let k = 0; k < 10; k++) {
      body.orientedBox(s * (W / 2 + 0.005), belt - 0.08, -L * 0.35 + k * L * 0.07, 0.01, 0.12, L * 0.035, 0, k % 2 ? tint('#111') : tint('#fafafa'));
    }
  }
  if (type === 'van') {
    for (const s of [-1, 1]) body.orientedBox(s * (W / 2 + 0.005), spec.height * 0.55, 0.6, 0.01, 0.5, 2.4, 0, tint('#ff6b35'));
  }
  if (spec.firetruck) {
    // equipment body with roller lockers, a ladder on the roof rack, a white band
    const white = tint('#f2efe8'), locker = tint('#9a1a20');
    const box = rearBox(c, spec, spec.height * 0.86);
    for (const s of [-1, 1]) {
      body.orientedBox(s * (W / 2 + 0.005), belt - 0.05, 0, 0.01, 0.16, L * 0.96, 0, white);
      for (let k = 0; k < 3; k++) body.orientedBox(s * (W / 2 + 0.008), (belt + box.top) / 2 + 0.05, box.front + k * (box.len / 3) + box.len / 6, 0.01, box.top - belt - 0.35, box.len / 3 - 0.25, 0, locker);
    }
    for (const s of [-1, 1]) body.orientedBox(s * 0.55, box.top + 0.32, box.z - 0.3, 0.08, 0.08, box.len + 1.6, 0, c.chrome); // ladder rails
    for (let k = 0; k < 12; k++) body.orientedBox(0, box.top + 0.32, box.front - 0.8 + k * ((box.len + 1.2) / 11), 1.1, 0.05, 0.06, 0, c.chrome); // rungs
    for (const z of [box.front + 0.3, L / 2 - 0.4]) body.orientedBox(0, box.top + 0.14, z, 1.4, 0.28, 0.12, 0, c.dark); // rack posts
    body.orientedBox(0, belt - 0.3, -L / 2 - 0.12, W * 0.8, 0.2, 0.14, 0, c.chrome); // front bumper
    lightBar(c, spec.cabin.top + 0.1, -spec.cabin.front + spec.cabin.slopeF + 0.25, 1.9, 0.8, redLight, whiteLight);
  }
  if (spec.ambulance) {
    // the patient box, coral band, red crosses on its sides and roof, rear doors
    const coral = tint('#ff5a4e'), cross = tint('#e0262b');
    const box = rearBox(c, spec, spec.height);
    body.orientedBox(0, box.top + 0.03, box.z, W - 0.2, 0.06, box.len - 0.2, 0, c.chrome);
    for (const s of [-1, 1]) {
      body.orientedBox(s * (W / 2 + 0.005), belt - 0.05, 0.2, 0.01, 0.22, L * 0.95, 0, coral);
      body.orientedBox(s * (W / 2 + 0.008), belt + 0.55, box.z, 0.01, 0.8, 0.26, 0, cross);
      body.orientedBox(s * (W / 2 + 0.008), belt + 0.55, box.z, 0.01, 0.26, 0.8, 0, cross);
    }
    body.orientedBox(0, box.top + 0.07, box.z, 1.1, 0.02, 0.34, 0, cross);
    body.orientedBox(0, box.top + 0.07, box.z, 0.34, 0.02, 1.1, 0, cross);
    for (const s of [-1, 1]) body.orientedBox(s * 0.5, (belt + box.top) / 2, L / 2 + 0.005, 0.85, box.top - belt - 0.2, 0.01, 0, c.dark);
    lightBar(c, spec.cabin.top + 0.1, -spec.cabin.front + spec.cabin.slopeF + 0.2, 1.7, 0.7, redLight, redLight);
  }
}
