// WebAudio graph: master, effects, radio and ambience buses; started on the first user gesture.

let ctx = null;
const buses = {};

export function audioContext() { return ctx; }
export function bus(name) { return buses[name]; }

export function startAudio(settings) {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return ctx; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  const master = ctx.createGain();
  const comp = ctx.createDynamicsCompressor();
  master.connect(comp).connect(ctx.destination);
  buses.master = master;
  for (const name of ['sfx', 'radio', 'ambience', 'engine']) {
    const g = ctx.createGain();
    g.connect(master);
    buses[name] = g;
  }
  applyVolumes(settings);
  return ctx;
}

export function applyVolumes(settings) {
  if (!ctx) return;
  buses.master.gain.value = (settings.volume / 100) * 0.8;
  buses.radio.gain.value = (settings.radio / 100) * 0.55;
  buses.sfx.gain.value = 0.9;
  buses.ambience.gain.value = 0.35;
  buses.engine.gain.value = 0.5;
}

// White-noise buffer shared by gunshots, surf, wind and tyre squeal.
let noise = null;
export function noiseBuffer() {
  if (noise) return noise;
  noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return noise;
}

export function envGain(t0, attack, peak, decay, dest) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
  g.connect(dest);
  return g;
}
