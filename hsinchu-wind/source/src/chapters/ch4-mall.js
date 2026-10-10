// Big City (巨城) mall, from photos: a long curved body wrapped in silver
// horizontal louvers, a deep blue band above the glass ground floor, the name
// in big red letters across the bulging front, a glass drum at the west corner
// with a tilted blue "flying saucer" disc on top, white wave-shaped glass
// canopies on white tree columns over the entrance plaza, palms, a taxi rank,
// a round fountain with a ring of flowers and arching jets, the LED screen,
// and the hotel tower next door.
import * as THREE from 'three';
import { box, tbox, ground, mat, glow, sign, fitText, car, tree, crowd, personMesh, rand, pick, toon, canvasTexture } from '../engine/kit.js';

export { frontAngle };

export const MALL = { x0: -75, x1: 75, back: -140, edge: -70, bulge: 8, ends: 15, h: 40 };
// z of the front facade at x (the front bows out toward the plaza)
export const frontZ = (x) => MALL.edge + MALL.bulge * (1 - Math.min(1, (x / MALL.x1) ** 2));
const frontAngle = (x) => Math.atan((2 * MALL.bulge * x) / (MALL.x1 * MALL.x1));
export const DRUM = { x: -72, z: -78, r: 13, h: 44 };

function outline() {
  const pts = [];
  const { x0, x1, back, edge, ends } = MALL;
  for (let i = 0; i <= 40; i++) { const x = x0 + ((x1 - x0) * i) / 40; pts.push([x, frontZ(x)]); }
  for (let i = 1; i <= 16; i++) { const t = (i / 16) * Math.PI; pts.push([x1 + ends * Math.sin(t), edge + (back - edge) * (1 - Math.cos(t)) / 2]); }
  for (let i = 1; i < 10; i++) pts.push([x1 - ((x1 - x0) * i) / 10, back]);
  for (let i = 0; i < 16; i++) { const t = (i / 16) * Math.PI; pts.push([x0 - ends * Math.sin(t), back + (edge - back) * (1 - Math.cos(t)) / 2]); }
  return pts;
}

// A wall following a polyline, with world-meter UVs (u along the wall, v up).
function wall(pts, y0, y1, material, { uTile = 8, vTile = 4, closed = true } = {}) {
  const pos = [], uv = [], idx = [];
  let len = 0;
  const n = closed ? pts.length : pts.length - 1;
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const base = pos.length / 3;
    pos.push(a[0], y0, a[1], b[0], y0, b[1], b[0], y1, b[1], a[0], y1, a[1]);
    uv.push(len / uTile, y0 / vTile, (len + l) / uTile, y0 / vTile, (len + l) / uTile, y1 / vTile, len / uTile, y1 / vTile);
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    len += l;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, material); m.castShadow = true; m.receiveShadow = true;
  return m;
}

