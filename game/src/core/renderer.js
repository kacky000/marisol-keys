// WebGL renderer setup: ACES filmic tone mapping, sRGB output, soft PCF shadows, resizing.

import * as THREE from 'three';

export function createRenderer(container, { shadows = true, preserve = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: preserve, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = shadows;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);
  return renderer;
}

export function createCamera() {
  const camera = new THREE.PerspectiveCamera(62, 16 / 9, 0.3, 4000);
  camera.position.set(0, 10, 20);
  return camera;
}

// Matches the drawing buffer to the window every frame (headless windows can report 0 at start-up).
export function fitToWindow(renderer, camera) {
  const el = renderer.domElement;
  const w = el.clientWidth || innerWidth || 1280;
  const h = el.clientHeight || innerHeight || 720;
  const size = renderer.getSize(new THREE.Vector2());
  if (size.x !== w || size.y !== h) {
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
}
