// Seeded pseudo-random numbers so the city and screenshot scenes are identical on every run.

export function createRng(seed = 1) {
  let s = (seed >>> 0) || 1;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (a, b) => a + (b - a) * next(),
    int: (a, b) => Math.floor(a + (b - a + 1) * next()),
    pick: (list) => list[Math.floor(next() * list.length)],
    chance: (p) => next() < p,
    sign: () => (next() < 0.5 ? -1 : 1),
  };
}

// Hash two integers to a stable 0..1 value (used for per-block decisions).
export function hash2(a, b, salt = 0) {
  let h = Math.imul(a * 374761393 + b * 668265263 + salt * 2147483647, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1103515245);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// The shared random stream for gameplay; reseeded by screenshot mode.
export const rng = createRng(1);
export function reseed(seed) {
  const fresh = createRng(seed);
  Object.assign(rng, fresh);
}
