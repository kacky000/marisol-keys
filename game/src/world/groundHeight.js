// Walkable surface height at any point: roads, kerbs, sand, the raised boardwalk and the pier.

import { groundAt, BLOCK, blockLetter } from './cityPlan.js';
import { WALK_Y } from './terrain.js';
import { BOARDWALK, PIER } from '../props/beachfront.js';

export function groundHeight(x, z) {
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
