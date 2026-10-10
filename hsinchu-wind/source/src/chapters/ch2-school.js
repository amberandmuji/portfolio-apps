// Hsinchu Girls' Senior High, modeled after photos:
//   - the gate: a tall concrete monument (two forked slabs with a diamond
//     frame near the top, gold characters down the face), a guard house with
//     pink pilasters and a flat overhanging roof, a folded accordion gate, a
//     boom barrier, royal palms, red-brick paving
//   - the main building: four storeys of grey wall bays with paired windows
//     between salmon-pink brick pilasters, white floor bands, and a pink centre
//     tower with a pointed gable, an open round arch at the top, a banner, and
//     an entrance canopy on two red columns
//   - the front courtyard: pale paving painted with green and ochre curves,
//     round raised planters with sculpted pines on props
import * as THREE from 'three';
import {
  box, tbox, ground, mat, glow, sign, canvasTexture, fitText, tree, crowd, personMesh,
  hipRoof, blades, rand, pick, tex as kitTex, toon,
} from '../engine/kit.js';

export const BLD = { x0: -62, x1: -50, z0: -150, z1: -82.5, bay: 4.5, floors: 4, fh: 3.5 };
export const TOWER = { z0: -123, z1: -109.5, front: -48.8 };
export const ENTRANCE = { x: -47.4, z: (TOWER.z0 + TOWER.z1) / 2 };
const uniform = { student: true };

// A sculpted pine: curving trunk, flat layered "cloud" pads, wooden props.
export function pine(parent, x, z, s = 1) {
  const g = new THREE.Group();
  const trunkMat = mat('#6a5444');
  let px = 0, py = 0, pz = 0;
  const lean = rand(0, Math.PI * 2);
  for (let i = 0; i < 3; i++) {
    const len = 1.3 * s;
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * s * (1 - i * 0.2), 0.16 * s * (1 - i * 0.2), len, 7), trunkMat);
    const tilt = (i % 2 ? -1 : 1) * 0.35;
    seg.position.set(px + Math.cos(lean) * Math.sin(tilt) * len / 2, py + len / 2 * Math.cos(tilt), pz + Math.sin(lean) * Math.sin(tilt) * len / 2);
    seg.rotation.set(Math.sin(lean) * tilt, 0, -Math.cos(lean) * tilt);
    seg.castShadow = true; g.add(seg);
    px += Math.cos(lean) * Math.sin(tilt) * len; py += len * Math.cos(tilt); pz += Math.sin(lean) * Math.sin(tilt) * len;
  }
  const padMat = mat('#3f5e36'), padTop = mat('#557a42');
  const pads = [[px, py + 0.2, pz, 1.3], [px + 1.1 * s, py - 0.7 * s, pz + 0.3, 1.0], [px - 1.0 * s, py - 1.2 * s, pz - 0.4, 1.1], [px + 0.3, py - 2.0 * s, pz + 1.0 * s, 0.9], [px - 0.5, py + 0.9 * s, pz, 0.8]];
  pads.forEach(([x0, y0, z0, r]) => {
    const p = new THREE.Mesh(new THREE.SphereGeometry(r * s, 12, 8), padMat); p.scale.y = 0.32; p.position.set(x0, y0, z0); p.castShadow = true; g.add(p);
    const t = new THREE.Mesh(new THREE.SphereGeometry(r * s * 0.8, 12, 8), padTop); t.scale.y = 0.22; t.position.set(x0, y0 + 0.12 * s, z0); g.add(t);
  });
  [-1, 1].forEach((k) => { const prop = box(g, { w: 0.06, h: 2.2 * s, d: 0.06, x: k * 0.8 * s, color: '#9a7a52', shadow: false }); prop.rotation.z = -k * 0.35; });
  g.position.set(x, 0, z);
  parent.add(g);
  return g;
}

