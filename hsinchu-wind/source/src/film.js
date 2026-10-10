// Trailer capture: renders the real game scenes with scripted camera moves,
// one frame at a time, so a headless browser can screenshot every frame.
// Driven from scripts/render-trailer.py through window.film.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { PainterlyPass } from './engine/painterly.js';
import { Player } from './engine/player.js';
import { audio } from './engine/audio.js';
import { GameUI } from './engine/ui.js';
import { chapters } from './chapters/index.js';
import { THEMES, playStep, makeReverb } from './engine/music.js';

const params = new URLSearchParams(location.search);
const W = Number(params.get('w') || 1920), H = Number(params.get('h') || 1080);
export const FPS = 24;

const app = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setPixelRatio(1);
renderer.setSize(W, H);
app.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 2400);
const composer = new EffectComposer(renderer);
const pass = new PainterlyPass(new THREE.Scene(), camera);
composer.addPass(pass);
composer.addPass(new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.34, 0.5, 1.0));
composer.addPass(new OutputPass());
composer.setPixelRatio(1);
composer.setSize(W, H);

// the game UI exists (chapters talk to it) but stays hidden; the trailer has its own overlays
const ui = new GameUI(document.createElement('div'));
const player = new Player(camera, renderer.domElement);

const $ = (id) => document.getElementById(id);
const el = { title: $('f-title'), label: $('f-label'), prompt: $('f-prompt'), sub: $('f-sub'), end: $('f-end'), fade: $('f-fade'), shade: document.querySelector('#film-overlay .shade') };
const show = (node, a) => { node.style.opacity = Math.max(0, Math.min(1, a)).toFixed(3); };
const ramp = (t, a, b) => Math.max(0, Math.min(1, (t - a) / (b - a)));
const ease = (t) => t * t * (3 - 2 * t);
const lerp = (a, b, k) => a + (b - a) * k;
const lerp3 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];

// ---------------------------------------------------------------------------
// Shot list (seconds). Each shot: chapter index, duration, camera(u) -> {pos, look}
// ---------------------------------------------------------------------------
const RB = { x: 0, z: -45 };
const PLAT = 9.2 + 0.95;                     // chapter 1 platform floor
const sub = (t, line, a = 0.25, b = 99) => { el.sub.querySelector('.line').textContent = line; show(el.sub, ramp(t, a, a + 0.25) * (1 - ramp(t, b, b + 0.2))); };
const prompt = (t, text, a = 0.1, b = 0.7) => { el.prompt.querySelector('span').textContent = text; show(el.prompt, ramp(t, a, a + 0.15) * (1 - ramp(t, b, b + 0.15))); };
export const SHOTS = [
  { // 1. Title over Qianjia at dusk: rise toward the elevated station as a train glides in
    chapter: 0, dur: 2.6, warm: 2,
    setup: (ch) => { ch.trainClock = 14.5; },
    camera: (u) => ({ pos: lerp3([9, 2.4, -34], [4, 5.6, -66], ease(u)), look: lerp3([0, 7, -104], [0, 9, -107], ease(u)) }),
    overlay: (t) => { show(el.shade, 1); show(el.title, ramp(t, 0.2, 0.8) * (1 - ramp(t, 2.15, 2.5))); },
  },
  { // 2. Interaction: the corner store's coffee bar, press E and the view moves in
    chapter: 0, dur: 2.0, keep: true,
    camera: (u, t) => {
      const k = ease(ramp(t, 0.55, 1.6));
      return { pos: lerp3([10.6, 1.62, -29.4], [10.45, 1.32, -31.75], k), look: lerp3([10.2, 1.7, -33.4], [10.0, 1.35, -33.1], k) };
    },
    overlay: (t) => { show(el.shade, 0.55); prompt(t, 'Watch the coffee machine', 0.08, 0.5); sub(t, 'Mom gets her latte here every morning.', 0.75); },
  },
  { // 3. First-person on Platform 1: the train pulls in
    chapter: 0, dur: 2.4, keep: true,
    floor: PLAT,
    setup: (ch) => { ch.approachDur = 11; ch.trainClock = 7.2; },
    camera: (u) => ({ pos: [5.1, PLAT + 1.15, -103.9], look: lerp3([-60, PLAT + 0.8, -107.6], [-14, PLAT + 1.0, -107.6], ease(u)) }),
    overlay: (t) => { show(el.shade, 0.55); sub(t, 'The train! It is coming!', 0.3); },
  },
  { // 4. Girls' High morning: over the sunken plaza steps toward Yingxi Gate
    chapter: 1, dur: 2.0, warm: 3,
    camera: (u) => ({ pos: lerp3([5, 7, -63], [0.8, 2.8, -57.5], ease(u)), look: lerp3([0, -1.5, -44], [0, 5.5, -35], ease(u)) }),
    overlay: (t) => label(t, 'Girls’ High', '新竹女中', 'Chapter 2 · High school'),
  },
  { // 5. NYCU, midnight: down the neon street outside the gate
    chapter: 2, dur: 2.0, warm: 2,
    camera: (u) => ({ pos: lerp3([0.6, 2.0, -158], [0.2, 2.3, -178], ease(u)), look: lerp3([-3, 5.5, -230], [-2, 6.5, -250], ease(u)) }),
    overlay: (t) => label(t, 'NYCU', '陽明交大', 'Chapter 3 · University'),
  },
  { // 6. Now: Big City plaza, the fountain, the canopies and the blue disc
    chapter: 3, dur: 1.8, warm: 5,
    camera: (u) => ({ pos: lerp3([22, 2.2, -45], [13, 4.6, -47], ease(u)), look: lerp3([-12, 9, -66], [-30, 20, -74], ease(u)) }),
    overlay: (t) => label(t, 'Big City', '巨城', 'Chapter 4 · Now'),
  },
  { // 7. Home on the 22nd floor: step out onto the balcony, end card
    chapter: 3, dur: 2.2, keep: true,
    setup: (ch) => {
      ch.player.floorY = 0; ch.towerCollider.minX = 9999; ch.opening = 0.999; ch.windScale = 2; ch.nightK = 0.9;
      ch.doors[0].position.x = -30 - 5; ch.doors[1].position.x = -30 + 5;
    },
    camera: (u) => ({ pos: lerp3([-30, 65.9, 8.5], [-30, 66.1, 3.0], ease(u)), look: lerp3([-8, 52, -110], [0, 44, -120], ease(u)) }),
    overlay: (t) => { show(el.label, 0); show(el.shade, 0); show(el.end, ramp(t, 0.4, 1.0)); },
  },
];
export const TOTAL = SHOTS.reduce((a, s) => a + s.dur, 0);

