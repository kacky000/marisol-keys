// In-car radio: three invented stations playing generated music on a step sequencer, each with
// its own scale, tempo and sound, a station ident jingle when you tune in, and DJs who cut in
// between tracks.

import { audioContext, bus, envGain, noiseBuffer } from './audioEngine.js';

export const STATIONS = [
  { name: 'TIDAL 101.3 — Sunset Synthwave', bpm: 96, root: 45, scale: [0, 3, 5, 7, 10], lead: 'sawtooth', bass: 'square', drums: 'four',
    songs: ['Neon Pelicans — "Coral Static"', 'Glasswater Drive — "Last Ferry Out"', 'The Undertow — "Pastel Heat"', 'Miss Mirador — "Halcyon Nights"'],
    djs: ['Rosa Vale here, the sun\'s melting into Glasswater —', 'Tidal 101.3, windows down on Sundown Boulevard —', 'If you\'re stuck on the causeway, this one\'s for you —'] },
  { name: 'STATIC 88 FM — Pirate Reggaeton', bpm: 92, root: 50, scale: [0, 2, 3, 7, 8], lead: 'square', bass: 'sine', drums: 'dembow',
    songs: ['DJ Sardina — "Canal Bounce"', 'Lantern Kids — "No Signal"', 'Priya L. live mix — "Tide Book Dub"', 'Rayo Sound — "Quay Road"'],
    djs: ['Still on air, MKPD still can\'t find the antenna —', 'Static 88, broadcasting from a boat you\'ll never see —', 'Shout out to the Lantern Canals, keep it loud —'] },
  { name: 'REEF ROOM RADIO — Steel Pan Lounge', bpm: 104, root: 55, scale: [0, 2, 4, 7, 9], lead: 'triangle', bass: 'triangle', drums: 'shaker',
    songs: ['The Lifeguards — "Tower Three"', 'Seagrape Trio — "Low Tide Waltz"', 'Captain Calypso — "Marlin Diner"', 'Sunwake Steel — "Boardwalk 6am"'],
    djs: ['Reef Room Radio, cool as the pier at six —', 'Gelato weather on the boardwalk, folks —', 'Slow it down, Marisol Keys —'] },
  { name: 'RADIO OFF', off: true },
];

const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
const SONG_STEPS = 384; // sixteenth notes per song, a minute or so

export class Radio {
  constructor() {
    this.index = 0;
    this.on = false;
    this.nextStep = 0;
    this.step = 0;
    this.seed = 1;
  }

  rand() { this.seed = (this.seed * 16807) % 2147483647; return this.seed / 2147483647; }

  tune(index) {
    this.index = index % STATIONS.length;
    this.seed = 7 + this.index * 131;
    this.step = 0;
    const ctx = audioContext();
    if (ctx) this.nextStep = ctx.currentTime + 0.6;
    this.jingle();
    const st = STATIONS[this.index];
    if (st.off) return st.name;
    // each tune-in lands on a different invented track
    this.track = ((this.track || 0) + 1) % st.songs.length;
    return `${st.name} · ${st.songs[this.track]}`;
  }

  jingle() {
    const ctx = audioContext(), st = STATIONS[this.index];
    if (!ctx || st.off) return;
    const t = ctx.currentTime;
    [0, 4, 7, 12].forEach((iv, k) => this.note(t + k * 0.09, midi(st.root + 24 + iv), 0.25, 'triangle', 0.12));
  }

  note(t, f, dur, type, peak) {
    const ctx = audioContext();
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = f;
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = 2400;
    o.connect(filt).connect(envGain(t, 0.01, peak, dur, bus('radio')));
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  hit(t, kind) {
    const ctx = audioContext();
    if (kind === 'kick') { const o = ctx.createOscillator(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.15); o.connect(envGain(t, 0.003, 0.5, 0.18, bus('radio'))); o.start(t); o.stop(t + 0.25); return; }
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer();
    const f = ctx.createBiquadFilter();
    f.type = kind === 'hat' ? 'highpass' : 'bandpass';
    f.frequency.value = kind === 'hat' ? 7000 : 1800;
    src.connect(f).connect(envGain(t, 0.002, kind === 'hat' ? 0.08 : 0.25, kind === 'hat' ? 0.05 : 0.12, bus('radio')));
    src.start(t, Math.random()); src.stop(t + 0.2);
  }

  // Schedules a little ahead of the audio clock while the player is in a car.
  update(active) {
    const ctx = audioContext();
    if (!ctx) return;
    this.on = active && !STATIONS[this.index].off;
    if (!this.on) { this.nextStep = ctx.currentTime + 0.1; return; }
    const st = STATIONS[this.index];
    const stepDur = 60 / st.bpm / 4;
    // after a pause, the phone or a hidden tab, pick the beat up again instead of firing every
    // missed note at once
    if (this.nextStep < ctx.currentTime) this.nextStep = ctx.currentTime + 0.1;
    while (this.nextStep < ctx.currentTime + 0.15) {
      const t = this.nextStep, s = this.step % 32;
      const bar = Math.floor(this.step / 16) % 4;
      const chord = [0, 3, 4, 2][bar];
      // drums
      if (st.drums === 'four' && s % 4 === 0) this.hit(t, 'kick');
      if (st.drums === 'dembow' && [0, 3, 6, 8, 11, 14].includes(s % 16)) this.hit(t, s % 8 === 0 ? 'kick' : 'snare');
      if (s % 2 === 1) this.hit(t, 'hat');
      if (st.drums === 'four' && s % 8 === 4) this.hit(t, 'snare');
      // bass on the beat
      if (s % 4 === 0) this.note(t, midi(st.root - 12 + st.scale[chord % st.scale.length]), stepDur * 3, st.bass, 0.16);
      // lead: a hummable random walk on the scale
      if (this.rand() < 0.45) {
        const deg = Math.floor(this.rand() * st.scale.length);
        const oct = this.rand() < 0.3 ? 24 : 12;
        this.note(t, midi(st.root + oct + st.scale[(deg + chord) % st.scale.length]), stepDur * (this.rand() < 0.3 ? 3 : 1.5), st.lead, 0.07);
      }
      this.nextStep += stepDur;
      this.step++;
      if (this.step % SONG_STEPS === 0) this.nextSong();
    }
  }

  // About once a minute the DJ cuts in and the station moves on to its next track.
  nextSong() {
    const st = STATIONS[this.index];
    if (st.off) return;
    this.track = ((this.track || 0) + 1) % st.songs.length;
    this.seed = 7 + this.index * 131 + this.track * 977;
    this.jingle();
    const dj = st.djs[(this.track + this.index) % st.djs.length];
    this.onTrack?.(`${dj} ${st.songs[this.track]}`);
  }
}