// Facade texture: grey wall with a pair of windows (one bay, one floor).
let facadeTex = null;
function bayTex() {
  if (facadeTex) return facadeTex;
  facadeTex = canvasTexture(256, 200, (g, w, h) => {
    g.fillStyle = '#e2e0dc'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 8) { g.fillStyle = 'rgba(0,0,0,0.035)'; g.fillRect(0, y, w, 1); }
    [0.12, 0.54].forEach((fx) => {
      const x = w * fx, y = h * 0.2, ww = w * 0.34, hh = h * 0.52;
      g.fillStyle = '#f8f8f6'; g.fillRect(x - 6, y - 6, ww + 12, hh + 12);
      g.fillStyle = '#3c4a5a'; g.fillRect(x, y, ww, hh);
      g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(x, y, ww, hh * 0.3);
      g.fillStyle = '#f8f8f6'; g.fillRect(x + ww / 2 - 3, y, 6, hh); g.fillRect(x, y + hh * 0.35, ww, 5);
      g.fillStyle = '#cfcac2'; g.fillRect(x - 10, y + hh + 6, ww + 20, 8);
    });
  });
  facadeTex.wrapS = facadeTex.wrapT = THREE.RepeatWrapping;
  return facadeTex;
}

export function buildSchool(ch, { ROOM }) {
  const s = ch.scene;
  const col = (minX, maxX, minZ, maxZ) => ch.colliders.push({ minX, maxX, minZ, maxZ });

  // ---------- perimeter wall with railings, gate gap at z -96…-88 ----------
  const wallX = -8.6;
  [[-74, -88], [-96, -190]].forEach(([z0, z1]) => {
    const len = z0 - z1, zc = (z0 + z1) / 2;
    tbox(s, { w: 0.4, h: 1.0, d: len, x: wallX, z: zc, color: '#e7e1d6', texName: 'tile' });
    const bars = [];
    for (let z = z0 - 0.3; z > z1; z -= 0.3) bars.push(z);
    const im = new THREE.InstancedMesh(new THREE.BoxGeometry(0.05, 1.0, 0.05), mat('#2b3a52'), bars.length);
    bars.forEach((z, i) => im.setMatrixAt(i, new THREE.Matrix4().makeTranslation(wallX, 1.5, z))); s.add(im);
    box(s, { w: 0.08, h: 0.08, d: len, x: wallX, y: 2.0, z: zc, color: '#2b3a52' });
    col(wallX - 0.3, wallX + 0.3, z1, z0);
  });
  // red-brick paving at the entrance
  ground(s, { w: 2.6, d: 22, x: -7.3, z: -91, y: 0.06, color: '#c87a62', texName: 'brick', scale: 1 });
  ground(s, { w: 16, d: 17, x: -16.6, z: -92, y: 0.06, color: '#c87a62', texName: 'brick', scale: 1 });

  // ---------- the gate monument ----------
  const mx = -10.3, mz = -86.4;
  const concrete = mat('#bdb8ae', { map: kitTex('concrete') });
  const slab1 = box(s, { w: 1.3, h: 10.5, d: 1.1, x: mx, z: mz, material: concrete });
  const slab2 = box(s, { w: 0.9, h: 11.6, d: 0.9, x: mx, z: mz + 1.0, material: concrete });
  slab2.rotation.x = 0.06;
  box(s, { w: 1.4, h: 0.5, d: 2.4, x: mx, y: 9.4, z: mz + 0.5, material: concrete });
  // diamond frame between the prongs
  const df = new THREE.Group();
  [[0, 0.55, 1.2, 0.12], [0, -0.55, 1.2, 0.12], [0.55, 0, 0.12, 1.2], [-0.55, 0, 0.12, 1.2]].forEach(([y, z, dz, hy]) => box(df, { w: 0.25, h: hy, d: dz, y: y - hy / 2, z, material: concrete }));
  box(df, { w: 0.3, h: 0.4, d: 0.4, y: -0.2, color: '#3a3a3a' });
  df.rotation.x = Math.PI / 4; df.position.set(mx + 0.2, 8.2, mz + 0.5); s.add(df);
  // gold characters down the street-facing side, bronze English plaque below
  ['新', '竹', '女', '中'].forEach((c, i) => sign(s, {
    w: 0.75, h: 0.75, x: mx + 0.67, y: 6.6 - i * 0.9, z: mz, rotY: Math.PI / 2, emissive: 0.35, px: 128,
    draw: (g, w, h) => { g.clearRect(0, 0, w, h); fitText(g, c, w / 2, h / 2, w * 0.95, h * 0.9, '700 {s}px "Noto Sans TC", serif', '#d8a83a'); },
  }).material.transparent = true);
  sign(s, {
    w: 0.95, h: 0.42, x: mx + 0.66, y: 1.7, z: mz, rotY: Math.PI / 2, emissive: 0.2, px: 96,
    draw: (g, w, h) => { g.fillStyle = '#6a4a2a'; g.fillRect(0, 0, w, h); fitText(g, 'Hsinchu Girls’ Senior High', w / 2, h / 2, w * 0.9, h * 0.32, '600 {s}px "IBM Plex Sans", Arial, sans-serif', '#f2d29a'); },
  });
  col(mx - 0.7, mx + 0.7, mz - 0.6, mz + 1.5);
  box(s, { w: 0.25, h: 0.9, d: 0.25, x: -8.4, z: -87.4, color: '#e8c22a' });     // yellow bollard

  // ---------- guard house ----------
  const gx = -13.2, gz = -99.6;
  tbox(s, { w: 3.4, h: 2.8, d: 3.6, x: gx, z: gz, color: '#f0ece4', texName: 'tile' });
  [[-1.7, -1.8], [1.7, -1.8], [-1.7, 1.8], [1.7, 1.8]].forEach(([dx, dz]) => tbox(s, { w: 0.4, h: 2.8, d: 0.4, x: gx + dx, z: gz + dz, color: '#d88a78', texName: 'brick', scale: 0.8 }));
  box(s, { w: 4.4, h: 0.25, d: 4.6, x: gx, y: 2.8, z: gz, color: '#b8b4ac' });
  const gw = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.1), glow('#fff2d6', 0.5)); gw.position.set(gx, 1.5, gz + 1.81); s.add(gw);
  const gw2 = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.1), glow('#fff2d6', 0.5)); gw2.position.set(gx + 1.71, 1.5, gz); gw2.rotation.y = Math.PI / 2; s.add(gw2);
  col(gx - 1.9, gx + 1.9, gz - 2, gz + 2);
  // folded accordion gate beside the opening
  const acc = new THREE.Group();
  for (let i = 0; i < 12; i++) { const b = box(acc, { w: 0.04, h: 1.7, d: 0.04, z: i * 0.13, color: '#8a9096', shadow: false }); b.rotation.x = i % 2 ? 0.45 : -0.45; }
  box(acc, { w: 0.06, h: 0.06, d: 1.6, y: 1.65, z: 0.75, color: '#8a9096', shadow: false });
  acc.position.set(wallX + 0.35, 0, -97.9); s.add(acc);
  // boom barrier (raised)
  box(s, { w: 0.35, h: 1.1, d: 0.35, x: -8.1, z: -96.4, color: '#e8e2d2' });
  const armTex = canvasTexture(256, 16, (g, w, h) => { for (let x = 0; x < w; x += 32) { g.fillStyle = (x / 32) % 2 ? '#d8262a' : '#ffffff'; g.fillRect(x, 0, 32, h); } });
  const arm = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.1, 0.08), mat('#ffffff', { map: armTex }));
  arm.geometry.translate(1.8, 0, 0); arm.position.set(-8.1, 1.05, -96.4); arm.rotation.y = -Math.PI / 2; arm.rotation.z = 1.25; s.add(arm);
  // royal palms behind the wall
  ch.palms = [[-15, -80], [-19.5, -77.5], [-24, -80.5], [-21, -103.5], [-27, -102]].map(([x, z]) => tree(s, { x, z, kind: 'palm', scale: 1.55, color: '#4a7a3a' }));
  ch.updaters.push((dt, t, gust) => ch.palms.forEach((c, i) => { c.rotation.z = Math.sin(t * 0.9 + i) * 0.04 * (0.5 + gust); }));
  ch.palms.forEach((_, i) => { const [x, z] = [[-15, -80], [-19.5, -77.5], [-24, -80.5], [-21, -103.5], [-27, -102]][i]; col(x - 0.3, x + 0.3, z - 0.3, z + 0.3); });

  // ---------- the main building ----------
  const { x0, x1, z0, z1, bay, floors, fh } = BLD;
  const H = floors * fh, bw = x1 - x0, bxc = (x0 + x1) / 2;
  const rz0 = ROOM.z - 4.5, rz1 = ROOM.z + 4.5;
  const part = (za, zb, y, hh) => tbox(s, { w: bw, h: hh, d: zb - za, x: bxc, y, z: (za + zb) / 2, color: '#e2e0dc', texName: 'tile' });
  part(z0, rz0, 0, H); part(rz1, z1, 0, H);
  part(rz0, rz1, 0, ROOM.y); part(rz0, rz1, ROOM.y + 3.5, H - ROOM.y - 3.5);
  ch.blockCollider = { minX: x0, maxX: x1, minZ: z0, maxZ: z1 };
  ch.colliders.push(ch.blockCollider);
  // facade planes (bays of paired windows), skipping the tower and the real classroom windows
  const facade = (za, zb, ya, yb) => {
    const t = bayTex().clone(); t.needsUpdate = true; t.repeat.set((zb - za) / bay, (yb - ya) / fh);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(zb - za, yb - ya), toon({ color: '#ffffff', map: t }));
    p.position.set(x1 + 0.02, (ya + yb) / 2, (za + zb) / 2); p.rotation.y = Math.PI / 2; s.add(p);
  };
  facade(z0, TOWER.z0, 0.6, H); facade(TOWER.z1, rz0, 0.6, H); facade(rz1, z1, 0.6, H);
  facade(rz0, rz1, 0.6, ROOM.y); facade(rz0, rz1, ROOM.y + 3.5, H);
  // pink brick pilasters at bay boundaries
  for (let z = z0; z <= z1 + 0.01; z += bay) {
    if (z > TOWER.z0 - 0.1 && z < TOWER.z1 + 0.1) continue;
    if (Math.abs(z - ROOM.z) < 0.5) continue;
    tbox(s, { w: 0.3, h: H + 0.6, d: 0.95, x: x1 + 0.15, z, color: '#d9907e', texName: 'brick', scale: 0.7 });
  }
  // white floor bands, base plinth, parapet
  for (let f = 1; f <= floors; f++) box(s, { w: 0.4, h: 0.22, d: z1 - z0, x: x1 + 0.1, y: f * fh - 0.11, z: (z0 + z1) / 2, color: '#f6f4ee' });
  box(s, { w: 0.35, h: 0.6, d: z1 - z0, x: x1 + 0.08, z: (z0 + z1) / 2, color: '#a8a49c' });
  box(s, { w: bw + 0.6, h: 0.7, d: z1 - z0 + 0.6, x: bxc, y: H, z: (z0 + z1) / 2, color: '#f2efe8' });

  // centre tower with pointed gable and open round arch
  const tw = TOWER.z1 - TOWER.z0, tH = H + 3;
  const shp = new THREE.Shape();
  shp.moveTo(-tw / 2, 0); shp.lineTo(tw / 2, 0); shp.lineTo(tw / 2, tH); shp.lineTo(0, tH + 3.6); shp.lineTo(-tw / 2, tH);
  const arch = new THREE.Path(); arch.moveTo(-2.1, tH - 1.2); arch.lineTo(2.1, tH - 1.2); arch.lineTo(2.1, tH + 0.6); arch.absarc(0, tH + 0.6, 2.1, 0, Math.PI, false); arch.lineTo(-2.1, tH - 1.2);
  shp.holes.push(arch);
  const tgeo = new THREE.ExtrudeGeometry(shp, { depth: 1.4, bevelEnabled: false, curveSegments: 24 });
  const tuv = tgeo.attributes.uv; for (let i = 0; i < tuv.count; i++) tuv.setXY(i, tuv.getX(i) / 1.4, tuv.getY(i) / 1.4);
  const towerM = new THREE.Mesh(tgeo, toon({ color: '#e0a090', map: kitTex('brick') }));
  towerM.rotation.y = Math.PI / 2; towerM.position.set(x1 - 0.2, 0, (TOWER.z0 + TOWER.z1) / 2); towerM.castShadow = true; s.add(towerM);
  col(x1, TOWER.front, TOWER.z0, TOWER.z1);
  const tcz = (TOWER.z0 + TOWER.z1) / 2, tfx = x1 + 1.22;
  // white trim: tower edges, gable slopes, finial
  [-1, 1].forEach((sd) => {
    box(s, { w: 0.2, h: tH, d: 0.25, x: tfx, z: tcz + sd * (tw / 2 - 0.12), color: '#f6f4ee' });
    const sl = box(s, { w: 0.22, h: 0.3, d: Math.hypot(tw / 2, 3.6) + 0.3, x: tfx, y: tH + 1.65, z: tcz + sd * tw / 4, color: '#f6f4ee' });
    sl.rotation.x = sd * Math.atan2(3.6, tw / 2);
  });
  box(s, { w: 0.15, h: 1.2, d: 0.15, x: tfx - 0.6, y: tH + 3.6, z: tcz, color: '#f6f4ee' });
  // arch outline
  const archRing = new THREE.Mesh(new THREE.TorusGeometry(2.15, 0.12, 8, 24, Math.PI), mat('#f6f4ee'));
  archRing.rotation.y = Math.PI / 2; archRing.position.set(tfx, tH + 0.6, tcz); s.add(archRing);
  // banner (abstract, colourful)
  sign(s, {
    w: 6.4, h: 7.2, x: tfx + 0.02, y: 8.8, z: tcz, rotY: Math.PI / 2, emissive: 0.15,
    draw: (g, w, h) => {
      const cols = ['#e85a7a', '#2c8ad8', '#f2c230', '#2c9a5b', '#8a4ad8', '#f08a2a'];
      for (let i = 0; i < 9; i++) { g.fillStyle = cols[i % cols.length]; g.fillRect(rand(0, w * 0.8), rand(0, h * 0.8), rand(w * 0.2, w * 0.5), rand(h * 0.1, h * 0.3)); }
      g.lineWidth = w * 0.04; g.strokeStyle = '#ffffff'; g.beginPath(); g.arc(w * 0.55, h * 0.48, w * 0.2, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = '#f2c230'; g.beginPath(); g.arc(w * 0.55, h * 0.48, w * 0.12, 0, Math.PI * 2); g.stroke();
      fitText(g, 'GIRLS’ HIGH', w / 2, h * 0.9, w * 0.8, h * 0.07, '700 {s}px "IBM Plex Sans", Arial, sans-serif', '#ffffff');
    },
  });
  const clock = new THREE.Mesh(new THREE.CircleGeometry(0.6, 24), mat('#f6f4ee')); clock.position.set(tfx + 0.03, 13.4, tcz); clock.rotation.y = Math.PI / 2; s.add(clock);
  // entrance: dark doors, canopy slab on two red columns
  const doors = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 3.0), mat('#2a2e34')); doors.position.set(tfx + 0.02, 1.5, tcz); doors.rotation.y = Math.PI / 2; s.add(doors);
  box(s, { w: 4.0, h: 0.6, d: 8.6, x: tfx + 2.0, y: 3.4, z: tcz, color: '#f2efe8' });
  sign(s, {
    w: 8.2, h: 0.45, x: tfx + 4.02, y: 3.63, z: tcz, rotY: Math.PI / 2, emissive: 0.1, px: 64,
    draw: (g, w, h) => { g.fillStyle = '#f2efe8'; g.fillRect(0, 0, w, h); fitText(g, 'STUDY  ·  DILIGENCE  ·  INTEGRITY  ·  ACTION', w / 2, h / 2, w * 0.9, h * 0.55, '600 {s}px "IBM Plex Sans", Arial, sans-serif', '#7a2a24'); },
  });
  [-3.6, 3.6].forEach((dz) => {
    box(s, { w: 0.45, h: 3.4, d: 0.45, x: tfx + 3.6, z: tcz + dz, color: '#c8302a' });
    col(tfx + 3.35, tfx + 3.85, tcz + dz - 0.25, tcz + dz + 0.25);
  });
  ch.zone({ minX: tfx + 0.05, maxX: tfx + 2.4, minZ: tcz - 2.2, maxZ: tcz + 2.2 }, () => ch.goInside());

  // ---------- front courtyard ----------
  const court = canvasTexture(1024, 1024, (g, w, h) => {
    g.fillStyle = '#e6e2da'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 4000; i++) { const v = Math.floor(rand(200, 235)); g.fillStyle = `rgba(${v},${v},${v - 6},0.4)`; g.fillRect(rand(0, w), rand(0, h), 2, 2); }
    g.lineCap = 'round';
    g.strokeStyle = '#bfe0c8'; g.lineWidth = 70; g.beginPath(); g.ellipse(w * 0.15, h * 0.5, w * 0.55, h * 0.6, 0, -0.9, 0.9); g.stroke();
    g.strokeStyle = '#e9b97a'; g.lineWidth = 40; g.beginPath(); g.ellipse(w * 0.15, h * 0.5, w * 0.68, h * 0.7, 0, -0.75, 0.75); g.stroke();
    g.strokeStyle = '#bfe0c8'; g.lineWidth = 50; g.beginPath(); g.ellipse(w * 1.05, h * 0.5, w * 0.3, h * 0.45, 0, Math.PI - 0.8, Math.PI + 0.8); g.stroke();
  });
  const cgeo = new THREE.PlaneGeometry(36, 38);
  const cm = new THREE.Mesh(cgeo, toon({ color: '#ffffff', map: court }));
  cm.rotation.x = -Math.PI / 2; cm.rotation.z = Math.PI / 2; cm.position.set(-30.6, 0.06, -114); cm.receiveShadow = true; s.add(cm);
  // raised round planters with sculpted pines
  [[-37, -105.5], [-37, -127]].forEach(([px, pz]) => {
    const curb = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.55, 40, 1, true), mat('#efece6', { side: THREE.DoubleSide }));
    curb.scale.set(6, 1, 3.6); curb.position.set(px, 0.28, pz); s.add(curb);
    const top = new THREE.Mesh(new THREE.CircleGeometry(1, 40), mat('#6f9a4a', { map: kitTex('grass') }));
    top.scale.set(5.9, 3.5, 1); top.rotation.x = -Math.PI / 2; top.position.set(px, 0.5, pz); s.add(top);
    pine(s, px - 2.2, pz + 0.4, 1.0); pine(s, px + 2.0, pz - 0.3, 0.85);
    const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 1), mat('#8a8478')); rock.scale.y = 0.7; rock.position.set(px + 0.3, 0.7, pz + 1.2); s.add(rock);
    col(px - 6, px + 6, pz - 3.4, pz + 3.4);
  });
  pine(s, -20, -96, 1.1); pine(s, -16, -132, 1.0); pine(s, -45, -97, 0.9);

  // lawns elsewhere on campus (wind-blown grass)
  ground(s, { w: 82, d: 116, x: -49.5, z: -132, y: 0.03, color: '#8fb05a', texName: 'grass', scale: 3 });
  blades(s, {
    areas: [{ minX: -89, maxX: -10, minZ: -189, maxZ: -75 }],
    exclude: [
      { minX: -49, maxX: -11, minZ: -134, maxZ: -83 }, { minX: -63, maxX: -47, minZ: -151, maxZ: -81 },
      { minX: -35, maxX: -17, minZ: -146, maxZ: -134 },
    ],
    spacing: ch.quality === 'low' ? 1.0 : 0.5, uniforms: ch.wind, height: 0.42, colors: ['#5f8f3a', '#a8c45e'], radius: 0.07,
  });

  // noticeboard
  tbox(s, { w: 0.2, h: 1.8, d: 3, x: -26, y: 0.4, z: -98, color: '#5a4636', texName: 'concrete' });
  sign(s, {
    w: 2.8, h: 1.5, x: -25.88, y: 1.35, z: -98, rotY: Math.PI / 2, emissive: 0.2,
    draw: (g, w, h) => {
      g.fillStyle = '#7a8a5a'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 7; i++) { g.fillStyle = pick(['#fff', '#fdf3c8', '#fde0e0', '#e0f0ff']); g.save(); g.translate(rand(20, w - 120), rand(15, h - 100)); g.rotate(rand(-0.06, 0.06)); g.fillRect(0, 0, rand(80, 140), rand(60, 110)); g.restore(); }
      fitText(g, 'MOCK EXAM RANKINGS', w / 2, 22, w * 0.8, 20, '600 {s}px "IBM Plex Sans", sans-serif', '#222');
    },
  });
  col(-26.2, -25.8, -99.5, -96.5);
  ch.thing('noticeboard', -24.4, -98, 2.4, 'Read the noticeboard', { view: { move: [-24.6, -98], look: [-25.88, 1.35, -98], hold: 4 } });

  // the old lecture hall (Japanese-era): brick walls, tall windows, grey hip roof
  const hx = -26, hz = -142;
  tbox(s, { w: 16, h: 5, d: 10, x: hx, z: hz, color: '#d9b8a4', texName: 'brick', scale: 0.9 });
  for (let k = -6; k <= 6; k += 2.4) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 2.6), mat('#3d4a52'));
    w.position.set(hx + k, 2.6, hz + 5.02); s.add(w);
    box(s, { w: 1.3, h: 0.12, d: 0.2, x: hx + k, y: 3.95, z: hz + 5.05, color: '#efe8dc' });
  }
  hipRoof(s, { w: 16, d: 10, h: 3.4, x: hx, y: 5, z: hz, color: '#55585a', overhang: 0.9 });
  col(hx - 8, hx + 8, hz - 5, hz + 5);
  ch.thing('hall', hx, hz + 7, 4, 'Look at the old lecture hall', { view: { look: [hx, 5.5, hz], hold: 4 } });

  // teacher on duty just inside the gate
  const teacher = personMesh({ top: '#5c6f8a', bottom: '#2b3040', longHair: false });
  teacher.position.set(-11, 0, -92.6); teacher.rotation.y = Math.PI / 2; s.add(teacher);

  // classmates walking in through the gate and across the courtyard
  const route = (x0, z0) => [[x0, z0], [-6, -14], [-24, -30], [-25, -45], [-24, -62], [-12, -78], [-7, -92], [-20, -92], [-34, -116], [ENTRANCE.x - 0.5, ENTRANCE.z]];
  ch.students = crowd(s, [
    ...[[4.5, 8], [-6.8, 2], [4.5, -4], [-6.8, 14], [4.5, -10]].map(([x, z], i) => ({ ...uniform, path: route(x, z), loop: false, vanish: true, speed: rand(1.1, 1.4), bag: true, delay: i })),
    { ...uniform, x: -22, z: -96, rotY: 2.4 }, { ...uniform, x: -21.2, z: -96.6, rotY: -0.8, bag: true },
    { ...uniform, x: -32, z: -120, rotY: 1.2 }, { ...uniform, x: -31.4, z: -119.2, rotY: -2.0 },
  ]);
  ch.updaters.push((dt, t) => ch.students.update(dt, t));
}
