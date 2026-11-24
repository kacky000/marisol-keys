// A pick-up game of beach volleyball on Sunwake Beach: a net between two posts, two players a
// side, and a ball that rallies back and forth in high arcs; whoever it's coming to steps under
// it with arms up, the others wait on their toes.

import * as THREE from 'three';
import { MeshBatch, tint } from '../core/meshBatch.js';
import { buildHuman, poseHuman, randomOutfit } from '../peds/humanModel.js';
import { createRng } from '../core/rng.js';

const COURT = { x: 12 * 64 + 27, z: 11 * 64 + 52 };   // centre of the net, clear of the tower
const HALF = 7;                                      // metres from net to back line
const RALLY = 1.6;                                   // seconds per hit

export function buildBeachVolleyball(group) {
  const rng = createRng(312);
  const b = new MeshBatch();
  const post = tint('#f4f1ea'), net = tint('#2b2b2b'), tape = tint('#ffffff'), line = tint('#3a6fd8');
  for (const s of [-1, 1]) b.orientedBox(COURT.x + s * 4.6, 1.25, COURT.z, 0.12, 2.5, 0.12, 0, post);
  b.orientedBox(COURT.x, 2.25, COURT.z, 9.2, 0.08, 0.04, 0, tape);
  for (let k = 0; k < 9; k++) b.orientedBox(COURT.x - 4.4 + k * 1.1, 1.85, COURT.z, 0.03, 0.8, 0.02, 0, net);
  for (let k = 0; k < 4; k++) b.orientedBox(COURT.x, 1.5 + k * 0.2, COURT.z, 9.0, 0.02, 0.02, 0, net);
  // boundary ropes on the sand
  for (const s of [-1, 1]) {
    b.orientedBox(COURT.x + s * 4, 0.07, COURT.z, 0.08, 0.03, HALF * 2, 0, line);
    b.orientedBox(COURT.x, 0.07, COURT.z + s * HALF, 8, 0.03, 0.08, 0, line);
  }
  group.add(b.toMesh(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 })));
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), new THREE.MeshStandardMaterial({ color: '#ffe36e', roughness: 0.5 }));
  group.add(ball);
  // two a side, spread across their half
  const players = [[-2, -4.2], [2, -3], [-1.8, 3.4], [2.2, 4.4]].map(([dx, dz]) => {
    const rig = buildHuman({ ...randomOutfit(rng), shorts: true, dress: null, bag: null, shoes: '#d9b98a' });
    const home = { x: COURT.x + dx, z: COURT.z + dz };
    rig.position.set(home.x, 0.05, home.z);
    rig.rotation.y = dz < 0 ? Math.PI : 0; // facing the net
    group.add(rig);
    return { rig, home };
  });
  const order = [0, 2, 1, 3]; // the ball goes over the net every hit
  return (time, dt) => {
    const hit = Math.floor(time / RALLY), u = (time / RALLY) % 1;
    const from = players[order[hit % 4]], to = players[order[(hit + 1) % 4]];
    const fx = from.home.x, fz = from.home.z, tx = to.home.x, tz = to.home.z;
    ball.position.set(fx + (tx - fx) * u, 2.3 + Math.sin(u * Math.PI) * 4.5, fz + (tz - fz) * u);
    players.forEach((p, k) => {
      const receiving = p === to && u > 0.6, hitting = p === from && u < 0.15;
      poseHuman(p.rig, receiving ? 'walk' : 'idle', receiving ? 1.5 : 0, dt);
      if (receiving || hitting) {
        p.rig.userData.arms[0].rotation.set(2.6, 0, -0.2);
        p.rig.userData.arms[1].rotation.set(2.6, 0, 0.2);
      }
      p.rig.position.y = 0.05 + (hitting ? Math.sin(u / 0.15 * Math.PI) * 0.35 : 0);
    });
  };
}
