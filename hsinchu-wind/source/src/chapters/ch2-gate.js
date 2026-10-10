// The East Gate roundabout (迎曦門), modeled after photos:
//   - a long oval traffic island ringed by a wide road, red-striped curb
//   - a sunken plaza inside the island: wide stone stairs come down from the
//     gate, side walls with flower mosaics, a rock water feature, red lamps,
//     slim trees on the rim, people sitting on the steps
//   - the gate: a granite-block base with a walk-through arched passage,
//     white cornice, chunky brick crenellations, and a two-tier pavilion with
//     dark red columns, orange tiled roofs with upturned eaves, and blue/teal
//     painted eave bands and hanging ornaments
import * as THREE from 'three';
import {
  box, tbox, mat, glow, sign, canvasTexture, fitText, tree, personMesh, studentMesh, rand, pick,
  tex as kitTex, roofTileTex, graniteTex, toon,
} from '../engine/kit.js';

export const RB = { x: 0, z: -45 };
export const ISLAND = { rx: 11, rz: 15 };          // island edge
export const ROAD = { rx: 20, rz: 24 };            // outer edge of the ring road
export const WALK = { rx: 24, rz: 28 };            // outer edge of the ring sidewalk
export const PIT = { x: 0, z: RB.z - 3, rx: 8, rz: 10 };  // the sunken plaza
const DEPTH = 2.4;
const GATE = { x: 0, z: RB.z + 10, w: 9, d: 7, h: 5.2 }; // north face at RB.z + 6.5

// Ground height for the player: stairs down from the gate, sunken plaza, stairs up at the far end.
export function plazaHeight(x, z) {
  const e = ((x - PIT.x) / PIT.rx) ** 2 + ((z - PIT.z) / PIT.rz) ** 2;
  if (e >= 1) return 0;
  const dz = z - RB.z;
  if (dz > 2 && Math.abs(x) < 3.5) return -DEPTH * Math.max(0, Math.min(1, (6.5 - dz) / 4.5));
  if (dz < -8.5 && Math.abs(x) < 3) return -DEPTH * Math.max(0, Math.min(1, (dz + 13) / 4.5));
  return -DEPTH;
}

