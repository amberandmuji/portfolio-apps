// NYCU Guangfu campus details, from the library museum's "Fourteen Scenes of
// the Campus" (交大校園十四景):
//   緣慧潤生  abstract sculpture group on the library's front plaza
//   康莊迎曦  east–west boulevard lined with two rows of blackboard trees
//   荷塘月色  the small Bamboo Lake lotus pond in front of the EECS building, moon above
//   竹湖晨風  Bamboo Lake with willows and a view of the clock tower
//   竹園映亭  bamboo grove with a white-pebble path and Zhenwu Pavilion by running water
//   思園春曉  Si Garden: fountain with fish, sundial, stone benches
//   風亭九思  Jiu Si Pavilion
//   松林立翠  a planted grid of pines
//   玉樹向榮  a grove of 48 camphor trees west of the library
//   曲道夾蔭  the curving road north of the lake, under banyan and maple canopy
import * as THREE from 'three';
import { box, tbox, ground, mat, glow, sign, fitText, tree, tower, rand, pick, tex as kitTex, toon } from '../engine/kit.js';
import { CityBuilder } from '../engine/city.js';

const steel = () => new THREE.MeshPhongMaterial({ color: '#c9ced6', specular: '#ffffff', shininess: 110, emissive: '#1a1e26' });

function instanced(parent, geo, material, list) {
  const m = new THREE.InstancedMesh(geo, material, list.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  list.forEach(([x, y, z, sx = 1, sy = 1, sz = 1, ry = 0, rx = 0, rz = 0], i) => m.setMatrixAt(i, m4.compose(new THREE.Vector3(x, y, z), q.setFromEuler(e.set(rx, ry, rz)), new THREE.Vector3(sx, sy, sz))));
  m.castShadow = true; m.receiveShadow = true;
  parent.add(m);
  return m;
}

function pavilion(parent, { x, z, r = 2.6, roof = '#2f6a6a', posts = '#7a2a20', sides = 6, name }) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.4, r + 0.6, 0.45, sides), mat('#bdb6aa', { map: kitTex('pavers') })); base.position.y = 0.22; g.add(base);
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2;
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 2.8, 8), mat(posts)); p.position.set(Math.sin(a) * r, 1.85, Math.cos(a) * r); p.castShadow = true; g.add(p);
  }
  const rf = new THREE.Mesh(new THREE.ConeGeometry(r + 1.1, 1.7, sides), mat(roof)); rf.position.y = 4.05; rf.castShadow = true; g.add(rf);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), mat('#d8b04a')); tip.position.y = 5.0; g.add(tip);
  const bench = new THREE.Mesh(new THREE.CylinderGeometry(r - 0.4, r - 0.4, 0.08, sides, 1, true), mat('#8a6a4a', { side: THREE.DoubleSide })); bench.position.y = 0.9; g.add(bench);
  if (name) sign(g, { w: 1.4, h: 0.4, x: 0, y: 3.05, z: r + 0.05, emissive: 0.3, px: 64, draw: (c, w, h) => { c.fillStyle = '#3a2418'; c.fillRect(0, 0, w, h); fitText(c, name, w / 2, h / 2, w * 0.9, h * 0.6, '700 {s}px "IBM Plex Sans", Arial, sans-serif', '#e8c87a'); } });
  g.position.set(x, 0, z);
  parent.add(g);
  return g;
}

