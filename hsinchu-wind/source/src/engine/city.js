// Big-area builder. Whole districts (hundreds of buildings, streets, lamps,
// trees) are merged into a handful of meshes so the maps can be large and
// still run smoothly. Also: road guide signs and the goal light beam.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { tex, mat, glow, sign, fitText, rand, pick, toon } from './kit.js';

// ---------------------------------------------------------------------------
// Facade textures: 4 bays (4.2 m each) x 4 floors (3.2 m each) per tile.
// ---------------------------------------------------------------------------
export const BAY = 4.2, FLOOR = 3.2;
const FACADES = {
  cream: '#ece2cc', pink: '#e6cbc3', green: '#cfd9c8', grey: '#cdd0d4', sand: '#e2d3b4', white: '#efeee9', blue: '#c6d3dc', brick: '#c9a08a',
};
const facadeCache = {};
function facadeTextures(style) {
  if (facadeCache[style]) return facadeCache[style];
  const S = 512, bw = S / 4, fh = S / 4;
  const base = FACADES[style] || FACADES.cream;
  const c = document.createElement('canvas'); c.width = c.height = S;
  const e = document.createElement('canvas'); e.width = e.height = S;
  const g = c.getContext('2d'), ge = e.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, S, S);
  ge.fillStyle = '#000'; ge.fillRect(0, 0, S, S);
  // small strip tiles
  g.globalAlpha = 0.18;
  for (let y = 0; y < S; y += 6) { g.fillStyle = '#ffffff'; g.fillRect(0, y, S, 1); }
  for (let y = 0; y < S; y += 12) for (let x = (y / 12) % 2 ? 0 : 12; x < S; x += 24) { g.fillStyle = '#7a7060'; g.fillRect(x, y, 1, 6); }
  g.globalAlpha = 1;
  for (let fl = 0; fl < 4; fl++) {
    // floor slab line
    g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, fl * fh + fh - 4, S, 4);
    for (let b = 0; b < 4; b++) {
      const x = b * bw, y = fl * fh;
      const wx = x + bw * 0.18, wy = y + fh * 0.22, ww = bw * 0.64, wh = fh * 0.46;
      g.fillStyle = '#3c4654'; g.fillRect(wx, wy, ww, wh);
      g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(wx, wy, ww, wh * 0.35);
      const lit = Math.random() < 0.5;
      if (lit) { ge.fillStyle = pick(['#ffd59a', '#fff0d2', '#ffe2b0', '#d8e8ff']); ge.fillRect(wx + 2, wy + 2, ww - 4, wh - 4); }
      // iron grille
      g.strokeStyle = '#e8e6e0'; g.lineWidth = 2;
      g.strokeRect(wx - 3, wy - 3, ww + 6, wh + 6);
      for (let k = 1; k < 7; k++) { g.beginPath(); g.moveTo(wx + (ww * k) / 7, wy - 3); g.lineTo(wx + (ww * k) / 7, wy + wh + 3); g.stroke(); }
      // AC unit under some windows
      if (Math.random() < 0.45) {
        g.fillStyle = '#f2f2ee'; g.fillRect(wx + ww * 0.62, wy + wh + 6, bw * 0.24, fh * 0.16);
        g.fillStyle = '#9a9c9c'; g.beginPath(); g.arc(wx + ww * 0.62 + bw * 0.17, wy + wh + 6 + fh * 0.08, fh * 0.05, 0, Math.PI * 2); g.fill();
      }
      // rust streak
      if (Math.random() < 0.3) { g.fillStyle = 'rgba(120,90,60,0.12)'; g.fillRect(wx + rand(0, ww), wy + wh, 3, rand(10, 40)); }
    }
  }
  const map = new THREE.CanvasTexture(c), emissiveMap = new THREE.CanvasTexture(e);
  [map, emissiveMap].forEach((t) => { t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; });
  return (facadeCache[style] = { map, emissiveMap });
}

