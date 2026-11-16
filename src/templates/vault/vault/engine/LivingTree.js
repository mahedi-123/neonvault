import * as THREE from 'three';

/**
 * THE ARTIFACT TREE — replaces the old vertebra spine at the heart of the
 * product helix.
 *
 *  • Trunk     — a swaying bark column with iridescent ridges and glowing sap
 *                veins; sap pulses travel up the trunk.
 *  • Branches  — one per product. Each reaches out over its card and holds it
 *                on two glowing vines. Branches GROW toward a product as you
 *                scroll toward it, and sap races out along the branch whose
 *                card is centred (or hovered).
 *  • Leaves    — instanced, translucent, veined; tinted by the product's
 *                category; they flutter harder the faster you scroll.
 *  • Crown     — a dense canopy at the top that the camera dives through.
 *  • Falling leaves, fireflies, glowing root flare and a ground halo.
 *
 * All motion is in shaders; the CPU only updates a handful of uniforms and
 * the per-branch node pulses each frame.
 */

const TEAL = new THREE.Color('#5eead4');
const VIOLET = new THREE.Color('#a78bfa');
const MOSS = new THREE.Color('#c4d94a');
const rand = (a, b) => a + Math.random() * (b - a);

/* ------------------------------------------------------------------ GLSL */

const barkVert = /* glsl */ `
  attribute float aT;
  attribute float aAround;
  attribute float aBranch;
  attribute float aKind;
  varying vec3 vN;
  varying vec3 vV;
  varying float vT;
  varying float vAround;
  varying float vBranch;
  varying float vKind;
  varying float vY;
  uniform float uTime;
  uniform float uWind;
  void main() {
    vec3 p = position;
    // branches and vines sway a little, more at their tips
    if (aKind > 0.5 && aKind < 3.5) {
      float s = sin(uTime * 1.1 + aBranch * 1.7) * 0.06 + uWind * 0.05;
      p.y += s * aT * aT * 1.5;
    }
    vec4 world = modelMatrix * vec4(p, 1.0);
    vN = normalize(mat3(modelMatrix) * normal);
    vV = normalize(cameraPosition - world.xyz);
    vT = aT; vAround = aAround; vBranch = aBranch; vKind = aKind; vY = position.y;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const barkFrag = /* glsl */ `
  uniform float uTime;
  uniform float uF;
  uniform float uIntro;
  uniform float uHover;
  uniform float uLit;
  varying vec3 vN;
  varying vec3 vV;
  varying float vT;
  varying float vAround;
  varying float vBranch;
  varying float vKind;
  varying float vY;

  void main() {
    // kinds: 0 trunk, 1 branch, 2 twig, 3 vine, 4 root
    float isGrowing = step(0.5, vKind) * step(vKind, 3.5);
    float g = clamp((uF + 2.6 - vBranch) / 1.6, 0.0, 1.0) * uIntro;
    if (isGrowing > 0.5 && vT > g) discard;

    vec3 N = normalize(vN);
    vec3 V = normalize(vV);
    float coord = vKind < 0.5 || vKind > 3.5 ? vY * 0.8 : vT * 9.0;
    float bark = sin(vAround * 6.2831 * 7.0 + sin(coord * 1.1) * 1.6 + sin(coord * 3.7) * 0.35);
    float ridge = smoothstep(-0.2, 1.0, bark);
    vec3 base = mix(vec3(0.006, 0.012, 0.016), vec3(0.03, 0.026, 0.05), ridge * 0.8);
    float ndl = max(dot(N, normalize(vec3(0.3, 0.7, 0.65))), 0.0) * 0.8 + 0.25;
    float fres = pow(1.0 - max(dot(N, V), 0.0), 2.4);
    vec3 irid = mix(vec3(0.11, 0.82, 0.65), vec3(0.39, 0.26, 0.95), 0.5 + 0.5 * sin(fres * 7.0 + coord * 0.4));
    vec3 col = base * ndl + irid * fres * 0.1;

    vec3 sap = mix(vec3(0.11, 0.82, 0.65), vec3(0.55, 0.69, 0.07), clamp(vT, 0.0, 1.0) * 0.7);
    float vein = smoothstep(0.86, 1.0, 1.0 - abs(bark));
    float pulse = vKind < 0.5 || vKind > 3.5
      ? pow(0.5 + 0.5 * sin(vY * 0.7 - uTime * 2.2), 10.0)
      : pow(0.5 + 0.5 * sin(vT * 12.0 - uTime * 4.0), 8.0);
    float actv = (1.0 - clamp(abs(vBranch - uF), 0.0, 1.0)) * isGrowing;
    float hov = (1.0 - step(0.5, abs(vBranch - uHover))) * isGrowing;
    col += sap * vein * (0.08 + pulse * 1.6) * uLit;
    col += sap * (actv * 0.45 + hov * 0.6) * (0.25 + pulse * 1.4);

    // vines are pure light
    if (vKind > 2.5 && vKind < 3.5) col = sap * (0.9 + pulse * 1.5 + actv);
    // the growing tip burns brightest
    col += isGrowing * sap * smoothstep(g - 0.05, g, vT) * step(g, 0.999) * 2.5;

    gl_FragColor = vec4(col, 1.0);
  }
