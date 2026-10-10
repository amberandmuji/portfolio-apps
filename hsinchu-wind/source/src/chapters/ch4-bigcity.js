// Chapter 4 · Now · Big City (巨城), Zhongyang Road · evening into night
// Cross Zhongyang Road at the light → meet family on the Big City plaza →
// cross back → up to the 22nd-floor apartment → the shelf of keepsakes →
// open the balcony door and let the wind in. Credits.
//
// Map (meters; north is -z).
//   z ≈ 0 … 25      south side: residential towers, your building at x ≈ -30
//   z ≈ -8 … -32    Zhongyang Road (6 lanes), crosswalk at x ≈ 0
//   z ≈ -36 … -70   Big City plaza; mall facade at z ≈ -70
//   y ≈ 64          your apartment (22F), balcony facing the mall
import * as THREE from 'three';
import { Chapter } from '../engine/chapter.js';
import { CH4, KEEPSAKES } from '../story/strings.js';
import { settings } from '../engine/settings.js';
import { music } from '../engine/music.js';
import {
  box, tbox, ground, mat, glow, sign, canvasTexture, fitText, scooter, car, tree, crowd,
  personMesh, streetLamp, tower, hills, rand, pick,
} from '../engine/kit.js';
import { CityBuilder, district, signpost } from '../engine/city.js';
import { buildMall } from './ch4-mall.js';

const ROAD = { z0: -8, z1: -32 };
const HOME = { x: -30, z: 12, floor: 64.2 };
const CYCLE = 34, CAR_GREEN = 18, YELLOW = 3; // pedestrians walk for the rest

export class ChapterBigCity extends Chapter {
  static meta = { id: 'bigcity', board: CH4.board, keepsake: 'ticket' };

  constructor(ctx) {
    super(ctx, CH4);
    this.ambience = { bugs: 0.1, traffic: 0.85 };
    this.startPose = [0, -2, 0];
    this.stage = 'cross';
    this.lightClock = 4;
    this.lastCount = -1;
    this.nightK = 0.55;
  }

  build() {
    const s = this.scene;
    this.setup('evening', { specks: 120, speckColor: '#ffe6c8' });
    this.bounds(-228, 228, -228, 198);

    ground(s, { w: 1400, d: 1400, color: '#6b6a68', texName: 'concrete', scale: 6 });
    ground(s, { w: 400, d: 24, z: -20, y: 0.02, color: '#6c6e72', texName: 'asphalt', scale: 4 });
    ground(s, { w: 400, d: 8, z: -4, y: 0.04, color: '#b6afa4', texName: 'pavers', scale: 1 });
    // lane lines, center median, crosswalk zebra, stop lines, scooter waiting boxes
    for (let x = -200; x < 200; x += 8) [-12, -16, -24, -28].forEach((z) => { if (Math.abs(x) > 6) ground(s, { w: 4, d: 0.14, x, z, y: 0.03, color: '#e8e4da', texName: 'concrete' }); });
    tbox(s, { w: 400, h: 0.25, d: 1.2, x: 0, z: -20, color: '#c9c3b8', texName: 'concrete' });
    for (let x = 4; x < 200; x += 6) { tree(s, { x, z: -20, scale: 0.55, color: '#3c5a36' }); tree(s, { x: -x, z: -20, scale: 0.55, color: '#3c5a36' }); }
    for (let z = ROAD.z0 - 0.6; z > ROAD.z1; z -= 1.1) if (Math.abs(z + 20) > 0.8) ground(s, { w: 5.5, d: 0.55, x: 0, z, y: 0.035, color: '#f2efe6', texName: 'concrete' });
    [[-4.2, -14], [4.2, -26]].forEach(([x, z]) => {
      ground(s, { w: 0.3, d: 12, x, z, y: 0.035, color: '#f2efe6', texName: 'concrete' });
      const bx = x + (x < 0 ? -3 : 3);
      ground(s, { w: 4, d: 11, x: bx, z, y: 0.032, color: '#8a5a50', texName: 'asphalt', scale: 3 });
      sign(s, { w: 3.2, h: 1, x: bx, y: 0.04, z, rotY: 0, emissive: 0.1, draw: (g, w, h) => { g.clearRect(0, 0, w, h); fitText(g, 'SCOOTERS', w / 2, h / 2, w * 0.95, h * 0.55, '700 {s}px "IBM Plex Sans", Arial, sans-serif', '#f2efe6'); } }).rotation.x = -Math.PI / 2;
    });

    this.buildSouthSide();
    this.buildMall();
    this.buildSignals();
    this.buildTraffic();
    this.buildApartment();
    this.buildSurroundings();

    // the rest of the city glowing out to the hills
    for (let i = 0; i < 70; i++) {
      const a = rand(0, Math.PI * 2), r = rand(140, 420);
      tower(s, { x: Math.cos(a) * r, z: Math.sin(a) * r - 40, w: rand(16, 34), d: rand(16, 34), h: rand(25, 110), color: '#4a4c58', litRatio: rand(0.3, 0.6), nightGlow: 0.9 });
    }
    hills(s, [[500, -200, 240, 80], [460, 140, 200, 60], [-520, -320, 260, 70]], '#3a3550');

    this.thing('street', -6, -2, 3.2, 'Look down the street', { view: { look: [-220, 4, -20], hold: 3.5 } });
  }

