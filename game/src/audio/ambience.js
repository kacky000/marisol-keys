// The island's background sound: surf that swells near the beach, gulls over the water, a low
// city hum downtown, wind rush at speed, and footsteps on foot.

import { audioContext, bus, noiseBuffer, envGain } from './audioEngine.js';
import { BLOCK } from '../world/cityPlan.js';

export class Ambience {
  constructor() {
    const ctx = audioContext();
    this.ok = !!ctx;
    if (!ctx) return;
    const loop = (freq, q, type = 'lowpass') => {
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer();
      src.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = type; f.frequency.value = freq; f.Q.value = q;
      const g = ctx.createGain();
      g.gain.value = 0;
      src.connect(f).connect(g).connect(bus('ambience'));
      src.start();
      return { g, f };
    };
    this.surf = loop(500, 0.7);
    this.hum = loop(180, 0.5);
    this.wind = loop(900, 0.4, 'bandpass');
    this.stepTimer = 0;
    this.gullTimer = 4;
  }

  gull() {
    const ctx = audioContext();
    const t = ctx.currentTime;
    for (let k = 0; k < 2 + Math.floor(Math.random() * 2); k++) {
      const o = ctx.createOscillator();
      o.type = 'triangle';
      const t0 = t + k * 0.22;
      o.frequency.setValueAtTime(1500, t0);
      o.frequency.exponentialRampToValueAtTime(900, t0 + 0.18);
      o.connect(envGain(t0, 0.02, 0.05, 0.18, bus('ambience')));
      o.start(t0); o.stop(t0 + 0.25);
    }
  }

  step() {
    const ctx = audioContext();
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer();
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = 1400; f.Q.value = 1.5;
    src.connect(f).connect(envGain(t, 0.003, 0.08, 0.06, bus('ambience')));
    src.start(t, Math.random()); src.stop(t + 0.1);
  }

  update(dt, player, time) {
    if (!this.ok) return;
    const ctx = audioContext();
    const t = ctx.currentTime;
    const beachX = 13 * BLOCK;
    const toSea = Math.min(Math.abs(player.pos.x - beachX), Math.abs(player.pos.z - 14 * BLOCK) + 40, Math.abs(player.pos.x - 2 * BLOCK) + 30);
    const sea = Math.max(0, 1 - toSea / 160);
    // surf rolls in and out
    this.surf.g.gain.setTargetAtTime(sea * (0.5 + 0.35 * Math.sin(time * 0.55)), t, 0.3);
    const downtown = Math.max(0, 1 - Math.hypot(player.pos.x - 7 * BLOCK, player.pos.z - 4 * BLOCK) / 400);
    this.hum.g.gain.setTargetAtTime(0.12 + downtown * 0.25, t, 0.5);
    const speed = player.vehicle ? Math.abs(player.vehicle.speed) : 0;
    this.wind.g.gain.setTargetAtTime(Math.min(0.35, speed * 0.008), t, 0.2);
    this.gullTimer -= dt;
    if (this.gullTimer <= 0) { this.gullTimer = 5 + Math.random() * 9; if (sea > 0.3) this.gull(); }
    if (!player.vehicle && player.speedNow > 0 && player.onGround) {
      this.stepTimer -= dt * player.speedNow;
      if (this.stepTimer <= 0) { this.stepTimer = 1.6; this.step(); }
    }
  }
}
