// Base class for chapters: interactables (with camera moves), trigger zones,
// objectives with a waypoint (HUD arrow + light beam), wind, sky following,
// keepsakes and completion. A chapter subclass implements:
//   build()            create the world (call this.setup(...) first)
//   enter()            place the player, set the first objective
//   begin()            optional; runs the first time the player starts walking
//   tick(dt, t, gust)  per-frame chapter logic
// and may define this.targets = { objectiveKey: [x, z] } for guidance.
import * as THREE from 'three';
import { makeSky, windUniforms, windSpecks, gustAt } from './kit.js';
import { goalBeam } from './city.js';
import { Cutscene } from './cutscene.js';

export class Chapter {
  constructor(ctx, story) {
    Object.assign(this, ctx);
    this.story = story;
    this.colliders = [];
    this.things = [];
    this.zones = [];
    this.updaters = [];
    this.targets = {};
    this.target = null;
    this.wind = windUniforms();
    this.done = false;
  }

  setup(skyPreset, { specks = 220, speckColor } = {}) {
    this.light = makeSky(this.scene, skyPreset);
    this.exposure = this.light.exposure;
    this.look = this.light.look;
    this.specks = windSpecks(this.scene, this.quality === 'low' ? Math.floor(specks / 2) : specks, speckColor);
    this.beam = goalBeam(this.scene);
    this.player.colliders = this.colliders;
    this.player.onInteract = () => this.interact();
  }

  bounds(minX, maxX, minZ, maxZ) { this.player.bounds = { minX, maxX, minZ, maxZ }; }

  /**
   * Something you can press E on.
   *   view:   camera move for the interaction (see Player.focus), e.g.
   *           { look: [x, y, z], move: [x, z], eye: 0.9, hold: 3 }
   *   action: function run on interact
   *   lines:  subtitle lines (defaults to story.things[key])
   */
  thing(key, x, z, radius, prompt, { action, once = false, lines, view, y = 0 } = {}) {
    const t = { key, pos: new THREE.Vector3(x, y, z), radius, prompt, action, once, lines, view, used: false, enabled: true };
    this.things.push(t);
    return t;
  }

  zone(rect, cb, { once = true } = {}) {
    const z = { rect, cb, once, fired: false };
    this.zones.push(z);
    return z;
  }

  objective(key) {
    this.ui.setObjective(this.story.objectives[key]);
    this.currentObjective = key;
    this.setTarget(this.targets[key] || null);
  }

  // target: [x, z] or [x, z, floorY]
  setTarget(target) {
    this.target = target;
    this.beam.set(target, target?.[2] ?? 0);
    if (!target) this.ui.setWaypoint(null);
  }

  /**
   * Play a first-person cutscene (see engine/cutscene.js). Hides the HUD,
   * shows letterbox bars, Space skips. Resolves when it ends or is skipped.
   */
  playCutscene(spec) {
    this.player.enabled = false;
    this.player.cine = null;
    this.setTarget(null);
    this.ui.setPrompt(null);
    this.ui.cinema(true);
    return new Promise((resolve) => {
      this.cut = new Cutscene({
        ...spec,
        onEnd: (info) => { this.cut = null; resolve(info || {}); },
      });
    });
  }

  skipCutscene() { this.cut?.skip(); }

  // Blend the sky toward another preset (0..1), e.g. for time-lapses.
  skyBlend(preset, k) {
    const e = this.light.blend(preset, k);
    this.exposureNow = e;
  }

  say(lines, interrupt = false) { this.ui.say(lines, { interrupt }); }
  keepsake(id) { this.foundKeepsake?.(id); this.ui.toastKeepsake(id); }

  complete(result = {}) {
    if (this.done) return;
    this.done = true;
    this.ui.setPrompt(null);
    this.setTarget(null);
    this.onComplete(result);
  }

  nearestThing() {
    const p = this.player.position;
    const f = this.player.forward();
    let best = null, bestD = Infinity;
    for (const t of this.things) {
      if (t.used || !t.enabled) continue;
      if (Math.abs((t.pos.y || 0) - this.player.floorY) > 2) continue;
      const dx = t.pos.x - p.x, dz = t.pos.z - p.z;
      const d = Math.hypot(dx, dz);
      if (d > t.radius) continue;
      const facing = d < 0.9 ? 1 : (dx * f.x + dz * f.z) / d;
      if (facing < 0.3) continue;
      if (d < bestD) { bestD = d; best = t; }
    }
    return best;
  }

  interact() {
    const t = this.current;
    if (!t) return;
    const lines = t.lines || this.story.things?.[t.key];
    if (lines && lines.length) this.say(lines, true);
    if (t.view) {
      const v = typeof t.view === 'function' ? t.view() : t.view;
      this.player.focus({ hold: Math.max(2.5, (lines?.join(' ').length || 0) * 0.05), ...v });
    }
    if (t.action) t.action(t);
    if (t.once) t.used = true;
  }

  update(dt, t) {
    const p = this.player.position;
    const gust = gustAt(t);
    this.wind.uTime.value = t;
    this.wind.uGust.value = gust;
    this.audio.setWind(gust * (this.windScale ?? 1));
    this.light.follow(p, t);
    this.specks.update(dt, t, gust, p);
    for (const u of this.updaters) u(dt, t, gust);

    if (this.player.enabled && !this.done) {
      for (const z of this.zones) {
        if (z.fired && z.once) continue;
        const r = z.rect;
        const inside = typeof r === 'function' ? r(p) : p.x > r.minX && p.x < r.maxX && p.z > r.minZ && p.z < r.maxZ;
        if (inside) { z.fired = true; z.cb(); }
      }
    }
    this.tick?.(dt, t, gust);
    // eye adaptation: interiors (bright lights, white walls) get a lower exposure
    if (this.interiors && !this.lapse) {
      const inside = this.interiors.find((r) => p.x > r.minX && p.x < r.maxX && p.z > r.minZ && p.z < r.maxZ && Math.abs((r.y || 0) - this.player.floorY) < 2);
      const target = inside ? inside.exposure : this.exposure;
      const cur = this.exposureNow ?? this.exposure;
      this.exposureNow = cur + (target - cur) * Math.min(1, dt * 2.5);
    }
    if (this.cut && this.active !== false) {
      this.cut.update(dt, this.camera);
      if (this.cut) { p.x = this.camera.position.x; p.z = this.camera.position.z; }
    }

    // waypoint: arrow + distance on the HUD, beam in the world
    if (this.target) {
      const dx = this.target[0] - p.x, dz = this.target[1] - p.z;
      const dist = Math.hypot(dx, dz);
      const rel = Math.atan2(Math.sin(Math.atan2(-dx, -dz) - this.player.yaw), Math.cos(Math.atan2(-dx, -dz) - this.player.yaw));
      this.ui.setWaypoint(dist, rel);
      this.beam.update(t, dist);
    }

    this.current = this.player.enabled && !this.done && !this.player.cine && !this.cut ? this.nearestThing() : null;
    this.ui.setPrompt(this.current ? this.current.prompt : null);
  }
}
