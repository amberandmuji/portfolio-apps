// First-person walker: pointer-lock mouse look (with click-drag fallback),
// WASD movement, circle-vs-box collisions, head bob, and short camera "focus"
// moves used by interactions (look at something, walk to it, crouch, sit).
import * as THREE from 'three';
import { settings } from './settings.js';
import { audio } from './audio.js';

const smooth = (t) => t * t * (3 - 2 * t);
const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));

export class Player {
  constructor(camera, dom) {
    this.camera = camera;
    this.dom = dom;
    this.position = new THREE.Vector3();
    this.yaw = 0;
    this.pitch = 0;
    this.radius = 0.3;
    this.keys = new Set();
    this.bob = 0;
    this.stepPhase = 0;
    this.moving = false;
    this.locked = false;
    this.dragging = false;
    this.enabled = false;
    this.cine = null;
    this.reset();

    window.addEventListener('keydown', (e) => {
      if (!this.enabled) return;
      this.keys.add(e.code);
      if (e.code === 'KeyE' && this.onInteract && !this.cine) this.onInteract();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());

    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.dom;
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.enabled) return;
      // ignore the occasional huge jump some browsers report right after locking
      if (Math.abs(e.movementX) > 250 || Math.abs(e.movementY) > 250) return;
      if (this.locked || this.dragging) this.look(e.movementX, e.movementY);
    });

    // Click locks the pointer; if the browser refuses, dragging still looks around.
    this.dom.addEventListener('mousedown', (e) => {
      if (!this.enabled || e.button !== 0) return;
      this.dragging = true;
      this.lock();
    });
    window.addEventListener('mouseup', () => { this.dragging = false; });
  }

  reset() {
    this.keys.clear();
    this.colliders = [];
    this.bounds = null;
    this.eyeHeight = 1.6;
    this.baseEye = 1.6;
    this.walkSpeed = 2.8;
    this.runSpeed = 6.5;
    this.floorY = 0;
    this.heightAt = null;   // optional (x, z) => ground height, or null to keep floorY
    this.onInteract = null;
    this.cine = null;
  }

  setEye(h) { this.eyeHeight = h; this.baseEye = h; }

  lock() {
    if (this.locked || !this.dom.requestPointerLock) return;
    try {
      const p = this.dom.requestPointerLock();
      if (p && p.catch) p.catch(() => {});
    } catch { /* drag to look instead */ }
  }

  look(dx, dy) {
    if (this.cine && !this.cine.free) return;
    const s = 0.0022 * settings.sensitivity;
    this.yaw -= dx * s;
    this.pitch -= dy * s;
    this.pitch = Math.max(-1.35, Math.min(1.35, this.pitch));
  }

  place(x, z, yaw = 0) {
    this.position.set(x, 0, z);
    this.yaw = yaw;
    this.pitch = 0;
  }

  releasePointer() {
    if (document.pointerLockElement && document.exitPointerLock) document.exitPointerLock();
  }

  /**
   * Smoothly move the camera for an interaction.
   *   look:  [x, y, z] world point to turn toward (y is absolute height)
   *   move:  [x, z]    walk to this spot first
   *   eye:   number    temporary eye height (crouch / sit / tiptoe)
   *   hold:  seconds   how long to stay before control returns (movement keys end it early)
   *   keep:  true      keep eye height afterwards (e.g. sitting down)
   */
  focus({ look, move, eye, duration = 1.1, hold = 3, keep = false, lockAfter = false } = {}) {
    return new Promise((resolve) => {
      const from = { x: this.position.x, z: this.position.z, yaw: this.yaw, pitch: this.pitch, eye: this.eyeHeight };
      const to = { x: move ? move[0] : from.x, z: move ? move[1] : from.z, eye: eye ?? this.eyeHeight };
      const eyeY = this.floorY + to.eye;
      if (look) {
        const dx = look[0] - to.x, dz = look[2] - to.z;
        to.yaw = from.yaw + wrapAngle(Math.atan2(-dx, -dz) - from.yaw);
        to.pitch = Math.atan2(look[1] - eyeY, Math.max(0.3, Math.hypot(dx, dz)));
      } else { to.yaw = from.yaw; to.pitch = 0; }
      const dist = Math.hypot(to.x - from.x, to.z - from.z);
      this.cine = { t: 0, dur: Math.max(duration, dist / 2.2), hold, from, to, keep, lockAfter, resolve };
    });
  }

  endFocus() {
    const c = this.cine;
    if (!c) return;
    if (!c.keep) this.eyeHeight = this.baseEye;
    else this.baseEye = this.eyeHeight;
    this.cine = c.lockAfter ? { ...c, frozen: true } : null;
    c.resolve();
  }

  update(dt) {
    if (this.cine && !this.cine.frozen) {
      const c = this.cine;
      c.t += dt;
      const k = smooth(Math.min(1, c.t / c.dur));
      this.position.x = c.from.x + (c.to.x - c.from.x) * k;
      this.position.z = c.from.z + (c.to.z - c.from.z) * k;
      this.yaw = c.from.yaw + (c.to.yaw - c.from.yaw) * k;
      this.pitch = c.from.pitch + (c.to.pitch - c.from.pitch) * k;
      this.eyeHeight = c.from.eye + (c.to.eye - c.from.eye) * k;
      const moved = this.enabled && ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].some((key) => this.keys.has(key));
      if (c.t >= c.dur + c.hold || (c.t > c.dur && moved)) this.endFocus();
      this.camera.position.set(this.position.x, this.floorY + this.eyeHeight, this.position.z);
      this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
      return;
    }
    if (this.cine && this.cine.frozen) {
      this.camera.position.set(this.position.x, this.floorY + this.eyeHeight, this.position.z);
      this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
      return;
    }

    let fx = 0, fz = 0;
    if (this.enabled) {
      if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) fz -= 1;
      if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) fz += 1;
      if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) fx -= 1;
      if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) fx += 1;
    }
    const len = Math.hypot(fx, fz);
    this.moving = len > 0;
    const running = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');

    if (this.moving) {
      fx /= len; fz /= len;
      const speed = running ? this.runSpeed : this.walkSpeed;
      const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
      this.position.x += (fx * cos + fz * sin) * speed * dt;
      this.resolve();
      this.position.z += (-fx * sin + fz * cos) * speed * dt;
      this.resolve();
      this.bob += dt * (running ? 13 : 9);
      this.stepPhase += dt * (running ? 13 : 9);
      if (this.stepPhase > Math.PI) { this.stepPhase -= Math.PI; audio.step(running); }
    } else {
      this.bob *= 0.9;
    }

    if (this.heightAt) {
      const hh = this.heightAt(this.position.x, this.position.z);
      if (hh != null) this.floorY += (hh - this.floorY) * Math.min(1, dt * 12);
    }
    const bobY = this.moving ? Math.abs(Math.sin(this.bob)) * 0.035 : 0;
    this.camera.position.set(this.position.x, this.floorY + this.eyeHeight + bobY, this.position.z);
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
  }

  resolve() {
    const p = this.position, r = this.radius;
    for (const b of this.colliders) {
      if (p.x < b.minX - 1 || p.x > b.maxX + 1 || p.z < b.minZ - 1 || p.z > b.maxZ + 1) continue;
      const cx = Math.max(b.minX, Math.min(p.x, b.maxX));
      const cz = Math.max(b.minZ, Math.min(p.z, b.maxZ));
      const dx = p.x - cx, dz = p.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 < r * r) {
        if (d2 > 1e-8) {
          const d = Math.sqrt(d2);
          p.x = cx + (dx / d) * r;
          p.z = cz + (dz / d) * r;
        } else {
          const pushes = [
            [b.minX - r - p.x, 0], [b.maxX + r - p.x, 0],
            [0, b.minZ - r - p.z], [0, b.maxZ + r - p.z],
          ].sort((a, c) => Math.hypot(...a) - Math.hypot(...c));
          p.x += pushes[0][0]; p.z += pushes[0][1];
        }
      }
    }
    if (this.bounds) {
      p.x = Math.max(this.bounds.minX, Math.min(this.bounds.maxX, p.x));
      p.z = Math.max(this.bounds.minZ, Math.min(this.bounds.maxZ, p.z));
    }
  }

  forward(out = new THREE.Vector3()) {
    return out.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
  }
}
