// Qianjia Station, modeled after photos of the real elevated station:
//   - white angular "hull" forms hanging under the platform edges, with pale
//     teal glass lanterns at their tips
//   - large blue characters 千甲車站 along the white fascia above the platforms
//   - silver roofs with steel trusses and a fringe of sunshade louvers
//   - side platforms with yellow tactile strips, benches, railings, green-band
//     station name boards with distances, LED departure boards
//   - a ticket hall under the tracks: glass front, ticket gates, ticket
//     machines, service window, departure board, escalator up
//   - a blue local train with sliding doors
import * as THREE from 'three';
import { box, tbox, ground, mat, glow, sign, fitText, scooter, streetLamp, rand } from '../engine/kit.js';

export const TRAIN_Z = -107.6;
export const DECK_Y = 9.2;
export const PLAT_Y = DECK_Y + 0.95;     // platform floor height
export const NEAR_PLAT_Z = -104.6;
const FAR_PLAT_Z = -113.4;
const LEN = 120;                          // station length along x

const white = () => mat('#f2f2ef');
const steel = () => mat('#9aa2aa');
const tealGlass = () => new THREE.MeshPhongMaterial({ color: '#a8eee4', emissive: '#5ac8b8', emissiveIntensity: 0.55, transparent: true, opacity: 0.78, shininess: 90 });

