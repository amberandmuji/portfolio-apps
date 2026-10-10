// Chapter 1 · Childhood · Qianjia (千甲) · dusk
// A child-height walk from home, past the corner store, through the rice
// paddies and the little Earth God shrine, to the elevated Qianjia station
// (two side platforms above, ticket hall below) on the Neiwan line.
//
// Map (meters; north is -z):
//   z ≈ +14 … -3   home row of townhouses on both sides of the lane
//   z ≈ -28        corner store (east side)
//   z ≈ -61        Earth God shrine + banyan (west side), the dropped photo
//   z ≈ -104…-114  elevated viaduct; station hall under it at x ≈ 0
import * as THREE from 'three';
import { Chapter } from '../engine/chapter.js';
import { CH1 } from '../story/strings.js';
import {
  box, tbox, ground, mat, glow, sign, canvasTexture, fitText, townhouse, scooter, powerLine, personMesh,
  blades, tree, crowd, streetLamp, hills, tower, hipRoof, rand, pick,
} from '../engine/kit.js';
import { CityBuilder, district, signpost } from '../engine/city.js';
import { buildStation as buildStationParts, buildTrain as buildTrainParts, setTrainDoors, TRAIN_Z, DECK_Y, PLAT_Y } from './ch1-station.js';
import { buildStore as buildStoreParts } from './ch1-store.js';

const STATION = new THREE.Vector3(0, 0, -101.5);
const CYCLE = 90;

export class ChapterQianjia extends Chapter {
  static meta = { id: 'qianjia', board: CH1.board, keepsake: 'photo' };

  constructor(ctx) {
    super(ctx, CH1);
    this.ambience = { bugs: 1, traffic: 0.05 };
    this.startPose = [0, 6.5, 0];
    this.trainClock = 40;
    this.trainCalled = false;
    this.lastClackX = null;
    this.hornedThisCycle = false;
    this.photoFound = false;
    this.targets = { start: [0, -98], board: [0, -98] };
  }

  build() {
    const s = this.scene;
    this.setup('dusk', { specks: 260 });
    this.bounds(-225, 225, -275, 125);

    // ground: grass, asphalt lane, arcade concrete, station plaza pavers
    ground(s, { w: 1400, d: 1400, y: 0, color: '#86a05a', texName: 'grass', scale: 3 });
    ground(s, { w: 5.6, d: 120, z: -42, y: 0.02, color: '#7d7f84', texName: 'asphalt', scale: 4 });
    ground(s, { w: 25, d: 18, z: 6, color: '#b5afa4', texName: 'concrete', scale: 2 });
    ground(s, { w: 44, d: 10, z: -99, y: 0.025, color: '#c9c2b6', texName: 'pavers', scale: 2 });
    const line = (x) => ground(s, { w: 0.12, d: 92, x, z: -48, y: 0.03, color: '#ece6d4', texName: 'concrete' });
    line(2.55); line(-2.55);
    // paddy water and field ridges (田埂)
    ground(s, { w: 52, d: 90, x: -31, z: -50, y: 0.015, color: '#6b7a55', texName: 'concrete', scale: 6 });
    ground(s, { w: 52, d: 90, x: 31, z: -50, y: 0.015, color: '#6b7a55', texName: 'concrete', scale: 6 });
    for (let z = -6; z >= -94; z -= 14) {
      box(s, { w: 51, h: 0.18, d: 0.6, x: -31, z, color: '#7a7048', shadow: false });
      box(s, { w: 51, h: 0.18, d: 0.6, x: 31, z, color: '#7a7048', shadow: false });
    }
    for (const x of [-18, -31, -44, 18, 31, 44]) box(s, { w: 0.6, h: 0.18, d: 88, x, z: -50, color: '#7a7048', shadow: false });

    this.buildHomeRow();
    this.buildStore();
    this.buildShrine();
    this.buildStation();
    this.buildTrain();
    this.buildDistance();
    this.buildSurroundings();

    powerLine(s, { x: -3.4, z0: -4, z1: -96 });
    for (let z = -4; z >= -96; z -= 24) this.colliders.push({ minX: -3.6, maxX: -3.2, minZ: z - 0.2, maxZ: z + 0.2 });

    blades(s, {
      areas: [{ minX: -56, maxX: -5, minZ: -94, maxZ: -6 }, { minX: 5, maxX: 56, minZ: -94, maxZ: -6 }],
      exclude: [{ minX: 3, maxX: 17, minZ: -37, maxZ: -19 }, { minX: -15, maxX: -3, minZ: -68, maxZ: -50 }],
      spacing: this.quality === 'low' ? 1.0 : 0.55,
      uniforms: this.wind,
    });

    // neighbours heading home, a cyclist, people waiting at the station
    this.people = crowd(s, [
      { path: [[1.6, -90], [1.6, -10]], speed: 1.1, loop: true, top: '#8a6a9a', bottom: '#3a3a44' },
      { path: [[-1.4, -14], [-1.4, -92]], speed: 0.9, loop: true, top: '#d9c38f', height: 1.55 },
      { x: -6, z: -98.8, rotY: 0.3 }, { x: -5.2, z: -99.2, rotY: -0.4, top: '#2f4a6a' },
      { x: 7.5, z: -100, rotY: 3.4, top: '#a54a3e', bag: true },
    ]);
    this.updaters.push((dt, t) => this.people.update(dt, t));
  }

