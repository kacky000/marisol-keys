// Procedural vehicle models: clear-coated bodies with chamfered shoulders, wheel arches, sloped
// glass cabins, chrome trim, bright head and tail lights that bloom, wheels that steer and spin,
// bus window bands, spoilers and the motorbike. Service liveries come from liveries.js.

import * as THREE from 'three';
import { MeshBatch, tint } from '../core/meshBatch.js';
import { applyLivery } from './liveries.js';
import { markShared } from '../core/disposeTree.js';
import { speedboatBatch } from '../water/boats.js';
import { buildHuman, poseHuman } from '../peds/humanModel.js';

const bodyMat = new THREE.MeshPhysicalMaterial({ vertexColors: true, metalness: 0.3, roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.08, side: THREE.DoubleSide });
const glowMat = new THREE.MeshStandardMaterial({ vertexColors: true, emissive: '#ffffff', emissiveIntensity: 3.2, roughness: 0.3 });
glowMat.onBeforeCompile = (s) => { s.fragmentShader = s.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance *= diffuseColor.rgb;'); };
const tireMat = new THREE.MeshStandardMaterial({ color: '#18181a', roughness: 0.92 });
const rimMat = new THREE.MeshStandardMaterial({ color: '#d7dbe0', metalness: 0.9, roughness: 0.25 });
const GLASS = '#16222e';
const tireGeo = new THREE.CylinderGeometry(1, 1, 1, 16);
tireGeo.rotateZ(Math.PI / 2);
const rimGeo = new THREE.CylinderGeometry(0.62, 0.62, 1.04, 10);
rimGeo.rotateZ(Math.PI / 2);

// A soft elongated pool of light on the road: brightest near the car, fading out to the sides and far end.
const beamMat = new THREE.ShaderMaterial({
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `varying vec2 vUv;
    void main() {
      float across = 1.0 - smoothstep(0.25, 0.5, abs(vUv.x - 0.5) / (0.55 + vUv.y * 0.45));
      float along = smoothstep(0.0, 0.1, vUv.y) * (1.0 - smoothstep(0.5, 1.0, vUv.y));
      gl_FragColor = vec4(vec3(1.0, 0.9, 0.7) * across * along * 0.5, 1.0);
    }`,
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
});
const beamGeo = new THREE.PlaneGeometry(5, 12);
beamGeo.rotateX(-Math.PI / 2);
// shared by every vehicle: never freed when one car is recycled
markShared(bodyMat, glowMat, tireMat, rimMat, tireGeo, rimGeo, beamMat, beamGeo);

// Cabin prism with slanted windshield and rear glass, chrome window line and B-pillars.
function cabin(batch, W, beltY, c, paint, roofPaint = paint) {
  const zf = -c.front, zb = -c.back;
  const tf = zf + c.slopeF, tb = zb - c.slopeB;
  const hw = W / 2, tw = W * 0.43;
  const glass = tint(GLASS), roof = tint(roofPaint), body = tint(paint);
  const uv = [[0, 0], [1, 0], [1, 1], [0, 1]];
  batch.quad([-hw, beltY, zf], [hw, beltY, zf], [tw, c.top, tf], [-tw, c.top, tf], [0, 0.6, -0.8], uv, glass);
  batch.quad([hw, beltY, zb], [-hw, beltY, zb], [-tw, c.top, tb], [tw, c.top, tb], [0, 0.6, 0.8], uv, glass);
  batch.quad([-tw, c.top, tb], [tw, c.top, tb], [tw, c.top, tf], [-tw, c.top, tf], [0, 1, 0], uv, roof);
  batch.quad([hw, beltY, zb], [hw, beltY, zf], [tw, c.top, tf], [tw, c.top, tb], [1, 0.25, 0], uv, glass);
  batch.quad([-hw, beltY, zf], [-hw, beltY, zb], [-tw, c.top, tb], [-tw, c.top, tf], [-1, 0.25, 0], uv, glass);
  const zm = (zf + zb) / 2;
  for (const s of [-1, 1]) {
    batch.orientedBox(s * (hw + tw) / 2, (beltY + c.top) / 2, zm, (hw - tw) + 0.06, c.top - beltY, 0.16, 0, body);
    batch.orientedBox(s * (hw - 0.01), beltY + 0.02, (zf + zb) / 2, 0.04, 0.04, zb - zf, 0, tint('#c9ced4'));
  }
}

function addWheel(group, wheels, x, y, z, r, w, front) {
  const g = new THREE.Group();
  const spin = new THREE.Group();
  const tire = new THREE.Mesh(tireGeo, tireMat);
  tire.scale.set(w, r, r);
  const rim = new THREE.Mesh(rimGeo, rimMat);
  rim.scale.set(w, r, r);
  tire.castShadow = true;
  spin.add(tire, rim);
  g.add(spin);
  g.position.set(x, y, z);
  g.userData = { spin, front };
  wheels.push(g);
  group.add(g);
}

function buildBike(group, body, glow, spec, paintC, wheels) {
  const dark = tint('#222428'), chrome = tint('#c9ccd1');
  body.orientedBox(0, 0.78, -0.1, 0.36, 0.38, 0.9, 0, paintC);
  body.orientedBox(0, 0.62, 0.15, 0.26, 0.3, 0.8, 0, dark);
  body.orientedBox(0, 0.96, 0.4, 0.3, 0.12, 0.7, 0, dark);
  body.orientedBox(0, 0.88, 0.82, 0.22, 0.14, 0.5, 0, paintC);
  body.orientedBox(0, 1.12, -0.62, 0.78, 0.05, 0.05, 0, chrome);
  body.orientedBox(0, 0.86, -0.58, 0.07, 0.56, 0.07, 0, chrome);
  body.orientedBox(0.18, 0.5, 0.55, 0.12, 0.12, 0.7, 0, chrome);
  body.orientedBox(0, 1.02, -0.74, 0.3, 0.22, 0.12, 0, paintC);
  glow.orientedBox(0, 1.0, -0.81, 0.16, 0.12, 0.04, 0, tint('#fff3cf'));
  glow.orientedBox(0, 0.92, 1.08, 0.16, 0.07, 0.04, 0, tint('#ff1a1a'));
  for (const z of [-spec.wheelbase / 2, spec.wheelbase / 2]) addWheel(group, wheels, 0, spec.wheelR, z, spec.wheelR, 0.16, z < 0);
}

function buildBus(body, glow, spec, paintC, W, L) {
  const clearance = spec.wheelR * 0.7, H = spec.height;
  body.orientedBox(0, clearance + (H - clearance) / 2, 0, W, H - clearance, L, 0, paintC);
  body.orientedBox(0, H * 0.62, 0, W + 0.04, 1.05, L - 0.8, 0, tint(GLASS));
  body.orientedBox(0, H * 0.43, 0, W + 0.05, 0.22, L, 0, tint('#ffd23f'));
  body.orientedBox(0, H * 0.36, 0, W + 0.05, 0.08, L, 0, tint('#ff6b5a'));
  body.orientedBox(0, H - 0.02, 0, W - 0.4, 0.3, L * 0.5, 0, tint('#e8e8e8'));
  body.orientedBox(0, H * 0.6, -L / 2 - 0.01, W - 0.2, 1.5, 0.05, 0, tint(GLASS));
  glow.orientedBox(0, H - 0.35, -L / 2 - 0.03, 1.8, 0.32, 0.05, 0, tint('#ffb020'));
  for (const s of [-1, 1]) {
    glow.orientedBox(s * (W / 2 - 0.3), clearance + 0.45, -L / 2 - 0.02, 0.4, 0.18, 0.05, 0, tint('#fff3cf'));
    glow.orientedBox(s * (W / 2 - 0.3), clearance + 0.5, L / 2 + 0.02, 0.3, 0.4, 0.05, 0, tint('#ff1a1a'));
  }
}

export function buildVehicleMesh(type, spec, paint) {
  const group = new THREE.Group();
  const body = new MeshBatch();
  const glow = new MeshBatch();
  const L = spec.len, W = spec.width;
  const paintC = tint(paint), dark = tint('#1f2125'), chrome = tint('#cfd4da'), black = tint('#0e0f11');
  const wheels = [];
  const lightbar = [];

  if (spec.boat) {
    const hullMesh = speedboatBatch(paint).toMesh(bodyMat);
    hullMesh.position.y = 0.35;
    group.add(hullMesh);
    glow.orientedBox(0, 1.05, -2.6, 0.2, 0.12, 0.1, 0, tint('#fff3cf'));
    glow.orientedBox(0.9, 1.0, 2.9, 0.12, 0.12, 0.12, 0, tint('#ff1a1a'));
    glow.orientedBox(-0.9, 1.0, 2.9, 0.12, 0.12, 0.12, 0, tint('#20ff60'));
    group.add(glow.toMesh(glowMat, { cast: false }));
    group.userData = { wheels, lightbar, body: hullMesh };
    return group;
  }
  if (spec.bike) buildBike(group, body, glow, spec, paintC, wheels);
  else if (spec.bus) buildBus(body, glow, spec, paintC, W, L);
  else {
    const clearance = spec.wheelR * 0.62;
    const belt = spec.height * (type === 'sports' ? 0.55 : 0.6);
    const sideH = belt - clearance;
    // main body with a chamfered shoulder, nose and tail slightly tucked
    body.orientedBox(0, clearance + sideH * 0.42, 0, W, sideH * 0.84, L - 0.1, 0, paintC);
    body.orientedBox(0, belt - sideH * 0.09, 0, W - 0.14, sideH * 0.18, L - 0.3, 0, paintC);
    body.orientedBox(0, clearance + sideH * 0.4, -L / 2 + 0.05, W - 0.2, sideH * 0.7, 0.16, 0, paintC);
    // lower skirt and wheel arches (dark openings around the tyres)
    body.orientedBox(0, clearance + 0.07, 0, W + 0.02, 0.14, L * 0.55, 0, dark);
    for (const sz of [-1, 1]) body.orientedBox(0, spec.wheelR * 1.02, sz * spec.wheelbase / 2, W + 0.03, spec.wheelR * 1.05, spec.wheelR * 2.25, 0, black);
    // bumpers, grille, plate
    body.orientedBox(0, clearance + 0.13, -L / 2 - 0.03, W + 0.03, 0.24, 0.14, 0, dark);
    body.orientedBox(0, clearance + 0.13, L / 2 + 0.03, W + 0.03, 0.24, 0.14, 0, dark);
    body.orientedBox(0, belt - 0.22, -L / 2 - 0.04, W * 0.42, 0.16, 0.05, 0, black);
    body.orientedBox(0, clearance + 0.32, L / 2 + 0.05, 0.5, 0.14, 0.02, 0, tint('#f2f2ea'));
    const roofPaint = spec.police ? '#f4f4f2' : paint;
    if (spec.open) {
      // open top: raked windshield in a chrome frame, two tan seats with headrests, a rollbar hump
      const c = spec.cabin, zf = -c.front;
      body.quad([-W * 0.45, belt, zf], [W * 0.45, belt, zf], [W * 0.42, belt + 0.45, zf + 0.35], [-W * 0.42, belt + 0.45, zf + 0.35], [0, 0.6, -0.8], [[0, 0], [1, 0], [1, 1], [0, 1]], tint(GLASS));
      body.orientedBox(0, belt + 0.46, zf + 0.36, W * 0.86, 0.04, 0.04, 0, chrome);
      body.orientedBox(0, belt - 0.1, 0.3, W * 0.86, 0.12, 1.9, 0, tint('#3a2a22'));
      for (const s of [-1, 1]) {
        body.orientedBox(s * 0.42, belt + 0.12, 0.55, 0.55, 0.3, 0.6, 0, tint('#d9b38c'));
        body.orientedBox(s * 0.42, belt + 0.45, 0.85, 0.5, 0.55, 0.14, 0, tint('#d9b38c'));
        body.orientedBox(s * 0.42, belt + 0.78, 0.86, 0.26, 0.18, 0.12, 0, tint('#d9b38c'));
      }
      body.orientedBox(0, belt + 0.05, 1.45, W * 0.8, 0.14, 0.7, 0, paintC);
    } else cabin(body, W * 0.94, belt, spec.cabin, paint, roofPaint);
    // mirrors
    for (const s of [-1, 1]) body.orientedBox(s * (W / 2 + 0.11), belt + 0.12, -spec.cabin.front + 0.18, 0.2, 0.13, 0.12, 0, paintC);
    // lights: wide tail-light strip, headlight pair, amber corner markers
    glow.orientedBox(0, belt - 0.14, L / 2 + 0.01, W * 0.86, 0.1, 0.05, 0, tint('#ff1414'));
    for (const s of [-1, 1]) {
      glow.orientedBox(s * (W / 2 - 0.3), belt - 0.16, -L / 2 - 0.02, 0.44, 0.13, 0.05, 0, tint('#fff6dc'));
      glow.orientedBox(s * (W / 2 - 0.04), belt - 0.18, -L / 2 + 0.15, 0.05, 0.08, 0.22, 0, tint('#ffa020'));
    }
    if (type === 'sports') {
      body.orientedBox(0, belt + 0.28, L / 2 - 0.25, W * 0.9, 0.06, 0.38, 0, black);
      for (const s of [-1, 1]) body.orientedBox(s * W * 0.32, belt + 0.12, L / 2 - 0.25, 0.06, 0.24, 0.2, 0, black);
      body.orientedBox(0, belt + 0.01, -L * 0.28, 0.5, 0.03, L * 0.32, 0, black); // hood stripe
    }
    if (spec.bed) {
      const bz = -spec.cabin.back + (L / 2 + spec.cabin.back) / 2 + 0.1;
      const bl = L / 2 + spec.cabin.back - 0.2;
      body.orientedBox(0, belt - 0.02, bz, W - 0.24, 0.04, bl, 0, black);
      for (const s of [-1, 1]) body.orientedBox(s * (W / 2 - 0.06), belt + 0.22, bz, 0.1, 0.44, bl, 0, paintC);
      body.orientedBox(0, belt + 0.22, L / 2 - 0.06, W, 0.44, 0.1, 0, paintC);
      body.orientedBox(0, spec.cabin.top + 0.04, -spec.cabin.back - 0.3, W * 0.8, 0.06, 0.06, 0, chrome);
    }
    applyLivery(type, spec, { body, glow, group, lightbar, W, L, belt, clearance, sideH, paint: paintC, black, dark, chrome });
    const wx = W / 2 - 0.1;
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) addWheel(group, wheels, sx * wx, spec.wheelR, sz * spec.wheelbase / 2, spec.wheelR, 0.3, sz < 0);
  }
  if (spec.bus) {
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) addWheel(group, wheels, sx * (W / 2 - 0.2), spec.wheelR, sz * spec.wheelbase / 2, spec.wheelR, 0.34, sz < 0);
  }
  const bodyMesh = body.toMesh(bodyMat);
  const glowMesh = glow.toMesh(glowMat, { cast: false });
  group.add(bodyMesh, glowMesh);
  // headlight pool on the road ahead, shown after dusk
  const beam = new THREE.Mesh(beamGeo, beamMat);
  beam.position.set(0, 0.06, -L / 2 - 6.5);
  beam.visible = false;
  group.add(beam);
  group.userData = { wheels, lightbar, body: bodyMesh, beam };
  if (spec.open) {
    // a seated driver, visible in the open cockpit (removed when Tessa takes the wheel)
    const npc = buildHuman({ skin: '#d9a07a', shirt: paint === '#ffffff' ? '#ff6b5a' : '#ffffff', pants: '#3d5a80', hair: '#4a2c1a', hairStyle: 'short', shades: true, shoes: '#222', build: 0.95 });
    poseHuman(npc, 'drive', 0, 0);
    npc.userData.hips.position.y = 0.7;
    npc.position.set(-0.42, -0.05, 0.55);
    group.add(npc);
    group.userData.npc = npc;
  }
  if (spec.bike) {
    // a rider astride the seat, leaning to the bars (hidden when Tessa rides it, as above)
    const npc = buildHuman({ skin: '#b97a55', shirt: '#2b2d42', pants: '#1d1d24', hair: '#111', hairStyle: 'short', hat: 'cap', hatColor: paint, shades: true, shoes: '#222', build: 0.95 });
    poseHuman(npc, 'drive', 0, 0);
    const u = npc.userData;
    u.hips.position.y = 0.72;
    u.hips.rotation.x = -0.25; // leaning forward
    u.legs[0].rotation.set(0.7, 0, 0.25);
    u.legs[1].rotation.set(0.7, 0, -0.25);
    u.arms[0].rotation.set(1.25, 0, 0.12);
    u.arms[1].rotation.set(1.25, 0, -0.12);
    npc.position.set(0, 0.24, 0.3);
    group.add(npc);
    group.userData.npc = npc;
  }
  return group;
}