// ---------------------------------------------------------------------------
// Elliptical bands and fills (x = cx + rx·sinθ, z = cz + rz·cosθ; θ = 0 points south, +z)
// ---------------------------------------------------------------------------
function ellipseBand(parent, { cx = 0, cz = 0, rx1, rz1, rx2, rz2, a0 = 0, a1 = Math.PI * 2, y = 0, material, seg = 96, uvScale = 4 }) {
  const pos = [], uv = [], idx = [];
  const n = Math.max(4, Math.round(seg * (a1 - a0) / (Math.PI * 2)));
  for (let i = 0; i <= n; i++) {
    const a = a0 + (a1 - a0) * (i / n);
    const s = Math.sin(a), c = Math.cos(a);
    const xi = cx + rx1 * s, zi = cz + rz1 * c, xo = cx + rx2 * s, zo = cz + rz2 * c;
    pos.push(xi, y, zi, xo, y, zo);
    uv.push(xi / uvScale, zi / uvScale, xo / uvScale, zo / uvScale);
    if (i < n) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  // make sure normals point up
  const nrm = g.attributes.normal; for (let i = 0; i < nrm.count; i++) nrm.setXYZ(i, 0, 1, 0);
  const m = new THREE.Mesh(g, material);
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

// Square frustum roof (lower skirt roof) with tile texture.
function skirtRoof(parent, { x, y, z, w, d, h, topRatio = 0.56 }) {
  const geo = new THREE.CylinderGeometry(topRatio * Math.SQRT1_2, Math.SQRT1_2, 1, 4, 1, true);
  geo.rotateY(Math.PI / 4);
  const t = roofTileTex().clone(); t.needsUpdate = true; t.repeat.set(10, 1);
  const m = new THREE.Mesh(geo, toon({ color: '#ffffff', map: t, side: THREE.DoubleSide }));
  m.scale.set(w, h, d); m.position.set(x, y + h / 2, z); m.castShadow = true;
  parent.add(m);
  return m;
}

// Hip roof with a ridge: base half-sizes a (x) and b (z), ridge half-length r, height h.
function ridgeRoof(parent, { x, y, z, a, b, r, h }) {
  const P = (px, py, pz) => [px, py, pz];
  const v = [
    ...P(-a, 0, b), ...P(a, 0, b), ...P(r, h, 0), ...P(-a, 0, b), ...P(r, h, 0), ...P(-r, h, 0),          // south
    ...P(a, 0, -b), ...P(-a, 0, -b), ...P(-r, h, 0), ...P(a, 0, -b), ...P(-r, h, 0), ...P(r, h, 0),     // north
    ...P(a, 0, b), ...P(a, 0, -b), ...P(r, h, 0),                                                        // east
    ...P(-a, 0, -b), ...P(-a, 0, b), ...P(-r, h, 0),                                                     // west
  ];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  const uv = [];
  for (let i = 0; i < v.length; i += 3) uv.push((i / 3 < 12 ? v[i] : v[i + 2]) * 0.6, v[i + 1] * 0.9);
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, toon({ color: '#ffffff', map: roofTileTex(), side: THREE.DoubleSide }));
  m.position.set(x, y, z); m.castShadow = true;
  parent.add(m);
  return m;
}

// Painted eave band (blue with white and teal scrolls).
let bandTex = null;
function eaveBandTex() {
  if (bandTex) return bandTex;
  bandTex = canvasTexture(512, 64, (g, w, h) => {
    g.fillStyle = '#23407e'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#d8b04a'; g.fillRect(0, 0, w, 4); g.fillRect(0, h - 4, w, 4);
    for (let x = 18; x < w; x += 46) {
      g.strokeStyle = '#e8f0f4'; g.lineWidth = 3;
      g.beginPath(); g.arc(x, h / 2, 11, Math.PI * 0.2, Math.PI * 1.7); g.stroke();
      g.strokeStyle = '#5ac0c0'; g.beginPath(); g.arc(x + 20, h / 2, 7, Math.PI * 1.2, Math.PI * 2.6); g.stroke();
    }
  });
  bandTex.wrapS = THREE.RepeatWrapping;
  return bandTex;
}
function eaveBands(parent, { x, y, z, hw, hd, h = 0.38 }) {
  const t = eaveBandTex();
  [[0, hd, 0, hw * 2], [0, -hd, Math.PI, hw * 2], [hw, 0, Math.PI / 2, hd * 2], [-hw, 0, -Math.PI / 2, hd * 2]].forEach(([dx, dz, ry, len]) => {
    const tt = t.clone(); tt.needsUpdate = true; tt.repeat.set(len / 4, 1);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(len, h), toon({ color: '#ffffff', map: tt, emissive: '#1a2a5a', emissiveIntensity: 0.2 }));
    p.position.set(x + dx, y, z + dz); p.rotation.y = ry; parent.add(p);
  });
}
// Upturned eave corners ("swallowtail" flicks).
function eaveFlicks(parent, { x, y, z, hw, hd, len = 1.6 }) {
  [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([sx, sz]) => {
    const g = new THREE.Group();
    const f = box(g, { w: len, h: 0.22, d: 0.42, x: len / 2 - 0.2, color: '#c8552a' });
    f.rotation.z = 0.42;
    box(g, { w: len * 0.9, h: 0.06, d: 0.44, x: len / 2 - 0.2, y: -0.04, color: '#23407e', shadow: false }).rotation.z = 0.42;
    g.position.set(x + sx * hw, y, z + sz * hd);
    g.rotation.y = Math.atan2(-sz * hd, sx * hw);
    parent.add(g);
  });
}