const SHOP_NAMES = ['BREAKFAST', 'PHARMACY', 'HARDWARE', 'NOODLES', 'BARBER', 'STATIONERY', 'SCOOTER REPAIR', 'TEA HOUSE', 'BAKERY', 'OPTICAL', 'CLINIC', 'DUMPLINGS', 'FRUIT', 'LAUNDRY', 'BOOKS', 'BENTO', 'HOT POT', 'TAILOR', 'PHONES', 'RICE NOODLES', 'BUBBLE TEA', 'TOFU PUDDING', 'HAIR SALON', 'CAFE'];
let shopCache = null;
function shopTextures() {
  if (shopCache) return shopCache;
  const W = 1024, H = 256, bw = W / 4;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const e = document.createElement('canvas'); e.width = W; e.height = H;
  const g = c.getContext('2d'), ge = e.getContext('2d');
  ge.fillStyle = '#000'; ge.fillRect(0, 0, W, H);
  for (let b = 0; b < 4; b++) {
    const x = b * bw;
    g.fillStyle = '#d9d3c8'; g.fillRect(x, 0, bw, H);
    const open = b !== 2;
    const signBg = pick(['#b8312b', '#1f5a8a', '#f2c230', '#2c7a4b', '#f4efe2', '#7a2a5a']);
    // header sign band
    g.fillStyle = signBg; g.fillRect(x + 6, 6, bw - 12, H * 0.22);
    ge.fillStyle = '#ffffff'; ge.globalAlpha = 0.55; ge.fillRect(x + 6, 6, bw - 12, H * 0.22); ge.globalAlpha = 1;
    fitText(g, pick(SHOP_NAMES), x + bw / 2, 6 + H * 0.11, bw * 0.86, Math.floor(H * 0.14), '600 {s}px "IBM Plex Sans", Arial, sans-serif', signBg === '#f4efe2' || signBg === '#f2c230' ? '#5a1d10' : '#ffffff');
    if (open) {
      g.fillStyle = '#fff1d6'; g.fillRect(x + 10, H * 0.3, bw - 20, H * 0.7);
      ge.fillStyle = pick(['#ffe8c0', '#fff4e0', '#e8f2ff']); ge.fillRect(x + 10, H * 0.3, bw - 20, H * 0.7);
      g.fillStyle = 'rgba(80,60,40,0.35)';
      for (let k = 0; k < 4; k++) g.fillRect(x + 20 + k * (bw - 40) / 4, H * 0.55, (bw - 60) / 4, H * 0.3);
    } else {
      g.fillStyle = '#c9cbc9'; g.fillRect(x + 10, H * 0.3, bw - 20, H * 0.7);
      g.fillStyle = 'rgba(70,70,70,0.4)';
      for (let y = H * 0.3; y < H; y += 7) g.fillRect(x + 10, y, bw - 20, 2);
    }
  }
  const map = new THREE.CanvasTexture(c), emissiveMap = new THREE.CanvasTexture(e);
  [map, emissiveMap].forEach((t) => { t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; });
  return (shopCache = { map, emissiveMap });
}

// ---------------------------------------------------------------------------
// Geometry buckets
// ---------------------------------------------------------------------------
function quad(p0, p1, p2, p3, u, v) {
  // p0 bottom-left, p1 bottom-right, p2 top-right, p3 top-left
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([...p0, ...p1, ...p2, ...p3], 3));
  const n = new THREE.Vector3().subVectors(new THREE.Vector3(...p1), new THREE.Vector3(...p0))
    .cross(new THREE.Vector3().subVectors(new THREE.Vector3(...p3), new THREE.Vector3(...p0))).normalize();
  g.setAttribute('normal', new THREE.Float32BufferAttribute([...n.toArray(), ...n.toArray(), ...n.toArray(), ...n.toArray()], 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, u, 0, u, v, 0, v], 2));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  return g;
}

export class CityBuilder {
  constructor(scene, colliders, { nightGlow = 0.8 } = {}) {
    this.scene = scene;
    this.colliders = colliders;
    this.nightGlow = nightGlow;
    this.buckets = new Map();
  }

  add(key, geo) {
    if (!this.buckets.has(key)) this.buckets.set(key, []);
    this.buckets.get(key).push(geo);
  }

