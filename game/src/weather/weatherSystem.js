// Tropical weather: long clear spells, passing cloud, and the odd summer storm with sheets of
// rain, wet mirror-like streets, lightning and thunder. Screenshot scenes stay clear.

import * as THREE from 'three';
import { emit } from '../core/events.js';

const RAIN_COUNT = 2600;
const BOX = 70;

const rainVertex = /* glsl */`
attribute vec3 aSeed;
uniform float uTime;
uniform vec3 uCenter;
varying float vFade;
void main() {
  vec3 p = aSeed * ${BOX.toFixed(1)} - ${(BOX / 2).toFixed(1)};
  float fall = mod(p.y - uTime * 24.0, ${BOX.toFixed(1)});
  vec3 world = vec3(uCenter.x + p.x, uCenter.y - 20.0 + fall, uCenter.z + p.z);
  // each drop is two vertices: the head and a short tail above it
  world.y += position.y * 0.9;
  world.x += position.y * 0.15;
  vFade = 1.0 - position.y;
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}`;
const rainFragment = /* glsl */`
uniform float uOpacity;
varying float vFade;
void main() { gl_FragColor = vec4(0.75, 0.82, 0.9, uOpacity * (0.35 + 0.65 * vFade)); }`;

function buildRain() {
  const seeds = new Float32Array(RAIN_COUNT * 2 * 3);
  const pos = new Float32Array(RAIN_COUNT * 2 * 3);
  for (let k = 0; k < RAIN_COUNT; k++) {
    const s = [Math.random(), Math.random(), Math.random()];
    for (let v = 0; v < 2; v++) {
      seeds.set(s, (k * 2 + v) * 3);
      pos[(k * 2 + v) * 3 + 1] = v; // 0 = head, 1 = tail
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 3));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uCenter: { value: new THREE.Vector3() }, uOpacity: { value: 0 } },
    vertexShader: rainVertex, fragmentShader: rainFragment, transparent: true, depthWrite: false,
  });
  const lines = new THREE.LineSegments(g, mat);
  lines.frustumCulled = false;
  lines.visible = false;
  return lines;
}

const KINDS = { clear: 0, cloudy: 0.45, storm: 1 };
const GREY = new THREE.Color('#7d8894'), GREY_DARK = new THREE.Color('#4a5560');

export class WeatherSystem {
  constructor(scene) {
    this.kind = 'clear';
    this.w = 0;              // current storminess 0..1
    this.target = 0;
    this.timer = 240;        // seconds until the sky changes its mind
    this.flash = 0;
    this.locked = false;     // screenshot scenes keep it clear
    this.rain = buildRain();
    scene.add(this.rain);
  }

  get icon() { return this.w > 0.7 ? '⛈' : this.w > 0.25 ? '☁' : '☀'; }
  get raining() { return this.w > 0.6; }

  set(kind) { this.kind = kind; this.target = KINDS[kind]; }

  update(dt, time, camera) {
    if (!this.locked) {
      this.timer -= dt;
      if (this.timer <= 0) {
        const r = Math.random();
        this.set(r < 0.58 ? 'clear' : r < 0.84 ? 'cloudy' : 'storm');
        this.timer = this.kind === 'storm' ? 150 : 200 + Math.random() * 260;
      }
    }
    this.w += (this.target - this.w) * Math.min(1, dt * 0.05);
    const rainAmount = Math.max(0, (this.w - 0.55) / 0.45);
    this.rain.visible = rainAmount > 0.02;
    const u = this.rain.material.uniforms;
    u.uTime.value = time;
    u.uCenter.value.copy(camera.position);
    u.uOpacity.value = rainAmount * 0.55;
    // lightning during storms
    this.flash = Math.max(0, this.flash - dt * 4);
    if (rainAmount > 0.8 && Math.random() < dt * 0.06) {
      this.flash = 1;
      setTimeout(() => emit('sound', { name: 'thunder' }), 400 + Math.random() * 1500);
    }
    this.rainAmount = rainAmount;
    // a rainbow as a storm clears: "wet" remembers recent rain and dries over a minute and a half
    this.wet = rainAmount > 0.3 ? 1 : Math.max(0, (this.wet || 0) - dt / 90);
    this.rainbow = this.wet * Math.max(0, 1 - rainAmount * 2.5) * (this.w < 0.62 ? 1 : 0);
  }

  // Greys the sky, dims the sun and lifts the ambient during cloud and storms.
  apply(state) {
    const w = this.w;
    if (w < 0.01 && this.flash <= 0 && !(this.rainbow > 0)) return state;
    const s = { ...state, zenith: state.zenith.clone(), horizon: state.horizon.clone(), ambient: state.ambient.clone(), sunColor: state.sunColor.clone() };
    s.rainbow = this.rainbow || 0;
    s.zenith.lerp(GREY_DARK, w * 0.75);
    s.horizon.lerp(GREY, w * 0.7);
    s.ambient.lerp(GREY, w * 0.5);
    s.sunIntensity = state.sunIntensity * (1 - w * 0.78);
    s.ambientIntensity = state.ambientIntensity * (1 - w * 0.15) + this.flash * 2.5;
    s.cloudCover = w;
    return s;
  }
}
