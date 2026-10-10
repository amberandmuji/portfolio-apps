// Hsinchu building kit shared by every chapter.
// Procedural textures (wall tiles, mosaic, concrete, asphalt, brick, pavers),
// sky presets with drifting clouds, townhouses (透天厝) with arcades, iron
// window grilles, AC units and shop signs, scooters, cars, people, trees,
// street lamps, power lines, and rice that moves in the wind.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export { rand, pick };

// ---------------------------------------------------------------------------
// Textures (generated once, light-toned so a material color can tint them)
// ---------------------------------------------------------------------------
function makeCanvasTex(size, draw, repeat = true) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

function speckle(g, s, n, alpha, light = false) {
  for (let i = 0; i < n; i++) {
    const v = light ? 255 : Math.floor(rand(60, 140));
    g.fillStyle = `rgba(${v},${v},${v},${rand(0, alpha)})`;
    const r = rand(0.5, 2.2);
    g.fillRect(rand(0, s), rand(0, s), r, r);
  }
}

const TEX = {};
export function tex(name) {
  if (TEX[name]) return TEX[name];
  const draw = {
    // 二丁掛 strip tiles: 1 texture = 1 m
    tile: (g, s) => {
      g.fillStyle = '#d7d4cc'; g.fillRect(0, 0, s, s);
      const rows = 16, cols = 4, th = s / rows, tw = s / cols;
      for (let r = 0; r < rows; r++) {
        const off = (r % 2) * tw / 2;
        for (let c = -1; c <= cols; c++) {
          const v = Math.floor(rand(228, 252));
          g.fillStyle = `rgb(${v},${v - 2},${v - 6})`;
          g.fillRect(c * tw + off + 1.5, r * th + 1.5, tw - 3, th - 3);
        }
      }
      speckle(g, s, 500, 0.25);
    },
    // small square mosaic: 1 texture = 1 m
    mosaic: (g, s) => {
      g.fillStyle = '#cfcbc3'; g.fillRect(0, 0, s, s);
      const n = 32, t = s / n;
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
        const v = Math.floor(rand(222, 252));
        g.fillStyle = `rgb(${v},${v},${v - 3})`;
        g.fillRect(x * t + 1, y * t + 1, t - 2, t - 2);
      }
      speckle(g, s, 400, 0.2);
    },
    concrete: (g, s) => {
      g.fillStyle = '#e6e4df'; g.fillRect(0, 0, s, s);
      for (let i = 0; i < 60; i++) {
        const v = Math.floor(rand(205, 240));
        g.fillStyle = `rgba(${v},${v},${v - 4},0.35)`;
        g.beginPath(); g.arc(rand(0, s), rand(0, s), rand(10, 50), 0, Math.PI * 2); g.fill();
      }
      speckle(g, s, 1800, 0.25);
      // formwork seams
      g.strokeStyle = 'rgba(120,120,120,0.25)'; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(0, s * 0.5); g.lineTo(s, s * 0.5); g.stroke();
    },
    asphalt: (g, s) => {
      g.fillStyle = '#e4e4e4'; g.fillRect(0, 0, s, s);
      speckle(g, s, 9000, 0.45);
      speckle(g, s, 1200, 0.35, true);
      g.strokeStyle = 'rgba(70,70,70,0.35)'; g.lineWidth = 1.2;
      for (let i = 0; i < 4; i++) {
        g.beginPath(); let x = rand(0, s), y = rand(0, s); g.moveTo(x, y);
        for (let k = 0; k < 6; k++) { x += rand(-25, 25); y += rand(-25, 25); g.lineTo(x, y); }
        g.stroke();
      }
      for (let i = 0; i < 3; i++) {
        g.fillStyle = `rgba(90,90,90,${rand(0.08, 0.18)})`;
        g.fillRect(rand(0, s), rand(0, s), rand(30, 90), rand(20, 60));
      }
    },
    brick: (g, s) => {
      g.fillStyle = '#cfc6bb'; g.fillRect(0, 0, s, s);
      const rows = 14, cols = 5, bh = s / rows, bw = s / cols;
      for (let r = 0; r < rows; r++) {
        const off = (r % 2) * bw / 2;
        for (let c = -1; c <= cols; c++) {
          const v = rand(0.85, 1.05);
          g.fillStyle = `rgb(${Math.floor(200 * v)},${Math.floor(140 * v)},${Math.floor(120 * v)})`;
          g.fillRect(c * bw + off + 2, r * bh + 2, bw - 4, bh - 4);
        }
      }
      speckle(g, s, 600, 0.25);
    },
    pavers: (g, s) => {
      g.fillStyle = '#b9b5ae'; g.fillRect(0, 0, s, s);
      const n = 8, t = s / n;
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
        const v = Math.floor(rand(215, 245));
        g.fillStyle = `rgb(${v},${v - 3},${v - 8})`;
        g.fillRect(x * t + 2, y * t + 2, t - 4, t - 4);
      }
      speckle(g, s, 1200, 0.25);
    },
    grass: (g, s) => {
      g.fillStyle = '#d9e0c8'; g.fillRect(0, 0, s, s);
      for (let i = 0; i < 5000; i++) {
        const v = rand(0.75, 1.05);
        g.fillStyle = `rgba(${Math.floor(190 * v)},${Math.floor(215 * v)},${Math.floor(160 * v)},0.6)`;
        g.fillRect(rand(0, s), rand(0, s), 1.2, rand(2, 5));
      }
    },
    track: (g, s) => {
      g.fillStyle = '#e8d2c8'; g.fillRect(0, 0, s, s);
      speckle(g, s, 6000, 0.3);
    },
    shutter: (g, s) => {
      g.fillStyle = '#d4d6d4'; g.fillRect(0, 0, s, s);
      for (let y = 0; y < s; y += 8) { g.fillStyle = 'rgba(80,82,80,0.45)'; g.fillRect(0, y, s, 2); }
      speckle(g, s, 300, 0.3);
    },
    grille: (g, s) => {
      g.clearRect(0, 0, s, s);
      g.strokeStyle = '#e2e0da'; g.lineWidth = s / 24;
      g.strokeRect(2, 2, s - 4, s - 4);
      for (let x = s / 9; x < s; x += s / 9) { g.beginPath(); g.moveTo(x, 2); g.lineTo(x, s - 2); g.stroke(); }
      g.beginPath(); g.moveTo(2, s * 0.5); g.lineTo(s - 2, s * 0.5); g.stroke();
      // the little curl ornament every grandma's grille has
      g.beginPath(); g.arc(s / 2, s * 0.5, s / 10, 0, Math.PI * 2); g.stroke();
    },
    acgrille: (g, s) => {
      g.fillStyle = '#efefec'; g.fillRect(0, 0, s, s);
      g.fillStyle = '#9a9c9c';
      for (let y = s * 0.1; y < s * 0.9; y += s / 14) g.fillRect(s * 0.08, y, s * 0.55, s / 40);
      g.beginPath(); g.arc(s * 0.8, s * 0.5, s * 0.14, 0, Math.PI * 2); g.fill();
    },
  }[name];
  TEX[name] = makeCanvasTex(name === 'grille' || name === 'acgrille' ? 64 : 256, draw, true);
  return TEX[name];
}