  material(key) {
    if (key.startsWith('facade:')) {
      const { map, emissiveMap } = facadeTextures(key.slice(7));
      return toon({ map, emissiveMap, emissive: '#ffffff', emissiveIntensity: this.nightGlow });
    }
    if (key === 'shop') {
      const { map, emissiveMap } = shopTextures();
      return toon({ map, emissiveMap, emissive: '#ffffff', emissiveIntensity: 0.25 + this.nightGlow * 0.75 });
    }
    const table = {
      roof: () => mat('#b9b4aa', { map: tex('concrete') }),
      tank: () => mat('#d1d6db'),
      tin: () => mat('#5f7f9f'),
      asphalt: () => mat('#7f8186', { map: tex('asphalt') }),
      sidewalk: () => mat('#c6bfb3', { map: tex('pavers') }),
      paint: () => mat('#ece7da'),
      pole: () => mat('#5d6266'),
      bulb: () => glow('#ffdcaa', 2.2),
      trunk: () => mat('#5b4a3b'),
      leaf: () => mat('#5f8a3e'),
      leafDark: () => mat('#355a32'),
      grass: () => mat('#7d8f5c', { map: tex('grass') }),
      field: () => mat('#9aa055', { map: tex('grass') }),
      concrete: () => mat('#d2ccc1', { map: tex('concrete') }),
      wall: () => mat('#e7e1d6', { map: tex('tile') }),
    };
    return (table[key] || (() => mat('#999')))();
  }

  // A building box: textured facade on all sides, optional shopfront ground floor.
  building({ x, z, w, d, floors = 3, style = 'cream', shop = false, tank = true, collide = true }) {
    const h = floors * FLOOR;
    const x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2;
    const yb = shop ? FLOOR : 0;
    const vU = (len) => len / (BAY * 4), vV = (hh) => hh / (FLOOR * 4);
    const fkey = 'facade:' + style;
    const off = rand(0, 4) * BAY; // vary which bay the texture starts on
    const side = (a, b, y0, y1, key, uScale, vScale) => {
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const geo = quad([a[0], y0, a[1]], [b[0], y0, b[1]], [b[0], y1, b[1]], [a[0], y1, a[1]], uScale(len), vScale(y1 - y0));
      const uv = geo.attributes.uv;
      for (let i = 0; i < 4; i++) uv.setX(i, uv.getX(i) + off / (BAY * 4));
      this.add(key, geo);
    };
    // four sides (counter-clockwise seen from above so normals face out)
    const sides = [[[x0, z1], [x1, z1]], [[x1, z1], [x1, z0]], [[x1, z0], [x0, z0]], [[x0, z0], [x0, z1]]];
    for (const [a, b] of sides) {
      side(a, b, yb, h, fkey, vU, vV);
      if (shop) side(a, b, 0, FLOOR, 'shop', vU, () => 1);
    }
    // roof
    this.add('roof', quad([x0, h, z1], [x1, h, z1], [x1, h, z0], [x0, h, z0], w / 4, d / 4));
    if (tank && floors <= 6 && Math.random() < 0.6) {
      const t = new THREE.CylinderGeometry(0.55, 0.55, 1.3, 10);
      t.rotateZ(Math.PI / 2); t.translate(x + rand(-w / 4, w / 4), h + 1.25, z + rand(-d / 4, d / 4));
      this.add('tank', t);
    }
    if (floors <= 5 && Math.random() < 0.3) {
      const a = new THREE.BoxGeometry(w * 0.6, 2.2, d * 0.5);
      a.translate(x + rand(-w / 5, w / 5), h + 1.1, z + rand(-d / 5, d / 5));
      this.add('tin', a);
    }
    if (collide) this.colliders.push({ minX: x0, maxX: x1, minZ: z0, maxZ: z1 });
  }

  ground(key, x, z, w, d, y = 0.02, scale = 4) {
    const x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2;
    this.add(key, quad([x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0], w / scale, d / scale));
  }

  lamp(x, z, rotY = 0, height = 7) {
    const p = new THREE.BoxGeometry(0.18, height, 0.18); p.translate(x, height / 2, z); this.add('pole', p);
    const arm = new THREE.BoxGeometry(0.12, 0.12, 1.6); arm.translate(0, height - 0.1, 0.75);
    arm.rotateY(rotY); arm.translate(x, 0, z); this.add('pole', arm);
    const b = new THREE.BoxGeometry(0.35, 0.12, 0.6); b.translate(0, height - 0.18, 1.4); b.rotateY(rotY); b.translate(x, 0, z); this.add('bulb', b);
  }

  tree(x, z, s = 1, dark = false) {
    const t = new THREE.CylinderGeometry(0.2 * s, 0.32 * s, 3 * s, 6); t.translate(x, 1.5 * s, z); this.add('trunk', t);
    for (let i = 0; i < 3; i++) {
      const b = new THREE.IcosahedronGeometry(rand(1.3, 2) * s, 2);
      b.scale(1, 0.75, 1); b.translate(x + rand(-1, 1) * s, 3.2 * s + rand(0, 1.2) * s, z + rand(-1, 1) * s);
      this.add(dark ? 'leafDark' : 'leaf', b);
    }
  }

