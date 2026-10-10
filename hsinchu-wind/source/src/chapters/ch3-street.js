// The late-night street outside NYCU's north gate (modeled on the 光復路 /
// 大學路 side streets): narrow road, dense 4–7 floor walk-ups with arcades,
// stacks of vertical lit signs (purple, blue, green, red), awnings, scooters
// parked nose-to-tail along both curbs, concrete poles with sagging wires and a
// yellow box junction at the cross street. The food counters and the photo
// booth the story needs are shopfronts on this street.
import * as THREE from 'three';
import {
  box, tbox, ground, mat, glow, sign, fitText, scooter, car, crowd, personMesh, townhouse,
  powerLine, streetLamp, awning, rand, pick, canvasTexture, bakeStatic,
} from '../engine/kit.js';

export const STREET = { z0: -152, z1: -312, face: 8.5, cross: -232, crossW: 11 };

const NEON = ['#7b2bd9', '#2a5ee0', '#1f9a62', '#d62b3a', '#d63a8e', '#e07a1a', '#1a8fae'];
const NAMES = [
  'KARAOKE', 'HOT POT', 'NOODLES', 'DUMPLINGS', 'HOSTEL', 'BEEF NOODLE', 'INTERNET CAFE', 'GAMES',
  'MASSAGE', 'PHARMACY', 'BOOKS', 'COPY SHOP', 'TEA', 'BENTO', 'LAUNDRY', 'EYEWEAR', 'BILLIARDS',
  'STEAK', 'RAMEN', 'COFFEE', 'DESSERT', 'PHONE REPAIR', 'BARBER', 'CLINIC', 'TUTORING', 'SUSHI',
  'HOTEL', 'BBQ', 'CURRY', 'JUICE', 'GUITARS', 'STUDY ROOM',
];
const SHOPS = ['NOODLE HOUSE', 'DUMPLINGS', 'COPY & PRINT', 'BENTO', 'TEA STAND', 'PHONE REPAIR', 'HOT POT', 'BOOKSTORE', 'RICE BOWLS', 'CONVENIENCE'];

// Vertical lit sign that sticks out from the facade toward the street.
function vSign(parent, { x, y, z, text, bg, h }) {
  const w = 0.62;
  const m = sign(parent, {
    w, h, x, y, z, rotY: 0, emissive: 1.25, double: true, px: 300,
    draw: (g, W, H) => {
      g.fillStyle = bg; g.fillRect(0, 0, W, H);
      g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = W * 0.06; g.strokeRect(W * 0.07, W * 0.07, W * 0.86, H - W * 0.14);
      g.save(); g.translate(W / 2, H / 2); g.rotate(-Math.PI / 2);
      fitText(g, text, 0, 0, H * 0.84, Math.floor(W * 0.52), '700 {s}px "IBM Plex Sans", Arial, sans-serif', '#ffffff');
      g.restore();
    },
  });
  return m;
}

// A shop counter in the arcade: front box, cooking light, menu board, vendor.
function counter(ch, { side, z, name, bg, food = '#c98a3a', steam = false }) {
  const s = ch.streetStatic, { face } = STREET;
  const inner = side * (face + 0.95);             // counter sits against the shopfront
  box(s, { w: 0.9, h: 1.0, d: 3.0, x: inner, z, color: '#c9c3b8' });
  box(s, { w: 1.0, h: 0.05, d: 3.1, x: inner, y: 1.0, z, color: '#dfe2e4' });
  // trays of food under a warm heat lamp
  for (let k = -1; k <= 1; k++) box(s, { w: 0.55, h: 0.08, d: 0.7, x: inner, y: 1.05, z: z + k * 0.85, material: glow(food, 0.55), shadow: false });
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 2.6), glow('#ffb560', 2.4));
  lamp.position.set(inner, 2.15, z); s.add(lamp);
  // menu board above
  sign(s, {
    w: 2.8, h: 0.55, x: side * (face + 1.95), y: 2.55, z, rotY: -side * Math.PI / 2, emissive: 1.0,
    draw: (g, w, h) => { g.fillStyle = bg; g.fillRect(0, 0, w, h); fitText(g, name, w / 2, h / 2, w * 0.92, h * 0.6, '700 {s}px "IBM Plex Sans", Arial, sans-serif', '#fff8e6'); },
  });
  ch.colliders.push({ minX: Math.min(inner - 0.5, inner + 0.5), maxX: Math.max(inner - 0.5, inner + 0.5), minZ: z - 1.5, maxZ: z + 1.5 });
  const vendor = personMesh({ top: '#e7e2d8', bottom: '#3a3a44', longHair: false });
  vendor.position.set(side * (face + 1.75), 0, z); vendor.rotation.y = side * Math.PI / 2; s.add(vendor);
  if (steam) ch.steamAt = (ch.steamAt || []).concat([[inner, 1.2, z]]);
  return inner;
}