function instanced(parent, geo, material, list) {
  const m = new THREE.InstancedMesh(geo, material, list.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  list.forEach(([x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1], i) => {
    m4.compose(new THREE.Vector3(x, y, z), q.setFromEuler(e.set(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
    m.setMatrixAt(i, m4);
  });
  m.castShadow = true; m.receiveShadow = true;
  parent.add(m);
  return m;
}

// TRA-style name board: white, big black name, green distance band.
function nameBoard(parent, { x, y, z, rotY = 0 }) {
  return sign(parent, {
    w: 3.2, h: 1.5, x, y, z, rotY, emissive: 0.6, double: true, px: 256,
    draw: (g, w, h) => {
      g.fillStyle = '#f6f6f2'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#c9ccd0'; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6);
      fitText(g, '千   甲', w * 0.5, h * 0.22, w * 0.5, Math.floor(h * 0.3), '700 {s}px "Noto Sans TC", "PingFang TC", sans-serif', '#111');
      fitText(g, 'Qianjia', w * 0.5, h * 0.44, w * 0.4, Math.floor(h * 0.13), '500 {s}px "IBM Plex Sans", Arial, sans-serif', '#111');
      g.fillStyle = '#ffffff'; g.fillRect(w * 0.8, h * 0.08, w * 0.15, h * 0.3); g.strokeStyle = '#555'; g.lineWidth = 2; g.strokeRect(w * 0.8, h * 0.08, w * 0.15, h * 0.3);
      fitText(g, 'Hsinchu City', w * 0.875, h * 0.17, w * 0.13, Math.floor(h * 0.06), '500 {s}px "IBM Plex Sans", Arial, sans-serif', '#333');
      fitText(g, 'East Dist.', w * 0.875, h * 0.29, w * 0.13, Math.floor(h * 0.06), '500 {s}px "IBM Plex Sans", Arial, sans-serif', '#333');
      // green band with distances
      g.fillStyle = '#2f9a3e'; g.fillRect(0, h * 0.56, w, h * 0.17);
      g.fillStyle = '#ffffff'; g.textBaseline = 'middle';
      g.font = `700 ${h * 0.1}px "IBM Plex Sans", Arial, sans-serif`;
      g.textAlign = 'left'; g.fillText('◀ 2.2 km', w * 0.04, h * 0.645);
      g.textAlign = 'right'; g.fillText('3.0 km ▶', w * 0.96, h * 0.645);
      g.fillStyle = '#111';
      g.font = `700 ${h * 0.1}px "Noto Sans TC", sans-serif`;
      g.textAlign = 'left'; g.fillText('北新竹', w * 0.04, h * 0.84);
      g.textAlign = 'right'; g.fillText('新莊', w * 0.96, h * 0.84);
      g.font = `500 ${h * 0.06}px "IBM Plex Sans", Arial, sans-serif`;
      g.textAlign = 'left'; g.fillText('North Hsinchu', w * 0.27, h * 0.86);
      g.textAlign = 'right'; g.fillText('Xinzhuang', w * 0.73, h * 0.86);
    },
  });
}

// LED departure board: black, amber/green/red dot-matrix style text.
export function ledBoard(parent, { x, y, z, rotY = 0, w = 2.6, h = 0.62 }) {
  box(parent, { w: rotY ? 0.14 : w + 0.1, h: h + 0.1, d: rotY ? w + 0.1 : 0.14, x, y: y - (h + 0.1) / 2, z, color: '#1a1c20' });
  return sign(parent, {
    w, h, x: x + (rotY ? Math.sign(Math.sin(rotY)) * 0.08 : 0), y, z: z + (rotY ? 0 : 0.08), rotY, emissive: 1.4, px: 128,
    draw: (g, W, Hh) => {
      g.fillStyle = '#060606'; g.fillRect(0, 0, W, Hh);
      g.textBaseline = 'middle';
      const row = (y0, cols) => cols.forEach(([t, xx, c, align = 'left']) => { g.fillStyle = c; g.textAlign = align; g.fillText(t, W * xx, Hh * y0); });
      g.font = `600 ${Hh * 0.26}px "IBM Plex Mono", monospace`;
      row(0.3, [['Local', 0.03, '#ff9a2a'], ['Neiwan', 0.3, '#ffd23a'], ['18:42', 0.68, '#5aff7a'], ['1', 0.95, '#ff5a3a', 'right']]);
      row(0.74, [['Local', 0.03, '#ff9a2a'], ['Hsinchu', 0.3, '#ffd23a'], ['18:51', 0.68, '#5aff7a'], ['2', 0.95, '#ff5a3a', 'right']]);
    },
  });
}

export function buildStation(ch) {
  const s = ch.scene;
  const col = (minX, maxX, minZ, maxZ) => ch.colliders.push({ minX, maxX, minZ, maxZ });

  // ---------- viaduct, piers, tracks, overhead line ----------
  tbox(s, { w: 640, h: 1.2, d: 11, x: 0, y: 8, z: -109, color: '#d7d4cc', texName: 'concrete', scale: 4 });
  tbox(s, { w: 640, h: 0.9, d: 0.3, x: 0, y: DECK_Y, z: -103.65, color: '#cbc8c0', texName: 'concrete', scale: 4 });
  tbox(s, { w: 640, h: 0.9, d: 0.3, x: 0, y: DECK_Y, z: -114.35, color: '#cbc8c0', texName: 'concrete', scale: 4 });
  for (let x = -312; x <= 312; x += 24) {
    if (Math.abs(x) < 70) continue;
    tbox(s, { w: 2, h: 8, d: 3.4, x, z: -109, color: '#cfcbc2', texName: 'concrete', scale: 3 });
    col(x - 1, x + 1, -110.7, -107.3);
  }
  // ballast, sleepers, rails
  [TRAIN_Z, -110.4].forEach((tz) => {
    box(s, { w: 640, h: 0.08, d: 2.6, x: 0, y: DECK_Y, z: tz, color: '#8a857c', shadow: false });
    const sleepers = [];
    for (let x = -320; x <= 320; x += 0.65) sleepers.push([x, DECK_Y + 0.1, tz]);
    instanced(s, new THREE.BoxGeometry(0.22, 0.08, 2.3), mat('#7a746a'), sleepers);
    [-0.75, 0.75].forEach((dz) => box(s, { w: 640, h: 0.12, d: 0.08, x: 0, y: DECK_Y + 0.14, z: tz + dz, color: '#6d6a66', shadow: false }));
  });
  for (let x = -300; x <= 300; x += 50) {
    box(s, { w: 0.25, h: 6.5, d: 0.25, x, y: DECK_Y, z: -109, color: '#8e9396' });
    box(s, { w: 0.15, h: 0.15, d: 6, x, y: DECK_Y + 6, z: -109, color: '#8e9396' });
  }
  const wire = new THREE.LineBasicMaterial({ color: '#2a2a2e' });
  [TRAIN_Z, -110.4].forEach((z) => s.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-320, DECK_Y + 5.6, z), new THREE.Vector3(320, DECK_Y + 5.6, z)]), wire)));

  // station piers: chunky white columns with flared tops, both sides of the hall
  for (let x = -55; x <= 55; x += 22) {
    if (Math.abs(x) < 16) continue;
    tbox(s, { w: 2.2, h: 8, d: 4, x, z: -109, color: '#eceae4', texName: 'concrete', scale: 3 });
    col(x - 1.1, x + 1.1, -111, -107);
  }

  // ---------- the white hull forms and teal lanterns under the platforms ----------
  const hullShape = new THREE.Shape();
  hullShape.moveTo(0, 0); hullShape.lineTo(2.6, 0); hullShape.lineTo(1.7, -2.2); hullShape.lineTo(0.5, -3.2); hullShape.lineTo(0, -3.2); hullShape.lineTo(0, 0);
  const hullGeo = new THREE.ExtrudeGeometry(hullShape, { depth: 8.4, bevelEnabled: false });
  hullGeo.translate(0, 0, -4.2);
  hullGeo.rotateY(Math.PI / 2);   // extrude along x; profile in (z, y)
  const lanternGeo = new THREE.CylinderGeometry(0.62, 0.48, 1.25, 6);
  const lanterns = [];
  [[-103.5, 1], [-114.5, -1]].forEach(([edgeZ, out]) => {
    for (let x = -LEN / 2 + 6; x <= LEN / 2 - 6; x += 12) {
      const h = new THREE.Mesh(hullGeo, white());
      h.position.set(x, DECK_Y + 1.05, edgeZ);
      h.scale.z = -out;             // rotateY maps the profile outward to -z; flip so it points away from the tracks
      h.castShadow = true; h.receiveShadow = true;
      s.add(h);
      lanterns.push([x, DECK_Y + 1.05 - 3.9, edgeZ + out * 0.6]);
      // the steel hanger for each lantern
      box(s, { w: 0.06, h: 0.6, d: 0.06, x, y: DECK_Y + 1.05 - 3.3, z: edgeZ + out * 0.6, color: '#7a8088', shadow: false });
    }
  });
  instanced(s, lanternGeo, tealGlass(), lanterns);
  // a glow under each lantern at dusk
  { const l = new THREE.PointLight('#8af0e0', 10, 24, 1.4); l.position.set(0, DECK_Y - 3.4, -102.2); s.add(l); }

  // ---------- platforms ----------
  [NEAR_PLAT_Z, FAR_PLAT_Z].forEach((pz, i) => {
    const out = i ? -1 : 1;                         // +1: outward is +z (toward the fields)
    tbox(s, { w: LEN, h: 0.95, d: 2.6, x: 0, y: DECK_Y, z: pz + out * 0.1, color: '#d6d2c8', texName: 'pavers', scale: 0.6 });
    // platform slab extending over the hull forms
    tbox(s, { w: LEN, h: 0.18, d: 2.2, x: 0, y: PLAT_Y - 0.18, z: pz + out * 2.4, color: '#e8e6e0', texName: 'concrete', scale: 2 });
    box(s, { w: LEN, h: 0.02, d: 0.06, x: 0, y: PLAT_Y, z: pz - out * 1.15, color: '#ffffff', shadow: false });              // white edge line
    box(s, { w: LEN, h: 0.02, d: 0.32, x: 0, y: PLAT_Y, z: pz - out * 0.85, material: mat('#f0c62a'), shadow: false });     // tactile strip
    // railing on the outer edge (posts instanced + rails)
    const posts = [];
    for (let x = -LEN / 2; x <= LEN / 2; x += 1.2) posts.push([x, PLAT_Y + 0.55, pz + out * 3.45]);
    instanced(s, new THREE.BoxGeometry(0.05, 1.1, 0.05), steel(), posts);
    [0.5, 1.1].forEach((y) => box(s, { w: LEN, h: 0.05, d: 0.05, x: 0, y: PLAT_Y + y - 0.025, z: pz + out * 3.45, color: '#b8c0c8', shadow: false }));
    // roof columns (inner row) with angled struts out to the roof edge
    for (let x = -LEN / 2 + 6; x <= LEN / 2 - 6; x += 12) {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 4.6, 12), white()); c.position.set(x, PLAT_Y + 2.3, pz + out * 0.6); c.castShadow = true; s.add(c);
      const strut = box(s, { w: 0.14, h: 0.14, d: 3.2, x, y: PLAT_Y + 3.9, z: pz + out * 2.0, color: '#b8c0c8' });
      strut.rotation.x = out * 0.35;
      ch.colliders.push({ minX: x - 0.2, maxX: x + 0.2, minZ: pz + out * 0.6 - 0.2, maxZ: pz + out * 0.6 + 0.2 });
    }
    // roof: silver panel rising outward, with trusses underneath and a louver fringe
    const roof = box(s, { w: LEN, h: 0.14, d: 5.4, x: 0, y: PLAT_Y + 4.55, z: pz + out * 1.6, color: '#c9ced4' });
    roof.rotation.x = -out * 0.1;
    const truss = [];
    for (let x = -LEN / 2; x <= LEN / 2; x += 3) truss.push([x, PLAT_Y + 4.3, pz + out * 1.6, 0, 0, 0]);
    instanced(s, new THREE.BoxGeometry(0.08, 0.35, 5.2), steel(), truss);
    box(s, { w: LEN, h: 0.12, d: 0.12, x: 0, y: PLAT_Y + 4.2, z: pz + out * 0.6, color: '#8a9298' });
    const fins = [];
    for (let x = -LEN / 2; x <= LEN / 2; x += 0.45) fins.push([x, PLAT_Y + 3.75, pz + out * 3.7, 0, 0, 0]);
    instanced(s, new THREE.BoxGeometry(0.06, 1.1, 0.45), mat('#d8dde2'), fins);
    // white fascia band along the outer roof edge
    const fascia = box(s, { w: LEN, h: 2.9, d: 0.15, x: 0, y: PLAT_Y + 3.55, z: pz + out * 4.35, color: '#f4f4f0' });
    fascia.rotation.x = out * 0.12;   // leans outward, like the real canopy edge
    // under-roof lights
    for (let x = -LEN / 2 + 3; x <= LEN / 2 - 3; x += 6) box(s, { w: 1.4, h: 0.05, d: 0.18, x, y: PLAT_Y + 4.08, z: pz + out * 0.2, material: glow('#f6fbff', 1.6), shadow: false });
    // benches
    for (let x = -36; x <= 36; x += 24) {
      box(s, { w: 2.4, h: 0.06, d: 0.5, x, y: PLAT_Y + 0.42, z: pz + out * 0.85, color: '#2c6ab8' });
      box(s, { w: 2.4, h: 0.45, d: 0.06, x, y: PLAT_Y + 0.48, z: pz + out * 1.1, color: '#2c6ab8' });
      [-1, 1].forEach((k) => box(s, { w: 0.06, h: 0.42, d: 0.45, x: x + k * 1.1, y: PLAT_Y, z: pz + out * 0.85, color: '#8a9096' }));
    }
    // name boards hanging from the roof, LED boards, platform numbers
    [-30, 18].forEach((x) => nameBoard(s, { x, y: PLAT_Y + 3.0, z: pz + out * 0.2, rotY: 0 }));
    ledBoard(s, { x: -4, y: PLAT_Y + 3.4, z: pz + out * 0.2, rotY: Math.PI / 2 });
    sign(s, { w: 0.7, h: 0.7, x: 30, y: PLAT_Y + 3.2, z: pz + out * 0.2, emissive: 0.6, double: true, px: 64, draw: (g, w, h) => { g.fillStyle = '#1f4fa8'; g.fillRect(0, 0, w, h); fitText(g, i ? '2' : '1', w / 2, h / 2, w * 0.8, h * 0.75, '700 {s}px "IBM Plex Sans", Arial, sans-serif', '#fff'); } });
    // escalator / stair head: a glass box near the centre
    const glassMat = new THREE.MeshPhongMaterial({ color: '#cfe8f0', transparent: true, opacity: 0.25, shininess: 110, depthWrite: false });
    const gb = new THREE.Mesh(new THREE.BoxGeometry(6, 2.6, 1.6), glassMat); gb.position.set(-12, PLAT_Y + 1.3, pz + out * 0.9); s.add(gb);
    box(s, { w: 6, h: 0.1, d: 1.6, x: -12, y: PLAT_Y + 2.6, z: pz + out * 0.9, color: '#9aa2aa' });
    ch.colliders.push({ minX: -15, maxX: -9, minZ: pz + out * 0.9 - 0.8, maxZ: pz + out * 0.9 + 0.8 });
  });

  // ---------- big blue characters on the fascia (the station's signature) ----------
  const fasciaZ = NEAR_PLAT_Z + 4.45;
  ['千', '甲', '車', '站'].forEach((c, i) => sign(s, {
    w: 2.4, h: 2.4, x: -12 + i * 8, y: PLAT_Y + 5.0, z: fasciaZ + 0.12, emissive: 0.45, px: 256,
    draw: (g, w, h) => { g.clearRect(0, 0, w, h); fitText(g, c, w / 2, h * 0.54, w * 0.95, Math.floor(h * 0.92), '900 {s}px "Noto Sans TC", "PingFang TC", sans-serif', '#1f4fb4'); },
  }).material.transparent = true);
  sign(s, {
    w: 8, h: 0.7, x: 28, y: PLAT_Y + 5.0, z: fasciaZ + 0.12, emissive: 0.45, px: 96,
    draw: (g, w, h) => { g.clearRect(0, 0, w, h); fitText(g, 'Qianjia Station', w / 2, h / 2, w * 0.95, h * 0.8, '600 {s}px "IBM Plex Sans", Arial, sans-serif', '#1f4fb4'); },
  }).material.transparent = true;

  buildHall(ch);
}