  finish() {
    for (const [key, list] of this.buckets) {
      const geo = mergeGeometries(list, false);
      list.forEach((g) => g.dispose());
      if (!geo) continue;
      const m = new THREE.Mesh(geo, this.material(key));
      m.castShadow = !['asphalt', 'sidewalk', 'paint', 'grass', 'field', 'bulb'].includes(key);
      m.receiveShadow = true;
      this.scene.add(m);
    }
    this.buckets.clear();
  }
}

// ---------------------------------------------------------------------------
// District filler: a street grid of blocks lined with buildings.
// `avoid` rectangles are kept clear (the hand-built story places).
// ---------------------------------------------------------------------------
const overlaps = (a, b) => a.minX < b.maxX && a.maxX > b.minX && a.minZ < b.maxZ && a.maxZ > b.minZ;

export function district(cb, { minX, maxX, minZ, maxZ, avoid = [], block = [44, 56], street = 9, floors = [3, 5], tall = 0.12, tallFloors = [8, 16], styles, shops = 0.5, trees = 0.4, lamps = true, roads = true }) {
  const styleList = styles || Object.keys(FACADES);
  const blocks = [];
  if (roads) cb.ground('asphalt', (minX + maxX) / 2, (minZ + maxZ) / 2, maxX - minX, maxZ - minZ, 0.012, 4);
  for (let bx = minX + street; bx < maxX - 10; bx += 0) {
    const bw = rand(block[0], block[1]);
    for (let bz = minZ + street; bz < maxZ - 10; bz += 0) {
      const bd = rand(block[0], block[1]);
      const r = { minX: bx, maxX: Math.min(bx + bw, maxX - street), minZ: bz, maxZ: Math.min(bz + bd, maxZ - street) };
      bz += bd + street;
      if (r.maxX - r.minX < 16 || r.maxZ - r.minZ < 16) continue;
      if (avoid.some((a) => overlaps(r, { minX: a.minX - 2, maxX: a.maxX + 2, minZ: a.minZ - 2, maxZ: a.maxZ + 2 }))) continue;
      blocks.push(r);
    }
    bx += bw + street;
  }
  for (const r of blocks) {
    // sidewalk ring
    cb.ground('sidewalk', (r.minX + r.maxX) / 2, (r.minZ + r.maxZ) / 2, r.maxX - r.minX + 3, r.maxZ - r.minZ + 3, 0.03, 2);
    const depth = rand(9, 12);
    const placeRow = (ax, az, len, alongX, inward) => {
      let t = 0;
      while (t < len - 3.5) {
        const w = Math.min(len - t, rand(4.2, 6.5));
        const isTall = Math.random() < tall;
        const fl = isTall ? Math.floor(rand(tallFloors[0], tallFloors[1])) : Math.floor(rand(floors[0], floors[1] + 1));
        const dd = isTall ? Math.min(depth * 1.6, 18) : depth;
        const cx = alongX ? ax + t + w / 2 : ax + inward * dd / 2;
        const cz = alongX ? az + inward * dd / 2 : az + t + w / 2;
        cb.building({ x: cx, z: cz, w: alongX ? w : dd, d: alongX ? dd : w, floors: fl, style: pick(styleList), shop: !isTall && Math.random() < shops });
        t += w;
      }
    };
    const W = r.maxX - r.minX, D = r.maxZ - r.minZ;
    placeRow(r.minX, r.maxZ, W, true, -1);                   // south edge, facing +z
    placeRow(r.minX, r.minZ, W, true, 1);                    // north edge
    if (D > depth * 2 + 6) {
      placeRow(r.minX, r.minZ + depth, D - depth * 2, false, 1);  // west edge
      placeRow(r.maxX, r.minZ + depth, D - depth * 2, false, -1); // east edge
    }
    if (lamps) for (let x = r.minX + 6; x < r.maxX; x += 24) { cb.lamp(x, r.maxZ + 1.2, 0); cb.lamp(x + 12, r.minZ - 1.2, Math.PI); }
    if (Math.random() < trees) for (let x = r.minX + 3; x < r.maxX; x += 8) cb.tree(x, r.maxZ + 1.0, rand(0.7, 1.0));
    // street centre dashes
    for (let x = r.minX; x < r.maxX; x += 6) cb.ground('paint', x, r.maxZ + street / 2, 3, 0.15, 0.025, 1);
    for (let z = r.minZ; z < r.maxZ; z += 6) cb.ground('paint', r.maxX + street / 2, z, 0.15, 3, 0.025, 1);
  }
  return blocks;
}