`;

const leafVert = /* glsl */ `
  attribute float aBranch;
  attribute float aSeed;
  attribute vec3 aColor;
  uniform float uTime;
  uniform float uWind;
  uniform float uF;
  uniform float uIntro;
  uniform float uCrown;
  uniform float uHover;
  uniform vec2 uPointer;
  varying vec2 vUv;
  varying vec3 vColor;
  varying float vActive;
  varying float vFres;
  void main() {
    vUv = uv;
    vec3 p = position;
    float y = uv.y;
    p.z += y * y * 0.35;                                  // curl
    float hov = aBranch < 0.0 ? 0.0 : 1.0 - step(0.5, abs(aBranch - uHover));
    float flutter = 0.1 + min(abs(uWind), 3.0) * 0.18 + hov * 0.55;
    p.x += uPointer.x * 0.22 * y;                         // the pointer is the wind
    p.z += uPointer.y * 0.12 * y;
    p.x += sin(uTime * 1.7 + aSeed * 31.0) * flutter * y;
    p.z += cos(uTime * 1.3 + aSeed * 17.0) * flutter * 0.7 * y;
    float g = aBranch < 0.0 ? uCrown : clamp((uF + 2.2 - aBranch) / 1.4, 0.0, 1.0) * uIntro;
    g = smoothstep(0.0, 1.0, clamp(g * 1.3 - fract(aSeed * 7.0) * 0.3, 0.0, 1.0));
    p *= g;
    vec4 world = modelMatrix * instanceMatrix * vec4(p, 1.0);
    vec3 n = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * vec3(0.0, 0.0, 1.0));
    vFres = 1.0 - abs(dot(n, normalize(cameraPosition - world.xyz)));
    vColor = aColor;
    float a = aBranch < 0.0 ? 0.0 : 1.0 - clamp(abs(aBranch - uF), 0.0, 1.0);
    float h = aBranch < 0.0 ? 0.0 : 1.0 - step(0.5, abs(aBranch - uHover));
    vActive = max(a, h);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const leafFrag = /* glsl */ `
  uniform float uTime;
  uniform float uLit;
  varying vec2 vUv;
  varying vec3 vColor;
  varying float vActive;
  varying float vFres;
  void main() {
    float x = (vUv.x - 0.5) * 2.0;
    float w = pow(max(sin(vUv.y * 3.14159), 0.0), 0.7) * 0.95;
    if (abs(x) > w) discard;
    float edge = smoothstep(w - 0.14, w, abs(x));
    float rib = smoothstep(0.07, 0.0, abs(x)) * smoothstep(1.0, 0.7, vUv.y);
    float side = smoothstep(0.9, 1.0, sin(vUv.y * 20.0 - abs(x) * 9.0)) * (1.0 - edge);
    vec3 c = vColor;
    vec3 col = c * 0.1 + c * (rib * 0.8 + side * 0.3 + edge * 0.7) * (0.45 + uLit * 0.55);
    col *= 0.65 + 0.35 * vUv.y;
    col += c * vFres * 0.25;
    col += c * vActive * (0.35 + 0.25 * sin(uTime * 4.0 + vUv.y * 6.0));
    gl_FragColor = vec4(col, 1.0);
  }
`;

