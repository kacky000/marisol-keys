// Assembles the whole island from the city plan: ground, roads, every district's buildings,
// props, palms, signage, water and the hills, and returns handles the game loop animates.

import * as THREE from 'three';
import { eachBlock, BLOCK } from './cityPlan.js';
import { buildTerrain } from './terrain.js';
import { clearColliders } from './collisionWorld.js';
import { buildRoadNetwork } from '../roads/roadNetwork.js';
import { buildRoadMeshes } from '../roads/roadMesh.js';
import { buildTrafficLights } from '../roads/trafficLights.js';
import { createBuildingKit, buildKitMeshes } from '../buildings/buildingKit.js';
import { buildDowntownBlock } from '../buildings/downtownTowers.js';
import { buildDecoBlock } from '../buildings/decoBoulevard.js';
import { buildNeighbourhoodBlock } from '../buildings/neighbourhoods.js';
import { buildCanalBlock } from '../buildings/canalQuarter.js';
import { buildHarborBlock, buildHarborMeshes } from '../buildings/harborYard.js';
import { buildVillaBlock, buildHills } from '../buildings/hillVillas.js';
import { buildSignMeshes, addBillboard } from '../buildings/signage.js';
import { buildParkBlock } from '../vegetation/parks.js';
import { buildPalms } from '../vegetation/palms.js';
import { buildShadeTrees } from '../vegetation/shadeTrees.js';
import { buildStreetFurniture } from '../props/streetFurniture.js';
import { buildBeachfront } from '../props/beachfront.js';
import { createOcean, createSurf } from '../water/ocean.js';
import { buildBoats } from '../water/boats.js';
import { Seagulls } from '../props/seagulls.js';
import { buildLandmarkSigns } from '../buildings/landmarkSigns.js';
import { buildSeawalls } from '../props/seawalls.js';
import { createRng, hash2 } from '../core/rng.js';
import { MeshBatch } from '../core/meshBatch.js';

const BUILDERS = { D: buildDowntownBlock, A: buildDecoBlock, R: buildNeighbourhoodBlock, C: buildCanalBlock, H: buildHarborBlock, V: buildVillaBlock, P: buildParkBlock };

export function buildWorld(scene) {
  clearColliders();
  buildRoadNetwork();
  const group = new THREE.Group();
  group.name = 'city';
  buildTerrain(group);
  buildRoadMeshes(group);

  const kit = createBuildingKit();
  eachBlock((block) => {
    const build = BUILDERS[block.letter];
    if (!build) return;
    build(kit, block, createRng(1000 + block.i * 31 + block.j * 17));
  });
  // rooftop billboards on a few low roofs facing the boulevards
  let boards = 0;
  for (const r of kit.rooftops) {
    if (boards > 14 || hash2(Math.round(r.x), Math.round(r.z), 9) > 0.18) continue;
    addBillboard(kit, r.x, r.y, r.z, hash2(Math.round(r.x), 3) > 0.5 ? 0 : Math.PI / 2, boards % 2 ? 'DRINK MANGO BAY' : 'SUNWAKE · ROOMS FROM $89');
    boards++;
  }
  buildStreetFurniture(kit);
  const signals = buildTrafficLights(kit, group);
  buildBeachfront(kit);
  buildLandmarkSigns(kit);
  buildSeawalls(kit);
  const craneBatch = new MeshBatch();
  buildHarborMeshes(group, craneBatch);
  group.add(craneBatch.toMesh(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.3 })));
  const hills = new MeshBatch();
  buildHills(hills);
  group.add(hills.toMesh(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true }), { cast: false }));
  buildKitMeshes(kit, group);
  const signMaterial = buildSignMeshes(kit.signs, group);
  buildPalms(kit.palms, group);
  buildShadeTrees(kit.trees, kit.shrubs, group);

  const ocean = createOcean();
  group.add(ocean.mesh);
  const surf = createSurf(13 * BLOCK + 6, 1 * BLOCK - 20, 14 * BLOCK + 20);
  group.add(surf);
  const rockBoats = buildBoats(group);
  const gulls = new Seagulls(group);
  scene.add(group);
  return {
    group,
    tallest: kit.tallest,
    signMaterial,
    shopMaterial: kit.shopMaterial,
    nightMaterials: kit.nightMaterials,
    signals,
    update(time, dt = 0.016) {
      signals.update(dt, time);
      ocean.uniforms.uTime.value = time;
      surf.userData.update(time);
      rockBoats(time);
      gulls.update(time);
    },
  };
}
