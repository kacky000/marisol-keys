// Bullet tracers (bright streaks that fade in a few frames) and brief muzzle-flash point lights.

import * as THREE from 'three';

export class TracerFX {
  constructor(scene) {
    this.scene = scene;
    this.lines = [];
    this.mat = new THREE.MeshBasicMaterial({ color: '#ffe9a8', transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    this.geo = new THREE.CylinderGeometry(0.035, 0.035, 1, 4, 1, true);
    this.geo.rotateX(Math.PI / 2);
    this.flashes = [];
    for (let k = 0; k < 4; k++) {
      const l = new THREE.PointLight('#ffb35c', 0, 14, 2);
      scene.add(l);
      this.flashes.push({ light: l, t: 0 });
    }
    this.flashIndex = 0;
  }

  shoot(from, to, life = 0.09, color = null) {
    const len = from.distanceTo(to);
    const mesh = new THREE.Mesh(this.geo, color ? this.mat.clone() : this.mat);
    if (color) mesh.material.color.set(color);
    mesh.position.copy(from).lerp(to, 0.5);
    mesh.scale.set(1, 1, len);
    mesh.lookAt(to);
    this.scene.add(mesh);
    this.lines.push({ mesh, t: life, life });
  }

  flash(pos) {
    const f = this.flashes[this.flashIndex++ % this.flashes.length];
    f.light.position.copy(pos);
    f.light.intensity = 40;
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
