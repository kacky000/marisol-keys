// Pooled GPU particles for sparks, muzzle fire, explosions (additive) and smoke, dust, blood (normal).

import * as THREE from 'three';

const vertex = /* glsl */`
attribute float aSize;
attribute vec4 aColor;
varying vec4 vColor;
void main() {
  vColor = aColor;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * (520.0 / -mv.z);
  gl_Position = projectionMatrix * mv;
}`;
const fragment = /* glsl */`
varying vec4 vColor;
void main() {
  vec2 d = gl_PointCoord - 0.5;
  float r = dot(d, d) * 4.0;
  if (r > 1.0) discard;
  gl_FragColor = vec4(vColor.rgb, vColor.a * (1.0 - r));
}`;

class ParticlePool {
  constructor(scene, max, blending) {
    this.max = max;
    this.items = [];
    this.geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(max * 3);
    this.col = new Float32Array(max * 4);
    this.size = new Float32Array(max);
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.geo.setAttribute('aColor', new THREE.BufferAttribute(this.col, 4));
    this.geo.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1));
    this.mat = new THREE.ShaderMaterial({ vertexShader: vertex, fragmentShader: fragment, transparent: true, depthWrite: false, blending });
    this.points = new THREE.Points(this.geo, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
    scene.add(this.points);
  }

  emit(p) {
    if (this.items.length >= this.max) this.items.shift();
    this.items.push({ x: p.x, y: p.y, z: p.z, vx: p.vx || 0, vy: p.vy || 0, vz: p.vz || 0, life: p.life, age: 0,
      size: p.size, grow: p.grow || 0, g: p.gravity || 0, drag: p.drag || 0, c: new THREE.Color(p.color), c2: p.color2 ? new THREE.Color(p.color2) : null, a: p.alpha ?? 1 });
  }

  update(dt) {
    const keep = [];
    for (const it of this.items) {
      it.age += dt;
      if (it.age >= it.life) continue;
      it.vy -= it.g * dt;
      const k = Math.exp(-it.drag * dt);
      it.vx *= k; it.vy *= k; it.vz *= k;
      it.x += it.vx * dt; it.y += it.vy * dt; it.z += it.vz * dt;
      if (it.y < 0.05 && it.g > 0) { it.y = 0.05; it.vy *= -0.3; }
      keep.push(it);
    }
    this.items = keep;
    const n = keep.length;
    for (let i = 0; i < this.max; i++) {
      if (i < n) {
        const it = keep[i];
        const t = it.age / it.life;
        this.pos[i * 3] = it.x; this.pos[i * 3 + 1] = it.y; this.pos[i * 3 + 2] = it.z;
        const c = it.c2 ? it.c.clone().lerp(it.c2, t) : it.c;
        this.col[i * 4] = c.r; this.col[i * 4 + 1] = c.g; this.col[i * 4 + 2] = c.b;
        this.col[i * 4 + 3] = it.a * (1 - t);
        this.size[i] = it.size + it.grow * it.age;
      } else {
        this.size[i] = 0;
        this.col[i * 4 + 3] = 0;
      }
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.aColor.needsUpdate = true;
    this.geo.attributes.aSize.needsUpdate = true;
    this.geo.setDrawRange(0, Math.max(1, n));
  }
}

export class ParticleFX {
  constructor(scene) {
    this.glow = new ParticlePool(scene, 900, THREE.AdditiveBlending);
    this.smoke = new ParticlePool(scene, 700, THREE.NormalBlending);
  }

  update(dt) { this.glow.update(dt); this.smoke.update(dt); }

  sparks(x, y, z, n = 10, color = '#ffd27a') {
    for (let k = 0; k < n; k++) {
      this.glow.emit({ x, y, z, vx: (Math.random() - 0.5) * 9, vy: Math.random() * 6, vz: (Math.random() - 0.5) * 9, life: 0.25 + Math.random() * 0.3, size: 0.18, gravity: 14, color, color2: '#ff5a1a' });
    }
  }

  muzzle(x, y, z, dx, dz) {
    for (let k = 0; k < 5; k++) {
      const s = Math.random() * 1.2;
      this.glow.emit({ x: x + dx * s, y, z: z + dz * s, vx: dx * 4, vz: dz * 4, life: 0.07, size: 0.9 - s * 0.4, color: '#fff2b0', color2: '#ff8a2a' });
    }
    this.smoke.emit({ x, y, z, vy: 0.8, life: 0.6, size: 0.4, grow: 1.4, color: '#c9c3bb', alpha: 0.35 });
  }

  blood(x, y, z) {
    for (let k = 0; k < 8; k++) this.smoke.emit({ x, y, z, vx: (Math.random() - 0.5) * 3, vy: Math.random() * 2.5, vz: (Math.random() - 0.5) * 3, life: 0.5, size: 0.14, gravity: 9, color: '#9a1010', alpha: 0.9 });
  }

  dust(x, y, z, amount = 1) {
    this.smoke.emit({ x: x + (Math.random() - 0.5), y, z: z + (Math.random() - 0.5), vy: 0.5, vx: (Math.random() - 0.5), vz: (Math.random() - 0.5), life: 0.9, size: 0.6 * amount, grow: 1.5, color: '#d8cfc0', alpha: 0.35 });
  }

  carSmoke(x, y, z, dark) {
    this.smoke.emit({ x, y, z, vy: 1.6, vx: (Math.random() - 0.5) * 0.8, vz: (Math.random() - 0.5) * 0.8, life: 2.2, size: 0.8, grow: 1.8, color: dark ? '#2a2a2a' : '#a8a8a8', alpha: dark ? 0.6 : 0.4 });
  }

  fire(x, y, z) {
    this.glow.emit({ x: x + (Math.random() - 0.5) * 1.4, y, z: z + (Math.random() - 0.5) * 1.4, vy: 2.5 + Math.random() * 2, life: 0.6, size: 1.2, grow: -0.8, color: '#ffd36b', color2: '#ff3a10' });
  }

  explosion(x, y, z) {
    for (let k = 0; k < 60; k++) {
      const a = Math.random() * Math.PI * 2, e = Math.random() * 1.2, sp = 4 + Math.random() * 10;
      this.glow.emit({ x, y: y + 0.5, z, vx: Math.cos(a) * Math.cos(e) * sp, vy: Math.sin(e) * sp, vz: Math.sin(a) * Math.cos(e) * sp, life: 0.5 + Math.random() * 0.5, size: 1.6, grow: 2, drag: 3, color: '#fff0a0', color2: '#ff3000' });
    }
    for (let k = 0; k < 30; k++) this.smoke.emit({ x: x + (Math.random() - 0.5) * 3, y: y + 1, z: z + (Math.random() - 0.5) * 3, vy: 2 + Math.random() * 3, life: 3, size: 2, grow: 2.5, drag: 0.5, color: '#3a3330', alpha: 0.7 });
  }
}
