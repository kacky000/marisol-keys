// 2. On foot on the Sunwake boardwalk: Ozzie briefs Tessa face to face, the Tower 3 marker
// glows down the beach, sunbathers and waders fill the sand and surf.

import * as THREE from 'three';
import { Marker } from '../../missions/markers.js';
import { STORY } from '../../missions/storyMissions.js';
import { B, car, crowd } from '../sceneKit.js';

export const boardwalk = {
  hour: 16.1,
  setup(game) {
    game.peds.target = 0;
    game.traffic.target = 0;
    const p = game.player;
    p.placeAt(12 * B + 12.5, 9 * B + 4, 2.6);
    p.weapon = 'fists';
    crowd(game, [[12 * B + 13.5, 9 * B + 14, 0.2, 'walk'], [12 * B + 15.5, 9 * B + 9, Math.PI, 'walk', 'dog'], [12 * B + 26, 9 * B + 18, 1.2, 'idle'], [12 * B + 27, 9 * B + 19, -1.8, 'idle'], [12 * B + 11.5, 9 * B + 26, 0, 'walk'], [12 * B + 33, 9 * B + 12, 2.2, 'idle'], [12 * B + 20, 9 * B + 32, -0.4, 'walk'], [12 * B + 16, 8 * B + 56, 2.9, 'walk'],
      [12 * B + 24, 9 * B + 23, 1.57, 'sunbathe'], [12 * B + 30, 9 * B + 26, 1.4, 'sunbathe'], [12 * B + 22, 9 * B + 38, 1.7, 'sunbathe'], [12 * B + 29, 9 * B + 41, 1.5, 'idle'], [12 * B + 13, 9 * B + 36, 3.0, 'walk'], [12 * B + 42, 9 * B + 20, 0.6, 'idle'], [12 * B + 47, 9 * B + 30, -1.4, 'walk'],
      [13 * B + 5, 9 * B + 12, -1.6, 'wade'], [13 * B + 8, 9 * B + 16, 1.4, 'wade'], [13 * B + 4, 9 * B + 30, -1.2, 'wade'], [13 * B + 10, 9 * B + 26, 1.7, 'wade']]);
    game.boardMarker = new Marker(game.scene, 12 * B + 36, 9 * B + 30, { color: '#ffd23f', radius: 2.2, height: 9 });
    car(game, 'taxi', 12 * B - 1.9, 9 * B + 10, Math.PI, 0);
    car(game, 'sedan', 12 * B + 1.9, 9 * B - 14, 0, 0, '#ff8fb1');
    game.state.story = 1;
    game.state.money = 1150;
    game.hud.setObjective('LIFEGUARD TOWER 3', 'Walk to <b>Lifeguard Tower 3</b> on Sunwake Beach');
    game.dialogue.showStatic('ozzie', 'Marco stashed a cooler under Lifeguard Tower 3. Coral stripes, can\'t miss it. Beach patrol loves a cooler — be quick.');
    game.missions.active = STORY[1];
    game.missions.marker = game.boardMarker;
    p.placeAt(12 * B + 12.4, 9 * B - 0.4, Math.PI - 0.5);
    game.contacts.place('ozzie', 12 * B + 12.6, 9 * B + 2.6, -0.35);
    game.contacts.talking = true;
  },
  steps: 20,
  finalize(game) {
    const p = game.player;
    p.heading = Math.PI - 0.55;
    p.syncRig();
    game.boardMarker.update(1.2);
    game.hud.showDistrict({ name: 'Sunwake Beach', sub: 'BOARDWALK & SURF' });
    return { pos: new THREE.Vector3(12 * B + 7.3, p.pos.y + 2.0, 9 * B - 0.6), look: new THREE.Vector3(12 * B + 22, p.pos.y + 1.0, 9 * B + 6.5) };
  },
};