// ---------------------------------------------------------------------------
// Materials
// ---------------------------------------------------------------------------
// Soft two-and-a-half tone ramp: painterly light with gentle shadow bands.
let rampTex = null;
export function ramp() {
  if (rampTex) return rampTex;
  const data = new Uint8Array([118, 118, 118, 255, 170, 172, 178, 255, 222, 222, 222, 255, 255, 255, 255, 255]);
  rampTex = new THREE.DataTexture(data, 4, 1, THREE.RGBAFormat);
  rampTex.minFilter = rampTex.magFilter = THREE.LinearFilter;
  rampTex.needsUpdate = true;
  return rampTex;
}
export function toon(opts) {
  const { flatShading, ...rest } = opts; // toon materials shade smoothly
  return new THREE.MeshToonMaterial({ gradientMap: ramp(), ...rest });
}
const matCache = new Map();
export function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts, (k, v) => (v && v.isTexture ? v.uuid : v));
  if (!matCache.has(key)) matCache.set(key, toon({ color, ...opts }));
  return matCache.get(key);
}
export function tmat(color, texName) {
  return mat(color, { map: tex(texName) });
}
export function glow(color, intensity = 1) {
  return mat(color, { emissive: new THREE.Color(color), emissiveIntensity: intensity });
}

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------
const unitBox = new THREE.BoxGeometry(1, 1, 1);
export function box(parent, { w, h, d, x = 0, y = 0, z = 0, color = '#999', material, shadow = true, rotY = 0 }) {
  const m = new THREE.Mesh(unitBox, material || mat(color));
  m.scale.set(w, h, d);
  m.position.set(x, y + h / 2, z);
  m.rotation.y = rotY;
  m.castShadow = shadow;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

// Box whose texture repeats per `scale` meters on every face (no stretching).
export function tbox(parent, { w, h, d, x = 0, y = 0, z = 0, color = '#fff', texName = 'concrete', scale = 1, rotY = 0, shadow = true, material }) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const uv = geo.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) {
    for (let k = 0; k < 4; k++) {
      const i = f * 4 + k;
      uv.setXY(i, uv.getX(i) * dims[f][0] / scale, uv.getY(i) * dims[f][1] / scale);
    }
  }
  const m = new THREE.Mesh(geo, material || tmat(color, texName));
  m.position.set(x, y + h / 2, z);
  m.rotation.y = rotY;
  m.castShadow = shadow;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

// Flat textured ground patch.
export function ground(parent, { w, d, x = 0, z = 0, y = 0.01, color = '#fff', texName = 'concrete', scale = 2, rotY = 0 }) {
  const geo = new THREE.PlaneGeometry(w, d);
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / scale, uv.getY(i) * d / scale);
  const m = new THREE.Mesh(geo, tmat(color, texName));
  m.rotation.set(-Math.PI / 2, 0, rotY);
  m.position.set(x, y, z);
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

export function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// A lit sign (plane) with canvas-drawn content.
export function sign(parent, { w, h, x, y, z, rotY = 0, draw, px = 256, emissive = 0.6, double = false }) {
  const t = canvasTexture(Math.round(px * (w / h)), px, draw);
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshLambertMaterial({ map: t, emissive: '#ffffff', emissiveMap: t, emissiveIntensity: emissive, side: double ? THREE.DoubleSide : THREE.FrontSide }),
  );
  m.position.set(x, y, z);
  m.rotation.y = rotY;
  parent.add(m);
  return m;
}

// Text helper for signs. Draws centered text that fits the width.
export function fitText(g, text, x, y, maxW, size, font, color) {
  g.fillStyle = color;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  let s = size;
  do { g.font = `${font.replace('{s}', s)}`; s -= 2; } while (g.measureText(text).width > maxW && s > 8);
  g.fillText(text, x, y);
}

// ---------------------------------------------------------------------------
// Sky presets with clouds, fog and light
// ---------------------------------------------------------------------------
// Sky presets: saturated, painterly skies with big cumulus clouds and a soft
// blue aerial haze toward the horizon.
export const SKIES = {
  dusk: {
    top: '#2c3a86', mid: '#c27c98', horizon: '#ffc38a', cloud: '#f6b8a0', cloudShade: '#7a6a9a', sun: [-0.85, 0.11, 0.3],
    sunColor: '#ffb873', sunI: 2.6, hemiSky: '#c9b8ea', hemiGround: '#6a6440', hemiI: 1.2, fog: '#e2a99a', fogNear: 60, fogFar: 520, stars: 0, exposure: 1.05,
    look: { haze: '#c9a0b8', hazeStrength: 0.16, ink: '#2a1e30', inkStrength: 0.5, sat: 1.2 },
  },
  morning: {
    top: '#2f6fd0', mid: '#7fb5ea', horizon: '#dceef6', cloud: '#ffffff', cloudShade: '#a8b8d8', sun: [0.55, 0.55, 0.4],
    sunColor: '#fff3dc', sunI: 3.0, hemiSky: '#cfe4ff', hemiGround: '#8a8060', hemiI: 1.5, fog: '#bcd6ec', fogNear: 80, fogFar: 640, stars: 0, exposure: 1.0,
    look: { haze: '#9ec4ea', hazeStrength: 0.22, ink: '#1e2638', inkStrength: 0.55, sat: 1.22 },
  },
  night: {
    top: '#050b22', mid: '#14204a', horizon: '#3a3f6e', cloud: '#2c3258', cloudShade: '#0e1228', sun: [0.3, 0.6, -0.5],
    sunColor: '#a9bcff', sunI: 0.45, hemiSky: '#3e4c86', hemiGround: '#1d1a24', hemiI: 0.6, fog: '#1e2648', fogNear: 30, fogFar: 340, stars: 1, exposure: 1.15,
    look: { haze: '#3a4a88', hazeStrength: 0.2, ink: '#0a0c18', inkStrength: 0.45, sat: 1.15 },
  },
  sunset: {
    top: '#34489a', mid: '#d88c84', horizon: '#ffcf8c', cloud: '#ffd0a6', cloudShade: '#8a6a8e', sun: [0.8, 0.14, 0.3],
    sunColor: '#ffaa66', sunI: 2.8, hemiSky: '#f2c4a8', hemiGround: '#6a5a46', hemiI: 1.1, fog: '#efb48e', fogNear: 70, fogFar: 560, stars: 0, exposure: 1.05,
    look: { haze: '#d8a0a0', hazeStrength: 0.18, ink: '#2a1e28', inkStrength: 0.5, sat: 1.22 },
  },
  dawn: {
    top: '#36579c', mid: '#a6b6d8', horizon: '#ffd4b2', cloud: '#f6d8e2', cloudShade: '#7c7ca2', sun: [-0.72, 0.07, -0.4],
    sunColor: '#ffc49c', sunI: 1.5, hemiSky: '#bccbea', hemiGround: '#4a4a52', hemiI: 1.05, fog: '#cbcbe0', fogNear: 50, fogFar: 470, stars: 0, exposure: 1.05,
    look: { haze: '#a8b0d8', hazeStrength: 0.18, ink: '#1a1a2a', inkStrength: 0.5, sat: 1.18 },
  },
  evening: {
    top: '#1a2766', mid: '#6a4f96', horizon: '#f08a66', cloud: '#c0809a', cloudShade: '#3e3466', sun: [-0.9, 0.04, -0.2],
    sunColor: '#ff9a6a', sunI: 1.3, hemiSky: '#8e88cc', hemiGround: '#3a3236', hemiI: 0.95, fog: '#8a6a8e', fogNear: 50, fogFar: 460, stars: 0.35, exposure: 1.1,
    look: { haze: '#7a6aa8', hazeStrength: 0.18, ink: '#1a1426', inkStrength: 0.45, sat: 1.18 },
  },
};

