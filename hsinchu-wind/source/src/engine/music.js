// Original background music, synthesized live with Web Audio (no audio files,
// nothing licensed). One theme per chapter:
//   qianjia   — dusk lullaby: music box over a warm pad, pentatonic, slow
//   girlshigh — bright morning: marimba arpeggios, piano melody, light pizzicato
//   nycu      — late-night lo-fi: electric piano 7th chords, soft swung beat, vinyl crackle
//   bigcity   — evening reflection: string pad and piano, slow and nostalgic
import { audio } from './audio.js';
import { settings, onSettingsChange } from './settings.js';

const NOTE = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
const hz = (n) => {
  const m = /^([A-G][b#]?)(\d)$/.exec(n);
  const midi = NOTE[m[1]] + (Number(m[2]) + 1) * 12;
  return 440 * Math.pow(2, (midi - 69) / 12);
};
// "A4 . C5 ." → per-step note names or null
const seq = (str) => str.trim().split(/\s+/).map((t) => (t === '.' ? null : t));

// ---------------------------------------------------------------------------
// Themes. Each bar has 8 steps (eighth notes). `chords` gives one chord per bar.
// ---------------------------------------------------------------------------
const THEMES = {
  qianjia: {
    bpm: 72, swing: 0, gain: 0.55,
    chords: [['F3', 'A3', 'C4', 'E4'], ['D3', 'F3', 'A3', 'C4'], ['Bb2', 'D3', 'F3', 'A3'], ['C3', 'F3', 'G3', 'C4']],
    melody: [
      seq('A4 . C5 . D5 C5 A4 .'), seq('F4 . G4 A4 . . D4 .'), seq('F4 G4 A4 . C5 . A4 G4'), seq('G4 . . A4 G4 . F4 .'),
      seq('C5 . D5 . F5 D5 C5 .'), seq('A4 . G4 A4 . . F4 .'), seq('D4 F4 G4 . A4 . C5 A4'), seq('G4 . F4 . . . . .'),
    ],
    lead: 'musicbox', pad: 'pad', bass: 'softbass', bassSteps: [0, 4], sparkle: 0.12,
  },
  girlshigh: {
    bpm: 108, swing: 0, gain: 0.5,
    chords: [['D3', 'F#3', 'A3', 'D4'], ['C#3', 'E3', 'A3', 'C#4'], ['B2', 'D3', 'F#3', 'B3'], ['G2', 'B2', 'D3', 'G3']],
    melody: [
      seq('F#5 . E5 F#5 A5 . F#5 .'), seq('E5 . C#5 . E5 . . .'), seq('D5 . F#5 . B5 A5 F#5 .'), seq('G5 . F#5 E5 D5 . . .'),
      seq('A4 . D5 . F#5 . E5 D5'), seq('C#5 . E5 . A5 . . .'), seq('B4 . D5 F#5 . E5 D5 .'), seq('D5 . E5 . D5 . . .'),
    ],
    lead: 'piano', arp: 'marimba', bass: 'pizz', bassSteps: [0, 2, 4, 6], hats: [1, 3, 5, 7],
  },
  nycu: {
    bpm: 78, swing: 0.2, gain: 0.55,
    chords: [['Eb3', 'G3', 'Bb3', 'D4'], ['C3', 'Eb3', 'G3', 'Bb3'], ['F3', 'Ab3', 'C4', 'Eb4'], ['Bb2', 'D3', 'F3', 'Ab3']],
    melody: [
      seq('G5 . . Bb5 . . G5 .'), seq('. . Eb5 . F5 . . .'), seq('Ab5 . G5 . F5 . Eb5 .'), seq('D5 . . . F5 . . .'),
      seq('. . Bb4 . Eb5 . G5 .'), seq('F5 . Eb5 . . . C5 .'), seq('. . C5 . Eb5 . Ab5 G5'), seq('F5 . . . . . . .'),
    ],
    lead: 'epiano', keys: 'epiano', keySteps: [0, 3], bass: 'roundbass', bassSteps: [0, 3, 6], drums: { kick: [0, 5], snare: [2, 6], hat: [0, 1, 2, 3, 4, 5, 6, 7] }, vinyl: true,
  },
  bigcity: {
    bpm: 64, swing: 0, gain: 0.55,
    chords: [['A2', 'C3', 'E3', 'A3'], ['F2', 'A2', 'C3', 'F3'], ['C3', 'E3', 'G3', 'C4'], ['G2', 'B2', 'D3', 'G3']],
    melody: [
      seq('E5 . . . D5 C5 . .'), seq('C5 . . . A4 . G4 .'), seq('G4 . C5 . E5 . G5 .'), seq('F5 . E5 . D5 . . .'),
      seq('E5 . . . G5 . E5 .'), seq('F5 . . . C5 . A4 .'), seq('G4 . . . C5 . E5 .'), seq('D5 . . . . . . .'),
    ],
    lead: 'piano', pad: 'strings', broken: 'piano', bass: 'softbass', bassSteps: [0],
  },
};

// ---------------------------------------------------------------------------
// Instruments
// ---------------------------------------------------------------------------
function makeReverb(ctx, seconds = 2.8) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
  }
  const c = ctx.createConvolver(); c.buffer = buf; return c;
}

