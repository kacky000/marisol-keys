// Scripted screenshot scenes built from the real game systems: each one places the player, cars,
// police, people and HUD state, steps the simulation, then frames the camera. One file per
// scene family under scenes/, shared helpers in sceneKit.js.

import { sunset, cover, night } from './scenes/chaseScenes.js';
import { boardwalk } from './scenes/beachScene.js';
import { harbor, quay } from './scenes/harborScenes.js';
import { map } from './scenes/phoneScene.js';
import { view } from './scenes/reviewCamera.js';

export const SCENES = { sunset, cover, boardwalk, harbor, quay, map, night, view };
