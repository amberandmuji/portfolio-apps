// Chapter 3 · University · NYCU Guangfu campus (陽明交大) · night
// Leave the lab → past the library and the scooter lot → meet friends by the
// lake (竹湖) → out the gate to the late-night food stalls → back to the lake.
//
// Map (meters; north is -z). Campus road runs north–south at x ≈ 0.
//   z ≈ 0          engineering building (east), start
//   z ≈ -42        library (west), scooter lot (east)
//   z ≈ -100       the lake (west of the road), friends on the lawn
//   z ≈ -150       campus gate; food stalls and photo booth outside it
import * as THREE from 'three';
import { Chapter } from '../engine/chapter.js';
import { CH3 } from '../story/strings.js';
import {
  box, tbox, ground, mat, glow, sign, fitText, scooter, car, tree, crowd, personMesh,
  streetLamp, tower, hills, blades, rand, pick, tex as kitTexture,
} from '../engine/kit.js';
import { CityBuilder, district, signpost } from '../engine/city.js';
import { buildCampus } from './ch3-campus.js';
import { buildStreet, STREET } from './ch3-street.js';

const LAKE = { x: -30, z: -100, rx: 22, rz: 14 };
const FRIENDS = { x: -7.5, z: -97 };

export class ChapterNYCU extends Chapter {
  static meta = { id: 'nycu', board: CH3.board, keepsake: 'strip' };

  constructor(ctx) {
    super(ctx, CH3);
    this.ambience = { bugs: 0.8, traffic: 0.12 };
    this.startPose = [3, 6, 0];
    this.stage = 'lab';
    this.hasFood = false;
    this.targets = { lab: [-7.5, -95], lake: [-7.5, -95], snacks: [-7.4, -164], back: [-7.5, -95] };
  }

  build() {
    const s = this.scene;
    this.setup('night', { specks: 140, speckColor: '#cfd8ff' });
    this.bounds(-230, 230, -330, 120);

    ground(s, { w: 1400, d: 1400, color: '#3f4a36', texName: 'grass', scale: 3 });
    ground(s, { w: 9, d: 175, z: -88, y: 0.02, color: '#6f7176', texName: 'asphalt', scale: 4 });
    [-5.5, 5.5].forEach((x) => ground(s, { w: 2, d: 150, x, z: -75, y: 0.04, color: '#a9a39a', texName: 'pavers', scale: 1 }));
    for (let z = 20; z > -170; z -= 6) ground(s, { w: 0.14, d: 3, x: 0, z, y: 0.03, color: '#dcd8cc', texName: 'concrete' });

    this.buildEngineering();
    this.buildLibrary();
    this.buildLake();
    this.buildGateAndStalls();
    buildCampus(this, { LAKE });
    this.buildSurroundings();

    // lamps along the road
    for (let z = 14; z > -150; z -= 18) {
      streetLamp(s, { x: 5.2, z, rotY: -Math.PI / 2, height: 6.5, color: '#ffd9a0', light: Math.abs(z + 94) < 10 || Math.abs(z) < 5 || Math.abs(z + 40) < 10 });
      streetLamp(s, { x: -5.2, z: z - 9, rotY: Math.PI / 2, height: 6.5, color: '#ffd9a0' });
    }
    // trees along the road
    this.canopies = [];
    for (let z = 10; z > -150; z -= 12) {
      this.canopies.push(tree(s, { x: 8, z: z - 4, scale: rand(0.9, 1.15), color: '#2f4a2c' }));
      if (z > -70 || z < -125) this.canopies.push(tree(s, { x: -8, z: z + 2, scale: rand(0.9, 1.15), color: '#2f4a2c' }));
    }
    this.updaters.push((dt, t, gust) => this.canopies.forEach((c, i) => { c.rotation.z = Math.sin(t * 0.9 + i) * 0.02 * (0.5 + gust); }));

    // a few night owls walking and riding
    this.people = crowd(s, [
      { path: [[4.8, 20], [4.8, -150]], loop: true, speed: 1.2, top: '#3a3a44', bag: true },
      { path: [[-4.8, -150], [-4.8, 20]], loop: true, speed: 1.0, top: '#5c6f8a' },
      { path: [[-40, -36], [-12, -36], [-12, -10]], loop: true, speed: 0.9, top: '#a54a3e', bag: true },
      { x: -18, z: -43, rotY: 1.6, top: '#2f3b33' },
    ]);
    this.updaters.push((dt, t) => this.people.update(dt, t));
    this.riders = [0, 1, 2, 3].map((i) => ({ m: scooter(s, { x: 0, z: 0, rider: true }), z: rand(-170, 20), dir: i % 2 ? 1 : -1, sp: rand(7, 9) }));
    this.updaters.push((dt) => this.riders.forEach((r) => {
      r.z += r.dir * r.sp * dt; if (r.z < -175) r.z = 22; if (r.z > 22) r.z = -175;
      r.m.position.set(r.dir < 0 ? 2.2 : -2.2, 0, r.z); r.m.rotation.y = r.dir < 0 ? Math.PI : 0;
    }));

    // the science park glowing to the north
    for (let i = 0; i < 22; i++) tower(s, { x: rand(-160, 200), z: rand(-520, -380), w: rand(30, 70), d: rand(25, 50), h: rand(18, 45), color: '#2c3140', litRatio: 0.35, nightGlow: 0.55, texName: 'concrete' });
    for (let i = 0; i < 6; i++) {
      const fab = box(s, { w: rand(60, 110), h: rand(22, 32), d: 40, x: rand(-120, 160), z: rand(-560, -420), material: glow('#3a5a9a', 0.25), shadow: false });
      fab.material.fog = false;
    }
    hills(s, [[-420, -200, 220, 70], [-380, 60, 180, 55], [380, 120, 220, 60]], '#1c2236');
  }