// ---------------------------------------------------------------------------
export function buildRoundabout(ch) {
  const s = ch.scene;
  const col = (minX, maxX, minZ, maxZ) => ch.colliders.push({ minX, maxX, minZ, maxZ });
  const asphalt = mat('#8a8c90', { map: kitTex('asphalt') });
  const pavers = mat('#cbc4b8', { map: kitTex('pavers') });

  // ring road, ring sidewalk (with openings for streets), island rim, red curb stripe
  ellipseBand(s, { cx: RB.x, cz: RB.z, rx1: ISLAND.rx, rz1: ISLAND.rz, rx2: ROAD.rx, rz2: ROAD.rz, y: 0.025, material: asphalt });
  const gaps = [[0.32, Math.PI / 2 - 0.23], [Math.PI / 2 + 0.23, Math.PI - 0.32], [Math.PI + 0.32, Math.PI * 1.5 - 0.23], [Math.PI * 1.5 + 0.23, Math.PI * 2 - 0.32]];
  gaps.forEach(([a0, a1]) => ellipseBand(s, { cx: RB.x, cz: RB.z, rx1: ROAD.rx, rz1: ROAD.rz, rx2: WALK.rx, rz2: WALK.rz, a0, a1, y: 0.045, material: pavers, uvScale: 1.5 }));
  ellipseBand(s, { cx: RB.x, cz: RB.z, rx1: ISLAND.rx - 0.35, rz1: ISLAND.rz - 0.35, rx2: ISLAND.rx, rz2: ISLAND.rz, y: 0.09, material: mat('#c8302a') });
  // island rim (pavers + planting) around the sunken plaza
  const rimPav = new THREE.Shape();
  rimPav.absellipse(0, 0, ISLAND.rx - 0.35, ISLAND.rz - 0.35, 0, Math.PI * 2, false, 0);
  const hole = new THREE.Path(); hole.absellipse(PIT.x - RB.x, -(PIT.z - RB.z), PIT.rx, PIT.rz, 0, Math.PI * 2, true, 0);
  rimPav.holes.push(hole);
  const rimGeo = new THREE.ShapeGeometry(rimPav, 64);
  const ruv = rimGeo.attributes.uv; for (let i = 0; i < ruv.count; i++) ruv.setXY(i, ruv.getX(i) / 1.5, ruv.getY(i) / 1.5);
  const rim = new THREE.Mesh(rimGeo, mat('#d6cfc2', { map: kitTex('pavers') }));
  rim.rotation.x = -Math.PI / 2; rim.position.set(RB.x, 0.08, RB.z); rim.receiveShadow = true; s.add(rim);
  // planting strips along the long sides of the rim
  [-1, 1].forEach((sd) => ellipseBand(s, { cx: RB.x, cz: RB.z, rx1: ISLAND.rx - 2.2, rz1: ISLAND.rz - 2.2, rx2: ISLAND.rx - 0.8, rz2: ISLAND.rz - 0.8, a0: sd > 0 ? 0.7 : Math.PI + 0.7, a1: sd > 0 ? Math.PI - 0.5 : Math.PI * 2 - 0.5, y: 0.1, material: mat('#6f9a4a', { map: kitTex('grass') }) }));
  // lane arrows on the ring
  const arrow = canvasTexture(64, 128, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = '#f2efe6'; g.fillRect(w * 0.4, h * 0.3, w * 0.2, h * 0.65); g.beginPath(); g.moveTo(w * 0.5, 0); g.lineTo(w * 0.9, h * 0.32); g.lineTo(w * 0.1, h * 0.32); g.fill(); });
  for (let a = 0.4; a < Math.PI * 2; a += Math.PI / 3) {
    const r = (ISLAND.rx + ROAD.rx) / 2, rz = (ISLAND.rz + ROAD.rz) / 2;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 2.4), new THREE.MeshBasicMaterial({ map: arrow, transparent: true, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.rotation.z = a - Math.PI / 2;
    m.position.set(RB.x + r * Math.sin(a), 0.04, RB.z + rz * Math.cos(a)); s.add(m);
  }

  // ---------- the sunken plaza ----------
  // floor
  ellipseBand(s, { cx: PIT.x, cz: PIT.z, rx1: 0, rz1: 0, rx2: PIT.rx, rz2: PIT.rz, y: -DEPTH + 0.01, material: mat('#d8d2c6', { map: kitTex('pavers') }), uvScale: 1.2 });
  // retaining wall (inner face) and parapet on top, open at both stair ends
  const wallGeo = new THREE.CylinderGeometry(1, 1, 1, 96, 1, true);
  const wall = new THREE.Mesh(wallGeo, toon({ color: '#c9c5bc', map: kitTex('concrete'), side: THREE.DoubleSide }));
  wall.scale.set(PIT.rx, DEPTH, PIT.rz); wall.position.set(PIT.x, -DEPTH / 2, PIT.z); wall.receiveShadow = true; s.add(wall);
  const SO = 0.45, NO = 0.38;             // half-angle openings at the south (gate) and north stairs
  [[SO, Math.PI - NO], [Math.PI + NO, Math.PI * 2 - SO]].forEach(([a0, a1]) => {
    const pg = new THREE.CylinderGeometry(1, 1, 1, 64, 1, true, a0, a1 - a0);
    const par = new THREE.Mesh(pg, toon({ color: '#cfcbc2', map: kitTex('concrete'), side: THREE.DoubleSide }));
    par.scale.set(PIT.rx + 0.15, 0.95, PIT.rz + 0.15); par.position.set(PIT.x, 0.47, PIT.z); par.castShadow = true; s.add(par);
    // cap
    ellipseBand(s, { cx: PIT.x, cz: PIT.z, rx1: PIT.rx - 0.05, rz1: PIT.rz - 0.05, rx2: PIT.rx + 0.35, rz2: PIT.rz + 0.35, a0, a1, y: 0.95, material: mat('#dcd8cf') });
    for (let a = a0; a <= a1; a += 0.07) {
      const px = PIT.x + PIT.rx * Math.sin(a), pz = PIT.z + PIT.rz * Math.cos(a);
      col(px - 0.25, px + 0.25, pz - 0.25, pz + 0.25);
    }
  });
  // railing on the parapet
  const posts = [];
  [[SO, Math.PI - NO], [Math.PI + NO, Math.PI * 2 - SO]].forEach(([a0, a1]) => { for (let a = a0; a <= a1; a += 0.09) posts.push([PIT.x + (PIT.rx + 0.15) * Math.sin(a), PIT.z + (PIT.rz + 0.15) * Math.cos(a)]); });
  const pm = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.025, 0.025, 0.7, 6), mat('#5a6068'), posts.length);
  posts.forEach(([x, z], i) => pm.setMatrixAt(i, new THREE.Matrix4().makeTranslation(x, 1.3, z))); s.add(pm);

  // south stairs (from the gate's north face down into the plaza), with side walls and mosaics
  const steps = 9, run = 4.5 / steps, rise = DEPTH / steps;
  for (let i = 0; i < steps; i++) {
    const zTop = RB.z + 6.5 - i * run;
    tbox(s, { w: 7, h: rise, d: run + 0.02, x: 0, y: -DEPTH + (steps - 1 - i) * rise, z: zTop - run / 2, color: '#d2cdc2', texName: 'pavers', scale: 0.8 });
  }
  const mosaic = canvasTexture(256, 128, (g, w, h) => {
    g.fillStyle = '#2a3a5a'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 22; i++) {
      const x = rand(10, w - 10), y = rand(10, h - 10), r = rand(8, 20);
      g.fillStyle = pick(['#e85a7a', '#f2a0b0', '#f4d24a', '#e86a3a', '#c8302a', '#ffffff']);
      for (let p = 0; p < 6; p++) { g.beginPath(); g.ellipse(x + Math.cos(p) * r * 0.6, y + Math.sin(p) * r * 0.6, r * 0.5, r * 0.28, p, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = '#f4e04a'; g.beginPath(); g.arc(x, y, r * 0.22, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#4a8a3a'; g.lineWidth = 3; g.beginPath(); g.moveTo(x, y + r * 0.4); g.lineTo(x + rand(-12, 12), y + r * 1.5); g.stroke();
    }
    g.strokeStyle = '#d8d0c0'; g.lineWidth = 8; g.strokeRect(0, 0, w, h);
  });
  [-1, 1].forEach((sd) => {
    tbox(s, { w: 0.35, h: DEPTH + 0.95, d: 4.5, x: sd * 3.68, y: -DEPTH, z: RB.z + 4.25, color: '#cfcbc2', texName: 'concrete', scale: 2 });
    col(sd * 3.68 - 0.2, sd * 3.68 + 0.2, RB.z + 2, RB.z + 6.5);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.0), toon({ color: '#ffffff', map: mosaic, emissive: '#ffffff', emissiveMap: mosaic, emissiveIntensity: 0.15 }));
    p.position.set(sd * 3.86, -1.3, RB.z + 4.0); p.rotation.y = sd * Math.PI / 2; s.add(p);
  });
  // north stairs back up to the rim
  for (let i = 0; i < steps; i++) {
    const zBot = RB.z - 8.5 - i * run;
    tbox(s, { w: 6, h: rise, d: run + 0.02, x: 0, y: -DEPTH + i * rise, z: zBot - run / 2, color: '#d2cdc2', texName: 'pavers', scale: 0.8 });
  }
  [-1, 1].forEach((sd) => { tbox(s, { w: 0.3, h: DEPTH + 0.95, d: 4.5, x: sd * 3.15, y: -DEPTH, z: RB.z - 10.75, color: '#cfcbc2', texName: 'concrete', scale: 2 }); col(sd * 3.15 - 0.2, sd * 3.15 + 0.2, RB.z - 13, RB.z - 8.5); });

  // rock water feature in the middle of the plaza
  const bz = RB.z - 3.5;
  tbox(s, { w: 6.2, h: 0.55, d: 3.4, x: 0, y: -DEPTH, z: bz, color: '#bdb7aa', texName: 'concrete', scale: 1 });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 2.8), new THREE.MeshPhongMaterial({ color: '#5a7a8a', specular: '#ffffff', shininess: 120, transparent: true, opacity: 0.85 }));
  water.rotation.x = -Math.PI / 2; water.position.set(0, -DEPTH + 0.5, bz); s.add(water);
  [[-1.4, 0.2, 1.0], [0.3, -0.3, 1.3], [1.6, 0.4, 0.8], [-0.4, 0.6, 0.7]].forEach(([dx, dz, r]) => {
    const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), mat('#8a7e6e'));
    rock.scale.set(1.1, 0.75, 0.9); rock.rotation.y = rand(0, 3); rock.position.set(dx, -DEPTH + 0.6 + r * 0.4, bz + dz); rock.castShadow = true; s.add(rock);
  });
  col(-3.1, 3.1, bz - 1.7, bz + 1.7);
  ch.updaters.push((dt, t) => { water.material.opacity = 0.8 + 0.06 * Math.sin(t * 2); });

  // red lamp posts and slim trees on the rim
  [[-6, RB.z - 9], [6, RB.z - 9], [-6.5, RB.z + 3], [6.5, RB.z + 3]].forEach(([x, z]) => {
    box(s, { w: 0.16, h: 4.6, d: 0.16, x, z, color: '#b8282a' });
    const lan = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, 0.5, 8), glow('#ffe2b0', 0.6)); lan.position.set(x, 4.85, z); s.add(lan);
    box(s, { w: 0.5, h: 0.08, d: 0.5, x, y: 5.1, z, color: '#8a1e1a' });
    col(x - 0.15, x + 0.15, z - 0.15, z + 0.15);
  });
  ch.rimTrees = [];
  for (let a = 0.75; a < Math.PI - 0.5; a += 0.32) [1, -1].forEach((sd) => {
    const x = RB.x + sd * (ISLAND.rx - 1.5) * Math.sin(a), z = RB.z + (ISLAND.rz - 1.5) * Math.cos(a);
    ch.rimTrees.push(tree(s, { x, z, scale: 0.55, color: '#8aa85a' }));
    [-1, 1].forEach((k) => { const st = box(s, { w: 0.05, h: 1.6, d: 0.05, x: x + k * 0.3, z, color: '#8a6a4a', shadow: false }); st.rotation.z = -k * 0.2; });
  });
  ch.updaters.push((dt, t, gust) => ch.rimTrees.forEach((c, i) => { c.rotation.z = Math.sin(t * 1.1 + i) * 0.03 * (0.5 + gust); }));

  // people on the steps (one under a purple umbrella)
  const sitAt = (x, z, y, ry, student = false, umbrella = false) => {
    const p = student ? studentMesh({}) : personMesh({});
    p.position.set(x, y - 0.42, z); p.rotation.y = ry;
    p.userData.legs.forEach((l) => { l.rotation.x = -1.4; l.position.y = 0.5; });
    s.add(p);
    if (umbrella) {
      const u = new THREE.Mesh(new THREE.ConeGeometry(0.9, 0.35, 10, 1, true), mat('#8a6ad8', { side: THREE.DoubleSide }));
      u.position.set(x, y + 1.25, z); s.add(u);
      box(s, { w: 0.03, h: 1.0, d: 0.03, x, y: y + 0.3, z, color: '#333', shadow: false });
    }
  };
  const stepY = (dz) => plazaHeight(0, RB.z + dz);
  sitAt(-2.4, RB.z + 4.6, stepY(4.6), Math.PI, true);
  sitAt(-1.6, RB.z + 4.6, stepY(4.6), Math.PI + 0.2, true);
  sitAt(1.2, RB.z + 3.2, stepY(3.2), Math.PI, false, true);
  sitAt(2.6, RB.z + 5.6, stepY(5.6), Math.PI - 0.3);

  buildGate(ch);

  // the name tag, dropped on the plaza floor by the water
  const tx = 2.6, tz = RB.z - 6.2, ty = -DEPTH;
  box(s, { w: 1.8, h: 0.45, d: 0.5, x: 4.8, y: ty, z: tz, rotY: 0.4, color: '#8a6a4a' });
  ch.tag = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.08), new THREE.MeshLambertMaterial({ map: canvasTexture(128, 48, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); fitText(g, '1 2 3 7', w / 2, h / 2, w * 0.9, h * 0.6, '600 {s}px "IBM Plex Mono", monospace', '#1f4e8c'); }), emissive: '#ffffff', emissiveIntensity: 0.6, side: THREE.DoubleSide }));
  ch.tag.rotation.x = -Math.PI / 2; ch.tag.position.set(tx, ty + 0.1, tz); s.add(ch.tag);
  ch.tagHalo = new THREE.Mesh(new THREE.RingGeometry(0.25, 0.38, 28), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.4, depthWrite: false, side: THREE.DoubleSide }));
  ch.tagHalo.rotation.x = -Math.PI / 2; ch.tagHalo.position.set(tx, ty + 0.08, tz); s.add(ch.tagHalo);
  ch.updaters.push((dt, t) => { if (ch.tagHalo.visible) ch.tagHalo.material.opacity = 0.25 + 0.2 * Math.sin(t * 4); });
  ch.tagSpot = { x: tx, z: tz, y: ty };

  return { plazaHeight };
}

