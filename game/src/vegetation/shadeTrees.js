// Broadleaf sea-grape and poinciana shade trees, and rounded flowering shrubs: instanced
// low-poly canopies that break up the palms in parks, courtyards and villa gardens.

import * as THREE from 'three';
import { addCollider } from '../world/collisionWorld.js';
import { createRng } from '../core/rng.js';

// A lumpy canopy: three overlapping icosahedrons merged into one geometry.
function canopyGeometry() {
  const parts = [[0, 0, 0, 1], [0.7, -0.15, 0.3, 0.75], [-0.6, -0.1, -0.35, 0.8], [0.1, 0.45, -0.2, 0.7]];
  const pos = [], nrm = [];
  for (const [x, y, z, s] of parts) {
    const g = new THREE.IcosahedronGeometry(s, 1).toNonIndexed();
    g.computeVertexNormals();
    const p = g.attributes.position, n = g.attributes.normal;
    for (let i = 0; i < p.count; i++) {
      pos.push(p.getX(i) + x, p.getY(i) + y, p.getZ(i) + z);
      nrm.push(n.getX(i), n.getY(i), n.getZ(i));
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  return geo;
}

const LEAVES = ['#3f8a3c', '#4f9a3a', '#2f7a46', '#5aa04a'];
const BLOSSOM = ['#ff5d6c', '#ff8a3d', '#ff6fb1', '#ffd23f'];

// trees: [{ x, z, y, size, flowering }], shrubs: [{ x, z, y, size, flowering }]
export function buildShadeTrees(trees, shrubs, group) {
  const rng = createRng(606);
  const canopy = canopyGeometry();
  const leafMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.85, flatShading: true });
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#6b4a32', roughness: 0.95 });
  const trunkGeo = new THREE.CylinderGeometry(0.22, 0.34, 1, 7);
  trunkGeo.translate(0, 0.5, 0);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  const color = new THREE.Color();
  if (trees.length) {
    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, trees.length);
    const tops = new THREE.InstancedMesh(canopy, leafMat, trees.length);
    trees.forEach((t, k) => {
      const y = t.y ?? 0.18, h = 2.6 * t.size;
      m.compose(new THREE.Vector3(t.x, y, t.z), q.identity(), new THREE.Vector3(t.size, h, t.size));
      trunks.setMatrixAt(k, m);
      q.setFromAxisAngle(up, rng.range(0, 6.28));
      const s = 2.4 * t.size;
      m.compose(new THREE.Vector3(t.x, y + h + s * 0.45, t.z), q, new THREE.Vector3(s, s * 0.7, s));
      tops.setMatrixAt(k, m);
      tops.setColorAt(k, color.set(t.flowering ? rng.pick(BLOSSOM) : rng.pick(LEAVES)));
      addCollider(t.x - 0.35, t.z - 0.35, t.x + 0.35, t.z + 0.35, y + h, -5, 'tree');
    });
    trunks.castShadow = tops.castShadow = true;
    tops.receiveShadow = true;
    group.add(trunks, tops);
  }
  if (shrubs.length) {
    const bushes = new THREE.InstancedMesh(canopy, leafMat, shrubs.length);
    shrubs.forEach((b, k) => {
      q.setFromAxisAngle(up, rng.range(0, 6.28));
      const s = b.size;
      m.compose(new THREE.Vector3(b.x, (b.y ?? 0.18) + s * 0.5, b.z), q, new THREE.Vector3(s, s * 0.75, s));
      bushes.setMatrixAt(k, m);
      bushes.setColorAt(k, color.set(b.flowering ? rng.pick(BLOSSOM) : rng.pick(LEAVES)));
    });
    bushes.castShadow = true;
    group.add(bushes);
  }
}
