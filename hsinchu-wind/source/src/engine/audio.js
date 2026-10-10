// Procedural soundscape: no audio files needed. Swap in real field recordings
// later (wind, the Liujia line train, your street) for the most authentic result.
import { settings, onSettingsChange } from './settings.js';

let ctx = null;
let master, windGain, windFilter, bugGain, trainGain, trainFilter, trafficGain;
let noiseBuf, brownBuf;
let pending = null, birds = false, birdTimer = 2;

function makeNoise(c, seconds, brown = false) {
  const len = c.sampleRate * seconds;
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
    else d[i] = w;
  }
  return buf;
}

function loop(buf) {
  const s = ctx.createBufferSource();
  s.buffer = buf; s.loop = true; s.start();
  return s;
}

export const audio = {
  get ready() { return !!ctx; },
  get context() { return ctx; },
  get master() { return master; },

  // Must be called from a click (browsers block sound until the player interacts).
  start() {
    if (ctx) { ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = settings.volume;
    master.connect(ctx.destination);
    this.onStart?.();
    onSettingsChange((k, v) => { if (k === 'volume') master.gain.setTargetAtTime(v, ctx.currentTime, 0.05); });

    noiseBuf = makeNoise(ctx, 4);
    brownBuf = makeNoise(ctx, 4, true);

    // Wind: band-passed noise whose loudness follows the gust value.
    windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass'; windFilter.frequency.value = 500; windFilter.Q.value = 0.7;
    windGain = ctx.createGain(); windGain.gain.value = 0.0;
    loop(noiseBuf).connect(windFilter); windFilter.connect(windGain); windGain.connect(master);

    // Dusk insects: high narrow band with a fast tremolo.
    const bugFilter = ctx.createBiquadFilter();
    bugFilter.type = 'bandpass'; bugFilter.frequency.value = 4800; bugFilter.Q.value = 12;
    const trem = ctx.createGain(); trem.gain.value = 0.5;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 23;
    const lfoAmt = ctx.createGain(); lfoAmt.gain.value = 0.5;
    lfo.connect(lfoAmt); lfoAmt.connect(trem.gain); lfo.start();
    bugGain = ctx.createGain(); bugGain.gain.value = 0.05;
    loop(noiseBuf).connect(bugFilter); bugFilter.connect(trem); trem.connect(bugGain); bugGain.connect(master);

    // Train rumble: low brown noise, level set from the world.
    trainFilter = ctx.createBiquadFilter();
    trainFilter.type = 'lowpass'; trainFilter.frequency.value = 180;
    trainGain = ctx.createGain(); trainGain.gain.value = 0;
    loop(brownBuf).connect(trainFilter); trainFilter.connect(trainGain); trainGain.connect(master);

    // City traffic: a soft low roar, level set per chapter.
    const trafficFilter = ctx.createBiquadFilter();
    trafficFilter.type = 'lowpass'; trafficFilter.frequency.value = 420;
    trafficGain = ctx.createGain(); trafficGain.gain.value = 0;
    loop(brownBuf).connect(trafficFilter); trafficFilter.connect(trafficGain); trafficGain.connect(master);
    if (pending) { this.setScene(pending); pending = null; }
  },

  // Per-chapter ambience: { bugs: 0..1, traffic: 0..1, birds: bool }
  setScene(opts) {
    if (!ctx) { pending = opts; return; }
    const t = ctx.currentTime;
    bugGain.gain.setTargetAtTime(0.06 * (opts.bugs ?? 0), t, 0.5);
    trafficGain.gain.setTargetAtTime(0.5 * (opts.traffic ?? 0), t, 0.5);
    birds = !!opts.birds;
  },

  // Called every frame by main; schedules occasional bird chirps.
  ambientTick(dt) {
    if (!ctx || !birds) return;
    birdTimer -= dt;
    if (birdTimer < 0) { birdTimer = 2 + Math.random() * 5; this.chirp(); }
  },

  chirp() {
    if (!ctx) return;
    const t = ctx.currentTime;
    const n = 2 + Math.floor(Math.random() * 3);
    const base = 2600 + Math.random() * 1400;
    for (let i = 0; i < n; i++) {
      const o = ctx.createOscillator(); o.type = 'sine';
      const g = ctx.createGain();
      const t0 = t + i * 0.13;
      o.frequency.setValueAtTime(base, t0);
      o.frequency.exponentialRampToValueAtTime(base * 1.35, t0 + 0.07);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.025, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.1);
      o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + 0.12);
    }
  },

  // Westminster Quarters: the bell every Taiwanese school rings.
  bell() {
    if (!ctx) return;
    const E = 329.63, Fs = 369.99, Gs = 415.3, B = 246.94;
    const seq = [E, Gs, Fs, B, E, Fs, Gs, E, Gs, E, Fs, B, B, Fs, Gs, E];
    const t = ctx.currentTime + 0.05;
    seq.forEach((f, i) => {
      const t0 = t + i * 0.62 + (i % 4 === 3 ? 0.3 : 0) + Math.floor(i / 4) * 0.3;
      [1, 2.01, 3.0].forEach((h, k) => {
        const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f * h;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime([0.09, 0.03, 0.015][k], t0 + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.6);
        o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + 1.7);
      });
    });
  },

  // Crosswalk signal tick.
  beep() {
    if (!ctx) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = 1180;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.02, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.08);
  },

  pause() { if (ctx) ctx.suspend(); },
  resume() { if (ctx) ctx.resume(); },

  // gust: 0..1
  setWind(gust) {
    if (!ctx) return;
    const t = ctx.currentTime;
    windGain.gain.setTargetAtTime(0.05 + gust * 0.22, t, 0.3);
    windFilter.frequency.setTargetAtTime(380 + gust * 700, t, 0.4);
  },

  // level: 0..1 from distance to the train
  setTrain(level) {
    if (!ctx) return;
    const t = ctx.currentTime;
    trainGain.gain.setTargetAtTime(level * 0.9, t, 0.15);
    trainFilter.frequency.setTargetAtTime(140 + level * 260, t, 0.2);
  },

  clack(level) {
    if (!ctx || level < 0.05) return;
    const t = ctx.currentTime;
    [0, 0.11].forEach((dt) => {
      const s = ctx.createBufferSource(); s.buffer = noiseBuf;
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 2;
      const g = ctx.createGain();
      g.gain.setValueAtTime(level * 0.35, t + dt);
      g.gain.exponentialRampToValueAtTime(0.001, t + dt + 0.08);
      s.connect(f); f.connect(g); g.connect(master);
      s.start(t + dt, Math.random() * 3, 0.1);
    });
  },

  horn(level = 1) {
    if (!ctx) return;
    const t = ctx.currentTime;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.12 * level, t + 0.08);
    g.gain.setValueAtTime(0.12 * level, t + 1.1);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400;
    [311, 392].forEach((f) => {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
      o.connect(lp); o.start(t); o.stop(t + 1.6);
    });
    lp.connect(g); g.connect(master);
  },

  step(running = false) {
    if (!ctx) return;
    const t = ctx.currentTime;
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = running ? 700 : 500;
    const g = ctx.createGain();
    g.gain.setValueAtTime(running ? 0.14 : 0.09, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    s.connect(f); f.connect(g); g.connect(master);
    s.start(t, Math.random() * 3, 0.1);
  },

  // Two-tone door chime and soft UI tones.
  chime() {
    if (!ctx) return;
    const t = ctx.currentTime;
    [[988, 0], [784, 0.32]].forEach(([f, dt]) => {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t + dt);
      g.gain.exponentialRampToValueAtTime(0.12, t + dt + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dt + 0.9);
      o.connect(g); g.connect(master); o.start(t + dt); o.stop(t + dt + 1);
    });
  },

  blip() {
    if (!ctx) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = 660;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.06, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.3);
  },
};
