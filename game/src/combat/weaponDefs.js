// The arsenal, all invented: damage, fire rate, spread, range, pellets and magazine sizes.

export const WEAPONS = {
  fists: { id: 'fists', name: 'Fists', damage: 18, rate: 2.2, range: 1.8, spread: 0, pellets: 1, mag: 0, melee: true, price: 0 },
  bat: { id: 'bat', name: 'Seagrape Slugger', damage: 48, rate: 1.4, range: 2.5, spread: 0, pellets: 1, mag: 0, melee: true, price: 250 },
  pistol: { id: 'pistol', name: 'Marlin .38', damage: 34, rate: 4, range: 70, spread: 0.012, pellets: 1, mag: 12, auto: false, price: 400 },
  smg: { id: 'smg', name: 'Wasp SMG', damage: 20, rate: 12, range: 60, spread: 0.035, pellets: 1, mag: 32, auto: true, price: 1600 },
  shotgun: { id: 'shotgun', name: 'Breaker 12', damage: 16, rate: 1.3, range: 32, spread: 0.09, pellets: 8, mag: 6, auto: false, price: 2400 },
};

export const WEAPON_ORDER = ['fists', 'bat', 'pistol', 'smg', 'shotgun'];

// Little side-on silhouettes for the HUD weapon panel.
export function drawWeaponIcon(g, id, w, h) {
  g.clearRect(0, 0, w, h);
  g.fillStyle = '#fff6ea';
  g.strokeStyle = '#fff6ea';
  g.lineWidth = 3;
  const cy = h / 2;
  if (id === 'fists') {
    g.beginPath(); g.roundRect(w / 2 - 18, cy - 12, 36, 24, 8); g.fill();
    g.fillStyle = '#0b2233';
    for (let k = 0; k < 3; k++) g.fillRect(w / 2 - 10 + k * 8, cy - 12, 2, 10);
    return;
  }
  if (id === 'bat') {
    // a tapered bat lying at an angle, taped grip
    g.save();
    g.translate(w / 2, cy);
    g.rotate(-0.35);
    g.beginPath(); g.moveTo(-40, -2.5); g.lineTo(30, -7); g.quadraticCurveTo(40, 0, 30, 7); g.lineTo(-40, 2.5); g.closePath(); g.fill();
    g.fillStyle = '#0b2233';
    for (let k = 0; k < 3; k++) g.fillRect(-38 + k * 5, -3, 2, 6);
    g.restore();
    return;
  }
  if (id === 'pistol') {
    g.fillRect(w / 2 - 26, cy - 10, 48, 10);
    g.fillRect(w / 2 + 8, cy - 2, 12, 20);
    g.fillRect(w / 2 - 6, cy, 6, 6);
  } else if (id === 'smg') {
    g.fillRect(w / 2 - 36, cy - 9, 64, 11);
    g.fillRect(w / 2 + 12, cy, 10, 18);
    g.fillRect(w / 2 - 8, cy, 8, 22);
    g.fillRect(w / 2 + 28, cy - 6, 14, 6);
  } else if (id === 'shotgun') {
    g.fillRect(w / 2 - 50, cy - 8, 74, 7);
    g.fillRect(w / 2 - 44, cy, 50, 5);
    g.beginPath(); g.moveTo(w / 2 + 24, cy - 8); g.lineTo(w / 2 + 50, cy - 4); g.lineTo(w / 2 + 50, cy + 10); g.lineTo(w / 2 + 22, cy + 2); g.fill();
  }
}
