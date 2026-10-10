import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { PainterlyPass } from './engine/painterly.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Player } from './engine/player.js';
import { audio } from './engine/audio.js';
import { music } from './engine/music.js';
import { GameUI } from './engine/ui.js';
import { settings, setSetting, onSettingsChange, addKeepsake } from './engine/settings.js';
import { chapters } from './chapters/index.js';
import { CH4 } from './story/strings.js';

const app = document.getElementById('app');

// ---------- renderer + bloom ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
app.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(72, 1, 0.1, 2400);
const composer = new EffectComposer(renderer);
const renderPass = new PainterlyPass(new THREE.Scene(), camera);
const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.34, 0.5, 1.0);
composer.addPass(renderPass);
composer.addPass(bloom);
composer.addPass(new OutputPass());

function resize() {
  const w = app.clientWidth || window.innerWidth, h = app.clientHeight || window.innerHeight;
  renderer.setSize(w, h, false);
  composer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
function applyQuality() {
  const high = settings.quality === 'high';
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, high ? 1.75 : 1));
  composer.setPixelRatio(Math.min(window.devicePixelRatio, high ? 1.75 : 1));
  if (renderer.shadowMap.enabled !== high) {
    renderer.shadowMap.enabled = high;
    state.scene?.traverse((o) => { if (o.material) o.material.needsUpdate = true; });
  }
  resize();
}
window.addEventListener('resize', resize);
onSettingsChange((k) => { if (k === 'quality') applyQuality(); });

// ---------- game state ----------
const ui = new GameUI(app);
const player = new Player(camera, renderer.domElement);
const state = { scene: null, chapter: null, index: 0, playing: false, started: false, begun: false };

function disposeScene(scene) {
  if (!scene) return;
  scene.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    const m = o.material;
    if (m && !Array.isArray(m) && m.map && !m.map.userData.shared) m.map.dispose();
  });
}

function loadChapter(i) {
  ui.clearSubs();
  ui.cinema(false);
  disposeScene(state.scene);
  const scene = new THREE.Scene();
  const Chapter = chapters[i];
  const chapter = new Chapter({
    scene, player, ui, audio, camera,
    quality: settings.quality,
    keepsakes: settings.keepsakes,
    foundKeepsake: (id) => addKeepsake(id),
    onComplete: (result) => finishChapter(result),
  });
  player.reset();
  chapter.build();
  state.scene = scene;
  state.chapter = chapter;
  state.index = i;
  state.begun = false;
  renderPass.scene = scene;
  renderer.toneMappingExposure = chapter.exposure ?? 1.05;
  renderPass.setLook(chapter.look || {});
  audio.setScene(chapter.ambience || {});
  music.play(chapter.constructor.meta.id);
  chapter.enter();
  player.update(0);
}

function play() {
  ui.hideOverlay();
  ui.showHud(true);
  player.enabled = true;
  player.lock();
  state.playing = true;
  audio.resume();
  if (!state.begun) { state.begun = true; state.chapter.begin?.(); }
}

function showChapterCard(i, keepsake) {
  ui.showBoard(chapters[i].meta.board, { onClose: () => play(), keepsake });
}

function startChapter(i) {
  audio.start();
  state.started = true;
  loadChapter(i);
  showChapterCard(i);
}

function pause() {
  if (!state.playing) return;
  state.playing = false;
  player.enabled = false;
  player.keys.clear();
  player.releasePointer();
  audio.pause();
  ui.showHud(false);
  ui.showTitle({
    resume: true,
    onStart: () => play(),
    onRestart: () => startChapter(state.index),
    onChapter: (i) => startChapter(i),
  });
}

async function finishChapter(result = {}) {
  state.playing = false;
  player.enabled = false;
  player.releasePointer();
  const next = state.index + 1;
  if (next > settings.reached) setSetting('reached', Math.min(next, chapters.length - 1));
  await ui.fade(true);
  ui.showHud(false);
  if (next < chapters.length) {
    loadChapter(next);
    const k = chapters[next - 1].meta.keepsake;
    showChapterCard(next, settings.keepsakes.includes(k) ? k : null);
  } else {
    ui.showCredits(CH4.credits, settings.keepsakes, () => { ui.hideOverlay(); startChapter(0); });
  }
  ui.fade(false);
}

function begin() {
  audio.start();
  if (!state.started) {
    state.started = true;
    player.place(...(state.chapter.startPose || [0, 0, 0]));
    player.update(0);
    showChapterCard(state.index);
  } else {
    play();
  }
}

// Esc pauses. Leaving pointer lock (which also happens on Esc) pauses too.
window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape' && state.playing) pause();
  if (e.code === 'Space' && state.playing && state.chapter.cut) { e.preventDefault(); state.chapter.skipCutscene(); }
});
let wasLocked = false;
document.addEventListener('pointerlockchange', () => {
  const locked = document.pointerLockElement === renderer.domElement;
  if (wasLocked && !locked && state.playing) pause();
  wasLocked = locked;
});
ui.onPause = () => pause();
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

// Debug handle for local testing (npm run dev only).
if (import.meta.env.DEV) window.__game = { player, state, finishChapter, loadChapter, startChapter, music, audio };

// ---------- start ----------
// Build chapter 1 right away so the title screen sits over the real place.
loadChapter(0);
applyQuality();
const coarseOnly = window.matchMedia('(pointer: coarse)').matches && !window.matchMedia('(any-pointer: fine)').matches;
const title = () => ui.showTitle({ onStart: begin, onChapter: (i) => startChapter(i) });
if (coarseOnly) ui.showNotice(title);
else title();

const clock = new THREE.Clock();
let t = 0;
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  t += dt;
  if (state.playing) {
    player.update(dt);
  } else {
    if (!state.started) player.yaw = (state.chapter.startPose?.[2] ?? 0) + Math.sin(t * 0.08) * 0.5;
    player.update(0);
  }
  state.chapter.active = state.playing;
  state.chapter.update(dt, t);
  renderer.toneMappingExposure = state.chapter.exposureNow ?? state.chapter.exposure ?? 1.05;
  audio.ambientTick(dt);
  if (settings.quality === 'high') composer.render(dt);
  else renderer.render(state.scene, camera);
});

