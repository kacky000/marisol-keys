// The master plan of Marisol Keys: a 16 x 16 grid of city blocks, each tagged with a district
// letter. Roads run along block edges, causeways cross the bay to the west. Every other system
// (buildings, roads, minimap, map screen, traffic, police) reads the city from here.

export const BLOCK = 64;          // block pitch in metres (road centre to road centre)
export const ROAD_HALF = 7;       // half width of a four-lane street
export const WALK = 4;            // sidewalk width
export const GRID = 16;
export const WORLD_SIZE = BLOCK * GRID;

// ~ open water, S beach, D downtown, A art-deco boulevards, R neighbourhoods, P park,
// C canal quarter, H container harbour, V hillside villas.
const DISTRICT_MAP = [
  '~~~~~~~~~~~~~~~~',
  '~~~VVVVRRRAAS~~~',
  '~~VVVVRRDDAAS~~~',
  '~~VVVRDDDDAAS~~~',
  '~~VVRDDDDDAAS~~~',
  '~~RRRDDDDPAAS~~~',
  '~~CCCRDDDRAAS~~~',
  '~~CCCRRPRRAAS~~~',
  '~~CCCRRRRRAAS~~~',
  '~~CCCRRPRRAAS~~~',
  '~~HHHRRRRRAAS~~~',
  '~~HHHHRRRRAAS~~~',
  '~~HHHHHRRRRAS~~~',
  '~~HHHHHHRRRRS~~~',
  '~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~~~~',
];

export const DISTRICTS = {
  V: { name: 'Mirador Hills', sub: 'HILLSIDE VILLAS', color: '#c9b98a', map: '#d8cf9e' },
  D: { name: 'Glasswater', sub: 'DOWNTOWN', color: '#6f8fb3', map: '#9fb6cf' },
  A: { name: 'Pastel Mile', sub: 'ART DECO BOULEVARDS', color: '#f2a7b8', map: '#f6c4cf' },
  S: { name: 'Sunwake Beach', sub: 'BOARDWALK & SURF', color: '#f3dca2', map: '#f5e2ae' },
  C: { name: 'Lantern Canals', sub: 'CANAL QUARTER', color: '#8fc7b6', map: '#a9d6c5' },
  H: { name: 'Saltgate Harbor', sub: 'CONTAINER PORT', color: '#9a8f86', map: '#b5aca2' },
  RN: { name: 'Palmetto Flats', sub: 'NEIGHBOURHOOD', color: '#e8c39a', map: '#ead1b0' },
  RS: { name: 'Old Keys', sub: 'NEIGHBOURHOOD', color: '#e2b48d', map: '#e8c9a8' },
  P: { name: 'Seagrape Park', sub: 'CITY PARK', color: '#7fbf6a', map: '#9fd38a' },
  W: { name: 'Marisol Bay', sub: 'OPEN WATER', color: '#2a7fa8', map: '#3c8fb4' },
  E: { name: 'Turquoise Sound', sub: 'OPEN OCEAN', color: '#2a9fb8', map: '#3fa9c0' },
  X: { name: 'Pelican Causeway', sub: 'TO THE MAINLAND', color: '#888', map: '#888' },
};

// Named streets (for the map screen and the HUD).
export const AVENUES = { 2: 'Bayfront Way', 5: 'Mirador Ave', 7: 'Halcyon Ave', 10: 'Marisol Boulevard', 12: 'Coral Parade' };
export const STREETS = { 1: 'Vista Rd', 3: 'Lumen St', 4: 'Sundown Boulevard', 5: 'Pelican Causeway', 7: 'Seagrape St', 9: 'Flamingo Way', 10: 'Tarpon Causeway', 12: 'Ferry St', 14: 'Quay Road' };

// Causeways: long bridges to the mainland across Marisol Bay (west).
export const CAUSEWAYS = [
  { name: 'Pelican Causeway', z: 5 * BLOCK, x0: -760, x1: 2 * BLOCK },
  { name: 'Tarpon Causeway', z: 10 * BLOCK, x0: -760, x1: 2 * BLOCK },
];

export function blockLetter(i, j) {
  if (i < 0 || j < 0 || i >= GRID || j >= GRID) return '~';
  return DISTRICT_MAP[j][i];
}

export const isUrban = (l) => l !== '~' && l !== 'S';
export const isLandLetter = (l) => l !== '~';

export function districtKey(i, j) {
  const l = blockLetter(i, j);
  if (l === 'R') return j <= 5 ? 'RN' : 'RS';
  if (l === '~') return i >= 12 ? 'E' : 'W';
  return l;
}

export function blockAtPoint(x, z) {
  return { i: Math.floor(x / BLOCK), j: Math.floor(z / BLOCK) };
}

export function districtAtPoint(x, z) {
  if (x < 2 * BLOCK - 10) {
    for (const c of CAUSEWAYS) if (Math.abs(z - c.z) < 12 && x > c.x0) return { key: 'X', ...DISTRICTS.X, name: c.name };
  }
  const { i, j } = blockAtPoint(x, z);
  const key = districtKey(i, j);
  return { key, ...DISTRICTS[key] };
}

