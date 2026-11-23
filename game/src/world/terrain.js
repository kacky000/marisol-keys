// Ground of every block: raised sidewalks with sea walls, district lot surfaces (lawn, plaza,
// quay concrete), the sand of Sunwake Beach sloping into the surf, and the canal channels.

import * as THREE from 'three';
import { MeshBatch, tint } from '../core/meshBatch.js';
import { eachBlock, BLOCK, ROAD_HALF, WALK, blockLetter } from './cityPlan.js';
import { sidewalkTexture, sandTexture, lawnTexture, plazaTexture, quayTexture } from './groundTextures.js';
import { addCollider } from './collisionWorld.js';

export const WALK_Y = 0.18;
export const CANAL_HALF = 5;

const LOT_SURFACE = { D: 'plaza', A: 'plaza', R: 'walk', P: 'lawn', V: 'lawn', H: 'quay', C: 'walk' };

export function buildTerrain(group) {
  const walk = new MeshBatch({ tileU: 4, tileV: 4 });
  const lots = { plaza: new MeshBatch({ tileU: 8, tileV: 8 }), lawn: new MeshBatch({ tileU: 10, tileV: 10 }), quay: new MeshBatch({ tileU: 12, tileV: 12 }), walk: new MeshBatch({ tileU: 4, tileV: 4 }) };
  const sand = new MeshBatch({ tileU: 16, tileV: 16 });
  const white = tint('#ffffff');
  const r = ROAD_HALF;

  eachBlock((b) => {
    if (b.letter === '~') return;
    if (b.letter === 'S') {
      // sand from the road kerb out past the block edge, sloping under the waterline
      sand.flat(b.x0 + r, b.z0, b.x1 - 2, b.z1, 0.05, white);
      const x0 = b.x1 - 2, x1 = b.x1 + 26;
      sand.quad([x0, 0.05, b.z1], [x1, -2.2, b.z1], [x1, -2.2, b.z0], [x0, 0.05, b.z0], [0.08, 1, 0], [[x0 / 16, b.z1 / 16], [x1 / 16, b.z1 / 16], [x1 / 16, b.z0 / 16], [x0 / 16, b.z0 / 16]], white);
      // close the beach ends where it meets open water to the north and south
      if (blockLetter(b.i, b.j - 1) === '~') sand.quad([b.x0 + r, 0.05, b.z0], [b.x1 + 26, -2.2, b.z0], [b.x1 + 26, -2.2, b.z0 - 26], [b.x0 + r, -2.2, b.z0 - 26], [0, 1, -0.08], [[0, 0], [2, 0], [2, 2], [0, 2]], white);
      if (blockLetter(b.i, b.j + 1) === '~') sand.quad([b.x0 + r, -2.2, b.z1 + 26], [b.x1 + 26, -2.2, b.z1 + 26], [b.x1 + 26, 0.05, b.z1], [b.x0 + r, 0.05, b.z1], [0, 1, 0.08], [[0, 0], [2, 0], [2, 2], [0, 2]], white);
      return;
    }
    const ox0 = b.x0 + r, oz0 = b.z0 + r, ox1 = b.x1 - r, oz1 = b.z1 - r;
    const surface = LOT_SURFACE[b.letter] || 'walk';
    if (b.letter === 'C') {
      // two banks either side of a north-south canal
      const cx = b.cx;
      walk.box((ox0 + cx - CANAL_HALF) / 2, -3, (oz0 + oz1) / 2, cx - CANAL_HALF - ox0, 3 + WALK_Y, oz1 - oz0, white);
      walk.box((cx + CANAL_HALF + ox1) / 2, -3, (oz0 + oz1) / 2, ox1 - cx - CANAL_HALF, 3 + WALK_Y, oz1 - oz0, white);
      addCollider(cx - CANAL_HALF + 0.2, oz0 + 1, cx + CANAL_HALF - 0.2, oz1 - 1, 0.9, -5, 'canal');
      return;
    }
    walk.box(b.cx, -3, b.cz, ox1 - ox0, 3 + WALK_Y, oz1 - oz0, white);
    const inset = r + WALK;
    lots[surface].flat(b.x0 + inset, b.z0 + inset, b.x1 - inset, b.z1 - inset, WALK_Y + 0.01, white);
  });

  const std = (map, rough = 0.95) => new THREE.MeshStandardMaterial({ map, roughness: rough, vertexColors: true });
  const walkMesh = walk.toMesh(std(sidewalkTexture()), { cast: false });
  group.add(walkMesh);
  const tex = { plaza: plazaTexture(), lawn: lawnTexture(), quay: quayTexture(), walk: sidewalkTexture() };
  for (const k of Object.keys(lots)) if (lots[k].vertexCount) group.add(lots[k].toMesh(std(tex[k]), { cast: false }));
  group.add(sand.toMesh(std(sandTexture(), 1), { cast: false }));
}