// ---------------------------------------------------------------------------
// Road guide sign: blue boards with white text and arrows (Taiwan city style).
// entries: [{ text, dir: 'up' | 'left' | 'right' | 'upleft' | 'upright', dist }]
// ---------------------------------------------------------------------------
export function signpost(parent, { x, z, rotY = 0, entries, color = '#1d4f91', height = 3.4 }) {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, height + 0.4, 8), mat('#8a9096'));
  pole.position.y = (height + 0.4) / 2; pole.castShadow = true; g.add(pole);
  const bh = 0.55, bw = 2.6;
  const flip = { up: 'down', down: 'up', left: 'right', right: 'left', upleft: 'downright', upright: 'downleft', downleft: 'upright', downright: 'upleft' };
  const glyph = { up: '↑', left: '←', right: '→', upleft: '↖', upright: '↗', down: '↓', downleft: '↙', downright: '↘' };
  const board = (en, dir, y, back) => sign(g, {
    w: bw, h: bh, x: 0, y, z: back ? -0.04 : 0.04, rotY: back ? Math.PI : 0, emissive: 0.55, px: 128,
    draw: (c, W, H) => {
      c.fillStyle = color; c.fillRect(0, 0, W, H);
      c.strokeStyle = '#ffffff'; c.lineWidth = 3; c.strokeRect(4, 4, W - 8, H - 8);
      const right = dir === 'right' || dir === 'upright' || dir === 'downright';
      c.fillStyle = '#fff'; c.textBaseline = 'middle';
      c.font = `700 ${H * 0.62}px "IBM Plex Sans", Arial, sans-serif`;
      c.textAlign = right ? 'right' : 'left';
      c.fillText(glyph[dir] || '', right ? W - 14 : 14, H / 2);
      const tx = right ? 16 : H * 0.75;
      c.textAlign = 'left';
      const label = en.dist && !back ? `${en.text}  ${en.dist}` : en.text;
      let sz = H * 0.36;
      c.font = `600 ${sz}px "IBM Plex Sans", Arial, sans-serif`;
      while (c.measureText(label).width > W - tx - (right ? H * 0.8 : 16) && sz > 10) { sz -= 1; c.font = `600 ${sz}px "IBM Plex Sans", Arial, sans-serif`; }
      c.fillText(label, tx, H / 2 + 1);
    },
  });
  entries.forEach((en, i) => {
    const y = height - i * (bh + 0.08);
    board(en, en.dir, y, false);
    board(en, flip[en.dir] || en.dir, y, true);
  });
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  parent.add(g);
  return g;
}

// ---------------------------------------------------------------------------
// Goal beam: a soft column of light over the current objective.
// ---------------------------------------------------------------------------
export function goalBeam(parent) {
  const g = new THREE.Group();
  const beamMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uTime: { value: 0 }, uAlpha: { value: 1 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform float uTime; uniform float uAlpha; varying vec2 vUv;
      void main(){ float edge = 1.0 - abs(vUv.x - 0.5) * 2.0; float fade = (1.0 - vUv.y) * smoothstep(0.0, 0.05, vUv.y);
        float pulse = 0.75 + 0.25 * sin(uTime * 2.0 - vUv.y * 12.0);
        gl_FragColor = vec4(vec3(1.0, 0.86, 0.45) * pulse, edge * edge * fade * 0.55 * uAlpha); }`,
  });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 60, 16, 1, true), beamMat);
  beam.position.y = 30;
  g.add(beam);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.15, 40), new THREE.MeshBasicMaterial({ color: '#ffe08a', transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.06;
  g.add(ring);
  g.visible = false;
  parent.add(g);
  return {
    group: g,
    set(target, y = 0) {
      if (!target) { g.visible = false; return; }
      g.visible = true; g.position.set(target[0], y, target[1]);
    },
    update(t, dist) {
      beamMat.uniforms.uTime.value = t;
      beamMat.uniforms.uAlpha.value = Math.min(1, Math.max(0, (dist - 4) / 12));
      ring.material.opacity = 0.35 + 0.25 * Math.sin(t * 3);
      ring.scale.setScalar(1 + 0.1 * Math.sin(t * 3));
    },
  };
}