function repeatTex(w, h, draw) {
  const t = canvasTexture(w, h, draw);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// silver horizontal louvers (one tile = 8 m x 4 m), with faint LED lines for the evening
function louverMaterial() {
  const draw = (lit) => (g, W, H) => {
    g.fillStyle = lit ? '#000' : '#d9dde2'; g.fillRect(0, 0, W, H);
    for (let y = 0; y < H; y += 16) {
      if (!lit) {
        g.fillStyle = '#f4f6f8'; g.fillRect(0, y, W, 5);
        g.fillStyle = '#aab1ba'; g.fillRect(0, y + 11, W, 5);
      } else if ((y / 16) % 4 === 1) { g.fillStyle = '#9fc6ff'; g.fillRect(0, y + 6, W, 2); }
    }
    if (!lit) { g.fillStyle = 'rgba(80,90,100,0.35)'; for (let x = 0; x < W; x += 64) g.fillRect(x, 0, 2, H); }
  };
  const map = repeatTex(256, 128, draw(false)), em = repeatTex(256, 128, draw(true));
  return toon({ color: '#ffffff', map, emissive: '#ffffff', emissiveMap: em, emissiveIntensity: 0.0 });
}

function glassMaterial(warm = '#ffe2b8') {
  const draw = (lit) => (g, W, H) => {
    g.fillStyle = lit ? warm : '#3a4656'; g.fillRect(0, 0, W, H);
    if (lit) { g.fillStyle = 'rgba(0,0,0,0.45)'; for (let x = 0; x < W; x += 64) g.fillRect(x + 20, H * 0.55, 30, H * 0.45); }
    g.fillStyle = lit ? 'rgba(0,0,0,0.75)' : '#c9ced4';
    for (let x = 0; x < W; x += 32) g.fillRect(x, 0, 4, H);
    g.fillRect(0, H * 0.48, W, 3);
    if (lit) { g.fillStyle = 'rgba(255,255,255,0.25)'; for (let i = 0; i < 10; i++) g.fillRect(rand(0, W), rand(0, H * 0.4), rand(6, 20), rand(4, 30)); }
  };
  const map = repeatTex(256, 128, draw(false)), em = repeatTex(256, 128, draw(true));
  return toon({ color: '#ffffff', map, emissive: '#ffffff', emissiveMap: em, emissiveIntensity: 0.55 });
}

function palm(parent, x, z, s = 1) {
  return tree(parent, { x, z, scale: s * rand(0.85, 1.05), kind: 'palm', color: '#4d7a3a' });
}

// white "tree" column: trunk with four arms reaching up to the canopy
function treeColumn(parent, x, z, h) {
  const white = mat('#f1f2f0');
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, h * 0.6, 10), white);
  trunk.position.set(x, h * 0.3, z); trunk.castShadow = true; parent.add(trunk);
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, h * 0.55, 8), white);
    arm.position.set(x + Math.cos(a) * 1.1, h * 0.6 + h * 0.2, z + Math.sin(a) * 1.1);
    arm.rotation.set(Math.sin(a) * 0.55, 0, -Math.cos(a) * 0.55);
    arm.castShadow = true; parent.add(arm);
  }
}

// wave-shaped glass canopy over a rectangle
function canopy(parent, colliders, { x, z, w, d, y = 7.8 }) {
  const geo = new THREE.PlaneGeometry(w, d, Math.ceil(w / 1.2), Math.ceil(d / 1.2));
  geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  const height = (lx, lz) => y + 0.9 * Math.sin(lx * 0.32) + 0.35 * Math.cos(lz * 0.7) + (lz / d) * 0.8;
  for (let i = 0; i < p.count; i++) p.setY(i, height(p.getX(i), p.getZ(i)));
  geo.computeVertexNormals();
  const glass = new THREE.MeshPhongMaterial({ color: '#eef6ff', specular: '#ffffff', shininess: 90, transparent: true, opacity: 0.42, side: THREE.DoubleSide, depthWrite: false, emissive: '#2a3240' });
  const m = new THREE.Mesh(geo, glass); m.position.set(x, 0, z); parent.add(m);
  // white ribs following the wave
  const ribMat = new THREE.LineBasicMaterial({ color: '#ffffff' });
  for (let lz = -d / 2; lz <= d / 2 + 0.01; lz += d / 6) {
    const pts = [];
    for (let lx = -w / 2; lx <= w / 2 + 0.01; lx += 0.6) pts.push(new THREE.Vector3(x + lx, height(lx, lz) + 0.02, z + lz));
    parent.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), ribMat));
  }
  for (let lx = -w / 2; lx <= w / 2 + 0.01; lx += 2.4) {
    const pts = [];
    for (let lz = -d / 2; lz <= d / 2 + 0.01; lz += 0.6) pts.push(new THREE.Vector3(x + lx, height(lx, lz) + 0.02, z + lz));
    parent.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), ribMat));
  }
  for (let lx = -w / 2 + 4; lx < w / 2 - 2; lx += 8) {
    treeColumn(parent, x + lx, z, height(lx, 0) - 0.4);
    colliders.push({ minX: x + lx - 0.35, maxX: x + lx + 0.35, minZ: z - 0.35, maxZ: z + 0.35 });
  }
}

