// 4. The phone open on the Story tab: the illustrated island map beside the Tide Book list,
// four missions in, with jobs, pages and a property to show on the progress tiles.

import * as THREE from 'three';
import { B } from '../sceneKit.js';

export const map = {
  hour: 15.5,
  setup(game) {
    game.peds.target = 0;
    game.traffic.target = 0;
    game.player.placeAt(9 * B + 30, 7 * B + 9.5, 0.6);
    game.state.story = 4;
    game.state.money = 6200;
    game.state.properties = ['surf-shack'];
    game.state.stats = { missions: 4, fares: 6, deliveries: 2, races: 1, bestRace: 71.4, kills: 9, stars: 0 };
  },
  steps: 2,
  finalize(game) {
    game.phone.tab = 'story';
    game.phone.toggle(true);
    const p = game.player;
    return { pos: new THREE.Vector3(p.pos.x - 30, 40, p.pos.z + 40), look: new THREE.Vector3(p.pos.x, 0, p.pos.z) };
  },
};
