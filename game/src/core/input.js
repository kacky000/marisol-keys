// Keyboard and mouse state with pointer lock for mouse-look.

const down = new Set();
const pressed = new Set();
const mouse = { dx: 0, dy: 0, left: false, right: false, leftPressed: false, wheel: 0 };
let locked = false;
let lockRefused = false;
let enabled = true;

export function initInput(canvas) {
  addEventListener('keydown', (e) => {
    if (e.code === 'Tab') e.preventDefault();
    if (!down.has(e.code)) pressed.add(e.code);
    down.add(e.code);
  });
  addEventListener('keyup', (e) => down.delete(e.code));
  addEventListener('blur', () => down.clear());
  canvas.addEventListener('mousedown', (e) => {
    // the click that captures the mouse should not also fire a shot
    if (enabled && !locked && !lockRefused && canvas.requestPointerLock) { canvas.requestPointerLock(); return; }
    if (e.button === 0) { mouse.left = true; mouse.leftPressed = true; }
    if (e.button === 2) mouse.right = true;
  });
  addEventListener('mouseup', (e) => {
    if (e.button === 0) mouse.left = false;
    if (e.button === 2) mouse.right = false;
  });
  addEventListener('contextmenu', (e) => e.preventDefault());
  // if the page may not capture the mouse (embedded frames, some kiosks), plain moves steer the camera
  document.addEventListener('pointerlockerror', () => { lockRefused = true; });
  addEventListener('mousemove', (e) => {
    if (!locked && !lockRefused) return;
    mouse.dx += e.movementX;
    mouse.dy += e.movementY;
  });
  addEventListener('wheel', (e) => { mouse.wheel += Math.sign(e.deltaY); });
  document.addEventListener('pointerlockchange', () => { locked = document.pointerLockElement === canvas; });
}

export const isDown = (code) => enabled && down.has(code);
export const wasPressed = (code) => enabled && pressed.has(code);
export const mouseState = () => mouse;
export const pointerLocked = () => locked;

export function setInputEnabled(v) {
  enabled = v;
  if (!v && document.exitPointerLock && locked) document.exitPointerLock();
}

// Called once at the end of every frame.
export function endInputFrame() {
  pressed.clear();
  mouse.dx = 0;
  mouse.dy = 0;
  mouse.leftPressed = false;
  mouse.wheel = 0;
}

// Raw access for menus (works even while gameplay input is disabled).
export const menuPressed = (code) => pressed.has(code);
