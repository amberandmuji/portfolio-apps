// Painterly look (in the spirit of open-world adventure games with a
// hand-painted feel): renders the scene once with depth, then draws soft ink
// outlines where depth jumps, warms highlights, cools shadows, lifts
// saturation, and adds a gentle aerial-perspective tint and vignette.
import * as THREE from 'three';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

export class PainterlyPass extends Pass {
  constructor(scene, camera) {
    super();
    this.scene = scene;
    this.camera = camera;
    this.rt = new THREE.WebGLRenderTarget(16, 16, { type: THREE.HalfFloatType, samples: 4 });
    this.rt.depthTexture = new THREE.DepthTexture(16, 16);
    this.rt.depthTexture.type = THREE.UnsignedIntType;
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        tColor: { value: null }, tDepth: { value: null },
        uNear: { value: camera.near }, uFar: { value: camera.far },
        uTexel: { value: new THREE.Vector2(1 / 16, 1 / 16) },
        uInk: { value: new THREE.Color('#1c1a2a') }, uInkStrength: { value: 0.55 },
        uHaze: { value: new THREE.Color('#9fb6d6') }, uHazeStrength: { value: 0.12 },
        uWarm: { value: new THREE.Color(1.04, 1.0, 0.94) }, uCool: { value: new THREE.Color(0.94, 0.98, 1.06) },
        uSat: { value: 1.18 },
      },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `
        #include <packing>
        uniform sampler2D tColor, tDepth; uniform float uNear, uFar, uInkStrength, uHazeStrength, uSat;
        uniform vec2 uTexel; uniform vec3 uInk, uHaze, uWarm, uCool; varying vec2 vUv;
        float viewZ(vec2 uv){ float d = texture2D(tDepth, uv).x; return -perspectiveDepthToViewZ(d, uNear, uFar); }
        void main(){
          vec4 col = texture2D(tColor, vUv);
          float d = texture2D(tDepth, vUv).x;
          vec3 c = col.rgb;
          if (d < 0.99999) {
            float z = viewZ(vUv);
            // soft ink lines where depth jumps (fades out with distance)
            float s = 1.0 + 0.6 * smoothstep(0.0, 25.0, z);
            float zl = viewZ(vUv - vec2(uTexel.x, 0.0) * s), zr = viewZ(vUv + vec2(uTexel.x, 0.0) * s);
            float zu = viewZ(vUv + vec2(0.0, uTexel.y) * s), zd = viewZ(vUv - vec2(0.0, uTexel.y) * s);
            float lap = abs(zl + zr + zu + zd - 4.0 * z) / max(z, 0.5);
            float edge = smoothstep(0.08, 0.35, lap) * (1.0 - smoothstep(60.0, 160.0, z));
            c = mix(c, c * uInk * 2.2, edge * uInkStrength);
            // aerial perspective: distant things drift toward the sky's blue
            float far = smoothstep(40.0, 420.0, z);
            c = mix(c, uHaze * max(dot(c, vec3(0.333)), 0.35) * 1.4, far * uHazeStrength);
          }
          // grade: warm highlights, cool shadows, a little more saturation
          float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
          c *= mix(uCool, uWarm, smoothstep(0.05, 0.6, l));
          c = mix(vec3(l), c, uSat);
          // vignette
          vec2 q = vUv - 0.5;
          c *= 1.0 - dot(q, q) * 0.45;
          gl_FragColor = vec4(c, 1.0);
        }`,
    });
    this.fsQuad = new FullScreenQuad(this.material);
  }

  setLook({ haze, hazeStrength, ink, inkStrength, sat } = {}) {
    const u = this.material.uniforms;
    if (haze) u.uHaze.value.set(haze);
    if (hazeStrength != null) u.uHazeStrength.value = hazeStrength;
    if (ink) u.uInk.value.set(ink);
    if (inkStrength != null) u.uInkStrength.value = inkStrength;
    if (sat != null) u.uSat.value = sat;
  }

  setSize(w, h) {
    this.rt.setSize(w, h);
    this.material.uniforms.uTexel.value.set(1 / w, 1 / h);
  }

  render(renderer, writeBuffer) {
    renderer.setRenderTarget(this.rt);
    renderer.clear();
    renderer.render(this.scene, this.camera);
    const u = this.material.uniforms;
    u.tColor.value = this.rt.texture;
    u.tDepth.value = this.rt.depthTexture;
    u.uNear.value = this.camera.near; u.uFar.value = this.camera.far;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    this.fsQuad.render(renderer);
  }

  dispose() { this.rt.dispose(); this.material.dispose(); this.fsQuad.dispose(); }
}