  buildEngineering() {
    const s = this.scene;
    tower(s, { x: 26, z: 4, w: 28, d: 26, h: 36, color: '#b9b4ab', litRatio: 0.55, nightGlow: 0.9, texName: 'tile' });
    this.colliders.push({ minX: 12, maxX: 40, minZ: -9, maxZ: 17 });
    const entry = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), glow('#e8f0ff', 0.85));
    entry.position.set(11.97, 1.5, 4); entry.rotation.y = -Math.PI / 2; s.add(entry);
    box(s, { w: 3, h: 0.3, d: 8, x: 10.5, y: 3.2, z: 4, color: '#5a5f66' });
    sign(s, {
      w: 5, h: 0.7, x: 11.95, y: 4.2, z: 4, rotY: -Math.PI / 2, emissive: 0.6,
      draw: (g, w, h) => { g.fillStyle = '#2b2f36'; g.fillRect(0, 0, w, h); fitText(g, 'Engineering Building', w / 2, h / 2, w * 0.9, h * 0.5, '500 {s}px "IBM Plex Sans", sans-serif', '#f1eadb'); },
    });
    const l = new THREE.PointLight('#dfe8ff', 20, 14, 1.4); l.position.set(9, 2.5, 4); s.add(l);
    for (let z = 10; z > -2; z -= 1.1) scooter(s, { x: 9.2, z, rotY: Math.PI / 2 + rand(-0.15, 0.15) });
    this.thing('lab', 10, 0, 3.2, 'Look up at the lab', { view: { look: [24, 26, 4], hold: 3.5 } });
    // a vending machine glowing by the door
    box(s, { w: 0.8, h: 1.9, d: 1.0, x: 11.4, z: -3.5, material: glow('#cfe3ff', 0.7) });
    this.colliders.push({ minX: 11, maxX: 11.8, minZ: -4, maxZ: -3 });
  }

  buildLibrary() {
    const s = this.scene;
    // library: stone base, wide glass hall glowing warm
    tbox(s, { w: 34, h: 6, d: 30, x: -32, z: -42, color: '#cfc7b8', texName: 'concrete', scale: 3 });
    tower(s, { x: -34, z: -44, w: 28, d: 24, h: 26, color: '#a9a49a', litRatio: 0.85, nightGlow: 1.0, texName: 'concrete' });
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(22, 5), glow('#ffe1a8', 0.85));
    glass.position.set(-14.97, 3, -42); glass.rotation.y = Math.PI / 2; s.add(glass);
    for (let k = -10; k <= 10; k += 2.2) box(s, { w: 0.12, h: 5, d: 0.15, x: -14.9, y: 0.5, z: -42 + k, color: '#3a3a3e', shadow: false });
    sign(s, {
      w: 7, h: 0.9, x: -14.95, y: 6.8, z: -42, rotY: Math.PI / 2, emissive: 0.7,
      draw: (g, w, h) => { g.fillStyle = '#20242b'; g.fillRect(0, 0, w, h); fitText(g, 'HAORAN LIBRARY', w / 2, h / 2, w * 0.9, h * 0.5, '600 {s}px "IBM Plex Sans", Arial, sans-serif', '#f6e6c4'); },
    });
    const warm = new THREE.PointLight('#ffd7a0', 30, 20, 1.4); warm.position.set(-12, 3, -42); s.add(warm);
    this.colliders.push({ minX: -49, maxX: -15, minZ: -57, maxZ: -27 });
    ground(s, { w: 8, d: 24, x: -11, z: -42, y: 0.045, color: '#b7b1a6', texName: 'pavers', scale: 1 });
    this.thing('library', -12, -42, 4.5, 'Look at the library', { view: { look: [-20, 9, -42], hold: 3.5 } });

    // scooter lot east of the road
    ground(s, { w: 24, d: 26, x: 20, z: -44, y: 0.03, color: '#7a7c80', texName: 'asphalt', scale: 4 });
    for (let r = 0; r < 5; r++) for (let c = 0; c < 24; c++) {
      if (Math.random() < 0.12) continue;
      scooter(s, { x: 10 + c * 0.9, z: -34 - r * 5, rotY: rand(-0.12, 0.12) + (r % 2 ? Math.PI : 0) });
    }
    for (let r = 0; r < 5; r++) this.colliders.push({ minX: 9.5, maxX: 31.5, minZ: -35 - r * 5, maxZ: -33 - r * 5 });
    this.thing('scooters', 8.4, -44, 3.2, 'Look at the scooters', { view: { look: [22, 0.6, -46], hold: 3.5 } });
  }

  buildLake() {
    const s = this.scene;
    // lawn and lakeside path
    const ellipse = (rx, rz, color, y, texName) => {
      const g = new THREE.CircleGeometry(1, 64);
      const m = new THREE.Mesh(g, mat(color, texName ? { map: kitTexture(texName) } : {}));
      m.scale.set(rx, rz, 1); m.rotation.x = -Math.PI / 2; m.position.set(LAKE.x, y, LAKE.z); m.receiveShadow = true;
      s.add(m); return m;
    };
    ellipse(LAKE.rx + 6, LAKE.rz + 6, '#a9a39a', 0.03, 'pavers');
    ellipse(LAKE.rx + 4, LAKE.rz + 4, '#4c5c3a', 0.04, 'grass');
    ellipse(LAKE.rx + 0.6, LAKE.rz + 0.6, '#5d5a52', 0.045, 'concrete');
    // water with soft moving highlights from the lamps
    const water = new THREE.Mesh(new THREE.CircleGeometry(1, 64), new THREE.MeshPhongMaterial({ color: '#0a1424', specular: '#7a88aa', shininess: 120, emissive: '#05070d' }));
    water.scale.set(LAKE.rx, LAKE.rz, 1); water.rotation.x = -Math.PI / 2; water.position.set(LAKE.x, 0.06, LAKE.z);
    s.add(water);
    // reflections: long shimmering streaks under each lakeside lamp and the library
    this.streaks = [];
    const streakMat = (c) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false });
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const x = LAKE.x + Math.cos(a) * (LAKE.rx + 1.5), z = LAKE.z + Math.sin(a) * (LAKE.rz + 1.5);
      streetLamp(s, { x, z, rotY: Math.atan2(LAKE.x - x, LAKE.z - z), height: 4.5, color: '#fff0c8', light: i % 3 === 0 });
      const st = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 6), streakMat('#ffe2a0'));
      st.rotation.x = -Math.PI / 2; st.position.set(LAKE.x + Math.cos(a) * (LAKE.rx - 3), 0.07, LAKE.z + Math.sin(a) * (LAKE.rz - 3));
      st.rotation.z = -a + Math.PI / 2;
      s.add(st); this.streaks.push(st);
    }
    const moon = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 9), streakMat('#cfd8ff'));
    moon.rotation.x = -Math.PI / 2; moon.position.set(LAKE.x - 4, 0.07, LAKE.z + 2); s.add(moon); this.streaks.push(moon);
    this.updaters.push((dt, t, gust) => this.streaks.forEach((st, i) => { st.material.opacity = (1 - (this.dawnK || 0) * 0.8) * (0.3 + 0.18 * Math.sin(t * 2.3 + i * 1.7) * (0.6 + gust)); st.scale.x = 1 + 0.4 * Math.sin(t * 3 + i); }));
    this.colliders.push({ minX: LAKE.x - LAKE.rx * 0.85, maxX: LAKE.x + LAKE.rx * 0.85, minZ: LAKE.z - LAKE.rz * 0.85, maxZ: LAKE.z + LAKE.rz * 0.85 });

    // reeds at the edge
    blades(s, {
      areas: [{ minX: LAKE.x - LAKE.rx, maxX: LAKE.x + LAKE.rx, minZ: LAKE.z - LAKE.rz, maxZ: LAKE.z + LAKE.rz }],
      exclude: [{ minX: LAKE.x - LAKE.rx * 0.8, maxX: LAKE.x + LAKE.rx * 0.8, minZ: LAKE.z - LAKE.rz * 0.8, maxZ: LAKE.z + LAKE.rz * 0.8 }],
      spacing: this.quality === 'low' ? 1.2 : 0.7, uniforms: this.wind, height: 1.1, colors: ['#3d5a34', '#6d7a46'], radius: 0.05,
    });

    // a little pavilion and willows
    const px = LAKE.x - 8, pz = LAKE.z - LAKE.rz - 3.5;
    for (let ix = -1; ix <= 1; ix += 2) for (let iz = -1; iz <= 1; iz += 2) box(s, { w: 0.25, h: 2.8, d: 0.25, x: px + ix * 1.8, z: pz + iz * 1.8, color: '#7a2a20' });
    const roof = new THREE.Mesh(new THREE.ConeGeometry(3.4, 1.6, 4), mat('#3a3d3a', { flatShading: true }));
    roof.rotation.y = Math.PI / 4; roof.position.set(px, 3.6, pz); roof.castShadow = true; s.add(roof);
    [[LAKE.x + 14, LAKE.z - 15], [LAKE.x - 22, LAKE.z + 8], [LAKE.x + 18, LAKE.z + 15], [LAKE.x - 6, LAKE.z + 18]].forEach(([x, z]) => this.canopiesLater = (this.canopiesLater || []).concat(tree(s, { x, z, scale: 1.1, color: '#2c4a30' })));

    // friends on the lawn by the water, with a blanket
    box(s, { w: 2.6, h: 0.02, d: 2.0, x: FRIENDS.x - 1.5, z: FRIENDS.z, color: '#b84a3a', shadow: false });
    this.friendMeshes = [[-2.6, 0.4, 1.3], [-1.6, -0.7, 0.2], [-0.4, 0.5, -1.1]].map(([dx, dz, ry], i) => {
      const p = personMesh({ top: ['#e7e2d8', '#3a3a44', '#5c6f8a'][i], bottom: '#2b3040', height: rand(1.6, 1.75), longHair: i === 1 });
      p.position.set(FRIENDS.x + dx, 0, FRIENDS.z + dz); p.rotation.y = ry;
      p.userData.legs.forEach((l) => { l.rotation.x = -1.4; l.position.y = 0.32; });
      p.children.forEach((ch) => { if (!p.userData.legs.includes(ch)) ch.position.y -= 0.5; });
      s.add(p);
      return p;
    });
    this.updaters.push((dt, t) => this.friendMeshes.forEach((p, i) => { p.rotation.z = Math.sin(t * (this.laughing ? 9 : 1.6) + i * 2) * (this.laughing ? 0.07 : 0.03); }));
    this.thing('friends', FRIENDS.x, FRIENDS.z, 3.4, 'Join your friends', { action: () => this.atFriends() });
    this.thing('lake', LAKE.x, LAKE.z + LAKE.rz + 3, 3.8, 'Crouch by the water', { view: { move: [LAKE.x, LAKE.z + LAKE.rz + 1.6], look: [LAKE.x - 4, 0.3, LAKE.z - 6], eye: 0.7, hold: 4.5 } });
  }

  buildGateAndStalls() {
    const s = this.scene;
    // gate: a long low wall with the university name, a guard house, a barrier
    tbox(s, { w: 14, h: 2.4, d: 1.4, x: -14, z: -150, color: '#8f8a80', texName: 'concrete', scale: 2 });
    tbox(s, { w: 14, h: 2.4, d: 1.4, x: 14, z: -150, color: '#8f8a80', texName: 'concrete', scale: 2 });
    this.colliders.push({ minX: -21, maxX: -7, minZ: -150.7, maxZ: -149.3 }, { minX: 7, maxX: 21, minZ: -150.7, maxZ: -149.3 });
    sign(s, {
      w: 12, h: 1.0, x: -14, y: 1.5, z: -149.28, emissive: 0.8,
      draw: (g, w, h) => { g.fillStyle = '#7d786e'; g.fillRect(0, 0, w, h); fitText(g, 'NATIONAL YANG MING CHIAO TUNG UNIVERSITY', w / 2, h / 2, w * 0.92, h * 0.38, '600 {s}px "IBM Plex Sans", sans-serif', '#f6efe0'); },
    });
    tbox(s, { w: 3, h: 2.8, d: 3, x: 9, z: -146, color: '#d8d3c8', texName: 'tile' });
    const gw = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.2), glow('#fff2d6', 0.9)); gw.position.set(7.48, 1.6, -146); gw.rotation.y = -Math.PI / 2; s.add(gw);
    this.colliders.push({ minX: 7.5, maxX: 10.5, minZ: -147.5, maxZ: -144.5 });
    this.thing('gate', 0, -146, 4.5, 'Look past the gate', { view: { look: [0, 22, -420], hold: 4 } });

    // outside: the late-night street (ch3-street.js)
    buildStreet(this);
  }

  // The rest of campus (department buildings, dorms, a sports field) and the
  // busy streets outside the north gate. Plus road signs.
  buildSurroundings() {
    const s = this.scene;
    const cb = new CityBuilder(s, this.colliders, { nightGlow: 1.0 });
    const keep = [
      { minX: -56, maxX: 36, minZ: -126, maxZ: 22 }, { minX: 8, maxX: 44, minZ: -62, maxZ: 22 },
      { minX: 70, maxX: 160, minZ: -110, maxZ: -20 },   // sports field
      { minX: -230, maxX: 230, minZ: -28, maxZ: -16 },   // boulevard
      { minX: -104, maxX: -58, minZ: -44, maxZ: -4 },    // pine grid
      { minX: -100, maxX: -58, minZ: -88, maxZ: -54 },   // camphor grove
      { minX: -70, maxX: -54, minZ: -130, maxZ: -106 },  // clock tower
      { minX: -50, maxX: -18, minZ: -6, maxZ: 26 },      // lotus pond and EECS
    ];
    // west and east campus: big department buildings and dorms on lawns
    district(cb, { minX: -230, maxX: -60, minZ: -146, maxZ: 120, avoid: keep, block: [48, 64], street: 14, floors: [5, 8], tall: 0.1, tallFloors: [9, 12], styles: ['white', 'grey', 'brick'], shops: 0, trees: 0.8, roads: false });
    district(cb, { minX: 45, maxX: 230, minZ: -146, maxZ: 120, avoid: keep, block: [48, 64], street: 14, floors: [5, 8], tall: 0.1, tallFloors: [9, 12], styles: ['white', 'grey', 'brick'], shops: 0, trees: 0.8, roads: false });
    district(cb, { minX: -60, maxX: 45, minZ: 26, maxZ: 120, avoid: keep, block: [36, 48], street: 12, floors: [6, 9], styles: ['cream', 'sand', 'blue'], shops: 0.1, trees: 0.8, roads: false });
    // campus roads
    cb.ground('asphalt', 0, 70, 9, 100, 0.02, 4);
    cb.ground('asphalt', 0, -136, 400, 8, 0.021, 4);
    cb.ground('asphalt', 0, 24, 400, 8, 0.021, 4);
    // outside the north gate: the busy streets around the night market
    district(cb, { minX: -230, maxX: 230, minZ: -330, maxZ: -186, avoid: [{ minX: -26, maxX: 26, minZ: -330, maxZ: -150 }, { minX: -230, maxX: 230, minZ: STREET.cross - 6, maxZ: STREET.cross + 6 }], block: [36, 48], street: 10, floors: [3, 6], tall: 0.15, shops: 0.85, trees: 0.2 });
    cb.finish();

    // sports field: running track with the field in the middle and stands
    const fx = 115, fz = -65;
    ground(s, { w: 84, d: 50, x: fx, z: fz, y: 0.03, color: '#a85a48', texName: 'track', scale: 4 });
    ground(s, { w: 70, d: 36, x: fx, z: fz, y: 0.035, color: '#4f6e3a', texName: 'grass', scale: 3 });
    for (let k = 1; k < 6; k++) ground(s, { w: 84 - k * 1.2, d: 0.08, x: fx, z: fz + 25 - k * 1.2, y: 0.04, color: '#f2efe6', texName: 'concrete' });
    tbox(s, { w: 60, h: 3, d: 6, x: fx, z: fz - 30, color: '#b8b2a6', texName: 'concrete' });
    this.colliders.push({ minX: fx - 30, maxX: fx + 30, minZ: fz - 33, maxZ: fz - 27 });
    [[-44, -27], [44, -27], [-44, 27], [44, 27]].forEach(([dx, dz]) => {
      tbox(s, { w: 0.5, h: 16, d: 0.5, x: fx + dx, z: fz + dz, color: '#7a7f84', texName: 'concrete' });
      const l = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.2, 0.3), glow('#f2f6ff', 2.4)); l.position.set(fx + dx, 16, fz + dz); s.add(l);
    });
    const fieldLight = new THREE.PointLight('#e8eeff', 300, 120, 1.2); fieldLight.position.set(fx, 18, fz); s.add(fieldLight);
    this.thing('field', fx - 44, fz, 8, 'Look at the track', { lines: ['Laps at midnight. Someone is always running here, no matter how late.'], view: { look: [fx, 1, fz], hold: 3.5 } });
    // a few runners
    const loop = [[fx - 38, fz - 22], [fx + 38, fz - 22], [fx + 38, fz + 22], [fx - 38, fz + 22]];
    this.runners = crowd(s, [0, 1, 2].map((i) => ({ path: loop.slice(i).concat(loop.slice(0, i)), loop: true, speed: rand(2.4, 3.2), top: pick(['#e7e2d8', '#a54a3e', '#3a5a8a']) })));
    this.updaters.push((dt, t) => this.runners.update(dt, t));

    signpost(s, { x: 5.6, z: 9, rotY: 0, entries: [{ text: 'Bamboo Lake', dir: 'upleft', dist: '105 m' }, { text: 'Haoran Library', dir: 'upleft', dist: '50 m' }, { text: 'North Gate', dir: 'up', dist: '155 m' }] });
    signpost(s, { x: 5.6, z: -62, rotY: 0, entries: [{ text: 'Bamboo Lake', dir: 'upleft', dist: '35 m' }, { text: 'Sports Field', dir: 'right' }] });
    signpost(s, { x: -5.6, z: -120, rotY: Math.PI, entries: [{ text: 'Bamboo Lake', dir: 'right', dist: '25 m' }] });
    signpost(s, { x: 5.6, z: -128, rotY: 0, entries: [{ text: 'North Gate · Night Street', dir: 'up', dist: '30 m' }] });
    signpost(s, { x: -5.6, z: -156, rotY: Math.PI, entries: [{ text: 'NYCU North Gate', dir: 'up', dist: '6 m' }, { text: 'Bamboo Lake', dir: 'upright', dist: '60 m' }] });
    signpost(s, { x: 40, z: -132, rotY: -Math.PI / 2, entries: [{ text: 'Bamboo Lake', dir: 'upright' }, { text: 'Night Market', dir: 'upleft' }] });
  }

  // ---------- flow ----------
  enter() {
    this.player.setEye(1.62);
    this.player.place(...this.startPose);
    this.objective('lab');
    this.zone({ minX: -60, maxX: 60, minZ: -30, maxZ: -6 }, () => this.objective('lake'));
    this.zone({ minX: -12, maxX: 12, minZ: -186, maxZ: -153 }, () => { if (this.stage === 'snacks') this.say(['The smell of fried chicken hits you before the light does.']); });
  }

  begin() { setTimeout(() => this.say(CH3.intro), 800); }

  atFriends() {
    if (this.stage === 'lab' || this.stage === 'lake') {
      this.player.focus({ look: [FRIENDS.x - 1.5, 0.6, FRIENDS.z], hold: 2.5 });
      this.stage = 'snacks';
      this.objective('snacks');
      this.things.find((t) => t.key === 'friends').lines = [];
    } else if (this.stage === 'snacks') {
      this.say(['“The stalls are just outside the gate. Go, go!”'], true);
      
    } else if (this.stage === 'back') {
      this.stage = 'end';
      this.ending();
    }
  }

  // Ending: a first-person cutscene. Sit with your friends, look up at the
  // stars, and watch the night turn to dawn over the lake.
  async ending() {
    const cam = this.camera.position;
    const seat = [FRIENDS.x - 1.2, 0.95, FRIENDS.z + 1.2];
    const friends = [FRIENDS.x - 1.6, 0.7, FRIENDS.z - 0.3];
    const L = CH3.cutscene;
    this.lapse = { from: 8.0, to: 16.5 };
    await this.playCutscene({
      keys: [
        { t: 0, pos: [cam.x, cam.y, cam.z], look: friends, stop: true },
        { t: 1.5, pos: seat, look: friends, stop: true },
        { t: 4.2, pos: seat, look: [friends[0] - 0.4, 0.8, friends[2] - 0.6], stop: true },
        { t: 6.4, pos: seat, look: [-22, 42, -112], stop: true },
        { t: 10.0, pos: seat, look: [-34, 26, -118] },
        { t: 15.5, pos: seat, look: [-70, 3.5, -108], stop: true },
        { t: 21.0, pos: seat, look: [-72, 3.0, -108], stop: true },
      ],
      events: [
        { at: 0.6, fn: () => { this.say([L[0]], true); this.laughing = true; } },
        { at: 4.4, fn: () => { this.laughing = false; } },
        { at: 6.6, fn: () => this.say([L[1]], true) },
        { at: 11.2, fn: () => this.say([L[2]], true) },
        { at: 16.4, fn: () => this.say(CH3.end, true) },
        { at: 19.6, fn: () => this.ui.fade(true, 1300) },
      ],
    });
    this.lapse = null;
    this.complete();
  }

  buyFood() {
    this.hasFood = true;
    this.stage = 'back';
    this.audio.blip();
    this.objective('back');
    const f = this.things.find((t) => t.key === 'friends');
    f.lines = [];
    f.prompt = 'Share the food';
  }

  tick(dt) {
    if (this.lapse && this.cut) {
      const k = Math.max(0, Math.min(1, (this.cut.t - this.lapse.from) / (this.lapse.to - this.lapse.from)));
      this.dawnK = k;
      this.skyBlend('dawn', k);
    }
    if (this.flash > 0) { this.flashLight.intensity = 60 * this.flash; this.flash -= dt * 2.5; if (this.flash <= 0) this.flashLight.intensity = 0; }
  }
}