  buildSouthSide() {
    const s = this.scene;
    // residential towers along the south sidewalk; yours is built separately
    [[-62, 16, 20, 18, 70], [10, 16, 18, 16, 85], [36, 18, 20, 18, 60], [62, 16, 18, 16, 95]].forEach(([x, z, w, d, h]) => {
      tower(s, { x, z, w, d, h, color: pick(['#cfc9bf', '#bfc6cc', '#d9d0c0']), litRatio: 0.5, nightGlow: 0.9 });
      this.colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
      // ground-floor shops
      const glowFront = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.8, 3), glow(pick(['#fff1d6', '#e6f3ff', '#ffe3c8']), 1.0));
      glowFront.position.set(x, 1.6, z - d / 2 - 0.03); glowFront.rotation.y = Math.PI; s.add(glowFront);
    });
    for (let x = -55; x <= 55; x += 14) streetLamp(s, { x, z: -7, rotY: Math.PI, height: 8, color: '#ffe0b0' });
    for (let x = -52; x < 52; x += 1.0) if (Math.random() < 0.45 && Math.abs(x) > 5 && Math.abs(x + 30) > 4) scooter(s, { x, z: -1.2, rotY: Math.PI + rand(-0.12, 0.12) });
    // people on the south sidewalk
    this.south = crowd(s, [
      { path: [[-55, -3], [55, -3]], loop: true, speed: 1.2 }, { path: [[50, -5], [-50, -5]], loop: true, speed: 1.0 },
      { path: [[-20, -4], [30, -4]], loop: true, speed: 1.3, bag: true }, { x: 3.5, z: -6.5, rotY: Math.PI }, { x: -2.5, z: -6.2, rotY: Math.PI + 0.2 },
    ]);
    this.updaters.push((dt, t) => this.south.update(dt, t));
  }

  buildMall() { buildMall(this); }

  drawScreen(n) {
    const g = this.screenCanvas.getContext('2d');
    const W = 512, H = 288;
    const scenes = [
      ['#ff6a3d', '#ffc14d', 'AUTUMN SALE', 'Floors 1–7 · this weekend'],
      ['#1e3c72', '#2a9df4', 'NEW ON 4F', 'Eat. Shop. Repeat.'],
      ['#2b5876', '#4e4376', 'CINEMA', 'Late shows every night'],
      ['#11998e', '#38ef7d', 'HSINCHU', 'Windy city, warm nights'],
    ];
    const [a, b, t1, t2] = scenes[n % scenes.length];
    const grd = g.createLinearGradient(0, 0, W, H); grd.addColorStop(0, a); grd.addColorStop(1, b);
    g.fillStyle = grd; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,255,255,0.12)';
    for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(rand(0, W), rand(0, H), rand(30, 120), 0, Math.PI * 2); g.fill(); }
    fitText(g, t1, W / 2, H * 0.45, W * 0.85, 64, '700 {s}px "IBM Plex Sans", sans-serif', '#ffffff');
    fitText(g, t2, W / 2, H * 0.68, W * 0.8, 26, '400 {s}px "IBM Plex Sans", sans-serif', 'rgba(255,255,255,0.9)');
    this.screenTex.needsUpdate = true;
    if (this.screenLight) this.screenLight.color.set(a);
  }

  buildSignals() {
    const s = this.scene;
    this.signals = [];
    [[3.6, -7.2, Math.PI], [-3.6, -32.8, 0]].forEach(([x, z, ry]) => {
      box(s, { w: 0.16, h: 3.4, d: 0.16, x, z, color: '#4a4e52' });
      const c = document.createElement('canvas'); c.width = 128; c.height = 192;
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
      const face = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.75), new THREE.MeshBasicMaterial({ map: t, toneMapped: false }));
      face.position.set(x, 2.9, z + (ry === 0 ? 0.1 : -0.1)); face.rotation.y = ry; s.add(face);
      box(s, { w: 0.56, h: 0.82, d: 0.2, x, y: 2.5, z, color: '#2a2c2e' });
      this.signals.push({ c, t });
    });
    // car signals on mast arms
    this.carLamps = [];
    [[-8, -6.5, 0], [8, -33.5, Math.PI]].forEach(([x, z, ry]) => {
      box(s, { w: 0.25, h: 6, d: 0.25, x, z, color: '#4a4e52' });
      const arm = box(s, { w: 0.15, h: 0.15, d: 8, x, y: 5.8, z: z + (ry === 0 ? -4 : 4), color: '#4a4e52' });
      arm.rotation.y = 0;
      const housing = box(s, { w: 1.4, h: 0.5, d: 0.3, x, y: 5.3, z: z + (ry === 0 ? -7 : 7), color: '#222' });
      housing.rotation.y = Math.PI / 2;
      const lamps = ['#ff3326', '#ffb21f', '#33ff88'].map((col, i) => {
        const m = new THREE.Mesh(new THREE.CircleGeometry(0.14, 16), new THREE.MeshBasicMaterial({ color: col, toneMapped: false }));
        m.position.set(x + (ry === 0 ? -0.16 : 0.16), 5.55, z + (ry === 0 ? -7 : 7) + (i - 1) * 0.42 * (ry === 0 ? -1 : 1));
        m.rotation.y = ry === 0 ? -Math.PI / 2 : Math.PI / 2;
        s.add(m); return m;
      });
      this.carLamps.push(lamps);
    });
  }

  drawSignals(walk, count) {
    for (const { c, t } of this.signals) {
      const g = c.getContext('2d');
      g.fillStyle = '#0c0c0c'; g.fillRect(0, 0, 128, 192);
      const col = walk ? '#3dff8a' : '#ff3b2f';
      g.fillStyle = col;
      // the little walking figure (two poses when walking)
      const x = 64, y = 62, k = walk && Math.floor(performance.now() / 350) % 2;
      g.beginPath(); g.arc(x, y - 30, 9, 0, Math.PI * 2); g.fill();
      g.fillRect(x - 6, y - 20, 12, 28);
      g.save(); g.translate(x, y + 8);
      [-1, 1].forEach((sd) => { g.save(); g.rotate(walk ? sd * (k ? 0.45 : 0.2) : 0); g.fillRect(-4, 0, 8, 26); g.restore(); });
      g.restore();
      g.font = '700 46px "IBM Plex Mono", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(walk ? String(count).padStart(2, '0') : '', 64, 160);
      t.needsUpdate = true;
    }
  }

  buildTraffic() {
    const s = this.scene;
    this.vehicles = [];
    const lanes = [
      { z: -9.6, dir: 1, scoot: true }, { z: -13.6, dir: 1 }, { z: -17.4, dir: 1 },
      { z: -22.6, dir: -1 }, { z: -26.4, dir: -1 }, { z: -30.4, dir: -1, scoot: true },
    ];
    lanes.forEach((ln) => {
      const n = ln.scoot ? 18 : 7;
      for (let i = 0; i < n; i++) {
        const m = ln.scoot ? scooter(s, { x: 0, z: 0, rider: true }) : car(s, { taxi: Math.random() < 0.15 });
        m.rotation.y = ln.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
        this.vehicles.push({ m, ln, x: -220 + (440 / n) * i + rand(-6, 6), v: 0, vmax: ln.scoot ? rand(9, 12) : rand(10, 13), len: ln.scoot ? 1.8 : 4.6, zoff: ln.scoot ? rand(-0.8, 0.8) : 0 });
      }
    });
    this.byLane = lanes.map((ln) => this.vehicles.filter((v) => v.ln === ln));
  }

  updateTraffic(dt, carGo) {
    for (const laneVs of this.byLane) {
      const dir = laneVs[0].ln.dir;
      // order by progress along the direction of travel
      laneVs.sort((a, b) => (b.x - a.x) * dir);
      laneVs.forEach((v, i) => {
        const stopX = dir > 0 ? -6.5 : 6.5;
        const ahead = i > 0 ? laneVs[i - 1] : null;
        let limit = Infinity;
        if (ahead) limit = (ahead.x - v.x) * dir - ahead.len - 1.2;
        const beforeStop = (stopX - v.x) * dir;
        if (!carGo && beforeStop > -0.5 && beforeStop < 40) limit = Math.min(limit, beforeStop - v.len / 2);
        const target = limit < 1 ? 0 : Math.min(v.vmax, limit * 1.2);
        v.v += Math.max(-14 * dt, Math.min(4 * dt, target - v.v));
        v.v = Math.max(0, v.v);
        v.x += dir * v.v * dt;
        if (v.x > 230) v.x -= 460; if (v.x < -230) v.x += 460;
        v.m.position.set(v.x, 0, v.ln.z + v.zoff);
      });
    }
  }

  buildApartment() {
    const s = this.scene;
    const { x: X, z: Z, floor: F } = HOME;
    const w = 16, d = 16;
    // tower below and above the apartment floor
    tower(s, { x: X, z: Z, w, d, h: F - 0.2, color: '#d6d0c4', litRatio: 0.45, nightGlow: 0.9 });
    const upper = tower(s, { x: X, z: Z, w, d, h: 22, color: '#d6d0c4', litRatio: 0.45, nightGlow: 0.9 });
    upper.position.y = F + 3.4;
    const crown = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.5, d + 0.4), glow('#6fb6ff', 1.8));
    crown.position.set(X, F + 3.4 + 22.2, Z); s.add(crown);
    this.towerCollider = { minX: X - w / 2, maxX: X + w / 2, minZ: Z - d / 2, maxZ: Z + d / 2 };
    this.colliders.push(this.towerCollider);
    // lobby door at street level
    const lobby = new THREE.Mesh(new THREE.PlaneGeometry(5, 3.2), glow('#fff0d2', 0.85));
    lobby.position.set(X, 1.6, Z - d / 2 - 0.04); lobby.rotation.y = Math.PI; s.add(lobby);
    box(s, { w: 7, h: 0.3, d: 2.4, x: X, y: 3.6, z: Z - d / 2 - 1.2, color: '#4a5058' });
    this.lobbyZone = this.zone({ minX: X - 3, maxX: X + 3, minZ: Z - d / 2 - 1.8, maxZ: Z - d / 2 + 0.1 }, () => this.goHome(), { once: true });
    this.lobbyZone.fired = true; // armed after meeting the family

    // the apartment floor (y = F): slab, outer walls, interior
    const R = { x0: X - 7.6, x1: X + 7.6, z0: Z - d / 2, z1: Z - d / 2 + 8 };
    this.room = R;
    tbox(s, { w: w, h: 0.4, d: d, x: X, y: F - 0.4, z: Z, color: '#c9c1b2', texName: 'concrete' });
    ground(s, { w: 15.2, d: 8, x: X, z: (R.z0 + R.z1) / 2, y: F + 0.005, color: '#b68e66', texName: 'pavers', scale: 0.8 });
    const wallMat = (len, ww, dd, x, z) => tbox(s, { w: ww, h: 3.2, d: dd, x, y: F, z, color: '#efe9de', texName: 'concrete', scale: 2 });
    wallMat(0, 0.25, 8, R.x0, (R.z0 + R.z1) / 2);
    wallMat(0, 0.25, 8, R.x1, (R.z0 + R.z1) / 2);
    wallMat(0, 15.2, 0.25, X, R.z1);
    tbox(s, { w: w, h: 3.2, d: d - 8, x: X, y: F, z: Z + 4, color: '#d6d0c4', texName: 'tile', scale: 2 });
    box(s, { w: w, h: 0.25, d: d, x: X, y: F + 3.2, z: Z, color: '#f2efe8', shadow: false });
    // balcony slab + glass railing, beyond the sliding door line
    tbox(s, { w: 12, h: 0.3, d: 2.2, x: X, y: F - 0.3, z: R.z0 - 1.1, color: '#c9c1b2', texName: 'concrete' });
    const rail = new THREE.Mesh(new THREE.BoxGeometry(12, 1.1, 0.05), new THREE.MeshPhongMaterial({ color: '#a8c8dd', transparent: true, opacity: 0.25, shininess: 90 }));
    rail.position.set(X, F + 0.55, R.z0 - 2.15); s.add(rail);
    box(s, { w: 12, h: 0.06, d: 0.1, x: X, y: F + 1.1, z: R.z0 - 2.15, color: '#9aa0a6' });
    // sliding glass doors
    this.doors = [-1, 1].map((sd) => {
      const g = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2.6, 0.06), new THREE.MeshPhongMaterial({ color: '#c9dff0', transparent: true, opacity: 0.18, shininess: 120, specular: '#ffffff' }));
      g.position.set(X + sd * 1.8, F + 1.3, R.z0); s.add(g);
      box(s, { w: 0.08, h: 2.6, d: 0.1, x: X + sd * 3.6, y: F, z: R.z0, color: '#6a6e72' });
      return g;
    });
    this.doorCollider = { minX: X - 3.7, maxX: X + 3.7, minZ: R.z0 - 0.15, maxZ: R.z0 + 0.15 };
    // the wall left and right of the door opening
    [-1, 1].forEach((sd) => tbox(s, { w: 4, h: 3.2, d: 0.25, x: X + sd * 5.7, y: F, z: R.z0, color: '#efe9de', texName: 'concrete', scale: 2 }));
    // curtains
    this.curtains = [-1, 1].map((sd) => {
      const c = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.8, 4, 8), mat('#e9dfcf', { side: THREE.DoubleSide, transparent: true, opacity: 0.92 }));
      c.position.set(X + sd * 3.0, F + 1.6, R.z0 + 0.25); s.add(c);
      c.userData.base = c.geometry.attributes.position.array.slice();
      return c;
    });
    // furniture: sofa, low table, lamp, TV glow, plant
    box(s, { w: 3, h: 0.45, d: 1, x: X + 2, y: F, z: R.z1 - 1.2, color: '#5a6a7a' });
    box(s, { w: 3, h: 0.5, d: 0.25, x: X + 2, y: F + 0.45, z: R.z1 - 0.8, color: '#5a6a7a' });
    box(s, { w: 1.4, h: 0.4, d: 0.7, x: X + 2, y: F, z: R.z1 - 2.8, color: '#9a7a58' });
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 0.4, 16), glow('#ffd9a0', 1.6));
    lamp.position.set(X + 5.6, F + 1.5, R.z1 - 1); s.add(lamp);
    box(s, { w: 0.05, h: 1.3, d: 0.05, x: X + 5.6, y: F, z: R.z1 - 1, color: '#333' });
    const warm = new THREE.PointLight('#ffd9a0', 14, 12, 1.4); warm.position.set(X + 4, F + 2.4, R.z1 - 2.5); s.add(warm);
    const cool = new THREE.PointLight('#cfe0ff', 6, 10, 1.4); cool.position.set(X - 3, F + 2.6, R.z0 + 2); s.add(cool);
    tree(s, { x: X - 6.4, z: R.z0 + 1.2, scale: 0.28, color: '#4e7a3a' }).parent.position.y = F;
    this.colliders.push({ minX: X + 0.5, maxX: X + 3.5, minZ: R.z1 - 1.7, maxZ: R.z1 - 0.1 }, { minX: X + 1.3, maxX: X + 2.7, minZ: R.z1 - 3.15, maxZ: R.z1 - 2.45 });

    // the shelf on the west wall
    this.shelfX = R.x0 + 0.35;
    [0.9, 1.5, 2.1].forEach((y) => box(s, { w: 0.4, h: 0.05, d: 2.6, x: this.shelfX, y: F + y, z: R.z0 + 4, color: '#8a6a4a' }));
    box(s, { w: 0.4, h: 2.2, d: 0.06, x: this.shelfX, y: F, z: R.z0 + 2.7, color: '#8a6a4a' });
    box(s, { w: 0.4, h: 2.2, d: 0.06, x: this.shelfX, y: F, z: R.z0 + 5.3, color: '#8a6a4a' });
  }

  // The rest of the city around Big City: apartment blocks and shop streets
  // in every direction, side roads, and road signs.
  buildSurroundings() {
    const s = this.scene;
    const cb = new CityBuilder(s, this.colliders, { nightGlow: 0.9 });
    const keep = [
      { minX: -100, maxX: 125, minZ: -145, maxZ: -33 },  // mall + plaza + hotel
      { minX: -230, maxX: 230, minZ: -34, maxZ: 0 },   // Zhongyang Road
      { minX: -75, maxX: 75, minZ: 0, maxZ: 30 },      // your street
    ];
    district(cb, { minX: -230, maxX: 230, minZ: 30, maxZ: 200, avoid: keep, block: [40, 52], street: 11, floors: [5, 9], tall: 0.3, tallFloors: [14, 26], shops: 0.8, trees: 0.6 });
    district(cb, { minX: -230, maxX: -100, minZ: -230, maxZ: -36, avoid: keep, block: [40, 52], street: 11, floors: [4, 8], tall: 0.25, tallFloors: [12, 22], shops: 0.8, trees: 0.5 });
    district(cb, { minX: 125, maxX: 230, minZ: -230, maxZ: -36, avoid: keep, block: [40, 52], street: 11, floors: [4, 8], tall: 0.25, tallFloors: [12, 22], shops: 0.8, trees: 0.5 });
    district(cb, { minX: -80, maxX: 80, minZ: -230, maxZ: -150, avoid: keep, block: [36, 46], street: 11, floors: [4, 7], tall: 0.2, shops: 0.7 });
    // the south side between the towers, and side streets off Zhongyang Road
    cb.ground('sidewalk', 0, 14, 150, 28, 0.03, 2);
    [-48, -16, 23, 49].forEach((x) => cb.ground('asphalt', x, 60, 9, 120, 0.021, 4));
    [-96, 122].forEach((x) => cb.ground('asphalt', x, -100, 9, 140, 0.021, 4));
    for (let x = -70; x <= 70; x += 12) cb.tree(x, 27, rand(0.8, 1.0));
    cb.finish();

    signpost(s, { x: 4.6, z: -6.6, rotY: 0, entries: [{ text: 'Big City', dir: 'up', dist: '45 m' }, { text: 'Zhongyang Rd', dir: 'left' }, { text: 'Zhongyang Rd', dir: 'right' }] });
    signpost(s, { x: -4.6, z: -34, rotY: Math.PI, entries: [{ text: 'Home · Tower B', dir: 'downleft', dist: '50 m' }] });
    signpost(s, { x: -24, z: -1.2, rotY: -Math.PI / 2, entries: [{ text: 'Home · Tower B', dir: 'upleft', dist: '6 m' }] });
    signpost(s, { x: -80, z: -6.6, rotY: -Math.PI / 2, entries: [{ text: 'Big City', dir: 'upright', dist: '90 m' }] });
    signpost(s, { x: 80, z: -6.6, rotY: Math.PI / 2, entries: [{ text: 'Big City', dir: 'upleft', dist: '90 m' }] });
    signpost(s, { x: -50, z: 30, rotY: Math.PI, entries: [{ text: 'Zhongyang Rd · Big City', dir: 'down', dist: '60 m' }] });
  }

  placeKeepsakes() {
    const s = this.scene;
    const F = HOME.floor;
    const slots = { photo: [F + 1.5, -0.8], nametag: [F + 1.5, 0.4], strip: [F + 2.1, -0.5], ticket: [F + 0.9, 0.2] };
    const draws = {
      photo: (g, w, h) => { g.fillStyle = '#f7f3ea'; g.fillRect(0, 0, w, h); const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#e2b98a'); gr.addColorStop(1, '#7a6a4a'); g.fillStyle = gr; g.fillRect(10, 10, w - 20, h * 0.72); },
      nametag: (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); fitText(g, '1 2 3 7', w / 2, h / 2, w * 0.8, h * 0.6, '600 {s}px "IBM Plex Mono", monospace', '#1f4e8c'); },
      strip: (g, w, h) => { g.fillStyle = '#111'; g.fillRect(0, 0, w, h); for (let i = 0; i < 4; i++) { g.fillStyle = pick(['#e85a8a', '#f2c230', '#5ac8e8', '#9ae85a']); g.fillRect(6, 6 + i * (h - 12) / 4, w - 12, (h - 12) / 4 - 6); } },
      ticket: (g, w, h) => { g.fillStyle = '#e8edf2'; g.fillRect(0, 0, w, h); fitText(g, 'HSINCHU → QIANJIA', w / 2, h * 0.4, w * 0.9, h * 0.22, '600 {s}px "IBM Plex Mono", monospace', '#1f4e8c'); fitText(g, '新竹 → 千甲', w / 2, h * 0.72, w * 0.7, h * 0.2, '500 {s}px "Noto Sans TC", sans-serif', '#333'); },
    };
    const sizes = { photo: [0.36, 0.42], nametag: [0.26, 0.1], strip: [0.14, 0.5], ticket: [0.4, 0.2] };
    const found = settings.keepsakes;
    const ids = Object.keys(KEEPSAKES).filter((k) => found.includes(k));
    ids.forEach((id) => {
      const [y, dz] = slots[id];
      const [w, h] = sizes[id];
      const t = canvasTexture(256, Math.round(256 * h / w), draws[id]);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshLambertMaterial({ map: t, emissive: '#ffffff', emissiveMap: t, emissiveIntensity: 0.35 }));
      m.position.set(this.shelfX + 0.05, y + 0.03 + h / 2, this.room.z0 + 4 + dz); m.rotation.y = Math.PI / 2; m.rotation.x = -0.12;
      s.add(m);
      this.thing('keep-' + id, this.shelfX + 1.2, this.room.z0 + 4 + dz, 1.6, `Look at ${KEEPSAKES[id].name.toLowerCase()}`, { y: HOME.floor, lines: [KEEPSAKES[id].line], once: true, view: { move: [this.shelfX + 0.75, this.room.z0 + 4 + dz], look: [this.shelfX, y + 0.15, this.room.z0 + 4 + dz], hold: 4 }, action: () => this.lookedAt(id, ids.length) });
    });
    this.seen = 0;
    if (!ids.length) this.readyForWindow();
  }

  // ---------- flow ----------
  enter() {
    this.player.setEye(1.65);
    this.player.place(...this.startPose);
    this.targets = {
      cross: [0, -38], meet: [-5, -43.5], home: [HOME.x, 2.6],
      shelf: [this.shelfX + 1, this.room.z0 + 4, HOME.floor], wind: [HOME.x, this.room.z0 + 1, HOME.floor],
    };
    this.objective('cross');
    // crossing zones, each direction
    this.zone({ minX: -3, maxX: 3, minZ: -40, maxZ: -33 }, () => { if (this.stage === 'cross') { this.stage = 'meet'; this.objective('meet'); } });
    this.thing('crossing', 0, -6.5, 2.4, 'Wait for the light', { view: { look: [-3.6, 2.9, -32.8], hold: 4 } });
  }

  begin() { setTimeout(() => this.say(CH4.intro), 800); }

  metFamily() {
    this.waving = true;
    setTimeout(() => { this.waving = false; }, 3000);
    this.keepsake('ticket');
    this.stage = 'home';
    setTimeout(() => { this.objective('home'); this.say(CH4.things.crossBack); }, 6500);
    this.lobbyZone.fired = false;
  }

  async goHome() {
    this.player.enabled = false;
    await this.ui.fade(true);
    this.say(CH4.things.door, true);
    const R = this.room;
    this.player.floorY = HOME.floor;
    this.player.place(HOME.x + 3, R.z1 - 3.6, Math.PI * 0.35);
    this.player.bounds = { minX: R.x0 + 0.4, maxX: R.x1 - 0.4, minZ: R.z0 - 1.9, maxZ: R.z1 - 0.4 };
    this.colliders.push(this.doorCollider);
    this.towerCollider.minX = 9999; // we are inside the tower now
    this.audio.setScene({ bugs: 0, traffic: 0.25 });
    this.windScale = 0.4;
    this.placeKeepsakes();
    this.objective('shelf');
    this.player.update(0);
    await this.ui.fade(false);
    this.player.enabled = true;
    setTimeout(() => this.say(CH4.shelfIntro), 3200);
  }

  lookedAt(id, total) {
    this.seen++;
    if (this.seen >= total) setTimeout(() => this.readyForWindow(), 1800);
  }

  readyForWindow() {
    this.objective('wind');
    this.thing('window', HOME.x, this.room.z0 + 1.0, 2.6, 'Open the balcony door', { y: HOME.floor, once: true, lines: [], action: () => this.openWindow() });
  }

  // Ending: a first-person cutscene. The balcony door slides open, you step
  // out into the wind, and the view rises over the city as night falls.
  async openWindow() {
    this.doorCollider.minX = 9999;
    this.opening = 0.0001;
    this.windScale = 2.2;
    music.swell();
    const cam = this.camera.position;
    const Y = HOME.floor + 1.65, bz = this.room.z0;
    this.lapse = { from: 3.5, to: 16 };
    await this.playCutscene({
      keys: [
        { t: 0, pos: [cam.x, cam.y, cam.z], look: [HOME.x, Y - 0.2, bz - 6], stop: true },
        { t: 1.6, pos: [HOME.x, Y, bz + 0.6], look: [HOME.x + 2, Y - 2, bz - 20], stop: true },
        { t: 3.6, pos: [HOME.x, Y, bz - 1.4], look: [-8, Y - 8, -80], walk: true, stop: true },
        { t: 7.2, pos: [HOME.x, Y, bz - 1.5], look: [2, Y - 14, -95], stop: true },
        { t: 10.5, pos: [HOME.x + 3, Y + 6, bz - 7], look: [0, 40, -95] },
        { t: 14.0, pos: [-20, 96, -24], look: [0, 18, -100] },
        { t: 18.5, pos: [-8, 128, -42], look: [0, 0, -96], stop: true },
      ],
      events: [
        { at: 4.0, fn: () => this.say([CH4.windowLine[0]], true) },
        { at: 10.2, fn: () => this.say([CH4.windowLine[1]], true) },
        { at: 17.3, fn: () => this.ui.fade(true, 1300) },
      ],
    });
    this.lapse = null;
    this.complete();
  }

  tick(dt, t, gust) {
    if (this.lapse && this.cut) {
      const k = Math.max(0, Math.min(1, (this.cut.t - this.lapse.from) / (this.lapse.to - this.lapse.from)));
      this.skyBlend('night', k * 0.85);
      this.nightK = 0.55 + 0.45 * k;
    }
    // traffic light cycle
    this.lightClock += dt;
    const c = this.lightClock % CYCLE;
    const carGo = c < CAR_GREEN + YELLOW;
    const walk = !carGo;
    const count = walk ? Math.ceil(CYCLE - c) : 0;
    const state = c < CAR_GREEN ? 2 : carGo ? 1 : 0;
    this.carLamps.forEach((ls) => ls.forEach((l, i) => { l.material.color.set(i === state ? ['#ff3326', '#ffb21f', '#33ff88'][i] : '#202020'); }));
    if (Math.floor(t * 3) !== this.lastSig) { this.lastSig = Math.floor(t * 3); this.drawSignals(walk, count); }
    if (walk && count !== this.lastCount) { this.lastCount = count; const p = this.player.position; if (Math.abs(p.z + 20) < 18 && Math.abs(p.x) < 12 && this.player.floorY === 0) this.audio.beep(); }
    this.updateTraffic(dt, carGo);

    // the big screen changes every few seconds
    const sc = Math.floor(t / 5);
    if (sc !== this.lastScreen) { this.lastScreen = sc; this.drawScreen(sc); }

    // balcony door slides open; curtains billow in the wind
    if (this.opening > 0 && this.opening < 1) {
      this.opening = Math.min(1, this.opening + dt * 0.6);
      this.doors[0].position.x = HOME.x - 1.8 - this.opening * 3.2;
      this.doors[1].position.x = HOME.x + 1.8 + this.opening * 3.2;
    }
    const amp = (this.opening ? 0.5 + gust * 0.9 : 0.04);
    this.curtains.forEach((cu, k) => {
      const pa = cu.geometry.attributes.position, base = cu.userData.base;
      for (let i = 0; i < pa.count; i++) {
        const y = base[i * 3 + 1];
        const f = (1.4 - y) / 2.8; // 0 at top, 1 at bottom
        pa.setZ(i, f * amp * (0.8 + 0.4 * Math.sin(t * 3 + base[i * 3] * 4 + k)));
      }
      pa.needsUpdate = true;
    });
  }
}
