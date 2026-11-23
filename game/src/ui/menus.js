// Title screen (over a live flyover of the island), pause menu, settings and controls panels.

import { hasSave, saveSettings } from '../save/saveGame.js';

const $ = (id) => document.getElementById(id);

// A sunset vignette with retro sun stripes painted over the live 3D flyover.
export function paintTitleOverlay(canvas) {
  const g = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  g.clearRect(0, 0, w, h);
  const left = g.createLinearGradient(0, 0, w * 0.6, 0);
  left.addColorStop(0, 'rgba(20,8,40,0.88)');
  left.addColorStop(0.55, 'rgba(60,20,70,0.45)');
  left.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = left;
  g.fillRect(0, 0, w, h);
  // striped sun
  const cx = w * 0.84, cy = h * 0.2, r = h * 0.13;
  g.save();
  g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.clip();
  const sun = g.createLinearGradient(0, cy - r, 0, cy + r);
  sun.addColorStop(0, '#fff3a8'); sun.addColorStop(0.5, '#ffb347'); sun.addColorStop(1, '#ff4f6d');
  g.fillStyle = sun;
  g.fillRect(cx - r, cy - r, r * 2, r * 2);
  g.globalCompositeOperation = 'destination-out';
  for (let k = 0; k < 7; k++) { const y = cy + r * 0.1 + k * r * 0.14; g.fillRect(cx - r, y, r * 2, 3 + k * 1.6); }
  g.restore();
  // soft glow fading out from the disc instead of a hard-edged halo
  const glow = g.createRadialGradient(cx, cy, r * 0.9, cx, cy, r * 2.4);
  glow.addColorStop(0, 'rgba(255,110,110,0.38)');
  glow.addColorStop(0.45, 'rgba(255,90,120,0.14)');
  glow.addColorStop(1, 'rgba(255,80,120,0)');
  g.globalCompositeOperation = 'destination-over';
  g.fillStyle = glow;
  g.fillRect(cx - r * 2.4, cy - r * 2.4, r * 4.8, r * 4.8);
  g.globalCompositeOperation = 'source-over';
  const bottom = g.createLinearGradient(0, h * 0.7, 0, h);
  bottom.addColorStop(0, 'rgba(0,0,0,0)');
  bottom.addColorStop(1, 'rgba(10,5,25,0.7)');
  g.fillStyle = bottom;
  g.fillRect(0, h * 0.7, w, h * 0.3);
}

export class Menus {
  constructor(game) {
    this.game = game;
    this.stack = [];
    document.querySelectorAll('.screen button, .panel button').forEach((b) => b.addEventListener('click', () => this.act(b.dataset.act)));
    const s = game.settings;
    const bind = (id, key, conv = Number) => {
      const el = $(id);
      if (el.type === 'checkbox') el.checked = s[key]; else el.value = s[key];
      el.addEventListener('input', () => { s[key] = el.type === 'checkbox' ? el.checked : conv(el.value); saveSettings(s); game.applySettings(); });
    };
    bind('set-volume', 'volume'); bind('set-radio', 'radio'); bind('set-sens', 'sens'); bind('set-draw', 'draw');
    bind('set-shadows', 'shadows'); bind('set-invert', 'invert'); bind('set-post', 'post');
  }

  show(id) {
    for (const el of document.querySelectorAll('.screen')) el.classList.add('hidden');
    if (id) $(id).classList.remove('hidden');
    this.current = id;
  }

  openTitle() {
    this.show('menu-start');
    paintTitleOverlay($('title-art'));
    document.querySelector('[data-act="continue"]').disabled = !hasSave();
  }

  act(a) {
    const g = this.game;
    switch (a) {
      case 'new': this.show(null); g.startGame(false); break;
      case 'continue': this.show(null); g.startGame(true); break;
      case 'controls': this.back = this.current; this.show('menu-controls'); break;
      case 'settings': this.back = this.current; this.show('menu-settings'); break;
      case 'back': this.show(this.back || (g.running ? 'menu-pause' : 'menu-start')); if (this.current === 'menu-start') this.openTitle(); break;
      case 'resume': this.show(null); g.setPaused(false); break;
      case 'save': g.save(); g.hud.toast('Game saved'); this.show(null); g.setPaused(false); break;
      case 'quit': g.quitToTitle(); break;
    }
  }
}