function label(t, en, zh, band) {
  const f = el.label;
  f.querySelector('.en').textContent = en;
  f.querySelector('.zh').textContent = zh;
  f.querySelector('.f-band').textContent = band;
  show(f, ramp(t, 0.2, 0.6));
  f.style.transform = `translateY(${(1 - ease(ramp(t, 0.2, 0.6))) * 18}px)`;
  show(el.shade, 0.8);
}

// ---------------------------------------------------------------------------
// Scene management
// ---------------------------------------------------------------------------
let current = { index: -1, chapter: null, scene: null, t: 0 };

function dispose(scene) {
  scene?.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
}

function buildChapter(i) {
  dispose(current.scene);
  const scene = new THREE.Scene();
  player.reset();
  const ch = new chapters[i]({ scene, player, ui, audio, camera, quality: 'high', keepsakes: ['photo', 'nametag', 'strip', 'ticket'], foundKeepsake: () => {}, onComplete: () => {} });
  ch.build();
  ch.enter();
  ch.beam.set(null); ch.target = null;
  ch.setTarget = () => {}; // no goal beam in the trailer
  pass.scene = scene;
  pass.setLook(ch.look || {});
  renderer.toneMappingExposure = ch.exposure ?? 1.05;
  current = { index: i, chapter: ch, scene, t: 10 };
  return ch;
}

function step(ch, dt) {
  current.t += dt;
  ch.update(dt, current.t);
}

// Prepare a shot: build (or keep) the chapter, run setup, simulate warm-up time.
function prepare(shotIndex) {
  const s = SHOTS[shotIndex];
  const ch = s.keep && current.index === s.chapter ? current.chapter : buildChapter(s.chapter);
  player.enabled = false;
  for (let i = 0; i < (s.warm || 0) * FPS; i++) step(ch, 1 / FPS);
  s.setup?.(ch);
  ['title', 'label', 'prompt', 'sub', 'end'].forEach((k) => show(el[k], 0));
  return ch;
}

// Render frame f (0-based) of the whole trailer.
let prepared = -1;
function frame(f) {
  const t = f / FPS;
  let acc = 0, si = 0;
  while (si < SHOTS.length - 1 && t >= acc + SHOTS[si].dur) { acc += SHOTS[si].dur; si++; }
  if (si !== prepared) { prepare(si); prepared = si; }
  const s = SHOTS[si], lt = t - acc, u = Math.min(1, lt / s.dur);
  const ch = current.chapter;
  const cam = s.camera(u, lt);
  player.position.set(cam.pos[0], 0, cam.pos[2]);
  if (s.floor != null) player.floorY = s.floor;
  else if (s.chapter !== 3) player.floorY = 0;
  step(ch, 1 / FPS);
  camera.position.set(...cam.pos);
  camera.lookAt(...cam.look);
  renderer.toneMappingExposure = ch.exposureNow ?? ch.exposure ?? 1.05;
  s.overlay?.(lt);
  // quick dip to black at each cut
  const edge = Math.min(lt, s.dur - lt);
  const isFirst = si === 0, isLast = si === SHOTS.length - 1;
  let dip = 1 - ramp(edge, 0, 0.14);
  if (isFirst && lt < s.dur / 2) dip = 1 - ramp(lt, 0, 0.5);
  if (isLast && lt > s.dur / 2) dip = 0;
  show(el.fade, dip);
  composer.render(1 / FPS);
  return { shot: si, t: +t.toFixed(3) };
}