  buildHomeRow() {
    const s = this.scene;
    const zs = [12.2, 8, 3.8, -0.4];
    const westShops = [null, null, { name: 'RICE NOODLES', bg: '#f4efe2', fg: '#a3271f' }, null];
    const eastShops = [{ name: 'GROCERY', bg: '#1f5a8a', fg: '#fff8e6' }, null, null, { name: 'SCOOTER REPAIR', bg: '#f2c230', fg: '#222' }];
    zs.forEach((z, i) => {
      townhouse(s, this.colliders, { side: -1, face: -3.6, z, floors: 3 + (i % 2), open: i === 1, shop: westShops[i], seed: [0.62, 0.15, 0.81, 0.47][i] });
      townhouse(s, this.colliders, { side: 1, face: 3.6, z, floors: 3 + ((i + 1) % 2), shop: eastShops[i], seed: [0.33, 0.92, 0.05, 0.7][i] });
    });

    scooter(s, { x: -2.6, z: 8.3, rotY: 0.5, color: '#b5332e' });
    this.colliders.push({ minX: -3.2, maxX: -2.0, minZ: 7.5, maxZ: 9.1 });
    [1.2, 2.2, 3.2, 4.4].forEach((z) => scooter(s, { x: 2.9, z, rotY: Math.PI / 2 + rand(-0.15, 0.15) }));
    streetLamp(s, { x: -3.3, z: -3, rotY: Math.PI / 2, height: 6.5, light: true });

    // laundry on the home balcony
    this.laundry = [];
    const colors = ['#e8e4dc', '#7fa7c9', '#e7b4a6', '#f2dd8c'];
    for (let i = 0; i < 4; i++) {
      const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.7), mat(colors[i], { side: THREE.DoubleSide }));
      cloth.geometry.translate(0, -0.35, 0);
      cloth.position.set(-3.35, 5.7, 6.7 + i * 0.7);
      cloth.rotation.y = Math.PI / 2;
      s.add(cloth);
      this.laundry.push(cloth);
    }
    box(s, { w: 0.03, h: 0.03, d: 3.2, x: -3.35, y: 5.7, z: 7.8, color: '#777' });
    this.updaters.push((dt, t, gust) => this.laundry.forEach((c, i) => { c.rotation.z = Math.sin(t * 3 + i) * 0.12 * (0.5 + gust) + 0.3 * gust; }));

    this.thing('home', -2.2, 8, 2.4, 'Look at home', { view: { look: [-5.6, 1.6, 8], hold: 3 } });
    this.thing('laundry', -1.6, 6.8, 2.6, 'Look up at the laundry', { view: { move: [-0.8, 7.6], look: [-3.35, 5.3, 7.8], hold: 3.5 } });
  }

  buildStore() { buildStoreParts(this); }

  buildShrine() {
    const s = this.scene;
    const cx = -8, cz = -61;
    tbox(s, { w: 4.4, h: 0.35, d: 4.4, x: cx, z: cz, color: '#b9b2a6', texName: 'pavers' });
    tbox(s, { w: 2.4, h: 2.1, d: 2.6, x: cx - 0.3, y: 0.35, z: cz, color: '#c4523d', texName: 'tile', scale: 0.6 });
    // swallowtail roof: two slopes plus curled ridge ends
    const roofMat = mat('#d9822f');
    [-1, 1].forEach((sd) => {
      const slope = box(s, { w: 3.3, h: 0.16, d: 1.9, x: cx - 0.3, y: 2.5, z: cz + sd * 0.85, material: roofMat });
      slope.rotation.x = sd * 0.42;
    });
    box(s, { w: 3.6, h: 0.22, d: 0.3, x: cx - 0.3, y: 2.85, z: cz, color: '#c9a24a' });
    [-1, 1].forEach((sd) => {
      const tip = box(s, { w: 0.5, h: 0.12, d: 0.25, x: cx - 0.3 + sd * 1.9, y: 3.0, z: cz, color: '#c9a24a' });
      tip.rotation.z = sd * 0.6;
    });
    const altar = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.3), glow('#ffb24a', 1.4));
    altar.position.set(cx + 0.91, 1.25, cz); altar.rotation.y = Math.PI / 2; s.add(altar);
    [-1.1, 1.1].forEach((dz) => {
      const l = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 12), glow('#e0302a', 2.0));
      l.scale.y = 1.3; l.position.set(cx + 1.05, 2.05, cz + dz); s.add(l);
    });
    const burner = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.5, 12), mat('#6a5a46'));
    burner.position.set(cx + 1.6, 0.6, cz); s.add(burner);
    const warm = new THREE.PointLight('#ff9a4a', 16, 10, 1.5);
    warm.position.set(cx + 1.6, 1.8, cz); s.add(warm);
    this.colliders.push({ minX: cx - 2.2, maxX: cx + 1.2, minZ: cz - 2.2, maxZ: cz + 2.2 });

    this.canopy = tree(s, { x: -11, z: -55, kind: 'banyan', scale: 1.1 });
    this.colliders.push({ minX: -12, maxX: -10, minZ: -56, maxZ: -54 });
    this.updaters.push((dt, t, gust) => { this.canopy.rotation.z = Math.sin(t * 0.8) * 0.015 * (0.5 + gust); });
    this.thing('shrine', -4.6, cz, 3, 'Bow to the Earth God', { view: { move: [-4.9, cz], look: [cx + 0.9, 1.0, cz], eye: 0.8, hold: 2.6 } });

    // the dropped photo
    const tx = canvasTexture(256, 300, (g, w, h) => {
      g.fillStyle = '#f7f3ea'; g.fillRect(0, 0, w, h);
      const grd = g.createLinearGradient(0, 0, 0, 220);
      grd.addColorStop(0, '#e2b98a'); grd.addColorStop(1, '#7a6a4a');
      g.fillStyle = grd; g.fillRect(16, 16, w - 32, 220);
      g.fillStyle = 'rgba(255,255,255,.8)'; g.font = '500 20px "IBM Plex Sans", sans-serif';
      g.textAlign = 'center'; g.fillText('your photo here', w / 2, 130);
      g.fillStyle = '#555'; g.font = 'italic 20px "Instrument Serif", serif'; g.fillText('Qianjia, age 7', w / 2, 272);
    });
    this.photo = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.42), new THREE.MeshLambertMaterial({ map: tx, emissive: '#ffffff', emissiveMap: tx, emissiveIntensity: 0.4, side: THREE.DoubleSide }));
    this.photo.position.set(-5.4, 0.3, -57.6);
    s.add(this.photo);
    this.halo = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.5, 32), new THREE.MeshBasicMaterial({ color: '#ffe7a8', transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }));
    this.halo.rotation.x = -Math.PI / 2; this.halo.position.set(-5.4, 0.04, -57.6); s.add(this.halo);
    this.thing('photo', -5.4, -57.6, 2.0, 'Pick up the photo', {
      once: true,
      view: { look: [-5.4, 0.25, -57.6], eye: 0.55, hold: 3 },
      action: () => {
        this.photoFound = true;
        this.photo.visible = false; this.halo.visible = false;
        this.audio.blip();
        this.keepsake('photo');
      },
    });
    this.updaters.push((dt, t) => {
      if (!this.photo.visible) return;
      this.photo.rotation.y = t * 0.8;
      this.photo.position.y = 0.3 + Math.sin(t * 2) * 0.05;
      this.halo.material.opacity = 0.25 + Math.sin(t * 3) * 0.12;
    });
  }

  buildStation() {
    buildStationParts(this);
    this.thing('viaduct', 0, -88, 5, 'Look up at the tracks', { view: { look: [0, 11, -104], hold: 3.5 } });
    this.thing('paddy', 3.6, -46, 2.8, 'Crouch and watch the rice', { view: { move: [4.3, -46], look: [40, 0.5, -58], eye: 0.5, hold: 4.5 } });
    this.zone({ minX: -6, maxX: 6, minZ: -103, maxZ: -98 }, () => this.reachStation());
  }

  buildTrain() { buildTrainParts(this); }

  buildDistance() {
    const s = this.scene;
    hills(s, [[520, -260, 220, 70], [600, -60, 260, 95], [560, 160, 200, 60], [430, -420, 180, 55]], '#7a7192');
    // Hsinchu city to the west: blocks with lit windows
    for (let i = 0; i < 40; i++) {
      tower(s, { x: rand(-480, -300), z: rand(-350, 170), w: rand(14, 30), d: rand(14, 30), h: rand(14, i % 6 === 0 ? 90 : 45), color: '#7a7488', litRatio: 0.25, nightGlow: 0.6 });
    }
  }

  // Everything beyond the story path: the village south of home, farm roads
  // and fields, courtyard farmhouses, the Taiwan Pavilion and new towers north
  // of the tracks, and the city edge to the west. Plus road signs.
  buildSurroundings() {
    const s = this.scene;
    const cb = new CityBuilder(s, this.colliders, { nightGlow: 0.65 });
    const core = [{ minX: -60, maxX: 60, minZ: -120, maxZ: 22 }];
    // lane continues south into the village; village road along z ≈ 20
    cb.ground('asphalt', 0, 70, 7, 110, 0.02, 4);
    cb.ground('asphalt', 0, 21, 300, 8, 0.021, 4);
    district(cb, { minX: -150, maxX: -6, minZ: 26, maxZ: 122, block: [30, 44], street: 8, floors: [2, 4], tall: 0.04, shops: 0.35, avoid: core });
    district(cb, { minX: 6, maxX: 150, minZ: 26, maxZ: 122, block: [30, 44], street: 8, floors: [2, 4], tall: 0.04, shops: 0.35, avoid: core });
    // rows along the village road, both sides of the lane
    for (let x = -60; x < 60; x += 4.4) if (Math.abs(x) > 6) cb.building({ x, z: 29.5, w: 4.3, d: 9, floors: 3 + (Math.abs(Math.round(x)) % 2), style: pick(['cream', 'pink', 'grey', 'green']), shop: Math.random() < 0.5 });
    // city edge to the west, new high-rises north of the tracks
    district(cb, { minX: -225, maxX: -150, minZ: -270, maxZ: 120, block: [36, 50], street: 10, floors: [4, 7], tall: 0.3, shops: 0.6 });
    district(cb, { minX: 90, maxX: 225, minZ: -270, maxZ: -150, block: [40, 56], street: 12, floors: [6, 9], tall: 0.6, tallFloors: [12, 24], shops: 0.4 });

    // farm roads through the fields (concrete strips) and the field ground
    cb.ground('field', 0, -40, 300, 120, 0.008, 6);
    cb.ground('field', -20, -200, 220, 140, 0.008, 6);
    [-40, -75].forEach((z) => { cb.ground('concrete', -100, z, 140, 3.4, 0.03, 3); cb.ground('concrete', 100, z, 140, 3.4, 0.03, 3); });
    [-70, 70, -130, 130].forEach((x) => cb.ground('concrete', x, -48, 3.4, 96, 0.031, 3));
    cb.ground('concrete', 60, -190, 3.4, 150, 0.031, 3);
    cb.ground('concrete', -40, -150, 200, 3.4, 0.031, 3);
    // trees along farm roads
    for (let x = -140; x <= 140; x += 14) if (Math.abs(x) > 60) cb.tree(x, -38, rand(0.8, 1.1));
    for (let z = -260; z <= -130; z += 16) cb.tree(64, z, rand(0.8, 1.2));
    cb.finish();

    // more rice further out (sparser so it stays fast)
    blades(s, {
      areas: [{ minX: -140, maxX: -60, minZ: -96, maxZ: -8 }, { minX: 60, maxX: 140, minZ: -96, maxZ: -8 }, { minX: -110, maxX: 50, minZ: -260, maxZ: -130 }],
      exclude: [{ minX: -72, maxX: -68, minZ: -100, maxZ: 0 }, { minX: 68, maxX: 72, minZ: -100, maxZ: 0 }, { minX: -142, maxX: 52, minZ: -152, maxZ: -148 }, { minX: -100, maxX: -86, minZ: -64, maxZ: -46 }, { minX: 101, maxX: 119, minZ: -39, maxZ: -21 }, { minX: 40, maxX: 80, minZ: -190, maxZ: -150 }, { minX: -150, maxX: 150, minZ: -42, maxZ: -38 }, { minX: -150, maxX: 150, minZ: -77, maxZ: -73 }, { minX: 58, maxX: 62, minZ: -270, maxZ: -110 }],
      spacing: this.quality === 'low' ? 2.0 : 1.15,
      uniforms: this.wind,
    });

    // courtyard farmhouses (三合院): red brick, U-shaped, grey tile roofs
    const sanheyuan = (cx, cz, face) => {
      const g = new THREE.Group();
      const wing = (w, d, x, z) => { tbox(g, { w, h: 3.2, d, x, z, color: '#c98a6a', texName: 'brick', scale: 0.9 }); hipRoof(g, { w, d, h: 1.6, x, y: 3.2, z, color: '#5d5b55', overhang: 0.5 }); this.colliders.push({ minX: cx + x - w / 2, maxX: cx + x + w / 2, minZ: cz + z - d / 2, maxZ: cz + z + d / 2 }); };
      wing(16, 6, 0, -6);       // main hall
      wing(5, 10, -5.5, 2);     // left wing
      wing(5, 10, 5.5, 2);      // right wing
      ground(g, { w: 6, d: 10, x: 0, z: 2, y: 0.03, color: '#d1c3a6', texName: 'concrete', scale: 2 });
      const door = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.4), glow('#ffcf8a', 0.7)); door.position.set(0, 1.2, -2.98); g.add(door);
      g.position.set(cx, 0, cz); g.rotation.y = face; s.add(g);
    };
    sanheyuan(-93, -55, 0);
    sanheyuan(110, -30, 0);
    this.thing('farmhouse', -93, -46, 6, 'Look at the old farmhouse', { view: { look: [-93, 3, -61], hold: 3.5 } });

    // the Taiwan Pavilion: a glass cube with a glowing sky lantern inside
    const px = 60, pz = -170;
    ground(s, { w: 44, d: 44, x: px, z: pz, y: 0.035, color: '#cfc7ba', texName: 'pavers', scale: 2 });
    const cube = new THREE.Mesh(new THREE.BoxGeometry(22, 22, 22), new THREE.MeshPhongMaterial({ color: '#a8c4dc', transparent: true, opacity: 0.3, shininess: 120, specular: '#ffffff', depthWrite: false }));
    cube.position.set(px, 12, pz); s.add(cube);
    const frame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(22, 22, 22)), new THREE.LineBasicMaterial({ color: '#e8eef4' }));
    frame.position.copy(cube.position); s.add(frame);
    const lantern = new THREE.Mesh(new THREE.SphereGeometry(6.5, 32, 20), glow('#ffcf7a', 1.6));
    lantern.scale.y = 1.15; lantern.position.set(px, 12, pz); s.add(lantern);
    const lanternLight = new THREE.PointLight('#ffcf7a', 120, 60, 1.5); lanternLight.position.set(px, 12, pz); s.add(lanternLight);
    tbox(s, { w: 26, h: 1, d: 26, x: px, z: pz, color: '#bdb6aa', texName: 'concrete' });
    this.colliders.push({ minX: px - 13, maxX: px + 13, minZ: pz - 13, maxZ: pz + 13 });
    this.updaters.push((dt, t) => { lantern.material.emissiveIntensity = 1.4 + 0.25 * Math.sin(t * 1.3); lantern.position.y = 12 + Math.sin(t * 0.6) * 0.3; });
    this.thing('pavilion', px, pz + 17, 8, 'Look at the glowing pavilion', { view: { look: [px, 13, pz], hold: 4 } });

    // road signs pointing the way
    signpost(s, { x: 3.6, z: 0.5, rotY: 0, entries: [{ text: 'Qianjia Station', dir: 'up', dist: '100 m' }, { text: 'Village Road', dir: 'down' }] });
    signpost(s, { x: 3.6, z: 24.5, rotY: 0, entries: [{ text: 'Qianjia Station', dir: 'up', dist: '125 m' }, { text: 'Taiwan Pavilion', dir: 'up', dist: '200 m' }] });
    signpost(s, { x: 3.4, z: -37.5, rotY: 0, entries: [{ text: 'Qianjia Station', dir: 'up', dist: '60 m' }, { text: 'Farm Road', dir: 'left' }, { text: 'Farm Road', dir: 'right' }] });
    signpost(s, { x: -66, z: -42.5, rotY: -Math.PI / 2, entries: [{ text: 'Qianjia Station', dir: 'upleft', dist: '90 m' }] });
    signpost(s, { x: 66, z: -42.5, rotY: Math.PI / 2, entries: [{ text: 'Qianjia Station', dir: 'upright', dist: '90 m' }] });
    signpost(s, { x: 3.5, z: -73, rotY: 0, entries: [{ text: 'Qianjia Station', dir: 'up', dist: '25 m' }, { text: 'Taiwan Pavilion', dir: 'upright' }] });
    signpost(s, { x: 56, z: -132, rotY: 0, entries: [{ text: 'Taiwan Pavilion', dir: 'up', dist: '40 m' }, { text: 'Qianjia Station', dir: 'down' }] });
    signpost(s, { x: 56, z: -205, rotY: Math.PI, entries: [{ text: 'Qianjia Station', dir: 'right', dist: '120 m' }] });
  }

  // ---------- flow ----------
  enter() {
    this.player.setEye(1.15);          // kid height: the world is big
    this.player.walkSpeed = 2.6;
    this.player.runSpeed = 6.0;
    this.player.place(...this.startPose);
    this.objective('start');

    this.zone({ minX: -55, maxX: 55, minZ: -50, maxZ: -46 }, () => { if (!this.photoFound) this.say(CH1.photoHint); });
    this.zone({ minX: -55, maxX: 55, minZ: -120, maxZ: -72 }, () => {
      this.trainCalled = true;
      const tc = this.trainClock % CYCLE;
      if (!(tc > 6 && tc < 52)) this.trainClock = 0;
      this.objective('board');
    });
  }

  begin() { setTimeout(() => this.say(CH1.intro), 900); }

  // Ending: a first-person cutscene. Through the doors and the ticket gates,
  // up to Platform 1, the departure board, and the train pulling in.
  async reachStation() {
    if (this.cut || this.done) return;
    const cam = this.camera.position;
    const E = 1.15, P = PLAT_Y + E, DOOR_X = 5.1;
    const L = CH1.cutscene;
    this.trainClock = 80;                    // clear the line until our train is called
    await this.playCutscene({
      keys: [
        { t: 0, pos: [cam.x, cam.y, cam.z], look: [0, 2.2, -108], stop: true },
        { t: 2.6, pos: [0, E, -105.4], look: [0, 1.8, -112], walk: true },
        { t: 4.4, pos: [0, E, -109.6], look: [-4.5, 2.8, -112.5], walk: true, stop: true },
        { t: 4.8, pos: [DOOR_X, P, -103.9], look: [-40, P + 0.1, -104.6], cut: true },
        { t: 7.6, pos: [DOOR_X, P, -103.9], look: [-4, PLAT_Y + 3.4, -104.4], stop: true },
        { t: 10.0, pos: [DOOR_X, P, -103.9], look: [-150, PLAT_Y + 0.5, TRAIN_Z], stop: true },
        { t: 13.0, pos: [DOOR_X, P, -103.9], look: [-110, PLAT_Y + 0.7, TRAIN_Z] },
        { t: 15.0, pos: [DOOR_X, P, -103.9], look: [-18, PLAT_Y + 1.0, TRAIN_Z] },
        { t: 16.8, pos: [DOOR_X, P, -103.9], look: [DOOR_X, PLAT_Y + 1.2, TRAIN_Z - 1.5], stop: true },
        { t: 19.8, pos: [DOOR_X, P, -103.95], look: [DOOR_X, PLAT_Y + 1.2, TRAIN_Z - 1.5], stop: true },
        { t: 21.8, pos: [DOOR_X, P, -105.55], look: [DOOR_X, PLAT_Y + 1.1, -110], walk: true, stop: true },
        { t: 23.6, pos: [DOOR_X, P, -105.6], look: [DOOR_X, PLAT_Y + 1.1, -110], stop: true },
      ],
      events: [
        { at: 0.2, fn: () => { this.hallOpen = true; } },
        { at: 3.7, fn: () => this.audio.blip() },                       // tap through the gate
        { at: 4.2, fn: () => this.ui.dip(420) },
        { at: 5.2, fn: () => this.say([L[0]], true) },
        { at: 6.5, fn: () => { this.approachDur = 11; this.trainClock = 0; this.hornedThisCycle = false; } },
        { at: 8.2, fn: () => this.say([L[1]], true) },
        { at: 11.6, fn: () => this.say(CH1.trainArrives, true) },
        { at: 18.9, fn: () => { this.trainDoorsOpening = true; this.audio.chime(); } },
        { at: 20.0, fn: () => this.say(CH1.end, true) },
        { at: 22.2, fn: () => this.ui.fade(true, 1300) },
      ],
    });
    this.complete({ photoFound: this.photoFound });
  }

  trainX(tc) {
    const A = this.approachDur || 20;
    if (tc < A) { const k = 1 - tc / A; return -320 * k * k; }
    if (tc < A + 12) return 0;
    if (tc < A + 32) { const k = (tc - A - 12) / 20; return 320 * k * k; }
    return -10000;
  }

  tick(dt) {
    const p = this.player.position;
    // station doors and train doors for the ending
    if (this.hallOpen && this.hallDoors) this.hallDoors.forEach((d, i) => { d.position.x += ((i ? 1.75 : -1.75) - d.position.x) * Math.min(1, dt * 3); });
    if (this.trainDoorsOpening) { this.doorK = Math.min(1, (this.doorK || 0) + dt * 0.8); setTrainDoors(this, this.doorK); }
    const prevX = this.train.position.x;
    this.trainClock += dt;
    const tc = this.trainClock % CYCLE;
    if (tc < 1 && this.hornedThisCycle) this.hornedThisCycle = false;
    const x = this.trainX(tc);
    this.train.position.x = x;
    if (x > -9000) {
      const nearestX = Math.max(x - 42, Math.min(p.x, x + 42));
      const d = Math.hypot(nearestX - p.x, TRAIN_Z - p.z, DECK_Y - 1.2);
      const speed = Math.abs(x - prevX) / Math.max(dt, 1e-4);
      const level = Math.pow(Math.max(0, 1 - d / 160), 2) * (0.25 + Math.min(1, speed / 16) * 0.75);
      this.audio.setTrain(level);
      if (this.lastClackX == null || Math.abs(x - this.lastClackX) > 20.4) { this.audio.clack(level); this.lastClackX = x; }
      if (!this.hornedThisCycle && tc > 4) {
        this.hornedThisCycle = true;
        this.audio.horn(Math.max(0.25, 1 - d / 300));
        if (this.trainCalled && p.z < -60 && !this.done && !this.cut) this.say(CH1.trainArrives);
      }
      this.trainHead.position.set(x + 42, DECK_Y + 1.5, TRAIN_Z);
      this.trainHead.target.position.set(x + 80, DECK_Y, TRAIN_Z);
      this.trainHead.visible = true;
    } else {
      this.audio.setTrain(0);
      this.lastClackX = null;
      this.trainHead.visible = false;
    }
  }
}
