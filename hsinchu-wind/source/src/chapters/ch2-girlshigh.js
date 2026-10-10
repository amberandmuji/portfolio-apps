// Chapter 2 · High school · Hsinchu Girls' Senior High (新竹女中) · morning
// Breakfast shop → around the East Gate (迎曦門) roundabout → school gate →
// courtyard with the old lecture hall → upstairs into the classroom.
//
// Map (meters; north is -z). Street runs north–south at x ≈ 0.
//   z ≈ +18 … -22   shophouses, breakfast shop on the east side (start)
//   z ≈ -45         East Gate roundabout (center), name tag on the plaza
//   z ≈ -64 … -190  school on the west side (gate at z ≈ -92), shops east
//   x ≈ 300         the classroom interior (teleported into)
import * as THREE from 'three';
import { Chapter } from '../engine/chapter.js';
import { CH2 } from '../story/strings.js';
import {
  box, tbox, ground, mat, glow, sign, canvasTexture, fitText, townhouse, scooter, car,
  tree, crowd, personMesh, studentMesh, streetLamp, hills, tower, hipRoof, blades, rand, pick, tex as kitTex,
} from '../engine/kit.js';
import { buildRoundabout as buildRoundaboutParts, RB, ISLAND, ROAD, WALK, PIT, plazaHeight } from './ch2-gate.js';
import { buildSchool as buildSchoolParts, ENTRANCE } from './ch2-school.js';
import { CityBuilder, district, signpost } from '../engine/city.js';

const ROOM = { x: -54.5, z: -100.5, y: 7 };  // classroom: third floor of the main building, facing the courtyard

export class ChapterGirlsHigh extends Chapter {
  static meta = { id: 'girlshigh', board: CH2.board, keepsake: 'nametag' };

  constructor(ctx) {
    super(ctx, CH2);
    this.ambience = { bugs: 0, traffic: 0.35, birds: true };
    this.startPose = [3.2, 15, 0];
    this.hasTag = false;
    this.hadBreakfast = false;
    this.inside = false;
    this.elapsed = 0;
    this.targets = { breakfast: [8.3, 16], gate: [-6, -92], tag: [2.6, RB.z - 6.2, -2.4], classroom: [ENTRANCE.x, ENTRANCE.z] };
  }

  build() {
    const s = this.scene;
    this.setup('morning', { specks: 160, speckColor: '#ffffff' });
    this.bounds(-230, 210, -330, 140);

    // the ground, with the sunken plaza cut out of it
    const gshape = new THREE.Shape();
    gshape.moveTo(-700, -700); gshape.lineTo(700, -700); gshape.lineTo(700, 700); gshape.lineTo(-700, 700); gshape.lineTo(-700, -700);
    const pit = new THREE.Path(); pit.absellipse(PIT.x, -PIT.z, PIT.rx, PIT.rz, 0, Math.PI * 2, true, 0); gshape.holes.push(pit);
    const ggeo = new THREE.ShapeGeometry(gshape, 48);
    const guv = ggeo.attributes.uv; for (let i = 0; i < guv.count; i++) guv.setXY(i, guv.getX(i) / 6, guv.getY(i) / 6);
    const gm = new THREE.Mesh(ggeo, mat('#b3b09e', { map: kitTex('concrete') })); gm.rotation.x = -Math.PI / 2; gm.receiveShadow = true; s.add(gm);
    // main street + sidewalks, ending at the roundabout
    ground(s, { w: 12, d: 42, z: -1, y: 0.02, color: '#8a8c90', texName: 'asphalt', scale: 4 });
    ground(s, { w: 12, d: 123, z: -130.5, y: 0.02, color: '#8a8c90', texName: 'asphalt', scale: 4 });
    [-7.25, 7.25].forEach((x) => {
      ground(s, { w: 2.5, d: 39, x, z: 0.5, y: 0.04, color: '#c8c1b4', texName: 'pavers', scale: 1 });
      ground(s, { w: 2.5, d: 121, x, z: -131.5, y: 0.04, color: '#c8c1b4', texName: 'pavers', scale: 1 });
    });
    // lane markings
    for (let z = 18; z > -190; z -= 6) {
      if (Math.abs(z - RB.z) < 30) continue;
      ground(s, { w: 0.15, d: 3, x: 0, z, y: 0.03, color: '#f2efe6', texName: 'concrete' });
    }
    // scooter waiting boxes before the roundabout
    [[RB.z + 31, 1], [RB.z - 31, -1]].forEach(([z, sd]) => {
      ground(s, { w: 5.6, d: 0.2, x: sd * 3, z: z - sd * 2, y: 0.03, color: '#f2efe6', texName: 'concrete' });
      ground(s, { w: 5.6, d: 0.2, x: sd * 3, z, y: 0.03, color: '#f2efe6', texName: 'concrete' });
    });

    this.buildStreet();
    this.buildRoundabout();
    this.buildSchool();
    this.buildClassroom();
    this.buildTraffic();
    this.buildSurroundings();
    hills(s, [[420, -300, 200, 80], [380, 40, 160, 55], [300, -560, 220, 90]], '#9fb0c4');
    for (let i = 0; i < 26; i++) tower(s, { x: rand(-380, -160), z: rand(-420, 120), w: rand(16, 28), d: rand(16, 28), h: rand(20, 70), color: '#c9c6c0', litRatio: 0.05, nightGlow: 0.2 });
  }