export function buildStreet(ch) {
  const scene = ch.scene, s = new THREE.Group();   // static parts go in s and get merged at the end
  ch.streetStatic = s;
  const { z0, z1, face, cross, crossW } = STREET;
  const len = z0 - z1, midZ = (z0 + z1) / 2;
  const nearCross = (z, pad = 0) => Math.abs(z - cross) < crossW / 2 + pad;

  // road, curbs, arcade paving, cross street with the yellow box junction
  ground(s, { w: 9, d: len, z: midZ, y: 0.035, color: '#55575c', texName: 'asphalt', scale: 4 });
  [-1, 1].forEach((sd) => {
    ground(s, { w: face - 4.5, d: len, x: sd * (4.5 + (face - 4.5) / 2), z: midZ, y: 0.04, color: '#6b6c70', texName: 'asphalt', scale: 3 });
    ground(s, { w: 2.2, d: len, x: sd * (face + 1.1), z: midZ, y: 0.06, color: '#a59f96', texName: 'tile', scale: 1 });
    box(s, { w: 0.18, h: 0.12, d: len, x: sd * 4.55, z: midZ, color: '#d8d4cc', shadow: false });
    // red no-parking line by the curb (with gaps for parking bays)
    ground(s, { w: 0.14, d: len, x: sd * 4.75, z: midZ, y: 0.045, color: '#b83a32', texName: 'concrete' });
    // white parking bay ticks for scooters
    for (let z = z0 - 2; z > z1; z -= 1.1) if (!nearCross(z, 1)) ground(s, { w: 2.1, d: 0.06, x: sd * 6.0, z, y: 0.046, color: '#d8d6d0', texName: 'concrete' });
  });
  ground(s, { w: 52, d: crossW, x: 0, z: cross, y: 0.036, color: '#55575c', texName: 'asphalt', scale: 4 });
  // yellow box: outline plus diagonal grid
  const yb = canvasTexture(512, 512, (g, W, H) => {
    g.clearRect(0, 0, W, H); g.strokeStyle = '#f2c230'; g.lineWidth = 12;
    g.strokeRect(8, 8, W - 16, H - 16);
    g.save(); g.beginPath(); g.rect(8, 8, W - 16, H - 16); g.clip();
    for (let k = -W; k < W * 2; k += 64) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + H, H); g.stroke(); g.beginPath(); g.moveTo(k, H); g.lineTo(k + H, 0); g.stroke(); }
    g.restore();
  });
  const ybox = new THREE.Mesh(new THREE.PlaneGeometry(9, crossW - 1), new THREE.MeshLambertMaterial({ map: yb, transparent: true, emissive: '#ffffff', emissiveMap: yb, emissiveIntensity: 0.25, depthWrite: false }));
  ybox.rotation.x = -Math.PI / 2; ybox.position.set(0, 0.05, cross); s.add(ybox);
  // zebra crossings either side of the junction
  [cross + crossW / 2 + 1.6, cross - crossW / 2 - 1.6].forEach((zc) => {
    for (let x = -4; x <= 4; x += 0.9) ground(s, { w: 0.5, d: 2.6, x, z: zc, y: 0.048, color: '#e8e6e0', texName: 'concrete' });
  });
  // stop lines and painted 慢 → SLOW
  ground(s, { w: 4.2, d: 0.25, x: 2.2, z: cross + crossW / 2 + 3.2, y: 0.048, color: '#e8e6e0', texName: 'concrete' });
  const slow = canvasTexture(256, 512, (g, W, H) => { g.fillStyle = '#ece9e1'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '700 150px "IBM Plex Sans", Arial'; g.save(); g.translate(W / 2, H / 2); g.scale(1, 1.9); g.fillText('SLOW', 0, 0); g.restore(); });
  const slowM = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 3.4), new THREE.MeshLambertMaterial({ map: slow, transparent: true, depthWrite: false }));
  slowM.rotation.x = -Math.PI / 2; slowM.position.set(2.2, 0.05, cross + crossW / 2 + 6.5); s.add(slowM);

  // ---- buildings on both sides
  const special = new Map([
    // west (side -1)
    ['-1:-164', { name: 'FRIED CHICKEN', bg: '#c8302a' }],
    ['-1:-172.4', { name: 'SCALLION PANCAKE', bg: '#e08a2a' }],
    ['1:-164', { name: 'BUBBLE TEA', bg: '#1f9a62' }],
    ['1:-172.4', { name: 'BRAISED SNACKS', bg: '#7a2a5a' }],
    ['1:-180.8', { name: 'PHOTO STICKERS', bg: '#d63a8e' }],
  ]);
  ch.neon = [];
  [-1, 1].forEach((side) => {
    let i = 0;
    for (let z = z0 - 7.8; z > z1 + 2; z -= 4.2, i++) {
      if (nearCross(z, 2.2)) continue;
      const key = `${side}:${(Math.round(z * 10) / 10)}`;
      const sp = special.get(key);
      const seed = (Math.sin(i * 12.9898 + side * 78.233) * 43758.5453) % 1;
      const r = Math.abs(seed);
      const floors = sp ? 4 + (i % 2) : 4 + Math.floor(r * 4);
      townhouse(s, ch.colliders, {
        side, face: side * face, z, floors, depth: 10, seed: r, signs: false,
        open: r > 0.25, shop: sp ? { name: sp.name, bg: sp.bg, fg: '#fff8e6' } : (r > 0.35 ? { name: SHOPS[i % SHOPS.length], bg: pick(['#f4efe2', '#203a6b', '#fff4c8', '#2b2b30']), fg: pick(['#a3271f', '#1f5a8a', '#ffffff']) } : null),
      });
      // awning over the arcade mouth on some shops
      if (r > 0.45 || sp) awning(s, { x: side * (face - 0.4), y: 2.85, z, w: 3.9, depth: 0.9, rotY: side < 0 ? -Math.PI / 2 : Math.PI / 2, color: sp ? sp.bg : pick(['#2a5a8a', '#a8443a', '#3d6e4a', '#8a7a3a']) });
      // a stack of vertical lit signs on most buildings
      const n = sp ? 1 : (r > 0.2 ? 1 + (r > 0.6 ? 1 : 0) : 0);
      for (let k = 0; k < n; k++) {
        const h = rand(2.6, 4.6);
        const sx = side * (face - 0.55);
        const sz = z + (k === 0 ? -1.4 : 1.2);
        const y = 3.6 + h / 2 + rand(0, 2.6);
        const m = vSign(s, { x: sx, y, z: sz, text: sp && k === 0 ? sp.name : NAMES[(i * 3 + k * 7 + (side > 0 ? 5 : 0)) % NAMES.length], bg: sp ? sp.bg : NEON[(i + k * 3 + (side > 0 ? 2 : 0)) % NEON.length], h });
        box(s, { w: 0.6, h: 0.06, d: 0.06, x: side * (face - 0.25), y: y + h / 2 - 0.3, z: sz, color: '#4a4a4e', shadow: false });
        box(s, { w: 0.6, h: 0.06, d: 0.06, x: side * (face - 0.25), y: y - h / 2 + 0.3, z: sz, color: '#4a4a4e', shadow: false });
        if (r > 0.82 && !sp) ch.neon.push({ m, base: 1.25, ph: rand(0, 6) });
      }
      // flat billboards on the upper floors now and then
      if (!sp && r < 0.18) {
        sign(s, {
          w: 3.6, h: 1.6, x: side * (face - 0.06), y: 3.2 * 2 + 1.5, z, rotY: side > 0 ? -Math.PI / 2 : Math.PI / 2, emissive: 0.9,
          draw: (g, w, h) => { g.fillStyle = pick(NEON); g.fillRect(0, 0, w, h); fitText(g, pick(['ENGLISH CLASS', 'GUESTHOUSE', 'BIKE SHOP', 'GYM 24H']), w / 2, h / 2, w * 0.86, h * 0.36, '700 {s}px "IBM Plex Sans", Arial', '#fff'); },
        });
      }
    }
  });

  // ---- scooters packed along both curbs, nose to the shops (gaps for the junction and the food stops)
  const keepClear = (z) => nearCross(z, 2) || (z < -160 && z > -176);
  [-1, 1].forEach((side) => {
    for (let z = z0 - 2.4; z > z1 + 1; z -= 0.72) {
      if (keepClear(z) || Math.random() < 0.08) continue;
      scooter(s, { x: side * rand(5.8, 6.1), z, rotY: side * Math.PI / 2 + rand(-0.18, 0.18) });
    }
    // a solid barrier so the player stays on the road or in the arcade, with gaps
    let start = null;
    for (let z = z0 - 2.4; z > z1; z -= 0.72) {
      const clear = keepClear(z);
      if (!clear && start === null) start = z;
      if ((clear || z - 0.72 <= z1) && start !== null) { ch.colliders.push({ minX: side > 0 ? 5.2 : -6.8, maxX: side > 0 ? 6.8 : -5.2, minZ: z, maxZ: start }); start = null; }
    }
  });
  // poles and wires, street lamps on the poles
  powerLine(s, { x: 4.9, z0: z0 - 6, z1, every: 26, height: 10 });
  powerLine(s, { x: -4.9, z0: z0 - 19, z1, every: 26, height: 9.4 });
  for (let z = z0 - 10; z > z1; z -= 26) {
    streetLamp(s, { x: 4.9, z, rotY: -Math.PI / 2, height: 8, color: '#ffdca8', light: Math.abs(z - cross) < 15 });
    ch.colliders.push({ minX: 4.7, maxX: 5.1, minZ: z - 0.2, maxZ: z + 0.2 });
  }
  // wires across the street and down the side street
  const wireMat = new THREE.LineBasicMaterial({ color: '#16161b' });
  for (let z = z0 - 6; z > z1; z -= 26) {
    [0, 0.5, 1].forEach((o) => {
      const pts = [];
      for (let k = 0; k <= 10; k++) { const f = k / 10; pts.push(new THREE.Vector3(-4.9 + 9.8 * f, 9 + o * 0.4 - Math.sin(f * Math.PI) * 0.6, z - 13 * f)); }
      s.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wireMat));
    });
  }
  // traffic light at the junction
  [[4.9, cross + crossW / 2 + 0.6, -1], [-4.9, cross - crossW / 2 - 0.6, 1]].forEach(([x, z, d]) => {
    tbox(s, { w: 0.2, h: 5.4, d: 0.2, x, z, color: '#8a8d90', texName: 'concrete' });
    box(s, { w: 3.4, h: 0.14, d: 0.14, x: x - Math.sign(x) * 1.7, y: 5.3, z, color: '#8a8d90' });
    const head = box(s, { w: 1.1, h: 0.4, d: 0.32, x: x - Math.sign(x) * 3.0, y: 5.0, z, color: '#2a2b2e' });
    [-0.35, 0, 0.35].forEach((dx, k) => {
      const b = new THREE.Mesh(new THREE.CircleGeometry(0.12, 12), k === 1 ? glow('#ffb12a', 2.5) : mat('#3a3b3e'));
      b.position.set(head.position.x + dx, 5.0, z + d * 0.17); if (d < 0) b.rotation.y = Math.PI; s.add(b);
    });
  });

  // ---- the shops the story uses
  counter(ch, { side: -1, z: -164, name: 'FRIED CHICKEN · OPEN TILL 2', bg: '#c8302a', food: '#d08a3a', steam: true });
  counter(ch, { side: -1, z: -172.4, name: 'SCALLION PANCAKE', bg: '#e08a2a', food: '#e0b25a' });
  counter(ch, { side: 1, z: -164, name: 'BUBBLE TEA · LESS ICE OK', bg: '#1f9a62', food: '#c9a27a' });
  counter(ch, { side: 1, z: -172.4, name: 'BRAISED SNACKS', bg: '#7a2a5a', food: '#8a4a2a', steam: true });
  const fl = new THREE.PointLight('#ffbf7a', 16, 9, 1.6); fl.position.set(-8.6, 2.4, -168); s.add(fl);
  const fl2 = new THREE.PointLight('#d9ffe8', 10, 9, 1.6); fl2.position.set(8.6, 2.4, -168); s.add(fl2);

  // steam over the cooking counters
  const steamMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.12, depthWrite: false });
  ch.steam = [];
  (ch.steamAt || []).forEach(([x, y, z]) => {
    for (let k = 0; k < 5; k++) {
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 6), steamMat.clone());
      p.position.set(x, y, z); scene.add(p); ch.steam.push({ p, x, y, z, ph: k / 5 });
    }
  });
  ch.updaters.push((dt, t) => {
    ch.steam.forEach((st) => {
      const f = (t * 0.35 + st.ph) % 1;
      st.p.position.set(st.x + Math.sin(t + st.ph * 9) * 0.2, st.y + 0.3 + f * 1.8, st.z + Math.cos(t * 0.7 + st.ph * 5) * 0.3);
      st.p.scale.setScalar(0.6 + f * 1.8); st.p.material.opacity = 0.14 * (1 - f);
    });
    ch.neon.forEach((n) => { n.m.material.emissiveIntensity = n.base * (Math.sin(t * 13 + n.ph) > -0.85 ? 1 : 0.25); });
  });

  ch.thing('stall', -7.4, -164, 2.6, 'Order fried chicken for everyone', {
    once: true, view: { move: [-7.6, -164], look: [-9.45, 1.1, -164], hold: 3.5 }, action: () => ch.buyFood(),
  });
  ch.thing('tea', 7.4, -164, 2.4, 'Look at the bubble tea menu', { lines: ['Half sugar, less ice. Everybody has an order they never change.'], view: { move: [7.6, -164], look: [10.45, 2.55, -164], hold: 3.5 } });
  ch.thing('pancake', -7.4, -172.4, 2.4, 'Watch the scallion pancake', { lines: ['The auntie flips four at once and still remembers who wanted egg.'], view: { move: [-7.6, -172.4], look: [-9.45, 1.05, -172.4], hold: 3.5 } });
  ch.thing('junction', 0, cross + crossW / 2 + 4, 4, 'Look down the street', { lines: ['Every sign is lit. At midnight this street is brighter than campus.'], view: { look: [0, 7, z1], hold: 4 } });

  // ---- the photo sticker booth inside the shop on the east side
  const bz = -180.8, bx = face + 0.9;
  tbox(s, { w: 1.1, h: 2.3, d: 2.4, x: bx + 0.55, z: bz, color: '#f1e8f0', texName: 'tile' });
  const curtain = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.9), glow('#ff6ea3', 0.8));
  curtain.position.set(bx + 0.04, 1.05, bz); curtain.rotation.y = -Math.PI / 2; s.add(curtain);
  sign(s, {
    w: 2.2, h: 0.45, x: bx + 0.03, y: 2.05, z: bz, rotY: -Math.PI / 2, emissive: 1.0,
    draw: (g, w, h) => { g.fillStyle = '#2b1a2e'; g.fillRect(0, 0, w, h); fitText(g, 'PHOTO · 4 SHOTS', w / 2, h / 2, w * 0.9, h * 0.55, '600 {s}px "IBM Plex Mono", monospace', '#ff9ac2'); },
  });
  ch.colliders.push({ minX: bx, maxX: bx + 1.1, minZ: bz - 1.2, maxZ: bz + 1.2 });
  ch.thing('booth', face - 0.4, bz, 2.2, 'Squeeze into the photo booth', {
    once: true, view: { move: [face - 0.1, bz], look: [bx + 1.2, 1.4, bz], hold: 4 },
    action: () => { [0, 900, 1800, 2700].forEach((ms) => setTimeout(() => { ch.flash = 1; ch.audio.blip(); }, 1200 + ms)); setTimeout(() => ch.keepsake('strip'), 4200); },
  });
  ch.flashLight = new THREE.PointLight('#ffffff', 0, 12, 1.2); ch.flashLight.position.set(face - 0.2, 2, bz); scene.add(ch.flashLight);

  // ---- people: students queuing, walking, riding
  ch.stallCrowd = crowd(scene, [
    { x: -7.9, z: -163.2, rotY: -Math.PI / 2, top: '#3a3a44', bag: true }, { x: -7.6, z: -165.2, rotY: -Math.PI / 2 + 0.3, top: '#a54a3e' },
    { x: 7.9, z: -163.4, rotY: Math.PI / 2, top: '#5c6f8a' }, { x: 7.7, z: -165, rotY: Math.PI / 2 - 0.4, top: '#d9c38f', bag: true },
    { x: 7.8, z: -172.4, rotY: Math.PI / 2, top: '#2f3b33' },
    { path: [[-9.4, -156], [-9.4, -300]], loop: true, speed: 1.1, top: '#e7e2d8' },
    { path: [[9.4, -300], [9.4, -156]], loop: true, speed: 1.0, top: '#3a5a8a', bag: true },
    { path: [[-9.2, -290], [-9.2, -158]], loop: true, speed: 0.9, top: '#6b5b4b' },
    { path: [[-30, cross - 3], [30, cross - 3]], loop: true, speed: 1.2, top: '#a54a3e' },
  ]);
  ch.updaters.push((dt, t) => ch.stallCrowd.update(dt, t));

  const riders = [0, 1, 2, 3, 4].map((k) => ({ m: scooter(scene, { x: 0, z: 0, rider: true }), z: rand(z1, z0), dir: k % 2 ? 1 : -1, sp: rand(6, 9) }));
  const taxi = car(scene, { x: 2.2, z: -260, rotY: Math.PI, taxi: true });
  const tx = { z: -300 };
  const cross1 = car(scene, { x: -30, z: cross - 2.4, rotY: Math.PI / 2 });
  ch.updaters.push((dt, t) => {
    riders.forEach((r) => {
      r.z += r.dir * r.sp * dt; if (r.z < z1) r.z = z0 - 4; if (r.z > z0 - 4) r.z = z1;
      r.m.position.set(r.dir < 0 ? 1.9 : -1.9, 0, r.z); r.m.rotation.y = r.dir < 0 ? Math.PI : 0;
    });
    tx.z += dt * 5; if (tx.z > z0 - 6) tx.z = z1;
    taxi.position.set(-2.2, 0, tx.z); taxi.rotation.y = 0;
    cross1.position.x = ((t * 7) % 60) - 30;
  });
  bakeStatic(scene, s);
}