function env(ctx, g, t, a, peak, d, sustain = 0.0001) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(Math.max(sustain, 0.0001), t + a + d);
}

function osc(ctx, type, f, t, stop, dest, detune = 0) {
  const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = detune;
  o.connect(dest); o.start(t); o.stop(stop);
  return o;
}

const INSTR = {
  musicbox(ctx, out, f, t, v = 1) {
    const g = ctx.createGain(); g.connect(out); env(ctx, g, t, 0.004, 0.16 * v, 1.8);
    osc(ctx, 'sine', f, t, t + 2, g); osc(ctx, 'sine', f * 4.01, t, t + 0.6, g);
    const g2 = ctx.createGain(); g2.connect(out); env(ctx, g2, t, 0.002, 0.04 * v, 0.25);
    osc(ctx, 'triangle', f * 2, t, t + 0.4, g2);
  },
  piano(ctx, out, f, t, v = 1, len = 1.6) {
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(f * 6, t); lp.frequency.exponentialRampToValueAtTime(f * 1.5, t + len); lp.connect(out);
    const g = ctx.createGain(); g.connect(lp); env(ctx, g, t, 0.006, 0.13 * v, len);
    osc(ctx, 'triangle', f, t, t + len + 0.1, g); osc(ctx, 'sine', f * 2, t, t + len, g, 3);
  },
  marimba(ctx, out, f, t, v = 1) {
    const g = ctx.createGain(); g.connect(out); env(ctx, g, t, 0.003, 0.12 * v, 0.45);
    osc(ctx, 'sine', f, t, t + 0.5, g);
    const g2 = ctx.createGain(); g2.connect(out); env(ctx, g2, t, 0.002, 0.05 * v, 0.08);
    osc(ctx, 'sine', f * 3.93, t, t + 0.1, g2);
  },
  epiano(ctx, out, f, t, v = 1, len = 2.0) {
    const g = ctx.createGain(); g.connect(out); env(ctx, g, t, 0.01, 0.1 * v, len);
    const trem = ctx.createGain(); trem.gain.value = 1; trem.connect(g);
    const lfo = ctx.createOscillator(); lfo.frequency.value = 4.5; const la = ctx.createGain(); la.gain.value = 0.25;
    lfo.connect(la); la.connect(trem.gain); lfo.start(t); lfo.stop(t + len);
    osc(ctx, 'sine', f, t, t + len, trem);
    const bell = ctx.createGain(); bell.connect(out); env(ctx, bell, t, 0.003, 0.035 * v, 0.3);
    osc(ctx, 'sine', f * 2.0, t, t + 0.35, bell, 6);
  },
  pad(ctx, out, f, t, v = 1, len = 3.4) {
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.connect(out);
    const g = ctx.createGain(); g.connect(lp);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.035 * v, t + 1.2);
    g.gain.setValueAtTime(0.035 * v, t + len - 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t + len + 0.8);
    osc(ctx, 'sawtooth', f, t, t + len + 1, g, -7); osc(ctx, 'sawtooth', f, t, t + len + 1, g, 7);
  },
  strings(ctx, out, f, t, v = 1, len = 3.8) {
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400; lp.connect(out);
    const g = ctx.createGain(); g.connect(lp);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.03 * v, t + 1.6);
    g.gain.setValueAtTime(0.03 * v, t + len - 0.8); g.gain.exponentialRampToValueAtTime(0.0001, t + len + 1.2);
    const vib = ctx.createOscillator(); vib.frequency.value = 5; const va = ctx.createGain(); va.gain.value = 6;
    vib.connect(va); vib.start(t); vib.stop(t + len + 1.3);
    [-9, 0, 9].forEach((d) => { const o = osc(ctx, 'sawtooth', f, t, t + len + 1.3, g, d); va.connect(o.detune); });
  },
  softbass(ctx, out, f, t, v = 1) {
    const g = ctx.createGain(); g.connect(out); env(ctx, g, t, 0.02, 0.16 * v, 1.4);
    osc(ctx, 'sine', f, t, t + 1.5, g);
  },
  pizz(ctx, out, f, t, v = 1) {
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.connect(out);
    const g = ctx.createGain(); g.connect(lp); env(ctx, g, t, 0.004, 0.14 * v, 0.28);
    osc(ctx, 'triangle', f, t, t + 0.35, g);
  },
  roundbass(ctx, out, f, t, v = 1) {
    const g = ctx.createGain(); g.connect(out); env(ctx, g, t, 0.01, 0.18 * v, 0.7);
    osc(ctx, 'sine', f, t, t + 0.8, g); osc(ctx, 'triangle', f * 2, t, t + 0.2, g);
  },
  kick(ctx, out, t, v = 1) {
    const g = ctx.createGain(); g.connect(out); env(ctx, g, t, 0.002, 0.3 * v, 0.28);
    const o = ctx.createOscillator(); o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.2);
    o.connect(g); o.start(t); o.stop(t + 0.3);
  },
  snare(ctx, out, t, noise, v = 1) {
    const s = ctx.createBufferSource(); s.buffer = noise;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1800; bp.Q.value = 0.8;
    const g = ctx.createGain(); env(ctx, g, t, 0.002, 0.07 * v, 0.16);
    s.connect(bp); bp.connect(g); g.connect(out); s.start(t, Math.random(), 0.2);
  },
  hat(ctx, out, t, noise, v = 1) {
    const s = ctx.createBufferSource(); s.buffer = noise;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 7000;
    const g = ctx.createGain(); env(ctx, g, t, 0.001, 0.03 * v, 0.05);
    s.connect(hp); hp.connect(g); g.connect(out); s.start(t, Math.random(), 0.06);
  },
};

