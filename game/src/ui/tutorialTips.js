// One-time contextual tips: the first car, the first wanted star, the first gun in hand, the first
// boat, the first mission, the first drive in the rain, the first waypoint. Remembered in the save
// so they never nag twice.

import { on } from '../core/events.js';

const TIPS = {
  car: 'Driving: <b>W/S</b> throttle and brake · <b>Space</b> handbrake drift · <b>Q</b> radio · <b>V</b> camera · <b>F</b> get out',
  boat: 'Boats: steer round the island · <b>F</b> near a quay or the beach to step off',
  wanted: 'Wanted: break line of sight and leave the <b>search circle</b> on the radar · a <b>respray</b> or a gold <b>bribe star</b> helps',
  gun: 'Combat: <b>right-click</b> aim · <b>left-click</b> fire · <b>X</b> crouch in cover · <b>R</b> reload',
  mission: 'Story contacts wait at the <b>yellow markers</b> · <b>M</b> opens the phone with the map, story and jobs',
  rain: 'Wet roads: tyres grip less in a storm · brake earlier and ease into the corners',
  waypoint: 'Waypoint set · follow the purple route, or press <b>T</b> on foot to hail a <b>Keys Cab</b> there',
};

export function startTutorialTips(game) {
  const show = (key) => {
    const seen = (game.state.tips ??= []);
    if (seen.includes(key) || game.shotMode) return;
    seen.push(key);
    setTimeout(() => game.hud.toast(TIPS[key], 7), 600);
  };
  on('player:entered', ({ vehicle }) => {
    show(vehicle.spec.boat ? 'boat' : 'car');
    if (!vehicle.spec.boat && (game.weather.rainAmount || 0) > 0.3) show('rain');
  });
  on('waypoint:set', () => show('waypoint'));
  on('wanted:changed', ({ stars }) => { if (stars > 0) show('wanted'); });
  on('player:shot', () => show('gun'));
  on('mission:passed', () => show('mission'));
}
