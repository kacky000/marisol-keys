// Rubber left on the asphalt: each rear tyre of a sliding or hard-braking car lays a dark strip.
// All strips share one ring buffer of quads, so the oldest marks quietly give way to new ones.

import * as THREE from 'three';

const MAX_QUADS = 900;
const HALF_WIDTH = 0.16;

export class SkidMarks {
  constructor(scene) {
    this.positions = new Float32Array(MAX_QUADS * 4 * 3);
    const index = new Uint32Array(MAX_QUADS * 6);
    for (let q = 0; q < MAX_QUADS; q++) index.set([q * 4, q * 4 + 1, q * 4 + 2, q * 4, q * 4 + 2, q * 4 + 3], q * 6);
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setIndex(new THREE.BufferAttribute(index, 1));
    const material = new THREE.MeshBasicMaterial({
      color: '#15130f', transparent: true, opacity: 0.5, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    });
    this.mesh = new THREE.Mesh(this.geometry, material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 1;
    this.mesh.name = 'skid-marks';
    scene.add(this.mesh);
    this.next = 0;
    this.last = new Map(); // tyre key -> last laid point
  }

  // Called every frame for every vehicle.
  track(v) {
    const laying = v.skidding && !v.airborne && !v.wrecked && !v.spec.boat && Math.abs(v.speed) > 4;
    for (const side of [-1, 1]) {
      const key = `${v.id}:${side}`;
      if (!laying) { this.last.delete(key); continue; }
      const f = v.forward(), r = v.right();
      const back = v.spec.len * 0.34, track = (v.spec.width || 2) * 0.4;
      const p = { x: v.pos.x - f.x * back + r.x * side * track, y: v.pos.y + 0.035, z: v.pos.z - f.z * back + r.z * side * track, rx: r.x, rz: r.z };
      const prev = this.last.get(key);
      if (!prev) { this.last.set(key, p); continue; }
      const d = Math.hypot(p.x - prev.x, p.z - prev.z);
      if (d < 0.6) continue;
      if (d < 4) this.quad(prev, p);
      this.last.set(key, p);
    }
  }

  quad(a, b) {
    const o = this.next * 12, w = HALF_WIDTH;
    this.positions.set([
      a.x - a.rx * w, a.y, a.z - a.rz * w,
      a.x + a.rx * w, a.y, a.z + a.rz * w,
      b.x + b.rx * w, b.y, b.z + b.rz * w,
      b.x - b.rx * w, b.y, b.z - b.rz * w,
    ], o);
    this.next = (this.next + 1) % MAX_QUADS;
    this.geometry.attributes.position.needsUpdate = true;
  }

  clear() {
    this.positions.fill(0);
    this.geometry.attributes.position.needsUpdate = true;
    this.last.clear();
  }
}