// ---------------------------------------------------------------------------
// Player
// ---------------------------------------------------------------------------
class MusicPlayer {
  constructor() {
    this.theme = null;
    this.wanted = null;
    this.timer = null;
    audio.onStart = () => this.init();
  }

  init() {
    const ctx = audio.context;
    if (!ctx || this.bus) return;
    this.ctx = ctx;
    this.bus = ctx.createGain();
    this.bus.gain.value = settings.music ?? 0.6;
    this.bus.connect(audio.master);
    this.reverb = makeReverb(ctx);
    const wet = ctx.createGain(); wet.gain.value = 0.35;
    this.reverb.connect(wet); wet.connect(this.bus);
    this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = this.noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    onSettingsChange((k, v) => { if (k === 'music') this.bus.gain.setTargetAtTime(v, ctx.currentTime, 0.1); });
    if (this.wanted) this.play(this.wanted);
  }

  // Cross-fade to a chapter's theme.
  play(id) {
    this.wanted = id;
    if (!this.ctx) return;
    if (this.theme && this.theme.id === id) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    if (this.track) {
      const old = this.track;
      old.gain.gain.cancelScheduledValues(now);
      old.gain.gain.setTargetAtTime(0.0001, now, 0.8);
      if (old.crackle) clearInterval(old.crackle);
      setTimeout(() => { old.vinyl?.stop(); old.gain.disconnect(); }, 4000);
    }
    const T = THEMES[id];
    if (!T) { this.theme = null; this.track = null; return; }
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(T.gain, now + 2.5);
    gain.connect(this.bus); gain.connect(this.reverb);
    this.track = { gain };
    this.theme = { id, T, step: 0, next: now + 0.2 };
    if (T.vinyl) this.startVinyl(gain);
    if (!this.timer) this.timer = setInterval(() => this.schedule(), 60);
  }

