// World markers: glowing light columns for objectives and contacts, ground rings, bobbing
// chevrons, and checkpoint gates for races.

import * as THREE from 'three';
import { groundHeight } from '../world/groundHeight.js';
import { disposeTree } from '../core/disposeTree.js';

let beamTex = null;
function beamTexture() {
  if (beamTex) return beamTex;
  const c = document.createElement('canvas');
  c.width = 4; c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0, 'rgba(255,255,255,0)');
  grad.addColorStop(0.7, 'rgba(255,255,255,0.55)');
  grad.addColorStop(1, 'rgba(255,255,255,0.95)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 4, 128);
  beamTex = new THREE.CanvasTexture(c);
  beamTex.userData.shared = true; // every marker uses it: never freed with one of them
  return beamTex;
}

export class Marker {
  constructor(scene, x, z, { color = '#ffd23f', radius = 2.2, height = 7, chevron = true } = {}) {
    this.scene = scene;
    this.group = new THREE.Group();
    const y = Math.max(groundHeight(x, z), -0.5); // on the water, markers float at the surface
    this.group.position.set(x, y + 0.05, z);
    const beamMat = new THREE.MeshBasicMaterial({ color, map: beamTexture(), transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, toneMapped: false });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 28, 1, true), beamMat);
    beam.position.y = height / 2;
    const ring = new THREE.Mesh(new THREE.RingGeometry(radius * 0.82, radius, 40), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, side: THREE.DoubleSide, toneMapped: false }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.06;
    this.group.add(beam, ring);
    if (chevron) {
      const shape = new THREE.Shape();
      shape.moveTo(-0.7, 0.5); shape.lineTo(0, -0.4); shape.lineTo(0.7, 0.5); shape.lineTo(0.4, 0.5); shape.lineTo(0, 0.05); shape.lineTo(-0.4, 0.5);
      const chev = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.2, bevelEnabled: false }), new THREE.MeshBasicMaterial({ color, toneMapped: false }));
      chev.position.y = height * 0.45;
      this.chev = chev;
      this.group.add(chev);
    }
    this.x = x; this.z = z; this.radius = radius;
    scene.add(this.group);
  }

  update(time) {
    if (this.chev) { this.chev.position.y = 3 + Math.sin(time * 3) * 0.35; this.chev.rotation.y = time * 1.5; }
  }

  dispose() { this.scene.remove(this.group); disposeTree(this.group); }
}

// Race checkpoint: a tall gate of two posts and a banner.
export function checkpointMarker(scene, x, z) {
  return new Marker(scene, x, z, { color: '#ff6b5a', radius: 6, height: 14, chevron: true });
}
