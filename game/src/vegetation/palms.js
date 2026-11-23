// Instanced palm trees: a curved ringed trunk and a crown of drooping, serrated fronds.
// One draw call for every trunk and one for every crown on the island.

import * as THREE from 'three';
import { canvasTexture } from '../core/canvasTexture.js';
import { addCollider } from '../world/collisionWorld.js';
import { createRng } from '../core/rng.js';

const BASE_H = 10;
const BEND = 1.4;

function trunkGeometry() {
  const geo = new THREE.CylinderGeometry(0.16, 0.3, BASE_H, 7, 12, true);
  geo.translate(0, BASE_H / 2, 0);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i) / BASE_H;
    p.setX(i, p.getX(i) + BEND * y * y);
  }
  geo.computeVertexNormals();
  return geo;
}

function trunkTexture() {
  return canvasTexture(64, 256, (g, w, h, rng) => {
    g.fillStyle = '#9a7b58';
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 10) {
      g.fillStyle = 'rgba(70,50,30,0.6)';
      g.fillRect(0, y, w, 3);
      g.fillStyle = `rgba(200,170,130,${rng.range(0.1, 0.3)})`;
      g.fillRect(0, y + 4, w, 4);
    }
  }, { seed: 51 });
}

function frondTexture() {
  return canvasTexture(128, 256, (g, w, h, rng) => {
    g.clearRect(0, 0, w, h);
    // central rib with leaflets fanning out both sides
    for (let y = 8; y < h - 4; y += 5) {
      const t = y / h;
      const len = Math.sin(t * Math.PI) * 58 + 6;
      const shade = rng.range(-14, 14);
      g.strokeStyle = `rgb(${58 + shade},${128 + shade},${46 + shade})`;
      g.lineWidth = 4;
      g.beginPath(); g.moveTo(w / 2, y); g.lineTo(w / 2 - len, y + 14); g.stroke();
      g.strokeStyle = `rgb(${48 + shade},${112 + shade},${40 + shade})`;
      g.beginPath(); g.moveTo(w / 2, y); g.lineTo(w / 2 + len, y + 14); g.stroke();
    }
    g.strokeStyle = '#c9b77a';
    g.lineWidth = 3;
    g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.stroke();
  }, { seed: 52, repeat: false });
}

function crownGeometry() {
  const positions = [], uvs = [], normals = [], index = [];
  const leaves = 9, segs = 6, len = 4.6, width = 1.5;
  for (let l = 0; l < leaves; l++) {
    const a = (l / leaves) * Math.PI * 2 + (l % 2) * 0.2;
    const dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    const side = new THREE.Vector3(-dir.z, 0, dir.x);
    const rise = l % 3 === 0 ? 0.55 : 0.25;
    const base = positions.length / 3;
    for (let s = 0; s <= segs; s++) {
      const t = s / segs;
      const r = t * len;
      const y = rise * len * t - 1.9 * t * t * len * 0.35;
      for (const k of [-1, 1]) {
        const p = dir.clone().multiplyScalar(r).addScaledVector(side, k * width * 0.5 * (1 - t * 0.3));
        positions.push(p.x, y - Math.abs(k) * 0.12 * t, p.z);
        normals.push(0, 1, 0);
        uvs.push(k < 0 ? 0 : 1, 1 - t);
      }
    }
    for (let s = 0; s < segs; s++) {
      const i0 = base + s * 2;
      index.push(i0, i0 + 1, i0 + 3, i0, i0 + 3, i0 + 2);
    }
  }
  // coconut cluster
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(index);
  return geo;
}

export function buildPalms(palms, group) {
  if (!palms.length) return;
  const rng = createRng(77);
  const trunkMat = new THREE.MeshStandardMaterial({ map: trunkTexture(), roughness: 0.95 });
  const crownMat = new THREE.MeshStandardMaterial({ map: frondTexture(), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.8 });
  const trunks = new THREE.InstancedMesh(trunkGeometry(), trunkMat, palms.length);
  const crowns = new THREE.InstancedMesh(crownGeometry(), crownMat, palms.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  palms.forEach((p, k) => {
    const s = p.h / BASE_H;
    const yaw = rng.range(0, Math.PI * 2);
    q.setFromAxisAngle(up, yaw);
    const y = p.y ?? 0.18;
    m.compose(new THREE.Vector3(p.x, y, p.z), q, new THREE.Vector3(s, s, s));
    trunks.setMatrixAt(k, m);
    const top = new THREE.Vector3(BEND * s, p.h, 0).applyQuaternion(q);
    const cq = new THREE.Quaternion().setFromAxisAngle(up, rng.range(0, 6.28));
    const cs = s * rng.range(0.9, 1.15);
    m.compose(new THREE.Vector3(p.x + top.x, y + top.y, p.z + top.z), cq, new THREE.Vector3(cs, cs, cs));
    crowns.setMatrixAt(k, m);
    const tint = new THREE.Color().setHSL(0.2 + rng.range(-0.04, 0.04), 0.4, rng.range(0.78, 0.92));
    crowns.setColorAt(k, tint);
    addCollider(p.x - 0.3, p.z - 0.3, p.x + 0.3, p.z + 0.3, y + p.h, -5, 'palm');
  });
  trunks.castShadow = crowns.castShadow = true;
  trunks.receiveShadow = true;
  group.add(trunks, crowns);
}
