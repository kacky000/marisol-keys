// Sun (shadow-casting directional light that follows the player), sky fill and fog, driven by the clock.

import * as THREE from 'three';

export function createLighting(scene) {
  const sun = new THREE.DirectionalLight('#ffffff', 2.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const cam = sun.shadow.camera;
  cam.left = -110; cam.right = 110; cam.top = 110; cam.bottom = -110;
  cam.near = 10; cam.far = 700;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.04;
  sun.shadow.radius = 3;
  scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight('#bcd6ee', '#b89a7a', 0.8);
  scene.add(hemi);
  scene.fog = new THREE.Fog('#ffd9a8', 180, 900);
  return { sun, hemi };
}

export function updateLighting(lights, scene, state, focus, drawDistance = 900) {
  const { sun, hemi } = lights;
  const dir = state.sunDir.y > 0.02 ? state.sunDir : new THREE.Vector3(-0.3, 0.6, 0.4).normalize();
  sun.position.set(focus.x + dir.x * 350, dir.y * 350, focus.z + dir.z * 350);
  sun.target.position.set(focus.x, 0, focus.z);
  sun.color.copy(state.sunIntensity > 0.05 ? state.sunColor : new THREE.Color('#7f8fc8'));
  sun.intensity = Math.max(state.sunIntensity, 0.35);
  hemi.color.copy(state.ambient);
  hemi.groundColor.set('#b8977a').multiplyScalar(0.4 + state.ambientIntensity * 0.6);
  hemi.intensity = state.ambientIntensity * 1.05;
  scene.fog.color.copy(state.horizon).lerp(state.zenith, 0.12);
  scene.fog.near = drawDistance * 0.3;
  scene.fog.far = drawDistance * 1.25;
}
