// Image-based lighting from the current sky: renders a private copy of the sky dome into a
// prefiltered environment map so car paint, glass, towers and the sea reflect the sunset.

import * as THREE from 'three';
import { createSkyDome, updateSkyDome } from './skyDome.js';

export class SkyEnvironment {
  constructor(renderer, scene) {
    this.renderer = renderer;
    this.scene = scene;
    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.envScene = new THREE.Scene();
    this.dome = createSkyDome();
    this.dome.material.depthTest = false;
    this.envScene.add(this.dome);
    // a warm ground plane so reflections are not black below the horizon
    const ground = new THREE.Mesh(new THREE.CircleGeometry(2000, 16), new THREE.MeshBasicMaterial({ color: '#8a7a6a', side: THREE.DoubleSide }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -20;
    this.ground = ground;
    this.envScene.add(ground);
    this.target = null;
    this.lastHour = -99;
    this.origin = new THREE.Object3D();
  }

  update(state, force = false) {
    if (!force && Math.abs(state.hour - this.lastHour) < 0.25) return;
    this.lastHour = state.hour;
    updateSkyDome(this.dome, state, this.origin, 0);
    this.ground.material.color.copy(state.horizon).multiplyScalar(0.35);
    const old = this.target;
    this.target = this.pmrem.fromScene(this.envScene, 0.02);
    this.scene.environment = this.target.texture;
    this.scene.environmentIntensity = 0.3 + 0.2 * (1 - state.night);
    if (old) old.dispose();
  }
}
