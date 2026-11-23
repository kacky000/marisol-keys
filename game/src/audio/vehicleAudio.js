// Continuous vehicle sounds: the player's engine (pitch follows speed and throttle), tyre squeal
// while drifting, and sirens that grow louder as units close in, voiced by the nearest one.

import { audioContext, bus, noiseBuffer } from './audioEngine.js';

// [centre pitch Hz, sweep rate Hz, sweep depth Hz] for each kind of emergency vehicle
const SIREN_VOICES = { police: [900, 0.45, 320], ambulance: [1050, 2.6, 380], fire: [640, 0.22, 260] };

export class VehicleAudio {
  constructor() {
    const ctx = audioContext();
    this.ok = !!ctx;
    if (!ctx) return;
    // engine: two detuned saws through a low-pass filter
    this.engGain = ctx.createGain();
    this.engGain.gain.value = 0;
    this.engFilter = ctx.createBiquadFilter();
    this.engFilter.type = 'lowpass';
    this.engFilter.frequency.value = 600;
    this.engFilter.connect(this.engGain).connect(bus('engine'));
    this.osc = [ctx.createOscillator(), ctx.createOscillator()];
    this.osc[0].type = 'sawtooth'; this.osc[1].type = 'square';
    for (const o of this.osc) { o.frequency.value = 50; o.connect(this.engFilter); o.start(); }
    // tyre squeal: filtered noise
    this.squeal = ctx.createGain();
    this.squeal.gain.value = 0;
    const sq = ctx.createBufferSource();
    sq.buffer = noiseBuffer(); sq.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2200; bp.Q.value = 6;
    sq.connect(bp).connect(this.squeal).connect(bus('sfx'));
    sq.start();
    // siren: oscillator swept by an LFO
    this.sirenGain = ctx.createGain();
    this.sirenGain.gain.value = 0;
    this.siren = ctx.createOscillator();
    this.siren.type = 'triangle';
    this.siren.frequency.value = 900;
    const lfo = this.lfo = ctx.createOscillator();
    lfo.frequency.value = 0.45;
    const lfoGain = this.lfoGain = ctx.createGain();
    lfoGain.gain.value = 320;
    lfo.connect(lfoGain).connect(this.siren.frequency);
    this.siren.connect(this.sirenGain).connect(bus('sfx'));
    this.siren.start(); lfo.start();
  }

  update(player, nearestSirenDist, sirenCount, sirenKind = 'police') {
    if (!this.ok) return;
    const ctx = audioContext();
    const t = ctx.currentTime;
    const v = player.vehicle;
    if (v && !v.wrecked) {
      const sp = Math.abs(v.speed) / v.spec.maxSpeed;
      const gearPos = (sp * 5) % 1;
      const rpm = 0.3 + gearPos * 0.55 + v.input.throttle * 0.15;
      const base = v.spec.bike ? 90 : v.type === 'bus' ? 35 : v.type === 'sports' ? 70 : 50;
      this.osc[0].frequency.setTargetAtTime(base * (1 + rpm * 2.2), t, 0.05);
      this.osc[1].frequency.setTargetAtTime(base * 0.5 * (1 + rpm * 2.2) * 1.01, t, 0.05);
      this.engFilter.frequency.setTargetAtTime(400 + rpm * 1800, t, 0.05);
      this.engGain.gain.setTargetAtTime(0.12 + v.input.throttle * 0.1, t, 0.08);
      this.squeal.gain.setTargetAtTime(v.drifting ? 0.12 : 0, t, 0.05);
    } else {
      this.engGain.gain.setTargetAtTime(0, t, 0.1);
      this.squeal.gain.setTargetAtTime(0, t, 0.05);
    }
    const sirenVol = sirenCount ? Math.min(0.12, 6 / Math.max(20, nearestSirenDist)) : 0;
    this.sirenGain.gain.setTargetAtTime(sirenVol, t, 0.2);
    // the nearest unit sets the voice: MKPD wail, ambulance yelp, fire engine low wail
    const [pitch, rate, depth] = SIREN_VOICES[sirenKind] || SIREN_VOICES.police;
    this.siren.frequency.setTargetAtTime(pitch, t, 0.3);
    this.lfo.frequency.setTargetAtTime(rate, t, 0.3);
    this.lfoGain.gain.setTargetAtTime(depth, t, 0.3);
  }
}
