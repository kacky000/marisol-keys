// Seagulls wheeling over the beach and the harbor: flapping V-shaped birds on lazy circles.

import * as THREE from 'three';
import { createRng } from '../core/rng.js';

const B = 64;
// flock centres: Sunwake Beach, the pier, the harbor basin
const FLOCKS = [[12 * B + 40, 9 * B, 7], [13 * B + 20, 7 * B + 32, 5], [4 * B, 14 * B + 10, 6], [12 * B + 30, 4 * B, 4]];

function birdGeometry() {
  // two wing quads hinged at the body; the vertex shader-free approach: wings are separate meshes
  const g = new THREE.BufferGeometry();
  const v = new Float32Array([0, 0, -0.25, 0, 0, 0.25, 1.1, 0.12, 0.05]);
  g.setAttribute('position', new THREE.BufferAttribute(v, 3));
  g.computeVertexNormals();
  return g;
}

export class Seagulls {
  constructor(scene) {
    const rng = createRng(808);
    const mat = new THREE.MeshStandardMaterial({ color: '#f4f4f2', side: THREE.DoubleSide, roughness: 0.8 });
    const wing = birdGeometry();
    this.birds = [];
    for (const [cx, cz, n] of FLOCKS) {
      for (let k = 0; k < n; k++) {
        const bird = new THREE.Group();
        const left = new THREE.Mesh(wing, mat), right = new THREE.Mesh(wing, mat);
        right.scale.x = -1;
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 0.55), new THREE.MeshStandardMaterial({ color: '#dcdcdc' }));
        bird.add(left, right, body);
        bird.scale.setScalar(rng.range(0.9, 1.3));
        scene.add(bird);
        this.birds.push({ bird, left, right, cx, cz, r: rng.range(10, 32), h: rng.range(9, 22), speed: rng.range(0.15, 0.3) * (rng.chance(0.5) ? 1 : -1), phase: rng.range(0, 6.28), flap: rng.range(5, 8) });
      }
    }
  }

  update(time) {
    for (const b of this.birds) {
      const a = b.phase + time * b.speed;
      const x = b.cx + Math.cos(a) * b.r, z = b.cz + Math.sin(a) * b.r;
      b.bird.position.set(x, b.h + Math.sin(time * 0.7 + b.phase) * 1.5, z);
      b.bird.rotation.y = -a - (b.speed > 0 ? 0 : Math.PI);
      b.bird.rotation.z = (b.speed > 0 ? -1 : 1) * 0.25; // banking into the turn
      const flap = Math.sin(time * b.flap + b.phase) * 0.6;
      b.left.rotation.z = flap;
      b.right.rotation.z = -flap;
    }
  }
}
