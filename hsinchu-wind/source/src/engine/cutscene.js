// First-person cutscenes: a keyframed camera path (smooth Hermite curves with
// time-aware tangents), timed events, optional walking bob with footsteps.
//
// keys: [{ t, pos: [x, y, z], look: [x, y, z], stop?, cut?, walk? }]
//   stop: come to rest at this key (zero velocity)
//   cut:  jump straight to this key (hard cut; hold the previous key until then)
//   walk: add head bob + footsteps on the segment that ends at this key
// events: [{ at, fn }]  — run once when the timeline passes `at`
import * as THREE from 'three';
import { audio } from './audio.js';

const h00 = (u) => 2 * u * u * u - 3 * u * u + 1;
const h10 = (u) => u * u * u - 2 * u * u + u;
const h01 = (u) => -2 * u * u * u + 3 * u * u;
const h11 = (u) => u * u * u - u * u;

function tangents(keys, field) {
  return keys.map((k, i) => {
    const zero = [0, 0, 0];
    if (i === 0 || i === keys.length - 1 || k.stop || k.cut || keys[i + 1]?.cut) return zero;
    const a = keys[i - 1], b = keys[i + 1];
    const dt = b.t - a.t || 1;
    return [0, 1, 2].map((j) => (b[field][j] - a[field][j]) / dt);
  });
}

export class Cutscene {
  constructor({ keys, events = [], onEnd, duration }) {
    this.keys = keys;
    this.events = events.map((e) => ({ ...e, done: false })).sort((a, b) => a.at - b.at);
    this.duration = duration ?? keys[keys.length - 1].t;
    this.onEnd = onEnd;
    this.t = 0;
    this.mPos = tangents(keys, 'pos');
    this.mLook = tangents(keys, 'look');
    this.phase = 0;
    this.stepAcc = 0;
    this.finished = false;
  }

  sample(t) {
    const K = this.keys;
    if (t <= K[0].t) return { pos: K[0].pos, look: K[0].look, walk: false };
    if (t >= K[K.length - 1].t) { const k = K[K.length - 1]; return { pos: k.pos, look: k.look, walk: false }; }
    let i = 0;
    while (i < K.length - 2 && t >= K[i + 1].t) i++;
    const a = K[i], b = K[i + 1];
    if (b.cut) return { pos: a.pos, look: a.look, walk: false };
    const dt = b.t - a.t, u = (t - a.t) / dt;
    const herm = (pa, pb, ma, mb) => [0, 1, 2].map((j) => h00(u) * pa[j] + h10(u) * dt * ma[j] + h01(u) * pb[j] + h11(u) * dt * mb[j]);
    return {
      pos: herm(a.pos, b.pos, this.mPos[i], this.mPos[i + 1]),
      look: herm(a.look, b.look, this.mLook[i], this.mLook[i + 1]),
      walk: !!b.walk,
    };
  }

  // Advance and apply to the camera. Returns true while running.
  update(dt, camera) {
    if (this.finished) return false;
    this.t += dt;
    for (const e of this.events) if (!e.done && this.t >= e.at) { e.done = true; e.fn(); }
    const s = this.sample(this.t);
    let bob = 0;
    if (s.walk) {
      this.phase += dt * 8.5;
      bob = Math.abs(Math.sin(this.phase)) * 0.04;
      this.stepAcc += dt * 8.5;
      if (this.stepAcc > Math.PI) { this.stepAcc -= Math.PI; audio.step(false); }
    }
    camera.position.set(s.pos[0], s.pos[1] + bob, s.pos[2]);
    camera.lookAt(new THREE.Vector3(...s.look));
    if (this.t >= this.duration) { this.finished = true; this.onEnd?.(); return false; }
    return true;
  }

  skip() {
    if (this.finished) return;
    this.finished = true;
    this.onEnd?.({ skipped: true });
  }
}