export function makeSky(scene, preset) {
  const p = typeof preset === 'string' ? SKIES[preset] : preset;
  const sunDir = new THREE.Vector3(...p.sun).normalize();
  const uniforms = {
    uTop: { value: new THREE.Color(p.top) },
    uMid: { value: new THREE.Color(p.mid) },
    uHor: { value: new THREE.Color(p.horizon) },
    uCloud: { value: new THREE.Color(p.cloud) },
    uCloudShade: { value: new THREE.Color(p.cloudShade || p.mid) },
    uSun: { value: sunDir.clone() },
    uSunCol: { value: new THREE.Color(p.sunColor) },
    uStars: { value: p.stars },
    uTime: { value: 0 },
  };
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(900, 48, 24),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false, uniforms,
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position.z = gl_Position.w; }`,
      fragmentShader: `
        uniform vec3 uTop, uMid, uHor, uCloud, uCloudShade, uSun, uSunCol; uniform float uStars, uTime; varying vec3 vDir;
        float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
        float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
          return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
        float fbm(vec2 p){ float v=0.0, a=0.5; for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.03; a*=0.5; } return v; }
        void main(){
          vec3 d = normalize(vDir);
          float y = clamp(d.y, -0.2, 1.0);
          vec3 c = mix(uHor, uMid, smoothstep(0.0, 0.2, y));
          c = mix(c, uTop, smoothstep(0.18, 0.75, y));
          float s = max(dot(d, uSun), 0.0);
          c += uSunCol * (pow(s, 900.0) * 3.0 + pow(s, 14.0) * 0.3);
          // stars
          if (uStars > 0.0 && d.y > 0.05) {
            vec2 sp = d.xz / (d.y + 0.2) * 220.0;
            float st = step(0.9975, hash(floor(sp)));
            c += vec3(st) * uStars * smoothstep(0.05, 0.4, d.y) * (0.6 + 0.4 * sin(uTime * 3.0 + hash(floor(sp)) * 40.0));
          }
          // big painterly cumulus: density, lit from the sun side, soft rim
          if (d.y > 0.0) {
            vec2 cp = d.xz / (d.y + 0.18) * 1.15 + vec2(uTime * 0.01, uTime * 0.003);
            float n = fbm(cp) * 0.75 + fbm(cp * 2.7 + 3.1) * 0.25;
            float dens = smoothstep(0.48, 0.62, n);
            vec2 sunStep = normalize(uSun.xz + 1e-4) * 0.08;
            float n2 = fbm(cp + sunStep) * 0.75 + fbm((cp + sunStep) * 2.7 + 3.1) * 0.25;
            float lit = clamp(0.55 + (n - n2) * 6.0, 0.0, 1.0);
            vec3 cc = mix(uCloudShade, uCloud, lit);
            float sunFacing = pow(max(dot(d, uSun), 0.0), 6.0);
            cc += uSunCol * sunFacing * 0.6;
            float rim = smoothstep(0.48, 0.52, n) - smoothstep(0.52, 0.6, n);
            cc += uSunCol * rim * 0.25;
            // thin high streaks
            float wisp = smoothstep(0.55, 0.8, fbm(vec2(cp.x * 0.4, cp.y * 3.0) + 7.0)) * 0.35;
            float horizonFade = smoothstep(0.0, 0.14, d.y);
            c = mix(c, mix(uCloud, uSunCol, 0.2), wisp * horizonFade);
            c = mix(c, cc, dens * horizonFade * 0.95);
          }
          if (d.y < 0.0) c = mix(uHor, uHor * 0.6, smoothstep(0.0, -0.15, d.y));
          gl_FragColor = vec4(c, 1.0);
          #include <colorspace_fragment>
        }`,
    }),
  );
  sky.renderOrder = -1;
  sky.frustumCulled = false;
  scene.add(sky);

  scene.fog = new THREE.Fog(new THREE.Color(p.fog || p.horizon), p.fogNear, p.fogFar);

  const hemi = new THREE.HemisphereLight(p.hemiSky, p.hemiGround, p.hemiI);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(p.sunColor, p.sunI);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.left = -50; sc.right = 50; sc.top = 50; sc.bottom = -50; sc.near = 1; sc.far = 300;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.04;
  scene.add(sun, sun.target);

  const C = (v) => new THREE.Color(v);
  const base = p;
  return {
    sky, hemi, sun, sunDir, uniforms, exposure: p.exposure, look: p.look,
    // Blend every sky/light/fog value from the starting preset toward another.
    blend(target, k) {
      const B = typeof target === 'string' ? SKIES[target] : target;
      const mix = (a, b) => C(a).lerp(C(b), k);
      uniforms.uTop.value.copy(mix(base.top, B.top));
      uniforms.uMid.value.copy(mix(base.mid, B.mid));
      uniforms.uHor.value.copy(mix(base.horizon, B.horizon));
      uniforms.uCloud.value.copy(mix(base.cloud, B.cloud));
      uniforms.uCloudShade.value.copy(mix(base.cloudShade || base.mid, B.cloudShade || B.mid));
      uniforms.uSunCol.value.copy(mix(base.sunColor, B.sunColor));
      uniforms.uStars.value = base.stars + (B.stars - base.stars) * k;
      sunDir.copy(new THREE.Vector3(...base.sun).normalize().lerp(new THREE.Vector3(...B.sun).normalize(), k).normalize());
      uniforms.uSun.value.copy(sunDir);
      sun.color.copy(mix(base.sunColor, B.sunColor));
      sun.intensity = base.sunI + (B.sunI - base.sunI) * k;
      hemi.color.copy(mix(base.hemiSky, B.hemiSky));
      hemi.groundColor.copy(mix(base.hemiGround, B.hemiGround));
      hemi.intensity = base.hemiI + (B.hemiI - base.hemiI) * k;
      scene.fog.color.copy(mix(base.fog || base.horizon, B.fog || B.horizon));
      scene.fog.near = base.fogNear + (B.fogNear - base.fogNear) * k;
      scene.fog.far = base.fogFar + (B.fogFar - base.fogFar) * k;
      return base.exposure + (B.exposure - base.exposure) * k;
    },
    follow(pos, t) {
      uniforms.uTime.value = t;
      sky.position.set(pos.x, 0, pos.z);
      sun.target.position.set(pos.x, 0, pos.z);
      sun.position.set(pos.x, 0, pos.z).addScaledVector(sunDir, 140);
    },
  };
}

// ---------------------------------------------------------------------------
// Wind
// ---------------------------------------------------------------------------
export function gustAt(t) {
  const g = 0.5 + 0.28 * Math.sin(t * 0.37) + 0.16 * Math.sin(t * 1.13 + 1.7) + 0.08 * Math.sin(t * 2.9);
  return Math.max(0, Math.min(1, g));
}
export function windUniforms() {
  return { uTime: { value: 0 }, uGust: { value: 0.5 } };
}

export function swayMaterial(color, uniforms, strength = 0.25, extra = {}) {
  const m = toon({ color, ...extra });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uniforms.uTime;
    sh.uniforms.uGust = uniforms.uGust;
    sh.vertexShader = 'uniform float uTime; uniform float uGust;\n' + sh.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       #ifdef USE_INSTANCING
         vec2 ip = instanceMatrix[3].xz;
       #else
         vec2 ip = vec2(0.0);
       #endif
       float wave = sin(uTime * 1.8 - ip.x * 0.18 + ip.y * 0.05) * 0.5 + 0.5;
       float bend = position.y * position.y * ${strength.toFixed(3)} * (0.25 + uGust * 1.3) * (0.4 + wave);
       transformed.x += bend;
       transformed.z += bend * 0.25 * sin(uTime * 2.3 + ip.y);`,
    );
  };
  return m;
}

