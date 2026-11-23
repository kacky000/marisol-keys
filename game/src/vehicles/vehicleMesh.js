// Procedural vehicle models: painted lower body, sloped glass cabin, bumpers, lights, wheels that
// steer and spin, plus police light bars, taxi roof signs, bus window bands and the motorbike.

import * as THREE from 'three';
import { MeshBatch, tint } from '../core/meshBatch.js';
import { canvasTexture } from '../core/canvasTexture.js';

const bodyMat = new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.45, roughness: 0.32, side: THREE.DoubleSide });
const glowMat = new THREE.MeshStandardMaterial({ vertexColors: true, emissive: '#ffffff', emissiveIntensity: 1.2, roughness: 0.3 });
glowMat.onBeforeCompile = (s) => { s.fragmentShader = s.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance *= diffuseColor.rgb;'); };
const tireMat = new THREE.MeshStandardMaterial({ color: '#1b1b1d', roughness: 0.9 });
const rimMat = new THREE.MeshStandardMaterial({ color: '#cfd3d8', metalness: 0.8, roughness: 0.3 });
const redLight = new THREE.MeshBasicMaterial({ color: '#ff2a2a' });
const blueLight = new THREE.MeshBasicMaterial({ color: '#2a6bff' });
const GLASS = '#1d2b38';

let decalTex = null;
function policeDecal() {
  decalTex ??= canvasTexture(256, 64, (g, w, h) => {
    g.fillStyle = '#132a4a'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ff7a59'; g.fillRect(0, h - 10, w, 6);
    g.fillStyle = '#ffffff'; g.font = '900 36px "Arial Black", Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('MKPD', w / 2, h / 2 - 4);
  }, { repeat: false, seed: 61 });
  return decalTex;
}

// Cabin prism with slanted windshield and rear glass.
function cabin(batch, W, beltY, c, paint) {
  const zf = -c.front, zb = -c.back;
  const tf = zf + c.slopeF, tb = zb - c.slopeB;
  const hw = W / 2, tw = W * 0.42;
  const glass = tint(GLASS), roof = tint(paint);
  const P = (x, y, z) => [x, y, z];
  // windshield
  batch.quad(P(-hw, beltY, zf), P(hw, beltY, zf), P(tw, c.top, tf), P(-tw, c.top, tf), [0, 0.6, -0.8], [[0, 0], [1, 0], [1, 1], [0, 1]], glass);
  // rear glass
  batch.quad(P(hw, beltY, zb), P(-hw, beltY, zb), P(-tw, c.top, tb), P(tw, c.top, tb), [0, 0.6, 0.8], [[0, 0], [1, 0], [1, 1], [0, 1]], glass);
  // roof
  batch.quad(P(-tw, c.top, tb), P(tw, c.top, tb), P(tw, c.top, tf), P(-tw, c.top, tf), [0, 1, 0], [[0, 0], [1, 0], [1, 1], [0, 1]], roof);
  // sides (glass with a painted roof rail)
  batch.quad(P(hw, beltY, zb), P(hw, beltY, zf), P(tw, c.top, tf), P(tw, c.top, tb), [1, 0.2, 0], [[0, 0], [1, 0], [1, 1], [0, 1]], glass);
  batch.quad(P(-hw, beltY, zf), P(-hw, beltY, zb), P(-tw, c.top, tb), P(-tw, c.top, tf), [-1, 0.2, 0], [[0, 0], [1, 0], [1, 1], [0, 1]], glass);
  // B-pillar
  const zm = (zf + zb) / 2;
  batch.orientedBox(hw - 0.02, (beltY + c.top) / 2, zm, 0.06, c.top - beltY, 0.18, 0, roof);
  batch.orientedBox(-hw + 0.02, (beltY + c.top) / 2, zm, 0.06, c.top - beltY, 0.18, 0, roof);
}

function wheel(r, w) {
  const g = new THREE.Group();
  const tire = new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, 14), tireMat);
  tire.rotation.z = Math.PI / 2;
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.6, r * 0.6, w + 0.02, 8), rimMat);
  rim.rotation.z = Math.PI / 2;
  const spin = new THREE.Group();
  spin.add(tire, rim);
  g.add(spin);
  tire.castShadow = true;
  g.userData.spin = spin;
  return g;
}