// ---------- ticket hall under the tracks ----------
function buildHall(ch) {
  const s = ch.scene;
  const HX = 15, Z0 = -114.4, Z1 = -103.5, HH = 7.9;
  (ch.interiors = ch.interiors || []).push({ minX: -HX, maxX: HX, minZ: Z0, maxZ: Z1, exposure: 0.7 });
  const wall = (w, d, x, z, h = HH) => tbox(s, { w, h, d, x, z, color: '#f0eee8', texName: 'tile', scale: 1.5 });
  wall(0.3, Z1 - Z0, -HX, (Z0 + Z1) / 2); wall(0.3, Z1 - Z0, HX, (Z0 + Z1) / 2);
  wall(HX * 2, 0.3, 0, Z0);
  // front: solid sides, glass in the middle with a door
  wall(HX - 7, 0.3, -(HX + 7) / 2, Z1); wall(HX - 7, 0.3, (HX + 7) / 2, Z1);
  tbox(s, { w: 14, h: HH - 4.6, d: 0.3, x: 0, y: 4.6, z: Z1, color: '#f0eee8', texName: 'tile', scale: 1.5 });
  ch.colliders.push({ minX: -HX, maxX: HX, minZ: Z0, maxZ: Z1 + 0.2 });
  ground(s, { w: HX * 2, d: Z1 - Z0, x: 0, z: (Z0 + Z1) / 2, y: 0.03, color: '#d9d6d0', texName: 'pavers', scale: 1.2 });
  const glass = new THREE.MeshPhongMaterial({ color: '#d8ecf2', transparent: true, opacity: 0.18, shininess: 100, specular: '#ffffff', depthWrite: false });
  [[-7, -1.2], [1.2, 7]].forEach(([a, b]) => { const g = new THREE.Mesh(new THREE.BoxGeometry(b - a, 4.6, 0.06), glass); g.position.set((a + b) / 2, 2.3, Z1); s.add(g); });
  for (let k = -7; k <= 7; k += 1.4) box(s, { w: 0.08, h: 4.6, d: 0.1, x: k, z: Z1, color: '#b8bcc0', shadow: false });
  ch.hallDoors = [-1, 1].map((sd) => { const d = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.6, 0.05), glass); d.position.set(sd * 0.6, 1.3, Z1 + 0.05); s.add(d); return d; });
  // entrance canopy + exterior name (white wall, blue letters, as in the photos)
  box(s, { w: 18, h: 0.35, d: 2.6, x: 0, y: 5.0, z: Z1 + 1.1, color: '#e8eaec' });
  sign(s, {
    w: 9, h: 1.1, x: 0, y: 6.4, z: Z1 + 0.17, emissive: 0.7,
    draw: (g, w, h) => {
      g.fillStyle = '#f8f8f4'; g.fillRect(0, 0, w, h);
      fitText(g, '千甲車站', w * 0.32, h * 0.52, w * 0.5, Math.floor(h * 0.62), '900 {s}px "Noto Sans TC", sans-serif', '#1f4fb4');
      fitText(g, 'Qianjia Station', w * 0.76, h * 0.55, w * 0.4, Math.floor(h * 0.3), '600 {s}px "IBM Plex Sans", Arial, sans-serif', '#1f4fb4');
    },
  });
  const outside = new THREE.PointLight('#ffe9c4', 30, 18, 1.4); outside.position.set(0, 4.4, -101); s.add(outside);
  // interior lighting
  for (let x = -12; x <= 12; x += 4) for (const z of [-106, -110, -113]) box(s, { w: 1.6, h: 0.05, d: 0.5, x, y: HH - 0.1, z, material: glow('#f4f8ff', 1.5), shadow: false });
  const li = new THREE.PointLight('#f6f8ff', 14, 26, 1.2); li.position.set(0, 6, -108.5); s.add(li);
  box(s, { w: HX * 2, h: 0.1, d: Z1 - Z0, x: 0, y: HH - 0.05, z: (Z0 + Z1) / 2, color: '#e8e6e0', shadow: false });

  // ticket gates (stainless pedestals with glowing tops), lanes at x = -2.4 … 2.4
  for (const x of [-3, -1.8, -0.6, 0.6, 1.8, 3]) {
    box(s, { w: 0.24, h: 1.0, d: 1.5, x, z: -108.6, color: '#c2c8ce' });
    box(s, { w: 0.26, h: 0.04, d: 1.5, x, y: 1.0, z: -108.6, color: '#2a2e34' });
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.18), glow(x < 0 ? '#5aff8a' : '#5aff8a', 2)); lamp.position.set(x, 1.04, -108.0); s.add(lamp);
    const flap = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.5, 0.03), new THREE.MeshPhongMaterial({ color: '#ff8a8a', transparent: true, opacity: 0.35 })); flap.position.set(x + 0.28, 0.75, -108.6); s.add(flap);
  }
  // barrier fences either side of the gates
  [[-9, -3.2], [3.2, 9]].forEach(([a, b]) => { box(s, { w: b - a, h: 1.0, d: 0.06, x: (a + b) / 2, z: -108.6, color: '#b8c0c8' }); });
  ledBoard(s, { x: 0, y: 3.4, z: -108.7, w: 4.2, h: 0.8 });
  // ticket machines on the west side
  for (let i = 0; i < 3; i++) {
    const z = -105 - i * 1.1;
    box(s, { w: 0.7, h: 1.8, d: 0.95, x: -14.4, z, color: '#2c5aa8' });
    const sc = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.45), glow('#bfe6ff', 1.0)); sc.position.set(-14.04, 1.3, z); sc.rotation.y = Math.PI / 2; s.add(sc);
  }
  sign(s, { w: 3.3, h: 0.4, x: -14.2, y: 2.35, z: -106.1, rotY: Math.PI / 2, emissive: 0.7, px: 64, draw: (g, w, h) => { g.fillStyle = '#1f4fa8'; g.fillRect(0, 0, w, h); fitText(g, 'TICKETS · 售票', w / 2, h / 2, w * 0.9, h * 0.6, '700 {s}px "IBM Plex Sans", "Noto Sans TC", sans-serif', '#fff'); } });
  // service window on the east side
  box(s, { w: 0.2, h: 1.0, d: 3, x: 14.6, y: 1.0, z: -105.6, color: '#e8eaec' });
  const sw = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 1.0), glow('#fff2d6', 0.8)); sw.position.set(14.45, 1.6, -105.6); sw.rotation.y = -Math.PI / 2; s.add(sw);
  sign(s, { w: 2.6, h: 0.36, x: 14.4, y: 2.45, z: -105.6, rotY: -Math.PI / 2, emissive: 0.7, px: 64, draw: (g, w, h) => { g.fillStyle = '#2f9a3e'; g.fillRect(0, 0, w, h); fitText(g, 'SERVICE · 服務台', w / 2, h / 2, w * 0.9, h * 0.6, '700 {s}px "IBM Plex Sans", "Noto Sans TC", sans-serif', '#fff'); } });
  // escalators up to the platforms, at the back
  [-5, 5].forEach((x) => {
    const esc = box(s, { w: 1.4, h: 0.3, d: 5.5, x, y: 2.6, z: -112, color: '#5a6068' });
    esc.rotation.x = 0.55;
    [-0.7, 0.7].forEach((dx) => { const rail = box(s, { w: 0.08, h: 0.9, d: 5.5, x: x + dx, y: 3.0, z: -112, color: '#2a2e34' }); rail.rotation.x = 0.55; });
    sign(s, { w: 2.2, h: 0.36, x, y: 4.1, z: -109.4, emissive: 0.7, double: true, px: 64, draw: (g, w, h) => { g.fillStyle = '#1f4fa8'; g.fillRect(0, 0, w, h); fitText(g, x < 0 ? '↑ Platform 1 · Neiwan' : '↑ Platform 2 · Hsinchu', w / 2, h / 2, w * 0.92, h * 0.6, '700 {s}px "IBM Plex Sans", Arial, sans-serif', '#fff'); } });
  });
  // interior name on the back wall
  sign(s, {
    w: 7, h: 0.9, x: 0, y: 5.6, z: Z0 + 0.17, emissive: 0.6,
    draw: (g, w, h) => { g.fillStyle = '#f8f8f4'; g.fillRect(0, 0, w, h); fitText(g, '千甲車站  Qianjia Station', w / 2, h / 2, w * 0.92, h * 0.55, '700 {s}px "Noto Sans TC", "IBM Plex Sans", sans-serif', '#1f4fb4'); },
  });

  // parked scooters out front, lamps
  for (let i = 0; i < 22; i++) {
    const x = -21 + i * 0.95 + (i > 10 ? 4.5 : 0);
    if (Math.abs(x) < 3.5) continue;
    scooter(s, { x, z: -96.8, rotY: rand(-0.12, 0.12) });
  }
  ch.colliders.push({ minX: -22, maxX: -3.2, minZ: -97.8, maxZ: -95.8 }, { minX: 3.2, maxX: 22, minZ: -97.8, maxZ: -95.8 });
  streetLamp(s, { x: -10, z: -101, rotY: 0, light: false });
  streetLamp(s, { x: 10, z: -101, rotY: 0, light: false });
}

