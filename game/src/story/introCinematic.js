// New-game intro: letterbox bars, a camera glide from high over the bay down to Tessa on the
// harbor sidewalk, and three captions setting up the story. Space or a click skips it.

import * as THREE from 'three';
import { menuPressed } from '../core/input.js';

const CAPTIONS = [
  [0.0, 'Marisol Keys. Population 410,000. Sunshine 340 days a year.'],
  [3.2, 'Six years ago Tessa Vane left on the last ferry out.'],
  [6.4, 'Her brother Marco never left. Now he never will.'],
];
const LENGTH = 9.6;

export class IntroCinematic {
  constructor(game) {
    this.game = game;
    this.t = -1;
    this.el = document.createElement('div');
    this.el.id = 'intro';
    this.el.className = 'hidden';
    this.el.innerHTML = '<div class="bar top"></div><div class="bar bottom"><div class="intro-caption"></div><div class="intro-skip">SPACE · skip</div></div>';
    document.body.appendChild(this.el);
    this.caption = this.el.querySelector('.intro-caption');
  }

  get playing() { return this.t >= 0; }

  start() {
    const p = this.game.player;
    this.t = 0;
    this.from = new THREE.Vector3(p.pos.x - 160, 120, p.pos.z + 140);
    this.fromLook = new THREE.Vector3(p.pos.x + 200, 20, p.pos.z - 250);
    this.el.classList.remove('hidden');
    this.game.player.controlsLocked = true;
    this.game.hud.show(false);
  }

  stop() {
    const g = this.game;
    this.t = -1;
    this.el.classList.add('hidden');
    g.camera.fixed = null;
    g.camera.yaw = g.player.heading;
    g.player.controlsLocked = false;
    g.hud.show(true);
    g.hud.bigMessage('MARISOL KEYS', 'Find Ozzie at the bait shop — follow the yellow route', 4);
    g.hud.toast('Tip: press <b>M</b> for the map, <b>F</b> to take a car');
  }

  update(dt) {
    if (this.t < 0) return;
    this.t += dt;
    if (this.t > LENGTH || menuPressed('Space') || menuPressed('Escape')) { this.stop(); return; }
    const p = this.game.player;
    const k = Math.min(1, this.t / (LENGTH - 1));
    const e = k * k * (3 - 2 * k);
    // end behind Tessa's shoulder, as the gameplay camera will be
    const toPos = new THREE.Vector3(p.pos.x - Math.sin(p.heading) * 4.4, p.pos.y + 2.3, p.pos.z + Math.cos(p.heading) * 4.4);
    const toLook = new THREE.Vector3(p.pos.x + Math.sin(p.heading) * 6, p.pos.y + 1.4, p.pos.z - Math.cos(p.heading) * 6);
    const pos = this.from.clone().lerp(toPos, e);
    pos.y += Math.sin(e * Math.PI) * 25;
    this.game.camera.fixed = { pos, look: this.fromLook.clone().lerp(toLook, Math.pow(e, 0.7)) };
    let text = '';
    for (const [at, line] of CAPTIONS) if (this.t >= at) text = line;
    if (this.caption.textContent !== text) this.caption.textContent = text;
  }
}
