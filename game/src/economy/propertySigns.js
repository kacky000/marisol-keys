// Estate-agent boards outside each property: "FOR SALE" with the price and daily income, flipping
// to a green "OWNED · TESSA VANE" board once bought.

import * as THREE from 'three';
import { groundHeight } from '../world/groundHeight.js';

function boardTexture(lines, bg, fg) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 160;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, 256, 160);
  g.strokeStyle = fg; g.lineWidth = 6; g.strokeRect(6, 6, 244, 148);
  g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '900 38px "Arial Black", Arial'; g.fillText(lines[0], 128, 48);
  g.font = '700 22px "Segoe UI", Arial'; g.fillText(lines[1], 128, 92);
  g.font = '700 18px "Segoe UI", Arial'; g.fillText(lines[2], 128, 124);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class PropertySigns {
  constructor(scene, properties) {
    this.boards = properties.map((p) => {
      const g = new THREE.Group();
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.4, 0.12), new THREE.MeshStandardMaterial({ color: '#f4f1ea' }));
      post.position.y = 1.2;
      const mat = new THREE.MeshStandardMaterial({ map: boardTexture(['FOR SALE', `$${p.price.toLocaleString('en-US')}`, `+$${p.income} a day`], '#ff6b5a', '#ffffff'), emissive: '#ffffff', emissiveIntensity: 0.15 });
      mat.emissiveMap = mat.map;
      const board = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.0, 0.06), mat);
      board.position.y = 2.2;
      g.add(post, board);
      g.position.set(p.x + 1.6, groundHeight(p.x, p.z), p.z);
      scene.add(g);
      return { id: p.id, name: p.name, board, owned: false };
    });
  }

  update(ownedIds, time) {
    for (const b of this.boards) {
      const owned = ownedIds.includes(b.id);
      if (owned !== b.owned) {
        b.owned = owned;
        b.board.material.map = owned ? boardTexture(['OWNED', 'TESSA VANE', b.name], '#2e9e58', '#ffffff') : b.board.material.map;
        b.board.material.emissiveMap = b.board.material.map;
        b.board.material.needsUpdate = true;
      }
      b.board.rotation.y = Math.sin(time * 0.8 + b.board.id) * 0.05;
    }
  }
}