function buildGate(ch) {
  const s = ch.scene;
  const col = (minX, maxX, minZ, maxZ) => ch.colliders.push({ minX, maxX, minZ, maxZ });
  const { x: gx, z: gz, w, d, h } = GATE;
  const z0 = gz - d / 2, z1 = gz + d / 2;
  const granite = toon({ color: '#ffffff', map: graniteTex() });
  const gbox = (bw, bh, bd, x, y, z) => {
    const geo = new THREE.BoxGeometry(bw, bh, bd);
    const uv = geo.attributes.uv; const dims = [[bd, bh], [bd, bh], [bw, bd], [bw, bd], [bw, bh], [bw, bh]];
    for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * dims[f][0] / 3, uv.getY(i) * dims[f][1] / 3); }
    const m = new THREE.Mesh(geo, granite); m.position.set(x, y + bh / 2, z); m.castShadow = true; m.receiveShadow = true; s.add(m); return m;
  };
  // base: two piers, lintel and arch spandrels around a walk-through passage (x ±1.6)
  const pw = (w - 3.2) / 2;
  gbox(pw, h, d, gx - 1.6 - pw / 2, 0, gz);
  gbox(pw, h, d, gx + 1.6 + pw / 2, 0, gz);
  gbox(3.2, h - 4.05, d, gx, 4.05, gz);
  const sh = new THREE.Shape();
  sh.moveTo(-1.6, 2.4); sh.lineTo(-1.6, 4.06); sh.lineTo(1.6, 4.06); sh.lineTo(1.6, 2.4); sh.absarc(0, 2.4, 1.6, 0, Math.PI, false);
  const sgeo = new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: false, curveSegments: 20 });
  const suv = sgeo.attributes.uv; for (let i = 0; i < suv.count; i++) suv.setXY(i, suv.getX(i) / 3, suv.getY(i) / 3);
  const span = new THREE.Mesh(sgeo, granite); span.position.set(gx, 0, z0); span.castShadow = true; s.add(span);
  col(gx - w / 2, gx - 1.6, z0, z1); col(gx + 1.6, gx + w / 2, z0, z1);
  // passage floor
  const pf = new THREE.Mesh(new THREE.PlaneGeometry(3.2, d), mat('#a8a094', { map: kitTex('pavers') })); pf.rotation.x = -Math.PI / 2; pf.position.set(gx, 0.1, gz); s.add(pf);
  // cornice and brick crenellations
  box(s, { w: w + 0.5, h: 0.45, d: d + 0.5, x: gx, y: h, z: gz, color: '#eeebe2' });
  const brick = mat('#ffffff', { map: kitTex('brick') });
  const top = h + 0.45;
  const crenel = (x, z, len, alongX) => box(s, { w: alongX ? len : 0.7, h: 0.75, d: alongX ? 0.7 : len, x, y: top, z, material: brick });
  [-3.2, -0.8, 1.6, 3.6].forEach((x) => { crenel(gx + x - 0.2, z1 - 0.15, 1.5, true); crenel(gx + x - 0.2, z0 + 0.15, 1.5, true); });
  [-2.2, 0.2, 2.4].forEach((z) => { crenel(gx - w / 2 + 0.15, gz + z, 1.4, false); crenel(gx + w / 2 - 0.15, gz + z, 1.4, false); });
  // plaques: carved name above the arch, tall stone tablet beside it
  [1, -1].forEach((sd) => sign(s, {
    w: 1.6, h: 0.55, x: gx, y: 4.62, z: gz + sd * (d / 2 + 0.02), rotY: sd > 0 ? 0 : Math.PI, emissive: 0.05, px: 96,
    draw: (g, W, H) => { g.fillStyle = '#d8cfbc'; g.fillRect(0, 0, W, H); g.strokeStyle = '#9a8e78'; g.lineWidth = 4; g.strokeRect(3, 3, W - 6, H - 6); fitText(g, '迎 曦', W / 2, H / 2, W * 0.7, H * 0.7, '700 {s}px "Noto Sans TC", serif', '#4a3e30'); },
  }));
  box(s, { w: 1.4, h: 2.6, d: 0.12, x: gx + 2.9, y: 0.6, z: z1 + 0.05, color: '#bdb8ac' });

  // ---------- the pavilion on top ----------
  const by = top;                                  // floor of the pavilion
  const red = mat('#7e2420');
  const colH = 3.1;
  const cols = [];
  for (const x of [-3.6, -1.2, 1.2, 3.6]) for (const z of [-2.3, 2.3]) cols.push([x, z]);
  cols.forEach(([x, z]) => {
    box(s, { w: 0.55, h: 0.3, d: 0.55, x: gx + x, y: by, z: gz + z, color: '#d8d2c4' });
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, colH, 12), red); c.position.set(gx + x, by + 0.3 + colH / 2, gz + z); c.castShadow = true; s.add(c);
  });
  // beams and the teal hanging ornaments at the column heads
  const beamY = by + 0.3 + colH - 0.35;
  [-2.3, 2.3].forEach((z) => box(s, { w: 7.8, h: 0.35, d: 0.3, x: gx, y: beamY, z: gz + z, material: red }));
  [-3.6, 3.6].forEach((x) => box(s, { w: 0.3, h: 0.35, d: 4.9, x: gx + x, y: beamY, z: gz, material: red }));
  const teal = mat('#3e9aa8');
  cols.forEach(([x, z]) => {
    const o = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.1, 0.42, 8), teal);
    o.position.set(gx + x * 1.12, beamY - 0.2, gz + z * 1.15); s.add(o);
    const k = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), mat('#e8e2c8')); k.position.set(gx + x * 1.12, beamY - 0.48, gz + z * 1.15); s.add(k);
  });
  // inner core: white walls with dark doors (seen between the columns)
  box(s, { w: 4.2, h: colH - 0.4, d: 2.8, x: gx, y: by + 0.3, z: gz, color: '#efe9de' });
  [1, -1].forEach((sd) => { const dr = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.0), mat('#5a1e18')); dr.position.set(gx, by + 1.3, gz + sd * 1.41); dr.rotation.y = sd > 0 ? 0 : Math.PI; s.add(dr); });
  // lower skirt roof with painted band and flicked corners
  const lrY = by + 0.3 + colH;
  skirtRoof(s, { x: gx, y: lrY, z: gz, w: 11.6, d: 8.2, h: 1.2, topRatio: 0.52 });
  eaveBands(s, { x: gx, y: lrY - 0.12, z: gz, hw: 5.75, hd: 4.05 });
  eaveFlicks(s, { x: gx, y: lrY + 0.05, z: gz, hw: 5.6, hd: 3.95 });
  // upper tier: white walls with small dark windows, red corner posts
  const uy = lrY + 0.9;
  box(s, { w: 5.6, h: 2.1, d: 3.6, x: gx, y: uy, z: gz, color: '#f1ece2' });
  [-1, 1].forEach((sd) => [-1.6, 0, 1.6].forEach((x) => { const wn = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.55), mat('#2a2622')); wn.position.set(gx + x, uy + 1.15, gz + sd * 1.81); wn.rotation.y = sd > 0 ? 0 : Math.PI; s.add(wn); }));
  [[-2.8, -1.8], [2.8, -1.8], [-2.8, 1.8], [2.8, 1.8]].forEach(([x, z]) => box(s, { w: 0.28, h: 2.1, d: 0.28, x: gx + x, y: uy, z: gz + z, material: red }));
  box(s, { w: 6.0, h: 0.28, d: 4.0, x: gx, y: uy + 2.05, z: gz, material: red });
  eaveBands(s, { x: gx, y: uy + 1.85, z: gz, hw: 2.82, hd: 1.82, h: 0.3 });
  // upper roof with ridge, swallowtail ridge ends and flicked corners
  const ury = uy + 2.3;
  ridgeRoof(s, { x: gx, y: ury, z: gz, a: 4.6, b: 3.2, r: 2.2, h: 1.9 });
  eaveBands(s, { x: gx, y: ury - 0.14, z: gz, hw: 4.62, hd: 3.22 });
  eaveFlicks(s, { x: gx, y: ury + 0.05, z: gz, hw: 4.5, hd: 3.1, len: 1.8 });
  box(s, { w: 4.8, h: 0.32, d: 0.32, x: gx, y: ury + 1.85, z: gz, color: '#c8552a' });
  box(s, { w: 4.8, h: 0.08, d: 0.34, x: gx, y: ury + 1.85, z: gz, color: '#23407e', shadow: false });
  [-1, 1].forEach((sd) => [-0.12, 0.12].forEach((zo) => {
    const t = box(s, { w: 1.3, h: 0.16, d: 0.16, x: gx + sd * 2.85, y: ury + 1.95, z: gz + zo, color: '#c8552a' });
    t.rotation.z = sd * 0.65; t.rotation.y = zo * 2;
  }));

  ch.thing('eastgate', gx, z1 + 1.0, 4.5, 'Look up at the East Gate', { view: { look: [gx, 10.5, gz], hold: 4 } });
  ch.thing('plaza', 0, RB.z + 1.0, 2.5, 'Sit on the steps', { y: -DEPTH, view: { move: [-0.6, RB.z + 1.2], look: [0, -0.6, RB.z - 8], eye: 0.95, hold: 4.5 } });
}
