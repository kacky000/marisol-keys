// Small numeric helpers shared by every system.

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, v) => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
// Frame-rate independent exponential approach.
export const damp = (current, target, rate, dt) => lerp(current, target, 1 - Math.exp(-rate * dt));

export function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}
export const dampAngle = (current, target, rate, dt) => current + wrapAngle(target - current) * (1 - Math.exp(-rate * dt));

export const dist2 = (ax, az, bx, bz) => (ax - bx) * (ax - bx) + (az - bz) * (az - bz);
export const dist = (ax, az, bx, bz) => Math.sqrt(dist2(ax, az, bx, bz));

// Heading convention: heading 0 faces -Z (north), positive turns toward +X (east).
export const headingToDir = (h) => ({ x: Math.sin(h), z: -Math.cos(h) });
export const dirToHeading = (x, z) => Math.atan2(x, -z);

export function formatMoney(n) {
  return '$' + Math.round(n).toLocaleString('en-US');
}