export function buildCampus(ch, { LAKE }) {
  const s = ch.scene;
  const col = (minX, maxX, minZ, maxZ) => ch.colliders.push({ minX, maxX, minZ, maxZ });

  // ---------- 緣慧潤生: sculpture group on the library plaza ----------
  const sx = -10.8;
  [[-35, 'ring'], [-42, 'ribbon'], [-49, 'wave']].forEach(([z, kind]) => {
    tbox(s, { w: 2.0, h: 0.6, d: 2.0, x: sx, z, color: '#6a6660', texName: 'concrete', scale: 1 });
    let m;
    if (kind === 'ring') { m = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.28, 16, 48), steel()); m.position.set(sx, 2.1, z); m.rotation.y = 0.6; }
    if (kind === 'ribbon') { m = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.18, 12, 48, Math.PI * 1.3), steel()); m.position.set(sx, 1.5, z); m.rotation.set(0.3, 1.2, 0.4); m.scale.set(1, 1.5, 1); }
    if (kind === 'wave') { m = new THREE.Mesh(new THREE.TorusKnotGeometry(0.75, 0.16, 96, 10, 2, 3), steel()); m.position.set(sx, 1.8, z); m.scale.set(1, 1.6, 1); }
    m.castShadow = true; s.add(m);
    col(sx - 1, sx + 1, z - 1, z + 1);
  });
  const spot = new THREE.PointLight('#dfe8ff', 14, 12, 1.4); spot.position.set(-8, 4, -42); s.add(spot);
  ch.thing('sculpture', -8.2, -42, 3.4, 'Look at the sculptures', { view: { look: [sx, 1.8, -42], hold: 4 } });

  // ---------- 康莊迎曦: the east–west boulevard of blackboard trees ----------
  const BZ = -22;
  ground(s, { w: 300, d: 7, x: 0, z: BZ, y: 0.022, color: '#6f7176', texName: 'asphalt', scale: 4 });
  [-1, 1].forEach((sd) => ground(s, { w: 300, d: 1.6, x: 0, z: BZ + sd * 4.3, y: 0.04, color: '#a9a39a', texName: 'pavers', scale: 1 }));
  const trunks = [], tiers = [];
  for (let x = -146; x <= 146; x += 9) {
    if (Math.abs(x) < 9) continue;
    [-1, 1].forEach((sd) => {
      const z = BZ + sd * 5.4;
      if (sd < 0 && x > -50 && x < -13) return;            // library frontage
      const h = rand(9, 11);
      trunks.push([x, h / 2, z, 1, h, 1]);
      for (let k = 0; k < 4; k++) { const r = 2.6 - k * 0.5; tiers.push([x, h * (0.45 + k * 0.17), z, r, 0.32, r, rand(0, 3)]); }
      col(x - 0.3, x + 0.3, z - 0.3, z + 0.3);
    });
  }
  instanced(s, new THREE.CylinderGeometry(0.22, 0.32, 1, 7), mat('#6a5a4a'), trunks);
  instanced(s, new THREE.SphereGeometry(1, 10, 6), mat('#2e4e2e'), tiers);
  ch.thing('boulevard', 0, BZ, 4, 'Look down the boulevard', { lines: ['The boulevard of blackboard trees. At dawn the sun comes up right at the end of it.'], view: { look: [-140, 4, BZ], hold: 4 } });

  // ---------- 荷塘月色: lotus pond and the EECS building, moon above ----------
  const LP = { x: -28, z: 5, rx: 10, rz: 5.5 };
  const pondEdge = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.4, 48), mat('#8a8478', { map: kitTex('concrete') }));
  pondEdge.scale.set(LP.rx + 0.6, 1, LP.rz + 0.6); pondEdge.position.set(LP.x, 0.15, LP.z); s.add(pondEdge);
  const pond = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshPhongMaterial({ color: '#0c1626', specular: '#8a9ac0', shininess: 120 }));
  pond.scale.set(LP.rx, LP.rz, 1); pond.rotation.x = -Math.PI / 2; pond.position.set(LP.x, 0.36, LP.z); s.add(pond);
  col(LP.x - LP.rx, LP.x + LP.rx, LP.z - LP.rz, LP.z + LP.rz);
  const pads = [], blooms = [];
  for (let i = 0; i < 70; i++) {
    const a = rand(0, Math.PI * 2), rr = Math.sqrt(rand(0, 0.9));
    const x = LP.x + Math.sin(a) * LP.rx * rr, z = LP.z + Math.cos(a) * LP.rz * rr;
    const r = rand(0.35, 0.7);
    pads.push([x, 0.4 + rand(0, 0.25), z, r, 1, r, rand(0, 6)]);
    if (Math.random() < 0.3) blooms.push([x + 0.1, 0.75 + rand(0, 0.3), z, 1, 1.2, 1]);
  }
  instanced(s, new THREE.CylinderGeometry(1, 1, 0.03, 12), mat('#3f6a34'), pads);
  instanced(s, new THREE.ConeGeometry(0.14, 0.28, 6, 1, true), glow('#f2a0c0', 0.45), blooms);
  // low garden lights around the pond so it reads at night
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const b = box(s, { w: 0.18, h: 0.6, d: 0.18, x: LP.x + Math.sin(a) * (LP.rx + 1.4), z: LP.z + Math.cos(a) * (LP.rz + 1.4), material: glow('#ffe2b0', 1.4), shadow: false });
    b.position.y = 0.3;
  }
  const pl = new THREE.PointLight('#ffe0b0', 22, 18, 1.4); pl.position.set(LP.x, 2.5, LP.z - 2); s.add(pl);
  tower(s, { x: -32, z: 17, w: 26, d: 8, h: 46, color: '#c9ccd2', litRatio: 0.45, nightGlow: 0.9, texName: 'concrete' });
  col(-45, -19, 13, 21);
  sign(s, { w: 12, h: 1.6, x: -32, y: 44, z: 12.9, rotY: Math.PI, emissive: 1.0, px: 96, draw: (c, w, h) => { c.fillStyle = '#20242b'; c.fillRect(0, 0, w, h); fitText(c, 'EECS BUILDING', w / 2, h / 2, w * 0.9, h * 0.55, '600 {s}px "IBM Plex Sans", Arial, sans-serif', '#dfe8ff'); } });
  const moon = new THREE.Mesh(new THREE.CircleGeometry(16, 32), new THREE.MeshBasicMaterial({ color: '#fff6e0', fog: false, toneMapped: false }));
  moon.position.set(-160, 230, 520); moon.lookAt(0, 0, 0); s.add(moon);
  const halo = new THREE.Mesh(new THREE.CircleGeometry(40, 32), new THREE.MeshBasicMaterial({ color: '#8a9ad8', transparent: true, opacity: 0.18, fog: false, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.position.copy(moon.position).multiplyScalar(1.01); halo.lookAt(0, 0, 0); s.add(halo);
  ch.updaters.push(() => { const p = ch.player.position; moon.position.set(p.x - 160, 230, p.z + 520); halo.position.set(p.x - 161.6, 232.3, p.z + 525.2); });
  ch.thing('lotus', LP.x + LP.rx + 1.2, LP.z - 1, 3, 'Crouch by the lotus pond', { view: { move: [LP.x + LP.rx + 1.0, LP.z - 1.5], look: [LP.x - 6, 4, LP.z + 14], eye: 0.8, hold: 4.5 } });

  // ---------- 竹湖晨風: willows around Bamboo Lake, the clock tower ----------
  ch.willows = [];
  const strands = [];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + 0.3;
    const x = LAKE.x + Math.sin(a) * (LAKE.rx + 3.2), z = LAKE.z + Math.cos(a) * (LAKE.rz + 3.2);
    if (Math.abs(x - (-7.5)) < 5 && Math.abs(z + 97) < 6) continue;   // keep the friends' lawn open
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.35, 4.2, 7), mat('#4a3e32')); trunk.position.y = 2.1; trunk.rotation.z = rand(-0.15, 0.15); g.add(trunk);
    const crown = new THREE.Mesh(new THREE.SphereGeometry(2.4, 12, 8), mat('#3e5e34')); crown.scale.y = 0.55; crown.position.y = 4.5; g.add(crown);
    for (let k = 0; k < 40; k++) { const aa = rand(0, Math.PI * 2), rr = rand(1.4, 2.6); strands.push([x + Math.sin(aa) * rr, 2.7 + rand(-0.3, 0.3), z + Math.cos(aa) * rr, 1, rand(0.8, 1.3), 1, aa]); }
    g.position.set(x, 0, z); s.add(g); ch.willows.push(crown);
    col(x - 0.4, x + 0.4, z - 0.4, z + 0.4);
  }
  const strandMesh = instanced(s, new THREE.BoxGeometry(0.05, 2.6, 0.18), mat('#5a7e3e'), strands);
  ch.updaters.push((dt, t, gust) => { strandMesh.rotation.z = Math.sin(t * 0.8) * 0.006 * (0.5 + gust); });
  // clock tower across the lake
  const ctx = -62, ctz = -118;
  tbox(s, { w: 3.6, h: 24, d: 3.6, x: ctx, z: ctz, color: '#e4e0d8', texName: 'concrete', scale: 2 });
  const roof = new THREE.Mesh(new THREE.ConeGeometry(3.0, 3, 4), mat('#5a5e64')); roof.rotation.y = Math.PI / 4; roof.position.set(ctx, 25.5, ctz); s.add(roof);
  [[0, 1.82, 0], [0, -1.82, Math.PI], [1.82, 0, Math.PI / 2], [-1.82, 0, -Math.PI / 2]].forEach(([dx, dz, ry]) => sign(s, {
    w: 2.2, h: 2.2, x: ctx + dx, y: 21, z: ctz + dz, rotY: ry, emissive: 1.1, px: 128,
    draw: (c, w, h) => { c.fillStyle = '#f8f4e8'; c.beginPath(); c.arc(w / 2, h / 2, w * 0.48, 0, Math.PI * 2); c.fill(); c.strokeStyle = '#2a2a2a'; c.lineWidth = 4; c.stroke(); c.lineWidth = 6; c.beginPath(); c.moveTo(w / 2, h / 2); c.lineTo(w / 2, h * 0.18); c.stroke(); c.lineWidth = 4; c.beginPath(); c.moveTo(w / 2, h / 2); c.lineTo(w * 0.72, h * 0.62); c.stroke(); for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; c.fillStyle = '#2a2a2a'; c.fillRect(w / 2 + Math.cos(a) * w * 0.4 - 2, h / 2 + Math.sin(a) * h * 0.4 - 2, 4, 4); } },
  }).material.transparent = true);
  col(ctx - 1.8, ctx + 1.8, ctz - 1.8, ctz + 1.8);
  ch.thing('clocktower', LAKE.x - LAKE.rx - 2, LAKE.z - 6, 6, 'Look at the clock tower', { lines: ['The clock tower across the lake. We used it to know when the library would close.'], view: { look: [ctx, 20, ctz], hold: 4 } });

  // ---------- 竹園映亭: bamboo grove, white pebble path, Zhenwu Pavilion by running water ----------
  const bx = -40, bz = -124;
  ground(s, { w: 1.6, d: 14, x: bx + 4.5, z: bz + 2, y: 0.05, color: '#f2efe6', texName: 'pavers', scale: 0.4 });
  const stream = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 16), new THREE.MeshPhongMaterial({ color: '#1a2a40', specular: '#9ab0d0', shininess: 120 }));
  stream.rotation.x = -Math.PI / 2; stream.position.set(bx - 4.5, 0.05, bz + 3); s.add(stream);
  const culms = [], leaves = [];
  for (let i = 0; i < 160; i++) {
    const cx = bx + rand(-12, 12), cz = bz + rand(-7, 7);
    if (Math.abs(cx - (bx + 4.5)) < 1.4 || Math.abs(cx - (bx - 4.5)) < 1 || Math.hypot(cx - (LAKE.x - 8), cz - (LAKE.z - LAKE.rz - 3.5)) < 4) continue;
    const h = rand(5, 9);
    culms.push([cx, h / 2, cz, 1, h, 1, 0, rand(-0.06, 0.06), rand(-0.06, 0.06)]);
    for (let k = 0; k < 3; k++) leaves.push([cx + rand(-0.6, 0.6), h * rand(0.6, 1.0), cz + rand(-0.6, 0.6), rand(0.5, 0.9), 0.25, rand(0.5, 0.9), rand(0, 3)]);
  }
  instanced(s, new THREE.CylinderGeometry(0.05, 0.06, 1, 6), mat('#7aa04a'), culms);
  const bambooLeaves = instanced(s, new THREE.SphereGeometry(1, 8, 5), mat('#5a8a3a'), leaves);
  ch.updaters.push((dt, t, gust) => { bambooLeaves.rotation.y = Math.sin(t * 0.7) * 0.004 * (0.5 + gust); });
  ch.thing('bamboo', bx + 4.5, bz + 8, 3, 'Walk the bamboo path', { lines: ['The bamboo grove by Zhenwu Pavilion. The wind sounds like rain in here.'], view: { look: [bx + 4.5, 3, bz - 6], hold: 4 } });

  // ---------- 思園春曉 Si Garden and 風亭九思 Jiu Si Pavilion ----------
  const gx = -28, gz = -70;
  ground(s, { w: 22, d: 16, x: gx, z: gz, y: 0.04, color: '#cfc8bb', texName: 'pavers', scale: 1 });
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.4, 0.6, 32), mat('#bdb6aa', { map: kitTex('concrete') })); basin.position.set(gx, 0.3, gz); s.add(basin);
  const fw = new THREE.Mesh(new THREE.CircleGeometry(3.0, 32), new THREE.MeshPhongMaterial({ color: '#1a3048', specular: '#cfe6ff', shininess: 100 })); fw.rotation.x = -Math.PI / 2; fw.position.set(gx, 0.62, gz); s.add(fw);
  const jet = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.12, 1, 8), new THREE.MeshBasicMaterial({ color: '#cfe8ff', transparent: true, opacity: 0.6 })); jet.position.set(gx, 1.2, gz); s.add(jet);
  const fish = [];
  for (let i = 0; i < 6; i++) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), mat(i % 2 ? '#f08a2a' : '#f4f0e8')); f.scale.set(1, 0.4, 2.2); s.add(f); fish.push(f); }
  ch.updaters.push((dt, t) => {
    jet.scale.y = 1 + 0.3 * Math.sin(t * 3); jet.position.y = 0.62 + jet.scale.y / 2;
    fish.forEach((f, i) => { const a = t * (0.3 + i * 0.05) + i; f.position.set(gx + Math.cos(a) * (1.2 + i * 0.25), 0.55, gz + Math.sin(a) * (1.2 + i * 0.25)); f.rotation.y = -a; });
  });
  col(gx - 3.4, gx + 3.4, gz - 3.4, gz + 3.4);
  // sundial on a pedestal, stone benches, flower beds
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 1.0, 12), mat('#bdb6aa')); ped.position.set(gx + 7, 0.5, gz - 3); s.add(ped);
  const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.08, 24), mat('#c8a46a')); dial.position.set(gx + 7, 1.04, gz - 3); s.add(dial);
  const gnomon = box(s, { w: 0.04, h: 0.5, d: 0.6, x: gx + 7, y: 1.08, z: gz - 3, color: '#8a6a3a' }); gnomon.rotation.x = 0.6;
  col(gx + 6.4, gx + 7.6, gz - 3.6, gz - 2.4);
  [[-7, 4], [-7, -4], [6, 5]].forEach(([dx, dz]) => { box(s, { w: 2.0, h: 0.45, d: 0.6, x: gx + dx, z: gz + dz, color: '#a8a296' }); col(gx + dx - 1, gx + dx + 1, gz + dz - 0.3, gz + dz + 0.3); });
  const flowers = [];
  for (let i = 0; i < 160; i++) flowers.push([gx + rand(-10, 10), 0.25, gz + (Math.random() < 0.5 ? -7 : 7) + rand(-0.8, 0.8), 1, 1, 1]);
  const fm = instanced(s, new THREE.SphereGeometry(0.12, 6, 4), mat('#ffffff'), flowers);
  const fc = new THREE.Color();
  for (let i = 0; i < flowers.length; i++) fm.setColorAt(i, fc.set(pick(['#f2a0c0', '#f4d24a', '#e86a3a', '#ffffff', '#c8a0f0'])));
  ch.thing('garden', gx + 5.6, gz - 3, 2.4, 'Read the sundial', { lines: ['Si Garden. The sundial is useless at midnight, but we always checked it anyway.'], view: { look: [gx + 7, 1.05, gz - 3], eye: 1.3, hold: 4 } });
  pavilion(s, { x: -45, z: -76, name: 'JIU SI PAVILION' });
  col(-48, -42, -79, -73);
  ch.thing('jiusi', -45, -71.5, 3, 'Sit in Jiu Si Pavilion', { lines: ['Jiu Si Pavilion. "Nine reflections." The name made more sense during finals.'], view: { move: [-45, -75], look: [-30, 2, -100], eye: 1.15, hold: 4.5 } });

  // ---------- 松林立翠 pine grid, 玉樹向榮 camphor grove, 曲道夾蔭 shaded road ----------
  const cones = [];
  for (let x = -98; x <= -64; x += 6) for (let z = -40; z <= -8; z += 6) {
    const h = rand(7, 9.5);
    cones.push([x, 1.2, z, 0.25, 2.4, 0.25]);
    [0, 1, 2].forEach((k) => cones.push([x, 2.4 + k * h * 0.22, z, 1.9 - k * 0.5, h * 0.3, 1.9 - k * 0.5, 0, 0, 0]));
    col(x - 0.3, x + 0.3, z - 0.3, z + 0.3);
  }
  instanced(s, new THREE.ConeGeometry(1, 1, 8), mat('#2c4a2e'), cones);
  ground(s, { w: 40, d: 38, x: -81, z: -24, y: 0.03, color: '#7a6a4a', texName: 'grass', scale: 3 });
  const cb = new CityBuilder(s, ch.colliders, { nightGlow: 1.0 });
  for (let i = 0; i < 8; i++) for (let j = 0; j < 6; j++) cb.tree(-96 + i * 5, -84 + j * 5, rand(1.1, 1.3), false);
  for (let x = -58; x <= -2; x += 5) { cb.tree(x, -131.5, rand(1.2, 1.5), true); cb.tree(x + 2.5, -140.5, rand(1.2, 1.5), true); }
  cb.finish();
  [-50, -36, -22, -9].forEach((x) => tree(s, { x, z: -141, scale: 0.9, color: '#a8442a' }));   // maples among the banyans
  ch.thing('camphor', -60, -71, 4, 'Look into the camphor grove', { lines: ['Forty-eight camphor trees. The air smells faintly of them after rain.'], view: { look: [-80, 3, -72], hold: 4 } });
}