// True where a road exists along the vertical grid line i between rows j and j+1.
export function hasVerticalRoad(i, j) {
  if (j < 0 || j >= GRID) return false;
  return isUrban(blockLetter(i - 1, j)) || isUrban(blockLetter(i, j));
}
export function hasHorizontalRoad(i, j) {
  if (i < 0 || i >= GRID) return false;
  return isUrban(blockLetter(i, j - 1)) || isUrban(blockLetter(i, j));
}

// Ground type at a world point: 'road', 'walk', 'lot', 'sand', 'water'.
export function groundAt(x, z) {
  for (const c of CAUSEWAYS) {
    if (x >= c.x0 && x <= c.x1 && Math.abs(z - c.z) <= ROAD_HALF) return 'road';
    if (x >= c.x0 - 40 && x < c.x0 && Math.abs(z - c.z) <= 20) return 'road'; // mainland ferry ramp
  }
  const { i, j } = blockAtPoint(x, z);
  const l = blockLetter(i, j);
  const lx = x - i * BLOCK, lz = z - j * BLOCK;
  const nearV = lx < ROAD_HALF ? i : lx > BLOCK - ROAD_HALF ? i + 1 : -1;
  const nearH = lz < ROAD_HALF ? j : lz > BLOCK - ROAD_HALF ? j + 1 : -1;
  if (nearV >= 0 && hasVerticalRoad(nearV, j)) return 'road';
  if (nearH >= 0 && hasHorizontalRoad(i, nearH)) return 'road';
  if (l === '~') return 'water';
  if (l === 'S') return lx > BLOCK - 4 ? 'water' : 'sand';
  const inner = Math.min(lx, lz, BLOCK - lx, BLOCK - lz);
  return inner < ROAD_HALF + WALK ? 'walk' : 'lot';
}

// Every block with its letter and interior rectangle (inside the sidewalks).
export function eachBlock(fn) {
  for (let j = 0; j < GRID; j++) {
    for (let i = 0; i < GRID; i++) {
      const letter = blockLetter(i, j);
      const x0 = i * BLOCK, z0 = j * BLOCK;
      const inset = ROAD_HALF + WALK;
      fn({ i, j, letter, key: districtKey(i, j), x0, z0, x1: x0 + BLOCK, z1: z0 + BLOCK,
        ix0: x0 + inset, iz0: z0 + inset, ix1: x0 + BLOCK - inset, iz1: z0 + BLOCK - inset,
        cx: x0 + BLOCK / 2, cz: z0 + BLOCK / 2 });
    }
  }
}

// Points of interest used by missions, shops, activities and the map screen.
export const PLACES = {
  safehouse: { x: 7 * BLOCK + 26, z: 8 * BLOCK + 9.5, label: 'Old Keys Safehouse' },
  ozzieShop: { x: 3 * BLOCK - 4, z: 13 * BLOCK + 50, label: "Ozzie's Bait Shop" },
  coralRoom: { x: 11 * BLOCK - 3, z: 4 * BLOCK + 30, label: 'The Coral Room' },
  boardwalk: { x: 12 * BLOCK + 12, z: 7 * BLOCK + 20, label: 'Sunwake Boardwalk' },
  lifeguard3: { x: 12 * BLOCK + 40, z: 9 * BLOCK + 30, label: 'Lifeguard Tower 3' },
  priyaLoft: { x: 3 * BLOCK + 10, z: 7 * BLOCK + 13, label: 'Static 88 Pirate Studio' },
  craneYard: { x: 4 * BLOCK + 30, z: 13 * BLOCK + 30, label: 'Crane Yard 7' },
  lumenTower: { x: 7 * BLOCK + 32, z: 3 * BLOCK + 13, label: 'Lumen Tower' },
  miradorGate: { x: 4 * BLOCK + 32, z: 1 * BLOCK + 13, label: 'Hale Estate Gate' },
  causewayEnd: { x: -640, z: 5 * BLOCK, label: 'Mainland Ferry Ramp' },
  gunShop: { x: 9 * BLOCK + 13, z: 10 * BLOCK + 32, label: 'Keys Tactical' },
  paintShop: { x: 6 * BLOCK + 32, z: 11 * BLOCK + 13, label: 'Pastel Paint & Body' },
  garage: { x: 9 * BLOCK + 32, z: 12 * BLOCK + 13, label: 'Sunbelt Garage' },
  taxiDepot: { x: 10 * BLOCK + 13, z: 9 * BLOCK + 32, label: 'Keys Cab Co.' },
  raceStart: { x: 10 * BLOCK, z: 12 * BLOCK + 32, label: 'Night Sprint Line' },
  courier: { x: 8 * BLOCK + 13, z: 6 * BLOCK + 32, label: 'Sunrise Couriers' },
};
