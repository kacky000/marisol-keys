// Frees the GPU buffers of a model that has left the game for good (a recycled car, a
// pedestrian who walked out of range). Geometry and materials shared between many models are
// marked `userData.shared` where they are created and are never freed here.

export function markShared(...things) {
  for (const t of things) t.userData.shared = true;
  return things[0];
}

export function disposeTree(root) {
  root.traverse((o) => {
    if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose();
    const mats = o.material ? [].concat(o.material) : [];
    for (const m of mats) {
      if (m.userData.shared) continue;
      // canvas textures made for one model only (decals are cached and shared, so skip maps
      // that are marked shared too)
      if (m.map && !m.map.userData?.shared) m.map.dispose();
      m.dispose();
    }
  });
}
