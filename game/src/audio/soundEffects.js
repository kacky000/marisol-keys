// One-shot synthesized effects: gunshots per weapon, punches, explosions, crashes, horn, UI blips,
// cash register, checkpoint chime and mission passed/failed stingers.

import { audioContext, bus, noiseBuffer, envGain } from './audioEngine.js';

function burst(t, dur, freq, q, peak, dest = bus('sfx'), type = 'bandpass') {
  const ctx = audioContext();
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer();
  const f = ctx.createBiquadFilter();
  f.type = type; f.frequency.value = freq; f.Q.value = q;
  src.connect(f).connect(envGain(t, 0.002, peak, dur, dest));
  src.start(t, Math.random());
  src.stop(t + dur + 0.05);
}

function tone(t, freq, dur, type = 'sine', peak = 0.2, slideTo = null, dest = bus('sfx')) {
  const ctx = audioContext();
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  o.connect(envGain(t, 0.01, peak, dur, dest));
  o.start(t);
  o.stop(t + dur + 0.05);
}

const SOUNDS = {
  pistol: (t) => { burst(t, 0.18, 1200, 0.8, 0.9); burst(t, 0.35, 200, 0.7, 0.6, undefined, 'lowpass'); tone(t, 160, 0.12, 'square', 0.15, 50); },
  'pistol-far': (t) => { burst(t, 0.25, 700, 0.6, 0.25); },
  smg: (t) => { burst(t, 0.1, 1500, 0.9, 0.6); burst(t, 0.18, 260, 0.7, 0.35, undefined, 'lowpass'); },
  shotgun: (t) => { burst(t, 0.45, 600, 0.5, 1.0); burst(t, 0.6, 120, 0.6, 0.9, undefined, 'lowpass'); tone(t, 90, 0.3, 'sawtooth', 0.2, 40); },
  empty: (t) => tone(t, 1800, 0.03, 'square', 0.08),
  punch: (t) => { burst(t, 0.12, 300, 1.2, 0.5, undefined, 'lowpass'); tone(t, 120, 0.1, 'sine', 0.3, 60); },
  explosion: (t) => { burst(t, 1.6, 90, 0.4, 1.0, undefined, 'lowpass'); burst(t, 0.6, 900, 0.5, 0.6); tone(t, 70, 1.2, 'sine', 0.6, 25); },
  thunder: (t) => { burst(t, 2.6, 70, 0.3, 0.9, undefined, 'lowpass'); burst(t + 0.1, 1.8, 160, 0.4, 0.5, undefined, 'lowpass'); },
  crash: (t) => { burst(t, 0.4, 500, 0.6, 0.7); burst(t, 0.25, 2500, 2, 0.25); tone(t, 140, 0.2, 'triangle', 0.2, 60); },
  horn: (t) => { tone(t, 392, 0.45, 'sawtooth', 0.12); tone(t, 494, 0.45, 'sawtooth', 0.1); },
  blip: (t) => tone(t, 880, 0.06, 'triangle', 0.06, 1200),
  cash: (t) => { tone(t, 1318, 0.12, 'square', 0.07); tone(t + 0.08, 1760, 0.25, 'square', 0.07); },
  checkpoint: (t) => { tone(t, 784, 0.12, 'triangle', 0.15); tone(t + 0.1, 1175, 0.25, 'triangle', 0.15); },
  passed: (t) => { [523, 659, 784, 1047].forEach((f, k) => tone(t + k * 0.12, f, 0.5, 'triangle', 0.18)); tone(t + 0.5, 1568, 0.8, 'sine', 0.12); },
  failed: (t) => { [392, 349, 294, 220].forEach((f, k) => tone(t + k * 0.16, f, 0.5, 'sawtooth', 0.08)); },
  wanted: (t) => { tone(t, 660, 0.15, 'square', 0.06); tone(t + 0.15, 520, 0.2, 'square', 0.06); },
  reload: (t) => { tone(t, 300, 0.05, 'square', 0.08); tone(t + 0.35, 500, 0.05, 'square', 0.1); },
  door: (t) => { burst(t, 0.12, 400, 1, 0.3, undefined, 'lowpass'); tone(t + 0.05, 90, 0.1, 'sine', 0.25); },
};

export function playSound(name, gain = 1) {
  const ctx = audioContext();
  if (!ctx || !SOUNDS[name]) return;
  void gain;
  SOUNDS[name](ctx.currentTime + 0.005);
}