  // A short swell for big moments (e.g. the window at the end).
  swell() {
    if (!this.track) return;
    const g = this.track.gain.gain, t = this.ctx.currentTime;
    g.cancelScheduledValues(t);
    g.setTargetAtTime(this.theme.T.gain * 1.6, t, 1.5);
  }

  startVinyl(dest) {
    const ctx = this.ctx;
    const s = ctx.createBufferSource(); s.buffer = this.noise; s.loop = true;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3000;
    const g = ctx.createGain(); g.gain.value = 0.006;
    s.connect(hp); hp.connect(g); g.connect(dest); s.start();
    this.track.vinyl = s;
    // crackles
    this.track.crackle = setInterval(() => {
      if (!this.track || this.track.gain !== dest) return;
      const t = ctx.currentTime + Math.random() * 0.2;
      INSTR.hat(ctx, dest, t, this.noise, 0.6 * Math.random());
    }, 260);
  }

  schedule() {
    const th = this.theme;
    if (!th || !this.ctx) return;
    const ctx = this.ctx, T = th.T;
    const stepDur = 60 / T.bpm / 2;
    while (th.next < ctx.currentTime + 0.25) {
      const s = th.step;
      const bar = Math.floor(s / 8), pos = s % 8;
      let t = th.next;
      if (T.swing && pos % 2 === 1) t += stepDur * T.swing;
      this.playStep(T, bar, pos, t, stepDur);
      th.next += stepDur;
      th.step++;
    }
  }

  playStep(T, bar, pos, t, stepDur) { playStep(this.ctx, this.track.gain, this.noise, T, bar, pos, t, stepDur); }
}

export function playStep(ctx, out, noise, T, bar, pos, t, stepDur) {
    const I = INSTR;
    const chord = T.chords[bar % T.chords.length].map(hz);
    const barLen = stepDur * 8;
    // pads / strings: once per bar
    if (pos === 0 && T.pad) chord.forEach((f, i) => I[T.pad](ctx, out, f, t, i === 0 ? 0.8 : 1, barLen));
    // electric piano chord stabs
    if (T.keys && T.keySteps.includes(pos)) chord.forEach((f) => I[T.keys](ctx, out, f, t, 0.55, stepDur * 3));
    // marimba arpeggio
    if (T.arp) { const order = [0, 1, 2, 3, 2, 1, 2, 3]; I[T.arp](ctx, out, chord[order[pos]] * 2, t, 0.8); }
    // broken-chord piano
    if (T.broken) { const order = [0, 2, 3, 2, 1, 2, 3, 2]; I[T.broken](ctx, out, chord[order[pos]] * 2, t, 0.45, stepDur * 3); }
    // bass
    if (T.bass && T.bassSteps.includes(pos)) {
      const root = chord[0] / 2;
      const f = T.bass === 'roundbass' && pos === 6 ? root * 1.5 : root;
      I[T.bass](ctx, out, f, t);
    }
    // drums
    if (T.drums) {
      if (T.drums.kick.includes(pos)) I.kick(ctx, out, t, 0.9);
      if (T.drums.snare.includes(pos)) I.snare(ctx, out, t, noise, 0.8);
      if (T.drums.hat.includes(pos)) I.hat(ctx, out, t, noise, pos % 2 ? 0.6 : 1);
    }
    if (T.hats && T.hats.includes(pos)) I.hat(ctx, out, t, noise, 0.7);
    // melody: plays every other time through, so the music breathes
    const cycle = Math.floor(bar / T.melody.length);
    const mel = T.melody[bar % T.melody.length][pos];
    if (mel && cycle % 2 === 0) I[T.lead](ctx, out, hz(mel), t, 1);
    else if (T.sparkle && Math.random() < T.sparkle) I[T.lead](ctx, out, chord[1 + Math.floor(Math.random() * 3)] * 4, t, 0.4);
  }

export { THEMES, INSTR, hz, makeReverb };

export const music = new MusicPlayer();