// ---------- the blue local train with sliding doors ----------
export function buildTrain(ch) {
  const g = new THREE.Group();
  const body = mat('#2348a6');
  const roof = mat('#b9bec4');
  const yellow = mat('#f2c12e');
  const whiteM = mat('#f4f4f0');
  const win = mat('#f6dcae', { emissive: new THREE.Color('#ffd89a'), emissiveIntensity: 0.55 });
  ch.doorLeaves = [];
  for (let i = 0; i < 4; i++) {
    const cx = (i - 1.5) * 20.4;
    box(g, { w: 20, h: 3.2, d: 3.1, x: cx, y: 0.5, material: body });
    box(g, { w: 20, h: 0.35, d: 2.9, x: cx, y: 3.7, material: roof });
    box(g, { w: 20.02, h: 0.12, d: 3.14, x: cx, y: 0.95, material: yellow });
    box(g, { w: 20.02, h: 0.08, d: 3.14, x: cx, y: 1.12, material: whiteM });
    box(g, { w: 19, h: 0.5, d: 2.6, x: cx, y: 0, color: '#2b2d30' });
    // window band between doors
    // windows: tinted panes with warm interior light, dark pillars between them
    [-8.2, 0, 8.2].forEach((wx) => {
      box(g, { w: 5.6, h: 1.0, d: 3.16, x: cx + wx, y: 1.9, material: win, shadow: false });
      [-2.8, -0.95, 0.95, 2.8].forEach((px) => box(g, { w: 0.16, h: 1.04, d: 3.18, x: cx + wx + px, y: 1.88, color: '#1a2a5a', shadow: false }));
      box(g, { w: 5.7, h: 0.06, d: 3.18, x: cx + wx, y: 2.9, color: '#1a2a5a', shadow: false });
    });
    // seats and passengers' silhouettes seen through the windows
    for (let k = -9; k <= 9; k += 1.6) if (Math.abs(k) > 6.5 || Math.abs(k) < 3.5) box(g, { w: 0.5, h: 0.5, d: 2.6, x: cx + k, y: 1.1, color: '#2a3a7a', shadow: false });
    // doors on both sides at cx ± 5.1 (platform side is +z)
    [-5.1, 5.1].forEach((dx) => {
      [-1, 1].forEach((side) => {
        const glowIn = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 2.2), glow('#ffeccc', 1.1));
        glowIn.position.set(cx + dx, 1.6, side * 1.56); glowIn.rotation.y = side > 0 ? 0 : Math.PI; g.add(glowIn);
        [-1, 1].forEach((leaf) => {
          const m = new THREE.Mesh(new THREE.BoxGeometry(0.66, 2.25, 0.04), mat('#c9ced4'));
          m.position.set(cx + dx + leaf * 0.33, 1.6, side * 1.585); g.add(m);
          const wpane = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.8), glow('#ffe9c0', 0.7));
          wpane.position.set(0, 0.35, side * 0.025); wpane.rotation.y = side > 0 ? 0 : Math.PI; m.add(wpane);
          if (side > 0) ch.doorLeaves.push({ m, base: cx + dx + leaf * 0.33, dir: leaf });
        });
      });
    });
  }
  // cab ends: dark windshield, headlights, yellow nose
  [-1, 1].forEach((sd) => {
    const nose = box(g, { w: 1.4, h: 3.1, d: 3.08, x: sd * 41.5, y: 0.5, material: body });
    nose.rotation.z = -sd * 0.18;
    const ws = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.1), mat('#15181c')); ws.position.set(sd * 42.35, 2.4, 0); ws.rotation.y = sd * Math.PI / 2; ws.rotation.x = 0; g.add(ws);
    box(g, { w: 0.1, h: 0.5, d: 3.0, x: sd * 42.15, y: 0.8, material: yellow });
    [-0.9, 0.9].forEach((lz) => { const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.22, 0.35), glow(sd > 0 ? '#fff6d8' : '#ff4030', 2.5)); lamp.position.set(sd * 42.25, 1.35, lz); g.add(lamp); });
  });
  box(g, { w: 2.4, h: 0.12, d: 1.6, x: -10, y: 4.1, color: '#333' });
  g.position.set(-10000, DECK_Y + 0.2, TRAIN_Z);
  ch.scene.add(g);
  ch.train = g;
  ch.trainHead = new THREE.SpotLight('#fff3d4', 40, 80, 0.4, 0.6);
  ch.scene.add(ch.trainHead, ch.trainHead.target);
}

export function setTrainDoors(ch, k) {
  ch.doorLeaves?.forEach((d) => { d.m.position.x = d.base + d.dir * k * 0.64; });
}
