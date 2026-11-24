// Cutscene-style dialogue: portrait, name and role, typewriter text; Space or click advances.

import { CAST, paintPortrait } from '../story/cast.js';
import { menuPressed } from '../core/input.js';
import { emit } from '../core/events.js';

export class DialogueBox {
  constructor() {
    this.el = document.getElementById('dialogue');
    this.portrait = document.getElementById('dialogue-portrait').getContext('2d');
    this.nameEl = this.el.querySelector('.dialogue-name');
    this.lineEl = this.el.querySelector('.dialogue-line');
    this.lines = [];
    this.index = 0;
    this.shown = 0;
    this.onDone = null;
    this.hold = 0;
    this.el.addEventListener('click', () => this.skip());
  }

  get open() { return !!this.onDone; }

  // passive: plays over normal control (a phone call while driving), so Space — the handbrake and
  // jump — doesn't skip it; Enter still does
  play(lines, onDone, { passive = false } = {}) {
    this.lines = lines;
    this.index = 0;
    this.onDone = onDone;
    this.passive = passive;
    const hint = this.el.querySelector('.dialogue-hint');
    if (hint) hint.textContent = passive ? 'ENTER ▸' : 'SPACE ▸';
    this.showLine();
  }

  // Shows one line instantly (screenshot scenes).
  showStatic(who, text) {
    this.lines = [[who, text]];
    this.index = 0;
    this.onDone = () => {};
    this.showLine();
    this.shown = text.length;
    this.lineEl.textContent = text;
  }

  showLine() {
    const [who, text] = this.lines[this.index];
    const c = CAST[who];
    this.el.classList.remove('hidden');
    paintPortrait(this.portrait, who, 168);
    this.nameEl.innerHTML = `${c.name}<small>${c.role}</small>`;
    this.shown = 0;
    this.hold = 0;
    this.lineEl.textContent = '';
    emit('sound', { name: 'blip' });
  }

  skip() {
    if (!this.onDone) return;
    const text = this.lines[this.index][1];
    if (this.shown < text.length) { this.shown = text.length; this.lineEl.textContent = text; return; }
    this.index++;
    if (this.index >= this.lines.length) { const done = this.onDone; this.close(); done(); }
    else this.showLine();
  }

  close() {
    this.onDone = null;
    this.el.classList.add('hidden');
  }

  update(dt) {
    if (!this.onDone) return;
    const text = this.lines[this.index][1];
    if (this.shown < text.length) {
      this.shown = Math.min(text.length, this.shown + dt * 55);
      this.lineEl.textContent = text.slice(0, Math.floor(this.shown));
    } else {
      this.hold += dt;
      if (this.hold > 2.6 + text.length * 0.03) this.skip();
    }
    if ((!this.passive && menuPressed('Space')) || menuPressed('Enter')) this.skip();
  }
}
