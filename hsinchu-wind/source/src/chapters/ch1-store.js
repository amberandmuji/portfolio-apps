// The corner convenience store in chapter 1, stocked like a Taiwanese 7-Eleven
// (unbranded: no real logos or packaging). Walk-in, with:
//   - a floor-to-ceiling fridge wall of cartons, bottles and cans
//   - snack gondolas (chips, cup noodles, pineapple cakes, crackers, gummies)
//   - an open chiller with rice balls, sandwiches and bento
//   - the hot-food counter: tea eggs, oden, steamed buns, hot dog roller
//   - a roasted sweet potato warmer by the door
//   - a coffee bar with espresso machines and a menu board
//   - a ticket/print kiosk, ATM, window seats, parcel pickup shelf
import * as THREE from 'three';
import { box, tbox, ground, mat, glow, sign, canvasTexture, fitText, personMesh, scooter, rand, pick } from '../engine/kit.js';

const mod = (n, m) => ((n % m) + m) % m;
const X0 = 4.6, X1 = 15, Z0 = -33.5, Z1 = -22.5, ZC = (Z0 + Z1) / 2, H = 4.2;

// ---------------------------------------------------------------------------
// Product textures (generic designs with plain English labels)
// ---------------------------------------------------------------------------
function labelTex(bg, band, text, fg = '#ffffff', { w = 64, h = 128, vertical = false, dots = false } = {}) {
  return canvasTexture(w, h, (g, W, Hh) => {
    g.fillStyle = bg; g.fillRect(0, 0, W, Hh);
    if (dots) { g.fillStyle = 'rgba(255,255,255,0.25)'; for (let i = 0; i < 12; i++) { g.beginPath(); g.arc(rand(0, W), rand(0, Hh), rand(3, 9), 0, Math.PI * 2); g.fill(); } }
    g.fillStyle = band; g.fillRect(0, Hh * 0.42, W, Hh * 0.3);
    g.save();
    if (vertical) { g.translate(W / 2, Hh / 2); g.rotate(-Math.PI / 2); fitText(g, text, 0, 0, Hh * 0.9, W * 0.32, '700 {s}px "IBM Plex Sans", Arial, sans-serif', fg); }
    else fitText(g, text, W / 2, Hh * 0.57, W * 0.92, Hh * 0.14, '700 {s}px "IBM Plex Sans", Arial, sans-serif', fg);
    g.restore();
  });
}

const CARTONS = [
  { name: 'MILK TEA', bg: '#c89a6a', band: '#7a4a26' },
  { name: 'BLACK TEA', bg: '#b8312b', band: '#6a1410' },
  { name: 'GREEN TEA', bg: '#5aa04a', band: '#2f6a2a' },
  { name: 'SOY MILK', bg: '#efe2b8', band: '#b8902e', fg: '#5a3a10' },
  { name: 'CHOCO MILK', bg: '#6a3a22', band: '#f2d2a0', fg: '#4a2412' },
  { name: 'FRESH MILK', bg: '#e8eef6', band: '#2c5aa8' },
  { name: 'WINTER MELON', bg: '#c8822a', band: '#f4e0b0', fg: '#6a3a10' },
  { name: 'GUAVA', bg: '#e87a8a', band: '#5aa04a' },
  { name: 'ASPARAGUS', bg: '#b8d47a', band: '#3f7a2a' },
  { name: 'LEMON TEA', bg: '#f2d24a', band: '#3f8a3a' },
];
const BOTTLES = [
  { name: 'OOLONG', bg: '#c8a04a', band: '#6a4a10', r: 0.04, h: 0.24 },
  { name: 'SPORTS', bg: '#2f7ad8', band: '#ffffff', fg: '#1f4fa8', r: 0.04, h: 0.24 },
  { name: 'WATER', bg: '#cfe8f4', band: '#2c8ad8', r: 0.038, h: 0.25 },
  { name: 'YOGURT', bg: '#f4f2ee', band: '#d8302a', r: 0.03, h: 0.12 },
  { name: 'COFFEE', bg: '#3a2416', band: '#c8a46a', fg: '#2a1a0e', r: 0.033, h: 0.12 },
  { name: 'GRASS JELLY', bg: '#2a2622', band: '#7ac24a', r: 0.033, h: 0.12 },
  { name: 'LYCHEE SODA', bg: '#f4a6c2', band: '#ffffff', fg: '#b8306a', r: 0.033, h: 0.12 },
];
const SNACKS = [
  { name: 'CHIPS', bg: '#f2c230', band: '#c8302a', kind: 'bag' },
  { name: 'SHRIMP CRACKERS', bg: '#e86a3a', band: '#ffffff', fg: '#c8302a', kind: 'bag' },
  { name: 'SEAWEED', bg: '#2a4a2a', band: '#c8e86a', fg: '#1a2a1a', kind: 'bag' },
  { name: 'DRIED MANGO', bg: '#f29a2a', band: '#ffffff', fg: '#c86a10', kind: 'bag' },
  { name: 'GUMMIES', bg: '#a64ad8', band: '#f4e04a', fg: '#6a1a8a', kind: 'bag' },
  { name: 'PINEAPPLE CAKE', bg: '#f4d24a', band: '#c8302a', kind: 'box' },
  { name: 'WAFERS', bg: '#5a2a1a', band: '#f2c27a', fg: '#5a2a1a', kind: 'box' },
  { name: 'BEEF NOODLES', bg: '#c8302a', band: '#f4e0b0', fg: '#8a1a10', kind: 'cup' },
  { name: 'SPICY RAMEN', bg: '#f2a02a', band: '#2a2a2a', kind: 'cup' },
];

