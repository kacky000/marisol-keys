// Builds the interface layers the game draws into: HUD, dialogue box, phone, and the title,
// pause, settings and controls screens. Mounted once at start-up, before any system runs.

function hudMarkup() {
  return `
<div id="hud" class="hidden">
  <div id="hud-logo"><span class="logo-mk">MARISOL</span><span class="logo-keys">KEYS</span></div>
  <div id="hud-objective" class="hidden"><div class="obj-title"></div><div class="obj-text"></div><div class="obj-timer"></div></div>
  <div id="hud-topright">
    <div id="hud-clock"></div>
    <div id="hud-weapon"><canvas id="weapon-icon" width="120" height="48"></canvas><div id="hud-ammo"></div></div>
    <div id="hud-money"></div>
    <div id="hud-stars"></div>
  </div>
  <div id="hud-minimap-wrap">
    <canvas id="hud-minimap" width="260" height="260"></canvas>
    <div id="hud-bars"><div class="bar health"><i></i></div><div class="bar armor"><i></i></div></div>
  </div>
  <div id="hud-speedo" class="hidden"><div class="speed-num">0</div><div class="speed-unit">KM/H</div><canvas id="speedo-dial" width="170" height="170"></canvas><div class="vehicle-name"></div></div>
  <div id="hud-district" class="hidden"><div class="district-name"></div><div class="district-sub"></div></div>
  <div id="hud-dispatch" class="hidden"><div class="dispatch-badge">MKPD<br><span>DISPATCH</span></div><div class="dispatch-text"></div></div>
  <div id="hud-toast"></div>
  <div id="hud-radio" class="hidden"></div>
  <div id="hud-prompt" class="hidden"></div>
  <div id="hud-crosshair" class="hidden"></div>
  <div id="hud-bigmsg" class="hidden"></div>
  <div id="hud-hitflash"></div>
</div>`;
}

function dialogueMarkup() {
  return `
<div id="dialogue" class="hidden">
  <canvas id="dialogue-portrait" width="168" height="168"></canvas>
  <div class="dialogue-body"><div class="dialogue-name"></div><div class="dialogue-line"></div><div class="dialogue-hint">SPACE ▸</div></div>
</div>`;
}

function phoneMarkup() {
  return `
<div id="phone" class="hidden">
  <div class="phone-status"></div>
  <div class="phone-header"><span class="phone-title">KEYS·MAP</span><span class="phone-tabs"><b data-tab="map">Map</b><b data-tab="story">Story</b><b data-tab="jobs">Jobs</b><b data-tab="assets">Assets</b></span></div>
  <div class="phone-ticker"><b>KEYS HERALD</b><span></span></div>
  <div class="phone-body">
    <canvas id="phone-map" width="900" height="900"></canvas>
    <div id="phone-side"></div>
  </div>
</div>`;
}

const CONTROLS = [
  ['W A S D', 'walk / drive'], ['Shift', 'sprint'], ['Space', 'jump / handbrake'], ['Mouse', 'look &amp; aim'],
  ['Left click', 'fire'], ['Right click', 'aim'], ['F', 'steal / enter / exit car'], ['1-4 / wheel', 'switch weapon'],
  ['R', 'reload'], ['E', 'interact / start job / buy'], ['Q', 'radio station · armour at the gun shop'], ['H', 'horn'],
  ['M or Tab', 'phone &amp; map'], ['Esc / P', 'pause'], ['C', 'look behind'], ['V', 'camera distance · hood cam'], ['X', 'crouch in cover (half damage)'],
  ['G', 'siren (cruiser, ambulance)'], ['T', 'hail a cab to your waypoint'], ['Space', 'skip dialogue'],
];

function menuMarkup() {
  const controls = CONTROLS.map(([k, v]) => `<div><b>${k}</b> ${v}</div>`).join('');
  return `
<div id="menu-start" class="screen hidden">
  <canvas id="title-art" width="1280" height="720"></canvas>
  <div class="menu-col">
    <div class="title-logo"><span class="t1">MARISOL</span><span class="t2">KEYS</span><span class="t3">a sun-bleached crime story</span></div>
    <button data-act="new">New Game</button>
    <button data-act="continue">Continue</button>
    <button data-act="controls">Controls</button>
    <div class="menu-foot">Original game · all art &amp; sound generated in your browser</div>
  </div>
</div>
<div id="menu-pause" class="screen hidden">
  <div class="panel">
    <h2>Paused</h2>
    <button data-act="resume">Resume</button>
    <button data-act="save">Save Game</button>
    <button data-act="settings">Settings</button>
    <button data-act="controls">Controls</button>
    <button data-act="quit">Quit to Title</button>
  </div>
</div>
<div id="menu-settings" class="screen hidden">
  <div class="panel">
    <h2>Settings</h2>
    <label>Master volume <input type="range" id="set-volume" min="0" max="100"></label>
    <label>Radio volume <input type="range" id="set-radio" min="0" max="100"></label>
    <label>Mouse sensitivity <input type="range" id="set-sens" min="10" max="300"></label>
    <label>Draw distance <input type="range" id="set-draw" min="200" max="900"></label>
    <label><input type="checkbox" id="set-shadows"> Soft shadows</label>
    <label><input type="checkbox" id="set-post"> Bloom &amp; colour grade</label>
    <label><input type="checkbox" id="set-invert"> Invert mouse Y</label>
    <button data-act="back">Back</button>
  </div>
</div>
<div id="menu-controls" class="screen hidden">
  <div class="panel wide">
    <h2>Controls</h2>
    <div class="controls-grid">${controls}</div>
    <button data-act="back">Back</button>
  </div>
</div>`;
}

export function mountScreens() {
  const stage = document.getElementById('stage');
  stage.insertAdjacentHTML('afterend', hudMarkup() + dialogueMarkup() + phoneMarkup() + menuMarkup());
}