// Rice paddies or grass: instanced blades on a grid, skipping excluded rectangles.
export function blades(scene, { areas, exclude = [], spacing = 0.6, uniforms, height = 0.8, colors = ['#8fae4a', '#d9bf55'], radius = 0.09 }) {
  const pts = [];
  const inside = (x, z, r) => x > r.minX && x < r.maxX && z > r.minZ && z < r.maxZ;
  for (const a of areas) {
    for (let x = a.minX; x < a.maxX; x += spacing) {
      for (let z = a.minZ; z < a.maxZ; z += spacing) {
        const jx = x + rand(-0.25, 0.25) * spacing;
        const jz = z + rand(-0.25, 0.25) * spacing;
        if (exclude.some((r) => inside(jx, jz, r))) continue;
        pts.push(jx, jz);
      }
    }
  }
  // a clump: five thin leaves fanning out from the base
  const verts = [];
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2 + rand(-0.3, 0.3);
    const lean = rand(0.12, 0.3) * height;
    const bw = radius * 0.9;
    const cx = Math.cos(a), cz = Math.sin(a);
    const px = -cz * bw, pz = cx * bw;
    const hk = height * rand(0.8, 1.1);
    verts.push(-px, 0, -pz, px, 0, pz, cx * lean, hk, cz * lean);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.computeVertexNormals();
  // normals of thin leaves point up-ish so they catch the sky light
  const n = geo.attributes.normal;
  for (let i = 0; i < n.count; i++) n.setXYZ(i, n.getX(i) * 0.4, 0.9, n.getZ(i) * 0.4);
  const material = swayMaterial('#ffffff', uniforms, 0.55);
  material.side = THREE.DoubleSide;
  const count = pts.length / 2;
  const mesh = new THREE.InstancedMesh(geo, material, count);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  const c = new THREE.Color();
  const a = new THREE.Color(colors[0]), b = new THREE.Color(colors[1]);
  const e = new THREE.Euler();
  for (let i = 0; i < count; i++) {
    const x = pts[i * 2], z = pts[i * 2 + 1];
    p.set(x, 0, z);
    q.setFromEuler(e.set(rand(-0.12, 0.12), rand(0, Math.PI), rand(-0.12, 0.12)));
    const k = rand(0.75, 1.25);
    s.set(k, k * rand(0.85, 1.15), k);
    m4.compose(p, q, s);
    mesh.setMatrixAt(i, m4);
    const ripe = 0.35 + 0.5 * (0.5 + 0.5 * Math.sin(x * 0.08) * Math.cos(z * 0.06)) + rand(0, 0.15);
    c.copy(a).lerp(b, Math.min(1, ripe));
    mesh.setColorAt(i, c);
  }
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

export function windSpecks(scene, count = 260, color = '#f6e7c4') {
  const g = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = rand(-30, 30); pos[i * 3 + 1] = rand(0, 6); pos[i * 3 + 2] = rand(-30, 30);
  }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(g, new THREE.PointsMaterial({ color, size: 0.08, transparent: true, opacity: 0.7, depthWrite: false }));
  pts.frustumCulled = false;
  scene.add(pts);
  return {
    update(dt, t, gust, center) {
      const a = g.attributes.position.array;
      for (let i = 0; i < count; i++) {
        a[i * 3] += (1.5 + gust * 7) * dt;
        a[i * 3 + 1] += Math.sin(t * 2 + i) * 0.3 * dt;
        a[i * 3 + 2] += Math.sin(t * 0.7 + i * 0.3) * 0.6 * dt;
        const dx = a[i * 3] - center.x, dz = a[i * 3 + 2] - center.z;
        if (dx > 30) a[i * 3] -= 60; else if (dx < -30) a[i * 3] += 60;
        if (dz > 30) a[i * 3 + 2] -= 60; else if (dz < -30) a[i * 3 + 2] += 60;
        if (a[i * 3 + 1] < 0.1 || a[i * 3 + 1] > 7) a[i * 3 + 1] = rand(0.5, 5.5);
      }
      g.attributes.position.needsUpdate = true;
    },
  };
}

// ---------------------------------------------------------------------------
// Street furniture
// ---------------------------------------------------------------------------
export function acUnit(parent, { x, y, z, rotY = 0 }) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(unitBox, [mat('#e9e9e6'), mat('#e9e9e6'), mat('#e9e9e6'), mat('#e9e9e6'), mat('#ffffff', { map: tex('acgrille') }), mat('#e9e9e6')]);
  body.scale.set(0.8, 0.55, 0.3);
  body.castShadow = true;
  g.add(body);
  box(g, { w: 0.85, h: 0.04, d: 0.42, y: -0.31, color: '#8a8c8c' }); // bracket
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  parent.add(g);
  return g;
}

// Vertical sign sticking out from a facade (直式招牌). English text runs bottom-to-top.
export function bladeSign(parent, { x, y, z, rotY = 0, text, bg = '#b8312b', fg = '#fff8e6', h = 2.4 }) {
  const w = 0.6;
  return sign(parent, {
    w, h, x, y, z, rotY, emissive: 0.75, double: true, px: 512,
    draw: (g, W, H) => {
      g.fillStyle = bg; g.fillRect(0, 0, W, H);
      g.strokeStyle = fg; g.lineWidth = W * 0.05; g.strokeRect(W * 0.08, W * 0.08, W * 0.84, H - W * 0.16);
      g.save(); g.translate(W / 2, H / 2); g.rotate(-Math.PI / 2);
      fitText(g, text, 0, 0, H * 0.84, Math.floor(W * 0.5), '700 {s}px "IBM Plex Sans", Arial, sans-serif', fg);
      g.restore();
    },
  });
}

export function awning(parent, { x, y, z, w, depth = 1.2, rotY = 0, color = '#a8443a' }) {
  const g = new THREE.Group();
  const m = box(g, { w, h: 0.06, d: depth, color });
  m.rotation.x = -0.18;
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  parent.add(g);
  return g;
}

export function streetLamp(parent, { x, z, rotY = 0, height = 7, color = '#ffd9a0', light = false }) {
  const g = new THREE.Group();
  box(g, { w: 0.18, h: height, d: 0.18, color: '#5d6266' });
  box(g, { w: 0.12, h: 0.12, d: 1.6, y: height - 0.1, z: 0.75, color: '#5d6266' });
  const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.12, 0.6), glow(color, 2.2));
  bulb.position.set(0, height - 0.18, 1.4);
  g.add(bulb);
  if (light) {
    const l = new THREE.PointLight(color, 30, 16, 1.4);
    l.position.set(0, height - 0.5, 1.4);
    g.add(l);
  }
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  parent.add(g);
  return g;
}

