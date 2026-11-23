// Shared building toolkit: one geometry batch per facade style, roof and trim, plus helpers
// that add a building's walls, roof, collider and register spots for signs and rooftop props.

import * as THREE from 'three';
import { MeshBatch, tint } from '../core/meshBatch.js';
import { addCollider } from '../world/collisionWorld.js';
import { glassFacade, decoFacade, stuccoFacade, warehouseFacade, villaFacade, roofTexture, shopfrontFacade, litWindowsFrom } from './facadeTextures.js';
import { WALK_Y } from '../world/terrain.js';
import { boardwalkTexture } from '../world/groundTextures.js';

export function createBuildingKit() {
  return {
    glass: new MeshBatch({ tileU: 12, tileV: 12 }),
    deco: new MeshBatch({ tileU: 6, tileV: 6.6 }),
    stucco: new MeshBatch({ tileU: 8, tileV: 6 }),
    warehouse: new MeshBatch({ tileU: 8, tileV: 8 }),
    villa: new MeshBatch({ tileU: 10, tileV: 7 }),
    roof: new MeshBatch({ tileU: 8, tileV: 8 }),
    trim: new MeshBatch({ tileU: 4, tileV: 4 }),
    glow: new MeshBatch({ tileU: 4, tileV: 4 }),
    boardwalk: new MeshBatch({ tileU: 4, tileV: 4 }),
    shop: new MeshBatch({ tileU: 6, tileV: 3.6 }),
    signs: [],     // { x, y, z, yaw, w, h, brand }
    palms: [],      // { x, z, h, lean }
    rooftops: [],   // { x, y, z, w, d }
    tallest: [],
  };
}

const ROOF_TINT = tint('#d8d3ca');

// A plain block of a given style with a flat roof. Returns the roof height.
export function addBlockBuilding(kit, style, cx, cz, w, d, h, color, { y0 = WALK_Y, roof = true, collide = true, uOffset = 0 } = {}) {
  kit[style].box(cx, y0, cz, w, h, d, tint(color), { top: false, uOffset });
  if (roof) {
    kit.roof.box(cx, y0 + h - 0.02, cz, w, 0.02, d, ROOF_TINT, { sides: false });
    // parapet
    kit.trim.box(cx, y0 + h, cz - d / 2 + 0.2, w, 0.7, 0.4, tint(color));
    kit.trim.box(cx, y0 + h, cz + d / 2 - 0.2, w, 0.7, 0.4, tint(color));
    kit.trim.box(cx - w / 2 + 0.2, y0 + h, cz, 0.4, 0.7, d, tint(color));
    kit.trim.box(cx + w / 2 - 0.2, y0 + h, cz, 0.4, 0.7, d, tint(color));
  }
  if (collide) addCollider(cx - w / 2, cz - d / 2, cx + w / 2, cz + d / 2, y0 + h);
  return y0 + h;
}

// Glass shopfronts wrapping a building's ground floor.
export function addShopfront(kit, cx, cz, w, d) {
  kit.shop.box(cx, 0, cz, w + 0.14, 3.6, d + 0.14, tint('#ffffff'), { top: false });
}

// Rooftop clutter: AC units, a water tank, an antenna.
export function addRooftopClutter(kit, cx, cz, w, d, y, rng) {
  const n = rng.int(1, 3);
  for (let k = 0; k < n; k++) {
    const ax = cx + rng.range(-w / 3, w / 3), az = cz + rng.range(-d / 3, d / 3);
    kit.trim.box(ax, y, az, rng.range(1.4, 3), rng.range(0.9, 1.6), rng.range(1.2, 2.4), tint('#c9c6c0'));
  }
  if (rng.chance(0.35)) {
    const tx = cx + rng.range(-w / 4, w / 4), tz = cz + rng.range(-d / 4, d / 4);
    kit.trim.box(tx, y, tz, 0.3, 2.2, 0.3, tint('#6f6a64'));
    kit.trim.box(tx, y + 2.2, tz, 2.6, 2.2, 2.6, tint('#9b7b5c'));
  }
}

// Sign facing outward on a facade. side: 'n' 's' 'e' 'w'.
export function addSign(kit, cx, cz, w, d, y, side, brand, sw = 8, sh = 2) {
  const off = 0.25;
  const p = { n: [cx, cz - d / 2 - off, Math.PI], s: [cx, cz + d / 2 + off, 0], e: [cx + w / 2 + off, cz, Math.PI / 2], w: [cx - w / 2 - off, cz, -Math.PI / 2] }[side];
  kit.signs.push({ x: p[0], y, z: p[1], yaw: p[2], w: sw, h: sh, brand });
}

// The side of a building that faces the nearest street, given its block.
export function streetSide(block, cx, cz) {
  const dx = cx - block.cx, dz = cz - block.cz;
  if (Math.abs(dx) > Math.abs(dz)) return dx > 0 ? 'e' : 'w';
  return dz > 0 ? 's' : 'n';
}

export function buildKitMeshes(kit, group) {
  const facadeMat = (map, rough = 0.85, metal = 0) => new THREE.MeshStandardMaterial({ map, roughness: rough, metalness: metal, vertexColors: true });
  // facades whose windows light up after dusk (emissive intensity is driven by the clock)
  const nightMat = (map, cols, rows, rough, metal = 0) => {
    const m = facadeMat(map, rough, metal);
    m.emissiveMap = litWindowsFrom(map, cols, rows, cols * 31 + rows);
    m.emissive = new THREE.Color('#ffffff');
    m.emissiveIntensity = 0;
    kit.nightMaterials.push(m);
    return m;
  };
  kit.nightMaterials = [];
  const layers = [
    [kit.glass, nightMat(glassFacade(), 4, 3, 0.28, 0.35)],
    [kit.deco, nightMat(decoFacade(), 2, 2, 0.8)],
    [kit.stucco, nightMat(stuccoFacade(), 2, 2, 0.9)],
    [kit.warehouse, facadeMat(warehouseFacade(), 0.7, 0.2)],
    [kit.villa, facadeMat(villaFacade(), 0.6)],
    [kit.roof, facadeMat(roofTexture(), 1)],
    [kit.trim, new THREE.MeshStandardMaterial({ roughness: 0.7, vertexColors: true })],
    [kit.boardwalk, facadeMat(boardwalkTexture(), 0.9)],
  ];
  for (const [batch, mat] of layers) {
    if (!batch.vertexCount) continue;
    const mesh = batch.toMesh(mat);
    mesh.name = 'buildings';
    group.add(mesh);
  }
  if (kit.shop.vertexCount) {
    const tex = shopfrontFacade();
    const shopMat = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: '#ffffff', emissiveIntensity: 0.3, roughness: 0.25, metalness: 0.2, vertexColors: true });
    const mesh = kit.shop.toMesh(shopMat);
    mesh.name = 'shopfronts';
    group.add(mesh);
    kit.shopMaterial = shopMat;
  }
  if (kit.glow.vertexCount) {
    const glowMat = new THREE.MeshStandardMaterial({ vertexColors: true, emissive: '#ffffff', emissiveIntensity: 0.9, roughness: 0.4 });
    glowMat.onBeforeCompile = (s) => {
      s.fragmentShader = s.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance *= diffuseColor.rgb;');
    };
    group.add(kit.glow.toMesh(glowMat, { cast: false }));
  }
}
