// Animated sea: a lit standard material whose normals ripple with layered waves, giving moving
// sun glints; colour shifts from shallow turquoise near the shore to deep blue offshore.

import * as THREE from 'three';

export function createOcean() {
  const material = new THREE.MeshStandardMaterial({ color: '#1f8fae', roughness: 0.12, metalness: 0.0, transparent: false });
  const uniforms = { uTime: { value: 0 } };
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWorldPos;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
uniform float uTime;
varying vec3 vWorldPos;
vec2 waveGrad(vec2 p) {
  vec2 g = vec2(0.0);
  vec4 dirs[4];
  dirs[0] = vec4(0.8, 0.6, 0.13, 1.3);
  dirs[1] = vec4(-0.4, 0.9, 0.21, 1.9);
  dirs[2] = vec4(0.95, -0.3, 0.37, 2.6);
  dirs[3] = vec4(-0.7, -0.7, 0.71, 3.7);
  for (int i = 0; i < 4; i++) {
    float ph = dot(dirs[i].xy, p) * dirs[i].z + uTime * dirs[i].w;
    g += dirs[i].xy * cos(ph) * (0.22 / (1.0 + float(i)));
  }
  return g;
}`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
{
  vec2 g = waveGrad(vWorldPos.xz) + waveGrad(vWorldPos.xz * 3.1 + 17.0) * 0.35;
  vec3 wn = normalize(vec3(-g.x, 1.0, -g.y));
  normal = normalize((viewMatrix * vec4(wn, 0.0)).xyz);
}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
{
  // shallow turquoise near the island, deep blue offshore
  float shore = smoothstep(0.0, 1.0, clamp((abs(vWorldPos.x - 512.0) - 330.0) / 260.0, 0.0, 1.0) + clamp((abs(vWorldPos.z - 460.0) - 320.0) / 260.0, 0.0, 1.0));
  vec3 shallow = vec3(0.05, 0.55, 0.56);
  vec3 deep = vec3(0.02, 0.18, 0.33);
  diffuseColor.rgb = mix(shallow, deep, clamp(shore, 0.0, 1.0));
  float foam = smoothstep(0.75, 1.0, sin(vWorldPos.x * 0.9 + uTime * 1.7) * sin(vWorldPos.z * 0.7 - uTime * 1.1));
  diffuseColor.rgb += foam * 0.05;
}`);
  };
  const geo = new THREE.PlaneGeometry(5200, 5200, 1, 1);
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(512, -0.55, 512);
  mesh.receiveShadow = true;
  mesh.name = 'ocean';
  return { mesh, uniforms };
}

// White surf lines along the beach where waves break.
export function createSurf(x, z0, z1) {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 64, 0);
  grad.addColorStop(0, 'rgba(255,255,255,0)');
  grad.addColorStop(0.45, 'rgba(255,255,255,0.85)');
  grad.addColorStop(0.6, 'rgba(255,255,255,0.35)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 256);
  // break the line into ragged foam: punch holes and wobble the edge along its length
  g.globalCompositeOperation = 'destination-out';
  for (let y = 0; y < 256; y += 4) {
    const gap = (Math.sin(y * 0.11) + Math.sin(y * 0.037 + 1.3)) * 0.5;
    if (gap > 0.35) g.fillRect(0, y, 64, 4);
    else g.fillRect(0, y, 18 + Math.sin(y * 0.2) * 10, 4);
  }
  g.globalCompositeOperation = 'source-over';
  const tex = new THREE.CanvasTexture(c);
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, (z1 - z0) / 30);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.55 });
  const group = new THREE.Group();
  for (let k = 0; k < 2; k++) {
    const geo = new THREE.PlaneGeometry(6, z1 - z0);
    geo.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x + k * 7, -0.42 + k * 0.01, (z0 + z1) / 2);
    group.add(m);
  }
  group.userData.update = (t) => {
    group.children.forEach((m, k) => { m.position.x = x + k * 7 + Math.sin(t * 0.6 + k * 2) * 2.2; });
  };
  return group;
}