// Instanced products: one InstancedMesh per product type.
function stock(parent, geo, texture, transforms) {
  if (!transforms.length) return;
  const m = new THREE.InstancedMesh(geo, mat('#ffffff', { map: texture }), transforms.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  transforms.forEach(([x, y, z, ry = 0, s = 1], i) => {
    q.setFromEuler(e.set(0, ry, 0));
    m4.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(s, s, s));
    m.setMatrixAt(i, m4);
  });
  m.castShadow = false; m.receiveShadow = true;
  parent.add(m);
}

export function buildStore(ch) {
  const s = ch.scene;
  (ch.interiors = ch.interiors || []).push({ minX: X0, maxX: X1, minZ: Z0, maxZ: Z1, exposure: 0.62 });
  const col = (minX, maxX, minZ, maxZ) => ch.colliders.push({ minX, maxX, minZ, maxZ });

  // ---------- shell ----------
  const wall = (w, d, x, z) => { tbox(s, { w, h: H, d, x, z, color: '#efeee9', texName: 'tile' }); col(x - w / 2, x + w / 2, z - d / 2, z + d / 2); };
  wall(0.25, Z1 - Z0, X1, ZC);
  wall(X1 - X0, 0.25, (X0 + X1) / 2, Z0);
  wall(X1 - X0, 0.25, (X0 + X1) / 2, Z1);
  box(s, { w: X1 - X0, h: 0.3, d: Z1 - Z0, x: (X0 + X1) / 2, y: H - 0.3, z: ZC, color: '#f4f2ec' });
  ground(s, { w: X1 - X0, d: Z1 - Z0, x: (X0 + X1) / 2, z: ZC, y: 0.03, color: '#ece9e2', texName: 'mosaic', scale: 0.6 });
  // glass front with a door gap at z -29…-27
  const glass = new THREE.MeshPhongMaterial({ color: '#d8ecf2', transparent: true, opacity: 0.16, shininess: 100, specular: '#ffffff', depthWrite: false });
  [[Z0, -29.1], [-26.9, Z1]].forEach(([a, b]) => {
    const g = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.9, b - a), glass);
    g.position.set(X0, 1.45, (a + b) / 2); s.add(g);
    col(X0 - 0.1, X0 + 0.1, a, b);
  });
  box(s, { w: 0.25, h: H - 2.9, d: Z1 - Z0, x: X0, y: 2.9, z: ZC, color: '#efeee9' });
  for (const k of [-33.3, -31, -29.1, -26.9, -24.8, -22.7]) box(s, { w: 0.1, h: 2.9, d: 0.1, x: X0, z: k, color: '#c9c9c4', shadow: false });
  // automatic sliding doors
  ch.storeDoors = [-1, 1].map((sd) => { const d = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.5, 1.05), glass); d.position.set(X0 + 0.05, 1.25, -28 + sd * 0.53); s.add(d); return d; });
  ch.updaters.push((dt) => {
    const p = ch.player.position;
    const near = Math.abs(p.x - X0) < 2.6 && Math.abs(p.z + 28) < 2.2;
    ch.storeDoorOpen = Math.max(0, Math.min(1, (ch.storeDoorOpen || 0) + (near ? dt * 3 : -dt * 2)));
    ch.storeDoors.forEach((d, i) => { d.position.z = -28 + (i ? 1 : -1) * (0.53 + ch.storeDoorOpen * 1.0); });
  });
  let inside = false;
  ch.zone((p) => { const now = p.x > X0 + 0.3 && p.x < X1 && p.z > Z0 && p.z < Z1; const fire = now && !inside; inside = now; return fire; }, () => ch.audio.chime(), { once: false });

  // exterior: stripes, sign, light spill, scooters, umbrella stand
  box(s, { w: 0.1, h: 0.35, d: Z1 - Z0, x: X0 - 0.1, y: 3.05, z: ZC, material: glow('#e07b2c', 0.45) });
  box(s, { w: 0.1, h: 0.35, d: Z1 - Z0, x: X0 - 0.1, y: 3.4, z: ZC, material: glow('#2f9e8a', 0.45) });
  sign(s, {
    w: 5, h: 0.8, x: X0 - 0.16, y: 3.95, z: ZC, rotY: -Math.PI / 2, emissive: 0.9,
    draw: (g, w, h) => { g.fillStyle = '#fbfaf6'; g.fillRect(0, 0, w, h); fitText(g, 'CORNER MART · OPEN 24 HOURS', w / 2, h * 0.54, w * 0.92, Math.floor(h * 0.5), '700 {s}px "IBM Plex Sans", Arial, sans-serif', '#1e5f55'); },
  });
  const spill = new THREE.PointLight('#fff1cf', 18, 12, 1.4); spill.position.set(3.4, 2.4, ZC); s.add(spill);
  scooter(s, { x: 3.4, z: -24, rotY: Math.PI / 2 });
  scooter(s, { x: 3.4, z: -25.2, rotY: Math.PI / 2 + 0.2 });

  // ---------- light ----------
  for (let z = -32; z <= -24; z += 2.6) for (const x of [7, 11]) box(s, { w: 2.4, h: 0.05, d: 0.35, x, y: H - 0.36, z, material: glow('#f6fbff', 0.9), shadow: false });
  const l1 = new THREE.PointLight('#f4f8ff', 7, 14, 1.3); l1.position.set(10, 3.4, ZC); s.add(l1);
  const l2 = new THREE.PointLight('#fff2dc', 3, 9, 1.4); l2.position.set(6.5, 3.2, -31); s.add(l2);

  // ---------- fridge wall (back wall, floor to ceiling) ----------
  const FX = 14.45, FZ0 = Z0 + 0.25, FZ1 = Z1 - 0.25;
  box(s, { w: 0.8, h: 2.55, d: FZ1 - FZ0, x: FX + 0.05, z: ZC, color: '#2b3036' });               // cabinet body
  box(s, { w: 0.85, h: 0.6, d: FZ1 - FZ0, x: FX + 0.05, y: 2.55, z: ZC, color: '#e9ebee' });          // header
  col(14.0, X1, Z0, Z1);
  const shelfY = [0.12, 0.52, 0.92, 1.32, 1.72, 2.1];
  shelfY.forEach((y) => box(s, { w: 0.7, h: 0.025, d: FZ1 - FZ0, x: FX + 0.05, y, z: ZC, color: '#c9ced4', shadow: false }));
  const fridgeLight = new THREE.Mesh(new THREE.PlaneGeometry(FZ1 - FZ0, 2.4), glow('#dfe8f0', 0.25));
  fridgeLight.position.set(FX + 0.42, 1.2, ZC); fridgeLight.rotation.y = -Math.PI / 2; s.add(fridgeLight);
  // glass doors with dark frames and handles
  const fglass = new THREE.MeshPhongMaterial({ color: '#e6f4ff', transparent: true, opacity: 0.12, shininess: 140, specular: '#ffffff', depthWrite: false });
  const fg = new THREE.Mesh(new THREE.PlaneGeometry(FZ1 - FZ0, 2.45), fglass); fg.position.set(FX - 0.36, 1.25, ZC); fg.rotation.y = -Math.PI / 2; s.add(fg);
  for (let z = FZ0; z <= FZ1 + 0.01; z += (FZ1 - FZ0) / 9) {
    box(s, { w: 0.06, h: 2.45, d: 0.06, x: FX - 0.36, y: 0.02, z, color: '#3a3f46', shadow: false });
    box(s, { w: 0.04, h: 0.5, d: 0.03, x: FX - 0.41, y: 1.0, z: z + 0.08, color: '#c9ced4', shadow: false });
  }
  // header labels
  const headers = ['TEA & MILK', 'JUICE & MORE', 'COFFEE & SODA', 'WATER & SPORTS'];
  headers.forEach((t, i) => sign(s, {
    w: (FZ1 - FZ0) / 4 - 0.1, h: 0.36, x: FX - 0.38, y: 2.83, z: FZ0 + (i + 0.5) * (FZ1 - FZ0) / 4, rotY: -Math.PI / 2, emissive: 0.7, px: 64,
    draw: (g, w, h) => { g.fillStyle = ['#c8302a', '#2c9a5b', '#5a3a22', '#2c6ab8'][i]; g.fillRect(0, 0, w, h); fitText(g, t, w / 2, h / 2, w * 0.9, h * 0.6, '700 {s}px "IBM Plex Sans", Arial, sans-serif', '#ffffff'); },
  }));
  // products: cartons in facings, bottles and cans by section
  const cartonGeo = new THREE.BoxGeometry(0.075, 0.13, 0.075); cartonGeo.translate(0, 0.065, 0);
  const cartonTF = CARTONS.map(() => []);
  const bottleTF = BOTTLES.map(() => []);
  const sectionLen = (FZ1 - FZ0) / 4;
  shelfY.slice(0, 5).forEach((y, si) => {
    for (let z = FZ0 + 0.05; z < FZ1 - 0.04; ) {
      const section = Math.floor((z - FZ0) / sectionLen);
      const block = rand(0.28, 0.55);
      if (section <= 1) {
        // cartons: blocks of the same product, two rows deep
        const ti = mod(Math.floor(z * 3.1) + si * 3 + section * 5, CARTONS.length);
        for (let zz = z; zz < Math.min(z + block, FZ1 - 0.04); zz += 0.085) for (const dx of [-0.18, -0.07]) cartonTF[ti].push([FX + dx, y + 0.012, zz]);
      } else {
        const pool = section === 2 ? [4, 5, 6, 3] : [0, 1, 2, 3];
        const ti = pool[mod(Math.floor(z * 2.3) + si, pool.length)];
        const b = BOTTLES[ti];
        for (let zz = z; zz < Math.min(z + block, FZ1 - 0.04); zz += b.r * 2 + 0.012) for (const dx of [-0.18, -0.08]) bottleTF[ti].push([FX + dx, y + 0.012, zz]);
      }
      z += block + 0.02;
    }
  });
  CARTONS.forEach((c, i) => stock(s, cartonGeo, labelTex(c.bg, c.band, c.name, c.fg), cartonTF[i]));
  BOTTLES.forEach((b, i) => {
    const geo = new THREE.CylinderGeometry(b.r, b.r, b.h, 10); geo.translate(0, b.h / 2, 0);
    stock(s, geo, labelTex(b.bg, b.band, b.name, b.fg, { w: 128, h: 64 }), bottleTF[i]);
  });
  ch.thing('fridge', 13.2, -26.5, 1.8, 'Pick a drink from the fridge', { view: { move: [13.45, -26.6], look: [FX, 0.75, -26.6], eye: 0.95, hold: 4 } });

  // ---------- snack gondolas ----------
  const bagGeo = new THREE.BoxGeometry(0.2, 0.27, 0.07); bagGeo.translate(0, 0.135, 0);
  const boxGeo = new THREE.BoxGeometry(0.22, 0.14, 0.12); boxGeo.translate(0, 0.07, 0);
  const cupGeo = new THREE.CylinderGeometry(0.062, 0.05, 0.1, 12); cupGeo.translate(0, 0.05, 0);
  const geoFor = { bag: bagGeo, box: boxGeo, cup: cupGeo };
  const snackTF = SNACKS.map(() => []);
  [-24.4, -27.4, -30.4].forEach((gz, gi) => {
    box(s, { w: 4.2, h: 1.5, d: 0.3, x: 11, z: gz, color: '#e4e2dc' });                  // spine
    box(s, { w: 4.2, h: 0.12, d: 0.9, x: 11, z: gz, color: '#d2d0ca' });                 // base
    col(8.9, 13.1, gz - 0.45, gz + 0.45);
    [0.3, 0.68, 1.06].forEach((y, si) => {
      box(s, { w: 4.2, h: 0.03, d: 0.85, x: 11, y, z: gz, color: '#cfcdc6', shadow: false });
      [-1, 1].forEach((side) => {
        for (let x = 9.0; x < 12.95; ) {
          const ti = mod(gi * 3 + si * 2 + Math.floor(x * 1.7) + (side > 0 ? 4 : 0), SNACKS.length);
          const k = SNACKS[ti].kind;
          const step = k === 'bag' ? 0.22 : k === 'box' ? 0.24 : 0.14;
          const span = rand(0.5, 0.9);
          for (let xx = x; xx < Math.min(x + span, 12.95); xx += step) {
            const dz = k === 'cup' ? [0.26, 0.12] : [0.3];
            dz.forEach((d) => snackTF[ti].push([xx + step / 2, y + 0.016, gz + side * d, side > 0 ? 0 : Math.PI]));
            if (k === 'cup') snackTF[ti].push([xx + step / 2, y + 0.116, gz + side * 0.26, 0]);
          }
          x += span + 0.03;
        }
      });
    });
    // shelf-edge price strips
    [-1, 1].forEach((side) => [0.3, 0.68, 1.06].forEach((y) => box(s, { w: 4.2, h: 0.04, d: 0.01, x: 11, y: y - 0.03, z: gz + side * 0.43, color: '#f6e27a', shadow: false })));
  });
  SNACKS.forEach((sn, i) => stock(s, geoFor[sn.kind], labelTex(sn.bg, sn.band, sn.name, sn.fg, { w: 128, h: 128, dots: sn.kind === 'bag' }), snackTF[i]));

  // ---------- open chiller: rice balls, sandwiches, bento ----------
  box(s, { w: 4.2, h: 0.9, d: 0.8, x: 11, z: -22.95 + 0.0, color: '#3a3f46' });
  box(s, { w: 4.2, h: 0.5, d: 0.25, x: 11, y: 1.5, z: -22.75, color: '#e9ebee' });
  const chillLight = new THREE.Mesh(new THREE.PlaneGeometry(4.1, 0.7), glow('#dfe8f0', 0.3)); chillLight.position.set(11, 1.25, -22.85); chillLight.rotation.y = Math.PI; s.add(chillLight);
  col(8.9, 13.1, -23.4, -22.5);
  const riceGeo = new THREE.CylinderGeometry(0.075, 0.075, 0.05, 3); riceGeo.rotateX(Math.PI / 2); riceGeo.rotateZ(Math.PI / 2); riceGeo.translate(0, 0.07, 0);
  const sandGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.06, 3); sandGeo.rotateX(Math.PI / 2); sandGeo.rotateZ(Math.PI / 2); sandGeo.translate(0, 0.08, 0);
  const bentoGeo = new THREE.BoxGeometry(0.24, 0.06, 0.18); bentoGeo.translate(0, 0.03, 0);
  const riceT = [], sandT = [], bentoT = [];
  for (let x = 9.15; x < 12.9; x += 0.17) {
    riceT.push([x, 0.9, -23.15]); riceT.push([x + 0.05, 0.9, -23.32]);
    if (x < 11) sandT.push([x, 1.18, -23.05]); else bentoT.push([x, 1.18, -23.1]);
  }
  stock(s, riceGeo, labelTex('#f4f4f0', '#2a4a2a', 'TUNA', '#ffffff', { w: 64, h: 64 }), riceT);
  stock(s, sandGeo, labelTex('#f2e6c8', '#e8a24a', 'EGG SANDO', '#5a3a10', { w: 64, h: 64 }), sandT);
  stock(s, bentoGeo, labelTex('#2a2a2a', '#d8302a', 'PORK CHOP BENTO', '#ffffff', { w: 128, h: 96 }), bentoT);
  sign(s, {
    w: 4.0, h: 0.4, x: 11, y: 1.75, z: -22.89, rotY: Math.PI, emissive: 0.7, px: 64,
    draw: (g, w, h) => { g.fillStyle = '#2c9a5b'; g.fillRect(0, 0, w, h); fitText(g, 'RICE BALLS · SANDWICHES · BENTO', w / 2, h / 2, w * 0.92, h * 0.55, '700 {s}px "IBM Plex Sans", Arial, sans-serif', '#ffffff'); },
  });

  // ---------- hot food counter + register ----------
  tbox(s, { w: 3.4, h: 1.05, d: 0.9, x: 7.1, z: -32, color: '#e7e3da', texName: 'concrete' });
  col(5.4, 8.8, -33.4, -31.5);
  const top = 1.05;
  // tea eggs
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.22, 0.24, 18), mat('#3a2e26')); pot.position.set(5.75, top + 0.12, -31.85); s.add(pot);
  const brew = new THREE.Mesh(new THREE.CircleGeometry(0.23, 18), mat('#5a3a1e')); brew.rotation.x = -Math.PI / 2; brew.position.set(5.75, top + 0.235, -31.85); s.add(brew);
  for (let i = 0; i < 7; i++) { const egg = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), mat('#6a4a2e')); egg.scale.y = 1.3; egg.position.set(5.75 + rand(-0.14, 0.14), top + 0.25, -31.85 + rand(-0.14, 0.14)); s.add(egg); }
  // oden: steel tray with compartments and skewers
  box(s, { w: 0.62, h: 0.16, d: 0.42, x: 6.45, y: top, z: -31.85, color: '#b9bec4' });
  const broth = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 0.38), mat('#c8a46a')); broth.rotation.x = -Math.PI / 2; broth.position.set(6.45, top + 0.15, -31.85); s.add(broth);
  for (let i = 0; i < 3; i++) box(s, { w: 0.015, h: 0.03, d: 0.4, x: 6.3 + i * 0.15, y: top + 0.14, z: -31.85, color: '#9aa0a6', shadow: false });
  for (let i = 0; i < 14; i++) {
    const kind = i % 3;
    const item = new THREE.Mesh(kind === 0 ? new THREE.SphereGeometry(0.03, 8, 6) : new THREE.BoxGeometry(0.06, 0.04, 0.06), mat(['#e8dcc0', '#f4f0e0', '#d8b06a'][kind]));
    item.position.set(6.2 + rand(0, 0.5), top + 0.17, -31.85 + rand(-0.15, 0.15)); s.add(item);
    if (i % 2 === 0) { const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.2, 4), mat('#d8c08a')); stick.position.set(item.position.x, top + 0.25, item.position.z); stick.rotation.z = rand(-0.3, 0.3); s.add(stick); }
  }
  // steamed bun cabinet (fogged glass, warm light)
  const bunBox = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.48, 0.42), new THREE.MeshPhongMaterial({ color: '#f4f0e8', transparent: true, opacity: 0.45, shininess: 60, emissive: '#3a2a1a' }));
  bunBox.position.set(7.2, top + 0.24, -31.85); s.add(bunBox);
  for (let r = 0; r < 2; r++) for (let i = 0; i < 4; i++) { const bun = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), mat(i % 2 ? '#f8f4ec' : '#f2e6d6')); bun.scale.y = 0.75; bun.position.set(7.02 + i * 0.12, top + 0.08 + r * 0.22, -31.85); s.add(bun); }
  // hot dog roller
  box(s, { w: 0.42, h: 0.08, d: 0.34, x: 7.85, y: top, z: -31.85, color: '#9aa0a6' });
  const dogs = [];
  for (let i = 0; i < 5; i++) { const d = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.22, 4, 8), mat('#b8502a')); d.rotation.x = Math.PI / 2; d.position.set(7.69 + i * 0.08, top + 0.1, -31.85); s.add(d); dogs.push(d); }
  ch.updaters.push((dt) => dogs.forEach((d) => { d.rotation.y += dt * 1.5; }));
  // register + card reader
  box(s, { w: 0.42, h: 0.28, d: 0.36, x: 8.45, y: top, z: -32.05, color: '#2b2f36' });
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.2), glow('#bfe0ff', 0.9)); scr.position.set(8.45, top + 0.4, -31.9); scr.rotation.x = -0.4; s.add(scr);
  // hanging sign over the counter
  sign(s, {
    w: 2.6, h: 0.42, x: 7.0, y: 3.2, z: -31.2, emissive: 0.75, double: true, px: 64,
    draw: (g, w, h) => { g.fillStyle = '#c8302a'; g.fillRect(0, 0, w, h); fitText(g, 'HOT FOOD · TEA EGGS · ODEN · BUNS', w / 2, h / 2, w * 0.92, h * 0.55, '700 {s}px "IBM Plex Sans", Arial, sans-serif', '#ffffff'); },
  });
  // back shelf: parcel pickup, batteries, phone chargers
  box(s, { w: 3.6, h: 2.0, d: 0.4, x: 7.0, z: -33.15, color: '#d8d4cc' });
  for (let i = 0; i < 9; i++) box(s, { w: rand(0.25, 0.4), h: rand(0.15, 0.3), d: 0.3, x: 5.5 + i * 0.36, y: 1.6, z: -33.1, color: pick(['#c8a46a', '#b8905a', '#d8b47a']) });
  sign(s, { w: 1.4, h: 0.3, x: 6.0, y: 2.2, z: -32.93, emissive: 0.5, px: 64, draw: (g, w, h) => { g.fillStyle = '#2c6ab8'; g.fillRect(0, 0, w, h); fitText(g, 'PARCEL PICKUP', w / 2, h / 2, w * 0.9, h * 0.6, '700 {s}px "IBM Plex Sans", Arial, sans-serif', '#fff'); } });
  const clerk = personMesh({ top: '#2f9e8a', bottom: '#2b3040', longHair: false });
  clerk.position.set(6.8, 0, -32.75); s.add(clerk);
  ch.thing('store', 6.6, -30.9, 1.4, 'Buy a tea egg', { view: { look: [5.75, 1.2, -31.85], eye: 1.15, hold: 3.5 }, action: () => ch.audio.blip() });
  ch.thing('oden', 6.45, -30.9, 1.0, 'Look at the oden', { view: { look: [6.45, 1.15, -31.85], eye: 1.2, hold: 3.5 } });
  ch.thing('buns', 7.4, -30.9, 1.0, 'Look at the steamed buns', { view: { look: [7.2, 1.25, -31.85], hold: 3.5 } });

  // ---------- roasted sweet potato warmer by the door ----------
  const pot2 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.55, 0.6), new THREE.MeshPhongMaterial({ color: '#ffd8a0', transparent: true, opacity: 0.4, emissive: '#5a2a0a', shininess: 50 }));
  pot2.position.set(5.15, 0.95, -30.4); s.add(pot2);
  box(s, { w: 0.62, h: 0.68, d: 0.62, x: 5.15, y: 0, z: -30.4, color: '#5a5048' });
  for (let i = 0; i < 18; i++) { const st = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 4), mat('#3a3430')); st.position.set(5.15 + rand(-0.25, 0.25), 0.72, -30.4 + rand(-0.25, 0.25)); s.add(st); }
  for (let i = 0; i < 6; i++) { const sp = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.12, 4, 8), mat('#8a3a3a')); sp.rotation.z = Math.PI / 2; sp.rotation.y = rand(0, 3); sp.position.set(5.15 + rand(-0.18, 0.18), 0.78, -30.4 + rand(-0.18, 0.18)); s.add(sp); }
  sign(s, { w: 0.6, h: 0.18, x: 5.15, y: 1.32, z: -30.09, emissive: 0.6, px: 48, draw: (g, w, h) => { g.fillStyle = '#8a3a1a'; g.fillRect(0, 0, w, h); fitText(g, 'SWEET POTATO', w / 2, h / 2, w * 0.92, h * 0.6, '700 {s}px "IBM Plex Sans", Arial, sans-serif', '#ffe8c0'); } });
  col(4.8, 5.5, -30.75, -30.05);
  ch.thing('potato', 5.6, -29.6, 1.2, 'Smell the sweet potatoes', { view: { look: [5.15, 0.9, -30.4], eye: 1.0, hold: 3.5 } });

  // ---------- coffee bar ----------
  tbox(s, { w: 3.4, h: 0.95, d: 0.62, x: 11.1, z: -33.05, color: '#3a3430', texName: 'concrete' });
  box(s, { w: 3.42, h: 0.05, d: 0.64, x: 11.1, y: 0.95, z: -33.05, color: '#d8d0c4' });
  col(9.4, 12.8, -33.4, -32.7);
  [10.0, 11.0].forEach((x) => {
    box(s, { w: 0.6, h: 0.72, d: 0.5, x, y: 1.0, z: -33.1, color: '#c9ced4' });
    const sc = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.2), glow('#7fd0ff', 1.0)); sc.position.set(x, 1.5, -32.84); s.add(sc);
    box(s, { w: 0.3, h: 0.03, d: 0.2, x, y: 1.12, z: -32.86, color: '#5a5f66' });
  });
  for (let i = 0; i < 4; i++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.035, 0.5, 12), mat('#f4f2ec')); c.position.set(11.8 + (i % 2) * 0.12, 1.25, -33.15 + Math.floor(i / 2) * 0.14); s.add(c); }
  box(s, { w: 0.5, h: 0.12, d: 0.3, x: 12.45, y: 1.0, z: -33.05, color: '#8a6a4a' });           // sugar & stirrers
  sign(s, {
    w: 3.2, h: 1.2, x: 11.1, y: 2.4, z: -33.35, emissive: 0.75,
    draw: (g, w, h) => {
      g.fillStyle = '#2a201a'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#f2c27a'; g.font = `700 ${h * 0.15}px "IBM Plex Sans", Arial, sans-serif`; g.textBaseline = 'middle'; g.textAlign = 'left';
      g.fillText('FRESH COFFEE', w * 0.05, h * 0.15);
      const rows = [['Americano', '45'], ['Latte', '55'], ['Cappuccino', '55'], ['Iced Latte', '60'], ['Hot Black Tea', '35']];
      g.font = `500 ${h * 0.1}px "IBM Plex Sans", Arial, sans-serif`;
      rows.forEach(([n, p], i) => { g.fillStyle = '#f6efe2'; g.textAlign = 'left'; g.fillText(n, w * 0.06, h * (0.33 + i * 0.12)); g.textAlign = 'right'; g.fillText(p, w * 0.6, h * (0.33 + i * 0.12)); });
      g.fillStyle = '#c8302a'; g.fillRect(w * 0.66, h * 0.32, w * 0.3, h * 0.42);
      g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = `700 ${h * 0.1}px "IBM Plex Sans", Arial, sans-serif`;
      g.fillText('2nd CUP', w * 0.81, h * 0.43); g.fillText('HALF', w * 0.81, h * 0.55); g.fillText('PRICE', w * 0.81, h * 0.66);
    },
  });
  sign(s, { w: 1.4, h: 0.38, x: 11.1, y: 3.35, z: -32.6, emissive: 0.75, double: true, px: 64, draw: (g, w, h) => { g.fillStyle = '#5a3a22'; g.fillRect(0, 0, w, h); fitText(g, 'COFFEE BAR', w / 2, h / 2, w * 0.86, h * 0.6, '700 {s}px "IBM Plex Sans", Arial, sans-serif', '#f6e6c4'); } });
  ch.thing('coffee', 10.5, -32.1, 1.4, 'Watch the coffee machine', { view: { look: [10.0, 1.4, -33.1], eye: 1.15, hold: 4 }, action: () => grind(ch) });

  // ---------- kiosk, ATM, newspapers, window seats ----------
  box(s, { w: 0.7, h: 1.6, d: 0.55, x: 6.9, z: -22.95, color: '#e9ebee' });
  const ks = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.34), glow('#ffb24a', 0.9)); ks.position.set(6.9, 1.2, -23.23); ks.rotation.y = Math.PI; s.add(ks);
  sign(s, { w: 0.66, h: 0.2, x: 6.9, y: 1.5, z: -23.24, rotY: Math.PI, emissive: 0.6, px: 48, draw: (g, w, h) => { g.fillStyle = '#e07b2c'; g.fillRect(0, 0, w, h); fitText(g, 'TICKETS · PRINT', w / 2, h / 2, w * 0.92, h * 0.6, '700 {s}px "IBM Plex Sans", Arial, sans-serif', '#fff'); } });
  box(s, { w: 0.75, h: 1.7, d: 0.6, x: 7.9, z: -22.95, color: '#c9ced4' });
  const as = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.3), glow('#9fd0ff', 0.8)); as.position.set(7.9, 1.25, -23.26); as.rotation.y = Math.PI; s.add(as);
  sign(s, { w: 0.7, h: 0.18, x: 7.9, y: 1.58, z: -23.26, rotY: Math.PI, emissive: 0.6, px: 48, draw: (g, w, h) => { g.fillStyle = '#2c6ab8'; g.fillRect(0, 0, w, h); fitText(g, 'ATM', w / 2, h / 2, w * 0.9, h * 0.7, '700 {s}px "IBM Plex Sans", Arial, sans-serif', '#fff'); } });
  col(6.5, 8.3, -23.3, -22.6);
  ch.thing('kiosk', 6.9, -24.1, 1.3, 'Use the ticket kiosk', { view: { look: [6.9, 1.2, -23.25], eye: 1.25, hold: 3.5 } });
  // window seats along the glass
  box(s, { w: 0.45, h: 0.05, d: 4.0, x: 4.95, y: 1.05, z: -24.9, color: '#b8916a' });
  col(4.7, 5.2, -26.9, -22.9);
  for (let z = -26.4; z <= -23.4; z += 1.0) {
    const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.05, 14), mat('#c8302a')); stool.position.set(5.55, 0.75, z); s.add(stool);
    box(s, { w: 0.05, h: 0.75, d: 0.05, x: 5.55, z, color: '#8a9096' });
  }
  const student = personMesh({ top: '#f3f2ee', bottom: '#24304a', height: 1.6 });
  student.position.set(5.65, 0, -24.4); student.rotation.y = -Math.PI / 2;
  student.userData.legs.forEach((l) => { l.rotation.x = -1.3; l.position.y = 0.78; });
  student.children.forEach((c) => { if (!student.userData.legs.includes(c)) c.position.y -= 0.05; });
  student.userData.arms.forEach((a) => { a.rotation.x = -1.1; });
  s.add(student);
  ch.thing('seat', 5.8, -25.8, 1.4, 'Look out from the window seat', { view: { move: [5.6, -25.9], look: [-2, 1.5, -26], eye: 1.25, hold: 4 } });
  // stamp-collecting poster by the door
  sign(s, {
    w: 0.9, h: 1.2, x: X0 + 0.14, y: 1.7, z: -30.0, rotY: Math.PI / 2, emissive: 0.4,
    draw: (g, w, h) => {
      g.fillStyle = '#fff4d6'; g.fillRect(0, 0, w, h);
      fitText(g, 'COLLECT STAMPS', w / 2, h * 0.1, w * 0.9, h * 0.08, '700 {s}px "IBM Plex Sans", Arial, sans-serif', '#c8302a');
      for (let i = 0; i < 6; i++) { g.fillStyle = pick(['#f2a02a', '#5ac8e8', '#e85a8a', '#9ae85a']); g.beginPath(); g.arc(w * (0.22 + (i % 3) * 0.28), h * (0.36 + Math.floor(i / 3) * 0.24), w * 0.1, 0, Math.PI * 2); g.fill(); }
      fitText(g, 'Get a free mini figure', w / 2, h * 0.88, w * 0.9, h * 0.06, '500 {s}px "IBM Plex Sans", Arial, sans-serif', '#3a2a1a');
    },
  });
}

// coffee grinder whirr
function grind(ch) {
  const ctx = ch.audio.context;
  if (!ctx) return;
  const t = ctx.currentTime;
  const len = 1.6;
  const buf = ctx.createBuffer(1, ctx.sampleRate * len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (0.6 + 0.4 * Math.sin(i / 90));
  const s = ctx.createBufferSource(); s.buffer = buf;
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 1.2;
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.08, t + 0.1); g.gain.setValueAtTime(0.08, t + len - 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  s.connect(bp); bp.connect(g); g.connect(ch.audio.master); s.start(t);
}