export function powerLine(parent, { x, z0, z1, every = 24, height = 9 }) {
  const poles = [];
  for (let z = z0; z >= z1; z -= every) {
    tbox(parent, { w: 0.3, h: height, d: 0.3, x, z, color: '#c9cac6', texName: 'concrete' });
    box(parent, { w: 2.2, h: 0.14, d: 0.14, x, y: height - 0.6, z, color: '#6d6f6e' });
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.9, 10), mat('#7a7f7c'));
    tr.position.set(x + 0.35, height - 2.2, z); parent.add(tr);
    poles.push(z);
  }
  const wireMat = new THREE.LineBasicMaterial({ color: '#202026' });
  for (let i = 0; i < poles.length - 1; i++) {
    [-0.9, 0, 0.9].forEach((ox) => {
      const pts = [];
      for (let k = 0; k <= 12; k++) {
        const f = k / 12;
        pts.push(new THREE.Vector3(x + ox, height - 0.55 - Math.sin(f * Math.PI) * 0.7, poles[i] + (poles[i + 1] - poles[i]) * f));
      }
      parent.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wireMat));
    });
  }
}

// Trees. Returns the canopy group so callers can sway it.
export function tree(parent, { x, z, scale = 1, kind = 'round', color }) {
  const g = new THREE.Group();
  const canopy = new THREE.Group();
  if (kind === 'palm') {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 8 * scale, 8), mat('#8b7d6b'));
    trunk.position.y = 4 * scale; trunk.castShadow = true; g.add(trunk);
    for (let i = 0; i < 8; i++) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.35, 3.2 * scale, 4, 1), mat(color || '#4f7a3a', { flatShading: true }));
      leaf.geometry.translate(0, 1.6 * scale, 0);
      leaf.rotation.set(1.15, (i / 8) * Math.PI * 2, 0, 'YXZ');
      leaf.castShadow = true;
      canopy.add(leaf);
    }
    canopy.position.y = 8 * scale;
  } else {
    const h = (kind === 'banyan' ? 4.5 : 3) * scale;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25 * scale, (kind === 'banyan' ? 0.9 : 0.4) * scale, h, 8), mat('#5b4a3b'));
    trunk.position.y = h / 2; trunk.castShadow = true; g.add(trunk);
    const base = new THREE.Color(color || (kind === 'banyan' ? '#4a6e34' : '#5f8a3e'));
    const n = kind === 'banyan' ? 7 : 5;
    for (let i = 0; i < n; i++) {
      const r = rand(1.4, 2.4) * scale * (kind === 'banyan' ? 1.4 : 1);
      const c = base.clone().offsetHSL(rand(-0.02, 0.02), rand(-0.05, 0.05), rand(-0.05, 0.05));
      const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 3), mat('#' + c.getHexString()));
      blob.scale.y = 0.72;
      blob.position.set(rand(-1.6, 1.6) * scale, h + rand(0.2, 1.8) * scale, rand(-1.6, 1.6) * scale);
      blob.castShadow = true;
      canopy.add(blob);
    }
  }
  g.add(canopy);
  g.position.set(x, 0, z);
  parent.add(g);
  return canopy;
}

// ---------------------------------------------------------------------------
// Vehicles
// ---------------------------------------------------------------------------
const scooterColors = ['#d7d9dc', '#2c2f36', '#b5332e', '#3c6e9e', '#e9e1cf', '#5f7d5a', '#c9b48a'];
export function scooter(parent, { x, z, rotY = 0, color, rider = false }) {
  const g = new THREE.Group();
  const c = color || pick(scooterColors);
  const body = mat(c);
  // floorboard, rear body, front shield, seat, handlebar, headlight
  box(g, { w: 0.42, h: 0.12, d: 0.7, y: 0.28, z: 0.05, material: body });
  const rear = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.55, 4, 8), body);
  rear.rotation.x = Math.PI / 2; rear.position.set(0, 0.52, -0.42); rear.scale.set(1, 1, 0.85); rear.castShadow = true; g.add(rear);
  box(g, { w: 0.4, h: 0.12, d: 0.72, y: 0.74, z: -0.38, color: '#1d1d1f' });
  const shield = box(g, { w: 0.44, h: 0.72, d: 0.16, y: 0.28, z: 0.52, material: body });
  shield.rotation.x = -0.2;
  box(g, { w: 0.62, h: 0.05, d: 0.06, y: 1.04, z: 0.6, color: '#222' });
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.04), glow('#fff3d6', 0.6));
  head.position.set(0, 0.92, 0.66); g.add(head);
  const wheel = new THREE.CylinderGeometry(0.2, 0.2, 0.1, 14);
  [-0.62, 0.6].forEach((wz) => {
    const w = new THREE.Mesh(wheel, mat('#161616'));
    w.rotation.z = Math.PI / 2; w.position.set(0, 0.2, wz); g.add(w);
  });
  if (rider) g.add(personMesh({ seated: true }));
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  parent.add(g);
  return g;
}

const carColors = ['#e8e8e6', '#1f1f22', '#9aa1a8', '#2f4f7a', '#7a1f24', '#f2f0ea', '#4a4d52'];
export function car(parent, { x = 0, z = 0, rotY = 0, color, taxi = false }) {
  const g = new THREE.Group();
  const c = taxi ? '#f2c230' : color || pick(carColors);
  box(g, { w: 1.75, h: 0.75, d: 4.3, y: 0.3, color: c });
  box(g, { w: 1.6, h: 0.6, d: 2.3, y: 1.05, z: -0.2, color: c });
  box(g, { w: 1.62, h: 0.45, d: 2.1, y: 1.1, z: -0.2, color: '#1b2430', shadow: false });
  [[-0.6, 2.16], [0.6, 2.16]].forEach(([lx, lz]) => {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.15, 0.05), glow('#fff6dc', 1.4)); l.position.set(lx, 0.75, lz); g.add(l);
  });
  [[-0.6, -2.16], [0.6, -2.16]].forEach(([lx, lz]) => {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.12, 0.05), glow('#ff3a2a', 1.2)); l.position.set(lx, 0.8, lz); g.add(l);
  });
  const wheel = new THREE.CylinderGeometry(0.33, 0.33, 0.25, 14);
  [[-0.8, 1.35], [0.8, 1.35], [-0.8, -1.35], [0.8, -1.35]].forEach(([wx, wz]) => {
    const w = new THREE.Mesh(wheel, mat('#141414')); w.rotation.z = Math.PI / 2; w.position.set(wx, 0.33, wz); g.add(w);
  });
  if (taxi) box(g, { w: 0.5, h: 0.18, d: 0.25, y: 1.65, z: -0.2, material: glow('#ffe9a0', 0.8) });
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  parent.add(g);
  return g;
}

// ---------------------------------------------------------------------------
// People: stylized figures (no faces) that walk along paths
// ---------------------------------------------------------------------------
const skin = ['#e8c4a4', '#d9b08c', '#f0d2b6', '#c99c7a'];
const hairCol = ['#1a1612', '#2b211a', '#3a2c22', '#111111'];
export function personMesh({ top = pick(['#e7e2d8', '#5c6f8a', '#a54a3e', '#2f3b33', '#d9c38f', '#3a3a44']), bottom = pick(['#2b3040', '#4a4a4a', '#1f2a3d', '#6b5b4b']), seated = false, height = 1.65, longHair = Math.random() < 0.5, bag = false } = {}) {
  const g = new THREE.Group();
  const s = height / 1.65;
  const legs = [];
  [-0.09, 0.09].forEach((lx) => {
    const leg = new THREE.Group();
    const m = box(leg, { w: 0.13, h: 0.8, d: 0.14, y: -0.8, color: bottom });
    m.castShadow = true;
    leg.position.set(lx, 0.82, 0);
    g.add(leg); legs.push(leg);
  });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.42, 4, 10), mat(top));
  body.position.y = 1.15; body.scale.z = 0.72; body.castShadow = true; g.add(body);
  const arms = [];
  [-0.23, 0.23].forEach((ax) => {
    const arm = new THREE.Group();
    box(arm, { w: 0.09, h: 0.58, d: 0.1, y: -0.58, color: top });
    arm.position.set(ax, 1.42, 0);
    g.add(arm); arms.push(arm);
  });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.115, 14, 12), mat(pick(skin)));
  head.position.y = 1.55; head.castShadow = true; g.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.125, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), mat(pick(hairCol)));
  hair.position.y = 1.57; g.add(hair);
  if (longHair) box(g, { w: 0.22, h: 0.28, d: 0.08, y: 1.3, z: -0.1, color: hair.material.color.getStyle() });
  if (bag) box(g, { w: 0.3, h: 0.36, d: 0.14, y: 1.0, z: -0.2, color: '#2c3a5a' });
  if (seated) {
    g.position.set(0, -0.15, -0.3);
    legs.forEach((l) => { l.rotation.x = -1.3; });
    arms.forEach((a) => { a.rotation.x = -1.0; });
  }
  g.scale.setScalar(s);
  g.userData = { legs, arms };
  return g;
}

