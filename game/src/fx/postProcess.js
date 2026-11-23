// Final image: the scene is drawn into an HDR target, bright areas bloom (sun, neon, sirens,
// muzzle flashes), then a grade pass applies ACES tone mapping, a warm sun-soaked colour grade,
// gentle saturation and a vignette before output to sRGB.

import * as THREE from 'three';

const quadVertex = /* glsl */`
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const brightFrag = /* glsl */`
uniform sampler2D tScene;
uniform float uThreshold;
varying vec2 vUv;
void main() {
  vec3 c = texture2D(tScene, vUv).rgb;
  float l = max(c.r, max(c.g, c.b));
  float k = smoothstep(uThreshold, uThreshold * 2.2, l);
  gl_FragColor = vec4(c * k, 1.0);
}`;

const blurFrag = /* glsl */`
uniform sampler2D tInput;
uniform vec2 uDir;
varying vec2 vUv;
void main() {
  vec3 sum = texture2D(tInput, vUv).rgb * 0.227;
  sum += texture2D(tInput, vUv + uDir * 1.38).rgb * 0.316;
  sum += texture2D(tInput, vUv - uDir * 1.38).rgb * 0.316;
  sum += texture2D(tInput, vUv + uDir * 3.23).rgb * 0.07;
  sum += texture2D(tInput, vUv - uDir * 3.23).rgb * 0.07;
  gl_FragColor = vec4(sum, 1.0);
}`;

const gradeFrag = /* glsl */`
uniform sampler2D tScene;
uniform sampler2D tBloom;
uniform float uExposure;
uniform float uBloom;
uniform float uSaturation;
uniform vec3 uTint;
uniform float uVignette;
varying vec2 vUv;
vec3 RRTAndODTFit(vec3 v) {
  vec3 a = v * (v + 0.0245786) - 0.000090537;
  vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081;
  return a / b;
}
vec3 aces(vec3 color) {
  const mat3 ACESInputMat = mat3(vec3(0.59719, 0.07600, 0.02840), vec3(0.35458, 0.90834, 0.13383), vec3(0.04823, 0.01566, 0.83777));
  const mat3 ACESOutputMat = mat3(vec3(1.60475, -0.10208, -0.00327), vec3(-0.53108, 1.10813, -0.07276), vec3(-0.07367, -0.00605, 1.07602));
  color *= uExposure / 0.6;
  color = ACESInputMat * color;
  color = RRTAndODTFit(color);
  color = ACESOutputMat * color;
  return clamp(color, 0.0, 1.0);
}
vec3 toSRGB(vec3 c) {
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c));
}
uniform float uSpeedBlur;
vec3 sceneAt(vec2 uv) {
  // radial streaks toward the screen edges at speed, the centre stays sharp
  if (uSpeedBlur < 0.001) return texture2D(tScene, uv).rgb;
  vec2 d = uv - 0.5;
  float edge = smoothstep(0.32, 0.72, length(d));
  vec3 acc = vec3(0.0);
  for (int i = 0; i < 6; i++) acc += texture2D(tScene, uv - d * uSpeedBlur * edge * float(i) * 0.018).rgb;
  return acc / 6.0;
}
void main() {
  vec3 hdr = sceneAt(vUv) + texture2D(tBloom, vUv).rgb * uBloom;
  vec3 c = aces(hdr * uTint);
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = mix(vec3(l), c, uSaturation);
  // lift shadows toward teal, push highlights warm: the island's colour signature
  c += vec3(-0.012, 0.01, 0.025) * (1.0 - l) * (1.0 - l);
  c += vec3(0.03, 0.012, -0.02) * l * l;
  vec2 d = vUv - 0.5;
  c *= 1.0 - uVignette * dot(d, d) * 1.6;
  gl_FragColor = vec4(toSRGB(clamp(c, 0.0, 1.0)), 1.0);
}`;

export class PostProcess {
  constructor(renderer) {
    this.renderer = renderer;
    const opts = { type: THREE.HalfFloatType, depthBuffer: false };
    this.sceneRT = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4 });
    this.brightRT = new THREE.WebGLRenderTarget(4, 4, opts);
    this.blurA = new THREE.WebGLRenderTarget(4, 4, opts);
    this.blurB = new THREE.WebGLRenderTarget(4, 4, opts);
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    this.quad.frustumCulled = false;
    this.scene = new THREE.Scene();
    this.scene.add(this.quad);
    const mat = (frag, uniforms) => new THREE.ShaderMaterial({ vertexShader: quadVertex, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false });
    this.brightMat = mat(brightFrag, { tScene: { value: null }, uThreshold: { value: 1.0 } });
    this.blurMat = mat(blurFrag, { tInput: { value: null }, uDir: { value: new THREE.Vector2() } });
    this.gradeMat = mat(gradeFrag, {
      tScene: { value: null }, tBloom: { value: null }, uExposure: { value: 1.05 }, uBloom: { value: 0.55 },
      uSaturation: { value: 1.2 }, uSpeedBlur: { value: 0 }, uTint: { value: new THREE.Color(1.03, 1.0, 0.96) }, uVignette: { value: 0.55 },
    });
    this.enabled = true;
    // the grade pass does the tone mapping, so the scene itself renders linear HDR
    renderer.toneMapping = THREE.NoToneMapping;
  }

  setSize(w, h) {
    if (this.w === w && this.h === h) return;
    this.w = w; this.h = h;
    const pr = this.renderer.getPixelRatio();
    this.sceneRT.setSize(w * pr, h * pr);
    const bw = Math.max(1, Math.floor(w / 4)), bh = Math.max(1, Math.floor(h / 4));
    this.brightRT.setSize(bw, bh);
    this.blurA.setSize(bw, bh);
    this.blurB.setSize(bw, bh);
  }

  pass(material, target) {
    this.quad.material = material;
    this.renderer.setRenderTarget(target);
    this.renderer.render(this.scene, this.camera);
  }

  render(scene, camera, { exposure = 1.05, bloom = 0.55, speedBlur = 0 } = {}) {
    this.gradeMat.uniforms.uSpeedBlur.value = speedBlur;
    const r = this.renderer;
    if (!this.enabled) { r.setRenderTarget(null); r.render(scene, camera); return; }
    const size = r.getSize(new THREE.Vector2());
    this.setSize(size.x, size.y);
    r.setRenderTarget(this.sceneRT);
    r.render(scene, camera);
    this.brightMat.uniforms.tScene.value = this.sceneRT.texture;
    this.pass(this.brightMat, this.brightRT);
    let src = this.brightRT;
    for (let k = 0; k < 2; k++) {
      this.blurMat.uniforms.tInput.value = src.texture;
      this.blurMat.uniforms.uDir.value.set(1 / this.brightRT.width * (1 + k), 0);
      this.pass(this.blurMat, this.blurA);
      this.blurMat.uniforms.tInput.value = this.blurA.texture;
      this.blurMat.uniforms.uDir.value.set(0, 1 / this.brightRT.height * (1 + k));
      this.pass(this.blurMat, this.blurB);
      src = this.blurB;
    }
    const u = this.gradeMat.uniforms;
    u.tScene.value = this.sceneRT.texture;
    u.tBloom.value = this.blurB.texture;
    u.uExposure.value = exposure;
    u.uBloom.value = bloom;
    this.pass(this.gradeMat, null);
  }
}
