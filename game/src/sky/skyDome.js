// Gradient sky dome with a soft sun disc, glow and painted cumulus bands, following the camera.

import * as THREE from 'three';

const vertex = /* glsl */`
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * p;
  gl_Position.z = gl_Position.w; // pin to the far plane
}`;

const fragment = /* glsl */`
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform float uTime;
varying vec3 vDir;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }
void main() {
  vec3 d = normalize(vDir);
  float h = clamp(d.y, -0.2, 1.0);
  vec3 col = mix(uHorizon, uZenith, pow(max(h, 0.0), 0.38));
  // a thin hot band right at the horizon
  col += uHorizon * 0.35 * exp(-max(h, 0.0) * 28.0);
  col = mix(col, uHorizon * 0.8, smoothstep(0.0, -0.2, h));
  float s = max(dot(d, normalize(uSunDir)), 0.0);
  col += uSunColor * (pow(s, 6.0) * 0.35 + pow(s, 60.0) * 0.6);
  col += vec3(1.0, 0.95, 0.85) * smoothstep(0.9993, 0.9997, s) * 2.0;
  // clouds: a band of soft cumulus above the horizon
  if (d.y > 0.0) {
    vec2 uv = d.xz / (d.y + 0.15) * 1.6 + vec2(uTime * 0.004, 0.0);
    float c = smoothstep(0.52, 0.8, fbm(uv));
    c *= smoothstep(0.0, 0.08, d.y) * (1.0 - smoothstep(0.35, 0.8, d.y));
    vec3 cloudCol = mix(vec3(1.0, 0.97, 0.94), uSunColor, 0.35) * (0.8 + 0.4 * pow(s, 3.0));
    col = mix(col, cloudCol, c * 0.85);
  }
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export function createSkyDome() {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uZenith: { value: new THREE.Color('#2f7fd0') },
      uHorizon: { value: new THREE.Color('#ffd9a8') },
      uSunDir: { value: new THREE.Vector3(0, 1, 0) },
      uSunColor: { value: new THREE.Color('#ffffff') },
      uTime: { value: 0 },
    },
    vertexShader: vertex,
    fragmentShader: fragment,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(3000, 32, 16), material);
  mesh.frustumCulled = false;
  mesh.renderOrder = -10;
  return mesh;
}

export function updateSkyDome(dome, state, camera, time) {
  const u = dome.material.uniforms;
  u.uZenith.value.copy(state.zenith);
  u.uHorizon.value.copy(state.horizon);
  u.uSunDir.value.copy(state.sunDir);
  u.uSunColor.value.copy(state.sunColor);
  u.uTime.value = time;
  dome.position.copy(camera.position);
}