  buildStreet() {
    const s = this.scene;
    const shopsE = [{ name: 'MORNING BREAKFAST', bg: '#f2c230', fg: '#5a1d10' }, null, { name: 'STATIONERY', bg: '#1f5a8a', fg: '#fff' }, null, null, null, { name: 'PHARMACY', bg: '#2c7a4b', fg: '#fff' }, null, { name: 'BOOKSTORE', bg: '#a3271f', fg: '#fff' }];
    const shopsW = [null, { name: 'SOY MILK', bg: '#ffffff', fg: '#a3271f' }, null, null, null, null, { name: 'OPTICAL', bg: '#1f5a8a', fg: '#fff' }, null, null];
    for (let i = 0; i < 9; i++) {
      const z = 16 - i * 4.2;
      if (i === 4 || i === 5 || i === 8) continue; // side street; last lot is the roundabout sidewalk
      townhouse(s, this.colliders, { side: 1, face: 8.5, z, floors: 3 + (i % 3 === 0 ? 1 : 0), shop: shopsE[i], seed: (i * 0.37 + 0.1) % 1 });
      townhouse(s, this.colliders, { side: -1, face: -8.5, z, floors: 3 + (i % 2), shop: shopsW[i], seed: (i * 0.53 + 0.3) % 1 });
    }
    // east side north of the roundabout
    for (let i = 0; i < 28; i++) {
      const z = -68 - i * 4.2;
      if (i < 2 || i === 10 || i === 11 || i === 20 || i === 21) continue; // roundabout corner, side streets
      townhouse(s, this.colliders, { side: 1, face: 8.5, z, floors: 3 + (i % 4 === 0 ? 2 : i % 2), shop: i % 5 === 1 ? { name: pick(['BREAKFAST', 'BUBBLE TEA', 'PRINT SHOP', 'CRAM SCHOOL', 'NOODLES']), bg: pick(['#f4efe2', '#1f5a8a', '#f2c230']), fg: '#a3271f' } : null, seed: (i * 0.61 + 0.2) % 1 });
    }

    // breakfast shop: counter, griddle, menu board, a couple of customers
    const bz = 16;
    box(s, { w: 1, h: 1.0, d: 3, x: 9.3, z: bz, color: '#d7d2c6' });
    box(s, { w: 1.05, h: 0.06, d: 3.05, x: 9.3, y: 1.0, z: bz, color: '#9aa0a4' });
    const steam = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(Array.from({ length: 90 }, (_, i) => [9.3 + rand(-0.3, 0.3), 1.1 + rand(0, 1.2), bz + rand(-1, 1)][i % 3]), 3)), new THREE.PointsMaterial({ color: '#ffffff', size: 0.06, transparent: true, opacity: 0.35, depthWrite: false }));
    s.add(steam);
    this.updaters.push((dt, t) => { steam.position.y = (t * 0.3) % 0.5; steam.material.opacity = 0.25 + 0.1 * Math.sin(t * 3); });
    sign(s, {
      w: 2.2, h: 1.2, x: 10.4, y: 2.2, z: bz, rotY: -Math.PI / 2, emissive: 0.5,
      draw: (g, w, h) => {
        g.fillStyle = '#fbf6e8'; g.fillRect(0, 0, w, h);
        const items = [['Egg crepe', '30'], ['Turnip cake', '35'], ['Milk tea', '25'], ['Iron-plate noodles', '50'], ['Rice ball', '40'], ['Soy milk', '20']];
        g.textBaseline = 'middle';
        items.forEach(([n, p], i) => {
          const col = i % 2, row = Math.floor(i / 2);
          g.font = `600 ${h * 0.085}px "IBM Plex Sans", Arial, sans-serif`; g.fillStyle = '#3a2a1a'; g.textAlign = 'left';
          g.fillText(n, 20 + col * w / 2, h * 0.2 + row * h * 0.28);
          g.textAlign = 'right'; g.fillStyle = '#a3271f'; g.fillText(p, (col + 1) * w / 2 - 20, h * 0.2 + row * h * 0.28);
        });
      },
    });
    const auntie = personMesh({ top: '#c45a5a', bottom: '#3a3a44', height: 1.55, longHair: false });
    auntie.position.set(9.9, 0, bz + 0.5); auntie.rotation.y = -Math.PI / 2; s.add(auntie);
    this.crowdStatic = crowd(s, [
      { student: true, x: 7.6, z: bz - 0.8, rotY: Math.PI / 2, bag: true },
      { x: 7.4, z: bz + 1.4, rotY: Math.PI / 2 + 0.4, top: '#5c6f8a' },
    ]);
    this.thing('breakfast', 8.3, bz, 2.6, 'Order breakfast', {
      once: true,
      view: { move: [8.4, bz], look: [9.3, 1.1, bz], hold: 3.5 },
      action: () => { this.hadBreakfast = true; this.audio.blip(); this.objective('gate'); },
    });
    [[-7.5, 10], [7.5, -6], [-7.5, -70], [7.5, -110], [-7.5, -150], [7.5, -170]].forEach(([x, z]) => streetLamp(s, { x, z, rotY: x < 0 ? Math.PI / 2 : -Math.PI / 2, height: 7 }));
    // parked scooters along the curb
    for (let z = 12; z > -20; z -= 1.0) if (Math.random() < 0.6 && Math.abs(z - bz) > 2.5) scooter(s, { x: 6.5, z, rotY: Math.PI / 2 + rand(-0.15, 0.15) });
    for (let z = 12; z > -20; z -= 1.0) if (Math.random() < 0.5) scooter(s, { x: -6.5, z, rotY: -Math.PI / 2 + rand(-0.15, 0.15) });
  }

  buildRoundabout() {
    const s = this.scene;
    buildRoundaboutParts(this);
    // corner buildings around the roundabout, with rooftop billboards
    const ads = [
      ['#2c6ab8', '#ffffff', 'SUNRISE RESIDENCES', 'New homes by the East Gate'],
      ['#f2c230', '#3a2a10', 'SMILE DENTAL', 'Open late · 2F'],
      ['#c8302a', '#ffffff', 'WINDY CITY FESTIVAL', 'Lanterns · Music · Food'],
      ['#2c9a5b', '#ffffff', 'MORNING TEA HOUSE', 'Breakfast from 6 a.m.'],
    ];
    [[-40, RB.z - 18, 16, 14, 24], [-40, RB.z + 16, 16, 12, 18], [40, RB.z + 16, 16, 12, 30], [40, RB.z - 16, 16, 14, 21]].forEach(([x, z, w, d, hh], i) => {
      tower(s, { x, z, w, d, h: hh, color: pick(['#d9d2c4', '#c9d1d6', '#e3d8c6']), litRatio: 0.15, nightGlow: 0.25 });
      this.colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
      const [bg, fg, t1, t2] = ads[i];
      const fx = x - Math.sign(x) * (w / 2 - 1);
      [-2.5, 2.5].forEach((dz) => box(s, { w: 0.2, h: 3, d: 0.2, x: fx, y: hh, z: z + dz, color: '#5a5f66' }));
      sign(s, {
        w: 9, h: 4.2, x: fx - Math.sign(x) * 0.15, y: hh + 4.6, z, rotY: -Math.sign(x) * Math.PI / 2, emissive: 0.35, double: true,
        draw: (g, W, H) => { g.fillStyle = bg; g.fillRect(0, 0, W, H); g.fillStyle = 'rgba(255,255,255,0.15)'; for (let k = 0; k < 6; k++) { g.beginPath(); g.arc(rand(0, W), rand(0, H), rand(20, 70), 0, Math.PI * 2); g.fill(); } fitText(g, t1, W / 2, H * 0.42, W * 0.9, H * 0.22, '700 {s}px "IBM Plex Sans", Arial, sans-serif', fg); fitText(g, t2, W / 2, H * 0.7, W * 0.8, H * 0.11, '500 {s}px "IBM Plex Sans", Arial, sans-serif', fg); },
      });
    });
    const T = this.tagSpot;
    this.thing('tag', T.x, T.z, 2.0, 'Pick up the name tag', {
      once: true, y: T.y,
      view: { look: [T.x, T.y + 0.1, T.z], eye: 0.7, hold: 2.6 },
      action: () => {
        this.hasTag = true; this.tag.visible = false; this.tagHalo.visible = false;
        this.audio.blip(); this.keepsake('nametag');
        if (this.currentObjective === 'tag') this.objective(this.passedGate ? 'classroom' : 'gate');
      },
    });
  }

  buildSchool() { buildSchoolParts(this, { ROOM }); }

  buildClassroom() {
    // Built inside the classroom block on the third floor, so the windows
    // look out over the real corridor and courtyard.
    const s = this.scene;
    const room = new THREE.Group(); room.position.y = ROOM.y; s.add(room);
    (this.interiors = this.interiors || []).push({ minX: ROOM.x - 4.5, maxX: ROOM.x + 4.5, minZ: ROOM.z - 4.5, maxZ: ROOM.z + 4.5, y: ROOM.y, exposure: 0.8 });
    const X = ROOM.x, Z = ROOM.z, W = 9, D = 9, H = 3.5;
    const x0 = X - W / 2, x1 = X + W / 2;
    ground(room, { w: W, d: D, x: X, z: Z, y: 0.02, color: '#c9c3b8', texName: 'mosaic', scale: 1 });
    tbox(room, { w: 0.3, h: H, d: D, x: x0 + 0.15, z: Z, color: '#f0ebe0', texName: 'concrete', scale: 2 });
    tbox(room, { w: 0.25, h: 1.0, d: D, x: x1 - 0.12, z: Z, color: '#f0ebe0', texName: 'concrete', scale: 2 });
    tbox(room, { w: 0.25, h: 0.7, d: D, x: x1 - 0.12, y: 2.8, z: Z, color: '#f0ebe0', texName: 'concrete', scale: 2 });
    const glass = new THREE.MeshPhongMaterial({ color: '#dceef8', transparent: true, opacity: 0.12, shininess: 120, specular: '#ffffff', depthWrite: false, side: THREE.DoubleSide });
    for (let k = -3.75; k <= 3.75; k += 2.5) {
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.8), glass);
      pane.position.set(x1 - 0.12, 1.9, Z + k); pane.rotation.y = Math.PI / 2; room.add(pane);
      box(room, { w: 0.08, h: 1.8, d: 0.08, x: x1 - 0.12, y: 1.0, z: Z + k + 1.25, color: '#9aa4ac', shadow: false });
    }
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j += 2) box(room, { w: 0.12, h: 0.06, d: 1.2, x: X + j * 1.8, y: H - 0.08, z: Z + i * 3, material: glow('#f4fbff', 1.1), shadow: false });
    const l1 = new THREE.PointLight('#f4f8ff', 9, 14, 1.2); l1.position.set(X, H - 0.4, Z); room.add(l1);
    box(room, { w: 5.4, h: 1.5, d: 0.08, x: X, y: 0.9, z: Z - D / 2 + 0.06, color: '#6d5a44' });
    const smudges = Array.from({ length: 30 }, () => [rand(0, 1), rand(0, 1), rand(40, 160), rand(2, 8)]);
    this.drawBoard = (g, w, h, days = 87) => {
      g.fillStyle = '#1f3a2e'; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(255,255,255,0.06)'; smudges.forEach(([a, b, c, d]) => g.fillRect(a * w, b * h, c, d));
      g.textBaseline = 'middle'; g.fillStyle = '#f4f1e8';
      g.font = `${h * 0.14}px "IBM Plex Sans", sans-serif`; g.textAlign = 'left';
      g.fillText(days > 0 ? 'Exam countdown' : 'Graduation day', w * 0.06, h * 0.22);
      g.font = `700 ${h * 0.42}px "IBM Plex Sans", sans-serif`; g.fillText(String(days), w * 0.06, h * 0.58);
      g.font = `${h * 0.12}px "IBM Plex Sans", sans-serif`; g.fillText(days === 1 ? 'day' : 'days', w * (days > 9 ? 0.2 : 0.14), h * 0.66);
      g.textAlign = 'right'; g.font = `${h * 0.11}px "IBM Plex Sans", sans-serif`;
      g.fillText(days > 0 ? 'Duty: 12, 37' : 'Thank you, Class 12-7', w * 0.95, h * 0.2);
      g.fillText(days > 0 ? 'Math quiz · period 2' : 'See you all again', w * 0.95, h * 0.82);
    };
    this.board = sign(room, { w: 5.2, h: 1.35, x: X, y: 1.65, z: Z - D / 2 + 0.12, emissive: 0.25, draw: (g, w, h) => this.drawBoard(g, w, h, 87) });
    box(room, { w: 1.6, h: 0.9, d: 0.7, x: X, y: 0, z: Z - D / 2 + 1.3, color: '#a07a52' });
    this.thing('blackboard', X, Z - D / 2 + 2.6, 2.6, 'Read the board', { y: ROOM.y, view: { look: [X, ROOM.y + 1.65, Z - D / 2], hold: 4 } });
    this.roomColliders = [];
    this.seat = null;
    for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) {
      const dx = X - 3.2 + c * 1.6, dz = Z - 2.4 + r * 1.3;
      box(room, { w: 0.65, h: 0.06, d: 0.45, x: dx, y: 0.72, z: dz, color: '#b8916a' });
      box(room, { w: 0.06, h: 0.72, d: 0.06, x: dx, y: 0, z: dz, color: '#5c6670' });
      box(room, { w: 0.42, h: 0.05, d: 0.4, x: dx, y: 0.44, z: dz + 0.5, color: '#b8916a' });
      box(room, { w: 0.42, h: 0.4, d: 0.04, x: dx, y: 0.46, z: dz + 0.72, color: '#b8916a' });
      this.roomColliders.push({ minX: dx - 0.33, maxX: dx + 0.33, minZ: dz - 0.23, maxZ: dz + 0.23 });
      if (r === 2 && c === 2) { this.seat = { x: dx, z: dz + 0.5 }; continue; }
      if (Math.random() < 0.85) {
        const p = studentMesh({});
        p.position.set(dx, 0, dz + 0.55); p.rotation.y = Math.PI;
        p.userData.legs.forEach((l) => { l.rotation.x = -1.35; l.position.y = 0.48; });
        p.children.forEach((ch) => { if (!p.userData.legs.includes(ch)) ch.position.y -= 0.36; });
        p.userData.arms.forEach((a) => { a.rotation.x = -0.9; });
        room.add(p);
        (this.classmates = this.classmates || []).push(p);
      }
    }
    const glowSeat = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.42, 28), new THREE.MeshBasicMaterial({ color: '#ffe7a8', transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide }));
    glowSeat.rotation.x = -Math.PI / 2; glowSeat.position.set(this.seat.x, 0.05, this.seat.z); room.add(glowSeat);
    [0.12, -0.1, 0.02].forEach((o, i) => box(room, { w: 0.14, h: 0.005, d: 0.1, x: this.seat.x + o, y: 0.78 + i * 0.006, z: this.seat.z - 0.5 + o * 0.5, color: pick(['#fff6b0', '#ffd0dc', '#d6ecff']), shadow: false }));
    this.updaters.push((dt, t) => { glowSeat.material.opacity = 0.3 + 0.2 * Math.sin(t * 3); });
    this.thing('seat', this.seat.x + 0.9, this.seat.z + 0.3, 1.8, 'Sit down', { y: ROOM.y, once: true, action: () => this.sitDown(glowSeat) });
    this.thing('window', x1 - 1.0, Z + 3.2, 2.0, 'Look out the window', { y: ROOM.y, view: { move: [x1 - 0.6, Z + 2.5], look: [-26, 2, -96], hold: 5 } });
  }

  buildTraffic() {
    const s = this.scene;
    this.movers = [];
    // scooters and cars on the straight street segments, both directions
    const lanes = [{ x: 2.6, dir: -1 }, { x: 4.6, dir: -1, scoot: true }, { x: -2.6, dir: 1 }, { x: -4.6, dir: 1, scoot: true }];
    lanes.forEach((ln) => {
      for (let i = 0; i < (ln.scoot ? 7 : 3); i++) {
        const m = ln.scoot ? scooter(s, { x: ln.x, z: 0, rider: true }) : car(s, { x: ln.x, z: 0, taxi: Math.random() < 0.2 });
        m.rotation.y = ln.dir < 0 ? Math.PI : 0;
        this.movers.push({ m, lane: ln, z: rand(-190, 20), speed: ln.scoot ? rand(7, 10) : rand(8, 11) });
      }
    });
    // scooters circling the roundabout counter-clockwise
    this.circlers = [];
    for (let i = 0; i < 14; i++) {
      const m = i % 4 === 0 ? car(s, {}) : scooter(s, { x: 0, z: 0, rider: true });
      const lane = Math.random() < 0.5 ? 0.3 : 0.72;
      this.circlers.push({ m, a: rand(0, Math.PI * 2), rx: ISLAND.rx + (ROAD.rx - ISLAND.rx) * lane, rz: ISLAND.rz + (ROAD.rz - ISLAND.rz) * lane, w: rand(0.28, 0.4) });
    }
    this.updaters.push((dt) => {
      for (const v of this.movers) {
        v.z += v.lane.dir * v.speed * dt;
        // skip through the roundabout zone
        if (v.lane.dir < 0 && v.z < RB.z + 26 && v.z > RB.z - 26) v.z = RB.z - 26;
        if (v.lane.dir > 0 && v.z > RB.z - 26 && v.z < RB.z + 26) v.z = RB.z + 26;
        if (v.z < -195) v.z = 22; if (v.z > 22) v.z = -195;
        v.m.position.set(v.lane.x, 0, v.z);
      }
      for (const c of this.circlers) {
        c.a -= c.w * dt;   // counter-clockwise seen from above
        const x = RB.x + c.rx * Math.sin(c.a), z = RB.z + c.rz * Math.cos(c.a);
        const nx = RB.x + c.rx * Math.sin(c.a - 0.05), nz = RB.z + c.rz * Math.cos(c.a - 0.05);
        c.m.position.set(x, 0, z);
        c.m.rotation.y = Math.atan2(nx - x, nz - z);
      }
    });
  }

  // The rest of the neighbourhood: blocks of shophouses and apartment
  // buildings in every direction, side streets, and road signs.
  buildSurroundings() {
    const s = this.scene;
    const cb = new CityBuilder(s, this.colliders, { nightGlow: 0.0 });
    const avoid = [
      { minX: -22, maxX: 22, minZ: -200, maxZ: 26 },
      { minX: -50, maxX: 50, minZ: -76, maxZ: -14 },
      { minX: -94, maxX: -6, minZ: -196, maxZ: -60 },
    ];
    district(cb, { minX: -230, maxX: 210, minZ: -330, maxZ: 140, avoid, block: [40, 54], street: 10, floors: [3, 6], tall: 0.15, tallFloors: [8, 14], shops: 0.6, trees: 0.5 });
    cb.ground('asphalt', 0, 80, 12, 120, 0.02, 4);
    cb.ground('asphalt', 0, -262, 12, 140, 0.02, 4);
    cb.ground('asphalt', 60, -6, 104, 8.4, 0.021, 4); cb.ground('asphalt', -60, -6, 104, 8.4, 0.021, 4);
    cb.ground('asphalt', 60, -114, 104, 8.4, 0.021, 4); cb.ground('asphalt', 60, -156, 104, 8.4, 0.021, 4);
    cb.ground('asphalt', -72, -45, 96, 10, 0.021, 4); cb.ground('asphalt', 72, -45, 96, 10, 0.021, 4);
    cb.finish();

    const GH = 'Girls’ High';
    signpost(s, { x: 6.9, z: 9.5, rotY: 0, entries: [{ text: GH, dir: 'up', dist: '110 m' }, { text: 'Yingxi Gate', dir: 'up', dist: '55 m' }] });
    signpost(s, { x: 6.9, z: -13, rotY: 0, entries: [{ text: 'Yingxi Gate', dir: 'up', dist: '20 m' }, { text: GH, dir: 'upleft', dist: '80 m' }] });
    signpost(s, { x: 6.9, z: -75, rotY: 0, entries: [{ text: GH, dir: 'upleft', dist: '17 m' }] });
    signpost(s, { x: -6.9, z: -84, rotY: 0, entries: [{ text: GH + ' · Main Gate', dir: 'left', dist: '8 m' }] });
    signpost(s, { x: 21, z: -40.5, rotY: -Math.PI / 2, entries: [{ text: GH, dir: 'upright', dist: '60 m' }] });
    signpost(s, { x: -21, z: -49.5, rotY: Math.PI / 2, entries: [{ text: GH, dir: 'upleft', dist: '50 m' }] });
    signpost(s, { x: 6.9, z: -120, rotY: Math.PI, entries: [{ text: GH + ' · Main Gate', dir: 'right', dist: '30 m' }] });
    signpost(s, { x: 18, z: -2, rotY: -Math.PI / 2, entries: [{ text: GH, dir: 'right', dist: '100 m' }] });
    signpost(s, { x: -18, z: -10, rotY: Math.PI / 2, entries: [{ text: GH, dir: 'left', dist: '100 m' }] });
    signpost(s, { x: 18, z: -29, rotY: 0.6, color: '#7a4a2a', entries: [{ text: 'Yingxi Gate (East Gate)', dir: 'upleft' }] });
  }

  // ---------- flow ----------
  enter() {
    this.player.setEye(1.55);
    this.player.place(...this.startPose);
    this.player.heightAt = (x, z) => (this.inside ? null : plazaHeight(x, z));
    this.objective('breakfast');
    this.zone({ minX: -20, maxX: 20, minZ: -40, maxZ: -30 }, () => { if (!this.hadBreakfast) this.objective('gate'); });
  }

  begin() { setTimeout(() => this.say(CH2.intro), 800); }

  async goInside() {
    if (this.inside) return;
    this.inside = true;
    this.player.enabled = false;
    await this.ui.fade(true);
    this.say(CH2.things.door, true);
    this.blockCollider.minX = 9999;
    this.colliders.push(...this.roomColliders);
    this.player.floorY = ROOM.y;
    this.player.place(ROOM.x + 3.6, ROOM.z + 4.2, Math.PI / 4);
    this.player.bounds = { minX: ROOM.x - 4.2, maxX: ROOM.x + 4.1, minZ: ROOM.z - 4.7, maxZ: ROOM.z + 4.7 };
    this.player.update(0);
    this.audio.setScene({ bugs: 0, traffic: 0.1, birds: true });
    this.targets.classroom = [this.seat.x, this.seat.z, ROOM.y];
    this.objective('classroom');
    await this.ui.fade(false);
    this.player.enabled = true;
  }

  setBoardDays(days) {
    if (days === this.boardDays) return;
    this.boardDays = days;
    const map = this.board.material.map, c = map.image;
    this.drawBoard(c.getContext('2d'), c.width, c.height, days);
    map.needsUpdate = true;
  }

  // Ending: a first-person cutscene. Sit down, the bell, then the days blur
  // past the window (morning to golden afternoon) as the countdown runs out.
  async sitDown(glowSeat) {
    glowSeat.visible = false;
    const cam = this.camera.position;
    const Y = ROOM.y, sx = this.seat.x, sz = this.seat.z;
    const seated = [sx, Y + 1.15, sz];
    const boardLook = [ROOM.x, Y + 1.7, ROOM.z - 5];
    const windowLook = [-20, Y + 2.5, ROOM.z + 4];
    const L = CH2.cutscene;
    this.lapse = { from: 6.2, to: 14.6 };
    await this.playCutscene({
      keys: [
        { t: 0, pos: [cam.x, cam.y, cam.z], look: boardLook, stop: true },
        { t: 1.3, pos: seated, look: boardLook, stop: true },
        { t: 4.6, pos: seated, look: boardLook, stop: true },
        { t: 6.4, pos: seated, look: windowLook, stop: true },
        { t: 14.6, pos: seated, look: [-20, Y + 2.2, ROOM.z + 1], stop: true },
        { t: 16.4, pos: seated, look: boardLook, stop: true },
        { t: 20.5, pos: seated, look: [ROOM.x, Y + 1.65, ROOM.z - 5], stop: true },
      ],
      events: [
        { at: 0.3, fn: () => this.audio.bell() },
        { at: 1.8, fn: () => this.say([L[0]], true) },
        { at: 7.0, fn: () => this.say([L[1]], true) },
        { at: 10.6, fn: () => this.say([L[2]], true) },
        { at: 16.8, fn: () => this.say(CH2.end, true) },
        { at: 19.2, fn: () => this.ui.fade(true, 1300) },
      ],
    });
    this.lapse = null;
    this.complete();
  }

  tick(dt) {
    this.elapsed += dt;
    // time-lapse during the ending: sky, countdown, classmates leaving
    if (this.lapse && this.cut) {
      const k = Math.max(0, Math.min(1, (this.cut.t - this.lapse.from) / (this.lapse.to - this.lapse.from)));
      this.skyBlend('sunset', k);
      this.setBoardDays(Math.round(87 * (1 - k)));
      (this.classmates || []).forEach((p, i, arr) => { p.visible = i / arr.length >= k * 0.85; if (p.userData.corsage) p.userData.corsage.visible = k > 0.92; });
    }
    if (!this.lateHinted && this.elapsed > 150 && !this.inside) { this.lateHinted = true; this.say(CH2.lateHint); }
  }
}