const fallVert = /* glsl */ `
  attribute float aSeed;
  attribute vec3 aColor;
  uniform float uTime;
  uniform float uTop;
  uniform float uBottom;
  uniform float uWind;
  varying vec2 vUv;
  varying vec3 vColor;
  varying float vFade;
  mat3 rotAxis(vec3 a, float r) {
    float s = sin(r), c = cos(r), oc = 1.0 - c;
    return mat3(oc*a.x*a.x + c, oc*a.x*a.y + a.z*s, oc*a.z*a.x - a.y*s,
                oc*a.x*a.y - a.z*s, oc*a.y*a.y + c, oc*a.y*a.z + a.x*s,
                oc*a.z*a.x + a.y*s, oc*a.y*a.z - a.x*s, oc*a.z*a.z + c);
  }
  void main() {
    vUv = uv;
    vColor = aColor;
    float H = uTop - uBottom;
    float y = uTop - mod(uTime * (0.45 + aSeed * 0.5) + aSeed * H * 7.0, H);
    float r = 1.6 + fract(aSeed * 13.7) * 7.0;
    float ang = aSeed * 50.0 + uTime * 0.12 + y * 0.12;
    vec3 center = vec3(cos(ang) * r + sin(uTime * 0.8 + aSeed * 9.0) * 0.6, y, sin(ang) * r);
    vec3 axis = normalize(vec3(sin(aSeed * 12.0), cos(aSeed * 7.0), 0.5));
    mat3 R = rotAxis(axis, uTime * (1.0 + aSeed * 2.0) + aSeed * 10.0 + uWind);
    vec3 p = R * (position * 0.24);
    vFade = smoothstep(0.0, 4.0, y - uBottom) * smoothstep(0.0, 3.0, uTop - y);
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(center + p, 1.0);
  }
`;

const fallFrag = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vColor;
  varying float vFade;
  void main() {
    float x = (vUv.x - 0.5) * 2.0;
    float w = pow(max(sin(vUv.y * 3.14159), 0.0), 0.7) * 0.95;
    if (abs(x) > w || vFade < 0.02) discard;
    float edge = smoothstep(w - 0.18, w, abs(x));
    gl_FragColor = vec4(vColor * (0.25 + edge * 0.9) * vFade, 1.0);
  }
`;

const burstVert = /* glsl */ `
  attribute vec3 aSeed3;
  attribute vec3 aColor;
  uniform float uTime;
  uniform float uT0;
  uniform vec3 uOrigin;
  varying vec2 vUv;
  varying vec3 vColor;
  varying float vFade;
  mat3 rotAxis(vec3 a, float r) {
    float s = sin(r), c = cos(r), oc = 1.0 - c;
    return mat3(oc*a.x*a.x + c, oc*a.x*a.y + a.z*s, oc*a.z*a.x - a.y*s,
                oc*a.x*a.y - a.z*s, oc*a.y*a.y + c, oc*a.y*a.z + a.x*s,
                oc*a.z*a.x + a.y*s, oc*a.y*a.z - a.x*s, oc*a.z*a.z + c);
  }
  void main() {
    vUv = uv;
    vColor = aColor;
    float age = uTime - uT0;
    float alive = step(0.0, age) * (1.0 - step(3.2, age));
    vec3 dir = normalize(vec3(aSeed3.x - 0.5, aSeed3.y * 0.7, aSeed3.z - 0.5) + 1e-4);
    vec3 disp = dir * age * 1.5
      + vec3(sin(age * 3.0 + aSeed3.x * 6.0) * 0.4, -age * age * 0.85, cos(age * 2.5 + aSeed3.z * 6.0) * 0.4);
    vFade = (1.0 - smoothstep(2.2, 3.2, age)) * alive;
    mat3 R = rotAxis(normalize(aSeed3 - 0.5 + 1e-3), age * (2.0 + aSeed3.y * 3.0));
    vec3 p = R * (position * 0.26 * alive);
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(uOrigin + disp + p, 1.0);
  }
