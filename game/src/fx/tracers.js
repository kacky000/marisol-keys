// Bullet tracers (bright streaks that fade in a few frames) and brief muzzle-flash point lights.

import * as THREE from 'three';

export class TracerFX {
  constructor(scene) {
    this.scene = scene;
    this.lines = [];
    this.mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 1.9, 0.9), transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
    this.geo = new THREE.CylinderGeometry(0.03, 0.03, 1, 5, 1, true);
    this.geo.rotateX(Math.PI / 2);
    this.flashes = [];
    for (let k = 0; k < 4; k++) {
      const l = new THREE.PointLight('#ffb35c', 0, 14, 2);
      scene.add(l);
      this.flashes.push({ light: l, t: 0 });
    }
    this.flashIndex = 0;
  }

  // A bright streak about two thirds of the way along the bullet's path, at most 9 m long.
  shoot(from, to, life = 0.09, color = null) {
    const total = from.distanceTo(to);
    const len = Math.min(9, total * 0.4);
    const end = from.clone().lerp(to, 0.68);
    const start = end.clone().lerp(from, Math.min(1, len / Math.max(0.001, end.distanceTo(from))));
    const mesh = new THREE.Mesh(this.geo, color ? this.mat.clone() : this.mat);
    if (color) mesh.material.color.set(color).multiplyScalar(2.5);
    mesh.position.copy(start).lerp(end, 0.5);
    mesh.scale.set(1, 1, start.distanceTo(end));
    mesh.lookAt(end);
    this.scene.add(mesh);
    this.lines.push({ mesh, t: life, life });
  }

  flash(pos) {
    const f = this.flashes[this.flashIndex++ % this.flashes.length];
    f.light.position.copy(pos);
    f.light.intensity = 25;
    f.t = 0.06;
  }

  update(dt) {
    for (const l of this.lines) {
      l.t -= dt;
      l.mesh.scale.x = l.mesh.scale.y = Math.max(0.2, l.t / l.life) * 1.5;
    }
    for (const l of this.lines.filter((q) => q.t <= 0)) {
      this.scene.remove(l.mesh);
      if (l.mesh.material !== this.mat) l.mesh.material.dispose();
    }
    this.lines = this.lines.filter((q) => q.t > 0);
    for (const f of this.flashes) {
      f.t -= dt;
      if (f.t <= 0) f.light.intensity = 0;
    }
  }
}
