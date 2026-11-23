// Extra: a free camera for art review with live traffic and people around it.
// ?shot=view&cam=x,y,z,lookX,lookY,lookZ&hour=h

import * as THREE from 'three';

const query = () => new URLSearchParams(location.search);

export const view = {
  hour: Number(query().get('hour') || 16.5),
  setup(game) {
    const c = (query().get('cam') || '400,30,600,450,0,500').split(',').map(Number);
    this.cam = c;
    game.peds.target = 30;
    game.traffic.target = 24;
    game.player.placeAt(c[3], c[5]);
    game.player.rig.visible = false;
  },
  steps: 90,
  finalize() {
    const c = this.cam;
    return { pos: new THREE.Vector3(c[0], c[1], c[2]), look: new THREE.Vector3(c[3], c[4], c[5]) };
  },
};
