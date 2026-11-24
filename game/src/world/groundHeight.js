// Walkable surface height at any point: roads, kerbs, sand, the raised boardwalk and the pier.

import { groundAt, BLOCK, blockLetter } from './cityPlan.js';
import { WALK_Y } from './terrain.js';
import { BOARDWALK, PIER } from '../props/beachfront.js';
import { rampHeight } from '../activities/stuntJumps.js';
import { MAINLAND_SHORE } from './mainland.js';
import { FERRY_HULL } from '../water/carFerry.js';

// Stunt ramps rise above whatever surface they sit on.
export function groundHeight(x, z) {
  return Math.max(surfaceHeight(x, z), rampHeight(x, z));
}

function surfaceHeight(x, z) {
  if (x >= PIER.x0 && x <= PIER.x1 && Math.abs(z - PIER.z) <= PIER.half) return 1.2;
  const kind = groundAt(x, z);
  if (kind === 'road') return 0.03;
  if (kind === 'sand') {
    if (x >= BOARDWALK.x0 && x <= BOARDWALK.x1) return BOARDWALK.y;
    return 0.05;
  }
  if (kind === 'water') {
    // beach slopes into the surf east of the sand
    const i = Math.floor(x / BLOCK), j = Math.floor(z / BLOCK);
    if (blockLetter(i, j) === 'S' || blockLetter(i - 1, j) === 'S') {
      const edge = (blockLetter(i, j) === 'S' ? i + 1 : i) * BLOCK - 2;
      return Math.max(-2.2, 0.05 - (x - edge) * (2.25 / 28));
    }
    return -3;
  }
  return WALK_Y;
}

export const isWater = (x, z) => groundHeight(x, z) < -0.6;

// Water a boat can sail: open sea and the bay, under the causeways, but not over the beach shallows or the pier.
export function navigable(x, z) {
  if (x >= PIER.x0 - 1 && x <= PIER.x1 + 1 && Math.abs(z - PIER.z) <= PIER.half + 1.2) return false;
  if (x < MAINLAND_SHORE + 32) return false; // the mainland shore and its ferry quays
  if (Math.abs(x - FERRY_HULL.x) < FERRY_HULL.halfLen && Math.abs(z - FERRY_HULL.z) < FERRY_HULL.halfWidth) return false; // the car ferry
  const i = Math.floor(x / BLOCK), j = Math.floor(z / BLOCK);
  const l = blockLetter(i, j);
  if (l === 'S') return x > (i + 1) * BLOCK + 10;
  if (l !== '~') return false;
  if (blockLetter(i - 1, j) === 'S' && x < i * BLOCK + 10) return false;
  // keep clear of quay roads along the shore (they overhang the water by half a road)
  const lx = x - i * BLOCK, lz = z - j * BLOCK;
  const nearShore = (lx < 9 && blockLetter(i - 1, j) !== '~') || (lx > BLOCK - 9 && blockLetter(i + 1, j) !== '~' && blockLetter(i + 1, j) !== 'S')
    || (lz < 9 && blockLetter(i, j - 1) !== '~') || (lz > BLOCK - 9 && blockLetter(i, j + 1) !== '~');
  return !nearShore;
}