`;

const flyVert = /* glsl */ `
  attribute vec4 aOrbit; // radius, y, phase, speed
  uniform float uTime;
  uniform float uPixelRatio;
  varying float vBlink;
  void main() {
    float a = aOrbit.z + uTime * aOrbit.w;
    vec3 p = vec3(cos(a) * aOrbit.x, aOrbit.y + sin(uTime * 0.7 + aOrbit.z * 3.0) * 0.8, sin(a) * aOrbit.x);
    p += vec3(sin(uTime * 1.3 + aOrbit.z * 5.0), 0.0, cos(uTime * 1.1 + aOrbit.z * 4.0)) * 0.35;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vBlink = 0.35 + 0.65 * pow(0.5 + 0.5 * sin(uTime * (1.5 + aOrbit.w * 6.0) + aOrbit.z * 20.0), 3.0);
    gl_PointSize = (2.0 + vBlink * 3.0) * uPixelRatio * (24.0 / max(-mv.z, 0.5));
    gl_Position = projectionMatrix * mv;
  }
`;

const flyFrag = /* glsl */ `
  varying float vBlink;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float a = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(vec3(0.85, 1.0, 0.55) * a * vBlink * 1.6, a);
  }
`;

const groundFrag = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    float d = length(vUv - 0.5) * 2.0;
    float ring = smoothstep(0.04, 0.0, abs(d - fract(uTime * 0.18) )) * (1.0 - d);
    float glow = pow(max(1.0 - d, 0.0), 3.0);
    vec3 c = vec3(0.11, 0.82, 0.65) * (glow * 0.4 + ring * 0.8) + vec3(0.39, 0.26, 0.95) * glow * 0.15;
    gl_FragColor = vec4(c, 1.0);
  }
`;

/* -------------------------------------------------------------- geometry */