export function buildMall(ch) {
  const s = ch.scene;
  const { h } = MALL;
  const pts = outline();

  // ---- the body
  const louver = louverMaterial();
  ch.louver = louver;
  s.add(wall(pts, 10.5, h - 2, louver, { uTile: 8, vTile: 4 }));
  const blue = toon({ color: '#1f4ea8', emissive: '#10307a', emissiveIntensity: 0.4 });
  s.add(wall(pts, 5.2, 10.5, blue));
  s.add(wall(pts, h - 2, h, mat('#eef0f2')));
  s.add(wall(pts, 0, 5.2, glassMaterial(), { uTile: 8, vTile: 5.2 }));
  const shape = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)));
  const roof = new THREE.Mesh(new THREE.ShapeGeometry(shape), mat('#8b8f95'));
  roof.rotation.x = -Math.PI / 2; roof.position.y = h - 0.4; s.add(roof);
  // rooftop plant and signs
  for (let i = 0; i < 6; i++) box(s, { w: rand(6, 12), h: rand(2, 4), d: rand(5, 9), x: rand(-55, 45), y: h - 0.4, z: rand(-130, -85), color: '#a3a6aa' });

  // colliders following the bow of the front
  for (let x = MALL.x0; x < MALL.x1; x += 5) {
    const inner = Math.abs(x) < Math.abs(x + 5) ? x : x + 5;
    ch.colliders.push({ minX: x, maxX: x + 5, minZ: MALL.back, maxZ: frontZ(inner) });
  }
  ch.colliders.push({ minX: MALL.x0 - MALL.ends, maxX: MALL.x0, minZ: MALL.back + 8, maxZ: MALL.edge - 8 }, { minX: MALL.x1, maxX: MALL.x1 + MALL.ends, minZ: MALL.back + 8, maxZ: MALL.edge - 8 });
  ch.colliders.push({ minX: MALL.x0 - 9, maxX: MALL.x0, minZ: MALL.back + 1, maxZ: MALL.edge - 1 }, { minX: MALL.x1, maxX: MALL.x1 + 9, minZ: MALL.back + 1, maxZ: MALL.edge - 1 });

  // ---- the name across the bow, big red letters with a white edge
  const nameZ = frontZ(0) + 0.5;
  const name = sign(s, {
    w: 40, h: 10, x: 0, y: 25, z: nameZ, emissive: 1.4, px: 256,
    draw: (g, w, hh) => {
      g.clearRect(0, 0, w, hh);
      g.save(); g.translate(w / 2, hh * 0.55); g.transform(1, 0, -0.18, 1, 0, 0);
      g.font = `italic 800 ${Math.floor(hh * 0.78)}px Georgia, "Times New Roman", serif`;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.lineWidth = hh * 0.06; g.strokeStyle = '#ffffff'; g.strokeText('Big City', 0, 0);
      g.fillStyle = '#e3232e'; g.fillText('Big City', 0, 0);
      g.restore();
    },
  });
  name.material.transparent = true;
  // store panels on the blue band, following the bow
  const panels = ['FOOD COURT', 'CINEMA', 'BOOKS', 'SPORTS', 'KIDS', 'BEAUTY', 'HOME', 'SUPERMARKET', 'FASHION', 'ARCADE'];
  const pcol = ['#ffffff', '#e3232e', '#f2c230', '#ffffff', '#2c9a5a', '#ffffff', '#ff7a2a', '#ffffff', '#111111', '#7b2bd9'];
  panels.forEach((p, i) => {
    const x = -66 + i * 14.6;
    if (Math.abs(x) < 9) return;
    sign(s, {
      w: 5.2, h: 2.2, x, y: 6.75, z: frontZ(x) + 0.25, rotY: frontAngle(x), emissive: 0.9, px: 96,
      draw: (g, w, hh) => { g.fillStyle = pcol[i]; g.fillRect(0, 0, w, hh); fitText(g, p, w / 2, hh / 2, w * 0.86, hh * 0.42, '700 {s}px "IBM Plex Sans", Arial, sans-serif', pcol[i] === '#ffffff' || pcol[i] === '#f2c230' ? '#1f4ea8' : '#ffffff'); },
    });
  });
  // tall red banners near the ends
  [-58, 58].forEach((x) => {
    sign(s, {
      w: 3, h: 22, x, y: 23, z: frontZ(x) + 0.6, rotY: frontAngle(x), emissive: 1.1, px: 512,
      draw: (g, w, hh) => {
        g.fillStyle = '#d42a2f'; g.fillRect(0, 0, w, hh);
        g.save(); g.translate(w / 2, hh / 2); g.rotate(-Math.PI / 2);
        fitText(g, 'SHOP · DINE · CINEMA', 0, 0, hh * 0.86, Math.floor(w * 0.5), '700 {s}px "IBM Plex Sans", Arial, sans-serif', '#ffffff');
        g.restore();
      },
    });
  });

  // main entrance: a glass portal pushing out of the bow under the name
  const ez = frontZ(0);
  box(s, { w: 18, h: 0.4, d: 3.2, x: 0, y: 5.0, z: ez + 1.5, color: '#f4f4f2' });
  box(s, { w: 18, h: 0.08, d: 3.0, x: 0, y: 4.98, z: ez + 1.5, material: glow('#fff2dc', 1.2), shadow: false });
  const doors = new THREE.Mesh(new THREE.PlaneGeometry(14, 4.6), glow('#fff0d8', 1.1)); doors.position.set(0, 2.3, ez + 0.3); s.add(doors);
  for (let k = -6; k <= 6; k += 2) box(s, { w: 0.12, h: 4.6, d: 0.1, x: k, z: ez + 0.35, color: '#2c3036', shadow: false });
  const entryLight = new THREE.PointLight('#ffe2b8', 30, 22, 1.4); entryLight.position.set(0, 6, ez + 5); s.add(entryLight);

  // ---- the glass drum and the blue disc
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(DRUM.r, DRUM.r, DRUM.h, 48, 1, true), glassMaterial('#ffe9c8'));
  drum.geometry.attributes.uv.array.forEach((v, i, arr) => { if (i % 2 === 0) arr[i] = v * 10; else arr[i] = v * 8; });
  drum.position.set(DRUM.x, DRUM.h / 2, DRUM.z); s.add(drum);
  for (let y = 4.5; y < DRUM.h; y += 4.5) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(DRUM.r + 0.08, 0.14, 6, 64), mat('#e9ecef'));
    ring.rotation.x = Math.PI / 2; ring.position.set(DRUM.x, y, DRUM.z); s.add(ring);
  }
  ch.colliders.push({ minX: DRUM.x - DRUM.r * 0.85, maxX: DRUM.x + DRUM.r * 0.85, minZ: DRUM.z - DRUM.r * 0.85, maxZ: DRUM.z + DRUM.r * 0.85 });
  const disc = new THREE.Group();
  const top = new THREE.Mesh(new THREE.CylinderGeometry(15, 20, 2.6, 64), toon({ color: '#1d4fb6', emissive: '#0d2a6a', emissiveIntensity: 0.5 }));
  disc.add(top);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(7, 13, 1.6, 48), toon({ color: '#2a63c9' })); cap.position.y = 2.0; disc.add(cap);
  const under = new THREE.Mesh(new THREE.TorusGeometry(17.5, 0.25, 6, 96), glow('#7fd2ff', 2.4)); under.rotation.x = Math.PI / 2; under.position.y = -1.35; disc.add(under);
  const slatMat = mat('#dfe6ef');
  for (let k = 0; k < 64; k++) { const a = (k / 64) * Math.PI * 2; const sl = box(disc, { w: 0.12, h: 2.5, d: 0.3, x: Math.cos(a) * 19.9, y: -1.25, z: Math.sin(a) * 19.9, material: slatMat, shadow: false }); sl.rotation.y = -a; }
  disc.position.set(DRUM.x, DRUM.h + 3.5, DRUM.z); disc.rotation.set(0.05, 0, -0.07);
  s.add(disc);
  for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; box(s, { w: 0.4, h: 3.2, d: 0.4, x: DRUM.x + Math.cos(a) * 10, y: DRUM.h, z: DRUM.z + Math.sin(a) * 10, color: '#e9ecef' }); }
  ch.disc = disc;
  ch.thing('disc', DRUM.x + 12, DRUM.z + 20, 6, 'Look up at the blue disc', { lines: ['Everyone in Hsinchu gives directions from the blue disc. "Meet you under the UFO."'], view: { look: [DRUM.x, DRUM.h + 3, DRUM.z], hold: 4 } });

  // ---- canopies over the plaza on both sides of the entrance
  canopy(s, ch.colliders, { x: -28, z: -57.5, w: 26, d: 10 });
  canopy(s, ch.colliders, { x: 28, z: -57.5, w: 26, d: 10 });

  // ---- LED screen on the bow, east of the name
  ch.screenCanvas = document.createElement('canvas');
  ch.screenCanvas.width = 512; ch.screenCanvas.height = 288;
  ch.screenTex = new THREE.CanvasTexture(ch.screenCanvas);
  ch.screenTex.colorSpace = THREE.SRGBColorSpace;
  const sx = 44, sz = frontZ(sx) + 0.6;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(20, 11.25), new THREE.MeshBasicMaterial({ map: ch.screenTex, toneMapped: false }));
  screen.position.set(sx, 22, sz); screen.rotation.y = frontAngle(sx); s.add(screen);
  box(s, { w: 20.8, h: 12, d: 0.4, x: sx, y: 15.6, z: sz - 0.3, rotY: frontAngle(sx), color: '#1a1c20', shadow: false });
  ch.screenLight = new THREE.PointLight('#ffffff', 40, 40, 1.2); ch.screenLight.position.set(sx, 18, sz + 8); s.add(ch.screenLight);
  ch.drawScreen(0);
  ch.thing('screen', 38, -54, 8, 'Watch the big screen', { view: { look: [sx, 22, sz], hold: 4 } });

  // ---- plaza paving with a radiating pattern around the fountain
  ground(s, { w: 200, d: 38, z: -53, y: 0.04, color: '#d5cfc4', texName: 'pavers', scale: 1.5 });
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2;
    ground(s, { w: 0.35, d: 18, x: Math.sin(a) * 14, z: -52 + Math.cos(a) * 14, y: 0.045, color: '#9a948a', texName: 'concrete', rotY: a });
  }

  // ---- fountain: planter ring of flowers, pool, arching jets, a center jet
  const F = { x: 0, z: -52 };
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(5.3, 5.4, 0.55, 64), mat('#c9c3b8'));
  rim.position.set(F.x, 0.27, F.z); s.add(rim);
  const pool = new THREE.Mesh(new THREE.CircleGeometry(3.9, 48), new THREE.MeshPhongMaterial({ color: '#1a3048', specular: '#cfe6ff', shininess: 100, emissive: '#0a2a4a' }));
  pool.rotation.x = -Math.PI / 2; pool.position.set(F.x, 0.56, F.z); s.add(pool);
  ch.poolMat = pool.material;
  const soil = new THREE.Mesh(new THREE.RingGeometry(3.95, 5.25, 64), mat('#4a3a2c')); soil.rotation.x = -Math.PI / 2; soil.position.set(F.x, 0.555, F.z); s.add(soil);
  const flowers = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.14, 0), toon({ color: '#ffffff' }), 520);
  const m4 = new THREE.Matrix4(), col = new THREE.Color();
  const fcols = ['#e3232e', '#ffcc33', '#ff6a8a', '#ff8a2a', '#ffffff', '#c22a6a'];
  for (let i = 0; i < 520; i++) {
    const a = rand(0, Math.PI * 2), r = rand(4.05, 5.15), band = Math.floor((a / (Math.PI * 2)) * 12) % 3;
    m4.makeTranslation(F.x + Math.cos(a) * r, 0.62 + rand(0, 0.12), F.z + Math.sin(a) * r);
    flowers.setMatrixAt(i, m4); flowers.setColorAt(i, col.set(fcols[(band * 2 + (Math.random() < 0.7 ? 0 : 1)) % fcols.length]));
  }
  s.add(flowers);
  const leaves = new THREE.Mesh(new THREE.RingGeometry(3.95, 5.25, 64), mat('#3f6e34')); leaves.rotation.x = -Math.PI / 2; leaves.position.set(F.x, 0.6, F.z); s.add(leaves);
  ch.colliders.push({ minX: F.x - 5.3, maxX: F.x + 5.3, minZ: F.z - 5.3, maxZ: F.z + 5.3 });
  // arching jets: tubes from the rim up and in toward the center, forming a dome
  ch.jets = [];
  const jetMat = new THREE.MeshBasicMaterial({ color: '#d8f0ff', transparent: true, opacity: 0.5, depthWrite: false });
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2;
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(Math.cos(a) * 3.6, 0.6, Math.sin(a) * 3.6),
      new THREE.Vector3(Math.cos(a) * 2.2, 4.4, Math.sin(a) * 2.2),
      new THREE.Vector3(Math.cos(a) * 0.4, 0.8, Math.sin(a) * 0.4),
    );
    const j = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.045, 5, false), jetMat.clone());
    j.position.set(F.x, 0, F.z); s.add(j); ch.jets.push(j);
  }
  const center = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.16, 1, 8), jetMat.clone());
  center.position.set(F.x, 0.6, F.z); s.add(center); ch.centerJet = center;
  ch.updaters.push((dt, t) => {
    ch.jets.forEach((j, i) => { const k = 0.85 + 0.15 * Math.sin(t * 2.2 + i * 0.6); j.scale.set(1, k, 1); j.material.opacity = 0.35 + 0.2 * k; });
    const hc = 2.5 + 2.2 * (0.5 + 0.5 * Math.sin(t * 0.9));
    center.scale.y = hc; center.position.y = 0.56 + hc / 2;
    ch.poolMat.emissive.setHSL((t * 0.05) % 1, 0.6, 0.12 + 0.1 * (ch.nightK || 0));
  });

  // ---- palms along the plaza front and the mall
  ch.plazaTrees = [];
  for (let x = -84; x <= 84; x += 10) {
    if (Math.abs(x) < 8) continue;
    tbox(s, { w: 2, h: 0.5, d: 2, x, z: -41, color: '#bdb6aa', texName: 'concrete' });
    ch.colliders.push({ minX: x - 1, maxX: x + 1, minZ: -42, maxZ: -40 });
    ch.plazaTrees.push(palm(s, x, -41, 1));
  }
  [[-48, -64], [48, -64], [-64, -60], [64, -60]].forEach(([x, z]) => ch.plazaTrees.push(palm(s, x, z, 1.15)));
  ch.updaters.push((dt, t, gust) => ch.plazaTrees.forEach((c, i) => { c.rotation.z = Math.sin(t * 1.1 + i) * 0.05 * (0.5 + gust); }));

  // ---- taxi rank on the east side of the plaza front
  ground(s, { w: 54, d: 3.2, x: 44, z: -36.2, y: 0.045, color: '#5d5f63', texName: 'asphalt', scale: 3 });
  ground(s, { w: 54, d: 0.15, x: 44, z: -37.9, y: 0.05, color: '#f2c230', texName: 'concrete' });
  sign(s, { w: 1.6, h: 1.0, x: 18.4, y: 2.6, z: -38.2, emissive: 0.7, draw: (g, w, hh) => { g.fillStyle = '#1f4ea8'; g.fillRect(0, 0, w, hh); fitText(g, 'TAXI', w / 2, hh / 2, w * 0.8, hh * 0.6, '700 {s}px "IBM Plex Sans", Arial', '#ffffff'); } });
  box(s, { w: 0.1, h: 2.1, d: 0.1, x: 18.4, z: -38.3, color: '#6a6e72' });
  for (let i = 0; i < 9; i++) {
    const x = 21 + i * 5.6;
    car(s, { x, z: -36.2, rotY: -Math.PI / 2, taxi: true });
    ch.colliders.push({ minX: x - 2.3, maxX: x + 2.3, minZ: -37.2, maxZ: -35.2 });
  }

  // ---- the hotel tower next door
  const hx = 106, hz = -100;
  tbox(s, { w: 22, h: 96, d: 22, x: hx, z: hz, color: '#e9eaec', texName: 'tile', scale: 3 });
  const hotelWin = repeatTex(128, 128, (g, W, H) => { g.fillStyle = '#000'; g.fillRect(0, 0, W, H); for (let y = 8; y < H; y += 32) for (let x = 6; x < W; x += 32) if (Math.random() < 0.6) { g.fillStyle = pick(['#ffe0b0', '#fff2d8', '#cfe2ff']); g.fillRect(x, y, 20, 14); } });
  const hw = new THREE.Mesh(new THREE.PlaneGeometry(22, 90), toon({ color: '#3a4656', emissive: '#ffffff', emissiveMap: hotelWin, emissiveIntensity: 0.9 }));
  hotelWin.repeat.set(5, 22); hw.position.set(hx - 11.05, 47, hz); hw.rotation.y = -Math.PI / 2; s.add(hw);
  box(s, { w: 0.4, h: 96, d: 3.6, x: hx - 11.2, z: hz + 5, material: toon({ color: '#1f4ea8', emissive: '#1f4ea8', emissiveIntensity: 0.4 }) });
  box(s, { w: 0.45, h: 96, d: 0.8, x: hx - 11.25, z: hz + 7.3, color: '#d42a2f' });
  sign(s, { w: 12, h: 2.6, x: hx - 11.3, y: 92, z: hz - 3, rotY: -Math.PI / 2, emissive: 1.2, draw: (g, w, hh) => { g.clearRect(0, 0, w, hh); fitText(g, 'HOTEL', w / 2, hh / 2, w * 0.9, hh * 0.7, '600 {s}px "IBM Plex Sans", Arial', '#ffffff'); } }).material.transparent = true;
  ch.colliders.push({ minX: hx - 11, maxX: hx + 11, minZ: hz - 11, maxZ: hz + 11 });
  // skybridge from the hotel to the mall
  box(s, { w: 14, h: 4, d: 6, x: hx - 18, y: 16, z: -96, material: glassMaterial('#ffe6c4') });

  // ---- family by the fountain
  ch.mom = personMesh({ top: '#8a5a7a', bottom: '#3a3a44', height: 1.58 });
  ch.mom.position.set(-5.9, 0, -45.7); ch.mom.rotation.y = 0.4; s.add(ch.mom);
  ch.dad = personMesh({ top: '#4a5a6a', bottom: '#2b2b30', height: 1.7, longHair: false });
  ch.dad.position.set(-4.6, 0, -45.3); ch.dad.rotation.y = -0.2; s.add(ch.dad);
  ch.updaters.push((dt, t) => { ch.mom.rotation.z = Math.sin(t * 1.4) * 0.015; ch.dad.userData.arms[1].rotation.x = ch.waving ? -2.6 + Math.sin(t * 10) * 0.3 : 0; });
  ch.thing('family', -5, -43.6, 3.2, 'Say hi to Mom and Dad', { once: true, view: { move: [-4.9, -43.2], look: [-5.2, 1.45, -45.5], hold: 6 }, action: () => ch.metFamily() });
  ch.thing('fountain', 6.2, -46.4, 2.6, 'Watch the fountain', { lines: ['The fountain changes color every few seconds. Kids run around it until their parents give up.'], view: { look: [0, 2.2, -52], hold: 4 } });

  // ---- plaza crowd: shoppers walking, people waiting under the canopies
  const loops = [];
  for (let i = 0; i < 22; i++) {
    const x0 = rand(-60, 60), z0 = rand(-62, -43);
    const clampP = ([x, z]) => {
      let cx = Math.max(-70, Math.min(70, x)), cz = Math.max(-63, Math.min(-42.5, z));
      if (Math.hypot(cx, cz + 52) < 6.2) cz = cz > -52 ? -45.6 : -58.4;
      return [cx, cz];
    };
    loops.push({ path: [[x0, z0], [x0 + rand(-22, 22), z0 + rand(-8, 8)], [x0 + rand(-22, 22), z0 + rand(-8, 8)]].map(clampP), loop: true, speed: rand(0.8, 1.3), bag: Math.random() < 0.5 });
  }
  for (let i = 0; i < 10; i++) { const x = pick([-1, 1]) * rand(16, 40); loops.push({ x, z: rand(-61, -54), rotY: rand(0, 6) }); }
  ch.plaza = crowd(s, loops);
  ch.updaters.push((dt, t) => ch.plaza.update(dt, t));

  // facade lights come up as the sky darkens
  ch.updaters.push(() => { louver.emissiveIntensity = 0.15 + 0.85 * (ch.nightK || 0); });
}