export function buildVehicleMesh(type, spec, paint) {
  const group = new THREE.Group();
  const body = new MeshBatch();
  const glow = new MeshBatch();
  const L = spec.len, W = spec.width;
  const paintC = tint(paint), dark = tint('#2a2c30'), chrome = tint('#c9ccd1');
  const wheels = [];
  const lightbar = [];

  if (spec.bike) {
    body.orientedBox(0, 0.75, 0, 0.35, 0.45, 1.3, 0, paintC);         // tank & frame
    body.orientedBox(0, 0.95, 0.35, 0.3, 0.12, 0.7, 0, dark);         // seat
    body.orientedBox(0, 1.1, -0.65, 0.75, 0.06, 0.06, 0, chrome);     // handlebar
    body.orientedBox(0, 0.85, -0.6, 0.08, 0.5, 0.08, 0, chrome);      // fork
    body.orientedBox(0, 0.55, 0.55, 0.2, 0.2, 0.6, 0, chrome);        // exhaust
    glow.orientedBox(0, 0.98, -0.78, 0.18, 0.14, 0.08, 0, tint('#fff6d0'));
    glow.orientedBox(0, 0.85, 0.82, 0.16, 0.08, 0.05, 0, tint('#ff2020'));
    for (const z of [-spec.wheelbase / 2, spec.wheelbase / 2]) {
      const wgrp = wheel(spec.wheelR, 0.16);
      wgrp.position.set(0, spec.wheelR, z);
      wgrp.userData.front = z < 0;
      wheels.push(wgrp);
      group.add(wgrp);
    }
  } else {
    const clearance = spec.wheelR * 0.75;
    const belt = spec.bus ? spec.height * 0.45 : spec.height * 0.62;
    if (spec.bus) {
      body.orientedBox(0, clearance + (spec.height - clearance) / 2, 0, W, spec.height - clearance, L, 0, paintC);
      body.orientedBox(0, belt + 0.9, 0, W + 0.04, 1.0, L - 0.6, 0, tint(GLASS));
      body.orientedBox(0, belt + 0.25, 0, W + 0.05, 0.2, L, 0, tint('#ffd23f'));
      body.orientedBox(0, spec.height - 0.05, 0, W - 0.3, 0.12, L - 1, 0, tint('#e8e8e8'));
      body.orientedBox(0, belt + 0.9, -L / 2 - 0.01, W - 0.3, 1.4, 0.05, 0, tint(GLASS));
      glow.orientedBox(0, spec.height - 0.35, -L / 2 - 0.03, 1.6, 0.3, 0.05, 0, tint('#ffb020'));
    } else {
      // lower body: main slab + slightly narrower top edge, front and rear bumpers
      body.orientedBox(0, clearance + (belt - clearance) / 2, 0, W, belt - clearance, L, 0, paintC);
      body.orientedBox(0, belt + 0.02, -L * 0.32, W * 0.94, 0.06, L * 0.3, 0, paintC); // hood crown
      body.orientedBox(0, clearance + 0.12, -L / 2 - 0.05, W + 0.04, 0.26, 0.16, 0, dark);
      body.orientedBox(0, clearance + 0.12, L / 2 + 0.05, W + 0.04, 0.26, 0.16, 0, dark);
      body.orientedBox(0, clearance + 0.25, -L / 2 - 0.02, W * 0.4, 0.18, 0.06, 0, tint('#111')); // grille
      cabin(body, W * 0.96, belt, spec.cabin, paint);
      if (spec.bed) {
        body.orientedBox(W / 2 - 0.06, belt + 0.25, spec.cabin.back * -1 + 1.0, 0.1, 0.5, 2.0, 0, paintC);
        body.orientedBox(-W / 2 + 0.06, belt + 0.25, spec.cabin.back * -1 + 1.0, 0.1, 0.5, 2.0, 0, paintC);
        body.orientedBox(0, belt + 0.25, L / 2 - 0.05, W, 0.5, 0.1, 0, paintC);
      }
      // mirrors
      for (const s of [-1, 1]) body.orientedBox(s * (W / 2 + 0.12), belt + 0.1, -spec.cabin.front + 0.15, 0.22, 0.14, 0.12, 0, paintC);
      // lights
      for (const s of [-1, 1]) {
        glow.orientedBox(s * (W / 2 - 0.3), belt - 0.15, -L / 2 - 0.01, 0.42, 0.16, 0.06, 0, tint('#fff4d6'));
        glow.orientedBox(s * (W / 2 - 0.3), belt - 0.12, L / 2 + 0.01, 0.42, 0.14, 0.06, 0, tint('#ff1a1a'));
      }
      if (spec.police) {
        for (const s of [-1, 1]) body.orientedBox(s * (W / 2 + 0.005), clearance + (belt - clearance) * 0.5, 0.1, 0.01, (belt - clearance) * 0.8, L * 0.5, 0, tint('#132a4a'));
        const r = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.16, 0.3), redLight);
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.16, 0.3), blueLight);
        const y = spec.cabin.top + 0.1, z = (-spec.cabin.front + spec.cabin.slopeF - spec.cabin.back - spec.cabin.slopeB) / 2;
        r.position.set(-0.32, y, z); b.position.set(0.32, y, z);
        group.add(r, b);
        lightbar.push(r, b);
        // door decals
        const decal = new THREE.MeshBasicMaterial({ map: policeDecal(), transparent: false });
        for (const s of [-1, 1]) {
          const plane = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.4), decal);
          plane.position.set(s * (W / 2 + 0.02), clearance + (belt - clearance) * 0.55, 0.1);
          plane.rotation.y = s * Math.PI / 2;
          group.add(plane);
        }
      }
      if (spec.taxiSign) {
        const z = (-spec.cabin.front + spec.cabin.slopeF - spec.cabin.back - spec.cabin.slopeB) / 2;
        glow.orientedBox(0, spec.cabin.top + 0.15, z, 0.9, 0.28, 0.3, 0, tint('#fff2a0'));
        for (const s of [-1, 1]) body.orientedBox(s * (W / 2 + 0.005), belt - 0.1, 0, 0.01, 0.14, L * 0.7, 0, tint('#222'));
      }
    }
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const wgrp = wheel(spec.wheelR, 0.28);
      wgrp.position.set(sx * (W / 2 - 0.12), spec.wheelR, sz * spec.wheelbase / 2);
      wgrp.userData.front = sz < 0;
      wheels.push(wgrp);
      group.add(wgrp);
    }
  }
  const bodyMesh = body.toMesh(bodyMat);
  const glowMesh = glow.toMesh(glowMat, { cast: false });
  group.add(bodyMesh, glowMesh);
  group.userData = { wheels, lightbar, body: bodyMesh };
  return group;
}
