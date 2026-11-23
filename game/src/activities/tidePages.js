// Collectibles: twenty loose pages of Marco's Tide Book, blown all over the island. Each pays
// out, reveals a line of the ledger, and the full set unlocks a bonus.

import * as THREE from 'three';
import { canvasTexture } from '../core/canvasTexture.js';
import { groundHeight } from '../world/groundHeight.js';
import { emit } from '../core/events.js';

const B = 64;
export const PAGE_SPOTS = [
  [12 * B + 44, 3 * B + 30], [12 * B + 30, 12 * B + 50], [13 * B + 60, 7 * B + 32], [11 * B + 32, 6 * B + 32], [10 * B + 32, 10 * B + 32],
  [8 * B + 32, 2 * B + 9], [6 * B + 20, 5 * B + 20], [7 * B + 32, 7 * B + 32], [9 * B + 32, 5 * B + 32], [5 * B + 9.5, 3 * B + 40],
  [3 * B + 32, 1 * B + 20], [2 * B + 30, 4 * B + 40], [3 * B + 32, 6 * B + 50], [2 * B + 32, 8 * B + 32], [4 * B + 32, 9 * B + 20],
  [2 * B + 20, 11 * B + 30], [6 * B + 40, 13 * B + 56], [7 * B + 32, 12 * B + 32], [8 * B + 32, 9 * B + 32], [-300, 5 * B],
];
const LINES = [
  'March: H. — $40k, Crane 7, "no inspection".', 'Gull wants the night boats off the books.', 'Paid harbor patrol to look at the sunset.',
  'Ferry manifests rewritten — 12 containers vanished.', 'Lulu says the Coral Room back office is wired.', 'Hale\'s estate: new pool, cash only.',
  'Ozzie knew. Ozzie always knows.', 'Priya can broadcast this if I get it to her.', 'Evidence van — keys in the visor, always.',
  'If you\'re reading this, Tess, I\'m sorry.', 'Crane Yard 7 has a second gate on Quay Road.', 'Captain H. signs every seizure himself.',
  'Gull keeps a black Strata in the Glasswater garage.', 'The causeway cams go down at 2am.', 'Tide tables in the margins aren\'t tide tables.',
  '$1.2m through the Pastel Mile hotels last year.', 'Two sets of books. Burn neither.', 'Lumen Tower penthouse: Hale\'s "office".',
  'Seagrape Park fountain, third tile — spare key.', 'The mainland papers will want everything.',
];

let pageTex = null;
function texture() {
  pageTex ??= canvasTexture(64, 80, (g, w, h) => {
    g.fillStyle = '#fff6dc'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#e8d9b0'; g.fillRect(0, 0, 8, h);
    g.strokeStyle = '#8fb3d5'; g.lineWidth = 1.5;
    for (let y = 14; y < h - 6; y += 8) { g.beginPath(); g.moveTo(10, y); g.lineTo(w - 4, y); g.stroke(); }
    g.fillStyle = '#c0392b'; g.font = 'bold 12px Georgia'; g.fillText('TIDE', 18, 12);
  }, { repeat: false, seed: 81 });
  return pageTex;
}

export class TidePages {
  constructor(game) {
    this.game = game;
    this.items = [];
    const mat = new THREE.MeshStandardMaterial({ map: texture(), emissive: '#ffe9a0', emissiveIntensity: 0.6, side: THREE.DoubleSide });
    const ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.8, 0.6), transparent: true, opacity: 0.6, side: THREE.DoubleSide });
    PAGE_SPOTS.forEach(([x, z], k) => {
      const g = new THREE.Group();
      const page = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.75), mat);
      page.position.y = 1.1;
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.7, 24), ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.05;
      g.add(page, ring);
      g.position.set(x, Math.max(groundHeight(x, z), 0), z);
      game.scene.add(g);
      this.items.push({ k, x, z, group: g, page });
    });
  }

  get found() { return this.game.state.pages || []; }

  refresh() {
    for (const it of this.items) it.group.visible = !this.found.includes(it.k);
  }

  update(dt, time) {
    const p = this.game.player;
    const st = this.game.state;
    st.pages ??= [];
    for (const it of this.items) {
      if (!it.group.visible) continue;
      it.page.rotation.y = time * 1.6 + it.k;
      it.page.position.y = 1.1 + Math.sin(time * 2 + it.k) * 0.15;
      const r = p.vehicle ? 3.2 : 1.6;
      if ((p.pos.x - it.x) ** 2 + (p.pos.z - it.z) ** 2 < r * r) {
        it.group.visible = false;
        st.pages.push(it.k);
        st.money += 250;
        const n = st.pages.length;
        this.game.hud.toast(`<b>Tide Page ${n}/${PAGE_SPOTS.length}</b> · +$250<br><i>"${LINES[it.k]}"</i>`, 6);
        emit('sound', { name: 'checkpoint' });
        if (n === PAGE_SPOTS.length) {
          st.money += 5000;
          this.game.hud.bigMessage('THE TIDE BOOK IS WHOLE', 'Every page found · +$5,000', 4);
          emit('sound', { name: 'passed' });
        }
      }
    }
  }
}