// ---------------------------------------------------------------------------
// Soundtrack: the game's evening theme, rendered offline, with wind at the cuts.
// ---------------------------------------------------------------------------
async function renderAudio() {
  const SR = 48000, len = Math.ceil(TOTAL * SR);
  const ctx = new OfflineAudioContext(2, len, SR);
  const master = ctx.createGain(); master.connect(ctx.destination);
  const bus = ctx.createGain(); bus.gain.value = 0.9; bus.connect(master);
  const reverb = makeReverb(ctx); const wet = ctx.createGain(); wet.gain.value = 0.4; reverb.connect(wet); wet.connect(master);
  bus.connect(reverb);
  const noise = ctx.createBuffer(1, SR, SR);
  const nd = noise.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  // music: evening theme a little faster so a full phrase fits
  const T = { ...THEMES.bigcity, bpm: 78, melody: THEMES.bigcity.melody };
  const stepDur = 60 / T.bpm / 2;
  for (let s = 0; s * stepDur < TOTAL - 0.5; s++) playStep(ctx, bus, noise, T, Math.floor(s / 8), s % 8, 0.05 + s * stepDur, stepDur);
  // music box sparkles over the opening, like chapter 1
  const box = ['E6', 'C6', 'A5', 'G5', 'E6', 'D6'];
  const { INSTR, hz } = await import('./engine/music.js');
  box.forEach((n, i) => INSTR.musicbox(ctx, bus, hz(n), 0.4 + i * 0.42, 0.55));
  // fade in, swell for the end card, fade out
  master.gain.setValueAtTime(0.0001, 0);
  master.gain.exponentialRampToValueAtTime(1, 0.8);
  master.gain.setValueAtTime(1, TOTAL - 2.6);
  master.gain.linearRampToValueAtTime(1.25, TOTAL - 1.4);
  master.gain.linearRampToValueAtTime(0.0001, TOTAL - 0.05);
  // soft wind whooshes at each cut
  let acc = 0;
  SHOTS.forEach((s, i) => {
    if (i > 0) {
      const src = ctx.createBufferSource(); src.buffer = noise; src.loop = true;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.8;
      bp.frequency.setValueAtTime(300, acc - 0.4); bp.frequency.exponentialRampToValueAtTime(1400, acc + 0.4);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, acc - 0.5); g.gain.exponentialRampToValueAtTime(0.09, acc); g.gain.exponentialRampToValueAtTime(0.0001, acc + 0.7);
      src.connect(bp); bp.connect(g); g.connect(master); src.start(Math.max(0, acc - 0.5)); src.stop(acc + 0.8);
    }
    acc += s.dur;
  });
  const buf = await ctx.startRendering();
  // encode 16-bit PCM WAV, return base64
  const ch0 = buf.getChannelData(0), ch1 = buf.getChannelData(1);
  const n = buf.length, out = new DataView(new ArrayBuffer(44 + n * 4));
  const wstr = (o, s) => [...s].forEach((c, i) => out.setUint8(o + i, c.charCodeAt(0)));
  wstr(0, 'RIFF'); out.setUint32(4, 36 + n * 4, true); wstr(8, 'WAVE'); wstr(12, 'fmt ');
  out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, 2, true); out.setUint32(24, SR, true);
  out.setUint32(28, SR * 4, true); out.setUint16(32, 4, true); out.setUint16(34, 16, true); wstr(36, 'data'); out.setUint32(40, n * 4, true);
  let peak = 0; for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(ch0[i]), Math.abs(ch1[i]));
  const norm = peak > 0 ? 0.89 / peak : 1;
  for (let i = 0; i < n; i++) {
    out.setInt16(44 + i * 4, Math.max(-1, Math.min(1, ch0[i] * norm)) * 32767, true);
    out.setInt16(46 + i * 4, Math.max(-1, Math.min(1, ch1[i] * norm)) * 32767, true);
  }
  const bytes = new Uint8Array(out.buffer);
  let bin = ''; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

window.film = { frame, renderAudio, frames: Math.round(TOTAL * FPS), fps: FPS, ready: true };