// A crowd of figures. Each walks a looping path (array of [x,z]) or stands.
export function crowd(parent, specs) {
  const people = specs.map((sp) => {
    const m = sp.student ? studentMesh(sp) : personMesh(sp);
    parent.add(m);
    const path = sp.path || null;
    const st = { mesh: m, path, speed: sp.speed || rand(1.0, 1.4), seg: 0, f: sp.loop === false ? 0 : rand(0, 1), phase: rand(0, 6), loop: sp.loop !== false, vanish: !!sp.vanish, done: false };
    if (!path) { m.position.set(sp.x, 0, sp.z); m.rotation.y = sp.rotY || 0; }
    return st;
  });
  return {
    people,
    update(dt, t) {
      for (const p of people) {
        const { legs, arms } = p.mesh.userData;
        if (!p.path || p.done) {
          // idle: tiny breathing sway
          p.mesh.rotation.z = Math.sin(t * 1.3 + p.phase) * 0.01;
          continue;
        }
        const a = p.path[p.seg], b = p.path[(p.seg + 1) % p.path.length];
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
        p.f += (p.speed * dt) / len;
        while (p.f >= 1) {
          p.f -= 1; p.seg++;
          if (!p.loop && p.seg >= p.path.length - 1) {
            p.done = true;
            if (p.vanish) p.mesh.visible = false;
            const last = p.path[p.path.length - 1];
            p.mesh.position.set(last[0], 0, last[1]);
            legs.forEach((l) => { l.rotation.x = 0; }); arms.forEach((ar) => { ar.rotation.x = 0; });
            break;
          }
          if (p.seg >= p.path.length) p.seg = 0;
        }
        if (p.done) continue;
        const A = p.path[p.seg], B = p.path[(p.seg + 1) % p.path.length];
        p.mesh.position.set(A[0] + (B[0] - A[0]) * p.f, 0, A[1] + (B[1] - A[1]) * p.f);
        p.mesh.rotation.y = Math.atan2(B[0] - A[0], B[1] - A[1]);
        const sw = Math.sin(t * p.speed * 6 + p.phase) * 0.5;
        legs[0].rotation.x = sw; legs[1].rotation.x = -sw;
        arms[0].rotation.x = -sw * 0.7; arms[1].rotation.x = sw * 0.7;
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Taiwanese townhouse (透天厝) / shophouse
// ---------------------------------------------------------------------------
const facadeColors = ['#e8ddd0', '#d9c4b8', '#cad6c8', '#d8d4ca', '#e6d2ab', '#c9ced6', '#ddc9c9', '#b9c7cf', '#e2d9c2'];
const shopNames = ['BREAKFAST', 'PHARMACY', 'HARDWARE', 'BUFFET', 'BARBER', 'STATIONERY', 'PLUMBING', 'SCOOTERS', 'TOFU PUDDING', 'RICE NOODLES', 'OPTICAL', 'CLINIC'];

/**
 * side: -1 = west of the street (front faces +x), +1 = east (front faces -x)
 * face: x of the street-facing wall; z: center along the street.
 * axis: 'x' (default, street runs along z) or 'z' (street runs along x; side then means -z / +z)
 */
export function townhouse(parent, colliders, { side, face, z, width = 4.2, depth = 9, floors = 3, color, open = false, shop = null, seed = Math.random(), signs = true }) {
  const g = new THREE.Group();
  const fh = 3.2;
  const facade = color || facadeColors[Math.floor(seed * facadeColors.length)];
  const inX = (d) => face + side * d;          // move from the street into the house
  const mid = (a, b) => (a + b) / 2;
  const arcade = 2.0;
  const rot = -side * Math.PI / 2;
  const texName = seed > 0.5 ? 'tile' : 'mosaic';

  // upper floors span the full depth, ground floor is recessed (騎樓 arcade)
  tbox(g, { w: depth, h: fh * (floors - 1), d: width, x: mid(inX(0), inX(depth)), y: fh, z, color: facade, texName });
  tbox(g, { w: depth - arcade, h: fh, d: width, x: mid(inX(arcade), inX(depth)), y: 0, z, color: '#d8d2c8', texName: 'concrete', scale: 2 });
  colliders.push({ minX: Math.min(inX(arcade), inX(depth)), maxX: Math.max(inX(arcade), inX(depth)), minZ: z - width / 2, maxZ: z + width / 2 });
  // floor slab edge band
  for (let f = 1; f < floors; f++) box(g, { w: 0.25, h: 0.22, d: width, x: inX(0.1), y: f * fh - 0.1, z, color: '#bdb7ad' });

  // arcade pillar
  const px = inX(0.25);
  tbox(g, { w: 0.42, h: fh, d: 0.42, x: px, y: 0, z: z - width / 2 + 0.21, color: facade, texName });
  colliders.push({ minX: px - 0.21, maxX: px + 0.21, minZ: z - width / 2, maxZ: z - width / 2 + 0.42 });

  // ground floor front: open shop / lit doorway / rolling shutter
  const gf = inX(arcade) - side * 0.02;
  if (open || shop) {
    const door = new THREE.Mesh(new THREE.PlaneGeometry(width * 0.86, 2.7), glow(shop ? '#fff1d2' : '#ffcf8a', shop ? 1.0 : 0.85));
    door.position.set(gf, 1.35, z); door.rotation.y = rot; g.add(door);
  } else {
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(width * 0.86, 2.7), tmat('#ffffff', 'shutter'));
    sh.position.set(gf, 1.35, z); sh.rotation.y = rot; g.add(sh);
  }
  // shop header sign across the arcade
  if (shop) {
    sign(g, {
      w: width * 0.92, h: 0.7, x: inX(-0.02) - side * 0.01, y: fh - 0.2, z, rotY: rot, emissive: 0.8, px: 128,
      draw: (c, W, H) => {
        c.fillStyle = shop.bg || '#f4efe2'; c.fillRect(0, 0, W, H);
        fitText(c, shop.name, W / 2, H * 0.55, W * 0.9, Math.floor(H * 0.62), '700 {s}px "IBM Plex Sans", Arial, sans-serif', shop.fg || '#a3271f');
      },
    });
  }

  // windows: some lit, iron grilles, AC units, balconies
  const grilleMat = mat('#ffffff', { map: tex('grille'), transparent: true, alphaTest: 0.4, side: THREE.DoubleSide });
  for (let f = 1; f < floors; f++) {
    const lit = (seed * 7.3 + f * 0.37) % 1 > 0.4;
    const wy = f * fh + 1.5;
    const win = new THREE.Mesh(new THREE.PlaneGeometry(width * 0.62, 1.3), lit ? glow(pick(['#ffd59a', '#fff0d0', '#cfe6ff']), 0.7) : mat('#36404e'));
    win.position.set(face - side * 0.02, wy, z); win.rotation.y = rot; g.add(win);
    const gr = new THREE.Mesh(new THREE.BoxGeometry(width * 0.7, 1.45, 0.3), grilleMat);
    gr.position.set(face - side * 0.15, wy, z); gr.rotation.y = rot; g.add(gr);
    if ((seed * 13 + f) % 1 > 0.35) acUnit(g, { x: face - side * 0.2, y: wy - 1.05, z: z + width * 0.33, rotY: rot });
  }

  // blade sign on the pillar side
  if (signs && (shop || seed > 0.55)) {
    bladeSign(g, { x: face - side * 0.65, y: fh + 1.7, z: z - width / 2 + 0.25, rotY: rot + Math.PI / 2, text: shop ? shop.name : pick(shopNames), bg: pick(['#b8312b', '#1f5a8a', '#f2c230', '#2c7a4b', '#ffffff']), fg: '#fff8e6' });
  }

  // roof: stainless water tank on a stand, sometimes a tin add-on (頂樓加蓋)
  const roofY = fh * floors;
  if (seed > 0.3) {
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.3, 14), mat('#d1d6db'));
    tank.position.set(inX(depth * 0.6), roofY + 1.35, z + (seed - 0.5));
    tank.rotation.z = Math.PI / 2; tank.castShadow = true;
    g.add(tank);
    box(g, { w: 1.2, h: 0.6, d: 0.9, x: inX(depth * 0.6), y: roofY, z: z + (seed - 0.5), color: '#6c6f72' });
  }
  if (seed < 0.45) {
    const tin = seed < 0.2 ? '#4f78a8' : seed < 0.33 ? '#a3523f' : '#7f8d74';
    box(g, { w: depth * 0.55, h: 2.3, d: width * 0.95, x: inX(depth * 0.7), y: roofY, z, color: tin });
  }
  tbox(g, { w: 0.15, h: 0.9, d: width, x: inX(0.08), y: roofY, z, color: facade, texName });

  parent.add(g);
  return g;
}

// A generic mid-rise or tower block with lit window grid (for skylines and city streets).
export function tower(parent, { x, z, w, d, h, color = '#c9c6c0', litRatio = 0.5, rotY = 0, nightGlow = 0.8, texName = 'tile' }) {
  const g = new THREE.Group();
  tbox(g, { w, h, d, color, texName, scale: 2 });
  const floors = Math.floor(h / 3.2);
  const t = canvasTexture(64, 256, (c, W, H) => {
    c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
    const cols = 8, rows = 32;
    for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) {
      if (Math.random() < litRatio) {
        c.fillStyle = pick(['#ffd8a0', '#fff0d0', '#ffe6b8', '#d6e8ff']);
        c.fillRect(k * W / cols + 1, r * H / rows + 2, W / cols - 2, H / rows - 4);
      }
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(Math.max(1, Math.round(w / 8)), Math.max(1, floors / 32));
  const wm = new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: nightGlow, blending: THREE.AdditiveBlending, depthWrite: false });
  [[0, w, d / 2 + 0.03, 0], [0, w, -d / 2 - 0.03, Math.PI], [w / 2 + 0.03, d, 0, Math.PI / 2], [-w / 2 - 0.03, d, 0, -Math.PI / 2]].forEach(([ox, fw, oz, ry]) => {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(fw * 0.94, h * 0.94), wm);
    p.position.set(ox, h / 2, oz); p.rotation.y = ry; g.add(p);
  });
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  parent.add(g);
  return g;
}

