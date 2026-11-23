// The island's clock: maps the hour to sun direction, light colours, sky gradient and fog.
// Golden hour is the signature look of Marisol Keys.

import * as THREE from 'three';

// Key frames: hour, sun elevation (deg), sun colour, intensity, sky zenith, horizon, fog, ambient.
const KEYS = [
  { h: 0, el: -30, sun: '#5d6fa8', si: 0.0, zen: '#0a1030', hor: '#1f2b55', amb: '#2a3768', ai: 0.35 },
  { h: 5.5, el: -4, sun: '#ff9b6a', si: 0.2, zen: '#24305e', hor: '#c97a6a', amb: '#5a5a88', ai: 0.45 },
  { h: 7, el: 10, sun: '#ffc48a', si: 1.6, zen: '#4f86c6', hor: '#f6c8a0', amb: '#9fb4d6', ai: 0.7 },
  { h: 10, el: 45, sun: '#fff3dc', si: 2.6, zen: '#2f7fd0', hor: '#bfe1f2', amb: '#bcd6ee', ai: 0.85 },
  { h: 14, el: 62, sun: '#fff6e6', si: 2.8, zen: '#2c78cc', hor: '#c6e6f4', amb: '#c3dcf0', ai: 0.9 },
  { h: 17, el: 22, sun: '#ffd28f', si: 3.0, zen: '#1c72d8', hor: '#ffc890', amb: '#cfc4c4', ai: 1.0 },
  { h: 18.4, el: 9, sun: '#ffb062', si: 3.1, zen: '#1f6ad0', hor: '#ff9e5a', amb: '#c9b0b0', ai: 0.95 },
  { h: 19.6, el: -3, sun: '#ff6a4a', si: 0.6, zen: '#2a2f6a', hor: '#e9746a', amb: '#7a6390', ai: 0.5 },
  { h: 21, el: -18, sun: '#5d6fa8', si: 0.0, zen: '#0c1236', hor: '#2c2f60', amb: '#2e3a70', ai: 0.38 },
  { h: 24, el: -30, sun: '#5d6fa8', si: 0.0, zen: '#0a1030', hor: '#1f2b55', amb: '#2a3768', ai: 0.35 },
];

const tmpA = new THREE.Color(), tmpB = new THREE.Color();
const mix = (a, b, t) => tmpA.set(a).lerp(tmpB.set(b), t).clone();

export function skyStateAt(hour) {
  const h = ((hour % 24) + 24) % 24;
  let k = 0;
  while (k < KEYS.length - 2 && KEYS[k + 1].h <= h) k++;
  const a = KEYS[k], b = KEYS[k + 1];
  const t = (h - a.h) / (b.h - a.h);
  const el = THREE.MathUtils.degToRad(a.el + (b.el - a.el) * t);
  // sun travels from east (morning) over the south to the west (evening), so evenings light
  // the beach-facing facades and throw long shadows toward the ocean.
  const az = THREE.MathUtils.degToRad(90 + (h - 6) * 15);
  const sunDir = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)).normalize();
  return {
    hour: h,
    sunDir,
    sunColor: mix(a.sun, b.sun, t),
    sunIntensity: a.si + (b.si - a.si) * t,
    zenith: mix(a.zen, b.zen, t),
    horizon: mix(a.hor, b.hor, t),
    ambient: mix(a.amb, b.amb, t),
    ambientIntensity: a.ai + (b.ai - a.ai) * t,
    night: Math.max(0, Math.min(1, (-el * 57.3 + 2) / 12)),
  };
}

export function formatClock(hour) {
  const h = Math.floor(hour) % 24, m = Math.floor((hour % 1) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