/** Appends a tapered tube along `curve` to the geometry buffers in `acc`. */
function addTube(acc, curve, { segs, radial, radius, branch, kind, t0 = 0, t1 = 1 }) {
  const frames = curve.computeFrenetFrames(segs, false);
  const base = acc.pos.length / 3;
  const P = new THREE.Vector3();
  const n = new THREE.Vector3();
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    curve.getPointAt(t, P);
    const N = frames.normals[i];
    const B = frames.binormals[i];
    const r = radius(t);
    for (let j = 0; j <= radial; j++) {
      const v = (j / radial) * Math.PI * 2;
      n.copy(N).multiplyScalar(Math.cos(v)).addScaledVector(B, Math.sin(v));
      acc.pos.push(P.x + n.x * r, P.y + n.y * r, P.z + n.z * r);
      acc.nor.push(n.x, n.y, n.z);
      acc.t.push(t0 + (t1 - t0) * t);
      acc.around.push(j / radial);
      acc.branch.push(branch);
      acc.kind.push(kind);
    }
  }
  for (let i = 0; i < segs; i++) {
    for (let j = 0; j < radial; j++) {
      const a = base + i * (radial + 1) + j;
      const b = a + radial + 1;
      acc.idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
}

function leafGeometry() {
  const g = new THREE.PlaneGeometry(1, 1.7, 1, 5);
  g.translate(0, 0.85, 0);
  return g;
}

/* ------------------------------------------------------------------ class */

export default class LivingTree {
  constructor({ lite = false, pixelRatio = 1 } = {}) {
    this.lite = lite;
    this.group = new THREE.Group();
    this.uniforms = {
      uTime: { value: 0 },
      uF: { value: 0 },
      uIntro: { value: 0 },
      uCrown: { value: 0 },
      uHover: { value: -10 },
      uLit: { value: 0 },
      uWind: { value: 0 },
      uPointer: { value: new THREE.Vector2() },
    };
    this.burstUniforms = {
      uTime: this.uniforms.uTime,
      uT0: { value: -100 },
      uOrigin: { value: new THREE.Vector3() },
    };
    this.lastBurst = -10;
    this.lastHovered = -1;
    this.tips = [];
    this.barkMat = new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader: barkVert, fragmentShader: barkFrag });
    this.leafMat = new THREE.ShaderMaterial({
      uniforms: this.uniforms, vertexShader: leafVert, fragmentShader: leafFrag, side: THREE.DoubleSide,
    });
    this.fallUniforms = { uTime: this.uniforms.uTime, uWind: this.uniforms.uWind, uTop: { value: 10 }, uBottom: { value: -60 } };
    this.fallMat = new THREE.ShaderMaterial({
      uniforms: this.fallUniforms, vertexShader: fallVert, fragmentShader: fallFrag, side: THREE.DoubleSide,
    });
    this.flyMat = new THREE.ShaderMaterial({
      uniforms: { uTime: this.uniforms.uTime, uPixelRatio: { value: pixelRatio } },
      vertexShader: flyVert, fragmentShader: flyFrag,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.burstMat = new THREE.ShaderMaterial({
      uniforms: this.burstUniforms, vertexShader: burstVert, fragmentShader: fallFrag, side: THREE.DoubleSide,
    });
    this.groundMat = new THREE.ShaderMaterial({
      uniforms: { uTime: this.uniforms.uTime },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: groundFrag, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.leafGeo = leafGeometry();
    this.parts = [];
  }

  #clear() {
    this.parts.forEach((o) => {
      this.group.remove(o);
      if (o.geometry !== this.leafGeo) o.geometry.dispose();
    });
    this.parts = [];
  }

  /**
   * (Re)grow the tree for a product list.
   * layout: { step, angle, radius, cardW, cardH }, tints: product -> THREE.Color
   */
  build(products, layout, tintOf) {
    this.#clear();
    const { step, angle, radius: R, cardH } = layout;
    const count = Math.max(products.length, 1);
    const top = 10;
    const bottom = -(count - 1) * step - 7;
    this.bottom = bottom;
    this.fallUniforms.uTop.value = top + 2;
    this.fallUniforms.uBottom.value = bottom;

    const acc = { pos: [], nor: [], t: [], around: [], branch: [], kind: [], idx: [] };
    const sway = (y) => new THREE.Vector3(Math.sin(y * 0.15) * 0.35, y, Math.cos(y * 0.11) * 0.3);

    /* trunk */
    const trunkPts = [];
    for (let y = top; y >= bottom - 0.01; y -= 2) trunkPts.push(sway(y));
    const trunk = new THREE.CatmullRomCurve3(trunkPts);
    const trunkSegs = Math.min(420, Math.round((top - bottom) * 3));
    addTube(acc, trunk, {
      segs: trunkSegs, radial: this.lite ? 14 : 22, branch: -1, kind: 0,
      radius: (t) => {
        let r = 0.42 + 0.38 * t + Math.sin(t * 60) * 0.03;
        if (t > 0.93) r *= 1 + (t - 0.93) * 14; // root flare
        if (t < 0.03) r *= t / 0.03 * 0.7 + 0.3; // tapering tip in the crown
        return r;
      },
    });

    /* crown branches at the top */
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2 + 0.3;
      const dir = new THREE.Vector3(Math.sin(a), 0, Math.cos(a));
      const y0 = top - 1.5 - k * 0.6;
      const c = new THREE.CatmullRomCurve3([
        sway(y0).addScaledVector(dir, 0.2),
        sway(y0 + 1).addScaledVector(dir, 1.6),
        sway(y0 + 1.6).addScaledVector(dir, 3.2),
        sway(y0 + 1.2).addScaledVector(dir, 4.4),
      ]);
      addTube(acc, c, { segs: 24, radial: 8, branch: -3, kind: 4, radius: (t) => 0.2 * (1 - t) + 0.03 });
    }

    /* roots */
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + rand(-0.2, 0.2);
      const dir = new THREE.Vector3(Math.sin(a), 0, Math.cos(a));
      const len = rand(3.5, 7);
      const c = new THREE.CatmullRomCurve3([
        sway(bottom + 1.2).addScaledVector(dir, 0.3),
        sway(bottom + 0.2).addScaledVector(dir, len * 0.35),
        sway(bottom - 0.6).addScaledVector(dir, len * 0.7),
        sway(bottom - 1.4).addScaledVector(dir, len),
      ]);
      addTube(acc, c, { segs: 28, radial: 8, branch: -2, kind: 4, radius: (t) => 0.32 * (1 - t) + 0.025 });
    }

    /* one branch per product, holding its card on two vines */
    const leafSpots = [];
    const nodes = [];
    products.forEach((p, i) => {
      const a = i * angle;
      const dir = new THREE.Vector3(Math.sin(a), 0, Math.cos(a));
      const side = new THREE.Vector3(Math.cos(a), 0, -Math.sin(a));
      const cy = -i * step;
      const ys = cy + cardH * 0.5 + 1.1;
      const tip = dir.clone().multiplyScalar(R - 0.35).setY(cy + cardH * 0.5 + 0.55);
      const start = sway(ys).addScaledVector(dir, 0.25);
      const branch = new THREE.CatmullRomCurve3([
        start,
        sway(ys + 0.5).addScaledVector(dir, 1.4).addScaledVector(side, 0.35),
        sway(ys + 0.35).addScaledVector(dir, 2.8).addScaledVector(side, -0.3),
        tip,
      ]);
      addTube(acc, branch, { segs: 36, radial: this.lite ? 7 : 10, branch: i, kind: 1, t1: 0.85, radius: (t) => 0.22 * (1 - t) + 0.05 });
      nodes.push({ pos: start.clone(), i });

      // twigs off the branch
      [0.42, 0.7].forEach((tt, k) => {
        const s0 = branch.getPointAt(tt);
        const sgn = k ? 1 : -1;
        const twig = new THREE.CatmullRomCurve3([
          s0,
          s0.clone().addScaledVector(side, sgn * 0.6).add(new THREE.Vector3(0, 0.5, 0)),
          s0.clone().addScaledVector(side, sgn * 1.0).addScaledVector(dir, 0.3).add(new THREE.Vector3(0, 1.1, 0)),
        ]);
        addTube(acc, twig, { segs: 14, radial: 6, branch: i, kind: 2, t0: tt * 0.85, t1: tt * 0.85 + 0.25, radius: (t) => 0.06 * (1 - t) + 0.012 });
        leafSpots.push({ curve: twig, from: 0.3, n: this.lite ? 4 : 9, branch: i, product: p, spread: 0.35 });
      });

      // the two vines that hang the card
      [-1, 1].forEach((sgn) => {
        const corner = dir.clone().multiplyScalar(R - 0.08).addScaledVector(side, sgn * layout.cardW * 0.38).setY(cy + cardH * 0.5 - 0.05);
        const mid = tip.clone().lerp(corner, 0.5).add(new THREE.Vector3(0, -0.12, 0));
        const vine = new THREE.CatmullRomCurve3([tip.clone(), mid, corner]);
        addTube(acc, vine, { segs: 12, radial: 4, branch: i, kind: 3, t0: 0.85, t1: 1, radius: () => 0.016 });
      });

      this.tips[i] = tip.clone();
      leafSpots.push({ curve: branch, from: 0.35, n: this.lite ? 10 : 24, branch: i, product: p, spread: 0.45 });
      leafSpots.push({ point: tip, n: this.lite ? 6 : 16, branch: i, product: p, spread: 0.7 });
    });

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(acc.pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(acc.nor, 3));
    geo.setAttribute('aT', new THREE.Float32BufferAttribute(acc.t, 1));
    geo.setAttribute('aAround', new THREE.Float32BufferAttribute(acc.around, 1));
    geo.setAttribute('aBranch', new THREE.Float32BufferAttribute(acc.branch, 1));
    geo.setAttribute('aKind', new THREE.Float32BufferAttribute(acc.kind, 1));
    geo.setIndex(acc.idx);
    geo.computeBoundingSphere();
    const wood = new THREE.Mesh(geo, this.barkMat);
    wood.frustumCulled = false;
    this.#add(wood);

    /* leaves */
    const crownN = this.lite ? 180 : 460;
    const total = crownN + leafSpots.reduce((s, l) => s + l.n, 0);
    const leaves = new THREE.InstancedMesh(this.leafGeo, this.leafMat, total);
    const aBranch = new Float32Array(total);
    const aSeed = new Float32Array(total);
    const aColor = new Float32Array(total * 3);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const v = new THREE.Vector3();
    const s = new THREE.Vector3();
    const palette = [TEAL, VIOLET, MOSS];
    let idx = 0;
    const put = (pos, branch, color, scale) => {
      e.set(rand(-Math.PI, Math.PI), rand(-Math.PI, Math.PI), rand(-Math.PI, Math.PI));
      q.setFromEuler(e);
      s.setScalar(scale);
      m.compose(pos, q, s);
      leaves.setMatrixAt(idx, m);
      aBranch[idx] = branch;
      aSeed[idx] = Math.random();
      aColor.set([color.r, color.g, color.b], idx * 3);
      idx++;
    };
    for (let k = 0; k < crownN; k++) {
      const u = Math.random() * Math.PI * 2;
      const r = 1 + Math.pow(Math.random(), 0.6) * 4.6;
      const y = top - 1 + rand(-2.5, 3.5) * (1 - r / 7);
      v.set(Math.cos(u) * r, y, Math.sin(u) * r);
      const c = palette[(Math.random() * 3) | 0].clone().lerp(TEAL, 0.25);
      put(v.clone(), -1, c, rand(0.22, 0.42));
    }
    leafSpots.forEach((spot) => {
      const tint = tintOf(spot.product);
      for (let k = 0; k < spot.n; k++) {
        const base = spot.point
          ? spot.point.clone()
          : spot.curve.getPointAt(spot.from + Math.random() * (1 - spot.from));
        base.add(new THREE.Vector3(rand(-1, 1), rand(-0.6, 1), rand(-1, 1)).multiplyScalar(spot.spread));
        const c = tint.clone().lerp(palette[(Math.random() * 3) | 0], Math.random() * 0.45);
        put(base, spot.branch, c, rand(0.18, 0.34));
      }
    });
    leaves.count = idx;
    leaves.instanceMatrix.needsUpdate = true;
    leaves.geometry = this.leafGeo.clone();
    leaves.geometry.setAttribute('aBranch', new THREE.InstancedBufferAttribute(aBranch, 1));
    leaves.geometry.setAttribute('aSeed', new THREE.InstancedBufferAttribute(aSeed, 1));
    leaves.geometry.setAttribute('aColor', new THREE.InstancedBufferAttribute(aColor, 3));
    leaves.frustumCulled = false;
    this.#add(leaves);

    /* falling leaves */
    const fallN = this.lite ? 50 : 140;
    const fall = new THREE.InstancedMesh(this.leafGeo.clone(), this.fallMat, fallN);
    const fSeed = new Float32Array(fallN);
    const fColor = new Float32Array(fallN * 3);
    for (let k = 0; k < fallN; k++) {
      fSeed[k] = Math.random();
      const c = palette[(Math.random() * 3) | 0];
      fColor.set([c.r, c.g, c.b], k * 3);
    }
    fall.geometry.setAttribute('aSeed', new THREE.InstancedBufferAttribute(fSeed, 1));
    fall.geometry.setAttribute('aColor', new THREE.InstancedBufferAttribute(fColor, 3));
    fall.frustumCulled = false;
    this.#add(fall);

    /* fireflies */
    const flyN = this.lite ? 90 : 240;
    const orbit = new Float32Array(flyN * 4);
    for (let k = 0; k < flyN; k++) {
      orbit.set([rand(1.2, 8.5), rand(bottom, top + 3), Math.random() * Math.PI * 2, rand(0.05, 0.3) * (Math.random() < 0.5 ? -1 : 1)], k * 4);
    }
    const flyGeo = new THREE.BufferGeometry();
    flyGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(flyN * 3), 3));
    flyGeo.setAttribute('aOrbit', new THREE.Float32BufferAttribute(orbit, 4));
    const flies = new THREE.Points(flyGeo, this.flyMat);
    flies.frustumCulled = false;
    this.#add(flies);

    /* sap nodes where each branch leaves the trunk */
    const nodeGeo = new THREE.IcosahedronGeometry(0.16, 1);
    const nodeMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    this.nodeMat?.dispose();
    this.nodeMat = nodeMat;
    const nodeMesh = new THREE.InstancedMesh(nodeGeo, nodeMat, Math.max(nodes.length, 1));
    nodes.forEach(({ pos, i }) => {
      m.compose(pos, q.identity(), s.setScalar(1));
      nodeMesh.setMatrixAt(i, m);
      nodeMesh.setColorAt(i, tintOf(products[i]));
    });
    nodeMesh.count = nodes.length;
    nodeMesh.frustumCulled = false;
    this.nodes = nodes;
    this.nodeMesh = nodeMesh;
    this.#add(nodeMesh);

    /* leaves shaken loose when a branch is hovered */
    const burstN = this.lite ? 14 : 30;
    const burst = new THREE.InstancedMesh(this.leafGeo.clone(), this.burstMat, burstN);
    const bSeed = new Float32Array(burstN * 3);
    const bColor = new Float32Array(burstN * 3);
    for (let k = 0; k < burstN; k++) {
      bSeed.set([Math.random(), Math.random(), Math.random()], k * 3);
      const c = palette[(Math.random() * 3) | 0];
      bColor.set([c.r, c.g, c.b], k * 3);
    }
    burst.geometry.setAttribute('aSeed3', new THREE.InstancedBufferAttribute(bSeed, 3));
    burst.geometry.setAttribute('aColor', new THREE.InstancedBufferAttribute(bColor, 3));
    burst.frustumCulled = false;
    this.#add(burst);

    /* ground halo under the roots */
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(26, 26), this.groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = bottom - 1.2;
    this.#add(ground);
  }

  #add(o) {
    this.parts.push(o);
    this.group.add(o);
  }

  /** f: centred card index (fractional); intro: 0..1 arrival; crown: 0..1 */
  update({ t, f, vel, intro, crown, hovered, pointer }) {
    const u = this.uniforms;
    if (pointer) u.uPointer.value.lerp(pointer, 0.08);
    // a freshly hovered branch shakes a handful of leaves loose
    if (hovered >= 0 && hovered !== this.lastHovered && t - this.lastBurst > 0.5 && this.tips[hovered]) {
      this.burstUniforms.uOrigin.value.copy(this.tips[hovered]);
      this.burstUniforms.uT0.value = t;
      this.lastBurst = t;
    }
    this.lastHovered = hovered;
    u.uTime.value = t;
    u.uF.value = f;
    u.uIntro.value = intro;
    u.uCrown.value = crown;
    u.uHover.value = hovered >= 0 ? hovered : -10;
    u.uLit.value = Math.min(1, intro * 1.2);
    u.uWind.value += (Math.max(-3, Math.min(3, vel)) - u.uWind.value) * 0.1;

    if (this.nodeMesh) {
      const m = this._m || (this._m = new THREE.Matrix4());
      const q = this._q || (this._q = new THREE.Quaternion());
      const s = this._s || (this._s = new THREE.Vector3());
      this.nodes.forEach(({ pos, i }) => {
        const active = Math.max(0, 1 - Math.abs(i - f)) + (hovered === i ? 0.6 : 0);
        const grow = Math.min(1, Math.max(0, (f + 2.6 - i) / 1.6)) * intro;
        const pulse = 0.7 + Math.sin(t * 3 + i) * 0.15 + active * (0.6 + Math.sin(t * 8) * 0.25);
        m.compose(pos, q, s.setScalar(Math.max(grow * pulse, 0.0001)));
        this.nodeMesh.setMatrixAt(i, m);
      });
      this.nodeMesh.instanceMatrix.needsUpdate = true;
    }
  }

  dispose() {
    this.#clear();
    [this.barkMat, this.leafMat, this.fallMat, this.flyMat, this.groundMat, this.nodeMat, this.burstMat].forEach((mm) => mm?.dispose());
    this.leafGeo.dispose();
  }
}