// Distant hills, pre-tinted into the haze.
export function hills(parent, list, color = '#6e6a8e') {
  const m = new THREE.MeshBasicMaterial({ color, fog: false });
  list.forEach(([x, z, r, hgt]) => {
    const hill = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), m);
    hill.scale.y = hgt / r; hill.position.set(x, -4, z); parent.add(hill);
  });
}

// Hip roof (four slopes) as a scaled square pyramid; `ridge` stretches it into a long hip.
export function hipRoof(parent, { w, d, h, x = 0, y = 0, z = 0, color = '#6b6a62', rotY = 0, overhang = 0.6 }) {
  const geo = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1);
  geo.rotateY(Math.PI / 4);
  geo.translate(0, 0.5, 0);
  const m = new THREE.Mesh(geo, mat(color, { flatShading: true }));
  m.scale.set(w + overhang * 2, h, d + overhang * 2);
  m.position.set(x, y, z);
  m.rotation.y = rotY;
  m.castShadow = true;
  parent.add(m);
  return m;
}

// Gable-ish long roof: a triangular prism along x.
export function gableRoof(parent, { w, d, h, x = 0, y = 0, z = 0, color = '#5e5a55', rotY = 0, overhang = 0.5 }) {
  const shape = new THREE.Shape();
  const hd = d / 2 + overhang;
  shape.moveTo(-hd, 0); shape.lineTo(hd, 0); shape.lineTo(0, h); shape.lineTo(-hd, 0);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: w + overhang * 2, bevelEnabled: false });
  geo.translate(0, 0, -(w + overhang * 2) / 2);
  geo.rotateY(Math.PI / 2);
  const m = new THREE.Mesh(geo, mat(color, { flatShading: true }));
  m.position.set(x, y, z);
  m.rotation.y = rotY;
  m.castShadow = true;
  parent.add(m);
  return m;
}

// ---------------------------------------------------------------------------
// Taiwanese high-school girl in summer uniform: white short-sleeve blouse with
// a collar and an embroidered name tag, navy pleated skirt, black socks and
// shoes. Same rig as personMesh (userData.legs / arms) so crowds animate it.
// A graduation corsage (red flower + ribbon) can be shown via userData.corsage.
// ---------------------------------------------------------------------------
export function studentMesh({ height = rand(1.55, 1.67), hair = pick(['long', 'long', 'bob', 'braid', 'pony']), bag = false, blouse = '#f6f5f0', skirt = '#1e2638' } = {}) {
  const g = new THREE.Group();
  const s = height / 1.65;
  const skinC = pick(skin), hairC = pick(['#121010', '#1a1512', '#211a14']);
  const legs = [];
  [-0.085, 0.085].forEach((lx) => {
    const leg = new THREE.Group();
    box(leg, { w: 0.11, h: 0.8, d: 0.12, y: -0.8, color: skinC });
    box(leg, { w: 0.12, h: 0.24, d: 0.13, y: -0.8, color: '#151515' });            // socks
    box(leg, { w: 0.13, h: 0.08, d: 0.25, y: -0.82, z: 0.04, color: '#0d0d0d' });   // shoes
    leg.position.set(lx, 0.82, 0);
    g.add(leg); legs.push(leg);
  });
  // pleated skirt (faceted cone)
  const sk = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.3, 0.48, 16, 1), new THREE.MeshToonMaterial({ color: skirt, gradientMap: ramp(), flatShading: true }));
  sk.position.y = 0.77; sk.castShadow = true; g.add(sk);
  // blouse
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.34, 4, 12), mat(blouse));
  body.position.y = 1.2; body.scale.z = 0.72; body.castShadow = true; g.add(body);
  [-1, 1].forEach((sd) => {                                                           // collar flaps
    const c = box(g, { w: 0.13, h: 0.02, d: 0.09, x: sd * 0.06, y: 1.44, z: 0.1, color: '#ffffff', shadow: false });
    c.rotation.z = sd * 0.35; c.rotation.x = -0.5;
  });
  const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.025), mat('#2c4fa8')); tag.position.set(0.075, 1.3, 0.128); g.add(tag);
  // arms: short white sleeve, bare forearm
  const arms = [];
  [-0.23, 0.23].forEach((ax) => {
    const arm = new THREE.Group();
    box(arm, { w: 0.12, h: 0.22, d: 0.13, y: -0.22, color: blouse });
    box(arm, { w: 0.08, h: 0.38, d: 0.09, y: -0.6, color: skinC });
    arm.position.set(ax, 1.42, 0);
    g.add(arm); arms.push(arm);
  });
  // head and hair
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.115, 14, 12), mat(skinC)); head.position.y = 1.56; head.castShadow = true; g.add(head);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.125, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.58), mat(hairC)); cap.position.y = 1.575; g.add(cap);
  box(g, { w: 0.2, h: 0.05, d: 0.05, y: 1.62, z: 0.095, color: hairC, shadow: false });   // bangs
  if (hair === 'long') box(g, { w: 0.24, h: 0.42, d: 0.07, y: 1.18, z: -0.1, color: hairC });
  if (hair === 'bob') box(g, { w: 0.26, h: 0.16, d: 0.2, y: 1.44, z: -0.02, color: hairC });
  if (hair === 'braid') { const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.32, 4, 8), mat(hairC)); b.position.set(-0.1, 1.32, 0.05); g.add(b); }
  if (hair === 'pony') { const p = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.24, 4, 8), mat(hairC)); p.position.set(0, 1.46, -0.15); p.rotation.x = 0.3; g.add(p); }
  if (bag) box(g, { w: 0.3, h: 0.36, d: 0.14, y: 1.0, z: -0.2, color: '#22304e' });
  // graduation corsage (hidden until graduation day)
  const corsage = new THREE.Group();
  const flower = new THREE.Mesh(new THREE.IcosahedronGeometry(0.055, 1), mat('#d8202a')); flower.position.set(-0.08, 1.33, 0.13); corsage.add(flower);
  const ribbon = box(corsage, { w: 0.05, h: 0.32, d: 0.01, x: -0.08, y: 1.0, z: 0.13, color: '#c8182a', shadow: false });
  ribbon.rotation.z = 0.08;
  corsage.visible = false; g.add(corsage);
  g.scale.setScalar(s);
  g.userData = { legs, arms, corsage };
  return g;
}

// A lit vertical light-box sign, like the stacks over Taiwanese shopfronts at night.
export function neonSign(parent, { x, y, z, rotY = 0, text, bg = '#6a2ad8', fg = '#ffffff', h = 3.2, w = 0.75, glowI = 1.2 }) {
  const m = sign(parent, {
    w, h, x, y, z, rotY, emissive: glowI, double: true, px: 512,
    draw: (g, W, H) => {
      g.fillStyle = bg; g.fillRect(0, 0, W, H);
      g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = W * 0.05; g.strokeRect(W * 0.06, W * 0.06, W * 0.88, H - W * 0.12);
      g.save(); g.translate(W / 2, H / 2); g.rotate(-Math.PI / 2);
      fitText(g, text, 0, 0, H * 0.86, Math.floor(W * 0.5), '700 {s}px "IBM Plex Sans", Arial, sans-serif', fg);
      g.restore();
    },
  });
  box(parent, { w: 0.06, h: 0.06, d: 0.9, x, y: y + h / 2 - 0.2, z: z, rotY, color: '#555', shadow: false });
  return m;
}

// Red-orange glazed roof tile texture (rows of barrel tiles).
let tileTexCache = null;
export function roofTileTex() {
  if (tileTexCache) return tileTexCache;
  tileTexCache = canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#c8552a'; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 16) {
      const grd = g.createLinearGradient(x, 0, x + 16, 0);
      grd.addColorStop(0, 'rgba(90,20,0,0.45)'); grd.addColorStop(0.5, 'rgba(255,200,150,0.25)'); grd.addColorStop(1, 'rgba(90,20,0,0.45)');
      g.fillStyle = grd; g.fillRect(x, 0, 16, h);
    }
    for (let y = 0; y < h; y += 22) { g.fillStyle = 'rgba(60,10,0,0.25)'; g.fillRect(0, y, w, 2); }
  });
  tileTexCache.wrapS = tileTexCache.wrapT = THREE.RepeatWrapping;
  return tileTexCache;
}

// Granite block texture (beige cut stone, as on the old city gate).
let graniteCache = null;
export function graniteTex() {
  if (graniteCache) return graniteCache;
  graniteCache = canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#8a8070'; g.fillRect(0, 0, w, h);
    const rows = 6, bh = h / rows;
    for (let r = 0; r < rows; r++) {
      let x = -(r % 2) * 30;
      while (x < w) {
        const bw = rand(40, 80), v = rand(0.82, 1.08);
        g.fillStyle = `rgb(${Math.floor(214 * v)},${Math.floor(198 * v)},${Math.floor(168 * v)})`;
        g.fillRect(x + 2, r * bh + 2, bw - 4, bh - 4);
        x += bw;
      }
    }
    for (let i = 0; i < 2500; i++) { const v = Math.floor(rand(90, 160)); g.fillStyle = `rgba(${v},${v - 6},${v - 14},0.25)`; g.fillRect(rand(0, w), rand(0, h), 1.5, 1.5); }
  });
  graniteCache.wrapS = graniteCache.wrapT = THREE.RepeatWrapping;
  return graniteCache;
}

// Merge every static single-material mesh in `group` that shares a material
// into one mesh (world space), then put the result in `parent`. Turns thousands
// of small parts (townhouses, parked scooters, poles) into a few draw calls.
// Meshes listed in `keep` (or with array materials, lines, instanced meshes)
// stay as they are.
export function bakeStatic(parent, group, keep = new Set()) {
  group.updateMatrixWorld(true);
  const buckets = new Map(), loose = [];
  group.traverse((o) => {
    if (o === group) return;
    if (o.isMesh && !o.isInstancedMesh && !Array.isArray(o.material) && !keep.has(o) && o.geometry.index) {
      const k = o.material.uuid + (o.geometry.attributes.uv ? '' : ':nouv');
      if (!buckets.has(k)) buckets.set(k, { material: o.material, list: [], shadow: false });
      const b = buckets.get(k);
      const g = o.geometry.clone().applyMatrix4(o.matrixWorld);
      for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
      b.list.push(g); b.shadow = b.shadow || o.castShadow;
    } else if ((o.isMesh || o.isLine || o.isLight || o.isInstancedMesh) && o.parent) loose.push(o);
  });
  for (const o of loose) { o.updateMatrixWorld(true); const m = o.matrixWorld.clone(); parent.add(o); o.matrix.copy(m); m.decompose(o.position, o.quaternion, o.scale); }
  let n = 0;
  for (const b of buckets.values()) {
    const geo = b.list.length === 1 ? b.list[0] : mergeGeometries(b.list, false);
    if (!geo) continue;
    const m = new THREE.Mesh(geo, b.material);
    m.castShadow = b.shadow; m.receiveShadow = true;
    parent.add(m); n++;
  }
  return n;
}
